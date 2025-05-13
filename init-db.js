const sqlite3 = require('sqlite3').verbose();

// Создаём и подключаем БД
const db = new sqlite3.Database('./data/db.sqlite', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Подключено к SQLite базе данных.');
});

// Создаём таблицы
db.serialize(() => {
    // 1. Таблица Users
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'storekeeper'))
    )`);

    // 2. Таблица Categories
    db.run(`CREATE TABLE IF NOT EXISTS Categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL
    )`);

    // 3. Таблица Products
    db.run(`CREATE TABLE IF NOT EXISTS Products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        category_id INTEGER NOT NULL,
        description TEXT,
        location INTEGER NOT NULL,
        min_quantity INTEGER DEFAULT 0,
        current_quantity INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES Categories(id)
    )`);

    // 4. Таблица Operations
    db.run(`CREATE TABLE IF NOT EXISTS Operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('incoming', 'outgoing')),
        quantity INTEGER NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        document_number VARCHAR(50) NOT NULL,
        supplier_name VARCHAR(100) NOT NULL,
        user_id INTEGER NOT NULL,
        comment TEXT,
        FOREIGN KEY (product_id) REFERENCES Products(id),
        FOREIGN KEY (user_id) REFERENCES Users(id)
    )`);

    // Заполняем данными
    fillDatabase();
});

// Функция заполнения БД тестовыми данными
function fillDatabase() {
    try {
        // 1. Добавляем пользователей (пароли в открытом виде)
        db.run(`INSERT INTO Users (login, password, role) VALUES (?, ?, ?)`, 
            ['admin', 'admin123', 'admin']);
        db.run(`INSERT INTO Users (login, password, role) VALUES (?, ?, ?)`, 
            ['storekeeper', 'store123', 'storekeeper']);

        // 2. Добавляем категории
        const categories = [
            'Крепеж',
            'Инструменты',
            'Лакокрасочные материалы',
            'Электротовары'
        ];
        
        categories.forEach(category => {
            db.run(`INSERT INTO Categories (name) VALUES (?)`, [category]);
        });

        // 3. Добавляем товары (строительные материалы)
        db.run(`INSERT INTO Products (name, category_id, description, location, min_quantity, current_quantity) VALUES 
            ('Гвозди 100мм', 1, 'Гвозди строительные оцинкованные', 12, 1000, 1500),
            ('Шурупы по дереву 6x60', 1, 'Шурупы с потайной головкой', 15, 500, 800),
            ('Молоток слесарный', 2, 'Молоток 500гр с деревянной ручкой', 3, 10, 15),
            ('Краска белая', 3, 'Водоэмульсионная краска, 5л', 7, 20, 25),
            ('Провод ПВС 2x1.5', 4, 'Провод медный, 50м', 22, 5, 8)`);

        // 4. Добавляем операции
        db.run(`INSERT INTO Operations (product_id, type, quantity, document_number, supplier_name, user_id, comment) VALUES 
            (1, 'incoming', 500, 'НК-2023-001', 'ООО МеталлТорг', 1, 'Первая поставка'),
            (3, 'incoming', 10, 'НК-2023-002', 'ИП Петров', 2, NULL),
            (1, 'outgoing', 200, 'РН-2023-001', 'СтройДом', 2, 'Отгрузка для объекта')`);

        console.log('База данных успешно заполнена тестовыми данными!');
    } catch (err) {
        console.error('Ошибка при заполнении БД:', err);
    } finally {
        // Закрываем соединение
        db.close((err) => {
            if (err) {
                return console.error(err.message);
            }
            console.log('Соединение с SQLite закрыто.');
        });
    }
}