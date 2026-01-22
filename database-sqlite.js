// SQLite эмуляция для хранения данных в файле database.db
// Использует IndexedDB для эмуляции файловой системы

class SQLiteEmulator {
    constructor() {
        this.dbName = 'NotFoundStudioDB';
        this.storeName = 'database.db';
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    }

    async ensureStoreExists() {
        if (this.db) {
            try {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                transaction.objectStore(this.storeName);
            } catch (error) {
                // Если store не существует, пересоздаем базу данных
                await this.recreateDatabase();
            }
        }
    }

    async recreateDatabase() {
        // Удаляем и создаем базу данных заново
        const deleteRequest = indexedDB.deleteDatabase(this.dbName);
        
        return new Promise((resolve) => {
            deleteRequest.onsuccess = () => {
                this.initDatabase().then(resolve);
            };
            deleteRequest.onerror = () => {
                this.initDatabase().then(resolve);
            };
        });
    }

    // Выполнение SQL запросов
    async query(sql, params = []) {
        await this.initDatabase();
        await this.ensureStoreExists();
        
        const tables = {
            users: 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT "user", avatar TEXT DEFAULT "👤", createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, lastLogin DATETIME, isActive BOOLEAN DEFAULT 1)',
            projects: 'CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL, tech TEXT, link TEXT DEFAULT "#", author TEXT NOT NULL, image TEXT DEFAULT "🚀", createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME)',
            messages: 'CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, read BOOLEAN DEFAULT 0)',
            settings: 'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)'
        };

        // Инициализация таблиц
        if (sql.includes('CREATE TABLE')) {
            return this.executeCreateTable(sql);
        }

        // Парсинг и выполнение запросов
        if (sql.startsWith('INSERT')) {
            return this.executeInsert(sql, params);
        } else if (sql.startsWith('SELECT')) {
            return this.executeSelect(sql, params);
        } else if (sql.startsWith('UPDATE')) {
            return this.executeUpdate(sql, params);
        } else if (sql.startsWith('DELETE')) {
            return this.executeDelete(sql, params);
        }
        
