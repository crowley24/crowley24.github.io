!function() {  
    "use strict";  
      
    // Додавання налаштувань для логотипів  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_glav",  
            type: "select",  
            values: {  
                1: "Скрыть",  
                0: "Отображать"  
            },  
            default: "0"  
        },  
        field: {  
            name: "Логотипы вместо названий",  
            description: "Отображает логотипы фильмов вместо текста"  
        }  
    });  
      
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
            name: "Язык логотипа",  
            description: "Приоритетный язык для поиска логотипа"  
        }  
    });  
      
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_size",  
            type: "select",  
            values: {  
                w300: "w300",  
                w500: "w500",  
                w780: "w780",  
                original: "Оригинал"  
            },  
            default: "original"  
        },  
        field: {  
            name: "Размер логотипа",  
            description: "Разрешение загружаемого изображения"  
        }  
    });  
      
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
            name: "Тип анимации логотипов",  
            description: "Способ анимации логотипов"  
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
            name: "Скрывать год и страну",  
            description: "Скрывать информацию над логотипом"  
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
            name: "Логотип по высоте текста",  
            description: "Размер логотипа равен высоте текста"  
        }  
    });  
      
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_clear_cache",  
            type: "button"  
        },  
        field: {  
            name: "Очистить кеш логотипов",  
            description: "Удалить все загруженные логотипы"  
        },  
        onChange: function() {  
            Lampa.Storage.cache("logo", "clear"),  
            Lampa.Storage.set("logo_cache_size", 0),  
            Lampa.Noty.show("Кеш логотипов очищен")  
        }  
    });  
      
    // Основна функціональність плагіна  
    Lampa.Listener.follow("full", function(e) {  
        if ("movie" == e.type || "tv" == e.type) {  
            var t = e.data,  
                a = t.movie;  
            if (a && ("true" == Lampa.Storage.get("logo_glav", "0") || Lampa.Storage.field("logo_glav"))) {  
                var i = Lampa.Activity.active().component,  
                    n = i.render().find(".full-poster--logo"),  
                    s = i.render().find(".full-poster"),  
                o = i.render().find(".full-poster__img"),  
                r = i.render().find(".full-poster__footer"),  
                l = i.render().find(".full-poster__title"),  
                d = i.render().find(".full-poster__title"),  
                c = "logo_" + a.id,  
                p = Lampa.Storage.get(c, "none"),  
                h = Lampa.Storage.get("logo_lang", ""),  
                u = Lampa.Storage.get("logo_size", "original"),  
                m = Lampa.Storage.get("logo_animation_type", "css"),  
                g = Lampa.Storage.get("logo_hide_year", !0),  
                f = Lampa.Storage.get("logo_use_text_height", !1);  
                  
                // Функція отримання URL логотипа  
                function v(e, t, a) {  
                    var i = "";  
                    return e.logos && e.logos.length ? (i = e.logos[0].file_path, "original" != t && (i = i.replace("original", t)), i) : a && a.logos && a.logos.length ? (i = a.logos[0].file_path, "original" != t && (i = i.replace("original", t)), i) : ""  
                }  
                  
                // Функція відображення логотипа  
                function y(e, t, a, i) {  
                    if (e) {  
                        var n = Lampa.Template.get("logo", {  
                            title: t  
                        });  
                        n.find("img").on("load", (function() {  
                            Lampa.Controller.enable("content")  
                        })),  
                        n.find("img").on("error", (function() {  
                            Lampa.Controller.enable("content")  
                        })),  
                        n.find("img").attr("src", e),  
                        l.append(n),  
                        Lampa.Controller.collectionAppend(n),  
                        Lampa.Controller.collectionSet(n),  
                        Lampa.Controller.toggle("content"),  
                        Lampa.Controller.enable("content")  
                    }  
                }  
                  
                // Перевірка та завантаження логотипа  
                if ("none" != p) {  
                    var b = v(a, u);  
                    b && y(b, a.title)  
                } else {  
                    var x = Lampa.TMDB.image(a.images);  
                    if (x) {  
                        var w = v(x, u, a);  
                        if (w) {  
                            var k = new Image;  
                            k.src = w,  
                            k.style.opacity = "0",  
                            k.onload = function() {  
                                setTimeout((function() {  
                                    d && (w = d.getBoundingClientRect().height);  
                                    var a = Lampa.Storage.get("logo_animation_type", "css");  
                                    L(!0, a),  
                                    "js" === a ? (r.css({  
                                        transition: "none"  
                                    }), i(d, 1, 0, e, (function() {  
                                        r.empty(),  
                                        r.append(k),  
                                        r.css({  
                                            opacity: "1",  
                                            transition: "none"  
                                        });  
                                        var e, a, s, l, g, c, f = d.getBoundingClientRect().height;  
                                        d.style.height = w + "px",  
                                        d.style.display = "block",  
                                        d.style.overflow = "hidden",  
                                        d.style.boxSizing = "border-box",  
                                        d.offsetHeight,  
                                        d.style.transition = "none",  
                                        e = d,  
                                        a = w,  
                                        s = f,  
                                        l = t,  
                                        g = function() {  
                                            setTimeout((function() {  
                                                y(k, d, m, w)  
                                            }), 450)  
                                        },  
                                        c = null,  
                                        requestAnimationFrame((function t(n) {  
                                            c || (c = n);  
                                            var i = n - c,  
                                                o = Math.min(i / l, 1),  
                                                r = 1 - Math.pow(1 - o, 3);  
                                            e.style.height = a + (s - a) * r + "px",  
                                            i < l ? requestAnimationFrame(t) : g && g()  
                                        })),  
                                        setTimeout((function() {  
                                            k.style.transition = "none",  
                                            i(k, 0, 1, n)  
                                        }), Math.max(0, 300))  
                                    }))) : (r.css({  
                                        transition: "opacity 0.3s ease",  
                                        opacity: "0"  
                                    }), setTimeout((function() {  
                                        r.empty(),  
                                        r.append(k),  
                                        r.css({  
                                            opacity: "1",  
                                            transition: "none"  
                                        });  
                                        var e = d.getBoundingClientRect().height;  
                                        d.style.height = w + "px",  
                                        d.style.display = "block",  
                                        d.style.overflow = "hidden",  
                                        d.style.boxSizing = "border-box",  
                                        d.offsetHeight,  
                                        d.style.transition = "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",  
                                        requestAnimationFrame((function() {  
                                            d.style.height = e + "px",  
                                            setTimeout((function() {  
                                                k.style.transition = "opacity 0.4s ease",  
                                                k.style.opacity = "1"  
                                            }), Math.max(0, 300)),  
                                            setTimeout((function() {  
                                                y(k, d, m, w)  
                                            }), 850)  
                                        }))  
                                    }), e))  
                                }), 200)  
                            },  
                            k.onerror = function() {  
                                Lampa.Storage.set(c, "none"),  
                                r.css({  
                                    opacity: "1",  
                                    transition: "none"  
                                })  
                            }  
                        } else Lampa.Storage.set(c, "none")  
                    }  
                }  
            }  
        }  
    })  
}();
