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
        Lampa.Noty.show('Мову логотипів змінено на: ' + getLanguageName(lang));  
    }  
  
    function getLanguageName(code) {  
        const names = {  
            'ru': 'Російська',  
            'uk': 'Українська',   
            'en': 'Англійська',  
            'be': 'Білоруська',  
            'bg': 'Болгарська',  
            'zh': 'Китайська',  
            'pt': 'Португальська',  
            'he': 'Іврит',  
            'cs': 'Чеська'  
        };  
        return names[code] || code;  
    }  
  
    // --- Додавання пункту меню ---  
    function addLanguageMenuItem() {  
        try {  
            Lampa.Listener.follow('app', function(e) {  
                if (e.type === 'ready') {  
                    // Додаємо пункт в головне меню  
                    Lampa.Template.add('settings_logo_language', `  
                        <div class="settings-folder selector" data-component="logo_language">  
                            <div class="settings-folder__icon">🌐</div>  
                            <div class="settings-folder__name">Мова логотипів</div>  
                        </div>  
                    `);  
                      
                    // Обробник кліку  
                    $('body').on('click', '[data-component="logo_language"]', function() {  
                        var currentLang = getLogoLanguage();  
                        var languages = {  
                            'ru': 'Російська',  
                            'uk': 'Українська',   
                            'en': 'Англійська',  
                            'be': 'Білоруська',  
                            'bg': 'Болгарська',  
                            'zh': 'Китайська',  
                            'pt': 'Португальська',  
                            'he': 'Іврит',  
                            'cs': 'Чеська'  
                        };  
                          
                        Lampa.Select.show({  
                            title: 'Мова логотипів фільмів',  
                            items: Object.keys(languages).map(function(key) {  
                                return {  
                                    title: languages[key],  
                                    value: key,  
                                    selected: key === currentLang  
                                };  
                            }),  
                            onSelect: function(item) {  
                                setLogoLanguage(item.value);  
                            }  
                        });  
                    });  
                      
                    console.log('[Logo Plugin] Menu item added successfully');  
                }  
            });  
        } catch (error) {  
            console.error('[Logo Plugin] Error adding menu item:', error);  
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
                if ("complite" !== a.type) return;  
                  
                var e = a.data.movie;  
                if (!e) return;  
                  
                var isSerial = e.name || e.first_air_date;  
                var apiPath = isSerial ? "tv/" + e.id : "movie/" + e.id;  
                  
                if (!e.id) return;  
  
                var contentContainer = a.object.activity.render().find(".full-start-new__body");  
                if (!contentContainer.length) return;  
                contentContainer.css("opacity", "0");  
  
                var preferredLang = getLogoLanguage();  
  
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
  
                        if (!localizedTitle) localizedTitle = isSerial ? e.name : e.title;  
  
                        var imgApi = Lampa.TMDB.api(apiPath + "/images?api_key=" + Lampa.TMDB.key());  
  
                        $.get(imgApi).done(function(e) {  
                            try {  
                                if (e.logos && e.logos.length > 0) {  
                                    var logo = e.logos.find(l => l.iso_639_1 === preferredLang);  
                                    var isPreferredLogo = !!logo;  
  
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
                                            contentContainer.css("opacity", "1");  
                                        };  
  
                                        img.src = logoPath;  
                                    } else {  
                                        contentContainer.css("opacity", "1");  
                                    }  
                                } else {  
                                    contentContainer.css("opacity", "1");  
                                }  
                            } catch (error) {  
                                console.error('[Logo Plugin] Error processing images:', error);  
                                contentContainer.css("opacity", "1");  
                            }  
                        }).fail(function() {  
                            contentContainer.css("opacity", "1");  
                        });  
                    } catch (error) {  
                        console.error('[Logo Plugin] Error processing translations:', error);  
                        contentContainer.css("opacity", "1");  
                    }  
                }).fail(function() {  
                    contentContainer.css("opacity", "1");  
                });  
            } catch (error) {  
                console.error('[Logo Plugin] Error in full event handler:', error);  
            }  
        });  
  
        // Глобальні функції  
        window.logoPlugin = {  
            setLanguage: setLogoLanguage,  
            getLanguage: getLogoLanguage  
        };  
  
        // Додаємо пункт меню  
        addLanguageMenuItem();  
  
        console.log('[Logo Plugin] Successfully initialized');  
    } catch (error) {  
        console.error('[Logo Plugin] Fatal error during initialization:', error);  
    }  
}();
