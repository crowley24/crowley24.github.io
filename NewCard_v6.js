(function () {
    'use strict';

    const logoCache = {};

    function applyStyles() {
        const oldStyle = document.getElementById('apple-tv-fix-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        const style = document.createElement('style');
        style.id = 'apple-tv-fix-styles';
        style.textContent = `
            @media screen and (min-width: 481px) {
                /* Приховуємо зайве та очищуємо фон */
                .full-start-new__left, .full-start-new__bg { display: none !important; }
                .full-start-new, .full-start-new__right, .full-start-new__details {
                    background: none !important;
                }

                /* Налаштування головного фону */
                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0; left: 0;
                    width: 100% !important; height: 100% !important;
                    z-index: 1 !important;
                    background-size: cover !important;
                    background-position: center 20% !important;
                    mask-image: linear-gradient(to right, #000 0%, #000 20%, rgba(0,0,0,0.5) 60%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, #000 0%, #000 20%, rgba(0,0,0,0.5) 60%, transparent 100%) !important;
                }

                /* Контентна частина знизу ліворуч */
                .full-start-new__right {
                    position: relative !important;
                    z-index: 10 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-end !important;
                    height: 100vh !important;
                    padding: 0 0 6% 60px !important;
                    width: 60% !important;
                }

                /* Графічне лого фільму */
                .full-start-new__title {
                    font-size: 0 !important;
                    margin-bottom: 20px !important;
                    text-align: left !important;
                }
                .full-start-new__title img {
                    max-height: 160px !important;
                    max-width: 450px !important;
                    object-fit: contain !important;
                    filter: drop-shadow(0 0 15px rgba(0,0,0,0.8));
                }

                /* Опис фільму */
                .full-start-new__tagline {
                    font-size: 1.3rem !important;
                    line-height: 1.5 !important;
                    margin: 15px 0 25px 0 !important;
                    max-width: 800px !important;
                    display: -webkit-box !important;
                    -webkit-line-clamp: 2 !important;
                    -webkit-box-orient: vertical !important;
                    overflow: hidden !important;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.9) !important;
                }

                /* Кнопки в один ряд */
                .full-start-new__buttons {
                    display: flex !important;
                    align-items: center !important;
                    gap: 15px !important;
                    background: none !important;
                    margin: 0 !important;
                }

                /* Головна кнопка (біла) */
                .full-start-new__buttons .button {
                    background: rgba(255,255,255,0.1) !important;
                    border-radius: 12px !important;
                    color: #fff !important;
                    transition: all 0.2s ease !important;
                    padding: 10px 20px !important;
                    border: none !important;
                }

                /* Стиль для першої кнопки (Дивитися) */
                .full-start-new__buttons .button:first-child {
                    background: #fff !important;
                    color: #000 !important;
                    font-weight: bold !important;
                }

                /* Ефект фокусу Apple TV */
                .full-start-new__buttons .button.focus {
                    transform: scale(1.1) !important;
                    background: #fff !important;
                    color: #000 !important;
                    box-shadow: 0 0 20px rgba(255,255,255,0.4) !important;
                }
                
                /* Приховуємо зайві підписи під іконками, якщо вони є */
                .full-start-new__buttons .button span { display: inline-block !important; }
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
