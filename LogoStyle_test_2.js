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
    style.textContent = `  
        .cardify .full-start-new__title {  
            text-shadow: none !important;  
        }  
  
        /* Агресивні правила з вищою специфічністю */  
        .cardify .full-start-new__title img,  
        .full-start-new__title img,  
        .full-logo-wrapper img {  
            /* Примусові мінімальні розміри */  
            min-width: 300px !important;  
            min-height: 90px !important;  
              
            /* Примусові максимальні розміри */  
            max-width: 40vw !important;  
            max-height: 20vh !important;  
              
            /* Примусові базові властивості */  
            width: auto !important;  
            height: auto !important;  
            object-fit: contain !important;  
            display: block !important;  
            margin: 5px auto 0 !important;  
              
            /* Вимкнення будь-яких трансформацій */  
            transform: none !important;  
            -webkit-transform: none !important;  
            -moz-transform: none !important;  
            -ms-transform: none !important;  
            -o-transform: none !important;  
        }  
  
        /* Контейнер з примусовою шириною */  
        .full-logo-wrapper {  
            display: flex !important;  
            flex-direction: column !important;  
            align-items: center !important;  
            justify-content: center !important;  
            width: 100% !important;  
            min-height: 100px !important;  
        }  
  
        /* Індикатор завантаження */  
        .logo-loading {  
            display: flex;  
            align-items: center;  
            justify-content: center;  
            min-height: 100px;  
            color: #fff;  
            font-size: 14px;  
        }  
  
        /* Додатково для мобільних */  
        @media (max-width: 768px) {  
            .cardify .full-start-new__title img,  
            .full-start-new__title img,  
            .full-logo-wrapper img {  
                min-width: 250px !important;  
                min-height: 75px !important;  
                max-width: 60vw !important;  
                max-height: 25vh !important;  
            }  
        }  
          
        /* Для дуже великих екранів */  
        @media (min-width: 1920px) {  
            .cardify .full-start-new__title img,  
            .full-start-new__title img,  
            .full-logo-wrapper img {  
                min-width: 400px !important;  
                min-height: 120px !important;  
                max-width: 35vw !important;  
                max-height: 18vh !important;  
            }  
        }  
    `;  
    document.head.appendChild(style);  
  
    // --- ОСНОВНИЙ ПЛАГІН ---  
    window.logoplugin || (window.logoplugin = !0, Lampa.Listener.follow("full", function(a) {  
        if ("complite" == a.type) {  
            try {  
                console.log('[Logo Plugin] Full event triggered:', a.type);  
                  
                var e = a.data.movie;  
                var isSerial = e.name || e.first_air_date;  
                var apiPath = isSerial ? "tv/" + e.id : "movie/" + e.id;  
                var movieId = e.id;  
  
                // Перевіряємо кеш  
                var cachedLogo = getCachedLogo(movieId);  
                if (cachedLogo) {  
                    var contentContainer = a.object.activity.render().find(".full-start-new__body");  
                      
                    var img = new Image();  
                    img.onload = function() {  
                        a.object.activity.render().find(".full-start-new__title").html(  
                            '<div class="full-logo-wrapper">' +  
                                '<img src="' + cachedLogo + '" style="min-width: 300px; min-height: 90px;" />' +  
                            '</div>'  
                        );  
                        contentContainer.css("opacity", "1");  
                    };  
                    img.onerror = function() {  
                        contentContainer.css("opacity", "1");  
                    };  
                    img.src = cachedLogo;  
                    return;  
                }  
  
                // Ховаємо текст до завантаження логотипу  
                var contentContainer = a.object.activity.render().find(".full-start-new__body");  
                contentContainer.css("opacity", "0");  
  
                // Показуємо індикатор завантаження  
                a.object.activity.render().find(".full-start-new__title").html(  
                    '<div class="logo-loading">Завантаження логотипа...</div>'  
                );  
  
                // API логотипів  
                var imgApi = Lampa.TMDB.api(apiPath + "/images?api_key=" + Lampa.TMDB.key());  
  
                $.get(imgApi, function(response) {  
                    try {  
                        console.log('[Logo Plugin] API response received for:', movieId);  
                          
                        if (response.logos && response.logos.length > 0) {  
                            // Розширений пріоритет мов  
                            var logoPriority = ['uk', 'ru', 'en', 'de', 'fr', 'es', 'it', 'pt'];  
                            var selectedLogo = null;  
  
                            for (var i = 0; i < logoPriority.length; i++) {  
                                selectedLogo = response.logos.find(l => l.iso_639_1 === logoPriority[i]);  
                                if (selectedLogo) {  
                                    console.log('[Logo Plugin] Found logo with language:', logoPriority[i]);  
                                    break;  
                                }  
                            }  
  
                            if (!selectedLogo) {  
                                selectedLogo = response.logos[0];  
                                console.log('[Logo Plugin] Using first available logo');  
                            }  
  
                            if (selectedLogo && selectedLogo.file_path) {  
                                var logoPath = Lampa.TMDB.image("/t/p/w300" + selectedLogo.file_path.replace(".svg", ".png"));  
                                  
                                // Кешуємо логотип  
                                cacheLogo(movieId, logoPath);  
  
                                var img = new Image();  
                                img.onload = function() {  
                                    try {  
                                        // Примусово встановлюємо розміри через JavaScript  
                                        img.style.minWidth = '300px';  
                                        img.style.minHeight = '90px';  
                                          
                                        a.object.activity.render().find(".full-start-new__title").html(  
                                            '<div class="full-logo-wrapper">' +  
                                                '<img src="' + logoPath + '" style="min-width: 300px; min-height: 90px;" />' +  
                                            '</div>'  
                                        );  
  
                                        contentContainer.css("opacity", "1");  
                                        console.log('[Logo Plugin] Logo displayed successfully for:', movieId);  
                                    } catch (error) {  
                                        console.error('[Logo Plugin] Error displaying logo:', error);  
                                        contentContainer.css("opacity", "1");  
                                    }  
                                };  
  
                                img.onerror = function() {  
                                    console.error('[Logo Plugin] Failed to load logo image:', logoPath);  
                                    contentContainer.css("opacity", "1");  
                                };  
  
                                img.src = logoPath;  
                            } else {  
                                console.log('[Logo Plugin] No valid logo found for:', movieId);  
                                contentContainer.css("opacity", "1");  
                            }  
                        } else {  
                            console.log('[Logo Plugin] No logos in response for:', movieId);  
                            contentContainer.css("opacity", "1");  
                        }  
                    } catch (error) {  
                        console.error('[Logo Plugin] Error processing logo response:', error);  
                        contentContainer.css("opacity", "1");  
                    }  
                }).fail(function() {  
                    console.error('[Logo Plugin] Failed to fetch logos from API');  
                    contentContainer.css("opacity", "1");  
                });  
            } catch (error) {  
                console.error('[Logo Plugin] Error in full event handler:', error);  
            }  
        }  
    }));  
  
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
})();
