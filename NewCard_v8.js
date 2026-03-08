(function () {  
    'use strict';  
  
    const PLUGIN_NAME = 'Clean & Apple Style';
    const PLUGIN_ID = 'clean_apple_style';
    const ASSETS_PATH = 'https://crowley24.github.io/NewIcons/';

    const ICONS = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    const QUALITY_ICONS = {
        '4K': ASSETS_PATH + '4K.svg', '2K': ASSETS_PATH + '2K.svg', 'FULL HD': ASSETS_PATH + 'FULL HD.svg',
        'HD': ASSETS_PATH + 'HD.svg', 'HDR': ASSETS_PATH + 'HDR.svg', 'Dolby Vision': ASSETS_PATH + 'Dolby Vision.svg',
        'UKR': ASSETS_PATH + 'UKR.svg'
    };

    function initializePlugin() {  
        addCustomTemplate();  
        addStyles();  
        addSettings();
        attachLoader();  
    }  

    function addSettings() {
        const defaults = {
            'cas_logo_scale': '100',
            'cas_bg_animation': true,
            'cas_blocks_gap': '30',
            'cas_show_studios': true,
            'cas_show_quality': true,
            'cas_show_ratings': true
        };

        Object.keys(defaults).forEach(key => {
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);
        });

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_ID,
            name: PLUGIN_NAME,
            icon: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#fff"><rect x="10" y="30" width="80" height="40" rx="5" fill="rgba(255,255,255,0.2)"/><circle cx="50" cy="50" r="12" fill="white"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' }, default: '100' },
            field: { name: 'Розмір логотипу' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_blocks_gap', type: 'select', values: { '15':'Тісно','30':'Стандарт','45':'Просторе' }, default: '30' },
            field: { name: 'Відступи між блоками' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_show_ratings', type: 'trigger', default: true },
            field: { name: 'Показувати рейтинги' }
        });

        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_show_studios', type: 'trigger', default: true }, field: { name: 'Показувати студії' } });
        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_show_quality', type: 'trigger', default: true }, field: { name: 'Показувати якість' } });
        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_bg_animation', type: 'trigger', default: true }, field: { name: 'Анімація фону' }, onChange: applySettings });

        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;
        const scale = parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100;
        const gap = Lampa.Storage.get('cas_blocks_gap') || '30';
        root.style.setProperty('--cas-logo-scale', scale);
        root.style.setProperty('--cas-blocks-gap', gap + 'px');
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));
    }

    function formatTime(mins) {
        if (!mins) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return (h > 0 ? h + 'г ' : '') + m + 'хв';
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
                    
                    <div class="cas-info-line" style="display: flex; align-items: center; gap: 15px; margin-bottom: var(--cas-blocks-gap); flex-wrap: wrap; font-weight: 600; font-size: 1.1em; color: #fff;">
                        <div class="cas-rate-items" style="display: flex; align-items: center; gap: 12px;"></div>
                        <div class="cas-meta-info" style="opacity: 0.7; font-weight: 400;"></div>
                        <div class="cas-quality-row" style="display: flex; gap: 8px; align-items: center;"></div>
                    </div>

                    <div class="cas-studios-row" style="margin-bottom: var(--cas-blocks-gap); display: flex; gap: 15px;"></div>

                    <div class="full-start-new__buttons">  
                        <div class="full-start__button selector button--play"><span>#{title_watch}</span></div>
                        <div class="full-start__button selector button--book"><span>#{settings_input_links}</span></div>
                        <div class="full-start__button selector button--options">
                            <svg width="30" height="8" viewBox="0 0 38 10" fill="none"><circle cx="4.8" cy="5" r="4.7" fill="currentColor"/><circle cx="19" cy="5" r="4.7" fill="currentColor"/><circle cx="33" cy="5" r="4.7" fill="currentColor"/></svg>
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
            :root { --cas-logo-scale: 1; --cas-blocks-gap: 30px; }
            .left-title .full-start-new__right { display: flex; align-items: flex-end; padding-left: 5%; height: 85vh; width: 100%; }  
            .left-title__content { display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 60px; width: 100%; }  
            .cas-logo img { max-width: calc(450px * var(--cas-logo-scale)); max-height: calc(180px * var(--cas-logo-scale)); object-fit: contain; object-position: left bottom; }
            .cas-rate-item { display: flex; align-items: center; gap: 6px; }
            .cas-rate-item img { height: 18px; width: auto; }
            .cas-studio-item { height: 28px !important; filter: brightness(0) invert(1); opacity: 0.8; }
            .cas-studio-item img { height: 100% !important; width: auto !important; }
            .cas-quality-item { height: 20px; display: flex; align-items: center; }
            .cas-quality-item img { height: 100%; width: auto; }
            @keyframes casKenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
            body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 45s ease-in-out infinite !important; }
        </style>`;  
        $('body').append(styles);  
    }  
  
    function attachLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {  
                const data = event.data.movie;
                const render = event.object.activity.render();
                
                // Логотип
                $.get(Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key()), (res) => {
                    const best = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                    if (best) {
                        render.find('.cas-logo').html('<img src="' + Lampa.TMDB.image('/t/p/w500' + best.file_path) + '">');
                        render.find('.full-start-new__title').hide();
                    }
                });

                // Рейтинги (TMDB + Cub)
                if (Lampa.Storage.get('cas_show_ratings')) {
                    let rHtml = '';
                    const tmdb = parseFloat(data.vote_average || 0).toFixed(1);
                    if (tmdb > 0) rHtml += `<div class="cas-rate-item"><img src="${ICONS.tmdb}"><span>${tmdb}</span></div>`;
                    
                    if (event.data.reactions && event.data.reactions.result) {
                        let sum = 0, cnt = 0;
                        const coef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
                        event.data.reactions.result.forEach(r => { if (r.counter) { sum += (r.counter * coef[r.type]); cnt += r.counter; } });
                        if (cnt >= 5) {
                            const cub = ((6.5 * 100 + sum) / (100 + cnt)).toFixed(1);
                            rHtml += `<div class="cas-rate-item"><img src="${ICONS.cub}"><span>${cub}</span></div>`;
                        }
                    }
                    render.find('.cas-rate-items').html(rHtml);
                }

                // Мета (Час + Жанр)
                const runtime = formatTime(data.runtime || data.episode_run_time);
                const genre = data.genres?.[0]?.name;
                if (runtime || genre) {
                    render.find('.cas-meta-info').text((runtime ? runtime : '') + (runtime && genre ? ' • ' : '') + (genre ? genre : ''));
                }

                // Студії
                if (Lampa.Storage.get('cas_show_studios')) {
                    const st = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);
                    render.find('.cas-studios-row').html(st.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join(''));
                }

                // Якість (Парсер)
                if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser) {
                    Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {
                        if (res?.Results) {
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
                            render.find('.cas-quality-row').html(qH);
                        }
                    });
                }
            }  
        });  
    }  

    if (window.appready) initializePlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });  
})();
