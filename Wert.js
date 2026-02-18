(function() {  
    'use strict';  
  
    // 1. Ініціалізація налаштування  
    if (Lampa.Storage.get('mobile_interface_animation', 'unset') === 'unset') {  
        Lampa.Storage.set('mobile_interface_animation', true);  
    }  
  
    // 2. Функція застосування стилів
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
                /* Загальний фон */
                .background { background: #000 !important; }  
  
                /* Вимикаємо стандартне розмиття Lampa */
                .full-start__poster, .full-start-new__poster,  
                .full-start__poster img, .full-start-new__poster img {  
                    filter: none !important;  
                    -webkit-filter: none !important;  
                }  
  
                /* Контейнер постера - ВИПРАВЛЕННЯ "ПЛАВАННЯ" ЕКРАНА */
                .full-start-new__poster {  
                    position: relative !important;  
                    overflow: hidden !important; /* Обрізає збільшену картинку, щоб не було скролу */
                    touch-action: none !important; /* Забороняє браузеру рухати екран при торканні картинки */
                    pointer-events: none !important; /* Пропускає кліки/свайпи крізь картинку на фон */
                }  
  
                /* Сама картинка з анімацією та маскою */
                .full-start-new__poster img {  
                    ${isAnimationEnabled ? 'animation: kenBurnsEffect 30s ease-in-out infinite !important;' : 'animation: none !important;'}  
                    transform-origin: center center !important;  
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important;  
                    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.4) 85%, rgba(0,0,0,0) 100%) !important;  
                }  
  
                /* Маска контенту для приховання ліній */
                .full-start-new__img {  
                    border-radius: 0 !important;  
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%) !important;  
                    -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%) !important;  
                }  
  
                /* Права частина з контентом */
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
  
                /* Заголовок та центрування */
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
  
    // 3. Реєстрація налаштувань у меню
    function addSettings() {  
        Lampa.SettingsApi.addComponent({  
            component: 'mobile_interface',  
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" fill="white"/></svg>',  
            name: 'Мобільний інтерфейс'  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'mobile_interface',  
            param: {  
                name: 'mobile_interface_animation',  
                type: 'trigger',  
                default: true  
            },  
            field: {  
                name: 'Анімація постера',  
                description: 'Повільна анімація наближення фонового зображення'  
            },  
            onChange: function(value) {  
                applyStyles();  
            }  
        });  
    }  
  
    // 4. Логіка завантаження логотипів (TMDB)
    function initLogo() {  
        Lampa.Listener.follow('full', function(e) {  
            if (window.innerWidth <= 480 && (e.type === 'complite' || e.type === 'complete')) {  
                var movie = e.data.movie;  
                if (!movie || !movie.id) return;  
                var type = movie.name ? 'tv' : 'movie';  
                var lang = Lampa.Storage.get('language') || 'uk';  
  
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
                    var $title = e.object.activity.render().find('.full-start-new__title');  
                    if ($title.length) {  
                        $title.html('<img src="'+imgUrl+'" style="max-height: 120px; object-fit: contain; position: relative; z-index: 10;">');  
                    }  
                }  
            }  
        });  
    }  
  
    // 5. Запуск плагіна
    function start() {  
        applyStyles();  
        addSettings();  
        initLogo();  
  
        // Постійне вимкнення стандартного блюру
        setInterval(function() {  
            if (window.innerWidth <= 480 && window.lampa_settings) {  
                window.lampa_settings.blur_poster = false;  
            }  
        }, 1000);  
    }  
  
    if (window.appready) start();  
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') start(); });  
})();
