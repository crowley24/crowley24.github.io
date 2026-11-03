
(function () {
    'use strict';

    /*
     * TMDB CINEMATIC MOBILE 1.0.1
     *
     * Lampa / Mobile
     *
     * FIX 1.0.1:
     * - Fixed native Lampa backdrop visibility
     * - Background positioned relative to activity root
     * - Restored background image dimensions
     * - Fixed stacking order
     * - Removed opaque card background
     *
     * FEATURES:
     * - TMDB movie / TV logos
     * - Ukrainian > English > neutral logo selection
     * - Production studio logo
     * - Original Lampa tagline
     * - Cinematic metadata
     * - Description
     * - Native Lampa backdrop
     * - Smooth transitions
     * - Cache and timeout protection
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_cinematic_mobile_v101_ready) return;

    var tmdb = Lampa.Api.sources.tmdb;
    if (!tmdb) return;

    window.tmdb_cinematic_mobile_v101_ready = true;

    var currentCard = null;
    var currentImage = null;
    var currentToken = 0;

    var CACHE_TIMEOUT = 20000;
    var CSS_ID = 'tmdb_cinematic_mobile_v101_css';

    /*
     * LOGO SELECTION
     */

    function pickLogo(logos) {
        if (!logos || !logos.length) return null;

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
     * CACHE
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
     * TMDB LOGO
     */

    function ensureLogo(item, type, cb) {
        cached(item, 'tml_mobile_logo', function (done) {
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
     * STUDIO LOGO
     */

    function ensureStudioLogo(item, cb) {
        cached(item, 'tml_mobile_studio', function (done) {
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
     * CARD TYPE
     */

    function getCardType(card) {
        return card.name ? 'tv' : 'movie';
    }

    /*
     * COUNTRIES
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
     * METADATA
     */

    function buildMetadata(card) {
        var parts = [];

        var release = (
            card.release_date ||
            card.first_air_date ||
            ''
        ) + '';

        var year = release ? release.slice(0, 4) : '';

        if (year) parts.push(year);

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

            /*
             * ACTIVITY ROOT
             */

            '.tml-mobile-activity{' +
                'position:relative !important;' +
                'min-height:100vh;' +
                'min-height:100svh;' +
                'background:#000;' +
                'overflow:hidden;' +
            '}' +

            /*
             * FIXED NATIVE BACKDROP
             *
             * Important:
             * Background belongs to the outer Lampa activity,
             * not to .full-start-new.
             */

            '.tml-mobile-activity .full-start__background{' +
                'position:absolute !important;' +
                'top:0 !important;' +
                'left:0 !important;' +
                'right:0 !important;' +
                'width:100% !important;' +
                'height:100% !important;' +
                'min-height:100vh !important;' +
                'min-height:100svh !important;' +
                'display:block !important;' +
                'visibility:visible !important;' +
                'opacity:1 !important;' +
                'object-fit:cover !important;' +
                'object-position:center center !important;' +
                'z-index:0 !important;' +
                'pointer-events:none !important;' +
            '}' +

            /*
             * CARD ROOT
             */

            '.tml-mobile-activity .full-start-new{' +
                'position:relative !important;' +
                'z-index:1 !important;' +
                'display:block;' +
                'min-height:100vh;' +
                'min-height:100svh;' +
                'height:auto !important;' +
                'overflow:hidden;' +
                'background:transparent !important;' +
                'box-sizing:border-box;' +
            '}' +

            /*
             * BOTTOM GRADIENT
             */

            '.tml-mobile-activity .full-start-new:after{' +
                'content:"";' +
                'position:absolute;' +
                'left:0;' +
                'right:0;' +
                'bottom:0;' +
                'height:78%;' +
                'z-index:0;' +
                'pointer-events:none;' +
                'background:linear-gradient(' +
                    'to bottom,' +
                    'rgba(0,0,0,0) 0%,' +
                    'rgba(0,0,0,.12) 28%,' +
                    'rgba(0,0,0,.62) 65%,' +
                    'rgba(0,0,0,.96) 100%' +
                ');' +
            '}' +

            /*
             * BODY
             */

            '.tml-mobile-activity .full-start-new__body{' +
                'position:relative !important;' +
                'z-index:1 !important;' +
                'display:flex !important;' +
                'flex-direction:column;' +
                'justify-content:flex-end;' +
                'align-items:stretch;' +
                'width:100%;' +
                'min-height:100vh;' +
                'min-height:100svh;' +
                'height:auto !important;' +
                'padding:0;' +
                'margin:0;' +
                'box-sizing:border-box;' +
                'background:transparent !important;' +
            '}' +

            /*
             * LEFT COLUMN
             */

            '.tml-mobile-activity .full-start-new__left{' +
                'display:none !important;' +
            '}' +

            /*
             * RIGHT COLUMN
             */

            '.tml-mobile-activity .full-start-new__right{' +
                'position:relative !important;' +
                'left:auto !important;' +
                'right:auto !important;' +
                'top:auto !important;' +
                'bottom:auto !important;' +
                'display:flex !important;' +
                'flex-direction:column;' +
                'align-items:flex-start;' +
                'justify-content:flex-end;' +
                'width:100% !important;' +
                'max-width:100% !important;' +
                'margin:auto 0 0 0 !important;' +
                'padding:1.5em 1.15em 2em 1.15em;' +
                'box-sizing:border-box;' +
                'z-index:2;' +
            '}' +

            /*
             * ORIGINAL HEADER
             */

            '.tml-mobile-activity .full-start-new__head{' +
                'display:none !important;' +
            '}' +

            /*
             * STUDIO LOGO
             */

            '.tml-mobile-activity .tml-studio-logo{' +
                'display:flex;' +
                'align-items:center;' +
                'justify-content:flex-start;' +
                'width:100%;' +
                'height:1.45em;' +
                'margin:0 0 .55em 0;' +
                'padding:0;' +
                'overflow:hidden;' +
                'box-sizing:border-box;' +
                'opacity:0;' +
                'transform:translateY(5px);' +
                'transition:opacity .5s ease,transform .5s ease;' +
            '}' +

            '.tml-mobile-activity .tml-studio-logo.tml-studio-visible{' +
                'opacity:.9;' +
                'transform:translateY(0);' +
            '}' +

            '.tml-mobile-activity .tml-studio-logo img{' +
                'display:block;' +
                'width:auto;' +
                'height:auto;' +
                'max-width:7.5em;' +
                'max-height:1.3em;' +
                'object-fit:contain;' +
                'object-position:left center;' +
                'margin:0;' +
                'padding:0;' +
                'border:0;' +
                'box-shadow:none;' +
                'filter:none;' +
            '}' +

            /*
             * TITLE / LOGO
             */

            '.tml-mobile-activity .full-start-new__title{' +
                'display:flex;' +
                'align-items:flex-start;' +
                'justify-content:flex-start;' +
                'width:100%;' +
                'max-width:100%;' +
                'min-height:0;' +
                'margin:0 0 .65em 0;' +
                'padding:0;' +
                'font-size:1.8em;' +
                'line-height:1.12;' +
                'box-sizing:border-box;' +
            '}' +

            '.tml-mobile-activity .full-start-new__title .tml-logo-image{' +
                'display:block;' +
                'width:auto;' +
                'height:auto;' +
                'max-width:100%;' +
                'max-height:24vw;' +
                'object-fit:contain;' +
                'object-position:left center;' +
                'margin:0;' +
                'padding:0;' +
                'border:0;' +
                'box-shadow:none;' +
                'filter:none;' +
                'opacity:0;' +
                'transform:translateY(7px);' +
                'transition:opacity .65s ease,transform .65s ease;' +
            '}' +

            '.tml-mobile-activity .full-start-new__title .tml-logo-image.tml-logo-visible{' +
                'opacity:1;' +
                'transform:translateY(0);' +
            '}' +

            /*
             * TAGLINE
             */

            '.tml-mobile-activity .full-start-new__tagline{' +
                'display:-webkit-box;' +
                'width:100%;' +
                'max-width:100%;' +
                'margin:0 0 .8em 0;' +
                'padding:0;' +
                'font-size:.88em !important;' +
                'font-weight:400 !important;' +
                'font-style:italic !important;' +
                'line-height:1.4 !important;' +
                'letter-spacing:.01em;' +
                'color:rgba(255,255,255,.8) !important;' +
                'opacity:.92;' +
                'overflow:hidden;' +
                '-webkit-box-orient:vertical;' +
                '-webkit-line-clamp:2;' +
                'line-clamp:2;' +
            '}' +

            '.tml-mobile-activity .full-start-new__tagline:empty{' +
                'display:none !important;' +
            '}' +

            /*
             * METADATA
             */

            '.tml-mobile-activity .tml-cinematic-meta{' +
                'display:flex;' +
                'align-items:center;' +
                'flex-wrap:wrap;' +
                'gap:.35em .55em;' +
                'width:100%;' +
                'max-width:100%;' +
                'margin:0 0 .85em 0;' +
                'padding:0;' +
                'font-family:Inter,system-ui,sans-serif;' +
                'font-size:.83em;' +
                'font-weight:400;' +
                'line-height:1.5;' +
                'color:rgba(255,255,255,.88);' +
                'box-sizing:border-box;' +
            '}' +

            '.tml-mobile-activity .tml-cinematic-meta-item{' +
                'display:inline-block;' +
                'flex:0 1 auto;' +
                'min-width:0;' +
                'overflow:hidden;' +
                'text-overflow:ellipsis;' +
                'white-space:nowrap;' +
            '}' +

            '.tml-mobile-activity .tml-cinematic-meta-separator{' +
                'display:inline-block;' +
                'flex:0 0 auto;' +
                'opacity:.55;' +
            '}' +

            /*
             * HIDE DUPLICATE METADATA
             */

            '.tml-mobile-activity .full-start-new__rate-line,' +
            '.tml-mobile-activity .full-start-new__details{' +
                'display:none !important;' +
            '}' +

            /*
             * DESCRIPTION
             */

            '.tml-mobile-activity .tml-cinematic-description{' +
                'display:-webkit-box;' +
                'width:100%;' +
                'max-width:100%;' +
                'margin:0 0 1.1em 0;' +
                'padding:0;' +
                'overflow:hidden;' +
                'font-size:.92em;' +
                'font-weight:400;' +
                'line-height:1.5;' +
                'color:rgba(255,255,255,.84);' +
                'opacity:.95;' +
                '-webkit-box-orient:vertical;' +
                '-webkit-line-clamp:4;' +
                'line-clamp:4;' +
            '}' +

            /*
             * HIDE REACTIONS
             */

            '.tml-mobile-activity .full-start-new__reactions{' +
                'display:none !important;' +
            '}' +

            /*
             * HIDE DUPLICATE DESCRIPTIONS
             */

            '.tml-mobile-activity .full-descr,' +
            '.tml-mobile-activity .full-start__description,' +
            '.tml-mobile-activity .full-start__descr,' +
            '.tml-mobile-activity .full-description{' +
                'display:none !important;' +
            '}' +

            /*
             * SMALL SCREENS
             */

            '@media screen and (max-width:380px){' +

                '.tml-mobile-activity .full-start-new__right{' +
                    'padding-left:1em;' +
                    'padding-right:1em;' +
                    'padding-bottom:1.5em;' +
                '}' +

                '.tml-mobile-activity .full-start-new__title{' +
                    'font-size:1.6em;' +
                '}' +

                '.tml-mobile-activity .tml-cinematic-meta{' +
                    'font-size:.77em;' +
                    'gap:.3em .4em;' +
                '}' +

                '.tml-mobile-activity .tml-cinematic-description{' +
                    'font-size:.87em;' +
                    '-webkit-line-clamp:3;' +
                    'line-clamp:3;' +
                '}' +

            '}';

        document.head.appendChild(css);
    }

    /*
     * ACTIVITY ROOT
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
     * CARD ROOT
     */

    function getCardRoot(ev) {
        return getActivityRoot(ev)
            .find('.full-start-new')
            .first();
    }

    /*
     * TITLE BLOCK
     */

    function getTitleBlock(ev) {
        return getActivityRoot(ev)
            .find('.full-start-new__title')
            .first();
    }

    /*
     * STUDIO LOGO
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
     * TAGLINE
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
     * METADATA
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
     * DESCRIPTION
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
            description = $(
                '<div class="tml-cinematic-description"></div>'
            );

            description.insertAfter(metadata);
        }

        description.text(card.overview);
    }

    /*
     * CLEAR STATE
     */

    function clearCurrent() {
        if (currentImage) {
            currentImage.off('error load');
        }

        currentCard = null;
        currentImage = null;
    }

    /*
     * PREPARE LOGO
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
     * RESTORE TITLE
     */

    function showOriginalTitle(titleBlock, original, logo) {
        if (!titleBlock || !titleBlock.length) return;

        if (logo) logo.off('error load');

        titleBlock.empty();
        titleBlock.append(original);
    }

    /*
     * DISPLAY LOGO
     */

    function displayLogo(url, titleBlock, original, logo, token) {
        if (!url || !logo || !logo.length) return;
        if (token !== currentToken) return;

        logo.off('error load');

        logo.on('error', function () {
            if (token !== currentToken) return;

            showOriginalTitle(
                titleBlock,
                original,
                logo
            );
        });

        logo.on('load', function () {
            if (token !== currentToken) return;

            requestAnimationFrame(function () {
                if (token !== currentToken) return;

                logo.addClass('tml-logo-visible');
            });
        });

        logo.attr('src', url);

        if (
            logo[0] &&
            logo[0].complete &&
            logo[0].naturalWidth > 0
        ) {
            requestAnimationFrame(function () {
                if (token !== currentToken) return;

                logo.addClass('tml-logo-visible');
            });
        }
    }

    /*
     * PROCESS CARD
     */

    function processCard(ev) {
        if (!ev || ev.type !== 'complite') return;

        var card = ev.data && ev.data.movie;

        if (!card || !card.id) return;

        var activityRoot = getActivityRoot(ev);
        var root = getCardRoot(ev);
        var titleBlock = getTitleBlock(ev);

        if (!activityRoot.length) return;
        if (!root.length || !titleBlock.length) return;

        clearCurrent();

        var token = ++currentToken;
        var type = getCardType(card);

        currentCard = card;

        /*
         * IMPORTANT BACKGROUND FIX
         *
         * The background is located in the outer
         * activity container, not in the card root.
         *
         * Activate its dedicated CSS scope.
         */

        activityRoot.addClass('tml-mobile-activity');

        /*
         * Keep native Lampa background intact.
         * Do not remove, clone or replace it.
         */

        var nativeBackground = activityRoot.find(
            '.full-start__background'
        ).first();

        if (nativeBackground.length) {
            nativeBackground.css({
                display: 'block',
                visibility: 'visible',
                opacity: '1'
            });
        }

        /*
         * INFORMATION
         */

        prepareTagline(root);
        prepareMetadata(root, card);
        prepareDescription(root, card);

        /*
         * STUDIO
         */

        prepareStudioLogo(root, card, token);

        /*
         * MOVIE LOGO
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
     * LAMPA EVENTS
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

    /*
     * INITIALIZATION
     */

    addCSS();

})();
