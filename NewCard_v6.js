(function () {
    'use strict';

    var logoCache = {};

    function applyStyles() {
        var styleId = 'lampa-apple-tv-clean-v2';
        if (document.getElementById(styleId)) return;

        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Повністю прибираємо стандартний фон Lampa */
            .full-start-new__right, 
            .full-start-new__details, 
            .full-start-new { 
                background: none !important; 
                background-color: transparent !important;
            }

            /* Натомість робимо м'який градієнт знизу для всього екрана */
            .full-start-new__right {
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-end !important;
                height: 100vh !important;
                padding: 0 5% 50px 5% !important;
                background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, transparent 100%) !important;
                box-sizing: border-box !important;
                position: relative !important;
                z-index: 10;
            }

            /* Ховаємо ліву частину та зайві статуси */
            .full-start-new__left, .full-start-new__tagline, .full-start-new__status { 
                display: none !important; 
            }

            /* Логотип фільму */
            .apple-logo-container img {
                max-width: 450px;
                max-height: 140px;
                object-fit: contain;
                object-position: left bottom;
                margin-bottom: 10px;
                filter: drop-shadow(0 0 15px rgba(0,0,0,0.8));
            }

            /* Мета-дані */
            .apple-meta-row {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 12px;
                font-size: 1.2rem;
                color: #fff;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            }

            .apple-rating-pill {
                background: #ffad08;
                color: #000;
                padding: 2px 10px;
                border-radius: 6px;
                font-weight: 900;
                font-size: 1rem;
            }

            /* Опис: 3 рядки, без фону */
            .full-start-new__description {
                background: none !important;
                padding: 0 !important;
                font-size: 1.1rem !important;
                line-height: 1.5 !important;
                color: rgba(255,255,255,0.8) !important;
                max-width: 700px !important;
                margin: 0 0 25px 0 !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 3 !important;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }

            /* Кнопки */
            .full-start-new__buttons {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 15px !important;
                margin: 0 !important;
            }

            .full-start-new__buttons .full-start__button {
                background: rgba(255,255,255,0.15) !important;
                border: none !important;
                border-radius: 12px !important;
                backdrop-filter: blur(5px);
            }

            .full-start-new__buttons .full-start__button.focus {
                background: #fff !important;
                color: #000 !important;
                transform: scale(1.08) !important;
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
                        $right.find('.full-start-new__title').hide();
                    } else {
                        $right.find('.full-start-new__title').show();
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
