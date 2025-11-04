(function () {  
    'use strict';  
      
    // Кеш для логотипів  
    var logoCache = {};  
      
    // Перевірка доступності Lampa API  
    function waitForLampa(callback) {  
        if (window.Lampa && Lampa.Listener && Lampa.Storage && Lampa.TMDB && Lampa.Lang) {  
            callback();  
        } else {  
            setTimeout(function() { waitForLampa(callback); }, 100);  
        }  
    }  
      
    waitForLampa(function() {  
        console.log('[LogoPlugin] Ініціалізація плагіна');  
          
        // Додавання локалізації  
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
                uk: 'Логотип та текст',  
                ru: 'Логотип и текст'  
            },  
            logo_size_title: {  
                en: 'Logo size (px)',  
                uk: 'Розмір логотипу (px)',  
                ru: 'Размер логотипа (px)'  
            }  
        });  
          
        // Функція для отримання кешованого логотипу  
        function getCachedLogo(itemId, language) {  
            var cacheKey = itemId + '_' + language;  
              
            if (logoCache[cacheKey]) {  
                return logoCache[cacheKey];  
            }  
              
            try {  
                var cached = localStorage.getItem('logo_cache_' + cacheKey);  
                if (cached) {  
                    var parsed = JSON.parse(cached);  
                    var now = Date.now();  
                    if (now - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {  
                        logoCache[cacheKey] = parsed.data;  
                        return parsed.data;  
                    }  
                }  
            } catch(e) {  
                console.error('[LogoPlugin] Помилка читання з localStorage:', e);  
            }  
              
            return null;  
        }  
          
        // Функція для збереження логотипу в кеш  
        function setCachedLogo(itemId, language, logoPath) {  
            var cacheKey = itemId + '_' + language;  
            logoCache[cacheKey] = logoPath;  
              
            try {  
                localStorage.setItem('logo_cache_' + cacheKey, JSON.stringify({  
                    data: logoPath,  
                    timestamp: Date.now()  
                }));  
            } catch(e) {  
                console.error('[LogoPlugin] Помилка запису в localStorage:', e);  
            }  
        }  
          
        // Додавання налаштувань через новий API  
        function addSettings() {  
            try {  
                if (!Lampa.Settings) {  
                    console.error('[LogoPlugin] Lampa.Settings не доступний');  
                    return;  
                }  
                  
                // Додавання секції налаштувань  
                Lampa.SettingsApi.addComponent({  
                    component: 'logo_settings',  
                    name: 'logo_settings',  
                    icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'  
                });  
                  
                // Перемикач показу/приховування  
                Lampa.SettingsApi.addParam({  
                    component: 'interface',  
                    param: {  
                        name: 'logo_main',  
                        type: 'select',  
                        values: {  
                            '0': Lampa.Lang.translate('logo_main_show'),  
                            '1': Lampa.Lang.translate('logo_main_hide')  
                        },  
                        default: '0'  
                    },  
                    field: {  
                        name: Lampa.Lang.translate('logo_main_description')  
                    },  
                    onChange: function(value) {  
                        Lampa.Storage.set('logo_main', value);  
                    }  
                });  
                  
                // Режим відображення  
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
                        name: Lampa.Lang.translate('logo_display_mode_title')  
                    },  
                    onChange: function(value) {  
                        Lampa.Storage.set('logo_display_mode', value);  
                    }  
                });  
                  
                // Розмір логотипу  
                Lampa.SettingsApi.addParam({  
                    component: 'interface',  
                    param: {  
                        name: 'info_panel_logo_max_height',  
                        type: 'input',  
                        default: '150'  
                    },  
                    field: {  
                        name: Lampa.Lang.translate('logo_size_title'),  
                        placeholder: '150'  
                    },  
                    onChange: function(value) {  
                        Lampa.Storage.set('info_panel_logo_max_height', value);  
                    }  
                });  
                  
                console.log('[LogoPlugin] Налаштування успішно додані');  
            } catch(e) {  
                console.error('[LogoPlugin] Помилка додавання налаштувань:', e);  
            }  
        }  
          
        // Функція для завантаження логотипу  
        function loadAndRenderLogo(item, card) {  
            var $ = window.$ || window.jQuery;  
            if (!$ || !item || !item.id) return;  
              
            var method = item.first_air_date && !item.release_date ? 'tv/' : 'movie/';  
            var language = Lampa.Storage.get('language', 'uk');  
              
            var cachedLogo = getCachedLogo(item.id, language);  
            if (cachedLogo) {  
                console.log('[LogoPlugin] Використання кешу для', item.id);  
                renderLogo(item, card, cachedLogo);  
                return;  
            }  
              
            var apiKey = Lampa.TMDB.key();  
            if (!apiKey) {  
                console.error('[LogoPlugin] TMDB API ключ не знайдено');  
                return;  
            }  
              
            var url = Lampa.TMDB.api(method + item.id + '/images?api_key=' + apiKey + '&language=' + language);  
              
            $.get(url, function (response) {  
                if (response && response.logos && response.logos.length > 0) {  
                    var logos = response.logos.filter(function(logo) {  
                        return !logo.file_path.endsWith('.svg');  
                    });  
                      
                    if (logos.length > 0) {  
                        var logoPath = logos[0].file_path;  
                        setCachedLogo(item.id, language, logoPath);  
                        renderLogo(item, card, logoPath);  
                    }  
                }  
            }).fail(function() {  
                if (language !== 'en') {  
                    var enUrl = Lampa.TMDB.api(method + item.id + '/images?api_key=' + apiKey + '&language=en');  
                    $.get(enUrl, function (response) {  
                        if (response && response.logos && response.logos.length > 0) {  
                            var logos = response.logos.filter(function(logo) {  
                                return !logo.file_path.endsWith('.svg');  
                            });  
                              
                            if (logos.length > 0) {  
                                var logoPath = logos[0].file_path;  
                                setCachedLogo(item.id, 'en', logoPath);  
                                renderLogo(item, card, logoPath);  
                            }  
                        }  
                    });  
                }  
            });  
        }  
          
        // Функція для рендерингу логотипу  
        function renderLogo(item, card, logoPath) {  
            var $ = window.$ || window.jQuery;  
            if (!$) return;  
              
            var displayMode = Lampa.Storage.get('logo_display_mode', 'logo_only');  
            var selectedHeight = Lampa.Storage.get('info_panel_logo_max_height', '150');  
            var logoHeight = parseInt(selectedHeight, 10) || 150;  
            var showText = displayMode === 'logo_and_text';  
            var titleText = showText ? (item.title || item.name) : '';  
              
            var titleElement = card.find('.full-start-new__title, .full-start__title');  
            if (titleElement.length) {  
                var containerStyle = 'display: flex; align-items: center; justify-content: flex-start; max-height: ' + logoHeight + 'px; height: auto; max-width: 100%;';  
                var imgStyle = 'height: 100%; width: auto; object-fit: contain; display: block; margin-bottom: 0em;';  
                  
                var logoHtml = '<div style="height: auto !important; overflow: visible !important;"><div style="' + containerStyle + '"><img style="' + imgStyle + '" src="' + Lampa.TMDB.image('/t/p/w300' + logoPath) + '" /></div>';  
                  
                if (titleText) {  
                    logoHtml += '<span style="display: block; line-height: normal; margin-top: 0.5em;">' + titleText + '</span>';  
                }  
                  
                logoHtml += '</div>';  
                  
                card.find('.full-start__title-original').remove();  
                titleElement.css({  
                    'height': 'auto !important',  
                    'max-height': 'none !important',  
                    'overflow': 'visible !important'  
                }).html(logoHtml);  
            }  
        }  
          
        // Підписка на події  
        Lampa.Listener.follow('full', function (event) {  
            if ((event.type === 'complite' || event.type === 'movie') && Lampa.Storage.get('logo_main') !== '1') {  
                var item = event.data.movie;  
                if (!item || !item.id) return;  
                  
                setTimeout(function() {  
                    var card = event.object.activity.render();  
                    var titleElement = card.find('.full-start-new__title, .full-start__title');  
                      
                    if (titleElement.length) {  
                        loadAndRenderLogo(item, card);  
                    } else {  
                        var observer = new MutationObserver(function() {  
                            var titleElement = card.find('.full-start-new__title, .full-start__title');  
                            if (titleElement.length) {  
                                observer.disconnect();  
                                loadAndRenderLogo(item, card);  
                            }  
                        });  
                          
                        var target = card[0] || card;  
                        observer.observe(target, {childList: true, subtree: true});  
                          
                        setTimeout(function() {  
                            observer.disconnect();  
                        }, 5000);  
                    }  
                }, 300);  
            }  
        });  
          
        // Ініціалізація налаштувань  
        addSettings();  
          
        console.log('[LogoPlugin] Плагін успішно завантажено');  
    });  
})();
