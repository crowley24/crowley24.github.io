(function () {  
    'use strict';  
      
    if (typeof Lampa === 'undefined') return;  
  
    function overrideMainPage() {  
        Lampa.Api.sources.tmdb.main = function (params, oncomplite, onerror) {  
            // Створюємо масив завдань для паралельного завантаження  
            let parts_data = [];  
              
            // Додаємо завдання для кожного рядка  
            parts_data.push((cb) => {  
                cb({  
                    results: [{  
                        name: 'Новинки фільмів',  // Обов'язкове поле  
                        title: 'Новинки фільмів', // Обов'язкове поле  
                        url: 'https://uaserials.com/films/p/'  
                    }],  
                    title: ''  
                });  
            });  
  
            parts_data.push((cb) => {  
                cb({  
                    results: [{  
                        name: 'Новинки серіалів',  // Обов'язкове поле  
                        title: 'Новинки серіалів', // Обов'язкове поле  
                        url: 'https://uaserials.com/series/p/'  
                    }],  
                    title: ''  
                });  
            });  
  
            parts_data.push((cb) => {  
                cb({  
                    results: [{  
                        name: 'Випадкова добірка',  // Обов'язкове поле  
                        title: 'Випадкова добірка', // Обов'язкове поле  
                        url: 'https://uaserials.com/collections/'  
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
        overrideMainPage();  
    }  
  
    if (window.appready) start();  
    else Lampa.Listener.follow('app', function (e) {   
        if (e.type === 'ready') start();   
    });  
  
})();
