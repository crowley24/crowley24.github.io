
(function () {
    'use strict';

    /*
     * TMDB CINEMATIC MOBILE 1.1.0
     *
     * Lampa / Mobile
     *
     * FEATURES:
     * - Full cinematic TMDB backdrop
     * - Independent mobile backdrop loading
     * - TMDB movie / TV logos
     * - Language priority: Lampa language > English > neutral > first
     * - Production company logos
     * - Native Lampa tagline and metadata
     * - Custom overview description
     * - Smooth image transitions
     * - TMDB image cache
     * - Protection against outdated requests
     * - Automatic cleanup
     *
     * IMPORTANT:
     * - Mobile only
     * - Native Lampa buttons are not modified
     * - No slideshow
     * - No custom navigation
     */

    if (!window.Lampa || !window.Lampa.Listener) return;

    if (window.tmdb_cinematic_mobile_110_ready) return;
    window.tmdb_cinematic_mobile_110_ready = true;

    var VERSION = '1.1.0';

    var CACHE_PREFIX = 'tmdb_cinematic_mobile_110_';
    var CACHE_TTL = 6 * 60 * 60 * 1000;
    var REQUEST_TIMEOUT = 20000;

    var MAX_STUDIOS = 4;

    var activeStates = [];
    var requestCounter = 0;

    var CSS_ID = 'tmdb-cinematic-mobile-110-css';

    /*
     * MOBILE DETECTION
     */

    function isMobile() {
        try {
            if (Lampa.Platform && Lampa.Platform.screen('tv')) {
                return false;
            }
        } catch (e) {}

        var ua = navigator.userAgent || '';

        return window.innerWidth <= 790 ||
            /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    }

    /*
     * LANGUAGE
     */

    function getLanguage() {
        var lang = '';

        try {
            if (Lampa.Storage && Lampa.Storage.get) {
                lang = Lampa.Storage.get('tmdb_lang') ||
                    Lampa.Storage.get('language') ||
                    '';
            }
        } catch (e) {}

        if (!lang && Lampa.Lang) {
            try {
                lang = Lampa.Lang.code || '';
            } catch (e) {}
        }

        lang = String(lang || 'uk').toLowerCase();

        if (lang.indexOf('-') !== -1) {
            lang = lang.split('-')[0];
        }

        if (lang.indexOf('_') !== -1) {
            lang = lang.split('_')[0];
        }

        return lang;
    }

    /*
     * TMDB IMAGE URL
     */

    function imageUrl(path, size) {
        if (!path) return '';

        try {
            return Lampa.Api.img(path, size || 'original');
        } catch (e) {
            return '';
        }
    }

    /*
     * CACHE
     */

    function cacheGet(key) {
        try {
            var raw = localStorage.getItem(CACHE_PREFIX + key);

            if (!raw) return null;

            var data = JSON.parse(raw);

            if (!data || !data.time || !data.value) {
                localStorage.removeItem(CACHE_PREFIX + key);
                return null;
            }

            if (Date.now() - data.time > CACHE_TTL) {
                localStorage.removeItem(CACHE_PREFIX + key);
                return null;
            }

            return data.value;
        } catch (e) {
            return null;
        }
    }

    function cacheSet(key, value) {
        try {
            localStorage.setItem(
                CACHE_PREFIX + key,
                JSON.stringify({
                    time: Date.now(),
                    value: value
                })
            );
        } catch (e) {}
    }

    /*
     * TMDB SOURCE
     */

    function getTMDB() {
        try {
            return Lampa.Api.sources.tmdb;
        } catch (e) {
            return null;
        }
    }

    /*
     * TMDB REQUEST
     *
     * Uses the native Lampa TMDB source.
     */

    function tmdbRequest(path, langs, callback) {
        var tmdb = getTMDB();

        if (!tmdb || typeof tmdb.get !== 'function') {
            callback(null);
            return;
        }

        var finished = false;

        var timer = setTimeout(function () {
            done(null);
        }, REQUEST_TIMEOUT);

        function done(data) {
            if (finished) return;

            finished = true;

            clearTimeout(timer);

            callback(data || null);
        }

        try {
            var result = tmdb.get(
                path,
                {
                    filter: {
                        include_image_language: langs
                    }
                },
                function (data) {
                    done(data);
                }
            );

            if (result && typeof result.then === 'function') {
                result.then(function (data) {
                    done(data);
                }).catch(function () {
                    done(null);
                });
            }
        } catch (e) {
            done(null);
        }
    }

    /*
     * IMAGE LANGUAGE PRIORITY
     *
     * 1. Lampa language
     * 2. English
     * 3. Neutral
     * 4. First available
     */

    function pickLogo(logos) {
        if (!logos || !logos.length) return null;

        var lang = getLanguage();

        var preferred = logos.filter(function (logo) {
            return logo.iso_639_1 === lang;
        });

        if (preferred.length) {
            return preferred[0];
        }

        var english = logos.filter(function (logo) {
            return logo.iso_639_1 === 'en';
        });

        if (english.length) {
            return english[0];
        }

        var neutral = logos.filter(function (logo) {
            return !logo.iso_639_1;
        });

        if (neutral.length) {
            return neutral[0];
        }

        return logos[0];
    }

    /*
     * BACKDROP PRIORITY
     */

    function pickBackdrop(backdrops) {
        if (!backdrops || !backdrops.length) return null;

        var sorted = backdrops.slice().sort(function (a, b) {
            return (b.vote_average || 0) - (a.vote_average || 0);
        });

        return sorted[0];
    }

    /*
     * CREATE IMAGE
     */

    function preloadImage(url, callback) {
        if (!url) {
            callback(null);
            return;
        }

        var image = new Image();

        var completed = false;

        function finish(result) {
            if (completed) return;

            completed = true;

            image.onload = null;
            image.onerror = null;

            callback(result);
        }

        image.onload = function () {
            finish(image);
        };

        image.onerror = function () {
            finish(null);
        };

        image.src = url;
    }

    /*
     * STATE
     */

    function createState(root, card, link) {
        requestCounter++;

        var state = {
            id: requestCounter,
            root: root,
            card: card,
            link: link,
            alive: true,
            backdrop: null,
            logo: null,
            studioRow: null,
            description: null,
            originalTitle: '',
            titleElement: null
        };

        activeStates.push(state);

        return state;
    }

    function isAlive(state) {
        return !!(
            state &&
            state.alive &&
            state.root &&
            state.root.isConnected
        );
    }

    /*
     * CLEANUP
     */

    function cleanupState(state) {
        if (!state || !state.alive) return;

        state.alive = false;

        if (state.root) {
            state.root.classList.remove('tmlm-active');

            var elements = state.root.querySelectorAll(
                '.tmlm-backdrop, .tmlm-gradient, ' +
                '.tmlm-studios, .tmlm-description'
            );

            Array.prototype.forEach.call(elements, function (element) {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });

            var title = state.root.querySelector(
                '.full-start-new__title'
            );

            if (title && title.dataset.tmlmOriginal !== undefined) {
                title.innerHTML = '';

                title.textContent = title.dataset.tmlmOriginal;

                delete title.dataset.tmlmOriginal;
                delete title.dataset.tmlmLogo;
            }

            var tagline = state.root.querySelector(
                '.full-start-new__tagline'
            );

            if (tagline) {
                tagline.style.display = '';
            }
        }

        activeStates = activeStates.filter(function (item) {
            return item !== state;
        });
    }

    function cleanupAll() {
        activeStates.slice().forEach(function (state) {
            cleanupState(state);
        });
    }

    /*
     * ROOT ELEMENT
     */

    function getCardRoot(body) {
        if (!body) return null;

        var element = body.jquery ? body[0] : body;

        if (!element) return null;

        if (element.classList &&
            element.classList.contains('full-start-new')) {
            return element;
        }

        if (element.querySelector) {
            return element.querySelector('.full-start-new');
        }

        return null;
    }

    /*
     * BACKDROP
     *
     * Important:
     * Native Lampa removes .full-start__background
     * on mobile screens.
     *
     * We therefore create our own independent backdrop
     * inside .full-start-new.
     */

    function createBackdrop(state) {
        if (!isAlive(state)) return;

        var root = state.root;

        var backdrop = document.createElement('div');

        backdrop.className = 'tmlm-backdrop';

        var image = document.createElement('img');

        image.className = 'tmlm-backdrop__image';

        image.alt = '';

        backdrop.appendChild(image);

        var gradient = document.createElement('div');

        gradient.className = 'tmlm-gradient';

        root.insertBefore(backdrop, root.firstChild);

        root.appendChild(gradient);

        state.backdrop = backdrop;

        var path = state.card.backdrop_path || '';

        var cacheKey = 'backdrop_' + state.card.id;

        var cached = cacheGet(cacheKey);

        if (cached) {
            showBackdrop(state, cached);
            return;
        }

        if (path) {
            var url = imageUrl(path, 'w1280');

            preloadImage(url, function (loaded) {
                if (!isAlive(state)) return;

                if (loaded) {
                    cacheSet(cacheKey, path);
                    showBackdrop(state, path);
                } else {
                    loadBackdropFromImages(state);
                }
            });
        } else {
            loadBackdropFromImages(state);
        }
    }

    function showBackdrop(state, path) {
        if (!isAlive(state)) return;

        var url = imageUrl(path, 'w1280');

        if (!url || !state.backdrop) return;

        var image = state.backdrop.querySelector('img');

        if (!image) return;

        preloadImage(url, function (loaded) {
            if (!isAlive(state) || !loaded) return;

            image.src = url;

            state.backdrop.classList.add('tmlm-loaded');
        });
    }

    function loadBackdropFromImages(state) {
        if (!isAlive(state)) return;

        var type = getMediaType(state.card);

        var key = 'images_' + type + '_' + state.card.id;

        var cached = cacheGet(key);

        if (cached) {
            var backdrop = pickBackdrop(cached.backdrops || []);

            if (backdrop && backdrop.file_path) {
                cacheSet('backdrop_' + state.card.id, backdrop.file_path);
                showBackdrop(state, backdrop.file_path);
            }

            return;
        }

        requestImages(state, function (images) {
            if (!isAlive(state) || !images) return;

            cacheSet(key, images);

            var backdrop = pickBackdrop(images.backdrops || []);

            if (backdrop && backdrop.file_path) {
                cacheSet('backdrop_' + state.card.id, backdrop.file_path);
                showBackdrop(state, backdrop.file_path);
            }
        });
    }

    /*
     * MEDIA TYPE
     */

    function getMediaType(card) {
        if (card.media_type === 'tv') return 'tv';

        if (card.media_type === 'movie') return 'movie';

        if (card.first_air_date) return 'tv';

        if (card.name && !card.release_date) return 'tv';

        return 'movie';
    }

    /*
     * LOAD TMDB IMAGES
     */

    function requestImages(state, callback) {
        if (!isAlive(state)) return;

        var card = state.card;

        var type = getMediaType(card);

        var langs = getLanguage() + ',en,null';

        var key = 'images_' + type + '_' + card.id;

        var cached = cacheGet(key);

        if (cached) {
            callback(cached);
            return;
        }

        tmdbRequest(
            type + '/' + card.id + '/images',
            langs,
            function (data) {
                if (!isAlive(state)) return;

                if (!data) {
                    callback(null);
                    return;
                }

                cacheSet(key, data);

                callback(data);
            }
        );
    }

    /*
     * MOVIE / TV LOGO
     */

    function createLogo(state) {
        if (!isAlive(state)) return;

        var title = state.root.querySelector(
            '.full-start-new__title'
        );

        if (!title) return;

        state.titleElement = title;

        state.originalTitle = title.textContent || '';

        title.dataset.tmlmOriginal = state.originalTitle;

        var type = getMediaType(state.card);

        var key = 'images_' + type + '_' + state.card.id;

        var cached = cacheGet(key);

        if (cached) {
            displayLogo(state, cached);
            return;
        }

        requestImages(state, function (images) {
            if (!isAlive(state) || !images) return;

            displayLogo(state, images);
        });
    }

    function displayLogo(state, images) {
        if (!isAlive(state) || !images) return;

        var logo = pickLogo(images.logos || []);

        if (!logo || !logo.file_path) return;

        var url = imageUrl(logo.file_path, 'w500');

        if (!url) return;

        preloadImage(url, function (loaded) {
            if (!isAlive(state) || !loaded) return;

            var title = state.titleElement;

            if (!title) return;

            if (title.dataset.tmlmLogo === 'true') return;

            title.innerHTML = '';

            var image = document.createElement('img');

            image.className = 'tmlm-movie-logo';

            image.alt = state.originalTitle;

            image.src = url;

            title.appendChild(image);

            title.dataset.tmlmLogo = 'true';

            title.classList.add('tmlm-title-with-logo');

            state.logo = image;

            var tagline = state.root.querySelector(
                '.full-start-new__tagline'
            );

            if (tagline && state.card.tagline) {
                tagline.classList.add('tmlm-tagline-visible');
            }
        });
    }

    /*
     * PRODUCTION COMPANY LOGOS
     */

    function createStudios(state) {
        if (!isAlive(state)) return;

        var companies = state.card.production_companies || [];

        if (!companies.length) return;

        var valid = companies.filter(function (company) {
            return company.logo_path;
        }).slice(0, MAX_STUDIOS);

        if (!valid.length) return;

        var details = state.root.querySelector(
            '.full-start-new__details'
        );

        if (!details) return;

        var row = document.createElement('div');

        row.className = 'tmlm-studios';

        valid.forEach(function (company) {
            var url = imageUrl(company.logo_path, 'w300');

            if (!url) return;

            var item = document.createElement('div');

            item.className = 'tmlm-studios__item';

            var image = document.createElement('img');

            image.alt = company.name || '';

            image.src = url;

            item.appendChild(image);

            row.appendChild(item);
        });

        if (!row.children.length) return;

        details.insertAdjacentElement('afterend', row);

        state.studioRow = row;
    }

    /*
     * DESCRIPTION
     */

    function createDescription(state) {
        if (!isAlive(state)) return;

        var overview = String(state.card.overview || '').trim();

        if (!overview) return;

        var studios = state.studioRow;

        var details = state.root.querySelector(
            '.full-start-new__details'
        );

        if (!details) return;

        var description = document.createElement('div');

        description.className = 'tmlm-description';

        description.textContent = overview;

        if (studios && studios.parentNode) {
            studios.insertAdjacentElement('afterend', description);
        } else {
            details.insertAdjacentElement('afterend', description);
        }

        state.description = description;
    }

    /*
     * TAGLINE
     */

    function prepareTagline(state) {
        if (!isAlive(state)) return;

        var tagline = state.root.querySelector(
            '.full-start-new__tagline'
        );

        if (!tagline) return;

        if (!state.card.tagline) {
            tagline.style.display = 'none';
            return;
        }

        tagline.textContent = state.card.tagline;

        tagline.classList.add('tmlm-tagline-visible');
    }

    /*
     * CARD INITIALIZATION
     */

    function processCard(event) {
        if (!isMobile()) return;

        if (!event || !event.data) return;

        var body = event.data.body;

        var root = getCardRoot(body);

        if (!root) return;

        var response = event.data.data || {};

        var card = response.movie || event.data.object || {};

        if (!card || !card.id) return;

        /*
         * Remove previous state for the same card root.
         */

        activeStates.slice().forEach(function (state) {
            if (state.root === root) {
                cleanupState(state);
            }
        });

        root.classList.add('tmlm-active');

        var state = createState(
            root,
            card,
            event.data.link || null
        );

        /*
         * Keep native Lampa elements intact.
         */

        prepareTagline(state);

        createBackdrop(state);

        createLogo(state);

        createStudios(state);

        createDescription(state);
    }

    /*
     * CLEANUP ON FULL DESTROY
     */

    function processDestroy(event) {
        if (!event || !event.data) {
            cleanupAll();
            return;
        }

        var link = event.data.link;

        if (!link) {
            cleanupAll();
            return;
        }

        activeStates.slice().forEach(function (state) {
            if (state.link === link) {
                cleanupState(state);
            }
        });
    }

    /*
     * CSS
     */

    function addStyles() {
        if (document.getElementById(CSS_ID)) return;

        var css = `
/*
 * TMDB CINEMATIC MOBILE 1.1.0
 * Mobile-only styles
 */

@media screen and (max-width: 790px) {

    .full-start-new.tmlm-active {
        position: relative !important;
        display: block !important;
        width: 100% !important;
        min-height: 100vh !important;
        min-height: 100svh !important;
        overflow: hidden !important;
        background: #080808 !important;
        isolation: isolate;
    }

    /*
     * BACKDROP
     */

    .full-start-new.tmlm-active .tmlm-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 66vh;
        height: 66svh;
        min-height: 390px;
        max-height: 720px;
        overflow: hidden;
        z-index: 0;
        pointer-events: none;
        background: #080808;
    }

    .full-start-new.tmlm-active .tmlm-backdrop__image {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 25%;
        opacity: 0;
        transform: scale(1.025);
        transition:
            opacity 1.1s ease,
            transform 5s ease;
    }

    .full-start-new.tmlm-active .tmlm-backdrop.tmlm-loaded
    .tmlm-backdrop__image {
        opacity: 0.88;
        transform: scale(1);
    }

    /*
     * BACKDROP GRADIENT
     */

    .full-start-new.tmlm-active .tmlm-gradient {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 78vh;
        height: 78svh;
        min-height: 520px;
        z-index: 1;
        pointer-events: none;

        background:
            linear-gradient(
                to bottom,
                rgba(0,0,0,0.04) 0%,
                rgba(0,0,0,0.08) 32%,
                rgba(0,0,0,0.50) 58%,
                rgba(0,0,0,0.88) 82%,
                #080808 100%
            );
    }

    /*
     * MAIN CONTENT
     */

    .full-start-new.tmlm-active .full-start-new__body {
        position: relative !important;
        z-index: 2 !important;
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        min-height: 100vh;
        min-height: 100svh;
        padding: 35vh 0 28px !important;
        box-sizing: border-box !important;
    }

    .full-start-new.tmlm-active .full-start-new__left {
        display: none !important;
    }

    .full-start-new.tmlm-active .full-start-new__right {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: none !important;
        padding: 0 22px !important;
        box-sizing: border-box !important;
        margin: 0 !important;
    }

    /*
     * HEAD / YEAR / COUNTRY
     */

    .full-start-new.tmlm-active .full-start-new__head {
        position: relative;
        z-index: 2;
        font-size: 0.95em;
        line-height: 1.4;
        color: rgba(255,255,255,0.78);
        margin-bottom: 10px;
        letter-spacing: 0.04em;
    }

    /*
     * TITLE / LOGO
     */

    .full-start-new.tmlm-active .full-start-new__title {
        display: block !important;
        width: 100% !important;
        min-height: 0 !important;
        max-height: none !important;
        margin: 0 0 12px !important;
        padding: 0 !important;
        font-size: 2.3em !important;
        line-height: 1.12 !important;
        font-weight: 700 !important;
        color: #fff;
        overflow: visible !important;
        text-overflow: clip !important;
        -webkit-line-clamp: unset !important;
        line-clamp: unset !important;
    }

    .full-start-new.tmlm-active
    .full-start-new__title.tmlm-title-with-logo {
        display: flex !important;
        align-items: flex-end;
        min-height: 0 !important;
    }

    .full-start-new.tmlm-active .tmlm-movie-logo {
        display: block;
        width: auto;
        height: auto;
        max-width: 88%;
        max-height: 125px;
        object-fit: contain;
        object-position: left bottom;
        opacity: 0;
        animation: tmlmLogoAppear 0.8s ease forwards;
        filter: none;
    }

    @keyframes tmlmLogoAppear {
        from {
            opacity: 0;
            transform: translateY(9px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /*
     * TAGLINE
     */

    .full-start-new.tmlm-active .full-start-new__tagline {
        display: block;
        font-size: 1.12em !important;
        line-height: 1.35 !important;
        font-weight: 400;
        color: rgba(255,255,255,0.88);
        margin: 0 0 17px !important;
        max-width: 95%;
        opacity: 0;
        transform: translateY(7px);
        transition:
            opacity 0.7s ease,
            transform 0.7s ease;
    }

    .full-start-new.tmlm-active
    .full-start-new__tagline.tmlm-tagline-visible {
        opacity: 1;
        transform: translateY(0);
    }

    /*
     * RATINGS
     */

    .full-start-new.tmlm-active .full-start-new__rate-line {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 9px;
        margin: 0 0 13px !important;
        padding: 0 !important;
        font-size: 0.92em !important;
    }

    .full-start-new.tmlm-active
    .full-start-new__rate-line > * {
        margin: 0 !important;
    }

    .full-start-new.tmlm-active .full-start__rate {
        font-size: 0.92em;
    }

    .full-start-new.tmlm-active .full-start__pg {
        font-size: 0.9em;
    }

    /*
     * DETAILS
     */

    .full-start-new.tmlm-active .full-start-new__details {
        display: flex !important;
        flex-wrap: wrap !important;
        width: 100% !important;
        min-height: 0 !important;
        margin: 0 0 13px !important;
        padding: 0 !important;
        color: rgba(255,255,255,0.76);
        font-size: 0.94em !important;
        line-height: 1.55;
        gap: 4px 9px;
    }

    .full-start-new.tmlm-active
    .full-start-new__details > * {
        margin: 0 !important;
    }

    .full-start-new.tmlm-active
    .full-start-new__split {
        display: none !important;
    }

    /*
     * PRODUCTION STUDIOS
     */

    .full-start-new.tmlm-active .tmlm-studios {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 13px;
        margin: 0 0 15px;
        min-height: 25px;
    }

    .full-start-new.tmlm-active .tmlm-studios__item {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        max-width: 100px;
        height: 27px;
    }

    .full-start-new.tmlm-active .tmlm-studios__item img {
        display: block;
        max-width: 100px;
        max-height: 25px;
        width: auto;
        height: auto;
        object-fit: contain;
        opacity: 0.88;
    }

    /*
     * DESCRIPTION
     */

    .full-start-new.tmlm-active .tmlm-description {
        position: relative;
        z-index: 2;
        display: -webkit-box;
        width: 100%;
        max-width: 100%;
        margin: 0 0 20px;
        padding: 0;
        overflow: hidden;
        color: rgba(255,255,255,0.82);
        font-size: 1em;
        font-weight: 300;
        line-height: 1.55;
        -webkit-line-clamp: 5;
        line-clamp: 5;
        -webkit-box-orient: vertical;
        opacity: 0;
        animation: tmlmDescriptionAppear 0.8s ease 0.15s forwards;
    }

    @keyframes tmlmDescriptionAppear {
        from {
            opacity: 0;
            transform: translateY(8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /*
     * REACTIONS
     */

    .full-start-new.tmlm-active .full-start-new__reactions {
        position: relative;
        z-index: 2;
        margin-top: 3px;
    }

    /*
     * NATIVE BUTTONS
     *
     * No changes to button actions or selectors.
     */

    .full-start-new.tmlm-active .full-start-new__buttons {
        position: relative;
        z-index: 3;
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        gap: 10px;
        width: 100%;
        margin-top: 8px;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        padding: 5px 0 12px !important;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
    }

    .full-start-new.tmlm-active
    .full-start-new__buttons::-webkit-scrollbar {
        display: none;
    }

    .full-start-new.tmlm-active
    .full-start-new__buttons .full-start__button {
        flex-shrink: 0;
    }

    /*
     * HIDDEN POSTER
     */

    .full-start-new.tmlm-active .full-start-new__poster {
        display: none !important;
    }

}

/*
 * SMALL MOBILE SCREENS
 */

@media screen and (max-width: 480px) {

    .full-start-new.tmlm-active .full-start-new__body {
        padding-top: 33vh !important;
        padding-top: 33svh !important;
    }

    .full-start-new.tmlm-active .full-start-new__right {
        padding-left: 18px !important;
        padding-right: 18px !important;
    }

    .full-start-new.tmlm-active .full-start-new__title {
        font-size: 2.05em !important;
    }

    .full-start-new.tmlm-active .tmlm-movie-logo {
        max-height: 105px;
        max-width: 92%;
    }

    .full-start-new.tmlm-active .full-start-new__tagline {
        font-size: 1.02em !important;
    }

    .full-start-new.tmlm-active .tmlm-description {
        font-size: 0.96em;
        -webkit-line-clamp: 5;
        line-clamp: 5;
    }

}

/*
 * TABLETS / LARGE PHONES
 */

@media screen and (min-width: 581px) and (max-width: 790px) {

    .full-start-new.tmlm-active .full-start-new__body {
        padding-top: 38vh !important;
        padding-top: 38svh !important;
    }

    .full-start-new.tmlm-active .full-start-new__right {
        padding-left: 28px !important;
        padding-right: 28px !important;
    }

    .full-start-new.tmlm-active .tmlm-movie-logo {
        max-height: 150px;
    }

}
`;

        var style = document.createElement('style');

        style.id = CSS_ID;

        style.textContent = css;

        document.head.appendChild(style);
    }

    /*
     * LISTENER
     */

    addStyles();

    Lampa.Listener.follow('full', function (event) {

        if (!event || !event.type) return;

        if (event.type === 'complite') {
            processCard(event);
        }

        if (event.type === 'destroy') {
            processDestroy(event);
        }

    });

    /*
     * RESIZE SUPPORT
     */

    var resizeTimer = null;

    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);

        resizeTimer = setTimeout(function () {
            if (!isMobile()) {
                cleanupAll();
            }
        }, 250);
    });

    /*
     * DEBUG
     */

    window.tmdb_cinematic_mobile_110 = {
        version: VERSION,

        cleanup: cleanupAll,

        getActiveCount: function () {
            return activeStates.length;
        }
    };

})();
