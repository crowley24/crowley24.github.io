(function () {
    'use strict';

    const PLUGIN_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3H19ZM19 19H5V5H19V19ZM7 10H17V12H7V10ZM7 14H12V16H7V14ZM7 6H17V8H7V6Z" fill="white"/></svg>`;

    function initializePlugin() {
        patchApiImg();
        addStyles();
        attachLogoLoader();
    }

    function addStyles() {
        const styles = `<style>
/* Стилі першої реакції */  
.applecation .full-start-new__reactions > div:first-child .reaction {  
    display: flex !important;  
    align-items: center !important;  
    background-color: rgba(0, 0, 0, 0) !important;  
    gap: 0 !important;  
}  
  
.applecation .full-start-new__reactions > div:first-child .reaction__icon {  
    background-color: rgba(0, 0, 0, 0.3) !important;  
    -webkit-border-radius: 5em;  
    -moz-border-radius: 5em;  
    border-radius: 5em;  
    padding: 0.5em;  
    width: 2.6em !important;  
    height: 2.6em !important;  
}  
  
.applecation .full-start-new__reactions > div:first-child .reaction__count {  
    font-size: 1.2em !important;  
    font-weight: 500 !important;  
}  
  
/* При фокусі реакції */  
.applecation .full-start-new__reactions.focus {  
    gap: 0.5em;  
}  
  
.applecation .full-start-new__reactions.focus > div {  
    display: block;  
}  
  
/* Приховуємо стандартний rate-line */  
.applecation .full-start-new__rate-line {  
    margin: 0;  
    height: 0;  
    overflow: hidden;  
    opacity: 0;  
    pointer-events: none;  
}  
  
/* Анімація Ken Burns */  
@keyframes kenBurns {  
    0% { transform: scale(1.0) translateZ(0); }  
    50% { transform: scale(1.1) translateZ(0); }  
    100% { transform: scale(1.0) translateZ(0); }  
}  
  
.full-start__background {  
    height: calc(100% + 6em);  
    left: 0 !important;  
    opacity: 0 !important;  
    transition: opacity 0.8s ease-out, filter 0.3s ease-out !important;  
    animation: none !important;  
    will-change: transform, opacity, filter;  
    backface-visibility: hidden;  
    perspective: 1000px;  
    transform: translateZ(0);  
    z-index: 0 !important;  
    position: absolute;  
    width: 100%;  
    transform-origin: center center;  
}  
  
.full-start__background.loaded:not(.dim) {  
    opacity: 1 !important;  
}  
  
body.applecation--zoom-enabled .full-start__background.loaded:not(.dim) {  
    animation: kenBurns 40s linear infinite !important;  
}  
  
.full-start__details::before {  
    content: '';  
    position: absolute;  
    top: -150px;  
    left: -150px;  
    width: 200%;  
    height: 200%;  
    background: linear-gradient(90deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.8) 25%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 100%);  
    z-index: -1;  
    pointer-events: none;  
}  
  
.applecation__logo,  
.applecation__meta,  
.applecation__info,  
.applecation__description {  
    position: relative;  
    z-index: 2;  
}  

/* Приховуємо контейнер рейтингів зовсім */
.applecation__ratings {
    display: none !important;
}
  
.full-start__background.dim {  
    filter: brightness(0.3);  
}  
  
.full-start__background.loaded.applecation-animated {  
    opacity: 1 !important;  
}  
  
.applecation .full-start__status {  
    display: none;  
}  
</style>`;  
        Lampa.Template.add('applecation_css', styles);  
        $('body').append(Lampa.Template.get('applecation_css', {}, true));  
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

    function getLogoQuality() {  
        const posterSize = Lampa.Storage.field('poster_size');  
        const qualityMap = { 'w200': 'w300', 'w300': 'w500', 'w500': 'original' };  
        return qualityMap[posterSize] || 'w500';  
    }  
      
    function selectBestLogo(logos, currentLang) {  
        const preferred = logos.filter(l => l.iso_639_1 === currentLang);  
        if (preferred.length > 0) {  
            preferred.sort((a, b) => b.vote_average - a.vote_average);  
            return preferred[0];  
        }  
        const english = logos.filter(l => l.iso_639_1 === 'en');  
        if (english.length > 0) {  
            english.sort((a, b) => b.vote_average - a.vote_average);  
            return english[0];  
        }  
        if (logos.length > 0) {  
            logos.sort((a, b) => b.vote_average - a.vote_average);  
            return logos[0];  
        }  
        return null;  
    }  

    function getMediaType(data) {  
        return data.name ? 'Серіал' : 'Фільм';  
    }  

    function loadNetworkIcon(render, data) {  
        const networkContainer = render.find('.applecation__network');  
        const showStudio = Lampa.Storage.get('applecation_show_studio', 'true');  
        if (showStudio === false || showStudio === 'false') {  
            networkContainer.remove();  
            return;  
        }  
        const logos = [];  
        const items = [...(data.networks || []), ...(data.production_companies || [])];
        items.forEach(item => {
            if (item.logo_path) {
                const logoUrl = Lampa.Api.img(item.logo_path, 'w200');
                logos.push({ url: logoUrl, name: item.name, element: `<img src="${logoUrl}" alt="${item.name}" data-original="true">` });
            }
        });

        if (logos.length > 0) {  
            networkContainer.html(logos.map(l => l.element).join(''));  
            logos.forEach(logo => {  
                const img = new Image();  
                img.crossOrigin = 'anonymous';  
                img.onload = function() {  
                    const canvas = document.createElement('canvas');  
                    const ctx = canvas.getContext('2d');  
                    canvas.width = this.width; canvas.height = this.height;  
                    ctx.drawImage(this, 0, 0);  
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;  
                    let r = 0, g = 0, b = 0, pixelCount = 0, darkPixelCount = 0;  
                    for (let i = 0; i < imgData.length; i += 4) {  
                        if (imgData[i+3] > 0) {  
                            const brightness = 0.299 * imgData[i] + 0.587 * imgData[i+1] + 0.114 * imgData[i+2];  
                            r += imgData[i]; g += imgData[i+1]; b += imgData[i+2]; pixelCount++;  
                            if (brightness < 20) darkPixelCount++;  
                        }  
                    }  
                    if (pixelCount > 0 && (r/pixelCount * 0.299 + g/pixelCount * 0.587 + b/pixelCount * 0.114) < 25 && darkPixelCount/pixelCount > 0.7) {  
                        networkContainer.find(`img[alt="${logo.name}"]`).css({'filter': 'brightness(0) invert(1) contrast(1.2)', 'opacity': '0.95'}).removeAttr('data-original');  
                    }  
                };  
                img.src = logo.url;  
            });  
        } else { networkContainer.remove(); }  
    }

    function fillMetaInfo(render, data) {  
        const metaTextContainer = render.find('.applecation__meta-text');  
        const metaParts = [getMediaType(data)];  
        if (data.genres && data.genres.length) {  
            metaParts.push(...data.genres.slice(0, 2).map(g => Lampa.Utils.capitalizeFirstLetter(g.name)));  
        }  
        metaTextContainer.html(metaParts.join(' · '));  
        loadNetworkIcon(render, data);  
    }  

    function fillAdditionalInfo(render, data) {  
        const infoContainer = render.find('.applecation__info');  
        const infoParts = [];  
        const releaseDate = data.release_date || data.first_air_date || '';  
        if (releaseDate) infoParts.push(releaseDate.split('-')[0]);  
        if (data.name) {  
            if (data.episode_run_time && data.episode_run_time.length) infoParts.push(`${data.episode_run_time[0]} ${Lampa.Lang.translate('time_m').replace('.', '')}`);  
            const seasons = Lampa.Utils.countSeasons(data);  
            if (seasons) infoParts.push(formatSeasons(seasons));  
        } else if (data.runtime > 0) {  
            const hours = Math.floor(data.runtime / 60), minutes = data.runtime % 60;  
            const timeH = Lampa.Lang.translate('time_h').replace('.', ''), timeM = Lampa.Lang.translate('time_m').replace('.', '');  
            infoParts.push(hours > 0 ? `${hours} ${timeH} ${minutes} ${timeM}` : `${minutes} ${timeM}`);  
        }  
        infoContainer.html(infoParts.join(' · '));  
    }  

    function formatSeasons(count) {  
        const cases = [2, 0, 1, 1, 1, 2], titles = ['сезон', 'сезони', 'сезонів'];  
        const caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];  
        return `${count} ${titles[caseIndex]}`;  
    }  

    function waitForBackgroundLoad(activity, callback) {  
        const background = activity.render().find('.full-start__background');  
        if (!background.length) return callback();  
        const complete = () => { background.addClass('applecation-animated'); callback(); };  
        if (background.hasClass('loaded')) return setTimeout(complete, 100);  
        if (typeof MutationObserver !== 'undefined') {  
            const observer = new MutationObserver(() => { if (background.hasClass('loaded')) { observer.disconnect(); setTimeout(complete, 100); } });  
            observer.observe(background[0], { attributes: true, attributeFilter: ['class'] });  
            setTimeout(() => { observer.disconnect(); if (!background.hasClass('applecation-animated')) complete(); }, 1500);  
        } else {  
            const check = setInterval(() => { if (background.hasClass('loaded')) { clearInterval(check); setTimeout(complete, 100); } }, 100);  
            setTimeout(() => { clearInterval(check); if (!background.hasClass('applecation-animated')) complete(); }, 1500);  
        }  
    }  

    function loadLogo(event) {  
        const data = event.data.movie, activity = event.object.activity;  
        if (!data || !activity) return;  
        const render = activity.render(), logoContainer = render.find('.applecation__logo'), titleElement = render.find('.full-start-new__title');  
        
        fillMetaInfo(render, data);  
        fillAdditionalInfo(render, data);  
  
        waitForBackgroundLoad(activity, () => {  
            render.find('.applecation__meta, .applecation__info, .applecation__description').addClass('show');  
        });  
  
        const apiUrl = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
        if (Lampa.Activity.active()?.component !== 'full') return;  
  
        $.get(apiUrl, (imagesData) => {  
            if (Lampa.Activity.active()?.component !== 'full') return;  
            const bestLogo = selectBestLogo(imagesData.logos, 'uk');  
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
        }).fail(() => {  
            titleElement.show();  
            waitForBackgroundLoad(activity, () => logoContainer.addClass('loaded'));  
        });  
    }  

    let loadTimeout;  
    function attachLogoLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {  
                clearTimeout(loadTimeout);  
                loadTimeout = setTimeout(() => loadLogo(event), 150);  
            }  
        });  
    }  

    function registerPlugin() {  
        const pluginManifest = { type: 'other', version: '1.1.0', name: 'NewCard', description: 'Новий дизайн картки без рейтингів.', author: '', icon: PLUGIN_ICON };  
        if (Lampa.Manifest) {  
            if (!Lampa.Manifest.plugins) Lampa.Manifest.plugins = {};  
            if (Array.isArray(Lampa.Manifest.plugins)) Lampa.Manifest.plugins.push(pluginManifest);  
            else Lampa.Manifest.plugins['newcard'] = pluginManifest;  
        }  
    }  

    function startPlugin() { registerPlugin(); initializePlugin(); }  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', (event) => { if (event.type === 'ready') startPlugin(); });  

})();
