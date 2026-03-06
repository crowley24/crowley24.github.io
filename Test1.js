(function () {    
    'use strict';    
  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="80" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><circle cx="50" cy="50" r="10" fill="white"/></svg>';  
  
    function initializePlugin() {    
        console.log('Cardify Layout: Plugin initialized');  
        addSettings();  
        addCustomTemplate();  
        addStyles();  
        attachLogoLoader();    
    }    
  
    function addSettings() {  
        if (Lampa.Storage.get('cardify_layout_enabled') === undefined) {  
            Lampa.Storage.set('cardify_layout_enabled', true);  
        }  
        if (Lampa.Storage.get('cardify_logo_rotate') === undefined) {  
            Lampa.Storage.set('cardify_logo_rotate', true);  
        }  
  
        Lampa.SettingsApi.addComponent({   
            component: 'cardify_layout_settings',   
            name: 'Cardify Layout',   
            icon: PLUGIN_ICON   
        });    
  
        Lampa.SettingsApi.addParam({  
            component: 'cardify_layout_settings',  
            param: {   
                name: 'cardify_layout_enabled',   
                type: 'trigger',   
                default: true   
            },  
            field: {   
                name: 'Netflix стиль інтерфейсу'   
            },  
            onChange: (value) => {  
                console.log('Cardify Layout: Setting changed to:', value);  
                if (Lampa.Activity.last()) {  
                    Lampa.Activity.last().reload();  
                }  
            }  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'cardify_layout_settings',  
            param: {   
                name: 'cardify_logo_rotate',   
                type: 'trigger',   
                default: true   
            },  
            field: {   
                name: 'Змінювати логотип при кожному відкритті'   
            },  
            onChange: (value) => {  
                console.log('Cardify Layout: Rotation setting changed to:', value);  
                if (Lampa.Activity.last()) {  
                    Lampa.Activity.last().reload();  
                }  
            }  
        });  
    }  
  
    function addCustomTemplate() {    
        const template = `  
        <div class="full-start-new cardify">    
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
                </div>  
            </div>  
        </div>`;    
        Lampa.Template.add('full_start_new', template);    
    }  
  
    function addStyles() {    
        const styles = `  
        <style>  
        .cardify .full-start-new__right {  
            display: -webkit-box;  
            display: -webkit-flex;  
            display: -moz-box;  
            display: -ms-flexbox;  
            display: flex;  
            -webkit-box-align: end;  
            -webkit-align-items: flex-end;  
            -moz-box-align: end;  
            -ms-flex-align: end;  
            align-items: flex-end;  
            position: relative;  
            height: 100vh;  
        }  
  
        .cardify__left {  
            -webkit-box-flex: 1;  
            -webkit-flex-grow: 1;  
            -moz-box-flex: 1;  
            -ms-flex-positive: 1;  
            flex-grow: 1;  
            padding: 4em 5em 4em 5em;  
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
            width: 55%;  
        }  
  
        .cardify__details {  
            margin-top: 1.5em;  
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
            transition: background-color 0.4s ease;  
        }  
  
        .cardify .full-start__background {  
            position: absolute;  
            top: 0;  
            left: 0;  
            width: 100%;  
            height: 100%;  
            z-index: 1;  
        }  
  
        .cardify .full-start-new__title {  
            font-size: 3.5em;  
            font-weight: 700;  
            line-height: 1.1;  
            margin-bottom: 0.5em;  
        }  
  
        .cardify .full-start-new__title img {  
            max-width: 400px;  
            max-height: 120px;  
            object-fit: contain;  
            object-position: left;  
        }  
  
        .cardify .full-start-new__info {  
            font-size: 1.2em;  
            margin-bottom: 1em;  
            opacity: 0.8;  
        }  
  
        .cardify .full-start-new__descr {  
            font-size: 1.1em;  
            line-height: 1.5;  
            max-width: 600px;  
            display: -webkit-box;  
            -webkit-line-clamp: 3;  
            -webkit-box-orient: vertical;  
            overflow: hidden;  
        }  
  
        /* Адаптивність для мобільних */  
        @media screen and (max-width: 768px) {  
            .cardify__left {  
                padding: 2em 3em 2em 3em;  
            }  
              
            .cardify .full-start-new__title {  
                font-size: 2.5em;  
            }  
              
            .cardify .full-start-new__title img {  
                max-width: 300px;  
                max-height: 80px;  
            }  
              
            .cardify__right {  
                width: 40%;  
            }  
        }  
  
        /* Горизонтальна орієнтація */  
        @media screen and (orientation: landscape) and (max-width: 1024px) {  
            .cardify__left {  
                padding: 2em 3em 2em 3em;  
            }  
              
            .cardify .full-start-new__title {  
                font-size: 2em;  
            }  
              
            .cardify .full-start-new__title img {  
                max-width: 250px;  
                max-height: 60px;  
            }  
              
            .cardify .full-start-new__descr {  
                -webkit-line-clamp: 2;  
            }  
        }  
  
        /* Дуже малі екрани */  
        @media screen and (max-width: 480px) {  
            .cardify__left {  
                padding: 1.5em 2em 1.5em 2em;  
            }  
              
            .cardify .full-start-new__title {  
                font-size: 1.8em;  
            }  
              
            .cardify .full-start-new__title img {  
                max-width: 200px;  
                max-height: 50px;  
            }  
              
            .cardify__right {  
                width: 30%;  
            }  
        }  
        </style>`;    
        $('body').append(styles);  
    }  
  
    function loadLogo(event) {    
        if (!Lampa.Storage.get('cardify_layout_enabled')) {  
            console.log('Cardify Layout: Layout disabled in settings');  
            return;  
        }  
  
        console.log('Cardify Layout: loadLogo called', event);  
          
        const data = event.data.movie;  
        const render = event.object.activity.render();  
          
        if (!data) {  
            console.log('Cardify Layout: No movie data found');  
            return;  
        }  
  
        // Додаємо overlay для ефекту  
        if (!$('.cardify-effects-overlay').length) {  
            $('body').append('<div class="cardify-effects-overlay"></div>');  
        }  
  
        // Заповнюємо метадані  
        const year = (data.release_date || data.first_air_date || '').split('-')[0];  
        const genres = data.genres?.slice(0, 2).map(g => g.name).join(' · ');  
        const runtime = data.runtime ? `${Math.floor(data.runtime / 60)}г ${data.runtime % 60}хв` : '';  
          
        render.find('.full-start-new__info').text(`${year}  ·  ${genres}  ·  ${runtime}`);  
        render.find('.full-start-new__descr').text(data.overview || '');  
  
        // Обробка логотипу  
        const titleElement = render.find('.full-start-new__title');  
        if (!titleElement.length) {  
            console.log('Cardify Layout: No title element found');  
            return;  
        }  
  
        const apiUrl = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
        console.log('Cardify Layout: Requesting logos from:', apiUrl);  
          
        $.get(apiUrl, (d) => {  
            console.log('Cardify Layout: TMDB response:', d);  
              
            if (!d.logos || !d.logos.length) {  
                console.log('Cardify Layout: No logos found');  
                return;  
            }  
  
            let selectedLogo;  
            const rotateEnabled = Lampa.Storage.get('cardify_logo_rotate');  
              
            if (rotateEnabled) {  
                selectedLogo = getNextLogo(data.id, d.logos);  
            } else {  
                selectedLogo = d.logos.find(l => l.iso_639_1 === 'uk') ||   
                              d.logos.find(l => l.iso_639_1 === 'en');  
            }  
              
            console.log('Cardify Layout: Selected logo:', selectedLogo);  
              
            if (selectedLogo) {  
                const logoUrl = Lampa.TMDB.image('/t/p/w500' + selectedLogo.file_path);  
                console.log('Cardify Layout: Logo URL:', logoUrl);  
                  
                titleElement.html(`<img src="${logoUrl}" alt="${data.title || data.name}">`);  
                console.log('Cardify Layout: Logo inserted successfully');  
            }  
        }).fail((xhr, status, error) => {  
            console.log('Cardify Layout: TMDB request failed:', status, error);  
        });  
    }  
  
    function getNextLogo(movieId, logos) {  
        const historyKey = `cardify_logo_history_${movieId}`;  
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
        console.log('Cardify Layout: Attaching logo loader');  
        Lampa.Listener.follow('full', (e) => {   
            console.log('Cardify Layout: Full event:', e.type);  
            if (e.type === 'complite') {  
                setTimeout(() => loadLogo(e), 10);  
            }  
        });    
    }    
  
    if (window.appready) {  
        console.log('Cardify Layout: App ready, initializing');  
        initializePlugin();    
    } else {  
        console.log('Cardify Layout: Waiting for app ready');  
        Lampa.Listener.follow('app', (e) => {   
            if (e.type === 'ready') {  
                console.log('Cardify Layout: App ready event received');  
                initializePlugin();  
            }  
        });    
    }  
})();
