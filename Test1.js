(function () {
    // 1. Створюємо новий шаблон, де все згруповано ліворуч
    Lampa.Template.add('apple_tv_full_custom', `
        <div class="full-start-new apple-style">
            <div class="full-start-new__background"></div>
            <div class="full-start-new__details">
                <div class="apple-left-panel">
                    <div class="apple-logo-block"></div>
                    <div class="apple-metadata">
                        <span class="apple-rating">{rating}</span>
                        <span class="apple-year">{year}</span>
                    </div>
                    <div class="apple-buttons-placeholder"></div>
                </div>
            </div>
        </div>
    `);

    // 2. Додаємо стилі для лівої орієнтації
    Lampa.Utils.putStyle('apple_tv_css', `
        .apple-style { display: flex; align-items: flex-end; padding: 5%; }
        .apple-left-panel { width: 50%; z-index: 10; }
        .apple-logo-block img { max-width: 450px; height: auto; margin-bottom: 20px; }
        .apple-metadata { margin-bottom: 25px; font-size: 1.4rem; display: flex; gap: 15px; }
        .apple-rating { background: #fff; color: #000; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
    `);

    // 3. Використовуємо метод перехоплення компонента (як у робочому плагіні)
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            var movie = e.data.movie;
            var container = e.object.render();
            
            // Отримуємо логотип за вашим правилом (UA -> EN)
            var type = movie.number_of_seasons ? 'tv' : 'movie';
            Lampa.Api.sources.tmdb.get(type + '/' + movie.id + '/images', {}, function(data) {
                var logo = data.logos.find(l => l.iso_639_1 === 'uk') || 
                           data.logos.find(l => l.iso_639_1 === 'en') || 
                           data.logos[0];
                
                var logoUrl = logo ? 'https://image.tmdb.org/t/p/w500' + logo.file_path : '';

                // Пряма заміна HTML вмісту (той самий метод)
                var newContent = Lampa.Template.get('apple_tv_full_custom', {
                    rating: movie.vote_average ? movie.vote_average.toFixed(1) : '0.0',
                    year: new Date(movie.release_date || movie.first_air_date).getFullYear()
                });

                if (logoUrl) {
                    newContent.find('.apple-logo-block').html('<img src="' + logoUrl + '">');
                } else {
                    newContent.find('.apple-logo-block').html('<h1>' + (movie.title || movie.name) + '</h1>');
                }

                // Переносимо кнопки
                newContent.find('.apple-buttons-placeholder').append(e.object.buttons.render());
                
                // Фінальна заміна всього блоку
                container.find('.full-start').html(newContent);
            });
        }
    });
})();
