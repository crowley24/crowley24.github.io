(function () {  
    'use strict';  
  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="8" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="8" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>';  

    let logoCache = new Map();  
    let slideshowTimer; // Таймер для слайд-шоу

    // Головна функція плагіна  
    function initializePlugin() {  
        console.log('NewCard', 'v1.1.0');  
        if (!Lampa.Platform.screen('tv')) return;  
  
        patchApiImg();  
        addCustomTemplate();  
        addStyles();  
        addSettings();  
        attachLogoLoader();  
        
        // Зупинка слайд-шоу при виході з картки
        Lampa.Listener.follow('activity', function (e) {
            if (e.type == 'destroy') clearInterval(slideshowTimer);
        });
    }  

    // Налаштування  
    function addSettings() {  
        const defaults = {  
            'applecation_show_ratings': false,  
            'applecation_ratings_position': 'card',  
            'applecation_logo_scale': '100',  
            'applecation_text_scale': '100',  
            'applecation_spacing_scale': '100',  
            'applecation_show_studio': true,  
            'applecation_apple_zoom': true,
            'applecation_slideshow': true
        };  
  
        Object.keys(defaults).forEach(key => {  
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);  
        });  
  
        Lampa.SettingsApi.addComponent({ component: 'applecation_settings', name: 'NewCard', icon: PLUGIN_ICON });  
  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_apple_zoom', type: 'trigger', default: true },  
            field: { name: 'Плаваючий зум фону', description: 'Повільна анімація наближення фонового зображення' },  
            onChange: updateZoomState  
        });

        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_slideshow', type: 'trigger', default: true },  
            field: { name: 'Слайд-шоу фону', description: 'Автоматична зміна фонових зображень у картці' }  
        });

        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_show_studio', type: 'trigger', default: true },  
            field: { name: 'Показувати логотип студії', description: 'Відображати іконку студії' }  
        });

        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_show_ratings', type: 'trigger', default: false },  
            field: { name: 'Показувати рейтинги', description: 'IMDB та КіноПошук' },  
            onChange: (value) => $('body').toggleClass('applecation--hide-ratings', !value)  
        });

        // Решта ваших селектів (ratings_position, logo_scale, text_scale, spacing_scale)
        Lampa.SettingsApi.addParam({
            component: 'applecation_settings',
            param: { name: 'applecation_ratings_position', type: 'select', values: { card: 'У картці', corner: 'У куті' }, default: 'card' },
            field: { name: 'Розташування рейтингів' },
            onChange: (value) => {
                Lampa.Storage.set('applecation_ratings_position', value);
                $('body').removeClass('applecation--ratings-card applecation--ratings-corner').addClass('applecation--ratings-' + value);
                addCustomTemplate();
            }
        });

        // Ініціалізація стану
        updateZoomState();  
        if (!Lampa.Storage.get('applecation_show_ratings', false)) $('body').addClass('applecation--hide-ratings');  
        $('body').addClass('applecation--ratings-' + Lampa.Storage.get('applecation_ratings_position', 'card'));  
        applyScales();  
                  }
      // ====== ЛОГІКА СЛАЙД-ШОУ ======
    function startSlideshow(render, backdrops) {
        if (!Lampa.Storage.get('applecation_slideshow', true) || backdrops.length < 2) return;
        
        clearInterval(slideshowTimer);
        let index = 0;
        const quality = 'w1280';
        const interval = 8000; // Інтервал зміни зображень

        slideshowTimer = setInterval(() => {
            index++;
            if (index >= backdrops.length) index = 0;

            let backdropPath = backdrops[index].file_path;
            let imgUrl = Lampa.TMDB.image(`/t/p/${quality}${backdropPath}`);
            
            let currentBg = render.find('.full-start__background');
            if (!currentBg.length) return;

            let nextImg = new Image();
            nextImg.onload = function() {
                // Створюємо новий елемент фону для плавного переходу
                let newBg = $('<div class="full-start__background loaded"></div>');
                newBg.css({
                    'background-image': `url(${imgUrl})`,
                    'opacity': '0',
                    'z-index': '0',
                    'position': 'absolute',
                    'width': '100%',
                    'height': '100%',
                    'top': '0',
                    'left': '0',
                    'transition': 'opacity 1.5s ease-in-out'
                });

                currentBg.after(newBg);
                
                // Запускаємо анімацію появи
                setTimeout(() => {
                    newBg.css('opacity', '1');
                    currentBg.css('opacity', '0');
                    if ($('body').hasClass('applecation--zoom-enabled')) {
                        newBg.addClass('applecation-animated');
                    }
                }, 100);

                // Видаляємо старий елемент після завершення переходу
                setTimeout(() => {
                    currentBg.remove();
                }, 1600);
            };
            nextImg.src = imgUrl;
        }, interval);
    }

    // Масштабування елементів
    function applyScales() {  
        const logoScale = parseInt(Lampa.Storage.get('applecation_logo_scale', '100'));  
        const textScale = parseInt(Lampa.Storage.get('applecation_text_scale', '100'));  
        const spacingScale = parseInt(Lampa.Storage.get('applecation_spacing_scale', '100'));  
  
        $('style[data-id="applecation_scales"]').remove();  
  
        const scaleStyles = `  
            <style data-id="applecation_scales">  
                .applecation .applecation__logo img {  
                    max-width: ${35 * logoScale / 100}vw !important;  
                    max-height: ${180 * logoScale / 100}px !important;  
                }  
                .applecation .applecation__content-wrapper {  
                    font-size: ${textScale}% !important;  
                }  
                .applecation .full-start-new__title {  
                    margin-bottom: ${0.5 * spacingScale / 100}em !important;  
                }  
                .applecation .applecation__meta {  
                    margin-bottom: ${0.5 * spacingScale / 100}em !important;  
                }  
                .applecation .applecation__ratings {  
                    margin-bottom: ${0.5 * spacingScale / 100}em !important;  
                }  
                .applecation .applecation__description {  
                    max-width: ${35 * textScale / 100}vw !important;  
                    margin-bottom: ${0.5 * spacingScale / 100}em !important;  
                }  
                .applecation .applecation__info {  
                    margin-bottom: ${0.5 * spacingScale / 100}em !important;  
                }  
            </style>  
        `;  
        $('body').append(scaleStyles);  
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

    function getLogoQuality() {  
        const posterSize = Lampa.Storage.field('poster_size');  
        const qualityMap = { 'w200': 'w300', 'w300': 'w500', 'w500': 'original' };  
        return qualityMap[posterSize] || 'w500';  
    }
          // Оптимізована функція завантаження логотипа та запуск слайд-шоу
    function loadLogo(event) {  
        const data = event.data.movie;  
        const activity = event.object.activity;  
        if (!data || !activity) return;  
  
        const render = activity.render();  
        const ratingsContainer = render.find('.applecation__ratings');  
        const logoContainer = render.find('.applecation__logo');  
        const titleElement = render.find('.full-start-new__title');  
  
        // Заповнюємо базову інфо
        fillRatings(ratingsContainer, data);  
        fillMetaInfo(render, data);  
        fillAdditionalInfo(render, data);  
  
        waitForBackgroundLoad(activity, () => {  
            render.find('.applecation__meta').addClass('show');  
            render.find('.applecation__info').addClass('show');  
            render.find('.applecation__ratings').addClass('show');  
            render.find('.applecation__description').addClass('show');  
        });  
  
        const cacheKey = `${data.id}_${data.name ? 'tv' : 'movie'}`;  
        const mediaType = data.name ? 'tv' : 'movie';  
        const currentLang = 'uk';  
        const apiUrl = Lampa.TMDB.api(`${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
  
        const processImages = (imagesData) => {
            const currentActivity = Lampa.Activity.active();
            if (!currentActivity || currentActivity.component !== 'full') return;

            // 1. Логіка Логотипу
            const bestLogo = selectBestLogo(imagesData.logos, currentLang);  
            if (bestLogo) {  
                const logoUrl = Lampa.TMDB.image(`/t/p/${getLogoQuality()}${bestLogo.file_path}`);  
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

            // 2. Логіка Слайд-шоу (нова частина)
            if (imagesData.backdrops && imagesData.backdrops.length > 1) {
                // Беремо до 15 якісних фонів
                const slides = imagesData.backdrops.slice(0, 15);
                startSlideshow(render, slides);
            }
        };

        // Перевірка кешу
        if (logoCache.has(cacheKey)) {  
            processImages(logoCache.get(cacheKey));  
            return;  
        }  
  
        $.get(apiUrl, (imagesData) => {  
            logoCache.set(cacheKey, imagesData);  
            processImages(imagesData);
        }).fail(() => {  
            titleElement.show();  
            waitForBackgroundLoad(activity, () => {  
                logoContainer.addClass('loaded');  
            });  
        });  
    }

    // Заповнення рейтингів
    function fillRatings(ratingsContainer, data) {  
        const imdb = data.number_rating ? data.number_rating.imdb : (data.vote_average || 0);  
        const kp = data.number_rating ? data.number_rating.kp : 0;  
  
        if (imdb > 0) {  
            const imdbBlock = ratingsContainer.find('.rate--imdb');  
            imdbBlock.find('div').text(parseFloat(imdb).toFixed(1));  
            imdbBlock.removeClass('hide');  
        }  
  
        if (kp > 0) {  
            const kpBlock = ratingsContainer.find('.rate--kp');  
            kpBlock.find('div').text(parseFloat(kp).toFixed(1));  
            kpBlock.removeClass('hide');  
        }  
    }

    // Заповнення мета інформації  
    function fillMetaInfo(render, data) {  
        const metaTextContainer = render.find('.applecation__meta-text');  
        const metaParts = [];  
        const isTv = !!data.name;
        
        metaParts.push(isTv ? 'Серіал' : 'Фільм');  
  
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
            if (seasons) infoParts.push(formatSeasons(seasons));  
        } else {  
            if (data.runtime && data.runtime > 0) {  
                const hours = Math.floor(data.runtime / 60);  
                const minutes = data.runtime % 60;  
                const timeH = Lampa.Lang.translate('time_h').replace('.', '');  
                const timeM = Lampa.Lang.translate('time_m').replace('.', '');  
                const timeStr = hours > 0 ? `${hours} ${timeH} ${minutes} ${timeM}` : `${minutes} ${timeM}`;  
                infoParts.push(timeStr);  
            }  
        }  
        infoContainer.html(infoParts.join(' · '));  
    }  
  
    function formatSeasons(count) {  
        const cases = [2, 0, 1, 1, 1, 2];  
        const titles = ['сезон', 'сезони', 'сезонів'];  
        const caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];  
        return `${count} ${titles[caseIndex]}`;  
    }  
  
    // Завантаження іконки студії (з авто-корекцією кольору)
    function loadNetworkIcon(render, data) {  
        const networkContainer = render.find('.applecation__network');  
        if (Lampa.Storage.get('applecation_show_studio', true) === false) {  
            networkContainer.remove();  
            return;  
        }  
        const logos = [];  
        if (data.networks) {  
            data.networks.forEach(n => { if (n.logo_path) logos.push({ url: Lampa.Api.img(n.logo_path, 'w200'), name: n.name }); });  
        }  
        if (data.production_companies) {  
            data.production_companies.forEach(c => { if (c.logo_path) logos.push({ url: Lampa.Api.img(c.logo_path, 'w200'), name: c.name }); });  
        }  
          
        if (logos.length > 0) {  
            networkContainer.html(logos.map(l => `<img src="${l.url}" alt="${l.name}" data-original="true">`).join(''));  
            logos.forEach(logo => {  
                const img = new Image();  
                img.crossOrigin = 'anonymous';  
                img.onload = function() {  
                    const canvas = document.createElement('canvas');  
                    const ctx = canvas.getContext('2d');  
                    canvas.width = this.width; canvas.height = this.height;  
                    ctx.drawImage(this, 0, 0);  
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;  
                    let r = 0, g = 0, b = 0, cnt = 0, dark = 0;  
                    for (let i = 0; i < imgData.length; i += 4) {  
                        if (imgData[i+3] > 0) {  
                            const br = 0.299*imgData[i] + 0.587*imgData[i+1] + 0.114*imgData[i+2];  
                            r += imgData[i]; g += imgData[i+1]; b += imgData[i+2]; cnt++;  
                            if (br < 20) dark++;  
                        }  
                    }  
                    if (cnt > 0 && ( (0.299*r+0.587*g+0.114*b)/cnt < 25 && dark/cnt > 0.7 )) {  
                        networkContainer.find(`img[alt="${logo.name}"]`).css({'filter': 'brightness(0) invert(1) contrast(1.2)', 'opacity': '0.95'});  
                    }  
                };  
                img.src = logo.url;  
            });  
        } else networkContainer.remove();  
    }

    // Шаблони
    function addCustomTemplate() {  
        const ratingsPosition = Lampa.Storage.get('applecation_ratings_position', 'card');  
        const ratingsBlock = `<div class="applecation__ratings">  
                        <div class="rate--imdb hide"><svg viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M4 7c-1.103 0-2 .897-2 2v6.4c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2H4Zm1.4 2.363h1.275v5.312H5.4V9.362Zm1.962 0H9l.438 2.512.287-2.512h1.75v5.312H10.4v-3l-.563 3h-.8l-.512-3v3H7.362V9.362Zm8.313 0H17v1.2c.16-.16.516-.363.875-.363.36.04.84.283.8.763v3.075c0 .24-.075.404-.275.524-.16.04-.28.075-.6.075-.32 0-.795-.196-.875-.237-.08-.04-.163.275-.163.275h-1.087V9.362Zm-3.513.037H13.6c.88 0 1.084.078 1.325.237.24.16.35.397.35.838v3.2c0 .32-.15.563-.35.762-.2.2-.484.288-1.325.288h-1.438V9.4Zm1.275.8v3.563c.2 0 .488.04.488-.2v-3.126c0-.28-.247-.237-.488-.237Zm3.763.675c-.12 0-.2.08-.2.2v2.688c0 .159.08.237.2.237.12 0 .2-.117.2-.238l-.037-2.687c0-.12-.043-.2-.163-.2Z"/></svg><div>0.0</div></div>  
                        <div class="rate--kp hide"><svg viewBox="0 0 192 192" fill="none"><path d="M96.5 20 66.1 75.733V20H40.767v152H66.1v-55.733L96.5 172h35.467C116.767 153.422 95.2 133.578 80 115c28.711 16.889 63.789 35.044 92.5 51.933v-30.4C148.856 126.4 108.644 115.133 85 105c23.644 3.378 63.856 7.889 87.5 11.267v-30.4L85 90c27.022-11.822 60.478-22.711 87.5-34.533v-30.4C143.789 41.956 108.711 63.11 80 80l51.967-60z" style="stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;"/></svg><div>0.0</div></div>  
                    </div>`;  
  
        const template = `<div class="full-start-new applecation">  
        <div class="full-start-new__body">  
            <div class="full-start-new__right">  
                <div class="applecation__left">  
                    <div class="applecation__logo"></div>  
                    <div class="applecation__content-wrapper">  
                        <div class="full-start-new__title" style="display: none;">{title}</div>  
                        <div class="applecation__meta">  
                            <div class="applecation__meta-left"><span class="applecation__network"></span><span class="applecation__meta-text"></span><div class="full-start__pg hide"></div></div>  
                        </div>  
                        ${ratingsPosition === 'card' ? ratingsBlock : ''}  
                        <div class="applecation__description-wrapper"><div class="applecation__description">{overview}</div></div>  
                        <div class="applecation__info"></div>  
                    </div>  
                    <div class="full-start-new__buttons">
                        <div class="full-start__button selector button--play"><span>#{title_watch}</span></div>
                        <div class="full-start__button selector button--book"><span>#{settings_input_links}</span></div>
                        <div class="full-start__button selector button--options"><svg width="38" height="10" fill="none"><circle cx="4.88" cy="4.98" r="4.75" fill="currentColor"/><circle cx="18.97" cy="4.98" r="4.75" fill="currentColor"/><circle cx="33.05" cy="4.98" r="4.75" fill="currentColor"/></svg></div>
                    </div>
                </div>  
                <div class="applecation__right">  
                    ${ratingsPosition === 'corner' ? ratingsBlock : ''}  
                </div>  
            </div>  
        </div>  
    </div>`;  
        Lampa.Template.add('full_start_new', template);  
                    }
      // Стилі з оптимізаціями та анімацією слайд-шоу
    function addStyles() {  
        const styles = `<style>  
            .applecation .full-start-new__body { height: 80vh; }  
            .applecation .full-start-new__right { display: flex; align-items: flex-end; }  
            .applecation__logo { margin-bottom: 0.5em; opacity: 0; transform: translateY(20px); transition: all 0.4s ease-out; }  
            .applecation__logo.loaded { opacity: 1; transform: translateY(0); }  
            .applecation__logo img { display: block; max-width: 35vw; max-height: 180px; object-fit: contain; }  
            .applecation__meta { display: flex; align-items: center; font-size: 1.1em; opacity: 0; transition: opacity 0.3s ease-out; }  
            .applecation__meta.show { opacity: 1; }  
            .applecation__network img { max-height: 1.4em; margin-right: 0.5em; }  
            .applecation__ratings { display: flex; gap: 0.8em; opacity: 0; transition: all 0.4s ease-out; }  
            .applecation__ratings.show { opacity: 1; }  
            .applecation__ratings svg { width: 1.5em; height: auto; vertical-align: middle; }  
            .applecation__description { color: rgba(255, 255, 255, 0.6); font-size: 0.95em; line-height: 1.5; max-width: 35vw; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; opacity: 0; transition: all 0.4s 0.1s; }  
            .applecation__description.show { opacity: 1; }  
            
            /* Базовий стиль фону для підтримки слайд-шоу */
            .full-start__background { 
                position: absolute; width: 100%; height: 100%; top: 0; left: 0;
                background-size: cover; background-position: center;
                transition: opacity 1.5s ease-in-out !important; 
                will-change: transform, opacity;
            }

            @keyframes kenBurns {  
                0% { transform: scale(1.0); }  
                50% { transform: scale(1.1); }  
                100% { transform: scale(1.0); }  
            }  
            body.applecation--zoom-enabled .full-start__background.loaded:not(.dim) {  
                animation: kenBurns 40s linear infinite !important;  
            }  
            body.applecation--hide-ratings .applecation__ratings { display: none !important; }
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

    function updateZoomState() {  
        let enabled = Lampa.Storage.get('applecation_apple_zoom', true);  
        $('body').toggleClass('applecation--zoom-enabled', enabled);     
    }

    function waitForBackgroundLoad(activity, callback) {
        const bg = activity.render().find('.full-start__background');
        if (bg.hasClass('loaded')) callback();
        else {
            let timer = setInterval(() => {
                if (bg.hasClass('loaded')) { clearInterval(timer); callback(); }
            }, 100);
            setTimeout(() => { clearInterval(timer); callback(); }, 2000);
        }
    }

    function attachLogoLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {
                clearInterval(slideshowTimer);
                setTimeout(() => loadLogo(event), 150);
            }
        });  
    }  
  
    function registerPlugin() {  
        const manifest = { type: 'other', version: '1.2.0', name: 'NewCard + Slideshow', description: 'Дизайн картки зі слайд-шоу фонів.', author: 'Gemini', icon: PLUGIN_ICON };  
        if (Lampa.Manifest) Lampa.Manifest.plugins['newcard'] = manifest;  
    }  
  
    function startPlugin() { registerPlugin(); initializePlugin(); }  
  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });  
})();

