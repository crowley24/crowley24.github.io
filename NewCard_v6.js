(function () {
    'use strict';

    function addStyles() {
        const styles = `
        <style>
            .full-start-new, .full-start-new__right, .full-start-new__details {
                background: none !important;
                background-color: transparent !important;
                box-shadow: none !important;
            }
            .full-start-new__left, .full-start-new__title, .full-start-new__tagline { display: none !important; }

            .applecation {
                background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%) !important;
                height: 100vh !important;
            }

            .applecation .full-start-new__right {
                display: flex !important;
                align-items: flex-end !important;
                padding: 0 5% 80px 5% !important;
                height: 100vh !important;
            }

            .applecation__logo {
                margin-bottom: 20px;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            .applecation__logo.loaded { opacity: 1; transform: translateY(0); }
            .applecation__logo img {
                max-width: 400px;
                max-height: 140px;
                object-fit: contain;
                filter: drop-shadow(0 0 20px rgba(0,0,0,0.5));
            }

            .applecation__meta {
                display: flex;
                align-items: center;
                gap: 15px;
                color: #fff;
                font-size: 1.2em;
                margin-bottom: 12px;
                font-weight: 500;
            }
            .rate-pill {
                background: #ffad08;
                color: #000;
                padding: 2px 8px;
                border-radius: 4px;
                font-weight: 900;
            }

            .applecation__description {
                color: rgba(255, 255, 255, 0.85);
                font-size: 1.1em;
                line-height: 1.6;
                margin-bottom: 30px;
                max-width: 650px;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }

            .full-start-new__buttons { display: flex !important; gap: 15px !important; }
            .full-start-new__buttons .full-start__button {
                background: rgba(255,255,255,0.1) !important;
                border: none !important;
                border-radius: 10px !important;
                backdrop-filter: blur(10px);
                padding: 14px 28px !important;
                display: flex !important;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease !important;
            }
            .full-start-new__buttons .full-start__button.focus {
                background: #fff !important;
                color: #000 !important;
                transform: scale(1.05) !important;
            }
        </style>`;
        $('body').append(styles);
    }

    function selectBestLogo(logos) {
        const lang = Lampa.Storage.get('language') || 'uk';
        // Використовуємо англійське лого, якщо українського немає [cite: 2026-02-17]
        return (logos || []).find(l => l.iso_639_1 === lang) || (logos || []).find(l => l.iso_639_1 === 'en') || (logos ? logos[0] : null);
    }

    function loadData(event) {
        // Додано перевірку, щоб уникнути помилки "undefined"
        if (!event.data || !event.data.movie) return;

        const data = event.data.movie;
        const render = event.object.activity.render();
        
        const logoContainer = render.find('.applecation__logo');
        const metaContainer = render.find('.applecation__meta');
        const descContainer = render.find('.applecation__description');

        // Мета-дані
        const year = (data.release_date || data.first_air_date || '').split('-')[0];
        const rating = data.vote_average ? data.vote_average.toFixed(1) : '';
        const genres = (data.genres || []).slice(0, 2).map(g => g.name).join(' · ');

        metaContainer.html(`
            ${rating > 0 ? `<span class="rate-pill">${rating}</span>` : ''}
            <span>${year}</span>
            ${genres ? `<span>${genres}</span>` : ''}
        `);

        descContainer.text(data.overview || '');

        // Логотип через TMDB
        const mediaType = (data.number_of_seasons || data.first_air_date) ? 'tv' : 'movie';
        const apiUrl = Lampa.TMDB.api(`${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);

        $.get(apiUrl, (res) => {
            const bestLogo = selectBestLogo(res.logos);
            if (bestLogo) {
                const url = Lampa.TMDB.image(`/t/p/w500${bestLogo.file_path}`);
                logoContainer.html(`<img src="${url}" />`).addClass('loaded');
            } else {
                logoContainer.html(`<h1 style="font-size:2.5em;margin:0;color:#fff">${data.title || data.name}</h1>`).addClass('loaded');
            }
        }).fail(() => {
            logoContainer.html(`<h1 style="font-size:2.5em;margin:0;color:#fff">${data.title || data.name}</h1>`).addClass('loaded');
        });
    }

    function init() {
        // Оновлений шаблон
        Lampa.Template.add('full_start_new', `
            <div class="full-start-new applecation">
                <div class="full-start-new__right">
                    <div class="applecation__content">
                        <div class="applecation__logo"></div>
                        <div class="applecation__meta"></div>
                        <div class="applecation__description"></div>
                        <div class="full-start-new__buttons">
                            <div class="full-start__button selector button--play"><span>#{title_watch}</span></div>
                            <div class="full-start__button selector button--book"><span>#{title_add_to_favorite}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        addStyles();

        // Використовуємо 'complite' для безпечного заповнення даних після рендеру
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                setTimeout(() => loadData(e), 10);
            }
        });
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') init(); });

})();
