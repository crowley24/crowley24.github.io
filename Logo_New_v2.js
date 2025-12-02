!function() {  
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
            name: "Мова логотипа",  
            description: "Пріоритетна мова для пошуку логотипа"  
        }  
    });  
  
    // 3. Розмір логотипа  
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
            name: "Тип анімації логотипів",  
            description: "Спосіб анімації логотипів"  
        }  
    });  
  
    // 5. Приховати рік та країну  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_hide_year",  
            type: "trigger",  
            default: true  
        },  
        field: {  
            name: "Приховати рік та країну",  
            description: "Приховує інформацію над логотипом"  
        }  
    });  
  
    // 6. Логотип за висотою тексту  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_use_text_height",  
            type: "trigger",  
            default: false  
        },  
        field: {  
            name: "Логотип за висотою тексту",  
            description: "Розмір логотипа дорівнює висоті тексту"  
        }  
    });  
  
    // 7. Очистка кешу  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_clear_cache",  
            type: "button"  
        },  
        field: {  
            name: "Скинути кеш логотипів",  
            description: "Натисніть для очищення кешу зображень"  
        },  
        onChange: function() {  
            Lampa.Select.show({  
                title: "Скинути кеш?",  
                items: [  
                    { title: "Так", confirm: true },  
                    { title: "Ні" }  
                ],  
                onSelect: function(e) {  
                    if (e.confirm) {  
                        for (var t = [], n = 0; n < localStorage.length; n++) {  
                            var a = localStorage.key(n);  
                            -1 !== a.indexOf("logo_cache_width_based_v1_") && t.push(a);  
                        }  
                        t.forEach(function(e) {  
                            localStorage.removeItem(e);  
                        });  
                        window.location.reload();  
                    } else {  
                        Lampa.Controller.toggle("settings_component");  
                    }  
                },  
                onBack: function() {  
                    Lampa.Controller.toggle("settings_component");  
                }  
            });  
        }  
    });  
  
    // =======================================================  
    // II. ОСНОВНИЙ КОД ПЛАГІНА  
    // =======================================================  
      
    window.logoplugin || function() {  
        var e = 300,  // Час анімації fade  
            t = 400,  // Час анімації height  
            n = 400,  // Затримка перед показом логотипа  
            a = Lampa.Storage.get("logo_hide_year", true) ? 0 : .3;  // Відступ зверху  
  
        // Функція анімації opacity  
        function i(e, t, n, a, i) {  
            var o = null;  
            requestAnimationFrame(function s(l) {  
                o || (o = l);  
                var r = l - o,  
                    g = Math.min(r / a, 1),  
                    c = 1 - Math.pow(1 - g, 3);  
                e.style.opacity = t + (n - t) * c;  
                r < a ? requestAnimationFrame(s) : i && i();  
            });  
        }  
  
        // Функція застосування стилів до логотипа  
        function o(e, t, n, i) {  
            t && (t.style.height = "",   
                  t.style.overflow = "",   
                  t.style.display = "",   
                  t.style.transition = "none",   
                  t.style.boxSizing = "");  
              
            e.style.marginTop = "0";  
            e.style.marginLeft = "0";  
            e.style.paddingTop = a + "em";  
              
            var o = .2;  
            window.innerWidth < 768 && n && (o = .5);  
            e.style.paddingBottom = o + "em";  
              
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
          
        // Слухач подій для повного екрану  
        Lampa.Listener.follow("full", function(a) {  
            if ("complite" == a.type && "1" != Lampa.Storage.get("logo_glav")) {  
                var s = a.data.movie,  
                    l = s.name ? "tv" : "movie",  
                    r = a.object.activity.render().find(".full-start-new__title"),  
                    g = a.object.activity.render().find(".full-start-new__head"),  
                    c = a.object.activity.render().find(".full-start-new__details"),  
                    p = a.object.activity.render().find(".full-start-new__tagline"),  
                    m = p.length > 0 && "" !== p.text().trim(),  
                    d = r[0],  
                    f = Lampa.Storage.get("logo_lang", ""),  
                    y = f || Lampa.Storage.get("language"),  
                    u = Lampa.Storage.get("logo_size", "original"),  
                    h = function(e, t, n) {  
                        return "logo_cache_width_based_v1_" + e + "_" + t + "_" + n;  
                    }(l, s.id, y);  
  
                // Функція переміщення року/країни  
                function L(t, a) {  
                    if (g.length && c.length &&   
                        !(c.find(".logo-moved-head").length > 0) &&   
                        Lampa.Storage.get("logo_hide_year", true)) {  
                          
                        var o = g.html();  
                        if (o) {  
                            var s = $('<span class="logo-moved-head">' + o + "</span>"),  
                                l = $('<span class="full-start-new__split logo-moved-separator">●</span>');  
                              
                            if (t) {  
                                s.css({ opacity: 0, marginLeft: "0.6em", transition: "none" });  
                                l.css({ opacity: 0, transition: "none" });  
                                c.children().length > 0 && c.append(l);  
                                c.append(s);  
                                  
                                if ("js" === a) {  
                                    g.css("transition", "none");  
                                    i(g[0], 1, 0, e, function() {  
                                        i(s[0], 0, 1, n);  
                                        i(l[0], 0, 1, n);  
                                    });  
                                } else {  
                                    g.css({ transition: "opacity 0.3s ease", opacity: "0" });  
                                    setTimeout(function() {  
                                        s.css({ transition: "opacity 0.4s ease", opacity: "1" });  
                                        l.css({ transition: "opacity 0.4s ease", opacity: "1" });  
                                    }, e);  
                                }  
                            } else {  
                                g.css("opacity", "0");  
                                c.children().length > 0 && c.append(l);  
                                c.append(s);  
                            }  
                        }  
                    }  
                }  
  
                // Перевірка кешу  
                var _ = Lampa.Storage.get(h);  
                if (_ && "none" !== _) {  
                    var v = new Image;  
                    v.src = _;  
                    var w = 0;  
                    return d && (w = d.getBoundingClientRect().height),  
                           o(v, null, m, w),  
                           r.empty().append(v),  
                           r.css({ opacity: "1", transition: "none" }),  
                           void L(false);  
                }  
  
                // Завантаження з TMDB  
                if (r.css({ opacity: "1", transition: "none" }), "" != s.id) {  
                    w = 0;  
                    requestAnimationFrame(function() {  
                        d && (w = d.getBoundingClientRect().height);  
                    });  
                      
                    var S = Lampa.TMDB.api(l + "/" + s.id + "/images?api_key=" + Lampa.TMDB.key() + "&include_image_language=" + y + ",en", null);  
                      
                    $.get(S, function(a) {  
                        var s = null;  
                        if (d && (w = d.getBoundingClientRect().height), a.logos && a.logos.length > 0) {  
                            // Пошук логотипа за мовою  
                            for (var l = 0; l < a.logos.length; l++) {  
                                if (a.logos[l].iso_639_1 == y) {  
                                    s = a.logos[l].file_path;  
                                    break;  
                                }  
                            }  
                              
                            // Якщо не знайдено - шукаємо англійську  
                            if (!s) {  
                                for (var g = 0; g < a.logos.length; g++) {  
                                    if ("en" == a.logos[g].iso_639_1) {  
                                        s = a.logos[g].file_path;  
                                        break;  
                                    }  
                                }  
                            }  
                              
                            // Якщо все ще не знайдено - беремо перший  
                            s || (s = a.logos[0].file_path);  
                        }  
                          
                        if (s) {  
                            var c = Lampa.TMDB.image("/t/p/" + u + s.replace(".svg", ".png"));  
                            Lampa.Storage.set(h, c);  
                              
                            var p = new Image;  
                            p.src = c;  
                            o(p, null, m, w);  
                            p.style.opacity = "0";  
                              
                            p.onload = function() {  
                                setTimeout(function() {  
                                    d && (w = d.getBoundingClientRect().height);  
                                    var a = Lampa.Storage.get("logo_animation_type", "css");  
                                    L(true, a);  
                                      
                                    if ("js" === a) {  
                                        // JavaScript анімація  
                                        r.css({ transition: "none" });  
                                        i(d, 1, 0, e, function() {  
                                            r.empty().append(p);  
                                            r.css({ opacity: "1", transition: "none" });  
                                              
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
                                            g = function() {  
                                                setTimeout(function() {  
                                                    o(p, d, m, w);  
                                                }, 450);  
                                            };  
                                            c = null;  
                                              
                                            requestAnimationFrame(function t(n) {  
                                                c || (c = n);  
                                                var i = n - c,  
                                                    o = Math.min(i / l, 1),  
                                                    r = 1 - Math.pow(1 - o, 3);  
                                                e.style.height = a + (s - a) * r + "px";  
                                                i < l ? requestAnimationFrame(t) : g && g();  
                                            });  
                                              
                                            setTimeout(function() {  
                                                p.style.transition = "none";  
                                                i(p, 0, 1, n);  
                                            }, Math.max(0, 300));  
                                        });  
                                    } else {  
                                        // CSS анімація  
                                        r.css({ transition: "opacity 0.3s ease", opacity: "0" });  
                                        setTimeout(function() {  
                                            r.empty().append(p);  
                                            r.css({ opacity: "1", transition: "none" });  
                                              
                                            var e = d.getBoundingClientRect().height;  
                                            d.style.height = w + "px";  
                                            d.style.display = "block";  
                                            d.style.overflow = "hidden";  
                                            d.style.boxSizing = "border-box";  
                                            d.offsetHeight;  
                                            d.style.transition = "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)";  
                                              
                                            requestAnimationFrame(function() {  
                                                d.style.height = e + "px";  
                                                setTimeout(function() {  
                                                    p.style.transition = "opacity 0.4s ease";  
                                                    p.style.opacity = "1";  
                                                }, Math.max(0, 300));  
                                                setTimeout(function() {  
                                                    o(p, d, m, w);  
                                                }, 850);  
                                            });  
                                        }, e);  
                                    }  
                                }, 200);  
                            };  
                              
                            p.onerror = function() {  
                                Lampa.Storage.set(h, "none");  
                                r.css({ opacity: "1", transition: "none" });  
                            };  
                        } else {  
                            Lampa.Storage.set(h, "none");  
                        }  
                    }).fail(function() {});  
                }  
            }  
        });  
    }();  
}();
