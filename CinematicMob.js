(function () {
    'use strict';

    /*
     * TMDB CINEMATIC MOBILE 1.2.0
     *
     * Lampa / Mobile
     *
     * Features:
     * - Mobile devices only
     * - Full-width cinematic TMDB backdrop
     * - TMDB logo: Ukrainian > English > neutral
     * - Tagline
     * - TMDB / IMDb / KP ratings
     * - Production companies
     * - Overview
     * - Native Lampa buttons preserved
     * - Robust full activity detection
     * - Request protection
     * - Image cache
     */

    var VERSION = '1.2.0';
    var READY_KEY = 'tmdb_cinematic_mobile_120_ready';
    var CACHE_KEY = 'tmdb_cinematic_mobile_cache_120';
    var CACHE_TTL = 6 * 60 * 60 * 1000;

    if (window[READY_KEY]) return;
    window[READY_KEY] = true;

    if (!window.Lampa || !window.$) return;

    var Lampa = window.Lampa;
    var $ = window.$;

    var currentId = 0;
    var requestId = 0;
    var observer = null;
    var activeRoot = null;

    var memoryCache = {};

    /* -------------------------------------------------------
       DEVICE
    ------------------------------------------------------- */

    function isMobile() {
        var ua = navigator.userAgent || '';

        var phoneUA =
            /iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile/i.test(ua);

        var tabletUA =
            /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);

        if (phoneUA) return true;
        if (tabletUA) return false;

        return window.innerWidth <= 790 &&
            !isTV();
    }

    function isTV() {
        try {
            if (Lampa.Platform && Lampa.Platform.screen) {
                if (Lampa.Platform.screen('tv')) return true;
            }
        } catch (e) {}

        return false;
    }

    /* -------------------------------------------------------
       HELPERS
    ------------------------------------------------------- */

    function elementOf(value) {
        if (!value) return null;

        if (value.nodeType === 1) return value;

        if (value[0] && value[0].nodeType === 1) {
            return value[0];
        }

        if (value.jquery && value.get) {
            return value.get(0);
        }

        return null;
    }

    function findCard(value) {
        var root = elementOf(value);

        if (!root) return null;

        if (root.matches && root.matches('.full-start-new')) {
            return root;
        }

        if (root.querySelector) {
            var card = root.querySelector('.full-start-new');

            if (card) return card;
        }

        return null;
    }

    function findActivity(event) {
        if (!event || !event.data) return null;

        var data = event.data;

        var link = data.link;

        if (link) {
            var html = link.html;

            var card = findCard(html);

            if (card) return card;

            var linkElement = elementOf(html);

            if (linkElement && linkElement.querySelector) {
                card = linkElement.querySelector('.full-start-new');

                if (card) return card;
            }
        }

        var bodyCard = findCard(data.body);

        if (bodyCard) return bodyCard;

        return findCard(data.html);
    }

    function getMovie(event) {
        if (!event || !event.data) return null;

        var data = event.data;

        if (data.data && data.data.movie) {
            return data.data.movie;
        }

        if (data.movie) return data.movie;

        if (data.object) return data.object;

        return null;
    }

    function getType(movie) {
        if (!movie) return 'movie';

        if (
            movie.number_of_seasons ||
            movie.first_air_date ||
            movie.name ||
            movie.original_name
        ) {
            return 'tv';
        }

        return 'movie';
    }

    function getId(movie) {
        if (!movie) return 0;

        return Number(
            movie.id ||
            movie.tmdb_id ||
            movie.movie_id ||
            0
        );
    }

    function escapeHTML(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function imageUrl(path, size) {
        if (!path) return '';

        if (/^https?:\/\//i.test(path)) return path;

        return 'https://image.tmdb.org/t/p/' +
            (size || 'w1280') + path;
    }

    function isAlive(element) {
        if (!element) return false;

        if (typeof element.isConnected === 'boolean') {
            return element.isConnected;
        }

        return document.documentElement.contains(element);
    }

    /* -------------------------------------------------------
       CACHE
    ------------------------------------------------------- */

    function cacheGet(key) {
        if (memoryCache[key]) {
            var item = memoryCache[key];

            if (Date.now() - item.time < CACHE_TTL) {
                return item.data;
            }
        }

        try {
            var storage = JSON.parse(
                localStorage.getItem(CACHE_KEY) || '{}'
            );

            var saved = storage[key];

            if (
                saved &&
                saved.time &&
                Date.now() - saved.time < CACHE_TTL
            ) {
                memoryCache[key] = saved;
                return saved.data;
            }
        } catch (e) {}

        return null;
    }

    function cacheSet(key, data) {
        var item = {
            time: Date.now(),
            data: data
        };

        memoryCache[key] = item;

        try {
            var storage = JSON.parse(
                localStorage.getItem(CACHE_KEY) || '{}'
            );

            storage[key] = item;

            var keys = Object.keys(storage);

            if (keys.length > 100) {
                keys.sort(function (a, b) {
                    return storage[a].time - storage[b].time;
                });

                keys.slice(0, keys.length - 100).forEach(function (key) {
                    delete storage[key];
                });
            }

            localStorage.setItem(
                CACHE_KEY,
                JSON.stringify(storage)
            );
        } catch (e) {}
    }

    /* -------------------------------------------------------
       TMDB API
    ------------------------------------------------------- */

    function tmdbImages(type, id, callback) {
        var cacheKey = type + '_' + id + '_images';

        var cached = cacheGet(cacheKey);

        if (cached) {
            callback(cached);
            return;
        }

        if (
            !Lampa.Api ||
            !Lampa.Api.sources ||
            !Lampa.Api.sources.tmdb ||
            !Lampa.Api.sources.tmdb.get
        ) {
            callback(null);
            return;
        }

        var path = '/' + type + '/' + id + '/images';

        var params = {
            filter: {
                include_image_language: 'uk,en,null'
            }
        };

        var completed = false;

        function done(data) {
            if (completed) return;

            completed = true;

            if (data && typeof data === 'object') {
                cacheSet(cacheKey, data);
                callback(data);
            } else {
                callback(null);
            }
        }

        try {
            var result = Lampa.Api.sources.tmdb.get(
                path,
                params,
                done
            );

            if (result && typeof result.then === 'function') {
                result.then(done).catch(function () {
                    done(null);
                });
            }
        } catch (e) {
            done(null);
        }

        setTimeout(function () {
            done(null);
        }, 15000);
    }

    /* -------------------------------------------------------
       LOGO SELECTION
    ------------------------------------------------------- */

    function selectLogo(images) {
        if (!images || !images.logos) return null;

        var logos = images.logos;

        if (!logos.length) return null;

        function findLanguage(language) {
            return logos.find(function (logo) {
                return logo.iso_639_1 === language;
            });
        }

        var selected =
            findLanguage('uk') ||
            findLanguage('en') ||
            logos.find(function (logo) {
                return !logo.iso_639_1;
            });

        if (!selected) {
            selected = logos[0];
        }

        return selected && selected.file_path
            ? selected.file_path
            : null;
    }

    /* -------------------------------------------------------
       BACKDROP SELECTION
    ------------------------------------------------------- */

    function selectBackdrop(movie, images) {
        if (movie && movie.backdrop_path) {
            return movie.backdrop_path;
        }

        if (
            images &&
            images.backdrops &&
            images.backdrops.length
        ) {
            var backdrop = images.backdrops[0];

            return backdrop.file_path || '';
        }

        return '';
    }

    /* -------------------------------------------------------
       METADATA
    ------------------------------------------------------- */

    function getYear(movie) {
        var date =
            movie.release_date ||
            movie.first_air_date ||
            '';

        return date ? String(date).substring(0, 4) : '';
    }

    function getGenres(movie) {
        if (!movie || !movie.genres) return '';

        return movie.genres
            .map(function (genre) {
                return genre.name;
            })
            .filter(Boolean)
            .join(' · ');
    }

    function getCountries(movie) {
        if (!movie) return '';

        var countries = movie.production_countries || [];

        return countries
            .map(function (country) {
                return country.name;
            })
            .filter(Boolean)
            .slice(0, 3)
            .join(', ');
    }

    function getStudios(movie) {
        if (!movie || !movie.production_companies) return [];

        return movie.production_companies
            .filter(function (company) {
                return company && company.name;
            })
            .slice(0, 5);
    }

    function getRating(movie) {
        var rating = Number(movie && movie.vote_average || 0);

        return rating > 0 ? rating.toFixed(1) : '';
    }

    /* -------------------------------------------------------
       HTML
    ------------------------------------------------------- */

    function createMarkup(movie, images) {
        var logo = selectLogo(images);

        var backdrop = selectBackdrop(movie, images);

        var tagline = movie.tagline || '';

        var overview = movie.overview || '';

        var studios = getStudios(movie);

        var year = getYear(movie);

        var countries = getCountries(movie);

        var genres = getGenres(movie);

        var rating = getRating(movie);

        var title =
            movie.title ||
            movie.name ||
            movie.original_title ||
            movie.original_name ||
            '';

        var logoHTML = logo
            ? '<img class="tmlm-logo" src="' +
                escapeHTML(imageUrl(logo, 'w500')) +
                '" alt="' + escapeHTML(title) + '">'
            : '<div class="tmlm-title">' +
                escapeHTML(title) +
                '</div>';

        var studioHTML = studios.length
            ? '<div class="tmlm-studios">' +
                studios.map(function (studio) {
                    return '<span>' +
                        escapeHTML(studio.name) +
                        '</span>';
                }).join('') +
                '</div>'
            : '';

        var meta = [];

        if (year) meta.push(year);

        if (countries) meta.push(countries);

        if (genres) meta.push(genres);

        var metaHTML = meta.length
            ? '<div class="tmlm-meta">' +
                meta.map(function (item) {
                    return '<span>' +
                        escapeHTML(item) +
                        '</span>';
                }).join('<i></i>') +
                '</div>'
            : '';

        var ratingHTML = rating
            ? '<div class="tmlm-rating">' +
                '<span class="tmlm-rating__value">' +
                escapeHTML(rating) +
                '</span>' +
                '<span class="tmlm-rating__source">TMDB</span>' +
                '</div>'
            : '';

        var taglineHTML = tagline
            ? '<div class="tmlm-tagline">' +
                escapeHTML(tagline) +
                '</div>'
            : '';

        var overviewHTML = overview
            ? '<div class="tmlm-overview">' +
                escapeHTML(overview) +
                '</div>'
            : '';

        return '' +
            '<div class="tmlm-hero">' +
                '<div class="tmlm-backdrop">' +
                    (backdrop
                        ? '<img src="' +
                            escapeHTML(imageUrl(backdrop, 'w1280')) +
                            '" alt="">'
                        : '') +
                '</div>' +
                '<div class="tmlm-gradient"></div>' +
                '<div class="tmlm-content">' +
                    '<div class="tmlm-logo-wrap">' +
                        logoHTML +
                    '</div>' +
                    taglineHTML +
                    ratingHTML +
                    metaHTML +
                    studioHTML +
                    overviewHTML +
                '</div>' +
            '</div>';
    }

    /* -------------------------------------------------------
       STYLES
    ------------------------------------------------------- */

    function addStyles() {
        if (document.getElementById('tmlm-styles')) return;

        var css = `
        @media screen and (max-width: 790px) {

            .full-start-new.tmlm-active {
                position: relative !important;
                display: block !important;
                width: 100% !important;
                min-height: 100vh !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
                background: #080808 !important;
            }

            .full-start-new.tmlm-active .full-start-new__body {
                display: flex !important;
                flex-direction: column !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                gap: 0 !important;
            }

            .full-start-new.tmlm-active .full-start-new__left {
                display: none !important;
            }

            .full-start-new.tmlm-active .full-start-new__right {
                display: flex !important;
                flex-direction: column !important;
                width: 100% !important;
                max-width: none !important;
                padding: 0 20px 30px !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                background: transparent !important;
            }

            .full-start-new.tmlm-active .full-start-new__title,
            .full-start-new.tmlm-active .full-start-new__tagline,
            .full-start-new.tmlm-active .full-start-new__details,
            .full-start-new.tmlm-active .full-start-new__rate-line,
            .full-start-new.tmlm-active .full-start-new__reactions {
                display: none !important;
            }

            .tmlm-hero {
                position: relative;
                width: calc(100% + 40px);
                margin: 0 -20px 0;
                min-height: 470px;
                overflow: hidden;
                background: #080808;
                isolation: isolate;
            }

            .tmlm-backdrop {
                position: absolute;
                inset: 0;
                z-index: -2;
                overflow: hidden;
                background: #101010;
            }

            .tmlm-backdrop img {
                display: block;
                width: 100%;
                height: 100%;
                min-height: 470px;
                object-fit: cover;
                object-position: center top;
                opacity: 0;
                transform: scale(1.025);
                transition:
                    opacity 900ms ease,
                    transform 1800ms ease;
            }

            .tmlm-backdrop img.tmlm-loaded {
                opacity: 1;
                transform: scale(1);
            }

            .tmlm-gradient {
                position: absolute;
                inset: 0;
                z-index: -1;
                background:
                    linear-gradient(
                        to bottom,
                        rgba(0,0,0,0.02) 0%,
                        rgba(0,0,0,0.08) 28%,
                        rgba(0,0,0,0.55) 52%,
                        rgba(8,8,8,0.96) 82%,
                        #080808 100%
                    );
            }

            .tmlm-content {
                position: relative;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                min-height: 470px;
                padding: 0 20px 24px;
                box-sizing: border-box;
            }

            .tmlm-logo-wrap {
                display: flex;
                align-items: flex-end;
                justify-content: flex-start;
                min-height: 65px;
                max-height: 125px;
                margin-bottom: 12px;
            }

            .tmlm-logo {
                display: block;
                max-width: 82%;
                max-height: 105px;
                width: auto;
                height: auto;
                object-fit: contain;
                object-position: left bottom;
                filter: none;
                animation: tmlm-logo-in 650ms ease both;
            }

            .tmlm-title {
                font-size: 30px;
                line-height: 1.08;
                font-weight: 800;
                letter-spacing: -0.7px;
                color: #fff;
                text-shadow: 0 2px 16px rgba(0,0,0,.4);
            }

            .tmlm-tagline {
                color: rgba(255,255,255,.82);
                font-size: 13px;
                line-height: 1.4;
                font-weight: 400;
                margin: 0 0 13px;
                max-width: 95%;
            }

            .tmlm-rating {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 12px;
            }

            .tmlm-rating__value {
                color: #fff;
                font-size: 14px;
                font-weight: 700;
            }

            .tmlm-rating__source {
                color: rgba(255,255,255,.55);
                font-size: 10px;
                letter-spacing: 1px;
                text-transform: uppercase;
            }

            .tmlm-meta {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 7px;
                color: rgba(255,255,255,.75);
                font-size: 11px;
                line-height: 1.5;
                margin-bottom: 12px;
            }

            .tmlm-meta i {
                display: block;
                width: 3px;
                height: 3px;
                flex: 0 0 3px;
                border-radius: 50%;
                background: rgba(255,255,255,.5);
            }

            .tmlm-studios {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin: 0 0 13px;
            }

            .tmlm-studios span {
                color: rgba(255,255,255,.65);
                font-size: 10px;
                line-height: 1.4;
                padding: 4px 8px;
                border: 1px solid rgba(255,255,255,.16);
                border-radius: 4px;
                background: rgba(255,255,255,.045);
            }

            .tmlm-overview {
                color: rgba(255,255,255,.82);
                font-size: 13px;
                line-height: 1.55;
                font-weight: 400;
                max-width: 100%;
                display: -webkit-box;
                -webkit-line-clamp: 5;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .full-start-new.tmlm-active .full-start-new__buttons {
                display: flex !important;
                position: relative !important;
                width: 100% !important;
                flex-wrap: wrap !important;
                gap: 8px !important;
                margin: 0 !important;
                padding: 8px 0 24px !important;
                box-sizing: border-box !important;
                z-index: 5 !important;
            }

            .full-start-new.tmlm-active .full-start__button {
                flex-shrink: 0;
            }

            .full-start-new.tmlm-active .buttons--container {
                display: flex !important;
                flex-wrap: wrap !important;
                padding: 0 20px 25px !important;
                box-sizing: border-box !important;
            }

            @keyframes tmlm-logo-in {
                from {
                    opacity: 0;
                    transform: translateY(8px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        }
        `;

        var style = document.createElement('style');

        style.id = 'tmlm-styles';
        style.textContent = css;

        document.head.appendChild(style);
    }

    /* -------------------------------------------------------
       IMAGE LOADING
    ------------------------------------------------------- */

    function activateImages(root) {
        if (!root) return;

        var images = root.querySelectorAll('.tmlm-backdrop img');

        images.forEach(function (img) {
            function loaded() {
                img.classList.add('tmlm-loaded');
            }

            if (img.complete && img.naturalWidth > 0) {
                loaded();
            } else {
                img.addEventListener('load', loaded, { once: true });
            }
        });
    }

    /* -------------------------------------------------------
       APPLY CARD
    ------------------------------------------------------- */

    function applyCard(root, movie, images, token) {
        if (!isAlive(root)) return;

        if (token !== requestId) return;

        if (!isMobile()) return;

        var oldHero = root.querySelector('.tmlm-hero');

        var markup = createMarkup(movie, images);

        if (oldHero) {
            oldHero.outerHTML = markup;
        } else {
            root.insertBefore(
                document.createRange().createContextualFragment(markup),
                root.firstChild
            );
        }

        root.classList.add('tmlm-active');

        activeRoot = root;

        activateImages(root);
    }

    /* -------------------------------------------------------
       PROCESS FULL CARD
    ------------------------------------------------------- */

    function processCard(event) {
        if (!isMobile()) return;

        var movie = getMovie(event);

        if (!movie) return;

        var id = getId(movie);

        if (!id) return;

        var token = ++requestId;

        currentId = id;

        var root = findActivity(event);

        if (!root) {
            waitForCard(event, movie, token);
            return;
        }

        loadMovieImages(root, movie, token);
    }

    function loadMovieImages(root, movie, token) {
        var id = getId(movie);

        var type = getType(movie);

        tmdbImages(type, id, function (images) {
            if (token !== requestId) return;

            if (!isAlive(root)) return;

            applyCard(root, movie, images, token);
        });
    }

    /* -------------------------------------------------------
       WAIT FOR DOM
    ------------------------------------------------------- */

    function waitForCard(event, movie, token) {
        var attempts = 0;

        var timer = setInterval(function () {
            attempts++;

            if (token !== requestId) {
                clearInterval(timer);
                return;
            }

            var root = findActivity(event);

            if (root) {
                clearInterval(timer);
                loadMovieImages(root, movie, token);
                return;
            }

            if (attempts >= 30) {
                clearInterval(timer);
            }
        }, 150);
    }

    /* -------------------------------------------------------
       ACTIVITY LISTENER
    ------------------------------------------------------- */

    function handleFull(event) {
        if (!event) return;

        if (
            event.type === 'complite' ||
            event.type === 'complete'
        ) {
            processCard(event);
        }
    }

    /* -------------------------------------------------------
       OBSERVER
    ------------------------------------------------------- */

    function startObserver() {
        if (observer) return;

        if (!window.MutationObserver) return;

        observer = new MutationObserver(function () {
            if (!isMobile()) return;

            if (!activeRoot || !isAlive(activeRoot)) return;

            if (!activeRoot.classList.contains('tmlm-active')) {
                activeRoot = null;
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    /* -------------------------------------------------------
       INIT
    ------------------------------------------------------- */

    function init() {
        addStyles();

        startObserver();

        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('full', handleFull);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
