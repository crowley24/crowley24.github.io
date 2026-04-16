(function () {
    'use strict';

    if (window.plugin_new_main_pro_ready) return;
    window.plugin_new_main_pro_ready = true;

    var today = new Date().toISOString().slice(0, 10);
    var currentYear = new Date().getFullYear();
    var lastYear = currentYear - 1;

    var CACHE_TTL = 1000 * 60 * 10;
    var cacheStore = {};

    function getCache(key) {
        var item = cacheStore[key];
        if (!item || (Date.now() - item.time > CACHE_TTL)) return null;
        return item.data;
    }

    function setCache(key, data) {
        cacheStore[key] = { time: Date.now(), data: data };
    }

    // ===== СПИСОК КОЛЕКЦІЙ (Додано нові підбірки) =====
    var collectionsConfig = [
        { id: 'continue_line', emoji: '🕒', name_key: 'title_continue', request: 'local_continue' },
        { id: 'recommend_standard', emoji: '👍', name_key: 'new_main_c_recommend', request: 'movie/popular?page=' + (Math.floor(Math.random() * 5) + 1) },
        { id: 'trending_today', emoji: '📈', name_key: 'new_main_c_trend_today', request: 'trending/movie/day' },
        { id: 'popular_long_period', emoji: '🌟', name_key: 'new_main_c_popular_77', request: 'discover/movie?primary_release_date.gte=1977-01-01&sort_by=popularity.desc&vote_count.gte=500' },
        { id: 'top_rated_all', emoji: '🔝', name_key: 'new_main_c_top_rated', request: 'movie/top_rated' },
        { id: 'horror_standard', emoji: '🧛', name_key: 'new_main_c_horror_std', request: 'discover/movie?with_genres=27&sort_by=popularity.desc&vote_count.gte=100' },
        { id: 'hot_new_releases', name_key: 'new_main_c_hot_new', emoji: '🎬', request: 'discover/movie?sort_by=primary_release_date.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },
        { id: 'trending_movies', emoji: '🔥', name_key: 'new_main_c_trend_movie', request: 'trending/movie/week' },
        { id: 'fresh_online', emoji: '👀', name_key: 'new_main_c_watching_now', request: 'discover/movie?sort_by=popularity.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },
        { id: 'cult_cinema', emoji: '🍿', name_key: 'new_main_c_cult', request: 'discover/movie?primary_release_date.gte=1980-01-01&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },
        { id: 'top_10_studios_mix', emoji: '🏆', name_key: 'new_main_c_top_studios', request: 'discover/movie?with_companies=6194|33|4|306|5|12|8411|9195|2|7295&sort_by=popularity.desc&vote_average.gte=7.0&vote_count.gte=1000' },
        { id: 'cult_action_80_90', emoji: '🔫', name_key: 'new_main_c_action_80_90', request: 'discover/movie?with_genres=28&primary_release_date.gte=1980-01-01&primary_release_date.lte=1999-12-31&sort_by=popularity.desc&vote_average.gte=6.5&vote_count.gte=500' },        { id: 'horror_premium', emoji: '👻', name_key: 'new_main_c_horror_premium', request: 'discover/movie?with_genres=27&sort_by=vote_average.desc&vote_average.gte=6.2&vote_count.gte=300&with_runtime.gte=70' },
        { id: 'best_of_current_year_movies', emoji: '🌟', name_key: 'new_main_c_best_current_y', request: 'discover/movie?primary_release_year=' + currentYear + '&sort_by=vote_average.desc&vote_count.gte=300' },
        { id: 'documentary', emoji: '🔬', name_key: 'new_main_c_documentary', request: 'discover/movie?with_genres=99&sort_by=popularity.desc&vote_count.gte=20' },
        { id: 'animation', emoji: '🧑‍🎤', name_key: 'new_main_c_animation', request: 'discover/movie?with_genres=16&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },
        { id: 'netflix_best', emoji: '⚫', name_key: 'new_main_c_netflix', request: 'discover/tv?with_networks=213' },
        { id: 'top_series_all_time', emoji: '💎', name_key: 'new_main_c_top_series', request: 'discover/tv?sort_by=vote_average.desc&vote_count.gte=500&with_runtime.gte=20' }   
    ];

    var pluginSettings = { collections: {}, order: {} };

    function normalizeOrder(changedId, newOrder) {
        var list = [];
        collectionsConfig.forEach(function(c) {
            var ord = c.id === changedId ? newOrder : (pluginSettings.order[c.id] || 999);
            list.push({ id: c.id, order: ord });
        });
        list.sort(function(a, b) {
            if (a.order !== b.order) return a.order - b.order;
            return a.id === changedId ? -1 : 1;
        });
        list.forEach(function(item, index) {
            pluginSettings.order[item.id] = index + 1;
        });
        saveSettings();
    }

    function loadSettings() {
        if (Lampa.Storage) {
            collectionsConfig.forEach(function (cfg, index) {
                pluginSettings.collections[cfg.id] = Lampa.Storage.get('new_main_collection_' + cfg.id, true);
                pluginSettings.order[cfg.id] = Lampa.Storage.get('new_main_order_' + cfg.id, index + 1);
            });
        }
        collectionsConfig.sort(function (a, b) { return (pluginSettings.order[a.id] || 999) - (pluginSettings.order[b.id] || 999); });
    }

    function saveSettings() {
        if (Lampa.Storage) {
            collectionsConfig.forEach(function (cfg) {
                Lampa.Storage.set('new_main_collection_' + cfg.id, pluginSettings.collections[cfg.id]);
                Lampa.Storage.set('new_main_order_' + cfg.id, pluginSettings.order[cfg.id]);
            });
        }
    }

    function addTranslations() {
        if (!Lampa.Lang) return;
        Lampa.Lang.add({
            new_main_plugin_name: { uk: "Головна сторінка +" },
            new_main_c_recommend: { uk: "Рекомендуємо подивитись" },
            new_main_c_trend_today: { uk: "Сьогодні у тренді" },
            new_main_c_popular_77: { uk: "Популярні (з 1977)" },
            new_main_c_top_rated: { uk: "У топі (найкращі за весь час)" },
            new_main_c_horror_std: { uk: "Жахи (стандарт)" },
            new_main_c_hot_new: { uk: "Найсвіжіші прем'єри" },
            new_main_c_trend_movie: { uk: "Трендові фільми" },
            new_main_c_watching_now: { uk: "Зараз дивляться" },
            new_main_c_cult: { uk: "Популярні з 80-х" },
            new_main_c_top_studios: { uk: "Топ студії" },
            new_main_c_action_80_90: { uk: "Бойовики 80–90-х" },            
            new_main_c_horror_premium: { uk: "Жахи Premium" },
            new_main_c_best_current_y: { uk: "Кращі " + currentYear },
            new_main_c_animation: { uk: "Мультфільми" },
            new_main_c_documentary: { uk: "Документалки" },
            new_main_c_trend_tv: { uk: "Трендові серіали" },
            new_main_c_netflix: { uk: "Netflix хіти" },
            new_main_c_top_series: { uk: "Топ серіали за весь час" }
        });
    }

    function addSettings() {
        loadSettings();
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: 'new_main_settings',
            name: Lampa.Lang.translate('new_main_plugin_name'),
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>'
        });

        collectionsConfig.forEach(function (cfg) {
            var fullName = Lampa.Lang.translate(cfg.name_key) + (cfg.emoji ? ' ' + cfg.emoji : '');
            Lampa.SettingsApi.addParam({
                component: 'new_main_settings',
                param: { name: 'new_main_collection_' + cfg.id, type: 'trigger', default: true },
                field: { name: fullName },
                onChange: function (value) {
                    pluginSettings.collections[cfg.id] = value;
                    saveSettings();
                }
            });

            Lampa.SettingsApi.addParam({
                component: 'new_main_settings',
                param: {
                    name: 'new_main_order_' + cfg.id,
                    type: 'select',
                    values: (function () {
                        var obj = {};
                        for (var i = 1; i <= collectionsConfig.length; i++) { obj[i] = i; }
                        return obj;
                    })(),
                    default: pluginSettings.order[cfg.id]
                },
                field: { name: '<span style="opacity: 0.5; font-size: 0.8em; margin-left: 10px;">↳ Порядок</span>' },
                onChange: function (value) {
                    normalizeOrder(cfg.id, parseInt(value));
                    Lampa.Noty.show('Порядок оновлено. Перезавантажте сторінку.');
                }
            });
        });
    }

    function createDiscoveryMain(parent) {
        return function (params, oncomplete, onerror) {
            var seen = {};
            var parts = [];

            var sortedCollections = [].concat(collectionsConfig).sort(function(a, b) {
                return (pluginSettings.order[a.id] || 999) - (pluginSettings.order[b.id] || 999);
            });

            sortedCollections.forEach(function (cfg) {
                if (!pluginSettings.collections[cfg.id]) return;

                parts.push(function (call) {
                    if (cfg.request === 'local_continue') {
                        var continues = Lampa.Favorite ? Lampa.Favorite.continues('movie') : [];
                        if (continues.length > 0) {
                            return call({ results: continues, title: Lampa.Lang.translate(cfg.name_key) + ' ' + cfg.emoji });
                        }
                        return call({ results: [] });
                    }

                    var cached = getCache(cfg.id);
                    if (cached) return call(cached);

                    parent.get(cfg.request, params, function (json) {
                        if (json && json.results) {
                            json.results = json.results.filter(function(i) {
                                if (seen[i.id]) return false;
                                seen[i.id] = true;
                                return true;
                            });
                            // Випадкове сортування для "Рекомендуємо"
                            if (cfg.id === 'recommend_standard') {
                                json.results.sort(function() { return 0.5 - Math.random(); });
                            }
                            json.title = Lampa.Lang.translate(cfg.name_key) + ' ' + cfg.emoji;
                            setCache(cfg.id, json);
                        }
                        call(json || { results: [] });
                    }, function () { call({ results: [] }); });
                });
            });

            var method = Lampa.Api.sequentials || Lampa.Api.partNext;
            method(parts, parts.length, oncomplete, onerror);
        };
    }

    function init() {
        if (!Lampa.Api || !Lampa.Api.sources || !Lampa.Api.sources.tmdb) return;
        var original = Lampa.Api.sources.tmdb;
        if (original._new_main_pro_init) return;
        original._new_main_pro_init = true;

        Lampa.Api.sources.new_main = Object.assign({}, original);
        
        if (Lampa.Params && Lampa.Params.values && Lampa.Params.values.source) {
            if (!Lampa.Params.values.source.new_main) Lampa.Params.values.source.new_main = 'New_Main';
        }

        Lampa.Api.sources.new_main.main = function () {
            if (!this.type) return createDiscoveryMain(Lampa.Api.sources.new_main).apply(this, arguments);
            return original.main.apply(this, arguments);
        };

        addTranslations();
        addSettings();
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });

})();
