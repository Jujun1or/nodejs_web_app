document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const loginInput = document.getElementById('login');
  const passwordInput = document.getElementById('password');
  
  if (!loginInput || !passwordInput) {
    console.error('Не найдены элементы формы');
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ 
        login: loginInput.value, 
        password: passwordInput.value 
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Ошибка авторизации');
    }

    const data = await response.json();
    window.location.href = data.redirect;
    
  } catch (error) {
    console.error('Ошибка:', error.message);
    alert(error.message || 'Сервер недоступен');
    
    // Восстанавливаем форму после ошибки
    loginInput.focus();
    passwordInput.value = '';
  }
});