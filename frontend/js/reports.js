// Глобальные переменные
let currentReportType = null;
let currentReportData = null;
let currentReportParams = {};

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
    
    toggleAdminFeatures(data.user.role === 'admin');
  } catch (error) {
    console.error('Ошибка проверки авторизации:', error);
    window.location.href = '/login';
  }
}

// Показываем/скрываем функции админа
function toggleAdminFeatures(isAdmin) {
  // Для отчетов обычно не требуется разделение прав
}

// Инициализация страницы
async function initPage() {
  setupEventListeners();
  await loadProductsForSelect();
  setDefaultDates();
}

// Установка дат по умолчанию (текущий месяц)
function setDefaultDates() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  document.getElementById('operationsStartDate').valueAsDate = firstDay;
  document.getElementById('operationsEndDate').valueAsDate = lastDay;
  document.getElementById('movementStartDate').valueAsDate = firstDay;
  document.getElementById('movementEndDate').valueAsDate = lastDay;
}

// Загрузка товаров для выпадающего списка
async function loadProductsForSelect() {
  try {
    const response = await fetch('/api/products');
    const products = await response.json();
    
    const select = document.getElementById('productSelect');
    select.innerHTML = '<option value="">Выберите товар</option>';
    
    products.forEach(product => {
      const option = document.createElement('option');
      option.value = product.id;
      option.textContent = product.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
    showAlert('Не удалось загрузить список товаров', 'danger');
  }
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Кнопка выхода
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    fetch('/api/logout').then(() => window.location.href = '/login');
  });

  // Текущие остатки
  document.getElementById('currentStockBtn')?.addEventListener('click', async () => {
    currentReportType = 'current-stock';
    currentReportParams = {};
    await generateReport();
  });

  // Критические остатки
  document.getElementById('lowStockBtn')?.addEventListener('click', async () => {
    currentReportType = 'low-stock';
    currentReportParams = {};
    await generateReport();
  });

  // Операции за период
  document.getElementById('operationsBtn')?.addEventListener('click', async () => {
    const startDate = document.getElementById('operationsStartDate').value;
    const endDate = document.getElementById('operationsEndDate').value;
    
    if (!startDate || !endDate) {
      showAlert('Укажите период для отчета', 'danger');
      return;
    }
    
    currentReportType = 'operations';
    currentReportParams = { startDate, endDate };
    await generateReport();
  });

  // Движение товара
  document.getElementById('movementBtn')?.addEventListener('click', async () => {
    const productId = document.getElementById('productSelect').value;
    const startDate = document.getElementById('movementStartDate').value;
    const endDate = document.getElementById('movementEndDate').value;
    
    if (!productId) {
      showAlert('Выберите товар', 'danger');
      return;
    }
    
    if (!startDate || !endDate) {
      showAlert('Укажите период для отчета', 'danger');
      return;
    }
    
    currentReportType = 'product-movement';
    currentReportParams = { productId, startDate, endDate };
    await generateReport();
  });

  // Кнопки экспорта
  document.getElementById('exportCurrentStockBtn')?.addEventListener('click', () => exportToCSV());
  document.getElementById('exportLowStockBtn')?.addEventListener('click', () => exportToCSV());
  document.getElementById('exportOperationsBtn')?.addEventListener('click', () => exportToCSV());
  document.getElementById('exportMovementBtn')?.addEventListener('click', () => exportToCSV());
}

// Генерация отчета
async function generateReport() {
  try {
    showLoader();
    
    let url = `/api/reports/${currentReportType}`;
    if (Object.keys(currentReportParams).length > 0) {
      const params = new URLSearchParams(currentReportParams);
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Ошибка формирования отчета');
    
    currentReportData = await response.json();
    renderReport();
    showExportButton();
    
    if (currentReportData && currentReportData.length > 0) {
      showAlert('Отчет успешно сформирован', 'success');
    } else {
      showAlert('Нет данных для отображения', 'info');
    }
  } catch (error) {
    console.error('Ошибка формирования отчета:', error);
    showAlert('Не удалось сформировать отчет', 'danger');
  } finally {
    hideLoader();
  }
}

// Отображение отчета в таблице
function renderReport() {
  const header = document.getElementById('reportTableHeader');
  const body = document.getElementById('reportTableBody');
  
  header.innerHTML = '';
  body.innerHTML = '';
  
  if (!currentReportData || currentReportData.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="10" class="text-center">Нет данных для отображения</td>';
    body.appendChild(row);
    return;
  }
  
  // Создаем заголовки таблицы
  const headerRow = document.createElement('tr');
  Object.keys(currentReportData[0]).forEach(key => {
    const th = document.createElement('th');
    th.textContent = formatHeader(key);
    headerRow.appendChild(th);
  });
  header.appendChild(headerRow);
  
  // Заполняем данные
  currentReportData.forEach(item => {
    const row = document.createElement('tr');
    Object.values(item).forEach(value => {
      const td = document.createElement('td');
      td.textContent = value !== null ? value : '';
      row.appendChild(td);
    });
    body.appendChild(row);
  });
}

// Форматирование заголовков
function formatHeader(key) {
  const headers = {
    'id': 'ID',
    'name': 'Наименование',
    'category': 'Категория',
    'current_quantity': 'Текущий остаток',
    'min_quantity': 'Мин. остаток',
    'location': 'Место хранения',
    'description': 'Описание',
    'product_name': 'Товар',
    'type': 'Тип операции',
    'quantity': 'Количество',
    'date': 'Дата',
    'document_number': 'Номер накладной',
    'supplier_name': 'Поставщик/Получатель',
    'user_login': 'Пользователь',
    'comment': 'Комментарий'
  };
  
  return headers[key] || key;
}

// Показать кнопку экспорта
function showExportButton() {
  // Скрываем все кнопки экспорта
  document.querySelectorAll('[id^="export"]').forEach(btn => {
    if (btn) btn.style.display = 'none';
  });
  
  // Формируем ID кнопки экспорта
  let exportBtnId;
  switch(currentReportType) {
    case 'current-stock':
      exportBtnId = 'exportCurrentStockBtn';
      break;
    case 'low-stock':
      exportBtnId = 'exportLowStockBtn';
      break;
    case 'operations':
      exportBtnId = 'exportOperationsBtn';
      break;
    case 'product-movement':
      exportBtnId = 'exportMovementBtn';
      break;
    default:
      return;
  }
  
  const exportBtn = document.getElementById(exportBtnId);
  if (exportBtn) {
    exportBtn.style.display = 'inline-block';
  }
}

// Экспорт в CSV
function exportToCSV() {
  const params = new URLSearchParams({
    reportType: currentReportType,
    ...currentReportParams
  });
  
  window.open(`/api/reports/export-csv?${params.toString()}`, '_blank');
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