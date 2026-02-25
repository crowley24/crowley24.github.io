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
            '.applecation .full-start-new__rate-line { margin: 0; height: 0; overflow: hidden; opacity: 0; pointer-events: none; }' +
            '@keyframes kenBurns { 0% { transform: scale(1.0) translateZ(0); } 50% { transform: scale(1.1) translateZ(0); } 100% { transform: scale(1.0) translateZ(0); } }' +
            '.full-start__background { height: calc(100% + 6em); left: 0 !important; opacity: 0 !important; transition: opacity 0.8s ease-out, filter 0.3s ease-out !important; will-change: transform, opacity; z-index: 0 !important; position: absolute; width: 100%; transform-origin: center center; }' +
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

    function selectBestLogo(logos, lang) {
        if (!logos || !logos.length) return null;
        var preferred = logos.filter(function(l) { return l.iso_639_1 === lang; });
        if (!preferred.length) preferred = logos.filter(function(l) { return l.iso_639_1 === 'en'; });
        if (!preferred.length) preferred = logos;
        return preferred.sort(function(a, b) { return b.vote_average - a.vote_average; })[0];
    }

    function loadNetworkIcon(render, data) {
        var networkContainer = render.find('.applecation__network');
        var items = (data.networks || []).concat(data.production_companies || []);
        var logosHtml = '';

        items.forEach(function (item) {
            if (item.logo_path) {
                logosHtml += '<img src="' + Lampa.Api.img(item.logo_path, 'w200') + '" alt="' + item.name + '">';
            }
        });

        if (logosHtml) networkContainer.html(logosHtml);
        else networkContainer.remove();
    }

    function formatSeasons(count) {
        var cases = [2, 0, 1, 1, 1, 2], titles = ['сезон', 'сезони', 'сезонів'];
        var caseIndex = (count % 100 > 4 && count % 100 < 20) ? 2 : cases[Math.min(count % 10, 5)];
        return count + ' ' + titles[caseIndex];
    }

    function waitForBackgroundLoad(activity, callback) {
        var bg = activity.render().find('.full-start__background');
        if (bg.hasClass('loaded')) callback();
        else bg.on('load', callback);
        setTimeout(callback, 1500); // Запасний вихід
    }

    // Порожня функція без зайвих аргументів, щоб лінтер не сварився
    function fillRatings() {
        return null;
    }

    function loadLogo(event) {
        var data = event.data.movie;
        var activity = event.object.activity;
        if (!data || !activity) return;

        var render = activity.render();
        var logoContainer = render.find('.applecation__logo');
        var titleElement = render.find('.full-start-new__title');

        fillRatings(); // Виклик залишено, але він нічого не робить
        loadNetworkIcon(render, data);

        var apiUrl = Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key());
        
        $.get(apiUrl, function (res) {
            var bestLogo = selectBestLogo(res.logos, 'uk');
            if (bestLogo) {
                var logoUrl = Lampa.TMDB.image('/t/p/w500' + bestLogo.file_path);
                logoContainer.html('<img src="' + logoUrl + '">').addClass('loaded');
                titleElement.hide();
            } else {
                titleElement.show();
            }
        });
    }

    function attachLogoLoader() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                setTimeout(function() { loadLogo(e); }, 200);
            }
        });
    }

    function registerPlugin() {
        var manifest = { type: 'other', version: '1.1.5', name: 'NewCard', description: 'дизайн без рейтингів', author: '', icon: PLUGIN_ICON };
        Lampa.Manifest.plugins.newcard = manifest;
    }

    if (window.appready) registerPlugin(), initializePlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') registerPlugin(), initializePlugin(); });

})();
