(function () {
    'use strict';

    // 1. СТИЛІ: Тільки ліва орієнтація та градієнт
    Lampa.Utils.putStyle('apple_tv_v3', `
        .full-start-new {
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
        .full-start__poster, .full-start__details { display: none !important; }

        .apple-tv-logo img {
            max-width: 450px;
            max-height: 200px;
            margin-bottom: 25px;
            filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
        }
        .apple-tv-title { font-size: 3.5rem; font-weight: bold; margin-bottom: 25px; }
        .apple-tv-buttons { display: flex; gap: 15px; }
    `);

    // 2. ЛОГІКА: Перехоплення та побудова
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            var movie = e.data.movie;
            var container = e.object.render();
            var type = movie.number_of_seasons ? 'tv' : 'movie';

            // Отримуємо логотип (UA -> EN)
            Lampa.Api.sources.tmdb.get(type + '/' + movie.id + '/images', {}, function (data) {
                var logo = data.logos.find(l => l.iso_639_1 === 'uk') || 
                           data.logos.find(l => l.iso_639_1 === 'en') || 
                           data.logos[0];
                
                var logoUrl = logo ? 'https://image.tmdb.org/t/p/w500' + logo.file_path : null;

                // Створюємо новий інтерфейс поверх старого
                var appleLayout = $(`
                    <div class="full-start-new">
                        <div class="apple-tv-logo">
                            ${logoUrl ? `<img src="${logoUrl}">` : `<div class="apple-tv-title">${movie.title || movie.name}</div>`}
                        </div>
                        <div class="apple-tv-buttons"></div>
                    </div>
                `);

                // Переміщуємо кнопки
                appleLayout.find('.apple-tv-buttons').append(container.find('.full-start__buttons'));
                
                // Вставляємо наш шар
                container.find('.full-start').append(appleLayout);
            });
        }
    });
})();
