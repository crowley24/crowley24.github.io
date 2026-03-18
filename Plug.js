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
  
    const icon_plugin_manager = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6V18M6 12H18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;  
  
    function isPluginInstalled(plugin) {  
        const plugins = Lampa.Storage.get('plugins') || [];  
        return plugins.some(p => p.id === plugin.id || p.url === plugin.url);  
    }  
  
    function togglePlugin(plugin) {  
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
            Lampa.Noty.show('Встановлено. ПЕРЕЗАПУСТІТЬ додаток повністю!');  
        }  
          
        // Оновлюємо відображення негайно  
        setTimeout(() => {  
            Lampa.Settings.update();  
            // Примусово оновлюємо індикатори  
            updatePluginIndicators();  
        }, 100);  
    }  
  
    function updatePluginIndicators() {  
        $('.settings-param[data-name^="plugin_"]').each(function() {  
            const $item = $(this);  
            const pluginId = $item.data('name').replace('plugin_', '');  
            const plugin = AVAILABLE_PLUGINS.find(p => p.id === pluginId);  
              
            if (plugin) {  
                const installed = isPluginInstalled(plugin);  
                const $status = $item.find('.settings-param__status');  
                  
                if ($status.length === 0) {  
                    // Додаємо індикатор, якщо його немає  
                    const statusElement = $('<div class="settings-param__status"></div>');  
                    if (installed) {  
                        statusElement.addClass('active');  
                        $item.addClass('active');  
                    } else {  
                        statusElement.addClass('wait');  
                        $item.removeClass('active');  
                    }  
                    $item.prepend(statusElement);  
                } else {  
                    // Оновлюємо існуючий індикатор  
                    $status.removeClass('active wait');  
                    if (installed) {  
                        $status.addClass('active');  
                        $item.addClass('active');  
                    } else {  
                        $status.addClass('wait');  
                        $item.removeClass('active');  
                    }  
                }  
                  
                // Оновлюємо текст  
                $item.find('.settings-param__value').text(installed ? 'Видалити' : 'Встановити');  
            }  
        });  
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
                  
                // Додаємо візуальний індикатор стану  
                const statusElement = $('<div class="settings-param__status"></div>');  
                if (installed) {  
                    statusElement.addClass('active');  
                    item.addClass('active');  
                } else {  
                    statusElement.addClass('wait');  
                }  
                  
                item.prepend(statusElement);  
                item.find('.settings-param__value').text(installed ? 'Видалити' : 'Встановити');  
            },  
            onChange: function () {  
                togglePlugin(plugin);  
            }  
        });  
    });  
  
    // Додаємо слухача для оновлення індикаторів при відкритті налаштувань  
    Lampa.Listener.follow('settings', (e) => {  
        if (e.type === 'open') {  
            setTimeout(updatePluginIndicators, 200);  
        }  
    });  
  
})();
