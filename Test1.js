(function () {
    // --- 1. Стилі інтерфейсу (Apple TV Style) ---
    Lampa.Utils.putStyle('apple_tv_interface', `
        .custom-full {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10;
            background-size: cover;
            background-position: center;
        }
        .custom-full__overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%),
                        linear-gradient(to right, rgba(0,0,0,0.8) 0%, transparent 60%);
        }
        .custom-full__content {
            position: absolute;
            bottom: 10%;
            left: 5%;
            width: 40%;
            z-index: 2;
        }
        .custom-full__logo {
            max-width: 100%;
            margin-bottom: 20px;
        }
        .custom-full__logo img {
            max-width: 400px;
            height: auto;
        }
        .custom-full__title {
            font-size: 3.5rem;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .custom-full__descr {
            font-size: 1.2rem;
            line-height: 1.5;
            margin-bottom: 20px;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    `);

    // --- 2. Функція пошуку логотипа (UA -> EN -> Any) ---
    function getLogo(movie, callback) {
        let type = movie.number_of_seasons ? 'tv' : 'movie';
        Lampa.Api.sources.tmdb.get(type + '/' + movie.id + '/images', {}, (data) => {
            let logo = data.logos.find(l => l.iso_639_1 === 'uk') || 
                       data.logos.find(l => l.iso_639_1 === 'en') || 
                       data.logos[0];
            callback(logo ? 'https://image.tmdb.org/t/p/w500' + logo.file_path : null);
        });
    }

    // --- 3. Основна логіка підміни ---
    Lampa.Listener.follow('full', (e) => {
        if (e.type === 'complite') {
            let movie = e.data.movie;
            let container = e.object.render();
            
            getLogo(movie, (logoUrl) => {
                let html = `
                    <div class="custom-full" style="background-image: url(${movie.background_image || movie.backdrop_path})">
                        <div class="custom-full__overlay"></div>
                        <div class="custom-full__content">
                            <div class="custom-full__logo">
                                ${logoUrl ? `<img src="${logoUrl}" alt="logo">` : `<div class="custom-full__title">${movie.title || movie.name}</div>`}
                            </div>
                            <div class="custom-full__descr">${movie.overview}</div>
                            <div class="custom-full__buttons"></div>
                        </div>
                    </div>
                `;
                
                let newView = $(html);
                // Переносимо оригінальні кнопки Lampa в наш контейнер
                newView.find('.custom-full__buttons').append(container.find('.full-start__buttons'));
                container.empty().append(newView);
            });
        }
    });
})();
