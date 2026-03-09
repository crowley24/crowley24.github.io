(function() {
    'use strict';

    var PLUGIN_VERSION = '1.75_full_restored';

    // --- Polyfills ---
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

    // --- Сховище ---
    function getCustomOrder() { return Lampa.Storage.get('button_custom_order', []); }
    function setCustomOrder(order) { Lampa.Storage.set('button_custom_order', order); }
    function getHiddenButtons() { return Lampa.Storage.get('button_hidden', []); }
    function setHiddenButtons(hidden) { Lampa.Storage.set('button_hidden', hidden); }
    function getCustomLabels() { return Lampa.Storage.get('button_custom_labels', {}); }
    function setCustomLabels(labels) { Lampa.Storage.set('button_custom_labels', labels); }
    function getButtonScale() { return Lampa.Storage.get('button_scale_factor', '1.0'); }
    function setButtonScale(scale) { Lampa.Storage.set('button_scale_factor', scale); }

    // --- Ідентифікація (Покращено для Shots) ---
    function getButtonId(button) {
        var classes = button.attr('class') || '';
        var span = button.find('span').first();
        var text = (span.attr('data-original-text') || span.text() || '').trim().replace(/\s+/g, '_');
        
        // Спеціальні випадки для популярних кнопок
        if (classes.indexOf('modss') !== -1 || text.indexOf('MODS') !== -1) return 'modss_online_button';
        if (classes.indexOf('shots') !== -1 || text.toLowerCase() === 'shots') return 'shots_button';
        
        var id = (text ? 'btn_' + text : 'cls_' + classes.replace(/\s+/g, '_').substring(0, 20));
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

    // --- Основна логіка ---
    function applyChanges() {
        if (!currentContainer) return;
        var targetContainer = currentContainer.find('.full-start-new__buttons');
        if (!targetContainer.length) return;

        // Збираємо категорії
        var allButtons = [];
        targetContainer.find('.full-start__button').each(function() {
            var $btn = $(this);
            if (!isExcluded($btn)) {
                if (!$btn.hasClass('selector')) $btn.addClass('selector');
                allButtons.push($btn);
            }
        });

        // Сортування за кастомним порядком
        var customOrder = getCustomOrder();
        if (customOrder.length) {
            allButtons.sort(function(a, b) {
                var indexA = customOrder.indexOf(getButtonId(a));
                var indexB = customOrder.indexOf(getButtonId(b));
                if (indexA === -1) indexA = 999;
                if (indexB === -1) indexB = 999;
                return indexA - indexB;
            });
        }

        currentButtons = allButtons;
        targetContainer.find('.full-start__button').not('.button--edit-order').detach();
        
        currentButtons.forEach(function(btn) { targetContainer.append(btn); });

        var editBtn = targetContainer.find('.button--edit-order');
        if (editBtn.length) targetContainer.append(editBtn.detach());

        // Застосовуємо приховання, назви та вид
        applyHiddenButtons(currentButtons);
        applyCustomLabels(currentButtons);
        
        var viewmode = Lampa.Storage.get('buttons_viewmode', 'default');
        targetContainer.removeClass('icons-only always-text');
        if (viewmode === 'icons') targetContainer.addClass('icons-only');
        if (viewmode === 'always') targetContainer.addClass('always-text');

        // Масштаб
        var scale = getButtonScale();
        targetContainer.css('--btn-scale', scale);
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

    // --- Редактор ---
    function openEditDialog() {
        var list = $('<div class="menu-edit-list"></div>');
        var modes = ['default', 'icons', 'always'];
        var modeLabels = {default: 'Стандартний', icons: 'Тільки іконки', always: 'З текстом'};
        var currentMode = Lampa.Storage.get('buttons_viewmode', 'default');

        var modeBtn = $('<div class="selector viewmode-switch"><div style="text-align: center; padding: 1em;">Вид кнопок: ' + modeLabels[currentMode] + '</div></div>');
        modeBtn.on('hover:enter', function() {
            currentMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
            Lampa.Storage.set('buttons_viewmode', currentMode);
            $(this).find('div').text('Вид кнопок: ' + modeLabels[currentMode]);
            applyChanges();
        });
        list.append(modeBtn);

        currentButtons.forEach(function(btn) {
            var btnId = getButtonId(btn);
            var isHidden = getHiddenButtons().indexOf(btnId) !== -1;
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
                if (prev.length) { item.insertBefore(prev); updateOrderFromUI(); }
            });

            item.find('.move-down').on('hover:enter', function() {
                var next = item.next('.menu-edit-list__item');
                if (next.length) { item.insertAfter(next); updateOrderFromUI(); }
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

        function updateOrderFromUI() {
            var order = [];
            list.find('.menu-edit-list__item').each(function() {
                var currentTitle = $(this).find('.menu-edit-list__title').text().replace(/\s+/g, '_');
                // Знаходимо ID за текстом або класом
                var foundBtn = currentButtons.find(function(b) { return getButtonId(b).indexOf(currentTitle) !== -1; });
                if (foundBtn) order.push(getButtonId(foundBtn));
            });
            setCustomOrder(order);
            applyChanges();
        }

        // ПУНКТ РОЗМІР КНОПОК
        var scales = ['0.8', '0.9', '1.0', '1.1', '1.2'];
        var scaleLabels = {'0.8': 'Дуже малі', '0.9': 'Малі', '1.0': 'Норма', '1.1': 'Великі', '1.2': 'Макс'};
        var currentScale = getButtonScale();
        var scaleBtn = $('<div class="selector viewmode-switch" style="background: rgba(255,255,255,0.05); margin-top: 10px;"><div style="text-align: center; padding: 1em;">Розмір кнопок: ' + scaleLabels[currentScale] + '</div></div>');
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
            location.reload();
        });
        list.append(resetBtn);

        Lampa.Modal.open({ 
            title: 'Редактор кнопок', 
            html: list, 
            size: 'small',
            onBack: function() {
                Lampa.Modal.close();
                setTimeout(function() { Lampa.Controller.toggle('full_start'); }, 100);
            }
        });
    }

    function init() {
        var style = $('<style>' +
            '.menu-edit-list__item { display: grid; grid-template-columns: 2.5em 1fr 2.4em 2.4em 2.4em 2.4em; align-items: center; gap: 0.5em; padding: 0.3em 0; border-bottom: 1px dashed rgba(255,255,255,0.1); }' +
            '.menu-edit-list__icon svg { width: 1.4em; height: 1.4em; }' +
            '.menu-edit-list__item-hidden { opacity: 0.3; }' +
            '.selector.focus { border-radius: 4px; background: rgba(255,255,255,0.1) !important; }' +
            '.viewmode-switch { background: rgba(66, 133, 244, 0.2); margin-bottom: 5px; border-radius: 4px; }' +
            '.folder-reset-button { background: rgba(200, 50, 50, 0.2); margin-top: 10px; border-radius: 4px; }' +
            '.full-start-new__buttons { --btn-scale: 1.0; display: flex !important; flex-wrap: wrap !important; gap: 8px !important; }' +
            '.full-start-new__buttons .full-start__button { transform: scale(var(--btn-scale)); transform-origin: left center; }' +
            '.icons-only span { display: none !important; }' +
            '.always-text span { display: block !important; }' +
            '.full-start__button.hidden { display: none !important; }' +
            '</style>');
        $('body').append(style);

        Lampa.Listener.follow('full', function(e) {
            if (e.type !== 'complite') return;
            currentContainer = e.object.activity.render();
            var target = currentContainer.find('.full-start-new__buttons');
            
            if (target.length && !currentContainer.data('buttons-processed')) {
                currentContainer.data('buttons-processed', true);
                
                // Кнопка редагування (іконка олівця)
                var editBtn = $('<div class="full-start__button selector button--edit-order"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.5em; height:1.5em;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></div>');
                editBtn.on('hover:enter', openEditDialog);
                target.append(editBtn);

                applyChanges();
                setTimeout(function() { Lampa.Controller.toggle('full_start'); }, 200);
            }
        });
    }

    init();
})();
