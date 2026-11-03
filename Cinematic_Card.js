(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.4.6 — CINEMATIC NETFLIX MODE
     *
     * Lampa / Android TV
     *
     * CHANGES 1.4.6:
     * - Netflix-style media buttons
     * - White primary Play button
     * - Dark translucent secondary buttons
     * - Smooth remote-control focus animation
     * - Small production studio logo above movie title logo
     * - Studio logo loaded from TMDB production_companies
     * - Original 1.4.5 seamless backdrop slideshow preserved
     * - Original Lampa button actions preserved
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_v146_ready) return;

    var tmdb = Lampa.Api.sources.tmdb;

    if (!tmdb) return;

    window.tmdb_movie_logos_v146_ready = true;

    var currentCard = null;
    var currentTitle = null;
    var currentImage = null;
    var currentToken = 0;

    var slideshowTimer = null;
    var slideshowRoot = null;
    var slideshowImages = [];
    var slideshowToken = 0;

    var CACHE_TIMEOUT = 20000;
    var SLIDESHOW_INTERVAL = 10000;

    var CSS_ID = 'tmdb_movie_logos_v146_css';

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
     * TMDB movie logo request
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
     * Production studio logo
     *
     * Uses production_companies from TMDB card data.
     * Selects the first available studio logo.
     */
    function ensureStudioLogo(item, cb) {
        cached(item, 'tml_studio_logo', function (done) {
            var companies = item.production_companies || [];

            var studio = companies.filter(function (company) {
                return company &&
                    company.logo_path &&
                    company.logo_path.length;
            })[0];

            if (!studio) {
                done(null);
                return;
            }

            done({
                url: Lampa.Api.img(studio.logo_path, 'w300'),
                name: studio.name || ''
            });
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

            /*
             * Studio logo
             */
            '.tml-studio-logo{' +
                'display:flex;' +
                'align-items:center;' +
                'justify-content:flex-start;' +
                'width:100%;' +
                'max-width:100%;' +
                'height:1.55em;' +
                'margin:0 0 0.45em 0;' +
                'padding:0;' +
                'overflow:hidden;' +
                'box-sizing:border-box;' +
                'opacity:0;' +
                'transform:translateY(4px);' +
                'transition:opacity .45s ease, transform .45s ease;' +
            '}' +

            '.tml-studio-logo.tml-studio-visible{' +
                'opacity:.9;' +
                'transform:translateY(0);' +
            '}' +

            '.tml-studio-logo img{' +
                'display:block;' +
                'width:auto;' +
                'height:auto;' +
                'max-width:8em;' +
                'max-height:1.35em;' +
                'object-fit:contain;' +
                'object-position:left center;' +
                'margin:0;' +
                'padding:0;' +
                'border:0;' +
                'box-shadow:none;' +
                'filter:none;' +
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

            /*
             * Metadata
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

            '.full-start-new__rate-line,' +
            '.full-start-new__details{' +
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
             * Netflix-style media buttons
             */
            '.full-start-new__buttons{' +
                'display:flex;' +
                'align-items:center;' +
                'flex-wrap:wrap;' +
                'gap:0.55em;' +
                'width:100%;' +
                'margin:0;' +
                'padding:0.25em 0.15em;' +
                'box-sizing:border-box;' +
            '}' +

            '.full-start-new__buttons > *,' +
            '.full-start-new__buttons .selector{' +
                'display:inline-flex !important;' +
                'align-items:center !important;' +
                'justify-content:center !important;' +
                'min-height:2.9em;' +
                'padding:0 1.15em !important;' +
                'border:1px solid rgba(255,255,255,.13) !important;' +
                'border-radius:.35em !important;' +
                'background:rgba(38,38,38,.88) !important;' +
                'color:#fff !important;' +
                'box-shadow:none !important;' +
                'font-weight:600;' +
                'text-shadow:none !important;' +
                'box-sizing:border-box;' +
                'transition:transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;' +
            '}' +

            '.full-start-new__buttons > *:first-child,' +
            '.full-start-new__buttons > *.tml-primary-button{' +
                'background:#fff !important;' +
                'color:#111 !important;' +
                'border-color:#fff !important;' +
            '}' +

            '.full-start-new__buttons > *:first-child svg,' +
            '.full-start-new__buttons > *:first-child i{' +
                'color:#111 !important;' +
                'fill:#111 !important;' +
            '}' +

            '.full-start-new__buttons .selector svg{' +
                'max-width:1.25em;' +
                'max-height:1.25em;' +
            '}' +

            '.full-start-new__buttons .selector.focus,' +
            '.full-start-new__buttons .selector.focused,' +
            '.full-start-new__buttons .selector:focus,' +
            '.full-start-new__buttons > *.focus,' +
            '.full-start-new__buttons > *.focused{' +
                'transform:scale(1.055);' +
                'border-color:rgba(255,255,255,.95) !important;' +
                'box-shadow:0 0 0 2px rgba(255,255,255,.8) !important;' +
                'z-index:3;' +
            '}' +

            '.full-start-new__buttons > *:first-child.focus,' +
            '.full-start-new__buttons > *:first-child.focused{' +
                'background:#f0f0f0 !important;' +
                'color:#111 !important;' +
            '}' +

            '.full-start-new__buttons .selector:active{' +
                'transform:scale(.98);' +
            '}' +

            /*
             * Hide reactions and duplicate description
             */
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
             */
            '.tml-backdrop-layer{' +
                'position:absolute !important;' +
                'inset:0 !important;' +
                'width:100% !important;' +
                'height:100% !important;' +
                'object-fit:cover !important;' +
                'object-position:center center !important;' +
                'opacity:0 !important;' +
                'transition:opacity 1.5s ease-in-out !important;' +
                'pointer-events:none !important;' +
                'z-index:0 !important;' +
            '}' +

            '.tml-backdrop-layer.tml-backdrop-visible{' +
                'opacity:1 !important;' +
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
     * Get outer activity root
     */
    function getActivityRoot(ev) {
        try {
            if (
                !ev ||
                !ev.object ||
                !ev.object.activity ||
                typeof ev.object.activity.render !== 'function'
            ) {
                return $();
            }

            return ev.object.activity.render();

        } catch (e) {
            return $();
        }
    }

    /*
     * Studio logo placement
     */
    function prepareStudioLogo(root, card, token) {
        if (!root || !root.length) return;

        var title = root.find(
            '.full-start-new__title'
        ).first();

        if (!title.length) return;

        root.find('.tml-studio-logo').remove();

        ensureStudioLogo(card, function (studio) {
            if (token !== currentToken) return;
            if (currentCard !== card) return;

            if (!studio || !studio.url) return;

            var container = $(
                '<div class="tml-studio-logo"></div>'
            );

            var image = $('<img alt="">');

            image.attr('alt', studio.name || '');

            image.on('error', function () {
                container.remove();
            });

            image.on('load', function () {
                if (token !== currentToken) return;

                requestAnimationFrame(function () {
                    if (token !== currentToken) return;

                    container.addClass('tml-studio-visible');
                });
            });

            image.attr('src', studio.url);

            container.append(image);

            title.before(container);
        });
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
        if (slideshowTimer) {
            clearInterval(slideshowTimer);
            slideshowTimer = null;
        }

        slideshowToken++;

        slideshowImages.forEach(function (image) {
            if (image && image.length) {
                image.off('load error');
                image.remove();
            }
        });

        slideshowImages = [];
        slideshowRoot = null;
    }

    /*
     * Start slideshow
     *
     * 1. First overlay duplicates native backdrop.
     * 2. It becomes visible without changing the picture.
     * 3. After 10 seconds, the first additional TMDB backdrop appears.
     * 4. Further images crossfade every 10 seconds.
     */
    function startSlideshow(activityRoot, card, type, token) {
        stopSlideshow();

        if (!activityRoot || !activityRoot.length) return;
        if (!card || !card.id || !card.backdrop_path) return;

        var nativeBackground = activityRoot.find(
            '.full-start__background'
        ).first();

        if (!nativeBackground.length) return;

        var nativeSrc =
            nativeBackground.attr('src') ||
            nativeBackground[0].src ||
            '';

        if (!nativeSrc) return;

        var slideshowId = slideshowToken;

        slideshowRoot = activityRoot;

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
            if (!slideshowRoot || !slideshowRoot.length) return;
            if (!nativeBackground.closest('body').length) return;
            if (!paths || paths.length < 1) return;

            var urls = paths.map(function (path) {
                return Lampa.Api.img(path, 'w1280');
            });

            /*
             * Create two layers using native background geometry.
             */
            var first = nativeBackground.clone(false);
            var second = nativeBackground.clone(false);

            first
                .removeClass('loaded dim')
                .removeAttr('id')
                .removeAttr('src')
                .addClass('tml-backdrop-layer');

            second
                .removeClass('loaded dim')
                .removeAttr('id')
                .removeAttr('src')
                .addClass('tml-backdrop-layer');

            nativeBackground.after(first);
            first.after(second);

            var layers = [first, second];

            slideshowImages = layers;

            var active = 0;
            var nextIndex = 0;
            var loading = false;

            /*
             * First layer:
             * use exactly the same image as the native Lampa backdrop.
             */
            first.on('load', function () {
                if (token !== currentToken) return;
                if (slideshowId !== slideshowToken) return;

                requestAnimationFrame(function () {
                    if (token !== currentToken) return;
                    if (slideshowId !== slideshowToken) return;

                    first.addClass('tml-backdrop-visible');
                });
            });

            first.on('error', function () {
                if (token !== currentToken) return;
                if (slideshowId !== slideshowToken) return;
            });

            first.attr('src', nativeSrc);

            /*
             * Load and display the next additional backdrop.
             */
            function showNext() {
                if (token !== currentToken) return;
                if (slideshowId !== slideshowToken) return;
                if (!slideshowRoot || !slideshowRoot.length) return;
                if (loading || !urls.length) return;

                loading = true;

                var target = 1 - active;
                var image = layers[target];

                image
                    .removeClass('tml-backdrop-visible')
                    .off('load error');

                image.on('load', function () {
                    if (token !== currentToken) return;
                    if (slideshowId !== slideshowToken) return;

                    loading = false;

                    requestAnimationFrame(function () {
                        if (token !== currentToken) return;
                        if (slideshowId !== slideshowToken) return;

                        image.addClass('tml-backdrop-visible');

                        layers[active].removeClass(
                            'tml-backdrop-visible'
                        );

                        active = target;
                    });
                });

                image.on('error', function () {
                    if (token !== currentToken) return;
                    if (slideshowId !== slideshowToken) return;

                    loading = false;

                    nextIndex = (nextIndex + 1) % urls.length;
                });

                image.attr('src', urls[nextIndex]);

                nextIndex = (nextIndex + 1) % urls.length;
            }

            /*
             * IMPORTANT:
             * Do not start the timer immediately.
             * The original backdrop remains on screen for 10 seconds.
             */
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

        var activityRoot = getActivityRoot(ev);
        var titleBlock = getTitleBlock(ev);
        var root = getCardRoot(ev);

        if (!activityRoot.length) return;
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
         * Production studio logo
         */
        prepareStudioLogo(root, card, token);

        /*
         * TMDB movie logo
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
        startSlideshow(activityRoot, card, type, token);
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
