(function () {  
    'use strict';  
    if (typeof Lampa === 'undefined') return;  
  
    var CONFIG = {   
        language: 'uk',  
        endpoint: 'https://wh.lme.isroot.in/'  
    };  
  
    const PROXIES =['https://cors.lampa.stream/'];  
  
    function getTmdbKey() {  
        return Lampa.TMDB && Lampa.TMDB.key ? Lampa.TMDB.key() : '4ef0d7355d9ffb5151e987764708ce96';  
    }  
  
    function getTmdbEndpoint(path) {  
        let url = Lampa.TMDB.api(path);  
        if (!url.includes('api_key')) url += (url.includes('?') ? '&' : '?') + 'api_key=' + getTmdbKey();  
        return url;  
    }  
  
    async function fetchCatalogPage(url) {  
        let response = await fetch(PROXIES[0] + url);  
        return await response.json();  
    }  
  
    function makeWideCardItem(movie) {  
        return {  
            title: movie.title || movie.name,  
            params: {  
                createInstance: function () {  
                    return Lampa.Maker.make('Card', movie, function (module) {   
                        return module.only('Card', 'Callback');   
                    });  
                },  
                emit: {  
                    onlyEnter: function () {  
                        var mType = movie.media_type || (movie.name ? 'tv' : 'movie');  
                        Lampa.Activity.push({   
                            url: '',   
                            component: 'full',   
                            id: movie.id,   
                            method: mType,   
                            card: movie,   
                            source: 'tmdb'   
                        });  
                    }  
                }  
            }  
        };  
    }  
  
    Lampa.Api.sources.uas_pro_source = {  
        list: async function (params, oncomplete, onerror) {  
            try {  
                let items = await fetchCatalogPage('https://api.themoviedb.org/3/movie/popular?language=uk');  
                let mapped = items.results.map(makeWideCardItem);  
                oncomplete({ results: mapped });  
            } catch (e) { onerror(); }  
        }  
    };  
  
    function start() {  
        if (window.uaserials_pro_v8_loaded) return;  
        window.uaserials_pro_v8_loaded = true;  
    }  
  
    if (window.appready) start();  
    else Lampa.Listener.follow('app', function (e) {   
        if (e.type === 'ready') start();   
    });  
})();
