(function () { 'use strict'; 
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

    let debounceTimer; 
    function debounce(func, delay) { 
        return function() { 
            const context = this; const args = arguments; 
            clearTimeout(debounceTimer); 
            debounceTimer = setTimeout(() => func.apply(context, args), delay); 
        }; 
    } 

    function preloadImage(src) { 
        return new Promise((resolve) => { 
            const img = new Image(); 
            img.onload = () => resolve(img); 
            img.onerror = () => resolve(null); 
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

        if (Lampa.SettingsApi) {
            Lampa.SettingsApi.addComponent({ component: PLUGIN_ID, name: PLUGIN_NAME, icon: SETTINGS_ICON }); 
            const params = [ 
                { name: 'cas_logo_quality', type: 'select', values: { 'w300':'300px', 'w500':'500px', 'original':'Original' } }, 
                { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' } }, 
                { name: 'cas_meta_size', type: 'select', values: { '1.2': 'Малий', '1.3': 'Стандартний', '1.4': 'Збільшений', '1.5': 'Великий' } }, 
                { name: 'cas_blocks_gap', type: 'select', values: { '15':'Тісно','20':'Стандарт','25':'Просторе' } }, 
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
                    param: { name: p.name, type: p.type, values: p.values, default: defaults[p.name] }, 
                    field: { name: Lampa.Lang.translate('settings_' + p.name) || p.name }, 
                    onChange: applySettings 
                }); 
            }); 
        }
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
        const template = `<div class="full-start-new left-title"> <div class="full-start-new__body"> <div class="full-start-new__right"> <div class="left-title__content"> <div class="cas-logo-container" style="margin-bottom: var(--cas-blocks-gap);"> <div class="cas-logo"></div> </div> <div class="cas-studios-row"></div> <div class="cas-ratings-line"> <div class="cas-rate-items"></div> <div class="cas-meta-info"></div> <div class="cas-quality-row"></div> </div> <div class="cas-description"></div> <div class="full-start-new__buttons"> <div class="full-start__button selector button--play"> <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg> <span>#{title_watch}</span> </div> <div class="full-start__button selector view--torrent"> <span>#{full_torrents}</span> </div> <div class="full-start__button selector view--trailer"> <span>#{full_trailers}</span> </div> <div class="full-start__button selector button--book"> <span>#{settings_input_links}</span> </div> <div class="full-start__button selector button--options"> <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg> </div> </div> </div> </div> </div> </div>`; 
        Lampa.Template.add('full_start_new', template); 
    } 

    function addStyles() { 
        const styles = `<style> 
        :root { --cas-logo-scale: 1; --cas-blocks-gap: 20px; --cas-meta-size: 1.3em; } 
        .left-title .full-start-new__right { display: flex; align-items: flex-end; justify-content: flex-start !important; padding-bottom: 8vh; padding-left: 5% !important; width: 100%; } 
        .left-title__content { width: 100%; max-width: 850px; text-align: left; } 
        .cas-logo { opacity: 0; transition: opacity 0.5s ease; } 
        .cas-animated .cas-logo { opacity: 1; } 
        .cas-studios-row, .cas-rate-items, .cas-meta-info, .cas-quality-row, .cas-description { opacity: 0; transform: translateY(10px); transition: all 0.4s ease; } 
        .cas-animated .cas-studios-row { opacity: 0.9; transform: translateY(0); transition-delay: 0.1s; } 
        .cas-animated .cas-rate-items { opacity: 1; transform: translateY(0); transition-delay: 0.2s; } 
        .cas-animated .cas-meta-info { opacity: 0.7; transform: translateY(0); transition-delay: 0.3s; } 
        .cas-animated .cas-quality-row { opacity: 0.9; transform: translateY(0); transition-delay: 0.4s; } 
        .cas-animated .cas-description { opacity: 0.7; transform: translateY(0); transition-delay: 0.5s; } 
        .full-start-new__buttons { display: flex !important; gap: 15px; margin-top: 25px; opacity: 0; transform: translateY(10px); transition: all 0.5s ease 0.6s; } 
        .cas-animated .full-start-new__buttons { opacity: 1; transform: translateY(0); } 
        .left-title .full-start__button { background: rgba(255, 255, 255, 0.08) !important; color: #fff !important; padding: 12px 22px !important; border-radius: 10px; transition: all 0.3s ease; } 
        .left-title .full-start__button.focus { background: #fff !important; color: #000 !important; transform: scale(1.08); box-shadow: 0 10px 30px rgba(255,255,255,0.3); } 
        .cas-logo img { max-width: 450px; max-height: 180px; transform: scale(var(--cas-logo-scale)); transform-origin: left bottom; } 
        .cas-description { font-size: var(--cas-meta-size); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin-top: 15px; } 
        .cas-ratings-line { display: flex; align-items: center; gap: 15px; height: 35px; margin-top: 10px; }
        .cas-rate-item { display: flex; align-items: center; gap: 6px; font-weight: bold; }
        .cas-rate-item img { height: 18px; }
        .cas-studios-row { display: flex; gap: 15px; margin-bottom: 10px; height: 20px; }
        .cas-studio-item img { height: 100%; opacity: 0.8; }
        </style>`; 
        $('body').append(styles); 
    } 

    function cleanup() { 
        if (window.casBgInterval) { clearInterval(window.casBgInterval); window.casBgInterval = null; } 
    } 

    function startSlideshow(render, backdrops) { 
        cleanup();
        if (!backdrops || backdrops.length < 2) return;
        let idx = 0; 
        window.casBgInterval = setInterval(() => { 
            const bg = render.find('.full-start__background img, img.full-start__background'); 
            if (!bg.length) return cleanup(); 
            idx = (idx + 1) % Math.min(backdrops.length, 12); 
            const nextSrc = Lampa.TMDB.image('/t/p/original' + backdrops[idx].file_path); 
            bg.css('transition', 'opacity 0.8s ease').css('opacity', '0'); 
            setTimeout(() => { bg.attr('src', nextSrc); bg.css('opacity', '1'); }, 800); 
        }, 15000); 
    } 

    async function processImages(render, data, res) { 
        const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0]; 
        if (bestLogo) { 
            const quality = Lampa.Storage.get('cas_logo_quality') || 'original'; 
            const logoSrc = Lampa.TMDB.image('/t/p/' + quality + bestLogo.file_path); 
            await preloadImage(logoSrc); 
            render.find('.cas-logo').html(`<img src="${logoSrc}">`); 
        } else { 
            render.find('.cas-logo').html(`<div style="font-size: 3.5em; font-weight: 900;">${data.title || data.name}</div>`); 
        } 
        if (Lampa.Storage.get('cas_slideshow_enabled')) startSlideshow(render, res.backdrops); 
    } 

    function loadMovieData(render, data) { 
        if (Lampa.Storage.get('cas_show_description')) render.find('.cas-description').text(data.overview || ''); 
        if (Lampa.Storage.get('cas_show_rating')) { 
            const tmdbV = parseFloat(data.vote_average || 0).toFixed(1); 
            if (tmdbV > 0) render.find('.cas-rate-items').html(`<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>`); 
        } 
        const info = [formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0)), (data.genres || [])[0]?.name].filter(Boolean).join(' • ');
        render.find('.cas-meta-info').text(info); 

        if (Lampa.Storage.get('cas_show_studios')) { 
            const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3); 
            render.find('.cas-studios-row').html(studios.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join('')); 
        } 
    } 

    function attachLoader() { 
        Lampa.Listener.follow('full', (event) => { 
            if (event.type === 'complite') { 
                const data = event.data.movie; 
                const render = event.object.activity.render(); 
                const content = render.find('.left-title__content'); 
                event.object.activity.onBeforeDestroy = cleanup; 

                if (data && data.id) { 
                    const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key()); 
                    $.getJSON(imagesUrl, (res) => processImages(render, data, res)); 
                    loadMovieData(render, data); 

                    // Cub Ratings
                    if (event.data.reactions?.result) { 
                        let sum = 0, cnt = 0; 
                        const coef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 }; 
                        event.data.reactions.result.forEach(r => { if (r.counter) { sum += (r.counter * coef[r.type]); cnt += r.counter; } }); 
                        if (cnt >= 1) { 
                            const cubV = (((data.name?7.4:6.5)*(data.name?50:150)+sum)/((data.name?50:150)+cnt)).toFixed(1); 
                            render.find('.cas-rate-items').append(`<div class="cas-rate-item"><img src="${ICONS.cub}"> <span style="color:${getRatingColor(cubV)}">${cubV}</span></div>`); 
                        } 
                    } 
                } 
                
                setTimeout(() => content.addClass('cas-animated'), 100); 

                // FIX: Використовуємо [0] для отримання DOM елемента замість jQuery об'єкта
                setTimeout(() => { 
                    const firstBtn = render.find('.full-start-new__buttons .selector').first(); 
                    if (firstBtn.length && Lampa.Controller) { 
                        Lampa.Controller.focus(firstBtn[0]); 
                    } 
                }, 400); 
            } 
        }); 
    } 

    if (window.appready) initializePlugin(); 
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); }); 
})();
