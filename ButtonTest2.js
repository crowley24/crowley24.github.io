(function() {  
    'use strict';  
  
    const PLUGIN_VERSION = '1.0.0';  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="80" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><circle cx="50" cy="50" r="10" fill="white"/></svg>';  
  
    let currentButtons = [];  
    let currentContainer = null;  
    let draggedElement = null;  
  
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
        // Видаляємо існуюче модальне вікно  
        $('.buttons-edit-modal').remove();  
  
        const $modal = $('<div class="buttons-edit-modal">' +  
            '<div class="buttons-edit-modal__content">' +  
                '<div class="buttons-edit-modal__header">' +  
                    '<h3>Редагування кнопок</h3>' +  
                    '<div class="buttons-edit-modal__close">×</div>' +  
                '</div>' +  
                '<div class="buttons-edit-modal__body">' +  
                    '<div class="menu-edit-list"></div>' +  
                '</div>' +  
                '<div class="buttons-edit-modal__footer">' +  
                    '<div class="buttons-edit-modal__button">Зберегти</div>' +  
                '</div>' +  
            '</div>' +  
            '<div class="buttons-edit-modal__overlay"></div>' +  
        '</div>');  
  
        // Створюємо список кнопок для редагування  
        const $list = $modal.find('.menu-edit-list');  
        currentButtons.forEach(function($button, index) {  
            const buttonId = getButtonId($button);  
            const buttonText = $button.find('span').text() || $button.text();  
            const isHidden = $button.hasClass('hidden');  
            const customName = Lampa.Storage.get('button_name_' + buttonId) || buttonText;  
  
            const $item = $('<div class="menu-edit-list__item' + (isHidden ? ' menu-edit-list__item-hidden' : '') + '" data-index="' + index + '">' +  
                '<div class="menu-edit-list__move">⋮⋮</div>' +  
                '<div class="menu-edit-list__name">' + customName + '</div>' +  
                '<div class="menu-edit-list__change-name">✏️</div>' +  
                '<div class="menu-edit-list__toggle">' + (isHidden ? '👁️' : '🙈') + '</div>' +  
            '</div>');  
  
            // Обробники подій  
            $item.find('.menu-edit-list__move').on('mousedown', function(e) {  
                e.preventDefault();  
                draggedElement = $item;  
                $item.addClass('dragging');  
            });  
  
            $item.find('.menu-edit-list__change-name').on('click', function() {  
                const newName = prompt('Введіть нову назву кнопки:', customName);  
                if (newName && newName.trim()) {  
                    Lampa.Storage.set('button_name_' + buttonId, newName.trim());  
                    $item.find('.menu-edit-list__name').text(newName.trim());  
                }  
            });  
  
            $item.find('.menu-edit-list__toggle').on('click', function() {  
                $button.toggleClass('hidden');  
                $item.toggleClass('menu-edit-list__item-hidden');  
                $(this).text($button.hasClass('hidden') ? '👁️' : '🙈');  
            });  
  
            $list.append($item);  
        });  
  
        // Додаємо модальне вікно на сторінку  
        $('body').append($modal);  
  
        // Обробники закриття  
        $modal.find('.buttons-edit-modal__close, .buttons-edit-modal__overlay').on('click', function() {  
            $modal.remove();  
        });  
  
        $modal.find('.buttons-edit-modal__button').on('click', function() {  
            saveButtonOrder();  
            $modal.remove();  
        });  
  
        // Drag and drop функціональність  
        $(document).on('mousemove', function(e) {  
            if (draggedElement) {  
                const $items = $('.menu-edit-list__item');  
                const draggedIndex = parseInt(draggedElement.attr('data-index'));  
                  
                $items.each(function(index) {  
                    if (index !== draggedIndex) {  
                        const $item = $(this);  
                        const rect = $item[0].getBoundingClientRect();  
                        const midpoint = rect.top + rect.height / 2;  
                          
                        if (e.clientY < midpoint && index < draggedIndex) {  
                            $item.before(draggedElement);  
                            draggedElement.attr('data-index', index);  
                            $items.not(draggedElement).each(function(i) {  
                                if (i >= index) {  
                                    $(this).attr('data-index', i + 1);  
                                }  
                            });  
                        } else if (e.clientY > midpoint && index > draggedIndex) {  
                            $item.after(draggedElement);  
                            draggedElement.attr('data-index', index);  
                            $items.not(draggedElement).each(function(i) {  
                                if (i <= index) {  
                                    $(this).attr('data-index', i - 1);  
                                }  
                            });  
                        }  
                    }  
                });  
            }  
        });  
  
        $(document).on('mouseup', function() {  
            if (draggedElement) {  
                draggedElement.removeClass('dragging');  
                draggedElement = null;  
            }  
        });  
    }  
  
    function saveButtonOrder() {  
        const order = [];  
        $('.menu-edit-list__item').each(function() {  
            const index = parseInt($(this).attr('data-index'));  
            order.push(index);  
        });  
        Lampa.Storage.set('button_order', order);  
        reorderButtons(currentContainer);  
    }  
  
    function reorderButtons(container) {  
        if (!container) return;  
          
        currentContainer = container;  
        const targetContainer = container.find('.full-start-new__buttons');  
          
        if (!targetContainer.length) return;  
  
        targetContainer.addClass('buttons-loading');  
  
        setTimeout(function() {  
            try {  
                const allButtons = targetContainer.find('.full-start__button');  
                currentButtons = [];  
  
                allButtons.each(function() {  
                    const $btn = $(this);  
                    if (!isExcluded($btn)) {  
                        currentButtons.push($btn);  
                    }  
                });  
  
                // Застосовуємо збережений порядок  
                const savedOrder = Lampa.Storage.get('button_order', []);  
                if (savedOrder.length === currentButtons.length) {  
                    const reorderedButtons = [];  
                    savedOrder.forEach(function(index) {  
                        if (currentButtons[index]) {  
                            reorderedButtons.push(currentButtons[index]);  
                        }  
                    });  
                    currentButtons = reorderedButtons;  
                }  
  
                // Застосовуємо збережені назви  
                currentButtons.forEach(function($button) {  
                    const buttonId = getButtonId($button);  
                    const customName = Lampa.Storage.get('button_name_' + buttonId);  
                    if (customName) {  
                        const $span = $button.find('span');  
                        if ($span.length) {  
                            $span.text(customName);  
                        } else {  
                            $button.text(customName);  
                        }  
                    }  
                });  
  
                // Очищуємо та додаємо кнопки в правильному порядку  
                targetContainer.children().detach();  
                currentButtons.forEach(function($button) {  
                    targetContainer.append($button);  
                });  
  
                // Додаємо кнопку редагування  
                const $editBtn = createEditButton();  
                targetContainer.append($editBtn);  
  
                // Застосовуємо анімацію  
                currentButtons.forEach(function($button, index) {  
                    setTimeout(function() {  
                        $button.css({  
                            'opacity': '1',  
                            'transform': 'translateY(0)'  
                        });  
                    }, index * 50);  
                });  
  
                $editBtn.css({  
                    'opacity': '1',  
                    'transform': 'translateY(0)'  
                });  
  
            } catch(err) {  
                console.error('Button Manager error:', err);  
            } finally {  
                targetContainer.removeClass('buttons-loading');  
            }  
        }, 400);  
    }  
  
    function init() {  
        // Додаємо стилі  
        const style = $('<style id="button-manager-styles">' +  
            '.full-start-new__buttons.buttons-loading .full-start__button { opacity: 0; transform: translateY(10px); transition: all 0.3s ease; }' +  
            '.button--edit-order { background: rgba(66, 133, 244, 0.2) !important; cursor: pointer; }' +  
            '.button--edit-order:hover { background: rgba(66, 133, 244, 0.4) !important; }' +  
            '.buttons-edit-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; display: flex; align-items: center; justify-content: center; }' +  
            '.buttons-edit-modal__overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); }' +  
            '.buttons-edit-modal__content { position: relative; background: #2a2a2a; border-radius: 8px; max-width: 500px; width: 90%; max-height: 80vh; overflow: hidden; z-index: 1; }' +  
            '.buttons-edit-modal__header { padding: 1em; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center; }' +  
            '.buttons-edit-modal__header h3 { margin: 0; color: #fff; }' +  
            '.buttons-edit-modal__close { cursor: pointer; color: #fff; font-size: 1.5em; width: 2em; height: 2em; display: flex; align-items: center; justify-content: center; }' +  
            '.buttons-edit-modal__body { max-height: 400px; overflow-y: auto; }' +  
            '.menu-edit-list__item { display: flex; align-items: center; padding: 0.8em; border-bottom: 1px solid #444; color: #fff; }' +  
            '.menu-edit-list__item.dragging { opacity: 0.5; }' +  
            '.menu-edit-list__move { cursor: grab; color: #888; font-size: 1.2em; margin-right: 1em; user-select: none; }' +  
            '.menu-edit-list__move:active { cursor: grabbing; }' +  
            '.menu-edit-list__name { flex: 1; margin-right: 1em; }' +  
            '.menu-edit-list__change-name, .menu-edit-list__toggle { cursor: pointer; padding: 0.5em; margin: 0 0.2em; border-radius: 4px; transition: background 0.2s; }' +  
            '.menu-edit-list__change-name:hover, .menu-edit-list__toggle:hover { background: rgba(255,255,255,0.1); }' +  
            '.menu-edit-list__item-hidden { opacity: 0.5; }' +  
            '.buttons-edit-modal__footer { padding: 1em; text-align: center; border-top: 1px solid #444; }' +  
            '.buttons-edit-modal__button { padding: 0.8em 2em; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; }' +  
            '.buttons-edit-modal__button:hover { background: #3367d6; }' +  
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
