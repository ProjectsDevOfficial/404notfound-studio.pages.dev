// Экспорт/импорт для файловой базы данных

class FileDatabaseExporter {
    constructor() {
        this.db = window.db;
        if (!this.db) {
            console.error('База данных не инициализирована');
        }
    }

    // Экспорт базы данных в файл database.db
    async exportToFile() {
        try {
            const success = this.db.exportDatabaseFile();
            
            if (success) {
                this.showNotification('База данных экспортирована в файл database.db', 'success');
            } else {
                this.showNotification('Ошибка экспорта базы данных', 'error');
            }
            
            return success;
        } catch (error) {
            console.error('Ошибка экспорта базы данных:', error);
            this.showNotification('Ошибка экспорта: ' + error.message, 'error');
            return false;
        }
    }

    // Импорт базы данных из файла
    async importFromFile(file) {
        try {
            if (!confirm('Импорт заменит все текущие данные. Продолжить?')) {
                return false;
            }
            
            const result = await this.db.importFromFile(file);
            
            if (result.success) {
                this.showNotification('База данных успешно импортирована! Перезагрузка...', 'success');
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                this.showNotification('Ошибка импорта: ' + result.error, 'error');
            }
            
            return result.success;
        } catch (error) {
            console.error('Ошибка импорта базы данных:', error);
            this.showNotification('Ошибка импорта: ' + error.message, 'error');
            return false;
        }
    }

    // Показать уведомление
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Создание интерфейса для управления базой данных
    createExportInterface() {
        const container = document.createElement('div');
        container.className = 'database-export-panel';
        container.innerHTML = `
            <h3>Управление базой данных</h3>
            <div class="export-controls">
                <button id="exportBtn" class="btn btn-primary">
                    <i class="fas fa-download"></i> Экспортировать database.db
                </button>
                <div class="import-control">
                    <label for="importFile" class="btn btn-secondary">
                        <i class="fas fa-upload"></i> Импортировать database.db
                    </label>
                    <input type="file" id="importFile" accept=".db,.json,.sql" style="display: none;">
                </div>
            </div>
            <div class="database-info">
                <p><strong>Реальная база данных SQLite</strong></p>
                <p>Данные сохраняются в файл database.db</p>
                <p>Файл содержит настоящие SQL таблицы</p>
                <p><strong>Внимание:</strong> Импорт заменит все текущие данные!</p>
            </div>
            <div class="database-stats">
                <h4>Статистика базы данных:</h4>
                <div id="dbStats">Загрузка...</div>
            </div>
        `;

        // Добавляем стили
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            max-width: 350px;
        `;

        // Обработчики событий
        container.querySelector('#exportBtn').addEventListener('click', () => {
            this.exportToFile();
        });

        container.querySelector('#importFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importFromFile(file);
            }
        });

        // Загружаем статистику
        this.loadStats(container);

        // Кнопка закрытия
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        `;
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(container);
        });

        container.appendChild(closeBtn);
        document.body.appendChild(container);

        return container;
    }

    // Загрузка статистики
    async loadStats(container) {
        try {
            const stats = await this.db.getStats();
            const statsDiv = container.querySelector('#dbStats');
            
            statsDiv.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; margin-top: 1rem;">
                    <div style="text-align: center; padding: 0.5rem; background: #f8f9fa; border-radius: 6px;">
                        <div style="font-weight: bold; color: #667eea;">${stats.projects}</div>
                        <div style="font-size: 0.8rem; color: #666;">Проектов</div>
                    </div>
                    <div style="text-align: center; padding: 0.5rem; background: #f8f9fa; border-radius: 6px;">
                        <div style="font-weight: bold; color: #667eea;">${stats.users}</div>
                        <div style="font-size: 0.8rem; color: #666;">Пользователей</div>
                    </div>
                    <div style="text-align: center; padding: 0.5rem; background: #f8f9fa; border-radius: 6px;">
                        <div style="font-weight: bold; color: #667eea;">${stats.messages}</div>
                        <div style="font-size: 0.8rem; color: #666;">Сообщений</div>
                    </div>
                </div>
            `;
        } catch (error) {
            container.querySelector('#dbStats').innerHTML = '<p style="color: #e74c3c;">Ошибка загрузки статистики</p>';
        }
    }
}

// Добавляем кнопку для управления базой данных в админ-панель
function addDatabaseExportButton() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        button.innerHTML = '<i class="fas fa-database"></i> Управление БД';
        button.onclick = () => {
            const exporter = new FileDatabaseExporter();
            exporter.createExportInterface();
        };
        
        // Добавляем кнопку в навигацию админ-панели
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            navActions.appendChild(button);
        }
    }
}

// Инициализация после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        addDatabaseExportButton();
    }, 1000);
});

// Глобальные функции
window.exportDatabase = async function() {
    const exporter = new FileDatabaseExporter();
    await exporter.exportToFile();
};

window.importDatabase = async function(file) {
    const exporter = new FileDatabaseExporter();
    await exporter.importFromFile(file);
};
