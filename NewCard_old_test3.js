(function () {
    'use strict';

    const PLUGIN_NAME = 'NewCard';
    const PLUGIN_VERSION = '1.2.0';
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>';
    
    let logoCache = new Map();
    let loadTimeout;

    // --- Допоміжні утиліти ---
    const getStorage = (key, def) => Lampa.Storage.get(key, def);
    const setStorage = (key, val) => Lampa.Storage.set(key, val);

    function selectBestLogo(logos) {
        const sortLogos = (list) => list.sort((a, b) => b.vote_average - a.vote_average);
        return sortLogos(logos.filter(l => l.iso_639_1 === 'uk'))[0] || 
               sortLogos(logos.filter(l => l.iso_639_1 === 'en'))[0] || 
               sortLogos(logos)[0] || null;
    }

    // --- Основна логіка відображення ---
    function applyLogoData(imagesData, render, activity, data) {
        const logoContainer = render.find('.applecation__logo');
        const titleElement = render.find('.full-start-new__title');
        const bestLogo = selectBestLogo(imagesData.logos);

        if (bestLogo) {
            const quality = { 'w200': 'w300', 'w300': 'w500' }[Lampa.Storage.field('poster_size')] || 'w500';
            const logoUrl = Lampa.TMDB.image(`/t/p/${quality}${bestLogo.file_path}`);
            const img = new Image();
            img.onload = () => {
                logoContainer.html(`<img src="${logoUrl}" alt="" />`);
                waitForBackgroundLoad(activity, () => logoContainer.addClass('loaded'));
            };
            img.src = logoUrl;
        } else {
            titleElement.show();
            waitForBackgroundLoad(activity, () => logoContainer.addClass('loaded'));
        }
    }

    function loadLogo(event) {
        const data = event.data.movie;
        const activity = event.object.activity;
        if (!data || !activity) return;

        const render = activity.render();
        const cacheKey = `${data.id}_${data.name ? 'tv' : 'movie'}`;

        // Заповнення контенту
        fillRatings(render.find('.applecation__ratings'), data);
        fillMetaInfo(render, data);
        fillAdditionalInfo(render, data);

        waitForBackgroundLoad(activity, () => {
            render.find('.applecation__meta, .applecation__info, .applecation__ratings, .applecation__description').addClass('show');
        });

        if (logoCache.has(cacheKey)) {
            return applyLogoData(logoCache.get(cacheKey), render, activity, data);
        }

        const apiUrl = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);
        
        $.get(apiUrl, (json) => {
            logoCache.set(cacheKey, json);
            if (Lampa.Activity.active()?.component === 'full') {
                applyLogoData(json, render, activity, data);
            }
        }).fail(() => {
            render.find('.full-start-new__title').show();
            waitForBackgroundLoad(activity, () => render.find('.applecation__logo').addClass('loaded'));
        });
    }

    // --- Робота з даними ---
    function fillRatings(container, data) {
        const scores = {
            imdb: data.number_rating?.imdb || data.vote_average || 0,
            kp: data.number_rating?.kp || 0
        };
        Object.entries(scores).forEach(([type, val]) => {
            if (val > 0) {
                const block = container.find(`.rate--${type}`);
                block.removeClass('hide').find('div').text(parseFloat(val).toFixed(1));
            }
        });
    }

    function fillMetaInfo(render, data) {
        const meta = [data.name ? 'Серіал' : 'Фільм'];
        if (data.genres?.length) {
            meta.push(...data.genres.slice(0, 2).map(g => Lampa.Utils.capitalizeFirstLetter(g.name)));
        }
        render.find('.applecation__meta-text').text(meta.join(' · '));
        loadNetworkIcons(render, data);
    }

    function loadNetworkIcons(render, data) {
        const container = render.find('.applecation__network');
        if (!getStorage('applecation_show_studio', true)) return container.hide();

        const studios = [...(data.networks || []), ...(data.production_companies || [])]
            .filter(s => s.logo_path).slice(0, 2);

        if (!studios.length) return container.hide();

        container.empty().show();
        studios.forEach(s => {
            const url = Lampa.Api.img(s.logo_path, 'w200');
            const img = $(`<img src="${url}" alt="${s.name}">`);
            
            // Авто-інверсія темних логотипів
            const probe = new Image();
            probe.crossOrigin = "anonymous";
            probe.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = probe.width; canvas.height = probe.height;
                ctx.drawImage(probe, 0, 0);
                const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                let bright = 0, count = 0;
                for (let i = 0; i < pixels.length; i += 4) {
                    if (pixels[i+3] > 50) {
                        bright += (0.299 * pixels[i] + 0.587 * pixels[i+1] + 0.114 * pixels[i+2]);
                        count++;
                    }
                }
                if (count > 0 && (bright / count) < 30) img.css('filter', 'brightness(0) invert(1)');
            };
            probe.src = url;
            container.append(img);
        });
    }

    function fillAdditionalInfo(render, data) {
        const info = [];
        const date = data.release_date || data.first_air_date;
        if (date) info.push(date.split('-')[0]);

        if (data.name) {
            if (data.episode_run_time?.[0]) info.push(`${data.episode_run_time[0]} хв`);
            const s = Lampa.Utils.countSeasons(data);
            if (s) {
                const titles = ['сезон', 'сезони', 'сезонів'];
                const idx = (s % 100 > 4 && s % 100 < 20) ? 2 : [2, 0, 1, 1, 1, 2][Math.min(s % 10, 5)];
                info.push(`${s} ${titles[idx]}`);
            }
        } else if (data.runtime) {
            const h = Math.floor(data.runtime / 60), m = data.runtime % 60;
            info.push(h > 0 ? `${h} г ${m} хв` : `${m} хв`);
        }
        render.find('.applecation__info').text(info.join(' · '));
        render.find('.applecation__description').text(data.overview || '');
    }

    function waitForBackgroundLoad(activity, callback) {
        const bg = activity.render().find('.full-start__background');
        const complete = () => { bg.addClass('applecation-animated'); callback(); };
        if (!bg.length || bg.hasClass('loaded')) return setTimeout(complete, 100);

        const observer = new MutationObserver(() => {
            if (bg.hasClass('loaded')) {
                observer.disconnect();
                complete();
            }
        });
        observer.observe(bg[0], { attributes: true, attributeFilter: ['class'] });
        setTimeout(() => { observer.disconnect(); complete(); }, 2000);
    }

    // --- Налаштування та Стилі ---
    function applyScales() {
        const lS = getStorage('applecation_logo_scale', '100');
        const tS = getStorage('applecation_text_scale', '100');
        const sp = getStorage('applecation_spacing_scale', '100');
        
        $('#applecation_scales').remove();
        $('body').append(`<style id="applecation_scales">
            .applecation .applecation__logo img { max-width: ${35 * lS / 100}vw!important; max-height: ${180 * lS / 100}px!important; }
            .applecation .applecation__content-wrapper { font-size: ${tS}%!important; }
            .applecation .applecation__description { max-width: ${35 * tS / 100}vw!important; }
            .applecation .applecation__meta, .applecation .applecation__ratings, .applecation .applecation__info, .applecation .applecation__description { 
                margin-bottom: ${0.5 * sp / 100}em!important; 
            }
        </style>`);
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({ component: 'applecation_settings', name: PLUGIN_NAME, icon: PLUGIN_ICON });

        const addParam = (param, name, description, type = 'trigger', extra = {}) => {
            Lampa.SettingsApi.addParam({
                component: 'applecation_settings',
                param: { name, type, default: extra.def ?? true },
                field: { name, description },
                onChange: (v) => {
                    if (param === 'applecation_apple_zoom') $('body').toggleClass('applecation--zoom-enabled', v);
                    if (param === 'applecation_show_ratings') $('body').toggleClass('applecation--hide-ratings', !v);
                    applyScales();
                },
                ...extra
            });
        };

        addParam('applecation_apple_zoom', 'Плаваючий зум фону', 'Анімація наближення фонового зображення');
        addParam('applecation_show_studio', 'Показувати студію', 'Логотипи Netflix, HBO тощо');
        addParam('applecation_show_ratings', 'Показувати рейтинги', 'IMDB та Кинопоиск', 'trigger', { def: false });
        
        const scales = { '80': '80%', '90': '90%', '100': '100%', '110': '110%', '120': '120%', '150': '150%' };
        addParam('applecation_logo_scale', 'Розмір логотипу', 'Масштаб лого фільму', 'select', { values: scales, def: '100' });
        addParam('applecation_text_scale', 'Розмір тексту', 'Масштаб опису та інфо', 'select', { values: scales, def: '100' });
        addParam('applecation_spacing_scale', 'Відступи', 'Відстань між рядками', 'select', { values: scales, def: '100' });

        // Ініціалізація станів
        applyScales();
        $('body').toggleClass('applecation--zoom-enabled', getStorage('applecation_apple_zoom', true));
        $('body').toggleClass('applecation--hide-ratings', !getStorage('applecation_show_ratings', false));
    }

    function addStyles() {
        const css = `<style>
            .applecation .full-start-new__body { height: 80vh; }
            .applecation .full-start-new__right { display: flex; align-items: flex-end; }
            .applecation__logo { opacity: 0; transform: translateY(20px); transition: all 0.5s ease; }
            .applecation__logo.loaded { opacity: 1; transform: translateY(0); }
            .applecation__logo img { display: block; width: auto; height: auto; object-fit: contain; object-position: left center; }
            .applecation__meta, .applecation__info, .applecation__ratings, .applecation__description { 
                opacity: 0; transform: translateY(15px); transition: all 0.4s ease; 
            }
            .applecation__meta.show, .applecation__info.show, .applecation__ratings.show, .applecation__description.show { 
                opacity: 1; transform: translateY(0); 
            }
            .applecation__network { display: inline-flex; gap: 10px; align-items: center; margin-right: 10px; }
            .applecation__network img { max-height: 1.4em; width: auto; }
            .applecation__description { color: rgba(255,255,255,0.6); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
            .applecation__ratings { display: flex; gap: 15px; align-items: center; }
            .applecation__ratings svg { width: 2.2em; height: auto; color: #fff; }
            .applecation__ratings .rate--kp svg { width: 1.4em; }
            body.applecation--hide-ratings .applecation__ratings { display: none!important; }
            
            @keyframes kenBurns { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
            body.applecation--zoom-enabled .full-start__background.loaded:not(.dim) { animation: kenBurns 40s linear infinite!important; }
            .full-start__background { transition: opacity 0.8s ease-out!important; transform-origin: center; }
            .full-start__details::before {
                content: ''; position: absolute; inset: -10% -10% -10% -10%;
                background: linear-gradient(90deg, #000 0%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0) 100%);
                z-index: -1;
            }
        </style>`;
        $('body').append(css);
    }

    function addTemplates() {
        const ratings = `<div class="applecation__ratings">
            <div class="rate--imdb hide"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 7c-1.103 0-2 .897-2 2v6.4c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2H4Zm1.4 2.363h1.275v5.312H5.4V9.362Zm1.962 0H9l.438 2.512.287-2.512h1.75v5.312H10.4v-3l-.563 3h-.8l-.512-3v3H7.362V9.362Zm8.313 0H17v1.2c.16-.16.516-.363.875-.363.36.04.84.283.8.763v3.075c0 .24-.075.404-.275.524-.16.04-.28.075-.6.075-.32 0-.795-.196-.875-.237-.08-.04-.163.275-.163.275h-1.087V9.362Zm-3.513.037H13.6c.88 0 1.084.078 1.325.237.24.16.35.397.35.838v3.2c0 .32-.15.563-.35.762-.2.2-.484.288-1.325.288h-1.438V9.4Zm1.275.8v3.563c.2 0 .488.04.488-.2v-3.126c0-.28-.247-.237-.488-.237Zm3.763.675c-.12 0-.2.08-.2.2v2.688c0 .159.08.237.2.237.12 0 .2-.117.2-.238l-.037-2.687c0-.12-.043-.2-.163-.2Z"/></svg><div>0.0</div></div>
            <div class="rate--kp hide"><svg viewBox="0 0 192 192" fill="none" stroke="currentColor" stroke-width="5"><path d="M96.5 20 66.1 75.733V20H40.767v152H66.1v-55.733L96.5 172h35.467C116.767 153.422 95.2 133.578 80 115c28.711 16.889 63.789 35.044 92.5 51.933v-30.4C148.856 126.4 108.644 115.133 85 105c23.644 3.378 63.856 7.889 87.5 11.267v-30.4L85 90c27.022-11.822 60.478-22.711 87.5-34.533v-30.4C143.789 41.956 108.711 63.11 80 80l51.967-60z"/></svg><div>0.0</div></div>
        </div>`;

        const main = `<div class="full-start-new applecation">
            <div class="full-start-new__body">
                <div class="full-start-new__right">
                    <div class="applecation__left">
                        <div class="applecation__logo"></div>
                        <div class="applecation__content-wrapper">
                            <div class="full-start-new__title" style="display:none">{title}</div>
                            <div class="applecation__meta"><span class="applecation__network"></span><span class="applecation__meta-text"></span></div>
                            ${ratings}
                            <div class="applecation__description"></div>
                            <div class="applecation__info"></div>
                            <div class="full-start-new__buttons">
                                <div class="full-start__button selector button--play"><span>#{title_watch}</span></div>
                                <div class="full-start__button selector button--book"><span>#{settings_input_links}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        Lampa.Template.add('full_start_new', main);
    }

    // --- Запуск ---
    function initialize() {
        if (!Lampa.Platform.screen('tv')) return;
        
        addStyles();
        addTemplates();
        addSettings();

        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                clearTimeout(loadTimeout);
                loadTimeout = setTimeout(() => loadLogo(e), 150);
            }
        });

        console.log(PLUGIN_NAME, PLUGIN_VERSION, 'Initialized');
    }

    if (window.appready) initialize();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initialize(); });

})();
