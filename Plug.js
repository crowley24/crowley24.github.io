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
            Lampa.Noty.show('Встановлено. ПЕРЕЗАПУСТІТЬ додаток повністю!');  
        }  
          
        Lampa.Settings.update();  
    }  
  
    function showPluginsList() {  
        const items = AVAILABLE_PLUGINS.map(plugin => {  
            const installed = isPluginInstalled(plugin);  
            return {  
                title: plugin.name,  
                subtitle: plugin.description,  
                onSelect: () => togglePlugin(plugin)  
            };  
        });  
  
        Lampa.Select.show({  
            title: 'Менеджер плагінів',  
            items: items,  
            onSelect: function(item) {  
                item.onSelect();  
            },  
            onBack: function() {  
                Lampa.Settings.edit();  
            }  
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
                const myResult = isPluginInstalled(plugin);  
                const pluginsArray = Lampa.Storage.get('plugins');  
                  
                setTimeout(function () {  
                    // Додаємо індикатор до елемента  
                    $('div[data-name="plugin_' + plugin.id + '"]').append('<div class="settings-param__status one"></div>');  
                      
                    let pluginStatus = null;  
                    for (let i = 0; i < pluginsArray.length; i++) {  
                        if (pluginsArray[i].url === plugin.url) {  
                            pluginStatus = pluginsArray[i].status;  
                            break;  
                        }  
                    }  
                      
                    if (myResult && pluginStatus !== 0) {  
                        // Встановлено та Активно (Зелений градієнт)  
                        $('div[data-name="plugin_' + plugin.id + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');  
                    } else if (pluginStatus === 0) {  
                        // Відключено (Помаранчевий градієнт)  
                        $('div[data-name="plugin_' + plugin.id + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');  
                    } else {  
                        // Не встановлено (Червоний градієнт)  
                        $('div[data-name="plugin_' + plugin.id + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');  
                    }  
                }, 100);  
            },  
            onChange: function () {  
                togglePlugin(plugin);  
            }  
        });  
    });  
  
    // Слухач для оновлення індикаторів при відкритті налаштувань  
    Lampa.Listener.follow('settings', (e) => {  
        if (e.type === 'open') {  
            setTimeout(() => {  
                AVAILABLE_PLUGINS.forEach(plugin => {  
                    const myResult = isPluginInstalled(plugin);  
                    const pluginsArray = Lampa.Storage.get('plugins');  
                      
                    // Додаємо індикатор, якщо його немає  
                    if (!$('div[data-name="plugin_' + plugin.id + '"]').find('.settings-param__status').length) {  
                        $('div[data-name="plugin_' + plugin.id + '"]').append('<div class="settings-param__status one"></div>');  
                    }  
                      
                    let pluginStatus = null;  
                    for (let i = 0; i < pluginsArray.length; i++) {  
                        if (pluginsArray[i].url === plugin.url) {  
                            pluginStatus = pluginsArray[i].status;  
                            break;  
                        }  
                    }  
                      
                    if (myResult && pluginStatus !== 0) {  
                        $('div[data-name="plugin_' + plugin.id + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');  
                    } else if (pluginStatus === 0) {  
                        $('div[data-name="plugin_' + plugin.id + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');  
                    } else {  
                        $('div[data-name="plugin_' + plugin.id + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');  
                    }  
                });  
            }, 300);  
        }  
    });  
  
})();
