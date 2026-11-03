
(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.4.3 — CINEMATIC MODE
     *
     * Lampa / Android TV
     *
     * LOGO:
     * - TMDB logos for movies and TV series
     * - Same logo selection as Кінотрейлери 2.3
     * - Original cache logic
     * - Original title fallback
     *
     * CINEMATIC MODE:
     * - Standard Lampa backdrop preserved
     * - Poster hidden
     * - Information block positioned bottom-left
     * - TMDB logo
     * - Native tagline directly under logo
     * - Metadata: year / country / rating / genres
     * - Short description below metadata
     * - Native Lampa buttons preserved
     * - Reactions hidden
     *
     * BACKDROP SLIDESHOW:
     * - TMDB additional backdrops
     * - 10 seconds interval
     * - 1.5 seconds crossfade
     * - Original Lampa background retained underneath
     * - Stops on card destroy
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_v143_ready) return;

    var tmdb = Lampa.Api.sources.tmdb;

    if (!tmdb) return;

    window.tmdb_movie_logos_v143_ready = true;

    var currentCard = null;
    var currentTitle = null;
    var currentImage = null;
    var currentToken = 0;

    var slideshowTimer = null;
    var slideshowRoot = null;
    var slideshowImages = [];
    var slideshowIndex = 0;
    var slideshowToken = 0;

    var CACHE_TIMEOUT = 20000;
    var SLIDESHOW_INTERVAL = 10000;
    var SLIDESHOW_FADE = 1500;

    var CSS_ID = 'tmdb_movie_logos_v143_css';

    /*
     * TMDB logo selection
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
     * Country names
     *
     * TMDB movie:
     * production_countries[].name
     *
     * TMDB TV:
     * production_countries[].name
     * or origin_country[]
     */
    function getCountries(card) {
        var countries = [];

        if (
            card.production_countries &&
            card.production_countries.length
        ) {
            countries = card.production_countries
                .map(function (country) {
                    return country.name || '';
                })
                .filter(Boolean);
        }

        if (
            !countries.length &&
            card.origin_country &&
            card.origin_country.length
        ) {
            countries = card.origin_country.slice(0, 2);
        }

        return countries.slice(0, 2);
    }

    /*
     * Metadata builder
     *
     * Year · Country · Rating · Genres
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

        var countries = getCountries(card);

        if (countries.length) {
            parts.push(countries.join(', '));
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
     */
    function addCSS() {
        if (document.getElementById(CSS_ID)) return;

        var css = document.createElement('style');

        css.id = CSS_ID;

        css.textContent =

            '.full-start-new{' +
                'position:relative;' +
            '}' +

            '.full-start-new__body{' +
                'position:relative;' +
                'display:block;' +
                'min-height:calc(100vh - 10rem);' +
                'height:auto;' +
            '}' +

            '.full-start-new__left{' +
                'display:none !important;' +
            '}' +

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

            '.full-start-new__head{' +
                'display:none !important;' +
            '}' +

            '.full-start-new__title{' +
                'display:flex;' +
                'align-items:flex-start;' +
                'justify-content:flex-start;' +
                'width:100%;' +
                'min-height:0;' +
                'margin:0 0 0.45em 0;' +
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

            '.full-start-new__tagline{' +
                'display:block;' +
                'width:100%;' +
                'max-width:100%;' +
                'margin:0 0 0.8em 0;' +
                'padding:0;' +
                'font-size:0.75em !important;' +
                'font-weight:400 !important;' +
                'font-style:italic !important;' +
                'line-height:1.45 !important;' +
                'letter-spacing:0.015em;' +
                'color:rgba(255,255,255,.78) !important;' +
                'opacity:.9;' +
                'overflow:hidden;' +
                'display:-webkit-box;' +
                '-webkit-box-orient:vertical;' +
                '-webkit-line-clamp:2;' +
                'line-clamp:2;' +
            '}' +

            '.full-start-new__tagline:empty{' +
                'display:none !important;' +
            '}' +

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

            '.full-start-new__rate-line,' +
            '.full-start-new__details{' +
                'display:none !important;' +
            '}' +

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

            '.full-start-new__buttons{' +
                'display:flex;' +
                'align-items:center;' +
                'flex-wrap:wrap;' +
                'gap:0.45em;' +
                'width:100%;' +
                'margin:0;' +
                'padding:0;' +
            '}' +

            '.full-start-new__reactions{' +
                'display:none !important;' +
            '}' +

            '.full-descr,' +
            '.full-start__description,' +
            '.full-start__descr,' +
            '.full-description{' +
                'display:none !important;' +
            '}' +

            /*
             * Slideshow overlay
             *
             * Native .full-start__background remains underneath.
             */
            '.tml-backdrop-layer{' +
                'position:absolute !important;' +
                'inset:0 !important;' +
                'width:100% !important;' +
                'height:100% !important;' +
                'object-fit:cover !important;' +
                'object-position:center center !important;' +
                'opacity:0;' +
                'transition:opacity 1.5s ease-in-out;' +
                'pointer-events:none !important;' +
                'z-index:0 !important;' +
            '}' +

            '.tml-backdrop-layer.tml-backdrop-visible{' +
                'opacity:1;' +
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
     * Tagline position
     */
    function prepareTagline(root) {
        if (!root || !root.length) return;

        var title = root.find(
            '.full-start-new__title'
        ).first();

        var tagline = root.find(
            '.full-start-new__tagline'
        ).first();

        if (!title.length || !tagline.length) return;

        tagline.insertAfter(title);
    }

    /*
     * Metadata row
     */
    function prepareMetadata(root, card) {
        if (!root || !root.length) return;

        var parts = buildMetadata(card);

        var title = root.find(
            '.full-start-new__title'
        ).first();

        var tagline = root.find(
            '.full-start-new__tagline'
        ).first();

        var row = root.find(
            '.tml-cinematic-meta'
        ).first();

        if (!row.length) {
            row = $('<div class="tml-cinematic-meta"></div>');

            if (tagline.length) {
                row.insertAfter(tagline);
            } else {
                row.insertAfter(title);
            }
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
     * Description
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
     * Stop slideshow
     */
    function stopSlideshow() {
        clearInterval(slideshowTimer);
        slideshowTimer = null;

        slideshowToken++;

        slideshowImages.forEach(function (image) {
            if (image) {
                image.onload = null;
                image.onerror = null;
            }
        });

        slideshowImages = [];
        slideshowIndex = 0;
        slideshowRoot = null;
    }

    /*
     * Start slideshow
     *
     * Keep the native Lampa backdrop as the base layer.
     * Additional images are placed above it.
     */
    function startSlideshow(root, card, type, token) {
        stopSlideshow();

        var nativeBackground = root.find(
            '.full-start__background'
        ).first();

        if (!nativeBackground.length) return;

        if (!card.backdrop_path) return;

        var slideshowId = slideshowToken;

        slideshowRoot = root;

        cached(card, 'tml_backdrops', function (done) {
            var lang = Lampa.Storage.field('tmdb_lang');
            var langs = (lang || 'en') + ',en,null';

            tmdb.get(
                type + '/' + card.id + '/images',
                {
                    filter: {
                        include_image_language: langs
                    }
                },
                function (json) {
                    var backdrops = json && json.backdrops
                        ? json.backdrops
                        : [];

                    var paths = [];
                    var original = card.backdrop_path;

                    backdrops.forEach(function (item) {
                        if (
                            item.file_path &&
                            item.file_path !== original &&
                            paths.indexOf(item.file_path) === -1
                        ) {
                            paths.push(item.file_path);
                        }
                    });

                    done(paths);
                },
                function () {
                    done([]);
                }
            );
        }, function (paths) {
            if (token !== currentToken) return;
            if (slideshowId !== slideshowToken) return;
            if (!paths || paths.length < 1) return;

            var urls = paths.map(function (path) {
                return Lampa.Api.img(path, 'w1280');
            });

            /*
             * Two alternating image layers
             */
            var first = $('<img class="tml-backdrop-layer" alt="">');
            var second = $('<img class="tml-backdrop-layer" alt="">');

            nativeBackground.after(first);
            first.after(second);

            var layers = [first, second];

            slideshowImages = layers;

            var index = 0;
            var active = 0;

            function showNext() {
                if (token !== currentToken) return;
                if (slideshowId !== slideshowToken) return;
                if (!slideshowRoot || !slideshowRoot.length) return;

                index = (index + 1) % urls.length;

                var nextLayer = 1 - active;
                var image = layers[nextLayer];

                image.removeClass('tml-backdrop-visible');

                image.off('load error');

                image.on('load', function () {
                    if (token !== currentToken) return;
                    if (slideshowId !== slideshowToken) return;

                    /*
                     * Keep image transition synchronized
                     */
                    requestAnimationFrame(function () {
                        if (token !== currentToken) return;

                        image.addClass('tml-backdrop-visible');

                        layers[active].removeClass(
                            'tml-backdrop-visible'
                        );

                        active = nextLayer;
                    });
                });

                image.on('error', function () {
                    if (token !== currentToken) return;
                    index = (index + 1) % urls.length;
                });

                image.attr('src', urls[index]);
            }

            /*
             * Preload first additional image
             */
            showNext();

            slideshowTimer = setInterval(
                showNext,
                SLIDESHOW_INTERVAL
            );
        });
    }

    /*
     * Clear current card state
     */
    function clearCurrent() {
        stopSlideshow();

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
         * Cinematic information
         */
        prepareTagline(root);
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

        /*
         * TMDB backdrop slideshow
         */
        startSlideshow(root, card, type, token);
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
