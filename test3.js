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
        'settings_cas_bg_animation': 'Анімація фону',                
        'settings_cas_animation_style': 'Стиль анімації появи',
        'settings_cas_slideshow_enabled': 'Слайд-шоу фону',                
        'settings_cas_show_studios': 'Показувати студії',                
        'settings_cas_show_quality': 'Показувати якість',                
        'settings_cas_show_rating': 'Показувати рейтинги',                
        'settings_cas_show_description': 'Опис фільму',
        'settings_cas_show_tagline': 'Показувати слоган'
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
            'cas_bg_animation': 'kenburns',                
            'cas_animation_style': 'slide',
            'cas_slideshow_enabled': true,                
            'cas_blocks_gap': '20',                
            'cas_meta_size': '1.3',                
            'cas_show_studios': true,                
            'cas_show_quality': true,                
            'cas_show_rating': true,                
            'cas_show_description': true,
            'cas_show_tagline': true
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
            { 
                name: 'cas_bg_animation', 
                type: 'select', 
                values: { 
                    'off': 'Вимкнено', 
                    'kenburns': 'Ken Burns (Зум + Паралакс)', 
                    'panscan': 'Кінематографічний дрейф (Pan & Scan)', 
                    'tiltzoom': 'Динамічний кут (Tilt Zoom)' 
                } 
            },                
            { name: 'cas_animation_style', type: 'select', values: { 'slide': 'Slide from Left (Виїзд зліва)', 'spring': 'Elastic Spring (Жива пружина)' } },
            { name: 'cas_slideshow_enabled', type: 'trigger' },                
            { name: 'cas_show_studios', type: 'trigger' },                
            { name: 'cas_show_quality', type: 'trigger' },                
            { name: 'cas_show_rating', type: 'trigger' },                
            { name: 'cas_show_description', type: 'trigger' },
            { name: 'cas_show_tagline', type: 'trigger' }                
        ];                
                
        params.forEach(p => {                
            Lampa.SettingsApi.addParam({                
                component: PLUGIN_ID,                
                param: {                 
                    name: p.name,                 
                    type: p.type,                 
                    values: p.values,                 
                    default: defaults[p.name]                 
                },                
                field: {                 
                    name: TRANSLATIONS['settings_' + p.name]                
                },                
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
        const bgAnim = Lampa.Storage.get('cas_bg_animation') || 'kenburns';
                          
        root.style.setProperty('--cas-logo-scale', scale);          
        root.style.setProperty('--cas-blocks-gap', gap + 'px');          
        root.style.setProperty('--cas-meta-size', metaSize + 'em');          
                          
        const bodyEl = $('body');
        bodyEl.removeClass('cas--zoom-kenburns cas--zoom-panscan cas--zoom-tiltzoom');
        if (bgAnim !== 'off') {
            bodyEl.addClass('cas--zoom-' + bgAnim);
        }
        
        const currentCard = $('.full-start-new.left-title');          
        if (currentCard.length > 0) {          
            currentCard.removeClass('cas-anim-slide cas-anim-spring').addClass('cas-anim-' + animStyle);

            const showDesc = !!Lampa.Storage.get('cas_show_description');
            const showTag = !!Lampa.Storage.get('cas_show_tagline');

            currentCard.find('.cas-description').toggle(showDesc);          
            currentCard.find('.cas-tagline').toggle(showTag);
            currentCard.find('.cas-studios-row').toggle(!!Lampa.Storage.get('cas_show_studios'));          
            currentCard.find('.cas-quality-row').toggle(!!Lampa.Storage.get('cas_show_quality'));          
            currentCard.find('.cas-rate-items, .cas-bottom-ratings').toggle(!!Lampa.Storage.get('cas_show_rating'));
                        
            const buttons = currentCard.find('.full-start-new__buttons');          
                      
            if (!showDesc) {          
                buttons.css('margin-top', '0px');          
            } else {          
                buttons.css('margin-top', '');          
            }          
                        
            stopSlideshow();          
          
            if (Lampa.Storage.get('cas_slideshow_enabled')) {          
                const bg = currentCard.find('.full-start__background img, img.full-start__background');          
                if (bg.length && bg.attr('src')) {          
                    const movieData = currentCard.data('movie');          
                    if (movieData && movieData.id) {          
                        const cacheId = 'tmdb_' + movieData.id;          
                        const cached = getCachedData(cacheId);          
                        if (cached && cached.backdrops?.length > 1) {          
                            startSlideshow(currentCard, cached.backdrops);          
                        }          
                    }          
                }          
            }          
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
                        <div class="cas-logo-container" style="margin-bottom: calc(var(--cas-blocks-gap) * 1.2);">  
                            <div class="cas-studios-row" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;"></div>                  
                            <div class="cas-logo"></div>                    
                        </div>                    
                        <div class="cas-tagline" style="display: none;"></div>
                        <div class="cas-meta-line" style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px; flex-wrap: wrap;">      
                            <div class="cas-meta-info"></div>      
                            <div class="cas-quality-row" style="display: flex; gap: 6px; align-items: center;"></div>      
                        </div>  
                        <div class="cas-description" style="margin-top: 2px;"></div>                    
                        <div class="cas-details-wrapper" style="margin-top: 4px;">                  
                            <div class="full-start-new__head hide"></div>                      
                            <div class="full-start-new__details hide"></div>                      
                        </div>                  
                        <div class="full-start-new__buttons" style="margin-top: 0px;">                      
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
                    <div class="full-start-new__reactions selector hide"></div>                  
                    <div class="cas-bottom-ratings" style="position: absolute; right: 2.5em; bottom: 2em; display: flex; align-items: center; gap: 15px; font-size: var(--cas-meta-size); font-weight: 600; z-index: 3;"></div>
                    <div class="full-start-new__rate-line hide"></div>                  
                    <div class="rating--modss" style="display: none;"></div>                  
                </div>                  
            </div>                  
            <div class="hide buttons--container">                  
                <div class="full-start__button view--torrent hide">                  
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="24" height="24"><path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/></svg>                  
                    <span>#{full_torrents}</span>                  
                </div>                  
                <div class="full-start__button selector view--trailer">                  
                    <svg height="24" viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"/></svg>                  
                    <span>#{full_trailers}</span>                  
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
            --cas-blocks-gap: 30px; 
            --cas-meta-size: 1.3em; 
            --cas-curve-slide: cubic-bezier(0.25, 1, 0.5, 1); 
            --cas-curve-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }  
                
        .full-start__background {  
            height: calc(100% + 6em);  
            left: 0 !important;  
            opacity: 0 !important;  
            transition: opacity 1s cubic-bezier(0.2, 0.8, 0.2, 1) !important;  
            will-change: opacity;  
            overflow: hidden !important;  
            transform: translateZ(0);
        }  
            
        .full-start__background.loaded {  
            opacity: 1 !important;  
        }  
      
        .full-start__background.dim {  
            opacity: 0.35 !important;  
        }  
                
        @keyframes casKenBurnsParallax {  
            0% { transform: scale(1.02) translate3d(0, 0, 0); }  
            50% { transform: scale(1.10) translate3d(5px, -15px, 0); }  
            100% { transform: scale(1.02) translate3d(0, 0, 0); }  
        }  

        /* 1. Кінематографічний дрейф (Pan & Scan) */
        @keyframes casCinematicPanScan {
            0% { transform: scale(1.06) translate3d(0px, 0px, 0); }
            33% { transform: scale(1.12) translate3d(-25px, -12px, 0); }
            66% { transform: scale(1.10) translate3d(20px, 15px, 0); }
            100% { transform: scale(1.06) translate3d(0px, 0px, 0); }
        }

        /* 2. Динамічний кут / Tilt Zoom з вираженим поворотом */
        @keyframes casDynamicTiltZoom {
            0% { transform: scale(1.08) rotate(0deg) translate3d(0, 0, 0); }
            33% { transform: scale(1.14) rotate(-2.2deg) translate3d(-15px, 10px, 0); }
            66% { transform: scale(1.14) rotate(2.2deg) translate3d(15px, -10px, 0); }
            100% { transform: scale(1.08) rotate(0deg) translate3d(0, 0, 0); }
        }
                  
        body.cas--zoom-kenburns .full-start__background img, 
        body.cas--zoom-kenburns img.full-start__background {  
            animation: casKenBurnsParallax 40s ease-in-out infinite !important;  
            will-change: transform;  
            transform-origin: center center;  
        }  

        body.cas--zoom-panscan .full-start__background img, 
        body.cas--zoom-panscan img.full-start__background {  
            animation: casCinematicPanScan 35s ease-in-out infinite !important;  
            will-change: transform;  
            transform-origin: center center;  
        }

        body.cas--zoom-tiltzoom .full-start__background img, 
        body.cas--zoom-tiltzoom img.full-start__background {  
            animation: casDynamicTiltZoom 25s ease-in-out infinite !important;  
            will-change: transform;  
            transform-origin: center center;  
        }
          
        .cas-logo, .cas-tagline, .cas-studios-row, .cas-rate-items, .cas-meta-info, .cas-quality-row, .cas-description, .cas-details-wrapper, .full-start-new__buttons, .cas-bottom-ratings {  
            opacity: 0 !important;  
            will-change: transform, opacity;  
            backface-visibility: hidden;
        }  

        .cas-quality-row .cas-quality-item {
            opacity: 0;
            transform: translate3d(0, 6px, 0) scale(0.9);
            transition: opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1), transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .cas-quality-row.show-quality .cas-quality-item {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
        }

        /* --- Варіант 1: Slide from Left --- */
        .cas-anim-slide .cas-logo, 
        .cas-anim-slide .cas-tagline, 
        .cas-anim-slide .cas-studios-row, 
        .cas-anim-slide .cas-rate-items, 
        .cas-anim-slide .cas-meta-info, 
        .cas-anim-slide .cas-quality-row, 
        .cas-anim-slide .cas-description, 
        .cas-anim-slide .cas-details-wrapper, 
        .cas-anim-slide .full-start-new__buttons,
        .cas-anim-slide .cas-bottom-ratings {  
            transform: translate3d(0, 8px, 0);  
            transition: opacity 0.35s var(--cas-curve-slide), transform 0.35s var(--cas-curve-slide);  
        }                        
        .cas-anim-slide.cas-animated .cas-logo { opacity: 1 !important; transform: translate3d(0, 0, 0); transition-delay: 0.0s; }  
        .cas-anim-slide.cas-animated .cas-studios-row { opacity: 0.9 !important; transform: translate3d(0, 0, 0); transition-delay: 0.03s; }  
        .cas-anim-slide.cas-animated .cas-tagline { opacity: 0.85 !important; transform: translate3d(0, 0, 0); transition-delay: 0.06s; }
        .cas-anim-slide.cas-animated .cas-meta-info { opacity: 0.85 !important; transform: translate3d(0, 0, 0); transition-delay: 0.09s; }    
        .cas-anim-slide.cas-animated .cas-description { opacity: 0.75 !important; transform: translate3d(0, 0, 0); transition-delay: 0.12s; }  
        .cas-anim-slide.cas-animated .full-start-new__buttons { opacity: 1 !important; transform: translate3d(0, 0, 0); transition-delay: 0.16s; }  
        .cas-anim-slide.cas-animated .cas-bottom-ratings { opacity: 1 !important; transform: translate3d(0, 0, 0); transition-delay: 0.16s; }  
        .cas-anim-slide.cas-animated .cas-quality-row { opacity: 1 !important; transform: translate3d(0, 0, 0); transition-delay: 0.18s; }

        /* --- Варіант 2: Elastic Spring --- */
        .cas-anim-spring .cas-logo, 
        .cas-anim-spring .cas-tagline, 
        .cas-anim-spring .cas-studios-row, 
        .cas-anim-spring .cas-rate-items, 
        .cas-anim-spring .cas-meta-info, 
        .cas-anim-spring .cas-quality-row, 
        .cas-anim-spring .cas-description, 
        .cas-anim-spring .cas-details-wrapper, 
        .cas-anim-spring .full-start-new__buttons,
        .cas-anim-spring .cas-bottom-ratings {  
            transform: scale3d(0.92, 0.92, 1) translate3d(0, 6px, 0);  
            transition: opacity 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform 0.4s var(--cas-curve-spring);  
        }                        
        .cas-anim-spring.cas-animated .cas-logo { opacity: 1 !important; transform: scale3d(1, 1, 1) translate3d(0, 0, 0); transition-delay: 0.0s; }  
        .cas-anim-spring.cas-animated .cas-studios-row { opacity: 0.9 !important; transform: scale3d(1, 1, 1) translate3d(0, 0, 0); transition-delay: 0.03s; }  
        .cas-anim-spring.cas-animated .cas-tagline { opacity: 0.85 !important; transform: scale3d(1, 1, 1) translate3d(0, 0, 0); transition-delay: 0.06s; }
        .cas-anim-spring.cas-animated .cas-meta-info { opacity: 0.85 !important; transform: scale3d(1, 1, 1) translate3d(0, 0, 0); transition-delay: 0.09s; }    
        .cas-anim-spring.cas-animated .cas-description { opacity: 0.75 !important; transform: scale3d(1, 1, 1) translate3d(0, 0, 0); transition-delay: 0.12s; }  
        .cas-anim-spring.cas-animated .full-start-new__buttons { opacity: 1 !important; transform: scale3d(1, 1, 1) translate3d(0, 0, 0); transition-delay: 0.16s; }  
        .cas-anim-spring.cas-animated .cas-bottom-ratings { opacity: 1 !important; transform: scale3d(1, 1, 1) translate3d(0, 0, 0); transition-delay: 0.16s; }
        .cas-anim-spring.cas-animated .cas-quality-row { opacity: 1 !important; transform: scale3d(1, 1, 1) translate3d(0, 0, 0); transition-delay: 0.18s; }
        </style>`;
        $('head').append(styles);
    }

    function stopSlideshow() {
        if (currentInterval) {
            clearInterval(currentInterval);
            currentInterval = null;
        }
    }

    function startSlideshow(card, backdrops) {
        stopSlideshow();
        if (!backdrops || backdrops.length <= 1) return;

        let index = 0;
        currentInterval = setInterval(() => {
            index = (index + 1) % backdrops.length;
            const bgImg = card.find('.full-start__background img, img.full-start__background');
            if (bgImg.length) {
                const newUrl = Lampa.TMDB.image('backdrop' + backdrops[index].file_path, 'w1280');
                preloadImage(newUrl).then(() => {
                    bgImg.attr('src', newUrl);
                }).catch(() => {});
            }
        }, 8000);
    }

    function getCachedData(id) {
        try {
            const raw = localStorage.getItem(id);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.timestamp > CACHE_LIFETIME) {
                localStorage.removeItem(id);
                return null;
            }
            return parsed.data;
        } catch (e) {
            return null;
        }
    }

    function setCachedData(id, data) {
        try {
            localStorage.setItem(id, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        } catch (e) {}
    }

    function attachLoader() {
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                const render = e.object.activity.render();
                const card = render.find('.full-start-new.left-title');
                
                if (card.length) {
                    const movie = e.data.movie;
                    card.data('movie', movie);

                    const logoContainer = card.find('.cas-logo');
                    const metaContainer = card.find('.cas-meta-info');
                    const descContainer = card.find('.cas-description');
                    const taglineContainer = card.find('.cas-tagline');
                    const studiosContainer = card.find('.cas-studios-row');
                    const qualityContainer = card.find('.cas-quality-row');
                    const bottomRatings = card.find('.cas-bottom-ratings');

                    logoContainer.empty();
                    metaContainer.empty();
                    descContainer.empty();
                    taglineContainer.empty();
                    studiosContainer.empty();
                    qualityContainer.empty();
                    bottomRatings.empty();

                    // Опис та Слоган
                    if (movie.overview) descContainer.text(movie.overview);
                    if (movie.tagline) taglineContainer.text('«' + movie.tagline + '»').show();

                    // Метаінформація (Рік, Країна, Жанр, Час)
                    const year = (movie.release_date || movie.first_air_date || '').substring(0, 4);
                    const countries = (movie.production_countries || []).map(c => c.iso_3166_1).join(', ');
                    const genres = (movie.genres || []).map(g => g.name).join(', ');
                    const duration = formatTime(movie.runtime || (movie.episode_run_time && movie.episode_run_time[0]));

                    const metaParts = [year, countries, genres, duration].filter(Boolean);
                    metaContainer.text(metaParts.join(' • '));

                    // TMDB деталі
                    const cacheId = 'tmdb_' + movie.id;
                    const cached = getCachedData(cacheId);

                    const processDetails = (data) => {
                        // Логотип
                        if (data.images && data.images.logos && data.images.logos.length > 0) {
                            const logoObj = data.images.logos.find(l => l.iso_639_1 === 'uk') || 
                                            data.images.logos.find(l => l.iso_639_1 === 'en') || 
                                            data.images.logos[0];
                            if (logoObj) {
                                const q = Lampa.Storage.get('cas_logo_quality') || 'original';
                                const logoUrl = Lampa.TMDB.image('logo' + logoObj.file_path, q);
                                logoContainer.html(`<img src="${logoUrl}" style="max-height: calc(8em * var(--cas-logo-scale)); max-width: 80%; object-fit: contain; object-position: left center;" />`);
                            } else {
                                logoContainer.html(`<h2>${movie.title || movie.name}</h2>`);
                            }
                        } else {
                            logoContainer.html(`<h2>${movie.title || movie.name}</h2>`);
                        }

                        // Студії
                        if (data.production_companies && data.production_companies.length > 0) {
                            studiosContainer.empty();
                            data.production_companies.slice(0, 3).forEach(comp => {
                                if (comp.logo_path) {
                                    const logoUrl = Lampa.TMDB.image('logo' + comp.logo_path, 'w92');
                                    studiosContainer.append(`<img src="${logoUrl}" title="${comp.name}" style="height: 1.2em; max-width: 4em; object-fit: contain; filter: brightness(0) invert(1); opacity: 0.8;" />`);
                                }
                            });
                        }

                        // Слайдшоу фонів
                        if (data.images && data.images.backdrops && data.images.backdrops.length > 1) {
                            if (Lampa.Storage.get('cas_slideshow_enabled')) {
                                startSlideshow(card, data.images.backdrops);
                            }
                        }
                    };

                    if (cached) {
                        processDetails(cached);
                    } else {
                        const type = movie.first_air_date ? 'tv' : 'movie';
                        const url = `https://api.themoviedb.org/3/${type}/${movie.id}?api_key=${Lampa.TMDB.key()}&append_to_response=images&include_image_language=uk,en,null`;
                        
                        $.getJSON(url, (res) => {
                            setCachedData(cacheId, res);
                            processDetails(res);
                        }).fail(() => {
                            logoContainer.html(`<h2>${movie.title || movie.name}</h2>`);
                        });
                    }

                    // Рейтинги (TMDB, CUB)
                    if (movie.vote_average) {
                        const tmdbVal = parseFloat(movie.vote_average).toFixed(1);
                        const color = getRatingColor(tmdbVal);
                        bottomRatings.append(`
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <img src="${ICONS.tmdb}" style="width: 1.6em; height: 1em; object-fit: contain;" />
                                <span style="color: ${color};">${tmdbVal}</span>
                            </div>
                        `);
                    }

                    // Оновлення якісних бейджів
                    const updateQualityBadges = () => {
                        qualityContainer.empty();
                        let found = false;

                        // Перевірка наявності даних з бекенду або парсерів
                        const qualities = movie.quality || [];
                        if (typeof qualities === 'string') qualities = [qualities];

                        Object.keys(QUALITY_ICONS).forEach(key => {
                            if (qualities.includes(key) || (movie.number_of_seasons && key === 'HD')) {
                                qualityContainer.append(`<img class="cas-quality-item" src="${QUALITY_ICONS[key]}" style="height: 1.1em; object-fit: contain;" />`);
                                found = true;
                            }
                        });

                        if (found) {
                            qualityContainer.addClass('show-quality');
                        }
                    };

                    updateQualityBadges();
                    applySettings();

                    // Тригер анімацій появи
                    setTimeout(() => {
                        card.addClass('cas-animated');
                    }, 50);
                }
            }
        });
    }

    if (window.appready) {
        initializePlugin();
    } else {
        Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready') initializePlugin();
        });
    }
})();
