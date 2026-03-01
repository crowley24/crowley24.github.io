(function () {
    'use strict';

    function addStyles() {
        const styles = `
        <style>
            /* Приховуємо все оригінальне, але НЕ видаляємо з коду */
            .full-start-new__left, 
            .full-start-new__right,
            .full-start-new__title,
            .full-start-new__tagline { 
                opacity: 0 !important; 
                pointer-events: none !important; 
                position: absolute !important;
            }

            /* Наш новий Apple TV інтерфейс поверх усього */
            .apple-style-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100vh;
                background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, transparent 100%);
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                padding: 0 5% 80px 5%;
                z-index: 100;
                pointer-events: none; /* Щоб кнопки під ним працювали */
            }

            .apple-style-content { pointer-events: all; }

            .apple-style-logo {
                margin-bottom: 20px;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.6s ease;
            }
            .apple-style-logo.loaded { opacity: 1; transform: translateY(0); }
            .apple-style-logo img { max-width: 400px; max-height: 140px; object-fit: contain; }

            .apple-style-meta {
                display: flex;
                align-items: center;
                gap: 15px;
                color: #fff;
                font-size: 1.2em;
                margin-bottom: 12px;
            }
            .rate-pill { background: #ffad08; color: #000; padding: 2px 8px; border-radius: 4px; font-weight: 900; }

            .apple-style-desc {
                color: rgba(255, 255, 255, 0.85);
                font-size: 1.1em;
                line-height: 1.6;
                max-width: 650px;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
        </style>`;
        if (!$('style#apple-tv-fix').length) {
            $('body').append($(styles).attr('id', 'apple-tv-fix'));
        }
    }

    function loadData(event) {
        if (!event.data || !event.data.movie) return;

        const data = event.data.movie;
        const render = event.object.activity.render();
        
        // Видаляємо старий оверлей, якщо він був
        render.find('.apple-style-overlay').remove();

        const overlay = $(`
            <div class="apple-style-overlay">
                <div class="apple-style-content">
                    <div class="apple-style-logo"></div>
                    <div class="apple-style-meta"></div>
                    <div class="apple-style-desc"></div>
                </div>
            </div>
        `);

        render.append(overlay);

        // Заповнюємо дані
        const year = (data.release_date || data.first_air_date || '').split('-')[0];
        const rating = data.vote_average ? data.vote_average.toFixed(1) : '';
        const genres = (data.genres || []).slice(0, 2).map(g => g.name).join(' · ');

        overlay.find('.apple-style-meta').html(`
            ${rating > 0 ? `<span class="rate-pill">${rating}</span>` : ''}
            <span>${year}</span>
            ${genres ? `<span>${genres}</span>` : ''}
        `);

        overlay.find('.apple-style-desc').text(data.overview || '');

        // Логотип
        const mediaType = (data.number_of_seasons || data.first_air_date) ? 'tv' : 'movie';
        const apiUrl = Lampa.TMDB.api(`${mediaType}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);

        $.get(apiUrl, (res) => {
            const lang = Lampa.Storage.get('language') || 'uk';
            // Пріоритет: UA -> EN -> Будь-яке [cite: 2026-02-17]
            const bestLogo = (res.logos || []).find(l => l.iso_639_1 === lang) || 
                             (res.logos || []).find(l => l.iso_639_1 === 'en') || 
                             (res.logos ? res.logos[0] : null);

            if (bestLogo) {
                const url = Lampa.TMDB.image(`/t/p/w500${bestLogo.file_path}`);
                overlay.find('.apple-style-logo').html(`<img src="${url}" />`).addClass('loaded');
            } else {
                overlay.find('.apple-style-logo').html(`<h1 style="font-size:2.5em;color:#fff;margin:0">${data.title || data.name}</h1>`).addClass('loaded');
            }
        });
    }

    function init() {
        addStyles();
        
        // Слухаємо подію завантаження картки
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                setTimeout(() => loadData(e), 100);
            }
        });
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') init(); });

})();
