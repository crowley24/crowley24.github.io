(function () {  
    'use strict';  
  
    if (typeof Lampa === 'undefined') return;  
  
    markSmartTV();  
  
    function markSmartTV() {  
        try {  
            var ua = (navigator && navigator.userAgent) ? navigator.userAgent : '';  
            var isTv = false;  
  
            if (typeof Lampa !== 'undefined' && Lampa.Platform) {  
                try {  
                    if (typeof Lampa.Platform.is === 'function') {  
                        isTv = isTv || Lampa.Platform.is('tv') || Lampa.Platform.is('smarttv') || Lampa.Platform.is('tizen') || Lampa.Platform.is('webos') || Lampa.Platform.is('netcast');  
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
                isTv = /(SMART-TV|SmartTV|HbbTV|NetCast|Tizen|Web0S|WebOS|Viera|BRAVIA|Android TV|AFTB|AFTT|AFTM|Fire TV)/i.test(ua);  
            }  
  
            if (isTv && document && document.documentElement) {  
                document.documentElement.classList.add('is-smarttv');  
            }  
        } catch (e) {}  
    }  
  
    const LOGO_CACHE_PREFIX = 'logo_cache_width_based_v1_';  
  
    function applyLogoCssVars() {  
        try {  
            const h = (Lampa.Storage && typeof Lampa.Storage.get === 'function') ? (Lampa.Storage.get('logo_height', '') || '') : '';  
            const root = document.documentElement;  
  
            if (h) root.style.setProperty('--ni-logo-max-h', h);  
            else root.style.removeProperty('--ni-logo-max-h');  
        } catch (e) { }  
    }  
  
    function applyCaptionsClass(container) {  
        try {  
            if (!container) return;  
            const show = !!Lampa.Storage.get('ni_card_captions', true);  
            container.classList.toggle('ni-hide-captions', !show);  
        } catch (e) { }  
    }  
  
    function applyCaptionsToAll() {  
        try {  
            document.querySelectorAll('.new-interface').forEach((el) => applyCaptionsClass(el));  
        } catch (e) { }  
    }  
  
    function initInterface2Settings() {  
        if (window.__ni_interface2_settings_ready) return;  
        window.__ni_interface2_settings_ready = true;  
  
        if (!Lampa.SettingsApi || typeof Lampa.SettingsApi.addParam !== 'function') return;  
  
        const add = (cfg) => { try { Lampa.SettingsApi.addParam(cfg); } catch (e) { } };  
  
        add({  
            component: 'interface',  
            param: { name: 'logo_glav', type: 'select', values: { 1: 'Приховати', 0: 'Відображати' }, default: '0' },  
            field: { name: 'Логотипи замість назв', description: 'Відображає логотипи фільмів замість тексту' },  
            onChange: applyLogoCssVars  
        });  
  
        add({  
            component: 'interface',  
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
                default: 'uk'  
            },  
            field: { name: 'Мова логотипа', description: 'Пріоритетна мова для пошуку логотипа' }  
        });  
  
        add({  
            component: 'interface',  
            param: { name: 'logo_size', type: 'select', values: { w300: 'w300', w500: 'w500', w780: 'w780', original: 'Оригінал' }, default: 'original' },  
            field: { name: 'Розмір логотипа', description: 'Роздільна здатність завантажуваного зображення' }  
        });  
  
        add({  
            component: 'interface',  
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
            field: { name: 'Висота логотипів', description: 'Максимальна висота логотипів (в інфо-блоці та в повній картці)' },  
            onChange: applyLogoCssVars  
        });  
  
        add({  
            component: 'interface',  
            param: { name: 'logo_animation_type', type: 'select', values: { js: 'JavaScript', css: 'CSS' }, default: 'css' },  
            field: { name: 'Тип анімації логотипів', description: 'Спосіб анімації логотипів' }  
        });  
  
        add({  
            component: 'interface',  
            param: { name: 'logo_hide_year', type: 'trigger', default: !0 },  
            field: { name: 'Приховати рік і країну', description: 'Приховує інформацію над логотипом' }  
        });  
  
        add({  
            component: 'interface',  
            param: { name: 'logo_use_text_height', type: 'trigger', default: !1 },  
            field: { name: 'Логотип за висотою тексту', description: 'Розмір логотипа дорівнює висоті тексту' }  
        });  
  
        add({  
            component: 'interface',  
            param: { name: 'ni_card_captions', type: 'trigger', default: !0 },  
            field: { name: 'Підписи під карточками', description: 'Показувати текст під карточками' },  
            onChange: applyCaptionsToAll  
        });  
  
        add({  
            component: 'interface',  
            param: { name: 'logo_clear_cache', type: 'button', default: !1 },  
            field: { name: 'Очистити кеш логотипів', description: 'Видаляє всі збережені логотипи' },  
            onChange: () => {  
                try {  
                    const keys = [];  
                    for (let i = 0; i < localStorage.length; i++) {  
                        const key = localStorage.key(i);  
                        if (key && key.indexOf(LOGO_CACHE_PREFIX) === 0) keys.push(key);  
                    }  
                    keys.forEach(key => localStorage.removeItem(key));  
                    Lampa.Noty.show('Кеш логотипів очищено');  
                } catch (e) {}  
            }  
        });  
    }  
  
    class LogoEngine {  
        constructor() {  
            this.pending = {};  
        }  
  
        enabled() {  
            return Lampa.Storage.get('logo_glav', '0') === '0';  
        }  
  
        lang() {  
            return Lampa.Storage.get('logo_lang', '') || (Lampa.Storage.get('language') || 'en').split('-')[0];  
        }  
  
        size() {  
            return Lampa.Storage.get('logo_size', 'original');  
        }  
  
        animationType() {  
            return Lampa.Storage.get('logo_animation_type', 'css');  
        }  
  
        useTextHeight() {  
            return !!Lampa.Storage.get('logo_use_text_height', !1);  
        }  
  
        cacheKey(item, lang, size) {  
            const type = item.media_type === 'tv' || item.name ? 'tv' : 'movie';  
            return LOGO_CACHE_PREFIX + type + '_' + item.id + '_' + (lang || this.lang()) + '_' + (size || this.size());  
        }  
  
        flush(key, url) {  
            const callbacks = this.pending[key] || [];  
            delete this.pending[key];  
            callbacks.forEach(cb => {  
                if (cb) cb(url);  
            });  
        }  
  
        getLogoUrl(item, cb) {  
            if (!item || !item.id) {  
                if (cb) cb(null);  
                return;  
            }  
  
            const source = item.source || 'tmdb';  
            if (source !== 'tmdb' && source !== 'cub') {  
                if (cb) cb(null);  
                return;  
            }  
  
            const lang = this.lang();  
            const size = this.size();  
            const key = this.cacheKey(item, lang, size);  
  
            const cached = localStorage.getItem(key);  
            if (cached) {  
                if (cached === 'none') {  
                    if (cb) cb(null);  
                } else {  
                    if (cb) cb(cached);  
                }  
                return;  
            }  
  
            if (this.pending[key]) {  
                this.pending[key].push(cb);  
                return;  
            }  
  
            this.pending[key] = [cb];  
  
            try {  
                const type = item.media_type === 'tv' || item.name ? 'tv' : 'movie';  
                const url = Lampa.TMDB.api(`${type}/${item.id}/images?api_key=${Lampa.TMDB.key()}&include_image_language=${lang},en,null`);  
  
                if (typeof $ === 'undefined' || !$.get) {  
                    localStorage.setItem(key, 'none');  
                    this.flush(key, null);  
                    return;  
                }  
  
                $.get(url, (res) => {  
                    let filePath = null;  
  
                    if (res && Array.isArray(res.logos) && res.logos.length) {  
                        for (let i = 0; i < res.logos.length; i++) {  
                            if (res.logos[i] && res.logos[i].iso_639_1 === lang) { filePath = res.logos[i].file_path; break; }  
                        }  
                        if (!filePath) {  
                            for (let i = 0; i < res.logos.length; i++) {  
                                if (res.logos[i] && res.logos[i].iso_639_1 === 'en') { filePath = res.logos[i].file_path; break; }  
                            }  
                        }  
                        if (!filePath) filePath = res.logos[0] && res.logos[0].file_path;  
                    }  
  
                    if (filePath) {  
                        const size = this.size();  
                        const normalized = (filePath + '').replace('.svg', '.png');  
                        const logoUrl = Lampa.TMDB.image('/t/p/' + size + normalized);  
                        localStorage.setItem(key, logoUrl);  
                        this.flush(key, logoUrl);  
                    } else {  
                        localStorage.setItem(key, 'none');  
                        this.flush(key, null);  
                    }  
                }).fail(() => {  
                    localStorage.setItem(key, 'none');  
                    this.flush(key, null);  
                });  
            } catch (e) {  
                if (cb) cb(null);  
            }  
        }  
  
        setImageSizing(img, heightPx) {  
            if (!img) return;  
  
            img.style.height = '';  
            img.style.width = '';  
            img.style.maxHeight = '';  
            img.style.maxWidth = '';  
            img.style.objectFit = 'contain';  
            img.style.objectPosition = 'left bottom';  
  
            if (this.useTextHeight() && heightPx && heightPx > 0 && !(Lampa.Storage.get('logo_height', '') || '')) {  
                img.style.height = `${heightPx}px`;  
                img.style.width = 'auto';  
                img.style.maxWidth = '100%';  
                img.style.maxHeight = 'none';  
            }  
        }  
  
        swapContent(container, newNode) {  
            if (!container) return;  
            const type = this.animationType();  
  
            if (container.__ni_logo_timer) {  
                clearTimeout(container.__ni_logo_timer);  
                container.__ni_logo_timer = null;  
            }  
  
            if (type === 'js') {  
                container.style.transition = 'none';  
                animateOpacity(container, 1, 0, 300, () => {  
                    container.innerHTML = '';  
                    if (typeof newNode === 'string') container.textContent = newNode;  
                    else container.appendChild(newNode);  
                    container.style.opacity = '0';  
                    animateOpacity(container, 0, 1, 400);  
                });  
            } else {  
                container.style.transition = 'opacity 0.3s ease';  
                container.style.opacity = '0';  
                container.__ni_logo_timer = setTimeout(() => {  
                    container.__ni_logo_timer = null;  
                    container.innerHTML = '';  
                    if (typeof newNode === 'string') container.textContent = newNode;  
                    else container.appendChild(newNode);  
                    container.style.transition = 'opacity 0.4s ease';  
                    container.style.opacity = '1';  
                }, 150);  
            }  
        }  
  
        syncFullHead(container, logoActive) {  
            try {  
                if (!container || typeof container.find !== 'function') return;  
  
                const headNode = container.find('.full-start-new__head');  
                const detailsNode = container.find('.full-start-new__details');  
  
                if (!headNode || !headNode.length || !detailsNode || !detailsNode.length) return;  
  
                const headEl = headNode[0];  
                const detailsEl = detailsNode[0];  
  
                if (!headEl || !detailsEl) return;  
  
                const moved = detailsEl.querySelector ? detailsEl.querySelector('.logo-moved-head') : null;  
                const movedSep = detailsEl.querySelector ? detailsEl.querySelector('.logo-moved-separator') : null;  
  
                const wantMove = !!logoActive && !!Lampa.Storage.get('logo_hide_year', !0);  
  
                if (!wantMove) {  
                    if (moved && moved.parentNode) moved.parentNode.removeChild(moved);  
                    if (movedSep && movedSep.parentNode) movedSep.parentNode.removeChild(movedSep);  
  
                    headEl.style.display = '';  
                    headEl.style.opacity = '';  
                    headEl.style.transition = '';  
                    return;  
                }  
  
                if (moved) {  
                    headEl.style.display = 'none';  
                    return;  
                }  
  
                const html = (headEl.innerHTML || '').trim();  
                if (!html) return;  
  
                const headSpan = document.createElement('span');  
                headSpan.className = 'logo-moved-head';  
                headSpan.innerHTML = html;  
  
                const sep = document.createElement('span');  
                sep.className = 'full-start-new__split logo-moved-separator';  
                sep.textContent = '●';  
  
                if (detailsEl.children && detailsEl.children.length > 0) detailsEl.appendChild(sep);  
                detailsEl.appendChild(headSpan);  
  
                headEl.style.display = 'none';  
            } catch (e) { }  
        }  
  
        applyToFull(activity, item) {  
            try {  
                if (!activity || typeof activity.render !== 'function' || !item) return;  
  
                const container = activity.render();  
                if (!container || typeof container.find !== 'function') return;  
  
                const titleNode = container.find('.full-start-new__title, .full-start__title');  
                if (!titleNode || !titleNode.length) return;  
  
                const titleEl = titleNode[0];  
                const titleText = ((item.title || item.name || item.original_title || item.original_name || '') + '').trim() || (titleNode.text() + '');  
  
                if (!titleEl.__ni_full_title_text) titleEl.__ni_full_title_text = titleText;  
                const originalText = titleEl.__ni_full_title_text || titleText;  
  
                if (!this.enabled()) {  
                    this.syncFullHead(container, false);  
                    const existImg = titleEl.querySelector && titleEl.querySelector('img.new-interface-full-logo');  
                    if (existImg) this.swapContent(titleEl, originalText);  
                    else if (titleNode.text() !== originalText) titleNode.text(originalText);  
                    return;  
                }  
  
                if (titleNode.text() !== originalText) titleNode.text(originalText);  
                const textHeightPx = titleEl.getBoundingClientRect ? Math.round(titleEl.getBoundingClientRect().height) : 0;  
  
                const requestId = (titleEl.__ni_logo_req_id || 0) + 1;  
                titleEl.__ni_logo_req_id = requestId;  
  
                this.getLogoUrl(item, (url) => {  
                    if (titleEl.__ni_logo_req_id !== requestId) return;  
                    if (!titleEl.isConnected) return;  
  
                    if (!url) {  
                        this.syncFullHead(container, false);  
                        if (titleEl.querySelector && titleEl.querySelector('img.new-interface-full-logo')) this.swapContent(titleEl, originalText);  
                        else if (titleNode.text() !== originalText) titleNode.text(originalText);  
                        return;  
                    }  
  
                    const img = new Image();  
                    img.className = 'new-interface-full-logo';  
  img.alt = originalText;  
                    img.src = url;  
  
                    this.setImageSizing(img, textHeightPx);  
                    this.syncFullHead(container, true);  
  
                    this.swapContent(titleEl, img);  
                });  
            } catch (e) { }  
        }  
    }  
  
    const Logo = new LogoEngine();  
    initInterface2Settings();  
  
    function applyInfoTitleLogo(wrapper, titleNode, headNode, movie, titleText) {  
        try {  
            if (!titleNode || !titleNode.length) return;  
            const titleEl = titleNode[0];  
            if (!titleEl) return;  
  
            const reqId = (titleEl.__ni_logo_req_id || 0) + 1;  
            titleEl.__ni_logo_req_id = reqId;  
  
            if (!Logo.enabled()) {  
                if (headNode && headNode.length) headNode.css('display', '');  
                if (wrapper && wrapper.removeClass) wrapper.removeClass('ni-hide-head');  
                if (titleEl.querySelector && titleEl.querySelector('img')) Logo.swapContent(titleEl, titleText);  
                else titleNode.text(titleText);  
                return;  
            }  
  
            titleNode.text(titleText);  
            const textHeightPx = titleEl.getBoundingClientRect ? Math.round(titleEl.getBoundingClientRect().height) : 0;  
  
            Logo.getLogoUrl(movie, (url) => {  
                if (titleEl.__ni_logo_req_id !== reqId) return;  
                if (!titleEl.isConnected) return;  
  
                if (!url) {  
                    if (headNode && headNode.length) headNode.css('display', '');  
                    if (wrapper && wrapper.removeClass) wrapper.removeClass('ni-hide-head');  
                    if (titleEl.querySelector && titleEl.querySelector('img')) Logo.swapContent(titleEl, titleText);  
                    else titleNode.text(titleText);  
                    return;  
                }  
  
                const img = new Image();  
                img.className = 'new-interface-info__title-logo';  
                img.alt = titleText;  
                img.src = url;  
  
                Logo.setImageSizing(img, textHeightPx);  
  
                const hideHead = !!Lampa.Storage.get('logo_hide_year', !0);  
                if (hideHead && headNode && headNode.length) headNode.css('display', 'none');  
                else if (headNode && headNode.length) headNode.css('display', '');  
  
                Logo.swapContent(titleEl, img);  
            });  
        } catch (e) { }  
    }  
  
    function hookFullTitleLogos() {  
        if (window.__ni_interface2_full_logo_hooked) return;  
        window.__ni_interface2_full_logo_hooked = true;  
  
        if (!Lampa.Listener || typeof Lampa.Listener.follow !== 'function') return;  
  
        Lampa.Listener.follow('full', function (e) {  
            try {  
                if (!e || e.type !== 'complite') return;  
                if (e.data && e.data.card && e.data.activity) {  
                    Logo.applyToFull(e.data.activity, e.data.card);  
                }  
            } catch (e) { }  
        });  
    }  
  
    function startPluginV3() {  
        if (window.__ni_interface2_ready_v3) return;  
        window.__ni_interface2_ready_v3 = true;  
  
        addStyleV3();  
        hookFullTitleLogos();  
  
        Lampa.Maker.map({  
            'main': function (object) {  
                return new InterfaceMain(object);  
            },  
            'category': function (object) {  
                return new InterfaceMain(object);  
            },  
            'search': function (object) {  
                return new InterfaceMain(object);  
            }  
        });  
    }  
  
    class InterfaceMain {  
        constructor(object) {  
            this.network = new Lampa.Reguest();  
            this.scroll = new Lampa.Scroll({  
                mask: true,  
                over: true,  
                scroll_by_item: true  
            });  
            this.items = [];  
            this.html = $('<div class="new-interface"><img class="full-start__background"></div>');  
            this.active = 0;  
            this.info = new InterfaceInfo();  
            this.background_img = this.html.find('.full-start__background');  
            this.background_last = '';  
            this.background_timer = null;  
            this.object = object;  
        }  
  
        create() {  
            this.info.create();  
            this.scroll.minus(this.info.render());  
            this.html.append(this.info.render());  
            this.html.append(this.scroll.render());  
        }  
  
        empty() {  
            const button = $('<div class="empty__footer"><div class="simple-button selector">Змінити джерело на CUB</div></div>');  
            button.find('.selector').on('hover:enter', () => {  
                Lampa.Storage.set('source', 'cub');  
                Lampa.Activity.replace({ source: 'cub' });  
            });  
  
            const empty = new Lampa.Empty();  
            this.html.append(empty.render(button));  
            this.start = empty.start;  
            this.activity.loader(false);  
            this.activity.toggle();  
        }  
  
        build(data) {  
            this.info.update(data);  
            data.slice(0, 2).forEach(this.append.bind(this));  
            this.activity.loader(false);  
            this.activity.toggle();  
        }  
  
        append(element) {  
            const item = new Lampa.InteractionLine(element, {  
                url: element.url,  
                card_small: true,  
                cardClass: element.cardClass,  
                genres: this.object.genres,  
                object: this.object,  
                card_wide: false,  
                nomore: element.nomore  
            });  
  
            item.create();  
            item.onDown = this.down.bind(this);  
            item.onUp = this.up.bind(this);  
            item.onBack = this.back.bind(this);  
            item.onFocus = (elem) => {  
                this.info.update(elem);  
                this.background(elem);  
            };  
  
            this.scroll.append(item.render());  
            this.items.push(item);  
        }  
  
        background(elem) {  
            const new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');  
            clearTimeout(this.background_timer);  
            if (new_background === this.background_last) return;  
  
            this.background_timer = setTimeout(() => {  
                this.background_img.removeClass('loaded');  
                this.background_img[0].onload = () => {  
                    this.background_img.addClass('loaded');  
                };  
                this.background_img[0].onerror = () => {  
                    this.background_img.removeClass('loaded');  
                };  
                this.background_last = new_background;  
                setTimeout(() => {  
                    this.background_img[0].src = this.background_last;  
                }, 300);  
            }, 1000);  
        }  
  
        back() {  
            Lampa.Activity.backward();  
        }  
  
        down() {  
            this.active++;  
            this.active = Math.min(this.active, this.items.length - 1);  
            this.items[this.active].toggle();  
            this.scroll.update(this.items[this.active].render());  
        }  
  
        up() {  
            this.active--;  
            if (this.active < 0) {  
                this.active = 0;  
                Lampa.Controller.toggle('head');  
            } else {  
                this.items[this.active].toggle();  
                this.scroll.update(this.items[this.active].render());  
            }  
        }  
  
        start() {  
            Lampa.Controller.add('content', {  
                link: this,  
                toggle: () => {  
                    if (this.items.length) {  
                        this.items[this.active].toggle();  
                    }  
                },  
                update: () => {},  
                left: () => {  
                    if (Navigator.canmove('left')) Navigator.move('left');  
                    else Lampa.Controller.toggle('menu');  
                },  
                right: () => {  
                    Navigator.move('right');  
                },  
                up: () => {  
                    if (Navigator.canmove('up')) Navigator.move('up');  
                    else Lampa.Controller.toggle('head');  
                },  
                down: () => {  
                    if (Navigator.canmove('down')) Navigator.move('down');  
                },  
                back: this.back  
            });  
            Lampa.Controller.toggle('content');  
        }  
  
        render() {  
            return this.html;  
        }  
  
        destroy() {  
            this.network.clear();  
            this.info.destroy();  
            this.items.forEach(item => item.destroy());  
            this.html.remove();  
        }  
    }  
  
    // Запуск плагіна  
    if (Lampa.Manifest.app_digital >= 300) {  
        startPluginV3();  
    }  
  
})();
