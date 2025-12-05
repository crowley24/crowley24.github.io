!function() {  
    "use strict";  
  
    // --- Функція для отримання налаштувань мови логотипів ---  
    function getLogoLanguage() {  
        // Можливі значення: 'ru', 'en', 'uk', 'bg', 'zh', 'pt', 'he', 'cs', 'be'  
        return localStorage.getItem('logo_plugin_language') || 'ru';  
    }  
  
    function setLogoLanguage(lang) {  
        localStorage.setItem('logo_plugin_language', lang);  
    }  
  
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
  
            // Отримуємо бажану мову логотипу  
            var preferredLogoLang = getLogoLanguage();  
  
            // Ховаємо текст до завантаження логотипу  
            var contentContainer = a.object.activity.render().find(".full-start-new__body");  
            contentContainer.css("opacity", "0");  
  
            // API перекладів  
            var translationsApi = Lampa.TMDB.api(apiPath + "/translations?api_key=" + Lampa.TMDB.key());  
  
            $.get(translationsApi, function(translationsData) {  
                var localizedTitle = null;  
  
                if (translationsData.translations) {  
                    var translation = translationsData.translations.find(t =>  
                        t.iso_639_1 === preferredLogoLang || t.iso_3166_1 === preferredLogoLang.toUpperCase()  
                    );  
                    if (translation && translation.data) {  
                        localizedTitle = isSerial ? translation.data.name : translation.data.title;  
                    }  
                }  
  
                // Якщо не знайдено переклад бажаною мовою, використовуємо оригінальну назву  
                if (!localizedTitle) localizedTitle = isSerial ? e.name : e.title;  
  
                // API логотипів  
                var imgApi = Lampa.TMDB.api(apiPath + "/images?api_key=" + Lampa.TMDB.key());  
  
                $.get(imgApi, function(e) {  
                    if (e.logos && e.logos.length > 0) {  
                        // Шукаємо логотип бажаною мовою  
                        var logo = e.logos.find(l => l.iso_639_1 === preferredLogoLang);  
                        var isPreferredLogo = !!logo;  
  
                        if (!logo) {  
                            // Якщо немає бажаної мови, шукаємо англійську  
                            logo = e.logos.find(l => l.iso_639_1 === "en");  
                        }  
                        if (!logo) {  
                            // Якщо немає англійської, беремо перший доступний  
                            logo = e.logos[0];  
                        }  
  
                        if (logo && logo.file_path) {  
                            var logoPath = Lampa.TMDB.image("/t/p/w300" + logo.file_path.replace(".svg", ".png"));  
  
                            var img = new Image();  
                            img.onload = function() {  
                                // Якщо логотип НЕ бажаною мовою — додаємо текст  
                                if (!isPreferredLogo && localizedTitle) {  
                                    a.object.activity.render().find(".full-start-new__title").html(  
                                        '<div class="full-logo-wrapper">' +  
                                            '<img src="' + logoPath + '" />' +  
                                            '<span style="margin-top:2px;font-size:0.55em;color:#fff;">' + localizedTitle + '</span>' +  
                                        '</div>'  
                                    );  
                                } else {  
                                    a.object.activity.render().find(".full-start-new__title").html(  
                                        '<div class="full-logo-wrapper">' +  
                                            '<img src="' + logoPath + '" />' +  
                                        '</div>'  
                                    );  
                                }  
  
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
  
            }).fail(function() {  
                contentContainer.css("opacity", "1");  
            });  
        }  
    }));  
  
    // --- Додаємо функції для зміни мови в глобальну область ---  
    window.logoPlugin = {  
        setLanguage: setLogoLanguage,  
        getLanguage: getLogoLanguage  
    };  
})();
