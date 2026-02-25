(function () {  
    'use strict';  
  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="8" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="8" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>';  
  
    const logoCache = new Map();  
    const LANG = 'uk';  
  
    // Універсальна функція для додавання налаштувань  
    function addSetting(component, param, field, onChange) {  
        Lampa.SettingsApi.addParam({  
            component,  
            param,  
            field,  
            onChange: onChange || ((value) => Lampa.Storage.set(param.name, value))  
        });  
    }  
  
    // Оптимізована генерація CSS масштабів  
    function generateScaleStyles() {  
        const logoScale = parseInt(Lampa.Storage.get('applecation_logo_scale', '100'));  
        const textScale = parseInt(Lampa.Storage.get('applecation_text_scale', '100'));  
        const spacingScale = parseInt(Lampa.Storage.get('applecation_spacing_scale', '100'));  
          
        return `  
            .applecation .applecation__logo img {  
                max-width: ${35 * logoScale / 100}vw !important;  
                max-height: ${180 * logoScale / 100}px !important;  
            }  
            .applecation .applecation__content-wrapper {  
                font-size: ${textScale}% !important;  
            }  
            .applecation .applecation__description {  
                max-width: ${35 * textScale / 100}vw !important;  
            }  
            ${['title', 'meta', 'description', 'info'].map(el =>   
                `.applecation .applecation__${el} {  
                    margin-bottom: ${0.5 * spacingScale / 100}em !important;  
                }`  
            ).join('\n')}  
        `;  
    }  
  
    // Спрощена функція вибору логотипа  
    function selectBestLogo(logos, lang = LANG) {  
        if (!logos?.length) return null;  
          
        const filtered = logos.filter(l => l.iso_639_1 === lang);  
        const sorted = (filtered.length ? filtered : logos)  
            .sort((a, b) => b.vote_average - a.vote_average);  
          
        return sorted[0];  
    }  
  
    // Конфігурація налаштувань  
    const SETTINGS_CONFIG = [  
        {  
            name: 'applecation_apple_zoom',  
            type: 'trigger',  
            default: true,  
            field: { name: 'Плаваючий зум фону', description: 'Повільна анімація наближення фонового зображення' },  
            onChange: () => $('body').toggleClass('applecation--zoom-enabled', Lampa.Storage.get('applecation_apple_zoom'))  
        },  
        {  
            name: 'applecation_show_studio',  
            type: 'trigger',  
            default: true,  
            field: { name: 'Показувати логотип студії', description: 'Відображати іконку Netflix, HBO, Disney тощо у мета-даних' }  
        },  
        {  
            name: 'applecation_logo_scale',  
            type: 'select',  
            default: '100',  
            values: { '70':'70%','80':'80%','90':'90%','100':'За замовчуванням','110':'110%','120':'120%','130':'130%','140':'140%','150':'150%','160':'160%' },  
            field: { name: 'Розмір логотипу', description: 'Масштаб логотипу фільму' },  
            onChange: applyScales  
        },  
        {  
            name: 'applecation_text_scale',  
            type: 'select',  
            default: '100',  
            values: { '50':'50%','60':'60%','70':'70%','80':'80%','90':'90%','100':'За замовчуванням','110':'110%','120':'120%','130':'130%','140':'140%','150':'150%','160':'160%','170':'170%','180':'180%' },  
            field: { name: 'Розмір тексту', description: 'Масштаб тексту даних про фільм' },  
            onChange: applyScales  
        },  
        {  
            name: 'applecation_spacing_scale',  
            type: 'select',  
            default: '100',  
            values: { '50':'50%','60':'60%','70':'70%','80':'80%','90':'90%','100':'За замовчуванням','110':'110%','120':'120%','130':'130%','140':'140%','150':'150%','160':'160%','170':'170%','180':'180%','200':'200%','250':'250%','300':'300%' },  
            field: { name: 'Відступи між рядками', description: 'Відстань між елементами інформації' },  
            onChange: applyScales  
        }  
    ];  
  
    // Шаблони кнопок  
    const BUTTONS_TEMPLATES = {  
        play: `<div class="full-start__button selector button--play">  
            <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">  
                <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>  
                <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>  
            </svg>  
            <span>#{title_watch}</span>  
        </div>`,  
        book: `<div class="full-start__button selector button--book">  
            <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">  
                <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>  
            </svg>  
            <span>#{settings_input_links}</span>  
        </div>`,  
        reaction: `<div class="full-start__button selector button--reaction">  
            <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">  
                <path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/>  
                <path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/>  
            </svg>  
            <span>#{title_reactions}</span>  
        </div>`,  
        subscribe: `<div class="full-start__button selector button--subscribe hide">  
            <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">  
                <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>  
                <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>  
            </svg>  
            <span>#{title_subscribe}</span>  
        </div>`,  
        options: `<div class="full-start__button selector button--options">  
            <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg">  
                <circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/>  
                <circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/>  
                <circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/>  
            </svg>  
        </div>`  
    };  
  
    // Основні функції  
    function initializePlugin() {  
        console.log('NewCard', 'v1.1.0');  
        if (!Lampa.Platform.screen('tv')) {  
            console.log('NewCard', 'TV mode only');  
            return;  
        }  
        patchApiImg();  
        addCustomTemplate();  
        addStyles();  
        addSettings();  
        attachLogoLoader();  
    }  
  
    function applyScales() {  
    $('style[data-id="applecation_scales"]').remove();  
    $('body').append(`<style data-id="applecation_scales">${generateScaleStyles()}</style>`);  
}  
  
    // Патч Api.img  
    function patchApiImg() {  
        const originalImg = Lampa.Api.img;  
        Lampa.Api.img = function(src, size) {  
            if (size === 'w1280') {  
                const sizeMap = { 'w200': 'w780', 'w300': 'w1280', 'w500': 'original' };  
                size = sizeMap[Lampa.Storage.field('poster_size')] || 'w1280';  
            }  
            return originalImg.call(this, src, size);  
        };  
    }  
  
    // Отримання якості логотипа  
    function getLogoQuality() {  
        const qualityMap = { 'w200': 'w300', 'w300': 'w500', 'w500': 'original' };  
        return qualityMap[Lampa.Storage.field('poster_size')] || 'w500';  
    }  
  
    // Отримання типу медіа  
    function getMediaType(data) {  
        return data.name ? 'Серіал' : 'Фільм';  
    }  
  
    // Завантаження іконки студії  
    function loadNetworkIcon(render, data) {  
        const networkContainer = render.find('.applecation__network');  
        if (Lampa.Storage.get('applecation_show_studio') === false) {  
            networkContainer.remove();  
            return;  
        }  
  
        const logos = [];  
        ['networks', 'production_companies'].forEach(key => {  
            (data[key] || []).forEach(item => {  
                if (item.logo_path) {  
                    const logoUrl = Lampa.Api.img(item.logo_path, 'w200');  
                    logos.push({  
                        url: logoUrl,  
                        name: item.name,  
                        element: `<img src="${logoUrl}" alt="${item.name}" data-original="true">`  
                    });  
                }  
            });  
        });  
  
        if (logos.length) {  
            networkContainer.html(logos.map(l => l.element).join(''));  
            logos.forEach(logo => {  
                const img = new Image();  
                img.crossOrigin = 'anonymous';  
                img.onload = function() {  
                    const canvas = document.createElement('canvas');  
                    const ctx = canvas.getContext('2d');  
                    canvas.width = this.width;  
                    canvas.height = this.height;  
                    ctx.drawImage(this, 0, 0);  
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);  
                    const data = imageData.data;  
                    let r = 0, g = 0, b = 0, pixelCount = 0, darkPixelCount = 0;  
                    for (let y = 0; y < canvas.height; y++) {  
                        for (let x = 0; x < canvas.width; x++) {  
                            const idx = (y * canvas.width + x) * 4;  
                            const alpha = data[idx + 3];  
                            if (alpha > 0) {  
                                const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];  
                                r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; pixelCount++;  
                                if (brightness < 20) darkPixelCount++;  
                            }  
                        }  
                    }  
                    if (pixelCount > 0) {  
                        const avgBrightness = (0.299 * (r/pixelCount) + 0.587 * (g/pixelCount) + 0.114 * (b/pixelCount));  
                        if (avgBrightness < 25 && darkPixelCount / pixelCount > 0.7) {  
                            const imgElement = networkContainer.find(`img[alt="${logo.name}"]`);  
                            imgElement.css({ 'filter': 'brightness(0) invert(1) contrast(1.2)', 'opacity': '0.95' });  
                            imgElement.removeAttr('data-original');  
                        }  
                    }  
                };  
                img.src = logo.url;  
            });  
        } else {  
            networkContainer.remove();  
        }  
    }  
  
    // Заповнення мета інформації  
    function fillMetaInfo(render, data) {  
        const metaParts = [getMediaType(data)];  
        if (data.genres?.length) {  
            metaParts.push(...data.genres.slice(0, 2).map(g => Lampa.Utils.capitalizeFirstLetter(g.name)));  
        }  
        render.find('.applecation__meta-text').html(metaParts.join(' · '));  
        loadNetworkIcon(render, data);  
    }  
  
    // Заповнення додаткової інформації  
    function fillAdditionalInfo(render, data) {  
        const infoParts = [];  
        const releaseDate = data.release_date || data.first_air_date;  
        if (releaseDate) infoParts.push(releaseDate.split('-')[0]);  
          
        if (data.name) {  
            if (data.episode_run_time?.length) {  
                const timeM = Lampa.Lang.translate('time_m').replace('.', '');  
                infoParts.push(`${data.episode_run_time[0]} ${timeM}`);  
            }  
            const seasons = Lampa.Utils.countSeasons(data);  
            if (seasons) infoParts.push(formatSeasons(seasons));  
        } else if (data.runtime > 0) {  
            const hours = Math.floor(data.runtime / 60);  
            const minutes = data.runtime % 60;  
            const timeH = Lampa.Lang.translate('time_h').replace('.', '');  
            const timeM = Lampa.Lang.translate('time_m').replace('.', '');  
            infoParts.push(hours > 0 ? `${hours} ${timeH} ${minutes} ${timeM}` : `${minutes} ${timeM}`);  
        }  
        render.find('.applecation__info').html(infoParts.join(' · '));  
    }  
  
    // Форматування сезонів  
    function formatSeasons(count) {  
        const cases = [2, 0, 1, 1, 1, 2];  
        const titles = ['сезон', 'сезони', 'сезонів'];  
        const caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];  
        return `${count} ${titles[caseIndex]}`;  
    }  
  
    // Очікування завантаження фону  
    function waitForBackgroundLoad(activity, callback) {  
        const background = activity.render().find('.full-start__background');  
        if (!background.length) { callback(); return; }  
        const complete = () => { background.addClass('applecation-animated'); callback(); };  
        if (background.hasClass('loaded')) { setTimeout(complete, 100); return; }  
          
        if (typeof MutationObserver !== 'undefined') {  
            const observer = new MutationObserver(() => {  
                if (background.hasClass('loaded')) { observer.disconnect(); setTimeout(complete, 100); }  
            });  
            observer.observe(background[0], { attributes: true, attributeFilter: ['class'] });  
            setTimeout(() => { observer.disconnect(); if (!background.hasClass('applecation-animated')) complete(); }, 1500);  
        } else {  
            const checkInterval = setInterval(() => {  
                if (background.hasClass('loaded')) { clearInterval(checkInterval); setTimeout(complete, 100); }  
            }, 100);  
            setTimeout(() => { clearInterval(checkInterval); if (!background.hasClass('applecation-animated')) complete(); }, 1500);  
        }  
    }  
  
    // Завантаження логотипа  
    function loadLogo(event) {  
        const { movie: data } = event.data;  
        const activity = event.object.activity;  
        if (!data || !activity) return;  
          
        const render = activity.render();  
        const logoContainer = render.find('.applecation__logo');  
        const titleElement = render.find('.full-start-new__title');  
          
        fillMetaInfo(render, data);  
        fillAdditionalInfo(render, data);  
          
        waitForBackgroundLoad(activity, () => {  
            render.find('.applecation__meta, .applecation__info, .applecation__description').addClass('show');  
        });  
          
        const cacheKey = `${data.id}_${data.name ? 'tv' : 'movie'}`;  
        if (logoCache.has(cacheKey)) {  
            return applyLogoData(logoCache.get(cacheKey), logoContainer, titleElement, activity);  
        }  
          
        const mediaType = data.name ? 'tv' : 'movie';  
        const apiUrl = Lampa.TMDB.api(`${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
          
        if (!Lampa.Activity.active()?.component === 'full') return;  
          
        $.get(apiUrl)  
            .done(imagesData => {  
                logoCache.set(cacheKey, imagesData);  
                if (Lampa.Activity.active()?.component === 'full') {  
                    applyLogoData(imagesData, logoContainer, titleElement, activity);  
                }  
            })  
            .fail(() => {  
                titleElement.show();  
                waitForBackgroundLoad(activity, () => logoContainer.addClass('loaded'));  
            });  
    }  
  
    function applyLogoData(imagesData, logoContainer, titleElement, activity) {  
        const bestLogo = selectBestLogo(imagesData.logos, LANG);  
        if (bestLogo) {  
            const logoUrl = Lampa.TMDB.image(`/t/p/${getLogoQuality()}${bestLogo.file_path}`);  
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
  
    // Дебаунс для завантаження логотипів  
    let loadTimeout;  
    function attachLogoLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {  
                clearTimeout(loadTimeout);  
                loadTimeout = setTimeout(() => loadLogo(event), 150);  
            }  
        });  
    }  
  
    // Реєстрація маніфесту  
    function registerPlugin() {  
        const pluginManifest = { type: 'other', version: '1.1.0', name: 'NewCard', description: 'Новий дизайн картки фільму/серіалу.', author: '', icon: PLUGIN_ICON };  
        if (Lampa.Manifest) {  
            if (!Lampa.Manifest.plugins) Lampa.Manifest.plugins = {};  
            if (Array.isArray(Lampa.Manifest.plugins)) {  
                Lampa.Manifest.plugins.push(pluginManifest);  
            } else {  
                Lampa.Manifest.plugins['newcard'] = pluginManifest;  
            }  
        }  
    }  
  
    // Запуск плагіна  
    function startPlugin() {  
        registerPlugin();  
        initializePlugin();  
    }  
  
    if (window.appready) {  
        startPlugin();  
    } else {  
        Lampa.Listener.follow('app', (event) => {  
            if (event.type === 'ready') startPlugin();  
        });  
    }  
  
})();
