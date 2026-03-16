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
            icon: `<svg viewBox="0 0 100 100"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/></svg>`      
        });      
              
        const params = [      
            { name: 'cas_logo_quality', type: 'select', values: { 'w300':'300px', 'w500':'500px', 'original':'Original' } },      
            { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' } },      
            { name: 'cas_meta_size', type: 'select', values: { '1.2': 'Малий', '1.3': 'Стандарт', '1.4': 'Збільшений', '1.5': 'Великий' } },      
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
        const template = `<div class="full-start-new left-title">          
            <div class="full-start-new__body">          
                <div class="full-start-new__right">          
                    <div class="left-title__content">          
                        <div class="cas-logo-container" style="margin-bottom: var(--cas-blocks-gap);"><div class="cas-logo"></div></div>          
                        <div class="cas-studios-row" style="display: flex; gap: 15px; align-items: center; margin-bottom: 12px;"></div>          
                        <div class="cas-ratings-line">          
                            <div class="cas-rate-items" style="display: flex; align-items: center; gap: 12px;"></div>          
                            <div class="cas-meta-info"></div>          
                            <div class="cas-quality-row" style="display: flex; gap: 8px; align-items: center;"></div>          
                        </div>          
                        <div class="cas-description" style="margin-top: var(--cas-blocks-gap);"></div>          
                        <div class="full-start-new__buttons">          
                            <div class="full-start__button selector button--play"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>#{title_watch}</span></div>          
                            <div class="full-start__button selector view--torrent"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg><span>#{full_torrents}</span></div>          
                            <div class="full-start__button selector view--trailer"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-10 14.5v-9l6 4.5-6 4.5z"/></svg><span>#{full_trailers}</span></div>          
                            <div class="full-start__button selector button--book"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg><span>#{settings_input_links}</span></div>          
                            <div class="full-start__button selector button--reaction"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg><span>#{title_reactions}</span></div>          
                            <div class="full-start__button selector button--options"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg></div>          
                        </div>          
                    </div>          
                </div>          
            </div>          
        </div>`;          
        Lampa.Template.add('full_start_new', template);          
    }      
      
    function addStyles() {      
        const styles = `<style>      
        :root { --cas-logo-scale: 1; --cas-blocks-gap: 20px; --cas-meta-size: 1.3em; }      
        .cas-logo, .cas-studios-row, .cas-rate-items, .cas-meta-info, .cas-quality-row, .cas-description, .full-start-new__buttons {      
            opacity: 0 !important; transform: translateY(10px); transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);      
        }      
        .cas-animated .cas-logo { opacity: 1 !important; transform: translateY(0); transition-delay: 0s; }      
        .cas-animated .cas-studios-row { opacity: 0.9 !important; transform: translateY(0); transition-delay: 0.05s; }      
        .cas-animated .cas-rate-items { opacity: 1 !important; transform: translateY(0); transition-delay: 0.1s; }      
        .cas-animated .cas-meta-info { opacity: 0.7 !important; transform: translateY(0); transition-delay: 0.15s; }      
        .cas-animated .cas-quality-row { opacity: 0.9 !important; transform: translateY(0); transition-delay: 0.2s; }      
        .cas-animated .cas-description { opacity: 0.7 !important; transform: translateY(0); transition-delay: 0.25s; }      
        .cas-animated .full-start-new__buttons { opacity: 1 !important; transform: translateY(0); transition-delay: 0.3s; }      
              
        .left-title .full-start-new__buttons .full-start__button {      
            background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.6) !important;      
            display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;      
            border: 2px solid transparent !important; border-radius: 10px !important; padding: 8px 18px !important;    
        }      
        .left-title .full-start-new__buttons .full-start__button.focus {      
            color: #fff !important; transform: scale(1.05); background: rgba(255,255,255,0.15) !important; border-color: rgba(255,255,255,0.4) !important;      
        }      
        .cas-logo img { max-width: 450px; max-height: 180px; transform: scale(var(--cas-logo-scale)); transform-origin: left bottom; }      
        .cas-studio-item img { height: 20px; filter: drop-shadow(0 0 2px rgba(255,255,255,0.5)); }      
        .cas-description { font-size: var(--cas-meta-size) !important; line-height: 1.4; color: rgba(255,255,255,0.8); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; max-width: 700px; }      
        .cas-ratings-line { display: flex; align-items: center; gap: 15px; margin-bottom: 5px; font-size: var(--cas-meta-size); font-weight: 600; height: 35px; }      
        .cas-rate-item { display: flex; align-items: center; gap: 6px; }      
        .cas-rate-item img { height: 1.1em; }      
        @keyframes casKenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }      
        body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 45s linear infinite !important; }      
        </style>`;      
        $('body').append(styles);      
    }      
      
    function startSlideshow(render, backdrops) {      
        if (window.casBgInterval) clearInterval(window.casBgInterval);
        let idx = 0;      
        window.casBgInterval = setInterval(() => {      
            const bg = render.find('.full-start__background img, img.full-start__background');      
            if (!bg.length) return clearInterval(window.casBgInterval);      
            idx = (idx + 1) % Math.min(backdrops.length, 15);      
            const nextSrc = Lampa.TMDB.image('/t/p/original' + backdrops[idx].file_path);      
            bg.css('opacity', '0.5');      
            setTimeout(() => { bg.attr('src', nextSrc); bg.css('opacity', '1'); }, 500);      
        }, 12000);      
    }      
      
    function loadMovieData(render, data) {      
        // Миттєвий опис
        render.find('.cas-description').text(data.overview || '').show();

        // Рейтинг TMDB
        const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);
        if (tmdbV > 0) render.find('.cas-rate-items').html(`<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>`);

        // Мета
        const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));      
        const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');      
        render.find('.cas-meta-info').text((time ? time + (genre ? ' • ' : '') : '') + genre);

        // Студії
        if (Lampa.Storage.get('cas_show_studios')) {      
            const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);      
            render.find('.cas-studios-row').html(studios.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join(''));      
        }

        // Якість (Parser)
        if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser) {      
            Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {      
                const items = res.Results || res;      
                if (items && items.length) {      
                    const b = { res: '', hdr: false, ukr: false };      
                    items.slice(0, 10).forEach(i => {      
                        const t = (i.Title || i.title || '').toLowerCase();      
                        if (t.includes('4k') || t.includes('2160')) b.res = '4K';      
                        else if (!b.res && t.includes('1080')) b.res = 'FULL HD';      
                        if (t.includes('hdr')) b.hdr = true;      
                        if (t.includes('ukr') || t.includes('укр')) b.ukr = true;      
                    });      
                    let qH = b.res ? `<div class="cas-quality-item"><img src="${QUALITY_ICONS[b.res]}"></div>` : '';      
                    if (b.hdr) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;      
                    if (b.ukr) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['UKR']}"></div>`;      
                    if (qH) render.find('.cas-quality-row').html('<span style="margin: 0 5px;">•</span>' + qH);      
                }      
            });      
        }      
    }      
      
    function attachLoader() {      
        Lampa.Listener.follow('full', (event) => {      
            if (event.type === 'complite') {      
                const data = event.data.movie;      
                const render = event.object.activity.render();      
                const content = render.find('.left-title__content');      
                
                if (data && data.id) {      
                    loadMovieData(render, data);

                    // Зображення та Лого
                    const imgUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());
                    $.getJSON(imgUrl, (res) => {
                        const logo = res.logos.find(l => l.iso_639_1 === 'uk' || l.iso_639_1 === 'en') || res.logos[0];
                        if (logo) render.find('.cas-logo').html(`<img src="${Lampa.TMDB.image('/t/p/w500' + logo.file_path)}">`);
                        else render.find('.cas-logo').html(`<div style="font-size: 2.5em; font-weight: 800;">${data.title || data.name}</div>`);
                        
                        if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops?.length > 1) startSlideshow(render, res.backdrops);
                    });

                    // CUB Рейтинг
                    if (Lampa.Storage.get('cas_show_rating') && event.data.reactions?.result) {      
                        let sum = 0, cnt = 0;      
                        const coef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };      
                        event.data.reactions.result.forEach(r => { if (r.counter) { sum += (r.counter * (coef[r.type] || 0)); cnt += r.counter; } });      
                        if (cnt >= 1) {      
                            const cubV = (((data.name?7.4:6.5)*(data.name?50:150)+sum)/((data.name?50:150)+cnt)).toFixed(1);      
                            render.find('.cas-rate-items').append(`<div class="cas-rate-item"><img src="${ICONS.cub}"> <span style="color:${getRatingColor(cubV)}">${cubV}</span></div>`);      
                        }      
                    }      
                }      
                  
                requestAnimationFrame(() => content.addClass('cas-animated'));      
                  
                setTimeout(() => {      
                    const btns = render.find('.full-start-new__buttons');
                    Lampa.Nav.focus(btns); 
                }, 100);      
            }      
        });      
    }      
      
    if (window.appready) initializePlugin();      
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });      
})();
