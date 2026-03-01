(function () {    
    'use strict';    
  
    // Перевіряємо наявність залежностей перед ініціалізацією  
    function initializePlugin() {    
        // Перевіряємо наявність Lampa  
        if (typeof Lampa === 'undefined') {  
            console.error('NewCard: Lampa не знайдено');  
            return;  
        }  
          
        // Перевіряємо наявність jQuery  
        if (typeof $ === 'undefined') {  
            console.error('NewCard: jQuery не знайдено');  
            return;  
        }  
          
        // Перевіряємо версію Lampa  
        if (!Lampa.Manifest || Lampa.Manifest.app_digital < 300) {  
            console.warn('NewCard: Потрібна Lampa версії 3.0+');  
            return;  
        }  
          
        // Перевіряємо платформу  
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
  
        Lampa.SettingsApi.addComponent({ component: 'applecation_settings', name: 'NewCard', icon: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="80" height="40" rx="5" fill="hsl(0, 0%, 30%)"/><circle cx="50" cy="50" r="10" fill="white"/></svg>' });    
  
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
        root.style.setProperty('--apple-spacing-scale', parseInt(Lampa.Storage.get('applecation_spacing_scale')) / 100);  
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
                    '<div class="full-start-new__tagline full--tagline applecation__line-meta"></div>' +  
                    '<div class="full-start-new__rate-line">' +  
                        '<div class="full-start__rate rate--tmdb"><div>{rating}</div><div class="source--name">TMDB</div></div>' +  
                        '<div class="full-start__rate rate--imdb hide"><div></div><div>IMDB</div></div>' +  
                        '<div class="full-start__rate rate--kp hide"><div></div><div>KP</div></div>' +  
                        '<div class="full-start__pg hide"></div>' +  
                        '<div class="full-start__status hide"></div>' +  
                    '</div>' +  
                    '<div class="full-start-new__details hide"></div>' +  
                    '<div class="full-start-new__reactions">' +  
                        '<div>#{reactions_none}</div>' +  
                    '</div>' +  
                    '<div class="full-start-new__description applecation__description"></div>' +  
                    '<div class="applecation__studios"></div>' +  
                    '<div class="full-start-new__buttons">' +  
                        '<div class="full-start__button selector button--play">' +  
                            '<svg><use xlink:href="#sprite-play"></use></svg>' +  
                            '<span>#{title_watch}</span>' +  
                        '</div>' +  
                        '<div class="full-start__button selector button--book">' +  
                            '<svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +  
                                '<path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>' +  
                            '</svg>' +  
                            '<span>#{settings_input_links}</span>' +  
                        '</div>' +  
                        '<div class="full-start__button selector button--reaction">' +  
                            '<svg><use xlink:href="#sprite-reaction"></use></svg>' +  
                            '<span>#{title_reactions}</span>' +  
                        '</div>' +  
                        '<div class="full-start__button selector button--subscribe hide">' +  
                            '<svg viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">' +  
                                '<path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"></path>' +  
                                '<path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.6"></path>' +  
                            '</svg>' +  
                            '<span>#{title_subscribe}</span>' +  
                        '</div>' +  
                        '<div class="full-start__button selector button--options">' +  
                            '<svg><use xlink:href="#sprite-dots"></use></svg>' +  
                        '</div>' +  
                    '</div>' +  
                '</div>' +  
            '</div>' +  
            '<div class="hide buttons--container">' +  
                '<div class="full-start__button view--torrent hide">' +  
                    '<svg><use xlink:href="#sprite-torrent"></use></svg>' +  
                    '<span>#{full_torrents}</span>' +  
                '</div>' +  
                '<div class="full-start__button selector view--trailer">' +  
                    '<svg><use xlink:href="#sprite-trailer"></use></svg>' +  
                    '<span>#{full_trailers}</span>' +  
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
            '' +  
            'body.applecation--active {' +  
                'background: #000 !important;' +  
            '}' +  
            '' +  
            '.applecation .full-start__background {' +  
                'display: none !important;' +  
            '}' +  
            '' +  
            '.applecation .full-start-new__right {' +  
                'background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.5) 100%) !important;' +  
                'padding: 2em;' +  
                'margin-top: -15vh;' +  
            '}' +  
            '' +  
            '.applecation__logo {' +  
                'transform: scale(var(--apple-logo-scale));' +  
                'transition: transform 0.3s ease;' +  
            '}' +  
            '' +  
            '.applecation__line-meta {' +  
                'font-size: calc(1.1em * var(--apple-text-scale));' +  
                'color: rgba(255,255,255,0.8);' +  
                'margin-bottom: 1em;' +  
            '}' +  
            '' +  
            '.applecation__description {' +  
                'font-size: calc(0.95em * var(--apple-text-scale));' +  
                'line-height: 1.6;' +  
                'color: rgba(255,255,255,0.7);' +  
                'margin-bottom: 1.5em;' +  
                'max-width: 600px;' +  
            '}' +  
            '' +  
            '.applecation__studios {' +  
                'display: flex;' +  
                'gap: 1em;' +  
                'margin-bottom: 1.5em;' +  
                'min-height: 40px;' +  
            '}' +  
            '' +  
            '.applecation__studios img {' +  
                'height: 40px;' +  
                'object-fit: contain;' +  
                'filter: brightness(0) invert(1);' +  
                'opacity: 0.8;' +  
            '}' +  
            '' +  
            '@keyframes appleKenBurns {' +  
                '0% { transform: scale(1); }' +  
                '100% { transform: scale(1.12); }' +  
            '}' +  
            '' +  
            'body.applecation--zoom-enabled .full-start-new__poster img {' +  
                'animation: appleKenBurns 40s ease-out forwards;' +  
            '}' +  
        '</style>';  
        document.head.appendChild(styles);  
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
  
    // Правильна ініціалізація плагіна  
    if (window.appready) {  
        initializePlugin();  
    } else {  
        Lampa.Listener.follow('app', function (e) {   
            if (e.type === 'ready') initializePlugin();   
        });    
    }  
})();
