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
        main: function () {  
            this.create();  
            this.bind();  
        },  
  
        create: function () {  
            var body = $('body');  
  
            // Логотипи джерел  
            var logos = {  
                'tmdb': '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M26.7188 0H5.28125C2.36719 0 0 2.36719 0 5.28125V26.7188C0 29.6328 2.36719 32 5.28125 32H26.7188C29.6328 32 32 29.6328 32 26.7188V5.28125C32 2.36719 29.6328 0 26.7188 0Z" fill="currentColor"/><path d="M21.9531 7.67188H24.7969L19.5 14.9219L25.6562 24.3281H20.6719L16.9219 18.7344L12.6094 24.3281H9.75L15.3281 16.6875L9.42188 7.67188H14.5312L17.9062 12.8438L21.9531 7.67188ZM20.9062 22.5625H22.5L13.9219 9.35938H12.1875L20.9062 22.5625Z" fill="white"/></svg>',  
                'cub': '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="6" fill="currentColor"/><path d="M16 8L20 12L16 16L12 12L16 8Z" fill="white"/><path d="M8 16L12 20L16 16L12 12L8 16Z" fill="white"/><path d="M16 16L20 20L16 24L12 20L16 16Z" fill="white"/><path d="M24 16L20 12L16 16L20 20L24 16Z" fill="white"/></svg>'  
            };  
  
            // Визначаємо джерела  
            var sources = ['tmdb', 'cub'];  
            var currentSource = Lampa.Storage.get('source') || 'tmdb';  
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
                }, 100);  
            });  
        },  
  
        bind: function () {  
            // Додаткові обробники подій  
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
