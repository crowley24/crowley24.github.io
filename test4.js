(function () {
    'use strict';

    const PLUGIN_NAME = 'NewCard';
    const PLUGIN_ID = 'new_card_style';
    const ASSETS_PATH = 'https://crowley38.github.io/Icons/';
    const CACHE_LIFETIME = 1000 * 60 * 60 * 24;

    let currentInterval = null;
    let debounceTimer;

    const ICONS = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669b7/img/logo-icon.svg'
    };

    const QUALITY_ICONS = {};
    [
        '4K', '2K', 'FULL HD', 'HD', 'HDR',
        'Dolby Vision', 'UKR', '7.1', '5.1',
        '4.0', '2.0', 'DUB'
    ].forEach(name => {
        QUALITY_ICONS[name] = ASSETS_PATH + name + '.svg';
    });

    const SETTINGS_ICON = `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="15" y="20" width="70" height="60" rx="8"
                stroke="white" stroke-width="6" fill="none" opacity="0.4"/>
            <rect x="25" y="32" width="50" height="28" rx="4" fill="white"/>
            <rect x="25" y="66" width="30" height="6" rx="3"
                fill="white" opacity="0.6"/>
            <rect x="60" y="66" width="15" height="6" rx="3"
                fill="white" opacity="0.6"/>
        </svg>
    `;

    const TRANSLATIONS = {
        settings_cas_logo_quality: 'Якість логотипу',
        settings_cas_logo_scale: 'Розмір логотипу',
        settings_cas_meta_size: 'Розмір шрифту',
        settings_cas_blocks_gap: 'Відступи між блоками',
        settings_cas_bg_animation: 'Анімація фону',
        settings_cas_animation_style: 'Стиль анімації появи',
        settings_cas_slideshow_enabled: 'Слайд-шоу фону',
        settings_cas_show_studios: 'Показувати студії',
        settings_cas_show_quality: 'Показувати якість',
        settings_cas_show_rating: 'Показувати рейтинги',
        settings_cas_show_description: 'Опис фільму',
        settings_cas_show_tagline: 'Показувати слоган'
    };

    function debounce(func, delay) {
        return function () {
            const context = this;
            const args = arguments;

            clearTimeout(debounceTimer);

            debounceTimer = setTimeout(() => {
                func.apply(context, args);
            }, delay);
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

    function getRatingColor(value) {
        const number = parseFloat(value);

        if (number >= 7.5) return '#2ecc71';
        if (number >= 6) return '#feca57';

        return '#ff4d4d';
    }

    function formatTime(minutes) {
        if (!minutes) return '';

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        return (hours ? hours + 'г ' : '') + mins + 'хв';
    }

    function initializePlugin() {
        addCustomTemplate();
        addStyles();
        addSettings();
        attachLoader();
    }

    function addSettings() {
        const defaults = {
            cas_logo_scale: '100',
            cas_logo_quality: 'original',
            cas_bg_animation: 'kenburns',
            cas_animation_style: 'slide',
            cas_slideshow_enabled: true,
            cas_blocks_gap: '20',
            cas_meta_size: '1.3',
            cas_show_studios: true,
            cas_show_quality: true,
            cas_show_rating: true,
            cas_show_description: true,
            cas_show_tagline: true
        };

        Object.keys(defaults).forEach(key => {
            if (Lampa.Storage.get(key) === undefined) {
                Lampa.Storage.set(key, defaults[key]);
            }
        });

        Lampa.SettingsApi.addComponent({
            component: PLUGIN_ID,
            name: PLUGIN_NAME,
            icon: SETTINGS_ICON
        });

        const params = [
            {
                name: 'cas_logo_quality',
                type: 'select',
                values: {
                    w300: '300px',
                    w500: '500px',
                    original: 'Original'
                }
            },
            {
                name: 'cas_logo_scale',
                type: 'select',
                values: {
                    '70': '70%',
                    '80': '80%',
                    '90': '90%',
                    '100': '100%',
                    '110': '110%',
                    '120': '120%'
                }
            },
            {
                name: 'cas_meta_size',
                type: 'select',
                values: {
                    '1.1': 'Міні',
                    '1.2': 'Малий',
                    '1.3': 'Стандартний',
                    '1.4': 'Збільшений',
                    '1.5': 'Великий'
                }
            },
            {
                name: 'cas_blocks_gap',
                type: 'select',
                values: {
                    '10': 'Дуже тісно',
                    '15': 'Тісно',
                    '20': 'Стандарт',
                    '25': 'Просторе',
                    '30': 'Дуже просторе'
                }
            },
            {
                name: 'cas_bg_animation',
                type: 'select',
                values: {
                    off: 'Вимкнено',
                    kenburns: 'Ken Burns (Зум + Паралакс)',
                    panscan: 'Кінематографічний дрейф (Pan & Scan)',
                    tiltzoom: 'Динамічний кут (Tilt Zoom)'
                }
            },
            {
                name: 'cas_animation_style',
                type: 'select',
                values: {
                    slide: 'Slide from Left (Виїзд зліва)',
                    spring: 'Elastic Spring (Жива пружина)'
                }
            },
            { name: 'cas_slideshow_enabled', type: 'trigger' },
            { name: 'cas_show_studios', type: 'trigger' },
            { name: 'cas_show_quality', type: 'trigger' },
            { name: 'cas_show_rating', type: 'trigger' },
            { name: 'cas_show_description', type: 'trigger' },
            { name: 'cas_show_tagline', type: 'trigger' }
        ];

        params.forEach(param => {
            Lampa.SettingsApi.addParam({
                component: PLUGIN_ID,
                param: {
                    name: param.name,
                    type: param.type,
                    values: param.values,
                    default: defaults[param.name]
                },
                field: {
                    name: TRANSLATIONS['settings_' + param.name]
                },
                onChange: applySettings
            });
        });

        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;

        const scale =
            parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100;

        const gap =
            Lampa.Storage.get('cas_blocks_gap') || '20';

        const metaSize =
            Lampa.Storage.get('cas_meta_size') || '1.3';

        const animation =
            Lampa.Storage.get('cas_animation_style') || 'slide';

        const backgroundAnimation =
            Lampa.Storage.get('cas_bg_animation') || 'kenburns';

        root.style.setProperty('--cas-logo-scale', scale);
        root.style.setProperty('--cas-blocks-gap', gap + 'px');
        root.style.setProperty('--cas-meta-size', metaSize + 'em');

        const body = $('body');

        body.removeClass(
            'cas--zoom-kenburns cas--zoom-panscan cas--zoom-tiltzoom'
        );

        if (backgroundAnimation !== 'off') {
            body.addClass('cas--zoom-' + backgroundAnimation);
        }

        const card = $('.full-start-new.left-title');

        if (!card.length) return;

        card
            .removeClass('cas-anim-slide cas-anim-spring')
            .addClass('cas-anim-' + animation);

        const showDescription =
            !!Lampa.Storage.get('cas_show_description');

        const showTagline =
            !!Lampa.Storage.get('cas_show_tagline');

        card.find('.cas-description').toggle(showDescription);
        card.find('.cas-tagline').toggle(showTagline);

        card.find('.cas-studios-row').toggle(
            !!Lampa.Storage.get('cas_show_studios')
        );

        card.find('.cas-quality-row').toggle(
            !!Lampa.Storage.get('cas_show_quality')
        );

        card.find('.cas-rate-items, .cas-bottom-ratings').toggle(
            !!Lampa.Storage.get('cas_show_rating')
        );

        card.find('.full-start-new__buttons').css(
            'margin-top',
            showDescription ? '' : '0px'
        );

        stopSlideshow();

        if (Lampa.Storage.get('cas_slideshow_enabled')) {
            const background = card.find(
                '.full-start__background img, img.full-start__background'
            );

            const movie = card.data('movie');

            if (
                background.length &&
                background.attr('src') &&
                movie &&
                movie.id
            ) {
                const cached = getCachedData('tmdb_' + movie.id);

                if (cached && cached.backdrops?.length > 1) {
                    startSlideshow(
                        card,
                        cached.backdrops,
                        Lampa.Storage.get('tmdb_lang') || 'uk'
                    );
                }
            }
        }
    }

    function addCustomTemplate() {
        const animation =
            Lampa.Storage.get('cas_animation_style') || 'slide';

        const playIcon = `
            <svg width="28" height="29" viewBox="0 0 28 29" fill="none">
                <circle cx="14" cy="14.5" r="13"
                    stroke="currentColor" stroke-width="2.7"/>
                <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506V10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z"
                    fill="currentColor"/>
            </svg>
        `;

        const bookIcon = `
            <svg width="21" height="32" viewBox="0 0 21 32" fill="none">
                <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z"
                    stroke="currentColor" stroke-width="2.5"/>
            </svg>
        `;

        const reactionIcon = `
            <svg width="38" height="34" viewBox="0 0 38 34" fill="none">
                <path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 0.0000338 25.609 0 25.7962C-0.0000337 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3165 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742Z"
                    fill="currentColor"/>
                <path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z"
                    fill="currentColor"/>
            </svg>
        `;

        const optionsIcon = `
            <svg width="38" height="10" viewBox="0 0 38 10" fill="none">
                <circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/>
                <circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/>
                <circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/>
            </svg>
        `;

        const subscribeIcon = `
            <svg width="25" height="30" viewBox="0 0 25 30" fill="none">
                <path d="M6.01892 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z"
                    fill="currentColor"/>
                <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z"
                    stroke="currentColor" stroke-width="2.5"/>
            </svg>
        `;

        const makeButton = (classes, icon, text) => `
            <div class="full-start__button ${classes}">
                ${icon}
                ${text ? `<span>${text}</span>` : ''}
            </div>
        `;

        const template = `
            <div class="full-start-new left-title cas-anim-${animation}">
                <div class="full-start-new__body">

                    <div class="full-start-new__left hide">
                        <div class="full-start-new__poster">
                            <img class="full-start-new__img full--poster"/>
                        </div>
                    </div>

                    <div class="full-start-new__right">
                        <div class="left-title__content">

                            <div class="cas-logo-container">
                                <div class="cas-studios-row"></div>
                                <div class="cas-logo"></div>
                            </div>

                            <div class="cas-tagline"></div>

                            <div class="cas-meta-line">
                                <div class="cas-meta-info"></div>
                                <div class="cas-quality-row"></div>
                            </div>

                            <div class="cas-description"></div>

                            <div class="cas-details-wrapper">
                                <div class="full-start-new__head hide"></div>
                                <div class="full-start-new__details hide"></div>
                            </div>

                            <div class="full-start-new__buttons">
                                ${makeButton(
                                    'selector button--play',
                                    playIcon,
                                    '#{title_watch}'
                                )}

                                ${makeButton(
                                    'selector button--book',
                                    bookIcon,
                                    '#{settings_input_links}'
                                )}

                                ${makeButton(
                                    'selector button--reaction',
                                    reactionIcon,
                                    '#{title_reactions}'
                                )}

                                ${makeButton(
                                    'selector button--subscribe hide',
                                    subscribeIcon,
                                    '#{title_subscribe}'
                                )}

                                <div class="full-start__button button--options">
                                    ${optionsIcon}
                                </div>
                            </div>

                        </div>

                        <div class="full-start-new__reactions selector hide"></div>
                        <div class="cas-bottom-ratings"></div>
                        <div class="full-start-new__rate-line hide"></div>
                        <div class="rating--modss" style="display:none"></div>
                    </div>
                </div>

                <div class="hide buttons--container"></div>
            </div>
        `;

        Lampa.Template.add('full_start_new', template);
    }
      function addStyles() {
        if ($('#cas-main-styles').length) return;

        const styles = `
        <style id="cas-main-styles">
            :root {
                --cas-logo-scale: 1;
                --cas-blocks-gap: 30px;
                --cas-meta-size: 1.3em;
                --cas-curve-slide: cubic-bezier(0.25,1,0.5,1);
                --cas-curve-spring: cubic-bezier(0.175,0.885,0.32,1.275);
            }

            .full-start__background {
                height: calc(100% + 6em);
                left: 0 !important;
                opacity: 0 !important;
                transition: opacity 1s cubic-bezier(0.2,0.8,0.2,1) !important;
                will-change: opacity;
                overflow: hidden !important;
                transform: translateZ(0);
            }

            .full-start__background.loaded {
                opacity: 1 !important;
            }

            .full-start__background.dim {
                opacity: .35 !important;
            }

            @keyframes casKenBurnsParallax {
                0%,100% {
                    transform: scale(1.02) translateY(0) translateX(0) translateZ(0);
                }
                50% {
                    transform: scale(1.10) translateY(-15px) translateX(5px) translateZ(0);
                }
            }

            @keyframes casCinematicPanScan {
                0%,100% {
                    transform: scale(1.06) translate3d(0,0,0);
                }
                33% {
                    transform: scale(1.12) translate3d(-25px,-12px,0);
                }
                66% {
                    transform: scale(1.10) translate3d(20px,15px,0);
                }
            }

            @keyframes casDynamicTiltZoom {
                0%,100% {
                    transform: scale(1.08) rotate(0) translate3d(0,0,0);
                }
                33% {
                    transform: scale(1.14) rotate(-2.2deg) translate3d(-15px,10px,0);
                }
                66% {
                    transform: scale(1.14) rotate(2.2deg) translate3d(15px,-10px,0);
                }
            }

            body.cas--zoom-kenburns .full-start__background img,
            body.cas--zoom-kenburns img.full-start__background {
                animation: casKenBurnsParallax 40s ease-in-out infinite !important;
                will-change: transform;
                transform-origin: center;
            }

            body.cas--zoom-panscan .full-start__background img,
            body.cas--zoom-panscan img.full-start__background {
                animation: casCinematicPanScan 35s ease-in-out infinite !important;
                will-change: transform;
                transform-origin: center;
            }

            body.cas--zoom-tiltzoom .full-start__background img,
            body.cas--zoom-tiltzoom img.full-start__background {
                animation: casDynamicTiltZoom 25s ease-in-out infinite !important;
                will-change: transform;
                transform-origin: center;
            }

            .cas-logo,
            .cas-tagline,
            .cas-studios-row,
            .cas-rate-items,
            .cas-meta-info,
            .cas-quality-row,
            .cas-description,
            .cas-details-wrapper,
            .full-start-new__buttons,
            .cas-bottom-ratings {
                opacity: 0 !important;
                will-change: transform,opacity;
                backface-visibility: hidden;
            }

            .cas-quality-row .cas-quality-item {
                opacity: 0;
                transform: translate3d(0,6px,0) scale(.9);
                transition:
                    opacity .3s cubic-bezier(.25,1,.5,1),
                    transform .3s cubic-bezier(.25,1,.5,1);
            }

            .cas-quality-row.show-quality .cas-quality-item {
                opacity: 1;
                transform: translate3d(0,0,0) scale(1);
            }

            .cas-quality-row.show-quality .cas-quality-item:nth-child(1) {
                transition-delay: 0s;
            }
            .cas-quality-row.show-quality .cas-quality-item:nth-child(2) {
                transition-delay: .05s;
            }
            .cas-quality-row.show-quality .cas-quality-item:nth-child(3) {
                transition-delay: .10s;
            }
            .cas-quality-row.show-quality .cas-quality-item:nth-child(4) {
                transition-delay: .15s;
            }
            .cas-quality-row.show-quality .cas-quality-item:nth-child(5) {
                transition-delay: .20s;
            }

            .cas-anim-slide .cas-logo,
            .cas-anim-slide .cas-tagline,
            .cas-anim-slide .cas-studios-row,
            .cas-anim-slide .cas-rate-items,
            .cas-anim-slide .cas-meta-info,
            .cas-anim-slide .cas-quality-row,
            .cas-anim-slide .cas-description,
            .cas-anim-slide .cas-details-wrapper,
            .cas-anim-slide .full-start-new__buttons,
            .cas-anim-slide .cas-bottom-ratings,

            .cas-anim-spring .cas-logo,
            .cas-anim-spring .cas-tagline,
            .cas-anim-spring .cas-studios-row,
            .cas-anim-spring .cas-rate-items,
            .cas-anim-spring .cas-meta-info,
            .cas-anim-spring .cas-quality-row,
            .cas-anim-spring .cas-description,
            .cas-anim-spring .cas-details-wrapper,
            .cas-anim-spring .full-start-new__buttons,
            .cas-anim-spring .cas-bottom-ratings {
                transform: translate3d(0,8px,0);
                transition:
                    opacity .35s var(--cas-curve-slide),
                    transform .35s var(--cas-curve-slide);
            }

            .cas-anim-spring .cas-logo,
            .cas-anim-spring .cas-tagline,
            .cas-anim-spring .cas-studios-row,
            .cas-anim-spring .cas-rate-items,
            .cas-anim-spring .cas-meta-info,
            .cas-anim-spring .cas-quality-row,
            .cas-anim-spring .cas-description,
            .cas-anim-spring .cas-details-wrapper,
            .cas-anim-spring .full-start-new__buttons,
            .cas-anim-spring .cas-bottom-ratings {
                transform: scale3d(.92,.92,1) translate3d(0,6px,0);
                transition:
                    opacity .4s cubic-bezier(.175,.885,.32,1.275),
                    transform .4s var(--cas-curve-spring);
            }

            .cas-anim-slide.cas-animated .cas-logo,
            .cas-anim-spring.cas-animated .cas-logo {
                opacity: 1 !important;
                transform: none;
                transition-delay: 0s;
            }

            .cas-anim-slide.cas-animated .cas-studios-row,
            .cas-anim-spring.cas-animated .cas-studios-row {
                opacity: .9 !important;
                transform: none;
                transition-delay: .03s;
            }

            .cas-anim-slide.cas-animated .cas-tagline,
            .cas-anim-spring.cas-animated .cas-tagline {
                opacity: .85 !important;
                transform: none;
                transition-delay: .06s;
            }

            .cas-anim-slide.cas-animated .cas-meta-info,
            .cas-anim-spring.cas-animated .cas-meta-info {
                opacity: .85 !important;
                transform: none;
                transition-delay: .09s;
            }

            .cas-anim-slide.cas-animated .cas-description,
            .cas-anim-spring.cas-animated .cas-description {
                opacity: .75 !important;
                transform: none;
                transition-delay: .12s;
            }

            .cas-anim-slide.cas-animated .full-start-new__buttons,
            .cas-anim-slide.cas-animated .cas-bottom-ratings,
            .cas-anim-spring.cas-animated .full-start-new__buttons,
            .cas-anim-spring.cas-animated .cas-bottom-ratings {
                opacity: 1 !important;
                transform: none;
                transition-delay: .16s;
            }

            .cas-anim-slide.cas-animated .cas-quality-row,
            .cas-anim-spring.cas-animated .cas-quality-row {
                opacity: 1 !important;
                transform: none;
                transition-delay: .18s;
            }

            .full-start-new__details {
                display: none !important;
            }

            .full-start-new__head {
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                font-size: .9em;
            }

            .full-start-new__body {
                display: flex;
                height: 85vh;
                position: relative;
                width: 100%;
            }

            .full-start-new__left {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                padding: 4em 3em 2em 2em;
                position: relative;
                z-index: 2;
            }

            .full-start-new__right {
                width: 60%;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                align-items: flex-start !important;
                text-align: left !important;
                padding: 4em 4em 2em 0;
                position: relative;
                z-index: 2;
                margin-left: 0 !important;
            }

            .full-start-new__poster,
            .full-start-new__title {
                display: none;
            }

            .left-title .full-start-new__left {
                display: none !important;
            }

            .left-title .full-start-new__right {
                width: 100% !important;
                padding-left: 2em !important;
            }

            .left-title__content {
                display: flex;
                flex-direction: column;
                align-items: flex-start !important;
                text-align: left !important;
                width: 100%;
            }

            .cas-logo-container {
                position: relative;
                overflow: visible;
                max-width: 100%;
                padding-left: 0;
                margin-bottom: calc(var(--cas-blocks-gap) * 1.2);
                max-height: 300px;
                display: flex;
                flex-direction: column;
                align-items: flex-start !important;
            }

            .cas-logo img {
                background: transparent !important;
                border: none !important;
                max-width: 450px;
                max-height: 200px;
                width: auto;
                height: auto;
                transform: scale(var(--cas-logo-scale));
                transform-origin: left center;
                display: block;
                object-fit: contain;
            }

            .cas-tagline {
                font-size: calc(var(--cas-meta-size) * .95);
                font-style: italic;
                color: rgba(255,255,255,.85);
                margin-bottom: 16px;
                text-shadow: 0 2px 4px rgba(0,0,0,.6);
                max-width: 650px;
                text-align: left !important;
            }

            .cas-meta-line,
            .cas-ratings-line,
            .cas-meta-info,
            .cas-quality-row,
            .cas-studios-row,
            .full-start-new__buttons {
                display: flex;
                align-items: center;
            }

            .cas-meta-line {
                gap: 12px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            }

            .cas-ratings-line {
                justify-content: flex-start !important;
                gap: 8px !important;
                flex-wrap: wrap;
                margin-bottom: 6px !important;
            }

            .cas-meta-info {
                margin-right: 0;
                justify-content: flex-start !important;
                gap: 8px;
                font-weight: 400;
            }

            .cas-quality-row {
                margin-top: 0 !important;
                justify-content: flex-start !important;
                gap: 6px;
            }

            .full-start-new__buttons {
                justify-content: flex-start !important;
                flex-wrap: wrap;
                width: 100%;
                margin-left: 0 !important;
                margin-top: 0 !important;
            }

            .cas-sep {
                margin: 0 2px !important;
            }

            .cas-studios-row {
                flex-wrap: wrap;
                justify-content: flex-start !important;
                gap: 8px;
                margin-bottom: 8px;
            }

            .cas-studio-item {
                height: 24px !important;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                margin-bottom: 2px;
            }

            .cas-studio-item img {
                height: 100%;
                width: auto;
                max-width: 140px;
                object-fit: contain;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,.8));
                opacity: .95;
            }

            .cas-description {
                font-size: var(--cas-meta-size) !important;
                line-height: 1.35;
                color: rgba(255,255,255,.7);
                display: -webkit-box;
                -webkit-line-clamp: 4;
                -webkit-box-orient: vertical;
                overflow: hidden;
                max-width: 650px;
                margin: 4px 0 8px;
                text-align: left !important;
            }

            .cas-quality-item img {
                height: 12px;
            }

            .cas-ratings-line {
                gap: 15px;
                margin-bottom: 4px;
                font-size: var(--cas-meta-size);
                font-weight: 600;
                height: 30px;
            }

            .cas-rate-item {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .cas-rate-item img {
                height: 1.1em;
            }

            .left-title .full-start-new__body {
                height: 85vh;
            }

            .cas-audio-item {
                background: rgba(255,255,255,.2);
                padding: 2px 6px;
                border-radius: 4px;
                font-size: .8em;
                font-weight: 600;
                color: white;
            }
        </style>`;

        Lampa.Template.add('left_title_css', styles);
        $('body').append(
            Lampa.Template.get('left_title_css', {}, true)
        );
    }

    function getCachedData(id) {
        const cache = Lampa.Storage.get('cas_images_cache') || {};
        const item = cache[id];

        return item &&
            Date.now() - item.time < CACHE_LIFETIME
            ? item.data
            : null;
    }

    function setCachedData(id, data) {
        const cache = Lampa.Storage.get('cas_images_cache') || {};

        cache[id] = {
            time: Date.now(),
            data: data
        };

        const keys = Object.keys(cache);

        if (keys.length > 100) {
            delete cache[keys[0]];
        }

        Lampa.Storage.set('cas_images_cache', cache);
    }

    function cleanup() {
        stopSlideshow();

        $('.left-title__content')
            .parent()
            .parent()
            .removeClass('cas-animated');
    }

    function stopSlideshow() {
        if (currentInterval) {
            clearInterval(currentInterval);
            currentInterval = null;
        }

        if (window.casBgInterval) {
            clearInterval(window.casBgInterval);
            window.casBgInterval = null;
        }
    }

    function startSlideshow(render, backdrops, currentLang) {
        stopSlideshow();

        if (!backdrops || backdrops.length <= 1) return;

        const langBackdrops = [];
        const noLangBackdrops = [];
        const otherBackdrops = [];

        backdrops.forEach(backdrop => {
            const lang = backdrop.iso_639_1;

            if (lang === currentLang) {
                langBackdrops.push(backdrop);
            } else if (
                !lang ||
                lang === 'xx' ||
                lang === 'null'
            ) {
                noLangBackdrops.push(backdrop);
            } else {
                otherBackdrops.push(backdrop);
            }
        });

        let finalBackdrops = noLangBackdrops.slice();

        if (
            finalBackdrops.length < 3 &&
            langBackdrops.length
        ) {
            finalBackdrops = finalBackdrops.concat(
                langBackdrops
            );
        }

        if (
            finalBackdrops.length < 3 &&
            otherBackdrops.length
        ) {
            otherBackdrops.sort(
                (a, b) =>
                    (b.vote_average || 0) -
                    (a.vote_average || 0)
            );

            finalBackdrops = finalBackdrops.concat(
                otherBackdrops
            );
        }

        finalBackdrops = finalBackdrops.slice(0, 15);

        if (finalBackdrops.length <= 1) return;

        let index = 0;
        const intervalTime = 15000;
        let active = true;

        currentInterval = setInterval(() => {
            if (!active) {
                clearInterval(currentInterval);
                return;
            }

            index =
                (index + 1) %
                finalBackdrops.length;

            const nextSrc = Lampa.TMDB.image(
                '/t/p/original' +
                finalBackdrops[index].file_path
            );

            const current = render.find(
                '.full-start__background img, img.full-start__background'
            ).last();

            if (!current.length) return;

            const image = new Image();

            image.onload = () => {
                if (!active) return;

                const next = current.clone();

                next.attr('src', nextSrc);

                next.css({
                    opacity: 0,
                    transition: 'opacity 1.5s ease-in-out',
                    transform: 'translateZ(0)'
                });

                current.after(next);

                next[0].offsetHeight;

                next.css('opacity', 1);

                current.css({
                    transition: 'opacity 1.5s ease-in-out',
                    opacity: 0
                });

                setTimeout(() => {
                    if (active) current.remove();
                }, 1550);
            };

            image.onerror = () => {};
            image.src = nextSrc;
        }, intervalTime);

        window.casBgInterval = currentInterval;
    }
      function renderStudioLogosWithColorAnalysis(container, data) {
        container.empty();

        const studios = (
            data.networks ||
            data.production_companies ||
            []
        )
            .filter(studio => studio.logo_path)
            .slice(0, 1);

        studios.forEach(studio => {
            const url = Lampa.TMDB.image(
                '/t/p/w200' + studio.logo_path
            );

            const id =
                'cas_studio_' +
                Math.random().toString(36).substr(2, 9);

            container.append(`
                <div class="cas-studio-item cas-wave-studio" id="${id}">
                    <img src="${url}">
                </div>
            `);

            const img = new Image();

            img.crossOrigin = 'anonymous';

            img.onload = function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = this.width;
                canvas.height = this.height;

                ctx.drawImage(this, 0, 0);

                try {
                    const pixels = ctx.getImageData(
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    ).data;

                    let r = 0;
                    let g = 0;
                    let b = 0;
                    let count = 0;

                    for (let i = 0; i < pixels.length; i += 4) {
                        if (pixels[i + 3] > 50) {
                            r += pixels[i];
                            g += pixels[i + 1];
                            b += pixels[i + 2];
                            count++;
                        }
                    }

                    if (count) {
                        const brightness =
                            (
                                .299 * r +
                                .587 * g +
                                .114 * b
                            ) / count;

                        if (brightness < 40) {
                            $('#' + id + ' img').css(
                                'filter',
                                'brightness(0) invert(1) ' +
                                'drop-shadow(0 2px 4px rgba(0,0,0,.8))'
                            );
                        }
                    }
                } catch (e) {
                    console.log(
                        'Error analyzing logo color:',
                        e
                    );
                }
            };

            img.src = url;
        });
    }

    async function processImages(render, data, res) {
        try {
            let logo =
                res.logos.find(
                    item => item.iso_639_1 === 'uk'
                ) ||
                res.logos.find(
                    item => item.iso_639_1 === 'en'
                ) ||
                res.logos[0];

            if (!logo && res.logos.length) {
                logo = res.logos[0];
            }

            if (logo) {
                const quality =
                    Lampa.Storage.get(
                        'cas_logo_quality'
                    ) || 'original';

                const src = Lampa.TMDB.image(
                    '/t/p/' +
                    quality +
                    logo.file_path
                );

                await preloadImage(src);

                render.find('.cas-logo').html(`
                    <img src="${src}">
                `);
            } else {
                render.find('.cas-logo').html(`
                    <div style="
                        font-size:3em;
                        font-weight:800;
                        text-transform:uppercase
                    ">
                        ${data.title || data.name}
                    </div>
                `);
            }

            stopSlideshow();

            if (
                Lampa.Storage.get(
                    'cas_slideshow_enabled'
                ) &&
                res.backdrops &&
                res.backdrops.length > 1
            ) {
                startSlideshow(
                    render,
                    res.backdrops,
                    Lampa.Storage.get(
                        'tmdb_lang'
                    ) || 'uk'
                );
            }
        } catch (e) {
            render.find('.cas-logo').html(`
                <div style="
                    font-size:3em;
                    font-weight:800;
                    text-transform:uppercase
                ">
                    ${data.title || data.name}
                </div>
            `);
        }
    }

    async function loadMovieDataOptimized(render, data) {
        const tasks = [];

        if (
            data.tagline &&
            Lampa.Storage.get('cas_show_tagline')
        ) {
            render
                .find('.cas-tagline')
                .text(`«${data.tagline}»`)
                .show();
        } else {
            render.find('.cas-tagline').hide();
        }

        if (
            Lampa.Storage.get(
                'cas_show_description'
            )
        ) {
            tasks.push(
                Promise.resolve().then(() => {
                    render
                        .find('.cas-description')
                        .html(data.overview || '')
                        .css('opacity', '1')
                        .show();
                })
            );
        }

        tasks.push(
            Promise.resolve().then(() => {
                const year =
                    data.release_date
                        ? new Date(
                            data.release_date
                        ).getFullYear()
                        : (
                            data.first_air_date
                                ? new Date(
                                    data.first_air_date
                                ).getFullYear()
                                : ''
                        );

                const country =
                    data.production_countries &&
                    data.production_countries.length
                        ? data.production_countries[0].name
                        : '';

                const time = formatTime(
                    data.runtime ||
                    (
                        data.episode_run_time &&
                        data.episode_run_time[0]
                    ) ||
                    0
                );

                const genres = (
                    data.genres || []
                )
                    .map(item => item.name)
                    .join(', ');

                let ratings = '';

                const value = parseFloat(
                    data.vote_average || 0
                ).toFixed(1);

                if (value > 0) {
                    ratings += `
                        <div class="cas-rate-item">
                            <img src="${ICONS.tmdb}">
                            <span style="
                                color:${getRatingColor(value)}
                            ">
                                ${value}
                            </span>
                        </div>
                    `;
                }

                /*
                 * CUB rating.
                 *
                 * Формула залишається такою самою:
                 * реакції CUB конвертуються у вагу,
                 * після чого враховуються разом
                 * з базовим рейтингом.
                 */
                if (
                    data.reactions &&
                    data.reactions.result
                ) {
                    let sum = 0;
                    let count = 0;

                    const coefficients = {
                        fire: 10,
                        nice: 7.5,
                        think: 5,
                        bore: 2.5,
                        shit: 0
                    };

                    data.reactions.result.forEach(
                        reaction => {
                            if (!reaction.counter) return;

                            const coefficient =
                                coefficients[
                                    reaction.type
                                ];

                            if (
                                coefficient === undefined
                            ) {
                                return;
                            }

                            sum +=
                                reaction.counter *
                                coefficient;

                            count +=
                                reaction.counter;
                        }
                    );

                    if (count >= 1) {
                        const isTV =
                            !!data.name;

                        const base =
                            isTV ? 7.4 : 6.5;

                        const baseCount =
                            isTV ? 50 : 150;

                        const cub = (
                            (
                                base * baseCount +
                                sum
                            ) /
                            (
                                baseCount +
                                count
                            )
                        ).toFixed(1);

                        ratings += `
                            <div class="cas-rate-item">
                                <img src="${ICONS.cub}">
                                <span style="
                                    color:${getRatingColor(cub)}
                                ">
                                    ${cub}
                                </span>
                            </div>
                        `;
                    }
                }

                const meta = [];

                if (year) {
                    meta.push(`
                        <span class="cas-wave-year">
                            ${year}
                        </span>
                    `);
                }

                if (country) {
                    meta.push(`
                        <span class="cas-wave-country">
                            ${country}
                        </span>
                    `);
                }

                if (time) {
                    meta.push(`
                        <span class="cas-wave-time">
                            ${time}
                        </span>
                    `);
                }

                if (genres) {
                    meta.push(`
                        <span class="cas-wave-genre">
                            ${genres}
                        </span>
                    `);
                }

                render
                    .find('.cas-meta-info')
                    .html(
                        meta.join(' &bull; ')
                    );

                render
                    .find('.cas-bottom-ratings')
                    .html(ratings);
            })
        );

        if (
            Lampa.Storage.get(
                'cas_show_studios'
            )
        ) {
            tasks.push(
                Promise.resolve().then(() => {
                    renderStudioLogosWithColorAnalysis(
                        render.find(
                            '.cas-studios-row'
                        ),
                        data
                    );
                })
            );
        }

        await Promise.all(tasks);

        /*
         * Визначення якості через Lampa.Parser.
         */
        if (
            Lampa.Storage.get(
                'cas_show_quality'
            ) &&
            Lampa.Parser.get
        ) {
            const quality =
                render.find(
                    '.cas-quality-row'
                );

            const buttons =
                render.find(
                    '.full-start-new__buttons'
                );

            quality.hide();

            Lampa.Parser.get(
                {
                    search:
                        data.title ||
                        data.name,

                    movie: data,

                    page: 1
                },

                result => {
                    try {
                        const items =
                            result.Results ||
                            result;

                        if (
                            !items ||
                            !items.length
                        ) {
                            return;
                        }

                        const detected = {
                            res: '',
                            hdr: false,
                            dv: false,
                            ukr: false,
                            audio: '',
                            dub: false
                        };

                        items
                            .slice(0, 8)
                            .forEach(item => {
                                const title = (
                                    item.Title ||
                                    item.title ||
                                    ''
                                ).toLowerCase();

                                /*
                                 * Роздільна здатність
                                 */
                                if (
                                    title.includes('4k') ||
                                    title.includes('2160')
                                ) {
                                    detected.res =
                                        '4K';
                                } else if (
                                    !detected.res &&
                                    (
                                        title.includes(
                                            '1080'
                                        ) ||
                                        title.includes(
                                            'fhd'
                                        )
                                    )
                                ) {
                                    detected.res =
                                        'FULL HD';
                                }

                                /*
                                 * HDR / Dolby Vision
                                 */
                                if (
                                    title.includes(
                                        'hdr'
                                    )
                                ) {
                                    detected.hdr = true;
                                }

                                if (
                                    title.includes(
                                        'dv'
                                    ) ||
                                    title.includes(
                                        'dovi'
                                    ) ||
                                    title.includes(
                                        'vision'
                                    )
                                ) {
                                    detected.dv = true;
                                }

                                /*
                                 * Українська доріжка.
                                 */
                                if (
                                    title.includes(
                                        'ukr'
                                    ) ||
                                    title.includes(
                                        'укр'
                                    )
                                ) {
                                    detected.ukr = true;
                                }

                                /*
                                 * Аудіо.
                                 */
                                if (
                                    title.includes(
                                        '5.1'
                                    ) ||
                                    title.includes(
                                        '5 1'
                                    )
                                ) {
                                    detected.audio =
                                        '5.1';
                                } else if (
                                    title.includes(
                                        '7.1'
                                    ) ||
                                    title.includes(
                                        '7 1'
                                    )
                                ) {
                                    detected.audio =
                                        '7.1';
                                }

                                if (
                                    title.includes(
                                        '4.0'
                                    ) ||
                                    title.includes(
                                        '4 0'
                                    )
                                ) {
                                    detected.audio =
                                        '4.0';
                                } else if (
                                    title.includes(
                                        '2.0'
                                    ) ||
                                    title.includes(
                                        '2 0'
                                    )
                                ) {
                                    detected.audio =
                                        '2.0';
                                }

                                /*
                                 * Дубляж.
                                 */
                                if (
                                    title.includes(
                                        'dub'
                                    ) ||
                                    title.includes(
                                        'дубл'
                                    )
                                ) {
                                    detected.dub =
                                        true;
                                }
                            });

                        let html = '';

                        if (detected.res) {
                            html += `
                                <div class="
                                    cas-quality-item
                                    cas-wave-quality
                                ">
                                    <img src="${
                                        QUALITY_ICONS[
                                            detected.res
                                        ]
                                    }">
                                </div>
                            `;
                        }

                        if (detected.dv) {
                            html += `
                                <div class="
                                    cas-quality-item
                                    cas-wave-hdr
                                ">
                                    <img src="${
                                        QUALITY_ICONS[
                                            'Dolby Vision'
                                        ]
                                    }">
                                </div>
                            `;
                        } else if (
                            detected.hdr
                        ) {
                            html += `
                                <div class="
                                    cas-quality-item
                                    cas-wave-hdr
                                ">
                                    <img src="${
                                        QUALITY_ICONS.HDR
                                    }">
                                </div>
                            `;
                        }

                        if (detected.audio) {
                            html += `
                                <div class="
                                    cas-quality-item
                                    cas-wave-quality
                                    cas-audio-item
                                ">
                                    ${detected.audio}
                                </div>
                            `;
                        }

                        if (detected.dub) {
                            html += `
                                <div class="
                                    cas-quality-item
                                    cas-wave-quality
                                ">
                                    <img src="${
                                        QUALITY_ICONS.DUB
                                    }">
                                </div>
                            `;
                        }

                        if (detected.ukr) {
                            html += `
                                <div class="
                                    cas-quality-item
                                    cas-wave-ukr
                                ">
                                    <img src="${
                                        QUALITY_ICONS.UKR
                                    }">
                                </div>
                            `;
                        }

                        if (html) {
                            quality
                                .html(html)
                                .show();

                            if (buttons.length) {
                                buttons
                                    .off(
                                        'transitionend.casQuality ' +
                                        'animationend.casQuality'
                                    )
                                    .on(
                                        'transitionend.casQuality ' +
                                        'animationend.casQuality',
                                        function handler(e) {
                                            if (
                                                e.target !==
                                                this
                                            ) {
                                                return;
                                            }

                                            quality.addClass(
                                                'show-quality'
                                            );

                                            buttons.off(
                                                'transitionend.casQuality ' +
                                                'animationend.casQuality',
                                                handler
                                            );
                                        }
                                    );
                            } else {
                                quality.addClass(
                                    'show-quality'
                                );
                            }
                        }
                    } catch (e) {
                        quality.hide();
                    }
                }
            ).fail(() => quality.hide());
        } else {
            render
                .find('.cas-quality-row')
                .hide();
        }
    }

    const debouncedLoadMovieData = debounce(
        (render, data) => {
            try {
                loadMovieDataOptimized(
                    render,
                    data
                );
            } catch (e) {}
        },
        250
    );
  function attachLoader() {                
        Lampa.Listener.follow('full', (event) => {                
            if (event.type === 'complite') {                
                const data = event.data.movie;                
                const render = event.object.activity.render();                
                const cardRoot = render.find('.full-start-new.left-title');                
                            
                cardRoot.removeClass('cas-animated');                
                render.find('.cas-quality-row').removeClass('show-quality');
                event.object.activity.onBeforeDestroy = cleanup;                
                                
                if (data && data.id) {                
                    render.data('movie', data);                
                    const cacheId = 'tmdb_' + data.id;                
                    const cached = getCachedData(cacheId);                
                                
                    const processImagesWrapper = async (res) => {                
                        try { 
                            await processImages(render, data, res); 
                        } catch (e) {} finally {
                            requestAnimationFrame(() => {
                                cardRoot.addClass('cas-animated');
                            });
                        }
                    };                
                                    
                    if (cached) {
                        processImagesWrapper(cached);
                    } else {                
                        const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());                
                        $.getJSON(imagesUrl, (res) => {                
                            setCachedData(cacheId, res);                
                            processImagesWrapper(res);                
                        }).fail(() => {                
                            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);                
                            requestAnimationFrame(() => {
                                cardRoot.addClass('cas-animated');
                            });
                        });                
                    }                
                                    
                    if (event.data.reactions) data.reactions = event.data.reactions;          
                    debouncedLoadMovieData(render, data);                
                } else {
                    requestAnimationFrame(() => {
                        cardRoot.addClass('cas-animated');
                    });
                }                
                                
                setTimeout(() => {                
                    const firstButton = render.find('.full-start-new__buttons .full-start__button').first();                
                    if (firstButton.length) {                
                        render.find('.full-start__button').removeClass('focus');                
                        firstButton.addClass('focus').trigger('focus');                
                    }                
                }, 200);                
            }                
        });                
    }              
                  
    function startPlugin() {                   
        try {                  
            initializePlugin();                  
            console.log('NewCard plugin initialized successfully');                  
        } catch (error) {                  
            console.error('Failed to initialize NewCard plugin:', error);                  
        }                  
    }                  
                  
    if (window.appready) startPlugin();                  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });                  
})();
  
