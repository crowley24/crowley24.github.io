(function () {
    'use strict';

    /*
     * INTERFACE+ 1.7.1 — INSTANT CINEMATIC FULL CARD
     * TMDB ONLY
     *
     * CHANGES 1.7.1:
     * - Full-screen cinematic background on movie card
     * - Reuses the existing Interface+ backdrop cache
     * - No duplicate TMDB backdrop requests
     * - Instant background display when backdrop is cached
     * - Smooth background replacement when navigating cards
     * - Background remains stable while card content updates
     * - Reuses existing TMDB logo cache
     * - Preserved 1.7.0 home banner and menu behavior
     */

    var VERSION = '1.7.1';
    var READY_KEY = 'interface_plus_tmdb_only_171';

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
    var generation = 0;

    var initialized = false;
    var focusTimer = null;
    var restoreTimer = null;
    var activeHero = null;
    var activeCard = null;
    var activeCardToken = 0;
    var lastFocusKey = '';
    var screenBackground = null;
    var currentFont = '';
    var currentSize = '';
    var menuObserver = null;

    var TITLE_SELECTOR = '.full-start__title, .full-start-new__title, .full__title, .full-card__title';

    /* Утиліти */

    function log() {
        try {
            console.log.apply(
                console,
                ['[INTERFACE+ ' + VERSION + ']'].concat([].slice.call(arguments))
            );
        } catch (e) {}
    }

    function storageGet(k, f) {
        try {
            return Lampa.Storage.get(k, f);
        } catch (e) {
            return f;
        }
    }

    function enabled(k, f) {
        var v = storageGet(k, f);
        return v === true || v === 'true' || v === 1 || v === '1';
    }

    function text(v) {
        return String(v == null ? '' : v).trim();
    }

    function first() {
        for (var i = 0; i < arguments.length; i++) {
            var v = text(arguments[i]);
            if (v) return v;
        }
        return '';
    }

    function node(v) {
        return v && v.nodeType === 1
            ? v
            : (v && v[0] && v[0].nodeType === 1 ? v[0] : null);
    }

    function renderActivity(o) {
        var r = null;

        try {
            if (o && o.activity && o.activity.render) {
                r = o.activity.render(true);
            }
        } catch (e) {}

        if (!r) {
            try {
                if (o && o.render) r = o.render(true);
            } catch (e) {}
        }

        return node(r);
    }

    function activeActivity() {
        try {
            return Lampa.Activity.active();
        } catch (e) {
            return null;
        }
    }

    function isFull(o) {
        var c = text(o && o.component).toLowerCase();
        return c === 'full' || c === 'full_start' || c === 'fullstart';
    }

    function isMain(o) {
        return text(o && o.component).toLowerCase() === 'main';
    }

    function movieType(d) {
        if (!d) return 'movie';

        return (
            d.media_type === 'tv' ||
            d.type === 'tv' ||
            d.type === 'series' ||
            d.first_air_date ||
            d.number_of_seasons ||
            (d.name && !d.title)
        ) ? 'tv' : 'movie';
    }

    function movieYear(d) {
        var m = first(
            d && d.release_date,
            d && d.first_air_date,
            d && d.year
        ).match(/\b(19|20)\d{2}\b/);

        return m ? m[0] : '';
    }

    function movieTitle(d) {
        return first(
            d && d.title,
            d && d.name,
            d && d.original_title,
            d && d.original_name
        );
    }

    function normalizeTitle(s) {
        return text(s)
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\p{L}\p{N}]+/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function identity(d) {
        if (!d) return '';

        return [
            movieType(d),
            first(d.tmdb_id, d.tmdbId, d.id),
            normalizeTitle(movieTitle(d)),
            movieYear(d)
        ].join('|');
    }

    function getMovie(o) {
        if (!o) return null;

        var list = [
            o.movie,
            o.data && o.data.movie,
            o.data,
            o.card,
            o.card_data,
            o.params && o.params.movie,
            o.params && o.params.data,
            o.activity && o.activity.movie,
            o.activity && o.activity.data
        ];

        var best = null;
        var score = -1;

        list.forEach(function (d) {
            if (!d || typeof d !== 'object') return;

            var s =
                (movieTitle(d) ? 10 : 0) +
                (movieYear(d) ? 4 : 0) +
                (d.tmdb_id || d.tmdbId ? 5 : d.id ? 2 : 0);

            if (s > score && movieTitle(d)) {
                best = d;
                score = s;
            }
        });

        return best;
    }

    var MOVIE_GENRES = {
        28:'Бойовик', 12:'Пригоди', 16:'Анімація',
        35:'Комедія', 80:'Кримінал', 99:'Документальний',
        18:'Драма', 10751:'Сімейний', 14:'Фентезі',
        36:'Історичний', 27:'Жахи', 10402:'Музика',
        9648:'Детектив', 10749:'Мелодрама', 878:'Фантастика',
        10770:'Телефільм', 53:'Трилер', 10752:'Військовий',
        37:'Вестерн'
    };

    var TV_GENRES = {
        10759:'Бойовик і пригоди', 16:'Анімація',
        35:'Комедія', 80:'Кримінал', 99:'Документальний',
        18:'Драма', 10751:'Сімейний', 10762:'Дитячий',
        9648:'Детектив', 10763:'Новини', 10764:'Реаліті-шоу',
        10765:'Фантастика', 10766:'Мильна опера',
        10767:'Ток-шоу', 10768:'Війна і політика',
        37:'Вестерн'
    };

    function movieGenres(d) {
        if (!d) return [];

        var res = [];
        var src = d.genres;

        if (Array.isArray(src) && src.length) {
            src.forEach(function (g) {
                var name = typeof g === 'string'
                    ? g
                    : first(g && g.name, g && g.ua_name, g && g.title);

                if (name && res.indexOf(name) === -1) res.push(name);
            });
        }

        if (!res.length) {
            var ids = d.genre_ids || d.genres_ids || [];
            var dict = movieType(d) === 'tv' ? TV_GENRES : MOVIE_GENRES;

            (Array.isArray(ids) ? ids : []).forEach(function (id) {
                var name = dict[Number(id)];
                if (name && res.indexOf(name) === -1) res.push(name);
            });
        }

        return res.slice(0, 2);
    }

    function heroEnabled() {
        return enabled(S.hero, true);
    }

    function cardEnabled() {
        return enabled(S.card, true);
    }

    function logoScale() {
        var v = parseInt(storageGet(S.scale, '100'), 10);
        return Math.max(70, Math.min(120, isNaN(v) ? 100 : v)) / 100;
    }

    /* Адаптивне масштабування логотипів */

    function adaptiveLogoHeight(img, mode) {
        if (!img || !img.naturalWidth || !img.naturalHeight) return;

        var r = img.naturalWidth / img.naturalHeight;

        var factor =
            r >= 3.5 ? 1.00 :
            r >= 3.0 ? 1.04 :
            r >= 2.5 ? 1.08 :
            r >= 2.0 ? 1.12 :
            r >= 1.5 ? 1.16 :
            r >= 1.1 ? 1.21 : 1.26;

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
        var lang = '';

        try {
            lang = Lampa.Storage.field('tmdb_lang');
        } catch (e) {}

        var order = [lang || 'en', 'en', null];

        for (var i = 0; i < order.length; i++) {
            var found = (logos || []).filter(function (l) {
                return l.iso_639_1 === order[i] && l.file_path;
            })[0];

            if (found) return found;
        }

        return (logos || []).filter(function (l) {
            return l && l.file_path;
        })[0] || null;
    }

    function getLogoHolder(item) {
        var key = identity(item);

        if (!key) return {};

        if (!logoItems[key]) logoItems[key] = {};

        return logoItems[key];
    }

    function cached(item, key, request, cb) {
        if (item[key] !== undefined) {
            cb(item[key]);
            return;
        }

        if (item[key + '_wait']) {
            item[key + '_wait'].push(cb);
            return;
        }

        item[key + '_wait'] = [cb];

        var completed = false;

        var timer = setTimeout(function () {
            finish(null);
        }, LOGO_CACHE_TIMEOUT);

        function finish(val) {
            if (completed) return;

            completed = true;
            clearTimeout(timer);

            item[key] = val || null;

            var list = item[key + '_wait'] || [];
            item[key + '_wait'] = null;

            list.forEach(function (f) {
                try {
                    f(item[key]);
                } catch (e) {}
            });
        }

        try {
            request(finish);
        } catch (e) {
            finish(null);
        }
    }

    function ensureLogo(item, cb) {
        cb = cb || function () {};

        if (!item) {
            cb(null);
            return;
        }

        var type = movieType(item);
        var holder = getLogoHolder(item);

        cached(holder, 'tfeed_logo', function (done) {
            var id = first(item.tmdb_id, item.tmdbId, item.id);

            if (id && typeof id === 'object') id = id.id;

            id = text(id);

            if (!/^\d+$/.test(id)) {
                done(null);
                return;
            }

            var lang = 'en';

            try {
                lang = Lampa.Storage.field('tmdb_lang') || 'en';
            } catch (e) {}

            var tmdb = Lampa.Api && Lampa.Api.sources && Lampa.Api.sources.tmdb;

            if (!tmdb || !tmdb.get) {
                done(null);
                return;
            }

            tmdb.get(
                type + '/' + id + '/images',
                {
                    filter: {
                        include_image_language: lang + ',en,null'
                    }
                },
                function (json) {
                    var logo = json && json.logos && json.logos.length
                        ? pickLogo(json.logos)
                        : null;

                    done(logo ? Lampa.Api.img(logo.file_path, LOGO_SIZE) : null);
                },
                function () {
                    done(null);
                }
            );
        }, cb);
    }

    function clearLogoCache() {
        generation++;
        logoItems = {};

        refreshAll(true);

        try {
            Lampa.Noty.show('Кеш логотипів TMDB очищено');
        } catch (e) {}
    }

    function preload(url, cb) {
        if (!url) {
            cb(false);
            return;
        }

        var img = new Image();

        var done = function (ok) {
            img.onload = null;
            img.onerror = null;
            cb(ok);
        };

        img.onload = function () {
            done(true);
        };

        img.onerror = function () {
            done(false);
        };

        img.src = url;

        if (img.complete && img.naturalWidth) done(true);
    }

    /*
     * ЄДИНИЙ КЕШ BACKDROP
     *
     * Тут зберігається статус завантаження URL.
     * Банер і повноекранна картка використовують один і той самий кеш.
     * URL формується однаково для обох інтерфейсів.
     */

    function rememberBackdrop(url) {
        if (!url) return;

        var idx = backdropCacheOrder.indexOf(url);

        if (idx !== -1) {
            backdropCacheOrder.splice(idx, 1);
        }

        backdropCache[url] = true;
        backdropCacheOrder.push(url);

        while (backdropCacheOrder.length > BACKDROP_CACHE_LIMIT) {
            var old = backdropCacheOrder.shift();
            if (old) delete backdropCache[old];
        }
    }

    function preloadBackdrop(url, cb) {
        cb = cb || function () {};

        if (!url) {
            cb(false);
            return;
        }

        if (backdropCache[url]) {
            cb(true);
            return;
        }

        if (backdropPending[url]) {
            backdropPending[url].push(cb);
            return;
        }

        backdropPending[url] = [cb];

        var img = new Image();

        var finish = function (ok) {
            img.onload = null;
            img.onerror = null;

            if (ok) rememberBackdrop(url);

            var list = backdropPending[url] || [];
            delete backdropPending[url];

            list.forEach(function (fn) {
                try {
                    fn(ok);
                } catch (e) {}
            });
        };

        img.onload = function () {
            finish(true);
        };

        img.onerror = function () {
            finish(false);
        };

        img.src = url;

        if (img.complete && img.naturalWidth) finish(true);
    }

    function imageURL(path, size) {
        if (!path) return '';

        var p = text(path);

        return 'https://image.tmdb.org/t/p/' +
            (size || 'w500') +
            (p.charAt(0) === '/' ? '' : '/') +
            p;
    }

    function prefetchHeroBackdrop(d) {
        if (!d || !d.backdrop_path) return;

        var url = imageURL(d.backdrop_path, BACKDROP_SIZE);

        if (url && !backdropCache[url]) {
            preloadBackdrop(url, function () {});
        }
    }

    function prefetchLogoItem(item) {
        if (item) {
            ensureLogo(item, function (url) {
                if (url) new Image().src = url;
            });
        }
    }

    function prefetchNearbyLogos(card, root) {
        if (!card || !root) return;

        var cards = root.querySelectorAll('.card');
        var idx = Array.prototype.indexOf.call(cards, card);

        if (idx < 0) return;

        var end = Math.min(
            cards.length,
            idx + 1 + LOGO_PREFETCH_AHEAD
        );

        for (var i = idx; i < end; i++) {
            if (cards[i] && cards[i].card_data) {
                prefetchLogoItem(cards[i].card_data);
            }
        }
    }

    /* Фоновий шар головного екрана */

    function ensureBackgroundLayers(layer) {
        if (!layer || layer.querySelector('.banner-screen-bg__image--a')) return;

        layer.innerHTML =
            '<div class="banner-screen-bg__image banner-screen-bg__image--a"></div>' +
            '<div class="banner-screen-bg__image banner-screen-bg__image--b"></div>' +
            '<div class="banner-screen-bg__vignette"></div>';
    }

    function ensureScreenBackground() {
        if (screenBackground && screenBackground.isConnected) {
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
            screenBackground.querySelectorAll('.banner-screen-bg__image'),
            function (bg) {
                bg.classList.remove('show');
                bg.style.backgroundImage = 'none';
            }
        );

        if (activeHero) activeHero.activeBgIndex = 0;
    }

    function hideHeroBackground() {
        if (!screenBackground) {
            screenBackground = document.getElementById(
                'interface-plus-screen-background'
            );
        }

        if (screenBackground) {
            screenBackground.style.display = 'none';
            clearHeroBackgrounds();
        }
    }

    function showHeroBackground() {
        var layer = ensureScreenBackground();

        if (layer) layer.style.display = 'block';
    }

    /* CSS */

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
        '.interface-plus-logo-title{position:relative;}',
        '.interface-plus-card-logo{display:block;width:auto;height:auto;max-width:100%;object-fit:contain;object-position:left center;opacity:0;transition:opacity .15s ease;filter:drop-shadow(0 3px 10px rgba(0,0,0,.45));}',
        '.interface-plus-card-logo.ready{opacity:1;}',
        '.interface-plus-logo-title.interface-plus-logo-active{font-size:0!important;line-height:0!important;}',
        '.interface-plus-logo-title.interface-plus-logo-active>.interface-plus-original-title{display:none!important;}',
        '.interface-plus-logo-title.interface-plus-logo-active>.interface-plus-card-logo{font-size:initial;line-height:normal;}',

        /* MENU CINEMATIC SHIFT */
        'body.menu--open #interface-plus-screen-background{width:100%;transform:translateX(' + MENU_SHIFT + ');}',
        'body.menu--open .banner-host .banner-hero{transform:translateX(' + MENU_SHIFT + ');}',

        /*
         * FULL CARD BACKGROUND
         * Фон картки є окремим шаром, але використовує той самий URL
         * і той самий backdropCache, що й домашній банер.
         */

        '.interface-plus-full-card-bg{position:fixed;inset:0;width:100vw;height:100vh;overflow:hidden;pointer-events:none;z-index:0;background:#000;opacity:1;isolation:isolate;}',
        '.interface-plus-full-card-bg__image{position:absolute;inset:0;width:100%;height:100%;background-size:cover;background-position:center 42%;background-repeat:no-repeat;opacity:0;transition:opacity .35s ease;will-change:opacity;}',
        '.interface-plus-full-card-bg__image.show{opacity:1;}',
        '.interface-plus-full-card-bg__shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.48),rgba(0,0,0,.16) 55%,rgba(0,0,0,.04)),linear-gradient(0deg,#000 0%,rgba(0,0,0,.90) 9%,rgba(0,0,0,.60) 23%,rgba(0,0,0,.12) 58%,rgba(0,0,0,.20) 100%);z-index:2;}',
        '.interface-plus-full-card-bg__shade:after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,transparent 30%,rgba(0,0,0,.18) 100%);}',
        '.interface-plus-full-card-root{position:relative!important;isolation:isolate;}',
        '.interface-plus-full-card-root>*{position:relative;}',
        '.interface-plus-full-card-root .interface-plus-full-card-bg{position:fixed!important;z-index:-1!important;}',
        '.interface-plus-full-card-root .full-start__background{opacity:0!important;visibility:hidden!important;}',
        '.interface-plus-full-card-root .full-start-new__left{opacity:0!important;visibility:hidden!important;}',
        '.interface-plus-full-card-root .full-start-new__right{position:relative;z-index:3;}',
        '.interface-plus-full-card-root .full-start-new__body{position:relative;z-index:2;}',
        '.interface-plus-full-card-root .full-start-new__title,.interface-plus-full-card-root .full-start__title{filter:drop-shadow(0 3px 12px rgba(0,0,0,.75));}',
        '.interface-plus-full-card-root .full-start-new__buttons,.interface-plus-full-card-root .full-start__buttons{position:relative;z-index:4;}',
        '.interface-plus-full-card-root .full-start-new__details,.interface-plus-full-card-root .full-start__details{position:relative;z-index:3;}',
        '.interface-plus-full-card-root .full-start-new__description,.interface-plus-full-card-root .full-start__description{position:relative;z-index:3;}',

        '@media(max-width:480px){.banner-hero__info{left:1.5em;width:75%;}.banner-screen-bg__image{background-position:center 60%;}}',
        '@media(max-width:480px){body.menu--open #interface-plus-screen-background{width:100%;transform:translateX(' + MENU_SHIFT_MOBILE + ');}body.menu--open .banner-host .banner-hero{transform:translateX(' + MENU_SHIFT_MOBILE + ');}}',
        '@media(max-width:700px){.interface-plus-full-card-bg__image{background-position:center center;}.interface-plus-full-card-bg__shade{background:linear-gradient(0deg,#000 0%,rgba(0,0,0,.88) 13%,rgba(0,0,0,.48) 38%,rgba(0,0,0,.16) 72%,rgba(0,0,0,.24) 100%);}}'
    ].join('\n');

    function installStyle() {
        var el = document.getElementById('interface-plus-tmdb-only-style') ||
            document.createElement('style');

        el.id = 'interface-plus-tmdb-only-style';
        el.textContent = CSS;

        if (!el.parentNode) {
            document.head.appendChild(el);
        }
    }

    /* Герой — банер */

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
            bgA: layer.querySelector('.banner-screen-bg__image--a'),
            bgB: layer.querySelector('.banner-screen-bg__image--b'),
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

    function applyBackdrop(hero, url, token) {
        if (!hero || hero.token !== token) return;

        var p = hero.parts;
        var cur = hero.activeBgIndex || 0;
        var next = cur === 0 ? 1 : 0;

        var curLayer = cur === 0 ? p.bgA : p.bgB;
        var nextLayer = next === 0 ? p.bgA : p.bgB;

        if (!nextLayer) return;

        nextLayer.classList.remove('show');
        nextLayer.style.backgroundImage = 'url("' + url + '")';

        void nextLayer.offsetWidth;

        nextLayer.classList.add('show');

        if (curLayer && curLayer !== nextLayer) {
            curLayer.classList.remove('show');
        }

        hero.activeBgIndex = next;
    }

    function buildHeroMeta(container, d) {
        container.textContent = '';

        var rating = Number(d.vote_average) || 0;

        if (rating > 0) {
            var rate = document.createElement('span');

            rate.className = 'banner-hero__meta-item banner-hero__rate';
            rate.innerHTML =
                '<span class="banner-hero__rate-star">★</span>' +
                '<span>' + rating.toFixed(1) + '</span>';

            container.appendChild(rate);
        }

        var year = movieYear(d);

        if (year) {
            if (container.children.length) {
                container.appendChild(
                    Object.assign(document.createElement('span'), {
                        className: 'banner-hero__separator',
                        textContent: '·'
                    })
                );
            }

            container.appendChild(
                Object.assign(document.createElement('span'), {
                    className: 'banner-hero__meta-item banner-hero__year',
                    textContent: year
                })
            );
        }

        var genres = movieGenres(d);

        if (genres.length) {
            if (container.children.length) {
                container.appendChild(
                    Object.assign(document.createElement('span'), {
                        className: 'banner-hero__separator',
                        textContent: '·'
                    })
                );
            }

            container.appendChild(
                Object.assign(document.createElement('span'), {
                    className: 'banner-hero__meta-item banner-hero__genre',
                    textContent: genres.join(' / ')
                })
            );
        }
    }

    function showHero(hero, d, force) {
        if (!hero || !d) return;

        var key = identity(d);

        if (!force && hero.movieKey === key) return;

        hero.movieKey = key;
        hero.lastMovieData = d;
        hero.token++;

        var token = hero.token;
        var p = hero.parts;

        showHeroBackground();

        p.logo.classList.remove('ready');
        p.logo.style.display = 'none';
        p.logo.removeAttribute('src');

        p.title.style.display = '';
        p.title.textContent = movieTitle(d);

        p.logo.style.transform = 'scale(' + logoScale() + ')';
        p.logo.style.transformOrigin = 'left center';

        buildHeroMeta(p.meta, d);

        p.descr.textContent = d.overview || '';

        if (d.backdrop_path) {
            switchHeroBackdrop(
                hero,
                imageURL(d.backdrop_path, BACKDROP_SIZE),
                token
            );
        } else {
            if (p.bgA) {
                p.bgA.classList.remove('show');
                p.bgA.style.backgroundImage = 'none';
            }

            if (p.bgB) {
                p.bgB.classList.remove('show');
                p.bgB.style.backgroundImage = 'none';
            }

            hero.activeBgIndex = 0;
        }

        ensureLogo(d, function (url) {
            if (hero.token !== token || !url) return;

            preload(url, function (ok) {
                if (!ok || hero.token !== token) return;

                setAdaptiveLogo(p.logo, url, 'hero');

                p.logo.style.transform = 'scale(' + logoScale() + ')';
                p.logo.style.transformOrigin = 'left center';
                p.logo.style.display = 'block';

                requestAnimationFrame(function () {
                    if (hero.token === token) {
                        p.logo.classList.add('ready');
                        p.title.style.display = 'none';
                    }
                });
            });
        });
    }

    function attachHero(o) {
        if (!heroEnabled() || !o) return;

        if (!isMain(o)) {
            hideHeroBackground();
            return;
        }

        var root = renderActivity(o);

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
            var f = root.querySelector(selectors[i]);

            if (f && f.card_data) return f;
        }

        var active = document.activeElement;

        if (active && root.contains(active) && active.closest) {
            var f2 = active.closest('.card');

            if (f2 && f2.card_data) return f2;
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

            showHero(activeHero, focusedCard.card_data, true);

            prefetchNearbyLogos(focusedCard, root);

            return;
        }

        if (activeHero.lastMovieData) {
            lastFocusKey = identity(activeHero.lastMovieData);

            showHero(activeHero, activeHero.lastMovieData, true);

            return;
        }

        var firstCard = root.querySelector('.card');

        if (firstCard && firstCard.card_data) {
            lastFocusKey = identity(firstCard.card_data);

            showHero(activeHero, firstCard.card_data, true);
        }
    }

    function scheduleHeroRestore() {
        clearTimeout(restoreTimer);

        restoreTimer = setTimeout(function () {
            requestAnimationFrame(restoreHeroAfterFull);
        }, 100);
    }

    function onFocus(e) {
        if (!heroEnabled()) return;

        var target = e.target;

        if (!target || !target.closest) return;

        var item = target.closest('.card');

        if (!item || !item.card_data) return;

        var root = item.closest('.activity');

        if (!root || !root.__interfacePlusHero) return;

        var d = item.card_data;
        var key = identity(d);

        if (lastFocusKey === key) return;

        prefetchHeroBackdrop(d);
        prefetchNearbyLogos(item, root);

        clearTimeout(focusTimer);

        focusTimer = setTimeout(function () {
            if (!heroEnabled()) return;

            lastFocusKey = key;
            activeHero = root.__interfacePlusHero;

            showHero(activeHero, d);
        }, 50);
    }

    function applyHero() {
        var on = heroEnabled();

        document.body.classList.toggle('banner-enabled', on);

        if (!on) {
            clearTimeout(focusTimer);
            clearTimeout(restoreTimer);

            lastFocusKey = '';

            hideHeroBackground();

            return;
        }

        attachHero(activeActivity());
    }

    /* Відновлення стандартного заголовка */

    function restoreTitle(root) {
        if (!root) return;

        var titles = root.classList &&
            root.classList.contains('interface-plus-logo-title')
            ? [root] : [];

        if (root.querySelectorAll) {
            [].push.apply(
                titles,
                root.querySelectorAll('.interface-plus-logo-title')
            );
        }

        titles.forEach(function (t) {
            var logo = t.querySelector('.interface-plus-card-logo');

            if (logo) logo.remove();

            var original = t.querySelector('.interface-plus-original-title');

            if (original) {
                while (original.firstChild) {
                    t.insertBefore(original.firstChild, original);
                }

                original.remove();
            }

            t.classList.remove(
                'interface-plus-logo-title',
                'interface-plus-logo-active'
            );
        });
    }

    function findTitle(root) {
        return root && root.querySelector
            ? root.querySelector(TITLE_SELECTOR)
            : null;
    }

    function prepareLogo(title) {
        if (!title) return null;

        var logo = title.querySelector('.interface-plus-card-logo');

        if (logo) return logo;

        title.classList.add('interface-plus-logo-title');

        var original = document.createElement('span');

        original.className = 'interface-plus-original-title';

        while (title.firstChild) {
            original.appendChild(title.firstChild);
        }

        title.appendChild(original);

        logo = document.createElement('img');

        logo.className = 'interface-plus-card-logo';
        logo.alt = '';
        logo.draggable = false;

        title.appendChild(logo);

        return logo;
    }

    /* ПОВНОЕКРАННИЙ ФОН КАРТКИ */

    function ensureCardBackground(root) {
        if (!root) return null;

        var layer = root.querySelector(
            ':scope > .interface-plus-full-card-bg'
        );

        if (layer) return layer;

        layer = document.createElement('div');
        layer.className = 'interface-plus-full-card-bg';

        layer.innerHTML =
            '<div class="interface-plus-full-card-bg__image interface-plus-full-card-bg__image--a"></div>' +
            '<div class="interface-plus-full-card-bg__image interface-plus-full-card-bg__image--b"></div>' +
            '<div class="interface-plus-full-card-bg__shade"></div>';

        root.insertBefore(layer, root.firstChild);
        root.classList.add('interface-plus-full-card-root');

        layer.__activeIndex = 0;
        layer.__currentURL = '';

        return layer;
    }

    function applyCardBackdrop(layer, url, token) {
        if (!layer || !url) return;

        if (
            !activeCard ||
            activeCard.token !== token ||
            activeCard.bgLayer !== layer
        ) return;

        if (layer.__currentURL === url) return;

        var cur = layer.__activeIndex || 0;
        var next = cur === 0 ? 1 : 0;

        var curLayer = layer.querySelector(
            next === 0
                ? '.interface-plus-full-card-bg__image--b'
                : '.interface-plus-full-card-bg__image--a'
        );

        var nextLayer = layer.querySelector(
            next === 0
                ? '.interface-plus-full-card-bg__image--a'
                : '.interface-plus-full-card-bg__image--b'
        );

        if (!nextLayer) return;

        nextLayer.classList.remove('show');
        nextLayer.style.backgroundImage = 'url("' + url + '")';

        void nextLayer.offsetWidth;

        nextLayer.classList.add('show');

        if (curLayer) {
            curLayer.classList.remove('show');
        }

        layer.__activeIndex = next;
        layer.__currentURL = url;
    }

    function setCardBackdrop(root, d, token) {
        if (!root || !d || !cardEnabled()) return;

        var layer = ensureCardBackground(root);

        if (!layer) return;

        if (activeCard) activeCard.bgLayer = layer;

        if (!d.backdrop_path) {
            /*
             * Не очищаємо попередній фон миттєво.
             * Якщо нова картка не має backdrop_path,
             * попередній шар не блимає чорним під час переходу.
             */
            return;
        }

        var url = imageURL(d.backdrop_path, BACKDROP_SIZE);

        if (!url) return;

        /*
         * НАЙВАЖЛИВІШИЙ МОМЕНТ:
         * Якщо банер уже завантажив цей backdrop,
         * він присутній у backdropCache.
         * Тоді відображаємо той самий ресурс негайно.
         */

        if (backdropCache[url]) {
            applyCardBackdrop(layer, url, token);
            return;
        }

        /*
         * Якщо зображення ще завантажується банером,
         * preloadBackdrop під'єднає callback до наявного запиту,
         * а не створюватиме другий запит.
         */

        preloadBackdrop(url, function (ok) {
            if (!ok) return;

            if (
                !activeCard ||
                activeCard.token !== token ||
                activeCard.root !== root
            ) return;

            applyCardBackdrop(layer, url, token);
        });
    }

    function removeCardBackground(root) {
        if (!root) return;

        var layer = root.querySelector(
            '.interface-plus-full-card-bg'
        );

        if (layer) layer.remove();

        root.classList.remove('interface-plus-full-card-root');
    }

    /* Логотип і фон картки */

    function stopCard(restore) {
        activeCardToken++;

        if (activeCard && activeCard.observer) {
            activeCard.observer.disconnect();
        }

        if (restore && activeCard && activeCard.root) {
            restoreTitle(activeCard.root);
            removeCardBackground(activeCard.root);
        }

        activeCard = null;
    }

    function cardCurrent(token, key) {
        return !!(
            activeCard &&
            activeCardToken === token &&
            activeCard.key === key &&
            activeCard.root &&
            activeCard.root.isConnected &&
            cardEnabled()
        );
    }

    function showCardLogoInstant(root, d) {
        var holder = getLogoHolder(d);
        var hit = holder.tfeed_logo;
        var title = hit && findTitle(root);

        if (!title) return false;

        var logo = prepareLogo(title);

        if (!logo) return false;

        logo.style.transform = 'scale(' + logoScale() + ')';
        logo.style.transformOrigin = 'left center';

        setAdaptiveLogo(logo, hit, 'card');

        logo.classList.add('ready');
        title.classList.add('interface-plus-logo-active');

        return true;
    }

    function startCard(o, override, force) {
        if (!cardEnabled() || !isFull(o)) return;

        var d = override || getMovie(o);
        var root = renderActivity(o);

        if (!d || !root) return;

        var key = identity(d);

        if (
            !force &&
            activeCard &&
            activeCard.key === key &&
            activeCard.root === root
        ) return;

        stopCard(false);

        var token = activeCardToken;

        activeCard = {
            root: root,
            key: key,
            data: d,
            src: '',
            observer: null,
            bgLayer: null,
            token: token
        };

        /*
         * Спочатку створюємо фон і використовуємо кеш.
         * Це відбувається незалежно від завантаження логотипа.
         */
        setCardBackdrop(root, d, token);

        /*
         * Логотип із кешу з'являється без очікування TMDB.
         */
        if (showCardLogoInstant(root, d)) {
            return;
        }

        /*
         * Якщо Lampa домальовує заголовок пізніше,
         * MutationObserver вставить логотип після його появи.
         */
        if (window.MutationObserver) {
            var observer = new MutationObserver(function () {
                if (!cardCurrent(token, key)) return;

                var title = findTitle(root);

                if (
                    title &&
                    activeCard.src &&
                    !title.querySelector('.interface-plus-card-logo')
                ) {
                    var logo = prepareLogo(title);

                    if (logo) {
                        logo.style.transform = 'scale(' + logoScale() + ')';
                        logo.style.transformOrigin = 'left center';

                        setAdaptiveLogo(logo, activeCard.src, 'card');

                        logo.classList.add('ready');
                        title.classList.add('interface-plus-logo-active');
                    }
                }
            });

            observer.observe(root, {
                childList: true,
                subtree: true
            });

            activeCard.observer = observer;
        }

        /*
         * Лише якщо логотипу немає в кеші,
         * запитуємо його у TMDB.
         */
        ensureLogo(d, function (url) {
            if (!cardCurrent(token, key)) return;

            activeCard.src = url || '';

            if (!url) return;

            var title = findTitle(root);

            if (!title) return;

            var logo = prepareLogo(title);

            if (!logo) return;

            logo.style.transform = 'scale(' + logoScale() + ')';
            logo.style.transformOrigin = 'left center';

            setAdaptiveLogo(logo, url, 'card');

            logo.classList.add('ready');
            title.classList.add('interface-plus-logo-active');
        });
    }

    function refreshCard(force) {
        if (!cardEnabled()) {
            stopCard(true);
            return;
        }

        var a = activeActivity();

        if (isFull(a)) {
            startCard(a, null, !!force);
        }
    }

    function refreshAll(force) {
        lastFocusKey = '';

        if (activeHero) activeHero.movieKey = '';

        var a = activeActivity();

        if (isFull(a)) {
            stopCard(true);
            startCard(a, null, !!force);
        }
    }

    /* Шрифти та розміри */

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

        var oldFace = document.getElementById('interface-plus-font-face');

        if (oldFace) oldFace.remove();

        var oldStyle = document.getElementById('interface-plus-font-style');

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
        style.textContent = 'body,.body,*{font-family:' +
            font.family +
            '!important}';

        document.head.appendChild(style);
    }

    function patchMaker(count) {
        if (!Lampa.Maker || !Lampa.Maker.map) return;

        ['Line', 'Category'].forEach(function (type) {
            var maker = Lampa.Maker.map(type);

            if (!maker || !maker.Items || !maker.Items.onInit) return;

            if (maker.Items.__interfacePlusPatched) {
                maker.Items.__interfacePlusCount = count;
                return;
            }

            var original = maker.Items.onInit;

            maker.Items.onInit = function () {
                original.apply(this, arguments);

                if (type === 'Line') {
                    this.view = maker.Items.__interfacePlusCount || count;
                } else {
                    this.limit_view = maker.Items.__interfacePlusCount || count;
                }
            };

            maker.Items.__interfacePlusPatched = true;
            maker.Items.__interfacePlusCount = count;
        });
    }

    function applySize() {
        var value = parseFloat(storageGet(S.size, '10.6')) || 10.6;

        var mobile = false;

        try {
            mobile = !!(
                Lampa.Platform &&
                Lampa.Platform.screen &&
                Lampa.Platform.screen('mobile')
            );
        } catch (e) {}

        if (mobile) value = 10.1;

        if (String(value) === currentSize) return;

        currentSize = String(value);

        document.body.style.fontSize = value + 'px';

        patchMaker(
            value <= 9.6 ? 8 :
            value <= 11.1 ? 7 : 6
        );
    }

    /* Налаштування */

    function addSettings() {
        if (!Lampa.SettingsApi) return;

        var api = Lampa.SettingsApi;

        api.addComponent({
            component: 'interface_plus_settings',
            name: 'Інтерфейс +',
            icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 5h2v5h-2z"/></svg>'
        });

        function add(key, type, def, name, desc, values, change) {
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
                    description: desc || ''
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
                refreshCard(true);
            }
        );

        add(
            S.scale,
            'select',
            '100',
            'Розмір логотипів',
            'Додатковий масштаб після автоматичного підбору',
            {
                '70':'70%',
                '80':'80%',
                '90':'90%',
                '100':'100%',
                '110':'110%',
                '120':'120%'
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
                '09.1':'Міні',
                '09.6':'Дуже малий',
                '10.1':'Малий',
                '10.6':'Середній'
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
                default:'Roboto',
                netflix:'Netflix Sans',
                montserrat:'Montserrat',
                inter:'Inter',
                nunito:'Nunito'
            },
            applyFont
        );
    }

    /* Відстеження стану лівого меню */

    function installMenuObserver() {
        if (!window.MutationObserver || menuObserver) return;

        menuObserver = new MutationObserver(function () {
            var opened = document.body.classList.contains('menu--open');

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

    /* Слухачі подій */

    function installListeners() {
        document.addEventListener('hover:focus', onFocus, true);

        if (!Lampa.Listener) return;

        Lampa.Listener.follow('activity', function (e) {
            if (!e) return;

            if (e.type === 'start') {
                requestAnimationFrame(function () {
                    if (isFull(e.object)) {
                        clearTimeout(restoreTimer);
                        clearTimeout(focusTimer);

                        lastFocusKey = '';

                        hideHeroBackground();

                        stopCard(false);
                        startCard(e.object);
                    } else if (isMain(e.object)) {
                        attachHero(e.object);
                        stopCard(false);
                    } else {
                        clearTimeout(focusTimer);

                        hideHeroBackground();

                        stopCard(false);
                    }
                });
            }

            if (e.type === 'destroy' && isFull(e.object)) {
                stopCard(false);
                scheduleHeroRestore();
            }

            if (e.type === 'destroy') {
                var comp = text(
                    e.object && e.object.component
                ).toLowerCase();

                if (comp === 'main' || comp === 'category') {
                    hideHeroBackground();
                }
            }
        });

        Lampa.Listener.follow('full', function (e) {
            if (
                !e ||
                (e.type !== 'complete' && e.type !== 'complite')
            ) return;

            var d = e.data && e.data.movie;

            requestAnimationFrame(function () {
                hideHeroBackground();

                var a = activeActivity();

                if (isFull(a)) {
                    startCard(a, d || null, true);
                }
            });
        });

        try {
            if (
                Lampa.Storage.listener &&
                Lampa.Storage.listener.follow
            ) {
                Lampa.Storage.listener.follow('change', function (e) {
                    if (!e || !e.name) return;

                    if (e.name === S.hero) applyHero();

                    if (e.name === S.card) refreshCard(true);

                    if (e.name === S.font) {
                        currentFont = '';
                        applyFont();
                    }

                    if (e.name === S.size) {
                        currentSize = '';
                        applySize();
                    }

                    if (e.name === S.scale) refreshAll(false);
                });
            }
        } catch (e) {}
    }

    /* Ініціалізація */

    function init() {
        if (initialized || !window.Lampa || !Lampa.Storage) return;

        initialized = true;

        installStyle();

        ensureScreenBackground();

        installMenuObserver();

        applyFont();
        applySize();
        applyHero();

        addSettings();

        installListeners();

        requestAnimationFrame(function () {
            var a = activeActivity();

            if (isFull(a)) {
                hideHeroBackground();
                startCard(a);
            } else if (isMain(a)) {
                attachHero(a);
            } else {
                hideHeroBackground();
            }
        });

        log('Instant cinematic full card initialized');
    }

    if (window.appready) {
        setTimeout(init, 150);
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                setTimeout(init, 150);
            }
        });
    }

})();
