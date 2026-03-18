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
                url: plugin.url  
            });  
            Lampa.Storage.set('plugins', plugins);  
            Lampa.Noty.show('Встановлено. Перезавантажте додаток!');  
        }  
          
        updateAllIndicators();  
    }  
  
    function updateIndicator(pluginId) {  
        const plugin = AVAILABLE_PLUGINS.find(p => p.id === pluginId);  
        if (!plugin) return;  
          
        const installed = isPluginInstalled(plugin);  
        const selector = `[data-name="plugin_${pluginId}"]`;  
        const element = $(selector);  
          
        if (element.length) {  
            element.find('.settings-param__status').remove();  
            element.removeClass('active');  
              
            const statusElement = $('<div class="settings-param__status"></div>');  
            statusElement.addClass(installed ? 'active' : 'wait');  
            element.prepend(statusElement);  
              
            if (installed) element.addClass('active');  
            element.find('.settings-param__value').text(installed ? 'Видалити' : 'Встановити');  
        }  
    }  
  
    function updateAllIndicators() {  
        AVAILABLE_PLUGINS.forEach(plugin => updateIndicator(plugin.id));  
    }  
  
    // Перехоплюємо оригінальний метод рендерингу  
    const originalRender = Lampa.Settings.render;  
    Lampa.Settings.render = function() {  
        const result = originalRender.apply(this, arguments);  
        setTimeout(updateAllIndicators, 100);  
        return result;  
    };  
  
    // Реєстрація параметрів  
    AVAILABLE_PLUGINS.forEach(plugin => {  
        Lampa.SettingsApi.addParam({  
            component: 'interface',  
            param: {  
                name: 'plugin_' + plugin.id,  
                type: 'button'  
            },  
            field: {  
                name: plugin.name,  
                description: plugin.description  
            },  
            onChange: () => togglePlugin(plugin)  
        });  
    });  
  
    // Додаємо data-атрибути для надійного пошуку  
    const originalAddParam = Lampa.SettingsApi.addParam;  
    Lampa.SettingsApi.addParam = function(params) {  
        if (params.param && params.param.name && params.param.name.startsWith('plugin_')) {  
            const originalOnRender = params.onRender;  
            params.onRender = function(item) {  
                item.attr('data-name', params.param.name);  
                if (originalOnRender) originalOnRender.call(this, item);  
            };  
        }  
        return originalAddParam.call(this, params);  
    };  
  
    // Слухач відкриття налаштувань  
    Lampa.Listener.follow('settings', (e) => {  
        if (e.type === 'open') {  
            setTimeout(updateAllIndicators, 200);  
        }  
    });  
  
    console.log('Plugin Manager initialized');  
})();
