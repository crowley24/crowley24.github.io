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
        
    // Ключ для збереження стану плагіна    
    const ENABLED_KEY = "simple_logo_enabled";    
        
    window.logoplugin || (window.logoplugin = !0, Lampa.Listener.follow("full", (function(a) {    
        if ("complite" == a.type) {    
                
            // Перевіряємо, чи увімкнено плагін    
            var enabled = Lampa.Storage.get(ENABLED_KEY, !0);    
            if (!enabled) return;    
                
            var contentContainer = $(".full-start-new__title");    
            if (contentContainer.length === 0) return;    
                
            // Отримуємо дані фільму/серіалу    
            var card = a.data.card;    
            if (!card) return;    
                
            var title = card.title || card.name;    
            var originalTitle = card.original_title || card.original_name;    
            var year = card.release_date ? card.release_date.split("-")[0] : (card.first_air_date ? card.first_air_date.split("-")[0] : "");    
            var kpId = card.kinopoisk_id;    
                
            // Визначаємо мову запиту    
            var lang = Lampa.Storage.get("language", "uk");    
                
            // Запит до API для отримання логотипів    
            var apiUrl = "https://api.kinopoisk.dev/v1.4/logo?token=YOUR_TOKEN&page=1&limit=10";    
                
            if (kpId) {    
                apiUrl += "&kinopoiskId=" + kpId;    
            } else if (originalTitle && year) {    
                apiUrl += "&title=" + encodeURIComponent(originalTitle) + "&year=" + year;    
            } else if (title && year) {    
                apiUrl += "&title=" + encodeURIComponent(title) + "&year=" + year;    
            } else {    
                console.log("Недостатньо даних для пошуку логотипа");    
                contentContainer.css("opacity", "1");    
                return;    
            }    
                
            // Робимо контейнер напівпрозорим на час завантаження    
            contentContainer.css("opacity", "0.3");    
                
            // Виконуємо запит    
            Lampa.Api.ajax({    
                url: apiUrl,    
                type: "GET",    
                dataType: "json"    
            }, (function(data) {    
                if (data && data.docs && data.docs.length > 0) {    
                    var logos = data.docs[0].logos;    
                    if (logos && logos.length > 0) {    
                        var logoUrl = logos[0].url;    
                        if (logoUrl) {    
                            // Створюємо елемент логотипа    
                            var logoImg = $("<img>").attr("src", logoUrl).attr("alt", "Logo");    
                                
                            // Додаємо логотип перед назвою    
                            contentContainer.prepend(logoImg);    
                                
                            // Показуємо контейнер з логотипом    
                            contentContainer.css("opacity", "1");    
                        }    
                    } else {    
                        console.log("Логотипи відсутні");    
                        contentContainer.css("opacity", "1");    
                    }    
                }    
            })).fail(function() {    
                console.log("Помилка запиту логотипів");    
                contentContainer.css("opacity", "1");    
            });    
        }    
    })))    
}();
