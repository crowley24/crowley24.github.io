(function () {
    'use strict';

    var logoCache = {};

    function applyStyles() {
        var styleId = 'lampa-apple-tv-v3-final';
        if (document.getElementById(styleId)) return;

        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* 1. ПРИБИРАЄМО ВСІ ФОНИ ТА ОБМЕЖЕННЯ */
            .full-start-new, .full-start-new__right, .full-start-new__details {
                background: none !important;
                background-color: transparent !important;
                box-shadow: none !important;
                width: 100% !important;
                display: block !important;
            }

            /* 2. ПРАВИЛЬНИЙ КОНТЕЙНЕР ДЛЯ APPLE TV STYLE */
            .full-start-new__right {
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-end !important;
                height: 100vh !important;
                padding: 0 5% 80px 5% !important;
                /* Глобальний градієнт для читабельності */
                background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 40%, transparent 100%) !important;
                box-sizing: border-box !important;
            }

            /* 3. ЛОГОТИП ТА МЕТА (Повертаємо стиль) */
            .apple-logo-container img {
                max-width: 450px;
                max-height: 150px;
                object-fit: contain;
                object-position: left bottom;
                margin-bottom: 10px;
                filter: drop-shadow(0 0 15px rgba(0,0,0,0.8));
            }

            .apple-meta-row {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
                font-size: 1.3rem;
                color: #fff;
                text-shadow: 0 2px 4px rgba(0,0,0,0.8);
            }

            .apple-rating-pill {
                background: #ffad08;
                color: #000;
                padding: 2px 10px;
                border-radius: 6px;
                font-weight: 900;
            }

            /* 4. ОПИС (Чистий текст без рамок) */
            .full-start-new__description {
                background: none !important;
                padding: 0 !important;
                margin: 0 0 25px 0 !important;
                font-size: 1.2rem !important;
                line-height: 1.5 !important;
                color: rgba(255,255,255,0.8) !important;
                max-width: 800px !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 3 !important;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
            }

            /* 5. КНОПКИ ЯК В APPLE TV */
            .full-start-new__buttons {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 15px !important;
                background: none !important;
            }

            .full-start-new__buttons .full-start__button {
                background: rgba(255,255,255,0.15) !important;
                border: none !important;
                border-radius: 12px !important;
                backdrop-filter: blur(10px);
                height: auto !important;
                padding: 12px 25px !important;
            }

            .full-start-new__buttons .full-start__button.focus {
                background: #fff !important;
                color: #000 !important;
                transform: scale(1.1);
            }

            /* Ховаємо сміття */
            .full-start-new__left, .full-start-new__title, .full-start-new__tagline, .full-start-new__status {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    function injectAppleElements($right, movie) {
        $right.find('.apple-logo-container, .apple-meta-row').remove();

        var year = (movie.release_date || movie.first_air_date || '').split('-')[0];
        var genres = (movie.genres || []).slice(0, 2).map(g => g.name).join(' · ');
        var rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';

        var $appleHeader = $(`
            <div class="apple-logo-container"></div>
            <div class="apple-meta-row">
                ${rating ? `<span class="apple-rating-pill">${rating} TMDB</span>` : ''}
                <span>${year}</span>
                <span>${genres}</span>
            </div>
        `);

        $right.prepend($appleHeader);

        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        if (logoCache[movieId]) {
            $right.find('.apple-logo-container').html(`<img src="${logoCache[movieId]}">`);
        } else {
            $.ajax({
                url: Lampa.TMDB.api((movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key()),
                success: function (res) {
                    var lang = Lampa.Storage.get('language') || 'uk';
                    // Використовуємо англійське лого, якщо українського немає [cite: 2026-02-17]
                    var best = res.logos.find(l => l.iso_639_1 === lang) || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                    if (best) {
                        var url = Lampa.TMDB.image('/t/p/w500' + best.file_path);
                        logoCache[movieId] = url;
                        $right.find('.apple-logo-container').html(`<img src="${url}">`);
                    }
                }
            });
        }
    }

    function init() {
        applyStyles();
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
                var $right = e.object.activity.render().find('.full-start-new__right');
                setTimeout(function() {
                    injectAppleElements($right, e.data.movie);
                }, 50);
            }
        });
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });

})();
