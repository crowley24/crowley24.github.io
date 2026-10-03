(function () {
'use strict';

if (window.banner_hero_plugin) return;
window.banner_hero_plugin = true;

var VERSION = '1.3.0';

var SETTING = 'banner_hero_enabled';
var SIZE_SETTING = 'interface_size';

/* =========================================================
   КЕШ
   ========================================================= */

var logos = Object.create(null);
var logoLoading = Object.create(null);
var backgroundCache = Object.create(null);

var focusTimer = null;
var lastCardId = null;
var initializedActivities = typeof WeakSet !== 'undefined' ? new WeakSet() : null;

/* =========================================================
   ЛОКАЛІЗАЦІЯ
   ========================================================= */

var lang_data = {
    banner_settings_name: 'Інтерфейс +',
    banner_enable_name: 'Динамічні банери',
    banner_enable_descr: 'Показувати великий банер з фоном і логотипом над рядами карток',

    settings_param_interface_size_mini: 'Міні інтерфейс',
    settings_param_interface_size_very_small: 'Дуже малий інтерфейс',
    settings_param_interface_size_small: 'Малий інтерфейс',
    settings_param_interface_size_medium: 'Середній інтерфейс'
};

/* =========================================================
   CSS
   ========================================================= */

var CSS = [
    '.banner-host{position:relative}',

    '.banner-host .activity__body{padding-top:42vh;box-sizing:border-box}',

    '.banner-hero{position:absolute;left:0;right:0;top:0;height:50vh;overflow:hidden;pointer-events:none;z-index:0;-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%);mask-image:linear-gradient(180deg,#000 55%,transparent 100%)}',

    '.banner-hero__bg{position:absolute;inset:0;background-size:cover;background-position:center 20%;opacity:0;transition:opacity .45s ease;will-change:opacity}',

    '.banner-hero__bg.show{opacity:1}',

    '.banner-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.6) 35%,rgba(0,0,0,0) 70%)}',

    '.banner-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:1}',

    /*
     * ЛОГОТИП
     *
     * Ніякого brightness/invert.
     * Показуємо оригінальний колір TMDB.
     */

    '.banner-hero__logo{display:block;max-width:100%;max-height:7em;width:auto;height:auto;object-fit:contain;object-position:left center;margin:0;opacity:0;visibility:hidden;transform:translate3d(0,4px,0);transition:opacity .25s ease,transform .25s ease;filter:drop-shadow(0 4px 12px rgba(0,0,0,.65));will-change:opacity,transform}',

    '.banner-hero__logo.loaded{opacity:1;visibility:visible;transform:translate3d(0,0,0)}',

    /*
     * Старий текстовий title залишений технічно,
     * але прихований. Банер працює тільки через logo.
     */

    '.banner-hero__title{display:none!important}',

    '.banner-hero__meta{font-size:1.15em;color:#f5f5f1;margin-top:.65em;margin-bottom:.6em;display:flex;gap:.8em;align-items:center;flex-wrap:wrap}',

    '.banner-hero__rate{padding:.1em .5em;border-radius:6px;font-weight:800;background:#1db954;color:#fff}',

    '.banner-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',

    'body.banner-enabled .background::after{content:"";position:fixed;inset:0;background:rgba(11,12,16,.55);pointer-events:none}'
].join('\n');

function injectStyle() {
    if (document.getElementById('banner-hero-style')) return;

    var style = document.createElement('style');
    style.id = 'banner-hero-style';
    style.textContent = CSS;

    document.head.appendChild(style);
}

/* =========================================================
   SETTINGS
   ========================================================= */

function isEnabled() {
    var val = Lampa.Storage.get(SETTING, true);

    return val === true || val === 'true';
}

/* =========================================================
   РОЗМІР ІНТЕРФЕЙСУ
   ========================================================= */

var updateSize = function () {
    var isMobile =
        Lampa.Platform &&
        Lampa.Platform.screen &&
        Lampa.Platform.screen('mobile');

    var iSize = isMobile
        ? 10.1
        : parseFloat(Lampa.Storage.field(SIZE_SETTING)) || 10.6;

    $('body').css({
        fontSize: iSize + 'px'
    });

    var cardCount = 6;

    if (iSize <= 9.6) {
        cardCount = 8;
    } else if (iSize <= 11.1) {
        cardCount = 7;
    }

    if (Lampa.Maker && Lampa.Maker.map) {
        ['Line', 'Category'].forEach(function (type) {

            var mapItem = Lampa.Maker.map(type);

            if (
                mapItem &&
                mapItem.Items &&
                mapItem.Items.onInit
            ) {

                var original = mapItem.Items.onInit;

                /*
                 * Не обгортаємо onInit повторно,
                 * якщо updateSize викликається декілька разів.
                 */

                if (original.__bannerHeroWrapped) return;

                var wrapped = function () {
                    original.call(this);

                    if (type === 'Line') {
                        this.view = cardCount;
                    } else {
                        this.limit_view = cardCount;
                    }
                };

                wrapped.__bannerHeroWrapped = true;

                mapItem.Items.onInit = wrapped;
            }
        });
    }
};

/* =========================================================
   ВИЗНАЧЕННЯ ТИПУ
   ========================================================= */

function getMediaType(data) {
    if (!data) return 'movie';

    return (
        data.name &&
        !data.title
    ) ? 'tv' : 'movie';
}

/* =========================================================
   URL ЛОГОТИПА
   ========================================================= */

function getLogoUrl(filePath) {
    if (!filePath) return '';

    /*
     * Не конвертуємо SVG у PNG.
     *
     * TMDB original дозволяє отримати оригінальний файл.
     */

    return Lampa.TMDB.image(
        '/t/p/original' + filePath
    );
}

/* =========================================================
   ВИБІР ЛОГОТИПА
   ========================================================= */

function selectLogo(logosList) {
    if (!logosList || !logosList.length) {
        return null;
    }

    var language =
        Lampa.Storage.get('language') ||
        Lampa.Storage.field('tmdb_lang') ||
        'uk';

    /*
     * Пріоритет:
     *
     * 1. Українська / поточна мова
     * 2. English
     * 3. Логотип без мови
     * 4. Перший доступний
     */

    var logo =
        logosList.filter(function (item) {
            return item.iso_639_1 === language;
        })[0];

    if (!logo && language !== 'uk') {
        logo = logosList.filter(function (item) {
            return item.iso_639_1 === 'uk';
        })[0];
    }

    if (!logo) {
        logo = logosList.filter(function (item) {
            return item.iso_639_1 === 'en';
        })[0];
    }

    if (!logo) {
        logo = logosList.filter(function (item) {
            return !item.iso_639_1;
        })[0];
    }

    return logo || logosList[0];
}

/* =========================================================
   ЗАВАНТАЖЕННЯ ЛОГОТИПА
   ========================================================= */

function loadLogo(data, done) {
    if (
        !data ||
        !data.id ||
        (data.source && data.source !== 'tmdb')
    ) {
        done('');
        return;
    }

    var type = getMediaType(data);
    var key = type + '_' + data.id;

    /*
     * Логотип уже є в кеші.
     */

    if (Object.prototype.hasOwnProperty.call(logos, key)) {
        done(logos[key]);
        return;
    }

    /*
     * Запит уже виконується.
     * Не створюємо другий TMDB request.
     */

    if (logoLoading[key]) {
        logoLoading[key].push(done);
        return;
    }

    logoLoading[key] = [done];

    var url =
        Lampa.TMDB.api(
            type +
            '/' +
            data.id +
            '/images?api_key=' +
            Lampa.TMDB.key() +
            '&include_image_language=uk,en,null'
        );

    var network = new Lampa.Reguest();

    network.silent(
        url,

        function (json) {

            var list =
                (json && json.logos) ||
                [];

            var pick =
                selectLogo(list);

            var result =
                pick && pick.file_path
                    ? getLogoUrl(pick.file_path)
                    : '';

            logos[key] = result;

            var callbacks =
                logoLoading[key] || [];

            delete logoLoading[key];

            callbacks.forEach(function (callback) {
                callback(result);
            });
        },

        function () {

            logos[key] = '';

            var callbacks =
                logoLoading[key] || [];

            delete logoLoading[key];

            callbacks.forEach(function (callback) {
                callback('');
            });
        }
    );
}

/* =========================================================
   ПОПЕРЕДНЄ ЗАВАНТАЖЕННЯ ЛОГОТИПА
   ========================================================= */

function preloadLogo(src, callback) {
    if (!src) {
        callback(false);
        return;
    }

    var img = new Image();

    img.onload = function () {
        callback(true);
    };

    img.onerror = function () {
        callback(false);
    };

    img.src = src;
}

/* =========================================================
   СТВОРЕННЯ HERO
   ========================================================= */

function heroFor(activity) {

    var hero =
        activity.querySelector('.banner-hero');

    if (hero) return hero;

    hero = document.createElement('div');

    hero.className = 'banner-hero';

    hero.innerHTML =
        '<div class="banner-hero__bg"></div>' +

        '<div class="banner-hero__info">' +

            '<img class="banner-hero__logo" alt="">' +

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

    return hero;
}

/* =========================================================
   ФОН
   ========================================================= */

function setBackground(hero, data) {

    var bg =
        hero.querySelector(
            '.banner-hero__bg'
        );

    if (!bg) return;

    bg.classList.remove('show');

    var path = data.backdrop_path;

    if (!path) {
        bg.style.backgroundImage = '';
        return;
    }

    var key =
        'w1280_' + path;

    if (backgroundCache[key]) {

        bg.style.backgroundImage =
            'url("' +
            backgroundCache[key] +
            '")';

        bg.classList.add('show');

        return;
    }

    var url =
        Lampa.Api.img(
            path,
            'w1280'
        );

    var img = new Image();

    img.onload = function () {

        backgroundCache[key] =
            url;

        if (
            hero.bannerId !== data.id
        ) {
            return;
        }

        bg.style.backgroundImage =
            'url("' +
            url +
            '")';

        bg.classList.add('show');
    };

    img.src = url;
}

/* =========================================================
   ВІДОБРАЖЕННЯ HERO
   ========================================================= */

function showHero(hero, data) {

    if (!hero || !data) return;

    var bg =
        hero.querySelector(
            '.banner-hero__bg'
        );

    var logo =
        hero.querySelector(
            '.banner-hero__logo'
        );

    var titleEl =
        hero.querySelector(
            '.banner-hero__title'
        );

    var metaEl =
        hero.querySelector(
            '.banner-hero__meta'
        );

    var descrEl =
        hero.querySelector(
            '.banner-hero__descr'
        );

    /*
     * ID використовується для захисту
     * від асинхронних відповідей старих карток.
     */

    hero.bannerId = data.id;

    /*
     * НІЯКОГО ТЕКСТУ ЗАМІСТЬ ЛОГОТИПА.
     */

    titleEl.textContent = '';

    logo.classList.remove('loaded');

    logo.removeAttribute('src');

    /*
     * Фон показуємо незалежно від логотипа.
     */

    setBackground(
        hero,
        data
    );

    /* -----------------------------------------------------
       META
       ----------------------------------------------------- */

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

    year = year.slice(0, 4);

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

    metaEl.innerHTML =
        meta.join('');

    descrEl.textContent =
        data.overview || '';

    /*
     * -----------------------------------------------------
     * ЛОГОТИП
     * -----------------------------------------------------
     */

    loadLogo(
        data,
        function (src) {

            /*
             * Картка вже змінилася.
             */

            if (
                hero.bannerId !== data.id
            ) {
                return;
            }

            if (!src) {
                return;
            }

            /*
             * Спочатку preload.
             *
             * Це запобігає появі порожнього img
             * або миготінню.
             */

            preloadLogo(
                src,
                function (success) {

                    if (
                        !success ||
                        hero.bannerId !== data.id
                    ) {
                        return;
                    }

                    /*
                     * Встановлюємо src тільки після
                     * того, як картинка завантажена.
                     */

                    logo.src = src;

                    /*
                     * requestAnimationFrame дозволяє
                     * браузеру спочатку відмалювати img,
                     * а потім увімкнути transition.
                     */

                    requestAnimationFrame(
                        function () {

                            if (
                                hero.bannerId !== data.id
                            ) {
                                return;
                            }

                            logo.classList.add(
                                'loaded'
                            );
                        }
                    );
                }
            );
        }
    );
}

/* =========================================================
   FOCUS КАРТКИ
   ========================================================= */

function onCardFocus(e) {

    if (!isEnabled()) return;

    var card = e.target;

    if (
        !card ||
        !card.classList ||
        !card.classList.contains('card') ||
        !card.card_data
    ) {
        return;
    }

    var cardId =
        card.card_data.id;

    if (!cardId) return;

    /*
     * Не оновлюємо банер повторно
     * для тієї самої картки.
     */

    if (
        lastCardId === cardId
    ) {
        return;
    }

    var activity =
        card.closest
            ? card.closest('.activity')
            : null;

    if (
        !activity ||
        !activity.classList.contains(
            'banner-host'
        )
    ) {
        return;
    }

    clearTimeout(
        focusTimer
    );

    /*
     * Невеликий debounce.
     *
     * Він сильно зменшує кількість
     * непотрібних TMDB запитів під час
     * швидкого переміщення по рядах.
     */

    focusTimer =
        setTimeout(
            function () {

                lastCardId =
                    cardId;

                showHero(
                    heroFor(activity),
                    card.card_data
                );

            },
            120
        );
}

/* =========================================================
   ACTIVITY
   ========================================================= */

function attach(object) {

    if (
        !isEnabled() ||
        !object ||
        ['main', 'category']
            .indexOf(object.component) < 0
    ) {
        return;
    }

    var render =
        object.activity &&
        object.activity.render &&
        object.activity.render(true);

    var el =
        render &&
        render.jquery
            ? render[0]
            : render;

    if (
        el &&
        el.classList
    ) {

        if (
            initializedActivities &&
            initializedActivities.has(el)
        ) {
            return;
        }

        if (initializedActivities) {
            initializedActivities.add(el);
        }

        heroFor(el);
    }
}

/* =========================================================
   APPLY
   ========================================================= */

function apply() {

    var on =
        isEnabled();

    document.body.classList.toggle(
        'banner-enabled',
        on
    );

    /*
     * Якщо вимкнули плагін —
     * очищаємо стан focus.
     */

    if (!on) {

        clearTimeout(
            focusTimer
        );

        lastCardId = null;
    }
}

/* =========================================================
   INIT
   ========================================================= */

function init() {

    if (
        window.Lampa &&
        Lampa.Lang
    ) {
        Lampa.Lang.add(
            lang_data
        );
    }

    /*
     * Interface Size
     */

    if (Lampa.Params) {

        if (!Lampa.Params.values) {
            Lampa.Params.values = {};
        }

        Lampa.Params.values[
            SIZE_SETTING
        ] = {

            '09.1':
                lang_data.settings_param_interface_size_mini,

            '09.6':
                lang_data.settings_param_interface_size_very_small,

            '10.1':
                lang_data.settings_param_interface_size_small,

            '10.6':
                lang_data.settings_param_interface_size_medium
        };

        if (Lampa.Params.select) {

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

    /*
     * Focus listener.
     */

    document.addEventListener(
        'hover:focus',
        onCardFocus,
        true
    );

    /*
     * Activity.
     */

    Lampa.Listener.follow(
        'activity',
        function (e) {

            if (
                e.type === 'start'
            ) {
                attach(e.object);
            }
        }
    );

    if (
        Lampa.Activity &&
        Lampa.Activity.active
    ) {
        attach(
            Lampa.Activity.active()
        );
    }

    /* =====================================================
       SETTINGS
       ===================================================== */

    if (Lampa.SettingsApi) {

        Lampa.SettingsApi.addComponent({

            component:
                'interface_plus_settings',

            name:
                lang_data.banner_settings_name,

            icon:
                '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">' +
                '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 5h2v5h-2z"/>' +
                '</svg>'
        });

        Lampa.SettingsApi.addParam({

            component:
                'interface_plus_settings',

            param: {
                name: SETTING,
                type: 'trigger',
                default: true
            },

            field: {
                name:
                    lang_data.banner_enable_name,

                description:
                    lang_data.banner_enable_descr
            },

            onChange:
                apply
        });

        Lampa.SettingsApi.addParam({

            component:
                'interface_plus_settings',

            param: {
                name: SIZE_SETTING,
                type: 'select',

                values:
                    Lampa.Params.values[
                        SIZE_SETTING
                    ],

                default: '10.6'
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

/* =========================================================
   START
   ========================================================= */

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
                e.type === 'ready'
            ) {

                setTimeout(
                    init,
                    500
                );
            }
        }
    );
}

/* =========================================================
   STORAGE LISTENER
   ========================================================= */

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
