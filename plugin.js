(function () {  
    'use strict';  
  
    // Конфігурація джерел  
    const SOURCES = [  
        { id: 'tmdb', title: 'TMDB' },  
        { id: 'cub', title: 'CUB' },  
        { id: 'trakt', title: 'TRAKT' }  
    ];  
  
    const STORAGE_KEY = 'source_switcher_selected';  
    const BUTTON_CLASS = 'source-switcher-btn';  
  
    // Функції роботи з налаштуваннями  
    function getSelected() {  
        return Lampa.Storage.get(STORAGE_KEY, 'tmdb');  
    }  
  
    function setSelected(id) {  
        Lampa.Storage.set(STORAGE_KEY, id);  
    }  
  
    // Показ меню вибору джерела  
    function showMenu() {  
        const selected = getSelected();  
  
        const items = SOURCES.map(src => ({  
            title: (src.id === selected ? '✔️ ' : '') + src.title,  
            source_id: src.id  
        }));  
  
        Lampa.Select.show({  
            title: 'Перемикач джерел',  
            items,  
            onSelect(item) {  
                setSelected(item.source_id);  
                Lampa.Noty.show('Джерело: ' + item.title.replace('✔️ ', ''));  
                // Оновлюємо кнопку для відображення нового стану  
                updateButton();  
            }  
        });  
    }  
  
    // Створення кнопки  
    function createButton() {  
        const btn = document.createElement('div');  
        btn.className = `head__action ${BUTTON_CLASS}`;  
        btn.innerHTML = `  
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">  
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.65-.07-.97l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.08-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.32-.07.64-.07.97c0 .33.03.65.07.97l-2.11 1.63c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.39 1.06.73 1.69.98l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.25 1.17-.59 1.69-.98l2.49 1c.22.08.49 0 .61-.22l2-3.46c.13-.22.07-.49-.12-.64l-2.11-1.63Z"/>  
            </svg>  
        `;  
        btn.addEventListener('click', showMenu);  
        return btn;  
    }  
  
    // Оновлення кнопки (зміна іконки при виборі)  
    function updateButton() {  
        const btn = document.querySelector(`.${BUTTON_CLASS}`);  
        if (btn) {  
            const selected = getSelected();  
            // Можна додати візуальну індикацію обраного джерела  
            btn.style.opacity = selected === 'tmdb' ? '1' : '0.8';  
        }  
    }  
  
    // Додавання кнопки до інтерфейсу  
    function addButton() {  
        console.log('[Source Switcher] Спроба додати кнопку...');  
          
        // Перевіряємо чи кнопка вже існує  
        if (document.querySelector(`.${BUTTON_CLASS}`)) {  
            console.log('[Source Switcher] Кнопка вже існує');  
            return;  
        }  
  
        // Знаходимо заголовок та праву частину  
        const header = document.querySelector('.head');  
        if (!header) {  
            console.log('[Source Switcher] Заголовок .head не знайдено');  
            return;  
        }  
  
        const actions = header.querySelector('.head__actions');  
        if (!actions) {  
            console.log('[Source Switcher] Контейнер .head__actions не знайдено');  
            return;  
        }  
  
        // Створюємо та додаємо кнопку  
        const btn = createButton();  
        actions.prepend(btn);  
        console.log('[Source Switcher] Кнопку успішно додано!');  
        updateButton();  
    }  
  
    // Багаторазові спроби додавання кнопки  
    function tryAddButton() {  
        const attempts = [0, 100, 500, 1000, 2000];  
          
        attempts.forEach(delay => {  
            setTimeout(() => {  
                addButton();  
            }, delay);  
        });  
    }  
  
    // Ініціалізація плагіна  
    function init() {  
        console.log('[Source Switcher] Ініціалізація плагіна...');  
          
        // Слухач подій Lampa  
        if (typeof Lampa !== 'undefined' && Lampa.Listener) {  
            Lampa.Listener.follow('full', function (event) {  
                if (event.type === 'render') {  
                    setTimeout(addButton, 100);  
                }  
            });  
  
            Lampa.Listener.follow('app', function (event) {  
                if (event.type === 'ready') {  
                    setTimeout(addButton, 200);  
                }  
            });  
        }  
  
        // Додаткові спроби  
        tryAddButton();  
          
        // Спроба при повному завантаженні DOM  
        if (document.readyState === 'loading') {  
            document.addEventListener('DOMContentLoaded', () => tryAddButton());  
        } else {  
            tryAddButton();  
        }  
    }  
  
    // Запуск  
    init();  
  
})();