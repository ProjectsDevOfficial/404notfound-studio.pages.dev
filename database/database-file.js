// База данных с файлом data.db - работает без localStorage

class FileDatabase {
    constructor() {
        this.fileName = 'data.db';
        this.data = null;
        this.initDatabase();
    }

    async initDatabase() {
        try {
            // Пробуем загрузить из файла data.db
            await this.loadFromFile();
            
            if (!this.data) {
                // Если файла нет, создаем начальные данные
                this.createInitialData();
            }
        } catch (error) {
            console.error('Database initialization error:', error);
            this.createInitialData();
        }
    }

    createInitialData() {
        this.data = {
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
        
        // Автоматически сохраняем начальные данные
        this.saveToFile();
        console.log('Created initial database data');
    }

    async loadFromFile() {
        try {
            // Пробуем найти файл data.db в текущей директории
            const response = await fetch('./data.db');
            if (response.ok) {
                const text = await response.text();
                this.data = JSON.parse(text);
                console.log('Database loaded from file');
                return true;
            }
        } catch (error) {
            console.log('File data.db not found, will create new one');
        }
        return false;
    }

    async saveToFile() {
        try {
            // Создаем Blob с данными
            const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
            
            // Сохраняем в глобальную переменную для скачивания
            window.databaseBlob = blob;
            
            // Также пробуем сохранить через IndexedDB для персистентности
            if ('indexedDB' in window) {
                await this.saveToIndexedDB();
            }
            
            console.log('Database saved to file');
            return true;
        } catch (error) {
            console.error('Error saving to file:', error);
            return false;
        }
    }

    async saveToIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('NotFoundDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['data'], 'readwrite');
                const store = transaction.objectStore('data');
                
                const putRequest = store.put(this.data, 'main');
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('data')) {
                    db.createObjectStore('data');
                }
            };
        });
    }

    async loadFromIndexedDB() {
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('NotFoundDB', 1);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const db = request.result;
                    const transaction = db.transaction(['data'], 'readonly');
                    const store = transaction.objectStore('data');
                    
                    const getRequest = store.get('main');
                    getRequest.onsuccess = () => {
                        if (getRequest.result) {
                            this.data = getRequest.result;
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    };
                    getRequest.onerror = () => reject(getRequest.error);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('data')) {
                        db.createObjectStore('data');
                    }
                };
            });
        } catch (error) {
            console.error('Error loading from IndexedDB:', error);
            return false;
        }
    }

    // Регистрация пользователя
    async registerUser(userData) {
        try {
            // Проверка существования email
            if (this.data.users.find(user => user.email === userData.email)) {
                return { success: false, error: 'Пользователь с таким email уже существует' };
            }

            const newUser = {
                id: Date.now(),
                email: userData.email,
                password: this.hashPassword(userData.password),
                name: userData.name || userData.email.split('@')[0],
                role: this.data.users.length === 0 ? 'admin' : 'user',
                avatar: userData.avatar || '👤',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true
            };

            this.data.users.push(newUser);
            
            // Обновляем настройку первого пользователя
            if (this.data.users.length === 1) {
                this.data.settings.firstUserRegistered = true;
            }

            await this.saveToFile();
            return { success: true, user: { ...newUser, password: undefined } };
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            return { success: false, error: 'Ошибка при регистрации' };
        }
    }

    // Авторизация пользователя
    async loginUser(email, password) {
        try {
            const user = this.data.users.find(u => u.email === email && u.isActive);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            if (!this.verifyPassword(password, user.password)) {
                return { success: false, error: 'Неверный пароль' };
            }

            // Обновляем время последнего входа
            user.lastLogin = new Date().toISOString();
            await this.saveToFile();

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
            return this.data.users.map(user => ({
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
            const user = this.data.users.find(u => u.id === userId);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            // Нельзя изменить роль последнего администратора
            if (user.role === 'admin' && newRole !== 'admin') {
                const adminCount = this.data.users.filter(u => u.role === 'admin' && u.isActive).length;
                if (adminCount <= 1) {
                    return { success: false, error: 'Нельзя удалить последнего администратора' };
                }
            }

            user.role = newRole;
            await this.saveToFile();
            return { success: true };
        } catch (error) {
            console.error('Ошибка изменения роли:', error);
            return { success: false, error: 'Ошибка изменения роли' };
        }
    }

    // Блокировка/разблокировка пользователя
    async toggleUserStatus(userId) {
        try {
            const user = this.data.users.find(u => u.id === userId);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            // Нельзя заблокировать последнего администратора
            if (user.role === 'admin' && user.isActive) {
                const adminCount = this.data.users.filter(u => u.role === 'admin' && u.isActive).length;
                if (adminCount <= 1) {
                    return { success: false, error: 'Нельзя заблокировать последнего администратора' };
                }
            }

            user.isActive = !user.isActive;
            await this.saveToFile();
            return { success: true };
        } catch (error) {
            console.error('Ошибка изменения статуса:', error);
            return { success: false, error: 'Ошибка изменения статуса' };
        }
    }

    // Получение проектов
    async getProjects() {
        try {
            return this.data.projects || [];
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

            this.data.projects.push(newProject);
            await this.saveToFile();
            return { success: true, project: newProject };
        } catch (error) {
            console.error('Ошибка добавления проекта:', error);
            return { success: false, error: 'Ошибка добавления проекта' };
        }
    }

    // Удаление проекта
    async deleteProject(projectId) {
        try {
            this.data.projects = this.data.projects.filter(p => p.id !== projectId);
            await this.saveToFile();
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

            this.data.messages.push(newMessage);
            await this.saveToFile();
            return { success: true, message: newMessage };
        } catch (error) {
            console.error('Ошибка добавления сообщения:', error);
            return { success: false, error: 'Ошибка добавления сообщения' };
        }
    }

    // Получение сообщений
    async getMessages() {
        try {
            return this.data.messages || [];
        } catch (error) {
            console.error('Ошибка получения сообщений:', error);
            return [];
        }
    }

    // Получение статистики
    async getStats() {
        try {
            return {
                projects: this.data.projects.length,
                users: this.data.users.filter(u => u.isActive).length,
                messages: this.data.messages.filter(m => !m.read).length
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
            return this.data;
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            return null;
        }
    }

    // Импорт данных
    async importData(importData) {
        try {
            this.data = importData;
            await this.saveToFile();
            return { success: true };
        } catch (error) {
            console.error('Ошибка импорта данных:', error);
            return { success: false, error: error.message };
        }
    }
}

// Глобальный экземпляр базы данных
window.db = new FileDatabase();

console.log('Файловая база данных data.db для 404 | NotFound Studio инициализирована');
