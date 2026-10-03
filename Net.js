(function () {
    'use strict';

    if (window.banner_hero_plugin) return;
    window.banner_hero_plugin = true;

    var VERSION = '1.2.0';
    var SETTING = 'banner_hero_enabled';
    var SIZE_SETTING = 'interface_size';
    var logos = {};
    var focusTimer = null;
    var lastCardId = null;

    var lang_data = {
        banner_settings_name: 'Інтерфейс +',
        banner_enable_name: 'Динамічні банери',
        banner_enable_descr: 'Показувати великий банер з фоном і логотипом над рядами карток',
        settings_param_interface_size_mini: 'Міні інтерфейс',  
        settings_param_interface_size_very_small: 'Дуже малий інтерфейс',  
        settings_param_interface_size_small: 'Малий інтерфейс',  
        settings_param_interface_size_medium: 'Середній інтерфейс'
    };

    // --- Преміальні CSS стилі з GPU-прискоренням ---
    var CSS = [
        '.banner-host{position:relative}',
        '.banner-host .activity__body{padding-top:42vh;box-sizing:border-box}',
        '.banner-hero{position:absolute;left:0;right:0;top:0;height:50vh;overflow:hidden;pointer-events:none;z-index:0;will-change:opacity;-webkit-mask-image:linear-gradient(180deg,#000 60%,transparent 100%);mask-image:linear-gradient(180deg,#000 60%,transparent 100%)}',
        
        /* Ефект плавності та кінематографічного зуму фону */
        '.banner-hero__bg{position:absolute;inset:-20px;background-size:cover;background-position:center 25%;opacity:0;transform:scale(1.05);transition:opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);will-change:opacity, transform}',
        '.banner-hero__bg.show{opacity:1;transform:scale(1)}',
        
        '.banner-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,12,16,.95) 0%,rgba(11,12,16,.75) 35%,rgba(11,12,16,0) 75%), linear-gradient(180deg,rgba(11,12,16,.2) 0%,rgba(11,12,16,.95) 100%)}',
        '.banner-hero__info{position:absolute;left:3.5em;bottom:5em;width:48%;z-index:1;will-change:transform, opacity;transition:transform 0.3s ease, opacity 0.3s ease}',
        '.banner-hero__logo{max-width:100%;max-height:6.5em;display:none;margin-bottom:.6em;filter:brightness(0) invert(1) drop-shadow(0 6px 16px rgba(0,0,0,.7))}',
        '.banner-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:#f5f5f1;margin-bottom:.35em;text-shadow:0 4px 16px rgba(0,0,0,.8)}',
        '.banner-hero__meta{font-size:1.15em;color:#f5f5f1;margin-bottom:.6em;display:flex;gap:.8em;align-items:center;flex-wrap:wrap}',
        '.banner-hero__rate{padding:.15em .6em;border-radius:6px;font-weight:800;background:#1db954;color:#fff;box-shadow:0 2px 8px rgba(29,185,84,.4)}',
        '.banner-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
        'body.banner-enabled .background::after{content:"";position:fixed;inset:0;background:rgba(11,12,16,.5);pointer-events:none;z-index:-1}'
    ].join('\n');

    function injectStyle() {
        if (document.getElementById('banner-hero-style')) return;
        var style = document.createElement('style');
        style.id = 'banner-hero-style';
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    function isEnabled() {
        var val = Lampa.Storage.get(SETTING, true);
        return val === true || val === 'true';
    }

    var updateSize = function () {
        var isMobile = Lampa.Platform && Lampa.Platform.screen && Lampa.Platform.screen('mobile');
        var iSize = isMobile ? 10.1 : parseFloat(Lampa.Storage.field(SIZE_SETTING)) || 10.6;
        
        $('body').css({ fontSize: iSize + 'px' });  
      
        var cardCount = 6;
        if (iSize <= 9.6) cardCount = 8;
        else if (iSize <= 11.1) cardCount = 7;

        if (Lampa.Maker && Lampa.Maker.map) {
            ['Line', 'Category'].forEach(function (type) {
                var mapItem = Lampa.Maker.map(type);
                if (mapItem && mapItem.Items && mapItem.Items.onInit) {
                    var original = mapItem.Items.onInit;
                    mapItem.Items.onInit = function () {
                        original.call(this);
                        if (type === 'Line') this.view = cardCount;
                        else this.limit_view = cardCount;
                    };
                }
            });
        }
    };

    function loadLogo(data, done) {
        if (!data.id || (data.source && data.source !== 'tmdb')) return done('');
        var type = data.name && !data.title ? 'tv' : 'movie';
        var key = type + '_' + data.id;
        
        if (logos.hasOwnProperty(key)) return done(logos[key]);

        var url = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&include_image_language=uk,en,null');
        var network = new Lampa.Reguest();
        
        network.silent(url, function (json) {
            var list = (json && json.logos) || [];
            var pick = null;
            
            ['uk', 'en', null].some(function (lang) {
                pick = list.filter(function (x) { return x.iso_639_1 === lang; })[0];
                return !!pick;
            });
            
            pick = pick || list[0];
            logos[key] = pick ? Lampa.TMDB.image('t/p/w500' + pick.file_path.replace('.svg', '.png')) : '';
            done(logos[key]);
        }, function () {
            logos[key] = '';
            done('');
        });
    }

    function heroFor(activity) {
        var hero = activity.querySelector('.banner-hero');
        if (hero) return hero;
        
        hero = document.createElement('div');
        hero.className = 'banner-hero';
        hero.innerHTML = 
            '<div class="banner-hero__bg"></div>' +
            '<div class="banner-hero__info">' +
                '<img class="banner-hero__logo">' +
                '<div class="banner-hero__title"></div>' +
                '<div class="banner-hero__meta"></div>' +
                '<div class="banner-hero__descr"></div>' +
            '</div>';
            
        activity.insertBefore(hero, activity.firstChild);
        activity.classList.add('banner-host');
        return hero;
    }

    function showHero(hero, data) {
        var title = data.title || data.name || '';
        var bg = hero.querySelector('.banner-hero__bg');
        var logo = hero.querySelector('.banner-hero__logo');
        var titleEl = hero.querySelector('.banner-hero__title');
        
        hero.bannerId = data.id;
        titleEl.textContent = title;
        titleEl.style.display = '';
        logo.style.display = 'none';

        var meta = [];
        var vote = parseFloat(data.vote_average);
        if (vote) meta.push('<span class="banner-hero__rate">' + vote.toFixed(1) + '</span>');
        
        var year = ((data.release_date || data.first_air_date || '') + '').slice(0, 4);
        if (year) meta.push('<span>' + year + '</span>');
        
        meta.push('<span>' + (data.name && !data.title ? 'Серіал' : 'Фільм') + '</span>');
        
        hero.querySelector('.banner-hero__meta').innerHTML = meta.join('');
        hero.querySelector('.banner-hero__descr').textContent = data.overview || '';
        
        bg.classList.remove('show');
        if (data.backdrop_path) {
            var img = new Image();
            img.onload = function () {
                if (hero.bannerId !== data.id) return;
                bg.style.backgroundImage = 'url(' + img.src + ')';
                // Невелика затримка для плавного старту анімації зуму/opacity
                requestAnimationFrame(function() {
                    bg.classList.add('show');
                });
            };
            img.src = Lampa.Api.img(data.backdrop_path, 'w1280');
        }

        loadLogo(data, function (src) {
            if (!src || hero.bannerId !== data.id) return;
            logo.onload = function () {
                if (hero.bannerId !== data.id) return;
                logo.style.display = 'block';
                titleEl.style.display = 'none';
            };
            logo.src = src;
        });
    }

    function onCardFocus(e) {
        if (!isEnabled()) return;
        var card = e.target;
        if (!card || !card.classList || !card.classList.contains('card') || !card.card_data) return;

        if (lastCardId === card.card_data.id) return;

        var activity = card.closest ? card.closest('.activity') : null;
        if (!activity || !activity.classList.contains('banner-host')) return;

        clearTimeout(focusTimer);
        // Зменшено затримку до 70мс для миттєвого, але плавного відгуку
        focusTimer = setTimeout(function () {
            lastCardId = card.card_data.id;
            showHero(heroFor(activity), card.card_data);
        }, 70);
    }

    function attach(object) {
        if (!isEnabled() || !object || ['main', 'category'].indexOf(object.component) < 0) return;
        var render = object.activity && object.activity.render && object.activity.render(true);
        var el = render && render.jquery ? render[0] : render;
        if (el && el.classList) heroFor(el);
    }

    function apply() {
        var on = isEnabled();
        document.body.classList.toggle('banner-enabled', on);
    }

    function init() {
        if (window.Lampa && Lampa.Lang) {
            Lampa.Lang.add(lang_data);
        }

        if (Lampa.Params) {
            if (!Lampa.Params.values) Lampa.Params.values = {};
            Lampa.Params.values[SIZE_SETTING] = {  
                '09.1': lang_data.settings_param_interface_size_mini,        
                '09.6': lang_data.settings_param_interface_size_very_small, 
                '10.1': lang_data.settings_param_interface_size_small,       
                '10.6': lang_data.settings_param_interface_size_medium    
            };
            
            if (Lampa.Params.select) {
                Lampa.Params.select(SIZE_SETTING, Lampa.Params.values[SIZE_SETTING], '10.6');  
            }
        }

        injectStyle();
        apply();
        updateSize();
        
        document.addEventListener('hover:focus', onCardFocus, true);
        
        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start') attach(e.object);
        });

        if (Lampa.Activity && Lampa.Activity.active) {
            attach(Lampa.Activity.active());
        }

        if (Lampa.SettingsApi) {
            Lampa.SettingsApi.addComponent({
                component: 'interface_plus_settings',
                name: lang_data.banner_settings_name,
                icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 5h2v5h-2z"/></svg>'
            });

            Lampa.SettingsApi.addParam({
                component: 'interface_plus_settings',
                param: { name: SETTING, type: 'trigger', default: default = true },
                field: { 
                    name: lang_data.banner_enable_name, 
                    description: lang_data.banner_enable_descr 
                },
                onChange: apply
            });

            Lampa.SettingsApi.addParam({
                component: 'interface_plus_settings',
                param: { name: SIZE_SETTING, type: 'select', values: Lampa.Params.values[SIZE_SETTING], default: '10.6' },
                field: {
                    name: 'Розмір інтерфейсу',
                    description: 'Виберіть бажаний масштаб елементів інтерфейсу'
                },
                onChange: updateSize
            });
        }
    }

    if (window.appready) {
        setTimeout(init, 500);
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') setTimeout(init, 500);
        });
    }

    if (window.Lampa && Lampa.Storage && Lampa.Storage.listener) {
        Lampa.Storage.listener.follow('change', function (e) {  
            if (e.name === SIZE_SETTING) updateSize();  
        });
    }
})();
