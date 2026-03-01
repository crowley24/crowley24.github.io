(function () {
    'use strict';

    var logoCache = {}; 

    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles-final');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'tv-interface-styles-final';
        
        var css = `
            @media screen and (min-width: 481px) {
                /* Видаляємо вертикальний постер зліва */
                .full-start-new__left { display: none !important; } 

                /* Налаштування єдиного фону */
                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: 1 !important;
                    mask-image: linear-gradient(to right, #000 0%, #000 35%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, #000 0%, #000 35%, transparent 100%) !important;
                }

                /* Контентна частина зліва */
                .full-start-new__right {
                    position: relative;
                    z-index: 2 !important;
                    width: 50% !important;
                    padding-left: 5% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    height: 100vh !important;
                    background: none !important;
                }

                /* Графічне лого */
                .full-start-new__title {
                    font-size: 0 !important;
                    margin-bottom: 20px !important;
                }
                .full-start-new__title img {
                    max-height: 200px !important;
                    max-width: 500px !important;
                    filter: drop-shadow(0 0 25px rgba(0,0,0,0.9));
                }

                /* Опис фільму */
                .full-start-new__tagline {
                    font-size: 1.6rem !important;
                    text-align: left !important;
                    opacity: 0.9;
                    max-width: 90%;
                }
            }
        `;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function loadMovieLogo(movie, $container) {
        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        if (logoCache[movieId]) { $container.html('<img src="' + logoCache[movieId] + '">'); return; }
        
        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
            success: function(res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                // Використовуємо англійське лого, якщо немає українського [cite: 2026-02-17]
                var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                if (logo) {
                    var url = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                    logoCache[movieId] = url; $container.html('<img src="' + url + '">');
                }
            }
        });
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth > 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie, $render = e.object.activity.render();
                loadMovieLogo(movie, $render.find('.full-start-new__title'));
            }
        });
    }

    if (window.appready) { applyStyles(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); init(); } });
})();
