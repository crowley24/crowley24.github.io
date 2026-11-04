
(function () {
    'use strict';

    /*
     * CINEMATIC FULL 1.0.0
     *
     * Lampa / Android TV / Mobile
     *
     * BASE:
     * - Native Lampa Full component
     * - Cinema layout based on КіноТрейлери 2.3
     *
     * FEATURES:
     * - Fixed cinematic backdrop
     * - Original Trailer Feed gradient
     * - Original Trailer Feed logo selection
     * - Original metadata layout
     * - Original description layout
     * - Native Lampa media buttons
     * - Native Lampa information section
     * - Background remains fixed while scrolling
     * - TMDB logo cache
     * - Mobile responsive layout
     */

    if (!window.Lampa || !window.$) return;
    if (window.cinematic_full_plugin) return;

    window.cinematic_full_plugin = true;

    var tmdb = Lampa.Api.sources.tmdb;

    var PREFIX = 'cinematic-full-';

    var currentId = 0;
    var currentRoot = null;
    var currentMovie = null;
    var requestId = 0;

    var logoCache = {};

    var isMobile =
        (Lampa.Platform && Lampa.Platform.is('mobile')) ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    // --------------------------------------------------
    // CSS
    // --------------------------------------------------

    var css = '' +

        /*
         * FIXED BACKGROUND
         */

        '.cf-background{' +
            'position:fixed;' +
            'left:0;' +
            'top:0;' +
            'width:100%;' +
            'height:100%;' +
            'background-color:#000;' +
            'background-size:cover;' +
            'background-position:center;' +
            'background-repeat:no-repeat;' +
            'z-index:0;' +
            'pointer-events:none;' +
        '}' +

        /*
         * ORIGINAL TRAILER FEED GRADIENT
         * Do not modify these values.
         */

        '.cf-shade{' +
            'position:fixed;' +
            'left:0;' +
            'right:0;' +
            'bottom:0;' +
            'height:100%;' +
            'pointer-events:none;' +
            'z-index:1;' +
            'background:linear-gradient(' +
                'to top,' +
                'rgba(0,0,0,.94) 0%,' +
                'rgba(0,0,0,.65) 48%,' +
                'transparent 100%' +
            ');' +
        '}' +

        /*
         * FULL ROOT
         */

        '.full-start-new.cf-active{' +
            'position:relative;' +
            'z-index:2;' +
            'background:transparent!important;' +
        '}' +

        '.cf-hero{' +
            'position:relative;' +
            'width:100%;' +
            'height:100vh;' +
            'min-height:600px;' +
            'display:flex;' +
            'flex-direction:column;' +
            'justify-content:flex-end;' +
            'box-sizing:border-box;' +
            'background:transparent;' +
        '}' +

        /*
         * ORIGINAL TRAILER FEED INFO POSITION
         */

        '.cf-info{' +
            'position:relative;' +
            'left:0;' +
            'right:0;' +
            'width:100%;' +
            'box-sizing:border-box;' +
            'padding:7em 12em 2.5em 3em;' +
            'z-index:5;' +
        '}' +

        /*
         * LOGO
         * Original Trailer Feed dimensions.
         */

        '.cf-logo{' +
            'display:block;' +
            'max-width:30em;' +
            'max-height:8em;' +
            'margin-bottom:.5em;' +
            'object-fit:contain;' +
            'object-position:left center;' +
            'opacity:0;' +
            'transition:opacity .4s ease;' +
        '}' +

        '.cf-logo.cf-logo--visible{' +
            'opacity:1;' +
        '}' +

        /*
         * TITLE FALLBACK
         */

        '.cf-title{' +
            'font-size:2.6em;' +
            'font-weight:700;' +
            'color:#fff;' +
            'text-shadow:0 2px 12px #000;' +
            'margin:0;' +
            'display:none;' +
        '}' +

        '.cf-title.cf-title--visible{' +
            'display:block;' +
        '}' +

        /*
         * METADATA
         * Original Trailer Feed dimensions.
         */

        '.cf-meta{' +
            'font-size:1.25em;' +
            'color:#fff;' +
            'opacity:.82;' +
            'margin-top:.4em;' +
            'font-weight:400;' +
        '}' +

        /*
         * DESCRIPTION
         * Original Trailer Feed dimensions.
         */

        '.cf-description{' +
            'font-size:1.15em;' +
            'color:#fff;' +
            'opacity:.76;' +
            'margin-top:.65em;' +
            'max-width:70%;' +
            'line-height:1.4;' +
            'display:-webkit-box;' +
            '-webkit-line-clamp:3;' +
            '-webkit-box-orient:vertical;' +
            'overflow:hidden;' +
        '}' +

        /*
         * NATIVE MEDIA BUTTONS
         */

        '.cf-actions{' +
            'position:relative;' +
            'z-index:10;' +
            'margin-top:1.25em;' +
            'width:100%;' +
        '}' +

        '.cf-actions .full-start-new__buttons,' +
        '.cf-actions .full-start__buttons{' +
            'display:flex;' +
            'flex-wrap:wrap;' +
            'align-items:center;' +
            'position:relative;' +
            'margin:0;' +
        '}' +

        /*
         * ORIGINAL FULL ELEMENTS
         * Remove duplicate visual elements.
         */

        '.cf-active .full-start-new__head,' +
        '.cf-active .full-start-new__title,' +
        '.cf-active .full-start-new__tagline,' +
        '.cf-active .full-start-new__poster,' +
        '.cf-active .full-start-new__rate-line,' +
        '.cf-active .full-start-new__details{' +
            'display:none!important;' +
        '}' +

        '.cf-active .full-start__background{' +
            'display:none!important;' +
        '}' +

        '.cf-active .full-descr__text{' +
            'display:none!important;' +
        '}' +

        /*
         * ORIGINAL INFORMATION
         */

        '.cf-active .full-descr,' +
        '.cf-active .full-descr__left,' +
        '.cf-active .full-descr__right{' +
            'position:relative;' +
            'z-index:2;' +
        '}' +

        /*
         * MOBILE
         * Exact Trailer Feed spacing.
         */

        '@media screen and (max-width:768px){' +

            '.cf-hero{' +
                'height:100vh;' +
                'min-height:560px;' +
            '}' +

            '.cf-info{' +
                'padding:4em 8em 12.5em 1.5em;' +
                'right:0;' +
            '}' +

            '.cf-title{' +
                'font-size:1.8em;' +
            '}' +

            '.cf-logo{' +
                'max-width:80%;' +
                'max-height:5em;' +
            '}' +

            '.cf-description{' +
                'font-size:.95em;' +
                'max-width:95%;' +
                '-webkit-line-clamp:3;' +
            '}' +

            '.cf-actions{' +
                'margin-top:1em;' +
            '}' +

        '}';

    // --------------------------------------------------
    // CSS INIT
    // --------------------------------------------------

    function installCSS() {
        if (document.getElementById('cinematic-full-css')) return;

        var style = document.createElement('style');

        style.id = 'cinematic-full-css';
        style.textContent = css;

        document.head.appendChild(style);
    }

    // --------------------------------------------------
    // HELPERS
    // --------------------------------------------------

    function getTitle(movie) {
        return (
            movie.title ||
            movie.name ||
            movie.original_title ||
            movie.original_name ||
            ''
        );
    }

    function getMethod(movie) {
        if (
            movie.media_type === 'tv' ||
            movie.method === 'tv' ||
            movie.type === 'tv' ||
            (!movie.title && !!movie.name)
        ) {
            return 'tv';
        }

        return 'movie';
    }

    function getDate(movie) {
        return (
            movie.release_date ||
            movie.first_air_date ||
            ''
        );
    }

    function getGenres(movie, method) {
        var names = [];

        if (
            tmdb &&
            typeof tmdb.getGenresNameFromIds === 'function' &&
            movie.genre_ids
        ) {
            try {
                names = tmdb.getGenresNameFromIds(
                    method,
                    movie.genre_ids
                );
            } catch (e) {}
        }

        if (!names.length && Array.isArray(movie.genres)) {
            names = movie.genres.map(function (genre) {
                return genre.name || '';
            });
        }

        return names.filter(Boolean).slice(0, 3).join(', ');
    }

    // --------------------------------------------------
    // LOGO SELECTION
    // Same selection logic as Trailer Feed 2.3.
    // --------------------------------------------------

    function pickLogo(logos) {
        var lang = Lampa.Storage.field('tmdb_lang');

        var order = [
            lang,
            'en',
            null
        ];

        for (var i = 0; i < order.length; i++) {
            var found = logos.filter(function (logo) {
                return logo.iso_639_1 === order[i];
            })[0];

            if (found) return found;
        }

        return logos[0] || null;
    }

    // --------------------------------------------------
    // LOGO REQUEST
    // --------------------------------------------------

    function ensureLogo(movie, method, callback) {
        var key = method + '_' + movie.id;

        if (logoCache[key] !== undefined) {
            callback(logoCache[key]);
            return;
        }

        var lang = Lampa.Storage.field('tmdb_lang');

        var langs = (lang || 'en') + ',en,null';

        tmdb.get(
            method + '/' + movie.id + '/images',

            {
                filter: {
                    include_image_language: langs
                }
            },

            function (json) {
                var logo = json.logos && json.logos.length
                    ? pickLogo(json.logos)
                    : null;

                var url = logo
                    ? Lampa.Api.img(logo.file_path, 'w500')
                    : null;

                logoCache[key] = url;

                callback(url);
            },

            function () {
                logoCache[key] = null;

                callback(null);
            }
        );
    }

    // --------------------------------------------------
    // BACKGROUND
    // --------------------------------------------------

    function createBackground(movie) {
        $('.cf-background, .cf-shade').remove();

        var background = $('<div class="cf-background"></div>');
        var shade = $('<div class="cf-shade"></div>');

        if (movie.backdrop_path) {
            background.css(
                'background-image',
                'url("' +
                Lampa.Api.img(movie.backdrop_path, 'w1280') +
                '")'
            );
        }

        $('body').append(background);
        $('body').append(shade);
    }

    // --------------------------------------------------
    // METADATA
    // Same structure as Trailer Feed 2.3.
    // --------------------------------------------------

    function createMetadata(movie, method) {
        var date = getDate(movie);

        var genres = getGenres(movie, method);

        var rating = Number(movie.vote_average) || 0;

        var meta = [
            date.slice(0, 4),
            rating ? '★ ' + rating.toFixed(1) : '',
            genres
        ].filter(Boolean).join(' · ');

        return meta;
    }

    // --------------------------------------------------
    // HERO CREATION
    // --------------------------------------------------

    function createHero(root, movie, method) {
        root.find('.cf-hero').remove();

        var hero = $(
            '<div class="cf-hero">' +
                '<div class="cf-info">' +

                    '<img class="cf-logo" alt="">' +

                    '<div class="cf-title"></div>' +

                    '<div class="cf-meta"></div>' +

                    '<div class="cf-description"></div>' +

                    '<div class="cf-actions"></div>' +

                '</div>' +
            '</div>'
        );

        var logo = hero.find('.cf-logo');
        var title = hero.find('.cf-title');

        var movieTitle = getTitle(movie);

        hero.find('.cf-meta').text(
            createMetadata(movie, method)
        );

        hero.find('.cf-description').text(
            movie.overview || ''
        );

        /*
         * Native buttons are moved, not recreated.
         */

        var buttons = root.find(
            '.full-start-new__buttons, .full-start__buttons'
        ).filter(function () {
            return !$(this).closest('.cf-hero').length;
        }).first();

        if (buttons.length) {
            hero.find('.cf-actions').append(buttons);
        }

        /*
         * Native reactions, when present.
         */

        var reactions = root.find(
            '.full-start-new__reactions'
        ).filter(function () {
            return !$(this).closest('.cf-hero').length;
        }).first();

        if (reactions.length) {
            hero.find('.cf-actions').append(reactions);
        }

        /*
         * Insert hero before the native information body.
         */

        var body = root.find('.full-start-new__body').first();

        if (body.length) {
            body.before(hero);
        } else {
            root.prepend(hero);
        }

        /*
         * TMDB logo.
         */

        title.text(movieTitle);

        ensureLogo(movie, method, function (url) {
            if (
                currentId !== movie.id ||
                !hero.closest('body').length
            ) {
                return;
            }

            if (url) {
                logo.attr('src', url);

                logo.off('load.cinematic error.cinematic');

                logo.on('load.cinematic', function () {
                    logo.addClass('cf-logo--visible');
                    title.removeClass('cf-title--visible');
                });

                logo.on('error.cinematic', function () {
                    logo.hide();
                    title.addClass('cf-title--visible');
                });

                /*
                 * Handle images already in browser cache.
                 */

                if (logo[0].complete && logo[0].naturalWidth) {
                    logo.addClass('cf-logo--visible');
                }
            } else {
                logo.hide();
                title.addClass('cf-title--visible');
            }
        });

        return hero;
    }

    // --------------------------------------------------
    // CLEANUP
    // --------------------------------------------------

    function cleanup() {
        requestId++;

        $('.cf-background, .cf-shade').remove();

        if (currentRoot && currentRoot.length) {
            currentRoot.removeClass('cf-active');

            currentRoot.find('.cf-hero').remove();
        }

        currentRoot = null;
        currentMovie = null;
        currentId = 0;
    }

    // --------------------------------------------------
    // APPLY INTERFACE
    // --------------------------------------------------

    function applyInterface(event) {
        if (!event || !event.data || !event.data.movie) return;

        var movie = event.data.movie;

        if (!movie.id) return;

        var root = null;

        /*
         * Prefer the actual activity DOM.
         */

        try {
            if (
                event.object &&
                event.object.activity &&
                event.object.activity.render
            ) {
                root = event.object.activity.render();
            }
        } catch (e) {}

        if (!root || !root.length) {
            root = $('.full-start-new').first();
        } else {
            root = $(root).find('.full-start-new').first();
        }

        if (!root.length) return;

        cleanup();

        var myRequest = requestId;

        currentId = movie.id;
        currentMovie = movie;
        currentRoot = root;

        var method = getMethod(movie);

        installCSS();

        /*
         * Background remains outside the scrolling content.
         */

        createBackground(movie);

        root.addClass('cf-active');

        /*
         * Build cinematic hero.
         */

        createHero(root, movie, method);

        /*
         * Protect against stale activity callbacks.
         */

        if (myRequest !== requestId) return;
    }

    // --------------------------------------------------
    // FULL COMPONENT EVENTS
    // --------------------------------------------------

    Lampa.Listener.follow('full', function (event) {
        if (event.type === 'complite') {
            applyInterface(event);
        }
    });

    // --------------------------------------------------
    // ACTIVITY CLEANUP
    // --------------------------------------------------

    Lampa.Listener.follow('activity', function (event) {
        if (
            event.type === 'back' ||
            event.type === 'destroy'
        ) {
            if (
                !Lampa.Activity.active ||
                !Lampa.Activity.active() ||
                Lampa.Activity.active().component !== 'full'
            ) {
                cleanup();
            }
        }
    });

    // --------------------------------------------------
    // INIT
    // --------------------------------------------------

    function start() {
        installCSS();
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                start();
            }
        });
    }

})();
