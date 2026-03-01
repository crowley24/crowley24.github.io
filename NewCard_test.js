(function () {
    'use strict';

    var logoCache = {}; 
    var slideshowTimer; 
    var pluginPath = 'https://crowley24.github.io/NewIcons/';
    
    // Додаємо налаштування (залишаємо ті ж, що й у тебе)
    var settings_list = [
        { id: 'tv_interface_logo_size', default: '250' },
        { id: 'tv_interface_animation', default: true }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') Lampa.Storage.set(opt.id, opt.default);
    });

    var svgIcons = { '4K': pluginPath + '4K.svg', 'HDR': pluginPath + 'HDR.svg', 'UKR': pluginPath + 'UKR.svg' /* Додай інші */ };

    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var lHeight = Lampa.Storage.get('tv_interface_logo_size', '250');
        var isAnim = Lampa.Storage.get('tv_interface_animation');

        var css = `
            /* Фон на весь екран */
            .full-start-new__poster {
                position: absolute !important;
                top: 0; left: 0; width: 100% !important; height: 100vh !important;
                z-index: 1; overflow: hidden;
            }
            .full-start-new__poster img {
                width: 100%; height: 100%; object-fit: cover;
                mask-image: linear-gradient(to right, transparent 0%, #000 50%) !important;
                -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 50%) !important;
                ${isAnim ? 'animation: kenBurnsEffect 30s infinite alternate;' : ''}
            }

            /* Контент зліва (Apple TV Style) */
            .full-start-new__right {
                position: relative;
                z-index: 2;
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-start !important; /* Все вліво */
                justify-content: center;
                height: 85vh;
                padding-left: 5% !important;
                width: 50% !important; /* Тільки ліва половина екрану */
                background: none !important;
                text-align: left !important;
            }

            .full-start-new__title {
                width: auto !important;
                justify-content: flex-start !important;
                margin-bottom: 20px !important;
            }
            .full-start-new__title img {
                max-height: ${lHeight}px !important;
                max-width: 40vw !important;
                filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
            }

            .plugin-ratings-row {
                display: flex;
                gap: 15px;
                margin: 15px 0 !important;
                font-size: 1.4em;
            }

            .full-start-new__tagline {
                font-size: 1.5em !important;
                opacity: 0.8;
                margin-bottom: 20px !important;
                max-width: 80%;
            }

            .full-start-new__buttons {
                justify-content: flex-start !important;
                margin-top: 30px !important;
            }

            /* Приховуємо зайве */
            .full-start-new__details, .full-start__info { display: none !important; }

            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                100% { transform: scale(1.15); }
            }
        `;

        var style = document.createElement('style');
        style.id = 'tv-interface-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // Логіка завантаження лого (така сама, але з адаптацією під TV)
    function loadMovieLogo(movie, $container) {
        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        if (logoCache[movieId]) { $container.html('<img src="' + logoCache[movieId] + '">'); return; }
        
        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
            success: function(res) {
                var logo = res.logos.filter(l => l.iso_639_1 === 'uk')[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                if (logo) {
                    var url = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                    logoCache[movieId] = url;
                    $container.html('<img src="' + url + '">');
                }
            }
        });
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie;
                var $render = e.object.activity.render();
                
                loadMovieLogo(movie, $render.find('.full-start-new__title'));
                
                // Додаємо рейтинги та інфо зліва
                var tmdb = parseFloat(movie.vote_average || 0).toFixed(1);
                var $info = $(`<div class="plugin-ratings-row">
                    <span style="color: #2ecc71">${tmdb}</span>
                    <span>${movie.release_date || movie.first_air_date || ''}</span>
                </div>`);
                
                $render.find('.full-start-new__title').after($info);
            }
        });
    }

    // Запуск
    if (window.appready) { applyStyles(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); init(); } });
})();
