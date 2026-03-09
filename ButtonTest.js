(function () {
    'use strict';

    // 1. Додаємо стилі для меню та розмірів кнопок
    var style = `
        <style>
            .full-start-new__buttons.size-s .full-start__button { font-size: 12px !important; padding: 0.5em 1em !important; }
            .full-start-new__buttons.size-m .full-start__button { font-size: 14px !important; padding: 0.7em 1.2em !important; }
            .full-start-new__buttons.size-l .full-start__button { font-size: 18px !important; padding: 1em 1.6em !important; }

            .button--edit-settings { display: flex !important; align-items: center; justify-content: center; }
            .button--edit-settings svg { width: 1.5em; height: 1.5em; }

            /* Стилі для покращеного меню налаштувань */
            .custom-button-item { 
                display: flex; 
                align-items: center; 
                justify-content: space-between; 
                width: 100%; 
                padding: 5px 0;
            }
            .custom-button-item__content { 
                display: flex; 
                align-items: center; 
            }
            .custom-button-item__icon { 
                width: 1.8em; 
                height: 1.8em; 
                margin-right: 15px; 
                display: flex; 
                align-items: center; 
                justify-content: center;
            }
            .custom-button-item__icon svg { 
                width: 100%; 
                height: 100%; 
                fill: #fff !important; 
            }
            .custom-button-item__edit-icon { 
                color: #ffde1a !important; 
                font-size: 1.2em; 
                opacity: 0.9;
            }
        </style>
    `;
    $('body').append(style);

    // Функція зміни назви
    function runRename(item, container, btn) {
        Lampa.Input.edit({
            value: item.title_raw,
            title: 'Нова назва'
        }, function(new_name) {
            if (new_name) {
                Lampa.Storage.set('custom_label_' + item.className, new_name);
                container.find('.' + item.className + ' span').text(new_name);
            }
            Lampa.Controller.focus(btn[0]);
        });
    }

    // Функція вибору розміру
    function runSizeSelection(container, btn) {
        var current = Lampa.Storage.get('buttons_size', 'size-m');
        var sizes = [
            { title: 'Малий', value: 'size-s' },
            { title: 'Стандартний', value: 'size-m' },
            { title: 'Великий', value: 'size-l' }
        ];

        var sizeItems = sizes.map(function(s) {
            return {
                title: s.title,
                icon: s.value === current ? 'check' : '',
                value: s.value
            };
        });

        Lampa.Select.show({
            title: 'Оберіть розмір',
            items: sizeItems,
            onSelect: function(item) {
                var group = container.find('.full-start-new__buttons');
                group.removeClass('size-s size-m size-l').addClass(item.value);
                Lampa.Storage.set('buttons_size', item.value);
                Lampa.Controller.focus(btn[0]);
            },
            onBack: function() { Lampa.Controller.focus(btn[0]); }
        });
    }

    // Головне вікно налаштувань
    function openMenu(container, btn) {
        var items = [];

        // Збираємо всі існуючі кнопки
        container.find('.full-start__button').not('.button--edit-settings').each(function() {
            var el = $(this);
            var className = el.attr('class').split(' ').find(c => c.includes('--')) || 'default';
            var currentName = Lampa.Storage.get('custom_label_' + className, el.find('span').text().trim());
            
            // Клонуємо іконку та готуємо її для меню
            var iconSvg = el.find('svg').clone();
            iconSvg.css('fill', '#fff'); 
            var iconHtml = iconSvg.prop('outerHTML') || '';

            items.push({
                title: currentName,
                html: `
                    <div class="custom-button-item">
                        <div class="custom-button-item__content">
                            <div class="custom-button-item__icon">${iconHtml}</div>
                            <span>${currentName || 'Без назви'}</span>
                        </div>
                        <i class="custom-button-item__edit-icon">edit</i>
                    </div>
                `,
                action: 'rename',
                className: className,
                title_raw: currentName
            });
        });

        // Додаємо розділ розміру
        items.push({
            title: 'Розмір кнопок',
            icon: 'settings_overscan',
            action: 'size'
        });

        Lampa.Select.show({
            title: 'Налаштування кнопок',
            items: items,
            onSelect: function(item) {
                if (item.action === 'rename') runRename(item, container, btn);
                else if (item.action === 'size') runSizeSelection(container, btn);
            },
            onBack: function() {
                Lampa.Controller.focus(btn[0]);
            }
        });
    }

    // Слухач завантаження картки
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            var container = e.object.activity.render();
            var group = container.find('.full-start-new__buttons');
            
            setTimeout(function() {
                // Застосовуємо збережені налаштування
                group.addClass(Lampa.Storage.get('buttons_size', 'size-m'));
                group.find('.full-start__button').each(function() {
                    var el = $(this);
                    var className = el.attr('class').split(' ').find(c => c.includes('--'));
                    if (className) {
                        var saved = Lampa.Storage.get('custom_label_' + className);
                        if (saved) el.find('span').text(saved);
                    }
                });
            }, 60);

            // Кнопка виклику налаштувань
            var btn = $(`
                <div class="full-start__button selector button--edit-settings">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </div>
            `);

            btn.on('hover:enter', function () { openMenu(container, btn); });
            group.append(btn);
        }
    });
})();
