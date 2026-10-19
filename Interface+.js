(function () {
'use strict';

/*
 * INTERFACE+ 1.6.2 — CLEAN & FIXED NEWCARD
 * Dynamic hero banners + Studios, Tagline, Description + TMDB logos
 * Ukrainian > English > Ukrainian text
 */

var VERSION = '1.6.2';
var READY_KEY = 'interface_plus_tmdb_only_162';

if (window[READY_KEY]) return;
window[READY_KEY] = true;

var P = 'interface_plus_';

var S = {
    hero: 'banner_hero_enabled',
    size: 'interface_size',
    font: 'fontchanger_selected',
    quality: P + 'logo_quality',
    scale: P + 'logo_scale',
    newcard: P + 'newcard_enabled',
    casSlideshow: 'cas_slideshow_enabled',
    casStudios: 'cas_show_studios',
    casDesc: 'cas_show_description',
    casTagline: 'cas_show_tagline',
    casGap: 'cas_blocks_gap',
    casMetaSize: 'cas_meta_size'
};

var CACHE_KEY = P + 'tmdb_only_cache_v162';
var CACHE_LIMIT = 200;

var TTL_LOGO = 24 * 60 * 60 * 1000;
var TTL_EMPTY = 60 * 60 * 1000;
var TTL_ERROR = 60 * 1000;

var memoryCache = {};
var pending = {};
var searchPending = {};
var generation = 0;

var initialized = false;
var focusTimer = null;
var activeHero = null;
var activeCard = null;
var activeCardToken = 0;
var lastFocusKey = '';

var currentFont = '';
var currentSize = '';
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
            ['[INTERFACE+ ' + VERSION + ']'].concat(
                Array.prototype.slice.call(arguments)
            )
        );
    } catch (e) {}
}

