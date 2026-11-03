
(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.0.0
     *
     * Lampa / Android TV / Mobile
     *
     * FEATURES:
     * - Standard Lampa Full Card
     * - TMDB movie and TV logos
     * - Language priority: Lampa > English > No language
     * - W500 logo quality
     * - Logo cache
     * - Smooth fade-in animation
     * - Original title fallback
     * - Safe asynchronous loading
     * - No modifications to other card elements
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_ready) return;

    window.tmdb_movie_logos_ready = true;

    var VERSION = '1.0.0';

    var CACHE_KEY = 'tmdb_movie_logos_cache_v100';

    var CACHE_LIMIT = 500;

    var tmdb = Lampa.Api.sources.tmdb;

    var memoryCache = {};

    var currentCard = null;
    var currentRequest = 0;

    var observer = null;
    var styleElement = null;

    var started = false;

    // --------------------------------------------------
    // CSS
    // --------------------------------------------------

    var css = '' +

        '.tml-title-host{' +
            'position:relative !important;' +
            'transition:color .35s ease;' +
        '}' +

        '.tml-title-host.tml-logo-active{' +
            'color:transparent !important;' +
            'text-shadow:none !important;' +
        '}' +

        '.tml-title-host .tml-logo-image{' +
            'position:absolute;' +
            'left:0;' +
            'top:50%;' +
            'display:block;' +
            'width:auto;' +
            'height:auto;' +
            'max-width:min(85vw, 30em);' +
            'max-height:2.2em;' +
            'object-fit:contain;' +
            'object-position:left center;' +
            'opacity:0;' +
            'transform:translateY(-46%);' +
            'transition:opacity .4s ease;' +
            'pointer-events:none;' +
            'filter:none !important;' +
            'box-shadow:none !important;' +
        '}' +

        '.tml-title-host.tml-logo-active .tml-logo-image{' +
            'opacity:1;' +
        '}' +

        '@media screen and (max-width:768px){' +

            '.tml-title-host .tml-logo-image{' +
                'max-width:80vw;' +
                'max-height:2em;' +
            '}' +

        '}';

    // --------------------------------------------------
    // HELPERS
    // --------------------------------------------------

    function getLanguage() {
        return Lampa.Storage.field('tmdb_lang') || 'en';
    }

    function getMediaType(card) {
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

    function getCardId(card) {
        if (!card || !card.id) return '';

        return String(card.id);
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

    function makeKey(type, id, lang) {
        return type + '_' + id + '_' + lang;
    }

    // --------------------------------------------------
    // CACHE
    // --------------------------------------------------

    function getCache() {
        var cache = {};

        try {
            cache = Lampa.Storage.get(CACHE_KEY, {}) || {};
        } catch (e) {}

        if (typeof cache !== 'object' || Array.isArray(cache)) {
            cache = {};
        }

        return cache;
    }

    function saveCache(key, value) {
        memoryCache[key] = value || false;

        var cache = getCache();

        cache[key] = value || false;

        var keys = Object.keys(cache);

        if (keys.length > CACHE_LIMIT) {
            keys = keys.slice(keys.length - CACHE_LIMIT);

            var limited = {};

            keys.forEach(function (k) {
                limited[k] = cache[k];
            });

            cache = limited;
        }

        try {
            Lampa.Storage.set(CACHE_KEY, cache);
        } catch (e) {}
    }

    function readCache(key) {
        if (memoryCache[key] !== undefined) {
            return {
                found: true,
                value: memoryCache[key] || null
            };
        }

        var cache = getCache();

        if (Object.prototype.hasOwnProperty.call(cache, key)) {
            memoryCache[key] = cache[key] || false;

            return {
                found: true,
                value: cache[key] || null
            };
        }

        return {
            found: false,
            value: null
        };
    }

    // --------------------------------------------------
    // LOGO SELECTION
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
    // TMDB REQUEST
    // --------------------------------------------------

    function loadLogo(card, callback) {
        var type = getMediaType(card);
        var id = getCardId(card);

        if (!type || !id || !tmdb) {
            callback(null);
            return;
        }

        var lang = getLanguage();
        var key = makeKey(type, id, lang);

        var cached = readCache(key);

        if (cached.found) {
            callback(cached.value);
            return;
        }

        var completed = false;

        function finish(url) {
            if (completed) return;

            completed = true;

            saveCache(key, url);

            callback(url || null);
        }

        var timeout = setTimeout(function () {
            finish(null);
        }, 15000);

        function complete(url) {
            clearTimeout(timeout);
            finish(url);
        }

        try {
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
                        complete(null);
                        return;
                    }

                    complete(
                        Lampa.Api.img(
                            logo.file_path,
                            'w500'
                        )
                    );
                },

                function () {
                    complete(null);
                }
            );
        } catch (e) {
            complete(null);
        }
    }

    // --------------------------------------------------
    // TITLE ELEMENT
    // --------------------------------------------------

    function findTitle() {
        var selectors = [
            '.full-start__title',
            '.full-start__name'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var element = document.querySelector(
                '.full ' + selectors[i]
            );

            if (element) return $(element);
        }

        return $();
    }

    // --------------------------------------------------
    // REMOVE LOGO
    // --------------------------------------------------

    function removeLogo() {
        var title = findTitle();

        if (!title.length) return;

        title.removeClass('tml-title-host tml-logo-active');

        title.find('.tml-logo-image').remove();

        title.removeAttr('data-tml-key');
    }

    // --------------------------------------------------
    // RESTORE TITLE
    // --------------------------------------------------

    function restoreTitle(title) {
        if (!title || !title.length) return;

        title.removeClass('tml-logo-active');

        title.find('.tml-logo-image').remove();
    }

    // --------------------------------------------------
    // DISPLAY LOGO
    // --------------------------------------------------

    function displayLogo(card, url, requestId) {
        if (requestId !== currentRequest) return;

        if (!currentCard || currentCard !== card) return;

        var title = findTitle();

        if (!title.length) return;

        if (!url) {
            restoreTitle(title);
            return;
        }

        var key = makeKey(
            getMediaType(card),
            getCardId(card),
            getLanguage()
        );

        if (title.attr('data-tml-key') === key &&
            title.hasClass('tml-logo-active')) {
            return;
        }

        restoreTitle(title);

        title.addClass('tml-title-host');

        title.attr('data-tml-key', key);

        var image = $('<img>')
            .addClass('tml-logo-image')
            .attr('alt', getTitle(card))
            .attr('draggable', 'false');

        image.on('load', function () {
            if (requestId !== currentRequest) return;

            if (!currentCard || currentCard !== card) return;

            if (!title.length || !title[0].isConnected) return;

            title.addClass('tml-logo-active');
        });

        image.on('error', function () {
            if (requestId !== currentRequest) return;

            restoreTitle(title);
        });

        image.attr('src', url);

        title.append(image);
    }

    // --------------------------------------------------
    // PROCESS CARD
    // --------------------------------------------------

    function processCard(card) {
        if (!card) return;

        var type = getMediaType(card);
        var id = getCardId(card);

        if (!type || !id) return;

        var title = findTitle();

        if (!title.length) return;

        var key = makeKey(
            type,
            id,
            getLanguage()
        );

        if (
            title.attr('data-tml-key') === key &&
            title.hasClass('tml-logo-active')
        ) {
            return;
        }

        if (
            currentCard &&
            getMediaType(currentCard) === type &&
            getCardId(currentCard) === id &&
            currentCard === card
        ) {
            return;
        }

        currentCard = card;

        var requestId = ++currentRequest;

        restoreTitle(title);

        loadLogo(card, function (url) {
            displayLogo(card, url, requestId);
        });
    }

    // --------------------------------------------------
    // EXTRACT CARD FROM FULL EVENT
    // --------------------------------------------------

    function extractCard(event) {
        if (!event) return null;

        var object = event.object || event;

        if (!object) return null;

        var candidates = [
            object.movie,
            object.card,
            object.data,
            object,
            object.activity && object.activity.card
        ];

        for (var i = 0; i < candidates.length; i++) {
            var card = candidates[i];

            if (
                card &&
                card.id &&
                getMediaType(card)
            ) {
                return card;
            }
        }

        return null;
    }

    // --------------------------------------------------
    // FULL COMPONENT LISTENER
    // --------------------------------------------------

    function onFullEvent(event) {
        if (!event) return;

        if (event.type === 'complite') {
            var card = extractCard(event);

            if (card) {
                currentCard = null;

                setTimeout(function () {
                    processCard(card);
                }, 100);
            }
        }

        if (event.type === 'destroy') {
            currentRequest++;

            currentCard = null;
        }
    }

    // --------------------------------------------------
    // DOM OBSERVER
    // --------------------------------------------------

    function startObserver() {
        if (observer || !document.body) return;

        observer = new MutationObserver(function () {
            if (!currentCard) return;

            var title = findTitle();

            if (!title.length) return;

            var key = makeKey(
                getMediaType(currentCard),
                getCardId(currentCard),
                getLanguage()
            );

            if (
                title.attr('data-tml-key') !== key ||
                !title.find('.tml-logo-image').length
            ) {
                processCard(currentCard);
            }
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

        styleElement = document.createElement('style');

        styleElement.id = 'tmdb-movie-logos-style-v100';

        styleElement.textContent = css;

        document.head.appendChild(styleElement);

        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('full', onFullEvent);
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
