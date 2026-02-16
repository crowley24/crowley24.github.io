(function () {  
    'use strict';  
  
    // Іконка плагіна  
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
  
    // Переклади  
    const translations = {  
        show_ratings: { uk: 'Показувати рейтинги' },  
        show_ratings_desc: { uk: 'Показувати рейтинги на картці' },  
        logo_scale: { uk: 'Розмір логотипа' },  
        logo_scale_desc: { uk: 'Масштабування логотипа фільму' },  
        text_scale: { uk: 'Розмір тексту' },  
        text_scale_desc: { uk: 'Масштабування тексту' },  
        spacing_scale: { uk: 'Відступи' },  
        spacing_scale_desc: { uk: 'Масштабування відступів' },  
        apple_zoom: { uk: 'Apple TV зум' },  
        apple_zoom_desc: { uk: 'Анімація фону як в Apple TV' },  
        original_colors: { uk: 'Оригінальні кольори логотипів' },  
        original_colors_desc: { uk: 'Показувати логотипи студій в оригінальних кольорах' },  
        show_studio: { uk: 'Логотипи студій' },  
        show_studio_desc: { uk: 'Показувати логотипи студій та мереж' },  
        ratings_position: { uk: 'Позиція рейтингів' },  
        ratings_position_desc: { uk: 'Де показувати рейтинги' },  
        ratings_card: { uk: 'На картці' },  
        ratings_corner: { uk: 'В кутку' },  
        scale_default: { uk: 'За замовчуванням' }  
    };  
  
    function t(key) {  
        return translations[key] && translations[key].uk || key;  
    }  
  
    // Патчим Api.img  
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
  
    // Додаємо шаблон  
    function addCustomTemplate() {  
        const template = `<div class="full-start-new applecation">  
        <div class="full-start-new__body">  
            <div class="full-start-new__left hide">  
                <div class="full-start-new__poster">  
                    <img />  
                </div>  
            </div>  
            <div class="full-start-new__right">  
                <div class="full-start-new__title"></div>  
                <div class="applecation__logo"></div>  
                <div class="applecation__content-wrapper">  
                    <div class="applecation__meta"></div>  
                    <div class="applecation__ratings"></div>  
                    <div class="applecation__description"></div>  
                    <div class="applecation__info"></div>  
                </div>  
                <div class="full-start-new__rate-line">  
                    <div class="full-start__status hide"></div>  
                </div>  
            </div>  
        </div>  
    </div>`;  
          
        Lampa.Template.add('full_start_new', template);  
    }  
  
    // Додаємо стилі  
    function addStyles() {  
        const styles = `<style>  
        .applecation {  
            position: relative;  
            z-index: 2;  
        }  
        .applecation__logo {  
            margin-bottom: 0.5em;  
        }  
        .applecation__logo img {  
            display: block;  
            max-width: 35vw;  
            max-height: 180px;  
            width: auto;  
            height: auto;  
            object-fit: contain;  
        }  
        .applecation__network {  
            display: inline-flex;  
            align-items: center;  
            gap: 0.5em;  
            line-height: 1;  
            margin-top: 0.8em;  
        }  
        .applecation__network img {  
            display: block;  
            max-height: 1.4em;  
            width: auto;  
            object-fit: contain;  
        }  
        .applecation--hide-ratings .applecation__ratings {  
            display: none;  
        }  
        </style>`;  
          
        $('body').append(styles);  
    }  
  
    // Додаємо налаштування  
    function addSettings() {  
        // 1. Показувати рейтинги  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: {  
                name: 'applecation_show_ratings',  
                type: 'trigger',  
                default: false  
            },  
            field: {  
                name: t('show_ratings'),  
                description: t('show_ratings_desc')  
            }  
        });  
  
        // 2. Розмір логотипа  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: {  
                name: 'applecation_logo_scale',  
                type: 'select',  
                values: {'70':'70%','80':'80%','90':'90%','100':t('scale_default'),'110':'110%','120':'120%','130':'130%','140':'140%','150':'150%','160':'160%'},  
                default: '100'  
            },  
            field: {  
                name: t('logo_scale'),  
                description: t('logo_scale_desc')  
            },  
            onChange: function(value) {  
                Lampa.Storage.set('applecation_logo_scale', value);  
                applyScales();  
            }  
        });  
  
        // 3. Розмір тексту  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: {  
                name: 'applecation_text_scale',  
                type: 'select',  
                values: {'80':'80%','90':'90%','100':t('scale_default'),'110':'110%','120':'120%'},  
                default: '100'  
            },  
            field: {  
                name: t('text_scale'),  
                description: t('text_scale_desc')  
            },  
            onChange: function(value) {  
                Lampa.Storage.set('applecation_text_scale', value);  
                applyScales();  
            }  
        });  
  
        // 4. Відступи  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: {  
                name: 'applecation_spacing_scale',  
                type: 'select',  
                values: {'80':'80%','90':'90%','100':t('scale_default'),'110':'110%','120':'120%'},  
                default: '100'  
            },  
            field: {  
                name: t('spacing_scale'),  
                description: t('spacing_scale_desc')  
            },  
            onChange: function(value) {  
                Lampa.Storage.set('applecation_spacing_scale', value);  
                applyScales();  
            }  
        });  
  
        // 5. Apple TV зум  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: {  
                name: 'applecation_apple_zoom',  
                type: 'trigger',  
                default: true  
            },  
            field: {  
                name: t('apple_zoom'),  
                description: t('apple_zoom_desc')  
            },  
            onChange: function(value) {  
                Lampa.Storage.set('applecation_apple_zoom', value);  
                updateZoomState();  
            }  
        });  
  
        // 6. Оригінальні кольори логотипів  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: {  
                name: 'applecation_original_colors',  
                type: 'trigger',  
                default: true  
            },  
            field: {  
                name: t('original_colors'),  
                description: t('original_colors_desc')  
            },  
            onChange: function(value) {  
                Lampa.Storage.set('applecation_original_colors', value);  
                updateLogoColors();  
            }  
        });  
  
        // 7. Показувати логотипи студій  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: {  
                name: 'applecation_show_studio',  
                type: 'trigger',  
                default: true  
            },  
            field: {  
                name: t('show_studio'),  
                description: t('show_studio_desc')  
            }  
        });  
  
        // 8. Позиція рейтингів  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: {  
                name: 'applecation_ratings_position',  
                type: 'select',  
                values: {'card': t('ratings_card'), 'corner': t('ratings_corner')},  
                default: 'card'  
            },  
            field: {  
                name: t('ratings_position'),  
                description: t('ratings_position_desc')  
            },  
            onChange: function(value) {  
                Lampa.Storage.set('applecation_ratings_position', value);  
                applyScales();  
            }  
        });  
  
        // ЗАПУСК ПЕРЕВІРОК ПРИ СТАРТІ  
        updateZoomState();  
        if (!Lampa.Storage.get('applecation_show_ratings', false)) {  
            $('body').addClass('applecation--hide-ratings');  
        }  
        $('body').addClass('applecation--ratings-' + Lampa.Storage.get('applecation_ratings_position', 'card'));  
        applyScales();  
        updateLogoColors();  
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
            </style>  
        `;  
          
        $('body').append(scaleStyles);  
    }  
  
    // Функція керування кольорами логотипів  
    function updateLogoColors() {  
        const originalColors = Lampa.Storage.get('applecation_original_colors', true);  
        $('style[data-id="applecation_logo_colors"]').remove();  
          
        const colorStyles = `  
            <style data-id="applecation_logo_colors">  
                .applecation__network img {  
                    display: block;  
                    max-height: 1.4em;  
                    width: auto;  
                    object-fit: contain;  
                    ${originalColors ? `  
                        filter:   
                            drop-shadow(0 0 2px rgba(255,255,255,0.6))  
                            drop-shadow(0 0 4px rgba(255,255,255,0.52))  
                            drop-shadow(0 0 6px rgba(255,255,255,0.44))  
                            drop-shadow(0 0 8px rgba(255,255,255,0.28))  
                            drop-shadow(0 0 1px rgba(0,0,0,0.9))  
                            drop-shadow(0 0 2px rgba(0,0,0,0.7));  
                    ` : `  
                        filter: brightness(0) invert(1);  
                        opacity: 0.9;  
                        height: 1.8em;  
                        margin-top: -2px;  
                    `}  
                }  
            </style>  
        `;  
          
        $('body').append(colorStyles);  
    }  
  
    // Завантаження логотипа фільму  
    function loadLogo(event) {  
        const activity = event.object;  
        const data = activity.movie;  
        const logoContainer = activity.render().find('.applecation__logo');  
          
        if (!data || !logoContainer.length) return;  
          
        const logos = [];  
          
        // Шукаємо логотипи  
        if (data.logos && data.logos.length) {  
            logos.push(...data.logos);  
        }  
          
        // Якщо немає логотипів, шукаємо в images  
        if (!logos.length && data.images && data.images.logos) {  
            logos.push(...data.images.logos);  
        }  
          
        if (logos.length > 0) {  
            const bestLogo = selectBestLogo(logos);  
            if (bestLogo) {  
                const quality = getLogoQuality();  
                const logoUrl = Lampa.Api.img(bestLogo.file_path, quality);  
                  
                logoContainer.html(`<img src="${logoUrl}" alt="${data.title || data.name}">`);  
                  
                // Анімація появи  
                logoContainer.html(`<img src="${logoUrl}" alt="${data.title || data.name}">`);  
                  
                // Анімація появи  
                logoContainer.find('img').css({  
                    opacity: 0,  
                    transform: 'translateY(10px)',  
                    transition: 'opacity 0.3s ease, transform 0.3s ease'  
                });  
                  
                requestAnimationFrame(() => {  
                    logoContainer.find('img').css({  
                        opacity: 1,  
                        transform: 'translateY(0)'  
                    });  
                });  
            }  
        }  
    }  
  
    // Чекаємо завершення анімації фону  
    function waitForAnimation(background, callback) {  
        if (background.hasClass('applecation-animated')) {  
            callback();  
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
  