function storageGet(key, fallback) {
    try {
        return Lampa.Storage.get(key, fallback);
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
        if (o && o.activity && o.activity.render) r = o.activity.render(true);
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

function titleMatches(a, b) {
    var x = normalizeTitle(a);
    var y = normalizeTitle(b);
    if (!x || !y) return false;
    return x === y;
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
   SETTINGS
========================= */

function heroEnabled() {
    return enabled(S.hero, true);
}

function newCardEnabled() {
    return enabled(S.newcard, true);
}

function logoQuality() {
    var q = text(storageGet(S.quality, 'original'));
    return /^(w300|w500|original)$/.test(q) ? q : 'original';
}

function logoScale() {
    var v = parseInt(storageGet(S.scale, '100'), 10);
    if (!v || isNaN(v)) v = 100;
    return Math.max(70, Math.min(120, v)) / 100;
}

/* =========================
   CACHE
========================= */

function readCache() {
    var db = storageGet(CACHE_KEY, {});
    return db && typeof db === 'object' ? db : {};
}

function cacheTTL(v) {
    if (v && v.failed) return TTL_ERROR;
    if (v && v.path) return TTL_LOGO;
    return TTL_EMPTY;
}

function validCache(v) {
    return !!(v && v.time && Date.now() - v.time < cacheTTL(v));
}

function cached(key) {
    if (memoryCache[key] && validCache(memoryCache[key])) {
        return memoryCache[key];
    }
    var db = readCache();
    if (validCache(db[key])) {
        memoryCache[key] = db[key];
        return db[key];
    }
    return null;
}

function saveCache(key, value) {
    memoryCache[key] = value;
    if (value.failed) return;

    var db = readCache();
    db[key] = value;

    var keys = Object.keys(db);
    if (keys.length > CACHE_LIMIT) {
        keys.sort(function (a, b) {
            return (db[a].time || 0) - (db[b].time || 0);
        });
        keys.slice(0, keys.length - CACHE_LIMIT).forEach(function (k) {
            delete db[k];
        });
    }

    storageSet(CACHE_KEY, db);
}

function clearCache() {
    generation++;
    memoryCache = {};
    pending = {};
    searchPending = {};
    storageSet(CACHE_KEY, {});
    refreshAll(true);

    try {
        Lampa.Noty.show('Кеш логотипів очищено');
    } catch (e) {}
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

function apiURL(path, params) {
    var url = 'https://api.themoviedb.org/3/' + path + '?api_key=' + encodeURIComponent(tmdbKey());
    Object.keys(params || {}).forEach(function (k) {
        var v = params[k];
        if (v !== undefined && v !== null && v !== '') {
            url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(v);
        }
    });
    return url;
}

function apiGet(path, params, callback) {
    if (!tmdbKey() || typeof $ === 'undefined') {
        callback(null, true);
        return;
    }

    $.ajax({
        url: apiURL(path, params),
        type: 'GET',
        dataType: 'json',
        timeout: 6000,
        success: function (data) { callback(data, false); },
        error: function () { callback(null, true); }
    });
}

function numericId(v) {
    var s = text(v);
    return /^\d+$/.test(s) ? s : '';
}

function explicitTMDBId(d) {
    if (!d) return '';
    var id = d.tmdb_id || d.tmdbId || '';
    if (id && typeof id === 'object') id = id.id;
    return numericId(id);
}

function possibleTMDBId(d) {
    if (!d) return '';
    return explicitTMDBId(d) || numericId(d.id);
}

/* =========================
   TMDB TITLE VERIFICATION
========================= */

function matchesDetails(details, d) {
    if (!details || !details.id) return false;
    var expectedYear = movieYear(d);
    var actualYear = movieYear(details);

    if (expectedYear && actualYear && Math.abs(parseInt(expectedYear, 10) - parseInt(actualYear, 10)) > 1) {
        return false;
    }

    var expected = [d.title, d.name, d.original_title, d.original_name].filter(Boolean);
    var actual = [details.title, details.name, details.original_title, details.original_name].filter(Boolean);

    for (var i = 0; i < expected.length; i++) {
        for (var j = 0; j < actual.length; j++) {
            if (titleMatches(expected[i], actual[j])) return true;
        }
    }
    return false;
}

/* =========================
   TMDB SEARCH
========================= */

function searchMovie(d, callback) {
    var type = movieType(d);
    var name = movieTitle(d);
    var year = movieYear(d);

    if (!name) {
        callback(null);
        return;
    }

    var searchKey = [type, normalizeTitle(name), year].join('|');

    if (searchPending[searchKey]) {
        searchPending[searchKey].push(callback);
        return;
    }

    searchPending[searchKey] = [callback];

    function finish(result) {
        var callbacks = searchPending[searchKey] || [];
        delete searchPending[searchKey];
        callbacks.forEach(function (fn) {
            try { fn(result); } catch (e) {}
        });
    }

    var params = { query: name, language: 'uk-UA', include_adult: 'false' };
    if (year) params[type === 'tv' ? 'first_air_date_year' : 'year'] = year;

    apiGet('search/' + type, params, function (json, failed) {
        if (failed || !json || !Array.isArray(json.results)) {
            finish(null);
            return;
        }

        var list = json.results.filter(function (item) { return matchesDetails(item, d); });
        if (!list.length) {
            finish(null);
            return;
        }

        list.sort(function (a, b) { return (Number(b.popularity) || 0) - (Number(a.popularity) || 0); });
        finish(list[0]);
    });
}

/* =========================
   STRICT LOGO PICKER
========================= */

function chooseLogo(list) {
    if (!Array.isArray(list)) return null;

    var languages = ['uk', 'en'];
    for (var i = 0; i < languages.length; i++) {
        var lang = languages[i];
        var candidates = list.filter(function (x) { return x && x.file_path && x.iso_639_1 === lang; });

        if (!candidates.length) continue;

        candidates.sort(function (a, b) {
            var av = Number(a.vote_average) || 0;
            var bv = Number(b.vote_average) || 0;
            if (bv !== av) return bv - av;
            return (Number(b.vote_count) || 0) - (Number(a.vote_count) || 0);
        });

        return candidates[0];
    }
    return null;
}

function imageURL(path, size) {
    if (!path) return '';
    var p = text(path);
    if (/\.svg$/i.test(p)) p = p.replace(/\.svg$/i, '.png');
    return 'https://image.tmdb.org/t/p/' + (size || logoQuality()) + (p.charAt(0) === '/' ? '' : '/') + p;
}

function preload(url, callback) {
    if (!url) {
        callback(false);
        return;
    }
    try {
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

        if (img.complete && img.naturalWidth) {
            done(true);
        }
    } catch (e) {
        callback(false);
    }
}

/* =========================
   FETCH DETAILS
========================= */

function requestDetails(type, id, callback) {
    apiGet(type + '/' + id, {
        language: 'uk-UA',
        append_to_response: 'images',
        include_image_language: 'uk,en,null'
    }, callback);
}

function resolveTMDB(d, callback) {
    var type = movieType(d);
    var id = possibleTMDBId(d);
    var explicit = explicitTMDBId(d);

    if (!id) {
        searchMovie(d, function (result) {
            if (!result) {
                callback(null, true);
                return;
            }
            requestDetails(type, result.id, callback);
        });
        return;
    }

    requestDetails(type, id, function (details, failed) {
        if (!failed && details && (matchesDetails(details, d) || (explicit && String(details.id) === explicit))) {
            callback(details, false);
            return;
        }

        searchMovie(d, function (result) {
            if (!result) {
                callback(null, true);
                return;
            }
            requestDetails(type, result.id, callback);
        });
    });
}

/* =========================
   LOGO SERVICE
========================= */

function loadLogo(d, callback, force) {
    if (!d) {
        callback({ src: '', title: '', backdrops: [] });
        return;
    }

    var k = identity(d);
    var fallback = movieTitle(d);

    if (!force) {
        var hit = cached(k);
        if (hit) {
            callback({
                src: imageURL(hit.path),
                title: hit.title || fallback,
                backdrops: hit.backdrops || []
            });
            return;
        }
    }

    if (pending[k]) {
        pending[k].push(callback);
        return;
    }

    pending[k] = [callback];
    var requestGeneration = generation;

    function finish(path, title, backdrops, failed) {
        if (requestGeneration !== generation) return;

        var value = {
            path: path || '',
            title: title || fallback,
            backdrops: backdrops || [],
            failed: !!failed,
            time: Date.now()
        };

        saveCache(k, value);

        var callbacks = pending[k] || [];
        delete pending[k];

        var result = {
            src: imageURL(value.path),
            title: value.title,
            backdrops: value.backdrops
        };

        callbacks.forEach(function (fn) {
            try { fn(result); } catch (e) {}
        });
    }

    resolveTMDB(d, function (json, failed) {
        if (failed || !json || !json.id) {
            finish('', fallback, [], true);
            return;
        }

        var title = first(movieType(d) === 'tv' ? json.name : json.title, fallback);
        var logos = json.images && json.images.logos;
        var selected = chooseLogo(logos);
        var backdrops = (json.images && json.images.backdrops) || [];

        finish(selected ? selected.file_path : '', title, backdrops, false);
    });
}

/* =========================
   CLEAN TEMPLATE & CSS
========================= */

function installNewCardTemplate() {
    if ($('#cas-main-styles').length) return;
    
    const template = `<div class="full-start-new left-title">                      
        <div class="full-start-new__body">                      
            <div class="full-start-new__left hide">                      
                <div class="full-start-new__poster">                      
                    <img class="full-start-new__img full--poster" />                      
                </div>                      
            </div>                      
            <div class="full-start-new__right">                      
                <div class="left-title__content">                      
                    <div class="cas-logo-container">  
                        <div class="cas-studios-row"></div>                  
                        <div class="cas-logo"></div>                    
                    </div>                    
                    <div class="cas-tagline" style="display: none;"></div>
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
                            <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>                      
                            <span>#{title_watch}</span>                      
                        </div>                      
                        <div class="full-start__button selector button--book">                      
                            <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg>                      
                            <span>#{settings_input_links}</span>                      
                        </div>                      
                        <div class="full-start__button selector button--reaction">                  
                            <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/><path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/></svg>              
                            <span>#{title_reactions}</span>              
                        </div>  
                        <div class="full-start__button selector button--subscribe hide">                    
                            <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">        
                                <path d="M6.01892 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>        
                                <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>        
                            </svg>    
                            <span>#{title_subscribe}</span>                    
                        </div>                  
                        <div class="full-start__button selector button--options">                  
                            <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg>                  
                        </div>                  
                    </div>                  
                </div>                  
                <div class="full-start-new__reactions selector hide"></div>                  
                <div class="full-start-new__rate-line hide"></div>                  
                <div class="rating--modss" style="display: none;"></div>                  
            </div>                  
        </div>                  
        <div class="hide buttons--container">                  
            <div class="full-start__button view--torrent hide">                  
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="24" height="24"><path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/></svg>                  
                <span>#{full_torrents}</span>                  
            </div>                  
            <div class="full-start__button selector view--trailer">                  
                <svg height="24" viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"/></svg>                  
                <span>#{full_trailers}</span>                  
            </div>                  
        </div>                  
    </div>`;                  
    Lampa.Template.add('full_start_new', template);                  

    const styles = `<style id="cas-main-styles">  
    :root { 
        --cas-logo-scale: 1; 
        --cas-blocks-gap: 16px; 
        --cas-meta-size: 1.25em; 
    }  
            
    .full-start__background {  
        height: calc(100% + 6em);  
        left: 0 !important;  
        opacity: 0 !important;  
        transition: opacity 0.6s ease !important;  
        will-change: opacity;  
        overflow: hidden !important;  
        transform: translateZ(0);
    }  
        
    .full-start__background.loaded { opacity: 1 !important; }  
    .full-start__background.dim { opacity: 0.35 !important; }  

    .full-start-new__details { display: none !important; }  
    .full-start-new__head { display: block !important; margin: 0 !important; padding: 0 !important; font-size: 0.9em; }  
    
    .full-start-new__body { display: flex; height: 85vh; position: relative; width: 100%; }  
    .full-start-new__left { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; padding: 4em 3em 2em 2em; position: relative; z-index: 2; }  
    .full-start-new__right { width: 60%; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start !important; text-align: left !important; padding: 4em 4em 2em 0; position: relative; z-index: 2; margin-left: 0 !important; }  
    .full-start-new__poster, .full-start-new__title { display: none; }  
                        
    .left-title .full-start-new__left { display: none !important; }  
    .left-title .full-start-new__right { width: 100% !important; padding-left: 2em !important; }  
    .left-title__content { display: flex; flex-direction: column; align-items: flex-start !important; text-align: left !important; width: 100%; }
                        
    .cas-logo-container {  
        position: relative;  
        overflow: visible;  
        max-width: 100%;  
        margin-bottom: var(--cas-blocks-gap);  
        display: flex;
        flex-direction: column;
        align-items: flex-start !important;
    }  
                        
    .cas-logo img {  
        background: transparent !important;  
        border: none !important;  
        max-width: 450px;  
        max-height: 200px;  
        width: auto;  
        height: auto;  
        transform: scale(var(--cas-logo-scale));  
        transform-origin: left center;  
        display: block;  
        object-fit: contain;  
    }  
    
    .cas-tagline {
        font-size: calc(var(--cas-meta-size) * 0.95);
        font-style: italic;
        color: rgba(255, 255, 255, 0.85);
        margin-bottom: 12px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
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
        margin-right: 0;  
        display: flex;  
        align-items: center;  
        justify-content: flex-start !important;
        gap: 8px;  
        font-weight: 400; 
        font-size: var(--cas-meta-size);
        color: rgba(255, 255, 255, 0.9);
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
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));    
        opacity: 0.95;    
    }    

    .cas-description { 
        font-size: var(--cas-meta-size) !important; 
        line-height: 1.4; 
        color: rgba(255,255,255,0.8); 
        display: -webkit-box; 
        -webkit-line-clamp: 4; 
        -webkit-box-orient: vertical; 
        overflow: hidden; 
        max-width: 750px; 
        margin-top: 6px; 
        margin-bottom: 14px; 
        text-align: left !important; 
    }    
    .left-title .full-start-new__body { height: 85vh; }    
    </style>`;
    Lampa.Template.add('left_title_css', styles);
    if (!$('#cas-main-styles').length) {
        $('body').append(Lampa.Template.get('left_title_css', {}, true));
    }
}

function stopSlideshow() {                
    if (currentInterval) {                
        clearInterval(currentInterval);                
        currentInterval = null;                
    }                
    if (window.casBgInterval) {                
        clearInterval(window.casBgInterval);                
        window.casBgInterval = null;                
    }                
}

function startSlideshow(render, backdrops, currentLang) {  
    stopSlideshow();  
    if (!backdrops || backdrops.length <= 1) return;  
  
    let lang_backdrops = [];  
    let no_lang_backdrops = [];  
    let other_backdrops = [];  
  
    backdrops.forEach((b) => {  
        let lang = b.iso_639_1;  
        if (lang === currentLang) lang_backdrops.push(b);  
        else if (!lang || lang === 'xx' || lang === 'null') no_lang_backdrops.push(b);  
        else other_backdrops.push(b);  
    });  
  
    let final_backdrops = [].concat(no_lang_backdrops);  
    if (final_backdrops.length < 3 && lang_backdrops.length > 0) {  
        final_backdrops = final_backdrops.concat(lang_backdrops);  
    }  
    if (final_backdrops.length < 3 && other_backdrops.length > 0) {  
        other_backdrops.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));  
        final_backdrops = final_backdrops.concat(other_backdrops);  
    }  
    final_backdrops = final_backdrops.slice(0, 15);  
  
    if (final_backdrops.length <= 1) return;  
  
    let idx = 0;  
    let is_active = true;  
    let intervalTime = 15000;  
  
    currentInterval = setInterval(() => {  
        if (!is_active) { clearInterval(currentInterval); return; }  
  
        idx = (idx + 1) % final_backdrops.length;  
        let nextSrc = Lampa.TMDB.image('/t/p/original' + final_backdrops[idx].file_path);  
  
        let $bgImg = render.find('.full-start__background img, img.full-start__background').last();  
        if (!$bgImg.length) return;  
  
        let img = new Image();  
        img.onload = () => {  
            if (!is_active) return;  
            let $container = render.find('.full-start__background');
            
            $container.css({
                transition: 'opacity 0.4s ease',
                opacity: 0
            });

            setTimeout(() => {
                if (!is_active) return;
                $bgImg.attr('src', nextSrc);
                setTimeout(() => {
                    if (!is_active) return;
                    $container.css('opacity', 0.35);
                }, 100);
            }, 400);
        };  
        img.onerror = () => {};  
        img.src = nextSrc;  
    }, intervalTime);  
  
    window.casBgInterval = currentInterval;  
}

function applyNewCardSettings() {
    if (!newCardEnabled()) return;

    try {
        const root = document.documentElement;          
        const scale = parseInt(storageGet(S.scale, '100')) / 100;          
        const gap = storageGet(S.casGap, '20');          
        const metaSize = storageGet(S.casMetaSize, '1.3');          
                          
        root.style.setProperty('--cas-logo-scale', scale);          
        root.style.setProperty('--cas-blocks-gap', gap + 'px');          
        root.style.setProperty('--cas-meta-size', metaSize + 'em');          
        
        const currentCard = $('.full-start-new.left-title');          
        if (currentCard.length > 0) {          
            const showDesc = !!storageGet(S.casDesc, true);
            const showTag = !!storageGet(S.casTagline, true);

            currentCard.find('.cas-description').toggle(showDesc);          
            currentCard.find('.cas-tagline').toggle(showTag);
            currentCard.find('.cas-studios-row').toggle(!!storageGet(S.casStudios, true));          
                        
            stopSlideshow();          
          
            if (storageGet(S.casSlideshow, true)) {          
                const movieData = currentCard.data('movie');          
                if (movieData && movieData.id) {          
                    const cachedData = cached(identity(movieData));          
                    if (cachedData && cachedData.backdrops?.length > 1) {          
                        startSlideshow(currentCard, cachedData.backdrops, Lampa.Storage.get('tmdb_lang') || 'uk');          
                    }          
                }          
            }          
        }
    } catch (e) {}
}

/* =========================
   CSS (HERO & STANDARD CARDS)
========================= */

var CSS = [
'.banner-host{position:relative}',
'.banner-enabled .banner-host .activity__body{padding-top:42vh!important;box-sizing:border-box}',
'.banner-hero{position:absolute;top:0;left:0;right:0;height:50vh;overflow:hidden;pointer-events:none;z-index:0;-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%);mask-image:linear-gradient(180deg,#000 55%,transparent 100%)}',
'.banner-hero__bg{position:absolute;inset:0;background-position:center 20%;background-repeat:no-repeat;background-size:cover;opacity:0;transition:opacity .2s ease}',
'.banner-hero__bg.show{opacity:1}',
'.banner-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.85),rgba(0,0,0,.55) 40%,transparent 75%)}',
'.banner-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:2}',
'.banner-hero__logo{display:none;width:auto;height:auto;max-width:100%;max-height:7em;object-fit:contain;object-position:left center;opacity:0;transition:opacity .15s ease;filter:drop-shadow(0 4px 12px rgba(0,0,0,.6))}',
'.banner-hero__logo.ready{opacity:1}',
'.banner-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:#f5f5f1;margin-bottom:.35em;text-shadow:0 3px 14px rgba(0,0,0,.7)}',
'.banner-hero__meta{font-size:1.15em;color:#f5f5f1;margin-bottom:.6em;display:flex;gap:.8em;align-items:center;flex-wrap:wrap}',
'.banner-hero__rate{padding:.1em .5em;border-radius:6px;font-weight:800;background:#1db954;color:#fff}',
'.banner-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
'.interface-plus-logo-title{position:relative}',
'.interface-plus-card-logo{display:block;width:auto;height:auto;max-width:100%;max-height:105px;object-fit:contain;object-position:left center;opacity:0;transition:opacity .15s ease;filter:drop-shadow(0 3px 10px rgba(0,0,0,.45))}',
'.interface-plus-card-logo.ready{opacity:1}',
'.interface-plus-logo-title.interface-plus-logo-active{font-size:0!important;line-height:0!important}',
'.interface-plus-logo-title.interface-plus-logo-active>.interface-plus-original-title{display:none!important}',
'.interface-plus-logo-title.interface-plus-logo-active>.interface-plus-card-logo{font-size:initial;line-height:normal}',
'@media(max-width:480px){.interface-plus-card-logo{max-height:75px}.banner-hero__info{left:1.5em;width:75%}.banner-hero__logo{max-height:5em}}'
].join('\n');

function installStyle() {
    var el = document.getElementById('interface-plus-tmdb-only-style');
    if (!el) {
        el = document.createElement('style');
        el.id = 'interface-plus-tmdb-only-style';
        document.head.appendChild(el);
    }
    el.textContent = CSS;
}

/* =========================
   HERO
========================= */

function createHero(root) {
    if (!root) return null;
    if (root.__interfacePlusHero && root.contains(root.__interfacePlusHero)) {
        return root.__interfacePlusHero;
    }

    var hero = document.createElement('div');
    hero.className = 'banner-hero';
    hero.innerHTML = '<div class="banner-hero__bg"></div>' +
        '<div class="banner-hero__info">' +
        '<img class="banner-hero__logo" alt=""/>' +
        '<div class="banner-hero__title"></div>' +
        '<div class="banner-hero__meta"></div>' +
        '<div class="banner-hero__descr"></div>' +
        '</div>';

    root.insertBefore(hero, root.firstChild);
    root.classList.add('banner-host');

    hero.parts = {
        bg: hero.querySelector('.banner-hero__bg'),
        logo: hero.querySelector('.banner-hero__logo'),
        title: hero.querySelector('.banner-hero__title'),
        meta: hero.querySelector('.banner-hero__meta'),
        descr: hero.querySelector('.banner-hero__descr')
    };

    hero.token = 0;
    root.__interfacePlusHero = hero;
    return hero;
}

function showHero(hero, d, force) {
    if (!hero || !d) return;

    var key = identity(d);
    if (!force && hero.movieKey === key) return;

    hero.movieKey = key;
    hero.token++;

    var token = hero.token;
    var p = hero.parts;

    p.logo.classList.remove('ready');
    p.logo.style.display = 'none';
    p.logo.src = '';

    p.title.style.display = '';
    p.title.textContent = movieTitle(d);
    p.logo.style.transform = 'scale(' + logoScale() + ')';
    p.logo.style.transformOrigin = 'left center';
    p.meta.textContent = '';

    var rating = Number(d.vote_average) || 0;
    if (rating > 0) {
        var rate = document.createElement('span');
        rate.className = 'banner-hero__rate';
        rate.textContent = rating.toFixed(1);
        p.meta.appendChild(rate);
    }

    var year = movieYear(d);
    if (year) {
        var y = document.createElement('span');
        y.textContent = year;
        p.meta.appendChild(y);
    }

    var type = document.createElement('span');
    type.textContent = movieType(d) === 'tv' ? 'Серіал' : 'Фільм';
    p.meta.appendChild(type);
    p.descr.textContent = d.overview || '';
    p.bg.classList.remove('show');

    if (d.backdrop_path) {
        var bg = imageURL(d.backdrop_path, 'w1280');
        preload(bg, function (ok) {
            if (!ok || hero.token !== token) return;
            p.bg.style.backgroundImage = 'url("' + bg + '")';
            p.bg.classList.add('show');
        });
    }

    function applyLogo(src, titleText) {
        if (hero.token !== token) return;
        if (titleText) p.title.textContent = titleText;

        if (!src) {
            p.title.style.display = '';
            p.logo.style.display = 'none';
            return;
        }

        preload(src, function (ok) {
            if (hero.token !== token || !ok) {
                p.title.style.display = '';
                p.logo.style.display = 'none';
                return;
            }

            p.logo.src = src;
            p.logo.style.display = 'block';

            requestAnimationFrame(function () {
                if (hero.token !== token) return;
                p.logo.classList.add('ready');
                p.title.style.display = 'none';
            });
        });
    }

    var fastCached = cached(key);
    if (fastCached && fastCached.path) {
        applyLogo(imageURL(fastCached.path), fastCached.title || movieTitle(d));
        return;
    }

    loadLogo(d, function (result) {
        if (hero.token !== token) return;
        applyLogo(result.src, result.title || movieTitle(d));
    }, !!force);
}

function attachHero(o) {
    if (!heroEnabled() || !o) return;
    var c = text(o.component).toLowerCase();
    if (c !== 'main' && c !== 'category') return;

    var root = renderActivity(o);
    if (root) createHero(root);
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
        lastFocusKey = '';
        return;
    }

    attachHero(activeActivity());
}

/* =========================
   STANDARD CARD TITLE (Fallback)
========================= */

function restoreTitle(root) {
    if (!root) return;
    var titles = [];

    if (root.classList && root.classList.contains('interface-plus-logo-title')) {
        titles.push(root);
    }
    if (root.querySelectorAll) {
        Array.prototype.push.apply(titles, root.querySelectorAll('.interface-plus-logo-title'));
    }

    titles.forEach(function (t) {
        var logo = t.querySelector('.interface-plus-card-logo');
        if (logo) {
            logo.onload = null;
            logo.onerror = null;
            logo.remove();
        }

        var original = t.querySelector('.interface-plus-original-title');
        if (original) {
            while (original.firstChild) {
                t.insertBefore(original.firstChild, original);
            }
            original.remove();
        }

        t.classList.remove('interface-plus-logo-title', 'interface-plus-logo-active');
    });
}

function findTitle(root) {
    return root && root.querySelector && root.querySelector(TITLE_SELECTOR);
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

function stopCard(restore) {
    activeCardToken++;
    if (activeCard && activeCard.observer) {
        activeCard.observer.disconnect();
    }
    if (restore && activeCard && activeCard.root) {
        restoreTitle(activeCard.root);
    }
    activeCard = null;
}

function cardCurrent(token, key) {
    return !!(
        activeCard &&
        activeCardToken === token &&
        activeCard.key === key &&
        activeCard.root &&
        activeCard.root.isConnected
    );
}

function showCardLogoInstant(root, d) {
    var hit = cached(identity(d));
    if (!hit || !hit.path) return false;

    var title = findTitle(root);
    if (!title) return false;

    var logo = prepareLogo(title);
    if (!logo) return false;

    logo.style.transform = 'scale(' + logoScale() + ')';
    logo.style.transformOrigin = 'left center';
    logo.src = imageURL(hit.path);
    logo.classList.add('ready');
    title.classList.add('interface-plus-logo-active');
    return true;
}

/* =========================
   CLEAN NEWCARD LOGIC
========================= */

function formatTime(mins) {                
    if (!mins) return '';                
    const h = Math.floor(mins / 60);                
    const m = mins % 60;                
    return (h > 0 ? h + 'г ' : '') + m + 'хв';                
}

function renderStudioLogosWithColorAnalysis(container, data) {    
    try {
        container.empty();
        const list = data.networks || data.production_companies || [];
        const studios = list.filter(s => s && s.logo_path).slice(0, 1);  
            
        if (!studios.length) {
            container.hide();
            return;
        }

        container.show();

        studios.forEach((studio) => {    
            const logoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);    
            const id = 'cas_studio_' + Math.random().toString(36).substr(2, 9);    
                
            container.append(`<div class="cas-studio-item" id="${id}"><img src="${logoUrl}"></div>`);    
                
            const img = new Image();    
            img.crossOrigin = 'anonymous';    
            img.onload = function() {    
                try {
                    const canvas = document.createElement('canvas');    
                    const ctx = canvas.getContext('2d');    
                    canvas.width = this.width;    
                    canvas.height = this.height;    
                    ctx.drawImage(this, 0, 0);    
                        
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;    
                    let r = 0, g = 0, b = 0, count = 0;    
                        
                    for (let i = 0; i < imageData.length; i += 4) {    
                        if (imageData[i + 3] > 50) {    
                            r += imageData[i];    
                            g += imageData[i + 1];    
                            b += imageData[i + 2];    
                            count++;    
                        }    
                    }    
                        
                    if (count > 0) {    
                        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / count;    
                        if (brightness < 40) {    
                            $('#' + id + ' img').css('filter', 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))');    
                        }    
                    }    
                } catch (e) {}    
            };    
            img.src = logoUrl;    
        });    
    } catch (e) {}
}

