(function () {
    'use strict';

    function start() {
        // 1. Додавання пункту в налаштування (Розділ Інтерфейс)
        Lampa.Listener.follow('settings', function (e) {
            if (e.type === 'open' && e.name === 'interface') {
                var body = e.body;
                var item = $('<div class="settings-param selector" data-type="button">' +
                    '<div class="settings-param__name">Моя Головна</div>' +
                    '<div class="settings-param__value">Налаштувати порядок рядків</div>' +
                    '</div>');

                item.on('hover:enter', function () {
                    var current = Lampa.Storage.get('my_main_order', 'Продовжити, Тренди, Фільми, Серіали, Новинки');
                    
                    Lampa.Input.edit({
                        value: current,
                        title: 'Порядок рядків (через кому)',
                        free: true
                    }, function (new_value) {
                        if (new_value) {
                            Lampa.Storage.set('my_main_order', new_value);
                            Lampa.Noty.show('Збережено. Перезапустіть Lampa');
                        }
                    });
                });

                // Додаємо в кінець списку налаштувань інтерфейсу
                body.find('.settings-list').append(item);
                
                // Оновлюємо контролер, щоб новий пункт став клікабельним
                Lampa.Controller.enable('settings_interface');
            }
        });

        // 2. Логіка сортування (залишаємо без змін)
        var originalCall = Lampa.ContentRows.call;

        Lampa.ContentRows.call = function (screen, params, calls) {
            if (screen === 'main') {
                var orderRaw = Lampa.Storage.get('my_main_order', 'Продовжити, Тренди, Фільми, Серіали, Новинки');
                var order = orderRaw.split(',').map(function (s) { return s.trim().toLowerCase(); });

                var copy_calls = [].concat(calls);
                calls.length = 0;

                var map = {
                    'тренди': copy_calls[0],
                    'фільми': copy_calls[1],
                    'серіали': copy_calls[2],
                    'новинки': copy_calls[3]
                };

                var continueFunc = function (call) {
                    var items = Lampa.Favorite.continues('movie');
                    if (items.length > 0) {
                        call({
                            results: items,
                            title: Lampa.Lang.translate('title_continue')
                        });
                    } else {
                        call({ results: [] });
                    }
                };

                order.forEach(function (name) {
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
