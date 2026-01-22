// JavaScript для страницы входа

class LoginPage {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Форма входа
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Форма восстановления пароля
        document.getElementById('resetForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordReset();
        });

        // Закрытие модального окна при клике вне его
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('resetModal');
            if (e.target === modal) {
                this.closeResetModal();
            }
        });
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        const errorElement = document.getElementById('loginError');
        const loginBtn = document.getElementById('loginBtn');

        // Показать загрузку
        loginBtn.disabled = true;
        loginBtn.textContent = 'Вход...';
        errorElement.textContent = '';

        try {
            const result = await window.db.loginUser(email, password);
            
            if (result.success) {
                // Сохраняем сессию
                const sessionData = {
                    user: result.user,
                    loginTime: new Date().toISOString(),
                    remember: remember
                };
                
                if (remember) {
                    localStorage.setItem('notfound_session', JSON.stringify(sessionData));
                } else {
                    sessionStorage.setItem('notfound_session', JSON.stringify(sessionData));
                }

                // Перенаправляем в админ-панель или на главную
                if (result.user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
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

    async handlePasswordReset() {
        const email = document.getElementById('resetEmail').value;
        const errorElement = document.getElementById('resetError');
        const successElement = document.getElementById('resetSuccess');
        const resetBtn = document.querySelector('#resetForm button');

        // Показать загрузку
        resetBtn.disabled = true;
        resetBtn.textContent = 'Отправка...';
        errorElement.textContent = '';
        successElement.textContent = '';

        try {
            // Проверяем существование пользователя
            const users = await window.db.getAllUsers();
            const user = users.find(u => u.email === email);

            if (user) {
                // В реальном приложении здесь была бы отправка email
                // Для демонстрации просто показываем успех
                successElement.textContent = 'Инструкции по восстановлению пароля отправлены на ваш email';
                document.getElementById('resetForm').reset();
                
                // Закрываем модальное окно через 3 секунды
                setTimeout(() => {
                    this.closeResetModal();
                }, 3000);
            } else {
                errorElement.textContent = 'Пользователь с таким email не найден';
            }
        } catch (error) {
            errorElement.textContent = 'Произошла ошибка при восстановлении пароля';
        } finally {
            resetBtn.disabled = false;
            resetBtn.textContent = 'Отправить инструкции';
        }
    }

    checkAuth() {
        // Проверяем, авторизован ли пользователь
        const sessionData = this.getSessionData();
        
        if (sessionData && sessionData.user) {
            // Перенаправляем в зависимости от роли
            if (sessionData.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }
    }

    getSessionData() {
        // Сначала проверяем sessionStorage, затем localStorage
        let sessionData = sessionStorage.getItem('notfound_session');
        if (sessionData) {
            return JSON.parse(sessionData);
        }
        
        sessionData = localStorage.getItem('notfound_session');
        if (sessionData) {
            const data = JSON.parse(sessionData);
            // Проверяем, не истекла ли сессия (24 часа)
            const loginTime = new Date(data.loginTime);
            const now = new Date();
            const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
            
            if (hoursDiff < 24 && data.remember) {
                return data;
            } else {
                // Удаляем просроченную сессию
                localStorage.removeItem('notfound_session');
            }
        }
        
        return null;
    }
}

// Функции для глобального доступа
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

function showPasswordReset() {
    document.getElementById('resetModal').style.display = 'block';
}

function closeResetModal() {
    document.getElementById('resetModal').style.display = 'none';
    document.getElementById('resetError').textContent = '';
    document.getElementById('resetSuccess').textContent = '';
    document.getElementById('resetForm').reset();
}

// Инициализация страницы
document.addEventListener('DOMContentLoaded', () => {
    new LoginPage();
});
