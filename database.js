// База данных для 404 | NotFound Studio на основе localStorage

class NotFoundDatabase {
    constructor() {
        this.dbKey = 'notfound_studio_db';
        this.initDatabase();
    }

    // Инициализация базы данных
    initDatabase() {
        if (!localStorage.getItem(this.dbKey)) {
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
            this.saveData(initialData);
        }
    }

    // Сохранение данных
    saveData(data) {
        try {
            localStorage.setItem(this.dbKey, JSON.stringify(data));
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
        }
    }

    // Загрузка данных
    loadData() {
        try {
            const stored = localStorage.getItem(this.dbKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            return null;
        }
    }

    // Регистрация нового пользователя
    registerUser(userData) {
        try {
            const data = this.loadData();
            if (!data) return { success: false, error: 'Ошибка базы данных' };

            // Проверка существования email
            if (data.users.find(user => user.email === userData.email)) {
                return { success: false, error: 'Пользователь с таким email уже существует' };
            }

            const newUser = {
                id: Date.now(),
                email: userData.email,
                password: this.hashPassword(userData.password),
                name: userData.name || userData.email.split('@')[0],
                role: data.users.length === 0 ? 'admin' : 'user',
                avatar: userData.avatar || '👤',
                createdAt: new Date().toISOString(),
                lastLogin: null,
                isActive: true
            };

            data.users.push(newUser);
            
            // Обновляем настройку первого пользователя
            if (data.users.length === 1) {
                data.settings.firstUserRegistered = true;
            }

            this.saveData(data);
            return { success: true, user: { ...newUser, password: undefined } };
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            return { success: false, error: 'Ошибка при регистрации' };
        }
    }

    // Авторизация пользователя
    loginUser(email, password) {
        try {
            const data = this.loadData();
            if (!data) return { success: false, error: 'Ошибка базы данных' };

            const user = data.users.find(u => u.email === email && u.isActive);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            if (!this.verifyPassword(password, user.password)) {
                return { success: false, error: 'Неверный пароль' };
            }

            // Обновляем время последнего входа
            user.lastLogin = new Date().toISOString();
            this.saveData(data);

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

    // Получение всех пользователей (только для админа)
    getAllUsers() {
        try {
            const data = this.loadData();
            if (!data) return [];

            return data.users.map(user => ({
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
    changeUserRole(userId, newRole) {
        try {
            const data = this.loadData();
            if (!data) return { success: false, error: 'Ошибка базы данных' };

            const user = data.users.find(u => u.id === userId);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            // Нельзя изменить роль последнего администратора
            if (user.role === 'admin' && newRole !== 'admin') {
                const adminCount = data.users.filter(u => u.role === 'admin' && u.isActive).length;
                if (adminCount <= 1) {
                    return { success: false, error: 'Нельзя удалить последнего администратора' };
                }
            }

            user.role = newRole;
            this.saveData(data);
            return { success: true };
        } catch (error) {
            console.error('Ошибка изменения роли:', error);
            return { success: false, error: 'Ошибка изменения роли' };
        }
    }

    // Блокировка/разблокировка пользователя
    toggleUserStatus(userId) {
        try {
            const data = this.loadData();
            if (!data) return { success: false, error: 'Ошибка базы данных' };

            const user = data.users.find(u => u.id === userId);
            if (!user) {
                return { success: false, error: 'Пользователь не найден' };
            }

            // Нельзя заблокировать последнего администратора
            if (user.role === 'admin' && user.isActive) {
                const adminCount = data.users.filter(u => u.role === 'admin' && u.isActive).length;
                if (adminCount <= 1) {
                    return { success: false, error: 'Нельзя заблокировать последнего администратора' };
                }
            }

            user.isActive = !user.isActive;
            this.saveData(data);
            return { success: true };
        } catch (error) {
            console.error('Ошибка изменения статуса:', error);
            return { success: false, error: 'Ошибка изменения статуса' };
        }
    }

    // Получение проектов
    getProjects() {
        try {
            const data = this.loadData();
            return data ? data.projects : [];
        } catch (error) {
            console.error('Ошибка получения проектов:', error);
            return [];
        }
    }

    // Добавление проекта
    addProject(projectData) {
        try {
            const data = this.loadData();
            if (!data) return { success: false, error: 'Ошибка базы данных' };

            const newProject = {
                id: Date.now(),
                ...projectData,
                createdAt: new Date().toISOString()
            };

            data.projects.push(newProject);
            this.saveData(data);
            return { success: true, project: newProject };
        } catch (error) {
            console.error('Ошибка добавления проекта:', error);
            return { success: false, error: 'Ошибка добавления проекта' };
        }
    }

    // Обновление проекта
    updateProject(projectId, projectData) {
        try {
            const data = this.loadData();
            if (!data) return { success: false, error: 'Ошибка базы данных' };

            const projectIndex = data.projects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) {
                return { success: false, error: 'Проект не найден' };
            }

            data.projects[projectIndex] = {
                ...data.projects[projectIndex],
                ...projectData,
                updatedAt: new Date().toISOString()
            };

            this.saveData(data);
            return { success: true };
        } catch (error) {
            console.error('Ошибка обновления проекта:', error);
            return { success: false, error: 'Ошибка обновления проекта' };
        }
    }

    // Удаление проекта
    deleteProject(projectId) {
        try {
            const data = this.loadData();
            if (!data) return { success: false, error: 'Ошибка базы данных' };

            data.projects = data.projects.filter(p => p.id !== projectId);
            this.saveData(data);
            return { success: true };
        } catch (error) {
            console.error('Ошибка удаления проекта:', error);
            return { success: false, error: 'Ошибка удаления проекта' };
        }
    }

    // Добавление сообщения из формы контактов
    addMessage(messageData) {
        try {
            const data = this.loadData();
            if (!data) return { success: false, error: 'Ошибка базы данных' };

            const newMessage = {
                id: Date.now(),
                ...messageData,
                createdAt: new Date().toISOString(),
                read: false
            };

            data.messages.push(newMessage);
            this.saveData(data);
            return { success: true, message: newMessage };
        } catch (error) {
            console.error('Ошибка добавления сообщения:', error);
            return { success: false, error: 'Ошибка добавления сообщения' };
        }
    }

    // Получение сообщений
    getMessages() {
        try {
            const data = this.loadData();
            return data ? data.messages : [];
        } catch (error) {
            console.error('Ошибка получения сообщений:', error);
            return [];
        }
    }

    // Хеширование пароля
    hashPassword(password) {
        // Простое хеширование для демонстрации
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

    // Получение настроек
    getSettings() {
        try {
            const data = this.loadData();
            return data ? data.settings : {};
        } catch (error) {
            console.error('Ошибка получения настроек:', error);
            return {};
        }
    }

    // Обновление настроек
    updateSettings(newSettings) {
        try {
            const data = this.loadData();
            if (!data) return { success: false };

            data.settings = { ...data.settings, ...newSettings };
            this.saveData(data);
            return { success: true };
        } catch (error) {
            console.error('Ошибка обновления настроек:', error);
            return { success: false };
        }
    }

    // Получение статистики
    getStats() {
        try {
            const data = this.loadData();
            if (!data) return { projects: 0, users: 0, messages: 0 };

            return {
                projects: data.projects.length,
                users: data.users.filter(u => u.isActive).length,
                messages: data.messages.filter(m => !m.read).length
            };
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            return { projects: 0, users: 0, messages: 0 };
        }
    }
}

// Глобальный экземпляр базы данных
window.db = new NotFoundDatabase();

// Для отладки
console.log('База данных 404 | NotFound инициализирована:', window.db);
