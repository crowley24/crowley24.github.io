(function () {
    'use strict';

    const logoCache = {};

    function applyStyles() {
        const oldStyle = document.getElementById('apple-tv-bright-fix');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        const style = document.createElement('style');
        style.id = 'apple-tv-bright-fix';
        style.textContent = `
            @media screen and (min-width: 481px) {
                /* 1. ПОВНА ОЧИСТКА ВІД СТАНДАРТНОГО ХЛАМУ */
                .full-start-new__left, .full-start-new__bg, .full-start-new__details,
                .full-start-new__info, .full-person, .full-start-new__title-head { 
                    display: none !important; 
                }

                .full-start-new, .full-start-new__right {
                    background: none !important;
                    background-color: transparent !important;
                    overflow: hidden !important;
                }

                /* 2. МАКСИМАЛЬНО СВІТЛИЙ ФОН */
                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0; left: 0;
                    width: 100% !important; height: 100% !important;
                    z-index: 1 !important;
                    background-size: cover !important;
                    background-position: center 20% !important;
                    filter: brightness(1.1) !important; /* Трохи додаємо яскравості */
                    mask-image: none !important; /* Прибираємо маску з картинки */
                    -webkit-mask-image: none !important;
                }

                /* 3. КОНТЕНТНИЙ БЛОК (Apple Style) */
                .full-start-new__right {
                    position: relative !important;
                    z-index: 10 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-end !important;
                    height: 100vh !important;
                    width: 50% !important;
                    padding: 0 0 60px 60px !important; /* Збільшений відступ знизу, щоб кнопки не вилітали */
                    box-sizing: border-box !important;
                    /* Легке розмите затемнення ТІЛЬКИ зліва під текстом */
                    background: linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, transparent 100%) !important;
                }

                /* 4. ЛОГОТИП */
                .full-start-new__title {
                    font-size: 0 !important;
                    margin-bottom: 20px !important;
                    text-align: left !important;
                }
                .full-start-new__title img {
                    max-height: 140px !important;
                    max-width: 400px !important;
                    object-fit: contain !important;
                    filter: drop-shadow(0 0 10px rgba(0,0,0,0.8));
                }

                /* 5. ОПИС */
                .full-start-new__tagline {
                    font-size: 1.3rem !important;
                    line-height: 1.5 !important;
                    margin-bottom: 35px !important;
                    color: #fff !important;
                    text-shadow: 2px 2px 5px rgba(0,0,0,0.9) !important;
                    display: -webkit-box !important;
                    -webkit-line-clamp: 2 !important;
                    -webkit-box-orient: vertical !important;
                    overflow: hidden !important;
                }

                /* 6. КНОПКИ (Фікс положення) */
                .full-start-new__buttons {
                    display: flex !important;
                    align-items: center !important;
                    gap: 15px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }

                .full-start-new__buttons .button {
                    background: rgba(255,255,255,0.15) !important;
                    backdrop-filter: blur(10px) !important;
                    -webkit-backdrop-filter: blur(10px) !important;
                    border-radius: 12px !important;
                    padding: 12px 25px !important;
                    color: #fff !important;
                    border: none !important;
                    transition: all 0.2s ease !important;
                }

                /* Перша кнопка (Дивитися) */
                .full-start-new__buttons .button:first-child {
                    background: #fff !important;
                    color: #000 !important;
                }

                .full-start-new__buttons .button.focus {
                    transform: scale(1.1) !important;
                    background: #fff !important;
                    color: #000 !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
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
