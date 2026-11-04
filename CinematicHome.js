
(function () {
    'use strict';

    /*
     * @name CINEMATIC HOME
     * @version 1.0.0
     * @author Crowley24
     * @description Premium cinematic home screen for Lampa
     * @platforms Lampa | Android TV | Mobile
     *
     * CORE 1.0.0
     * - Independent cinematic Hero Banner
     * - Automatic first card detection
     * - Hero updates on focused card
     * - TMDB backdrop and movie logo
     * - Production studio logo when available
     * - TMDB metadata and overview
     * - Language priority: Lampa language > English > no language
     * - Request token protection
     * - Request deduplication
     * - Separate image and metadata caches
     * - Lightweight CSS transitions
     * - Native Lampa catalogs remain unchanged
     */

    var PLUGIN_NAME = 'CINEMATIC HOME';
    var VERSION = '1.0.0';

    if (window.cinematicHomeCore100) return;
    window.cinematicHomeCore100 = true;

    if (!window.Lampa || !Lampa.Api || !Lampa.Api.sources || !Lampa.Api.sources.tmdb) {
        console.warn('[' + PLUGIN_NAME + '] TMDB API unavailable');
        return;
    }

    var tmdb = Lampa.Api.sources.tmdb;

    var CONFIG = {
        enabled: true,

        heroHeight: 52,
        minHeight: 360,
        maxHeight: 650,

        logoMaxWidth: 52,
        logoMaxHeight: 115,

        studioMaxWidth: 150,
        studioMaxHeight: 38,

        backdropQuality: 'w1280',
        logoQuality: 'w500',

        focusDelay: 100,
        initialDelay: 250,

        backdropFade: 450,
        logoFade: 280,

        maxImageCache: 160,
        maxDetailsCache: 100,

        debug: false
    };

    var state = {
        active: false,
        root: null,
        content: null,
        hero: null,

        observer: null,
        focusTimer: null,
        initialTimer: null,

        requestToken: 0,
        currentKey: '',
        currentItem: null,

        backgroundIndex: 0,
        backgroundImages: [],

        logoCache: new Map(),
        studioCache: new Map(),
        detailsCache: new Map(),

        pending: new Map(),

        listenersInstalled: false
    };

    var STYLE_ID = 'cinematic-home-core-100-style';

    /* -------------------------------------------------------
       UTILITIES
    ------------------------------------------------------- */

    function log() {
        if (!CONFIG.debug) return;

        var args = Array.prototype.slice.call(arguments);
        args.unshift('[' + PLUGIN_NAME + ']');

        console.log.apply(console, args);
    }

    function safeString(value) {
        return value === undefined || value === null ? '' : String(value);
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

        if (item.first_air_date || item.name || item.original_name) {
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

        return item.title ||
            item.name ||
            item.original_title ||
            item.original_name ||
            '';
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
            var first = cache.keys().next().value;
            cache.delete(first);
        }
    }

    function requestOnce(key, callback) {
        if (state.pending.has(key)) {
            state.pending.get(key).push(callback);
            return;
        }

        state.pending.set(key, [callback]);

        function finish(result) {
            var callbacks = state.pending.get(key) || [];

            state.pending.delete(key);

            callbacks.forEach(function (fn) {
                try {
                    fn(result);
                } catch (e) {
                    console.warn(e);
                }
            });
        }

        return finish;
    }

    /* -------------------------------------------------------
       TMDB REQUESTS
    ------------------------------------------------------- */

    function getDetails(item, callback) {
        var key = getItemKey(item);

        if (state.detailsCache.has(key)) {
            callback(state.detailsCache.get(key));
            return;
        }

        var pendingKey = 'details:' + key;
        var finish = requestOnce(pendingKey, function (result) {
            callback(result);
        });

        if (!finish) return;

        var method = getMediaType(item);

        try {
            tmdb.get(method + '/' + getItemId(item), {}, function (response) {
                response = response || {};

                cacheSet(
                    state.detailsCache,
                    key,
                    response,
                    CONFIG.maxDetailsCache
                );

                finish(response);
            });
        } catch (e) {
            finish(null);
        }
    }

    function chooseLogo(images) {
        if (!images || !Array.isArray(images.logos)) return null;

        var logos = images.logos;
        var languages = getLanguageList();

        for (var i = 0; i < languages.length; i++) {
            var lang = languages[i];

            var found = logos.find(function (logo) {
                return logo.iso_639_1 === lang && logo.file_path;
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

        var pendingKey = 'logo:' + key;
        var finish = requestOnce(pendingKey, function (result) {
            callback(result);
        });

        if (!finish) return;

        var method = getMediaType(item);
        var languages = getLanguageList();

        try {
            tmdb.get(
                method + '/' + getItemId(item) + '/images',
                {
                    filter: {
                        include_image_language: languages
                    }
                },
                function (response) {
                    var selected = chooseLogo(response);

                    var result = selected
                        ? getImageURL(selected.file_path, CONFIG.logoQuality)
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

                    var max = Math.max(r, g, b);
                    var min = Math.min(r, g, b);

                    if (max - min > 35) colored++;
                }

                if (!total) {
                    callback(false);
                    return;
                }

                var darkRatio = dark / total;
                var colorRatio = colored / total;

                callback(
                    darkRatio > 0.70 &&
                    colorRatio < 0.12
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
                    CONFIG.maxDetailsCache
                );

                callback(null);
                return;
            }

            var result = {
                name: selected.name || '',
                url: getImageURL(
                    selected.logo_path,
                    'w300'
                ),
                white: false
            };

            isBlackStudioLogo(result.url, function (isBlack) {
                result.white = isBlack;

                cacheSet(
                    state.studioCache,
                    key,
                    result,
                    CONFIG.maxDetailsCache
                );

                callback(result);
            });
        }

        if (item.production_companies &&
            Array.isArray(item.production_companies)) {
            processDetails(item);
            return;
        }

        getDetails(item, processDetails);
    }

    /* -------------------------------------------------------
       HERO HTML
    ------------------------------------------------------- */

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');

        style.id = STYLE_ID;

        style.textContent = `
            .cinematic-home {
                position: relative;
                display: block;
                width: 100%;
                height: ${CONFIG.heroHeight}vh;
                min-height: ${CONFIG.minHeight}px;
                max-height: ${CONFIG.maxHeight}px;
                overflow: hidden;
                margin: 0 0 1.2em 0;
                background: #101114;
                isolation: isolate;
                box-sizing: border-box;
                pointer-events: none;
                z-index: 1;
            }

            .cinematic-home__background {
                position: absolute;
                inset: 0;
                overflow: hidden;
                z-index: -2;
            }

            .cinematic-home__backdrop {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center 30%;
                opacity: 0;
                transition: opacity ${CONFIG.backdropFade}ms ease;
            }

            .cinematic-home__backdrop.active {
                opacity: 1;
            }

            .cinematic-home__gradient {
                position: absolute;
                inset: 0;
                z-index: -1;
                background:
                    linear-gradient(
                        90deg,
                        rgba(12,13,16,0.98) 0%,
                        rgba(12,13,16,0.88) 22%,
                        rgba(12,13,16,0.58) 42%,
                        rgba(12,13,16,0.12) 75%,
                        rgba(12,13,16,0.05) 100%
                    ),
                    linear-gradient(
                        0deg,
                        rgba(12,13,16,1) 0%,
                        rgba(12,13,16,0.72) 13%,
                        rgba(12,13,16,0.12) 55%,
                        rgba(12,13,16,0.04) 100%
                    );
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
                color: rgba(255,255,255,0.85);
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
                color: rgba(255,255,255,0.84);
                font-size: 15px;
                line-height: 1.48;
                font-weight: 400;
                max-width: 100%;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .cinematic-home__empty {
                display: none;
            }

            @media (max-width: 800px) {
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

                .cinematic-home__gradient {
                    background:
                        linear-gradient(
                            90deg,
                            rgba(12,13,16,0.85) 0%,
                            rgba(12,13,16,0.42) 65%,
                            rgba(12,13,16,0.15) 100%
                        ),
                        linear-gradient(
                            0deg,
                            rgba(12,13,16,1) 0%,
                            rgba(12,13,16,0.65) 20%,
                            transparent 100%
                        );
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .cinematic-home__backdrop,
                .cinematic-home__logo,
                .cinematic-home__studio {
                    transition: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function createHero() {
        var hero = document.createElement('div');

        hero.className = 'cinematic-home';

        hero.innerHTML = `
            <div class="cinematic-home__background">
                <img class="cinematic-home__backdrop" />
                <img class="cinematic-home__backdrop" />
            </div>

            <div class="cinematic-home__gradient"></div>

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

        state.backgroundImages = Array.prototype.slice.call(
            hero.querySelectorAll('.cinematic-home__backdrop')
        );

        state.hero = hero;

        return hero;
    }

    /* -------------------------------------------------------
       HERO RENDERING
    ------------------------------------------------------- */

    function setBackdrop(url, token) {
        if (!state.hero || !url) return;

        var nextIndex = state.backgroundIndex === 0 ? 1 : 0;
        var nextImage = state.backgroundImages[nextIndex];
        var currentImage = state.backgroundImages[state.backgroundIndex];

        var image = new Image();

        image.onload = function () {
            if (token !== state.requestToken || !state.active) return;

            nextImage.src = url;

            requestAnimationFrame(function () {
                if (token !== state.requestToken || !state.active) return;

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

    function setLogo(url, token, title) {
        if (!state.hero) return;

        var logo = state.hero.querySelector('.cinematic-home__logo');
        var titleElement = state.hero.querySelector('.cinematic-home__title');

        logo.classList.remove('visible');
        titleElement.classList.remove('visible');

        if (!url) {
            titleElement.textContent = title || '';
            titleElement.classList.add('visible');
            return;
        }

        var image = new Image();

        image.onload = function () {
            if (token !== state.requestToken || !state.active) return;

            logo.onload = function () {
                if (token !== state.requestToken || !state.active) return;

                logo.classList.add('visible');
                titleElement.classList.remove('visible');
            };

            logo.src = url;

            if (logo.complete && logo.naturalWidth) {
                logo.classList.add('visible');
            }
        };

        image.onerror = function () {
            if (token !== state.requestToken || !state.active) return;

            titleElement.textContent = title || '';
            titleElement.classList.add('visible');
        };

        image.src = url;
    }

    function setStudio(studio, token) {
        if (!state.hero) return;

        var element = state.hero.querySelector('.cinematic-home__studio');

        element.classList.remove('visible');
        element.classList.remove('white');
        element.innerHTML = '';

        if (!studio || !studio.url) return;

        var image = document.createElement('img');

        image.onload = function () {
            if (token !== state.requestToken || !state.active) return;

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

    function setMetadata(item) {
        if (!state.hero) return;

        var meta = state.hero.querySelector('.cinematic-home__meta');
        var overview = state.hero.querySelector('.cinematic-home__overview');

        var parts = [];

        var year = getYear(item);
        var rating = getRating(item);
        var genres = getGenres(item);

        if (year) {
            parts.push('<span>' + escapeHTML(year) + '</span>');
        }

        if (rating) {
            parts.push(
                '<span class="cinematic-home__rating">' +
                escapeHTML(rating) +
                '</span>'
            );
        }

        if (genres) {
            parts.push('<span>' + escapeHTML(genres) + '</span>');
        }

        meta.innerHTML = parts.join('<span>·</span>');

        overview.textContent = getOverview(item);
    }

    /* -------------------------------------------------------
       HERO UPDATE
    ------------------------------------------------------- */

    function updateHero(item) {
        if (!CONFIG.enabled || !state.active || !isValidItem(item)) return;

        var key = getItemKey(item);

        if (key === state.currentKey) return;

        state.currentKey = key;
        state.currentItem = item;

        var token = ++state.requestToken;

        log('Update hero:', key, getTitle(item));

        setMetadata(item);

        var directBackdrop = getImageURL(
            item.backdrop_path,
            CONFIG.backdropQuality
        );

        if (directBackdrop) {
            setBackdrop(directBackdrop, token);
        }

        var directLogo = '';

        ensureLogo(item, function (logoURL) {
            if (token !== state.requestToken || !state.active) return;

            setLogo(logoURL || directLogo, token, getTitle(item));
        });

        ensureStudioLogo(item, function (studio) {
            if (token !== state.requestToken || !state.active) return;

            setStudio(studio, token);
        });

        getDetails(item, function (details) {
            if (token !== state.requestToken || !state.active || !details) return;

            if (!directBackdrop && details.backdrop_path) {
                setBackdrop(
                    getImageURL(
                        details.backdrop_path,
                        CONFIG.backdropQuality
                    ),
                    token
                );
            }

            if (!getOverview(item) && details.overview) {
                var overview = state.hero.querySelector(
                    '.cinematic-home__overview'
                );

                overview.textContent = details.overview;
            }

            if (!getGenres(item) && details.genres) {
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

    /* -------------------------------------------------------
       CARD DATA
    ------------------------------------------------------- */

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
            var item = candidates[i];

            if (isValidItem(item)) return item;
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
            if (element.matches && element.matches('.card')) {
                return element;
            }

            if (element.closest) {
                return element.closest('.card');
            }
        }

        return null;
    }

    function processFocusedCard(card) {
        card = getCardElement(card);

        if (!card || !state.active) return;

        var item = getCardData(card);

        if (!isValidItem(item)) return;

        if (state.focusTimer) {
            clearTimeout(state.focusTimer);
        }

        state.focusTimer = setTimeout(function () {
            if (!state.active) return;

            var currentCard = document.querySelector(
                '.card.focus, .card.hover, .card:focus'
            );

            if (currentCard && currentCard !== card) {
                return;
            }

            updateHero(item);
        }, CONFIG.focusDelay);
    }

    /* -------------------------------------------------------
       INITIAL CARD DETECTION
    ------------------------------------------------------- */

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
        if (!state.active) return;

        var focused = document.querySelector(
            '.card.focus, .card.hover, .card:focus'
        );

        if (focused && state.root && state.root.contains(focused)) {
            processFocusedCard(focused);
            return;
        }

        var first = findFirstCard();

        if (first) {
            updateHero(first.item);
            log('Initial card:', getTitle(first.item));
        }
    }

    /* -------------------------------------------------------
       HOME DETECTION
    ------------------------------------------------------- */

    function getActivityName(event) {
        var candidates = [];

        if (event) {
            candidates.push(event.component);
            candidates.push(event.activity);
            candidates.push(event.object);
        }

        try {
            if (Lampa.Activity && Lampa.Activity.active) {
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

            if (candidate.component &&
                candidate.component.name) {
                return String(
                    candidate.component.name
                ).toLowerCase();
            }
        }

        return '';
    }

    function getMainActivity() {
        var activities = document.querySelectorAll('.activity');

        for (var i = activities.length - 1; i >= 0; i--) {
            var activity = activities[i];

            if (!activity.offsetParent) continue;

            if (
                activity.querySelector('.full-start') ||
                activity.querySelector('.modal')
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

    function isHomeActivity(event) {
        var name = getActivityName(event);

        if (name) {
            return (
                name === 'main' ||
                name === 'home' ||
                name === 'index'
            );
        }

        var root = getMainActivity();

        return !!root;
    }

    /* -------------------------------------------------------
       ACTIVITY INITIALIZATION
    ------------------------------------------------------- */

    function findContent(root) {
        if (!root) return null;

        return root.querySelector('.scroll__body') ||
            root.querySelector('.activity__body') ||
            root;
    }

    function startHome() {
        if (!CONFIG.enabled) return;

        var root = getMainActivity();

        if (!root) {
            log('Main activity not found');
            return;
        }

        if (state.active && state.root === root) return;

        stopHome();

        state.active = true;
        state.root = root;
        state.content = findContent(root);

        if (!state.content) {
            state.active = false;
            return;
        }

        installStyles();

        var hero = createHero();

        state.content.insertBefore(
            hero,
            state.content.firstChild
        );

        attachFocusTracking();

        state.initialTimer = setTimeout(function () {
            initializeFirstCard();
        }, CONFIG.initialDelay);

        log('Home started');
    }

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

        if (state.hero && state.hero.parentNode) {
            state.hero.parentNode.removeChild(state.hero);
        }

        state.hero = null;
        state.root = null;
        state.content = null;
        state.currentKey = '';
        state.currentItem = null;
        state.backgroundImages = [];

        log('Home stopped');
    }

    /* -------------------------------------------------------
       FOCUS TRACKING
    ------------------------------------------------------- */

    function attachFocusTracking() {
        if (!state.root) return;

        state.root.addEventListener(
            'focusin',
            function (event) {
                processFocusedCard(event.target);
            },
            true
        );

        state.root.addEventListener(
            'mouseover',
            function (event) {
                processFocusedCard(event.target);
            },
            true
        );

        if (window.MutationObserver) {
            state.observer = new MutationObserver(function (mutations) {
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

                if (shouldCheckFocus) {
                    var focused = state.root.querySelector(
                        '.card.focus, .card.hover, .card:focus'
                    );

                    if (focused) {
                        processFocusedCard(focused);
                    }
                }

                if (
                    shouldCheckInitial &&
                    !state.currentKey
                ) {
                    if (state.initialTimer) {
                        clearTimeout(state.initialTimer);
                    }

                    state.initialTimer = setTimeout(
                        initializeFirstCard,
                        150
                    );
                }
            });

            state.observer.observe(state.root, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }

    /* -------------------------------------------------------
       LAMPA EVENTS
    ------------------------------------------------------- */

    function installListeners() {
        if (state.listenersInstalled) return;

        state.listenersInstalled = true;

        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('activity', function (event) {
                if (!event) return;

                if (event.type === 'start') {
                    if (isHomeActivity(event)) {
                        setTimeout(startHome, 100);
                    } else {
                        stopHome();
                    }
                }

                if (event.type === 'destroy') {
                    if (state.active) {
                        stopHome();
                    }
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

                    if (card) processFocusedCard(card);
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

                if (card) processFocusedCard(card);
            });
        }
    }

    /* -------------------------------------------------------
       INITIALIZATION
    ------------------------------------------------------- */

    function init() {
        installStyles();
        installListeners();

        setTimeout(function () {
            if (isHomeActivity(null)) {
                startHome();
            }
        }, 500);

        log(
            PLUGIN_NAME +
            ' ' +
            VERSION +
            ' initialized'
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
