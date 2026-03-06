(function() {  
    'use strict';  
      
    function init() {  
        // Перехоплюємо створення карток  
        Lampa.Listener.follow('card', function(e) {  
            if(e.type === 'create') {  
                loadLogoForCard(e.data.card, e.data.html);  
            }  
        });  
    }  
      
    function loadLogoForCard(cardData, cardHtml) {  
        if(cardData.id && !cardData.logo_loaded) {  
            Lampa.TMDB.api((cardData.name ? 'tv' : 'movie') + '/' + cardData.id + '/images?api_key=' + Lampa.TMDB.key(), function(images) {  
                if(images.logos && images.logos.length) {  
                    let logo = images.logos[0];  
                    let logoUrl = Lampa.TMDB.image('/t/p/w300' + logo.file_path);  
                    let titleElement = cardHtml.find('.card__title');  
                      
                    if(titleElement.length) {  
                        titleElement.html('<img src="' + logoUrl + '" class="card__logo">');  
                        cardData.logo_loaded = true;  
                    }  
                }  
            });  
        }  
    }  
      
    if(window.appready) init();  
    else Lampa.Listener.follow('app', function(e) { if(e.type === 'ready') init(); });  
})();
