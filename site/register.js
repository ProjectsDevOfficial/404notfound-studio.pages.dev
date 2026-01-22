// JavaScript для страницы регистрации

class RegisterPage {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Форма регистрации
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
    }

    async handleRegister() {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const avatar = document.getElementById('avatar').value || '👤';
        
        const errorElement = document.getElementById('registerError');
        const successElement = document.getElementById('registerSuccess');
        const registerBtn = document.getElementById('registerBtn');

        // Валидация
        if (password.length < 6) {
            errorElement.textContent = 'Пароль должен содержать минимум 6 символов';
            return;
        }

        if (password !== confirmPassword) {
            errorElement.textContent = 'Пароли не совпадают';
            return;
        }

        // Показать загрузку
        registerBtn.disabled = true;
        registerBtn.textContent = 'Регистрация...';
        errorElement.textContent = '';
        successElement.textContent = '';

        try {
            const result = await window.db.registerUser({
                name,
                email,
                password,
                avatar
            });
            
            if (result.success) {
                successElement.textContent = 'Регистрация успешна! Перенаправляем на страницу входа...';
                document.getElementById('registerForm').reset();
                
                // Перенаправляем на страницу входа через 2 секунды
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                errorElement.textContent = result.error;
            }
        } catch (error) {
            errorElement.textContent = 'Произошла ошибка при регистрации';
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Зарегистрироваться';
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

function toggleConfirmPassword() {
    const passwordInput = document.getElementById('confirmPassword');
    const passwordIcon = document.getElementById('confirmPasswordIcon');
    
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

// Инициализация страницы
document.addEventListener('DOMContentLoaded', () => {
    new RegisterPage();
});
