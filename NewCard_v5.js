(function () {
    'use strict';

    var PLUGIN_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3H19ZM19 19H5V5H19V19ZM7 10H17V12H7V10ZM7 14H12V16H7V14ZM7 6H17V8H7V6Z" fill="white"/></svg>';

    function initializePlugin() {
        patchApiImg();
        addStyles();
        attachLogoLoader();
    }

    function addStyles() {
        var styles = '<style>' +
            '.applecation .full-start-new__reactions > div:first-child .reaction { display: flex !important; align-items: center !important; background-color: rgba(0, 0, 0, 0) !important; gap: 0 !important; }' +
            '.applecation .full-start-new__reactions > div:first-child .reaction__icon { background-color: rgba(0, 0, 0, 0.3) !important; border-radius: 5em; padding: 0.5em; width: 2.6em !important; height: 2.6em !important; }' +
            '.applecation .full-start-new__reactions > div:first-child .reaction__count { font-size: 1.2em !important; font-weight: 500 !important; }' +
            '.applecation .full-start-new__reactions.focus { gap: 0.5em; }' +
            '.applecation .full-start-new__reactions.focus > div { display: block; }' +
            '.applecation .full-start-new__rate-line { margin: 0; height: 0; overflow: hidden; opacity: 0; pointer-events: none; }' +
            '@keyframes kenBurns { 0% { transform: scale(1.0); } 50% { transform: scale(1.1); } 100% { transform: scale(1.0); } }' +
            '.full-start__background { height: calc(100% + 6em); left: 0 !important; opacity: 0 !important; transition: opacity 0.8s ease-out, filter 0.3s ease-out !important; position: absolute; width: 100%; transform-origin: center center; z-index: 0 !important; }' +
            '.full-start__background.loaded:not(.dim) { opacity: 1 !important; }' +
            'body.applecation--zoom-enabled .full-start__background.loaded:not(.dim) { animation: kenBurns 40s linear infinite !important; }' +
            '.full-start__details::before { content: ""; position: absolute; top: -150px; left: -150px; width: 200%; height: 200%; background: linear-gradient(90deg, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.8) 25%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 100%); z-index: -1; pointer-events: none; }' +
            '.applecation__logo, .applecation__meta, .applecation__info, .applecation__description { position: relative; z-index: 2; }' +
            '.applecation__ratings { display: none !important; }' +
            '.full-start__background.dim { filter: brightness(0.3); }' +
            '.applecation .full-start__status { display: none; }' +
            '</style>';
        Lampa.Template.add('applecation_css', styles);
        $('body').append(Lampa.Template.get('applecation_css', {}, true));
    }

    function patchApiImg() {
        var originalImg = Lampa.Api.img;
        Lampa.Api.img = function (src, size) {
            if (size === 'w1280') {
                var posterSize = Lampa.Storage.field('poster_size');
                var sizeMap = { 'w200': 'w780', 'w300': 'w1280', 'w500': 'original' };
                size = sizeMap[posterSize] || 'w1280';
            }
            return originalImg.call(this, src, size);
        };
    }

    function selectBestLogo(logos, currentLang) {
        if (!logos || !logos.length) return null;
        var preferred = logos.filter(function(l) { return l.iso_639_1 === currentLang; });
        if (preferred.length > 0) return preferred.sort(function(a, b) { return b.vote_average - a.vote_average; })[0];
        var english = logos.filter(function(l) { return l.iso_639_1 === 'en'; });
        if (english.length > 0) return english.sort(function(a, b) { return b.vote_average - a.vote_average; })[0];
        return logos.sort(function(a, b) { return b.vote_average - a.vote_average; })[0];
    }

    function loadNetworkIcon(render, data) {
        var networkContainer = render.find('.applecation__network');
        var showStudio = Lampa.Storage.get('applecation_show_studio', 'true');
        if (showStudio === false || showStudio === 'false') {
            networkContainer.remove();
            return;
        }
        var logos = [];
        var items = (data.networks || []).concat(data.production_companies || []);
        items.forEach(function (item) {
            if (item.logo_path) {
                var logoUrl = Lampa.Api.img(item.logo_path, 'w200');
                logos.push({ url: logoUrl, name: item.name });
            }
        });

        if (logos.length > 0) {
            networkContainer.html(logos.map(function(l) { 
                return '<img src="' + l.url + '" alt="' + l.name + '" data-original="true">'; 
            }).join(''));
            
            logos.forEach(function (logo) {
                var img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = function () {
                    var canvas = document.createElement('canvas');
                    var ctx = canvas.getContext('2d');
                    canvas.width = this.width; canvas.height = this.height;
                    ctx.drawImage(this, 0, 0);
                    try {
                        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                        var r = 0, g = 0, b = 0, pixelCount = 0, darkPixelCount = 0;
                        for (var i = 0; i < imgData.length; i += 4) {
                            if (imgData[i + 3] > 0) {
                                var brightness = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
                                r += imgData[i]; g += imgData[i + 1]; b += imgData[i + 2]; pixelCount++;
                                if (brightness < 20) darkPixelCount++;
                            }
                        }
                        if (pixelCount > 0 && (darkPixelCount / pixelCount > 0.7)) {
                            networkContainer.find('img[alt="' + logo.name + '"]').css({ 'filter': 'brightness(0) invert(1)', 'opacity': '0.9' });
                        }
                    } catch(e) {}
                };
                img.src = logo.url;
            });
        } else { networkContainer.remove(); }
    }

    function formatSeasons(count) {
        var cases = [2, 0, 1, 1, 1, 2], titles = ['сезон', 'сезони', 'сезонів'];
        var caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];
        return count + ' ' + titles[caseIndex];
    }

    function loadLogo(event) {
        var data = event.data.movie, activity = event.object.activity;
        if (!data || !activity) return;
        var render = activity.render(), logoContainer = render.find('.applecation__logo'), titleElement = render.find('.full-start-new__title');
        
        // Мета-інфо
        var metaParts = [data.name ? 'Серіал' : 'Фільм'];
        if (data.genres && data.genres.length) {
            metaParts.push(data.genres[0].name);
        }
        render.find('.applecation__meta-text').html(metaParts.join(' · '));
        
        // Додаткова інфо
        var infoParts = [];
        var date = data.release_date || data.first_air_date || '';
        if (date) infoParts.push(date.split('-')[0]);
        if (data.name) {
            var seasons = Lampa.Utils.countSeasons(data);
            if (seasons) infoParts.push(formatSeasons(seasons));
        } else if (data.runtime) {
            infoParts.push(data.runtime + ' хв');
        }
        render.find('.applecation__info').html(infoParts.join(' · '));
        
        loadNetworkIcon(render, data);

        // TMDB Logo
        var apiUrl = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key());
        $.get(apiUrl, function (imagesData) {
            var bestLogo = selectBestLogo(imagesData.logos, 'uk');
            if (bestLogo) {
                var logoUrl = Lampa.TMDB.image('/t/p/w500' + bestLogo.file_path);
                logoContainer.html('<img src="' + logoUrl + '" />').addClass('loaded');
            } else {
                titleElement.show();
            }
            render.find('.applecation__meta, .applecation__info, .applecation__description').addClass('show');
            render.find('.full-start__background').addClass('applecation-animated');
        });
    }

    function attachLogoLoader() {
        Lampa.Listener.follow('full', function (event) {
            if (event.type === 'complite') {
                setTimeout(function() { loadLogo(event); }, 200);
            }
        });
    }

    function registerPlugin() {
        var pluginManifest = { type: 'other', version: '1.1.0', name: 'NewCard', description: 'Оптимізований дизайн.', author: '', icon: PLUGIN_ICON };
        if (Lampa.Manifest) {
            if (!Lampa.Manifest.plugins) Lampa.Manifest.plugins = {};
            Lampa.Manifest.plugins.newcard = pluginManifest;
        }
    }

    function startPlugin() { registerPlugin(); initializePlugin(); }
    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (event) { if (event.type === 'ready') startPlugin(); });

})();
