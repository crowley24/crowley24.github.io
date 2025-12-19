(function () {
    'use strict';

    // ----------------------------------------------------
    // 1. КОНСТАНТИ ТА ЛОКАЛІЗАЦІЯ
    // ----------------------------------------------------

    const CUSTOM_COMPONENT_NAME = 'my_custom_themes';
    const THEME_NAME = 'dark_night';

    // Додаємо переклад для нового розділу налаштувань
    Lampa.Lang.add({
        custom_themes_title: {
            ru: 'Мои темы',
            en: 'My Themes',
            uk: 'Мої теми'
        },
        theme_dark_night: {
            ru: 'Dark Night (Мерцающая)',
            en: 'Dark Night (Pulsating)',
            uk: 'Темна Ніч (Мерехтлива)'
        },
        theme_dark_night_descr: {
            ru: 'Глубокий темный фон с анимированными, пульсирующими элементами в фокусе.',
            en: 'Deep dark background with animated, pulsating focus elements.',
            uk: 'Глибокий темний фон з анімованими, мерехтливими елементами у фокусі.'
        }
    });

    // ----------------------------------------------------
    // 2. CSS-СТИЛІ ТЕМИ "DARK NIGHT"
    // ----------------------------------------------------

    const THEME_CSS = `
        body {
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
            color: #ffffff;
        }
        .menu__item.focus,
        .menu__item.traverse,
        .menu__item.hover,
        .settings-folder.focus,
        .settings-param.focus,
        .selectbox-item.focus,
        .full-start__button.focus,
        .full-descr__tag.focus,
        .player-panel .button.focus {
            background: linear-gradient(to right, #8a2387, #e94057, #f27121); 
            color: #fff;
            box-shadow: 0 0 30px rgba(233, 64, 87, 0.3);
            animation: night-pulse 2s infinite; 
        }
        @keyframes night-pulse {
            0% { box-shadow: 0 0 20px rgba(233, 64, 87, 0.3); }
            50% { box-shadow: 0 0 30px rgba(242, 113, 33, 0.3); }
            100% { box-shadow: 0 0 20px rgba(138, 35, 135, 0.3); }
        }
        .card.focus .card__view::after,
        .card.hover .card__view::after {
            border: 2px solid #e94057;
            box-shadow: 0 0 30px rgba(242, 113, 33, 0.5);
        }
        .head__action.focus,
        .head__action.hover {
            background: linear-gradient(45deg, #8a2387, #f27121);
            animation: night-pulse 2s infinite;
        }
        .full-start__background {
            opacity: 0.8;
            filter: saturate(1.3) contrast(1.1);
        }
        .settings__content,
        .settings-input__content,
        .selectbox__content,
        .modal__content {
            background: rgba(10, 10, 10, 0.95);
            border: 1px solid rgba(233, 64, 87, 0.1);
            box-shadow: 0 0 30px rgba(242, 113, 33, 0.1);
        }
    `;

    // ----------------------------------------------------
    // 3. ІНІЦІАЛІЗАЦІЯ (Створення розділу та додавання теми)
    // ----------------------------------------------------

    function registerTheme() {
        // Крок 1: Створення нового розділу налаштувань "Мої теми"
        Lampa.SettingsApi.addComponent({
            component: CUSTOM_COMPONENT_NAME,
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
            name: Lampa.Lang.translate('custom_themes_title') // "Мої теми"
        });

        // Крок 2: Реєстрація теми "Dark Night" всередині цього нового розділу
        Lampa.Theme.add({
            name: THEME_NAME,
            // Вказуємо новий компонент, а не 'default'
            component: CUSTOM_COMPONENT_NAME, 
            css: THEME_CSS,
            field: {
                name: Lampa.Lang.translate('theme_dark_night'),
                description: Lampa.Lang.translate('theme_dark_night_descr')
            }
        });

        // Крок 3: Примусове оновлення меню Налаштувань
        if (Lampa.Settings && Lampa.Settings.main) {
            Lampa.Settings.main().render();
        }
    }

    // ----------------------------------------------------
    // 4. ЗАПУСК
    // ----------------------------------------------------

    // Запускаємо реєстрацію після готовності програми
    if (window.appready) {
        registerTheme();
    } else {
        Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready') {
                // Додаємо невелику затримку для надійності
                setTimeout(registerTheme, 200);
            }
        });
    }

})();

