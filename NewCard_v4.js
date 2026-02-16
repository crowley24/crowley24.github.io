(function () {  
    'use strict';  
  
    // Іконка плагіна (Фрагмент кіноплівки - NewCard)  
const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="8" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="8" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>';  
      
    // Головна функція плагіна  
    function initializePlugin() {  
        console.log('NewCard', 'v1.0.0');  
          
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
  
    // Переклади для налаштувань (лише українська)  
const translations = {  
        show_ratings: {  
            uk: 'Показувати рейтинги'  
        },  
        show_ratings_desc: {  
            uk: 'Відображати рейтинги IMDB та КіноПошук'  
        },  
        ratings_position: {  
            uk: 'Розташування рейтингів'  
        },  
        ratings_position_desc: {  
            uk: 'Виберіть де відображати рейтинги'  
        },  
        position_card: {  
            uk: 'У картці'  
        },  
        position_corner: {  
            uk: 'У лівому нижньому куті'  
        },  
        show_studio: {  
            uk: 'Показувати логотипи студій'  
        },  
        show_studio_desc: {  
            uk: 'Відображати логотипи кіностудій та телемереж'  
        },  
        logo_scale: {  
            uk: 'Розмір логотипа'  
        },  
        logo_scale_desc: {  
            uk: 'Змінити розмір логотипа фільму/серіалу'  
        },  
        scale_default: {  
            uk: 'За замовчуванням'  
        },  
        text_scale: {  
            uk: 'Розмір тексту'  
        },  
        text_scale_desc: {  
            uk: 'Змінити розмір всього тексту в картці'  
        },  
        spacing_scale: {  
            uk: 'Відступи'  
        },  
        spacing_scale_desc: {  
            uk: 'Змінити відступи між елементами'  
        },  
        apple_zoom: {  
            uk: 'Ефект збільшення фону'  
        },  
        apple_zoom_desc: {  
            uk: 'Анімація плавного збільшення фону як в Apple TV'  
        },  
        original_colors: {  
            uk: 'Оригінальні кольори логотипів'  
        },  
        original_colors_desc: {  
            uk: 'Показувати логотипи студій в оригінальних кольорах'  
        },  
        performance_mode: {  
            uk: 'Режим продуктивності'  
        },  
        performance_mode_desc: {  
            uk: 'Вимикає анімації та ефекти для кращої продуктивності'  
        }  
    };  
  
    // Функція для отримання перекладу  
    function t(key) {  
        return translations[key] && translations[key].uk || key;  
    }  
  
    // Патчим Api.img для улучшенного качества фона  
    function patchApiImg() {  
        const originalImg = Lampa.Api.img;  
          
        Lampa.Api.img = function(src, size) {  
            // Улучшаем качество backdrop фонов в соответствии с poster_size  
            if (size === 'w1280') {  
                const posterSize = Lampa.Storage.field('poster_size');  
                  
                // Маппінг poster_size на backdrop розміри  
                const sizeMap = {  
                    'w200': 'w780',      // Низьке → мінімальний backdrop  
                    'w300': 'w1280',     // Середнє → стандартний backdrop  
                    'w500': 'original'   // Високое → оригінальний backdrop  
                };  
                  
                size = sizeMap[posterSize] || 'w1280';  
            }  
            return originalImg.call(this, src, size);  
        };  
    }  
  
    // Отримуємо якість логотипа на основі poster_size  
    function getLogoQuality() {  
        const posterSize = Lampa.Storage.field('poster_size');  
        const qualityMap = {  
            'w200': 'w300',      // Низьке постера → низьке лого  
            'w300': 'w500',      // Середнє постера → середнє лого  
            'w500': 'original'   // Високе постера → оригінальне лого  
        };  
        return qualityMap[posterSize] || 'w500';  
    }  
      
    // Нова функція для вибору найкращого логотипа  
    function selectBestLogo(logos, currentLang) {  
        // Приорітети мов: 1. Поточна мова ('uk'), 2. Англійська ('en'), 3. Будь-яка.  
          
        // 1. Поточна мова ('uk')  
        const preferred = logos.filter(l => l.iso_639_1 === 'uk');  
        if (preferred.length > 0) {  
            // Беремо логотип з найвищим рейтингом серед відповідних мов  
            preferred.sort((a, b) => b.vote_average - a.vote_average);  
            return preferred[0];  
        }  
  
        // 2. Англійська мова  
        const english = logos.filter(l => l.iso_639_1 === 'en');  
        if (english.length > 0) {  
            english.sort((a, b) => b.vote_average - a.vote_average);  
            return english[0];  
        }  
          
        // 3. Будь-яка мова (за найвищим рейтингом)  
        if (logos.length > 0) {  
            logos.sort((a, b) => b.vote_average - a.vote_average);  
            return logos[0];  
        }  
          
        return null;  
    }  
  
    // Функція завантаження логотипа  
    function loadLogo(event) {  
        let data = event.data.movie;  
        let activity = event.activity;  
          
        // Визначаємо поточну мову інтерфейсу  
        const currentLang = Lampa.Storage.get('language') || 'uk';  
          
        // Знаходимо контейнер для логотипа  
        const logoContainer = activity.render().find('.applecation__logo');  
          
        if (!logoContainer.length) return;  
          
        // Очищуємо контейнер  
        logoContainer.empty();  
          
        // Перевіряємо наявність логотипів  
        if (!data || (!data.logos && !data.networks)) {  
            logoContainer.remove();  
            return;  
        }  
          
        let logoUrl = null;  
          
        // Пріоритет: 1. Логотипи фільму/серіалу, 2. Логотипи мереж (для серіалів)  
        if (data.logos && data.logos.length > 0) {  
            const bestLogo = selectBestLogo(data.logos, currentLang);  
            if (bestLogo && bestLogo.file_path) {  
                logoUrl = Lampa.Api.img(bestLogo.file_path, getLogoQuality());  
            }  
        }  
          
        // Якщо немає логотипа фільму, пробуємо мережі (для серіалів)  
        if (!logoUrl && data.networks && data.networks.length > 0) {  
            const networksWithLogos = data.networks.filter(n => n.logo_path);  
            if (networksWithLogos.length > 0) {  
                // Сортуємо за пріоритетом (якщо є)  
                networksWithLogos.sort((a, b) => (b.priority || 0) - (a.priority || 0));  
                logoUrl = Lampa.Api.img(networksWithLogos[0].logo_path, getLogoQuality());  
            }  
        }  
          
        if (logoUrl) {  
            const logoImg = $('<img class="applecation__logo-img" />')  
                .attr('src', logoUrl)  
                .on('load', function() {  
                    logoContainer.addClass('loaded');  
                    waitForBackgroundAndAnimate(activity);  
                })  
                .on('error', function() {  
                    logoContainer.remove();  
                });  
              
            logoContainer.append(logoImg);  
        } else {  
            logoContainer.remove();  
        }  
    }  
  
    // Оптимізована функція завантаження іконки студії/мережі  
    function loadNetworkIcon(activity, data) {  
        const networkContainer = activity.render().find('.applecation__network');  
        const showStudio = Lampa.Storage.get('applecation_show_studio', 'true');  
          
        if (showStudio === false || showStudio === 'false') {  
            networkContainer.remove();  
            return;  
        }  
          
        const logos = [];  
          
        // Для серіалів - збираємо всі телемережі  
        if (data.networks && data.networks.length) {  
            data.networks.forEach(network => {  
                if (network.logo_path) {  
                    const logoUrl = Lampa.Api.img(network.logo_path, 'w200');  
                    logos.push(`<img src="${logoUrl}" alt="${network.name}">`);  
                }  
            });  
        }  
          
        // Для фільмів - збираємо всі студії  
        if (data.production_companies && data.production_companies.length) {  
            data.production_companies.forEach(company => {  
                if (company.logo_path) {  
                    const logoUrl = Lampa.Api.img(company.logo_path, 'w200');  
                    logos.push(`<img src="${logoUrl}" alt="${company.name}">`);  
                }  
            });  
        }  
          
        if (logos.length > 0) {  
            networkContainer.html(logos.join(''));  
              
            // Оптимізована анімація появи з CSS  
            const performanceMode = Lampa.Storage.get('applecation_performance_mode', false);  
            if (!performanceMode) {  
                networkContainer.find('img').each((index, img) => {  
                    $(img).css({  
                        opacity: 0,  
                        transform: 'translateY(10px)',  
                        transition: 'opacity 0.3s ease, transform 0.3s ease'  
                    });  
                      
                    // Batch DOM updates з requestAnimationFrame  
                    requestAnimationFrame(() => {  
                        setTimeout(() => {  
                            $(img).css({  
                                opacity: 1,  
                                transform: 'translateY(0)'  
                            });  
                        }, index * 50); // Зменшено затримку  
                    });  
                });  
            }  
        } else {  
            networkContainer.remove();  
        }  
    }  
  
    // Функція лінивого завантаження логотипів  
    function lazyLoadLogos(logos) {  
        const observer = new IntersectionObserver((entries) => {  
            entries.forEach(entry => {  
                if (entry.isIntersecting) {  
                    const img = entry.target;  
                    img.src = img.dataset.src;  
                    observer.unobserve(img);  
                }  
            });  
        });  
          
        logos.each(function() {  
            const img = this;  
            img.dataset.src = img.src;  
            img.src = '';  
            observer.observe(img);  
        });  
    }  
  
    // Оптимізована функція очікування завантаження фону  
    function waitForBackgroundAndAnimate(activity) {  
        const background = $('.full-start__background');  
        const logo = activity.render().find('.applecation__logo-img');  
          
        if (!background.length || !logo.length) return;  
          
        const callback = function() {  
            logo.addClass('animated');  
        };  
          
        // Якщо фон вже завантажений і анімація завершена  
        if (background.hasClass('loaded') && background.hasClass('applecation-animated')) {  
            callback();  
            return;  
        }  
  
        // Якщо фон завантажений але анімація ще триває  
        if (background.hasClass('loaded')) {  
            // Чекаємо завершення transition + невелика затримка для надійності  
            setTimeout(() => {  
                background.addClass('applecation-animated');  
                callback();  
            }, 650); // 600ms transition + 50ms запас  
            return;  
        }  
  
        // Використовуємо requestAnimationFrame замість setInterval  
        let animationId;  
        const checkBackground = () => {  
            if (background.hasClass('loaded')) {  
                cancelAnimationFrame(animationId);  
                // Чекаємо завершення transition + невелика затримка  
                setTimeout(() => {  
                    background.addClass('applecation-animated');  
                    callback();  
                }, 650); // 600ms transition + 50ms запас  
            } else {  
                animationId = requestAnimationFrame(checkBackground);  
            }  
        };  
          
        animationId = requestAnimationFrame(checkBackground);  
  
        // Таймаут на випадок якщо щось пішло не так  
        setTimeout(() => {  
            cancelAnimationFrame(animationId);  
            if (!background.hasClass('applecation-animated')) {  
                background.addClass('applecation-animated');  
                callback();  
            }  
        }, 2000);  
    }  
  
    // Функція debounce для оптимізації  
    function debounce(func, wait) {  
        let timeout;  
        return function executedFunction(...args) {  
            const later = () => {  
                clearTimeout(timeout);  
                func(...args);  
            };  
            clearTimeout(timeout);  
            timeout = setTimeout(later, wait);  
        };  
    }  
  
    // Оптимізована функція керування кольорами логотипів  
    function updateLogoColors() {  
        const originalColors = Lampa.Storage.get('applecation_original_colors', true);  
        const performanceMode = Lampa.Storage.get('applecation_performance_mode', false);  
        $('style[data-id="applecation_logo_colors"]').remove();  
          
        const colorStyles = `  
            <style data-id="applecation_logo_colors">  
                .applecation__network img {  
                    display: block;  
                    max-height: 1.4em;  
                    width: auto;  
                    object-fit: contain;  
                    will-change: transform; /* Оптимізація для анімацій */  
                    ${performanceMode ? '' : originalColors ? `  
                        /* Зменшено кількість фільтрів з 5 до 2 */  
                        filter: drop-shadow(0 0 1px rgba(255,255,255,0.8))  
                               drop-shadow(0 0 2px rgba(0,0,0,0.9));  
                    ` : `  
                        filter: brightness(0) invert(1);  
                        opacity: 0.9;  
                    `}  
                }  
            </style>  
        `;  
          
        $('body').append(colorStyles);  
    }  
  
    // Створюємо debounced версію  
    const debouncedUpdateLogoColors = debounce(updateLogoColors, 100);  
  
    // Функція керування зумом  
    function updateZoomState() {  
        let enabled = Lampa.Storage.get('applecation_apple_zoom', true);  
        $('body').toggleClass('applecation--zoom-enabled', enabled);   
    }  
  
    // Функція керування зумом  
    function updateZoomState() {  
        let enabled = Lampa.Storage.get('applecation_apple_zoom', true);  
        $('body').toggleClass('applecation--zoom-enabled', enabled);   
    }  
  
    // Функція застосування масштабів  
    function applyScales() {  
        const logoScale = parseInt(Lampa.Storage.get('applecation_logo_scale', '100'));  
        const textScale = parseInt(Lampa.Storage.get('applecation_text_scale', '100'));  
        const spacingScale = parseInt(Lampa.Storage.get('applecation_spacing_scale', '100'));  
        const performanceMode = Lampa.Storage.get('applecation_performance_mode', false);  
          
        $('style[data-id="applecation_scales"]').remove();  
          
        const scaleStyles = `  
            <style data-id="applecation_scales">  
                .applecation .applecation__network {  
                    margin-top: ${0.8 * spacingScale / 100}em !important;  
                }  
                .applecation .applecation__logo img {  
                    max-width: ${35 * logoScale / 100}vw !important;  
                    max-height: ${180 * logoScale / 100}px !important;  
                }  
                .applecation .applecation__content-wrapper {  
                    font-size: ${textScale}% !important;  
                }  
                .applecation .full-start-new__title {  
                    margin-bottom: ${1.0 * spacingScale / 100}em !important;  
                }  
                .applecation .applecation__meta {  
                    margin-bottom: ${1.0 * spacingScale / 100}em !important;  
                }  
                .applecation .applecation__ratings {  
                    margin-bottom: ${1.0 * spacingScale / 100}em !important;  
                }  
                .applecation .applecation__description {  
                    max-width: ${35 * textScale / 100}vw !important;  
                    margin-bottom: ${1.0 * spacingScale / 100}em !important;  
                }  
                .applecation .applecation__info {  
                    margin-bottom: ${1.0 * spacingScale / 100}em !important;  
                }  
                ${performanceMode ? `  
                .applecation * {  
                    transition: none !important;  
                    animation: none !important;  
                }  
                ` : ''}  
            </style>  
        `;  
          
        $('body').append(scaleStyles);  
    }  
  
    // Функція завантаження логотипа  
    function loadLogo(event) {  
        const activity = event.object;  
        const data = activity.movie;  
          
        loadNetworkIcon(activity, data);  
          
        if (data.logo_path && Lampa.Storage.get('applecation_show_logo', 'true') !== 'false') {  
            const logoQuality = getLogoQuality();  
            const logoUrl = Lampa.Api.img(data.logo_path, logoQuality);  
            const logoContainer = activity.render().find('.applecation__logo');  
              
            if (logoContainer.length) {  
                const img = new Image();  
                img.onload = function() {  
                    logoContainer.html(`<img src="${logoUrl}" alt="${data.title || data.name}">`);  
                    logoContainer.addClass('loaded');  
                };  
                img.onerror = function() {  
                    logoContainer.remove();  
                };  
                img.src = logoUrl;  
            }  
        }  
    }  
  
    // Функція очікування анімації  
    function waitForAnimation(callback) {  
        const background = $('.full-start__background');  
          
        if (!background.length) {  
            callback();  
            return;  
        }  
  
        if (background.hasClass('loaded')) {  
            setTimeout(() => {  
                background.addClass('applecation-animated');  
                callback();  
            }, 650);  
            return;  
        }  
  
        const checkInterval = setInterval(() => {  
            if (background.hasClass('loaded')) {  
                clearInterval(checkInterval);  
                setTimeout(() => {  
                    background.addClass('applecation-animated');  
                    callback();  
                }, 650);  
            }  
        }, 50);  
  
        setTimeout(() => {  
            clearInterval(checkInterval);  
            if (!background.hasClass('applecation-animated')) {  
                background.addClass('applecation-animated');  
                callback();  
            }  
        }, 2000);  
    }  
  
    // Підключаємо завантаження логотипів  
    function attachLogoLoader() {  
        Lampa.Listener.follow('full', (event) => {  
            if (event.type === 'complite') {  
                loadLogo(event);  
            }  
        });  
    }  
  
    // Реєстрація плагіна в маніфесті  
    var pluginManifest = {  
        type: 'other',  
        version: '1.0.0',  
        name: 'NewCard',  
        description: 'Новий дизайн картки фільму/серіалу.',  
        author: '',  
        icon: PLUGIN_ICON  
    };  
  
    // Реєструємо плагін  
    if (Lampa.Manifest && Lampa.Manifest.plugins) {  
        Lampa.Manifest.plugins = pluginManifest;  
    }  
  
    // Запуск плагіна  
    if (window.appready) {  
        initializePlugin();  
    } else {  
        Lampa.Listener.follow('app', (event) => {  
            if (event.type === 'ready') {  
                initializePlugin();  
            }  
        });  
    }  
  
})();
  
