(function () {
    'use strict';

    var logoCache = {};

    function applyStyles() {
        var styleId = 'lampa-apple-tv-force-v5';
        if (document.getElementById(styleId)) return;

        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* 1. ПРИМУСОВЕ ПРИХОВУВАННЯ СТАНДАРТНИХ ЕЛЕМЕНТІВ */
            .full-start-new__title, .full-start-new__left, .full-start-new__tagline, 
            .full-start-new__status, .full-start-new__info {
                display: none !important;
            }

            /* 2. ОЧИЩЕННЯ ФОНУ (Тотально) */
            .full-start-new, .full-start-new__details, .full-start-new__right {
                background: none !important;
                background-color: transparent !important;
                box-shadow: none !important;
                border: none !important;
                -webkit-mask-image: none !important;
            }

            /* 3. APPLE TV ЛЕЙАУТ */
            .full-start-new__right {
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-end !important;
                height: 100vh !important;
                padding: 0 5% 80px 5% !important;
                background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 40%, transparent 100%) !important;
                box-sizing: border-box !important;
                position: absolute !important;
                top: 0; left: 0; right: 0; bottom: 0;
                z-index: 100 !important;
            }

            /* 4. ЛОГОТИП ТА ТЕКСТ */
            .apple-logo-container img {
                max-width: 450px;
                max-height: 150px;
                object-fit: contain;
                object-position: left bottom;
                filter: drop-shadow(0 0 20px rgba(0,0,0,0.8));
                margin-bottom: 10px;
            }

            .apple-meta-row {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
                font-size: 1.3rem;
                color: #fff;
                text-shadow: 0 2px 4px rgba(0,0,0,0.9);
            }

            .apple-rating-pill {
                background: #ffad08;
                color: #000;
                padding: 2px 10px;
                border-radius: 6px;
                font-weight: 900;
            }

            .full-start-new__description {
                background: none !important;
                padding: 0 !important;
                font-size: 1.2rem !important;
                color: rgba(255,255,255,0.85) !important;
                max-width: 750px !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 3 !important;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
                margin-bottom: 30px !important;
            }

            /* 5. КНОПКИ */
            .full-start-new__buttons {
                display: flex !important;
                gap: 15px !important;
                background: none !important;
            }

            .full-start-new__buttons .full-start__button {
                background: rgba(255,255,255,0.12) !important;
                border-radius: 12px !important;
                backdrop-filter: blur(15px);
                border: none !important;
            }

            .full-start-new__buttons .full-start__button.focus {
                background: #fff !important;
                color: #000 !important;
                transform: scale(1.1) !important;
            }
        `;
        document.head.appendChild(style);
    }

    function injectElements($container, movie) {
        if ($container.find('.apple-logo-container').length) return;

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

        $container.prepend($appleHeader);

        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        $.ajax({
            url: Lampa.TMDB.api((movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key()),
            success: function (res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                // Використовуємо UA лого, якщо немає — EN [cite: 2026-02-17]
                var best = res.logos.find(l => l.iso_639_1 === lang) || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                if (best) {
                    $container.find('.apple-logo-container').html(`<img src="${Lampa.TMDB.image('/t/p/w500' + best.file_path)}">`);
                }
            }
        });
    }

    function init() {
        applyStyles();

        // Observer для відстеження появи картки
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    var $full = $('.full-start-new__right');
                    if ($full.length && Lampa.Activity.active().component === 'full') {
                        var data = Lampa.Activity.active().activity.data;
                        if (data && data.movie) {
                            injectElements($full, data.movie);
                        }
                    }
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });

})();
