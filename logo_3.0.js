(function () {      
    'use strict';      
        
    (function () {      
        // Додавання локалізації для плагіна      
        Lampa.Lang.add({      
            logo_main_title: {      
                en: 'Logos instead of titles',      
                uk: 'Логотипи замість назв',      
                ru: 'Логотипы вместо названий'      
            },      
            logo_main_description: {      
                en: 'Displays movie logos instead of text',      
                uk: 'Відображає логотипи фільмів замість тексту',      
                ru: 'Отображает логотипы фильмов вместо текста'      
            },      
            logo_main_show: {      
                en: 'Show',      
                uk: 'Показати',      
                ru: 'Отображать'      
            },      
            logo_main_hide: {      
                en: 'Hide',      
                uk: 'Приховати',      
                ru: 'Скрыть'      
            },      
            logo_display_mode_title: {      
                en: 'Display mode',      
                uk: 'Режим відображення',      
                ru: 'Режим отображения'      
            },      
            logo_display_mode_logo_only: {      
                en: 'Logo only',      
                uk: 'Тільки логотип',      
                ru: 'Только логотип'      
            },      
            logo_display_mode_logo_and_text: {      
                en: 'Logo and text',      
                uk: 'Логотип і текст',      
                ru: 'Логотип и текст'      
            },      
            logo_size_title: {      
                en: 'Logo size',      
                uk: 'Розмір логотипа',      
                ru: 'Размер логотипа'      
            },      
            logo_size_description: {      
                en: 'Maximum logo height',      
                uk: 'Максимальна висота логотипа',      
                ru: 'Максимальная высота логотипа'      
            }      
        });      
      
        // Додавання параметру для увімкнення/вимкнення заміни логотипу      
        Lampa.SettingsApi.addParam({      
            component: 'interface',      
            param: {      
                name: 'logo_main',      
                type: 'select',      
                values: {      
                    '1': Lampa.Lang.translate('logo_main_hide'),      
                    '0': Lampa.Lang.translate('logo_main_show')      
                },      
                default: '0'      
            },      
            field: {      
                name: Lampa.Lang.translate('logo_main_title'),      
                description: Lampa.Lang.translate('logo_main_description')      
            }      
        });      
      
        // Додавання параметру для вибору режиму відображення      
        Lampa.SettingsApi.addParam({      
            component: 'interface',      
            param: {      
                name: 'logo_display_mode',      
                type: 'select',      
                values: {      
                    'logo_only': Lampa.Lang.translate('logo_display_mode_logo_only'),      
                    'logo_and_text': Lampa.Lang.translate('logo_display_mode_logo_and_text')      
                },      
                default: 'logo_only'      
            },      
            field: {      
                name: Lampa.Lang.translate('logo_display_mode_title'),      
                description: Lampa.Lang.translate('logo_main_description'),      
                show: function () {      
                    return Lampa.Storage.get('logo_main') === '0';      
                }      
            }      
        });      
      
        // Параметр для розміру логотипа      
        Lampa.SettingsApi.addParam({      
            component: 'interface',      
            param: {      
                name: 'logo_size',      
                type: 'select',      
                values: {      
                    '50': '50px',      
                    '60': '60px',      
                    '75': '75px',      
                    '80': '80px',      
                    '100': '100px',      
                    '125': '125px',      
                    '150': '150px'      
                },      
                default: '80'      
            },      
            field: {      
                name: Lampa.Lang.translate('logo_size_title'),      
                description: Lampa.Lang.translate('logo_size_description'),      
                show: function () {      
                    return Lampa.Storage.get('logo_main') === '0';      
                }      
            }      
        });      
      
        // Перевірка, чи плагін уже ініціалізований      
        if (window.logoplugin) return;      
        window.logoplugin = true;      
      
        // Функція для завантаження та рендерингу логотипу    
        function loadAndRenderLogo(item, card) {  
            var $ = window.$ || window.jQuery;  
            if (!$) {  
                console.error('[LogoPlugin] jQuery не знайдено');  
                return;  
            }  
              
            var apiKey = Lampa.TMDB.key();  
            if (!apiKey) {  
                console.error('[LogoPlugin] TMDB API key не знайдено');  
                return;  
            }  
              
            var mediaType = item.name ? 'tv' : 'movie';      
            var currentLang = Lampa.Storage.get('language');      
            var url = Lampa.TMDB.api(mediaType + '/' + item.id + '/images?api_key=' + apiKey + '&language=' + currentLang);      
      
            // Функція для спроби завантажити англійські логотипи  
            function tryEnglishLogos() {  
                if (currentLang === 'en') return; // Вже пробували англійську  
                  
                var enUrl = Lampa.TMDB.api(mediaType + '/' + item.id + '/images?api_key=' + apiKey + '&language=en');      
                $.get(enUrl, function (enResponse) {      
                    if (enResponse.logos && enResponse.logos.length > 0) {      
                        var pngLogo = enResponse.logos.find(function(logo) {     
                            return !logo.file_path.endsWith('.svg');     
                        });    
                        var logoPath = pngLogo ? pngLogo.file_path : enResponse.logos[0].file_path;    
                        renderLogo(logoPath, card, item, true);      
                    } else {  
                        console.log('[LogoPlugin] Логотипи не знайдено навіть англійською');  
                    }  
                }).fail(function () {    
                    console.log('[LogoPlugin] Не вдалося завантажити англійські логотипи');    
                });  
            }  
      
            // Виконання AJAX-запиту для отримання логотипів      
            $.get(url, function (response) {      
                if (response.logos && response.logos.length > 0) {      
                    // Фільтрувати SVG (вони можуть не рендеритися)    
                    var pngLogo = response.logos.find(function(logo) {     
                        return !logo.file_path.endsWith('.svg');     
                    });    
                    var logoPath = pngLogo ? pngLogo.file_path : response.logos[0].file_path;    
                    renderLogo(logoPath, card, item, false);      
                } else {  
                    // Fallback на англійську мову    
                    tryEnglishLogos();  
                }      
            }).fail(function () {      
                // При помилці - спробувати англійську  
                tryEnglishLogos();  
            });      
        }    
      
        // Функція для рендерингу логотипу      
        function renderLogo(logoPath, card, item, isEnglishLogo) {      
            if (!logoPath) return;    
                
            var showTitle = Lampa.Storage.get('logo_display_mode') === 'logo_and_text' || (isEnglishLogo && Lampa.Storage.get('logo_display_mode') === 'logo_only');      
                
            // Спробувати знайти елемент заголовка різними способами    
            var titleElement = card.find('.full-start-new__title');    
            if (!titleElement.length) {    
                titleElement = card.find('.full-start__title');    
            }    
                
            if (!titleElement.length) {    
                console.log('[LogoPlugin] Елемент заголовка не знайдено');    
                return;    
            }    
                
            var titleText = showTitle ? (titleElement.text() || item.title || item.name) : '';      
                  
            // Отримання розміру з налаштувань      
            var logoSize = parseInt(Lampa.Storage.get('logo_size', '80'));      
            var largerSize = Math.floor(logoSize * 1.4);    
            var mobileSize = Math.floor(logoSize * 0.6);    
                
            var isMobile = window.innerWidth <= 585;    
            var isNewInterface = Lampa.Storage.get('card_interfice_type') === 'new';    
            var hasCover = card.find('div[data-name="card_interfice_cover"]').length > 0;    
                
            // Визначити розмір    
            var currentSize = logoSize;    
            if (isMobile) {    
                currentSize = mobileSize;    
            } else if (isNewInterface && hasCover) {    
                currentSize = largerSize;    
            }    
                
            // Створити HTML логотипу    
            var containerStyle = 'display: inline-block; height: ' + currentSize + 'px; width: auto; max-width: 100%;';      
            var imgStyle = 'height: 100%; width: auto; object-fit: contain; display: block; margin-bottom: 0.2em;';      
            var imgUrl = Lampa.TMDB.image('/t/p/w500' + logoPath.replace('.svg', '.png'));    
            var logoHtml = '<div style="' + containerStyle + '"><img style="' + imgStyle + '" src="' + imgUrl + '" alt="' + (item.title || item.name) + '" onerror="this.parentElement.style.display=\'none\'" /></div>';    
                
            if (titleText) {    
                logoHtml += '<span style="display: block;">' + titleText + '</span>';    
            }    
                
            // Застосувати HTML    
            if (isNewInterface) {    
                card.find('.full-start-new__tagline').remove();    
                titleElement.html(logoHtml);    
            } else {    
                card.find('.full-start__title-original').remove();    
                titleElement.css({      
                    'height': 'auto !important',      
                    'max-height': 'none !important',      
                    'overflow': 'visible !important'      
                }).html(logoHtml);    
            }    
        }    
      
        // Підписка на подію активності для обробки повноекранного режиму      
        Lampa.Listener.follow('full', function (event) {      
            if ((event.type === 'complite' || event.type === 'movie') && Lampa.Storage.get('logo_main') !== '1') {      
                var item = event.data.movie;      
                if (!item || !item.id) return;    
                    
                var card = event.object.activity.render();      
                    
                // Спробувати одразу    
                var titleElement = card.find('.full-start-new__title, .full-start__title');    
                if (titleElement.length) {    
                    loadAndRenderLogo(item, card);    
                } else {    
                    // Використати MutationObserver для відстеження появи елемента    
                    var observer = new MutationObserver(function() {    
                        var titleElement = card.find('.full-start-new__title, .full-start__title');    
                        if (titleElement.length) {    
                            observer.disconnect();    
                            loadAndRenderLogo(item, card);    
                        }    
                    });    
                        
                    var target = card[0] || card;    
                    observer.observe(target, {childList: true, subtree: true});    
                        
                    // Таймаут для запобігання витоку пам'яті  
                  setTimeout(function() {    
    observer.disconnect();    
}, 5000);    
                }  // ← закриває else блок  
            }  // ← закриває if ((event.type === 'complite'...  
        });  // ← закриває Lampa.Listener.follow('full'...  
    })();  // ← закриває внутрішню IIFE  
})();
  
