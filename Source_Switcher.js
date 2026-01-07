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
        }  
    });  
  
    // ========== НАЛАШТУВАННЯ В МЕНЮ ==========  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  // Правильний компонент  
        param: {  
            name: 'lme_switchsource',  
            type: 'trigger',  
            default: false,  
        },  
        field: {  
            name: Lampa.Lang.translate('lme_switchsource_name'),  
            description: Lampa.Lang.translate('lme_switchsource_desc')  
        },  
        onChange: function (value) {  
            if (value) {  
                sourceSwitch.main();  
            } else {  
                // Вимкнення функціональності  
                $('.head__actions .sources').remove();  
            }  
        }  
    });  
  
    // ========== ОСНОВНА ФУНКЦІЯ ПЕРЕМИКАННЯ ==========  
    var sourceSwitch = {  
        main: function () {  
            // Логотипи джерел  
            var logos = {  
                'tmdb': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3.518 18.68L0 12.23l3.518-6.45h7.035L14.07 12.23l-3.518 6.45H3.518zm10.927 0l-3.518-6.45 3.518-6.45h7.035L24.998 12.23l-3.518 6.45h-7.035z"/></svg>',  
                'cub': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/></svg>',  
                'filmix': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>',  
                'kinopub': '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'  
            };  
  
            var allSources = ['tmdb', 'cub'];  
            var sources = allSources.slice(0, 2);  
  
            // Визначаємо джерела  
            var currentSource = Lampa.Storage.get('source');  
            var currentSourceIndex = sources.indexOf(currentSource);  
  
            if (currentSourceIndex === -1) {  
                currentSourceIndex = 0;  
                currentSource = sources[currentSourceIndex];  
                Lampa.Storage.set('source', currentSource);  
            }  
  
            // Створюємо елемент перемикача  
            var sourceDiv = $('<div>', {  
                'class': 'head__action selector sources',  
                'style': 'position: relative;',  
                'html': "<div class=\"source-logo\" style=\"text-align: center;\"></div>"  
            });  
  
            $('.head__actions').prepend(sourceDiv);  
  
            // Оновлюємо логотип  
            var nextSourceIndex = (currentSourceIndex + 1) % sources.length;  
            var nextSourceLogo = logos[sources[nextSourceIndex]];  
            sourceDiv.find('.source-logo').html(nextSourceLogo);  
  
            // Обробник перемикання  
            sourceDiv.on('hover:enter', function () {  
                currentSourceIndex = (currentSourceIndex + 1) % sources.length;  
                var selectedSource = sources[currentSourceIndex];  
                Lampa.Storage.set('source', selectedSource);  
  
                var nextLogo = logos[sources[(currentSourceIndex + 1) % sources.length]];  
                sourceDiv.find('.source-logo').html(nextLogo);  
  
                Lampa.Activity.replace({  
                    source: selectedSource,  
                    title: Lampa.Activity.activity().title  
                });  
            });  
        }  
    };  
  
    // ========== ІНІЦІАЛІЗАЦІЯ ==========  
    function add() {  
        // Перевіряємо, чи увімкнено налаштування  
        if (Lampa.Storage.get('lme_switchsource') === true) {  
            sourceSwitch.main();  
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
