(function () {
    'use strict';

    const SETTINGS_COMPONENT = 'external_plugins_manager';
    const STORAGE_KEY = 'external_plugins_manager_settings';

    // ------------------------------
    // ⚙️ Налаштування (вже з твоїми URL)
    // ------------------------------
    const defaultSettings = {
        plugin1_enabled: true,
        plugin2_enabled: true,
        plugin1_url: 'https://crowley24.github.io/NewLogo.js',
        plugin2_url: 'https://tvigl.info/plugins/quality.js'
    };

    // ------------------------------
    // 📌 Load / Save
    // ------------------------------
    function loadSettings() {
        const saved = Lampa.Storage.get(STORAGE_KEY);
        return Object.assign({}, defaultSettings, saved || {});
    }

    function saveSettings(newSet) {
        Lampa.Storage.set(STORAGE_KEY, newSet);
    }

    // ------------------------------
    // 📌 Додавання сторонніх плагінів
    // ------------------------------
    function injectScript(url) {
        try {
            const tag = document.createElement('script');
            tag.src = url;
            tag.async = true;
            document.body.appendChild(tag);
        } catch (e) {
            console.error("Plugin loading error:", e);
        }
    }

    // ------------------------------
    // 📌 Ініціалізація
    // ------------------------------
    function initPlugins() {
        const s = loadSettings();

        if (s.plugin1_enabled) injectScript(s.plugin1_url);
        if (s.plugin2_enabled) injectScript(s.plugin2_url);
    }

    // ------------------------------
    // ⚙️ Вкладка в Налаштуваннях
    // ------------------------------
    Lampa.SettingsApi.addComponent({
        name: SETTINGS_COMPONENT,
        icon: 'ti ti-plug',
        title: 'External Plugins Manager',
        onRender: function (elem) {

            let settings = loadSettings();
            let box = $('<div></div>');

            // --- Плагін 1: Лого ---
            box.append(Lampa.SettingsApi.addSwitch({
                title: 'Plugin Logo',
                description: 'Увімкнути / вимкнути заміну назв на логотипи',
                name: 'plugin1_enabled',
                default: settings.plugin1_enabled,
                onchange: (val) => {
                    settings.plugin1_enabled = val;
                    saveSettings(settings);
                }
            }));

            // --- Плагін 2: Якість ---
            box.append(Lampa.SettingsApi.addSwitch({
                title: 'Plugin Quality Badges',
                description: 'Увімкнути / вимкнути якість на постерах',
                name: 'plugin2_enabled',
                default: settings.plugin2_enabled,
                onchange: (val) => {
                    settings.plugin2_enabled = val;
                    saveSettings(settings);
                }
            }));

            elem.append(box);
        }
    });

    // ------------------------------
    // ▶️ Запуск
    // ------------------------------
    initPlugins();

})();
