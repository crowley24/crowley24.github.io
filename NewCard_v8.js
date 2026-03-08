(function () {
    'use strict';

    const PLUGIN_NAME = 'NewCard Ultimate + Slideshow';
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

    // --- РОБОЧЕ СЛАЙД-ШОУ ---
    function startPosterSlideshow(items) {
        if (!Lampa.Storage.get('cas_slideshow_enabled')) return;
        let index = 0;
        if (slideshowTimer) clearInterval(slideshowTimer);

        slideshowTimer = setInterval(() => {
            const $bgContainer = $('.full-start__background');
            if (!$bgContainer.length) return;

            index = (index + 1) % items.length;
            const imgUrl = Lampa.TMDB.image('/t/p/w1280' + items[index].file_path);
            
            const nextImg = new Image();
            nextImg.onload = function() {
                const $nextLayer = $('<div class="full-start__background loaded slideshow-layer"></div>').css({
                    'background-image': 'url(' + imgUrl + ')',
                    'opacity': '0',
                    'position': 'absolute',
                    'top': '0', 'left': '0', 'width': '100%', 'height': '100%',
                    'background-size': 'cover',
                    'transition': 'opacity 2s ease-in-out',
                    'z-index': '1'
                });

                $bgContainer.after($nextLayer);
                
                setTimeout(() => {
                    $nextLayer.css('opacity', '1');
                    setTimeout(() => {
                        // Робимо новий шар основним і видаляємо старі
                        $bgContainer.css('background-image', 'url(' + imgUrl + ')');
                        $('.slideshow-layer').not($nextLayer).remove();
                        $nextLayer.remove(); 
                    }, 2000);
                }, 100);
            };
            nextImg.src = imgUrl;
        }, parseInt(Lampa.Storage.get('cas_slideshow_time') || '10000'));
    }

    function addSettings() {
        const defaults = {
            'cas_logo_scale': '100',
            'cas_logo_quality': 'original',
            'cas_bg_animation': true,
            'cas_show_ratings': true,
            'cas_show_studios': true,
            'cas_show_quality': true,
            'cas_slideshow_enabled': true,
            'cas_slideshow_time': '10000',
            'cas_meta_size': '1.3'
        };

        Object.keys(defaults).forEach(key => {
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);
        });

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_ID,
            name: PLUGIN_NAME,
            icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/></svg>`
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_slideshow_enabled', type: 'trigger', default: true },
            field: { name: 'Слайд-шоу фону', description: 'Автоматична зміна кадрів на фоні' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_slideshow_time', type: 'select', values: { '7000':'7 сек', '10000':'10 сек', '15000':'15 сек', '20000':'20 сек' }, default: '10000' },
            field: { name: 'Інтервал слайд-шоу' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_show_ratings', type: 'trigger', default: true },
            field: { name: 'Відображати рейтинги' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_show_studios', type: 'trigger', default: true },
            field: { name: 'Відображати лого студій' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_logo_scale', type: 'select', values: { '80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' }, default: '100' },
            field: { name: 'Розмір логотипу' },
            onChange: applySettings
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_bg_animation', type: 'trigger', default: true },
            field: { name: 'Анімація фону (Наїзд)' },
            onChange: applySettings
        });

        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;
        root.style.setProperty('--cas-logo-scale', (parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100));
        root.style.setProperty('--cas-meta-size', (Lampa.Storage.get('cas_meta_size') || '1.3') + 'em');
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));
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
                      
                    <div class="cas-ratings-line">
                        <div class="cas-rate-items"></div>
                        <div class="cas-meta-info" style="opacity: 0.7;"></div>
                        <div class="cas-quality-row"></div>
                    </div>

                    <div class="cas-studios-row" style="margin-bottom: 25px; display: flex; gap: 15px;"></div>

                    <div class="full-start-new__buttons">  
                        <div class="full-start__button selector button--play">  
                            <svg width="28" height="29" viewBox="0 0 28 29" fill="none"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>  
                            <span>#{title_watch}</span>  
                        </div>  
                        <div class="full-start__button selector button--book"><span>#{settings_input_links}</span></div>  
                        <div class="full-start__button selector button--reaction"><span>#{title_reactions}</span></div>
                        <div class="full-start__button selector button--options">
                            <svg width="38" height="10" viewBox="0 0 38 10" fill="none"><circle cx="5" cy="5" r="4.5" fill="currentColor"/><circle cx="19" cy="5" r="4.5" fill="currentColor"/><circle cx="33" cy="5" r="4.5" fill="currentColor"/></svg>
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
            .left-title .full-start-new__body { height: 85vh; display: flex; align-items: flex-end; }  
            .cas-logo img { max-width: calc(450px * var(--cas-logo-scale)); max-height: calc(180px * var(--cas-logo-scale)); object-fit: contain; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5)); }
            .cas-ratings-line { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; font-size: var(--cas-meta-size); font-weight: 600; }
            .cas-rate-item { display: flex; align-items: center; gap: 6px; }
            .cas-rate-item img { height: 1.1em; }
            .cas-studio-item img { height: 22px; width: auto; opacity: 0.9; }
            .cas-quality-item img { height: 1.3em; }
            @keyframes casKenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
            body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 40s ease-in-out infinite !important; }
        </style>`;  
        $('body').append(styles);  
    }  

    function attachLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'destroy') clearInterval(slideshowTimer);

            if (event.type === 'complite') {  
                const data = event.data.movie;
                const render = event.object.activity.render();
                
                if (data && data.id) {
                    Lampa.TMDB.get((data.name ? 'tv/' : 'movie/') + data.id + '/images', {}, (res) => {
                        // Логотип
                        const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                        if (bestLogo) {
                            const logoUrl = Lampa.TMDB.image('/t/p/original' + bestLogo.file_path);
                            render.find('.cas-logo').html('<img src="' + logoUrl + '">');
                            render.find('.full-start-new__title').hide();
                        }

                        // Слайд-шоу
                        if (res.backdrops && res.backdrops.length > 1) {
                            startPosterSlideshow(res.backdrops.slice(0, 15));
                        }
                    });

                    // Рейтинги (якщо увімкнено)
                    if (Lampa.Storage.get('cas_show_ratings')) {
                        let ratesHtml = '';
                        const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);
                        if (tmdbV > 0) ratesHtml += `<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>`;
                        
                        // Додаємо CUB якщо є реакції
                        if (event.data.reactions && event.data.reactions.result) {
                            let sum = 0, cnt = 0;
                            event.data.reactions.result.forEach(r => { if (r.counter) { sum += (r.counter * 10); cnt += r.counter; } });
                            if (cnt > 0) ratesHtml += `<div class="cas-rate-item"><img src="${ICONS.cub}"> <span>${(sum/cnt).toFixed(1)}</span></div>`;
                        }
                        render.find('.cas-rate-items').html(ratesHtml);
                    }

                    // Студії
                    if (Lampa.Storage.get('cas_show_studios')) {
                        const sSource = data.networks || data.production_companies || [];
                        const studios = sSource.filter(s => s.logo_path).slice(0, 3);
                        render.find('.cas-studios-row').html(studios.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join(''));
                    }

                    // Мета
                    const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');
                    render.find('.cas-meta-info').text(formatTime(data.runtime || data.episode_run_time) + ' • ' + genre);

                    // Якість через Парсер
                    if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser.get) {
                        Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {
                            if (res && res.Results) {
                                let qH = '';
                                const t = res.Results.map(i => i.Title.toLowerCase()).join(' ');
                                if (t.includes('4k')) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['4K']}"></div>`;
                                if (t.includes('hdr')) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;
                                if (t.includes('ukr')) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['UKR']}"></div>`;
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
