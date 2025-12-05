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
  
    // --- Функції для керування мовою логотипів ---  
    function getLogoLanguage() {  
        return Lampa.Storage.get('logo_language') || 'ru';  
    }  
  
    function setLogoLanguage(lang) {  
        Lampa.Storage.set('logo_language', lang);  
        console.log('[Logo Plugin] Language set to:', lang);  
    }  
  
    // --- Додавання налаштувань в меню Lampa ---  
    function addLogoLanguageSettings() {  
        try {  
            // Перевіряємо, чи доступний Lampa.Settings  
            if (typeof Lampa.Settings === 'undefined') {  
                console.error('[Logo Plugin] Lampa.Settings is not available');  
                return;  
            }  
  
            // Додаємо пункт в налаштування інтерфейсу  
            Lampa.Settings.addParam({  
                component: 'select',  
                name: 'logo_language',  
                title: 'Мова логотипів фільмів',  
                default: 'ru',  
                values: {  
                    'ru': 'Російська',  
                    'uk': 'Українська',   
                    'en': 'Англійська',  
                    'be': 'Білоруська',  
                    'bg': 'Болгарська',  
                    'zh': 'Китайська',  
                    'pt': 'Португальська',  
                    'he': 'Іврит',  
                    'cs': 'Чеська'  
                },  
                onChange: function(value) {  
                    setLogoLanguage(value);  
                    Lampa.Noty.show('Мову логотипів змінено на: ' + this.values[value]);  
                }  
            });  
              
            console.log('[Logo Plugin] Settings added successfully');  
        } catch (error) {  
            console.error('[Logo Plugin] Error adding settings:', error);  
        }  
    }  
  
    // --- СТИЛІ ---  
    try {  
        var style = document.createElement('style');  
        style.textContent = `  
            .cardify .full-start-new__title {  
                text-shadow: none !important;  
            }  
            .full-start-new__title img {  
                max-width: 25vw !important;  
                max-height: 12vh !important;  
                width: auto !important;  
                height: auto !important;  
                object-fit: contain !important;  
                display: block;  
                margin-top: 5px !important;  
            }  
            .full-logo-wrapper {  
                display: flex;  
                flex-direction: column;  
                align-items: flex-start;  
            }  
            @media (max-width: 768px) {  
                .full-start-new__title img {  
                    max-width: 40vw !important;  
                    max-height: 10vh !important;  
                }  
                .full-logo-wrapper {  
                    align-items: center !important;  
                }  
            }  
        `;  
        document.head.appendChild(style);  
        console.log('[Logo Plugin] Styles added successfully');  
    } catch (error) {  
        console.error('[Logo Plugin] Error adding styles:', error);  
        return;  
    }  
  
    // --- ОСНОВНИЙ ПЛАГІН ---  
    try {  
        if (window.logoplugin) {  
            console.log('[Logo Plugin] Plugin already initialized');  
            return;  
        }  
  
        window.logoplugin = true;  
          
        Lampa.Listener.follow("full", function(a) {  
            try {  
                console.log('[Logo Plugin] Full event triggered:', a.type);  
                  
                if ("complite" !== a.type) return;  
                  
                var e = a.data.movie;  
                if (!e) {  
                    console.error('[Logo Plugin] No movie data found');  
                    return;  
                }  
                  
                var isSerial = e.name || e.first_air_date;  
                var apiPath = isSerial ? "tv/" + e.id : "movie/" + e.id;  
                  
                if (!e.id) {  
                    console.error('[Logo Plugin] No movie ID found');  
                    return;  
                }  
  
                var preferredLang = getLogoLanguage();  
                console.log('[Logo Plugin] Using language:', preferredLang);  
  
                var contentContainer = a.object.activity.render().find(".full-start-new__body");  
                if (!contentContainer.length) {  
                    console.error('[Logo Plugin] Content container not found');  
                    return;  
                }  
                contentContainer.css("opacity", "0");  
  
                var translationsApi = Lampa.TMDB.api(apiPath + "/translations?api_key=" + Lampa.TMDB.key());  
  
                $.get(translationsApi).done(function(translationsData) {  
                    try {  
                        var localizedTitle = null;  
                          
                        if (translationsData && translationsData.translations) {  
                            var translation = translationsData.translations.find(t =>  
                                t.iso_639_1 === preferredLang || t.iso_3166_1 === preferredLang.toUpperCase()  
                            );  
                              
                            if (translation && translation.data) {  
                                localizedTitle = isSerial ? translation.data.name : translation.data.title;  
                            }  
                        }  
  
                        if (!localizedTitle) {  
                            localizedTitle = isSerial ? e.name : e.title;  
                        }  
  
                        var imgApi = Lampa.TMDB.api(apiPath + "/images?api_key=" + Lampa.TMDB.key());  
  
                        $.get(imgApi).done(function(imagesData) {  
                            try {  
                                if (!imagesData || !imagesData.logos || imagesData.logos.length === 0) {  
                                    contentContainer.css("opacity", "1");  
                                    return;  
                                }  
  
                                var logo = imagesData.logos.find(l => l.iso_639_1 === preferredLang);  
                                var isPreferredLogo = !!logo;  
  
                                if (!logo) {  
                                    logo = imagesData.logos.find(l => l.iso_639_1 === "en");  
                                }  
                                if (!logo) {  
                                    logo = imagesData.logos[0];  
                                }  
  
                                if (logo && logo.file_path) {  
                                    var logoPath = Lampa.TMDB.image("/t/p/w300" + logo.file_path.replace(".svg", ".png"));  
  
                                    var img = new Image();  
                                    img.onload = function() {  
                                        try {  
                                            var titleHtml = '<div class="full-logo-wrapper"><img src="' + logoPath + '" />';  
                                              
                                            if (!isPreferredLogo && localizedTitle) {  
                                                titleHtml += '<span style="margin-top:2px;font-size:0.55em;color:#fff;">' + localizedTitle + '</span>';  
                                            }  
                                              
                                            titleHtml += '</div>';  
                                              
                                            a.object.activity.render().find(".full-start-new__title").html(titleHtml);  
                                            contentContainer.css("opacity", "1");  
                                        } catch (error) {  
                                            console.error('[Logo Plugin] Error displaying logo:', error);  
                                            contentContainer.css("opacity", "1");  
                                        }  
                                    };  
  
                                    img.onerror = function() {  
                                        console.warn('[Logo Plugin] Failed to load logo:', logoPath);  
                                        contentContainer.css("opacity", "1");  
                                    };  
  
                                    img.src = logoPath;  
                                } else {  
                                    contentContainer.css("opacity", "1");  
                                }  
                            } catch (error) {  
                                console.error('[Logo Plugin] Error processing images:', error);  
                                contentContainer.css("opacity", "1");  
                            }  
                        }).fail(function() {  
                            console.error('[Logo Plugin] Failed to fetch images');  
                            contentContainer.css("opacity", "1");  
                        });  
                    } catch (error) {  
                        console.error('[Logo Plugin] Error processing translations:', error);  
                        contentContainer.css("opacity", "1");  
                    }  
                }).fail(function() {  
                    console.error('[Logo Plugin] Failed to fetch translations');  
                    contentContainer.css("opacity", "1");  
                });  
            } catch (error) {  
                console.error('[Logo Plugin] Error in full event handler:', error);  
            }  
        });  
  
        // Глобальні функції для зворотної сумісності  
        window.logoPlugin = {  
            setLanguage: setLogoLanguage,  
            getLanguage: getLogoLanguage  
        };  
  
        // Додаємо налаштування з затримкою  
        setTimeout(function() {  
            addLogoLanguageSettings();  
        }, 1000);  
  
        console.log('[Logo Plugin] Successfully initialized');  
    } catch (error) {  
        console.error('[Logo Plugin] Fatal error during initialization:', error);  
    }  
}();
