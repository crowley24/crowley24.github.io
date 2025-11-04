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
                uk: 'Логотип та текст',          
                ru: 'Логотип и текст'          
            },          
            logo_size_title: {          
                en: 'Logo size (px)',          
                uk: 'Розмір логотипу (px)',          
                ru: 'Размер логотипа (px)'          
            }          
        });          
            
        // Функція для додавання налаштувань          
        function addSettings() {  
            // Перевірка на існування Lampa.SettingsApi  
            if (!window.Lampa || !Lampa.SettingsApi) {  
                console.error('[LogoPlugin] Lampa.SettingsApi не доступний');  
                return;  
            }  
              
            try {  
                // Додавання перемикача для відображення логотипу          
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
                    },          
                    onChange: function(value) {          
                        if (window.Lampa && Lampa.Storage) {  
                            Lampa.Storage.set('logo_main', value);  
                        }  
                    }          
                });          
            
                // Додавання вибору режиму відображення          
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
                    },          
                    onChange: function(value) {          
                        if (window.Lampa && Lampa.Storage) {  
                            Lampa.Storage.set('logo_display_mode', value);  
                        }  
                    }          
                });          
            
                // Додавання налаштування розміру логотипу          
                Lampa.SettingsApi.addParam({          
                    component: 'interface',          
                    param: {          
                        name: 'info_panel_logo_max_height',          
                        type: 'input',          
                        'default': '150'          
                    },          
                    field: {          
                        name: Lampa.Lang.translate('logo_size_title')          
                    },          
                    onChange: function(value) {          
                        if (window.Lampa && Lampa.Storage) {  
                            Lampa.Storage.set('info_panel_logo_max_height', value);  
                        }  
                    }          
                });  
                  
                console.log('[LogoPlugin] Налаштування успішно додані');  
            } catch(e) {  
                console.error('[LogoPlugin] Помилка додавання налаштувань:', e);  
            }  
        }          
            
        // Функція для завантаження та рендерингу логотипу          
        function loadAndRenderLogo(item, card) {          
            var $ = window.$ || window.jQuery;  
            if (!$) {  
                console.error('[LogoPlugin] jQuery не знайдено');  
                return;  
            }  
              
            if (!window.Lampa || !Lampa.TMDB || !Lampa.Storage) {  
                console.error('[LogoPlugin] Lampa API не доступний');  
                return;  
            }  
              
            var apiKey = Lampa.TMDB.key();  
            if (!apiKey) {  
                console.error('[LogoPlugin] TMDB API key не знайдено');  
                return;  
            }  
              
            var method = item.name ? 'tv' : 'movie';          
            var language = Lampa.Storage.get('language', 'uk');          
            var url = Lampa.TMDB.api(method + '/' + item.id + '/images?api_key=' + apiKey + '&language=' + language);          
            
            $.get(url, function (response) {          
                if (response && response.logos && response.logos.length > 0) {          
                    // Фільтруємо SVG-логотипи  
                    var logos = response.logos.filter(function(logo) {  
                        return !logo.file_path.endsWith('.svg');  
                    });  
                      
                    if (logos.length > 0) {  
                        var logoPath = logos[0].file_path;          
                        renderLogo(item, card, logoPath);          
                    } else {  
                        console.log('[LogoPlugin] Немає доступних логотипів (після фільтрації SVG)');  
                    }  
                } else {          
                    // Fallback на англійську мову          
                    var fallbackUrl = Lampa.TMDB.api(method + '/' + item.id + '/images?api_key=' + apiKey + '&language=en');          
                    $.get(fallbackUrl, function (fallbackResponse) {          
                        if (fallbackResponse && fallbackResponse.logos && fallbackResponse.logos.length > 0) {          
                            // Фільтруємо SVG-логотипи  
                            var fallbackLogos = fallbackResponse.logos.filter(function(logo) {  
                                return !logo.file_path.endsWith('.svg');  
                            });  
                              
                            if (fallbackLogos.length > 0) {  
                                var fallbackLogoPath = fallbackLogos[0].file_path;          
                                renderLogo(item, card, fallbackLogoPath);          
                            } else {  
                                console.log('[LogoPlugin] Немає доступних логотипів (англійська, після фільтрації SVG)');  
                            }  
                        } else {  
                            console.log('[LogoPlugin] Немає доступних логотипів (англійська)');  
                        }  
                    }).fail(function() {  
                        console.error('[LogoPlugin] Помилка завантаження логотипів (англійська)');  
                    });          
                }          
            }).fail(function() {  
                console.error('[LogoPlugin] Помилка завантаження логотипів');  
            });          
        }          
            
        // Функція для рендерингу логотипу          
        function renderLogo(item, card, logoPath) {          
            var $ = window.$ || window.jQuery;  
            if (!$) return;  
              
            if (!window.Lampa || !Lampa.Storage || !Lampa.TMDB) {  
                console.error('[LogoPlugin] Lampa API не доступний');  
                return;  
            }  
              
            // Отримати налаштування з перевірками на undefined  
            var displayMode = Lampa.Storage.get('logo_display_mode');  
            if (displayMode === null || displayMode === undefined) {  
                displayMode = 'logo_only';  
            }  
              
            var selectedHeight = Lampa.Storage.get('info_panel_logo_max_height');  
            if (selectedHeight === null || selectedHeight === undefined || selectedHeight === '') {  
                selectedHeight = '150';  
            }  
              
            // Валідація selectedHeight  
            if (!/^\d+$/.test(selectedHeight)) {  
                console.warn('[LogoPlugin] Некоректне значення розміру:', selectedHeight, '- використовую 150');  
                selectedHeight = '150';  
            }  
              
            var logoHeight = parseInt(selectedHeight, 10);  
            if (isNaN(logoHeight) || logoHeight <= 0) {  
                console.warn('[LogoPlugin] Некоректна висота логотипу:', logoHeight, '- використовую 150');  
                logoHeight = 150;  
            }  
              
            // Визначити, чи показувати текст  
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
                var containerStyle = 'display: inline-block; height: ' + logoHeight + 'px; width: auto; max-width: 100%;';          
                var imgStyle = 'height: 100%; width: auto; object-fit: contain; display: block; margin-bottom: 0em;';          
                  
                var logoHtml = '<div style="height: auto !important; overflow: visible !important;">' +  
                    '<div style="' + containerStyle + '">' +  
                    '<img style="' + imgStyle + '" src="' + Lampa.TMDB.image('/t/p/w300' + logoPath.replace('.svg', '.png')) + '" />' +  
                    '</div>';  
                  
                // Додати текст тільки якщо showText === true  
                if (showText && titleText) {  
                    logoHtml += '<span style="display: block; line-height: normal;">' + titleText + '</span>';  
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
            
        // Відкладена ініціалізація налаштувань  
        function initSettings() {  
            if (!window.Lampa || !Lampa.SettingsApi || !Lampa.Storage) {  
                console.log('[LogoPlugin] Очікування ініціалізації Lampa...');  
                setTimeout(initSettings, 500);  
                return;  
            }  
              
            console.log('[LogoPlugin] Lampa готова, додаємо налаштування');  
            addSettings();  
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
          
        // Запуск ініціалізації налаштувань  
        if (window.appready) {  
            initSettings();  
        } else {  
            Lampa.Listener.follow('app', function(e){  
                if (e.type === 'ready') initSettings();  
            });  
        }  
    })();          
})();
