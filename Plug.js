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
  
    function checkPlugin(pluginUrl) {  
        const plugins = Lampa.Storage.get('plugins') || [];  
        return plugins.some(p => p.url === pluginUrl);  
    }  
  
    function togglePlugin(plugin) {  
        let plugins = Lampa.Storage.get('plugins') || [];  
        const installed = checkPlugin(plugin.url);  
  
        if (installed) {  
            plugins = plugins.filter(p => p.url !== plugin.url);  
            Lampa.Storage.set('plugins', plugins);  
            Lampa.Noty.show('Плагін видалено');  
        } else {  
            plugins.push({  
                id: plugin.id,  
                name: plugin.name,  
                url: plugin.url,  
                status: 1 // Активний  
            });  
            Lampa.Storage.set('plugins', plugins);  
            Lampa.Noty.show('Встановлено. ПЕРЕЗАПУСТІТЬ додаток повністю!');  
        }  
          
        Lampa.Settings.update();  
    }  
  
    // Створення компонента  
    Lampa.SettingsApi.addComponent({  
        component: 'plugin_manager_page',  
        name: 'Менеджер Плагінів',  
        icon: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6V18M6 12H18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'  
    });  
  
    // Додавання параметрів плагінів  
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
                var myResult = checkPlugin(plugin.url);  
                var pluginsArray = Lampa.Storage.get('plugins');  
                  
                setTimeout(function () {  
                    // Додаємо індикатор  
                    $('div[data-name="' + plugin.id + '"]').append('<div class="settings-param__status one"></div>');  
                      
                    var pluginStatus = null;  
                    for (var i = 0; i < pluginsArray.length; i++) {  
                        if (pluginsArray[i].url === plugin.url) {  
                            pluginStatus = pluginsArray[i].status;  
                            break;  
                        }  
                    }  
                      
                    if (myResult && pluginStatus !== 0) {  
                        // Встановлено та Активно (Зелений градієнт)  
                        $('div[data-name="' + plugin.id + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');  
                    } else if (pluginStatus === 0) {  
                        // Відключено (Помаранчевий градієнт)  
                        $('div[data-name="' + plugin.id + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');  
                    } else {  
                        // Не встановлено (Червоний градієнт)  
                        $('div[data-name="' + plugin.id + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');  
                    }  
                }, 100);  
            },  
            onChange: function () {  
                togglePlugin(plugin);  
            }  
        });  
    });  
  
})();
