const operationModal = new bootstrap.Modal('#operationModal');
let currentOperationType = null;

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await initPage();
  setupEventListeners();
});

async function checkAuth() {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();
    if (!data.authenticated) window.location.href = '/login';
  } catch (error) {
    window.location.href = '/login';
  }
}

async function initPage() {
  await loadProductsForSelect();
  await loadOperations();
}

async function loadProductsForSelect() {
  try {
    const response = await fetch('/api/products');
    const products = await response.json();
    const select = document.getElementById('operationProduct');
    select.innerHTML = products.map(p => 
      `<option value="${p.id}">${p.name} (Остаток: ${p.current_quantity})</option>`
    ).join('');
  } catch (error) {
    showAlert('Не удалось загрузить товары', 'danger');
  }
}

async function loadOperations() {
  try {
    const filters = {
      type: document.getElementById('filterType').value,
      startDate: document.getElementById('filterStartDate').value,
      endDate: document.getElementById('filterEndDate').value
    };

    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/operations?${params}`);
    const operations = await response.json();
    renderOperations(operations);
  } catch (error) {
    showAlert('Ошибка загрузки операций', 'danger');
  }
}

function renderOperations(operations) {
  const tbody = document.getElementById('operationsTable');
  tbody.innerHTML = operations.map(op => `
    <tr class="${op.type === 'incoming' ? 'table-success' : 'table-danger'}">
      <td>${new Date(op.date).toLocaleString()}</td>
      <td>${op.type === 'incoming' ? 'Приход' : 'Отгрузка'}</td>
      <td>${op.product_name}</td>
      <td>${op.quantity}</td>
      <td>${op.document_number}</td>
      <td>${op.supplier_name}</td>
      <td>${op.user_login}</td>
      <td>${op.comment || ''}</td>
    </tr>
  `).join('');
}

function setupEventListeners() {
  document.getElementById('newIncomingBtn').addEventListener('click', () => 
    showOperationModal('incoming'));
  
  document.getElementById('newOutgoingBtn').addEventListener('click', () => 
    showOperationModal('outgoing'));

  document.getElementById('applyFilters').addEventListener('click', loadOperations);
  
  document.getElementById('saveOperationBtn').addEventListener('click', saveOperation);
}

function showOperationModal(type) {
  currentOperationType = type;
  document.getElementById('operationModalTitle').textContent = 
    type === 'incoming' ? 'Регистрация прихода' : 'Регистрация отгрузки';
  document.getElementById('operationType').value = type;
  document.getElementById('operationForm').reset();
  operationModal.show();
}

async function saveOperation() {
  const operationData = {
    product_id: document.getElementById('operationProduct').value,
    quantity: document.getElementById('operationQuantity').value,
    document_number: document.getElementById('operationDocNumber').value,
    supplier_name: document.getElementById('operationSupplier').value,
    comment: document.getElementById('operationComment').value,
    date: document.getElementById('operationDate').value || new Date().toISOString()
  };

  try {
    const url = currentOperationType === 'incoming' 
      ? '/api/operations/incoming' 
      : '/api/operations/outgoing';

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operationData)
    });

    if (!response.ok) throw new Error('Ошибка сохранения');

    operationModal.hide();
    await loadOperations();
    showAlert('Операция успешно сохранена', 'success');
  } catch (error) {
    showAlert(error.message, 'danger');
  }
}

// Общие функции из products.js
function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.getElementById('alertsContainer').prepend(alertDiv);
  setTimeout(() => alertDiv.remove(), 3000);
}