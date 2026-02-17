(function() {
    'use strict';

    window.logoplugin = true;

    function applyStyles() {
        var oldStyle = document.getElementById('lampa-fix-kenburns');
        if (oldStyle) oldStyle.remove();
        
        var style = document.createElement('style');
        style.id = 'lampa-fix-kenburns';
        style.textContent = `
            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                50% { transform: scale(1.15); }
                100% { transform: scale(1); }
            }

            @media screen and (max-width: 480px) {
                /* Прибираємо стандартні обмеження */
                .full-start__poster, .full-start-new__poster {
                    position: relative !important;
                    overflow: visible !important;
                    background: #000 !important;
                }

                .background { background: #000 !important; }

                /* ПЕРША МАСКА ТА АНІМАЦІЯ (на саму картинку) */
                .full-start-new__poster img, .full--poster, .full-start__poster img {
                    filter: none !important;
                    -webkit-filter: none !important;
                    
                    /* Повертаємо анімацію наближення */
                    animation: kenBurnsEffect 30s ease-in-out infinite !important;
                    transform-origin: center center !important;

                    /* Маска з твого робочого прикладу */
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

                /* ДРУГА МАСКА (на внутрішній контейнер - КЛЮЧ ДО ВІДСУТНОСТІ ЛІНІЇ) */
                .full-start-new__img {
                    border-radius: 0 !important;
                    mask-image: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 0) 0%,
                        rgba(0, 0, 0, 0.3) 5%,
                        rgba(0, 0, 0, 0.6) 12%,
                        rgba(0, 0, 0, 0.85) 20%,
                        rgba(0, 0, 0, 1) 30%,
                        rgba(0, 0, 0, 1) 70%,
                        rgba(0, 0, 0, 0.8) 85%,
                        rgba(0, 0, 0, 0.4) 95%,
                        rgba(0, 0, 0, 0) 100%) !important;
                    -webkit-mask-image: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 0) 0%,
                        rgba(0, 0, 0, 0.3) 5%,
                        rgba(0, 0, 0, 0.6) 12%,
                        rgba(0, 0, 0, 0.85) 20%,
                        rgba(0, 0, 0, 1) 30%,
                        rgba(0, 0, 0, 1) 70%,
                        rgba(0, 0, 0, 0.8) 85%,
                        rgba(0, 0, 0, 0.4) 95%,
                        rgba(0, 0, 0, 0) 100%) !important;
                }

                /* Контентна частина */
                .full-start-new__right {
                    background: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    margin-top: -120px !important;
                    z-index: 2 !important;
                    position: relative !important;
                }

                .full-start-new__right::before, .full-start-new__right::after {
                    display: none !important;
                    content: unset !important;
                }

                /* Центрування тексту та кнопок */
                .full-start-new__title, .full-start-new__tagline, .full-descr__text,
                .full-start-new__buttons, .full-start-new__details {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    text-align: center !important;
                    width: 100% !important;
                }

                .full-start-new__buttons, .full-start-new__details {
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    gap: 10px !important;
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
                
                var url = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + lang);
                
                $.get(url, function(res) {
                    let path = (res.logos && res.logos[0]) ? res.logos[0].file_path : null;
                    if (!path) {
                        $.get(Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=en'), function(resEn) {
                            if (resEn.logos && resEn.logos[0]) render(resEn.logos[0].file_path);
                        });
                    } else render(path);
                });

                function render(p) {
                    const img = Lampa.TMDB.image('/t/p/w300' + p.replace('.svg', '.png'));
                    e.object.activity.render().find('.full-start-new__title').html('<img src="'+img+'" style="max-height:100px; z-index:10; position:relative;">');
                }
            }
        });
    }

    function start() {
        applyStyles();
        initLogoPlugin();
        
        setInterval(function() {
            if (window.innerWidth <= 480 && window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
            }
        }, 1000);
        
        Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready' || e.type === 'full') {
                setTimeout(applyStyles, 200);
            }
        });
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') start(); });

})();
