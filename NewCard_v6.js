(function () {
    'use strict';

    var logoCache = {};

    function initialize() {
        addCustomTemplate();
        addStyles();
        attachListeners();
    }

    function addCustomTemplate() {
        // Повністю замінюємо стандартний шаблон Lampa на структуру Apple TV
        var template = `
        <div class="full-start-new apple-style">
            <div class="apple-style__body">
                <div class="apple-style__content">
                    <div class="apple-style__logo-block">
                        <div class="apple-style__logo"></div>
                        <div class="full-start-new__title" style="display: none;">{title}</div>
                    </div>

                    <div class="apple-style__meta">
                        <span class="apple-style__rating"></span>
                        <span class="apple-style__info"></span>
                    </div>

                    <div class="apple-style__description">
                        <div class="apple-style__plot"></div>
                    </div>

                    <div class="full-start-new__buttons apple-style__buttons">
                        </div>
                </div>
            </div>
        </div>`;
        Lampa.Template.add('full_start_new', template);
    }

    function addStyles() {
        var style = `
        <style>
            .apple-style__body {
                position: relative;
                height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: flex-end; /* Все концентрується внизу */
                padding: 0 5% 60px 5%;
                background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, transparent 100%);
                z-index: 2;
                box-sizing: border-box;
            }

            .apple-style__content {
                display: flex;
                flex-direction: column;
                gap: 15px;
                max-width: 800px;
            }

            .apple-style__logo img {
                max-width: 450px;
                max-height: 160px;
                object-fit: contain;
                object-position: left bottom;
                filter: drop-shadow(0 0 15px rgba(0,0,0,0.5));
            }

            .apple-style__meta {
                display: flex;
                align-items: center;
                gap: 15px;
                font-size: 1.3rem;
                font-weight: 500;
                color: #fff;
            }

            .apple-style__rating {
                background: #ffad08;
                color: #000;
                padding: 2px 8px;
                border-radius: 4px;
                font-weight: 900;
            }

            .apple-style__info { color: rgba(255,255,255,0.8); }

            .apple-style__plot {
                font-size: 1.15rem;
                line-height: 1.5;
                color: rgba(255,255,255,0.7);
                display: -webkit-box;
                -webkit-line-clamp: 3; /* Строго 3 рядки */
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .apple-style__buttons {
                display: flex !important;
                flex-wrap: wrap;
                gap: 15px !important;
                margin: 10px 0 0 0 !important;
                justify-content: flex-start !important;
            }

            /* Стиль основної кнопки */
            .apple-style .full-start__button {
                background: rgba(255,255,255,0.1) !important;
                border: none !important;
                border-radius: 10px !important;
                padding: 12px 25px !important;
                transition: all 0.3s ease;
            }

            .apple-style .full-start__button.focus {
                background: #fff !important;
                color: #000 !important;
                transform: scale(1.05);
            }

            /* Прибираємо стандартний фон Lampa, щоб не заважав нашому */
            .full-start-new__right { background: none !important; }
        </style>`;
        $('body').append(style);
    }

    function loadData(event) {
        var data = event.data.movie;
        var render = event.object.activity.render();
        if (!data) return;

        // Наповнюємо мета-дані
        var year = (data.release_date || data.first_air_date || '').split('-')[0];
        var genres = data.genres ? data.genres.slice(0, 2).map(g => g.name).join(' · ') : '';
        var runtime = data.runtime ? Math.floor(data.runtime / 60) + 'г ' + (data.runtime % 60) + 'хв' : '';
        
        render.find('.apple-style__info').text(`${year}  ·  ${genres}  ·  ${runtime}`);
        render.find('.apple-style__plot').text(data.overview);
        
        if (data.vote_average) {
            render.find('.apple-style__rating').text(data.vote_average.toFixed(1));
        } else {
            render.find('.apple-style__rating').hide();
        }

        // Завантаження логотипу
        var movieId = data.id + (data.name ? '_tv' : '_movie');
        if (logoCache[movieId]) {
            render.find('.apple-style__logo').html(`<img src="${logoCache[movieId]}">`);
        } else {
            $.ajax({
                url: Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key()),
                success: function (res) {
                    var lang = Lampa.Storage.get('language') || 'uk';
                    // Пріоритет: UK -> EN -> Будь-яке [cite: 2026-02-17]
                    var best = res.logos.find(l => l.iso_639_1 === lang) || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                    if (best) {
                        var url = Lampa.TMDB.image('/t/p/w500' + best.file_path);
                        logoCache[movieId] = url;
                        render.find('.apple-style__logo').html(`<img src="${url}">`);
                    } else {
                        render.find('.full-start-new__title').show();
                    }
                }
            });
        }
    }

    function attachListeners() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' || e.type === 'complete') {
                // Невеликий таймаут, щоб DOM встиг перемалюватися
                setTimeout(function() { loadData(e); }, 10);
            }
        });
    }

    if (window.appready) initialize();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') initialize(); });

})();
