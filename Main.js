(function () {  
    'use strict';  
      
    if (typeof Lampa === 'undefined') return;  
  
    // Змінна для зберігання реальних рядків  
    let realLampaRows = [];  
  
    function getRealRowsFromMainPage() {  
        return new Promise((resolve) => {  
            const originalMain = Lampa.Api.sources.tmdb.main;  
              
            Lampa.Api.sources.tmdb.main = function (params, oncomplite, onerror) {  
                const originalCallback = oncomplite;  
                  
                oncomplite = function(data) {  
                    if (data && data.results) {  
                        // Збираємо реальні рядки з даних  
                        const rows = data.results.map((item, index) => ({  
                            id: item.title ? item.title.replace(/\s+/g, '_').toLowerCase() : 'row_' + index,  
                            title: item.title || 'Рядок ' + (index + 1),  
                            defOrder: index + 1  
                        }));  
                          
                        resolve(rows);  
                    }  
                      
                    // Повертаємо оригінальний callback  
                    return originalCallback(data);  
                };  
                  
                return originalMain.call(this, params, oncomplite, onerror);  
            };  
              
            // Запускаємо запит для отримання даних  
            originalMain.call(this, { page: 1 }, () => {}, () => {});  
        });  
    }  
  
    async function createSettings() {  
        if (!window.Lampa || !Lampa.SettingsApi) return;  
          
        // Отримуємо реальні рядки  
        if (realLampaRows.length === 0) {  
            realLampaRows = await getRealRowsFromMainPage();  
        }  
          
        Lampa.SettingsApi.addComponent({  
            component: 'mainpage_order',  
            name: 'Порядок головної',  
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>'  
        });  
  
        let orderValues = {};  
        for (let i = 1; i <= realLampaRows.length; i++) {  
            orderValues[i.toString()] = `Позиція ${i}`;  
        }  
  
        realLampaRows.forEach(row => {  
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
                    const processedResults = data.results.map((item, index) => {  
                        const rowId = item.title ? item.title.replace(/\s+/g, '_').toLowerCase() : 'row_' + index;  
                        const order = parseInt(Lampa.Storage.get(rowId + '_order')) || (index + 1);  
                          
                        return {   
                            ...item,   
                            order: order,  
                            rowId: rowId,  
                            name: item.name || item.title || 'Row ' + index,  
                            title: item.title || item.name || 'Row ' + index  
                        };  
                    });  
                      
                    processedResults.sort((a, b) => a.order - b.order);  
                      
                    return originalCallback({ ...data, results: processedResults });  
                }  
                return originalCallback(data);  
            };  
              
            return originalMain.call(this, params, oncomplite, onerror);  
        };  
    }  
  
    async function start() {  
        await createSettings();  
        overrideMainPage();  
    }  
  
    if (window.appready) start();  
    else Lampa.Listener.follow('app', function (e) {   
        if (e.type === 'ready') start();   
    });  
  
})();
