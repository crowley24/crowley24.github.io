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
              
            // Перевірка пам'яті  
            if (logoCache[cacheKey]) {  
                return logoCache[cacheKey];  
            }  
              
            // Перевірка localStorage  
            try {  
                var cached = localStorage.getItem('logo_cache_' + cacheKey);  
                if (cached) {  
                    var parsed = JSON.parse(cached);  
                    var now = Date.now();  
                    // Кеш дійсний 7 днів  
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
              
            // Зберегти в пам'яті  
            logoCache[cacheKey] = logoPath;  
              
            // Зберегти в localStorage  
            try {  
                localStorage.setItem('logo_cache_' + cacheKey, JSON.stringify({  
                    data: logoPath,  
                    timestamp: Date.now()  
                }));  
            } catch(e) {  
                console.error('[LogoPlugin] Помилка запису в localStorage:', e);  
            }  
        }  
          
        // Функція для додавання налаштувань  
        function addSettings() {  
            try {  
                // Додавання заголовка секції  
                Lampa.SettingsApi.addParam({        
                    component: 'interface',        
                    param: {        
                        name: 'logo_settings_title',        
                        type: 'title'        
                    },        
                    field: {        
                        name: Lampa.Lang.translate('logo_main_title')        
                    },        
                    onRender: function () {        
                        setTimeout(function() {        
                            $('.settings-param > div:contains("' + Lampa.Lang.translate('logo_main_title') + '")').parent().insertAfter($('div[data-name="interface_size"]'));        
                        }, 0);        
                    }        
                });  
                  
                // Перемикач показу/приховування логотипів  
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
                    },        
                    onRender: function () {        
                        setTimeout(function() {        
                            $('div[data-name="logo_main"]').insertAfter($('div[data-name="logo_settings_title"]'));        
                        }, 0);        
                    }        
                });  
                  
                // Вибір режиму відображення  
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
                    },        
                    onRender: function () {        
                        setTimeout(function() {        
                            $('div[data-name="logo_display_mode"]').insertAfter($('div[data-name="logo_main"]'));        
                        }, 0);        
                    }        
                });  
                  
                // Налаштування розміру логотипу  
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
                    },        
                    onRender: function () {        
                        setTimeout(function() {        
                            $('div[data-name="info_panel_logo_max_height"]').insertAfter($('div[data-name="logo_display_mode"]'));        
                        }, 0);        
                    }        
                });  
                  
                console.log('[LogoPlugin] Налаштування успішно додані');  
            } catch(e) {  
                console.error('[LogoPlugin] Помилка додавання налаштувань:', e);  
            }  
        }  
          
        // Відкладена ініціалізація налаштувань  
        function initSettings() {  
            if (!window.Lampa || !Lampa.Storage || !Lampa.SettingsApi) {  
                console.log('[LogoPlugin] Очікування ініціалізації Lampa...');  
                setTimeout(initSettings, 500);  
                return;  
            }  
              
            console.log('[LogoPlugin] Lampa готова, додаємо налаштування');  
            addSettings();  
        }  
          
        // Функція для завантаження та рендерингу логотипу  
        function loadAndRenderLogo(item, card) {  
            var $ = window.$ || window.jQuery;  
            if (!$ || !item || !item.id) return;  
              
            var method = item.first_air_date && !item.release_date ? 'tv/' : 'movie/';  
            var language = Lampa.Storage.get('language', 'uk');  
              
            // Перевірка кешу  
            var cachedLogo = getCachedLogo(item.id, language);  
            if (cachedLogo) {  
                console.log('[LogoPlugin] Використання кешованого логотипу для', item.id);  
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
                    // Фільтрувати SVG-логотипи  
                    var logos = response.logos.filter(function(logo) {  
                        return !logo.file_path.endsWith('.svg');  
                    });  
                      
                    if (logos.length > 0) {  
                        var logoPath = logos[0].file_path;  
                        setCachedLogo(item.id, language, logoPath);  
                        renderLogo(item, card, logoPath);  
                    } else {  
                        console.log('[LogoPlugin] Логотипи не знайдено (після фільтрації SVG) для', item.id);  
                    }  
                } else {  
                    console.log('[LogoPlugin] Логотипи не знайдено для', item.id, 'мовою', language);  
                }  
            }).fail(function() {  
                // Fallback на англійську мову  
                if (language !== 'en') {  
                    console.log('[LogoPlugin] Спроба завантажити англійський логотип для', item.id);  
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
              
            // Отримати налаштування з валідацією  
            var displayMode = Lampa.Storage.get('logo_display_mode');  
            if (displayMode === null || displayMode === undefined) {  
                displayMode = 'logo_only';  
            }  
              
            var selectedHeight = Lampa.Storage.get('info_panel_logo_max_height');  
            if (selectedHeight === null || selectedHeight === undefined || !/^\d+$/.test(selectedHeight)) {  
                selectedHeight = '150';  
            }  
              
            var logoHeight = parseInt(selectedHeight, 10);  
            if (isNaN(logoHeight) || logoHeight <= 0) {  
                logoHeight = 150;  
            }  
              
            var showText = displayMode === 'logo_and_text';  
            var titleText = showText ? (item.title || item.name) : '';  
              
            console.log('[LogoPlugin] Логотип відображено:', {  
                displayMode: displayMode,  
                showText: showText,  
                logoHeight: logoHeight,  
                titleText: titleText  
            });  
              
            var titleElement = card.find('.full-start-new__title, .full-start__title');  
            if (titleElement.length) {  
                var containerStyle = 'display: flex; align-items: center; justify-content: flex-start; max-height: ' + logoHeight + 'px; height: auto; max-width: 100%;';  
                var imgStyle = 'height: 100%; width: auto; object-fit: contain; display: block; margin-bottom: 0em;';  
                  
                var logoHtml = '<div style="height: auto !important; overflow: visible !important;"><div style="' + containerStyle + '"><img style="' + imgStyle + '" src="' + Lampa.TMDB.image('/t/p/w300' + logoPath.replace('.svg', '.png')) + '" /></div>';  
                  
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
