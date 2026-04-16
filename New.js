(function () {
    'use strict';

    if (window.plugin_tmdb_mod_pro_ready) return;
    window.plugin_tmdb_mod_pro_ready = true;

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
        { id: 'best_world_series', emoji: '🌍', name_key: 'tmdb_mod_c_world_hits', request: 'discover/tv?...' },
        { id: 'netflix_best', emoji: '⚫', name_key: 'tmdb_mod_c_netflix', request: 'discover/tv?with_networks=213...' },
        { id: 'miniseries_hits', emoji: '💎', name_key: 'tmdb_mod_c_miniseries', request: 'discover/tv?with_type=2...' }
    ];

    var pluginSettings = { enabled: true, collections: {} };
    collectionsConfig.forEach(c => pluginSettings.collections[c.id] = true);

    function loadSettings() {
        if (Lampa.Storage) {
            pluginSettings.enabled = Lampa.Storage.get('tmdb_mod_enabled', true);
            collectionsConfig.forEach(cfg => {
                pluginSettings.collections[cfg.id] = Lampa.Storage.get('tmdb_mod_collection_' + cfg.id, true);
            });
        }
        return pluginSettings;
    }

    function saveSettings() {
        if (Lampa.Storage) {
            Lampa.Storage.set('tmdb_mod_enabled', pluginSettings.enabled);
            collectionsConfig.forEach(cfg => {
                Lampa.Storage.set('tmdb_mod_collection_' + cfg.id, pluginSettings.collections[cfg.id]);
            });
        }
    }

    // ===== TRANSLATIONS =====
    function addTranslations() {
        if (!Lampa.Lang) return;

        Lampa.Lang.add({
            tmdb_mod_plugin_name: { ru: "TMDB PRO", uk: "TMDB PRO" },
            tmdb_mod_toggle_name: { ru: "Увімкнути TMDB PRO", uk: "Увімкнути TMDB PRO" },
            tmdb_mod_toggle_desc: { ru: "Показувати підбірки", uk: "Показувати підбірки" },

            tmdb_mod_c_hot_new: { ru: "Найсвіжіші прем'єри", uk: "Найсвіжіші прем'єри" },
            tmdb_mod_c_trend_movie: { ru: "Трендові фільми", uk: "Трендові фільми" },
            tmdb_mod_c_watching_now: { ru: "Зараз дивляться", uk: "Зараз дивляться" },
            tmdb_mod_c_cult: { ru: "Популярні з 80-х", uk: "Популярні з 80-х" },
            tmdb_mod_c_top_studios: { ru: "Топ студії", uk: "Топ студії" },
            tmdb_mod_c_best_current_y: { ru: "Кращі " + currentYear, uk: "Кращі " + currentYear },
            tmdb_mod_c_best_last_y: { ru: "Кращі " + lastYear, uk: "Кращі " + lastYear },
            tmdb_mod_c_animation: { ru: "Мультфільми", uk: "Мультфільми" },
            tmdb_mod_c_documentary: { ru: "Документалки", uk: "Документалки" },

            tmdb_mod_c_trend_tv: { ru: "Трендові серіали", uk: "Трендові серіали" },
            tmdb_mod_c_world_hits: { ru: "Світові хіти", uk: "Світові хіти" },
            tmdb_mod_c_netflix: { ru: "Netflix хіти", uk: "Netflix хіти" },
            tmdb_mod_c_miniseries: { ru: "Міні-серіали", uk: "Міні-серіали" }
        });
    }

    // ===== SETTINGS =====
    function addSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: 'tmdb_mod',
            name: Lampa.Lang.translate('tmdb_mod_plugin_name')
        });

        Lampa.SettingsApi.addParam({
            component: 'tmdb_mod',
            param: { name: 'tmdb_mod_enabled', type: 'trigger', default: true },
            field: { name: Lampa.Lang.translate('tmdb_mod_toggle_name') },
            onChange: function (value) {
                pluginSettings.enabled = value;
                saveSettings();
            }
        });
    }

    // ===== CORE =====
    function shuffle(arr) {
        return arr.sort(() => Math.random() - 0.5);
    }

    function removeDuplicates(globalMap, list) {
        return list.filter(item => {
            if (globalMap[item.id]) return false;
            globalMap[item.id] = true;
            return true;
        });
    }

    function createDiscoveryMain(parent) {
        return function (params, oncomplete, onerror) {

            var seen = {};
            var parts = [];

            collectionsConfig.forEach(cfg => {
                if (!pluginSettings.collections[cfg.id]) return;

                parts.push(function (call) {

                    var cached = getCache(cfg.id);
                    if (cached) return call(cached);

                    parent.get(cfg.request, params, function (json) {

                        json.results = removeDuplicates(seen, json.results);
                        json.results = shuffle(json.results);

                        json.title = (cfg.emoji ? cfg.emoji + ' ' : '') + Lampa.Lang.translate(cfg.name_key);

                        setCache(cfg.id, json);
                        call(json);

                    }, () => call({ results: [], title: cfg.id }));
                });
            });

            var method = Lampa.Api.sequentials || Lampa.Api.partNext;
            method(parts, parts.length, oncomplete, onerror);
        };
    }

    function init() {
        if (!Lampa.Api?.sources?.tmdb) return;

        var original = Lampa.Api.sources.tmdb;
        if (original._tmdb_mod_pro) return;
        original._tmdb_mod_pro = true;

        var tmdb_mod = Object.assign({}, original);
        Lampa.Api.sources.tmdb_mod = tmdb_mod;

        var originalMain = original.main;

        tmdb_mod.main = function () {
            if (pluginSettings.enabled && !this.type) {
                return createDiscoveryMain(tmdb_mod).apply(this, arguments);
            }
            return originalMain.apply(this, arguments);
        };

        addTranslations();
        addSettings();
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', e => e.type === 'ready' && init());

})();
