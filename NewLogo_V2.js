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
            values: { 1: "Приховати", 0: "Відображати" },
            default: "0"
        },
        field: {
            name: "Логотипи замість назви",
            description: "Відображати логотип замість назви фільмів"
        }
    });

    // 2. Мова логотипу
    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_lang",
            type: "select",
            values: {
                "": "Как в Lampa",
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
            name: "Роздільна здатність логотипу",
            description: "Роздільна здатність логотипу"
        }
    });

    // 4. Тип анімації
    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_animation_type",
            type: "select",
            values: {
                js: "JavaScript",
                css: "CSS"
            },
            default: "css"
        },
        field: {
            name: "Тип анімації логотипу",
            description: "Анімація логотипу"
        }
    });

    // 5. Приховувати рік та країну
    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_hide_year",
            type: "trigger",
            default: true
        },
        field: {
            name: " Приховати рік та країну",
            description: "Приховати інформацію над логотипом"
        }
    });

    // 6. Логотип по висоті тексту
    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_use_text_height",
            type: "trigger",
            default: false
        },
        field: {
            name: "Логотип по висоті тексту",
            description: "Размір логотипу по висоті тексту"
        }
    });

    // 7. Кнопка очищення кешу
    Lampa.SettingsApi.addParam({
        component: "interface",
        param: {
            name: "logo_clear_cache",
            type: "button"
        },
        field: {
            name: "Очищення кешу логотипів",
            description: "Нажміть для очищення кешу логотипів"
        },
        onChange: function () {
            Lampa.Select.show({
                title: "Очистити кеш?",
                items: [{
                    title: "Так",
                    confirm: true
                }, {
                    title: "Ні"
                }],
                onSelect: function (e) {
                    if (e.confirm) {
                        var t = [];
                        for (var n = 0; n < localStorage.length; n++) {
                            var a = localStorage.key(n);
                            if (a.indexOf("logo_cache_width_based_v1_") !== -1) {
                                t.push(a);
                            }
                        }
                        t.forEach(function (e) {
                            localStorage.removeItem(e);
                        });
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


    // =======================================================
    // II. ЛОГІКА ПЛАГІНА
    // =======================================================

    if (!window.logoplugin) {
        
        var e = 300, // Анімаційна константа 1 (початкова затримка?)
            t = 400, // Анімаційна константа 2 (час анімації висоти)
            n = 400, // Анімаційна константа 3 (час анімації прозорості)
            a = Lampa.Storage.get("logo_hide_year", true) ? 0 : 0.3; // Відступ, якщо рік/країна не приховані

        /**
         * Функція анімації прозорості (JavaScript-реалізація).
         * @param {HTMLElement} e - Елемент для анімації.
         * @param {number} t - Початкова прозорість (opacity).
         * @param {number} n - Кінцева прозорість (opacity).
         * @param {number} a - Тривалість анімації.
         * @param {function} i - Коллбек після завершення.
         */
        function i(e, t, n, a, i) {
            var o = null;
            requestAnimationFrame(function s(l) {
                o || (o = l);
                var r = l - o,
                    g = Math.min(r / a, 1),
                    c = 1 - Math.pow(1 - g, 3); // Ефект "easeOutCubic"
                e.style.opacity = t + (n - t) * c;
                if (r < a) {
                    requestAnimationFrame(s);
                } else {
                    i && i();
                }
            });
        }

        /**
         * Функція встановлення стилів для відображення логотипу.
         * @param {HTMLElement} e - Елемент логотипу (Image).
         * @param {HTMLElement} t - Елемент назви (старий, для анімації висоти).
         * @param {boolean} n - Чи є теглайн (m).
         * @param {number} i - Висота тексту.
         */
        function o(e, t, n, i) {
            // Скидаємо старі стилі
            if (t) {
                t.style.height = "";
                t.style.overflow = "";
                t.style.display = "";
                t.style.transition = "none";
                t.style.boxSizing = "";
            }
            
            // Встановлюємо відступи
            e.style.marginTop = "0";
            e.style.marginLeft = "0";
            e.style.paddingTop = a + "em";
            var o = 0.2;
            if (window.innerWidth < 768 && n) {
                o = 0.5;
            }
            e.style.paddingBottom = o + "em";

            // Встановлюємо розміри
            if (Lampa.Storage.get("logo_use_text_height", false) && i) {
                e.style.height = i + "px";
                e.style.width = "auto";
                e.style.maxWidth = "100%";
                e.style.maxHeight = "none";
            } else if (window.innerWidth < 768) {
                e.style.width = "100%";
                e.style.height = "auto";
                e.style.maxWidth = "100%";
                e.style.maxHeight = "none";
            } else {
                e.style.width = "7em";
                e.style.height = "auto";
                e.style.maxHeight = "none";
                e.style.maxWidth = "100%";
            }
            
            e.style.boxSizing = "border-box";
            e.style.display = "block";
            e.style.objectFit = "contain";
            e.style.objectPosition = "left bottom";
            e.style.opacity = "1";
            e.style.transition = "none";
        }

        window.logoplugin = true;

        // Підписуємося на подію повного завантаження
        Lampa.Listener.follow("full", function (a) {
            if (a.type === "complite" && Lampa.Storage.get("logo_glav") !== "1") {
                var s = a.data.movie,
                    l = s.name ? "tv" : "movie",
                    r = a.object.activity.render().find(".full-start-new__title"), // Контейнер назви/логотипу
                    g = a.object.activity.render().find(".full-start-new__head"), // Рік/Країна
                    c = a.object.activity.render().find(".full-start-new__details"), // Контейнер для деталей
                    p = a.object.activity.render().find(".full-start-new__tagline"), // Теглайн
                    m = p.length > 0 && p.text().trim() !== "", // Чи є теглайн
                    d = r[0], // DOM-елемент назви
                    f = Lampa.Storage.get("logo_lang", ""),
                    y = f || Lampa.Storage.get("language"), // Мова
                    u = Lampa.Storage.get("logo_size", "original"), // Розмір
                    h = function (e, t, n) {
                        return "logo_cache_width_based_v1_" + e + "_" + t + "_" + n
                    }(l, s.id, y); // Ключ кешу

                /**
                 * Функція перенесення року та країни під деталі.
                 * @param {boolean} t - Чи використовувати анімацію.
                 * @param {string} a - Тип анімації ('js' або 'css').
                 */
                function L(t, a) {
                    if (g.length && c.length && c.find(".logo-moved-head").length === 0 && Lampa.Storage.get("logo_hide_year", true)) {
                        var o = g.html();
                        if (o) {
                            var s = $('<span class="logo-moved-head">' + o + "</span>"),
                                l = $('<span class="full-start-new__split logo-moved-separator">●</span>');

                            if (t) { // Анімований перехід
                                s.css({
                                    opacity: 0,
                                    marginLeft: "0.6em",
                                    transition: "none"
                                });
                                l.css({
                                    opacity: 0,
                                    transition: "none"
                                });

                                if (c.children().length > 0) c.append(l);
                                c.append(s);

                                if (a === "js") {
                                    g.css("transition", "none");
                                    i(g[0], 1, 0, e, function () { // Приховуємо старий блок
                                        i(s[0], 0, 1, n); // Показуємо новий блок
                                        i(l[0], 0, 1, n);
                                    });
                                } else { // CSS анімація
                                    g.css({
                                        transition: "opacity 0.3s ease",
                                        opacity: "0"
                                    });
                                    setTimeout(function () {
                                        s.css({
                                            transition: "opacity 0.4s ease",
                                            opacity: "1"
                                        });
                                        l.css({
                                            transition: "opacity 0.4s ease",
                                            opacity: "1"
                                        });
                                    }, e);
                                }
                            } else { // Без анімації (при завантаженні з кешу)
                                g.css("opacity", "0");
                                if (c.children().length > 0) c.append(l);
                                c.append(s);
                            }
                        }
                    }
                }

                // 1. ПЕРЕВІРКА КЕШУ
                var _ = Lampa.Storage.get(h);
                if (_ && _ !== "none") {
                    var v = new Image;
                    v.src = _;
                    var w = 0;
                    if (d) {
                        w = d.getBoundingClientRect().height;
                    }
                    o(v, null, m, w);
                    r.empty().append(v);
                    r.css({
                        opacity: "1",
                        transition: "none"
                    });
                    L(false); // Переміщуємо рік без анімації
                    return;
                }

                // 2. ЯКЩО НЕМАЄ КЕШУ - ГОТУЄМОСЯ ДО ЗАПИТУ
                r.css({
                    opacity: "1",
                    transition: "none"
                });
                
                if (s.id !== "") {
                    w = 0;
                    requestAnimationFrame(function () {
                        if (d) {
                            w = d.getBoundingClientRect().height;
                        }
                    });

                    var S = Lampa.TMDB.api(l + "/" + s.id + "/images?api_key=" + Lampa.TMDB.key() + "&include_image_language=" + y + ",en,null");

                    // 3. ЗАПИТ TMDB
                    $.get(S, function (a) {
                        var s = null;
                        if (d) {
                            w = d.getBoundingClientRect().height; // Оновлюємо висоту
                        }

                        // Логіка вибору логотипу: 1. Мова користувача 2. Англійська 3. Перший доступний
                        if (a.logos && a.logos.length > 0) {
                            for (var l = 0; l < a.logos.length; l++) {
                                if (a.logos[l].iso_639_1 == y) {
                                    s = a.logos[l].file_path;
                                    break;
                                }
                            }
                            if (!s) {
                                for (var g = 0; g < a.logos.length; g++) {
                                    if ("en" == a.logos[g].iso_639_1) {
                                        s = a.logos[g].file_path;
                                        break;
                                    }
                                }
                            }
                            if (!s) {
                                s = a.logos[0].file_path;
                            }
                        }

                        if (s) {
                            var c = Lampa.TMDB.image("/t/p/" + u + s.replace(".svg", ".png"));
                            Lampa.Storage.set(h, c); // Кешуємо URL

                            var p = new Image;
                            p.src = c;
                            o(p, null, m, w);
                            p.style.opacity = "0";

                            // 4. АНІМАЦІЯ ПІСЛЯ ЗАВАНТАЖЕННЯ ЗОБРАЖЕННЯ
                            p.onload = function () {
                                setTimeout(function () {
                                    if (d) {
                                        w = d.getBoundingClientRect().height; // Повторне оновлення висоти
                                    }
                                    
                                    var a = Lampa.Storage.get("logo_animation_type", "css");
                                    L(true, a); // Переміщуємо рік з анімацією

                                    if (a === "js") { // JavaScript Анімація
                                        r.css({ transition: "none" });
                                        i(d, 1, 0, e, function () { // Анімуємо приховування тексту
                                            r.empty();
                                            r.append(p);
                                            r.css({
                                                opacity: "1",
                                                transition: "none"
                                            });
                                            
                                            // Анімація висоти контейнера
                                            var e, a, s, l, g, c, f = d.getBoundingClientRect().height;
                                            d.style.height = w + "px";
                                            d.style.display = "block";
                                            d.style.overflow = "hidden";
                                            d.style.boxSizing = "border-box";
                                            d.offsetHeight;
                                            d.style.transition = "none";
                                            
                                            e = d;
                                            a = w;
                                            s = f;
                                            l = t;
                                            g = function () {
                                                setTimeout(function () {
                                                    o(p, d, m, w)
                                                }, 450)
                                            };
                                            c = null;
                                            
                                            requestAnimationFrame(function t(n) {
                                                c || (c = n);
                                                var i = n - c,
                                                    o = Math.min(i / l, 1),
                                                    r = 1 - Math.pow(1 - o, 3);
                                                e.style.height = a + (s - a) * r + "px";
                                                if (i < l) {
                                                    requestAnimationFrame(t);
                                                } else {
                                                    g && g();
                                                }
                                            });

                                            // Анімація появи логотипу
                                            setTimeout(function () {
                                                p.style.transition = "none";
                                                i(p, 0, 1, n);
                                            }, Math.max(0, 300));
                                        });

                                    } else { // CSS Анімація
                                        r.css({
                                            transition: "opacity 0.3s ease",
                                            opacity: "0"
                                        });
                                        setTimeout(function () {
                                            r.empty();
                                            r.append(p);
                                            r.css({
                                                opacity: "1",
                                                transition: "none"
                                            });
                                            
                                                                        // CSS анімація висоти
                                            var e = d.getBoundingClientRect().height;
                                            d.style.height = w + "px";
                                            d.style.display = "block";
                                            d.style.overflow = "hidden";
                                            d.style.boxSizing = "border-box";
                                            d.offsetHeight;
                                            d.style.transition = "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
                                            
                                            requestAnimationFrame(function () {
                                                d.style.height = e + "px";
                                                setTimeout(function () {
                                                    p.style.transition = "opacity 0.4s ease";
                                                    p.style.opacity = "1"
                                                }, Math.max(0, 300));
                                                setTimeout(function () {
                                                    o(p, d, m, w)
                                                }, 850);
                                            });
                                        }, e);
                                    }
                                }, 200);
                            }, p.onerror = function () {
                                Lampa.Storage.set(h, "none"); // Кешуємо помилку
                                r.css({
                                    opacity: "1",
                                    transition: "none"
                                });
                            }
                        } else {
                            Lampa.Storage.set(h, "none"); // Немає логотипів
                        }
                    }).fail(function () {});
                }
            }
        });
    }
})();
