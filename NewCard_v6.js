(function () {
    'use strict';

    var logoCache = {}; 

    function applyStyles() {
        var oldStyle = document.getElementById('lampa-ultimate-cleanup-v11');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'lampa-ultimate-cleanup-v11';
        
        var css = `
            @media screen and (min-width: 481px) {
                /* Приховуємо все стандартне, що створює кашу */
                .full-start-new__left, 
                .full-start-new__tagline, 
                .full-start-new__details, 
                .full-start-new__status,
                .full-start-new__description { display: none !important; }

                .full-start-new__poster {
                    position: absolute !important;
                    top: 0; right: 0; bottom: 0;
                    width: 100% !important;
                    z-index: 1 !important;
                    mask-image: linear-gradient(to right, #000 0%, #000 30%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to right, #000 0%, #000 30%, transparent 100%) !important;
                }

                .full-start-new__right {
                    position: relative;
                    z-index: 2 !important;
                    width: 50% !important;
                    height: 100vh !important;
                    padding: 50px 0 40px 5% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                    background: none !important;
                    box-sizing: border-box !important;
                }

                /* Наші нові блоки */
                .custom-header { display: flex; flex-direction: column; gap: 15px; }
                .custom-title img { max-height: 140px; max-width: 450px; filter: drop-shadow(0 0 20px rgba(0,0,0,0.8)); }
                
                .custom-meta { font-size: 1.3rem; display: flex; gap: 15px; color: rgba(255,255,255,0.8); }
                
                .custom-plot { 
                    font-size: 1.1rem; 
                    line-height: 1.5; 
                    color: rgba(255,255,255,0.6); 
                    max-width: 90%;
                    display: -webkit-box;
                    -webkit-line-clamp: 4;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .custom-footer { display: flex; flex-direction: column; gap: 15px; }
                
                /* Кнопки та реакції витягуємо зі стандартних, але стилізуємо */
                .full-start-new__buttons, .full-start-new__reactions { 
                    display: flex !important; 
                    margin: 0 !important; 
                    justify-content: flex-start !important; 
                }
            }
        `;
        style.textContent = css;
        document.head.appendChild(style);
    }

    function renderClean(movie, $container) {
        // 1. Повністю очищуємо контейнер від усього, що ми могли додати раніше
        $container.find('.custom-header, .custom-footer').remove();
        
        // 2. Тимчасово ховаємо оригінальні кнопки, щоб перемістити їх пізніше
        var $btns = $container.find('.full-start-new__buttons');
        var $reacts = $container.find('.full-start-new__reactions');
        var $details = $container.find('.full-start-new__details').clone().show(); // Для рейтингів

        var year = (movie.release_date || movie.first_air_date || '').split('-')[0];
        var genres = (movie.genres || []).slice(0, 2).map(g => g.name).join(' • ');
        var runtime = movie.runtime ? Math.floor(movie.runtime / 60) + 'г ' + (movie.runtime % 60) + 'хв' : '';

        // 3. Будуємо нову структуру
        var header = $(`
            <div class="custom-header">
                <div class="custom-title"></div>
                <div class="custom-meta"><span>${year}</span><span>${genres}</span><span>${runtime}</span></div>
                <div class="custom-plot">${movie.overview || ''}</div>
            </div>
        `);

        var footer = $('<div class="custom-footer"></div>');
        
        // Переміщуємо існуючі елементи Lampa в наш новий футер
        footer.append($details, $reacts, $btns);

        // 4. Вставляємо все в контейнер
        $container.empty().append(header, footer);
        
        loadLogo(movie, $container.find('.custom-title'));
    }

    function loadLogo(movie, $titleContainer) {
        var movieId = movie.id + (movie.name ? '_tv' : '_movie');
        if (logoCache[movieId]) {
            $titleContainer.html(`<img src="${logoCache[movieId]}" style="opacity:1">`);
            return;
        }

        $.ajax({
            url: 'https://api.themoviedb.org/3/' + (movie.name ? 'tv' : 'movie') + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key(),
            success: function(res) {
                var lang = Lampa.Storage.get('language') || 'uk';
                // Використовуємо англійське лого, якщо українського немає [cite: 2026-02-17]
                var logo = res.logos.filter(l => l.iso_639_1 === lang)[0] || res.logos.filter(l => l.iso_639_1 === 'en')[0] || res.logos[0];
                if (logo) {
                    var url = Lampa.TMDB.image('/t/p/w500' + logo.file_path.replace('.svg', '.png'));
                    logoCache[movieId] = url;
                    $titleContainer.html(`<img src="${url}" style="opacity:1">`);
                }
            }
        });
    }

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (window.innerWidth > 480 && (e.type === 'complite' || e.type === 'complete')) {
                var $right = e.object.activity.render().find('.full-start-new__right');
                renderClean(e.data.movie, $right);
            }
        });
    }

    if (window.appready) { applyStyles(); init(); }
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { applyStyles(); init(); } });
})();
