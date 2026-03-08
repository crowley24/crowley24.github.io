(function () {  
    'use strict';  
  
    const PLUGIN_NAME = 'Clean & Apple Style';
    const PLUGIN_ID = 'clean_apple_style';
    const ASSETS_PATH = 'https://crowley24.github.io/NewIcons/';

    const ICONS = {
        play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor"/></svg>`,
        book: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        reaction: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="currentColor" stroke-width="2"/></svg>`,
        options: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>`,
        trailer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 6H3C1.9 6 1 6.9 1 8V16C1 17.1 1.9 18 3 18H21C22.1 18 23 17.1 23 16V8C23 6.9 22.1 6 21 6Z" stroke="currentColor" stroke-width="2"/><path d="M10 9L15 12L10 15V9Z" fill="currentColor"/></svg>`,
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    const QUALITY_ICONS = {
        '4K': ASSETS_PATH + '4K.svg', '2K': ASSETS_PATH + '2K.svg', 'FULL HD': ASSETS_PATH + 'FULL HD.svg',
        'HD': ASSETS_PATH + 'HD.svg', 'HDR': ASSETS_PATH + 'HDR.svg', 'Dolby Vision': ASSETS_PATH + 'Dolby Vision.svg',
        'DUB': ASSETS_PATH + 'DUB.svg', 'UKR': ASSETS_PATH + 'UKR.svg'
    };

    function initializePlugin() {  
        addCustomTemplate();  
        addStyles();  
        addSettings();
        attachLoader();  
    }  

    function addSettings() {
        const SUB_ID = PLUGIN_ID + '_btns';

        // 1. РЕЄСТРУЄМО ПЛАГІНИ (Обидва)
        Lampa.SettingsApi.addComponent({
            component: PLUGIN_ID,
            name: PLUGIN_NAME,
            icon: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#fff"><rect x="10" y="30" width="80" height="40" rx="5" fill="rgba(255,255,255,0.2)"/><circle cx="50" cy="50" r="12" fill="white"/></svg>'
        });

        Lampa.SettingsApi.addComponent({
            component: SUB_ID,
            name: 'Медіа кнопки'
        });

        // ПРИХОВУЄМО ПІДМЕНЮ З ГОЛОВНОГО СПИСКУ (Магія)
        setTimeout(() => {
            $(`div[data-component="${SUB_ID}"]`).remove();
        }, 100);

        const defaults = { 
            'cas_logo_scale': '100', 'cas_btn_scale': '100', 'cas_bg_animation': true, 
            'cas_show_studios': true, 'cas_show_quality': true, 'cas_blocks_gap': '30',
            'cas_custom_buttons': true
        };
        Object.keys(defaults).forEach(key => { if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]); });

        // --- ПАРАМЕТРИ ГОЛОВНОГО МЕНЮ ---
        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' }, default: '100' },
            field: { name: 'Розмір логотипу' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_blocks_gap', type: 'select', values: { '15':'Тісно','30':'Стандарт','45':'Просторе' }, default: '30' },
            field: { name: 'Відступи між блоками (px)' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_show_studios', type: 'trigger', default: true }, field: { name: 'Показувати студії' } });
        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_show_quality', type: 'trigger', default: true }, field: { name: 'Показувати якість' } });
        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_bg_animation', type: 'trigger', default: true }, field: { name: 'Анімація фону' }, onChange: applySettings });

        // Пункт для переходу
        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_open_btns', type: 'static' },
            field: { name: 'Медіа кнопки' },
            onRender: (item) => {
                item.append('<div style="float:right; opacity:0.5">➔</div>');
                item.on('hover:enter', () => {
                    Lampa.Settings.main(SUB_ID);
                });
            }
        });

        // --- ПАРАМЕТРИ ПІДМЕНЮ (Медіа кнопки) ---
        Lampa.SettingsApi.addParam({ 
            component: SUB_ID, 
            param: { name: 'cas_custom_buttons', type: 'trigger', default: true }, 
            field: { name: 'Стильні кнопки (Apple)' }, 
            onChange: applySettings 
        });

        Lampa.SettingsApi.addParam({
            component: SUB_ID,
            param: { name: 'cas_btn_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' }, default: '100' },
            field: { name: 'Розмір кнопок' },
            onChange: applySettings
        });

        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;
        const lScale = parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100;
        const bScale = parseInt(Lampa.Storage.get('cas_btn_scale') || 100) / 100;
        const gap = Lampa.Storage.get('cas_blocks_gap') || '30';
        
        root.style.setProperty('--cas-logo-scale', lScale);
        root.style.setProperty('--cas-btn-scale', bScale);
        root.style.setProperty('--cas-blocks-gap', gap + 'px');
        
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));
        $('body').toggleClass('cas--custom-buttons', !!Lampa.Storage.get('cas_custom_buttons'));
    }

    // --- Логіка рендеру та шаблони (незмінні) ---
    function getRatingColor(val) { const n = parseFloat(val); return n >= 7.5 ? '#2ecc71' : n >= 6 ? '#feca57' : '#ff4d4d'; }
    function formatTime(mins) { if (!mins) return ''; const h = Math.floor(mins / 60); const m = mins % 60; return (h > 0 ? h + 'г ' : '') + m + 'хв'; }

    function addCustomTemplate() {  
        const template = `<div class="full-start-new left-title cas-apple-style">  
        <div class="full-start-new__body">  
            <div class="full-start-new__left hide">  
                <div class="full-start-new__poster"><img class="full-start-new__img full--poster" /></div>  
            </div>  
            <div class="full-start-new__right">  
                <div class="left-title__content">  
                    <div class="cas-logo-container" style="margin-bottom: 30px;">
                        <div class="cas-logo"></div>
                        <div class="full-start-new__title">{title}</div>  
                    </div>
                    <div class="cas-ratings-line" style="display: flex; align-items: center; gap: 15px; margin-bottom: var(--cas-blocks-gap); font-weight: 600; font-size: 1.1em; color: rgba(255,255,255,0.9); flex-wrap: wrap;">
                        <div class="cas-rate-items" style="display: flex; align-items: center; gap: 12px;"></div>
                        <div class="cas-meta-info" style="opacity: 0.7; font-weight: 400;"></div>
                        <div class="cas-quality-row" style="display: flex; gap: 8px; align-items: center;"></div>
                    </div>
                    <div class="cas-studios-row" style="margin: 0 0 20px 0; display: flex; gap: 10px;"></div>
                    <div class="full-start-new__buttons applecation__buttons-row">  
                        <div class="full-start__button selector button--play">${ICONS.play} <span>#{title_watch}</span></div>  
                        <div class="full-start__button selector view--trailer">${ICONS.trailer} <span>#{full_trailers}</span></div>
                        <div class="full-start__button selector button--book">${ICONS.book} <span>#{settings_input_links}</span></div>  
                        <div class="full-start__button selector button--reaction">${ICONS.reaction} <span>#{title_reactions}</span></div>  
                        <div class="full-start__button selector button--options">${ICONS.options}</div>  
                    </div>  
                </div>  
                <div class="full-start-new__reactions selector"><div>#{reactions_none}</div></div>  
                <div class="full-start-new__rate-line"><div class="full-start__status hide"></div></div>  
            </div>  
        </div>  
    </div>`;  
        Lampa.Template.add('full_start_new', template);  
    }  
  
    function addStyles() {  
        const styles = `<style>  
:root { --cas-logo-scale: 1; --cas-btn-scale: 1; --cas-blocks-gap: 30px; }
.left-title .full-start-new__body { height: 85vh; }  
.left-title .full-start-new__right { display: flex; align-items: flex-end; padding-left: 5%; }  
.left-title__content { flex-grow: 1; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 50px; }  
.cas-apple-style .full-start-new__reactions, .cas-apple-style .full-start-new__rate-line, .cas-apple-style .full-start__status { display: none !important; opacity: 0 !important; }
.cas-logo img { max-width: calc(480px * var(--cas-logo-scale)); max-height: calc(180px * var(--cas-logo-scale)); object-fit: contain; object-position: left bottom; }
.cas-rate-item { display: flex; align-items: center; gap: 6px; }
.cas-rate-item img { height: 16px; width: auto; }
.cas-studio-item { height: 28px !important; filter: brightness(0) invert(1); opacity: 0.8; }
.cas-studio-item img { height: 100% !important; width: auto !important; }
.cas-quality-item { height: 20px; display: flex; align-items: center; }
.cas-quality-item img { height: 100%; width: auto; }
.applecation__buttons-row { display: flex; align-items: center; gap: calc(25px * var(--cas-btn-scale)); margin-top: 30px; flex-wrap: wrap; }
body.cas--custom-buttons .cas-apple-style .full-start__button { background: transparent !important; border: none !important; box-shadow: none !important; color: rgba(255,255,255,0.5) !important; padding: 12px 18px !important; display: flex; justify-content: center; align-items: center; gap: calc(12px * var(--cas-btn-scale)); font-size: calc(1.3em * var(--cas-btn-scale)); font-weight: 600; transition: transform 0.1s ease-out, color 0.1s ease-out !important; will-change: transform; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
body.cas--custom-buttons .cas-apple-style .full-start__button.focus { transform: scale(1.2) !important; color: #fff !important; filter: drop-shadow(0 0 8px rgba(255,255,255,0.9)) !important; z-index: 10; }
.cas-apple-style .full-start__button svg { width: calc(28px * var(--cas-btn-scale)); height: calc(28px * var(--cas-btn-scale)); }
@keyframes casKenBurns { 0% { transform: scale(1) translate(0, 0); } 50% { transform: scale(1.12) translate(-1%, -1%); } 100% { transform: scale(1) translate(0, 0); } }
body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 45s ease-in-out infinite !important; }
.left-title .full-start-new__title { font-size: 2.8em; font-weight: 700; color: #fff; }  
</style>`;  
        Lampa.Template.add('left_title_css', styles);  
        $('body').append(Lampa.Template.get('left_title_css', {}, true));  
    }
  
    function attachLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {  
                const data = event.data.movie;
                const render = event.object.activity.render();
                if (data && data.id) {
                    $.get(Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key()), (res) => {
                        const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                        if (bestLogo) {
                            render.find('.cas-logo').html('<img src="' + Lampa.TMDB.image('/t/p/w500' + bestLogo.file_path) + '">');
                            render.find('.full-start-new__title').hide();
                        }
                    });
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
                    const time = formatTime(data.runtime || data.episode_run_time);
                    const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');
                    render.find('.cas-meta-info').text((time ? time + (genre ? ' • ' : '') : '') + genre);
                    if (Lampa.Storage.get('cas_show_studios')) {
                        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);
                        render.find('.cas-studios-row').html(studios.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join(''));
                    }
                    if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {
                            if (res && res.Results) {
                                const b = { res: '', hdr: false, ukr: false };
                                res.Results.slice(0, 10).forEach(i => {
                                    const t = i.Title.toLowerCase();
                                    if (t.includes('4k')) b.res = '4K'; else if (!b.res && t.includes('1080')) b.res = 'FULL HD';
                                    if (t.includes('hdr') || t.includes('vision')) b.hdr = true;
                                    if (t.includes('ukr') || t.includes('укр')) b.ukr = true;
                                });
                                let qH = '';
                                if (b.res) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS[b.res]}"></div>`;
                                if (b.hdr) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;
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

    if (window.appready) initializePlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });  
  
})();
