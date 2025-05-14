const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const db = new sqlite3.Database('./data/db.sqlite');

// WAL mode
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA synchronous = NORMAL;');
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));

// for async requests to db
const dbGet = (query, params) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// routes
app.get('/', (req, res) => res.redirect('/login'));

app.post('/api/login', async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT * FROM Users WHERE login = ? AND password = ?',
      [req.body.login, req.body.password]
    );

    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    res.json({
      role: user.role,
      redirect: user.role === 'admin' ? '/main.html?admin=true' : '/main.html'
    });
  } catch (err) {
    console.error('Ошибка авторизации:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
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
});


process.on('SIGINT', () => {
  db.close();
  process.exit();
});