(function () {
    'use strict';

    function initialize() {
        // 1. Додаємо власні стилі для позиціювання
        const styles = `<style>
            /* Контейнер всієї картки */
            .full-start-new.apple-style {
                display: flex;
                flex-direction: column;
                justify-content: flex-end; /* Притискаємо контент до низу */
                align-items: flex-start;   /* Притискаємо до лівого краю */
                height: 100vh;
                padding: 50px 5%;          /* Відступи від країв екрану */
                background: none !important;
            }

            /* Блок з текстом та кнопками */
            .apple-style__content {
                width: 40%;                /* Обмежуємо ширину, щоб текст не розповзався */
                z-index: 10;
                text-align: left;
                text-shadow: 0 2px 10px rgba(0,0,0,0.8); /* Текст буде читабельним на будь-якому фоні */
            }

            .apple-style__title {
                font-size: 3.5em;
                font-weight: bold;
                margin-bottom: 15px;
                line-height: 1.1;
            }

            .apple-style__metadata {
                font-size: 1.2em;
                margin-bottom: 20px;
                color: rgba(255,255,255,0.8);
            }

            .apple-style__description {
                font-size: 1em;
                line-height: 1.5;
                margin-bottom: 30px;
                display: -webkit-box;
                -webkit-line-clamp: 4; /* Обмежуємо опис 4 рядками */
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            /* Стиль кнопок */
            .apple-style__buttons {
                display: flex;
                gap: 15px;
            }

            .apple-style .selector.active {
                background: #fff !important;
                color: #000 !important;
                transform: scale(1.05);
            }
        </style>`;
        $('body').append(styles);

        // 2. Створюємо новий шаблон
        Lampa.Template.add('full_start_new', `
            <div class="full-start-new apple-style">
                <div class="apple-style__content">
                    <div class="apple-style__title">{title}</div>
                    
                    <div class="apple-style__metadata">
                        <span class="apple-metadata__year"></span> · 
                        <span class="apple-metadata__genre"></span>
                    </div>

                    <div class="apple-style__description">{overview}</div>

                    <div class="apple-style__buttons">
                        <div class="full-start__button selector button--play"><span>Дивитися</span></div>
                        <div class="full-start__button selector button--book"><span>Закладки</span></div>
                    </div>
                </div>
            </div>
        `);

        // 3. Слухаємо відкриття картки, щоб заповнити метадані
        Lampa.Listener.follow('full', (event) => {
            if (event.type === 'complite') {
                const data = event.data.movie;
                const render = event.object.activity.render();
                
                // Заповнюємо рік та жанри
                const year = (data.release_date || data.first_air_date || '----').split('-')[0];
                const genres = data.genres ? data.genres.slice(0, 2).map(g => g.name).join(', ') : '';
                
                render.find('.apple-metadata__year').text(year);
                render.find('.apple-metadata__genre').text(genres);
            }
        });
    }

    // Реєстрація плагіна
    if (window.appready) initialize();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') initialize(); });
})();
