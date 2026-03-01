(function () {
    'use strict';

    var logoCache = {};
    var pluginPath = 'https://crowley24.github.io/NewIcons/';

    // Налаштування (можна розширити)
    var settings_list = [
        { id: 'tv_interface_logo_size', default: '250' },
        { id: 'tv_interface_show_studios', default: true }
    ];

    /**
     * СТИЛІ ДЛЯ ТВ ТА ПК
     */
    function applyStyles() {
        var oldStyle = document.getElementById('tv-interface-styles');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var lHeight = Lampa.Storage.get('tv_interface_logo_size', '250');

        var style = document.createElement('style');
        style.id = 'tv-interface-styles';
        
        var css = `
            /* Вимикаємо стандартні елементи, які нам заважають */
            .full-start-new__details, .full-start__info { display: none !important; }

            @media screen and (min-width: 481px) {
                /* Контейнер всієї сторінки фільму */
                .full-start-new {
                    display: flex !important;
                    flex-direction: row-reverse !important; /* Постер справа, інфо зліва */
                    height: 100vh !important;
                    background: #141414 !important;
                }

                /* Фон з картинкою (права частина) */
                .full-start-new__poster {
                    flex: 1 1 60% !important;
                    height: 100% !important;
                    position: relative !important;
                    mask-image: linear-gradient(to left, #000 70%, transparent 100%) !important;
                    -webkit-mask-image: linear-gradient(to left, #000 70%, transparent 100%) !important;
                }

                /* Блок з описом (ліва частина) */
                .full-start-new__right {
                    flex: 1 1 40% !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    align-items: flex-start !important;
                    padding: 0 5% !important;
                    z-index: 10 !important;
                    background: none !important;
                    margin: 0 !important;
                }

                /* Логотип фільму */
                .full-start-new__title {
                    width: 100% !important;
                    text-align: left !important;
                    margin-bottom: 20px !important;
                }

                .full-start-new__title img {
                    max-height: ${lHeight}px !important;
                    max-width: 100% !important;
                    object-fit: contain !important;
                    filter: drop-shadow(0 0 20px rgba(0,0,0,0.5));
                }

                /* Рейтинги та мета-дані */
                .plugin-ratings-row {
                    display: flex;
                    gap: 20px;
                    font-size: 1.4em;
                    margin-bottom: 20px;
                }

                /* Студії в ряд */
                .studio-row {
                    display: flex;
                    gap: 15px;
                    margin-top: 20px;
                    flex-wrap: wrap;
                }

                .studio-item {
                    height: 40px;
                    background: rgba(255,255,255,0.1);
                    padding: 5px 15px;
                    border-radius: 8px;
                }

                .studio-item img { height: 100%; }
            }
        `;

        style.textContent = css;
        document.head.appendChild(style);
    }

    // Тут ми можемо перевикористати твої функції loadMovieLogo та renderRatings
    // з попереднього плагіна, просто змінивши цільові класи.

    function startPlugin() {
        applyStyles();
        // Ініціалізація логіки (Lampa.Listener.follow('full', ...))
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });

})();
