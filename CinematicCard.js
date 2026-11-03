
(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.3.0
     *
     * Lampa / Android TV
     *
     * - Standard Lampa full card
     * - Movies and TV series
     * - TMDB logo loading
     * - Same logo selection as Кінотрейлери 2.3
     * - Same cache logic
     * - Immediate display from cache
     * - No text title
     * - No custom opacity animation
     * - No shadows / filters
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_v130_ready) return;

    window.tmdb_movie_logos_v130_ready = true;

    var tmdb = Lampa.Api.sources.tmdb;

    if (!tmdb) return;

    var currentCard = null;
    var currentTitle = null;
    var currentImage = null;
    var currentToken = 0;

    var CACHE_TIMEOUT = 20000;

    /*
     * TMDB logo selection
     * Same algorithm as Кінотрейлери 2.3
     */
    function pickLogo(logos) {
        var order = [
            Lampa.Storage.field('tmdb_lang'),
            'en',
            null
        ];

        for (var i = 0; i < order.length; i++) {
            var found = logos.filter(function (logo) {
                return logo.iso_639_1 === order[i];
            })[0];

            if (found) return found;
        }

        return logos[0] || null;
    }

    /*
     * Cache
     * Same request coalescing and timeout logic
     * as Кінотрейлери 2.3
     */
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
        }, CACHE_TIMEOUT);

        function finish(value) {
            if (completed) return;

            completed = true;

            clearTimeout(timer);

            item[key] = value || null;

            var list = item[key + '_wait'] || [];

            item[key + '_wait'] = null;

            list.forEach(function (callback) {
                try {
                    callback(item[key]);
                } catch (e) {}
            });
        }

        try {
            request(finish);
        } catch (e) {
            finish(null);
        }
    }

    /*
     * TMDB logo request
     * Same language filter and image size
     * as Кінотрейлери 2.3
     */
    function ensureLogo(item, type, cb) {
        cached(item, 'tml_logo', function (done) {
            var lang = Lampa.Storage.field('tmdb_lang');
            var langs = (lang || 'en') + ',en,null';

            tmdb.get(
                type + '/' + item.id + '/images',
                {
                    filter: {
                        include_image_language: langs
                    }
                },
                function (json) {
                    var logo = json &&
                        json.logos &&
                        json.logos.length
                            ? pickLogo(json.logos)
                            : null;

                    done(
                        logo
                            ? Lampa.Api.img(logo.file_path, 'w500')
                            : null
                    );
                },
                function () {
                    done(null);
                }
            );
        }, cb);
    }

    /*
     * Card type
     */
    function getCardType(card) {
        return card.name ? 'tv' : 'movie';
    }

    /*
     * CSS
     */
    function addCSS() {
        if (document.getElementById('tmdb_movie_logos_v130_css')) return;

        var css = document.createElement('style');

        css.id = 'tmdb_movie_logos_v130_css';

        css.textContent =
            '.full-start-new__title .tml-logo-image{' +
                'display:none;' +
                'width:7em;' +
                'height:auto;' +
                'max-width:100%;' +
                'max-height:8em;' +
                'object-fit:contain;' +
                'object-position:left center;' +
                'margin:0;' +
                'padding:0;' +
                'border:0;' +
                'box-shadow:none;' +
                'filter:none;' +
            '}';

        document.head.appendChild(css);
    }

    /*
     * Get standard Lampa title block
     */
    function getTitleBlock(ev) {
        try {
            if (
                !ev ||
                !ev.object ||
                !ev.object.activity ||
                typeof ev.object.activity.render !== 'function'
            ) {
                return $();
            }

            return ev.object.activity
                .render()
                .find('.full-start-new__title')
                .first();

        } catch (e) {
            return $();
        }
    }

    /*
     * Clear previous card state
     */
    function clearCurrent() {
        if (currentImage) {
            currentImage.off('error');
        }

        currentCard = null;
        currentTitle = null;
        currentImage = null;
    }

    /*
     * Create logo element immediately.
     * Text title is not displayed.
     */
    function prepareLogo(titleBlock) {
        var logo = $('<img class="tml-logo-image" alt="">');

        titleBlock.empty();
        titleBlock.append(logo);

        return logo;
    }

    /*
     * Display logo
     * Same sequence as Кінотрейлери:
     * attr('src', url).show()
     */
    function displayLogo(url, logo, token) {
        if (!url || !logo || !logo.length) return;
        if (token !== currentToken) return;

        logo.off('error');

        logo.on('error', function () {
            if (token !== currentToken) return;

            logo.hide();
        });

        logo.attr('src', url).show();
    }

    /*
     * Process standard Lampa card
     */
    function processCard(ev) {
        if (!ev || ev.type !== 'complite') return;

        var card = ev.data && ev.data.movie;

        if (!card || !card.id) return;

        var titleBlock = getTitleBlock(ev);

        if (!titleBlock.length) return;

        clearCurrent();

        var token = ++currentToken;
        var type = getCardType(card);

        currentCard = card;
        currentTitle = titleBlock;

        var logo = prepareLogo(titleBlock);

        currentImage = logo;

        ensureLogo(card, type, function (url) {
            if (token !== currentToken) return;
            if (currentCard !== card) return;

            if (!url) {
                logo.hide();
                return;
            }

            displayLogo(url, logo, token);
        });
    }

    /*
     * Lampa events
     */
    Lampa.Listener.follow('full', function (ev) {
        if (!ev) return;

        if (ev.type === 'complite') {
            addCSS();
            processCard(ev);
        }

        if (ev.type === 'destroy') {
            clearCurrent();
            currentToken++;
        }
    });

    addCSS();

})();
