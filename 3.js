(function () {
    'use strict';

    function start() {
        // 1. Створюємо розділ у налаштуваннях
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                var item = $('<div class="settings-param selector" data-type="button" data-name="my_main_order_setup">' +
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
                            Lampa.Noty.show('Налаштування збережено. Перезавантажте додаток.');
                        }
                    });
                });

                e.body.find('.settings-list').append(item);
            }
        });

        // 2. Логіка сортування рядків
        var originalCall = Lampa.ContentRows.call;

        Lampa.ContentRows.call = function (screen, params, calls) {
            if (screen === 'main') {
                var orderRaw = Lampa.Storage.get('my_main_order', 'Продовжити, Тренди, Фільми, Серіали, Новинки');
                var order = orderRaw.split(',').map(function (s) { return s.trim().toLowerCase(); });

                var copy_calls = [].concat(calls);
                calls.length = 0;

                // Мапа стандартних викликів (за індексами TMDB)
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
                        // Якщо немає що продовжувати, передаємо порожній результат
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
