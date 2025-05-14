// Глобальные переменные
let currentUser = null;
let currentProductId = null;
const productModal = new bootstrap.Modal('#productModal');
const editModal = new bootstrap.Modal('#editProductModal');

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await initPage();
});

// Проверка авторизации
async function checkAuth() {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();
    
    if (!data.authenticated) {
      window.location.href = '/login';
      return;
    }
    
    currentUser = data.user;
    toggleAdminFeatures(data.user.role === 'admin');
  } catch (error) {
    console.error('Ошибка проверки авторизации:', error);
    window.location.href = '/login';
  }
}

// Показываем/скрываем функции админа
function toggleAdminFeatures(isAdmin) {
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
}

// Инициализация страницы
async function initPage() {
  await loadProducts();
  await loadCategories();
  setupEventListeners();
}

// Загрузка списка товаров
async function loadProducts() {
  try {
    showLoader();
    const response = await fetch('/api/products');
    const products = await response.json();
    renderProducts(products);
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
    showAlert('Не удалось загрузить товары', 'danger');
  } finally {
    hideLoader();
  }
}

// Отображение товаров в таблице
function renderProducts(products) {
  const tbody = document.getElementById('productsTable');
  tbody.innerHTML = '';

  products.forEach(product => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${product.id}</td>
      <td>${product.name}</td>
      <td>${product.category_name || 'Без категории'}</td>
      <td>${product.location}</td>
      <td class="${product.current_quantity < product.min_quantity ? 'text-danger' : ''}">
        ${product.current_quantity}
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary edit-btn admin-only" data-id="${product.id}">
          <i class="bi bi-pencil"></i>
        </button>
      </td>
    `;

    // Клик по строке - просмотр товара
    tr.addEventListener('click', () => showProductDetails(product));

    // Клик по кнопке редактирования
    tr.querySelector('.edit-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      editProduct(product);
    });

    tbody.appendChild(tr);
  });
}

// Просмотр деталей товара
function showProductDetails(product) {
  document.getElementById('productDetails').innerHTML = `
    <div class="row">
      <div class="col-md-6">
        <p><strong>ID:</strong> ${product.id}</p>
        <p><strong>Наименование:</strong> ${product.name}</p>
        <p><strong>Категория:</strong> ${product.category_name || 'Без категории'}</p>
      </div>
      <div class="col-md-6">
        <p><strong>Место хранения:</strong> ${product.location}</p>
        <p><strong>Текущий остаток:</strong> ${product.current_quantity}</p>
        <p><strong>Мин. остаток:</strong> ${product.min_quantity}</p>
      </div>
    </div>
    <div class="row mt-3">
      <div class="col-12">
        <p><strong>Описание:</strong></p>
        <p>${product.description || 'Нет описания'}</p>
      </div>
    </div>
  `;

  currentProductId = product.id;
  productModal.show();
}

// Редактирование товара
async function editProduct(product) {
  document.getElementById('editModalTitle').textContent = `Редактировать ${product.name}`;
  document.getElementById('productId').value = product.id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productDescription').value = product.description || '';
  document.getElementById('productLocation').value = product.location;
  document.getElementById('productMinQty').value = product.min_quantity;

  // Загружаем категории и устанавливаем выбранную
  const categorySelect = document.getElementById('productCategory');
  await loadCategoriesForSelect();
  categorySelect.value = product.category_id;

  currentProductId = product.id;
  editModal.show();
}

// Загрузка категорий
async function loadCategories() {
  try {
    await loadCategoriesForSelect();
    await loadCategoriesForDelete();
  } catch (error) {
    console.error('Ошибка загрузки категорий:', error);
    showAlert('Не удалось загрузить категории', 'danger');
  }
}

// Загрузка категорий для select в форме
async function loadCategoriesForSelect() {
  try {
    const response = await fetch('/api/categories');
    const categories = await response.json();
    
    const select = document.getElementById('productCategory');
    select.innerHTML = '<option value="">Выберите категорию</option>';
    
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Ошибка загрузки категорий:', error);
    throw error;
  }
}

// Загрузка категорий для удаления
async function loadCategoriesForDelete() {
  try {
    const response = await fetch('/api/categories');
    const categories = await response.json();
    
    const select = document.getElementById('categoriesList');
    select.innerHTML = '<option value="">Выберите категорию для удаления</option>';
    
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Ошибка загрузки категорий:', error);
    throw error;
  }
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Добавление товара
  document.getElementById('addProductBtn')?.addEventListener('click', async () => {
    document.getElementById('editModalTitle').textContent = 'Добавить товар';
    document.getElementById('productId').value = '';
    document.getElementById('productForm').reset();
    
    await loadCategoriesForSelect();
    editModal.show();
  });

  // Сохранение товара
  document.getElementById('saveProductBtn')?.addEventListener('click', saveProduct);

  // Удаление товара
  document.getElementById('deleteProductBtn')?.addEventListener('click', deleteProduct);

  // Добавление категории
  document.getElementById('addCategoryBtn')?.addEventListener('click', addCategory);

  // Удаление категории
  document.getElementById('deleteCategoryBtn')?.addEventListener('click', deleteCategory);

  // Редактирование товара из модального окна просмотра
  document.getElementById('editProductBtn')?.addEventListener('click', async () => {
    productModal.hide();
    const product = await getProductById(currentProductId);
    if (product) {
      await editProduct(product);
    }
  });

  // Обработчик кнопки выхода
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    fetch('/api/logout')
      .then(() => window.location.href = '/login')
      .catch(err => {
        console.error('Ошибка при выходе:', err);
        showAlert('Не удалось выполнить выход', 'danger');
      });
  });
}

// Получение товара по ID
async function getProductById(id) {
  try {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) {
      throw new Error('Товар не найден');
    }
    return await response.json();
  } catch (error) {
    console.error('Ошибка получения товара:', error);
    showAlert('Не удалось загрузить данные товара', 'danger');
    return null;
  }
}

// Сохранение товара
async function saveProduct() {
  const productData = {
    name: document.getElementById('productName').value,
    category_id: document.getElementById('productCategory').value,
    description: document.getElementById('productDescription').value,
    location: document.getElementById('productLocation').value,
    min_quantity: document.getElementById('productMinQty').value
  };

  if (!validateProduct(productData)) return;

  try {
    showLoader();
    const productId = document.getElementById('productId').value;
    const method = productId ? 'PUT' : 'POST';
    const url = productId ? `/api/products/${productId}` : '/api/products';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    if (!response.ok) throw new Error('Ошибка сохранения');

    editModal.hide();
    await loadProducts();
    showAlert('Товар успешно сохранён', 'success');
  } catch (error) {
    console.error('Ошибка сохранения товара:', error);
    showAlert('Не удалось сохранить товар', 'danger');
  } finally {
    hideLoader();
  }
}

// Валидация данных товара
function validateProduct(product) {
  if (!product.name.trim()) {
    showAlert('Введите наименование товара', 'danger');
    return false;
  }
  if (!product.category_id) {
    showAlert('Выберите категорию', 'danger');
    return false;
  }
  if (!product.location) {
    showAlert('Укажите место хранения', 'danger');
    return false;
  }
  return true;
}

// Удаление товара
async function deleteProduct() {
  if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;

  try {
    showLoader();
    const response = await fetch(`/api/products/${currentProductId}`, { 
      method: 'DELETE' 
    });

    if (!response.ok) throw new Error('Ошибка удаления');

    productModal.hide();
    await loadProducts();
    showAlert('Товар успешно удалён', 'success');
  } catch (error) {
    console.error('Ошибка удаления товара:', error);
    showAlert('Не удалось удалить товар', 'danger');
  } finally {
    hideLoader();
  }
}

// Добавление категории
async function addCategory() {
  const name = document.getElementById('newCategory').value.trim();
  if (!name) {
    showAlert('Введите название категории', 'danger');
    return;
  }

  try {
    showLoader();
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!response.ok) throw new Error('Ошибка добавления');

    document.getElementById('newCategory').value = '';
    await loadCategories();
    showAlert('Категория успешно добавлена', 'success');
  } catch (error) {
    console.error('Ошибка добавления категории:', error);
    showAlert('Не удалось добавить категорию', 'danger');
  } finally {
    hideLoader();
  }
}

// Удаление категории
async function deleteCategory() {
  const select = document.getElementById('categoriesList');
  const categoryId = select.value;
  
  if (!categoryId) {
    showAlert('Выберите категорию для удаления', 'danger');
    return;
  }

  if (!confirm('Вы уверены, что хотите удалить эту категорию?')) return;

  try {
    showLoader();
    const response = await fetch(`/api/categories/${categoryId}`, { 
      method: 'DELETE' 
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка удаления');
    }

    await loadCategories();
    showAlert('Категория успешно удалена', 'success');
  } catch (error) {
    console.error('Ошибка удаления категории:', error);
    showAlert(error.message || 'Не удалось удалить категорию', 'danger');
  } finally {
    hideLoader();
  }
}

// Вспомогательные функции
function showLoader() {
  document.getElementById('loader').style.display = 'block';
}

function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}

function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  const container = document.getElementById('alertsContainer');
  container.prepend(alertDiv);
  
  setTimeout(() => {
    alertDiv.classList.remove('show');
    setTimeout(() => alertDiv.remove(), 150);
  }, 3000);
}