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
        wideCards: true,
        collections: collectionsConfig.reduce(function (acc, c) {
            acc[c.id] = true;
            return acc;
        }, {})
    };

    function loadSettings() {
        if (Lampa.Storage) {
            pluginSettings.wideCards = Lampa.Storage.get('tmdb_mod_wide_cards', true);
            collectionsConfig.forEach(function (cfg) {
                pluginSettings.collections[cfg.id] = Lampa.Storage.get('tmdb_mod_collection_' + cfg.id, true);
            });
        }
        return pluginSettings;
    }

    function saveSettings() {
        if (Lampa.Storage) {
            Lampa.Storage.set('tmdb_mod_wide_cards', pluginSettings.wideCards);
            collectionsConfig.forEach(function (cfg) {
                Lampa.Storage.set('tmdb_mod_collection_' + cfg.id, pluginSettings.collections[cfg.id]);
            });
        }
    }

    function getColor(rating, alpha) {
        var rgb = '';
        if (rating >= 0 && rating <= 3) rgb = '231, 76, 60';
        else if (rating <= 5) rgb = '230, 126, 34';
        else if (rating <= 6.5) rgb = '241, 196, 15';
        else if (rating < 8) rgb = '52, 152, 219';
        else rgb = '46, 204, 113';
        return rgb ? 'rgba(' + rgb + ', ' + alpha + ')' : null;
    }

    function fetchLogo(movie, itemElement) {
        var mType = movie.media_type || (movie.name ? 'tv' : 'movie');
        var langPref = Lampa.Storage.get('ym_logo_lang', 'uk_en');
        var quality = Lampa.Storage.get('ym_img_quality', 'w300');

        function applyTextLogo() {
            var textLogo = document.createElement('div');
            textLogo.className = 'card-custom-logo-text';
            textLogo.innerText = movie.title || movie.name;
            itemElement.find('.card__view').append(textLogo);
        }

        var apiKey = Lampa.TMDB && Lampa.TMDB.key && Lampa.TMDB.key();
        if (!apiKey) return applyTextLogo();

        let endpoint = 'https://api.themoviedb.org/3/' + mType + '/' + movie.id + '/images?include_image_language=uk,en,null&api_key=' + apiKey;

        fetch('https://cors.lampa.stream/' + endpoint)
            .then(r => r.json())
            .then(function (res) {
                if (!res.logos || !res.logos.length) return applyTextLogo();

                var found = res.logos.find(l => l.iso_639_1 === 'uk') ||
                    res.logos.find(l => l.iso_639_1 === 'en');

                if (!found) return applyTextLogo();

                var img = new Image();
                img.className = 'card-custom-logo';
                img.src = 'https://image.tmdb.org/t/p/' + quality + found.file_path;
                itemElement.find('.card__view').append(img);
            })
            .catch(applyTextLogo);
    }

    function makeWideCardItem(movie) {
        return {
            title: movie.title || movie.name,
            params: {
                createInstance: function () {
                    return Lampa.Maker.make('Card', movie, function (module) {
                        return module.only('Card', 'Callback');
                    });
                },
                emit: {
                    onCreate: function () {
                        var item = $(this.html);
                        item.addClass('card--wide-custom');

                        var view = item.find('.card__view');
                        view.empty();

                        var quality = Lampa.Storage.get('ym_img_quality', 'w300');

                        if (movie.backdrop_path) {
                            view.css({
                                backgroundImage: 'url(https://image.tmdb.org/t/p/' + quality + movie.backdrop_path + ')',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            });
                        } else {
                            view.css('background', '#222');
                        }

                        var vote = parseFloat(movie.vote_average);
                        if (!isNaN(vote) && vote > 0) {
                            var el = document.createElement('div');
                            el.className = 'card__vote';
                            el.innerText = vote.toFixed(1);
                            el.style.backgroundColor = getColor(vote, 0.8);
                            view.append(el);
                        }

                        fetchLogo(movie, item);
                    },
                    onlyEnter: function () {
                        var type = movie.media_type || (movie.name ? 'tv' : 'movie');
                        Lampa.Activity.push({
                            component: 'full',
                            id: movie.id,
                            method: type,
                            card: movie,
                            source: 'tmdb'
                        });
                    }
                }
            }
        };
    }

    function createDiscoveryMain(api) {
        return function (params, oncomplete) {
            var settings = loadSettings();
            var parts = [];

            collectionsConfig.forEach(function (cfg) {
                if (!settings.collections[cfg.id]) return;

                parts.push(function (call) {
                    api.get(cfg.request, params, function (json) {
                        json.title = cfg.emoji + ' ' + Lampa.Lang.translate(cfg.name_key);

                        if (settings.wideCards && json.results) {
                            json.results = json.results.map(makeWideCardItem);
                        }

                        call(json);
                    });
                });
            });

            Lampa.Api.sequentials(parts, parts.length, oncomplete);
        };
    }

    function initPlugin() {
        var original = Lampa.Api.sources.tmdb;
        var mod = Object.assign({}, original);

        Lampa.Api.sources.tmdb_mod = mod;

        mod.main = function () {
            var settings = loadSettings();
            if (settings.wideCards) {
                return createDiscoveryMain(mod).apply(this, arguments);
            }
            return original.main.apply(this, arguments);
        };
    }

    function waitForApp() {
        if (window.appready) {
            initPlugin();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') initPlugin();
            });
        }
    }

    waitForApp();

})();
