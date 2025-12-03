!function () {
    "use strict";

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_glav",
            type: "select",
            values: { 1: "Приховати", 0: "Відображати" },
            default: "0"
        },
        field: {
            name: "Логотипи замість назв",
            description: "Відображає логотипи фільмів замість тексту"
        }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_lang",
            type: "select",
            values: {
                "": "Як в Lampa",
                ru: "Русский",
                en: "English",
                uk: "Українська",
                be: "Беларуская",
                kz: "Қазақша",
                pt: "Português",
                es: "Español",
                fr: "Français",
                de: "Deutsch",
                it: "Italiano"
            },
            default: ""
        },
        field: {
            name: "Мова логотипу",
            description: "Пріоритетна мова для пошуку логотипу"
        }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_size",
            type: "select",
            values: { w300: "w300", w500: "w500", w780: "w780", original: "Оригінал" },
            default: "original"
        },
        field: {
            name: "Розмір логотипу",
            description: "Роздільна здатність зображення, що завантажується"
        }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_animation_type",
            type: "select",
            values: { js: "JavaScript", css: "CSS" },
            default: "css"
        },
        field: {
            name: "Тип анімації логотипів",
            description: "Спосіб анімації логотипів"
        }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_hide_year",
            type: "trigger",
            default: !0
        },
        field: {
            name: "Приховувати рік та країну",
            description: "Приховувати інформацію над логотипом"
        }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_use_text_height",
            type: "trigger",
            default: !1
        },
        field: {
            name: "Логотип за висотою тексту",
            description: "Розмір логотипа відповідає висоті тексту"
        }
    });

    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_clear_cache",
            type: "button"
        },
        field: {
            name: "Скинути кеш логотипів",
            description: "Натисніть, щоб очистити кеш зображень"
        },
        onChange: function () {
            Lampa.Select.show({
                title: "Скинути кеш?",
                items: [
                    { title: "Так", confirm: !0 },
                    { title: "Ні" }
                ],
                onSelect: function (e) {
                    if (e.confirm) {
                        var keys = [];
                        for (var i = 0; i < localStorage.length; i++) {
                            var k = localStorage.key(i);
                            if (k.indexOf("logo_cache_width_based_v1_") !== -1) keys.push(k);
                        }
                        keys.forEach(function (k) { localStorage.removeItem(k); });
                        window.location.reload();
                    } else {
                        Lampa.Controller.toggle("settings_component");
                    }
                },
                onBack: function () {
                    Lampa.Controller.toggle("settings_component");
                }
            });
        }
    });

    if (!window.logoplugin) {
        window.logoplugin = !0;

        var anim_delay_hide = 300,
            anim_delay_show = 400,
            anim_height = 400,
            top_padding = Lampa.Storage.get("logo_hide_year", !0) ? 0 : .3;

        function animateOpacity(el, from, to, duration, done) {
            var start = null;
            requestAnimationFrame(function step(ts) {
                if (!start) start = ts;
                var progress = ts - start;
                var p = Math.min(progress / duration, 1);
                var ease = 1 - Math.pow(1 - p, 3);
                el.style.opacity = from + (to - from) * ease;
                if (progress < duration) requestAnimationFrame(step);
                else if (done) done();
            });
        }

        function applyLogoStyles(img, old, hasTagline, textHeight) {
            if (old) {
                old.style.height = "";
                old.style.overflow = "";
                old.style.display = "";
                old.style.transition = "none";
                old.style.boxSizing = "";
            }

            img.style.marginTop = "0";
            img.style.marginLeft = "0";
            img.style.paddingTop = top_padding + "em";

            var padBottom = .2;
            if (window.innerWidth < 768 && hasTagline) padBottom = .5;
            img.style.paddingBottom = padBottom + "em";

            if (Lampa.Storage.get("logo_use_text_height", !1) && textHeight) {
                img.style.height = textHeight + "px";
                img.style.width = "auto";
                img.style.maxWidth = "100%";
                img.style.maxHeight = "none";
            } else if (window.innerWidth < 768) {
                img.style.width = "100%";
                img.style.height = "auto";
                img.style.maxWidth = "100%";
                img.style.maxHeight = "none";
            } else {
                img.style.width = "7em";
                img.style.height = "auto";
                img.style.maxHeight = "none";
                img.style.maxWidth = "100%";
            }

            img.style.boxSizing = "border-box";
            img.style.display = "block";
            img.style.objectFit = "contain";
            img.style.objectPosition = "left bottom";
            img.style.opacity = "1";
            img.style.transition = "none";
        }

        Lampa.Listener.follow("full", function (ev) {
            if (ev.type == "complite" && Lampa.Storage.get("logo_glav") != "1") {
                var movie = ev.data.movie;
                var type = movie.name ? "tv" : "movie";

                var title = ev.object.activity.render().find(".full-start-new__title");
                var head = ev.object.activity.render().find(".full-start-new__head");
                var details = ev.object.activity.render().find(".full-start-new__details");
                var tagline = ev.object.activity.render().find(".full-start-new__tagline");

                var hasTagline = tagline.length > 0 && tagline.text().trim() !== "";

                var titleEl = title[0];
                var lang = Lampa.Storage.get("logo_lang", "");
                var selected_lang = lang || Lampa.Storage.get("language");
                var size = Lampa.Storage.get("logo_size", "original");

                var cacheKey = "logo_cache_width_based_v1_" + type + "_" + movie.id + "_" + selected_lang;

                function moveHeadAnimated(applyAnim, animType) {
                    if (head.length && details.length && !details.find(".logo-moved-head").length &&
                        Lampa.Storage.get("logo_hide_year", !0)) {

                        var html = head.html();
                        if (!html) return;

                        var span = $('<span class="logo-moved-head">' + html + "</span>");
                        var sep = $('<span class="full-start-new__split logo-moved-separator">●</span>');

                        if (applyAnim) {
                            span.css({ opacity: 0, marginLeft: "0.6em", transition: "none" });
                            sep.css({ opacity: 0, transition: "none" });

                            if (details.children().length > 0) details.append(sep);
                            details.append(span);

                            if (animType === "js") {
                                head.css("transition", "none");
                                animateOpacity(head[0], 1, 0, anim_delay_hide, function () {
                                    animateOpacity(span[0], 0, 1, anim_delay_show);
                                    animateOpacity(sep[0], 0, 1, anim_delay_show);
                                });
                            } else {
                                head.css({ transition: "opacity 0.3s ease", opacity: "0" });
                                setTimeout(function () {
                                    span.css({ transition: "opacity 0.4s ease", opacity: "1" });
                                    sep.css({ transition: "opacity 0.4s ease", opacity: "1" });
                                }, anim_delay_hide);
                            }
                        } else {
                            head.css("opacity", "0");
                            if (details.children().length > 0) details.append(sep);
                            details.append(span);
                        }
                    }
                }

                var cached = Lampa.Storage.get(cacheKey);

                if (cached && cached !== "none") {
                    var imgCached = new Image();
                    imgCached.src = cached;

                    var textHeight = 0;
                    if (titleEl) textHeight = titleEl.getBoundingClientRect().height;

                    applyLogoStyles(imgCached, null, hasTagline, textHeight);
                    title.empty().append(imgCached);
                    title.css({ opacity: "1", transition: "none" });

                    moveHeadAnimated(!1);

                    return;
                }

                title.css({ opacity: "1", transition: "none" });

                if (movie.id != "") {
                    var textHeight = 0;
                    requestAnimationFrame(function () {
                        if (titleEl) textHeight = titleEl.getBoundingClientRect().height;
                    });

                    var url = Lampa.TMDB.api(
                        type + "/" + movie.id +
                        "/images?api_key=" + Lampa.TMDB.key() +
                        "&include_image_language=" + selected_lang + ",en,null"
                    );

                    $.get(url, function (data) {
                        var file = null;

                        if (titleEl)
                            textHeight = titleEl.getBoundingClientRect().height;

                        if (data.logos && data.logos.length > 0) {
                            for (var i = 0; i < data.logos.length; i++)
                                if (data.logos[i].iso_639_1 == selected_lang) {
                                    file = data.logos[i].file_path;
                                    break;
                                }

                            if (!file)
                                for (var j = 0; j < data.logos.length; j++)
                                    if (data.logos[j].iso_639_1 == "en") {
                                        file = data.logos[j].file_path;
                                        break;
                                    }

                            if (!file)
                                file = data.logos[0].file_path;
                        }

                        if (file) {
                            var img_url = Lampa.TMDB.image("/t/p/" + size + file.replace(".svg", ".png"));

                            Lampa.Storage.set(cacheKey, img_url);

                            var img = new Image();
                            img.src = img_url;
                            img.style.opacity = "0";

                            img.onload = function () {
                                setTimeout(function () {
                                    if (titleEl)
                                        textHeight = titleEl.getBoundingClientRect().height;

                                    var animType = Lampa.Storage.get("logo_animation_type", "css");

                                    moveHeadAnimated(!0, animType);

                                    if (animType === "js") {
                                        title.css({ transition: "none" });

                                        animateOpacity(titleEl, 1, 0, anim_delay_hide, function () {
                                            title.empty();
                                            title.append(img);
                                            title.css({ opacity: "1", transition: "none" });

                                            var oldH = textHeight;
                                            var newH = titleEl.getBoundingClientRect().height;

                                            titleEl.style.height = oldH + "px";
                                            titleEl.style.display = "block";
                                            titleEl.style.overflow = "hidden";
                                            titleEl.style.boxSizing = "border-box";

                                            var start = null;
                                            requestAnimationFrame(function step(ts) {
                                                if (!start) start = ts;
                                                var progress = ts - start;
                                                var p = Math.min(progress / anim_height, 1);
                                                var ease = 1 - Math.pow(1 - p, 3);
                                                titleEl.style.height = oldH + (newH - oldH) * ease + "px";
                                                if (progress < anim_height) requestAnimationFrame(step);
                                                else setTimeout(function () {
                                                    applyLogoStyles(img, titleEl, hasTagline, textHeight);
                                                }, 450);
                                            });

                                            setTimeout(function () {
                                                img.style.transition = "none";
                                                animateOpacity(img, 0, 1, anim_delay_show);
                                            }, 300);
                                        });

                                    } else {
                                        title.css({ transition: "opacity 0.3s ease", opacity: "0" });

                                        setTimeout(function () {
                                            title.empty();
                                            title.append(img);
                                            title.css({ opacity: "1", transition: "none" });

                                            var newHeight = titleEl.getBoundingClientRect().height;

                                            titleEl.style.height = textHeight + "px";
                                            titleEl.style.display = "block";
                                            titleEl.style.overflow = "hidden";
                                            titleEl.style.boxSizing = "border-box";

                                            titleEl.style.transition =
                                                "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)";

                                            requestAnimationFrame(function () {
                                                titleEl.style.height = newHeight + "px";

                                                setTimeout(function () {
                                                    img.style.transition = "opacity 0.4s ease";
                                                    img.style.opacity = "1";
                                                }, 300);

                                                setTimeout(function () {
                                                    applyLogoStyles(img, titleEl, hasTagline, textHeight);
                                                }, 850);
                                            });
                                        }, anim_delay_hide);
                                    }
                                }, 200);
                            };

                            img.onerror = function () {
                                Lampa.Storage.set(cacheKey, "none");
                                title.css({ opacity: "1", transition: "none" });
                            };

                        } else {
                            Lampa.Storage.set(cacheKey, "none");
                        }
                    }).fail(function () { });
                }
            }
        });
    }
}();
