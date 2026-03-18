(function() { 
    'use strict'; 

    // Додаємо необхідні стилі для індикаторів прямо в DOM
    const style = `
        <style>
            .plugin-status-dot {
                width: 0.5rem;
                height: 0.5rem;
                border-radius: 50%;
                display: inline-block;
                margin-right: 0.7rem;
                vertical-align: middle;
            }
            .plugin-status-dot.active { background-color: #2ecc71; box-shadow: 0 0 5px #2ecc71; }
            .plugin-status-dot.wait { background-color: #95a5a6; }
            .settings-param.active .settings-param__name { color: #fff; }
        </style>
    `;
    $('body').append(style);

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

    function updateItemState(plugin, item) { 
        const installed = isPluginInstalled(plugin); 
        const nameLabel = item.find('.settings-param__name');
        
        // Видаляємо старий індикатор, якщо він є
        nameLabel.find('.plugin-status-dot').remove();
        
        // Створюємо новий індикатор
        const dot = $('<div class="plugin-status-dot"></div>');
        dot.addClass(installed ? 'active' : 'wait');
        
        nameLabel.prepend(dot);
        item.find('.settings-param__value').text(installed ? 'Видалити' : 'Встановити');
        
        if (installed) item.addClass('active');
        else item.removeClass('active');
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
        updateItemState(plugin, item); 
    } 

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
                // Використовуємо таймаут, щоб дати Lampa завершити побудову DOM рядка
                setTimeout(() => updateItemState(plugin, item), 10);
            }, 
            onChange: function (value, item) { 
                togglePlugin(plugin, item); 
            } 
        }); 
    }); 
})();
