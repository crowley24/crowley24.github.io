(function() {
    'use strict';

    let observer;
    window.logoplugin = true;

    function log(...args) {
        if (window.logoplugin) console.log('[combined-plugin]', ...args);
    }

    // ===== ОСНОВНІ СТИЛІ ТА ПЛАВНИЙ ГРАДІЄНТ =====
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
                    animation: kenBurnsEffect 25s ease-in-out infinite !important;
                    transform-origin: center center !important;
                }
                
                .background { background: #000 !important; }
                
                .full-start-new__right {
                    background: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    z-index: 2 !important;
                    margin-top: -30px !important; /* Трохи піднімаємо контент вгору для м'якості */
                }

                .full-start-new__right::before, 
                .full-start-new__right::after {
                    display: none !important;
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
                
                /* ОНОВЛЕНИЙ М'ЯКИЙ ПЕРЕХІД (ГРАДІЄНТ) */
                .full-start-new__poster img,
                .full--poster {
                    mask-image: linear-gradient(to bottom, 
                        rgba(0,0,0,1) 0%, 
                        rgba(0,0,0,1) 35%, 
                        rgba(0,0,0,0.7) 60%, 
                        rgba(0,0,0,0.3) 80%, 
                        rgba(0,0,0,0) 100%) !important;
                    -webkit-mask-image: linear-gradient(to bottom, 
                        rgba(0,0,0,1) 0%, 
                        rgba(0,0,0,1) 35%, 
                        rgba(0,0,0,0.7) 60%, 
                        rgba(0,0,0,0.3) 80%, 
                        rgba(0,0,0,0) 100%) !important;
                }
                
                .full-start-new__head {
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.9) !important;
                }
                
                .full-start-new__right, .full-start__left, .full-descr__text, 
                .full-start-new__title, .full-start-new__tagline {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    text-align: center !important;
                    flex-direction: column !important;
                }
                
                .full-start-new__buttons, .full-start-new__details {
                    justify-content: center !important;
                }
            }
        `;
        document.head.appendChild(style);
        return true;
    }

    // Решта коду (getLogo, initLogoPlugin, і т.д.) залишається без змін
    function getLogo(type, id, callback) {
        const languages = [Lampa.Storage.get('language'), 'en', ''];
        let attempt = (index) => {
            if (index >= languages.length) return;
            let url = Lampa.TMDB.api(type + '/' + id + '/images?api_key=' + Lampa.TMDB.key() + (languages[index] ? '&language=' + languages[index] : ''));
            $.get(url, function(data) {
                if (data.logos && data.logos.length > 0) callback(data.logos[0].file_path);
                else attempt(index + 1);
            }).fail(() => attempt(index + 1));
        };
        attempt(0);
    }

    function initLogoPlugin() {
        Lampa.Listener.follow('full', function(e) {
            if (window.innerWidth > 480 && e.type === 'complite') return;
            if (e.type === 'complite') {
                var data = e.data.movie;
                var type = data.name ? 'tv' : 'movie';
                if (data.id) {
                    getLogo(type, data.id, function(path) {
                        const logoUrl = Lampa.TMDB.image('/t/p/w300' + path.replace('.svg', '.png'));
                        e.object.activity.render().find('.full-start-new__title').html(
                            '<div style="display: flex; justify-content: center; width: 100%;">' +
                            '<img style="max-height: 125px; object-fit: contain;" src="' + logoUrl + '"/>' +
                            '</div>'
                        );
                    });
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
        }, 2000);
    }

    function initMobileStyles() {
        if (window.innerWidth > 480) return;
        const apply = () => {
            const titles = ['Рекомендации','Режиссер','Актеры','Подробно','Похожие','Коллекция'];
            document.querySelectorAll('.items-line__head').forEach(el => {
                if (titles.includes(el.textContent.trim()) || el.textContent.includes('Сезон')) {
                    el.style.cssText = 'display:flex; justify-content:center; width:100%;';
                }
            });
        };
        Lampa.Listener.follow('app', (e) => {
            if (e.type === 'ready' || e.type === 'full') {
                setTimeout(() => { apply(); applyBaseStyles(); }, 200);
            }
        });
    }

    function startPlugin() {
        initBlurPlugin();
        initMobileStyles();
        initLogoPlugin();
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });

})();
