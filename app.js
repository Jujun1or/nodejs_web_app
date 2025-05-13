const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const db = new sqlite3.Database('./data/db.sqlite');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));

// always redirect to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// login route
app.post('/api/login', (req, res) => {
  const { login, password } = req.body;

  db.get(
    'SELECT * FROM Users WHERE login = ? AND password = ?',
    [login, password],
    (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Неверный логин или пароль' });
      }

      res.json({
        role: user.role,
        redirect: user.role === 'admin' ? '/main.html?admin=true' : '/main.html'
      });
    }
  );
});

// static
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/login.html'));
});

app.get('/main', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/main.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`Автоматический редирект на http://localhost:${PORT}/login`);
});