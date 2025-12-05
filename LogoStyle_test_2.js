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
            align-items: center;  
            justify-content: center;  
            min-height: 60px;  
        }  
  
        /* Текст під логотипом */  
        .full-logo-text {  
            font-size: 0.9em;  
            color: rgba(255, 255, 255, 0.8);  
            margin-top: 5px;  
            text-align: center;  
        }  
    `;  
    document.head.appendChild(style);  
  
    // --- ГОЛОВНА ФУНКЦІЯ ---  
    Lampa.Listener.follow('full', function(e) {  
        if (e.type === 'complite') {  
            var data = e.data;  
            var render = e.object.activity.render();  
              
            // Перевіряємо, чи це фільм/серіал  
            if (!data.movie) return;  
              
            var movie = data.movie;  
            var isSerial = movie.number_of_seasons > 0 || movie.number_of_episodes > 0;  
              
            // API шляхи  
            var apiPath = isSerial ? '/tv/' + movie.id : '/movie/' + movie.id;  
            var logosApi = Lampa.TMDB.api(apiPath + "/images?api_key=" + Lampa.TMDB.key() + "&include_image_language=uk,en,null");  
              
            // API перекладів  
            var translationsApi = Lampa.TMDB.api(apiPath + "/translations?api_key=" + Lampa.TMDB.key());  
              
            // Отримуємо контейнер назви  
            var titleContainer = render.find('.full-start-new__title');  
            if (!titleContainer.length) return;  
              
            // Зберігаємо оригінальний текст  
            var originalText = titleContainer.html();  
              
            // Показуємо індикатор завантаження  
            titleContainer.css("opacity", "0.3");  
              
            // Завантажуємо логотипи  
            $.get(logosApi, function(logosData) {  
                if (logosData.logos && logosData.logos.length > 0) {  
                    // Сортуємо за пріоритетом: український → англійський → оригінальний  
                    var ukrainianLogo = logosData.logos.find(l => l.iso_639_1 === "uk");  
                    var englishLogo = logosData.logos.find(l => l.iso_639_1 === "en");  
                    var originalLogo = logosData.logos.find(l => l.iso_639_1 === null);  
                      
                    var selectedLogo = ukrainianLogo || englishLogo || originalLogo;  
                      
                    if (selectedLogo) {  
                        // Завантажуємо переклади для тексту під логотипом  
                        $.get(translationsApi, function(translationsData) {  
                            var ukrainianTitle = null;  
                            var englishTitle = null;  
                            var originalTitle = isSerial ? movie.name : movie.title;  
                              
                            if (translationsData.translations) {  
                                var ukTranslation = translationsData.translations.find(t => t.iso_639_1 === "uk");  
                                var enTranslation = translationsData.translations.find(t => t.iso_639_1 === "en");  
                                  
                                if (ukTranslation && ukTranslation.data) {  
                                    ukrainianTitle = isSerial ? ukTranslation.data.name : ukTranslation.data.title;  
                                }  
                                if (enTranslation && enTranslation.data) {  
                                    englishTitle = isSerial ? enTranslation.data.name : enTranslation.data.title;  
                                }  
                            }  
                              
                            // Визначаємо текст для відображення  
                            var displayText = originalTitle;  
                            if (selectedLogo.iso_639_1 === "uk" && ukrainianTitle) {  
                                displayText = ukrainianTitle;  
                            } else if (selectedLogo.iso_639_1 === "en" && englishTitle) {  
                                displayText = englishTitle;  
                            }  
                              
                            // Створюємо логотип  
                            var logoSize = Lampa.Storage.get("logo_size", "original");  
                            var logoPath = "https://image.tmdb.org/t/p/" + logoSize + selectedLogo.file_path;  
                              
                            var contentContainer = $('<div class="full-logo-wrapper"></div>');  
                            var img = $('<img class="full-logo-img" />');  
                              
                            img.on('load', function() {  
                                contentContainer.append(img);  
                                  
                                // Додаємо текст тільки якщо логотип не український  
                                if (selectedLogo.iso_639_1 !== "uk" && displayText !== originalTitle) {  
                                    var textDiv = $('<div class="full-logo-text">' + displayText + '</div>');  
                                    contentContainer.append(textDiv);  
                                }  
                                  
                                titleContainer.empty().append(contentContainer);  
                                titleContainer.css("opacity", "1");  
                            });  
                              
                            img.on('error', function() {  
                                titleContainer.css("opacity", "1");  
                            });  
  
                            img.src = logoPath;  
                        }).fail(function() {  
                            titleContainer.css("opacity", "1");  
                        });  
                    } else {  
                        titleContainer.css("opacity", "1");  
                    }  
                } else {  
                    titleContainer.css("opacity", "1");  
                }  
            }).fail(function() {  
                titleContainer.css("opacity", "1");  
            });  
        }  
    }));  
}();
