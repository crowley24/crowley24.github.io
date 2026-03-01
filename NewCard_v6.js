(function () {
    'use strict';

    var logoCache = {}; 

    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles-v5');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'tv-interface-styles-v5';
        
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
                    width: 50% !important;
                    padding: 60px 0 40px 5% !important; /* Відступи зверху та знизу */
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important; /* Кнопки вниз, лого вгору */
                    height: 100vh !important;
                    background: none !important;
                    box-sizing: border-box !important;
                }

                /* Контейнер для лого та тексту */
                .plugin-tv-header-group {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .full-start-new__title {
                    font-size: 0 !important;
                    margin: 0 !important;
                }
                .full-start-new__title img {
                    max-height: 150px !important;
                    max-width: 450px !important;
                    filter: drop-shadow(0 0 20px rgba(0,0,0,0.8));
                }

                .plugin-tv-meta {
                    font-size: 1.3rem;
                    font-weight: 500;
                    color: rgba(255,255,255,0.8);
                    display: flex;
                    gap: 15px;
                }

                .plugin-tv-plot {
                    font-size: 1.15rem;
                    line-height: 1.4;
                    color: rgba(255,255,255,0.7);
                    max-width: 90%;
                    display: -webkit-box;
                    -webkit-line-clamp: 3; /* Строго 3 рядки, щоб не тиснути на кнопки */
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    margin-top: 10px;
                }

                /* Кнопки ЗАВЖДИ в самому низу */
                .full-start-new__buttons {
                    margin: 0 !important;
                    padding: 0 !important;
                    justify-content: flex-start !important;
                }

                .full-start-new__tagline, .full-start-new__details, .full-start-new__status { display: none !important; }
            }
        `;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function renderContent(movie, $container) {
        $container.find('.plugin-tv-header-group').remove();
        
        var year = (movie.release_date || movie.first_air_date || '').split('-')[0];
        var genres = (movie.genres || []).slice(0, 2).map(g => g.name).join(' • ');
        var runtime = movie.runtime ? Math.floor(movie.runtime / 60) + 'г ' + (movie.runtime % 60) + 'хв' : '';
        
        var group = $(`
            <div class="plugin-tv-header-group">
                <div class="plugin-tv-meta">
                    ${year ? '<span>' + year + '</span>' : ''}
                    ${genres ? '<span>' + genres + '</span>' : ''}
                    ${runtime ? '<span>' + runtime + '</span>' : ''}
                </div>
                <div class="plugin-tv-plot">${movie.overview || ''}</div>
            </div>
        `);

        // Вставляємо групу ПІСЛЯ логотипу (титулу)
        group.insertAfter($container.find('.full-start-new__title'));
    }

    function loadLogo(movie, $container) {
        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        var $title = $container.find('.full-start-new__title');
        
        if (!$title.find('img').length) $title.prepend('<img src="" style="opacity:0; transition: opacity 0.5s">');
        var $img = $title.find('img');

        if (logoCache[movieId]) { $img.attr('src', logoCache[movieId]).css('opacity', 1); return; }

        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
            success: function(res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                // Використовуємо англійське лого, якщо немає українського [cite: 2026-02-17]
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
                
                renderContent(movie, $right);
                loadLogo(movie, $right);
            }
        });
    }

    if (window.appready) { applyStyles(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); init(); } });
})();
