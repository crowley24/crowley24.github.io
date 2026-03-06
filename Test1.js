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
  
    function addCustomTemplate() {    
        const template = `  
        <div class="full-start-new netflix-style">    
            <div class="netflix__container">  
                <div class="netflix__left-panel">  
                    <div class="netflix__logo-container">  
                        <div class="netflix__logo"></div>  
                        <div class="netflix__title" style="display: none;">{title}</div>  
                    </div>  
                      
                    <div class="netflix__metadata">  
                        <div class="netflix__year-genre"></div>  
                        <div class="netflix__rating"></div>  
                        <div class="netflix__description"></div>  
                    </div>  
  
                    <div class="netflix__buttons">  
                        <div class="full-start__button selector button--play">  
                            ${ICONS.play} <span>Дивитися</span>  
                        </div>  
                        <div class="full-start__button selector view--trailer">${ICONS.trailer}</div>  
                        <div class="full-start__button selector button--book">${ICONS.book}</div>  
                        <div class="full-start__button selector button--reaction">${ICONS.reaction}</div>  
                        <div class="full-start__button selector button--options">${ICONS.options}</div>  
                    </div>  
                </div>  
                  
                <div class="netflix__right-panel">  
                    <div class="full-start__background"></div>  
                </div>  
            </div>  
        </div>`;    
        Lampa.Template.add('full_start_new', template);    
    }  
  
    function addStyles() {    
        const styles = `  
        <style>  
        .netflix-style {  
            position: relative;  
            height: 100vh;  
            overflow: hidden;  
        }  
  
        .netflix__container {  
            display: flex;  
            height: 100vh;  
            position: relative;  
        }  
  
        .netflix__left-panel {  
            width: 45%;  
            padding-left: 5%;  
            display: flex;  
            flex-direction: column;  
            justify-content: center;  
            z-index: 10;  
            background: linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, transparent 100%);  
        }  
  
        .netflix__right-panel {  
            width: 55%;  
            position: relative;  
        }  
  
        .netflix__logo-container {  
            margin-bottom: 2em;  
        }  
  
        .netflix__logo img {  
            max-width: 400px;  
            max-height: 120px;  
            object-fit: contain;  
            object-position: left;  
        }  
  
        .netflix__title {  
            font-size: 3em;  
            font-weight: 700;  
            color: #fff;  
            margin-bottom: 0.5em;  
            line-height: 1.1;  
        }  
  
        .netflix__metadata {  
            margin-bottom: 2em;  
            max-width: 600px;  
        }  
  
        .netflix__year-genre {  
            font-size: 1.2em;  
            color: rgba(255,255,255,0.8);  
            margin-bottom: 0.5em;  
            font-weight: 500;  
        }  
  
        .netflix__rating {  
            font-size: 1.1em;  
            color: #46d369;  
            margin-bottom: 1em;  
            font-weight: 600;  
        }  
  
        .netflix__description {  
            font-size: 1.1em;  
            line-height: 1.6;  
            color: rgba(255,255,255,0.9);  
            display: -webkit-box;  
            -webkit-line-clamp: 3;  
            -webkit-box-orient: vertical;  
            overflow: hidden;  
        }  
  
        .netflix__buttons {  
            display: flex;  
            align-items: center;  
            gap: 15px;  
            flex-wrap: wrap;  
        }  
  
        .button--play {  
            background: #fff !important;  
            color: #000 !important;  
            padding: 12px 24px !important;  
            border-radius: 8px !important;  
            font-weight: 600 !important;  
            font-size: 1.1em !important;  
            transition: all 0.2s !important;  
        }  
  
        .button--play:hover {  
            background: rgba(255,255,255,0.8) !important;  
        }  
  
        .netflix-style .full-start__button:not(.button--play) {  
            background: rgba(255,255,255,0.2) !important;  
            border: none !important;  
            color: #fff !important;  
            padding: 12px !important;  
            border-radius: 50% !important;  
            width: 48px !important;  
            height: 48px !important;  
            display: flex !important;  
            justify-content: center !important;  
            align-items: center !important;  
            transition: all 0.2s !important;  
        }  
  
        .netflix-style .full-start__button:not(.button--play):hover {  
            background: rgba(255,255,255,0.3) !important;  
            transform: scale(1.1) !important;  
        }  
  
        .netflix-style .full-start__button.focus {  
            transform: scale(1.1) !important;  
        }  
  
        .netflix-style .button--play.focus {  
            background: rgba(255,255,255,0.8) !important;  
        }  
  
        /* Адаптивність для мобільних пристроїв */  
        @media screen and (max-width: 768px) {  
            .netflix__left-panel {  
                width: 100%;  
                padding: 5% 4%;  
                background: linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, transparent 100%);  
            }  
              
            .netflix__right-panel {  
                display: none;  
            }  
              
            .netflix__logo img {  
                max-width: 300px;  
                max-height: 80px;  
            }  
              
            .netflix__title {  
                font-size: 2em;  
            }  
              
            .netflix__buttons {  
                gap: 10px;  
            }  
              
            .button--play {  
                padding: 10px 20px !important;  
                font-size: 1em !important;  
            }  
        }  
  
        /* Адаптивність для планшетів */  
        @media screen and (min-width: 769px) and (max-width: 1024px) {  
            .netflix__left-panel {  
                width: 55%;  
                padding-left: 4%;  
            }  
              
            .netflix__logo img {  
                max-width: 350px;  
                max-height: 100px;  
            }  
        }  
  
        /* Адаптивність для горизонтальної орієнтації мобільних */  
        @media screen and (max-height: 600px) and (orientation: landscape) {  
            .netflix__left-panel {  
                padding: 2% 4%;  
            }  
              
            .netflix__logo img {  
                max-height: 60px;  
            }  
              
            .netflix__title {  
                font-size: 1.8em;  
            }  
              
            .netflix__description {  
                -webkit-line-clamp: 2;  
            }  
        }  
  
        /* Анімація фону */  
        @keyframes netflixKenBurns {  
            0% { transform: scale(1); }  
            100% { transform: scale(1.1); }  
        }  
  
        body.netflix--zoom-enabled .netflix__right-panel .full-start__background.loaded {  
            animation: netflixKenBurns 30s ease-out forwards;  
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
        const rating = data.vote_average ? data.vote_average.toFixed(1) + '/10' : '';  
          
        render.find('.netflix__year-genre').text(`${year}  ·  ${genres}  ·  ${runtime}`);  
        render.find('.netflix__rating').text(rating);  
        render.find('.netflix__description').text(data.overview || '');  
  
        // Обробка логотипу  
        const logoContainer = render.find('.netflix__logo');  
        const titleContainer = render.find('.netflix__title');  
  
        const apiUrl = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
        console.log('Netflix Layout: Requesting logos from:', apiUrl);  
          
        $.get(apiUrl, (d) => {  
            console.log('Netflix Layout: TMDB response:', d);  
              
            if (!d.logos || !d.logos.length) {  
                console.log('Netflix Layout: No logos found, showing text title');  
                titleContainer.show();  
                logoContainer.hide();  
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
                  
                logoContainer.html(`<img src="${logoUrl}">`);  
                logoContainer.show();  
                titleContainer.hide();  
                console.log('Netflix Layout: Logo inserted successfully');  
            } else {  
                console.log('Netflix Layout: No suitable logo found, showing text title');  
                titleContainer.show();  
                logoContainer.hide();  
            }  
        }).fail((xhr, status, error) => {  
            console.log('Netflix Layout: TMDB request failed:', status, error);  
            titleContainer.show();  
            logoContainer.hide();  
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
  
        console.log('Netflix Layout: Filtered logos count:', prioritizedLogos.length);  
  
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
