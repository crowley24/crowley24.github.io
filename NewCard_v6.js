(function () {
    'use strict';

    var logoCache = {};

    function applyStyles() {
        var styleId = 'lampa-apple-tv-total-clean';
        if (document.getElementById(styleId)) return;

        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* 1. ПОВНЕ ВИДАЛЕННЯ СТАНДАРТНОЇ ПАНЕЛІ ТА ФОНУ */
            .full-start-new__right, 
            .full-start-new__details,
            .full-start-new__details > div,
            .full-start-new { 
                background: none !important; 
                background-color: transparent !important;
                box-shadow: none !important;
                border: none !important;
            }

            /* 2. НАЛАШТУВАННЯ КОНТЕНТУ ЗНИЗУ */
            .full-start-new__right {
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-end !important;
                height: 100vh !important;
                padding: 0 5% 60px 5% !important;
                /* М'який градієнт на весь екран для читабельності тексту */
                background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 30%, transparent 70%) !important;
                box-sizing: border-box !important;
                position: relative !important;
                z-index: 10 !important;
            }

            /* 3. ОЧИЩЕННЯ ОПИСУ (прибираємо фон самого тексту) */
            .full-start-new__description {
                background: none !important;
                background-color: transparent !important;
                padding: 0 !important;
                margin: 0 0 25px 0 !important;
                font-size: 1.15rem !important;
                line-height: 1.5 !important;
                color: rgba(255,255,255,0.8) !important;
                max-width: 750px !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 3 !important;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5) !important;
            }

            /* 4. СТИЛЬ APPLE LOGO ТА МЕТА */
            .apple-logo-container img {
                max-width: 450px;
                max-height: 150px;
                object-fit: contain;
                object-position: left bottom;
                margin-bottom: 15px;
                filter: drop-shadow(0 0 20px rgba(0,0,0,0.6));
            }

            .apple-meta-row {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
                font-size: 1.25rem;
                color: #fff;
                font-weight: 500;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }

            .apple-rating-pill {
                background: #ffad08;
                color: #000;
                padding: 3px 10px;
                border-radius: 6px;
                font-weight: 900;
                font-size: 1.1rem;
            }

            /* 5. КНОПКИ (Glassmorphism) */
            .full-start-new__buttons {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 15px !important;
                background: none !important;
            }

            .full-start-new__buttons .full-start__button {
                background: rgba(255,255,255,0.12) !important;
                border: none !important;
                border-radius: 12px !important;
                backdrop-filter: blur(10px);
                transition: all 0.2s ease !important;
            }

            .full-start-new__buttons .full-start__button.focus {
                background: #fff !important;
                color: #000 !important;
                transform: scale(1.08) !important;
                box-shadow: 0 10px 20px rgba(0,0,0,0.3) !important;
            }

            /* Ховаємо старі елементи */
            .full-start-new__left, .full-start-new__tagline, .full-start-new__status, .full-start-new__title { 
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
                    // Пріоритет: UA -> EN -> Будь-яке [cite: 2026-02-17]
                    var best = res.logos.find(l => l.iso_639_1 === lang) || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                    if (best) {
                        var url = Lampa.TMDB.image('/t/p/w500' + best.file_path);
                        logoCache[movieId] = url;
                        $right.find('.apple-logo-container').html(`<img src="${url}">`);
                    } else {
                        // Якщо лого немає взагалі, показуємо назву текстом
                        $right.find('.apple-logo-container').html(`<h1 style="font-size: 3rem; margin: 0;">${movie.title || movie.name}</h1>`);
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
