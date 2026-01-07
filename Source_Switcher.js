(function () {  
    'use strict';  
  
    if (typeof Lampa === 'undefined') return;  
    if (Lampa.Manifest.app_digital < 300) return;  
  
    // Флаг, щоб уникнути повторної ініціалізації  
    if (window.plugin_source_switch_ready) return;  
    window.plugin_source_switch_ready = true;  
  
    // ========== ДОДАЄМО ПЕРЕКЛАДИ ==========  
    Lampa.Lang.add({  
        lme_switchsource_name: {  
            ru: "Переключатель источников",  
            en: "Source switcher",   
            uk: "Перемикач джерел"  
        },  
        lme_switchsource_desc: {  
            ru: "Добавляет переключение источников из шапки",  
            en: "Adds source switcher",  
            uk: "Додає перемикач джерел у шапці"  
        },  
        lme_switchsource_modss_desc: {  
            ru: "При наличии Modss добавляет источники Filmix и KinoPub",  
            en: "If install Modss add Filmix and KinoPub",  
            uk: "Якщо встановлено Modss додає джерела Filmix і KinoPub"  
        }  
    });  
  
    // ========== НАЛАШТУВАННЯ В МЕНЮ ==========  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'lme_switchsource',  
            type: 'trigger',  
            default: false,  
        },  
        field: {  
            name: Lampa.Lang.translate('lme_switchsource_name'),  
            description: Lampa.Lang.translate('lme_switchsource_desc')  
        }  
    });  
  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'lme_switchsource_modss',  
            type: 'trigger',  
            default: false,  
        },  
        field: {  
            name: 'Modss',  
            description: Lampa.Lang.translate('lme_switchsource_modss_desc')  
        }  
    });  
  
    // ========== ОСНОВНА ФУНКЦІЯ ПЕРЕМИКАЧА ДЖЕРЕЛ ==========  
    function main() {  
        // Логотипи джерел  
        var logos = {  
            tmdb: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#032541"/><path d="M8.5 28V12h4.5c1.5 0 2.7.3 3.5.9.8.6 1.2 1.5 1.2 2.6 0 .7-.2 1.3-.5 1.8-.3.5-.8.9-1.4 1.1.7.2 1.2.6 1.6 1.1.4.5.6 1.2.6 1.9 0 1.2-.4 2.1-1.2 2.8-.8.7-2 1-3.5 1H8.5zm3-7.5h1.2c.6 0 1-.1 1.3-.4.3-.3.4-.6.4-1.1s-.1-.8-.4-1.1c-.3-.3-.7-.4-1.3-.4H11.5v3zm0 5h1.4c.7 0 1.2-.1 1.5-.4.3-.3.5-.7.5-1.2s-.2-.9-.5-1.2c-.3-.3-.8-.4-1.5-.4h-1.4v3.2zM21.5 28V12h3l3.5 5.5L31.5 12h3v16h-3V18.5L28 24h-1l-3.5-5.5V28h-2zM16 20c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" fill="white"/></svg>',  
            cub: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#FF6B35"/><path d="M12 12h16v16H12z" fill="white"/><path d="M15 15h10v10H15z" fill="#FF6B35"/><path d="M18 18h4v4h-4z" fill="white"/></svg>',  
            filmix: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#E50914"/><path d="M10 15l5-3v12l-5-3V15zm20 0l-5-3v12l5-3V15zm-10-2l5 3v6l-5 3-5-3v-6l5-3z" fill="white"/></svg>',  
            pub: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#00A8E8"/><path d="M20 10l8 4v8l-8 4-8-4v-8l8-4z" fill="white"/><path d="M20 14l4 2v4l-4 2-4-2v-4l4-2z" fill="#00A8E8"/></svg>'  
        };  
  
        // Визначаємо джерела в залежності від умов  
        var allSources = ['tmdb', 'cub'];  
        var sources = allSources.slice(0, 2);  
  
        if (Lampa.Storage.get('lme_switchsource_modss') === true) {  
            sources.push.apply(sources, ['pub', 'filmix']);  
        }  
  
        // Отримуємо поточне джерело з Storage  
        var currentSource = Lampa.Storage.get('source');  
        var currentSourceIndex = sources.indexOf(currentSource);  
  
        // Якщо поточне джерело не знайдено, встановлюємо перше джерело за замовчуванням  
        if (currentSourceIndex === -1) {  
            currentSourceIndex = 0;  
            currentSource = sources[currentSourceIndex];  
            Lampa.Storage.set('source', currentSource);  
        }  
  
        // Створюємо новий div елемент  
        var sourceDiv = $('<div>', {  
            'class': 'head__action selector sources',  
            'style': 'position: relative;',  
            'html': "<div class=\"source-logo\" style=\"text-align: center;\"></div>"  
        });  
  
        // Додаємо новий div як перший дочірній елемент контейнера '.head__actions'  
        $('.head__actions').prepend(sourceDiv);  
  
        // Оновлюємо логотип під іконкою, відображаємо наступний логотип  
        var nextSourceIndex = (currentSourceIndex + 1) % sources.length;  
        var nextSourceLogo = logos[sources[nextSourceIndex]];  
        sourceDiv.find('.source-logo').html(nextSourceLogo);  
  
        // Додаємо обробник події 'hover:enter' для перемикання  
        sourceDiv.on('hover:enter', function () {  
            currentSourceIndex = (currentSourceIndex + 1) % sources.length;  
            var selectedSource = sources[currentSourceIndex];  
            Lampa.Storage.set('source', selectedSource);  
  
            var nextLogo = logos[sources[(currentSourceIndex + 1) % sources.length]];  
            sourceDiv.find('.source-logo').html(nextLogo);  
  
            Lampa.Activity.replace({  
                source: selectedSource,  
                title: Lampa.Lang.translate("title_main") + ' - ' + selectedSource.toUpperCase()  
            });  
        });  
    }  
  
    // ========== МАНІФЕСТ ПЛАГІНА ==========  
    var manifest = {  
        type: "other",  
        version: "1.0.0",  
        author: '@lme_chat',  
        name: "Lampa Source Switcher",  
        description: "Source switcher for Lampa",  
        component: "source_switch"  
    };  
  
    // ========== ІНІЦІАЛІЗАЦІЯ ПЛАГІНА ==========  
    function add() {  
        if (Lampa.Storage.get('lme_switchsource') === true) {  
            main();  
        }  
    }  
  
    function startPlugin() {  
        window.plugin_source_switch_ready = true;  
        if (window.appready) {  
            add();  
        } else {  
            Lampa.Listener.follow("app", function (e) {  
                if (e.type === "ready") add();  
            });  
        }  
    }  
  
    if (!window.plugin_source_switch_ready) {  
        startPlugin();  
    }  
  
})();
