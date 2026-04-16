(function () {  
    'use strict';  
  
    if (window.plugin_tmdb_mod_ready) return;  
    window.plugin_tmdb_mod_ready = true;  
  
    var today = new Date().toISOString().slice(0, 10);  
    var currentYear = new Date().getFullYear();  
    var lastYear = currentYear - 1;  
  
    var collectionsConfig = [  
        { id: 'hot_new_releases', emoji: '🎬', name_key: 'tmdb_mod_c_hot_new', request: 'discover/movie?sort_by=primary_release_date.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },  
        { id: 'trending_movies', emoji: '🔥', name_key: 'tmdb_mod_c_trend_movie', request: 'trending/movie/week' },  
        { id: 'fresh_online', emoji: '👀', name_key: 'tmdb_mod_c_watching_now', request: 'discover/movie?sort_by=popularity.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },  
        { id: 'cult_cinema', emoji: '🍿', name_key: 'tmdb_mod_c_cult', request: 'discover/movie?primary_release_date.gte=1980-01-01&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },  
        { id: 'top_10_studios_mix', emoji: '🏆', name_key: 'tmdb_mod_c_top_studios', request: 'discover/movie?with_companies=6194|33|4|306|5|12|8411|9195|2|7295&sort_by=popularity.desc&vote_average.gte=7.0&vote_count.gte=1000' },  
        { id: 'best_of_current_year_movies', emoji: '🌟', name_key: 'tmdb_mod_c_best_current_y', request: 'discover/movie?primary_release_year=' + currentYear + '&sort_by=vote_average.desc&vote_count.gte=300' },  
        { id: 'best_of_last_year_movies', emoji: '🏆', name_key: 'tmdb_mod_c_best_last_y', request: 'discover/movie?primary_release_year=' + lastYear + '&sort_by=vote_average.desc&vote_count.gte=500' },  
        { id: 'animation', emoji: '🧑‍🎤', name_key: 'tmdb_mod_c_animation', request: 'discover/movie?with_genres=16&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },  
        { id: 'documentary', emoji: '🔬', name_key: 'tmdb_mod_c_documentary', request: 'discover/movie?with_genres=99&sort_by=popularity.desc&vote_count.gte=20' },  
  
        { id: 'trending_tv', emoji: '🔥', name_key: 'tmdb_mod_c_trend_tv', request: 'trending/tv/week' },  
        { id: 'best_world_series', emoji: '🌍', name_key: 'tmdb_mod_c_world_hits', request: 'discover/tv?with_origin_country=US|CA|GB|AU|IE|DE|FR|NL|SE|NO|DK|FI|ES|IT|BE|CH|AT|KR|JP|MX|BR&sort_by=last_air_date.desc&vote_average.gte=7&vote_count.gte=500&first_air_date.gte=2020-01-01&first_air_date.lte=' + today + '&without_genres=16|99|10762|10763|10764|10766|10767|10768|10770&with_status=0|1|2|3' },  
        { id: 'netflix_best', emoji: '⚫', name_key: 'tmdb_mod_c_netflix', request: 'discover/tv?with_networks=213&sort_by=last_air_date.desc&first_air_date.gte=2020-01-01&last_air_date.lte=' + today + '&vote_count.gte=500&vote_average.gte=7&without_genres=16|99|10751|10762|10763|10764|10766|10767|10768|10770' },  
        { id: 'miniseries_hits', emoji: '💎', name_key: 'tmdb_mod_c_miniseries', request: 'discover/tv?with_type=2&sort_by=popularity.desc&vote_average.gte=7.0&vote_count.gte=200&without_genres=10764,10767' }  
    ];  
  
    var pluginSettings = {  
        enabled: true,  
        stylish: false,
        collections: collectionsConfig.reduce(function(acc, c) { acc[c.id] = true; return acc; }, {})  
    };  
  
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
        var style = $('<style id="tmdb_mod_styles">')
            .text(`
                .card--tmdb-stylish .card__title { display: none !important; }
                .card--tmdb-stylish .card__age { display: none !important; }
                .card--tmdb-stylish .card__icons { display: none !important; }
                .card--tmdb-stylish .card__img { border-radius: 0.6em !important; overflow: hidden !important; }
                .card--tmdb-stylish.card--wide { width: 20em !important; }
            `);
        $('head').append(style);
    }
  
    function addTranslations() {  
        if (!Lampa.Lang) return;  
        Lampa.Lang.add({  
            tmdb_mod_plugin_name: { ru: "Підбірки TMDB_MOD", uk: "Підбірки TMDB_MOD" },  
            tmdb_mod_toggle_name: { ru: "Увімкнути TMDB_MOD підбірки", uk: "Увімкнути TMDB_MOD підбірки" },  
            tmdb_mod_stylish_name: { ru: "Стильні картки", uk: "Стильні картки" },
            tmdb_mod_stylish_desc: { ru: "Горизонтальні картки (Apple TV стиль)", uk: "Горизонтальні картки (Apple TV стиль)" },
            tmdb_mod_toggle_desc: { ru: "Показувати кастомні підбірки на головній сторінці", uk: "Показувати кастомні підбірки на головній сторінці" },  
            tmdb_mod_noty_reload: { ru: "Зміни набудуть чинності після перезавантаження головної сторінки", uk: "Зміни набудуть чинності після перезавантаження головної сторінки" },  
            tmdb_mod_show_collection: { ru: "Показувати підбірку", uk: "Показувати підбірку" },
            // Фільми  
            tmdb_mod_c_hot_new: { ru: "Найсвіжіші прем'єри", uk: "Найсвіжіші прем'єри" },  
            tmdb_mod_c_trend_movie: { ru: "Топ фільмів тижня", uk: "Топ фільмів тижня" },  
            tmdb_mod_c_watching_now: { ru: "Зараз дивляться", uk: "Зараз дивляться" },  
            tmdb_mod_c_cult: { ru: "Популярні фільми з 80-х", uk: "Популярні фільми з 80-х" },  
            tmdb_mod_c_top_studios: { ru: "Золота Десятка Студій", uk: "Золота Десятка Студій" },  
            tmdb_mod_c_best_current_y: { ru: "Кращі фільми " + currentYear, uk: "Кращі фільми " + currentYear },  
            tmdb_mod_c_best_last_y: { ru: "Кращі фільми " + lastYear, uk: "Кращі фільми " + lastYear },  
            tmdb_mod_c_animation: { ru: "Кращі мультфільми", uk: "Кращі мультфільми" },  
            tmdb_mod_c_documentary: { ru: "Документальні фільми", uk: "Документальні фільми" },  
            // Серіали  
            tmdb_mod_c_trend_tv: { ru: "Топ серіалів тижня", uk: "Топ серіалів тижня" },  
            tmdb_mod_c_world_hits: { ru: "Хіти світу 2020+", uk: "Хіти світу 2020+" },  
            tmdb_mod_c_netflix: { ru: "Серіали Netflix", uk: "Серіали Netflix" },  
            tmdb_mod_c_miniseries: { ru: "Міні-серіали", uk: "Міні-серіали" }
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
                            var translatedName = Lampa.Lang.translate(cfg.name_key);  
                            json.title = cfg.emoji ? cfg.emoji + ' ' + translatedName : translatedName;   
                            
                            // ПРИМУСОВЕ ЗАСТОСУВАННЯ СТИЛЮ
                            if (settings.stylish) {
                                json.card_type = 'wide'; // Встановлюємо для всієї стрічки
                                if (json.results) {
                                    json.results.forEach(function(item) {
                                        item.card_type = 'wide';
                                        item.class = 'tmdb-stylish';
                                    });
                                }
                            }

                            if (Lampa.Utils && Lampa.Utils.addSource) {  
                                Lampa.Utils.addSource(json, 'tmdb');  
                            }  
                            call(json);   
                        }, function(err) {  
                            call({ source: 'tmdb', results: [], title: Lampa.Lang.translate(cfg.name_key) });  
                        });   
                    });  
                }  
            });  
              
            var methodToUse = Lampa.Api.sequentials || Lampa.Api.partNext;  
            if (parts_data.length > 0) methodToUse(parts_data, parts_data.length, oncomplete, onerror);   
            return function () {};  
        };  
    };  
  
    function addSettings() {    
        if (!Lampa.SettingsApi) return;    
            
        Lampa.SettingsApi.addComponent({    
            component: 'tmdb_mod',    
            name: Lampa.Lang.translate('tmdb_mod_plugin_name'),    
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>'    
        });    
  
        Lampa.SettingsApi.addParam({    
            component: 'tmdb_mod',    
            param: { name: 'tmdb_mod_enabled', type: 'trigger', default: true },    
            field: { name: Lampa.Lang.translate('tmdb_mod_toggle_name'), description: Lampa.Lang.translate('tmdb_mod_toggle_desc') },    
            onChange: function (value) {    
                pluginSettings.enabled = value;    
                saveSettings();    
                Lampa.Noty.show(Lampa.Lang.translate('tmdb_mod_noty_reload'));    
            }    
        });  

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
                field: { name: (cfg.emoji ? cfg.emoji + ' ' : '') + Lampa.Lang.translate(cfg.name_key) },    
                onChange: function (value) {    
                    pluginSettings.collections[cfg.id] = value;    
                    saveSettings();    
                    Lampa.Noty.show(Lampa.Lang.translate('tmdb_mod_noty_reload'));    
                }  
            });  
        });  
    } 
  
    function initPlugin() {  
        if (!Lampa.Api || !Lampa.Api.sources || !Lampa.Api.sources.tmdb) return false;  
        
        addStyles();
        var originalTMDB = Lampa.Api.sources.tmdb;  
        var tmdb_mod = Object.assign({}, originalTMDB);  
        
        Lampa.Api.sources.tmdb_mod = tmdb_mod;  
        tmdb_mod.main = function () {  
            var args = Array.from(arguments);  
            if (loadSettings().enabled && this.type !== 'movie' && this.type !== 'tv') {  
                return createDiscoveryMain(tmdb_mod).apply(this, args);  
            }  
            return originalTMDB.main.apply(this, args);  
        };  

        if (Lampa.Params && Lampa.Params.select) {  
            var sources = Lampa.Params.values && Lampa.Params.values.source ? Lampa.Params.values.source : {};  
            if (!sources.tmdb_mod) {  
                sources.tmdb_mod = 'TMDB_MOD';   
                Lampa.Params.select('source', sources, 'tmdb');   
            }  
        }  
        return true;  
    }  
  
    function waitForApp() {  
        if (window.appready) {  
            addTranslations();  
            if (initPlugin()) addSettings();  
        } else {  
            Lampa.Listener.follow('app', function (e) {  
                if (e.type === 'ready') {  
                    addTranslations();  
                    if (initPlugin()) addSettings();  
                }  
            });  
        }  
    }  
  
    waitForApp();  
})();
