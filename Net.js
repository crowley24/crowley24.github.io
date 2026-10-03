(function () {
    'use strict';

    if (window.banner_hero_plugin) return;
    window.banner_hero_plugin = true;

    var VERSION = '1.3.0';

    var SETTING = 'banner_hero_enabled';
    var SIZE_SETTING = 'interface_size';

    /* =========================
       КЕШ
    ========================= */

    var logos = Object.create(null);
    var logoLoading = Object.create(null);
    var backdrops = Object.create(null);
    var backdropLoading = Object.create(null);

    var focusTimer = null;
    var prefetchTimer = null;

    var lastCardId = null;
    var lastActivity = null;
    var lastHero = null;

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
        settings_param_interface_size_medium: 'Середній інтерфейс'
    };

    /* =========================
       CSS
    ========================= */

    var CSS = [
        '.banner-host{position:relative}',

        '.banner-host .activity__body{padding-top:42vh;box-sizing:border-box}',

        '.banner-hero{position:absolute;left:0;right:0;top:0;height:50vh;overflow:hidden;pointer-events:none;z-index:0;-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%);mask-image:linear-gradient(180deg,#000 55%,transparent 100%)}',

        '.banner-hero__bg{position:absolute;inset:0;background-size:cover;background-position:center 20%;background-repeat:no-repeat;opacity:0;transition:opacity .35s ease;will-change:opacity}',

        '.banner-hero__bg.show{opacity:1}',

        '.banner-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.6) 35%,rgba(0,0,0,0) 70%);pointer-events:none}',

        '.banner-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:1}',

        /*
         * Оригінальний колір.
         * Без brightness/invert.
         */
        '.banner-hero__logo{max-width:100%;max-height:7em;display:none;margin-bottom:.6em;filter:drop-shadow(0 4px 12px rgba(0,0,0,.6));opacity:0;transition:opacity .2s ease}',

        '.banner-hero__logo.show{display:block;opacity:1}',

        /*
         * Назва за замовчуванням прихована.
         * Вона з'явиться тільки якщо логотип
         * відсутній або не завантажився.
         */
        '.banner-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:#f5f5f1;margin-bottom:.35em;text-shadow:0 3px 14px rgba(0,0,0,.7);display:none}',

        '.banner-hero__meta{font-size:1.15em;color:#f5f5f1;margin-bottom:.6em;display:flex;gap:.8em;align-items:center;flex-wrap:wrap}',

        '.banner-hero__rate{padding:.1em .5em;border-radius:6px;font-weight:800;background:#1db954;color:#fff}',

        '.banner-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'
    ].join('\n');

    function injectStyle() {
        if (document.getElementById('banner-hero-style')) return;

        var style = document.createElement('style');

        style.id = 'banner-hero-style';
        style.textContent = CSS;

        document.head.appendChild(style);
    }

    /* =========================
       НАЛАШТУВАННЯ
    ========================= */

    function isEnabled() {
        var val = Lampa.Storage.get(
            SETTING,
            true
        );

        return val === true || val === 'true';
    }

    /* =========================
       РОЗМІР ІНТЕРФЕЙСУ
    ========================= */

    function updateSize() {
        var isMobile =
            Lampa.Platform &&
            Lampa.Platform.screen &&
            Lampa.Platform.screen('mobile');

        var iSize = isMobile
            ? 10.1
            : parseFloat(
                Lampa.Storage.field(
                    SIZE_SETTING
                )
            ) || 10.6;

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

        if (iSize <= 9.6) {
            cardCount = 8;
        } else if (iSize <= 11.1) {
            cardCount = 7;
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
                    Lampa.Maker.map(type);

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
                        original.call(this);

                        var count =
                            mapItem.Items
                                .__bannerHeroCardCount ||
                            cardCount;

                        if (type === 'Line') {
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
       ВИЗНАЧЕННЯ ТИПУ
    ========================= */

    function getMediaType(data) {
        return (
            data &&
            data.name &&
            !data.title
        )
            ? 'tv'
            : 'movie';
    }

    function getLogoKey(data) {
        if (!data || !data.id) {
            return '';
        }

        return (
            getMediaType(data) +
            '_' +
            data.id
        );
    }

    /* =========================
       ПОШУК LOGO НА TMDB
    ========================= */

    function requestLogo(
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

        var key =
            getLogoKey(data);

        if (!key) {
            done('');
            return;
        }

        /*
         * Готовий результат.
         */
        if (
            Object.prototype.hasOwnProperty.call(
                logos,
                key
            )
        ) {
            done(logos[key]);
            return;
        }

        /*
         * Запит вже виконується.
         * Не робимо другий TMDB request.
         */
        if (logoLoading[key]) {
            logoLoading[key].push(done);
            return;
        }

        logoLoading[key] = [done];

        if (
            !Lampa.TMDB ||
            !Lampa.TMDB.api ||
            !Lampa.TMDB.key
        ) {
            finishLogo(
                key,
                ''
            );

            return;
        }

        var type =
            getMediaType(data);

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

                var pick = null;

                /*
                 * Пріоритет мов.
                 */
                ['uk', 'en', null].some(
                    function (lang) {
                        for (
                            var i = 0;
                            i < list.length;
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
                    /*
                     * ВАЖЛИВО:
                     * SVG НЕ конвертуємо в PNG.
                     *
                     * Залишається оригінальний
                     * файл TMDB.
                     */
                    var path =
                        pick.file_path;

                    logos[key] =
                        Lampa.TMDB.image(
                            't/p/original' +
                            path
                        );
                } else {
                    logos[key] = '';
                }

                finishLogo(
                    key,
                    logos[key]
                );
            },

            function () {
                finishLogo(
                    key,
                    ''
                );
            }
        );
    }

    function finishLogo(
        key,
        src
    ) {
        logos[key] =
            src || '';

        var callbacks =
            logoLoading[key] || [];

        delete logoLoading[key];

        for (
            var i = 0;
            i < callbacks.length;
            i++
        ) {
            try {
                callbacks[i](
                    logos[key]
                );
            } catch (e) {}
        }
    }

    /* =========================
       ПЕРЕВІРКА LOGO
    ========================= */

    function hasCachedLogo(data) {
        var key =
            getLogoKey(data);

        return (
            key &&
            Object.prototype.hasOwnProperty.call(
                logos,
                key
            )
        );
    }

    /* =========================
       PRELOAD LOGO
    ========================= */

    function preloadLogo(data) {
        if (
            !data ||
            !data.id
        ) {
            return;
        }

        var key =
            getLogoKey(data);

        if (!key) {
            return;
        }

        /*
         * Уже є в кеші.
         */
        if (
            Object.prototype.hasOwnProperty.call(
                logos,
                key
            )
        ) {
            return;
        }

        /*
         * Запит уже йде.
         */
        if (
            logoLoading[key]
        ) {
            return;
        }

        requestLogo(
            data,
            function (src) {
                /*
                 * Тут нічого не показуємо.
                 * Просто залишаємо результат
                 * у кеші.
                 */
            }
        );
    }

    /*
     * Попереднє завантаження кількох
     * карток після короткої паузи.
     */
    function prefetchNearbyCards(
        activity,
        currentCard
    ) {
        clearTimeout(
            prefetchTimer
        );

        prefetchTimer =
            setTimeout(
                function () {
                    if (
                        !activity ||
                        !currentCard
                    ) {
                        return;
                    }

                    var cards =
                        activity.querySelectorAll(
                            '.card'
                        );

                    if (!cards.length) {
                        return;
                    }

                    var currentIndex =
                        -1;

                    for (
                        var i = 0;
                        i < cards.length;
                        i++
                    ) {
                        if (
                            cards[i] ===
                            currentCard
                        ) {
                            currentIndex =
                                i;

                            break;
                        }
                    }

                    if (
                        currentIndex < 0
                    ) {
                        return;
                    }

                    /*
                     * Не завантажуємо
                     * весь ряд.
                     *
                     * Тільки кілька сусідніх.
                     */
                    var indexes = [
                        currentIndex - 2,
                        currentIndex - 1,
                        currentIndex + 1,
                        currentIndex + 2
                    ];

                    var count = 0;

                    for (
                        var j = 0;
                        j < indexes.length;
                        j++
                    ) {
                        if (
                            count >= 2
                        ) {
                            break;
                        }

                        var index =
                            indexes[j];

                        if (
                            index < 0 ||
                            index >=
                                cards.length
                        ) {
                            continue;
                        }

                        var card =
                            cards[index];

                        if (
                            card &&
                            card.card_data
                        ) {
                            preloadLogo(
                                card.card_data
                            );

                            count++;
                        }
                    }
                },
                350
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

        /*
         * Готовий backdrop.
         */
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
         * Завантаження вже йде.
         */
        if (
            backdropLoading[key]
        ) {
            backdropLoading[key].push(
                done
            );

            return;
        }

        backdropLoading[key] =
            [done];

        var src =
            Lampa.Api.img(
                data.backdrop_path,
                'w1280'
            );

        var img =
            new Image();

        img.onload =
            function () {
                backdrops[key] =
                    src;

                finishBackdrop(
                    key,
                    src
                );
            };

        img.onerror =
            function () {
                backdrops[key] =
                    '';

                finishBackdrop(
                    key,
                    ''
                );
            };

        img.src = src;
    }

    function finishBackdrop(
        key,
        src
    ) {
        var callbacks =
            backdropLoading[key] ||
            [];

        delete backdropLoading[
            key
        ];

        for (
            var i = 0;
            i < callbacks.length;
            i++
        ) {
            try {
                callbacks[i](
                    src
                );
            } catch (e) {}
        }
    }

    /* =========================
       HERO
    ========================= */

    function heroFor(activity) {
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

        /*
         * Та сама картка —
         * нічого не переробляємо.
         */
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

        /*
         * ==================================
         * СПОЧАТКУ ХОВАЄМО І ТЕКСТ, І LOGO
         * ==================================
         */

        el.logo.classList.remove(
            'show'
        );

        el.logo.style.display =
            'none';

        el.title.style.display =
            'none';

        /*
         * Старий logo src не повинен
         * залишатися активним.
         */
        el.logo.removeAttribute(
            'src'
        );

        /*
         * ==================================
         * META
         * ==================================
         */

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

        /*
         * ==================================
         * BACKDROP
         * ==================================
         */

        el.bg.classList.remove(
            'show'
        );

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

        /*
         * ==================================
         * LOGO
         * ==================================
         */

        requestLogo(
            data,
            function (src) {
                /*
                 * Користувач уже перейшов
                 * на іншу картку.
                 */
                if (
                    hero.bannerId !==
                    id
                ) {
                    return;
                }

                /*
                 * TMDB не має логотипа.
                 * Тільки тепер показуємо
                 * звичайну назву.
                 */
                if (!src) {
                    el.logo.style.display =
                        'none';

                    el.title.style.display =
                        '';

                    return;
                }

                /*
                 * Завантажуємо сам файл
                 * logo.
                 *
                 * Це окремий етап після
                 * TMDB /images.
                 */
                var testImage =
                    new Image();

                testImage.onload =
                    function () {
                        if (
                            hero.bannerId !==
                            id
                        ) {
                            return;
                        }

                        /*
                         * Встановлюємо вже
                         * перевірений файл.
                         */
                        el.logo.src =
                            src;

                        el.logo.style.display =
                            'block';

                        /*
                         * Текст НЕ показується.
                         */
                        el.title.style.display =
                            'none';

                        requestAnimationFrame(
                            function () {
                                if (
                                    hero.bannerId ===
                                    id
                                ) {
                                    el.logo.classList.add(
                                        'show'
                                    );
                                }
                            }
                        );
                    };

                testImage.onerror =
                    function () {
                        if (
                            hero.bannerId !==
                            id
                        ) {
                            return;
                        }

                        /*
                         * Якщо оригінальний
                         * logo не завантажився —
                         * fallback на назву.
                         */
                        el.logo.style.display =
                            'none';

                        el.title.style.display =
                            '';
                    };

                testImage.src =
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

        if (
            lastCardId ===
            data.id
        ) {
            return;
        }

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

        /*
         * Скасовуємо попередню
         * обробку при швидкому скролі.
         */
        clearTimeout(
            focusTimer
        );

        focusTimer =
            setTimeout(
                function () {
                    lastCardId =
                        data.id;

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

                    /*
                     * Паралельно починаємо
                     * готувати сусідні logo.
                     */
                    prefetchNearbyCards(
                        activity,
                        card
                    );
                },
                220
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
        }
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

        if (!on) {
            clearTimeout(
                focusTimer
            );

            clearTimeout(
                prefetchTimer
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

        /* =====================
           FOCUS
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
            }
        );
    }

})();
