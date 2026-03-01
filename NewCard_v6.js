(function () {
    'use strict';

    let logoCache = new Map();

    function addStyles() {
        const styles = `
        <style>
            /* 1. ОЧИЩЕННЯ СТАНДАРТУ */
            .full-start-new, .full-start-new__right, .full-start-new__details {
                background: none !important;
                background-color: transparent !important;
                box-shadow: none !important;
            }
            .full-start-new__left, .full-start-new__title, .full-start-new__tagline { display: none !important; }

            /* 2. ГОЛОВНИЙ ЕКРАН */
            .applecation {
                background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 40%, transparent 100%) !important;
                height: 100vh !important;
            }

            .applecation .full-start-new__right {
                display: flex !important;
                align-items: flex-end !important;
                padding: 0 5% 60px 5% !important;
                height: 100vh !important;
            }

            /* 3. ЛОГОТИП */
            .applecation__logo {
                margin-bottom: 15px;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.6s ease;
            }
            .applecation__logo.loaded { opacity: 1; transform: translateY(0); }
            .applecation__logo img {
                max-width: 450px;
                max-height: 150px;
                object-fit: contain;
                filter: drop-shadow(0 0 15px rgba(0,0,0,0.7));
            }

            /* 4. МЕТА-ДАНІ ТА РЕЙТИНГ */
            .applecation__meta {
                display: flex;
                align-items: center;
                gap: 15px;
                color: #fff;
                font-size: 1.3em;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.8);
            }
            .rate-pill {
                background: #ffad08;
                color: #000;
                padding: 2px 10px;
                border-radius: 6px;
                font-weight: 900;
            }

            /* 5. ОПИС (Apple Style) */
            .applecation__description {
                color: rgba(255, 255, 255, 0.8);
                font-size: 1.15em;
                line-height: 1.5;
                margin-bottom: 25px;
                max-width: 750px;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            /* 6. КНОПКИ */
            .full-start-new__buttons { display: flex !important; gap: 15px !important; margin-top: 20px !important; }
            .full-start-new__buttons .full-start__button {
                background: rgba(255,255,255,0.12) !important;
                border: none !important;
                border-radius: 12px !important;
                backdrop-filter: blur(15px);
                padding: 12px 25px !important;
                height: auto !important;
                transition: all 0.2s ease !important;
            }
            .full-start-new__buttons .full-start__button.focus {
                background: #fff !important;
                color: #000 !important;
                transform: scale(1.08) !important;
            }
        </style>`;
        $('body').append(styles);
    }

    function selectBestLogo(logos) {
        const lang = Lampa.Storage.get('language') || 'uk';
        // Пріоритет: UA -> EN -> Будь-яке [cite: 2026-02-17]
        return logos.find(l => l.iso_639_1 === lang) || logos.find(l => l.iso_639_1 === 'en') || logos[0];
    }

    function loadData(event) {
        const data = event.data.movie;
        const render = event.object.activity.render();
        const logoContainer = render.find('.applecation__logo');
        const metaContainer = render.find('.applecation__meta');
        const descContainer = render.find('.applecation__description');

        // Заповнюємо мета
        const year = (data.release_date || data.first_air_date || '').split('-')[0];
        const rating = data.vote_average ? data.vote_average.toFixed(1) : '';
        const genres = (data.genres || []).slice(0, 2).map(g => g.name).join(' · ');

        metaContainer.html(`
            ${rating ? `<span class="rate-pill">${rating}</span>` : ''}
            <span>${year}</span>
            <span>${genres}</span>
        `);

        descContainer.text(data.overview);

        // Завантажуємо лого
        const mediaType = data.name ? 'tv' : 'movie';
        const apiUrl = Lampa.TMDB.api(`${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);

        $.get(apiUrl, (res) => {
            const bestLogo = selectBestLogo(res.logos);
            if (bestLogo) {
                const url = Lampa.TMDB.image(`/t/p/w500${bestLogo.file_path}`);
                logoContainer.html(`<img src="${url}" />`).addClass('loaded');
            } else {
                logoContainer.html(`<h1 style="font-size:3em;margin:0">${data.title || data.name}</h1>`).addClass('loaded');
            }
        });
    }

    function init() {
        Lampa.Template.add('full_start_new', `
            <div class="full-start-new applecation">
                <div class="full-start-new__right">
                    <div class="applecation__content">
                        <div class="applecation__logo"></div>
                        <div class="applecation__meta"></div>
                        <div class="applecation__description"></div>
                        <div class="full-start-new__buttons">
                            <div class="full-start__button selector button--play"><span>#{title_watch}</span></div>
                            <div class="full-start__button selector button--book"><span>#{settings_input_links}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        addStyles();

        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') loadData(e);
        });
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') init(); });

})();
