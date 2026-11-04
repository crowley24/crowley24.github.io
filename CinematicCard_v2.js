(function () {
    'use strict';

    /*
     * INTERFACE+ & NEWCARD (COMBINED EDITION)
     * TMDB ONLY — OPTIMIZED & CACHED
     */

    var VERSION = '2.0.0';
    var READY_KEY = 'interface_plus_newcard_combined_200';

    if (window[READY_KEY]) return;
    window[READY_KEY] = true;

    var P = 'interface_plus_';

    var S = {
        hero: 'banner_hero_enabled',
        size: 'interface_size',
        font: 'fontchanger_selected',
        card: P + 'card_logo',
        scale: P + 'logo_scale',
        casMetaSize: 'cas_meta_size',
        casBlocksGap: 'cas_blocks_gap',
        casBgAnim: 'cas_bg_animation',
        casAnimStyle: 'cas_animation_style',
        casSlideshow: 'cas_slideshow_enabled',
        casStudios: 'cas_show_studios',
        casTagline: 'cas_show_tagline'
    };

    /* =========================
       SHARED STORAGE & CACHE
    ========================= */

    var LOGO_SIZE = 'w500';
    var BACKDROP_SIZE = 'w1280';
    var LOGO_CACHE_TIMEOUT = 20000;

    var logoItems = {};
    var backdropCache = {};
    var backdropCacheOrder = [];
    var backdropPending = {};
    var BACKDROP_CACHE_LIMIT = 12;

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

    var cardRequestId = 0;
    var logoRequestId = 0;
    var logoRequests = {};
    var detailsRequests = {};
    var debounceTimer = null;
    var slideshowGeneration = 0;
    var currentInterval = null;

    var TITLE_SELECTOR = [
        '.full-start__title',
        '.full-start-new__title',
        '.full__title',
        '.full-card__title'
    ].join(',');

    /* =========================
       UTILITIES
    ========================= */

    function log() {
        try {
            console.log.apply(
                console,
                ['[INTERFACE+ & NEWCARD ' + VERSION + ']'].concat(
                    Array.prototype.slice.call(arguments)
                )
            );
        } catch (e) {}
    }

    function storageGet(key, fallback) {
        try {
            var val = Lampa.Storage.get(key);
            return val !== undefined ? val : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            Lampa.Storage.set(key, value);
        } catch (e) {}
    }

    function enabled(key, fallback) {
        var v = storageGet(key, fallback);
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
        if (v && v.nodeType === 1) return v;
        if (v && v[0] && v[0].nodeType === 1) return v[0];
        return null;
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
                if (o && o.render) {
                    r = o.render(true);
                }
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
        var c = text(o && o.component).toLowerCase();
        return c === 'main' || c === 'category';
    }

    function movieType(d) {
        if (!d) return 'movie';
        if (
            d.media_type === 'tv' ||
            d.type === 'tv' ||
            d.type === 'series' ||
            d.first_air_date ||
            d.number_of_seasons ||
            (d.name && !d.title)
        ) {
            return 'tv';
        }
        return 'movie';
    }

    function movieYear(d) {
        var date = first(d && d.release_date, d && d.first_air_date, d && d.year);
        var match = date.match(/\b(19|20)\d{2}\b/);
        return match ? match[0] : '';
    }

    function movieTitle(d) {
        return first(d && d.title, d && d.name, d && d.original_title, d && d.original_name);
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
        var candidates = [
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

        candidates.forEach(function (d) {
            if (!d || typeof d !== 'object') return;
            var s = 0;
            if (movieTitle(d)) s += 10;
            if (movieYear(d)) s += 4;
            if (d.tmdb_id || d.tmdbId) s += 5;
            if (d.id) s += 2;
            if (d.backdrop_path) s += 2;
            if (d.overview) s += 1;

            if (s > score && movieTitle(d)) {
                best = d;
                score = s;
            }
        });
        return best;
    }

    /* =========================
       GENRES & METADATA HELPERS
    ========================= */

    var MOVIE_GENRES = {
        28: 'Бойовик', 12: 'Пригоди', 16: 'Анімація', 35: 'Комедія', 80: 'Кримінал',
        99: 'Документальний', 18: 'Драма', 10751: 'Сімейний', 14: 'Фентезі', 36: 'Історичний',
        27: 'Жахи', 10402: 'Музика', 9648: 'Детектив', 10749: 'Мелодрама', 878: 'Фантастика',
        10770: 'Телефільм', 53: 'Трилер', 10752: 'Військовий', 37: 'Вестерн'
    };

    var TV_GENRES = {
        10759: 'Бойовик і пригоди', 16: 'Анімація', 35: 'Комедія', 80: 'Кримінал',
        99: 'Документальний', 18: 'Драма', 10751: 'Сімейний', 10762: 'Дитячий',
        9648: 'Детектив', 10763: 'Новини', 10764: 'Реаліті-шоу', 10765: 'Фантастика',
        10766: 'Мильна опера', 10767: 'Ток-шоу', 10768: 'Війна і політика', 37: 'Вестерн'
    };

    function movieGenres(d) {
        if (!d) return [];
        var result = [];
        var source = d.genres;

        if (Array.isArray(source) && source.length) {
            source.forEach(function (genre) {
                var name = typeof genre === 'string' ? genre : first(genre.name, genre.ua_name, genre.title);
                if (name && result.indexOf(name) === -1) result.push(name);
            });
        }

        if (!result.length) {
            var ids = d.genre_ids || d.genres_ids || [];
            if (!Array.isArray(ids)) ids = [];
            var dictionary = movieType(d) === 'tv' ? TV_GENRES : MOVIE_GENRES;
            ids.forEach(function (id) {
                var name = dictionary[Number(id)];
                if (name && result.indexOf(name) === -1) result.push(name);
            });
        }
        return result.slice(0, 2);
    }

    function getPreferredLogoLanguage() {
        var lang = '';
        try {
            if (Lampa.Storage.field) lang = Lampa.Storage.field('tmdb_lang') || '';
        } catch (e) {}
        if (!lang) lang = Lampa.Storage.get('tmdb_lang') || 'en';
        return String(lang).toLowerCase();
    }

    function pickLogo(logos) {
        if (!Array.isArray(logos) || !logos.length) return null;
        var preferred = getPreferredLogoLanguage();
        var languages = [preferred, 'en', null];

        for (var i = 0; i < languages.length; i++) {
            var lang = languages[i];
            var found = logos.find(function (logo) {
                if (!logo || !logo.file_path) return false;
                if (lang === null) {
                    return !logo.iso_639_1 || logo.iso_639_1 === 'xx' || logo.iso_639_1 === 'null';
                }
                return String(logo.iso_639_1 || '').toLowerCase() === lang;
            });
            if (found) return found;
        }
        return logos.find(function (logo) { return logo && logo.file_path; }) || null;
    }

    /* =========================
       LOGO ENGINE & CACHE
    ========================= */

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
        var timer = setTimeout(function () { finish(null); }, LOGO_CACHE_TIMEOUT);

        function finish(value) {
            if (completed) return;
            completed = true;
            clearTimeout(timer);
            item[key] = value || null;
            var list = item[key + '_wait'] || [];
            item[key + '_wait'] = null;
            list.forEach(function (f) {
                try { f(item[key]); } catch (e) {}
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

            var lang = getPreferredLogoLanguage() || 'en';
            var langs = lang + ',en,null';
            var tmdb = Lampa.Api.sources.tmdb;

            if (!tmdb || !tmdb.get) {
                done(null);
                return;
            }

            tmdb.get(
                type + '/' + id + '/images',
                { filter: { include_image_language: langs } },
                function (json) {
                    var logo = json && json.logos && json.logos.length ? pickLogo(json.logos) : null;
                    done(logo ? Lampa.Api.img(logo.file_path, LOGO_SIZE) : null);
                },
                function () { done(null); }
            );
        }, cb);
    }

    function clearLogoCache() {
        generation++;
        logoItems = {};
        try { Lampa.Storage.set('cas_logo_cache', {}); } catch (e) {}
        try { Lampa.Storage.set('cas_images_cache', {}); } catch (e) {}
        refreshAll(true);
        try { Lampa.Noty.show('Кеш логотипів та фонів очищено'); } catch (e) {}
    }

    /* =========================
       IMAGE PRELOAD & BACKDROP
    ========================= */

    function preload(url, callback) {
        if (!url) {
            callback(false);
            return;
        }
        var img = new Image();
        var completed = false;

        function done(ok) {
            if (completed) return;
            completed = true;
            img.onload = null;
            img.onerror = null;
            callback(ok);
        }

        img.onload = function () { done(true); };
        img.onerror = function () { done(false); };
        img.src = url;
        if (img.complete && img.naturalWidth) done(true);
    }

    function rememberBackdrop(url) {
        if (!url) return;
        var oldIndex = backdropCacheOrder.indexOf(url);
        if (oldIndex !== -1) backdropCacheOrder.splice(oldIndex, 1);
        backdropCache[url] = true;
        backdropCacheOrder.push(url);
        while (backdropCacheOrder.length > BACKDROP_CACHE_LIMIT) {
            var old = backdropCacheOrder.shift();
            if (old) delete backdropCache[old];
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
            if (ok) rememberBackdrop(url);
            var callbacks = backdropPending[url] || [];
            delete backdropPending[url];
            callbacks.forEach(function (fn) {
                try { fn(ok); } catch (e) {}
            });
        }

        img.onload = function () { finish(true); };
        img.onerror = function () { finish(false); };
        img.src = url;
        if (img.complete && img.naturalWidth) finish(true);
    }

    function imageURL(path, size) {
        if (!path) return '';
        var p = text(path);
        return 'https://image.tmdb.org/t/p/' + (size || 'w500') + (p.charAt(0) === '/' ? '' : '/') + p;
    }

    /* =========================
       CSS STYLES (COMBINED)
    ========================= */

    var CSS = [
        '#interface-plus-screen-background{position:fixed;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;z-index:0;display:none;background:#000;}',
        '.banner-screen-bg__image{position:absolute;inset:0;width:100%;height:100%;background-position:center 65%;background-repeat:no-repeat;background-size:cover;opacity:0;transition:opacity .18s ease;will-change:opacity;}',
        '.banner-screen-bg__image.show{opacity:1;}',
        '.banner-screen-bg__vignette{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;background:linear-gradient(to right,rgba(0,0,0,.48) 0%,rgba(0,0,0,.36) 12%,rgba(0,0,0,.23) 24%,rgba(0,0,0,.10) 38%,rgba(0,0,0,0) 56%),linear-gradient(to bottom,rgba(0,0,0,.30) 0vh,rgba(0,0,0,.20) 8vh,rgba(0,0,0,.09) 17vh,rgba(0,0,0,0) 30vh),linear-gradient(to bottom,rgba(0,0,0,0) 0vh,rgba(0,0,0,0) 35vh,rgba(0,0,0,.04) 40vh,rgba(0,0,0,.12) 45vh,rgba(0,0,0,.30) 50vh,rgba(0,0,0,.60) 55vh,rgba(0,0,0,.88) 59vh,#000 63vh,#000 100%);}',
        '.banner-host{position:relative;z-index:1;}',
        '.banner-enabled .banner-host .activity__body{padding-top:42vh!important;box-sizing:border-box;}',
        '.banner-hero{position:absolute;top:0;left:0;right:0;height:50vh;overflow:visible;pointer-events:none;z-index:2;}',
        '.banner-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:2;}',
        '.banner-hero__logo{display:none;width:auto;height:auto;max-width:100%;margin-bottom:1em;object-fit:contain;object-position:left center;opacity:0;transition:opacity .15s ease;filter:drop-shadow(0 4px 12px rgba(0,0,0,.6));}',
        '.banner-hero__logo.ready{opacity:1;}',
        '.banner-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:#f5f5f1;margin-bottom:.35em;text-shadow:0 3px 14px rgba(0,0,0,.7);}',
        '.banner-hero__meta{font-size:1.08em;color:rgba(245,245,241,.88);margin-bottom:.75em;display:flex;gap:.58em;align-items:center;flex-wrap:wrap;font-weight:500;line-height:1.4;text-shadow:0 2px 8px rgba(0,0,0,.65);}',
        '.banner-hero__rate{display:inline-flex;align-items:center;gap:.32em;color:#f0ca78;font-weight:800;}',
        '.banner-hero__rate-star{font-size:1.05em;color:#e9bd65;}',
        '.banner-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 2px 10px rgba(0,0,0,.65);}',

        /* NEWCARD / FULLSCREEN CINEMATIC STYLES */
        ':root{--cas-blocks-gap:20px;--cas-meta-size:1.3em;}',
        '.full-start__background{height:calc(100% + 6em);left:0!important;opacity:0!important;transition:opacity 1s cubic-bezier(0.2,0.8,0.2,1)!important;will-change:opacity;overflow:hidden!important;transform:translateZ(0);}',
        '.full-start__background.loaded{opacity:1!important;}',
        '.full-start__background.dim{opacity:0.35!important;}',
        '.cas-tagline,.cas-studios-row,.cas-description,.cas-details-wrapper,.full-start-new__buttons{opacity:0!important;will-change:transform,opacity;backface-visibility:hidden;}',
        '.left-title .full-start-new__body{height:85vh;position:relative;}',
        '.left-title .full-start-new__right{position:static!important;width:100%!important;height:100%;padding:0!important;margin:0!important;display:block!important;}',
        '.left-title__content{position:absolute!important;left:0;right:0;bottom:0;z-index:5;box-sizing:border-box;width:100%;padding:7em 12em 2.5em 1.5em;display:flex;flex-direction:column;align-items:flex-start!important;text-align:left!important;background:transparent!important;cursor:pointer;}',
        '.cas-logo-container{position:relative;display:flex;flex-direction:column;align-items:flex-start!important;justify-content:flex-end;width:100%;margin:0 0 .5em 0;}',
        '.cas-logo{display:block;width:30em;max-width:100%;height:8em;max-height:8em;overflow:visible;margin-bottom:.5em;}',
        '.cas-logo img{display:block;width:auto;height:auto;max-width:30em;max-height:8em;object-fit:contain;object-position:left center;}',
        '.cas-logo-fallback{max-width:30em;max-height:8em;overflow:hidden;font-size:3em;font-weight:800;color:#fff;text-transform:uppercase;}',
        '.cas-meta-line{display:flex!important;align-items:center!important;gap:0!important;width:100%;overflow:hidden;margin:0 0 8px 0;opacity:0.82!important;}',
        '.cas-meta-info{display:flex!important;align-items:center!important;gap:0!important;font-size:var(--cas-meta-size);color:rgba(255,255,255,0.82);}',
        '.cas-meta-separator{margin:0 9px;color:rgba(255,255,255,0.45);}',
        '.cas-description{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;font-size:var(--cas-meta-size)!important;line-height:1.4;color:rgba(255,255,255,0.75);width:70%;margin:2px 0 10px 0;text-align:left!important;}',
        '.cas-anim-slide.cas-animated .cas-studios-row,.cas-anim-slide.cas-animated .cas-tagline,.cas-anim-slide.cas-animated .cas-description,.cas-anim-slide.cas-animated .full-start-new__buttons{opacity:1!important;transform:translate3d(0,0,0);transition:all 0.35s ease;}'
    ].join('\n');

    function installStyle() {
        var el = document.getElementById('interface-plus-combined-style');
        if (!el) {
            el = document.createElement('style');
            el.id = 'interface-plus-combined-style';
            document.head.appendChild(el);
        }
        el.textContent = CSS;
    }

    /* =========================
       CUSTOM TEMPLATE FOR NEWCARD
    ========================= */

    function addCustomTemplate() {
        var template = `<div class="full-start-new left-title cas-anim-slide">
            <div class="full-start-new__body">
                <div class="full-start-new__left hide">
                    <div class="full-start-new__poster"><img class="full-start-new__img full--poster" /></div>
                </div>
                <div class="full-start-new__right">
                    <div class="left-title__content">
                        <div class="cas-logo-container">
                            <div class="cas-studios-row"></div>
                            <div class="cas-logo"></div>
                        </div>
                        <div class="cas-tagline" style="display:none;"></div>
                        <div class="cas-meta-line"><div class="cas-meta-info"></div></div>
                        <div class="cas-description"></div>
                        <div class="full-start-new__buttons">
                            <div class="full-start__button selector button--play"><span>#{title_watch}</span></div>
                            <div class="full-start__button selector button--book"><span>#{settings_input_links}</span></div>
                            <div class="full-start__button selector button--options"><span>...</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        if (Lampa.Template && Lampa.Template.add) {
            Lampa.Template.add('full_start_new', template);
        }
    }

    /* =========================
       HERO & BACKGROUND MANAGEMENT
    ========================= */

    function ensureBackgroundLayers(layer) {
        if (!layer) return;
        if (layer.querySelector('.banner-screen-bg__image--a')) return;
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
        var existing = document.getElementById('interface-plus-screen-background');
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

    function hideHeroBackground() {
        if (!screenBackground) screenBackground = document.getElementById('interface-plus-screen-background');
        if (screenBackground) screenBackground.style.display = 'none';
    }

    function showHeroBackground() {
        var layer = ensureScreenBackground();
        if (layer) layer.style.display = 'block';
    }

    function createHero(root) {
        if (!root) return null;
        if (root.__interfacePlusHero && root.contains(root.__interfacePlusHero)) {
            ensureScreenBackground();
            return root.__interfacePlusHero;
        }
        var layer = ensureScreenBackground();
        var hero = document.createElement('div');
        hero.className = 'banner-hero';
        hero.innerHTML = '<div class="banner-hero__info"><img class="banner-hero__logo" alt=""/><div class="banner-hero__title"></div><div class="banner-hero__meta"></div><div class="banner-hero__descr"></div></div>';
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
        root.__interfacePlusHero = hero;
        return hero;
    }

    function attachHero(o) {
        if (!enabled(S.hero, true) || !o || !isMain(o)) return;
        var root = renderActivity(o);
        if (!root) return;
        activeHero = createHero(root);
        showHeroBackground();
    }

    /* =========================
       NEWCARD / FULLSCREEN LOGIC
    ========================= */

    function getCachedData(id) {
        var cache = storageGet('cas_images_cache', {});
        var item = cache[id];
        if (item && Date.now() - item.time < 86400000) return item.data;
        return null;
    }

    function setCachedData(id, data) {
        var cache = storageGet('cas_images_cache', {});
        cache[id] = { time: Date.now(), data: data };
        storageSet('cas_images_cache', cache);
    }

    function displayMovieLogo(render, data, logos) {
        var logoContainer = render.find('.cas-logo');
        var selectedLogo = pickLogo(logos);
        if (!selectedLogo) {
            logoContainer.html($('<div class="cas-logo-fallback"></div>').text(movieTitle(data)));
            return;
        }
        var url = imageURL(selectedLogo.file_path, LOGO_SIZE);
        preload(url, function (ok) {
            if (!ok) {
                logoContainer.html($('<div class="cas-logo-fallback"></div>').text(movieTitle(data)));
                return;
            }
            logoContainer.empty();
            var img = $('<img>').attr('src', url).attr('alt', movieTitle(data));
            logoContainer.append(img);
        });
    }

    function loadCardLogoAndImages(render, data, requestId) {
        var cacheId = 'tmdb_' + data.id;
        var cachedRes = getCachedData(cacheId);

        var applyData = function (res) {
            if (requestId !== cardRequestId) return;
            if (res && res.logos) {
                displayMovieLogo(render, data, res.logos);
            } else {
                render.find('.cas-logo').html($('<div class="cas-logo-fallback"></div>').text(movieTitle(data)));
            }
            render.find('.cas-description').text(data.overview || '').show();
            render.find('.cas-meta-info').text(movieYear(data) + (data.vote_average ? ' ★ ' + data.vote_average.toFixed(1) : ''));
            render.find('.full-start-new.left-title').addClass('cas-animated');
        };

        if (cachedRes) {
            applyData(cachedRes);
        } else {
            var type = movieType(data) === 'tv' ? 'tv/' : 'movie/';
            var url = Lampa.TMDB.api(type + data.id + '/images?api_key=' + Lampa.TMDB.key());
            $.getJSON(url, function (res) {
                if (requestId !== cardRequestId) return;
                setCachedData(cacheId, res);
                applyData(res);
            }).fail(function () {
                if (requestId !== cardRequestId) return;
                applyData(null);
            });
        }
    }

    /* =========================
       EVENT LISTENERS & INIT
    ========================= */

    function init() {
        if (initialized || !window.Lampa || !Lampa.Storage) return;
        initialized = true;

        installStyle();
        addCustomTemplate();
        ensureScreenBackground();

        if (enabled(S.hero, true)) attachHero(activeActivity());

        Lampa.Listener.follow('activity', function (e) {
            if (!e) return;
            if (e.type === 'start') {
                requestAnimationFrame(function () {
                    if (isFull(e.object)) {
                        hideHeroBackground();
                    } else {
                        attachHero(e.object);
                    }
                });
            }
            if (e.type === 'destroy' && isMain(e.object)) {
                hideHeroBackground();
            }
        });

        Lampa.Listener.follow('full', function (e) {
            if (!e || (e.type !== 'complete' && e.type !== 'complite')) return;
            var data = e.data && e.data.movie;
            var render = e.object.activity.render();
            cardRequestId++;
            hideHeroBackground();

            if (data && data.id) {
                loadCardLogoAndImages(render, data, cardRequestId);
            }
        });

        log('Combined Interface+ & NewCard initialized successfully');
    }

    if (window.appready) {
        setTimeout(init, 150);
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') setTimeout(init, 150);
        });
    }

})();
