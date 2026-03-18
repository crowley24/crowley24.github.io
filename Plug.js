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

    function isPluginInstalled(plugin) {
        const plugins = Lampa.Storage.get('plugins') || [];
        return plugins.some(p => p.id === plugin.id || p.url === plugin.url);
    }

    function togglePlugin(plugin, item) {
        let plugins = Lampa.Storage.get('plugins') || [];
        const installed = isPluginInstalled(plugin);

        if (installed) {
            plugins = plugins.filter(p => p.id !== plugin.id && p.url !== plugin.url);
            Lampa.Storage.set('plugins', plugins);
            Lampa.Noty.show('Плагін видалено');
        } else {
            plugins.push({
                id: plugin.id,
                name: plugin.name,
                url: plugin.url,
                status: 1
            });
            Lampa.Storage.set('plugins', plugins);
            Lampa.Noty.show('Встановлено. Перезавантажте додаток!');
        }

        // Оновлюємо конкретний елемент відразу після кліку
        renderStatus(plugin, item);
    }

    function renderStatus(plugin, item) {
        const installed = isPluginInstalled(plugin);
        
        // Очищуємо старі класи та елементи, щоб уникнути дублювання
        item.find('.settings-param__status').remove();
        item.removeClass('active');

        const statusElement = $('<div class="settings-param__status"></div>');
        
        if (installed) {
            statusElement.addClass('active');
            item.addClass('active');
            item.find('.settings-param__value').text('Видалити');
        } else {
            statusElement.addClass('wait');
            item.find('.settings-param__value').text('Встановити');
        }
        
        item.prepend(statusElement);
    }

    // Реєстрація сторінки
    Lampa.SettingsApi.addComponent({
        component: 'plugin_manager_page',
        name: 'Менеджер Плагінів',
        icon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6V18M6 12H18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    });

    // Реєстрація кнопок
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
                // Викликається щоразу, коли малюється рядок у налаштуваннях
                renderStatus(plugin, item);
            },
            onChange: function (value, item) {
                togglePlugin(plugin, item);
            }
        });
    });

})();
