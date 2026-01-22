// JavaScript для главной страницы

class NotFoundStudio {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuth();
        this.loadProjects();
        this.updateStats();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('href').substring(1);
                this.scrollToSection(target);
            });
        });

        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Contact form
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleContactForm();
            });
        }

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Add scroll effect to navbar
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            }
        });
    }

    async checkAuth() {
        const sessionData = this.getSessionData();
        
        if (sessionData && sessionData.user) {
            this.currentUser = sessionData.user;
            this.updateUIForLoggedInUser();
        } else {
            this.updateUIForLoggedOutUser();
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

    handleLogout() {
        sessionStorage.removeItem('notfound_session');
        localStorage.removeItem('notfound_session');
        this.currentUser = null;
        this.updateUIForLoggedOutUser();
    }

    updateUIForLoggedInUser() {
        const loginBtn = document.getElementById('loginBtn');
        const userMenu = document.getElementById('userMenu');
        const username = document.getElementById('username');

        if (loginBtn) loginBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (username) username.textContent = this.currentUser.name;

        // Добавляем ссылку на админ-панель для администраторов
        if (this.currentUser.role === 'admin') {
            const navMenu = document.querySelector('.nav-menu');
            if (navMenu && !document.getElementById('adminLink')) {
                const adminLink = document.createElement('a');
                adminLink.id = 'adminLink';
                adminLink.href = 'admin.html';
                adminLink.className = 'nav-link';
                adminLink.textContent = 'Админ-панель';
                navMenu.appendChild(adminLink);
            }
        }
    }

    updateUIForLoggedOutUser() {
        const loginBtn = document.getElementById('loginBtn');
        const userMenu = document.getElementById('userMenu');
        const adminLink = document.getElementById('adminLink');

        if (loginBtn) loginBtn.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
        if (adminLink) adminLink.remove();
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async loadProjects() {
        const projects = window.db.getProjects();
        this.displayProjects(projects);
    }

    displayProjects(projects) {
        const projectsGrid = document.getElementById('projectsGrid');
        
        if (!projectsGrid) return;
        
        if (projects.length === 0) {
            projectsGrid.innerHTML = `
                <div class="project-card">
                    <h3 class="project-title">Проекты в разработке</h3>
                    <p class="project-description">Мы работаем над созданием удивительных проектов. Скоро здесь появятся наши первые работы!</p>
                    <div class="project-tech">
                        <span class="tech-tag">Coming Soon</span>
                    </div>
                </div>
            `;
            return;
        }

        projectsGrid.innerHTML = projects.map(project => `
            <div class="project-card">
                <div class="project-header">
                    <span class="project-emoji">${project.image || '🚀'}</span>
                    <h3 class="project-title">${project.title}</h3>
                </div>
                <p class="project-description">${project.description}</p>
                <div class="project-meta">
                    <span class="project-author"><i class="fas fa-user"></i> ${project.author}</span>
                    <span class="project-date"><i class="fas fa-calendar"></i> ${new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="project-tech">
                    ${(project.tech || 'Не указано').split(',').map(tech => `<span class="tech-tag">${tech.trim()}</span>`).join('')}
                </div>
                ${project.link && project.link !== '#' ? `
                    <div class="project-link">
                        <a href="${project.link}" target="_blank" class="btn btn-secondary">
                            <i class="fas fa-external-link-alt"></i> Посмотреть
                        </a>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    async handleContactForm() {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        const result = await window.db.addMessage({ name, email, message });
        
        if (result.success) {
            document.getElementById('contactForm').reset();
            this.showNotification('Сообщение отправлено! Мы свяжемся с вами в ближайшее время.', 'success');
        } else {
            this.showNotification('Ошибка при отправке сообщения: ' + result.error, 'error');
        }
    }

    async updateStats() {
        const stats = window.db.getStats();
        
        const projectCount = document.getElementById('projectCount');
        const userCount = document.getElementById('userCount');
        
        if (projectCount) projectCount.textContent = stats.projects;
        if (userCount) userCount.textContent = stats.users;
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
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new NotFoundStudio();
});
