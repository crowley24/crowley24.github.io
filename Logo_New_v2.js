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
            values: { 1: "Скрыть", 0: "Отображать" },  
            default: "0"  
        },  
        field: {  
            name: "Логотипы вместо названий",  
            description: "Отображает логотипы фильмов вместо текста"  
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
            name: "Язык логотипа",  
            description: "Приоритетный язык для поиска логотипа"  
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
                original: "Оригинал"  
            },  
            default: "original"  
        },  
        field: {  
            name: "Размер логотипа",  
            description: "Разрешение загружаемого изображения"  
        }  
    });  
      
    // 4. Анімація  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_animation",  
            type: "select",  
            values: {  
                "": "Без анимации",  
                fade: "Fade",  
                slide: "Slide",  
                zoom: "Zoom"  
            },  
            default: ""  
        },  
        field: {  
            name: "Анимация логотипа",  
            description: "Эффект появления логотипа"  
        }  
    });  
      
    // 5. Висота тексту  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_use_text_height",  
            type: "trigger",  
            default: false  
        },  
        field: {  
            name: "Использовать высоту текста",  
            description: "Адаптировать размер логотипа под высоту текста"  
        }  
    });  
      
    // 6. Приховати рік  
    Lampa.SettingsApi.addParam({  
        component: "interface",  
        param: {  
            name: "logo_hide_year",  
            type: "trigger",  
            default: false  
        },  
        field: {  
            name: "Скрыть год",  
            description: "Скрывать год при отображении логотипа"  
        }  
    });  
      
    // =======================================================  
    // II. ОСНОВНА ФУНКЦІЯ ПЛАГІНА  
    // =======================================================  
      
    window.logoplugin || (window.logoplugin = !0, Lampa.Listener.follow("full", (function(a) {  
        if ("complite" == a.type) {  
            var t = a.data.movie;  
            if (t && t.title && (!Lampa.Storage.get("logo_glav", !1) || "none" === Lampa.Storage.get("logo_glav", !1))) {  
                var e = $(".full-start-new__title"),  
                    n = e.find("span"),  
                    r = e.parent(),  
                    i = parseInt(r.css("font-size")),  
                    o = Lampa.Storage.get("logo_animation", ""),  
                    s = Lampa.Storage.get("logo_hide_year", !1),  
                    l = Lampa.Storage.get("logo_lang", ""),  
                    d = Lampa.Storage.get("logo_size", "original"),  
                    c = Lampa.Storage.get("logo_use_text_height", !1),  
                    u = function() {  
                        var a = l || Lampa.Storage.get("language", "ru");  
                        return "uk" === a ? "ua" : a  
                    }(),  
                    h = "logo_" + t.title + "_" + u + "_" + d,  
                    p = Lampa.Storage.get(h, "none");  
                  
                if ("none" !== p) {  
                    if ("loading" === p) return void setTimeout(u, 200);  
                      
                    var f = function() {  
                        var a = new Image;  
                        a.onload = function() {  
                            var t = document.createElement("img");  
                            t.src = p, t.style.cssText = "max-width:100%;height:auto;vertical-align:middle;";  
                            var f = Lampa.Storage.get("logo_use_text_height", !1) && i;  
                            f ? (t.style.height = i + "px", t.style.width = "auto") : window.innerWidth < 768 ? (t.style.width = "100%", t.style.height = "auto") : (t.style.width = "7em", t.style.height = "auto");  
                              
                            var g = document.createElement("div");  
                            g.style.cssText = "display:inline-block;vertical-align:middle;margin-right:10px;";  
                            var m = document.createElement("div");  
                            m.style.cssText = "display:inline-block;vertical-align:middle;";  
                              
                            if (s) {  
                                var v = r.find(".full-start-new__data");  
                                v.length && v.find("span").each((function() {  
                                    var a = $(this).text();  
                                    a.match(/^\d{4}$/) && $(this).hide()  
                                }))  
                            }  
                              
                            switch (o) {  
                                case "fade":  
                                    g.style.opacity = "0", g.style.transition = "opacity 0.5s ease", m.appendChild(t), g.appendChild(m), e.empty().append(g), setTimeout((function() {  
                                        g.style.opacity = "1"  
                                    }), 100);  
                                    break;  
                                case "slide":  
                                    g.style.transform = "translateX(-100%)", g.style.transition = "transform 0.5s ease", m.appendChild(t), g.appendChild(m), e.empty().append(g), setTimeout((function() {  
                                        g.style.transform = "translateX(0)"  
                                    }), 100);  
                                    break;  
                                case "zoom":  
                                    g.style.transform = "scale(0)", g.style.transition = "transform 0.5s ease", m.appendChild(t), g.appendChild(m), e.empty().append(g), setTimeout((function() {  
                                        g.style.transform = "scale(1)"  
                                    }), 100);  
                                    break;  
                                default:  
                                    m.appendChild(t), e.empty().append(m)  
                            }  
                        }, a.onerror = function() {  
                            Lampa.Storage.set(h, "none"), r.css({  
                                opacity: "1",  
                                transition: "none"  
                            })  
                        }, a.src = p  
                    };  
                      
                    if ("loading" === Lampa.Storage.get(h + "_year", "none")) {  
                        var g = setInterval((function() {  
                            "none" !== Lampa.Storage.get(h + "_year", "none") && (clearInterval(g), f())  
                        }), 200)  
                    } else f()  
                } else {  
                    Lampa.Storage.set(h, "loading");  
                    var m = "https://api.themoviedb.org/3/" + (t.tv ? "tv" : "movie") + "/" + (t.tv ? t.tv.id : t.id) + "/images?api_key=4ef0d7355d9ffb5151e987764708ce75&include_image_language=" + u + ",null,en";  
                    $.ajax({  
                        url: m,  
                        type: "GET",  
                        dataType: "json",  
                        success: function(a) {  
                            if (a.logos && a.logos.length) {  
                                for (var e = function(a) {  
                                        return "original" === d ? a.file_path : a.file_path.replace(/original/, d)  
                                    }, n = function(a) {  
                                        return a.iso_639_1 === u  
                                    }, r = a.logos.filter(n).sort((function(a, n) {  
                                        return a.vote_average - n.vote_average  
                                    })), i = 0; i < r.length; i++) {  
                                    var o = r[i];  
                                    if (o.file_path) {  
                                        var s = "https://image.tmdb.org/t/p/" + e(o);  
                                        Lampa.Storage.set(h, s), Lampa.Storage.set(h + "_year", "loaded"), f();  
                                        break  
                                    }  
                                }  
                            } else Lampa.Storage.set(h, "none")  
                        },  
                        error: function() {  
                            Lampa.Storage.set(h, "none")  
                        }  
                    })  
                }  
            }  
        }  
    })))  
}();
