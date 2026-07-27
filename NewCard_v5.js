(function () {                
    'use strict';                
    const PLUGIN_NAME = 'NewCard';                
    const PLUGIN_ID = 'new_card_style';                
    const ASSETS_PATH = 'https://crowley38.github.io/Icons/';                
    const CACHE_LIFETIME = 1000 * 60 * 60 * 24; 
    
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
                          
        root.style.setProperty('--cas-logo-scale', scale);          
        root.style.setProperty('--cas-blocks-gap', gap + 'px');          
        root.style.setProperty('--cas-meta-size', metaSize + 'em');          
                          
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));          
    }               
                            
    function addStyles() {  
        if ($('#cas-main-styles').length) return;  
        const styles = `<style id="cas-main-styles">  
        :root { 
            --cas-logo-scale: 1; 
            --cas-blocks-gap: 20px; 
            --cas-meta-size: 1.3em; 
        }  
                
        .full-start-new .cas-custom-container {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
            width: 100%;
            margin-bottom: 15px;
        }

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

        .cas-meta-line {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }

        .cas-meta-info { display: flex; align-items: center; justify-content: flex-start !important; gap: 10px; font-size: var(--cas-meta-size); font-weight: 500; color: #fff; }  
        .cas-quality-row { display: flex; align-items: center; justify-content: flex-start !important; gap: 6px; }  

        .cas-studios-row { display: flex; flex-wrap: wrap; justify-content: flex-start !important; gap: 8px; margin-bottom: 8px; }  
        
        .cas-studio-item { height: 22px !important; display: flex; align-items: center; }    
        .cas-studio-item img { height: 100%; width: auto; max-width: 120px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); }    

        .cas-description { font-size: var(--cas-meta-size) !important; line-height: 1.4; color: rgba(255,255,255,0.8); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; max-width: 750px; margin-top: calc(var(--cas-blocks-gap) * 0.3); text-shadow: 0 1px 3px rgba(0,0,0,0.8); }    
        .cas-quality-item img { height: 16px; }    
        </style>`;    
        $('body').append(styles);    
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
            const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];                
            if (bestLogo) {        
                const quality = Lampa.Storage.get('cas_logo_quality') || 'original';                
                const logoSrc = Lampa.TMDB.image('/t/p/' + quality + bestLogo.file_path);                
                await preloadImage(logoSrc);                
                render.find('.cas-logo').html(`<img src="${logoSrc}">`);                
                return;
            }                
        }
        render.find('.cas-logo').html(`<div class="cas-logo-text">${titleText}</div>`);
    }    

    function fetchTmdbDetails(data, callback) {
        const type = data.name ? 'tv' : 'movie';
        const key = Lampa.TMDB.key();
        const year = new Date(data.release_date || data.first_air_date || 0).getFullYear();
        const networks = (data.networks || data.production_companies || []).map(n => (n.name || '').toLowerCase());

        const result = {
            res: year >= 2016 ? '4K' : (year >= 2005 ? 'FULL HD' : 'HD'),
            hdr: year >= 2020 && networks.some(n => n.includes('apple') || n.includes('disney') || n.includes('netflix') || n.includes('hbo') || n.includes('amazon')),
            dv: false,
            ukr: true,
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

        const timer = setTimeout(finish, 600);

        const checkDone = () => {
            completed++;
            if (completed === 2) {
                clearTimeout(timer);
                finish();
            }
        };

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

        if (data.tagline) render.find('.cas-tagline').text(`«${data.tagline}»`).show();
        else render.find('.cas-tagline').hide();

        const overview = data.overview || Lampa.Lang.translate('full_not_descr') || '';
        render.find('.cas-description').html(overview).show();    
            
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

        if (Lampa.Storage.get('cas_show_studios')) {    
            renderStudioLogos(render.find('.cas-studios-row'), data);    
        }    
            
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
                
                // Перевіряємо чи вже вбудовано наш блок, якщо ні — додаємо всередину штатного шаблону
                if (!render.find('.cas-custom-container').length) {
                    const customHTML = `
                        <div class="cas-custom-container">
                            <div class="cas-studios-row"></div>
                            <div class="cas-logo-container">
                                <div class="cas-logo"></div>
                            </div>
                            <div class="cas-tagline"></div>
                            <div class="cas-meta-line">
                                <div class="cas-meta-info"></div>
                                <div class="cas-quality-row"></div>
                            </div>
                            <div class="cas-description"></div>
                        </div>
                    `;
                    // Безпечно вставляємо на початок інформаційного блоку Lampa
                    render.find('.full-start-new__right, .full-start__right').prepend(customHTML);
                }

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
                        });                
                    }                
                                    
                    debouncedLoadMovieData(render, data);                
                }                
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
