(function () {
    'use strict';

    const PLUGIN_NAME = 'NewCard Original + Slideshow';
    const PLUGIN_ID = 'new_card_style';
    const ASSETS_PATH = 'https://crowley24.github.io/NewIcons/';
    let slideshowTimer;

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

    const SETTINGS_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/>
        <rect x="25" y="32" width="50" height="28" rx="4" fill="white"/>
        <rect x="25" y="66" width="30" height="6" rx="3" fill="white" opacity="0.6"/>
        <rect x="60" y="66" width="15" height="6" rx="3" fill="white" opacity="0.6"/>
    </svg>`;

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

    // Логіка слайд-шоу фону
    function startPosterSlideshow(items) {
        if (!Lampa.Storage.get('cas_slideshow_enabled')) return;
        
        let index = 0;
        if (slideshowTimer) clearInterval(slideshowTimer);

        slideshowTimer = setInterval(() => {
            index = (index + 1) % items.length;
            const imgUrl = Lampa.TMDB.image('/t/p/w1280' + items[index].file_path);
            
            const $bg = $('.full-start__background');
            if (!$bg.length) return;

            const nextImg = new Image();
            nextImg.onload = function() {
                const $next = $('<div class="full-start__background loaded slideshow-layer"></div>').css({
                    'background-image': 'url(' + imgUrl + ')',
                    'opacity': '0',
                    'transition': 'opacity 2s ease-in-out',
                    'z-index': '0'
                });
                
                $bg.parent().append($next);
                setTimeout(() => {
                    $next.css('opacity', '1');
                    setTimeout(() => {
                        $('.slideshow-layer').not($next).remove();
                    }, 2000);
                }, 100);
            };
            nextImg.src = imgUrl;
            
        }, parseInt(Lampa.Storage.get('cas_slideshow_time') || '10000'));
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

    function addSettings() {
        const defaults = {
            'cas_logo_scale': '100',
            'cas_logo_quality': 'original',
            'cas_bg_animation': true,
            'cas_blocks_gap': '20',
            'cas_meta_size': '1.3',
            'cas_show_studios': true,
            'cas_show_quality': true,
            'cas_slideshow_enabled': true,
            'cas_slideshow_time': '10000'
        };

        Object.keys(defaults).forEach(key => {
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);
        });

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_ID,
            name: PLUGIN_NAME,
            icon: SETTINGS_ICON
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_logo_quality', type: 'select', values: { 'w300':'300px', 'w500':'500px', 'original':'Original' }, default: 'original' },
            field: { name: 'Якість логотипу' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' }, default: '100' },
            field: { name: 'Розмір логотипу' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_slideshow_enabled', type: 'trigger', default: true },
            field: { name: 'Авто-зміна фону (Слайд-шоу)' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_slideshow_time', type: 'select', values: { '7000':'7 сек', '10000':'10 сек', '15000':'15 сек', '20000':'20 сек' }, default: '10000' },
            field: { name: 'Швидкість слайд-шоу' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_bg_animation', type: 'trigger', default: true },
            field: { name: 'Анімація фону (Zoom)' },
            onChange: applySettings
        });

        applySettings();
    }

    function addCustomTemplate() {  
        const template = `<div class="full-start-new left-title">  
        <div class="full-start-new__body">  
            <div class="full-start-new__right">  
                <div class="left-title__content">  
                    <div class="cas-logo-container" style="margin-bottom: var(--cas-blocks-gap);">
                        <div class="cas-logo"></div>
                        <div class="full-start-new__title">{title}</div>  
                    </div>
                      
                    <div class="cas-ratings-line">
                        <div class="cas-rate-items" style="display: flex; align-items: center; gap: 12px;"></div>
                        <div class="cas-meta-info" style="opacity: 0.7; font-weight: 400;"></div>
                        <div class="cas-quality-row" style="display: flex; gap: 8px; align-items: center;"></div>
                    </div>

                    <div class="cas-studios-row" style="margin-bottom: var(--cas-blocks-gap); display: flex; gap: 15px; align-items: center;"></div>

                    <div class="full-start-new__buttons">  
                        <div class="full-start__button selector button--play">  
                            <svg width="28" height="29" viewBox="0 0 28 29" fill="none">  
                                <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>  
                                <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>  
                            </svg>  
                            <span>#{title_watch}</span>  
                        </div>  
  
                        <div class="full-start__button selector button--book"><span>#{settings_input_links}</span></div>  
                        <div class="full-start__button selector button--options">
                            <svg width="38" height="10" viewBox="0 0 38 10" fill="none"><circle cx="4.8" cy="5" r="4.5" fill="currentColor"/><circle cx="19" cy="5" r="4.5" fill="currentColor"/><circle cx="33.2" cy="5" r="4.5" fill="currentColor"/></svg>
                        </div>  
                    </div>  
                </div>  
            </div>  
        </div>  
    </div>`;  
        Lampa.Template.add('full_start_new', template);  
    }  

    function addStyles() {  
        const styles = `<style>  
            :root { --cas-logo-scale: 1; --cas-blocks-gap: 30px; --cas-meta-size: 1.2em; }
            .left-title .full-start-new__body { height: 85vh; }  
            .left-title .full-start-new__right { display: flex; align-items: flex-end; padding-bottom: 2vh; }  
            .left-title__content { flex-grow: 1; display: flex; flex-direction: column; justify-content: flex-end; }  
            .left-title .full-start-new__title { font-size: 2.5em; font-weight: 700; color: #fff; }  
            .cas-logo img { max-width: calc(450px * var(--cas-logo-scale)); max-height: calc(180px * var(--cas-logo-scale)); object-fit: contain; object-position: left bottom; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5)); }
            .cas-ratings-line { display: flex; align-items: center; gap: 15px; margin-bottom: var(--cas-blocks-gap); font-weight: 600; font-size: var(--cas-meta-size); color: rgba(255,255,255,0.9); }
            .cas-rate-item { display: flex; align-items: center; gap: 6px; }
            .cas-rate-item img { height: 1.1em; }
            .cas-studio-item { height: 20px !important; }
            .cas-studio-item img { height: 100% !important; width: auto !important; object-fit: contain; }
            .cas-quality-item { height: 1.2em; }
            .cas-quality-item img { height: 100%; }
            .slideshow-layer { position: absolute !important; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; z-index: 0; }
            @keyframes casKenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
            body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 45s ease-in-out infinite !important; }
        </style>`;  
        $('body').append(styles);  
    }  

    function attachLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'destroy') {
                if (slideshowTimer) clearInterval(slideshowTimer);
            }

            if (event.type === 'complite') {  
                const data = event.data.movie;
                const render = event.object.activity.render();
                
                if (data && data.id) {
                    const url = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());
                    
                    $.get(url, (res) => {
                        // Логотип
                        const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                        if (bestLogo) {
                            const logoUrl = Lampa.TMDB.image('/t/p/' + (Lampa.Storage.get('cas_logo_quality') || 'original') + bestLogo.file_path);
                            render.find('.cas-logo').html('<img src="' + logoUrl + '">');
                            render.find('.full-start-new__title').hide();
                        } else {
                            render.find('.full-start-new__title').show();
                        }

                        // Слайд-шоу
                        if (res.backdrops && res.backdrops.length > 1) {
                            startPosterSlideshow(res.backdrops.slice(0, 15));
                        }
                    });

                    // Рейтинги
                    let ratesHtml = '';
                    const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);
                    if (tmdbV > 0) ratesHtml += `<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>`;
                    
                    if (event.data.reactions && event.data.reactions.result) {
                        let sum = 0, cnt = 0;
                        const coef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
                        event.data.reactions.result.forEach(r => { if (r.counter) { sum += (r.counter * coef[r.type]); cnt += r.counter; } });
                        if (cnt >= 5) {
                            const cubV = (((data.name?7.4:6.5)*(data.name?50:150)+sum)/((data.name?50:150)+cnt)).toFixed(1);
                            ratesHtml += `<div class="cas-rate-item"><img src="${ICONS.cub}"> <span style="color:${getRatingColor(cubV)}">${cubV}</span></div>`;
                        }
                    }
                    render.find('.cas-rate-items').html(ratesHtml);

                    // Мета-інфо
                    const time = formatTime(data.runtime || data.episode_run_time);
                    const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');
                    render.find('.cas-meta-info').text((time ? time + (genre ? ' • ' : '') : '') + genre);

                    // Студії
                    if (Lampa.Storage.get('cas_show_studios')) {
                        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);
                        render.find('.cas-studios-row').html(studios.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join(''));
                    }

                    // Якість (Parser)
                    if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {
                            if (res && res.Results) {
                                const b = { res: '', hdr: false, dv: false, ukr: false };
                                res.Results.slice(0, 15).forEach(i => {
                                    const t = i.Title.toLowerCase();
                                    if (t.includes('4k') || t.includes('2160')) b.res = '4K'; 
                                    else if (!b.res && (t.includes('1080') || t.includes('fhd'))) b.res = 'FULL HD';
                                    if (t.includes('hdr')) b.hdr = true;
                                    if (t.includes('dv') || t.includes('dovi') || t.includes('vision')) b.dv = true;
                                    if (t.includes('ukr') || t.includes('укр')) b.ukr = true;
                                });

                                let qH = '';
                                if (b.res) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS[b.res]}"></div>`;
                                if (b.dv) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['Dolby Vision']}"></div>`;
                                else if (b.hdr) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;
                                if (b.ukr) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['UKR']}"></div>`;
                                
                                if (qH && (time || genre)) qH = '<span style="opacity: 0.5; margin: 0 5px;">•</span>' + qH;
                                render.find('.cas-quality-row').html(qH);
                            }
                        });
                    }
                }
            }  
        });  
    }  

    function startPlugin() {  
        addCustomTemplate();  
        addStyles();  
        addSettings();  
        attachLoader();  
    }  
  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });  
})();
