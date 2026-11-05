
(function () {
    'use strict';

    /*
     * INTERFACE+ CINEMATIC FULL CARD 1.0.1
     *
     * Lampa / Android TV
     *
     * FIX 1.0.1:
     * - Fixed Start.onCreate / draw conflict
     * - No modifications during activity creation
     * - Waits for full card completion
     * - Does not remove native Lampa elements
     * - Does not hide native buttons
     * - Safe overlay insertion
     * - TMDB-only backdrop and logo
     * - Ukrainian > English metadata preference
     */

    var VERSION = '1.0.1';
    var READY_KEY = 'interface_plus_cinematic_full_card_101';

    if (window[READY_KEY]) return;
    window[READY_KEY] = true;

    var PREFIX = 'ip-cinematic-card-101';
    var STYLE_ID = PREFIX + '-style';

    var activeRoot = null;
    var activeOverlay = null;
    var requestId = 0;
    var lastIdentity = '';
    var retryTimer = null;

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

    function clean(value) {
        return text(value).replace(/<[^>]*>/g, '').trim();
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
        return clean(firstValue(
            movie.title,
            movie.name,
            movie.original_title,
            movie.original_name
        ));
    }

    function movieOverview(movie) {
        return clean(firstValue(
            movie.overview,
            movie.description,
            movie.plot
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

    function getRoot() {
        var selectors = [
            '.full-start',
            '.full-start-new',
            '.full'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var elements = document.querySelectorAll(selectors[i]);

            for (var j = elements.length - 1; j >= 0; j--) {
                var element = elements[j];

                if (
                    element &&
                    element.offsetWidth > 0 &&
                    element.offsetHeight > 0
                ) {
                    return element;
                }
            }
        }

        return null;
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
            .${PREFIX} {
                position: relative;
                width: 100%;
                height: 58vh;
                min-height: 340px;
                max-height: 650px;
                overflow: hidden;
                pointer-events: none;
                z-index: 2;
                margin-bottom: 1.5em;
                background: #080808;
                isolation: isolate;
            }

            .${PREFIX}__backdrop {
                position: absolute;
                inset: 0;
                background-position: center 30%;
                background-size: cover;
                background-repeat: no-repeat;
                opacity: 0;
                transition: opacity .55s ease;
                transform: scale(1.015);
            }

            .${PREFIX}__backdrop.ready {
                opacity: 1;
            }

            .${PREFIX}__shade {
                position: absolute;
                inset: 0;
                background:
                    linear-gradient(
                        90deg,
                        rgba(0,0,0,.94) 0%,
                        rgba(0,0,0,.75) 25%,
                        rgba(0,0,0,.28) 65%,
                        rgba(0,0,0,.10) 100%
                    ),
                    linear-gradient(
                        0deg,
                        #080808 0%,
                        rgba(8,8,8,.72) 18%,
                        transparent 65%
                    );
            }

            .${PREFIX}__content {
                position: absolute;
                left: 5%;
                bottom: 12%;
                width: 48%;
                max-width: 650px;
                color: #fff;
            }

            .${PREFIX}__logo {
                display: block;
                width: auto;
                height: auto;
                max-width: 100%;
                max-height: 150px;
                object-fit: contain;
                object-position: left bottom;
                margin-bottom: 22px;
                opacity: 0;
                transition: opacity .35s ease;
            }

            .${PREFIX}__logo.ready {
                opacity: 1;
            }

            .${PREFIX}__title {
                font-size: 2.5em;
                line-height: 1.08;
                font-weight: 700;
                margin-bottom: 15px;
                text-shadow: 0 2px 15px rgba(0,0,0,.5);
            }

            .${PREFIX}__meta {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 15px;
                font-size: 1.05em;
                color: rgba(255,255,255,.85);
            }

            .${PREFIX}__rating {
                color: #fff;
                font-weight: 700;
            }

            .${PREFIX}__overview {
                font-size: 1em;
                line-height: 1.5;
                color: rgba(255,255,255,.78);
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
                max-width: 95%;
            }

            @media (max-width: 700px) {
                .${PREFIX} {
                    height: 48vh;
                    min-height: 260px;
                }

                .${PREFIX}__content {
                    left: 5%;
                    bottom: 10%;
                    width: 80%;
                }

                .${PREFIX}__logo {
                    max-height: 95px;
                    max-width: 85%;
                }

                .${PREFIX}__title {
                    font-size: 1.8em;
                }

                .${PREFIX}__overview {
                    font-size: .9em;
                    -webkit-line-clamp: 2;
                }
            }
        `;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;

        document.head.appendChild(style);
    }

    /* -------------------------------------------------------
       TMDB
    ------------------------------------------------------- */

    function getImages(movie, callback) {
        var id = movieId(movie);

        if (!id || !window.Lampa || !Lampa.Api || !Lampa.Api.sources) {
            callback({});
            return;
        }

        var type = movieType(movie);
        var key = type + ':' + id;

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
            backdrop: '',
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

                    if (backdrops.length) {
                        var backdrop = backdrops.slice().sort(function (a, b) {
                            return (b.vote_average || 0) -
                                (a.vote_average || 0);
                        })[0];

                        result.backdrop = imageUrl(
                            backdrop.file_path,
                            'w1280'
                        );
                    }

                    if (logos.length) {
                        var sorted = logos.slice().sort(function (a, b) {
                            function score(item) {
                                var lang = item.iso_639_1;

                                return (
                                    (lang === 'uk' ? 100 : 0) +
                                    (lang === 'en' ? 50 : 0) +
                                    (lang === null ? 20 : 0) +
                                    (item.vote_average || 0)
                                );
                            }

                            return score(b) - score(a);
                        });

                        result.logo = imageUrl(
                            sorted[0].file_path,
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
       OVERLAY
    ------------------------------------------------------- */

    function removeOverlay() {
        if (activeOverlay && activeOverlay.parentNode) {
            activeOverlay.parentNode.removeChild(activeOverlay);
        }

        activeOverlay = null;
        activeRoot = null;
    }

    function createElement(tag, className) {
        var element = document.createElement(tag);
        element.className = className;

        return element;
    }

    function createOverlay(root, movie, images) {
        if (!root || !movie) return;

        if (!document.body.contains(root)) return;

        if (activeRoot === root && activeOverlay) return;

        removeOverlay();

        var overlay = createElement('div', PREFIX);
        var backdrop = createElement('div', PREFIX + '__backdrop');
        var shade = createElement('div', PREFIX + '__shade');
        var content = createElement('div', PREFIX + '__content');

        var title = createElement('div', PREFIX + '__title');
        var meta = createElement('div', PREFIX + '__meta');
        var overview = createElement('div', PREFIX + '__overview');

        var logo = createElement('img', PREFIX + '__logo');

        title.textContent = movieTitle(movie);

        var year = movieYear(movie);
        var rating = movieRating(movie);

        if (year) {
            var yearEl = document.createElement('span');
            yearEl.textContent = year;
            meta.appendChild(yearEl);
        }

        if (rating) {
            var ratingEl = createElement('span', PREFIX + '__rating');
            ratingEl.textContent = '★ ' + rating;
            meta.appendChild(ratingEl);
        }

        if (movieType(movie) === 'tv') {
            var typeEl = document.createElement('span');
            typeEl.textContent = 'Серіал';
            meta.appendChild(typeEl);
        } else {
            var typeElMovie = document.createElement('span');
            typeElMovie.textContent = 'Фільм';
            meta.appendChild(typeElMovie);
        }

        overview.textContent = movieOverview(movie);

        if (images.backdrop) {
            backdrop.style.backgroundImage =
                'url("' + images.backdrop + '")';

            requestAnimationFrame(function () {
                backdrop.classList.add('ready');
            });
        }

        if (images.logo) {
            logo.onload = function () {
                logo.classList.add('ready');
                title.style.display = 'none';
            };

            logo.onerror = function () {
                logo.style.display = 'none';
            };

            logo.src = images.logo;
        } else {
            logo.style.display = 'none';
        }

        content.appendChild(logo);
        content.appendChild(title);

        if (meta.children.length) {
            content.appendChild(meta);
        }

        if (overview.textContent) {
            content.appendChild(overview);
        }

        overlay.appendChild(backdrop);
        overlay.appendChild(shade);
        overlay.appendChild(content);

        /*
         * IMPORTANT:
         * We only append a visual layer.
         * We do not replace, clear, or modify Start containers.
         * Native buttons and controls remain untouched.
         */

        root.insertBefore(overlay, root.firstChild);

        activeRoot = root;
        activeOverlay = overlay;
    }

    /* -------------------------------------------------------
       START AFTER FULL IS CREATED
    ------------------------------------------------------- */

    function processFull(eventData) {
        var movie = getActiveMovie(eventData);

        if (!movie || !movieId(movie)) return;

        var currentIdentity = identity(movie);

        if (!currentIdentity) return;

        if (
            currentIdentity === lastIdentity &&
            activeOverlay &&
            activeRoot &&
            document.body.contains(activeRoot)
        ) {
            return;
        }

        lastIdentity = currentIdentity;

        var currentRequest = ++requestId;

        var root = getRoot();

        if (!root) {
            setTimeout(function () {
                if (currentRequest !== requestId) return;

                root = getRoot();

                if (!root) return;

                loadImagesAndRender(root, movie, currentRequest);
            }, 350);

            return;
        }

        loadImagesAndRender(root, movie, currentRequest);
    }

    function loadImagesAndRender(root, movie, currentRequest) {
        getImages(movie, function (images) {
            if (currentRequest !== requestId) return;

            var currentRoot = getRoot();

            if (!currentRoot) return;

            if (!document.body.contains(currentRoot)) return;

            createOverlay(currentRoot, movie, images);
        });
    }

    /* -------------------------------------------------------
       LAMPA EVENTS
    ------------------------------------------------------- */

    function init() {
        if (!window.Lampa || !Lampa.Listener) {
            setTimeout(init, 500);
            return;
        }

        addStyles();

        Lampa.Listener.follow('full', function (event) {
            if (!event) return;

            /*
             * Lampa versions may use either spelling.
             * Do not run during Start.onCreate.
             */

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
                lastIdentity = '';
                removeOverlay();
            }
        });

        Lampa.Listener.follow('activity', function (event) {
            if (!event) return;

            if (
                event.type === 'start' ||
                event.type === 'destroy'
            ) {
                requestId++;
                lastIdentity = '';
                removeOverlay();
            }
        });
    }

    init();

})();
