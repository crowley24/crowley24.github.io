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
  
/* Анімація Ken Burns з GPU прискоренням */  
@keyframes kenBurns {  
    0% { transform: scale(1.0) translateZ(0); }  
    50% { transform: scale(1.1) translateZ(0); }  
    100% { transform: scale(1.0) translateZ(0); }  
}  
  
/* Базовий стиль фону */  
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
  
/* Фон з'являється */  
.full-start__background.loaded:not(.dim) {  
    opacity: 1 !important;  
}  
  
/* Анімація вмикається тільки з класом */  
body.applecation--zoom-enabled .full-start__background.loaded:not(.dim) {  
    animation: kenBurns 40s linear infinite !important;  
}  
  
/* Шар затемнення */  
.full-start__details::before {  
    content: '';  
    position: absolute;  
    top: -150px;  
    left: -150px;  
    width: 200%;  
    height: 200%;  
    background: linear-gradient(90deg,  
        rgba(0, 0, 0, 1) 0%,  
        rgba(0, 0, 0, 0.8) 25%,  
        rgba(0, 0, 0, 0.4) 50%,  
        rgba(0, 0, 0, 0) 100%  
    );  
    z-index: -1;  
    pointer-events: none;  
}  
  
/* Гарантуємо, що контент буде зверху */  
.applecation__logo,  
.applecation__meta,  
.applecation__info,  
.applecation__description,  
.applecation__ratings {  
    position: relative;  
    z-index: 2;  
}  

/* Приховуємо блок рейтингів через CSS для надійності */
.applecation__ratings {
    display: none !important;
}
  
/* Затемнення фону */  
.full-start__background.dim {  
    filter: brightness(0.3);  
}  
  
.full-start__background.loaded.applecation-animated {  
    opacity: 1 !important;  
}  
  
