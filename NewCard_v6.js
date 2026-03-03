(function () {
    'use strict';

    var logoCache = {}; 

    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles-apple-v3');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'tv-interface-styles-apple-v3';
        
        var css = `
            @media screen and (min-width: 481px) {
                /* Очищення фонів */
                .full-start-new, 
                .full-start-new__right, 
                .full-start-new__details,
                .full-start-new__bg { 
                    background: none !important; 
                    background-color: transparent !important;
                }

                .full-start-new__left { display: none !important; } 

                /* Фон на весь екран */
                .full-start-new__poster {
                    position: absolute !important;
                    top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important;
                    width: 100% !important; height: 100% !important;
                    z-index: 1 !important;
                    background-size: cover !important;
                    background-position: center 20% !important;
                    mask-image: linear-gradient(to right, #000 0%, #000 20%, rgba(0,0,0,0.5) 50%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, #000 0%, #000 20%, rgba(0,0,0,0.5) 50%, transparent 100%) !important;
                }

                /* Контентна частина */
                .full-start-new__right {
                    position: relative !important;
                    z-index: 10 !important;
                    width: 55% !important;
                    padding-left: 60px !important;
                    padding-top: 50px !important; /* Відступ зверху для лого */
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: flex-start !important; /* Вирівнювання зверху, щоб все влізло */
                    height: auto !important;
                    min-height: 100vh !important;
                }

                /* Графічне лого */
                .full-start-new__title {
                    font-size: 0 !important;
                    margin-bottom: 20px !important;
                    text-align: left !important;
                }
                .full-start-new__title img {
                    max-height: 150px !important; /* Трохи зменшив, щоб вивільнити місце */
                    max-width: 400px !important;
                    object-fit: contain !important;
                    filter: drop-shadow(0 0 15px rgba(0,0,0,0.7));
                }

                /* Метадані та опис */
                .full-start-new__info { margin-bottom: 15px !important; }
                .full-start-new__tagline {
                    font-size: 1.3rem !important;
                    line-height: 1.4 !important;
                    margin-bottom: 30px !important;
                    max-width: 85% !important;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
                }

                /* Кнопки */
                .full-start-new__buttons {
                    position: relative !important;
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 12px !important;
                    margin-top: 10px !important;
                    z-index: 20 !important;
                }
                
                .full-start-new__buttons .button {
                    background: rgba(255, 255, 255, 0.1) !important;
                    backdrop-filter: blur(15px) !important;
                    -webkit-backdrop-filter: blur(15px) !important;
                    border-radius: 10px !important;
                    padding: 10px 20px !important;
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
        var id = movie.id || movie.tmdb_id;
        var type = movie.name ? 'tv' : 'movie';
        var cacheKey = id + '_' + type;

        if (logoCache[cacheKey]) {
            $container.html('<img src="' + logoCache[cacheKey] + '">');
            return;
        }
        
        var api_key = Lampa.TMDB.key();
        $.ajax({
            url: 'https://api.themoviedb.org/3/' + type + '/' + id + '/images?api_key=' + api_key,
            success: function(res) {
                if (res.logos && res.logos.length > 0) {
                    var lang = Lampa.Storage.get('language') || 'uk';
                    // Пріоритет: мова системи -> англійська -> будь-яка інша [cite: 2026-02-17]
                    var logo = res.logos.find(l => l.iso_639_1 === lang) || 
                               res.logos.find(l => l.iso_639_1 === 'en') || 
                               res.logos[0];
                    
                    if (logo) {
                        var url = 'https://image.tmdb.org/t/p/w500' + logo.file_path;
                        logoCache[cacheKey] = url;
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
                
                setTimeout(function() {
                    loadMovieLogo(movie, $render.find('.full-start-new__title'));
                }, 50);
            }
        });
    }

    if (window.appready) { applyStyles(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); init(); } });
})();
