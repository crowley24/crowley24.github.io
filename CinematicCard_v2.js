(function () {
    'use strict';

    /*
     * CINEMATIC FULL 1.1.0 — PREMIUM POLISH
     *
     * Lampa / Android TV / Mobile
     *
     * CHANGES 1.1.0:
     * - Bright and saturated original backdrop preserved
     * - Subtle fixed left-side vignette
     * - Softer fixed bottom gradient
     * - Both filters remain stationary while scrolling
     * - Studio logo fades in first
     * - Movie logo fades in with a slight delay
     * - Opacity-only logo animations
     * - Structured metadata row
     * - Improved description width and line spacing
     * - Optimized gradient height calculations
     * - ResizeObserver for information block size
     * - Reduced MutationObserver workload
     * - Stronger protection against stale TMDB callbacks
     *
     * BASE:
     * - CINEMATIC FULL 1.0.7
     *
     * PRESERVED:
     * - Exact movie logo dimensions from Trailer Feed 2.3
     * - Single production studio logo
     * - Original studio logo colors
     * - Black monochrome studio logos converted to white
     * - Native Lampa media buttons and reactions
     * - Fixed viewport background
     * - Original information block composition
     * - Gradient height adjustment: -150px
     */

    if (!window.Lampa || !window.$) return;
    if (window.cinematic_full_plugin) return;

    window.cinematic_full_plugin = true;

    var tmdb = Lampa.Api.sources.tmdb;

    var currentId = 0;
    var currentMethod = '';
    var currentRoot = null;
    var currentMovie = null;

    /*
     * Every cleanup invalidates callbacks from the previous card.
     */

    var requestId = 0;

    var logoCache = {};
    var studioCache = {};

    var movedElements = [];

    var observer = null;
    var observerTimer = null;
    var cleanupTimer = null;
    var logoTimer = null;

    var gradientObserver = null;
    var gradientResizeHandler = null;

    var cardActive = false;
    var cleaning = false;

    var isMobile =
        (Lampa.Platform && Lampa.Platform.is('mobile')) ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    // --------------------------------------------------
    // GRADIENTS
    // --------------------------------------------------

    /*
     * Subtle bottom gradient.
     * The backdrop itself remains bright and saturated.
     */

    var ORIGINAL_GRADIENT =
        'linear-gradient(to top,' +
        'rgba(0,0,0,.72) 0%,' +
        'rgba(0,0,0,.36) 48%,' +
        'transparent 100%)';

    /*
     * Very subtle left-side shading.
     * Fixed to the viewport, not to the scrolling card.
     */

    var LEFT_GRADIENT =
        'linear-gradient(to right,' +
        'rgba(0,0,0,.22) 0%,' +
        'rgba(0,0,0,.12) 28%,' +
        'rgba(0,0,0,.035) 52%,' +
        'transparent 72%)';

    // --------------------------------------------------
    // CSS
    // --------------------------------------------------

    var css = '' +

        /*
         * BACKGROUND IMAGE
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
            'transform:scale(1.01);' +
            'z-index:0;' +
            'pointer-events:none;' +
        '}' +

        /*
         * FIXED LEFT VIGNETTE
         */

        '.cf-vignette-fixed{' +
            'position:fixed;' +
            'left:0;' +
            'top:0;' +
            'right:0;' +
            'bottom:0;' +
            'width:100%;' +
            'height:100%;' +
            'background:' + LEFT_GRADIENT + ';' +
            'z-index:1;' +
            'pointer-events:none;' +
        '}' +

        /*
         * FIXED BOTTOM GRADIENT
         */

        '.cf-gradient-fixed{' +
            'position:fixed;' +
            'left:0;' +
            'right:0;' +
            'bottom:0;' +
            'width:100%;' +
            'height:0;' +
            'background:' + ORIGINAL_GRADIENT + ';' +
            'z-index:1;' +
            'pointer-events:none;' +
            'contain:layout paint;' +
        '}' +

        /*
         * ACTIVE LAMPA ROOT
         */

        '.full-start-new.cf-active{' +
            'position:relative;' +
            'z-index:2;' +
            'background:transparent!important;' +
            'background-image:none!important;' +
        '}' +

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
         * INFORMATION BLOCK
         */

        '.cf-info{' +
            'position:absolute;' +
            'left:0;' +
            'right:0;' +
            'bottom:0;' +
            'width:100%;' +
            'box-sizing:border-box;' +
            'padding:7em 3em 2.5em 1.5em;' +
            'z-index:5;' +
            'background:transparent!important;' +
        '}' +

        /*
         * STUDIO LOGO
         * Appears first.
         */

        '.cf-studio{' +
            'display:none;' +
            'width:auto;' +
            'height:2.3em;' +
            'max-width:9em;' +
            'max-height:2.3em;' +
            'object-fit:contain;' +
            'object-position:left center;' +
            'margin:0 0 .85em 0;' +
            'opacity:0;' +
            'filter:none;' +
            'transition:opacity .45s ease;' +
        '}' +

        '.cf-studio.cf-studio--visible{' +
            'opacity:1;' +
        '}' +

        '.cf-studio.cf-studio--white{' +
            'filter:brightness(0) invert(1);' +
        '}' +

        /*
         * MAIN MOVIE LOGO
         * Exact sizing from Trailer Feed 2.3.
         */

        '.cf-logo{' +
            'display:block;' +
            'max-width:30em;' +
            'max-height:8em;' +
            'margin-bottom:.5em;' +
            'object-fit:contain;' +
            'object-position:left center;' +
            'opacity:0;' +
            'transition:opacity .5s ease;' +
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
            'display:flex;' +
            'flex-direction:row;' +
            'flex-wrap:wrap;' +
            'align-items:center;' +
            'gap:.35em .75em;' +
            'margin-top:.65em;' +
            'font-size:1.08em;' +
            'font-weight:400;' +
            'line-height:1.4;' +
            'color:rgba(255,255,255,.78);' +
            'opacity:1;' +
        '}' +

        '.cf-meta-item{' +
            'display:inline-flex;' +
            'align-items:center;' +
            'min-height:1.4em;' +
            'white-space:nowrap;' +
        '}' +

        '.cf-meta-rating{' +
            'color:rgba(255,255,255,.88);' +
        '}' +

        '.cf-meta-star{' +
            'margin-right:.28em;' +
            'font-size:.95em;' +
            'color:rgba(255,255,255,.72);' +
        '}' +

        '.cf-meta-genres{' +
            'white-space:normal;' +
        '}' +

        /*
         * DESCRIPTION
         */

        '.cf-description{' +
            'font-size:1.1em;' +
            'font-weight:400;' +
            'color:rgba(255,255,255,.82);' +
            'margin-top:.75em;' +
            'max-width:62%;' +
            'line-height:1.48;' +
            'display:-webkit-box;' +
            '-webkit-line-clamp:3;' +
            '-webkit-box-orient:vertical;' +
            'overflow:hidden;' +
            'text-shadow:0 1px 5px rgba(0,0,0,.2);' +
        '}' +

        /*
         * MEDIA BUTTONS + REACTIONS
         */

        '.cf-actions{' +
            'position:relative;' +
            'z-index:10;' +
            'margin-top:1.25em;' +
            'width:100%;' +
            'display:flex;' +
            'flex-direction:row;' +
            'align-items:center;' +
            'justify-content:space-between;' +
            'gap:1.5em;' +
        '}' +

        '.cf-actions .full-start-new__buttons,' +
        '.cf-actions .full-start__buttons{' +
            'display:flex;' +
            'flex:1 1 auto;' +
            'flex-wrap:wrap;' +
            'align-items:center;' +
            'position:relative;' +
            'margin:0;' +
            'min-width:0;' +
        '}' +

        /*
         * REACTIONS ON THE RIGHT
         */

        '.cf-actions .full-start-new__reactions{' +
            'display:flex;' +
            'flex:0 0 auto;' +
            'align-items:center;' +
            'justify-content:flex-end;' +
            'position:relative;' +
            'margin:0 0 0 auto;' +
            'width:auto;' +
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
                'padding:4em 1.5em 12.5em 1.5em;' +
                'right:0;' +
            '}' +

            '.cf-studio{' +
                'height:1.7em;' +
                'max-width:7em;' +
                'max-height:1.7em;' +
                'margin-bottom:.65em;' +
            '}' +

            '.cf-title{' +
                'font-size:1.8em;' +
            '}' +

            '.cf-logo{' +
                'max-width:80%;' +
                'max-height:5em;' +
            '}' +

            '.cf-meta{' +
                'font-size:.9em;' +
                'gap:.3em .55em;' +
                'margin-top:.55em;' +
            '}' +

            '.cf-description{' +
                'font-size:.95em;' +
                'max-width:95%;' +
                'line-height:1.45;' +
                '-webkit-line-clamp:3;' +
            '}' +

            '.cf-actions{' +
                'margin-top:1em;' +
                'gap:.75em;' +
            '}' +

            '.cf-actions .full-start-new__buttons,' +
            '.cf-actions .full-start__buttons{' +
                'flex:1 1 auto;' +
            '}' +

            '.cf-actions .full-start-new__reactions{' +
                'flex:0 0 auto;' +
                'margin-left:auto;' +
            '}' +

            '.cf-vignette-fixed{' +
                'background:linear-gradient(to right,' +
                    'rgba(0,0,0,.17) 0%,' +
                    'rgba(0,0,0,.08) 35%,' +
                    'transparent 75%);' +
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
    // CARD VALIDATION
    // --------------------------------------------------

    function isCurrentCard(version, movie, method, root) {
        if (version !== requestId) return false;
        if (!cardActive && currentRoot !== root) return false;
        if (!currentRoot || !currentRoot.length) return false;
        if (currentId !== movie.id) return false;
        if (currentMethod !== method) return false;
        if (currentRoot[0] !== root[0]) return false;
        if (!document.body.contains(root[0])) return false;

        return true;
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

        return names.filter(Boolean).slice(0, 3);
    }

    // --------------------------------------------------
    // MOVIE LOGO SELECTION
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
    // MOVIE LOGO REQUEST
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
    // STUDIO LOGO COLOR DETECTION
    // --------------------------------------------------

    function isBlackStudioLogo(image) {
        try {
            var canvas = document.createElement('canvas');

            var context = canvas.getContext('2d', {
                willReadFrequently: true
            });

            if (!context) return false;

            var size = 32;

            canvas.width = size;
            canvas.height = size;

            context.clearRect(0, 0, size, size);
            context.drawImage(image, 0, 0, size, size);

            var pixels = context.getImageData(
                0,
                0,
                size,
                size
            ).data;

            var total = 0;
            var brightness = 0;
            var saturation = 0;

            for (var i = 0; i < pixels.length; i += 4) {
                var alpha = pixels[i + 3];

                if (alpha < 40) continue;

                var r = pixels[i];
                var g = pixels[i + 1];
                var b = pixels[i + 2];

                var max = Math.max(r, g, b);
                var min = Math.min(r, g, b);

                var luminance =
                    (0.299 * r) +
                    (0.587 * g) +
                    (0.114 * b);

                brightness += luminance;
                saturation += max - min;

                total++;
            }

            if (!total) return false;

            brightness /= total;
            saturation /= total;

            /*
             * Dark monochrome logos become white.
             * Colored logos remain unchanged.
             */

            return brightness < 75 && saturation < 42;

        } catch (e) {
            /*
             * If canvas access is blocked,
             * preserve the original logo.
             */

            return false;
        }
    }

    // --------------------------------------------------
    // GET MAIN STUDIO
    // --------------------------------------------------

    function getMainStudio(companies) {
        if (!Array.isArray(companies)) return null;

        /*
         * Use the first production company
         * that has an actual logo.
         */

        for (var i = 0; i < companies.length; i++) {
            var company = companies[i];

            if (
                company &&
                company.logo_path
            ) {
                return {
                    id: company.id,
                    name: company.name || '',
                    logo_path: company.logo_path
                };
            }
        }

        return null;
    }

    // --------------------------------------------------
    // STUDIO LOGO REQUEST
    // --------------------------------------------------

    function ensureStudioLogo(movie, method, callback) {
        var key = method + '_' + movie.id;

        if (studioCache[key] !== undefined) {
            callback(studioCache[key]);
            return;
        }

        if (!tmdb || typeof tmdb.get !== 'function') {
            callback(null);
            return;
        }

        var companies = Array.isArray(movie.production_companies)
            ? movie.production_companies
            : [];

        if (companies.length) {
            var studio = getMainStudio(companies);

            studioCache[key] = studio;
            callback(studio);

            return;
        }

        /*
         * Request full TMDB details
         * if production_companies are missing.
         */

        tmdb.get(
            method + '/' + movie.id,
            {},
            function (json) {
                var list = json &&
                    Array.isArray(json.production_companies)
                    ? json.production_companies
                    : [];

                var studio = getMainStudio(list);

                studioCache[key] = studio;

                callback(studio);
            },
            function () {
                studioCache[key] = null;
                callback(null);
            }
        );
    }

    // --------------------------------------------------
    // RENDER STUDIO LOGO
    // --------------------------------------------------

    function renderStudioLogo(
        container,
        movie,
        method,
        version,
        root,
        callback
    ) {
        ensureStudioLogo(movie, method, function (studio) {
            if (!isCurrentCard(version, movie, method, root)) return;

            container
                .removeClass('cf-studio--visible cf-studio--white')
                .off('.cinematic-studio')
                .removeAttr('src')
                .hide();

            if (!studio || !studio.logo_path) {
                callback(false);
                return;
            }

            var finished = false;

            function finish(hasStudio) {
                if (finished) return;

                finished = true;

                if (!isCurrentCard(version, movie, method, root)) {
                    return;
                }

                callback(hasStudio);
            }

            container.attr('crossorigin', 'anonymous');

            container.on('load.cinematic-studio', function () {
                if (!isCurrentCard(version, movie, method, root)) return;

                if (isBlackStudioLogo(this)) {
                    container.addClass('cf-studio--white');
                } else {
                    container.removeClass('cf-studio--white');
                }

                /*
                 * Show only after the image has loaded.
                 * This avoids an empty reserved logo area.
                 */

                container.show();

                window.requestAnimationFrame(function () {
                    if (!isCurrentCard(version, movie, method, root)) return;

                    container.addClass('cf-studio--visible');

                    finish(true);
                });
            });

            container.on('error.cinematic-studio', function () {
                if (!isCurrentCard(version, movie, method, root)) return;

                container
                    .removeClass('cf-studio--visible')
                    .hide();

                finish(false);
            });

            container.attr(
                'src',
                Lampa.Api.img(studio.logo_path, 'w300')
            );

            /*
             * Handle an image already available from browser cache.
             */

            if (
                container[0].complete &&
                container[0].naturalWidth
            ) {
                container.trigger('load');
            }
        });
    }

    // --------------------------------------------------
    // BACKGROUND
    // --------------------------------------------------

    function createBackground(movie) {
        $('.cf-background').remove();

        var background = $('<div class="cf-background"></div>');

        if (movie.backdrop_path) {
            background.css(
                'background-image',
                'url("' + Lampa.Api.img(movie.backdrop_path, 'w1280') + '")'
            );
        }

        $('body').append(background);

        /*
         * Separate fixed overlay.
         * It never moves with the card content.
         */

        $('body').append(
            $('<div class="cf-vignette-fixed"></div>')
        );
    }

    // --------------------------------------------------
    // FIXED GRADIENT
    // --------------------------------------------------

    function createFixedGradient() {
        $('.cf-gradient-fixed').remove();

        var gradient = $('<div class="cf-gradient-fixed"></div>');

        $('body').append(gradient);

        syncFixedGradient();

        return gradient;
    }

    function syncFixedGradient() {
        if (!cardActive || !currentRoot || !currentRoot.length) return;

        var info = currentRoot.find('.cf-info').first();

        if (!info.length) return;

        var height = info.outerHeight();

        if (!height || !isFinite(height)) return;

        var gradient = $('.cf-gradient-fixed');

        if (!gradient.length) return;

        var newHeight = Math.ceil(height);

        if (gradient.data('cf-height') !== newHeight) {
            gradient.css(
                'height',
                Math.max(0, newHeight - 150) + 'px'
            );

            gradient.data('cf-height', newHeight);
        }
    }

    // --------------------------------------------------
    // GRADIENT RESIZE OBSERVER
    // --------------------------------------------------

    function bindGradientResize() {
        unbindGradientResize();

        gradientResizeHandler = function () {
            syncFixedGradient();
        };

        window.addEventListener(
            'resize',
            gradientResizeHandler,
            false
        );

        /*
         * Observe only the information block.
         * This replaces repeated full DOM measurements.
         */

        if (window.ResizeObserver && currentRoot) {
            var info = currentRoot.find('.cf-info').first();

            if (info.length) {
                gradientObserver = new ResizeObserver(function () {
                    syncFixedGradient();
                });

                gradientObserver.observe(info[0]);
            }
        }
    }

    function unbindGradientResize() {
        if (gradientResizeHandler) {
            window.removeEventListener(
                'resize',
                gradientResizeHandler,
                false
            );

            gradientResizeHandler = null;
        }

        if (gradientObserver) {
            gradientObserver.disconnect();
            gradientObserver = null;
        }
    }

    // --------------------------------------------------
    // NATIVE ELEMENT RESTORATION
    // --------------------------------------------------

    function moveNativeElement(element, destination) {
        if (
            !element ||
            !element.length ||
            !destination ||
            !destination.length
        ) {
            return;
        }

        var node = element[0];

        if (!node.parentNode) return;

        var placeholder = document.createComment(
            'cinematic-full-placeholder'
        );

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

                item.placeholder.parentNode.removeChild(
                    item.placeholder
                );
            }
        });

        movedElements = [];
    }

    // --------------------------------------------------
    // METADATA
    // --------------------------------------------------

    function createMetadata(movie, method, container) {
        var date = getDate(movie);
        var genres = getGenres(movie, method);
        var rating = Number(movie.vote_average) || 0;

        var items = [];

        var year = date ? date.slice(0, 4) : '';

        if (year) {
            items.push({
                type: 'year',
                value: year
            });
        }

        if (rating) {
            items.push({
                type: 'rating',
                value: rating.toFixed(1)
            });
        }

        if (genres.length) {
            items.push({
                type: 'genres',
                value: genres.join(', ')
            });
        }

        items.forEach(function (item, index) {
            if (index > 0) {
                container.append(
                    $('<span class="cf-meta-separator">·</span>')
                );
            }

            var element = $('<span class="cf-meta-item"></span>');

            if (item.type === 'rating') {
                element.addClass('cf-meta-rating');

                element.append(
                    $('<span class="cf-meta-star">★</span>')
                );

                element.append(
                    document.createTextNode(item.value)
                );
            } else {
                if (item.type === 'genres') {
                    element.addClass('cf-meta-genres');
                }

                element.text(item.value);
            }

            container.append(element);
        });
    }

    // --------------------------------------------------
    // HERO
    // --------------------------------------------------

    function createHero(root, movie, method, version) {
        root.find('.cf-hero').remove();

        var hero = $(
            '<div class="cf-hero">' +
                '<div class="cf-info">' +
                    '<img class="cf-studio" alt="">' +
                    '<img class="cf-logo" alt="">' +
                    '<div class="cf-title"></div>' +
                    '<div class="cf-meta"></div>' +
                    '<div class="cf-description"></div>' +
                    '<div class="cf-actions"></div>' +
                '</div>' +
            '</div>'
        );

        var studio = hero.find('.cf-studio');
        var logo = hero.find('.cf-logo');
        var title = hero.find('.cf-title');
        var meta = hero.find('.cf-meta');
        var description = hero.find('.cf-description');
        var actions = hero.find('.cf-actions');

        var movieTitle = getTitle(movie);

        /*
         * Structured metadata.
         */

        createMetadata(movie, method, meta);

        /*
         * Description.
         */

        description.text(movie.overview || '');

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

        /*
         * Move native reactions separately.
         */

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

        /*
         * Studio logo first.
         * Movie logo starts after the studio has appeared.
         */

        renderStudioLogo(
            studio,
            movie,
            method,
            version,
            root,
            function (hasStudio) {
                if (!isCurrentCard(version, movie, method, root)) return;

                if (logoTimer) {
                    clearTimeout(logoTimer);
                    logoTimer = null;
                }

                /*
                 * A short visual pause between the two logos.
                 */

                logoTimer = setTimeout(function () {
                    logoTimer = null;

                    if (!isCurrentCard(version, movie, method, root)) {
                        return;
                    }

                    renderMovieLogo(
                        logo,
                        title,
                        movie,
                        method,
                        version,
                        root
                    );

                }, hasStudio ? 220 : 80);
            }
        );

        return hero;
    }

    // --------------------------------------------------
    // RENDER MOVIE LOGO
    // --------------------------------------------------

    function renderMovieLogo(
        logo,
        title,
        movie,
        method,
        version,
        root
    ) {
        ensureLogo(movie, method, function (url) {
            if (!isCurrentCard(version, movie, method, root)) return;

            logo
                .removeClass('cf-logo--visible')
                .off('.cinematic')
                .removeAttr('src')
                .show();

            if (!url) {
                logo.hide();
                title.addClass('cf-title--visible');
                syncFixedGradient();
                return;
            }

            logo.on('load.cinematic', function () {
                if (!isCurrentCard(version, movie, method, root)) return;

                logo.addClass('cf-logo--visible');
                title.removeClass('cf-title--visible');

                syncFixedGradient();
            });

            logo.on('error.cinematic', function () {
                if (!isCurrentCard(version, movie, method, root)) return;

                logo.hide();
                title.addClass('cf-title--visible');

                syncFixedGradient();
            });

            logo.attr('src', url);

            /*
             * Handle cached images.
             */

            if (logo[0].complete && logo[0].naturalWidth) {
                logo.trigger('load');
            }
        });
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

        /*
         * Invalidate all pending TMDB callbacks.
         */

        requestId++;

        if (observerTimer) {
            clearTimeout(observerTimer);
            observerTimer = null;
        }

        if (cleanupTimer) {
            clearTimeout(cleanupTimer);
            cleanupTimer = null;
        }

        if (logoTimer) {
            clearTimeout(logoTimer);
            logoTimer = null;
        }

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        unbindGradientResize();

        /*
         * Restore native controls before removing hero.
         */

        restoreNativeElements();

        /*
         * Remove custom background and all fixed filters.
         */

        $('.cf-background').remove();
        $('.cf-vignette-fixed').remove();
        $('.cf-gradient-fixed').remove();

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
        currentMethod = '';

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

        /*
         * Only childList changes are observed.
         * Class/style changes are intentionally excluded.
         */

        observer = new MutationObserver(function () {
            if (observerTimer) {
                clearTimeout(observerTimer);
            }

            observerTimer = setTimeout(function () {
                observerTimer = null;

                if (!cardActive || cleaning) return;

                checkActivity();

            }, 500);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // --------------------------------------------------
    // FIND FULL ROOT
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

    // --------------------------------------------------
    // APPLY INTERFACE
    // --------------------------------------------------

    function applyInterface(event) {
        if (!event || !event.data || !event.data.movie) return;

        var movie = event.data.movie;

        if (!movie.id) return;

        var root = findFullRoot(event);

        if (!root || !root.length) return;

        /*
         * Clean previous card before creating another.
         * cleanup() increments requestId and invalidates
         * callbacks belonging to the previous card.
         */

        cleanup();

        var myRequest = requestId;

        currentId = movie.id;
        currentMethod = getMethod(movie);
        currentMovie = movie;
        currentRoot = root;

        installCSS();

        /*
         * Remove stale layers before adding new ones.
         */

        $('.cf-background').remove();
        $('.cf-vignette-fixed').remove();
        $('.cf-gradient-fixed').remove();

        createBackground(movie);

        root.addClass('cf-active');

        /*
         * Create hero and move native controls.
         */

        createHero(
            root,
            movie,
            currentMethod,
            myRequest
        );

        /*
         * Activate fixed gradient.
         */

        cardActive = true;

        createFixedGradient();

        /*
         * Initial layout measurement.
         */

        setTimeout(function () {
            if (
                cardActive &&
                requestId === myRequest &&
                currentId === movie.id
            ) {
                syncFixedGradient();
            }
        }, 100);

        /*
         * Observe actual information block size.
         */

        bindGradientResize();

        /*
         * Observe activity/root removal.
         */

        startObserver();
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

    Lampa.Listener.follow('activity', function (event) {
        if (!cardActive) return;

        /*
         * Give Lampa time to switch activities.
         */

        if (cleanupTimer) {
            clearTimeout(cleanupTimer);
        }

        cleanupTimer = setTimeout(function () {
            cleanupTimer = null;

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
