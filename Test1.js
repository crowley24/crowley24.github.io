(function () {    
    'use strict';    
  
    function initializePlugin() {    
        attachLogoLoader();    
    }    
  
    function loadLogo(event) {    
        const data = event.data.movie, render = event.object.activity.render();    
        if (!data) return;  
  
        // Знаходимо контейнер з назвою фільму  
        const titleElement = render.find('.full-start__title');  
        if (!titleElement.length) return;  
  
        // Запитуємо логотипи з TMDB API  
        $.get(Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`), (d) => {  
            // Пріоритет: український -> англійський -> перший доступний  
            const best = d.logos.find(l => l.iso_639_1 === 'uk') || d.logos.find(l => l.iso_639_1 === 'en') || d.logos[0];  
              
            if (best) {  
                // Замінюємо текст назви на логотип  
                titleElement.html(`<img src="${Lampa.TMDB.image('/t/p/w500' + best.file_path)}" style="max-height: 80px; object-fit: contain;">`);  
            }  
        });  
    }    
  
    function attachLogoLoader() {    
        Lampa.Listener.follow('full', (e) => { if (e.type === 'complite') setTimeout(() => loadLogo(e), 10); });    
    }    
  
    if (window.appready) initializePlugin();    
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initializePlugin(); });    
})();
