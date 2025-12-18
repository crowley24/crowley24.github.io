(function () {
    'use strict';

    // Константа для ідентифікації плагіна та зберігання налаштувань
    const PLUGIN_NAME = 'interface_mod_theme';
    
    // Початкові налаштування
    let settings = {
        theme: 'default',
        stylize_titles: false
    };

    // --- ФУНКЦІЇ ДЛЯ ТЕМ ---
    
    /**
     * Застосовує CSS-стилі для вибраної теми.
     * @param {string} theme - Назва теми ('neon', 'default' і т.д.).
     */
    function applyTheme(theme) {
        // 1. Видаляємо попередні вбудовані стилі
        const oldStyle = document.querySelector('#' + PLUGIN_NAME);
        if (oldStyle) oldStyle.remove();

        // 2. Логіка для "По замовчуванням"
        if (theme === 'default') {
            // Деактивуємо всі зовнішні теми
            document.querySelectorAll('[id^="theme-style-"]').forEach(function(el) {
                el.disabled = true;
            });
            return;
        }

        // 3. Логіка для зовнішньої теми
        const externalThemeStyle = document.querySelector('#theme-style-' + theme);
        if (externalThemeStyle) {
            // Деактивуємо всі інші зовнішні теми
            document.querySelectorAll('[id^="theme-style-"]').forEach(function(el) {
                el.disabled = true;
            });
            // Активуємо потрібну зовнішню тему
            externalThemeStyle.disabled = false;
            return;
        }

        // 4. Логіка для вбудованої теми
        const style = document.createElement('style');
        style.id = PLUGIN_NAME;

        const themes = {
            neon: `
                body { background: linear-gradient(135deg, #0d0221 0%, #150734 50%, #1f0c47 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover, .settings-folder.focus, .settings-param.focus, .selectbox-item.focus, .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus,
                .custom-online-btn.focus, .custom-torrent-btn.focus, .main2-more-btn.focus, .simple-button.focus, .menu__version.focus {
                    background: linear-gradient(to right, #ff00ff, #00ffff);
                    color: #fff;
                    box-shadow: 0 0 20px rgba(255, 0, 255, 0.4);
                    text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
                    border: none;
                }
                .card.focus .card__view::after, .card.hover .card__view::after {
                    border: 2px solid #ff00ff;
                    box-shadow: 0 0 20px #00ffff;
                }
                .head__action.focus, .head__action.hover {
                    background: linear-gradient(45deg, #ff00ff, #00ffff);
                    box-shadow: 0 0 15px rgba(255, 0, 255, 0.3);
                }
                .full-start__background { opacity: 0.7; filter: brightness(1.2) saturate(1.3); }
                .settings__content, .settings-input__content, .selectbox__content, .modal__content { background: rgba(15, 2, 33, 0.95); border: 1px solid rgba(255, 0, 255, 0.1); }
            `,
            sunset: `
                body { background: linear-gradient(135deg, #2d1f3d 0%, #614385 50%, #516395 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover, .settings-folder.focus, .settings-param.focus, .selectbox-item.focus, .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus,
                .custom-online-btn.focus, .custom-torrent-btn.focus, .main2-more-btn.focus, .simple-button.focus, .menu__version.focus { background: linear-gradient(to right, #ff6e7f, #bfe9ff); color: #2d1f3d; box-shadow: 0 0 15px rgba(255, 110, 127, 0.3); font-weight: bold; }
                .card.focus .card__view::after, .card.hover .card__view::after { border: 2px solid #ff6e7f; box-shadow: 0 0 15px rgba(255, 110, 127, 0.5); }
                .head__action.focus, .head__action.hover { background: linear-gradient(45deg, #ff6e7f, #bfe9ff); color: #2d1f3d; }
                .full-start__background { opacity: 0.8; filter: saturate(1.2) contrast(1.1); }
            `,
            emerald: `
                body { background: linear-gradient(135deg, #1a2a3a 0%, #2C5364 50%, #203A43 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover, .settings-folder.focus, .settings-param.focus, .selectbox-item.focus, .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus,
                .custom-online-btn.focus, .custom-torrent-btn.focus, .main2-more-btn.focus, .simple-button.focus, .menu__version.focus { background: linear-gradient(to right, #43cea2, #185a9d); color: #fff; box-shadow: 0 4px 15px rgba(67, 206, 162, 0.3); border-radius: 5px; }
                .card.focus .card__view::after, .card.hover .card__view::after { border: 3px solid #43cea2; box-shadow: 0 0 20px rgba(67, 206, 162, 0.4); }
                .head__action.focus, .head__action.hover { background: linear-gradient(45deg, #43cea2, #185a9d); }
                .full-start__background { opacity: 0.85; filter: brightness(1.1) saturate(1.2); }
                .settings__content, .settings-input__content, .selectbox__content, .modal__content { background: rgba(26, 42, 58, 0.98); border: 1px solid rgba(67, 206, 162, 0.1); }
            `,
            aurora: `
                body { background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover, .settings-folder.focus, .settings-param.focus, .selectbox-item.focus, .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus,
                .custom-online-btn.focus, .custom-torrent-btn.focus, .main2-more-btn.focus, .simple-button.focus, .menu__version.focus { background: linear-gradient(to right, #aa4b6b, #6b6b83, #3b8d99); color: #fff; box-shadow: 0 0 20px rgba(170, 75, 107, 0.3); transform: scale(1.02); transition: all 0.3s ease; }
                .card.focus .card__view::after, .card.hover .card__view::after { border: 2px solid #aa4b6b; box-shadow: 0 0 25px rgba(170, 75, 107, 0.5); }
                .head__action.focus, .head__action.hover { background: linear-gradient(45deg, #aa4b6b, #3b8d99); transform: scale(1.05); }
                .full-start__background { opacity: 0.75; filter: contrast(1.1) brightness(1.1); }
            `,
            bywolf_mod: `
                body { background: linear-gradient(135deg, #090227 0%, #170b34 50%, #261447 100%); color: #ffffff; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover, .settings-folder.focus, .settings-param.focus, .selectbox-item.focus, .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus,
                .custom-online-btn.focus, .custom-torrent-btn.focus, .main2-more-btn.focus, .simple-button.focus, .menu__version.focus { background: linear-gradient(to right, #fc00ff, #00dbde); color: #fff; box-shadow: 0 0 30px rgba(252, 0, 255, 0.3); animation: cosmic-pulse 2s infinite; }
                @keyframes cosmic-pulse { 0% { box-shadow: 0 0 20px rgba(252, 0, 255, 0.3); } 50% { box-shadow: 0 0 30px rgba(0, 219, 222, 0.3); } 100% { box-shadow: 0 0 20px rgba(252, 0, 255, 0.3); } }
                .card.focus .card__view::after, .card.hover .card__view::after { border: 2px solid #fc00ff; box-shadow: 0 0 30px rgba(0, 219, 222, 0.5); }
                .head__action.focus, .head__action.hover { background: linear-gradient(45deg, #fc00ff, #00dbde); animation: cosmic-pulse 2s infinite; }
                .full-start__background { opacity: 0.8; filter: saturate(1.3) contrast(1.1); }
                .settings__content, .settings-input__content, .selectbox__content, .modal__content { background: rgba(9, 2, 39, 0.95); border: 1px solid rgba(252, 0, 255, 0.1); box-shadow: 0 0 30px rgba(0, 219, 222, 0.1); }
            `,
            minimalist: `
                body { background: #121212; color: #e0e0e0; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover, .settings-folder.focus, .settings-param.focus, .selectbox-item.focus, .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus,
                .custom-online-btn.focus, .custom-torrent-btn.focus, .main2-more-btn.focus, .simple-button.focus, .menu__version.focus { background: #2c2c2c; color: #ffffff; box-shadow: none; border-radius: 3px; border-left: 3px solid #3d3d3d; }
                .card.focus .card__view::after, .card.hover .card__view::after { border: 1px solid #3d3d3d; box-shadow: none; }
                .head__action.focus, .head__action.hover { background: #2c2c2c; }
                .full-start__background { opacity: 0.6; filter: grayscale(0.5) brightness(0.7); }
                .settings__content, .settings-input__content, .selectbox__content, .modal__content { background: rgba(18, 18, 18, 0.95); border: 1px solid #2c2c2c; }
                .selectbox-item + .selectbox-item { border-top: 1px solid #2c2c2c; }
                .card__title, .card__vote, .full-start__title, .full-start__rate, .full-start-new__title, .full-start-new__rate { color: #e0e0e0; }
            `,
            glow_outline: `
                body { background: #0a0a0a; color: #f5f5f5; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover, .settings-folder.focus, .settings-param.focus, .selectbox-item.focus, .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus,
                .custom-online-btn.focus, .custom-torrent-btn.focus, .main2-more-btn.focus, .simple-button.focus, .menu__version.focus { background: rgba(40, 40, 40, 0.8); color: #fff; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3); border-radius: 3px; transition: all 0.3s ease; position: relative; z-index: 1; }
                .menu__item.focus::before, .settings-folder.focus::before, .settings-param.focus::before, .selectbox-item.focus::before,
                .custom-online-btn.focus::before, .custom-torrent-btn.focus::before, .main2-more-btn.focus::before, .simple-button.focus::before { content: ''; position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; z-index: -1; border-radius: 5px; background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent); animation: glowing 1.5s linear infinite; }
                @keyframes glowing { 0% { box-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #f0f, 0 0 20px #0ff; } 50% { box-shadow: 0 0 10px #fff, 0 0 15px #0ff, 0 0 20px #f0f, 0 0 25px #0ff; } 100% { box-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #f0f, 0 0 20px #0ff; } }
                .card.focus .card__view::after, .card.hover .card__view::after { border: none; box-shadow: 0 0 0 2px #fff, 0 0 10px #0ff, 0 0 15px rgba(0, 255, 255, 0.5); animation: card-glow 1.5s ease-in-out infinite alternate; }
                @keyframes card-glow { from { box-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #f0f, 0 0 20px #0ff; } to { box-shadow: 0 0 10px #fff, 0 0 15px #0ff, 0 0 20px #f0f, 0 0 25px #0ff; } }
                .head__action.focus, .head__action.hover { background: #292929; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3), 0 0 10px rgba(0, 255, 255, 0.5); }
                .full-start__background { opacity: 0.7; filter: brightness(0.8) contrast(1.2); }
            `,
            menu_lines: `
                body { background: #121212; color: #f5f5f5; }
                .menu__item { border-bottom: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 5px; padding-bottom: 5px; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover, .settings-folder.focus, .settings-param.focus, .selectbox-item.focus, .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus,
                .custom-online-btn.focus, .custom-torrent-btn.focus, .main2-more-btn.focus, .simple-button.focus, .menu__version.focus { background: linear-gradient(to right, #303030 0%, #404040 100%); color: #fff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3); border-left: 3px solid #808080; border-bottom: 1px solid #808080; }
                .settings-folder, .settings-param { border-bottom: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 5px; padding-bottom: 5px; }
                .settings-folder + .settings-folder { border-top: none; }
                .card.focus .card__view::after, .card.hover .card__view::after { border: 2px solid #808080; box-shadow: 0 0 10px rgba(128, 128, 128, 0.5); }
                .head__action.focus, .head__action.hover { background: #404040; border-left: 3px solid #808080; }
                .full-start__background { opacity: 0.7; filter: brightness(0.8); }
                .menu__list { border-right: 1px solid rgba(255, 255, 255, 0.1); }
                .selectbox-item + .selectbox-item { border-top: 1px solid rgba(255, 255, 255, 0.1); }
            `,
            dark_emerald: `
                body { background: linear-gradient(135deg, #0c1619 0%, #132730 50%, #18323a 100%); color: #dfdfdf; }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover, .settings-folder.focus, .settings-param.focus, .selectbox-item.focus, .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus,
                .custom-online-btn.focus, .custom-torrent-btn.focus, .main2-more-btn.focus, .simple-button.focus, .menu__version.focus { background: linear-gradient(to right, #1a594d, #0e3652); color: #fff; box-shadow: 0 2px 8px rgba(26, 89, 77, 0.2); border-radius: 3px; }
                .card.focus .card__view::after, .card.hover .card__view::after { border: 2px solid #1a594d; box-shadow: 0 0 10px rgba(26, 89, 77, 0.3); }
                .head__action.focus, .head__action.hover { background: linear-gradient(45deg, #1a594d, #0e3652); }
                .full-start__background { opacity: 0.75; filter: brightness(0.9) saturate(1.1); }
                .settings__content, .settings-input__content, .selectbox__content, .modal__content { background: rgba(12, 22, 25, 0.97); border: 1px solid rgba(26, 89, 77, 0.1); }
            `
        };

        style.textContent = themes[theme] || '';
        document.head.appendChild(style);
    }
    
    /**
     * Завантажує список зовнішніх тем з віддаленого JSON-файлу.
     */
    function loadExternalThemes(callback) {
        const themeUrl = 'https://bywolf88.github.io/lampa-plugins/theme.json';
        const xhr = new XMLHttpRequest();
        xhr.open('GET', themeUrl, true);
        xhr.timeout = 5000;
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const externalThemes = JSON.parse(xhr.responseText);
                    callback(null, externalThemes);
                } catch (e) {
                    callback('Error parsing themes data: ' + e.message, null);
                }
            } else {
                callback('HTTP Error: ' + xhr.status, null);
            }
        };
        xhr.onerror = function() { callback('Network error', null); };
        xhr.ontimeout = function() { callback('Request timeout', null); };
        xhr.send();
    }
    
    // --- ФУНКЦІЇ ДЛЯ СТИЛІЗАЦІЇ ЗАГОЛОВКІВ ---
    
    /**
     * Застосовує CSS для стилізації заголовків підборок.
     */
    function stylizeCollectionTitles() {
        if (!settings.stylize_titles) return;
        
        // Видаляємо попередні стилі
        const oldStyle = document.getElementById('stylized-titles-css');
        if (oldStyle) oldStyle.remove();
        
        // Створюємо новий стиль
        const styleElement = document.createElement('style');
        styleElement.id = 'stylized-titles-css';
        
        const css = `
            .items-line__title {
                font-size: 2.4em;
                display: inline-block;
                background: linear-gradient(45deg, #FF3CAC 0%, #784BA0 50%, #2B86C5 100%);
                background-size: 200% auto;
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: gradient-text 3s ease infinite;
                font-weight: 800;
                text-shadow: 0 1px 3px rgba(0,0,0,0.2);
                position: relative;
                padding: 0 5px;
                z-index: 1;
            }
            .items-line__title::before {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 2px;
                background: linear-gradient(to right, transparent, #784BA0, transparent);
                z-index: -1;
                transform: scaleX(0);
                transform-origin: bottom right;
                transition: transform 0.5s ease-out;
                animation: line-animation 3s ease infinite;
            }
            @keyframes gradient-text { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
            @keyframes line-animation { 0% { transform: scaleX(0); } 50% { transform: scaleX(1); } 100% { transform: scaleX(0); } }
        `;

        styleElement.textContent = css;
        document.head.appendChild(styleElement);
    }
    
    /**
     * Видаляє стилі для стилізації заголовків.
     */
    function removeStylizeCollectionTitles() {
        const oldStyle = document.getElementById('stylized-titles-css');
        if (oldStyle) oldStyle.remove();
    }


    // --- ФУНКЦІЯ НАЛАШТУВАНЬ LAMPA ---
    
    function addSettings() {
        // 1. Завантаження поточних налаштувань
        settings = Lampa.Storage.get(PLUGIN_NAME) || settings;

        // 2. Визначення доступних вбудованих тем
        const availableThemes = {
            'default': 'По замовчуванням (Default)',
            'neon': 'Neon',
            'sunset': 'Sunset',
            'emerald': 'Emerald',
            'aurora': 'Aurora',
            'bywolf_mod': 'Bywolf Mod',
            'minimalist': 'Minimalist',
            'glow_outline': 'Glow Outline',
            'menu_lines': 'Menu Lines',
            'dark_emerald': 'Dark Emerald'
        };
        
        // 3. Завантаження зовнішніх тем
        loadExternalThemes((error, externalThemes) => {
            if (!error && externalThemes && typeof externalThemes === 'object') {
                for (const key in externalThemes) {
                    if (externalThemes.hasOwnProperty(key) && !availableThemes[key]) {
                        availableThemes[key] = externalThemes[key].name;
                        
                        // Додаємо зовнішній CSS до DOM (з disabled=true)
                        const link = document.createElement('link');
                        link.id = 'theme-style-' + key;
                        link.rel = 'stylesheet';
                        link.href = externalThemes[key].url;
                        link.disabled = true;
                        document.head.appendChild(link);
                    }
                }
            }
            
            // 4. Елементи налаштувань
            const themesSelect = {
                title: 'Вибір теми інтерфейсу',
                type: 'select',
                options: availableThemes,
                value: settings.theme,
                key: 'theme'
            };
            
            const titlesToggle = {
                title: 'Стилізувати заголовки підборок',
                descr: 'Додає градієнтну анімацію до заголовків розділів.',
                type: 'toggle',
                value: settings.stylize_titles,
                key: 'stylize_titles'
            };

// 5. Додавання налаштувань у Lampa
            Lampa.Settings.add(
                {
                    component: 'interface_mod', // Папка "Модифікації інтерфейсу"
                    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18v-8"></path></svg>', // Іконка кольорового кола
                    title: 'Теми та стилізація',
                    descr: 'Налаштування візуальних тем та елементів інтерфейсу',
                    settings: [
                        themesSelect,
                        titlesToggle,
                    ]
                }
            );

            // 6. Прослуховування змін налаштувань
            Lampa.Settings.listener.follow('interface_mod', (e) => {
                if (e.type === 'change') {
                    settings[e.name] = e.value;
                    Lampa.Storage.set(PLUGIN_NAME, settings);

                    if (e.name === 'theme') {
                        applyTheme(e.value);
                    } else if (e.name === 'stylize_titles') {
                        e.value ? stylizeCollectionTitles() : removeStylizeCollectionTitles();
                    }
                }
            });
            
            // 7. Початкове застосування стилів при завантаженні
            applyTheme(settings.theme);
            if (settings.stylize_titles) {
                stylizeCollectionTitles();
            }
        });
    }

    // --- ЗАПУСК ПЛАГІНА ---
    
    function startPlugin() {
        console.log(`[${PLUGIN_NAME}] Theme Plugin started.`);
        addSettings();
    }

    // Запуск після готовності додатка Lampa
    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                startPlugin();
            }
        });
    }

})();
