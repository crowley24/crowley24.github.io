(function () {
    'use strict';

    const PLUGIN_NAME = 'NewCard';
    const PLUGIN_ID = 'new_card_style';
    const CACHE_TTL = 86400000;
    const TIMEOUT = 12000;

    let intervalId = null, logoReqId = 0, cardReqId = 0, slideGen = 0;
    let logoCacheMap = {}, detailsCacheMap = {};

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

    const getLang = () => String(Lampa.Storage.field?.('tmdb_lang') || Lampa.Storage.get('tmdb_lang') || 'en').toLowerCase();

    function getStorageCache(key) {
        const cache = Lampa.Storage.get(key) || {};
        Object.keys(cache).forEach(k => { if (Date.now() - cache[k].time > CACHE_TTL) delete cache[k]; });
        return cache;
    }

    function setStorageCache(key, id, data) {
        const cache = getStorageCache(key);
        cache[id] = { time: Date.now(), data };
        const keys = Object.keys(cache);
        if (keys.length > 100) delete cache[keys[0]];
        Lampa.Storage.set(key, cache);
    }

    const formatTime = m => !m ? '' : `${Math.floor(m / 60) ? Math.floor(m / 60) + 'г ' : ''}${m % 60}хв`;
    const getRating = d => Math.min(parseFloat(d?.vote_average || d?.rating) || 0, 10);
    const getYear = d => (parseInt(String(d?.release_date || d?.first_air_date || '').substring(0, 4)) > 1800) ? parseInt(String(d.release_date || d.first_air_date).substring(0, 4)) : '';
    const getCountry = d => (d?.production_countries?.map(i => i.name).filter(Boolean).slice(0, 2) || d?.origin_country || []).join(', ');
    const getRuntime = d => d?.runtime || d?.episode_run_time?.[0] || 0;

    function preloadImage(src) {
        return new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = src;
        });
    }

    function addCustomTemplate() {
        const anim = Lampa.Storage.get('cas_animation_style') || 'slide';
        Lampa.Template.add('full_start_new', `
        <div class="full-start-new left-title cas-anim-${anim}">
            <div class="full-start-new__body">
                <div class="full-start-new__left hide"><div class="full-start-new__poster"><img class="full-start-new__img full--poster"/></div></div>
                <div class="full-start-new__right">
                    <div class="left-title__content">
                        <div class="cas-logo-container">
                            <div class="cas-studios-row"></div>
                            <div class="cas-logo"></div>
                        </div>
                        <div class="cas-tagline" style="display:none;"></div>
                        <div class="cas-meta-line"><div class="cas-meta-info"></div></div>
                        <div class="cas-description"></div>
                        <div class="cas-details-wrapper"><div class="full-start-new__head hide"></div><div class="full-start-new__details hide"></div></div>
                        <div class="full-start-new__buttons">
                            <div class="full-start__button selector button--play"><svg width="28" height="29" viewBox="0 0 28 29" fill="none"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg><span>#{title_watch}</span></div>
                            <div class="full-start__button selector button--book"><svg width="21" height="32" viewBox="0 0 21 32" fill="none"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg><span>#{settings_input_links}</span></div>
                            <div class="full-start__button selector button--reaction"><svg width="38" height="34" viewBox="0 0 38 34" fill="none"><path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/><path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/></svg><span>#{title_reactions}</span></div>
                            <div class="full-start__button selector button--subscribe hide"><svg width="25" height="30" viewBox="0 0 25 30" fill="none"><path d="M6.01892 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/><path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/></svg><span>#{title_subscribe}</span></div>
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
        if ($('#cas-main-styles').length) return;
        $('body').append(`<style id="cas-main-styles">
        :root{--cas-blocks-gap:20px;--cas-meta-size:1.3em;}
        .full-start__background{height:calc(100% + 6em);left:0!important;opacity:0!important;transition:opacity 1s cubic-bezier(.2,.8,.2,1)!important;overflow:hidden!important;transform:translateZ(0);}
        .full-start__background.loaded{opacity:1!important;}
        .full-start__background.dim{opacity:0.35!important;}
        @keyframes casKenBurns{0%{transform:scale(1.02) translate3d(0,0,0);}50%{transform:scale(1.1) translate3d(5px,-15px,0);}100%{transform:scale(1.02) translate3d(0,0,0);}}
        @keyframes casPanScan{0%{transform:scale(1.06) translate3d(0,0,0);}33%{transform:scale(1.12) translate3d(-25px,-12px,0);}66%{transform:scale(1.1) translate3d(20px,15px,0);}100%{transform:scale(1.06) translate3d(0,0,0);}}
        @keyframes casTiltZoom{0%{transform:scale(1.08) rotate(0deg) translate3d(0,0,0);}33%{transform:scale(1.14) rotate(-2.2deg) translate3d(-15px,10px,0);}66%{transform:scale(1.14) rotate(2.2deg) translate3d(15px,-10px,0);}100%{transform:scale(1.08) rotate(0deg) translate3d(0,0,0);}}
        body.cas--zoom-kenburns .full-start__background img,body.cas--zoom-kenburns img.full-start__background{animation:casKenBurns 40s ease-in-out infinite!important;}
        body.cas--zoom-panscan .full-start__background img,body.cas--zoom-panscan img.full-start__background{animation:casPanScan 35s ease-in-out infinite!important;}
        body.cas--zoom-tiltzoom .full-start__background img,body.cas--zoom-tiltzoom img.full-start__background{animation:casTiltZoom 25s ease-in-out infinite!important;}
        .cas-tagline,.cas-studios-row,.cas-description,.cas-details-wrapper,.full-start-new__buttons{opacity:0!important;}
        .left-title .full-start-new__body{height:85vh;position:relative;}
        .left-title .full-start-new__right{position:static!important;width:100%!important;height:100%;padding:0!important;margin:0!important;display:block!important;}
        .left-title__content{position:absolute!important;left:0;right:0;bottom:0;z-index:5;width:100%;padding:7em 12em 2.5em 1.5em;display:flex;flex-direction:column;align-items:flex-start!important;cursor:pointer;}
        .cas-logo-container{display:flex;flex-direction:column;align-items:flex-start!important;margin:0 0 .5em 0;}
        .cas-studios-row{display:flex;gap:8px;margin:0 0 8px 0;}
        .cas-studio-item img{height:24px!important;max-width:140px;object-fit:contain;opacity:.95;}
        .cas-logo{display:block;width:30em;max-width:100%;height:8em;max-height:8em;margin-bottom:.5em;}
        .cas-logo img{max-width:30em;max-height:8em;object-fit:contain;object-position:left center;}
        .cas-logo-fallback{font-size:3em;font-weight:800;text-transform:uppercase;color:#fff;}
        .cas-tagline{font-size:calc(var(--cas-meta-size)*.95);font-style:italic;color:rgba(255,255,255,.85);margin:0 0 16px 0;max-width:70%;}
        .cas-meta-line,.cas-meta-info{display:flex!important;align-items:center!important;white-space:nowrap!important;font-size:var(--cas-meta-size);color:rgba(255,255,255,.82);overflow:hidden;margin:0 0 8px 0;}
        .cas-meta-separator{margin:0 9px;color:rgba(255,255,255,.45);}
        .cas-wave-rating{color:rgba(255,255,255,.95);font-weight:600;}
        .cas-description{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;font-size:var(--cas-meta-size)!important;line-height:1.4;color:rgba(255,255,255,.75);width:70%;margin:2px 0 10px 0;}
        .full-start-new__buttons{display:flex!important;justify-content:flex-start!important;align-items:center!important;flex-wrap:wrap;width:100%;}
        .cas-anim-slide .cas-tagline,.cas-anim-slide .cas-studios-row,.cas-anim-slide .cas-description,.cas-anim-slide .full-start-new__buttons{transform:translate3d(0,8px,0);transition:opacity .35s cubic-bezier(.25,1,.5,1),transform .35s cubic-bezier(.25,1,.5,1);}
        .cas-anim-slide.cas-animated .cas-studios-row{opacity:.9!important;transform:translate3d(0,0,0);transition-delay:.03s;}
        .cas-anim-slide.cas-animated .cas-tagline{opacity:.85!important;transform:translate3d(0,0,0);transition-delay:.06s;}
        .cas-anim-slide.cas-animated .cas-description{opacity:.75!important;transform:translate3d(0,0,0);transition-delay:.12s;}
        .cas-anim-slide.cas-animated .full-start-new__buttons{opacity:1!important;transform:translate3d(0,0,0);transition-delay:.16s;}
        .cas-anim-spring .cas-tagline,.cas-anim-spring .cas-studios-row,.cas-anim-spring .cas-description,.cas-anim-spring .full-start-new__buttons{transform:scale3d(.92,.92,1) translate3d(0,6px,0);transition:opacity .4s cubic-bezier(.175,.885,.32,1.275),transform .4s cubic-bezier(.175,.885,.32,1.275);}
        .cas-anim-spring.cas-animated .cas-studios-row{opacity:.9!important;transform:scale3d(1,1,1) translate3d(0,0,0);transition-delay:.03s;}
        .cas-anim-spring.cas-animated .cas-tagline{opacity:.85!important;transform:scale3d(1,1,1) translate3d(0,0,0);transition-delay:.06s;}
        .cas-anim-spring.cas-animated .cas-description{opacity:.75!important;transform:scale3d(1,1,1) translate3d(0,0,0);transition-delay:.12s;}
        .cas-anim-spring.cas-animated .full-start-new__buttons{opacity:1!important;transform:scale3d(1,1,1) translate3d(0,0,0);transition-delay:.16s;}
        @media(max-width:767px){.left-title .full-start-new__body{height:100vh;}.left-title__content{padding:4em 8em 12.5em 1.5em;}.cas-logo{width:80%;max-width:80%;height:5em;}.cas-tagline,.cas-description{width:95%;max-width:95%;}}
        </style>`);
    }

    function addSettings() {
        const defaults = {
            'cas_bg_animation': 'kenburns', 'cas_animation_style': 'slide',
            'cas_slideshow_enabled': true, 'cas_blocks_gap': '20',
            'cas_meta_size': '1.3', 'cas_show_studios': true, 'cas_show_tagline': true
        };
        Object.keys(defaults).forEach(k => { if (Lampa.Storage.get(k) === undefined) Lampa.Storage.set(k, defaults[k]); });

        Lampa.SettingsApi.addComponent({ component: PLUGIN_ID, name: PLUGIN_NAME, icon: SETTINGS_ICON });

        [
            { name: 'cas_meta_size', type: 'select', values: { '1.1': 'Міні', '1.2': 'Малий', '1.3': 'Стандартний', '1.4': 'Збільшений', '1.5': 'Великий' } },
            { name: 'cas_blocks_gap', type: 'select', values: { '10': 'Дуже тісно', '15': 'Тісно', '20': 'Стандарт', '25': 'Просторе', '30': 'Дуже просторе' } },
            { name: 'cas_bg_animation', type: 'select', values: { 'off': 'Вимкнено', 'kenburns': 'Ken Burns', 'panscan': 'Pan & Scan', 'tiltzoom': 'Tilt Zoom' } },
            { name: 'cas_animation_style', type: 'select', values: { 'slide': 'Slide', 'spring': 'Spring' } },
            { name: 'cas_slideshow_enabled', type: 'trigger' },
            { name: 'cas_show_studios', type: 'trigger' },
            { name: 'cas_show_tagline', type: 'trigger' }
        ].forEach(p => {
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
        root.style.setProperty('--cas-blocks-gap', (Lampa.Storage.get('cas_blocks_gap') || '20') + 'px');
        root.style.setProperty('--cas-meta-size', (Lampa.Storage.get('cas_meta_size') || '1.3') + 'em');

        const body = $('body').removeClass('cas--zoom-kenburns cas--zoom-panscan cas--zoom-tiltzoom');
        const bgAnim = Lampa.Storage.get('cas_bg_animation');
        if (bgAnim !== 'off') body.addClass('cas--zoom-' + bgAnim);

        const card = $('.full-start-new.left-title');
        if (card.length) {
            card.removeClass('cas-anim-slide cas-anim-spring').addClass('cas-anim-' + (Lampa.Storage.get('cas_animation_style') || 'slide'));
            card.find('.cas-tagline').toggle(!!Lampa.Storage.get('cas_show_tagline'));
            card.find('.cas-studios-row').toggle(!!Lampa.Storage.get('cas_show_studios'));
        }
    }

    function stopSlideshow() {
        slideGen++;
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
        if (window.casBgInterval) { clearInterval(window.casBgInterval); window.casBgInterval = null; }
    }

    function startSlideshow(render, backdrops) {
        stopSlideshow();
        if (!backdrops || backdrops.length <= 1 || !Lampa.Storage.get('cas_slideshow_enabled')) return;

        const gen = slideGen;
        const curLang = getLang();
        const filtered = backdrops.filter(b => b.iso_639_1 === curLang || !b.iso_639_1 || b.iso_639_1 === 'xx').slice(0, 15);
        if (filtered.length <= 1) return;

        let idx = 0;
        intervalId = setInterval(() => {
            if (gen !== slideGen) return;
            idx = (idx + 1) % filtered.length;
            const nextSrc = Lampa.TMDB.image('/t/p/original' + filtered[idx].file_path);
            const $bgImg = render.find('.full-start__background img, img.full-start__background').last();
            if (!$bgImg.length) return;

            const img = new Image();
            img.onload = () => {
                if (gen !== slideGen) return;
                const $container = render.find('.full-start__background').css({ transition: 'opacity 0.4s ease', opacity: 0 });
                setTimeout(() => {
                    if (gen !== slideGen) return;
                    $bgImg.attr('src', nextSrc);
                    setTimeout(() => { if (gen === slideGen) $container.css('opacity', 0.35); }, 100);
                }, 400);
            };
            img.src = nextSrc;
        }, 15000);
        window.casBgInterval = intervalId;
    }

    function pickLogo(logos) {
        if (!Array.isArray(logos) || !logos.length) return null;
        const pref = getLang();
        for (const lang of [pref, 'en', null]) {
            const found = logos.find(l => lang === null ? (!l.iso_639_1 || l.iso_639_1 === 'xx') : String(l.iso_639_1 || '').toLowerCase() === lang);
            if (found) return found;
        }
        return logos[0];
    }

    async function displayLogo(render, data, logos, reqId) {
        if (reqId !== logoReqId) return;
        const container = render.find('.cas-logo');
        if (!container.length) return;
        container.empty();
        const logo = pickLogo(logos);

        if (!logo?.file_path) {
            container.html($('<div class="cas-logo-fallback"></div>').text(data.title || data.name || ''));
            return;
        }

        const url = Lampa.TMDB.image('/t/p/w500' + logo.file_path);
        try {
            await preloadImage(url);
            if (reqId !== logoReqId) return;
            container.append($('<img>').attr({ alt: data.title || data.name || '', src: url }).show());
        } catch {
            if (reqId === logoReqId) container.html($('<div class="cas-logo-fallback"></div>').text(data.title || data.name || ''));
        }
    }

    function renderMetadata(render, data) {
        const container = render.find('.cas-meta-info');
        if (!container.length) return;
        container.empty();
        const rating = getRating(data), year = getYear(data), country = getCountry(data), runtime = formatTime(getRuntime(data));
        const genres = (data.genres || []).map(g => g.name).filter(Boolean).slice(0, 3).join(', ');

        if (rating > 0) container.append(`<span class="cas-meta-item cas-wave-rating">★ ${rating.toFixed(1)}</span>`);
        if (year) container.append(`<span class="cas-meta-item">${year}</span>`);
        if (country) container.append(`<span class="cas-meta-separator">·</span><span class="cas-meta-item">${country}</span>`);
        if (runtime) container.append(`<span class="cas-meta-separator">·</span><span class="cas-meta-item">${runtime}</span>`);
        if (genres) container.append(`<span class="cas-meta-separator">·</span><span class="cas-meta-item">${genres}</span>`);
    }

    function loadDetails(data) {
        return new Promise(resolve => {
            const type = data.name ? 'tv/' : 'movie/';
            const id = type + data.id;
            if (detailsCacheMap[id]) return resolve(detailsCacheMap[id]);

            $.getJSON(Lampa.TMDB.api(id + '?api_key=' + Lampa.TMDB.key() + '&language=' + getLang()), res => {
                detailsCacheMap[id] = res || null;
                resolve(detailsCacheMap[id]);
            }).fail(() => resolve(null));
        });
    }

    function attachLoader() {
        Lampa.Listener.follow('full', async event => {
            if (event.type !== 'complite') return;
            const data = event.data.movie;
            if (!data?.id) return;

            const render = event.object.activity.render();
            const cardRoot = render.find('.full-start-new.left-title');
            if (!cardRoot.length) return;

            const reqId = ++cardReqId;
            const logoId = ++logoReqId;

            cardRoot.removeClass('cas-animated');
            
            const desc = render.find('.cas-description'); if (desc.length) desc.empty().hide();
            const tag = render.find('.cas-tagline'); if (tag.length) tag.empty().hide();
            const stud = render.find('.cas-studios-row'); if (stud.length) stud.empty();
            const meta = render.find('.cas-meta-info'); if (meta.length) meta.empty();
            const logoC = render.find('.cas-logo'); if (logoC.length) logoC.empty();

            render.find('.full-start-new__details, .full-start-new__description, .full-descr, .full-start__description').hide();

            event.object.activity.onBeforeDestroy = stopSlideshow;

            renderMetadata(render, data);
            if (data.overview && desc.length) desc.text(data.overview).show();
            if (data.tagline && Lampa.Storage.get('cas_show_tagline') && tag.length) tag.text('«' + data.tagline + '»').show();

            const cacheKey = 'tmdb_' + data.id;
            let res = getStorageCache('cas_images_cache')[cacheKey]?.data;

            if (!res) {
                res = await new Promise(r => $.getJSON(Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&include_image_language=' + getLang() + ',en,null'), r).fail(() => r(null)));
                if (res) setStorageCache('cas_images_cache', cacheKey, res);
            }

            if (reqId !== cardReqId) return;

            if (res) {
                const cachedLogoKey = 'tmdb_logo_' + data.id;
                let logo = logoCacheMap[cachedLogoKey] || pickLogo(res.logos);
                if (logo) {
                    logoCacheMap[cachedLogoKey] = logo;
                    displayLogo(render, data, [logo], logoId);
                } else if (logoC.length) {
                    logoC.html($('<div class="cas-logo-fallback"></div>').text(data.title || data.name || ''));
                }
                startSlideshow(render, res.backdrops);
            }

            if (!getCountry(data) || !getRuntime(data) || !data.genres?.length || !getRating(data)) {
                const details = await loadDetails(data);
                if (details && reqId === cardReqId) {
                    const merged = Object.assign({}, data, details);
                    renderMetadata(render, merged);
                    if (!data.overview && details.overview && desc.length) desc.text(details.overview).show();
                    if (!data.tagline && details.tagline && Lampa.Storage.get('cas_show_tagline') && tag.length) tag.text('«' + details.tagline + '»').show();
                    if (Lampa.Storage.get('cas_show_studios') && details.production_companies?.[0]?.logo_path && stud.length) {
                        stud.html(`<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + details.production_companies[0].logo_path)}"/></div>`).show();
                    }
                }
            } else if (Lampa.Storage.get('cas_show_studios') && data.production_companies?.[0]?.logo_path && stud.length) {
                stud.html(`<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + data.production_companies[0].logo_path)}"/></div>`).show();
            }

            if (reqId === cardReqId) requestAnimationFrame(() => cardRoot.addClass('cas-animated'));

            setTimeout(() => {
                if (reqId === cardReqId) {
                    render.find('.full-start__button').removeClass('focus');
                    render.find('.full-start-new__buttons .full-start__button').first().addClass('focus').trigger('focus');
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
            console.log('NewCard 3.3.9 initialized successfully');
        } catch (e) {
            console.error('Failed to initialize NewCard plugin:', e);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', e => { if (e.type === 'ready') startPlugin(); });
})();
