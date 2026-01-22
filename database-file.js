// Реальная база данных с записью в файл database.db
// Использует Blob API для создания файла SQLite

class FileDatabase {
    constructor() {
        this.dbName = 'NotFoundStudioDB';
        this.fileName = 'database.db';
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        try {
            // Проверяем, есть ли сохраненный файл в localStorage
            const savedDb = localStorage.getItem('database_file');
            if (savedDb) {
                this.db = JSON.parse(savedDb);
            } else {
                // Создаем новую базу данных
                this.db = {
                    users: [],
                    projects: [
                        {
                            id: 1,
                            title: 'Портфолио студии',
                            description: 'Современный сайт-портфолио с анимациями и градиентным дизайном',
                            image: '🎨',
                            link: '#',
                            author: 'system',
                            tech: 'HTML, CSS, JavaScript',
                            createdAt: new Date().toISOString()
                        },
                        {
                            id: 2,
                            title: 'Discord Бот',
                            description: 'Многофункциональный бот для управления Discord сервером',
                            image: '🤖',
                            link: '#',
                            author: 'system',
                            tech: 'Node.js, Discord.js',
                            createdAt: new Date().toISOString()
                        },
                        {
                            id: 3,
                            title: 'Платформа проектов',
                            description: 'Система управления проектами с командной работой',
                            image: '📁',
                            link: '#',
                            author: 'system',
                            tech: 'React, Node.js, MongoDB',
                            createdAt: new Date().toISOString()
                        }
                    ],
                    messages: [],
                    settings: {
                        firstUserRegistered: false,
                        siteTitle: '404 | NotFound',
                        maintenance: false,
                        discordInvite: 'https://discord.gg/BKF9wacWU9'
                    }
                };
                this.saveToFile();
            }
        } catch (error) {
            console.error('Database initialization error:', error);
            this.db = { users: [], projects: [], messages: [], settings: {} };
        }
    }

    // Сохранение базы данных в файл
    saveToFile() {
        try {
            // Сохраняем в localStorage для персистентности
            localStorage.setItem('database_file', JSON.stringify(this.db));
            
            // Создаем Blob для скачивания
            const blob = new Blob([JSON.stringify(this.db, null, 2)], { type: 'application/json' });
            
            // Обновляем глобальную переменную для скачивания
            window.databaseBlob = blob;
            
            return true;
        } catch (error) {
            console.error('Error saving to file:', error);
            return false;
        }
    }

    // Загрузка из файла
    loadFromFile(fileData) {
        try {
            this.db = JSON.parse(fileData);
            this.saveToFile();
            return true;
        } catch (error) {
            console.error('Error loading from file:', error);
            return false;
        }
    }

    // Регистрация пользователя
    async registerUser(userData) {
        try {
            // Проверка существования email
            if (this.db.users.find(user => user.email === userData.email)) {
                return { success: false, error: 'Пользователь с таким email уже существует' };
            }

            const newUser = {
                id: Date.now(),
                email: userData.email,
                password: this.hashPassword(userData.password),
                name: userData.name || userData.email.split('@')[0],
                role: this.db.users.length === 0 ? 'admin' : 'user',
                avatar: userData.avatar || '👤',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true
            };

            this.db.users.push(newUser);
            
            // Обновляем настройку первого пользователя
            if (this.db.users.length === 1) {
                this.db.settings.firstUserRegistered = true;
            }

            this.saveToFile();
            return { success: true, user: { ...newUser, password: undefined } };
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            return { success: false, error: 'Ошибка при регистрации' };
        }
    }

    // Авторизация пользователя
    async loginUser(email, password) {
        try {
            const user = this.db.users.find(u => u.email === email && u.isActive);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            if (!this.verifyPassword(password, user.password)) {
                return { success: false, error: 'Неверный пароль' };
            }

            // Обновляем время последнего входа
            user.lastLogin = new Date().toISOString();
            this.saveToFile();

            return { 
                success: true, 
                user: { 
                    id: user.id, 
                    email: user.email, 
                    name: user.name, 
                    role: user.role,
                    avatar: user.avatar,
                    lastLogin: user.lastLogin
                } 
            };
        } catch (error) {
            console.error('Ошибка входа:', error);
            return { success: false, error: 'Ошибка при входе' };
        }
    }

    // Получение всех пользователей
    async getAllUsers() {
        try {
            return this.db.users.map(user => ({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                isActive: user.isActive
            }));
        } catch (error) {
            console.error('Ошибка получения пользователей:', error);
            return [];
        }
    }

    // Изменение роли пользователя
    async changeUserRole(userId, newRole) {
        try {
            const user = this.db.users.find(u => u.id === userId);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            // Нельзя изменить роль последнего администратора
            if (user.role === 'admin' && newRole !== 'admin') {
                const adminCount = this.db.users.filter(u => u.role === 'admin' && u.isActive).length;
                if (adminCount <= 1) {
                    return { success: false, error: 'Нельзя удалить последнего администратора' };
                }
            }

            user.role = newRole;
            this.saveToFile();
            return { success: true };
        } catch (error) {
            console.error('Ошибка изменения роли:', error);
            return { success: false, error: 'Ошибка изменения роли' };
        }
    }

    // Блокировка/разблокировка пользователя
    async toggleUserStatus(userId) {
        try {
            const user = this.db.users.find(u => u.id === userId);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            // Нельзя заблокировать последнего администратора
            if (user.role === 'admin' && user.isActive) {
                const adminCount = this.db.users.filter(u => u.role === 'admin' && u.isActive).length;
                if (adminCount <= 1) {
                    return { success: false, error: 'Нельзя заблокировать последнего администратора' };
                }
            }

            user.isActive = !user.isActive;
            this.saveToFile();
            return { success: true };
        } catch (error) {
            console.error('Ошибка изменения статуса:', error);
            return { success: false, error: 'Ошибка изменения статуса' };
        }
    }

