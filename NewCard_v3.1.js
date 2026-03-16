(function () {  
    'use strict';  
  
    // Іконка плагіна  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="8" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="8" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>';  
  
    let logoCache = new Map();  
    let logoQueue = [];  
    let isProcessingQueue = false;  
    let rafId = null;  
    let scaleUpdateTimeout = null;  
  
    // Нові змінні для студій та рейтингів  
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
                logoContainer.addClass('loaded');  
            };  
            img.onerror = () => {  
                titleElement.show();  
                logoContainer.addClass('loaded');  
            };  
            img.src = logoUrl;  
        } else {  
            titleElement.show();  
            logoContainer.addClass('loaded');  
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
                if (logoQueue.length > 0) {  
                    setTimeout(processLogoQueue, 100);  
                }  
            });  
    }  
  
    // Завантаження логотипа через чергу  
    function loadLogoFromQueue(cacheKey, mediaType, id) {  
        return new Promise((resolve, reject) => {  
            logoQueue.push({ cacheKey, mediaType, id, resolve, reject });  
            processLogoQueue();  
        });  
    }  
  
    // Функція відображення логотипів студій  
    function renderStudioLogos(container, data) {  
        if (!Lampa.Storage.get('applecation_studios', true)) return;  
          
        container.empty();  
          
        if (data.production_companies && data.production_companies.length > 0) {  
            const studios = data.production_companies.slice(0, 3); // Обмежено до 3 логотипів  
              
            studios.forEach(studio => {  
                if (studio.logo_path) {  
                    const logoUrl = Lampa.TMDB.image(`/t/p/w185${studio.logo_path}`);  
                    const studioItem = $(`  
                        <div class="studio-item">  
                            <img src="${logoUrl}" alt="${studio.name}" />  
                        </div>  
                    `);  
                    container.append(studioItem);  
                }  
            });  
        }  
    }  
  
    // Функція отримання кольору рейтингу  
    function getRatingColor(rating) {  
        if (rating >= 8) return '#57F570';  
        if (rating >= 7) return '#ffa500';  
        if (rating >= 6) return '#ff6b6b';  
        return '#ff4757';  
    }  
  
    // Функція форматування часу  
    function formatTime(minutes) {  
        const hours = Math.floor(minutes / 60);  
        const mins = minutes % 60;  
        return `${hours}г ${mins}хв`;  
    }  
  
    // Функція отримання CUB рейтингу  
    function getCubRating(data) {  
        if (!data.reactions || !data.reactions.data) return 0;  
          
        const reactions = data.reactions.data;  
        let totalScore = 0;  
        let totalVotes = 0;  
          
        const reactionWeights = {  
            fire: 5,  
            nice: 4,  
            think: 3,  
            bore: 2,  
            shit: 1  
        };  
          
        for (const reaction in reactions) {  
            if (reactions[reaction].count > 0 && reactionWeights[reaction]) {  
                totalScore += reactions[reaction].count * reactionWeights[reaction];  
                totalVotes += reactions[reaction].count;  
            }  
        }  
          
        return totalVotes > 0 ? (totalScore / totalVotes).toFixed(1) : 0;  
    }  
  
    // Функція аналізу якості  
    function getBestResults(data) {  
        const best = {  
            quality: [],  
            audio: [],  
            subs: []  
        };  
          
        if (data.source && data.source.quality) {  
            data.source.quality.forEach(t => {  
                if (t.indexOf('2160') >= 0) best.quality.push('4K');  
                if (t.indexOf('1440') >= 0 || t.indexOf('2k') >= 0) best.quality.push('2K');  
                if (t.indexOf('1080') >= 0) best.quality.push('FULL HD');  
                if (t.indexOf('720') >= 0) best.quality.push('HD');  
                if (t.indexOf('480') >= 0) best.quality.push('SD');  
                if (t.indexOf('hdr')>=0 || t.indexOf(' hdr')>=0) best.hdr = true;  
                if (t.indexOf('dolby')>=0 || t.indexOf(' dv ')>=0) best.dolbyVision = true;  
                if (t.indexOf('vision')>=0 || t.indexOf(' dv ')>=0) best.dolbyVision = true;  
                if (t.indexOf('hdr')>=0) best.hdr = true;  
                if (t.indexOf('dub')>=0 || t.indexOf('дуб')>=0) best.dub = true;  
            });  
        }  
        return best;  
    }  
  
    // Виправлена функція відображення рейтингів  
    function renderRatings(container, event) {  
        const data = event.data.movie;  
        if (!data) return;  
  
        container.empty();  
  
        // Рядок рейтингів - ліве вирівнювання  
        const ratingsRow = $('<div class="plugin-ratings-row"></div>');  
          
        // TMDB рейтинг  
        if (data.vote_average && data.vote_average > 0) {  
            const tmdbRating = $(`  
                <div class="plugin-rating-item">  
                    <img src="${ratingIcons.tmdb}" alt="TMDB" />  
                    <span style="color: ${getRatingColor(data.vote_average)}">${data.vote_average.toFixed(1)}</span>  
                </div>  
            `);  
            ratingsRow.append(tmdbRating);  
        }  
  
        // CUB рейтинг  
        const cubRating = getCubRating(data);  
        if (cubRating > 0) {  
            const cubRatingEl = $(`  
                <div class="plugin-rating-item">  
                    <img src="${ratingIcons.cub}" alt="CUB" />  
                    <span style="color: ${getRatingColor(cubRating)}">${cubRating}</span>  
                </div>  
            `);  
            ratingsRow.append(cubRatingEl);  
        }  
  
        // Тривалість  
        if (data.runtime && data.runtime > 0) {  
            const duration = $(`<div class="info-text-item">${formatTime(data.runtime)}</div>`);  
            ratingsRow.append(duration);  
        }  
  
        // Жанри  
        if (data.genres && data.genres.length > 0) {  
            const genres = data.genres.slice(0, 3).map(g => g.name).join(', ');  
            const genreEl = $(`<div class="info-text-item">${genres}</div>`);  
            ratingsRow.append(genreEl);  
        }  
  
        // Якість - ВИПРАВЛЕНО  
        if (Lampa.Storage.get('applecation_quality', true)) {  
            const bestResults = getBestResults(data);  
            if (bestResults.quality && bestResults.quality.length > 0) {  
                bestResults.quality.forEach(quality => {  
                    if (svgIcons[quality]) {  
                        const qualityIcon = $(`  
                            <div class="quality-item-inline">  
                                <img src="${svgIcons[quality]}" alt="${quality}" />  
                            </div>  
                        `);  
                        ratingsRow.append(qualityIcon);  
                    }  
                });  
            }  
        }  
  
        container.append(ratingsRow);  
    }  
  
    // Оптимізована функція заповнення мета інформації  
    function fillMetaInfo(elements, data) {  
        const info = [];  
          
        if (data.release_date) {  
            info.push(new Date(data.release_date).getFullYear());  
        }  
          
        if (data.production_countries && data.production_countries.length > 0) {  
            info.push(data.production_countries[0].iso_3166_1);  
        }  
          
        elements.metaText.text(info.join(' • '));  
    }  
  
    // Оптимізована функція заповнення додаткової інформації  
    function fillAdditionalInfo(elements, data) {  
        const info = [];  
          
        if (data.genres && data.genres.length > 0) {  
            info.push(data.genres.slice(0, 3).map(g => g.name).join(', '));  
        }  
          
        if (data.runtime && data.runtime > 0) {  
            info.push(formatTime(data.runtime));  
        }  
          
        elements.infoContainer.text(info.join(' • '));  
    }  
  
    // Застосування масштабів  
    function applyScales() {  
        if (scaleUpdateTimeout) {  
            clearTimeout(scaleUpdateTimeout);  
        }  
          
        scaleUpdateTimeout = setTimeout(() => {  
            const logoScale = Lampa.Storage.get('applecation_logo_scale', '100') / 100;  
            const textScale = Lampa.Storage.get('applecation_text_scale', '100') / 100;  
            const spacingScale = Lampa.Storage.get('applecation_spacing_scale', '100') / 100;  
              
            const styleId = 'applecation-scales';  
            let styleEl = document.getElementById(styleId);  
              
            if (!styleEl) {  
                styleEl = document.createElement('style');  
                styleEl.id = styleId;  
                document.head.appendChild(styleEl);  
            }  
              
            styleEl.textContent = `  
                .applecation__logo img {   
                    transform: scale(${logoScale});   
                    transform-origin: left center;   
                }  
                .applecation__meta-text,   
                .applecation__info,   
                .applecation__description {   
                    font-size: calc(0.95em * ${textScale});   
                }  
                .applecation__studio-row,  
                .plugin-ratings-row {  
                    gap: calc(12px * ${spacingScale});  
                    margin-bottom: calc(0.5em * ${spacingScale});  
                }  
            `;  
        }, 100);  
    }  
  
    // Отримання типу медіа  
    function getMediaType(data) {  
        const isTv = !!data.name;  
        const types = {  
            uk: isTv ? 'Серіал' : 'Фільм',  
        };  
        return types['uk'];             
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
  
    // Функція очікування завантаження фону  
    function waitForBackgroundLoad(activity, callback) {  
        const render = activity.render();  
        const background = render.find('.full-start__background')[0];  
          
        if (!background) {  
            setTimeout(callback, 100);  
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
      
    // Правильна реєстрація маніфесту      
    function registerPlugin() {      
        const pluginManifest = {      
            type: 'other',      
            version: '1.3.0',      
            name: 'NewCard',      
            description: 'Новий дизайн картки фільму/серіалу зі студіями та рейтингами.',      
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
             
