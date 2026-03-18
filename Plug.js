(function() {  
    'use strict';  
      
    const PLUGIN_NAME = 'PluginManager';  
    const PLUGIN_ID = 'plugin_manager';  
      
    // Список доступних плагінів  
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
      
    // Перевірка чи встановлено плагін  
    function isPluginInstalled(pluginId) {  
        return Lampa.Storage.get('plugins') || []).some(plugin => plugin.id === pluginId);  
    }  
      
    // Встановлення плагіна  
    function installPlugin(plugin) {  
        if (isPluginInstalled(plugin.id)) {  
            Lampa.Noty.show('Плагін вже встановлено');  
            return;  
        }  
          
        Lampa.Activity.push({  
            url: plugin.url,  
            component: 'install',  
            name: PLUGIN_NAME  
        });  
    }  
      
    // Видалення плагіна  
    function removePlugin(pluginId) {  
        const plugins = Lampa.Storage.get('plugins') || [];  
        const updatedPlugins = plugins.filter(plugin => plugin.id !== pluginId);  
        Lampa.Storage.set('plugins', updatedPlugins);  
        Lampa.Noty.show('Плагін видалено');  
    }  
      
    // Створення інтерфейсу списку плагінів  
    function createPluginsList() {  
        const plugins = AVAILABLE_PLUGINS.map(plugin => {  
            const installed = isPluginInstalled(plugin.id);  
            return {  
                title: plugin.name,  
                subtitle: plugin.description,  
                status: installed ? 'Встановлено' : 'Не встановлено',  
                plugin: plugin,  
                installed: installed  
            };  
        });  
          
        return plugins;  
    }  
      
    // Додавання компонента в налаштування  
    function addSettingsComponent() {  
        Lampa.SettingsApi.addComponent({  
            component: PLUGIN_ID,  
            name: 'Менеджер плагінів',  
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23.15L12 24L16.38 23.15C19.77 20.68 22 16.5 22 12V7L12 2Z" fill="currentColor"/></svg>'  
        });  
          
        // Додавання параметра для відображення списку плагінів  
        Lampa.SettingsApi.addParam({  
            component: PLUGIN_ID,  
            param: {  
                name: 'plugins_list',  
                type: 'static',  
                values: {}  
            },  
            field: {  
                name: 'Доступні плагіни'  
            },  
            onChange: () => {  
                showPluginsList();  
            }  
        });  
    }  
      
    // Показ списку плагінів  
    function showPluginsList() {  
        const plugins = createPluginsList();  
          
        const items = plugins.map(item => ({  
            title: item.title,  
            subtitle: item.subtitle,  
            status: item.status,  
            plugin: item.plugin,  
            installed: item.installed,  
            onSelect: () => {  
                if (item.installed) {  
                    Lampa.Controller.show('confirm', {  
                        title: 'Видалити плагін?',  
                        subtitle: item.title,  
                        select: () => {  
                            removePlugin(item.plugin.id);  
                            showPluginsList(); // Оновити список  
                        }  
                    });  
                } else {  
                    Lampa.Controller.show('confirm', {  
                        title: 'Встановити плагін?',  
                        subtitle: item.title,  
                        select: () => {  
                            installPlugin(item.plugin);  
                        }  
                    });  
                }  
            }  
        }));  
          
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
      
    // Ініціалізація плагіна  
    function initializePlugin() {  
        addSettingsComponent();  
        console.log('Plugin Manager initialized');  
    }  
      
    // Запуск плагіна  
    function startPlugin() {  
        try {  
            initializePlugin();  
        } catch (error) {  
            console.error('Failed to initialize Plugin Manager:', error);  
        }  
    }  
      
    if (window.appready) {  
        startPlugin();  
    } else {  
        Lampa.Listener.follow('app', (e) => {  
            if (e.type === 'ready') {  
                startPlugin();  
            }  
        });  
    }  
})();
