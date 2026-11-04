
(function () {
    'use strict';

    /*
     * @name CINEMATIC HOME
     * @version 1.0.2
     * @author Crowley24
     * @description Full Bleed Cinematic Home Screen
     * @platforms Lampa | Android TV | Mobile
     *
     * BACK RESTORE FIX 1.0.2
     *
     * - Restores Hero after returning from full movie card
     * - Detects restored home activity without activity:start
     * - Document-level lightweight activity observer
     * - Restores currently focused card
     * - Falls back to first card in first catalog
     * - Prevents duplicate Hero and backdrop layers
     * - Full Bleed fixed backdrop behind toolbar
     * - TMDB backdrop and movie logos
     * - Production studio logos
     * - Dark monochrome studio logo detection
     * - Metadata and overview
     * - Request token protection
     * - Request deduplication and caches
     * - Native Lampa catalogs preserved
     */

    var PLUGIN_NAME = 'CINEMATIC HOME';
    var VERSION = '1.0.2';

    if (window.cinematicHome102) return;
    window.cinematicHome102 = true;

    if (
        !window.Lampa ||
        !Lampa.Api ||
        !Lampa.Api.sources ||
        !Lampa.Api.sources.tmdb
    ) {
        console.warn('[' + PLUGIN_NAME + '] TMDB API unavailable');
        return;
    }

    var tmdb = Lampa.Api.sources.tmdb;

    /* =====================================================
       CONFIGURATION
    ===================================================== */

    var CONFIG = {
        enabled: true,

        heroHeight: 52,
        topExtension: 64,

        minHeight: 340,
        maxHeight: 650,

        logoMaxWidth: 58,
        logoMaxHeight: 115,

        studioMaxWidth: 145,
        studioMaxHeight: 36,

        backdropQuality: 'w1280',
        logoQuality: 'w500',

        focusDelay: 100,
        initialDelay: 350,
        restoreDelay: 180,

        backdropFade: 500,
        logoFade: 300,

        maxImageCache: 160,
        maxStudioCache: 100,
        maxDetailsCache: 100,

        debug: false
    };

    /* =====================================================
       STATE
    ===================================================== */

    var state = {
        active: false,

        root: null,
        content: null,

        hero: null,
        backdropLayer: null,

        observer: null,
        documentObserver: null,

        focusTimer: null,
        initialTimer: null,
        reconcileTimer: null,

        requestToken: 0,

        currentKey: '',
        currentItem: null,

        backgroundIndex: 0,
        backgroundImages: [],

        logoCache: new Map(),
        studioCache: new Map(),
        detailsCache: new Map(),

        pending: new Map(),

        listenersInstalled: false,

        rootFocusHandler: null,
        rootMouseHandler: null,

        bodyClassAdded: false
    };

    var STYLE_ID = 'cinematic-home-102-style';

    /* =====================================================
       LOGGING
    ===================================================== */

    function log() {
        if (!CONFIG.debug) return;

        var args = Array.prototype.slice.call(arguments);
        args.unshift('[' + PLUGIN_NAME + ']');

        console.log.apply(console, args);
    }

    /* =====================================================
       BASIC UTILITIES
    ===================================================== */

    function safeString(value) {
        return value === undefined || value === null
            ? ''
            : String(value);
    }

    function escapeHTML(value) {
        return safeString(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getLanguage() {
        var lang = 'uk';

        try {
            if (Lampa.Storage && Lampa.Storage.field) {
                lang = Lampa.Storage.field('tmdb_lang') || 'uk';
            }
        } catch (e) {}

        return lang;
    }

    function getLanguageList() {
        var lang = getLanguage();
        var result = [];

        if (lang) result.push(lang);
        if (lang !== 'en') result.push('en');

        result.push(null);

        return result;
    }

    function getMediaType(item) {
        if (!item) return 'movie';

        if (item.media_type === 'tv') return 'tv';
        if (item.media_type === 'movie') return 'movie';

        if (
            item.first_air_date ||
            item.name ||
            item.original_name
        ) {
            return 'tv';
        }

        return 'movie';
    }

    function getItemId(item) {
        if (!item) return '';

        return safeString(item.id || item.tmdb_id || '');
    }

    function getItemKey(item) {
        return getMediaType(item) + ':' + getItemId(item);
    }

    function getTitle(item) {
        if (!item) return '';

        return (
            item.title ||
            item.name ||
            item.original_title ||
            item.original_name ||
            ''
        );
    }

    function getYear(item) {
        if (!item) return '';

        var date = item.release_date || item.first_air_date || '';

        return date ? date.substring(0, 4) : '';
    }

    function getRating(item) {
        if (!item || !item.vote_average) return '';

        var rating = Number(item.vote_average);

        if (!isFinite(rating) || rating <= 0) return '';

        return rating.toFixed(1);
    }

    function getOverview(item) {
        return item && item.overview ? item.overview : '';
    }

    function getGenres(item) {
        if (!item || !Array.isArray(item.genres)) return '';

        return item.genres
            .map(function (genre) {
                return genre && genre.name ? genre.name : '';
            })
            .filter(Boolean)
            .slice(0, 3)
            .join(' · ');
    }

    function getImageURL(path, quality) {
        if (!path || !Lampa.Api || !Lampa.Api.img) return '';

        try {
            return Lampa.Api.img(path, quality);
        } catch (e) {
            return '';
        }
    }

    function isValidItem(item) {
        return !!(
            item &&
            getItemId(item) &&
            getTitle(item)
        );
    }

    function cacheSet(cache, key, value, limit) {
        if (cache.has(key)) {
            cache.delete(key);
        }

        cache.set(key, value);

        while (cache.size > limit) {
            cache.delete(cache.keys().next().value);
        }
    }

    /* =====================================================
       REQUEST DEDUPLICATION
    ===================================================== */

    function requestOnce(key, callback) {
        if (state.pending.has(key)) {
            state.pending.get(key).push(callback);
            return null;
        }

        state.pending.set(key, [callback]);

        return function (result) {
            var callbacks = state.pending.get(key) || [];

            state.pending.delete(key);

            callbacks.forEach(function (fn) {
                try {
                    fn(result);
                } catch (e) {
                    console.warn(e);
                }
            });
        };
    }

    /* =====================================================
       TMDB DETAILS
    ===================================================== */

    function getDetails(item, callback) {
        var key = getItemKey(item);

        if (state.detailsCache.has(key)) {
            callback(state.detailsCache.get(key));
            return;
        }

        var finish = requestOnce('details:' + key, callback);

        if (!finish) return;

        try {
            tmdb.get(
                getMediaType(item) + '/' + getItemId(item),
                {},
                function (response) {
                    response = response || null;

                    if (response) {
                        cacheSet(
                            state.detailsCache,
                            key,
                            response,
                            CONFIG.maxDetailsCache
                        );
                    }

                    finish(response);
                }
            );
        } catch (e) {
            finish(null);
        }
    }

    /* =====================================================
       TMDB MOVIE / TV LOGOS
    ===================================================== */

    function chooseLogo(images) {
        if (!images || !Array.isArray(images.logos)) {
            return null;
        }

        var logos = images.logos;
        var languages = getLanguageList();

        for (var i = 0; i < languages.length; i++) {
            var lang = languages[i];

            var found = logos.find(function (logo) {
                return (
                    logo &&
                    logo.iso_639_1 === lang &&
                    logo.file_path
                );
            });

            if (found) return found;
        }

        return null;
    }

    function ensureLogo(item, callback) {
        var key = getItemKey(item);

        if (state.logoCache.has(key)) {
            callback(state.logoCache.get(key));
            return;
        }

        var finish = requestOnce('logo:' + key, callback);

        if (!finish) return;

        try {
            tmdb.get(
                getMediaType(item) + '/' + getItemId(item) + '/images',
                {
                    filter: {
                        include_image_language: getLanguageList()
                    }
                },
                function (response) {
                    var selected = chooseLogo(response);

                    var result = selected
                        ? getImageURL(
                            selected.file_path,
                            CONFIG.logoQuality
                        )
                        : '';

                    cacheSet(
                        state.logoCache,
                        key,
                        result,
                        CONFIG.maxImageCache
                    );

                    finish(result);
                }
            );
        } catch (e) {
            finish('');
        }
    }

    /* =====================================================
       STUDIO LOGO COLOR DETECTION
    ===================================================== */

    function isBlackStudioLogo(imageURL, callback) {
        if (!imageURL) {
            callback(false);
            return;
        }

        var image = new Image();

        image.crossOrigin = 'anonymous';

        image.onload = function () {
            try {
                var canvas = document.createElement('canvas');
                var context = canvas.getContext('2d');

                canvas.width = 40;
                canvas.height = 40;

                context.drawImage(image, 0, 0, 40, 40);

                var pixels = context.getImageData(
                    0,
                    0,
                    40,
                    40
                ).data;

                var total = 0;
                var dark = 0;
                var colored = 0;

                for (var i = 0; i < pixels.length; i += 4) {
                    var alpha = pixels[i + 3];

                    if (alpha < 30) continue;

                    var r = pixels[i];
                    var g = pixels[i + 1];
                    var b = pixels[i + 2];

                    var brightness = (r + g + b) / 3;

                    total++;

                    if (brightness < 105) dark++;

                    if (
                        Math.max(r, g, b) -
                        Math.min(r, g, b) > 35
                    ) {
                        colored++;
                    }
                }

                if (!total) {
                    callback(false);
                    return;
                }

                callback(
                    dark / total > 0.70 &&
                    colored / total < 0.12
                );
            } catch (e) {
                callback(false);
            }
        };

        image.onerror = function () {
            callback(false);
        };

        image.src = imageURL;
    }

    function ensureStudioLogo(item, callback) {
        var key = getItemKey(item);

        if (state.studioCache.has(key)) {
            callback(state.studioCache.get(key));
            return;
        }

        function processDetails(details) {
            var companies = details &&
                Array.isArray(details.production_companies)
                ? details.production_companies
                : [];

            var selected = companies.find(function (company) {
                return company && company.logo_path;
            });

            if (!selected) {
                cacheSet(
                    state.studioCache,
                    key,
                    null,
                    CONFIG.maxStudioCache
                );

                callback(null);
                return;
            }

            var result = {
                name: selected.name || '',
                url: getImageURL(selected.logo_path, 'w300'),
                white: false
            };

            isBlackStudioLogo(result.url, function (isBlack) {
                result.white = isBlack;

                cacheSet(
                    state.studioCache,
                    key,
                    result,
                    CONFIG.maxStudioCache
                );

                callback(result);
            });
        }

        if (
            item.production_companies &&
            Array.isArray(item.production_companies)
        ) {
            processDetails(item);
        } else {
            getDetails(item, processDetails);
        }
    }

    /* =====================================================
       STYLES
    ===================================================== */

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');

        style.id = STYLE_ID;

        style.textContent = `
            .cinematic-home-backdrop-layer {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: calc(${CONFIG.heroHeight}vh + ${CONFIG.topExtension}px);
                min-height: 400px;
                max-height: 760px;
                overflow: hidden;
                pointer-events: none;
                z-index: 0;
                background: #101114;
                isolation: isolate;
            }

            .cinematic-home-backdrop-image {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center 30%;
                opacity: 0;
                transition: opacity ${CONFIG.backdropFade}ms ease;
            }

            .cinematic-home-backdrop-image.active {
                opacity: 1;
            }

            .cinematic-home-backdrop-gradient {
                position: absolute;
                inset: 0;
                z-index: 2;
                background:
                    linear-gradient(
                        180deg,
                        rgba(12,13,16,0.40) 0%,
                        rgba(12,13,16,0.08) 17%,
                        rgba(12,13,16,0.04) 48%,
                        rgba(12,13,16,0.50) 75%,
                        #101114 100%
                    ),
                    linear-gradient(
                        90deg,
                        rgba(12,13,16,0.96) 0%,
                        rgba(12,13,16,0.82) 24%,
                        rgba(12,13,16,0.50) 43%,
                        rgba(12,13,16,0.12) 72%,
                        rgba(12,13,16,0.02) 100%
                    );
            }

            .cinematic-home-root {
                position: relative;
                z-index: 1;
                background: transparent !important;
            }

            .cinematic-home-root .activity__body,
            .cinematic-home-root .scroll__body {
                background: transparent !important;
            }

            body.cinematic-home-active .head {
                position: relative;
                z-index: 5;
                background: rgba(15,16,19,0.24) !important;
            }

            body.cinematic-home-active .head__body {
                background: transparent !important;
            }

            .cinematic-home {
                position: relative;
                display: block;
                width: 100%;
                height: ${CONFIG.heroHeight}vh;
                min-height: ${CONFIG.minHeight}px;
                max-height: ${CONFIG.maxHeight}px;
                overflow: hidden;
                margin: 0 0 1.2em 0;
                background: transparent !important;
                box-sizing: border-box;
                pointer-events: none;
                z-index: 2;
            }

            .cinematic-home__content {
                position: absolute;
                left: 4%;
                bottom: 13%;
                width: 46%;
                max-width: 680px;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                box-sizing: border-box;
            }

            .cinematic-home__studio {
                display: flex;
                align-items: center;
                justify-content: flex-start;
                height: 42px;
                max-width: ${CONFIG.studioMaxWidth}px;
                margin-bottom: 15px;
                opacity: 0;
                transition: opacity ${CONFIG.logoFade}ms ease;
            }

            .cinematic-home__studio.visible {
                opacity: 1;
            }

            .cinematic-home__studio img {
                display: block;
                max-width: ${CONFIG.studioMaxWidth}px;
                max-height: ${CONFIG.studioMaxHeight}px;
                width: auto;
                height: auto;
                object-fit: contain;
            }

            .cinematic-home__studio.white img {
                filter: brightness(0) invert(1);
            }

            .cinematic-home__logo-wrap {
                display: flex;
                align-items: flex-end;
                width: 100%;
                min-height: 90px;
                margin-bottom: 14px;
            }

            .cinematic-home__logo {
                display: block;
                max-width: ${CONFIG.logoMaxWidth}%;
                max-height: ${CONFIG.logoMaxHeight}px;
                width: auto;
                height: auto;
                object-fit: contain;
                object-position: left bottom;
                opacity: 0;
                transition: opacity ${CONFIG.logoFade}ms ease;
            }

            .cinematic-home__logo.visible {
                opacity: 1;
            }

            .cinematic-home__title {
                display: none;
                color: #fff;
                font-size: clamp(28px, 3.2vw, 52px);
                font-weight: 700;
                line-height: 1.08;
                margin: 0 0 14px 0;
                max-width: 100%;
            }

            .cinematic-home__title.visible {
                display: block;
            }

            .cinematic-home__meta {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 12px;
                color: rgba(255,255,255,0.88);
                font-size: 15px;
                font-weight: 500;
                line-height: 1.3;
            }

            .cinematic-home__rating {
                color: #fff;
                font-weight: 700;
            }

            .cinematic-home__rating::before {
                content: "★";
                color: #f4c542;
                margin-right: 5px;
            }

            .cinematic-home__overview {
                color: rgba(255,255,255,0.86);
                font-size: 15px;
                line-height: 1.48;
                font-weight: 400;
                max-width: 100%;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            @media (max-width: 800px) {
                .cinematic-home-backdrop-layer {
                    height: calc(48vh + ${CONFIG.topExtension}px);
                    min-height: 350px;
                }

                .cinematic-home-backdrop-gradient {
                    background:
                        linear-gradient(
                            180deg,
                            rgba(12,13,16,0.38) 0%,
                            rgba(12,13,16,0.10) 20%,
                            rgba(12,13,16,0.30) 58%,
                            #101114 100%
                        ),
                        linear-gradient(
                            90deg,
                            rgba(12,13,16,0.86) 0%,
                            rgba(12,13,16,0.58) 42%,
                            rgba(12,13,16,0.12) 100%
                        );
                }

                .cinematic-home {
                    height: 48vh;
                    min-height: 300px;
                    max-height: 520px;
                }

                .cinematic-home__content {
                    left: 5%;
                    bottom: 11%;
                    width: 78%;
                }

                .cinematic-home__logo {
                    max-width: 70%;
                    max-height: 85px;
                }

                .cinematic-home__studio {
                    margin-bottom: 8px;
                }

                .cinematic-home__overview {
                    font-size: 13px;
                    -webkit-line-clamp: 2;
                }

                .cinematic-home__meta {
                    font-size: 12px;
                    gap: 7px;
                }

                .cinematic-home__logo-wrap {
                    min-height: 65px;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .cinematic-home-backdrop-image,
                .cinematic-home__logo,
                .cinematic-home__studio {
                    transition: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================================
       BACKDROP LAYER
    ===================================================== */

    function createBackdropLayer() {
        if (state.backdropLayer) return;

        var existing = document.querySelector(
            '.cinematic-home-backdrop-layer'
        );

        if (existing) {
            existing.parentNode.removeChild(existing);
        }

        var layer = document.createElement('div');

        layer.className = 'cinematic-home-backdrop-layer';

        layer.innerHTML = `
            <img class="cinematic-home-backdrop-image" />
            <img class="cinematic-home-backdrop-image" />
            <div class="cinematic-home-backdrop-gradient"></div>
        `;

        state.backdropLayer = layer;

        state.backgroundImages = Array.prototype.slice.call(
            layer.querySelectorAll('.cinematic-home-backdrop-image')
        );

        state.backgroundIndex = 0;

        document.body.appendChild(layer);
    }

    function removeBackdropLayer() {
        if (
            state.backdropLayer &&
            state.backdropLayer.parentNode
        ) {
            state.backdropLayer.parentNode.removeChild(
                state.backdropLayer
            );
        }

        state.backdropLayer = null;
        state.backgroundImages = [];
        state.backgroundIndex = 0;
    }

    /* =====================================================
       HERO
    ===================================================== */

    function createHero() {
        var hero = document.createElement('div');

        hero.className = 'cinematic-home';

        hero.innerHTML = `
            <div class="cinematic-home__content">
                <div class="cinematic-home__studio"></div>

                <div class="cinematic-home__logo-wrap">
                    <img class="cinematic-home__logo" />
                    <div class="cinematic-home__title"></div>
                </div>

                <div class="cinematic-home__meta"></div>

                <div class="cinematic-home__overview"></div>
            </div>
        `;

        state.hero = hero;

        return hero;
    }

    /* =====================================================
       BACKDROP RENDERING
    ===================================================== */

    function setBackdrop(url, token) {
        if (
            !state.backdropLayer ||
            !url ||
            !state.backgroundImages.length
        ) {
            return;
        }

        var nextIndex = state.backgroundIndex === 0 ? 1 : 0;

        var nextImage = state.backgroundImages[nextIndex];

        var currentImage = state.backgroundImages[
            state.backgroundIndex
        ];

        var image = new Image();

        image.onload = function () {
            if (
                token !== state.requestToken ||
                !state.active
            ) {
                return;
            }

            nextImage.src = url;

            requestAnimationFrame(function () {
                if (
                    token !== state.requestToken ||
                    !state.active
                ) {
                    return;
                }

                nextImage.classList.add('active');
                currentImage.classList.remove('active');

                state.backgroundIndex = nextIndex;
            });
        };

        image.onerror = function () {
            log('Backdrop loading failed');
        };

        image.src = url;
    }

    /* =====================================================
       LOGO RENDERING
    ===================================================== */

    function setLogo(url, token, title) {
        if (!state.hero) return;

        var logo = state.hero.querySelector(
            '.cinematic-home__logo'
        );

        var titleElement = state.hero.querySelector(
            '.cinematic-home__title'
        );

        logo.classList.remove('visible');
        titleElement.classList.remove('visible');

        if (!url) {
            titleElement.textContent = title || '';
            titleElement.classList.add('visible');
            return;
        }

        var image = new Image();

        image.onload = function () {
            if (
                token !== state.requestToken ||
                !state.active
            ) {
                return;
            }

            logo.onload = function () {
                if (
                    token !== state.requestToken ||
                    !state.active
                ) {
                    return;
                }

                logo.classList.add('visible');
                titleElement.classList.remove('visible');
            };

            logo.onerror = function () {
                if (token !== state.requestToken) return;

                titleElement.textContent = title || '';
                titleElement.classList.add('visible');
            };

            logo.src = url;

            if (logo.complete && logo.naturalWidth) {
                logo.classList.add('visible');
            }
        };

        image.onerror = function () {
            if (
                token !== state.requestToken ||
                !state.active
            ) {
                return;
            }

            titleElement.textContent = title || '';
            titleElement.classList.add('visible');
        };

        image.src = url;
    }

    /* =====================================================
       STUDIO RENDERING
    ===================================================== */

    function setStudio(studio, token) {
        if (!state.hero) return;

        var element = state.hero.querySelector(
            '.cinematic-home__studio'
        );

        element.classList.remove('visible');
        element.classList.remove('white');
        element.innerHTML = '';

        if (!studio || !studio.url) return;

        var image = new Image();

        image.onload = function () {
            if (
                token !== state.requestToken ||
                !state.active
            ) {
                return;
            }

            element.innerHTML = '';
            element.appendChild(image);

            if (studio.white) {
                element.classList.add('white');
            }

            element.classList.add('visible');
        };

        image.onerror = function () {};

        image.src = studio.url;
    }

    /* =====================================================
       METADATA
    ===================================================== */

    function setMetadata(item) {
        if (!state.hero) return;

        var meta = state.hero.querySelector(
            '.cinematic-home__meta'
        );

        var overview = state.hero.querySelector(
            '.cinematic-home__overview'
        );

        var parts = [];

        var year = getYear(item);
        var rating = getRating(item);
        var genres = getGenres(item);

        if (year) {
            parts.push(
                '<span>' + escapeHTML(year) + '</span>'
            );
        }

        if (rating) {
            parts.push(
                '<span class="cinematic-home__rating">' +
                escapeHTML(rating) +
                '</span>'
            );
        }

        if (genres) {
            parts.push(
                '<span>' + escapeHTML(genres) + '</span>'
            );
        }

        meta.innerHTML = parts.join('<span>·</span>');

        overview.textContent = getOverview(item);
    }

    /* =====================================================
       UPDATE HERO
    ===================================================== */

    function updateHero(item) {
        if (
            !CONFIG.enabled ||
            !state.active ||
            !isValidItem(item)
        ) {
            return;
        }

        var key = getItemKey(item);

        if (key === state.currentKey) return;

        state.currentKey = key;
        state.currentItem = item;

        var token = ++state.requestToken;

        log('Hero update:', key, getTitle(item));

        setMetadata(item);

        var directBackdrop = getImageURL(
            item.backdrop_path,
            CONFIG.backdropQuality
        );

        if (directBackdrop) {
            setBackdrop(directBackdrop, token);
        }

        ensureLogo(item, function (logoURL) {
            if (
                token !== state.requestToken ||
                !state.active
            ) {
                return;
            }

            setLogo(logoURL, token, getTitle(item));
        });

        ensureStudioLogo(item, function (studio) {
            if (
                token !== state.requestToken ||
                !state.active
            ) {
                return;
            }

            setStudio(studio, token);
        });

        getDetails(item, function (details) {
            if (
                token !== state.requestToken ||
                !state.active ||
                !details
            ) {
                return;
            }

            if (
                !directBackdrop &&
                details.backdrop_path
            ) {
                setBackdrop(
                    getImageURL(
                        details.backdrop_path,
                        CONFIG.backdropQuality
                    ),
                    token
                );
            }

            if (
                !getOverview(item) &&
                details.overview
            ) {
                var overview = state.hero.querySelector(
                    '.cinematic-home__overview'
                );

                overview.textContent = details.overview;
            }

            if (
                !getGenres(item) &&
                details.genres
            ) {
                var genres = getGenres(details);

                if (genres) {
                    var meta = state.hero.querySelector(
                        '.cinematic-home__meta'
                    );

                    var genreElement = document.createElement('span');

                    genreElement.textContent = genres;

                    meta.appendChild(genreElement);
                }
            }
        });
    }

    /* =====================================================
       CARD DATA
    ===================================================== */

    function getCardData(card) {
        if (!card) return null;

        var candidates = [
            card.card_data,
            card.data,
            card.cardData,
            card._data,
            card.__data
        ];

        for (var i = 0; i < candidates.length; i++) {
            if (isValidItem(candidates[i])) {
                return candidates[i];
            }
        }

        var nested = card.querySelector &&
            card.querySelector('[data-card]');

        if (nested) {
            try {
                var parsed = JSON.parse(
                    nested.getAttribute('data-card')
                );

                if (isValidItem(parsed)) return parsed;
            } catch (e) {}
        }

        return null;
    }

    function getCardElement(element) {
        if (!element) return null;

        if (element.nodeType === 1) {
            if (
                element.matches &&
                element.matches('.card')
            ) {
                return element;
            }

            if (element.closest) {
                return element.closest('.card');
            }
        }

        return null;
    }

    /* =====================================================
       FOCUS
    ===================================================== */

    function processFocusedCard(card) {
        card = getCardElement(card);

        if (!card || !state.active || !state.root) return;

        if (!state.root.contains(card)) return;

        var item = getCardData(card);

        if (!isValidItem(item)) return;

        if (state.focusTimer) {
            clearTimeout(state.focusTimer);
        }

        state.focusTimer = setTimeout(function () {
            if (!state.active || !state.root) return;

            var focused = state.root.querySelector(
                '.card.focus, .card.hover, .card:focus'
            );

            if (focused && focused !== card) {
                var focusedItem = getCardData(focused);

                if (isValidItem(focusedItem)) {
                    updateHero(focusedItem);
                }

                return;
            }

            updateHero(item);

        }, CONFIG.focusDelay);
    }

    /* =====================================================
       INITIAL CARD
    ===================================================== */

    function findFirstCard() {
        if (!state.content) return null;

        var cards = state.content.querySelectorAll('.card');

        for (var i = 0; i < cards.length; i++) {
            var item = getCardData(cards[i]);

            if (isValidItem(item)) {
                return {
                    card: cards[i],
                    item: item
                };
            }
        }

        return null;
    }

    function initializeFirstCard() {
        if (!state.active || !state.root) return;

        var focused = state.root.querySelector(
            '.card.focus, .card.hover, .card:focus'
        );

        if (focused) {
            var focusedItem = getCardData(focused);

            if (isValidItem(focusedItem)) {
                updateHero(focusedItem);
                return;
            }
        }

        var first = findFirstCard();

        if (first) {
            updateHero(first.item);

            log('Initial card:', getTitle(first.item));
        }
    }

    /* =====================================================
       ACTIVITY DETECTION
    ===================================================== */

    function getActivityName(event) {
        var candidates = [];

        if (event) {
            candidates.push(event.component);
            candidates.push(event.activity);
            candidates.push(event.object);
        }

        try {
            if (
                Lampa.Activity &&
                Lampa.Activity.active
            ) {
                var active = Lampa.Activity.active();

                if (active) {
                    candidates.push(active.component);
                    candidates.push(active);
                }
            }
        } catch (e) {}

        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];

            if (!candidate) continue;

            if (typeof candidate === 'string') {
                return candidate.toLowerCase();
            }

            if (candidate.name) {
                return String(candidate.name).toLowerCase();
            }

            if (
                candidate.component &&
                candidate.component.name
            ) {
                return String(
                    candidate.component.name
                ).toLowerCase();
            }
        }

        return '';
    }

    function isElementVisible(element) {
        if (!element || !element.isConnected) return false;

        if (element.offsetWidth || element.offsetHeight) {
            return true;
        }

        return false;
    }

    function hasVisibleFullCard() {
        var fullCards = document.querySelectorAll(
            '.full-start, .full-start-new'
        );

        for (var i = 0; i < fullCards.length; i++) {
            if (isElementVisible(fullCards[i])) {
                return true;
            }
        }

        return false;
    }

    function getMainActivity() {
        var activities = document.querySelectorAll('.activity');

        for (var i = activities.length - 1; i >= 0; i--) {
            var activity = activities[i];

            if (!isElementVisible(activity)) continue;

            if (
                activity.querySelector('.full-start') ||
                activity.querySelector('.full-start-new')
            ) {
                continue;
            }

            if (
                activity.querySelector('.items-line') ||
                activity.querySelector('.card')
            ) {
                return activity;
            }
        }

        return null;
    }

    function findContent(root) {
        if (!root) return null;

        return (
            root.querySelector('.scroll__body') ||
            root.querySelector('.activity__body') ||
            root
        );
    }

    /* =====================================================
       MOUNT HERO
    ===================================================== */

    function mountHero(root) {
        if (!root) return;

        if (
            state.active &&
            state.root === root &&
            state.hero &&
            state.hero.isConnected &&
            state.backdropLayer &&
            state.backdropLayer.isConnected
        ) {
            return;
        }

        if (state.active) {
            stopHome();
        }

        state.active = true;
        state.root = root;
        state.content = findContent(root);

        if (!state.content) {
            state.active = false;
            return;
        }

        installStyles();

        root.classList.add('cinematic-home-root');

        document.body.classList.add(
            'cinematic-home-active'
        );

        state.bodyClassAdded = true;

        createBackdropLayer();

        var hero = createHero();

        state.content.insertBefore(
            hero,
            state.content.firstChild
        );

        attachFocusTracking();

        /*
         * Restore the current focused card first.
         * If focus is not ready, use first catalog card.
         */

        state.initialTimer = setTimeout(function () {
            initializeFirstCard();
        }, CONFIG.initialDelay);

        log('Hero mounted');
    }

    /* =====================================================
       STOP HOME
    ===================================================== */

    function stopHome() {
        state.active = false;

        state.requestToken++;

        if (state.focusTimer) {
            clearTimeout(state.focusTimer);
            state.focusTimer = null;
        }

        if (state.initialTimer) {
            clearTimeout(state.initialTimer);
            state.initialTimer = null;
        }

        if (state.observer) {
            state.observer.disconnect();
            state.observer = null;
        }

        if (state.root && state.rootFocusHandler) {
            state.root.removeEventListener(
                'focusin',
                state.rootFocusHandler,
                true
            );
        }

        if (state.root && state.rootMouseHandler) {
            state.root.removeEventListener(
                'mouseover',
                state.rootMouseHandler,
                true
            );
        }

        if (state.root) {
            state.root.classList.remove(
                'cinematic-home-root'
            );
        }

        if (
            state.hero &&
            state.hero.parentNode
        ) {
            state.hero.parentNode.removeChild(
                state.hero
            );
        }

        removeBackdropLayer();

        if (state.bodyClassAdded) {
            document.body.classList.remove(
                'cinematic-home-active'
            );

            state.bodyClassAdded = false;
        }

        state.hero = null;
        state.root = null;
        state.content = null;

        state.currentKey = '';
        state.currentItem = null;

        state.rootFocusHandler = null;
        state.rootMouseHandler = null;

        log('Home stopped');
    }

    /* =====================================================
       FOCUS TRACKING
    ===================================================== */

    function attachFocusTracking() {
        if (!state.root) return;

        state.rootFocusHandler = function (event) {
            processFocusedCard(event.target);
        };

        state.rootMouseHandler = function (event) {
            processFocusedCard(event.target);
        };

        state.root.addEventListener(
            'focusin',
            state.rootFocusHandler,
            true
        );

        state.root.addEventListener(
            'mouseover',
            state.rootMouseHandler,
            true
        );

        if (window.MutationObserver) {
            state.observer = new MutationObserver(
                function (mutations) {
                    var shouldCheckFocus = false;
                    var shouldCheckInitial = false;

                    mutations.forEach(function (mutation) {
                        if (mutation.type === 'attributes') {
                            if (
                                mutation.target &&
                                mutation.target.classList &&
                                mutation.target.classList.contains('card')
                            ) {
                                shouldCheckFocus = true;
                            }
                        }

                        if (mutation.type === 'childList') {
                            shouldCheckInitial = true;
                        }
                    });

                    if (shouldCheckFocus && state.root) {
                        var focused = state.root.querySelector(
                            '.card.focus, .card.hover, .card:focus'
                        );

                        if (focused) {
                            processFocusedCard(focused);
                        }
                    }

                    if (
                        shouldCheckInitial &&
                        !state.currentKey &&
                        state.active
                    ) {
                        if (state.initialTimer) {
                            clearTimeout(state.initialTimer);
                        }

                        state.initialTimer = setTimeout(
                            initializeFirstCard,
                            180
                        );
                    }
                }
            );

            state.observer.observe(state.root, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }

    /* =====================================================
       RESTORE CONTROLLER
    ===================================================== */

    function scheduleReconcile(delay) {
        if (state.reconcileTimer) {
            clearTimeout(state.reconcileTimer);
        }

        state.reconcileTimer = setTimeout(
            reconcileHome,
            typeof delay === 'number' ? delay : CONFIG.restoreDelay
        );
    }

    function reconcileHome() {
        state.reconcileTimer = null;

        if (!CONFIG.enabled) return;

        /*
         * A full movie card has priority.
         * Do not show the home backdrop over it.
         */

        if (hasVisibleFullCard()) {
            if (state.active) {
                stopHome();
            }

            return;
        }

        var root = getMainActivity();

        if (!root) {
            if (state.active) {
                stopHome();
            }

            return;
        }

        /*
         * Home may have been restored without
         * receiving activity:start.
         */

        if (
            !state.active ||
            state.root !== root ||
            !state.hero ||
            !state.hero.isConnected ||
            !state.backdropLayer ||
            !state.backdropLayer.isConnected
        ) {
            log('Home restore detected');

            mountHero(root);
            return;
        }

        /*
         * Recover if another plugin removed Hero.
         */

        if (!state.hero.isConnected) {
            state.hero = null;

            var hero = createHero();

            state.content.insertBefore(
                hero,
                state.content.firstChild
            );

            initializeFirstCard();
        }
    }

    function installDocumentObserver() {
        if (!window.MutationObserver || !document.body) return;

        if (state.documentObserver) {
            state.documentObserver.disconnect();
        }

        state.documentObserver = new MutationObserver(
            function (mutations) {
                var relevant = false;

                for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];

                    if (mutation.type === 'childList') {
                        relevant = true;
                        break;
                    }

                    if (
                        mutation.type === 'attributes' &&
                        mutation.target &&
                        mutation.target.classList &&
                        (
                            mutation.target.classList.contains('activity') ||
                            mutation.target.classList.contains('full-start') ||
                            mutation.target.classList.contains('full-start-new')
                        )
                    ) {
                        relevant = true;
                        break;
                    }
                }

                if (relevant) {
                    scheduleReconcile(180);
                }
            }
        );

        state.documentObserver.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });
    }

    /* =====================================================
       LAMPA EVENTS
    ===================================================== */

    function installListeners() {
        if (state.listenersInstalled) return;

        state.listenersInstalled = true;

        if (
            Lampa.Listener &&
            Lampa.Listener.follow
        ) {
            Lampa.Listener.follow('activity', function (event) {
                if (!event) return;

                if (event.type === 'start') {
                    scheduleReconcile(120);
                }

                if (event.type === 'destroy') {
                    scheduleReconcile(200);
                }
            });

            Lampa.Listener.follow('focus', function (event) {
                if (!state.active || !event) return;

                if (
                    event.type === 'hover' ||
                    event.type === 'focus'
                ) {
                    var card = getCardElement(
                        event.target ||
                        event.element ||
                        event.card ||
                        event.object
                    );

                    if (card) {
                        processFocusedCard(card);
                    }
                }
            });
        }

        if (
            Lampa.Controller &&
            Lampa.Controller.listener &&
            Lampa.Controller.listener.follow
        ) {
            Lampa.Controller.listener.follow('hover', function (event) {
                if (!state.active || !event) return;

                var card = getCardElement(
                    event.target ||
                    event.element ||
                    event.card ||
                    event.object
                );

                if (card) {
                    processFocusedCard(card);
                }
            });
        }
    }

    /* =====================================================
       INITIALIZATION
    ===================================================== */

    function init() {
        installStyles();

        installListeners();

        installDocumentObserver();

        scheduleReconcile(600);

        log(
            PLUGIN_NAME +
            ' ' +
            VERSION +
            ' initialized'
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            init
        );
    } else {
        init();
    }

})();
