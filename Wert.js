(function() {
    'use strict';

    window.logoplugin = true;

    // ===== СУПЕР-СТИЛІ ДЛЯ ПРИДУШЕННЯ ЛІНІЙ =====
    function injectStyles() {
        if (document.getElementById('lampa-ultimate-fix')) return;
        
        const style = document.createElement('style');
        style.id = 'lampa-ultimate-fix';
        style.textContent = `
            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                50% { transform: scale(1.15); }
                100% { transform: scale(1); }
            }

            @media screen and (max-width: 480px) {
                /* Повний запуск чорного фону */
                .background, .notice-all, .full-start-new__img { 
                    background-color: #000 !important; 
                }

                /* Контейнер постера */
                .full-start__poster, .full-start-new__poster {
                    overflow: hidden !important;
                    position: relative !important;
                    background: #000 !important;
                    height: 60vh !important; /* Обмежуємо висоту для кращого вигляду */
                }

                /* Картинка з анімацією */
                .full-start-new__poster img, .full-start__poster img {
                    filter: none !important;
                    -webkit-filter: none !important;
                    animation: kenBurnsEffect 30s linear infinite !important;
                    display: block !important;
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                }

                /* ФІЗИЧНИЙ ГРАДІЄНТ-КРИШКА (ПРИБИРАЄ ЛІНІЮ) */
                .full-start-new__poster::after {
                    content: '' !important;
                    position: absolute !important;
                    left: 0 !important;
                    bottom: -2px !important; /* Трохи виходимо за край вниз */
                    width: 100% !important;
                    height: 50% !important; /* Перекриваємо нижню половину */
                    background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.9) 80%, #000 100%) !important;
                    z-index: 2 !important;
                }

                /* Контент наповзає на постер */
                .full-start-new__right {
                    margin-top: -150px !important;
                    background: none !important;
                    z-index: 3 !important;
                    position: relative !important;
                }

                .full-start-new__right::before, .full-start-new__right::after {
                    display: none !important;
                }

                /* Центрування всього */
                .full-start-new__title, .full-start-new__tagline, .full-descr__text, .full-start-new__details {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    text-align: center !important;
                    width: 100% !important;
                    flex-direction: column !important;
                }

                .full-start-new__title img {
                    max-height: 110px !important;
                    margin-bottom: 10px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ===== ЛОГІКА ЛОГОТИПІВ =====
    function loadLogo(movie) {
        const type = movie.name ? 'tv' : 'movie';
        const lang = Lampa.Storage.get('language') || 'uk';
        
        const getUrl = (l) => Lampa.TMDB.api(`${type}/${movie.id}/images?api_key=${Lampa.TMDB.key()}&language=${l}`);

        $.get(getUrl(lang), (res) => {
            let logo = res.logos && res.logos[0] ? res.logos[0].file_path : null;
            if (!logo && lang !== 'en') {
                $.get(getUrl('en'), (resEn) => {
                    if (resEn.logos && resEn.logos[0]) renderLogo(resEn.logos[0].file_path);
                });
            } else if (logo) {
                renderLogo(logo);
            }
        });

        function renderLogo(path) {
            const img = Lampa.TMDB.image('/t/p/w300' + path.replace('.svg', '.png'));
            $('.full-start-new__title').html(`<img src="${img}" style="z-index:10; position:relative;">`);
        }
    }

    // ===== СПОСТЕРЕЖЕННЯ ЗА ЗМІНАМИ (ЩОБ СТИЛІ НЕ ЗЛІТАЛИ) =====
    function startObserver() {
        const observer = new MutationObserver(() => {
            if (window.innerWidth <= 480) {
                injectStyles();
                // Примусово вимикаємо блюр в налаштуваннях
                if (window.lampa_settings) window.lampa_settings.blur_poster = false;
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function init() {
        injectStyles();
        startObserver();

        Lampa.Listener.follow('full', (e) => {
            if (e.type === 'complite' && window.innerWidth <= 480) {
                loadLogo(e.data.movie);
                setTimeout(injectStyles, 100);
            }
        });
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') init(); });

})();
