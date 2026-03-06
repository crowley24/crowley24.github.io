(function () {    
    'use strict';    
  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="80" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><circle cx="50" cy="50" r="10" fill="white"/></svg>';  
  
    function initializePlugin() {    
        console.log('Netflix Layout: Plugin initialized');  
        addSettings();  
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
                name: 'Використовувати Netflix стиль'   
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
  
    function addStyles() {    
        const styles = `  
        <style>  
        body.netflix-layout-enabled .full-start-new {  
            display: flex !important;  
            height: 100vh !important;  
            position: relative !important;  
        }  
  
        body.netflix-layout-enabled .full-start__body {  
            width: 45% !important;  
            padding-left: 5% !important;  
            display: flex !important;  
            flex-direction: column !important;  
            justify-content: center !important;  
            z-index: 10 !important;  
            background: linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, transparent 100%) !important;  
        }  
  
        body.netflix-layout-enabled .full-start__background {  
            position: absolute !important;  
            top: 0 !important;  
            left: 0 !important;  
            width: 100% !important;  
            height: 100% !important;  
            z-index: 1 !important;  
        }  
  
        body.netflix-layout-enabled .full-start__title img {  
            max-width: 400px !important;  
            max-height: 120px !important;  
            object-fit: contain !important;  
            object-position: left !important;  
        }  
  
        body.netflix-layout-enabled .full-start__title:not(:has(img)) {  
            font-size: 3em !important;  
            font-weight: 700 !important;  
            color: #fff !important;  
            margin-bottom: 0.5em !important;  
            line-height: 1.1 !important;  
        }  
  
        body.netflix-layout-enabled .full-start__info {  
            font-size: 1.2em !important;  
            color: rgba(255,255,255,0.8) !important;  
            margin-bottom: 0.5em !important;  
            font-weight: 500 !important;  
        }  
  
        body.netflix-layout-enabled .full-start__descr {  
            font-size: 1.1em !important;  
            line-height: 1.6 !important;  
            color: rgba(255,255,255,0.9) !important;  
            max-width: 600px !important;  
            display: -webkit-box !important;  
            -webkit-line-clamp: 3 !important;  
            -webkit-box-orient: vertical !important;  
            overflow: hidden !important;  
        }  
  
        body.netflix-layout-enabled .full-start-new__buttons {  
            display: flex !important;  
            align-items: center !important;  
            gap: 15px !important;  
            margin-top: 2em !important;  
        }  
  
        body.netflix-layout-enabled .button--play {  
            background: #fff !important;  
            color: #000 !important;  
            padding: 12px 24px !important;  
            border-radius: 8px !important;  
            font-weight: 600 !important;  
            font-size: 1.1em !important;  
        }  
  
        body.netflix-layout-enabled .full-start__button:not(.button--play) {  
            background: rgba(255,255,255,0.2) !important;  
            border: none !important;  
            color: #fff !important;  
            padding: 12px !important;  
            border-radius: 50% !important;  
            width: 48px !important;  
            height: 48px !important;  
        }  
  
        /* Мобільні пристрої */  
        @media screen and (max-width: 768px) {  
            body.netflix-layout-enabled .full-start__body {  
                width: 100% !important;  
                padding: 5% 4% !important;  
                background: linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, transparent 100%) !important;  
            }  
              
            body.netflix-layout-enabled .full-start__background {  
                display: none !important;  
            }  
              
            body.netflix-layout-enabled .full-start__title img {  
                max-width: 300px !important;  
                max-height: 80px !important;  
            }  
              
            body.netflix-layout-enabled .full-start__title:not(:has(img)) {  
                font-size: 2em !important;  
            }  
        }  
  
        /* Планшети */  
        @media screen and (min-width: 769px) and (max-width: 1024px) {  
            body.netflix-layout-enabled .full-start__body {  
                width: 55% !important;  
                padding-left: 4% !important;  
            }  
        }  
  
        /* Горизонтальна орієнтація */  
        @media screen and (max-height: 600px) and (orientation: landscape) {  
            body.netflix-layout-enabled .full-start__body {  
                padding: 2% 4% !important;  
            }  
              
            body.netflix-layout-enabled .full-start__title img {  
                max-height: 60px !important;  
            }  
              
            body.netflix-layout-enabled .full-start__title:not(:has(img)) {  
                font-size: 1.8em !important;  
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
  
        // Додаємо клас для активації стилів  
        $('body').addClass('netflix-layout-enabled');  
  
        const titleElement = render.find('.full-start__title');  
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
