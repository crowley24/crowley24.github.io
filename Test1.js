(function () {    
    'use strict';    
  
    function initializePlugin() {    
        console.log('Logo Replacer: Plugin initialized');  
        attachLogoLoader();    
    }    
  
    function loadLogo(event) {    
        console.log('Logo Replacer: loadLogo called', event);  
          
        const data = event.data.movie;  
        const render = event.object.activity.render();  
          
        if (!data) {  
            console.log('Logo Replacer: No movie data found');  
            return;  
        }  
  
        console.log('Logo Replacer: Movie data:', data.title || data.name, data.id);  
  
        // Спробуємо різні селектори для назви  
        let titleElement = render.find('.full-start__title');  
        if (!titleElement.length) {  
            titleElement = render.find('.full-start-new__title');  
        }  
        if (!titleElement.length) {  
            titleElement = render.find('h1, .title, .movie-title');  
        }  
  
        console.log('Logo Replacer: Title element found:', titleElement.length > 0);  
  
        if (!titleElement.length) {  
            console.log('Logo Replacer: No title element found');  
            return;  
        }  
  
        // Запитуємо логотипи з TMDB API  
        const apiUrl = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);  
        console.log('Logo Replacer: Requesting logos from:', apiUrl);  
          
        $.get(apiUrl, (d) => {  
            console.log('Logo Replacer: TMDB response:', d);  
              
            if (!d.logos || !d.logos.length) {  
                console.log('Logo Replacer: No logos found in TMDB response');  
                return;  
            }  
  
            // Пріоритет: український -> англійський -> перший доступний  
            const best = d.logos.find(l => l.iso_639_1 === 'uk') ||   
                        d.logos.find(l => l.iso_639_1 === 'en') ||   
                        d.logos[0];  
              
            console.log('Logo Replacer: Best logo found:', best);  
              
            if (best) {  
                const logoUrl = Lampa.TMDB.image('/t/p/w500' + best.file_path);  
                console.log('Logo Replacer: Logo URL:', logoUrl);  
                  
                // Замінюємо текст назви на логотип  
                titleElement.html(`<img src="${logoUrl}" style="max-height: 80px; object-fit: contain; max-width: 100%;">`);  
                console.log('Logo Replacer: Logo inserted successfully');  
            } else {  
                console.log('Logo Replacer: No suitable logo found');  
            }  
        }).fail((xhr, status, error) => {  
            console.log('Logo Replacer: TMDB request failed:', status, error);  
        });  
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
