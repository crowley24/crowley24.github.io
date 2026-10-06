(function () {
    'use strict';

    if (window.banner_hero_plugin) return;
    window.banner_hero_plugin = true;

    var VERSION = '1.4.0';

    var SETTING = 'banner_hero_enabled';
    var SIZE_SETTING = 'interface_size';
    var FONT_SETTING = 'fontchanger_selected';

    /* =========================
       МОБІЛЬНИЙ РЕЖИМ
    ========================= */

    function isMobileDevice() {
        return !!(
            Lampa.Platform &&
            Lampa.Platform.screen &&
            Lampa.Platform.screen('mobile')
        );
    }

    /* =========================
       КЕШ
    ========================= */

    var logos = Object.create(null);
    var backdrops = Object.create(null);

    var focusTimer = null;
    var lastCardId = null;
    var lastActivity = null;
    var lastHero = null;

    var mobileResizeTimer = null;

    /* =========================
       ЛОКАЛІЗАЦІЯ
    ========================= */

    var lang_data = {
        banner_settings_name: 'Інтерфейс +',
        banner_enable_name: 'Динамічні банери',
        banner_enable_descr: 'Показувати великий банер з фоном і логотипом над рядами карток',

        settings_param_interface_size_mini: 'Міні інтерфейс',
        settings_param_interface_size_very_small: 'Дуже малий інтерфейс',
        settings_param_interface_size_small: 'Малий інтерфейс',
        settings_param_interface_size_medium: 'Середній інтерфейс',

        font_setting_name: 'Шрифт інтерфейсу',
        font_setting_descr: 'Виберіть стиль шрифту для всього інтерфейсу',
        font_default: 'За замовчуванням (Roboto)',
        font_netflix: 'Netflix Sans',
        font_montserrat: 'Montserrat',
        font_inter: 'Inter (Сучасний UI)',
        font_nunito: 'Nunito (М\'який стиль)'
    };

    /* =========================
       КОНФІГУРАЦІЯ ШРИФТІВ
    ========================= */

    var fonts = {
        default: {
            family: 'Roboto, Arial, sans-serif',
            url: null
        },

        netflix: {
            family: '"Netflix Sans", Arial, sans-serif',
            url: 'https://assets.nflxext.com/ffe/siteui/fonts/netflix-sans/v3/NetflixSans_W_Rg.woff2'
        },

        montserrat: {
            family: '"Montserrat", sans-serif',
            url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap'
        },

        inter: {
            family: '"Inter", sans-serif',
            url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
        },

        nunito: {
            family: '"Nunito", sans-serif',
            url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap'
        }
    };

    /* =========================
       CSS
    ========================= */

    var CSS = [

        /* =====================
           БАЗОВИЙ / TV
        ===================== */

        '.banner-host{position:relative}',

        '.banner-host .activity__body{padding-top:42vh;box-sizing:border-box}',

        '.banner-hero{position:absolute;left:0;right:0;top:0;height:50vh;overflow:hidden;pointer-events:none;z-index:0;-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%);mask-image:linear-gradient(180deg,#000 55%,transparent 100%)}',

        '.banner-hero__bg{position:absolute;inset:0;background-size:cover;background-position:center 20%;background-repeat:no-repeat;opacity:0;transition:opacity .35s ease;will-change:opacity}',

        '.banner-hero__bg.show{opacity:1}',

        '.banner-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.6) 35%,rgba(0,0,0,0) 70%);pointer-events:none}',

        '.banner-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:1}',

        '.banner-hero__logo{max-width:100%;max-height:7em;display:none;margin-bottom:.6em;filter:drop-shadow(0 4px 12px rgba(0,0,0,.6))}',

        '.banner-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:#f5f5f1;margin-bottom:.35em;text-shadow:0 3px 14px rgba(0,0,0,.7)}',

        '.banner-hero__meta{font-size:1.15em;color:#f5f5f1;margin-bottom:.6em;display:flex;gap:.8em;align-items:center;flex-wrap:wrap}',

        '.banner-hero__rate{padding:.1em .5em;border-radius:6px;font-weight:800;background:#1db954;color:#fff}',

        '.banner-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',


        /* =====================
           МОБІЛЬНА ОПТИМІЗАЦІЯ
        ===================== */

        '@media screen and (max-width: 700px) {',

        'body[data-banner-mobile="1"]{',
            'overflow-x:hidden;',
        '}',

        '.banner-host{',
            'width:100%;',
            'max-width:100%;',
            'overflow:visible;',
        '}',

        '.banner-host .activity__body{',
            'padding-top:clamp(250px,52vw,390px);',
            'padding-left:0;',
            'padding-right:0;',
            'box-sizing:border-box;',
            'overflow:visible;',
        '}',

        '.banner-hero{',
            'left:0;',
            'right:0;',
            'width:100%;',
            'height:clamp(260px,58vw,430px);',
            'max-height:55vh;',
            'min-height:250px;',
            'overflow:hidden;',
            'pointer-events:none;',
            'z-index:0;',
            '-webkit-mask-image:linear-gradient(180deg,#000 48%,rgba(0,0,0,.95) 68%,transparent 100%);',
            'mask-image:linear-gradient(180deg,#000 48%,rgba(0,0,0,.95) 68%,transparent 100%);',
        '}',

        '.banner-hero__bg{',
            'inset:-1px;',
            'background-size:cover;',
            'background-position:center 18%;',
            'transition:opacity .25s ease;',
            'will-change:opacity;',
            'transform:translateZ(0);',
        '}',

        '.banner-hero::after{',
            'background:',
            'linear-gradient(180deg,rgba(0,0,0,.05) 0%,rgba(0,0,0,.12) 30%,rgba(0,0,0,.55) 68%,rgba(0,0,0,.95) 100%),',
            'linear-gradient(90deg,rgba(0,0,0,.62) 0%,rgba(0,0,0,.28) 55%,rgba(0,0,0,.05) 100%);',
        '}',

        '.banner-hero__info{',
            'left:clamp(12px,4vw,28px);',
            'right:clamp(12px,4vw,28px);',
            'bottom:clamp(28px,7vw,55px);',
            'width:auto;',
            'max-width:calc(100% - 24px);',
            'z-index:2;',
        '}',

        '.banner-hero__logo{',
            'display:none;',
            'width:auto;',
            'height:auto;',
            'max-width:min(72vw,360px);',
            'max-height:clamp(55px,18vw,105px);',
            'margin:0 0 8px 0;',
            'object-fit:contain;',
            'object-position:left bottom;',
            'filter:drop-shadow(0 2px 7px rgba(0,0,0,.65));',
        '}',

        '.banner-hero__title{',
            'font-size:clamp(22px,6vw,34px);',
            'line-height:1.08;',
            'font-weight:800;',
            'margin:0 0 7px 0;',
            'max-width:95%;',
            'display:-webkit-box;',
            '-webkit-line-clamp:2;',
            '-webkit-box-orient:vertical;',
            'overflow:hidden;',
            'text-shadow:0 2px 10px rgba(0,0,0,.75);',
        '}',

        '.banner-hero__meta{',
            'font-size:clamp(12px,3.2vw,16px);',
            'line-height:1.2;',
            'gap:6px;',
            'margin-bottom:7px;',
            'max-width:100%;',
        '}',

        '.banner-hero__rate{',
            'padding:3px 6px;',
            'border-radius:4px;',
            'font-size:.9em;',
        '}',

        '.banner-hero__descr{',
            'font-size:clamp(12px,3.1vw,15px);',
            'line-height:1.35;',
            'max-width:94%;',
            'opacity:.8;',
            '-webkit-line-clamp:2;',
        '}',

        /* Картки */

        '.banner-host .card,',
        '.banner-host .card__view,',
        '.banner-host .card__img,',
        '.banner-host .card__body{',
            'max-width:100%;',
            'box-sizing:border-box;',
        '}',

        '.banner-host .scroll__body,',
        '.banner-host .scroll__content{',
            'padding-left:max(8px,env(safe-area-inset-left));',
            'padding-right:max(8px,env(safe-area-inset-right));',
            'box-sizing:border-box;',
        '}',

        '.banner-host .scroll__body{',
            'overflow-x:hidden;',
        '}',

        /* Менше важких ефектів на мобільному */

        '.banner-hero__logo,',
        '.banner-hero__title,',
        '.banner-hero__meta,',
        '.banner-hero__descr{',
            'transform:translateZ(0);',
        '}',

        /* Portrait */

        '@media screen and (orientation: portrait){',

        '.banner-host .activity__body{',
            'padding-top:clamp(270px,63vw,410px);',
        '}',

        '.banner-hero{',
            'height:clamp(280px,68vw,420px);',
            'max-height:52vh;',
        '}',

        '.banner-hero__info{',
            'bottom:clamp(24px,6vw,42px);',
        '}',

        '.banner-hero__descr{',
            'max-width:90%;',
        '}',

        '}',

        /* Landscape */

        '@media screen and (orientation: landscape){',

        '.banner-host .activity__body{',
            'padding-top:clamp(210px,42vw,330px);',
        '}',

        '.banner-hero{',
            'height:clamp(230px,58vh,360px);',
            'max-height:62vh;',
        '}',

        '.banner-hero__info{',
            'bottom:clamp(20px,4vw,38px);',
        '}',

        '.banner-hero__descr{',
            'max-width:70%;',
            '-webkit-line-clamp:2;',
        '}',

        '}',

        /* Дуже вузькі телефони */

        '@media screen and (max-width: 380px){',

        '.banner-host .activity__body{',
            'padding-top:285px;',
        '}',

        '.banner-hero{',
            'height:285px;',
        '}',

        '.banner-hero__logo{',
            'max-width:62vw;',
            'max-height:70px;',
        '}',

        '.banner-hero__title{',
            'font-size:23px;',
        '}',

        '.banner-hero__descr{',
            'font-size:12px;',
            '-webkit-line-clamp:2;',
        '}',

        '}',

        /* Великі телефони / планшет у mobile mode */

        '@media screen and (min-width: 600px) and (max-width: 700px){',

        '.banner-host .activity__body{',
            'padding-top:350px;',
        '}',

        '.banner-hero{',
            'height:390px;',
        '}',

        '.banner-hero__info{',
            'max-width:70%;',
        '}',

        '}',

        '}',

        /* =====================
           SAFE AREA
        ===================== */

        '@supports (padding: env(safe-area-inset-left)){',

        '@media screen and (max-width: 700px){',

        '.banner-host .scroll__body{',
            'padding-left:max(10px,env(safe-area-inset-left));',
            'padding-right:max(10px,env(safe-area-inset-right));',
        '}',

        '.banner-hero__info{',
            'left:max(14px,env(safe-area-inset-left));',
            'right:max(14px,env(safe-area-inset-right));',
        '}',

        '}',

        '}'

    ].join('\n');

    function injectStyle() {
        if (document.getElementById('banner-hero-style')) return;

        var style = document.createElement('style');

        style.id = 'banner-hero-style';
        style.textContent = CSS;

        document.head.appendChild(style);
    }

    /* =========================
       ЗАСТОСУВАННЯ ШРИФТУ
    ========================= */

    function applyFont(fontKey) {
        var font = fonts[fontKey] || fonts.default;

        var oldStyle =
            document.getElementById(
                'interface-plus-font-style'
            );

        if (oldStyle) {
            oldStyle.remove();
        }

        var oldFontFace =
            document.getElementById(
                'interface-plus-fontface'
            );

        if (oldFontFace) {
            oldFontFace.remove();
        }

        if (font.url) {
            var fontFaceStyle =
                document.createElement('style');

            fontFaceStyle.id =
                'interface-plus-fontface';

            if (
                font.url.indexOf(
                    'googleapis.com'
                ) >= 0
            ) {
                fontFaceStyle.textContent =
                    '@import url("' +
                    font.url +
                    '");';
            } else {
                var fontName =
                    font.family
                        .split(',')[0]
                        .replace(/"/g, '');

                fontFaceStyle.textContent =
                    '@font-face {' +
                    'font-family:' +
                    fontName +
                    ';src:url("' +
                    font.url +
                    '") format("woff2");' +
                    'font-weight:400;' +
                    'font-style:normal;' +
                    '}';
            }

            document.head.appendChild(
                fontFaceStyle
            );
        }

        var style =
            document.createElement('style');

        style.id =
            'interface-plus-font-style';

        style.textContent =
            'body,.body,*{' +
            'font-family:' +
            font.family +
            '!important}' +

            '.full-start__title,' +
            '.full-start__tagline,' +
            '.card__title,' +
            '.card__view,' +
            '.menu__item,' +
            '.settings__title,' +
            '.settings__label,' +
            '.button,' +
            '.selector,' +
            '.filter__item,' +
            '.scroll__title{' +
            'font-family:' +
            font.family +
            '!important}';

        document.head.appendChild(style);
    }

    /* =========================
       НАЛАШТУВАННЯ
    ========================= */

    function isEnabled() {
        var val =
            Lampa.Storage.get(
                SETTING,
                true
            );

        return (
            val === true ||
            val === 'true'
        );
    }

    /* =========================
       РОЗМІР ІНТЕРФЕЙСУ
    ========================= */

    function updateSize() {
        var mobile =
            isMobileDevice();

        var iSize;

        if (mobile) {
            iSize = 10.1;
        } else {
            iSize =
                parseFloat(
                    Lampa.Storage.field(
                        SIZE_SETTING
                    )
                ) || 10.6;
        }

        var currentSize =
            document.body.getAttribute(
                'data-banner-interface-size'
            );

        if (
            currentSize ===
            String(iSize)
        ) {
            return;
        }

        document.body.setAttribute(
            'data-banner-interface-size',
            String(iSize)
        );

        document.body.style.fontSize =
            iSize + 'px';

        var cardCount = 6;

        if (mobile) {
            /*
             * На телефоні не даємо занадто
             * багато карток у рядку.
             */
            cardCount = 3;
        } else {
            if (iSize <= 9.6) {
                cardCount = 8;
            } else if (iSize <= 11.1) {
                cardCount = 7;
            }
        }

        patchMaker(cardCount);
    }

    function patchMaker(cardCount) {
        if (
            !Lampa.Maker ||
            !Lampa.Maker.map
        ) {
            return;
        }

        ['Line', 'Category'].forEach(
            function (type) {
                var mapItem =
                    Lampa.Maker.map(
                        type
                    );

                if (
                    !mapItem ||
                    !mapItem.Items ||
                    !mapItem.Items.onInit
                ) {
                    return;
                }

                if (
                    mapItem.Items
                        .__bannerHeroPatched
                ) {
                    mapItem.Items
                        .__bannerHeroCardCount =
                        cardCount;

                    return;
                }

                var original =
                    mapItem.Items.onInit;

                mapItem.Items.onInit =
                    function () {
                        original.call(
                            this
                        );

                        var count =
                            mapItem.Items
                                .__bannerHeroCardCount ||
                            cardCount;

                        if (
                            type ===
                            'Line'
                        ) {
                            this.view =
                                count;
                        } else {
                            this.limit_view =
                                count;
                        }
                    };

                mapItem.Items
                    .__bannerHeroPatched =
                    true;

                mapItem.Items
                    .__bannerHeroCardCount =
                    cardCount;
            }
        );
    }

    /* =========================
       LOGO
    ========================= */

    function loadLogo(
        data,
        done
    ) {
        if (
            !data ||
            !data.id
        ) {
            done('');
            return;
        }

        if (
            data.source &&
            data.source !== 'tmdb'
        ) {
            done('');
            return;
        }

        var type =
            data.name &&
            !data.title
                ? 'tv'
                : 'movie';

        var key =
            type +
            '_' +
            data.id;

        if (
            Object.prototype.hasOwnProperty.call(
                logos,
                key
            )
        ) {
            done(logos[key]);
            return;
        }

        if (
            !Lampa.TMDB ||
            !Lampa.TMDB.api ||
            !Lampa.TMDB.key
        ) {
            logos[key] = '';
            done('');
            return;
        }

        var url =
            Lampa.TMDB.api(
                type +
                '/' +
                data.id +
                '/images?api_key=' +
                Lampa.TMDB.key() +
                '&include_image_language=uk,en,null'
            );

        var network =
            new Lampa.Reguest();

        network.silent(
            url,

            function (json) {
                var list =
                    json &&
                    Array.isArray(
                        json.logos
                    )
                        ? json.logos
                        : [];

                var pick =
                    null;

                ['uk', 'en', null]
                    .some(
                        function (
                            lang
                        ) {
                            for (
                                var i = 0;
                                i <
                                list.length;
                                i++
                            ) {
                                if (
                                    list[i]
                                        .iso_639_1 ===
                                    lang
                                ) {
                                    pick =
                                        list[i];

                                    return true;
                                }
                            }

                            return false;
                        }
                    );

                pick =
                    pick ||
                    list[0];

                if (
                    pick &&
                    pick.file_path
                ) {
                    var path =
                        pick.file_path
                            .replace(
                                '.svg',
                                '.png'
                            );

                    logos[key] =
                        Lampa.TMDB.image(
                            't/p/w500' +
                            path
                        );
                } else {
                    logos[key] = '';
                }

                done(
                    logos[key]
                );
            },

            function () {
                logos[key] = '';
                done('');
            }
        );
    }

    /* =========================
       BACKDROP
    ========================= */

    function loadBackdrop(
        data,
        done
    ) {
        if (
            !data ||
            !data.id ||
            !data.backdrop_path
        ) {
            done('');
            return;
        }

        var key =
            String(data.id);

        if (
            Object.prototype.hasOwnProperty.call(
                backdrops,
                key
            )
        ) {
            done(
                backdrops[key]
            );
            return;
        }

        /*
         * На мобільному w780.
         * На TV залишається w1280.
         */
        var quality =
            isMobileDevice()
                ? 'w780'
                : 'w1280';

        var src =
            Lampa.Api.img(
                data.backdrop_path,
                quality
            );

        var img =
            new Image();

        img.onload =
            function () {
                backdrops[key] =
                    src;

                done(src);
            };

        img.onerror =
            function () {
                backdrops[key] =
                    '';

                done('');
            };

        img.src =
            src;
    }

    /* =========================
       HERO
    ========================= */

    function heroFor(
        activity
    ) {
        if (!activity) {
            return null;
        }

        if (
            activity.__bannerHero &&
            activity.__bannerHero.parentNode ===
                activity
        ) {
            return activity.__bannerHero;
        }

        var hero =
            activity.querySelector(
                '.banner-hero'
            );

        if (hero) {
            cacheHeroElements(
                hero
            );

            activity.__bannerHero =
                hero;

            activity.classList.add(
                'banner-host'
            );

            return hero;
        }

        hero =
            document.createElement(
                'div'
            );

        hero.className =
            'banner-hero';

        hero.innerHTML =
            '<div class="banner-hero__bg"></div>' +
            '<div class="banner-hero__info">' +
                '<img class="banner-hero__logo" />' +
                '<div class="banner-hero__title"></div>' +
                '<div class="banner-hero__meta"></div>' +
                '<div class="banner-hero__descr"></div>' +
            '</div>';

        activity.insertBefore(
            hero,
            activity.firstChild
        );

        activity.classList.add(
            'banner-host'
        );

        cacheHeroElements(
            hero
        );

        activity.__bannerHero =
            hero;

        return hero;
    }

    function cacheHeroElements(
        hero
    ) {
        if (
            hero.__bannerElements
        ) {
            return;
        }

        hero.__bannerElements = {
            bg:
                hero.querySelector(
                    '.banner-hero__bg'
                ),

            logo:
                hero.querySelector(
                    '.banner-hero__logo'
                ),

            title:
                hero.querySelector(
                    '.banner-hero__title'
                ),

            meta:
                hero.querySelector(
                    '.banner-hero__meta'
                ),

            descr:
                hero.querySelector(
                    '.banner-hero__descr'
                )
        };
    }

    /* =========================
       ПОКАЗ БАНЕРА
    ========================= */

    function showHero(
        hero,
        data
    ) {
        if (
            !hero ||
            !data
        ) {
            return;
        }

        var id =
            data.id;

        if (
            hero.bannerId === id &&
            hero.bannerData
        ) {
            return;
        }

        cacheHeroElements(
            hero
        );

        var el =
            hero.__bannerElements;

        hero.bannerId =
            id;

        hero.bannerData =
            data;

        var title =
            data.title ||
            data.name ||
            '';

        el.title.textContent =
            title;

        el.title.style.display =
            '';

        el.logo.style.display =
            'none';

        /*
         * Важливо:
         * скидаємо старий src,
         * щоб старий логотип не залишався
         * при швидкому перемиканні карток.
         */
        el.logo.removeAttribute(
            'src'
        );

        var meta = [];

        var vote =
            parseFloat(
                data.vote_average
            );

        if (vote) {
            meta.push(
                '<span class="banner-hero__rate">' +
                vote.toFixed(1) +
                '</span>'
            );
        }

        var year =
            (
                data.release_date ||
                data.first_air_date ||
                ''
            ) + '';

        year =
            year.slice(0, 4);

        if (year) {
            meta.push(
                '<span>' +
                year +
                '</span>'
            );
        }

        meta.push(
            '<span>' +
            (
                data.name &&
                !data.title
                    ? 'Серіал'
                    : 'Фільм'
            ) +
            '</span>'
        );

        el.meta.innerHTML =
            meta.join('');

        el.descr.textContent =
            data.overview ||
            '';

        el.bg.classList.remove(
            'show'
        );

        el.bg.style.backgroundImage =
            '';

        loadBackdrop(
            data,
            function (src) {
                if (
                    hero.bannerId !==
                        id ||
                    !src
                ) {
                    return;
                }

                el.bg.style.backgroundImage =
                    'url("' +
                    src +
                    '")';

                /*
                 * На мобільному даємо
                 * браузеру завершити layout
                 * перед появою backdrop.
                 */
                requestAnimationFrame(
                    function () {
                        if (
                            hero.bannerId ===
                            id
                        ) {
                            el.bg.classList.add(
                                'show'
                            );
                        }
                    }
                );
            }
        );

        loadLogo(
            data,
            function (src) {
                if (
                    hero.bannerId !==
                        id ||
                    !src
                ) {
                    return;
                }

                el.logo.onload =
                    function () {
                        if (
                            hero.bannerId !==
                            id
                        ) {
                            return;
                        }

                        el.logo.style.display =
                            'block';

                        el.title.style.display =
                            'none';
                    };

                el.logo.onerror =
                    function () {
                        if (
                            hero.bannerId ===
                            id
                        ) {
                            el.logo.style.display =
                                'none';

                            el.title.style.display =
                                '';
                        }
                    };

                el.logo.src =
                    src;
            }
        );
    }

    /* =========================
       FOCUS
    ========================= */

    function onCardFocus(e) {
        if (!isEnabled()) {
            return;
        }

        var card =
            e.target;

        if (
            !card ||
            !card.classList ||
            !card.classList.contains(
                'card'
            ) ||
            !card.card_data
        ) {
            return;
        }

        var data =
            card.card_data;

        if (!data.id) {
            return;
        }

        /*
         * Враховуємо activity,
         * щоб однаковий ID у різних
         * рядах не блокував банер.
         */
        var activity =
            card.closest
                ? card.closest(
                    '.activity'
                )
                : null;

        if (
            !activity ||
            !activity.classList.contains(
                'banner-host'
            )
        ) {
            return;
        }

        var activityId =
            activity.__bannerHeroId ||
            '';

        var currentKey =
            String(
                activityId
            ) +
            '_' +
            String(data.id);

        if (
            lastCardId ===
            currentKey
        ) {
            return;
        }

        clearTimeout(
            focusTimer
        );

        /*
         * На мобільному менша затримка,
         * щоб банер реагував швидше,
         * але не реагував на кожний
         * мікрорух під час скролу.
         */
        var delay =
            isMobileDevice()
                ? 120
                : 220;

        focusTimer =
            setTimeout(
                function () {
                    lastCardId =
                        currentKey;

                    lastActivity =
                        activity;

                    var hero =
                        activity.__bannerHero ||
                        heroFor(
                            activity
                        );

                    lastHero =
                        hero;

                    showHero(
                        hero,
                        data
                    );
                },
                delay
            );
    }

    /* =========================
       ACTIVITY
    ========================= */

    function attach(
        object
    ) {
        if (
            !isEnabled() ||
            !object ||
            ['main', 'category']
                .indexOf(
                    object.component
                ) < 0
        ) {
            return;
        }

        var render =
            object.activity &&
            object.activity.render &&
            object.activity.render(
                true
            );

        var el =
            render &&
            render.jquery
                ? render[0]
                : render;

        if (
            el &&
            el.classList
        ) {
            heroFor(el);

            /*
             * Унікальний ID activity.
             */
            el.__bannerHeroId =
                'activity_' +
                Date.now() +
                '_' +
                Math.random()
                    .toString(36)
                    .slice(2, 7);
        }
    }

    /* =========================
       MOBILE RESIZE
    ========================= */

    function updateMobileLayout() {
        if (!isMobileDevice()) {
            document.body.removeAttribute(
                'data-banner-mobile'
            );

            return;
        }

        document.body.setAttribute(
            'data-banner-mobile',
            '1'
        );

        clearTimeout(
            mobileResizeTimer
        );

        mobileResizeTimer =
            setTimeout(
                function () {
                    updateSize();

                    /*
                     * Скидаємо тільки поточний
                     * focus cache. Сам Hero
                     * залишається.
                     */
                    lastCardId =
                        null;
                },
                120
            );
    }

    /* =========================
       APPLY
    ========================= */

    function apply() {
        var on =
            isEnabled();

        document.body.classList.toggle(
            'banner-enabled',
            on
        );

        if (
            isMobileDevice()
        ) {
            document.body.setAttribute(
                'data-banner-mobile',
                '1'
            );
        } else {
            document.body.removeAttribute(
                'data-banner-mobile'
            );
        }

        if (!on) {
            clearTimeout(
                focusTimer
            );

            lastCardId =
                null;

            lastActivity =
                null;

            lastHero =
                null;
        }
    }

    /* =========================
       INIT
    ========================= */

    function init() {
        if (
            window.Lampa &&
            Lampa.Lang
        ) {
            Lampa.Lang.add(
                lang_data
            );
        }

        /* =====================
           PARAMS
        ===================== */

        if (Lampa.Params) {
            if (
                !Lampa.Params.values
            ) {
                Lampa.Params.values =
                    {};
            }

            Lampa.Params.values[
                SIZE_SETTING
            ] = {
                '09.1':
                    lang_data
                        .settings_param_interface_size_mini,

                '09.6':
                    lang_data
                        .settings_param_interface_size_very_small,

                '10.1':
                    lang_data
                        .settings_param_interface_size_small,

                '10.6':
                    lang_data
                        .settings_param_interface_size_medium
            };

            if (
                Lampa.Params.select
            ) {
                Lampa.Params.select(
                    SIZE_SETTING,
                    Lampa.Params.values[
                        SIZE_SETTING
                    ],
                    '10.6'
                );
            }
        }

        injectStyle();

        apply();

        updateSize();

        var savedFont =
            Lampa.Storage.get(
                FONT_SETTING,
                'default'
            );

        applyFont(
            savedFont
        );

        /* =====================
           MOBILE
        ===================== */

        updateMobileLayout();

        /*
         * ResizeObserver краще реагує
         * на зміну реального розміру
         * viewport, ніж постійний polling.
         */
        if (
            isMobileDevice() &&
            window.ResizeObserver
        ) {
            var resizeTarget =
                document.documentElement;

            var resizeObserver =
                new ResizeObserver(
                    function () {
                        updateMobileLayout();
                    }
                );

            resizeObserver.observe(
                resizeTarget
            );

            window.__bannerHeroResizeObserver =
                resizeObserver;
        } else {
            window.addEventListener(
                'resize',
                updateMobileLayout,
                {
                    passive: true
                }
            );

            window.addEventListener(
                'orientationchange',
                updateMobileLayout,
                {
                    passive: true
                }
            );
        }

        /* =====================
           FOCUS LISTENER
        ===================== */

        document.addEventListener(
            'hover:focus',
            onCardFocus,
            true
        );

        /* =====================
           ACTIVITY
        ===================== */

        Lampa.Listener.follow(
            'activity',
            function (e) {
                if (
                    e.type ===
                    'start'
                ) {
                    requestAnimationFrame(
                        function () {
                            attach(
                                e.object
                            );
                        }
                    );
                }
            }
        );

        if (
            Lampa.Activity &&
            Lampa.Activity.active
        ) {
            requestAnimationFrame(
                function () {
                    attach(
                        Lampa.Activity.active()
                    );
                }
            );
        }

        /* =====================
           SETTINGS API
        ===================== */

        if (
            Lampa.SettingsApi
        ) {
            Lampa.SettingsApi.addComponent({
                component:
                    'interface_plus_settings',

                name:
                    lang_data
                        .banner_settings_name,

                icon:
                    '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">' +
                    '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 5h2v5h-2z"/>' +
                    '</svg>'
            });

            Lampa.SettingsApi.addParam({
                component:
                    'interface_plus_settings',

                param: {
                    name:
                        SETTING,

                    type:
                        'trigger',

                    default:
                        true
                },

                field: {
                    name:
                        lang_data
                            .banner_enable_name,

                    description:
                        lang_data
                            .banner_enable_descr
                },

                onChange:
                    apply
            });

            Lampa.SettingsApi.addParam({
                component:
                    'interface_plus_settings',

                param: {
                    name:
                        SIZE_SETTING,

                    type:
                        'select',

                    values:
                        Lampa.Params.values[
                            SIZE_SETTING
                        ],

                    default:
                        '10.6'
                },

                field: {
                    name:
                        'Розмір інтерфейсу',

                    description:
                        'Виберіть бажаний масштаб елементів інтерфейсу'
                },

                onChange:
                    updateSize
            });

            var fontValues = {
                default:
                    lang_data.font_default,

                netflix:
                    lang_data.font_netflix,

                montserrat:
                    lang_data.font_montserrat,

                inter:
                    lang_data.font_inter,

                nunito:
                    lang_data.font_nunito
            };

            Lampa.SettingsApi.addParam({
                component:
                    'interface_plus_settings',

                param: {
                    name:
                        FONT_SETTING,

                    type:
                        'select',

                    values:
                        fontValues,

                    default:
                        'default'
                },

                field: {
                    name:
                        lang_data
                            .font_setting_name,

                    description:
                        lang_data
                            .font_setting_descr
                },

                onChange:
                    function (
                        value
                    ) {
                        applyFont(
                            value
                        );
                    }
            });
        }
    }

    /* =========================
       START
    ========================= */

    if (window.appready) {
        setTimeout(
            init,
            500
        );
    } else {
        Lampa.Listener.follow(
            'app',
            function (e) {
                if (
                    e.type ===
                    'ready'
                ) {
                    setTimeout(
                        init,
                        500
                    );
                }
            }
        );
    }

    /* =========================
       STORAGE
    ========================= */

    if (
        window.Lampa &&
        Lampa.Storage &&
        Lampa.Storage.listener
    ) {
        Lampa.Storage.listener.follow(
            'change',
            function (e) {

                if (
                    e.name ===
                    SIZE_SETTING
                ) {
                    updateSize();
                }

                if (
                    e.name ===
                    SETTING
                ) {
                    apply();
                }

                if (
                    e.name ===
                    FONT_SETTING
                ) {
                    applyFont(
                        e.value
                    );
                }
            }
        );
    }

})();
