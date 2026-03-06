(function () {    
    'use strict';    
  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="80" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><circle cx="50" cy="50" r="10" fill="white"/></svg>';  
  
    const ICONS = {  
        play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor"/></svg>`,  
        book: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,  
        reaction: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="currentColor" stroke-width="2"/></svg>`,  
        options: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>`,  
        trailer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 6H3C1.9 6 1 6.9 1 8V16C1 17.1 1.9 18 3 18H21C22.1 18 23 17.1 23 16V8C23 6.9 22.1 6 21 6Z" stroke="currentColor" stroke-width="2"/><path d="M10 9L15 12L10 15V9Z" fill="currentColor"/></svg>`  
    };  
  
    function initializePlugin() {    
        console.log('Netflix Single: Plugin initialized');  
        addSettings();  
        addStyles();  
        attachLogoLoader();    
    }    
  
    function addSettings() {  
        if (Lampa.Storage.get('netflix_single_enabled') === undefined) {  
            Lampa.Storage.set('netflix_single_enabled', true);  
        }  
        if (Lampa.Storage.get('netflix_logo_rotate') === undefined) {  
            Lampa.Storage.set('netflix_logo_rotate', true);  
        }  
  
        Lampa.SettingsApi.addComponent({   
            component: 'netflix_single_settings',   
            name: 'Netflix Single',   
            icon: PLUGIN_ICON   
        });    
  
        Lampa.SettingsApi.addParam({  
            component: 'netflix_single_settings',  
            param: {   
                name: 'netflix_single_enabled',   
                type: 'trigger',   
                default: true   
            },  
            field: {   
                name: 'Netflix стиль інтерфейсу'   
            },  
            onChange: (value) => {  
                console.log('Netflix Single: Setting changed to:', value);  
                if (Lampa.Activity.last()) {  
                    Lampa.Activity.last().reload();  
                }  
            }  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'netflix_single_settings',  
            param: {   
                name: 'netflix_logo_rotate',   
                type: 'trigger',   
                default: true   
            },  
            field: {   
                name: 'Змінювати логотип при кожному відкритті'   
            },  
            onChange: (value) => {  
                console.log('Netflix Single: Rotation setting changed to:', value);  
                if (Lampa.Activity.last()) {  
                    Lampa.Activity.last().reload();  
                }  
            }  
        });  
    }  
  
    function addStyles() {    
        const styles = `  
        <style>  
        body.netflix-single-enabled .full-start-new {  
            position: relative !important;  
            height: 100vh !important;  
            display: flex !important;  
            align-items: flex-end !important;  
            padding-left: 5% !important;  
            overflow: hidden !important;  
        }  
  
        /* Фонове зображення через псевдо-елемент */  
        body.netflix-single-enabled .full-start-new::before {  
            content: '' !important;  
            position: absolute !important;  
            top: 0 !important;  
            left: 0 !important;  
            right: 0 !important;  
            bottom: 0 !important;  
            background: inherit !important;  
            background-size: cover !important;  
            background-position: center !important;  
            z-index: 1 !important;  
        }  
  
        /* Градієнтний overlay */  
        body.netflix-single-enabled .full-start-new::after {  
            content: '' !important;  
            position: absolute !important;  
            top: 0 !important;  
            left: 0 !important;  
            right: 0 !important;  
            bottom: 0 !important;  
            background: linear-gradient(90deg,  
                rgba(0, 0, 0, 1) 0%,  
                rgba(0, 0, 0, 0.8) 25%,  
                rgba(0, 0, 0, 0.4) 50%,  
                rgba(0, 0, 0, 0) 100%  
            ) !important;  
            z-index: 2 !important;  
        }  
  
        /* Контент поверх фону */  
        body.netflix-single-enabled .full-start__body {  
            position: relative !important;  
            z-index: 3 !important;  
            max-width: 45% !important;  
            padding-bottom: 10% !important;  
            background: none !important;  
        }  
  
        body.netflix-single-enabled .full-start__title img {  
            max-width: 400px !important;  
            max-height: 120px !important;  
            object-fit: contain !important;  
            object-position: left !important;  
        }  
  
        body.netflix-single-enabled .full-start__title:not(:has(img)) {  
            font-size: 3em !important;  
            font-weight: 700 !important;  
            color: #fff !important;  
            margin-bottom: 0.5em !important;  
            line-height: 1.1 !important;  
        }  
  
        body.netflix-single-enabled .full-start__info {  
            font-size: 1.2em !important;  
            color: rgba(255,255,255,0.8) !important;  
            margin-bottom: 0.5em !important;  
            font-weight: 500 !important;  
        }  
  
        body.netflix-single-enabled .full-start__descr {  
            font-size: 1.1em !important;  
            line-height: 1.6 !important;  
            color: rgba(255,255,255,0.9) !important;  
            max-width: 600px !important;  
            display: -webkit-box !important;  
            -webkit-line-clamp: 3 !important;  
            -webkit-box-orient: vertical !important;  
            overflow: hidden !important;  
        }  
  
        body.netflix-single-enabled .full-start-new__buttons {  
            display: flex !important;  
            align-items: center !important;  
            gap: 15px !important;  
            margin-top: 2em !important;  
        }  
  
        body.netflix-single-enabled .button--play {  
            background: #fff !important;  
            color: #000 !important;  
            padding: 12px 24px !important;  
            border-radius: 8px !important;  
            font-weight: 600 !important;  
            font-size: 1.1em !important;  
        }  
  
        body.netflix-single-enabled .full-start__button:not(.button--play) {  
            background: rgba(255,255,255,0.2) !important;  
            border: none !important;  
            color: #fff !important;  
            padding: 12px !important;  
            border-radius: 50% !important;  
            width: 48px !important;  
            height: 48px !important;  
        }  
  
        /* Приховуємо стандартний фон */  
        body.netflix-single-enabled .full-start__background {  
            display: none !important;  
        }  
  
        /* Адаптивність для мобільних пристроїв */  
        @media screen and (max-width: 768px) {  
            body.netflix-single-enabled .full-start-new {  
                padding: 5% 4% !important;  
            }  
              
            body.netflix-single-enabled .full-start__body {  
                max-width: 100% !important;  
            }  
              
            body.netflix-single-enabled .full-start__title img {  
                max-width: 300px !important;  
                max-height: 80px !important;  
            }  
              
            body.netflix-single-enabled .full-start__title:not(:has(img)) {  
                font-size: 2em !important;  
            }  
        }  
  
        /* Планшети */  
        @media screen and (min-width: 769px) and (max-width: 1024px) {  
            body.netflix-single-enabled .full-start__body {  
                max-width: 55% !important;  
            }  
        }  
  
        /* Горизонтальна орієнтація мобільних */  
        @media screen and (max-height: 600px) and (orientation: landscape) {  
            body.netflix-single-enabled .full-start-new {  
                padding: 2% 4% !important;  
            }  
              
            body.netflix-single-enabled .full-start__title img {  
                max-height: 60px !important;  
            }  
              
            body.netflix-single-enabled .full-start__title:not(:has(img)) {  
                font-size: 1.8em !important;  
            }  
              
            body.netflix-single-enabled .full-start__descr {  
                -webkit-line-clamp: 2 !important;  
            }  
        }  
  
        /* Анімація фону */  
        @keyframes netflixKenBurns {  
            0% { transform: scale(1); }  
            100% { transform: scale(1.1); }  
        }  
  
        body.netflix-single-enabled.netflix--zoom-enabled .full-start-new::before {  
            animation: netflixKenBurns 30s ease-out forwards !important;  
        }  
        </style>`;    
        $('body').append(styles);  
    }  
  
    function loadLogo(event) {    
        if (!Lampa.Storage.get('netflix_single_enabled')) {  
            console.log('Netflix Single: Layout disabled in settings');  
            return;  
        }  
  
        console.log('Netflix Single: loadLogo called', event);  
          
        const data = event.data.movie;  
        const render = event.object.activity.render();  
          
        if (!data) {  
            console.log('Netflix Single: No movie data found');  
            return;  
        }  
  
        console.log('Netflix Single: Movie data:', data.title || data.name, data.id);  
  
        // Додаємо клас для активації стилів  
        $('body').addClass('netflix-single-enabled');  
  
        // Заповнюємо метадані  
        const year = (data.release_date || data.first_air_date || '').split('-')[0];  
        const genres = data.genres?.slice(0, 2).map(g => g.name).join(' · ');  
        const runtime = data.runtime ? `${Math.floor(data.runtime / 60)}г ${data.runtime % 60}хв` : '';  
          
        render.find('.full-start__info').text(`${year}  ·  ${genres}  ·  ${runtime}`);  
        render.find('.full-start__descr').text(data.overview || '');  
  
        // Обробка логотипу  
        const titleElement = render.find('.full-start__title');  
        if (!titleElement.length) {  
            console.log('Netflix Single: No title element found');  
            return;  
        }  
  
        const apiUrl = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
        console.log('Netflix Single: Requesting logos from:', apiUrl);  
          
        $.get(apiUrl, (d) => {  
            console.log('Netflix Single: TMDB response:', d);  
              
            if (!d.logos || !d.logos.length) {  
                console.log('Netflix Single: No logos found');  
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
              
            console.log('Netflix Single: Selected logo:', selectedLogo);  
              
            if (selectedLogo) {  
                const logoUrl = Lampa.TMDB.image('/t/p/w500' + selectedLogo.file_path);  
                console.log('Netflix Single: Logo URL:', logoUrl);  
                  
                titleElement.html(`<img src="${logoUrl}" alt="${data.title || data.name}">`);  
                console.log('Netflix Single: Logo inserted successfully');  
            }  
        }).fail((xhr, status, error) => {  
            console.log('Netflix Single: TMDB request failed:', status, error);  
        });  
    }  
  
    function getNextLogo(movieId, logos) {  
        const historyKey = `netflix_single_logo_history_${movieId}`;  
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
        console.log('Netflix Single: Attaching logo loader');  
        Lampa.Listener.follow('full', (e) => {   
            console.log('Netflix Single: Full event:', e.type);  
            if (e.type === 'complite') {  
                setTimeout(() => loadLogo(e), 10);  
            }  
        });    
    }    
  
    if (window.appready) {  
        console.log('Netflix Single: App ready, initializing');  
        initializePlugin();    
    } else {  
        console.log('Netflix Single: Waiting for app ready');  
        Lampa.Listener.follow('app', (e) => {   
            if (e.type === 'ready') {  
                console.log('Netflix Single: App ready event received');  
                initializePlugin();  
            }  
        });    
    }  
})();
