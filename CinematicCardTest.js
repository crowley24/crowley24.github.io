
(function () {
    'use strict';

    /*
     * INTERFACE+ CINEMATIC FULL CARD 1.0.2
     *
     * Lampa / Android TV
     *
     * CONCEPT:
     * - Fullscreen cinematic backdrop
     * - Fixed background while scrolling
     * - No separate banner
     * - No duplicated title, logo or metadata
     * - Native Lampa card content remains
     * - Native buttons and remote navigation untouched
     *
     * FIXES:
     * - No interference with Start.onCreate
     * - No replacement of Lampa containers
     * - Background attached to document.body
     * - Fixed positioning independent of card scroll
     */

    var VERSION = '1.0.2';
    var READY_KEY = 'interface_plus_cinematic_full_card_102';
    var PREFIX = 'ip-cinematic-card-102';
    var STYLE_ID = PREFIX + '-style';

    if (window[READY_KEY]) return;
    window[READY_KEY] = true;

    var background = null;
    var activeIdentity = '';
    var requestId = 0;
    var pending = {};
    var cache = {};

    var LANG = 'uk,en,null';

    /* -------------------------------------------------------
       HELPERS
    ------------------------------------------------------- */

    function text(value) {
        if (value === undefined || value === null) return '';
        return String(value).trim();
    }

    function firstValue() {
        for (var i = 0; i < arguments.length; i++) {
            var value = arguments[i];

            if (value !== undefined && value !== null && value !== '') {
                return value;
            }
        }

        return '';
    }

    function getMovie(data) {
        if (!data) return null;

        return firstValue(
            data.movie,
            data.card,
            data.card_data,
            data.data && data.data.movie,
            data.data,
            data.params && data.params.movie,
            data.params && data.params.data,
            data.activity && data.activity.movie,
            data.activity && data.activity.data
        );
    }

    function movieType(movie) {
        if (!movie) return 'movie';

        var type = text(firstValue(
            movie.type,
            movie.media_type,
            movie.source
        )).toLowerCase();

        if (
            type === 'tv' ||
            type === 'serial' ||
            type === 'show' ||
            type === 'tvshow' ||
            type === 'series'
        ) {
            return 'tv';
        }

        if (movie.name || movie.first_air_date) return 'tv';

        return 'movie';
    }

    function movieId(movie) {
        return text(firstValue(
            movie.id,
            movie.tmdb_id,
            movie.movie_id
        ));
    }

    function identity(movie) {
        if (!movie) return '';

        return movieType(movie) + ':' + movieId(movie);
    }

    function imageUrl(path, size) {
        if (!path) return '';

        if (/^https?:\/\//i.test(path)) return path;

        return 'https://image.tmdb.org/t/p/' +
            (size || 'w1280') + path;
    }

    function getActiveMovie(eventData) {
        var movie = getMovie(eventData);

        if (movie && movieId(movie)) return movie;

        try {
            if (
                window.Lampa &&
                Lampa.Activity &&
                typeof Lampa.Activity.active === 'function'
            ) {
                var activity = Lampa.Activity.active();

                movie = getMovie(activity);

                if (movie && movieId(movie)) return movie;
            }
        } catch (e) {}

        return null;
    }

    /* -------------------------------------------------------
       STYLES
    ------------------------------------------------------- */

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var css = `
            /*
             * Fullscreen background layer.
             * It is outside the scrolling card container.
             */

            #${PREFIX} {
                position: fixed;
                inset: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
                pointer-events: none;
                z-index: 0;
                opacity: 0;
                visibility: hidden;
                transition: opacity .55s ease;
                background: #080808;
            }

            #${PREFIX}.active {
                opacity: 1;
                visibility: visible;
            }

            #${PREFIX} .${PREFIX}__image {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                background-size: cover;
                background-position: center center;
                background-repeat: no-repeat;
                transform: scale(1.015);
                opacity: 0;
                transition: opacity .65s ease;
            }

            #${PREFIX} .${PREFIX}__image.ready {
                opacity: 1;
            }

            #${PREFIX} .${PREFIX}__shade {
                position: absolute;
                inset: 0;
                background:
                    linear-gradient(
                        90deg,
                        rgba(0,0,0,.68) 0%,
                        rgba(0,0,0,.38) 45%,
                        rgba(0,0,0,.20) 100%
                    ),
                    linear-gradient(
                        0deg,
                        rgba(0,0,0,.88) 0%,
                        rgba(0,0,0,.28) 48%,
                        rgba(0,0,0,.40) 100%
                    );
            }

            /*
             * The card content must stay above the background.
             * No elements are removed or replaced.
             */

            body.${PREFIX}-enabled .full,
            body.${PREFIX}-enabled .full-start,
            body.${PREFIX}-enabled .full-start-new {
                position: relative;
                z-index: 1;
                background-color: transparent !important;
            }

            /*
             * Remove opaque backgrounds from common card wrappers.
             * This does not hide or remove their content.
             */

            body.${PREFIX}-enabled .full-start__body,
            body.${PREFIX}-enabled .full-start-new__body,
            body.${PREFIX}-enabled .full-start__left,
            body.${PREFIX}-enabled .full-start-new__left {
                background-color: transparent !important;
            }

            /*
             * Keep the background fixed during vertical scrolling.
             */

            body.${PREFIX}-enabled {
                background-color: #080808 !important;
            }
        `;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;

        document.head.appendChild(style);
    }

    /* -------------------------------------------------------
       BACKGROUND ELEMENT
    ------------------------------------------------------- */

    function createBackground() {
        if (background && document.body.contains(background)) {
            return background;
        }

        background = document.createElement('div');
        background.id = PREFIX;

        var image = document.createElement('div');
        image.className = PREFIX + '__image';

        var shade = document.createElement('div');
        shade.className = PREFIX + '__shade';

        background.appendChild(image);
        background.appendChild(shade);

        /*
         * Attach directly to BODY.
         * It is independent of the scrolling full-card element.
         */

        document.body.insertBefore(
            background,
            document.body.firstChild
        );

        return background;
    }

    function showBackground(url) {
        if (!url) return;

        var layer = createBackground();
        var image = layer.querySelector('.' + PREFIX + '__image');

        if (!image) return;

        image.classList.remove('ready');

        var preload = new Image();

        preload.onload = function () {
            image.style.backgroundImage = 'url("' + url + '")';

            requestAnimationFrame(function () {
                image.classList.add('ready');
                layer.classList.add('active');
                document.body.classList.add(PREFIX + '-enabled');
            });
        };

        preload.onerror = function () {
            /*
             * Keep the existing background if the new image fails.
             */
        };

        preload.src = url;
    }

    function hideBackground() {
        if (background) {
            background.classList.remove('active');
        }

        document.body.classList.remove(PREFIX + '-enabled');
    }

    /* -------------------------------------------------------
       TMDB BACKDROP
    ------------------------------------------------------- */

    function getDirectBackdrop(movie) {
        if (!movie) return '';

        return imageUrl(firstValue(
            movie.backdrop_path,
            movie.backdrop,
            movie.backdrop_url,
            movie.background
        ), 'w1280');
    }

    function getBackdrop(movie, callback) {
        var id = movieId(movie);
        var type = movieType(movie);
        var key = type + ':' + id;

        if (!id) {
            callback('');
            return;
        }

        /*
         * Prefer backdrop already present in movie data.
         */

        var direct = getDirectBackdrop(movie);

        if (direct) {
            callback(direct);
            return;
        }

        if (cache[key] !== undefined) {
            callback(cache[key]);
            return;
        }

        if (pending[key]) {
            pending[key].push(callback);
            return;
        }

        pending[key] = [callback];

        var result = '';
        var finished = false;

        function complete() {
            if (finished) return;

            finished = true;
            cache[key] = result;

            var callbacks = pending[key] || [];
            delete pending[key];

            callbacks.forEach(function (fn) {
                try {
                    fn(result);
                } catch (e) {}
            });
        }

        try {
            if (
                !window.Lampa ||
                !Lampa.Api ||
                !Lampa.Api.sources ||
                !Lampa.Api.sources.tmdb
            ) {
                complete();
                return;
            }

            Lampa.Api.sources.tmdb.get(
                type + '/' + id + '/images',
                {
                    filter: {
                        include_image_language: LANG
                    }
                },
                function (data) {
                    var backdrops = data && data.backdrops || [];

                    if (backdrops.length) {
                        /*
                         * Prefer the highest-rated backdrop.
                         */

                        backdrops.sort(function (a, b) {
                            return (b.vote_average || 0) -
                                (a.vote_average || 0);
                        });

                        result = imageUrl(
                            backdrops[0].file_path,
                            'w1280'
                        );
                    }

                    complete();
                },
                function () {
                    complete();
                }
            );

            setTimeout(complete, 10000);

        } catch (e) {
            complete();
        }
    }

    /* -------------------------------------------------------
       FULL CARD
    ------------------------------------------------------- */

    function processFull(eventData) {
        var movie = getActiveMovie(eventData);

        if (!movie || !movieId(movie)) return;

        var currentIdentity = identity(movie);

        if (!currentIdentity) return;

        if (currentIdentity === activeIdentity && background &&
            background.classList.contains('active')) {
            return;
        }

        activeIdentity = currentIdentity;

        var currentRequest = ++requestId;

        getBackdrop(movie, function (url) {
            if (currentRequest !== requestId) return;

            if (!url) return;

            showBackground(url);
        });
    }

    /* -------------------------------------------------------
       EVENTS
    ------------------------------------------------------- */

    function init() {
        if (!window.Lampa || !Lampa.Listener) {
            setTimeout(init, 500);
            return;
        }

        addStyles();
        createBackground();

        Lampa.Listener.follow('full', function (event) {
            if (!event) return;

            if (
                event.type === 'complite' ||
                event.type === 'complete'
            ) {
                setTimeout(function () {
                    processFull(event.data || event);
                }, 250);
            }

            if (
                event.type === 'destroy' ||
                event.type === 'close'
            ) {
                requestId++;
                activeIdentity = '';
                hideBackground();
            }
        });

        Lampa.Listener.follow('activity', function (event) {
            if (!event) return;

            if (
                event.type === 'start' ||
                event.type === 'destroy'
            ) {
                requestId++;
                activeIdentity = '';
                hideBackground();
            }
        });
    }

    init();

})();
