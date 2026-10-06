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
  
    const LOGO_CACHE_PREFIX = 'logo_cache_width_based_v2_';  
  
    function applyLogoCssVars() {  
        try {  
            const h = (Lampa.Storage && typeof Lampa.Storage.get === 'function') ? (Lampa.Storage.get('logo_height', '') || '') : '';  
            const root = document.documentElement;  
  
            if (h) {  
                root.style.setProperty('--ni-logo-max-h', h);  
            } else {  
                root.style.removeProperty('--ni-logo-max-h');  
            }  
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
  
        if (!Lampa.SettingsApi || typeof Lampa.SettingsApi.addParam !== 'function') {  
            setTimeout(initInterface2Settings, 300);  
            return;  
        }  
  
        window.__ni_interface2_settings_ready = true;  
        const add = (cfg) => { try { Lampa.SettingsApi.addParam(cfg); } catch (e) { } };  

        if (typeof Lampa.SettingsApi.addComponent === 'function') {  
            Lampa.SettingsApi.addComponent({  
                component: 'interface_plus',  
                name: 'Інтерфейс+',  
                icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`  
            });  
        }  
  
        add({  
            component: 'interface_plus',  
            param: { name: 'interface2_header_group', type: 'title', default: '' },  
            field: { name: 'Кастомний інтерфейс головної сторінки', description: 'Налаштування дизайну, логотипів та метаінформації' }  
        });  
  
        add({  
            component: 'interface_plus',  
            param: { name: 'logo_glav', type: 'select', values: { 1: 'Приховати', 0: 'Відображати' }, default: '0' },  
            field: { name: 'Логотипи замість назв', description: 'Відображає логотипи фільмів замість тексту' },  
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
            field: { name: 'Мова логотипа', description: 'Пріоритетна мова для пошуку логотипа' }  
        });  
  
        add({  
            component: 'interface_plus',  
            param: {  
                name: 'logo_size',  
                type: 'select',  
                values: { w300: 'w300', w500: 'w500', w780: 'w780', original: 'Оригінал' },  
                default: 'original'  
            },  
            field: { name: 'Розмір логотипа', description: 'Роздільна здатність завантажуваного зображення' }  
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
            field: { name: 'Висота логотипів', description: 'Максимальна висота логотипів (в інфо-блоці та в повній картці)' },  
            onChange: applyLogoCssVars  
        });  
  
        add({  
            component: 'interface_plus',  
            param: { name: 'logo_animation_type', type: 'select', values: { js: 'JavaScript', css: 'CSS' }, default: 'css' },  
            field: { name: 'Тип анімації логотипів', description: 'Спосіб анімації логотипів' }  
        });  
  
        add({  
            component: 'interface_plus',  
            param: { name: 'logo_hide_year', type: 'trigger', default: !0 },  
            field: { name: 'Приховати метаінформацію', description: 'Приховує дублюючий рік та жанри під логотипом у шапці' }  
        });  
  
        add({  
            component: 'interface_plus',  
            param: { name: 'logo_use_text_height', type: 'trigger', default: !1 },  
            field: { name: 'Логотип за висотою тексту', description: 'Розмір логотипа дорівнює висоті тексту' }  
        });  
  
        add({  
            component: 'interface_plus',  
            param: { name: 'ni_card_captions', type: 'trigger', default: true },  
            field: { name: 'Підписи під картками', description: 'Показувати / приховувати назви під постерами в лініях' },  
            onChange: function () {  
                applyCaptionsToAll();  
            }  
        });  
  
        add({  
            component: 'interface_plus',  
            param: { name: 'logo_clear_cache', type: 'button' },  
            field: { name: 'Скинути кеш логотипів', description: 'Натисніть для очищення кешу зображень' },  
            onChange: function () {  
                Lampa.Select.show({  
                    title: 'Скинути кеш?',  
                    items: [{ title: 'Так', confirm: !0 }, { title: 'Ні' }],  
                    onSelect: function (e) {  
                        if (e.confirm) {  
                            const keys = [];  
                            for (let i = 0; i < localStorage.length; i++) {  
                                const k = localStorage.key(i);  
                                if (k && k.indexOf(LOGO_CACHE_PREFIX) !== -1) keys.push(k);  
                            }  
                            keys.forEach((k) => localStorage.removeItem(k));  
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
  
    function animateOpacity(el, from, to, duration, done) {  
        if (!el) return done && done();  
        let start = null;  
        const ease = (t) => 1 - Math.pow(1 - t, 3);  
  
        requestAnimationFrame(function step(ts) {  
            if (!start) start = ts;  
            const p = Math.min((ts - start) / duration, 1);  
            el.style.opacity = (from + (to - from) * ease(p)).toString();  
            if (p < 1) requestAnimationFrame(step);  
            else if (done) done();  
        });  
    }  
  
    class LogoEngine {  
        constructor() {  
            this.pending = {};  
        }  
  
        enabled() {  
            return (Lampa.Storage.get('logo_glav', '0') + '') !== '1';  
        }  
  
        lang() {  
            const forced = (Lampa.Storage.get('logo_lang', '') || '') + '';  
            const base = forced || (Lampa.Storage.get('language') || 'en') + '';  
            return (base.split('-')[0] || 'en');  
        }  
  
        size() {  
            return (Lampa.Storage.get('logo_size', 'original') || 'original') + '';  
        }  
  
        animationType() {  
            return (Lampa.Storage.get('logo_animation_type', 'css') || 'css') + '';  
        }  
  
        useTextHeight() {  
            return !!Lampa.Storage.get('logo_use_text_height', !1);  
        }  
  
        cacheKey(type, id, lang) {  
            return `${LOGO_CACHE_PREFIX}${type}_${id}_${lang}`;  
        }  
  
        flush(key, value) {  
            const list = this.pending[key] || [];  
            delete this.pending[key];  
            list.forEach((fn) => { try { if (fn) fn(value); } catch (e) { } });  
        }  
  
        resolveFromImages(item, lang) {  
            try {  
                if (!item || !item.images || !Array.isArray(item.images.logos) || !item.images.logos.length) return null;  
  
                const logos = item.images.logos.slice();  
                const pick = (iso) => {  
                    for (let i = 0; i < logos.length; i++) {  
                        if (logos[i] && logos[i].iso_639_1 === iso) return logos[i].file_path;  
                    }  
                    return null;  
                };  
  
                return pick(lang) || pick('en') || (logos[0] && logos[0].file_path) || null;  
            } catch (e) {  
                return null;  
            }  
        }  
  
        getLogoUrl(item, cb) {  
            try {  
                if (!item || !item.id) return cb && cb(null);  
  
                const source = item.source || 'tmdb';  
                if (source !== 'tmdb' && source !== 'cub') return cb && cb(null);  
  
                if (!Lampa.TMDB || typeof Lampa.TMDB.api !== 'function' || typeof Lampa.TMDB.key !== 'function') return cb && cb(null);  
  
                const type = (item.media_type === 'tv' || item.name) ? 'tv' : 'movie';  
                const lang = this.lang();  
                const key = this.cacheKey(type, item.id, lang);  
  
                const cached = localStorage.getItem(key);  
                if (cached) {  
                    if (cached === 'none') return cb && cb(null);  
                    return cb && cb(cached);  
                }  
  
                const fromDetails = this.resolveFromImages(item, lang);  
                if (fromDetails) {  
                    const size = this.size();  
                    const normalized = (fromDetails + '').replace('.svg', '.png');  
                    const logoUrl = Lampa.TMDB.image('/t/p/' + size + normalized);  
                    localStorage.setItem(key, logoUrl);  
                    return cb && cb(logoUrl);  
                }  
  
                if (this.pending[key]) {  
                    this.pending[key].push(cb);  
                    return;  
                }  
  
                this.pending[key] = [cb];  
  
                if (typeof $ === 'undefined' || !$.get) {  
                    localStorage.setItem(key, 'none');  
                    this.flush(key, null);  
                    return;  
                }  
  
                const url = Lampa.TMDB.api(`${type}/${item.id}/images?api_key=${Lampa.TMDB.key()}&include_image_language=${lang},en,null`);  
  
                $.get(url, (res) => {  
                    try {  
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
                    } catch (err) {  
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
            img.style.objectPosition = 'left center';  
  
            const logoHeight = Lampa.Storage.get('logo_height', '');  
            if (logoHeight) {  
                img.style.maxHeight = logoHeight;  
                img.style.setProperty('max-height', logoHeight, 'important');  
            } else {  
                img.style.maxHeight = '95px';  
                img.style.setProperty('max-height', '95px', 'important');  
            }  
  
            if (this.useTextHeight() && heightPx && heightPx > 0 && !logoHeight) {  
                const scaledHeight = Math.min(heightPx * 1.1, 95);  
                img.style.height = `${scaledHeight}px`;  
                img.style.width = 'auto';  
                img.style.maxWidth = '100%';  
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
                animateOpacity(container, 1, 0, 150, () => {  
                    container.innerHTML = '';  
                    if (typeof newNode === 'string') container.textContent = newNode;  
                    else container.appendChild(newNode);  
                    container.style.opacity = '0';  
                    animateOpacity(container, 0, 1, 200);  
                });  
            } else {  
                container.style.transition = 'opacity 0.15s ease';  
                container.style.opacity = '0';  
                container.__ni_logo_timer = setTimeout(() => {  
                    container.__ni_logo_timer = null;  
                    container.innerHTML = '';  
                    if (typeof newNode === 'string') container.textContent = newNode;  
                    else container.appendChild(newNode);  
                    container.style.transition = 'opacity 0.2s ease';  
                    container.style.opacity = '1';  
                }, 80);  
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
  
    function formatMeta(movie) {  
        try {  
            const parts = [];  
  
            if (movie.production_countries && movie.production_countries.length) {  
                parts.push(movie.production_countries[0].name);  
            } else if (movie.origin_country && movie.origin_country.length) {  
                parts.push(movie.origin_country[0]);  
            }  
  
            const dateStr = movie.release_date || movie.first_air_date || '';  
            if (dateStr) {  
                const year = dateStr.split('-')[0];  
                if (year) parts.push(year);  
            }  
  
            if (movie.number_of_seasons) {  
                parts.push(`${movie.number_of_seasons} сезон${movie.number_of_seasons > 1 ? 'и' : ''}`);  
            } else if (movie.runtime) {  
                const hours = Math.floor(movie.runtime / 60);  
                const mins = movie.runtime % 60;  
                parts.push(hours > 0 ? `${hours} год ${mins} хв` : `${mins} хв`);  
            }  
  
            if (movie.genres && Array.isArray(movie.genres) && movie.genres.length) {  
                const genresStr = movie.genres.slice(0, 2).map(g => g.name).join(', ');  
                if (genresStr) parts.push(genresStr);  
            }  
  
            return parts.join(' • ');  
        } catch (e) {  
            return '';  
        }  
    }  

    function applyInfoTitleLogo(wrapper, titleNode, headNode, movie, titleText) {  
        try {  
            if (!titleNode || !titleNode.length) return;  
            const titleEl = titleNode[0];  
            if (!titleEl) return;  
  
            const reqId = (titleEl.__ni_logo_req_id || 0) + 1;  
            titleEl.__ni_logo_req_id = reqId;  
  
            const descNode = wrapper.find('.new-interface-info__description');  
            const overviewText = movie.overview || movie.description || '';  
            if (descNode.length) {  
                descNode.text(overviewText);  
                descNode.toggle(!!overviewText);  
            }  
  
            const hideHead = !!Lampa.Storage.get('logo_hide_year', !0);  
            if (headNode && headNode.length) {  
                if (hideHead) {  
                    headNode.css('display', 'none').text('');  
                } else {  
                    const metaText = formatMeta(movie);  
                    headNode.text(metaText);  
                    headNode.css('display', metaText ? '' : 'none');  
                }  
            }  
  
            if (!Logo.enabled()) {  
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
                    if (titleEl.querySelector && titleEl.querySelector('img')) Logo.swapContent(titleEl, titleText);  
                    else titleNode.text(titleText);  
                    return;  
                }  
  
                const img = new Image();  
                img.className = 'new-interface-info__title-logo';  
                img.alt = titleText;  
                img.src = url;  
  
                Logo.setImageSizing(img, textHeightPx);  
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
                if (!e.object || !e.object.activity) return;  
  
                const data = (e.data && (e.data.movie || e.data)) ? (e.data.movie || e.data) : null;  
                if (!data) return;  
  
                Logo.applyToFull(e.object.activity, data);  
            } catch (err) { }  
        });  
    }  
  
    hookFullTitleLogos();  
  
    function startPluginV3() {  
        if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) return;  
        if (window.plugin_interface_ready_v3) return;  
        window.plugin_interface_ready_v3 = true;  
  
        addStyleV3();  
  
        const mainMap = Lampa.Maker.map('Main');  
  
        if (!mainMap || !mainMap.Items || !mainMap.Create) return;  
  
        wrap(mainMap.Items, 'onInit', function (original, args) {  
            if (original) original.apply(this, args);  
            this.__newInterfaceEnabled = shouldUseNewInterface(this && this.object);  
        });  
  
        wrap(mainMap.Create, 'onCreate', function (original, args) {  
            if (original) original.apply(this, args);  
            if (!this.__newInterfaceEnabled) return;  
            const state = ensureState(this);  
            state.attach();  
        });  
  
        wrap(mainMap.Create, 'onCreateAndAppend', function (original, args) {  
            const element = args && args[0];  
            if (this.__newInterfaceEnabled && element) {  
                prepareLineData(element);  
            }  
            return original ? original.apply(this, args) : undefined;  
        });  
  
        wrap(mainMap.Items, 'onAppend', function (original, args) {  
            if (original) original.apply(this, args);  
            if (!this.__newInterfaceEnabled) return;  
            const item = args && args[0];  
            const element = args && args[1];  
            if (item && element) attachLineHandlers(this, item, element);  
        });  
  
        wrap(mainMap.Items, 'onDestroy', function (original, args) {  
            if (this.__newInterfaceState) {  
                this.__newInterfaceState.destroy();  
                delete this.__newInterfaceState;  
            }  
            delete this.__newInterfaceEnabled;  
            if (original) original.apply(this, args);  
        });  
    }  
  
    function shouldUseNewInterface(object) {  
        if (!object) return false;  
        if (object.source === 'other' && !object.backdrop_path) return false;  
        return true;  
    }  
  
    function ensureState(main) {  
        if (main.__newInterfaceState) return main.__newInterfaceState;  
        const state = createInterfaceState(main);  
        main.__newInterfaceState = state;  
        return state;  
    }  
  
    function createInterfaceState(main) {  
        const info = new InterfaceInfo();  
        info.create();  
  
        const background = document.createElement('img');  
        background.className = 'full-start__background';  
  
        const state = {  
            main,  
            info,  
            background,  
            infoElement: null,  
            backgroundTimer: null,  
            backgroundLast: '',  
            attached: false,  
            attach() {  
                if (this.attached) return;  
  
                const container = main.render(true);  
                if (!container) return;  
  
                container.classList.add('new-interface');  
  
                applyCaptionsClass(container);  
  
                if (!background.parentElement) {  
                    container.insertBefore(background, container.firstChild || null);  
                }  
  
                const infoNode = info.render(true);  
                this.infoElement = infoNode;  
  
                if (infoNode && infoNode.parentNode !== container) {  
                    if (background.parentElement === container) {  
                        container.insertBefore(infoNode, background.nextSibling);  
                    } else {  
                        container.insertBefore(infoNode, container.firstChild || null);  
                    }  
                }  
  
                main.scroll.minus(infoNode);  
  
                this.attached = true;  
            },  
            update(data) {  
                if (!data) return;  
                info.update(data);  
                this.updateBackground(data);  
            },  
            updateBackground(data) {  
                const path = data && data.backdrop_path ? Lampa.Api.img(data.backdrop_path, 'w1280') : '';  
  
                if (!path || path === this.backgroundLast) return;  
  
                clearTimeout(this.backgroundTimer);  
  
                this.backgroundTimer = setTimeout(() => {  
                    background.classList.remove('loaded');  
  
                    background.onload = () => background.classList.add('loaded');  
                    background.onerror = () => background.classList.remove('loaded');  
  
                    this.backgroundLast = path;  
  
                    setTimeout(() => {  
                        background.src = this.backgroundLast;  
                    }, 300);  
                }, 400);  
            },  
            reset() {  
                info.empty();  
            },  
            destroy() {  
                clearTimeout(this.backgroundTimer);  
                info.destroy();  
  
                const container = main.render(true);  
                if (container) container.classList.remove('new-interface');  
  
                if (this.infoElement && this.infoElement.parentNode) {  
                    this.infoElement.parentNode.removeChild(this.infoElement);  
                }  
  
                if (background && background.parentNode) {  
                    background.parentNode.removeChild(background);  
                }  
  
                this.attached = false;  
            }  
        };  
  
        return state;  
    }  
  
    function prepareLineData(element) {  
        return;  
    }  
  
    function decorateCard(state, card) {  
        if (!card || card.__newInterfaceCard || typeof card.use !== 'function' || !card.data) return;  
  
        card.__newInterfaceCard = true;  
  
        card.params = card.params || {};  
        card.params.style = card.params.style || {};  
  
        card.use({  
            onFocus() {  
                state.update(card.data);  
            },  
            onHover() {  
                state.update(card.data);  
            },  
            onTouch() {  
                state.update(card.data);  
            },  
            onDestroy() {  
                delete card.__newInterfaceCard;  
            }  
        });  
    }  
  
    function getCardData(card, element, index = 0) {  
        if (card && card.data) return card.data;  
        if (element && Array.isArray(element.results)) return element.results[index] || element.results[0];  
        return null;  
    }  
  
    function getDomCardData(node) {  
        if (!node) return null;  
  
        let current = node && node.jquery ? node[0] : node;  
  
        while (current && !current.card_data) {  
            current = current.parentNode;  
        }  
  
        return current && current.card_data ? current.card_data : null;  
    }  
  
    function getFocusedCardData(line) {  
        const container = line && typeof line.render === 'function' ? line.render(true) : null;  
        if (!container || !container.querySelector) return null;  
  
        const focus = container.querySelector('.selector.focus') || container.querySelector('.focus');  
  
        return getDomCardData(focus);  
    }  
  
    function attachLineHandlers(main, line, element) {  
        if (line.__newInterfaceLine) return;  
        line.__newInterfaceLine = true;  
  
        const state = ensureState(main);  
        const applyToCard = (card) => decorateCard(state, card);  
  
        if (element && Array.isArray(element.results)) {  
            element.results.slice(0, 5).forEach((item) => {  
                state.info.load(item, { preload: true });  
            });  
        }  
  
        line.use({  
            onInstance(card) {  
                applyToCard(card);  
            },  
            onActive(card, itemData) {  
                const current = getCardData(card, itemData);  
                if (current) {  
                    current.__priority = 1;  
                    state.update(current);  
                }  
            },  
            onToggle() {  
                setTimeout(() => {  
                    const domData = getFocusedCardData(line);  
                    if (domData) state.update(domData);  
                }, 32);  
            },  
            onMore() {  
                state.reset();  
            },  
            onDestroy() {  
                state.reset();  
                delete line.__newInterfaceLine;  
            }  
        });  
  
        if (Array.isArray(line.items) && line.items.length) {  
            line.items.forEach(applyToCard);  
              
            try {  
                const firstData = getCardData(line.items[0], element, 0);  
                if (firstData) {  
                    state.update(firstData);  
                }  
            } catch (e) {}  
        }  
  
        if (line.last) {  
            const lastData = getDomCardData(line.last);  
            if (lastData) state.update(lastData);  
        }  
    }  
  
    function wrap(target, method, handler) {  
        if (!target) return;  
        const original = typeof target[method] === 'function' ? target[method] : null;  
        target[method] = function (...args) {  
            return handler.call(this, original, args);  
        };  
    }  
  
    function addStyleV3() {  
        if (addStyleV3.added) return;  
        addStyleV3.added = true;  
  
        Lampa.Template.add('new_interface_style_v3', `<style>  
.new-interface{  
    position: relative;  
    --ni-card-w: clamp(100px, 14vw, 150px);  
}  
  
.new-interface .card--small,  
.new-interface .card-more{  
    width: var(--ni-card-w) !important;  
}  
  
.new-interface .card-more__box{  
    padding-bottom: 150%;  
}  
  
.new-interface-info{  
    position: relative;  
    padding: 1.5em 2.5em 0.8em 2.5em;  
    height: auto !important;  
    min-height: 44vh !important;  
    max-height: 48vh !important;  
    overflow: hidden !important;  
    z-index: 3;  
    display: flex !important;  
    flex-direction: column !important;  
    justify-content: flex-end !important;  
    box-sizing: border-box;  
    background: transparent !important;  
}  
  
.new-interface-info:before{  
    display: none !important;  
}  
  
.new-interface-info__body{  
    position: relative;  
    z-index: 4;  
    width: 100%;  
    max-width: 100%;  
    display: flex !important;  
    flex-direction: column !important;  
    justify-content: flex-end !important;  
    box-sizing: border-box;  
}  
  
.new-interface-info__left {  
    width: 100%;  
    max-width: 100%;  
    display: flex;  
    flex-direction: column;  
    align-items: flex-start;  
    justify-content: flex-end;  
}  
  
.new-interface-info__head{  
    color: rgba(255, 255, 255, 0.7);  
    margin-top: 0.4em;  
    margin-bottom: 0.5em;  
    font-size: 0.95em;  
    font-weight: 400;  
    letter-spacing: 0.5px;  
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);  
    order: 2;  
}  
  
.new-interface-info__head span{  
    color: #fff;  
}  
  
.new-interface-info__title {  
    font-size: clamp(2rem, 3vw, 2.8em);  
    font-weight: 600;  
    margin: 0;  
    display: flex;  
    align-items: center;  
    max-width: 100%;  
    min-height: 1.1em;  
    order: 1;  
}  
  
.new-interface-info__title-logo {  
    max-width: min(420px, 45vw) !important;  
    max-height: var(--ni-logo-max-h, 95px) !important;  
    width: auto !important;  
    height: auto !important;  
    object-fit: contain !important;  
    object-position: left center !important;  
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));  
}  
  
.new-interface-full-logo {  
    max-height: var(--ni-logo-max-h, 110px) !important;  
    width: auto !important;  
    max-width: 100% !important;  
    object-fit: contain !important;  
    object-position: left center !important;  
}  
  
.new-interface.ni-hide-captions .card__view ~ .card__title,  
.new-interface.ni-hide-captions .card__view ~ .card__name,  
.new-interface.ni-hide-captions .card__view ~ .card__text,  
.new-interface.ni-hide-captions .card__view ~ .card__details,  
.new-interface.ni-hide-captions .card__view ~ .card.ni-hide-captions .card__description,  
.new-interface.ni-hide-captions .card__view ~ .card__subtitle,  
.new-interface.ni-hide-captions .card__view ~ .card__year,  
.new-interface.ni-hide-captions .card__bottom,  
.new-interface.ni-hide-captions .card__caption{  
    display: none !important;  
}  
  
.new-interface-info__description{  
    font-size: 0.95em;  
    font-weight: 300;  
    line-height: 1.4;  
    color: rgba(255, 255, 255, 0.85);  
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);  
    overflow: hidden;  
    text-overflow: ellipsis;  
    display: -webkit-box;  
    -webkit-line-clamp: 2;  
    line-clamp: 2;  
    -webkit-box-orient: vertical;  
    max-width: min(750px, 80vw);  
    margin-top: 0.2em;  
    order: 3;  
}  
  
.new-interface .full-start__background{  
    height: 108%;  
    top: -6em;  
    transition: opacity 0.4s ease;  
    mask-image: linear-gradient(180deg, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 90%);  
    -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 90%);  
}  
  
