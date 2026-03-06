(function () {
    // 1. СТИЛІ: Фіксуємо ліву панель та градієнт
    Lampa.Utils.putStyle('apple_tv_interface', `
        .full-start-new {
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-end !important;
            align-items: flex-start !important;
            padding: 0 0 5% 5% !important;
            height: 100% !important;
            width: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 10 !important;
            background: linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%) !important;
        }
        .full-start__poster, .full-start__details { display: none !important; } /* Прибираємо стандарт */
        
        .apple-tv-content { width: 50%; z-index: 20; }
        .apple-tv-logo img { max-width: 450px; height: auto; margin-bottom: 20px; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5)); }
        .apple-tv-title { font-size: 3.5rem; font-weight: bold; margin-bottom: 20px; }
        .apple-tv-buttons { display: flex; gap: 10px; }
    `);

    // 2. ЛОГІКА: Пошук логотипа (UA -> EN) та підміна екрана
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            var movie = e.data.movie;
            var container = e.object.render();
            var type = movie.number_of_seasons ? 'tv' : 'movie';
            
            // Запит до TMDB за картинками
            Lampa.Api.sources.tmdb.get(type + '/' + movie.id + '/images', {}, function(data) {
                // Пріоритет: UA -> EN -> Будь-який
                var logo = data.logos.find(l => l.iso_639_1 === 'uk') || 
                           data.logos.find(l => l.iso_639_1 === 'en') || 
                           data.logos[0];
                
                var logoUrl = logo ? 'https://image.tmdb.org/t/p/w500' + logo.file_path : null;

                // Створюємо нову розмітку
                var html = $(`
                    <div class="full-start-new">
                        <div class="apple-tv-content">
                            <div class="apple-tv-logo">
                                ${logoUrl ? `<img src="${logoUrl}">` : `<div class="apple-tv-title">${movie.title || movie.name}</div>`}
                            </div>
                            <div class="apple-tv-buttons"></div>
                        </div>
                    </div>
                `);

                // Переміщуємо кнопки зі стандартного інтерфейсу
                html.find('.apple-tv-buttons').append(container.find('.full-start__buttons'));
                
                // Очищуємо та вставляємо новий інтерфейс
                container.find('.full-start').after(html);
            });
        }
    });
})();
