(function () {
    'use strict';

    // 1. Стилі для розмірів кнопок
    var style = `
        <style>
            .full-start-new__buttons.size-s .full-start__button { font-size: 12px !important; padding: 0.4em 0.8em !important; }
            .full-start-new__buttons.size-m .full-start__button { font-size: 14px !important; padding: 0.6em 1.1em !important; }
            .full-start-new__buttons.size-l .full-start__button { font-size: 18px !important; padding: 0.9em 1.5em !important; }

            .button--edit-settings { display: flex !important; align-items: center; justify-content: center; min-width: 40px; }
            .button--edit-settings svg { width: 1.4em; height: 1.4em; }
        </style>
    `;
    $('body').append(style);

    // 2. Функція вибору розміру
    function runSizeSelection(container, btn) {
        var current = Lampa.Storage.get('buttons_size', 'size-m');
        var sizes = [
            { title: 'Малий', value: 'size-s' },
            { title: 'Стандартний', value: 'size-m' },
            { title: 'Великий', value: 'size-l' }
        ];

        var sizeItems = sizes.map(function(s) {
            return {
                // Додаємо ✅ прямо в текст назви, якщо цей розмір вибрано
                title: (s.value === current ? '✅ ' : '') + s.title,
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

    // 3. Функція перейменування
    function runRename(item, container, btn) {
        Lampa.Input.edit({
            value: item.title_raw,
            title: 'Нова назва для ' + item.title_raw
        }, function(new_name) {
            if (new_name) {
                Lampa.Storage.set('custom_label_' + item.className, new_name);
                container.find('.' + item.className + ' span').text(new_name);
            }
            Lampa.Controller.focus(btn[0]);
        });
    }

    // 4. Головне меню з символами замість іконок
    function openMenu(container, btn) {
        var items = [];

        container.find('.full-start__button').not('.button--edit-settings').each(function() {
            var el = $(this);
            var className = el.attr('class').split(' ').find(c => c.includes('--')) || 'default';
            var currentName = Lampa.Storage.get('custom_label_' + className, el.find('span').text().trim());

            items.push({
                // Використовуємо символ олівця ✎ прямо в тексті
                title: '✎ ' + currentName,
                action: 'rename',
                className: className,
                title_raw: currentName
            });
        });

        items.push({
            title: '📏 Розмір кнопок',
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

    // 5. Запуск плагіна
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
            }, 60);

            var btn = $(`
                <div class="full-start__button selector button--edit-settings">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-10c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>
                </div>
            `);

            btn.on('hover:enter', function () { openMenu(container, btn); });
            group.append(btn);
        }
    });
})();
