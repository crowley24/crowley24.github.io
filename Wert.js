(function() {
    'use strict';

    let observer;
    window.logoplugin = true;

    function log(...args) {
        if (window.logoplugin) console.log('[combined-plugin]', ...args);
    }

    // ===== ОСНОВНІ СТИЛІ З АНІМАЦІЄЮ ТА ІДЕАЛЬНИМ ФОНОМ =====
    function applyBaseStyles() {
        var oldStyle = document.getElementById('no-blur-plugin-styles');
        if (oldStyle) oldStyle.remove();
        
        var style = document.createElement('style');
        style.id = 'no-blur-plugin-styles';
        style.textContent = `
            /* Оголошення анімації наближення */
            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                50% { transform: scale(1.15); }
                100% { transform: scale(1); }
            }

            @media screen and (max-width: 480px) {
                .background {
                    background: #000 !important;
                }
                
                .full-start__poster,
                .full-start-new__poster {
                    position: relative !important;
                    overflow: hidden !important; /* Важливо для зуму, щоб картинка не вилазила за краї */
                    background: #000 !important;
                }
                
                /* Застосовуємо анімацію Ken Burns */
                .full-start-new__poster img,
                .full-start__poster img,
                .screensaver__slides-slide img,
                .full--poster {
                    filter: none !important;
                    -webkit-filter: none !important;
                    
                    /* Повертаємо анімацію */
                    animation: kenBurnsEffect 25s ease-in-out infinite !important;
                    transform-origin: center center !important;

                    /* Твоя ідеальна маска */
                    mask-image: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 1) 0%,
                        rgba(0, 0, 0, 1) 50%,
                        rgba(0, 0, 0, 0.8) 70%,
                        rgba(0, 0, 0, 0.4) 85%,
                        rgba(0, 0, 0, 0) 100%) !important;
                    -webkit-mask-image: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 1) 0%,
                        rgba(0, 0, 0, 1) 50%,
                        rgba(0, 0, 0, 0.8) 70%,
                        rgba(0, 0, 0, 0.4) 85%,
                        rgba(0, 0, 0, 0) 100%) !important;
                }
                
                /* Подвійна маска на контейнер для усунення ліній */
                .full-start-new__img {
                    border-radius: 0 !important;
                    mask-image: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 0) 0%, 
                        rgba(0, 0, 0, 1) 20%, 
                        rgba(0, 0, 0, 1) 80%, 
                        rgba(0, 0, 0, 0) 100%) !important;
                    -webkit-mask-image: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 0) 0%, 
                        rgba(0, 0, 0, 1) 20%, 
                        rgba(0, 0, 0, 1) 80%, 
                        rgba(0, 0, 0, 0) 100%) !important;
                }
                
                .full-start-new__right {
                    background: none !important;
                    border: none !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                    z-index: 2 !important;
                    margin-top: -140px !important; /* Наїзд контенту на постер */
                }

                .full-start-new__right::before, 
                .full-start-new__right::after {
                    display: none !important;
                    content: unset !important;
                }
                
                .full-start-new__title {
                    width: 100% !important;
                    display: flex !important;
                    justify-content: center !important;
                    min-height: 70px !important;
                }
                
                .full-start-new__head {
                    text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.9) !important;
                }
                
                .full-start-new__right, .full-start__left, 
                .full-start-new__buttons, .full-start-new__details, 
                .full-descr__text, .full-start-new__tagline {
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    align-items: center !important;
                    text-align: center !important;
                }
                
                .full-start-new__buttons, .full-start-new__details {
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    gap: 10px !important;
                }
            }
        `;
        document.head.appendChild(style);
        return true;
    }

    // ===== ЛОГІКА ЛОГОТИПІВ =====
    function initLogoPlugin() {
        Lampa.Listener.follow('full', function(e) {
            if (window.innerWidth > 480) return;
            
            if (e.type === 'complite') {
                var data = e.data.movie;
                var type = data.name ? 'tv' : 'movie';
                
                if (data.id) {
                    const lang = Lampa.Storage.get('language');
                    var url = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + lang);
                    
                    $.get(url, function(res) {
                        let logoPath = (res.logos && res.logos[0]) ? res.logos[0].file_path : null;
                        if (!logoPath) {
                            var url_en = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=en');
                            $.get(url_en, function(res_en) {
                                if (res_en.logos && res_en.logos[0]) renderLogo(res_en.logos[0].file_path);
                            });
                        } else {
                            renderLogo(logoPath);
                        }
                    });
                }

                function renderLogo(path) {
                    const logoUrl = Lampa.TMDB.image('/t/p/w300' + path.replace('.svg', '.png'));
                    e.object.activity.render().find('.full-start-new__title').html(
                        '<div style="display: flex; justify-content: center; width: 100%;">' +
                        '<img style="max-height: 110px; object-fit: contain; position: relative; z-index: 10;" src="' + logoUrl + '"/>' +
                        '</div>'
                    );
                }
            }
        });
    }

    function initBlurPlugin() {
        applyBaseStyles();
        setInterval(function() {
            if (window.innerWidth <= 480 && window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
            }
        }, 1000);
    }

    function startPlugin() {
        initBlurPlugin();
        initLogoPlugin();
        setTimeout(applyBaseStyles, 500);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });

})();
