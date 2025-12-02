!function() {    
    "use strict";    
        
    // Додаємо CSS стилі з діагностикою    
    var style = document.createElement('style');    
    style.textContent = `    
        /* Діагностика - робимо всі логотипи видимими */  
        .full-start-new__title img {    
            border: 2px solid red !important;  /* Червона рамка для діагностики */  
            background: yellow !important;     /* Жовтий фон для видимості */  
            display: block !important;        /* Примусово показуємо */  
            visibility: visible !important;   /* Примусова видимість */  
            opacity: 1 !important;           /* Повна непрозорість */  
            max-width: none !important;        
            width: auto !important;            
            height: auto !important;            
            object-fit: contain !important;    
        }    
            
        /* Для TV та великих екранів */    
        @media (min-width: 1200px) {    
            .full-start-new__title img {    
                max-height: 60px !important;    
                max-width: 200px !important;    
            }    
        }    
            
        /* Для звичайних десктопів */    
        @media (min-width: 769px) and (max-width: 1199px) {    
            .full-start-new__title img {    
                max-height: 45px !important;    
                max-width: 150px !important;    
            }    
        }    
            
        /* Для мобільних */    
        @media (max-width: 768px) {    
            .full-start-new__title img {    
                max-height: 30px !important;    
                max-width: 100px !important;    
            }    
        }    
    `;    
    document.head.appendChild(style);    
        
    // Діагностика - перевіряємо наявність логотипів    
    setTimeout(function() {    
        var logos = document.querySelectorAll('.full-start-new__title img');    
        console.log('[LogoPlugin] Знайдено логотипів:', logos.length);    
          
        if (logos.length === 0) {    
            console.log('[LogoPlugin] Логотипи не знайдено. Шукаємо інші селектори...');    
            var allImages = document.querySelectorAll('.full-start-new__title img, .cardify--logo img, .full-start-new img');    
            console.log('[LogoPlugin] Всі зображення в title:', allImages.length);    
        } else {    
            logos.forEach(function(img, index) {    
                console.log('[LogoPlugin] Логотип', index + 1, ':', {    
                    src: img.src,    
                    width: img.offsetWidth,    
                    height: img.offsetHeight,    
                    display: window.getComputedStyle(img).display,    
                    visibility: window.getComputedStyle(img).visibility    
                });    
            });    
        }    
    }, 2000);    
        
    // Ключ для збереження стану плагіна    
    const ENABLED_KEY = "simple_logo_enabled";    
        
    window.logoplugin || (window.logoplugin = !0, Lampa.Listener.follow("full", (function(a) {    
        if ("complite" == a.type) {    
            var contentContainer = $('.full-start-new__title');    
            if (contentContainer.length > 0) {    
                contentContainer.css("opacity", "0.5");  /* Змінено для діагностики */    
                    
                var originalTitle = contentContainer.text().trim();    
                if (originalTitle && !contentContainer.data('logos-processed')) {    
                    contentContainer.data('logos-processed', true);    
                        
                    var apiUrl = "https://v2.sg.media-imdb.com/suggests/" + originalTitle[0].toLowerCase() + "/" + originalTitle.toLowerCase().replace(/[^a-z0-9]/g, "_") + ".json";    
                        
                    $.getJSON(apiUrl).done(function(data) {    
                        if (data.d && data.d.length > 0) {    
                            var logoUrl = data.d[0].i && data.d[0].i.imageUrl;    
                            if (logoUrl) {    
                                var logoImg = $('<img>').attr('src', logoUrl).css({    
                                    'max-width': 'none',    
                                    'width': 'auto',    
                                    'height': 'auto',    
                                    'margin-right': '10px',    
                                    'vertical-align': 'middle'    
                                });    
                                contentContainer.empty().append(logoImg).append(originalTitle);    
                                console.log('[LogoPlugin] Логотип додано:', logoUrl);    
                            }    
                        }    
                        contentContainer.css("opacity", "1");    
                    }).fail(function() {    
                        console.log('[LogoPlugin] Помилка запиту логотипів');    
                        contentContainer.css("opacity", "1");    
                    });    
                } else {    
                    console.log('[LogoPlugin] Логотипи відсутні');    
                    contentContainer.css("opacity", "1");    
                }    
            }    
        }    
    })))    
}();
