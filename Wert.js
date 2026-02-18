(function() {
    'use strict';

    // Ініціалізація налаштування
    if (Lampa.Storage.get('mobile_interface_animation', 'unset') === 'unset') {
        Lampa.Storage.set('mobile_interface_animation', true);
    }

    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.remove();
        
        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');
        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';
        style.textContent = `
            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                50% { transform: scale(1.15); }
                100% { transform: scale(1); }
            }

            @media screen and (max-width: 480px) {
                .background { background: #000 !important; }

                .full-start__poster, .full-start-new__poster, 
                .full-start__poster img, .full-start-new__poster img {
                    filter: none !important;
                    -webkit-filter: none !important;
                }
                
                .full-start-new__poster {
                    position: relative !important;
                    overflow: visible !important;
                }
                
                .full-start-new__poster img {
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
                
                .full-start-new__right {
                    background: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    margin-top: -120px !important;
                    z-index: 2 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                }
                
                .full-start-new__right::before, .full-start-new__right::after { content: unset !important; }
                
                .full-start-new__title { width: 100%; display: flex; justify-content: center; min-height: 70px; }
                .full-start-new__buttons, .full-start-new__details, .full-descr__text, .full-start-new__tagline {
                    justify-content: center !important;
                    text-align: center !important;
                    display: flex !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Додавання меню налаштувань
    function addSettings() {  
    Lampa.Settings.listener.follow('open', function (e) {  
        if (e.name === 'main') {  
            var item = $('<div class="settings-folder selector" data-component="mobile_interface">' +  
                '<div class="settings-folder__icon">...</div>' +  
                '<div class="settings-folder__name">Мобільний інтерфейс</div>' +  
                '</div>');  
  
            item.on('hover:enter', function () {  
                Lampa.Settings.create({  
                    title: 'Мобільний інтерфейс',  
                    items: [{  
                        title: 'Анімація постера',  
                        name: 'mobile_interface_animation',  
                        type: 'select',  
                        values: { true: 'Увімкнено', false: 'Вимкнено' },  
                        default: true  
                    }],  
                    onBack: function () {  
                        applyStyles();  
                        Lampa.Settings.main();  
                    }  
                });  
            });  
  
            var other = e.body.find('.selector[data-component="more"]');  
            if (other.length) other.before(item);  
            else e.body.find('.scroll__body').append(item);  
        }  
    });  
    }

    function initLogo() {
        Lampa.Listener.follow('full', function(e) {
            if (window.innerWidth <= 480 && e.type === 'complite') {
                var movie = e.data.movie;
                var type = movie.name ? 'tv' : 'movie';
                var lang = Lampa.Storage.get('language');
                
                var url = Lampa.TMDB.api(type + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + lang);
                $.get(url, function(res) {
                    let path = (res.logos && res.logos[0]) ? res.logos[0].file_path : null;
                    if (!path) {
                        $.get(Lampa.TMDB.api(type + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=en'), function(resEn) {
                            if (resEn.logos && resEn.logos[0]) render(resEn.logos[0].file_path);
                        });
                    } else render(path);
                });

                function render(p) {
                    const imgUrl = Lampa.TMDB.image('/t/p/w300' + p.replace('.svg', '.png'));
                    e.object.activity.render().find('.full-start-new__title').html('<img src="'+imgUrl+'" style="max-height: 120px; object-fit: contain; position: relative; z-index: 10;">');
                }
            }
        });
    }

    function start() {
        applyStyles();
        addSettings();
        initLogo();
        
        // Вимикаємо стандартний блюр Lampa
        setInterval(function() {
            if (window.innerWidth <= 480 && window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
            }
        }, 1000);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') start(); });

})();
