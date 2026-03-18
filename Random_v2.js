(function () {
    'use strict';

    var PLUGIN_ID = 'lampa_random_premium';
    var STORAGE_KEY = 'lampa_random_selected_genres';

    // Повний список жанрів TMDB для вибору
    var ALL_GENRES = {
        28: 'Бойовик', 12: 'Пригоди', 16: 'Мультфільм', 35: 'Комедія', 80: 'Кримінал',
        99: 'Документальний', 18: 'Драма', 10751: 'Сімейний', 14: 'Фентезі', 36: 'Історія',
        27: 'Жахи', 10402: 'Музика', 9648: 'Містика', 10749: 'Мелодрама', 878: 'Фантастика',
        53: 'Трилер', 10752: 'Військовий', 37: 'Вестерн'
    };

    function tr(uk, ru) {
        return Lampa.Storage.get('language', 'uk') === 'uk' ? uk : ru;
    }

    // Отримання обраних жанрів (або всі за замовчуванням)
    function getSelectedGenres() {
        var saved = Lampa.Storage.get(STORAGE_KEY, 'all');
        return saved === 'all' ? Object.keys(ALL_GENRES) : saved;
    }

    // Вікно вибору жанрів
    function showGenreSettings() {
        var selected = getSelectedGenres();
        var items = Object.keys(ALL_GENRES).map(function(id) {
            return {
                title: ALL_GENRES[id],
                value: id,
                selected: selected.indexOf(id) !== -1
            };
        });

        Lampa.Select.show({
            title: tr('Оберіть жанри', 'Выберите жанры'),
            items: items,
            multiselect: true,
            onSelect: function (result) {
                var new_selection = result.map(function(i) { return i.value; });
                Lampa.Storage.set(STORAGE_KEY, new_selection.length ? new_selection : 'all');
                Lampa.Noty.show(tr('Налаштування збережено', 'Настройки сохранены'));
                Lampa.Controller.toggle('content');
            },
            onBack: function() {
                Lampa.Controller.toggle('content');
            }
        });
    }

    function getRandomUrl() {
        var genres = getSelectedGenres();
        var random_genre = genres[Math.floor(Math.random() * genres.length)];
        var page = Math.floor(Math.random() * 30) + 1;
        var type = Math.random() > 0.3 ? 'movie' : 'tv';
        
        return 'discover/' + type + '?with_genres=' + random_genre + 
               '&vote_average.gte=6.5&vote_count.gte=300' +
               '&page=' + page + 
               '&language=' + (Lampa.Storage.get('language', 'uk') === 'uk' ? 'uk-UA' : 'ru-RU');
    }

    function addMenuItem() {
        // Перевірка на дублікат
        if ($('.menu .menu__list [data-plugin="' + PLUGIN_ID + '"]').length) return;

        var menu_item = $('<li class="menu__item selector" data-plugin="' + PLUGIN_ID + '">' +
            '<div class="menu__ico">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                    '<rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2"/>' +
                    '<circle cx="8" cy="8" r="1.5" fill="white"/><circle cx="16" cy="16" r="1.5" fill="white"/>' +
                    '<circle cx="12" cy="12" r="1.5" fill="white"/><circle cx="8" cy="16" r="1.5" fill="white"/>' +
                    '<circle cx="16" cy="8" r="1.5" fill="white"/>' +
                '</svg>' +
            '</div>' +
            '<div class="menu__text">' + tr('Випадкова добірка', 'Мне повезёт') + '</div>' +
        '</li>');

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: getRandomUrl(),
                title: tr('Випадкова добірка', 'Мне повезёт'),
                component: 'category_full',
                source: 'tmdb',
                card_type: true
            });
        });

        // Додаємо можливість викликати налаштування через контекстне меню (довге натискання)
        menu_item.on('hover:long', function() {
            showGenreSettings();
        });

        $('.menu .menu__list').append(menu_item);
    }

    // Ініціалізація з очисткою старих ітерацій
    function init() {
        if (window.appready) {
            addMenuItem();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') addMenuItem();
            });
        }
    }

    if (window.Lampa) {
        init();
    }
})();
