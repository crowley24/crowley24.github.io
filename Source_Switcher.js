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
                'tmdb': '<svg width="160" height="48" viewBox="0 0 160 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"> <g clip-path="url(#clip0_296_49)"> <path d="M7.875 0C3.525 0 0 3.525 0 7.875V40.125C0 44.475 3.525 48 7.875 48H40.125C44.475 48 48 44.475 48 40.125V7.875C48 3.525 44.475 0 40.125 0H7.875Z" fill="currentColor"/> <path d="M33.75 33.75H14.25V14.25H33.75V33.75Z" fill="white"/> <path d="M30.375 30.375H17.625V17.625H30.375V30.375Z" fill="currentColor"/> <path d="M78.75 33.75H59.25V14.25H78.75V33.75Z" fill="currentColor"/> <path d="M75.375 30.375H62.625V17.625H75.375V30.375Z" fill="white"/> <path d="M123.75 33.75H104.25V14.25H123.75V33.75Z" fill="currentColor"/> <path d="M120.375 30.375H107.625V17.625H120.375V30.375Z" fill="white"/> <path d="M152.25 7.875C152.25 3.525 148.725 0 144.375 0H112.125C107.775 0 104.25 3.525 104.25 7.875V40.125C104.25 44.475 107.775 48 112.125 48H144.375C148.725 48 152.25 44.475 152.25 40.125V7.875Z" fill="currentColor"/> <path d="M136.125 33.75H120.375V14.25H136.125V33.75Z" fill="white"/> <path d="M132.75 30.375H123.75V17.625H132.75V30.375Z" fill="currentColor"/> </g> <defs> <clipPath id="clip0_296_49"> <rect width="160" height="48" fill="currentColor"/> </clipPath> </defs> </svg>',  
                'cub': '<svg width="160" height="48" viewBox="0 0 160 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg"> <g clip-path="url(#clip0_296_49)"> <path d="M7.875 0C3.525 0 0 3.525 0 7.875V40.125C0 44.475 3.525 48 7.875 48H40.125C44.475 48 48 44.475 48 40.125V7.875C48 3.525 44.475 0 40.125 0H7.875Z" fill="currentColor"/> <path d="M33.75 33.75H14.25V14.25H33.75V33.75Z" fill="white"/> <path d="M30.375 30.375H17.625V17.625H30.375V30.375Z" fill="currentColor"/> <path d="M78.75 33.75H59.25V14.25H78.75V33.75Z" fill="currentColor"/> <path d="M75.375 30.375H62.625V17.625H75.375V30.375Z" fill="white"/> <path d="M123.75 33.75H104.25V14.25H123.75V33.75Z" fill="currentColor"/> <path d="M120.375 30.375H107.625V17.625H120.375V30.375Z" fill="white"/> <path d="M152.25 7.875C152.25 3.525 148.725 0 144.375 0H112.125C107.775 0 104.25 3.525 104.25 7.875V40.125C104.25 44.475 107.775 48 112.125 48H144.375C148.725 48 152.25 44.475 152.25 40.125V7.875Z" fill="currentColor"/> <path d="M136.125 33.75H120.375V14.25H136.125V33.75Z" fill="white"/> <path d="M132.75 30.375H123.75V17.625H132.75V30.375Z" fill="currentColor"/> </g> <defs> <clipPath id="clip0_296_49"> <rect width="160" height="48" fill="currentColor"/> </clipPath> </defs> </svg>'  
            };  
  
            var allSources = ['tmdb', 'cub'];  
            var sources = allSources.slice(0, 2);  
  
            // Отримуємо поточне джерело з Storage  
            var currentSource = Lampa.Storage.get('source');  
            var currentSourceIndex = sources.indexOf(currentSource);  
  
            // Якщо поточне джерело не знайдено, встановлюємо перше джерело за замовчуванням  
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
  
            // Обновляем логотип плеера під іконкою, відображаємо наступний логотип  
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
  
                // Перезавантажуємо сторінку для застосування нового джерела  
                setTimeout(function() {  
                    window.location.reload();  
                }, 300);  
            });  
        },  
  
        bind: function () {  
            // Обробники подій вже додані в create()  
        },  
  
        destroy: function () {  
            $('.head__actions .sources').remove();  
        },  
  
        main: function () {  
            this.init();  
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