        return { success: false, error: 'Unsupported query' };
    }

    async executeCreateTable(sql) {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        // Сохраняем схему таблицы
        const tableData = {
            type: 'table_schema',
            sql: sql,
            timestamp: new Date().toISOString()
        };
        
        return new Promise((resolve) => {
            const request = store.put(tableData, 'schema_' + Date.now());
            request.onsuccess = () => resolve({ success: true });
            request.onerror = () => resolve({ success: false, error: request.error });
        });
    }

    async executeInsert(sql, params) {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        // Извлекаем имя таблицы из SQL
        const tableName = sql.match(/INSERT INTO (\w+)/i)?.[1];
        if (!tableName) return { success: false, error: 'Invalid table name' };
        
        // Получаем текущие данные таблицы
        const currentData = await this.getTableData(tableName);
        
        // Создаем новую запись
        const newRecord = {
            id: Date.now(),
            ...this.parseInsertValues(sql, params),
            createdAt: new Date().toISOString()
        };
        
        currentData.push(newRecord);
        
        // Сохраняем обновленные данные
        return new Promise((resolve) => {
            const request = store.put(currentData, tableName);
            request.onsuccess = () => resolve({ success: true, insertId: newRecord.id });
            request.onerror = () => resolve({ success: false, error: request.error });
        });
    }

    async executeSelect(sql, params) {
        const tableName = sql.match(/FROM (\w+)/i)?.[1];
        if (!tableName) return { success: false, error: 'Invalid table name' };
        
        const data = await this.getTableData(tableName);
        
        // Простая фильтрация (можно расширить)
        let results = data;
        
        if (sql.includes('WHERE')) {
            const condition = sql.match(/WHERE (.+?)(?: ORDER BY| LIMIT|$)/i)?.[1];
            if (condition) {
                results = this.applyWhereFilter(data, condition, params);
            }
        }
        
        if (sql.includes('ORDER BY')) {
            const orderField = sql.match(/ORDER BY (\w+)/i)?.[1];
            if (orderField) {
                results.sort((a, b) => {
                    if (a[orderField] < b[orderField]) return -1;
                    if (a[orderField] > b[orderField]) return 1;
                    return 0;
                });
            }
        }
        
        return { success: true, data: results };
    }

    async executeUpdate(sql, params) {
        const tableName = sql.match(/UPDATE (\w+)/i)?.[1];
        if (!tableName) return { success: false, error: 'Invalid table name' };
        
        const data = await this.getTableData(tableName);
        const condition = sql.match(/WHERE (.+)/i)?.[1];
        
        let updatedCount = 0;
        
        data.forEach(record => {
            if (this.matchesCondition(record, condition, params)) {
                // Обновляем поля
                const setClause = sql.match(/SET (.+?) WHERE/i)?.[1];
                if (setClause) {
                    const updates = setClause.split(',');
                    updates.forEach(update => {
                        const [field, value] = update.split('=').map(s => s.trim());
                        record[field] = value.replace(/'/g, '');
                    });
                    record.updatedAt = new Date().toISOString();
                    updatedCount++;
                }
            }
        });
        
        // Сохраняем обновленные данные
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve) => {
            const request = store.put(data, tableName);
            request.onsuccess = () => resolve({ success: true, changedRows: updatedCount });
            request.onerror = () => resolve({ success: false, error: request.error });
        });
    }

    async executeDelete(sql, params) {
        const tableName = sql.match(/DELETE FROM (\w+)/i)?.[1];
        if (!tableName) return { success: false, error: 'Invalid table name' };
        
        const data = await this.getTableData(tableName);
        const condition = sql.match(/WHERE (.+)/i)?.[1];
        
        let originalLength = data.length;
        
        if (condition) {
            // Удаляем по условию
            const filteredData = data.filter(record => !this.matchesCondition(record, condition, params));
            
            // Сохраняем обновленные данные
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            return new Promise((resolve) => {
                const request = store.put(filteredData, tableName);
                request.onsuccess = () => resolve({ success: true, affectedRows: originalLength - filteredData.length });
                request.onerror = () => resolve({ success: false, error: request.error });
            });
        } else {
            // Удаляем все записи
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            return new Promise((resolve) => {
                const request = store.put([], tableName);
                request.onsuccess = () => resolve({ success: true, affectedRows: originalLength });
                request.onerror = () => resolve({ success: false, error: request.error });
            });
        }
    }

    async getTableData(tableName) {
        try {
            await this.ensureStoreExists();
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            return new Promise((resolve) => {
                const request = store.get(tableName);
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => {
                    console.error('Error getting table data:', request.error);
                    resolve([]);
                };
            });
        } catch (error) {
            console.error('Error in getTableData:', error);
            return [];
        }
    }

    parseInsertValues(sql, params) {
        // Простая парсилка для INSERT значений
        const valuesMatch = sql.match(/VALUES \((.+?)\)/i);
        if (!valuesMatch) return {};
        
        const values = valuesMatch[1].split(',').map(v => v.trim().replace(/'/g, ''));
        const columnsMatch = sql.match(/\((.+?)\) VALUES/i);
        const columns = columnsMatch ? columnsMatch[1].split(',').map(c => c.trim()) : [];
        
        const result = {};
        columns.forEach((col, index) => {
            result[col] = values[index] || params[index] || null;
        });
        
        return result;
    }

    applyWhereFilter(data, condition, params) {
        return data.filter(record => this.matchesCondition(record, condition, params));
    }

    matchesCondition(record, condition, params) {
        // Простая реализация WHERE условий
        if (!condition) return true;
        
        // Парсим простые условия типа "field = 'value'" или "id = ?"
        const match = condition.match(/(\w+)\s*=\s*(?:'([^']+)'|\?)/i);
        if (!match) return true;
        
        const field = match[1];
        const value = match[2] || params[0];
        
        return record[field] == value;
    }

    // Экспорт данных в "файл" (для демонстрации)
    async exportDatabase() {
        const tables = ['users', 'projects', 'messages', 'settings'];
        const exportData = {};
        
        for (const table of tables) {
            exportData[table] = await this.getTableData(table);
        }
        
        return exportData;
    }

    // Импорт данных из "файла"
    async importDatabase(data) {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const promises = Object.keys(data).map(table => {
            return new Promise((resolve) => {
                const request = store.put(data[table], table);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
            });
        });
        
        await Promise.all(promises);
        return { success: true };
    }
}

// Инициализация базы данных с начальными данными
class DatabaseManager {
    constructor() {
        this.sqlite = new SQLiteEmulator();
        this.initDatabase();
    }

    async initDatabase() {
        try {
            // Создаем таблицы
            await this.sqlite.query('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT "user", avatar TEXT DEFAULT "👤", createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, lastLogin DATETIME, isActive BOOLEAN DEFAULT 1)');
            await this.sqlite.query('CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL, tech TEXT, link TEXT DEFAULT "#", author TEXT NOT NULL, image TEXT DEFAULT "🚀", createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME)');
            await this.sqlite.query('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, read BOOLEAN DEFAULT 0)');
            await this.sqlite.query('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)');
            
            // Проверяем, есть ли данные
            const usersResult = await this.sqlite.query('SELECT COUNT(*) as count FROM users');
            
            if (!usersResult.success || usersResult.data.length === 0 || usersResult.data[0]?.count === 0) {
                await this.insertInitialData();
            }
        } catch (error) {
            console.error('Database initialization error:', error);
            // Пробуем очистить и переинициализировать
            try {
                await this.sqlite.recreateDatabase();
                await this.initDatabase();
            } catch (retryError) {
                console.error('Failed to retry database initialization:', retryError);
            }
        }
    }

    async insertInitialData() {
        // Добавляем проекты по умолчанию
        await this.sqlite.query('INSERT INTO projects (title, description, tech, author, image) VALUES (?, ?, ?, ?, ?)', 
            ['Портфолио студии', 'Современный сайт-портфолио с анимациями и градиентным дизайном', 'HTML, CSS, JavaScript', 'system', '🎨']);
        
        await this.sqlite.query('INSERT INTO projects (title, description, tech, author, image) VALUES (?, ?, ?, ?, ?)', 
            ['Discord Бот', 'Многофункциональный бот для управления Discord сервером', 'Node.js, Discord.js', 'system', '🤖']);
        
        await this.sqlite.query('INSERT INTO projects (title, description, tech, author, image) VALUES (?, ?, ?, ?, ?)', 
            ['Платформа проектов', 'Система управления проектами с командной работой', 'React, Node.js, MongoDB', 'system', '📁']);
        
        // Добавляем настройки
        await this.sqlite.query('INSERT INTO settings (key, value) VALUES (?, ?)', ['siteTitle', '404 | NotFound']);
        await this.sqlite.query('INSERT INTO settings (key, value) VALUES (?, ?)', ['discordInvite', 'https://discord.gg/BKF9wacWU9']);
        await this.sqlite.query('INSERT INTO settings (key, value) VALUES (?, ?)', ['maintenance', 'false']);
    }

    // Регистрация пользователя
    async registerUser(userData) {
        try {
            // Проверяем существование email
            const existingUser = await this.sqlite.query('SELECT id FROM users WHERE email = ?', [userData.email]);
            
            if (existingUser.data.length > 0) {
                return { success: false, error: 'Пользователь с таким email уже существует' };
            }
            
            // Определяем роль (первый пользователь - админ)
            const usersCount = await this.sqlite.query('SELECT COUNT(*) as count FROM users');
            const role = usersCount.data[0].count === 0 ? 'admin' : 'user';
            
            // Хешируем пароль
            const hashedPassword = this.hashPassword(userData.password);
            
            // Добавляем пользователя
            const result = await this.sqlite.query('INSERT INTO users (email, password, name, avatar, role) VALUES (?, ?, ?, ?, ?)', 
                [userData.email, hashedPassword, userData.name, userData.avatar || '👤', role]);
            
            if (result.success) {
                return { success: true, user: { id: result.insertId, email: userData.email, name: userData.name, role, avatar: userData.avatar || '👤' } };
            } else {
                return { success: false, error: 'Ошибка при регистрации' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Авторизация пользователя
    async loginUser(email, password) {
        try {
            const result = await this.sqlite.query('SELECT * FROM users WHERE email = ? AND isActive = 1', [email]);
            
            if (result.data.length === 0) {
                return { success: false, error: 'Пользователь не найден' };
            }
            
            const user = result.data[0];
            
            if (!this.verifyPassword(password, user.password)) {
                return { success: false, error: 'Неверный пароль' };
            }
            
            // Обновляем время последнего входа
            await this.sqlite.query('UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            
            return { 
                success: true, 
                user: { 
                    id: user.id, 
                    email: user.email, 
                    name: user.name, 
                    role: user.role,
                    avatar: user.avatar
                } 
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Получение всех проектов
    async getProjects() {
        try {
            const result = await this.sqlite.query('SELECT * FROM projects ORDER BY createdAt DESC');
            return result.success ? result.data : [];
        } catch (error) {
            return [];
        }
    }

    // Добавление проекта
    async addProject(projectData) {
        try {
            const result = await this.sqlite.query('INSERT INTO projects (title, description, tech, link, author, image) VALUES (?, ?, ?, ?, ?, ?)', 
                [projectData.title, projectData.description, projectData.tech, projectData.link || '#', projectData.author, projectData.image || '🚀']);
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Получение всех пользователей
    async getAllUsers() {
        try {
            const result = await this.sqlite.query('SELECT id, email, name, role, avatar, createdAt, lastLogin, isActive FROM users ORDER BY createdAt DESC');
            return result.success ? result.data : [];
        } catch (error) {
            return [];
        }
    }

    // Добавление сообщения
    async addMessage(messageData) {
        try {
            const result = await this.sqlite.query('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)', 
                [messageData.name, messageData.email, messageData.message]);
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Получение сообщений
    async getMessages() {
        try {
            const result = await this.sqlite.query('SELECT * FROM messages ORDER BY createdAt DESC');
            return result.success ? result.data : [];
        } catch (error) {
            return [];
        }
    }

    // Получение статистики
    async getStats() {
        try {
            const projectsResult = await this.sqlite.query('SELECT COUNT(*) as count FROM projects');
            const usersResult = await this.sqlite.query('SELECT COUNT(*) as count FROM users WHERE isActive = 1');
            const messagesResult = await this.sqlite.query('SELECT COUNT(*) as count FROM messages WHERE read = 0');
            
            return {
                projects: projectsResult.data[0]?.count || 0,
                users: usersResult.data[0]?.count || 0,
                messages: messagesResult.data[0]?.count || 0
            };
        } catch (error) {
            return { projects: 0, users: 0, messages: 0 };
        }
    }

    // Хеширование пароля
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return btoa(hash.toString() + password.length);
    }

    // Проверка пароля
    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }
}

// Глобальный экземпляр базы данных
window.db = new DatabaseManager();

console.log('SQLite эмуляция для 404 | NotFound Studio инициализирована');
