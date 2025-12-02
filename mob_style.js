(function() {

    'use strict';



    let observer;

    window.logoplugin = true;



    function log(...args) {

        if (window.logoplugin) console.log('[combined-plugin]', ...args);

    }



    // ===== ОСНОВНЫЕ СТИЛИ =====

    function applyBaseStyles() {

        var oldStyle = document.getElementById('no-blur-plugin-styles');

        if (oldStyle) oldStyle.remove();

        

        var style = document.createElement('style');

        style.id = 'no-blur-plugin-styles';

        style.textContent = `

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

                }

                .full-start-new__right::before, 

                .full-start-new__right::after {

                    background: none !important;

                    box-shadow: none !important;

                    border: none !important;

                    opacity: 0 !important;

                    content: unset !important;

                }

                

                .full-start-new__title {

                    position: relative !important;

                    width: 100% !important;

                    display: flex !important;

                    justify-content: center !important;

                    align-items: center !important;

                    min-height: 70px !important;

                    margin: 0 auto !important;

                    box-sizing: border-box !important;

                }

                

                .full-start-new__poster {

                    position: relative !important;

                    overflow: visible !important;

                }

                

                .full-start-new__poster img,

                .full--poster {

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

                

                .full-start-new__head {

                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.6) !important;

                }

                

                .full-start-new__right, .full-start__left {

                    display: flex !important;

                    flex-direction: column !important;

                    justify-content: center !important;

                    align-items: center !important;

                }

                

                .full-start-new__buttons, .full-start-new__rate-line, .full-start__buttons, .full-start__details {

                    justify-content: center !important;

                    align-items: center !important;

                    display: flex !important;

                    flex-direction: row !important;

                    gap: 0.5em !important;

                    flex-wrap: wrap !important;

                }

                

                .full-start-new__details, .full-descr__details, .full-descr__tags {

                    justify-content: center !important;

                    align-items: center !important;

                    display: flex !important;

                    flex-direction: row !important;

                    flex-wrap: wrap !important;

                }

                

                .full-descr__text, .full-start-new__title, .full-start-new__tagline, .full-start__title, .full-start__title-original {

                    display: flex !important;

                    flex-direction: row !important;

                    justify-content: center !important;

                    align-items: center !important;

                    text-align: center !important;

                }

            }

        `;

        document.head.appendChild(style);

        

        return true;

    }



    function initBlurPlugin() {

        applyBaseStyles();



        setTimeout(applyBaseStyles, 100);

        setTimeout(applyBaseStyles, 300);

        setTimeout(applyBaseStyles, 500);

        setTimeout(applyBaseStyles, 1000);



        setInterval(function() {

            if (window.innerWidth <= 480) {

                if (window.lampa_settings && window.lampa_settings.blur_poster !== false) {

                    window.lampa_settings.blur_poster = false;

                }

            }

        }, 1000);

    }



    // ===== ФУНКЦИИ ДЛЯ МОБИЛЬНЫХ СТИЛЕЙ =====

    function initMobileStyles() {

        if (window.innerWidth > 480) return;

        

        applyMobileStyles();

        

        if (typeof Lampa.Listener !== 'undefined' && typeof Lampa.Listener.follow === 'function') {

            Lampa.Listener.follow('app', function(e) {

                if (window.innerWidth > 480) return;

                

                if (e.type === 'full' || e.type === 'card') {

                    applyMobileStyles();

                    setTimeout(applyMobileStyles, 50);

                    setTimeout(applyMobileStyles, 150);

                    setTimeout(applyMobileStyles, 400);

                    setTimeout(applyMobileStyles, 800);

                    startDOMObserver();

                }

                

                if (e.type === 'hide' || e.type === 'component_hide') {

                    stopDOMObserver();

                }

            });

        }



        startDOMObserver();

        

        setTimeout(applyMobileStyles, 200);

        setTimeout(applyMobileStyles, 500);

        setTimeout(applyMobileStyles, 1000);

        setTimeout(applyMobileStyles, 1500);

    }



    function startDOMObserver() {

        if (window.innerWidth > 480) return;

        

        stopDOMObserver();

        

        observer = new MutationObserver(function(mutations) {

            if (window.innerWidth > 480) return;

            

            let shouldApplyStyles = false;

            

            mutations.forEach(function(mutation) {

                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {

                    for (let node of mutation.addedNodes) {

                        if (node.nodeType === 1) {

                            if (node.classList && (

                                node.classList.contains('full-start-new__right') ||

                                node.classList.contains('full-start__left') ||

                                node.classList.contains('items-line__head') ||

                                node.classList.contains('full-start-new__poster') ||

                                node.querySelector('.full-start-new__right') ||

                                node.querySelector('.full-start__left') ||

                                node.querySelector('.items-line__head') ||

                                node.querySelector('.full-start-new__poster')

                            )) {

                                shouldApplyStyles = true;

                            }

                        }

                    }

                }

                

                if (mutation.type === 'attributes' && 

                    mutation.target.classList && 

                    (mutation.target.classList.contains('full-start-new__poster'))) {

                    shouldApplyStyles = true;

                }

            });

            

            if (shouldApplyStyles) {

                applyMobileStyles();

                setTimeout(applyMobileStyles, 50);

                setTimeout(applyMobileStyles, 100);

                setTimeout(applyBaseStyles, 150);

            }

        });

        

        observer.observe(document.body, {

            childList: true,

            subtree: true,

            attributes: true,

            attributeFilter: ['class', 'style']

        });

    }



    function stopDOMObserver() {

        if (observer) {

            observer.disconnect();

            observer = null;

        }

    }



    function applyMobileStyles() {

        if (window.innerWidth > 480) return;

        

        applySectionHeadStyles();

    }



    function applySectionHeadStyles() {

        if (window.innerWidth > 480) return;

        

        const sectionTitles = [

            'Рекомендации',

            'Режиссер', 

            'Актеры',

            'Подробно',

            'Похожие',

            'Коллекция'

        ];



        document.querySelectorAll('.items-line__head').forEach(element => {

            const text = element.textContent.trim();

            

            if (text && (

                sectionTitles.includes(text) ||

                text.includes('Сезон')

            )) {

                element.style.display = 'flex';

                element.style.justifyContent = 'center';

                element.style.alignItems = 'center';

                element.style.width = '100%';

            }

        });

    }



    // ===== ФУНКЦИИ ДЛЯ ЛОГОТИПОВ =====

    function initLogoPlugin() {

        Lampa.Listener.follow('full', function(e) {

            if (window.innerWidth > 480) return;

            

            if (e.type === 'complite') {

                var data = e.data.movie;

                var type = data.name ? 'tv' : 'movie';

                

                if (data.id !== '') {

                    var url = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language'));

                    

                    $.get(url, function(data) {

                        if (data.logos && data.logos[0]) {

                            var logo = data.logos[0].file_path;

                            

                            if (logo !== '') {

                                e.object.activity.render().find('.full-start-new__title').html(

                                    '<div style="display: flex; justify-content: center; align-items: center; width: 100%;">' +

                                    '<img style="margin-top: 5px; max-height: 125px;" src="' + Lampa.TMDB.image('/t/p/w300' + logo.replace('.svg', '.png')) + '"/>' +

                                    '</div>'

                                );

                            }

                        }

                    }).fail(function() {

                        log('Failed to load logo');

                    });

                }

            }

        });

    }



    // ===== ОБЩАЯ ИНИЦИАЛИЗАЦИЯ =====

    function initAllPlugins() {

        initBlurPlugin();

        initMobileStyles();

        initLogoPlugin();

    }



    function startPlugin() {

        if (window.appready) {

            initAllPlugins();

        } else {

            if (typeof Lampa.Listener !== 'undefined' && typeof Lampa.Listener.follow === 'function') {

                Lampa.Listener.follow('app', function(e) {

                    if (e.type === 'ready') {

                        setTimeout(initAllPlugins, 500);

                    }

                });

            } else {

                setTimeout(initAllPlugins, 2000);

            }

        }

    }



    if (typeof Lampa.Timer !== 'undefined' && typeof Lampa.Timer.add === 'function') {

        Lampa.Timer.add(500, startPlugin, true);

    } else {

        setTimeout(startPlugin, 500);

    }



})();
