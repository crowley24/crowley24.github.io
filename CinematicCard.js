
(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.4.0 — CINEMATIC MODE
     *
     * Lampa / Android TV
     *
     * LOGO:
     * - TMDB logos for movies and TV series
     * - Same logo selection as Кінотрейлери 2.3
     * - Same cache logic as 1.3.1
     * - Immediate display from cache
     * - Original title fallback
     * - Original title restored if image loading fails
     *
     * CINEMATIC MODE:
     * - Standard Lampa backdrop preserved
     * - Poster hidden
     * - Information block positioned bottom-left
     * - TMDB logo above metadata
     * - Short description below metadata
     * - Native Lampa buttons preserved
     * - Reactions hidden
     * - No custom background or backdrop effects
     * - No shadows or filters
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_v140_ready) return;

    window.tmdb_movie_logos_v140_ready = true;

    var tmdb = Lampa.Api.sources.tmdb;

    if (!tmdb) return;

    var currentCard = null;
    var currentTitle = null;
    var currentImage = null;
    var currentToken = 0;

    var CACHE_TIMEOUT = 20000;

    var CSS_ID = 'tmdb_movie_logos_v140_css';

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
     * Original request coalescing and timeout logic
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
     *
     * The default Lampa backdrop is not modified.
     * Native button elements are not recreated.
     */
    function addCSS() {
        if (document.getElementById(CSS_ID)) return;

        var css = document.createElement('style');

        css.id = CSS_ID;

        css.textContent =

            /*
             * Cinematic card positioning
             */
            '.full-start-new{' +
                'position:relative;' +
            '}' +

            '.full-start-new__body{' +
                'position:relative;' +
                'display:block;' +
                'min-height:calc(100vh - 10rem);' +
                'height:auto;' +
            '}' +

            /*
             * Hide poster completely
             */
            '.full-start-new__left{' +
                'display:none !important;' +
            '}' +

            /*
             * Information block
             * Bottom-left positioning
             */
            '.full-start-new__right{' +
                'position:absolute !important;' +
                'left:0 !important;' +
                'bottom:0 !important;' +
                'width:58% !important;' +
                'max-width:58% !important;' +
                'margin:0 !important;' +
                'padding:0 !important;' +
                'display:flex;' +
                'flex-direction:column;' +
                'align-items:flex-start;' +
                'box-sizing:border-box;' +
                'z-index:2;' +
            '}' +

            /*
             * Year and country line
             */
            '.full-start-new__head{' +
                'display:block;' +
                'margin:0 0 0.65em 0;' +
                'font-size:1em;' +
                'line-height:1.35;' +
                'opacity:0.82;' +
            '}' +

            /*
             * Title / TMDB logo
             */
            '.full-start-new__title{' +
                'display:flex;' +
                'align-items:flex-start;' +
                'justify-content:flex-start;' +
                'width:100%;' +
                'min-height:0;' +
                'margin:0 0 0.65em 0;' +
                'padding:0;' +
                'font-size:2.2em;' +
                'line-height:1.1;' +
            '}' +

            '.full-start-new__title .tml-logo-image{' +
                'display:none;' +
                'width:auto;' +
                'height:auto;' +
                'max-width:100%;' +
                'max-height:4.2em;' +
                'object-fit:contain;' +
                'object-position:left center;' +
                'margin:0;' +
                'padding:0;' +
                'border:0;' +
                'box-shadow:none;' +
                'filter:none;' +
            '}' +

            /*
             * Tagline
             */
            '.full-start-new__tagline{' +
                'margin:0 0 0.6em 0;' +
            '}' +

            /*
             * Ratings row
             */
            '.full-start-new__rate-line{' +
                'display:flex;' +
                'align-items:center;' +
                'flex-wrap:wrap;' +
                'gap:0.65em;' +
                'margin:0 0 0.55em 0;' +
            '}' +

            /*
             * Metadata
             */
            '.full-start-new__details{' +
                'display:block;' +
                'width:100%;' +
                'margin:0 0 0.75em 0;' +
                'line-height:1.5;' +
                'font-size:0.95em;' +
                'opacity:0.9;' +
            '}' +

            /*
             * Short description
             */
            '.tml-cinematic-description{' +
                'display:-webkit-box;' +
                'width:100%;' +
                'max-width:100%;' +
                'margin:0 0 1.1em 0;' +
                'padding:0;' +
                'overflow:hidden;' +
                'font-size:1em;' +
                'line-height:1.45;' +
                'opacity:0.9;' +
                '-webkit-box-orient:vertical;' +
                '-webkit-line-clamp:3;' +
                'line-clamp:3;' +
            '}' +

            /*
             * Native Lampa buttons
             */
            '.full-start-new__buttons{' +
                'display:flex;' +
                'align-items:center;' +
                'flex-wrap:wrap;' +
                'gap:0.45em;' +
                'width:100%;' +
                'margin:0;' +
                'padding:0;' +
            '}' +

            /*
             * Hide reactions
             */
            '.full-start-new__reactions{' +
                'display:none !important;' +
            '}' +

            /*
             * Hide separate full description section
             */
            '.full-descr,' +
            '.full-start__description,' +
            '.full-start__descr,' +
            '.full-description{' +
                'display:none !important;' +
            '}' +

            /*
             * Remove tagline spacing when empty
             */
            '.full-start-new__tagline:empty{' +
                'display:none !important;' +
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
     * Get standard card root
     */
    function getCardRoot(ev) {
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
                .find('.full-start-new')
                .first();

        } catch (e) {
            return $();
        }
    }

    /*
     * Add cinematic description
     */
    function prepareDescription(root, card) {
        if (!root || !root.length) return;

        var details = root.find(
            '.full-start-new__details'
        ).first();

        if (!details.length) return;

        var description = root.find(
            '.tml-cinematic-description'
        );

        if (!card.overview) {
            description.remove();
            return;
        }

        if (!description.length) {
            description = $('<div class="tml-cinematic-description"></div>');

            description.insertAfter(details);
        }

        description.text(card.overview);
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
     * Create logo element and preserve original title
     */
    function prepareLogo(titleBlock) {
        var original = titleBlock.contents().clone(true, true);

        var logo = $('<img class="tml-logo-image" alt="">');

        titleBlock.empty();
        titleBlock.append(logo);

        return {
            logo: logo,
            original: original
        };
    }

    /*
     * Restore ordinary title
     */
    function showOriginalTitle(titleBlock, original, logo) {
        if (!titleBlock || !titleBlock.length) return;

        if (logo) {
            logo.off('error');
        }

        titleBlock.empty();
        titleBlock.append(original);
    }

    /*
     * Display logo
     * Same sequence as version 1.3.1
     */
    function displayLogo(url, titleBlock, original, logo, token) {
        if (!url || !logo || !logo.length) return;
        if (token !== currentToken) return;

        logo.off('error');

        logo.on('error', function () {
            if (token !== currentToken) return;

            showOriginalTitle(titleBlock, original, logo);
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
        var root = getCardRoot(ev);

        if (!titleBlock.length || !root.length) return;

        clearCurrent();

        var token = ++currentToken;
        var type = getCardType(card);

        currentCard = card;
        currentTitle = titleBlock;

        /*
         * Cinematic description
         */
        prepareDescription(root, card);

        /*
         * TMDB logo
         */
        var elements = prepareLogo(titleBlock);

        currentImage = elements.logo;

        ensureLogo(card, type, function (url) {
            if (token !== currentToken) return;
            if (currentCard !== card) return;

            if (!url) {
                showOriginalTitle(
                    titleBlock,
                    elements.original,
                    elements.logo
                );

                return;
            }

            displayLogo(
                url,
                titleBlock,
                elements.original,
                elements.logo,
                token
            );
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
