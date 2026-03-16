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
        'settings_cas_show_description': 'Опис фільму'
    };

    let debounceTimer;
    function debounce(func, delay) {
        return function () {
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
            { name: 'cas_logo_quality', type: 'select', values: { 'w300': '300px', 'w500': '500px', 'original': 'Original' } },
            { name: 'cas_logo_scale', type: 'select', values: { '70': '70%', '80': '80%', '90': '90%', '100': '100%', '110': '110%', '120': '120%' } },
            { name: 'cas_meta_size', type: 'select', values: { '1.2': 'Малий', '1.3': 'Стандартний', '1.4': 'Збільшений', '1.5': 'Великий' } },
            { name: 'cas_blocks_gap', type: 'select', values: { '15': 'Тісно', '20': 'Стандарт', '25': 'Просторе' } },
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
                param: {
                    name: p.name,
                    type: p.type,
                    values: p.values,
                    default: defaults[p.name]
                },
                field: {
                    name: TRANSLATIONS['settings_' + p.name]
                },
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
        
        const currentCard = $('.full-start-new.left-title');
        if (currentCard.length > 0) {
            currentCard.find('.cas-description').toggle(!!Lampa.Storage.get('cas_show_description'));
            currentCard.find('.cas-studios-row').toggle(!!Lampa.Storage.get('cas_show_studios'));
            currentCard.find('.cas-quality-row').toggle(!!Lampa.Storage.get('cas_show_quality'));
            currentCard.find('.cas-rate-items').toggle(!!Lampa.Storage.get('cas_show_rating'));
        }
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
                        <div class="full-start-new__buttons">          
                            <div class="full-start__button selector button--play">          
                                <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>          
                                <span>#{title_watch}</span>          
                            </div>          
                            <div class="full-start__button selector view--torrent">          
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="24" height="24"><path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/></svg>          
                                <span>#{full_torrents}</span>          
                            </div>          
                            <div class="full-start__button selector view--trailer">          
                                <svg height="24" viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"/></svg>          
                                <span>#{full_trailers}</span>          
                            </div>          
                            <div class="full-start__button selector button--book">          
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 5V19L12 15L19 19V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>          
                                <span>#{settings_input_links}</span>          
                            </div>          
                        </div>          
                    </div>          
                    <div class="full-start-new__reactions selector hide"></div>          
                    <div class="full-start-new__rate-line hide"></div>          
                </div>          
            </div>          
        </div>`;
        Lampa.Template.add('full_start_new', template);
    }

    function addStyles() {
        const styles = `<style>          
        :root { --cas-logo-scale: 1; --cas-blocks-gap: 30px; --cas-meta-size: 1.3em; --cas-anim-curve: cubic-bezier(0.2, 0.8, 0.2, 1); }          
        .full-start__background { will-change: transform; transform: translateZ(0); transition: transform 0.8s ease-out; transform: scale(1.1); }          
        .cas-animated .full-start__background { transform: scale(1); }
        
        .cas-logo, .cas-studios-row, .cas-rate-items, .cas-meta-info, .cas-quality-row, .cas-description {
            opacity: 0 !important; transform: translateY(10px);
            transition: opacity 0.4s var(--cas-anim-curve), transform 0.4s var(--cas-anim-curve);
        }
        
        .cas-animated .cas-logo { opacity: 1 !important; transform: translateY(0); transition-delay: 0s; }          
        .cas-animated .cas-studios-row { opacity: 0.9 !important; transform: translateY(0); transition-delay: 0.1s; }          
        .cas-animated .cas-rate-items { opacity: 1 !important; transform: translateY(0); transition-delay: 0.2s; }          
        .cas-animated .cas-meta-info { opacity: 0.7 !important; transform: translateY(0); transition-delay: 0.3s; }          
        .cas-animated .cas-quality-row { opacity: 0.9 !important; transform: translateY(0); transition-delay: 0.4s; }          
        .cas-animated .cas-description { opacity: 0.7 !important; transform: translateY(0); transition-delay: 0.15s; }
        
        .full-start-new__buttons {          
            display: flex !important; flex-direction: row !important; gap: 15px; margin-top: 1.5em;          
            opacity: 0 !important; transform: translateY(15px);
            transition: opacity 0.5s ease-out, transform 0.5s ease-out !important;
        }          
        .cas-animated .full-start-new__buttons { opacity: 1 !important; transform: translateY(0); transition-delay: 0.5s; }
        
        .left-title .full-start-new__buttons .full-start__button {          
            background: rgba(255,255,255,0.05) !important; color: rgba(255,255,255,0.6) !important;          
            display: flex; align-items: center; gap: 10px; transition: all 0.3s ease;          
            border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px !important; padding: 10px 18px !important;
        }          
        .left-title .full-start-new__buttons .full-start__button.focus {          
            color: #fff !important; transform: scale(1.05); background: rgba(255,255,255,0.15) !important; border-color: rgba(255,255,255,0.4) !important;          
        }
        
        .cas-logo img { max-width: 450px; max-height: 180px; transform: scale(var(--cas-logo-scale)); transform-origin: left bottom; }          
        .cas-description { font-size: var(--cas-meta-size) !important; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; max-width: 700px; }          
        .cas-rate-item img { height: 1.1em; vertical-align: middle; margin-right: 4px; }
        
        @keyframes casKenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }          
        body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 45s linear infinite !important; }          
        </style>`;
        $('body').append(styles);
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

    function stopSlideshow() {
        if (window.casBgInterval) {
            clearInterval(window.casBgInterval);
            window.casBgInterval = null;
        }
    }

    function startSlideshow(render, backdrops) {
        let idx = 0;
        stopSlideshow();
        window.casBgInterval = setInterval(() => {
            const bg = render.find('.full-start__background img, img.full-start__background');
            if (!bg.length) return stopSlideshow();
            idx = (idx + 1) % Math.min(backdrops.length, 15);
            const nextSrc = Lampa.TMDB.image('/t/p/original' + backdrops[idx].file_path);
            bg.css('opacity', '0.5');
            setTimeout(() => {
                bg.attr('src', nextSrc);
                bg.css('opacity', '1');
            }, 500);
        }, 15000);
    }

    async function processImages(render, data, res) {
        const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
        if (bestLogo) {
            const quality = Lampa.Storage.get('cas_logo_quality') || 'original';
            const logoSrc = Lampa.TMDB.image('/t/p/' + quality + bestLogo.file_path);
            render.find('.cas-logo').html(`<img src="${logoSrc}">`);
        } else {
            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);
        }
        if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops?.length > 1) {
            startSlideshow(render, res.backdrops);
        }
    }

    function loadMovieDataOptimized(render, data) {
        // Description
        render.find('.cas-description').text(data.overview || '').show();
        
        // Rating TMDB
        const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);
        let ratesHtml = tmdbV > 0 ? `<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>` : '';
        render.find('.cas-rate-items').html(ratesHtml);

        // Meta (Time & Genre)
        const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));
        const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');
        render.find('.cas-meta-info').text((time ? time + (genre ? ' • ' : '') : '') + genre);

        // Studios
        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);
        render.find('.cas-studios-row').html(studios.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}" style="height:20px; margin-right:10px;"></div>`).join(''));
    }

    const debouncedLoadMovieData = debounce((render, data) => {
        loadMovieDataOptimized(render, data);
    }, 100);

    function attachLoader() {
        Lampa.Listener.follow('full', (event) => {
            if (event.type === 'complite') {
                const data = event.data.movie;
                const render = event.object.activity.render();
                const content = render.find('.left-title__content');
                
                content.removeClass('cas-animated');
                event.object.activity.onBeforeDestroy = stopSlideshow;

                if (data && data.id) {
                    render.data('movie', data);
                    const cacheId = 'tmdb_' + data.id;
                    const cached = getCachedData(cacheId);

                    if (cached) processImages(render, data, cached);
                    else {
                        const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());
                        $.getJSON(imagesUrl, (res) => {
                            setCachedData(cacheId, res);
                            processImages(render, data, res);
                        });
                    }
                    debouncedLoadMovieData(render, data);
                }

                // Animation & Focus
                setTimeout(() => content.addClass('cas-animated'), 100);
                setTimeout(() => {
                    const firstBtn = render.find('.full-start__button.selector').first();
                    if (firstBtn.length) {
                        render.find('.full-start__button').removeClass('focus');
                        firstBtn.addClass('focus').trigger('focus');
                    }
                }, 400);
            }
        });
    }

    function startPlugin() {
        try {
            initializePlugin();
            console.log('NewCard plugin initialized');
        } catch (e) {
            console.error('NewCard error:', e);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });
})();
