(function () {  
    "use strict";  
  
    // =======================================================  
    // I. НАЛАШТУВАННЯ ПЛАГІНА (Lampa.SettingsApi)  
    // =======================================================  
  
    // 1. Приховати/Відобразити логотипи  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_glav",  
            type: "select",  
            values: { 1: "Сховати", 0: "Відображати" },  
            default: "0"  
        },  
        field: {  
            name: "Логотипи замість назв",  
            description: "Відображає логотипи фільмів замість тексту"  
        }  
    });  
  
    // 2. Мова логотипу  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_lang",  
            type: "select",  
            values: {  
                "null": "Як в Lampa",  
                "uk": "Українська",  
                "ru": "Русский",  
                "en": "English",  
                "be": "Беларускі",  
                "bg": "Български",  
                "zh": "中文",  
                "pt": "Português",  
                "es": "Español",  
                "fr": "Français",  
                "de": "Deutsch",  
                "it": "Italiano",  
                "ja": "日本語",  
                "ko": "한국어",  
                "th": "ไทย",  
                "tr": "Türkçe",  
                "ar": "العربية",  
                "hi": "हिन्दी"  
            },  
            default: "uk"  
        },  
        field: {  
            name: "Мова логотипу",  
            description: "Оберіть мову для завантаження логотипів"  
        }  
    });  
  
    // 3. Розмір логотипу  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_size",  
            type: "select",  
            values: {  
                w300: "w300",  
                w500: "w500",  
                w780: "w780",  
                original: "Оригінал"  
            },  
            default: "original"  
        },  
        field: {  
            name: "Розмір логотипа",  
            description: "Роздільна здатність завантажуваного зображення"  
        }  
    });  
  
    // 4. Використовувати висоту тексту  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_use_text_height",  
            type: "trigger",  
            default: false  
        },  
        field: {  
            name: "Адаптивна висота",  
            description: "Використовувати висоту оригінального тексту для логотипа"  
        }  
    });  
  
    // 5. Приховати рік  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_hide_year",  
            type: "trigger",  
            default: false  
        },  
        field: {  
            name: "Приховати рік",  
            description: "Приховувати рік випуску при відображенні логотипа"  
        }  
    });  
  
    // 6. Анімація  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_animation",  
            type: "select",  
            values: {  
                "": "Вимкнено",  
                "fade": "Fade",  
                "slide": "Slide",  
                "zoom": "Zoom"  
            },  
            default: ""  
        },  
        field: {  
            name: "Анімація логотипа",  
            description: "Ефект появи логотипа"  
        }  
    });  
  
    // =======================================================  
    // II. ОСНОВНИЙ КОД ПЛАГІНА  
    // =======================================================  
  
    // Перевірка, чи увімкнено плагін  
    if (Lampa.Storage.get("logo_glav", "0") === "1") return;  
  
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
  
    // Перевірка, чи вже завантажено плагін  
    window.logoplugin || (window.logoplugin = !0, Lampa.Listener.follow("full", (function(a) {  
        if ("complite" == a.type) {  
              
            // Отримуємо елемент контейнера  
            var contentContainer = $(".full-start-new__title");  
            if (!contentContainer.length) return;  
  
            // Отримуємо дані фільму/серіалу  
            var movieData = a.data.movie;  
            if (!movieData) return;  
  
            // Перевіряємо, чи потрібно приховувати рік  
            var hideYear = Lampa.Storage.get("logo_hide_year", false);  
              
            // Отримуємо оригінальний текст для визначення висоти  
            var originalText = contentContainer.text().trim();  
            var textHeight = hideYear ? null : contentContainer.height();  
  
            // Очищуємо контейнер  
            contentContainer.empty();  
  
            // Показуємо контейнер з анімацією  
            contentContainer.css("opacity", "0");  
  
            // Визначаємо мову логотипа  
            var logoLang = Lampa.Storage.get("logo_lang", "uk");  
            var size = Lampa.Storage.get("logo_size", "original");  
            var animation = Lampa.Storage.get("logo_animation", "");  
  
            // Функція для отримання мови логотипа  
            function getLogoLang(lang) {  
                if (lang === "null" || !lang) {  
                    return Lampa.Storage.get("language", "uk");  
                }  
                return lang;  
            }  
  
            // Функція для завантаження логотипа  
            function loadLogo() {  
                var lang = getLogoLang(logoLang);  
                var logoUrl = `https://api.themoviedb.org/3/${movieData.title ? 'movie' : 'tv'}/${movieData.id}/images?api_key=${Lampa.Manifest.tmdb_key}&include_image_language=${lang},null,en`;  
                  
                // Кешування  
                var cacheKey = `logo_${movieData.id}_${lang}_${size}`;  
                var cachedLogo = Lampa.Storage.get(cacheKey);  
  
                if (cachedLogo && cachedLogo !== "none") {  
                    displayLogo(cachedLogo);  
                    return;  
                }  
  
                // Завантажуємо логотипи  
                $.ajax({  
                    url: logoUrl,  
                    dataType: "json",  
                    success: function(response) {  
                        if (response.logos && response.logos.length > 0) {  
                            // Знаходимо відповідний розмір  
                            var logo = response.logos.find(function(l) {  
                                return l.file_path.includes(size) || l.file_path.includes("original");  
                            }) || response.logos[0];  
  
                            if (logo) {  
                                var logoSrc = `https://image.tmdb.org/t/p/${size}${logo.file_path}`;  
                                Lampa.Storage.set(cacheKey, logoSrc);  
                                displayLogo(logoSrc);  
                                return;  
                            }  
                        }  
                          
                        // Якщо логотипи не знайдено  
                        Lampa.Storage.set(cacheKey, "none");  
                        displayOriginalTitle();  
                    },  
                    error: function() {  
                        console.log("Помилка завантаження логотипів");  
                        displayOriginalTitle();  
                    }  
                });  
            }  
  
            // Функція для відображення логотипа  
            function displayLogo(logoSrc) {  
                var img = new Image();  
                img.onload = function() {  
                    // Визначаємо параметри залежно від пристрою  
                    var isMobile = window.innerWidth <= 768;  
                    var fontSize = "0.5em";  
                    var marginTop = "1px";  
                    var logoHeight, logoWidth;  
                      
                    // Нова логіка розміру логотипа  
                    if (Lampa.Storage.get("logo_use_text_height", false) && textHeight) {  
                        logoHeight = textHeight + "px";  
                        logoWidth = "auto";  
                    } else if (window.innerWidth < 768) {  
                        logoWidth = "100%";  
                        logoHeight = "auto";  
                    } else {  
                        logoWidth = "7em";  
                        logoHeight = "auto";  
                    }  
  
                    // Створюємо HTML для логотипа  
                    var logoHtml = `<img src="${logoSrc}" style="width: ${logoWidth}; height: ${logoHeight}; max-width: none; object-fit: contain;" alt="${movieData.title || movieData.name}">`;  
                      
                    // Додаємо анімацію якщо потрібно  
                    if (animation) {  
                        logoHtml = `<div class="logo-animation logo-${animation}">${logoHtml}</div>`;  
                    }  
  
                    contentContainer.html(logoHtml);  
                      
                    // Застосовуємо анімацію  
                    if (animation) {  
                        applyAnimation(animation);  
                    }  
                      
                    contentContainer.css("opacity", "1");  
                };  
                img.onerror = function() {  
                    displayOriginalTitle();  
                };  
                img.src = logoSrc;  
            }  
  
            // Функція для відображення оригінальної назви  
            function displayOriginalTitle() {  
                var title = movieData.title || movieData.name || "";  
                if (!hideYear && movieData.release_date) {  
                    title += " (" + new Date(movieData.release_date).getFullYear() + ")";  
                }  
                contentContainer.text(title);  
                contentContainer.css("opacity", "1");  
            }  
  
            // Функція для застосування анімації  
            function applyAnimation(type) {  
                var logoElement = contentContainer.find(".logo-animation");  
                  
                switch(type) {  
                    case "fade":  
                        logoElement.css({  
                            "animation": "logoFade 0.5s ease-in-out"  
                        });  
                        break;  
                    case "slide":  
                        logoElement.css({  
                            "animation": "logoSlide 0.5s ease-out"  
                        });  
                        break;  
                    case "zoom":  
                        logoElement.css({  
                            "animation": "logoZoom 0.5s ease-out"  
                        });  
                        break;  
                }  
            }  
  
            // Додаємо CSS для анімацій  
            if (animation) {  
                var animationStyle = document.createElement('style');  
                animationStyle.textContent = `  
                    @keyframes logoFade {  
                        from { opacity: 0; }  
                        to { opacity: 1; }  
                    }  
                    @keyframes logoSlide {  
                        from { transform: translateX(-20px); opacity: 0; }  
                        to { transform: translateX(0); opacity: 1; }  
                    }  
                    @keyframes logoZoom {  
                        from { transform: scale(0.8); opacity: 0; }  
                        to { transform: scale(1); opacity: 1; }  
                    }  
                `;  
                document.head.appendChild(animationStyle);  
            }  
  
            // Запускаємо завантаження логотипа  
            loadLogo();  
        }  
    })))  
})();
