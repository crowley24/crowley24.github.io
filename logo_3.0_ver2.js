(function () {        
    'use strict';        
          
    (function () {        
        // Кеш для логотипів (зберігається в пам'яті)  
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
            logo_max_height_title: {        
                en: 'Logo max height',        
                uk: 'Максимальна висота логотипа',        
                ru: 'Максимальная высота логотипа'        
            }        
        });        
            
        // Додавання налаштувань в розділ "Інтерфейс"        
        if (Lampa.SettingsApi) {        
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
                    name: Lampa.Lang.translate('logo_main_title'),        
                    description: Lampa.Lang.translate('logo_main_description')        
                }        
            });        
                
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
                    name: Lampa.Lang.translate('logo_display_mode_title'),        
                    description: ''        
                },        
                onRender: function(item) {        
                    if (Lampa.Storage.get('logo_main') === '1') {        
                        item.hide();        
                    }        
                }        
            });        
                
            Lampa.SettingsApi.addParam({        
                component: 'interface',        
                param: {        
                    name: 'logo_max_height',        
                    type: 'select',        
                    values: {        
                        '50': '50px',        
                        '75': '75px',        
                        '100': '100px',        
                        '125': '125px',        
                        '150': '150px',        
                        '200': '200px'        
                    },        
                    'default': '100'        
                },        
                field: {        
                    name: Lampa.Lang.translate('logo_max_height_title'),        
                    description: ''        
                },        
                onRender: function(item) {        
                    if (Lampa.Storage.get('logo_main') === '1') {        
                        item.hide();        
                    }        
                }        
            });        
        }        
            
        // Функція для завантаження та рендерингу логотипу з кешуванням  
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
                
            var method = item.name ? 'tv' : 'movie';    
            var language = Lampa.Storage.get('language', 'uk');    
            var cacheKey = method + '_' + item.id + '_' + language;  
              
            // Перевірка кешу в пам'яті  
            if (logoCache[cacheKey]) {  
                console.log('[LogoPlugin] Використання кешу для:', item.title || item.name);  
                renderLogo(logoCache[cacheKey], item, card);  
                return;  
            }  
              
            // Перевірка localStorage кешу  
            try {  
                var cachedData = localStorage.getItem('logo_cache_' + cacheKey);  
                if (cachedData) {  
                    var parsed = JSON.parse(cachedData);  
                    var now = Date.now();  
                    // Кеш дійсний 7 днів  
                    if (now - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {  
                        console.log('[LogoPlugin] Використання localStorage кешу для:', item.title || item.name);  
                        logoCache[cacheKey] = parsed.logoPath;  
                        renderLogo(parsed.logoPath, item, card);  
                        return;  
                    } else {  
                        localStorage.removeItem('logo_cache_' + cacheKey);  
                    }  
                }  
            } catch(e) {  
                console.error('[LogoPlugin] Помилка читання localStorage:', e);  
            }  
              
            var url = Lampa.TMDB.api(method + '/' + item.id + '/images?api_key=' + apiKey + '&language=' + language);    
                
            $.get(url, function (response) {    
                if (response.logos && response.logos.length > 0) {    
                    // Фільтрація SVG-логотипів  
                    var logos = response.logos.filter(function(logo) {  
                        return !logo.file_path.endsWith('.svg');  
                    });  
                      
                    if (logos.length > 0) {  
                        var logoPath = logos[0].file_path;  
                          
                        // Зберегти в кеш  
                        logoCache[cacheKey] = logoPath;  
                          
                        try {  
                            localStorage.setItem('logo_cache_' + cacheKey, JSON.stringify({  
                                logoPath: logoPath,  
                                timestamp: Date.now()  
                            }));  
                        } catch(e) {  
                            console.error('[LogoPlugin] Помилка запису в localStorage:', e);  
                        }  
                          
                        renderLogo(logoPath, item, card);  
                    }  
                } else if (language !== 'en') {    
                    // Fallback на англійську мову  
                    var enUrl = Lampa.TMDB.api(method + '/' + item.id + '/images?api_key=' + apiKey + '&language=en');    
                    $.get(enUrl, function (enResponse) {    
                        if (enResponse.logos && enResponse.logos.length > 0) {    
                            var logos = enResponse.logos.filter(function(logo) {  
                                return !logo.file_path.endsWith('.svg');  
                            });  
                              
                            if (logos.length > 0) {  
                                var logoPath = logos[0].file_path;  
                                  
                                // Зберегти в кеш  
                                logoCache[cacheKey] = logoPath;  
                                  
                                try {  
                                    localStorage.setItem('logo_cache_' + cacheKey, JSON.stringify({  
                                        logoPath: logoPath,  
                                        timestamp: Date.now()  
                                    }));  
                                } catch(e) {  
                                    console.error('[LogoPlugin] Помилка запису в localStorage:', e);  
                                }  
                                  
                                renderLogo(logoPath, item, card);  
                            }  
                        }    
                    }).fail(function() {  
                        console.error('[LogoPlugin] Помилка завантаження англійських логотипів');  
                    });    
                }    
            }).fail(function() {  
                console.error('[LogoPlugin] Помилка завантаження логотипів');  
            });    
        }    
          
        // Функція для рендерингу логотипу  
        function renderLogo(logoPath, item, card) {  
            var $ = window.$ || window.jQuery;  
            if (!$) return;  
              
            var titleElement = card.find('.full-start-new__title, .full-start__title');  
            if (!titleElement.length) return;  
              
            var displayMode = Lampa.Storage.get('logo_display_mode', 'logo_only');  
            var maxHeight = Lampa.Storage.get('logo_max_height', '100');  
            var titleText = displayMode === 'logo_and_text' ? (item.title || item.name) : '';  
              
            var imgUrl = Lampa.TMDB.image('/t/p/w300' + logoPath);  
            var imgStyle = 'max-height: ' + maxHeight + 'px; width: auto; object-fit: contain; display: block;';  
            var logoHtml = '<img src="' + imgUrl + '" style="' + imgStyle + '" alt="' + (item.title || item.name) + ' Logo" />';  
              
            if (titleText) {  
                logoHtml += '<span style="display: block; margin-top: 10px;">' + titleText + '</span>';  
            }  
              
            titleElement.html(logoHtml);  
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
