(function () {
    'use strict';

    var logoCache = {}; 

    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-fixed-v6');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'tv-interface-fixed-v6';
        
        var css = `
            @media screen and (min-width: 481px) {
                /* Видаляємо зайвий постер */
                .full-start-new__left { display: none !important; } 

                /* Налаштування фону */
                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: 1 !important;
                    mask-image: linear-gradient(to right, #000 0%, #000 30%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, #000 0%, #000 30%, transparent 100%) !important;
                }

                /* Ліва панель */
                .full-start-new__right {
                    position: relative;
                    z-index: 2 !important;
                    width: 50% !important;
                    padding: 0 0 0 5% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important; /* Центруємо контент вертикально */
                    height: 100vh !important;
                    background: none !important;
                    box-sizing: border-box !important;
                }

                /* Логотип */
                .full-start-new__title {
                    font-size: 0 !important;
                    margin: 0 0 15px 0 !important;
                }
                .full-start-new__title img {
                    max-height: 140px !important;
                    max-width: 400px !important;
                    filter: drop-shadow(0 0 20px rgba(0,0,0,0.8));
                }

                /* Контейнер для інфо та опису */
                .plugin-tv-info-block {
                    margin-bottom: 20px;
                }

                .plugin-tv-meta {
                    font-size: 1.3rem;
                    margin-bottom: 10px;
                    display: flex;
                    gap: 15px;
                    color: rgba(255,255,255,0.9);
                }

                .plugin-tv-plot {
                    font-size: 1.1rem;
                    line-height: 1.4;
                    color: rgba(255,255,255,0.7);
                    max-width: 85%;
                    /* ОБМЕЖЕННЯ: строго 3 рядки, щоб не виштовхувати кнопки */
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                /* КНОПКИ: ФІКСУЄМО ВНИЗУ */
                .full-start-new__buttons {
                    position: absolute !important;
                    bottom: 60px !important; /* Відступ від нижнього краю ТВ */
                    left: 5% !important;
                    margin: 0 !important;
                    display: flex !important;
                    gap: 15px !important;
                    z-index: 10 !important;
                }

                /* Ховаємо сміття */
                .full-start-new__tagline, .full-start-new__details, .full-start-new__status { display: none !important; }
            }
        `;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function renderInfo(movie, $container) {
        $container.find('.plugin-tv-info-block').remove();
        
        var year = (movie.release_date || movie.first_air_date || '').split('-')[0];
        var genres = (movie.genres || []).slice(0, 2).map(g => g.name).join(' • ');
        var runtime = movie.runtime ? Math.floor(movie.runtime / 60) + 'г ' + (movie.runtime % 60) + 'хв' : '';
        
        var html = $(`
            <div class="plugin-tv-info-block">
                <div class="plugin-tv-meta">
                    ${year ? '<span>' + year + '</span>' : ''}
                    ${genres ? '<span>' + genres + '</span>' : ''}
                    ${runtime ? '<span>' + runtime + '</span>' : ''}
                </div>
                <div class="plugin-tv-plot">${movie.overview || ''}</div>
            </div>
        `);

        html.insertAfter($container.find('.full-start-new__title'));
    }

    function loadLogo(movie, $container) {
        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        var $title = $container.find('.full-start-new__title');
        if (!$title.find('img').length) $title.prepend('<img src="" style="opacity:0; transition: opacity 0.4s">');
        var $img = $title.find('img');

        if (logoCache[movieId]) { $img.attr('src', logoCache[movieId]).css('opacity', 1); return; }

        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
            success: function(res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                // Використовуємо англійське лого, якщо українського немає [cite: 2026-02-17]
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
