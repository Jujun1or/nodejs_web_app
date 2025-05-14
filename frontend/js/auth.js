document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const login = document.getElementById('login').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ login, password })
    });

    const data = await response.json();
    
    if (response.ok) {
      window.location.href = data.redirect;
    } else {
      alert(data.error || 'Ошибка авторизации');
    }
  } catch (error) {
    console.error('Ошибка:', error);
    alert('Сервер недоступен');
  }
});

// Проверка авторизации при загрузке страницы
(async () => {
  try {
    const response = await fetch('/api/check-auth');
    const data = await response.json();
    
    if (data.authenticated && window.location.pathname === '/login') {
      window.location.href = '/main';
    } else if (!data.authenticated && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Ошибка проверки авторизации:', error);
  }
})();