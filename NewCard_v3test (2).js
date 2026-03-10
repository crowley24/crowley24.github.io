(function () {  
    'use strict';  
    const PLUGIN_NAME = 'NewCard';  
    const PLUGIN_ID = 'new_card_style';  
    const ASSETS_PATH = 'https://crowley38.github.io/Icons/';  
    const CACHE_LIFETIME = 1000 * 60 * 60 * 24; 
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
        'settings_cas_show_description': 'Опис фільму',  
        'settings_cas_performance_mode': 'Режим продуктивності'  
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
            'cas_show_description': true,  
            'cas_performance_mode': false  
        };  
        Object.keys(defaults).forEach(key => {  
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);  
        });  
        Lampa.SettingsApi.addComponent({ component: PLUGIN_ID, name: PLUGIN_NAME, icon: SETTINGS_ICON });  
        
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
            { name: 'cas_show_description', type: 'trigger' },
            { name: 'cas_performance_mode', type: 'trigger' }
        ];

        params.forEach(p => {
            Lampa.SettingsApi.addParam({
                component: PLUGIN_ID,
                param: p,
                field: { name: TRANSLATIONS['settings_' + p.name] },
                onChange: applySettings
            });
        });
        applySettings();  
    }  

    function applySettings() {  
        const root = document.documentElement;  
        root.style.setProperty('--cas-logo-scale', (parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100));  
        root.style.setProperty('--cas-blocks-gap', (Lampa.Storage.get('cas_blocks_gap') || '20') + 'px');  
        root.style.setProperty('--cas-meta-size', (Lampa.Storage.get('cas_meta_size') || '1.3') + 'em');  
        
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));  
        $('body').toggleClass('cas--performance-mode', !!Lampa.Storage.get('cas_performance_mode'));  
    }  

    // ВИПРАВЛЕНИЙ ТЕМПЛЕЙТ (БЕЗ ЖОРСТКИХ КНОПОК)
    function addCustomTemplate() {  
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
                        <div class="full-start-new__head hide"></div>  
                        <div class="full-start-new__details hide"></div>  
                    </div>  
                    <div class="full-start-new__buttons"></div>  
                </div>  
            </div>  
        </div>  
    </div>`;  
        Lampa.Template.add('full_start_new', template);  
    }  

    // ВИПРАВЛЕНИЙ CSS (БЕЗ ГАЛЬМ)
    function addStyles() {  
        const styles = `<style>  
        :root { --cas-logo-scale: 1; --cas-blocks-gap: 30px; --cas-meta-size: 1.3em; }  
        
        .full-start__background { will-change: transform; transform: translateZ(0); }  

        /* ПОЯВА КОНТЕНТУ */
        .cas-logo, .cas-description, .cas-meta-info, .cas-details-wrapper, .cas-studio-item, .cas-rate-item, .cas-quality-item {
            opacity: 0 !important; transform: translateY(10px);
            transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .cas-animated .cas-logo, .cas-animated .cas-description, .cas-animated .cas-meta-info, 
        .cas-animated .cas-details-wrapper, .cas-animated .cas-studio-item, .cas-animated .cas-rate-item, .cas-animated .cas-quality-item { 
            opacity: 1 !important; transform: translateY(0); 
        }

        /* ПРИБИРАЄМО ЗАТРИМКИ ДЛЯ КНОПОК */
        .left-title .full-start-new__buttons { margin-top: 1.2em; display: flex; gap: 15px; opacity: 1 !important; transform: none !important; }
        .left-title .full-start-new__buttons .full-start__button {
            background: rgba(255, 255, 255, 0.1) !important;
            color: #fff !important;
            padding: 10px 20px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: none !important; /* Навігація стає миттєвою */
        }
        .left-title .full-start-new__buttons .full-start__button.focus { background: #fff !important; color: #000 !important; transform: scale(1.05); }

        /* ВІДОБРАЖЕННЯ ВМІСТУ КНОПОК */
        .full-start__button > * { display: block !important; opacity: 1 !important; }

        .cas-logo img { max-width: 450px; max-height: 180px; transform: scale(var(--cas-logo-scale)); transform-origin: left bottom; }
        .cas-description { font-size: var(--cas-meta-size) !important; line-height: 1.4; opacity: 0.8; max-width: 700px; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .left-title .full-start-new__right { display: flex; align-items: flex-end; padding-bottom: 5vh; padding-left: 3%; }
        
        @keyframes casKenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
        body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 45s linear infinite !important; }
        </style>`;  
        Lampa.Template.add('left_title_css', styles);  
        if (!$('style[id="left_title_css_style"]').length) {
            $('body').append('<style id="left_title_css_style">' + styles.replace('<style>','').replace('</style>','') + '</style>');
        }
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

    function cleanup() { stopSlideshow(); }  
    
    function stopSlideshow() {  
        if (window.casBgInterval) { clearInterval(window.casBgInterval); window.casBgInterval = null; }  
    }  

    function startSlideshow(render, backdrops) {  
        let idx = 0;  
        window.casBgInterval = setInterval(() => {  
            const bg = render.find('.full-start__background img, img.full-start__background');  
            if (!bg.length) return stopSlideshow();  
            idx = (idx + 1) % Math.min(backdrops.length, 15);  
            bg.css('opacity', '0.5');  
            setTimeout(() => {  
                bg.attr('src', Lampa.TMDB.image('/t/p/original' + backdrops[idx].file_path));  
                bg.css('opacity', '1');  
            }, 400);  
        }, 15000);  
    }  

    async function processImages(render, data, res) {  
        const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];  
        if (bestLogo) {  
            const logoSrc = Lampa.TMDB.image('/t/p/' + (Lampa.Storage.get('cas_logo_quality') || 'original') + bestLogo.file_path);  
            await preloadImage(logoSrc);  
            render.find('.cas-logo').html(`<img src="${logoSrc}">`);  
        } else {  
            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800;">${data.title || data.name}</div>`);  
        }  
        stopSlideshow();  
        if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops?.length > 1) startSlideshow(render, res.backdrops);  
    }  

    async function loadMovieDataOptimized(render, data) {  
        render.find('.cas-description').text(data.overview || '');  
        const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);  
        if (tmdbV > 0) render.find('.cas-rate-items').html(`<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>`);  
        
        const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));  
        const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');  
        render.find('.cas-meta-info').text((time ? time + (genre ? ' • ' : '') : '') + genre);  

        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);  
        render.find('.cas-studios-row').html(studios.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join(''));  
    }  

    const debouncedLoadMovieData = debounce((render, data) => loadMovieDataOptimized(render, data), 300);  

    function attachLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {  
                const data = event.data.movie;  
                const render = event.object.activity.render();  
                const content = render.find('.left-title__content');  
                
                content.removeClass('cas-animated');  
                event.object.activity.onBeforeDestroy = cleanup;  

                if (data && data.id) {  
                    render.data('movie', data);  
                    const cacheId = 'tmdb_' + data.id;  
                    const cached = getCachedData(cacheId);  
                    
                    if (cached) processImages(render, data, cached);  
                    else {  
                        $.getJSON(Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key()), (res) => {  
                            setCachedData(cacheId, res);  
                            processImages(render, data, res);  
                        });  
                    }  
                    debouncedLoadMovieData(render, data);  
                }  
                setTimeout(() => content.addClass('cas-animated'), 100);  
            }  
        });  
    }  

    function startPlugin() {   
        try { initializePlugin(); } catch (e) { console.error(e); }  
    }  

    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });  
})();
