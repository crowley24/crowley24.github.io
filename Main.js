(function () {  
    'use strict';  
      
    if (typeof Lampa === 'undefined') return;  
  
    // Конфігурація рядків  
    const ROWS_CONFIG = [  
        {   
            id: 'movies_new',   
            title: 'Новинки фільмів',   
            type: 'movies',  
            url: 'https://uaserials.com/films/p/',  
            defOrder: 1   
        },  
        {   
            id: 'series_new',   
            title: 'Новинки серіалів',   
            type: 'series',  
            url: 'https://uaserials.com/series/p/',  
            defOrder: 2   
        },  
        {   
            id: 'random_collection',   
            title: 'Випадкова добірка',   
            type: 'random',  
            url: '',  
            defOrder: 3   
        }  
    ];  
  
    // Проксі для CORS  
    const PROXIES = [  
        'https://cors.lampa.stream/',  
        'https://cors.eu.org/',  
        'https://corsproxy.io/?url='  
    ];  
  
    async function fetchHtml(url) {  
        for (let proxy of PROXIES) {  
            try {  
                let proxyUrl = proxy.includes('?url=') ? proxy + encodeURIComponent(url) : proxy + url;  
                let res = await fetch(proxyUrl);  
                if (res.ok) {  
                    let text = await res.text();  
                    if (text && text.length > 500 && text.includes('<html') && !text.includes('just a moment...')) {  
                        return text;  
                    }  
                }  
            } catch (e) {}  
        }  
        return '';  
    }  
  
    async function fetchCatalogPage(url, limit = 15) {  
        let html = await fetchHtml(url);  
        if (!html) return [];  
          
        let items = [];  
        let doc = new DOMParser().parseFromString(html, "text/html");  
          
        doc.querySelectorAll('.movie-item, .film-item, .item').forEach(item => {  
            let title = item.querySelector('.title, .name')?.textContent?.trim();  
            let link = item.querySelector('a')?.href;  
            let image = item.querySelector('img')?.src;  
              
            if (title && link) {  
                items.push({  
                    title: title,  
                    url: link.startsWith('http') ? link : 'https://uaserials.com' + link,  
                    image: image,  
                    source: 'catalog'  
                });  
            }  
        });  
          
        return items.slice(0, limit);  
    }  
  
    function makeCatalogCardItem(item) {  
        return {  
            title: item.title,  
            url: item.url,  
            image: item.image,  
            source: 'catalog',  
            card_type: 'basic'  
        };  
    }  
  
    async function loadRandomCollectionRow(callback) {  
        try {  
            let listHtml = await fetchHtml('https://uaserials.com/collections/');  
            let doc = new DOMParser().parseFromString(listHtml, "text/html");  
            let collLinks = [];  
              
            doc.querySelectorAll('a[href]').forEach(a => {  
                let href = a.getAttribute('href');  
                if (href && href.match(/\/collections\/\d+/)) {  
                    let fUrl = href.startsWith('http') ? href : 'https://uaserials.com' + href;  
                    if (!collLinks.includes(fUrl)) collLinks.push(fUrl);  
                }  
            });  
              
            if (collLinks.length === 0) throw new Error("No collections");  
  
            let randomUrl = collLinks[Math.floor(Math.random() * collLinks.length)];  
            let items = await fetchCatalogPage(randomUrl, 15);  
              
            callback({   
                results: items.map(makeCatalogCardItem),   
                title: '',   
                params: { items: { mapping: 'line', view: 15 } }   
            });  
        } catch(e) {   
            callback({ results: [] });   
        }  
    }  
  
    async function loadCatalogRow(urlId, loadUrl, title, callback) {  
        try {  
            let items = await fetchCatalogPage(loadUrl, 15);  
            let mapped = items.map(makeCatalogCardItem);  
            callback({   
                results: mapped,   
                title: '',   
                params: { items: { mapping: 'line', view: 15 } }   
            });  
        } catch(e) {   
            callback({ results: [] });   
        }  
    }  
  
    // Правильне перевизначення API  
    function overrideMainPage() {  
        Lampa.Api.sources.tmdb.main = function (params, oncomplite, onerror) {  
            let parts_data = [];  
              
            // Додаємо заголовки рядків  
            ROWS_CONFIG.forEach(row => {  
                parts_data.push((cb) => {  
                    cb({  
                        results: [{  
                            name: row.title,  // Обов'язкове поле  
                            title: row.title, // Обов'язкове поле  
                            url: row.url,  
                            type: row.type  
                        }],  
                        title: '',   
                        params: { items: { mapping: 'line', view: 1 } }   
                    });  
                });  
  
                // Додаємо контент для рядків  
                parts_data.push((cb) => {  
                    if (row.type === 'random') {  
                        loadRandomCollectionRow(cb);  
                    } else {  
                        loadCatalogRow(row.url, row.url, row.title, cb);  
                    }  
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
                            results: allResults.flat().filter(item => item && item.results),  
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
