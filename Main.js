(function () {  
    'use strict';  
      
    if (typeof Lampa === 'undefined') return;  
  
    // Стандартні рядки Lampa  
    const LAMPA_ROWS = [  
        { id: 'trending', title: 'Тренди', defOrder: 1 },  
        { id: 'popular', title: 'Популярні', defOrder: 2 },  
        { id: 'new_movies', title: 'Новинки фільмів', defOrder: 3 },  
        { id: 'new_series', title: 'Новинки серіалів', defOrder: 4 },  
        { id: 'top_rated', title: 'Найвищий рейтинг', defOrder: 5 },  
        { id: 'upcoming', title: 'Очікувані', defOrder: 6 },  
        { id: 'airing_today', title: 'Сьогодні в ефірі', defOrder: 7 }  
    ];  
  
    function createSettings() {  
        if (!window.Lampa || !Lampa.SettingsApi) return;  
          
        Lampa.SettingsApi.addComponent({  
            component: 'mainpage_order',  
            name: 'Порядок головної',  
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>'  
        });  
  
        let orderValues = {};  
        for (let i = 1; i <= LAMPA_ROWS.length; i++) {  
            orderValues[i.toString()] = `Позиція ${i}`;  
        }  
  
        LAMPA_ROWS.forEach(row => {  
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
        const originalMain = Lampa.Api.sources.tmdb.main;  
          
        Lampa.Api.sources.tmdb.main = function (params, oncomplite, onerror) {  
            const originalCallback = oncomplite;  
              
            oncomplite = function(data) {  
                if (data && data.results) {  
                    // Переконуємось що кожен результат має обов'язкові поля  
                    const processedResults = data.results.map((item, index) => {  
                        // Визначаємо rowId на основі типу контенту  
                        let rowId = 'row_' + index;  
                        if (item.title) {  
                            rowId = item.title.replace(/\s+/g, '_').toLowerCase();  
                        } else if (item.name) {  
                            rowId = item.name.replace(/\s+/g, '_').toLowerCase();  
                        }  
                          
                        // Отримуємо порядок з налаштувань  
                        const order = parseInt(Lampa.Storage.get(rowId + '_order')) || (index + 1);  
                          
                        // Повертаємо об'єкт з усіма обов'язковими полями  
                        return {  
                            ...item,  
                            order: order,  
                            rowId: rowId,  
                            name: item.name || item.title || 'Row ' + index,  
                            title: item.title || item.name || 'Row ' + index  
                        };  
                    });  
                      
                    // Сортуємо за порядком  
                    processedResults.sort((a, b) => a.order - b.order);  
                      
                    // Повертаємо відсортовані дані  
                    return originalCallback({ ...data, results: processedResults });  
                }  
                return originalCallback(data);  
            };  
              
            return originalMain.call(this, params, oncomplite, onerror);  
        };  
    }  
  
    function start() {  
        createSettings();  
        overrideMainPage();  
    }  
  
    if (window.appready) start();  
    else Lampa.Listener.follow('app', function (e) {   
        if (e.type === 'ready') start();   
    });  
  
})();
