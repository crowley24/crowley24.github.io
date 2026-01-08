(function () {  
    'use strict';  
  
    if (typeof Lampa === 'undefined') return;  
  
    // Константи для кращої підтримки  
    const LOGO_CACHE_PREFIX = 'logo_cache_width_based_v1_';  
    const MAX_LOGO_HEIGHT = 120;  
    const MAX_LOGO_WIDTH = 400;  
    const CACHE_TTL = 86400000; // 24 години  
    const DEBOUNCE_DELAY = 100;  
  
    // Debounce функція для оптимізації  
    function debounce(func, wait) {  
        let timeout;  
        return function executedFunction(...args) {  
            const later = () => {  
                clearTimeout(timeout);  
                func(...args);  
            };  
            clearTimeout(timeout);  
            timeout = setTimeout(later, wait);  
        };  
    }  
  
    // Кешування з expiry  
    function cacheWithExpiry(key, data, ttl = CACHE_TTL) {  
        const item = {  
            value: data,  
            expiry: Date.now() + ttl  
        };  
        localStorage.setItem(key, JSON.stringify(item));  
    }  
  
    function getFromCache(key) {  
        const itemStr = localStorage.getItem(key);  
        if (!itemStr) return null;  
          
        try {  
            const item = JSON.parse(itemStr);  
            if (Date.now() > item.expiry) {  
                localStorage.removeItem(key);  
                return null;  
            }  
            return item.value;  
        } catch (e) {  
            localStorage.removeItem(key);  
            return null;  
        }  
    }  
  
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
  
    // Покращена функція applyLogoCssVars  
    function applyLogoCssVars() {  
        try {  
            const h = (Lampa.Storage && typeof Lampa.Storage.get === 'function') ? (Lampa.Storage.get('logo_height', '') || '') : '';  
            const root = document.documentElement;  
  
            if (h) {  
                root.style.setProperty('--ni-logo-max-h', h);  
                document.querySelectorAll('.new-interface-info__title-logo, .new-interface-full-logo').forEach(img => {  
                    img.style.maxHeight = h;  
                    img.style.setProperty('max-height', h, 'important');  
                });  
            } else {  
                root.style.removeProperty('--ni-logo-max-h');  
                document.querySelectorAll('.new-interface-info__title-logo, .new-interface-full-logo').forEach(img => {  
                    img.style.maxHeight = '';  
                    img.style.removeProperty('max-height');  
                });  
            }  
        } catch (e) {}  
    }  
  
    function applyCaptionsClass(container) {  
        try {  
            if (!container) return;  
            const show = !!Lampa.Storage.get('ni_card_captions', true);  
            container.classList.toggle('ni-hide-captions', !show);  
        } catch (e) {}  
    }  
  
    function applyCaptionsToAll() {  
        try {  
            document.querySelectorAll('.new-interface').forEach((el) => applyCaptionsClass(el));  
        } catch (e) {}  
    }  
  
    // Індикатор завантаження  
    function showLoadingSpinner(container) {  
        const spinner = document.createElement('div');  
        spinner.className = 'logo-loading-spinner';  
        spinner.innerHTML = '<div class="spinner"></div>';  
        container.appendChild(spinner);  
        return spinner;  
    }  
  
    // Покращений клас LogoEngine з кращою обробкою помилок  
    class LogoEngine {  
        constructor() {  
            this.pending = {};  
            this.loaded = {};  
            this.errorCount = 0;  
            this.maxErrors = 5;  
            this.enabled = true;  
        }  
  
        handleError(error, context) {  
            this.errorCount++;  
            console.error(`LogoEngine Error [${context}]:`, error);  
              
            if (this.errorCount >= this.maxErrors) {  
                this.disableTemporarily();  
            }  
        }  
  
        disableTemporarily() {  
            this.enabled = false;  
            setTimeout(() => {  
                this.enabled = true;  
                this.errorCount = 0;  
            }, 300000); // 5 хвилин  
        }  
  
        enabled() {  
            return !!Lampa.Storage.get('logo_glav', '0') === '0' && this.enabled;  
        }  
  
        lang() {  
            const lang = Lampa.Storage.get('logo_lang', '');  
            return lang || (Lampa.Storage.get('language') || 'en').split('-')[0];  
        }  
  
        size() {  
            return Lampa.Storage.get('logo_size', 'original');  
        }  
  
        animationType() {  
            return Lampa.Storage.get('logo_animation_type', 'css');  
        }  
  
        useTextHeight() {  
            return !!Lampa.Storage.get('logo_use_text_height', false);  
        }  
  
        cacheKey(type, id, lang) {  
            return LOGO_CACHE_PREFIX + type + '_' + id + '_' + lang + '_' + this.size();  
        }  
  
        resolveFromImages(item, lang) {  
            if (!item.images || !item.images.logos) return null;  
            const filtered = item.images.logos.filter(function (logo) {  
                return logo.iso_639_1 === lang;  
            });  
            if (filtered.length) return filtered[0].file_path;  
            const en = item.images.logos.filter(function (logo) {  
                return logo.iso_639_1 === 'en';  
            });  
            return en.length ? en[0].file_path : null;  
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
  
                const cached = getFromCache(key);  
                if (cached) {  
                    if (cached === 'none') return cb && cb(null);  
                    return cb && cb(cached);  
                }  
  
                const fromDetails = this.resolveFromImages(item, lang);  
                if (fromDetails) {  
                    const size = this.size();  
                    const normalized = (fromDetails + '').replace('.svg', '.png');  
                    const logoUrl = Lampa.TMDB.image('/t/p/' + size + normalized);  
                    cacheWithExpiry(key, logoUrl);  
                    return cb && cb(logoUrl);  
                }  
  
                if (this.pending[key]) {  
                    this.pending[key].push(cb);  
                    return;  
                }  
  
                this.pending[key] = [cb];  
  
                if (typeof $ === 'undefined' || !$.get) {  
                    cacheWithExpiry(key, 'none');  
                    this.flush(key, null);  
                    return;  
                }  
  
                const url = Lampa.TMDB.api(`${type}/${item.id}/images?api_key=${Lampa.TMDB.key()}&include_image_language=${lang},en,null`);  
                  
                const priority = item.__priority || 0;  
                const timeout = priority > 0 ? 200 : 800;  
  
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
                        cacheWithExpiry(key, logoUrl);  
                        this.flush(key, logoUrl);  
                    } else {  
                        cacheWithExpiry(key, 'none');  
                        this.flush(key, null);  
                    }  
                }).fail(() => {  
                    cacheWithExpiry(key, 'none');  
                    this.flush(key, null);  
                });  
            } catch (e) {  
                this.handleError(e, 'getLogoUrl');  
                if (cb) cb(null);  
            }  
        }  
  
        flush(key, url) {  
            const cbs = this.pending[key] || [];  
            delete this.pending[key];  
            cbs.forEach(function (cb) {  
                if (cb) cb(url);  
            });  
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
                animateOpacity(container, 1, 0, 200, () => {  
                    container.innerHTML = '';  
                    if (typeof newNode === 'string') container.textContent = newNode;  
                    else container.appendChild(newNode);  
                    container.style.opacity = '0';  
                    animateOpacity(container, 0, 1, 300);  
                });  
            } else {  
                container.style.transition = 'opacity 0.2s ease';  
                container.style.opacity = '0';  
                container.__ni_logo_timer = setTimeout(() => {  
                    container.__ni_logo_timer = null;  
                    container.innerHTML = '';  
                    if (typeof newNode === 'string') container.textContent = newNode;  
                    else container.appendChild(newNode);  
                    container.style.transition = 'opacity 0.3s ease';  
                    container.style.opacity = '1';  
                }, 100);  
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
                img.style.maxHeight = `${MAX_LOGO_HEIGHT}px`;  
                img.style.setProperty('max-height', `${MAX_LOGO_HEIGHT}px`, 'important');  
            }  
  
            if (this.useTextHeight() && heightPx && heightPx > 0 && !logoHeight) {  
                const scaledHeight = Math.min(heightPx * 1.2, MAX_LOGO_HEIGHT);  
                img.style.height = `${scaledHeight}px`;  
                img.style.width = 'auto';  
                img.style.maxWidth = `${MAX_LOGO_WIDTH}px`;  
            }  
        }  
  
        updateInfo(data) {  
            if (!this.enabled()) return;  
            if (!data || !data.id) return;  
            this.info.load(data);  
        }  
  
        updateFull(data) {  
            if (!this.enabled()) return;  
            if (!data || !data.id) return;  
            this.full.load(data);  
        }  
  
        syncFullHead(activity, showLogo) {  
            try {  
                if (!activity || !activity.render || typeof activity.render !== 'function') return;  
                const container = activity.render();  
                if (!container || typeof container.find !== 'function') return;  
                const head = container.find('.full-start__head');  
                if (!head || !head.length) return;  
                head.toggleClass('hide-logo', !!showLogo);  
            } catch (e) {}  
        }  
    }  
  
    function animateOpacity(element, from, to, duration, callback) {  
        const start = Date.now();  
        const step = () => {  
            const progress = Math.min((Date.now() - start) / duration, 1);  
            element.style.opacity = from + (to - from) * progress;  
            if (progress < 1) requestAnimationFrame(step);  
            else if (callback) callback();  
        };  
        requestAnimationFrame(step);  
    }  
  
    function applyInfoTitleLogo(html, titleNode, headNode, data, titleText) {  
        try {  
            if (!html || !titleNode || !titleNode.length) return;  
            if (!Logo.enabled()) {  
                const existImg = titleNode[0].querySelector && titleNode[0].querySelector('img.new-interface-info__title-logo');  
                if (existImg) Logo.swapContent(titleNode[0], titleText);  
                else if (titleNode.text() !== titleText) titleNode.text(titleText);  
                return;  
            }  
  
            if (titleNode.text() !== titleText) titleNode.text(titleText);  
            const textHeightPx = titleNode[0].getBoundingClientRect ? Math.round(titleNode[0].getBoundingClientRect().height) : 0;  
  
            const requestId = (titleNode[0].__ni_logo_req_id || 0) + 1;  
            titleNode[0].__ni_logo_req_id = requestId;  
  
            const spinner = showLoadingSpinner(titleNode[0]);  
  
            Logo.getLogoUrl(data, (url) => {  
                if (spinner) spinner.remove();  
                if (titleNode[0].__ni_logo_req_id !== requestId) return;  
                if (!titleNode[0].isConnected) return;  
  
                if (!url) {  
                    if (titleNode[0].querySelector && titleNode[0].querySelector('img.new-interface-info__title-logo')) Logo.swapContent(titleNode[0], titleText);  
                    else if (titleNode.text() !== titleText) titleNode.text(titleText);  
                    return;  
                }  
  
                const img = new Image();  
                img.className = 'new-interface-info__title-logo';  
                img.alt = titleText;  
                img.src = url;  
  
                Logo.setImageSizing(img, textHeightPx);  
                Logo.swapContent(titleNode[0], img);  
            });  
        } catch (e) {  
            Logo.handleError(e, 'applyInfoTitleLogo');  
        }  
    }  
  
    function decorateCard(state, card) {  
        try {  
            if (!card || !card.render || typeof card.render !== 'function') return;  
            const html = card.render();  
            if (!html || typeof html.find !== 'function') return;  
            const titleNode = html.find('.card__title');  
            if (!titleNode || !titleNode.length) return;  
            const data = card.data;  
            if (!data || !data.id) return;  
  
            if (!Logo.enabled()) {  
                const existImg = titleNode[0].querySelector && titleNode[0].querySelector('img.new-interface-card__logo');  
                if (existImg) Logo.swapContent(titleNode[0], data.title || data.name || '');  
                return;  
            }  
  
            const titleText = (data.title || data.name || '') + '';  
            if (titleNode.text() !== titleText) titleNode.text(titleText);  
  
            const requestId = (titleNode[0].__ni_logo_req_id || 0) + 1;  
            titleNode[0].__ni_logo_req_id = requestId;  
  
            Logo.getLogoUrl(data, (url) => {  
                if (titleNode[0].__ni_logo_req_id !== requestId) return;  
                if (!titleNode[0].isConnected) return;  
  
                if (!url) return;  
  
                const img = new Image();  
                img.className = 'new-interface-card__logo';  
                img.alt = titleText;  
                img.src = url;  
  
                Logo.setImageSizing(img);  
                Logo.swapContent(titleNode[0], img);  
            });  
        } catch (e) {  
            Logo.handleError(e, 'decorateCard');  
        }  
    }  
  
    function getCardData(card, itemData) {  
        try {  
            if (!card || !card.render || typeof card.render !== 'function') return null;  
            const html = card.render();  
            if (!html || typeof html.find !== 'function') return null;  
            const titleNode = html.find('.card__title');  
             if (!titleNode || !titleNode.length) return null;  
            const data = card.data;  
            if (!data || !data.id) return null;  
            return { card, data, titleNode: titleNode[0] };  
        } catch (e) {  
            Logo.handleError(e, 'getCardData');  
            return null;  
        }  
    }  
  
    function getFocusedCardData(line) {  
        try {  
            if (!line || !line.render || typeof line.render !== 'function') return null;  
            const html = line.render();  
            if (!html || typeof html.find !== 'function') return null;  
            const focused = html.find('.card.focus');  
            if (!focused || !focused.length) return null;  
            return getCardData(focused[0], focused[0].data);  
        } catch (e) {  
            Logo.handleError(e, 'getFocusedCardData');  
            return null;  
        }  
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
    }  
  
    function applyCaptionsClass(container) {  
        try {  
            if (!container) return;  
            const show = !!Lampa.Storage.get('ni_card_captions', true);  
            container.classList.toggle('ni-hide-captions', !show);  
        } catch (e) {}  
    }  
  
    function applyCaptionsToAll() {  
        try {  
            document.querySelectorAll('.new-interface').forEach((el) => applyCaptionsClass(el));  
        } catch (e) {}  
    }  
  
    function applyInfoTitleLogo(html, titleNode, headNode, data, titleText) {  
        try {  
            if (!html || !titleNode || !titleNode.length || !data || !data.id) return;  
  
            if (!Logo.enabled()) {  
                const existImg = titleNode[0].querySelector && titleNode[0].querySelector('img.new-interface-info__title-logo');  
                if (existImg) Logo.swapContent(titleNode[0], titleText);  
                else if (titleNode.text() !== titleText) titleNode.text(titleText);  
                return;  
            }  
  
            if (titleNode.text() !== titleText) titleNode.text(titleText);  
            const textHeightPx = titleNode[0].getBoundingClientRect ? Math.round(titleNode[0].getBoundingClientRect().height) : 0;  
  
            const requestId = (titleNode[0].__ni_logo_req_id || 0) + 1;  
            titleNode[0].__ni_logo_req_id = requestId;  
  
            Logo.getLogoUrl(data, (url) => {  
                if (titleNode[0].__ni_logo_req_id !== requestId) return;  
                if (!titleNode[0].isConnected) return;  
  
                if (!url) {  
                    if (titleNode[0].querySelector && titleNode[0].querySelector('img.new-interface-info__title-logo')) {  
                        Logo.swapContent(titleNode[0], titleText);  
                    } else if (titleNode.text() !== titleText) titleNode.text(titleText);  
                    return;  
                }  
  
                const img = new Image();  
                img.className = 'new-interface-info__title-logo';  
                img.alt = titleText;  
                img.src = url;  
  
                Logo.setImageSizing(img, textHeightPx);  
                Logo.swapContent(titleNode[0], img);  
            });  
        } catch (e) {  
            Logo.handleError(e, 'applyInfoTitleLogo');  
        }  
    }  
  
    function decorateCard(state, card) {  
        try {  
            if (!card || !card.render || typeof card.render !== 'function') return;  
            const html = card.render();  
            if (!html || typeof html.find !== 'function') return;  
            const titleNode = html.find('.card__title');  
            if (!titleNode || !titleNode.length) return;  
            const data = card.data;  
            if (!data || !data.id) return;  
  
            if (!Logo.enabled()) {  
                const existImg = titleNode[0].querySelector && titleNode[0].querySelector('img.new-interface-card__logo');  
                if (existImg) Logo.swapContent(titleNode[0], data.title || data.name || '');  
                return;  
            }  
  
            const titleText = (data.title || data.name || '') + '';  
            if (titleNode.text() !== titleText) titleNode.text(titleText);  
  
            const requestId = (titleNode[0].__ni_logo_req_id || 0) + 1;  
            titleNode[0].__ni_logo_req_id = requestId;  
  
            Logo.getLogoUrl(data, (url) => {  
                if (titleNode[0].__ni_logo_req_id !== requestId) return;  
                if (!titleNode[0].isConnected) return;  
  
                if (!url) return;  
  
                const img = new Image();  
                img.className = 'new-interface-card__logo';  
                img.alt = titleText;  
                img.src = url;  
  
                Logo.setImageSizing(img);  
                Logo.swapContent(titleNode[0], img);  
            });  
        } catch (e) {  
            Logo.handleError(e, 'decorateCard');  
        }  
    }  
  
    function create(object) {  
        var network = new Lampa.Reguest();  
        var loaded = {};  
        var timer;  
        var html = $('<div class="new-interface-info"><div class="new-interface-info__body"><div class="new-interface-info__left"><div class="new-interface-info__head"></div><div class="new-interface-info__title"></div></div></div></div>');  
  
        this.create = function () {  
            if (this.html) return;  
            this.html = html;  
        };  
  
        this.render = function (js) {  
            if (!this.html) this.create();  
            return js ? this.html[0] : this.html;  
        };  
  
        this.update = function (data) {  
            if (!data) return;  
            if (!this.html) this.create();  
  
            this.html.find('.new-interface-info__title').text(data.title || data.name || '');  
            Lampa.Background.change(Lampa.Utils.cardImgBackground(data));  
            this.load(data);  
        };  
  
        this.load = function (data) {  
            if (!data || !data.id) return;  
  
            const source = data.source || 'tmdb';  
            if (source !== 'tmdb' && source !== 'cub') return;  
            if (!Lampa.TMDB || typeof Lampa.TMDB.api !== 'function' || typeof Lampa.TMDB.key !== 'function') return;  
  
            const preload = false;  
            const type = data.media_type === 'tv' || data.name ? 'tv' : 'movie';  
            const language = Lampa.Storage.get('language');  
            const shortLang = (language || 'en').split('-')[0];  
            const url = Lampa.TMDB.api(`${type}/${data.id}?api_key=${Lampa.TMDB.key()}&append_to_response=content_ratings,release_dates,images&include_image_language=${shortLang},en,null&language=${language}`);  
  
            this.currentUrl = url;  
  
            if (loaded[url]) {  
                if (!preload) this.draw(loaded[url]);  
                return;  
            }  
  
            clearTimeout(timer);  
  
            timer = setTimeout(() => {  
                network.clear();  
                network.timeout(5000);  
                network.silent(url, (movie) => {  
                    loaded[url] = movie;  
                    if (!preload && this.currentUrl === url) this.draw(movie);  
                });  
            }, 0);  
        };  
  
        this.draw = function (movie) {  
            if (!movie || !this.html) return;  
  
            const titleText = (movie.title || movie.name || '') + '';  
            const titleNode = this.html.find('.new-interface-info__title');  
            const headNode = this.html.find('.new-interface-info__head');  
              
            titleNode.text(titleText);  
            applyInfoTitleLogo(this.html, titleNode, headNode, movie, titleText);  
        };  
  
        this.empty = function () {};  
  
        this.destroy = function () {  
            html.remove();  
            loaded = {};  
            html = null;  
        };  
    }  
  
    function component(object) {  
        var network = new Lampa.Reguest();  
        var scroll = new Lampa.Scroll({  
            mask: true,  
            over: true,  
            scroll_by_item: true  
        });  
        var items = [];  
        var html = $('<div class="new-interface"><img class="full-start__background"></div>');  
        var backgroundCache = new Map();  
  
        applyCaptionsClass(html[0]);  
        var active = 0;  
        var newlampa = Lampa.Manifest.app_digital >= 166;  
        var info;  
        var lezydata;  
        var viewall = Lampa.Storage.field('card_views_type') == 'view' || Lampa.Storage.field('navigation_type') == 'mouse';  
        var background_img = html.find('.full-start__background');  
        var background_last = '';  
        var background_timer;  
  
        this.create = function () {};  
  
        this.empty = function () {  
            var button;  
  
            if (object.source == 'tmdb') {  
                button = $('<div class="empty__footer"><div class="simple-button selector">' + Lampa.Lang.translate('change_source_on_cub') + '</div></div>');  
                button.find('.selector').on('hover:enter', function () {  
                    Lampa.Storage.set('source', 'cub');  
                    Lampa.Activity.replace({  
                        source: 'cub'  
                    });  
                });  
            }  
  
            var empty = new Lampa.Empty();  
            html.append(empty.render(button));  
            this.start = empty.start;  
            this.activity.loader(false);  
            this.activity.toggle();  
        };  
  
        this.loadNext = function () {  
            var _this = this;  
  
            if (this.next && !this.next_wait && items.length) {  
                this.next_wait = true;  
                this.next(function (new_data) {  
                    _this.next_wait = false;  
                    new_data.forEach(_this.append.bind(_this));  
                    Lampa.Layer.visible(items[active + 1].render(true));  
                }, function () {  
                    _this.next_wait = false;  
                });  
            }  
        };  
  
        this.push = function () {};  
  
        this.build = function (data) {  
            try {  
                var _this2 = this;  
  
                if (!data || !Array.isArray(data)) {  
                    console.error('Invalid data provided to build method');  
                    this.empty();  
                    return;  
                }  
  
                lezydata = data;  
                info = new create(object);  
                info.create();  
                scroll.minus(info.render());  
                data.slice(0, viewall ? data.length : 2).forEach(this.append.bind(this));  
                html.append(info.render());  
                html.append(scroll.render());  
  
                if (newlampa) {  
                    Lampa.Layer.update(html);  
                    Lampa.Layer.visible(scroll.render(true));  
                    scroll.onEnd = this.loadNext.bind(this);  
  
                    scroll.onWheel = function (step) {  
                        if (!Lampa.Controller.own(_this2)) _this2.start();  
                        if (step > 0) _this2.down();  
                        else if (active > 0) _this2.up();  
                    };  
                }  
  
                this.activity.loader(false);  
                this.activity.toggle();  
            } catch (e) {  
                console.error('Error in build method:', e);  
                this.empty();  
            }  
        };  
  
        this.append = function (element) {  
            if (!element) return;  
  
            var card = Lampa.Card(element, {  
                card_category: !!object.category,  
                card_collection: false,  
                card_tv: element.release_date || element.first_air_date || element.number_of_seasons,  
                card_watched: true,  
                card_quality: true,  
                card_episodes: element.release_date || element.first_air_date ? true : false  
            });  
  
            card.on('hover:focus', function (e) {  
                active = items.indexOf(card);  
                if (active < 0) active = 0;  
                _this2.update(card, element);  
            });  
  
            card.on('hover:enter', function () {  
                Lampa.Activity.push({  
                    url: element.url,  
                    component: 'full',  
                    id: element.id,  
                    method: element.name ? 'tv' : 'movie',  
                    source: object.source  
                });  
            });  
  
            items.push(card);  
            scroll.append(card.render(true));  
        };  
  
        this.update = function (card, element) {  
            if (info) info.update(element);  
            this.background(card, element);  
        };  
  
        this.background = function (elem) {  
            var new_background = Lampa.Api.img(elem.backdrop_path, 'w1280');  
              
            if (backgroundCache.has(new_background)) {  
                var cached = backgroundCache.get(new_background);  
                if (cached === 'loading') return;  
                background_last = new_background;  
                background_img[0].src = cached;  
                return;  
            }  
              
            clearTimeout(background_timer);  
            if (new_background == background_last) return;  
              
            backgroundCache.set(new_background, 'loading');  
              
            background_timer = setTimeout(function () {  
                background_img.removeClass('loaded');  
  
                background_img[0].onload = function () {  
                    background_img.addClass('loaded');  
                    backgroundCache.set(new_background, new_background);  
                };  
  
                background_img[0].onerror = function () {  
                    background_img.removeClass('loaded');  
                    backgroundCache.set(new_background, null);  
                };  
  
                background_last = new_background;  
                setTimeout(function () {  
                    background_img[0].src = background_last;  
                }, 300);  
            }, 1000);  
        };  
  
        this.down = function () {  
            var prevActive = active;  
            active++;  
            active = Math.min(active, items.length - 1);  
              
            if (prevActive !== active) {  
                if (!viewall) lezydata.slice(0, active + 2).forEach(this.append.bind(this));  
                Lampa.Layer.visible(items[active].render(true));  
                this.update(items[active], items[active].data);  
            }  
        };  
  
        this.up = function () {  
            var prevActive = active;  
            active--;  
            active = Math.max(active, 0);  
              
            if (prevActive !== active) {  
                Lampa.Layer.visible(items[active].render(true));  
                this.update(items[active], items[active].data);  
            }  
        };  
  
        this.start = function () {  
            if (Lampa.Controller.enabled() && items.length) {  
                Lampa.Controller.set('content');  
            }  
  
            if (newlampa) {  
                scroll.update();  
            } else {  
                Lampa.Controller.collectionSet(scroll.render());  
                Lampa.Controller.collectionFocus(items[active].render(true), scroll.render());  
            }  
        };  
  
        this.pause = function () {};  
  
        this.stop = function () {};  
  
        this.destroy = function () {  
            network.clear();  
            Lampa.Arrays.destroy(items);  
            scroll.destroy();  
            if (info) info.destroy();  
              
            clearTimeout(background_timer);  
              
            if (typeof backgroundCache !== 'undefined') {  
                backgroundCache.clear();  
            }  
              
            html.off();  
              
            html.remove();  
            items = null;  
            network = null;  
            lezydata = null;  
            background_img = null;  
            backgroundCache = null;  
        };  
  
        this.render = function () {  
            return html;  
        };  
    }  
  
    function addStyleV3() {  
        if (addStyleV3.added) return;  
        addStyleV3.added = true;  
  
        Lampa.Template.add('new_interface_style_v3', `<style>  
.new-interface {  
    position: relative;  
    --ni-info-h: clamp(15em, 34vh, 24em);  
}  
  
.new-interface {  
    --ni-card-w: clamp(35px, 2.8vw, 60px);  
}  
  
.new-interface .card--small,  
.new-interface .card-more {  
    width: var(--ni-card-w) !important;  
}  
  
.new-interface .card-more__box {  
    padding-bottom: 150%;  
}  
  
.new-interface-info {  
    position: relative;  
    padding: 1.5em;  
    height: auto !important;  
    min-height: 200px !important;  
    max-height: 250px !important;  
    overflow: visible !important;  
    z-index: 3;  
    display: flex !important;  
    align-items: center !important;  
}  
  
.new-interface-info:before {  
    display: none !important;  
}  
  
.new-interface-info__body {  
    position: relative;  
    z-index: 1;  
    width: 100%;  
    padding-top: 0;  
    display: block !important;  
}  
  
.new-interface-info__left {  
    width: 100%;  
    display: flex;  
    align-items: center;  
    min-height: 120px;  
}  
  
.new-interface-info__title {  
    font-size: clamp(2.6em, 4.0vw, 3.6em);  
    font-weight: 600;  
    margin: 0;  
    display: flex;  
    align-items: center;  
    min-height: 120px;  
    max-height: 120px;  
    overflow: visible;  
}  
  
.new-interface-info__title-logo {  
    max-width: 400px !important;  
    max-height: var(--ni-logo-max-h, 120px) !important;  
    width: auto !important;  
    height: auto !important;  
    object-fit: contain !important;  
    object-position: left center !important;  
}  
  
/* Плавніші переходи для карток */  
.new-interface .card {  
    transition: transform 0.15s ease, opacity 0.15s ease;  
}  
  
.new-interface .card.focus {  
    transition: transform 0.1s ease-out;  
}  
  
/* Анімація появи логотипів */  
.new-interface-info__title-logo {  
    animation: logo-fade-in 0.3s ease-out;  
}  
  
@keyframes logo-fade-in {  
    from {  
        opacity: 0;  
        transform: scale(0.95);  
    }  
    to {  
        opacity: 1;  
        transform: scale(1);  
    }  
}  
  
.new-interface .full-start__background {  
    height: 108%;  
    top: -6em;  
}  
  
.new-interface .full-start__rate {  
    font-size: 1.3em;  
    margin-right: 0;  
}  
  
.new-interface .full-start__lines {  
    padding-bottom: env(safe-area-inset-bottom, 0px);  
}  
  
.new-interface .items-line__head {  
    position: relative;  
    z-index: 5;  
    transform: translateY(4vh);  
}  
  
.new-interface {  
    --ni-lines-up: -4vh;  
}  
  
.new-interface .items-line__body > .scroll.scroll--horizontal,  
.new-interface .items-line__body .scroll.scroll--horizontal {  
    position: relative;  
    top: calc(var(--ni-lines-up) * -1);  
}  
  
.new-interface .card__promo {  
    display: none;  
}  
  
.new-interface .card .card-watched {  
    display: none !important;  
}  
  
body.light--version .new-interface-info__body {  
    width: min(92%, 72em);  
    padding-top: 1.5em;  
}  
  
@media (max-height: 820px) {  
    .new-interface {  
        --ni-info-h: clamp(13em, 30vh, 20em);  
    }  
    .new-interface {  
        --ni-card-w: clamp(60px, 4.2vw, 90px);  
    }  
      
    .new-interface-info__right {  
        padding-top: clamp(0.15em, 1.8vh, 1.2em);  
    }  
      
    .new-interface-info__title {  
        min-height: auto !important;  
        max-height: none !important;  
        height: auto !important;  
        overflow: visible !important;  
        line-height: normal !important;  
        -webkit-line-clamp: unset !important;  
        line-clamp: unset !important;  
    }  
      
    .new-interface-info__description {  
        -webkit-line-clamp: 6;  
        line-clamp: 6;  
        font-size: 0.83em;  
    }  
}  
  
body.advanced--animation:not(.no--animation) .new-interface .card.focus .card__view,  
body.advanced--animation:not(.no--animation) .new-interface .card--small.focus .card__view {  
    animation: animation-card-focus 0.2s;  
}  
  
body.advanced--animation:not(.no--animation) .new-interface .card.animate-trigger-enter .card__view,  
body.advanced--animation:not(.no--animation) .new-interface .card--small.animate-trigger-enter .card__view {  
    animation: animation-trigger-enter 0.2s forwards;  
}  
</style>  
    `);  
      
    $('body').append(Lampa.Template.get('new_interface_style_v3', {}, true));  
}  
  
function startPlugin() {  
    if (window.plugin_interface_ready || window.plugin_interface_ready_v3) return;  
      
    Lampa.Listener.follow('full', (e) => {  
        if (e.type === 'complite') {  
            const info = new InterfaceInfo(e.data.movie);  
            info.create();  
            e.data.body.append(info.render());  
            info.update(e.data.movie);  
        }  
    });  
  
    Lampa.Listener.follow('scroll', (e) => {  
        if (e.type === 'create') {  
            attachLineHandlers(e.data.scroll, e.data.scroll, e.data.object);  
        }  
    });  
  
    Lampa.Storage.listener.follow('change', (e) => {  
        if (e.name === 'ni_card_captions') {  
            applyCaptionsToAll();  
        }  
    });  
  
    addStyleV3();  
    window.plugin_interface_ready_v3 = true;  
}  
  
// Запуск плагіна  
if (!window.plugin_interface_ready && !window.plugin_interface_ready_v3) {  
    startPlugin();  
}  
  
})(); 
