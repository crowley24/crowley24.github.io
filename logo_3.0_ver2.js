(function () {        
    'use strict';        
          
    (function () {        
        // Кеш для логотипів (зберігається в пам'яті та localStorage)  
        var logoCache = {};  
          
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
                uk: 'Розмір логотипу',        
                ru: 'Размер логотипа'        
            }        
        });        
            
        // Додавання налаштувань в розділ "Інтерфейс"        
        if (window.Lampa && Lampa.SettingsApi) {        
            // Заголовок секції        
            Lampa.SettingsApi.addParam({        
                component: 'interface',        
                param: {        
                    name: 'logo_settings_title',        
                    type: 'title'        
                },        
                field: {        
                    name: Lampa.Lang.translate('logo_main_title')        
                }        
            });        
                
            // Перемикач відображення логотипів        
            Lampa.SettingsApi.addParam({        
                component: 'interface',        
                param: {        
                    name: 'logo_main',        
                    type: 'select',        
                    values: {        
                        '0': Lampa.Lang.translate('logo_main_show'),        
                        '1': Lampa.Lang.translate('logo_main_hide')        
                    },        
                    'default': '0'        
                },        
                field: {        
                    name: Lampa.Lang.translate('logo_main_description')        
                }        
            });        
                
            // Режим відображення (логотип або логотип + текст)        
            Lampa.SettingsApi.addParam({        
                component: 'interface',        
                param: {        
                    name: 'logo_display_mode',        
                    type: 'select',        
                    values: {        
                        'logo_only': Lampa.Lang.translate('logo_display_mode_logo_only'),        
                        'logo_and_text': Lampa.Lang.translate('logo_display_mode_logo_and_text')        
                    },        
                    'default': 'logo_only'        
                },        
                field: {        
                    name: Lampa.Lang.translate('logo_display_mode_title')        
                }        
            });        
                
            // Налаштування розміру логотипу        
            Lampa.SettingsApi.addParam({        
                component: 'interface',        
                param: {        
                    name: 'logo_size',        
                    type: 'select',        
                    values: {        
                        '50': '50px',        
                        '75': '75px',        
                        '100': '100px',        
                        '125': '125px',        
                        '150': '150px',        
                        '175': '175px',        
                        '200': '200px'        
                    },        
                    'default': '100'        
                },        
                field: {        
                    name: Lampa.Lang.translate('logo_size_title')        
                }        
            });        
        }        
            
        // Функція для завантаження логотипу з кешуванням  
        function loadLogoFromCache(item, callback) {  
            var method = item.name ? 'tv' : 'movie';  
            var cacheKey = method + '_' + item.id + '_' + Lampa.Storage.get('language', 'uk');  
              
            // Перевірка пам'яті  
            if (logoCache[cacheKey]) {  
                callback(logoCache[cacheKey]);  
                return;  
            }  
              
            // Перевірка localStorage  
            try {  
                var cached = localStorage.getItem('logo_cache_' + cacheKey);  
                if (cached) {  
                    var parsed = JSON.parse(cached);  
                    var now = Date.now();  
                      
                    // Перевірка валідності кешу (7 днів)  
                    if (now - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {  
                        logoCache[cacheKey] = parsed.data;  
                        callback(parsed.data);  
                        return;  
                    }  
                }  
            } catch(e) {  
                console.error('[LogoPlugin] Помилка читання з localStorage:', e);  
            }  
              
            // Завантаження з TMDB API  
            var apiKey = Lampa.TMDB.key();  
            if (!apiKey) {  
                console.error('[LogoPlugin] TMDB API key не знайдено');  
                callback(null);  
                return;  
            }  
              
            var language = Lampa.Storage.get('language', 'uk');  
            var url = Lampa.TMDB.api(method + '/' + item.id + '/images?api_key=' + apiKey + '&language=' + language);  
              
            var $ = window.$ || window.jQuery;  
            if (!$) {  
                console.error('[LogoPlugin] jQuery не знайдено');  
                callback(null);  
                return;  
            }  
              
            $.get(url, function(response) {  
                if (response && response.logos && response.logos.length > 0) {  
                    // Фільтрація SVG-логотипів  
                    var logos = response.logos.filter(function(logo) {  
                        return !logo.file_path.endsWith('.svg');  
                    });  
                      
                    if (logos.length > 0) {  
                        var logoData = logos[0].file_path;  
                          
                        // Зберегти в пам'яті  
                        logoCache[cacheKey] = logoData;  
                          
                        // Зберегти в localStorage  
                        try {  
                            localStorage.setItem('logo_cache_' + cacheKey, JSON.stringify({  
                                data: logoData,  
                                timestamp: Date.now()  
                            }));  
                        } catch(e) {  
                            console.error('[LogoPlugin] Помилка запису в localStorage:', e);  
                        }  
                          
                        callback(logoData);  
                        return;  
                    }  
                }  
                  
                // Fallback на англійську мову  
                if (language !== 'en') {  
                    var urlEn = Lampa.TMDB.api(method + '/' + item.id + '/images?api_key=' + apiKey + '&language=en');  
                    $.get(urlEn, function(responseEn) {  
                        if (responseEn && responseEn.logos && responseEn.logos.length > 0) {  
                            var logosEn = responseEn.logos.filter(function(logo) {  
                                return !logo.file_path.endsWith('.svg');  
                            });  
                              
                            if (logosEn.length > 0) {  
                                var logoDataEn = logosEn[0].file_path;  
                                logoCache[cacheKey] = logoDataEn;  
                                  
                                try {  
                                    localStorage.setItem('logo_cache_' + cacheKey, JSON.stringify({  
                                        data: logoDataEn,  
                                        timestamp: Date.now()  
                                    }));  
                                } catch(e) {}  
                                  
                                callback(logoDataEn);  
                                return;  
                            }  
                        }  
                        callback(null);  
                    }).fail(function() {  
                        callback(null);  
                    });  
                } else {  
                    callback(null);  
                }  
            }).fail(function() {  
                callback(null);  
            });  
        }  
          
        // Функція для рендерингу логотипу  
        function renderLogo(logoPath, titleElement, item) {  
            var displayMode = Lampa.Storage.get('logo_display_mode', 'logo_only');  
            var selectedHeight = Lampa.Storage.get('logo_size', '100');  
              
            // Перевірка валідності розміру  
            if (!/^\d+$/.test(selectedHeight)) {  
                selectedHeight = '100';  
            }  
              
            var logoHeight = parseInt(selectedHeight, 10);  
            var showText = displayMode === 'logo_and_text';  
            var titleText = showText ? (item.title || item.name) : '';  
              
            console.log('[LogoPlugin] Логотип відображено:', {  
                displayMode: displayMode,  
                showText: showText,  
                logoHeight: logoHeight,  
                titleText: titleText  
            });  
              
            var containerStyle = 'display: inline-block; height: ' + logoHeight + 'px; width: auto; max-width: 100%;';  
            var imgStyle = 'height: 100%; width: auto; object-fit: contain; display: block;';  
              
            var logoHtml = '<div style="height: auto !important; overflow: visible !important;">' +  
                          '<div style="' + containerStyle + '">' +  
                          '<img style="' + imgStyle + '" src="' + Lampa.TMDB.image('/t/p/w300' + logoPath) + '" />' +  
                          '</div>';  
              
            if (showText && titleText) {  
                logoHtml += '<span style="display: block; line-height: normal; margin-top: 0.5em;">' + titleText + '</span>';  
            }  
              
            logoHtml += '</div>';  
              
            titleElement.css({  
                'height': 'auto !important',  
                'max-height': 'none !important',  
                'overflow': 'visible !important'  
            }).html(logoHtml);  
        }  
          
        // Функція для завантаження та рендерингу логотипу  
        function loadAndRenderLogo(item, card) {  
            loadLogoFromCache(item, function(logoPath) {  
                var titleElement = card.find('.full-start-new__title, .full-start__title');  
                  
                if (!titleElement.length) {  
                    console.log('[LogoPlugin] Елемент заголовка не знайдено');  
                    return;  
                }  
                  
                if (logoPath) {  
                    renderLogo(logoPath, titleElement, item);  
                } else {  
                    console.log('[LogoPlugin] Логотип не знайдено для:', item.title || item.name);  
                }  
            });  
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
                }  
            }  
        });  
    })();  
})();