async function processNewCard(render, data, res) {
    try {
        let bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];  
        if (!bestLogo && res.logos.length > 0) bestLogo = res.logos[0];  
  
        if (bestLogo) {  
            const quality = logoQuality();  
            const logoSrc = imageURL(bestLogo.file_path, quality);  
            await preloadImagePromise(logoSrc);  
            render.find('.cas-logo').html(`<img src="${logoSrc}">`);  
        } else {  
            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${movieTitle(data)}</div>`);  
        }  
        stopSlideshow();  
        if (storageGet(S.casSlideshow, true) && res.backdrops && res.backdrops.length > 1) {  
            let current_lang = Lampa.Storage.get('tmdb_lang') || 'uk';  
            startSlideshow(render, res.backdrops, current_lang);  
        }  
    } catch (error) {  
        render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${movieTitle(data)}</div>`);  
    }
}

function preloadImagePromise(src) {                
    return new Promise((resolve) => {                
        const img = new Image();                
        img.onload = () => resolve(img);                
        img.onerror = () => resolve(null);                
        img.src = src;                
    });                
}

function loadNewCardMovieDetails(render, data) {
    try {
        if (!render || !data) return;

        // Опис
        var overviewText = data.overview || (data.movie && data.movie.overview) || '';
        if (overviewText && storageGet(S.casDesc, true)) {
            render.find('.cas-description').html(overviewText).show();
        } else {
            render.find('.cas-description').hide();
        }

        // Слоган
        var taglineText = data.tagline || (data.movie && data.movie.tagline) || '';
        if (taglineText && storageGet(S.casTagline, true)) {
            render.find('.cas-tagline').text(`«${taglineText}»`).show();
        } else {
            render.find('.cas-tagline').hide();
        }

        // Мета-рядок
        const year = movieYear(data);    
        const country = (data.production_countries && data.production_countries.length > 0) ? data.production_countries[0].name : '';
        const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));    
        const genres = (data.genres || []).map(g => g.name).join(', ');    
            
        let metaParts = [];
        if (year) metaParts.push(`<span>${year}</span>`);
        if (country) metaParts.push(`<span>${country}</span>`);
        if (time) metaParts.push(`<span>${time}</span>`);
        if (genres) metaParts.push(`<span>${genres}</span>`);
            
        render.find('.cas-meta-info').html(metaParts.join(' &bull; '));

        // Студії
        if (storageGet(S.casStudios, true)) {    
            renderStudioLogosWithColorAnalysis(render.find('.cas-studios-row'), data);    
        } else {
            render.find('.cas-studios-row').hide();
        }
    } catch (e) {}
}

