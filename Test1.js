(function () {
    // 1. Стилі: Тільки ліва панель та затемнення фону
    Lampa.Utils.putStyle('apple_tv_custom', `
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
            background: linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%) !important;
            z-index: 10;
        }
        /* Прибираємо стандартні елементи Lampa, щоб не заважали */
        .full-start__poster, .full-start__details { display: none !important; }

        .apple-logo-container img {
            max-width: 450px;
            height: auto;
            margin-bottom: 20px;
        }
        .apple-title-fallback {
            font-size: 3.5rem;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .apple-buttons-row {
            display: flex;
            gap: 10px;
        }
    `);

    // 2. Основна логіка рендерингу
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            var movie = e.data.movie;
            var container = e.object.render();
            var type = movie.number_of_seasons ? 'tv' : 'movie';

            // Запит логотипа (UA -> EN)
            Lampa.Api.sources.tmdb.get(type + '/' + movie.id + '/images', {}, function (data) {
                var logo = data.logos.find(l => l.iso_639_1 === 'uk') || 
                           data.logos.find(l => l.iso_639_1 === 'en') || 
                           data.logos[0];
                
                var logoUrl = logo ? 'https://image.tmdb.org/t/p/w500' + logo.file_path : null;

                // Створюємо нову структуру лівої панелі
                var appleLayout = $(`
                    <div class="full-start-new">
                        <div class="apple-logo-container">
                            ${logoUrl ? `<img src="${logoUrl}">` : `<div class="apple-title-fallback">${movie.title || movie.name}</div>`}
                        </div>
                        <div class="apple-buttons-row"></div>
                    </div>
                `);

                // Переносимо оригінальні кнопки Lampa у наш новий ряд
                appleLayout.find('.apple-buttons-row').append(container.find('.full-start__buttons'));

                // Вставляємо наш шар поверх стандартного
                container.find('.full-start').append(appleLayout);
            });
        }
    });
})();
