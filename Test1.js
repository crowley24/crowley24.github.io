(function () {  
    'use strict';  
  
    // 1. СТИЛІ: Правильне додавання стилів  
    const styles = `  
        <style id="apple-tv-v3-styles">  
        .apple-tv-v3-overlay {  
            display: flex !important;  
            flex-direction: column !important;  
            justify-content: flex-end !important;  
            align-items: flex-start !important;  
            padding: 0 0 5% 5% !important;  
            height: 100% !important;  
            width: 100% !important;  
            position: absolute !important;  
            top: 0;  
            left: 0;  
            z-index: 10 !important;  
            background: linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%) !important;  
        }  
        .apple-tv-logo img {  
            max-width: 450px;  
            max-height: 200px;  
            margin-bottom: 25px;  
            filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));  
        }  
        .apple-tv-title { font-size: 3.5rem; font-weight: bold; margin-bottom: 25px; }  
        .apple-tv-buttons { display: flex; gap: 15px; }  
        </style>  
    `;  
      
    $('body').append(styles);  
  
    // 2. ЛОГІКА: Правильний API та перевірки  
    Lampa.Listener.follow('full', function (e) {  
        if (e.type === 'complite') {  
            var movie = e.data.movie;  
            var container = e.object.render();  
              
            if (!movie || !container) return;  
              
            var type = movie.number_of_seasons ? 'tv' : 'movie';  
  
            // Правильний API запит  
            $.get(Lampa.TMDB.api(type + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key()), function (data) {  
                if (!data || !data.logos) return;  
                  
                var logo = data.logos.find(l => l.iso_639_1 === 'uk') ||   
                           data.logos.find(l => l.iso_639_1 === 'en') ||   
                           data.logos[0];  
                  
                var logoUrl = logo ? Lampa.TMDB.image('/t/p/w500' + logo.file_path) : null;  
  
                // Створюємо інтерфейс з перевірками  
                var appleLayout = $(`  
                    <div class="apple-tv-v3-overlay">  
                        <div class="apple-tv-logo">  
                            ${logoUrl ? `<img src="${logoUrl}">` : `<div class="apple-tv-title">${movie.title || movie.name}</div>`}  
                        </div>  
                        <div class="apple-tv-buttons"></div>  
                    </div>  
                `);  
  
                // Переміщуємо кнопки з перевіркою  
                var buttons = container.find('.full-start__buttons');  
                if (buttons.length) {  
                    appleLayout.find('.apple-tv-buttons').append(buttons);  
                }  
                  
                // Вставляємо наш шар  
                var fullStart = container.find('.full-start');  
                if (fullStart.length) {  
                    fullStart.append(appleLayout);  
                }  
            }).fail(function() {  
                console.log('Apple TV v3: Failed to load logos');  
            });  
        }  
    });  
})();
