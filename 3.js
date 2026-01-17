(function () {
    'use strict';

    // 1. Додаємо пункт у налаштування
    Lampa.SettingsApi.add({
        title: 'Моя Головна',
        component: 'my_main_page',
        icon: '<svg height="36" viewBox="0 0 24 24" width="36"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="white"/></svg>',
        onRender: function (item) {
            // Опис розділу
            item.append('<div class="settings-param__descr">Вкажіть назви через кому у потрібному порядку. <br>Доступні: <b>Продовжити, Тренди, Фільми, Серіали, Новинки</b>. Видаліть назву, щоб приховати рядок.</div>');
            
            // Створюємо поле для введення
            var input = Lampa.Settings.main().render().find('.settings-param'); // шаблон
            
            Lampa.Settings.add({
                name: 'my_main_order',
                type: 'input',
                default: 'Продовжити, Тренди, Фільми, Серіали, Новинки',
                placeholder: 'Наприклад: Продовжити, Тренди',
                title: 'Порядок та видимість',
                value: Lampa.Storage.get('my_main_order', 'Продовжити, Тренди, Фільми, Серіали, Новинки')
            });
        }
    });

    function start() {
        var originalCall = Lampa.ContentRows.call;

        Lampa.ContentRows.call = function (screen, params, calls) {
            if (screen === 'main') {
                var orderRaw = Lampa.Storage.get('my_main_order', 'Продовжити, Тренди, Фільми, Серіали, Новинки');
                var order = orderRaw.split(',').map(function(s) { return s.trim().toLowerCase(); });
                
                var copy_calls = [].concat(calls);
                calls.length = 0; // Очищуємо головну

                // Словник стандартних рядків за назвами
                var map = {
                    'тренди': copy_calls[0],
                    'фільми': copy_calls[1],
                    'серіали': copy_calls[2],
                    'новинки': copy_calls[3]
                };

                // Функція для рядка "Продовжити"
                var continueFunc = function (call) {
                    var items = Lampa.Favorite.continues('movie');
                    if (items.length > 0) {
                        call({
                            results: items,
                            title: Lampa.Lang.translate('title_continue')
                        });
                    } else {
                        call({ results: [] }); // Якщо порожньо - не малюємо
                    }
                };

                // Будуємо головну згідно з налаштуваннями
                order.forEach(function(name) {
                    if (name === 'продовжити') {
                        calls.push(continueFunc);
                    } else if (map[name]) {
                        calls.push(map[name]);
                    }
                });
            }

            originalCall.apply(this, arguments);
        };
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
