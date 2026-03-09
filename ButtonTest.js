(function () {
    'use strict';

    // 1. Стилі для розмірів кнопок та оформлення
    var style = `
        <style>
            .full-start-new__buttons.size-s .full-start__button { font-size: 12px !important; padding: 0.5em 1em !important; }
            .full-start-new__buttons.size-m .full-start__button { font-size: 14px !important; padding: 0.7em 1.2em !important; }
            .full-start-new__buttons.size-l .full-start__button { font-size: 18px !important; padding: 1em 1.6em !important; }

            .button--edit-settings { display: flex !important; align-items: center; justify-content: center; }
            .button--edit-settings svg { width: 1.5em; height: 1.5em; }
        </style>
    `;
    $('body').append(style);

    // 2. Функція вибору розміру (з галочкою ✅)
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
                icon: s.value === current ? 'check' : '', // Позначаємо вибраний пункт
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

    // 3. Функція перейменування кнопки
    function runRename(item, container, btn) {
        Lampa.Input.edit({
            value: item.title,
            title: 'Змінити назву'
        }, function(new_name) {
            if (new_name) {
                Lampa.Storage.set('custom_label_' + item.className, new_name);
                container.find('.' + item.className + ' span').text(new_name);
            }
            Lampa.Controller.focus(btn[0]);
        });
    }

    // 4. Головне вікно налаштувань
    function openMenu(container, btn) {
        var items = [];

        // Проходимо по кнопках і створюємо пункти меню
        container.find('.full-start__button').not('.button--edit-settings').each(function() {
            var el = $(this);
            var className = el.attr('class').split(' ').find(c => c.includes('--')) || 'default';
            var currentName = Lampa.Storage.get('custom_label_' + className, el.find('span').text().trim());

            items.push({
                title: currentName || 'Кнопка',
                icon: 'edit', // Тестуємо відображення стандартної іконки олівця
                action: 'rename',
                className: className
            });
        });

        // Пункт розміру в кінці списку
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
            onBack: function() { Lampa.Controller.focus(btn[0]); }
        });
    }

    // 5. Ініціалізація при завантаженні картки
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            var container = e.object.activity.render();
            var group = container.find('.full-start-new__buttons');
            
            setTimeout(function() {
                group.addClass(Lampa.Storage.get('buttons_size', 'size-m'));
                group.find('.full-start__button').each(function() {
                    var el = $(this);
                    var className = el.attr('class').split(' ').find(c => c.includes('--'));
                    if (className) {
                        var saved = Lampa.Storage.get('custom_label_' + className);
                        if (saved) el.find('span').text(saved);
                    }
                });
            }, 50);

            // Додаємо кнопку налаштувань (шестерню)
            var btn = $(`
                <div class="full-start__button selector button--edit-settings">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.24 2 14 2h-4c-.24 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.25.42.49.42h4c.24 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                </div>
            `);

            btn.on('hover:enter', function () { openMenu(container, btn); });
            group.append(btn);
        }
    });
})();
