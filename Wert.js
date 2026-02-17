(function() {
    'use strict';

    window.logoplugin = true;

    function applyStyles() {
        var oldStyle = document.getElementById('lampa-fix-final-perfect');
        if (oldStyle) oldStyle.remove();
        
        var style = document.createElement('style');
        style.id = 'lampa-fix-final-perfect';
        style.textContent = `
            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            @media screen and (max-width: 480px) {
                .background, .notice-all { background-color: #000 !important; }

                /* Головний контейнер постера */
                .full-start-new__poster {
                    position: relative !important;
                    overflow: hidden !important; /* Тримаємо зум всередині */
                    background: #000 !important;
                    height: 65vh !important;
                }

                /* Створюємо внутрішній шар, який буде анімуватися РАЗОМ з маскою */
                .full-start-new__img {
                    position: absolute !important;
                    top: 0; left: 0; width: 100%; height: 100%;
                    animation: kenBurnsEffect 25s ease-in-out infinite !important;
                    border-radius: 0 !important;
                    
                    /* Маска з твого робочого прикладу, але на рівні контейнера */
                    mask-image: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 1) 0%,
                        rgba(0, 0, 0, 1) 50%,
                        rgba(0, 0, 0, 0.7) 75%,
                        rgba(0, 0, 0, 0.3) 90%,
                        rgba(0, 0, 0, 0) 100%) !important;
                    -webkit-mask-image: linear-gradient(to bottom, 
                        rgba(0, 0, 0, 1) 0%,
                        rgba(0, 0, 0, 1) 50%,
                        rgba(0, 0, 0, 0.7) 75%,
                        rgba(0, 0, 0, 0.3) 90%,
                        rgba(0, 0, 0, 0) 100%) !important;
                }

                /* Сама картинка - тепер вона просто заповнює шар */
                .full-start-new__poster img, .full-start__poster img {
                    filter: none !important;
                    -webkit-filter: none !important;
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                }

                /* Прибираємо всі "сміттєві" тіні та рамки Lampa */
                .full-start-new__right {
                    background: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    margin-top: -140px !important; /* Контент наповзає на постер */
                    z-index: 10 !important;
                    position: relative !important;
                }

                .full-start-new__right::before, .full-start-new__right::after {
                    display: none !important;
                }

                /* Центрування всього */
                .full-start-new__title, .full-start-new__tagline, .full-descr__text,
                .full-start-new__buttons, .full-start-new__details {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    text-align: center !important;
                    flex-direction: column !important;
                }

                .full-start-new__buttons, .full-start-new__details {
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    gap: 10px !important;
                }

                .full-start-new__head {
                    text-shadow: 0 2px 10px rgba(0,0,0,1) !important;
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
                    e.object.activity.render().find('.full-start-new__title').html('<img src="'+img+'" style="max-height:100px; position:relative; z-index:20;">');
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
