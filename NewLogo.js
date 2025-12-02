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
        }  
    `;  
    document.head.appendChild(style);  
      
    // Ключ для збереження стану плагіна  
    const ENABLED_KEY = "simple_logo_enabled";  
      
    window.logoplugin || (window.logoplugin = !0, Lampa.Listener.follow("full", (function(a) {  
        if ("complite" == a.type) {  
              
            // Перевіряємо, чи увімкнено плагін  
            const isEnabled = Lampa.Storage.get(ENABLED_KEY, true);  
            if (!isEnabled) return;  
              
            var e = a.data.movie;  
            var isSerial = e.name || e.first_air_date;  
            var apiPath = isSerial ? "tv/" + e.id : "movie/" + e.id;  
              
            // Ховаємо контент до завантаження логотипа  
            var contentContainer = a.object.activity.render().find(".full-start-new__body");  
            contentContainer.css("opacity", "0");  
              
            // Отримуємо українську назву з перекладів  
            var translationsApi = Lampa.TMDB.api(apiPath + "/translations?api_key=" + Lampa.TMDB.key());  
            console.log("API URL для перекладів:", translationsApi);  
              
            $.get(translationsApi, (function(translationsData) {  
                var ukrainianTitle = null;  
                  
                // Шукаємо український переклад  
                if (translationsData.translations) {  
                    var ukTranslation = translationsData.translations.find(function(t) {   
                        return t.iso_639_1 === "uk" || t.iso_3166_1 === "UA";   
                    });  
                    if (ukTranslation && ukTranslation.data) {  
                        ukrainianTitle = isSerial ? ukTranslation.data.name : ukTranslation.data.title;  
                    }  
                }  
                  
                // Якщо не знайшли в перекладах, беремо з основного об'єкта  
                if (!ukrainianTitle) {  
                    ukrainianTitle = isSerial ? e.name : e.title;  
                }  
                  
                console.log("Українська назва:", ukrainianTitle);  
                  
                // Тепер запитуємо логотипи  
                var t = Lampa.TMDB.api(apiPath + "/images?api_key=" + Lampa.TMDB.key());  
                console.log("API URL для логотипів:", t);  
                  
                $.get(t, (function(e) {  
                    if (e.logos && e.logos.length > 0) {  
                        console.log("Всі логотипи:", e.logos);  
                        var logo = e.logos.find(function(l) { return l.iso_639_1 === "uk"; });  
                        var isUkrainianLogo = !!logo;  
                        if (!logo) {  
                            logo = e.logos.find(function(l) { return l.iso_639_1 === "en"; });  
                            console.log("Англійський логотип:", logo ? "знайдено" : "не знайдено");  
                        }  
                        if (!logo) {  
                            logo = e.logos[0];  
                            console.log("Взято перший доступний логотип:", logo);  
                        }  
                        if (logo && logo.file_path) {  
                            var logoPath = Lampa.TMDB.image("/t/p/w300" + logo.file_path.replace(".svg", ".png"));  
                            console.log("Відображаємо логотип:", logoPath);  
  
                            // Попередньо завантажуємо зображення  
                            var img = new Image();  
                            img.onload = function() {  
                                // Визначаємо параметри залежно від пристрою  
                                var isMobile = window.innerWidth <= 768;  
                                var fontSize = "0.5em";  
                                var marginTop = "1px";  
                                var logoHeight = isMobile ? "auto" : "1em";  
                                var alignItems = isMobile ? "center" : "flex-start";  
                                  
                                // Якщо логотип не український, показуємо українську назву  
                                if (!isUkrainianLogo && ukrainianTitle) {  
                                    a.object.activity.render().find(".full-start-new__title").html(  
                                        '<div style="display: flex; flex-direction: column; align-items: ' + alignItems + ';">' +  
                                            '<img style="margin-top: 5px; max-height: ' + logoHeight + ' !important; max-width: none !important; width: auto !important; height: ' + logoHeight + ' !important;" src="' + logoPath + '" />' +  
                                            '<span style="margin-top: ' + marginTop + '; font-size: ' + fontSize + '; color: #fff;">' + ukrainianTitle + '</span>' +  
                                        '</div>'  
                                    );  
                                } else {  
                                    a.object.activity.render().find(".full-start-new__title").html(  
                                        '<div style="display: flex; flex-direction: column; align-items: ' + alignItems + ';">' +  
                                            '<img style="margin-top: 5px; max-height: ' + logoHeight + ' !important; max-width: none !important; width: auto !important; height: ' + logoHeight + ' !important;" src="' + logoPath + '" />' +  
                                        '</div>'  
                                    );  
                                }  
                                // Показуємо контент  
                                contentContainer.css("opacity", "1");  
                            };  
                            img.onerror = function() {  
                                console.log("Помилка завантаження зображення логотипа");  
                                contentContainer.css("opacity", "1");  
                            };  
                            img.src = logoPath;  
                        } else {  
                            console.log("Логотип невалідний (немає file_path):", logo);  
                            contentContainer.css("opacity", "1");  
                        }  
                    } else {  
                        console.log("Логотипи відсутні");  
                        contentContainer.css("opacity", "1");  
                    }  
                })).fail(function() {  
                    console.log("Помилка запиту логотипів");  
                    contentContainer.css("opacity", "1");  
                });  
            })).fail(function() {  
                console.log("Помилка запиту перекладів, використовуємо оригінальну назву");  
                contentContainer.css("opacity", "1");  
            });  
        }  
    })))  
}();
