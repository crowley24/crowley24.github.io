(function () {
    'use strict';

    // 1. Додаємо стилі в систему
    var style = `
        <style>
            .full-start-new__buttons.size-s .full-start__button { 
                font-size: 12px !important; 
                padding: 0.5em 1em !important; 
            }
            .full-start-new__buttons.size-m .full-start__button { 
                font-size: 14px !important; 
                padding: 0.7em 1.2em !important; 
            }
            .full-start-new__buttons.size-l .full-start__button { 
                font-size: 18px !important; 
                padding: 1em 1.6em !important; 
            }
        </style>
    `;
    $('body').append(style);

    // 2. Функція створення меню
    function openMenu(container, btn) {
        var items = [
            { title: 'Малий розмір', value: 'size-s' },
            { title: 'Стандартний розмір', value: 'size-m' },
            { title: 'Великий розмір', value: 'size-l' }
        ];

        Lampa.Select.show({
            title: 'Розмір кнопок',
            items: items,
            onSelect: function (item) {
                var group = container.find('.full-start-new__buttons');
                group.removeClass('size-s size-m size-l').addClass(item.value);
                Lampa.Storage.set('buttons_size', item.value);
                
                // Повертаємо фокус на кнопку
                Lampa.Controller.focus(btn);
            },
            onBack: function(){
                Lampa.Controller.focus(btn);
            }
        });
    }

    // 3. Основна логіка додавання кнопки
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            var container = e.object.activity.render();
            var group = container.find('.full-start-new__buttons');
            
            // Застосовуємо збережений розмір
            var saved = Lampa.Storage.get('buttons_size', 'size-m');
            group.addClass(saved);

            // Створюємо кнопку "Налаштувати"
            var btn = $('<div class="full-start__button selector"><span>Налаштувати</span></div>');
            
            btn.on('hover:enter', function () {
                openMenu(container, btn);
            });

            group.append(btn);
        }
    });
})();

