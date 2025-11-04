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
                en: 'Logo size (px)',        
                uk: 'Розмір логотипу (px)',        
                ru: 'Размер логотипа (px)'        
            }        
        });        
        
        // Додавання налаштувань у розділ "Інтерфейс"        
        Lampa.SettingsApi.addParam({        
            component: 'interface',        
            param: {        
                name: 'logo_main',        
                type: 'select',        
                values: {        
                    '1': Lampa.Lang.translate('logo_main_hide'),        
                    '2': Lampa.Lang.translate('logo_main_show')        
                },        
                'default': '2'        
            },        
            field: {        
                name: Lampa.Lang.translate('logo_main_title'),        
                description: Lampa.Lang.translate('logo_main_description')        
            },        
            onChange: function (value) {        
                Lampa.Storage.set('logo_main', value);        
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
                name: Lampa.Lang.translate('logo_display_mode_title')        
            },        
            onChange: function (value) {        
                Lampa.Storage.set('logo_display_mode', value);        
            }        
        });        
        
        Lampa.SettingsApi.addParam({        
            component: 'interface',        
            param: {        
                name: 'info_panel_logo_max_height',        
                type: 'input',        
                'default': '100'        
            },        
            field: {        
                name: Lampa.Lang.translate('logo_size_title')        
            },        
            onChange: function (value) {        
                Lampa.Storage.set('info_panel_logo_max_height', value);        
            }        
        });        
        
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
                
            var method = item.name ? 'tv' : 'movie';    
            var language = Lampa.Storage.get('language', 'uk');    
            var url = Lampa.TMDB.api(method + '/' + item.id + '/images?api_key=' + apiKey + '&language=' + language);    
                
            $.get(url, function (response) {    
                if (response && response.logos && response.logos.length > 0) {    
                    // Фільтрувати SVG-логотипи    
                    var logos = response.logos.filter(function(logo) {    
                        return !logo.file_path.endsWith('.svg');    
                    });    
                        
                    if (logos.length > 0) {    
                        var logoPath = logos[0].file_path;    
                        renderLogo(item, card, logoPath);    
                    } else {    
                        console.log('[LogoPlugin] Немає PNG-логотипів для', item.title || item.name);    
                    }    
                } else {    
                    console.log('[LogoPlugin] Логотипи не знайдено, спроба англійською');    
                    // Fallback на англійську мову    
                    var urlEn = Lampa.TMDB.api(method + '/' + item.id + '/images?api_key=' + apiKey + '&language=en');    
                    $.get(urlEn, function (responseEn) {    
                        if (responseEn && responseEn.logos && responseEn.logos.length > 0) {    
                            var logosEn = responseEn.logos.filter(function(logo) {    
                                return !logo.file_path.endsWith('.svg');    
                            });    
                                
                            if (logosEn.length > 0) {    
                                var logoPathEn = logosEn[0].file_path;    
                                renderLogo(item, card, logoPathEn);    
                            }    
                        }    
                    });    
                }    
            });    
        }    
            
        // Функція для рендерингу логотипу    
        function renderLogo(item, card, logoPath) {    
            var $ = window.$ || window.jQuery;    
            var displayMode = Lampa.Storage.get('logo_display_mode', 'logo_only');    
            var selectedHeight = Lampa.Storage.get('info_panel_logo_max_height', '100');    
                
            // Перевірка валідності висоти    
            if (!/^\d+$/.test(selectedHeight)) {    
                selectedHeight = '100';    
            }    
                
            var logoHeight = parseInt(selectedHeight, 10);    
            var showText = displayMode === 'logo_and_text';    
            var titleText = showText ? (item.title || item.name) : '';    
                
            var imgUrl = Lampa.TMDB.image('/t/p/w300' + logoPath.replace('.svg', '.png'));    
            var containerStyle = 'display: inline-block; height: ' + logoHeight + 'px; width: auto; max-width: 100%;';    
            var imgStyle = 'height: 100%; width: auto; object-fit: contain; display: block; margin-bottom: 0em;';    
                
            var logoHtml = '<div style="height: auto !important; overflow: visible !important;">' +    
                          '<div style="' + containerStyle + '">' +    
                          '<img style="' + imgStyle + '" src="' + imgUrl + '" />' +    
                          '</div>';    
                
            if (titleText) {    
                logoHtml += '<span style="display: block; line-height: normal;">' + titleText + '</span>';    
            }    
                
            logoHtml += '</div>';    
                
            var titleElement = card.find('.full-start-new__title, .full-start__title');    
            if (titleElement.length) {    
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
    })();    
})();
