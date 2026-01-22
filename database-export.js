// Утилита для экспорта/импорта базы данных в файл database.db

class DatabaseExporter {
    constructor() {
        this.sqlite = window.db?.sqlite;
        if (!this.sqlite) {
            console.error('База данных не инициализирована');
        }
    }

    // Экспорт базы данных в файл
    async exportToFile() {
        try {
            const data = await this.sqlite.exportDatabase();
            
            // Создаем Blob с данными
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            
            // Создаем ссылку для скачивания
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'database.db';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('База данных экспортирована в файл database.db');
            return true;
        } catch (error) {
            console.error('Ошибка экспорта базы данных:', error);
            return false;
        }
    }

    // Импорт базы данных из файла
    async importFromFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            await this.sqlite.importDatabase(data);
            
            console.log('База данных импортирована из файла');
            location.reload(); // Перезагружаем страницу для обновления данных
            return true;
        } catch (error) {
            console.error('Ошибка импорта базы данных:', error);
            return false;
        }
    }

    // Создание интерфейса для управления экспортом/импортом
    createExportInterface() {
        const container = document.createElement('div');
        container.className = 'database-export-panel';
        container.innerHTML = `
            <h3>Управление базой данных</h3>
            <div class="export-controls">
                <button id="exportBtn" class="btn btn-primary">
                    <i class="fas fa-download"></i> Экспортировать базу данных
                </button>
                <div class="import-control">
                    <label for="importFile" class="btn btn-secondary">
                        <i class="fas fa-upload"></i> Импортировать базу данных
                    </label>
                    <input type="file" id="importFile" accept=".db,.json" style="display: none;">
                </div>
            </div>
            <div class="database-info">
                <p>База данных хранится в браузере и эмулирует SQLite файл.</p>
                <p>Вы можете экспортировать данные в файл database.db и импортировать их позже.</p>
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
            max-width: 300px;
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
}

// Добавляем кнопку для управления базой данных в админ-панель
function addDatabaseExportButton() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        button.innerHTML = '<i class="fas fa-database"></i> Управление БД';
        button.onclick = () => {
            const exporter = new DatabaseExporter();
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
    // Добавляем кнопку управления базой данных
    setTimeout(() => {
        addDatabaseExportButton();
    }, 1000);
});

// Глобальная функция для экспорта базы данных
window.exportDatabase = async function() {
    const exporter = new DatabaseExporter();
    await exporter.exportToFile();
};

// Глобальная функция для импорта базы данных
window.importDatabase = async function(file) {
    const exporter = new DatabaseExporter();
    await exporter.importFromFile(file);
};
