(function () {      
    'use strict';      
    const PLUGIN_NAME = 'NewCard';      
    const PLUGIN_ID = 'new_card_style';      
    const ASSETS_PATH = 'https://crowley38.github.io/Icons/';      
    const CACHE_LIFETIME = 1000 * 60 * 60 * 24;      
    
    let currentInterval = null; 

    const ICONS = {      
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',      
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'      
    };      
    const QUALITY_ICONS = {      
        '4K': ASSETS_PATH + '4K.svg',      
        '2K': ASSETS_PATH + '2K.svg',      
        'FULL HD': ASSETS_PATH + 'FULL HD.svg',      
        'HD': ASSETS_PATH + 'HD.svg',      
        'HDR': ASSETS_PATH + 'HDR.svg',      
        'Dolby Vision': ASSETS_PATH + 'Dolby Vision.svg',      
        'UKR': ASSETS_PATH + 'UKR.svg'      
    };      
    const SETTINGS_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/><rect x="25" y="66" width="30" height="6" rx="3" fill="white" opacity="0.6"/><rect x="60" y="66" width="15" height="6" rx="3" fill="white" opacity="0.6"/></svg>`;      
      
    const TRANSLATIONS = {      
        'settings_cas_logo_quality': 'Якість логотипу',      
        'settings_cas_logo_scale': 'Розмір логотипу',      
        'settings_cas_meta_size': 'Розмір шрифту',      
        'settings_cas_blocks_gap': 'Відступи між блоками',      
        'settings_cas_bg_animation': 'Анімація фону (Ken Burns)',      
        'settings_cas_slideshow_enabled': 'Слайд-шоу фону',      
        'settings_cas_show_studios': 'Показувати студії',      
        'settings_cas_show_quality': 'Показувати якість',      
        'settings_cas_show_rating': 'Показувати рейтинги',      
        'settings_cas_show_description': 'Опис фільму'      
    };      
      
    let debounceTimer;      
    function debounce(func, delay) {      
        return function() {      
            const context = this;      
            const args = arguments;      
            clearTimeout(debounceTimer);      
            debounceTimer = setTimeout(() => func.apply(context, args), delay);      
        };      
    }      
      
    function preloadImage(src) {      
        return new Promise((resolve, reject) => {      
            const img = new Image();      
            img.onload = () => resolve(img);      
            img.onerror = reject;      
            img.src = src;      
        });      
    }      
      
    function getRatingColor(val) {      
        const n = parseFloat(val);      
        return n >= 7.5 ? '#2ecc71' : n >= 6 ? '#feca57' : '#ff4d4d';      
    }      
      
    function formatTime(mins) {      
        if (!mins) return '';      
        const h = Math.floor(mins / 60);      
        const m = mins % 60;      
        return (h > 0 ? h + 'г ' : '') + m + 'хв';      
    }      
      
    function initializePlugin() {      
        addCustomTemplate();      
        addStyles();      
        addSettings();      
        attachLoader();      
    }      
      
    function addSettings() {      
        const defaults = {      
            'cas_logo_scale': '100',      
            'cas_logo_quality': 'original',      
            'cas_bg_animation': true,      
            'cas_slideshow_enabled': true,      
            'cas_blocks_gap': '20',      
            'cas_meta_size': '1.3',      
            'cas_show_studios': true,      
            'cas_show_quality': true,      
            'cas_show_rating': true,      
            'cas_show_description': true      
        };      
      
        Object.keys(defaults).forEach(key => {      
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);      
        });      
      
        Lampa.SettingsApi.addComponent({      
            component: PLUGIN_ID,      
            name: PLUGIN_NAME,      
            icon: SETTINGS_ICON      
        });      
              
        const params = [      
            { name: 'cas_logo_quality', type: 'select', values: { 'w300':'300px', 'w500':'500px', 'original':'Original' } },      
            { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' } },      
            { name: 'cas_meta_size', type: 'select', values: { '1.2': 'Малий', '1.3': 'Стандартний', '1.4': 'Збільшений', '1.5': 'Великий' } },      
            { name: 'cas_blocks_gap', type: 'select', values: { '15':'Тісно','20':'Стандарт','25':'Просторе' } },      
            { name: 'cas_bg_animation', type: 'trigger' },      
            { name: 'cas_slideshow_enabled', type: 'trigger' },      
            { name: 'cas_show_studios', type: 'trigger' },      
            { name: 'cas_show_quality', type: 'trigger' },      
            { name: 'cas_show_rating', type: 'trigger' },      
            { name: 'cas_show_description', type: 'trigger' }      
        ];      
      
        params.forEach(p => {      
            Lampa.SettingsApi.addParam({      
                component: PLUGIN_ID,      
                param: { name: p.name, type: p.type, values: p.values, default: defaults[p.name] },      
                field: { name: TRANSLATIONS['settings_' + p.name] },      
                onChange: applySettings      
            });      
        });      
        applySettings();      
    }      
      
    function applySettings() {      
        const root = document.documentElement;      
        const scale = parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100;      
        const gap = Lampa.Storage.get('cas_blocks_gap') || '20';      
        const metaSize = Lampa.Storage.get('cas_meta_size') || '1.3';      
        root.style.setProperty('--cas-logo-scale', scale);      
        root.style.setProperty('--cas-blocks-gap', gap + 'px');      
        root.style.setProperty('--cas-meta-size', metaSize + 'em');      
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));      
    }      
      
    function addCustomTemplate() {           
        // ВИДАЛЕНО кастомний блок кнопок. Залишено стандартні класи Lampa для кнопок.
        const template = `<div class="full-start-new left-title">          
            <div class="full-start-new__body">          
                <div class="full-start-new__left hide">          
                    <div class="full-start-new__poster">          
                        <img class="full-start-new__img full--poster" />          
                    </div>          
                </div>          
                <div class="full-start-new__right">          
                    <div class="left-title__content">          
                        <div class="cas-logo-container" style="margin-bottom: var(--cas-blocks-gap);">        
                            <div class="cas-logo"></div>        
                        </div>        
                        <div class="cas-studios-row" style="display: flex; gap: 15px; align-items: center; margin-bottom: 12px;"></div>        
                        <div class="cas-ratings-line">        
                            <div class="cas-rate-items" style="display: flex; align-items: center; gap: 12px;"></div>        
                            <div class="cas-meta-info"></div>        
                            <div class="cas-quality-row" style="display: flex; gap: 8px; align-items: center;"></div>        
                        </div>        
                        <div class="cas-description" style="margin-top: var(--cas-blocks-gap);"></div>        
                        
                        <div class="cas-details-wrapper" style="margin-top: 10px;">      
                            <div class="full-start-new__head"></div>          
                            <div class="full-start-new__details hide"></div>          
                        </div>      
                        
                        <div class="full-start-new__buttons"></div>          
                    </div>          
                    <div class="full-start-new__reactions selector hide"></div>          
                    <div class="full-start-new__rate-line hide"></div>          
                    <div class="rating--modss" style="display: none;"></div>          
                </div>          
            </div>          
        </div>`;          
        Lampa.Template.add('full_start_new', template);          
    }      
      
    function addStyles() {      
        if ($('#cas-main-styles').length) return; 
        const styles = `<style id="cas-main-styles">      
        :root { --cas-logo-scale: 1; --cas-blocks-gap: 30px; --cas-meta-size: 1.3em; --cas-anim-curve: cubic-bezier(0.2, 0.8, 0.2, 1); }      
        .full-start__background { will-change: transform; transform: translateZ(0); transition: opacity 0.8s ease; }      
        .full-start__background { transform: scale(1.1); transition: transform 0.8s ease-out, opacity 0.8s ease; }    
        .cas-animated .full-start__background { transform: scale(1); }    
        .cas-logo, .cas-studios-row, .cas-rate-items, .cas-meta-info, .cas-quality-row, .cas-description {     
            opacity: 0 !important; transform: translateY(10px); transition: opacity 0.4s var(--cas-anim-curve), transform 0.4s var(--cas-anim-curve);     
        }      
        .cas-animated .cas-logo { opacity: 1 !important; transform: translateY(0); transition-delay: 0s; }      
        .cas-animated .cas-studios-row { opacity: 0.9 !important; transform: translateY(0); transition-delay: 0.1s; }      
        .cas-animated .cas-rate-items { opacity: 1 !important; transform: translateY(0); transition-delay: 0.2s; }      
        .cas-animated .cas-meta-info { opacity: 0.7 !important; transform: translateY(0); transition-delay: 0.3s; }      
        .cas-animated .cas-quality-row { opacity: 0.9 !important; transform: translateY(0); transition-delay: 0.4s; }      
        .cas-animated .cas-description { opacity: 0.7 !important; transform: translateY(0); transition-delay: 0.15s; }
        .full-start-new__details { display: none !important; }      
        .full-start-new__head { display: block !important; margin: 0 !important; padding: 0 !important; font-size: 0.9em; }      
        
        /* Стилізація стандартних кнопок Lampa */
        .full-start-new__buttons { display: flex !important; flex-wrap: wrap; gap: 15px; margin-top: 1.5em; opacity: 0; transform: translateY(10px); transition: all 0.5s ease; }
        .cas-animated .full-start-new__buttons { opacity: 1; transform: translateY(0); transition-delay: 0.5s; }
        
        .full-start-new__buttons .selector { 
            background: rgba(255,255,255,0.08) !important; 
            border: 2px solid transparent !important; 
            border-radius: 10px !important; 
            padding: 10px 20px !important; 
            display: flex; align-items: center; gap: 8px; 
            transition: all 0.2s ease !important;
        }
        .full-start-new__buttons .selector.focus { 
            background: rgba(255,255,255,0.2) !important; 
            border-color: #fff !important; 
            transform: scale(1.05); 
        }

        .cas-logo img { background: transparent !important; border: none !important; max-width: 450px; max-height: 180px; transform: scale(var(--cas-logo-scale)); transform-origin: left bottom; }      
        .cas-studio-item img { height: 18px; filter: drop-shadow(0 0 2px rgba(255,255,255,0.8)); opacity: 0.9; }      
        .cas-description { font-size: var(--cas-meta-size) !important; line-height: 1.4; color: rgba(255,255,255,0.7); display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; max-width: 650px; }      
        .cas-ratings-line { display: flex; align-items: center; gap: 15px; margin-bottom: 5px; font-size: var(--cas-meta-size); font-weight: 600; height: 30px; }      
        .cas-rate-item { display: flex; align-items: center; gap: 6px; }      
        .left-title .full-start-new__body { height: 85vh; }      
        .left-title .full-start-new__right { display: flex; align-items: flex-end; justify-content: flex-start; padding-bottom: 4vh; padding-left: 2%; }      
        @keyframes casKenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }      
        body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 45s linear infinite !important; }      
        </style>`;      
        Lampa.Template.add('left_title_css', styles);      
        $('body').append(Lampa.Template.get('left_title_css', {}, true));      
    }      
      
    function getCachedData(id) {      
        const cache = Lampa.Storage.get('cas_images_cache') || {};      
        const item = cache[id];      
        if (item && (Date.now() - item.time < CACHE_LIFETIME)) return item.data;      
        return null;      
    }      
      
    function setCachedData(id, data) {      
        const cache = Lampa.Storage.get('cas_images_cache') || {};      
        cache[id] = { time: Date.now(), data: data };      
        Lampa.Storage.set('cas_images_cache', cache);      
    }      
      
    function cleanup() {      
        if (currentInterval) { clearInterval(currentInterval); currentInterval = null; }      
        $('.left-title__content').removeClass('cas-animated');
    }      
      
    function startSlideshow(render, backdrops) {      
        if (currentInterval) clearInterval(currentInterval);      
        let idx = 0;      
        currentInterval = setInterval(() => {      
            const bg = render.find('.full-start__background img, img.full-start__background');      
            if (!bg.length) return clearInterval(currentInterval);      
            idx = (idx + 1) % Math.min(backdrops.length, 15);      
            const nextSrc = Lampa.TMDB.image('/t/p/original' + backdrops[idx].file_path);      
            bg.css('opacity', '0');      
            setTimeout(() => { bg.attr('src', nextSrc); bg.css('opacity', '1'); }, 800);      
        }, 15000);      
    }      
      
    async function processImages(render, data, res) {      
        const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];      
        if (bestLogo) {      
            const quality = Lampa.Storage.get('cas_logo_quality') || 'original';      
            const logoSrc = Lampa.TMDB.image('/t/p/' + quality + bestLogo.file_path);      
            await preloadImage(logoSrc);      
            render.find('.cas-logo').html(`<img src="${logoSrc}">`);      
        } else {      
            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);      
        }      
        if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops?.length > 1) {      
            startSlideshow(render, res.backdrops);      
        }      
    }      
      
    function attachLoader() {    
        Lampa.Listener.follow('full', (event) => {    
            if (event.type === 'complite') {    
                const data = event.data.movie;    
                const render = event.object.activity.render();    
                const content = render.find('.left-title__content');    
                
                content.removeClass('cas-animated');    
                event.object.activity.onBeforeDestroy = cleanup;    
                
                // Дозволяємо Lampa відрендерити СТАНДАРТНІ кнопки в наш контейнер
                if (event.object.buttons) {
                    const btns = event.object.buttons.render();
                    render.find('.full-start-new__buttons').append(btns);
                }
                    
                if (data && data.id) {    
                    const cacheId = 'tmdb_' + data.id;    
                    const cached = getCachedData(cacheId);    
                    if (cached) processImages(render, data, cached);    
                    else {    
                        const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());    
                        $.getJSON(imagesUrl, (res) => { setCachedData(cacheId, res); processImages(render, data, res); });    
                    }    
                    
                    // Завантаження описів та рейтингів
                    if (Lampa.Storage.get('cas_show_description')) render.find('.cas-description').text(data.overview || '').show();
                    const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);
                    render.find('.cas-rate-items').html(`<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>`);
                    
                    const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));
                    const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');
                    render.find('.cas-meta-info').text((time ? time + (genre ? ' • ' : '') : '') + genre);
                }    
                    
                setTimeout(() => content.addClass('cas-animated'), 100);    
            }    
        });    
    }  
      
    function startPlugin() { initializePlugin(); }      
    if (window.appready) startPlugin();      
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });      
})();
