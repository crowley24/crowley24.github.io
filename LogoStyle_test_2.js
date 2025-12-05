!function() {  
    "use strict";  
  
    // --- Діагностика та перевірка залежностей ---  
    console.log('[Logo Plugin] Starting initialization...');  
      
    if (typeof Lampa === 'undefined') {  
        console.error('[Logo Plugin] Lampa is not defined');  
        return;  
    }  
      
    if (typeof $ === 'undefined') {  
        console.error('[Logo Plugin] jQuery is not defined');  
        return;  
    }  
  
    // --- Налаштування кешування ---  
    var LOGO_CACHE = 'logo_plugin_cache';  
    var CACHE_TIME = 7 * 24 * 60 * 60 * 1000; // 7 днів  
  
    // --- Функції кешування ---  
    function getCachedLogo(movieId) {  
        try {  
            var cache = JSON.parse(localStorage.getItem(LOGO_CACHE) || '{}');  
            var item = cache[movieId];  
            if (item && (Date.now() - item.timestamp < CACHE_TIME)) {  
                console.log('[Logo Plugin] Using cached logo for:', movieId);  
                return item.logoPath;  
            }  
        } catch (e) {  
            console.error('[Logo Plugin] Cache error:', e);  
        }  
        return null;  
    }  
  
    function cacheLogo(movieId, logoPath) {  
        try {  
            var cache = JSON.parse(localStorage.getItem(LOGO_CACHE) || '{}');  
            cache[movieId] = {  
                logoPath: logoPath,  
                timestamp: Date.now()  
            };  
            localStorage.setItem(LOGO_CACHE, JSON.stringify(cache));  
            console.log('[Logo Plugin] Cached logo for:', movieId);  
        } catch (e) {  
            console.error('[Logo Plugin] Cache save error:', e);  
        }  
    }  
  
    // --- СТИЛІ з покращеною специфічністю ---  
    var style = document.createElement('style');  
    style.textContent = '\n        .cardify .full-start-new__title {\n            text-shadow: none !important;\n        }\n\n        /* Агресивні правила з вищою специфічністю */\n        .cardify .full-start-new__title img,\n        .full-start-new__title img,\n        .full-logo-wrapper img {\n            /* Примусові мінімальні розміри */\n            min-width: 300px !important;\n            min-height: 90px !important;\n            \n            /* Примусові максимальні розміри */\n            max-width: 40vw !important;\n            max-height: 20vh !important;\n            \n            /* Примусові базові властивості */\n            width: auto !important;\n            height: auto !important;\n            object-fit: contain !important;\n            display: block !important;\n            margin: 5px auto 0 !important;\n            \n            /* Вимкнення будь-яких трансформацій */\n            transform: none !important;\n            -webkit-transform: none !important;\n            -moz-transform: none !important;\n            -ms-transform: none !important;\n            -o-transform: none !important;\n        }\n\n        /* Контейнер з примусовою шириною */\n        .full-logo-wrapper {\n            display: flex !important;\n            flex-direction: column !important;\n            align-items: center !important;\n            justify-content: center !important;\n            width: 100% !important;\n            min-height: 100px !important;\n        }\n\n        /* Додатково для мобільних */\n        @media (max-width: 768px) {\n            .cardify .full-start-new__title img,\n            .full-start-new__title img,\n            .full-logo-wrapper img {\n                min-width: 250px !important;\n                min-height: 75px !important;\n                max-width: 60vw !important;\n                max-height: 25vh !important;\n            }\n        }\n        \n        /* Для дуже великих екранів */\n        @media (min-width: 1920px) {\n            .cardify .full-start-new__title img,\n            .full-start-new__title img,\n            .full-logo-wrapper img {\n                min-width: 400px !important;\n                min-height: 120px !important;\n                max-width: 35vw !important;\n                max-height: 18vh !important;\n            }\n        }\n\n        /* Індикатор завантаження */\n        .logo-loading {\n            display: flex;\n            align-items: center;\n            justify-content: center;\n            min-height: 100px;\n            color: #fff;\n            font-size: 14px;\n        }\n    ';  
    document.head.appendChild(style);  
  
    // --- ОСНОВНИЙ ПЛАГІН ---  
    window.logoplugin = window.logoplugin || false;  
      
    if (!window.logoplugin) {  
        window.logoplugin = true;  
          
        Lampa.Listener.follow('full', function(e) {  
            if (e.type === 'complite') {  
                try {  
                    var movie = e.data.movie;  
                    var isSerial = movie.name || movie.first_air_date;  
                    var apiPath = isSerial ? 'tv/' + movie.id : 'movie/' + movie.id;  
                    var movieId = movie.id.toString();  
  
                    // Перевірка кешу  
                    var cachedLogo = getCachedLogo(movieId);  
                    if (cachedLogo) {  
                        displayLogo(e, cachedLogo);  
                        return;  
                    }  
  
                    // Показуємо індикатор завантаження  
                    var contentContainer = e.object.activity.render().find('.full-start-new__body');  
                    contentContainer.css('opacity', '0');  
                    e.object.activity.render().find('.full-start-new__title').html(  
                        '<div class="logo-loading">Завантаження логотипа...</div>'  
                    );  
  
                    // API логотипів  
                    var imgApi = Lampa.TMDB.api(apiPath + '/images?api_key=' + Lampa.TMDB.key());  
  
                    $.get(imgApi, function(response) {  
                        try {  
                            if (response.logos && response.logos.length > 0) {  
                                // Розширений пріоритет мов  
                                var logoPriority = ['uk', 'ru', 'en', 'de', 'fr', 'es', 'it', 'pt'];  
                                var selectedLogo = null;  
                                  
                                for (var i = 0; i < logoPriority.length; i++) {  
                                    selectedLogo = response.logos.find(function(logo) {  
                                        return logo.iso_639_1 === logoPriority[i];  
                                    });  
                                    if (selectedLogo) break;  
                                }  
  
                                if (!selectedLogo) {  
                                    selectedLogo = response.logos[0];  
                                }  
  
                                if (selectedLogo && selectedLogo.file_path) {  
                                    var logoPath = Lampa.TMDB.image('/t/p/w300' + selectedLogo.file_path.replace('.svg', '.png'));  
                                      
                                    // Зберігаємо в кеш  
                                    cacheLogo(movieId, logoPath);  
                                      
                                    // Відображаємо логотип  
                                    displayLogo(e, logoPath);  
                                } else {  
                                    console.log('[Logo Plugin] No valid logo found for:', movieId);  
                                    contentContainer.css('opacity', '1');  
                                }  
                            } else {  
                                console.log('[Logo Plugin] No logos in response for:', movieId);  
                                contentContainer.css('opacity', '1');  
                            }  
                        } catch (error) {  
                            console.error('[Logo Plugin] Error processing logo response:', error);  
                            contentContainer.css('opacity', '1');  
                        }  
                    }).fail(function() {  
                        console.error('[Logo Plugin] Failed to fetch logos from API');  
                        contentContainer.css('opacity', '1');  
                    });  
                } catch (error) {  
                    console.error('[Logo Plugin] Error in full event handler:', error);  
                }  
            }  
        });  
  
        // Функція відображення логотипа  
        function displayLogo(e, logoPath) {  
            var contentContainer = e.object.activity.render().find('.full-start-new__body');  
            var img = new Image();  
              
            img.onload = function() {  
                try {  
                    // Примусово встановлюємо розміри через JavaScript  
                    img.style.minWidth = '300px';  
                    img.style.minHeight = '90px';  
                      
                    e.object.activity.render().find('.full-start-new__title').html(  
                        '<div class="full-logo-wrapper">' +  
                            '<img src="' + logoPath + '" style="min-width: 300px; min-height: 90px;" />' +  
                        '</div>'  
                    );  
                    contentContainer.css('opacity', '1');  
                } catch (error) {  
                    console.error('[Logo Plugin] Error displaying logo:', error);  
                    contentContainer.css('opacity', '1');  
                }  
            };  
  
            img.onerror = function() {  
                console.error('[Logo Plugin] Failed to load logo image:', logoPath);  
                contentContainer.css('opacity', '1');  
            };  
  
            img.src = logoPath;  
        }  
  
        // Глобальні функції для зворотної сумісності  
        window.logoPlugin = {  
            setLanguage: function(lang) {  
                console.log('[Logo Plugin] Language setting not implemented in this version');  
            },  
            getLanguage: function() {  
                return 'uk'; // Завжди українська за замовчуванням  
            }  
        };  
  
        console.log('[Logo Plugin] Successfully initialized with all improvements');  
    }  
}();
