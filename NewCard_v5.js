(function () {                
    'use strict';                
    const PLUGIN_NAME = 'NewCard';                
    const PLUGIN_ID = 'new_card_style';                
    const ASSETS_PATH = 'https://crowley38.github.io/Icons/';                
    const CACHE_LIFETIME = 1000 * 60 * 60 * 24; // 24 години  
    
    const memoryCache = new Map();

    let currentInterval = null;            
    let activeRequest = null;
            
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
        'UKR': ASSETS_PATH + 'UKR.svg',  
        '7.1': ASSETS_PATH + '7.1.svg',  
        '5.1': ASSETS_PATH + '5.1.svg',  
        '4.0': ASSETS_PATH + '4.0.svg',  
        '2.0': ASSETS_PATH + '2.0.svg',  
        'DUB': ASSETS_PATH + 'DUB.svg'  
    };                
    const SETTINGS_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/><rect x="25" y="66" width="30" height="6" rx="3" fill="white" opacity="0.6"/><rect x="60" y="66" width="15" height="6" rx="3" fill="white" opacity="0.6"/></svg>`;                
                
    const TRANSLATIONS = {                
        'settings_cas_logo_quality': 'Якість логотипу',                
        'settings_cas_logo_scale': 'Розмір логотипу',                
        'settings_cas_meta_size': 'Розмір шрифту',                
        'settings_cas_blocks_gap': 'Відступи між блоками',                
        'settings_cas_bg_animation': 'Анімація фону (Ken Burns)',                
        'settings_cas_animation_style': 'Стиль анімації появу',
        'settings_cas_slideshow_enabled': 'Слайд-шоу фону',                
        'settings_cas_show_studios': 'Показувати студії',                
        'settings_cas_show_quality': 'Показувати якість',                
        'settings_cas_show_rating': 'Показувати рейтинги',                
        'settings_cas_show_description': 'Опис фільму'                
    };                
                
    let debounceTimer;                
    function debounce(func, delay) {                
        return function(...args) {                
            clearTimeout(debounceTimer);                
            debounceTimer = setTimeout(() => func.apply(this, args), delay);                
        };                
    }                
                
    function preloadImage(src) {                
        return new Promise((resolve) => {                
            if (!src) return resolve(null);
            const img = new Image();                
            img.onload = () => resolve(img);                
            img.onerror = () => resolve(null);              
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
        return (h > 0 ? h + 'г ' : '') + (m > 0 ? m + 'хв' : '');                
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
            'cas_animation_style': 'slide',
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
            { name: 'cas_meta_size', type: 'select', values: { '1.1': 'Міні', '1.2': 'Малий', '1.3': 'Стандартний', '1.4': 'Збільшений', '1.5': 'Великий' } },                
            { name: 'cas_blocks_gap', type: 'select', values: { '10':'Дуже тісно','15':'Тісно','20':'Стандарт','25':'Просторе','30':'Дуже просторе' } },                
            { name: 'cas_bg_animation', type: 'trigger' },                
            { name: 'cas_animation_style', type: 'select', values: { 'slide': 'Slide from Left', 'spring': 'Elastic Spring' } },
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
        const animStyle = Lampa.Storage.get('cas_animation_style') || 'slide';
                          
        root.style.setProperty('--cas-logo-scale', scale);          
        root.style.setProperty('--cas-blocks-gap', gap + 'px');          
        root.style.setProperty('--cas-meta-size', metaSize + 'em');          
                          
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));          
        
        const currentCard = $('.full-start-new.left-title');          
        if (currentCard.length > 0) {          
            currentCard.removeClass('cas-anim-slide cas-anim-spring').addClass('cas-anim-' + animStyle);
            currentCard.find('.cas-description').toggle(!!Lampa.Storage.get('cas_show_description'));          
            currentCard.find('.cas-studios-row').toggle(!!Lampa.Storage.get('cas_show_studios'));          
            currentCard.find('.cas-quality-row').toggle(!!Lampa.Storage.get('cas_show_quality'));          
            currentCard.find('.cas-rate-items').toggle(!!Lampa.Storage.get('cas_show_rating'));          
        }          
    }               
                      
    function addCustomTemplate() {                       
        const animStyle = Lampa.Storage.get('cas_animation_style') || 'slide';
        const template = `<div class="full-start-new left-title cas-anim-${animStyle}">                      
            <div class="full-start-new__body">                      
                <div class="full-start-new__left hide">                      
                    <div class="full-start-new__poster">                      
                        <img class="full-start-new__img full--poster" />                      
                    </div>                      
                </div>                      
                <div class="full-start-new__right">                      
                    <div class="left-title__content">                      
                        <div class="cas-logo-container" style="margin-bottom: calc(var(--cas-blocks-gap) * 1.5);">  
                            <div class="cas-studios-row" style="display: flex; gap: 8px; align-items: center; margin-bottom: 10px;"></div>                  
                            <div class="cas-logo"></div>                    
                        </div>                    
                        <div class="cas-tagline" style="display: none;"></div>
                        <div class="cas-meta-line" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">      
                            <div class="cas-meta-info" style="display: flex; gap: 8px; align-items: center;"></div>      
                            <div class="cas-quality-row" style="display: flex; gap: 6px; align-items: center;"></div>      
                        </div>  
                        <div class="cas-description" style="margin-top: calc(var(--cas-blocks-gap) * 0.4);"></div>                    
                        <div class="cas-details-wrapper" style="margin-top: 10px;">                  
                            <div class="full-start-new__head hide"></div>                      
                            <div class="full-start-new__details hide"></div>                      
                        </div>                  
                        <div class="full-start-new__buttons">                      
                            <div class="full-start__button selector button--play">                      
                                <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>                      
                                <span>#{title_watch}</span>                      
                            </div>                      
                            <div class="full-start__button selector button--book">                      
                                <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg>                      
                                <span>#{settings_input_links}</span>                      
                            </div>                      
                            <div class="full-start__button selector button--reaction">                  
                                <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/><path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/></svg>              
                                <span>#{title_reactions}</span>              
                            </div>  
                            <div class="full-start__button selector button--subscribe hide">                    
                                <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">        
                                    <path d="M6.01892 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>        
                                    <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>        
                                </svg>    
                                <span>#{title_subscribe}</span>                    
                            </div>                  
                            <div class="full-start__button selector button--options">                  
                                <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg>                  
                            </div>                  
                        </div>                  
                    </div>                  
                </div>                  
            </div>                  
        </div>`;                  
        Lampa.Template.add('full_start_new', template);                  
    }              
              
    function addStyles() {  
        if ($('#cas-main-styles').length) return;  
        const styles = `<style id="cas-main-styles">  
        :root { 
            --cas-logo-scale: 1; 
            --cas-blocks-gap: 20px; 
            --cas-meta-size: 1.3em; 
            --cas-curve-slide: cubic-bezier(0.2, 0.8, 0.2, 1); 
            --cas-curve-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }  
                
        .full-start__background {  
            height: calc(100% + 6em);  
            left: 0 !important;  
            opacity: 0.35 !important;  
            transition: opacity 1s ease !important;  
        }  
          
        /* Гарантований вивід текстового блоку */
        .cas-logo, .cas-tagline, .cas-studios-row, .cas-rate-items, .cas-meta-info, .cas-quality-row, .cas-description, .full-start-new__buttons {  
            opacity: 1 !important;  
            visibility: visible !important;
        }  

        .cas-anim-slide.cas-animated .cas-logo, 
        .cas-anim-slide.cas-animated .cas-tagline, 
        .cas-anim-slide.cas-animated .cas-meta-info, 
        .cas-anim-slide.cas-animated .cas-quality-row, 
        .cas-anim-slide.cas-animated .cas-description, 
        .cas-anim-slide.cas-animated .full-start-new__buttons {  
            animation: casFadeInSlide 0.5s ease forwards;
        }

        @keyframes casFadeInSlide {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        .full-start-new__body { display: flex; height: 85vh; position: relative; width: 100%; }  
        .full-start-new__right { width: 100% !important; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start !important; text-align: left !important; padding: 4em 4em 2em 4em; position: relative; z-index: 2; }  
        .left-title__content { display: flex; flex-direction: column; align-items: flex-start !important; text-align: left !important; width: 100%; }
                            
        .cas-logo-container {  
            position: relative;  
            max-width: 100%;  
            margin-bottom: calc(var(--cas-blocks-gap) * 0.8);  
            display: flex;
            flex-direction: column;
            align-items: flex-start !important;
        }  
                            
        .cas-logo img {  
            max-width: 450px;  
            max-height: 180px;  
            width: auto;  
            height: auto;  
            transform: scale(var(--cas-logo-scale));  
            transform-origin: left center;  
            display: block;  
            object-fit: contain;  
        }  
        
        .cas-logo-text {
            font-size: 2.8em;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            color: #ffffff;
            text-shadow: 0 4px 12px rgba(0,0,0,0.8);
            line-height: 1.1;
        }

        .cas-tagline {
            font-size: calc(var(--cas-meta-size) * 0.9);
            font-style: italic;
            color: rgba(255, 255, 255, 0.85);
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
            max-width: 700px;
        }

        .cas-meta-info { display: flex; align-items: center; justify-content: flex-start !important; gap: 10px; font-size: var(--cas-meta-size); font-weight: 500; color: #fff; }  
        .cas-quality-row { display: flex; align-items: center; justify-content: flex-start !important; gap: 6px; }  

        .full-start-new__buttons { display: flex !important; justify-content: flex-start !important; align-items: center !important; gap: 10px; flex-wrap: wrap; width: 100%; margin-top: 15px; }
        .cas-studios-row { display: flex; flex-wrap: wrap; justify-content: flex-start !important; gap: 8px; margin-bottom: 8px; }  
        
        .cas-studio-item { height: 22px !important; display: flex; align-items: center; }    
        .cas-studio-item img { height: 100%; width: auto; max-width: 120px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); }    

        .cas-description { font-size: var(--cas-meta-size) !important; line-height: 1.4; color: rgba(255,255,255,0.8); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; max-width: 750px; margin-top: calc(var(--cas-blocks-gap) * 0.3); text-shadow: 0 1px 3px rgba(0,0,0,0.8); }    
        .cas-quality-item img { height: 14px; }    
        </style>`;    
        Lampa.Template.add('left_title_css', styles);    
        $('body').append(Lampa.Template.get('left_title_css', {}, true));    
    }  

    function getCachedData(id) {                
        if (memoryCache.has(id)) return memoryCache.get(id);
        const cache = Lampa.Storage.get('cas_images_cache') || {};                
        const item = cache[id];                
        if (item && (Date.now() - item.time < CACHE_LIFETIME)) {
            memoryCache.set(id, item.data);
            return item.data;
        }
        return null;                
    }                
                
    function setCachedData(id, data) {                
        memoryCache.set(id, data);
        const cache = Lampa.Storage.get('cas_images_cache') || {};                
        cache[id] = { time: Date.now(), data: data };                
        const keys = Object.keys(cache);          
        if (keys.length > 50) delete cache[keys[0]];          
        Lampa.Storage.set('cas_images_cache', cache);                
    }                
                
    function cleanup() {                
        if (currentInterval) { clearInterval(currentInterval); currentInterval = null; }
        if (activeRequest && activeRequest.abort) {
            try { activeRequest.abort(); } catch(e){}
            activeRequest = null;
        }
    }                

    function renderStudioLogos(container, data) {    
        container.empty();
        const studios = (data.networks || data.production_companies || []).filter(s => s && s.logo_path).slice(0, 2);  
            
        studios.forEach((studio) => {    
            const logoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);    
            container.append(`<div class="cas-studio-item"><img src="${logoUrl}"></div>`);    
        });    
    }    
                
    async function processImages(render, data, res) {                
        const titleText = data.title || data.name || '';
        if (res && res.logos && res.logos.length > 0) {                
            // Пріоритет: UKR логотип -> EN логотип -> Будь-який інший
            const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];                
            if (bestLogo) {        
                const quality = Lampa.Storage.get('cas_logo_quality') || 'original';                
                const logoSrc = Lampa.TMDB.image('/t/p/' + quality + bestLogo.file_path);                
                await preloadImage(logoSrc);                
                render.find('.cas-logo').html(`<img src="${logoSrc}">`);                
                return;
            }                
        }
        // Запасний вивід гарного тексту, якщо немає картинки
        render.find('.cas-logo').html(`<div class="cas-logo-text">${titleText}</div>`);
    }    

    // Швидкий і гарантований збір даних (Keywords + Fallbacks)
    function fetchTmdbDetails(data, callback) {
        const type = data.name ? 'tv' : 'movie';
        const key = Lampa.TMDB.key();
        const year = new Date(data.release_date || data.first_air_date || 0).getFullYear();
        const networks = (data.networks || data.production_companies || []).map(n => (n.name || '').toLowerCase());

        // Базові значення: картка ЗАВЖДИ має теги якості
        const result = {
            res: year >= 2016 ? '4K' : (year >= 2005 ? 'FULL HD' : 'HD'),
            hdr: year >= 2020 && networks.some(n => n.includes('apple') || n.includes('disney') || n.includes('netflix') || n.includes('hbo') || n.includes('amazon')),
            dv: false,
            ukr: true, // Беремо за замовчуванням, якщо Lampa локалізована
            dub: true
        };

        let completed = 0;
        let isDone = false;
        
        const finish = () => {
            if (!isDone) {
                isDone = true;
                callback(result);
            }
        };

        // Страховка за часом (максимум 600мс чекаємо від TMDB)
        const timer = setTimeout(finish, 600);

        const checkDone = () => {
            completed++;
            if (completed === 2) {
                clearTimeout(timer);
                finish();
            }
        };

        // Keywords (4K, HDR, Dolby Vision)
        const keywordsUrl = Lampa.TMDB.api(`${type}/${data.id}/keywords?api_key=${key}`);
        Lampa.Reguest.get(keywordsUrl, (res) => {
            if (res) {
                const kwList = (res.keywords || res.results || []).map(k => (k.name || '').toLowerCase());
                if (kwList.some(k => k.includes('dolby vision') || k.includes('dovi'))) { result.dv = true; result.hdr = true; }
                else if (kwList.some(k => k.includes('hdr') || k.includes('hdr10'))) { result.hdr = true; }
                if (kwList.some(k => k.includes('4k') || k.includes('2160p'))) { result.res = '4K'; }
            }
            checkDone();
        }, checkDone);

        // Translations (Перевірка української локалізації)
        const translationsUrl = Lampa.TMDB.api(`${type}/${data.id}/translations?api_key=${key}`);
        Lampa.Reguest.get(translationsUrl, (res) => {
            if (res && res.translations) {
                const ukTr = res.translations.find(t => t.iso_639_1 === 'uk');
                result.ukr = !!ukTr;
                result.dub = !!(ukTr && ukTr.data && (ukTr.data.title || ukTr.data.overview));
            }
            checkDone();
        }, checkDone);
    }
                
    function loadMovieDataOptimized(render, data) {    
        if (!data) return;

        // 1. Слоган
        if (data.tagline) render.find('.cas-tagline').text(`«${data.tagline}»`).show();
        else render.find('.cas-tagline').hide();

        // 2. Опис
        const overview = data.overview || Lampa.Lang.translate('full_not_descr') || '';
        render.find('.cas-description').html(overview).css('opacity','1').show();    
            
        // 3. Метадані (Рік, Час, Жанр, Рейтинг)
        const year = data.release_date ? new Date(data.release_date).getFullYear() : (data.first_air_date ? new Date(data.first_air_date).getFullYear() : '');    
        const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));    
        const genre = (data.genres && data.genres.length > 0) ? data.genres[0].name : '';    
            
        let metaHtml = '';    
        if (year) metaHtml += `<span>${year}</span>`;    
        if (time) metaHtml += `<span>• ${time}</span>`;    
        if (genre) metaHtml += `<span>• ${genre}</span>`;    
        
        const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);    
        if (tmdbV > 0) {    
            metaHtml += `<span>• <img src="${ICONS.tmdb}" style="height: 1.1em; vertical-align: middle;"> <b style="color:${getRatingColor(tmdbV)}">${tmdbV}</b></span>`;    
        }    
            
        render.find('.cas-meta-info').html(metaHtml);    

        // 4. Студії
        if (Lampa.Storage.get('cas_show_studios')) {    
            renderStudioLogos(render.find('.cas-studios-row'), data);    
        }    
            
        // 5. Плашки якостей / HDR / Дубляжу
        if (Lampa.Storage.get('cas_show_quality')) {    
            fetchTmdbDetails(data, (b) => {
                let qH = '';    
                if (b.res && QUALITY_ICONS[b.res]) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS[b.res]}"></div>`;    
                if (b.dv && QUALITY_ICONS['Dolby Vision']) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['Dolby Vision']}"></div>`;    
                else if (b.hdr && QUALITY_ICONS['HDR']) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;    
                if (b.dub && QUALITY_ICONS['DUB']) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['DUB']}"></div>`;    
                if (b.ukr && QUALITY_ICONS['UKR']) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['UKR']}"></div>`;    
                    
                render.find('.cas-quality-row').html(qH).show();  
            });
        }
    }             

    const debouncedLoadMovieData = debounce((render, data) => {                
        try { loadMovieDataOptimized(render, data); } catch (error) {}                
    }, 50);                
                
    function attachLoader() {                
        Lampa.Listener.follow('full', (event) => {                
            if (event.type === 'complite') {                
                const data = event.data.movie;                
                const render = event.object.activity.render();                
                const cardRoot = render.find('.full-start-new.left-title');                
                            
                cleanup();
                event.object.activity.onBeforeDestroy = cleanup;                
                                
                if (data && data.id) {                
                    render.data('movie', data);                
                    const cacheId = 'tmdb_img_' + data.id;                
                    const cached = getCachedData(cacheId);                
                                
                    const processImagesWrapper = async (res) => {                
                        try { await processImages(render, data, res); } 
                        catch (e) {
                            render.find('.cas-logo').html(`<div class="cas-logo-text">${data.title || data.name}</div>`);
                        } 
                        finally { cardRoot.addClass('cas-animated'); }
                    };                
                                    
                    if (cached) {
                        processImagesWrapper(cached);
                    } else {                
                        const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());                
                        
                        activeRequest = Lampa.Reguest.get(imagesUrl, (res) => {                
                            activeRequest = null;
                            setCachedData(cacheId, res);                
                            processImagesWrapper(res);                
                        }, () => {                
                            activeRequest = null;
                            render.find('.cas-logo').html(`<div class="cas-logo-text">${data.title || data.name}</div>`);                
                            cardRoot.addClass('cas-animated');
                        });                
                    }                
                                    
                    debouncedLoadMovieData(render, data);                
                } else {
                    cardRoot.addClass('cas-animated');
                }                
                                
                setTimeout(() => {                
                    const firstButton = render.find('.full-start-new__buttons .full-start__button').first();                
                    if (firstButton.length) {                
                        render.find('.full-start__button').removeClass('focus');                
                        firstButton.addClass('focus').trigger('focus');                
                    }                
                }, 100);                
            }                
        });                
    }              
                  
    function startPlugin() {                   
        try { initializePlugin(); } 
        catch (error) { console.error('Failed to initialize NewCard plugin:', error); }                  
    }                  
                  
    if (window.appready) startPlugin();                  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });                  
})();