/* =========================
   MAIN START / CARD ROUTER
========================= */

function startCard(o, override, force) {
    if (!isFull(o)) return;

    var d = override || getMovie(o);
    var root = renderActivity(o);

    if (!d || !root) return;

    var key = identity(d);

    if (!force && activeCard && activeCard.key === key && activeCard.root === root) {
        return;
    }

    stopCard(false);
    var token = activeCardToken;

    activeCard = {
        root: root,
        key: key,
        data: d,
        title: movieTitle(d),
        src: '',
        observer: null
    };

    if (newCardEnabled()) {
        installNewCardTemplate();
        applyNewCardSettings();

        var renderWrap = $(root);

        loadLogo(d, function (result) {
            if (!cardCurrent(token, key)) return;
            processNewCard(renderWrap, d, { 
                logos: result.src ? [{file_path: result.src.replace('https://image.tmdb.org/t/p/' + logoQuality(), ''), iso_639_1: 'uk'}] : [], 
                backdrops: result.backdrops 
            });
        }, !!force);

        loadNewCardMovieDetails(renderWrap, d);
        return;
    }

    if (!force && showCardLogoInstant(root, d)) {
        return;
    }

    if (window.MutationObserver) {
        var observer = new MutationObserver(function () {
            if (!cardCurrent(token, key)) return;
            var title = findTitle(root);
            if (!title) return;

            if (activeCard.src && !title.querySelector('.interface-plus-card-logo')) {
                var logo = prepareLogo(title);
                if (logo) {
                    logo.style.transform = 'scale(' + logoScale() + ')';
                    logo.style.transformOrigin = 'left center';
                    logo.src = activeCard.src;
                    logo.classList.add('ready');
                    title.classList.add('interface-plus-logo-active');
                }
            }
        });

        observer.observe(root, { childList: true, subtree: true });
        activeCard.observer = observer;
    }

    loadLogo(d, function (result) {
        if (!cardCurrent(token, key)) return;

        activeCard.title = result.title || movieTitle(d);
        if (!result.src) return;

        activeCard.src = result.src;
        var title = findTitle(root);
        if (!title) return;

        var logo = prepareLogo(title);
        if (!logo) return;

        logo.style.transform = 'scale(' + logoScale() + ')';
        logo.style.transformOrigin = 'left center';
        logo.src = result.src;
        logo.classList.add('ready');
        title.classList.add('interface-plus-logo-active');
    }, !!force);
}

