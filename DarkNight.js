(function () {
    'use strict';

    // ----------------------------------------------------
    // КОНСТАНТИ ТА ЛОКАЛІЗАЦІЯ
    // ----------------------------------------------------

    const THEME_NAME = 'dark_night';

    // Додаємо переклад для назви та опису теми
    Lampa.Lang.add({
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
    // CSS-СТИЛІ ТЕМИ
    // ----------------------------------------------------

    const THEME_CSS = `
        /* Основний фон */
        body {
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%);
            color: #ffffff;
        }

        /* Елементи у фокусі: градієнт та тінь */
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

        /* Анімація тіні (Пульсація) */
        @keyframes night-pulse {
            0% { box-shadow: 0 0 20px rgba(233, 64, 87, 0.3); }
            50% { box-shadow: 0 0 30px rgba(242, 113, 33, 0.3); }
            100% { box-shadow: 0 0 20px rgba(138, 35, 135, 0.3); }
        }

        /* Обведення карток у фокусі */
        .card.focus .card__view::after,
        .card.hover .card__view::after {
            border: 2px solid #e94057;
            box-shadow: 0 0 30px rgba(242, 113, 33, 0.5);
        }

        /* Дії у заголовку у фокусі */
        .head__action.focus,
        .head__action.hover {
            background: linear-gradient(45deg, #8a2387, #f27121);
            animation: night-pulse 2s infinite;
        }

        /* Фон на сторінці фільму */
        .full-start__background {
            opacity: 0.8;
            filter: saturate(1.3) contrast(1.1);
        }

        /* Фон модальних вікон та налаштувань */
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
    // РЕЄСТРАЦІЯ ТЕМИ В API Lampa
    // ----------------------------------------------------

    function registerTheme() {
        // Використовуємо Lampa.Theme.add для додавання нової опції у меню тем
        Lampa.Theme.add({
            name: THEME_NAME,
            component: 'default', // Доступно у стандартному виборі тем
            css: THEME_CSS,
            field: {
                // Використовуємо локалізацію, додану раніше
                name: Lampa.Lang.translate('theme_dark_night'),
                description: Lampa.Lang.translate('theme_dark_night_descr')
            }
        });
    }

    // ----------------------------------------------------
    // ЗАПУСК ПЛАГІНА (Очікування готовності Lampa)
    // ----------------------------------------------------

    if (window.appready) {
        registerTheme();
    } else {
        Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready') {
                registerTheme();
            }
        });
    }

})();
