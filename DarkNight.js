(function () {
    'use strict';

    // ----------------------------------------------------
    // КОНСТАНТИ ТА ЛОКАЛІЗАЦІЯ
    // ----------------------------------------------------

    const CUSTOM_COMPONENT_NAME = 'my_custom_themes';

    // --- Локалізація ---
    Lampa.Lang.add({
        custom_themes_title: { ru: 'Мої теми', en: 'My Themes', uk: 'Мої теми' },

        // 1. Dark Night
        dark_night_name: { ru: 'Dark Night (Пульсуюча)', en: 'Dark Night (Pulsating)', uk: 'Темна Ніч (Пульсуюча)' },
        dark_night_descr: { ru: 'Глибокий темний фон, пульсуючий градієнт фокусу.', en: 'Deep dark background, pulsating focus gradient.', uk: 'Глибокий темний фон, пульсуючий градієнт фокусу.' },

        // 2. Cyber Green
        cyber_green_name: { ru: 'Cyber Green (Кібер)', en: 'Cyber Green (Cyber)', uk: 'Кібер-Зелений (Кібер)' },
        cyber_green_descr: { ru: 'Чорний фон з яскравими неоновими зеленими акцентами.', en: 'Black background with bright neon green accents.', uk: 'Чорний фон з яскравими неоновими зеленими акцентами.' },

        // 3. Aurora Violet
        aurora_violet_name: { ru: 'Aurora Violet (Аврора)', en: 'Aurora Violet (Aurora)', uk: 'Фіолетова Аврора (Аврора)' },
        aurora_violet_descr: { ru: 'М\'який фіолетово-блакитний градієнт для затишного вигляду.', en: 'Soft purple-blue gradient for a cozy look.', uk: 'М\'який фіолетово-блакитний градієнт для затишного вигляду.' },
    });

    // ----------------------------------------------------
    // ОБ'ЄКТ З УСІМА ТЕМАМИ
    // ----------------------------------------------------
    
    const THEMES = [
        {
            key: 'dark_night_active',
            name: 'dark_night_name',
            description: 'dark_night_descr',
            css: `
                /* DARK NIGHT */
                body {
                    background: linear-gradient(135deg, #0f0f0f 0%, #171717 50%, #0d0d0d 100%);
                    color: #e0e0e0;
                }
                .menu__item.focus, .menu__item.traverse, .menu__item.hover,
                .settings-folder.focus, .settings-param.focus, .selectbox-item.focus,
                .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus {
                    background: linear-gradient(to right, #8a2387, #e94057, #f27121); 
                    color: #ffffff !important; 
                    border-radius: 6px;
                    box-shadow: 0 0 30px rgba(233, 64, 87, 0.4);
                    -webkit-animation: night-pulse 2s infinite; 
                    animation: night-pulse 2s infinite; 
                    transform: scale(1.02);
                }
                @-webkit-keyframes night-pulse { 0% { -webkit-box-shadow: 0 0 20px rgba(233, 64, 87, 0.3); } 50% { -webkit-box-shadow: 0 0 30px rgba(242, 113, 33, 0.4); } 100% { -webkit-box-shadow: 0 0 20px rgba(138, 35, 135, 0.3); } }
                @keyframes night-pulse { 0% { box-shadow: 0 0 20px rgba(233, 64, 87, 0.3); } 50% { box-shadow: 0 0 30px rgba(242, 113, 33, 0.4); } 100% { box-shadow: 0 0 20px rgba(138, 35, 135, 0.3); } }
                .card { border-radius: 8px; background-color: rgba(25, 25, 25, 0.7); transition: all 0.2s ease; }
                .card.focus .card__view::after, .card.hover .card__view::after {
                    border: 3px solid #e94057; border-radius: 8px;
                    box-shadow: 0 0 40px rgba(242, 113, 33, 0.6);
                }
                .head__action.focus, .head__action.hover {
                    background: linear-gradient(45deg, #8a2387, #f27121); border-radius: 50%;
                    -webkit-animation: night-pulse 2s infinite; animation: night-pulse 2s infinite;
                }
                .full-start__background { opacity: 0.85; filter: saturate(1.4) contrast(1.1); }
                .settings__content, .settings-input__content, .selectbox__content, .modal__content {
                    background: rgba(15, 15, 15, 0.98); border: 1px solid rgba(233, 64, 87, 0.2);
                    border-radius: 12px; box-shadow: 0 0 50px rgba(242, 113, 33, 0.15);
                }
                .scroll__body::-webkit-scrollbar { width: 8px; background: transparent; }
                .scroll__body::-webkit-scrollbar-thumb { background-color: rgba(233, 64, 87, 0.5); border-radius: 10px; }
            `
        },
        {
            key: 'cyber_green_active',
            name: 'cyber_green_name',
            description: 'cyber_green_descr',
            css: `
                /* CYBER GREEN */
                body {
                    background-color: #0d0d0d;
                    color: #d0d0d0;
                }
                .menu__item.focus, .settings-folder.focus, .settings-param.focus, 
                .selectbox-item.focus, .full-start__button.focus, .full-descr__tag.focus,
                .head__action.focus, .player-panel .button.focus {
                    background: #111;
                    color: #00ff66 !important; /* Яскраво-зелений акцент */
                    border: 2px solid #00ff66;
                    border-radius: 4px;
                    box-shadow: 0 0 15px rgba(0, 255, 102, 0.7);
                    transform: scale(1.02);
                }
                .card.focus .card__view::after, .card.hover .card__view::after {
                    border: 3px solid #00ff66;
                    border-radius: 8px;
                    box-shadow: 0 0 40px rgba(0, 255, 102, 0.5);
                }
                .settings__content, .modal__content {
                    background: rgba(0, 0, 0, 0.95);
                    border: 1px solid #00ff66;
                    border-radius: 8px;
                    box-shadow: 0 0 25px rgba(0, 255, 102, 0.2);
                }
                .scroll__body::-webkit-scrollbar-thumb { background-color: #00ff66; }
            `
        },
        {
            key: 'aurora_violet_active',
            name: 'aurora_violet_name',
            description: 'aurora_violet_descr',
            css: `
                /* AURORA VIOLET */
                body {
                    /* М'який фіолетово-синій градієнт як у полярного сяйва */
                    background: linear-gradient(160deg, #1c1c30 0%, #151525 50%, #101018 100%);
                    color: #e8eaf6;
                }
                .menu__item.focus, .settings-folder.focus, .settings-param.focus, 
                .selectbox-item.focus, .full-start__button.focus, .full-descr__tag.focus,
                .head__action.focus, .player-panel .button.focus {
                    background: linear-gradient(to right, #4a148c, #673ab7); /* Глибокий фіолетовий */
                    color: #ffffff !important; 
                    border-radius: 8px;
                    box-shadow: 0 0 20px rgba(103, 58, 183, 0.8);
                }
                .card.focus .card__view::after, .card.hover .card__view::after {
                    border: 4px solid #673ab7;
                    border-radius: 10px;
                    box-shadow: 0 0 30px rgba(103, 58, 183, 0.8);
                }
                .settings__content, .modal__content {
                    background: rgba(20, 20, 30, 0.9);
                    border: 1px solid #673ab7;
                    border-radius: 15px;
                    box-shadow: 0 0 40px rgba(103, 58, 183, 0.3);
                }
                .scroll__body::-webkit-scrollbar-thumb { background-color: #673ab7; }
            `
        }
    ];

    // ----------------------------------------------------
    // ФУНКЦІЯ: Динамічне застосування CSS
    // ----------------------------------------------------

    const STYLE_ID = 'custom_themes_style';

    function applyTheme(key, css, enabled) {
        // Видаляємо всі попередні стилі перед вставкою, щоб не було конфліктів
        const allStyles = document.querySelectorAll(`style[id^="${STYLE_ID}"]`);
        allStyles.forEach(s => s.remove());
        
        if (!enabled) return;

        // Вставляємо новий стиль
        const style = document.createElement('style');
        style.id = STYLE_ID + '_' + key; // Даємо унікальний ID
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ----------------------------------------------------
    // ІНІЦІАЛІЗАЦІЯ
    // ----------------------------------------------------

    function init() {
        // 1. Створюємо розділ "Мої теми" (як раніше)
        try {
            Lampa.SettingsApi.addComponent({
                component: CUSTOM_COMPONENT_NAME,
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
                name: Lampa.Lang.translate('custom_themes_title') 
            });
        } catch(e) { /* ignore */ }

        // 2. Реєструємо перемикачі для всіх тем
        THEMES.forEach(theme => {
            const isActive = Lampa.Storage.get(theme.key, false);

            Lampa.SettingsApi.addParam({
                component: CUSTOM_COMPONENT_NAME,
                param: {
                    name: theme.key,
                    type: 'trigger',
                    default: isActive 
                },
                field: {
                    name: Lampa.Lang.translate(theme.name),
                    description: Lampa.Lang.translate(theme.description)
                },
                onChange: (value) => {
                    // Зберігаємо стан
                    Lampa.Storage.set(theme.key, value);

                    // Якщо користувач вмикає цю тему, ми гарантуємо, що всі інші вимкнені
                    if (value) {
                        THEMES.filter(t => t.key !== theme.key).forEach(t => {
                            Lampa.Storage.set(t.key, false);
                            // Примусове оновлення параметру, щоб перемикач вимкнувся
                            Lampa.SettingsApi.param(t.key).update(false);
                        });
                    }
                    
                    // Застосовуємо стилі
                    applyTheme(theme.key, theme.css, value);
                }
            });

            // 3. Застосовуємо тему на старті, якщо вона активна
            if (isActive) {
                applyTheme(theme.key, theme.css, isActive);
            }
        });

        // 4. Оновлюємо відображення налаштувань
        if (Lampa.Settings && Lampa.Settings.main) {
            try { Lampa.Settings.main().render(); } catch(e) { /* ignore */ }
        }
    }

    // ----------------------------------------------------
    // ЗАПУСК (Очікування готовності Lampa)
    // ----------------------------------------------------

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready') {
                setTimeout(init, 200);
            }
        });
    }
})();