.new-interface .full-start__background::after {  
    content: '';  
    position: absolute;  
    top: 0;  
    left: 0;  
    width: 100%;  
    height: 100%;  
    background: linear-gradient(180deg, rgba(15,15,15,0) 50%, rgba(15,15,15,0.98) 85%);  
    pointer-events: none;  
}  
  
.new-interface .items-line{  
    margin-top: 0.5em;  
    position: relative;  
    z-index: 4;  
}  
  
@media (max-width: 767px) {  
    .new-interface-info {  
        padding: 1em 1.2em 0.5em 1.2em;  
        min-height: 40vh !important;  
    }  
    .new-interface-info__title-logo {  
        max-width: min(220px, 60vw) !important;  
        max-height: 55px !important;  
    }  
}  
  
body.advanced--animation:not(.no--animation) .new-interface .card.focus .card__view,  
body.advanced--animation:not(.no--animation) .new-interface .card--small.focus .card__view{  
    animation: animation-card-focus 0.2s;  
}  
  
body.advanced--animation:not(.no--animation) .new-interface .card.animate-trigger-enter .card__view,  
body.advanced--animation:not(.no--animation) .new-interface .card.animate-trigger-enter .card__view{  
    animation: animation-trigger-enter 0.2s forwards;  
}  
</style>`);  
  
        $('body').append(Lampa.Template.get('new_interface_style_v3', {}, true));  
    }  
  
    class InterfaceInfo {  
        constructor() {  
            this.html = null;  
            this.timer = null;  
            this.network = new Lampa.Reguest();  
            this.loaded = {};  
        }  
  
        create() {  
            if (this.html) return;  
  
            this.html = $(`<div class="new-interface-info">  
                <div class="new-interface-info__body">  
                    <div class="new-interface-info__left">  
                        <div class="new-interface-info__title"></div>  
                        <div class="new-interface-info__head"></div>  
                        <div class="new-interface-info__description"></div>  
                    </div>  
                </div>  
            </div>`);  
        }  
  
        render(js) {  
            if (!this.html) this.create();  
            return js ? this.html[0] : this.html;  
        }  
  
        update(data) {  
            if (!data) return;  
            if (!this.html) this.create();  
            Lampa.Background.change(Lampa.Utils.cardImgBackground(data));  
            this.load(data);  
        }  
  
        load(data, options) {  
            if (!data || !data.id) return;  
  
            const source = data.source || 'tmdb';  
            if (source !== 'tmdb' && source !== 'cub') return;  
            if (!Lampa.TMDB || typeof Lampa.TMDB.api !== 'function' || typeof Lampa.TMDB.key !== 'function') return;  
  
            const preload = options && options.preload;  
  
            const type = data.media_type === 'tv' || data.name ? 'tv' : 'movie';  
            const language = Lampa.Storage.get('language');  
            const shortLang = (language || 'en').split('-')[0];  
            const url = Lampa.TMDB.api(`${type}/${data.id}?api_key=${Lampa.TMDB.key()}&append_to_response=content_ratings,release_dates,images&include_image_language=${shortLang},en,null&language=${language}`);  
  
            this.currentUrl = url;  
  
            if (this.loaded[url]) {  
                if (!preload) this.draw(this.loaded[url]);  
                return;  
            }  
  
            clearTimeout(this.timer);  
  
            this.timer = setTimeout(() => {  
                this.network.clear();  
                this.network.timeout(5000);  
                this.network.silent(url, (movie) => {  
                    this.loaded[url] = movie;  
                    if (!preload && this.currentUrl === url) this.draw(movie);  
                });  
            }, 0);  
        }  
  
        draw(movie) {  
            if (!movie || !this.html) return;  
  
            const titleNode = this.html.find('.new-interface-info__title');  
            const headNode = this.html.find('.new-interface-info__head');  
            const titleText = movie.title || movie.name || '';  
  
            titleNode.text(titleText);  
            applyInfoTitleLogo(this.html, titleNode, headNode, movie, titleText);  
        }  
  
        empty() {  
            if (!this.html) return;  
            this.html.find('.new-interface-info__head').text('---');  
            this.html.find('.new-interface-info__description').text('');  
        }  
  
        destroy() {  
            clearTimeout(this.timer);  
            this.network.clear();  
            this.loaded = {};  
            this.currentUrl = null;  
  
            if (this.html) {  
                this.html.remove();  
                this.html = null;  
            }  
        }  
    }  
  
    if (Lampa.Manifest.app_digital >= 300) {  
        startPluginV3();  
        return;  
    }  

    function startPlugin() {  
        window.plugin_interface_ready = true;  
        var old_interface = Lampa.InteractionMain;  
        var new_interface = component;  
  
        Lampa.InteractionMain = function (object) {  
            var use = new_interface;  
            if (!(object.source == 'tmdb' || object.source == 'cub')) use = old_info;  
            if (Lampa.Manifest.app_digital < 153) use = old_interface;  
            return new use(object);  
        };  
    }  

    if (!window.plugin_interface_ready && !window.plugin_interface_ready_v3) startPlugin();  

})();
