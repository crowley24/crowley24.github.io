(function () {  
    'use strict';  
  
    if (window.plugin_tmdb_mod_ready) return;  
    window.plugin_tmdb_mod_ready = true;  
  
    var today = new Date().toISOString().slice(0, 10);  
    var currentYear = new Date().getFullYear();  
  
    var pluginSettings = {  
        enabled: true,  
        stylish: false,
        collections: {}
    };  

    // Конфігурація підбірок
    var collectionsConfig = [  
        { id: 'hot_new_releases', emoji: '🎬', name_key: 'tmdb_mod_c_hot_new', request: 'discover/movie?sort_by=primary_release_date.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },  
        { id: 'trending_movies', emoji: '🔥', name_key: 'tmdb_mod_c_trend_movie', request: 'trending/movie/week' },  
        { id: 'netflix_best', emoji: '⚫', name_key: 'tmdb_mod_c_netflix', request: 'discover/tv?with_networks=213&sort_by=last_air_date.desc&first_air_date.gte=2020-01-01&last_air_date.lte=' + today + '&vote_count.gte=500&vote_average.gte=7&without_genres=16|99|10751|10762|10763|10764|10766|10767|10768|10770' }
    ];

    function loadSettings() {  
        if (Lampa.Storage) {  
            pluginSettings.enabled = Lampa.Storage.get('tmdb_mod_enabled', true);  
            pluginSettings.stylish = Lampa.Storage.get('tmdb_mod_stylish', false);  
        }  
        return pluginSettings;  
    }  

    function saveSettings() {  
        if (Lampa.Storage) {  
            Lampa.Storage.set('tmdb_mod_enabled', pluginSettings.enabled);  
            Lampa.Storage.set('tmdb_mod_stylish', pluginSettings.stylish);  
        }  
    }  

    function addStyles() {
        if ($('#tmdb_mod_styles').length) return;
        $('head').append(`<style id="tmdb_mod_styles">
            .card--tmdb-stylish .card__title { display: none !important; }
            .card--tmdb-stylish .card__age { display: none !important; }
            .card--tmdb-stylish .card__icons { display: none !important; }
            .card--tmdb-stylish .card__img { border-radius: 0.8em !important; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
            .card--tmdb-stylish.card--wide { width: 18em !important; height: 10em !important; }
        </style>`);
    }

    function addTranslations() {  
        Lampa.Lang.add({  
            tmdb_mod_plugin_name: { uk: "Підбірки TMDB_MOD" },  
            tmdb_mod_stylish_name: { uk: "Стильні картки" },
            tmdb_mod_stylish_desc: { uk: "Горизонтальні картки (Apple TV стиль)" },
            tmdb_mod_noty_reload: { uk: "Перезавантажте головну сторінку для змін" },
            tmdb_mod_c_hot_new: { uk: "Найсвіжіші прем'єри" },
            tmdb_mod_c_trend_movie: { uk: "Топ фільмів тижня" },
            tmdb_mod_c_netflix: { uk: "Серіали Netflix" }
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
                parts_data.push(function (call) {   
                    parent.get(cfg.request, params, function (json) {   
                        json.title = cfg.emoji + ' ' + Lampa.Lang.translate(cfg.name_key);  
                        
                        if (settings.stylish) {
                            json.card_type = 'wide'; 
                            if (json.results) {
                                json.results.forEach(function(item) {
                                    item.card_type = 'wide';
                                    item.class = 'tmdb-stylish';
                                    // КЛЮЧОВИЙ МОМЕНТ:
                                    item.is_movie = false; // Знімаємо прапорець стандартного фільму для зміни рендеру
                                });
                            }
                        }

                        if (Lampa.Utils && Lampa.Utils.addSource) Lampa.Utils.addSource(json, 'tmdb');  
                        call(json);   
                    }, function() { call({ results: [] }); });   
                });  
            });  
              
            var methodToUse = Lampa.Api.sequentials || Lampa.Api.partNext;  
            methodToUse(parts_data, parts_data.length, oncomplete, onerror);   
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
