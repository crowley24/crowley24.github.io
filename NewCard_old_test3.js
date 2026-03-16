(function () {
    'use strict';

    const PLUGIN_NAME = 'NewCard';
    const PLUGIN_VERSION = '1.2.1';
    
    let logoCache = new Map();
    let loadTimeout;

    const getStorage = (key, def) => Lampa.Storage.get(key, def);

    function selectBestLogo(logos) {
        const sortLogos = (list) => list.sort((a, b) => b.vote_average - a.vote_average);
        return sortLogos(logos.filter(l => l.iso_639_1 === 'uk'))[0] || 
               sortLogos(logos.filter(l => l.iso_639_1 === 'en'))[0] || 
               sortLogos(logos)[0] || null;
    }

    function applyLogoData(imagesData, render, activity) {
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

        fillRatings(render.find('.applecation__ratings'), data);
        fillMetaInfo(render, data);
        fillAdditionalInfo(render, data);

        waitForBackgroundLoad(activity, () => {
            render.find('.applecation__meta, .applecation__info, .applecation__ratings, .applecation__description').addClass('show');
        });

        if (logoCache.has(cacheKey)) {
            return applyLogoData(logoCache.get(cacheKey), render, activity);
        }

        const apiUrl = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);
        
        $.get(apiUrl, (json) => {
            logoCache.set(cacheKey, json);
            applyLogoData(json, render, activity);
        }).fail(() => {
            render.find('.full-start-new__title').show();
            render.find('.applecation__logo').addClass('loaded');
        });
    }

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
        
        const container = render.find('.applecation__network');
        if (!getStorage('applecation_show_studio', true)) return container.hide();

        const studios = [...(data.networks || []), ...(data.production_companies || [])].filter(s => s.logo_path).slice(0, 2);
        if (studios.length) {
            container.empty().show();
            studios.forEach(s => {
                const url = Lampa.Api.img(s.logo_path, 'w200');
                container.append(`<img src="${url}" style="max-height:1.4em; margin-right:10px;">`);
            });
        }
    }

    function fillAdditionalInfo(render, data) {
        const info = [];
        const date = data.release_date || data.first_air_date;
        if (date) info.push(date.split('-')[0]);
        if (data.runtime) info.push(`${data.runtime} хв`);
        render.find('.applecation__info').text(info.join(' · '));
        render.find('.applecation__description').text(data.overview || '');
    }

    function waitForBackgroundLoad(activity, callback) {
        const bg = activity.render().find('.full-start__background');
        if (!bg.length || bg.hasClass('loaded')) return callback();
        const observer = new MutationObserver(() => {
            if (bg.hasClass('loaded')) {
                observer.disconnect();
                callback();
            }
        });
        observer.observe(bg[0], { attributes: true, attributeFilter: ['class'] });
    }

    function addSettings() {
        Lampa.SettingsApi.addComponent({ component: 'applecation_settings', name: PLUGIN_NAME });
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_apple_zoom', type: 'trigger', default: true },
            field: { name: 'Плаваючий зум фону', description: 'Анімація наближення фонового зображення' },
            onChange: (v) => $('body').toggleClass('applecation--zoom-enabled', v)
        });
    }

    function addStyles() {
        $('body').append(`<style>
            .applecation .full-start-new__body { height: 80vh; display: flex; align-items: flex-end; padding: 50px; }
            .applecation__logo { opacity: 0; transition: all 0.5s ease; min-height: 50px; }
            .applecation__logo.loaded { opacity: 1; }
            .applecation__logo img { max-width: 35vw; max-height: 180px; object-fit: contain; }
            .applecation__description { color: rgba(255,255,255,0.6); margin: 20px 0; max-width: 40vw; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
            .applecation__ratings { display: flex; gap: 15px; margin-bottom: 10px; }
            .rate--imdb, .rate--kp { display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px; }
            .hide { display: none; }
            @keyframes kenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
            body.applecation--zoom-enabled .full-start__background.loaded:not(.dim) { animation: kenBurns 40s linear infinite!important; }
        </style>`);
    }

    function addTemplates() {
        // КРИТИЧНО: Додано id="full-treilers" та інші блоки, які шукає Lampa
        const main = `<div class="full-start-new applecation">
            <div class="full-start-new__body">
                <div class="applecation__content">
                    <div class="applecation__logo"></div>
                    <div class="full-start-new__title" style="display:none">{title}</div>
                    <div class="applecation__meta"><span class="applecation__network"></span><span class="applecation__meta-text"></span></div>
                    <div class="applecation__ratings">
                        <div class="rate--imdb hide"><b>IMDb</b> <div>0.0</div></div>
                        <div class="rate--kp hide"><b>KP</b> <div>0.0</div></div>
                    </div>
                    <div class="applecation__description"></div>
                    <div class="applecation__info"></div>
                    <div class="full-start-new__buttons">
                        <div class="full-start__button selector button--play"><span>#{title_watch}</span></div>
                    </div>
                    <div id="full-treilers" style="display:none"></div>
                    <div id="full-person" style="display:none"></div>
                    <div id="full-recom" style="display:none"></div>
                </div>
            </div>
        </div>`;
        Lampa.Template.add('full_start_new', main);
    }

    function initialize() {
        addStyles();
        addTemplates();
        addSettings();
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                clearTimeout(loadTimeout);
                loadTimeout = setTimeout(() => loadLogo(e), 10);
            }
        });
    }

    if (window.appready) initialize();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initialize(); });
})();
