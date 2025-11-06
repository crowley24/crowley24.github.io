(function () {  
    'use strict';  
  
    // ---  
    // 📼 --- БЛОК ПОЛИФИЛОВ (для поддержки старых ТВ) ---  
    // ---  
  
    if (!Array.prototype.indexOf) {  
        Array.prototype.indexOf = function(searchElement, fromIndex) {  
            var k;  
            if (this == null) {  
                throw new TypeError('"this" is null or not defined');  
            }  
            var o = Object(this);  
            var len = o.length >>> 0;  
            if (len === 0) {  
                return -1;  
            }  
            k = fromIndex | 0;  
            if (k < 0) {  
                k += len;  
                if (k < 0) k = 0;  
            }  
            for (; k < len; k++) {  
                if (k in o && o[k] === searchElement) {  
                    return k;  
                }  
            }  
            return -1;  
        };  
    }  
      
    if (!Array.isArray) {  
        Array.isArray = function(arg) {  
            return Object.prototype.toString.call(arg) === '[object Array]';  
        };  
    }  
          
    if (!Array.prototype.filter) {  
        Array.prototype.filter = function(callback, thisArg) {  
            var array = this;  
            var result = [];  
            for (var i = 0; i < array.length; i++) {  
                if (callback.call(thisArg, array[i], i, array)) {  
                    result.push(array[i]);  
                }  
            }  
            return result;  
        };  
    }  
      
    if (!Object.assign) {  
        Object.assign = function(target) {  
            for (var i = 1; i < arguments.length; i++) {  
                var source = arguments[i];  
                for (var key in source) {  
                    if (Object.prototype.hasOwnProperty.call(source, key)) {  
                        target[key] = source[key];  
                    }  
                }  
            }  
            return target;  
        };  
    }  
      
    if (!Array.prototype.map) {  
        Array.prototype.map = function(callback, thisArg) {  
            var array = this;  
            var result = [];  
            for (var i = 0; i < array.length; i++) {  
                if (i in array) {  
                    result.push(callback.call(thisArg, array[i], i, array));  
                }  
            }  
            return result;  
        };  
    }  
  
    // ---  
    // 🌐 --- ЛОКАЛІЗАЦІЯ (тільки українська та англійська) ---  
    // ---  
      
    Lampa.Lang.add({  
        tmdb_mod_plugin_name: {  
            en: 'TMDB Collections',  
            uk: 'Добірки TMDB'  
        },  
        tmdb_mod_enable: {  
            en: 'Enable plugin',  
            uk: 'Увімкнути плагін'  
        },  
        tmdb_mod_trending_day: {  
            en: 'Trending Today',  
            uk: 'Сьогодні в тренді'  
        },  
        tmdb_mod_trending_week: {  
            en: 'Trending This Week',  
            uk: 'Тренди тижня'  
        },  
        tmdb_mod_popular_movies: {  
            en: 'Popular Movies',  
            uk: 'Популярні фільми'  
        },  
        tmdb_mod_popular_tv: {  
            en: 'Popular TV Shows',  
            uk: 'Популярні серіали'  
        },  
        tmdb_mod_top_rated_movies: {  
            en: 'Top Rated Movies',  
            uk: 'Найкращі фільми'  
        },  
        tmdb_mod_top_rated_tv: {  
            en: 'Top Rated TV Shows',  
            uk: 'Найкращі серіали'  
        },  
        tmdb_mod_upcoming: {  
            en: 'Upcoming Movies',  
            uk: 'Очікувані фільми'  
        },  
        tmdb_mod_now_playing: {  
            en: 'Now Playing',  
            uk: 'Зараз у кіно'  
        },  
        tmdb_mod_on_air: {  
            en: 'On Air Today',  
            uk: 'Сьогодні в ефірі'  
        },  
        tmdb_mod_airing_today: {  
            en: 'Airing Today',  
            uk: 'Виходить сьогодні'  
        },  
        tmdb_mod_netflix: {  
            en: 'Netflix Originals',  
            uk: 'Оригінали Netflix'  
        },  
        tmdb_mod_disney: {  
            en: 'Disney+ Originals',  
            uk: 'Оригінали Disney+'  
        },  
        tmdb_mod_apple: {  
            en: 'Apple TV+ Originals',  
            uk: 'Оригінали Apple TV+'  
        },  
        tmdb_mod_hbo: {  
            en: 'HBO Max Originals',  
            uk: 'Оригінали HBO Max'  
        },  
        tmdb_mod_amazon: {  
            en: 'Amazon Prime Originals',  
            uk: 'Оригінали Amazon Prime'  
        },  
        tmdb_mod_ukrainian_movies: {  
            en: 'Ukrainian Movies',  
            uk: 'Українські фільми'  
        },  
        tmdb_mod_ukrainian_tv: {  
            en: 'Ukrainian TV Shows',  
            uk: 'Українські серіали'  
        }  
    });  
  
    // ---  
    // 📋 --- КОНФІГУРАЦІЯ ПІДБОРОК (без російських) ---  
    // ---  
      
    var collectionsConfig = [  
        {  
            id: 'trending_day',  
            endpoint: '/trending/all/day',  
            name_key: 'tmdb_mod_trending_day',  
            emoji: '🔥',  
            defaultOrder: 1  
        },  
        {  
            id: 'trending_week',  
            endpoint: '/trending/all/week',  
            name_key: 'tmdb_mod_trending_week',  
            emoji: '📈',  
            defaultOrder: 2  
        },  
        {  
            id: 'popular_movies',  
            endpoint: '/movie/popular',  
            name_key: 'tmdb_mod_popular_movies',  
            emoji: '🎬',  
            defaultOrder: 3  
        },  
        {  
            id: 'popular_tv',  
            endpoint: '/tv/popular',  
            name_key: 'tmdb_mod_popular_tv',  
            emoji: '📺',  
            defaultOrder: 4  
        },  
        {  
            id: 'top_rated_movies',  
            endpoint: '/movie/top_rated',  
            name_key: 'tmdb_mod_top_rated_movies',  
            emoji: '⭐',  
            defaultOrder: 5  
        },  
        {  
            id: 'top_rated_tv',  
            endpoint: '/tv/top_rated',  
            name_key: 'tmdb_mod_top_rated_tv',  
            emoji: '🏆',  
            defaultOrder: 6  
        },  
        {  
            id: 'upcoming',  
            endpoint: '/movie/upcoming',  
            name_key: 'tmdb_mod_upcoming',  
            emoji: '🎞️',  
            defaultOrder: 7  
        },  
        {  
            id: 'now_playing',  
            endpoint: '/movie/now_playing',  
            name_key: 'tmdb_mod_now_playing',  
            emoji: '🎥',  
            defaultOrder: 8  
        },  
        {  
            id: 'on_air',  
            endpoint: '/tv/on_the_air',  
            name_key: 'tmdb_mod_on_air',  
            emoji: '📡',  
            defaultOrder: 9  
        },  
        {  
            id: 'airing_today',  
            endpoint: '/tv/airing_today',  
            name_key: 'tmdb_mod_airing_today',  
            emoji: '📅',  
            defaultOrder: 10  
        },  
        {  
            id: 'netflix',  
            endpoint: '/discover/tv?with_networks=213&sort_by=popularity.desc',  
            name_key: 'tmdb_mod_netflix',  
            emoji: '🎬',  
            defaultOrder: 11  
        },  
        {  
            id: 'disney',  
            endpoint: '/discover/tv?with_networks=2739&sort_by=popularity.desc',  
            name_key: 'tmdb_mod_disney',  
            emoji: '🏰',  
            defaultOrder: 12  
        },  
        {  
            id: 'apple',  
            endpoint: '/discover/tv?with_networks=2552&sort_by=popularity.desc',  
            name_key: 'tmdb_mod_apple',  
            emoji: '🍎',  
            defaultOrder: 13  
        },  
        {  
            id: 'hbo',  
            endpoint: '/discover/tv?with_networks=3186&sort_by=popularity.desc',  
            name_key: 'tmdb_mod_hbo',  
            emoji: '🎭',  
            defaultOrder: 14  
        },  
        {  
            id: 'amazon',  
            endpoint: '/discover/tv?with_networks=1024&sort_by=popularity.desc',  
            name_key: 'tmdb_mod_amazon',  
            emoji: '📦',  
            defaultOrder: 15  
        },  
        {  
            id: 'ukrainian_movies',  
            endpoint: '/discover/movie?with_original_language=uk&sort_by=popularity.desc',  
            name_key: 'tmdb_mod_ukrainian_movies',  
            emoji: '🇺🇦',  
            defaultOrder: 16  
        },  
        {  
            id: 'ukrainian_tv',  
            endpoint: '/discover/tv?with_original_language=uk&sort_by=popularity.desc',  
            name_key: 'tmdb_mod_ukrainian_tv',  
            emoji: '🇺🇦',  
            defaultOrder: 17  
        }  
    ];  
  
    // ---  
    // 🔧 --- ФУНКЦІЇ ПЛАГІНА ---  
    // ---  
  
    function loadSettings() {  
        // Завантажуємо налаштування з Lampa.Storage  
        return {  
            enabled: Lampa.Storage.get('tmdb_mod_enable', true)  
        };  
    }  
  
    function createDiscoveryMain() {  
        return function (params, oncomplete, onerror) {  
            var settings = loadSettings();  
            if (!settings.enabled) {  
                if (onerror) onerror();  
                return function () {};  
            }  
  
            var parts_data = [];  
            var totalCount = 0;  
  
            collectionsConfig.forEach(function(cfg) {  
                var isEnabled = Lampa.Storage.get('tmdb_mod_' + cfg.id + '_enable', true);  
                if (!isEnabled) return;  
  
                totalCount++;  
                  
                parts_data.push(function(call) {  
                    Lampa.TMDB.get(cfg.endpoint, {  
                        language: 'uk-UA'  
                    }, function(data) {  
                        var translatedName = Lampa.Lang.translate(cfg.name_key);  
                        var title = cfg.emoji ? cfg.emoji + ' ' + translatedName : translatedName;  
                          
                        call({   
                            source: 'tmdb',   
                            results: data.results || [],   
                            title: title   
                        });  
                    }, function(err) {  
                        console.error('Помилка завантаження підборки "' + cfg.id + '":', err);  
                        var translatedName = Lampa.Lang.translate(cfg.name_key);  
                        var title = cfg.emoji ? cfg.emoji + ' ' + translatedName : translatedName;  
                        call({ source: 'tmdb', results: [], title: title });  
                    });   
                });  
            });  
              
            if (parts_data.length === 0) {  
                if (onerror) onerror();  
                return function () {};  
            }  
  
            var methodToUse = Lampa.Api.sequentials ? Lampa.Api.sequentials : Lampa.Api.partNext;  
            methodToUse(parts_data, totalCount, oncomplete, onerror);   
            return function () {};  
        };  
    }  
  
    function addSettings() {  
        loadSettings();   
  
        if (!Lampa.SettingsApi) return;  
          
        Lampa.SettingsApi.addComponent({  
            component: 'tmdb_mod',  
            name: Lampa.Lang.translate('tmdb_mod_plugin_name'),  
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-tv"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>'  
        });  
  
        // Головний перемикач  
        Lampa.SettingsApi.addParam({  
            component: 'tmdb_mod',  
            param: {  
                name: 'tmdb_mod_enable',  
                type: 'trigger',  
                default: true  
            },  
            onRender: function(item) {  
                item.on('change', function(e, value) {  
                    Lampa.Storage.set('tmdb_mod_enable', value);  
                });  
            }  
        });  
  
        // Налаштування для кожної підборки  
        collectionsConfig.forEach(function(cat) {  
            Lampa.SettingsApi.addParam({  
                component: 'tmdb_mod',  
                param: {  
                    name: cat.id + '_enable',  
                    type: 'trigger',  
                    default: true  
                },  
                onRender: function(item) {  
                    var translatedName = Lampa.Lang.translate(cat.name_key);  
                    var displayName = cat.emoji ? cat.emoji + ' ' + translatedName : translatedName;  
                    item.find('.settings-param__name').text(displayName);  
                      
                    item.on('change', function(e, value) {  
                        Lampa.Storage.set('tmdb_mod_' + cat.id + '_enable', value);  
                    });  
                }  
            });  
  
            Lampa.SettingsApi.addParam({  
                component: 'tmdb_mod',  
                param: {  
                    name: cat.id + '_order',  
                    type: 'input',  
                    default: cat.defaultOrder.toString()  
                },  
                onRender: function(item) {  
                    item.find('.settings-param__name').text('Порядок: ' + Lampa.Lang.translate(cat.name_key));  
                      
                    item.on('change', function(e, value) {  
                        Lampa.Storage.set('tmdb_mod_' + cat.id + '_order', parseInt(value) || cat.defaultOrder);  
                    });  
                }  
            });  
        });  
    }  
  
    function registerSource() {  
        if (!Lampa.Source) {  
            console.error('[TMDB_MOD] Lampa.Source недоступний');  
            return;  
function registerSource() {  
        if (!Lampa.Source) {  
            console.error('[TMDB_MOD] Lampa.Source недоступний');  
            return;  
        }  
  
        Lampa.Source.add({  
            source: 'tmdb_mod',  
            name: 'TMDB Collections',  
            main: createDiscoveryMain,  
            menu: false  
        });  
  
        console.log('[TMDB_MOD] Джерело зареєстровано');  
    }  
  
    // Ініціалізація плагіна  
    function init() {  
        addSettings();  
        registerSource();  
        console.log('[TMDB_MOD] Плагін успішно ініціалізовано');  
    }  
  
    // Чекаємо завантаження Lampa  
    if (window.Lampa) {  
        init();  
    } else {  
        document.addEventListener('DOMContentLoaded', function() {  
            if (window.Lampa) init();  
        });  
    }  
  
})(); // Закриває головну IIFE
