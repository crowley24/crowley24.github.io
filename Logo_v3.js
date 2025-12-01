(function () {  
    'use strict';  
      
    function waitForLampa(callback) {  
        if (window.Lampa && Lampa.Listener && Lampa.Storage && Lampa.TMDB && Lampa.Lang && Lampa.SettingsApi) {  
            callback();  
        } else {  
            setTimeout(function() { waitForLampa(callback); }, 100);  
        }  
    }  
      
    waitForLampa(function() {  
        if (window.logoplugin) return;  
        window.logoplugin = true;  
          
        var logoCache = {};  
          
        function getCachedLogo(itemId, language) {  
            var cacheKey = itemId + '_' + language;  
            if (logoCache[cacheKey]) return logoCache[cacheKey];  
              
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
            } catch(e) {}  
            return null;  
        }  
          
        function setCachedLogo(itemId, language, logoPath) {  
            var cacheKey = itemId + '_' + language;  
            logoCache[cacheKey] = logoPath;  
            try {  
                localStorage.setItem('logo_cache_' + cacheKey, JSON.stringify({  
                    data: logoPath,  
                    timestamp: Date.now()  
                }));  
            } catch(e) {}  
        }  
          
        Lampa.Lang.add({  
            logo_main_title:{en:'Logos instead of titles',uk:'Логотипи замість назв',ru:'Логотипы вместо названий'},  
            logo_main_description:{en:'Displays movie logos instead of text',uk:'Відображає логотипи фільмів замість тексту',ru:'Отображает логотипы фильмов вместо текста'},  
            logo_main_show:{en:'Show',uk:'Показати',ru:'Отображать'},  
            logo_main_hide:{en:'Hide',uk:'Приховати',ru:'Скрыть'},  
            logo_display_mode_title:{en:'Display mode',uk:'Режим відображення',ru:'Режим отображения'},  
            logo_display_mode_logo_only:{en:'Logo only',uk:'Тільки логотип',ru:'Только логотип'},  
            logo_display_mode_logo_and_text:{en:'Logo and text',uk:'Логотип і текст',ru:'Логотип и текст'},  
            logo_size_title:{en:'Logo size',uk:'Розмір логотипа',ru:'Размер логотипа'},  
            logo_size_description:{en:'Maximum logo height',uk:'Максимальна висота логотипа',ru:'Максимальная высота логотипа'}  
        });  
          
        Lampa.SettingsApi.addParam({  
            component:'interface',  
            param:{  
                name:'logo_main',  
                type:'select',  
                values:{  
                    '1':Lampa.Lang.translate('logo_main_hide'),  
                    '0':Lampa.Lang.translate('logo_main_show')  
                },  
                default:'0'  
            },  
            field:{  
                name:Lampa.Lang.translate('logo_main_title'),  
                description:Lampa.Lang.translate('logo_main_description')  
            }  
        });  
          
        Lampa.SettingsApi.addParam({  
            component:'interface',  
            param:{  
                name:'logo_display_mode',  
                type:'select',  
                values:{  
                    'logo_only':Lampa.Lang.translate('logo_display_mode_logo_only'),  
                    'logo_and_text':Lampa.Lang.translate('logo_display_mode_logo_and_text')  
                },  
                default:'logo_only'  
            },  
            field:{  
                name:Lampa.Lang.translate('logo_display_mode_title'),  
                description:Lampa.Lang.translate('logo_main_description'),  
                show:function(){return Lampa.Storage.get('logo_main') === '0';}  
            }  
        });  
          
        // ⭐ НОВИЙ ПАРАМЕТР — режим розміру логотипів  
        Lampa.SettingsApi.addParam({  
            component: 'interface',  
            param: {  
                name: 'logo_size_mode',  
                type: 'select',  
                values: {  
                    'small': 'Менший',  
                    'normal': 'Стандартний',  
                    'large': 'Більший'  
                },  
                default: 'normal'  
            },  
            field: {  
                name: 'Розмір логотипа (режим)',  
                description: 'Малий, стандартний або великий логотип',  
                show: function () {  
                    return Lampa.Storage.get('logo_main') === '0';  
                }  
            }  
        });  
          
        function loadAndRenderLogo(item, card) {  
            var $ = window.$ || window.jQuery;  
            if (!$) return;  
              
            var apiKey = Lampa.TMDB.key();  
            if (!apiKey) return;  
              
            var mediaType = item.first_air_date && !item.release_date ? 'tv' : 'movie';  
            var currentLang = Lampa.Storage.get('language');  
              
            var cachedLogo = getCachedLogo(item.id, currentLang);  
            if (cachedLogo) {  
                renderLogo(cachedLogo, card, item, false);  
                return;  
            }  
              
            var url = Lampa.TMDB.api(mediaType + '/' + item.id + '/images?api_key=' + apiKey + '&language=' + currentLang);  
              
            function tryEnglishLogos() {  
                if (currentLang === 'en') return;  
                  
                var enUrl = Lampa.TMDB.api(mediaType + '/' + item.id + '/images?api_key=' + apiKey + '&language=en');  
                $.get(enUrl, function (enResponse) {  
                    if (enResponse.logos && enResponse.logos.length > 0) {  
                        var pngLogo = enResponse.logos.find(l => !l.file_path.endsWith('.svg'));  
                        var logoPath = pngLogo ? pngLogo.file_path : enResponse.logos[0].file_path;  
                          
                        setCachedLogo(item.id, 'en', logoPath);  
                        renderLogo(logoPath, card, item, true);  
                    }  
                });  
            }  
              
            $.get(url, function (response) {  
                if (response.logos && response.logos.length > 0) {  
                    var pngLogo = response.logos.find(l => !l.file_path.endsWith('.svg'));  
                    var logoPath = pngLogo ? pngLogo.file_path : response.logos[0].file_path;  
                      
                    setCachedLogo(item.id, currentLang, logoPath);  
                    renderLogo(logoPath, card, item, false);  
                } else {  
                    tryEnglishLogos();  
                }  
            }).fail(tryEnglishLogos);  
        }  
          
        function renderLogo(logoPath, card, item, isEnglishLogo) {  
            if (!logoPath) return;  
              
            var displayMode = Lampa.Storage.get('logo_display_mode', 'logo_only');  
            var showTitle = displayMode === 'logo_and_text' || (isEnglishLogo && displayMode === 'logo_only');  
              
            var titleElement = card.find('.full-start-new__title, .full-start__title');  
            if (!titleElement.length) return;  
              
            var titleText = showTitle ? (titleElement.text() || item.title || item.name) : '';  
              
            // ⭐ НОВА ЛОГІКА РОЗМІРУ  
            var sizeMode = Lampa.Storage.get('logo_size_mode', 'normal');  
            var baseSize = 80;  
            var currentSize = baseSize;  
              
            if (sizeMode === 'small') currentSize = Math.floor(baseSize * 0.75);  
            if (sizeMode === 'normal') currentSize = baseSize;  
            if (sizeMode === 'large') currentSize = Math.floor(baseSize * 1.35);  
              
            var isMobile = window.innerWidth <= 585;  
            if (isMobile) currentSize = Math.floor(currentSize * 0.7);  
              
            var containerStyle = 'display:inline-block;height:' + currentSize + 'px;width:auto;max-width:100%;';  
            var imgStyle = 'height:100%;width:auto;object-fit:contain;display:block;margin-bottom:0.2em;';  
            var imgUrl = Lampa.TMDB.image('/t/p/w500' + logoPath.replace('.svg', '.png'));  
              
            var fallbackTitle = (item.title || item.name).replace(/'/g,"\\'");  
              
            var logoHtml =  
                '<div style="' + containerStyle + '">' +  
                    '<img style="' + imgStyle + '" src="' + imgUrl + '" alt="' + fallbackTitle + '" ' +  
                    'onerror="this.parentElement.parentElement.innerHTML=\'' + fallbackTitle + '\'"/>' +  
                '</div>';  
              
            if (titleText) logoHtml += '<span>' + titleText + '</span>';  
              
            titleElement.html(logoHtml);  
        }  
          
        Lampa.Listener.follow('full', function (event) {  
            if ((event.type === 'complite' || event.type === 'movie') && Lampa.Storage.get('logo_main') !== '1') {  
                var item = event.data.movie;  
                if (!item || !item.id) return;  
                  
                setTimeout(function() {  
                    var card = event.object.activity.render();  
                    var titleElement = card.find('.full-start-new__title, .full-start__title');  
                    if (titleElement.length) {  
                        loadAndRenderLogo(item, card);  
                    }  
                }, 150);  
            }  
        });  
          
        console.log('[LogoPlugin] Готово');  
    });  
})();
