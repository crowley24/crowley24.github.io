(function () {    
    'use strict';    
  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="80" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><circle cx="50" cy="50" r="10" fill="white"/></svg>';  
  
    function initializePlugin() {    
        console.log('Netflix Layout: Plugin initialized');  
        addSettings();  
        addCustomTemplate();  
        addStyles();  
        attachLogoLoader();    
    }    
  
    function addSettings() {  
        if (Lampa.Storage.get('netflix_layout_enabled') === undefined) {  
            Lampa.Storage.set('netflix_layout_enabled', true);  
        }  
        if (Lampa.Storage.get('netflix_logo_rotate') === undefined) {  
            Lampa.Storage.set('netflix_logo_rotate', true);  
        }  
  
        Lampa.SettingsApi.addComponent({   
            component: 'netflix_layout_settings',   
            name: 'Netflix Layout',   
            icon: PLUGIN_ICON   
        });    
  
        Lampa.SettingsApi.addParam({  
            component: 'netflix_layout_settings',  
            param: {   
                name: 'netflix_layout_enabled',   
                type: 'trigger',   
                default: true   
            },  
            field: {   
                name: 'Netflix стиль інтерфейсу'   
            },  
            onChange: (value) => {  
                console.log('Netflix Layout: Setting changed to:', value);  
                if (Lampa.Activity.last()) {  
                    Lampa.Activity.last().reload();  
                }  
            }  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'netflix_layout_settings',  
            param: {   
                name: 'netflix_logo_rotate',   
                type: 'trigger',   
                default: true   
            },  
            field: {   
                name: 'Змінювати логотип при кожному відкритті'   
            },  
            onChange: (value) => {  
                console.log('Netflix Layout: Rotation setting changed to:', value);  
                if (Lampa.Activity.last()) {  
                    Lampa.Activity.last().reload();  
                }  
            }  
        });  
    }  
  
    function addCustomTemplate() {    
        const template = `  
        <div class="full-start-new cardify">    
            <div class="full-start__details">  
                <div class="full-start-new__right">  
                    <div class="cardify__left">  
                        <div class="full-start-new__head"></div>  
                        <div class="full-start-new__title">{title}</div>  
                        <div class="full-start-new__rate-line rate-fix">  
                            <div class="full-start-new__rate">  
                                <div class="full-start-new__rating--imdb hide"></div>  
                                <div class="full-start-new__rating--kp hide"></div>  
                            </div>  
                        </div>  
                        <div class="cardify__details">  
                            <div class="full-start-new__info"></div>  
                            <div class="full-start-new__descr"></div>  
                        </div>  
                        <div class="full-start-new__buttons"></div>  
                    </div>  
                    <div class="cardify__right">  
                        <div class="full-start__background"></div>  
                        <div class="cardify-effects-overlay"></div>  
                    </div>  
                </div>  
            </div>  
        </div>`;    
        Lampa.Template.add('full_start_new', template);    
    }    
  
    function addStyles() {    
        const styles = `  
        <style>  
        .cardify .full-start__details {  
            position: relative;  
            height: 100vh;  
            overflow: hidden;  
        }  
  
        .cardify .full-start-new__right {  
            display: -webkit-box;  
            display: -webkit-flex;  
            display: -moz-box;  
            display: -ms-flexbox;  
            display: flex;  
            height: 100%;  
        }  
  
        .cardify__left {  
            -webkit-box-flex: 1;  
            -webkit-flex-grow: 1;  
            -moz-box-flex: 1;  
            -ms-flex-positive: 1;  
            flex-grow: 1;  
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
            padding: 0 5% 10% 5%;  
            position: relative;  
            z-index: 2;  
        }  
  
        .cardify__right {  
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
            -webkit-flex-shrink: 0;  
            -ms-flex-negative: 0;  
            flex-shrink: 0;  
            position: relative;  
        }  
  
        .cardify-effects-overlay {  
            position: fixed;  
            top: 0;  
            left: 0;  
            width: 100vw;  
            height: 100vh;  
            pointer-events: none;  
            z-index: 0;  
            background-color: transparent;  
            background-image: linear-gradient(225deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 55%);  
        }  
  
        .cardify .full-start-new__title {  
            font-size: 4em;  
            font-weight: 700;  
            line-height: 1.1;  
            margin-bottom: 0.5em;  
        }  
  
        .cardify .full-start-new__title img {  
            max-height: 120px;  
            max-width: 100%;  
            object-fit: contain;  
        }  
  
        .cardify .full-start-new__rate-line {  
            margin-bottom: 1em;  
        }  
  
        .cardify .full-start-new__info {  
            font-size: 1.2em;  
            margin-bottom: 0.5em;  
            opacity: 0.8;  
        }  
  
        .cardify .full-start-new__descr {  
            font-size: 1.1em;  
            line-height: 1.4;  
            max-height: 4.2em;  
            overflow: hidden;  
            display: -webkit-box;  
            -webkit-line-clamp: 3;  
            -webkit-box-orient: vertical;  
            margin-bottom: 1.5em;  
            opacity: 0.9;  
        }  
  
        .cardify .full-start-new__buttons {  
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
            gap: 1em;  
        }  
  
        /* Мобільна адаптивність */  
        @media screen and (max-width: 768px) {  
            .cardify__left {  
                padding: 0 3% 15% 3%;  
            }  
              
            .cardify .full-start-new__title {  
                font-size: 2.5em;  
            }  
              
            .cardify .full-start-new__title img {  
                max-height: 80px;  
            }  
              
            .cardify .full-start-new__info {  
                font-size: 1em;  
            }  
              
            .cardify .full-start-new__descr {  
                font-size: 0.9em;  
            }  
        }  
  
        /* Горизонтальна орієнтація */  
        @media screen and (orientation: landscape) and (max-width: 1024px) {  
            .cardify__left {  
                padding: 0 3% 5% 3%;  
            }  
              
            .cardify .full-start-new__title {  
                font-size: 2em;  
            }  
              
            .cardify .full-start-new__title img {  
                max-height: 60px;  
            }  
              
            .cardify .full-start-new__descr {  
                -webkit-line-clamp: 2;  
                max-height: 2.8em;  
            }  
        }  
        </style>`;    
        $('body').append(styles);    
    }    
  
    function loadLogo(event) {    
        if (!Lampa.Storage.get('netflix_layout_enabled')) {  
            console.log('Netflix Layout: Layout disabled in settings');  
            return;  
        }  
  
        console.log('Netflix Layout: loadLogo called', event);  
          
        const data = event.data.movie;  
        const render = event.object.activity.render();  
          
        if (!data) {  
            console.log('Netflix Layout: No movie data found');  
            return;  
        }  
  
        console.log('Netflix Layout: Movie data:', data.title || data.name, data.id);  
  
        // Заповнюємо метадані  
        const year = (data.release_date || data.first_air_date || '').split('-')[0];  
        const genres = data.genres?.slice(0, 2).map(g => g.name).join(' · ');  
        const runtime = data.runtime ? `${Math.floor(data.runtime / 60)}г ${data.runtime % 60}хв` : '';  
          
        render.find('.full-start-new__info').text(`${year}  ·  ${genres}  ·  ${runtime}`);  
        render.find('.full-start-new__descr').text(data.overview || '');  
  
        // Обробка логотипу  
        const titleElement = render.find('.full-start-new__title');  
        if (!titleElement.length) {  
            console.log('Netflix Layout: No title element found');  
            return;  
        }  
  
        const apiUrl = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
        console.log('Netflix Layout: Requesting logos from:', apiUrl);  
          
        $.get(apiUrl, (d) => {  
            console.log('Netflix Layout: TMDB response:', d);  
              
            if (!d.logos || !d.logos.length) {  
                console.log('Netflix Layout: No logos found');  
                return;  
            }  
  
            let selectedLogo;  
            const rotateEnabled = Lampa.Storage.get('netflix_logo_rotate');  
              
            if (rotateEnabled) {  
                selectedLogo = getNextLogo(data.id, d.logos);  
            } else {  
                selectedLogo = d.logos.find(l => l.iso_639_1 === 'uk') ||   
                              d.logos.find(l => l.iso_639_1 === 'en');  
            }  
              
            console.log('Netflix Layout: Selected logo:', selectedLogo);  
              
            if (selectedLogo) {  
                const logoUrl = Lampa.TMDB.image('/t/p/w500' + selectedLogo.file_path);  
                console.log('Netflix Layout: Logo URL:', logoUrl);  
                  
                titleElement.html(`<img src="${logoUrl}" alt="${data.title || data.name}">`);  
                console.log('Netflix Layout: Logo inserted successfully');  
            }  
        }).fail((xhr, status, error) => {  
            console.log('Netflix Layout: TMDB request failed:', status, error);  
        });  
    }  
  
    function getNextLogo(movieId, logos) {  
        const historyKey = `netflix_logo_history_${movieId}`;  
        let logoHistory = Lampa.Storage.get(historyKey) || [];  
          
        const filteredLogos = logos.filter(l => l.iso_639_1 === 'uk' || l.iso_639_1 === 'en');  
        const prioritizedLogos = [  
            ...filteredLogos.filter(l => l.iso_639_1 === 'uk'),  
            ...filteredLogos.filter(l => l.iso_639_1 === 'en')  
        ];  
  
        let nextLogo = null;  
        for (const logo of prioritizedLogos) {  
            if (!logoHistory.includes(logo.file_path)) {  
                nextLogo = logo;  
                break;  
            }  
        }  
  
        if (!nextLogo && prioritizedLogos.length > 0) {  
            logoHistory = [];  
            nextLogo = prioritizedLogos[0];  
        }  
  
        if (nextLogo) {  
            logoHistory.push(nextLogo.file_path);  
            Lampa.Storage.set(historyKey, logoHistory);  
        }  
  
        return nextLogo;  
    }  
  
    function attachLogoLoader() {    
        console.log('Netflix Layout: Attaching logo loader');  
        Lampa.Listener.follow('full', (e) => {   
            console.log('Netflix Layout: Full event:', e.type);  
            if (e.type === 'complite') {  
                setTimeout(() => loadLogo(e), 10);  
            }  
        });    
    }    
  
    if (window.appready) {  
        console.log('Netflix Layout: App ready, initializing');  
        initializePlugin();    
    } else {  
        console.log('Netflix Layout: Waiting for app ready');  
        Lampa.Listener.follow('app', (e) => {   
            if (e.type === 'ready') {  
                console.log('Netflix Layout: App ready event received');  
                initializePlugin();  
            }  
        });    
    }  
})();
