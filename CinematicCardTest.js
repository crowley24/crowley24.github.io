
(function () {
    'use strict';

    /*
     * INTERFACE+ CINEMATIC FULL CARD 1.0.3
     *
     * Lampa / Android TV
     *
     * FEATURES:
     * - Fullscreen fixed TMDB backdrop
     * - TMDB logo over fullscreen background
     * - Ukrainian > English > null logo preference
     * - Adaptive logo sizing
     * - Original logo proportions preserved
     * - Logo remains fixed while scrolling
     * - Native Lampa buttons and navigation preserved
     * - Native poster and title visually hidden
     * - Fallback title when TMDB logo is unavailable
     */

    var READY_KEY = 'interface_plus_cinematic_full_card_103';
    var PREFIX = 'ip-cinematic-card-103';
    var STYLE_ID = PREFIX + '-style';

    if (window[READY_KEY]) return;
    window[READY_KEY] = true;

    var background = null;
    var foreground = null;
    var activeIdentity = '';
    var requestId = 0;

    var cache = {};
    var pending = {};

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

    function movieTitle(movie) {
        return text(firstValue(
            movie.title,
            movie.name,
            movie.original_title,
            movie.original_name
        ));
    }

    function movieYear(movie) {
        var date = text(firstValue(
            movie.release_date,
            movie.first_air_date,
            movie.year
        ));

        var match = date.match(/\d{4}/);

        return match ? match[0] : '';
    }

    function movieRating(movie) {
        var rating = Number(firstValue(
            movie.vote_average,
            movie.rating
        ));

        return rating > 0 ? rating.toFixed(1) : '';
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
                transition: opacity .7s ease;
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
                        rgba(0,0,0,.76) 0%,
                        rgba(0,0,0,.46) 42%,
                        rgba(0,0,0,.18) 100%
                    ),
                    linear-gradient(
                        0deg,
                        rgba(0,0,0,.86) 0%,
                        rgba(0,0,0,.18) 48%,
                        rgba(0,0,0,.34) 100%
                    );
            }

            /*
             * Foreground logo and fallback title.
             * Independent from the scrolling card.
             */

            #${PREFIX}-foreground {
                position: fixed;
                left: 5.5%;
                bottom: 29%;
                width: 42%;
                max-width: 720px;
                z-index: 5;
                pointer-events: none;
                opacity: 0;
                visibility: hidden;
                transform: translateY(12px);
                transition:
                    opacity .45s ease,
                    transform .45s ease;
            }

            #${PREFIX}-foreground.active {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            #${PREFIX}-foreground .${PREFIX}__logo {
                display: block;
                width: auto;
                height: auto;
                max-width: 100%;
                max-height: 190px;
                object-fit: contain;
                object-position: left bottom;
                filter: drop-shadow(0 3px 18px rgba(0,0,0,.45));
                opacity: 0;
                transition: opacity .4s ease;
            }

            #${PREFIX}-foreground .${PREFIX}__logo.ready {
                opacity: 1;
            }

            #${PREFIX}-foreground .${PREFIX}__title {
                color: #fff;
                font-size: clamp(28px, 3.2vw, 54px);
                line-height: 1.08;
                font-weight: 700;
                text-shadow: 0 3px 18px rgba(0,0,0,.65);
            }

            #${PREFIX}-foreground .${PREFIX}__meta {
                display: flex;
                align-items: center;
                gap: 13px;
                flex-wrap: wrap;
                margin-top: 17px;
                color: rgba(255,255,255,.85);
                font-size: 17px;
                font-weight: 500;
                text-shadow: 0 2px 8px rgba(0,0,0,.7);
            }

            #${PREFIX}-foreground .${PREFIX}__rating {
                color: #fff;
                font-weight: 700;
            }

            /*
             * Card stays above the background.
             * Native buttons and focus handling remain intact.
             */

            body.${PREFIX}-enabled .full,
            body.${PREFIX}-enabled .full-start,
            body.${PREFIX}-enabled .full-start-new {
                position: relative;
                z-index: 2;
                background-color: transparent !important;
            }

            body.${PREFIX}-enabled .full-start__body,
            body.${PREFIX}-enabled .full-start-new__body,
            body.${PREFIX}-enabled .full-start__left,
            body.${PREFIX}-enabled .full-start-new__left {
                background-color: transparent !important;
            }

            /*
             * Hide only duplicated native poster/title visuals.
             * Elements are not removed from DOM.
             */

            body.${PREFIX}-enabled .full-start__poster,
            body.${PREFIX}-enabled .full-start-new__poster,
            body.${PREFIX}-enabled .full-start__title,
            body.${PREFIX}-enabled .full-start-new__title,
            body.${PREFIX}-enabled .full__title,
            body.${PREFIX}-enabled .full-card__title {
                opacity: 0 !important;
                visibility: hidden !important;
            }

            body.${PREFIX}-enabled {
                background-color: #080808 !important;
            }

            @media (max-width: 900px) {
                #${PREFIX}-foreground {
                    left: 5%;
                    bottom: 25%;
                    width: 65%;
                }

                #${PREFIX}-foreground .${PREFIX}__logo {
                    max-height: 125px;
                }

                #${PREFIX}-foreground .${PREFIX}__meta {
                    font-size: 14px;
                }
            }

            @media (max-width: 600px) {
                #${PREFIX}-foreground {
                    bottom: 23%;
                    width: 78%;
                }

                #${PREFIX}-foreground .${PREFIX}__logo {
                    max-height: 100px;
                }
            }
        `;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;

        document.head.appendChild(style);
    }

    /* -------------------------------------------------------
       BACKGROUND AND FOREGROUND
    ------------------------------------------------------- */

    function createLayers() {
        if (!background || !document.body.contains(background)) {
            background = document.createElement('div');
            background.id = PREFIX;

            var image = document.createElement('div');
            image.className = PREFIX + '__image';

            var shade = document.createElement('div');
            shade.className = PREFIX + '__shade';

            background.appendChild(image);
            background.appendChild(shade);

            document.body.insertBefore(
                background,
                document.body.firstChild
            );
        }

        if (!foreground || !document.body.contains(foreground)) {
            foreground = document.createElement('div');
            foreground.id = PREFIX + '-foreground';

            document.body.appendChild(foreground);
        }

        return {
            background: background,
            foreground: foreground
        };
    }

    function showBackground(url) {
        if (!url) return;

        var layers = createLayers();

        var image = layers.background.querySelector(
            '.' + PREFIX + '__image'
        );

        if (!image) return;

        image.classList.remove('ready');

        var preload = new Image();

        preload.onload = function () {
            image.style.backgroundImage = 'url("' + url + '")';

            requestAnimationFrame(function () {
                image.classList.add('ready');
                layers.background.classList.add('active');
                document.body.classList.add(PREFIX + '-enabled');
            });
        };

        preload.onerror = function () {};

        preload.src = url;
    }

    function showForeground(movie, logoUrl) {
        var layers = createLayers();
        var layer = layers.foreground;

        layer.innerHTML = '';

        if (logoUrl) {
            var logo = document.createElement('img');

            logo.className = PREFIX + '__logo';
            logo.alt = movieTitle(movie);

            logo.onload = function () {
                logo.classList.add('ready');
                layer.classList.add('active');
            };

            logo.onerror = function () {
                logo.remove();
                showFallbackTitle(layer, movie);
            };

            logo.src = logoUrl;

            layer.appendChild(logo);
        } else {
            showFallbackTitle(layer, movie);
        }

        var meta = document.createElement('div');
        meta.className = PREFIX + '__meta';

        var year = movieYear(movie);
        var rating = movieRating(movie);

        if (year) {
            var yearEl = document.createElement('span');
            yearEl.textContent = year;
            meta.appendChild(yearEl);
        }

        if (rating) {
            var ratingEl = document.createElement('span');
            ratingEl.className = PREFIX + '__rating';
            ratingEl.textContent = '★ ' + rating;
            meta.appendChild(ratingEl);
        }

        var typeEl = document.createElement('span');
        typeEl.textContent = movieType(movie) === 'tv'
            ? 'Серіал'
            : 'Фільм';

        meta.appendChild(typeEl);
        layer.appendChild(meta);
    }

    function showFallbackTitle(layer, movie) {
        var title = document.createElement('div');

        title.className = PREFIX + '__title';
        title.textContent = movieTitle(movie);

        layer.appendChild(title);
        layer.classList.add('active');
    }

    function hideLayers() {
        if (background) {
            background.classList.remove('active');
        }

        if (foreground) {
            foreground.classList.remove('active');
        }

        document.body.classList.remove(PREFIX + '-enabled');
    }

    /* -------------------------------------------------------
       TMDB IMAGES
    ------------------------------------------------------- */

    function getImages(movie, callback) {
        var id = movieId(movie);
        var type = movieType(movie);
        var key = type + ':' + id;

        if (!id) {
            callback({
                backdrop: '',
                logo: ''
            });
            return;
        }

        if (cache[key]) {
            callback(cache[key]);
            return;
        }

        if (pending[key]) {
            pending[key].push(callback);
            return;
        }

        pending[key] = [callback];

        var result = {
            backdrop: imageUrl(firstValue(
                movie.backdrop_path,
                movie.backdrop,
                movie.backdrop_url,
                movie.background
            ), 'w1280'),
            logo: ''
        };

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
                    var logos = data && data.logos || [];

                    if (!result.backdrop && backdrops.length) {
                        backdrops.sort(function (a, b) {
                            return (b.vote_average || 0) -
                                (a.vote_average || 0);
                        });

                        result.backdrop = imageUrl(
                            backdrops[0].file_path,
                            'w1280'
                        );
                    }

                    if (logos.length) {
                        logos.sort(function (a, b) {
                            function score(item) {
                                var lang = item.iso_639_1;

                                var languageScore =
                                    lang === 'uk' ? 300 :
                                    lang === 'en' ? 200 :
                                    lang === null ? 100 : 0;

                                return languageScore +
                                    (item.vote_average || 0);
                            }

                            return score(b) - score(a);
                        });

                        result.logo = imageUrl(
                            logos[0].file_path,
                            'w500'
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
       FULL CARD PROCESSING
    ------------------------------------------------------- */

    function processFull(eventData) {
        var movie = getActiveMovie(eventData);

        if (!movie || !movieId(movie)) return;

        var currentIdentity = identity(movie);

        if (!currentIdentity) return;

        if (
            currentIdentity === activeIdentity &&
            background &&
            background.classList.contains('active') &&
            foreground &&
            foreground.classList.contains('active')
        ) {
            return;
        }

        activeIdentity = currentIdentity;

        var currentRequest = ++requestId;

        getImages(movie, function (images) {
            if (currentRequest !== requestId) return;

            if (!images) return;

            if (images.backdrop) {
                showBackground(images.backdrop);
            }

            showForeground(movie, images.logo);
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
        createLayers();

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
                hideLayers();
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
                hideLayers();
            }
        });
    }

    init();

})();
