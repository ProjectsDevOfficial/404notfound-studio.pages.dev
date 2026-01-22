// Утилита для очистки базы данных при ошибках

function clearDatabase() {
    console.log('Clearing database...');
    
    // Удаляем IndexedDB базу данных
    const deleteRequest = indexedDB.deleteDatabase('NotFoundStudioDB');
    
    deleteRequest.onsuccess = () => {
        console.log('Database cleared successfully');
        alert('База данных очищена. Перезагрузите страницу.');
    };
    
    deleteRequest.onerror = () => {
        console.error('Error clearing database:', deleteRequest.error);
        alert('Ошибка при очистке базы данных');
    };
    
    deleteRequest.onblocked = () => {
        console.log('Database clear blocked - close other tabs');
        alert('Закройте другие вкладки с этим сайтом и попробуйте снова');
    };
}

// Добавляем кнопку очистки на страницу для отладки
function addClearButton() {
    const button = document.createElement('button');
    button.textContent = 'Очистить базу данных';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #f44336;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        cursor: pointer;
        z-index: 10000;
        font-size: 12px;
    `;
    button.onclick = clearDatabase;
    document.body.appendChild(button);
}

// Добавляем кнопку если в режиме разработки
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    addClearButton();
}

// Глобальная функция
window.clearDatabase = clearDatabase;
