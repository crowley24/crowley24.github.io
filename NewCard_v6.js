(function () {
    'use strict';

    const logoCache = {};

    function applyStyles() {
        const oldStyle = document.getElementById('apple-tv-fix-styles-v4');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        const style = document.createElement('style');
        style.id = 'apple-tv-fix-styles-v4';
        style.textContent = `
            @media screen and (min-width: 481px) {
                /* Приховуємо зайві елементи */
                .full-start-new__left, .full-start-new__bg { display: none !important; }
                
                /* Очищуємо контейнери від чорних підкладок */
                .full-start-new, 
                .full-start-new__right, 
                .full-start-new__details {
                    background: none !important;
                    background-color: transparent !important;
                }

                /* НАЛАШТУВАННЯ ФОНУ: Робимо його світлішим */
                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0; left: 0;
                    width: 100% !important; height: 100% !important;
                    z-index: 1 !important;
                    background-size: cover !important;
                    background-position: center 20% !important;
                    /* Полегшена маска: менше чорного зліва, більше прозорості */
                    mask-image: linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.1) 70%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.1) 70%, transparent 100%) !important;
                }

                /* Контентна частина */
                .full-start-new__right {
                    position: relative !important;
                    z-index: 10 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-end !important;
                    height: 100vh !important;
                    padding: 0 0 5% 60px !important;
                    width: 55% !important;
                    /* Додаємо легке затемнення лише знизу під текстом */
                    background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 30%) !important;
                }

                /* Графічне лого */
                .full-start-new__title {
                    font-size: 0 !important;
                    margin-bottom: 15px !important;
                }
                .full-start-new__title img {
                    max-height: 160px !important;
                    max-width: 450px !important;
                    object-fit: contain !important;
                    /* Тінь для лого, щоб воно не зливалося зі світлим фоном */
                    filter: drop-shadow(0 0 12px rgba(0,0,0,0.6));
                }

                /* Опис */
                .full-start-new__tagline {
                    font-size: 1.2rem !important;
                    line-height: 1.4 !important;
                    margin: 10px 0 25px 0 !important;
                    max-width: 700px !important;
                    color: #fff !important;
                    text-shadow: 1px 1px 5px rgba(0,0,0,0.9) !important;
                }

                /* Кнопки */
                .full-start-new__buttons {
                    display: flex !important;
                    gap: 12px !important;
                    background: none !important;
                }

                .full-start-new__buttons .button {
                    background: rgba(255,255,255,0.15) !important;
                    backdrop-filter: blur(10px) !important;
                    -webkit-backdrop-filter: blur(10px) !important;
                    border-radius: 12px !important;
                    color: #fff !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    padding: 10px 22px !important;
                }

                /* Перша кнопка завжди акцентна */
                .full-start-new__buttons .button:first-child {
                    background: #fff !important;
                    color: #000 !important;
                }

                .full-start-new__buttons .button.focus {
                    transform: scale(1.08) !important;
                    background: #fff !important;
                    color: #000 !important;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
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
