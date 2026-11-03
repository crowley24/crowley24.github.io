(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.4.4 — BRIGHT & VIVID
     *
     * Lampa / Android TV
     *
     * CHANGES 1.4.4:
     * - Removed backdrop darkening overlays
     * - Removed backdrop gradients
     * - Removed backdrop filters
     * - Preserved original Lampa backdrop image
     * - Bright and vivid original image colors
     *
     * BASE:
     * - TMDB MOVIE LOGOS 1.4.3
     *
     * PRESERVED:
     * - TMDB logo selection
     * - Original cache logic
     * - Ukrainian country names
     * - Production studio logo
     * - Lower information block positioning
     * - Native Lampa buttons
     * - Cinematic metadata
     * - Cinematic description
     * - Original title fallback
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_v144_ready) return;

    window.tmdb_movie_logos_v144_ready = true;

    var tmdb = Lampa.Api.sources.tmdb;

    if (!tmdb) return;

    var currentCard = null;
    var currentTitle = null;
    var currentImage = null;
    var currentStudio = null;
    var currentToken = 0;

    var CACHE_TIMEOUT = 20000;
    var CSS_ID = 'tmdb_movie_logos_v144_css';

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
     * Studio logo selection
     */
    function findStudioLogo(companies) {
        if (!companies || !companies.length) return null;

        var studio = companies.filter(function (company) {
            return company &&
                company.logo_path &&
                company.logo_path.length;
        })[0];

        if (!studio) return null;

        return {
            url: Lampa.Api.img(studio.logo_path, 'w300'),
            name: studio.name || ''
        };
    }

    /*
     * TMDB production studio logo request
     *
     * 1. Try data already available in the card.
     * 2. If no logo is found, request full movie/TV details.
     */
    function ensureStudioLogo(item, type, cb) {
        cached(item, 'tml_studio_logo', function (done) {

            var existing = findStudioLogo(
                item.production_companies
            );

            if (existing) {
                done(existing);
                return;
            }

            tmdb.get(
                type + '/' + item.id,
                {},
                function (json) {
                    var studio = findStudioLogo(
                        json && json.production_companies
                            ? json.production_companies
                            : []
                    );

                    done(studio);
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
     */
    function getCountryName(code) {
        var countries = {
            US: 'США',
            GB: 'Велика Британія',
            UK: 'Велика Британія',
            FR: 'Франція',
            DE: 'Німеччина',
            IT: 'Італія',
            ES: 'Іспанія',
            PL: 'Польща',
            UA: 'Україна',
            CA: 'Канада',
            AU: 'Австралія',
            NZ: 'Нова Зеландія',
            JP: 'Японія',
            KR: 'Південна Корея',
            CN: 'Китай',
            HK: 'Гонконг',
            IN: 'Індія',
            RU: 'Росія',
            TR: 'Туреччина',
            BR: 'Бразилія',
            MX: 'Мексика',
            AR: 'Аргентина',
            SE: 'Швеція',
            NO: 'Норвегія',
            DK: 'Данія',
            FI: 'Фінляндія',
            NL: 'Нідерланди',
            BE: 'Бельгія',
            CH: 'Швейцарія',
            AT: 'Австрія',
            IE: 'Ірландія',
            CZ: 'Чехія',
            SK: 'Словаччина',
            HU: 'Угорщина',
            RO: 'Румунія',
            BG: 'Болгарія',
            GR: 'Греція',
            PT: 'Португалія',
            IL: 'Ізраїль',
            ZA: 'ПАР',
            EG: 'Єгипет',
            TH: 'Таїланд',
            ID: 'Індонезія',
            SG: 'Сінгапур',
            MY: 'Малайзія',
            PH: 'Філіппіни',
            PK: 'Пакистан',
            IR: 'Іран',
            AE: 'ОАЕ',
            SA: 'Саудівська Аравія',
            CL: 'Чилі',
            CO: 'Колумбія',
            PE: 'Перу',
            IS: 'Ісландія',
            HR: 'Хорватія',
            RS: 'Сербія',
            SI: 'Словенія',
            LT: 'Литва',
            LV: 'Латвія',
            EE: 'Естонія',
            GE: 'Грузія',
            AM: 'Вірменія',
            KZ: 'Казахстан'
        };

        if (!code) return '';

        code = String(code).toUpperCase();

        if (countries[code]) {
            return countries[code];
        }

        try {
            if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
                var display = new Intl.DisplayNames(['uk'], {
                    type: 'region'
                });

                var name = display.of(code);

                if (name && name !== code) return name;
            }
        } catch (e) {}

        return code;
    }

    /*
     * Country list
     */
    function getCountries(card) {
        var countries = [];

        if (
            card.production_countries &&
            card.production_countries.length
        ) {
            countries = card.production_countries
                .map(function (country) {
                    return country.iso_3166_1
                        ? getCountryName(country.iso_3166_1)
                        : country.name || '';
                })
                .filter(Boolean);
        }

        if (
            !countries.length &&
            card.origin_country &&
            card.origin_country.length
        ) {
            countries = card.origin_country
                .map(getCountryName)
                .filter(Boolean);
        }

        var unique = [];

        countries.forEach(function (country) {
            if (
                country &&
                unique.indexOf(country) === -1
            ) {
                unique.push(country);
            }
        });

        return unique.slice(0, 2);
    }

    /*
     * Metadata builder
     *
     * Year · Country · ★ Rating · Genres
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

            /*
             * BRIGHT & VIVID BACKDROP
             *
             * Keep original Lampa background image.
             * Remove additional darkening and filters.
             */

            '.full-start-new__background{' +
                'opacity:1 !important;' +
                'filter:none !important;' +
                '-webkit-filter:none !important;' +
                'background-color:transparent !important;' +
                'background-blend-mode:normal !important;' +
            '}' +

            '.full-start-new__background:before,' +
            '.full-start-new__background:after{' +
                'background:none !important;' +
                'background-image:none !important;' +
                'opacity:0 !important;' +
                'filter:none !important;' +
                '-webkit-filter:none !important;' +
                'box-shadow:none !important;' +
            '}' +

            '.full-start-new__background img,' +
            '.full-start-new__background video{' +
                'opacity:1 !important;' +
                'filter:none !important;' +
                '-webkit-filter:none !important;' +
                'brightness:1 !important;' +
                'saturate:1 !important;' +
            '}' +

            '.full-start-new__background-overlay,' +
            '.full-start-new__overlay{' +
                'background:none !important;' +
                'background-image:none !important;' +
                'opacity:0 !important;' +
                'filter:none !important;' +
                '-webkit-filter:none !important;' +
            '}' +

            /*
             * Cinematic card positioning
             */
            '.full-start-new{' +
                'position:relative;' +
            '}' +

            '.full-start-new__body{' +
                'position:relative;' +
                'display:block;' +
                'min-height:calc(100vh - 7rem);' +
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
                'bottom:1.5rem !important;' +
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
             * Studio logo
             */
            '.tml-studio-logo{' +
                'display:flex;' +
                'align-items:center;' +
                'justify-content:flex-start;' +
                'width:100%;' +
                'max-width:100%;' +
                'height:1.5em;' +
                'margin:0 0 .4em 0;' +
                'padding:0;' +
                'overflow:hidden;' +
                'box-sizing:border-box;' +
                'opacity:0;' +
                'transform:translateY(3px);' +
                'transition:opacity .4s ease, transform .4s ease;' +
            '}' +

            '.tml-studio-logo.tml-studio-visible{' +
                'opacity:.92;' +
                'transform:translateY(0);' +
            '}' +

            '.tml-studio-logo img{' +
                'display:block;' +
                'width:auto;' +
                'height:auto;' +
                'max-width:8em;' +
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
             * Logo / title
             */
            '.full-start-new__title{' +
                'display:flex;' +
                'align-items:flex-start;' +
                'justify-content:flex-start;' +
                'width:100%;' +
                'min-height:0;' +
                'margin:0 0 .45em 0;' +
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
                'display:block;' +
                'width:100%;' +
                'max-width:100%;' +
                'margin:0 0 .8em 0;' +
                'padding:0;' +
                'font-size:.75em !important;' +
                'font-weight:400 !important;' +
                'font-style:italic !important;' +
                'line-height:1.45 !important;' +
                'letter-spacing:.015em;' +
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
             * Metadata row
             */
            '.tml-cinematic-meta{' +
                'display:flex;' +
                'align-items:center;' +
                'flex-wrap:nowrap;' +
                'gap:.55em;' +
                'width:100%;' +
                'max-width:100%;' +
                'margin:0 0 .8em 0;' +
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
                'gap:.45em;' +
                'width:100%;' +
                'margin:0;' +
                'padding:0;' +
            '}' +

            /*
             * Hide reactions and separate details
             */
            '.full-start-new__reactions{' +
                'display:none !important;' +
            '}' +

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
     * Prepare studio logo
     */
    function prepareStudioLogo(root, card, type, token) {
        if (!root || !root.length) return;

        var title = root.find(
            '.full-start-new__title'
        ).first();

        if (!title.length) return;

        root.find('.tml-studio-logo').remove();

        ensureStudioLogo(card, type, function (studio) {
            if (token !== currentToken) return;
            if (currentCard !== card) return;

            if (!studio || !studio.url) return;

            var container = $('<div class="tml-studio-logo"></div>');
            var image = $('<img alt="">');

            currentStudio = container;

            image.attr('alt', studio.name || '');

            image.on('error', function () {
                container.remove();
                if (currentStudio === container) {
                    currentStudio = null;
                }
            });

            image.on('load', function () {
                if (token !== currentToken) return;

                requestAnimationFrame(function () {
                    if (token !== currentToken) return;
                    if (currentCard !== card) return;

                    container.addClass('tml-studio-visible');
                });
            });

            container.append(image);
            title.before(container);

            image.attr('src', studio.url);
        });
    }

    /*
     * Prepare tagline position
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
     * Prepare metadata row
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

        if (currentStudio) {
            currentStudio.find('img').off('load error');
        }

        currentCard = null;
        currentTitle = null;
        currentImage = null;
        currentStudio = null;
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
         * Position tagline and build information
         */
        prepareTagline(root);
        prepareMetadata(root, card);
        prepareDescription(root, card);

        /*
         * Studio logo above movie logo
         */
        prepareStudioLogo(root, card, type, token);

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
