(function () {
    'use strict';

    const COMPONENT = 'external_plugins_manager';
    const STORAGE_KEY = 'external_plugins_manager_settings';

    const defaultSettings = {
        plugin1_enabled: true,
        plugin2_enabled: true,
        plugin1_url: 'https://crowley24.github.io/NewLogo.js',
        plugin2_url: 'https://tvigl.info/plugins/quality.js'
    };

    function loadSettings() {
        const saved = Lampa.Storage.get(STORAGE_KEY);
        return Object.assign({}, defaultSettings, saved || {});
    }

    function saveSettings(data) {
        Lampa.Storage.set(STORAGE_KEY, data);
    }

    function loadScript(url) {
        if (!url) return;

        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        document.body.appendChild(script);
    }

    // --- Створюємо вкладку в меню Інтерфейс ---
    Lampa.SettingsApi.addComponent({
        component: COMPONENT,
        name: 'Plugins (FoxStudio)',
        icon: '<svg width="20" height="20"><circle cx="10" cy="10" r="8" fill="#fff"/></svg>'
    });

    // --- Генеруємо самі налаштування ---
    Lampa.SettingsApi.addBlock({
        component: COMPONENT,
        group: true,
        type: 'settings',
        name: 'Plugins Manager',
        description: 'Керування зовнішніми плагінами',
        params: [
            // Тумблер 1 плагіну
            {
                name: 'plugin1_enabled',
                type: 'toggle',
                default: defaultSettings.plugin1_enabled,
                title: 'Увімкнути Plugin Logo',
            },
            // URL 1 плагіну
            {
                name: 'plugin1_url',
                type: 'input',
                default: defaultSettings.plugin1_url,
                title: 'URL для Logo'
            },

            // Тумблер 2 плагіну
            {
                name: 'plugin2_enabled',
                type: 'toggle',
                default: defaultSettings.plugin2_enabled,
                title: 'Увімкнути Plugin Quality'
            },
            // URL 2 плагіну
            {
                name: 'plugin2_url',
                type: 'input',
                default: defaultSettings.plugin2_url,
                title: 'URL для Quality'
            },

            // Кнопка перезавантаження
            {
                name: 'reload_plugins',
                type: 'button',
                title: 'Перезавантажити плагіни',
                onChange() {
                    const settings = loadSettings();

                    if (settings.plugin1_enabled) loadScript(settings.plugin1_url);
                    if (settings.plugin2_enabled) loadScript(settings.plugin2_url);

                    Lampa.Noty.show('Плагіни перезавантажено');
                }
            }
        ]
    });

    // --- Реакція на зміни параметрів ---
    Lampa.SettingsApi.listener.follow('change', function (event) {
        if (event.component !== COMPONENT) return;

        let settings = loadSettings();
        settings[event.name] = event.value;
        saveSettings(settings);

        if (event.name.endsWith('_enabled') && event.value) {
            // Якщо вмикаємо — одразу підвантажуємо
            const key = event.name.replace('_enabled', '_url');
            loadScript(settings[key]);
        }
    });

    // --- Автозавантаження плагінів при запуску ---
    const init = loadSettings();
    if (init.plugin1_enabled) loadScript(init.plugin1_url);
    if (init.plugin2_enabled) loadScript(init.plugin2_url);

    console.log('External Plugins Manager 2.0 loaded');
})();
