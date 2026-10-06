(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    /* =========================================================
       INTERFACE+ PREMIUM OPTIMIZED
       Збережено:
       - логотипи TMDB
       - вибір мови
       - вибір якості
       - висота логотипа
       - CSS / JS animation
       - приховування метаінформації
       - logo by text height
       - captions toggle
       - logo cache
       - Smart TV
       - preload
       - background
       - старий API Lampa
       - новий API Lampa
       ========================================================= */

    markSmartTV();

    /* =========================================================
       SMART TV
       ========================================================= */

    function markSmartTV() {
        try {
            var ua = navigator && navigator.userAgent ? navigator.userAgent : '';
            var isTv = false;

            if (Lampa.Platform) {
                try {
                    if (typeof Lampa.Platform.is === 'function') {
                        isTv =
                            Lampa.Platform.is('tv') ||
                            Lampa.Platform.is('smarttv') ||
                            Lampa.Platform.is('tizen') ||
                            Lampa.Platform.is('webos') ||
                            Lampa.Platform.is('netcast');
                    }

                    if (typeof Lampa.Platform.tv === 'function') {
                        isTv = isTv || !!Lampa.Platform.tv();
                    }

                    if (typeof Lampa.Platform.device === 'string') {
                        isTv = isTv || /tv|tizen|webos|netcast|smart/i.test(Lampa.Platform.device);
                    }
                } catch (e) {}
            }

            if (!isTv) {
                isTv = /SMART-TV|SmartTV|HbbTV|NetCast|Tizen|Web0S|WebOS|Viera|BRAVIA|Android TV|AFTB|AFTT|AFTM|Fire TV/i.test(ua);
            }

            if (isTv && document.documentElement) {
                document.documentElement.classList.add('is-smarttv');
            }
        } catch (e) {}
    }

    /* =========================================================
       CONSTANTS
       ========================================================= */

    var LOGO_CACHE_PREFIX = 'logo_cache_width_based_v3_';
    var DETAIL_CACHE_LIMIT = 80;

    /* =========================================================
       HELPERS
       ========================================================= */

    function storageGet(key, fallback) {
        try {
            return Lampa.Storage.get(key, fallback);
        } catch (e) {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            Lampa.Storage.set(key, value);
        } catch (e) {}
    }

    function applyLogoCssVars() {
        try {
            var h = storageGet('logo_height', '') || '';
            var root = document.documentElement;

            if (h) {
                root.style.setProperty('--ni-logo-max-h', h);
            } else {
                root.style.removeProperty('--ni-logo-max-h');
            }
        } catch (e) {}
    }

    function applyCaptionsClass(container) {
        try {
            if (!container) return;

            var show = !!storageGet('ni_card_captions', true);

            container.classList.toggle('ni-hide-captions', !show);
        } catch (e) {}
    }

    function applyCaptionsToAll() {
        try {
            var list = document.querySelectorAll('.new-interface');

            for (var i = 0; i < list.length; i++) {
                applyCaptionsClass(list[i]);
            }
        } catch (e) {}
    }

    /* =========================================================
       SETTINGS
       ========================================================= */

    function initInterface2Settings() {
        if (window.__ni_interface2_settings_ready) return;

        if (!Lampa.SettingsApi || typeof Lampa.SettingsApi.addParam !== 'function') {
            setTimeout(initInterface2Settings, 300);
            return;
        }

        window.__ni_interface2_settings_ready = true;

        var add = function (cfg) {
            try {
                Lampa.SettingsApi.addParam(cfg);
            } catch (e) {}
        };

        if (typeof Lampa.SettingsApi.addComponent === 'function') {
            Lampa.SettingsApi.addComponent({
                component: 'interface_plus',
                name: 'Інтерфейс+',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>'
            });
        }

        add({
            component: 'interface_plus',
            param: {
                name: 'interface2_header_group',
                type: 'title',
                default: ''
            },
            field: {
                name: 'Кастомний інтерфейс головної сторінки',
                description: 'Налаштування дизайну, логотипів та метаінформації'
            }
        });

        add({
            component: 'interface_plus',
            param: {
                name: 'logo_glav',
                type: 'select',
                values: {
                    1: 'Приховати',
                    0: 'Відображати'
                },
                default: '0'
            },
            field: {
                name: 'Логотипи замість назв',
                description: 'Відображає логотипи фільмів замість тексту'
            },
            onChange: applyLogoCssVars
        });

        add({
            component: 'interface_plus',
            param: {
                name: 'logo_lang',
                type: 'select',
                values: {
                    '': 'Як в Lampa',
                    uk: 'Українська',
                    en: 'English',
                    be: 'Білоруська',
                    kz: 'Қазақша',
                    pt: 'Português',
                    es: 'Español',
                    fr: 'Français',
                    de: 'Deutsch',
                    it: 'Italiano'
                },
                default: ''
            },
            field: {
                name: 'Мова логотипа',
                description: 'Пріоритетна мова для пошуку логотипа'
            }
        });

        add({
            component: 'interface_plus',
            param: {
                name: 'logo_size',
                type: 'select',
                values: {
                    w300: 'w300',
                    w500: 'w500',
                    w780: 'w780',
                    original: 'Оригінал'
                },
                default: 'original'
            },
            field: {
                name: 'Розмір логотипа',
                description: 'Роздільна здатність завантажуваного зображення'
            }
        });

        add({
            component: 'interface_plus',
            param: {
                name: 'logo_height',
                type: 'select',
                values: {
                    '': 'Авто (як в темі)',
                    '2.5em': '2.5em',
                    '3em': '3em',
                    '3.5em': '3.5em',
                    '4em': '4em',
                    '5em': '5em',
                    '6em': '6em',
                    '7em': '7em',
                    '8em': '8em',
                    '10vh': '10vh'
                },
                default: ''
            },
            field: {
                name: 'Висота логотипів',
                description: 'Максимальна висота логотипів'
            },
            onChange: applyLogoCssVars
        });

        add({
            component: 'interface_plus',
            param: {
                name: 'logo_animation_type',
                type: 'select',
                values: {
                    js: 'JavaScript',
                    css: 'CSS'
                },
                default: 'css'
            },
            field: {
                name: 'Тип анімації логотипів',
                description: 'Спосіб анімації логотипів'
            }
        });

        add({
            component: 'interface_plus',
            param: {
                name: 'logo_hide_year',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Приховати метаінформацію',
                description: 'Приховує дублюючий рік та жанри під логотипом'
            }
        });

        add({
            component: 'interface_plus',
            param: {
                name: 'logo_use_text_height',
                type: 'trigger',
                default: false
            },
            field: {
                name: 'Логотип за висотою тексту',
                description: 'Розмір логотипа залежить від висоти назви'
            }
        });

        add({
            component: 'interface_plus',
            param: {
                name: 'ni_card_captions',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Підписи під картками',
                description: 'Показувати / приховувати назви під постерами'
            },
            onChange: applyCaptionsToAll
        });

        add({
            component: 'interface_plus',
            param: {
                name: 'logo_clear_cache',
                type: 'button'
            },
            field: {
                name: 'Скинути кеш логотипів',
                description: 'Очистити кеш завантажених логотипів'
            },
            onChange: function () {
                Lampa.Select.show({
                    title: 'Скинути кеш?',
                    items: [
                        {
                            title: 'Так',
                            confirm: true
                        },
                        {
                            title: 'Ні'
                        }
                    ],
                    onSelect: function (e) {
                        if (e.confirm) {
                            try {
                                var keys = [];

                                for (var i = 0; i < localStorage.length; i++) {
                                    var key = localStorage.key(i);

                                    if (key && key.indexOf(LOGO_CACHE_PREFIX) !== -1) {
                                        keys.push(key);
                                    }
                                }

                                keys.forEach(function (key) {
                                    localStorage.removeItem(key);
                                });
                            } catch (err) {}

                            window.location.reload();
                        } else {
                            Lampa.Controller.toggle('settings_component');
                        }
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('settings_component');
                    }
                });
            }
        });

        applyLogoCssVars();
        applyCaptionsToAll();
    }

    setTimeout(initInterface2Settings, 500);

    /* =========================================================
       ANIMATION
       ========================================================= */

    function animateOpacity(el, from, to, duration, done) {
        if (!el) {
            if (done) done();
            return;
        }

        var start = 0;

        function step(ts) {
            if (!start) start = ts;

            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);

            el.style.opacity = from + (to - from) * eased;

            if (progress < 1) {
                el.__ni_animation_frame = requestAnimationFrame(step);
            } else {
                el.__ni_animation_frame = null;
                if (done) done();
            }
        }

        if (el.__ni_animation_frame) {
            cancelAnimationFrame(el.__ni_animation_frame);
        }

        el.__ni_animation_frame = requestAnimationFrame(step);
    }

    /* =========================================================
       LOGO ENGINE
       ========================================================= */

    class LogoEngine {
        constructor() {
            this.pending = {};
        }

        enabled() {
            return String(storageGet('logo_glav', '0')) !== '1';
        }

        lang() {
            var forced = String(storageGet('logo_lang', '') || '');
            var base = forced || String(storageGet('language', 'en') || 'en');

            return (base.split('-')[0] || 'en').toLowerCase();
        }

        size() {
            return String(storageGet('logo_size', 'original') || 'original');
        }

        animationType() {
            return String(storageGet('logo_animation_type', 'css') || 'css');
        }

        useTextHeight() {
            return !!storageGet('logo_use_text_height', false);
        }

        cacheKey(type, id, lang) {
            return LOGO_CACHE_PREFIX + type + '_' + id + '_' + lang;
        }

        flush(key, value) {
            var list = this.pending[key] || [];

            delete this.pending[key];

            for (var i = 0; i < list.length; i++) {
                try {
                    if (list[i]) list[i](value);
                } catch (e) {}
            }
        }

        resolveFromImages(item, lang) {
            try {
                if (!item || !item.images || !Array.isArray(item.images.logos)) {
                    return null;
                }

                var logos = item.images.logos;

                if (!logos.length) return null;

                var pick = function (iso) {
                    for (var i = 0; i < logos.length; i++) {
                        if (logos[i] && logos[i].iso_639_1 === iso) {
                            return logos[i].file_path;
                        }
                    }

                    return null;
                };

                return pick(lang) ||
                    pick('en') ||
                    (logos[0] && logos[0].file_path) ||
                    null;
            } catch (e) {
                return null;
            }
        }

        buildUrl(filePath) {
            if (!filePath) return null;

            var normalized = String(filePath).replace('.svg', '.png');

            return Lampa.TMDB.image('/t/p/' + this.size() + normalized);
        }

        getLogoUrl(item, cb) {
            try {
                if (!item || !item.id) {
                    if (cb) cb(null);
                    return;
                }

                var source = item.source || 'tmdb';

                if (source !== 'tmdb' && source !== 'cub') {
                    if (cb) cb(null);
                    return;
                }

                if (!Lampa.TMDB ||
                    typeof Lampa.TMDB.api !== 'function' ||
                    typeof Lampa.TMDB.key !== 'function') {
                    if (cb) cb(null);
                    return;
                }

                var type =
                    item.media_type === 'tv' || item.name
                        ? 'tv'
                        : 'movie';

                var lang = this.lang();
                var key = this.cacheKey(type, item.id, lang);

                var cached = null;

                try {
                    cached = localStorage.getItem(key);
                } catch (e) {}

                if (cached) {
                    if (cached === 'none') {
                        if (cb) cb(null);
                    } else {
                        if (cb) cb(cached);
                    }

                    return;
                }

                var direct = this.resolveFromImages(item, lang);

                if (direct) {
                    var directUrl = this.buildUrl(direct);

                    if (directUrl) {
                        try {
                            localStorage.setItem(key, directUrl);
                        } catch (e) {}

                        if (cb) cb(directUrl);
                        return;
                    }
                }

                if (this.pending[key]) {
                    this.pending[key].push(cb);
                    return;
                }

                this.pending[key] = [cb];

                if (typeof $ === 'undefined' || !$.get) {
                    try {
                        localStorage.setItem(key, 'none');
                    } catch (e) {}

                    this.flush(key, null);
                    return;
                }

                var url = Lampa.TMDB.api(
                    type +
                    '/' +
                    item.id +
                    '/images?api_key=' +
                    Lampa.TMDB.key() +
                    '&include_image_language=' +
                    lang +
                    ',en,null'
                );

                $.get(url, function (res) {
                    try {
                        var filePath = null;

                        if (res && Array.isArray(res.logos)) {
                            var logos = res.logos;

                            for (var i = 0; i < logos.length; i++) {
                                if (logos[i] && logos[i].iso_639_1 === lang) {
                                    filePath = logos[i].file_path;
                                    break;
                                }
                            }

                            if (!filePath) {
                                for (var j = 0; j < logos.length; j++) {
                                    if (logos[j] && logos[j].iso_639_1 === 'en') {
                                        filePath = logos[j].file_path;
                                        break;
                                    }
                                }
                            }

                            if (!filePath && logos.length) {
                                filePath = logos[0] && logos[0].file_path;
                            }
                        }

                        if (filePath) {
                            var result = this.buildUrl(filePath);

                            try {
                                localStorage.setItem(key, result || 'none');
                            } catch (e) {}

                            this.flush(key, result);
                        } else {
                            try {
                                localStorage.setItem(key, 'none');
                            } catch (e) {}

                            this.flush(key, null);
                        }
                    } catch (err) {
                        try {
                            localStorage.setItem(key, 'none');
                        } catch (e) {}

                        this.flush(key, null);
                    }
                }.bind(this)).fail(function () {
                    try {
                        localStorage.setItem(key, 'none');
                    } catch (e) {}

                    this.flush(key, null);
                }.bind(this));

            } catch (e) {
                if (cb) cb(null);
            }
        }

        setImageSizing(img, heightPx) {
            if (!img) return;

            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.maxWidth = '100%';
            img.style.objectFit = 'contain';
            img.style.objectPosition = 'left center';

            var logoHeight = storageGet('logo_height', '');

            if (logoHeight) {
                img.style.maxHeight = logoHeight;
                img.style.setProperty('max-height', logoHeight, 'important');
            } else {
                img.style.maxHeight = '95px';
                img.style.setProperty('max-height', '95px', 'important');
            }

            if (this.useTextHeight() && heightPx > 0 && !logoHeight) {
                var scaled = Math.min(heightPx * 1.08, 95);

                img.style.height = scaled + 'px';
                img.style.maxHeight = scaled + 'px';
            }
        }

        swapContent(container, newNode) {
            if (!container) return;

            var type = this.animationType();

            if (container.__ni_logo_timer) {
                clearTimeout(container.__ni_logo_timer);
                container.__ni_logo_timer = null;
            }

            if (container.__ni_animation_frame) {
                cancelAnimationFrame(container.__ni_animation_frame);
                container.__ni_animation_frame = null;
            }

            if (type === 'js') {
                animateOpacity(container, 1, 0, 110, function () {
                    container.innerHTML = '';

                    if (typeof newNode === 'string') {
                        container.textContent = newNode;
                    } else {
                        container.appendChild(newNode);
                    }

                    animateOpacity(container, 0, 1, 160);
                });
            } else {
                container.style.transition = 'opacity .12s ease';
                container.style.opacity = '0';

                container.__ni_logo_timer = setTimeout(function () {
                    container.__ni_logo_timer = null;

                    container.innerHTML = '';

                    if (typeof newNode === 'string') {
                        container.textContent = newNode;
                    } else {
                        container.appendChild(newNode);
                    }

                    requestAnimationFrame(function () {
                        container.style.transition = 'opacity .18s ease';
                        container.style.opacity = '1';
                    });
                }, 65);
            }
        }

        syncFullHead(container, logoActive) {
            try {
                if (!container || typeof container.find !== 'function') return;

                var headNode = container.find('.full-start-new__head');
                var detailsNode = container.find('.full-start-new__details');

                if (!headNode.length || !detailsNode.length) return;

                var headEl = headNode[0];
                var detailsEl = detailsNode[0];

                if (!headEl || !detailsEl) return;

                var moved = detailsEl.querySelector('.logo-moved-head');
                var movedSep = detailsEl.querySelector('.logo-moved-separator');

                var wantMove =
                    !!logoActive &&
                    !!storageGet('logo_hide_year', true);

                if (!wantMove) {
                    if (moved && moved.parentNode) {
                        moved.parentNode.removeChild(moved);
                    }

                    if (movedSep && movedSep.parentNode) {
                        movedSep.parentNode.removeChild(movedSep);
                    }

                    headEl.style.display = '';
                    return;
                }

                if (moved) {
                    headEl.style.display = 'none';
                    return;
                }

                var html = (headEl.innerHTML || '').trim();

                if (!html) return;

                var headSpan = document.createElement('span');
                headSpan.className = 'logo-moved-head';
                headSpan.innerHTML = html;

                var sep = document.createElement('span');
                sep.className = 'full-start-new__split logo-moved-separator';
                sep.textContent = '●';

                detailsEl.appendChild(sep);
                detailsEl.appendChild(headSpan);

                headEl.style.display = 'none';
            } catch (e) {}
        }

        applyToFull(activity, item) {
            try {
                if (!activity || !activity.render || !item) return;

                var container = activity.render();

                if (!container || !container.find) return;

                var titleNode = container.find(
                    '.full-start-new__title, .full-start__title'
                );

                if (!titleNode.length) return;

                var titleEl = titleNode[0];

                var titleText = String(
                    item.title ||
                    item.name ||
                    item.original_title ||
                    item.original_name ||
                    ''
                ).trim();

                if (!titleText) {
                    titleText = titleNode.text();
                }

                if (!titleEl.__ni_full_title_text) {
                    titleEl.__ni_full_title_text = titleText;
                }

                var originalText = titleEl.__ni_full_title_text;

                if (!this.enabled()) {
                    this.syncFullHead(container, false);

                    var oldLogo =
                        titleEl.querySelector &&
                        titleEl.querySelector('img.new-interface-full-logo');

                    if (oldLogo) {
                        this.swapContent(titleEl, originalText);
                    } else if (titleNode.text() !== originalText) {
                        titleNode.text(originalText);
                    }

                    return;
                }

                if (titleNode.text() !== originalText) {
                    titleNode.text(originalText);
                }

                var textHeight =
                    titleEl.getBoundingClientRect
                        ? Math.round(titleEl.getBoundingClientRect().height)
                        : 0;

                var requestId =
                    (titleEl.__ni_logo_req_id || 0) + 1;

                titleEl.__ni_logo_req_id = requestId;

                this.getLogoUrl(item, function (url) {
                    if (titleEl.__ni_logo_req_id !== requestId) return;
                    if (!titleEl.isConnected) return;

                    if (!url) {
                        this.syncFullHead(container, false);

                        var current =
                            titleEl.querySelector &&
                            titleEl.querySelector('img.new-interface-full-logo');

                        if (current) {
                            this.swapContent(titleEl, originalText);
                        }

                        return;
                    }

                    var img = new Image();

                    img.className = 'new-interface-full-logo';
                    img.alt = originalText;

                    this.setImageSizing(img, textHeight);

                    img.onload = function () {
                        if (titleEl.__ni_logo_req_id !== requestId) return;

                        this.syncFullHead(container, true);
                        this.swapContent(titleEl, img);
                    }.bind(this);

                    img.src = url;
                }.bind(this));

            } catch (e) {}
        }
    }

    var Logo = new LogoEngine();

    /* =========================================================
       META
       ========================================================= */

    function formatMeta(movie) {
        try {
            var parts = [];

            if (movie.production_countries &&
                movie.production_countries.length) {
                parts.push(movie.production_countries[0].name);
            } else if (movie.origin_country &&
                       movie.origin_country.length) {
                parts.push(movie.origin_country[0]);
            }

            var date =
                movie.release_date ||
                movie.first_air_date ||
                '';

            if (date) {
                var year = date.split('-')[0];

                if (year) parts.push(year);
            }

            if (movie.number_of_seasons) {
                parts.push(
                    movie.number_of_seasons +
                    ' сезон' +
                    (movie.number_of_seasons > 1 ? 'и' : '')
                );
            } else if (movie.runtime) {
                var hours = Math.floor(movie.runtime / 60);
                var minutes = movie.runtime % 60;

                parts.push(
                    hours > 0
                        ? hours + ' год ' + minutes + ' хв'
                        : minutes + ' хв'
                );
            }

            if (Array.isArray(movie.genres) &&
                movie.genres.length) {
                var genres = movie.genres
                    .slice(0, 2)
                    .map(function (g) {
                        return g.name;
                    })
                    .join(', ');

                if (genres) parts.push(genres);
            }

            return parts.join(' • ');
        } catch (e) {
            return '';
        }
    }

    /* =========================================================
       INFO TITLE
       ========================================================= */

    function applyInfoTitleLogo(
        wrapper,
        titleNode,
        headNode,
        movie,
        titleText
    ) {
        try {
            if (!titleNode || !titleNode.length) return;

            var titleEl = titleNode[0];

            if (!titleEl) return;

            var reqId =
                (titleEl.__ni_logo_req_id || 0) + 1;

            titleEl.__ni_logo_req_id = reqId;

            var descNode =
                wrapper.find('.new-interface-info__description');

            var overviewText =
                movie.overview ||
                movie.description ||
                '';

            if (descNode.length) {
                descNode.text(overviewText);
                descNode.toggle(!!overviewText);
            }

            var hideHead =
                !!storageGet('logo_hide_year', true);

            if (headNode && headNode.length) {
                if (hideHead) {
                    headNode
                        .css('display', 'none')
                        .text('');
                } else {
                    var metaText = formatMeta(movie);

                    headNode
                        .text(metaText)
                        .css(
                            'display',
                            metaText ? '' : 'none'
                        );
                }
            }

            if (!Logo.enabled()) {
                if (titleEl.querySelector &&
                    titleEl.querySelector('img')) {
                    Logo.swapContent(
                        titleEl,
                        titleText
                    );
                } else {
                    titleNode.text(titleText);
                }

                return;
            }

            titleNode.text(titleText);

            var textHeight =
                titleEl.getBoundingClientRect
                    ? Math.round(
                        titleEl.getBoundingClientRect().height
                    )
                    : 0;

            Logo.getLogoUrl(movie, function (url) {
                if (titleEl.__ni_logo_req_id !== reqId) return;
                if (!titleEl.isConnected) return;

                if (!url) {
                    if (titleEl.querySelector &&
                        titleEl.querySelector('img')) {
                        Logo.swapContent(
                            titleEl,
                            titleText
                        );
                    } else {
                        titleNode.text(titleText);
                    }

                    return;
                }

                var img = new Image();

                img.className =
                    'new-interface-info__title-logo';

                img.alt = titleText;

                Logo.setImageSizing(
                    img,
                    textHeight
                );

                img.onload = function () {
                    if (titleEl.__ni_logo_req_id !== reqId) return;

                    Logo.swapContent(
                        titleEl,
                        img
                    );
                };

                img.src = url;
            });

        } catch (e) {}
    }

    /* =========================================================
       FULL TITLE HOOK
       ========================================================= */

    function hookFullTitleLogos() {
        if (window.__ni_interface2_full_logo_hooked) return;

        window.__ni_interface2_full_logo_hooked = true;

        if (!Lampa.Listener ||
            typeof Lampa.Listener.follow !== 'function') {
            return;
        }

        Lampa.Listener.follow('full', function (e) {
            try {
                if (!e || e.type !== 'complite') return;
                if (!e.object || !e.object.activity) return;

                var data =
                    e.data &&
                    (e.data.movie || e.data)
                        ? (e.data.movie || e.data)
                        : null;

                if (!data) return;

                Logo.applyToFull(
                    e.object.activity,
                    data
                );
            } catch (err) {}
        });
    }

    hookFullTitleLogos();

    /* =========================================================
       MAIN INTERFACE
       ========================================================= */

    function startPluginV3() {
        if (!Lampa.Maker ||
            !Lampa.Maker.map ||
            !Lampa.Utils) {
            return;
        }

        if (window.plugin_interface_ready_v3) return;

        window.plugin_interface_ready_v3 = true;

        addStyleV3();

        var mainMap = Lampa.Maker.map('Main');

        if (!mainMap ||
            !mainMap.Items ||
            !mainMap.Create) {
            return;
        }

        wrap(
            mainMap.Items,
            'onInit',
            function (original, args) {
                if (original) {
                    original.apply(this, args);
                }

                this.__newInterfaceEnabled =
                    shouldUseNewInterface(
                        this && this.object
                    );
            }
        );

        wrap(
            mainMap.Create,
            'onCreate',
            function (original, args) {
                if (original) {
                    original.apply(this, args);
                }

                if (!this.__newInterfaceEnabled) return;

                ensureState(this).attach();
            }
        );

        wrap(
            mainMap.Create,
            'onCreateAndAppend',
            function (original, args) {
                var element =
                    args && args[0];

                if (this.__newInterfaceEnabled &&
                    element) {
                    prepareLineData(element);
                }

                return original
                    ? original.apply(this, args)
                    : undefined;
            }
        );

        wrap(
            mainMap.Items,
            'onAppend',
            function (original, args) {
                if (original) {
                    original.apply(this, args);
                }

                if (!this.__newInterfaceEnabled) return;

                var item = args && args[0];
                var element = args && args[1];

                if (item && element) {
                    attachLineHandlers(
                        this,
                        item,
                        element
                    );
                }
            }
        );

        wrap(
            mainMap.Items,
            'onDestroy',
            function (original, args) {
                if (this.__newInterfaceState) {
                    this.__newInterfaceState.destroy();
                    delete this.__newInterfaceState;
                }

                delete this.__newInterfaceEnabled;

                if (original) {
                    original.apply(this, args);
                }
            }
        );
    }

    function shouldUseNewInterface(object) {
        if (!object) return false;

        if (object.source === 'other' &&
            !object.backdrop_path) {
            return false;
        }

        return true;
    }

    /* =========================================================
       STATE
       ========================================================= */

    function ensureState(main) {
        if (main.__newInterfaceState) {
            return main.__newInterfaceState;
        }

        var state =
            createInterfaceState(main);

        main.__newInterfaceState = state;

        return state;
    }

    function createInterfaceState(main) {
        var info = new InterfaceInfo();

        info.create();

        var background =
            document.createElement('img');

        background.className =
            'full-start__background';

        var state = {
            main: main,
            info: info,
            background: background,
            infoElement: null,

            backgroundTimer: null,
            backgroundLast: '',
            backgroundRequest: 0,

            attached: false,
            lastDataId: null,

            updateFrame: null,

            attach: function () {
                if (this.attached) return;

                var container =
                    main.render(true);

                if (!container) return;

                container.classList.add(
                    'new-interface'
                );

                applyCaptionsClass(
                    container
                );

                if (!background.parentElement) {
                    container.insertBefore(
                        background,
                        container.firstChild || null
                    );
                }

                var infoNode =
                    info.render(true);

                this.infoElement =
                    infoNode;

                if (infoNode &&
                    infoNode.parentNode !== container) {

                    if (background.parentElement === container) {
                        container.insertBefore(
                            infoNode,
                            background.nextSibling
                        );
                    } else {
                        container.insertBefore(
                            infoNode,
                            container.firstChild || null
                        );
                    }
                }

                if (main.scroll &&
                    typeof main.scroll.minus === 'function') {
                    main.scroll.minus(infoNode);
                }

                this.attached = true;
            },

            update: function (data) {
                if (!data) return;

                var id =
                    data.id +
                    '_' +
                    (data.media_type || '');

                if (this.lastDataId === id) return;

                this.lastDataId = id;

                if (this.updateFrame) {
                    cancelAnimationFrame(
                        this.updateFrame
                    );
                }

                this.updateFrame =
                    requestAnimationFrame(
                        function () {
                            this.updateFrame = null;

                            info.update(data);
                            this.updateBackground(data);
                        }.bind(this)
                    );
            },

            updateBackground: function (data) {
                var path =
                    data &&
                    data.backdrop_path
                        ? Lampa.Api.img(
                            data.backdrop_path,
                            'w1280'
                        )
                        : '';

                if (!path ||
                    path === this.backgroundLast) {
                    return;
                }

                clearTimeout(
                    this.backgroundTimer
                );

                var requestId =
                    ++this.backgroundRequest;

                this.backgroundTimer =
                    setTimeout(
                        function () {
                            if (
                                requestId !==
                                this.backgroundRequest
                            ) {
                                return;
                            }

                            var preload =
                                new Image();

                            preload.onload =
                                function () {
                                    if (
                                        requestId !==
                                        this.backgroundRequest
                                    ) {
                                        return;
                                    }

                                    background.classList.remove(
                                        'loaded'
                                    );

                                    background.src =
                                        path;

                                    requestAnimationFrame(
                                        function () {
                                            background.classList.add(
                                                'loaded'
                                            );
                                        }
                                    );

                                    this.backgroundLast =
                                        path;
                                }.bind(this);

                            preload.onerror =
                                function () {};

                            preload.src = path;
                        }.bind(this),
                        220
                    );
            },

            reset: function () {
                this.lastDataId = null;
                info.empty();
            },

            destroy: function () {
                clearTimeout(
                    this.backgroundTimer
                );

                if (this.updateFrame) {
                    cancelAnimationFrame(
                        this.updateFrame
                    );
                }

                info.destroy();

                var container =
                    main.render(true);

                if (container) {
                    container.classList.remove(
                        'new-interface'
                    );
                }

                if (this.infoElement &&
                    this.infoElement.parentNode) {
                    this.infoElement.parentNode.removeChild(
                        this.infoElement
                    );
                }

                if (background &&
                    background.parentNode) {
                    background.parentNode.removeChild(
                        background
                    );
                }

                this.attached = false;
                this.lastDataId = null;
            }
        };

        return state;
    }

    function prepareLineData(element) {
        return;
    }

    /* =========================================================
       CARDS
       ========================================================= */

    function decorateCard(state, card) {
        if (!card ||
            card.__newInterfaceCard ||
            typeof card.use !== 'function' ||
            !card.data) {
            return;
        }

        card.__newInterfaceCard = true;

        card.params = card.params || {};
        card.params.style =
            card.params.style || {};

        card.use({
            onFocus: function () {
                state.update(card.data);
            },

            onHover: function () {
                state.update(card.data);
            },

            onTouch: function () {
                state.update(card.data);
            },

            onDestroy: function () {
                delete card.__newInterfaceCard;
            }
        });
    }

    function getCardData(
        card,
        element,
        index
    ) {
        if (card && card.data) {
            return card.data;
        }

        if (element &&
            Array.isArray(element.results)) {
            return (
                element.results[index] ||
                element.results[0]
            );
        }

        return null;
    }

    function getDomCardData(node) {
        if (!node) return null;

        var current =
            node.jquery
                ? node[0]
                : node;

        while (
            current &&
            !current.card_data
        ) {
            current =
                current.parentNode;
        }

        return current &&
            current.card_data
                ? current.card_data
                : null;
    }

    function getFocusedCardData(line) {
        var container =
            line &&
            typeof line.render === 'function'
                ? line.render(true)
                : null;

        if (!container ||
            !container.querySelector) {
            return null;
        }

        var focus =
            container.querySelector(
                '.selector.focus'
            ) ||
            container.querySelector(
                '.focus'
            );

        return getDomCardData(focus);
    }

    function attachLineHandlers(
        main,
        line,
        element
    ) {
        if (line.__newInterfaceLine) return;

        line.__newInterfaceLine = true;

        var state =
            ensureState(main);

        var applyToCard =
            function (card) {
                decorateCard(
                    state,
                    card
                );
            };

        if (element &&
            Array.isArray(element.results)) {

            var preloadCount =
                Math.min(
                    element.results.length,
                    5
                );

            for (
                var i = 0;
                i < preloadCount;
                i++
            ) {
                state.info.load(
                    element.results[i],
                    {
                        preload: true
                    }
                );
            }
        }

        line.use({
            onInstance: function (card) {
                applyToCard(card);
            },

            onActive: function (
                card,
                itemData
            ) {
                var current =
                    getCardData(
                        card,
                        itemData
                    );

                if (current) {
                    state.update(current);
                }
            },

            onToggle: function () {
                setTimeout(
                    function () {
                        var domData =
                            getFocusedCardData(
                                line
                            );

                        if (domData) {
                            state.update(
                                domData
                            );
                        }
                    },
                    24
                );
            },

            onMore: function () {
                state.reset();
            },

            onDestroy: function () {
                state.reset();
                delete line.__newInterfaceLine;
            }
        });

        if (
            Array.isArray(line.items) &&
            line.items.length
        ) {
            line.items.forEach(
                applyToCard
            );

            try {
                var firstData =
                    getCardData(
                        line.items[0],
                        element,
                        0
                    );

                if (firstData) {
                    state.update(
                        firstData
                    );
                }
            } catch (e) {}
        }

        if (line.last) {
            var lastData =
                getDomCardData(
                    line.last
                );

            if (lastData) {
                state.update(
                    lastData
                );
            }
        }
    }

    /* =========================================================
       WRAPPER
       ========================================================= */

    function wrap(
        target,
        method,
        handler
    ) {
        if (!target) return;

        var original =
            typeof target[method] === 'function'
                ? target[method]
                : null;

        target[method] =
            function () {
                var args =
                    Array.prototype.slice.call(
                        arguments
                    );

                return handler.call(
                    this,
                    original,
                    args
                );
            };
    }

    /* =========================================================
       PREMIUM CSS
       ========================================================= */

    function addStyleV3() {
        if (addStyleV3.added) return;

        addStyleV3.added = true;

        Lampa.Template.add(
            'new_interface_style_v3',
            `<style>

.new-interface{
    position:relative;
    overflow:visible;
    --ni-card-w:clamp(105px,14vw,150px);
    --ni-radius:10px;
}

/* ===============================
   CARDS
   =============================== */

.new-interface .card--small,
.new-interface .card-more{
    width:var(--ni-card-w)!important;
}

.new-interface .card-more__box{
    padding-bottom:150%;
}

.new-interface .card{
    contain:layout paint;
}

.new-interface .card__view{
    border-radius:var(--ni-radius);
    overflow:hidden;
    transform:translateZ(0);
    backface-visibility:hidden;
    transition:
        transform .22s cubic-bezier(.22,.61,.36,1),
        filter .22s ease;
}

body.advanced--animation:not(.no--animation)
.new-interface .card.focus .card__view,

body.advanced--animation:not(.no--animation)
.new-interface .card--small.focus .card__view{
    animation:none!important;
    transform:scale(1.035) translateZ(0);
    filter:brightness(1.08);
}

/* ===============================
   INFO AREA
   =============================== */

.new-interface-info{
    position:relative;
    padding:1.3em 2.6em .9em 2.6em;
    height:auto!important;
    min-height:43vh!important;
    max-height:49vh!important;
    overflow:hidden!important;
    z-index:3;
    display:flex!important;
    flex-direction:column!important;
    justify-content:flex-end!important;
    box-sizing:border-box;
    background:transparent!important;
    contain:layout style;
}

.new-interface-info:before{
    display:none!important;
}

.new-interface-info__body{
    position:relative;
    z-index:4;
    width:100%;
    max-width:850px;
    display:flex!important;
    flex-direction:column!important;
    justify-content:flex-end!important;
    box-sizing:border-box;
}

.new-interface-info__left{
    width:100%;
    max-width:850px;
    display:flex;
    flex-direction:column;
    align-items:flex-start;
    justify-content:flex-end;
}

.new-interface-info__head{
    color:rgba(255,255,255,.72);
    margin:.45em 0 .35em;
    font-size:.9em;
    font-weight:400;
    letter-spacing:.45px;
    line-height:1.25;
    text-shadow:0 2px 7px rgba(0,0,0,.85);
    order:2;
    opacity:.9;
}

.new-interface-info__head span{
    color:#fff;
}

.new-interface-info__title{
    font-size:clamp(2rem,3vw,2.8em);
    font-weight:600;
    margin:0;
    display:flex;
    align-items:center;
    max-width:100%;
    min-height:1.1em;
    line-height:1.05;
    order:1;
    contain:layout;
}

.new-interface-info__title-logo{
    max-width:min(430px,45vw)!important;
    max-height:var(--ni-logo-max-h,95px)!important;
    width:auto!important;
    height:auto!important;
    object-fit:contain!important;
    object-position:left center!important;
    display:block;
    filter:
        drop-shadow(0 2px 5px rgba(0,0,0,.65))
        drop-shadow(0 7px 18px rgba(0,0,0,.28));
    transform:translateZ(0);
}

.new-interface-info__description{
    font-size:.93em;
    font-weight:300;
    line-height:1.42;
    color:rgba(255,255,255,.84);
    text-shadow:0 2px 7px rgba(0,0,0,.9);
    overflow:hidden;
    text-overflow:ellipsis;
    display:-webkit-box;
    -webkit-line-clamp:2;
    line-clamp:2;
    -webkit-box-orient:vertical;
    max-width:min(760px,82vw);
    margin-top:.35em;
    order:3;
}

/* ===============================
   BACKGROUND
   =============================== */

.new-interface .full-start__background{
    height:112%;
    top:-7%;
    opacity:0;
    transition:opacity .55s ease;
    object-fit:cover;
    object-position:center top;
    transform:translateZ(0);
    backface-visibility:hidden;

    mask-image:
        linear-gradient(
            180deg,
            rgba(0,0,0,1) 42%,
            rgba(0,0,0,.92) 63%,
            rgba(0,0,0,.55) 76%,
            rgba(0,0,0,0) 94%
        );

    -webkit-mask-image:
        linear-gradient(
            180deg,
            rgba(0,0,0,1) 42%,
            rgba(0,0,0,.92) 63%,
            rgba(0,0,0,.55) 76%,
            rgba(0,0,0,0) 94%
        );
}

.new-interface .full-start__background.loaded{
    opacity:1;
}

.new-interface:after{
    content:'';
    position:absolute;
    left:0;
    right:0;
    top:0;
    height:70%;
    z-index:2;
    pointer-events:none;

    background:
        linear-gradient(
            90deg,
            rgba(0,0,0,.30) 0%,
            rgba(0,0,0,.04) 55%,
            rgba(0,0,0,0) 100%
        );
}

.new-interface:before{
    content:'';
    position:absolute;
    left:0;
    right:0;
    bottom:0;
    height:45%;
    z-index:2;
    pointer-events:none;

    background:
        linear-gradient(
            180deg,
            rgba(10,10,10,0) 0%,
            rgba(10,10,10,.52) 45%,
            rgba(10,10,10,.96) 100%
        );
}

/* ===============================
   FULL CARD LOGO
   =============================== */

.new-interface-full-logo{
    max-height:var(--ni-logo-max-h,110px)!important;
    width:auto!important;
    height:auto!important;
    max-width:100%!important;
    object-fit:contain!important;
    object-position:left center!important;
    display:block;
    filter:drop-shadow(0 3px 10px rgba(0,0,0,.7));
}

/* ===============================
   HIDE CAPTIONS
   =============================== */

.new-interface.ni-hide-captions
.card__view ~ .card__title,

.new-interface.ni-hide-captions
.card__view ~ .card__name,

.new-interface.ni-hide-captions
.card__view ~ .card__text,

.new-interface.ni-hide-captions
.card__view ~ .card__details,

.new-interface.ni-hide-captions
.card__view ~ .card__subtitle,

.new-interface.ni-hide-captions
.card__view ~ .card__year,

.new-interface.ni-hide-captions
.card__bottom,

.new-interface.ni-hide-captions
.card__caption{
    display:none!important;
}

/* ===============================
   ROWS
   =============================== */

.new-interface .items-line{
    margin-top:.35em;
    position:relative;
    z-index:4;
}

/* ===============================
   MOBILE
   =============================== */

@media(max-width:767px){

    .new-interface-info{
        padding:1em 1.15em .55em;
        min-height:39vh!important;
        max-height:47vh!important;
    }

    .new-interface-info__title{
        font-size:1.8rem;
    }

    .new-interface-info__title-logo{
        max-width:min(235px,62vw)!important;
        max-height:58px!important;
    }

    .new-interface-info__description{
        font-size:.84em;
        max-width:92vw;
        -webkit-line-clamp:2;
        line-clamp:2;
    }

    .new-interface-info__head{
        font-size:.78em;
    }

    .new-interface{
        --ni-card-w:clamp(92px,25vw,125px);
    }

    .new-interface .full-start__background{
        height:105%;
        top:-3%;
    }
}

/* ===============================
   SMALL TV
   =============================== */

@media(min-width:768px) and (max-width:1280px){

    .new-interface-info{
        padding-left:2em;
        padding-right:2em;
    }

    .new-interface-info__body,
    .new-interface-info__left{
        max-width:720px;
    }
}

/* ===============================
   REDUCE MOTION
   =============================== */

@media(prefers-reduced-motion:reduce){

    .new-interface .card__view,
    .new-interface .full-start__background{
        transition:none!important;
        animation:none!important;
    }
}

</style>`
        );

        $('body').append(
            Lampa.Template.get(
                'new_interface_style_v3',
                {},
                true
            )
        );
    }

    /* =========================================================
       INTERFACE INFO
       ========================================================= */

    class InterfaceInfo {
        constructor() {
            this.html = null;
            this.timer = null;
            this.network = new Lampa.Reguest();
            this.loaded = {};
            this.currentUrl = null;
            this.currentId = null;
        }

        create() {
            if (this.html) return;

            this.html = $(`
                <div class="new-interface-info">
                    <div class="new-interface-info__body">
                        <div class="new-interface-info__left">
                            <div class="new-interface-info__title"></div>
                            <div class="new-interface-info__head"></div>
                            <div class="new-interface-info__description"></div>
                        </div>
                    </div>
                </div>
            `);
        }

        render(js) {
            if (!this.html) {
                this.create();
            }

            return js
                ? this.html[0]
                : this.html;
        }

        update(data) {
            if (!data) return;

            try {
                Lampa.Background.change(
                    Lampa.Utils.cardImgBackground(data)
                );
            } catch (e) {}

            this.load(data);
        }

        load(data, options) {
            if (!data || !data.id) return;

            var source =
                data.source || 'tmdb';

            if (
                source !== 'tmdb' &&
                source !== 'cub'
            ) {
                return;
            }

            if (
                !Lampa.TMDB ||
                typeof Lampa.TMDB.api !== 'function' ||
                typeof Lampa.TMDB.key !== 'function'
            ) {
                return;
            }

            var preload =
                options &&
                options.preload;

            var type =
                data.media_type === 'tv' ||
                data.name
                    ? 'tv'
                    : 'movie';

            var language =
                storageGet(
                    'language',
                    'en'
                ) || 'en';

            var shortLang =
                String(language)
                    .split('-')[0];

            var url =
                Lampa.TMDB.api(
                    type +
                    '/' +
                    data.id +
                    '?api_key=' +
                    Lampa.TMDB.key() +
                    '&append_to_response=content_ratings,release_dates,images' +
                    '&include_image_language=' +
                    shortLang +
                    ',en,null' +
                    '&language=' +
                    language
                );

            if (this.loaded[url]) {
                if (!preload) {
                    this.draw(
                        this.loaded[url]
                    );
                }

                return;
            }

            if (
                !preload &&
                this.currentUrl === url
            ) {
                return;
            }

            if (!preload) {
                this.currentUrl = url;
                this.currentId = data.id;
            }

            clearTimeout(this.timer);

            this.timer = setTimeout(
                function () {
                    if (!preload) {
                        this.network.clear();
                    }

                    this.network.timeout(5000);

                    this.network.silent(
                        url,
                        function (movie) {
                            if (!movie) return;

                            this.loaded[url] =
                                movie;

                            this.cleanupCache();

                            if (
                                !preload &&
                                this.currentUrl === url
                            ) {
                                this.draw(movie);
                            }
                        }.bind(this)
                    );
                }.bind(this),
                preload ? 120 : 0
            );
        }

        cleanupCache() {
            try {
                var keys =
                    Object.keys(
                        this.loaded
                    );

                if (
                    keys.length <=
                    DETAIL_CACHE_LIMIT
                ) {
                    return;
                }

                var remove =
                    keys.length -
                    DETAIL_CACHE_LIMIT;

                for (
                    var i = 0;
                    i < remove;
                    i++
                ) {
                    delete this.loaded[
                        keys[i]
                    ];
                }
            } catch (e) {}
        }

        draw(movie) {
            if (!movie || !this.html) return;

            var titleNode =
                this.html.find(
                    '.new-interface-info__title'
                );

            var headNode =
                this.html.find(
                    '.new-interface-info__head'
                );

            var titleText =
                movie.title ||
                movie.name ||
                '';

            titleNode.text(
                titleText
            );

            applyInfoTitleLogo(
                this.html,
                titleNode,
                headNode,
                movie,
                titleText
            );
        }

        empty() {
            if (!this.html) return;

            this.html
                .find(
                    '.new-interface-info__head'
                )
                .text('');

            this.html
                .find(
                    '.new-interface-info__description'
                )
                .text('');
        }

        destroy() {
            clearTimeout(
                this.timer
            );

            this.network.clear();

            this.loaded = {};
            this.currentUrl = null;
            this.currentId = null;

            if (this.html) {
                this.html.remove();
                this.html = null;
            }
        }
    }

    /* =========================================================
       START
       ========================================================= */

    if (
        Lampa.Manifest &&
        Lampa.Manifest.app_digital >= 300
    ) {
        startPluginV3();
        return;
    }

    /* =========================================================
       LEGACY
       ========================================================= */

    function startPlugin() {
        if (window.plugin_interface_ready) {
            return;
        }

        window.plugin_interface_ready = true;

        var old_interface =
            Lampa.InteractionMain;

        var new_interface =
            component;

        Lampa.InteractionMain =
            function (object) {
                var use =
                    new_interface;

                if (
                    !(
                        object.source === 'tmdb' ||
                        object.source === 'cub'
                    )
                ) {
                    use = old_info;
                }

                if (
                    Lampa.Manifest.app_digital < 153
                ) {
                    use = old_interface;
                }

                return new use(object);
            };
    }

    if (
        !window.plugin_interface_ready &&
        !window.plugin_interface_ready_v3
    ) {
        startPlugin();
    }

})();
