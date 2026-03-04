(function () {
    'use strict';

    const PLUGIN_NAME = 'NewCard';
    const VERSION = '1.2.0';
    const PLUGIN_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>`;

    const ICONS = {
        imdb: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 7c-1.103 0-2 .897-2 2v6.4c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2H4Zm1.4 2.363h1.275v5.312H5.4V9.362Zm1.962 0H9l.438 2.512.287-2.512h1.75v5.312H10.4v-3l-.563 3h-.8l-.512-3v3H7.362V9.362Zm8.313 0H17v1.2c.16-.16.516-.363.875-.363.36.04.84.283.8.763v3.075c0 .24-.075.404-.275.524-.16.04-.28.075-.6.075-.32 0-.795-.196-.875-.237-.08-.04-.163.275-.163.275h-1.087V9.362Zm-3.513.037H13.6c.88 0 1.084.078 1.325.237.24.16.35.397.35.838v3.2c0 .32-.15.563-.35.762-.2.2-.484.288-1.325.288h-1.438V9.4Zm1.275.8v3.563c.2 0 .488.04.488-.2v-3.126c0-.28-.247-.237-.488-.237Zm3.763.675c-.12 0-.2.08-.2.2v2.688c0 .159.08.237.2.237.12 0 .2-.117.2-.238l-.037-2.687c0-.12-.043-.2-.163-.2Z"/></svg>`,
        kp: `<svg viewBox="0 0 192 192" fill="none" stroke="currentColor" stroke-width="5"><path d="M96.5 20 66.1 75.733V20H40.767v152H66.1v-55.733L96.5 172h35.467C116.767 153.422 95.2 133.578 80 115c28.711 16.889 63.789 35.044 92.5 51.933v-30.4C148.856 126.4 108.644 115.133 85 105c23.644 3.378 63.856 7.889 87.5 11.267v-30.4L85 90c27.022-11.822 60.478-22.711 87.5-34.533v-30.4C143.789 41.956 108.711 63.11 80 80l51.967-60z"/></svg>`,
        play: `<svg viewBox="0 0 28 29" fill="none"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>`
    };

    let logoCache = new Map();

    const DEFAULTS = {
        show_ratings: false,
        ratings_position: 'card',
        logo_scale: '100',
        text_scale: '100',
        spacing_scale: '100',
        show_studio: true,
        apple_zoom: true
    };

    // Оптимізовані стилі через CSS змінні
    function addStyles() {
        const style = `
        <style id="applecation-style">
            :root {
                --apple-logo-scale: 1; --apple-text-scale: 100%; --apple-spacing: 1;
            }
            .applecation .applecation__logo img { max-width: calc(35vw * var(--apple-logo-scale)) !important; max-height: calc(180px * var(--apple-logo-scale)) !important; }
            .applecation .applecation__content-wrapper { font-size: var(--apple-text-scale) !important; }
            .applecation .full-start-new__title, .applecation__meta, .applecation__ratings, .applecation__info, .applecation__description { margin-bottom: calc(0.5em * var(--apple-spacing)) !important; }
            .applecation__description { max-width: calc(35vw * (var(--apple-text-scale) / 100)) !important; }
            
            .applecation__logo { opacity: 0; transform: translateY(20px); transition: all 0.4s ease; will-change: transform; }
            .applecation__logo.loaded { opacity: 1; transform: translateY(0); }
            .applecation__meta, .applecation__ratings, .applecation__description, .applecation__info { opacity: 0; transform: translateY(15px); transition: all 0.4s ease-out; }
            .applecation__meta.show, .applecation__ratings.show, .applecation__description.show, .applecation__info.show { opacity: 1; transform: translateY(0); }
            
            body.applecation--zoom-enabled .full-start__background.loaded:not(.dim) { animation: appleKenBurns 40s linear infinite !important; }
            @keyframes appleKenBurns { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
            
            .applecation__ratings { display: flex; gap: 0.8em; }
            .applecation__ratings svg { width: 1.5em; height: auto; }
            .applecation__ratings .rate--imdb svg { width: 2.5em; }
            body.applecation--hide-ratings .applecation__ratings { display: none !important; }
        </style>`;
        $('body').append(style);
    }

    function applyScales() {
        const s = (name) => Lampa.Storage.get('applecation_' + name);
        const root = document.documentElement.style;
        root.setProperty('--apple-logo-scale', parseInt(s('logo_scale')) / 100);
        root.setProperty('--apple-text-scale', s('text_scale') + '%');
        root.setProperty('--apple-spacing', parseInt(s('spacing_scale')) / 100);
    }

    function selectBestLogo(logos, lang = 'uk') {
        const find = (l) => logos.filter(a => a.iso_639_1 === l).sort((a, b) => b.vote_average - a.vote_average)[0];
        return find(lang) || find('en') || logos[0] || null;
    }

    function loadLogo(event) {
        const { movie: data } = event.data;
        const { activity } = event.object;
        if (!data || !activity) return;

        const render = activity.render();
        const containers = {
            logo: render.find('.applecation__logo'),
            title: render.find('.full-start-new__title'),
            ratings: render.find('.applecation__ratings')
        };

        // Наповнення даними
        fillRatings(containers.ratings, data);
        fillMeta(render, data);

        const cacheKey = `${data.id}_${data.name ? 'tv' : 'movie'}`;
        
        const processLogo = (imagesData) => {
            const best = selectBestLogo(imagesData.logos);
            if (best) {
                const url = Lampa.TMDB.image(`/t/p/w500${best.file_path}`);
                const img = new Image();
                img.onload = () => {
                    containers.logo.html(`<img src="${url}" />`);
                    waitForBackground(activity, () => containers.logo.addClass('loaded'));
                };
                img.src = url;
            } else {
                containers.title.show();
                containers.logo.addClass('loaded');
            }
        };

        if (logoCache.has(cacheKey)) {
            processLogo(logoCache.get(cacheKey));
        } else {
            const url = `${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`;
            $.get(Lampa.TMDB.api(url), (res) => {
                logoCache.set(cacheKey, res);
                processLogo(res);
            });
        }

        waitForBackground(activity, () => {
            render.find('.applecation__meta, .applecation__info, .applecation__ratings, .applecation__description').addClass('show');
        });
    }

    function fillRatings(container, data) {
        const rates = { imdb: data.number_rating?.imdb || data.vote_average || 0, kp: data.number_rating?.kp || 0 };
        Object.entries(rates).forEach(([key, val]) => {
            const el = container.find(`.rate--${key}`);
            if (val > 0) {
                el.removeClass('hide').find('div').text(parseFloat(val).toFixed(1));
            }
        });
    }

    function fillMeta(render, data) {
        const year = (data.release_date || data.first_air_date || '').split('-')[0];
        const type = data.name ? 'Серіал' : 'Фільм';
        const genres = (data.genres || []).slice(0, 2).map(g => Lampa.Utils.capitalizeFirstLetter(g.name)).join(' · ');
        
        render.find('.applecation__meta-text').text(`${type} · ${genres}`);
        render.find('.applecation__info').text(`${year}${data.runtime ? ` · ${data.runtime} хв` : ''}`);
        
        if (Lampa.Storage.get('applecation_show_studio')) analyzeStudioLogos(render, data);
    }

    function analyzeStudioLogos(render, data) {
        const container = render.find('.applecation__network');
        const items = [...(data.networks || []), ...(data.production_companies || [])].filter(i => i.logo_path).slice(0, 2);
        
        container.empty();
        items.forEach(item => {
            const url = Lampa.Api.img(item.logo_path, 'w200');
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width; canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const rgb = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                let brightness = 0, count = 0;
                for (let i = 0; i < rgb.length; i+=4) {
                    if (rgb[i+3] > 50) {
                        brightness += (0.299*rgb[i] + 0.587*rgb[i+1] + 0.114*rgb[i+2]);
                        count++;
                    }
                }
                const isDark = (brightness / count) < 30;
                container.append(`<img src="${url}" style="${isDark ? 'filter:brightness(0) invert(1)' : ''}">`);
            };
            img.src = url;
        });
    }

    function waitForBackground(activity, cb) {
        const bg = activity.render().find('.full-start__background');
        const check = () => bg.hasClass('loaded') ? (bg.addClass('applecation-animated'), cb()) : setTimeout(check, 100);
        bg.length ? check() : cb();
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({ component: 'applecation_settings', name: 'NewCard', icon: PLUGIN_ICON });
        
        const params = [
            { n: 'apple_zoom', t: 'trigger', l: 'Плаваючий зум', d: 'Анімація фону' },
            { n: 'show_studio', t: 'trigger', l: 'Лого студій', d: 'Відображати Netflix, HBO тощо' },
            { n: 'show_ratings', t: 'trigger', l: 'Рейтинги', d: 'IMDB / KP' },
            { n: 'logo_scale', t: 'select', l: 'Розмір лого', v: {'70':'70%','100':'100%','130':'130%'} },
            { n: 'text_scale', t: 'select', l: 'Розмір тексту', v: {'80':'80%','100':'100%','120':'120%'} }
        ];

        params.forEach(p => {
            Lampa.SettingsApi.addParam({
                component: 'applecation_settings',
                param: { name: 'applecation_' + p.n, type: p.t, default: DEFAULTS[p.n], values: p.v },
                field: { name: p.l, description: p.d },
                onChange: () => {
                    applyScales();
                    $('body').toggleClass('applecation--zoom-enabled', Lampa.Storage.get('applecation_apple_zoom'));
                    $('body').toggleClass('applecation--hide-ratings', !Lampa.Storage.get('applecation_show_ratings'));
                }
            });
        });
    }

    function initialize() {
        addStyles();
        addSettings();
        applyScales();
        
        Lampa.Template.add('full_start_new', `
            <div class="full-start-new applecation">
                <div class="full-start-new__body">
                    <div class="applecation__left">
                        <div class="applecation__logo"></div>
                        <div class="applecation__content-wrapper">
                            <div class="full-start-new__title" style="display:none">{title}</div>
                            <div class="applecation__meta">
                                <span class="applecation__network"></span>
                                <span class="applecation__meta-text"></span>
                            </div>
                            <div class="applecation__ratings">
                                <div class="rate--imdb hide">${ICONS.imdb} <div></div></div>
                                <div class="rate--kp hide">${ICONS.kp} <div></div></div>
                            </div>
                            <div class="applecation__description">{overview}</div>
                            <div class="applecation__info"></div>
                            <div class="full-start-new__buttons">
                                <div class="full-start__button selector button--play">${ICONS.play} <span>#{title_watch}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') loadLogo(e);
        });
    }

    if (window.appready) initialize();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initialize(); });

})();
 
