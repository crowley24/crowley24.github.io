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

    // Функція перевірки (тепер перевіряємо і ID, і URL)
    function isPluginInstalled(plugin) {
        const plugins = Lampa.Storage.get('plugins') || [];
        return plugins.some(p => p.id === plugin.id || p.url === plugin.url);
    }

    function togglePlugin(plugin) {
        let plugins = Lampa.Storage.get('plugins') || [];
        const installed = isPluginInstalled(plugin);

        if (installed) {
            // Видаляємо всі копії за ID або URL
            plugins = plugins.filter(p => p.id !== plugin.id && p.url !== plugin.url);
            Lampa.Storage.set('plugins', plugins);
            Lampa.Noty.show('Плагін видалено');
        } else {
            // Додаємо новий плагін у форматі Lampa
            plugins.push({
                id: plugin.id,
                name: plugin.name,
                url: plugin.url,
                status: 1 // Додаємо статус "активний"
            });
            Lampa.Storage.set('plugins', plugins);
            Lampa.Noty.show('Встановлено. ПЕРЕЗАПУСТІТЬ додаток повністю!');
        }
        
        // Оновлюємо відображення в меню
        Lampa.Settings.update();
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
                // Змінюємо текст праворуч на кнопці
                item.find('.settings-param__value').text(installed ? 'Видалити' : 'Встановити');
                
                // Якщо встановлено, можна додати візуальний індикатор (опційно)
                if (installed) item.addClass('active');
            },
            onChange: function () {
                togglePlugin(plugin);
            }
        });
    });

})();
