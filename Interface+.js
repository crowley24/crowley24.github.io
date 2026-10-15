
(function () {
'use strict';

/*
 * @name INTERFACE+
 * @version 1.5.2
 * @author Crowley24
 * @description Premium interface, dynamic banners and Ukrainian TMDB logos
 * @platforms Lampa | Android TV
 */

if (window.banner_hero_plugin) return;
window.banner_hero_plugin = true;

var VERSION = '1.5.2';

var SETTING = 'banner_hero_enabled';
var SIZE_SETTING = 'interface_size';
var FONT_SETTING = 'fontchanger_selected';
var CARD_SETTING = 'interface_plus_card_logo';
var QUALITY_SETTING = 'interface_plus_logo_quality';
var SCALE_SETTING = 'interface_plus_logo_scale';

var CACHE_KEY = 'interface_plus_logo_cache_v152';
var CACHE_MAX = 100;

var CACHE_TTL = 24 * 60 * 60 * 1000;
var EMPTY_TTL = 60 * 60 * 1000;
var ERROR_TTL = 60 * 1000;

var initialized = false;

var logoCache = Object.create(null);
var pending = Object.create(null);
var backdrops = Object.create(null);
var backdropPending = Object.create(null);

var focusTimer = null;
var lastCardId = '';
var lastActivity = null;

var card = {
    root: null,
    key: '',
    token: 0,
    observer: null,
    timer: null,
    src: '',
    title: '',
    data: null,
    requested: false
};

var TITLE_SELECTORS = [
    '.full-start__title',
    '.full-start-new__title',
    '.full__title',
    '.full-card__title',
    '.cas-logo'
].join(',');

/* =========================
   TRANSLATIONS
========================= */

var texts = {
    banner_settings_name: 'Інтерфейс +',

    banner_enable_name: 'Динамічні банери',
    banner_enable_descr:
        'Показувати великий банер з фоном і логотипом над рядами карток',

    card_logo_name: 'Логотип у картці фільму',
    card_logo_descr:
        'Український логотип, англійський або українська назва',

    logo_quality_name: 'Якість логотипів',
    logo_quality_descr:
        'Якість логотипів у банері та картці фільму',

    logo_scale_name: 'Розмір логотипів',
    logo_scale_descr:
        'Масштаб логотипів у банері та картці фільму',

    cache_clear_name: 'Очистити кеш логотипів',
    cache_clear_descr:
        'Видалити збережені логотипи та повторно отримати їх із TMDB',

    font_setting_name: 'Шрифт інтерфейсу',
    font_setting_descr:
        'Виберіть стиль шрифту для всього інтерфейсу',

    font_default: 'За замовчуванням (Roboto)',
    font_netflix: 'Netflix Sans',
    font_montserrat: 'Montserrat',
    font_inter: 'Inter (Сучасний UI)',
    font_nunito: 'Nunito (М\'який стиль)',

    settings_param_interface_size_mini:
        'Міні інтерфейс',

    settings_param_interface_size_very_small:
        'Дуже малий інтерфейс',

    settings_param_interface_size_small:
        'Малий інтерфейс',

    settings_param_interface_size_medium:
        'Середній інтерфейс'
};

/* =========================
   FONTS
========================= */

var fonts = {
    default: {
        family: 'Roboto, Arial, sans-serif',
        url: ''
    },

    netflix: {
        family: '"Netflix Sans", Arial, sans-serif',
        url:
            'https://assets.nflxext.com/ffe/siteui/fonts/netflix-sans/v3/NetflixSans_W_Rg.woff2'
    },

    montserrat: {
        family: '"Montserrat", sans-serif',
        url:
            'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap'
    },

    inter: {
        family: '"Inter", sans-serif',
        url:
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    },

    nunito: {
        family: '"Nunito", sans-serif',
        url:
            'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap'
    }
};

/* =========================
   CSS
========================= */

var CSS = [

'.banner-host{position:relative}',

'.banner-enabled .banner-host .activity__body{' +
'padding-top:42vh;box-sizing:border-box}',

'.banner-hero{' +
'position:absolute;' +
'left:0;right:0;top:0;' +
'height:50vh;' +
'overflow:hidden;' +
'pointer-events:none;' +
'z-index:0;' +
'-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%);' +
'mask-image:linear-gradient(180deg,#000 55%,transparent 100%)}',

'.banner-hero__bg{' +
'position:absolute;' +
'inset:0;' +
'background-size:cover;' +
'background-position:center 20%;' +
'background-repeat:no-repeat;' +
'opacity:0;' +
'transition:opacity .35s ease}',

'.banner-hero__bg.show{opacity:1}',

'.banner-hero::after{' +
'content:"";' +
'position:absolute;' +
'inset:0;' +
'background:linear-gradient(90deg,' +
'rgba(0,0,0,.85) 0%,' +
'rgba(0,0,0,.6) 35%,' +
'rgba(0,0,0,0) 70%);' +
'pointer-events:none}',

'.banner-hero__info{' +
'position:absolute;' +
'left:3em;' +
'bottom:5.5em;' +
'width:46%;' +
'z-index:1}',

'.banner-hero__logo{' +
'display:block;' +
'width:auto;' +
'height:auto;' +
'max-width:100%;' +
'max-height:7em;' +
'object-fit:contain;' +
'object-position:left center;' +
'opacity:0;' +
'transition:opacity .25s ease;' +
'filter:drop-shadow(0 4px 12px rgba(0,0,0,.6))}',

'.banner-hero__logo.ready{opacity:1}',

'.banner-hero__title{' +
'font-size:2.8em;' +
'font-weight:900;' +
'line-height:1.05;' +
'color:#f5f5f1;' +
'margin-bottom:.35em;' +
'text-shadow:0 3px 14px rgba(0,0,0,.7)}',

'.banner-hero__meta{' +
'font-size:1.15em;' +
'color:#f5f5f1;' +
'margin-bottom:.6em;' +
'display:flex;' +
'gap:.8em;' +
'align-items:center;' +
'flex-wrap:wrap}',

'.banner-hero__rate{' +
'padding:.1em .5em;' +
'border-radius:6px;' +
'font-weight:800;' +
'background:#1db954;' +
'color:#fff}',

'.banner-hero__descr{' +
'font-size:1.1em;' +
'line-height:1.45;' +
'color:#f5f5f1;' +
'opacity:.85;' +
'display:-webkit-box;' +
'-webkit-line-clamp:3;' +
'-webkit-box-orient:vertical;' +
'overflow:hidden}',

'.interface-plus-logo-title{position:relative}',

'.interface-plus-original-title{display:initial}',

'.interface-plus-card-logo{' +
'display:block;' +
'width:auto;' +
'height:auto;' +
'max-width:100%;' +
'max-height:105px;' +
'object-fit:contain;' +
'object-position:left center;' +
'opacity:0;' +
'transition:opacity .25s ease;' +
'filter:drop-shadow(0 3px 10px rgba(0,0,0,.45));' +
'pointer-events:none}',

'.interface-plus-card-logo.ready{opacity:1}',

'.interface-plus-logo-title.interface-plus-logo-active{' +
'font-size:0!important;' +
'line-height:0!important}',

'.interface-plus-logo-title.interface-plus-logo-active>' +
'.interface-plus-original-title{' +
'display:none!important}',

'.interface-plus-logo-title.interface-plus-logo-active>' +
'.interface-plus-card-logo{' +
'font-size:initial;' +
'line-height:normal}',

'.cas-logo.interface-plus-logo-title.interface-plus-logo-active>' +
'.interface-plus-original-title{' +
'display:none!important}',

'@media(max-width:480px){' +
'.interface-plus-card-logo{max-height:75px}' +
'.banner-hero__info{left:1.5em;width:75%}' +
'.banner-hero__logo{max-height:5em}' +
'}'

].join('\n');

/* =========================
   STYLE
========================= */

function style() {
    var old = document.getElementById(
        'banner-hero-style'
    );

    if (old) {
        old.textContent = CSS;
        return;
    }

    var e = document.createElement('style');
    e.id = 'banner-hero-style';
    e.textContent = CSS;
    document.head.appendChild(e);
}

/* =========================
   STORAGE
========================= */

function get(name, def) {
    try {
        return Lampa.Storage.get(name, def);
    } catch (e) {
        return def;
    }
}

function on(name, def) {
    var v = get(name, def);

    return v === true ||
           v === 'true' ||
           v === 1;
}

function heroOn() {
    return on(SETTING, true);
}

function cardOn() {
    return on(CARD_SETTING, true);
}

function quality() {
    var q = String(get(QUALITY_SETTING, 'original'));

    return /^(w300|w500|original)$/.test(q)
        ? q
        : 'original';
}

function scale() {
    var n = parseInt(get(SCALE_SETTING, '100'), 10);

    return Math.max(
        70,
        Math.min(120, n || 100)
    ) / 100;
}

/* =========================
   MEDIA TYPE
========================= */

function kind(d) {
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

function element(v) {
    if (v && v.nodeType === 1) {
        return v;
    }

    if (v && v[0] && v[0].nodeType === 1) {
        return v[0];
    }

    return null;
}

function activityElement(o) {
    var r;

    try {
        r = o &&
            o.activity &&
            o.activity.render &&
            o.activity.render(true);
    } catch (e) {}

    if (!r) {
        try {
            r = o &&
                o.render &&
                o.render(true);
        } catch (e) {}
    }

    return element(r);
}

function isFull(o) {
    var c = String(
        o && o.component || ''
    ).toLowerCase();

    return c === 'full' ||
           c === 'full_start' ||
           c === 'fullstart';
}

/* =========================
   MOVIE DATA
========================= */

function movieData(o) {
    if (!o) return null;

    var a = [
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
    var bestScore = -1;

    a.forEach(function (d) {
        if (!d || typeof d !== 'object') {
            return;
        }

        var score = 0;

        if (d.tmdb_id || d.tmdbId) {
            score += 10;
        }

        if (d.source === 'tmdb') {
            score += 5;
        }

        if (d.id) {
            score += 2;
        }

        if (d.title || d.name) {
            score += 2;
        }

        if (d.release_date || d.first_air_date) {
            score += 1;
        }

        if (
            score > bestScore &&
            (d.id || d.tmdb_id || d.tmdbId)
        ) {
            best = d;
            bestScore = score;
        }
    });

    return best;
}

/* =========================
   TMDB IDENTIFIER
========================= */

function tmdbId(d) {
    if (!d) return '';

    var id = d.tmdb_id ||
             d.tmdbId ||
             d.tmdb ||
             '';

    if (
        id &&
        typeof id === 'object'
    ) {
        id = id.id || '';
    }

    if (!id && d.id) {
        var source = String(
            d.source || 'tmdb'
        ).toLowerCase();

        if (
            source === 'tmdb' ||
            source === ''
        ) {
            id = d.id;
        }
    }

    id = String(id || '').trim();

    return /^\d+$/.test(id)
        ? id
        : '';
}

function mediaKey(d) {
    var id = tmdbId(d);

    if (id) {
        return kind(d) + '_' + id;
    }

    return (
        kind(d) + '_unknown_' +
        String(d && (d.id || d.title || d.name) || '')
    );
}

/* =========================
   PRELOAD
========================= */

function preload(src, cb) {
    if (!src) {
        cb(false);
        return;
    }

    var im = new Image();
    var done = false;

    function finish(ok) {
        if (done) return;

        done = true;

        im.onload = null;
        im.onerror = null;

        cb(ok);
    }

    im.onload = function () {
        finish(true);
    };

    im.onerror = function () {
        finish(false);
    };

    im.src = src;

    if (im.complete && im.naturalWidth) {
        finish(true);
    }
}

/* =========================
   TMDB
========================= */

function tmdbURL(type, id) {
    return (
        'https://api.themoviedb.org/3/' +
        type + '/' +
        encodeURIComponent(id) +
        '?api_key=' +
        encodeURIComponent(Lampa.TMDB.key()) +
        '&language=uk-UA' +
        '&append_to_response=images' +
        '&include_image_language=uk,en,null'
    );
}

function logoURL(path) {
    if (!path) return '';

    var p = String(path);

    if (/\.svg$/i.test(p)) {
        p = p.replace(/\.svg$/i, '.png');
    }

    try {
        return Lampa.TMDB.image(
            '/t/p/' + quality() + p
        );
    } catch (e) {
        return '';
    }
}

function fallbackTitle(d) {
    return String(
        d && (
            d.title ||
            d.name ||
            d.original_title ||
            d.original_name
        ) || ''
    ).trim();
}

function ukrainianTitle(json, d) {
    var title = json && (
        kind(d) === 'tv'
            ? json.name
            : json.title
    );

    return String(
        title || fallbackTitle(d)
    ).trim();
}

/* =========================
   STRICT LOGO SELECTION
========================= */

function chooseLogo(list) {
    if (!Array.isArray(list)) {
        return null;
    }

    var groups = ['uk', 'en'];

    for (var g = 0; g < groups.length; g++) {
        var lang = groups[g];

        var candidates = list.filter(function (x) {
            return x &&
                x.file_path &&
                x.iso_639_1 === lang;
        });

        if (!candidates.length) {
            continue;
        }

        candidates.sort(function (a, b) {
            var av = Number(a.vote_average) || 0;
            var bv = Number(b.vote_average) || 0;

            if (bv !== av) {
                return bv - av;
            }

            return (
                Number(b.vote_count) || 0
            ) - (
                Number(a.vote_count) || 0
            );
        });

        return candidates[0];
    }

    return null;
}

/* =========================
   CACHE
========================= */

function cacheRead() {
    try {
        var db = get(CACHE_KEY, {});

        return db && typeof db === 'object'
            ? db
            : {};
    } catch (e) {
        return {};
    }
}

function cacheWrite(db) {
    try {
        Lampa.Storage.set(CACHE_KEY, db);
    } catch (e) {}
}

function cacheValid(item) {
    if (!item || !item.time) {
        return false;
    }

    var ttl = item.failed
        ? ERROR_TTL
        : item.path
            ? CACHE_TTL
            : EMPTY_TTL;

    return Date.now() - item.time < ttl;
}

function cacheSave(k, item) {
    logoCache[k] = item;

    if (item.failed) {
        return;
    }

    var db = cacheRead();

    db[k] = item;

    var keys = Object.keys(db);

    if (keys.length > CACHE_MAX) {
        keys.sort(function (a, b) {
            return (db[a].time || 0) -
                   (db[b].time || 0);
        });

        keys.slice(
            0,
            keys.length - CACHE_MAX
        ).forEach(function (x) {
            delete db[x];
        });
    }

    cacheWrite(db);
}

function clearLogoCache() {
    logoCache = Object.create(null);

    cacheWrite({});

    try {
        Lampa.Storage.set(
            'interface_plus_logo_cache_v151',
            {}
        );

        Lampa.Storage.set(
            'interface_plus_logo_cache_v150',
            {}
        );
    } catch (e) {}

    refreshLogos(true);

    try {
        if (Lampa.Noty && Lampa.Noty.show) {
            Lampa.Noty.show(
                'Кеш логотипів очищено'
            );
        }
    } catch (e) {}
}

/* =========================
   LOGO ENGINE
========================= */

function loadLogo(d, cb, force) {
    if (!d) {
        cb({ src: '', title: '' });
        return;
    }

    var id = tmdbId(d);
    var title = fallbackTitle(d);

    if (!id) {
        cb({
            src: '',
            title: title
        });

        return;
    }

    var k = kind(d) + '_' + id;

    function output(item) {
        return {
            src: logoURL(item.path),
            title: item.title || title
        };
    }

    if (!force) {
        var hit = logoCache[k];

        if (cacheValid(hit)) {
            cb(output(hit));
            return;
        }

        var db = cacheRead();
        var saved = db[k];

        if (cacheValid(saved)) {
            logoCache[k] = saved;
            cb(output(saved));
            return;
        }
    }

    if (pending[k]) {
        pending[k].push(cb);
        return;
    }

    if (
        !Lampa.TMDB ||
        !Lampa.TMDB.key ||
        typeof $ === 'undefined'
    ) {
        cb({ src: '', title: title });
        return;
    }

    pending[k] = [cb];

    function finish(path, translated, failed) {
        var item = {
            path: path || '',
            title: translated || title,
            failed: !!failed,
            time: Date.now()
        };

        cacheSave(k, item);

        var callbacks = pending[k] || [];
        delete pending[k];

        var value = output(item);

        callbacks.forEach(function (fn) {
            try {
                fn(value);
            } catch (e) {}
        });
    }

    var url;

    try {
        url = tmdbURL(kind(d), id);
    } catch (e) {
        finish('', title, true);
        return;
    }

    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        timeout: 12000,

        success: function (json) {
            var list = json &&
                json.images &&
                json.images.logos;

            var best = chooseLogo(list);

            finish(
                best ? best.file_path : '',
                ukrainianTitle(json, d),
                false
            );
        },

        error: function () {
            finish('', title, true);
        }
    });
}

/* =========================
   BACKDROP
========================= */

function loadBackdrop(d, cb) {
    if (!d || !d.backdrop_path) {
        cb('');
        return;
    }

    var k = mediaKey(d);
    var path = d.backdrop_path;

    if (
        backdrops[k] &&
        backdrops[k].path === path
    ) {
        cb(backdrops[k].src);
        return;
    }

    if (backdropPending[k]) {
        backdropPending[k].push(cb);
        return;
    }

    var src = '';

    try {
        src = Lampa.Api.img(path, 'w1280');
    } catch (e) {}

    if (!src) {
        cb('');
        return;
    }

    backdropPending[k] = [cb];

    preload(src, function (ok) {
        var value = ok ? src : '';

        if (ok) {
            backdrops[k] = {
                path: path,
                src: src
            };
        }

        var callbacks = backdropPending[k] || [];
        delete backdropPending[k];

        callbacks.forEach(function (fn) {
            try {
                fn(value);
            } catch (e) {}
        });
    });
}

/* =========================
   FONTS
========================= */

function applyFont(k) {
    var f = fonts[k] || fonts.default;

    var old = document.getElementById(
        'interface-plus-font-style'
    );

    var face = document.getElementById(
        'interface-plus-fontface'
    );

    if (old) old.remove();
    if (face) face.remove();

    if (f.url) {
        face = document.createElement('style');
        face.id = 'interface-plus-fontface';

        if (f.url.indexOf('googleapis.com') !== -1) {
            face.textContent =
                '@import url("' + f.url + '");';
        } else {
            face.textContent =
                '@font-face{' +
                'font-family:"Netflix Sans";' +
                'src:url("' + f.url + '") format("woff2");' +
                'font-weight:400;' +
                'font-style:normal}';
        }

        document.head.appendChild(face);
    }

    old = document.createElement('style');
    old.id = 'interface-plus-font-style';

    old.textContent =
        'body,.body,*{' +
        'font-family:' + f.family + '!important}';

    document.head.appendChild(old);
}

/* =========================
   INTERFACE SIZE
========================= */

function patchMaker(count) {
    if (!Lampa.Maker || !Lampa.Maker.map) {
        return;
    }

    ['Line', 'Category'].forEach(function (type) {
        var m = Lampa.Maker.map(type);

        if (
            !m ||
            !m.Items ||
            !m.Items.onInit
        ) {
            return;
        }

        if (m.Items.__bannerHeroPatched) {
            m.Items.__bannerHeroCardCount = count;
            return;
        }

        var original = m.Items.onInit;

        m.Items.onInit = function () {
            original.apply(this, arguments);

            var n =
                m.Items.__bannerHeroCardCount ||
                count;

            if (type === 'Line') {
                this.view = n;
            } else {
                this.limit_view = n;
            }
        };

        m.Items.__bannerHeroPatched = true;
        m.Items.__bannerHeroCardCount = count;
    });
}

function updateSize() {
    var mobile = false;

    try {
        mobile = !!(
            Lampa.Platform &&
            Lampa.Platform.screen &&
            Lampa.Platform.screen('mobile')
        );
    } catch (e) {}

    var v = get(SIZE_SETTING, '10.6');

    try {
        if (Lampa.Storage.field) {
            v = Lampa.Storage.field(SIZE_SETTING) || v;
        }
    } catch (e) {}

    var size = mobile
        ? 10.1
        : parseFloat(v) || 10.6;

    if (
        document.body.getAttribute(
            'data-banner-interface-size'
        ) === String(size)
    ) {
        return;
    }

    document.body.setAttribute(
        'data-banner-interface-size',
        String(size)
    );

    document.body.style.fontSize = size + 'px';

    patchMaker(
        size <= 9.6
            ? 8
            : size <= 11.1
                ? 7
                : 6
    );
}

/* =========================
   HERO CREATION
========================= */

function heroFor(a) {
    if (!a) return null;

    if (
        a.__bannerHero &&
        a.contains(a.__bannerHero)
    ) {
        return a.__bannerHero;
    }

    var h = a.querySelector('.banner-hero');

    if (!h) {
        h = document.createElement('div');
        h.className = 'banner-hero';

        h.innerHTML =
            '<div class="banner-hero__bg"></div>' +
            '<div class="banner-hero__info">' +
            '<img class="banner-hero__logo" alt=""/>' +
            '<div class="banner-hero__title"></div>' +
            '<div class="banner-hero__meta"></div>' +
            '<div class="banner-hero__descr"></div>' +
            '</div>';

        a.insertBefore(h, a.firstChild);
    }

    a.classList.add('banner-host');
    a.__bannerHero = h;

    h.parts = {
        bg: h.querySelector('.banner-hero__bg'),
        logo: h.querySelector('.banner-hero__logo'),
        title: h.querySelector('.banner-hero__title'),
        meta: h.querySelector('.banner-hero__meta'),
        descr: h.querySelector('.banner-hero__descr')
    };

    return h;
}

/* =========================
   HERO DISPLAY
========================= */

function showHero(h, d) {
    if (!h || !d) return;

    var id = mediaKey(d);
    var p = h.parts;

    if (h.bannerId === id && h.bannerData) {
        return;
    }

    h.bannerId = id;
    h.bannerData = d;

    h.logoToken = (h.logoToken || 0) + 1;

    var token = h.logoToken;

    p.title.textContent = fallbackTitle(d);
    p.title.style.display = '';

    p.logo.classList.remove('ready');
    p.logo.style.display = 'none';
    p.logo.onload = null;
    p.logo.onerror = null;
    p.logo.removeAttribute('src');

    p.logo.style.transform =
        'scale(' + scale() + ')';

    p.logo.style.transformOrigin =
        'left center';

    var rating = parseFloat(d.vote_average);

    var year = String(
        d.release_date ||
        d.first_air_date ||
        ''
    ).slice(0, 4);

    p.meta.textContent = '';

    if (rating > 0) {
        var r = document.createElement('span');
        r.className = 'banner-hero__rate';
        r.textContent = rating.toFixed(1);
        p.meta.appendChild(r);
    }

    if (year) {
        var y = document.createElement('span');
        y.textContent = year;
        p.meta.appendChild(y);
    }

    var type = document.createElement('span');

    type.textContent =
        kind(d) === 'tv'
            ? 'Серіал'
            : 'Фільм';

    p.meta.appendChild(type);

    p.descr.textContent = d.overview || '';

    p.bg.classList.remove('show');
    p.bg.style.backgroundImage = 'none';

    loadBackdrop(d, function (src) {
        if (
            h.bannerId !== id ||
            h.logoToken !== token ||
            !src
        ) {
            return;
        }

        p.bg.style.backgroundImage =
            'url("' + src.replace(/"/g, '%22') + '")';

        requestAnimationFrame(function () {
            if (
                h.bannerId === id &&
                h.logoToken === token
            ) {
                p.bg.classList.add('show');
            }
        });
    });

    loadLogo(d, function (result) {
        if (
            h.bannerId !== id ||
            h.logoToken !== token
        ) {
            return;
        }

        if (result.title) {
            p.title.textContent = result.title;
        }

        if (!result.src) {
            p.title.style.display = '';
            return;
        }

        preload(result.src, function (ok) {
            if (
                h.bannerId !== id ||
                h.logoToken !== token
            ) {
                return;
            }

            if (!ok) {
                p.title.style.display = '';
                return;
            }

            p.logo.src = result.src;
            p.logo.style.display = 'block';

            requestAnimationFrame(function () {
                if (
                    h.bannerId !== id ||
                    h.logoToken !== token
                ) {
                    return;
                }

                p.logo.classList.add('ready');
                p.title.style.display = 'none';
            });
        });
    });
}

/* =========================
   HERO FOCUS
========================= */

function onFocus(e) {
    if (!heroOn()) return;

    var c = e.target &&
        e.target.closest &&
        e.target.closest('.card');

    if (
        !c ||
        !c.card_data ||
        !c.card_data.id
    ) {
        return;
    }

    var a = c.closest('.activity');

    if (
        !a ||
        !a.classList.contains('banner-host')
    ) {
        return;
    }

    var d = c.card_data;
    var id = mediaKey(d);

    if (
        lastCardId === id &&
        lastActivity === a
    ) {
        return;
    }

    clearTimeout(focusTimer);

    focusTimer = setTimeout(function () {
        if (!heroOn() || !a.isConnected) {
            return;
        }

        lastCardId = id;
        lastActivity = a;

        showHero(
            a.__bannerHero || heroFor(a),
            d
        );
    }, 220);
}

function attach(o) {
    if (
        !heroOn() ||
        !o ||
        ['main', 'category'].indexOf(o.component) < 0
    ) {
        return;
    }

    var e = activityElement(o);

    if (e) {
        heroFor(e);
    }
}

function apply() {
    var active = heroOn();

    document.body.classList.toggle(
        'banner-enabled',
        active
    );

    if (!active) {
        clearTimeout(focusTimer);
        lastCardId = '';
        lastActivity = null;
    } else {
        try {
            attach(Lampa.Activity.active());
        } catch (e) {}
    }
}

/* =========================
   RESTORE TITLE
========================= */

function restore(root) {
    if (!root || !root.querySelectorAll) {
        return;
    }

    var titles = [];

    if (
        root.classList &&
        root.classList.contains(
            'interface-plus-logo-title'
        )
    ) {
        titles.push(root);
    }

    Array.prototype.push.apply(
        titles,
        root.querySelectorAll(
            '.interface-plus-logo-title'
        )
    );

    titles.forEach(function (t) {
        var logo = t.querySelector(
            '.interface-plus-card-logo'
        );

        if (logo) {
            logo.onload = null;
            logo.onerror = null;
            logo.remove();
        }

        var original = t.querySelector(
            '.interface-plus-original-title'
        );

        if (original) {
            while (original.firstChild) {
                t.insertBefore(
                    original.firstChild,
                    original
                );
            }

            original.remove();
        }

        t.classList.remove(
            'interface-plus-logo-title',
            'interface-plus-logo-active'
        );

        t.removeAttribute(
            'data-interface-plus-logo-id'
        );
    });
}

/* =========================
   CARD STATE
========================= */

function stopCard(restoreTitle) {
    card.token++;

    if (card.timer) {
        clearTimeout(card.timer);
    }

    card.timer = null;

    if (card.observer) {
        card.observer.disconnect();
    }

    card.observer = null;

    if (restoreTitle && card.root) {
        restore(card.root);
    }

    card.root = null;
    card.key = '';
    card.src = '';
    card.title = '';
    card.data = null;
    card.requested = false;
}

function current(token, id) {
    return (
        token === card.token &&
        id === card.key &&
        cardOn() &&
        card.root &&
        card.root.isConnected
    );
}

function findTitle(root) {
    return root &&
        root.querySelector &&
        root.querySelector(TITLE_SELECTORS);
}

/* =========================
   PREPARE TITLE
========================= */

function prepareTitle(title, id) {
    if (!title) return null;

    if (
        title.getAttribute(
            'data-interface-plus-logo-id'
        ) !== id &&
        title.classList.contains(
            'interface-plus-logo-title'
        )
    ) {
        restore(title);
    }

    var logo = title.querySelector(
        '.interface-plus-card-logo'
    );

    if (logo) {
        return logo;
    }

    title.classList.add(
        'interface-plus-logo-title'
    );

    var original = document.createElement('span');
    original.className =
        'interface-plus-original-title';

    while (title.firstChild) {
        original.appendChild(
            title.firstChild
        );
    }

    title.appendChild(original);

    logo = document.createElement('img');
    logo.className = 'interface-plus-card-logo';
    logo.alt = '';
    logo.draggable = false;

    title.appendChild(logo);

    title.setAttribute(
        'data-interface-plus-logo-id',
        id
    );

    return logo;
}

/* =========================
   TEXT FALLBACK
========================= */

function putText(token, id, value) {
    if (!current(token, id)) {
        return;
    }

    var title = findTitle(card.root);

    if (!title) {
        scheduleCheck(token, id, 80);
        return;
    }

    restore(title);

    if (value) {
        title.textContent = value;
    }
}

/* =========================
   DISPLAY LOGO
========================= */

function putLogo(token, id, src) {
    if (!current(token, id)) {
        return;
    }

    if (!src) {
        putText(token, id, card.title);
        return;
    }

    var title = findTitle(card.root);

    if (!title) {
        scheduleCheck(token, id, 80);
        return;
    }

    var logo = prepareTitle(title, id);

    if (!logo) return;

    logo.style.transform =
        'scale(' + scale() + ')';

    logo.style.transformOrigin =
        'left center';

    logo.onload = null;

    logo.onerror = function () {
        if (!current(token, id)) return;

        card.src = '';
        putText(token, id, card.title);
    };

    logo.src = src;

    logo.classList.add('ready');

    title.classList.add(
        'interface-plus-logo-active'
    );
}

/* =========================
   CARD DOM WAIT
========================= */

function scheduleCheck(token, id, delay) {
    if (!current(token, id)) {
        return;
    }

    if (card.timer) {
        clearTimeout(card.timer);
    }

    card.timer = setTimeout(function () {
        card.timer = null;

        if (!current(token, id)) {
            return;
        }

        if (card.src) {
            putLogo(token, id, card.src);
        } else if (card.title) {
            putText(token, id, card.title);
        }
    }, delay || 70);
}

/* =========================
   MUTATION OBSERVER
========================= */

function watchCard(root, token, id) {
    if (!window.MutationObserver) {
        return;
    }

    card.observer = new MutationObserver(
        function (mutations) {
            if (
                !current(token, id) ||
                (!card.src && !card.title)
            ) {
                return;
            }

            var relevant = mutations.some(
                function (m) {
                    if (m.type !== 'childList') {
                        return false;
                    }

                    var t = m.target;

                    if (
                        t.nodeType === 1 &&
                        t.closest &&
                        t.closest(
                            '.interface-plus-logo-title'
                        )
                    ) {
                        return false;
                    }

                    return Array.prototype.some.call(
                        m.addedNodes,
                        function (n) {
                            return n.nodeType === 1 &&
                                !(
                                    n.classList &&
                                    (
                                        n.classList.contains(
                                            'interface-plus-card-logo'
                                        ) ||
                                        n.classList.contains(
                                            'interface-plus-original-title'
                                        )
                                    )
                                );
                        }
                    );
                }
            );

            if (!relevant) return;

            var title = findTitle(root);

            if (
                card.src &&
                title &&
                title.classList.contains(
                    'interface-plus-logo-active'
                ) &&
                title.querySelector(
                    '.interface-plus-card-logo.ready'
                )
            ) {
                return;
            }

            scheduleCheck(token, id, 45);
        }
    );

    card.observer.observe(root, {
        childList: true,
        subtree: true
    });
}

/* =========================
   START CARD
========================= */

function startCard(o, override, force) {
    if (!cardOn() || !isFull(o)) {
        return;
    }

    var d = override || movieData(o);
    var root = activityElement(o);

    if (!d || !root) {
        return;
    }

    var id = mediaKey(d);

    if (
        card.key === id &&
        card.root === root &&
        !force
    ) {
        if (card.src) {
            putLogo(card.token, id, card.src);
        } else if (card.title) {
            putText(card.token, id, card.title);
        }

        return;
    }

    stopCard(false);

    card.root = root;
    card.key = id;
    card.data = d;

    var token = card.token;

    watchCard(root, token, id);

    card.requested = true;

    loadLogo(d, function (result) {
        if (!current(token, id)) {
            return;
        }

        card.title = result.title ||
            fallbackTitle(d);

        if (!result.src) {
            card.src = '';
            putText(token, id, card.title);
            return;
        }

        preload(result.src, function (ok) {
            if (!current(token, id)) {
                return;
            }

            if (!ok) {
                card.src = '';
                putText(token, id, card.title);
                return;
            }

            card.src = result.src;

            putLogo(token, id, result.src);
        });
    }, !!force);
}

/* =========================
   REFRESH
========================= */

function refreshCard(force) {
    if (!cardOn()) {
        stopCard(true);
        return;
    }

    try {
        var a = Lampa.Activity.active();

        if (isFull(a)) {
            startCard(a, null, !!force);
        }
    } catch (e) {}
}

function refreshLogos(force) {
    lastCardId = '';
    lastActivity = null;

    try {
        var a = Lampa.Activity.active();

        if (a) {
            var root = activityElement(a);

            if (
                root &&
                root.__bannerHero
            ) {
                root.__bannerHero.bannerId = '';
                root.__bannerHero.bannerData = null;
                root.__bannerHero.logoToken =
                    (root.__bannerHero.logoToken || 0) + 1;
            }

            if (isFull(a)) {
                stopCard(true);
                startCard(a, null, !!force);
            }
        }
    } catch (e) {}
}

/* =========================
   SETTINGS
========================= */

function settings() {
    if (!Lampa.SettingsApi) {
        return;
    }

    Lampa.SettingsApi.addComponent({
        component: 'interface_plus_settings',
        name: texts.banner_settings_name,

        icon:
            '<svg viewBox="0 0 24 24" ' +
            'width="24" height="24" ' +
            'fill="currentColor">' +
            '<path d="M19 3H5c-1.1 0-2 .9-2 2v14' +
            'c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5' +
            'c0-1.1-.9-2-2-2zm0 16H5V5h14v14z' +
            'M7 10h2v7H7zm4-3h2v10h-2zm4 5h2v5h-2z"/>' +
            '</svg>'
    });

    function param(
        name,
        type,
        def,
        label,
        descr,
        values,
        fn
    ) {
        Lampa.SettingsApi.addParam({
            component: 'interface_plus_settings',

            param: {
                name: name,
                type: type,
                default: def,
                values: values
            },

            field: {
                name: label,
                description: descr || ''
            },

            onChange: fn
        });
    }

    param(
        SETTING,
        'trigger',
        true,
        texts.banner_enable_name,
        texts.banner_enable_descr,
        null,
        apply
    );

    param(
        CARD_SETTING,
        'trigger',
        true,
        texts.card_logo_name,
        texts.card_logo_descr,
        null,
        function () {
            refreshCard(true);
        }
    );

    param(
        QUALITY_SETTING,
        'select',
        'original',
        texts.logo_quality_name,
        texts.logo_quality_descr,
        {
            w300: '300px',
            w500: '500px',
            original: 'Original'
        },
        function () {
            refreshLogos(false);
        }
    );

    param(
        SCALE_SETTING,
        'select',
        '100',
        texts.logo_scale_name,
        texts.logo_scale_descr,
        {
            '70': '70%',
            '80': '80%',
            '90': '90%',
            '100': '100%',
            '110': '110%',
            '120': '120%'
        },
        function () {
            refreshLogos(false);
        }
    );

    param(
        'interface_plus_clear_logo_cache',
        'button',
        '',
        texts.cache_clear_name,
        texts.cache_clear_descr,
        null,
        clearLogoCache
    );

    param(
        SIZE_SETTING,
        'select',
        '10.6',
        'Розмір інтерфейсу',
        'Виберіть бажаний масштаб елементів інтерфейсу',
        Lampa.Params.values[SIZE_SETTING],
        updateSize
    );

    param(
        FONT_SETTING,
        'select',
        'default',
        texts.font_setting_name,
        texts.font_setting_descr,
        {
            default: texts.font_default,
            netflix: texts.font_netflix,
            montserrat: texts.font_montserrat,
            inter: texts.font_inter,
            nunito: texts.font_nunito
        },
        applyFont
    );
}

/* =========================
   INITIALIZATION
========================= */

function init() {
    if (
        initialized ||
        !window.Lampa ||
        !Lampa.Storage
    ) {
        return;
    }

    initialized = true;

    if (Lampa.Lang) {
        Lampa.Lang.add(texts);
    }

    if (Lampa.Params) {
        Lampa.Params.values =
            Lampa.Params.values || {};

        Lampa.Params.values[SIZE_SETTING] = {
            '09.1':
                texts.settings_param_interface_size_mini,

            '09.6':
                texts.settings_param_interface_size_very_small,

            '10.1':
                texts.settings_param_interface_size_small,

            '10.6':
                texts.settings_param_interface_size_medium
        };

        if (Lampa.Params.select) {
            Lampa.Params.select(
                SIZE_SETTING,
                Lampa.Params.values[SIZE_SETTING],
                '10.6'
            );
        }
    }

    style();
    apply();
    updateSize();

    applyFont(
        get(FONT_SETTING, 'default')
    );

    document.addEventListener(
        'hover:focus',
        onFocus,
        true
    );

    /* =========================
       ACTIVITY LISTENER
    ========================= */

    if (Lampa.Listener) {
        Lampa.Listener.follow(
            'activity',
            function (e) {
                if (!e) return;

                if (e.type === 'start') {
                    requestAnimationFrame(
                        function () {
                            attach(e.object);

                            if (isFull(e.object)) {
                                startCard(e.object);
                            } else {
                                stopCard(false);
                            }
                        }
                    );
                }

                if (
                    e.type === 'destroy' &&
                    isFull(e.object)
                ) {
                    stopCard(false);
                }
            }
        );

        /* =========================
           FULL CARD COMPLETED
        ========================= */

        Lampa.Listener.follow(
            'full',
            function (e) {
                if (
                    !e ||
                    (
                        e.type !== 'complite' &&
                        e.type !== 'complete'
                    )
                ) {
                    return;
                }

                var d = e.data &&
                    e.data.movie;

                var o = e.object;

                requestAnimationFrame(
                    function () {
                        if (
                            o &&
                            isFull(o)
                        ) {
                            startCard(
                                o,
                                d || null,
                                true
                            );
                        }
                    }
                );
            }
        );
    }

    /* =========================
       CURRENT ACTIVITY
    ========================= */

    if (
        Lampa.Activity &&
        Lampa.Activity.active
    ) {
        requestAnimationFrame(
            function () {
                var a = Lampa.Activity.active();

                attach(a);

                if (isFull(a)) {
                    startCard(a);
                }
            }
        );
    }

    settings();

    /* =========================
       STORAGE LISTENER
    ========================= */

    if (
        Lampa.Storage.listener &&
        Lampa.Storage.listener.follow
    ) {
        Lampa.Storage.listener.follow(
            'change',
            function (e) {
                if (!e || !e.name) {
                    return;
                }

                if (e.name === SIZE_SETTING) {
                    updateSize();
                } else if (e.name === SETTING) {
                    apply();
                } else if (e.name === FONT_SETTING) {
                    applyFont(e.value);
                } else if (e.name === CARD_SETTING) {
                    refreshCard(true);
                } else if (
                    e.name === QUALITY_SETTING ||
                    e.name === SCALE_SETTING
                ) {
                    refreshLogos(false);
                }
            }
        );
    }

    console.log(
        '[INTERFACE+] ' +
        VERSION +
        ' initialized'
    );
}

/* =========================
   START
========================= */

function start() {
    setTimeout(init, 500);
}

if (window.appready) {
    start();
} else if (
    window.Lampa &&
    Lampa.Listener
) {
    Lampa.Listener.follow(
        'app',
        function (e) {
            if (e.type === 'ready') {
                start();
            }
        }
    );
}

})();
