
/* Card Fusion Mobile v1.0
 * Independent mobile detail-card layout for Lampa.
 * Custom card, TMDB logos and background slideshow.
 * No Cardify, TV layout, Uator or MDB Ratings.
 */
(function () {
    'use strict';

    if (window.CardFusionMobileLoaded) return;
    window.CardFusionMobileLoaded = true;

    if (!window.Lampa || !window.Lampa.Template || !window.Lampa.Listener) return;

    var $ = window.jQuery;
    if (!$) return;

    var PREFIX = 'cfm_';
    var currentKey = '';
    var slideTimer = null;
    var slideToken = 0;
    var logoToken = 0;

    function isMobile() {
        try {
            if (Lampa.Platform && typeof Lampa.Platform.is === 'function') {
                return Lampa.Platform.is('mobile');
            }
        } catch (e) {}

        return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    }

    // Mobile devices only.
    if (!isMobile()) return;

    function setting(name, fallback) {
        var value = Lampa.Storage.get(PREFIX + name, fallback);
        return value === undefined || value === null ? fallback : value;
    }

    /* SETTINGS */

    function addSettings() {
        if (!Lampa.SettingsApi ||
            !Lampa.SettingsApi.addComponent ||
            !Lampa.SettingsApi.addParam) return;

        try {
            Lampa.SettingsApi.addComponent({
                component: 'card_fusion_mobile',
                name: 'Card Fusion Mobile',
                icon: '<svg viewBox="0 0 24 24" width="24" height="24"><rect x="5" y="2" width="14" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 18h6" stroke="currentColor" stroke-width="2"/></svg>'
            });

            function param(name, type, def, values, title, description) {
                var p = {
                    name: PREFIX + name,
                    type: type,
                    default: def
                };

                if (values) p.values = values;

                Lampa.SettingsApi.addParam({
                    component: 'card_fusion_mobile',
                    param: p,
                    field: {
                        name: title,
                        description: description || ''
                    }
                });
            }

            param(
                'slideshow',
                'trigger',
                true,
                null,
                'Слайдшоу фонів',
                'Автоматична зміна фонових зображень картки'
            );

            param(
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

            param(
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

            param(
                'logo',
                'trigger',
                true,
                null,
                'Логотип TMDB',
                'Показувати графічний логотип замість текстової назви'
            );

            param(
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
            console.warn('[Card Fusion Mobile] settings:', e);
        }
    }

    /* CUSTOM MOBILE TEMPLATE */

    var mobileTemplate = '' +
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

              '<div class="full-start-new__description cfm-description">{overview}</div>' +

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

    // Replace the native detail-card template on mobile.
    Lampa.Template.add('full_start_new', mobileTemplate);

    /* CSS */

    var styles = '' +

    '.cfm-card{' +
      'position:relative!important;' +
      'min-height:100vh;' +
      'min-height:100dvh;' +
      'overflow:hidden!important;' +
      'background:#101116!important;' +
      'color:#fff!important;' +
      'isolation:isolate' +
    '}' +

    '.cfm-backdrop{' +
      'position:absolute;' +
      'inset:0;' +
      'background-position:center;' +
      'background-size:cover;' +
      'opacity:.72;' +
      'z-index:-3;' +
      'transform:scale(1.02)' +
    '}' +

    '.cfm-shade{' +
      'position:absolute;' +
      'inset:0;' +
      'z-index:-2;' +
      'background:' +
      'linear-gradient(0deg,rgba(8,9,13,.99) 0%,rgba(8,9,13,.82) 43%,rgba(8,9,13,.28) 100%),' +
      'linear-gradient(90deg,rgba(8,9,13,.4),transparent 75%)' +
    '}' +

    '.cfm-body{' +
      'position:relative!important;' +
      'display:flex!important;' +
      'flex-direction:column!important;' +
      'align-items:stretch!important;' +
      'justify-content:flex-end!important;' +
      'box-sizing:border-box!important;' +
      'min-height:100vh;' +
      'min-height:100dvh;' +
      'height:auto!important;' +
      'padding:24px 5vw 34px!important;' +
      'gap:18px' +
    '}' +

    '.cfm-poster-wrap{' +
      'display:none!important' +
    '}' +

    '.cfm-content{' +
      'display:flex!important;' +
      'flex-direction:column!important;' +
      'align-items:stretch!important;' +
      'width:100%!important;' +
      'max-width:100%!important;' +
      'min-width:0!important;' +
      'gap:12px' +
    '}' +

    '.cfm-heading{' +
      'display:flex;' +
      'flex-direction:column;' +
      'align-items:flex-start;' +
      'gap:8px' +
    '}' +

    '.cfm-logo{' +
      'display:none;' +
      'max-width:88%;' +
      'max-height:19vh;' +
      'align-items:flex-start;' +
      'justify-content:flex-start' +
    '}' +

    '.cfm-logo img{' +
      'display:block;' +
      'max-width:100%;' +
      'max-height:19vh;' +
      'object-fit:contain;' +
      'object-position:left center' +
    '}' +

    '.cfm-card .full-start-new__title{' +
      'display:block!important;' +
      'font-size:clamp(25px,6vw,42px)!important;' +
      'line-height:1.08!important;' +
      'font-weight:800!important;' +
      'text-shadow:0 2px 16px #000!important;' +
      'margin:0!important' +
    '}' +

    '.cfm-ratings,.cfm-status{' +
      'display:flex!important;' +
      'flex-wrap:wrap;' +
      'gap:9px;' +
      'align-items:center;' +
      'margin:0!important' +
    '}' +

    '.cfm-details{' +
      'display:flex!important;' +
      'flex-wrap:wrap!important;' +
      'gap:7px 10px!important;' +
      'max-height:none!important;' +
      'height:auto!important;' +
      'overflow:visible!important;' +
      'font-size:13px!important' +
    '}' +

    '.cfm-description{' +
      'display:-webkit-box!important;' +
      '-webkit-box-orient:vertical;' +
      '-webkit-line-clamp:4;' +
      'overflow:hidden!important;' +
      'font-size:14px!important;' +
      'line-height:1.45!important;' +
      'color:rgba(255,255,255,.88)!important;' +
      'max-width:850px' +
    '}' +

    '.cfm-actions{' +
      'display:flex!important;' +
      'flex-wrap:wrap!important;' +
      'gap:9px!important;' +
      'margin-top:5px!important' +
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
      'font-size:14px!important' +
    '}' +

    '.cfm-actions .button--play{' +
      'background:#fff!important;' +
      'color:#111!important;' +
      'font-weight:700!important' +
    '}' +

    '.cfm-actions .hide{' +
      'display:none!important' +
    '}' +

    '.cfm-card .full-start-new__reactions{' +
      'display:none!important' +
    '}' +

    '.cfm-card .full-start-new__head{' +
      'display:block!important' +
    '}' +

    '.cfm-card .full-start-new__rate-line .full-start__rate{' +
      'margin:0!important' +
    '}' +

    '.cfm-card .full-start-new__details>div{' +
      'margin:0!important' +
    '}' +

    '.cfm-card .full-start-new__title.cfm-title-hidden{' +
      'display:none!important' +
    '}' +

    '@media (orientation:landscape) and (min-width:600px){' +

      '.cfm-body{' +
        'min-height:100vh;' +
        'min-height:100dvh;' +
        'display:grid!important;' +
        'grid-template-columns:minmax(120px,25vw) minmax(0,1fr);' +
        'align-items:end!important;' +
        'gap:4vw;' +
        'padding:5vh 5vw!important' +
      '}' +

      '.cfm-poster-wrap{' +
        'display:block!important;' +
        'align-self:end;' +
        'max-width:25vw' +
      '}' +

      '.cfm-poster-wrap .full-start-new__poster{' +
        'width:100%;' +
        'max-width:25vw;' +
        'border-radius:14px;' +
        'overflow:hidden;' +
        'box-shadow:0 12px 40px rgba(0,0,0,.5)' +
      '}' +

      '.cfm-poster-wrap .full-start-new__img{' +
        'display:block;' +
        'width:100%;' +
        'height:auto;' +
        'object-fit:cover' +
      '}' +

      '.cfm-content{' +
        'max-width:900px!important;' +
        'gap:14px' +
      '}' +

      '.cfm-card .full-start-new__title{' +
        'font-size:clamp(28px,4vw,54px)!important' +
      '}' +

      '.cfm-description{' +
        '-webkit-line-clamp:5' +
      '}' +

    '}' +

    '@media (orientation:portrait){' +
      '.cfm-body{padding-top:16vh!important}' +
      '.cfm-card .full-start-new__title{' +
        'font-size:clamp(24px,7vw,36px)!important' +
      '}' +
      '.cfm-description{-webkit-line-clamp:4}' +
    '}' +

    '@media (max-width:380px){' +
      '.cfm-body{' +
        'padding-left:4vw!important;' +
        'padding-right:4vw!important' +
      '}' +
      '.cfm-actions .full-start__button{' +
        'min-height:40px;' +
        'padding:0 11px!important;' +
        'font-size:12px!important' +
      '}' +
      '.cfm-description{-webkit-line-clamp:3}' +
    '}';

    $('<style id="card-fusion-mobile-style">' + styles + '</style>').appendTo('head');

    /* HELPERS */

    function mediaType(event, movie) {
        if (event && event.object && event.object.method === 'tv') return 'tv';
        if (event && event.data && event.data.tv && !event.data.movie) return 'tv';

        return movie && (movie.name || movie.first_air_date) && !movie.title
            ? 'tv'
            : 'movie';
    }

    function imageUrl(path, quality) {
        if (!path) return '';
        return Lampa.TMDB.image('t/p/' + quality + path);
    }

    /* BACKGROUND */

    function setBackdrop($render, url) {
        if (!url || !$render || !$render.length) return;

        var $layer = $render.find('.cfm-backdrop').first();
        if (!$layer.length) return;

        var img = new Image();

        img.onload = function () {
            if (!$render.closest('body').length) return;

            $layer.css({
                backgroundImage: 'url("' + url.replace(/"/g, '') + '")',
                transition: 'background-image .6s ease, opacity .6s ease'
            });
        };

        img.src = url;
    }

    /* SLIDESHOW */

    function stopSlideshow() {
        slideToken++;

        if (slideTimer) {
            clearInterval(slideTimer);
        }

        slideTimer = null;
    }

    function startSlideshow(event, movie, type, $render) {
        stopSlideshow();

        var token = slideToken;

        if (!setting('slideshow', true) ||
            !movie ||
            !movie.id ||
            !Lampa.Api ||
            !Lampa.Api.sources ||
            !Lampa.Api.sources.tmdb) return;

        var include = 'uk,en,null,xx';

        Lampa.Api.sources.tmdb.get(
            type + '/' + movie.id + '/images?include_image_language=' + include,
            {},
            function (data) {
                if (token !== slideToken ||
                    !data ||
                    !Array.isArray(data.backdrops)) return;

                var backdrops = data.backdrops.slice().sort(function (a, b) {
                    var aa = a.iso_639_1 ? 1 : 0;
                    var bb = b.iso_639_1 ? 1 : 0;

                    return aa - bb ||
                        (b.vote_average || 0) - (a.vote_average || 0);
                }).slice(0, 15);

                if (!backdrops.length) return;

                var quality = setting('quality', 'w1280');
                var index = 0;

                setBackdrop(
                    $render,
                    imageUrl(backdrops[0].file_path, quality)
                );

                if (backdrops.length < 2) return;

                slideTimer = setInterval(function () {
                    if (token !== slideToken ||
                        !document.body.contains($render[0])) {
                        stopSlideshow();
                        return;
                    }

                    index = (index + 1) % backdrops.length;

                    setBackdrop(
                        $render,
                        imageUrl(backdrops[index].file_path, quality)
                    );

                }, parseInt(setting('interval', 8000), 10) || 8000);
            }
        );
    }

    /* TMDB LOGOS */

    function loadLogo(event, movie, type, $render) {
        var token = ++logoToken;

        var $title = $render.find('.full-start-new__title').first();
        var $logo = $render.find('.cfm-logo').first();

        if (!$title.length ||
            !$logo.length ||
            !setting('logo', true) ||
            !movie ||
            !movie.id) return;

        var lang = setting('logo_language', 'uk');

        var languages = lang === 'any'
            ? 'uk,en,null'
            : (lang === 'original' ? 'null,en,uk' : lang + ',null,en');

        Lampa.Api.sources.tmdb.get(
            type + '/' + movie.id + '/images?include_image_language=' + languages,
            {},
            function (data) {
                if (token !== logoToken ||
                    !data ||
                    !Array.isArray(data.logos)) return;

                var logos = data.logos.slice();

                logos.sort(function (a, b) {
                    function rank(x) {
                        if (lang === 'any') {
                            return x.iso_639_1 === 'uk' ? 0 :
                                x.iso_639_1 === 'en' ? 1 : 2;
                        }

                        if (lang === 'original') {
                            return !x.iso_639_1 ? 0 :
                                x.iso_639_1 === 'en' ? 1 : 2;
                        }

                        return x.iso_639_1 === lang ? 0 :
                            !x.iso_639_1 ? 1 :
                            x.iso_639_1 === 'en' ? 2 : 3;
                    }

                    return rank(a) - rank(b) ||
                        (b.vote_average || 0) - (a.vote_average || 0);
                });

                if (!logos.length || token !== logoToken) return;

                var url = imageUrl(logos[0].file_path, 'w500');
                var img = $('<img alt="">');

                img.on('load', function () {
                    if (token !== logoToken) return;

                    $logo.empty().append(img).css('display', 'flex');
                    $title.addClass('cfm-title-hidden');
                });

                img.attr('src', url);
            }
        );
    }

    /* LAMPA EVENTS */

    function currentRender(event) {
        try {
            if (event &&
                event.object &&
                event.object.activity &&
                typeof event.object.activity.render === 'function') {
                return $(event.object.activity.render());
            }
        } catch (e) {}

        return $();
    }

    Lampa.Listener.follow('full', function (event) {
        if (!event || event.type !== 'complite') return;

        var movie = (event.data && (event.data.movie || event.data.tv)) ||
            (event.object && event.object.card) || {};

        var type = mediaType(event, movie);
        var key = type + ':' + movie.id;

        currentKey = key;

        var $render = currentRender(event);
        if (!$render.length) return;

        var $card = $render.find('.cfm-card').first();
        if (!$card.length) return;

        logoToken++;

        startSlideshow(event, movie, type, $render);
        loadLogo(event, movie, type, $render);

        var overview = movie.overview || movie.description || '';

        if (overview) {
            $render.find('.cfm-description').text(overview);
        }
    });

    Lampa.Listener.follow('activity', function (event) {
        if (event && (event.type === 'back' || event.type === 'destroy')) {
            stopSlideshow();
            logoToken++;
            currentKey = '';
        }
    });

    addSettings();

    console.log('[Card Fusion Mobile] loaded');

})();
