(function () {  
    'use strict';  
  
    // Динамічні дати  
    var today = new Date().toISOString().slice(0, 10);  
    var currentYear = new Date().getFullYear();  
    var lastYear = currentYear - 1;  
  
    // Конфігурація підбірок (БЕЗ російського контенту)  
    var collectionsConfig = [  
        // ФІЛЬМИ  
        { id: 'hot_new_releases', emoji: '🎬', name_key: 'tmdb_mod_c_hot_new', request: 'discover/movie?sort_by=primary_release_date.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },  
        { id: 'trending_movies', emoji: '🔥', name_key: 'tmdb_mod_c_trend_movie', request: 'trending/movie/week' },  
        { id: 'fresh_online', emoji: '👀', name_key: 'tmdb_mod_c_watching_now', request: 'discover/movie?sort_by=popularity.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },  
        { id: 'cult_cinema', emoji: '🍿', name_key: 'tmdb_mod_c_cult', request: 'discover/movie?primary_release_date.gte=1980-01-01&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },  
        { id: 'top_10_studios_mix', emoji: '🏆', name_key: 'tmdb_mod_c_top_studios', request: 'discover/movie?with_companies=6194|33|4|306|5|12|8411|9195|2|7295&sort_by=popularity.desc&vote_average.gte=7.0&vote_count.gte=1000' },  
        { id: 'best_of_current_year_movies', emoji: '🌟', name_key: 'tmdb_mod_c_best_current_y', request: 'discover/movie?primary_release_year=' + currentYear + '&sort_by=vote_average.desc&vote_count.gte=300' },  
        { id: 'best_of_last_year_movies', emoji: '🏆', name_key: 'tmdb_mod_c_best_last_y', request: 'discover/movie?primary_release_year=' + lastYear + '&sort_by=vote_average.desc&vote_count.gte=500' },  
        { id: 'animation', emoji: '🧑‍🎤', name_key: 'tmdb_mod_c_animation', request: 'discover/movie?with_genres=16&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },  
        { id: 'documentary', emoji: '🔬', name_key: 'tmdb_mod_c_documentary', request: 'discover/movie?with_genres=99&sort_by=popularity.desc&vote_count.gte=20' },  
  
        // СЕРІАЛИ  
        { id: 'trending_tv', emoji: '🔥', name_key: 'tmdb_mod_c_trend_tv', request: 'trending/tv/week' },  
        { id: 'best_world_series', emoji: '🌍', name_key: 'tmdb_mod_c_world_hits', request: 'discover/tv?with_origin_country=US|CA|GB|AU|IE|DE|FR|NL|SE|NO|DK|FI|ES|IT|BE|CH|AT|KR|JP|MX|BR&sort_by=last_air_date.desc&vote_average.gte=7&vote_count.gte=500&first_air_date.gte=2020-01-01&first_air_date.lte=' + today + '&without_genres=16|99|10762|10763|10764|10766|10767|10768|10770&with_status=0|1|2|3' },  
        { id: 'netflix_best', emoji: '⚫', name_key: 'tmdb_mod_c_netflix', request: 'discover/tv?with_networks=213&sort_by=last_air_date.desc&first_air_date.gte=2020-01-01&last_air_date.lte=' + today + '&vote_count.gte=500&vote_average.gte=7&without_genres=16|99|10751|10762|10763|10764|10766|10767|10768|10770' },  
        { id: 'miniseries_hits', emoji: '💎', name_key: 'tmdb_mod_c_miniseries', request: 'discover/tv?with_type=2&sort_by=popularity.desc&vote_average.gte=7.0&vote_count.gte=200&without_genres=10764,10767' }  
    ];  
  
    var pluginSettings = {  
        enabled: true,  
        collections: collectionsConfig.reduce(function(acc, c) { acc[c.id] = true; return acc; }, {})  
    };  
  
    var settingsListener = null;  
    var isInitialized = false;  
  
    function loadSettings() {  
        if (Lampa.Storage) {  
            pluginSettings.enabled = Lampa.Storage.get('tmdb_mod_enabled', true);  
            collectionsConfig.forEach(function(cfg) {  
                pluginSettings.collections[cfg.id] = Lampa.Storage.get('tmdb_mod_collection_' + cfg.id, true);  
            });  
        }  
        return pluginSettings;  
    }  
  
    function saveSettings() {  
        if (Lampa.Storage) {  
            Lampa.Storage.set('tmdb_mod_enabled', pluginSettings.enabled);  
            collectionsConfig.forEach(function(cfg) {  
                Lampa.Storage.set('tmdb_mod_collection_' + cfg.id, pluginSettings.collections[cfg.id]);  
            });  
        }  
    }  
  
    function addTranslations() {  
        var translations = {  
            uk: {  
                tmdb_mod_plugin_name: 'TMDB Підбірки',  
                tmdb_mod_toggle_name: 'Увімкнути плагін',  
                tmdb_mod_toggle_desc: 'Показувати кастомні підбірки на головній',  
                tmdb_mod_show_collection: 'Показувати підбірку',  
                tmdb_mod_noty_reload: 'Перезавантажте сторінку для застосування змін',  
                tmdb_mod_c_hot_new: 'Гарячі новинки',  
                tmdb_mod_c_trend_movie: 'Трендові фільми',  
                tmdb_mod_c_watching_now: 'Дивляться зараз',  
                tmdb_mod_c_cult: 'Культове кіно',  
                tmdb_mod_c_top_studios: 'Топ студій',  
                tmdb_mod_c_best_current_y: 'Кращі ' + currentYear,  
                tmdb_mod_c_best_last_y: 'Кращі ' + lastYear,  
                tmdb_mod_c_animation: 'Анімація',  
                tmdb_mod_c_documentary: 'Документальні',  
                tmdb_mod_c_trend_tv: 'Трендові серіали',  
                tmdb_mod_c_world_hits: 'Світові хіти',  
                tmdb_mod_c_netflix: 'Netflix',  
                tmdb_mod_c_miniseries: 'Міні-серіали'  
            },  
            en: {  
                tmdb_mod_plugin_name: 'TMDB Collections',  
                tmdb_mod_toggle_name: 'Enable plugin',  
                tmdb_mod_toggle_desc: 'Show custom collections on home',  
                tmdb_mod_show_collection: 'Show collection',  
                tmdb_mod_noty_reload: 'Reload page to apply changes',  
                tmdb_mod_c_hot_new: 'Hot New Releases',  
                tmdb_mod_c_trend_movie: 'Trending Movies',  
                tmdb_mod_c_watching_now: 'Watching Now',  
                tmdb_mod_c_cult: 'Cult Cinema',  
                tmdb_mod_c_top_studios: 'Top Studios',  
                tmdb_mod_c_best_current_y: 'Best of ' + currentYear,  
                tmdb_mod_c_best_last_y: 'Best of ' + lastYear,  
                tmdb_mod_c_animation: 'Animation',  
                tmdb_mod_c_documentary: 'Documentary',  
                tmdb_mod_c_trend_tv: 'Trending TV',  
                tmdb_mod_c_world_hits: 'World Hits',  
                tmdb_mod_c_netflix: 'Netflix',  
                tmdb_mod_c_miniseries: 'Miniseries'  
            }  
        };  
  
        if (Lampa.Lang) {  
            Object.keys(translations).forEach(function(lang) {  
                Lampa.Lang.add(lang, translations[lang]);  
            });  
        }  
    }  
  
    function syncCheckboxes() {  
        requestAnimationFrame(function() {  
            document.querySelectorAll('[data-name="tmdb_mod_enabled"]').forEach(function(el) {  
                if (el.type === 'checkbox') el.checked = pluginSettings.enabled;  
            });  
  
            collectionsConfig.forEach(function(cfg) {  
                document.querySelectorAll('[data-name="tmdb_mod_collection_' + cfg.id + '"]').forEach(function(el) {  
                    if (el.type === 'checkbox') el.checked = pluginSettings.collections[cfg.id];  
                });  
            });  
        });  
    }  
  
    function createDiscoveryMain(parent) {  
        return function(oncomplete, onerror) {  
            var parts_data = [];  
  
            collectionsConfig.forEach(function(cfg) {  
                if (pluginSettings.collections[cfg.id]) {  
                    parts_data.push(function(call) {  
                        var params = { limit: 20 };  
                          
                        parent.get(cfg.request, params, function(json) {  
                            var translatedName = Lampa.Lang.translate(cfg.name_key);  
                            json.title = cfg.emoji ? cfg.emoji + ' ' + translatedName : translatedName;  
  
                            if (Lampa.Utils && Lampa.Utils.addSource) {  
                                Lampa.Utils.addSource(json, 'tmdb');  
                            }  
  
                            call(json);  
                        }, function(err) {  
                            console.error('[TMDB_MOD] Помилка завантаження підбірки "' + cfg.id + '":', err);  
                            var translatedName = Lampa.Lang.translate(cfg.name_key);  
                            var title = cfg.emoji ? cfg.emoji + ' ' + translatedName : translatedName;  
                            call({ source: 'tmdb', results: [], title: title });  
                        });  
                    });  
                }  
            });  
  
            if (parts_data.length === 0) {  
                if (onerror) onerror();  
                return function () {};  
            }  
  
            var methodToUse = Lampa.Api.sequentials || Lampa.Api.partNext;  
            methodToUse(parts_data, parts_data.length, oncomplete, onerror);  
            return function () {};  
        };  
    }  
  
    function initPlugin() {  
        try {  
            if (!Lampa.Api || !Lampa.Api.sources || !Lampa.Api.sources.tmdb) {  
                console.error('[TMDB_MOD] Lampa API не готовий');  
                if (Lampa.Noty) {  
                    Lampa.Noty.show('TMDB_MOD: Помилка ініціалізації');  
                }  
                return false;  
            }  
  
            var originalTMDB = Lampa.Api.sources.tmdb;  
            var settings = loadSettings();  
  
            var tmdb_mod = Object.assign({}, originalTMDB);  
            Lampa.Api.sources.tmdb_mod = tmdb_mod;  
            Object.defineProperty(Lampa.Api.sources, 'tmdb_mod', {  
                get: function() { return tmdb_mod; }  
            });  
  
            var originalMain = originalTMDB.main;  
  
            tmdb_mod.main = function () {  
                var args = Array.from(arguments);  
  
                if (loadSettings().enabled && this.type !== 'movie' && this.type !== 'tv') {  
                    return createDiscoveryMain(tmdb_mod).apply(this, args);  
                }  
  
                return originalMain.apply(this, args);  
            };  
  
            if (Lampa.Params && Lampa.Params.select) {  
                try {  
                    var sources = Lampa.Params.values && Lampa.Params.values.source ? Lampa.Params.values.source : {};  
                    if (!sources.tmdb_mod) {  
                        sources.tmdb_mod = 'TMDB_MOD';  
                        Lampa.Params.select('source', sources, 'tmdb');  
                    }  
                } catch (e) {  
                    console.error('[TMDB_MOD] Помилка реєстрації джерела:', e);  
                }  
            }  
  
            isInitialized = true;  
            return true;  
        } catch (e) {  
            console.error('[TMDB_MOD] Критична помилка ініціалізації:', e);  
            return false;  
        }  
    }  
  
    function destroyPlugin() {  
        if (Lampa.Api.sources.tmdb_mod) {  
            delete Lampa.Api.sources.tmdb_mod;  
        }  
  
        if (settingsListener && Lampa.Settings && Lampa.Settings.listener && Lampa.Settings.listener.remove) {  
            Lampa.Settings.listener.remove('open', settingsListener);  
            settingsListener = null;  
        }  
  
        isInitialized = false;  
    }  
  
    // Експортуємо API для мета-плагіна  
    window.TMDB_MOD_Plugin = {  
        init: function() {  
            if (isInitialized) {  
                console.warn('[TMDB_MOD] Плагін вже ініціалізовано');  
                return true;  
            }  
  
            addTranslations();  
            return initPlugin();  
        },  
  
        destroy: function() {  
            destroyPlugin();  
        },  
  
        getSettings: function() {  
            var params = [];  
  
            // Головний перемикач  
            params.push({  
                param: { name: 'tmdb_mod_enabled', type: 'trigger', default: true },  
                field: {  
                    name: Lampa.Lang.translate('tmdb_mod_toggle_name'),  
                    description: Lampa.Lang.translate('tmdb_mod_toggle_desc')  
  field: {  
                    name: Lampa.Lang.translate('tmdb_mod_toggle_name'),  
                    description: Lampa.Lang.translate('tmdb_mod_toggle_desc')  
                },  
                onChange: function (value) {  
                    pluginSettings.enabled = value;  
                    saveSettings();  
                      
                    if (!value && Lampa.Api.sources.tmdb_mod) {  
                        delete Lampa.Api.sources.tmdb_mod;  
                    }  
                      
                    Lampa.Noty.show(Lampa.Lang.translate('tmdb_mod_noty_reload'));  
                }  
            });  
  
            // Параметри для кожної підбірки  
            collectionsConfig.forEach(function(cfg) {  
                var translatedName = Lampa.Lang.translate(cfg.name_key);  
                var fullDisplayName = cfg.emoji ? cfg.emoji + ' ' + translatedName : translatedName;  
                  
                params.push({  
                    param: { name: 'tmdb_mod_collection_' + cfg.id, type: 'trigger', default: true },  
                    field: {  
                        name: fullDisplayName,  
                        description: Lampa.Lang.translate('tmdb_mod_show_collection') + ' "' + translatedName + '"'  
                    },  
                    onChange: function (value) {  
                        pluginSettings.collections[cfg.id] = value;  
                        saveSettings();  
                        Lampa.Noty.show(Lampa.Lang.translate('tmdb_mod_noty_reload'));  
                    }  
                });  
            });  
  
            return {  
                component: 'tmdb_mod',  
                name: Lampa.Lang.translate('tmdb_mod_plugin_name'),  
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>',  
                params: params  
            };  
        }  
    };  
  
    // Автоматична реєстрація якщо мета-плагін вже завантажено  
    if (window.LampaCustomization) {  
        window.LampaCustomization.register('tmdb_mod',   
            window.TMDB_MOD_Plugin.init,  
            window.TMDB_MOD_Plugin.destroy  
        );  
    }  
  
})();
