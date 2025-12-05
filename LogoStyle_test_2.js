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
  
    // --- СТИЛІ з покращеним позиціонуванням та розміром ---  
    var style = document.createElement('style');  
    style.textContent = '\n        .cardify .full-start-new__title {\n            text-shadow: none !important;\n        }\n\n        /* Агресивні правила з вищою специфічністю */\n        .cardify .full-start-new__title img,\n        .full-start-new__title img,\n        .full-logo-wrapper img {\n            /* Примусові мінімальні розміри - збільшено */\n            min-width: 350px !important;\n            min-height: 100px !important;\n            \n            /* Примусові максимальні розміри - збільшено */\n            max-width: 45vw !important;\n            max-height: 25vh !important;\n            \n            /* Примусові базові властивості */\n            width: auto !important;\n            height: auto !important;\n            object-fit: contain !important;\n            display: block !important;\n            margin: 5px 0 0 !important;\n            \n            /* Вимкнення будь-яких трансформацій */\n            transform: none !important;\n            -webkit-transform: none !important;\n            -moz-transform: none !important;\n            -ms-transform: none !important;\n            -o-transform: none !important;\n        }\n\n        /* Контейнер з вирівнюванням зліва */\n        .full-logo-wrapper {\n            display: flex !important;\n            flex-direction: column !important;\n            align-items: flex-start !important; /* Змінено на flex-start для вирівнювання зліва */\n            justify-content: flex-start !important;\n            width: 100% !important;\n            min-height: 120px !important;\n        }\n\n        /* Додатково для мобільних */\n        @media (max-width: 768px) {\n            .cardify .full-start-new__title img,\n            .full-start-new__title img,\n            .full-logo-wrapper img {\n                min-width: 280px !important;\n                min-height: 80px !important;\n                max-width: 65vw !important;\n                max-height: 30vh !important;\n            }\n        }\n        \n        /* Для дуже великих екранів */\n        @media (min-width: 1920px) {\n            .cardify .full-start-new__title img,\n            .full-start-new__title img,\n            .full-logo-wrapper img {\n                min-width: 450px !important;\n                min-height: 130px !important;\n                max-width: 40vw !important;\n                max-height: 22vh !important;\n            }\n        }\n    ';  
    document.head.appendChild(style);  
  
    // --- Функція відображення логотипа ---  
    function displayLogo(activity, logoPath) {  
        try {  
            var img = new Image();  
            img.onload = function() {  
                // Примусово встановлюємо розміри через JavaScript  
                img.style.minWidth = '350px';  
                img.style.minHeight = '100px';  
                img.style.maxWidth = '45vw';  
                img.style.maxHeight = '25vh';  
                  
                activity.render().find('.full-start-new__title').html(  
                    '<div class="full-logo-wrapper">' +  
                        '<img src="' + logoPath + '" style="min-width: 350px; min-height: 100px;" />' +  
                    '</div>'  
                );  
            };  
  
            img.onerror = function() {  
                console.error('[Logo Plugin] Failed to load logo image:', logoPath);  
            };  
  
            img.src = logoPath;  
        } catch (error) {  
            console.error('[Logo Plugin] Error displaying logo:', error);  
        }  
    }  
  
    // --- Основний плагін ---  
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
                    displayLogo(e.object, cachedLogo);  
                    return;  
                }  
  
                // API запит логотипів  
                var imgApi = Lampa.TMDB.api(apiPath + '/images?api_key=' + Lampa.TMDB.key());  
  
                $.get(imgApi, function(response) {  
                    if (response.logos && response.logos.length > 0) {  
                        // Змінений пріоритет мов: українська → англійська → всі інші  
                        var logoPriority = ['uk', 'en'];  
                        var selectedLogo = null;  
  
                        // Спочатку шукаємо українську  
                        selectedLogo = response.logos.find(function(logo) {  
                            return logo.iso_639_1 === 'uk';  
                        });  
  
                        // Потім англійську  
                        if (!selectedLogo) {  
                            selectedLogo = response.logos.find(function(logo) {  
                                return logo.iso_639_1 === 'en';  
                            });  
                        }  
  
                        // Якщо немає української чи англійської, беремо перший доступний  
                        if (!selectedLogo) {  
                            selectedLogo = response.logos[0];  
                        }  
  
                        if (selectedLogo && selectedLogo.file_path) {  
                            var logoPath = Lampa.TMDB.image('/t/p/w300' + selectedLogo.file_path.replace('.svg', '.png'));  
                              
                            // Зберігаємо в кеш  
                            cacheLogo(movieId, logoPath);  
                              
                            // Відображаємо логотип  
                            displayLogo(e.object, logoPath);  
                        }  
                    }  
                }).fail(function() {  
                    console.error('[Logo Plugin] Failed to fetch logos from API');  
                });  
            } catch (error) {  
                console.error('[Logo Plugin] Error in full event handler:', error);  
            }  
        }  
    });  
  
    // Глобальні функції для зворотної сумісності  
    window.logoPlugin = {  
        setLanguage: function(lang) {  
            console.log('[Logo Plugin] Language setting not implemented in this version');  
        },  
        getLanguage: function() {  
            return 'uk'; // Завжди українська за замовчуванням  
        }  
    };  
  
    console.log('[Logo Plugin] Successfully initialized with left alignment and larger size');  
}();
