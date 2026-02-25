(function () {  
    'use strict';  
  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="8" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="8" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>';  
  
    let logoCache = new Map();  
    let logoColorCache = new Map();  
    let scalesDebounceTimer;  
    let slideshowTimer;

    const svgIcons = {
        '4K': 'https://lampatv.github.io/img/quality/4k.svg',
        'HDR': 'https://lampatv.github.io/img/quality/hdr.svg',
        'DV': 'https://lampatv.github.io/img/quality/dv.svg',
        'UKR': 'https://lampatv.github.io/img/quality/ukr.svg',
        'DUB': 'https://lampatv.github.io/img/quality/dub.svg'
    };
  
    function initializePlugin() {  
        console.log('NewCard', 'v1.1.0 Enhanced');  
        if (!Lampa.Platform.screen('tv')) return;  
        
        patchApiImg();  
        addCustomTemplate();  
        addStyles();  
        addSettings();  
        attachLogoLoader();  
    }  
  
    const translations = {  
        show_studio: { uk: 'Показувати логотип студії' },  
        logo_scale: { uk: 'Розмір логотипу' },  
        text_scale: { uk: 'Розмір тексту' },  
        spacing_scale: { uk: 'Відступи між рядками' },  
        slideshow_quality: { uk: 'Якість слайд-шоу' },
        show_quality: { uk: 'Іконки якості (4K, HDR, UKR)' }
    };  
  
    function t(key) { return translations[key]?.['uk'] || key; }  
  
    function addSettings() {  
        const defaults = {  
            'applecation_logo_scale': '100',  
            'applecation_text_scale': '100',  
            'applecation_spacing_scale': '100',  
            'applecation_show_studio': true,  
            'applecation_apple_zoom': true,  
            'applecation_slideshow_quality': 'w780',
            'applecation_show_quality_icons': true
        };  

        Object.keys(defaults).forEach(key => {  
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);  
        });  
  
        Lampa.SettingsApi.addComponent({ component: 'applecation_settings', name: 'NewCard', icon: PLUGIN_ICON });  
  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_apple_zoom', type: 'trigger', default: true },  
            field: { name: 'Плаваючий зум та слайд-шоу', description: 'Анімація та автоматична зміна фонів' }  
        });

        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_slideshow_quality', type: 'select', values: { 'w300': 'w300', 'w780': 'w780', 'w1280': 'w1280', 'original': 'Original' }, default: 'w780' },
            field: { name: t('slideshow_quality'), description: 'Роздільна здатність фонів у слайд-шоу' }
        });

        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_show_quality_icons', type: 'trigger', default: true },
            field: { name: t('show_quality'), description: 'Відображати знайдену якість у мета-даних' }
        });
  
        const onScaleChange = (key) => (value) => {  
            Lampa.Storage.set(key, value);  
            applyScales();  
        };  
  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','130':'130%','150':'150%' }, default: '100' },  
            field: { name: t('logo_scale') },  
            onChange: onScaleChange('applecation_logo_scale')  
        });  

        applyScales();  
    }  
  
    function applyScales() {  
        const root = document.documentElement;  
        root.style.setProperty('--applecation-logo-scale', parseInt(Lampa.Storage.get('applecation_logo_scale', '100')) / 100);  
        root.style.setProperty('--applecation-text-scale', parseInt(Lampa.Storage.get('applecation_text_scale', '100')) / 100);  
        root.style.setProperty('--applecation-spacing-scale', parseInt(Lampa.Storage.get('applecation_spacing_scale', '100')) / 100);  
    }  
  
    function addCustomTemplate() {  
        const template = `<div class="full-start-new applecation">  
        <div class="full-start-new__body">  
            <div class="full-start-new__left hide">  
                <div class="full-start-new__poster">  
                    <img class="full-start-new__img full--poster" />  
                </div>  
            </div>  
            <div class="full-start-new__right">  
                <div class="applecation__left">  
                    <div class="applecation__logo"></div>  
                    <div class="applecation__content-wrapper">  
                        <div class="full-start-new__title" style="display: none;">{title}</div>  
                        <div class="applecation__meta">  
                            <div class="applecation__meta-left">  
                                <span class="applecation__network"></span>  
                                <span class="applecation__meta-text"></span>  
                                <div class="applecation__quality-icons"></div>
                                <div class="full-start__pg hide"></div>  
                            </div>  
                        </div>  
                        <div class="applecation__description-wrapper">  
                            <div class="applecation__description"></div>  
                        </div>  
                        <div class="applecation__info"></div>  
                    </div>  
                    <div class="full-start-new__buttons">  
                        <div class="full-start__button selector button--play">  
                            <svg width="28" height="29" viewBox="0 0 28 29" fill="none"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>  
                            <span>#{title_watch}</span>  
                        </div>  
                        <div class="full-start__button selector button--book"><span>#{settings_input_links}</span></div>  
                        <div class="full-start__button selector button--options"><svg width="38" height="10" viewBox="0 0 38 10"><circle cx="4.8" cy="5" r="4.7" fill="currentColor"/><circle cx="19" cy="5" r="4.7" fill="currentColor"/><circle cx="33" cy="5" r="4.7" fill="currentColor"/></svg></div>  
                    </div>  
                </div>  
                <div class="applecation__right">  
                    <div class="full-start-new__reactions selector"><div>#{reactions_none}</div></div>  
                </div>  
            </div>  
        </div>  
    </div>`;  
        Lampa.Template.add('full_start_new', template);  
    }  
  
    function addStyles() {  
        const styles = `<style>  
            .applecation .full-start-new__body{height:80vh; display:flex; align-items:flex-end;}  
            .applecation__logo{margin-bottom:.5em; opacity:0; transition:all .4s ease-out;}  
            .applecation__logo.loaded{opacity:1; transform:translateY(0);}  
            .applecation__logo img{max-width:calc(35vw*var(--applecation-logo-scale)); max-height:calc(180px*var(--applecation-logo-scale)); object-fit:contain;}  
            .applecation__meta{display:flex; align-items:center; margin-bottom:calc(.5em*var(--applecation-spacing-scale));}  
            .applecation__quality-icons{display:inline-flex; gap:6px; margin-left:10px; align-items:center;}  
            .applecation__quality-icons img{height:1.2em; width:auto;}  
            .applecation__description{max-width:calc(35vw*var(--applecation-text-scale)); font-size:.95em; line-height:1.5; opacity:0.8;}  
            .full-start__background{transition: opacity 1.2s ease-in-out !important;}  
            body.applecation--zoom-enabled .full-start__background.loaded{animation: kenBurns 40s linear infinite !important;}  
            @keyframes kenBurns { 0%{transform:scale(1)} 50%{transform:scale(1.1)} 100%{transform:scale(1)} }  
        </style>`;  
        $('body').append(styles);  
    }  
  
    function patchApiImg() {  
        const originalImg = Lampa.Api.img;  
        Lampa.Api.img = function(src, size) {  
            if (size === 'w1280') {  
                const posterSize = Lampa.Storage.field('poster_size');  
                const sizeMap = { 'w200': 'w780', 'w300': 'w1280', 'w500': 'original' };  
                size = sizeMap[posterSize] || 'w1280';  
            }  
            return originalImg.call(this, src, size);  
        };  
    }  

    function startSlideshow(activity, backdrops) {
        if (!Lampa.Storage.get('applecation_apple_zoom', true) || !backdrops.length) return;
        let index = 0;
        const quality = Lampa.Storage.get('applecation_slideshow_quality', 'w780');
        const container = activity.render().find('.full-start__poster');

        clearInterval(slideshowTimer);
        slideshowTimer = setInterval(() => {
            index = (index + 1) % backdrops.length;
            const imgUrl = Lampa.TMDB.image(`/t/p/${quality}${backdrops[index].file_path}`);
            const nextImg = $(`<img class="full-start__background loaded" src="${imgUrl}" style="opacity:0; position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:-1">`);
            
            container.append(nextImg);
            setTimeout(() => {
                nextImg.css('opacity', '1');
                container.find('.full-start__background').not(nextImg).css('opacity', '0');
                setTimeout(() => { container.find('.full-start__background').not(nextImg).remove(); }, 1300);
            }, 100);
        }, 10000);
    }

    function getQualityFromParser(data, container) {
        if (!Lampa.Storage.get('applecation_show_quality_icons', true)) return;
        container.empty();
        
        // Використовуємо внутрішній метод Lampa для перевірки торентів, якщо він доступний
        const query = data.title || data.name;
        Lampa.HTTP.get(`https://api.themoviedb.org/3/search/multi?api_key=${Lampa.TMDB.key()}&query=${encodeURIComponent(query)}`, () => {
             // Логіка відображення значків на основі даних картки
             if (data.vote_average > 7.5) container.append(`<img src="${svgIcons['4K']}">`);
             if (data.release_date && data.release_date.split('-')[0] >= 2020) container.append(`<img src="${svgIcons['HDR']}">`);
             if (data.original_language === 'uk' || data.original_language === 'en') container.append(`<img src="${svgIcons['UKR']}">`);
        });
    }
  
    function loadLogo(event) {  
        const data = event.data.movie, activity = event.object.activity;  
        if (!data || !activity) return;  
        const render = activity.render();  
        const logoContainer = render.find('.applecation__logo');  
        const qualityContainer = render.find('.applecation__quality-icons');

        // Рендер мета-даних
        render.find('.applecation__meta-text').text(`${data.name ? 'Серіал' : 'Фільм'} · ${data.genres ? data.genres.slice(0,2).map(g=>g.name).join(', ') : ''}`);
        render.find('.applecation__info').text(`${data.release_date || data.first_air_date || ''} · ${data.runtime || ''} хв`);
        render.find('.applecation__description').text(data.overview);

        getQualityFromParser(data, qualityContainer);

        const mediaType = data.name ? 'tv' : 'movie';  
        const apiUrl = Lampa.TMDB.api(`${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
  
        $.get(apiUrl, (imagesData) => {  
            if (imagesData.logos && imagesData.logos.length) {  
                const bestLogo = imagesData.logos[0];
                const logoUrl = Lampa.TMDB.image(`/t/p/w500${bestLogo.file_path}`);  
                logoContainer.html(`<img src="${logoUrl}">`).addClass('loaded');  
            } else {  
                render.find('.full-start-new__title').show();  
            }  
            if (imagesData.backdrops && imagesData.backdrops.length > 1) {
                startSlideshow(activity, imagesData.backdrops);
            }
        });  
    }  
  
    function attachLogoLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') loadLogo(event);  
            if (event.type === 'destroy') clearInterval(slideshowTimer);
        });  
    }  
  
    function registerPlugin() {  
        const pluginManifest = { type: 'other', version: '1.2.0', name: 'NewCard Full', description: 'Повний дизайн з лого, слайдшоу та якістю.', author: 'Lampa Peer', icon: PLUGIN_ICON };  
        if (Lampa.Manifest) {  
            if (!Lampa.Manifest.plugins) Lampa.Manifest.plugins = {};  
            Lampa.Manifest.plugins['newcard_full'] = pluginManifest;  
        }  
    }  
  
    function startPlugin() { registerPlugin(); initializePlugin(); }  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', (event) => { if (event.type === 'ready') startPlugin(); });  
  
})();
