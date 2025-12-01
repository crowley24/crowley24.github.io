(function () {
    "use strict";

    if (window.logoplugin) return;
    window.logoplugin = true;

    // ===============================
    // I. ПАРАМЕТРИ
    // ===============================
    Lampa.SettingsApi.addParam({
        component: "interface",
        param: { name: "logo_glav", type: "select", values: { 1: "Скрыть", 0: "Отображать" }, default: "0" },
        field: { name: "Логотипы вместо названий", description: "Отображает логотипы фильмов вместо текста" }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_lang",
            type: "select",
            values: {
                "": "Как в Lampa", ru: "Русский", en: "English", uk: "Українська", be: "Беларуская",
                kz: "Қазақша", pt: "Português", es: "Español", fr: "Français", de: "Deutsch", it: "Italiano"
            },
            default: ""
        },
        field: { name: "Язык логотипа", description: "Приоритетный язык для поиска логотипа" }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: { name: "logo_size", type: "select", values: { w300: "w300", w500: "w500", w780: "w780", original: "Оригинал" }, default: "original" },
        field: { name: "Размер логотипа", description: "Разрешение загружаемого изображения" }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: { name: "logo_animation_type", type: "select", values: { js: "JavaScript", css: "CSS" }, default: "css" },
        field: { name: "Тип анимации логотипов", description: "Способ анимации логотипов" }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: { name: "logo_hide_year", type: "trigger", default: true },
        field: { name: "Скрывать год и страну", description: "Скрывать информацию над логотипом" }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: { name: "logo_use_text_height", type: "trigger", default: false },
        field: { name: "Логотип по высоте текста", description: "Размер логотипа равен высоте текста" }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: { name: "logo_clear_cache", type: "button" },
        field: { name: "Сбросить кеш логотипов", description: "Нажмите для очистки кеша изображений" },
        onChange: function () {
            Lampa.Select.show({
                title: "Сбросить кеш?",
                items: [{ title: "Да", confirm: true }, { title: "Нет" }],
                onSelect: function (e) {
                    if (e.confirm) {
                        for (var i = 0; i < localStorage.length; i++) {
                            var k = localStorage.key(i);
                            if (k.indexOf("logo_cache_width_based_v1_") !== -1) localStorage.removeItem(k);
                        }
                        window.location.reload();
                    } else Lampa.Controller.toggle("settings_component");
                },
                onBack: function () { Lampa.Controller.toggle("settings_component"); }
            });
        }
    });

    // ===============================
    // II. ЛОГІКА
    // ===============================
    var fadeTime = 400;

    function animateOpacity(el, from, to, duration, callback) {
        var start = null;
        requestAnimationFrame(function frame(ts) {
            if (!start) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var val = from + (to - from) * (1 - Math.pow(1 - progress, 3));
            el.style.opacity = val;
            if (progress < 1) requestAnimationFrame(frame);
            else if (callback) callback();
        });
    }

    function applyLogoStyle(img, textEl, hasTagline, textHeight) {
        if (textEl) {
            textEl.style.height = "";
            textEl.style.overflow = "";
            textEl.style.display = "";
        }
        img.style.display = "block";
        img.style.objectFit = "contain";
        img.style.objectPosition = "left bottom";
        img.style.margin = "0";
        img.style.paddingTop = "0.2em";
        img.style.opacity = "1";

        if (Lampa.Storage.get("logo_use_text_height", false) && textHeight) {
            img.style.height = textHeight + "px";
            img.style.width = "auto";
            img.style.maxWidth = "100%";
            img.style.maxHeight = "none";
        } else if (window.innerWidth < 768) {
            img.style.width = "100%";
            img.style.height = "auto";
        } else {
            img.style.width = "7em";
            img.style.height = "auto";
        }
    }

    function getCacheKey(type, id, lang) {
        return "logo_cache_width_based_v1_" + type + "_" + id + "_" + lang;
    }

    Lampa.Listener.follow("full", function (event) {
        if (event.type !== "complite" || Lampa.Storage.get("logo_glav") === "1") return;

        var movie = event.data.movie;
        if (!movie || !movie.id) return;

        var mediaType = movie.name ? "tv" : "movie";
        var card = event.object.activity.render().find(".full-start-new__title");
        var head = event.object.activity.render().find(".full-start-new__head");
        var details = event.object.activity.render().find(".full-start-new__details");
        var taglineEl = event.object.activity.render().find(".full-start-new__tagline");
        var hasTagline = taglineEl.length > 0 && taglineEl.text().trim() !== "";
        var textEl = card[0];
        var lang = Lampa.Storage.get("logo_lang", "") || Lampa.Storage.get("language");
        var size = Lampa.Storage.get("logo_size", "original");
        var cacheKey = getCacheKey(mediaType, movie.id, lang);

        // Перевірка кешу
        var cached = Lampa.Storage.get(cacheKey);
        if (cached && cached !== "none") {
            var img = new Image();
            img.src = cached;
            var h = textEl ? textEl.getBoundingClientRect().height : null;
            applyLogoStyle(img, null, hasTagline, h);
            card.empty().append(img);
            return;
        }

        var apiUrl = Lampa.TMDB.api(mediaType + "/" + movie.id + "/images?api_key=" + Lampa.TMDB.key() + "&include_image_language=" + lang + ",en,null");
        $.get(apiUrl, function (res) {
            var logoPath = null;
            if (res.logos && res.logos.length) {
                for (var i = 0; i < res.logos.length; i++) {
                    if (res.logos[i].iso_639_1 === lang) { logoPath = res.logos[i].file_path; break; }
                }
                if (!logoPath) for (var i = 0; i < res.logos.length; i++) if (res.logos[i].iso_639_1 === "en") { logoPath = res.logos[i].file_path; break; }
                if (!logoPath) logoPath = res.logos[0].file_path;
            }

            if (!logoPath) { Lampa.Storage.set(cacheKey, "none"); return; }

            var url = Lampa.TMDB.image("/t/p/" + size + logoPath.replace(".svg", ".png"));
            Lampa.Storage.set(cacheKey, url);

            var img = new Image();
            img.src = url;
            img.style.opacity = "0";
            var textHeight = textEl ? textEl.getBoundingClientRect().height : null;
            applyLogoStyle(img, null, hasTagline, textHeight);

            img.onload = function () {
                card.empty().append(img);
                var animType = Lampa.Storage.get("logo_animation_type", "css");
                if (animType === "js") animateOpacity(img, 0, 1, fadeTime);
                else img.style.transition = "opacity 0.4s ease"; setTimeout(function () { img.style.opacity = "1"; }, 50);
            };
            img.onerror = function () { Lampa.Storage.set(cacheKey, "none"); };
        }).fail(function () { Lampa.Storage.set(cacheKey, "none"); });
    });

    console.log("[LogoPlugin] TMDB логотипи інтегровані у твій плагін");
})();
