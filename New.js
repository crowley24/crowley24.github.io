(function () {
    'use strict';

    if (window.plugin_tmdb_mod_pro_ready) return;
    window.plugin_tmdb_mod_pro_ready = true;

    var today = new Date().toISOString().slice(0, 10);
    var currentYear = new Date().getFullYear();
    var lastYear = currentYear - 1;

    // ===== CACHE =====
    var CACHE_TTL = 1000 * 60 * 10; // 10 хв
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
        cacheStore[key] = {
            time: Date.now(),
            data: data
        };
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
        { id: 'best_world_series', emoji: '🌍', name_key: 'tmdb_mod_c_world_hits', request: 'discover/tv?with_origin_country=US|CA|GB|AU|IE|DE|FR|NL|SE|NO|DK|FI|ES|IT|BE|CH|AT|KR|JP|MX|BR&sort_by=last_air_date.desc&vote_average.gte=7&vote_count.gte=500&first_air_date.gte=2020-01-01&first_air_date.lte=' + today + '&without_genres=16|99|10762|10763|10764|10766|10767|10768|10770&with_status=0|1|2|3' },
        { id: 'netflix_best', emoji: '⚫', name_key: 'tmdb_mod_c_netflix', request: 'discover/tv?with_networks=213&sort_by=last_air_date.desc&first_air_date.gte=2020-01-01&last_air_date.lte=' + today + '&vote_count.gte=500&vote_average.gte=7' },
        { id: 'miniseries_hits', emoji: '💎', name_key: 'tmdb_mod_c_miniseries', request: 'discover/tv?with_type=2&sort_by=popularity.desc&vote_average.gte=7.0&vote_count.gte=200' }
    ];

    var pluginSettings = {
        enabled: true,
        collections: {}
    };

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

    // ===== HELPERS =====

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

    // ===== CORE =====

    function createDiscoveryMain(parent) {
        return function (params, oncomplete, onerror) {

            var settings = loadSettings();
            var seenGlobal = {};
            var parts = [];

            collectionsConfig.forEach(cfg => {
                if (!settings.collections[cfg.id]) return;

                parts.push(function (call) {

                    var cacheKey = cfg.id;
                    var cached = getCache(cacheKey);

                    if (cached) {
                        call(cached);
                        return;
                    }

                    parent.get(cfg.request, params, function (json) {

                        // анти-дублі (глобально)
                        json.results = removeDuplicates(seenGlobal, json.results);

                        // легка рандомізація
                        json.results = shuffle(json.results);

                        var title = (cfg.emoji ? cfg.emoji + ' ' : '') + Lampa.Lang.translate(cfg.name_key);
                        json.title = title;

                        if (Lampa.Utils && Lampa.Utils.addSource) {
                            Lampa.Utils.addSource(json, 'tmdb');
                        }

                        setCache(cacheKey, json);

                        call(json);

                    }, function () {
                        call({ results: [], title: cfg.name_key });
                    });
                });
            });

            if (!parts.length) {
                if (onerror) onerror();
                return;
            }

            var method = Lampa.Api.sequentials || Lampa.Api.partNext;
            method(parts, parts.length, oncomplete, onerror);
        };
    }

    function initPlugin() {
        if (!Lampa.Api || !Lampa.Api.sources || !Lampa.Api.sources.tmdb) return;

        var original = Lampa.Api.sources.tmdb;

        if (original._tmdb_mod_pro) return;
        original._tmdb_mod_pro = true;

        var tmdb_mod = Object.assign({}, original);
        Lampa.Api.sources.tmdb_mod = tmdb_mod;

        var originalMain = original.main;

        tmdb_mod.main = function () {
            if (loadSettings().enabled && !this.type) {
                return createDiscoveryMain(tmdb_mod).apply(this, arguments);
            }
            return originalMain.apply(this, arguments);
        };

        if (Lampa.Params && Lampa.Params.select) {
            var sources = Lampa.Params.values.source || {};
            sources.tmdb_mod = 'TMDB PRO';
            Lampa.Params.select('source', sources, 'tmdb');
        }
    }

    function start() {
        if (window.appready) {
            initPlugin();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') initPlugin();
            });
        }
    }

    start();

})();
