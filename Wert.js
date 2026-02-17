(function() {
    'use strict';

    window.logoplugin = true;

    // Створюємо сховище для налаштувань, якщо його немає
    if (!Lampa.Storage.get('mobile_interface_animation')) {
        Lampa.Storage.set('mobile_interface_animation', 'true');
    }

    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.remove();
        
        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation') === 'true';
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        style.textContent = `
            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                50% { transform: scale(1.15); }
                100% { transform: scale(1); }
            }

            @media screen and (max-width: 480px) {
                .full-start__poster, .full-start-new__poster, .full-start__poster img, 
                .full-start-new__poster img, .screensaver__bg {
                    filter: none !important;
                    -webkit-filter: none !important;
                }
                
                .background { background: #000 !important; }
                
                .full-start-new__right {
                    background: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    z-index: 2 !important;
                }

                .full-start-new__right::before, .full-start-new__right::after {
                    content: unset !important;
                }
                
                .full-start-new__poster {
                    position: relative !important;
                    overflow: visible !important;
                }
                
                .full-start-new__poster img, .full--poster {
                    /* Перевірка тригера анімації */
                    ${isAnimationEnabled ? 'animation: kenBurnsEffect 30s ease-in-out infinite !important;' : 'animation: none !important;'}
                    transform-origin: center center !important;
                    
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important;
                    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important;
                }
                
                .full-start-new__img {
                    border-radius: 0 !important;
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%) !important;
                    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%) !important;
                }
                
                .full-start-new__title {
                    display: flex !important;
                    justify-content: center !important;
                    min-height: 70px !important;
                }
                
                .full-start-new__right {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    margin-top: -120px !important;
                }
                
                .full-start-new__buttons, .full-start-new__details, .full-descr__text, .full-start-new__tagline {
                    justify-content: center !important;
                    text-align: center !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Додаємо пункт меню в налаштування Lampa
    function addSettingsMenu() {
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                var item = $('<div class="settings-folder selector" data-name="mobile_interface">' +
                    '<div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg></div>' +
                    '<div class="settings-folder__name">Мобільний інтерфейс</div>' +
                    '</div>');

                item.on('hover:enter', function () {
                    Lampa.Settings.create({
                        title: 'Мобільний інтерфейс',
                        items: [
                            {
                                title: 'Анімація постера',
                                name: 'mobile_interface_animation',
                                type: 'select',
                                values: {
                                    'true': 'Увімкнено',
                                    'false': 'Вимкнено'
                                },
                                default: 'true'
                            }
                        ],
                        onBack: function() {
                            applyStyles(); // Оновлюємо стилі при виході з налаштувань
                            Lampa.Settings.main();
                        }
                    });
                });
                $('.settings-main').append(item);
            }
        });
    }

    function initLogoPlugin() {
        Lampa.Listener.follow('full', function(e) {
            if (window.innerWidth > 480 && e.type === 'complite') {
                var data = e.data.movie;
                var type = data.name ? 'tv' : 'movie';
                var lang = Lampa.Storage.get('language');
                
                Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + lang, (res) => {
                    let path = (res.logos && res.logos[0]) ? res.logos[0].file_path : null;
                    if (!path) {
                        Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=en', (resEn) => {
                            if (resEn.logos && resEn.logos[0]) render(resEn.logos[0].file_path);
                        });
                    } else render(path);
                });

                function render(p) {
                    const url = Lampa.TMDB.image('/t/p/w300' + p.replace('.svg', '.png'));
                    e.object.activity.render().find('.full-start-new__title').html('<img src="'+url+'" style="max-height: 120px; object-fit: contain;">');
                }
            }
        });
    }

    function start() {
        applyStyles();
        addSettingsMenu();
        initLogoPlugin();
        setInterval(() => { if(window.lampa_settings) window.lampa_settings.blur_poster = false; }, 1000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') start(); });

})();