function refreshCard(force) {
    var a = activeActivity();
    if (isFull(a)) startCard(a, null, !!force);
}

function refreshAll(force) {
    lastFocusKey = '';
    if (activeHero && activeHero.movieKey) activeHero.movieKey = '';

    var a = activeActivity();
    if (isFull(a)) {
        stopCard(true);
        startCard(a, null, !!force);
    }
}

/* =========================
   FONTS & INTERFACE SIZE
========================= */

var FONTS = {
    default: { family: 'Roboto, Arial, sans-serif', url: '' },
    netflix: { family: '"Netflix Sans", Arial, sans-serif', url: 'https://assets.nflxext.com/ffe/siteui/fonts/netflix-sans/v3/NetflixSans_W_Rg.woff2' },
    montserrat: { family: '"Montserrat", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap' },
    inter: { family: '"Inter", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap' },
    nunito: { family: '"Nunito", sans-serif', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap' }
};

function applyFont() {
    var name = text(storageGet(S.font, 'default'));
    if (currentFont === name) return;
    currentFont = name;

    var font = FONTS[name] || FONTS.default;
    var old = document.getElementById('interface-plus-font-style');
    if (old) old.remove();
    old = document.getElementById('interface-plus-font-face');
    if (old) old.remove();

    if (font.url) {
        var face = document.createElement('style');
        face.id = 'interface-plus-font-face';
        if (font.url.indexOf('googleapis.com') !== -1) {
            face.textContent = '@import url("' + font.url + '");';
        } else {
            face.textContent = '@font-face{font-family:"Netflix Sans";src:url("' + font.url + '") format("woff2");font-weight:400}';
        }
        document.head.appendChild(face);
    }

    var style = document.createElement('style');
    style.id = 'interface-plus-font-style';
    style.textContent = 'body,.body,*{font-family:' + font.family + '!important}';
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
            var n = maker.Items.__interfacePlusCount || count;
            if (type === 'Line') this.view = n;
            else this.limit_view = n;
        };

        maker.Items.__interfacePlusPatched = true;
        maker.Items.__interfacePlusCount = count;
    });
}

