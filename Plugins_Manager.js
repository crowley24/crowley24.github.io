(function () {
    'use strict';

    const SETTINGS_COMPONENT = 'external_plugins_manager';
    const STORAGE_KEY = 'external_plugins_manager_settings';

    // ------------------------------
    // ⚙️ Налаштування за замовчуванням
    // ------------------------------
    const defaultSettings = {
        plugin1_enabled: true,
        plugin2_enabled: true,
        plugin1_url: 'https://crowley24.github.io/NewLogo.js',
        plugin2_url: 'https://tvigl.info/plugins/quality.js',

        foxstudio_interface_enabled: true,
        necardify_enabled: false,
        logo_enabled: false
    };

    // ------------------------------
    // 📌 LOAD / SAVE
    // ------------------------------
    function loadSettings() {
        const saved = Lampa.Storage.get(STORAGE_KEY);
        return Object.assign({}, defaultSettings, saved || {});
    }

    function saveSettings(newSet) {
        Lampa.Storage.set(STORAGE_KEY, newSet);
    }

    // ------------------------------
    // 📌 Завантаження зовнішнього JS
    // ------------------------------
    function injectScript(url) {
        try {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            document.body.appendChild(script);
        } catch (e) {
            console.error('Plugin loading error:', e);
        }
    }

    // ------------------------------
    // ▶️ Ініціалізація сторонніх плагінів
    // ------------------------------
    function initPlugins() {
        const s = loadSettings();

        if (s.plugin1_enabled) injectScript(s.plugin1_url);
        if (s.plugin2_enabled) injectScript(s.plugin2_url);

        if (s.necardify_enabled)
            injectScript('https://foxstudio24.github.io/lampa/necardify.js');

        if (s.logo_enabled)
            injectScript('https://foxstudio24.github.io/lampa/logo.js');

        // FoxStudio Interface — просто перемикач, якщо потрібно щось робити — тут
        if (s.foxstudio_interface_enabled) {
            console.log('FoxStudio Interface active');
        }
    }

    // ------------------------------
    // 🧩 Вкладка External Plugins Manager
    // ------------------------------
    Lampa.SettingsApi.addComponent({
        name: SETTINGS_COMPONENT,
        icon: 'ti ti-plug',
        title: 'External Plugins Manager',
        onRender: function (elem) {

            let s = loadSettings();
            let box = $('<div></div>');

            // ------------------------------
            // 🔹 Плагін 1: Logo by NewLogo.js
            // ------------------------------
            box.append(Lampa.SettingsApi.addSwitch({
                title: 'Plugin Logo (NewLogo)',
                description: 'Увімкнути / вимкнути заміну назв на логотипи',
                name: 'plugin1_enabled',
                default: s.plugin1_enabled,
                onchange: (val) => {
                    s.plugin1_enabled = val;
                    saveSettings(s);
                }
            }));

            // ------------------------------
            // 🔹 Плагін 2: Quality Badges
            // ------------------------------
            box.append(Lampa.SettingsApi.addSwitch({
                title: 'Plugin Quality Badges',
                description: 'Показувати якість на постерах',
                name: 'plugin2_enabled',
                default: s.plugin2_enabled,
                onchange: (val) => {
                    s.plugin2_enabled = val;
                    saveSettings(s);
                }
            }));

            // ------------------------------
            // ⭐ FoxStudio Interface
            // ------------------------------
            box.append(Lampa.SettingsApi.addSwitch({
                title: 'FoxStudio — Новий інтерфейс',
                description: 'Вмикає новий UI від FoxStudio',
                name: 'foxstudio_interface_enabled',
                default: s.foxstudio_interface_enabled,
                onchange: (val) => {
                    s.foxstudio_interface_enabled = val;
                    saveSettings(s);
                }
            }));

            // ------------------------------
            // ⭐ Necardify
            // ------------------------------
            box.append(Lampa.SettingsApi.addSwitch({
                title: 'FoxStudio — Necardify',
                description: 'Змінює стиль карток',
                name: 'necardify_enabled',
                default: s.necardify_enabled,
                onchange: (val) => {
                    s.necardify_enabled = val;
                    saveSettings(s);
                }
            }));

            // ------------------------------
            // ⭐ Logo.js (FoxStudio)
            // ------------------------------
            box.append(Lampa.SettingsApi.addSwitch({
                title: 'FoxStudio — Logo Plugin',
                description: 'Відображає логотипи через FoxStudio Logo.js',
                name: 'logo_enabled',
                default: s.logo_enabled,
                onchange: (val) => {
                    s.logo_enabled = val;
                    saveSettings(s);
                }
            }));

            elem.append(box);
        }
    });

    // ------------------------------
    // ▶️ AUTO START
    // ------------------------------
    initPlugins();

})();
