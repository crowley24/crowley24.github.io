(function () {
    'use strict';

    const PLUGIN_NAME = 'NewCard';
    const PLUGIN_ICON = `<svg height="36" viewBox="0 0 38 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 2L21.91 11.45H31.36L23.73 17.29L26.64 26.74L19 20.91L11.36 26.74L14.27 17.29L6.64 11.45H16.09L19 2Z" fill="white"/></svg>`;
    const logoCache = new Map();

    // --- Утиліти ---
    const getLogoQuality = () => window.innerWidth > 1280 ? 'w500' : 'w300';
    
    const selectBestLogo = (logos, lang) => {
        if (!logos?.length) return null;
        return logos.find(l => l.iso_639_1 === lang) || logos.find(l => l.iso_639_1 === 'en') || logos[0];
    };

    const getMediaType = (data) => {
        return (data.number_of_seasons || data.first_air_date || data.name) 
            ? Lampa.Lang.translate('full_tv') 
            : Lampa.Lang.translate('full_movie');
    };

    // --- Обробка зображень (Аналіз яскравості) ---
    function processImageBrightness(imgElement, url) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                let totalBrightness = 0, darkPixels = 0, count = 0;

                for (let i = 0; i < imageData.length; i += 20) { // крок для швидкості
                    const r = imageData[i], g = imageData[i+1], b = imageData[i+2], a = imageData[i+3];
                    if (a > 50) {
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                        totalBrightness += brightness;
                        if (brightness < 30) darkPixels++;
                        count++;
                    }
                }

                const avg = totalBrightness / count;
                const darkRatio = darkPixels / count;

                if (avg < 25 && darkRatio > 0.7) {
                    imgElement.css({
                        'filter': 'brightness(0) invert(1) contrast(1.2)',
                        'opacity': '0.95'
                    }).removeAttr('data-original');
                }
            } catch (e) { console.error("Canvas error", e); }
        };
        img.src = url;
    }

    // --- Рендер інтерфейсу ---
    function injectStyles() {
        if ($('#applecation-styles').length) return;
        $('head').append(`<style id="applecation-styles">
            .applecation__container { margin-top: 10px; }
            .applecation__logo { opacity: 0; transition: all 0.6s ease; transform: translateY(20px); height: 8em; margin-bottom: 1.5em; display: flex; align-items: center; }
            .applecation__logo.loaded { opacity: 1; transform: translateY(0); }
            .applecation__logo img { max-height: 100%; width: auto; object-fit: contain; }
            .applecation__meta-text { font-size: 1.3em; color: rgba(255,255,255,0.8); }
            .applecation__info { font-size: 1.2em; font-weight: 500; margin-top: 5px; }
            .applecation__networks { display: flex; gap: 10px; margin-top: 10px; height: 25px; }
            .applecation__networks img { height: 100%; width: auto; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }
            .applecation__meta, .applecation__info, .applecation__description { opacity: 0; transform: translateY(15px); transition: all 0.5s ease; }
            .applecation__meta.show, .applecation__info.show, .applecation__description.show { opacity: 1; transform: translateY(0); }
            .applecation-animated { filter: brightness(0.5) !important; transition: filter 1.2s ease !important; }
        </style>`);
    }

    function loadNetworkIcons(render, data) {
        const networks = data.networks || data.production_companies || [];
        if (!networks.length) return;

        const container = $('<div class="applecation__networks"></div>');
        render.find('.applecation__container').append(container);

        networks.slice(0, 3).forEach(net => {
            if (net.logo_path) {
                const url = Lampa.TMDB.image(`/t/p/h30${net.logo_path}`);
                const img = $(`<img src="${url}" alt="${net.name}">`);
                container.append(img);
                processImageBrightness(img, url);
            }
        });
    }

    function fillAllInfo(render, data) {
        // Meta
        const metaParts = [getMediaType(data)];
        if (data.genres?.length) metaParts.push(...data.genres.slice(0, 2).map(g => Lampa.Utils.capitalizeFirstLetter(g.name)));
        render.find('.applecation__meta-text').text(metaParts.join(' · '));

        // Additional Info
        const infoParts = [];
        const release = data.release_date || data.first_air_date;
        if (release) infoParts.push(release.split('-')[0]);

        if (data.name) { // TV
            if (data.episode_run_time?.[0]) infoParts.push(`${data.episode_run_time[0]} ${Lampa.Lang.translate('time_m').replace('.','')}`);
            const seasons = Lampa.Utils.countSeasons(data);
            if (seasons) {
                const titles = ['сезон', 'сезони', 'сезонів'];
                const cases = [2, 0, 1, 1, 1, 2];
                const sText = titles[(seasons % 100 > 4 && seasons % 100 < 20) ? 2 : cases[Math.min(seasons % 10, 5)]];
                infoParts.push(`${seasons} ${sText}`);
            }
        } else if (data.runtime > 0) { // Movie
            const h = Math.floor(data.runtime / 60), m = data.runtime % 60;
            const tH = Lampa.Lang.translate('time_h').replace('.',''), tM = Lampa.Lang.translate('time_m').replace('.','');
            infoParts.push(h > 0 ? `${h} ${tH} ${m} ${tM}` : `${m} ${tM}`);
        }
        render.find('.applecation__info').text(infoParts.join(' · '));
        loadNetworkIcons(render, data);
    }

    function waitForBackground(activity, callback) {
        const bg = activity.render().find('.full-start__background');
        const done = () => { if (!bg.hasClass('applecation-animated')) { bg.addClass('applecation-animated'); callback(); } };
        
        if (!bg.length || bg.hasClass('loaded')) return (done());

        const observer = new MutationObserver(() => {
            if (bg.hasClass('loaded')) { observer.disconnect(); setTimeout(done, 100); }
        });
        observer.observe(bg[0], { attributes: true, attributeFilter: ['class'] });
        setTimeout(() => { observer.disconnect(); done(); }, 1500);
    }

    function applyLogo(imagesData, render, activity) {
        const logoContainer = render.find('.applecation__logo');
        const bestLogo = selectBestLogo(imagesData?.logos, 'uk');

        if (bestLogo) {
            const url = Lampa.TMDB.image(`/t/p/${getLogoQuality()}${bestLogo.file_path}`);
            $('<img />').attr('src', url).on('load', function() {
                logoContainer.html(this);
                waitForBackground(activity, () => logoContainer.addClass('loaded'));
            });
        } else {
            render.find('.full-start-new__title').fadeIn();
            waitForBackground(activity, () => logoContainer.addClass('loaded'));
        }
    }

    // --- Основна функція завантаження ---
    function loadFullCard(event) {
        const { movie: data } = event.data;
        const { activity } = event.object;
        if (!data || !activity) return;

        const render = activity.render();
        injectStyles();

        // Ініціалізація контейнерів, якщо їх немає
        if (!render.find('.applecation__container').length) {
            render.find('.full-start-new__details').prepend(`
                <div class="applecation__container">
                    <div class="applecation__logo"></div>
                    <div class="applecation__meta"><span class="applecation__meta-text"></span></div>
                    <div class="applecation__info"></div>
                </div>
            `);
            render.find('.full-start-new__title').hide();
        }

        fillAllInfo(render, data);

        waitForBackground(activity, () => {
            render.find('.applecation__meta, .applecation__info, .applecation__description').addClass('show');
        });

        const cacheKey = `${data.id}_${data.name ? 'tv' : 'movie'}`;
        if (logoCache.has(cacheKey)) return applyLogo(logoCache.get(cacheKey), render, activity);

        const url = `${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`;
        $.get(Lampa.TMDB.api(url), (json) => {
            logoCache.set(cacheKey, json);
            if (Lampa.Activity.active()?.component === 'full') applyLogo(json, render, activity);
        }).fail(() => applyLogo(null, render, activity));
    }

    // --- Старт ---
    function start() {
        const manifest = { type: 'other', version: '1.2.0', name: PLUGIN_NAME, icon: PLUGIN_ICON };
        if (Lampa.Manifest) {
            Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
            Array.isArray(Lampa.Manifest.plugins) ? Lampa.Manifest.plugins.push(manifest) : Lampa.Manifest.plugins.newcard = manifest;
        }

        let loadTimeout;
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                clearTimeout(loadTimeout);
                loadTimeout = setTimeout(() => loadFullCard(e), 150);
            }
        });
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') start(); });

})();
