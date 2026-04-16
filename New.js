(function () {
    'use strict';

    if (window.plugin_new_main_pro_ready) return;
    window.plugin_new_main_pro_ready = true;

    var today = new Date().toISOString().slice(0, 10);
    var currentYear = new Date().getFullYear();
    var lastYear = currentYear - 1;

    // ===== CACHE =====
    var CACHE_TTL = 1000 * 60 * 10;
    var cacheStore = {};

    function getCache(key) {
        var item = cacheStore[key];
        if (!item) return null;
        if (Date.now() - item.time > CACHE_TTL) {
            delete cacheStore[key];
            return null;
        }
        return item.data;
    }

    function setCache(key, data) {
        cacheStore[key] = { time: Date.now(), data: data };
    }

    // ===== CONFIG =====
    var collectionsConfig = [
        { id: 'history_line', emoji: '🕒', name_key: 'new_main_c_history', request: 'local_history' },
        { id: 'hot_new_releases', name_key: 'new_main_c_hot_new', emoji: '🎬', request: 'discover/movie?sort_by=primary_release_date.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },
        { id: 'trending_movies', emoji: '🔥', name_key: 'new_main_c_trend_movie', request: 'trending/movie/week' },
        { id: 'fresh_online', emoji: '👀', name_key: 'new_main_c_watching_now', request: 'discover/movie?sort_by=popularity.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },
        { id: 'cult_cinema', emoji: '🍿', name_key: 'new_main_c_cult', request: 'discover/movie?primary_release_date.gte=1980-01-01&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },
        { id: 'top_10_studios_mix', emoji: '🏆', name_key: 'new_main_c_top_studios', request: 'discover/movie?with_companies=6194|33|4|306|5|12|8411|9195|2|7295&sort_by=popularity.desc&vote_average.gte=7.0&vote_count.gte=1000' },
        { id: 'cult_80_90_premium', emoji: '📼', name_key: 'new_main_c_cult_80_90', request: 'discover/movie?primary_release_date.gte=1980-01-01&primary_release_date.lte=1999-12-31&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=1000' },
        { id: 'horror_premium', emoji: '👻', name_key: 'new_main_c_horror_premium', request: 'discover/movie?with_genres=27&sort_by=vote_average.desc&vote_average.gte=6.2&vote_count.gte=300&with_runtime.gte=70' },
        { id: 'best_of_current_year_movies', emoji: '🌟', name_key: 'new_main_c_best_current_y', request: 'discover/movie?primary_release_year=' + currentYear + '&sort_by=vote_average.desc&vote_count.gte=300' },
        { id: 'best_of_last_year_movies', emoji: '🏆', name_key: 'new_main_c_best_last_y', request: 'discover/movie?primary_release_year=' + lastYear + '&sort_by=vote_average.desc&vote_count.gte=500' },
        { id: 'documentary', emoji: '🔬', name_key: 'new_main_c_documentary', request: 'discover/movie?with_genres=99&sort_by=popularity.desc&vote_count.gte=20' },
        { id: 'animation', emoji: '🧑‍🎤', name_key: 'new_main_c_animation', request: 'discover/movie?with_genres=16&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },
        { id: 'netflix_best', emoji: '⚫', name_key: 'new_main_c_netflix', request: 'discover/tv?with_networks=213' },
        { id: 'miniseries_hits', emoji: '💎', name_key: 'new_main_c_miniseries', request: 'discover/tv?with_type=2' }
    ];

    var pluginSettings = { collections: {}, order: {} };

    collectionsConfig.forEach(function (c, index) {
        pluginSettings.collections[c.id] = true;
        pluginSettings.order[c.id] = index + 1;
    });

    function applyOrder() {
        collectionsConfig.sort(function (a, b) {
            return (pluginSettings.order[a.id] || 999) - (pluginSettings.order[b.id] || 999);
        });
    }

    function loadSettings() {
        if (Lampa.Storage) {
            collectionsConfig.forEach(function (cfg, index) {
                pluginSettings.collections[cfg.id] = Lampa.Storage.get('new_main_collection_' + cfg.id, true);
                pluginSettings.order[cfg.id] = Lampa.Storage.get('new_main_order_' + cfg.id, index + 1);
            });
        }
        applyOrder();
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
            new_main_c_history: { uk: "Ви нещодавно дивились" },
            new_main_c_hot_new: { uk: "Найсвіжіші прем'єри" },
            new_main_c_trend_movie: { uk: "Трендові фільми" },
            new_main_c_watching_now: { uk: "Зараз дивляться" },
            new_main_c_cult: { uk: "Популярні з 80-х" },
            new_main_c_top_studios: { uk: "Топ студії" },
            new_main_c_cult_80_90: { uk: "Хіти 80–90 (культові)" },
            new_main_c_horror_premium: { uk: "Жахи Premium" },
            new_main_c_best_current_y: { uk: "Кращі " + currentYear },
            new_main_c_best_last_y: { uk: "Кращі " + lastYear },
            new_main_c_animation: { uk: "Мультфільми" },
            new_main_c_documentary: { uk: "Документалки" },
            new_main_c_netflix: { uk: "Netflix хіти" },
            new_main_c_miniseries: { uk: "Міні-серіали" }
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

        collectionsConfig.forEach(function (cfg, index) {
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
        });
    }

    function createDiscoveryMain(parent) {
        return function (params, oncomplete, onerror) {
            var seen = {};
            var parts = [];

            collectionsConfig.forEach(function (cfg) {
                if (!pluginSettings.collections[cfg.id]) return;

                parts.push(function (call) {
                    // --- ІСТОРІЯ (Виправлено) ---
                    if (cfg.request === 'local_history') {
                        // Отримуємо історію через внутрішній метод Lampa
                        var list = Lampa.History ? Lampa.History.get() : [];
                        if (list.length > 0) {
                            var cards = list.map(function(item) {
                                return item.card || item; // Деякі версії повертають об'єкт прямо
                            }).filter(function(c) { return c && (c.title || c.name); });

                            return call({
                                results: cards.slice(0, 20),
                                title: Lampa.Lang.translate(cfg.name_key) + (cfg.emoji ? ' ' + cfg.emoji : '')
                            });
                        } else {
                            // Якщо історія пуста, просто не виводимо цей рядок
                            return call({ results: [] });
                        }
                    }

                    // --- TMDB ---
                    var cached = getCache(cfg.id);
                    if (cached) return call(cached);

                    parent.get(cfg.request, params, function (json) {
                        if (json && json.results) {
                            var res = json.results.filter(function(i) {
                                if (seen[i.id]) return false;
                                seen[i.id] = true;
                                return true;
                            }).sort(function() { return 0.5 - Math.random(); });

                            json.results = res;
                            json.title = Lampa.Lang.translate(cfg.name_key) + (cfg.emoji ? ' ' + cfg.emoji : '');
                            setCache(cfg.id, json);
                        }
                        call(json || { results: [] });
                    }, function () {
                        call({ results: [] });
                    });
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

        var new_main_source = Object.assign({}, original);
        Lampa.Api.sources.new_main = new_main_source;

        if (Lampa.Params && Lampa.Params.values && Lampa.Params.values.source) {
            if (!Lampa.Params.values.source.new_main) {
                Lampa.Params.values.source.new_main = 'New_Main';
            }
        }

        new_main_source.main = function () {
            if (!this.type) return createDiscoveryMain(new_main_source).apply(this, arguments);
            return original.main.apply(this, arguments);
        };

        addTranslations();
        addSettings();
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });

})();
