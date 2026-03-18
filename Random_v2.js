(function () {
    'use strict';

    var PLUGIN_ID = 'lampa_random_premium';

    if (window[PLUGIN_ID]) return;
    window[PLUGIN_ID] = true;

    var STORAGE_KEY = 'lampa_random_selected_genres';

    var ALL_GENRES = {
        28: 'Бойовик',
        12: 'Пригоди',
        16: 'Мультфільм',
        35: 'Комедія',
        80: 'Кримінал',
        99: 'Документальний',
        18: 'Драма',
        10751: 'Сімейний',
        14: 'Фентезі',
        36: 'Історія',
        27: 'Жахи',
        10402: 'Music',
        9648: 'Містика',
        10749: 'Мелодрама',
        878: 'Фантастика',
        53: 'Трилер',
        10752: 'Військовий',
        37: 'Вестерн'
    };

    function tr(uk, ru) {
        return Lampa.Storage.get('language', 'uk') === 'uk' ? uk : ru;
    }

    function getSelectedGenres() {
        var saved = Lampa.Storage.get(STORAGE_KEY);
        if (!saved || !Array.isArray(saved)) return Object.keys(ALL_GENRES);
        return saved;
    }

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
            onSelect: function (item) {
                var current = getSelectedGenres();
                var index = current.indexOf(item.value);

                if (index > -1) current.splice(index, 1);
                else current.push(item.value);

                Lampa.Storage.set(STORAGE_KEY, current);
                showGenreSettings();
            },
            onBack: function() {
                Lampa.Controller.toggle('content');
            }
        });
    }

    function getRandomUrl() {
        var genres = getSelectedGenres();
        if (!genres.length) genres = Object.keys(ALL_GENRES);

        var random_genre = genres[Math.floor(Math.random() * genres.length)];
        var page = Math.floor(Math.random() * 25) + 1;
        var type = Math.random() > 0.3 ? 'movie' : 'tv';
        var lang = Lampa.Storage.get('language', 'uk') === 'uk' ? 'uk-UA' : 'ru-RU';

        return 'discover/' + type +
            '?with_genres=' + random_genre +
            '&vote_average.gte=6.5' +
            '&vote_count.gte=300' +
            '&page=' + page +
            '&language=' + lang;
    }

    function addMenuItem() {
        var menuList = $('.menu .menu__list');
        if (!menuList.length) return;

        // якщо вже є — нічого не робимо
        if (menuList.find('[data-plugin="' + PLUGIN_ID + '"]').length) return;

        var menu_item = $('<li class="menu__item selector" data-plugin="' + PLUGIN_ID + '">' +
            '<div class="menu__ico">' +
            '<svg width="24" height="24" viewBox="0 0 24 24">' +
            '<rect x="3" y="3" width="18" height="18" rx="2" stroke="white" stroke-width="2"/>' +
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

        menu_item.on('hover:long', function () {
            showGenreSettings();
        });

        menuList.append(menu_item);
    }

    // 🧠 debounce щоб не було спаму
    var timer = null;

    function observeMenu() {
        var target = document.querySelector('.menu');

        if (!target) {
            setTimeout(observeMenu, 500);
            return;
        }

        var observer = new MutationObserver(function () {
            clearTimeout(timer);
            timer = setTimeout(addMenuItem, 200);
        });

        observer.observe(target, {
            childList: true,
            subtree: true
        });
    }

    function startPlugin() {
        setTimeout(addMenuItem, 300);

        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                setTimeout(addMenuItem, 300);
            }
        });

        observeMenu();
    }

    if (window.Lampa) {
        startPlugin();
    }

})();
