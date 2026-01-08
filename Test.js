function createSettings() {  
    let html = $('<div></div>');  
      
    // Додайте заголовок  
    html.append('<div class="settings__title">' + PLUGIN_TITLE + '</div>');  
      
    // Додайте налаштування для кожного плагіна  
    PLUGINS.forEach(plugin => {  
        const isEnabled = Lampa.Storage.get(plugin.key, true);  
          
        const setting = $('<div class="settings-param selector">' +  
            '<div class="settings-param__name">' + plugin.title + '</div>' +  
            '<div class="settings-param__value">' + (isEnabled ? 'Увімкнено' : 'Вимкнено') + '</div>' +  
            '</div>');  
          
        setting.on('hover:enter', function() {  
            const newState = !Lampa.Storage.get(plugin.key, true);  
            Lampa.Storage.set(plugin.key, newState);  
            setting.find('.settings-param__value').text(newState ? 'Увімкнено' : 'Вимкнено');  
        });  
          
        html.append(setting);  
    });  
      
    return {  
        render: function(container) {  
            container.empty().append(html);  
        },  
        destroy: function() {  
            html.remove();  
        }  
    };  
}
