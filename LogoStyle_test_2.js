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
    style.textContent =   
        '.cardify .full-start-new__title{text-shadow:none!important}' +  
        '.full-start-new__title img{' +  
            'min-width:350px!important;' +  
            'min-height:100px!important;' +  
            'max-width:40vw!important;' +  
            'max-height:20vh!important;' +  
            'width:auto!important;' +  
            'height:auto!important;' +  
            'object-fit:contain!important;' +  
            'display:block!important;' +  
            'margin:5px auto 0!important;' +  
            'transform:none!important;' +  
            '-webkit-transform:none!important;' +  
            '-moz-transform:none!important;' +  
            '-ms-transform:none!important;' +  
            '-o-transform:none!important' +  
        '}' +  
        '.full-logo-wrapper{' +  
            'display:flex!important;' +  
            'flex-direction:column!important;' +  
            'align-items:flex-start!important;' +  
            'justify-content:center!important;' +  
            'width:100%!important;' +  
            'min-height:100px!important' +  
        '}' +  
        '@media (max-width:768px){' +  
            '.full-start-new__title img{' +  
                'min-width:250px!important;' +  
                'min-height:75px!important;' +  
                'max-width:60vw!important;' +  
                'max-height:25vh!important' +  
            '}' +  
        '}';  
    document.head.appendChild(style);  
  
    // --- Функція відображення логотипа ---  
    function displayLogo(activityObject, logoPath) {  
        try {  
            var titleElement = activityObject.activity.render().find('.full-start-new__title');  
            titleElement.html(  
                '<div class="full-logo-wrapper">' +  
                    '<img src="' + logoPath + '" style="min-width:350px;min-height:100px;" />' +  
                '</div>'  
            );  
        } catch (error) {  
            console.error('[Logo Plugin] Error displaying logo:', error);  
        }  
    }  
  
    // --- Основний плагін ---  
    Lampa.Listener.follow('full', function(event) {  
        if (event.type === 'complite') {  
            try {  
                var movie = event.data.movie;  
                var isSerial = movie.name || movie.first_air_date;  
                var apiPath = isSerial ? 'tv/' + movie.id : 'movie/' + movie.id;  
                var movieId = movie.id;  
  
                // Перевірка кешу  
                var cachedLogo = getCachedLogo(movieId);  
                if (cachedLogo) {  
                    displayLogo(event.object, cachedLogo);  
                    return;  
                }  
  
                // API запит  
                var apiUrl = Lampa.TMDB.api(apiPath + '/images?include_image_language=uk,en,null');  
                  
                $.ajax({  
                    url: apiUrl,  
                    type: 'GET',  
                    success: function(response) {  
                        try {  
                            if (response && response.logos && response.logos.length > 0) {  
                                var selectedLogo = null;  
                                var logoPriority = ['uk', 'en'];  
                                  
                                // Пошук логотипа за пріоритетом  
                                for (var i = 0; i < logoPriority.length; i++) {  
                                    var currentLang = logoPriority[i];  
                                    selectedLogo = response.logos.find(function(logo) {  
                                        return logo.iso_639_1 === currentLang;  
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
                                    displayLogo(event.object, logoPath);  
                                }  
                            }  
                        } catch (error) {  
                            console.error('[Logo Plugin] Error processing logo response:', error);  
                        }  
                    },  
                    error: function() {  
                        console.error('[Logo Plugin] Failed to fetch logos from API');  
                    }  
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
            return 'uk';  
        }  
    };  
  
    console.log('[Logo Plugin] Successfully initialized');  
}();
