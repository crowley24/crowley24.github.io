(function () {
    'use strict';

    // ----------------------------------------------------
    // КОНСТАНТИ ТА ЛОКАЛІЗАЦІЯ
    // ----------------------------------------------------

    const CUSTOM_COMPONENT_NAME = 'my_custom_themes';
    const SETTINGS_KEY = 'dark_night_active'; // Ключ для збереження стану
    const STYLE_ID = 'dark_night_style';      // ID для динамічного CSS

    Lampa.Lang.add({
        custom_themes_title: {
            ru: 'Мои темы',
            en: 'My Themes',
            uk: 'Мої теми'
        },
        dark_night_name: {
            ru: 'Dark Night (Активация)',
            en: 'Dark Night (Activation)',
            uk: 'Темна Ніч (Активація)'
        },
        dark_night_descr: {
            ru: 'Активирует динамическую тему "Dark Night" с пульсирующим фокусом.',
            en: 'Activates the dynamic "Dark Night" theme with pulsating focus.',
            uk: 'Активує динамічну тему "Темна Ніч" з пульсуючим фокусом.'
        }
    });

    // ----------------------------------------------------
    // CSS-СТИЛІ ТЕМИ (З префіксами та безпекою)
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
            -webkit-box-shadow: 0 0 30px rgba(233, 64, 87, 0.3);
            box-shadow: 0 0 30px rgba(233, 64, 87, 0.3);
            -webkit-animation: night-pulse 2s infinite; 
            animation: night-pulse 2s infinite; 
        }
        
        @-webkit-keyframes night-pulse {
            0% { -webkit-box-shadow: 0 0 20px rgba(233, 64, 87, 0.3); }
            50% { -webkit-box-shadow: 0 0 30px rgba(242, 113, 33, 0.3); }
            100% { -webkit-box-shadow: 0 0 20px rgba(138, 35, 135, 0.3); }
        }
        @keyframes night-pulse {
            0% { box-shadow: 0 0 20px rgba(233, 64, 87, 0.3); }
            50% { box-shadow: 0 0 30px rgba(242, 113, 33, 0.3); }
            100% { box-shadow: 0 0 20px rgba(138, 35, 135, 0.3); }
        }
        
        .card.focus .card__view::after,
        .card.hover .card__view::after {
            border: 2px solid #e94057;
            -webkit-box-shadow: 0 0 30px rgba(242, 113, 33, 0.5);
            box-shadow: 0 0 30px rgba(242, 113, 33, 0.5);
        }
        .head__action.focus,
        .head__action.hover {
            background: linear-gradient(45deg, #8a2387, #f27121);
            -webkit-animation: night-pulse 2s infinite;
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
            -webkit-box-shadow: 0 0 30px rgba(242, 113, 33, 0.1);
            box-shadow: 0 0 30px rgba(242, 113, 33, 0.1);
        }
    `;
    
    // ----------------------------------------------------
    // ФУНКЦІЯ: Динамічне застосування CSS
    // ----------------------------------------------------

    function applyTheme(enabled) {
        // Видаляємо старий стиль, якщо він існує
        const oldStyle = document.getElementById(STYLE_ID);
        if (oldStyle) oldStyle.remove();

        // Якщо вимкнено, то просто видаляємо і виходимо
        if (!enabled) return;

        // Вставляємо новий стиль у <head> документа
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = THEME_CSS;
        document.head.appendChild(style);
    }

    // ----------------------------------------------------
    // ІНІЦІАЛІЗАЦІЯ
    // ----------------------------------------------------

    function init() {
        // 1. Створюємо новий розділ налаштувань "Мої теми"
        try {
            Lampa.SettingsApi.addComponent({
                component: CUSTOM_COMPONENT_NAME,
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
                name: Lampa.Lang.translate('custom_themes_title') 
            });
        } catch(e) { /* ignore */ }
        
        // 2. Реєструємо перемикач теми в цьому новому розділі
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
                // Зберігаємо стан і застосовуємо тему
                Lampa.Storage.set(SETTINGS_KEY, value);
                applyTheme(value);
            }
        });

        // 3. Застосовуємо тему, якщо вона була увімкнена раніше
        const isActive = Lampa.Storage.get(SETTINGS_KEY, false);
        applyTheme(isActive);
        
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

