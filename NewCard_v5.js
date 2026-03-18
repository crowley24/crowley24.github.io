(function() {  
    'use strict';  
    const PLUGIN_NAME = 'NewCard';  
    const PLUGIN_ID = 'new_card_style';  
    const ASSETS_PATH = 'https://crowley38.github.io/Icons/';  
    const CACHE_LIFETIME = 86400000;  
    let currentInterval = null;  
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
        return function() {  
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
        const params = [{  
            name: 'cas_logo_quality',  
            type: 'select',  
            values: {  
                'w300': '300px',  
                'w500': '500px',  
                'original': 'Original'  
            }  
        }, {  
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
        }, {  
            name: 'cas_meta_size',  
            type: 'select',  
            values: {  
                '1.1': 'Міні',  
                '1.2': 'Малий',  
                '1.3': 'Стандартний',  
                '1.4': 'Збільшений',  
                '1.5': 'Великий'  
            }  
        }, {  
            name: 'cas_blocks_gap',  
            type: 'select',  
            values: {  
                '10': 'Компактний',  
                '20': 'Стандартний',  
                '30': 'Просторий',  
                '40': 'Панорамний'  
            }  
        }, {  
            name: 'cas_bg_animation',  
            type: 'trigger',  
            default: true  
        }, {  
            name: 'cas_slideshow_enabled',  
            type: 'trigger',  
            default: true  
        }, {  
            name: 'cas_show_studios',  
            type: 'trigger',  
            default: true  
        }, {  
            name: 'cas_show_quality',  
            type: 'trigger',  
            default: true  
        }, {  
            name: 'cas_show_rating',  
            type: 'trigger',  
            default: true  
        }, {  
            name: 'cas_show_description',  
            type: 'trigger',  
            default: true  
        }];  
        params.forEach(param => {  
            Lampa.SettingsApi.addParam({  
                component: PLUGIN_ID,  
                param: param,  
                field: {  
                    name: TRANSLATIONS['settings_' + param.name]  
                },  
                onChange: applySettings  
            });  
        });  
    }  
    function applySettings() {  
        const root = document.documentElement;  
        root.style.setProperty('--cas-logo-scale', Lampa.Storage.get('cas_logo_scale', '100') / 100);  
        root.style.setProperty('--cas-blocks-gap', Lampa.Storage.get('cas_blocks_gap', '20') + 'px');  
        root.style.setProperty('--cas-meta-size', Lampa.Storage.get('cas_meta_size', '1.3') + 'em');  
        const currentCard = $('.full-start-new.left-title');  
        if (currentCard.length > 0) {  
            currentCard.find('.cas-description').toggle(!!Lampa.Storage.get('cas_show_description'));  
            currentCard.find('.cas-studios-row').toggle(!!Lampa.Storage.get('cas_show_studios'));  
            currentCard.find('.cas-quality-row').toggle(!!Lampa.Storage.get('cas_show_quality'));  
            currentCard.find('.cas-rate-items').toggle(!!Lampa.Storage.get('cas_show_rating'));  
            const hasVisibleElements = currentCard.find('.cas-studios-row:visible, .cas-rate-items:visible, .cas-quality-row:visible, .cas-description:visible').length > 0;  
            const buttons = currentCard.find('.full-start-new__buttons');  
            if (!hasVisibleElements) {  
                buttons.css('margin-top', '0.2em');  
                currentCard.find('.cas-ratings-line').css('margin-bottom', '0');  
            } else {  
                buttons.css('margin-top', '');  
                currentCard.find('.cas-ratings-line').css('margin-bottom', '');  
            }  
            stopSlideshow();  
            if (Lampa.Storage.get('cas_slideshow_enabled')) {  
                const bg = currentCard.find('.full-start__background img, img.full-start__background');  
                if (bg.length && bg.attr('src')) {  
                    const movieData = currentCard.data('movie');  
                    if (movieData && movieData.id) {  
                        const cacheId = 'tmdb_' + movieData.id;  
                        const cached = getCachedData(cacheId);  
                        if (cached && cached.backdrops?.length > 1) {  
                            startSlideshow(currentCard, cached.backdrops);  
                        }  
                    }  
                }  
            }  
        }  
        if (Lampa.Storage.get('cas_bg_animation')) {  
            $('body').addClass('cas--zoom-enabled');  
        } else {  
            $('body').removeClass('cas--zoom-enabled');  
        }  
    }  
    function getCachedData(id) {  
        const cache = Lampa.Storage.get('cas_images_cache') || {};  
        const item = cache[id];  
        if (item && (Date.now() - item.time < CACHE_LIFETIME)) return item.data;  
        return null;  
    }  
    function setCachedData(id, data) {  
        const cache = Lampa.Storage.get('cas_images_cache') || {};  
        cache[id] = {  
            time: Date.now(),  
            data: data  
        };  
        const keys = Object.keys(cache);  
        if (keys.length > 100) delete cache[keys[0]];  
        Lampa.Storage.set('cas_images_cache', cache);  
    }  
    function cleanup() {  
        stopSlideshow();  
        $('.left-title__content').removeClass('cas-animated');  
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
    function startSlideshow(render, backdrops) {  
        stopSlideshow();  
        console.log('Starting slideshow with backdrops:', backdrops.length);  
        if (!backdrops || backdrops.length <= 1) {  
            console.log('Not enough backdrops for slideshow');  
            return;  
        }  
        const bg = render.find('.full-start__background img, img.full-start__background');  
        if (!bg.length) {  
            console.log('Background element not found');  
            return;  
        }  
        let currentIndex = 0;  
        const slideshowTime = parseInt(Lampa.Storage.get('cas_slideshow_time', '10000'));  
        function changeBackground() {  
            currentIndex = (currentIndex + 1) % backdrops.length;  
            const newBackdrop = backdrops[currentIndex];  
            const imageUrl = Lampa.TMDB.image(newBackdrop.file_path, 'original');  
            console.log('Changing background to:', imageUrl);  
            bg.css('opacity', '0');  
            setTimeout(() => {  
                bg.attr('src', imageUrl);  
                bg.css('opacity', '1');  
            }, 800);  
        }  
        window.casBgInterval = setInterval(changeBackground, slideshowTime);  
    }  
    function renderStudioLogosWithColorAnalysis(container, data) {  
        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 4);  
        studios.forEach((studio, index) => {  
            const logoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);  
            const id = 'cas_studio_' + Math.random().toString(36).substr(2, 9);  
            container.append(`<div class="cas-studio-item" id="${id}"><img src="${logoUrl}"></div>`);  
            const img = new Image();  
            img.crossOrigin = 'anonymous';  
            img.onload = function() {  
                const canvas = document.createElement('canvas');  
                const ctx = canvas.getContext('2d');  
                canvas.width = this.width;  
                canvas.height = this.height;  
                ctx.drawImage(this, 0, 0);  
                try {  
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;  
                    let r = 0,  
                        g = 0,  
                        b = 0,  
                        count = 0;  
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
                            $('#' + id + ' img').css('filter', 'brightness(0) invert(1)');  
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
        const logos = res.logos || [];  
        const quality = Lampa.Storage.get('cas_logo_quality', 'original');  
        const filteredLogos = logos.filter(logo => logo.iso_639_1 === 'uk' || logo.iso_639_1 === null);  
        const sortedLogos = filteredLogos.sort((a, b) => {  
            if (a.iso_639_1 === 'uk' && b.iso_639_1 !== 'uk') return -1;  
            if (a.iso_639_1 !== 'uk' && b.iso_639_1 === 'uk') return 1;  
            return 0;  
        });  
        if (sortedLogos.length > 0) {  
            const logo = sortedLogos[0];  
            const logoUrl = Lampa.TMDB.image(logo.file_path, quality);  
            try {  
                const img = await preloadImage(logoUrl);  
                render.find('.cas-logo').html(`<img src="${logoUrl}" style="max-width: 100%; height: auto;">`);  
            } catch (error) {  
                render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
            }  
        } else {  
            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
        }  
    }  
    async function loadMovieDataOptimized(render, data) {  
        const tasks = [];  
        tasks.push(Promise.resolve().then(() => {  
            const tmdbV = data.vote_average || data.vote;  
            const tmdb = tmdbV > 0 ? `<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>` : '';  
            if (data.reactions && data.reactions.result) {  
                let sum = 0,  
                    cnt = 0;  
                const coef = {  
                    fire: 10,  
                    nice: 7.5,  
                    think: 5,  
                    bore: 2.5,  
                    shit: 0  
                };  
                data.reactions.result.forEach(r => {  
                    if (r.counter) {  
                        sum += (r.counter * coef[r.type]);  
                        cnt += r.counter;  
                    }  
                });  
                if (cnt >= 1) {  
                    const isTv = data.name ? true : false;  
                    const cubV = (((isTv ? 7.4 : 6.5) * (isTv ? 50 : 150) + sum) / ((isTv ? 50 : 150) + cnt)).toFixed(1);  
                    tmdb += `<div class="cas-rate-item"><img src="${ICONS.cub}"> <span style="color:${getRatingColor(cubV)}">${cubV}</span></div>`;  
                }  
            }  
            render.find('.cas-rate-items').html(tmdb);  
        }));  
        tasks.push(Promise.resolve().then(() => {  
            const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));  
            const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');  
            render.find('.cas-meta-info').text((time ? time + (genre ? ' • ' : '') : '') + genre);  
        }));  
        if (Lampa.Storage.get('cas_show_studios')) {  
            tasks.push(Promise.resolve().then(() => {  
                renderStudioLogosWithColorAnalysis(render.find('.cas-studios-row'), data);  
            }));  
        }  
        await Promise.all(tasks);  
        if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser.get) {  
            Lampa.Parser.get({  
                search: data.title || data.name,  
                movie: data,  
                page: 1  
            }, (res) => {  
                try {  
                    const items = res.Results || res;  
                    if (items && Array.isArray(items) && items.length > 0) {  
                        const b = {  
                            res: '',  
                            hdr: false,  
                            dv: false,  
                            ukr: false  
                        };  
                        items.slice(0, 8).forEach(i => {  
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
                        if (qH) {  
                            render.find('.cas-quality-row').html('<span class="cas-sep" style="margin: 0 5px;">•</span>' + qH).show();  
                        }  
                    }  
                } catch (error) {  
                    render.find('.cas-quality-row').hide();  
                }  
            }).fail(() => {  
                render.find('.cas-quality-row').hide();  
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
                const content = render.find('.left-title__content');  
                content.removeClass('cas-animated');  
                event.object.activity.onBeforeDestroy = cleanup;  
                if (data && data.id) {  
                    render.data('movie', data);  
                    const cacheId = 'tmdb_' + data.id;  
                    const cached = getCachedData(cacheId);  
                    const processImagesWrapper = async (res) => {  
                        try { await processImages(render, data, res); } catch (e) {}  
                    };  
                    if (cached) processImagesWrapper(cached);  
                    else {  
                        const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());  
                        $.getJSON(imagesUrl, (res) => {  
                            setCachedData(cacheId, res);  
                            processImagesWrapper(res);  
                        }).fail(() => {  
                            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
                        });  
                    }  
                    if (event.data.reactions) data.reactions = event.data.reactions;  
                    debouncedLoadMovieData(render, data);  
                }  
                setTimeout(() => content.addClass('cas-animated'), 100);  
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
