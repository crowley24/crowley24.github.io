(function() {
    'use strict';

    let observer;
    window.logoplugin = true;

    function log(...args) {
        if (window.logoplugin) console.log('[combined-plugin]', ...args);
    }

    // ===== ОСНОВНІ СТИЛІ =====
    function applyBaseStyles() {
        var oldStyle = document.getElementById('no-blur-plugin-styles');
        if (oldStyle) oldStyle.remove();
        
        var style = document.createElement('style');
        style.id = 'no-blur-plugin-styles';
        style.textContent = `
            @keyframes kenBurnsEffect {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            @media screen and (max-width: 480px) {
                /* Прибираємо розмиття та налаштовуємо контейнер */
                .full-start__poster,
                .full-start-new__poster,
                .screensaver__slides-slide {
                    overflow: hidden !important;
                    background: #000 !important;
                    position: relative !important;
                }

                /* Анімація та чистий постер без масок */
                .full-start__poster img,
                .full-start-new__poster img,
                .screensaver__slides-slide img,
                .screensaver__bg,
                .card--collection .card__img {
                    filter: none !important;
                    -webkit-filter: none !important;
                    animation: kenBurnsEffect 25s ease-in-out infinite !important;
                    transform-origin: center center !important;
                    mask-image: none !important;
                    -webkit-mask-image: none !important;
                }
                
                /* Створюємо ідеально м'який перехід через псевдоелемент поверх картинки */
                .full-start-new__poster::after {
                    content: '' !important;
                    position: absolute !important;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    /* Градієнт: верх прозорий, низ плавно чорний */
                    background: linear-gradient(to bottom, 
                        rgba(0,0,0,0) 0%, 
                        rgba(0,0,0,0) 30%, 
                        rgba(0,0,0,0.6) 70%, 
                        rgba(0,0,0,1) 95%, 
                        #000 100%) !important;
                    pointer-events: none !important;
                    z-index: 1 !important;
                }
                
                .background { background: #000 !important; }
                
                .full-start-new__right {
                    background: none !important;
                    border: none !important;
                    box-shadow: none !important;
                    z-index: 2 !important;
                    margin-top: -140px !important; /* Піднімаємо текст на постер */
                    position: relative !important;
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
                
                .full-start-new__head {
                    text-shadow: 2px 2px 8px rgba(0,0,0,1) !important;
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

    // ===== ЛОГІКА ЛОГОТИПІВ =====
    function getLogo(type, id, callback) {
        const languages = [Lampa.Storage.get('language'), 'en', '']; 
        
        let attempt = (index) => {
            if (index >= languages.length) return;
            let url = Lampa.TMDB.api(type + '/' + id + '/images?api_key=' + Lampa.TMDB.key() + (languages[index] ? '&language=' + languages[index] : ''));
            $.get(url, function(data) {
                if (data.logos && data.logos.length > 0) {
                    callback(data.logos[0].file_path);
                } else {
                    attempt(index + 1);
                }
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
                            '<img style="max-height: 120px; object-fit: contain; z-index: 3;" src="' + logoUrl + '"/>' +
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
            const titles = ['Рекомендации','Режиссер','Актеры','Подробно','Похожие','Коллекция','Рекомендації','Схожі'];
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
