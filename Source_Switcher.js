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
            var logos = {  
                'tmdb': "<svg width=\"48\" height=\"48\" viewBox=\"0 0 160 48\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"> <g clip-path=\"url(#clip0_296_49)\"> <path d=\"M0.5 8C0.5 3.85786 3.85786 0.5 8 0.5H152C156.142 0.5 159.5 3.85786 159.5 8V40C159.5 44.1421 156.142 47.5 152 47.5H8C3.85786 47.5 0.5 44.1421 0.5 40V8Z\" stroke=\"currentColor\"/> <path d=\"M23.6039 15.9341C22.7373 14.9808 21.5904 14.5041 20.161 14.5041C18.7752 14.5041 17.6276 14.9808 16.7188 15.9341C15.8093 16.8874 15.3545 18.0357 15.3545 19.3791C15.3545 20.7657 15.8093 21.9357 16.7188 22.8891Z\" fill=\"currentColor\"/> </g> <defs> <clipPath id=\"clip0_296_49\"> <rect width=\"160\" height=\"48\" fill=\"currentColor\"/> </clipPath> </defs> </svg>",  
                'cub': "<svg width=\"48\" height=\"48\" viewBox=\"0 0 160 48\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"> <g clip-path=\"url(#clip0_296_49)\"> <path d=\"M0.5 8C0.5 3.85786 3.85786 0.5 8 0.5H152C156.142 0.5 159.5 3.85786 159.5 8V40C159.5 44.1421 156.142 47.5 152 47.5H8C3.85786 47.5 0.5 44.1421 0.5 40V8Z\" stroke=\"currentColor\"/> <path d=\"M23.6039 15.9341C22.7373 14.9808 21.5904 14.5041 20.161 14.5041C18.7752 14.5041 17.6276 14.9808 16.7188 15.9341C15.8093 16.8874 15.3545 18.0357 15.3545 19.3791C15.3545 20.7657 15.8093 21.9357 16.7188 22.8891Z\" fill=\"currentColor\"/> </g> <defs> <clipPath id=\"clip0_296_49\"> <rect width=\"160\" height=\"48\" fill=\"currentColor\"/> </clipPath> </defs> </svg>"  
            };  
  
            var sources = ['tmdb', 'cub'];  
            var currentSource = Lampa.Storage.get('source');  
            var currentSourceIndex = sources.indexOf(currentSource);  
  
            if (currentSourceIndex === -1) {  
                currentSourceIndex = 0;  
                currentSource = sources[currentSourceIndex];  
                Lampa.Storage.set('source', currentSource);  
            }  
  
            // Создаем новый div элемент  
            var sourceDiv = $('<div>', {  
                'class': 'head__action selector sources',  
                'style': 'position: relative;',  
                'html': "<div class=\"source-logo\" style=\"text-align: center;\"></div>"  
            });  
  
            // Добавляем новый div как первый дочерний элемент контейнера '.head__actions'  
            $('.head__actions').prepend(sourceDiv);  
  
            // Обновляем логотип  
            var nextSourceIndex = (currentSourceIndex + 1) % sources.length;  
            var nextSourceLogo = logos[sources[nextSourceIndex]];  
            sourceDiv.find('.source-logo').html(nextSourceLogo);  
  
            // Добавляем обработчик события 'hover:enter' для переключения  
            sourceDiv.on('hover:enter', function () {  
                currentSourceIndex = (currentSourceIndex + 1) % sources.length;  
                var selectedSource = sources[currentSourceIndex];  
                Lampa.Storage.set('source', selectedSource);  
  
                var nextLogo = logos[sources[(currentSourceIndex + 1) % sources.length]];  
                sourceDiv.find('.source-logo').html(nextLogo);  
  
                // Перезагружаем страницу для применения нового источника  
                setTimeout(function () {  
                    window.location.reload();  
                }, 100);  
            });  
        },  
  
        bind: function () {  
            // Дополнительные привязки событий если нужны  
        },  
  
        destroy: function () {  
            $('.head__actions .sources').remove();  
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
