(function () {
'use strict';

/*
 * INTERFACE+ 1.7.0 PREMIUM
 * Dynamic Hero + NewCard + TMDB Logos
 * Ukrainian > English
 * Optimized cache, slideshow and logo scaling
 */

var VERSION = '1.7.0';
var READY = 'interface_plus_170_ready';

if (window[READY]) return;
window[READY] = true;

var P = 'interface_plus_';

var S = {
    hero: 'banner_hero_enabled',
    size: 'interface_size',
    font: 'fontchanger_selected',
    quality: P + 'logo_quality',
    scale: P + 'logo_scale',
    newcard: P + 'newcard_enabled',
    slide: 'cas_slideshow_enabled',
    studios: 'cas_show_studios',
    desc: 'cas_show_description',
    tag: 'cas_show_tagline',
    gap: 'cas_blocks_gap',
    meta: 'cas_meta_size'
};

var CACHE = P + 'tmdb_cache_v170';
var LIMIT = 160;
var DAY = 86400000;

var memory = {};
var pending = {};
var searchPending = {};
var generation = 0;

var card = null;
var cardToken = 0;

var heroFocusTimer = 0;
var lastFocus = '';

var slideTimer = 0;
var slideToken = 0;

var initialized = false;
var currentFont = '';
var currentSize = '';

var $ = window.jQuery || window.$;

/* =========================
   UTILITIES
========================= */

function get(k, d) {
    try {
        return Lampa.Storage.get(k, d);
    } catch (e) {
        return d;
    }
}

function set(k, v) {
    try {
        Lampa.Storage.set(k, v);
    } catch (e) {}
}

function yes(k, d) {
    var v = get(k, d);
    return v === true ||
           v === 'true' ||
           v === 1 ||
           v === '1';
}

function str(v) {
    return String(v == null ? '' : v).trim();
}

function first() {
    for (var i = 0; i < arguments.length; i++) {
        var s = str(arguments[i]);
        if (s) return s;
    }
    return '';
}

function element(x) {
    if (x && x.nodeType === 1) return x;
    if (x && x[0] && x[0].nodeType === 1) return x[0];
    return null;
}

function render(o) {
    var x = null;

    try {
        x = o &&
            o.activity &&
            o.activity.render &&
            o.activity.render(true);
    } catch (e) {}

    if (!x) {
        try {
            x = o && o.render && o.render(true);
        } catch (e) {}
    }

    return element(x);
}

function active() {
    try {
        return Lampa.Activity.active();
    } catch (e) {
        return null;
    }
}

function full(o) {
    return /^(full|full_start|fullstart)$/.test(
        str(o && o.component).toLowerCase()
    );
}

function type(d) {
    return d && (
        d.media_type === 'tv' ||
        d.type === 'tv' ||
        d.type === 'series' ||
        d.first_air_date ||
        d.number_of_seasons ||
        (d.name && !d.title)
    ) ? 'tv' : 'movie';
}

function title(d) {
    return first(
        d && d.title,
        d && d.name,
        d && d.original_title,
        d && d.original_name
    );
}

function year(d) {
    var m = first(
        d && d.release_date,
        d && d.first_air_date,
        d && d.year
    ).match(/\b(19|20)\d{2}\b/);

    return m ? m[0] : '';
}

function norm(s) {
    s = str(s).toLowerCase();

    try {
        s = s.normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '');
    } catch (e) {}

    return s
        .replace(/[^a-z0-9\u0400-\u04ff]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function id(d) {
    var v = d && (d.tmdb_id || d.tmdbId || d.id);

    if (v && typeof v === 'object') v = v.id;

    return /^\d+$/.test(str(v)) ? str(v) : '';
}

function explicit(d) {
    var v = d && (d.tmdb_id || d.tmdbId);

    if (v && typeof v === 'object') v = v.id;

    return /^\d+$/.test(str(v)) ? str(v) : '';
}

function key(d) {
    return [
        type(d),
        id(d),
        norm(title(d)),
        year(d)
    ].join('|');
}

function movie(o) {
    var a = [
        o && o.movie,
        o && o.data && o.data.movie,
        o && o.data,
        o && o.card,
        o && o.card_data,
        o && o.params && o.params.movie,
        o && o.params && o.params.data,
        o && o.activity && o.activity.movie,
        o && o.activity && o.activity.data
    ];

    var best = null;
    var score = -1;

    a.forEach(function (d) {
        if (!d || typeof d !== 'object' || !title(d)) {
            return;
        }

        var s = 10 +
            (year(d) ? 4 : 0) +
            (explicit(d) ? 5 : 0) +
            (d.id ? 2 : 0) +
            (d.overview ? 1 : 0);

        if (s > score) {
            score = s;
            best = d;
        }
    });

    return best;
}

/* =========================
   LOGO SETTINGS
========================= */

function quality() {
    var q = str(get(S.quality, 'original'));

    return /^(w300|w500|original)$/.test(q)
        ? q
        : 'original';
}

function scale() {
    var n = parseInt(get(S.scale, '100'), 10);

    return Math.max(
        70,
        Math.min(120, n || 100)
    ) / 100;
}

function url(path, size) {
    if (!path) return '';

    path = str(path);

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    path = path.replace(/\.svg$/i, '.png');

    return 'https://image.tmdb.org/t/p/' +
        (size || quality()) +
        (path.charAt(0) === '/' ? '' : '/') +
        path;
}

/* =========================
   TMDB API
========================= */

function tmdbKey() {
    try {
        return Lampa.TMDB.key();
    } catch (e) {
        return '';
    }
}

function api(path, params, cb) {
    var k = tmdbKey();

    if (!k || !$ || !$.ajax) {
        cb(null, true);
        return;
    }

    var u = 'https://api.themoviedb.org/3/' +
        path +
        '?api_key=' +
        encodeURIComponent(k);

    Object.keys(params || {}).forEach(function (x) {
        if (params[x] != null && params[x] !== '') {
            u += '&' +
                encodeURIComponent(x) +
                '=' +
                encodeURIComponent(params[x]);
        }
    });

    $.ajax({
        url: u,
        type: 'GET',
        dataType: 'json',
        timeout: 6500,

        success: function (d) {
            cb(d, false);
        },

        error: function () {
            cb(null, true);
        }
    });
}

/* =========================
   TITLE VERIFICATION
========================= */

function matches(a, b) {
    if (!a || !a.id) return false;

    var ya = year(a);
    var yb = year(b);

    if (
        ya &&
        yb &&
        Math.abs(+ya - +yb) > 1
    ) {
        return false;
    }

    var aa = [
        a.title,
        a.name,
        a.original_title,
        a.original_name
    ];

    var bb = [
        b.title,
        b.name,
        b.original_title,
        b.original_name
    ];

    return aa.some(function (x) {
        return x && bb.some(function (y) {
            return y && norm(x) === norm(y);
        });
    });
}

/* =========================
   TMDB SEARCH
========================= */

function search(d, cb) {
    var k = [
        type(d),
        norm(title(d)),
        year(d)
    ].join('|');

    if (!title(d)) {
        cb(null);
        return;
    }

    if (searchPending[k]) {
        searchPending[k].push(cb);
        return;
    }

    searchPending[k] = [cb];

    var p = {
        query: title(d),
        language: 'uk-UA',
        include_adult: 'false'
    };

    if (year(d)) {
        p[type(d) === 'tv'
            ? 'first_air_date_year'
            : 'year'] = year(d);
    }

    api('search/' + type(d), p, function (r) {
        var list = r && Array.isArray(r.results)
            ? r.results.filter(function (x) {
                return matches(x, d);
            })
            : [];

        list.sort(function (a, b) {
            return (+b.popularity || 0) -
                   (+a.popularity || 0);
        });

        var callbacks = searchPending[k] || [];

        delete searchPending[k];

        callbacks.forEach(function (fn) {
            try {
                fn(list[0] || null);
            } catch (e) {}
        });
    });
}

/* =========================
   TMDB DETAILS
========================= */

function details(d, cb) {
    var t = type(d);
    var i = id(d);

    function fetch(n, done) {
        api(t + '/' + n, {
            language: 'uk-UA',
            append_to_response: 'images',
            include_image_language: 'uk,en,null'
        }, done);
    }

    function fallback() {
        search(d, function (found) {
            if (!found) {
                cb(null, true);
                return;
            }

            fetch(found.id, cb);
        });
    }

    if (!i) {
        fallback();
        return;
    }

    fetch(i, function (r, err) {
        if (
            !err &&
            r &&
            (
                matches(r, d) ||
                (
                    explicit(d) &&
                    str(r.id) === explicit(d)
                )
            )
        ) {
            cb(r, false);
        } else {
            fallback();
        }
    });
}

/* =========================
   STRICT UK / EN LOGOS
========================= */

function pick(list) {
    if (!Array.isArray(list)) return null;

    for (var j = 0; j < 2; j++) {
        var lang = j ? 'en' : 'uk';

        var items = list.filter(function (x) {
            return x &&
                x.file_path &&
                x.iso_639_1 === lang;
        });

        items.sort(function (a, b) {
            return (
                (+b.vote_average || 0) -
                (+a.vote_average || 0)
            ) || (
                (+b.vote_count || 0) -
                (+a.vote_count || 0)
            );
        });

        if (items.length) {
            return items[0];
        }
    }

    return null;
}

/* =========================
   CACHE
========================= */

function db() {
    var d = get(CACHE, {});

    return d &&
        typeof d === 'object' &&
        !Array.isArray(d)
        ? d
        : {};
}

function valid(v) {
    return v &&
        v.time &&
        Date.now() - v.time < (
            v.failed
                ? 60000
                : v.path
                    ? DAY
                    : 3600000
        );
}

function cached(k) {
    if (valid(memory[k])) {
        return memory[k];
    }

    var d = db();
    var v = d[k];

    if (valid(v)) {
        memory[k] = v;
        return v;
    }

    return null;
}

function save(k, v) {
    memory[k] = v;

    if (v.failed) return;

    var d = db();

    d[k] = v;

    var keys = Object.keys(d);

    if (keys.length > LIMIT) {
        keys.sort(function (a, b) {
            return (d[a].time || 0) -
                   (d[b].time || 0);
        });

        keys.slice(0, keys.length - LIMIT)
            .forEach(function (x) {
                delete d[x];
            });
    }

    set(CACHE, d);
}

function packageResult(v, d) {
    return {
        src: url(v.path),
        path: v.path || '',
        title: v.title || title(d),
        backdrops: v.backdrops || [],
        overview: v.overview || d.overview || '',
        tagline: v.tagline || d.tagline || '',
        studios: v.studios || [],
        countries: v.countries || [],
        genres: v.genres || [],
        runtime: v.runtime || 0,
        year: v.year || year(d)
    };
}

/* =========================
   SHARED TMDB SERVICE
========================= */

function load(d, cb, force) {
    var k = key(d);

    if (!force) {
        var hit = cached(k);

        if (hit) {
            cb(packageResult(hit, d));
            return;
        }
    }

    if (pending[k]) {
        pending[k].push(cb);
        return;
    }

    pending[k] = [cb];

    var gen = generation;

    details(d, function (r, err) {
        if (gen !== generation) return;

        var logo = r &&
            r.images &&
            pick(r.images.logos);

        var v = {
            path: logo ? logo.file_path : '',

            title: first(
                r && (
                    type(d) === 'tv'
                        ? r.name
                        : r.title
                ),
                title(d)
            ),

            backdrops: r &&
                r.images &&
                r.images.backdrops || [],

            overview: r &&
                r.overview ||
                d.overview ||
                '',

            tagline: r &&
                r.tagline ||
                d.tagline ||
                '',

            studios: r && (
                r.networks && r.networks.length
                    ? r.networks
                    : r.production_companies
            ) || [],

            countries: r &&
                r.production_countries || [],

            genres: r &&
                r.genres || [],

            runtime: r && (
                r.runtime ||
                (
                    r.episode_run_time &&
                    r.episode_run_time[0]
                )
            ) || 0,

            year: year(r) || year(d),

            failed: !!err,
            time: Date.now()
        };

        save(k, v);

        var callbacks = pending[k] || [];

        delete pending[k];

        callbacks.forEach(function (fn) {
            try {
                fn(packageResult(v, d));
            } catch (e) {}
        });
    });
}

/* =========================
   IMAGE PRELOADING
========================= */

function preload(src, cb) {
    if (!src) {
        cb(false, null);
        return;
    }

    var im = new Image();
    var done = false;

    function finish(ok) {
        if (done) return;

        done = true;

        im.onload = null;
        im.onerror = null;

        cb(ok, im);
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

function clearCache() {
    generation++;

    memory = {};
    pending = {};
    searchPending = {};

    set(CACHE, {});

    refresh(true);

    try {
        Lampa.Noty.show('Кеш логотипів очищено');
    } catch (e) {}
}

/* =========================
   NEWCARD TEMPLATE
========================= */

var TEMPLATE = `
<div class="full-start-new left-title">

    <div class="full-start-new__body">

        <div class="full-start-new__left hide">
            <div class="full-start-new__poster">
                <img class="full-start-new__img full--poster"/>
            </div>
        </div>

        <div class="full-start-new__right">

            <div class="left-title__content">

                <div class="cas-logo-container">

                    <div class="cas-studios-row"></div>

                    <div class="cas-logo"></div>

                </div>

                <div class="cas-tagline"
                     style="display:none"></div>

                <div class="cas-meta-line">
                    <div class="cas-meta-info"></div>
                </div>

                <div class="cas-description"></div>

                <div class="cas-details-wrapper">
                    <div class="full-start-new__head hide"></div>
                    <div class="full-start-new__details hide"></div>
                </div>

                <div class="full-start-new__buttons">

                    <div class="full-start__button selector button--play">
                        <svg width="28" height="29"
                             viewBox="0 0 28 29"
                             fill="none">
                            <circle cx="14" cy="14.5" r="13"
                                    stroke="currentColor"
                                    stroke-width="2.7"/>
                            <path d="M18 13.6Q19.5 14.5 18 15.4L11.8 19Q10.2 19.8 10.2 18.1V10.9Q10.2 9.2 11.8 10Z"
                                  fill="currentColor"/>
                        </svg>
                        <span>#{title_watch}</span>
                    </div>

                    <div class="full-start__button selector button--book">
                        <svg width="21" height="32"
                             viewBox="0 0 21 32"
                             fill="none">
                            <path d="M2 1.5H19V28L10.5 22L2 28Z"
                                  stroke="currentColor"
                                  stroke-width="2.5"/>
                        </svg>
                        <span>#{settings_input_links}</span>
                    </div>

                    <div class="full-start__button selector button--reaction">
                        <svg width="38" height="34"
                             viewBox="0 0 38 34"
                             fill="none">
                            <path d="M11 2L36 12L28 29L18 33L2 26Z"
                                  stroke="currentColor"
                                  stroke-width="2.5"/>
                            <path d="M13 15L16 21L25 16"
                                  stroke="currentColor"
                                  stroke-width="2.5"/>
                        </svg>
                        <span>#{title_reactions}</span>
                    </div>

                    <div class="full-start__button selector button--subscribe hide">
                        <svg width="25" height="30"
                             viewBox="0 0 25 30"
                             fill="none">
                            <path d="M4 22L6 17V11A6.5 6.5 0 0 1 19 11V17L21 22Z"
                                  stroke="currentColor"
                                  stroke-width="2.5"/>
                            <path d="M9 25H16"
                                  stroke="currentColor"
                                  stroke-width="2.5"/>
                        </svg>
                        <span>#{title_subscribe}</span>
                    </div>

                    <div class="full-start__button selector button--options">
                        <svg width="38" height="10"
                             viewBox="0 0 38 10"
                             fill="currentColor">
                            <circle cx="5" cy="5" r="4.5"/>
                            <circle cx="19" cy="5" r="4.5"/>
                            <circle cx="33" cy="5" r="4.5"/>
                        </svg>
                    </div>

                </div>

            </div>

            <div class="full-start-new__reactions selector hide"></div>
            <div class="full-start-new__rate-line hide"></div>
            <div class="rating--modss" style="display:none"></div>

        </div>
    </div>

    <div class="hide buttons--container">

        <div class="full-start__button view--torrent hide">
            <svg viewBox="0 0 50 50"
                 width="24" height="24"
                 fill="currentColor">
                <circle cx="25" cy="25" r="22"/>
                <path d="M12 15L20 37L28 30L37 16"
                      fill="none"
                      stroke="#111"
                      stroke-width="4"/>
            </svg>
            <span>#{full_torrents}</span>
        </div>

        <div class="full-start__button selector view--trailer">
            <svg viewBox="0 0 80 70"
                 width="24" height="24"
                 fill="currentColor">
                <rect width="80" height="70" rx="12"/>
                <path d="M30 19L58 35L30 51Z"
                      fill="#111"/>
            </svg>
            <span>#{full_trailers}</span>
        </div>

    </div>

</div>`;

function template() {
    if (
        !window.Lampa ||
        !Lampa.Template ||
        !$
    ) return;

    try {
        Lampa.Template.add(
            'full_start_new',
            TEMPLATE
        );
    } catch (e) {}
}

/* =========================
   STYLES
========================= */

var CSS = `
:root {
    --cas-logo-scale: 1;
    --cas-blocks-gap: 16px;
    --cas-meta-size: 1.25em;
}

.full-start__background {
    height: calc(100% + 6em);
    left: 0 !important;
    overflow: hidden !important;
    transition: opacity .65s ease !important;
}

.full-start-new .full-start-new__head,
.full-start-new .full-start-new__details,
.full-start-new .cas-details-wrapper {
    display: none !important;
}

.full-start-new__body {
    display: flex;
    height: 85vh;
    position: relative;
    width: 100%;
}

.full-start-new__left {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 4em 3em 2em 2em;
    position: relative;
    z-index: 2;
}

.full-start-new__right {
    width: 60%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-start !important;
    text-align: left !important;
    padding: 4em 4em 2em 0;
    position: relative;
    z-index: 2;
    margin-left: 0 !important;
}

.full-start-new__poster,
.full-start-new__title {
    display: none;
}

.left-title .full-start-new__left {
    display: none !important;
}

.left-title .full-start-new__right {
    width: 100% !important;
    padding-left: 2em !important;
}

.left-title__content {
    display: flex;
    flex-direction: column;
    align-items: flex-start !important;
    text-align: left !important;
    width: 100%;
}

.cas-logo-container {
    max-width: 100%;
    margin-bottom: var(--cas-blocks-gap);
    display: flex;
    flex-direction: column;
    align-items: flex-start !important;
}

.cas-logo {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    max-width: 540px;
    min-height: 60px;
    overflow: visible;
}

.cas-logo img {
    background: transparent !important;
    border: 0 !important;
    width: auto;
    height: auto;
    max-width: 450px;
    max-height: 200px;
    object-fit: contain;
    object-position: left center;
    transform: scale(var(--cas-logo-scale));
    transform-origin: left center;
    filter: drop-shadow(
        0 3px 10px rgba(0,0,0,.45)
    );
    opacity: 0;
    transition: opacity .18s ease;
}

.cas-logo img.ready {
    opacity: 1;
}

.cas-logo .cas-text-fallback {
    font-size: 3em;
    font-weight: 800;
    line-height: 1.08;
    text-transform: uppercase;
    text-shadow: 0 2px 8px #000;
}

.cas-tagline {
    font-size: calc(var(--cas-meta-size) * .95);
    font-style: italic;
    color: rgba(255,255,255,.85);
    margin-bottom: 12px;
    text-shadow: 0 2px 4px #000;
    max-width: 700px;
    text-align: left !important;
}

.cas-meta-line {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.cas-meta-info {
    display: flex;
    align-items: center;
    justify-content: flex-start !important;
    gap: 8px;
    font-size: var(--cas-meta-size);
    color: rgba(255,255,255,.9);
    flex-wrap: wrap;
}

.full-start-new__buttons {
    display: flex !important;
    justify-content: flex-start !important;
    align-items: center !important;
    flex-wrap: wrap;
    width: 100%;
    margin-left: 0 !important;
    margin-top: 10px !important;
}

.cas-studios-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start !important;
    gap: 8px;
    margin-bottom: 10px;
    min-height: 24px;
}

.cas-studio-item {
    height: 28px !important;
    display: flex;
    align-items: center;
    justify-content: flex-start;
}

.cas-studio-item img {
    height: 100%;
    width: auto;
    max-width: 160px;
    object-fit: contain;
    filter: drop-shadow(
        0 2px 4px rgba(0,0,0,.8)
    );
    opacity: .95;
}

.cas-description {
    font-size: var(--cas-meta-size) !important;
    line-height: 1.4;
    color: rgba(255,255,255,.8);
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    max-width: 750px;
    margin-top: 6px;
    margin-bottom: 14px;
    text-align: left !important;
}

.left-title .full-start-new__body {
    height: 85vh;
}

/* HERO */

.banner-host {
    position: relative;
}

.banner-enabled .banner-host .activity__body {
    padding-top: 42vh !important;
    box-sizing: border-box;
}

.banner-hero {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50vh;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
    -webkit-mask-image:
        linear-gradient(
            180deg,
            #000 55%,
            transparent 100%
        );
    mask-image:
        linear-gradient(
            180deg,
            #000 55%,
            transparent 100%
        );
}

.banner-hero__bg {
    position: absolute;
    inset: 0;
    background-position: center 20%;
    background-repeat: no-repeat;
    background-size: cover;
    opacity: 0;
    transition: opacity .25s ease;
}

.banner-hero__bg.show {
    opacity: 1;
}

.banner-hero:after {
    content: "";
    position: absolute;
    inset: 0;
    background:
        linear-gradient(
            90deg,
            rgba(0,0,0,.85),
            rgba(0,0,0,.55) 40%,
            transparent 75%
        );
}

.banner-hero__info {
    position: absolute;
    left: 3em;
    bottom: 5.5em;
    width: 46%;
    z-index: 2;
}

.banner-hero__logo {
    display: none;
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 7em;
    object-fit: contain;
    object-position: left center;
    opacity: 0;
    transition: opacity .15s ease;
    filter: drop-shadow(
        0 4px 12px rgba(0,0,0,.6)
    );
}

.banner-hero__logo.ready {
    opacity: 1;
}

.banner-hero__title {
    font-size: 2.8em;
    font-weight: 900;
    line-height: 1.05;
    color: #f5f5f1;
    margin-bottom: .35em;
    text-shadow:
        0 3px 14px rgba(0,0,0,.7);
}

.banner-hero__meta {
    font-size: 1.15em;
    color: #f5f5f1;
    margin-bottom: .6em;
    display: flex;
    gap: .8em;
    align-items: center;
    flex-wrap: wrap;
}

.banner-hero__rate {
    padding: .1em .5em;
    border-radius: 6px;
    font-weight: 800;
    background: #1db954;
    color: #fff;
}

.banner-hero__descr {
    font-size: 1.1em;
    line-height: 1.45;
    color: #f5f5f1;
    opacity: .85;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* STANDARD CARD */

.interface-plus-logo-title {
    position: relative;
}

.interface-plus-card-logo {
    display: block;
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 105px;
    object-fit: contain;
    object-position: left center;
    opacity: 0;
    transition: opacity .15s ease;
    filter: drop-shadow(
        0 3px 10px rgba(0,0,0,.45)
    );
}

.interface-plus-card-logo.ready {
    opacity: 1;
}

.interface-plus-logo-title.interface-plus-logo-active {
    font-size: 0 !important;
    line-height: 0 !important;
}

.interface-plus-logo-title.interface-plus-logo-active
> .interface-plus-original-title {
    display: none !important;
}

.interface-plus-logo-title.interface-plus-logo-active
> .interface-plus-card-logo {
    font-size: initial;
    line-height: normal;
}

@media(max-width:480px) {
    .interface-plus-card-logo {
        max-height: 75px;
    }

    .banner-hero__info {
        left: 1.5em;
        width: 75%;
    }

    .banner-hero__logo {
        max-height: 5em;
    }

    .cas-logo img {
        max-width: 75vw;
        max-height: 140px;
    }
}
`;

function styles() {
    var el = document.getElementById(
        'interface-plus-tmdb-only-style'
    );

    if (!el) {
        el = document.createElement('style');
        el.id = 'interface-plus-tmdb-only-style';
        document.head.appendChild(el);
    }

    el.textContent = CSS;
}

/* =========================
   SMART LOGO NORMALIZATION
========================= */

function normalizeLogo(img) {
    if (!img || !img.naturalWidth) return;

    var r = img.naturalWidth / img.naturalHeight;

    var factor = r < .8
        ? 1.22
        : r < 1.5
            ? 1.12
            : r > 4.5
                ? .90
                : 1;

    img.style.transform =
        'scale(' +
        (scale() * factor).toFixed(3) +
        ')';
}

/* =========================
   SLIDESHOW
========================= */

function stopSlide() {
    slideToken++;

    if (slideTimer) {
        clearTimeout(slideTimer);
        slideTimer = 0;
    }

    if (window.casBgInterval) {
        clearInterval(window.casBgInterval);
        window.casBgInterval = null;
    }
}

function startSlide(root, backs) {
    stopSlide();

    if (
        !yes(S.slide, true) ||
        !backs ||
        backs.length < 2 ||
        !root ||
        !root.isConnected
    ) return;

    var selected = backs.filter(function (x) {
        return x &&
            x.file_path &&
            (
                !x.iso_639_1 ||
                x.iso_639_1 === 'xx' ||
                x.iso_639_1 === 'null'
            );
    });

    if (selected.length < 3) {
        selected = selected.concat(
            backs.filter(function (x) {
                return x &&
                    x.file_path &&
                    x.iso_639_1 === 'uk';
            })
        );
    }

    if (selected.length < 3) {
        selected = selected.concat(
            backs.filter(function (x) {
                return x &&
                    x.file_path &&
                    x.iso_639_1 === 'en';
            })
        );
    }

    selected = selected.slice(0, 15);

    if (selected.length < 2) return;

    var token = slideToken;
    var idx = 0;

    function next() {
        if (
            token !== slideToken ||
            !root.isConnected
        ) return;

        idx = (idx + 1) % selected.length;

        var src = url(
            selected[idx].file_path,
            'w1280'
        );

        preload(src, function (ok) {
            if (
                token !== slideToken ||
                !root.isConnected
            ) return;

            if (ok) {
                var image = root.querySelector(
                    '.full-start__background img, ' +
                    'img.full-start__background'
                );

                if (image) {
                    var holder = image.closest(
                        '.full-start__background'
                    ) || image;

                    holder.style.opacity = '0';

                    setTimeout(function () {
                        if (
                            token !== slideToken ||
                            !root.isConnected
                        ) return;

                        image.src = src;
                        holder.style.opacity = '.35';
                    }, 320);
                }
            }

            slideTimer = setTimeout(
                next,
                15000
            );
        });
    }

    slideTimer = setTimeout(
        next,
        15000
    );
}

/* =========================
   NEWCARD VARIABLES
========================= */

function applyVariables() {
    var r = document.documentElement;

    r.style.setProperty(
        '--cas-logo-scale',
        scale()
    );

    r.style.setProperty(
        '--cas-blocks-gap',
        Math.max(
            0,
            Math.min(
                60,
                parseInt(get(S.gap, '20'), 10) || 20
            )
        ) + 'px'
    );

    var m = parseFloat(
        get(S.meta, '1.3')
    ) || 1.3;

    r.style.setProperty(
        '--cas-meta-size',
        Math.max(
            .7,
            Math.min(2, m)
        ) + 'em'
    );
}

function putText(el, s) {
    if (el) el.textContent = s || '';
}

/* =========================
   NEWCARD FALLBACK
========================= */

function fallbackLogo(root, d) {
    var box = root.querySelector('.cas-logo');

    if (!box) return;

    box.textContent = '';

    var div = document.createElement('div');

    div.className = 'cas-text-fallback';
    div.textContent = title(d);

    box.appendChild(div);
}

/* =========================
   STUDIO LOGOS
========================= */

function studio(root, list) {
    var box = root.querySelector(
        '.cas-studios-row'
    );

    if (!box) return;

    box.textContent = '';

    if (!yes(S.studios, true)) {
        box.style.display = 'none';
        return;
    }

    var item = (list || []).filter(function (x) {
        return x && x.logo_path;
    })[0];

    if (!item) {
        box.style.display = 'none';
        return;
    }

    box.style.display = 'flex';

    var wrap = document.createElement('div');
    var im = document.createElement('img');

    wrap.className = 'cas-studio-item';

    im.src = url(item.logo_path, 'w200');
    im.alt = str(item.name);

    wrap.appendChild(im);
    box.appendChild(wrap);
}

/* =========================
   NEWCARD DETAILS
========================= */

function detailsCard(root, d, r) {
    var desc = root.querySelector(
        '.cas-description'
    );

    var tag = root.querySelector(
        '.cas-tagline'
    );

    var meta = root.querySelector(
        '.cas-meta-info'
    );

    if (desc) {
        putText(
            desc,
            r.overview || d.overview
        );

        desc.style.display =
            yes(S.desc, true) && desc.textContent
                ? '-webkit-box'
                : 'none';
    }

    if (tag) {
        putText(
            tag,
            r.tagline
                ? '«' + r.tagline + '»'
                : ''
        );

        tag.style.display =
            yes(S.tag, true) && tag.textContent
                ? 'block'
                : 'none';
    }

    if (meta) {
        meta.textContent = '';

        var parts = [];

        var y = r.year || year(d);

        var country =
            r.countries &&
            r.countries[0] &&
            r.countries[0].name;

        var m = r.runtime;

        var genres = (r.genres || [])
            .map(function (x) {
                return x.name;
            })
            .filter(Boolean)
            .join(', ');

        if (y) parts.push(y);

        if (country) {
            parts.push(country);
        }

        if (m) {
            parts.push(
                (
                    Math.floor(m / 60)
                        ? Math.floor(m / 60) + 'г '
                        : ''
                ) +
                (m % 60) +
                'хв'
            );
        }

        if (genres) {
            parts.push(genres);
        }

        parts.forEach(function (p, i) {
            if (i) {
                var dot = document.createElement(
                    'span'
                );

                dot.textContent = '•';
                meta.appendChild(dot);
            }

            var span = document.createElement(
                'span'
            );

            span.textContent = p;
            meta.appendChild(span);
        });
    }

    studio(root, r.studios);
}

/* =========================
   APPLY NEWCARD
========================= */

function applyNewCard(root, d, r, token) {
    if (
        token !== cardToken ||
        !root.isConnected ||
        !yes(S.newcard, true)
    ) return;

    applyVariables();
    detailsCard(root, d, r);

    var box = root.querySelector('.cas-logo');

    if (box) {
        if (!r.src) {
            fallbackLogo(root, d);
        } else {
            var old = box.querySelector('img');

            if (
                old &&
                old.getAttribute('src') === r.src
            ) {
                normalizeLogo(old);
            } else {
                preload(r.src, function (ok, img) {
                    if (
                        token !== cardToken ||
                        !root.isConnected
                    ) return;

                    if (!ok) {
                        fallbackLogo(root, d);
                        return;
                    }

                    box.textContent = '';

                    var el = document.createElement(
                        'img'
                    );

                    el.src = r.src;
                    el.alt = title(d);
                    el.draggable = false;

                    box.appendChild(el);

                    normalizeLogo(img);

                    el.style.transform =
                        img.style.transform;

                    requestAnimationFrame(function () {
                        if (token === cardToken) {
                            el.classList.add('ready');
                        }
                    });
                });
            }
        }
    }

    if (yes(S.slide, true)) {
        startSlide(root, r.backdrops);
    } else {
        stopSlide();
    }
}

/* =========================
   STANDARD CARD
========================= */

var TITLE_SELECTOR = [
    '.full-start__title',
    '.full-start-new__title',
    '.full__title',
    '.full-card__title'
].join(',');

function restore(root) {
    if (!root) return;

    var list = root.querySelectorAll(
        '.interface-plus-logo-title'
    );

    Array.prototype.forEach.call(
        list,
        function (t) {
            var logo = t.querySelector(
                '.interface-plus-card-logo'
            );

            if (logo) logo.remove();

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
        }
    );
}

function prepare(t) {
    var img = t.querySelector(
        '.interface-plus-card-logo'
    );

    if (img) return img;

    t.classList.add(
        'interface-plus-logo-title'
    );

    var span = document.createElement('span');

    span.className =
        'interface-plus-original-title';

    while (t.firstChild) {
        span.appendChild(t.firstChild);
    }

    t.appendChild(span);

    img = document.createElement('img');

    img.className =
        'interface-plus-card-logo';

    img.alt = '';

    t.appendChild(img);

    return img;
}

function stopCard(restoreOld) {
    cardToken++;

    stopSlide();

    if (card && card.observer) {
        card.observer.disconnect();
    }

    if (restoreOld && card) {
        restore(card.root);
    }

    card = null;
}

/* =========================
   CARD ROUTER
========================= */

function startCard(o, override, force) {
    if (!full(o)) return;

    var d = override || movie(o);
    var root = render(o);

    if (!d || !root) return;

    var k = key(d);

    if (
        !force &&
        card &&
        card.root === root &&
        card.key === k
    ) return;

    stopCard(false);

    var token = cardToken;

    card = {
        root: root,
        key: k,
        data: d,
        observer: null,
        result: null
    };

    if (yes(S.newcard, true)) {
        template();

        if (root.querySelector('.cas-logo')) {
            fallbackLogo(root, d);

            var hit = !force && cached(k);

            if (hit) {
                applyNewCard(
                    root,
                    d,
                    packageResult(hit, d),
                    token
                );
            }

            load(
                d,
                function (r) {
                    if (token !== cardToken) return;

                    card.result = r;

                    applyNewCard(
                        root,
                        d,
                        r,
                        token
                    );
                },
                !!force
            );

            return;
        }
    }

    var t = root.querySelector(
        TITLE_SELECTOR
    );

    if (!t) return;

    function show(r) {
        if (
            token !== cardToken ||
            !root.isConnected ||
            !r.src
        ) return;

        var target = root.querySelector(
            TITLE_SELECTOR
        );

        if (!target) return;

        preload(r.src, function (ok, im) {
            if (
                !ok ||
                token !== cardToken
            ) return;

            var el = prepare(target);

            el.src = r.src;

            normalizeLogo(im);

            el.style.transform =
                im.style.transform;

            el.classList.add('ready');

            target.classList.add(
                'interface-plus-logo-active'
            );
        });
    }

    var hit = !force && cached(k);

    if (hit && hit.path) {
        show(packageResult(hit, d));
    }

    load(
        d,
        function (r) {
            if (token !== cardToken) return;

            card.result = r;

            show(r);
        },
        !!force
    );

    if (window.MutationObserver) {
        var observer = new MutationObserver(
            function () {
                if (token !== cardToken) return;

                if (
                    card &&
                    card.result &&
                    card.result.src
                ) {
                    var target = root.querySelector(
                        TITLE_SELECTOR
                    );

                    if (
                        target &&
                        !target.querySelector(
                            '.interface-plus-card-logo'
                        )
                    ) {
                        show(card.result);
                    }
                }
            }
        );

        observer.observe(root, {
            childList: true,
            subtree: true
        });

        card.observer = observer;
    }
}

function refresh(force) {
    lastFocus = '';

    var a = active();

    if (full(a)) {
        stopCard(true);
        startCard(a, null, !!force);
    }
}

/* =========================
   HERO CREATION
========================= */

function createHero(root) {
    if (
        root.__interfacePlusHero &&
        root.contains(root.__interfacePlusHero)
    ) {
        return root.__interfacePlusHero;
    }

    var el = document.createElement('div');

    el.className = 'banner-hero';

    el.innerHTML =
        '<div class="banner-hero__bg"></div>' +
        '<div class="banner-hero__info">' +
        '<img class="banner-hero__logo" alt=""/>' +
        '<div class="banner-hero__title"></div>' +
        '<div class="banner-hero__meta"></div>' +
        '<div class="banner-hero__descr"></div>' +
        '</div>';

    root.insertBefore(
        el,
        root.firstChild
    );

    root.classList.add('banner-host');

    el.parts = {
        bg: el.querySelector(
            '.banner-hero__bg'
        ),
        logo: el.querySelector(
            '.banner-hero__logo'
        ),
        title: el.querySelector(
            '.banner-hero__title'
        ),
        meta: el.querySelector(
            '.banner-hero__meta'
        ),
        desc: el.querySelector(
            '.banner-hero__descr'
        )
    };

    el.token = 0;

    root.__interfacePlusHero = el;

    return el;
}

/* =========================
   HERO RENDER
========================= */

function hero(root, d) {
    if (!root || !d) return;

    var h = root.__interfacePlusHero ||
        createHero(root);

    var k = key(d);

    if (h.movieKey === k) return;

    h.movieKey = k;

    var token = ++h.token;
    var p = h.parts;

    p.logo.classList.remove('ready');
    p.logo.style.display = 'none';

    p.title.style.display = '';

    putText(p.title, title(d));
    putText(p.desc, d.overview);

    p.meta.textContent = '';

    var arr = [];

    if (+d.vote_average) {
        arr.push(
            (+d.vote_average).toFixed(1)
        );
    }

    if (year(d)) {
        arr.push(year(d));
    }

    arr.push(
        type(d) === 'tv'
            ? 'Серіал'
            : 'Фільм'
    );

    arr.forEach(function (x, i) {
        var s = document.createElement('span');

        s.textContent = x;

        if (i === 0 && +d.vote_average) {
            s.className = 'banner-hero__rate';
        }

        p.meta.appendChild(s);
    });

    p.bg.classList.remove('show');

    if (d.backdrop_path) {
        var bg = url(
            d.backdrop_path,
            'w1280'
        );

        preload(bg, function (ok) {
            if (
                ok &&
                h.token === token
            ) {
                p.bg.style.backgroundImage =
                    'url("' + bg + '")';

                p.bg.classList.add('show');
            }
        });
    }

    function show(r) {
        if (h.token !== token) return;

        if (r.title) {
            putText(p.title, r.title);
        }

        if (r.overview) {
            putText(p.desc, r.overview);
        }

        if (!r.src) return;

        preload(r.src, function (ok, im) {
            if (
                h.token !== token ||
                !ok
            ) return;

            p.logo.src = r.src;
            p.logo.style.display = 'block';

            normalizeLogo(im);

            p.logo.style.transform =
                im.style.transform;

            requestAnimationFrame(function () {
                if (h.token !== token) return;

                p.logo.classList.add('ready');
                p.title.style.display = 'none';
            });
        });
    }

    var hit = cached(k);

    if (hit) {
        show(packageResult(hit, d));
        return;
    }

    load(d, show, false);
}

function attach(o) {
    if (!yes(S.hero, true) || !o) return;

    var c = str(
        o.component
    ).toLowerCase();

    if (
        c !== 'main' &&
        c !== 'category'
    ) return;

    var r = render(o);

    if (r) createHero(r);
}

function focus(e) {
    if (!yes(S.hero, true)) return;

    var t = e.target;

    var item = t &&
        t.closest &&
        t.closest('.card');

    if (!item || !item.card_data) return;

    var root = item.closest('.activity');

    if (
        !root ||
        !root.__interfacePlusHero
    ) return;

    var d = item.card_data;
    var k = key(d);

    if (
        lastFocus === k &&
        root.__interfacePlusHero.movieKey === k
    ) return;

    clearTimeout(heroFocusTimer);

    heroFocusTimer = setTimeout(
        function () {
            if (
                !yes(S.hero, true) ||
                !item.isConnected
            ) return;

            lastFocus = k;

            hero(root, d);
        },
        80
    );
}

function applyHero() {
    var on = yes(S.hero, true);

    document.body.classList.toggle(
        'banner-enabled',
        on
    );

    if (!on) {
        clearTimeout(heroFocusTimer);
        lastFocus = '';
    } else {
        attach(active());
    }
}

/* =========================
   FONTS
========================= */

var FONTS = {
    default: {
        family: 'Roboto,Arial,sans-serif'
    },

    netflix: {
        family: '"Netflix Sans",Arial,sans-serif',
        url: 'https://assets.nflxext.com/ffe/siteui/fonts/netflix-sans/v3/NetflixSans_W_Rg.woff2'
    },

    montserrat: {
        family: '"Montserrat",sans-serif',
        url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap'
    },

    inter: {
        family: '"Inter",sans-serif',
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    },

    nunito: {
        family: '"Nunito",sans-serif',
        url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap'
    }
};

function font() {
    var n = str(
        get(S.font, 'default')
    );

    if (n === currentFont) return;

    currentFont = n;

    [
        'interface-plus-font-style',
        'interface-plus-font-face'
    ].forEach(function (id) {
        var e = document.getElementById(id);

        if (e) e.remove();
    });

    var f = FONTS[n] || FONTS.default;

    if (f.url) {
        var face = document.createElement(
            'style'
        );

        face.id = 'interface-plus-font-face';

        face.textContent =
            f.url.indexOf('googleapis.com') !== -1
                ? '@import url("' + f.url + '");'
                : '@font-face{' +
                  'font-family:"Netflix Sans";' +
                  'src:url("' + f.url + '") format("woff2");' +
                  'font-weight:400}';

        document.head.appendChild(face);
    }

    var style = document.createElement(
        'style'
    );

    style.id = 'interface-plus-font-style';

    style.textContent =
        'body,.body,*{' +
        'font-family:' +
        f.family +
        '!important}';

    document.head.appendChild(style);
}

/* =========================
   INTERFACE SIZE
========================= */

function patch(count) {
    if (
        !Lampa.Maker ||
        !Lampa.Maker.map
    ) return;

    ['Line', 'Category'].forEach(function (t) {
        var m = Lampa.Maker.map(t);

        if (
            !m ||
            !m.Items ||
            !m.Items.onInit
        ) return;

        if (m.Items.__interfacePlusPatched) {
            m.Items.__interfacePlusCount = count;
            return;
        }

        var original = m.Items.onInit;

        m.Items.onInit = function () {
            original.apply(this, arguments);

            var n =
                m.Items.__interfacePlusCount ||
                count;

            if (t === 'Line') {
                this.view = n;
            } else {
                this.limit_view = n;
            }
        };

        m.Items.__interfacePlusPatched = true;
        m.Items.__interfacePlusCount = count;
    });
}

function size() {
    var v = parseFloat(
        get(S.size, '10.6')
    ) || 10.6;

    var mobile = false;

    try {
        mobile = !!(
            Lampa.Platform &&
            Lampa.Platform.screen &&
            Lampa.Platform.screen('mobile')
        );
    } catch (e) {}

    if (mobile) v = 10.1;

    if (String(v) === currentSize) return;

    currentSize = String(v);

    document.body.style.fontSize =
        v + 'px';

    patch(
        v <= 9.6
            ? 8
            : v <= 11.1
                ? 7
                : 6
    );
}

/* =========================
   SETTINGS
========================= */

function settings() {
    if (!Lampa.SettingsApi) return;

    var api = Lampa.SettingsApi;

    api.addComponent({
        component: 'interface_plus_settings',
        name: 'Інтерфейс +',
        icon:
            '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">' +
            '<path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 5h2v5h-2z"/>' +
            '</svg>'
    });

    function add(k, t, d, n, desc, values, change) {
        api.addParam({
            component: 'interface_plus_settings',

            param: {
                name: k,
                type: t,
                default: d,
                values: values
            },

            field: {
                name: n,
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
        'Банери на головній сторінці',
        null,
        applyHero
    );

    add(
        S.newcard,
        'trigger',
        true,
        'Сучасна картка (NewCard)',
        'Увімкнути нову картку',
        null,
        function () {
            refresh(false);
        }
    );

    add(
        S.slide,
        'trigger',
        true,
        'Слайд-шоу фону',
        'Плавна зміна кадрів',
        null,
        function () {
            refresh(false);
        }
    );

    add(
        S.studios,
        'trigger',
        true,
        'Показувати студії',
        'Логотипи студій',
        null,
        function () {
            refresh(false);
        }
    );

    add(
        S.desc,
        'trigger',
        true,
        'Опис фільму',
        'Показувати анотацію',
        null,
        function () {
            refresh(false);
        }
    );

    add(
        S.tag,
        'trigger',
        true,
        'Показувати слоган',
        'Слоган фільму',
        null,
        function () {
            refresh(false);
        }
    );

    add(
        S.quality,
        'select',
        'original',
        'Якість логотипів TMDB',
        'Роздільна здатність',
        {
            w300: '300px',
            w500: '500px',
            original: 'Original'
        },
        function () {
            refresh(false);
        }
    );

    add(
        S.scale,
        'select',
        '100',
        'Розмір логотипів',
        'Масштаб',
        {
            '70': '70%',
            '80': '80%',
            '90': '90%',
            '100': '100%',
            '110': '110%',
            '120': '120%'
        },
        function () {
            applyVariables();
            refresh(false);
        }
    );

    add(
        'interface_plus_clear_logo_cache',
        'button',
        '',
        'Очистити кеш',
        'Повторно отримати дані TMDB',
        null,
        clearCache
    );

    add(
        S.size,
        'select',
        '10.6',
        'Розмір інтерфейсу',
        'Масштаб',
        {
            '09.1': 'Міні',
            '09.6': 'Дуже малий',
            '10.1': 'Малий',
            '10.6': 'Середній'
        },
        size
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
        font
    );
}

/* =========================
   LISTENERS
========================= */

function listeners() {
    document.addEventListener(
        'hover:focus',
        focus,
        true
    );

    if (Lampa.Listener) {
        Lampa.Listener.follow(
            'activity',
            function (e) {
                if (!e) return;

                if (e.type === 'start') {
                    requestAnimationFrame(
                        function () {
                            attach(e.object);

                            if (full(e.object)) {
                                startCard(e.object);
                            } else {
                                stopCard(false);
                            }
                        }
                    );
                }

                if (
                    e.type === 'destroy' &&
                    full(e.object)
                ) {
                    stopCard(false);
                }
            }
        );

        Lampa.Listener.follow(
            'full',
            function (e) {
                if (
                    !e ||
                    (
                        e.type !== 'complete' &&
                        e.type !== 'complite'
                    )
                ) return;

                var d =
                    e.data &&
                    e.data.movie;

                requestAnimationFrame(
                    function () {
                        var a = active();

                        if (full(a)) {
                            startCard(
                                a,
                                d || null,
                                true
                            );
                        }
                    }
                );
            }
        );
    }

    try {
        if (
            Lampa.Storage.listener &&
            Lampa.Storage.listener.follow
        ) {
            Lampa.Storage.listener.follow(
                'change',
                function (e) {
                    if (!e || !e.name) return;

                    var n = e.name;

                    if (n === S.hero) {
                        applyHero();
                    } else if (n === S.font) {
                        currentFont = '';
                        font();
                    } else if (n === S.size) {
                        currentSize = '';
                        size();
                    } else if (
                        n === S.newcard ||
                        n === S.quality ||
                        n === S.scale ||
                        n.indexOf('cas_') === 0
                    ) {
                        refresh(false);
                    }
                }
            );
        }
    } catch (e) {}
}

/* =========================
   INITIALIZATION
========================= */

function init() {
    if (
        initialized ||
        !window.Lampa ||
        !Lampa.Storage
    ) return;

    initialized = true;

    template();
    styles();
    applyVariables();

    font();
    size();
    applyHero();

    settings();
    listeners();

    requestAnimationFrame(function () {
        var a = active();

        attach(a);

        if (full(a)) {
            startCard(a);
        }
    });

    try {
        console.log(
            '[INTERFACE+ ' +
            VERSION +
            '] initialized'
        );
    } catch (e) {}
}

/* =========================
   START
========================= */

if (window.appready) {
    setTimeout(init, 150);
} else if (
    window.Lampa &&
    Lampa.Listener
) {
    Lampa.Listener.follow(
        'app',
        function (e) {
            if (e.type === 'ready') {
                setTimeout(init, 150);
            }
        }
    );
}

})();
