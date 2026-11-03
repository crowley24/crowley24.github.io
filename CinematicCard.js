
(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.4.1 — CINEMATIC MODE
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
     * - TMDB logo
     * - Single metadata row: year / rating / genres
     * - Short description below metadata
     * - Native Lampa buttons preserved
     * - Reactions hidden
     * - No custom background or backdrop effects
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_v141_ready) return;

    window.tmdb_movie_logos_v141_ready = true;

    var tmdb = Lampa.Api.sources.tmdb;

    if (!tmdb) return;

    var currentCard = null;
    var currentTitle = null;
    var currentImage = null;
    var currentToken = 0;

    var CACHE_TIMEOUT = 20000;
    var CSS_ID = 'tmdb_movie_logos_v141_css';

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
     * Metadata builder
     *
     * Order:
     * Year · ★ Rating · Genres
     */
    function buildMetadata(card) {
        var parts = [];

        var release = (
            card.release_date ||
            card.first_air_date ||
            ''
        ) + '';

        var year = release ? release.slice(0, 4) : '';

        if (year) {
            parts.push(year);
        }

        var rating = parseFloat(card.vote_average || 0);

        if (rating > 0) {
            if (rating > 10) rating = 10;

            parts.push('★ ' + rating.toFixed(1));
        }

        var genres = (card.genres || [])
            .slice(0, 3)
            .map(function (genre) {
                return genre.name || '';
            })
            .filter(Boolean);

        if (genres.length) {
            parts.push(genres.join(', '));
        }

        return parts;
    }

    /*
     * CSS
     *
     * Default Lampa backdrop remains untouched.
     * Native buttons are not recreated.
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
             * Hide poster
             */
            '.full-start-new__left{' +
                'display:none !important;' +
            '}' +

            /*
             * Information block
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
             * Remove year/country header above logo
             */
            '.full-start-new__head{' +
                'display:none !important;' +
            '}' +

            /*
             * Logo / title
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
             * Metadata row
             */
            '.tml-cinematic-meta{' +
                'display:flex;' +
                'align-items:center;' +
                'flex-wrap:nowrap;' +
                'gap:0.55em;' +
                'width:100%;' +
                'max-width:100%;' +
                'margin:0 0 0.8em 0;' +
                'padding:0;' +
                'overflow:hidden;' +
                'white-space:nowrap;' +
                'font-family:Inter,system-ui,sans-serif;' +
                'font-size:1.05em;' +
                'font-weight:400;' +
                'line-height:1.4;' +
                'color:rgba(255,255,255,.88);' +
                'box-sizing:border-box;' +
            '}' +

            '.tml-cinematic-meta-item{' +
                'display:inline-block;' +
                'flex:0 0 auto;' +
                'white-space:nowrap;' +
            '}' +

            '.tml-cinematic-meta-separator{' +
                'display:inline-block;' +
                'flex:0 0 auto;' +
                'opacity:.65;' +
                'font-size:.9em;' +
            '}' +

            '.tml-cinematic-meta-item:last-child{' +
                'overflow:hidden;' +
                'text-overflow:ellipsis;' +
            '}' +

            /*
             * Hide original rating and details rows
             */
            '.full-start-new__rate-line,' +
            '.full-start-new__details{' +
                'display:none !important;' +
            '}' +

            /*
             * Tagline
             */
            '.full-start-new__tagline{' +
                'margin:0 0 0.6em 0;' +
            '}' +

            '.full-start-new__tagline:empty{' +
                'display:none !important;' +
            '}' +

            /*
             * Description
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
                'opacity:.9;' +
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
             * Hide separate detail description
             */
            '.full-descr,' +
            '.full-start__description,' +
            '.full-start__descr,' +
            '.full-description{' +
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
     * Prepare metadata row
     */
    function prepareMetadata(root, card) {
        if (!root || !root.length) return;

        var parts = buildMetadata(card);

        var row = root.find(
            '.tml-cinematic-meta'
        ).first();

        if (!row.length) {
            row = $('<div class="tml-cinematic-meta"></div>');

            row.insertAfter(
                root.find('.full-start-new__title').first()
            );
        }

        row.empty();

        parts.forEach(function (part, index) {
            if (index > 0) {
                row.append(
                    $('<span class="tml-cinematic-meta-separator">·</span>')
                );
            }

            row.append(
                $('<span class="tml-cinematic-meta-item"></span>').text(part)
            );
        });

        if (!parts.length) {
            row.hide();
        } else {
            row.show();
        }
    }

    /*
     * Prepare cinematic description
     */
    function prepareDescription(root, card) {
        if (!root || !root.length) return;

        var metadata = root.find(
            '.tml-cinematic-meta'
        ).first();

        if (!metadata.length) return;

        var description = root.find(
            '.tml-cinematic-description'
        );

        if (!card.overview) {
            description.remove();
            return;
        }

        if (!description.length) {
            description = $('<div class="tml-cinematic-description"></div>');

            description.insertAfter(metadata);
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
         * Metadata and description
         */
        prepareMetadata(root, card);
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
