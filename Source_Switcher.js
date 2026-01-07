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
        }  
    });  
  
    // ========== ОСНОВНА ФУНКЦІЯ ПЕРЕМИКАННЯ ==========  
    var sourceSwitch = {  
        init: function () {  
            this.create();  
            this.bind();  
        },  
  
        create: function () {  
            // Логотипи джерел  
            var logos = {  
                'tmdb': '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="8" fill="#007DFE"/><path d="M12 18h8v12h-8V18zm16 0h8v12h-8V18z" fill="white"/></svg>',  
                'cub': '<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" rx="8" fill="#FF6B35"/><path d="M16 16h16v16H16V16z" fill="white"/></svg>'  
            };  
  
            var sources = ['tmdb', 'cub'];  
            var currentSource = Lampa.Storage.get('source') || 'tmdb';  
            var currentSourceIndex = sources.indexOf(currentSource);  
  
            if (currentSourceIndex === -1) {  
                currentSourceIndex = 0;  
                currentSource = sources[0];  
                Lampa.Storage.set('source', currentSource);  
            }  
  
            // Створюємо кнопку  
            var sourceDiv = $('<div>', {  
                'class': 'head__action selector sources',  
                'style': 'position: relative;',  
                'html': "<div class=\"source-logo\" style=\"text-align: center;\"></div>"  
            });  
  
            // Додаємо кнопку в шапку  
            $('.head__actions').prepend(sourceDiv);  
  
            // Показуємо логотип наступного джерела  
            var nextSourceIndex = (currentSourceIndex + 1) % sources.length;  
            var nextSourceLogo = logos[sources[nextSourceIndex]];  
            sourceDiv.find('.source-logo').html(nextSourceLogo);  
  
            // Зберігаємо посилання на елемент  
            this.sourceElement = sourceDiv;  
            this.sources = sources;  
            this.logos = logos;  
        },  
  
        bind: function () {  
            var self = this;  
  
            // Обробник кліку  
            this.sourceElement.on('hover:enter', function () {  
                var currentSource = Lampa.Storage.get('source') || 'tmdb';  
                var currentSourceIndex = self.sources.indexOf(currentSource);  
                  
                // Перемикаємо на наступне джерело  
                var newSourceIndex = (currentSourceIndex + 1) % self.sources.length;  
                var newSource = self.sources[newSourceIndex];  
                  
                // Зберігаємо нове джерело  
                Lampa.Storage.set('source', newSource);  
                  
                // Оновлюємо логотип  
                var nextSourceIndex = (newSourceIndex + 1) % self.sources.length;  
                var nextSourceLogo = self.logos[self.sources[nextSourceIndex]];  
                self.sourceElement.find('.source-logo').html(nextSourceLogo);  
                  
                // Перезавантажуємо сторінку  
                setTimeout(function() {  
                    window.location.reload();  
                }, 300);  
            });  
        },  
  
        destroy: function () {  
            if (this.sourceElement) {  
                this.sourceElement.remove();  
                this.sourceElement = null;  
            }  
        },  
  
        main: function () {  
            this.init();  
        }  
    };  
  
    // ========== МАНІФЕСТ ПЛАГІНА ==========  
    var manifest = {  
        type: "extension",  
        name: "Source Switcher",  
        description: "Переключатель источников из шапки",  
        version: "1.0.0",  
        author: "Movie Enhancer"  
    };  
  
    Lampa.Manifest.plugins = manifest;  
  
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
