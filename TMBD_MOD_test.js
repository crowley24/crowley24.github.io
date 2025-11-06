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
  
    // Локалізація (тільки українська та англійська)  
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
            en: 'On Air',  
            uk: 'В ефірі'  
        },  
        tmdb_mod_airing_today: {  
            en: 'Airing Today',  
            uk: 'Сьогодні в ефірі'  
        }  
    });  
  
    // Конфігурація підборок (без російських)  
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
            emoji: '🌟',  
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
        }  
    ];  
  
    // Функція для створення Discovery Main  
    function createDiscoveryMain(params) {  
        return function(oncomplete, onerror) {  
            var parts_data = [];  
            var totalCount = 0;  
  
            collectionsConfig.forEach(function(cfg) {  
                if (!Lampa.Storage.get('tmdb_mod_' + cfg.id + '_enable', true)) {  
                    return;  
                }  
  
                totalCount++;  
                parts_data.push(function(call) {  
                    Lampa.TMDB.get(cfg.endpoint, {}, function(data) {  
                        var translatedName = Lampa.Lang.translate(cfg.name_key);  
                        var title = cfg.emoji ? cfg.emoji + ' ' + translatedName : translatedName;  
                        call({ source: 'tmdb', results: data.results || [], title: title });  
                    }, function() {  
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
      
    // Додавання налаштувань  
    function addSettings() {  
        if (!Lampa.SettingsApi) return;  
          
        Lampa.SettingsApi.addComponent({  
            component: 'tmdb_mod',  
            name: Lampa.Lang.translate('tmdb_mod_plugin_name'),  
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-tv"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>'  
        });  
  
        // Головний переключатель  
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
  
    // Реєстрація джерела (БЕЗ ДУБЛІКАТУ)  
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