/* Приховуємо статус */  
.applecation .full-start__status {  
    display: none;  
}  
</style>`;  
          
        Lampa.Template.add('applecation_css', styles);  
        $('body').append(Lampa.Template.get('applecation_css', {}, true));  
    }  
  
    // Патч Api.img  
    function patchApiImg() {  
        const originalImg = Lampa.Api.img;  
          
        Lampa.Api.img = function(src, size) {  
            if (size === 'w1280') {  
                const posterSize = Lampa.Storage.field('poster_size');  
                const sizeMap = {  
                    'w200': 'w780',  
                    'w300': 'w1280',  
                    'w500': 'original'  
                };  
                size = sizeMap[posterSize] || 'w1280';  
            }  
            return originalImg.call(this, src, size);  
        };  
    }  
  
    // Отримання якості логотипа  
    function getLogoQuality() {  
        const posterSize = Lampa.Storage.field('poster_size');  
        const qualityMap = {  
            'w200': 'w300',  
            'w300': 'w500',  
            'w500': 'original'  
        };  
        return qualityMap[posterSize] || 'w500';  
    }  
      
    // Вибір найкращого логотипа  
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
  
    // Отримання типу медіа  
    function getMediaType(data) {  
        const isTv = !!data.name;  
        const types = {  
            uk: isTv ? 'Серіал' : 'Фільм',  
        };  
        return types['uk'];      
    }  
  
    // Завантаження іконки студії  
function loadNetworkIcon(render, data) {  
    const networkContainer = render.find('.applecation__network');  
    const showStudio = Lampa.Storage.get('applecation_show_studio', 'true');  
      
    if (showStudio === false || showStudio === 'false') {  
        networkContainer.remove();  
        return;  
    }  
      
    const logos = [];  
      
    if (data.networks && data.networks.length) {  
        data.networks.forEach(network => {  
            if (network.logo_path) {  
                const logoUrl = Lampa.Api.img(network.logo_path, 'w200');  
                logos.push({  
                    url: logoUrl,  
                    name: network.name,  
                    element: `<img src="${logoUrl}" alt="${network.name}" data-original="true">`  
                });  
            }  
        });  
    }  
      
    if (data.production_companies && data.production_companies.length) {  
        data.production_companies.forEach(company => {  
            if (company.logo_path) {  
                const logoUrl = Lampa.Api.img(company.logo_path, 'w200');  
                logos.push({  
                    url: logoUrl,  
                    name: company.name,  
                    element: `<img src="${logoUrl}" alt="${company.name}" data-original="true">`  
                });  
            }  
        });  
    }  
      
    if (logos.length > 0) {  
        networkContainer.html(logos.map(l => l.element).join(''));  
          
        // Перевіряємо колір кожного логотипа  
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
                  
                let r = 0, g = 0, b = 0;  
                let pixelCount = 0;  
                let darkPixelCount = 0;  
                  
                // Аналізуємо всю область логотипа  
                for (let y = 0; y < canvas.height; y++) {  
                    for (let x = 0; x < canvas.width; x++) {  
                        const idx = (y * canvas.width + x) * 4;  
                        const alpha = data[idx + 3];  
                          
                        if (alpha > 0) { // Прозорі пікселі ігноруємо  
                            const brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];  
                              
                            r += data[idx];  
                            g += data[idx + 1];  
                            b += data[idx + 2];  
                            pixelCount++;  
                              
                            // Рахуємо дуже темні пікселі (яскравість < 20)  
                            if (brightness < 20) {  
                                darkPixelCount++;  
                            }  
                        }  
                    }  
                }  
                  
                if (pixelCount > 0) {  
                    r = Math.floor(r / pixelCount);  
                    g = Math.floor(g / pixelCount);  
                    b = Math.floor(b / pixelCount);  
                      
                    // Розраховуємо середню яскравість  
                    const avgBrightness = (0.299 * r + 0.587 * g + 0.114 * b);  
                      
                    // Відсоток темних пікселів  
                    const darkPixelRatio = darkPixelCount / pixelCount;  
                      
                    // Інвертуємо тільки якщо:  
                    // 1. Середня яскравість дуже низька (< 25)  
                    // 2. Більше 70% пікселів дуже темні  
                    if (avgBrightness < 25 && darkPixelRatio > 0.7) {  
                        const imgElement = networkContainer.find(`img[alt="${logo.name}"]`);  
                        imgElement.css({  
                            'filter': 'brightness(0) invert(1) contrast(1.2)',  
                            'opacity': '0.95'  
                        });  
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
        const metaTextContainer = render.find('.applecation__meta-text');  
        const metaParts = [];  
  
        metaParts.push(getMediaType(data));  
  
         if (data.genres && data.genres.length) {  
            const genres = data.genres.slice(0, 2).map(g =>      
                Lampa.Utils.capitalizeFirstLetter(g.name)  
            );  
            metaParts.push(...genres);  
        }  
  
        metaTextContainer.html(metaParts.join(' · '));  
          
        loadNetworkIcon(render, data);  
    }  
  
    // Заповнення додаткової інформації  
    function fillAdditionalInfo(render, data) {  
        const infoContainer = render.find('.applecation__info');  
        const infoParts = [];  
  
        const releaseDate = data.release_date || data.first_air_date || '';  
        if (releaseDate) {  
            const year = releaseDate.split('-')[0];  
            infoParts.push(year);  
        }  
  
        if (data.name) {  
            if (data.episode_run_time && data.episode_run_time.length) {  
                const avgRuntime = data.episode_run_time[0];  
                const timeM = Lampa.Lang.translate('time_m').replace('.', '');  
                infoParts.push(`${avgRuntime} ${timeM}`);  
            }  
                
            const seasons = Lampa.Utils.countSeasons(data);  
            if (seasons) {  
                infoParts.push(formatSeasons(seasons));  
            }  
        } else {  
            if (data.runtime && data.runtime > 0) {  
                const hours = Math.floor(data.runtime / 60);  
                const minutes = data.runtime % 60;  
                const timeH = Lampa.Lang.translate('time_h').replace('.', '');  
                const timeM = Lampa.Lang.translate('time_m').replace('.', '');  
                const timeStr = hours > 0      
                    ? `${hours} ${timeH} ${minutes} ${timeM}`      
                    : `${minutes} ${timeM}`;  
                infoParts.push(timeStr);  
            }  
        }  
  
        infoContainer.html(infoParts.join(' · '));  
    }  
  
    // Форматування сезонів  
    function formatSeasons(count) {  
        const cases = [2, 0, 1, 1, 1, 2];  
        const titles = ['сезон', 'сезони', 'сезонів'];  
            
        const caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];  
            
        return `${count} ${titles[caseIndex]}`;  
    }  
  
    // Оптимізована функція очікування завантаження фону  
    function waitForBackgroundLoad(activity, callback) {  
        const background = activity.render().find('.full-start__background');  
          
        if (!background.length) {  
            callback();  
            return;  
        }  
  
        const complete = () => {  
            background.addClass('applecation-animated');  
            callback();  
        };  
  
        if (background.hasClass('loaded')) {  
            setTimeout(complete, 100);  
            return;  
        }  
  
        // Використовуємо MutationObserver для відстеження класу  
        if (typeof MutationObserver !== 'undefined') {  
            const observer = new MutationObserver((mutations) => {  
                mutations.forEach((mutation) => {  
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {  
                        if (background.hasClass('loaded')) {  
                            observer.disconnect();  
                            setTimeout(complete, 100);  
                        }  
                    }  
                });  
            });  
  
            observer.observe(background[0], {  
                attributes: true,  
                attributeFilter: ['class']  
            });  
  
            // Запасний таймаут  
            setTimeout(() => {  
                observer.disconnect();  
                if (!background.hasClass('applecation-animated')) {  
                    complete();  
                }  
            }, 1500);  
        } else {  
            // Fallback для старих браузерів  
            const checkInterval = setInterval(() => {  
                if (background.hasClass('loaded')) {  
                    clearInterval(checkInterval);  
                    setTimeout(complete, 100);  
                }  
            }, 100);  
  
            setTimeout(() => {  
                clearInterval(checkInterval);  
                if (!background.hasClass('applecation-animated')) {  
                    complete();  
                }  
            }, 1500);  
        }  
    }  
  
    // Функція рейтингів видалена за запитом користувача
    function fillRatings(ratingsContainer, data) {  
        // Порожня функція
    }  
  
    // Оптимізована функція завантаження логотипа  
function loadLogo(event) {  
    const data = event.data.movie;  
    const activity = event.object.activity;  
    if (!data || !activity) return;  
  
    // Кешуємо рендер та контейнери  
    const render = activity.render();  
    const ratingsContainer = render.find('.applecation__ratings');  
    const logoContainer = render.find('.applecation__logo');  
    const titleElement = render.find('.full-start-new__title');  
  
    // Викликаємо функції з кешованими контейнерами  
    // fillRatings(ratingsContainer, data); // Виклик видалено
    fillMetaInfo(render, data);  
    fillAdditionalInfo(render, data);  
  
    waitForBackgroundLoad(activity, () => {  
        render.find('.applecation__meta').addClass('show');  
        render.find('.applecation__info').addClass('show');  
        render.find('.applecation__ratings').addClass('show');  
        render.find('.applecation__description').addClass('show');  
    });  
  
    const mediaType = data.name ? 'tv' : 'movie';  
    const currentLang = 'uk';  
      
    const apiUrl = Lampa.TMDB.api(  
        `${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}`  
    );  
  
    // Перевірка чи активна ще картка - ВИПРАВЛЕНО  
    const currentActivity = Lampa.Activity.active();  
    if (!currentActivity || currentActivity.component !== 'full') {  
        return;  
    }  
  
    $.get(apiUrl, (imagesData) => {  
        // Ще раз перевіряємо активність - ВИПРАВЛЕНО  
        const currentActivity = Lampa.Activity.active();  
        if (!currentActivity || currentActivity.component !== 'full') {  
            return;  
        }  
  
        const bestLogo = selectBestLogo(imagesData.logos, currentLang);  
  
        if (bestLogo) {  
            const logoPath = bestLogo.file_path;  
            const quality = getLogoQuality();  
            const logoUrl = Lampa.TMDB.image(`/t/p/${quality}${logoPath}`);  
  
            const img = new Image();  
            img.onload = () => {  
                logoContainer.html(`<img src="${logoUrl}" alt="" />`);  
                waitForBackgroundLoad(activity, () => {  
                    logoContainer.addClass('loaded');  
                });  
            };  
            img.src = logoUrl;  
        } else {  
            titleElement.show();  
            waitForBackgroundLoad(activity, () => {  
                logoContainer.addClass('loaded');  
            });  
        }  
    }).fail(() => {  
        titleElement.show();  
        waitForBackgroundLoad(activity, () => {  
            logoContainer.addClass('loaded');  
        });  
    });  
}  
  
    // Дебаунс для завантаження логотипів  
    let loadTimeout;  
    function attachLogoLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {  
                clearTimeout(loadTimeout);  
                loadTimeout = setTimeout(() => {  
                    loadLogo(event);  
                }, 150);  
            }  
        });  
    }  
  
    // Правильна реєстрація маніфесту  
    function registerPlugin() {  
        const pluginManifest = {  
            type: 'other',  
            version: '1.1.0',  
            name: 'NewCard',  
            description: 'Новий дизайн картки фільму/серіалу.',  
            author: '',  
            icon: PLUGIN_ICON  
        };  
  
        if (Lampa.Manifest) {  
            if (!Lampa.Manifest.plugins) {  
                Lampa.Manifest.plugins = {};  
            }  
              
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
            if (event.type === 'ready') {  
                startPlugin();  
            }  
        });  
    }  
  
})();
