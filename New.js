(function () {  
    'use strict';  
  
    if (window.plugin_tmdb_mod_ready) return;  
    window.plugin_tmdb_mod_ready = true;  
  
    var today = new Date().toISOString().slice(0, 10);  
    var currentYear = new Date().getFullYear();  
    var lastYear = currentYear - 1;  
  
    var pluginSettings = {  
        enabled: true,  
        stylish: false,
        collections: {}  
    };  
  
    var collectionsConfig = [  
        { id: 'hot_new_releases', emoji: '🎬', name_key: 'tmdb_mod_c_hot_new', request: 'discover/movie?sort_by=primary_release_date.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },  
        { id: 'trending_movies', emoji: '🔥', name_key: 'tmdb_mod_c_trend_movie', request: 'trending/movie/week' },  
        { id: 'netflix_best', emoji: '⚫', name_key: 'tmdb_mod_c_netflix', request: 'discover/tv?with_networks=213&sort_by=last_air_date.desc&first_air_date.gte=2020-01-01&last_air_date.lte=' + today + '&vote_count.gte=500&vote_average.gte=7&without_genres=16|99|10751|10762|10763|10764|10766|10767|10768|10770' },
        { id: 'top_10_studios_mix', emoji: '🏆', name_key: 'tmdb_mod_c_top_studios', request: 'discover/movie?with_companies=6194|33|4|306|5|12|8411|9195|2|7295&sort_by=popularity.desc&vote_average.gte=7.0&vote_count.gte=1000' }
    ];  
  
    function loadSettings() {  
        if (Lampa.Storage) {  
            pluginSettings.enabled = Lampa.Storage.get('tmdb_mod_enabled', true);  
            pluginSettings.stylish = Lampa.Storage.get('tmdb_mod_stylish', false);  
            collectionsConfig.forEach(function(cfg) {  
                pluginSettings.collections[cfg.id] = Lampa.Storage.get('tmdb_mod_collection_' + cfg.id, true);  
            });  
        }  
        return pluginSettings;  
    }  
  
    function saveSettings() {  
        if (Lampa.Storage) {  
            Lampa.Storage.set('tmdb_mod_enabled', pluginSettings.enabled);  
            Lampa.Storage.set('tmdb_mod_stylish', pluginSettings.stylish);  
            collectionsConfig.forEach(function(cfg) {  
                Lampa.Storage.set('tmdb_mod_collection_' + cfg.id, pluginSettings.collections[cfg.id]);  
            });  
        }  
    }  

    function addStyles() {
        if ($('#tmdb_mod_styles').length) return;
        $('head').append(`<style id="tmdb_mod_styles">
            .card--tmdb-mod.card--wide { width: 19em !important; height: 10.7em !important; margin-right: 1.2em !important; }
            .card--tmdb-mod.card--wide .card__img { border-radius: 0.8em !important; box-shadow: 0 0.5em 1.5em rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.05); }
            .card--tmdb-mod.card--wide .card__title, 
            .card--tmdb-mod.card--wide .card__age, 
            .card--tmdb-mod.card--wide .card__icons { display: none !important; }
            .card--tmdb-mod.card--wide:focus .card__img { border: 2px solid #fff; transform: scale(1.03); transition: all 0.2s ease; }
        </style>`);
    }
  
    function addTranslations() {  
        Lampa.Lang.add({  
            tmdb_mod_plugin_name: { uk: "Підбірки TMDB_MOD" },  
            tmdb_mod_toggle_name: { uk: "Увімкнути плагін" },  
            tmdb_mod_stylish_name: { uk: "Стильні картки (Apple TV)" },
            tmdb_mod_stylish_desc: { uk: "Горизонтальні картки без тексту" },
            tmdb_mod_noty_reload: { uk: "Налаштування змінено. Перезавантажте сторінку." },  
            tmdb_mod_c_hot_new: { uk: "Найсвіжіші прем'єри" },  
            tmdb_mod_c_trend_movie: { uk: "Топ фільмів тижня" },  
            tmdb_mod_c_netflix: { uk: "Хіти Netflix" },
            tmdb_mod_c_top_studios: { uk: "Золота Десятка Студій" }
        });  
    }  
  
    var createDiscoveryMain = function (parent) {  
        return function () {  
            var params = arguments[0] || {};  
            var oncomplete = arguments[1];  
            var onerror = arguments[2];  
            var settings = loadSettings();  
            var parts_data = [];  
  
            collectionsConfig.forEach(function(cfg) {  
                if (settings.collections[cfg.id]) {  
                    parts_data.push(function (call) {   
                        parent.get(cfg.request, params, function (json) {   
                            var title = cfg.emoji + ' ' + Lampa.Lang.translate(cfg.name_key);
                            json.title = title;

                            if (settings.stylish) {
                                // ОСНОВНИЙ МЕТОД: Зміна типу для всієї секції
                                json.card_type = 'wide'; 
                                if (json.results) {
                                    json.results.forEach(function(item) {
                                        item.card_type = 'wide';
                                        item.class = 'tmdb-mod'; // Наш CSS клас
                                        item.is_movie = false;   // Вимикаємо стандартний постер
                                        item.type = 'collection'; // Імітуємо колекцію для рендеру
                                    });
                                }
                            }

                            if (Lampa.Utils && Lampa.Utils.addSource) Lampa.Utils.addSource(json, 'tmdb');  
                            call(json);   
                        }, function() { call({ results: [], title: Lampa.Lang.translate(cfg.name_key) }); });   
                    });  
                }  
            });  
              
            var methodToUse = Lampa.Api.sequentials || Lampa.Api.partNext;  
            if (parts_data.length > 0) methodToUse(parts_data, parts_data.length, oncomplete, onerror);   
            return function () {};  
        };  
    };  
  
    function addSettings() {    
        Lampa.SettingsApi.addComponent({ component: 'tmdb_mod', name: Lampa.Lang.translate('tmdb_mod_plugin_name') });    
        
        Lampa.SettingsApi.addParam({    
            component: 'tmdb_mod',    
            param: { name: 'tmdb_mod_stylish', type: 'trigger', default: false },    
            field: { name: Lampa.Lang.translate('tmdb_mod_stylish_name'), description: Lampa.Lang.translate('tmdb_mod_stylish_desc') },    
            onChange: function (value) {    
                pluginSettings.stylish = value;    
                saveSettings();    
                Lampa.Noty.show(Lampa.Lang.translate('tmdb_mod_noty_reload'));    
            }    
        });

        collectionsConfig.forEach(function(cfg) {    
            Lampa.SettingsApi.addParam({    
                component: 'tmdb_mod',    
                param: { name: 'tmdb_mod_collection_' + cfg.id, type: 'trigger', default: true },    
                field: { name: Lampa.Lang.translate(cfg.name_key) },    
                onChange: function (value) {    
                    pluginSettings.collections[cfg.id] = value;    
                    saveSettings();    
                }  
            });  
        });  
    } 
  
    function initPlugin() {  
        if (!Lampa.Api || !Lampa.Api.sources.tmdb) return false;  
        addStyles();
        var tmdb_mod = Object.assign({}, Lampa.Api.sources.tmdb);  
        Lampa.Api.sources.tmdb_mod = tmdb_mod;  
        
        tmdb_mod.main = function () {  
            if (loadSettings().enabled && this.type !== 'movie' && this.type !== 'tv') {  
                return createDiscoveryMain(tmdb_mod).apply(this, arguments);  
            }  
            return Lampa.Api.sources.tmdb.main.apply(this, arguments);  
        };  

        if (Lampa.Params) {  
            var sources = Lampa.Params.values && Lampa.Params.values.source ? Lampa.Params.values.source : {};  
            sources.tmdb_mod = 'TMDB_MOD';   
            Lampa.Params.select('source', sources, 'tmdb');   
        }  
        return true;  
    }  
  
    if (window.appready) {  
        addTranslations(); if (initPlugin()) addSettings();  
    } else {  
        Lampa.Listener.follow('app', function (e) {  
            if (e.type === 'ready') { addTranslations(); if (initPlugin()) addSettings(); }  
        });  
    }  
})();
