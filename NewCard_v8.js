(function () {
    'use strict';

    const PLUGIN_NAME = 'NewCard Full Optimized';
    const PLUGIN_ID = 'new_card_style_full';
    const ASSETS_PATH = 'https://crowley24.github.io/NewIcons/';

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
        if (n >= 7.5) return '#2ecc71';
        if (n >= 6) return '#feca57';
        return '#ff4d4d';
    }

    function formatTime(mins) {
        if (!mins) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0) return h + 'г ' + (m > 0 ? m + 'хв' : '');
        return m + 'хв';
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
            icon: SETTINGS_ICON
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_logo_quality', type: 'select', values: { 'w300':'300px', 'w500':'500px', 'original':'Original' }, default: 'original' },
            field: { name: 'Якість логотипу' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' }, default: '100' },
            field: { name: 'Розмір логотипу' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_meta_size', type: 'select', values: { '1.2': 'Малий', '1.3': 'Стандартний', '1.4': 'Збільшений', '1.5': 'Великий' }, default: '1.3' },
            field: { name: 'Розмір шрифту' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_blocks_gap', type: 'select', values: { '15':'Тісно','20':'Стандарт','25':'Просторе' }, default: '20' },
            field: { name: 'Відступи між блоками' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_bg_animation', type: 'trigger', default: true },
            field: { name: 'Анімація фону (Ken Burns)' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_slideshow_enabled', type: 'trigger', default: true }, field: { name: 'Слайд-шоу фону' } });
        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_show_studios', type: 'trigger', default: true }, field: { name: 'Показувати студії' } });
        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_show_quality', type: 'trigger', default: true }, field: { name: 'Показувати якість' } });
        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_show_rating', type: 'trigger', default: true }, field: { name: 'Показувати рейтинги' } });
        Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_show_description', type: 'trigger', default: true }, field: { name: 'Опис фільму' } });

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
                        
                        <div class="cas-ratings-line">
                            <div class="cas-rate-items" style="display: flex; align-items: center; gap: 12px;"></div>
                            <div class="cas-meta-info" style="opacity: 0.7; font-weight: 400;"></div>
                            <div class="cas-quality-row" style="display: flex; gap: 8px; align-items: center;"></div>
                        </div>

                        <div class="cas-studios-row" style="margin-bottom: var(--cas-blocks-gap); display: flex; gap: 15px; align-items: center;"></div>

                        <div class="cas-description" style="margin-bottom: var(--cas-blocks-gap);"></div>

                        <div class="full-start-new__buttons">
                            <div class="full-start__button selector button--play">
                                <svg width="28" height="29" viewBox="0 0 28 29" fill="none"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>
                                <span>#{title_watch}</span>
                            </div>

                            <div class="full-start__button selector button--book">
                                <svg width="21" height="32" viewBox="0 0 21 32" fill="none"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg>
                                <span>#{settings_input_links}</span>
                            </div>

                            <div class="full-start__button selector button--trailer">
                                <svg height="70" viewBox="0 0 80 70" fill="none"><path d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"/></svg>
                                <span>#{full_trailers}</span>
                            </div>

                            <div class="full-start__button selector button--reaction">
                                <svg width="38" height="34" viewBox="0 0 38 34" fill="none"><path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.108666 25.7962 0.417545 26.8042 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C30.4289 28.4303 37.2078 12.065 37.3165 11.5196C37.3165 11.3325 37.208 10.9742Z" fill="currentColor"/></svg>
                                <span>#{title_reactions}</span>
                            </div>

                            <div class="full-start__button selector button--options">
                                <svg width="38" height="10" viewBox="0 0 38 10" fill="none"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="rating--modss" style="display: none;"></div>
        </div>`;
        Lampa.Template.add('full_start_new', template);
    }

    function addStyles() {
        const styles = `<style>
            :root { 
                --cas-logo-scale: 1; 
                --cas-blocks-gap: 20px; 
                --cas-meta-size: 1.3em; 
                --cas-anim-curve: cubic-bezier(0.2, 0.8, 0.2, 1); 
            }
            
            /* GPU Acceleration */
            .left-title__content, .cas-logo, .cas-description, .full-start-new__buttons, .full-start__background {
                backface-visibility: hidden; transform: translateZ(0); will-change: transform, opacity;
            }

            .cas-logo, .cas-ratings-line, .cas-description, .cas-studios-row, .full-start-new__buttons {
                opacity: 0; transform: translateY(12px) translateZ(0);
                transition: opacity 0.4s var(--cas-anim-curve), transform 0.4s var(--cas-anim-curve);
            }
            .cas-animated .cas-logo { opacity: 1; transform: translateY(0); transition-delay: 50ms; }
            .cas-animated .cas-ratings-line { opacity: 1; transform: translateY(0); transition-delay: 120ms; }
            .cas-animated .cas-studios-row { opacity: 1; transform: translateY(0); transition-delay: 180ms; }
            .cas-animated .cas-description { opacity: 1; transform: translateY(0); transition-delay: 250ms; }
            .cas-animated .full-start-new__buttons { opacity: 1; transform: translateY(0); transition-delay: 320ms; }

            .cas-description {
                max-width: 650px; font-size: var(--cas-meta-size); line-height: 1.4;
                color: rgba(255,255,255,0.7); font-weight: 400;
                display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
                contain: layout style;
            }

            .left-title .full-start-new__buttons { margin-top: 1.5em; display: flex; gap: 20px; }
            .left-title .full-start__button {
                background: transparent !important; color: rgba(255,255,255,0.5) !important;
                display: flex; align-items: center; gap: 10px; transition: all 0.25s var(--cas-anim-curve);
                height: auto !important; padding: 0 !important; border: none !important;
            }
            .left-title .full-start__button.focus {
                color: #fff !important; transform: scale(1.08) translateZ(0);
                filter: drop-shadow(0 0 8px rgba(255,255,255,0.6));
            }
            .left-title .full-start__button svg { width: 28px !important; height: 28px !important; }

            .cas-logo img { max-width: 450px; max-height: 160px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6)); }
            .cas-studio-item img { height: 18px; filter: invert(1) brightness(1.2); opacity: 0.85; }
            .cas-ratings-line { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: var(--cas-meta-size); font-weight: 600; }
            .cas-rate-item img { height: 1.1em; }
            .cas-quality-item img { height: 18px; }

            .left-title .full-start-new__body { height: 100vh; }
            .left-title .full-start-new__right { display: flex; align-items: flex-end; padding-bottom: 8vh; padding-left: 5%; }

            @keyframes casKenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
            body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 45s linear infinite !important; }
        </style>`;
        $('body').append(styles);
    }

    function attachLoader() {
        Lampa.Listener.follow('full', (event) => {
            if (event.type === 'complite') {
                const data = event.data.movie;
                const render = event.object.activity.render();
                const content = render.find('.left-title__content');
                content.removeClass('cas-animated');

                if (data && data.id) {
                    const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());
                    $.getJSON(imagesUrl, (res) => {
                        const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                        if (bestLogo) {
                            render.find('.cas-logo').html(`<img src="${Lampa.TMDB.image('/t/p/w500' + bestLogo.file_path)}">`);
                        } else {
                            render.find('.cas-logo').html(`<div style="font-size: 2.8em; font-weight: 800;">${data.title || data.name}</div>`);
                        }

                        if (window.casBgInterval) clearInterval(window.casBgInterval);
                        if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops?.length > 1) {
                            let idx = 0;
                            window.casBgInterval = setInterval(() => {
                                const bg = $('.full-start__background img, img.full-start__background');
                                if (!bg.length) return clearInterval(window.casBgInterval);
                                idx = (idx + 1) % Math.min(res.backdrops.length, 15);
                                bg.attr('src', Lampa.TMDB.image('/t/p/original' + res.backdrops[idx].file_path));
                            }, 15000);
                        }
                    });

                    // ОПИС
                    if (Lampa.Storage.get('cas_show_description')) {
                        render.find('.cas-description').text(data.overview || '').show();
                    } else {
                        render.find('.cas-description').hide();
                    }

                    // РЕЙТИНГИ
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

                    // МЕТА
                    const time = formatTime(data.runtime || data.episode_run_time);
                    const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');
                    render.find('.cas-meta-info').text((time ? time + (genre ? ' • ' : '') : '') + genre);

                    // СТУДІЇ
                    if (Lampa.Storage.get('cas_show_studios')) {
                        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);
                        render.find('.cas-studios-row').html(studios.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join(''));
                    }

                    // ЯКІСТЬ (ПОВНА ЛОГІКА)
                    if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {
                            const items = res.Results || res;
                            if (items && Array.isArray(items) && items.length > 0) {
                                const b = { res: '', hdr: false, dv: false, ukr: false };
                                items.slice(0, 15).forEach(i => {
                                    const t = (i.Title || i.title || '').toLowerCase();
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
                                if (qH) render.find('.cas-quality-row').html('<span style="opacity: 0.5; margin: 0 5px;">•</span>' + qH);
                            }
                        });
                    }
                }
                setTimeout(() => content.addClass('cas-animated'), 100);
            }
        });
    }

    function startPlugin() {
        addCustomTemplate();
        addStyles();
        addSettings();
        attachLoader();
        if (Lampa.Component) Lampa.Component.add('full_start_new', {});
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });
})();
