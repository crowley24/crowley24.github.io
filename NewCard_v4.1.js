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
      
    function initializePlugin() {      
        addCustomTemplate();      
        addStyles();      
        attachLoader();      
    }      
      
    function addCustomTemplate() {           
        const template = `<div class="full-start-new left-title">          
            <div class="full-start-new__body">          
                <div class="full-start-new__right">          
                    <div class="left-title__content">          
                        <div class="cas-logo-container" style="margin-bottom: 25px;">        
                            <div class="cas-logo"></div>        
                        </div>        
                        <div class="cas-ratings-line" style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">        
                            <div class="cas-rate-items" style="display: flex; align-items: center; gap: 12px;"></div>        
                            <div class="cas-meta-info" style="opacity: 0.7; font-size: 1.2em;"></div>        
                        </div>        
                        <div class="cas-description" style="margin-top: 15px; font-size: 1.3em; line-height: 1.4; color: rgba(255,255,255,0.7); max-width: 750px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;"></div>        
                        
                        <div class="cas-standard-buttons-container" style="margin-top: 30px;"></div>          
                    </div>          
                </div>          
            </div>          
        </div>`;          
        Lampa.Template.add('full_start_new', template);          
    }      
      
    function addStyles() {      
        if ($('#cas-main-styles').length) return; 
        const styles = `<style id="cas-main-styles">      
        .full-start-new.left-title { width: 100%; height: 100%; position: relative; }
        .left-title__content { padding-left: 4%; padding-bottom: 6%; display: flex; flex-direction: column; justify-content: flex-end; height: 92vh; opacity: 0; transform: translateY(20px); transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .cas-animated .left-title__content { opacity: 1; transform: translateY(0); }
        
        .cas-logo img { max-width: 450px; max-height: 160px; object-fit: contain; }
        .cas-rate-item { display: flex; align-items: center; gap: 6px; font-weight: bold; }
        .cas-rate-item img { height: 20px; }

        /* Стилі для вписання стандартних кнопок у наш макет */
        .cas-standard-buttons-container .full-start__buttons { 
            display: flex !important; 
            flex-direction: row !important; 
            flex-wrap: wrap;
            gap: 15px !important; 
            margin: 0 !important; 
            padding: 0 !important;
            background: none !important;
        }
        
        /* Видаляємо відступи самої Лампи, які можуть псувати наш дизайн */
        .full-start-new__right { padding: 0 !important; }
        </style>`;      
        $('body').append(styles);      
    }      

    function getCachedData(id) {      
        const cache = Lampa.Storage.get('cas_images_cache') || {};      
        const item = cache[id];      
        if (item && (Date.now() - item.time < CACHE_LIFETIME)) return item.data;      
        return null;      
    }      
      
    function setCachedData(id, data) {      
        const cache = Lampa.Storage.get('cas_images_cache') || {};      
        cache[id] = { time: Date.now(), data: data };      
        Lampa.Storage.set('cas_images_cache', cache);      
    }      

    function attachLoader() {    
        Lampa.Listener.follow('full', (event) => {    
            if (event.type === 'complite') {    
                const data = event.data.movie;    
                const render = event.object.activity.render();    
                
                // === ПОВЕРНЕННЯ СТАНДАРТНИХ КНОПОК ===
                if (event.object.buttons) {
                    const originalButtons = event.object.buttons.render();
                    // Просто переміщуємо стандартний DOM-вузол у наш контейнер
                    render.find('.cas-standard-buttons-container').empty().append(originalButtons);
                }

                if (data) {
                    // Завантаження логотипу через TMDB API
                    const cacheId = 'tmdb_' + data.id;
                    const cached = getCachedData(cacheId);
                    
                    const updateLogo = (res) => {
                        const logo = res.logos.find(l => l.iso_639_1 === 'uk' || l.iso_639_1 === 'en') || res.logos[0];
                        if (logo) {
                            render.find('.cas-logo').html(`<img src="${Lampa.TMDB.image('/t/p/w500' + logo.file_path)}">`);
                        } else {
                            render.find('.cas-logo').html(`<h1 style="font-size: 3.5em; margin:0;">${data.title || data.name}</h1>`);
                        }
                    };

                    if (cached) updateLogo(cached);
                    else {
                        const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());
                        $.getJSON(imagesUrl, (res) => { 
                            setCachedData(cacheId, res); 
                            updateLogo(res); 
                        });
                    }

                    // Мета-дані та опис
                    render.find('.cas-description').text(data.overview || '');
                    const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);
                    render.find('.cas-rate-items').html(`<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span>${tmdbV}</span></div>`);
                    
                    const year = (data.release_date || data.first_air_date || '').split('-')[0];
                    const genre = data.genres ? ' • ' + data.genres[0].name : '';
                    render.find('.cas-meta-info').text(year + genre);
                }

                // Анімація входу
                setTimeout(() => {
                    render.find('.left-title__content').parent().parent().addClass('cas-animated');
                }, 100);
            }    
        });    
    }  
      
    if (window.appready) initializePlugin();      
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });      
})();
