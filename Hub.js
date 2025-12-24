(function () {
    'use strict';

    var plugin = {
        name: 'Standard Section Manager',
        version: '1.1.0',
        description: 'Управління порядком та видимістю стандартних секцій Lampa (Фінальна спроба з обходом UI-помилки).'
    };

    const KEY_PREFIX = 'ssm_';
    const SETTINGS_COMPONENT = 'lampa_standard_sections';
    const DEFAULT_ORDER = 999;

    // Секції, які ми перевизначаємо (їхній порядок і URL)
    const STANDARD_SECTIONS = [
        { id: 'trending_week', title: 'У тренді за тиждень', api_path: 'trending/all/week', default_order: 10, line_type: 'wide' },
        { id: 'trending_day', title: 'Сьогодні у тренді', api_path: 'trending/all/day', default_order: 20, line_type: 'wide' },
        { id: 'popular_movie', title: 'Популярні фільми', api_path: 'movie/popular', default_order: 30, line_type: 'small' },
        { id: 'popular_tv', title: 'Популярні серіали', api_path: 'tv/popular', default_order: 40, line_type: 'full' },
        { id: 'upcoming_movie', title: 'Очікувані фільми', api_path: 'movie/upcoming', default_order: 50, line_type: 'wide' },
        
        // Ці секції вимагають складної логіки Lampa, тому ми використовуємо схожі TMDB API:
        { id: 'now_watching', title: 'Зараз дивляться (TMDB)', api_path: 'movie/now_playing', default_order: 60, line_type: 'small' },
        { id: 'movie_now_playing', title: 'Дивіться у кінозалах (TMDB)', api_path: 'movie/now_playing', default_order: 70, line_type: 'wide' },
        // Примітка: Секція 'Вихід найближчих епізодів' надто складна для відтворення
    ];

    function storageGet(key, def) {
        try { return Lampa.Storage.get(key, def); } catch (e) { return def; }
    }

    // 1. Створюємо конфігурацію на основі налаштувань користувача
    function getSectionConfig() {
        return STANDARD_SECTIONS
            .map(section => {
                // Виправлення: Тепер використовуємо Toggle (0 або 1)
                const isRemoved = storageGet(KEY_PREFIX + section.id + '_remove', 0) == 1; 
                // Обов'язкове поле введення для порядку
                const order = parseInt(storageGet(KEY_PREFIX + section.id + '_order', section.default_order), 10) || DEFAULT_ORDER;
                
                return { ...section, isRemoved, order };
            })
            .sort((a, b) => a.order - b.order);
    }
    
    // 2. Функція, що замінює стандартний рендеринг секцій
    function customSectionRender(config) {
        const activeActivity = Lampa.Activity.active();
        
        if (activeActivity && activeActivity.name === 'home' && !activeActivity.ssm_sections_modified) {
            
            // КРИТИЧНИЙ ЕТАП: Очищаємо екран від стандартного контенту Lampa
            // Цей метод може викликати збій, але він потрібен для сортування.
            try {
                $(activeActivity.render()).empty();
            } catch (e) {
                console.error('SSM: Не вдалося очистити DOM.', e);
                // Якщо не вдалося очистити, зупиняємось, щоб не накладати контент
                return; 
            }
            
            config.forEach(section => {
                if (!section.isRemoved) {
                    
                    const list = new Lampa.List.list(section.title, section.api_path, {
                        card_type: section.api_path.includes('movie') ? 'movie' : 'tv',
                        line_type: section.line_type || 'small',
                        object_type: section.api_path.includes('movie') ? 'movie' : 'tv'
                    });

                    activeActivity.append(list.render({
                        method: 'append',
                        url: section.api_path,
                        title: section.title,
                        slice: 18 
                    }));
                }
            });

            activeActivity.ssm_sections_modified = true; 
            if(Lampa.Controller && Lampa.Controller.enabled()) Lampa.Controller.toggle('content');
        }
    }

    // 3. Додавання налаштувань (Використовуємо String() для INPUT)
    function addSettings() {
        if (!Lampa.SettingsApi) return;
        
        Lampa.SettingsApi.addComponent({
            component: SETTINGS_COMPONENT,
            name: plugin.name,
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.41-7-7.38 0-2.31 1.03-4.37 2.64-5.74L11 11.66v8.27zm-1.07-8.31l-3.6-3.6C7.39 6.88 9.53 6 12 6c3.04 0 5.68 1.44 7.37 3.66L10.93 11.62zM19.08 14c-.11.83-.45 1.6-1 2.22l-3.67-3.67 4.67-.55zM12 4.07V11.5l3.6-3.6C14.07 5.17 12.06 4.14 12 4.07z" fill="currentColor"/></svg>`
        });
        
        STANDARD_SECTIONS.forEach(section => {
            const groupName = section.title;

            // Налаштування порядку (type: input)
            Lampa.SettingsApi.addParam({
                component: SETTINGS_COMPONENT,
                param: {
                    name: KEY_PREFIX + section.id + '_order',
                    type: 'input',
                    default: String(section.default_order), // ОБОВ'ЯЗКОВО String
                    placeholder: String(section.default_order),
                    comment: 'Позиція на головному екрані (число 1-99)'
                },
                field: {
                    name: `Порядок: ${groupName}`,
                    description: `Встановіть порядковий номер для ${groupName}.`
                }
            });
            
            // Налаштування видимості (type: toggle - безпечніший компонент)
            Lampa.SettingsApi.addParam({
                component: SETTINGS_COMPONENT,
                param: {
                    name: KEY_PREFIX + section.id + '_remove',
                    type: 'toggle', // Використовуємо toggle, він більш стабільний, ніж select
                    default: false, // false = показувати
                },
                field: {
                    name: `Показувати секцію: ${groupName}`,
                    description: `Увімкніть, щоб показати, вимкніть, щоб приховати.`
                }
            });
        });

        Lampa.Listener.follow('settings', (event) => {
            if (event.component === SETTINGS_COMPONENT && event.name === 'save') {
                const activeActivity = Lampa.Activity.active();
                if(activeActivity && activeActivity.name === 'home') {
                    activeActivity.ssm_sections_modified = false;
                    Lampa.Activity.replace(activeActivity); 
                }
            }
        });
    }
    
    // 4. Запуск і перехоплення
    function start() {
        console.log(`[${plugin.name} v${plugin.version}] loaded.`);
        
        Lampa.Storage.listener.follow('ready', addSettings);
        addSettings();

        Lampa.Listener.follow('content_ready', (event) => {
            if (event.name === 'home') {
                const config = getSectionConfig();
                // Запускаємо наш рендеринг, що очищує існуючий контент
                setTimeout(() => customSectionRender(config), 200); 
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

