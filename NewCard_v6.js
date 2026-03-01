(function () {
    'use strict';

    var logoCache = {}; 

    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles-v4');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'tv-interface-styles-v4';
        
        var css = `
            @media screen and (min-width: 481px) {
                .full-start-new__left { display: none !important; } 

                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: 1 !important;
                    mask-image: linear-gradient(to right, #000 0%, #000 35%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, #000 0%, #000 35%, transparent 100%) !important;
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

                /* Логотип */
                .full-start-new__title {
                    font-size: 0 !important;
                    margin: 0 0 10px 0 !important;
                    text-align: left !important;
                }
                .full-start-new__title img {
                    max-height: 160px !important;
                    max-width: 450px !important;
                    filter: drop-shadow(0 0 20px rgba(0,0,0,0.8));
                }

                /* Блок опису */
                .plugin-tv-content {
                    order: 2; /* Гарантуємо порядок */
                    margin-bottom: 25px;
                }

                .plugin-tv-meta {
                    font-size: 1.3rem;
                    font-weight: 500;
                    margin-bottom: 8px;
                    display: flex;
                    gap: 15px;
                    color: #fff;
                }

                .plugin-tv-plot {
                    font-size: 1.15rem;
                    line-height: 1.4;
                    opacity: 0.8;
                    max-width: 85%;
                    color: #fff;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                /* Кнопки переносимо вниз */
                .full-start-new__buttons {
                    order: 3 !important;
                    margin-top: 10px !important;
                    justify-content: flex-start !important;
                }

                /* Ховаємо стандартні елементи */
                .full-start-new__tagline, .full-start-new__details, .full-start-new__status { display: none !important; }
            }
        `;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function formatTime(mins) {
        return mins ? Math.floor(mins / 60) + 'г ' + (mins % 60) + 'хв' : '';
    }

    function renderInfo(movie, $container) {
        $container.find('.plugin-tv-content').remove();
        
        var year = (movie.release_date || movie.first_air_date || '').split('-')[0];
        var genres = (movie.genres || []).slice(0, 2).map(g => g.name).join(' • ');
        var runtime = formatTime(movie.runtime || movie.episode_run_time);
        
        var html = $(`
            <div class="plugin-tv-content">
                <div class="plugin-tv-meta">
                    ${year ? '<span>' + year + '</span>' : ''}
                    ${genres ? '<span>' + genres + '</span>' : ''}
                    ${runtime ? '<span>' + runtime + '</span>' : ''}
                </div>
                <div class="plugin-tv-plot">${movie.overview || ''}</div>
            </div>
        `);

        // Вставляємо ПЕРЕД кнопками
        html.insertBefore($container.find('.full-start-new__buttons'));
    }

    function loadLogo(movie, $container) {
        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        var $img = $container.find('.full-start-new__title img');
        if (!$img.length) {
            $container.find('.full-start-new__title').prepend('<img src="" style="opacity:0; transition: opacity 0.5s">');
            $img = $container.find('.full-start-new__title img');
        }

        if (logoCache[movieId]) {
            $img.attr('src', logoCache[movieId]).css('opacity', 1);
            return;
        }

        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
            success: function(res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                // Якщо українського лого немає, використовуємо англійське [cite: 2026-02-17]
                var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                if (logo) {
                    var url = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                    logoCache[movieId] = url;
                    $img.attr('src', url).css('opacity', 1);
                }
            }
        });
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth > 480 && (e.type === 'complite' || e.type === 'complete')) {
                var movie = e.data.movie;
                var $right = e.object.activity.render().find('.full-start-new__right');
                
                renderInfo(movie, $right);
                loadLogo(movie, $right);
            }
        });
    }

    if (window.appready) { applyStyles(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); init(); } });
})();
