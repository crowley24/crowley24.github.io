(function () {
    'use strict';

    // Конфігурація преміального фільтру
    var CONFIG = {
        min_vote: 6.5,
        min_count: 300,
        genres: [28, 12, 16, 35, 80, 18, 27, 9648, 878, 53], // Популярні жанри
        total_pages: 50 // Обмеження сторінок для релевантності
    };

    function tr(uk, ru) {
        return Lampa.Storage.get('language', 'uk') === 'uk' ? uk : ru;
    }

    function getRandomDiscoveryUrl() {
        var genre = CONFIG.genres[Math.floor(Math.random() * CONFIG.genres.length)];
        var page = Math.floor(Math.random() * CONFIG.total_pages) + 1;
        var type = Math.random() > 0.3 ? 'movie' : 'tv'; // 70% фільми, 30% серіали
        
        // Формуємо запит до TMDB через проксі Lampa
        return 'discover/' + type + '?with_genres=' + genre + 
               '&vote_average.gte=' + CONFIG.min_vote + 
               '&vote_count.gte=' + CONFIG.min_count + 
               '&page=' + page + 
               '&language=' + (Lampa.Storage.get('language', 'uk') === 'uk' ? 'uk-UA' : 'ru-RU');
    }

    function openRandomSelection() {
        var url = getRandomDiscoveryUrl();
        
        Lampa.Activity.push({
            url: url,
            title: tr('Випадкова добірка', 'Мне повезёт'),
            component: 'category_full',
            source: 'tmdb',
            card_type: true,
            page: 1
        });
    }

    function addMenuItem() {
        var menu_item = $('<li class="menu__item selector">' +
            '<div class="menu__ico">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                    '<path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" stroke="white" stroke-width="2"/>' +
                    '<circle cx="7.5" cy="7.5" r="1.5" fill="white"/>' +
                    '<circle cx="16.5" cy="16.5" r="1.5" fill="white"/>' +
                    '<circle cx="12" cy="12" r="1.5" fill="white"/>' +
                    '<circle cx="7.5" cy="16.5" r="1.5" fill="white"/>' +
                    '<circle cx="16.5" cy="7.5" r="1.5" fill="white"/>' +
                '</svg>' +
            '</div>' +
            '<div class="menu__text">' + tr('Випадкова добірка', 'Мне повезёт') + '</div>' +
        '</li>');

        menu_item.on('hover:enter', function () {
            openRandomSelection();
        });

        // Додаємо в кінець списку меню
        $('.menu .menu__list').append(menu_item);
    }

    // Ініціалізація
    function init() {
        if (window.appready) {
            addMenuItem();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') addMenuItem();
            });
        }
    }

    // Запуск плагіна
    if (window.Lampa) {
        init();
    }
})();
