(function () {
    'use strict';

    var plugin = {
        name: 'Standard Section Manager',
        version: '1.0.0',
        description: 'Управління порядком та видимістю стандартних секцій Lampa.'
    };

    const KEY_PREFIX = 'ssm_';
    const SETTINGS_COMPONENT = 'lampa_standard_sections';
    const DEFAULT_ORDER = 999;

    // Секції, які ми намагаємося перехопити та перевизначити.
    // Назви (titles) використовуються для ідентифікації в налаштуваннях.
    const STANDARD_SECTIONS = [
        { id: 'now_watching', title: 'Зараз дивляться', default_order: 10 },
        { id: 'upcoming_episodes', title: 'Вихід найближчих епізодів', default_order: 20 },
        { id: 'trending_day', title: 'Сьогодні у тренді', default_order: 30 },
        { id: 'trending_week', title: 'У тренді за тиждень', default_order: 40 },
        { id: 'movie_now_playing', title: 'Дивіться у кінозалах', default_order: 50 },
        { id: 'popular_movie', title: 'Популярні фільми', default_order: 60 },
        { id: 'popular_tv', title: 'Популярні серіали', default_order: 70 },
        { id: 'upcoming_movie', title: 'Очікувані фільми', default_order: 80 }
    ];

    function storageGet(key, def) {
        try { return Lampa.Storage.get(key, def); } catch (e) { return def; }
    }

    // 1. Створюємо конфігурацію на основі налаштувань користувача
    function getSectionConfig() {
        return STANDARD_SECTIONS
            .map(section => {
                const isRemoved = storageGet(KEY_PREFIX + section.id + '_remove', 0) == 1;
                // Читаємо порядок, забезпечуючи, що це число
                const order = parseInt(storageGet(KEY_PREFIX + section.id + '_order', section.default_order), 10) || DEFAULT_ORDER;
                
                return { ...section, isRemoved, order };
            })
            .sort((a, b) => a.order - b.order);
    }
    
    // 2. Функція, що замінює стандартний рендеринг секцій
    function customSectionRender(config) {
        const activeActivity = Lampa.Activity.active();
        
        if (activeActivity && activeActivity.name === 'home' && !activeActivity.ssm_sections_modified) {
            
            // Очищаємо існуючі секції, щоб відобразити їх у новому порядку.
            // Це ризикований крок, але необхідний для сортування.
            $(activeActivity.render()).empty(); 
            
            config.forEach(section => {
                if (!section.isRemoved) {
                    
                    // Тут нам потрібно відтворити внутрішню логіку Lampa для кожної стандартної секції.
                    // Це лише ПРИКЛАДИ, як Lampa може генерувати URL для стандартних секцій (TMDB)
                    let api_url = '';
                    let object_type = 'movie'; 
                    let line_type = 'small';
                    let title = section.title;

                    switch (section.id) {
                        case 'trending_week':
                            api_url = 'trending/all/week';
                            line_type = 'wide';
                            break;
                        case 'trending_day':
                            api_url = 'trending/all/day';
                            line_type = 'wide';
                            break;
                        case 'popular_movie':
                            api_url = 'movie/popular';
                            object_type = 'movie';
                            line_type = 'small';
                            break;
                        case 'popular_tv':
                            api_url = 'tv/popular';
                            object_type = 'tv';
                            line_type = 'full';
                            break;
                        case 'upcoming_movie':
                            api_url = 'movie/upcoming';
                            object_type = 'movie';
                            line_type = 'wide';
                            break;
                        // Секції 'now_watching', 'upcoming_episodes' та 'movie_now_playing' 
                        // вимагають складнішої внутрішньої логіки Lampa, яку неможливо відтворити тут.
                        // Тому для них ми використовуємо прості заглушки TMDB, які схожі за змістом.
                        case 'now_watching':
                            api_url = 'movie/now_playing';
                            break;
                        case 'movie_now_playing':
                             api_url = 'movie/now_playing';
                             break;
                        default:
                            return; // Ігноруємо невідомі або складні секції
                    }

                    if (api_url) {
                        const list = new Lampa.List.list(title, api_url, {
                            card_type: object_type,
                            line_type: line_type,
                            object_type: object_type
                        });

                        activeActivity.append(list.render({
                            method: 'append',
                            url: api_url,
                            title: title,
                            slice: 18 
                        }));
                    }
                }
            });

            activeActivity.ssm_sections_modified = true; 
            if(Lampa.Controller && Lampa.Controller.enabled()) Lampa.Controller.toggle('content');
        }
    }

    // 3. Додавання налаштувань
    function addSettings() {
        if (!Lampa.SettingsApi) return;
        
        Lampa.SettingsApi.addComponent({
            component: SETTINGS_COMPONENT,
            name: plugin.name,
            icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.41-7-7.38 0-2.31 1.03-4.37 2.64-5.74L11 11.66v8.27zm-1.07-8.31l-3.6-3.6C7.39 6.88 9.53 6 12 6c3.04 0 5.68 1.44 7.37 3.66L10.93 11.62zM19.08 14c-.11.83-.45 1.6-1 2.22l-3.67-3.67 4.67-.55zM12 4.07V11.5l3.6-3.6C14.07 5.17 12.06 4.14 12 4.07z" fill="currentColor"/></svg>`
        });
        
        STANDARD_SECTIONS.forEach(section => {
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
                    activeActivity.ssm_sections_modified = false;
                    Lampa.Activity.replace(activeActivity); 
                }
            }
        });
    }
    
    // 4. Перехоплення рендерингу Lampa
    function start() {
        console.log(`[${plugin.name} v${plugin.version}] loaded.`);
        
        Lampa.Storage.listener.follow('ready', addSettings);
        addSettings();

        // Замінюємо стандартний рендеринг!
        Lampa.Listener.follow('content_ready', (event) => {
            if (event.name === 'home') {
                const config = getSectionConfig();
                // Запускаємо наш кастомний рендеринг, який очистить існуючий контент
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

