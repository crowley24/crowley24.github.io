(function() {  
    'use strict';  
    const PLUGIN_NAME = 'NewCard';  
    const PLUGIN_ID = 'new_card_style';  
    const ASSETS_PATH = 'https://crowley38.github.io/Icons/';  
    const CACHE_LIFETIME = 86400000;  
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
    function preloadImage(src) {  
        return new Promise((resolve, reject) => {  
            const img = new Image();  
            img.onload = () => resolve(img);  
            img.onerror = reject;  
            img.src = src;  
        });  
    }  
    function getRatingColor(val) {  
        const n = parseFloat(val);  
        return n >= 7.5 ? '#2ecc71' : n >= 6 ? '#feca57' : '#ff4d4d';  
    }  
    function formatTime(mins) {  
        if (!mins) return '';  
        const h = Math.floor(mins / 60);  
        const m = mins % 60;  
        return (h > 0 ? h + 'г ' : '') + m + 'хв';  
    }  
    function initializePlugin() {  
        addCustomTemplate();  
        addStyles();  
        addSettings();  
        attachLoader();  
    }  
    function addSettings() {  
        const defaults = {  
            'cas_logo_scale': '100',  
            'cas_logo_quality': 'original',  
            'cas_bg_animation': true,  
            'cas_slideshow_enabled': true,  
            'cas_blocks_gap': '20',  
            'cas_meta_size': '1.3',  
            'cas_show_studios': true,  
            'cas_show_quality': true,  
            'cas_show_rating': true,  
            'cas_show_description': true  
        };  
        Object.keys(defaults).forEach(key => {  
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);  
        });  
        Lampa.SettingsApi.addComponent({  
            component: PLUGIN_ID,  
            name: PLUGIN_NAME,  
            icon: SETTINGS_ICON  
        });  
        const params = [{  
            name: 'cas_logo_quality',  
            type: 'select',  
            values: {  
                'w300': '300px',  
                'w500': '500px',  
                'original': 'Original'  
            }  
        }, {  
            name: 'cas_logo_scale',  
            type: 'select',  
            values: {  
                '70': '70%',  
                '80': '80%',  
                '90': '90%',  
                '100': '100%',  
                '110': '110%',  
                '120': '120%'  
            }  
        }, {  
            name: 'cas_meta_size',  
            type: 'select',  
            values: {  
                '1.1': 'Міні',  
                '1.2': 'Малий',  
                '1.3': 'Стандартний',  
                '1.4': 'Збільшений',  
                '1.5': 'Великий'  
            }  
        }, {  
            name: 'cas_blocks_gap',  
            type: 'select',  
            values: {  
                '10': 'Компактний',  
                '20': 'Стандартний',  
                '30': 'Просторий',  
                '40': 'Панорамний'  
            }  
        }, {  
            name: 'cas_bg_animation',  
            type: 'trigger',  
            default: true  
        }, {  
            name: 'cas_slideshow_enabled',  
            type: 'trigger',  
            default: true  
        }, {  
            name: 'cas_show_studios',  
            type: 'trigger',  
            default: true  
        }, {  
            name: 'cas_show_quality',  
            type: 'trigger',  
            default: true  
        }, {  
            name: 'cas_show_rating',  
            type: 'trigger',  
            default: true  
        }, {  
            name: 'cas_show_description',  
            type: 'trigger',  
            default: true  
        }];  
        params.forEach(param => {  
            Lampa.SettingsApi.addParam({  
                component: PLUGIN_ID,  
                param: param,  
                field: {  
                    name: TRANSLATIONS['settings_' + param.name]  
                },  
                onChange: applySettings  
            });  
        });  
    }  
    function applySettings() {  
        const root = document.documentElement;  
        root.style.setProperty('--cas-logo-scale', Lampa.Storage.get('cas_logo_scale', '100') / 100);  
        root.style.setProperty('--cas-blocks-gap', Lampa.Storage.get('cas_blocks_gap', '20') + 'px');  
        root.style.setProperty('--cas-meta-size', Lampa.Storage.get('cas_meta_size', '1.3') + 'em');  
        const isAnimEnabled = Lampa.Storage.get('cas_bg_animation');  
        if (isAnimEnabled) {  
            $('body').addClass('cas--zoom-enabled');  
        } else {  
            $('body').removeClass('cas--zoom-enabled');  
        }  
    }  
    function getCachedData(id) {  
        const cache = Lampa.Storage.get('cas_images_cache') || {};  
        const item = cache[id];  
        if (item && (Date.now() - item.time < CACHE_LIFETIME)) return item.data;  
        return null;  
    }  
    function setCachedData(id, data) {  
        const cache = Lampa.Storage.get('cas_images_cache') || {};  
        cache[id] = {  
            time: Date.now(),  
            data: data  
        };  
        const keys = Object.keys(cache);  
        if (keys.length > 100) delete cache[keys[0]];  
        Lampa.Storage.set('cas_images_cache', cache);  
    }  
    function cleanup() {  
        if (currentInterval) {  
            clearInterval(currentInterval);  
            currentInterval = null;  
        }  
    }  
    function renderStudioLogosWithColorAnalysis(container, data) {  
        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 4);  
        studios.forEach((studio, index) => {  
            const logoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);  
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
                    let r = 0,  
                        g = 0,  
                        b = 0,  
                        count = 0;  
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
        });  
    }  

    function addCustomTemplate() {  
    const template = `<div class="full-start-new left-title">  
        <div class="full-start-new__body">  
            <div class="full-start-new__left hide">  
                <div class="full-start-new__poster">  
                    <img class="full-start-new__img full--poster" />  
                </div>  
            </div>  
            <div class="full-start-new__right">  
                <div class="left-title__content">  
                    <div class="cas-logo-container" style="margin-bottom: calc(var(--cas-blocks-gap) * 1.5);">  
                        <div class="cas-logo"></div>  
                    </div>  
                    <div class="cas-studios-row" style="display: flex; gap: 15px; align-items: center; margin-bottom: 12px;"></div>  
                    <div class="cas-ratings-line">  
                        <div class="cas-rate-items" style="display: flex; align-items: center; gap: 12px;"></div>  
                        <div class="cas-meta-info"></div>  
                        <div class="cas-quality-row" style="display: flex; gap: 8px; align-items: center;"></div>  
                    </div>  
                    <div class="cas-description" style="margin-top: calc(var(--cas-blocks-gap) * 0.4);"></div>  
                    <div class="cas-details-wrapper" style="margin-top: 10px;">  
                        <div class="full-start-new__head hide"></div>  
                        <div class="full-start-new__details hide"></div>  
                    </div>  
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
                        <div class="full-start__button selector button--subscribe hide">  
                            <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.01892 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/><path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/></svg>  
                            <span>#{title_subscribe}</span>  
                        </div>  
                        <div class="full-start__button selector button--options">  
                            <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg>  
                        </div>  
                    </div>  
                </div>  
            </div>  
            <div class="full-start-new__reactions selector hide"></div>  
            <div class="full-start-new__rate-line hide"></div>  
            <div class="rating--modss" style="display: none;"></div>  
        </div>  
    </div>`;  
    Lampa.Template.add('full_start_new', template);  
    }
  function addStyles() {  
    if ($('#cas-main-styles').length) return;  
    const styles = `<style id="cas-main-styles">:root{--cas-logo-scale:1;--cas-blocks-gap:30px;--cas-meta-size:1.3em;--cas-anim-curve:cubic-bezier(0.2,0.8,0.2,1)}.full-start__background{will-change:transform,opacity;backface-visibility:hidden;perspective:1000px;transform:translateZ(0);transition:opacity .8s ease}.cas-logo-container{position:relative;overflow:visible;max-width:100%;padding-left:0;margin-bottom:calc(var(--cas-blocks-gap)*1.5);max-height:300px}.full-start__background{transform:scale(1.1);transition:transform .8s ease-out,opacity .8s ease}.cas-animated .full-start__background{transform:scale(1)}.cas-logo,.cas-studios-row,.cas-rate-items,.cas-meta-info,.cas-quality-row,.cas-description,.cas-details-wrapper{opacity:0!important;transform:translateY(10px);transition:opacity .4s var(--cas-anim-curve),transform .4s var(--cas-anim-curve);will-change:transform,opacity}.cas-animated .cas-logo{opacity:1!important;transform:translateY(0);transition-delay:0s}.cas-animated .cas-studios-row{opacity:.9!important;transform:translateY(0);transition-delay:.1s}.cas-animated .cas-rate-items{opacity:1!important;transform:translateY(0);transition-delay:.2s}.cas-animated .cas-meta-info{opacity:.7!important;transform:translateY(0);transition-delay:.3s}.cas-animated .cas-quality-row{opacity:.9!important;transform:translateY(0);transition-delay:.4s}.cas-animated .cas-description{opacity:.7!important;transform:translateY(0);transition-delay:.15s}.full-start-new__details{display:none!important}.full-start-new__head{display:block!important;margin:0!important;padding:0!important;font-size:.9em}.full-start-new__buttons{display:flex!important;flex-direction:row!important;gap:20px;margin-top:.2em;opacity:1!important;transform:translateY(20px) scale(.9);transition:none!important;will-change:transform,opacity}.cas-animated .full-start-new__buttons{opacity:1!important;transform:translateY(0) scale(1);transition-delay:.6s}.full-start__button.button--play{order:1}.full-start__button.button--book{order:2}.full-start__button.button--reaction{order:3}.full-start__button.button--subscribe{order:4}.full-start__button.button--options{order:5}.left-title .full-start-new__buttons .full-start__button{background:transparent!important;color:rgba(255,255,255,.6)!important;display:flex;align-items:center;gap:10px;transition:all .3s ease;will-change:transform;border:2px solid transparent!important;border-radius:8px!important;padding:8px 16px!important}.left-title .full-start-new__buttons .full-start__button.focus{color:#fff!important;transform:scale(1.04);background:rgba(255,255,255,.12)!important;border-color:rgba(255,255,255,.25)!important}.cas-rate-item{opacity:0;transform:scale(.9);animation:popIn .2s ease forwards}.cas-rate-item:nth-child(1){animation-delay:.2s}.cas-rate-item:nth-child(2){animation-delay:.3s}@keyframes popIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}.cas-logo img{background:transparent!important;border:none!important;max-width:450px;max-height:300px;width:auto;height:auto;transform:scale(var(--cas-logo-scale));transform-origin:left center;display:block;object-fit:contain}.cas-studio-item{height:2.2em!important;display:flex;align-items:center;justify-content:center}.cas-studio-item img{height:100%;width:auto;object-fit:contain;filter:drop-shadow(0 0 1px rgba(255,255,255,.8)) drop-shadow(0 0 1px rgba(255,255,255,.8));opacity:1;transition:filter .3s ease}.cas-description{font-size:var(--cas-meta-size)!important;line-height:1.4;color:rgba(255,255,255,.7);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;max-width:650px;margin-top:calc(var(--cas-blocks-gap)*.4)}.cas-quality-item img{height:12px}.cas-ratings-line{display:flex;align-items:center;gap:15px;margin-bottom:5px;font-size:var(--cas-meta-size);font-weight:600;height:30px}.cas-rate-item{display:flex;align-items:center;gap:6px}.cas-rate-item img{height:1.1em}.left-title .full-start-new__body{height:85vh}.left-title .full-start-new__right{display:flex;align-items:flex-end;justify-content:flex-start;padding-bottom:2vh;padding-left:1.5%}.cas-meta-info{display:flex;align-items:center;gap:8px;font-weight:400}@keyframes casKenBurnsParallax{0%{transform:scale(1.1) translateY(0) translateX(0)}25%{transform:scale(1.13) translateY(-10px) translateX(-5px)}50%{transform:scale(1.15) translateY(-20px) translateX(5px)}75%{transform:scale(1.13) translateY(-10px) translateX(-3px)}100%{transform:scale(1.1) translateY(0) translateX(0)}}body.cas--zoom-enabled .full-start__background.loaded{animation:casKenBurnsParallax 50s ease-in-out infinite!important;will-change:transform}.full-start__background img{transform:translateZ(0);-webkit-transform:translateZ(0)}</style>`;  
    Lampa.Template.add('left_title_css', styles);  
    $('body').append(Lampa.Template.get('left_title_css', {}, true));  
}  
function getCachedData(id) {  
    const cache = Lampa.Storage.get('cas_images_cache') || {};  
    const item = cache[id];  
    if (item && (Date.now() - item.time < CACHE_LIFETIME)) return item.data;  
    return null;  
}  
function setCachedData(id, data) {  
    const cache = Lampa.Storage.get('cas_images_cache') || {};  
    cache[id] = { data: data, time: Date.now() };  
    Lampa.Storage.set('cas_images_cache', cache);  
}  
function renderStudioLogosWithColorAnalysis(container, data) {  
    const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 4);  
    studios.forEach((studio, index) => {  
        const logoUrl = Lampa.TMDB.image('/t/p/w200' + studio.logo_path);  
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
    });  
}  
async function processImages(render, data, res) {  
    const quality = Lampa.Storage.get('cas_logo_quality') || 'original';  
    const logos = res.logos || [];  
    const sortedLogos = logos.sort((a, b) => {  
        if (a.iso_639_1 === 'uk' && b.iso_639_1 !== 'uk') return -1;  
        if (a.iso_639_1 !== 'uk' && b.iso_639_1 === 'uk') return 1;  
        return 0;  
    });  
    if (sortedLogos.length > 0) {  
        const logo = sortedLogos[0];  
        const logoUrl = Lampa.TMDB.image(logo.file_path, quality);  
        try {  
            const img = await preloadImage(logoUrl);  
            render.find('.cas-logo').html(`<img src="${logoUrl}" style="max-width: 100%; height: auto;">`);  
        } catch (error) {  
            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
        }  
    } else {  
        render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800; text-transform: uppercase;">${data.title || data.name}</div>`);  
    }  
}  
async function loadMovieDataOptimized(render, data) {  
    const tasks = [];  
    tasks.push(Promise.resolve().then(() => {  
        const tmdbV = data.vote_average || data.vote;  
        const tmdb = tmdbV > 0 ? `<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>` : '';  
        if (data.reactions && data.reactions.result) {  
            let sum = 0, cnt = 0;  
            const coef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };  
            data.reactions.result.forEach(r => {  
                if (r.counter) {  
                    sum += (r.counter * coef[r.type]);  
                    cnt += r.counter;  
                }  
            });  
            if (cnt >= 1) {  
                const isTv = data.name ? true : false;  
                const cubV = (((isTv ? 7.4 : 6.5) * (isTv ? 50 : 150) + sum) / ((isTv ? 50 : 150) + cnt)).toFixed(1);  
                tmdb += `<div class="cas-rate-item"><img src="${ICONS.cub}"> <span style="color:${getRatingColor(cubV)}">${cubV}</span></div>`;  
            }  
        }  
        render.find('.cas-rate-items').html(tmdb);  
    }));  
    tasks.push(Promise.resolve().then(() => {  
        const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));  
        const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');  
        render.find('.cas-meta-info').text((time ? time + (genre ? ' • ' : '') : '') + genre);  
    }));  
    if (Lampa.Storage.get('cas_show_studios')) {  
        tasks.push(Promise.resolve().then(() => {  
            renderStudioLogosWithColorAnalysis(render.find('.cas-studios-row'), data);  
        }));  
    }  
    await Promise.all(tasks);  
    if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser.get) {  
        Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {  
            try {  
                const items = res.Results || res;  
                if (items && Array.isArray(items) && items.length > 0) {  
                    const b = { res: '', hdr: false, dv: false, ukr: false };  
                    items.slice(0, 8).forEach(i => {  
                        const t = (i.Title || i.title || '').toLowerCase();  
                        if (t.includes('4k') || t.includes('2160')) b.res = '4K';  
                        else if (!b.res && (t.includes('1080') || t.includes('fhd'))) b.res = 'FULL HD';  
                        if (t.includes('hdr')) b.hdr = true;  
                        if (t.includes('dv') || t.includes('dovi') || t.includes('vision')) b.dv = true;  
                        if (t.includes('ukr') || t.includes('укр')) b.ukr = true;  
                    });  
                    let qH = '';  
                    if (b.res) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS[b.res]}"></div>`;  
                    if (b.dv) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['Dolby Vision']}"></div>`;  
                    else if (b.hdr) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;  
                    if (b.ukr) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['UKR']}"></div>`;  
                    if (qH) {  
                        render.find('.cas-quality-row').html('<span class="cas-sep" style="margin: 0 5px;">•</span>' + qH).show();  
                    }  
                }  
            } catch (error) {  
                render.find('.cas-quality-row').hide();  
            }  
        }).fail(() => {  
            render.find('.cas-quality-row').hide();  
        });  
    } else {  
        render.find('.cas-quality-row').hide();  
    }  
}  
const debouncedLoadMovieData = debounce((render, data) => {  
    try { loadMovieDataOptimized(render, data); } catch (error) {}  
}, 250);  
function attachLoader() {  
    Lampa.Listener.follow('full', (event) => {  
        if (event.type === 'complite') {  
            const data = event.data.movie;  
            const render = event.object.activity.render();  
            const content = render.find('.left-title__content');  
            content.removeClass('cas-animated');  
            event.object.activity.onBeforeDestroy = cleanup;  
            if (data && data.id) {  
                render.data('movie', data);  
                const cacheId = 'tmdb_' + data.id;  
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
  
