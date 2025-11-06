(function () {  
    'use strict';  
  
    // ===== МЕТА-ПЛАГІН "КАСТОМІЗАЦІЯ" =====  
    if (window.plugin_customization_ready) return;  
    window.plugin_customization_ready = true;  
  
    var subPlugins = {  
        tmdb_mod: {  
            name: 'TMDB Підбірки',  
            enabled: true,  
            init: null,  
            destroy: null,  
            settingsProvider: null  
        },  
        new_interface: {  
            name: 'Новий інтерфейс',  
            enabled: true,  
            init: null,  
            destroy: null,  
            settingsProvider: null  
        }  
    };  
  
    function loadSettings() {  
        if (!Lampa.Storage) return;  
        Object.keys(subPlugins).forEach(function(key) {  
            var saved = Lampa.Storage.get('customization_' + key + '_enabled');  
            if (saved !== undefined) {  
                subPlugins[key].enabled = saved;  
            }  
        });  
    }  
  
    function saveSettings() {  
        if (!Lampa.Storage) return;  
        Object.keys(subPlugins).forEach(function(key) {  
            Lampa.Storage.set('customization_' + key + '_enabled', subPlugins[key].enabled);  
        });  
    }  
  
    function addSettings() {  
        if (!Lampa.SettingsApi) return;  
  
        Lampa.SettingsApi.addComponent({  
            component: 'customization',  
            name: 'Кастомізація',  
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m-5-7H1m6 0h6m6 0h6"/></svg>'  
        });  
  
        Object.keys(subPlugins).forEach(function(key) {  
            var plugin = subPlugins[key];  
              
            Lampa.SettingsApi.addParam({  
                component: 'customization',  
                param: { name: 'customization_' + key, type: 'trigger', default: true },  
                field: { name: plugin.name, description: 'Увімкнути/вимкнути ' + plugin.name },  
                onChange: function (value) {  
                    plugin.enabled = value;  
                    saveSettings();  
                      
                    if (value && plugin.init) {  
                        plugin.init();  
                    } else if (!value && plugin.destroy) {  
                        plugin.destroy();  
                    }  
                      
                    Lampa.Noty.show('Перезавантажте Lampa для застосування змін');  
                }  
            });  
  
            if (plugin.enabled && plugin.settingsProvider) {  
                var settings = plugin.settingsProvider();  
                if (settings && settings.params) {  
                    settings.params.forEach(function(paramConfig) {  
                        Lampa.SettingsApi.addParam({  
                            component: 'customization',  
                            param: paramConfig.param,  
                            field: paramConfig.field,  
                            onChange: paramConfig.onChange  
                        });  
                    });  
                }  
            }  
        });  
    }  
  
    function registerSubPlugin(key, initFn, destroyFn) {  
        if (subPlugins[key]) {  
            subPlugins[key].init = initFn;  
            subPlugins[key].destroy = destroyFn;  
              
            if (window[key.toUpperCase() + '_Plugin'] && window[key.toUpperCase() + '_Plugin'].getSettings) {  
                subPlugins[key].settingsProvider = window[key.toUpperCase() + '_Plugin'].getSettings.bind(window[key.toUpperCase() + '_Plugin']);  
            }  
              
            if (subPlugins[key].enabled) {  
                initFn();  
            }  
        }  
    }  
  
    function init() {  
        loadSettings();  
        window.LampaCustomization = { register: registerSubPlugin };  
        setTimeout(function() { addSettings(); }, 500);  
    }  
  
    function waitForApp(retries) {  
        retries = retries || 0;  
        if (retries > 30) {  
            console.error('[CUSTOMIZATION] Не вдалося завантажити Lampa');  
            return;  
        }  
  
        if (window.appready) {  
            init();  
        } else if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {  
            Lampa.Listener.follow('app', function (e) {  
                if (e.type === 'ready') init();  
            });  
        } else {  
            setTimeout(function() { waitForApp(retries + 1); }, 1000);  
        }  
    }  
  
    waitForApp();  
  
    // ===== ПІДПЛАГІН: TMDB_MOD =====  
    (function() {  
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
            { id: 'best_world_series', emoji: '🌍', name_key: 'tmdb_mod_c_world_hits', request: 'discover/tv?with_origin_country=US|CA|GB|AU|IE|DE|FR|NL|SE|NO|DK|FI|ES|IT|BE|CH|AT|KR|JP|MX|BR&sort_by=popularity.desc&vote_average.gte=7.5&vote_count.gte=500' },  
            { id: 'best_current_year_tv', emoji: '🌟', name_key: 'tmdb_mod_c_best_current_y_tv', request: 'discover/tv?first_air_date_year=' + currentYear + '&sort_by=vote_average.desc&vote_count.gte=100' },  
            { id: 'best_last_year_tv', emoji: '🏆', name_key: 'tmdb_mod_c_best_last_y_tv', request: 'discover/tv?first_air_date_year=' + lastYear + '&sort_by=vote_average.desc&vote_count.gte=200' }  
        ];  
  
        var maxRetries = 30;  
        var pluginSettings = { enabled: true, collections: {} };  
        var settingsListener = null;  
        var isInitialized = false;  
  
        collectionsConfig.forEach(function(cfg) {  
            pluginSettings.collections[cfg.id] = true;  
        });  
  
        function loadSettings() {  
            if (!Lampa.Storage) return pluginSettings;  
            var saved = Lampa.Storage.get('tmdb_mod_settings');  
            if (saved) pluginSettings = saved;  
            return pluginSettings;  
        }  
  
        function saveSettings() {  
            if (!Lampa.Storage) return;  
            Lampa.Storage.set('tmdb_mod_settings', pluginSettings);  
        }  
  
        function addTranslations() {  
            var translations = {  
                uk: {  
                    tmdb_mod_plugin_name: 'TMDB Підбірки',  
                    tmdb_mod_toggle_name: 'Увімкнути плагін',  
                    tmdb_mod_toggle_desc: 'Показувати кастомні підбірки на головній',  
                    tmdb_mod_show_collection: 'Показувати підбірку',  
                    tmdb_mod_noty_reload: 'Перезавантажте Lampa для застосування змін',  
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
                    tmdb_mod_c_best_current_y_tv: 'Кращі серіали ' + currentYear,  
                    tmdb_mod_c_best_last_y_tv: 'Кращі серіали ' + lastYear  
                }  
            };  
  
            if (Lampa.Lang) {  
                Object.keys(translations).forEach(function(lang) {  
                    Lampa.Lang.add(translations[lang]);  
                });  
            }  
        }  
  
        function createDiscoveryMain(parent) {  
            return function() {  
                var settings = loadSettings();  
                var activeCollections = collectionsConfig.filter(function(cfg) {  
                    return settings.collections[cfg.id];  
                });  
  
                activeCollections.forEach(function(cfg) {  
                    var translatedName = Lampa.Lang.translate(cfg.name_key);  
                    var fullName = cfg.emoji ? cfg.emoji + ' ' + translatedName : translatedName;  
  
                    parent.get(cfg.request, { page: 1 }, function(json) {  
                        if (json.results && json.results.length > 0) {  
                            parent.append({  
                                title: fullName,  
                                results: json.results,  
                                source: 'tmdb'  
                            });  
                        }  
                    }, function(error) {  
                        console.error('[TMDB_MOD] Помилка завантаження:', cfg.id, error);  
                    });  
                });  
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
                console isInitialized = true;  
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
  
    // ===== ПІДПЛАГІН: NEW_INTERFACE =====  
    // (Додайте тут код NEW_INTERFACE за аналогією)  
  
})();
