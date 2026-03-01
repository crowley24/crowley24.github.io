(function () {    
    'use strict';    
  
    var ICONS = {  
        play: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor"/></svg>',  
        book: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',  
        reaction: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" stroke="currentColor" stroke-width="2"/></svg>',  
        options: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>',  
        trailer: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 6H3C1.9 6 1 6.9 1 8V16C1 17.1 1.9 18 3 18H21C22.1 18 23 17.1 23 16V8C23 6.9 22.1 6 21 6Z" stroke="currentColor" stroke-width="2"/><path d="M10 9L15 12L10 15V9Z" fill="currentColor"/></svg>'  
    };  
  
    var PLUGIN_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="80" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><circle cx="50" cy="50" r="10" fill="white"/></svg>';  
  
    function initializePlugin() {    
        // Перевіряємо наявність залежностей  
        if (typeof Lampa === 'undefined') {  
            console.error('NewCard: Lampa не знайдено');  
            return;  
        }  
          
        if (typeof $ === 'undefined') {  
            console.error('NewCard: jQuery не знайдено');  
            return;  
        }  
          
        if (!Lampa.Platform.screen('tv')) return;    
          
        // Додаємо клас для ідентифікації активного плагіна  
        $('body').addClass('applecation--active');  
          
        addCustomTemplate();    
        addStyles();    
        addSettings();  
        attachLogoLoader();    
    }    
  
    function addSettings() {  
        var defaults = {    
            'applecation_logo_scale': '100', 'applecation_text_scale': '100',   
            'applecation_spacing_scale': '100', 'applecation_show_studio': true, 'applecation_apple_zoom': true   
        };    
          
        Object.keys(defaults).forEach(function (key) {   
            if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);   
        });  
  
        Lampa.SettingsApi.addComponent({ component: 'applecation_settings', name: 'NewCard', icon: PLUGIN_ICON });    
  
        var scaleVals = { '70':'70%','80':'80%','90':'90%','100':'Стандарт','110':'110%','120':'120%','130':'130%' };  
          
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_logo_scale', type: 'select', values: scaleVals, default: '100' },  
            field: { name: 'Розмір логотипу' },  
            onChange: applyScales  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_text_scale', type: 'select', values: scaleVals, default: '100' },  
            field: { name: 'Розмір тексту' },  
            onChange: applyScales  
        });  
  
        Lampa.SettingsApi.addParam({  
            component: 'applecation_settings',  
            param: { name: 'applecation_apple_zoom', type: 'trigger', default: true },  
            field: { name: 'Анімація фону' },  
            onChange: function (v) { $('body').toggleClass('applecation--zoom-enabled', v); }  
        });  
  
        applyScales();  
        $('body').toggleClass('applecation--zoom-enabled', Lampa.Storage.get('applecation_apple_zoom'));  
    }  
  
    function applyScales() {  
        var root = document.documentElement;  
        root.style.setProperty('--apple-logo-scale', parseInt(Lampa.Storage.get('applecation_logo_scale')) / 100);  
        root.style.setProperty('--apple-text-scale', parseInt(Lampa.Storage.get('applecation_text_scale')) / 100);  
    }  
  
    function addCustomTemplate() {    
        var template = '<div class="full-start-new applecation">' +  
            '<div class="full-start-new__body">' +  
                '<div class="full-start-new__left">' +  
                    '<div class="full-start-new__poster">' +  
                        '<img class="full-start-new__img full--poster" />' +  
                    '</div>' +  
                '</div>' +  
                '<div class="full-start-new__right">' +  
                    '<div class="full-start-new__head"></div>' +  
                    '<div class="full-start-new__title applecation__logo"></div>' +  
                    '<div class="full-start-new__tagline full--tagline"></div>' +  
                    '<div class="applecation__line-meta"></div>' +  
                    '<div class="applecation__description"></div>' +  
                    '<div class="applecation__studios"></div>' +  
                    '<div class="full-start-new__buttons">' +  
                        '<div class="full-start__button selector button--play">' +  
                            '<svg><use xlink:href="#sprite-play"></use></svg>' +  
                            '<span>#{title_watch}</span>' +  
                        '</div>' +  
                        '<div class="full-start__button selector button--book">' +  
                            '<svg><use xlink:href="#sprite-bookmark"></use></svg>' +  
                            '<span>#{settings_input_links}</span>' +  
                        '</div>' +  
                        '<div class="full-start__button selector button--reaction">' +  
                            '<svg><use xlink:href="#sprite-reaction"></use></svg>' +  
                            '<span>#{title_reactions}</span>' +  
                        '</div>' +  
                        '<div class="full-start__button selector button--options">' +  
                            '<svg><use xlink:href="#sprite-dots"></use></svg>' +  
                        '</div>' +  
                    '</div>' +  
                '</div>' +  
            '</div>' +  
        '</div>';  
  
        Lampa.Template.add('full_start_new', template);  
    }  
  
    function addStyles() {    
        var styles = document.createElement('style');    
        styles.innerHTML = '<style>' +  
            '/* Приховуємо стандартний фон Lampa */' +  
            '.applecation .background,' +  
            '.applecation .background__one,' +  
            '.applecation .background__two,' +  
            '.applecation .background__fade {' +  
                'display: none !important;' +  
            '}' +  
            'body.applecation--active {' +  
                'background: #000 !important;' +  
            '}' +  
            '.applecation .full-start__background {' +  
                'display: none !important;' +  
            '}' +  
            '.applecation .full-start-new__right {' +  
                'background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.4) 70%, transparent 100%) !important;' +  
                'padding: 3em 2em;' +  
                'margin-top: -15vh;' +  
            '}' +  
            '.applecation__logo {' +  
                'text-align: center;' +  
                'margin-bottom: 1.5em;' +  
                'transform: scale(var(--apple-logo-scale, 1));' +  
            '}' +  
            '.applecation__logo img {' +  
                'max-height: 120px;' +  
                'object-fit: contain;' +  
                'filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));' +  
            '}' +  
            '.applecation__line-meta {' +  
                'text-align: center;' +  
                'font-size: calc(1.1em * var(--apple-text-scale, 1));' +  
                'color: rgba(255,255,255,0.9);' +  
                'margin-bottom: 1.2em;' +  
                'font-weight: 500;' +  
            '}' +  
            '.applecation__description {' +  
                'max-width: 700px; line-height: 1.5; margin-bottom: 25px;' +  
                'font-size: calc(1.05em * var(--apple-text-scale, 1));' +  
                'color: rgba(255,255,255,0.85);' +  
                'display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;' +  
                'text-align: center;' +  
            '}' +  
            '.applecation__studios {' +  
                'text-align: center;' +  
                'margin-bottom: 2em;' +  
                'display: flex;' +  
                'justify-content: center;' +  
                'align-items: center;' +  
                'gap: 1.5em;' +  
                'flex-wrap: wrap;' +  
            '}' +  
            '.applecation__studios img {' +  
                'height: 2.5em;' +  
                'object-fit: contain;' +  
                'filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.3));' +  
                'opacity: 0.8;' +  
            '}' +  
            '.applecation .full-start-new__buttons {' +  
                'display: flex; justify-content: center; align-items: center; gap: 20px;' +  
            '}' +  
            '.button--play {' +  
                'background: #fff !important; color: #000 !important;' +  
                'padding: 12px 35px !important; border-radius: 12px !important;' +  
                'font-weight: 700 !important; text-transform: none;' +  
                'transition: transform 0.2s, background 0.2s;' +  
            '}' +  
            '.applecation .full-start__button {' +  
                'background: none !important; border: none !important;' +  
                'color: rgba(255,255,255,0.6) !important; padding: 10px !important;' +  
                'display: flex; justify-content: center; align-items: center;' +  
                'transition: transform 0.2s, color 0.2s;' +  
            '}' +  
            '.applecation .full-start__button.focus {' +  
                'transform: scale(1.3);' +  
                'color: #fff !important;' +  
                'background: none !important;' +  
                'filter: drop-shadow(0 0 8px rgba(255,255,255,0.9)) !important;' +  
            '}' +  
            '.button--play.focus {' +  
                'background: #e0e0e0 !important;' +  
                'transform: scale(1.05);' +  
                'filter: none !important;' +  
            '}' +  
            '@keyframes appleKenBurns { 0% { transform: scale(1); } 100% { transform: scale(1.12); } }' +  
            'body.applecation--zoom-enabled .full-start__background.loaded { animation: appleKenBurns 40s ease-out forwards !important; }' +  
        '</style>';    
          
        document.body.appendChild(styles);    
    }  
  
    function loadLogo(event) {    
        var data = event.data.movie, render = event.object.activity.render();    
        if (!data) return;  
  
        var year = (data.release_date || data.first_air_date || '').split('-')[0];  
        var genres = data.genres ? data.genres.slice(0, 2).map(function(g) { return g.name; }).join(' · ') : '';  
        var runtime = data.runtime ? Math.floor(data.runtime / 60) + 'г ' + (data.runtime % 60) + 'хв' : '';  
        render.find('.applecation__line-meta').text(year + '  ·  ' + genres + '  ·  ' + runtime);  
        render.find('.applecation__description').text(data.overview);  
  
        if (Lampa.Storage.get('applecation_show_studio')) {  
            var studios = (data.networks || data.production_companies || []).filter(function(s) { return s.logo_path; }).slice(0, 2);  
            render.find('.applecation__studios').html(studios.map(function(s) {   
                return '<img src="' + Lampa.TMDB.image('/t/p/w200' + s.logo_path) + '">';   
            }).join(''));  
        }  
  
        $.get(Lampa.TMDB.api((data.name ? 'tv' : 'movie') + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key()), function (d) {  
            var best = d.logos.find(function(l) { return l.iso_639_1 === 'uk'; }) ||   
                       d.logos.find(function(l) { return l.iso_639_1 === 'en'; }) ||   
                       d.logos[0];  
            if (best) render.find('.applecation__logo').html('<img src="' + Lampa.TMDB.image('/t/p/w500' + best.file_path) + '">');  
            else render.find('.full-start-new__title').show();  
        });  
    }  
  
    function attachLogoLoader() {    
        Lampa.Listener.follow('full', function (e) {   
            if (e.type === 'complite') setTimeout(function() { loadLogo(e); }, 10);   
        });    
    }  
  
    // Перевіряємо версію Lampa та ініціалізуємо плагін  
    if (typeof Lampa !== 'undefined' && Lampa.Manifest && Lampa.Manifest.app_digital >= 300) {  
        if (window.appready) initializePlugin();    
        else Lampa.Listener.follow('app', function (e) {   
            if (e.type === 'ready') initializePlugin();   
        });    
    } else {  
        console.warn('NewCard: Lampa не знайдено або версія несумісна');  
    }  
})();
