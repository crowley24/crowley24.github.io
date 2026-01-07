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
        component: 'interface',  
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
                sourceSwitch.destroy();  
            }  
        },  
        onRender: function () {  
            this.find('.settings-param__title').css('font-size', '1.3em');  
        }  
    });  
  
    // ========== ОСНОВНА ФУНКЦІЯ ПЕРЕМИКАННЯ ==========  
    var sourceSwitch = {  
        init: function () {  
            this.bind();  
        },  
  
        bind: function () {  
            var _this = this;  
  
            Lampa.Listener.follow('full', function (e) {  
                if (e.type === 'complite') {  
                    setTimeout(function () {  
                        _this.create();  
                    }, 100);  
                }  
            });  
        },  
  
        create: function () {  
            var _this = this;  
  
            // Логотипи джерел  
            var logos = {  
                'tmdb': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',  
                'cub': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'  
            };  
  
            var sources = ['tmdb', 'cub'];  
            var currentSource = Lampa.Storage.get('source');  
            var currentSourceIndex = sources.indexOf(currentSource);  
  
            if (currentSourceIndex === -1) {  
                currentSourceIndex = 0;  
                currentSource = sources[currentSourceIndex];  
                Lampa.Storage.set('source', currentSource);  
            }  
  
            // Створюємо кнопку перемикання  
            var sourceDiv = $('<div>', {  
                'class': 'head__action selector sources',  
                'style': 'position: relative;',  
                'html': "<div class=\"source-logo\" style=\"text-align: center;\"></div>"  
            });  
  
            $('.head__actions').prepend(sourceDiv);  
  
            // Відображаємо логотип наступного джерела  
            var nextSourceIndex = (currentSourceIndex + 1) % sources.length;  
            var nextSourceLogo = logos[sources[nextSourceIndex]];  
            sourceDiv.find('.source-logo').html(nextSourceLogo);  
  
            // Обробник кліку для перемикання  
            sourceDiv.on('hover:enter', function () {  
                currentSourceIndex = (currentSourceIndex + 1) % sources.length;  
                var selectedSource = sources[currentSourceIndex];  
                Lampa.Storage.set('source', selectedSource);  
  
                var nextLogo = logos[sources[(currentSourceIndex + 1) % sources.length]];  
                sourceDiv.find('.source-logo').html(nextLogo);  
  
                // Перезавантажуємо сторінку  
                setTimeout(function () {  
                    window.location.reload();  
                }, 500);  
            });  
        },  
  
        main: function () {  
            this.init();  
        },  
  
        destroy: function () {  
            $('.head__actions .sources').remove();  
        }  
    };  
  
    // ========== ІНІЦІАЛІЗАЦІЯ ==========  
    function add() {  
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
