(function () {  
    'use strict';  
      
    if (typeof Lampa === 'undefined') return;  
  
    function overrideApi() {  
        Lampa.Api.sources.tmdb.main = function (params, oncomplite, onerror) {  
            let parts_data = [];  
              
            // Новинки фільмів  
            parts_data.push((cb) => {  
                cb({  
                    results: [{  
                        name: 'Новинки фільмів',  
                        title: 'Новинки фільмів'  
                    }],  
                    title: ''  
                });  
            });  
  
            // Новинки серіалів  
            parts_data.push((cb) => {  
                cb({  
                    results: [{  
                        name: 'Новинки серіалів',  
                        title: 'Новинки серіалів'  
                    }],  
                    title: ''  
                });  
            });  
  
            // Випадкова добірка  
            parts_data.push((cb) => {  
                cb({  
                    results: [{  
                        name: 'Випадкова добірка',  
                        title: 'Випадкова добірка'  
                    }],  
                    title: ''  
                });  
            });  
              
            // Обробка всіх частин  
            let allResults = [];  
            let processed = 0;  
              
            parts_data.forEach((loader, index) => {  
                loader((data) => {  
                    allResults[index] = data;  
                    processed++;  
                      
                    if (processed === parts_data.length) {  
                        oncomplite({  
                            results: allResults.filter(item => item && item.results),  
                            page: params.page || 1  
                        });  
                    }  
                });  
            });  
        };  
    }  
  
    function start() {  
        overrideApi();  
    }  
  
    if (window.appready) start();  
    else Lampa.Listener.follow('app', function (e) {   
        if (e.type === 'ready') start();   
    });  
  
})();
