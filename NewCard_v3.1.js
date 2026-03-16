(function () {    
    'use strict';    
    
    // Іконка плагіна    
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="8" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="8" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>';    
    
    let logoCache = new Map();    
    let logoQueue = [];    
    let isProcessingQueue = false;    
    let rafId = null;    
    let scaleUpdateTimeout = null;    
    
    // Іконки якості    
    const pluginPath = 'https://crowley24.github.io/Icons/';    
    const svgIcons = {    
        '4K': pluginPath + '4K.svg',    
        '2K': pluginPath + '2K.svg',    
        'FULL HD': pluginPath + 'FULL HD.svg',    
        'HD': pluginPath + 'HD.svg',    
        'HDR': pluginPath + 'HDR.svg',    
        'Dolby Vision': pluginPath + 'Dolby Vision.svg',    
        '7.1': pluginPath + '7.1.svg',    
        '5.1': pluginPath + '5.1.svg',    
        '4.0': pluginPath + '4.0.svg',    
        '2.0': pluginPath + '2.0.svg',    
        'DUB': pluginPath + 'DUB.svg',    
        'UKR': pluginPath + 'UKR.svg'    
    };    
    
    const ratingIcons = {    
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',    
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'    
    };    
    
    // Оптимізована функція відображення логотипа    
    function displayLogo(logoContainer, titleElement, activity, logoUrl = null) {    
        if (logoUrl) {    
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
    }    
    
    // Оптимізована перевірка активності    
    function isValidActivity() {    
        const currentActivity = Lampa.Activity.active();    
        return currentActivity && currentActivity.component === 'full';    
    }    
    
    // Оптимізована обробка черги логотипів    
    function processLogoQueue() {    
        if (isProcessingQueue || logoQueue.length === 0) return;    
            
        isProcessingQueue = true;    
        const { cacheKey, mediaType, id, resolve, reject } = logoQueue.shift();    
            
        const apiUrl = Lampa.TMDB.api(`${mediaType}/${id}/images?api_key=${Lampa.TMDB.key()}`);    
            
        $.get(apiUrl)    
            .done((imagesData) => {    
                logoCache.set(cacheKey, imagesData);    
                resolve(imagesData);    
            })    
            .fail(reject)    
            .always(() => {    
                isProcessingQueue = false;    
                setTimeout(processLogoQueue, 100);    
            });    
    }    
    
    function loadLogoFromQueue(cacheKey, mediaType, id) {    
        return new Promise((resolve, reject) => {    
            logoQueue.push({ cacheKey, mediaType, id, resolve, reject });    
            processLogoQueue();    
        });    
    }    
    
    // Оптимізована функція завантаження логотипа з кешуванням DOM    
    function loadLogo(event) {    
        const data = event.data.movie;    
        const activity = event.object.activity;    
        if (!data || !activity || !isValidActivity()) return;    
    
        const render = activity.render();    
            
        // Кешуємо DOM елементи    
        const elements = {    
            logoContainer: render.find('.applecation__logo'),    
            titleElement: render.find('.full-start-new__title'),    
            metaText: render.find('.applecation__meta-text'),    
            infoContainer: render.find('.applecation__info'),    
            metaContainer: render.find('.applecation__meta'),    
            descriptionContainer: render.find('.applecation__description')    
        };    
    
        // Заповнюємо контент    
        fillMetaInfo(elements, data);    
        fillAdditionalInfo(elements, data);    
    
        // Додаємо студії та рейтинги    
        const infoBlock = $('<div class="plugin-info-block"></div>');    
        elements.logoContainer.after(infoBlock);    
        renderStudioLogos(infoBlock, data);    
        renderRatings(infoBlock, event);    
    
        // Показуємо контент після завантаження фону    
        waitForBackgroundLoad(activity, () => {    
            render.find('.applecation__meta, .applecation__info, .applecation__description, .studio-row, .plugin-ratings-row, .quality-row-inline')    
                .addClass('show');    
        });    
    
        // Перевіряємо кеш    
        const cacheKey = `${data.id}_${data.name ? 'tv' : 'movie'}`;    
        if (logoCache.has(cacheKey)) {    
            const cached = logoCache.get(cacheKey);    
            const bestLogo = selectBestLogo(cached.logos, 'uk');    
            const logoUrl = bestLogo ? Lampa.TMDB.image(`/t/p/${getLogoQuality()}${bestLogo.file_path}`) : null;    
            displayLogo(elements.logoContainer, elements.titleElement, activity, logoUrl);    
            return;    
        }    
    
        // Завантажуємо з API через чергу    
        const mediaType = data.name ? 'tv' : 'movie';    
        loadLogoFromQueue(cacheKey, mediaType, data.id)    
            .then((imagesData) => {    
                if (!isValidActivity()) return;    
                const bestLogo = selectBestLogo(imagesData.logos, 'uk');    
                const logoUrl = bestLogo ? Lampa.TMDB.image(`/t/p/${getLogoQuality()}${bestLogo.file_path}`) : null;    
                displayLogo(elements.logoContainer, elements.titleElement, activity, logoUrl);    
            })    
            .catch(() => {    
                if (!isValidActivity()) return;    
                displayLogo(elements.logoContainer, elements.titleElement, activity);    
            });    
    }    
    
    // Функції для роботи з рейтингами (виправлена версія)    
    function getRatingColor(val) {    
        const n = parseFloat(val);    
        if (n >= 7.5) return '#2ecc71';    
        if (n >= 6) return '#feca57';    
        if (n >= 4) return '#ff9ff3';    
        return '#ff6b6b';    
    }    
    
    function formatTime(mins) {    
        if (!mins) return '';    
        const h = Math.floor(mins / 60);    
        const m = mins % 60;    
        return (h > 0 ? h + 'г ' : '') + m + 'хв';    
    }    
    
    function getCubRating(e) {    
        try {    
            const r = e.data.movie.cub ? e.data.movie.cub : {};    
            return r.rating ? parseFloat(r.rating).toFixed(1) : null;    
        } catch (err) {    
            return null;    
        }    
    }    
    
    function getBestResults(results) {    
        var best = { score: 0 };    
        results.forEach(function (r) {    
            var score = 0;    
            if (r.quality) {    
                if (r.quality.indexOf('2160p') >= 0) score += 4;    
                else if (r.quality.indexOf('1080p') >= 0) score += 3;    
                else if (r.quality.indexOf('720p') >= 0) score += 2;    
                else if (r.quality.indexOf('480p') >= 0) score += 1;    
            }    
            if (r.size && parseFloat(r.size.replace('GB', '')) > 5) score += 1;    
            if (r.voice && r.voice.indexOf('UA') >= 0) score += 2;    
            if (r.trailler && r.trailler.length) score += 1;    
            if (r.seeders && parseInt(r.seeders) > 0) score += 1;    
            if (score > best.score) best = r;    
        });    
        return best;    
    }    
    
    // Функція відображення логотипів студій (виправлена версія)    
    function renderStudioLogos(container, movie) {    
        if (!Lampa.Storage.get('applecation_show_studios', true)) return;    
    
        const $row = $('<div class="studio-row"></div>');    
        container.append($row);    
    
        if (movie.production_companies && movie.production_companies.length) {    
            movie.production_companies.slice(0, 4).forEach(function (studio) {    
                if (studio.logo_path) {    
                    const logoUrl = Lampa.TMDB.image('/t/p/h30' + studio.logo_path);    
                    $row.append('<img src="' + logoUrl + '" alt="' + studio.name + '">');    
                }    
            });    
        }    
    }    
    
    // Функція відображення рейтингів (виправлена версія)    
    function renderRatings(container, e) {    
        if (!Lampa.Storage.get('applecation_show_ratings', true)) return;    
    
        const $row = $('<div class="plugin-ratings-row"></div>');    
        const sep = '<span class="info-separator">•</span>';    
        container.append($row);    
    
        const tmdb = (e.data.movie.vote_average || 0).toFixed(1);    
        if (tmdb > 0) {    
            $row.append('<div class="plugin-rating-item"><img src="'+ratingIcons.tmdb+'"> <span style="color:'+getRatingColor(tmdb)+'">'+tmdb+'</span></div>');    
        }    
            
        const cub = getCubRating(e);    
        if (cub) {    
            if ($row.children().length > 0) $row.append(sep);    
            $row.append('<div class="plugin-rating-item"><img src="' + ratingIcons.cub + '"> <span style="color:' + getRatingColor(cub) + '">' + cub + '</span></div>');    
        }    
            
        const runtime = e.data.movie.runtime || (e.data.movie.episode_run_time ? e.data.movie.episode_run_time[0] : 0);    
        if (runtime) {    
            if ($row.children().length > 0) $row.append(sep);    
            $row.append('<div class="info-text-item">' + formatTime(runtime) + '</div>');    
        }    
    
        if (e.data.movie.genres && e.data.movie.genres.length > 0) {    
            if ($row.children().length > 0) $row.append(sep);    
            const genres = e.data.movie.genres.slice(0, 2).map(g => g.name).join(', ');    
            $row.append('<div class="info-text-item">' + genres + '</div>');    
        }    
    
        // Рядок якості    
        if (Lampa.Storage.get('applecation_show_quality', true) && Lampa.Parser.get) {    
            const $qRow = $('<div class="quality-row-inline"></div>');    
            container.append($qRow);    
                
            Lampa.Parser.get({ search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 }, function(res) {    
                if (res && res.Results) {    
                    const b = getBestResults(res.Results), list = [];    
                    if (b.resolution) list.push(b.resolution);    
                    if (b.dolbyVision) list.push('Dolby Vision'); else if (b.hdr) list.push('HDR');    
                    if (b.dub) list.push('DUB'); if (b.ukr) list.push('UKR');    
                    list.forEach(function(t) { if (svgIcons[t]) $qRow.append('<div class="quality-item"><img src="'+svgIcons[t]+'"></div>'); });    
                }    
            });    
        }    
    }    
    
    // Функції заповнення даних    
    function getMediaType(data) {    
        const isTv = !!data.name;    
        const types = {    
            uk: isTv ? 'Серіал' : 'Фільм',    
        };    
        return types['uk'];             
    }    
    
    function fillMetaInfo(elements, data) {    
        const metaParts = [];    
    
        metaParts.push(getMediaType(data));    
    
        if (data.genres && data.genres.length) {    
            const genres = data.genres.slice(0, 2).map(g =>         
                Lampa.Utils.capitalizeFirstLetter(g.name)    
            );    
            metaParts.push(...genres);    
        }    
    
        elements.metaText.html(metaParts.join(' · '));    
    }    
    
    function fillAdditionalInfo(elements, data) {    
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
    
        elements.infoContainer.html(infoParts.join(' · '));    
    }    
    
    function formatSeasons(count) {    
        const cases = [2, 0, 1, 1, 1, 2];    
        const titles = ['сезон', 'сезони', 'сезонів'];    
                    
        const caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];    
                    
        return `${count} ${titles[caseIndex]}`;    
    }    
    
    // Оптимізована функція очікування завантаження фону    
    function waitForBackgroundLoad(activity, callback) {    
        const background = activity.render().find('.full-start__background')[0];    
                    
        if (!background) {    
            callback();    
            return;    
        }    
    
        const complete = () => {    
            background.classList.add('applecation-animated');    
            callback();    
        };    
    
        if (background.classList.contains('loaded')) {    
            requestAnimationFrame(() => {    
                setTimeout(complete, 100);    
            });    
            return;    
        }    
    
        // Використовуємо IntersectionObserver для кращої продуктивності    
        if (typeof IntersectionObserver !== 'undefined') {    
            const observer = new IntersectionObserver((entries) => {    
                entries.forEach(entry => {    
                    if (entry.isIntersecting && entry.target.classList.contains('loaded')) {    
                        observer.disconnect();    
                        requestAnimationFrame(() => {    
                            setTimeout(complete, 100);    
                        });    
                    }    
                });    
            }, { threshold: 0.1 });    
    
            observer.observe(background);    
              
            // Запасний таймаут    
            setTimeout(() => {    
                observer.disconnect();    
                if (!background.classList.contains('applecation-animated')) {    
                    complete();    
                }    
            }, 1000);    
        } else {    
            // Спрощений fallback    
            const checkLoad = () => {    
                if (background.classList.contains('loaded')) {    
                    requestAnimationFrame(() => {    
                        setTimeout(complete, 100);    
                    });    
                } else {    
                    requestAnimationFrame(checkLoad);    
                }    
            };    
            checkLoad();    
        }    
    }    
    
    // Оптимізований дебаунс з requestAnimationFrame    
    function attachLogoLoader() {    
        Lampa.Listener.follow('full', (event) => {    
            if (event.type === 'complite') {    
                if (rafId) cancelAnimationFrame(rafId);    
                  
                rafId = requestAnimationFrame(() => {    
                    if (isValidActivity()) {    
                        loadLogo(event);    
                    }    
                });    
            }    
        });    
    }    
    
    // Функція патчу API    
    function patchApiImg() {    
        if (!Lampa.TMDB.image) return;    
        // Зберігаємо оригінальну функцію    
        const originalImage = Lampa.TMDB.image;    
        Lampa.TMDB.image = function(path) {    
            return originalImage.call(this, path);    
        };    
    }    
    
    // Шаблон    
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
                                <div class="full-start__pg hide"></div>    
                            </div>    
                        </div>    
                                
                        <div class="applecation__description-wrapper">    
                            <div class="applecation__description"></div>    
                        </div>    
                        <div class="applecation__info"></div>    
                    </div>    
                            
                    <div class="full-start-new__head" style="display: none;"></div>    
                    <div class="full-start-new__details" style="display: none;"></div>    
    
                    <div class="full-start-new__buttons">    
                        <div class="full-start__button selector button--play">    
                            <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">    
                                <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>    
                                <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>    
                            </svg>    
                            <span>#{title_watch}</span>    
                        </div>    
    
                        <div class="full-start__button selector button--book">    
                            <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">    
                                <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>    
                            </svg>    
                            <span>#{settings_input_links}</span>    
                        </div>    
    
                        <div class="full-start__button selector button--reaction">    
                            <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">    
                                <path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/>    
                                <path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/>    
                            </svg>    
                            <span>#{title_reactions}</span>    
                        </div>    
    
                        <div class="full-start__button selector button--subscribe hide">    
                            <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">    
                                <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>    
                                <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>    
                            </svg>    
                            <span>#{title_subscribe}</span>    
                        </div>    
    
                        <div class="full-start__button selector button--options">    
                            <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg">    
                                <circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/>    
                                <circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/>    
                                <circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/>    
                            </svg>    
                        </div>    
                    </div>    
                </div>    
    
                <div class="applecation__right">    
                    <div class="full-start-new__reactions selector">    
                        <div>#{reactions_none}</div>    
                    </div>    
                            
                    <div class="full-start-new__rate-line">    
                        <div class="full-start__status hide"></div>    
                    </div>    
                            
                    <div class="rating--modss" style="display: none;"></div>    
                </div>    
            </div>    
        </div>    
    
        <div class="hide buttons--container">    
            <div class="full-start__button view--torrent hide">    
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50px" height="50px">    
                    <path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862c-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/>    
                </svg>    
                <span>#{full_torrents}</span>    
            </div>    
                  
            <div class="full-start__button selector view--trailer">    
                <svg height="70" viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg">    
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"/>    
                </svg>    
                <span>#{full_trailers}</span>    
            </div>    
        </div>    
    </div>`;    
    
        Lampa.Template.add('full_start_new', template);    
    
        // Шаблон епізода    
        const episodeTemplate = `<div class="full-episode selector layer--visible">    
            <div class="full-episode__img">    
                <img />    
                <div class="full-episode__time">{time}</div>    
            </div>    
            <div class="full-episode__body">    
                <div class="full-episode__num">#{full_episode} {num}</div>    
                <div class="full-episode__name">{name}</div>    
                <div class="full-episode__overview">{overview}</div>    
                <div class="full-episode__date">{date}</div>    
            </div>    
        </div>`;    
            
        Lampa.Template.add('full_episode', episodeTemplate);    
    }    
    
    // Стилі з оптимізаціями    
    function addStyles() {    
        const styles = `<style>    
/* Основний контейнер */    
.applecation {    
    transition: all .3s;    
}    
    
.applecation .full-start-new__body {    
    height: 80vh;    
}    
    
.applecation .full-start-new__right {    
    display: flex;    
    align-items: flex-end;    
}    
    
.applecation .full-start-new__title {    
    font-size: 2.5em;    
    font-weight: 700;    
    line-height: 1.2;    
    margin-bottom: 0.5em;    
    text-shadow: 0 0 .1em rgba(0, 0, 0, 0.3);    
}    
    
/* Логотип з GPU прискоренням */    
.applecation__logo {    
    margin-bottom: 0.5em;    
    opacity: 0;    
    transform: translateY(20px);    
    transition: transform 0.4s ease-out;    
    will-change: transform;       
}    
    
.applecation__logo.loaded {    
    opacity: 1;    
    transform: translateY(0);    
}    
    
.applecation__logo img {    
    display: block;    
    max-width: 35vw;    
    width: auto;    
    height: auto;    
    object-fit: contain;    
    object-position: left center;    
    max-height: 180px;    
}    
    
/* Мета інформація */    
.applecation__meta {    
    display: flex;    
    align-items: center;    
    color: #fff;    
    font-size: 1.1em;    
    margin-bottom: 0.5em;    
    line-height: 1;    
    opacity: 0;    
    transform: translateY(15px);    
    transition: opacity 0.3s ease-out;    
    will-change: opacity;    
}    
    
.applecation__meta.show {    
    opacity: 1;    
    transform: translateY(0);    
}    
    
.applecation__meta-left {    
    display: flex;    
    align-items: center;    
    line-height: 1;    
}    
    
.applecation__network {    
    display: inline-flex;    
    align-items: center;    
    gap: 0.5em;    
    line-height: 1;    
}    
    
.applecation__network img {    
    display: block;    
    max-height: 1.4em;    
    width: auto;    
    object-fit: contain;    
    transition: filter 0.3s ease;    
}    
    
.applecation__meta-text {    
    margin-left: 1em;    
    line-height: 1;    
}    
    
.applecation__meta .full-start__pg {    
    margin: 0 0 0 0.6em;    
    padding: 0.2em 0.5em;    
    font-size: 0.85em;    
    font-weight: 600;    
    border: 1.5px solid rgba(255, 255, 255, 0.4);    
    border-radius: 0.3em;    
    background: rgba(255, 255, 255, 0.1);    
    color: rgba(255, 255, 255, 0.9);    
    line-height: 1;    
    vertical-align: middle;    
}    
    
/* Опис */    
.applecation__description {    
    color: rgba(255, 255, 255, 0.6);    
    font-size: 0.95em;    
    line-height: 1.5;    
    margin-bottom: 0.5em;    
    max-width: 35vw;    
    display: -webkit-box;    
    -webkit-line-clamp: 4;    
    -webkit-box-orient: vertical;    
    overflow: hidden;    
    text-overflow: ellipsis;    
    opacity: 0;    
    transform: translateY(15px);    
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;    
    transition-delay: 0.1s;    
    will-change: opacity, transform;    
}    
    
.applecation__description.show {    
    opacity: 1;    
    transform: translateY(0);    
}    
    
/* Додаткова інформація */    
.applecation__info {    
    color: rgba(255, 255, 255, 0.75);    
    font-size: 1em;    
    line-height: 1.4;    
    margin-bottom: 0.5em;    
    opacity: 0;    
    transform: translateY(15px);    
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;    
    transition-delay: 0.15s;    
    will-change: opacity, transform;    
}    
    
.applecation__info.show {    
    opacity: 1;    
    transform: translateY(0);    
}    
    
/* Ліва і права частини */    
.applecation__left {    
    flex-grow: 1;    
}    
    
.applecation__right {    
    display: flex;    
    align-items: flex-end;    
    flex-shrink: 0;    
    position: relative;    
}    
    
/* Реакції */    
.applecation .full-start-new__reactions {    
    margin: 0;    
    display: flex;    
    flex-direction: column-reverse;    
    align-items: flex-end;    
}    
    
.applecation .full-start-new__reactions > div {    
    align-self: flex-end;    
}    
    
.applecation .full-start-new__reactions:not(.focus) {    
    margin: 0;    
}    
    
.applecation .full-start-new__reactions:not(.focus) > div:not(:first-child) {    
    display: none;    
}    
    
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
.applecation__description {    
    position: relative;    
    z-index: 1;    
}    
    
/* Стилі для студій */    
.studio-row {    
    display: flex;    
    align-items: center;    
    gap: 0.8em;    
    margin-bottom: 0.5em;    
    opacity: 0;    
    transform: translateY(15px);    
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;    
    transition-delay: 0.2s;    
    will-change: transform, opacity;    
}    
    
.studio-row.show {    
    opacity: 1;    
    transform: translateY(0);    
}    
    
.studio-row img {    
    height: 1.8em;    
    width: auto;    
    object-fit: contain;    
    filter: brightness(0) invert(1);    
    opacity: 0.8;    
    transition: opacity 0.3s ease;    
}    
    
.studio-row img:hover {    
    opacity: 1;    
}    
    
/* Стилі для рейтингів */    
.plugin-ratings-row {    
    display: flex;    
    align-items: center;    
    gap: 0.8em;    
    margin-bottom: 0.5em;    
    opacity: 0;    
    transform: translateY(15px);    
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;    
    transition-delay: 0.25s;    
    will-change: transform, opacity;    
    font-size: 0.9em;    
}    
    
.plugin-ratings-row.show {    
    opacity: 1;    
    transform: translateY(0);    
}    
    
.plugin-rating-item {    
    display: flex;    
    align-items: center;  
    gap: 0.3em;    
}    
    
.plugin-rating-item img {    
    width: 1.2em;    
    height: 1.2em;    
}    
    
.info-separator {    
    color: rgba(255, 255, 255, 0.4);    
    font-weight: 300;    
}    
    
.info-text-item {    
    color: rgba(255, 255, 255, 0.8);    
}    
    
/* Стилі для якості */    
.quality-row-inline {    
    display: flex;    
    align-items: center;    
    gap: 0.5em;    
    margin-bottom: 0.5em;    
    opacity: 0;    
    transform: translateY(15px);    
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;    
    transition-delay: 0.3s;    
    will-change: transform, opacity;    
}    
    
.quality-row-inline.show {    
    opacity: 1;    
    transform: translateY(0);    
}    
    
.quality-item {    
    display: flex;    
    align-items: center;    
    justify-content: center;    
}    
    
.quality-item img {    
    width: 2em;    
    height: auto;    
    object-fit: contain;    
}    
</style>`;    
    
        $('body').append(styles);    
    }    
    
    // Оптимізована функція очікування завантаження фону    
    function waitForBackgroundLoad(activity, callback) {    
        const background = activity.render().find('.full-start__background')[0];    
                    
        if (!background) {    
            callback();    
            return;    
        }    
    
        const complete = () => {    
            background.classList.add('applecation-animated');    
            callback();    
        };    
    
        if (background.classList.contains('loaded')) {    
            requestAnimationFrame(() => {    
                setTimeout(complete, 100);    
            });    
            return;    
        }    
    
        // Використовуємо IntersectionObserver для кращої продуктивності    
        if (typeof IntersectionObserver !== 'undefined') {    
            const observer = new IntersectionObserver((entries) => {    
                entries.forEach(entry => {    
                    if (entry.isIntersecting && entry.target.classList.contains('loaded')) {    
                        observer.disconnect();    
                        requestAnimationFrame(() => {    
                            setTimeout(complete, 100);    
                        });    
                    }    
                });    
            }, { threshold: 0.1 });    
    
            observer.observe(background);    
              
            // Запасний таймаут    
            setTimeout(() => {    
                observer.disconnect();    
                if (!background.classList.contains('applecation-animated')) {    
                    complete();    
                }    
            }, 1000);    
        } else {    
            // Спрощений fallback    
            const checkLoad = () => {    
                if (background.classList.contains('loaded')) {    
                    requestAnimationFrame(() => {    
                        setTimeout(complete, 100);    
                    });    
                } else {    
                    requestAnimationFrame(checkLoad);    
                }    
            };    
            checkLoad();    
        }    
    }    
    
    // Оптимізований дебаунс з requestAnimationFrame    
    function attachLogoLoader() {    
        Lampa.Listener.follow('full', (event) => {    
            if (event.type === 'complite') {    
                if (rafId) cancelAnimationFrame(rafId);    
                  
                rafId = requestAnimationFrame(() => {    
                    if (isValidActivity()) {    
                        loadLogo(event);    
                    }    
                });    
            }    
        });    
    }    
    
    // Головна функція плагіна    
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
    
    // Переклади    
    const translations = {    
        logo_scale: { uk: 'Розмір логотипу' },    
        logo_scale_desc: { uk: 'Масштаб логотипу фільму' },    
        text_scale: { uk: 'Розмір тексту' },    
        text_scale_desc: { uk: 'Масштаб тексту даних про фільм' },    
        scale_default: { uk: 'За замовчуванням' },    
        spacing_scale: { uk: 'Відступи між рядками' },    
        spacing_scale_desc: { uk: 'Відстань між елементами інформації' },    
        settings_title_display: { uk: 'Відображення' },    
        settings_title_scaling: { uk: 'Масштабування' },    
        show_studios: { uk: 'Показувати логотипи студій' },    
        show_studios_desc: { uk: 'Відображати логотипи кіностудій під логотипом фільму' },    
        show_ratings: { uk: 'Показувати рейтинги' },    
        show_ratings_desc: { uk: 'Відображати рейтинги та тривалість' },    
        show_quality: { uk: 'Показувати якість' },    
        show_quality_desc: { uk: 'Відображати іконки якості відео' }    
    };    
    
    function t(key) {    
        return translations[key]?.['uk'] || '???';    
    }    
    
    // Функції керування    
    function updateZoomState() {    
        let enabled = Lampa.Storage.get('applecation_apple_zoom', true);    
        $('body').toggleClass('applecation--zoom-enabled', enabled);           
    }    
    
    // Налаштування    
    function addSettings() {    
        // Ініціалізація значень за замовчуванням    
        const defaults = {    
            'applecation_logo_scale': '100',    
            'applecation_text_scale': '100',    
            'applecation_spacing_scale': '100',    
            'applecation_apple_zoom': true,    
            'applecation_show_studios': true,    
            'applecation_show_ratings': true,    
            'applecation_show_quality': true    
        };    
    
        Object.entries(defaults).forEach(([key, value]) => {    
            if (Lampa.Storage.get(key, 'unset') === 'unset') {    
                Lampa.Storage.set(key, value);    
            }    
        });    
    
        Lampa.SettingsApi.addComponent({    
            component: 'newcard',    
            name: t('settings_title_display'),    
            icon: PLUGIN_ICON    
        });    
    
        Lampa.SettingsApi.addParam({    
            component: 'newcard',    
            param: {    
                name: 'applecation_show_studios',    
                type: 'trigger',    
                default: true    
            },    
            field: {    
                name: t('show_studios'),    
                description: t('show_studios_desc')    
            }    
        });    
    
        Lampa.SettingsApi.addParam({    
            component: 'newcard',    
            param: {    
                name: 'applecation_show_ratings',    
                type: 'trigger',    
                default: true    
            },    
            field: {    
                name: t('show_ratings'),    
                description: t('show_ratings_desc')    
            }    
        });    
    
        Lampa.SettingsApi.addParam({    
            component: 'newcard',    
            param: {    
                name: 'applecation_show_quality',    
                type: 'trigger',    
                default: true    
            },    
            field: {    
                name: t('show_quality'),    
                description: t('show_quality_desc')    
            }    
        });    
    
        Lampa.SettingsApi.addComponent({    
            component: 'newcard_scaling',    
            name: t('settings_title_scaling'),    
            icon: PLUGIN_ICON    
        });    
    
        Lampa.SettingsApi.addParam({    
            component: 'newcard_scaling',    
            param: {    
                name: 'applecation_logo_scale',    
                type: 'select',    
                values: {    
                    '80': '80%',    
                    '90': '90%',    
                    '100': t('scale_default'),    
                    '110': '110%',    
                    '120': '120%',    
                    '130': '130%',    
                    '140': '140%',    
                    '150': '150%'    
                },    
                default: '100'    
            },    
            field: {    
                name: t('logo_scale'),    
                description: t('logo_scale_desc')    
            },    
            onChange: applyScales    
        });    
    
        Lampa.SettingsApi.addParam({    
            component: 'newcard_scaling',    
            param: {    
                name: 'applecation_text_scale',    
                type: 'select',    
                values: {    
                    '80': '80%',    
                    '90': '90%',    
                    '100': t('scale_default'),    
                    '110': '110%',    
                    '120': '120%',    
                    '130': '130%',    
                    '140': '140%',    
                    '150': '150%'    
                },    
                default: '100'    
            },    
            field: {    
                name: t('text_scale'),    
                description: t('text_scale_desc')    
            },    
            onChange: applyScales    
        });    
    
        Lampa.SettingsApi.addParam({    
            component: 'newcard_scaling',    
            param: {    
                name: 'applecation_spacing_scale',    
                type: 'select',    
                values: {    
                    '50': '50%',    
                    '75': '75%',    
                    '100': t('scale_default'),    
                    '125': '125%',    
                    '150': '150%',    
                    '175': '175%',    
                    '200': '200%'    
                },    
                default: '100'    
            },    
            field: {    
                name: t('spacing_scale'),    
                description: t('spacing_scale_desc')    
            },    
            onChange: applyScales    
        });    
    
        Lampa.SettingsApi.addParam({    
            component: 'newcard_scaling',    
            param: {    
                name: 'applecation_apple_zoom',    
                type: 'trigger',    
                default: true    
            },    
            field: {    
                name: 'Анімація фону',    
                description: 'Ефект Ken Burns для фону картки'    
            },    
            onChange: updateZoomState    
        });    
    
        updateZoomState();    
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

    
  
