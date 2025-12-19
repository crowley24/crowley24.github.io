
(function () {
    'use strict';

    const CUSTOM_COMPONENT_NAME = 'my_custom_themes';
    const THEME_NAME = 'dark_night'; 

    Lampa.Lang.add({
        custom_themes_title: { ru: 'Мои темы', en: 'My Themes', uk: 'Мої теми' },
        theme_dark_night: { ru: 'Dark Night (Тест)', en: 'Dark Night (Test)', uk: 'Темна Ніч (Тест)' },
        theme_dark_night_descr: { ru: 'Тест мінімального CSS.', en: 'Minimal CSS test.', uk: 'Тест мінімального CSS.' }
    });

    // МІНІМАЛЬНИЙ БЕЗПЕЧНИЙ CSS
    const THEME_CSS_TEST = `
        body {
            background: #200020 !important; /* Насичений фіолетовий фон */
            color: #ffffff;
        }
    `;

    function registerTheme() {
        try {
            Lampa.SettingsApi.addComponent({
                component: CUSTOM_COMPONENT_NAME,
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
                name: Lampa.Lang.translate('custom_themes_title')
            });
        } catch(e) { /* ignore */ }

        try {
            // Реєструємо ТЕСТОВУ тему
            Lampa.Theme.add({
                name: THEME_NAME,
                component: CUSTOM_COMPONENT_NAME, 
                css: THEME_CSS_TEST, // Використовуємо спрощений CSS
                field: {
                    name: Lampa.Lang.translate('theme_dark_night'),
                    description: Lampa.Lang.translate('theme_dark_night_descr')
                }
            });
        } catch(e) { /* ignore */ }

        if (Lampa.Settings && Lampa.Settings.main) {
            try { Lampa.Settings.main().render(); } catch(e) { /* ignore */ }
        }
    }

    if (window.appready) {
        setTimeout(registerTheme, 200);
    } else {
        Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready') {
                setTimeout(registerTheme, 200);
            }
        });
    }

})();
