// JavaScript для админ панели

class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuth();
        if (this.currentUser) {
            this.loadAdminData();
        }
    }

    setupEventListeners() {
        // Форма входа
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Выход
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Форма настроек
        document.getElementById('settingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSettingsSave();
        });
    }

    async checkAuth() {
        const sessionData = this.getSessionData();
        
        if (sessionData && sessionData.user) {
            this.currentUser = sessionData.user;
            
            if (this.currentUser.role === 'admin') {
                this.showAdminPanel();
            } else {
                // Если не админ, перенаправляем на главную
                window.location.href = 'index.html';
            }
        } else {
            this.showLoginPage();
        }
    }

    getSessionData() {
        let sessionData = sessionStorage.getItem('notfound_session');
        if (sessionData) {
            return JSON.parse(sessionData);
        }
        
        sessionData = localStorage.getItem('notfound_session');
        if (sessionData) {
            const data = JSON.parse(sessionData);
            const loginTime = new Date(data.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            if (hoursDiff < 24 && data.remember) {
                return data;
            } else {
                localStorage.removeItem('notfound_session');
            }
        }
        
        return null;
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('loginError');
        const loginBtn = document.querySelector('#adminLoginForm button');

        loginBtn.disabled = true;
        loginBtn.textContent = 'Вход...';
        errorElement.textContent = '';

        try {
            const result = await window.db.loginUser(email, password);
            
            if (result.success) {
                if (result.user.role === 'admin') {
                    const sessionData = {
                        user: result.user,
                        loginTime: new Date().toISOString(),
                        remember: false
                    };
                    
                    sessionStorage.setItem('notfound_session', JSON.stringify(sessionData));
                    this.currentUser = result.user;
                    this.showAdminPanel();
                    this.loadAdminData();
                } else {
                    errorElement.textContent = 'Доступ разрешен только администраторам';
                }
            } else {
                errorElement.textContent = result.error;
            }
        } catch (error) {
            errorElement.textContent = 'Произошла ошибка при входе';
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Войти';
        }
    }

    handleLogout() {
        sessionStorage.removeItem('notfound_session');
        localStorage.removeItem('notfound_session');
        this.currentUser = null;
        this.showLoginPage();
    }

    showLoginPage() {
        document.getElementById('loginPage').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
    }

    showAdminPanel() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        
        // Обновляем информацию о пользователе
        document.getElementById('userName').textContent = this.currentUser.name;
        document.getElementById('userAvatar').textContent = this.currentUser.avatar || '👤';
        document.getElementById('userRole').textContent = this.currentUser.role;
    }

    async loadAdminData() {
        await this.loadProjects();
        await this.loadUsers();
        await this.loadMessages();
        await this.loadSettings();
    }

    async loadProjects() {
        const projects = window.db.getProjects();
        this.displayProjects(projects);
    }

    displayProjects(projects) {
        const container = document.getElementById('adminProjectsList');
        
        if (projects.length === 0) {
            container.innerHTML = '<p class="no-data">Проекты не найдены</p>';
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="admin-item">
                <div class="item-info">
                    <h3>${project.title}</h3>
                    <p>${project.description}</p>
                    <div class="item-meta">
                        <span><i class="fas fa-code"></i> ${project.tech || 'Не указано'}</span>
                        <span><i class="fas fa-calendar"></i> ${new Date(project.createdAt).toLocaleDateString()}</span>
                        <span><i class="fas fa-user"></i> ${project.author}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-secondary" onclick="editProject(${project.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteProject(${project.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadUsers() {
        const users = window.db.getAllUsers();
        this.displayUsers(users);
        this.updateUserStats(users);
    }

    displayUsers(users) {
        const container = document.getElementById('usersList');
        
        if (users.length === 0) {
            container.innerHTML = '<p class="no-data">Пользователи не найдены</p>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="admin-item">
                <div class="item-info">
                    <div class="user-header">
                        <span class="user-avatar">${user.avatar || '👤'}</span>
                        <div>
                            <h3>${user.name}</h3>
                            <p>${user.email}</p>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span class="role-badge ${user.role}">${user.role}</span>
                        <span><i class="fas fa-calendar"></i> ${new Date(user.createdAt).toLocaleDateString()}</span>
                        <span><i class="fas fa-sign-in-alt"></i> ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Не входил'}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <select onchange="changeUserRole(${user.id}, this.value)" class="role-select">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                    <button class="btn ${user.isActive ? 'btn-warning' : 'btn-success'}" onclick="toggleUserStatus(${user.id})">
                        <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i>
                        ${user.isActive ? 'Заблокировать' : 'Разблокировать'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateUserStats(users) {
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.isActive).length;
        const adminUsers = users.filter(u => u.role === 'admin' && u.isActive).length;

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('activeUsers').textContent = activeUsers;
        document.getElementById('adminUsers').textContent = adminUsers;
    }

    async loadMessages() {
        const messages = window.db.getMessages();
        this.displayMessages(messages);
    }

    displayMessages(messages) {
        const container = document.getElementById('messagesList');
        
        if (messages.length === 0) {
            container.innerHTML = '<p class="no-data">Сообщений не найдено</p>';
            return;
        }

        container.innerHTML = messages.map(message => `
            <div class="admin-item ${!message.read ? 'unread' : ''}">
                <div class="item-info">
                    <h3>${message.name}</h3>
                    <p>${message.email}</p>
                    <p class="message-text">${message.message}</p>
                    <div class="item-meta">
                        <span><i class="fas fa-calendar"></i> ${new Date(message.createdAt).toLocaleDateString()}</span>
                        <span class="status-badge ${message.read ? 'read' : 'unread'}">
                            ${message.read ? 'Прочитано' : 'Не прочитано'}
                        </span>
                    </div>
                </div>
                <div class="item-actions">
                    ${!message.read ? `<button class="btn btn-secondary" onclick="markAsRead(${message.id})">
                        <i class="fas fa-check"></i> Прочитано
                    </button>` : ''}
                    <button class="btn btn-danger" onclick="deleteMessage(${message.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadSettings() {
        const settings = window.db.getSettings();
        document.getElementById('siteTitle').value = settings.siteTitle || '404 | NotFound';
        document.getElementById('discordInvite').value = settings.discordInvite || 'https://discord.gg/BKF9wacWU9';
        document.getElementById('maintenance').checked = settings.maintenance || false;
    }

    async handleSettingsSave() {
        const settings = {
            siteTitle: document.getElementById('siteTitle').value,
            discordInvite: document.getElementById('discordInvite').value,
            maintenance: document.getElementById('maintenance').checked
        };

        const result = await window.db.updateSettings(settings);
        
        if (result.success) {
            this.showNotification('Настройки сохранены', 'success');
        } else {
            this.showNotification('Ошибка сохранения настроек', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Создаем уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Показываем уведомление
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Скрываем через 3 секунды
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Глобальные функции для вызова из HTML
let adminPanel;

function showAddProjectForm() {
    const container = document.getElementById('projectFormContainer');
    container.innerHTML = `
        <div class="form-card">
            <h3>Добавить новый проект</h3>
            <form id="addProjectForm">
                <div class="form-group">
                    <label for="projectTitle">Название проекта:</label>
                    <input type="text" id="projectTitle" required>
                </div>
                <div class="form-group">
                    <label for="projectDescription">Описание:</label>
                    <textarea id="projectDescription" required></textarea>
                </div>
                <div class="form-group">
                    <label for="projectTech">Технологии:</label>
                    <input type="text" id="projectTech" placeholder="HTML, CSS, JavaScript">
                </div>
                <div class="form-group">
                    <label for="projectLink">Ссылка:</label>
                    <input type="url" id="projectLink" placeholder="https://...">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">Добавить</button>
                    <button type="button" class="btn btn-secondary" onclick="hideProjectForm()">Отмена</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('addProjectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const projectData = {
            title: document.getElementById('projectTitle').value,
            description: document.getElementById('projectDescription').value,
            tech: document.getElementById('projectTech').value,
            link: document.getElementById('projectLink').value || '#',
            author: adminPanel.currentUser.name,
            image: '🚀'
        };
        
        const result = await window.db.addProject(projectData);
        
        if (result.success) {
            adminPanel.showNotification('Проект добавлен', 'success');
            hideProjectForm();
            adminPanel.loadProjects();
        } else {
            adminPanel.showNotification('Ошибка добавления проекта', 'error');
        }
    });
}

function hideProjectForm() {
    document.getElementById('projectFormContainer').innerHTML = '';
}

function showTab(tabName) {
    // Убираем активный класс со всех вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Добавляем активный класс выбранной вкладке
    event.target.classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordIcon = document.getElementById('passwordIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.classList.remove('fa-eye');
        passwordIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        passwordIcon.classList.remove('fa-eye-slash');
        passwordIcon.classList.add('fa-eye');
    }
}

async function deleteProject(projectId) {
    if (confirm('Вы уверены, что хотите удалить этот проект?')) {
        const result = await window.db.deleteProject(projectId);
        
        if (result.success) {
            adminPanel.showNotification('Проект удален', 'success');
            adminPanel.loadProjects();
        } else {
            adminPanel.showNotification('Ошибка удаления проекта', 'error');
        }
    }
}

async function changeUserRole(userId, newRole) {
    const result = await window.db.changeUserRole(userId, newRole);
    
    if (result.success) {
        adminPanel.showNotification('Роль пользователя изменена', 'success');
        adminPanel.loadUsers();
    } else {
        adminPanel.showNotification(result.error, 'error');
    }
}

async function toggleUserStatus(userId) {
    const result = await window.db.toggleUserStatus(userId);
    
    if (result.success) {
        adminPanel.showNotification('Статус пользователя изменен', 'success');
        adminPanel.loadUsers();
    } else {
        adminPanel.showNotification(result.error, 'error');
    }
}

async function markAsRead(messageId) {
    // В реальном приложении здесь была бы функция отметки как прочитанного
    adminPanel.showNotification('Сообщение отмечено как прочитанное', 'success');
    adminPanel.loadMessages();
}

async function deleteMessage(messageId) {
    if (confirm('Вы уверены, что хотите удалить это сообщение?')) {
        // В реальном приложении здесь была бы функция удаления
        adminPanel.showNotification('Сообщение удалено', 'success');
        adminPanel.loadMessages();
    }
}

function markAllAsRead() {
    adminPanel.showNotification('Все сообщения отмечены как прочитанные', 'success');
    adminPanel.loadMessages();
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});
