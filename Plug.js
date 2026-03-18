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
            Lampa.Noty.show('Встановлено. Перезавантажте додаток!');  
        }  
          
        // Негайно оновлюємо індикатори  
        updateAllPluginIndicators();  
    }  
  
    function updatePluginIndicator(pluginId) {  
        const plugin = AVAILABLE_PLUGINS.find(p => p.id === pluginId);  
        if (!plugin) return;  
          
        const installed = isPluginInstalled(plugin);  
        const selector = `[data-name="plugin_${pluginId}"]`;  
        const item = $(selector);  
          
        if (item.length) {  
            // Видаляємо старий індикатор  
            item.find('.settings-param__status').remove();  
              
            // Додаємо новий індикатор  
            const statusElement = $('<div class="settings-param__status"></div>');  
            if (installed) {  
                statusElement.addClass('active');  
                item.addClass('active');  
            } else {  
                statusElement.addClass('wait');  
                item.removeClass('active');  
            }  
              
            item.prepend(statusElement);  
            item.find('.settings-param__value').text(installed ? 'Видалити' : 'Встановити');  
        }  
    }  
  
    function updateAllPluginIndicators() {  
        AVAILABLE_PLUGINS.forEach(plugin => {  
            updatePluginIndicator(plugin.id);  
        });  
    }  
  
    // Реєстрація компонента  
    Lampa.SettingsApi.addComponent({  
        component: 'plugin_manager_page',  
        name: 'Менеджер Плагінів',  
        icon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6V18M6 12H18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'  
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
                // Додаємо data-атрибут для легкого пошуку  
                item.attr('data-name', 'plugin_' + plugin.id);  
                  
                const installed = isPluginInstalled(plugin);  
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
  
    // Багаторазові спроби оновити індикатори  
    function ensureIndicatorsVisible() {  
        let attempts = 0;  
        const maxAttempts = 10;  
          
        const updateInterval = setInterval(() => {  
            updateAllPluginIndicators();  
            attempts++;  
              
            if (attempts >= maxAttempts) {  
                clearInterval(updateInterval);  
            }  
        }, 200);  
    }  
  
    // Слухачі подій для оновлення індикаторів  
    Lampa.Listener.follow('settings', (e) => {  
        if (e.type === 'open') {  
            setTimeout(ensureIndicatorsVisible, 100);  
        }  
    });  
  
    // Додатковий слухач для надійності  
    Lampa.Listener.follow('app', (e) => {  
        if (e.type === 'ready') {  
            setTimeout(updateAllPluginIndicators, 500);  
        }  
    });  
  
    // Періодична перевірка на випадок, якщо інші методи не спрацювали  
    setInterval(updateAllPluginIndicators, 2000);  
  
})();
