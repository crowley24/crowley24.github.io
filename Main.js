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
                      
                    // Переконуємось що є обов'язкові поля  
                    return {   
                        ...item,   
                        order,   
                        rowId,  
                        name: item.name || item.title || 'Row ' + index,  
                        title: item.title || item.name || 'Row ' + index  
                    };  
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
