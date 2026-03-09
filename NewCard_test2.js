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

    function getPref(key, defaultValue) {
        let val = Lampa.Storage.get(key);
        return (val === undefined || val === null) ? defaultValue : val;
    }

    const SETTINGS_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/><rect x="25" y="66" width="30" height="6" rx="3" fill="white" opacity="0.6"/><rect x="60" y="66" width="15" height="6" rx="3" fill="white" opacity="0.6"/></svg>`;

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

    function addSettings() {
        const defaults = {
            'cas_logo_scale': '100', 'cas_logo_quality': 'original', 'cas_bg_animation': true,
            'cas_slideshow_enabled': true, 'cas_blocks_gap': '20', 'cas_meta_size': '1.3',
            'cas_show_studios': true, 'cas_show_quality': true, 'cas_show_rating': true, 'cas_show_description': true
        };

        Object.keys(defaults).forEach(key => {
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);
        });

        Lampa.SettingsApi.addComponent({ component: PLUGIN_ID, name: PLUGIN_NAME, icon: SETTINGS_ICON });

        const params = [
            { name: 'cas_logo_quality', label: 'Якість логотипу', type: 'select', values: { 'w300':'300px', 'w500':'500px', 'original':'Original' } },
            { name: 'cas_logo_scale', label: 'Розмір логотипу', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' } },
            { name: 'cas_meta_size', label: 'Розмір шрифту', type: 'select', values: { '1.2': 'Малий', '1.3': 'Стандартний', '1.4': 'Збільшений', '1.5': 'Великий' } },
            { name: 'cas_blocks_gap', label: 'Відступи між блоками', type: 'select', values: { '15':'Тісно','20':'Стандарт','25':'Просторе' } },
            { name: 'cas_bg_animation', label: 'Анімація фону', type: 'trigger' },
            { name: 'cas_slideshow_enabled', label: 'Слайд-шоу фону', type: 'trigger' },
            { name: 'cas_show_studios', label: 'Показувати студії', type: 'trigger' },
            { name: 'cas_show_quality', label: 'Показувати якість', type: 'trigger' },
            { name: 'cas_show_rating', label: 'Показувати рейтинги', type: 'trigger' },
            { name: 'cas_show_description', label: 'Опис фільму', type: 'trigger' }
        ];

        params.forEach(p => {
            Lampa.SettingsApi.addParam({
                component: PLUGIN_ID,
                param: { name: p.name, type: p.type, values: p.values, default: defaults[p.name] },
                field: { name: p.label },
                onChange: applySettings
            });
        });

        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;
        root.style.setProperty('--cas-logo-scale', parseInt(getPref('cas_logo_scale', '100')) / 100);
        root.style.setProperty('--cas-blocks-gap', getPref('cas_blocks_gap', '20') + 'px');
        root.style.setProperty('--cas-meta-size', getPref('cas_meta_size', '1.3') + 'em');
        $('body').toggleClass('cas--zoom-enabled', !!getPref('cas_bg_animation', true));
    }

    function addCustomTemplate() {
        Lampa.Template.add('full_start_new', `
        <div class="full-start-new left-title">
            <div class="full-start-new__body">
                <div class="full-start-new__right">
                    <div class="left-title__content">
                        <div class="cas-logo-container" style="margin-bottom: var(--cas-blocks-gap);"><div class="cas-logo"></div></div>
                        <div class="cas-ratings-line">
                            <div class="cas-rate-items" style="display: flex; align-items: center; gap: 12px;"></div>
                            <div class="cas-meta-info" style="opacity: 0.7; font-weight: 400;"></div>
                            <div class="cas-quality-row" style="display: flex; gap: 8px; align-items: center;"></div>
                        </div>
                        <div class="cas-studios-row" style="margin-bottom: var(--cas-blocks-gap); display: flex; gap: 15px; align-items: center;"></div>
                        <div class="cas-description" style="margin-bottom: var(--cas-blocks-gap);"></div>
                        <div class="full-start-new__buttons">
                            <div class="full-start__button selector button--play"><svg width="28" height="29" viewBox="0 0 28 29" fill="none"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg><span>#{title_watch}</span></div>
                            <div class="full-start__button selector button--book"><svg width="21" height="32" viewBox="0 0 21 32" fill="none"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg><span>#{settings_input_links}</span></div>
                            <div class="full-start__button selector button--reaction"><svg width="38" height="34" viewBox="0 0 38 34" fill="none"><path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.180114 26.5147 0.417545 26.8042 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/><path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/></svg><span>#{title_reactions}</span></div>
                            <div class="full-start__button selector button--options"><svg width="38" height="10" viewBox="0 0 38 10" fill="none"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="hide buttons--container">
                <div class="full-start__button view--torrent hide"><span>#{full_torrents}</span></div> 
                <div class="full-start__button selector view--trailer"><span>#{full_trailers}</span></div>
            </div>
        </div>`);
    }

    function addStyles() {
        const styles = `<style>
            :root { --cas-logo-scale: 1; --cas-blocks-gap: 20px; --cas-meta-size: 1.3em; --cas-anim-curve: cubic-bezier(0.25, 1, 0.5, 1); }
            .full-start__background { will-change: transform; transform: translateZ(0); }
            .cas-logo, .cas-ratings-line, .cas-description, .cas-studios-row, .full-start-new__buttons { 
                backface-visibility: hidden; transform: translateZ(0) translateY(12px); opacity: 0;
                transition: opacity 0.4s var(--cas-anim-curve), transform 0.4s var(--cas-anim-curve);
            }
            .cas-animated .cas-logo, .cas-animated .cas-ratings-line, .cas-animated .cas-studios-row, .cas-animated .cas-description, .cas-animated .full-start-new__buttons { opacity: 1; transform: translateY(0); }
            .cas-description { max-width: 650px; font-size: var(--cas-meta-size); line-height: 1.4; color: rgba(255,255,255,0.7); display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
            .cas-studio-item img { height: 15px; filter: invert(1) brightness(1.1); opacity: 0.95; }
            .cas-quality-item img { height: 15px; }
            .left-title .full-start-new__buttons { margin-top: 1.2em; display: flex; gap: 20px; }
            .left-title .full-start-new__buttons .full-start__button { background: transparent !important; color: rgba(255,255,255,0.6) !important; display: flex; align-items: center; gap: 10px; transition: all 0.2s; }
            .left-title .full-start-new__buttons .full-start__button.focus { color: #fff !important; transform: scale(1.08) translateZ(0); }
            .cas-logo img { max-width: 450px; max-height: 180px; transform: scale(var(--cas-logo-scale)); transform-origin: left bottom; }
            .cas-ratings-line { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; font-size: var(--cas-meta-size); font-weight: 600; }
            .cas-rate-item img { height: 1.1em; }
            .left-title .full-start-new__body { height: 85vh; }
            .left-title .full-start-new__right { display: flex; align-items: flex-end; padding-bottom: 4vh; padding-left: 2%; }
            @keyframes casKenBurns { 0% { transform: scale(1) translateZ(0); } 50% { transform: scale(1.08) translateZ(0); } 100% { transform: scale(1) translateZ(0); } }
            body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 45s linear infinite !important; }
        </style>`;
        $('body').append(styles);
    }

    function stopSlideshow() {
        if (window.casBgInterval) { clearInterval(window.casBgInterval); window.casBgInterval = null; }
    }

    function attachLoader() {
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                const data = e.data.movie, render = e.object.activity.render();
                const $content = render.find('.left-title__content');
                
                $content.removeClass('cas-animated');
                stopSlideshow();
                e.object.activity.onBeforeDestroy = stopSlideshow;

                if (!data || !data.id) return;

                const cache = Lampa.Storage.get('cas_images_cache') || {};
                const cacheId = 'tmdb_' + data.id;

                const processImages = (res) => {
                    const logo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                    render.find('.cas-logo').html(logo ? `<img src="${Lampa.TMDB.image('/t/p/' + getPref('cas_logo_quality', 'original') + logo.file_path)}">` : `<div style="font-size:3em;font-weight:800;">${data.title || data.name}</div>`);
                    
                    if (getPref('cas_slideshow_enabled', true) && res.backdrops?.length > 1) {
                        let idx = 0;
                        window.casBgInterval = setInterval(() => {
                            const bg = render.find('.full-start__background img, img.full-start__background');
                            if (!bg.length) return stopSlideshow();
                            idx = (idx + 1) % Math.min(res.backdrops.length, 12);
                            bg.attr('src', Lampa.TMDB.image('/t/p/original' + res.backdrops[idx].file_path));
                        }, 12000);
                    }
                };

                if (cache[cacheId] && (Date.now() - cache[cacheId].time < CACHE_LIFETIME)) {
                    processImages(cache[cacheId].data);
                } else {
                    $.getJSON(Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key()), res => {
                        cache[cacheId] = { time: Date.now(), data: res };
                        Lampa.Storage.set('cas_images_cache', cache);
                        processImages(res);
                    });
                }

                render.find('.cas-description').toggle(!!getPref('cas_show_description', true)).text(data.overview || '');
                
                let rates = '';
                if (getPref('cas_show_rating', true)) {
                    const v = parseFloat(data.vote_average || 0).toFixed(1);
                    if (v > 0) rates += `<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(v)}">${v}</span></div>`;
                    if (e.data.reactions?.result) {
                        let s = 0, c = 0;
                        const cf = { fire:10, nice:7.5, think:5, bore:2.5, shit:0 };
                        e.data.reactions.result.forEach(r => { if (r.counter) { s += r.counter * cf[r.type]; c += r.counter; }});
                        if (c >= 5) {
                            const cv = (((data.name?7.4:6.5)*150+s)/(150+c)).toFixed(1);
                            rates += `<div class="cas-rate-item"><img src="${ICONS.cub}"> <span style="color:${getRatingColor(cv)}">${cv}</span></div>`;
                        }
                    }
                }
                render.find('.cas-rate-items').html(rates);

                const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));
                const genre = data.genres?.[0]?.name || '';
                render.find('.cas-meta-info').text((time && genre) ? `${time} • ${genre}` : (time || genre));

                if (getPref('cas_show_studios', true)) {
                    const s = (data.networks || data.production_companies || []).filter(i => i.logo_path).slice(0, 3);
                    render.find('.cas-studios-row').html(s.map(i => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + i.logo_path)}"></div>`).join('')).show();
                }

                if (getPref('cas_show_quality', true) && Lampa.Parser.get) {
                    Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {
                        const items = res.Results || res;
                        if (items?.length) {
                            const b = { res:'', hdr:false, dv:false, ukr:false };
                            items.slice(0, 15).forEach(i => {
                                const t = (i.Title || i.title || '').toLowerCase();
                                if (t.includes('4k') || t.includes('2160')) b.res = '4K';
                                else if (!b.res && (t.includes('1080') || t.includes('fhd'))) b.res = 'FULL HD';
                                if (t.includes('hdr')) b.hdr = true;
                                if (t.includes('dv') || t.includes('vision')) b.dv = true;
                                if (t.includes('ukr') || t.includes('укр')) b.ukr = true;
                            });
                            let h = '';
                            if (b.res) h += `<div class="cas-quality-item"><img src="${QUALITY_ICONS[b.res]}"></div>`;
                            if (b.dv) h += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['Dolby Vision']}"></div>`;
                            else if (b.hdr) h += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;
                            if (b.ukr) h += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['UKR']}"></div>`;
                            if (h) render.find('.cas-quality-row').html('<span style="opacity:0.5;margin:0 5px">•</span>' + h).show();
                        }
                    });
                }
                setTimeout(() => $content.addClass('cas-animated'), 200);
            }
        });
    }

    function start() {
        addCustomTemplate();
        addStyles();
        addSettings();
        attachLoader();
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') start(); });
})();
