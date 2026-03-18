(function() {
    'use strict';

    const AVAILABLE_PLUGINS = [
        {
            name: 'Mobile Interface',
            description: 'Мобільний інтерфейс картки фільму',
            url: 'https://crowley24.github.io/main/Mob_Interface.js',
            id: 'mob_interface'
        },
        {
            name: 'Custom Buttons',
            description: 'Кастомізація кнопок в картці фільму',
            url: 'http://lampaua.mooo.com/buttons.js',
            id: 'custom_buttons'
        }
    ];

    function getPlugins() {
        return Lampa.Storage.get('plugins') || [];
    }

    function savePlugins(list) {
        Lampa.Storage.set('plugins', list);
    }

    function findPlugin(url) {
        return getPlugins().find(p => p.url === url);
    }

    function togglePlugin(plugin) {
        let plugins = getPlugins();
        let existing = findPlugin(plugin.url);

        if (!existing) {
            // Встановити
            plugins.push({
                id: plugin.id,
                name: plugin.name,
                url: plugin.url,
                status: 1
            });

            Lampa.Noty.show('✅ Встановлено');
        } else {
            // Переключити статус
            existing.status = existing.status === 1 ? 0 : 1;

            if (existing.status === 1) {
                Lampa.Noty.show('🟢 Увімкнено');
            } else {
                Lampa.Noty.show('🟠 Вимкнено');
            }
        }

        savePlugins(plugins);

        // Оновлення UI
        Lampa.Settings.update();
    }

    function getStatus(plugin) {
        let existing = findPlugin(plugin.url);

        if (!existing) return 'not_installed';
        if (existing.status === 0) return 'disabled';
        return 'enabled';
    }

    function applyStatusStyle(el, status) {
        if (status === 'enabled') {
            el.css('background', 'linear-gradient(45deg, #11e400, #36a700)');
        } else if (status === 'disabled') {
            el.css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
        } else {
            el.css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
        }
    }

    // Компонент
    Lampa.SettingsApi.addComponent({
        component: 'plugin_manager_page',
        name: 'Менеджер Плагінів',
        icon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M12 6V18M6 12H18" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>'
    });

    AVAILABLE_PLUGINS.forEach(plugin => {
        Lampa.SettingsApi.addParam({
            component: 'plugin_manager_page',
            param: {
                name: plugin.id,
                type: 'button'
            },
            field: {
                name: plugin.name,
                description: plugin.description
            },

            onRender: function (item) {
                let status = getStatus(plugin);

                let statusEl = item.find('.settings-param__status');

                if (!statusEl.length) {
                    statusEl = $('<div class="settings-param__status"></div>');
                    item.append(statusEl);
                }

                applyStatusStyle(statusEl, status);
            },

            onChange: function () {
                togglePlugin(plugin);
            }
        });
    });

})();
