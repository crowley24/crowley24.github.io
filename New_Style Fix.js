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
  
        const add = (cfg) => { try { Lampa.SettingsApi.addParam(cfg); } catch (e) {} };  
  
        add({  
            component: 'interface',  
            param: {  
                key: 'logo_show',  
                name: 'Показувати логотипи замість назв',  
                default: true,  
                values: [  
                    { name: 'Так', value: true },  
                    { name: 'Ні', value: false }  
                ]  
            },  
            onChange: () => {  
                applyCaptionsToAll();  
                Lampa.Controller.toggle('content');  
            }  
        });  
  
        add({  
            component: 'interface',  
            param: {  
                key: 'logo_language',  
                name: 'Мова логотипів',  
                default: 'uk',  
                values: [  
                    { name: 'Українська', value: 'uk' },  
                    { name: 'Англійська', value: 'en' }  
                ]  
            }  
        });  
  
        add({  
            component: 'interface',  
            param: {  
                key: 'logo_size',  
                name: 'Розмір логотипів',  
                default: 'w500',  
                values: [  
                    { name: 'Маленькі (w300)', value: 'w300' },  
                    { name: 'Середні (w500)', value: 'w500' },  
                    { name: 'Великі (w780)', value: 'w780' },  
                    { name: 'Оригінальні', value: 'original' }  
                ]  
            }  
        });  
  
        add({  
            component: 'interface',  
            param: {  
                key: 'logo_height',  
                name: 'Максимальна висота логотипів',  
                default: 'clamp(2.4em, 7vh, 4.2em)',  
                values: [  
                    { name: 'Авто', value: '' },  
                    { name: 'Маленькі', value: 'clamp(1.8em, 5vh, 3em)' },  
                    { name: 'Середні', value: 'clamp(2.4em, 7vh, 4.2em)' },  
                    { name: 'Великі', value: 'clamp(3em, 9vh, 5.5em)' }  
                ]  
            },  
            onChange: applyLogoCssVars  
        });  
  
        add({  
            component: 'interface',  
            param: {  
                key: 'logo_animation',  
                name: 'Анімація логотипів',  
                default: 'css',  
                values: [  
                    { name: 'CSS', value: 'css' },  
                    { name: 'JavaScript', value: 'js' }  
                ]  
            }  
        });  
  
        add({  
            component: 'interface',  
            param: {  
                key: 'logo_hide_year',  
                name: 'Приховати рік/країну при логотипі',  
                default: true,  
                values: [  
                    { name: 'Так', value: true },  
                    { name: 'Ні', value: false }  
                ]  
            }  
        });  
  
        add({  
            component: 'interface',  
            param: {  
                key: 'ni_card_captions',  
                name: 'Показувати підписи під карточками',  
                default: true,  
                values: [  
                    { name: 'Так', value: true },  
                    { name: 'Ні', value: false }  
                ]  
            },  
            onChange: applyCaptionsToAll  
        });  
  
        add({  
            component: 'interface',  
            param: {  
                key: 'logo_cache_clear',  
                name: 'Очистити кеш логотипів',  
                default: false,  
                values: [  
                    { name: 'Очистити', value: true }  
                ]  
            },  
            onChange: (value) => {  
                if (value) {  
                    try {  
                        const keys = [];  
                        for (let i = 0; i < localStorage.length; i++) {  
                            const key = localStorage.key(i);  
                            if (key && key.indexOf(LOGO_CACHE_PREFIX) === 0) {  
                                keys.push(key);  
                            }  
                        }  
                        keys.forEach(key => localStorage.removeItem(key));  
                        Lampa.Noty.show('Кеш логотипів очищено');  
                    } catch (e) {}  
                }  
            }  
        });  
    }  
  
    class LogoEngine {  
        constructor() {  
            this.cache = {};  
            this.network = new Lampa.Reguest();  
        }  
  
        enabled() {  
            return !!Lampa.Storage.get('logo_show', true);  
        }  
  
        getLanguage() {  
            return Lampa.Storage.get('logo_language', 'uk');  
        }  
  
        getSize() {  
            return Lampa.Storage.get('logo_size', 'w500');  
        }  
  
        animationType() {  
            return Lampa.Storage.get('logo_animation', 'css');  
        }  
  
        getCacheKey(movie, size, lang) {  
            const id = movie.id || movie.movie_id;  
            const type = movie.media_type === 'tv' || movie.name ? 'tv' : 'movie';  
            return `${LOGO_CACHE_PREFIX}${type}_${id}_${size}_${lang}`;  
        }  
  
        getLogoUrl(movie, callback) {  
            if (!this.enabled()) {  
                callback(null);  
                return;  
            }  
  
            const size = this.getSize();  
            const lang = this.getLanguage();  
            const cacheKey = this.getCacheKey(movie, size, lang);  
  
            try {  
                const cached = localStorage.getItem(cacheKey);  
                if (cached) {  
                    const data = JSON.parse(cached);  
                    if (data && data.url) {  
                        callback(data.url);  
                        return;  
                    }  
                }  
            } catch (e) {}  
  
            const type = movie.media_type === 'tv' || movie.name ? 'tv' : 'movie';  
            const url = Lampa.TMDB.api(`${type}/${movie.id}/images?api_key=${Lampa.TMDB.key()}&include_image_language=${lang},en,null`);  
  
            this.network.clear();  
            this.network.timeout(8000);  
            this.network.silent(url, (response) => {  
                try {  
                    const logos = response.logos || [];  
                    const logo = logos.find(l => l.aspect_ratio > 1.5 && l.aspect_ratio < 3.5) || logos[0];  
                      
                    if (logo) {  
                        const logoUrl = `https://image.tmdb.org/t/p/${size}${logo.file_path}`;  
                          
                        try {  
                            localStorage.setItem(cacheKey, JSON.stringify({ url: logoUrl }));  
                        } catch (e) {}  
                          
                        callback(logoUrl);  
                    } else {  
                        callback(null);  
                    }  
                } catch (e) {  
                    callback(null);  
                }  
            }, () => {  
                callback(null);  
            });  
        }  
  
        setImageSizing(img, textHeight) {  
            try {  
                const maxHeight = Lampa.Storage.get('logo_height', '');  
                if (maxHeight) {  
                    img.style.maxHeight = maxHeight;  
                } else if (textHeight && textHeight > 0) {  
                    img.style.maxHeight = (textHeight * 1.2) + 'px';  
                }  
            } catch (e) {}  
        }  
  
        swapContent(container, newNode) {  
            try {  
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
            } catch (e) { }  
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
        if (window.__ni_interface2_v3_ready) return;  
        window.__ni_interface2_v3_ready = true;  
  
        Lampa.Maker.map({  
            'main': {  
                component: 'main',  
                template: 'new_interface_main',  
                create: InterfaceMain  
            }  
        });  
  
        addStyleV3();  
    }  
  
    function addStyleV3() {  
        Lampa.Template.add('new_interface_style_v3', `  
<style>  
/* Застосовуємо розміри карточок для всіх пристроїв, включаючи Smart TV */  
.new-interface{  
    --ni-card-w: clamp(85px, 5.5vw, 130px);  
}  
  
.new-interface .card--small,  
.new-interface .card-more{  
    width: var(--ni-card-w) !important;  
}  
  
/* Верхній інфо-блок */  
.new-interface-info{  
    position: relative;  
    padding: 1.5em;  
    height: var(--ni-info-h);  
    overflow: hidden;  
    z-index: 3;  
}  
  
.new-interface-info:before{  
    display: none !important;  
}  
  
.new-interface-info__body{  
    position: relative;  
    z-index: 1;  
    width: min(96%, 78em);  
    padding-top: 1.1em;  
    display: grid;  
    grid-template-columns: minmax(0, 1fr);  
    align-items: start;  
}  
  
.new-interface-info__left{  
    min-width: 0;  
}  
  
.new-interface-info__head{  
    color: rgba(255, 255, 255, 0.6);  
    margin-bottom: 1em;  
    font-size: 1.3em;  
    min-height: 1em;  
}  
  
.new-interface-info__head span{  
    color: #fff;  
}  
  
.new-interface-info__title{  
    font-size: clamp(2.6em, 4.0vw, 3.6em);  
    font-weight: 600;  
    margin-bottom: 0.3em;  
    overflow: hidden;  
    -o-text-overflow: '.';  
    text-overflow: '.';  
    display: -webkit-box;  
    -webkit-line-clamp: 1;  
    line-clamp: 1;  
    -webkit-box-orient: vertical;  
    margin-left: -0.03em;  
    line-height: 1.25;  
}  
  
.new-interface-info__title-logo{  
    max-width: 100%;  
    max-height: var(--ni-logo-max-h, clamp(2.4em, 7vh, 4.2em));  
    display: block;  
    object-fit: contain;  
}  
  
.new-interface-full-logo{  
    max-height: var(--ni-logo-max-h, 125px);  
    width: auto;  
    max-width: 100%;  
    object-fit: contain;  
    display: block;  
}  
  
/* Приховування підписів під карточками */  
.new-interface.ni-hide-captions .card__view ~ .card__title,  
.new-interface.ni-hide-captions .card__view ~ .card__name,  
.new-interface.ni-hide-captions .card__view ~ .card__text,  
.new-interface.ni-hide-captions .card__view ~ .card__details,  
.new-interface.ni-hide-captions .card__view ~ .card__description,  
.new-interface.ni-hide-captions .card__view ~ .card__subtitle,  
.new-interface.ni-hide-captions .card__view ~ .card__year,  
.new-interface.ni-hide-captions .card__view ~ .card__bottom,  
.new-interface.ni-hide-captions .card__view ~ .card__caption{  
    display: none !important;  
}  
  
.new-interface.ni-hide-captions .card > *:not(.card__view):not(.card__promo){  
    display: none !important;  
}  
  
.new-interface .full-start__background{  
    height: 108%;  
    top: -6em;  
}  
  
.new-interface .full-start__rate{  
    font-size: 1.3em;  
    margin-right: 0;  
}  
  
.new-interface .full-start__lines{  
    padding-bottom: env(safe-area-inset-bottom, 0px);  
}  
  
.new-interface .items-line__head{  
    position: relative;  
    z-index: 5;  
    transform: translateY(calc(var(--ni-lines-up) * -1));  
}  
  
.new-interface{  
    --ni-lines-up: 1vh;  
}  
.new-interface .items-line__body > .scroll.scroll--horizontal,  
.new-interface .items-line__body .scroll.scroll--horizontal{  
    position: relative;  
    top: calc(var(--ni-lines-up) * -1);  
}  
  
.new-interface .card__promo{  
    display: none;  
}  
  
.new-interface .card .card-watched{  
    display: none !important;  
}  
  
body.light--version .new-interface-info__body{  
    width: min(92%, 72em);  
    padding-top: 1.5em;  
}  
  
@media (max-height: 820px){  
    .new-interface{  
        --ni-info-h: clamp(13em, 30vh, 20em);  
    }  
    .new-interface{  
        --ni-card-w: clamp(75px, 5vw, 120px);  
    }  
  
    .new-interface-info__title{  
        font-size: clamp(2.4em, 3.6vw, 3.1em);  
    }  
}  
  
body.advanced--animation:not(.no--animation) .new-interface .card.focus .card__view,  
body.advanced--animation:not(.no--animation) .new-interface .card--small.focus .card__view{  
    animation: animation-card-focus 0.2s;  
}  
  
body.advanced--animation:not(.no--animation) .new-interface .card.animate-trigger-enter .card__view,  
body.advanced--animation:not(.no--animation) .new-interface .card--small.animate-trigger-enter .card__view{  
    animation: animation-trigger-enter 0.2s forwards;  
}  
</style>  
    `);  
        $('body').append(Lampa.Template.get('new_interface_style_v3', {}, true));  
    }  
  
    // Запуск плагіна  
    if (Lampa.Manifest.app_digital >= 300) {  
        startPluginV3();  
    }  
  
})();
