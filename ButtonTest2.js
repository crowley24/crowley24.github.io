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
  
    // Модальне вікно редагування з виправленою структурою  
    function showEditModal() {  
        const modal = $(`  
            <div class="buttons-edit-modal">  
                <div class="buttons-edit-modal__content">  
                    <div class="buttons-edit-modal__header">  
                        <h3>Редагування кнопок</h3>  
                        <div class="buttons-edit-modal__close">×</div>  
                    </div>  
                    <div class="buttons-edit-modal__body">  
                        <div class="buttons-edit-list"></div>  
                    </div>  
                    <div class="buttons-edit-modal__footer">  
                        <button class="buttons-edit-modal__button">Зберегти</button>  
                    </div>  
                </div>  
            </div>  
        `);  
  
        // Додаємо всі кнопки до списку  
        const $list = modal.find('.buttons-edit-list');  
        currentButtons.forEach(($btn, index) => {  
            const btnId = getButtonId($btn);  
            const btnText = $btn.text().trim();  
            const isHidden = $btn.hasClass('hidden');  
              
            const $item = $(`  
                <div class="menu-edit-list__item ${isHidden ? 'menu-edit-list__item-hidden' : ''}" data-index="${index}">  
                    <div class="menu-edit-list__drag">⋮⋮</div>  
                    <div class="menu-edit-list__title">${btnText}</div>  
                    <div class="menu-edit-list__actions">  
                        <div class="menu-edit-list__change-name" title="Змінити назву">✏️</div>  
                        <div class="menu-edit-list__toggle" title="Приховати/показати">${isHidden ? '👁️' : '🙈'}</div>  
                    </div>  
                </div>  
            `);  
  
            // Обробники подій  
            $item.find('.menu-edit-list__change-name').on('click', function() {  
                changeButtonText($btn, $item);  
            });  
  
            $item.find('.menu-edit-list__toggle').on('click', function() {  
                toggleButtonVisibility($btn, $item);  
            });  
  
            // Drag and drop  
            $item.attr('draggable', true);  
            $item.on('dragstart', handleDragStart);  
            $item.on('dragover', handleDragOver);  
            $item.on('drop', handleDrop);  
            $item.on('dragend', handleDragEnd);  
  
            $list.append($item);  
        });  
  
        // Закриття модального вікна  
        modal.find('.buttons-edit-modal__close, .buttons-edit-modal__button').on('click', function() {  
            modal.remove();  
            reorderButtons(currentContainer);  
        });  
  
        $('body').append(modal);  
    }  
  
    // Функція зміни назви кнопки  
    function changeButtonText($button, $listItem) {  
        const currentText = $button.text().trim();  
        const newText = prompt('Введіть нову назву кнопки:', currentText);  
          
        if (newText && newText !== currentText) {  
            // Зберігаємо оригінальний текст  
            const originalText = $button.data('original-text') || currentText;  
            $button.data('original-text', originalText);  
              
            // Оновлюємо текст кнопки  
            const $span = $button.find('span');  
            if ($span.length) {  
                $span.text(newText);  
            } else {  
                $button.text(newText);  
            }  
              
            // Оновлюємо текст у списку  
            $listItem.find('.menu-edit-list__title').text(newText);  
              
            // Зберігаємо зміни  
            const btnId = getButtonId($button);  
            const customLabels = Lampa.Storage.get('button_custom_labels', {});  
            customLabels[btnId] = newText;  
            Lampa.Storage.set('button_custom_labels', customLabels);  
        }  
    }  
  
    // Функція перемикання видимості  
    function toggleButtonVisibility($button, $listItem) {  
        const isHidden = $button.hasClass('hidden');  
          
        if (isHidden) {  
            $button.removeClass('hidden');  
            $listItem.removeClass('menu-edit-list__item-hidden');  
            $listItem.find('.menu-edit-list__toggle').text('🙈');  
        } else {  
            $button.addClass('hidden');  
            $listItem.addClass('menu-edit-list__item-hidden');  
            $listItem.find('.menu-edit-list__toggle').text('👁️');  
        }  
          
        // Зберігаємо стан  
        const btnId = getButtonId($button);  
        const hiddenButtons = Lampa.Storage.get('button_hidden_buttons', []);  
          
        if (isHidden) {  
            const index = hiddenButtons.indexOf(btnId);  
            if (index > -1) hiddenButtons.splice(index, 1);  
        } else {  
            if (!hiddenButtons.includes(btnId)) {  
                hiddenButtons.push(btnId);  
            }  
        }  
          
        Lampa.Storage.set('button_hidden_buttons', hiddenButtons);  
    }  
  
    // Drag and drop функції  
    function handleDragStart(e) {  
        draggedElement = $(this);  
        $(this).addClass('dragging');  
        e.originalEvent.dataTransfer.effectAllowed = 'move';  
        e.originalEvent.dataTransfer.setData('text/html', this.innerHTML);  
    }  
  
    function handleDragOver(e) {  
        if (e.preventDefault) {  
            e.preventDefault();  
        }  
        e.originalEvent.dataTransfer.dropEffect = 'move';  
          
        const $this = $(this);  
        const $list = $this.parent();  
        const $dragging = $('.dragging');  
          
        if ($dragging.length && $this[0] !== $dragging[0]) {  
            const draggingIndex = $dragging.index();  
            const thisIndex = $this.index();  
              
            if (draggingIndex < thisIndex) {  
                $this.after($dragging);  
            } else {  
                $this.before($dragging);  
            }  
        }  
          
        return false;  
    }  
  
    function handleDrop(e) {  
        if (e.stopPropagation) {  
            e.stopPropagation();  
        }  
        return false;  
    }  
  
    function handleDragEnd(e) {  
        $(this).removeClass('dragging');  
        draggedElement = null;  
          
        // Оновлюємо порядок кнопок  
        const $items = $('.menu-edit-list__item');  
        const newOrder = [];  
          
        $items.each(function() {  
            const index = $(this).data('index');  
            newOrder.push(currentButtons[index]);  
        });  
          
        currentButtons = newOrder;  
          
        // Зберігаємо порядок  
        const buttonOrder = currentButtons.map(btn => getButtonId(btn));  
        Lampa.Storage.set('button_order', buttonOrder);  
    }  
  
    // Основна функція перестановки кнопок  
    function reorderButtons(container) {  
        currentContainer = container;  
        const targetContainer = container.find('.full-start-new__buttons');  
          
        if (!targetContainer.length) return;  
  
        // Знаходимо ВСІ кнопки, включаючи динамічні  
        const allButtons = container.find('.full-start__button');  
        currentButtons = [];  
          
        allButtons.each(function() {  
            const $btn = $(this);  
            if (!isExcluded($btn)) {  
                currentButtons.push($btn);  
            }  
        });  
  
        // Застосовуємо збережений порядок  
        const savedOrder = Lampa.Storage.get('button_order', []);  
        if (savedOrder.length > 0) {  
            currentButtons.sort((a, b) => {  
                const aId = getButtonId(a);  
                const bId = getButtonId(b);  
                const aIndex = savedOrder.indexOf(aId);  
                const bIndex = savedOrder.indexOf(bId);  
                  
                if (aIndex === -1 && bIndex === -1) return 0;  
                if (aIndex === -1) return 1;  
                if (bIndex === -1) return -1;  
                  
                return aIndex - bIndex;  
            });  
        }  
  
        // Очищуємо та додаємо кнопки в правильному порядку  
        targetContainer.empty();  
          
        currentButtons.forEach($btn => {  
            targetContainer.append($btn);  
        });  
  
        // Додаємо кнопку редагування  
        const $editBtn = createEditButton();  
        targetContainer.append($editBtn);  
  
        // Відновлюємо збережені назви  
        const customLabels = Lampa.Storage.get('button_custom_labels', {});  
        currentButtons.forEach($btn => {  
            const btnId = getButtonId($btn);  
            if (customLabels[btnId]) {  
                const $span = $btn.find('span');  
                if ($span.length) {  
                    $span.text(customLabels[btnId]);  
                } else {  
                    $btn.text(customLabels[btnId]);  
                }  
            }  
        });  
  
        // Відновлюємо стан видимості  
        const hiddenButtons = Lampa.Storage.get('button_hidden_buttons', []);  
        currentButtons.forEach($btn => {  
            const btnId = getButtonId($btn);  
            if (hiddenButtons.includes(btnId)) {  
                $btn.addClass('hidden');  
            }  
        });  
  
        return true;  
    }  
  
    // Стилі для модального вікна та drag&drop  
    function init() {  
        const style = $('<style>' +  
            '.buttons-edit-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; }' +  
            '.buttons-edit-modal__content { background: #2a2a2a; border-radius: 1em; max-width: 500px; width: 90%; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }' +  
            '.buttons-edit-modal__header { padding: 1.5em; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center; }' +  
            '.buttons-edit-modal__header h3 { margin: 0; color: #fff; }' +  
            '.buttons-edit-modal__close { cursor: pointer; font-size: 1.5em; color: #fff; width: 2em; height: 2em; display: flex; align-items: center; justify-content: center; border-radius: 50%; }' +  
            '.buttons-edit-modal__close:hover { background: rgba(255,255,255,0.1); }' +  
            '.buttons-edit-modal__body { flex: 1; overflow-y: auto; padding: 1em; }' +  
            '.menu-edit-list__item { background: #333; border-radius: 0.5em; padding: 1em; margin-bottom: 0.5em; display: flex; align-items: center; cursor: move; }' +  
            '.menu-edit-list__item.dragging { opacity: 0.5; }' +  
            '.menu-edit-list__drag { color: #666; font-size: 1.2em; margin-right: 1em; cursor: grab; user-select: none; }' +  
            '.menu-edit-list__drag:active { cursor: grabbing; }' +  
            '.menu-edit-list__title { flex: 1; color: #fff; font-size: 1em; }' +  
            '.menu-edit-list__actions { display: flex; gap: 0.5em; }' +  
            '.menu-edit-list__change-name, .menu-edit-list__toggle { width: 2.5em; height: 2.5em; border-radius: 0.3em; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2em; transition: background 0.2s; }' +  
            '.menu-edit-list__change-name:hover, .menu-edit-list__toggle:hover { background: rgba(255,255,255,0.1); }' +  
            '.menu-edit-list__item-hidden { opacity: 0.5; }' +  
            '.buttons-edit-modal__footer { padding: 1em; text-align: center; border-top: 1px solid #444; }' +  
            '.buttons-edit-modal__button { padding: 0.8em 2em; background: #4285f4; color: white; border: none; border-radius: 0.3em; cursor: pointer; font-size: 1em; }' +  
            '.buttons-edit-modal__button:hover { background: #3367d6; }' +  
            '.button--edit-order { background: rgba(66, 133, 244, 0.2) !important; }' +  
            '.button--edit-order:hover { background: rgba(66, 133, 244, 0.4) !important; }' +  
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
