(function () {    
    'use strict';    
  
    const PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="80" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><circle cx="50" cy="50" r="10" fill="white"/></svg>';  
  
    function initializePlugin() {    
        console.log('Logo Replacer: Plugin initialized');  
        addSettings();  
        attachLogoLoader();    
    }    
  
    function addSettings() {  
        if (Lampa.Storage.get('logo_replacer_enabled') === undefined) {  
            Lampa.Storage.set('logo_replacer_enabled', true);  
        }  
  
        Lampa.SettingsApi.addComponent({   
            component: 'logo_replacer_settings',   
            name: 'Logo Replacer',   
            icon: PLUGIN_ICON   
        });    
  
        Lampa.SettingsApi.addParam({  
            component: 'logo_replacer_settings',  
            param: {   
                name: 'logo_replacer_enabled',   
                type: 'trigger',   
                default: true   
            },  
            field: {   
                name: 'Замінювати назви на логотипи'   
            },  
            onChange: (value) => {  
                console.log('Logo Replacer: Setting changed to:', value);  
                if (Lampa.Activity.last()) {  
                    Lampa.Activity.last().reload();  
                }  
            }  
        });  
  
        // Нова опція для ротації логотипів  
        Lampa.SettingsApi.addParam({  
            component: 'logo_replacer_settings',  
            param: {   
                name: 'logo_replacer_rotate',   
                type: 'trigger',   
                default: true   
            },  
            field: {   
                name: 'Змінювати логотип при кожному відкритті'   
            },  
            onChange: (value) => {  
                console.log('Logo Replacer: Rotation setting changed to:', value);  
                if (Lampa.Activity.last()) {  
                    Lampa.Activity.last().reload();  
                }  
            }  
        });  
    }  
  
    function loadLogo(event) {    
        if (!Lampa.Storage.get('logo_replacer_enabled')) {  
            console.log('Logo Replacer: Logos disabled in settings');  
            return;  
        }  
  
        console.log('Logo Replacer: loadLogo called', event);  
          
        const data = event.data.movie;  
        const render = event.object.activity.render();  
          
        if (!data) {  
            console.log('Logo Replacer: No movie data found');  
            return;  
        }  
  
        console.log('Logo Replacer: Movie data:', data.title || data.name, data.id);  
  
        let titleElement = render.find('.full-start__title');  
        if (!titleElement.length) {  
            titleElement = render.find('.full-start-new__title');  
        }  
        if (!titleElement.length) {  
            titleElement = render.find('h1, .title, .movie-title');  
        }  
  
        if (!titleElement.length) {  
            console.log('Logo Replacer: No title element found');  
            return;  
        }  
  
        const apiUrl = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
        console.log('Logo Replacer: Requesting logos from:', apiUrl);  
          
        $.get(apiUrl, (d) => {  
            console.log('Logo Replacer: TMDB response:', d);  
              
            if (!d.logos || !d.logos.length) {  
                console.log('Logo Replacer: No logos found in TMDB response');  
                return;  
            }  
  
            let selectedLogo;  
            const rotateEnabled = Lampa.Storage.get('logo_replacer_rotate');  
              
            if (rotateEnabled) {  
                // Логіка ротації логотипів  
                selectedLogo = getNextLogo(data.id, d.logos);  
            } else {  
                // Оригінальна логіка пріоритету  
                selectedLogo = d.logos.find(l => l.iso_639_1 === 'uk') ||   
                              d.logos.find(l => l.iso_639_1 === 'en') ||   
                              d.logos[0];  
            }  
              
            console.log('Logo Replacer: Selected logo:', selectedLogo);  
              
            if (selectedLogo) {  
                const logoUrl = Lampa.TMDB.image('/t/p/w500' + selectedLogo.file_path);  
                console.log('Logo Replacer: Logo URL:', logoUrl);  
                  
                titleElement.html(`<img src="${logoUrl}" style="max-height: 80px; object-fit: contain; max-width: 100%;">`);  
                console.log('Logo Replacer: Logo inserted successfully');  
            } else {  
                console.log('Logo Replacer: No suitable logo found');  
            }  
        }).fail((xhr, status, error) => {  
            console.log('Logo Replacer: TMDB request failed:', status, error);  
        });  
    }  
  
    function getNextLogo(movieId, logos) {  
        // Отримуємо історію показаних логотипів для цього фільму  
        const historyKey = `logo_history_${movieId}`;  
        let logoHistory = Lampa.Storage.get(historyKey) || [];  
          
        // Фільтруємо логотипи за пріоритетом мов (український, англійський, інші)  
        const prioritizedLogos = [  
            ...logos.filter(l => l.iso_639_1 === 'uk'),  
            ...logos.filter(l => l.iso_639_1 === 'en'),  
            ...logos.filter(l => l.iso_639_1 !== 'uk' && l.iso_639_1 !== 'en')  
        ];  
  
        // Знаходимо наступний логотип, який ще не був показаний  
        let nextLogo = null;  
        for (const logo of prioritizedLogos) {  
            if (!logoHistory.includes(logo.file_path)) {  
                nextLogo = logo;  
                break;  
            }  
        }  
  
        // Якщо всі логотипи вже показані, починаємо знову  
        if (!nextLogo && prioritizedLogos.length > 0) {  
            logoHistory = []; // Скидаємо історію  
            nextLogo = prioritizedLogos[0];  
        }  
  
        // Зберігаємо вибраний логотип в історію  
        if (nextLogo) {  
            logoHistory.push(nextLogo.file_path);  
            Lampa.Storage.set(historyKey, logoHistory);  
        }  
  
        return nextLogo;  
    }  
  
    function attachLogoLoader() {    
        console.log('Logo Replacer: Attaching logo loader');  
        Lampa.Listener.follow('full', (e) => {   
            console.log('Logo Replacer: Full event:', e.type);  
            if (e.type === 'complite') {  
                setTimeout(() => loadLogo(e), 10);  
            }  
        });    
    }    
  
    if (window.appready) {  
        console.log('Logo Replacer: App ready, initializing');  
        initializePlugin();    
    } else {  
        console.log('Logo Replacer: Waiting for app ready');  
        Lampa.Listener.follow('app', (e) => {   
            if (e.type === 'ready') {  
                console.log('Logo Replacer: App ready event received');  
                initializePlugin();  
            }  
        });    
    }  
})();
