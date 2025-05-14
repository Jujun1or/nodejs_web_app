const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();
const db = new sqlite3.Database('./data/db.sqlite');

// Включаем WAL-режим
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL;');
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db' }),
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 неделя
}));

// Хелперы для БД
const dbGet = (query, params = []) => new Promise((resolve, reject) => {
  db.get(query, params, (err, row) => err ? reject(err) : resolve(row));
});

const dbAll = (query, params = []) => new Promise((resolve, reject) => {
  db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const dbRun = (query, params = []) => new Promise((resolve, reject) => {
  db.run(query, params, function(err) {
    err ? reject(err) : resolve(this.lastID);
  });
});

// Проверка авторизации
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Проверка прав администратора
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Требуются права администратора' });
  }
  next();
};

// Роуты авторизации
app.get('/', (req, res) => res.redirect('/main'));

app.post('/api/login', async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT * FROM Users WHERE login = ? AND password = ?',
      [req.body.login, req.body.password]
    );

    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    req.session.user = {
      id: user.id,
      login: user.login,
      role: user.role
    };

    res.json({ 
      success: true,
      redirect: '/main'
    });
  } catch (err) {
    console.error('Ошибка авторизации:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Роуты товаров
app.get('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const product = await dbGet(`
      SELECT p.*, c.name as category_name 
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', requireAuth, async (req, res) => {
  try {
    const products = await dbAll(`
      SELECT p.*, c.name as category_name 
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.id
    `);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, category_id, description, location, min_quantity } = req.body;
    const id = await dbRun(
      `INSERT INTO Products 
      (name, category_id, description, location, min_quantity, current_quantity) 
      VALUES (?, ?, ?, ?, ?, 0)`,
      [name, category_id, description, location, min_quantity]
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, category_id, description, location, min_quantity } = req.body;
    await dbRun(
      `UPDATE Products SET 
      name = ?, category_id = ?, description = ?, 
      location = ?, min_quantity = ? 
      WHERE id = ?`,
      [name, category_id, description, location, min_quantity, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await dbRun('DELETE FROM Products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Роуты категорий
app.get('/api/categories', requireAuth, async (req, res) => {
  try {
    const categories = await dbAll('SELECT * FROM Categories');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', requireAuth, requireAdmin, async (req, res) => {
  try {
    await dbRun('INSERT INTO Categories (name) VALUES (?)', [req.body.name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    await dbRun('UPDATE Categories SET name = ? WHERE id = ?', [name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const products = await dbAll('SELECT * FROM Products WHERE category_id = ?', [req.params.id]);
    if (products.length > 0) {
      return res.status(400).json({ error: 'Нельзя удалить категорию с товарами' });
    }
    await dbRun('DELETE FROM Categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Проверка прав администратора
app.get('/api/check-auth', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({ 
    authenticated: true,
    user: req.session.user
  });
});

// Статические файлы
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/main');
  res.sendFile(path.join(__dirname, 'frontend/login.html'));
});

app.get('/main', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/main.html'));
});

app.get('/products', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/products.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  db.close();
  process.exit();
});