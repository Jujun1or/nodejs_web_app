document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const login = document.getElementById('login').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ login, password })
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