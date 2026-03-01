(function () {
    'use strict';

    var logoCache = {}; 

    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles-v3');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'tv-interface-styles-v3';
        
        var css = `
            @media screen and (min-width: 481px) {
                .full-start-new__left { display: none !important; } 

                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: 1 !important;
                    mask-image: linear-gradient(to right, #000 0%, #000 30%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, #000 0%, #000 30%, transparent 100%) !important;
                }

                .full-start-new__right {
                    position: relative;
                    z-index: 2 !important;
                    width: 55% !important;
                    padding-left: 5% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    height: 100vh !important;
                    background: none !important;
                }

                .full-start-new__title {
                    font-size: 0 !important;
                    margin-bottom: 15px !important;
                    text-align: left !important;
                }
                .full-start-new__title img {
                    max-height: 180px !important;
                    max-width: 450px !important;
                    filter: drop-shadow(0 0 20px rgba(0,0,0,0.8));
                }

                /* Блок опису та мета-даних */
                .plugin-tv-descr {
                    margin: 15px 0 25px 0;
                    color: #fff;
                    text-align: left;
                }
                .plugin-tv-meta {
                    font-size: 1.2rem;
                    font-weight: 500;
                    opacity: 0.8;
                    margin-bottom: 10px;
                    display: flex;
                    gap: 15px;
                    align-items: center;
                }
                .plugin-tv-plot {
                    font-size: 1.1rem;
                    line-height: 1.5;
                    opacity: 0.7;
                    max-width: 90%;
                    display: -webkit-box;
                    -webkit-line-clamp: 3; /* Обмежуємо до 3 рядків */
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                /* Ховаємо стандартні елементи, щоб не дублювати */
                .full-start-new__tagline, .full-start-new__details { display: none !important; }
            }
        `;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function formatTime(mins) {
        if (!mins) return '';
        return Math.floor(mins / 60) + 'г ' + (mins % 60) + 'хв';
    }

    function loadMovieLogo(movie, $container, e) {
        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        
        // Рендеримо опис відразу
        $container.find('.plugin-tv-descr').remove();
        var year = (movie.release_date || movie.first_air_date || '').split('-')[0];
        var genres = (movie.genres || []).slice(0, 2).map(g => g.name).join(' • ');
        var runtime = formatTime(movie.runtime || movie.episode_run_time);
        
        var descHtml = '<div class="plugin-tv-descr">' +
            '<div class="plugin-tv-meta">' + 
                (year ? '<span>' + year + '</span>' : '') + 
                (genres ? '<span>' + genres + '</span>' : '') + 
                (runtime ? '<span>' + runtime + '</span>' : '') + 
            '</div>' +
            '<div class="plugin-tv-plot">' + (movie.overview || '') + '</div>' +
        '</div>';
        
        $container.append(descHtml);

        // Завантажуємо лого (якщо немає укр, беремо англ) [cite: 2026-02-17]
        if (logoCache[movieId]) { $container.find('img').first().attr('src', logoCache[movieId]); return; }
        
        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
            success: function(res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                if (logo) {
                    var url = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                    logoCache[movieId] = url;
                    $container.find('img').first().attr('src', url);
                }
            }
        });
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth > 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie, $render = e.object.activity.render();
                var $titleBlock = $render.find('.full-start-new__title');
                
                // Додаємо заглушку під лого, якщо її ще немає
                if (!$titleBlock.find('img').length) $titleBlock.prepend('<img src="" alt="">');
                
                loadMovieLogo(movie, $render.find('.full-start-new__right'), e);
            }
        });
    }

    if (window.appready) { applyStyles(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); init(); } });
})();
