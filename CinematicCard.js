
(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.0.1
     *
     * Lampa / Android TV / Mobile
     *
     * Independent plugin for standard Lampa FULL card.
     *
     * FEATURES:
     * - Replaces movie/TV title with TMDB logo
     * - TMDB language priority
     * - English fallback
     * - Logo without language fallback
     * - W500 image quality
     * - Persistent cache
     * - Smooth fade-in
     * - Original title fallback
     * - Activity and FULL event detection
     * - DOM observer for dynamic rendering
     * - No NewCard dependency
     * - No modifications to other interface elements
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_v101_ready) return;

    window.tmdb_movie_logos_v101_ready = true;

    var VERSION = '1.0.1';

    var CACHE_KEY = 'tmdb_movie_logos_cache_v101';
    var CACHE_LIMIT = 500;
    var REQUEST_TIMEOUT = 15000;

    var tmdb = Lampa.Api.sources.tmdb;

    var cache = {};
    var pending = {};

    var currentCard = null;
    var currentRequest = 0;

    var observer = null;
    var started = false;

    var scanTimer = null;

    // --------------------------------------------------
    // CSS
    // --------------------------------------------------

    var css = '' +

        '.tml-logo-host{' +
            'position:relative !important;' +
            'color:transparent !important;' +
            'text-shadow:none !important;' +
        '}' +

        '.tml-logo-host .tml-logo-image{' +
            'position:absolute !important;' +
            'left:0 !important;' +
            'top:50% !important;' +
            'display:block !important;' +
            'width:auto !important;' +
            'height:auto !important;' +
            'max-width:min(85vw,30em) !important;' +
            'max-height:2.2em !important;' +
            'object-fit:contain !important;' +
            'object-position:left center !important;' +
            'opacity:0 !important;' +
            'transform:translateY(-46%) !important;' +
            'transition:opacity .4s ease !important;' +
            'pointer-events:none !important;' +
            'filter:none !important;' +
            'box-shadow:none !important;' +
        '}' +

        '.tml-logo-host.tml-logo-visible .tml-logo-image{' +
            'opacity:1 !important;' +
        '}' +

        '@media screen and (max-width:768px){' +

            '.tml-logo-host .tml-logo-image{' +
                'max-width:80vw !important;' +
                'max-height:2em !important;' +
            '}' +

        '}';

    // --------------------------------------------------
    // HELPERS
    // --------------------------------------------------

    function getLanguage() {
        return Lampa.Storage.field('tmdb_lang') || 'en';
    }

    function getType(card) {
        if (!card) return '';

        var type =
            card.method ||
            card.media_type ||
            card.type ||
            '';

        if (type === 'movie' || type === 'tv') {
            return type;
        }

        return '';
    }

    function getId(card) {
        return card && card.id
            ? String(card.id)
            : '';
    }

    function getTitle(card) {
        if (!card) return '';

        return (
            card.title ||
            card.name ||
            card.original_title ||
            card.original_name ||
            ''
        );
    }

    function makeKey(card) {
        return [
            getType(card),
            getId(card),
            getLanguage()
        ].join('_');
    }

    function validCard(card) {
        return !!(
            card &&
            getId(card) &&
            getType(card)
        );
    }

    // --------------------------------------------------
    // CACHE
    // --------------------------------------------------

    function loadCache() {
        try {
            var saved = Lampa.Storage.get(CACHE_KEY, {});

            if (
                saved &&
                typeof saved === 'object' &&
                !Array.isArray(saved)
            ) {
                cache = saved;
            }
        } catch (e) {
            cache = {};
        }
    }

    function saveCache(key, value) {
        cache[key] = value || false;

        var keys = Object.keys(cache);

        if (keys.length > CACHE_LIMIT) {
            var limited = {};

            keys.slice(-CACHE_LIMIT).forEach(function (k) {
                limited[k] = cache[k];
            });

            cache = limited;
        }

        try {
            Lampa.Storage.set(CACHE_KEY, cache);
        } catch (e) {}
    }

    // --------------------------------------------------
    // LOGO LANGUAGE SELECTION
    // --------------------------------------------------

    function pickLogo(logos) {
        if (!logos || !logos.length) return null;

        var lang = getLanguage();

        var order = [];

        if (lang) order.push(lang);

        if (order.indexOf('en') < 0) {
            order.push('en');
        }

        order.push(null);

        for (var i = 0; i < order.length; i++) {
            var found = logos.filter(function (logo) {
                return logo.iso_639_1 === order[i];
            })[0];

            if (found) return found;
        }

        return logos[0] || null;
    }

    // --------------------------------------------------
    // LOAD LOGO
    // --------------------------------------------------

    function loadLogo(card, callback) {
        var key = makeKey(card);

        if (Object.prototype.hasOwnProperty.call(cache, key)) {
            callback(cache[key] || null);
            return;
        }

        if (pending[key]) {
            pending[key].push(callback);
            return;
        }

        pending[key] = [callback];

        var completed = false;

        var timer = setTimeout(function () {
            finish(null);
        }, REQUEST_TIMEOUT);

        function finish(url) {
            if (completed) return;

            completed = true;

            clearTimeout(timer);

            saveCache(key, url);

            var callbacks = pending[key] || [];

            delete pending[key];

            callbacks.forEach(function (fn) {
                try {
                    fn(url || null);
                } catch (e) {}
            });
        }

        try {
            var type = getType(card);
            var id = getId(card);
            var lang = getLanguage();

            tmdb.get(
                type + '/' + id + '/images',

                {
                    filter: {
                        include_image_language: lang + ',en,null'
                    }
                },

                function (json) {
                    var logo = pickLogo(
                        json && json.logos
                            ? json.logos
                            : []
                    );

                    if (!logo || !logo.file_path) {
                        finish(null);
                        return;
                    }

                    var url = Lampa.Api.img(
                        logo.file_path,
                        'w500'
                    );

                    finish(url);
                },

                function () {
                    finish(null);
                }
            );
        } catch (e) {
            finish(null);
        }
    }

    // --------------------------------------------------
    // FIND STANDARD FULL TITLE
    // --------------------------------------------------

    function findTitle() {
        var selectors = [
            '.full-start__title',
            '.full-start__name',
            '.full-start__title-text',
            '.full-start h1',
            '.full-start h2'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var elements = document.querySelectorAll(selectors[i]);

            for (var j = 0; j < elements.length; j++) {
                var el = elements[j];

                if (!el || !el.isConnected) continue;

                if (
                    el.closest('.full-start') ||
                    el.closest('.full')
                ) {
                    return $(el);
                }
            }
        }

        return $();
    }

    // --------------------------------------------------
    // REMOVE LOGO
    // --------------------------------------------------

    function restoreTitle() {
        var title = findTitle();

        if (!title.length) return;

        title.removeClass(
            'tml-logo-host tml-logo-visible'
        );

        title.find('.tml-logo-image').remove();

        title.removeAttr('data-tml-key');
    }

    // --------------------------------------------------
    // DISPLAY LOGO
    // --------------------------------------------------

    function displayLogo(card, url, requestId) {
        if (requestId !== currentRequest) return;
        if (currentCard !== card) return;

        var title = findTitle();

        if (!title.length) return;

        if (!url) {
            restoreTitle();
            return;
        }

        var key = makeKey(card);

        if (
            title.attr('data-tml-key') === key &&
            title.find('.tml-logo-image').length
        ) {
            return;
        }

        title.find('.tml-logo-image').remove();

        title.removeClass('tml-logo-visible');

        title.addClass('tml-logo-host');

        title.attr('data-tml-key', key);

        var image = $('<img>')
            .addClass('tml-logo-image')
            .attr('alt', getTitle(card))
            .attr('draggable', 'false');

        image.on('load', function () {
            if (requestId !== currentRequest) return;
            if (currentCard !== card) return;

            if (!title.length || !title[0].isConnected) return;

            title.addClass('tml-logo-visible');
        });

        image.on('error', function () {
            if (requestId !== currentRequest) return;

            title.removeClass(
                'tml-logo-host tml-logo-visible'
            );

            image.remove();
        });

        title.append(image);

        image.attr('src', url);
    }

    // --------------------------------------------------
    // PROCESS CARD
    // --------------------------------------------------

    function processCard(card) {
        if (!validCard(card)) return;

        var title = findTitle();

        if (!title.length) return;

        var key = makeKey(card);

        if (
            currentCard === card &&
            title.attr('data-tml-key') === key &&
            title.find('.tml-logo-image').length
        ) {
            return;
        }

        currentCard = card;

        var requestId = ++currentRequest;

        restoreTitle();

        loadLogo(card, function (url) {
            displayLogo(card, url, requestId);
        });
    }

    // --------------------------------------------------
    // EXTRACT CARD
    // --------------------------------------------------

    function extractCard(object) {
        if (!object) return null;

        var candidates = [
            object.card,
            object.movie,
            object.data,
            object.activity && object.activity.card,
            object.activity && object.activity.object,
            object.object,
            object
        ];

        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];

            if (validCard(candidate)) {
                return candidate;
            }
        }

        return null;
    }

    // --------------------------------------------------
    // ACTIVITY EVENT
    // --------------------------------------------------

    function onActivity(event) {
        if (!event || event.component !== 'full') return;

        if (
            event.type === 'init' ||
            event.type === 'create' ||
            event.type === 'start'
        ) {
            var card = extractCard(event.object);

            if (card) {
                currentCard = card;

                currentRequest++;

                setTimeout(function () {
                    processCard(card);
                }, 150);
            }
        }

        if (event.type === 'destroy') {
            currentRequest++;

            currentCard = null;

            clearTimeout(scanTimer);
        }
    }

    // --------------------------------------------------
    // FULL EVENT
    // --------------------------------------------------

    function onFull(event) {
        if (!event) return;

        var card = extractCard(event.object);

        if (!card) {
            card = extractCard(event);
        }

        if (card) {
            currentCard = card;

            var requestId = ++currentRequest;

            setTimeout(function () {
                if (requestId !== currentRequest) return;

                processCard(card);
            }, 100);
        }
    }

    // --------------------------------------------------
    // DOM OBSERVER
    // --------------------------------------------------

    function scheduleScan() {
        clearTimeout(scanTimer);

        scanTimer = setTimeout(function () {
            if (!currentCard) return;

            var title = findTitle();

            if (!title.length) return;

            var key = makeKey(currentCard);

            if (
                title.attr('data-tml-key') !== key ||
                !title.find('.tml-logo-image').length
            ) {
                processCard(currentCard);
            }
        }, 100);
    }

    function startObserver() {
        if (observer || !document.body) return;

        observer = new MutationObserver(function () {
            if (!currentCard) return;

            scheduleScan();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // --------------------------------------------------
    // INITIALIZATION
    // --------------------------------------------------

    function start() {
        if (started) return;

        started = true;

        loadCache();

        var style = document.createElement('style');

        style.id = 'tmdb-movie-logos-v101-style';

        style.textContent = css;

        document.head.appendChild(style);

        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('activity', onActivity);
            Lampa.Listener.follow('full', onFull);
        }

        startObserver();
    }

    // --------------------------------------------------
    // APP READY
    // --------------------------------------------------

    if (window.appready) {
        start();
    } else if (Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                start();
            }
        });
    }

})();
