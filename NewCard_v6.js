(function () {
    'use strict';

    var logoCache = {}; 

    function applyStyles() {
        var oldStyle = document.getElementById('lampa-fix-ultimate-v10');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'lampa-fix-ultimate-v10';
        
        var css = `
            @media screen and (min-width: 481px) {
                .full-start-new__left { display: none !important; } 

                /* Бекдроп */
                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0;
                    width: 100% !important;
                    height: 100% !important;
                    z-index: 1 !important;
                    mask-image: linear-gradient(to right, #000 0%, #000 35%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, #000 0%, #000 35%, transparent 100%) !important;
                }

                /* Головний контейнер на весь екран */
                .full-start-new__right {
                    position: fixed !important; /* Фіксуємо на екрані */
                    top: 0; left: 0;
                    z-index: 2 !important;
                    width: 55% !important;
                    height: 100vh !important;
                    padding: 40px 0 30px 5% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    background: none !important;
                    box-sizing: border-box !important;
                    overflow: hidden !important; /* Забороняємо загальний скрол */
                }

                /* Верх: Логотип */
                .full-start-new__title { flex-shrink: 0 !important; margin-bottom: 10px !important; }
                .full-start-new__title img {
                    max-height: 130px !important;
                    max-width: 450px !important;
                    filter: drop-shadow(0 0 20px rgba(0,0,0,0.8));
                }

                /* Середина: Мета-дані та Опис (цей блок може стискатися/розтягуватися) */
                .plugin-tv-scrollable {
                    flex-grow: 1 !important;
                    overflow-y: auto !important; /* Дозволяємо скрол тільки тут */
                    margin-bottom: 20px !important;
                    padding-right: 20px;
                }

                .plugin-tv-meta {
                    font-size: 1.3rem;
                    margin-bottom: 10px;
                    display: flex;
                    gap: 15px;
                    color: rgba(255,255,255,0.9);
                }

                .plugin-tv-plot {
                    font-size: 1.15rem;
                    line-height: 1.5;
                    color: rgba(255,255,255,0.7);
                    max-width: 95%;
                }

                /* Низ: Рейтинги + Реакції + Кнопки (ЗАВЖДИ ВИДИМІ) */
                .plugin-tv-footer {
                    flex-shrink: 0 !important; /* Забороняємо блоку зникати */
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    padding-top: 10px;
                    background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
                }

                .full-start-new__details { display: flex !important; background: none !important; padding: 0 !important; margin: 0 !important; }
                .full-start-new__reactions { margin: 0 !important; justify-content: flex-start !important; }
                .full-start-new__buttons { margin: 0 !important; justify-content: flex-start !important; flex-wrap: wrap !important; }

                /* Ховаємо сміття */
                .full-start-new__tagline, .full-start-new__status { display: none !important; }

                /* Тонкий скролбар для тексту */
                .plugin-tv-scrollable::-webkit-scrollbar { width: 4px; }
                .plugin-tv-scrollable::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
            }
        `;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function renderStructure(movie, $container) {
        $container.find('.plugin-tv-scrollable, .plugin-tv-footer').remove();
        
        var year = (movie.release_date || movie.first_air_date || '').split('-')[0];
        var genres = (movie.genres || []).slice(0, 2).map(g => g.name).join(' • ');
        var runtime = movie.runtime ? Math.floor(movie.runtime / 60) + 'г ' + (movie.runtime % 60) + 'хв' : '';
        
        // Створюємо зону скролу
        var scrollable = $('<div class="plugin-tv-scrollable"></div>');
        var meta = $(`<div class="plugin-tv-meta"><span>${year}</span><span>${genres}</span><span>${runtime}</span></div>`);
        var plot = $(`<div class="plugin-tv-plot">${movie.overview || ''}</div>`);
        scrollable.append(meta, plot);

        // Створюємо зону кнопок
        var footer = $('<div class="plugin-tv-footer"></div>');
        footer.append(
            $container.find('.full-start-new__details'),
            $container.find('.full-start-new__reactions'),
            $container.find('.full-start-new__buttons')
        );

        $container.append($container.find('.full-start-new__title'), scrollable, footer);
    }

    function loadLogo(movie, $container) {
        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        var $title = $container.find('.full-start-new__title');
        if (!$title.find('img').length) $title.html('<img src="" style="opacity:0; transition: opacity 0.4s">');
        
        if (logoCache[movieId]) { $title.find('img').attr('src', logoCache[movieId]).css('opacity', 1); return; }

        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
            success: function(res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                // Використовуємо англійське лого, якщо немає українського [cite: 2026-02-17]
                var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                if (logo) {
                    var url = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                    logoCache[movieId] = url;
                    $title.find('img').attr('src', url).css('opacity', 1);
                }
            }
        });
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth > 480 && (e.type === 'complite' || e.type === 'complete')) {
                var $right = e.object.activity.render().find('.full-start-new__right');
                renderStructure(e.data.movie, $right);
                loadLogo(e.data.movie, $right);
            }
        });
    }

    if (window.appready) { applyStyles(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); init(); } });
})();
