(function () {  
    'use strict';  
  
    var PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="8" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="33" width="6" height="6" fill="#1E1E1E"/><rect x="8" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="18" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="28" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="38" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="48" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="58" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="68" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="78" y="61" width="6" height="6" fill="#1E1E1E"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>';  
  
    var logoCache = new Map();  
    var LANG = 'uk';  
  
    function addSetting(component, param, field, onChange) {  
        Lampa.SettingsApi.addParam({  
            component: component,  
            param: param,  
            field: field,  
            onChange: onChange || function (value) {  
                Lampa.Storage.set(param.name, value);  
            }  
        });  
    }  
  
    function generateScaleStyles() {  
        var logoScale = parseInt(Lampa.Storage.get('applecation_logo_scale', '100'), 10);  
        var textScale = parseInt(Lampa.Storage.get('applecation_text_scale', '100'), 10);  
        var spacingScale = parseInt(Lampa.Storage.get('applecation_spacing_scale', '100'), 10);  
          
        return '.applecation .applecation__logo img {max-width: ' + (35 * logoScale / 100) + 'vw !important;max-height: ' + (180 * logoScale / 100) + 'px !important;}' +  
               '.applecation .applecation__content-wrapper {font-size: ' + textScale + '% !important;}' +  
               '.applecation .applecation__description {max-width: ' + (35 * textScale / 100) + 'vw !important;}' +  
               ['.title', '.meta', '.description', '.info'].map(function (el) {  
                   return '.applecation .applecation__' + el + ' {margin-bottom: ' + (0.5 * spacingScale / 100) + 'em !important;}';  
               }).join('');  
    }  
  
    function selectBestLogo(logos, lang) {  
        lang = lang || LANG;  
        if (!logos || !logos.length) return null;  
          
        var preferred = logos.filter(function (l) {  
            return l.iso_639_1 === lang;  
        });  
          
        var sorted = (preferred.length ? preferred : logos).sort(function (a, b) {  
            return b.vote_average - a.vote_average;  
        });  
          
        return sorted[0];  
    }  
  
    var SETTINGS_CONFIG = [  
        {  
            name: 'applecation_apple_zoom',  
            type: 'trigger',  
            default: true,  
            field: { name: 'Плаваючий зум фону', description: 'Повільна анімація наближення фонового зображення' },  
            onChange: function () {  
                $('body').toggleClass('applecation--zoom-enabled', Lampa.Storage.get('applecation_apple_zoom'));  
            }  
        },  
        {  
            name: 'applecation_show_studio',  
            type: 'trigger',  
            default: true,  
            field: { name: 'Показувати логотип студії', description: 'Відображати іконку Netflix, HBO, Disney тощо у мета-даних' }  
        },  
        {  
            name: 'applecation_logo_scale',  
            type: 'select',  
            default: '100',  
            values: { '70':'70%','80':'80%','90':'90%','100':'За замовчуванням','110':'110%','120':'120%','130':'130%','140':'140%','150':'150%','160':'160%' },  
            field: { name: 'Розмір логотипу', description: 'Масштаб логотипу фільму' },  
            onChange: applyScales  
        },  
        {  
            name: 'applecation_text_scale',  
            type: 'select',  
            default: '100',  
            values: { '50':'50%','60':'60%','70':'70%','80':'80%','90':'90%','100':'За замовчуванням','110':'110%','120':'120%','130':'130%','140':'140%','150':'150%','160':'160%','170':'170%','180':'180%' },  
            field: { name: 'Розмір тексту', description: 'Масштаб тексту даних про фільм' },  
            onChange: applyScales  
        },  
        {  
            name: 'applecation_spacing_scale',  
            type: 'select',  
            default: '100',  
            values: { '50':'50%','60':'60%','70':'70%','80':'80%','90':'90%','100':'За замовчуванням','110':'110%','120':'120%','130':'130%','140':'140%','150':'150%','160':'160%','170':'170%','180':'180%','200':'200%','250':'250%','300':'300%' },  
            field: { name: 'Відступи між рядками', description: 'Відстань між елементами інформації' },  
            onChange: applyScales  
        }  
    ];  
  
    function initializePlugin() {  
        console.log('NewCard', 'v1.1.0');  
        if (!Lampa.Platform.screen('tv')) {  
            console.log('NewCard', 'TV mode only');  
            return;  
        }  
        patchApiImg();  
        addCustomTemplate();  
        addStyles();  
        addSettings();  
        attachLogoLoader();  
    }  
  
    function applyScales() {  
        $('style[data-id="applecation_scales"]').remove();  
        $('body').append('<style data-id="applecation_scales">' + generateScaleStyles() + '</style>');  
    }  
  
    function patchApiImg() {  
        var originalImg = Lampa.Api.img;  
        Lampa.Api.img = function (src, size) {  
            if (size === 'w1280') {  
                var sizeMap = { 'w200': 'w780', 'w300': 'w1280', 'w500': 'original' };  
                size = sizeMap[Lampa.Storage.field('poster_size')] || 'w1280';  
            }  
            return originalImg.call(this, src, size);  
        };  
    }  
  
    function getLogoQuality() {  
        var qualityMap = { 'w200': 'w300', 'w300': 'w500', 'w500': 'original' };  
        return qualityMap[Lampa.Storage.field('poster_size')] || 'w500';  
    }  
  
    function getMediaType(data) {  
        return data.name ? 'Серіал' : 'Фільм';  
    }  
  
    function loadNetworkIcon(render, data) {  
        var networkContainer = render.find('.applecation__network');  
        if (Lampa.Storage.get('applecation_show_studio') === false) {  
            networkContainer.remove();  
            return;  
        }  
  
        var logos = [];  
        ['networks', 'production_companies'].forEach(function (key) {  
            (data[key] || []).forEach(function (item) {  
                if (item.logo_path) {  
                    var logoUrl = Lampa.Api.img(item.logo_path, 'w200');  
                    logos.push({  
                        url: logoUrl,  
                        name: item.name,  
                        element: '<img src="' + logoUrl + '" alt="' + item.name + '" data-original="true">'  
                    });  
                }  
            });  
        });  
  
        if (logos.length) {  
            networkContainer.html(logos.map(function (l) { return l.element; }).join(''));  
            logos.forEach(function (logo) {  
                var img = new Image();  
                img.crossOrigin = 'anonymous';  
                img.onload = function () {  
                    var canvas = document.createElement('canvas');  
                    var ctx = canvas.getContext('2d');  
                    canvas.width = this.width;  
                    canvas.height = this.height;  
                    ctx.drawImage(this, 0, 0);  
                    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);  
                    var data = imageData.data;  
                    var r = 0, g = 0, b = 0, pixelCount = 0, darkPixelCount = 0;  
                    for (var y = 0; y < canvas.height; y++) {  
                        for (var x = 0; x < canvas.width; x++) {  
                            var idx = (y * canvas.width + x) * 4;  
                            var alpha = data[idx + 3];  
                            if (alpha > 0) {  
                                var brightness = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];  
                                r += data[idx]; g += data[idx + 1]; b += data[idx + 2]; pixelCount++;  
                                if (brightness < 20) darkPixelCount++;  
                            }  
                        }  
                    }  
                    if (pixelCount > 0) {  
                        var avgBrightness = (0.299 * (r/pixelCount) + 0.587 * (g/pixelCount) + 0.114 * (b/pixelCount));  
                        if (avgBrightness < 25 && darkPixelCount / pixelCount > 0.7) {  
                            var imgElement = networkContainer.find('img[alt="' + logo.name + '"]');  
                            imgElement.css({ 'filter': 'brightness(0) invert(1) contrast(1.2)', 'opacity': '0.95' });  
                            imgElement.removeAttr('data-original');  
                        }  
                    }  
                };  
                img.src = logo.url;  
            });  
        } else {  
            networkContainer.remove();  
        }  
    }  
  
    function fillMetaInfo(render, data) {  
        var metaParts = [getMediaType(data)];  
        if (data.genres && data.genres.length) {  
            metaParts.push.apply(metaParts, data.genres.slice(0, 2).map(function (g) {  
                return Lampa.Utils.capitalizeFirstLetter(g.name);  
            }));  
        }  
        render.find('.applecation__meta-text').html(metaParts.join(' · '));  
        loadNetworkIcon(render, data);  
    }  
  
    function fillAdditionalInfo(render, data) {  
        var infoParts = [];  
        var releaseDate = data.release_date || data.first_air_date;  
        if (releaseDate) {  
            infoParts.push(releaseDate.split('-')[0]);  
        }  
          
        if (data.name) {  
            if (data.episode_run_time && data.episode_run_time.length) {  
                var timeM = Lampa.Lang.translate('time_m').replace('.', '');  
                infoParts.push(data.episode_run_time[0] + ' ' + timeM);  
            }  
            var seasons = Lampa.Utils.countSeasons(data);  
            if (seasons) {  
                infoParts.push(formatSeasons(seasons));  
            }  
        } else if (data.runtime && data.runtime > 0) {  
            var hours = Math.floor(data.runtime / 60);  
            var minutes = data.runtime % 60;  
            var timeH = Lampa.Lang.translate('time_h').replace('.', '');  
            var timeM = Lampa.Lang.translate('time_m').replace('.', '');  
            infoParts.push(hours > 0 ? hours + ' ' + timeH + ' ' + minutes + ' ' + timeM : minutes + ' ' + timeM);  
        }  
        render.find('.applecation__info').html(infoParts.join(' · '));  
    }  
  
    function formatSeasons(count) {  
        var cases = [2, 0, 1, 1, 1, 2];  
        var titles = ['сезон', 'сезони', 'сезонів'];  
        var caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];  
        return count + ' ' + titles[caseIndex];  
    }  
  
    function waitForBackgroundLoad(activity, callback) {  
        var background = activity.render().find('.full-start__background');  
        if (!background.length) { callback(); return; }  
        var complete = function () {  
            background.addClass('applecation-animated');  
            callback();  
        };  
        if (background.hasClass('loaded')) { setTimeout(complete, 100); return; }  
          
        if (typeof MutationObserver !== 'undefined') {  
            var observer = new MutationObserver(function () {  
                if (background.hasClass('loaded')) { observer.disconnect(); setTimeout(complete, 100); }  
            });  
            observer.observe(background[0], { attributes: true, attributeFilter: ['class'] });  
            setTimeout(function () { observer.disconnect(); if (!background.hasClass('applecation-animated')) complete(); }, 1500);  
        } else {  
            var checkInterval = setInterval(function () {  
                if (background.hasClass('loaded')) { clearInterval(checkInterval); setTimeout(complete, 100); }  
            }, 100);  
            setTimeout(function () { clearInterval(checkInterval); if (!background.hasClass('applecation-animated')) complete(); }, 1500);  
        }  
    }  
  
    function loadLogo(event) {  
        var data = event.data.movie;  
        var activity = event.object.activity;  
        if (!data || !activity) return;  
          
        var render = activity.render();  
        var logoContainer = render.find('.applecation__logo');  
        var titleElement = render.find('.full-start-new__title');  
          
        fillMetaInfo(render, data);  
        fillAdditionalInfo(render, data);  
          
        waitForBackgroundLoad(activity, function () {  
            render.find('.applecation__meta, .applecation__info, .applecation__description').addClass('show');  
        });  
          
        var cacheKey = data.id + '_' + (data.name ? 'tv' : 'movie');  
        if (logoCache.has(cacheKey)) {  
            return applyLogoData(logoCache.get(cacheKey), logoContainer, titleElement, activity);  
        }  
          
        var mediaType = data.name ? 'tv' : 'movie';  
        var apiUrl = Lampa.TMDB.api(mediaType + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key());  
          
        if (!Lampa.Activity.active() || Lampa.Activity.active().component !== 'full') return;  
          
        $.get(apiUrl, function (imagesData) {  
            logoCache.set(cacheKey, imagesData);  
            if (Lampa.Activity.active() && Lampa.Activity.active().component === 'full') {  
                applyLogoData(imagesData, logoContainer, titleElement, activity);  
            }  
        }).fail(function () {  
            titleElement.show();  
            waitForBackgroundLoad(activity, function () {  
                logoContainer.addClass('loaded');  
            });  
        });  
    }  
  
    function applyLogoData(imagesData, logoContainer, titleElement, activity) {  
        var bestLogo = selectBestLogo(imagesData.logos, LANG);  
        if (bestLogo) {  
            var logoUrl = Lampa.TMDB.image('/t/p/' + getLogoQuality() + bestLogo.file_path);  
            var img = new Image();  
            img.onload = function () {  
                logoContainer.html('<img src="' + logoUrl + '" alt="" />');  
                waitForBackgroundLoad(activity, function () {  
                    logoContainer.addClass('loaded');  
                });  
            };  
            img.src = logoUrl;  
        } else {  
            titleElement.show();  
            waitForBackgroundLoad(activity, function () {  
                logoContainer.addClass('loaded');
                 });  
        }  
    }  
  
    // Дебаунс для завантаження логотипів  
    var loadTimeout;  
    function attachLogoLoader() {  
        Lampa.Listener.follow('full', function (event) {  
            if (event.type === 'complite') {  
                clearTimeout(loadTimeout);  
                loadTimeout = setTimeout(function () {  
                    loadLogo(event);  
                }, 150);  
            }  
        });  
    }  
  
    // Реєстрація маніфесту  
    function registerPlugin() {  
        var pluginManifest = {  
            type: 'other',  
            version: '1.1.0',  
            name: 'NewCard',  
            description: 'Новий дизайн картки фільму/серіалу.',  
            author: '',  
            icon: PLUGIN_ICON  
        };  
        if (Lampa.Manifest) {  
            if (!Lampa.Manifest.plugins) Lampa.Manifest.plugins = {};  
            if (Array.isArray(Lampa.Manifest.plugins)) {  
                Lampa.Manifest.plugins.push(pluginManifest);  
            } else {  
                Lampa.Manifest.plugins.newcard = pluginManifest;  
            }  
        }  
    }  
  
    // Запуск плагіна  
    function startPlugin() {  
        registerPlugin();  
        initializePlugin();  
    }  
  
    if (window.appready) {  
        startPlugin();  
    } else {  
        Lampa.Listener.follow('app', function (event) {  
            if (event.type === 'ready') startPlugin();  
        });  
    }  
  
})();
