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
  
    // Перехоплюємо оригінальний метод рендерингу налаштувань  
    const originalRender = Lampa.Settings.render;  
    Lampa.Settings.render = function() {  
        const result = originalRender.apply(this, arguments);  
        setTimeout(updateAllIndicators, 100);  
        return result;  
    };  
  
    // Створюємо компонент  
    Lampa.SettingsApi.addComponent({  
        component: 'plugin_manager_page',  
        name: 'Менеджер Плагінів'  
    });  
  
    // Додаємо параметри з data-атрибутами для надійного пошуку  
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
            onChange: function () {  
                togglePlugin(plugin);  
            }  
        });  
    });  
  
    // MutationObserver для відстеження змін в DOM  
    const observer = new MutationObserver(function(mutations) {  
        mutations.forEach(function(mutation) {  
            if (mutation.addedNodes.length) {  
                setTimeout(updateAllIndicators, 50);  
            }  
        });  
    });  
  
    // Слухач для відкриття налаштувань  
    Lampa.Listener.follow('settings', (e) => {  
        if (e.type === 'open') {  
            setTimeout(() => {  
                updateAllIndicators();  
                observer.observe(document.body, {  
                    childList: true,  
                    subtree: true  
                });  
            }, 200);  
        } else if (e.type === 'close') {  
            observer.disconnect();  
        }  
    });  
  
    // Резервний періодичний оновлення  
    setInterval(updateAllIndicators, 3000);  
  
})();
