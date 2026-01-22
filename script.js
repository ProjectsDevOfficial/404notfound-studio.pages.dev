// Database initialization and management
class DatabaseManager {
    constructor() {
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        try {
            // Initialize SQLite database
            this.db = await this.openDatabase();
            await this.createTables();
            await this.createDefaultAdmin();
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
        }
    }

    async openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('NotFoundStudioDB', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create users table
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('username', 'username', { unique: true });
                }
                
                // Create projects table
                if (!db.objectStoreNames.contains('projects')) {
                    const projectStore = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
                    projectStore.createIndex('title', 'title', { unique: false });
                }
                
                // Create messages table
                if (!db.objectStoreNames.contains('messages')) {
                    db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    async createTables() {
        // Tables are created in onupgradeneeded event
        console.log('Database tables ready');
    }

    async createDefaultAdmin() {
        try {
            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const users = request.result;
                if (users.length === 0) {
                    // Create default admin user
                    const adminUser = {
                        username: 'admin',
                        password: 'admin123', // In production, this should be hashed
                        role: 'admin',
                        createdAt: new Date().toISOString()
                    };
                    
                    const addRequest = store.add(adminUser);
                    addRequest.onsuccess = () => {
                        console.log('Default admin user created');
                    };
                }
            };
        } catch (error) {
            console.error('Error creating default admin:', error);
        }
    }

    async authenticateUser(username, password) {
        try {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const index = store.index('username');
            const request = index.get(username);
            
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    const user = request.result;
                    if (user && user.password === password) {
                        resolve({ success: true, user });
                    } else {
                        resolve({ success: false, error: 'Invalid credentials' });
                    }
                };
                
                request.onerror = () => {
                    resolve({ success: false, error: 'Authentication failed' });
                };
            });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async addProject(projectData) {
        try {
            const transaction = this.db.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');
            
            const project = {
                ...projectData,
                createdAt: new Date().toISOString()
            };
            
            const request = store.add(project);
            
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    resolve({ success: true, id: request.result });
                };
                
                request.onerror = () => {
                    resolve({ success: false, error: 'Failed to add project' });
                };
            });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getAllProjects() {
        try {
            const transaction = this.db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const request = store.getAll();
            
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    resolve({ success: true, projects: request.result });
                };
                
                request.onerror = () => {
                    resolve({ success: false, error: 'Failed to fetch projects' });
                };
            });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getAllUsers() {
        try {
            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.getAll();
            
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    resolve({ success: true, users: request.result });
                };
                
                request.onerror = () => {
                    resolve({ success: false, error: 'Failed to fetch users' });
                };
            });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async addMessage(messageData) {
        try {
            const transaction = this.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            
            const message = {
                ...messageData,
                createdAt: new Date().toISOString()
            };
            
            const request = store.add(message);
            
            return new Promise((resolve) => {
                request.onsuccess = () => {
                    resolve({ success: true, id: request.result });
                };
                
                request.onerror = () => {
                    resolve({ success: false, error: 'Failed to add message' });
                };
            });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Application state and UI management
class NotFoundStudio {
    constructor() {
        this.db = new DatabaseManager();
        this.currentUser = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.loadProjects();
        this.updateStats();
        this.checkAuthState();
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

        // Login modal
        const loginBtn = document.getElementById('loginBtn');
        const loginModal = document.getElementById('loginModal');
        const closeBtn = document.querySelector('.close');

        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'block';
        });

        closeBtn.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
            }
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Contact form
        document.getElementById('contactForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleContactForm();
        });

        // Admin panel
        document.getElementById('closeAdminPanel').addEventListener('click', () => {
            document.getElementById('adminPanel').style.display = 'none';
        });

        document.getElementById('addProjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddProject();
        });
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async handleLogin() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const errorElement = document.getElementById('loginError');

        const result = await this.db.authenticateUser(username, password);
        
        if (result.success) {
            this.currentUser = result.user;
            this.updateUIForLoggedInUser();
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('loginForm').reset();
            errorElement.textContent = '';
            
            // Show admin panel for admin user
            if (result.user.role === 'admin') {
                document.getElementById('adminPanel').style.display = 'block';
                this.loadUsers();
            }
        } else {
            errorElement.textContent = result.error;
        }
    }

    handleLogout() {
        this.currentUser = null;
        this.updateUIForLoggedOutUser();
        document.getElementById('adminPanel').style.display = 'none';
    }

    updateUIForLoggedInUser() {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('userMenu').style.display = 'flex';
        document.getElementById('username').textContent = this.currentUser.username;
    }

    updateUIForLoggedOutUser() {
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('userMenu').style.display = 'none';
    }

    checkAuthState() {
        // In a real application, you'd check for stored session/token
        // For now, we'll just show the logged out state
        this.updateUIForLoggedOutUser();
    }

    async loadProjects() {
        const result = await this.db.getAllProjects();
        
        if (result.success) {
            this.displayProjects(result.projects);
        }
    }

    displayProjects(projects) {
        const projectsGrid = document.getElementById('projectsGrid');
        
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
                <h3 class="project-title">${project.title}</h3>
                <p class="project-description">${project.description}</p>
                <div class="project-tech">
                    ${project.tech.split(',').map(tech => `<span class="tech-tag">${tech.trim()}</span>`).join('')}
                </div>
            </div>
        `).join('');
    }

    async handleAddProject() {
        const title = document.getElementById('projectTitle').value;
        const description = document.getElementById('projectDescription').value;
        const tech = document.getElementById('projectTech').value;

        const result = await this.db.addProject({ title, description, tech });
        
        if (result.success) {
            document.getElementById('addProjectForm').reset();
            this.loadProjects();
            this.updateStats();
        } else {
            alert('Ошибка при добавлении проекта: ' + result.error);
        }
    }

    async loadUsers() {
        const result = await this.db.getAllUsers();
        
        if (result.success) {
            this.displayUsers(result.users);
        }
    }

    displayUsers(users) {
        const usersList = document.getElementById('usersList');
        
        usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <span>${user.username}</span>
                <span class="user-role">${user.role}</span>
            </div>
        `).join('');
    }

    async handleContactForm() {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const message = document.getElementById('message').value;

        const result = await this.db.addMessage({ name, email, message });
        
        if (result.success) {
            document.getElementById('contactForm').reset();
            alert('Сообщение отправлено! Мы свяжемся с вами в ближайшее время.');
        } else {
            alert('Ошибка при отправке сообщения: ' + result.error);
        }
    }

    async updateStats() {
        const projectsResult = await this.db.getAllProjects();
        const usersResult = await this.db.getAllUsers();
        
        if (projectsResult.success) {
            document.getElementById('projectCount').textContent = projectsResult.projects.length;
        }
        
        if (usersResult.success) {
            document.getElementById('userCount').textContent = usersResult.users.length;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NotFoundStudio();
});

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
