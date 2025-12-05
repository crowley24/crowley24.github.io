!function() {  
    "use strict";  
  
    // --- СТИЛІ ДЛЯ РОЗМІРУ ЛОГО ---  
    var style = document.createElement('style');  
    style.textContent = `  
        .cardify .full-start-new__title {  
            text-shadow: none !important;  
        }  
  
        /* Обмеження логотипу */  
        .full-start-new__title img {  
            max-width: 25vw !important;  /* максимум 25% ширини екрану */  
            max-height: 12vh !important; /* максимум 12% висоти екрану */  
            width: auto !important;  
            height: auto !important;  
            object-fit: contain !important;  
            display: block;  
            margin-top: 5px !important;  
        }  
  
        /* Контейнер */  
        .full-logo-wrapper {  
            display: flex;  
            flex-direction: column;  
            align-items: flex-start;  
        }  
  
        @media (max-width: 768px) {  
            .full-start-new__title img {  
                max-width: 40vw !important; /* більше місця на мобільних */  
                max-height: 10vh !important;  
            }  
            .full-logo-wrapper {  
                align-items: center !important;  
            }  
        }  
    `;  
    document.head.appendChild(style);  
  
    // --- ОСНОВНИЙ ПЛАГІН ---  
    window.logoplugin || (window.logoplugin = !0, Lampa.Listener.follow("full", function(a) {  
        if ("complite" == a.type) {  
            var e = a.data.movie;  
            var isSerial = e.name || e.first_air_date;  
            var apiPath = isSerial ? "tv/" + e.id : "movie/" + e.id;  
  
            // Ховаємо текст до завантаження логотипу  
            var contentContainer = a.object.activity.render().find(".full-start-new__body");  
            contentContainer.css("opacity", "0");  
  
            // API логотипів  
            var imgApi = Lampa.TMDB.api(apiPath + "/images?api_key=" + Lampa.TMDB.key());  
  
            $.get(imgApi, function(e) {  
                if (e.logos && e.logos.length > 0) {  
                    var logo = e.logos.find(l => l.iso_639_1 === "uk");  
  
                    if (!logo) {  
                        logo = e.logos.find(l => l.iso_639_1 === "en");  
                    }  
                    if (!logo) {  
                        logo = e.logos[0];  
                    }  
  
                    if (logo && logo.file_path) {  
                        var logoPath = Lampa.TMDB.image("/t/p/w300" + logo.file_path.replace(".svg", ".png"));  
  
                        var img = new Image();  
                        img.onload = function() {  
                            // Завжди показуємо тільки логотип без тексту  
                            a.object.activity.render().find(".full-start-new__title").html(  
                                '<div class="full-logo-wrapper">' +  
                                    '<img src="' + logoPath + '" />' +  
                                '</div>'  
                            );  
  
                            contentContainer.css("opacity", "1");  
                        };  
  
                        img.onerror = function() {  
                            contentContainer.css("opacity", "1");  
                        };  
  
                        img.src = logoPath;  
                    } else {  
                        contentContainer.css("opacity", "1");  
                    }  
                } else {  
                    contentContainer.css("opacity", "1");  
                }  
            }).fail(function() {  
                contentContainer.css("opacity", "1");  
            });  
        }  
    }));  
}();
