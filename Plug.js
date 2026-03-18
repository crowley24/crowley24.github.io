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
  
    function getPluginStatus(plugin) {  
        const plugins = Lampa.Storage.get('plugins') || [];  
        const found = plugins.find(p => p.id === plugin.id || p.url === plugin.url);  
          
        if (!found) return -1; // Не встановлено  
        return found.status === 0 ? 0 : 1; // 0 = вимкнено, 1 = активно  
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
          
        updatePluginIndicators();  
    }  
  
    function updatePluginIndicators() {  
        AVAILABLE_PLUGINS.forEach(plugin => {  
            const pluginStatus = getPluginStatus(plugin);  
            const pluginNameInternal = 'plugin_' + plugin.id;  
              
            setTimeout(() => {  
                // Логіка відображення статусу (кольори градієнта)  
                if (pluginStatus > 0) {  
                    // Встановлено та Активно (Зелений)  
                    $('div[data-name="' + pluginNameInternal + '"]').find('.settings-param__status')  
                        .removeClass('active error')  
                        .css('background', 'linear-gradient(45deg, #11e400, #36a700)');  
                } else if (pluginStatus === 0) {  
                    // Встановлено, але Вимкнено (Помаранчевий)  
                    $('div[data-name="' + pluginNameInternal + '"]').find('.settings-param__status')  
                        .removeClass('active error')  
                        .css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');  
                } else {  
                    // Не встановлено (Червоний)  
                    $('div[data-name="' + pluginNameInternal + '"]').find('.settings-param__status')  
                        .removeClass('active error')  
                        .css('background', 'linear-gradient(45deg, #ff0000, #c40000)');  
                }  
            }, 100);  
        });  
    }  
  
    function showPluginsList() {  
        const items = AVAILABLE_PLUGINS.map(plugin => {  
            const installed = isPluginInstalled(plugin);  
            const status = getPluginStatus(plugin);  
              
            let statusText = 'Не встановлено';  
            if (status > 0) statusText = 'Активно';  
            else if (status === 0) statusText = 'Вимкнено';  
              
            return {  
                title: plugin.name,  
                subtitle: plugin.description + ' - ' + statusText,  
                onSelect: function() {  
                    togglePlugin(plugin);  
                }  
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
  
    // Додавання параметрів для кожного плагіна  
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
                const status = getPluginStatus(plugin);  
                  
                // Додаємо data-атрибут для пошуку  
                item.attr('data-name', 'plugin_' + plugin.id);  
                  
                // Створюємо індикатор статусу  
                const statusElement = $('<div class="settings-param__status"></div>');  
                  
                // Встановлюємо початковий колір градієнта  
                if (status > 0) {  
                    statusElement.css('background', 'linear-gradient(45deg, #11e400, #36a700)');  
                } else if (status === 0) {  
                    statusElement.css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');  
                } else {  
                    statusElement.css('background', 'linear-gradient(45deg, #ff0000, #c40000)');  
                }  
                  
                item.prepend(statusElement);  
                item.find('.settings-param__value').text(installed ? 'Видалити' : 'Встановити');  
                  
                if (installed) item.addClass('active');  
            },  
            onChange: function () {  
                togglePlugin(plugin);  
            }  
        });  
    });  
  
    // Слухач для оновлення індикаторів при відкритті налаштувань  
    Lampa.Listener.follow('settings', (e) => {  
        if (e.type === 'open') {  
            setTimeout(updatePluginIndicators, 300);  
        }  
    });  
  
    console.log('Plugin Manager with gradient indicators initialized');  
})();
