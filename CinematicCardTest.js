(function () {
    'use strict';

    /*
     * INTERFACE+ 1.8.2 — STABLE NETFLIX CARD
     * TMDB ONLY
     *
     * BASE: INTERFACE+ 1.7.0
     * CARD LIFECYCLE: NEWCARD 3.3.7 ARCHITECTURE
     *
     * 1.8.2:
     * - Uses the native Lampa full activity
     * - Full-screen backdrop for the selected movie
     * - TMDB logo replaces the native title when available
     * - Preserves native metadata, description, buttons and actors
     * - No card recreation when navigating inside the card
     * - No permanent MutationObserver on the card DOM
     * - Background remains visible while a new image is loading
     * - Request tokens prevent outdated async callbacks
     * - Preserves the home hero and menu cinematic shift
     */

    var VERSION = '1.8.2';
    var READY_KEY = 'interface_plus_tmdb_only_182';

    if (window[READY_KEY]) return;
    window[READY_KEY] = true;

    var P = 'interface_plus_';

    var S = {
        hero: 'banner_hero_enabled',
        size: 'interface_size',
        font: 'fontchanger_selected',
        card: P + 'card_logo',
        scale: P + 'logo_scale'
    };

    var LOGO_SIZE = 'w500';
    var BACKDROP_SIZE = 'w1280';
    var LOGO_CACHE_TIMEOUT = 20000;
    var LOGO_PREFETCH_AHEAD = 10;
    var BACKDROP_CACHE_LIMIT = 12;

    var MENU_SHIFT = '20em';
    var MENU_SHIFT_MOBILE = '16em';

    var logoItems = {};
    var backdropCache = {};
    var backdropCacheOrder = [];
    var backdropPending = {};

    var initialized = false;

    var focusTimer = null;
    var restoreTimer = null;

    var activeHero = null;
    var activeCard = null;

    var activeCardToken = 0;
    var lastFocusKey = '';

    var screenBackground = null;
    var cardBackground = null;

    var currentFont = '';
    var currentSize = '';

    var menuObserver = null;

    var TITLE_SELECTOR = [
        '.full-start__title',
        '.full-start-new__title',
        '.full__title',
        '.full-card__title'
    ].join(',');

    /* -------------------------------------------------------
       UTILITIES
    ------------------------------------------------------- */

    function log() {
        try {
            console.log.apply(
                console,
                ['[INTERFACE+ ' + VERSION + ']'].concat(
                    [].slice.call(arguments)
                )
            );
        } catch (e) {}
    }

    function storageGet(k, fallback) {
        try {
            return Lampa.Storage.get(k, fallback);
        } catch (e) {
            return fallback;
        }
    }

    function enabled(k, fallback) {
        var value = storageGet(k, fallback);

        return (
            value === true ||
            value === 'true' ||
            value === 1 ||
            value === '1'
        );
    }

    function text(value) {
        return String(value == null ? '' : value).trim();
    }

    function first() {
        for (var i = 0; i < arguments.length; i++) {
            var value = text(arguments[i]);

            if (value) return value;
        }

        return '';
    }

    function node(value) {
        if (value && value.nodeType === 1) return value;

        if (
            value &&
            value[0] &&
            value[0].nodeType === 1
        ) {
            return value[0];
        }

        return null;
    }

    function renderActivity(object) {
        var result = null;

        try {
            if (
                object &&
                object.activity &&
                typeof object.activity.render === 'function'
            ) {
                result = object.activity.render();
            }
        } catch (e) {}

        if (!result) {
            try {
                if (
                    object &&
                    typeof object.render === 'function'
                ) {
                    result = object.render();
                }
            } catch (e) {}
        }

        return node(result);
    }

    function activeActivity() {
        try {
            return Lampa.Activity.active();
        } catch (e) {
            return null;
        }
    }

    function componentName(object) {
        return text(object && object.component).toLowerCase();
    }

    function isFull(object) {
        var component = componentName(object);

        return (
            component === 'full' ||
            component === 'full_start' ||
            component === 'fullstart'
        );
    }

    function isMain(object) {
        return componentName(object) === 'main';
    }

    function movieType(data) {
        if (!data) return 'movie';

        return (
            data.media_type === 'tv' ||
            data.type === 'tv' ||
            data.type === 'series' ||
            data.first_air_date ||
            data.number_of_seasons ||
            (data.name && !data.title)
        ) ? 'tv' : 'movie';
    }

    function movieYear(data) {
        var match = first(
            data && data.release_date,
            data && data.first_air_date,
            data && data.year
        ).match(/\b(19|20)\d{2}\b/);

        return match ? match[0] : '';
    }

    function movieTitle(data) {
        return first(
            data && data.title,
            data && data.name,
            data && data.original_title,
            data && data.original_name
        );
    }

    function normalizeTitle(value) {
        var result = text(value).toLowerCase();

        try {
            result = result.normalize('NFKD');
        } catch (e) {}

        return result
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\wа-яіїєґ]+/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function identity(data) {
        if (!data) return '';

        return [
            movieType(data),
            first(data.tmdb_id, data.tmdbId, data.id),
            normalizeTitle(movieTitle(data)),
            movieYear(data)
        ].join('|');
    }

    function getMovie(object) {
        if (!object) return null;

        var candidates = [
            object.movie,
            object.data && object.data.movie,
            object.data,
            object.card,
            object.card_data,
            object.params && object.params.movie,
            object.params && object.params.data,
            object.activity && object.activity.movie,
            object.activity && object.activity.data
        ];

        var best = null;
        var bestScore = -1;

        candidates.forEach(function (data) {
            if (!data || typeof data !== 'object') return;

            var score =
                (movieTitle(data) ? 10 : 0) +
                (movieYear(data) ? 4 : 0) +
                (data.tmdb_id || data.tmdbId ? 5 : data.id ? 2 : 0);

            if (score > bestScore && movieTitle(data)) {
                best = data;
                bestScore = score;
            }
        });

        return best;
    }

    function logoScale() {
        var value = parseInt(storageGet(S.scale, '100'), 10);

        value = Math.max(
            70,
            Math.min(120, isNaN(value) ? 100 : value)
        );

        return value / 100;
    }

    function heroEnabled() {
        return enabled(S.hero, true);
    }

    function cardEnabled() {
        return enabled(S.card, true);
    }

    /* -------------------------------------------------------
       GENRES
    ------------------------------------------------------- */

    var MOVIE_GENRES = {
        28: 'Бойовик',
        12: 'Пригоди',
        16: 'Анімація',
        35: 'Комедія',
        80: 'Кримінал',
        99: 'Документальний',
        18: 'Драма',
        10751: 'Сімейний',
        14: 'Фентезі',
        36: 'Історичний',
        27: 'Жахи',
        10402: 'Музика',
        9648: 'Детектив',
        10749: 'Мелодрама',
        878: 'Фантастика',
        10770: 'Телефільм',
        53: 'Трилер',
        10752: 'Військовий',
        37: 'Вестерн'
    };

    var TV_GENRES = {
        10759: 'Бойовик і пригоди',
        16: 'Анімація',
        35: 'Комедія',
        80: 'Кримінал',
        99: 'Документальний',
        18: 'Драма',
        10751: 'Сімейний',
        10762: 'Дитячий',
        9648: 'Детектив',
        10763: 'Новини',
        10764: 'Реаліті-шоу',
        10765: 'Фантастика',
        10766: 'Мильна опера',
        10767: 'Ток-шоу',
        10768: 'Війна і політика',
        37: 'Вестерн'
    };

    function movieGenres(data) {
        if (!data) return [];

        var result = [];
        var source = data.genres;

        if (Array.isArray(source) && source.length) {
            source.forEach(function (genre) {
                var name = typeof genre === 'string'
                    ? genre
                    : first(
                        genre && genre.name,
                        genre && genre.ua_name,
                        genre && genre.title
                    );

                if (name && result.indexOf(name) === -1) {
                    result.push(name);
                }
            });
        }

        if (!result.length) {
            var ids = data.genre_ids || data.genres_ids || [];
            var dictionary = movieType(data) === 'tv'
                ? TV_GENRES
                : MOVIE_GENRES;

            (Array.isArray(ids) ? ids : []).forEach(function (id) {
                var name = dictionary[Number(id)];

                if (name && result.indexOf(name) === -1) {
                    result.push(name);
                }
            });
        }

        return result.slice(0, 2);
    }

    /* -------------------------------------------------------
       TMDB LOGOS
    ------------------------------------------------------- */

    function adaptiveLogoHeight(img, mode) {
        if (!img || !img.naturalWidth || !img.naturalHeight) {
            return;
        }

        var ratio = img.naturalWidth / img.naturalHeight;

        var factor =
            ratio >= 3.5 ? 1.00 :
            ratio >= 3.0 ? 1.04 :
            ratio >= 2.5 ? 1.08 :
            ratio >= 2.0 ? 1.12 :
            ratio >= 1.5 ? 1.16 :
            ratio >= 1.1 ? 1.21 : 1.26;

        if (mode === 'hero') {
            img.style.height = (
                (window.innerWidth <= 480 ? 5 : 7) * factor
            ) + 'em';
        } else {
            img.style.height = Math.round(
                (window.innerWidth <= 480 ? 75 : 105) * factor
            ) + 'px';
        }

        img.style.width = 'auto';
        img.style.maxWidth = '100%';
        img.style.maxHeight = 'none';
        img.style.objectFit = 'contain';
        img.style.objectPosition = 'left center';
    }

    function setAdaptiveLogo(img, src, mode) {
        if (!img || !src) return;

        img.onload = function () {
            adaptiveLogoHeight(img, mode);
        };

        img.src = src;

        if (img.complete && img.naturalWidth) {
            adaptiveLogoHeight(img, mode);
        }
    }

    function pickLogo(logos) {
        var language = '';

        try {
            language = Lampa.Storage.field('tmdb_lang');
        } catch (e) {}

        var order = [language || 'en', 'en', null];

        for (var i = 0; i < order.length; i++) {
            var found = (logos || []).filter(function (logo) {
                return (
                    logo &&
                    logo.iso_639_1 === order[i] &&
                    logo.file_path
                );
            })[0];

            if (found) return found;
        }

        return (logos || []).filter(function (logo) {
            return logo && logo.file_path;
        })[0] || null;
    }

    function getLogoHolder(item) {
        var key = identity(item);

        if (!key) return {};

        if (!logoItems[key]) {
            logoItems[key] = {};
        }

        return logoItems[key];
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

        var completed = false;

        var timer = setTimeout(function () {
            finish(null);
        }, LOGO_CACHE_TIMEOUT);

        function finish(value) {
            if (completed) return;

            completed = true;

            clearTimeout(timer);

            item[key] = value || null;

            var waiting = item[key + '_wait'] || [];

            item[key + '_wait'] = null;

            waiting.forEach(function (fn) {
                try {
                    fn(item[key]);
                } catch (e) {}
            });
        }

        try {
            request(finish);
        } catch (e) {
            finish(null);
        }
    }

    function ensureLogo(item, callback) {
        callback = callback || function () {};

        if (!item) {
            callback(null);
            return;
        }

        var holder = getLogoHolder(item);

        cached(holder, 'tmdb_logo', function (done) {
            var id = first(
                item.tmdb_id,
                item.tmdbId,
                item.id
            );

            if (id && typeof id === 'object') {
                id = id.id;
            }

            id = text(id);

            if (!/^\d+$/.test(id)) {
                done(null);
                return;
            }

            var language = 'en';

            try {
                language = Lampa.Storage.field('tmdb_lang') || 'en';
            } catch (e) {}

            var tmdb =
                Lampa.Api &&
                Lampa.Api.sources &&
                Lampa.Api.sources.tmdb;

            if (!tmdb || !tmdb.get) {
                done(null);
                return;
            }

            tmdb.get(
                movieType(item) + '/' + id + '/images',
                {
                    filter: {
                        include_image_language: language + ',en,null'
                    }
                },
                function (json) {
                    var logo = json && json.logos
                        ? pickLogo(json.logos)
                        : null;

                    done(
                        logo
                            ? Lampa.Api.img(logo.file_path, LOGO_SIZE)
                            : null
                    );
                },
                function () {
                    done(null);
                }
            );
        }, callback);
    }

    function clearLogoCache() {
        logoItems = {};

        refreshAll(true);

        try {
            Lampa.Noty.show('Кеш логотипів TMDB очищено');
        } catch (e) {}
    }

    /* -------------------------------------------------------
       IMAGE CACHE
    ------------------------------------------------------- */

    function imageURL(path, size) {
        if (!path) return '';

        var value = text(path);

        if (/^https?:\/\//i.test(value)) {
            return value;
        }

        return 'https://image.tmdb.org/t/p/' +
            (size || 'w500') +
            (value.charAt(0) === '/' ? '' : '/') +
            value;
    }

    function preload(url, callback) {
        if (!url) {
            callback(false);
            return;
        }

        var img = new Image();
        var completed = false;

        function finish(ok) {
            if (completed) return;

            completed = true;

            img.onload = null;
            img.onerror = null;

            callback(ok);
        }

        img.onload = function () {
            finish(true);
        };

        img.onerror = function () {
            finish(false);
        };

        img.src = url;

        if (img.complete && img.naturalWidth) {
            finish(true);
        }
    }

    function rememberBackdrop(url) {
        if (!url) return;

        var index = backdropCacheOrder.indexOf(url);

        if (index !== -1) {
            backdropCacheOrder.splice(index, 1);
        }

        backdropCache[url] = true;
        backdropCacheOrder.push(url);

        while (
            backdropCacheOrder.length > BACKDROP_CACHE_LIMIT
        ) {
            var old = backdropCacheOrder.shift();

            if (old) {
                delete backdropCache[old];
            }
        }
    }

    function preloadBackdrop(url, callback) {
        callback = callback || function () {};

        if (!url) {
            callback(false);
            return;
        }

        if (backdropCache[url]) {
            callback(true);
            return;
        }

        if (backdropPending[url]) {
            backdropPending[url].push(callback);
            return;
        }

        backdropPending[url] = [callback];

        var img = new Image();
        var completed = false;

        function finish(ok) {
            if (completed) return;

            completed = true;

            img.onload = null;
            img.onerror = null;

            if (ok) {
                rememberBackdrop(url);
            }

            var waiting = backdropPending[url] || [];

            delete backdropPending[url];

            waiting.forEach(function (fn) {
                try {
                    fn(ok);
                } catch (e) {}
            });
        }

        img.onload = function () {
            finish(true);
        };

        img.onerror = function () {
            finish(false);
        };

        img.src = url;

        if (img.complete && img.naturalWidth) {
            finish(true);
        }
    }

    function prefetchHeroBackdrop(data) {
        if (!data || !data.backdrop_path) return;

        var url = imageURL(
            data.backdrop_path,
            BACKDROP_SIZE
        );

        if (url && !backdropCache[url]) {
            preloadBackdrop(url, function () {});
        }
    }

    function prefetchLogoItem(item) {
        if (!item) return;

        ensureLogo(item, function (url) {
            if (url) {
                new Image().src = url;
            }
        });
    }

    function prefetchNearbyLogos(card, root) {
        if (!card || !root) return;

        var cards = root.querySelectorAll('.card');

        var index = Array.prototype.indexOf.call(
            cards,
            card
        );

        if (index < 0) return;

        var end = Math.min(
            cards.length,
            index + 1 + LOGO_PREFETCH_AHEAD
        );

        for (var i = index; i < end; i++) {
            if (cards[i] && cards[i].card_data) {
                prefetchLogoItem(cards[i].card_data);
            }
        }
    }

    /* -------------------------------------------------------
       HOME SCREEN BACKGROUND
    ------------------------------------------------------- */

    function ensureBackgroundLayers(layer) {
        if (
            !layer ||
            layer.querySelector('.banner-screen-bg__image--a')
        ) {
            return;
        }

        layer.innerHTML =
            '<div class="banner-screen-bg__image banner-screen-bg__image--a"></div>' +
            '<div class="banner-screen-bg__image banner-screen-bg__image--b"></div>' +
            '<div class="banner-screen-bg__vignette"></div>';
    }

    function ensureScreenBackground() {
        if (
            screenBackground &&
            screenBackground.isConnected
        ) {
            ensureBackgroundLayers(screenBackground);
            return screenBackground;
        }

        var existing = document.getElementById(
            'interface-plus-screen-background'
        );

        if (existing) {
            screenBackground = existing;
            ensureBackgroundLayers(screenBackground);

            return screenBackground;
        }

        var layer = document.createElement('div');

        layer.id = 'interface-plus-screen-background';
        layer.className = 'banner-screen-bg';

        ensureBackgroundLayers(layer);

        document.body.appendChild(layer);

        screenBackground = layer;

        return screenBackground;
    }

    function clearHeroBackgrounds() {
        if (!screenBackground) {
            screenBackground = document.getElementById(
                'interface-plus-screen-background'
            );
        }

        if (!screenBackground) return;

        Array.prototype.forEach.call(
            screenBackground.querySelectorAll(
                '.banner-screen-bg__image'
            ),
            function (background) {
                background.classList.remove('show');
                background.style.backgroundImage = 'none';
            }
        );

        if (activeHero) {
            activeHero.activeBgIndex = 0;
        }
    }

    function hideHeroBackground() {
        if (!screenBackground) {
            screenBackground = document.getElementById(
                'interface-plus-screen-background'
            );
        }

        if (!screenBackground) return;

        screenBackground.style.display = 'none';

        clearHeroBackgrounds();
    }

    function showHeroBackground() {
        var layer = ensureScreenBackground();

        if (layer) {
            layer.style.display = 'block';
        }
    }

    /* -------------------------------------------------------
       CARD BACKGROUND
       Один контейнер на одну відкриту картку.
    ------------------------------------------------------- */

    function ensureCardBackground() {
        if (
            cardBackground &&
            cardBackground.isConnected
        ) {
            return cardBackground;
        }

        var existing = document.getElementById(
            'interface-plus-card-background'
        );

        if (existing) {
            cardBackground = existing;
            return cardBackground;
        }

        var layer = document.createElement('div');

        layer.id = 'interface-plus-card-background';
        layer.className = 'interface-plus-card-background';

        layer.innerHTML =
            '<div class="interface-plus-card-bg__image interface-plus-card-bg__image--a"></div>' +
            '<div class="interface-plus-card-bg__image interface-plus-card-bg__image--b"></div>' +
            '<div class="interface-plus-card-bg__shade"></div>';

        document.body.appendChild(layer);

        cardBackground = layer;

        return cardBackground;
    }

    function clearCardBackground() {
        var layer = cardBackground ||
            document.getElementById(
                'interface-plus-card-background'
            );

        if (!layer) return;

        layer.style.display = 'none';

        var images = layer.querySelectorAll(
            '.interface-plus-card-bg__image'
        );

        Array.prototype.forEach.call(
            images,
            function (image) {
                image.classList.remove('show');
                image.style.backgroundImage = 'none';
            }
        );
    }

    function showCardBackdrop(url, token) {
        if (!url) return;

        var layer = ensureCardBackground();

        layer.style.display = 'block';

        preloadBackdrop(url, function (ok) {
            if (
                !ok ||
                !activeCard ||
                activeCard.token !== token ||
                !activeCard.root ||
                !activeCard.root.isConnected
            ) {
                return;
            }

            var a = layer.querySelector(
                '.interface-plus-card-bg__image--a'
            );

            var b = layer.querySelector(
                '.interface-plus-card-bg__image--b'
            );

            if (!a || !b) return;

            var current = activeCard.bgIndex || 0;
            var next = current === 0 ? 1 : 0;

            var currentLayer = current === 0 ? a : b;
            var nextLayer = next === 0 ? a : b;

            nextLayer.classList.remove('show');
            nextLayer.style.backgroundImage =
                'url("' + url.replace(/"/g, '\\"') + '")';

            void nextLayer.offsetWidth;

            nextLayer.classList.add('show');

            if (currentLayer !== nextLayer) {
                currentLayer.classList.remove('show');
            }

            activeCard.bgIndex = next;
        });
    }

    /* -------------------------------------------------------
       CSS
    ------------------------------------------------------- */

    var CSS = [
        '#interface-plus-screen-background{position:fixed;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:0;display:none;background:#000;transition:transform .28s ease;will-change:transform;}',
        '.banner-screen-bg__image{position:absolute;inset:0;width:100%;height:100%;background-position:center 65%;background-repeat:no-repeat;background-size:cover;opacity:0;transition:opacity .18s ease;will-change:opacity;}',
        '.banner-screen-bg__image.show{opacity:1;}',
        '.banner-screen-bg__vignette{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;background:linear-gradient(to right,rgba(0,0,0,.48) 0%,rgba(0,0,0,.36) 12%,rgba(0,0,0,.23) 24%,rgba(0,0,0,.10) 38%,rgba(0,0,0,0) 56%),linear-gradient(to bottom,rgba(0,0,0,.30) 0vh,rgba(0,0,0,.20) 8vh,rgba(0,0,0,.09) 17vh,rgba(0,0,0,0) 30vh),linear-gradient(to bottom,rgba(0,0,0,0) 0vh,rgba(0,0,0,0) 35vh,rgba(0,0,0,.04) 40vh,rgba(0,0,0,.12) 45vh,rgba(0,0,0,.30) 50vh,rgba(0,0,0,.60) 55vh,rgba(0,0,0,.88) 59vh,#000 63vh,#000 100%);}',
        '.banner-host{position:relative;z-index:1;}',
        '.banner-enabled .banner-host .activity__body{padding-top:42vh!important;box-sizing:border-box;}',
        '.banner-hero{position:absolute;top:0;left:0;right:0;height:50vh;overflow:visible;pointer-events:none;z-index:2;transition:transform .28s ease;will-change:transform;}',
        '.banner-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:2;}',
        '.banner-hero__logo{display:none;width:auto;height:auto;max-width:100%;margin-bottom:1em;object-fit:contain;object-position:left center;opacity:0;transition:opacity .15s ease;filter:drop-shadow(0 4px 12px rgba(0,0,0,.6));}',
        '.banner-hero__logo.ready{opacity:1;}',
        '.banner-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:#f5f5f1;margin-bottom:.35em;text-shadow:0 3px 14px rgba(0,0,0,.7);}',
        '.banner-hero__meta{font-size:1.08em;color:rgba(245,245,241,.88);margin-bottom:.75em;display:flex;gap:.58em;align-items:center;flex-wrap:wrap;font-weight:500;line-height:1.4;text-shadow:0 2px 8px rgba(0,0,0,.65);}',
        '.banner-hero__meta-item{display:inline-flex;align-items:center;white-space:nowrap;}',
        '.banner-hero__rate{display:inline-flex;align-items:center;gap:.32em;background:transparent;color:#f0ca78;font-weight:800;}',
        '.banner-hero__rate-star{font-size:1.05em;color:#e9bd65;}',
        '.banner-hero__year{color:rgba(245,245,241,.90);}',
        '.banner-hero__genre{color:rgba(225,229,235,.82);}',
        '.banner-hero__separator{color:rgba(255,255,255,.38);font-size:.9em;}',
        '.banner-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 2px 10px rgba(0,0,0,.65);}',

        /* HOME MENU SHIFT */
        'body.menu--open #interface-plus-screen-background{width:100%;transform:translateX(' + MENU_SHIFT + ');}',
        'body.menu--open .banner-host .banner-hero{transform:translateX(' + MENU_SHIFT + ');}',

        /* CARD BACKGROUND */
        '#interface-plus-card-background{position:fixed;inset:0;width:100%;height:100%;z-index:0;display:none;overflow:hidden;pointer-events:none;background:#000;}',
        '.interface-plus-card-bg__image{position:absolute;inset:0;width:100%;height:100%;background-position:center center;background-repeat:no-repeat;background-size:cover;opacity:0;transition:opacity .35s ease;will-change:opacity;}',
        '.interface-plus-card-bg__image.show{opacity:1;}',
        '.interface-plus-card-bg__shade{position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.48) 34%,rgba(0,0,0,.16) 72%,rgba(0,0,0,.08) 100%),linear-gradient(0deg,#000 0%,rgba(0,0,0,.88) 12%,rgba(0,0,0,.52) 35%,rgba(0,0,0,.12) 72%,rgba(0,0,0,.24) 100%);}',
        'body.interface-plus-card-open #interface-plus-card-background{display:block;}',
        'body.interface-plus-card-open .activity{position:relative;z-index:1;}',
        'body.interface-plus-card-open .activity__body{position:relative;z-index:1;}',
        'body.interface-plus-card-open .full-start__background{opacity:0!important;background:none!important;}',
        'body.interface-plus-card-open .full-start-new__background{opacity:0!important;background:none!important;}',
        'body.interface-plus-card-open .full-start__title.interface-plus-card-title-active{font-size:0!important;line-height:0!important;}',
        'body.interface-plus-card-open .full-start-new__title.interface-plus-card-title-active{font-size:0!important;line-height:0!important;}',
        '.interface-plus-card-logo{display:block;width:auto;height:auto;max-width:100%;object-fit:contain;object-position:left center;opacity:0;transition:opacity .2s ease;filter:drop-shadow(0 3px 12px rgba(0,0,0,.55));}',
        '.interface-plus-card-logo.ready{opacity:1;}',
        '.interface-plus-card-title-active>.interface-plus-original-title{display:none!important;}',
        '.interface-plus-card-title-active>.interface-plus-card-logo{font-size:initial;line-height:normal;}',

        '@media(max-width:480px){.banner-hero__info{left:1.5em;width:75%;}.banner-screen-bg__image{background-position:center 60%;}.interface-plus-card-bg__image{background-position:center center;}}',
        '@media(max-width:480px){body.menu--open #interface-plus-screen-background{width:100%;transform:translateX(' + MENU_SHIFT_MOBILE + ');}body.menu--open .banner-host .banner-hero{transform:translateX(' + MENU_SHIFT_MOBILE + ');}}'
    ].join('\n');

    function installStyle() {
        var style = document.getElementById(
            'interface-plus-tmdb-only-style'
        ) || document.createElement('style');

        style.id = 'interface-plus-tmdb-only-style';
        style.textContent = CSS;

        if (!style.parentNode) {
            document.head.appendChild(style);
        }
    }

    /* -------------------------------------------------------
       HOME HERO
    ------------------------------------------------------- */

    function createHero(root) {
        if (!root) return null;

        if (
            root.__interfacePlusHero &&
            root.contains(root.__interfacePlusHero)
        ) {
            ensureScreenBackground();
            return root.__interfacePlusHero;
        }

        var layer = ensureScreenBackground();

        var hero = document.createElement('div');

        hero.className = 'banner-hero';

        hero.innerHTML =
            '<div class="banner-hero__info">' +
                '<img class="banner-hero__logo" alt=""/>' +
                '<div class="banner-hero__title"></div>' +
                '<div class="banner-hero__meta"></div>' +
                '<div class="banner-hero__descr"></div>' +
            '</div>';

        root.insertBefore(hero, root.firstChild);

        root.classList.add('banner-host');

        hero.parts = {
            bgA: layer.querySelector(
                '.banner-screen-bg__image--a'
            ),
            bgB: layer.querySelector(
                '.banner-screen-bg__image--b'
            ),
            logo: hero.querySelector('.banner-hero__logo'),
            title: hero.querySelector('.banner-hero__title'),
            meta: hero.querySelector('.banner-hero__meta'),
            descr: hero.querySelector('.banner-hero__descr')
        };

        hero.token = 0;
        hero.root = root;
        hero.activeBgIndex = 0;
        hero.lastMovieData = null;

        root.__interfacePlusHero = hero;

        return hero;
    }

    function applyBackdrop(hero, url, token) {
        if (!hero || hero.token !== token) return;

        var parts = hero.parts;

        var current = hero.activeBgIndex || 0;
        var next = current === 0 ? 1 : 0;

        var currentLayer = current === 0
            ? parts.bgA
            : parts.bgB;

        var nextLayer = next === 0
            ? parts.bgA
            : parts.bgB;

        if (!nextLayer) return;

        nextLayer.classList.remove('show');
        nextLayer.style.backgroundImage =
            'url("' + url.replace(/"/g, '\\"') + '")';

        void nextLayer.offsetWidth;

        nextLayer.classList.add('show');

        if (currentLayer && currentLayer !== nextLayer) {
            currentLayer.classList.remove('show');
        }

        hero.activeBgIndex = next;
    }

    function switchHeroBackdrop(hero, url, token) {
        if (!hero || !url) return;

        if (backdropCache[url]) {
            applyBackdrop(hero, url, token);
            return;
        }

        preloadBackdrop(url, function (ok) {
            if (ok && hero.token === token) {
                applyBackdrop(hero, url, token);
            }
        });
    }

    function buildHeroMeta(container, data) {
        container.textContent = '';

        var rating = Number(data.vote_average) || 0;

        if (rating > 0) {
            var rate = document.createElement('span');

            rate.className =
                'banner-hero__meta-item banner-hero__rate';

            rate.innerHTML =
                '<span class="banner-hero__rate-star">★</span>' +
                '<span>' + rating.toFixed(1) + '</span>';

            container.appendChild(rate);
        }

        var year = movieYear(data);

        if (year) {
            if (container.children.length) {
                var separator = document.createElement('span');

                separator.className =
                    'banner-hero__separator';

                separator.textContent = '·';

                container.appendChild(separator);
            }

            var yearNode = document.createElement('span');

            yearNode.className =
                'banner-hero__meta-item banner-hero__year';

            yearNode.textContent = year;

            container.appendChild(yearNode);
        }

        var genres = movieGenres(data);

        if (genres.length) {
            if (container.children.length) {
                var genreSeparator =
                    document.createElement('span');

                genreSeparator.className =
                    'banner-hero__separator';

                genreSeparator.textContent = '·';

                container.appendChild(genreSeparator);
            }

            var genreNode = document.createElement('span');

            genreNode.className =
                'banner-hero__meta-item banner-hero__genre';

            genreNode.textContent = genres.join(' / ');

            container.appendChild(genreNode);
        }
    }

    function showHero(hero, data, force) {
        if (!hero || !data) return;

        var key = identity(data);

        if (!force && hero.movieKey === key) return;

        hero.movieKey = key;
        hero.lastMovieData = data;
        hero.token++;

        var token = hero.token;
        var parts = hero.parts;

        showHeroBackground();

        parts.logo.classList.remove('ready');
        parts.logo.style.display = 'none';
        parts.logo.removeAttribute('src');

        parts.title.style.display = '';
        parts.title.textContent = movieTitle(data);

        parts.logo.style.transform =
            'scale(' + logoScale() + ')';

        parts.logo.style.transformOrigin = 'left center';

        buildHeroMeta(parts.meta, data);

        parts.descr.textContent = data.overview || '';

        if (data.backdrop_path) {
            switchHeroBackdrop(
                hero,
                imageURL(data.backdrop_path, BACKDROP_SIZE),
                token
            );
        }

        ensureLogo(data, function (url) {
            if (hero.token !== token || !url) return;

            preload(url, function (ok) {
                if (!ok || hero.token !== token) return;

                setAdaptiveLogo(parts.logo, url, 'hero');

                parts.logo.style.transform =
                    'scale(' + logoScale() + ')';

                parts.logo.style.transformOrigin = 'left center';
                parts.logo.style.display = 'block';

                requestAnimationFrame(function () {
                    if (hero.token !== token) return;

                    parts.logo.classList.add('ready');
                    parts.title.style.display = 'none';
                });
            });
        });
    }

    function attachHero(object) {
        if (!heroEnabled() || !object) return;

        if (!isMain(object)) {
            hideHeroBackground();
            return;
        }

        var root = renderActivity(object);

        if (!root) return;

        if (activeHero && activeHero.root !== root) {
            clearHeroBackgrounds();
            lastFocusKey = '';
        }

        activeHero = createHero(root);

        showHeroBackground();
    }

    function findFocusedMovie(root) {
        if (!root) return null;

        var selectors = [
            '.card.focus',
            '.card.hover',
            '.card.selected',
            '.card.is-focused',
            '.card.focused',
            '.card'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var found = root.querySelector(selectors[i]);

            if (found && found.card_data) {
                return found;
            }
        }

        var active = document.activeElement;

        if (
            active &&
            root.contains(active) &&
            active.closest
        ) {
            var card = active.closest('.card');

            if (card && card.card_data) {
                return card;
            }
        }

        return null;
    }

    function restoreHeroAfterFull() {
        if (!heroEnabled()) return;

        var activity = activeActivity();

        if (!isMain(activity)) return;

        var root = renderActivity(activity);

        if (!root) return;

        attachHero(activity);

        activeHero = root.__interfacePlusHero;

        if (!activeHero) return;

        showHeroBackground();

        var focusedCard = findFocusedMovie(root);

        if (focusedCard && focusedCard.card_data) {
            lastFocusKey = identity(focusedCard.card_data);

            prefetchHeroBackdrop(focusedCard.card_data);

            showHero(
                activeHero,
                focusedCard.card_data,
                true
            );

            prefetchNearbyLogos(focusedCard, root);

            return;
        }

        if (activeHero.lastMovieData) {
            lastFocusKey = identity(
                activeHero.lastMovieData
            );

            showHero(
                activeHero,
                activeHero.lastMovieData,
                true
            );

            return;
        }

        var firstCard = root.querySelector('.card');

        if (firstCard && firstCard.card_data) {
            lastFocusKey = identity(firstCard.card_data);

            showHero(
                activeHero,
                firstCard.card_data,
                true
            );
        }
    }

    function scheduleHeroRestore() {
        clearTimeout(restoreTimer);

        restoreTimer = setTimeout(function () {
            requestAnimationFrame(restoreHeroAfterFull);
        }, 100);
    }

    function onFocus(event) {
        if (!heroEnabled()) return;

        var target = event.target;

        if (!target || !target.closest) return;

        var item = target.closest('.card');

        if (!item || !item.card_data) return;

        var root = item.closest('.activity');

        if (!root || !root.__interfacePlusHero) return;

        var data = item.card_data;
        var key = identity(data);

        if (lastFocusKey === key) return;

        prefetchHeroBackdrop(data);
        prefetchNearbyLogos(item, root);

        clearTimeout(focusTimer);

        focusTimer = setTimeout(function () {
            if (!heroEnabled()) return;

            lastFocusKey = key;
            activeHero = root.__interfacePlusHero;

            showHero(activeHero, data);
        }, 50);
    }

    function applyHero() {
        var on = heroEnabled();

        document.body.classList.toggle(
            'banner-enabled',
            on
        );

        if (!on) {
            clearTimeout(focusTimer);
            clearTimeout(restoreTimer);

            lastFocusKey = '';

            hideHeroBackground();

            return;
        }

        attachHero(activeActivity());
    }

    /* -------------------------------------------------------
       CARD TITLE / LOGO
    ------------------------------------------------------- */

    function findTitle(root) {
        if (!root || !root.querySelector) return null;

        return root.querySelector(TITLE_SELECTOR);
    }

    function restoreCardTitle(root) {
        if (!root) return;

        var titles = [];

        if (
            root.matches &&
            root.matches('.interface-plus-card-title')
        ) {
            titles.push(root);
        }

        if (root.querySelectorAll) {
            Array.prototype.push.apply(
                titles,
                root.querySelectorAll(
                    '.interface-plus-card-title'
                )
            );
        }

        titles.forEach(function (title) {
            var logo = title.querySelector(
                '.interface-plus-card-logo'
            );

            if (logo) {
                logo.remove();
            }

            var original = title.querySelector(
                '.interface-plus-original-title'
            );

            if (original) {
                while (original.firstChild) {
                    title.insertBefore(
                        original.firstChild,
                        original
                    );
                }

                original.remove();
            }

            title.classList.remove(
                'interface-plus-card-title',
                'interface-plus-card-title-active'
            );
        });
    }

    function prepareCardLogo(title) {
        if (!title) return null;

        var existing = title.querySelector(
            '.interface-plus-card-logo'
        );

        if (existing) return existing;

        title.classList.add('interface-plus-card-title');

        var original = document.createElement('span');

        original.className =
            'interface-plus-original-title';

        while (title.firstChild) {
            original.appendChild(title.firstChild);
        }

        title.appendChild(original);

        var logo = document.createElement('img');

        logo.className = 'interface-plus-card-logo';
        logo.alt = '';
        logo.draggable = false;

        title.appendChild(logo);

        return logo;
    }

    function applyCardLogo(root, url) {
        if (!root || !url) return false;

        var title = findTitle(root);

        if (!title) return false;

        var logo = prepareCardLogo(title);

        if (!logo) return false;

        logo.style.transform =
            'scale(' + logoScale() + ')';

        logo.style.transformOrigin = 'left center';

        setAdaptiveLogo(logo, url, 'card');

        logo.classList.add('ready');

        title.classList.add(
            'interface-plus-card-title-active'
        );

        return true;
    }

    /* -------------------------------------------------------
       CARD LIFECYCLE
       No activity creation, no render loop, no DOM observer.
    ------------------------------------------------------- */

    function stopCard(restoreTitle) {
        activeCardToken++;

        if (activeCard && activeCard.root && restoreTitle) {
            restoreCardTitle(activeCard.root);
        }

        activeCard = null;

        document.body.classList.remove(
            'interface-plus-card-open'
        );

        clearCardBackground();
    }

    function cardIsCurrent(token, key, root) {
        return !!(
            activeCard &&
            activeCard.token === token &&
            activeCard.key === key &&
            activeCard.root === root &&
            root &&
            root.isConnected &&
            cardEnabled()
        );
    }

    function getCardBackdrop(data) {
        if (!data) return '';

        return imageURL(
            first(
                data.backdrop_path,
                data.backdrop
            ),
            BACKDROP_SIZE
        );
    }

    function startCardFromFullEvent(event) {
        if (!cardEnabled() || !event) return;

        var activityObject = event.object;

        var activity = activityObject &&
            activityObject.activity
            ? activityObject.activity
            : activityObject;

        var root = renderActivity(activityObject);

        if (!root) return;

        var data =
            event.data && event.data.movie
                ? event.data.movie
                : getMovie(activityObject);

        if (!data) return;

        var key = identity(data);

        if (
            activeCard &&
            activeCard.key === key &&
            activeCard.root === root
        ) {
            return;
        }

        stopCard(false);

        var token = activeCardToken;

        activeCard = {
            token: token,
            key: key,
            root: root,
            data: data,
            activity: activity,
            bgIndex: 0
        };

        document.body.classList.add(
            'interface-plus-card-open'
        );

        hideHeroBackground();

        var backdrop = getCardBackdrop(data);

        if (backdrop) {
            showCardBackdrop(backdrop, token);
        }

        /*
         * The full event is fired after Lampa has built
         * the native card. We only try a few animation
         * frames in case the title is inserted slightly later.
         * No permanent observer is installed.
         */

        var attempts = 0;

        function attachTitle() {
            if (!cardIsCurrent(token, key, root)) return;

            attempts++;

            var title = findTitle(root);

            if (title) {
                ensureLogo(data, function (url) {
                    if (!cardIsCurrent(token, key, root)) {
                        return;
                    }

                    if (url) {
                        applyCardLogo(root, url);
                    }
                });

                return;
            }

            if (attempts < 5) {
                requestAnimationFrame(attachTitle);
            }
        }

        requestAnimationFrame(attachTitle);
    }

    function refreshCard(force) {
        if (!cardEnabled()) {
            stopCard(true);
            return;
        }

        if (!force && activeCard) return;

        var activity = activeActivity();

        if (!isFull(activity)) return;

        /*
         * Do not rebuild the card here.
         * The full listener owns card initialization.
         */
    }

    function refreshAll(force) {
        lastFocusKey = '';

        if (activeHero) {
            activeHero.movieKey = '';
        }

        var activity = activeActivity();

        if (isFull(activity)) {
            if (activeCard && activeCard.root) {
                var logo = activeCard.root.querySelector(
                    '.interface-plus-card-logo'
                );

                if (logo) {
                    logo.style.transform =
                        'scale(' + logoScale() + ')';

                    adaptiveLogoHeight(logo, 'card');
                }
            }

            return;
        }

        if (isMain(activity)) {
            attachHero(activity);
        }
    }

    /* -------------------------------------------------------
       FONTS AND INTERFACE SIZE
    ------------------------------------------------------- */

    var FONTS = {
        default: {
            family: 'Roboto, Arial, sans-serif',
            url: ''
        },
        netflix: {
            family: '"Netflix Sans", Arial, sans-serif',
            url: 'https://assets.nflxext.com/ffe/siteui/fonts/netflix-sans/v3/NetflixSans_W_Rg.woff2'
        },
        montserrat: {
            family: '"Montserrat", sans-serif',
            url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap'
        },
        inter: {
            family: '"Inter", sans-serif',
            url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
        },
        nunito: {
            family: '"Nunito", sans-serif',
            url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap'
        }
    };

    function applyFont() {
        var name = text(storageGet(S.font, 'default'));

        if (currentFont === name) return;

        currentFont = name;

        var font = FONTS[name] || FONTS.default;

        var oldFace = document.getElementById(
            'interface-plus-font-face'
        );

        if (oldFace) oldFace.remove();

        var oldStyle = document.getElementById(
            'interface-plus-font-style'
        );

        if (oldStyle) oldStyle.remove();

        if (font.url) {
            var face = document.createElement('style');

            face.id = 'interface-plus-font-face';

            face.textContent =
                font.url.indexOf('googleapis.com') !== -1
                    ? '@import url("' + font.url + '");'
                    : '@font-face{font-family:"Netflix Sans";src:url("' +
                      font.url +
                      '") format("woff2");font-weight:400}';

            document.head.appendChild(face);
        }

        var style = document.createElement('style');

        style.id = 'interface-plus-font-style';

        style.textContent =
            'body,.body,*{font-family:' +
            font.family +
            '!important}';

        document.head.appendChild(style);
    }

    function patchMaker(count) {
        if (!Lampa.Maker || !Lampa.Maker.map) return;

        ['Line', 'Category'].forEach(function (type) {
            var maker = Lampa.Maker.map(type);

            if (
                !maker ||
                !maker.Items ||
                !maker.Items.onInit
            ) {
                return;
            }

            if (maker.Items.__interfacePlusPatched) {
                maker.Items.__interfacePlusCount = count;
                return;
            }

            var original = maker.Items.onInit;

            maker.Items.onInit = function () {
                original.apply(this, arguments);

                if (type === 'Line') {
                    this.view =
                        maker.Items.__interfacePlusCount ||
                        count;
                } else {
                    this.limit_view =
                        maker.Items.__interfacePlusCount ||
                        count;
                }
            };

            maker.Items.__interfacePlusPatched = true;
            maker.Items.__interfacePlusCount = count;
        });
    }

    function applySize() {
        var value =
            parseFloat(storageGet(S.size, '10.6')) || 10.6;

        var mobile = false;

        try {
            mobile = !!(
                Lampa.Platform &&
                Lampa.Platform.screen &&
                Lampa.Platform.screen('mobile')
            );
        } catch (e) {}

        if (mobile) {
            value = 10.1;
        }

        if (String(value) === currentSize) return;

        currentSize = String(value);

        document.body.style.fontSize = value + 'px';

        patchMaker(
            value <= 9.6 ? 8 :
            value <= 11.1 ? 7 : 6
        );
    }

    /* -------------------------------------------------------
       SETTINGS
    ------------------------------------------------------- */

    function addSettings() {
        if (!Lampa.SettingsApi) return;

        var api = Lampa.SettingsApi;

        api.addComponent({
            component: 'interface_plus_settings',
            name: 'Інтерфейс +',
            icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 5h2v5h-2z"/></svg>'
        });

        function add(
            key,
            type,
            def,
            name,
            description,
            values,
            change
        ) {
            api.addParam({
                component: 'interface_plus_settings',
                param: {
                    name: key,
                    type: type,
                    default: def,
                    values: values
                },
                field: {
                    name: name,
                    description: description || ''
                },
                onChange: change
            });
        }

        add(
            S.hero,
            'trigger',
            true,
            'Динамічні банери',
            'Преміальні банери на головній сторінці',
            null,
            applyHero
        );

        add(
            S.card,
            'trigger',
            true,
            'Логотип у картці фільму',
            'Логотипи тільки з TMDB',
            null,
            function () {
                if (!cardEnabled()) {
                    stopCard(true);
                }
            }
        );

        add(
            S.scale,
            'select',
            '100',
            'Розмір логотипів',
            'Додатковий масштаб після автоматичного підбору',
            {
                '70': '70%',
                '80': '80%',
                '90': '90%',
                '100': '100%',
                '110': '110%',
                '120': '120%'
            },
            function () {
                refreshAll(false);
            }
        );

        add(
            'interface_plus_clear_logo_cache',
            'button',
            '',
            'Очистити кеш логотипів',
            'Повторно отримати логотипи з TMDB',
            null,
            clearLogoCache
        );

        add(
            S.size,
            'select',
            '10.6',
            'Розмір інтерфейсу',
            'Масштаб елементів інтерфейсу',
            {
                '09.1': 'Міні',
                '09.6': 'Дуже малий',
                '10.1': 'Малий',
                '10.6': 'Середній'
            },
            applySize
        );

        add(
            S.font,
            'select',
            'default',
            'Шрифт інтерфейсу',
            'Стиль тексту',
            {
                default: 'Roboto',
                netflix: 'Netflix Sans',
                montserrat: 'Montserrat',
                inter: 'Inter',
                nunito: 'Nunito'
            },
            applyFont
        );
    }

    /* -------------------------------------------------------
       MENU OBSERVER
    ------------------------------------------------------- */

    function installMenuObserver() {
        if (!window.MutationObserver || menuObserver) {
            return;
        }

        menuObserver = new MutationObserver(function () {
            var opened = document.body.classList.contains(
                'menu--open'
            );

            document.body.classList.toggle(
                'interface-plus-menu-open',
                opened
            );
        });

        menuObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class']
        });

        document.body.classList.toggle(
            'interface-plus-menu-open',
            document.body.classList.contains('menu--open')
        );
    }

    /* -------------------------------------------------------
       LAMPA LISTENERS
    ------------------------------------------------------- */

    function installListeners() {
        document.addEventListener(
            'hover:focus',
            onFocus,
            true
        );

        if (!Lampa.Listener) return;

        /*
         * Activity lifecycle:
         * - start: hide the home hero when leaving main
         * - destroy: release card references and restore hero
         */

        Lampa.Listener.follow('activity', function (event) {
            if (!event || !event.object) return;

            if (event.type === 'start') {
                requestAnimationFrame(function () {
                    if (isFull(event.object)) {
                        clearTimeout(restoreTimer);
                        clearTimeout(focusTimer);

                        lastFocusKey = '';

                        hideHeroBackground();

                        stopCard(false);
                    } else if (isMain(event.object)) {
                        stopCard(false);
                        attachHero(event.object);
                    } else {
                        clearTimeout(focusTimer);

                        stopCard(false);
                        hideHeroBackground();
                    }
                });
            }

            if (
                event.type === 'destroy' &&
                isFull(event.object)
            ) {
                stopCard(false);
                scheduleHeroRestore();
            }

            if (event.type === 'destroy') {
                var component = componentName(event.object);

                if (
                    component === 'main' ||
                    component === 'category'
                ) {
                    hideHeroBackground();
                }
            }
        });

        /*
         * The full event is the only place where the card
         * interface is initialized. It fires after Lampa
         * has completed its native card rendering.
         */

        Lampa.Listener.follow('full', function (event) {
            if (
                !event ||
                (
                    event.type !== 'complete' &&
                    event.type !== 'complite'
                )
            ) {
                return;
            }

            requestAnimationFrame(function () {
                startCardFromFullEvent(event);
            });
        });

        try {
            if (
                Lampa.Storage.listener &&
                Lampa.Storage.listener.follow
            ) {
                Lampa.Storage.listener.follow(
                    'change',
                    function (event) {
                        if (!event || !event.name) return;

                        if (event.name === S.hero) {
                            applyHero();
                        }

                        if (event.name === S.card) {
                            if (!cardEnabled()) {
                                stopCard(true);
                            }
                        }

                        if (event.name === S.font) {
                            currentFont = '';
                            applyFont();
                        }

                        if (event.name === S.size) {
                            currentSize = '';
                            applySize();
                        }

                        if (event.name === S.scale) {
                            refreshAll(false);
                        }
                    }
                );
            }
        } catch (e) {}
    }

    /* -------------------------------------------------------
       INITIALIZATION
    ------------------------------------------------------- */

    function init() {
        if (
            initialized ||
            !window.Lampa ||
            !Lampa.Storage
        ) {
            return;
        }

        initialized = true;

        installStyle();

        ensureScreenBackground();
        ensureCardBackground();

        installMenuObserver();

        applyFont();
        applySize();
        applyHero();

        addSettings();

        installListeners();

        requestAnimationFrame(function () {
            var activity = activeActivity();

            if (isFull(activity)) {
                hideHeroBackground();

                /*
                 * Do not initialize the card here.
                 * Wait for the native "full:complite" event.
                 */
            } else if (isMain(activity)) {
                attachHero(activity);
            } else {
                hideHeroBackground();
            }
        });

        log('Stable Netflix card initialized');
    }

    if (window.appready) {
        setTimeout(init, 150);
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
            if (event && event.type === 'ready') {
                setTimeout(init, 150);
            }
        });
    }

})();
