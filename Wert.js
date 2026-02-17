(function() {
    'use strict';

    let observer;
    window.logoplugin = true;

    function log(...args) {
        if (window.logoplugin) console.log('[combined-plugin]', ...args);
    }

    function applyBaseStyles() {
        var oldStyle = document.getElementById('no-blur-plugin-styles');
        if (oldStyle) oldStyle.remove();
        
        var style = document.createElement('style');
        style.id = 'no-blur-plugin-styles';
        style.textContent = `
            /* Додаємо анімацію */
            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                50% { transform: scale(1.15); }
                100% { transform: scale(1); }
            }

            @media screen and (max-width: 480px) {
                .full-start__poster,
                .full-start-new__poster,
                .full-start__poster img,
                .full-start-new__poster img,
                .screensaver__slides-slide img,
                .screensaver__bg,
                .card--collection .card__img {
                    filter: none !important;
                    -webkit-filter: none !important;
                }
                
                .background {
                    background: #000 !important;
                }
                
                .full-start-new__right {
                    background: none !important;
                    border: none !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                    outline: none !important;
                    z-index: 2 !important;
                }

                .full-start-new__right::before, 
                .full-start-new__right::after {
                    background: none !important;
                    box-shadow: none !important;
                    border: none !important;
                    content: unset !important;
                }
                
                .full-start-new__poster {
                    position: relative !important;
                    overflow: visible !important; /* Важливо для безшовного фону */
                }
                
                /* АНІМАЦІЯ ТУТ + ТВОЯ МАСКА */
                .full-start-new__poster img,
                .full--poster {
                    /* Вмикаємо анімацію */
                    animation: kenBurnsEffect 30s ease-in-out infinite !important;
                    transform-origin: center center !important;
                    
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
                
                /* ТВОЯ ДОДАТКОВА МАСКА КОНТЕЙНЕРА (ЦЕ ТЕ, ЩО ПРИБИРАЄ ЛІНІЮ) */
                .full-start-new__img {
                    border-radius: 0 !important;
                    mask-image: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 0) 0%,
                        rgba(0, 0, 0, 1) 30%,
                        rgba(0, 0, 0, 1) 70%,
                        rgba(0, 0, 0, 0) 100%) !important;
                    -webkit-mask-image: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 0) 0%,
                        rgba(0, 0, 0, 1) 30%,
                        rgba(0, 0, 0, 1) 70%,
                        rgba(0, 0, 0, 0) 100%) !important;
                }
                
                .full-start-new__title {
                    position: relative !important;
                    width: 100% !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    min-height: 70px !important;
                    margin: 0 auto !important;
                }
                
                .full-start-new__head {
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
                }
                
                .full-start-new__right, .full-start__left {
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: center !important;
                    align-items: center !important;
                    margin-top: -120px !important; /* Наїзд тексту на постер */
                }
                
                .full-start-new__buttons, .full-start-new__details, .full-descr__text, .full-start-new__tagline {
                    justify-content: center !important;
                    text-align: center !important;
                    display: flex !important;
                }
            }
        `;
        document.head.appendChild(style);
        return true;
    }

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
                        '<img style="max-height: 120px; object-fit: contain; position: relative; z-index: 10;" src="' + logoUrl + '"/>' +
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
