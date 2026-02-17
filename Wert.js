(function() {
    'use strict';

    let observer;
    window.logoplugin = true;

    function applyBaseStyles() {
        var oldStyle = document.getElementById('no-blur-plugin-styles');
        if (oldStyle) oldStyle.remove();
        
        var style = document.createElement('style');
        style.id = 'no-blur-plugin-styles';
        style.textContent = `
            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                50% { transform: scale(1.12); }
                100% { transform: scale(1); }
            }

            @media screen and (max-width: 480px) {
                .background { background: #000 !important; }
                
                /* Контейнер постера */
                .full-start__poster,
                .full-start-new__poster {
                    position: relative !important;
                    overflow: hidden !important;
                    background: #000 !important;
                    /* Примусово прибираємо будь-які внутрішні тіні Lampa */
                    box-shadow: none !important;
                }
                
                /* Анімація на зображення */
                .full-start-new__poster img,
                .full-start__poster img,
                .screensaver__slides-slide img {
                    filter: none !important;
                    -webkit-filter: none !important;
                    animation: kenBurnsEffect 25s ease-in-out infinite !important;
                    transform-origin: center center !important;
                    transition: none !important;
                }

                /* СЕКРЕТ ТУТ: Накладаємо маску на ПЕРЕДНІЙ ПЛАН (псевдоелемент) */
                /* Це гарантує, що лінія не з'явиться при масштабуванні картинки */
                .full-start-new__poster::after,
                .full-start__poster::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    z-index: 1;
                    pointer-events: none;
                    
                    /* Використовуємо твою ідеальну маску як градієнтну заливку */
                    background: linear-gradient(to bottom, 
                        rgba(0,0,0,0) 0%, 
                        rgba(0,0,0,0) 50%, 
                        rgba(0,0,0,0.6) 75%, 
                        rgba(0,0,0,0.9) 90%, 
                        #000 100%) !important;
                }
                
                /* Додаткове розчинення країв контейнера */
                .full-start-new__img {
                    border-radius: 0 !important;
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%) !important;
                    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%) !important;
                }
                
                .full-start-new__right {
                    background: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    z-index: 2 !important;
                    margin-top: -140px !important;
                    position: relative !important;
                }

                .full-start-new__right::before, 
                .full-start-new__right::after {
                    display: none !important;
                }
                
                .full-start-new__title {
                    width: 100% !important;
                    display: flex !important;
                    justify-content: center !important;
                    min-height: 80px !important;
                }
                
                .full-start-new__head {
                    text-shadow: 0 2px 10px rgba(0,0,0,1) !important;
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
                
                .full-start-new__buttons {
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    gap: 10px !important;
                    margin-bottom: 10px;
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
                        } else { renderLogo(logoPath); }
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

    function startPlugin() {
        applyBaseStyles();
        initLogoPlugin();
        setInterval(function() {
            if (window.innerWidth <= 480 && window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
            }
        }, 1000);
        setTimeout(applyBaseStyles, 500);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });
})();
