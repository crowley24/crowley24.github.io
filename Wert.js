(function() {
    'use strict';

    window.logoplugin = true;

    function applyStyles() {
        var oldStyle = document.getElementById('lampa-no-line-fix');
        if (oldStyle) oldStyle.remove();
        
        var style = document.createElement('style');
        style.id = 'lampa-no-line-fix';
        style.textContent = `
            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                50% { transform: scale(1.15); }
                100% { transform: scale(1); }
            }

            @media screen and (max-width: 480px) {
                .background, .notice-all { background-color: #000 !important; }

                /* Контейнер для картинки */
                .full-start-new__poster {
                    position: relative !important;
                    overflow: hidden !important; 
                    background: #000 !important;
                    height: 60vh !important;
                }

                /* Анімація тільки на картинку */
                .full-start-new__poster img {
                    filter: none !important;
                    -webkit-filter: none !important;
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    animation: kenBurnsEffect 30s ease-in-out infinite !important;
                }

                /* СЕКРЕТ ТУТ: Замість маски використовуємо статичний оверлей */
                /* Він ПЕРЕКРИВАЄ лінію і не рухається разом з картинкою */
                .full-start-new__poster::after {
                    content: '' !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: 100.5% !important; /* Трохи більше, щоб закрити шов */
                    background: linear-gradient(to bottom, 
                        rgba(0,0,0,0) 0%, 
                        rgba(0,0,0,0) 40%, 
                        rgba(0,0,0,0.4) 60%, 
                        rgba(0,0,0,0.8) 85%, 
                        #000 100%) !important;
                    z-index: 2 !important;
                    pointer-events: none !important;
                }

                /* Прибираємо маски з контейнера, які й створювали лінію */
                .full-start-new__img {
                    mask-image: none !important;
                    -webkit-mask-image: none !important;
                    border-radius: 0 !important;
                }

                /* Налаштування тексту та лого */
                .full-start-new__right {
                    background: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    margin-top: -160px !important; 
                    z-index: 10 !important;
                    position: relative !important;
                }

                .full-start-new__right::before, .full-start-new__right::after {
                    display: none !important;
                }

                .full-start-new__title, .full-start-new__tagline, .full-descr__text,
                .full-start-new__buttons, .full-start-new__details {
                    display: flex !important;
                    justify-content: center !important;
                    text-align: center !important;
                    width: 100% !important;
                    flex-direction: column !important;
                }

                .full-start-new__buttons, .full-start-new__details {
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    gap: 8px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function initLogoPlugin() {
        Lampa.Listener.follow('full', function(e) {
            if (window.innerWidth > 480) return;
            if (e.type === 'complite') {
                var data = e.data.movie;
                var type = data.name ? 'tv' : 'movie';
                var lang = Lampa.Storage.get('language') || 'uk';
                
                $.get(Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + lang), function(res) {
                    let path = (res.logos && res.logos[0]) ? res.logos[0].file_path : null;
                    if (!path) {
                        $.get(Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=en'), function(resEn) {
                            if (resEn.logos && resEn.logos[0]) render(resEn.logos[0].file_path);
                        });
                    } else render(path);
                });

                function render(p) {
                    const img = Lampa.TMDB.image('/t/p/w300' + p.replace('.svg', '.png'));
                    e.object.activity.render().find('.full-start-new__title').html('<img src="'+img+'" style="max-height:110px; z-index:20; position:relative;">');
                }
            }
        });
    }

    function start() {
        applyStyles();
        initLogoPlugin();
        setInterval(() => { if(window.lampa_settings) window.lampa_settings.blur_poster = false; }, 1000);
        Lampa.Listener.follow('app', (e) => { if (e.type === 'ready' || e.type === 'full') setTimeout(applyStyles, 200); });
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') start(); });
})();
