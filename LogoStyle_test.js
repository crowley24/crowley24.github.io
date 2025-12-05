!function() {
    "use strict";

    // =========================================================================
    // 1. ДОДАВАННЯ НАЛАШТУВАНЬ (ІНТЕРФЕЙСУ) З ПЕРШОГО ПЛАГІНА
    // =========================================================================

    // Параметри логотипу
    Lampa.SettingsApi.addParam({
        component:"interface",
        param:{name:"logo_glav",type:"select",values:{1:"Приховати",0:"Відображати"},default:"0"},
        field:{name:"Логотипи замість назв",description:"Відображає логотипи фільмів замість тексту"}
    });
    Lampa.SettingsApi.addParam({
        component:"interface",
        param:{name:"logo_size",type:"select",values:{w300:"w300",w500:"w500",w780:"w780",original:"Оригінал"},default:"w300"}, // Змінив default на w300
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

    // Очищення кешу (залишаємо для повноти)
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
                        // Ваш плагін не використовує кеш localStorage, але залишаю очищення для сумісності,
                        // якщо користувач раніше мав інший плагін.
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
    // 2. АДАПТАЦІЯ ФУНКЦІЇ ДЛЯ ВИЗНАЧЕННЯ РОЗМІРУ ЛОГОТИПА
    // =========================================================================

    // Ця функція замінить логіку, яка раніше була прямо в .onload, використовуючи
    // налаштування logo_use_text_height
    function getLogoStyles(isTextHeightMode, textHeight) {
        let logoStyles = {};

        if (isTextHeightMode && textHeight) {
            // Режим "Логотип за висотою тексту"
            logoStyles.height = textHeight + "px";
            logoStyles.width = "auto";
            logoStyles.maxWidth = "100%";
            logoStyles.maxHeight = "none";
        } else if (window.innerWidth < 768) {
            // Режим для мобільних пристроїв
            logoStyles.width = "100%";
            logoStyles.height = "auto";
            logoStyles.maxHeight = "none";
        } else {
            // Режим за замовчуванням (використовуємо 7em як у оригінальному плагіні)
            logoStyles.width = "7em";
            logoStyles.height = "auto";
            logoStyles.maxHeight = "none"; // Перевизначаємо, щоб не конфліктувало з вашим кодом
        }

        // Застосовуємо object-fit та position з оригінального плагіна
        logoStyles.objectFit = "contain";
        logoStyles.objectPosition = "left bottom";
        logoStyles.display = "block";
        logoStyles.opacity = "1";

        return logoStyles;
    }

    // =========================================================================
    // 3. ОСНОВНИЙ КОД ПЛАГІНА З АДАПТОВАНОЮ ЛОГІКОЮ
    // =========================================================================

    // Добавляем CSS стили
    var style = document.createElement('style');
    style.textContent = `
        .cardify .full-start-new__title {
            text-shadow: none !important;
        }
        /* Встановлення max-width: none для img залишаємо тут, але тепер керуємо розміром через JS */
        .full-start-new__title img {
            max-width: none !important;
            /* width: auto !important; - видаляємо з CSS, щоб керувати через JS */
            /* height: auto !important; - видаляємо з CSS, щоб керувати через JS */
        }
    `;
    document.head.appendChild(style);


    window.logoplugin || (window.logoplugin = !0, Lampa.Listener.follow("full", (function(a) {
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

            // --- Логіка перенесення року/країни (як у першому плагіні) ---
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
            // console.log("API URL для переводов:", translationsApi); // Вимкнено для чистоти

            $.get(translationsApi, (function(translationsData) {
                var russianTitle = null;

                // Ігноруємо логіку пошуку тут, вона не змінюється
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
                // console.log("Русское название:", russianTitle); // Вимкнено для чистоти

                // Теперь запрашиваем логотипы
                var t = Lampa.TMDB.api(apiPath + "/images?api_key=" + Lampa.TMDB.key());
                // console.log("API URL для логотипов:", t); // Вимкнено для чистоти

                $.get(t, (function(e) {
                    if (e.logos && e.logos.length > 0) {
                        // console.log("Все логотипы:", e.logos); // Вимкнено для чистоти
                        var logo = e.logos.find(function(l) { return l.iso_639_1 === "ru"; });
                        var isRussianLogo = !!logo;
                        if (!logo) {
                            logo = e.logos.find(function(l) { return l.iso_639_1 === "en"; });
                        }
                        if (!logo) {
                            logo = e.logos[0];
                        }
                        if (logo && logo.file_path) {
                            // Використовуємо налаштування розміру завантаження
                            var logoPath = Lampa.TMDB.image("/t/p/" + downloadSize + logo.file_path.replace(".svg", ".png"));
                            // console.log("Отображаем логотип:", logoPath); // Вимкнено для чистоти

                            // Предзагружаем изображение
                            var img = new Image();
                            img.onload = function() {

                                // Отримуємо стилі відображення на основі налаштувань
                                let finalStyles = getLogoStyles(isTextHeightMode, textHeight);

                                // Формуємо рядок стилів
                                let styleString = Object.keys(finalStyles).map(key => {
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
                                            // Додаємо згенеровані стилі
                                            '<img style="margin-top: 5px; ' + styleString + '" src="' + logoPath + '" />' +
                                            '<span style="margin-top: ' + marginTop + '; font-size: ' + fontSize + '; color: #fff;">' + russianTitle + '</span>' +
                                        '</div>'
                                    );
                                } else {
                                    a.object.activity.render().find(".full-start-new__title").html(
                                        '<div style="display: flex; flex-direction: column; align-items: ' + alignItems + ';">' +
                                            // Додаємо згенеровані стилі
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
                            // console.log("Логотип невалидный (нет file_path):", logo); // Вимкнено для чистоти
                            contentContainer.css("opacity", "1");
                        }
                    } else {
                        // console.log("Логотипы отсутствуют"); // Вимкнено для чистоти
                        contentContainer.css("opacity", "1");
                    }
                })).fail(function() {
                    // console.log("Ошибка запроса логотипов"); // Вимкнено для чистоти
                    contentContainer.css("opacity", "1");
                });
            })).fail(function() {
                // console.log("Ошибка запроса переводов, используем оригинальное название"); // Вимкнено для чистоти
                contentContainer.css("opacity", "1");
            });
        }
    })))
}();
