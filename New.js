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
        { id: 'hot_new_releases', emoji: '🎬', name_key: 'new_main_c_hot_new', request: 'discover/movie?sort_by=primary_release_date.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },
        { id: 'trending_movies', emoji: '🔥', name_key: 'new_main_c_trend_movie', request: 'trending/movie/week' },
        { id: 'fresh_online', emoji: '👀', name_key: 'new_main_c_watching_now', request: 'discover/movie?sort_by=popularity.desc&with_release_type=4|5|6&primary_release_date.lte=' + today + '&vote_count.gte=50&vote_average.gte=6&with_runtime.gte=40&without_genres=99' },
        { id: 'cult_cinema', emoji: '🍿', name_key: 'new_main_c_cult', request: 'discover/movie?primary_release_date.gte=1980-01-01&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },
        { id: 'top_10_studios_mix', emoji: '🏆', name_key: 'new_main_c_top_studios', request: 'discover/movie?with_companies=6194|33|4|306|5|12|8411|9195|2|7295&sort_by=popularity.desc&vote_average.gte=7.0&vote_count.gte=1000' },
        { id: 'best_of_current_year_movies', emoji: '🌟', name_key: 'new_main_c_best_current_y', request: 'discover/movie?primary_release_year=' + currentYear + '&sort_by=vote_average.desc&vote_count.gte=300' },
        { id: 'best_of_last_year_movies', emoji: '🏆', name_key: 'new_main_c_best_last_y', request: 'discover/movie?primary_release_year=' + lastYear + '&sort_by=vote_average.desc&vote_count.gte=500' },
        { id: 'animation', emoji: '🧑‍🎤', name_key: 'new_main_c_animation', request: 'discover/movie?with_genres=16&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=500' },
        { id: 'documentary', emoji: '🔬', name_key: 'new_main_c_documentary', request: 'discover/movie?with_genres=99&sort_by=popularity.desc&vote_count.gte=20' },

        { id: 'trending_tv', emoji: '🔥', name_key: 'new_main_c_trend_tv', request: 'trending/tv/week' },
        { id: 'best_world_series', emoji: '🌍', name_key: 'new_main_c_world_hits', request: 'discover/tv?with_origin_country=US|CA|GB|AU|IE|DE|FR|NL|SE|NO|DK|FI|ES|IT|BE|CH|AT|KR|JP|MX|BR&sort_by=last_air_date.desc&vote_average.gte=7&vote_count.gte=500&first_air_date.gte=2020-01-01&first_air_date.lte=' + today },
        { id: 'netflix_best', emoji: '⚫', name_key: 'new_main_c_netflix', request: 'discover/tv?with_networks=213' },
        { id: 'miniseries_hits', emoji: '💎', name_key: 'new_main_c_miniseries', request: 'discover/tv?with_type=2' }
    ];

    var pluginSettings = {
        collections: {},
        order: {}
    };

    collectionsConfig.forEach(function (c, index) {
        pluginSettings.collections[c.id] = true;
        pluginSettings.order[c.id] = index + 1;
    });

    // ===== ORDER LOGIC =====
    function normalizeOrder(changedId, newPosition) {
        var items = collectionsConfig.map(function (c) {
            return { id: c.id, pos: pluginSettings.order[c.id] || 999 };
        });
        items = items.filter(function (i) { return i.id !== changedId; });
        items.sort(function (a, b) { return a.pos - b.pos; });
        items.splice(newPosition - 1, 0, { id: changedId, pos: newPosition });
        items.forEach(function (item, index) {
            pluginSettings.order[item.id] = index + 1;
        });
    }

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
            new_main_plugin_name: { ru: "Головна сторінка +", uk: "Головна сторінка +" },
            new_main_c_hot_new: { ru: "Найсвіжіші прем'єри", uk: "Найсвіжіші прем'єри" },
            new_main_c_trend_movie: { ru: "Трендові фільми", uk: "Трендові фільми" },
            new_main_c_watching_now: { ru: "Зараз дивляться", uk: "Зараз дивляться" },
            new_main_c_cult: { ru: "Популярні з 80-х", uk: "Популярні з 80-х" },
            new_main_c_top_studios: { ru: "Топ студії", uk: "Топ студії" },
            new_main_c_best_current_y: { ru: "Кращі " + currentYear, uk: "Кращі " + currentYear },
            new_main_c_best_last_y: { ru: "Кращі " + lastYear, uk: "Кращі " + lastYear },
            new_main_c_animation: { ru: "Мультфільми", uk: "Мультфільми" },
            new_main_c_documentary: { ru: "Документалки", uk: "Документалки" },
            new_main_c_trend_tv: { ru: "Трендові серіали", uk: "Трендові серіали" },
            new_main_c_world_hits: { ru: "Світові хіти", uk: "Світові хіти" },
            new_main_c_netflix: { ru: "Netflix хіти", uk: "Netflix хіти" },
            new_main_c_miniseries: { ru: "Міні-серіали", uk: "Міні-серіали" }
        });
    }

    function addSettings() {
        loadSettings();
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: 'new_main_settings',
            name: Lampa.Lang.translate('new_main_plugin_name'),
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>'
        });

        collectionsConfig.forEach(function (cfg, index) {
            var name = Lampa.Lang.translate(cfg.name_key);
            var fullName = (cfg.emoji ? cfg.emoji + ' ' : '') + name;

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
                    default: index + 1
                },
                field: { 
                    name: '<span style="opacity: 0.5; font-size: 0.8em; margin-left: 10px;">↳ Порядок виводу</span>' 
                },
                onChange: function (value) {
                    normalizeOrder(cfg.id, parseInt(value));
                    saveSettings();
                    applyOrder();
                    if (Lampa.Settings && Lampa.Settings.update) Lampa.Settings.update();
                    Lampa.Noty.show('Порядок оновлено ✔');
                }
            });
        });
    }

    function shuffle(arr) {
        return arr.sort(function () { return Math.random() - 0.5; });
    }

    function removeDuplicates(map, list) {
        return list.filter(function (item) {
            if (map[item.id]) return false;
            map[item.id] = true;
            return true;
        });
    }

    function createDiscoveryMain(parent) {
        return function (params, oncomplete, onerror) {
            var seen = {};
            var parts = [];

            collectionsConfig.forEach(function (cfg) {
                if (!pluginSettings.collections[cfg.id]) return;

                parts.push(function (call) {
                    var cached = getCache(cfg.id);
                    if (cached) return call(cached);

                    parent.get(cfg.request, params, function (json) {
                        if (json && json.results) {
                            json.results = removeDuplicates(seen, json.results);
                            json.results = shuffle(json.results);
                            json.title = (cfg.emoji ? cfg.emoji + ' ' : '') + Lampa.Lang.translate(cfg.name_key);
                            setCache(cfg.id, json);
                        }
                        call(json || { results: [] });
                    }, function () {
                        call({ results: [], title: cfg.id });
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
        
        // Реєструємо під цим ім'ям для відображення "New_main"
        Lampa.Api.sources.new_main = new_main_source;

        var originalMain = original.main;
        new_main_source.main = function () {
            if (!this.type) {
                return createDiscoveryMain(new_main_source).apply(this, arguments);
            }
            return originalMain.apply(this, arguments);
        };

        addTranslations();
        addSettings();
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });

})();
