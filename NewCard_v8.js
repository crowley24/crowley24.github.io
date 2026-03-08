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
            'cas_show_ratings': true, // Нове: вимкнення рейтингів
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
            field: { name: 'Розмір логотипу' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_show_ratings', type: 'trigger', default: true },
            field: { name: 'Показувати рейтинги' }
        });

        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_show_studios', type: 'trigger', default: true }, field: { name: 'Показувати студії' } });
        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_show_quality', type: 'trigger', default: true }, field: { name: 'Показувати якість' } });

        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;
        const scale = parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100;
        root.style.setProperty('--cas-logo-scale', scale);
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));
    }

    // Розрахунок рейтингу Lampa (Cub)
    function getCubRating(e) {
        if (!e.data || !e.data.reactions || !e.data.reactions.result) return null;
        var reactionCoef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
        var sum = 0, cnt = 0;
        e.data.reactions.result.forEach(function(r) {
            if (r.counter) { sum += (r.counter * reactionCoef[r.type]); cnt += r.counter; }
        });
        if (cnt >= 5) {
            var isTv = e.object.method === 'tv', avg = isTv ? 7.4 : 6.5, m = isTv ? 50 : 150;
            return ((avg * m + sum) / (m + cnt)).toFixed(1);
        }
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
                    <div class="cas-logo-container" style="margin-bottom: var(--cas-blocks-gap);">
                        <div class="cas-logo"></div>
                        <div class="full-start-new__title">{title}</div>  
                    </div>
                      
                    <div class="cas-info-line" style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--cas-blocks-gap); flex-wrap: wrap; font-weight: 600; font-size: 1.1em; color: rgba(255,255,255,0.9);">
                    </div>

                    <div class="cas-studios-row" style="margin-bottom: var(--cas-blocks-gap); display: flex; gap: 15px;"></div>

                    <div class="full-start-new__buttons">  
                        <div class="full-start__button selector button--play">
                             <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>
                             <span>#{title_watch}</span>
                        </div>
                        <div class="full-start__button selector button--book">
                             <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg>
                             <span>#{settings_input_links}</span>
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
        const styles = `<style>  
:root { --cas-logo-scale: 1; --cas-blocks-gap: 20px; }
.left-title .full-start-new__right { display: flex; align-items: flex-end; padding-left: 5%; height: 85vh; }  
.left-title__content { flex-grow: 1; display: flex; flex-direction: column; justify-content: flex-end; padding-bottom: 80px; }  
.cas-logo img { max-width: calc(450px * var(--cas-logo-scale)); max-height: calc(150px * var(--cas-logo-scale)); object-fit: contain; object-position: left bottom; }
.cas-info-line > div { display: flex; align-items: center; gap: 6px; }
.cas-info-line img { height: 18px; width: auto; }
.cas-studio-item { height: 30px !important; filter: brightness(0) invert(1); opacity: 0.8; }
.cas-studio-item img { height: 100% !important; }
.cas-dot { opacity: 0.5; }
</style>`;  
        $('body').append(styles);  
    }  
  
    function attachLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {  
                const data = event.data.movie;
                const render = event.object.activity.render();
                const infoLine = render.find('.cas-info-line');
                infoLine.empty();

                // 1. Логотип
                const url = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());
                $.get(url, (res) => {
                    const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                    if (bestLogo) {
                        render.find('.cas-logo').html('<img src="' + Lampa.TMDB.image('/t/p/w500' + bestLogo.file_path) + '">');
                        render.find('.full-start-new__title').hide();
                    }
                });

                // 2. Рейтинги (в той же рядок)
                if (Lampa.Storage.get('cas_show_ratings')) {
                    const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);
                    if (tmdbV > 0) infoLine.append(`<div><img src="${ICONS.tmdb}"><span>${tmdbV}</span></div>`);
                    
                    const cubV = getCubRating(event);
                    if (cubV) infoLine.append(`<div><img src="${ICONS.cub}"><span>${cubV}</span></div>`);
                }

                // 3. Мета-дані (Час + Жанр)
                const time = formatTime(data.runtime || data.episode_run_time);
                const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');
                
                if (time || genre) {
                    let metaText = (time ? time : '') + (time && genre ? ' • ' : '') + (genre ? genre : '');
                    infoLine.append(`<div style="opacity: 0.8; font-weight: 400;">${metaText}</div>`);
                }

                // 4. Студії
                if (Lampa.Storage.get('cas_show_studios')) {
                    const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);
                    render.find('.cas-studios-row').html(studios.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join(''));
                }

                // 5. Якість (додаємо в кінець того ж рядка info-line)
                if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser.get) {
                    Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {
                        if (res && res.Results) {
                            const b = { res: '', hdr: false, dv: false, ukr: false };
                            res.Results.slice(0, 15).forEach(i => {
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

    function startPlugin() {  
        initializePlugin();  
    }  
  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });  
})();
