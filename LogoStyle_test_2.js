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
            min-height: 80px;  
        }  
  
        /* Текст під логотипом */  
        .full-logo-text {  
            margin-top: 8px;  
            font-size: 1.1em;  
            color: rgba(255, 255, 255, 0.9);  
            text-align: center;  
            line-height: 1.3;  
        }  
    `;  
    document.head.appendChild(style);  
  
    // --- ОСНОВНИЙ КОД ПЛАГІНА ---  
    Lampa.Listener.follow('full', function (e) {  
        if (e.type === 'complite') {  
            var data = e.data;  
            var contentContainer = $('.full-start-new__title');  
              
            if (!contentContainer.length) return;  
  
            // Приховуємо контейнер на час завантаження  
            contentContainer.css('opacity', '0');  
  
            var movieId = data.movie.id;  
            var movieTitle = data.movie.title;  
            var isSerial = data.movie.number_of_seasons > 0 || data.movie.number_of_episodes > 0;  
              
            // API шляхи  
            var apiPath = isSerial ? '/tv/' + movieId : '/movie/' + movieId;  
            var apiKey = Lampa.TMDB.key();  
  
            // API логотипів  
            var logosApi = Lampa.TMDB.api(apiPath + '/images?api_key=' + apiKey + '&include_image_language=uk,ru,en,null');  
  
            // API перекладів  
            var translationsApi = Lampa.TMDB.api(apiPath + '/translations?api_key=' + apiKey);  
  
            // Завантажуємо логотипи  
            $.get(logosApi, function (logosData) {  
                var ukrainianLogo = null;  
                var englishLogo = null;  
                var russianLogo = null;  
  
                if (logosData.logos) {  
                    // Шукаємо український логотип  
                    ukrainianLogo = logosData.logos.find(function (logo) {  
                        return logo.iso_639_1 === 'uk';  
                    });  
  
                    // Шукаємо англійський логотип  
                    englishLogo = logosData.logos.find(function (logo) {  
                        return logo.iso_639_1 === 'en';  
                    });  
  
                    // Шукаємо російський логотип  
                    russianLogo = logosData.logos.find(function (logo) {  
                        return logo.iso_639_1 === 'ru';  
                    });  
                }  
  
                // Вибираємо логотип за пріоритетом: український > англійський > російський  
                var selectedLogo = ukrainianLogo || englishLogo || russianLogo;  
  
                if (selectedLogo) {  
                    // Завантажуємо переклади для тексту під логотипом  
                    $.get(translationsApi, function (translationsData) {  
                        var ukrainianTitle = null;  
                        var englishTitle = null;  
                        var originalTitle = movieTitle;  
  
                        if (translationsData.translations) {  
                            // Шукаємо український переклад  
                            var ukTranslation = translationsData.translations.find(function (t) {  
                                return t.iso_639_1 === 'uk';  
                            });  
                            if (ukTranslation && ukTranslation.data) {  
                                ukrainianTitle = isSerial ? ukTranslation.data.name : ukTranslation.data.title;  
                            }  
  
                            // Шукаємо англійський переклад  
                            var enTranslation = translationsData.translations.find(function (t) {  
                                return t.iso_639_1 === 'en';  
                            });  
                            if (enTranslation && enTranslation.data) {  
                                englishTitle = isSerial ? enTranslation.data.name : enTranslation.data.title;  
                            }  
                        }  
  
                        // Визначаємо текст для відображення  
                        var displayText = originalTitle;  
                        if (selectedLogo.iso_639_1 !== 'uk' && ukrainianTitle) {  
                            displayText = ukrainianTitle;  
                        } else if (selectedLogo.iso_639_1 !== 'en' && englishTitle) {  
                            displayText = englishTitle;  
                        }  
  
                        // Створюємо HTML для логотипа  
                        var logoSize = 'w500';  
                        var logoPath = 'https://image.tmdb.org/t/p/' + logoSize + selectedLogo.file_path;  
                          
                        var logoHtml = `  
                            <div class="full-logo-wrapper">  
                                <img src="${logoPath}" alt="${displayText}" />  
                                <div class="full-logo-text">${displayText}</div>  
                            </div>  
                        `;  
  
                        // Вставляємо логотип  
                        contentContainer.empty().append(logoHtml);  
                        contentContainer.css('opacity', '1');  
  
                    }).fail(function () {  
                        // Якщо переклади не завантажились, показуємо тільки логотип  
                        var logoSize = 'w500';  
                        var logoPath = 'https://image.tmdb.org/t/p/' + logoSize + selectedLogo.file_path;  
                          
                        var logoHtml = `  
                            <div class="full-logo-wrapper">  
                                <img src="${logoPath}" alt="${movieTitle}" />  
                            </div>  
                        `;  
  
                        contentContainer.empty().append(logoHtml);  
                        contentContainer.css('opacity', '1');  
                    });  
  
                } else {  
                    // Якщо логотипів немає, показуємо оригінальний текст  
                    contentContainer.css('opacity', '1');  
                }  
  
            }).fail(function () {  
                // Якщо логотипи не завантажились, показуємо оригінальний текст  
                contentContainer.css('opacity', '1');  
            });  
        }  
    });  
}();
