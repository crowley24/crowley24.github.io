(function () {
    'use strict';

    var logoCache = {}; 
    var pluginPath = 'https://crowley24.github.io/NewIcons/';
    
    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'tv-interface-styles';
        
        var css = `
            @media screen and (min-width: 481px) {
                /* 1. ПОВНІСТЮ ВИДАЛЯЄМО ПОСТЕР ЗЛІВА */
                .full-start-new__left { display: none !important; } 

                /* 2. РОБОТА З ФОНОМ (Backdrop) */
                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: 1 !important;
                    /* Плавний градієнт: зліва повна темрява під текст, справа — картинка */
                    mask-image: linear-gradient(to right, #000 0%, #000 25%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, #000 0%, #000 25%, transparent 100%) !important;
                }
                .full-start-new__poster img { 
                    object-fit: cover !important; 
                    width: 100% !important; 
                    height: 100% !important;
                    object-position: top right !important;
                }

                /* 3. ОСНОВНИЙ БЛОК ІНФОРМАЦІЇ */
                .full-start-new__right {
                    position: relative;
                    z-index: 2 !important;
                    width: 45% !important; /* Займаємо ліву частину екрана */
                    padding-left: 60px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    height: 100vh !important;
                    background: none !important;
                    margin: 0 !important;
                }

                /* 4. ЛОГОТИП ЗАМІСТЬ ТЕКСТУ */
                .full-start-new__title {
                    font-size: 0 !important;
                    margin-bottom: 20px !important;
                    text-align: left !important;
                }
                .full-start-new__title img {
                    max-height: 180px !important;
                    max-width: 100% !important;
                    filter: drop-shadow(0 0 20px rgba(0,0,0,0.8));
                }

                /* Ховаємо зайві дрібні деталі, які ми замінимо */
                .full-start-new__details, .full-start-new__age { display: none !important; }
                
                /* Опис та кнопки */
                .full-start-new__tagline { 
                    font-size: 1.4rem !important; 
                    max-width: 80% !important; 
                    text-align: left !important;
                    margin-bottom: 30px !important;
                }
                .full-start-new__buttons { justify-content: flex-start !important; }
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
                // Використовуємо англійське лого, якщо українського немає [cite: 2026-02-17]
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
