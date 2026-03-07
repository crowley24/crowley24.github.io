// https://github.com/amikdn  
(function() {  
    'use strict';  
  
    var PLUGIN_VERSION = '1.3';  
  
    // Перевірка наявності Lampa  
    if (typeof Lampa === 'undefined') {  
        console.error('Buttons plugin: Lampa not found');  
        return;  
    }  
  
    // Перевірка наявності jQuery  
    if (typeof $ === 'undefined') {  
        console.error('Buttons plugin: jQuery not found');  
        return;  
    }  
  
    var LAMPAC_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M20.331 14.644l-13.794-13.831 17.55 10.075zM2.938 0c-0.813 0.425-1.356 1.2-1.356 2.206v27.581c0 1.006 0.544 1.781 1.356 2.206l16.038-16zM29.512 14.1l-3.681-2.131-4.106 4.031 4.106 4.031 3.756-2.131c1.125-0.893 1.125-2.906-0.075-3.8zM6.538 31.188l17.55-10.075-3.756-3.756z" fill="currentColor"></path></svg>';  
    var EXCLUDED_CLASSES = ['button--play', 'button--edit-order'];  
    var DEFAULT_GROUPS = [  
        { name: 'online', patterns: ['online', 'lampac', 'modss', 'showy'], label: 'Онлайн' },  
        { name: 'torrent', patterns: ['torrent'], label: 'Торренты' },  
        { name: 'trailer', patterns: ['trailer', 'rutube'], label: 'Трейлеры' },  
        { name: 'favorite', patterns: ['favorite'], label: 'Избранное' },  
        { name: 'subscribe', patterns: ['subscribe'], label: 'Подписка' },  
        { name: 'book', patterns: ['book'], label: 'Закладки' },  
        { name: 'reaction', patterns: ['reaction'], label: 'Реакции' }  
    ];  
    var currentButtons = [];  
    var allButtonsCache = [];  
    var allButtonsOriginal = [];  
    var currentContainer = null;  
  
    function getButtonId(btn) {  
        var $btn = $(btn);  
        var classes = $btn.attr('class') || '';  
        var viewClass = classes.split(' ').find(function(c) {  
            return c.indexOf('view--') === 0 || c.indexOf('button--') === 0;  
        });  
        if (viewClass) {  
            return viewClass.replace('view--', '').replace('button--', '');  
        }  
        var text = $btn.find('span').text().trim();  
        if (text) {  
            return text.toLowerCase().replace(/[^a-zа-яё0-9]/g, '_');  
        }  
        return 'unknown_' + Math.random().toString(36).substr(2, 9);  
    }  
  
    function isExcluded(btn) {  
        var $btn = $(btn);  
        return EXCLUDED_CLASSES.some(function(cls) {  
            return $btn.hasClass(cls);  
        });  
    }  
  
    function getButtonType(btn) {  
        var $btn = $(btn);  
        var classes = $btn.attr('class') || '';  
        for (var i = 0; i < DEFAULT_GROUPS.length; i++) {  
            var group = DEFAULT_GROUPS[i];  
            for (var j = 0; j < group.patterns.length; j++) {  
                var pattern = group.patterns[j];  
                if (classes.indexOf(pattern) !== -1) {  
                    return group.name;  
                }  
            }  
        }  
        return 'other';  
    }  
  
    function categorizeButtons(container) {  
        var categories = {  
            online: [],  
            torrent: [],  
            trailer: [],  
            favorite: [],  
            subscribe: [],  
            book: [],  
            reaction: [],  
            other: []  
        };  
        var buttons = container.find('.full-start__button').not('.button--edit-order, .button--play');  
        buttons.each(function() {  
            var $btn = $(this);  
            if (isExcluded($btn)) return;  
            var type = getButtonType($btn);  
            if (categories[type]) {  
                categories[type].push($btn);  
            } else {  
                categories.other.push($btn);  
            }  
        });  
        return categories;  
    }  
  
    function getCustomOrder() {  
        return Lampa.Storage.get('button_custom_order', []);  
    }  
  
    function setCustomOrder(order) {  
        Lampa.Storage.set('button_custom_order', order);  
    }  
  
    function getHiddenButtons() {  
        return Lampa.Storage.get('button_hidden', []);  
    }  
  
    function setHiddenButtons(hidden) {  
        Lampa.Storage.set('button_hidden', hidden);  
    }  
  
    function getCustomIcons() {  
        return Lampa.Storage.get('button_custom_icons', {});  
    }  
  
    function setCustomIcons(icons) {  
        Lampa.Storage.set('button_custom_icons', icons);  
    }  
  
    function getCustomLabels() {  
        return Lampa.Storage.get('button_custom_labels', {});  
    }  
  
    function setCustomLabels(labels) {  
        Lampa.Storage.set('button_custom_labels', labels);  
    }  
  
    function sortByCustomOrder(buttons) {  
        var order = getCustomOrder();  
        var sorted = [];  
        var remaining = buttons.slice();  
        order.forEach(function(btnId) {  
            var index = remaining.findIndex(function(btn) {  
                return getButtonId(btn) === btnId;  
            });  
            if (index !== -1) {  
                sorted.push(remaining[index]);  
                remaining.splice(index, 1);  
            }  
        });  
        return sorted.concat(remaining);  
    }  
  
    function applyHiddenButtons(buttons) {  
        var hidden = getHiddenButtons();  
        buttons.forEach(function(btn) {  
            var btnId = getButtonId(btn);  
            var isHidden = hidden.indexOf(btnId) !== -1;  
            btn.toggleClass('hidden', isHidden);  
        });  
    }  
  
    function applyCustomIcons(buttons) {  
        var customIcons = getCustomIcons();  
        buttons.forEach(function(btn) {  
            var btnId = getButtonId(btn);  
            if (customIcons[btnId]) {  
                var svg = $(customIcons[btnId]);  
                btn.find('svg').first().replaceWith(svg.clone());  
            }  
        });  
    }  
  
    function applyCustomLabels(buttons) {  
        var customLabels = getCustomLabels();  
        buttons.forEach(function(btn) {  
            var btnId = getButtonId(btn);  
            if (customLabels[btnId]) {  
                var span = btn.find('span').first();  
                if (!span.attr('data-original-text')) {  
                    span.attr('data-original-text', span.text());  
                }  
                span.text(customLabels[btnId]);  
            }  
        });  
    }  
  
    function applyButtonAnimation(buttons) {  
        buttons.forEach(function(btn, index) {  
            setTimeout(function() {  
                btn.css({  
                    'opacity': '1',  
                    'transform': 'translateY(0)',  
                    'transition': 'opacity 0.3s ease, transform 0.3s ease'  
                });  
            }, index * 50);  
        });  
    }  
  
    function createEditButton() {  
        var editBtn = $('<div class="full-start__button selector button--edit-order">' +  
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +  
            '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="currentColor" stroke-width="1.5"/>' +  
            '</svg>' +  
            '</div>');  
        editBtn.on('hover:enter', function() {  
            openEditDialog();  
        });  
        return editBtn;  
    }  
  
    function applyChanges() {  
        if (currentContainer) {  
            applyHiddenButtons(currentButtons);  
            applyCustomIcons(currentButtons);  
            applyCustomLabels(currentButtons);  
        }  
    }  
  
    function refreshController() {  
        if (!Lampa.Controller || typeof Lampa.Controller.toggle !== 'function') return;  
        setTimeout(function() {  
            try {  
                Lampa.Controller.toggle('full_start');  
                if (currentContainer) {  
                    setTimeout(function() {  
                        setupButtonNavigation(currentContainer);  
                    }, 100);  
                }  
            } catch(e) {}  
        }, 50);  
    }  
  
    function setupButtonNavigation(container) {  
        if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {  
            try {  
                Lampa.Controller.toggle('full_start');  
            } catch(e) {}  
        }  
    }  
  
    function openEditDialog() {  
        // Спрощена версія редактора  
        var list = $('<div class="menu-edit-list"></div>');  
          
        currentButtons.forEach(function(btn) {  
            var displayName = btn.find('span').text().trim() || 'Button';  
            var item = $('<div class="menu-edit-list__item">' +  
                '<div class="menu-edit-list__title">' + displayName + '</div>' +  
                '</div>');  
            list.append(item);  
        });  
  
        Lampa.Modal.open({  
            title: 'Редактор кнопок',  
            html: list,  
            size: 'small',  
            onBack: function() {  
                Lampa.Modal.close();  
                applyChanges();  
                Lampa.Controller.toggle('full_start');  
            }  
        });  
    }  
  
    function reorderButtons(container) {  
        var targetContainer = container.find('.full-start-new__buttons');  
        if (!targetContainer.length) return false;  
          
        currentContainer = container;  
        container.find('.button--play, .button--edit-order').remove();  
          
        var categories = categorizeButtons(container);  
        var allButtons = []  
            .concat(categories.online)  
            .concat(categories.torrent)  
            .concat(categories.trailer)  
            .concat(categories.favorite)  
            .concat(categories.subscribe)  
            .concat(categories.book)  
            .concat(categories.reaction)  
            .concat(categories.other);  
              
        allButtons = sortByCustomOrder(allButtons);  
        allButtonsCache = allButtons;  
          
        if (allButtonsOriginal.length === 0) {  
            allButtons.forEach(function(btn) {  
                allButtonsOriginal.push(btn.clone(true, true));  
            });  
        }  
          
        currentButtons = allButtons;  
          
        targetContainer.children().detach();  
        var visibleButtons = [];  
          
        currentButtons.forEach(function(btn) {  
            targetContainer.append(btn);  
            if (!btn.hasClass('hidden')) visibleButtons.push(btn);  
        });  
          
        var editButton = createEditButton();  
        targetContainer.append(editButton);  
        visibleButtons.push(editButton);  
          
        applyHiddenButtons(currentButtons);  
        applyCustomIcons(currentButtons);  
        applyCustomLabels(currentButtons);  
        applyButtonAnimation(visibleButtons);  
          
        setTimeout(function() {  
            setupButtonNavigation(container);  
        }, 100);  
          
        return true;  
    }  
  
    // МОДИФІКОВАНА init() функція для сумісності  
    function init() {  
        // Перевірка наявності конфліктуючих плагінів  
        var template = Lampa.Template.get('full_start_new', '');  
        var hasLeftTitle = template.includes('left-title');  
        var hasApplecation = template.includes('applecation');  
          
        // Сумісні CSS стилі  
        var bodyStyle = hasLeftTitle || hasApplecation ?   
            'align-items: flex-end !important;' :   
            'align-items: stretch !important;';  
          
        var rightStyle = hasLeftTitle || hasApplecation ?   
            'display: flex !important; flex-direction: row !important; align-items: flex-end !important;' :   
            'display: flex !important; flex-direction: column !important; align-self: stretch !important; min-height: 0;';  
          
        var titleStyle = hasLeftTitle || hasApplecation ?   
            'margin-top: 0 !important; margin-bottom: 1em !important;' :   
            'margin-top: auto !important;';  
          
        var style = $('<style>' +  
            '@keyframes button-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }' +  
            '.full-start-new__body { ' + bodyStyle + ' }' +  
            '.full-start-new__right { ' + rightStyle + ' }' +  
            '.full-start-new__title { ' + titleStyle + ' }' +  
            '.full-start-new__buttons { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 0.5em !important; }' +  
            '.full-start-new__buttons .full-start__button { opacity: 0; }' +  
            '.full-start__button.hidden { display: none !important; }' +  
            '.full-start-new__buttons.buttons-loading .full-start__button { visibility: hidden !important; }' +  
            '.menu-edit-list { max-width: 100%; overflow: hidden; box-sizing: border-box; }' +  
            '.menu-edit-list__item { display: grid; grid-template-columns: 2.5em minmax(0, 1fr) 2.4em; align-items: center; gap: 0.35em; padding: 0.2em 0; box-sizing: border-box; }' +  
            '.menu-edit-list__item .menu-edit-list__title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +  
            '.menu-edit-list__item.focus { border-color: rgba(255,255,255,0.8); }' +  
            '</style>');  
        $('body').append(style);  
  
        Lampa.Listener.follow('full', function(e) {  
            if (e.type !== 'complite') return;  
            var container = e.object.activity.render();  
            var targetContainer = container.find('.full-start-new__buttons');  
            if (targetContainer.length) {  
                targetContainer.addClass('buttons-loading');  
            }  
            setTimeout(function() {  
                try {  
                    if (!container.data('buttons-processed')) {  
                        container.data('buttons-processed', true);  
                        if (reorderButtons(container)) {  
                            if (targetContainer.length) {  
                                targetContainer.removeClass('buttons-loading');  
                            }  
                            refreshController();  
                        }  
                    }  
                } catch(err) {  
                    if (targetContainer.length) {  
                        targetContainer.removeClass('buttons-loading');  
                    }  
                }  
            }, 400);  
        });  
    }  
  
    if (Lampa.SettingsApi) {  
        Lampa.SettingsApi.addParam({  
            component: 'interface',  
            param: { name: 'buttons_editor_enabled', type: 'trigger', default: true },  
            field: { name: 'Редактор кнопок' },  
            onChange: function(value) {  
                setTimeout(function() {  
                    var currentValue = Lampa.Storage.get('buttons_editor_enabled', true);  
                    if (currentValue) {  
                        $('.button--edit-order').show();  
                    } else {  
                        $('.button--edit-order').hide();  
                    }  
                }, 100);  
            }  
        });  
    }  
  
    init();  
  
})();