function applySize() {
    var value = parseFloat(storageGet(S.size, '10.6')) || 10.6;
    var mobile = false;

    try {
        mobile = !!(Lampa.Platform && Lampa.Platform.screen && Lampa.Platform.screen('mobile'));
    } catch (e) {}

    if (mobile) value = 10.1;
    if (String(value) === currentSize) return;

    currentSize = String(value);
    document.body.style.fontSize = value + 'px';
    patchMaker(value <= 9.6 ? 8 : value <= 11.1 ? 7 : 6);
}

/* =========================
   SETTINGS & LISTENERS
========================= */

function addSettings() {
    if (!Lampa.SettingsApi) return;
    var api = Lampa.SettingsApi;

    api.addComponent({
        component: 'interface_plus_settings',
        name: 'Інтерфейс +',
        icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 5h2v5h-2z"/></svg>'
    });

    function add(key, type, def, name, description, values, change) {
        api.addParam({
            component: 'interface_plus_settings',
            param: { name: key, type: type, default: def, values: values },
            field: { name: name, description: description || '' },
            onChange: change
        });
    }

    add(S.hero, 'trigger', true, 'Динамічні банери', 'Преміальні банери на головній сторінці', null, applyHero);
    add(S.newcard, 'trigger', true, 'Сучасна картка (NewCard)', 'Увімкнути новий інтерфейс картки фільму', null, function () { refreshCard(true); });
    
    add(S.casSlideshow, 'trigger', true, 'Слайд-шоу фону', 'Зміна кадрів на задньому плані картки', null, applyNewCardSettings);
    add(S.casStudios, 'trigger', true, 'Показувати студії', 'Логотипи компаній-виробників', null, applyNewCardSettings);
    add(S.casDesc, 'trigger', true, 'Опис фільму', 'Показувати текст анотації під логотипом', null, applyNewCardSettings);
    add(S.casTagline, 'trigger', true, 'Показувати слоган', 'Цитата або слоган фільму', null, applyNewCardSettings);

    add(S.quality, 'select', 'original', 'Якість логотипів TMDB', 'Роздільна здатність зображень', { w300: '300px', w500: '500px', original: 'Original' }, function () { refreshAll(false); });
    add(S.scale, 'select', '100', 'Розмір логотипів', 'Масштаб логотипів', { '70': '70%', '80': '80%', '90': '90%', '100': '100%', '110': '110%', '120': '120%' }, function () { refreshAll(false); });
    add('interface_plus_clear_logo_cache', 'button', '', 'Очистити кеш', 'Повторно отримати дані та логотипи з TMDB', null, clearCache);
    add(S.size, 'select', '10.6', 'Розмір інтерфейсу', 'Масштаб елементів інтерфейсу', { '09.1': 'Міні', '09.6': 'Дуже малий', '10.1': 'Малий', '10.6': 'Середній' }, applySize);
    add(S.font, 'select', 'default', 'Шрифт інтерфейсу', 'Стиль тексту', { default: 'Roboto', netflix: 'Netflix Sans', montserrat: 'Montserrat', inter: 'Inter', nunito: 'Nunito' }, applyFont);
}

