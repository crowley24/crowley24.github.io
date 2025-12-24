(function () {
    'use strict';

    var plugin = {
        name: 'Universal Content Hub',
        version: '2.0.0',
        description: 'Розширене керування секціями на головному екрані (для Lampa 3.0+)'
    };

    const KEY_PREFIX = 'uch_'; // Новий унікальний префікс для обходу старих помилок
    const SETTINGS_COMPONENT = 'universal_hub_settings';
    
    // Список секцій, які ми додаємо
    const SECTIONS_DATA = [
        { id: 'trending_day_all', title: 'В Тренді Сьогодні (Усе)', api_path: 'trending/all/day', default_order: 10, line_type: 'wide' },
        { id: 'netflix_popular', title: 'Netflix: Популярні (ТВ)', api_path: 'discover/tv?with_networks=213&sort_by=popularity.desc', default_order: 20, line_type: 'small' },
        { id: 'hbo_top', title: 'HBO Max: Рейтингові (ТВ)', api_path: 'discover/tv?with_networks=49&sort_by=vote_average.desc&vote_count.gte=500', default_order: 30, line_type: 'small' },
        { id: 'top_rus_movie', title: 'Топ Російські Фільми', api_path: 'discover/movie?with_original_language=ru&sort_by=vote_average.desc&vote_count.gte=1000', default_order: 40, line_type: 'full' },
        { id: 'dorams_top', title: 'Дорами: Топ-Рейтинг', api_path: 'discover/tv?with_genres=18&with_original_language=ko&sort_by=vote_average.desc&vote_count.gte=500', default_order: 50, line_type: 'small' },
        { id: 'family_animation', title: 'Сімейна Анімація', api_path: 'discover/movie?with_genres=16&without_genres=99,10755,10765&sort_by=popularity.desc', default_order: 60, line_type: 'small' },
        { id: 'upcoming_films', title: 'Незабаром у Кіно', api_path: 'movie/upcoming', default_order: 70, line_type: 'wide' },
        { id: 'prime_video_new', title: 'Prime Video: Новинки', api_path: 'discover/movie?with_networks=1024&sort_by=release_date.desc', default_order: 80, line_type: 'full' },
        { id: 'kinopoisk_films', title: 'Фільми (Kinopoisk Top)', api_path: 'discover/movie?vote_average.gte=7&vote_count.gte=1000&with_original_language=ru|en&sort_by=vote_average.desc', default_order: 90, line_type: 'small' },
        { id: 'top_movie_week', title: 'Тренди Тижня (Фільми)', api_path: 'trending/movie/week', default_order: 100, line_type: 'full' },
    ];

    function storageGet(key, def) {
        try { return Lampa.Storage.get(key, def); } catch (e) { return def; }
    }
    
    function getActiveSections() {
        return SECTIONS_DATA
            .map(section => {
                const isRemoved = storageGet(KEY_PREFIX + section.id + '_remove', 0) == 1;
                const order = parseInt(storageGet(KEY_PREFIX + section.id + '_order', section.default_order), 10) || section.default_order;
                
                return { ...section, isRemoved, order };
            })
            .filter(section => !section.isRemoved)
            .sort((a, b) => a.order - b.order);
    }

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

    function customRender() {
        const sections = getActiveSections();
        const activeActivity = Lampa.Activity.active();
        
        if (activeActivity && activeActivity.name === 'home' && !activeActivity.custom_sections_added) {
            
            if (sections.length === 0) {
                Lampa.Noty.show('Немає активних секцій для відображення. Перевірте налаштування.', 3000);
                return;
            }

            sections.forEach(renderSection);
            activeActivity.custom_sections_added = true; 
            
            if(Lampa.Controller && Lampa.Controller.enabled()) Lampa.Controller.toggle('content');
        }
    }

    function addSettings() {
        if (!Lampa.SettingsApi) return;
        
        Lampa.SettingsApi.addComponent({
            component: SETTINGS_COMPONENT,
            name: plugin.name,
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.41-7-7.38 0-2.31 1.03-4.37 2.64-5.74L11 11.66v8.27zm-1.07-8.31l-3.6-3.6C7.39 6.88 9.53 6 12 6c3.04 0 5.68 1.44 7.37 3.66L10.93 11.62zM19.08 14c-.11.83-.45 1.6-1 2.22l-3.67-3.67 4.67-.55zM12 4.07V11.5l3.6-3.6C14.07 5.17 12.06 4.14 12 4.07z" fill="currentColor"/></svg>`
        });
        
        SECTIONS_DATA.forEach(section => {
            const groupName = section.title;

            Lampa.SettingsApi.addParam({
                component: SETTINGS_COMPONENT,
                param: {
                    name: KEY_PREFIX + section.id + '_order',
                    type: 'input',
                    default: String(section.default_order), 
                    placeholder: String(section.default_order),
                    comment: 'Позиція на головному екрані (число)'
                },
                field: {
                    name: `Порядок: ${groupName}`,
                    description: `Встановіть порядковий номер для ${groupName}.`
                }
            });

            Lampa.SettingsApi.addParam({
                component: SETTINGS_COMPONENT,
                param: {
                    name: KEY_PREFIX + section.id + '_remove',
                    type: 'select',
                    values: {0: 'Показувати', 1: 'Приховати'},
                    default: 0
                },
                field: {
                    name: `Видимість: ${groupName}`,
                    description: `Показати або приховати секцію ${groupName}.`
                }
            });
        });

        Lampa.Listener.follow('settings', (event) => {
            if (event.component === SETTINGS_COMPONENT && event.name === 'save') {
                const activeActivity = Lampa.Activity.active();
                if(activeActivity && activeActivity.name === 'home') {
                    activeActivity.custom_sections_added = false; 
                    Lampa.Activity.replace(activeActivity); 
                }
            }
        });
    }

    function start() {
        console.log(`[${plugin.name} v${plugin.version}] loaded.`);
        
        Lampa.Storage.listener.follow('ready', addSettings);
        addSettings();

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

