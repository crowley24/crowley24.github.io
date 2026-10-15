
(function () {
    'use strict';

    /*
     * @name MOB_INTERFACE
     * @version 3.1
     * @author Crowley24
     * @description Premium Mobile Interface for Lampa
     * @platforms Lampa | Mobile
     *
     * Основа: стабільна версія 3.0.1
     *
     * Покращення:
     * 1. Плавне двошарове слайд-шоу
     * 2. Оптимізовані анімації
     * 3. Логотипи з безпечним fallback
     * 4. Ізоляція стилів від Plugin Manager
     * 5. Кеш TMDB з TTL і обмеженням розміру
     * 6. Захист від застарілих відповідей
     * 7. Аналіз бейджів одного релізу
     * 8. Адаптація до мобільних екранів
     * 9. Делікатне полірування дизайну
     *
     * Усі ключі налаштувань 3.0.1 збережено.
     */

    if (window.MOB_INTERFACE_V310_READY) return;

    if (
        !window.Lampa ||
        !Lampa.Storage ||
        !Lampa.Listener
    ) {
        return;
    }

    window.MOB_INTERFACE_V310_READY = true;

    var VERSION = '3.1';
    var PREFIX = 'mobile_interface_';
    var STYLE_ID = 'mobile-interface-styles';

    var pluginPath =
        'https://crowley24.github.io/Icons/';

    var TMDB_CACHE_TTL = 30 * 60 * 1000;
    var TMDB_CACHE_LIMIT = 35;

    var BADGE_CACHE_TTL = 5 * 60 * 1000;
    var BADGE_CACHE_LIMIT = 25;

    var detailsCache = {};
    var badgeCache = {};

    var started = false;
    var operationId = 0;
    var currentContext = null;

    var slideshowTimer = null;
    var slideshowToken = 0;
    var slideshowState = null;

    var activeAjax = null;

    var settings_list = [
        {
            id: 'mobile_interface_animation',
            default: true
        },
        {
            id: 'mobile_interface_ui_anim',
            default: true
        },
        {
            id: 'mobile_interface_ui_anim_effect',
            default: 'fluid'
        },
        {
            id: 'mobile_interface_badge_anim',
            default: 'pulse'
        },
        {
            id: 'mobile_interface_slideshow',
            default: true
        },
        {
            id: 'mobile_interface_slideshow_time',
            default: '10000'
        },
        {
            id: 'mobile_interface_slideshow_quality',
            default: 'w780'
        },
        {
            id: 'mobile_interface_logo_size_v2',
            default: '125'
        },
        {
            id: 'mobile_interface_logo_quality',
            default: 'w500'
        },
        {
            id: 'mobile_interface_show_tagline',
            default: true
        },
        {
            id: 'mobile_interface_blocks_gap',
            default: '8px'
        },
        {
            id: 'mobile_interface_ratings_size',
            default: '0.45em'
        },
        {
            id: 'mobile_interface_studios',
            default: true
        },
        {
            id: 'mobile_interface_quality',
            default: true
        }
    ];

    var eliteBadgesConfig = [
        {
            id: '4k-ultra-hd',
            pattern: /\b(4k|2160p|uhd|ultra[\s._-]*hd)\b/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/4k_ultra_hd.png',
            group: 'resolution',
            priority: 3
        },
        {
            id: '1080p-full-hd',
            pattern: /\b(1080p|fhd|full[\s._-]*hd)\b/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/1080p_full_hd.png',
            group: 'resolution',
            priority: 2
        },
        {
            id: '720p-hd',
            pattern: /\b720p\b/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/720p_hd.png',
            group: 'resolution',
            priority: 1
        },
        {
            id: 'dolby-vision',
            pattern: /\b(dolby[\s._-]*vision|dovi|dv)\b/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_vision.png',
            group: 'vision',
            priority: 3
        },
        {
            id: 'hdr',
            pattern: /\b(hdr10\+|hdr10[\s._-]*plus|hdr[\s._-]*10[\s._-]*\+?|hdr)\b/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/hdr.png',
            group: 'dynamic',
            priority: 2
        },
        {
            id: 'sdr',
            pattern: /\bsdr\b/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/SDR_transparent_4x.png',
            group: 'dynamic',
            priority: 1
        },
        {
            id: 'dolby-atmos',
            pattern: /\b(dolby[\s._-]*atmos|atmos)\b/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_atmos.png',
            group: 'spatial',
            priority: 3
        },
        {
            id: 'truehd',
            pattern: /\b(truehd|true[\s._-]*hd|dolby[\s._-]*truehd)\b/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/truehd.png',
            group: 'audio',
            priority: 6
        },
        {
            id: 'dolby-digital-plus',
            pattern: /\b(ddp[\s._-]*[0-9][\s._-]*[0-9]|ddp|dd\+|dolby[\s._-]*digital[\s._-]*plus|e-?ac-?3)(?![a-z])/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_digital_plus.png',
            group: 'audio',
            priority: 4
        },
        {
            id: 'dolby-digital',
            pattern: /\b(dd[\s._-]*[0-9][\s._-]*[0-9]|dd|dolby[\s._-]*digital|ac-?3)(?![\s._-]*plus|\+|p|[a-z])/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dolby_digital.png',
            group: 'audio',
            priority: 2
        },
        {
            id: 'dts-hd-master-audio',
            pattern: /\b(dts[\s._-]*hd[\s._-]*ma|dtshd[\s._-]*ma|dts[\s._-]*hd[\s._-]*master)\b/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dts_hd_master_audio.png',
            group: 'audio',
            priority: 5
        },
        {
            id: 'dts-hd',
            pattern: /\b(dts[\s._-]*hd|dtshd)(?![\s._-]*(ma|master)|ma)\b/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dts_hd.png',
            group: 'audio',
            priority: 3
        },
        {
            id: 'dts',
            pattern: /\bdts\b(?![\s._:-]*(x|hd))/i,
            imageURL:
                'https://raw.githubusercontent.com/leonevz/Elite-Badges/main/Badges/dts.png',
            group: 'audio',
            priority: 1
        }
    ];

    var ratingIcons = {
        tmdb:
            'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub:
            'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    /*
     * --------------------------------------------------
     * НАЛАШТУВАННЯ
     * --------------------------------------------------
     */

    function getSetting(name, fallback) {
        return Lampa.Storage.get(
            PREFIX + name,
            fallback
        );
    }

    function initDefaults() {
        settings_list.forEach(function (opt) {
            if (
                Lampa.Storage.get(
                    opt.id,
                    'unset'
                ) === 'unset'
            ) {
                Lampa.Storage.set(
                    opt.id,
                    opt.default
                );
            }
        });
    }

    function enabled(value) {
        return value === true ||
            value === 'true' ||
            value === 1 ||
            value === '1';
    }

    function safeNumber(value, fallback) {
        var n = parseFloat(value);

        return isFinite(n) ? n : fallback;
    }

    function safeText(value) {
        return value == null
            ? ''
            : String(value);
    }

    function validCssValue(value, allowed, fallback) {
        value = safeText(value);

        return allowed.indexOf(value) !== -1
            ? value
            : fallback;
    }

    function isMobile() {
        return window.innerWidth <= 480;
    }

    function isAttached(element) {
        return !!(
            element &&
            document.documentElement.contains(element)
        );
    }

    /*
     * --------------------------------------------------
     * КЕШ
     * --------------------------------------------------
     */

    function cacheGet(cache, key, ttl) {
        var entry = cache[key];

        if (!entry) return null;

        if (Date.now() - entry.time > ttl) {
            delete cache[key];
            return null;
        }

        return entry.data;
    }

    function cacheSet(cache, key, data, limit) {
        cache[key] = {
            data: data,
            time: Date.now()
        };

        var keys = Object.keys(cache);

        if (keys.length <= limit) return;

        keys.sort(function (a, b) {
            return cache[a].time - cache[b].time;
        });

        while (keys.length > limit) {
            delete cache[keys.shift()];
        }
    }

    function getMovieType(movie) {
        return (
            movie.name ||
            movie.first_air_date ||
            movie.media_type === 'tv'
        ) ? 'tv' : 'movie';
    }

    function getMovieKey(movie) {
        return getMovieType(movie) +
            ':' + safeText(movie.id);
    }

    /*
     * --------------------------------------------------
     * КОНТЕКСТ КАРТКИ
     * --------------------------------------------------
     */

    function isCurrent(context) {
        return !!(
            context &&
            currentContext === context &&
            operationId === context.operation &&
            isAttached(context.root)
        );
    }

    function stopSlideshow() {
        slideshowToken++;

        if (slideshowTimer) {
            clearInterval(slideshowTimer);
            slideshowTimer = null;
        }

        if (window.mobileInterfaceBgInterval) {
            clearInterval(
                window.mobileInterfaceBgInterval
            );
            window.mobileInterfaceBgInterval = null;
        }

        if (slideshowState) {
            var state = slideshowState;

            slideshowState = null;

            if (state.poster && state.poster.length) {
                state.poster.find(
                    '.mi31-slideshow-layer'
                ).remove();

                state.poster.removeClass(
                    'mi31-slideshow-active'
                );
            }
        }
    }

    function cancelPending() {
        if (activeAjax) {
            try {
                activeAjax.abort();
            } catch (e) {}

            activeAjax = null;
        }
    }

    function invalidateContext() {
        operationId++;

        currentContext = null;

        cancelPending();
        stopSlideshow();
    }

    /*
     * --------------------------------------------------
     * АНІМАЦІЇ ТА СТИЛІ
     * --------------------------------------------------
     */

    function applyStyles() {
        var style = document.getElementById(
            STYLE_ID
        );

        if (!style) {
            style = document.createElement('style');
            style.id = STYLE_ID;
            document.head.appendChild(style);
        }

        var posterAnim = enabled(
            getSetting('animation', true)
        );

        var uiAnim = enabled(
            getSetting('ui_anim', true)
        );

        var effect = validCssValue(
            getSetting('ui_anim_effect', 'fluid'),
            [
                'fluid',
                'cyber',
                'cinematic',
                'elastic',
                'minimal'
            ],
            'fluid'
        );

        var badgeAnim = validCssValue(
            getSetting('badge_anim', 'pulse'),
            [
                'none',
                'pulse',
                'breathe',
                'spin_slow',
                'float'
            ],
            'pulse'
        );

        var logoHeight = validCssValue(
            getSetting('logo_size_v2', '125'),
            ['125', '150', '180', '210'],
            '125'
        );

        var blocksGap = validCssValue(
            getSetting('blocks_gap', '8px'),
            ['8px', '12px', '18px', '24px'],
            '8px'
        );

        var ratingSize = validCssValue(
            getSetting('ratings_size', '0.45em'),
            ['0.4em', '0.45em', '0.5em', '0.55em'],
            '0.45em'
        );

        var showTagline = enabled(
            getSetting('show_tagline', true)
        );

        var animName = 'mi31_' + effect;

        var timing = effect === 'elastic'
            ? 'cubic-bezier(.34,1.56,.64,1)'
            : 'cubic-bezier(.16,1,.3,1)';

        var css = '';

        /*
         * Унікальні назви анімацій:
         * без конфліктів з іншими плагінами.
         */

        css += '@keyframes mi31_kenburns{';
        css += '0%,100%{transform:scale(1)}';
        css += '50%{transform:scale(1.08)}';
        css += '}';

        css += '@keyframes mi31_fluid{';
        css += 'from{opacity:0;transform:translate3d(0,18px,0) scale(.97)}';
        css += 'to{opacity:1;transform:translate3d(0,0,0) scale(1)}';
        css += '}';

        css += '@keyframes mi31_cyber{';
        css += 'from{opacity:0;transform:translate3d(-28px,0,0) scale(.96)}';
        css += 'to{opacity:1;transform:translate3d(0,0,0) scale(1)}';
        css += '}';

        css += '@keyframes mi31_cinematic{';
        css += 'from{opacity:0;transform:translate3d(0,12px,0) scale(1.035)}';
        css += 'to{opacity:1;transform:translate3d(0,0,0) scale(1)}';
        css += '}';

        css += '@keyframes mi31_elastic{';
        css += '0%{opacity:0;transform:scale(.82)}';
        css += '70%{opacity:1;transform:scale(1.025)}';
        css += '100%{opacity:1;transform:scale(1)}';
        css += '}';

        css += '@keyframes mi31_minimal{';
        css += 'from{opacity:0;transform:translateY(7px)}';
        css += 'to{opacity:1;transform:translateY(0)}';
        css += '}';

        css += '@keyframes mi31_wave{';
        css += 'from{opacity:0;transform:translateY(6px) scale(.9)}';
        css += 'to{opacity:1;transform:translateY(0) scale(1)}';
        css += '}';

        css += '@keyframes mi31_pulse{';
        css += '0%,100%{transform:scale(1)}';
        css += '50%{transform:scale(1.075)}';
        css += '}';

        css += '@keyframes mi31_breathe{';
        css += '0%,100%{transform:scale(1);opacity:.86}';
        css += '50%{transform:scale(1.055);opacity:1}';
        css += '}';

        css += '@keyframes mi31_spin_slow{';
        css += '0%,100%{transform:rotate(0deg)}';
        css += '25%{transform:rotate(3deg)}';
        css += '75%{transform:rotate(-3deg)}';
        css += '}';

        css += '@keyframes mi31_float{';
        css += '0%,100%{transform:translateY(0)}';
        css += '50%{transform:translateY(-3px)}';
        css += '}';

        css += '@keyframes mi31_poster_in{';
        css += 'from{opacity:0;transform:scale(1.035)}';
        css += 'to{opacity:1;transform:scale(1)}';
        css += '}';

        css += '@media screen and (max-width:480px){';

        /*
         * Усі селектори обмежено карткою.
         * Ніяких глобальних .background,
         * [class*="pg"] або [class*="status"].
         */

        css += '.full-start-new .full-start__reactions,';
        css += '.full-start-new .full-start-new__reactions,';
        css += '.full-start-new .full-start-new__details,';
        css += '.full-start-new .full-start__info,';
        css += '.full-start-new .full-start__age,';
        css += '.full-start-new .full-start-new__age,';
        css += '.full-start-new .full-start__status,';
        css += '.full-start-new .full-start-new__status,';
        css += '.full-start-new .full-start__rates,';
        css += '.full-start-new .rate--tmdb,';
        css += '.full-start-new .rate--imdb,';
        css += '.full-start-new .rate--kp{';
        css += 'display:none!important';
        css += '}';

        /*
         * Збережено правило 3.0.1.
         * Воно працює тільки в картці.
         */

        css += '.full-start-new .full-start-new__right>div:first-child{';
        css += 'display:none!important';
        css += '}';

        css += '.full-start-new{';
        css += 'position:relative!important';
        css += '}';

        css += '.full-start-new__poster{';
        css += 'position:relative!important;';
        css += 'overflow:hidden!important;';
        css += 'background:#000!important;';
        css += 'z-index:1;';
        css += 'height:62vh!important;';

        if (uiAnim) {
            css += 'animation:mi31_poster_in .85s cubic-bezier(.16,1,.3,1) both;';
        }

        css += '}';

        css += '.full-start-new__poster>img{';
        css += 'position:absolute;';
        css += 'inset:0;';
        css += 'width:100%;';
        css += 'height:100%;';
        css += 'object-fit:cover;';
        css += 'filter:none!important;';
        css += 'transform-origin:center center!important;';
        css += 'transition:opacity 1.1s ease!important;';
        css += '-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 55%,transparent 100%)!important;';
        css += 'mask-image:linear-gradient(to bottom,#000 0%,#000 55%,transparent 100%)!important;';

        if (posterAnim) {
            css += 'animation:mi31_kenburns 25s ease-in-out infinite!important;';
        }

        css += '}';

        /*
         * Два шари слайд-шоу.
         * Їх анімація не перезапускається
         * через створення нових елементів.
         */

        css += '.full-start-new__poster.mi31-slideshow-active>img:not(.mi31-slideshow-layer){';
        css += 'opacity:0!important;';
        css += '}';

        css += '.full-start-new__poster .mi31-slideshow-layer{';
        css += 'position:absolute!important;';
        css += 'inset:0!important;';
        css += 'width:100%!important;';
        css += 'height:100%!important;';
        css += 'object-fit:cover!important;';
        css += 'pointer-events:none!important;';
        css += 'opacity:0;';
        css += 'transition:opacity 1.2s ease-in-out!important;';
        css += '-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 55%,transparent 100%)!important;';
        css += 'mask-image:linear-gradient(to bottom,#000 0%,#000 55%,transparent 100%)!important;';
        css += '}';

        css += '.full-start-new__poster .mi31-slideshow-layer.mi31-visible{';
        css += 'opacity:1;';
        css += '}';

        if (posterAnim) {
            css += '.full-start-new__poster .mi31-slideshow-layer{';
            css += 'animation:mi31_kenburns 25s ease-in-out infinite!important;';
            css += '}';
        } else {
            css += '.full-start-new__poster .mi31-slideshow-layer{';
            css += 'animation:none!important;';
            css += '}';
        }

        /*
         * М'який градієнт у нижній частині
         * постера без зміни композиції.
         */

        css += '.full-start-new__poster:after{';
        css += 'content:"";';
        css += 'position:absolute;';
        css += 'left:0;right:0;bottom:0;';
        css += 'height:42%;';
        css += 'background:linear-gradient(to bottom,transparent,rgba(0,0,0,.24) 65%,rgba(0,0,0,.42));';
        css += 'pointer-events:none;';
        css += 'z-index:2;';
        css += '}';

        css += '.full-start-new__right{';
        css += 'background:none!important;';
        css += 'margin-top:-160px!important;';
        css += 'z-index:3!important;';
        css += 'display:flex!important;';
        css += 'flex-direction:column!important;';
        css += 'align-items:center!important;';
        css += 'padding:0 10px!important;';
        css += 'gap:' + blocksGap + '!important;';
        css += 'position:relative!important;';
        css += '}';

        var uiAnimation = '';

        if (uiAnim) {
            uiAnimation =
                'animation:' + animName +
                ' .72s ' + timing +
                ' both;';
        }

        css += '.full-start-new .studio-header-brand{';
        css += uiAnimation;
        css += 'animation-delay:.08s;';
        css += 'order:1;';
        css += 'width:100%;';
        css += 'display:flex;';
        css += 'justify-content:flex-start;';
        css += 'align-items:center;';
        css += 'padding-left:5vw;';
        css += 'margin-bottom:-2px!important;';
        css += '}';

        css += '.full-start-new .studio-header-brand img{';
        css += 'height:18px!important;';
        css += 'width:auto;';
        css += 'max-width:110px;';
        css += 'object-fit:contain;';
        css += 'filter:drop-shadow(0 2px 5px rgba(0,0,0,.8));';
        css += 'opacity:.95;';
        css += '}';

        css += '.full-start-new .studio-header-brand img.is-dark-logo{';
        css += 'filter:brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,.8))!important;';
        css += '}';

        css += '.full-start-new .full-start-new__title{';
        css += uiAnimation;
        css += 'animation-delay:.15s;';
        css += 'width:100%!important;';
        css += 'display:flex!important;';
        css += 'justify-content:center!important;';
        css += 'align-items:center!important;';
        css += 'margin:0!important;';
        css += 'min-height:50px;';
        css += 'order:2;';
        css += 'overflow:visible!important;';
        css += 'text-align:center;';
        css += '}';

        css += '.full-start-new .full-start-new__title img{';
        css += 'height:auto!important;';
        css += 'max-height:' + logoHeight + 'px!important;';
        css += 'width:auto!important;';
        css += 'max-width:90vw!important;';
        css += 'object-fit:contain!important;';
        css += 'filter:drop-shadow(0 4px 18px rgba(0,0,0,.85));';
        css += 'margin:0!important;';
        css += '}';

        css += '.full-start-new .mi31-title-fallback{';
        css += 'display:block;';
        css += 'font-size:clamp(25px,7vw,42px);';
        css += 'font-weight:750;';
        css += 'line-height:1.12;';
        css += 'letter-spacing:-.035em;';
        css += 'color:#fff;';
        css += 'text-shadow:0 3px 20px rgba(0,0,0,.85);';
        css += 'max-width:92vw;';
        css += 'overflow-wrap:break-word;';
        css += '}';

        css += '.full-start-new .full-start-new__tagline{';
        css += uiAnimation;
        css += 'animation-delay:.22s;';
        css += 'display:' +
            (showTagline ? 'block' : 'none') +
            '!important;';
        css += 'font-style:italic!important;';
        css += 'font-size:.9em!important;';
        css += 'margin:0!important;';
        css += 'color:rgba(255,255,255,.8)!important;';
        css += 'text-align:center!important;';
        css += 'order:3;';
        css += '}';

        css += '.full-start-new .plugin-meta-row{';
        css += uiAnimation;
        css += 'animation-delay:.28s;';
        css += 'display:flex;';
        css += 'justify-content:center;';
        css += 'align-items:center;';
        css += 'flex-wrap:nowrap;';
        css += 'gap:8px;';
        css += 'margin:0!important;';
        css += 'font-size:calc(' + ratingSize + ' * 2.5);';
        css += 'width:100%;';
        css += 'max-width:100%;';
        css += 'order:4;';
        css += 'color:rgba(255,255,255,.86);';
        css += 'font-family:Inter,-apple-system,system-ui,sans-serif;';
        css += 'overflow-x:auto;';
        css += 'scrollbar-width:none;';
        css += '}';

        css += '.full-start-new .plugin-meta-row::-webkit-scrollbar{';
        css += 'display:none;';
        css += '}';

        css += '.full-start-new .info-text-item{';
        css += 'opacity:.92;';
        css += 'font-weight:500;';
        css += 'font-size:.85em;';
        css += 'white-space:nowrap;';
        css += 'flex-shrink:0;';
        css += '}';

        css += '.full-start-new .info-separator{';
        css += 'opacity:.35;';
        css += 'font-size:.8em;';
        css += 'margin:0 -2px;';
        css += 'flex-shrink:0;';
        css += '}';

        css += '.full-start-new .quality-row-inline{';
        css += 'position:absolute;';
        css += 'top:30px;';
        css += 'right:12px;';
        css += 'z-index:99;';
        css += 'display:flex;';
        css += 'flex-direction:column;';
        css += 'align-items:flex-end;';
        css += 'gap:4px;';
        css += 'pointer-events:none;';
        css += '}';

        css += '.full-start-new .quality-row-inline .plugin-rating-item{';
        css += 'display:flex;';
        css += 'align-items:center;';
        css += 'gap:4px;';
        css += 'font-weight:700;';
        css += 'color:#fff;';
        css += 'font-size:.95em;';
        css += 'padding:2px 0;';
        css += '}';

        css += '.full-start-new .quality-row-inline .plugin-rating-item img{';
        css += 'height:1em;';
        css += 'width:auto;';
        css += '}';

        css += '.full-start-new .quality-item{';
        css += 'transform-origin:center center;';
        css += 'filter:drop-shadow(0 2px 5px rgba(0,0,0,.8));';
        css += 'height:1.15em;';
        css += 'display:flex;';
        css += 'align-items:center;';
        css += 'justify-content:flex-end;';
        css += '}';

        css += '.full-start-new .quality-item img{';
        css += 'height:100%;';
        css += 'width:auto;';
        css += 'max-width:60px;';
        css += 'object-fit:contain;';
        css += '}';

        var loopDuration = badgeAnim === 'spin_slow'
            ? '4s'
            : badgeAnim === 'breathe'
                ? '3s'
                : '2.5s';

        css += '.full-start-new .wave-item{';

        if (uiAnim) {
            css += 'animation:mi31_wave .45s cubic-bezier(.16,1,.3,1) both;';
            css += 'animation-delay:calc(.35s + var(--item-index,0) * .08s);';
        }

        css += '}';

        if (badgeAnim !== 'none') {
            css += '.full-start-new .wave-item img{';
            css += 'animation:mi31_' + badgeAnim +
                ' ' + loopDuration +
                ' ease-in-out infinite;';
            css += 'animation-delay:calc(1s + var(--item-index,0) * .15s);';
            css += 'transform-origin:center center;';
            css += '}';
        }

        css += '.full-start-new .full-start-new__buttons{';
        css += uiAnimation;
        css += 'animation-delay:.42s;';
        css += 'display:flex!important;';
        css += 'justify-content:space-around!important;';
        css += 'align-items:center!important;';
        css += 'width:100%!important;';
        css += 'max-width:100%!important;';
        css += 'padding:0 4px!important;';
        css += 'box-sizing:border-box!important;';
        css += 'margin-top:4px!important;';
        css += 'order:6;';
        css += '}';

        css += '.full-start-new .full-start__button{';
        css += 'background:none!important;';
        css += 'border:none!important;';
        css += 'box-shadow:none!important;';
        css += 'display:flex!important;';
        css += 'flex-direction:column!important;';
        css += 'align-items:center!important;';
        css += 'width:42px!important;';
        css += 'min-width:36px!important;';
        css += 'padding:0!important;';
        css += 'transition:transform .2s ease,opacity .2s ease;';
        css += '}';

        css += '.full-start-new .full-start__button:active{';
        css += 'transform:scale(.9);';
        css += 'opacity:.7;';
        css += '}';

        css += '.full-start-new .full-start__button svg,';
        css += '.full-start-new .full-start__button img{';
        css += 'width:24px!important;';
        css += 'height:24px!important;';
        css += 'margin-bottom:4px!important;';
        css += 'fill:#fff!important;';
        css += 'filter:drop-shadow(0 2px 8px rgba(0,0,0,.5));';
        css += '}';

        css += '.full-start-new .full-start__button span{';
        css += 'font-size:9px!important;';
        css += 'text-transform:uppercase!important;';
        css += 'opacity:.75!important;';
        css += 'font-weight:600;';
        css += 'letter-spacing:.05em;';
        css += '}';

        /*
         * Компактні смартфони.
         * Основні пропорції не змінюємо.
         */

        css += '@media(max-width:360px){';
        css += '.full-start-new__right{';
        css += 'padding:0 8px!important;';
        css += 'gap:6px!important;';
        css += '}';
        css += '.full-start-new .plugin-meta-row{';
        css += 'gap:6px;';
        css += '}';
        css += '.full-start-new .full-start__button{';
        css += 'width:38px!important;';
        css += 'min-width:32px!important;';
        css += '}';
        css += '}';

        /*
         * Низькі екрани та landscape.
         */

        css += '@media(max-height:620px){';
        css += '.full-start-new__poster{';
        css += 'height:65vh!important;';
        css += '}';
        css += '.full-start-new__right{';
        css += 'margin-top:clamp(-160px,-24vh,-105px)!important;';
        css += '}';
        css += '}';

        /*
         * Безпечна зона нижнього краю.
         */

        css += '.full-start-new .full-start-new__buttons{';
        css += 'padding-bottom:env(safe-area-inset-bottom,0px)!important;';
        css += '}';

        /*
         * Користувачі зі зменшеною анімацією.
         */

        css += '@media(prefers-reduced-motion:reduce){';
        css += '.full-start-new .wave-item,';
        css += '.full-start-new .wave-item img,';
        css += '.full-start-new__poster>img,';
        css += '.full-start-new__poster .mi31-slideshow-layer{';
        css += 'animation:none!important;';
        css += '}';
        css += '}';

        css += '}';

        style.textContent = css;
    }

    /*
     * --------------------------------------------------
     * РЕЙТИНГИ
     * --------------------------------------------------
     */

    function getRatingColor(value) {
        var n = safeNumber(value, 0);

        if (n >= 7.5) return '#2ecc71';
        if (n >= 6) return '#feca57';
        if (n > 0) return '#ff4d4d';

        return '#fff';
    }

    function getCubRating(e) {
        if (
            !e.data ||
            !e.data.reactions ||
            !Array.isArray(e.data.reactions.result)
        ) {
            return null;
        }

        var coef = {
            fire: 10,
            nice: 7.5,
            think: 5,
            bore: 2.5,
            shit: 0
        };

        var sum = 0;
        var count = 0;

        e.data.reactions.result.forEach(function (r) {
            var amount = safeNumber(r.counter, 0);

            if (
                amount > 0 &&
                typeof coef[r.type] === 'number'
            ) {
                sum += amount * coef[r.type];
                count += amount;
            }
        });

        if (count < 5) return null;

        var isTv = (
            e.object &&
            e.object.method === 'tv'
        );

        var avg = isTv ? 7.4 : 6.5;
        var weight = isTv ? 50 : 150;

        return (
            (avg * weight + sum) /
            (weight + count)
        ).toFixed(1);
    }

    function createRating(iconUrl, value, index) {
        var $item = $(
            '<div class="plugin-rating-item wave-item">' +
                '<img alt="">' +
                '<span></span>' +
            '</div>'
        );

        $item.css('--item-index', index);

        $item.find('img').attr('src', iconUrl);

        $item.find('span')
            .text(value)
            .css('color', getRatingColor(value));

        return $item;
    }

    function renderRatings(context, e) {
        var $root = context.$root;

        $root.find('.quality-row-inline').remove();

        var $row = $(
            '<div class="quality-row-inline"></div>'
        );

        context.$main.append($row);

        context.$qualityRow = $row;
        context.badgeIndex = 0;

        var tmdb = safeNumber(
            e.data.movie.vote_average,
            0
        );

        if (tmdb > 0) {
            $row.append(
                createRating(
                    ratingIcons.tmdb,
                    tmdb.toFixed(1),
                    context.badgeIndex++
                )
            );
        }

        var cub = getCubRating(e);

        if (cub !== null) {
            $row.append(
                createRating(
                    ratingIcons.cub,
                    cub,
                    context.badgeIndex++
                )
            );
        }
    }

    /*
     * --------------------------------------------------
     * МЕТАІНФОРМАЦІЯ
     * --------------------------------------------------
     */

    function formatTime(mins) {
        mins = Math.round(
            safeNumber(mins, 0)
        );

        if (mins <= 0) return '';

        var hours = Math.floor(mins / 60);
        var minutes = mins % 60;

        return (
            (hours > 0 ? hours + 'г ' : '') +
            minutes + 'хв'
        );
    }

    function addMetaItem($row, text) {
        if (!text) return;

        if ($row.children().length) {
            $row.append(
                $('<span class="info-separator"></span>')
                    .text('•')
            );
        }

        $row.append(
            $('<div class="info-text-item"></div>')
                .text(text)
        );
    }

    function renderMeta(context, movie) {
        var $container = context.$right;

        $container.find('.plugin-meta-row').remove();

        var $row = $(
            '<div class="plugin-meta-row"></div>'
        );

        var year = (
            movie.release_date ||
            movie.first_air_date ||
            ''
        ).substring(0, 4);

        addMetaItem($row, year);

        var country = '';

        if (
            movie.production_countries &&
            movie.production_countries.length
        ) {
            country =
                movie.production_countries[0].name ||
                movie.production_countries[0].iso_3166_1 ||
                '';
        } else if (
            movie.origin_country &&
            movie.origin_country.length
        ) {
            country = movie.origin_country[0];
        }

        addMetaItem($row, country);

        var runtime =
            movie.runtime ||
            (
                movie.episode_run_time &&
                movie.episode_run_time.length
                    ? movie.episode_run_time[0]
                    : 0
            );

        if (runtime) {
            addMetaItem(
                $row,
                formatTime(runtime)
            );
        }

        if (
            movie.genres &&
            movie.genres.length
        ) {
            var genres = movie.genres
                .slice(0, 2)
                .map(function (genre) {
                    return genre.name;
                })
                .filter(Boolean)
                .join(', ');

            addMetaItem($row, genres);
        }

        $container.append($row);
    }

    /*
     * --------------------------------------------------
     * ЛОГОТИП ФІЛЬМУ
     * --------------------------------------------------
     */

    function getTitle(movie) {
        return (
            movie.title ||
            movie.name ||
            movie.original_title ||
            movie.original_name ||
            ''
        );
    }

    function renderTitleFallback(context) {
        if (!isCurrent(context)) return;

        var $title = context.$root.find(
            '.full-start-new__title'
        ).first();

        if (!$title.length) return;

        $title.empty().append(
            $('<span class="mi31-title-fallback"></span>')
                .text(getTitle(context.movie))
        );
    }

    function chooseLogo(logos) {
        if (!Array.isArray(logos) || !logos.length) {
            return null;
        }

        var lang = Lampa.Storage.get(
            'language',
            'uk'
        );

        if (lang.indexOf('-') !== -1) {
            lang = lang.split('-')[0];
        }

        var languages = [lang, 'uk', 'en', null];

        for (var i = 0; i < languages.length; i++) {
            var language = languages[i];

            var matches = logos.filter(function (logo) {
                return logo.iso_639_1 === language &&
                    !!logo.file_path;
            });

            if (matches.length) {
                matches.sort(function (a, b) {
                    return safeNumber(b.vote_average, 0) -
                        safeNumber(a.vote_average, 0);
                });

                return matches[0];
            }
        }

        return logos.filter(function (logo) {
            return !!logo.file_path;
        })[0] || null;
    }

    function getTmdbImage(size, path) {
        if (!path || !Lampa.TMDB) return '';

        return Lampa.TMDB.image(
            '/t/p/' + size + path
        );
    }

    function renderMovieLogo(context, data) {
        if (!isCurrent(context)) return;

        var logos = data.images &&
            data.images.logos;

        var logo = chooseLogo(logos);

        if (!logo) {
            renderTitleFallback(context);
            return;
        }

        var path = safeText(
            logo.file_path
        );

        if (/\.svg$/i.test(path)) {
            path = path.replace(/\.svg$/i, '.png');
        }

        var size = validCssValue(
            getSetting('logo_quality', 'w500'),
            [
                'w300',
                'w500',
                'w780',
                'original'
            ],
            'w500'
        );

        var url = getTmdbImage(
            size,
            path
        );

        if (!url) {
            renderTitleFallback(context);
            return;
        }

        var image = new Image();

        image.onload = function () {
            if (!isCurrent(context)) return;

            var $title = context.$root.find(
                '.full-start-new__title'
            ).first();

            if (!$title.length) return;

            var $img = $('<img alt="">');

            $img.attr('src', url);
            $img.attr('alt', getTitle(context.movie));

            $img.on('error', function () {
                if (isCurrent(context)) {
                    renderTitleFallback(context);
                }
            });

            $title.empty().append($img);
        };

        image.onerror = function () {
            if (isCurrent(context)) {
                renderTitleFallback(context);
            }
        };

        image.src = url;
    }

    /*
     * --------------------------------------------------
     * ЛОГОТИП СТУДІЇ
     * --------------------------------------------------
     */

    function isImageDark(src, callback) {
        var image = new Image();

        image.crossOrigin = 'anonymous';

        image.onload = function () {
            try {
                var canvas =
                    document.createElement('canvas');

                canvas.width = 40;
                canvas.height = 40;

                var ctx = canvas.getContext('2d');

                ctx.drawImage(
                    image,
                    0,
                    0,
                    40,
                    40
                );

                var pixels = ctx.getImageData(
                    0,
                    0,
                    40,
                    40
                ).data;

                var total = 0;
                var count = 0;
                var hasColor = false;

                for (
                    var i = 0;
                    i < pixels.length;
                    i += 4
                ) {
                    if (pixels[i + 3] <= 50) {
                        continue;
                    }

                    var r = pixels[i];
                    var g = pixels[i + 1];
                    var b = pixels[i + 2];

                    total += (
                        r * 299 +
                        g * 587 +
                        b * 114
                    ) / 1000;

                    count++;

                    if (
                        Math.max(r, g, b) -
                        Math.min(r, g, b) > 30
                    ) {
                        hasColor = true;
                    }
                }

                var brightness = count
                    ? total / count
                    : 255;

                callback(
                    brightness < 110 &&
                    !hasColor
                );
            } catch (e) {
                callback(false);
            }
        };

        image.onerror = function () {
            callback(false);
        };

        image.src = src;
    }

    function renderStudio(context, data) {
        if (!isCurrent(context)) return;

        context.$root.find(
            '.studio-header-brand'
        ).remove();

        if (
            !enabled(
                getSetting('studios', true)
            )
        ) {
            return;
        }

        var studio = null;

        if (
            data.networks &&
            data.networks.length
        ) {
            studio = data.networks.find(
                function (item) {
                    return !!item.logo_path;
                }
            );
        }

        if (
            !studio &&
            data.production_companies &&
            data.production_companies.length
        ) {
            studio = data.production_companies.find(
                function (item) {
                    return !!item.logo_path;
                }
            );
        }

        if (!studio || !studio.logo_path) {
            return;
        }

        var url = getTmdbImage(
            'w200',
            studio.logo_path
        );

        var $brand = $(
            '<div class="studio-header-brand"></div>'
        );

        var $image = $('<img alt="">');

        $image.attr('src', url);
        $image.attr('alt', studio.name || '');

        $brand.append($image);

        $image.on('error', function () {
            $brand.remove();
        });

        isImageDark(url, function (dark) {
            if (
                dark &&
                isCurrent(context) &&
                isAttached($image[0])
            ) {
                $image.addClass(
                    'is-dark-logo'
                );
            }
        });

        context.$root.find(
            '.full-start-new__title'
        ).first().before($brand);
    }

    /*
     * --------------------------------------------------
     * ДВОШАРОВЕ СЛАЙД-ШОУ
     * --------------------------------------------------
     */

    function chooseBackdrops(data) {
        var images = data.images &&
            data.images.backdrops;

        if (!Array.isArray(images)) {
            return [];
        }

        var filtered = images.filter(
            function (item) {
                return item.file_path &&
                    item.aspect_ratio > 1.5 &&
                    (
                        !item.iso_639_1 ||
                        item.iso_639_1 === 'xx'
                    );
            }
        );

        if (!filtered.length) {
            filtered = images.filter(
                function (item) {
                    return item.file_path &&
                        item.aspect_ratio > 1.5;
                }
            );
        }

        filtered.sort(function (a, b) {
            return safeNumber(
                b.vote_average,
                0
            ) - safeNumber(
                a.vote_average,
                0
            );
        });

        return filtered.slice(0, 15);
    }

    function preloadImage(url, callback) {
        var img = new Image();

        img.onload = function () {
            callback(true);
        };

        img.onerror = function () {
            callback(false);
        };

        img.src = url;
    }

    function createSlideLayer() {
        return $(
            '<img class="mi31-slideshow-layer" alt="">'
        );
    }

    function startPosterSlideshow(context, images) {
        stopSlideshow();

        if (
            !enabled(
                getSetting('slideshow', true)
            )
        ) {
            return;
        }

        if (
            !isCurrent(context) ||
            !images ||
            images.length < 2
        ) {
            return;
        }

        var $poster = context.$root.find(
            '.full-start-new__poster'
        ).first();

        if (!$poster.length) return;

        var quality = validCssValue(
            getSetting('slideshow_quality', 'w780'),
            [
                'w500',
                'w780',
                'w1280',
                'original'
            ],
            'w780'
        );

        var interval = parseInt(
            getSetting(
                'slideshow_time',
                '10000'
            ),
            10
        );

        if (
            !isFinite(interval) ||
            interval < 3000
        ) {
            interval = 10000;
        }

        var token = slideshowToken;

        var $first = createSlideLayer();
        var $second = createSlideLayer();

        var state = {
            context: context,
            poster: $poster,
            layers: [$first, $second],
            active: 0,
            index: 0,
            busy: false,
            token: token
        };

        slideshowState = state;

        function valid() {
            return (
                slideshowState === state &&
                slideshowToken === token &&
                isCurrent(context)
            );
        }

        function imageUrl(index) {
            return getTmdbImage(
                quality,
                images[index].file_path
            );
        }

        function switchSlide() {
            if (!valid() || state.busy) {
                return;
            }

            state.busy = true;

            var nextIndex = (
                state.index + 1
            ) % images.length;

            var nextLayerIndex =
                1 - state.active;

            var $incoming =
                state.layers[nextLayerIndex];

            var $outgoing =
                state.layers[state.active];

            var url = imageUrl(nextIndex);

            preloadImage(url, function (ok) {
                if (!valid()) return;

                if (!ok) {
                    state.busy = false;
                    return;
                }

                $incoming
                    .removeClass('mi31-visible')
                    .attr('src', url);

                /*
                 * Скидання transition тільки
                 * для невидимого шару.
                 */

                $incoming.css(
                    'transition',
                    'none'
                );

                $incoming[0].offsetWidth;

                $incoming.css(
                    'transition',
                    ''
                );

                /*
                 * Вхідний шар зверху,
                 * попередній залишається
                 * видимим до завершення fade.
                 */

                $incoming.css('z-index', 2);
                $outgoing.css('z-index', 1);

                requestAnimationFrame(
                    function () {
                        if (!valid()) return;

                        $incoming.addClass(
                            'mi31-visible'
                        );

                        state.index = nextIndex;
                        state.active = nextLayerIndex;

                        setTimeout(function () {
                            if (!valid()) return;

                            $outgoing.removeClass(
                                'mi31-visible'
                            );

                            state.busy = false;
                        }, 1250);
                    }
                );
            });
        }

        /*
         * Початковий кадр завантажується
         * до активації двошарового режиму.
         */

        var firstUrl = imageUrl(0);

        preloadImage(firstUrl, function (ok) {
            if (!valid() || !ok) return;

            $first.attr('src', firstUrl);
            $first.addClass('mi31-visible');

            $first.css('z-index', 2);
            $second.css('z-index', 1);

            $poster.append(
                $first,
                $second
            );

            $poster.addClass(
                'mi31-slideshow-active'
            );

            slideshowTimer = setInterval(
                switchSlide,
                interval
            );

            window.mobileInterfaceBgInterval =
                slideshowTimer;
        });
    }

    /*
     * --------------------------------------------------
     * ДАНІ TMDB
     * --------------------------------------------------
     */

    function applyMovieDetailsData(
        context,
        data
    ) {
        if (!isCurrent(context)) return;

        renderMovieLogo(
            context,
            data
        );

        renderStudio(
            context,
            data
        );

        var backdrops = chooseBackdrops(
            data
        );

        if (backdrops.length > 1) {
            startPosterSlideshow(
                context,
                backdrops
            );
        }
    }

    function loadMovieDetails(context) {
        var movie = context.movie;
        var key = getMovieKey(movie);

        var cached = cacheGet(
            detailsCache,
            key,
            TMDB_CACHE_TTL
        );

        if (cached) {
            applyMovieDetailsData(
                context,
                cached
            );

            return;
        }

        if (
            !Lampa.TMDB ||
            !Lampa.TMDB.key
        ) {
            return;
        }

        var type = getMovieType(movie);

        var url =
            'https://api.themoviedb.org/3/' +
            type + '/' +
            encodeURIComponent(movie.id) +
            '?api_key=' +
            encodeURIComponent(
                Lampa.TMDB.key()
            ) +
            '&append_to_response=images' +
            '&include_image_language=uk,en,null';

        activeAjax = $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',
            timeout: 12000,

            success: function (data) {
                cacheSet(
                    detailsCache,
                    key,
                    data,
                    TMDB_CACHE_LIMIT
                );

                if (!isCurrent(context)) {
                    return;
                }

                applyMovieDetailsData(
                    context,
                    data
                );
            },

            error: function () {
                /*
                 * Не руйнуємо картку,
                 * якщо TMDB недоступний.
                 * Залишається оригінальна
                 * назва від Lampa.
                 */
            },

            complete: function () {
                if (isCurrent(context)) {
                    activeAjax = null;
                }
            }
        });
    }

    /*
     * --------------------------------------------------
     * ELITE BADGES
     * --------------------------------------------------
     */

    function getReleaseTitle(item) {
        return safeText(
            item.Title ||
            item.title ||
            item.Name ||
            item.name ||
            ''
        );
    }

    function getReleaseSeeders(item) {
        return safeNumber(
            item.Seeders != null
                ? item.Seeders
                : item.seeders,
            0
        );
    }

    function getReleaseSize(item) {
        return safeNumber(
            item.Size != null
                ? item.Size
                : item.size,
            0
        );
    }

    function releaseScore(item) {
        var title = getReleaseTitle(item);

        if (!title) return -1;

        var score = 0;

        if (
            /\b(2160p|4k|uhd)\b/i.test(title)
        ) {
            score += 100;
        } else if (
            /\b1080p\b/i.test(title)
        ) {
            score += 60;
        } else if (
            /\b720p\b/i.test(title)
        ) {
            score += 30;
        }

        if (
            /\b(dolby[\s._-]*vision|dovi|dv)\b/i.test(title)
        ) {
            score += 18;
        } else if (
            /\bhdr(10|\+)?\b/i.test(title)
        ) {
            score += 10;
        }

        if (
            /\b(blu[\s._-]*ray|remux|bdremux)\b/i.test(title)
        ) {
            score += 15;
        } else if (
            /\b(web[\s._-]*dl|webdl)\b/i.test(title)
        ) {
            score += 8;
        }

        if (
            /\b(atmos|truehd|dts[\s._-]*hd)\b/i.test(title)
        ) {
            score += 8;
        }

        if (
            /\b(ukr|ukrainian|україн|укр)\b/i.test(title)
        ) {
            score += 12;
        }

        var seeders = getReleaseSeeders(item);

        score += Math.min(
            Math.max(seeders, 0),
            100
        ) * 0.15;

        var size = getReleaseSize(item);

        if (size > 0) {
            score += Math.min(
                size / 1073741824,
                80
            ) * 0.05;
        }

        return score;
    }

    function chooseBestRelease(results) {
        if (!Array.isArray(results)) {
            return null;
        }

        var candidates = results
            .filter(function (item) {
                return !!getReleaseTitle(item);
            })
            .slice(0, 40);

        if (!candidates.length) {
            return null;
        }

        candidates.sort(function (a, b) {
            return releaseScore(b) -
                releaseScore(a);
        });

        return candidates[0];
    }

    function matchReleaseBadges(title) {
        var matches = [];

        eliteBadgesConfig.forEach(function (badge) {
            if (badge.pattern.test(title)) {
                matches.push(badge);
            }
        });

        var selected = {};
        var standalone = [];

        matches.forEach(function (badge) {
            if (!badge.group) {
                standalone.push(badge);
                return;
            }

            var previous = selected[
                badge.group
            ];

            if (
                !previous ||
                badge.priority > previous.priority
            ) {
                selected[badge.group] = badge;
            }
        });

        /*
         * Dolby Vision може співіснувати
         * з HDR, але SDR разом із HDR
         * не показуємо.
         */

        if (
            selected.dynamic &&
            selected.dynamic.id === 'sdr' &&
            selected.vision
        ) {
            delete selected.dynamic;
        }

        var result = [];

        [
            'resolution',
            'vision',
            'dynamic',
            'spatial',
            'audio'
        ].forEach(function (group) {
            if (selected[group]) {
                result.push(
                    selected[group].imageURL
                );
            }
        });

        standalone.forEach(function (badge) {
            result.push(badge.imageURL);
        });

        /*
         * Мовні бейджі беремо лише
         * з назви вибраного релізу.
         */

        if (
            /\b(ukr|ukrainian|укр)\b/i.test(title)
        ) {
            result.push(
                pluginPath + 'UKR.svg'
            );
        }

        if (
            /\b(dub|dubbed|дуб)\b/i.test(title)
        ) {
            result.push(
                pluginPath + 'DUB.svg'
            );
        }

        return result.filter(
            function (url, index, array) {
                return array.indexOf(url) === index;
            }
        );
    }

    function getEliteBadges(results) {
        var release = chooseBestRelease(
            results
        );

        if (!release) return [];

        return matchReleaseBadges(
            getReleaseTitle(release)
        );
    }

    function appendBadges(context, badges) {
        if (!isCurrent(context)) return;

        if (!context.$qualityRow) return;

        context.$qualityRow.find(
            '.quality-item'
        ).remove();

        badges.forEach(function (url) {
            var $badge = $(
                '<div class="quality-item wave-item">' +
                    '<img alt="">' +
                '</div>'
            );

            $badge.css(
                '--item-index',
                context.badgeIndex++
            );

            var $img = $badge.find('img');

            $img.attr('src', url);

            $img.on('error', function () {
                $badge.remove();
            });

            context.$qualityRow.append(
                $badge
            );
        });
    }

    function loadEliteBadges(context) {
        if (
            !enabled(
                getSetting('quality', true)
            )
        ) {
            return;
        }

        if (
            !Lampa.Parser ||
            typeof Lampa.Parser.get !== 'function'
        ) {
            return;
        }

        var movie = context.movie;
        var key = getMovieKey(movie);

        var cached = cacheGet(
            badgeCache,
            key,
            BADGE_CACHE_TTL
        );

        if (cached) {
            appendBadges(
                context,
                cached
            );
            return;
        }

        try {
            Lampa.Parser.get({
                search: getTitle(movie),
                movie: movie,
                page: 1
            }, function (response) {
                if (!isCurrent(context)) {
                    return;
                }

                if (
                    !response ||
                    !Array.isArray(response.Results)
                ) {
                    return;
                }

                var badges = getEliteBadges(
                    response.Results
                );

                cacheSet(
                    badgeCache,
                    key,
                    badges,
                    BADGE_CACHE_LIMIT
                );

                appendBadges(
                    context,
                    badges
                );
            });
        } catch (e) {
            console.warn(
                '[MOB_INTERFACE] Parser error:',
                e
            );
        }
    }

    /*
     * --------------------------------------------------
     * ІНІЦІАЛІЗАЦІЯ КАРТКИ
     * --------------------------------------------------
     */

    function createContext(e) {
        if (
            !e ||
            !e.data ||
            !e.data.movie ||
            !e.object ||
            !e.object.activity ||
            typeof e.object.activity.render !== 'function'
        ) {
            return null;
        }

        var $render = e.object.activity.render();

        if (
            !$render ||
            !$render.length
        ) {
            return null;
        }

        var $main = $render.find(
            '.full-start-new'
        ).first();

        if (!$main.length) {
            return null;
        }

        var $right = $main.find(
            '.full-start-new__right'
        ).first();

        if (!$right.length) {
            return null;
        }

        return {
            operation: operationId,
            movie: e.data.movie,
            key: getMovieKey(e.data.movie),
            root: $main[0],
            $root: $main,
            $main: $main,
            $right: $right,
            $qualityRow: null,
            badgeIndex: 0
        };
    }

    function renderMovieCard(e) {
        if (!isMobile()) return;

        /*
         * Спочатку зупиняємо попередню
         * картку, потім створюємо нову.
         */

        invalidateContext();

        var context = createContext(e);

        if (!context) return;

        context.operation = operationId;
        currentContext = context;

        if (window.lampa_settings) {
            window.lampa_settings.blur_poster = false;
        }

        /*
         * Оригінальний порядок 3.0.1:
         * метадані, рейтинги, TMDB,
         * студія, логотип, слайд-шоу.
         */

        renderMeta(
            context,
            context.movie
        );

        renderRatings(
            context,
            e
        );

        loadMovieDetails(
            context
        );

        loadEliteBadges(
            context
        );
    }

    /*
     * --------------------------------------------------
     * ПОДІЇ LAMPA
     * --------------------------------------------------
     */

    function init() {
        Lampa.Listener.follow(
            'full',
            function (e) {
                if (!e) return;

                if (
                    e.type === 'destroy' ||
                    e.type === 'onBeforeDestroy'
                ) {
                    invalidateContext();
                    return;
                }

                if (
                    e.type === 'complite' ||
                    e.type === 'complete'
                ) {
                    renderMovieCard(e);
                }
            }
        );
    }

    /*
     * --------------------------------------------------
     * НАЛАШТУВАННЯ ПЛАГІНА
     * --------------------------------------------------
     */

    function addSetting(param, field, onChange) {
        var config = {
            component: 'mobile_interface',
            param: param,
            field: {
                name: field
            }
        };

        if (onChange) {
            config.onChange = onChange;
        }

        Lampa.SettingsApi.addParam(
            config
        );
    }

    function setupSettings() {
        if (
            !Lampa.SettingsApi ||
            !Lampa.SettingsApi.addComponent ||
            !Lampa.SettingsApi.addParam
        ) {
            return;
        }

        Lampa.SettingsApi.addComponent({
            component: 'mobile_interface',
            name: 'Мобільний інтерфейс',
            icon:
                '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/>' +
                '</svg>'
        });

        addSetting({
            name: 'mobile_interface_animation',
            type: 'trigger',
            default: true
        },
        'Зум-ефект постера (Ken Burns)',
        applyStyles);

        addSetting({
            name: 'mobile_interface_ui_anim',
            type: 'trigger',
            default: true
        },
        'Плавна анімація появи елементів',
        applyStyles);

        addSetting({
            name: 'mobile_interface_ui_anim_effect',
            type: 'select',
            values: {
                fluid: 'Apple Fluid',
                cyber: 'Cyber Neon',
                cinematic: 'Cinematic Depth',
                elastic: 'Elastic Spring',
                minimal: 'Minimal Fade'
            },
            default: 'fluid'
        },
        'Стиль анімації появи',
        applyStyles);

        addSetting({
            name: 'mobile_interface_badge_anim',
            type: 'select',
            values: {
                none: 'Без анімації',
                pulse: 'Пульсація',
                breathe: 'Дихання',
                spin_slow: 'Гойдання',
                float: 'Підстрибування'
            },
            default: 'pulse'
        },
        'Анімація бейджів',
        applyStyles);

        addSetting({
            name: 'mobile_interface_slideshow',
            type: 'trigger',
            default: true
        },
        'Автозміна фонових кадрів');

        addSetting({
            name: 'mobile_interface_slideshow_time',
            type: 'select',
            values: {
                '10000': '10 сек',
                '15000': '15 сек',
                '20000': '20 сек'
            },
            default: '10000'
        },
        'Інтервал зміни фону');

        addSetting({
            name: 'mobile_interface_logo_size_v2',
            type: 'select',
            values: {
                '125': 'Малий',
                '150': 'Середній',
                '180': 'Стандартний',
                '210': 'Великий'
            },
            default: '125'
        },
        'Висота логотипу тайтлу',
        applyStyles);

        addSetting({
            name: 'mobile_interface_show_tagline',
            type: 'trigger',
            default: true
        },
        'Відображати слоган',
        applyStyles);

        addSetting({
            name: 'mobile_interface_blocks_gap',
            type: 'select',
            values: {
                '8px': 'Компактний',
                '12px': 'Стандартний',
                '18px': 'Просторий',
                '24px': 'Панорамний'
            },
            default: '8px'
        },
        'Відступи між блоками',
        applyStyles);

        addSetting({
            name: 'mobile_interface_ratings_size',
            type: 'select',
            values: {
                '0.4em': 'Дрібний',
                '0.45em': 'Звичайний',
                '0.5em': 'Великий',
                '0.55em': 'Дуже великий'
            },
            default: '0.45em'
        },
        'Розмір шрифту інфо-блоків',
        applyStyles);

        addSetting({
            name: 'mobile_interface_studios',
            type: 'trigger',
            default: true
        },
        'Показувати логотип студії');

        addSetting({
            name: 'mobile_interface_quality',
            type: 'trigger',
            default: true
        },
        'Бейджі якості та звуку');
    }

    /*
     * --------------------------------------------------
     * ЗАПУСК
     * --------------------------------------------------
     */

    function startPlugin() {
        if (started) return;

        if (
            !Lampa.SettingsApi ||
            !Lampa.TMDB
        ) {
            return;
        }

        started = true;

        initDefaults();
        applyStyles();
        setupSettings();
        init();

        console.log(
            '[MOB_INTERFACE] ' +
            VERSION +
            ' Premium Stable initialized'
        );
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow(
            'app',
            function (e) {
                if (
                    e &&
                    e.type === 'ready'
                ) {
                    startPlugin();
                }
            }
        );
    }

})();