function installListeners() {
    document.addEventListener('hover:focus', onFocus, true);

    if (!Lampa.Listener) return;

    Lampa.Listener.follow('activity', function (e) {
        if (!e) return;
        if (e.type === 'start') {
            requestAnimationFrame(function () {
                attachHero(e.object);
                if (isFull(e.object)) startCard(e.object);
                else stopCard(false);
            });
        }
        if (e.type === 'destroy' && isFull(e.object)) {
            stopCard(false);
            stopSlideshow();
        }
    });

    Lampa.Listener.follow('full', function (e) {
        if (!e) return;
        if (e.type !== 'complete' && e.type !== 'complite') return;
        var d = e.data && e.data.movie;
        requestAnimationFrame(function () {
            var a = activeActivity();
            if (isFull(a)) {
                startCard(a, d || null, true);
            }
        });
    });

    try {
        if (Lampa.Storage.listener && Lampa.Storage.listener.follow) {
            Lampa.Storage.listener.follow('change', function (e) {
                if (!e || !e.name) return;
                if (e.name === S.hero) applyHero();
                if (e.name === S.newcard) refreshCard(true);
                if (e.name === S.font) { currentFont = ''; applyFont(); }
                if (e.name === S.size) { currentSize = ''; applySize(); }
                if (e.name === S.quality || e.name === S.scale) refreshAll(false);
                if (e.name.indexOf('cas_') === 0) applyNewCardSettings();
            });
        }
    } catch (e) {}
}

/* =========================
   INITIALIZE
========================= */

function init() {
    if (initialized || !window.Lampa || !Lampa.Storage) return;
    initialized = true;

    installStyle();
    if (newCardEnabled()) installNewCardTemplate();

    applyFont();
    applySize();
    applyHero();

    addSettings();
    installListeners();

    requestAnimationFrame(function () {
        var a = activeActivity();
        attachHero(a);
        if (isFull(a)) startCard(a);
    });

    log('TMDB Only + Clean NewCard 1.6.2 initialized');
}

/* =========================
   START
========================= */

if (window.appready) {
    setTimeout(init, 150);
} else if (window.Lampa && Lampa.Listener) {
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') setTimeout(init, 150);
    });
}

})();
