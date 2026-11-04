
(function () {
    'use strict';

    /*
     * CINEMATIC FULL 1.0.2
     *
     * Lampa / Android TV / Mobile
     *
     * FIXES 1.0.2:
     * - Fullscreen fixed gradient overlay
     * - Gradient covers entire viewport
     * - Gradient does not move while scrolling
     * - Gradient reaches all screen edges
     * - Background remains fixed
     * - Reliable background and shade cleanup
     * - Native media buttons are restored on cleanup
     *
     * DESIGN:
     * - Original КіноТрейлери 2.3 gradient values
     * - Original logo dimensions
     * - Original metadata dimensions
     * - Original description dimensions
     */

    if (!window.Lampa || !window.$) return;
    if (window.cinematic_full_plugin) return;

    window.cinematic_full_plugin = true;

    var tmdb = Lampa.Api.sources.tmdb;

    var currentId = 0;
    var currentRoot = null;
    var currentMovie = null;
    var requestId = 0;

    var logoCache = {};
    var movedElements = [];

    var observer = null;
    var observerTimer = null;
    var cleanupTimer = null;

    var cardActive = false;
    var cleaning = false;

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
            'inset:0;' +
            'width:100%;' +
            'height:100%;' +
            'background-color:#000;' +
            'background-size:cover;' +
            'background-position:center;' +
            'background-repeat:no-repeat;' +
            'transform:scale(1.01);' +
            'z-index:0;' +
            'pointer-events:none;' +
        '}' +

        /*
         * FULLSCREEN FIXED GRADIENT
         *
         * Original Trailer Feed gradient.
         * Exact original values.
         */

        '.cf-shade{' +
            'position:fixed;' +
            'inset:0;' +
            'width:100%;' +
            'height:100%;' +
            'pointer-events:none;' +
            'z-index:1;' +
            'background:linear-gradient(to top,rgba(0,0,0,.94) 0%,rgba(0,0,0,.65) 48%,transparent 100%);' +
        '}' +

        /*
         * FULL ROOT
         */

        '.full-start-new.cf-active{' +
            'position:relative;' +
            'z-index:2;' +
            'background:transparent!important;' +
            'background-image:none!important;' +
        '}' +

        /*
         * REMOVE NATIVE BACKDROP
         */

        '.cf-active .full-start-new__background,' +
        '.cf-active .full-start__background,' +
        '.cf-active .full-start-new__bg,' +
        '.cf-active .full-start__bg,' +
        '.cf-active .full-start-new__backdrop,' +
        '.cf-active .full-start__backdrop{' +
            'display:none!important;' +
            'background:none!important;' +
            'background-image:none!important;' +
        '}' +

        /*
         * HERO
         */

        '.cf-hero{' +
            'position:relative;' +
            'width:100%;' +
            'height:100vh;' +
            'min-height:600px;' +
            'box-sizing:border-box;' +
            'background:transparent!important;' +
        '}' +

        /*
         * INFO
         *
         * Gradient is no longer here.
         * It is now a separate fullscreen layer.
         */

        '.cf-info{' +
            'position:absolute;' +
            'left:0;' +
            'right:0;' +
            'bottom:0;' +
            'width:100%;' +
            'box-sizing:border-box;' +
            'padding:7em 12em 2.5em 3em;' +
            'z-index:5;' +
            'background:transparent!important;' +
        '}' +

        /*
         * LOGO
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
            'filter:none!important;' +
            'box-shadow:none!important;' +
            'text-shadow:none!important;' +
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
         * HIDE DUPLICATE NATIVE ELEMENTS
         */

        '.cf-active .full-start-new__head,' +
        '.cf-active .full-start-new__title,' +
        '.cf-active .full-start-new__tagline,' +
        '.cf-active .full-start-new__poster,' +
        '.cf-active .full-start-new__rate-line,' +
        '.cf-active .full-start-new__details{' +
            'display:none!important;' +
        '}' +

        '.cf-active .full-descr__text{' +
            'display:none!important;' +
        '}' +

        /*
         * NATIVE INFORMATION SECTION
         */

        '.cf-active .full-descr,' +
        '.cf-active .full-descr__left,' +
        '.cf-active .full-descr__right{' +
            'position:relative;' +
            'z-index:2;' +
        '}' +

        /*
         * MOBILE
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
        return movie.release_date || movie.first_air_date || '';
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
    // --------------------------------------------------

    function pickLogo(logos) {
        var lang = Lampa.Storage.field('tmdb_lang');

        var order = [lang, 'en', null];

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

        if (!tmdb || typeof tmdb.get !== 'function') {
            callback(null);
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
                var logos = json && json.logos ? json.logos : [];

                var logo = logos.length ? pickLogo(logos) : null;

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
    // BACKGROUND + FULLSCREEN SHADE
    // --------------------------------------------------

    function createBackground(movie) {
        $('.cf-background, .cf-shade').remove();

        var background = $('<div class="cf-background"></div>');
        var shade = $('<div class="cf-shade"></div>');

        if (movie.backdrop_path) {
            background.css(
                'background-image',
                'url("' + Lampa.Api.img(movie.backdrop_path, 'w1280') + '")'
            );
        }

        $('body').append(background);
        $('body').append(shade);
    }

    // --------------------------------------------------
    // METADATA
    // --------------------------------------------------

    function createMetadata(movie, method) {
        var date = getDate(movie);
        var genres = getGenres(movie, method);
        var rating = Number(movie.vote_average) || 0;

        return [
            date.slice(0, 4),
            rating ? '★ ' + rating.toFixed(1) : '',
            genres
        ].filter(Boolean).join(' · ');
    }

    // --------------------------------------------------
    // NATIVE ELEMENT RESTORATION
    // --------------------------------------------------

    function moveNativeElement(element, destination) {
        if (!element || !element.length || !destination || !destination.length) {
            return;
        }

        var node = element[0];

        if (!node.parentNode) return;

        var placeholder = document.createComment('cinematic-full-placeholder');

        node.parentNode.insertBefore(placeholder, node);

        movedElements.push({
            node: node,
            placeholder: placeholder
        });

        destination.append(node);
    }

    function restoreNativeElements() {
        movedElements.forEach(function (item) {
            if (
                item.placeholder &&
                item.placeholder.parentNode &&
                item.node
            ) {
                item.placeholder.parentNode.insertBefore(
                    item.node,
                    item.placeholder
                );

                item.placeholder.parentNode.removeChild(item.placeholder);
            }
        });

        movedElements = [];
    }

    // --------------------------------------------------
    // HERO
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
        var actions = hero.find('.cf-actions');

        var movieTitle = getTitle(movie);

        hero.find('.cf-meta').text(
            createMetadata(movie, method)
        );

        hero.find('.cf-description').text(
            movie.overview || ''
        );

        /*
         * Move native Lampa buttons.
         * Original nodes and handlers are preserved.
         */

        var buttons = root.find(
            '.full-start-new__buttons, .full-start__buttons'
        ).filter(function () {
            return !$(this).closest('.cf-hero').length;
        }).first();

        if (buttons.length) {
            moveNativeElement(buttons, actions);
        }

        var reactions = root.find(
            '.full-start-new__reactions'
        ).filter(function () {
            return !$(this).closest('.cf-hero').length;
        }).first();

        if (reactions.length) {
            moveNativeElement(reactions, actions);
        }

        /*
         * Insert hero before native information body.
         */

        var body = root.find('.full-start-new__body').first();

        if (body.length) {
            body.before(hero);
        } else {
            root.prepend(hero);
        }

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
    // ACTIVITY HELPERS
    // --------------------------------------------------

    function getActiveComponent() {
        try {
            if (
                Lampa.Activity &&
                typeof Lampa.Activity.active === 'function'
            ) {
                var active = Lampa.Activity.active();

                return active && active.component
                    ? active.component
                    : null;
            }
        } catch (e) {}

        return null;
    }

    function isRootVisible() {
        if (!currentRoot || !currentRoot.length) return false;

        var node = currentRoot[0];

        if (!node || !document.body.contains(node)) return false;

        if (
            typeof currentRoot.is === 'function' &&
            !currentRoot.is(':visible')
        ) {
            return false;
        }

        return true;
    }

    // --------------------------------------------------
    // CLEANUP
    // --------------------------------------------------

    function cleanup() {
        if (cleaning) return;

        cleaning = true;

        requestId++;

        if (observerTimer) {
            clearTimeout(observerTimer);
            observerTimer = null;
        }

        if (cleanupTimer) {
            clearTimeout(cleanupTimer);
            cleanupTimer = null;
        }

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        /*
         * Restore native controls before removing hero.
         */

        restoreNativeElements();

        /*
         * Remove both fixed visual layers.
         */

        $('.cf-background, .cf-shade').remove();

        /*
         * Restore original Lampa root.
         */

        if (currentRoot && currentRoot.length) {
            currentRoot.removeClass('cf-active');
            currentRoot.find('.cf-hero').remove();
        }

        currentRoot = null;
        currentMovie = null;
        currentId = 0;

        cardActive = false;

        cleaning = false;
    }

    // --------------------------------------------------
    // OBSERVER
    // --------------------------------------------------

    function checkActivity() {
        if (!cardActive || cleaning) return;

        var activeComponent = getActiveComponent();

        if (activeComponent && activeComponent !== 'full') {
            cleanup();
            return;
        }

        if (!isRootVisible()) {
            cleanup();
        }
    }

    function startObserver() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }

        if (!document.body || !window.MutationObserver) return;

        observer = new MutationObserver(function () {
            if (observerTimer) clearTimeout(observerTimer);

            observerTimer = setTimeout(function () {
                checkActivity();
            }, 350);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }

    // --------------------------------------------------
    // APPLY INTERFACE
    // --------------------------------------------------

    function findFullRoot(event) {
        var root = null;

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
            root = $(root);

            if (!root.is('.full-start-new')) {
                root = root.find('.full-start-new').first();
            }
        }

        return root;
    }

    function applyInterface(event) {
        if (!event || !event.data || !event.data.movie) return;

        var movie = event.data.movie;

        if (!movie.id) return;

        var root = findFullRoot(event);

        if (!root || !root.length) return;

        cleanup();

        var myRequest = requestId;

        currentId = movie.id;
        currentMovie = movie;
        currentRoot = root;

        var method = getMethod(movie);

        installCSS();

        /*
         * Create one background and one fullscreen gradient.
         */

        createBackground(movie);

        root.addClass('cf-active');

        createHero(root, movie, method);

        cardActive = true;

        startObserver();

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
    // ACTIVITY EVENTS
    // --------------------------------------------------

    Lampa.Listener.follow('activity', function () {
        if (!cardActive) return;

        if (cleanupTimer) clearTimeout(cleanupTimer);

        cleanupTimer = setTimeout(function () {
            var activeComponent = getActiveComponent();

            if (
                activeComponent &&
                activeComponent !== 'full'
            ) {
                cleanup();
                return;
            }

            if (!isRootVisible()) {
                cleanup();
            }
        }, 250);
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
