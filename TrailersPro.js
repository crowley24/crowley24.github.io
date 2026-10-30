(function () {
    'use strict';

    /*
     * КІНОТРЕЙЛЕРИ PREMIUM 2.0 — HYBRID EDITION
     *
     * Lampa 3.3.6+
     * TMDB + YouTube IFrame API + yt.html fallback
     *
     * Features:
     * - Responsive Android TV / Mobile interface
     * - Automatic next trailer
     * - TMDB filters: type, genre, sort, year, rating, votes
     * - Custom bookmarks / My List
     * - Persistent settings
     * - Smart logo selection
     * - Limited active YouTube players
     * - Smooth transitions
     * - Mobile vertical swipe
     * - Remote control navigation
     * - Async request protection
     * - YouTube bridge fallback
     *
     * yt.html is intentionally not modified.
     */

    if (!window.Lampa || !window.$) return;
    if (window.trailers_feed_premium_20_ready) return;

    window.trailers_feed_premium_20_ready = true;

    var tmdb = Lampa.Api.sources.tmdb;

    if (!tmdb) {
        window.trailers_feed_premium_20_ready = false;
        return;
    }

    var VERSION = '2.0.0';
    var PLUGIN = 'tfeed_premium_20';

    var TYPES = {
        movie: 'Фільми',
        tv: 'Серіали'
    };

    var SORTS = [
        { title: 'Популярні', value: 'popularity.desc' },
        { title: 'Новинки', value: 'date.desc' },
        { title: 'Найвищий рейтинг', value: 'vote_average.desc' },
        { title: 'Випадково', value: 'random' }
    ];

    var YEARS = [
        { title: 'Усі роки', value: 0 },
        { title: '2026', value: 2026 },
        { title: '2025', value: 2025 },
        { title: '2024', value: 2024 },
        { title: '2023', value: 2023 },
        { title: '2020–2022', value: 2020 },
        { title: '2010–2019', value: 2010 },
        { title: '2000–2009', value: 2000 },
        { title: 'До 2000 року', value: 1900 }
    ];

    var RATINGS = [
        { title: 'Будь-який рейтинг', value: 0 },
        { title: 'Від 5.0', value: 5 },
        { title: 'Від 6.0', value: 6 },
        { title: 'Від 7.0', value: 7 },
        { title: 'Від 8.0', value: 8 }
    ];

    var VOTES = [
        { title: 'Від 20 голосів', value: 20 },
        { title: 'Від 50 голосів', value: 50 },
        { title: 'Від 100 голосів', value: 100 },
        { title: 'Від 500 голосів', value: 500 },
        { title: 'Від 1000 голосів', value: 1000 }
    ];

    var DEFAULT_SETTINGS = {
        auto_next: true,
        auto_hide: 3,
        transition: 'smooth',
        blurred_bg: true
    };

    var AHEAD = 3;
    var META_AHEAD = 8;
    var MAX_PLAYERS = 2;
    var PREP_DELAY = 1200;
    var LOAD_TIMEOUT = 15000;

    var BASE = (
        (document.currentScript && document.currentScript.src) ||
        'https://smokingairlinestg.github.io/lampa-trailers/feed.js'
    ).split('?')[0].replace(/[^/]*$/, '');

    var bridgeMode = false;
    var ytLoading = false;
    var ytWaiters = [];

    var isMobile = !!(
        Lampa.Platform &&
        typeof Lampa.Platform.is === 'function' &&
        Lampa.Platform.is('mobile')
    );

    if (!isMobile) {
        isMobile = window.matchMedia
            ? window.matchMedia('(max-width: 768px)').matches &&
                ('ontouchstart' in window)
            : false;
    }

    function storageGet(key, fallback) {
        try {
            var value = Lampa.Storage.get(key, fallback);
            return value === undefined || value === null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            Lampa.Storage.set(key, value);
        } catch (e) {}
    }

    function getSettings() {
        var saved = storageGet(PLUGIN + '_settings', {});
        var result = {};

        Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
            result[key] = saved[key] !== undefined
                ? saved[key]
                : DEFAULT_SETTINGS[key];
        });

        return result;
    }

    function getBookmarks() {
        var list = storageGet(PLUGIN + '_bookmarks', []);
        return Array.isArray(list) ? list : [];
    }

    function saveBookmarks(list) {
        storageSet(PLUGIN + '_bookmarks', list);
    }

    function bookmarkKey(item, type) {
        return String(type || item.tfeed_type || 'movie') + ':' + String(item.id);
    }

    function isBookmarked(item, type) {
        var key = bookmarkKey(item, type);

        return getBookmarks().some(function (entry) {
            return bookmarkKey(entry, entry.tfeed_type) === key;
        });
    }

    function toggleBookmark(item, type) {
        var list = getBookmarks();
        var key = bookmarkKey(item, type);
        var found = -1;

        for (var i = 0; i < list.length; i++) {
            if (bookmarkKey(list[i], list[i].tfeed_type) === key) {
                found = i;
                break;
            }
        }

        if (found >= 0) {
            list.splice(found, 1);
            saveBookmarks(list);
            return false;
        }

        var copy = {};

        [
            'id',
            'title',
            'name',
            'original_title',
            'original_name',
            'poster_path',
            'backdrop_path',
            'overview',
            'vote_average',
            'vote_count',
            'genre_ids',
            'release_date',
            'first_air_date'
        ].forEach(function (prop) {
            if (item[prop] !== undefined) copy[prop] = item[prop];
        });

        copy.tfeed_type = type;
        copy.tfeed_saved_at = Date.now();

        list.unshift(copy);
        saveBookmarks(list);

        return true;
    }

    function getImage(path, size) {
        if (!path) return '';

        try {
            return Lampa.Api.img(path, size);
        } catch (e) {
            return '';
        }
    }

    function pickTrailer(results) {
        var lang = storageGet('tmdb_lang', 'uk');

        var rank = function (video) {
            var typeRank = video.type === 'Trailer'
                ? 0
                : video.type === 'Teaser'
                    ? 2
                    : 4;

            var langRank = video.iso_639_1 === lang
                ? 0
                : video.iso_639_1 === 'en'
                    ? 1
                    : 2;

            return typeRank + langRank;
        };

        var videos = (results || []).filter(function (video) {
            return video.site === 'YouTube' &&
                video.key &&
                video.key.length > 3;
        });

        videos.sort(function (a, b) {
            return rank(a) - rank(b);
        });

        return videos[0] || null;
    }

    function pickLogo(logos) {
        if (!logos || !logos.length) return null;

        var lang = storageGet('tmdb_lang', 'uk');
        var order = [lang, 'uk', 'en', null];

        for (var i = 0; i < order.length; i++) {
            for (var j = 0; j < logos.length; j++) {
                if (logos[j].iso_639_1 === order[i]) {
                    return logos[j];
                }
            }
        }

        return logos[0];
    }

    function genreTitle(type, id) {
        if (!id) return 'Популярне';

        var genres = tmdb.genres[type] || [];

        var genre = genres.filter(function (entry) {
            return Number(entry.id) === Number(id);
        })[0];

        if (!genre) return '';

        try {
            return Lampa.Utils.capitalizeFirstLetter(
                Lampa.Lang.translate(genre.title)
            );
        } catch (e) {
            return genre.title || '';
        }
    }

    function loadYT(callback) {
        if (window.YT && window.YT.Player) {
            callback(true);
            return;
        }

        ytWaiters.push(callback);

        if (ytLoading) return;

        ytLoading = true;

        var script = document.querySelector(
            'script[src*="youtube.com/iframe_api"]'
        );

        if (!script) {
            script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(script);
        }

        var oldReady = window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = function () {
            if (typeof oldReady === 'function') {
                try {
                    oldReady();
                } catch (e) {}
            }

            finish(true);
        };

        var started = Date.now();

        var timer = setInterval(function () {
            if (window.YT && window.YT.Player) {
                finish(true);
            } else if (Date.now() - started >= LOAD_TIMEOUT) {
                finish(false);
            }
        }, 150);

        function finish(ok) {
            clearInterval(timer);

            if (!ytLoading) return;

            ytLoading = false;

            var callbacks = ytWaiters.slice();
            ytWaiters = [];

            callbacks.forEach(function (fn) {
                try {
                    fn(ok);
                } catch (e) {}
            });
        }
    }

    function shuffleArray(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = array[i];

            array[i] = array[j];
            array[j] = tmp;
        }

        return array;
    }

    function formatRating(item) {
        var rating = Number(item.vote_average || 0);

        return rating > 0 ? '★ ' + rating.toFixed(1) : '';
    }

    function Feed(object) {
        var settings = getSettings();

        var html = $(
            '<div class="tfeed">' +
                '<div class="tfeed__bg"></div>' +
                '<div class="tfeed__shade"></div>' +
                '<div class="tfeed__video"></div>' +
                '<div class="tfeed__status"></div>' +
                '<button class="tfeed__chip" type="button"></button>' +
                '<div class="tfeed__side"></div>' +
                '<div class="tfeed__mobile-video-space"></div>' +
                '<div class="tfeed__info">' +
                    '<img class="tfeed__logo" alt="">' +
                    '<div class="tfeed__title"></div>' +
                    '<div class="tfeed__meta"></div>' +
                    '<div class="tfeed__descr"></div>' +
                    '<div class="tfeed__actions">' +
                        '<button class="tfeed__action tfeed__save" type="button"></button>' +
                        '<button class="tfeed__action tfeed__filter" type="button">Фільтри</button>' +
                    '</div>' +
                    '<div class="tfeed__hint"></div>' +
                '</div>' +
            '</div>'
        );

        var type = 'movie';
        var genre = 0;
        var items = [];
        var index = -1;
        var dir = 1;
        var page = 0;
        var totalPages = 1;
        var loading = false;
        var waiters = [];

        var filters = {
            sort: storageGet(PLUGIN + '_sort', 'popularity.desc'),
            year: Number(storageGet(PLUGIN + '_year', 0)) || 0,
            rating: Number(storageGet(PLUGIN + '_rating', 0)) || 0,
            votes: Number(storageGet(PLUGIN + '_votes', 50)) || 50,
            onlySaved: false
        };

        var feedGen = 0;
        var seq = 0;
        var players = [];
        var cur = null;
        var frameId = '';
        var frameEl = null;

        var nextTimer = null;
        var watchdog = null;
        var prepTimer = null;
        var hideTimer = null;
        var transitionTimer = null;

        var self = this;
        var destroyed = false;
        var started = false;

        var touchStartY = 0;
        var touchStartX = 0;
        var touchStartTime = 0;
        var touchMoved = false;

        var style = '' +
            '.tfeed{position:fixed;inset:0;width:100%;height:100%;' +
                'background:#000;overflow:hidden;z-index:9999;color:#fff;' +
                'font-family:Arial,sans-serif;isolation:isolate}' +

            'body.tfeed--on .head{display:none!important}' +
            'body.tfeed--on .menu{z-index:1}' +

            '.tfeed__bg{position:absolute;inset:-2%;z-index:0;' +
                'background:#111 center/cover no-repeat;' +
                'transform:scale(1.04);transition:opacity .35s,filter .35s}' +

            '.tfeed__shade{position:absolute;inset:0;z-index:1;' +
                'background:linear-gradient(90deg,rgba(0,0,0,.3),transparent 65%),' +
                'linear-gradient(0deg,rgba(0,0,0,.94),transparent 65%);' +
                'pointer-events:none}' +

            '.tfeed__video{position:absolute;inset:0;z-index:2;overflow:hidden;' +
                'transition:opacity .3s}' +

            '.tfeed__yt{position:absolute;inset:0;opacity:0;' +
                'transition:opacity .35s;overflow:hidden}' +

            '.tfeed__yt--on{opacity:1}' +

            '.tfeed__yt iframe{position:absolute;left:0;top:-300px;' +
                'width:100%;height:calc(100% + 600px);border:0;' +
                'pointer-events:none}' +

            '.tfeed__frame{position:absolute;left:0;top:0;width:100%;height:100%;' +
                'border:0;pointer-events:none}' +

            '.tfeed__chip{position:absolute;left:3em;top:2em;z-index:12;' +
                'border:1px solid rgba(255,255,255,.2);border-radius:2em;' +
                'padding:.65em 1.1em;background:rgba(0,0,0,.6);color:#fff;' +
                'font-size:1em;cursor:pointer}' +

            '.tfeed__side{position:absolute;right:2.5em;top:50%;' +
                'transform:translateY(-50%);z-index:10;' +
                'display:flex;flex-direction:column;align-items:center;' +
                'transition:opacity .35s,transform .35s}' +

            '.tfeed__side--hidden{opacity:0;transform:translate(1em,-50%);' +
                'pointer-events:none}' +

            '.tfeed__poster{width:5.5em;height:8.2em;margin:.45em 0;' +
                'border-radius:.45em;background:#222 center/cover no-repeat;' +
                'opacity:.6;transition:opacity .25s,transform .25s;' +
                'box-shadow:0 2px 10px rgba(0,0,0,.35)}' +

            '.tfeed__poster--now{opacity:1;transform:scale(1.07);' +
                'box-shadow:0 0 0 .15em #fff}' +

            '.tfeed__info{position:absolute;left:0;right:0;bottom:0;z-index:8;' +
                'padding:6em 12em 2em 3em;pointer-events:none;' +
                'background:linear-gradient(0deg,rgba(0,0,0,.92),rgba(0,0,0,0))}' +

            '.tfeed__logo{display:none;max-width:30em;max-height:8em;' +
                'width:auto;height:auto;object-fit:contain;object-position:left bottom;' +
                'margin-bottom:.6em;filter:drop-shadow(0 2px 8px rgba(0,0,0,.4))}' +

            '.tfeed__title{font-size:2.6em;font-weight:700;line-height:1.15;' +
                'text-shadow:0 2px 8px #000}' +

            '.tfeed__meta{font-size:1.2em;opacity:.9;margin-top:.5em}' +

            '.tfeed__descr{font-size:1.1em;opacity:.8;margin-top:.65em;' +
                'max-width:70%;line-height:1.4;display:-webkit-box;' +
                '-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}' +

            '.tfeed__hint{font-size:.95em;opacity:.55;margin-top:1em}' +

            '.tfeed__actions{display:flex;gap:.65em;margin-top:1em;' +
                'pointer-events:auto}' +

            '.tfeed__action{border:1px solid rgba(255,255,255,.25);' +
                'border-radius:2em;padding:.65em 1.1em;background:rgba(0,0,0,.55);' +
                'color:#fff;font-size:1em;cursor:pointer}' +

            '.tfeed__save--active{background:rgba(255,255,255,.2);' +
                'border-color:#fff}' +

            '.tfeed__status{position:absolute;left:50%;top:45%;' +
                'transform:translate(-50%,-50%);z-index:20;font-size:1.1em;' +
                'padding:.65em 1.1em;border-radius:2em;' +
                'background:rgba(0,0,0,.8);text-align:center;' +
                'max-width:80%;pointer-events:none}' +

            '.tfeed__status:empty{display:none}' +

            '.tfeed__mobile-video-space{display:none}' +

            '@media(max-width:768px){' +
                '.tfeed{overflow:hidden}' +

                '.tfeed__bg{inset:-5%;' +
                    'filter:blur(24px) brightness(.38);transform:scale(1.12)}' +

                '.tfeed__shade{background:linear-gradient(0deg,' +
                    'rgba(0,0,0,.92),rgba(0,0,0,.12) 75%)}' +

                '.tfeed__video{inset:50% 0 auto 0;height:auto;' +
                    'aspect-ratio:16/9;transform:translateY(-50%);' +
                    'overflow:hidden;background:#000}' +

                '.tfeed__yt{inset:0;width:100%;height:100%}' +

                '.tfeed__yt iframe{top:0;left:0;width:100%;height:100%}' +

                '.tfeed__frame{top:0;left:0;width:100%;height:100%}' +

                '.tfeed__mobile-video-space{display:block;position:absolute;' +
                    'left:0;right:0;top:calc(50% + 1px);height:0}' +

                '.tfeed__chip{left:1em;top:1em;padding:.5em .8em;' +
                    'font-size:.85em;max-width:85%;white-space:nowrap;' +
                    'overflow:hidden;text-overflow:ellipsis}' +

                '.tfeed__side{left:0;right:0;top:auto;bottom:1em;' +
                    'transform:none;display:flex;flex-direction:row;' +
                    'justify-content:flex-start;gap:.5em;padding:0 1em;' +
                    'overflow:hidden;max-height:7.2em}' +

                '.tfeed__side--hidden{opacity:0;transform:translateY(.5em)}' +

                '.tfeed__poster{flex:0 0 3.6em;width:3.6em;height:5.4em;' +
                    'margin:.5em 0;border-radius:.35em}' +

                '.tfeed__info{left:0;right:0;top:calc(50% + 1em);bottom:auto;' +
                    'padding:0 1em 7em;background:transparent;' +
                    'max-height:calc(50% - 7em);overflow:hidden}' +

                '.tfeed__logo{max-width:70%;max-height:4.2em;margin-bottom:.3em}' +

                '.tfeed__title{font-size:1.35em;line-height:1.2}' +

                '.tfeed__meta{font-size:.85em;margin-top:.4em}' +

                '.tfeed__descr{font-size:.88em;line-height:1.35;' +
                    'max-width:100%;margin-top:.45em;' +
                    '-webkit-line-clamp:2}' +

                '.tfeed__hint{display:none}' +

                '.tfeed__actions{gap:.5em;margin-top:.65em}' +

                '.tfeed__action{font-size:.85em;padding:.55em .9em}' +

                '.tfeed__status{top:35%;font-size:.9em}' +
            '}';

        function injectStyle() {
            if (document.getElementById(PLUGIN + '_style')) return;

            $('<style id="' + PLUGIN + '_style"></style>')
                .text(style)
                .appendTo('head');
        }

        function status(text) {
            html.find('.tfeed__status').text(text || '');
        }

        function saveFilters() {
            storageSet(PLUGIN + '_sort', filters.sort);
            storageSet(PLUGIN + '_year', filters.year);
            storageSet(PLUGIN + '_rating', filters.rating);
            storageSet(PLUGIN + '_votes', filters.votes);
        }

        function chipText() {
            var parts = [
                TYPES[type],
                genreTitle(type, genre)
            ];

            if (filters.onlySaved) parts.push('Мій список');

            return parts.filter(Boolean).join(' · ');
        }

        function updateChip() {
            html.find('.tfeed__chip').text(chipText());
        }

        function reset(newType, newGenre) {
            type = newType;
            genre = Number(newGenre) || 0;

            storageSet('tfeed_type', type);
            storageSet('tfeed_genre', genre);

            items = [];
            index = -1;
            dir = 1;
            page = 0;
            totalPages = 1;
            loading = false;
            waiters = [];

            feedGen++;
            seq++;

            stopAll();

            html.find('.tfeed__side').empty();
            html.find('.tfeed__title').empty();
            html.find('.tfeed__meta').empty();
            html.find('.tfeed__descr').empty();

            updateChip();
        }

        function flush(ok) {
            var callbacks = waiters.slice();
            waiters = [];

            callbacks.forEach(function (fn) {
                try {
                    fn(ok);
                } catch (e) {}
            });
        }

        function dateFilter(params) {
            var year = filters.year;

            if (!year) return;

            var start;
            var end;

            if (year === 1900) {
                start = '1900-01-01';
                end = '1999-12-31';
            } else if (year === 2020) {
                start = '2020-01-01';
                end = '2022-12-31';
            } else {
                start = year + '-01-01';
                end = year + '-12-31';
            }

            params.filter = params.filter || {};

            if (type === 'movie') {
                params.filter['primary_release_date.gte'] = start;
                params.filter['primary_release_date.lte'] = end;
            } else {
                params.filter['first_air_date.gte'] = start;
                params.filter['first_air_date.lte'] = end;
            }
        }

        function sortFilter(params) {
            if (filters.sort === 'random') {
                params.sort_by = 'popularity.desc';
            } else if (filters.sort === 'date.desc') {
                params.sort_by = type === 'movie'
                    ? 'primary_release_date.desc'
                    : 'first_air_date.desc';
            } else if (filters.sort === 'vote_average.desc') {
                params.sort_by = 'vote_average.desc';
                params.filter['vote_count.gte'] = filters.votes;
            } else {
                params.sort_by = filters.sort;
            }
        }

        function loadPage(done) {
            if (done) waiters.push(done);

            if (loading) return;

            if (page >= totalPages && page !== 0) {
                flush(false);
                return;
            }

            loading = true;

            var gen = feedGen;

            if (page === 0 && totalPages === 1) {
                page = Math.floor(Math.random() * 15) + 1;
            } else {
                page++;
            }

            var params = {
                page: page,
                sort_by: 'popularity.desc',
                filter: {
                    'vote_count.gte': filters.votes,
                    'vote_average.gte': filters.rating
                }
            };

            if (genre) params.genres = genre;

            if (type === 'tv' && !genre) {
                params.filter.without_genres = '10763,10767';
            }

            dateFilter(params);
            sortFilter(params);

            tmdb.get(
                'discover/' + type,
                params,
                function (json) {
                    if (gen !== feedGen || destroyed) return;

                    loading = false;

                    totalPages = Math.min(
                        Number(json.total_pages || page),
                        500
                    );

                    var newItems = (json.results || []).filter(function (item) {
                        return !item.adult &&
                            item.id &&
                            (item.poster_path || item.backdrop_path);
                    });

                    if (filters.sort === 'random') {
                        shuffleArray(newItems);
                    }

                    var seen = {};

                    items.forEach(function (item) {
                        seen[String(item.id)] = true;
                    });

                    newItems = newItems.filter(function (item) {
                        if (seen[String(item.id)]) return false;
                        seen[String(item.id)] = true;
                        return true;
                    });

                    items = items.concat(newItems);

                    flush(true);
                },
                function () {
                    if (gen !== feedGen || destroyed) return;

                    loading = false;
                    flush(false);
                }
            );
        }

        function cached(item, key, request, callback) {
            if (item[key] !== undefined) {
                callback(item[key]);
                return;
            }

            if (item[key + '_wait']) {
                item[key + '_wait'].push(callback);
                return;
            }

            item[key + '_wait'] = [callback];

            request(function (value) {
                item[key] = value || null;

                var callbacks = item[key + '_wait'] || [];
                item[key + '_wait'] = null;

                callbacks.forEach(function (fn) {
                    try {
                        fn(item[key]);
                    } catch (e) {}
                });
            });
        }

        function ensureVideo(item, callback) {
            if (item.tfeed_type && item.tfeed_type !== type) {
                cached(item, 'tfeed_video', function (done) {
                    tmdb.videos({
                        method: item.tfeed_type,
                        id: item.id
                    }, function (json) {
                        done(pickTrailer(json.results || []));
                    }, function () {
                        done(null);
                    });
                }, callback);

                return;
            }

            cached(item, 'tfeed_video', function (done) {
                tmdb.videos({
                    method: type,
                    id: item.id
                }, function (json) {
                    done(pickTrailer(json.results || []));
                }, function () {
                    done(null);
                });
            }, callback);
        }

        function ensureLogo(item, callback) {
            var itemType = item.tfeed_type || type;

            cached(item, 'tfeed_logo', function (done) {
                var language = storageGet('tmdb_lang', 'uk');
                var langs = [language, 'uk', 'en', 'null'].join(',');

                tmdb.get(
                    itemType + '/' + item.id + '/images',
                    {
                        filter: {
                            include_image_language: langs
                        }
                    },
                    function (json) {
                        var logo = pickLogo(json.logos || []);

                        done(
                            logo
                                ? getImage(logo.file_path, 'w500')
                                : null
                        );
                    },
                    function () {
                        done(null);
                    }
                );
            }, callback);
        }

        function fullscreen(on) {
            $('body').toggleClass('tfeed--on', !!on);
        }

        function findPlayer(item) {
            return players.filter(function (player) {
                return player.item === item;
            })[0] || null;
        }

        function clearTimers() {
            clearTimeout(nextTimer);
            clearTimeout(watchdog);
            clearTimeout(prepTimer);
            clearTimeout(hideTimer);
            clearTimeout(transitionTimer);

            nextTimer = null;
            watchdog = null;
            prepTimer = null;
            hideTimer = null;
            transitionTimer = null;
        }

        function killPlayer(player) {
            if (!player) return;

            if (player === cur) {
                cur = null;
                clearTimeout(nextTimer);
                clearTimeout(watchdog);
            }

            try {
                if (player.yt && player.yt.destroy) {
                    player.yt.destroy();
                }
            } catch (e) {}

            if (player.el) player.el.remove();

            var pos = players.indexOf(player);

            if (pos >= 0) players.splice(pos, 1);
        }

        function stopAll() {
            clearTimers();

            players.slice().forEach(killPlayer);

            cur = null;
            frameId = '';
            frameEl = null;

            html.find('.tfeed__frame').remove();
        }

        function revealPosters() {
            var side = html.find('.tfeed__side');

            side.removeClass('tfeed__side--hidden');

            clearTimeout(hideTimer);

            if (settings.auto_hide === 0) return;

            hideTimer = setTimeout(function () {
                side.addClass('tfeed__side--hidden');
            }, Number(settings.auto_hide) * 1000);
        }

        function schedulePrepare() {
            clearTimeout(prepTimer);

            prepTimer = setTimeout(prepare, PREP_DELAY);
        }

        function prepare() {
            clearTimeout(prepTimer);

            if (destroyed || bridgeMode || !cur || index < 0) return;

            var keep = [items[index]];
            var found = 0;

            for (
                var i = index + 1;
                i < items.length && found < 1;
                i++
            ) {
                var item = items[i];

                if (item.tfeed_video === null) continue;

                if (item.tfeed_video === undefined) {
                    ensureVideo(item, function () {
                        schedulePrepare();
                    });

                    break;
                }

                if (item.tfeed_video) {
                    keep.push(item);
                    found++;
                }
            }

            players.slice().forEach(function (player) {
                if (keep.indexOf(player.item) < 0) {
                    killPlayer(player);
                }
            });

            while (players.length >= MAX_PLAYERS) {
                var candidate = players.filter(function (player) {
                    return player !== cur;
                })[0];

                if (!candidate) break;

                killPlayer(candidate);
            }

            var nextItem = keep[1];

            if (nextItem && !findPlayer(nextItem)) {
                makePlayer(nextItem, false);
            }
        }

        function watch(mySeq, player) {
            clearTimeout(watchdog);

            watchdog = setTimeout(function () {
                if (mySeq !== seq || destroyed) return;

                if (player && player !== cur) return;

                status('YouTube не відповідає · пропускаю трейлер');

                scheduleNext(900);
            }, LOAD_TIMEOUT);
        }

        function scheduleNext(delay) {
            clearTimeout(nextTimer);

            var mySeq = seq;

            nextTimer = setTimeout(function () {
                if (destroyed || mySeq !== seq) return;

                if (settings.auto_next) {
                    show(index + 1, 1);
                } else {
                    status('Трейлер завершено · натисніть ▼ для продовження');
                }
            }, delay);
        }

        function makePlayer(item, play) {
            if (players.length >= MAX_PLAYERS) {
                var candidate = players.filter(function (player) {
                    return player !== cur && player.item !== item;
                })[0];

                if (candidate) killPlayer(candidate);
            }

            var player = {
                item: item,
                ready: false,
                wantPlay: !!play,
                yt: null,
                el: null
            };

            player.el = $('<div class="tfeed__yt"><div></div></div>');

            html.find('.tfeed__video').append(player.el);

            var vars = {
                autoplay: play ? 1 : 0,
                controls: 0,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                iv_load_policy: 3,
                disablekb: 1,
                fs: 0,
                enablejsapi: 1,
                mute: isMobile ? 1 : 0
            };

            if (/^https?:/.test(location.origin)) {
                vars.origin = location.origin;
            }

            players.push(player);

            player.yt = new window.YT.Player(
                player.el.children()[0],
                {
                    videoId: item.tfeed_video.key,
                    width: '100%',
                    height: '100%',
                    playerVars: vars,
                    events: {
                        onReady: function () {
                            player.ready = true;

                            var frame = player.yt &&
                                player.yt.getIframe &&
                                player.yt.getIframe();

                            if (frame) {
                                frame.setAttribute('tabindex', '-1');
                                frame.setAttribute('title', 'Трейлер');
                            }

                            if (player.wantPlay) {
                                try {
                                    player.yt.playVideo();
                                } catch (e) {}
                            }
                        },

                        onStateChange: function (event) {
                            onPlayer(player, 'state', event.data);
                        },

                        onError: function (event) {
                            onPlayer(player, 'error', event.data);
                        }
                    }
                }
            );

            return player;
        }

        function playItem(item) {
            var mySeq = seq;

            if (bridgeMode) {
                playFrame(item);
                return;
            }

            loadYT(function (ok) {
                if (mySeq !== seq || destroyed) return;

                if (!ok) {
                    bridgeMode = true;
                    playFrame(item);
                    return;
                }

                var player = findPlayer(item);

                if (player) {
                    player.wantPlay = true;
                    cur = player;

                    if (player.ready) {
                        try {
                            player.yt.playVideo();
                        } catch (e) {}
                    }
                } else {
                    cur = makePlayer(item, true);
                }

                watch(mySeq, cur);
            });
        }

        function onPlayer(player, kind, value) {
            if (destroyed) return;

            if (kind === 'error') {
                if (value === 153 && player === cur) {
                    var item = player.item;

                    bridgeMode = true;

                    players.slice().forEach(killPlayer);

                    if (items[index] === item) {
                        playFrame(item);
                    }

                    return;
                }

                player.item.tfeed_video = null;

                if (player !== cur) {
                    killPlayer(player);
                    schedulePrepare();
                    return;
                }
            }

            if (player !== cur) {
                if (kind === 'error') killPlayer(player);
                return;
            }

            if (
                kind === 'state' &&
                value === window.YT.PlayerState.PLAYING
            ) {
                clearTimeout(watchdog);

                status('');

                if (isMobile && player.yt && player.yt.isMuted()) {
                    try {
                        player.yt.unMute();
                        player.yt.setVolume(100);
                    } catch (e) {}
                }

                players.forEach(function (other) {
                    if (other !== player) {
                        other.el.removeClass('tfeed__yt--on');
                    }
                });

                player.el.addClass('tfeed__yt--on');

                schedulePrepare();
            }

            if (
                kind === 'state' &&
                value === window.YT.PlayerState.ENDED
            ) {
                scheduleNext(300);
            }

            if (kind === 'error') {
                status('Трейлер недоступний · шукаю наступний');

                scheduleNext(1000);
            }
        }

        function playFrame(item) {
            clearTimeout(watchdog);

            html.find('.tfeed__frame').remove();

            frameId = 'tfeed_' +
                Math.random().toString(36).slice(2) +
                Date.now().toString(36);

            frameEl = $(
                '<iframe class="tfeed__frame" tabindex="-1" ' +
                'allow="autoplay; encrypted-media"></iframe>'
            );

            frameEl.attr(
                'src',
                BASE + 'yt.html?id=' +
                encodeURIComponent(frameId) +
                '&v=' +
                encodeURIComponent(item.tfeed_video.key) +
                '&preload=0'
            );

            html.find('.tfeed__video').append(frameEl);

            watch(seq, null);
        }

        function onMessage(event) {
            var data = event.data;

            if (!data || !frameId || data.bridgeId !== frameId) return;
            if (!frameEl || !frameEl[0]) return;

            if (event.source !== frameEl[0].contentWindow) return;

            if (event.origin !== location.origin) return;

            if (data.type === 'ready') {
                clearTimeout(watchdog);
                status('');
            }

            if (data.type === 'bridgeReady') {
                return;
            }

            if (data.type === 'stateChange') {
                if (data.data && data.data.state === 1) {
                    clearTimeout(watchdog);
                    status('');
                }

                if (data.data && data.data.state === 0) {
                    scheduleNext(300);
                }
            }

            if (data.type === 'error') {
                status('Трейлер недоступний · шукаю наступний');
                scheduleNext(1000);
            }
        }

        function renderSide() {
            var side = html.find('.tfeed__side').empty();

            if (index < 0) return;

            var shown = 0;

            for (
                var i = index;
                i < items.length && shown < AHEAD + 1;
                i++
            ) {
                if (i > index && items[i].tfeed_video === null) continue;

                var poster = getImage(items[i].poster_path, 'w200');

                var element = $('<div class="tfeed__poster"></div>')
                    .toggleClass('tfeed__poster--now', i === index)
                    .css(
                        'background-image',
                        poster ? 'url("' + poster + '")' : 'none'
                    )
                    .attr('data-index', i);

                side.append(element);
                shown++;
            }

            revealPosters();
        }

        function prefetch() {
            var end = Math.min(items.length, index + 1 + META_AHEAD);

            for (var i = index + 1; i < end; i++) {
                (function (item) {
                    ensureVideo(item, function () {
                        renderSide();
                    });

                    ensureLogo(item, function (url) {
                        if (url) {
                            var image = new Image();
                            image.src = url;
                        }
                    });

                    if (!item.tfeed_warm) {
                        item.tfeed_warm = true;

                        var poster = getImage(item.poster_path, 'w200');
                        var backdrop = getImage(item.backdrop_path, 'w1280');

                        if (poster) {
                            var posterImage = new Image();
                            posterImage.src = poster;
                        }

                        if (backdrop) {
                            var backdropImage = new Image();
                            backdropImage.src = backdrop;
                        }
                    }
                })(items[i]);
            }
        }

        function updateBookmarkButton(item) {
            var saved = item && isBookmarked(item, type);

            html.find('.tfeed__save')
                .toggleClass('tfeed__save--active', !!saved)
                .text(saved ? '✓ У списку' : '+ Мій список');
        }

        function info(item) {
            if (!item) return;

            var itemType = item.tfeed_type || type;
            var date = item.release_date || item.first_air_date || '';
            var genreIds = item.genre_ids || [];

            var genres = [];

            genreIds.slice(0, 3).forEach(function (id) {
                var name = genreTitle(itemType, id);

                if (name) genres.push(name);
            });

            var meta = [
                date.slice(0, 4),
                formatRating(item),
                genres.join(', ')
            ].filter(Boolean).join(' · ');

            var titleEl = html.find('.tfeed__title');
            var logoEl = html.find('.tfeed__logo');

            var title = item.title ||
                item.name ||
                item.original_title ||
                item.original_name ||
                '';

            html.find('.tfeed__meta').text(meta);
            html.find('.tfeed__descr').text(item.overview || '');

            var bg = html.find('.tfeed__bg');

            if (settings.transition === 'off') {
                bg.css('transition', 'none');
            } else if (settings.transition === 'fast') {
                bg.css('transition', 'opacity .15s,filter .15s');
            } else {
                bg.css('transition', 'opacity .35s,filter .35s');
            }

            bg.css('opacity', '.45');

            clearTimeout(transitionTimer);

            transitionTimer = setTimeout(function () {
                var backdrop = settings.blurred_bg
                    ? getImage(item.backdrop_path, 'w1280')
                    : getImage(item.backdrop_path, 'w1280');

                bg.css(
                    'background-image',
                    backdrop ? 'url("' + backdrop + '")' : 'none'
                );

                bg.css('opacity', '1');
            }, 80);

            logoEl.hide().removeAttr('src');
            titleEl.text('').hide();

            ensureLogo(item, function (url) {
                if (destroyed || items[index] !== item) return;

                if (url) {
                    logoEl.attr('src', url).show();
                    titleEl.hide();
                } else {
                    logoEl.hide();
                    titleEl.text(title).show();
                }
            });

            updateBookmarkButton(item);
        }

        function nextPlayable(startIndex, direction, callback) {
            var pos = startIndex;
            var attempts = 0;

            function check() {
                if (destroyed) return;

                if (attempts++ > 30) {
                    callback(false);
                    return;
                }

                if (pos < 0) pos = 0;

                if (pos >= items.length) {
                    loadPage(function (ok) {
                        if (!ok || pos >= items.length) {
                            callback(false);
                        } else {
                            check();
                        }
                    });

                    return;
                }

                var item = items[pos];

                ensureVideo(item, function (trailer) {
                    if (destroyed) return;

                    if (trailer) {
                        callback(pos);
                    } else {
                        pos += direction;
                        check();
                    }
                });
            }

            check();
        }

        function show(i, direction) {
            if (destroyed) return;

            dir = direction || dir;

            if (i < 0) {
                show(0, 1);
                return;
            }

            if (i >= items.length) {
                loadPage(function (ok) {
                    if (destroyed) return;

                    if (ok && i < items.length) {
                        show(i, dir);
                    } else {
                        status('Більше трейлерів не знайдено');
                    }
                });

                return;
            }

            if (i >= items.length - META_AHEAD && page < totalPages) {
                loadPage();
            }

            index = i;

            var item = items[index];
            var mySeq = ++seq;

            clearTimeout(nextTimer);
            clearTimeout(watchdog);
            clearTimeout(prepTimer);

            if (cur && cur.item !== item) {
                killPlayer(cur);
            }

            if (frameEl) {
                frameEl.remove();
                frameEl = null;
            }

            frameId = '';

            html.find('.tfeed__frame').remove();

            status('');

            info(item);
            renderSide();

            ensureVideo(item, function (trailer) {
                if (mySeq !== seq || destroyed) return;

                if (trailer) {
                    playItem(item);
                } else {
                    status('Трейлер не знайдено · шукаю далі');

                    nextPlayable(index + 1, 1, function (nextIndex) {
                        if (mySeq !== seq || destroyed) return;

                        if (nextIndex === false) {
                            status('Доступних трейлерів не знайдено');
                        } else {
                            show(nextIndex, 1);
                        }
                    });
                }
            });

            prefetch();
        }

        function begin(done) {
            if (filters.onlySaved) {
                stopAll();

                items = getBookmarks().filter(function (item) {
                    return item.tfeed_type === type;
                });

                page = 0;
                totalPages = 1;
                index = -1;

                if (!items.length) {
                    status('У списку поки немає збережених фільмів');
                } else {
                    show(0, 1);
                }

                if (done) done();

                return;
            }

            self.activity.loader(true);

            loadPage(function (ok) {
                self.activity.loader(false);

                if (destroyed) return;

                if (ok && items.length) {
                    nextPlayable(0, 1, function (first) {
                        if (destroyed) return;

                        if (first === false) {
                            status('Не вдалося знайти доступні трейлери');
                        } else {
                            show(first, 1);
                        }
                    });
                } else {
                    status('Не вдалося завантажити список');
                }

                if (done) done();
            });
        }

        function selectValue(title, options, current, callback) {
            var list = options.map(function (entry) {
                return {
                    title: entry.title +
                        (String(entry.value) === String(current) ? '  ✓' : ''),
                    value: entry.value
                };
            });

            Lampa.Select.show({
                title: title,
                items: list,
                onSelect: function (entry) {
                    Lampa.Controller.toggle('content');
                    callback(entry.value);
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        }

        function openGenreSelector() {
            var list = [{ title: 'Усі жанри', value: 0 }];

            (tmdb.genres[type] || []).forEach(function (entry) {
                list.push({
                    title: genreTitle(type, entry.id) +
                        (Number(genre) === Number(entry.id) ? '  ✓' : ''),
                    value: entry.id
                });
            });

            Lampa.Select.show({
                title: 'Жанр',
                items: list,
                onSelect: function (entry) {
                    Lampa.Controller.toggle('content');

                    genre = Number(entry.value) || 0;
                    filters.onlySaved = false;

                    reset(type, genre);
                    begin();
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        }

        function openSettings() {
            var list = [
                {
                    title: 'Автоперехід: ' +
                        (settings.auto_next ? 'увімкнено' : 'вимкнено'),
                    action: 'auto_next'
                },
                {
                    title: 'Приховування постерів: ' +
                        (settings.auto_hide === 0
                            ? 'ніколи'
                            : settings.auto_hide + ' с'),
                    action: 'auto_hide'
                },
                {
                    title: 'Анімація: ' +
                        ({
                            smooth: 'плавна',
                            fast: 'швидка',
                            off: 'вимкнена'
                        }[settings.transition] || 'плавна'),
                    action: 'transition'
                },
                {
                    title: 'Розмитий фон: ' +
                        (settings.blurred_bg ? 'увімкнено' : 'вимкнено'),
                    action: 'blurred_bg'
                }
            ];

            Lampa.Select.show({
                title: 'Налаштування Premium',
                items: list,
                onSelect: function (entry) {
                    Lampa.Controller.toggle('content');

                    if (entry.action === 'auto_next') {
                        settings.auto_next = !settings.auto_next;
                        saveSettings();
                        openSettings();
                    } else if (entry.action === 'blurred_bg') {
                        settings.blurred_bg = !settings.blurred_bg;
                        saveSettings();
                        openSettings();
                    } else if (entry.action === 'auto_hide') {
                        selectValue(
                            'Приховування постерів',
                            [
                                { title: '2 секунди', value: 2 },
                                { title: '3 секунди', value: 3 },
                                { title: '5 секунд', value: 5 },
                                { title: 'Ніколи', value: 0 }
                            ],
                            settings.auto_hide,
                            function (value) {
                                settings.auto_hide = Number(value);
                                saveSettings();
                                openSettings();
                            }
                        );
                    } else if (entry.action === 'transition') {
                        selectValue(
                            'Анімація переходів',
                            [
                                { title: 'Плавна · 350 мс', value: 'smooth' },
                                { title: 'Швидка · 150 мс', value: 'fast' },
                                { title: 'Вимкнена', value: 'off' }
                            ],
                            settings.transition,
                            function (value) {
                                settings.transition = value;
                                saveSettings();
                                openSettings();
                            }
                        );
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        }

        function saveSettings() {
            storageSet(PLUGIN + '_settings', settings);
        }

        function openPanel() {
            var list = [
                {
                    title: 'Тип: ' + TYPES[type],
                    action: 'type'
                },
                {
                    title: 'Жанр: ' + genreTitle(type, genre),
                    action: 'genre'
                },
                {
                    title: 'Сортування: ' +
                        ((SORTS.filter(function (entry) {
                            return entry.value === filters.sort;
                        })[0] || {}).title || 'Популярні'),
                    action: 'sort'
                },
                {
                    title: 'Рік: ' +
                        ((YEARS.filter(function (entry) {
                            return entry.value === filters.year;
                        })[0] || {}).title || 'Усі роки'),
                    action: 'year'
                },
                {
                    title: 'Мінімальний рейтинг: ' +
                        (filters.rating || 'без обмежень'),
                    action: 'rating'
                },
                {
                    title: 'Мінімум голосів: ' + filters.votes,
                    action: 'votes'
                },
                {
                    title: filters.onlySaved
                        ? '✓ Мій список'
                        : 'Мій список',
                    action: 'saved'
                },
                {
                    title: 'Налаштування Premium',
                    action: 'settings'
                },
                {
                    title: 'Скинути фільтри',
                    action: 'reset'
                }
            ];

            Lampa.Select.show({
                title: 'КіноТрейлери Premium',
                items: list,
                onSelect: function (entry) {
                    Lampa.Controller.toggle('content');

                    if (entry.action === 'type') {
                        selectValue(
                            'Тип контенту',
                            [
                                { title: 'Фільми', value: 'movie' },
                                { title: 'Серіали', value: 'tv' }
                            ],
                            type,
                            function (value) {
                                var valid = (tmdb.genres[value] || []).some(
                                    function (g) {
                                        return Number(g.id) === Number(genre);
                                    }
                                );

                                reset(value, valid ? genre : 0);
                                filters.onlySaved = false;
                                begin();
                            }
                        );
                    } else if (entry.action === 'genre') {
                        openGenreSelector();
                    } else if (entry.action === 'sort') {
                        selectValue(
                            'Сортування',
                            SORTS,
                            filters.sort,
                            function (value) {
                                filters.sort = value;
                                saveFilters();
                                reset(type, genre);
                                begin();
                            }
                        );
                    } else if (entry.action === 'year') {
                        selectValue(
                            'Рік випуску',
                            YEARS,
                            filters.year,
                            function (value) {
                                filters.year = Number(value);
                                saveFilters();
                                reset(type, genre);
                                begin();
                            }
                        );
                    } else if (entry.action === 'rating') {
                        selectValue(
                            'Мінімальний рейтинг',
                            RATINGS,
                            filters.rating,
                            function (value) {
                                filters.rating = Number(value);
                                saveFilters();
                                reset(type, genre);
                                begin();
                            }
                        );
                    } else if (entry.action === 'votes') {
                        selectValue(
                            'Мінімум голосів',
                            VOTES,
                            filters.votes,
                            function (value) {
                                filters.votes = Number(value);
                                saveFilters();
                                reset(type, genre);
                                begin();
                            }
                        );
                    } else if (entry.action === 'saved') {
                        filters.onlySaved = !filters.onlySaved;
                        reset(type, genre);
                        begin();
                    } else if (entry.action === 'settings') {
                        openSettings();
                    } else if (entry.action === 'reset') {
                        filters.sort = 'popularity.desc';
                        filters.year = 0;
                        filters.rating = 0;
                        filters.votes = 50;
                        filters.onlySaved = false;

                        saveFilters();
                        reset(type, 0);
                        begin();
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        }

        function openCurrentCard() {
            var item = items[index];

            if (!item) return;

            Lampa.Activity.push({
                url: '',
                component: 'full',
                id: item.id,
                method: item.tfeed_type || type,
                card: item,
                source: 'tmdb'
            });
        }

        function saveCurrent() {
            var item = items[index];

            if (!item) return;

            var saved = toggleBookmark(item, type);

            updateBookmarkButton(item);

            status(saved ? 'Додано до «Мого списку»' : 'Видалено зі списку');

            clearTimeout(nextTimer);

            nextTimer = setTimeout(function () {
                status('');
            }, 1400);
        }

        function handleTouchStart(event) {
            if (!event.touches || event.touches.length !== 1) return;

            touchStartY = event.touches[0].clientY;
            touchStartX = event.touches[0].clientX;
            touchStartTime = Date.now();
            touchMoved = false;

            revealPosters();
        }

        function handleTouchEnd(event) {
            if (!event.changedTouches || !event.changedTouches.length) return;

            var deltaY = event.changedTouches[0].clientY - touchStartY;
            var deltaX = event.changedTouches[0].clientX - touchStartX;
            var deltaTime = Date.now() - touchStartTime;

            if (
                Math.abs(deltaY) > 30 &&
                Math.abs(deltaY) > Math.abs(deltaX) &&
                deltaTime < 700
            ) {
                touchMoved = true;

                if (deltaY < 0) {
                    show(index + 1, 1);
                } else if (index > 0) {
                    show(index - 1, -1);
                }
            } else if (Math.abs(deltaX) > 50 && isMobile) {
                touchMoved = true;
                revealPosters();
            }
        }

        this.create = function () {
            destroyed = false;

            injectStyle();

            html.find('.tfeed__hint').text(
                isMobile
                    ? 'Свайп угору/вниз — трейлери'
                    : '▲▼ трейлери · OK — картка · ← фільтри · Назад — вихід'
            );

            window.addEventListener('message', onMessage);

            html.find('.tfeed__chip').on('click', function (event) {
                event.stopPropagation();
                openPanel();
            });

            html.find('.tfeed__filter').on('click', function (event) {
                event.stopPropagation();
                openPanel();
            });

            html.find('.tfeed__save').on('click', function (event) {
                event.stopPropagation();
                saveCurrent();
            });

            html.find('.tfeed__side').on('click', '.tfeed__poster', function (event) {
                event.stopPropagation();

                var targetIndex = Number($(this).attr('data-index'));

                if (!isNaN(targetIndex)) show(targetIndex, 1);
            });

            html.on('click', function (event) {
                if ($(event.target).closest(
                    '.tfeed__chip,.tfeed__actions,.tfeed__side'
                ).length) {
                    return;
                }

                if ($(event.target).closest('.tfeed__info').length) {
                    openCurrentCard();
                } else if (!isMobile) {
                    openPanel();
                }
            });

            html[0].addEventListener(
                'touchstart',
                handleTouchStart,
                { passive: true }
            );

            html[0].addEventListener(
                'touchend',
                handleTouchEnd,
                { passive: true }
            );

            reset(
                TYPES[object.type] ? object.type : 'movie',
                object.genre || 0
            );

            begin(function () {
                self.activity.toggle();
            });

            return this.render();
        };

        this.start = function () {
            started = true;

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.clear();
                },

                up: function () {
                    revealPosters();

                    if (index > 0) show(index - 1, -1);
                },

                down: function () {
                    revealPosters();

                    if (filters.onlySaved && index >= items.length - 1) {
                        status('Кінець «Мого списку»');
                    } else {
                        show(index + 1, 1);
                    }
                },

                left: function () {
                    revealPosters();
                    openPanel();
                },

                right: function () {
                    revealPosters();
                    openPanel();
                },

                enter: openCurrentCard,

                back: function () {
                    Lampa.Activity.backward();
                }
            });

            Lampa.Controller.toggle('content');

            fullscreen(true);

            if (
                index >= 0 &&
                !cur &&
                !frameId &&
                items[index] &&
                items[index].tfeed_video
            ) {
                playItem(items[index]);
            }
        };

        this.pause = function () {
            seq++;
            stopAll();
            fullscreen(false);
        };

        this.stop = function () {
            seq++;
            stopAll();
            fullscreen(false);
        };

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            destroyed = true;

            seq++;
            feedGen++;

            stopAll();

            fullscreen(false);

            window.removeEventListener('message', onMessage);

            html.off();

            html.find('.tfeed__chip').off();
            html.find('.tfeed__filter').off();
            html.find('.tfeed__save').off();
            html.find('.tfeed__side').off();

            if (html[0]) {
                html[0].removeEventListener('touchstart', handleTouchStart);
                html[0].removeEventListener('touchend', handleTouchEnd);
            }

            html.remove();
        };
    }

    function openFeed() {
        Lampa.Activity.push({
            url: '',
            title: 'КіноТрейлери Premium',
            component: 'trailers_feed_premium_20',
            page: 1,
            type: storageGet('tfeed_type', 'movie'),
            genre: parseInt(storageGet('tfeed_genre', 0), 10) || 0
        });
    }

    function start() {
        if (window.trailers_feed_premium_20_started) return;

        window.trailers_feed_premium_20_started = true;

        Lampa.Component.add('trailers_feed_premium_20', Feed);

        var icon =
            '<svg viewBox="0 0 24 24" fill="currentColor">' +
                '<path d="M8 5v14l11-7z"/>' +
            '</svg>';

        if (Lampa.Menu.addButton) {
            Lampa.Menu.addButton(
                icon,
                'КіноТрейлери Premium',
                openFeed
            );
        } else {
            var item = $(
                '<li class="menu__item selector">' +
                    '<div class="menu__ico">' + icon + '</div>' +
                    '<div class="menu__text">КіноТрейлери Premium</div>' +
                '</li>'
            );

            item.on('hover:enter', openFeed);

            $('.menu .menu__list').eq(0).append(item);
        }
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') start();
        });
    }
})();
