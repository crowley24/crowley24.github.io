(function () {
    'use strict';

    // ----------------------------------------------------
    // 1. КОНСТАНТИ, КЛЮЧІ ТА КОЛІРНІ ПАЛІТРИ
    // ----------------------------------------------------

    const CUSTOM_COMPONENT_NAME = 'my_custom_themes';
    const SETTINGS_KEY = 'dark_night_active';
    const ACCENT_COLOR_KEY = 'dark_night_accent'; // Новий ключ для кольору
    const STYLE_ID = 'dark_night_style';

    // Визначення колірних палітр
    const ACCENT_COLORS = {
        // За замовчуванням: Червоний/Помаранчевий (Ваш оригінальний)
        red_night: {
            name: 'Червона Ніч', ru: 'Красная Ночь', en: 'Red Night',
            gradient: 'linear-gradient(to right, #8a2387, #e94057, #f27121)', // Фіолетовий -> Червоний -> Помаранчевий
            shadow: 'rgba(233, 64, 87, 0.4)',
            border: '#e94057',
            pulse_shadows: ['rgba(233, 64, 87, 0.4)', 'rgba(242, 113, 33, 0.5)', 'rgba(138, 35, 135, 0.4)']
        },
        // Зелений Неон
        green_neon: {
            name: 'Зелений Неон', ru: 'Зеленый Неон', en: 'Green Neon',
            gradient: 'linear-gradient(to right, #4CAF50, #8BC34A, #CDDC39)', // Темно-зелений -> Салатовий -> Жовто-зелений
            shadow: 'rgba(76, 175, 80, 0.6)',
            border: '#8BC34A',
            pulse_shadows: ['rgba(76, 175, 80, 0.6)', 'rgba(139, 195, 74, 0.8)', 'rgba(205, 220, 57, 0.6)']
        },
        // Синій Океан
        blue_ocean: {
            name: 'Синій Океан', ru: 'Синий Океан', en: 'Blue Ocean',
            gradient: 'linear-gradient(to right, #1a237e, #42a5f5, #00bcd4)', // Глибокий синій -> Блакитний -> Бірюзовий
            shadow: 'rgba(66, 165, 245, 0.7)',
            border: '#42a5f5',
            pulse_shadows: ['rgba(66, 165, 245, 0.7)', 'rgba(0, 188, 212, 0.8)', 'rgba(26, 35, 126, 0.7)']
        }
    };

    // ----------------------------------------------------
    // 2. ЛОКАЛІЗАЦІЯ
    // ----------------------------------------------------

    Lampa.Lang.add({
        custom_themes_title: { ru: 'Мои темы', en: 'My Themes', uk: 'Мої теми' },
        dark_night_name: { ru: 'Dark Night (Пульсуюча)', en: 'Dark Night (Pulsating)', uk: 'Темна Ніч (Пульсуюча)' },
        dark_night_descr: { ru: 'Глибокий темний фон, пульсуючий градієнт фокусу.', en: 'Deep dark background, pulsating focus gradient.', uk: 'Глибокий темний фон, пульсуючий градієнт фокусу.' },
        accent_color_title: { ru: 'Акцентний колір', en: 'Accent Color', uk: 'Акцентний колір' },
        accent_color_descr: { ru: 'Вибір кольору для пульсуючих елементів.', en: 'Select color for pulsating focus elements.', uk: 'Вибір кольору для пульсуючих елементів.' },
        // Локалізація назв кольорів
        color_red_night: { ru: ACCENT_COLORS.red_night.ru, en: ACCENT_COLORS.red_night.en, uk: ACCENT_COLORS.red_night.name },
        color_green_neon: { ru: ACCENT_COLORS.green_neon.ru, en: ACCENT_COLORS.green_neon.en, uk: ACCENT_COLORS.green_neon.name },
        color_blue_ocean: { ru: ACCENT_COLORS.blue_ocean.ru, en: ACCENT_COLORS.blue_ocean.en, uk: ACCENT_COLORS.blue_ocean.name },
    });


    // ----------------------------------------------------
    // 3. ШАБЛОН CSS (Використовуємо змінні-плейсхолдери)
    // ----------------------------------------------------

    const CSS_TEMPLATE = (colors) => `
        /* 1. ОСНОВНИЙ ФОН ТА КОЛІР ТЕКСТУ */
        body {
            background: linear-gradient(135deg, #0f0f0f 0%, #171717 50%, #0d0d0d 100%);
            color: #e0e0e0;
        }

        /* 2. ЕЛЕМЕНТИ У ФОКУСІ: ДИНАМІЧНИЙ СТИЛЬ */
        .menu__item.focus, .menu__item.traverse, .menu__item.hover,
        .settings-folder.focus, .settings-param.focus, .selectbox-item.focus,
        .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus {
            background: ${colors.gradient}; 
            color: #ffffff !important; 
            border-radius: 6px; 
            box-shadow: 0 0 35px ${colors.shadow}; 
            -webkit-animation: night-pulse 2s infinite; 
            animation: night-pulse 2s infinite; 
            transform: scale(1.02);
            border: none;
        }

        /* Анімація пульсації тіні */
        @-webkit-keyframes night-pulse {
            0% { -webkit-box-shadow: 0 0 25px ${colors.pulse_shadows[0]}; }
            50% { -webkit-box-shadow: 0 0 40px ${colors.pulse_shadows[1]}; }
            100% { -webkit-box-shadow: 0 0 25px ${colors.pulse_shadows[2]}; }
        }
        @keyframes night-pulse {
            0% { box-shadow: 0 0 25px ${colors.pulse_shadows[0]}; }
            50% { box-shadow: 0 0 40px ${colors.pulse_shadows[1]}; }
            100% { box-shadow: 0 0 25px ${colors.pulse_shadows[2]}; }
        }

        /* 3. КАРТКИ КОНТЕНТУ */
        .card { border-radius: 8px; background-color: rgba(25, 25, 25, 0.7); transition: all 0.2s ease; }
        .card.focus .card__view::after, .card.hover .card__view::after {
            border: 3px solid ${colors.border}; 
            border-radius: 8px; 
            box-shadow: 0 0 40px ${colors.pulse_shadows[1]};
        }

        /* 4. МОДАЛЬНІ ВІКНА ТА НАЛАШТУВАННЯ */
        .settings__content, .settings-input__content, .selectbox__content, .modal__content {
            background: rgba(15, 15, 15, 0.98); 
            border: 1px solid ${colors.shadow};
            border-radius: 12px; 
            box-shadow: 0 0 50px ${colors.shadow};
        }

        /* 5. ІНШІ ЕЛЕМЕНТИ */
        .head__action.focus, .head__action.hover {
            background: ${colors.gradient};
            border-radius: 50%; 
            -webkit-animation: night-pulse 2s infinite;
            animation: night-pulse 2s infinite;
        }
        .full-start__background { opacity: 0.85; filter: saturate(1.4) contrast(1.1); }
        
        /* 6. СТИЛІЗАЦІЯ ПРОКРУТКИ */
        .scroll__body::-webkit-scrollbar { width: 8px; background: transparent; }
        .scroll__body::-webkit-scrollbar-thumb { background-color: ${colors.border}; border-radius: 10px; }
    `;
    
    // ----------------------------------------------------
    // 4. ФУНКЦІЯ: Динамічне застосування CSS (Оновлено)
    // ----------------------------------------------------

    function applyTheme(enabled, accentKey) {
        const oldStyle = document.getElementById(STYLE_ID);
        if (oldStyle) oldStyle.remove();

        if (enabled) {
            const colors = ACCENT_COLORS[accentKey] || ACCENT_COLORS.red_night;
            const style = document.createElement('style');
            style.id = STYLE_ID;
            // Генеруємо CSS, передаючи об'єкт кольорів
            style.textContent = CSS_TEMPLATE(colors);
            document.head.appendChild(style);
        }
    }

    // ----------------------------------------------------
    // 5. ІНІЦІАЛІЗАЦІЯ
    // ----------------------------------------------------

    function init() {
        // Отримання поточних налаштувань
        const isActive = Lampa.Storage.get(SETTINGS_KEY, false);
        const currentAccent = Lampa.Storage.get(ACCENT_COLOR_KEY, 'red_night');
        
        // Масив опцій для selectbox
        const colorOptions = Object.keys(ACCENT_COLORS).map(key => ({
            name: Lampa.Lang.translate(`color_${key}`),
            value: key
        }));

        // 1. Створення розділу
        try {
            Lampa.SettingsApi.addComponent({
                component: CUSTOM_COMPONENT_NAME,
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
                name: Lampa.Lang.translate('custom_themes_title') 
            });
        } catch(e) { /* ignore */ }
        
        // 2. Параметр: Вибір кольору (Selectbox)
        Lampa.SettingsApi.addParam({
            component: CUSTOM_COMPONENT_NAME,
            param: {
                name: ACCENT_COLOR_KEY,
                type: 'select', // Тип: selectbox
                default: currentAccent,
                options: colorOptions
            },
            field: {
                name: Lampa.Lang.translate('accent_color_title'),
                description: Lampa.Lang.translate('accent_color_descr')
            },
            onChange: (value) => {
                Lampa.Storage.set(ACCENT_COLOR_KEY, value);
                // Повторно застосовуємо тему, якщо вона вже активна
                if (Lampa.Storage.get(SETTINGS_KEY, false)) {
                     applyTheme(true, value);
                }
            }
        });

        // 3. Параметр: Активація теми (Trigger)
        Lampa.SettingsApi.addParam({
            component: CUSTOM_COMPONENT_NAME,
            param: {
                name: SETTINGS_KEY,
                type: 'trigger',
                default: isActive
            },
            field: {
                name: Lampa.Lang.translate('dark_night_name'),
                description: Lampa.Lang.translate('dark_night_descr')
            },
            onChange: (value) => {
                Lampa.Storage.set(SETTINGS_KEY, value);
                const selectedColor = Lampa.Storage.get(ACCENT_COLOR_KEY, 'red_night');
                applyTheme(value, selectedColor);
            }
        });

        // 4. Застосування на старті
        applyTheme(isActive, currentAccent);
        
        // 5. Оновлення відображення
        if (Lampa.Settings && Lampa.Settings.main) {
            try { Lampa.Settings.main().render(); } catch(e) { /* ignore */ }
        }
    }

    // ----------------------------------------------------
    // 6. ЗАПУСК
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