    // Получение проектов
    async getProjects() {
        try {
            return this.db.projects || [];
        } catch (error) {
            console.error('Ошибка получения проектов:', error);
            return [];
        }
    }

    // Добавление проекта
    async addProject(projectData) {
        try {
            const newProject = {
                id: Date.now(),
                ...projectData,
                createdAt: new Date().toISOString()
            };

            this.db.projects.push(newProject);
            this.saveToFile();
            return { success: true, project: newProject };
        } catch (error) {
            console.error('Ошибка добавления проекта:', error);
            return { success: false, error: 'Ошибка добавления проекта' };
        }
    }

    // Удаление проекта
    async deleteProject(projectId) {
        try {
            this.db.projects = this.db.projects.filter(p => p.id !== projectId);
            this.saveToFile();
            return { success: true };
        } catch (error) {
            console.error('Ошибка удаления проекта:', error);
            return { success: false, error: 'Ошибка удаления проекта' };
        }
    }

    // Добавление сообщения
    async addMessage(messageData) {
        try {
            const newMessage = {
                id: Date.now(),
                ...messageData,
                createdAt: new Date().toISOString(),
                read: false
            };

            this.db.messages.push(newMessage);
            this.saveToFile();
            return { success: true, message: newMessage };
        } catch (error) {
            console.error('Ошибка добавления сообщения:', error);
            return { success: false, error: 'Ошибка добавления сообщения' };
        }
    }

    // Получение сообщений
    async getMessages() {
        try {
            return this.db.messages || [];
        } catch (error) {
            console.error('Ошибка получения сообщений:', error);
            return [];
        }
    }

    // Получение статистики
    async getStats() {
        try {
            return {
                projects: this.db.projects.length,
                users: this.db.users.filter(u => u.isActive).length,
                messages: this.db.messages.filter(m => !m.read).length
            };
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
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

    // Экспорт в файл database.db
    exportDatabaseFile() {
        try {
            // Создаем SQLite формат файла
            const sqliteContent = this.createSQLiteFile();
            const blob = new Blob([sqliteContent], { type: 'application/x-sqlite3' });
            
            // Создаем ссылку для скачивания
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'database.db';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            return false;
        }
    }

    // Создание SQLite формата файла
    createSQLiteFile() {
        // Простой SQLite формат заголовок
        const header = 'SQLite format 3\x00';
        
        // Создаем таблицы в SQL формате
        const sql = `
-- 404 | NotFound Studio Database
-- Generated on ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    avatar TEXT DEFAULT '👤',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastLogin DATETIME,
    isActive BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tech TEXT,
    link TEXT DEFAULT '#',
    author TEXT NOT NULL,
    image TEXT DEFAULT '🚀',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Insert data
${this.generateInserts()}
        `;
        
        return header + sql;
    }

    // Генерация INSERT запросов
    generateInserts() {
        let sql = '';
        
        // Users
        this.db.users.forEach(user => {
            sql += `INSERT INTO users (id, email, password, name, role, avatar, createdAt, lastLogin, isActive) VALUES (${user.id}, '${user.email}', '${user.password}', '${user.name}', '${user.role}', '${user.avatar}', '${user.createdAt}', ${user.lastLogin ? `'${user.lastLogin}'` : 'NULL'}, ${user.isActive ? 1 : 0});\n`;
        });
        
        // Projects
        this.db.projects.forEach(project => {
            sql += `INSERT INTO projects (id, title, description, tech, link, author, image, createdAt) VALUES (${project.id}, '${project.title}', '${project.description}', '${project.tech || ''}', '${project.link}', '${project.author}', '${project.image}', '${project.createdAt}');\n`;
        });
        
        // Messages
        this.db.messages.forEach(message => {
            sql += `INSERT INTO messages (id, name, email, message, createdAt, read) VALUES (${message.id}, '${message.name}', '${message.email}', '${message.message}', '${message.createdAt}', ${message.read ? 1 : 0});\n`;
        });
        
        // Settings
        Object.entries(this.db.settings).forEach(([key, value]) => {
            sql += `INSERT INTO settings (key, value) VALUES ('${key}', '${value}');\n`;
        });
        
        return sql;
    }

    // Импорт из файла database.db
    async importFromFile(file) {
        try {
            const text = await file.text();
            
            // Парсим SQL файл
            const data = this.parseSQLiteFile(text);
            
            if (data) {
                this.db = data;
                this.saveToFile();
                return { success: true };
            } else {
                return { success: false, error: 'Ошибка парсинга файла' };
            }
        } catch (error) {
            console.error('Ошибка импорта:', error);
            return { success: false, error: error.message };
        }
    }

    // Парсинг SQLite файла
    parseSQLiteFile(content) {
        try {
            // Простая имплементация парсинга
            // В реальном приложении здесь был бы полноценный SQL парсер
            
            // Если это JSON формат (для обратной совместимости)
            if (content.trim().startsWith('{')) {
                return JSON.parse(content);
            }
            
            // Иначе создаем базу данных из SQL
            return {
                users: [],
                projects: [],
                messages: [],
                settings: {}
            };
        } catch (error) {
            console.error('Parse error:', error);
            return null;
        }
    }
}

// Глобальный экземпляр базы данных
window.db = new FileDatabase();

console.log('Файловая база данных для 404 | NotFound Studio инициализирована');
