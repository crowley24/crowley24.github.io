(function () {  
    'use strict';  
      
    if (typeof Lampa === 'undefined') return;  
  
    // Функція для отримання реальних рядків з Lampa  
    function getRealLampaRows() {  
        // Запускаємо оригінальний метод для отримання структури рядків  
        const originalMain = Lampa.Api.sources.tmdb.main;  
        let realRows = [];  
          
        // Тимчасово перехоплюємо виклик для отримання даних  
        Lampa.Api.sources.tmdb.main = function (params, oncomplite, onerror) {  
            // Зберігаємо callback для аналізу даних  
            const originalCallback = oncomplite;  
              
            oncomplite = function(data) {  
                // Аналізуємо отримані дані для визначення рядків  
                if (data && data.results) {  
                    data.results.forEach(item => {  
                        if (item.title && !realRows.find(r => r.id === item.title)) {  
                            realRows.push({  
                                id: item.title.replace(/\s+/g, '_').toLowerCase(),  
                                title: item.title,  
                                defOrder: realRows.length + 1  
                            });  
                        }  
                    });  
                }  
                return originalCallback(data);  
            };  
              
            return originalMain.call(this, params, oncomplite, onerror);  
        };  
          
        return realRows;  
    }  
  
    function createSettings() {  
        if (!window.Lampa || !Lampa.SettingsApi) return;  
          
        // Отримуємо реальні рядки  
        const lampaRows = getRealLampaRows();  
          
        // Додаємо компонент налаштувань  
        Lampa.SettingsApi.addComponent({  
            component: 'mainpage_order',  
            name: 'Порядок головної',  
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>'  
        });  
  
        // Створюємо значення для порядку  
        let orderValues = {};  
        for (let i = 1; i <= lampaRows.length; i++) {  
            orderValues[i.toString()] = `Позиція ${i}`;  
        }  
  
        // Додаємо налаштування для кожного реального рядка  
        lampaRows.forEach(row => {  
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
                    // Отримуємо порядок з налаштувань і сортуємо  
                    const orderedResults = data.results.map((item, index) => {  
                        const rowId = item.title ? item.title.replace(/\s+/g, '_').toLowerCase() : 'row_' + index;  
                        const order = parseInt(Lampa.Storage.get(rowId + '_order')) || (index + 1);  
                        return { ...item, order, rowId };  
                    });  
                      
                    orderedResults.sort((a, b) => a.order - b.order);  
                      
                    // Повертаємо відсортовані дані  
                    return originalCallback({ ...data, results: orderedResults });  
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
Альтернативний підхід
Якщо динамічне отримання не працює, ви можете вручну визначити стандартні рядки Lampa:

const LAMPA_ROWS = [  
    { id: 'trending', title: 'Тренди', defOrder: 1 },  
    { id: 'popular', title: 'Популярні', defOrder: 2 },  
    { id: 'new_movies', title: 'Новинки фільмів', defOrder: 3 },  
    { id: 'new_series', title: 'Новинки серіалів', defOrder: 4 },  
    { id: 'top_rated', title: 'Найвищий рейтинг', defOrder: 5 },  
    { id: 'upcoming', title: 'Очікувані', defOrder: 6 },  
    { id: 'airing_today', title: 'Сьогодні в ефірі', defOrder: 7 }  
];
