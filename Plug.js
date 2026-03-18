(function () {
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

    const icon_plugin_manager = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6V18M6 12H18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    function getPlugins() {
        return Lampa.Storage.get('plugins') || [];
    }

    function isInstalled(plugin) {
        return getPlugins().some(p => p.url === plugin.url);
    }

    // Функція оновлення тексту статусу без використання JQuery $
    function updateStatusText(element, installed) {
        const valueElement = element.querySelector('.settings-param__value');
        if (valueElement) {
            if (installed) {
                valueElement.innerHTML = '<span style="color: #2ecc71;">● Встановлено</span>';
            } else {
                valueElement.innerHTML = '<span style="color: #aaaaaa;">○ Не встановлено</span>';
            }
        }
    }

    function toggle(plugin, element) {
        let plugins = getPlugins();
        const installed = isInstalled(plugin);

        if (installed) {
            plugins = plugins.filter(p => p.url !== plugin.url);
            Lampa.Noty.show('Видалено');
        } else {
            plugins.push({
                id: plugin.id,
                name: plugin.name,
                url: plugin.url,
                status: 1
            });
            Lampa.Noty.show('Встановлено. Перезапустіть додаток');
        }

        Lampa.Storage.set('plugins', plugins);
        updateStatusText(element, !installed);
    }

    // Реєстрація компонента
    Lampa.SettingsApi.addComponent({
        component: 'plugin_manager_page',
        name: 'Менеджер Плагінів',
        icon: icon_plugin_manager
    });

    AVAILABLE_PLUGINS.forEach(plugin => {
        Lampa.SettingsApi.addParam({
            component: 'plugin_manager_page',
            param: {
                name: 'plugin_' + plugin.id,
                type: 'button'
            },
            field: {
                name: plugin.name,
                description: plugin.description
            },
            onRender: function (item) {
                // item[0] — це чистий DOM елемент у Lampa
                const el = item[0] || item; 
                updateStatusText(el, isInstalled(plugin));
            },
            onChange: function (data) {
                const el = data.item[0] || data.item;
                toggle(plugin, el);
            }
        });
    });

    console.log('Plugin Manager: Started');
})();
