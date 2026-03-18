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

    // Додаємо CSS для красивого відображення статусів
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            .plugin-status {
                display: flex;
                align-items: center;
                font-weight: bold;
            }
            .plugin-status__dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                margin-right: 8px;
                display: inline-block;
            }
            .plugin-status--installed {
                color: #2ecc71; /* Зелений */
            }
            .plugin-status--installed .plugin-status__dot {
                background-color: #2ecc71;
                box-shadow: 0 0 5px rgba(46, 204, 113, 0.5);
            }
            .plugin-status--not-installed {
                color: #aaaaaa; /* Сірий */
            }
            .plugin-status--not-installed .plugin-status__dot {
                background-color: #aaaaaa;
            }
        `)
        .appendTo('head');

    function isPluginInstalled(plugin) {
        const plugins = Lampa.Storage.get('plugins') || [];
        return plugins.some(p => p.id === plugin.id || p.url === plugin.url);
    }

    // Функція для отримання HTML-коду статусу
    function getStatusHtml(installed) {
        if (installed) {
            return `<div class="plugin-status plugin-status--installed"><span class="plugin-status__dot"></span>Встановлено</div>`;
        } else {
            return `<div class="plugin-status plugin-status--not-installed"><span class="plugin-status__dot"></span>Не встановлено</div>`;
        }
    }

    function togglePlugin(plugin, itemHtml) {
        let plugins = Lampa.Storage.get('plugins') || [];
        const installed = isPluginInstalled(plugin);

        if (installed) {
            // Видаляємо
            plugins = plugins.filter(p => p.id !== plugin.id && p.url !== plugin.url);
            Lampa.Storage.set('plugins', plugins);
            Lampa.Noty.show('Плагін видалено');
        } else {
            // Додаємо
            plugins.push({
                id: plugin.id,
                name: plugin.name,
                url: plugin.url,
                status: 1
            });
            Lampa.Storage.set('plugins', plugins);
            Lampa.Noty.show('Встановлено. Перезавантажте додаток');
        }

        // Оновлюємо візуальний статус негайно після натискання
        const newInstalledStatus = !installed;
        itemHtml.find('.settings-param__value').html(getStatusHtml(newInstalledStatus));
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
                const installed = isPluginInstalled(plugin);
                // Початковий рендер статусу
                item.find('.settings-param__value').html(getStatusHtml(installed));
            },
            onChange: function (data) {
                // Передаємо HTML елемент кнопки (data.item), щоб оновити його всередині togglePlugin
                togglePlugin(plugin, data.item);
            }
        });
    });

})();
