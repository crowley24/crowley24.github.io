(function() {  
    'use strict';  
      
    const PLUGIN_NAME = 'PluginManager';  
    const PLUGIN_ID = 'plugin_manager';  
      
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
      
    function isPluginInstalled(pluginId) {  
        const plugins = Lampa.Storage.get('plugins') || [];  
        return plugins.some(plugin => plugin.id === pluginId);  
    }  
      
    function installPlugin(plugin) {  
        if (isPluginInstalled(plugin.id)) {  
            Lampa.Noty.show('Плагін вже встановлено');  
            return;  
        }  
          
        Lampa.Storage.set('plugins', (Lampa.Storage.get('plugins') || []).concat([{  
            id: plugin.id,  
            name: plugin.name,  
            url: plugin.url  
        }]));  
          
        Lampa.Noty.show('Плагін встановлено. Перезавантажте додаток.');  
    }  
      
    function removePlugin(pluginId) {  
        const plugins = Lampa.Storage.get('plugins') || [];  
        const updatedPlugins = plugins.filter(plugin => plugin.id !== pluginId);  
        Lampa.Storage.set('plugins', updatedPlugins);  
        Lampa.Noty.show('Плагін видалено');  
    }  
      
    function showPluginsList() {  
        const items = AVAILABLE_PLUGINS.map(plugin => {  
            const installed = isPluginInstalled(plugin.id);  
            return {  
                title: plugin.name,  
                subtitle: plugin.description,  
                status: installed ? 'Встановлено' : 'Не встановлено',  
                plugin: plugin,  
                installed: installed,  
                onSelect: function() {  
                    if (installed) {  
                        Lampa.Controller.show('confirm', {  
                            title: 'Видалити плагін?',  
                            subtitle: plugin.name,  
                            select: () => {  
                                removePlugin(plugin.id);  
                            }  
                        });  
                    } else {  
                        Lampa.Controller.show('confirm', {  
                            title: 'Встановити плагін?',  
                            subtitle: plugin.name,  
                            select: () => {  
                                installPlugin(plugin);  
                            }  
                        });  
                    }  
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
      
    function addSettingsComponent() {  
        // Спосіб 1: Додати до існуючого компонента "interface"  
        Lampa.SettingsApi.addParam({  
            component: 'interface',  
            param: {  
                name: 'plugin_manager',  
                type: 'button',  
                values: {}  
            },  
            field: {  
                name: 'Менеджер плагінів'  
            },  
            onChange: showPluginsList  
        });  
    }  
      
    function initializePlugin() {  
        addSettingsComponent();  
        console.log('Plugin Manager initialized');  
    }  
      
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
