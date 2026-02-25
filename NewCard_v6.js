(function () {  
    'use strict';  
  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="8" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="8" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>';  
  
    let logoCache = new Map();  
    let logoColorCache = new Map();  
    let scalesDebounceTimer;  
  
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
  
    const translations = {  
        show_studio: { uk: 'Показувати логотип студії' },  
        show_studio_desc: { uk: 'Відображати іконку телемережі (Netflix, HBO) або кіностудії' },  
        logo_scale: { uk: 'Розмір логотипу' },  
        logo_scale_desc: { uk: 'Масштаб логотипу фільму' },  
        text_scale: { uk: 'Розмір тексту' },  
        text_scale_desc: { uk: 'Масштаб тексту даних про фільм' },  
        scale_default: { uk: 'За замовчуванням' },  
        spacing_scale: { uk: 'Відступи між рядками' },  
        spacing_scale_desc: { uk: 'Відстань між елементами інформації' },  
        settings_title_display: { uk: 'Відображення' },  
        settings_title_scaling: { uk: 'Масштабування' },  
    };  
  
    function t(key) {  
        return translations[key]?.['uk'] || '???';  
    }  
  
    function updateZoomState() {  
        $('body').toggleClass('applecation--zoom-enabled', Lampa.Storage.get('applecation_apple_zoom', true));  
    }  
  
    function addSettings() {  
        const defaults = {  
            'applecation_logo_scale': '100',  
            'applecation_text_scale': '100',  
            'applecation_spacing_scale': '100',  
            'applecation_show_studio': true,  
            'applecation_apple_zoom': true,  
            'applecation_original_colors': true  
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
            param: { name: 'applecation_show_studio', type: 'trigger', default: true },  
            field: { name: 'Показувати логотип студії', description: 'Відображати іконку Netflix, HBO, Disney тощо у мета-даних' },  
            onChange: (v) => Lampa.Storage.set('applecation_show_studio', v)  
        });  
  
        const onScaleChange = (key) => (value) => {  
            Lampa.Storage.set(key, value);  
            debouncedApplyScales();  
        };  
  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':t('scale_default'),'110':'110%','120':'120%','130':'130%','140':'140%','150':'150%','160':'160%' }, default: '100' },  
            field: { name: t('logo_scale'), description: t('logo_scale_desc') },  
            onChange: onScaleChange('applecation_logo_scale')  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_text_scale', type: 'select', values: { '50':'50%','60':'60%','70':'70%','80':'80%','90':'90%','100':t('scale_default'),'110':'110%','120':'120%','130':'130%','140':'140%','150':'150%','160':'160%','170':'170%','180':'180%' }, default: '100' },  
            field: { name: t('text_scale'), description: t('text_scale_desc') },  
            onChange: onScaleChange('applecation_text_scale')  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_spacing_scale', type: 'select', values: { '50':'50%','60':'60%','70':'70%','80':'80%','90':'90%','100':t('scale_default'),'110':'110%','120':'120%','130':'130%','140':'140%','150':'150%','160':'160%','170':'170%','180':'180%','200':'200%','250':'250%','300':'300%' }, default: '100' },  
            field: { name: t('spacing_scale'), description: t('spacing_scale_desc') },  
            onChange: onScaleChange('applecation_spacing_scale')  
        });  
  
        updateZoomState();  
        applyScales();  
    }  
  
    function applyScales() {  
        const root = document.documentElement;  
        root.style.setProperty('--applecation-logo-scale', parseInt(Lampa.Storage.get('applecation_logo_scale', '100')) / 100);  
        root.style.setProperty('--applecation-text-scale', parseInt(Lampa.Storage.get('applecation_text_scale', '100')) / 100);  
        root.style.setProperty('--applecation-spacing-scale', parseInt(Lampa.Storage.get('applecation_spacing_scale', '100')) / 100);  
    }  
  
    function debouncedApplyScales() {  
        clearTimeout(scalesDebounceTimer);  
        scalesDebounceTimer = setTimeout(applyScales, 120);  
    }  
  
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
                                <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"/>  
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
                    <path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/>  
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
  
    function addStyles() {  
        const styles = `<style>  
.applecation{transition:all .3s}  
.applecation .full-start-new__body{height:80vh}  
.applecation .full-start-new__right{display:flex;align-items:flex-end}  
.applecation .full-start-new__title{font-size:2.5em;font-weight:700;line-height:1.2;margin-bottom:.5em;text-shadow:0 0 .1em rgba(0,0,0,.3)}  
.applecation__logo{margin-bottom:.5em;opacity:0;transform:translateY(20px);transition:transform .4s ease-out;will-change:transform}  
.applecation__logo.loaded{opacity:1;transform:translateY(0)}  
.applecation__logo img{display:block;max-width:calc(35vw*var(--applecation-logo-scale));width:auto;height:auto;object-fit:contain;object-position:left center;max-height:calc(180px*var(--applecation-logo-scale))}  
.applecation__meta,.applecation__info,.applecation__description{opacity:0;transform:translateY(15px);transition:opacity .3s ease-out,transform .4s ease-out;will-change:opacity,transform}  
.applecation__meta.show,.applecation__info.show,.applecation__description.show{opacity:1;transform:translateY(0)}  
.applecation__meta{display:flex;align-items:center;color:#fff;font-size:1.1em;margin-bottom:calc(.5em*var(--applecation-spacing-scale));line-height:1}  
.applecation__meta-left{display:flex;align-items:center;line-height:1}  
.applecation__network{display:inline-flex;align-items:center;gap:.5em;line-height:1}  
.applecation__network img{display:block;max-height:1.4em;width:auto;object-fit:contain;transition:filter .3s ease}  
.applecation__meta-text{margin-left:1em;line-height:1}  
.applecation__meta .full-start__pg{margin:0 0 0 .6em;padding:.2em .5em;font-size:.85em;font-weight:600;border:1.5px solid rgba(255,255,255,.4);border-radius:.3em;background:rgba(255,255,255,.1);color:rgba(255,255,255,.9);line-height:1;vertical-align:middle}  
.applecation__description{color:rgba(255,255,255,.6);font-size:.95em;line-height:1.5;margin-bottom:calc(.5em*var(--applecation-spacing-scale));max-width:calc(35vw*var(--applecation-text-scale));display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;transition-delay:.1s}  
.applecation__info{color:rgba(255,255,255,.75);font-size:1em;line-height:1.4;margin-bottom:calc(.5em*var(--applecation-spacing-scale));transition-delay:.15s}  
.applecation__left{flex-grow:1}  
.applecation__right{display:flex;align-items:flex-end;flex-shrink:0;position:relative}  
.applecation .full-start-new__reactions{margin:0;display:flex;flex-direction:column-reverse;align-items:flex-end}  
.applecation .full-start-new__reactions>div{align-self:flex-end}  
.applecation .full-start-new__reactions:not(.focus){margin:0}  
.applecation .full-start-new__reactions:not(.focus)>div:not(:first-child){display:none}  
.applecation .full-start-new__reactions>div:first-child .reaction{display:flex!important;align-items:center!important;background-color:rgba(0,0,0,0)!important;gap:0!important}  
.applecation .full-start-new__reactions>div:first-child .reaction__icon{background-color:rgba(0,0,0,.3)!important;-webkit-border-radius:5em;-moz-border-radius:5em;border-radius:5em;padding:.5em;width:2.6em!important;height:2.6em!important}  
.applecation .full-start-new__reactions>div:first-child .reaction__count{font-size:1.2em!important;font-weight:500!important}  
.applecation .full-start-new__reactions.focus{gap:.5em}  
.applecation .full-start-new__reactions.focus>div{display:block}  
.applecation .full-start-new__rate-line{margin:0;height:0;overflow:hidden;opacity:0;pointer-events:none}  
@keyframes kenBurns{0%{transform:scale(1) translateZ(0)}50%{transform:scale(1.1) translateZ(0)}100%{transform:scale(1) translateZ(0)}}  
.full-start__background{height:calc(100%+6em);left:0!important;opacity:0!important;transition:opacity .8s ease-out,filter .3s ease-out!important;animation:none!important;will-change:transform,opacity,filter;backface-visibility:hidden;perspective:1000px;transform:translateZ(0);z-index:0!important;position:absolute;width:100%;transform-origin:center center}  
.full-start__background.loaded:not(.dim){opacity:1!important}  
body.applecation--zoom-enabled .full-start__background.loaded:not(.dim){animation:kenBurns 40s linear infinite!important}  
.full-start__details::before{content:'';position:absolute;top:-150px;left:-150px;width:200%;height:200%;background:linear-gradient(90deg,rgba(0,0,0,1) 0%,rgba(0,0,0,.8) 25%,rgba(0,0,0,.4) 50%,rgba(0,0,0,0) 100%);z-index:-1;pointer-events:none}  
.applecation__logo,.applecation__meta,.applecation__info,.applecation__description{position:relative;z-index:2}  
.full-start__background.dim{filter:brightness(.3)}  
.full-start__background.loaded.applecation-animated{opacity:1!important}  
.applecation .full-start__status{display:none}  
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
        if (preferred.length) {  
            preferred.sort((a, b) => b.vote_average - a.vote_average);  
            return preferred[0];  
        }  
        const english = logos.filter(l => l.iso_639_1 === 'en');  
        if (english.length) {  
            english.sort((a, b) => b.vote_average - a.vote_average);  
            return english[0];  
        }  
        if (logos.length) {  
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
        const addLogo = (item) => {  
            if (item.logo_path) {  
                const logoUrl = Lampa.Api.img(item.logo_path, 'w200');  
                logos.push({  
                    url: logoUrl,  
                    name: item.name,  
                    element: `<img src="${logoUrl}" alt="${item.name}" data-original="true">`  
                });  
            }  
        };  
        (data.networks || []).forEach(addLogo);  
        (data.production_companies || []).forEach(addLogo);  
        if (logos.length) {  
            networkContainer.html(logos.map(l => l.element).join(''));  
  
        logos.forEach(logo => {  
            if (logoColorCache.has(logo.url)) {  
                const shouldInvert = logoColorCache.get(logo.url);  
                if (shouldInvert) {  
                    const imgElement = networkContainer.find(`img[alt="${logo.name}"]`);  
                    imgElement.css({ 'filter': 'brightness(0) invert(1) contrast(1.2)', 'opacity': '0.95' });  
                    imgElement.removeAttr('data-original');  
                }  
                return;  
            }  
  
            const img = new Image();  
            img.crossOrigin = 'anonymous';  
            img.onload = function() {  
                const canvas = document.createElement('canvas');  
                const ctx = canvas.getContext('2d');  
                const maxSize = 40;  
                const scale = Math.min(maxSize / this.width, maxSize / this.height);  
                canvas.width = Math.round(this.width * scale);  
                canvas.height = Math.round(this.height * scale);  
                ctx.drawImage(this, 0, 0, canvas.width, canvas.height);  
  
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
                    r = Math.floor(r / pixelCount); g = Math.floor(g / pixelCount); b = Math.floor(b / pixelCount);  
                    const avgBrightness = (0.299 * r + 0.587 * g + 0.114 * b);  
                    const darkPixelRatio = darkPixelCount / pixelCount;  
                    const shouldInvert = avgBrightness < 25 && darkPixelRatio > 0.7;  
                    logoColorCache.set(logo.url, shouldInvert);  
                    if (shouldInvert) {  
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
  
function fillMetaInfo(render, data, metaTextContainer) {  
    const metaParts = [getMediaType(data)];  
    if (data.genres && data.genres.length) {  
        const genres = data.genres.slice(0, 2).map(g => Lampa.Utils.capitalizeFirstLetter(g.name));  
        metaParts.push(...genres);  
    }  
    metaTextContainer.html(metaParts.join(' · '));  
    loadNetworkIcon(render, data);  
}  
  
function fillAdditionalInfo(render, data, infoContainer) {  
    const infoParts = [];  
    const releaseDate = data.release_date || data.first_air_date || '';  
    if (releaseDate) infoParts.push(releaseDate.split('-')[0]);  
    if (data.name) {  
        if (data.episode_run_time && data.episode_run_time.length) {  
            const avgRuntime = data.episode_run_time[0];  
            infoParts.push(`${avgRuntime} ${Lampa.Lang.translate('time_m').replace('.', '')}`);  
        }  
        const seasons = Lampa.Utils.countSeasons(data);  
        if (seasons) infoParts.push(formatSeasons(seasons));  
    } else {  
        if (data.runtime && data.runtime > 0) {  
            const h = Math.floor(data.runtime / 60), m = data.runtime % 60;  
            const timeH = Lampa.Lang.translate('time_h').replace('.', '');  
            const timeM = Lampa.Lang.translate('time_m').replace('.', '');  
            infoParts.push(h > 0 ? `${h} ${timeH} ${m} ${timeM}` : `${m} ${timeM}`);  
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
  
function renderBestLogo(imagesData, logoContainer, titleElement, activity) {  
    const bestLogo = selectBestLogo(imagesData.logos, 'uk');  
    if (bestLogo) {  
        const logoUrl = Lampa.TMDB.image(`/t/p/${getLogoQuality()}${bestLogo.file_path}`);  
        const img = new Image();  
        img.onload = () => {  
            logoContainer.html(`<img src="${logoUrl}" alt="" />`);  
            waitForBackgroundLoad(activity, () => { logoContainer.addClass('loaded'); });  
        };  
        img.src = logoUrl;  
    } else {  
        titleElement.show();  
        waitForBackgroundLoad(activity, () => { logoContainer.addClass('loaded'); });  
    }  
}  
  
function loadLogo(event) {  
    const data = event.data.movie, activity = event.object.activity;  
    if (!data || !activity) return;  
    const render = activity.render();  
    const logoContainer = render.find('.applecation__logo');  
    const titleElement = render.find('.full-start-new__title');  
    const metaTextContainer = render.find('.applecation__meta-text');  
    const infoContainer = render.find('.applecation__info');  
    fillMetaInfo(render, data, metaTextContainer);  
    fillAdditionalInfo(render, data, infoContainer);  
    waitForBackgroundLoad(activity, () => {  
        render.find('.applecation__meta, .applecation__info, .applecation__description').addClass('show');  
    });  
    const cacheKey = `${data.id}_${data.name ? 'tv' : 'movie'}`;  
    if (logoCache.has(cacheKey)) {  
        renderBestLogo(logoCache.get(cacheKey), logoContainer, titleElement, activity);  
        return;  
    }  
    const mediaType = data.name ? 'tv' : 'movie';  
    const apiUrl = Lampa.TMDB.api(`${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
    const currentActivity = Lampa.Activity.active();  
    if (!currentActivity || currentActivity.component !== 'full') return;  
    $.get(apiUrl, (imagesData) => {  
        logoCache.set(cacheKey, imagesData);  
        if (Lampa.Activity.active()?.component === 'full') renderBestLogo(imagesData, logoContainer, titleElement, activity);  
    }).fail(() => {  
        titleElement.show();  
        waitForBackgroundLoad(activity, () => { logoContainer.addClass('loaded'); });  
    });  
}  
  
let loadTimeout;  
function attachLogoLoader() {  
    Lampa.Listener.follow('full', (event) => {  
        if (event.type === 'complite') {  
            clearTimeout(loadTimeout);  
            loadTimeout = setTimeout(() => { loadLogo(event); }, 150);  
        }  
    });  
}  
  
function registerPlugin() {  
    const pluginManifest = { type: 'other', version: '1.1.0', name: 'NewCard', description: 'Новий дизайн картки фільму/серіалу.', author: '', icon: PLUGIN_ICON };  
    if (Lampa.Manifest) {  
        if (!Lampa.Manifest.plugins) Lampa.Manifest.plugins = {};  
        if (Array.isArray(Lampa.Manifest.plugins)) Lampa.Manifest.plugins.push(pluginManifest);  
        else Lampa.Manifest.plugins['newcard'] = pluginManifest;  
    }  
}  
  
function startPlugin() {  
    registerPlugin();  
    initializePlugin();  
}  
  
if (window.appready) startPlugin();  
else Lampa.Listener.follow('app', (event) => { if (event.type === 'ready') startPlugin(); });  
  
})();  
  
