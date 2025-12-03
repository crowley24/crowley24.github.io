(function() {  
    'use strict';  
      
    Lampa.Settings.listener.follow('open', function(e) {  
        if (e.name === 'main') {  
            // Створюємо пункт меню  
            const menu_item = $('<div class="settings-param selector" data-name="interface_tools">');  
            menu_item.append('<div class="settings-param__name">Interface Tools</div>');  
            menu_item.append('<div class="settings-param__value">➤</div>');  
              
              
            // Обробник кліку - відкриває порожню сторінку  
            menu_item.on('hover:enter', function() {  
                Lampa.Settings.open('interface_tools');  
            });  
        }  
          
        // Відображення порожньої сторінки  
        if (e.name === 'interface_tools') {  
            e.body.append('<div style="padding: 20px; text-align: center;">Сторінка Interface Tools</div>');  
        }  
    });  
      
    console.log('Interface Tools menu item added');  
})();
