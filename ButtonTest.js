(function () {
    'use strict';

    // 1. Стилі для розмірів та анімації кнопки
    var style = `
        <style>
            /* Пресети розмірів для всієї групи кнопок */
            .full-start-new__buttons.size-s .full-start__button { font-size: 12px !important; padding: 0.5em 1em !important; }
            .full-start-new__buttons.size-m .full-start__button { font-size: 14px !important; padding: 0.7em 1.2em !important; }
            .full-start-new__buttons.size-l .full-start__button { font-size: 18px !important; padding: 1em 1.6em !important; }

            /* Стиль нашої кнопки налаштувань */
            .button--edit-settings {
                display: flex !important;
                align-items: center;
                justify-content: center;
            }
            .button--edit-settings span {
                display: none; /* Текст прихований за замовчуванням */
                margin-left: 8px;
            }
            .button--edit-settings.focus span {
                display: inline-block; /* Миттєва поява тексту при фокусі */
            }
            .button--edit-settings svg {
                width: 1.5em;
                height: 1.5em;
            }
        </style>
    `;
    $('body').append(style);

    // 2. Функція відкриття меню вибору
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
                
                Lampa.Controller.focus(btn[0]); // Виправлений фокус
            },
            onBack: function(){
                Lampa.Controller.focus(btn[0]);
            }
        });
    }

    // 3. Слухач відкриття картки фільму
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            var container = e.object.activity.render();
            var group = container.find('.full-start-new__buttons');
            
            // Застосовуємо збережений розмір
            var saved = Lampa.Storage.get('buttons_size', 'size-m');
            group.addClass(saved);

            // Створюємо кнопку з іконкою
            var btn = $(`
                <div class="full-start__button selector button--edit-settings">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.24 2 14 2h-4c-.24 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.25.42.49.42h4c.24 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                    <span>Налаштувати</span>
                </div>
            `);
            
            btn.on('hover:enter', function () {
                openMenu(container, btn);
            });

            group.append(btn);
        }
    });
})();
