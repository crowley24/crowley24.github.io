(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.1.1
     *
     * Lampa / Android TV
     *
     * - Standard Lampa full card
     * - Movies and TV series
     * - TMDB logo search
     * - Same logo algorithm as Кінотрейлери 2.3
     * - Immediate title hiding
     * - Logo appears after image preload
     * - Original title restored on failure
     * - No shadows / filters
     * - No other card modifications
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_v111_ready) return;

    window.tmdb_movie_logos_v111_ready = true;

    var tmdb = Lampa.Api.sources.tmdb;

    if (!tmdb) return;

    var currentCard = null;
    var currentTitle = null;
    var currentImage = null;
    var currentToken = 0;
    var currentCardTitle = '';

    var CACHE_TIMEOUT = 20000;

    // --------------------------------------------------
    // LOGO LANGUAGE PRIORITY
    // --------------------------------------------------

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

    // --------------------------------------------------
    // SAFE CACHE
    // --------------------------------------------------

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

    // --------------------------------------------------
    // LOGO CACHE
    // --------------------------------------------------

    function ensureLogo(item, type, cb) {
        cached(item, 'tfeed_logo', function (done) {
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
                    var logo = json.logos && json.logos.length
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

    // --------------------------------------------------
    // CARD TYPE
    // --------------------------------------------------

    function getCardType(card) {
        return card.name ? 'tv' : 'movie';
    }

    // --------------------------------------------------
    // RESTORE TITLE
    // --------------------------------------------------

    function restoreTitle() {
        if (currentImage) {
            currentImage.onload = null;
            currentImage.onerror = null;
        }

        if (currentTitle && currentTitle.length) {
            currentTitle
                .removeClass('tml-title-hidden')
                .removeClass('tml-logo-ready');

            currentTitle.find('.tml-logo-image').remove();
        }

        currentImage = null;
        currentTitle = null;
        currentCard = null;
        currentToken++;
    }

    // --------------------------------------------------
    // CSS
    // --------------------------------------------------

    function addCSS() {
        if (document.getElementById('tmdb_movie_logos_v111_css')) return;

        var css = document.createElement('style');

        css.id = 'tmdb_movie_logos_v111_css';

        css.textContent =
            '.full-start-new__title.tml-title-hidden{' +
                'color:transparent!important;' +
                'text-shadow:none!important;' +
            '}' +

            '.full-start-new__title.tml-title-hidden *{' +
                'visibility:hidden!important;' +
            '}' +

            '.full-start-new__title .tml-logo-image{' +
                'display:block;' +
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
                'opacity:0;' +
                'transition:opacity .35s ease;' +
            '}' +

            '.full-start-new__title.tml-logo-ready .tml-logo-image{' +
                'opacity:1;' +
            '}';

        document.head.appendChild(css);
    }

    // --------------------------------------------------
    // DISPLAY LOGO
    // --------------------------------------------------

    function displayLogo(url, titleBlock, token) {
        if (!url || !titleBlock || !titleBlock.length) return;

        if (token !== currentToken) return;

        var img = new Image();

        img.className = 'tml-logo-image';

        img.onload = function () {
            if (token !== currentToken) return;
            if (!currentTitle || !currentTitle.length) return;

            currentTitle.find('.tml-logo-image').remove();

            currentTitle.append(img);

            requestAnimationFrame(function () {
                if (token !== currentToken) return;

                currentTitle.addClass('tml-logo-ready');
            });

            currentImage = null;
        };

        img.onerror = function () {
            if (token !== currentToken) return;

            currentImage = null;

            if (currentTitle && currentTitle.length) {
                currentTitle
                    .removeClass('tml-title-hidden')
                    .removeClass('tml-logo-ready');
            }
        };

        currentImage = img;
        img.src = url;
    }

    // --------------------------------------------------
    // FIND TITLE BLOCK
    // --------------------------------------------------

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

    // --------------------------------------------------
    // PROCESS FULL CARD
    // --------------------------------------------------

    function processCard(ev) {
        if (!ev || ev.type !== 'complite') return;

        var card = ev.data && ev.data.movie;

        if (!card || !card.id) return;

        var titleBlock = getTitleBlock(ev);

        if (!titleBlock.length) return;

        var type = getCardType(card);
        var token = ++currentToken;

        currentCard = card;
        currentTitle = titleBlock;
        currentImage = null;

        currentCardTitle = titleBlock.text().trim();

        if (!currentCardTitle) {
            currentCardTitle =
                card.title ||
                card.name ||
                card.original_title ||
                card.original_name ||
                '';
        }

        // Hide the text immediately.
        titleBlock
            .removeClass('tml-logo-ready')
            .addClass('tml-title-hidden');

        ensureLogo(card, type, function (url) {
            if (token !== currentToken) return;
            if (currentCard !== card) return;

            if (!url) {
                titleBlock.removeClass('tml-title-hidden');
                return;
            }

            displayLogo(url, titleBlock, token);
        });
    }

    // --------------------------------------------------
    // FULL CARD LISTENER
    // --------------------------------------------------

    Lampa.Listener.follow('full', function (ev) {
        if (!ev) return;

        if (ev.type === 'complite') {
            addCSS();
            processCard(ev);
        }

        if (ev.type === 'destroy') {
            restoreTitle();
        }
    });

    addCSS();

})();
