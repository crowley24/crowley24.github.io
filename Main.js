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
  
    var inflight = {};  
    var listCache = {};        
    var tmdbItemCache = {};    
    var itemUrlCache = {};     
  
    Lampa.Lang.add({  
        main: 'Головна UA',  
        title_main: 'Головна UA',  
        title_tmdb: 'Головна UA'  
    });  
  
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
  
    function makeWideCardItem(movie) {  
        return {  
            title: movie.title || movie.name,  
            params: {  
                createInstance: function () {  
                    return Lampa.Maker.make('Card', movie, function (module) { return module.only('Card', 'Callback'); });  
                },  
                emit: {  
                    onCreate: function () {  
                        var item = $(this.html);  
                        item.addClass('card--wide-custom');  
                        var view = item.find('.card__view');  
                        view.empty();   
                          
                        var quality = 'w300';  
                        var imgUrl = PROXIES[0] + Lampa.TMDB.image('t/p/' + quality + movie.backdrop_path);  
                        view.css({  
                            'background-image': 'url(' + imgUrl + ')', 'background-size': 'cover', 'background-position': 'center',  
                            'padding-bottom': '56.25%', 'height': '0', 'position': 'relative'  
                        });  
                          
                        view.append('<div class="card-backdrop-overlay"></div>');  
  
                        var voteVal = parseFloat(movie.vote_average);  
                        if (!isNaN(voteVal) && voteVal > 0) {  
                            var voteDiv = document.createElement('div');  
                            voteDiv.className = 'card__vote';  
                            voteDiv.innerText = voteVal.toFixed(1);  
                            view.append(voteDiv);  
                        }  
  
                        var yearStr = (movie.release_date || movie.first_air_date || '').toString().substring(0, 4);  
                        if (yearStr && yearStr.length === 4) {  
                            var ageDiv = document.createElement('div');  
                            ageDiv.className = 'card-badge-age';   
                            ageDiv.innerText = yearStr;  
                            view.append(ageDiv);  
                        }  
  
                        var descText = movie.overview || 'Опис відсутній.';  
                        item.append('<div class="custom-title-bottom">' + (movie.title || movie.name) + '</div>');  
                        item.append('<div class="custom-overview-bottom">' + descText + '</div>');  
                    },  
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
            let mapped = items.map(makeWideCardItem);  
            callback({   
                results: mapped,   
                title: '',   
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
            let mappedResults = tmdbItems.map(makeWideCardItem);  
  
            callback({   
                results: mappedResults,   
                title: '',   
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
                { id: 'ym_row_movies_new', defOrder: 1, type: 'uas', url: 'uas_movies_new', loadUrl: 'https://uaserials.com/films/p/', title: 'Новинки фільмів' },  
                { id: 'ym_row_series_new', defOrder: 2, type: 'uas', url: 'uas_series_new', loadUrl: 'https://uaserials.com/series/p/', title: 'Новинки серіалів' },  
                { id: 'ym_row_community', defOrder: 3, type: 'community', url: 'uas_community', title: 'Знахідки спільноти LME' },  
                { id: 'ym_row_movies_watch', defOrder: 4, type: 'uas', url: 'uas_movies_pop', loadUrl: 'https://uaserials.my/filmss/w/', title: 'Популярні фільми' },  
                { id: 'ym_row_series_pop', defOrder: 5, type: 'uas', url: 'uas_series_pop', loadUrl: 'https://uaserials.com/series/w/', title: 'Популярні серіали' }  
            ];  
  
            let parts_data =[];  
              
            rowDefs.forEach(def => {  
                parts_data.push((cb) => {  
                    if (def.type === 'community') loadCommunityGemsRow(cb);  
                    else loadRow(def.url, def.loadUrl, def.title, cb);  
                });  
            });  
  
            if(parts_data.length === 0) {  
                parts_data.push((cb) => loadRow('uas_movies_new', 'https://uaserials.com/films/p/', 'Новинки фільмів', cb));  
            }  
  
            Lampa.Api.partNext(parts_data, 2, oncomplite, onerror);  
        };  
    }  
  
    function start() {  
        if (window.uaserials_pro_v8_loaded) return;  
        window.uaserials_pro_v8_loaded = true;  
  
        var style = document.createElement('style');  
        style.innerHTML = `  
            .card .card__age { display: none !important; }  
  
            .card__view .card-badge-age {   
                display: block !important; right: 0 !important; top: 0 !important; padding: 0.2em 0.45em !important;   
                background: rgba(0, 0, 0, 0.6) !important;   
                position: absolute !important; margin-top: 0 !important; font-size: 1.1em !important;   
                z-index: 10 !important; color: #fff !important; font-weight: bold !important;  
            }  
  
            .card--wide-custom { width: 25em !important; margin-right: 0.2em !important; margin-bottom: 0 !important; position: relative; cursor: pointer; transition: transform 0.2s ease, z-index 0.2s ease; z-index: 1; }  
              
            .card--wide-custom .card__view { border-radius: 0.4em !important; overflow: hidden !important; box-shadow: 0 3px 6px rgba(0,0,0,0.5); }  
            .card--wide-custom .card-backdrop-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); pointer-events: none; border-radius: 0.4em !important; z-index: 1; }  
              
            .card--wide-custom.focus { z-index: 99 !important; transform: scale(1.08); }  
            .card--wide-custom.focus .card__view { box-shadow: 0 10px 25px rgba(0,0,0,0.9) !important; border: 3px solid #fff !important; outline: none !important; }  
  
            .card__vote { right: 0 !important; bottom: 0 !important; padding: 0.2em 0.45em !important; z-index: 2; position: absolute !important; font-weight: bold; background: rgba(0,0,0,0.6); }  
            .card__ua_flag { position: absolute !important; left: 0 !important; bottom: 0 !important; width: 2.4em !important; height: 1.4em !important; font-size: 1.3em !important; background: linear-gradient(180deg, #0057b8 50%, #ffd700 50%) !important; opacity: 0.8 !important; z-index: 2; }  
              
            .card--wide-custom .card-badge-age { border-radius: 0 0 0 0.5em !important; }  
            .card--wide-custom .card__vote { border-radius: 0.5em 0 0 0 !important; }   
            .card--wide-custom .card__type { border-radius: 0 0 0.5em 0 !important; }    
            .card--wide-custom .card__ua_flag { border-radius: 0 0.5em 0 0 !important; }  
  
            .items-line[data-uas-content-row="true"] .items-line__head { display: none !important; }  
              
            .items-line[data-uas-content-row="true"] { margin-top: 0.1em !important; margin-bottom: 0.5em !important; padding-top: 0 !important; padding-bottom: 0 !important; }  
            .items-line[data-uas-content-row="true"] .items-line__body { margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; }  
            .items-line[data-uas-content-row="true"] .scroll__item { margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; }  
  
            .custom-title-bottom { width: 100%; text-align: left; font-size: 1.1em; font-weight: bold; margin-top: 0.3em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 0.2em; }  
            .custom-overview-bottom { width: 100%; text-align: left; font-size: 0.85em; color: #bbb; line-height: 1.2; margin-top: 0.2em; padding: 0 0.2em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; }  
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
  
            var isWideCard = html.classList.contains('card--wide-custom') || $(html).hasClass('card--wide-custom');  
            if (isWideCard) return;  
  
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
 
