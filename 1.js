(function () {  
    'use strict';  
    const PLUGIN_NAME = 'NewCard';  
    const PLUGIN_ID = 'new_card_style';  
    const ASSETS_PATH = 'https://crowley38.github.io/Icons/';  
    const CACHE_LIFETIME = 1000 * 60 * 60 * 24;  
  
    let currentInterval = null;  
  
    const ICONS = {  
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',  
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'  
    };  
    const QUALITY_ICONS = {  
        '4K': ASSETS_PATH + '4K.svg',  
        '2K': ASSETS_PATH + '2K.svg',  
        'FULL HD': ASSETS_PATH + 'FULL HD.svg',  
        'HD': ASSETS_PATH + 'HD.svg',  
        'HDR': ASSETS_PATH + 'HDR.svg',  
        'Dolby Vision': ASSETS_PATH + 'Dolby Vision.svg',  
        'UKR': ASSETS_PATH + 'UKR.svg'  
    };  
    const SETTINGS_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/><rect x="25" y="66" width="30" height="6" rx="3" fill="white" opacity="0.6"/><rect x="60" y="66" width="15" height="6" rx="3" fill="white" opacity="0.6"/></svg>`;  
  
    const TRANSLATIONS = {  
        'settings_cas_logo_quality': 'Якість логотипу',  
        'settings_cas_logo_scale': 'Розмір логотипу',  
        'settings_cas_meta_size': 'Розмір шрифту',  
        'settings_cas_blocks_gap': 'Відступи між блоками',  
        'settings_cas_bg_animation': 'Анімація фону (Ken Burns)',  
        'settings_cas_slideshow_enabled': 'Слайд-шоу фону',  
        'settings_cas_show_studios': 'Показувати студії',  
        'settings_cas_show_quality': 'Показувати якість',  
        'settings_cas_show_rating': 'Показувати рейтинги',  
        'settings_cas_show_description': 'Опис фільму'  
    };  
  
    let debounceTimer;  
    function debounce(func, delay) {  
        return function() {  
            const context = this;  
            const args = arguments;  
            clearTimeout(debounceTimer);  
            debounceTimer = setTimeout(() => func.apply(context, args), delay);  
        };  
    }  
  
    function preloadImage(url) {  
        return new Promise((resolve, reject) => {  
            const img = new Image();  
            img.crossOrigin = 'anonymous';  
            img.onload = () => resolve(img);  
            img.onerror = reject;  
            img.src = url;  
        });  
    }  
  
    function formatTime(minutes) {  
        if (!minutes) return '';  
        const hours = Math.floor(minutes / 60);  
        const mins = minutes % 60;  
        if (hours > 0) {  
            return `${hours}г ${mins}хв`;  
        }  
        return `${mins}хв`;  
    }  
  
    function getRatingColor(rating) {  
        if (rating >= 8) return '#57F570';  
        if (rating >= 7) return '#ffd700';  
        if (rating >= 6) return '#ff9800';  
        if (rating >= 5) return '#ff5722';  
        return '#f44336';  
    }  
  
    function addSettings() {  
        if (Lampa.Settings) {  
            Lampa.Settings.add('plugin_new_card_style', {  
                component: 'settings_param',  
                name: TRANSLATIONS['settings_cas_logo_quality'],  
                description: 'Якість логотипу студії',  
                default: 'original',  
                values: {  
                    'w92': '92px',  
                    'w154': '154px',  
                    'w185': '185px',  
                    'w300': '300px',  
                    'w500': '500px',  
                    'original': 'Оригінал'  
                },  
                onChange: (value) => {  
                    Lampa.Storage.set('cas_logo_quality', value);  
                }  
            });  
  
            Lampa.Settings.add('plugin_new_card_style', {  
                component: 'settings_param',  
                name: TRANSLATIONS['settings_cas_logo_scale'],  
                description: 'Розмір логотипу',  
                default: '1',  
                values: {  
                    '0.8': '80%',  
                    '1': '100%',  
                    '1.2': '120%',  
                    '1.5': '150%'  
                },  
                onChange: (value) => {  
                    Lampa.Storage.set('cas_logo_scale', value);  
                    document.documentElement.style.setProperty('--cas-logo-scale', value);  
                }  
            });  
  
            Lampa.Settings.add('plugin_new_card_style', {  
                component: 'settings_param',  
                name: TRANSLATIONS['settings_cas_meta_size'],  
                description: 'Розмір шрифту метаданих',  
                default: '1.3',  
                values: {  
                    '1.1': 'Малий',  
                    '1.3': 'Середній',  
                    '1.5': 'Великий'  
                },  
                onChange: (value) => {  
                    Lampa.Storage.set('cas_meta_size', value);  
                    document.documentElement.style.setProperty('--cas-meta-size', value + 'em');  
                }  
            });  
  
            Lampa.Settings.add('plugin_new_card_style', {  
                component: 'settings_param',  
                name: TRANSLATIONS['settings_cas_blocks_gap'],  
                description: 'Відступи між блоками',  
                default: '30',  
                values: {  
                    '20': 'Малі',  
                    '30': 'Середні',  
                    '40': 'Великі'  
                },  
                onChange: (value) => {  
                    Lampa.Storage.set('cas_blocks_gap', value);  
                    document.documentElement.style.setProperty('--cas-blocks-gap', value + 'px');  
                }  
            });  
  
            Lampa.Settings.add('plugin_new_card_style', {  
                component: 'settings_trigger',  
                name: TRANSLATIONS['settings_cas_bg_animation'],  
                description: 'Анімація фону (Ken Burns)',  
                default: false,  
                onChange: (value) => {  
                    Lampa.Storage.set('cas_bg_animation', value);  
                    if (value) {  
                        $('body').addClass('cas--zoom-enabled');  
                    } else {  
                        $('body').removeClass('cas--zoom-enabled');  
                    }  
                }  
            });  
  
            Lampa.Settings.add('plugin_new_card_style', {  
                component: 'settings_trigger',  
                name: TRANSLATIONS['settings_cas_slideshow_enabled'],  
                description: 'Слайд-шоу фону',  
                default: false,  
                onChange: (value) => {  
                    Lampa.Storage.set('cas_slideshow_enabled', value);  
                }  
            });  
  
            Lampa.Settings.add('plugin_new_card_style', {  
                component: 'settings_trigger',  
                name: TRANSLATIONS['settings_cas_show_studios'],  
                description: 'Показувати студії',  
                default: true,  
                onChange: (value) => {  
                    Lampa.Storage.set('cas_show_studios', value);  
                }  
            });  
  
            Lampa.Settings.add('plugin_new_card_style', {  
                component: 'settings_trigger',  
                name: TRANSLATIONS['settings_cas_show_quality'],  
                description: 'Показувати якість',  
                default: true,  
                onChange: (value) => {  
                    Lampa.Storage.set('cas_show_quality', value);  
                }  
            });  
  
            Lampa.Settings.add('plugin_new_card_style', {  
                component: 'settings_trigger',  
                name: TRANSLATIONS['settings_cas_show_rating'],  
                description: 'Показувати рейтинги',  
                default: true,  
                onChange: (value) => {  
                    Lampa.Storage.set('cas_show_rating', value);  
                }  
            });  
  
            Lampa.Settings.add('plugin_new_card_style', {  
                component: 'settings_trigger',  
                name: TRANSLATIONS['settings_cas_show_description'],  
                description: 'Опис фільму',  
                default: true,  
                onChange: (value) => {  
                    Lampa.Storage.set('cas_show_description', value);  
                }  
            });  
        }  
    }  
  
    function addCustomTemplate() {  
        if (Lampa.Template.get('full_start_new')) return;  
          
        const template = `<div class="full-start-new">  
            <div class="full-start__background"></div>  
            <div class="full-start-new__left hide">  
                <div class="full-start-new__poster">  
                    <div class="full-start__img"></div>  
                </div>  
            </div>  
            <div class="full-start-new__right">  
                <div class="full-start-new__head">  
                    <div class="cas-logo-container"></div>  
                    <div class="cas-ratings-line">  
                        <div class="cas-studios-row" style="display: flex; gap: 15px; align-items: center; margin-bottom: 0;"></div>  
                        <div class="cas-meta-info"></div>  
                        <div class="cas-quality-row" style="display: flex; gap: 8px; align-items: center;"></div>  
                    </div>  
                    <div class="cas-description"></div>  
                    <div class="full-start-new__details hide"></div>  
                </div>  
                <div class="full-start-new__body">  
                    <div class="full-start-new__buttons">  
                        <div class="full-start__button selector button--play">  
                            <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>  
                            <span>#{title_watch}</span>  
                        </div>  
                        <div class="full-start__button selector button--book">  
                            <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg>  
                            <span>#{settings_input_links}</span>  
                        </div>  
                        <div class="full-start__button selector button--reaction">  
                            <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/><path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/></svg>  
                            <span>#{title_reactions}</span>  
                        </div>  
                        <div class="full-start__button selector button--subscribe">  
                            <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">  
                                <path d="M6.01892 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>  
                                <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>  
                            </svg>  
                            <span>#{title_subscribe}</span>  
                        </div>  
                        <div class="full-start__button selector button--options">  
                            <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0595" cy="4.98563" r="4.75394" fill="currentColor"/></svg>  
                            <span>#{title_more}</span>  
                        </div>  
                    </div>  
                </div>  
            </div>  
        </div>  
    </div>`;  
    Lampa.Template.add('full_start_new', template);  
}  
  
    function addStyles() {  
        if ($('#cas-main-styles').length) return;  
        const styles = `<style id="cas-main-styles">  
        :root { --cas-logo-scale: 1; --cas-blocks-gap: 30px; --cas-meta-size: 1.3em; --cas-anim-curve: cubic-bezier(0.2, 0.8, 0.2, 1); }  
                
        /* Чистий фон без стандартних фільтрів Lampa */  
        .full-start__background {  
            height: calc(100% + 6em);  
            left: 0 !important;  
            opacity: 0 !important;  
            transition: opacity 0.6s ease-out !important;  
            will-change: opacity;  
            transform: scale(1.05);  
        }  
            
        .full-start__background.loaded {  
            opacity: 1 !important;  
        }  
  
        .full-start__background.dim {  
            opacity: 0.35 !important;  
        }  
            
        /* Відключення стандартної анімації Lampa */  
        body.advanced--animation:not(.no--animation) .full-start__background.loaded {  
            animation: none !important;  
        }  
            
        /* Елегантна Ken Burns анімація */  
        @keyframes casKenBurnsParallax {  
            0% { transform: scale(1.05) translateY(0px) translateX(0px); }  
            25% { transform: scale(1.08) translateY(-12px) translateX(-6px); }  
            50% { transform: scale(1.12) translateY(-18px) translateX(8px); }  
            75% { transform: scale(1.09) translateY(-10px) translateX(-4px); }  
            100% { transform: scale(1.05) translateY(0px) translateX(0px); }  
        }  
              
        body.cas--zoom-enabled .full-start__background.loaded {  
            animation: casKenBurnsParallax 50s ease-in-out infinite !important;  
            will-change: transform;  
        }  
    
        /* Додатковий subtle ефект глибини */  
        body.cas--zoom-enabled .full-start__background::after {  
            content: '';  
            position: absolute;  
            top: 0;  
            left: 0;  
            right: 0;  
            bottom: 0;  
            background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.1) 100%);  
            pointer-events: none;  
            animation: vignettePulse 50s ease-in-out infinite;  
        }  
    
        @keyframes vignettePulse {  
            0%, 100% { opacity: 0.3; }  
            50% { opacity: 0.1; }  
        }  
    
        .full-start-new {  
            position: absolute;  
            top: 0;  
            left: 0;  
            right: 0;  
            bottom: 0;  
            display: -webkit-box;  
            display: -webkit-flex;  
            display: -moz-box;  
            display: -ms-flexbox;  
            display: flex;  
            -webkit-box-orient: vertical;  
            -webkit-box-direction: normal;  
            -webkit-flex-direction: column;  
               -moz-box-orient: vertical;  
               -moz-box-direction: normal;  
                -ms-flex-direction: column;  
                    flex-direction: column;  
            background: -webkit-gradient(linear, left top, left bottom, from(rgba(0,0,0,0)), color-stop(60%, rgba(0,0,0,0.4)), to(rgba(0,0,0,0.9)));  
            background: -webkit-linear-gradient(top, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.9) 100%);  
            background: -moz-linear-gradient(top, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.9) 100%);  
            background: -o-linear-gradient(top, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.9) 100%);  
            background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.9) 100%);  
        }  
    
        .full-start-new__left {  
            width: 30%;  
            max-width: 20em;  
            padding: 3em 1.5em 3em 4em;  
            display: -webkit-box;  
            display: -webkit-flex;  
            display: -moz-box;  
            display: -ms-flexbox;  
            display: flex;  
            -webkit-box-orient: vertical;  
            -webkit-box-direction: normal;  
            -webkit-flex-direction: column;  
               -moz-box-orient: vertical;  
               -moz-box-direction: normal;  
                -ms-flex-direction: column;  
                    flex-direction: column;  
            -webkit-box-align: center;  
            -webkit-align-items: center;  
               -moz-box-align: center;  
                -ms-flex-align: center;  
                    align-items: center;  
            -webkit-box-pack: center;  
            -webkit-justify-content: center;  
               -moz-box-pack: center;  
                -ms-flex-pack: center;  
                    justify-content: center;  
        }  
    
        .full-start-new__right {  
            -webkit-box-flex: 1;  
            -webkit-flex-grow: 1;  
               -moz-box-flex: 1;  
                -ms-flex-positive: 1;  
                    flex-grow: 1;  
            padding: 3em 4em 3em 0;  
            display: -webkit-box;  
            display: -webkit-flex;  
            display: -moz-box;  
            display: -ms-flexbox;  
            display: flex;  
            -webkit-box-orient: vertical;  
            -webkit-box-direction: normal;  
            -webkit-flex-direction: column;  
               -moz-box-orient: vertical;  
               -moz-box-direction: normal;  
                -ms-flex-direction: column;  
                    flex-direction: column;  
            -webkit-box-pack: end;  
            -webkit-justify-content: flex-end;  
               -moz-box-pack: end;  
                -ms-flex-pack: end;  
                    justify-content: flex-end;  
        }  
    
        .full-start-new__head {  
            margin-bottom: var(--cas-blocks-gap);  
        }  
    
        .full-start-new__body {  
            margin-bottom: 3em;  
        }  
    
        .full-start-new__poster {  
            width: 100%;  
            padding-bottom: 150%;  
            position: relative;  
            -webkit-border-radius: 1.5em;  
               -moz-border-radius: 1.5em;  
                    border-radius: 1.5em;  
            overflow: hidden;  
            background: rgba(255,255,255,0.1);  
            -webkit-box-shadow: 0 0 2em rgba(0,0,0,0.3);  
               -moz-box-shadow: 0 0 2em rgba(0,0,0,0.3);  
                    box-shadow: 0 0 2em rgba(0,0,0,0.3);  
        }  
    
        .full-start-new__buttons {  
            display: -webkit-box;  
            display: -webkit-flex;  
            display: -moz-box;  
            display: -ms-flexbox;  
            display: flex;  
            -webkit-box-align: center;  
            -webkit-align-items: center;  
               -moz-box-align: center;  
                -ms-flex-align: center;  
                    align-items: center;  
            -webkit-flex-wrap: wrap;  
               -moz-flex-wrap: wrap;  
                -ms-flex-wrap: wrap;  
                    flex-wrap: wrap;  
            gap: 1.5em;  
        }  
    
        .full-start-new__buttons .full-start__button {  
            min-width: 12em;  
            padding: 0.8em 1.5em;  
            font-size: 1.1em;  
            font-weight: 600;  
            -webkit-border-radius: 2em;  
               -moz-border-radius: 2em;  
                    border-radius: 2em;  
            background: rgba(255,255,255,0.15);  
            border: 2px solid rgba(255,255,255,0.2);  
            color: #fff;  
            display: -webkit-box;  
            display: -webkit-flex;  
            display: -moz-box;  
            display: -ms-flexbox;  
            display: flex;  
            -webkit-box-align: center;  
            -webkit-align-items: center;  
               -moz-box-align: center;  
                -ms-flex-align: center;  
                    align-items: center;  
            -webkit-box-pack: center;  
            -webkit-justify-content: center;  
               -moz-box-pack: center;  
                -ms-flex-pack: center;  
                    justify-content: center;  
            gap: 0.8em;  
            transition: all 0.3s var(--cas-anim-curve);  
        }  
    
        .full-start-new__buttons .full-start__button:hover {  
            background: rgba(255,255,255,0.25);  
            border-color: rgba(255,255,255,0.4);  
            transform: translateY(-2px);  
            -webkit-box-shadow: 0 0.5em 1.5em rgba(0,0,0,0.3);  
               -moz-box-shadow: 0 0.5em 1.5em rgba(0,0,0,0.3);  
                    box-shadow: 0 0.5em 1.5em rgba(0,0,0,0.3);  
        }  
    
        .full-start-new__buttons .full-start__button svg {  
            width: 1.5em;  
            height: 1.5em;  
            fill: currentColor;  
        }  
    
        .full-start-new__buttons .button--play {  
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);  
            border-color: transparent;  
            min-width: 14em;  
            font-size: 1.2em;  
        }  
    
        .full-start-new__buttons .button--play:hover {  
            background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);  
            transform: translateY(-3px);  
            -webkit-box-shadow: 0 0.8em 2em rgba(102,126,234,0.4);  
               -moz-box-shadow: 0 0.8em 2em rgba(102,126,234,0.4);  
                    box-shadow: 0 0.8em 2em rgba(102,126,234,0.4);  
        }  
    
        .cas-logo-container {  
            margin-bottom: calc(var(--cas-blocks-gap) * 0.6);  
            min-height: 4em;  
            display: -webkit-box;  
            display: -webkit-flex;  
            display: -moz-box;  
            display: -ms-flexbox;  
            display: flex;  
            -webkit-box-align: center;  
            -webkit-align-items: center;  
               -moz-box-align: center;  
                -ms-flex-align: center;  
                    align-items: center;  
        }  
    
        .cas-logo {  
            font-size: var(--cas-logo-scale);  
            font-weight: 700;  
            color: #fff;  
            text-shadow: 0 0.1em 0.3em rgba(0,0,0,0.5);  
            line-height: 1.2;  
            display: -webkit-box;  
            display: -webkit-flex;  
            display: -moz-box;  
            display: -ms-flexbox;  
            display: flex;  
            -webkit-box-align: center;  
            -webkit-align-items: center;  
               -moz-box-align: center;  
                -ms-flex-align: center;  
                    align-items: center;  
        }  
    
        .cas-logo img {  
            max-height: 3.5em;  
            max-width: 100%;  
            object-fit: contain;  
        }  
    
        /* Вирівнювання відступів для всіх елементів */  
        .cas-logo-container,  
        .cas-studios-row,  
        .cas-ratings-line,  
        .cas-description {  
            margin-left: 0;  
            margin-right: 0;  
            padding-left: 0;  
            padding-right: 0;  
        }  
    
        /* Зменшення відступу між рядками */  
        .cas-ratings-line {  
            margin-bottom: 8px !important;  
        }  
    
        .cas-quality-row {  
            margin-top: 0 !important;  
        }  
    
        /* Вирівнювання елементів у рядку метаданих */  
        .cas-ratings-line {  
            display: flex;  
            align-items: center;  
            gap: 8px !important;  
            flex-wrap: wrap;  
        }  
    
        .cas-meta-info {  
            margin-right: 0;  
            display: flex;  
            align-items: center;  
            gap: 8px;  
        }  
    
        .cas-quality-row {  
            display: flex;  
            align-items: center;  
            gap: 6px;  
        }  
    
        .cas-sep {  
            margin: 0 2px !important;  
        }  
    
        .cas-studios-row {  
            display: flex;  
            align-items: center;  
            margin-right: 15px;  
        }  
    
        .cas-studio-item {  
            height: 2.3em !important;  
            display: flex;  
            align-items: center;  
            justify-content: center;  
            background: rgba(255, 255, 255, 0.1);  
            padding: 4px 8px;  
            border-radius: 6px;  
        }  
    
        .cas-studio-item img {  
            max-height: 100%;  
            max-width: 8em;  
            object-fit: contain;  
        }  
    
        .cas-description {  
            font-size: var(--cas-meta-size) !important;  
            line-height: 1.4;  
            color: rgba(255,255,255,0.7);  
            display: -webkit-box;  
            -webkit-line-clamp: 4;  
            -webkit-box-orient: vertical;  
            overflow: hidden;  
            max-width: 650px;  
            margin-top: calc(var(--cas-blocks-gap) * 0.4);  
        }  
    
        .cas-quality-item img { height: 12px; }  
        .cas-ratings-line { display: flex; align-items: center; gap: 15px; margin-bottom: 5px; font-size: var(--cas-meta-size); font-weight: 600; height: 30px; }  
        .cas-rate-item { display: flex; align-items: center; gap: 6px; }  
        .cas-rate-item img { height: 1.1em; }  
        .left-title .full-start-new__body { height: 85vh; }  
        .cas-meta-info { display: flex; align-items: center; gap: 8px; font-weight: 400; }  
                        
        .full-start__background img {  
            transform: translateZ(0);  
            -webkit-transform: translateZ(0);  
        }  
          
        .cas-audio-item {  
            background: rgba(255, 255, 255, 0.2);  
            padding: 2px 6px;  
            border-radius: 4px;  
            font-size: 0.8em;  
            font-weight: 600;  
            color: white;  
        }  
    </style>`;  
    Lampa.Template.add('left_title_css', styles);  
    $('body').append(Lampa.Template.get('left_title_css', {}, true));  
}  
  
    function renderStudioLogosWithColorAnalysis(container, data) {  
        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path);  
          
        if (studios.length > 0) {  
            const mainStudio = studios[0]; // Беремо першу (основну) студію  
            const logoUrl = Lampa.TMDB.image('/t/p/w200' + mainStudio.logo_path);  
            const id = 'cas_studio_' + Math.random().toString(36).substr(2, 9);  
              
            container.append(`<div class="cas-studio-item" id="${id}"><img src="${logoUrl}"></div>`);  
              
            const img = new Image();  
            img.crossOrigin = 'anonymous';  
            img.onload = function() {  
                const canvas = document.createElement('canvas');  
                const ctx = canvas.getContext('2d');  
                canvas.width = this.width;  
                canvas.height = this.height;  
                ctx.drawImage(this, 0, 0);  
                  
                try {  
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;  
                    let r = 0, g = 0, b = 0, count = 0;  
                      
                    for (let i = 0; i < imageData.length; i += 4) {  
                        if (imageData[i + 3] > 50) {  
                            r += imageData[i];  
                            g += imageData[i + 1];  
                            b += imageData[i + 2];  
                            count++;  
                        }  
                    }  
                      
                    if (count > 0) {  
                        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / count;  
                        if (brightness < 40) {  
                            $('#' + id + ' img').css('filter', 'brightness(0) invert(1)');  
                        }  
                    }  
                } catch (e) {  
                    console.log('Error analyzing logo color:', e);  
                }  
            };  
            img.src = logoUrl;  
        }  
    }  
  
    async function processImages(render, data, res) {  
        try {  
            const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];  
            if (bestLogo) {  
                const quality = Lampa.Storage.get('cas_logo_quality') || 'original';  
                const logoSrc = Lampa.TMDB.image('/t/p/' + quality + bestLogo.file_path);  
                await preloadImage(logoSrc);  
                render.find('.cas-logo').html(`<img src="${logoSrc}">`);  
            } else {  
                render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
            }  
            stopSlideshow();  
            if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops && res.backdrops.length > 1) {  
                console.log('Slideshow enabled, backdrops:', res.backdrops.length);  
                startSlideshow(render, res.backdrops);  
            } else {  
                console.log('Slideshow disabled or not enough backdrops');  
            }  
        } catch (error) {  
            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
        }  
    }  
  
    async function loadMovieDataOptimized(render, data) {  
        const tasks = [];  
          
        if (Lampa.Storage.get('cas_show_description')) {  
            tasks.push(Promise.resolve().then(() => {  
                render.find('.cas-description').html(data.overview || '').css('opacity','1').show();  
            }));  
        }  
          
        // Об'єднана задача для метаданих та рейтингів з іконками  
        tasks.push(Promise.resolve().then(() => {  
            const year = data.release_date ? new Date(data.release_date).getFullYear() : (data.first_air_date ? new Date(data.first_air_date).getFullYear() : '');  
            const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));  
            const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');  
              
            // Рейтинги з іконками  
            let ratings = '';  
            const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);  
            if (tmdbV > 0) {  
                ratings += `<img src="${ICONS.tmdb}" style="height: 1.1em; margin-right: 4px;"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span>`;  
            }  
              
            if (data.reactions && data.reactions.result) {  
                let sum = 0, cnt = 0;  
                const coef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };  
                data.reactions.result.forEach(r => {         
                    if (r.counter) { sum += (r.counter * coef[r.type]); cnt += r.counter; }        
                });  
                if (cnt >= 1) {  
                    const isTv = data.name ? true : false;  
                    const cubV = (((isTv?7.4:6.5)*(isTv?50:150)+sum)/((isTv?50:150)+cnt)).toFixed(1);  
                    if (ratings) ratings += ' • ';  
                    ratings += `<img src="${ICONS.cub}" style="height: 1.1em; margin-right: 4px;"> <span style="color:${getRatingColor(cubV)}">${cubV}</span>`;  
                }  
            }  
              
            // Формуємо повний рядок  
            let metaText = '';  
            if (year) metaText += year;  
            if (time) metaText += (metaText ? ' • ' : '') + time;  
            if (genre) metaText += (metaText ? ' • ' : '') + genre;  
            if (ratings) metaText += (metaText ? ' • ' : '') + ratings;  
              
            render.find('.cas-meta-info').html(metaText);  
            render.find('.cas-rate-items').empty(); // Очищуємо окремий блок рейтингів  
        }));  
          
        if (Lampa.Storage.get('cas_show_studios')) {  
            tasks.push(Promise.resolve().then(() => {  
                renderStudioLogosWithColorAnalysis(render.find('.cas-studios-row'), data);  
            }));  
        }  
          
        if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser.get) {  
            tasks.push(Promise.resolve().then(() => {  
                Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {  
                    try {  
                        const items = res.Results || res;  
                        if (items && Array.isArray(items) && items.length > 0) {  
                            const b = { res: '', hdr: false, dv: false, ukr: false, audio: '' };  
                            items.slice(0, 8).forEach(i => {  
                                const t = (i.Title || i.title || '').toLowerCase();  
                                if (t.includes('4k') || t.includes('2160')) b.res = '4K';  
                                else if (t.includes('2k') || t.includes('1440')) b.res = '2K';  
                                else if (t.includes('1080') || t.includes('full hd')) b.res = 'FULL HD';  
                                else if (t.includes('720') || t.includes('hd')) b.res = 'HD';  
                                if (t.includes('hdr')) b.hdr = true;  
                                if (t.includes('dv') || t.includes('dovi') || t.includes('vision')) b.dv = true;  
                                if (t.includes('ukr') || t.includes('укр')) b.ukr = true;  
                                if (t.includes('5.1') || t.includes('5 1')) b.audio = '5.1';  
                                else if (t.includes('7.1') || t.includes('7 1')) b.audio = '7.1';  
                            });  
                              
                            let qH = '';  
                            if (b.res) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS[b.res]}"></div>`;  
                            if (b.dv) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['Dolby Vision']}"></div>`;  
                            else if (b.hdr) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;  
                            if (b.audio) qH += `<div class="cas-quality-item cas-audio-item">${b.audio}</div>`;  
                            if (b.ukr) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['UKR']}"></div>`;  
                              
                            if (qH) {  
                                render.find('.cas-quality-row').html(qH).show();  
                            }  
                        }  
                    } catch (error) {  
                        render.find('.cas-quality-row').hide();  
                    }  
                }).fail(() => {  
                    render.find('.cas-quality-row').hide();  
                });  
            }));  
        } else {  
            render.find('.cas-quality-row').hide();  
        }  
          
        await Promise.all(tasks);  
    }  
  
    function initializePlugin() {  
        addCustomTemplate();  
        addStyles();  
        addSettings();  
          
        Lampa.Listener.follow('full', (e) => {  
            if (e.type === 'complite' && e.data.card && e.data.card.template === 'full_start_new') {  
                const render = e.data.card.render;  
                const data = e.data.card.data;  
                const content = render.find('.full-start-new__body');  
                  
                if (content.length) {  
                    const cacheId = (data.name ? 'tv_' : 'movie_') + data.id;  
                    const cached = getCachedData(cacheId);  
                      
                    const processImagesWrapper = async (res) => {  
                        try { await processImages(render, data, res); } catch (e) {}  
                    };  
                      
                    if (cached) processImagesWrapper(cached);  
                    else {  
                        const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());  
                        $.getJSON(imagesUrl, (res) => {  
                            setCachedData(cacheId, res);  
                            processImagesWrapper(res);  
                        }).fail(() => {  
                            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
                        });  
                    }  
                      
                    // Об'єднуємо дані реакцій з об'єктом фільму для loadMovieDataOptimized          
                    if (event.data.reactions) data.reactions = event.data.reactions;          
                    debouncedLoadMovieData(render, data);  
                }  
                  
                setTimeout(() => content.addClass('cas-animated'), 100);  
                  
                setTimeout(() => {  
                    const firstButton = render.find('.full-start-new__buttons .full-start__button').first();  
                    if (firstButton.length) {  
                        render.find('.full-start__button').removeClass('focus');  
                        firstButton.addClass('focus').trigger('focus');  
                    }  
                }, 200);  
            }  
        });  
    }  
  
    function startPlugin() {  
        try {  
            initializePlugin();  
            console.log('NewCard plugin initialized successfully');  
        } catch (error) {  
            console.error('Failed to initialize NewCard plugin:', error);  
        }  
    }  
  
    if (window.appready) startPlugin();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });  
})();
