(function () {
    'use strict';

    // Список доступних балансерів (можна редагувати)
    var my_balancers = [
        {title: 'Rezka', id: 'rezka'},
        {title: 'Filmix', id: 'filmix'},
        {title: 'VideoCDN', id: 'videocdn'},
        {title: 'Kinobase', id: 'kinobase'},
        {title: 'Alloha', id: 'alloha'},
        {title: 'Ashdi', id: 'ashdi'}
    ];

    function startPlugin() {
        // Додаємо вибір у налаштування Lampa (розділ Онлайн)
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name == 'online') {
                var current = Lampa.Storage.get('my_fav_balanser', 'rezka');
                var current_name = my_balancers.find(b => b.id == current)?.title || 'Rezka';

                var item = $(`<div class="settings-line selector">
                    <div class="settings-line__title">Основний балансер (Auto)</div>
                    <div class="settings-line__value">${current_name}</div>
                </div>`);

                item.on('hover:enter', function () {
                    Lampa.Select.show({
                        title: 'Виберіть основний балансер',
                        items: my_balancers,
                        onSelect: function (a) {
                            Lampa.Storage.set('my_fav_balanser', a.id);
                            item.find('.settings-line__value').text(a.title);
                            Lampa.Noty.show('Приоритет змінено на: ' + a.title);
                            Lampa.Select.close();
                        },
                        onBack: function () {
                            Lampa.Select.close();
                        }
                    });
                });

                e.body.append(item);
            }
        });

        // ЛОГІКА ЗАПАМ'ЯТОВУВАННЯ (взята з вашого коду)
        Lampa.Listener.follow('activity', function (e) {
            if (e.type == 'start' && e.component == 'online') {
                var fav = Lampa.Storage.get('my_fav_balanser', 'rezka');
                
                // 1. Оновлюємо глобальний активний балансер
                Lampa.Storage.set('online_balanser', fav);

                // 2. Оновлюємо кеш для конкретного фільму (як у вашому прикладі)
                if (e.object && e.object.movie) {
                    var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
                    last_select_balanser[e.object.movie.id] = fav;
                    Lampa.Storage.set('online_last_balanser', last_select_balanser);
                }
            }
        });
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') startPlugin();
        });
    }
})();

