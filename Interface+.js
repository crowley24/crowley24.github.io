
(function () {
    'use strict';

    /*
     * @name INTERFACE+
     * @version 1.4.1
     * @author Crowley24
     * @description Netflix-style interface and card logos
     * @platforms Lampa | Android TV
     */

    if (window.banner_hero_plugin) return;
    window.banner_hero_plugin = true;

    var VERSION = '1.4.1';

    var SETTING = 'banner_hero_enabled';
    var SIZE_SETTING = 'interface_size';
    var FONT_SETTING = 'fontchanger_selected';
    var CARD_LOGO_SETTING = 'interface_plus_card_logo';

    var logos = Object.create(null);
    var logoPending = Object.create(null);
    var backdrops = Object.create(null);
    var backdropPending = Object.create(null);

    var focusTimer = null;
    var lastCardId = null;
    var lastActivity = null;

    var initialized = false;

    /* =========================
       CARD STATE
    ========================= */

    var cardState = {
        data: null,
        root: null,
        key: '',
        token: 0,
        timer: null,
        observer: null,
        attempts: 0,
        image: null,
        imageSource: '',
        ready: false
    };

    var CARD_SELECTORS = [
        '.full-start__title',
        '.full-start-new__title',
        '.full__title',
        '.full-card__title'
    ].join(',');

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
        font_nunito: 'Nunito (М\'який стиль)',

        card_logo_name: 'Логотип у картці фільму',
        card_logo_descr: 'Замінювати назву фільму або серіалу оригінальним логотипом TMDB'
    };

    /* =========================
       FONTS
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
        '.banner-host{position:relative}',

        '.banner-enabled .banner-host .activity__body{padding-top:42vh;box-sizing:border-box}',

        '.banner-hero{position:absolute;left:0;right:0;top:0;height:50vh;overflow:hidden;pointer-events:none;z-index:0;-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%);mask-image:linear-gradient(180deg,#000 55%,transparent 100%)}',

        '.banner-hero__bg{position:absolute;inset:0;background-size:cover;background-position:center 20%;background-repeat:no-repeat;opacity:0;transition:opacity .35s ease}',

        '.banner-hero__bg.show{opacity:1}',

        '.banner-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.6) 35%,rgba(0,0,0,0) 70%);pointer-events:none}',

        '.banner-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:1}',

        '.banner-hero__logo{max-width:100%;max-height:7em;display:none;margin-bottom:.6em;object-fit:contain;object-position:left center;filter:drop-shadow(0 4px 12px rgba(0,0,0,.6))}',

        '.banner-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:#f5f5f1;margin-bottom:.35em;text-shadow:0 3px 14px rgba(0,0,0,.7)}',

        '.banner-hero__meta{font-size:1.15em;color:#f5f5f1;margin-bottom:.6em;display:flex;gap:.8em;align-items:center;flex-wrap:wrap}',

        '.banner-hero__rate{padding:.1em .5em;border-radius:6px;font-weight:800;background:#1db954;color:#fff}',

        '.banner-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',

        '.interface-plus-logo-title{position:relative}',

        '.interface-plus-card-logo{display:block;width:auto;max-width:100%;max-height:105px;height:auto;object-fit:contain;object-position:left center;opacity:0;transition:opacity .25s ease;filter:drop-shadow(0 3px 10px rgba(0,0,0,.45));pointer-events:none}',

        '.interface-plus-card-logo.ready{opacity:1}',

        '.interface-plus-logo-title.interface-plus-logo-active{font-size:0!important;line-height:0!important}',

        '.interface-plus-logo-title.interface-plus-logo-active>.interface-plus-original-title{display:none!important}',

        '@media(max-width:480px){.interface-plus-card-logo{max-height:75px}.banner-hero__info{left:1.5em;width:75%}.banner-hero__logo{max-height:5em}}'
    ].join('\n');

    function injectStyle() {
        if (document.getElementById('banner-hero-style')) return;

        var style = document.createElement('style');
        style.id = 'banner-hero-style';
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    /* =========================
       HELPERS
    ========================= */

    function storageGet(name, fallback) {
        try {
            return Lampa.Storage.get(name, fallback);
        } catch (e) {
            return fallback;
        }
    }

    function enabled(name, fallback) {
        var value = storageGet(name, fallback);
        return value === true ||
            value === 'true' ||
            value === 1;
    }

    function isEnabled() {
        return enabled(SETTING, true);
    }

    function isCardLogoEnabled() {
        return enabled(CARD_LOGO_SETTING, true);
    }

    function mediaType(data) {
        if (!data) return 'movie';

        if (
            data.media_type === 'tv' ||
            data.type === 'tv' ||
            (data.name && !data.title)
        ) return 'tv';

        return 'movie';
    }

    function mediaKey(data) {
        return mediaType(data) + '_' + data.id;
    }

    function getElement(value) {
        if (!value) return null;
        if (value.nodeType === 1) return value;
        if (value[0] && value[0].nodeType === 1) return value[0];
        return null;
    }

    /* =========================
       APPLY FONT
    ========================= */

    function applyFont(fontKey) {
        var font = fonts[fontKey] || fonts.default;

        var oldStyle = document.getElementById('interface-plus-font-style');
        if (oldStyle) oldStyle.remove();

        var oldFace = document.getElementById('interface-plus-fontface');
        if (oldFace) oldFace.remove();

        if (font.url) {
            var face = document.createElement('style');
            face.id = 'interface-plus-fontface';

            if (font.url.indexOf('googleapis.com') !== -1) {
                face.textContent = '@import url("' + font.url + '");';
            } else {
                var name = font.family.split(',')[0].replace(/"/g, '');
                face.textContent =
                    '@font-face{font-family:"' + name +
                    '";src:url("' + font.url +
                    '") format("woff2");font-weight:400;font-style:normal}';
            }

            document.head.appendChild(face);
        }

        var style = document.createElement('style');
        style.id = 'interface-plus-font-style';
        style.textContent =
            'body,.body,*{font-family:' + font.family + '!important}';

        document.head.appendChild(style);
    }

    /* =========================
       SIZE
    ========================= */

    function updateSize() {
        var mobile = false;

        try {
            mobile = !!(
                Lampa.Platform &&
                Lampa.Platform.screen &&
                Lampa.Platform.screen('mobile')
            );
        } catch (e) {}

        var value = storageGet(SIZE_SETTING, '10.6');

        try {
            if (Lampa.Storage.field) {
                value = Lampa.Storage.field(SIZE_SETTING) || value;
            }
        } catch (e) {}

        var size = mobile ? 10.1 : parseFloat(value) || 10.6;

        if (
            document.body.getAttribute('data-banner-interface-size') ===
            String(size)
        ) return;

        document.body.setAttribute(
            'data-banner-interface-size',
            String(size)
        );

        document.body.style.fontSize = size + 'px';

        var count = size <= 9.6 ? 8 : size <= 11.1 ? 7 : 6;
        patchMaker(count);
    }

    function patchMaker(cardCount) {
        if (!Lampa.Maker || !Lampa.Maker.map) return;

        ['Line', 'Category'].forEach(function (type) {
            var item = Lampa.Maker.map(type);

            if (!item || !item.Items || !item.Items.onInit) return;

            if (item.Items.__bannerHeroPatched) {
                item.Items.__bannerHeroCardCount = cardCount;
                return;
            }

            var original = item.Items.onInit;

            item.Items.onInit = function () {
                original.apply(this, arguments);

                var count = item.Items.__bannerHeroCardCount || cardCount;

                if (type === 'Line') {
                    this.view = count;
                } else {
                    this.limit_view = count;
                }
            };

            item.Items.__bannerHeroPatched = true;
            item.Items.__bannerHeroCardCount = cardCount;
        });
    }

    /* =========================
       TMDB LOGO CACHE
    ========================= */

    function loadLogo(data, done) {
        if (!data || !data.id) {
            done('');
            return;
        }

        if (data.source && data.source !== 'tmdb') {
            done('');
            return;
        }

        var key = mediaKey(data);

        if (Object.prototype.hasOwnProperty.call(logos, key)) {
            done(logos[key]);
            return;
        }

        if (logoPending[key]) {
            logoPending[key].push(done);
            return;
        }

        if (!Lampa.TMDB || !Lampa.TMDB.api || !Lampa.TMDB.key) {
            done('');
            return;
        }

        logoPending[key] = [done];

        function finish(src) {
            logos[key] = src || '';

            var callbacks = logoPending[key] || [];
            delete logoPending[key];

            callbacks.forEach(function (callback) {
                try {
                    callback(logos[key]);
                } catch (e) {}
            });
        }

        var url;

        try {
            url = Lampa.TMDB.api(
                mediaType(data) +
                '/' +
                data.id +
                '/images?api_key=' +
                Lampa.TMDB.key() +
                '&include_image_language=uk,en,null'
            );
        } catch (e) {
            finish('');
            return;
        }

        try {
            var network = new Lampa.Reguest();

            network.silent(
                url,
                function (json) {
                    var list = json && Array.isArray(json.logos)
                        ? json.logos
                        : [];

                    var pick = null;

                    ['uk', 'en', null].some(function (lang) {
                        for (var i = 0; i < list.length; i++) {
                            if (
                                list[i].iso_639_1 === lang &&
                                list[i].file_path
                            ) {
                                pick = list[i];
                                return true;
                            }
                        }

                        return false;
                    });

                    if (!pick) {
                        finish('');
                        return;
                    }

                    var path = pick.file_path;

                    if (/\.svg$/i.test(path)) {
                        path = path.replace(/\.svg$/i, '.png');
                    }

                    var src = '';

                    try {
                        src = Lampa.TMDB.image('t/p/w500' + path);
                    } catch (e) {}

                    finish(src);
                },
                function () {
                    finish('');
                }
            );
        } catch (e) {
            finish('');
        }
    }

    /* =========================
       BACKDROP
    ========================= */

    function loadBackdrop(data, done) {
        if (!data || !data.id || !data.backdrop_path) {
            done('');
            return;
        }

        var key = mediaKey(data);

        if (Object.prototype.hasOwnProperty.call(backdrops, key)) {
            done(backdrops[key]);
            return;
        }

        if (backdropPending[key]) {
            backdropPending[key].push(done);
            return;
        }

        backdropPending[key] = [done];

        var src = Lampa.Api.img(data.backdrop_path, 'w1280');
        var img = new Image();

        function finish(value) {
            backdrops[key] = value;

            var callbacks = backdropPending[key] || [];
            delete backdropPending[key];

            callbacks.forEach(function (callback) {
                try {
                    callback(value);
                } catch (e) {}
            });
        }

        img.onload = function () {
            finish(src);
        };

        img.onerror = function () {
            finish('');
        };

        img.src = src;
    }

    /* =========================
       HERO
    ========================= */

    function cacheHeroElements(hero) {
        if (hero.__bannerElements) return;

        hero.__bannerElements = {
            bg: hero.querySelector('.banner-hero__bg'),
            logo: hero.querySelector('.banner-hero__logo'),
            title: hero.querySelector('.banner-hero__title'),
            meta: hero.querySelector('.banner-hero__meta'),
            descr: hero.querySelector('.banner-hero__descr')
        };
    }

    function heroFor(activity) {
        if (!activity) return null;

        if (
            activity.__bannerHero &&
            activity.contains(activity.__bannerHero)
        ) return activity.__bannerHero;

        var hero = activity.querySelector('.banner-hero');

        if (!hero) {
            hero = document.createElement('div');
            hero.className = 'banner-hero';

            hero.innerHTML =
                '<div class="banner-hero__bg"></div>' +
                '<div class="banner-hero__info">' +
                '<img class="banner-hero__logo" />' +
                '<div class="banner-hero__title"></div>' +
                '<div class="banner-hero__meta"></div>' +
                '<div class="banner-hero__descr"></div>' +
                '</div>';

            activity.insertBefore(hero, activity.firstChild);
        }

        activity.classList.add('banner-host');
        activity.__bannerHero = hero;

        cacheHeroElements(hero);

        return hero;
    }

    function showHero(hero, data) {
        if (!hero || !data) return;

        var id = mediaKey(data);

        if (hero.bannerId === id && hero.bannerData) return;

        cacheHeroElements(hero);

        var el = hero.__bannerElements;

        hero.bannerId = id;
        hero.bannerData = data;

        el.title.textContent = data.title || data.name || '';
        el.title.style.display = '';
        el.logo.style.display = 'none';
        el.logo.onload = null;
        el.logo.onerror = null;

        var meta = [];
        var vote = parseFloat(data.vote_average);

        if (vote) {
            meta.push(
                '<span class="banner-hero__rate">' +
                vote.toFixed(1) +
                '</span>'
            );
        }

        var year = String(
            data.release_date ||
            data.first_air_date ||
            ''
        ).slice(0, 4);

        if (year) {
            meta.push('<span>' + year + '</span>');
        }

        meta.push(
            '<span>' +
            (mediaType(data) === 'tv' ? 'Серіал' : 'Фільм') +
            '</span>'
        );

        el.meta.innerHTML = meta.join('');
        el.descr.textContent = data.overview || '';

        el.bg.classList.remove('show');

        loadBackdrop(data, function (src) {
            if (hero.bannerId !== id || !src) return;

            el.bg.style.backgroundImage = 'url("' + src + '")';

            requestAnimationFrame(function () {
                if (hero.bannerId === id) {
                    el.bg.classList.add('show');
                }
            });
        });

        loadLogo(data, function (src) {
            if (hero.bannerId !== id || !src) return;

            el.logo.onload = function () {
                if (hero.bannerId !== id) return;

                el.logo.style.display = 'block';
                el.title.style.display = 'none';
            };

            el.logo.onerror = function () {
                if (hero.bannerId !== id) return;

                el.logo.style.display = 'none';
                el.title.style.display = '';
            };

            el.logo.src = src;

            if (el.logo.complete && el.logo.naturalWidth) {
                el.logo.onload();
            }
        });
    }

    /* =========================
       FOCUS
    ========================= */

    function onCardFocus(e) {
        if (!isEnabled()) return;

        var card = e.target;

        if (!card || !card.closest) return;

        card = card.closest('.card');

        if (!card || !card.card_data) return;

        var data = card.card_data;

        if (!data.id) return;

        var activity = card.closest('.activity');

        if (
            !activity ||
            !activity.classList.contains('banner-host')
        ) return;

        var id = mediaKey(data);

        if (lastCardId === id && lastActivity === activity) return;

        clearTimeout(focusTimer);

        focusTimer = setTimeout(function () {
            lastCardId = id;
            lastActivity = activity;

            var hero = activity.__bannerHero || heroFor(activity);

            showHero(hero, data);
        }, 220);
    }

    function attach(object) {
        if (!isEnabled() || !object) return;

        if (
            ['main', 'category'].indexOf(object.component) < 0
        ) return;

        var render = null;

        try {
            render = object.activity &&
                object.activity.render &&
                object.activity.render(true);
        } catch (e) {}

        var el = getElement(render);

        if (el && el.classList) {
            heroFor(el);
        }
    }

    function apply() {
        var on = isEnabled();

        document.body.classList.toggle('banner-enabled', on);

        if (!on) {
            clearTimeout(focusTimer);
            lastCardId = null;
            lastActivity = null;
        } else {
            try {
                attach(Lampa.Activity.active());
            } catch (e) {}
        }
    }

    /* =========================
       FULL CARD DETECTION
    ========================= */

    function isFullCardActivity(object) {
        if (!object) return false;

        var component = String(
            object.component || ''
        ).toLowerCase();

        return (
            component === 'full' ||
            component === 'full_start' ||
            component === 'fullstart'
        );
    }

    function getActivityElement(object) {
        if (!object) return null;

        var render = null;

        try {
            if (object.activity && object.activity.render) {
                render = object.activity.render(true);
            }
        } catch (e) {}

        if (!render && object.render) {
            try {
                render = object.render(true);
            } catch (e) {}
        }

        return getElement(render);
    }

    function getCardData(object) {
        if (!object) return null;

        var candidates = [
            object.movie,
            object.data,
            object.card,
            object.card_data,
            object.params && object.params.movie,
            object.params && object.params.data,
            object.activity && object.activity.movie,
            object.activity && object.activity.data
        ];

        for (var i = 0; i < candidates.length; i++) {
            var item = candidates[i];

            if (
                item &&
                item.id &&
                (item.title || item.name)
            ) return item;
        }

        return null;
    }

    function findCardTitle(root) {
        if (!root || !root.querySelector) return null;

        return root.querySelector(CARD_SELECTORS);
    }

    /* =========================
       RESTORE TITLE
    ========================= */

    function restoreCardTitle(root) {
        if (!root || !root.querySelectorAll) return;

        var titles = root.querySelectorAll(
            '.interface-plus-logo-title'
        );

        for (var i = 0; i < titles.length; i++) {
            var title = titles[i];

            var logo = title.querySelector(
                '.interface-plus-card-logo'
            );

            if (logo) {
                logo.onload = null;
                logo.onerror = null;
                logo.remove();
            }

            var original = title.querySelector(
                '.interface-plus-original-title'
            );

            if (original) {
                while (original.firstChild) {
                    title.insertBefore(original.firstChild, original);
                }

                original.remove();
            }

            title.classList.remove(
                'interface-plus-logo-title',
                'interface-plus-logo-active'
            );

            title.removeAttribute(
                'data-interface-plus-logo-id'
            );
        }
    }

    /* =========================
       PREPARE TITLE
    ========================= */

    function prepareCardTitle(title, id) {
        if (!title) return null;

        var previous = title.getAttribute(
            'data-interface-plus-logo-id'
        );

        if (previous && previous !== id) {
            restoreCardTitle(title.parentNode || title);
        }

        var logo = title.querySelector(
            '.interface-plus-card-logo'
        );

        if (logo) return logo;

        title.classList.add('interface-plus-logo-title');

        var original = document.createElement('span');
        original.className = 'interface-plus-original-title';

        while (title.firstChild) {
            original.appendChild(title.firstChild);
        }

        title.appendChild(original);

        logo = document.createElement('img');
        logo.className = 'interface-plus-card-logo';
        logo.alt = '';
        logo.draggable = false;

        title.appendChild(logo);

        title.setAttribute(
            'data-interface-plus-logo-id',
            id
        );

        return logo;
    }

    /* =========================
       CARD LOGO ENGINE
    ========================= */

    function clearCardTimer() {
        if (cardState.timer) {
            clearTimeout(cardState.timer);
            cardState.timer = null;
        }
    }

    function stopCardObserver() {
        if (cardState.observer) {
            cardState.observer.disconnect();
            cardState.observer = null;
        }
    }

    function resetCardState(restore) {
        ++cardState.token;

        clearCardTimer();
        stopCardObserver();

        if (restore && cardState.root) {
            restoreCardTitle(cardState.root);
        }

        cardState.data = null;
        cardState.root = null;
        cardState.key = '';
        cardState.attempts = 0;
        cardState.image = null;
        cardState.imageSource = '';
        cardState.ready = false;
    }

    function isCurrentCard(token, key) {
        return (
            token === cardState.token &&
            key === cardState.key &&
            isCardLogoEnabled() &&
            cardState.root &&
            cardState.root.isConnected
        );
    }

    function displayCardLogo(title, logo, src, token, key) {
        if (!isCurrentCard(token, key)) return;

        if (!title.isConnected || !logo.isConnected) return;

        if (
            title.getAttribute('data-interface-plus-logo-id') !== key
        ) return;

        if (
            logo.classList.contains('ready') &&
            logo.getAttribute('src') === src
        ) {
            cardState.ready = true;
            return;
        }

        logo.onload = function () {
            if (!isCurrentCard(token, key)) return;

            if (!title.isConnected || !logo.isConnected) return;

            title.classList.add('interface-plus-logo-active');

            requestAnimationFrame(function () {
                if (!isCurrentCard(token, key)) return;

                logo.classList.add('ready');
                cardState.ready = true;
            });
        };

        logo.onerror = function () {
            if (!isCurrentCard(token, key)) return;

            title.classList.remove(
                'interface-plus-logo-active'
            );

            logo.classList.remove('ready');
        };

        if (logo.getAttribute('src') !== src) {
            logo.src = src;
        }

        if (logo.complete && logo.naturalWidth > 0) {
            logo.onload();
        }
    }

    function applyLoadedLogo(token, key, src) {
        if (!isCurrentCard(token, key) || !src) return;

        var root = cardState.root;
        var title = findCardTitle(root);

        if (!title) {
            scheduleCardCheck(token, key, 80);
            return;
        }

        var logo = prepareCardTitle(title, key);

        if (!logo) return;

        displayCardLogo(title, logo, src, token, key);
    }

    function preloadCardLogo(data, token, key) {
        loadLogo(data, function (src) {
            if (!isCurrentCard(token, key)) return;

            if (!src) return;

            cardState.imageSource = src;

            var image = new Image();
            cardState.image = image;

            image.onload = function () {
                if (!isCurrentCard(token, key)) return;

                applyLoadedLogo(token, key, src);
            };

            image.onerror = function () {
                if (!isCurrentCard(token, key)) return;

                cardState.imageSource = '';
            };

            image.src = src;

            if (image.complete && image.naturalWidth > 0) {
                image.onload();
            }
        });
    }

    /* =========================
       WAIT FOR CARD DOM
    ========================= */

    function scheduleCardCheck(token, key, delay) {
        if (!isCurrentCard(token, key)) return;

        clearCardTimer();

        cardState.timer = setTimeout(function () {
            cardState.timer = null;
            checkCardReady(token, key);
        }, delay || 50);
    }

    function checkCardReady(token, key) {
        if (!isCurrentCard(token, key)) return;

        var root = cardState.root;
        var title = findCardTitle(root);

        if (title) {
            if (cardState.imageSource) {
                applyLoadedLogo(
                    token,
                    key,
                    cardState.imageSource
                );
            }

            return;
        }

        cardState.attempts++;

        if (cardState.attempts <= 20) {
            scheduleCardCheck(token, key, 100);
        }
    }

    /* =========================
       WATCH CARD RENDERING
    ========================= */

    function observeCard(root, token, key) {
        if (!window.MutationObserver || !root) return;

        stopCardObserver();

        var observer = new MutationObserver(function (mutations) {
            if (!isCurrentCard(token, key)) return;

            var relevant = false;

            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];

                if (mutation.type !== 'childList') continue;

                var target = mutation.target;

                if (
                    target.nodeType === 1 &&
                    target.closest &&
                    target.closest('.interface-plus-logo-title')
                ) {
                    continue;
                }

                for (var j = 0; j < mutation.addedNodes.length; j++) {
                    var node = mutation.addedNodes[j];

                    if (node.nodeType !== 1) continue;

                    if (
                        node.classList &&
                        (
                            node.classList.contains(
                                'interface-plus-card-logo'
                            ) ||
                            node.classList.contains(
                                'interface-plus-original-title'
                            )
                        )
                    ) continue;

                    relevant = true;
                    break;
                }

                if (relevant) break;
            }

            if (!relevant) return;

            if (cardState.ready) {
                var title = findCardTitle(cardState.root);

                if (
                    title &&
                    title.classList.contains(
                        'interface-plus-logo-active'
                    ) &&
                    title.querySelector(
                        '.interface-plus-card-logo.ready'
                    )
                ) return;

                cardState.ready = false;
            }

            scheduleCardCheck(token, key, 35);
        });

        observer.observe(root, {
            childList: true,
            subtree: true
        });

        cardState.observer = observer;
    }

    /* =========================
       START CARD LOGO
    ========================= */

    function startCardLogo(object) {
        if (!isCardLogoEnabled()) return;
        if (!isFullCardActivity(object)) return;

        var data = getCardData(object);
        var root = getActivityElement(object);

        if (!data || !root) return;

        var key = mediaKey(data);

        if (
            cardState.key === key &&
            cardState.root === root
        ) {
            if (cardState.imageSource) {
                applyLoadedLogo(
                    cardState.token,
                    key,
                    cardState.imageSource
                );
            }

            return;
        }

        resetCardState(false);

        cardState.data = data;
        cardState.root = root;
        cardState.key = key;
        cardState.attempts = 0;

        var token = cardState.token;

        observeCard(root, token, key);

        preloadCardLogo(data, token, key);

        checkCardReady(token, key);
    }

    function refreshCardLogo() {
        if (!isCardLogoEnabled()) {
            resetCardState(true);
            return;
        }

        try {
            var active = Lampa.Activity.active();

            if (isFullCardActivity(active)) {
                startCardLogo(active);
            }
        } catch (e) {}
    }

    /* =========================
       SETTINGS
    ========================= */

    function registerSettings() {
        if (!Lampa.SettingsApi) return;

        Lampa.SettingsApi.addComponent({
            component: 'interface_plus_settings',
            name: lang_data.banner_settings_name,
            icon:
                '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">' +
                '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 5h2v5h-2z"/>' +
                '</svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_plus_settings',
            param: {
                name: SETTING,
                type: 'trigger',
                default: true
            },
            field: {
                name: lang_data.banner_enable_name,
                description: lang_data.banner_enable_descr
            },
            onChange: apply
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_plus_settings',
            param: {
                name: CARD_LOGO_SETTING,
                type: 'trigger',
                default: true
            },
            field: {
                name: lang_data.card_logo_name,
                description: lang_data.card_logo_descr
            },
            onChange: refreshCardLogo
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_plus_settings',
            param: {
                name: SIZE_SETTING,
                type: 'select',
                values: Lampa.Params.values[SIZE_SETTING],
                default: '10.6'
            },
            field: {
                name: 'Розмір інтерфейсу',
                description: 'Виберіть бажаний масштаб елементів інтерфейсу'
            },
            onChange: updateSize
        });

        Lampa.SettingsApi.addParam({
            component: 'interface_plus_settings',
            param: {
                name: FONT_SETTING,
                type: 'select',
                values: {
                    default: lang_data.font_default,
                    netflix: lang_data.font_netflix,
                    montserrat: lang_data.font_montserrat,
                    inter: lang_data.font_inter,
                    nunito: lang_data.font_nunito
                },
                default: 'default'
            },
            field: {
                name: lang_data.font_setting_name,
                description: lang_data.font_setting_descr
            },
            onChange: function (value) {
                applyFont(value);
            }
        });
    }

    /* =========================
       INIT
    ========================= */

    function init() {
        if (initialized) return;
        if (!window.Lampa || !Lampa.Storage) return;

        initialized = true;

        if (Lampa.Lang) {
            Lampa.Lang.add(lang_data);
        }

        if (Lampa.Params) {
            if (!Lampa.Params.values) {
                Lampa.Params.values = {};
            }

            Lampa.Params.values[SIZE_SETTING] = {
                '09.1': lang_data.settings_param_interface_size_mini,
                '09.6': lang_data.settings_param_interface_size_very_small,
                '10.1': lang_data.settings_param_interface_size_small,
                '10.6': lang_data.settings_param_interface_size_medium
            };

            if (Lampa.Params.select) {
                Lampa.Params.select(
                    SIZE_SETTING,
                    Lampa.Params.values[SIZE_SETTING],
                    '10.6'
                );
            }
        }

        injectStyle();
        apply();
        updateSize();

        applyFont(storageGet(FONT_SETTING, 'default'));

        document.addEventListener(
            'hover:focus',
            onCardFocus,
            true
        );

        if (Lampa.Listener) {
            Lampa.Listener.follow('activity', function (e) {
                if (!e) return;

                if (e.type === 'start') {
                    requestAnimationFrame(function () {
                        attach(e.object);

                        if (isFullCardActivity(e.object)) {
                            startCardLogo(e.object);
                        } else {
                            resetCardState(false);
                        }
                    });
                }

                if (e.type === 'destroy') {
                    if (isFullCardActivity(e.object)) {
                        resetCardState(false);
                    }
                }
            });
        }

        if (Lampa.Activity && Lampa.Activity.active) {
            requestAnimationFrame(function () {
                var active = Lampa.Activity.active();

                attach(active);

                if (isFullCardActivity(active)) {
                    startCardLogo(active);
                }
            });
        }

        registerSettings();

        if (
            Lampa.Storage &&
            Lampa.Storage.listener &&
            Lampa.Storage.listener.follow
        ) {
            Lampa.Storage.listener.follow('change', function (e) {
                if (!e || !e.name) return;

                if (e.name === SIZE_SETTING) {
                    updateSize();
                }

                if (e.name === SETTING) {
                    apply();
                }

                if (e.name === FONT_SETTING) {
                    applyFont(e.value);
                }

                if (e.name === CARD_LOGO_SETTING) {
                    refreshCardLogo();
                }
            });
        }

        console.log(
            '[INTERFACE+] Version ' + VERSION + ' initialized'
        );
    }

    /* =========================
       START
    ========================= */

    function start() {
        setTimeout(init, 500);
    }

    if (window.appready) {
        start();
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                start();
            }
        });
    }

})();
