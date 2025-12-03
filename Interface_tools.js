(function() {  
    'use strict';  
      
    Lampa.Settings.listener.follow('open', function(e) {  
        if (e.name === 'main') {  
            // Створюємо пункт меню  
            const menu_item = $('<div class="settings-param selector" data-name="new_menu_item">');  
            menu_item.append('<div class="settings-param__name">Новий пункт</div>');  
            menu_item.append('<div class="settings-param__value">➤</div>');  
              
            // Додаємо в основний список  
            e.body.append(menu_item);  
              
            // Обробник кліку  
            menu_item.on('hover:enter', function() {  
                Lampa.Settings.open('new_menu_item');  
            });  
        }  
          
        // Порожня сторінка при відкритті  
        if (e.name === 'new_menu_item') {  
            e.body.append('<div style="padding: 20px; text-align: center;">Сторінка нового пункту</div>');  
        }  
    });  
      
    console.log('Новий пункт меню додано');  
})();
