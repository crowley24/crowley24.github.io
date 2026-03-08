(function () {
    'use strict';

    /**
     * ПЛАТФОРМА: Lampa
     * ПЛАГІН: Ultimate UI Customizer + Slideshow
     * ОПИС: Кастомізація картки у стилі Apple TV/Netflix з автоматичним слайд-шоу фону.
     */

    const PLUGIN_NAME = 'NewCard Ultimate Edition';
    const PLUGIN_ID = 'new_card_style';
    const ASSETS_PATH = 'https://crowley24.github.io/NewIcons/';
    
    // Глобальні змінні для контролю слайд-шоу
    let slideshowTimer = null;
    let currentSlides = [];
    let slideIndex = 0;

    // Іконки сервісів
    const ICONS = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    // Іконки якості
    const QUALITY_ICONS = {
        '4K': ASSETS_PATH + '4K.svg',
        '2K': ASSETS_PATH + '2K.svg',
        'FULL HD': ASSETS_PATH + 'FULL HD.svg',
        'HD': ASSETS_PATH + 'HD.svg',
        'HDR': ASSETS_PATH + 'HDR.svg',
        'Dolby Vision': ASSETS_PATH + 'Dolby Vision.svg',
        'UKR': ASSETS_PATH + 'UKR.svg'
    };

    /**
     * ДОПОМІЖНІ ФУНКЦІЇ
     */
    function getRatingColor(val) {
        const n = parseFloat(val);
        if (n >= 7.5) return '#2ecc71';
        if (n >= 6.0) return '#feca57';
        return '#ff4d4d';
    }

    function formatTime(mins) {
        if (!mins) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0) return h + 'г ' + m + 'хв';
        return m + 'хв';
    }

    /**
     * ЛОГІКА СЛАЙД-ШОУ
     */
    function startSlideshow(backdrops) {
        if (!Lampa.Storage.get('cas_slideshow_enabled') || !backdrops.length) return;
        
        currentSlides = backdrops;
        slideIndex = 0;
        
        if (slideshowTimer) clearInterval(slideshowTimer);

        slideshowTimer = setInterval(function() {
            const $bgContainer = $('.full-start__background');
            if (!$bgContainer.length) {
                clearInterval(slideshowTimer);
                return;
            }

            slideIndex = (slideIndex + 1) % currentSlides.length;
            const imgPath = currentSlides[slideIndex].file_path;
            const imgUrl = Lampa.TMDB.image('/t/p/w1280' + imgPath);

            // Створюємо тимчасовий шар для плавного переходу
            const nextLayer = $('<div class="full-start__background loaded slideshow-temp-layer"></div>');
            nextLayer.css({
                'position': 'absolute',
                'top': '0',
                'left': '0',
                'width': '100%',
                'height': '100%',
                'background-image': 'url(' + imgUrl + ')',
                'background-size': 'cover',
                'background-position': 'center',
                'opacity': '0',
                'z-index': '1',
                'transition': 'opacity 2000ms ease-in-out'
            });

            const currentActive = $('.full-start__background').first();
            currentActive.parent().append(nextLayer);

            setTimeout(function() {
                nextLayer.css('opacity', '1');
                setTimeout(function() {
                    // Оновлюємо основний фон і видаляємо шар
                    currentActive.css('background-image', 'url(' + imgUrl + ')');
                    $('.slideshow-temp-layer').remove();
                }, 2100);
            }, 100);

        }, parseInt(Lampa.Storage.get('cas_slideshow_time') || '10000'));
    }

    /**
     * НАЛАШТУВАННЯ
     */
    function addSettings() {
        // Дефолтні значення
        const config = {
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

        for (let key in config) {
            if (Lampa.Storage.get(key) === undefined) {
                Lampa.Storage.set(key, config[key]);
            }
        }

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_ID,
            name: PLUGIN_NAME,
            icon: `<svg height="100" viewBox="0 0 100 100" width="100" xmlns="http://www.w3.org/2000/svg"><path d="m15 20h70v60h-70z" fill="none" stroke="#fff" stroke-width="6"/><path d="m25 32h50v28h-50z" fill="#fff"/><path d="m25 66h30v6h-30z" fill="#fff" opacity=".6"/><path d="m60 66h15v6h-15z" fill="#fff" opacity=".6"/></svg>`
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_slideshow_enabled', type: 'trigger', default: true },
            field: { name: 'Слайд-шоу', description: 'Автоматична зміна кадрів на фоні' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_slideshow_time', type: 'select', values: { '7000':'7 сек', '10000':'10 сек', '15000':'15 сек', '20000':'20 сек' }, default: '10000' },
            field: { name: 'Інтервал зміни кадрів' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_show_ratings', type: 'trigger', default: true },
            field: { name: 'Відображати рейтинги' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_show_studios', type: 'trigger', default: true },
            field: { name: 'Логотипи студій' }
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_bg_animation', type: 'trigger', default: true },
            field: { name: 'Анімація наїзду фону' },
            onChange: applyGlobalStyles
        });

        Lampa.SettingsApi.addParam({
            component: PLUGIN_ID,
            param: { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' }, default: '100' },
            field: { name: 'Розмір логотипу' },
            onChange: applyGlobalStyles
        });

        applyGlobalStyles();
    }

    function applyGlobalStyles() {
        const root = document.documentElement;
        const scale = (parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100);
        const meta = Lampa.Storage.get('cas_meta_size') || '1.3';
        
        root.style.setProperty('--cas-logo-scale', scale);
        root.style.setProperty('--cas-meta-size', meta + 'em');
        
        $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));
    }

    /**
     * ШАБЛОН ТА СТИЛІ
     */
    function setupTemplates() {
        const html = `
        <div class="full-start-new left-title">
            <div class="full-start-new__body">
                <div class="full-start-new__right">
                    <div class="left-title__content">
                        <div class="cas-logo-container" style="margin-bottom: 25px;">
                            <div class="cas-logo"></div>
                            <h1 class="full-start-new__title">{title}</h1>
                        </div>

                        <div class="cas-ratings-line" style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                            <div class="cas-rate-items" style="display: flex; gap: 12px;"></div>
                            <div class="cas-meta-info" style="opacity: 0.7; font-weight: 400;"></div>
                            <div class="cas-quality-row" style="display: flex; gap: 8px;"></div>
                        </div>

                        <div class="cas-studios-row" style="margin-bottom: 30px; display: flex; gap: 20px; align-items: center;"></div>

                        <div class="full-start-new__buttons">
                            <div class="full-start__button selector button--play">
                                <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>
                                <span>#{title_watch}</span>
                            </div>
                            <div class="full-start__button selector button--book">
                                <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg>
                                <span>#{settings_input_links}</span>
                            </div>
                            <div class="full-start__button selector button--reaction">
                                <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/></svg>
                                <span>#{title_reactions}</span>
                            </div>
                            <div class="full-start__button selector button--options">
                                <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        const css = `
        <style>
            .full-start-new.left-title { height: 100%; width: 100%; }
            .left-title .full-start-new__body { height: 85vh; display: flex; align-items: flex-end; padding-left: 5%; }
            .cas-logo img { max-width: calc(450px * var(--cas-logo-scale)); max-height: calc(180px * var(--cas-logo-scale)); object-fit: contain; object-position: left bottom; filter: drop-shadow(0 0 15px rgba(0,0,0,0.8)); }
            .cas-ratings-line { font-size: var(--cas-meta-size); font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
            .cas-rate-item { display: flex; align-items: center; gap: 7px; background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 6px; }
            .cas-rate-item img { height: 1em; width: auto; }
            .cas-studio-item img { height: 25px; width: auto; filter: drop-shadow(0 0 5px rgba(0,0,0,0.5)); opacity: 0.9; }
            .cas-quality-item img { height: 1.4em; }
            
            @keyframes casZoom {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            body.cas--zoom-enabled .full-start__background.loaded {
                animation: casZoom 45s ease-in-out infinite !important;
            }
        </style>`;

        Lampa.Template.add('full_start_new', html);
        $('body').append(css);
    }

    /**
     * ГОЛОВНИЙ ОБРОБНИК (ЗАВАНТАЖЕННЯ ДАНИХ)
     */
    function attachEvents() {
        Lampa.Listener.follow('full', function (event) {
            if (event.type === 'destroy') {
                if (slideshowTimer) clearInterval(slideshowTimer);
                currentSlides = [];
            }

            if (event.type === 'complite') {
                const data = event.data.movie;
                const render = event.object.activity.render();
                
                if (!data || !data.id) return;

                // 1. Отримуємо зображення та логотипи
                Lampa.TMDB.get((data.name ? 'tv/' : 'movie/') + data.id + '/images', {}, function (res) {
                    // Логотип
                    const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || 
                                   res.logos.find(l => l.iso_639_1 === 'en') || 
                                   res.logos[0];

                    if (bestLogo) {
                        const logoPath = Lampa.TMDB.image('/t/p/original' + bestLogo.file_path);
                        render.find('.cas-logo').html('<img src="' + logoPath + '">');
                        render.find('.full-start-new__title').hide();
                    } else {
                        render.find('.full-start-new__title').show();
                    }

                    // Слайд-шоу
                    if (res.backdrops && res.backdrops.length > 1) {
                        startSlideshow(res.backdrops.slice(0, 20));
                    }
                });

                // 2. Рейтинги
                if (Lampa.Storage.get('cas_show_ratings')) {
                    let rHtml = '';
                    const tmdb = parseFloat(data.vote_average || 0).toFixed(1);
                    
                    if (tmdb > 0) {
                        rHtml += `<div class="cas-rate-item"><img src="${ICONS.tmdb}"><span style="color:${getRatingColor(tmdb)}">${tmdb}</span></div>`;
                    }

                    if (event.data.reactions && event.data.reactions.result) {
                        let total = 0, count = 0;
                        event.data.reactions.result.forEach(r => {
                            if (r.counter) { total += (r.counter * 10); count += r.counter; }
                        });
                        if (count > 0) {
                            const cub = (total / count).toFixed(1);
                            rHtml += `<div class="cas-rate-item"><img src="${ICONS.cub}"><span>${cub}</span></div>`;
                        }
                    }
                    render.find('.cas-rate-items').html(rHtml);
                }

                // 3. Студії
                if (Lampa.Storage.get('cas_show_studios')) {
                    const companies = (data.networks || data.production_companies || [])
                        .filter(c => c.logo_path)
                        .slice(0, 3);
                    
                    const sHtml = companies.map(c => `
                        <div class="cas-studio-item">
                            <img src="${Lampa.TMDB.image('/t/p/w200' + c.logo_path)}">
                        </div>
                    `).join('');
                    render.find('.cas-studios-row').html(sHtml);
                }

                // 4. Мета-дані
                const duration = formatTime(data.runtime || data.episode_run_time);
                const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');
                render.find('.cas-meta-info').text(duration + (genre ? ' • ' + genre : ''));

                // 5. Пошук якості через Parser
                if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser.get) {
                    Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, function(res) {
                        if (res && res.Results) {
                            const titles = res.Results.map(r => r.Title.toLowerCase()).join(' ');
                            let qHtml = '';
                            
                            if (titles.includes('4k') || titles.includes('2160')) qHtml += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['4K']}"></div>`;
                            if (titles.includes('hdr')) qHtml += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;
                            if (titles.includes('ukr') || titles.includes('укр')) qHtml += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['UKR']}"></div>`;
                            
                            render.find('.cas-quality-row').html(qHtml);
                        }
                    });
                }
            }
        });
    }

    /**
     * СТАРТ
     */
    function start() {
        setupTemplates();
        addSettings();
        attachEvents();
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') start(); });

})();
