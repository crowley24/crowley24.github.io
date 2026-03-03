(function () {
    'use strict';

    const logoCache = {};

    function applyStyles() {
        const oldStyle = document.getElementById('apple-tv-total-fix');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        const style = document.createElement('style');
        style.id = 'apple-tv-total-fix';
        style.textContent = `
            @media screen and (min-width: 481px) {
                /* 1. ПРИБИРАЄМО СМУГИ (ВЕРХНЮ ТА НИЖНЮ) */
                .full-start-new__left, 
                .full-start-new__bg, 
                .full-start-new__details,
                .full-start-new__info, 
                .full-person, 
                .full-start-new__title-head { 
                    display: none !important; 
                }

                /* Видаляємо стандартне верхнє затемнення Lampa */
                .full-start-new:after,
                .full-start-new:before {
                    display: none !important;
                }

                .full-start-new, .full-start-new__right {
                    background: none !important;
                    background-color: transparent !important;
                    overflow: hidden !important;
                }

                /* 2. ЧИСТИЙ ТА СВІТЛИЙ ФОН */
                .full-start-new__poster {
                    position: absolute !important;
                    top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important;
                    width: 100% !important; height: 100% !important;
                    z-index: 1 !important;
                    background-size: cover !important;
                    background-position: center 20% !important;
                    filter: brightness(1) !important;
                    /* Тільки бокове затемнення для тексту */
                    mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 80%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 80%, transparent 100%) !important;
                }

                /* 3. КОНТЕНТНИЙ БЛОК */
                .full-start-new__right {
                    position: absolute !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    z-index: 10 !important;
                    width: 55% !important;
                    height: 100vh !important;
                    padding: 0 0 80px 60px !important; /* Збільшив відступ до 80px, щоб кнопки були вище */
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-end !important;
                    box-sizing: border-box !important;
                }

                /* 4. ЛОГОТИП */
                .full-start-new__title {
                    font-size: 0 !important;
                    margin-bottom: 15px !important;
                    text-align: left !important;
                }
                .full-start-new__title img {
                    max-height: 140px !important;
                    max-width: 400px !important;
                    object-fit: contain !important;
                    filter: drop-shadow(0 0 15px rgba(0,0,0,0.8));
                }

                /* 5. ОПИС */
                .full-start-new__tagline {
                    font-size: 1.25rem !important;
                    line-height: 1.4 !important;
                    margin-bottom: 30px !important;
                    color: #fff !important;
                    text-shadow: 2px 2px 10px rgba(0,0,0,0.9) !important;
                    display: -webkit-box !important;
                    -webkit-line-clamp: 2 !important;
                    -webkit-box-orient: vertical !important;
                    overflow: hidden !important;
                }

                /* 6. КНОПКИ (Фіксовано над нижнім краєм) */
                .full-start-new__buttons {
                    display: flex !important;
                    align-items: center !important;
                    gap: 15px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }

                .full-start-new__buttons .button {
                    background: rgba(255,255,255,0.1) !important;
                    backdrop-filter: blur(15px) !important;
                    -webkit-backdrop-filter: blur(15px) !important;
                    border-radius: 12px !important;
                    padding: 12px 25px !important;
                    color: #fff !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    transition: all 0.2s ease !important;
                }

                /* Дивитися (перша кнопка) */
                .full-start-new__buttons .button:first-child {
                    background: #fff !important;
                    color: #000 !important;
                    font-weight: bold !important;
                }

                .full-start-new__buttons .button.focus {
                    transform: scale(1.1) !important;
                    background: #fff !important;
                    color: #000 !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.8) !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function loadLogo(movie, $container) {
        const id = movie.id || movie.tmdb_id;
        const type = movie.name ? 'tv' : 'movie';
        const cacheKey = id + '_' + type;

        if (logoCache[cacheKey]) {
            $container.html('<img src="' + logoCache[cacheKey] + '">');
            return;
        }

        const api_key = Lampa.TMDB.key();
        $.ajax({
            url: `https://api.themoviedb.org/3/${type}/${id}/images?api_key=${api_key}`,
            success: function (res) {
                const lang = Lampa.Storage.get('language') || 'uk';
                // Використовуємо англійське лого, якщо немає українського [cite: 2026-02-17]
                const best = res.logos.find(l => l.iso_639_1 === lang) || 
                             res.logos.find(l => l.iso_639_1 === 'en') || 
                             res.logos[0];
                if (best) {
                    const url = 'https://image.tmdb.org/t/p/w500' + best.file_path;
                    logoCache[cacheKey] = url;
                    $container.html('<img src="' + url + '">');
                }
            }
        });
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth > 480 && (e.type === 'complite' || e.type === 'complete')) {
                const movie = e.data.movie;
                const $render = e.object.activity.render();
                setTimeout(() => {
                    loadLogo(movie, $render.find('.full-start-new__title'));
                }, 50);
            }
        });
    }

    if (window.appready) { applyStyles(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); init(); } });
})();
