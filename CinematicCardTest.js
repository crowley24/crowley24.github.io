(function () {
    'use strict';

    /*
     * @name NEWCARD
     * @version 3.3.7
     * @author Crowley24
     * @description Cinematic TV interface with Trailer Feed logo behavior
     * @platforms Lampa | Android TV
     */

    const PLUGIN_ID = 'new_card_style';
    const PLUGIN_NAME = 'NewCard';
    const CACHE_LIFETIME = 86400000; // 24 hours
    const REQUEST_TIMEOUT = 12000;

    let currentInterval = null;
    let logoRequestId = 0;
    let cardRequestId = 0;
    let logoRequests = {};
    let detailsRequests = {};
    let debounceTimer = null;
    let slideshowGeneration = 0;

    const SETTINGS_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/><rect x="25" y="66" width="30" height="6" rx="3" fill="white" opacity="0.6"/><rect x="60" y="66" width="15" height="6" rx="3" fill="white" opacity="0.6"/></svg>`;

    const TRANSLATIONS = {
        'settings_cas_meta_size': 'Розмір шрифту',
        'settings_cas_blocks_gap': 'Відступи між блоками',
        'settings_cas_bg_animation': 'Анімація фону',
        'settings_cas_animation_style': 'Стиль анімації появи',
        'settings_cas_slideshow_enabled': 'Слайд-шоу фону',
        'settings_cas_show_studios': 'Показувати студії',
        'settings_cas_show_tagline': 'Показувати слоган'
    };

    // =====================================================
    // HELPERS
    // =====================================================

    const debounce = (fn, delay) => (...args) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fn(...args), delay);
    };

    const preloadImage = src => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    const formatTime = mins => {
        mins = parseInt(mins) || 0;
        if (!mins) return '';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return (h ? h + 'г ' : '') + m + 'хв';
    };

    const getRating = data => {
        const r = parseFloat(data?.vote_average || data?.rating);
        return isFinite(r) && r > 0 ? Math.min(r, 10) : 0;
    };

    const getYear = data => {
        const y = parseInt(String(data?.release_date || data?.first_air_date || '').substring(0, 4));
        return y > 1800 ? y : '';
    };

    const getCountry = data => (data?.production_countries || []).map(i => i.name).filter(Boolean).slice(0, 2).join(', ') || (data?.origin_country || []).join(', ');

    const getRuntime = data => data?.runtime || data?.episode_run_time?.[0] || 0;

    // =====================================================
    // STORAGE & CACHE
    // =====================================================

    const getStorage = (key, def) => Lampa.Storage.get(key) ?? def;
    const setStorage = (key, val) => Lampa.Storage.set(key, val);

    const getCachedData = (id, cacheKey = 'cas_images_cache') => {
        const cache = getStorage(cacheKey, {});
        return (cache[id] && Date.now() - cache[id].time < CACHE_LIFETIME) ? cache[id].data : null;
    };

    const setCachedData = (id, data, cacheKey = 'cas_images_cache') => {
        const cache = getStorage(cacheKey, {});
        cache[id] = { time: Date.now(), data };
        const keys = Object.keys(cache);
        if (keys.length > 100) delete cache[keys[0]];
        setStorage(cacheKey, cache);
    };

    // =====================================================
    // SETTINGS & STYLES
    // =====================================================

    function addSettings() {
        const defaults = {
            cas_bg_animation: 'kenburns',
            cas_animation_style: 'slide',
            cas_slideshow_enabled: true,
            cas_blocks_gap: '20',
            cas_meta_size: '1.3',
            cas_show_studios: true,
            cas_show_tagline: true
        };

        Object.entries(defaults).forEach(([k, v]) => {
            if (getStorage(k) === undefined) setStorage(k, v);
        });

        Lampa.SettingsApi.addComponent({ component: PLUGIN_ID, name: PLUGIN_NAME, icon: SETTINGS_ICON });

        const params = [
            { name: 'cas_meta_size', type: 'select', values: { '1.1': 'Міні', '1.2': 'Малий', '1.3': 'Стандартний', '1.4': 'Збільшений', '1.5': 'Великий' } },
            { name: 'cas_blocks_gap', type: 'select', values: { '10': 'Дуже тісно', '15': 'Тісно', '20': 'Стандарт', '25': 'Просторе', '30': 'Дуже просторе' } },
            { name: 'cas_bg_animation', type: 'select', values: { 'off': 'Вимкнено', 'kenburns': 'Ken Burns', 'panscan': 'Pan & Scan', 'tiltzoom': 'Tilt Zoom' } },
            { name: 'cas_animation_style', type: 'select', values: { 'slide': 'Slide from Left', 'spring': 'Elastic Spring' } },
            { name: 'cas_slideshow_enabled', type: 'trigger' },
            { name: 'cas_show_studios', type: 'trigger' },
            { name: 'cas_show_tagline', type: 'trigger' }
        ];

        params.forEach(p => {
            Lampa.SettingsApi.addParam({
                component: PLUGIN_ID,
                param: { name: p.name, type: p.type, values: p.values, default: defaults[p.name] },
                field: { name: TRANSLATIONS['settings_' + p.name] },
                onChange: applySettings
            });
        });

        applySettings();
    }

    function applySettings() {
        const root = document.documentElement;
        root.style.setProperty('--cas-blocks-gap', getStorage('cas_blocks_gap', '20') + 'px');
        root.style.setProperty('--cas-meta-size', getStorage('cas_meta_size', '1.3') + 'em');

        const body = $('body').removeClass('cas--zoom-kenburns cas--zoom-panscan cas--zoom-tiltzoom');
        const bgAnim = getStorage('cas_bg_animation', 'kenburns');
        if (bgAnim !== 'off') body.addClass('cas--zoom-' + bgAnim);

        const card = $('.full-start-new.left-title');
        if (card.length) {
            card.removeClass('cas-anim-slide cas-anim-spring').addClass('cas-anim-' + getStorage('cas_animation_style', 'slide'));
            card.find('.cas-tagline').toggle(!!getStorage('cas_show_tagline'));
            card.find('.cas-studios-row').toggle(!!getStorage('cas_show_studios'));

            stopSlideshow();
            if (getStorage('cas_slideshow_enabled')) {
                const movie = card.data('movie');
                const cached = movie && getCachedData('tmdb_' + movie.id);
                if (cached?.backdrops?.length > 1) {
                    startSlideshow(card, cached.backdrops, Lampa.Storage.field('tmdb_lang') || 'uk');
                }
            }
        }
    }

    function addCustomTemplate() {
        const anim = getStorage('cas_animation_style', 'slide');
        Lampa.Template.add('full_start_new', `
            <div class="full-start-new left-title cas-anim-${anim}">
                <div class="full-start-new__body">
                    <div class="full-start-new__left hide"><div class="full-start-new__poster"><img class="full-start-new__img full--poster"/></div></div>
                    <div class="full-start-new__right">
                        <div class="left-title__content">
                            <div class="cas-logo-container"><div class="cas-studios-row"></div><div class="cas-logo"></div></div>
                            <div class="cas-tagline" style="display:none;"></div>
                            <div class="cas-meta-line"><div class="cas-meta-info"></div></div>
                            <div class="cas-description"></div>
                            <div class="cas-details-wrapper"><div class="full-start-new__head hide"></div><div class="full-start-new__details hide"></div></div>
                            <div class="full-start-new__buttons">
                                <div class="full-start__button selector button--play"><svg width="28" height="29" viewBox="0 0 28 29" fill="none"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg><span>#{title_watch}</span></div>
                                <div class="full-start__button selector button--book"><svg width="21" height="32" viewBox="0 0 21 32" fill="none"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg><span>#{settings_input_links}</span></div>
                                <div class="full-start__button selector button--reaction"><svg width="38" height="34" viewBox="0 0 38 34" fill="none"><path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/><path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/></svg><span>#{title_reactions}</span></div>
                                <div class="full-start__button selector button--options"><svg width="38" height="10" viewBox="0 0 38 10" fill="none"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg></div>
                            </div>
                        </div>
                        <div class="full-start-new__reactions selector hide"></div>
                        <div class="rating--modss" style="display:none;"></div>
                    </div>
                </div>
            </div>`);
    }

    function addStyles() {
        if ($('#cas-main-styles').length) return;
        $('body').append(`<style id="cas-main-styles">
            :root { --cas-blocks-gap: 20px; --cas-meta-size: 1.3em; --cas-curve-slide: cubic-bezier(0.25, 1, 0.5, 1); --cas-curve-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            .full-start__background { height: calc(100% + 6em); left: 0 !important; opacity: 0 !important; transition: opacity 1s cubic-bezier(0.2, 0.8, 0.2, 1) !important; will-change: opacity; overflow: hidden !important; transform: translateZ(0); }
            .full-start__background.loaded { opacity: 1 !important; }
            .full-start__background.dim { opacity: 0.35 !important; }
            @keyframes casKenBurnsParallax { 0% { transform: scale(1.02) translate3d(0,0,0); } 50% { transform: scale(1.10) translate3d(5px,-15px,0); } 100% { transform: scale(1.02) translate3d(0,0,0); } }
            @keyframes casCinematicPanScan { 0% { transform: scale(1.06) translate3d(0,0,0); } 33% { transform: scale(1.12) translate3d(-25px,-12px,0); } 66% { transform: scale(1.10) translate3d(20px,15px,0); } 100% { transform: scale(1.06) translate3d(0,0,0); } }
            @keyframes casDynamicTiltZoom { 0% { transform: scale(1.08) rotate(0deg) translate3d(0,0,0); } 33% { transform: scale(1.14) rotate(-2.2deg) translate3d(-15px,10px,0); } 66% { transform: scale(1.14) rotate(2.2deg) translate3d(15px,-10px,0); } 100% { transform: scale(1.08) rotate(0deg) translate3d(0,0,0); } }
            body.cas--zoom-kenburns .full-start__background img, body.cas--zoom-kenburns img.full-start__background { animation: casKenBurnsParallax 40s ease-in-out infinite !important; transform-origin: center center; }
            body.cas--zoom-panscan .full-start__background img, body.cas--zoom-panscan img.full-start__background { animation: casCinematicPanScan 35s ease-in-out infinite !important; transform-origin: center center; }
            body.cas--zoom-tiltzoom .full-start__background img, body.cas--zoom-tiltzoom img.full-start__background { animation: casDynamicTiltZoom 25s ease-in-out infinite !important; transform-origin: center center; }
            .cas-tagline, .cas-studios-row, .cas-description, .cas-details-wrapper, .full-start-new__buttons { opacity: 0 !important; will-change: transform, opacity; backface-visibility: hidden; }
            .left-title .full-start-new__body { height: 85vh; position: relative; }
            .left-title .full-start-new__right { position: static !important; width: 100% !important; height: 100%; padding: 0 !important; margin: 0 !important; display: block !important; }
            .left-title__content { position: absolute !important; left: 0; right: 0; bottom: 0; z-index: 5; box-sizing: border-box; width: 100%; padding: 7em 12em 2.5em 1.5em; display: flex; flex-direction: column; align-items: flex-start !important; text-align: left !important; background: transparent !important; cursor: pointer; }
            .cas-logo-container { position: relative; display: flex; flex-direction: column; align-items: flex-start !important; justify-content: flex-end; width: 100%; margin: 0 0 .5em 0; }
            .cas-studios-row { display: flex; flex-wrap: wrap; justify-content: flex-start !important; align-items: center; gap: 8px; margin: 0 0 8px 0; }
            .cas-studio-item { height: 24px !important; display: flex; align-items: center; justify-content: flex-start; margin-bottom: 2px; }
            .cas-studio-item img { height: 100%; width: auto; max-width: 140px; object-fit: contain; opacity: 0.95; }
            .cas-logo { display: block; width: 30em; max-width: 100%; height: 8em; max-height: 8em; overflow: visible; margin-bottom: .5em; }
            .cas-logo img { display: block; width: auto; height: auto; max-width: 30em; max-height: 8em; object-fit: contain; object-position: left center; border: none; background: transparent; }
            .cas-logo-fallback { max-width: 30em; max-height: 8em; overflow: hidden; font-size: 3em; font-weight: 800; line-height: 1.05; text-transform: uppercase; color: #fff; }
            .cas-tagline { font-size: calc(var(--cas-meta-size) * 0.95); font-style: italic; color: rgba(255,255,255,0.85); margin: 0 0 16px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.6); max-width: 70%; text-align: left !important; }
            .cas-meta-line, .cas-meta-info { display: flex !important; align-items: center !important; justify-content: flex-start !important; flex-wrap: nowrap !important; white-space: nowrap !important; gap: 0 !important; width: 100%; overflow: hidden; margin: 0 0 8px 0; }
            .cas-meta-info { font-size: var(--cas-meta-size); font-weight: 400; line-height: 1.4; color: rgba(255,255,255,0.82); }
            .cas-meta-item { display: inline-block; flex: 0 0 auto; white-space: nowrap; }
            .cas-meta-separator { display: inline-block; flex: 0 0 auto; margin: 0 9px; color: rgba(255,255,255,0.45); }
            .cas-wave-rating { display: inline-flex; align-items: center; color: rgba(255,255,255,0.95); font-weight: 600; }
            .cas-wave-rating-star { margin-right: 4px; font-size: 0.95em; }
            .cas-wave-genre { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .cas-description { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; font-size: var(--cas-meta-size) !important; line-height: 1.4; color: rgba(255,255,255,0.75); width: 70%; max-width: 70%; margin: 2px 0 10px 0; text-align: left !important; }
            .full-start-new__buttons { display: flex !important; justify-content: flex-start !important; align-items: center !important; flex-wrap: wrap; width: 100%; margin: 0 !important; padding: 0; }
            .cas-anim-slide .cas-tagline, .cas-anim-slide .cas-studios-row, .cas-anim-slide .cas-description, .cas-anim-slide .cas-details-wrapper, .cas-anim-slide .full-start-new__buttons { transform: translate3d(0,8px,0); transition: opacity 0.35s var(--cas-curve-slide), transform 0.35s var(--cas-curve-slide); }
            .cas-anim-slide.cas-animated .cas-studios-row { opacity: 0.9 !important; transform: translate3d(0,0,0); transition-delay: 0.03s; }
            .cas-anim-slide.cas-animated .cas-tagline { opacity: 0.85 !important; transform: translate3d(0,0,0); transition-delay: 0.06s; }
            .cas-anim-slide.cas-animated .cas-description { opacity: 0.75 !important; transform: translate3d(0,0,0); transition-delay: 0.12s; }
            .cas-anim-slide.cas-animated .full-start-new__buttons { opacity: 1 !important; transform: translate3d(0,0,0); transition-delay: 0.16s; }
            @media (max-width: 767px) {
                .left-title .full-start-new__body { height: 100vh; }
                .left-title__content { padding: 4em 8em 12.5em 1.5em; right: 0; }
                .cas-logo { width: 80%; max-width: 80%; height: 5em; max-height: 5em; }
                .cas-tagline, .cas-description { width: 95%; max-width: 95%; }
            }
        </style>`);
    }

    // =====================================================
    // CLEANUP & SLIDESHOW
    // =====================================================

    function cleanup() {
        stopSlideshow();
        logoRequestId++;
        cardRequestId++;
        $('.left-title__content').parent().parent().removeClass('cas-animated');
    }

    function stopSlideshow() {
        slideshowGeneration++;
        if (currentInterval) { clearInterval(currentInterval); currentInterval = null; }
        if (window.casBgInterval) { clearInterval(window.casBgInterval); window.casBgInterval = null; }
    }

    function startSlideshow(render, backdrops, currentLang) {
        stopSlideshow();
        if (!backdrops || backdrops.length <= 1) return;

        const generation = slideshowGeneration;
        const filtered = backdrops.filter(b => b.iso_639_1 === currentLang)
            .concat(backdrops.filter(b => !b.iso_639_1 || b.iso_639_1 === 'xx' || b.iso_639_1 === 'null'))
            .concat(backdrops.filter(b => b.iso_639_1 && b.iso_639_1 !== currentLang))
            .slice(0, 15);

        if (filtered.length <= 1) return;
        let idx = 0;

        currentInterval = setInterval(() => {
            if (generation !== slideshowGeneration) return;
            idx = (idx + 1) % filtered.length;
            const nextSrc = Lampa.TMDB.image('/t/p/original' + filtered[idx].file_path);
            const $bgImg = render.find('.full-start__background img, img.full-start__background').last();
            if (!$bgImg.length) return;

            const img = new Image();
            img.onload = () => {
                if (generation !== slideshowGeneration) return;
                const $container = render.find('.full-start__background').css({ transition: 'opacity 0.4s ease', opacity: 0 });
                setTimeout(() => {
                    if (generation !== slideshowGeneration) return;
                    $bgImg.attr('src', nextSrc);
                    setTimeout(() => {
                        if (generation !== slideshowGeneration) return;
                        $container.css('opacity', 0.35);
                    }, 100);
                }, 400);
            };
            img.src = nextSrc;
        }, 15000);

        window.casBgInterval = currentInterval;
    }

    // =====================================================
    // LOGO SYSTEM
    // =====================================================

    const getPreferredLogoLanguage = () => String(Lampa.Storage.field?.('tmdb_lang') || Lampa.Storage.get('tmdb_lang') || 'en').toLowerCase();

    function pickLogo(logos) {
        if (!Array.isArray(logos) || !logos.length) return null;
        const preferred = getPreferredLogoLanguage();
        for (const lang of [preferred, 'en', null]) {
            const found = logos.find(l => {
                if (!l?.file_path) return false;
                if (lang === null) return !l.iso_639_1 || l.iso_639_1 === 'xx' || l.iso_639_1 === 'null';
                return String(l.iso_639_1 || '').toLowerCase() === lang;
            });
            if (found) return found;
        }
        return logos.find(l => l?.file_path) || null;
    }

    function showLogoFallback(render, data, requestId) {
        if (requestId !== logoRequestId) return;
        const title = data.title || data.name || '';
        render.find('.cas-logo').empty().html($('<div class="cas-logo-fallback"></div>').text(title));
    }

    async function displayMovieLogo(render, data, logos, requestId) {
        if (requestId !== logoRequestId) return;
        const selected = pickLogo(logos);
        if (!selected?.file_path) { showLogoFallback(render, data, requestId); return; }
        const url = Lampa.TMDB.image('/t/p/w500' + selected.file_path);

        try {
            await preloadImage(url);
            if (requestId !== logoRequestId) return;
            render.find('.cas-logo').empty().append($('<img>').attr({ alt: data.title || data.name || '', src: url }));
        } catch {
            showLogoFallback(render, data, requestId);
        }
    }

    function loadMovieLogo(render, data, imagesData) {
        const requestId = ++logoRequestId;
        const cacheId = 'tmdb_logo_' + data.id;
        const container = render.find('.cas-logo').empty();

        const cached = getCachedData(cacheId, 'cas_logo_cache');
        if (cached) { displayMovieLogo(render, data, [cached], requestId); return; }

        if (imagesData?.logos) {
            const selected = pickLogo(imagesData.logos);
            if (selected) setCachedData(cacheId, selected, 'cas_logo_cache');
            displayMovieLogo(render, data, imagesData.logos, requestId);
            return;
        }

        const url = Lampa.TMDB.api(`/${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}&include_image_language=${getPreferredLogoLanguage() || 'en'},en,null`);
        $.getJSON(url, res => {
            if (requestId !== logoRequestId) return;
            const selected = pickLogo(res?.logos);
            if (selected) setCachedData(cacheId, selected, 'cas_logo_cache');
            displayMovieLogo(render, data, res?.logos || [], requestId);
        }).fail(() => showLogoFallback(render, data, requestId));
    }

    // =====================================================
    // METADATA & DETAILS
    // =====================================================

    function renderMetadata(render, data) {
        const container = render.find('.cas-meta-info').empty();
        const year = getYear(data);
        const country = getCountry(data);
        const runtime = formatTime(getRuntime(data));
        const rating = getRating(data);
        const genres = (data.genres || []).map(g => g.name).filter(Boolean).slice(0, 3).join(', ');

        if (rating > 0) {
            container.append(`<span class="cas-meta-item cas-wave-rating"><span class="cas-wave-rating-star">★</span><span>${rating.toFixed(1)}</span></span>`);
        }
        [year, country, runtime, genres].forEach((val, i) => {
            if (val) {
                if (container.children().length) container.append('<span class="cas-meta-separator">·</span>');
                container.append($('<span></span>').addClass('cas-meta-item ' + ['cas-wave-year', 'cas-wave-country', 'cas-wave-time', 'cas-wave-genre'][i]).text(val));
            }
        });
        container.css('display', 'flex');
    }

    async function loadMovieDataOptimized(render, data, requestId) {
        if (!data || requestId !== cardRequestId) return;

        if (data.tagline && getStorage('cas_show_tagline')) {
            render.find('.cas-tagline').text('«' + data.tagline + '»').show();
        } else {
            render.find('.cas-tagline').hide();
        }

        const desc = String(data.overview || '').trim();
        render.find('.cas-description').text(desc).css('display', desc ? '-webkit-box' : 'none');
        renderMetadata(render, data);

        if (!getCountry(data) || !getRuntime(data) || !data.genres?.length || !getRating(data) || !data.overview) {
            const type = data.name ? 'tv/' : 'movie/';
            const url = Lampa.TMDB.api(`${type}${data.id}?api_key=${Lampa.TMDB.key()}&language=${getPreferredLogoLanguage() || 'uk'}`);
            
            $.getJSON(url, details => {
                if (!details || requestId !== cardRequestId) return;
                const merged = Object.assign({}, data, details);
                renderMetadata(render, merged);
                if (details.overview) {
                    render.find('.cas-description').text(String(details.overview).trim()).css('display', '-webkit-box');
                }
                if (details.tagline && getStorage('cas_show_tagline')) {
                    render.find('.cas-tagline').text('«' + details.tagline + '»').show();
                }
            });
        }

        const studiosRow = render.find('.cas-studios-row').empty();
        if (getStorage('cas_show_studios')) {
            const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 1);
            studios.forEach(s => studiosRow.append(`<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}" alt="${s.name || ''}"></div>`));
        }
    }

    const debouncedLoadMovieData = debounce((render, data, requestId) => loadMovieDataOptimized(render, data, requestId), 150);

    // =====================================================
    // EVENT LISTENER & INIT
    // =====================================================

    function attachLoader() {
        Lampa.Listener.follow('full', event => {
            if (event.type !== 'complite') return;
            const data = event.data.movie;
            const render = event.object.activity.render();
            const cardRoot = render.find('.full-start-new.left-title');
            const thisCardRequest = ++cardRequestId;
            logoRequestId++;

            cardRoot.removeClass('cas-animated');
            render.find('.cas-description, .cas-tagline, .cas-studios-row').empty().hide();
            render.find('.cas-meta-info, .cas-logo').empty();
            render.find('.full-start-new__details, .full-start-new__description, .full-start-new__overview, .full-start-new__text, .full-start-new__head, .full-descr, .full-start__description, .full-start__descr, .full-description').hide();

            event.object.activity.onBeforeDestroy = cleanup;

            if (data?.id) {
                render.data('movie', data);
                const cacheId = 'tmdb_' + data.id;
                const cached = getCachedData(cacheId);

                const handleImages = res => {
                    if (thisCardRequest !== cardRequestId) return;
                    loadMovieLogo(render, data, res);
                    stopSlideshow();
                    if (getStorage('cas_slideshow_enabled') && res?.backdrops?.length > 1) {
                        startSlideshow(render, res.backdrops, Lampa.Storage.field('tmdb_lang') || 'uk');
                    }
                    requestAnimationFrame(() => {
                        if (thisCardRequest === cardRequestId) cardRoot.addClass('cas-animated');
                    });
                };

                if (cached) {
                    handleImages(cached);
                } else {
                    $.getJSON(Lampa.TMDB.api(`/${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}&include_image_language=${getPreferredLogoLanguage() || 'en'},en,null`), res => {
                        if (thisCardRequest !== cardRequestId) return;
                        setCachedData(cacheId, res);
                        handleImages(res);
                    }).fail(() => {
                        if (thisCardRequest === cardRequestId) {
                            showLogoFallback(render, data, logoRequestId);
                            cardRoot.addClass('cas-animated');
                        }
                    });
                }

                debouncedLoadMovieData(render, data, thisCardRequest);
            } else {
                cardRoot.addClass('cas-animated');
            }

            setTimeout(() => {
                if (thisCardRequest === cardRequestId) {
                    const firstBtn = render.find('.full-start-new__buttons .full-start__button').first();
                    if (firstBtn.length) render.find('.full-start__button').removeClass('focus'), firstBtn.addClass('focus').trigger('focus');
                }
            }, 200);
        });
    }

    function startPlugin() {
        try {
            addCustomTemplate();
            addStyles();
            addSettings();
            attachLoader();
            console.log('NewCard 3.3.7 initialized successfully');
        } catch (e) {
            console.error('Failed to initialize NewCard plugin:', e);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', e => { if (e.type === 'ready') startPlugin(); });

})();
