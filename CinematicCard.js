(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.1.0
     *
     * Lampa / Android TV
     *
     * FEATURES:
     * - Standard Lampa full card
     * - Movies and TV series
     * - TMDB logo search
     * - Same logo selection as Кінотрейлери 2.3
     * - Same TMDB request method
     * - Same image URL generation
     * - Same per-item request cache
     * - Logo replaces standard title
     * - Original title preserved if logo unavailable
     * - No shadows / no filters
     * - No background or metadata modifications
     *
     * 1.1.0:
     * - Rebuilt using the verified full-card event
     * - Uses ev.data.movie
     * - Uses .full-start-new__title
     * - Uses the exact Кінотрейлери 2.3 logo algorithm
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_v110_ready) return;

    window.tmdb_movie_logos_v110_ready = true;

    var tmdb = Lampa.Api.sources.tmdb;

    if (!tmdb) return;

    var currentCard = null;
    var currentTitle = null;
    var currentImage = null;
    var currentToken = 0;

    var CACHE_TIMEOUT = 20000;

    // --------------------------------------------------
    // LOGO LANGUAGE PRIORITY
    // Same as Кінотрейлери 2.3
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
    // Same principle as Кінотрейлери 2.3
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
    // Exact request logic from Кінотрейлери 2.3
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
    // Same detection as the working plugin
    // --------------------------------------------------

    function getCardType(card) {
        return card.name ? 'tv' : 'movie';
    }

    // --------------------------------------------------
    // RESTORE ORIGINAL TITLE
    // --------------------------------------------------

    function restoreTitle() {
        if (currentImage) {
            currentImage.onload = null;
            currentImage.onerror = null;
        }

        currentImage = null;
        currentTitle = null;
        currentCard = null;

        currentToken++;
    }

    // --------------------------------------------------
    // FIND TITLE BLOCK
    // Standard Lampa full card
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
    // DISPLAY LOGO
    // Same image presentation approach as Кінотрейлери
    // --------------------------------------------------

    function displayLogo(url, titleBlock, token) {
        if (!url || !titleBlock || !titleBlock.length) return;

        if (token !== currentToken) return;

        var img = new Image();

        img.style.display = 'block';
        img.style.width = '7em';
        img.style.height = 'auto';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '8em';
        img.style.objectFit = 'contain';
        img.style.objectPosition = 'left center';
        img.style.margin = '0';
        img.style.padding = '0';
        img.style.border = '0';
        img.style.boxShadow = 'none';
        img.style.filter = 'none';

        currentImage = img;

        img.onload = function () {
            if (token !== currentToken) return;

            if (!currentTitle || !currentTitle.length) return;

            if (!currentTitle.closest('.full-start-new').length) return;

            // Replace only the title.
            // All other card elements remain untouched.

            currentTitle.empty().append(img);
        };

        img.onerror = function () {
            if (token !== currentToken) return;

            currentImage = null;

            // Restore the original text if the logo fails.
            if (currentTitle && currentTitle.length) {
                currentTitle.text(currentCardTitle);
            }
        };

        img.src = url;
    }

    // --------------------------------------------------
    // CURRENT TITLE
    // --------------------------------------------------

    var currentCardTitle = '';

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

        // Keep the original title visible while the logo loads.

        ensureLogo(card, type, function (url) {
            if (token !== currentToken) return;

            if (currentCard !== card) return;

            if (!url) return;

            if (!currentTitle || !currentTitle.length) return;

            // Preload the image and replace the title
            // only after successful loading.

            displayLogo(url, currentTitle, token);
        });
    }

    // --------------------------------------------------
    // FULL CARD LISTENER
    // Same event and lifecycle as the working plugin
    // --------------------------------------------------

    Lampa.Listener.follow('full', function (ev) {
        if (!ev) return;

        if (ev.type === 'complite') {
            processCard(ev);
        }

        if (ev.type === 'destroy') {
            restoreTitle();
        }
    });

})();
