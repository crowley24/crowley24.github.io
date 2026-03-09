(function() {  
    'use strict';  
  
    const PLUGIN_VERSION = '1.0.0';  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="80" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><circle cx="50" cy="50" r="10" fill="white"/></svg>';  
  
    let currentButtons = [];  
    let currentContainer = null;  
  
    // Функції для роботи з кнопками  
    function getButtonId($button) {  
        return $button.attr('class') || $button.text() || $button.find('span').text() || Math.random().toString(36).substr(2, 9);  
    }  
  
    function getButtonType($button) {  
        const text = $button.text().toLowerCase();  
        const className = $button.attr('class') || '';  
          
        if (text.includes('трейлер') || className.includes('trailer')) return 'trailer';  
        if (text.includes('онлайн') || className.includes('online')) return 'online';  
        if (text.includes('торрент') || className.includes('torrent')) return 'torrent';  
        if (text.includes('избран') || className.includes('favorite')) return 'favorite';  
        if (text.includes('поделиться') || className.includes('share')) return 'share';  
        return 'other';  
    }  
  
    function isExcluded($button) {  
        return $button.hasClass('button--edit-order') || $button.hasClass('button--play');  
    }  
  
    // Створення кнопки редагування  
    function createEditButton() {  
        const $editBtn = $('<div class="full-start__button button--edit-order">' +  
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +  
            '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>' +  
            '<path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>' +  
            '</svg>' +  
            '</div>');  
  
        $editBtn.on('click', function() {  
            showEditModal();  
        });  
  
        return $editBtn;  
    }  
  
    // Модальне вікно редагування  
    function showEditModal() {  
        const modal = $(`  
            <div class="buttons-edit-modal">  
                <div class="buttons-edit-modal__content">  
                    <div class="buttons-edit-modal__header">Редагування кнопок</div>  
                    <div class="buttons-edit-list"></div>  
                    <div class="buttons-edit-modal__footer">  
                        <div class="buttons-edit-modal__button buttons-edit-modal__close">Закрити</div>  
                    </div>  
                </div>  
            </div>  
        `);  
  
        const $list = modal.find('.buttons-edit-list');  
          
        currentButtons.forEach(($btn, index) => {  
            const buttonId = getButtonId($btn);  
            const buttonText = $btn.find('span').text() || $btn.text();  
            const buttonType = getButtonType($btn);  
  
            const $item = $(`  
                <div class="menu-edit-list__item" data-index="${index}">  
                    <div class="menu-edit-list__icon">${getIconForType(buttonType)}</div>  
                    <div class="menu-edit-list__title">${buttonText}</div>  
                    <div class="menu-edit-list__move">  
                        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">  
                            <path d="M1 2h14M1 5h14M1 8h14" stroke="currentColor" stroke-width="2"/>  
                        </svg>  
                    </div>  
                    <div class="menu-edit-list__change-name">  
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">  
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>  
                        </svg>  
                    </div>  
                    <div class="menu-edit-list__toggle">  
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">  
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>  
                        </svg>  
                    </div>  
                </div>  
            `);  
  
            // Обробники подій  
            $item.find('.menu-edit-list__change-name').on('click', function() {  
                const newName = prompt('Введіть нову назву:', buttonText);  
                if (newName && newName.trim()) {  
                    $btn.find('span').text(newName.trim());  
                    $item.find('.menu-edit-list__title').text(newName.trim());  
                    saveButtonNames();  
                }  
            });  
  
            $item.find('.menu-edit-list__toggle').on('click', function() {  
                $btn.toggleClass('hidden');  
                $item.toggleClass('menu-edit-list__item-hidden');  
            });  
  
            $list.append($item);  
        });  
  
        // Закриття модального вікна  
        modal.find('.buttons-edit-modal__close').on('click', function() {  
            modal.remove();  
        });  
  
        modal.on('click', function(e) {  
            if (e.target === modal[0]) {  
                modal.remove();  
            }  
        });  
  
        $('body').append(modal);  
    }  
  
    function getIconForType(type) {  
        const icons = {  
            'trailer': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l8-7z" fill="currentColor"/></svg>',  
            'online': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/></svg>',  
            'torrent': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/></svg>',  
            'favorite': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>',  
            'share': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" fill="currentColor"/></svg>',  
            'other': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>'  
        };  
        return icons[type] || icons.other;  
    }  
  
    function saveButtonNames() {  
        const buttonNames = {};  
        currentButtons.forEach($btn => {  
            const id = getButtonId($btn);  
            const text = $btn.find('span').text() || $btn.text();  
            buttonNames[id] = text;  
        });  
        Lampa.Storage.set('button_custom_names', buttonNames);  
    }  
  
    function loadButtonNames() {  
        const savedNames = Lampa.Storage.get('button_custom_names', {});  
        currentButtons.forEach($btn => {  
            const id = getButtonId($btn);  
            if (savedNames[id]) {  
                $btn.find('span').text(savedNames[id]);  
            }  
        });  
    }  
  
    // Основна функція перестановки кнопок  
    function reorderButtons(container) {  
        currentContainer = container;  
        const targetContainer = container.find('.full-start-new__buttons');  
          
        if (!targetContainer.length) return false;  
  
        targetContainer.addClass('buttons-plugin-scope');  
          
        // Збираємо всі кнопки  
        const allButtons = targetContainer.find('.full-start__button').not('.button--edit-order');  
        currentButtons = [];  
          
        allButtons.each(function() {  
            const $btn = $(this);  
            if (!isExcluded($btn)) {  
                currentButtons.push($btn);  
            }  
        });  
  
        // Завантажуємо збережені назви  
        loadButtonNames();  
  
        // Додаємо кнопку редагування  
        const editButton = createEditButton();  
        targetContainer.append(editButton);  
  
        // Анімація кнопок  
        setTimeout(() => {  
            currentButtons.forEach(($btn, index) => {  
                setTimeout(() => {  
                    $btn.css('opacity', '1');  
                }, index * 50);  
            });  
            editButton.css('opacity', '1');  
        }, 100);  
  
        return true;  
    }  
  
    // Ініціалізація плагіна  
    function init() {  
        // Додаємо стилі  
        const style = $('<style>' +  
            '.buttons-plugin-scope .full-start-new__buttons { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 0.5em !important; }' +  
            '.buttons-plugin-scope .full-start__button { opacity: 0; transition: opacity 0.3s ease; }' +  
            '.buttons-plugin-scope .full-start__button.hidden { display: none !important; }' +  
            '.button--edit-order { background: rgba(66, 133, 244, 0.5) !important; }' +  
            '.button--edit-order:hover { background: rgba(66, 133, 244, 0.7) !important; }' +  
            '.buttons-edit-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center; }' +  
            '.buttons-edit-modal__content { background: #262829; border-radius: 1em; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; }' +  
            '.buttons-edit-modal__header { padding: 1.5em; font-size: 1.2em; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); }' +  
            '.buttons-edit-list { max-height: 400px; overflow-y: auto; }' +  
            '.menu-edit-list__item { display: grid; grid-template-columns: 2.5em minmax(0, 1fr) 2.4em 2.4em 2.4em; align-items: center; gap: 0.35em; padding: 0.5em; border-bottom: 1px solid rgba(255,255,255,0.1); }' +  
            '.menu-edit-list__item > div { display: flex; align-items: center; justify-content: center; }' +  
            '.menu-edit-list__title { justify-content: flex-start !important; font-size: 0.9em; }' +  
            '.menu-edit-list__move, .menu-edit-list__change-name, .menu-edit-list__toggle { width: 2.4em; height: 2.4em; border-radius: 0.3em; cursor: pointer; transition: background 0.2s; }' +  
            '.menu-edit-list__move:hover, .menu-edit-list__change-name:hover, .menu-edit-list__toggle:hover { background: rgba(255,255,255,0.1); }' +  
            '.menu-edit-list__item-hidden { opacity: 0.5; }' +  
            '.buttons-edit-modal__footer { padding: 1em; text-align: center; }' +  
            '.buttons-edit-modal__button { padding: 0.8em 2em; background: rgba(66, 133, 244, 0.5); border-radius: 0.3em; cursor: pointer; display: inline-block; }' +  
            '.buttons-edit-modal__button:hover { background: rgba(66, 133, 244, 0.7); }' +  
            '</style>');  
        $('body').append(style);  
  
        // Слухаємо подію відкриття картки  
        Lampa.Listener.follow('full', function(e) {  
            if (e.type === 'complite') {  
                const container = e.object.activity.render();  
                setTimeout(() => {  
                    reorderButtons(container);  
                }, 500);  
            }  
        });  
    }  
  
    // Додаємо налаштування  
    if (Lampa.SettingsApi) {  
        Lampa.SettingsApi.addComponent({  
            component: 'interface',  
            name: 'Button Manager',  
            icon: PLUGIN_ICON  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'interface',  
            param: { name: 'button_manager_enabled', type: 'trigger', default: true },  
            field: { name: 'Менеджер кнопок' },  
            onChange: function(value) {  
                if (!value) {  
                    $('.button--edit-order').hide();  
                } else {  
                    $('.button--edit-order').show();  
                }  
            }  
        });  
    }  
  
    // Запуск плагіна  
    init();  
  
})();
