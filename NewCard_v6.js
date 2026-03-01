(function () {
    'use strict';

    var logoCache = {}; 

    function applyStyles() {
        var oldStyle = document.getElementById('lampa-tv-fixed-footer-v9');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'lampa-tv-fixed-footer-v9';
        
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
                    height: 100vh !important;
                    padding: 60px 0 40px 5% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important; /* Розштовхує контент */
                    background: none !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important;
                }

                /* ВЕРХНЯ ЧАСТИНА */
                .plugin-tv-top-group {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    flex-shrink: 0; /* Не даємо верху стискатися */
                }

                .full-start-new__title img {
                    max-height: 130px !important;
                    max-width: 450px !important;
                    filter: drop-shadow(0 0 20px rgba(0,0,0,0.8));
                }

                .plugin-tv-meta {
                    font-size: 1.3rem;
                    display: flex;
                    gap: 15px;
                    color: rgba(255,255,255,0.8);
                }

                /* ЦЕНТРАЛЬНА ЧАСТИНА (ОПИС) */
                .plugin-tv-plot-container {
                    flex-grow: 1; /* Займає вільне місце */
                    margin: 20px 0;
                    overflow-y: auto; /* Дозволяє скрол, якщо тексту забагато */
                    max-height: 25vh; /* Жорсткий ліміт висоти */
                }

                .plugin-tv-plot {
                    font-size: 1.1rem;
                    line-height: 1.5;
                    color: rgba(255,255,255,0.7);
                    max-width: 90%;
                }

                /* НИЖНЯ ЧАСТИНА (КНОПКИ ТА РЕЙТИНГИ) */
                .plugin-tv-bottom-group {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    flex-shrink: 0; /* Цей блок ЗАБОРОНЕНО стискати або виштовхувати */
                    background: none !important;
                }

                .full-start-new__details { 
                    display: flex !important; 
                    background: none !important; 
                    padding: 0 !important;
                }

                .full-start-new__reactions { 
                    margin: 0 !important; 
                    justify-content: flex-start !important; 
                }

                .full-start-new__buttons { 
                    margin: 0 !important; 
                    justify-content: flex-start !important;
                    flex-wrap: wrap !important;
                }

                .full-start-new__tagline, .full-start-new__status { display: none !important; }
                
                /* Стилізація скролбару для опису */
                .plugin-tv-plot-container::-webkit-scrollbar { width: 4px; }
                .plugin-tv-plot-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
            }
        `;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function renderInterface(movie, $container) {
        $container.find('.plugin-tv-top-group, .plugin-tv-plot-container, .plugin-tv-bottom-group').remove();
        
        var year = (movie.release_date || movie.first_air_date || '').split('-')[0];
        var genres = (movie.genres || []).slice(0, 2).map(g => g.name).join(' • ');
        var runtime = movie.runtime ? Math.floor(movie.runtime / 60) + 'г ' + (movie.runtime % 60) + 'хв' : '';
        
        var topGroup = $('<div class="plugin-tv-top-group"></div>');
        var meta = $(`<div class="plugin-tv-meta"><span>${year}</span><span>${genres}</span><span>${runtime}</span></div>`);
        topGroup.append($container.find('.full-start-new__title'), meta);

        var plotContainer = $('<div class="plugin-tv-plot-container"><div class="plugin-tv-plot">' + (movie.overview || '') + '</div></div>');

        var bottomGroup = $('<div class="plugin-tv-bottom-group"></div>');
        bottomGroup.append(
            $container.find('.full-start-new__details'),
            $container.find('.full-start-new__reactions'),
            $container.find('.full-start-new__buttons')
        );

        $container.append(topGroup, plotContainer, bottomGroup);
    }

    function loadLogo(movie, $container) {
        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        var $title = $container.find('.full-start-new__title');
        if (!$title.find('img').length) $title.html('<img src="" style="opacity:0; transition: opacity 0.4s">');
        var $img = $title.find('img');

        if (logoCache[movieId]) { $img.attr('src', logoCache[movieId]).css('opacity', 1); return; }

        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
            success: function(res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                // Пріоритет на українське лого, інакше англійське [cite: 2026-02-17]
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
                renderInterface(movie, $right);
                loadLogo(movie, $right);
            }
        });
    }

    if (window.appready) { applyStyles(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); init(); } });
})();
