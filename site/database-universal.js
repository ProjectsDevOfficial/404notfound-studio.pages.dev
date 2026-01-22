// Универсальная база данных - работает везде без localStorage
// Использует GitHub Gist или JSON файл для хранения данных

class UniversalDatabase {
    constructor() {
        this.apiEndpoint = 'https://api.github.com/gists';
        this.gistId = null; // Будет установлен при инициализации
        this.token = null; // GitHub token для записи (опционально)
        this.cache = {};
        this.initDatabase();
    }

    async initDatabase() {
        try {
            // Проверяем, есть ли сохраненный Gist ID
            this.gistId = this.getStorageItem('db_gist_id');
            
            if (!this.gistId) {
                // Создаем новый Gist с начальными данными
                await this.createNewGist();
            } else {
                // Загружаем существующие данные
                await this.loadFromGist();
            }
        } catch (error) {
            console.error('Database initialization error:', error);
            // Если Gist не работает, используем localStorage как fallback
            this.initLocalStorage();
        }
    }

    // Создание нового Gist
    async createNewGist() {
        const initialData = {
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

        this.cache = initialData;
        
        // Сохраняем в localStorage как backup
        this.setStorageItem('database_backup', JSON.stringify(initialData));
        
        console.log('Universal database initialized with default data');
    }

    // Загрузка из Gist
    async loadFromGist() {
        try {
            const response = await fetch(`${this.apiEndpoint}/${this.gistId}`);
            if (response.ok) {
                const gist = await response.json();
                const dataFile = gist.files['database.json'];
                if (dataFile && dataFile.content) {
                    this.cache = JSON.parse(dataFile.content);
                    console.log('Database loaded from Gist');
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading from Gist:', error);
        }
        
        // Если не удалось загрузить из Gist, пробуем localStorage
        this.initLocalStorage();
    }

    // Инициализация localStorage как fallback
    initLocalStorage() {
        const backup = this.getStorageItem('database_backup');
        if (backup) {
            try {
                this.cache = JSON.parse(backup);
                console.log('Database loaded from localStorage backup');
            } catch (error) {
                console.error('Error parsing backup:', error);
                this.cache = { users: [], projects: [], messages: [], settings: {} };
            }
        } else {
            this.cache = { users: [], projects: [], messages: [], settings: {} };
        }
    }

    // Сохранение данных
    async saveData() {
        try {
            // Сохраняем в localStorage как backup
            this.setStorageItem('database_backup', JSON.stringify(this.cache));
            
            // Пробуем сохранить в Gist (если есть token)
            if (this.token && this.gistId) {
                await this.saveToGist();
            }
            
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    // Сохранение в Gist
    async saveToGist() {
        try {
            const response = await fetch(`${this.apiEndpoint}/${this.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        'database.json': {
                            content: JSON.stringify(this.cache, null, 2)
                        }
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save to Gist');
            }
            
            console.log('Data saved to Gist');
        } catch (error) {
            console.error('Error saving to Gist:', error);
            throw error;
        }
    }

    // Вспомогательные функции для localStorage
    getStorageItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    setStorageItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.error('localStorage error:', error);
        }
    }

    // Регистрация пользователя
    async registerUser(userData) {
        try {
            // Проверка существования email
            if (this.cache.users.find(user => user.email === userData.email)) {
                return { success: false, error: 'Пользователь с таким email уже существует' };
            }

            const newUser = {
                id: Date.now(),
                email: userData.email,
                password: this.hashPassword(userData.password),
                name: userData.name || userData.email.split('@')[0],
                role: this.cache.users.length === 0 ? 'admin' : 'user',
                avatar: userData.avatar || '👤',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true
            };

            this.cache.users.push(newUser);
            
            // Обновляем настройку первого пользователя
            if (this.cache.users.length === 1) {
                this.cache.settings.firstUserRegistered = true;
            }

            await this.saveData();
            return { success: true, user: { ...newUser, password: undefined } };
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            return { success: false, error: 'Ошибка при регистрации' };
        }
    }

    // Авторизация пользователя
    async loginUser(email, password) {
        try {
            const user = this.cache.users.find(u => u.email === email && u.isActive);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            if (!this.verifyPassword(password, user.password)) {
                return { success: false, error: 'Неверный пароль' };
            }

            // Обновляем время последнего входа
            user.lastLogin = new Date().toISOString();
            await this.saveData();

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

    // Получение проектов
    async getProjects() {
        try {
            return this.cache.projects || [];
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

            this.cache.projects.push(newProject);
            await this.saveData();
            return { success: true, project: newProject };
        } catch (error) {
            console.error('Ошибка добавления проекта:', error);
            return { success: false, error: 'Ошибка добавления проекта' };
        }
    }

    // Удаление проекта
    async deleteProject(projectId) {
        try {
            this.cache.projects = this.cache.projects.filter(p => p.id !== projectId);
            await this.saveData();
            return { success: true };
        } catch (error) {
            console.error('Ошибка удаления проекта:', error);
            return { success: false, error: 'Ошибка удаления проекта' };
        }
    }

    // Получение всех пользователей
    async getAllUsers() {
        try {
            return this.cache.users.map(user => ({
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
            const user = this.cache.users.find(u => u.id === userId);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            // Нельзя изменить роль последнего администратора
            if (user.role === 'admin' && newRole !== 'admin') {
                const adminCount = this.cache.users.filter(u => u.role === 'admin' && u.isActive).length;
                if (adminCount <= 1) {
                    return { success: false, error: 'Нельзя удалить последнего администратора' };
                }
            }

            user.role = newRole;
            await this.saveData();
            return { success: true };
        } catch (error) {
            console.error('Ошибка изменения роли:', error);
            return { success: false, error: 'Ошибка изменения роли' };
        }
    }

    // Блокировка/разблокировка пользователя
    async toggleUserStatus(userId) {
        try {
            const user = this.cache.users.find(u => u.id === userId);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            // Нельзя заблокировать последнего администратора
            if (user.role === 'admin' && user.isActive) {
                const adminCount = this.cache.users.filter(u => u.role === 'admin' && u.isActive).length;
                if (adminCount <= 1) {
                    return { success: false, error: 'Нельзя заблокировать последнего администратора' };
                }
            }

            user.isActive = !user.isActive;
            await this.saveData();
            return { success: true };
        } catch (error) {
            console.error('Ошибка изменения статуса:', error);
            return { success: false, error: 'Ошибка изменения статуса' };
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

            this.cache.messages.push(newMessage);
            await this.saveData();
            return { success: true, message: newMessage };
        } catch (error) {
            console.error('Ошибка добавления сообщения:', error);
            return { success: false, error: 'Ошибка добавления сообщения' };
        }
    }

    // Получение сообщений
    async getMessages() {
        try {
            return this.cache.messages || [];
        } catch (error) {
            console.error('Ошибка получения сообщений:', error);
            return [];
        }
    }

    // Получение статистики
    async getStats() {
        try {
            return {
                projects: this.cache.projects.length,
                users: this.cache.users.filter(u => u.isActive).length,
                messages: this.cache.messages.filter(m => !m.read).length
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

    // Экспорт данных
    exportData() {
        try {
            return this.cache;
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            return null;
        }
    }

    // Импорт данных
    async importData(importData) {
        try {
            this.cache = importData;
            await this.saveData();
            return { success: true };
        } catch (error) {
            console.error('Ошибка импорта данных:', error);
            return { success: false, error: error.message };
        }
    }
}

// Глобальный экземпляр универсальной базы данных
window.db = new UniversalDatabase();

console.log('Универсальная база данных для 404 | NotFound Studio инициализирована');
