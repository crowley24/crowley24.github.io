(function () {
    // 1. Стилі для лівої панелі та градієнта
    Lampa.Utils.putStyle('apple_tv_left_only', `
        .apple-full {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 100;
            background-color: #1a1a1a;
        }
        .apple-full__bg {
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
            height: 100%;
            background-size: cover;
            background-position: center center;
        }
        .apple-full__shadow {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, rgba(0,0,0,0.9) 20%, rgba(0,0,0,0.4) 50%, transparent 100%);
        }
        .apple-full__content {
            position: absolute;
            left: 5%;
            bottom: 10%;
            width: 45%;
            z-index: 10;
        }
        .apple-full__logo img {
            max-width: 450px;
            max-height: 200px;
            margin-bottom: 20px;
            filter: drop-shadow(0 0 15px rgba(0,0,0,0.5));
        }
        .apple-full__title {
            font-size: 3.5rem;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .apple-full__meta {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 25px;
            font-size: 1.2rem;
            color: #ccc;
        }
        .apple-full__rate {
            background: #fff;
            color: #000;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: bold;
        }
    `);

    // 2. Логіка пошуку логотипа (UA -> EN)
    function fetchLogo(movie, callback) {
        let type = movie.number_of_seasons ? 'tv' : 'movie';
        Lampa.Api.sources.tmdb.get(type + '/' + movie.id + '/images', {}, (data) => {
            let logo = data.logos.find(l => l.iso_639_1 === 'uk') || 
                       data.logos.find(l => l.iso_639_1 === 'en') || 
                       data.logos[0];
            callback(logo ? 'https://image.tmdb.org/t/p/w500' + logo.file_path : null);
        });
    }

    // 3. Підміна інтерфейсу
    Lampa.Listener.follow('full', (e) => {
        if (e.type === 'complite') {
            let movie = e.data.movie;
            let container = e.object.render();
            
            fetchLogo(movie, (logoUrl) => {
                let rating = movie.vote_average ? movie.vote_average.toFixed(1) : '0.0';
                let year = new Date(movie.release_date || movie.first_air_date).getFullYear() || '';

                let html = $(`
                    <div class="apple-full">
                        <div class="apple-full__bg" style="background-image: url(${movie.background_image || movie.backdrop_path})"></div>
                        <div class="apple-full__shadow"></div>
                        <div class="apple-full__content">
                            <div class="apple-full__logo">
                                ${logoUrl ? `<img src="${logoUrl}">` : `<div class="apple-full__title">${movie.title || movie.name}</div>`}
                            </div>
                            <div class="apple-full__meta">
                                <span class="apple-full__rate">${rating} TMDB</span>
                                <span>${year}</span>
                                <span>${movie.runtime ? movie.runtime + ' хв' : ''}</span>
                            </div>
                            <div class="apple-full__buttons"></div>
                        </div>
                    </div>
                `);

                // Переміщуємо стандартні кнопки Lampa в наш новий блок
                html.find('.apple-full__buttons').append(container.find('.full-start__buttons'));
                
                // Очищуємо стару картку і вставляємо нашу
                container.find('.full-start').empty().append(html);
            });
        }
    });
})();
