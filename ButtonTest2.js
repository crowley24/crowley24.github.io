(function() {
    'use strict';

    var PLUGIN_VERSION = '1.95_styles_only';

    // Polyfills (залишено без змін)
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function(callback, thisArg) {
            var T, k;
            if (this == null) throw new TypeError('this is null or not defined');
            var O = Object(this);
            var len = O.length >>> 0;
            if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');
            if (arguments.length > 1) T = thisArg;
            k = 0;
            while (k < len) {
                var kValue;
                if (k in O) {
                    kValue = O[k];
                    callback.call(T, kValue, k, O);
                }
                k++;
            }
        };
    }

    var EXCLUDED_CLASSES = ['button--play', 'button--edit-order'];
    var DEFAULT_GROUPS = [
        { name: 'online', patterns: ['online', 'lampac', 'modss', 'showy'], label: 'Онлайн' },
        { name: 'torrent', patterns: ['torrent'], label: 'Торренти' },
        { name: 'trailer', patterns: ['trailer', 'rutube'], label: 'Трейлери' },
        { name: 'favorite', patterns: ['favorite'], label: 'Избранное' },
        { name: 'subscribe', patterns: ['subscribe'], label: 'Подписка' },
        { name: 'book', patterns: ['book'], label: 'Закладки' },
        { name: 'reaction', patterns: ['reaction'], label: 'Реакции' }
    ];

    var currentButtons = [];
    var currentContainer = null;

    function getCustomOrder() { return Lampa.Storage.get('button_custom_order', []); }
    function setCustomOrder(order) { Lampa.Storage.set('button_custom_order', order); }
    function getHiddenButtons() { return Lampa.Storage.get('button_hidden', []); }
    function setHiddenButtons(hidden) { Lampa.Storage.set('button_hidden', hidden); }
    function getCustomLabels() { return Lampa.Storage.get('button_custom_labels', {}); }
    function setCustomLabels(labels) { Lampa.Storage.set('button_custom_labels', labels); }
    function getButtonScale() { return Lampa.Storage.get('button_scale_factor', '1.0'); }
    function setButtonScale(scale) { Lampa.Storage.set('button_scale_factor', scale); }
    // Нове для стилів
    function getButtonStyle() { return Lampa.Storage.get('button_design_style', 'default'); }
    function setButtonStyle(style) { Lampa.Storage.set('button_design_style', style); }

    function getButtonId(button) {
        var classes = button.attr('class') || '';
        var span = button.find('span').first();
        var text = (span.attr('data-original-text') || span.text() || '').trim().replace(/\s+/g, '_');
        var subtitle = button.attr('data-subtitle') || '';
        if (classes.indexOf('modss') !== -1 || text.indexOf('MODS') !== -1 || text.indexOf('MOD') !== -1) return 'modss_online_button';
        if (classes.indexOf('showy') !== -1 || text.indexOf('Showy') !== -1) return 'showy_online_button';
        if (classes.indexOf('shots') !== -1) return 'btn_Shots';
        var viewClasses = classes.split(' ').filter(function(c) { return c.indexOf('view--') === 0 || c.indexOf('button--') === 0; }).join('_');
        var id = (viewClasses || 'btn') + '_' + text;
        if (subtitle) id += '_' + subtitle.replace(/\s+/g, '_').substring(0, 30);
        return id;
    }

    function getButtonType(button) {
        var classes = button.attr('class') || '';
        for (var i = 0; i < DEFAULT_GROUPS.length; i++) {
            var group = DEFAULT_GROUPS[i];
            for (var j = 0; j < group.patterns.length; j++) {
                if (classes.indexOf(group.patterns[j]) !== -1) return group.name;
            }
        }
        return 'other';
    }

    function isExcluded(button) {
        var classes = button.attr('class') || '';
        for (var i = 0; i < EXCLUDED_CLASSES.length; i++) {
            if (classes.indexOf(EXCLUDED_CLASSES[i]) !== -1) return true;
        }
        return false;
    }

    function applyChanges() {
        if (!currentContainer) return;
        var targetContainer = currentContainer.find('.full-start-new__buttons');
        if (!targetContainer.length) return;
        var categories = categorizeButtons(currentContainer);
        var all = [].concat(categories.online, categories.torrent, categories.trailer, categories.favorite, categories.subscribe, categories.book, categories.reaction, categories.other, categories.any);
        currentButtons = sortByCustomOrder(all);
        targetContainer.find('.full-start__button').not('.button--edit-order').detach();
        currentButtons.forEach(function(btn) { targetContainer.append(btn); });
        var editBtn = targetContainer.find('.button--edit-order');
        if (editBtn.length) targetContainer.append(editBtn.detach());
        applyHiddenButtons(currentButtons);
        applyCustomLabels(currentButtons);
        var viewmode = Lampa.Storage.get('buttons_viewmode', 'default');
        targetContainer.removeClass('icons-only always-text');
        if (viewmode === 'icons') targetContainer.addClass('icons-only');
        if (viewmode === 'always') targetContainer.addClass('always-text');
        
        // Масштаб та Стиль через атрибути
        targetContainer.attr('data-scale', getButtonScale());
        targetContainer.attr('data-style', getButtonStyle());
        
        saveOrder();
    }

    function categorizeButtons(container) {
        var allButtons = container.find('.full-start__button').not('.button--edit-order, .button--play');
        var categories = { online: [], torrent: [], trailer: [], favorite: [], subscribe: [], book: [], reaction: [], other: [], any: [] };
        var processedIds = {};
        allButtons.each(function() {
            var $btn = $(this);
            if (isExcluded($btn)) return;
            var btnId = getButtonId($btn);
            if (processedIds[btnId]) return;
            processedIds[btnId] = true;
            var type = getButtonType($btn);
            if (categories[type]) categories[type].push($btn);
            else categories.any.push($btn);
            if (!$btn.hasClass('selector')) $btn.addClass('selector');
        });
        return categories;
    }

    function sortByCustomOrder(buttons) {
        var customOrder = getCustomOrder();
        var priority = [];
        var regular = [];
        buttons.forEach(function(btn) {
            if (getButtonId(btn) === 'modss_online_button') priority.push(btn);
            else regular.push(btn);
        });
        if (!customOrder.length) {
            regular.sort(function(a, b) {
                var typeOrder = ['online', 'torrent', 'trailer', 'favorite', 'subscribe', 'book', 'reaction', 'other', 'any'];
                return typeOrder.indexOf(getButtonType(a)) - typeOrder.indexOf(getButtonType(b));
            });
            return priority.concat(regular);
        }
        var sorted = [];
        var remaining = regular.slice();
        customOrder.forEach(function(id) {
            for (var i = 0; i < remaining.length; i++) {
                if (getButtonId(remaining[i]) === id) {
                    sorted.push(remaining[i]);
                    remaining.splice(i, 1);
                    break;
                }
            }
        });
        return priority.concat(sorted).concat(remaining);
    }

    function applyHiddenButtons(buttons) {
        var hidden = getHiddenButtons();
        buttons.forEach(function(btn) {
            btn.toggleClass('hidden', hidden.indexOf(getButtonId(btn)) !== -1);
        });
    }

    function applyCustomLabels(buttons) {
        var customLabels = getCustomLabels();
        buttons.forEach(function(btn) {
            var id = getButtonId(btn);
            if (customLabels[id]) {
                var span = btn.find('span').first();
                if (span.length) {
                    if (!span.attr('data-original-text')) span.attr('data-original-text', span.text().trim());
                    span.text(customLabels[id]);
                }
            }
        });
    }

    function saveOrder() {
        var order = currentButtons.map(function(btn) { return getButtonId(btn); });
        setCustomOrder(order);
    }

    function openEditDialog() {
        var list = $('<div class="menu-edit-list"></div>');
        var hidden = getHiddenButtons();
        var modes = ['default', 'icons', 'always'];
        var labels = {default: 'Стандартний', icons: 'Тільки іконки', always: 'З текстом'};
        var currentMode = Lampa.Storage.get('buttons_viewmode', 'default');

        var modeBtn = $('<div class="selector viewmode-switch"><div style="text-align: center; padding: 1em;">Вид кнопок: ' + labels[currentMode] + '</div></div>');
        modeBtn.on('hover:enter', function() {
            currentMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
            Lampa.Storage.set('buttons_viewmode', currentMode);
            $(this).find('div').text('Вид кнопок: ' + labels[currentMode]);
            applyChanges();
        });
        list.append(modeBtn);

        currentButtons.forEach(function(btn) {
            var btnId = getButtonId(btn);
            var isHidden = hidden.indexOf(btnId) !== -1;
            var item = $('<div class="menu-edit-list__item">' +
                '<div class="menu-edit-list__icon"></div>' +
                '<div class="menu-edit-list__title">' + (getCustomLabels()[btnId] || btn.find('span').text().trim() || 'Кнопка') + '</div>' +
                '<div class="menu-edit-list__change-name selector"><svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="currentColor" stroke-width="1.5"/></svg></div>' +
                '<div class="menu-edit-list__move move-up selector"><svg width="22" height="14" viewBox="0 0 22 14" fill="none"><path d="M2 12L11 3L20 12" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg></div>' +
                '<div class="menu-edit-list__move move-down selector"><svg width="22" height="14" viewBox="0 0 22 14" fill="none"><path d="M2 2L11 11L20 2" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg></div>' +
                '<div class="menu-edit-list__toggle toggle selector"><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="1.8" y="1.7" width="21.7" height="21.7" rx="3.5" stroke="currentColor" stroke-width="3"/><path d="M7.4 12.9L10.8 16.3L18.1 9" stroke="currentColor" stroke-width="3" class="dot" opacity="' + (isHidden ? '0' : '1') + '" stroke-linecap="round"/></svg></div>' +
                '</div>');

            item.find('.menu-edit-list__icon').append(btn.find('svg').clone());
            if (isHidden) item.addClass('menu-edit-list__item-hidden');

            item.find('.menu-edit-list__change-name').on('hover:enter', function() {
                Lampa.Input.edit({ title: 'Назва кнопки', value: item.find('.menu-edit-list__title').text(), free: true }, function(val) {
                    if (val) {
                        var labels = getCustomLabels();
                        labels[btnId] = val;
                        setCustomLabels(labels);
                        item.find('.menu-edit-list__title').text(val);
                        applyChanges();
                    }
                });
            });

            item.find('.move-up').on('hover:enter', function() {
                var prev = item.prev('.menu-edit-list__item');
                if (prev.length) {
                    item.insertBefore(prev);
                    var idx = currentButtons.indexOf(btn);
                    currentButtons.splice(idx, 1);
                    currentButtons.splice(idx - 1, 0, btn);
                    saveOrder();
                }
            });

            item.find('.move-down').on('hover:enter', function() {
                var next = item.next('.menu-edit-list__item');
                if (next.length) {
                    item.insertAfter(next);
                    var idx = currentButtons.indexOf(btn);
                    currentButtons.splice(idx, 1);
                    currentButtons.splice(idx + 1, 0, btn);
                    saveOrder();
                }
            });

            item.find('.toggle').on('hover:enter', function() {
                var isNowHidden = !item.hasClass('menu-edit-list__item-hidden');
                item.toggleClass('menu-edit-list__item-hidden', isNowHidden);
                item.find('.dot').attr('opacity', isNowHidden ? '0' : '1');
                var hiddenList = getHiddenButtons();
                if (isNowHidden) hiddenList.push(btnId);
                else hiddenList = hiddenList.filter(function(i) { return i !== btnId; });
                setHiddenButtons(hiddenList);
                applyChanges();
            });

            list.append(item);
        });

        // НОВЕ: СТИЛІ КНОПОК
        var styles = ['default', 'netflix', 'apple'];
        var styleLabels = {default: 'Стандартні', netflix: 'Netflix', apple: 'Apple TV'};
        var currentStyle = getButtonStyle();
        var styleBtn = $('<div class="selector viewmode-switch" style="background: rgba(255,165,0,0.2); margin-top: 10px;"><div style="text-align: center; padding: 1em;">Стиль кнопок: ' + styleLabels[currentStyle] + '</div></div>');
        styleBtn.on('hover:enter', function() {
            var nextIdx = (styles.indexOf(currentStyle) + 1) % styles.length;
            currentStyle = styles[nextIdx];
            setButtonStyle(currentStyle);
            $(this).find('div').text('Стиль кнопок: ' + styleLabels[currentStyle]);
            applyChanges();
        });
        list.append(styleBtn);

        // ПУНКТ РОЗМІР КНОПОК
        var scales = ['0.8', '0.9', '1.0', '1.1', '1.2'];
        var scaleLabels = {'0.8': 'Маленький', '0.9': 'Зменшений', '1.0': 'Нормальний', '1.1': 'Збільшений', '1.2': 'Великий'};
        var currentScale = getButtonScale();
        var scaleBtn = $('<div class="selector viewmode-switch" style="background: rgba(255,255,255,0.05); margin-top: 5px;"><div style="text-align: center; padding: 1em;">Розмір кнопок: ' + scaleLabels[currentScale] + '</div></div>');
        scaleBtn.on('hover:enter', function() {
            var nextIdx = (scales.indexOf(currentScale) + 1) % scales.length;
            currentScale = scales[nextIdx];
            setButtonScale(currentScale);
            $(this).find('div').text('Розмір кнопок: ' + scaleLabels[currentScale]);
            applyChanges();
        });
        list.append(scaleBtn);

        var resetBtn = $('<div class="selector folder-reset-button"><div style="text-align: center; padding: 1em;">Скинути налаштування</div></div>');
        resetBtn.on('hover:enter', function() {
            Lampa.Storage.set('button_custom_order', []);
            Lampa.Storage.set('button_hidden', []);
            Lampa.Storage.set('button_custom_labels', {});
            Lampa.Storage.set('button_scale_factor', '1.0');
            Lampa.Storage.set('button_design_style', 'default');
            Lampa.Modal.close();
            location.reload();
        });
        list.append(resetBtn);

        Lampa.Modal.open({ 
            title: 'Редактор кнопок', 
            html: list, 
            size: 'small',
            onBack: function() {
                Lampa.Modal.close();
                setTimeout(function() {
                    Lampa.Controller.toggle('full_start');
                }, 100);
            }
        });
    }

    function init() {
        var style = $('<style>' +
            '.menu-edit-list__item { display: grid; grid-template-columns: 2.5em 1fr 2.4em 2.4em 2.4em 2.4em; align-items: center; gap: 0.5em; padding: 0.3em 0; }' +
            '.menu-edit-list__icon svg { width: 1.4em; height: 1.4em; }' +
            '.menu-edit-list__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
            '.menu-edit-list__item-hidden { opacity: 0.4; }' +
            '.selector.focus { border-radius: 4px; background: rgba(255,255,255,0.1) !important; }' +
            '.viewmode-switch { background: rgba(66, 133, 244, 0.3); margin-bottom: 5px; border-radius: 4px; }' +
            '.folder-reset-button { background: rgba(200, 50, 50, 0.2); margin-top: 10px; border-radius: 4px; }' +
            '.full-start-new__buttons { display: flex !important; flex-wrap: wrap !important; gap: 8px !important; align-items: center !important; padding: 10px 0 !important; overflow: visible !important; }' +
            '.full-start-new__buttons[data-scale="0.8"] .full-start__button { transform: scale(0.8); margin: -2px; }' +
            '.full-start-new__buttons[data-scale="0.9"] .full-start__button { transform: scale(0.9); margin: -1px; }' +
            '.full-start-new__buttons[data-scale="1.0"] .full-start__button { transform: scale(1.0); }' +
            '.full-start-new__buttons[data-scale="1.1"] .full-start__button { transform: scale(1.1); margin: 2px; }' +
            '.full-start-new__buttons[data-scale="1.2"] .full-start__button { transform: scale(1.2); margin: 5px; }' +
            '.full-start-new__buttons .full-start__button { transform-origin: center center; overflow: visible !important; transition: all 0.2s ease; }' +
            '.full-start-new__buttons .full-start__button span { white-space: nowrap !important; }' +
            '.icons-only span { display: none !important; }' +
            '.always-text span { display: block !important; }' +
            '.full-start__button.hidden { display: none !important; }' +
            
            // CSS ДЛЯ СТИЛІВ
            '[data-style="netflix"] .full-start__button { border-radius: 2px !important; background: #222 !important; border: none !important; }' +
            '[data-style="netflix"] .full-start__button.focus { background: #e50914 !important; transform: scale(1.15) !important; z-index: 10; }' +
            '[data-style="apple"] .full-start__button { border-radius: 20px !important; background: rgba(255,255,255,0.1) !important; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05) !important; }' +
            '[data-style="apple"] .full-start__button.focus { background: #fff !important; color: #000 !important; transform: translateY(-5px) scale(1.05) !important; }' +
            '[data-style="apple"] .full-start__button.focus svg { fill: #000 !important; }' +
            '</style>');
        $('body').append(style);

        Lampa.Listener.follow('full', function(e) {
            if (e.type !== 'complite') return;
            currentContainer = e.object.activity.render();
            var target = currentContainer.find('.full-start-new__buttons');
            
            if (target.length && !currentContainer.data('buttons-processed')) {
                currentContainer.data('buttons-processed', true);
                
                var editBtn = $('<div class="full-start__button selector button--edit-order"><svg viewBox="0 0 30 29" fill="none"><use xlink:href="#sprite-edit"></use></svg></div>');
                editBtn.on('hover:enter', openEditDialog);
                target.append(editBtn);

                applyChanges();
                setTimeout(function() {
                    Lampa.Controller.toggle('full_start');
                }, 200);
            }
        });
    }

    init();
})();
