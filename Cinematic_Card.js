(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.5.2 — TRUE FIXED CINEMATIC BACKDROP
     *
     * Lampa / Android TV
     *
     * NEW 1.5.2:
     * - Backdrop moved directly to document.body
     * - No longer nested inside .full-start-new
     * - Independent viewport-fixed background
     * - Background stays stationary during card scrolling
     * - Progressive background darkening on scroll
     * - Smooth brightness restoration when scrolling up
     * - Independent dimming layer
     * - Scroll listeners automatically removed on destroy
     *
     * PRESERVED:
     * - TMDB logo selection: Ukrainian > English > fallback
     * - Logo cache and request coalescing
     * - Studio logo with details fallback
     * - Ukrainian country names
     * - Metadata and description
     * - Original Lampa buttons and navigation
     * - Premium logo appearance animation
     *
     * No external dependencies.
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_v152_ready) return;

    window.tmdb_movie_logos_v152_ready = true;

    var tmdb = Lampa.Api.sources.tmdb;

    if (!tmdb) return;

    var VERSION = '1.5.2';
    var CSS_ID = 'tml_v152_css';

    var currentCard = null;
    var currentToken = 0;
    var currentRoot = null;
    var currentTitle = null;
    var currentLogo = null;
    var currentBackdrop = null;

    var currentDimLayer = null;
    var currentScrollHandler = null;
    var scrollFrame = null;

    var CACHE_TIMEOUT = 20000;

    /*
     * Scroll darkening settings
     */
    var SCROLL_DISTANCE = 700;
    var MAX_DARKNESS = 0.48;

    /*
     * TMDB logo selection
     */
    function pickLogo(logos) {
        if (!logos || !logos.length) return null;

        var language = Lampa.Storage.field('tmdb_lang');

        var order = [
            language,
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
     * Request cache
     */
    function cached(item, key, request, callback) {
        if (item[key] !== undefined) {
            callback(item[key]);
            return;
        }

        if (item[key + '_wait']) {
            item[key + '_wait'].push(callback);
            return;
        }

        item[key + '_wait'] = [callback];

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

            list.forEach(function (cb) {
                try {
                    cb(item[key]);
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
     * Card type
     */
    function getCardType(card) {
        return card.name ? 'tv' : 'movie';
    }

    /*
     * TMDB logo
     */
    function ensureLogo(card, type, callback) {
        cached(card, 'tml_logo', function (done) {
            var language = Lampa.Storage.field('tmdb_lang');
            var languages = (language || 'uk') + ',en,null';

            tmdb.get(
                type + '/' + card.id + '/images',
                {
                    filter: {
                        include_image_language: languages
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
        }, callback);
    }

    /*
     * Studio logo
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

    function ensureStudioLogo(card, type, callback) {
        cached(card, 'tml_studio_logo', function (done) {
            var existing = findStudioLogo(
                card.production_companies
            );

            if (existing) {
                done(existing);
                return;
            }

            tmdb.get(
                type + '/' + card.id,
                {},
                function (json) {
                    done(
                        findStudioLogo(
                            json && json.production_companies
                                ? json.production_companies
                                : []
                        )
                    );
                },
                function () {
                    done(null);
                }
            );
        }, callback);
    }

    /*
     * Backdrop
     */
    function ensureBackdrop(card, type, callback) {
        cached(card, 'tml_backdrop', function (done) {
            if (card.backdrop_path) {
                done(card.backdrop_path);
                return;
            }

            tmdb.get(
                type + '/' + card.id,
                {},
                function (json) {
                    done(
                        json && json.backdrop_path
                            ? json.backdrop_path
                            : null
                    );
                },
                function () {
                    done(null);
                }
            );
        }, callback);
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

        if (countries[code]) return countries[code];

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
     * Countries
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
     * Metadata
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
             * Completely hide native Lampa background
             */
            'body.tml-cinematic-active .background,' +
            'body.tml-cinematic-active .full-start__background,' +
            'body.tml-cinematic-active .full-start__background-image{' +
                'opacity:0 !important;' +
                'visibility:hidden !important;' +
                'pointer-events:none !important;' +
                'display:none !important;' +
            '}' +

            /*
             * Full card root
             *
             * Keep card content above body-level backdrop.
             */
            '.full-start-new{' +
                'position:relative !important;' +
                'z-index:1 !important;' +
                'isolation:isolate;' +
                'background:transparent !important;' +
            '}' +

            /*
             * Independent fixed fullscreen backdrop
             *
             * IMPORTANT:
             * This element is now a direct child of document.body.
             * It is NOT inside .full-start-new.
             */
            '.tml-cinematic-backdrop{' +
                'position:fixed !important;' +
                'top:0 !important;' +
                'left:0 !important;' +
                'right:0 !important;' +
                'bottom:0 !important;' +
                'width:100vw !important;' +
                'height:100vh !important;' +
                'z-index:0 !important;' +
                'overflow:hidden;' +
                'pointer-events:none;' +
                'opacity:0;' +
                'transition:opacity .65s ease;' +
                'background:#080808;' +
            '}' +

            '.tml-cinematic-backdrop.tml-backdrop-visible{' +
                'opacity:1;' +
            '}' +

            /*
             * Backdrop image
             */
            '.tml-cinematic-backdrop img{' +
                'position:absolute;' +
                'top:0;' +
                'left:0;' +
                'width:100%;' +
                'height:100%;' +
                'object-fit:cover;' +
                'object-position:center center;' +
                'opacity:0;' +
                'transition:opacity .75s ease;' +
            '}' +

            '.tml-cinematic-backdrop img.tml-image-visible{' +
                'opacity:1;' +
            '}' +

            /*
             * Independent scroll darkening layer
             */
            '.tml-backdrop-dim{' +
                'position:absolute;' +
                'inset:0;' +
                'z-index:2;' +
                'background:#000;' +
                'opacity:0;' +
                'transition:opacity .18s linear;' +
                'pointer-events:none;' +
                'will-change:opacity;' +
            '}' +

            /*
             * Minimal cinematic bottom gradient
             */
            '.tml-cinematic-backdrop:after{' +
                'content:"";' +
                'position:absolute;' +
                'inset:0;' +
                'z-index:3;' +
                'background:' +
                    'linear-gradient(' +
                        'to top,' +
                        'rgba(0,0,0,.78) 0%,' +
                        'rgba(0,0,0,.48) 22%,' +
                        'rgba(0,0,0,.12) 55%,' +
                        'rgba(0,0,0,0) 78%' +
                    ');' +
                'pointer-events:none;' +
            '}' +

            /*
             * Card content above backdrop
             */
            '.full-start-new__body{' +
                'position:relative !important;' +
                'z-index:2;' +
                'display:block;' +
                'min-height:100vh;' +
                'height:auto;' +
                'background:transparent !important;' +
            '}' +

            '.full-start-new__left{' +
                'display:none !important;' +
            '}' +

            /*
             * Information block
             */
            '.full-start-new__right{' +
                'position:absolute !important;' +
                'left:0 !important;' +
                'bottom:2.5rem !important;' +
                'width:58% !important;' +
                'max-width:58% !important;' +
                'margin:0 !important;' +
                'padding:0 !important;' +
                'display:flex;' +
                'flex-direction:column;' +
                'align-items:flex-start;' +
                'box-sizing:border-box;' +
                'z-index:3;' +
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
                'height:1.5em;' +
                'margin:0 0 .45em 0;' +
                'padding:0;' +
                'overflow:hidden;' +
                'box-sizing:border-box;' +
                'opacity:0;' +
                'transform:translateY(5px);' +
                'transition:' +
                    'opacity .65s cubic-bezier(.2,.8,.2,1),' +
                    'transform .65s cubic-bezier(.2,.8,.2,1);' +
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
             * Title / movie logo
             */
            '.full-start-new__title{' +
                'display:flex;' +
                'align-items:flex-start;' +
                'justify-content:flex-start;' +
                'width:100%;' +
                'min-height:0;' +
                'margin:0 0 .5em 0;' +
                'padding:0;' +
                'font-size:2.2em;' +
                'line-height:1.1;' +
            '}' +

            '.full-start-new__title .tml-logo-image{' +
                'display:block;' +
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
                'opacity:0;' +
                'transform:translateY(12px) scale(.985);' +
                'transition:' +
                    'opacity .8s cubic-bezier(.16,1,.3,1),' +
                    'transform .8s cubic-bezier(.16,1,.3,1);' +
                'will-change:opacity,transform;' +
            '}' +

            '.full-start-new__title .tml-logo-image.tml-logo-visible{' +
                'opacity:1;' +
                'transform:translateY(0) scale(1);' +
            '}' +

            /*
             * Tagline
             */
            '.full-start-new__tagline{' +
                'width:100%;' +
                'max-width:100%;' +
                'margin:0 0 .8em 0;' +
                'padding:0;' +
                'font-size:.75em !important;' +
                'font-weight:400 !important;' +
                'font-style:italic !important;' +
                'line-height:1.45 !important;' +
                'letter-spacing:.015em;' +
                'color:rgba(255,255,255,.82) !important;' +
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
             * Metadata — no animation
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
                'color:rgba(255,255,255,.9);' +
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
             * Hide native duplicate information
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
                'color:rgba(255,255,255,.9);' +
                'opacity:.92;' +
                '-webkit-box-orient:vertical;' +
                '-webkit-line-clamp:3;' +
                'line-clamp:3;' +
            '}' +

            /*
             * Native buttons remain visible and interactive
             */
            '.full-start-new__buttons{' +
                'position:relative;' +
                'z-index:5;' +
                'display:flex;' +
                'align-items:center;' +
                'flex-wrap:wrap;' +
                'gap:.45em;' +
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
            '}';

        document.head.appendChild(css);
    }

    /*
     * Get rendered card root
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
     * Calculate current scroll position
     *
     * Supports:
     * - Window scrolling
     * - Document scrolling
     * - Lampa internal scroll containers
     * - Full card and its parent containers
     */
    function getScrollPosition(root) {
        var position = 0;

        if (window.pageYOffset) {
            position = Math.max(position, window.pageYOffset);
        }

        if (document.documentElement) {
            position = Math.max(
                position,
                document.documentElement.scrollTop || 0
            );
        }

        if (document.body) {
            position = Math.max(
                position,
                document.body.scrollTop || 0
            );
        }

        var element = root && root[0];

        while (element && element !== document) {
            if (typeof element.scrollTop === 'number') {
                position = Math.max(
                    position,
                    element.scrollTop || 0
                );
            }

            element = element.parentElement;
        }

        /*
         * Detect movement of the card itself.
         * Useful when Lampa uses translated containers.
         */
        if (root && root.length) {
            var rect = root[0].getBoundingClientRect();

            if (rect.top < 0) {
                position = Math.max(position, -rect.top);
            }
        }

        return Math.max(0, position);
    }

    /*
     * Update background darkness
     */
    function updateBackdropDarkness() {
        scrollFrame = null;

        if (
            !currentRoot ||
            !currentRoot.length ||
            !currentDimLayer ||
            !currentDimLayer.length
        ) {
            return;
        }

        var scroll = getScrollPosition(currentRoot);

        var progress = Math.min(
            1,
            scroll / SCROLL_DISTANCE
        );

        /*
         * Smooth ease-out curve
         */
        progress = progress * (2 - progress);

        var darkness = MAX_DARKNESS * progress;

        currentDimLayer.css(
            'opacity',
            darkness.toFixed(3)
        );
    }

    /*
     * Start lightweight scroll tracking
     */
    function startScrollTracking(root, token) {
        stopScrollTracking();

        if (!root || !root.length) return;

        currentScrollHandler = function () {
            if (token !== currentToken) return;

            if (scrollFrame !== null) return;

            scrollFrame = requestAnimationFrame(
                updateBackdropDarkness
            );
        };

        /*
         * Capture scroll events from internal containers.
         */
        document.addEventListener(
            'scroll',
            currentScrollHandler,
            true
        );

        window.addEventListener(
            'scroll',
            currentScrollHandler,
            { passive: true }
        );

        /*
         * Initial state
         */
        updateBackdropDarkness();
    }

    /*
     * Stop scroll tracking
     */
    function stopScrollTracking() {
        if (currentScrollHandler) {
            document.removeEventListener(
                'scroll',
                currentScrollHandler,
                true
            );

            window.removeEventListener(
                'scroll',
                currentScrollHandler
            );

            currentScrollHandler = null;
        }

        if (scrollFrame !== null) {
            cancelAnimationFrame(scrollFrame);
            scrollFrame = null;
        }
    }

    /*
     * Create independent fixed backdrop
     *
     * IMPORTANT 1.5.2:
     * Backdrop is appended directly to document.body.
     * It is no longer a child of the card root.
     */
    function prepareBackdrop(root, card, type, token) {
        if (!root || !root.length) return;
        if (!document.body) return;

        /*
         * Remove any previous backdrop.
         */
        $('.tml-cinematic-backdrop').remove();

        var backdrop = $(
            '<div class="tml-cinematic-backdrop"></div>'
        );

        var image = $('<img alt="">');

        var dimLayer = $(
            '<div class="tml-backdrop-dim"></div>'
        );

        backdrop.append(image);
        backdrop.append(dimLayer);

        /*
         * Critical change:
         * Attach backdrop directly to BODY.
         */
        $(document.body).append(backdrop);

        currentBackdrop = backdrop;
        currentDimLayer = dimLayer;

        /*
         * Enable scroll darkening immediately.
         */
        startScrollTracking(root, token);

        ensureBackdrop(card, type, function (path) {
            if (token !== currentToken) return;
            if (currentCard !== card) return;

            if (!path) {
                backdrop.addClass('tml-backdrop-visible');
                return;
            }

            var url = Lampa.Api.img(path, 'w1280');

            image.off('load error');

            image.on('load', function () {
                if (token !== currentToken) return;
                if (currentCard !== card) return;

                requestAnimationFrame(function () {
                    if (token !== currentToken) return;
                    if (currentCard !== card) return;

                    image.addClass('tml-image-visible');
                    backdrop.addClass('tml-backdrop-visible');
                });
            });

            image.on('error', function () {
                if (token !== currentToken) return;

                backdrop.addClass('tml-backdrop-visible');
            });

            image.attr('src', url);
        });
    }

    /*
     * Prepare studio logo
     */
    function prepareStudioLogo(root, card, type, token) {
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

            image.attr('alt', studio.name || '');

            image.on('error', function () {
                container.remove();
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
     * Move tagline after title
     */
    function prepareTagline(root) {
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
     * Metadata
     */
    function prepareMetadata(root, card) {
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
        var metadata = root.find(
            '.tml-cinematic-meta'
        ).first();

        if (!metadata.length) return;

        var description = root.find(
            '.tml-cinematic-description'
        ).first();

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
     * Prepare logo element
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
     * Restore original title
     */
    function showOriginalTitle(titleBlock, original, logo) {
        if (!titleBlock || !titleBlock.length) return;

        if (logo) logo.off('error load');

        titleBlock.empty();
        titleBlock.append(original);
    }

    /*
     * Display TMDB logo with premium animation
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
    }

    /*
     * Clear current card
     */
    function clearCurrent() {
        /*
         * Remove scroll listeners first.
         */
        stopScrollTracking();

        if (currentLogo) {
            currentLogo.off('error load');
        }

        /*
         * Remove body-level backdrop.
         */
        if (currentBackdrop) {
            currentBackdrop.find('img').off('load error');
            currentBackdrop.remove();
        }

        /*
         * Safety cleanup for any old nested backdrop.
         */
        if (currentRoot && currentRoot.length) {
            currentRoot.find('.tml-cinematic-backdrop').remove();
        }

        /*
         * Remove any orphaned backdrop.
         */
        $('.tml-cinematic-backdrop').remove();

        $('body').removeClass('tml-cinematic-active');

        currentCard = null;
        currentRoot = null;
        currentTitle = null;
        currentLogo = null;
        currentBackdrop = null;
        currentDimLayer = null;
    }

    /*
     * Process full card
     */
    function processCard(ev) {
        if (!ev || ev.type !== 'complite') return;

        var card = ev.data && ev.data.movie;

        if (!card || !card.id) return;

        var root = getCardRoot(ev);

        if (!root.length) return;

        var titleBlock = root.find(
            '.full-start-new__title'
        ).first();

        if (!titleBlock.length) return;

        clearCurrent();

        var token = ++currentToken;
        var type = getCardType(card);

        currentCard = card;
        currentRoot = root;
        currentTitle = titleBlock;

        $('body').addClass('tml-cinematic-active');

        /*
         * Independent body-level fixed backdrop
         * with progressive scroll darkening.
         */
        prepareBackdrop(root, card, type, token);

        /*
         * Information layout
         */
        prepareTagline(root);
        prepareMetadata(root, card);
        prepareDescription(root, card);

        /*
         * Studio logo
         */
        prepareStudioLogo(root, card, type, token);

        /*
         * Movie / series logo
         */
        var elements = prepareLogo(titleBlock);

        currentLogo = elements.logo;

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
     * Lampa full card events
     */
    Lampa.Listener.follow('full', function (ev) {
        if (!ev) return;

        if (ev.type === 'complite') {
            addCSS();
            processCard(ev);
        }

        if (ev.type === 'destroy') {
            currentToken++;
            clearCurrent();
        }
    });

    /*
     * Initialize
     */
    addCSS();

})();
