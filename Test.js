
/*
 * Card Fusion Mobile v1.1
 * Independent mobile detail-card layout for Lampa.
 * Custom responsive card, TMDB logos and background slideshow.
 *
 * Included:
 * - Custom mobile detail-card template
 * - Portrait and landscape layouts
 * - TMDB logo selection
 * - Automatic backdrop slideshow
 * - Native Lampa action selectors
 *
 * Excluded:
 * - Cardify
 * - Uator
 * - MDB Ratings
 * - Android TV / desktop layout modifications
 */

(function () {
    'use strict';

    if (window.CardFusionMobileLoaded) return;

    if (!window.Lampa ||
        !window.Lampa.Template ||
        !window.Lampa.Listener ||
        !window.jQuery) {
        console.warn('[Card Fusion Mobile] Lampa is not ready');
        return;
    }

    var Lampa = window.Lampa;
    var $ = window.jQuery;

    /* =========================================
       DEVICE DETECTION
    ========================================= */

    function isMobile() {
        var ua = navigator.userAgent || '';

        var uaMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
        var platformMobile = false;
        var touchMobile = false;

        try {
            platformMobile = !!(
                Lampa.Platform &&
                typeof Lampa.Platform.is === 'function' &&
                Lampa.Platform.is('mobile')
            );
        } catch (e) {}

        try {
            touchMobile =
                navigator.maxTouchPoints > 0 &&
                Math.max(screen.width, screen.height) <= 1000;
        } catch (e) {}

        return uaMobile || platformMobile || touchMobile;
    }

    if (!isMobile()) {
        console.log('[Card Fusion Mobile] Not a mobile device');
        return;
    }

    window.CardFusionMobileLoaded = true;

    var PREFIX = 'cfm_';

    var slideTimer = null;
    var slideToken = 0;
    var logoToken = 0;
    var activeCardKey = '';

    var initialized = false;

    /* =========================================
       SETTINGS
    ========================================= */

    function setting(name, fallback) {
        try {
            var value = Lampa.Storage.get(PREFIX + name, fallback);

            return value === undefined || value === null
                ? fallback
                : value;
        } catch (e) {
            return fallback;
        }
    }

    function addSettings() {
        if (!Lampa.SettingsApi ||
            !Lampa.SettingsApi.addComponent ||
            !Lampa.SettingsApi.addParam) return;

        try {
            Lampa.SettingsApi.addComponent({
                component: 'card_fusion_mobile',
                name: 'Card Fusion Mobile',
                icon:
                    '<svg viewBox="0 0 24 24" width="24" height="24">' +
                    '<rect x="5" y="2" width="14" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>' +
                    '<path d="M9 18h6" stroke="currentColor" stroke-width="2"/>' +
                    '</svg>'
            });

            function addParam(name, type, def, values, title, description) {
                var param = {
                    name: PREFIX + name,
                    type: type,
                    default: def
                };

                if (values) param.values = values;

                Lampa.SettingsApi.addParam({
                    component: 'card_fusion_mobile',
                    param: param,
                    field: {
                        name: title,
                        description: description || ''
                    }
                });
            }

            addParam(
                'slideshow',
                'trigger',
                true,
                null,
                'Слайдшоу фонів',
                'Автоматична зміна фонових зображень картки'
            );

            addParam(
                'quality',
                'select',
                'w1280',
                {
                    w780: 'W780',
                    w1280: 'W1280',
                    original: 'Original'
                },
                'Якість фону'
            );

            addParam(
                'interval',
                'select',
                8000,
                {
                    5000: '5 секунд',
                    8000: '8 секунд',
                    10000: '10 секунд',
                    15000: '15 секунд'
                },
                'Інтервал слайдшоу'
            );

            addParam(
                'logo',
                'trigger',
                true,
                null,
                'Логотип TMDB',
                'Показувати графічний логотип замість текстової назви'
            );

            addParam(
                'logo_language',
                'select',
                'uk',
                {
                    uk: 'Українська',
                    en: 'Англійська',
                    original: 'Оригінальна',
                    any: 'Будь-яка доступна'
                },
                'Мова логотипа'
            );

        } catch (e) {
            console.warn('[Card Fusion Mobile] Settings error:', e);
        }
    }

    /* =========================================
       CUSTOM TEMPLATE
    ========================================= */

    var mobileTemplate =

        '<div class="full-start-new cfm-card">' +

            '<div class="cfm-backdrop"></div>' +
            '<div class="cfm-shade"></div>' +

            '<div class="full-start-new__body cfm-body">' +

                '<div class="full-start-new__left cfm-poster-wrap">' +
                    '<div class="full-start-new__poster">' +
                        '<img class="full-start-new__img full--poster" />' +
                    '</div>' +
                '</div>' +

                '<div class="full-start-new__right cfm-content">' +

                    '<div class="full-start-new__head"></div>' +

                    '<div class="cfm-heading">' +

                        '<div class="cfm-logo"></div>' +

                        '<div class="full-start-new__title">{title}</div>' +

                    '</div>' +

                    '<div class="full-start-new__rate-line cfm-ratings">' +

                        '<div class="full-start__rate rate--tmdb">' +
                            '<div>{rating}</div>' +
                            '<div class="source--name">TMDB</div>' +
                        '</div>' +

                        '<div class="full-start__rate rate--imdb hide">' +
                            '<div></div><div>IMDB</div>' +
                        '</div>' +

                        '<div class="full-start__rate rate--kp hide">' +
                            '<div></div><div>KP</div>' +
                        '</div>' +

                        '<div class="full-start__rate rate--cub hide">' +
                            '<div></div><div>CUB</div>' +
                        '</div>' +

                    '</div>' +

                    '<div class="full-start-new__details cfm-details"></div>' +

                    '<div class="cfm-description"></div>' +

                    '<div class="full-start-new__buttons cfm-actions">' +

                        '<div class="full-start__button selector button--play">' +
                            '<span>#{title_watch}</span>' +
                        '</div>' +

                        '<div class="full-start__button selector button--book">' +
                            '<span>#{settings_input_links}</span>' +
                        '</div>' +

                        '<div class="full-start__button selector button--reaction">' +
                            '<span>#{title_reactions}</span>' +
                        '</div>' +

                        '<div class="full-start__button selector button--subscribe hide">' +
                            '<span>#{title_subscribe}</span>' +
                        '</div>' +

                        '<div class="full-start__button selector button--options">' +
                            '<span>#{title_more}</span>' +
                        '</div>' +

                    '</div>' +

                    '<div class="full-start-new__reactions selector">' +
                        '<div>#{reactions_none}</div>' +
                    '</div>' +

                    '<div class="full-start-new__rate-line cfm-status">' +

                        '<div class="full-start__pg hide"></div>' +
                        '<div class="full-start__status hide"></div>' +

                    '</div>' +

                '</div>' +

            '</div>' +

            '<div class="hide buttons--container">' +

                '<div class="full-start__button view--torrent hide">' +
                    '<span>#{full_torrents}</span>' +
                '</div>' +

                '<div class="full-start__button selector view--trailer">' +
                    '<span>Трейлери</span>' +
                '</div>' +

            '</div>' +

        '</div>';

    /* =========================================
       CSS
    ========================================= */

    var styles =

        '.cfm-card{' +
            'position:relative!important;' +
            'min-height:100vh;' +
            'min-height:100dvh;' +
            'overflow:hidden!important;' +
            'background:#101116!important;' +
            'color:#fff!important;' +
            'isolation:isolate;' +
            'box-sizing:border-box;' +
        '}' +

        '.cfm-card *{' +
            'box-sizing:border-box;' +
        '}' +

        '.cfm-backdrop{' +
            'position:absolute;' +
            'inset:0;' +
            'z-index:0;' +
            'background-position:center;' +
            'background-size:cover;' +
            'background-repeat:no-repeat;' +
            'opacity:.78;' +
            'transform:scale(1.02);' +
            'transition:opacity .5s ease;' +
            'pointer-events:none;' +
        '}' +

        '.cfm-shade{' +
            'position:absolute;' +
            'inset:0;' +
            'z-index:1;' +
            'pointer-events:none;' +
            'background:' +
            'linear-gradient(0deg,rgba(8,9,13,.99) 0%,rgba(8,9,13,.84) 43%,rgba(8,9,13,.28) 100%),' +
            'linear-gradient(90deg,rgba(8,9,13,.4),transparent 75%);' +
        '}' +

        '.cfm-body{' +
            'position:relative!important;' +
            'z-index:2;' +
            'display:flex!important;' +
            'flex-direction:column!important;' +
            'align-items:stretch!important;' +
            'justify-content:flex-end!important;' +
            'box-sizing:border-box!important;' +
            'min-height:100vh;' +
            'min-height:100dvh;' +
            'height:auto!important;' +
            'padding:24px 5vw 34px!important;' +
            'gap:18px;' +
        '}' +

        '.cfm-poster-wrap{' +
            'display:none!important;' +
        '}' +

        '.cfm-content{' +
            'display:flex!important;' +
            'position:relative;' +
            'flex-direction:column!important;' +
            'align-items:stretch!important;' +
            'width:100%!important;' +
            'max-width:100%!important;' +
            'min-width:0!important;' +
            'gap:12px;' +
        '}' +

        '.cfm-heading{' +
            'display:flex;' +
            'flex-direction:column;' +
            'align-items:flex-start;' +
            'gap:8px;' +
        '}' +

        '.cfm-logo{' +
            'display:none;' +
            'max-width:88%;' +
            'max-height:19vh;' +
            'align-items:flex-start;' +
            'justify-content:flex-start;' +
        '}' +

        '.cfm-logo img{' +
            'display:block;' +
            'max-width:100%;' +
            'max-height:19vh;' +
            'object-fit:contain;' +
            'object-position:left center;' +
        '}' +

        '.cfm-card .full-start-new__title{' +
            'display:block!important;' +
            'font-size:clamp(25px,6vw,42px)!important;' +
            'line-height:1.08!important;' +
            'font-weight:800!important;' +
            'text-shadow:0 2px 16px #000!important;' +
            'margin:0!important;' +
        '}' +

        '.cfm-card .cfm-title-hidden{' +
            'display:none!important;' +
        '}' +

        '.cfm-ratings,.cfm-status{' +
            'display:flex!important;' +
            'flex-wrap:wrap;' +
            'gap:9px;' +
            'align-items:center;' +
            'margin:0!important;' +
        '}' +

        '.cfm-details{' +
            'display:flex!important;' +
            'flex-wrap:wrap!important;' +
            'gap:7px 10px!important;' +
            'max-height:none!important;' +
            'height:auto!important;' +
            'overflow:visible!important;' +
            'font-size:13px!important;' +
        '}' +

        '.cfm-description{' +
            'display:-webkit-box!important;' +
            '-webkit-box-orient:vertical;' +
            '-webkit-line-clamp:4;' +
            'overflow:hidden!important;' +
            'font-size:14px!important;' +
            'line-height:1.45!important;' +
            'color:rgba(255,255,255,.88)!important;' +
            'max-width:850px;' +
            'text-shadow:0 1px 5px #000;' +
        '}' +

        '.cfm-actions{' +
            'display:flex!important;' +
            'flex-wrap:wrap!important;' +
            'gap:9px!important;' +
            'margin-top:5px!important;' +
        '}' +

        '.cfm-actions .full-start__button{' +
            'display:flex!important;' +
            'align-items:center;' +
            'justify-content:center;' +
            'min-height:44px;' +
            'padding:0 15px!important;' +
            'border-radius:12px!important;' +
            'background:rgba(255,255,255,.13)!important;' +
            'border:1px solid rgba(255,255,255,.15)!important;' +
            'backdrop-filter:blur(12px);' +
            '-webkit-backdrop-filter:blur(12px);' +
            'font-size:14px!important;' +
        '}' +

        '.cfm-actions .button--play{' +
            'background:#fff!important;' +
            'color:#111!important;' +
            'font-weight:700!important;' +
        '}' +

        '.cfm-actions .hide{' +
            'display:none!important;' +
        '}' +

        '.cfm-card .full-start-new__reactions{' +
            'display:none!important;' +
        '}' +

        '.cfm-card .full-start-new__head{' +
            'display:block!important;' +
        '}' +

        '.cfm-card .full-start-new__rate-line .full-start__rate{' +
            'margin:0!important;' +
        '}' +

        '.cfm-card .full-start-new__details>div{' +
            'margin:0!important;' +
        '}' +

        '@media (orientation:landscape) and (min-width:600px){' +

            '.cfm-body{' +
                'min-height:100vh;' +
                'min-height:100dvh;' +
                'display:grid!important;' +
                'grid-template-columns:minmax(120px,25vw) minmax(0,1fr);' +
                'align-items:end!important;' +
                'gap:4vw;' +
                'padding:5vh 5vw!important;' +
            '}' +

            '.cfm-poster-wrap{' +
                'display:block!important;' +
                'align-self:end;' +
                'max-width:25vw;' +
            '}' +

            '.cfm-poster-wrap .full-start-new__poster{' +
                'width:100%;' +
                'max-width:25vw;' +
                'border-radius:14px;' +
                'overflow:hidden;' +
                'box-shadow:0 12px 40px rgba(0,0,0,.5);' +
            '}' +

            '.cfm-poster-wrap .full-start-new__img{' +
                'display:block;' +
                'width:100%;' +
                'height:auto;' +
                'object-fit:cover;' +
            '}' +

            '.cfm-content{' +
                'max-width:900px!important;' +
                'gap:14px;' +
            '}' +

            '.cfm-card .full-start-new__title{' +
                'font-size:clamp(28px,4vw,54px)!important;' +
            '}' +

            '.cfm-description{' +
                '-webkit-line-clamp:5;' +
            '}' +

        '}' +

        '@media (orientation:portrait){' +

            '.cfm-body{' +
                'padding-top:16vh!important;' +
            '}' +

            '.cfm-card .full-start-new__title{' +
                'font-size:clamp(24px,7vw,36px)!important;' +
            '}' +

            '.cfm-description{' +
                '-webkit-line-clamp:4;' +
            '}' +

        '}' +

        '@media (max-width:380px){' +

            '.cfm-body{' +
                'padding-left:4vw!important;' +
                'padding-right:4vw!important;' +
            '}' +

            '.cfm-actions .full-start__button{' +
                'min-height:40px;' +
                'padding:0 11px!important;' +
                'font-size:12px!important;' +
            '}' +

            '.cfm-description{' +
                '-webkit-line-clamp:3;' +
            '}' +

        '}';

    function installStyles() {
        if (document.getElementById('card-fusion-mobile-style')) return;

        var style = document.createElement('style');

        style.id = 'card-fusion-mobile-style';
        style.type = 'text/css';
        style.textContent = styles;

        document.head.appendChild(style);
    }

    /* =========================================
       TEMPLATE REGISTRATION
    ========================================= */

    function registerTemplate() {
        try {
            Lampa.Template.add('full_start_new', mobileTemplate);

            console.log('[Card Fusion Mobile] Template registered');

            return true;
        } catch (e) {
            console.error('[Card Fusion Mobile] Template error:', e);

            return false;
        }
    }

    /* =========================================
       HELPERS
    ========================================= */

    function imageUrl(path, quality) {
        if (!path || !Lampa.TMDB || !Lampa.TMDB.image) return '';

        try {
            return Lampa.TMDB.image('t/p/' + quality + path);
        } catch (e) {
            return '';
        }
    }

    function getMovie(event) {
        return (event.data && (event.data.movie || event.data.tv)) ||
            (event.object && event.object.card) ||
            {};
    }

    function getMediaType(event, movie) {
        if (event && event.data && event.data.tv && !event.data.movie) {
            return 'tv';
        }

        if (event && event.object &&
            event.object.method === 'tv') {
            return 'tv';
        }

        if (movie && (movie.name || movie.first_air_date) && !movie.title) {
            return 'tv';
        }

        return 'movie';
    }

    function getRender(event) {
        try {
            if (event &&
                event.object &&
                event.object.activity &&
                typeof event.object.activity.render === 'function') {

                var render = event.object.activity.render();

                if (render && render.jquery) return render;

                return $(render);
            }
        } catch (e) {
            console.warn('[Card Fusion Mobile] Render error:', e);
        }

        return $();
    }

    /* =========================================
       BACKGROUND IMAGE
    ========================================= */

    function setBackdrop($render, url) {
        if (!url || !$render || !$render.length) return;

        var $layer = $render.find('.cfm-backdrop').first();

        if (!$layer.length) return;

        var image = new Image();

        image.onload = function () {
            if (!$render[0] || !document.body.contains($render[0])) return;

            $layer.css({
                backgroundImage: 'url("' + url.replace(/"/g, '') + '")',
                opacity: '.78'
            });
        };

        image.onerror = function () {
            console.warn('[Card Fusion Mobile] Backdrop load failed');
        };

        image.src = url;
    }

    /* =========================================
       SLIDESHOW
    ========================================= */

    function stopSlideshow() {
        slideToken++;

        if (slideTimer) {
            clearInterval(slideTimer);
        }

        slideTimer = null;
    }

    function startSlideshow(movie, type, $render) {
        stopSlideshow();

        var token = slideToken;

        if (!setting('slideshow', true) ||
            !movie ||
            !movie.id ||
            !Lampa.Api ||
            !Lampa.Api.sources ||
            !Lampa.Api.sources.tmdb) return;

        var include = 'uk,en,null,xx';

        try {
            Lampa.Api.sources.tmdb.get(
                type + '/' + movie.id + '/images?include_image_language=' + include,
                {},
                function (data) {
                    if (token !== slideToken ||
                        !$render[0] ||
                        !document.body.contains($render[0]) ||
                        !data ||
                        !Array.isArray(data.backdrops)) return;

                    var backdrops = data.backdrops.slice();

                    backdrops.sort(function (a, b) {
                        var aa = a.iso_639_1 ? 1 : 0;
                        var bb = b.iso_639_1 ? 1 : 0;

                        return aa - bb ||
                            (b.vote_average || 0) - (a.vote_average || 0);
                    });

                    backdrops = backdrops.filter(function (item) {
                        return item && item.file_path;
                    }).slice(0, 15);

                    if (!backdrops.length) return;

                    var quality = setting('quality', 'w1280');
                    var index = 0;

                    setBackdrop(
                        $render,
                        imageUrl(backdrops[0].file_path, quality)
                    );

                    if (backdrops.length < 2) return;

                    var interval = parseInt(setting('interval', 8000), 10);

                    if (!interval || interval < 1000) interval = 8000;

                    slideTimer = setInterval(function () {
                        if (token !== slideToken ||
                            !$render[0] ||
                            !document.body.contains($render[0])) {

                            stopSlideshow();
                            return;
                        }

                        index = (index + 1) % backdrops.length;

                        setBackdrop(
                            $render,
                            imageUrl(backdrops[index].file_path, quality)
                        );

                    }, interval);
                }
            );
        } catch (e) {
            console.warn('[Card Fusion Mobile] Slideshow error:', e);
        }
    }

    /* =========================================
       TMDB LOGOS
    ========================================= */

    function loadLogo(movie, type, $render) {
        var token = ++logoToken;

        var $title = $render.find('.full-start-new__title').first();
        var $logo = $render.find('.cfm-logo').first();

        if (!$title.length || !$logo.length) return;

        $logo.empty().hide();
        $title.removeClass('cfm-title-hidden');

        if (!setting('logo', true) ||
            !movie ||
            !movie.id ||
            !Lampa.Api ||
            !Lampa.Api.sources ||
            !Lampa.Api.sources.tmdb) return;

        var lang = setting('logo_language', 'uk');

        var languages = lang === 'any'
            ? 'uk,en,null'
            : lang === 'original'
                ? 'null,en,uk'
                : lang + ',null,en';

        try {
            Lampa.Api.sources.tmdb.get(
                type + '/' + movie.id + '/images?include_image_language=' + languages,
                {},
                function (data) {
                    if (token !== logoToken ||
                        !$render[0] ||
                        !document.body.contains($render[0]) ||
                        !data ||
                        !Array.isArray(data.logos)) return;

                    var logos = data.logos.filter(function (logo) {
                        return logo && logo.file_path;
                    });

                    function rank(logo) {
                        if (lang === 'any') {
                            return logo.iso_639_1 === 'uk' ? 0 :
                                logo.iso_639_1 === 'en' ? 1 : 2;
                        }

                        if (lang === 'original') {
                            return !logo.iso_639_1 ? 0 :
                                logo.iso_639_1 === 'en' ? 1 : 2;
                        }

                        return logo.iso_639_1 === lang ? 0 :
                            !logo.iso_639_1 ? 1 :
                            logo.iso_639_1 === 'en' ? 2 : 3;
                    }

                    logos.sort(function (a, b) {
                        return rank(a) - rank(b) ||
                            (b.vote_average || 0) - (a.vote_average || 0);
                    });

                    if (!logos.length) return;

                    var url = imageUrl(logos[0].file_path, 'w500');

                    if (!url) return;

                    var img = new Image();

                    img.onload = function () {
                        if (token !== logoToken ||
                            !$render[0] ||
                            !document.body.contains($render[0])) return;

                        $logo.empty().append(img).css('display', 'flex');

                        $title.addClass('cfm-title-hidden');
                    };

                    img.onerror = function () {
                        if (token === logoToken) {
                            $logo.empty().hide();
                            $title.removeClass('cfm-title-hidden');
                        }
                    };

                    img.alt = '';
                    img.src = url;
                }
            );
        } catch (e) {
            console.warn('[Card Fusion Mobile] Logo error:', e);
        }
    }

    /* =========================================
       CARD INITIALIZATION
    ========================================= */

    function initializeCard(event) {
        if (!event || event.type !== 'complite') return;

        var movie = getMovie(event);

        if (!movie || !movie.id) return;

        var type = getMediaType(event, movie);

        var key = type + ':' + movie.id;

        var $render = getRender(event);

        if (!$render.length) return;

        var $card = $render.find('.cfm-card').first();

        if (!$card.length) {
            console.warn(
                '[Card Fusion Mobile] Custom template not found. ' +
                'Lampa may be using another template.'
            );

            return;
        }

        activeCardKey = key;

        stopSlideshow();

        logoToken++;

        var overview = movie.overview ||
            movie.description ||
            '';

        $render.find('.cfm-description').text(overview);

        startSlideshow(movie, type, $render);

        loadLogo(movie, type, $render);

        console.log('[Card Fusion Mobile] Card initialized:', key);
    }

    /* =========================================
       NAVIGATION
    ========================================= */

    function onActivity(event) {
        if (!event) return;

        if (event.type === 'back' ||
            event.type === 'destroy') {

            stopSlideshow();

            logoToken++;

            activeCardKey = '';
        }
    }

    /* =========================================
       START PLUGIN
    ========================================= */

    function startPlugin() {
        if (initialized) return;

        initialized = true;

        installStyles();

        var registered = registerTemplate();

        if (!registered) {
            initialized = false;
            return;
        }

        addSettings();

        Lampa.Listener.follow('full', initializeCard);

        Lampa.Listener.follow('activity', onActivity);

        console.log('[Card Fusion Mobile] v1.1 loaded successfully');
    }

    /* =========================================
       WAIT FOR LAMPA APP
    ========================================= */

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event && event.type === 'ready') {
                startPlugin();
            }
        });
    }

})();
