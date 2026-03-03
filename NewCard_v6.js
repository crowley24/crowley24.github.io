(function () {
    'use strict';

    var logoCache = {}; 

    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles-apple');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'tv-interface-styles-apple';
        
        var css = `
            @media screen and (min-width: 481px) {
                /* Приховуємо стандартні елементи */
                .full-start-new__left, .full-start-new__bg { display: none !important; } 

                /* Контейнер картки */
                .full-start-new {
                    background: #000 !important;
                    height: 100vh !important;
                    overflow: hidden !important;
                    display: flex !important;
                    align-items: center !important;
                    position: relative !important;
                }

                /* Фон (Fanart) */
                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0;
                    width: 70% !important; /* Фон займає праву частину */
                    height: 100% !important;
                    z-index: 1 !important;
                    background-size: cover !important;
                    mask-image: linear-gradient(to right, #000 0%, rgba(0,0,0,0.8) 20%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, #000 0%, rgba(0,0,0,0.8) 20%, transparent 100%) !important;
                }

                /* Контентна частина */
                .full-start-new__right {
                    position: relative;
                    z-index: 10 !important;
                    width: 45% !important;
                    padding-left: 60px !important;
                    background: none !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                }

                /* Логотип фільму */
                .full-start-new__title {
                    font-size: 0 !important;
                    margin-bottom: 30px !important;
                    text-align: left !important;
                }
                .full-start-new__title img {
                    max-height: 180px !important;
                    max-width: 100% !important;
                    object-fit: contain !important;
                    filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
                }

                /* Опис (Tagline / Details) */
                .full-start-new__tagline {
                    font-size: 1.4rem !important;
                    line-height: 1.5 !important;
                    margin-bottom: 25px !important;
                    max-width: 100% !important;
                    opacity: 0.8;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                }

                /* Стилізація кнопок (Apple Style) */
                .full-start-new__buttons {
                    display: flex !important;
                    gap: 15px !important;
                }
                .full-start-new__buttons .button {
                    background: rgba(255, 255, 255, 0.1) !important;
                    backdrop-filter: blur(10px) !important;
                    border-radius: 12px !important;
                    border: none !important;
                    padding: 12px 25px !important;
                    transition: transform 0.2s !important;
                }
                .full-start-new__buttons .button:focus {
                    background: #fff !important;
                    color: #000 !important;
                    transform: scale(1.05) !important;
                }
            }
        `;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function loadMovieLogo(movie, $container) {
        var movieId = (movie.id || movie.tmdb_id) + (movie.name ? '_tv' : '_movie');
        if (logoCache[movieId]) {
            $container.html('<img src="' + logoCache[movieId] + '">');
            return;
        }
        
        // Використовуємо Lampa.TMDB.key() або стандартний ключ
        var key = Lampa.TMDB.key ? Lampa.TMDB.key() : '4ef0dcc2d9cb505a8d034e351483952a';
        
        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + (movie.id || movie.tmdb_id) + '/images?api_key=' + key,
            success: function(res) {
                if (res.logos && res.logos.length > 0) {
                    var lang = Lampa.Storage.get('language') || 'uk';
                    // Пріоритет: обрана мова -> англійська -> перше ліпше
                    var logo = res.logos.find(l => l.iso_639_1 === lang) || 
                               res.logos.find(l => l.iso_639_1 === 'en') || 
                               res.logos[0];
                    
                    if (logo) {
                        var url = 'https://image.tmdb.org/t/p/w500' + logo.file_path;
                        logoCache[movieId] = url;
                        $container.html('<img src="' + url + '">');
                    }
                }
            }
        });
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth > 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                
                // Чекаємо мікротаск, щоб Lampa встигла відрендерити DOM
                setTimeout(function() {
                    loadMovieLogo(movie, $render.find('.full-start-new__title'));
                }, 10);
            }
        });
    }

    if (window.appready) { applyStyles(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); init(); } });
})();
