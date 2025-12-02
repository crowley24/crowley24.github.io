!function() {    
    "use strict";    
        
    // Додаємо CSS стилі    
    var style = document.createElement('style');    
    style.textContent = `    
        .cardify .full-start-new__title {    
            text-shadow: none !important;    
        }    
        .full-start-new__title img {    
            max-width: none !important;    
            width: auto !important;    
            height: auto !important;    
            object-fit: contain !important;    
        }    
    `;    
    document.head.appendChild(style);    
        
    // Ключ для збереження стану плагіна    
    const ENABLED_KEY = "simple_logo_enabled";    
        
    window.logoplugin || (window.logoplugin = !0, Lampa.Listener.follow("full", (function(a) {    
        if ("complite" == a.type) {    
                
            // Перевіряємо, чи увімкнено плагін    
            if (Lampa.Storage.get(ENABLED_KEY, "0") === "1") {    
                var contentContainer = $(".full-start-new__title");    
                var originalTitle = contentContainer.text().trim();    
                    
                if (!originalTitle) return;    
                    
                // Отримуємо налаштування мови логотипа    
                var logoLang = Lampa.Storage.get("logo_language", "null");    
                var useTextHeight = Lampa.Storage.get("logo_use_text_height", false);    
                    
                // Визначаємо висоту тексту для розміру логотипа    
                var textHeight = 0;    
                if (useTextHeight) {    
                    var tempSpan = $("<span>").text(originalTitle).css({    
                        "visibility": "hidden",    
                        "position": "absolute",    
                        "white-space": "nowrap"    
                    });    
                    $("body").append(tempSpan);    
                    textHeight = tempSpan.height();    
                    tempSpan.remove();    
                }    
                    
                // Запит до TMDB API для логотипів    
                var movieData = a.data.movie;    
                var tmdbId = movieData.id;    
                var mediaType = movieData.number_of_seasons ? "tv" : "movie";    
                var cacheKey = "logo_" + mediaType + "_" + tmdbId + "_" + logoLang;    
                    
                // Перевіряємо кеш    
                var cachedLogo = Lampa.Storage.get(cacheKey, null);    
                if (cachedLogo && cachedLogo !== "none") {    
                    displayLogo(cachedLogo, textHeight, useTextHeight);    
                    return;    
                }    
                    
                // Формуємо URL запиту    
                var apiUrl = "https://api.themoviedb.org/3/" + mediaType + "/" + tmdbId + "/images";    
                var params = {    
                    api_key: "YOUR_TMDB_API_KEY",    
                    include_image_language: logoLang === "null" ? "en,null" : logoLang + ",en,null"    
                };    
                    
                // Виконуємо запит    
                $.ajax({    
                    url: apiUrl,    
                    data: params,    
                    dataType: "json",    
                    success: function(response) {    
                        if (response.logos && response.logos.length > 0) {    
                            // Вибираємо перший логотип    
                            var logo = response.logos[0];    
                            var logoUrl = "https://image.tmdb.org/t/p/original" + logo.file_path;    
                                
                            // Зберігаємо в кеш    
                            Lampa.Storage.set(cacheKey, logoUrl);    
                                
                            displayLogo(logoUrl, textHeight, useTextHeight);    
                        } else {    
                            Lampa.Storage.set(cacheKey, "none");    
                            contentContainer.css("opacity", "1");    
                        }    
                    },    
                    error: function() {    
                        Lampa.Storage.set(cacheKey, "none");    
                        contentContainer.css("opacity", "1");    
                    }    
                });    
                    
                // Функція відображення логотипа    
                function displayLogo(logoUrl, textHeight, useTextHeight) {    
                    var img = new Image();    
                    img.onload = function() {    
                        contentContainer.empty();    
                            
                        // Нова логіка розміру логотипа    
                        if (useTextHeight && textHeight) {    
                            img.style.height = textHeight + "px";    
                            img.style.width = "auto";    
                        } else if (window.innerWidth < 768) {    
                            img.style.width = "100%";    
                            img.style.height = "auto";    
                        } else {    
                            img.style.width = "7em";    
                            img.style.height = "auto";    
                        }    
                            
                        img.style.display = "block";    
                        img.style.margin = "0 auto";    
                        contentContainer.append(img);    
                        contentContainer.css("opacity", "1");    
                    };    
                    img.src = logoUrl;    
                }    
            }    
        }    
    })))    
}();
