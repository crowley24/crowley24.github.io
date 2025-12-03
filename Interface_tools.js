(function () {
    'use strict';

    const COMPONENT = 'plugin_manager_settings';
    const MENU_ITEM_NAME = 'plugin_manager_menu_item';
    const STORAGE_KEY = 'plugin_manager_settings_v2';

    const defaults = {
        logo_enabled: true,
        quality_enabled: true,
        logo_url: 'https://crowley24.github.io/NewLogo.js',
        quality_url: 'https://tvigl.info/plugins/quality.js'
    };

    // --- Storage helpers
    function loadSettings() {
        try {
            const s = Lampa.Storage.get(STORAGE_KEY);
            return Object.assign({}, defaults, s || {});
        } catch (e) {
            console.error('plugin_manager loadSettings', e);
            return Object.assign({}, defaults);
        }
    }

    function saveSettings(obj) {
        try {
            Lampa.Storage.set(STORAGE_KEY, obj);
        } catch (e) {
            console.error('plugin_manager saveSettings', e);
        }
    }

    // --- Script loader (prevents duplicate)
    function loadScript(url) {
        if (!url) return;
        if (document.querySelector('script[data-plugin-src="' + url + '"]')) return;
        const s = document.createElement('script');
        s.setAttribute('data-plugin-src', url);
        s.src = url;
        s.async = true;
        s.onload = function () { console.log('Loaded plugin:', url); };
        s.onerror = function () { console.warn('Failed load plugin:', url); };
        document.head.appendChild(s);
    }

    // --- Unload (only scripts loaded by this manager)
    function unloadScript(url) {
        const selector = url ? 'script[data-plugin-src="' + url + '"]' : 'script[data-plugin-src]';
        document.querySelectorAll(selector).forEach(function (el) { el.remove(); });
    }

    // --- Autoload on start
    (function autoload() {
        const s = loadSettings();
        if (s.logo_enabled) loadScript(s.logo_url);
        if (s.quality_enabled) loadScript(s.quality_url);
    })();

    // --- Add menu item into Extensions
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name !== 'extensions') return;

        // avoid duplicate insertion on repeated opens
        if (e.body.find('[data-name="' + MENU_ITEM_NAME + '"]').length) return;

        const item = $(
            '<div class="settings-param selector" data-name="' + MENU_ITEM_NAME + '">' +
                '<div class="settings-param__name">🔌 Менеджер Плагінів</div>' +
                '<div class="settings-param__value">➤</div>' +
            '</div>'
        );

        // insert near the end of the extensions list
        e.body.append(item);

        item.on('hover:enter', function () {
            Lampa.Settings.open(COMPONENT);
        });
    });

    // --- Register component + settings block (modern, compatible)
    // If SettingsApi is available
    if (Lampa.SettingsApi && Lampa.SettingsApi.addComponent && Lampa.SettingsApi.addBlock) {
        Lampa.SettingsApi.addComponent({
            component: COMPONENT,
            name: 'Менеджер Плагінів',
            icon: '<svg width="20" height="20"><rect rx="3" width="20" height="20" fill="#ffffff22"/></svg>'
        });

        Lampa.SettingsApi.addBlock({
            component: COMPONENT,
            group: true,
            name: 'manager',
            title: 'Менеджер Плагінів',
            description: 'Увімкнення/вимкнення NewLogo та Quality, налаштування URL',
            params: [
                { name: 'logo_enabled', type: 'toggle', default: defaults.logo_enabled, title: 'Увімкнути NewLogo' },
                { name: 'logo_url', type: 'input', default: defaults.logo_url, title: 'URL NewLogo' },
                { name: 'quality_enabled', type: 'toggle', default: defaults.quality_enabled, title: 'Увімкнути Quality' },
                { name: 'quality_url', type: 'input', default: defaults.quality_url, title: 'URL Quality' },
                {
                    name: 'reload_plugins',
                    type: 'button',
                    title: 'Перезавантажити плагіни',
                    onChange: function () {
                        const s = loadSettings();
                        // reload: remove manager scripts then load from URLs
                        unloadScript(); 
                        if (s.logo_enabled) loadScript(s.logo_url);
                        if (s.quality_enabled) loadScript(s.quality_url);
                        Lampa.Noty.show('Плагіни перезавантажено');
                    }
                }
            ]
        });

        // Listen changes from SettingsApi
        Lampa.SettingsApi.listener.follow('change', function (event) {
            if (event.component !== COMPONENT) return;
            const s = loadSettings();
            s[event.name] = event.value;
            saveSettings(s);

            // If toggled on — load immediately
            if (event.name === 'logo_enabled' && event.value) loadScript(s.logo_url);
            if (event.name === 'quality_enabled' && event.value) loadScript(s.quality_url);

            // If url changed and plugin is enabled — reload that plugin
            if (event.name === 'logo_url' && s.logo_enabled) {
                unloadScript(s.logo_url); // remove old by selector (we remove all then load)
                loadScript(event.value);
            }
            if (event.name === 'quality_url' && s.quality_enabled) {
                unloadScript(s.quality_url);
                loadScript(event.value);
            }
        });

    } else {
        // Fallback: older Lampa without SettingsApi — register simple component manually
        Lampa.Component.add(COMPONENT, function () {
            const self = this;
            this.element = Lampa.Template.js('settings_main');

            this.start = function () {
                const settings = loadSettings();

                Lampa.Background.set(Lampa.Utils.img('img/background.jpg'));
                Lampa.Controller.add(COMPONENT, {
                    toggle: true,
                    shift: true,
                    up: Lampa.Navigator.move('up'),
                    down: Lampa.Navigator.move('down'),
                    back: self.back
                });
                Lampa.Controller.toggle(COMPONENT);

                const list = [];

                list.push({
                    title: 'NewLogo.js',
                    subtitle: settings.logo_enabled ? 'Увімкнено' : 'Вимкнено',
                    value: settings.logo_enabled,
                    render: 'toggle',
                    onSelect: function () {
                        const v = !loadSettings().logo_enabled;
                        const s = loadSettings();
                        s.logo_enabled = v;
                        saveSettings(s);
                        if (v) loadScript(s.logo_url);
                        Lampa.Noty.show('Збережено. Для повного застосування може знадобитись перезапуск.');
                        self.start();
                    }
                });

                list.push({
                    title: 'URL NewLogo',
                    subtitle: settings.logo_url,
                    render: 'info',
                    onSelect: function () {
                        Lampa.Noty.show('Щоб змінити URL, відкрийте цей пункт у новій версії або через SettingsApi.');
                    }
                });

                list.push({
                    title: 'Quality.js',
                    subtitle: settings.quality_enabled ? 'Увімкнено' : 'Вимкнено',
                    value: settings.quality_enabled,
                    render: 'toggle',
                    onSelect: function () {
                        const v = !loadSettings().quality_enabled;
                        const s = loadSettings();
                        s.quality_enabled = v;
                        saveSettings(s);
                        if (v) loadScript(s.quality_url);
                        Lampa.Noty.show('Збережено. Для повного застосування може знадобитись перезапуск.');
                        self.start();
                    }
                });

                list.push({
                    title: 'URL Quality',
                    subtitle: settings.quality_url,
                    render: 'info'
                });

                list.push({ title: 'Перезавантажити плагіни', onSelect: function () {
                    const s = loadSettings();
                    unloadScript();
                    if (s.logo_enabled) loadScript(s.logo_url);
                    if (s.quality_enabled) loadScript(s.quality_url);
                    Lampa.Noty.show('Плагіни перезавантажено');
                }});

                Lampa.Settings.render(list, { title: 'Менеджер Плагінів', parent: self.element });
            };

            this.back = function () { Lampa.Settings.back(); };
            this.render = function () { return this.element; };
        });
    }

    console.log('Plugin Manager v2 loaded');
})();
