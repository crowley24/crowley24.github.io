(function () {
    'use strict';

    // Використовуємо var для кращої сумісності зі старими TV
    var PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#333"><rect x="5" y="30" width="90" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><rect x="15" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/><rect x="40" y="40" width="20" height="20" fill="hsl(200, 80%, 80%)"/><rect x="65" y="40" width="20" height="20" fill="hsl(200, 80%, 70%)"/></svg>';

    var ICONS = {
        imdb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 7c-1.103 0-2 .897-2 2v6.4c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2H4Zm1.4 2.363h1.275v5.312H5.4V9.362Zm1.962 0H9l.438 2.512.287-2.512h1.75v5.312H10.4v-3l-.563 3h-.8l-.512-3v3H7.362V9.362Zm8.313 0H17v1.2c.16-.16.516-.363.875-.363.36.04.84.283.8.763v3.075c0 .24-.075.404-.275.524-.16.04-.28.075-.6.075-.32 0-.795-.196-.875-.237-.08-.04-.163.275-.163.275h-1.087V9.362Zm-3.513.037H13.6c.88 0 1.084.078 1.325.237.24.16.35.397.35.838v3.2c0 .32-.15.563-.35.762-.2.2-.484.288-1.325.288h-1.438V9.4Zm1.275.8v3.563c.2 0 .488.04.488-.2v-3.126c0-.28-.247-.237-.488-.237Zm3.763.675c-.12 0-.2.08-.2.2v2.688c0 .159.08.237.2.237.12 0 .2-.117.2-.238l-.037-2.687c0-.12-.043-.2-.163-.2Z"/></svg>',
        kp: '<svg viewBox="0 0 192 192" fill="none" stroke="currentColor" stroke-width="5"><path d="M96.5 20 66.1 75.733V20H40.767v152H66.1v-55.733L96.5 172h35.467C116.767 153.422 95.2 133.578 80 115c28.711 16.889 63.789 35.044 92.5 51.933v-30.4C148.856 126.4 108.644 115.133 85 105c23.644 3.378 63.856 7.889 87.5 11.267v-30.4L85 90c27.022-11.822 60.478-22.711 87.5-34.533v-30.4C143.789 41.956 108.711 63.11 80 80l51.967-60z"/></svg>',
        play: '<svg viewBox="0 0 28 29" fill="none"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>'
    };

    var logoCache = {};

    function addStyles() {
        var style = '<style id="applecation-style">' +
            ':root { --apple-logo-scale: 1; --apple-text-scale: 100%; --apple-spacing: 1; }' +
            '.applecation .applecation__logo img { max-width: calc(35vw * var(--apple-logo-scale)) !important; max-height: calc(180px * var(--apple-logo-scale)) !important; }' +
            '.applecation .applecation__content-wrapper { font-size: var(--apple-text-scale) !important; }' +
            '.applecation__logo { opacity: 0; transform: translateY(20px); transition: all 0.4s ease; }' +
            '.applecation__logo.loaded { opacity: 1; transform: translateY(0); }' +
            '.applecation__network img { height: 1.5em; margin-right: 0.5em; vertical-align: middle; }' +
            'body.applecation--zoom-enabled .full-start__background.loaded:not(.dim) { animation: appleKenBurns 40s linear infinite !important; }' +
            '@keyframes appleKenBurns { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }' +
            '</style>';
        $('body').append(style);
    }

    function applyScales() {
        var root = document.documentElement.style;
        root.setProperty('--apple-logo-scale', (parseInt(Lampa.Storage.get('applecation_logo_scale', '100')) || 100) / 100);
        root.setProperty('--apple-text-scale', Lampa.Storage.get('applecation_text_scale', '100') + '%');
        root.setProperty('--apple-spacing', (parseInt(Lampa.Storage.get('applecation_spacing_scale', '100')) || 100) / 100);
    }

    function loadLogo(event) {
        var data = event.data.movie;
        var activity = event.object.activity;
        if (!data || !activity) return;

        var render = activity.render();
        var containers = {
            logo: render.find('.applecation__logo'),
            title: render.find('.full-start-new__title'),
            ratings: render.find('.applecation__ratings'),
            network: render.find('.applecation__network')
        };

        // Захист від "empty of undefined"
        if (containers.network.length) containers.network.empty();

        fillRatings(containers.ratings, data);
        fillMeta(render, data);

        var cacheKey = data.id + '_' + (data.name ? 'tv' : 'movie');
        
        var processLogo = function(imagesData) {
            var logos = imagesData.logos || [];
            // Пріоритет: UA -> EN -> Any
            var best = logos.filter(function(a) { return a.iso_639_1 === 'uk'; })[0] || 
                       logos.filter(function(a) { return a.iso_639_1 === 'en'; })[0] || 
                       logos[0];

            if (best) {
                var url = Lampa.TMDB.image('/t/p/w500' + best.file_path);
                var img = new Image();
                img.onload = function() {
                    containers.logo.html('<img src="' + url + '" />');
                    containers.logo.addClass('loaded');
                };
                img.src = url;
            } else {
                containers.title.show();
                containers.logo.addClass('loaded');
            }
        };

        if (logoCache[cacheKey]) {
            processLogo(logoCache[cacheKey]);
        } else {
            var url = (data.name ? 'tv' : 'movie') + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key();
            $.get(Lampa.TMDB.api(url), function(res) {
                logoCache[cacheKey] = res;
                processLogo(res);
            });
        }
    }

    function fillRatings(container, data) {
        var imdb = (data.number_rating && data.number_rating.imdb) || data.vote_average || 0;
        var kp = (data.number_rating && data.number_rating.kp) || 0;
        
        if (imdb > 0) container.find('.rate--imdb').removeClass('hide').find('div').text(parseFloat(imdb).toFixed(1));
        if (kp > 0) container.find('.rate--kp').removeClass('hide').find('div').text(parseFloat(kp).toFixed(1));
    }

    function fillMeta(render, data) {
        var year = (data.release_date || data.first_air_date || '').split('-')[0];
        var genres = (data.genres || []).slice(0, 2).map(function(g) { return g.name; }).join(' · ');
        render.find('.applecation__meta-text').text((data.name ? 'Серіал' : 'Фільм') + ' · ' + genres);
        render.find('.applecation__info').text(year + (data.runtime ? ' · ' + data.runtime + ' хв' : ''));
    }

    function initialize() {
        addStyles();
        applyScales();
        
        Lampa.SettingsApi.addComponent({ component: 'applecation_settings', name: 'NewCard', icon: PLUGIN_ICON });
        
        // Реєстрація налаштувань (сумісна з ES5)
        var settings = [
            {n: 'apple_zoom', t: 'trigger', l: 'Плаваючий зум', d: 'Анімація фону'},
            {n: 'show_ratings', t: 'trigger', l: 'Рейтинги', d: 'Показувати IMDB/KP'},
            {n: 'logo_scale', t: 'select', l: 'Розмір лого', v: {'70':'70%','100':'100%','130':'130%'}, def: '100'}
        ];

        settings.forEach(function(p) {
            Lampa.SettingsApi.addParam({
                component: 'applecation_settings',
                param: { name: 'applecation_' + p.n, type: p.t, default: p.def || false },
                field: { name: p.l, description: p.d },
                onChange: function() { 
                    applyScales();
                    $('body').toggleClass('applecation--zoom-enabled', Lampa.Storage.get('applecation_apple_zoom'));
                }
            });
        });

        Lampa.Template.add('full_start_new', '<div class="full-start-new applecation"><div class="applecation__logo"></div><div class="applecation__content-wrapper"><div class="full-start-new__title" style="display:none">{title}</div><div class="applecation__meta"><span class="applecation__network"></span><span class="applecation__meta-text"></span></div><div class="applecation__ratings"><div class="rate--imdb hide">' + ICONS.imdb + ' <div></div></div><div class="rate--kp hide">' + ICONS.kp + ' <div></div></div></div><div class="applecation__description">{overview}</div><div class="applecation__info"></div><div class="full-start-new__buttons"><div class="full-start__button selector button--play">' + ICONS.play + ' <span>#{title_watch}</span></div></div></div></div>');

        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite') loadLogo(e);
        });
    }

    if (window.appready) initialize();
    else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') initialize(); });
})();

