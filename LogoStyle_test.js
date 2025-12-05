!function() {
    "use strict";

    // =========================================================================
    // 1. ДОДАВАННЯ НАЛАШТУВАНЬ (ІНТЕРФЕЙСУ)
    // =========================================================================

    // Параметри логотипу
    Lampa.SettingsApi.addParam({
        component:"interface",
        param:{name:"logo_glav",type:"select",values:{1:"Приховати",0:"Відображати"},default:"0"},
        field:{name:"Логотипи замість назв",description:"Відображає логотипи фільмів замість тексту"}
    });
    Lampa.SettingsApi.addParam({
        component:"interface",
        param:{name:"logo_size",type:"select",values:{w300:"w300",w500:"w500",w780:"w780",original:"Оригінал"},default:"w300"},
        field:{name:"Розмір логотипу",description:"Роздільна здатність зображення, що завантажується"}
    });
    Lampa.SettingsApi.addParam({
        component:"interface",
        param:{name:"logo_hide_year",type:"trigger",default:true},
        field:{name:"Приховувати рік та країну",description:"Приховувати інформацію над логотипом (рік, країна)"}
    });
    Lampa.SettingsApi.addParam({
        component:"interface",
        param:{name:"logo_use_text_height",type:"trigger",default:false},
        field:{name:"Логотип за висотою тексту",description:"Розмір логотипа відповідає висоті тексту"}
    });

    // Очищення кешу
    Lampa.SettingsApi.addParam({
        component:"interface",
        param:{name:"logo_clear_cache",type:"button"},
        field:{name:"Скинути кеш логотипів",description:"Натисніть, щоб очистити кеш зображень"},
        onChange:function(){
            Lampa.Select.show({
                title:"Скинути кеш?",
                items:[{title:"Так",confirm:true},{title:"Ні"}],
                onSelect:function(e){
                    if(e.confirm){
                        let del=[];
                        for(let i=0;i<localStorage.length;i++){
                            let key=localStorage.key(i);
                            if(key.indexOf("logo_cache_width_based_v1_")!==-1) del.push(key);
                        }
                        del.forEach(k=>localStorage.removeItem(k));
                        window.location.reload();
                    } else Lampa.Controller.toggle("settings_component");
                },
                onBack:function(){ Lampa.Controller.toggle("settings_component"); }
            })
        }
    });


    // =========================================================================
    // 2. ФУНКЦІЯ ВИЗНАЧЕННЯ РОЗМІРУ ТА СТИЛІВ ЛОГОТИПА
    // =========================================================================

    function getLogoStyles(isTextHeightMode, textHeight) {
        let logoStyles = {};
        let isMobile = window.innerWidth < 768;

        if (isTextHeightMode && textHeight) {
            // Режим "Логотип за висотою тексту"
            logoStyles.height = textHeight + "px";
            logoStyles.width = "auto";
            logoStyles.maxWidth = "100%";
        } else if (isMobile) {
            // Режим для мобільних пристроїв
            logoStyles.width = "100%";
            logoStyles.height = "auto";
        } else {
            // Режим за замовчуванням (для великих екранів)
            logoStyles.width = "7em";
            logoStyles.height = "auto";
        }

        // Додаємо стилі відступів (padding) з оригінального плагіна
        let hideYear = Lampa.Storage.get("logo_hide_year", true);
        logoStyles.paddingTop = (hideYear ? 0 : 0.3) + "em"; 

        // Розрахунок нижнього відступу (bottomPad)
        logoStyles.paddingBottom = (isMobile ? 0.5 : 0.2) + "em"; 

        // Загальні стилі відображення
        logoStyles.objectFit = "contain";
        logoStyles.objectPosition = "left bottom";
        logoStyles.display = "block";
        logoStyles.opacity = "1";
        logoStyles.maxHeight = "none"; // Скасовуємо старі обмеження

        return logoStyles;
    }


    // =========================================================================
    // 3. ОСНОВНИЙ КОД ПЛАГІНА
    // =========================================================================

    if(!window.logoplugin){
        window.logoplugin = true;

        // Добавляем CSS стили (залишаємо мінімальні, але видаляємо конфліктні)
        var style = document.createElement('style');
        style.textContent = `
            .cardify .full-start-new__title {
                text-shadow: none !important;
            }
            .full-start-new__title img {
                max-width: none !important;
            }
        `;
        document.head.appendChild(style);

        Lampa.Listener.follow("full", (function(a) {
            // Якщо користувач обрав "Приховати", виходимо.
            if (Lampa.Storage.get("logo_glav") === "1") return;

            if ("complite" == a.type) {
                var e = a.data.movie;
                var isSerial = e.name || e.first_air_date;
                var apiPath = isSerial ? "tv/" + e.id : "movie/" + e.id;

                // Зчитуємо налаштування розміру завантаження
                let downloadSize = Lampa.Storage.get("logo_size", "w300");

                // Визначаємо висоту тексту для режиму logo_use_text_height
                let titleElem = a.object.activity.render().find(".full-start-new__title")[0];
                let textHeight = titleElem ? titleElem.getBoundingClientRect().height : 0;
                let isTextHeightMode = Lampa.Storage.get("logo_use_text_height", false);

                // Скрываем контент до загрузки логотипа
                var contentContainer = a.object.activity.render().find(".full-start-new__body");
                contentContainer.css("opacity", "0");

                // --- Логіка перенесення року/країни ---
                function moveHeadWithoutAnimation(head, details) {
                    if (Lampa.Storage.get("logo_hide_year", true)) {
                        if (head.length && details.length && details.find(".logo-moved-head").length === 0) {
                            let h = head.html();
                            if (h) {
                                let h1 = $('<span class="logo-moved-head">' + h + '</span>');
                                let dot = $('<span class="full-start-new__split logo-moved-separator">●</span>');
                                details.append(dot).append(h1);
                                head.css("opacity", "0");
                            }
                        }
                    }
                }
                var head = a.object.activity.render().find(".full-start-new__head");
                var details = a.object.activity.render().find(".full-start-new__details");
                // --- Кінець логіки перенесення ---


                // Получаем русское название из переводов
                var translationsApi = Lampa.TMDB.api(apiPath + "/translations?api_key=" + Lampa.TMDB.key());

                $.get(translationsApi, (function(translationsData) {
                    var russianTitle = null;

                    if (translationsData.translations) {
                        var ruTranslation = translationsData.translations.find(function(t) {
                            return t.iso_639_1 === "ru" || t.iso_3166_1 === "RU";
                        });
                        if (ruTranslation && ruTranslation.data) {
                            russianTitle = isSerial ? ruTranslation.data.name : ruTranslation.data.title;
                        }
                    }
                    if (!russianTitle) {
                        russianTitle = isSerial ? e.name : e.title;
                    }

                    // Теперь запрашиваем логотипы
                    var t = Lampa.TMDB.api(apiPath + "/images?api_key=" + Lampa.TMDB.key());

                    $.get(t, (function(e) {
                        if (e.logos && e.logos.length > 0) {
                            var logo = e.logos.find(function(l) { return l.iso_639_1 === "ru"; });
                            var isRussianLogo = !!logo;
                            if (!logo) {
                                logo = e.logos.find(function(l) { return l.iso_639_1 === "en"; });
                            }
                            if (!logo) {
                                logo = e.logos[0];
                            }
                            if (logo && logo.file_path) {
                                var logoPath = Lampa.TMDB.image("/t/p/" + downloadSize + logo.file_path.replace(".svg", ".png"));

                                // Предзагружаем изображение
                                var img = new Image();
                                img.onload = function() {

                                    // Отримуємо стилі відображення на основі налаштувань
                                    let finalStyles = getLogoStyles(isTextHeightMode, textHeight);

                                    // Формуємо рядок стилів
                                    let styleString = Object.keys(finalStyles).map(key => {
                                        // Конвертуємо CamelCase в kebab-case для CSS
                                        return key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase() + ': ' + finalStyles[key] + ' !important';
                                    }).join('; ');

                                    // Визначаємо додаткові стилі для контейнера та тексту
                                    var isMobile = window.innerWidth <= 768;
                                    var fontSize = "0.5em";
                                    var marginTop = "1px";
                                    var alignItems = isMobile ? "center" : "flex-start";

                                    // Застосовуємо перенесення року/країни
                                    moveHeadWithoutAnimation(head, details);


                                    if (!isRussianLogo && russianTitle) {
                                        a.object.activity.render().find(".full-start-new__title").html(
                                            '<div style="display: flex; flex-direction: column; align-items: ' + alignItems + ';">' +
                                                // Використовуємо styleString для керування розмірами
                                                '<img style="margin-top: 5px; ' + styleString + '" src="' + logoPath + '" />' +
                                                '<span style="margin-top: ' + marginTop + '; font-size: ' + fontSize + '; color: #fff;">' + russianTitle + '</span>' +
                                            '</div>'
                                        );
                                    } else {
                                        a.object.activity.render().find(".full-start-new__title").html(
                                            '<div style="display: flex; flex-direction: column; align-items: ' + alignItems + ';">' +
                                                // Використовуємо styleString для керування розмірами
                                                '<img style="margin-top: 5px; ' + styleString + '" src="' + logoPath + '" />' +
                                            '</div>'
                                        );
                                    }
                                    // Показываем контент
                                    contentContainer.css("opacity", "1");
                                };
                                img.onerror = function() {
                                    console.log("Ошибка загрузки изображения логотипа");
                                    contentContainer.css("opacity", "1");
                                };
                                img.src = logoPath;
                            } else {
                                contentContainer.css("opacity", "1");
                            }
                        } else {
                            contentContainer.css("opacity", "1");
                        }
                    })).fail(function() {
                        contentContainer.css("opacity", "1");
                    });
                })).fail(function() {
                    contentContainer.css("opacity", "1");
                });
            }
        })))
    }
}();
