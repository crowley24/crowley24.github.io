(function () {
    'use strict';

    const CACHE_LIFETIME = 1000 * 60 * 60 * 24; // 24 hours
    const QUALITY_ICONS = {
        '4K': 'https://lampa.app/img/4k.svg',
        'FULL HD': 'https://lampa.app/img/1080.svg',
        'HDR': 'https://lampa.app/img/hdr.svg',
        'Dolby Vision': 'https://lampa.app/img/dv.svg',
        'UKR': 'https://lampa.app/img/ukr.svg',
        'DUB': 'https://lampa.app/img/dub.svg'
    };

    const ICONS = {
        tmdb: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#01b4e4"/><path d="M13.5 8h-3v8h3V8zm-1.5 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" fill="#01b4e4"/></svg>',
        cub: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#ff4500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    let currentInterval = null;

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function getRatingColor(rating) {
        const num = parseFloat(rating);
        if (isNaN(num) || num === 0) return '#a5a5a5';
        if (num >= 7.8) return '#22c55e';
        if (num >= 6.0) return '#eab308';
        return '#ef4444';
    }

    function formatTime(minutes) {
        if (!minutes || minutes <= 0) return '';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h === 0) return `${m} хв`;
        if (m === 0) return `${h} год`;
        return `${h} год ${m} хв`;
    }

    function preloadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
        });
    }

    function initializePlugin() {
        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'cas_logo_quality',
                type: 'select',
                values: {
                    'w300': 'w300',
                    'w500': 'w500',
                    'original': 'Original'
                },
                default: 'original'
            },
            field: {
                name: 'Якість логотипу',
                description: 'Оберіть якість для завантаження логотипу'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'cas_slideshow_enabled',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Слайдшоу фонів',
                description: 'Автоматична зміна фонових зображень у картці'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'cas_show_studios',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Логотипи студій',
                description: 'Відображати логотипи кіностудій або мереж'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'cas_show_quality',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Плашки якості',
                description: 'Відображати знайдену якість, озвучку та роздільність'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'cas_show_tagline',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Слоган',
                description: 'Відображати слоган фільму'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: 'cas_show_description',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Опис фільму',
                description: 'Відображати короткий опис у картці'
            }
        });

        injectStylesAndTemplates();
        attachLoader();
    }

    function injectStylesAndTemplates() {
        Lampa.Template.add('full_start_new', `
            <div class="full-start-new left-title">
                <div class="full-start__background">
                    <img src="" class="full-start__bg" />
                </div>
                <div class="full-start-new__body">
                    <div class="left-title__content">
                        <div class="cas-logo cas-wave-logo"></div>
                        <div class="cas-tagline cas-wave-tagline" style="display:none; font-style: italic; opacity: 0.8; margin-bottom: 6px; font-size: calc(var(--cas-meta-size) * 0.95); max-width: 650px;"></div>
                        <div class="cas-ratings-line cas-wave-ratings">
                            <div class="cas-bottom-ratings" style="display:flex; gap:15px; align-items:center;"></div>
                        </div>
                        <div class="cas-meta-info cas-wave-meta"></div>
                        <div class="cas-description cas-wave-desc"></div>
                        <div class="cas-studios-row"></div>
                        <div class="cas-quality-row"></div>
                        <div class="full-start-new__buttons cas-wave-buttons"></div>
                    </div>
                </div>
            </div>
        `);

        const styles = `<style>
        :root {
            --cas-meta-size: 14px;
        }
        
        @media screen and (min-width: 1280px) { :root { --cas-meta-size: 15px; } }
        @media screen and (min-width: 1920px) { :root { --cas-meta-size: 17px; } }
        @media screen and (min-width: 2560px) { :root { --cas-meta-size: 21px; } }
        @media screen and (min-width: 3840px) { :root { --cas-meta-size: 28px; } }

        .left-title__content {
            position: absolute;
            left: 4em;
            bottom: 3.5em;
            max-width: 60%;
            z-index: 10;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
        }
            
        .cas-logo {
            margin-bottom: 8px;
            max-width: 380px;
            display: flex;
            justify-content: flex-start;
        }
            
        .cas-logo img {
            max-height: 110px;
            width: auto;
            object-fit: contain;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.7));
        }

        .cas-wave-logo, .cas-wave-tagline, .cas-wave-ratings, .cas-wave-meta, .cas-wave-desc, .cas-wave-studio, .cas-wave-buttons, .cas-wave-year, .cas-wave-country, .cas-wave-time, .cas-wave-genre, .cas-wave-quality, .cas-wave-hdr, .cas-wave-ukr {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .cas-animated .cas-wave-logo { opacity: 1; transform: translateY(0); transition-delay: 0.05s; }
        .cas-animated .cas-wave-tagline { opacity: 0.8; transform: translateY(0); transition-delay: 0.1s; }
        .cas-animated .cas-wave-ratings { opacity: 1; transform: translateY(0); transition-delay: 0.15s; }
        .cas-animated .cas-wave-meta { opacity: 1; transform: translateY(0); transition-delay: 0.2s; }
        .cas-animated .cas-wave-year { opacity: 1; transform: translateY(0); transition-delay: 0.22s; }
        .cas-animated .cas-wave-country { opacity: 1; transform: translateY(0); transition-delay: 0.24s; }
        .cas-animated .cas-wave-time { opacity: 1; transform: translateY(0); transition-delay: 0.26s; }
        .cas-animated .cas-wave-genre { opacity: 1; transform: translateY(0); transition-delay: 0.28s; }
        .cas-animated .cas-wave-desc { opacity: 1; transform: translateY(0); transition-delay: 0.3s; }
        .cas-animated .cas-wave-studio { opacity: 1; transform: translateY(0); transition-delay: 0.35s; }
        
        .cas-animated .cas-wave-buttons { opacity: 1; transform: translateY(0); transition-delay: 0.4s; }

        .cas-quality-row {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease 0.45s, transform 0.5s ease 0.45s;
        }

        .cas-animated .cas-quality-row.show-quality {
            opacity: 1;
            transform: translateY(0);
        }

        .cas-animated .cas-wave-quality { opacity: 1; transform: translateY(0); transition-delay: 0.5s; }
        .cas-animated .cas-wave-hdr { opacity: 1; transform: translateY(0); transition-delay: 0.55s; }
        .cas-animated .cas-wave-ukr { opacity: 1; transform: translateY(0); transition-delay: 0.6s; }

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
        if (!backdrops || backdrops.length <= 1) return;

        var lang_backdrops = [];
        var no_lang_backdrops = [];
        var other_backdrops = [];

        backdrops.forEach(function (b) {
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

        var idx = 0;
        var intervalTime = 15000;

        currentInterval = setInterval(function () {
            idx = (idx + 1) % final_backdrops.length;
            var nextSrc = Lampa.TMDB.image('/t/p/original' + final_backdrops[idx].file_path);

            var $currentBg = render.find('.full-start__background img, img.full-start__background').last();
            if (!$currentBg.length) return;

            var img = new Image();
            img.onload = function () {
                var $newBg = $currentBg.clone();$newBg.attr('src', nextSrc);
                $newBg.css({                     opacity: 0,                     transition: 'opacity 1.5s ease-in-out',                     transform: 'translateZ(0)'                 });$currentBg.after($newBg);$newBg[0].offsetHeight; // force reflow

                $newBg.css('opacity', 1);$currentBg.css({ transition: 'opacity 1.5s ease-in-out', opacity: 0 });

                setTimeout(function () {
                    $currentBg.remove();
                }, 1550);
            };
            img.onerror = function () {};
            img.src = nextSrc;
        }, intervalTime);

        window.casBgInterval = currentInterval;
    }

    function renderStudioLogosWithColorAnalysis(container, data) {
        container.empty();
        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 1);

        studios.forEach((studio) => {
            const logoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);
            const id = 'cas_studio_' + Math.random().toString(36).substr(2, 9);

            container.append(`<div class="cas-studio-item cas-wave-studio" id="${id}"><img src="${logoUrl}"></div>`);

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
            let bestLogo = res.logos ? (res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0]) : null;

            if (bestLogo) {
                const quality = Lampa.Storage.get('cas_logo_quality') || 'original';
                const logoSrc = Lampa.TMDB.image('/t/p/' + quality + bestLogo.file_path);
                await preloadImage(logoSrc);
                render.find('.cas-logo').html(`<img src="${logoSrc}">`);
            } else {
                render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);
            }
            stopSlideshow();
            if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops && res.backdrops.length > 1) {
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
                    const isTv = data.name ? true : false;
                    const cubV = (((isTv?7.4:6.5)*(isTv?50:150)+sum)/((isTv?50:150)+cnt)).toFixed(1);
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
                        if (b.res) qH += `<div class="cas-quality-item cas-wave-quality"><img src="${QUALITY_ICONS[b.res]}"></div>`;
                        if (b.dv) qH += `<div class="cas-quality-item cas-wave-hdr"><img src="${QUALITY_ICONS['Dolby Vision']}"></div>`;
                        else if (b.hdr) qH += `<div class="cas-quality-item cas-wave-hdr"><img src="${QUALITY_ICONS['HDR']}"></div>`;
                        if (b.audio) qH += `<div class="cas-quality-item cas-wave-quality cas-audio-item">${b.audio}</div>`;
                        if (b.dub) qH += `<div class="cas-quality-item cas-wave-quality"><img src="${QUALITY_ICONS['DUB']}"></div>`;
                        if (b.ukr) qH += `<div class="cas-quality-item cas-wave-ukr"><img src="${QUALITY_ICONS['UKR']}"></div>`;

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
                        } catch (e) {
                        } finally {
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

                    debouncedLoadMovieData(render, data);
                }
            }
        });
    }

    if (window.appready) {
        initializePlugin();
    } else {
        Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready') initializePlugin();
        });
    }
})();
