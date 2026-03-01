(function () {
    'use strict';

    const ICONS = {
        play: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor"/></svg>`,
        book: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        reaction: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="currentColor" stroke-width="2"/></svg>`,
        options: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>`,
        trailer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 6H3C1.9 6 1 6.9 1 8V16C1 17.1 1.9 18 3 18H21C22.1 18 23 17.1 23 16V8C23 6.9 22.1 6 21 6Z" stroke="currentColor" stroke-width="2"/><path d="M10 9L15 12L10 15V9Z" fill="currentColor"/></svg>`
    };

    function initialize() {
        // Додаємо стилі
        if (!$('#apple-style-fix').length) {
            $('body').append(`<style id="apple-style-fix">
                .applecation__body { height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; padding: 0 5% 80px 5%; position: relative; z-index: 10; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%); }
                .applecation__logo img { max-width: 450px; max-height: 180px; object-fit: contain; object-position: left bottom; }
                .applecation__meta { display: flex; align-items: center; gap: 15px; margin: 20px 0; font-size: 1.2em; color: rgba(255,255,255,0.8); }
                .applecation__descr { max-width: 700px; font-size: 1.1em; line-height: 1.5; margin-bottom: 30px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
                .applecation__btns { display: flex; align-items: center; gap: 15px; }
                .apple-btn { background: rgba(255,255,255,0.15); border-radius: 50%; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; color: #fff; }
                .apple-btn.focus { background: #fff; color: #000; transform: scale(1.1); }
                .apple-btn--main { width: auto; padding: 0 35px; border-radius: 12px; font-weight: bold; font-size: 1.1em; }
                /* Приховуємо оригінальні блоки, але залишаємо в DOM */
                .full-start__left, .full-start__right, .full-start__details { display: none !important; }
            </style>`);
        }

        // Оновлений шаблон (всі стандартні класи присутні для сумісності)
        Lampa.Template.add('full_start_new', `
            <div class="full-start-new applecation">
                <div class="applecation__body">
                    <div class="applecation__logo"></div>
                    <div class="full-start-new__title">{title}</div>
                    
                    <div class="applecation__meta">
                        <span class="applecation__year"></span>
                        <span class="applecation__genres"></span>
                        <div class="full-start__pg"></div>
                    </div>

                    <div class="applecation__descr"></div>

                    <div class="applecation__btns">
                        <div class="apple-btn apple-btn--main selector button--play">${ICONS.play} <span>Дивитися</span></div>
                        <div class="apple-btn selector view--trailer">${ICONS.trailer}</div>
                        <div class="apple-btn selector button--book">${ICONS.book}</div>
                        <div class="apple-btn selector button--reaction">${ICONS.reaction}</div>
                        <div class="apple-btn selector button--options">${ICONS.options}</div>
                    </div>

                    <div class="full-start__left"></div>
                    <div class="full-start__right">
                        <div class="full-start__info"></div>
                    </div>
                    <div class="full-start__details"></div>
                </div>
            </div>
        `);

        // Слухач завантаження даних
        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite') {
                const render = e.object.activity.render();
                const data = e.data.movie;

                // Заповнюємо опис
                render.find('.applecation__descr').text(data.overview);
                
                // Рік та жанри
                const year = (data.release_date || data.first_air_date || '').split('-')[0];
                render.find('.applecation__year').text(year);
                render.find('.applecation__genres').text(data.genres?.slice(0, 2).map(g => g.name).join(' · '));

                // Завантаження лого
                const url = Lampa.TMDB.api(`${data.name ? 'tv' : 'movie'}/${data.id}/images?api_key=${Lampa.TMDB.key()}`);
                $.get(url, (res) => {
                    const logotype = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];
                    if (logotype) {
                        render.find('.applecation__logo').html(`<img src="${Lampa.TMDB.image('/t/p/w500' + logotype.file_path)}">`);
                        render.find('.full-start-new__title').hide();
                    }
                });
            }
        });
    }

    if (window.appready) initialize();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initialize(); });
})();
