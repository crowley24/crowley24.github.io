(function () {  
    'use strict';  
  
    const PLUGIN_NAME = 'Clean & Apple Style';
    const PLUGIN_ID = 'clean_apple_style_v2'; // Оновив ID для чистоти
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
            'cas_show_ratings': true,
            'cas_show_studios': true,
            'cas_show_quality': true
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
            field: { name: 'Розмір логотипу' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_show_ratings', type: 'trigger', default: true },
            field: { name: 'Показувати рейтинги' }
        });
    }

    function getCubRating(event) {
        try {
            const results = event?.data?.reactions?.result;
            if (!results || !Array.isArray(results)) return null;
            
            const coef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
            let sum = 0, cnt = 0;
            
            results.forEach(r => {
                if (r.counter && coef[r.type] !== undefined) {
                    sum += (r.counter * coef[r.type]);
                    cnt += r.counter;
                }
            });
            
            if (cnt >= 5) return ((6.5 * 100 + sum) / (100 + cnt)).toFixed(1);
        } catch (e) { console.log('CAS Error:', e); }
        return null;
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
                    <div class="cas-logo-container" style="margin-bottom: 25px;">
                        <div class="cas-logo"></div>
                        <div class="full-start-new__title">{title}</div>  
                    </div>
                    
                    <div class="cas-info-line" style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; font-weight: 600; font-size: 1.1em; color: #fff;">
                    </div>

                    <div class="cas-studios-row" style="margin-bottom: 25px; display: flex; gap: 15px;"></div>

                    <div class="full-start-new__buttons">  
                        <div class="full-start__button selector button--play">
                             <span>#{title_watch}</span>
                        </div>
                        <div class="full-start__button selector button--book">
                             <span>#{settings_input_links}</span>
                        </div>
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
            :root { --cas-logo-scale: 1; }
            .left-title .full-start-new__right { display: flex; align-items: flex-end; padding-left: 5%; height: 85vh; width: 100%; }  
            .left-title__content { display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 60px; width: 100%; }  
            .cas-logo img { max-width: calc(400px * var(--cas-logo-scale)); max-height: calc(140px * var(--cas-logo-scale)); object-fit: contain; object-position: left; }
            .cas-info-line > div { display: flex; align-items: center; gap: 6px; }
            .cas-info-line img { height: 18px; width: auto; vertical-align: middle; }
            .cas-studio-item { height: 25px; filter: brightness(0) invert(1); opacity: 0.7; }
            .cas-studio-item img { height: 100% !important; width: auto !important; }
        </style>`;  
        $('body').append(styles);  
    }  
  
    function attachLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {  
                const data = event.data.movie;
                const render = event.object.activity.render();
                const infoLine = render.find('.cas-info-line');
                if (!infoLine.length) return;
                
                infoLine.empty();

                // 1. Logo
                const logoPath = (data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key();
                $.get(Lampa.TMDB.api(logoPath), (res) => {
                    const best = res.logos?.find(l => l.iso_639_1 === 'uk') || res.logos?.find(l => l.iso_639_1 === 'en') || res.logos?.[0];
                    if (best) {
                        render.find('.cas-logo').html('<img src="' + Lampa.TMDB.image('/t/p/w500' + best.file_path) + '">');
                        render.find('.full-start-new__title').hide();
                    }
                });

                // 2. Ratings + Meta (в один рядок)
                if (Lampa.Storage.get('cas_show_ratings')) {
                    const tmdb = parseFloat(data.vote_average || 0).toFixed(1);
                    if (tmdb > 0) infoLine.append(`<div><img src="${ICONS.tmdb}"><span>${tmdb}</span></div>`);
                    
                    const cub = getCubRating(event);
                    if (cub) infoLine.append(`<div><img src="${ICONS.cub}"><span>${cub}</span></div>`);
                }

                const runtime = formatTime(data.runtime || data.episode_run_time);
                const genre = data.genres?.[0]?.name;
                if (runtime || genre) {
                    const text = (runtime ? runtime : '') + (runtime && genre ? ' • ' : '') + (genre ? genre : '');
                    infoLine.append(`<div style="opacity: 0.7; font-weight: 400;">${text}</div>`);
                }

                // 3. Studios
                if (Lampa.Storage.get('cas_show_studios')) {
                    const st = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);
                    render.find('.cas-studios-row').html(st.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join(''));
                }

                // 4. Quality (додаємо в той же інфо-рядок)
                if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser) {
                    Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {
                        if (res?.Results) {
                            const b = { res: '', hdr: false, dv: false, ukr: false };
                            res.Results.slice(0, 10).forEach(i => {
                                const t = i.Title.toLowerCase();
                                if (t.includes('4k')) b.res = '4K'; else if (!b.res && t.includes('1080')) b.res = 'FULL HD';
                                if (t.includes('hdr')) b.hdr = true;
                                if (t.includes('vision') || t.includes(' dv ')) b.dv = true;
                                if (t.includes('ukr') || t.includes('укр')) b.ukr = true;
                            });
                            if (b.res) infoLine.append(`<div><img src="${QUALITY_ICONS[b.res]}"></div>`);
                            if (b.dv) infoLine.append(`<div><img src="${QUALITY_ICONS['Dolby Vision']}"></div>`);
                            else if (b.hdr) infoLine.append(`<div><img src="${QUALITY_ICONS['HDR']}"></div>`);
                            if (b.ukr) infoLine.append(`<div><img src="${QUALITY_ICONS['UKR']}"></div>`);
                        }
                    });
                }
            }  
        });  
    }  

    if (window.appready) initializePlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });  
})();
