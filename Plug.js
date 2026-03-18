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

    // Іконка в форматі SVG (іконка "плюс" або "пакет")
    const icon_plugin_manager = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6V18M6 12H18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    function isPluginInstalled(pluginId) {
        const plugins = Lampa.Storage.get('plugins') || [];
        return plugins.some(p => p.id === pluginId);
    }

    function togglePlugin(plugin) {
        let plugins = Lampa.Storage.get('plugins') || [];
        const installed = isPluginInstalled(plugin.id);

        if (installed) {
            plugins = plugins.filter(p => p.id !== plugin.id);
            Lampa.Noty.show('Плагін видалено');
        } else {
            plugins.push({ id: plugin.id, name: plugin.name, url: plugin.url });
            Lampa.Noty.show('Встановлено. Перезавантажте додаток');
        }
        Lampa.Storage.set('plugins', plugins);
    }

    // Створюємо компонент налаштувань
    Lampa.SettingsApi.addComponent({
        component: 'plugin_manager_page',
        name: 'Менеджер Плагінів',
        icon: icon_plugin_manager
    });

    // Слухаємо відкриття нашого нового компонента
    Lampa.SettingsApi.addParam({
        component: 'plugin_manager_page',
        param: { name: 'plugin_list_info', type: 'static' },
        field: { name: 'Доступні розширення', description: 'Натисніть для встановлення або видалення' }
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
                const installed = isPluginInstalled(plugin.id);
                item.find('.settings-param__value').text(installed ? 'Встановлено (Видалити)' : 'Не встановлено');
            },
            onChange: function () {
                togglePlugin(plugin);
                Lampa.Settings.update(); // Оновлюємо вікно, щоб змінити текст кнопки
            }
        });
    });

    console.log('Plugin Manager Component: Initialized');

})();
