(function () {      
    'use strict';      
    const PLUGIN_NAME = 'NewCard';      
    const PLUGIN_ID = 'new_card_style';      
    const ASSETS_PATH = 'https://crowley38.github.io/Icons/';      
    
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
                        <div class="cas-description" style="margin-top: 15px; font-size: 1.3em; line-height: 1.4; color: rgba(255,255,255,0.7); max-width: 700px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;"></div>        
                        
                        <div class="cas-standard-buttons-holder" style="margin-top: 30px;"></div>          
                    </div>          
                </div>          
            </div>          
        </div>`;          
        Lampa.Template.add('full_start_new', template);          
    }      
      
    function addStyles() {      
        if ($('#cas-main-styles').length) return; 
        const styles = `<style id="cas-main-styles">      
        .full-start-new.left-title { position: relative; width: 100%; height: 100%; }
        .left-title__content { padding-left: 4%; padding-bottom: 5%; display: flex; flex-direction: column; justify-content: flex-end; height: 90vh; opacity: 0; transform: translateY(20px); transition: all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .cas-animated .left-title__content { opacity: 1; transform: translateY(0); }
        
        .cas-logo img { max-width: 450px; max-height: 150px; object-fit: contain; }
        .cas-rate-item { display: flex; align-items: center; gap: 6px; font-weight: bold; }
        .cas-rate-item img { height: 18px; }

        /* Стилізація стандартного контейнера, який ми перемістили */
        .cas-standard-buttons-holder .full-start__buttons { 
            display: flex !important; 
            flex-direction: row !important; 
            gap: 15px !important; 
            margin: 0 !important; 
            padding: 0 !important;
            background: none !important;
        }
        
        /* Робимо стандартні кнопки Lampa красивішими під наш дизайн */
        .cas-standard-buttons-holder .full-start__button {
            background: rgba(255, 255, 255, 0.1) !important;
            border-radius: 12px !important;
            padding: 12px 24px !important;
            height: auto !important;
            border: 2px solid transparent !important;
            transition: all 0.3s ease !important;
        }
        .cas-standard-buttons-holder .full-start__button.focus {
            background: rgba(255, 255, 255, 0.25) !important;
            border-color: #fff !important;
            transform: scale(1.05);
        }
        </style>`;      
        $('body').append(styles);      
    }      
      
    function attachLoader() {    
        Lampa.Listener.follow('full', (event) => {    
            if (event.type === 'complite') {    
                const data = event.data.movie;    
                const render = event.object.activity.render();    
                
                // 1. Отримуємо СТАНДАРТНИЙ об'єкт кнопок Lampa
                // Це той самий об'єкт, який Lampa створює автоматично
                if (event.object.buttons) {
                    const standardButtons = event.object.buttons.render();
                    // Переміщуємо весь стандартний вузол у наш холдер
                    render.find('.cas-standard-buttons-holder').append(standardButtons);
                }

                // 2. Наповнюємо мета-дані (логотип, опис)
                if (data) {
                    // Логотип (спрощений пошук)
                    const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());
                    $.getJSON(imagesUrl, (res) => {
                        const logo = res.logos.find(l => l.iso_639_1 === 'uk' || l.iso_639_1 === 'en') || res.logos[0];
                        if (logo) {
                            render.find('.cas-logo').html(`<img src="${Lampa.TMDB.image('/t/p/w500' + logo.file_path)}">`);
                        } else {
                            render.find('.cas-logo').html(`<h1 style="font-size: 3.5em; margin:0;">${data.title || data.name}</h1>`);
                        }
                    });

                    // Опис та Рейтинг
                    render.find('.cas-description').text(data.overview || '');
                    const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);
                    render.find('.cas-rate-items').html(`<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span>${tmdbV}</span></div>`);
                    
                    const year = (data.release_date || data.first_air_date || '').split('-')[0];
                    render.find('.cas-meta-info').text(year + (data.genres ? ' • ' + data.genres[0].name : ''));
                }

                // Анімація появи
                setTimeout(() => {
                    render.find('.left-title__content').parent().parent().addClass('cas-animated');
                }, 100);
            }    
        });    
    }  
      
    if (window.appready) initializePlugin();      
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });      
})();
