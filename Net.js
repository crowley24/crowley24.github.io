(function () {
    'use strict';

    if (window.banner_hero_plugin) return;
    window.banner_hero_plugin = true;

    var VERSION = '1.0.0';
    var SETTING = 'banner_hero_enabled';
    var logos = {};
    var focusTimer = null;

    // --- CSS Стилі для банера ---
    var CSS = [
        '.banner-host{position:relative}',
        '.banner-host .activity__body{padding-top:42vh;box-sizing:border-box}',
        '.banner-hero{position:absolute;left:0;right:0;top:0;height:50vh;overflow:hidden;pointer-events:none;z-index:0;-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%);mask-image:linear-gradient(180deg,#000 55%,transparent 100%)}',
        '.banner-hero__bg{position:absolute;inset:0;background-size:cover;background-position:center 20%;opacity:0;transition:opacity .5s ease}',
        '.banner-hero__bg.show{opacity:1}',
        '.banner-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.6) 35%,rgba(0,0,0,0) 70%)}',
        '.banner-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:1}',
        '.banner-hero__logo{max-width:100%;max-height:7em;display:none;margin-bottom:.6em;filter:brightness(0) invert(1) drop-shadow(0 4px 12px rgba(0,0,0,.6))}',
        '.banner-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:#f5f5f1;margin-bottom:.35em;text-shadow:0 3px 14px rgba(0,0,0,.7)}',
        '.banner-hero__meta{font-size:1.15em;color:#f5f5f1;margin-bottom:.6em;display:flex;gap:.8em;align-items:center;flex-wrap:wrap}',
        '.banner-hero__rate{padding:.1em .5em;border-radius:6px;font-weight:800;background:#1db954;color:#fff}',
        '.banner-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
        'body.banner-enabled .background::after{content:"";position:fixed;inset:0;background:rgba(11,12,16,.55);pointer-events:none}'
    ].join('\n');

    function injectStyle() {
        if (document.getElementById('banner-hero-style')) return;
        var style = document.createElement('style');
        style.id = 'banner-hero-style';
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    function isEnabled() {
        return Lampa.Storage.get(SETTING, true) === true || Lampa.Storage.get(SETTING, true) === 'true';
    }

    // --- Завантаження логотипа (Українська -> Англійська) ---
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
            
            // Пріоритет: спочатку українська (uk), якщо немає — англійська (en)
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

    // --- Створення блоку банера в DOM ---
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

    // --- Відображення даних фільму у банері ---
    function showHero(hero, data) {
        var title = data.title || data.name || '';
        var bg = hero.querySelector('.banner-hero__bg');
        var logo = hero.querySelector('.banner-hero__logo');
        var titleEl = hero.querySelector('.banner-hero__title');
        
        hero.bannerId = data.id;
        titleEl.textContent = title;
        titleEl.style.display = '';
        logo.style.display = 'none';

        // Формування мета-даних (рейтинг, рік, тип)
        var meta = [];
        var vote = parseFloat(data.vote_average);
        if (vote) meta.push('<span class="banner-hero__rate">' + vote.toFixed(1) + '</span>');
        
        var year = ((data.release_date || data.first_air_date || '') + '').slice(0, 4);
        if (year) meta.push('<span>' + year + '</span>');
        
        meta.push('<span>' + (data.name && !data.title ? 'Серіал' : 'Фільм') + '</span>');
        
        hero.querySelector('.banner-hero__meta').innerHTML = meta.join('');
        hero.querySelector('.banner-hero__descr').textContent = data.overview || '';
        
        // Задній фон (backdrop)
        bg.classList.remove('show');
        if (data.backdrop_path) {
            var img = new Image();
            img.onload = function () {
                if (hero.bannerId !== data.id) return;
                bg.style.backgroundImage = 'url(' + img.src + ')';
                bg.classList.add('show');
            };
            img.src = Lampa.Api.img(data.backdrop_path, 'w1280');
        }

        // Завантаження логотипа
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

    // --- Обробка фокусу на картку ---
    function onCardFocus(e) {
        if (!isEnabled()) return;
        var card = e.target;
        if (!card || !card.classList || !card.classList.contains('card') || !card.card_data) return;

        var activity = card.closest ? card.closest('.activity') : null;
        if (!activity || !activity.classList.contains('banner-host')) return;

        clearTimeout(focusTimer);
        focusTimer = setTimeout(function () {
            showHero(heroFor(activity), card.card_data);
        }, 150);
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

    // --- Ініціалізація плагіна та власного розділу налаштувань ---
    function init() {
        injectStyle();
        apply();
        
        document.addEventListener('hover:focus', onCardFocus, true);
        
        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start') attach(e.object);
        });

        if (Lampa.Activity && Lampa.Activity.active) {
            attach(Lampa.Activity.active());
        }

        // Створення окремого розділу в налаштуваннях Lampa
        if (Lampa.SettingsApi) {
            // Реєстрація нового компонента налаштувань
            Lampa.SettingsApi.addComponent({
                component: 'banner_hero_settings',
                name: 'Банери',
                icon: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 5h2v5h-2z"/></svg>'
            });

            // Додавання параметра утиліти всередину нового розділу
            Lampa.SettingsApi.addParam({
                component: 'banner_hero_settings',
                param: { name: SETTING, type: 'trigger', default: true },
                field: { 
                    name: 'Динамічні банери', 
                    description: 'Показувати великий банер з фоном і логотипом над рядами карток' 
                },
                onChange: apply
            });
        }
    }

    if (window.appready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
