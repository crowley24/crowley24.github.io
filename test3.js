(function () {
    'use strict';

    const CACHE_LIFETIME = 1000 * 60 * 60 * 24; // 24 hours
    let currentInterval = null;
    let currentRaf = null;

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    const ICONS = window.ICONS || {
        tmdb: 'https://empty',
        cub: 'https://empty'
    };
    const QUALITY_ICONS = window.QUALITY_ICONS || {
        '4K': '',
        'FULL HD': '',
        'Dolby Vision': '',
        'HDR': '',
        'DUB': '',
        'UKR': ''
    };

    function getRatingColor(rating) {
        if (typeof window.getRatingColor === 'function') return window.getRatingColor(rating);
        const r = parseFloat(rating);
        if (r >= 7.5) return '#4caf50';
        if (r >= 6.0) return '#ff9800';
        return '#f44336';
    }

    function formatTime(minutes) {
        if (typeof window.formatTime === 'function') return window.formatTime(minutes);
        if (!minutes) return '';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}г ${m}хв` : `${m}хв`;
    }

    function preloadImage(src) {
        if (typeof window.preloadImage === 'function') return window.preloadImage(src);
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = src;
        });
    }

    function initializePlugin() {
        const styles = `<style>
        .cas-quality-row {  
            margin-top: 0 !important;  
            display: flex;  
            align-items: center;  
            justify-content: flex-start !important;
            gap: 6px;  
        }  

        .full-start-new__buttons {
            display: flex !important;
            justify-content: flex-start !important;
            align-items: center !important;
            flex-wrap: wrap;
            width: 100%;
            margin-left: 0 !important;
            margin-top: 0px !important;
        }
        
        .cas-sep {  
            margin: 0 2px !important;  
        }  
                            
        .cas-studios-row {  
            display: flex;  
            flex-wrap: wrap;  
            justify-content: flex-start !important;
            gap: 8px;  
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
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));    
            opacity: 0.95;    
        }    

        .cas-description { font-size: var(--cas-meta-size) !important; line-height: 1.35; color: rgba(255,255,255,0.7); display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; max-width: 650px; margin-top: 4px; margin-bottom: 8px; text-align: left !important; }    
        .cas-quality-item img { height: 12px; }    
        .cas-ratings-line { display: flex; align-items: center; gap: 15px; margin-bottom: 4px; font-size: var(--cas-meta-size); font-weight: 600; height: 30px; }    
        .cas-rate-item { display: flex; align-items: center; gap: 6px; }    
        .cas-rate-item img { height: 1.1em; }    
        .left-title .full-start-new__body { height: 85vh; }    
        .cas-meta-info { display: flex; align-items: center; gap: 8px; font-weight: 400; }    
                              
        .cas-audio-item {    
            background: rgba(255, 255, 255, 0.2);    
            padding: 2px 6px;    
            border-radius: 4px;    
            font-size: 0.8em;    
            font-weight: 600;    
            color: white;    
        }    
        </style>`;    
        
        Lampa.Template.add('left_title_css', styles);    
        $('body').append(Lampa.Template.get('left_title_css', {}, true));    
        attachLoader();
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
        const keys = Object.keys(cache);          
        if (keys.length > 100) delete cache[keys[0]];          
        Lampa.Storage.set('cas_images_cache', cache);                
    }                
                
    function cleanup() {                
        stopSlideshow();                
        if (currentRaf) {
            cancelAnimationFrame(currentRaf);
            currentRaf = null;
        }
        $('.left-title__content').parent().parent().removeClass('cas-animated');          
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
        if (!Array.isArray(backdrops) || backdrops.length <= 1) return;  
    
        var lang_backdrops = [];  
        var no_lang_backdrops = [];  
        var other_backdrops = [];  
    
        backdrops.forEach(function (b) {  
            if (!b) return;
            var lang = b.iso_639_1;  
            if (lang === currentLang) lang_backdrops.push(b);  
            else if (!lang || lang === 'xx' || lang === 'null') no_lang_backdrops.push(b);  
            else other_backdrops.push(b);  
        });  
    
        var final_backdrops = [].concat(no_lang_backdrops);  
        if (final_backdrops.length < 3 && lang_backdrops.length > 0) {  
            final_backdrops = final_backdrops.concat(lang_backdrops);  
        }  
        if (final_backdrops.length < 3 && other_backdrops.length > 0) {  
            other_backdrops.sort(function (a, b) {  
                return (b.vote_average || 0) - (a.vote_average || 0);  
            });  
            final_backdrops = final_backdrops.concat(other_backdrops);  
        }  
        final_backdrops = final_backdrops.slice(0, 15);  
    
        if (final_backdrops.length <= 1) return;  
    
        var $currentBg = render.find('.full-start__background img, img.full-start__background').last();  
        if (!$currentBg.length) return;  
    
        $currentBg.css({
            'will-change': 'opacity',
            'transform': 'translateZ(0)',
            'transition': 'opacity 1.2s ease-in-out'
        });

        var idx = 0;  
        var intervalTime = 15000;  
    
        currentInterval = setInterval(function () {  
            idx = (idx + 1) % final_backdrops.length;  
            if (!final_backdrops[idx] || !final_backdrops[idx].file_path) return;

            var nextSrc = Lampa.TMDB.image('/t/p/w1280' + final_backdrops[idx].file_path);  
    
            var img = new Image();  
            img.onload = function () {  
                var $activeBg = render.find('.full-start__background img, img.full-start__background').last();
                if (!$activeBg.length) return;

                var $newBg =$activeBg.clone(); 
                $newBg.attr('src', nextSrc);$newBg.css({
                    'opacity': 0,
                    'will-change': 'opacity',
                    'transform': 'translateZ(0)',
                    'transition': 'opacity 1.2s ease-in-out'
                });

                $activeBg.after($newBg);  
                
                requestAnimationFrame(function() {
                    $newBg.css('opacity', 1);$activeBg.css('opacity', 0);

                    setTimeout(function () {  
                        $activeBg.remove();  
                    }, 1250);  
                });
            };  
            img.src = nextSrc;  
        }, intervalTime);  
    
        window.casBgInterval = currentInterval;  
    }                
                
    function renderStudioLogosWithColorAnalysis(container, data) {    
        container.empty();
        const studios = (data.networks || data.production_companies || []).filter(s => s && s.logo_path).slice(0, 1);  
            
        studios.forEach((studio) => {    
            const logoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);    
            const id = 'cas_studio_' + Math.random().toString(36).substr(2, 9);    
                
            container.append(`<div class="cas-studio-item cas-wave-studio" id="${id}"><img src="${logoUrl}"></div>`);    
                
            const img = new Image();    
            img.crossOrigin = 'anonymous';    
            img.onload = function() {    
                const canvas = document.createElement('canvas');    
                const ctx = canvas.getContext('2d');    
                canvas.width = 32;    
                canvas.height = 32;    
                ctx.drawImage(this, 0, 0, 32, 32);    
                    
                try {    
                    const imageData = ctx.getImageData(0, 0, 32, 32).data;    
                    let r = 0, g = 0, b = 0, count = 0;    
                        
                    for (let i = 0; i < imageData.length; i += 4) {    
                        if (imageData[i + 3] > 50) {    
                            r += imageData[i];    
                            g += imageData[i + 1];    
                            b += imageData[i + 2];    
                            count++;    
                        }    
                    }    
                        
                    if (count > 0) {    
                        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / count;    
                        if (brightness < 40) {    
                            $('#' + id + ' img').css('filter', 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.8))');    
                        }    
                    }    
                } catch (e) {    
                    console.log('Error analyzing logo color:', e);    
                }    
            };    
            img.src = logoUrl;    
        });    
    }    
                
    async function processImages(render, data, res) {  
        try {  
            let logos = (res && Array.isArray(res.logos)) ? res.logos : [];
            let bestLogo = logos.find(l => l.iso_639_1 === 'uk') || logos.find(l => l.iso_639_1 === 'en') || logos[0];  
    
            if (bestLogo) {  
                const quality = Lampa.Storage.get('cas_logo_quality') || 'original';  
                const logoSrc = Lampa.TMDB.image('/t/p/' + quality + bestLogo.file_path);  
                await preloadImage(logoSrc);  
                render.find('.cas-logo').html(`<img src="${logoSrc}">`);  
            } else {  
                render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
            }  
            stopSlideshow();  
            if (Lampa.Storage.get('cas_slideshow_enabled') && res && Array.isArray(res.backdrops) && res.backdrops.length > 1) {  
                var current_lang = Lampa.Storage.get('tmdb_lang') || 'uk';  
                startSlideshow(render, res.backdrops, current_lang);  
            }  
        } catch (error) {  
            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
        }  
    }    
                
    async function loadMovieDataOptimized(render, data) {    
        const tasks = [];    
            
        if (data.tagline && Lampa.Storage.get('cas_show_tagline')) {
            render.find('.cas-tagline').text(`«${data.tagline}»`).show();
        } else {
            render.find('.cas-tagline').hide();
        }

        if (Lampa.Storage.get('cas_show_description')) {    
            tasks.push(Promise.resolve().then(() => {    
                render.find('.cas-description').html(data.overview || '').css('opacity','1').show();    
            }));    
        }    
            
        tasks.push(Promise.resolve().then(() => {    
            const year = data.release_date ? new Date(data.release_date).getFullYear() : (data.first_air_date ? new Date(data.first_air_date).getFullYear() : '');    
            const country = (data.production_countries && data.production_countries.length > 0) ? data.production_countries[0].name : '';
            const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));    
            const genres = (data.genres || []).map(g => g.name).join(', ');    
                
            let ratings = '';    
            const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);    
            if (tmdbV > 0) {    
                ratings += `<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>`;    
            }    
                
            if (data.reactions && data.reactions.result) {    
                let sum = 0, cnt = 0;    
                const coef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };    
                data.reactions.result.forEach(r => {            
                    if (r.counter) { sum += (r.counter * coef[r.type]); cnt += r.counter; }          
                });    
                if (cnt >= 1) {    
                    const isTv = !!data.name;    
                    const cubV = (((isTv ? 7.4 : 6.5) * (isTv ? 50 : 150) + sum) / ((isTv ? 50 : 150) + cnt)).toFixed(1);    
                    ratings += `<div class="cas-rate-item"><img src="${ICONS.cub}"> <span style="color:${getRatingColor(cubV)}">${cubV}</span></div>`;    
                }    
            }    
                
            let metaParts = [];
            if (year) metaParts.push(`<span class="cas-wave-year">${year}</span>`);
            if (country) metaParts.push(`<span class="cas-wave-country">${country}</span>`);
            if (time) metaParts.push(`<span class="cas-wave-time">${time}</span>`);
            if (genres) metaParts.push(`<span class="cas-wave-genre">${genres}</span>`);
                
            render.find('.cas-meta-info').html(metaParts.join(' &bull; '));    
            render.find('.cas-bottom-ratings').html(ratings);
        }));    
            
        if (Lampa.Storage.get('cas_show_studios')) {    
            tasks.push(Promise.resolve().then(() => {    
                renderStudioLogosWithColorAnalysis(render.find('.cas-studios-row'), data);    
            }));    
        }    
            
        await Promise.all(tasks);    
            
        if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser && Lampa.Parser.get) {    
            let qualityElement = render.find('.cas-quality-row');
            let buttonsBlock = render.find('.full-start-new__buttons');

            qualityElement.hide();
            
            Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {    
                try {    
                    const items = res.Results || res;    
                    if (items && Array.isArray(items) && items.length > 0) {    
                        const b = { res: '', hdr: false, dv: false, ukr: false, audio: '', dub: false };    
                        items.slice(0, 8).forEach(i => {    
                            const t = (i.Title || i.title || '').toLowerCase();    
                            if (t.includes('4k') || t.includes('2160')) b.res = '4K';    
                            else if (!b.res && (t.includes('1080') || t.includes('fhd'))) b.res = 'FULL HD';    
                            if (t.includes('hdr')) b.hdr = true;    
                            if (t.includes('dv') || t.includes('dovi') || t.includes('vision')) b.dv = true;    
                            if (t.includes('ukr') || t.includes('укр')) b.ukr = true;    
                            if (t.includes('5.1') || t.includes('5 1')) b.audio = '5.1';    
                            else if (t.includes('7.1') || t.includes('7 1')) b.audio = '7.1';    
                            else if (t.includes('4.0') || t.includes('4 0')) b.audio = '4.0';    
                            else if (t.includes('2.0') || t.includes('2 0')) b.audio = '2.0';    
                            if (t.includes('dub') || t.includes('дубл')) b.dub = true;    
                        });    
                            
                        let qH = '';    
                        if (b.res && QUALITY_ICONS[b.res]) qH += `<div class="cas-quality-item cas-wave-quality"><img src="${QUALITY_ICONS[b.res]}"></div>`;    
                        if (b.dv && QUALITY_ICONS['Dolby Vision']) qH += `<div class="cas-quality-item cas-wave-hdr"><img src="${QUALITY_ICONS['Dolby Vision']}"></div>`;    
                        else if (b.hdr && QUALITY_ICONS['HDR']) qH += `<div class="cas-quality-item cas-wave-hdr"><img src="${QUALITY_ICONS['HDR']}"></div>`;    
                        if (b.audio) qH += `<div class="cas-quality-item cas-wave-quality cas-audio-item">${b.audio}</div>`;    
                        if (b.dub && QUALITY_ICONS['DUB']) qH += `<div class="cas-quality-item cas-wave-quality"><img src="${QUALITY_ICONS['DUB']}"></div>`;    
                        if (b.ukr && QUALITY_ICONS['UKR']) qH += `<div class="cas-quality-item cas-wave-ukr"><img src="${QUALITY_ICONS['UKR']}"></div>`;    
                            
                        if (qH) {    
                            qualityElement.html(qH).show();    

                            if (buttonsBlock.length) {
                                buttonsBlock.off('transitionend.casQuality animationend.casQuality');
                                buttonsBlock.on('transitionend.casQuality animationend.casQuality', function handler(e) {
                                    if (e.target === this) {
                                        qualityElement.addClass('show-quality');
                                        buttonsBlock.off('transitionend.casQuality animationend.casQuality', handler);
                                    }
                                });
                            } else {
                                qualityElement.addClass('show-quality');
                            }
                        }    
                    }    
                } catch (error) {    
                    qualityElement.hide();    
                }    
            }).fail(() => {    
                qualityElement.hide();    
            });    
        } else {    
            render.find('.cas-quality-row').hide();    
        }    
    }             

    const debouncedLoadMovieData = debounce((render, data) => {                
        try { loadMovieDataOptimized(render, data); } catch (error) {}                
    }, 250);                
                
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
                            if (currentRaf) cancelAnimationFrame(currentRaf);
                            currentRaf = requestAnimationFrame(() => {
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
                            if (currentRaf) cancelAnimationFrame(currentRaf);
                            currentRaf = requestAnimationFrame(() => {
                                cardRoot.addClass('cas-animated');
                            });
                        });                
                    }                
                                    
                    if (event.data.reactions) data.reactions = event.data.reactions;          
                    debouncedLoadMovieData(render, data);                
                } else {
                    if (currentRaf) cancelAnimationFrame(currentRaf);
                    currentRaf = requestAnimationFrame(() => {
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
