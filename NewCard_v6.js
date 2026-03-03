(function () {
    'use strict';

    const logoCache = {};

    function applyStyles() {
        const oldStyle = document.getElementById('apple-tv-final-clean');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        const style = document.createElement('style');
        style.id = 'apple-tv-final-clean';
        style.textContent = `
            @media screen and (min-width: 481px) {
                /* 1. Очищення сміття та стандартних блоків Lampa */
                .full-start-new__left, .full-start-new__bg { display: none !important; }
                .full-start-new, .full-start-new__right, .full-start-new__details {
                    background: none !important;
                    background-color: transparent !important;
                }

                /* 2. Яскравий фон без зайвих масок */
                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0; left: 0;
                    width: 100% !important; height: 100% !important;
                    z-index: 1 !important;
                    background-size: cover !important;
                    background-position: center 20% !important;
                    /* Дуже м'яке затемнення лише зліва */
                    mask-image: linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 50%, transparent 100%) !important;
                }

                /* 3. Головний контейнер (Body) */
                .full-start-new__right {
                    position: relative !important;
                    z-index: 10 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-end !important;
                    height: 100vh !important;
                    padding: 0 0 50px 60px !important; /* Відступ від низу 50px */
                    width: 55% !important;
                    box-sizing: border-box !important;
                }

                /* 4. Логотип (зверху) */
                .full-start-new__title {
                    font-size: 0 !important;
                    margin-bottom: 20px !important;
                    order: 1 !important;
                }
                .full-start-new__title img {
                    max-height: 150px !important;
                    max-width: 450px !important;
                    object-fit: contain !important;
                    filter: drop-shadow(0 0 10px rgba(0,0,0,0.7));
                }

                /* 5. Метадані (Рік, Жанр) */
                .full-start-new__info {
                    order: 2 !important;
                    margin-bottom: 15px !important;
                    font-size: 1.1rem !important;
                    color: rgba(255,255,255,0.7) !important;
                }

                /* 6. Опис (посередині) */
                .full-start-new__tagline {
                    order: 3 !important;
                    font-size: 1.3rem !important;
                    line-height: 1.5 !important;
                    margin-bottom: 30px !important;
                    max-width: 100% !important;
                    display: -webkit-box !important;
                    -webkit-line-clamp: 2 !important;
                    -webkit-box-orient: vertical !important;
                    overflow: hidden !important;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.8) !important;
                }

                /* 7. Кнопки (внизу) */
                .full-start-new__buttons {
                    order: 4 !important;
                    display: flex !important;
                    gap: 15px !important;
                    margin: 0 !important;
                }

                .full-start-new__buttons .button {
                    background: rgba(255,255,255,0.1) !important;
                    backdrop-filter: blur(10px) !important;
                    -webkit-backdrop-filter: blur(10px) !important;
                    border-radius: 12px !important;
                    padding: 12px 25px !important;
                    border: none !important;
                }

                .full-start-new__buttons .button.focus {
                    background: #fff !important;
                    color: #000 !important;
                    transform: scale(1.05) !important;
                }

                /* ВИПРАВЛЕННЯ НАКЛАДАННЯ: приховуємо все, що нижче основної картки */
                .full-start-new__details {
                    display: none !important;
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
