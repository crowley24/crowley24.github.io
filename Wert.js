(function() {
    'use strict';

    let observer;
    window.logoplugin = true;

    function log(...args) {
        if (window.logoplugin) console.log('[combined-plugin]', ...args);
    }

    // ===== ОСНОВНІ СТИЛІ, АНІМАЦІЯ ТА ГРАДІЄНТ =====
    function applyBaseStyles() {
        var oldStyle = document.getElementById('no-blur-plugin-styles');
        if (oldStyle) oldStyle.remove();
        
        var style = document.createElement('style');
        style.id = 'no-blur-plugin-styles';
        style.textContent = `
            /* Анімація наближення */
            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                50% { transform: scale(1.12); }
                100% { transform: scale(1); }
            }

            @media screen and (max-width: 480px) {
                .full-start__poster,
                .full-start-new__poster,
                .screensaver__slides-slide {
                    overflow: hidden !important;
                    background: #000 !important;
                }

                .full-start__poster img,
                .full-start-new__poster img,
                .screensaver__slides-slide img,
                .screensaver__bg,
                .card--collection .card__img {
                    filter: none !important;
                    -webkit-filter: none !important;
                    /* Додаємо ефект приближення */
                    animation: kenBurnsEffect 25s ease-in-out infinite !important;
                    transform-origin: center center !important;
                }
                
                .background {
                    background: #000 !important;
                }
                
                .full-start-new__right {
                    background: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    z-index: 2 !important;
                }

                /* Робимо перехід (градієнт) максимально м'яким */
                .full-start-new__poster img,
                .full--poster {
                    mask-image: linear-gradient(to bottom, 
                        rgba(0,0,0,1) 0%, 
                        rgba(0,0,0,1) 40%, 
                        rgba(0,0,0,0.6) 70%, 
                        rgba(0,0,0,0) 100%) !important;
                    -webkit-mask-image: linear-gradient(to bottom, 
                        rgba(0,0,0,1) 0%, 
                        rgba(0,0,0,1) 40%, 
                        rgba(0,0,0,0.6) 70%, 
                        rgba(0,0,0,0) 100%) !important;
                }
                
                .full-start-new__title {
                    position: relative !important;
                    width: 100% !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    min-height: 80px !important;
                    margin: 10px auto !important;
                }
                
                .full-start-new__head {
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9) !important;
                }
                
                .full-start-new__right, .full-start__left, .full-descr__text, 
                .full-start-new__title, .full-start-new__tagline {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    text-align: center !important;
                }

                .full-start-new__buttons, .full-start-new__details {
                    justify-content: center !important;
                }
            }
        `;
        document.head.appendChild(style);
        return true;
    }

    // ===== РОБОТА З ЛОГОТИПАМИ (UA -> EN) =====
    function loadLogo(type, id, callback) {
        const userLang = Lampa.Storage.get('language') || 'uk';
        const urls = [
            Lampa.TMDB.api(type + '/' + id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + userLang),
            Lampa.TMDB.api(type + '/' + id + '/images?api_key=' + Lampa.TMDB.key() + '&language=en'),
            Lampa.TMDB.api(type + '/' + id + '/images?api_key=' + Lampa.TMDB.key()) // без мови як останній шанс
        ];

        let attempt = (index) => {
            if (index >= urls.length) return;
            $.get(urls[index], function(data) {
                if (data.logos && data.logos.length > 0) {
                    callback(data.logos[0].file_path);
                } else {
                    attempt(index + 1);
                }
            }).fail(() => attempt(index + 1));
        };
        attempt(0);
    }

    function initLogoPlugin() {
        Lampa.Listener.follow('full', function(e) {
            if (window.innerWidth > 480) return;
            if (e.type === 'complite') {
                var data = e.data.movie;
                var type = data.name ? 'tv' : 'movie';
                if (data.id) {
                    loadLogo(type, data.id, function(path) {
                        const imgUrl = Lampa.TMDB.image('/t/p/w300' + path.replace('.svg', '.png'));
                        e.object.activity.render().find('.full-start-new__title').html(
                            '<div style="display: flex; justify-content: center; width: 100%;">' +
                            '<img style="max-height: 120px; object-fit: contain;" src="' + imgUrl + '"/>' +
                            '</div>'
                        );
                    });
                }
            }
        });
    }

    // ===== РЕШТА ФУНКЦІЙ =====
    function initBlurPlugin() {
        applyBaseStyles();
        setInterval(function() {
            if (window.innerWidth <= 480 && window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
            }
        }, 1500);
    }

    function applyMobileStyles() {
        if (window.innerWidth > 480) return;
        const sectionTitles = ['Рекомендации','Режиссер','Актеры','Подробно','Похожие','Коллекция'];
        document.querySelectorAll('.items-line__head').forEach(element => {
            const text = element.textContent.trim();
            if (text && (sectionTitles.includes(text) || text.includes('Сезон'))) {
                element.style.cssText = 'display:flex; justify-content:center; width:100%;';
            }
        });
    }

    function initAllPlugins() {
        initBlurPlugin();
        initLogoPlugin();
        // Виклик стилів заголовків
        applyMobileStyles();
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'full') {
                setTimeout(applyMobileStyles, 100);
                applyBaseStyles();
            }
        });
    }

    function startPlugin() {
        if (window.appready) initAllPlugins();
        else {
            Lampa.Listener.follow('app', function(e) {
                if (e.type === 'ready') setTimeout(initAllPlugins, 500);
            });
        }
    }

    if (typeof Lampa.Timer !== 'undefined') Lampa.Timer.add(500, startPlugin, true);
    else setTimeout(startPlugin, 500);

})();
