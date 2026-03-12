(function () {  
    'use strict';  
      
    if (typeof Lampa === 'undefined') return;  
  
    // Конфігурація рядків за замовчуванням  
    const DEFAULT_ROWS = [  
        { id: 'trending', title: 'Тренди', defOrder: 1 },  
        { id: 'popular', title: 'Популярні', defOrder: 2 },  
        { id: 'new_movies', title: 'Нові фільми', defOrder: 3 },  
        { id: 'new_series', title: 'Нові серіали', defOrder: 4 }  
    ];  
  
    function createSettings() {  
        if (!window.Lampa || !Lampa.SettingsApi) return;  
          
        // Додаємо компонент налаштувань  
        Lampa.SettingsApi.addComponent({  
            component: 'mainpage_order',  
            name: 'Порядок головної',  
            icon: '<svg>...</svg>'  
        });  
  
        // Додаємо налаштування порядку для кожного рядка  
        let orderValues = {};  
        for (let i = 1; i <= DEFAULT_ROWS.length; i++) {  
            orderValues[i.toString()] = `Позиція ${i}`;  
        }  
  
        DEFAULT_ROWS.forEach(row => {  
            Lampa.SettingsApi.addParam({  
                component: 'mainpage_order',  
                param: {   
                    name: row.id + '_order',   
                    type: 'select',   
                    values: orderValues,   
                    default: row.defOrder.toString()   
                },  
                field: {   
                    name: 'Порядок: ' + row.title,   
                    description: 'Встановіть позицію цього рядка'   
                }  
            });  
        });  
    }  
  
    function overrideMainPage() {  
        // Зберігаємо оригінальний метод  
        const originalMain = Lampa.Api.sources.tmdb.main;  
          
        Lampa.Api.sources.tmdb.main = function (params, oncomplite, onerror) {  
            // Отримуємо порядок з налаштувань  
            let orderedRows = DEFAULT_ROWS.map(row => {  
                const order = parseInt(Lampa.Storage.get(row.id + '_order')) || row.defOrder;  
                return { ...row, order };  
            });  
              
            // Сортуємо рядки за порядком  
            orderedRows.sort((a, b) => a.order - b.order);  
              
            // Викликаємо оригінальний метод з модифікованими параметрами  
            // Тут ви можете додати логіку для зміни порядку контенту  
            return originalMain.call(this, params, oncomplite, onerror);  
        };  
    }  
  
    function start() {  
        createSettings();  
        overrideMainPage();  
    }  
  
    // Запускаємо плагін  
    if (window.appready) start();  
    else Lampa.Listener.follow('app', function (e) {   
        if (e.type === 'ready') start();   
    });  
  
})();
