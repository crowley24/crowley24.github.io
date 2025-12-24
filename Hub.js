(function () {
    'use strict';

    var plugin = {
        name: 'Static Content Hub',
        version: '1.0.1',
        description: 'Додає 10 фіксованих секцій. Не містить налаштувань для обходу UI-помилки.'
    };

    // Фіксований список секцій та їхній порядок
    const SECTIONS_DATA = [
        { id: 'trending_day_all', title: 'В Тренді Сьогодні (Усе)', api_path: 'trending/all/day', line_type: 'wide' },
        { id: 'netflix_popular', title: 'Netflix: Популярні (ТВ)', api_path: 'discover/tv?with_networks=213&sort_by=popularity.desc', line_type: 'small' },
        { id: 'hbo_top', title: 'HBO Max: Рейтингові (ТВ)', api_path: 'discover/tv?with_networks=49&sort_by=vote_average.desc&vote_count.gte=500', line_type: 'small' },
        { id: 'top_rus_movie', title: 'Топ Російські Фільми', api_path: 'discover/movie?with_original_language=ru&sort_by=vote_average.desc&vote_count.gte=1000', line_type: 'full' },
        { id: 'dorams_top', title: 'Дорами: Топ-Рейтинг', api_path: 'discover/tv?with_genres=18&with_original_language=ko&sort_by=vote_average.desc&vote_count.gte=500', line_type: 'small' },
        { id: 'family_animation', title: 'Сімейна Анімація', api_path: 'discover/movie?with_genres=16&without_genres=99,10755,10765&sort_by=popularity.desc', line_type: 'small' },
        { id: 'upcoming_films', title: 'Незабаром у Кіно', api_path: 'movie/upcoming', line_type: 'wide' },
        { id: 'prime_video_new', title: 'Prime Video: Новинки', api_path: 'discover/movie?with_networks=1024&sort_by=release_date.desc', line_type: 'full' },
        { id: 'kinopoisk_films', title: 'Фільми (Kinopoisk Top)', api_path: 'discover/movie?vote_average.gte=7&vote_count.gte=1000&with_original_language=ru|en&sort_by=vote_average.desc', line_type: 'small' },
        { id: 'top_movie_week', title: 'Тренди Тижня (Фільми)', api_path: 'trending/movie/week', line_type: 'full' },
    ];
    
    // Функція, що рендерить одну секцію
    function renderSection(section) {
        const object_type = section.api_path.includes('/movie') ? 'movie' : 'tv';
        
        const list = new Lampa.List.list(section.title, section.api_path, {
            card_type: object_type,
            line_type: section.line_type || 'small',
            object_type: object_type
        });

        const activeActivity = Lampa.Activity.active();
        
        if (activeActivity && activeActivity.name === 'home') {
            activeActivity.append(list.render({
                method: 'append',
                url: section.api_path,
                title: section.title,
                slice: 18
            }));
        }
    }

    // Головна функція рендерингу всіх секцій
    function customRender() {
        const activeActivity = Lampa.Activity.active();
        
        if (activeActivity && activeActivity.name === 'home' && !activeActivity.static_sections_added) {
            
            // Просто додаємо всі секції у фіксованому порядку
            SECTIONS_DATA.forEach(renderSection);
            activeActivity.static_sections_added = true; 
            
            if(Lampa.Controller && Lampa.Controller.enabled()) Lampa.Controller.toggle('content');
        }
    }

    function start() {
        console.log(`[${plugin.name} v${plugin.version}] loaded.`);
        
        // Підключаємося до події готовності контенту
        Lampa.Listener.follow('content_ready', (event) => {
            if (event.name === 'home') {
                setTimeout(customRender, 100); 
            }
        });
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                start();
            }
        });
    }
})();

