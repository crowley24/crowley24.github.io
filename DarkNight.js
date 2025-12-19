(function () {
    'use strict';

    // ----------------------------------------------------
    // 1. КОНСТАНТИ ТА ЛОКАЛІЗАЦІЯ
    // ----------------------------------------------------

    const CUSTOM_COMPONENT_NAME = 'my_custom_themes';
    const SETTINGS_KEY = 'dark_night_active';
    const STYLE_ID = 'dark_night_style';

    Lampa.Lang.add({
        custom_themes_title: {
            ru: 'Мои темы',
            en: 'My Themes',
            uk: 'Мої теми'
        },
        dark_night_name: {
            ru: 'Dark Night (Пульсуюча)',
            en: 'Dark Night (Pulsating)',
            uk: 'Темна Ніч (Пульсуюча)'
        },
        dark_night_descr: {
            ru: 'Глибокий темний фон, пульсуючий градієнт фокусу та плавний UX.',
            en: 'Deep dark background, pulsating focus gradient, and smooth UX.',
            uk: 'Глибокий темний фон, пульсуючий градієнт фокусу та плавний UX.'
        }
    });

    // ----------------------------------------------------
    // 2. CSS-СТИЛІ ТЕМИ (Фінальна Естетична Версія)
    // ----------------------------------------------------
    const THEME_CSS = `
        /* 1. ОСНОВНИЙ ФОН ТА КОЛІР ТЕКСТУ */
        body {
            /* Трохи м'якший градієнт */
            background: linear-gradient(135deg, #0d0d0d 0%, #151515 50%, #0a0a0a 100%);
            color: #e0e0e0;
        }

        /* 2. ЕЛЕМЕНТИ У ФОКУСІ: ДИНАМІЧНИЙ СТИЛЬ (ВКЛЮЧАЮЧИ ПЛАВНИЙ ПЕРЕХІД) */
        .menu__item, .settings-folder, .settings-param, .selectbox-item, .card, .full-start__button {
             /* Додано плавний перехід для UX */
             transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); 
        }

        .menu__item.focus, .menu__item.traverse, .menu__item.hover,
        .settings-folder.focus, .settings-param.focus, .selectbox-item.focus,
        .full-start__button.focus, .full-descr__tag.focus, .player-panel .button.focus {
            background: linear-gradient(to right, #8a2387, #e94057, #f27121); 
            color: #ffffff !important; 
            border-radius: 8px; /* Трохи більше заокруглення */
            box-shadow: 0 0 40px rgba(233, 64, 87, 0.6); /* Тінь сильніша та виразніша */
            -webkit-animation: night-pulse 2s infinite; 
            animation: night-pulse 2s infinite; 
            transform: scale(1.03); /* Збільшення трохи помітніше */
            border: none;
        }

        /* Анімація пульсації тіні */
        @-webkit-keyframes night-pulse {
            0% { -webkit-box-shadow: 0 0 30px rgba(233, 64, 87, 0.5); }
            50% { -webkit-box-shadow: 0 0 50px rgba(242, 113, 33, 0.7); }
            100% { -webkit-box-shadow: 0 0 30px rgba(138, 35, 135, 0.5); }
        }
        @keyframes night-pulse {
            0% { box-shadow: 0 0 30px rgba(233, 64, 87, 0.5); }
            50% { box-shadow: 0 0 50px rgba(242, 113, 33, 0.7); }
            100% { box-shadow: 0 0 30px rgba(138, 35, 135, 0.5); }
        }

        /* 3. КАРТКИ КОНТЕНТУ */
        .card {
            border-radius: 8px; 
            background-color: rgba(30, 30, 30, 0.8); /* Трохи темніші картки для кращого контрасту */
        }
        .card.focus .card__view::after,
        .card.hover .card__view::after {
            border: 4px solid #e94057; /* Трохи товще обведення */
            border-radius: 10px; /* Більше заокруглення для обведення */
            box-shadow: 0 0 50px rgba(242, 113, 33, 0.8);
        }

        /* 4. МОДАЛЬНІ ВІКНА ТА НАЛАШТУВАННЯ */
        .settings__content,
        .settings-input__content,
        .selectbox__content,
        .modal__content {
            background: rgba(10, 10, 10, 0.95); /* Максимально темний фон, майже чорний */
            border: 1px solid rgba(233, 64, 87, 0.3); /* Обведення помітніше */
            border-radius: 15px; /* Більше заокруглення */
            box-shadow: 0 0 60px rgba(242, 113, 33, 0.2);
        }

        /* 5. ІНШІ ЕЛЕМЕНТИ */
        .head__action.focus, .head__action.hover {
            background: linear-gradient(45deg, #8a2387, #f27121);
            border-radius: 50%; 
            -webkit-animation: night-pulse 2s infinite;
            animation: night-pulse 2s infinite;
        }
        .full-start__background {
            opacity: 0.9; /* Фон фільму трохи темніший, щоб текст краще читався */
            filter: saturate(1.5) contrast(1.2);
        }
        
        /* 6. СТИЛІЗАЦІЯ ПРОКРУТКИ */
        .scroll__body::-webkit-scrollbar {
            width: 8px;
            background: transparent;
        }
        .scroll__body::-webkit-scrollbar-thumb {
            background-color: rgba(233, 64, 87, 0.7); /* Трохи помітніший скролбар */
            border-radius: 10px;
        }
    `;
    
    // ----------------------------------------------------
    // 3. ФУНКЦІЯ: Динамічне застосування CSS (Оптимізовано)
    // ----------------------------------------------------

    function applyTheme(enabled) {
        const oldStyle = document.getElementById(STYLE_ID);
        if (oldStyle) oldStyle.remove();

        if (enabled) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = THEME_CSS;
            document.head.appendChild(style);
        }
    }

    // ----------------------------------------------------
    // 4. ІНІЦІАЛІЗАЦІЯ (Оптимізовано)
    // ----------------------------------------------------

    function init() {
        // 1. Створення нового розділу налаштувань
        try {
            Lampa.SettingsApi.addComponent({
                component: CUSTOM_COMPONENT_NAME,
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
                name: Lampa.Lang.translate('custom_themes_title') 
            });
        } catch(e) { /* ignore */ }
        
        // 2. Реєстрація перемикача теми
        Lampa.SettingsApi.addParam({
            component: CUSTOM_COMPONENT_NAME,
            param: {
                name: SETTINGS_KEY,
                type: 'trigger',
                default: Lampa.Storage.get(SETTINGS_KEY, false) 
            },
            field: {
                name: Lampa.Lang.translate('dark_night_name'),
                description: Lampa.Lang.translate('dark_night_descr')
            },
            onChange: (value) => {
                // Зберігаємо стан та застосовуємо тему миттєво
                Lampa.Storage.set(SETTINGS_KEY, value);
                applyTheme(value);
                
                // Додаємо опціональне сповіщення для кращого UX
                if (Lampa.Noty) {
                    Lampa.Noty.show(value ? Lampa.Lang.translate('dark_night_name') + ' активована.' : Lampa.Lang.translate('dark_night_name') + ' деактивована.');
                }
            }
        });

        // 3. Застосовуємо тему на старті, якщо вона була увімкнена
        applyTheme(Lampa.Storage.get(SETTINGS_KEY, false));
        
        // 4. Оновлення відображення
        if (Lampa.Settings && Lampa.Settings.main) {
            try { Lampa.Settings.main().render(); } catch(e) { /* ignore */ }
        }
    }

    // ----------------------------------------------------
    // 5. ЗАПУСК
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

