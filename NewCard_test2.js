(function () {  
    'use strict';  
  
    // Іконка плагіна  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="8" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="8" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>';  
  
    // Нові константи для NewCard функціоналу  
    const ASSETS_PATH = 'https://crowley38.github.io/Icons/';  
    const CACHE_LIFETIME = 1000 * 60 * 60 * 24; // 24 години  
      
    // Простий кеш без LRU накладних витрат  
    const imageCache = new Map();  
      
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
  
    let logoCache = new Map();  
  
    // Додаткові функції з NewCard  
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
  
    // Спрощений кеш  
    function getCachedData(id) {  
        const cached = imageCache.get(id);  
        if (cached && (Date.now() - cached.time < CACHE_LIFETIME)) {  
            return cached.data;  
        }  
        return null;  
    }  
  
    function setCachedData(id, data) {  
        imageCache.set(id, { time: Date.now(), data: data });  
    }  
  
    function initializePlugin() {  
        addCustomTemplate();  
        addStyles();  
        addSettings();  
        attachLogoLoader();  
    }  
  
    function addCustomTemplate() {  
        const template = `<div class="full-start-new left-title">  
            <div class="full-start__background"></div>  
            <div class="full-start-new__wrapper">  
                <div class="full-start-new__left">  
                    <div class="applecation__logo"></div>  
                    <div class="full-start-new__title">#{title}</div>  
                    <div class="applecation__meta">  
                        <div class="applecation__info"></div>  
                        <div class="applecation__ratings"></div>  
                        <div class="applecation__description"></div>  
                    </div>  
                </div>  
                <div class="full-start-new__right">  
                    <div class="full-start-new__head hide"></div>  
                    <div class="full-start-new__details hide"></div>  
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
                            <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.180114 26.5147 0.417545 26.8042 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3165 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z" fill="currentColor"/><path d="M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z" fill="currentColor"/></svg>  
                            <span>#{title_reactions}</span>  
                        </div>  
                        <div class="full-start__button selector button--options">  
                            <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg>  
                        </div>  
                    </div>  
                </div>  
                <div class="full-start-new__reactions selector hide"></div>  
                <div class="full-start-new__rate-line hide"></div>  
                <div class="rating--modss" style="display: none;"></div>  
            </div>  
        </div>  
        <div class="hide buttons--container">  
            <div class="full-start__button view--torrent hide"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50" height="50"><path d="M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z" fill="currentColor"/></svg><span>#{full_torrents}</span></div>     
            <div class="full-start__button selector view--trailer"><svg height="70" viewBox="0 0 80 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z" fill="currentColor"/></svg><span>#{full_trailers}</span></div>    
        </div>  
    </div>`;    
        Lampa.Template.add('full_start_new', template);    
    }    
  
    function addStyles() {    
        const styles = `<style>    
:root { --cas-logo-scale: 1; --cas-blocks-gap: 30px; --cas-meta-size: 1.3em; --cas-anim-curve: cubic-bezier(0.25, 1, 0.5, 1); }    
  
.applecation__logo { text-align: center; margin-bottom: var(--cas-blocks-gap); min-height: 60px; display: flex; align-items: center; justify-content: center; }    
.applecation__logo img { max-height: 80px; max-width: 90%; object-fit: contain; transform: scale(var(--cas-logo-scale)); transition: transform 0.3s ease; }    
  
.applecation__meta { margin-bottom: var(--cas-blocks-gap); opacity: 0; transform: translateY(20px); transition: all 0.6s var(--cas-anim-curve); }    
.applecation__meta.show { opacity: 1; transform: translateY(0); }    
  
.applecation__info { margin-bottom: var(--cas-blocks-gap); opacity: 0; transform: translateY(20px); transition: all 0.6s var(--cas-anim-curve) 0.1s; }    
.applecation__info.show { opacity: 1; transform: translateY(0); }    
  
.applecation__ratings { margin-bottom: var(--cas-blocks-gap); opacity: 0; transform: translateY(20px); transition: all 0.6s var(--cas-anim-curve) 0.2s; }    
.applecation__ratings.show { opacity: 1; transform: translateY(0); }    
  
.applecation__description { margin-bottom: var(--cas-blocks-gap); opacity: 0; transform: translateY(20px); transition: all 0.6s var(--cas-anim-curve) 0.3s; }    
.applecation__description.show { opacity: 1; transform: translateY(0); }    
  
.applecation__studios { margin-bottom: var(--cas-blocks-gap); opacity: 0; transform: translateY(20px); transition: all 0.6s var(--cas-anim-curve) 0.4s; }    
.applecation__studios.show { opacity: 1; transform: translateY(0); }    
  
.applecation__quality { margin-bottom: var(--cas-blocks-gap); opacity: 0; transform: translateY(20px); transition: all 0.6s var(--cas-anim-curve) 0.5s; }    
.applecation__quality.show { opacity: 1; transform: translateY(0); }    
  
.cas-rate-item { display: inline-flex; align-items: center; gap: 6px; margin-right: 15px; font-size: var(--cas-meta-size); font-weight: 600; }    
.cas-rate-item img { width: 20px; height: 20px; }    
  
.cas-quality-item { display: inline-flex; align-items: center; }    
.cas-quality-item img { width: 24px; height: 24px; margin-right: 4px; }    
  
.cas-studio-item { display: inline-flex; align-items: center; }    
.cas-studio-item img { height: 24px; margin-right: 8px; object-fit: contain; }    
  
.applecation-animated { animation: applecationFadeIn 1s ease-out; }    
  
@keyframes applecationFadeIn {    
    from { opacity: 0; transform: translateY(30px); }    
    to { opacity: 1; transform: translateY(0); }    
}    
</style>`;    
        Lampa.Template.add('applecation_css', styles);    
        $('head').append(Lampa.Template.get('applecation_css', {}, true));    
    }    
  
    // Функції з NewCard для інтеграції  
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
  
    // Спрощений кеш  
    function getCachedData(id) {  
        const cached = imageCache.get(id);  
        if (cached && (Date.now() - cached.time < CACHE_LIFETIME)) {  
            return cached.data;  
        }  
        return null;  
    }  
  
    function setCachedData(id, data) {  
        imageCache.set(id, { time: Date.now(), data: data });  
    }  
  
    // Функція отримання якості логотипу  
    function getLogoQuality() {  
        return Lampa.Storage.get('cas_logo_quality') || 'original';  
    }  
  
    // Оновлена функція заповнення рейтингів з NewCard  
    function fillRatings(ratingsContainer, data) {  
        let ratesHtml = '';  
          
        // TMDB рейтинг  
        const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);  
        if (tmdbV > 0) {  
            ratesHtml += `<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>`;  
        }  
          
        // CUB рейтинг з реакцій  
        if (data.reactions && data.reactions.result) {  
            let sum = 0, cnt = 0;  
            const coef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };  
            data.reactions.result.forEach(r => {   
                if (r.counter) {   
                    sum += (r.counter * coef[r.type]);   
                    cnt += r.counter;   
                }   
            });  
            if (cnt >= 5) {  
                const cubV = (((data.name?7.4:6.5)*(data.name?50:150)+sum)/((data.name?50:150)+cnt)).toFixed(1);  
                ratesHtml += `<div class="cas-rate-item"><img src="${ICONS.cub}"> <span style="color:${getRatingColor(cubV)}">${cubV}</span></div>`;  
            }  
        }  
          
        ratingsContainer.html(ratesHtml);  
    }  
  
    // Функція відображення якості  
    function displayQuality(render, data) {  
        if (!Lampa.Storage.get('cas_show_quality') || !Lampa.Parser.get) return;  
          
        setTimeout(() => {  
            Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {  
                const items = res.Results || res;  
                if (items && Array.isArray(items) && items.length > 0) {  
                    const quality = { res: '', hdr: false, dv: false, ukr: false };  
                      
                    items.slice(0, 15).forEach(i => {  
                        const t = (i.Title || i.title || '').toLowerCase();  
                        if (t.includes('4k') || t.includes('2160')) quality.res = '4K';  
                        else if (!quality.res && (t.includes('1080') || t.includes('fhd'))) quality.res = 'FULL HD';  
                        if (t.includes('hdr')) quality.hdr = true;  
                        if (t.includes('dv') || t.includes('dovi') || t.includes('vision')) quality.dv = true;  
                        if (t.includes('ukr') || t.includes('укр')) quality.ukr = true;  
                    });  
  
                    let qHtml = '';  
                    if (quality.res) qHtml += `<div class="cas-quality-item"><img src="${QUALITY_ICONS[quality.res]}"></div>`;  
                    if (quality.dv) qHtml += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['Dolby Vision']}"></div>`;  
                    else if (quality.hdr) qHtml += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;  
                    if (quality.ukr) qHtml += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['UKR']}"></div>`;  
                      
                    if (qHtml) {  
                        render.find('.applecation__quality').html('<span style="opacity: 0.5; margin: 0 5px;">•</span>' + qHtml).show();  
                    } else {  
                        render.find('.applecation__quality').hide();  
                    }  
                } else {  
                    render.find('.applecation__quality').hide();  
                }  
            });  
        }, 500);  
    }  
  
    // Функція відображення опису  
    function displayDescription(render, data) {  
        if (!Lampa.Storage.get('cas_show_description')) {  
            render.find('.applecation__description').hide();  
            return;  
        }  
          
        const description = data.overview || '';  
        if (description) {  
            render.find('.applecation__description').html(`<div style="font-size: var(--cas-meta-size); line-height: 1.4; opacity: 0.9;">${description}</div>`).show();  
        } else {  
            render.find('.applecation__description').hide();  
        }  
    }  
  
    // Функція заповнення додаткової інформації  
    function fillAdditionalInfo(render, data) {  
        const infoContainer = render.find('.applecation__info');  
        const infoParts = [];  
  
        // Рік  
        if (data.release_date || data.first_air_date) {  
            const year = (data.release_date || data.first_air_date).slice(0, 4);  
            infoParts.push(year);  
        }  
  
        // Тривалість  
        if (data.runtime || (data.episode_run_time && data.episode_run_time[0])) {  
            const runtime = data.runtime || data.episode_run_time[0];  
            const timeH = Lampa.Lang.translate('time_h').replace('.', '');  
            const timeM = Lampa.Lang.translate('time_m').replace('.', '');  
            const hours = Math.floor(runtime / 60);  
            const minutes = runtime % 60;  
            const timeStr = hours > 0 ? `${hours} ${timeH} ${minutes} ${timeM}` : `${minutes} ${timeM}`;  
            infoParts.push(timeStr);  
        }  
  
        // Жанри  
        if (data.genres && data.genres.length > 0) {  
            const genres = data.genres.slice(0, 3).map(g => g.name).join(', ');  
            infoParts.push(genres);  
        }  
  
        infoContainer.html(infoParts.join(' · '));  
    }  
  
    // Функція заповнення метаданих  
    function fillMetaInfo(render, data) {  
        const metaContainer = render.find('.applecation__meta');  
        const metaParts = [];  
  
        // Рік  
        if (data.release_date || data.first_air_date) {  
            const year = (data.release_date || data.first_air_date).slice(0, 4);  
            metaParts.push(year);  
        }  
  
        // Країни  
        if (data.production_countries && data.production_countries.length > 0) {  
            const countries = data.production_countries.slice(0, 2).map(c => c.name).join(', ');  
            metaParts.push(countries);  
        }  
  
        // Вік  
        if (data.adult) {  
            metaParts.push('18+');  
        }  
  
        metaContainer.html(metaParts.join(' · '));  
    }  
  
    // Оновлена функція завантаження логотипа  
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
        fillRatings(ratingsContainer, data);    
        fillMetaInfo(render, data);    
        fillAdditionalInfo(render, data);    
        displayDescription(render, data);  
        displayQuality(render, data);  
    
        waitForBackgroundLoad(activity, () => {    
            render.find('.applecation__meta').addClass('show');    
            render.find('.applecation__info').addClass('show');    
            render.find('.applecation__ratings').addClass('show');    
            render.find('.applecation__description').addClass('show');    
            render.find('.applecation__studios').addClass('show');    
            render.find('.applecation__quality').addClass('show');    
        });    
    
        // ====== ОПТИМІЗАЦІЯ КАШУВАННЯ ======    
        const cacheKey = `${data.id}_${data.name ? 'tv' : 'movie'}`;    
            
        if (logoCache.has(cacheKey)) {    
            const cached = logoCache.get(cacheKey);    
            applyLogoData(cached, logoContainer, titleElement, activity);    
            return;    
        }    
        // =====================================    
    
        const mediaType = data.name ? 'tv' : 'movie';    
        const currentLang = 'uk';    
            
        const apiUrl = Lampa.TMDB.api(    
            `${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}&include_image_language=${currentLang},en,null`    
        );    
    
        // Перевірка чи активна ще картка - ВИПРАВЛЕНО    
        const currentActivity = Lampa.Activity.active();    
        if (!currentActivity || currentActivity.component !== 'full') {    
            return;    
        }    
    
        $.get(apiUrl, (imagesData) => {    
            // Ще раз перевіряємо чи активна картка    
            const currentActivity = Lampa.Activity.active();    
            if (!currentActivity || currentActivity.component !== 'full') {    
                return;    
            }    
    
            // Кешуємо результат    
            logoCache.set(cacheKey, imagesData);    
            applyLogoData(imagesData, logoContainer, titleElement, activity);    
        }).fail(() => {    
            titleElement.show();    
            waitForBackgroundLoad(activity, () => {    
                logoContainer.addClass('loaded');    
            });    
        });    
    }    
    
    // Застосування даних логотипа  
    function applyLogoData(imagesData, logoContainer, titleElement, activity) {  
        const quality = getLogoQuality();  
        const logos = imagesData.logos || [];  
          
        const logo = logos.find(l => l.iso_639_1 === 'uk') ||   
                    logos.find(l => l.iso_639_1 === 'en') ||   
                    logos[0];  
          
        if (logo) {  
            const logoUrl = Lampa.TMDB.image(`/t/p/${quality}${logo.file_path}`);  
              
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
  
    // Додавання налаштувань  
    function addSettings() {  
        const defaults = {  
            'cas_logo_quality': 'original',  
            'cas_show_studios': true,  
            'cas_show_quality': true,  
            'cas_show_description': true  
        };  
  
        Object.keys(defaults).forEach(key => {  
            if (Lampa.Storage.get(key) === undefined) {  
                Lampa.Storage.set(key, defaults[key]);  
            }  
        });  
  
        Lampa.SettingsApi.addComponent({  
            component: 'applecation',  
            name: 'Apple Card',  
            icon: PLUGIN_ICON  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'applecation',  
            param: {   
                name: 'cas_logo_quality',   
                type: 'select',   
                values: { 'w300':'300px', 'w500':'500px', 'original':'Original' },   
                default: 'original'   
            },  
            field: { name: 'Якість логотипу студій' }  
        });  
  
        Lampa.SettingsApi.addParam({    
    component: 'applecation',    
    param: { name: 'cas_show_studios', type: 'trigger', default: true },    
    field: { name: 'Показувати студії' }    
});  
  
Lampa.SettingsApi.addParam({  
    component: 'applecation',  
    param: { name: 'cas_show_quality', type: 'trigger', default: true },  
    field: { name: 'Показувати якість' }  
});  
  
Lampa.SettingsApi.addParam({  
    component: 'applecation',  
    param: { name: 'cas_show_description', type: 'trigger', default: true },  
    field: { name: 'Показувати опис' }  
});  
}  
  
// Оновлена функція ініціалізації  
function initializePlugin() {  
    addCustomTemplate();  
    addStyles();  
    addSettings();  
    attachLogoLoader();  
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
  
// Запуск плагіна  
function startPlugin() {   
    registerPlugin();  
    initializePlugin();   
}  
  
if (window.appready) {  
    startPlugin();  
} else {  
    Lampa.Listener.follow('app', (e) => {   
        if (e.type === 'ready') startPlugin();   
    });  
}  
    
  
