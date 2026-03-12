(function () {  
    'use strict';  
  
    if (typeof Lampa === 'undefined') return;  
  
    var CONFIG = {   
        language: 'uk',  
        endpoint: 'https://wh.lme.isroot.in/',  
        timeout: 10000  
    };  
  
    const PROXIES =[  
        'https://cors.lampa.stream/',  
        'https://cors.eu.org/',  
        'https://corsproxy.io/?url='  
    ];  
  
    const DEFAULT_ROWS_SETTINGS =[  
        { id: 'ym_row_history', title: 'Історія перегляду', defOrder: '1', default: true },  
        { id: 'ym_row_movies_new', title: 'Новинки фільмів', defOrder: '2', default: true },  
        { id: 'ym_row_series_new', title: 'Новинки серіалів', defOrder: '3', default: true },  
        { id: 'ym_row_collections', title: 'Підбірки KinoBaza', defOrder: '4', default: true },  
        { id: 'ym_row_kinobaza', title: 'Новинки Стрімінгів UA', defOrder: '5', default: true },  
        { id: 'ym_row_community', title: 'Знахідки спільноти LME', defOrder: '6', default: true },  
        { id: 'ym_row_movies_watch', title: 'Популярні фільми', defOrder: '7', default: true },  
        { id: 'ym_row_series_pop', title: 'Популярні серіали', defOrder: '8', default: true },  
        { id: 'ym_row_random', title: 'Випадкова підбірка', defOrder: '9', default: true }  
    ];  
  
    var inflight = {};  
    var listCache = {};        
    var tmdbItemCache = {};    
    var itemUrlCache = {};     
  
    Lampa.Lang.add({  
        main: 'Головна UA',  
        title_main: 'Головна UA',  
        title_tmdb: 'Головна UA'  
    });  
  
    function createSettings() {  
        if (!window.Lampa || !Lampa.SettingsApi) return;  
        Lampa.SettingsApi.addComponent({  
            component: 'ymainpage',  
            name: 'YMainPage',  
            icon: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'ymainpage',  
            param: { name: 'uas_show_flag', type: 'trigger', default: true },  
            field: { name: 'Відображення УК озвучок', description: 'Пошук та відображення прапорця на картах' }  
        });  
  
        let orderValues = { '1': 'Позиція 1', '2': 'Позиція 2', '3': 'Позиція 3', '4': 'Позиція 4', '5': 'Позиція 5', '6': 'Позиція 6', '7': 'Позиція 7', '8': 'Позиція 8', '9': 'Позиція 9' };  
  
        DEFAULT_ROWS_SETTINGS.forEach(r => {  
            Lampa.SettingsApi.addParam({  
                component: 'ymainpage',  
                param: { name: r.id, type: 'trigger', default: r.default },  
                field: { name: 'Вимкнути / Увімкнути: ' + r.title, description: 'Показувати цей рядок на головній' }  
            });  
            Lampa.SettingsApi.addParam({  
                component: 'ymainpage',  
                param: { name: r.id + '_order', type: 'select', values: orderValues, default: r.defOrder },  
                field: { name: 'Порядок: ' + r.title, description: 'Яким по рахунку виводити цей рядок' }  
            });  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'ymainpage',  
            param: { name: 'uas_pro_tmdb_btn', type: 'button' },  
            field: { name: 'Власний TMDB API ключ', description: 'Натисніть, щоб ввести ключ (працює першочергово)' }  
        });  
  
        Lampa.Settings.listener.follow('open', function (e) {  
            if (e.name === 'ymainpage') {  
                e.body.find('[data-name="uas_pro_tmdb_btn"]').on('hover:enter', function () {  
                    var currentKey = Lampa.Storage.get('uas_pro_tmdb_apikey') || '';  
                    Lampa.Input.edit({  
                        title: 'Введіть TMDB API Ключ', value: currentKey, free: true, nosave: true  
                    }, function (new_val) {  
                        if (new_val !== undefined) {  
                            Lampa.Storage.set('uas_pro_tmdb_apikey', new_val.trim());  
                            Lampa.Noty.show('TMDB ключ збережено. Перезапустіть застосунок.');  
                        }  
                    });  
                });  
            }  
        });  
    }  
  
    function getTmdbKey() {  
        let custom = (Lampa.Storage.get('uas_pro_tmdb_apikey') || '').trim();  
        return custom || (Lampa.TMDB && Lampa.TMDB.key ? Lampa.TMDB.key() : '4ef0d7355d9ffb5151e987764708ce96');  
    }  
  
    function getTmdbEndpoint(path) {  
        let url = Lampa.TMDB.api(path);  
        if (!url.includes('api_key')) url += (url.includes('?') ? '&' : '?') + 'api_key=' + getTmdbKey();  
        if (!url.startsWith('http')) url = 'https://api.themoviedb.org/3/' + url;  
        return url;  
    }  
  
    function safeFetch(url) {  
        return new Promise(function (resolve, reject) {  
            var xhr = new XMLHttpRequest(); xhr.open('GET', url, true);  
            xhr.onreadystatechange = function () {  
                if (xhr.readyState === 4) {  
                    if (xhr.status >= 200 && xhr.status < 300) resolve({ ok: true, json: function() { return Promise.resolve(JSON.parse(xhr.responseText)); } });  
                    else reject(new Error('HTTP ' + xhr.status));  
                }  
            };  
            xhr.onerror = function () { reject(new Error('Network error')); }; xhr.send(null);  
        });  
    }  
  
    async function fetchTmdbWithFallback(type, id) {  
        let endpoint = getTmdbEndpoint(`${type}/${id}?language=uk`);  
        let res = await fetch(PROXIES[0] + endpoint).then(r=>r.json()).catch(()=>null);  
        if (res && (!res.overview || res.overview.trim() === '')) {  
            let enEndpoint = getTmdbEndpoint(`${type}/${id}?language=en`);  
            let enRes = await fetch(PROXIES[0] + enEndpoint).then(r=>r.json()).catch(()=>null);  
            if (enRes && enRes.overview) res.overview = enRes.overview;  
        }  
        return res;  
    }  
  
    function createMediaMeta(data) {  
        var tmdbId = parseInt(data && data.id, 10);  
        if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null;  
        var mediaKind = String(data.media_type || '').toLowerCase();  
        if (mediaKind !== 'tv' && mediaKind !== 'movie') {  
            if (data.original_name || data.first_air_date || data.number_of_seasons) mediaKind = 'tv';  
            else if (data.title || data.original_title || data.release_date) mediaKind = 'movie';  
            else return null;  
        }  
        return { tmdbId: tmdbId, mediaKind: mediaKind, serial: mediaKind === 'tv' ? 1 : 0, cacheKey: mediaKind + ':' + tmdbId };  
    }  
  
    function isSuccessResponse(response) {  
        if (response === true) return true;  
        if (response && typeof response === 'object' && !Array.isArray(response)) {  
            if (response.error || response.status === 'error' || response.success === false || response.ok === false) return false;  
            if (response.success === true || response.status === 'success' || response.ok === true) return true;  
            return Object.keys(response).length > 0;  
        }  
        return false;  
    }  
  
    function loadFlag(meta) {  
        if (!inflight[meta.cacheKey]) {  
            inflight[meta.cacheKey] = new Promise(function (resolve) {  
                var url = CONFIG.endpoint + '?tmdb_id=' + encodeURIComponent(meta.tmdbId) + '&serial=' + meta.serial + '&silent=true';  
                new Promise(function (res) { Lampa.Network.silent(url, function (r) { res(isSuccessResponse(r)); }, function () { res(false); }, null, { timeout: CONFIG.timeout }); })  
                .then(function (isSuccess) { resolve(isSuccess); })  
                .finally(function () { delete inflight[meta.cacheKey]; });  
            });  
        }  
        return inflight[meta.cacheKey];  
    }  
  
    function renderFlag(cardHtml) {  
        var view = cardHtml.querySelector('.card__view');  
        if (!view || view.querySelector('.card__ua_flag')) return;  
        var badge = document.createElement('div');  
        badge.className = 'card__ua_flag';  
        view.appendChild(badge);  
    }  
  
    function extractItemLinks(html) {  
        let doc = new DOMParser().parseFromString(html, "text/html");  
        let links =[];  
        doc.querySelectorAll('a[href]').forEach(a => {  
            let href = a.getAttribute('href');  
            if (href && href.match(/\/\d+-[^/]+\.html$/) && !href.includes('#')) {  
                let fullUrl = href.startsWith('http') ? href : 'https://uaserials.com' + href;  
                if (!links.includes(fullUrl)) links.push(fullUrl);  
            }  
        });  
        return links;  
    }  
  
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
  
    async function getImdbId(url) {  
        if (itemUrlCache[url]) return itemUrlCache[url];  
        let html = await fetchHtml(url);  
        let match = html.match(/imdb\.com\/title\/(tt\d+)/i);  
        let id = match ? match[1] : null;  
        if (id) itemUrlCache[url] = id;  
        return id;  
    }  
  
    async function processInQueue(items, processFn, concurrency = 5) {  
        let results =[];  
        let index = 0;  
        async function worker() {  
            while (index < items.length) {  
                let currentIndex = index++;  
                try {  
                    let res = await processFn(items[currentIndex]);  
                    if (res) results.push(res);  
                } catch (e) {}  
            }  
        }  
        let workers =[];  
        for (let i = 0; i < concurrency; i++) workers.push(worker());  
        await Promise.all(workers);  
        return results;  
    }  
  
    async function processSingleItem(url) {  
        let imdb = await getImdbId(url);  
        if (!imdb) return null;  
        if (tmdbItemCache[imdb]) return tmdbItemCache[imdb];  
  
        let endpoint = getTmdbEndpoint(`find/${imdb}?external_source=imdb_id&language=uk`);  
        try {  
            let data = await fetch(PROXIES[0] + endpoint).then(r => r.json());  
            let res = null;  
            if (data.movie_results && data.movie_results.length > 0) { res = data.movie_results[0]; res.media_type = 'movie'; }  
            else if (data.tv_results && data.tv_results.length > 0) { res = data.tv_results[0]; res.media_type = 'tv'; }  
              
            if (res && (!res.overview || res.overview.trim() === '')) {  
                let enEndpoint = getTmdbEndpoint(`find/${imdb}?external_source=imdb_id&language=en`);  
                let enData = await fetch(PROXIES[0] + enEndpoint).then(r => r.json());  
                let enRes = (enData.movie_results && enData.movie_results.length > 0) ? enData.movie_results[0] : (enData.tv_results && enData.tv_results.length > 0) ? enData.tv_results[0] : null;  
                if (enRes && enRes.overview) res.overview = enRes.overview;  
            }  
  
            if (res) tmdbItemCache[imdb] = res;  
            return res;  
        } catch(e) { return null; }  
    }  
  
    async function fetchCatalogPage(url, limit = 15) {  
        if (listCache[url]) return listCache[url];  
        let listHtml = await fetchHtml(url);  
        let links = extractItemLinks(listHtml).slice(0, limit);   
        let tmdbItems = await processInQueue(links, processSingleItem, 5);  
          
        let unique = {};  
        let finalItems = tmdbItems.filter(item => {  
            if (!item || !item.id || !item.backdrop_path) return false;  
            if (unique[item.id]) return false;  
            unique[item.id] = true;  
            return true;  
        });  
  
        if (finalItems.length > 0) listCache[url] = finalItems;  
        return finalItems;  
    }  
  
    async function getLmeTmdbItems(items) {  
        let promises = items.map(async (item) => {  
            if(!item || !item.id) return null;  
            let parts = item.id.split(':');  
            if (parts.length !== 2) return null;  
            let type = parts[0], id = parts[1];  
            let tmdbData = await fetchTmdbWithFallback(type, id);  
            if (tmdbData && !tmdbData.error && tmdbData.backdrop_path) {  
                tmdbData.media_type = type;  
                return tmdbData;  
            }  
            return null;  
        });  
        let results = await Promise.all(promises);  
        return results.filter(Boolean);  
    }  
  
    // Стандартна вертикальна картка  
    function makeCardItem(movie) {  
        return {  
            title: movie.title || movie.name,  
            params: {  
                createInstance: function () {  
                    return Lampa.Maker.make('Card', movie, function (module) { return module.only('Card', 'Callback'); });  
                },  
                emit: {  
                    onlyEnter: function () {  
                        var mType = movie.media_type || (movie.name ? 'tv' : 'movie');  
                        Lampa.Activity.push({ url: '', component: 'full', id: movie.id, method: mType, card: movie, source: movie.source || 'tmdb' });  
                    }  
                }  
            }  
        };  
    }  
  
    async function loadRow(urlId, loadUrl, title, callback) {  
        try {  
            let items = await fetchCatalogPage(loadUrl, 15);  
            let mapped = items.map(makeCardItem);  
            callback({   
                results: mapped,   
                title: title,   
                source: 'uas_pro_source',   
                uas_content_row: true,   
                params: { items: { mapping: 'line', view: 15 } }   
            });  
        } catch(e) { callback({ results:[] }); }  
    }  
  
    async function loadCommunityGemsRow(callback) {  
        try {  
            let listUrl = 'https://wh.lme.isroot.in/v2/top?period=7d&top=asc&min_rating=7&per_page=15&page=1';  
            let res = await safeFetch(listUrl).then(r=>r.json()).catch(()=>({items:[]}));  
            let items = Array.isArray(res) ? res : (res.items ||[]);  
  
            let tmdbItems = await getLmeTmdbItems(items);  
            let mappedResults = tmdbItems.map(makeCardItem);  
  
            callback({   
                results: mappedResults,   
                title: 'Знахідки спільноти LME',   
                source: 'uas_pro_source',   
                uas_content_row: true,  
                params: { items: { mapping: 'line', view: 15 } }   
            });  
        } catch(e) { callback({ results:[] }); }  
    }  
  
    Lampa.Api.sources.uas_pro_source = {  
        list: async function (params, oncomplete, onerror) {  
            let page = params.page || 1;  
            let baseUrl = '';  
            let isLME = false;  
  
            if (params.url === 'uas_movies_new') baseUrl = 'https://uaserials.com/films/p/';  
            else if (params.url === 'uas_movies_pop') baseUrl = 'https://uaserials.my/filmss/w/';  
            else if (params.url === 'uas_series_new') baseUrl = 'https://uaserials.com/series/p/';  
            else if (params.url === 'uas_series_pop') baseUrl = 'https://uaserials.com/series/w/';  
            else if (params.url === 'uas_community') isLME = true;  
            else return onerror();  
  
            try {  
                let mapped =[];  
                let totalPages = 50;   
  
                if (isLME) {  
                    let listUrl = `https://wh.lme.isroot.in/v2/top?period=7d&top=asc&min_rating=7&per_page=20&page=${page}`;  
                    let res = await safeFetch(listUrl).then(r=>r.json());  
                    let items = Array.isArray(res) ? res : (res.items ||[]);  
                    totalPages = res.total_pages || 10;  
                      
                    mapped = await getLmeTmdbItems(items);   
                } else {  
                    let uasPage = page + 1;   
                    let listUrl = `${baseUrl}page/${uasPage}/`;  
                      
                    let items = await fetchCatalogPage(listUrl, 20);   
                    mapped = items;   
                }  
  
                if (mapped.length > 0) {  
                    oncomplete({  
                        results: mapped,  
                        page: page,  
                        total_pages: totalPages  
                    });  
                } else { onerror(); }  
            } catch (e) { onerror(); }  
        }  
    };  
  
    function overrideApi() {  
        Lampa.Api.sources.tmdb.main = function (params, oncomplite, onerror) {  
            var rowDefs =[  
                { id: 'ym_row_history', defOrder: 1, type: 'history', url: '', title: 'Історія перегляду' },  
                { id: 'ym_row_movies_new', defOrder: 2, type: 'uas', url: 'uas_movies_new', loadUrl: 'https://uaserials.com/films/p/', title: 'Новинки фільмів' },  
                { id: 'ym_row_series_new', defOrder: 3, type: 'uas', url: 'uas_series_new', loadUrl: 'https://uaserials.com/series/p/', title: 'Новинки серіалів' },  
                { id: 'ym_row_collections', defOrder: 4, type: 'kinobaza_collections', url: 'kinobaza_collections_list', loadUrl: 'https://kinobaza.com.ua/lists?order_by=popular&page=', title: 'Підбірки KinoBaza' },  
                { id: 'ym_row_kinobaza', defOrder: 5, type: 'kinobaza', url: 'kinobaza_streaming', loadUrl: 'https://kinobaza.com.ua/online?order_by=date_desc&rating=1&rating_max=10&imdb_rating=1&imdb_rating_max=10&itunes_audio=1&rakuten_audio=1&netflix_audio=1&playmarket_audio=1&takflix_audio=1&sweet_audio=1&primevideo_audio=1&per_page=30&translated=has_ukr_audio&page=', title: 'Новинки Стрімінгів UA' },  
                { id: 'ym_row_community', defOrder: 6, type: 'community', url: 'uas_community', title: 'Знахідки спільноти LME' },  
                { id: 'ym_row_movies_watch', defOrder: 7, type: 'uas', url: 'uas_movies_pop', loadUrl: 'https://uaserials.my/filmss/w/', title: 'Популярні фільми' },  
                { id: 'ym_row_series_pop', defOrder: 8, type: 'uas', url: 'uas_series_pop', loadUrl: 'https://uaserials.com/series/w/', title: 'Популярні серіали' },  
                { id: 'ym_row_random', defOrder: 9, type: 'random', url: '', title: 'Випадкова підбірка' }  
            ];  
  
            let activeRows =[];  
            for (let def of rowDefs) {  
                let defSetting = DEFAULT_ROWS_SETTINGS.find(r => r.id === def.id);  
                let defaultEnabled = defSetting ? defSetting.default : true;  
                  
                let enabled = Lampa.Storage.get(def.id);  
                if (enabled === null || enabled === undefined) enabled = defaultEnabled;  
                  
                let order = parseInt(Lampa.Storage.get(def.id + '_order')) || def.defOrder;  
                if (enabled) activeRows.push({ ...def, order: order });  
            }  
            activeRows.sort((a, b) => a.order - b.order);  
              
            let parts_data =[];  
              
            activeRows.forEach(def => {  
                parts_data.push((cb) => {  
                    if (def.type === 'history') loadHistoryRow(cb);  
                    else if (def.type === 'uas') loadRow(def.url, def.loadUrl, def.title, cb);  
                    else if (def.type === 'kinobaza') loadKinobazaRow(def.url, def.loadUrl, def.title, cb);  
                    else if (def.type === 'kinobaza_collections') loadKinobazaCollectionsRow(def.url, def.loadUrl, def.title, cb);  
                    else if (def.type === 'community') loadCommunityGemsRow(cb);  
                    else if (def.type === 'random') loadRandomCollectionRow(cb);  
                });  
            });  
  
            if(parts_data.length === 0) {  
                parts_data.push((cb) => loadRow('uas_movies_new', 'https://uaserials.com/films/p/', 'Новинки фільмів', cb));  
            }  
  
            Lampa.Api.partNext(parts_data, 2, oncomplite, onerror);  
        };  
    }  
  
    function loadHistoryRow(callback) {  
        let hist =[];  
        try {  
            if (window.Lampa && Lampa.Favorite && typeof Lampa.Favorite.all === 'function') {  
                let allFavs = Lampa.Favorite.all();  
                if (allFavs && allFavs.history) {  
                    hist = allFavs.history;  
                }  
            }  
        } catch(e) {}  
          
        if (hist && hist.length > 0) {  
            let unique = {};  
            let validItems = hist.filter(h => {  
                if (h && h.id && (h.title || h.name) && !unique[h.id]) {  
                    unique[h.id] = true;  
                    return true;  
                }  
                return false;  
            }).slice(0, 20);  
  
            if (validItems.length > 0) {  
                callback({   
                    results: validItems.map(makeCardItem),   
                    title: 'Історія перегляду',   
                    uas_content_row: true,   
                    params: { items: { mapping: 'line', view: 15 } }   
                });  
                return;  
            }  
        }  
        callback({ results:[] });  
    }  
  
    async function loadKinobazaRow(urlId, loadUrl, title, callback) {  
        try {  
            let fetchUrl = loadUrl + '1';  
            let html = await fetchHtml(fetchUrl);  
            let items = extractKinobazaItems(html);  
              
            let tmdbItems = await processInQueue(items, async (item) => {  
                return await searchTmdbByTitleAndYear(item.title, item.year);  
            }, 5);  
  
            let unique = {};  
            let finalItems = tmdbItems.filter(item => {  
                if (!item || !item.id || !item.backdrop_path) return false;  
                if (unique[item.id]) return false;  
                unique[item.id] = true;  
                return true;  
            });  
  
            let mapped = finalItems.slice(0, 15).map(makeCardItem);  
            callback({   
                results: mapped,   
                title: title,   
                source: 'uas_pro_source',   
                uas_content_row: true,   
                params: { items: { mapping: 'line', view: 15 } }   
            });  
        } catch(e) { callback({ results:[] }); }  
    }  
  
    async function loadKinobazaCollectionsRow(urlId, loadUrl, title, callback) {  
        try {  
            let randPage = Math.floor(Math.random() * 30) + 1;  
            let fetchUrl = loadUrl + randPage;  
              
            let html = await fetchHtml(fetchUrl);  
            let items = extractKinobazaCollections(html);  
              
            let mapped = items.slice(0, 15).map(collection => ({  
                title: collection.title,  
                params: {  
                    createInstance: function () {  
                        return Lampa.Maker.make('Card', { title: collection.title }, function (module) { return module.only('Card', 'Callback'); });  
                    },  
                    emit: {  
                        onlyEnter: function () {  
                            Lampa.Activity.push({  
                                url: collection.url,  
                                title: collection.title,  
                                component: 'category_full',  
                                page: 1,  
                                source: 'uas_pro_source',  
                                is_kinobaza_list: true  
                            });  
                        }  
                    }  
                }  
            }));  
              
            callback({   
                results: mapped,   
                title: title,   
                source: 'uas_pro_source',   
                uas_content_row: true,   
                params: { items: { mapping: 'line', view: 15 } }   
            });  
        } catch(e) { callback({ results:[] }); }  
    }  
  
    async function loadRandomCollectionRow(callback) {  
        try {  
            let listHtml = await fetchHtml('https://uaserials.com/collections/');  
            let doc = new DOMParser().parseFromString(listHtml, "text/html");  
            let collLinks =[];  
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
                results: items.map(makeCardItem),   
                title: 'Випадкова підбірка',   
                uas_content_row: true,  
                params: { items: { mapping: 'line', view: 15 } }   
            });  
        } catch(e) { callback({ results:[] }); }  
    }  
  
    function extractKinobazaItems(html) {  
        let doc = new DOMParser().parseFromString(html, "text/html");  
        let results =[];  
        let seen = {};  
  
        doc.querySelectorAll('h4.text-muted.h6.d-inline-block').forEach(h4 => {  
            let enTitle = h4.textContent.trim();  
            let parent = h4.parentElement;  
            let small = null;  
            for (let i = 0; i < 5; i++) {  
                if (!parent || parent.tagName === 'BODY') break;  
                small = parent.querySelector('small.text-muted');  
                if (small && small.textContent.match(/\(\d{4}\)/)) break;  
                small = null;  
                parent = parent.parentElement;  
            }  
            let yearMatch = small ? small.textContent.match(/\((\d{4})\)/) : null;  
            let year = yearMatch ? yearMatch[1] : null;  
              
            let key = enTitle + year;  
            if (enTitle && year && !seen[key]) {  
                seen[key] = true;  
                results.push({ title: enTitle, year: year });  
            }  
        });  
  
        if (results.length === 0) {  
            doc.querySelectorAll('a[href^="/titles/"]').forEach(a => {  
                let title = a.textContent.trim();  
                if (title.length > 1) {  
                    let year = null;  
                    let parent = a.parentElement;  
                    for (let i = 0; i < 4; i++) {  
                        if (!parent || parent.tagName === 'BODY') break;  
                        let text = parent.textContent;  
                        let yearMatch = text.match(/(?:^|\s|\()((?:19|20)\d{2})(?:\)|\s|$)/);  
                        if (yearMatch) {  
                            year = yearMatch[1];  
                            break;  
                        }  
                        parent = parent.parentElement;  
                    }  
                      
                    if (!year) {  
                        let hrefMatch = a.getAttribute('href').match(/(?:19|20)\d{2}/);  
                        if (hrefMatch) year = hrefMatch[0];  
                    }  
  
                    if (year) {  
                        let key = title + year;  
                        if (!seen[key]) {  
                            seen[key] = true;  
                            results.push({ title: title, year: year });  
                        }  
                    }  
                }  
            });  
        }  
  
        return results;  
    }  
  
    function extractKinobazaCollections(html) {  
        let doc = new DOMParser().parseFromString(html, "text/html");  
        let results =[];  
        let seen = {};  
          
        doc.querySelectorAll('a[href^="/lists/"]').forEach(a => {  
            let href = a.getAttribute('href');  
            if (href.match(/^\/lists\/[a-zA-Z0-9_-]+$/) && !href.includes('edit')) {  
                let fullUrl = 'https://kinobaza.com.ua' + href;  
                let title = a.textContent.trim();  
                if (title.length > 2 && !seen[fullUrl]) {  
                    seen[fullUrl] = true;  
                    results.push({  
                        title: title,  
                        url: fullUrl  
                    });  
                }  
            }  
        });  
        return results;  
    }  
  
    async function searchTmdbByTitleAndYear(title, year) {  
        let cacheKey = 'kinobaza_search_' + title + '_' + year;  
        if (tmdbItemCache[cacheKey]) return tmdbItemCache[cacheKey];  
  
        let endpoint = getTmdbEndpoint(`search/multi?query=${encodeURIComponent(title)}&language=uk`);  
        try {  
            let data = await fetch(PROXIES[0] + endpoint).then(r => r.json());  
            if (data && data.results && data.results.length > 0) {  
                let res = data.results.find(r => {  
                    let rYear = (r.release_date || r.first_air_date || '').substring(0, 4);  
                    return rYear === year || rYear === (parseInt(year)-1).toString() || rYear === (parseInt(year)+1).toString();  
                }) || data.results[0];   
  
                if (res && (!res.overview || res.overview.trim() === '')) {  
                    let enEndpoint = getTmdbEndpoint(`search/multi?query=${encodeURIComponent(title)}&language=en`);  
                    let enData = await fetch(PROXIES[0] + enEndpoint).then(r => r.json());  
                    let enRes = (enData.results ||[]).find(r => r.id === res.id);  
                    if (enRes && enRes.overview) res.overview = enRes.overview;  
                }  
                if (res) {  
                    if (!res.media_type) res.media_type = res.first_air_date ? 'tv' : 'movie';  
                    tmdbItemCache[cacheKey] = res;  
                }  
                return res;  
            }  
        } catch(e) {}  
        return null;  
    }  
  
    function start() {  
        if (window.uaserials_pro_v8_loaded) return;  
        window.uaserials_pro_v8_loaded = true;  
  
        createSettings();  
  
        var style = document.createElement('style');  
        style.innerHTML = `  
            .card .card__age { display: none !important; }  
  
            .card__view .card-badge-age {   
                display: block !important; right: 0 !important; top: 0 !important; padding: 0.2em 0.45em !important;   
                background: rgba(0, 0, 0, 0.6) !important;   
                position: absolute !important; margin-top: 0 !important; font-size: 1.1em !important;   
                z-index: 10 !important; color: #fff !important; font-weight: bold !important;  
            }  
  
            .card__vote { right: 0 !important; bottom: 0 !important; padding: 0.2em 0.45em !important; z-index: 2; position: absolute !important; font-weight: bold; background: rgba(0,0,0,0.6); }  
            .card__ua_flag { position: absolute !important; left: 0 !important; bottom: 0 !important; width: 2.4em !important; height: 1.4em !important; font-size: 1.3em !important; background: linear-gradient(180deg, #0057b8 50%, #ffd700 50%) !important; opacity: 0.8 !important; z-index: 2; }  
              
            .items-line[data-uas-content-row="true"] .items-line__head { display: none !important; }  
              
            .items-line[data-uas-content-row="true"] { margin-top: 0.1em !important; margin-bottom: 0.5em !important; padding-top: 0 !important; padding-bottom: 0 !important; }  
            .items-line[data-uas-content-row="true"] .items-line__body { margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; }  
            .items-line[data-uas-content-row="true"] .scroll__item { margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; }  
        `;  
        document.head.appendChild(style);  
  
        Lampa.Listener.follow('line', function (e) {  
            if (e.type === 'create' && e.data && e.line && e.line.render) {  
                var el = e.line.render();  
                if (e.data.uas_content_row) el.attr('data-uas-content-row', 'true');  
            }  
        });  
  
        var CardMaker = Lampa.Maker.map('Card');  
        var originalOnVisible = CardMaker.Card.onVisible;  
  
        CardMaker.Card.onVisible = function () {  
            originalOnVisible.apply(this, arguments);  
            var cardInstance = this;  
            var html = this.html;  
            var data = this.data;  
            if (!html || !data) return;  
  
            var showFlag = Lampa.Storage.get('uas_show_flag');  
            if (showFlag === null || showFlag === undefined) showFlag = true;  
  
            if (showFlag && data.id) {  
                var oldFlag = html.querySelector('.card__ua_flag');  
                if (oldFlag) oldFlag.remove();  
  
                var meta = createMediaMeta(data);  
                if (meta) {  
                    loadFlag(meta).then(function (isSuccess) {  
                        if (isSuccess && cardInstance.html.parentNode) renderFlag(cardInstance.html);  
                    });  
                }  
            } else if (!showFlag) {  
                var oldFlag = html.querySelector('.card__ua_flag');  
                if (oldFlag) oldFlag.remove();  
            }  
        };  
  
        overrideApi();  
    }  
  
    if (window.appready) start();  
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });  
  
})();  
    
  
