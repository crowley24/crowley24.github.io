(function () {
    'use strict';
    if (window.lampa_netflix_hero) return;
    window.lampa_netflix_hero = true;

    var VERSION = '1.0.0';
    var SETTING = 'netflix_hero_enabled';
    var HERO_COMPONENTS = ['main', 'category'];
    var SHARP_DELAY = 1000;
    var logos = {};
    var focusTimer = null;

    function enabled() {
        return Lampa.Storage.get(SETTING, true) === true || Lampa.Storage.get(SETTING, true) === 'true';
    }

    // ---------- Стилі Netflix та Банера ----------
    var CSS = [
        'body.netflix-hero{--n-bg:#0b0c10;--n-tint:rgba(11,12,16,.55);--n-head:rgba(11,12,16,.92);--n-accent:#e50914;--n-text:#f5f5f1;--n-dim:#a3a3a3;--n-radius:14px;--n-scale:1.07;--n-focus:0 0 0 3px var(--n-accent),0 14px 34px rgba(0,0,0,.6);--n-hero-h:50vh;--n-hero-pad:42vh}',
        'body.netflix-hero{background:var(--n-bg)}',
        'body.netflix-hero .background::after{content:"";position:fixed;inset:0;background:var(--n-tint);pointer-events:none}',
        'body.netflix-hero .head__body{background:var(--n-head)}',
        // Постери
        'body.netflix-hero .card__view{border-radius:var(--n-radius);overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.45);transition:transform .2s ease,box-shadow .2s ease}',
        'body.netflix-hero .card__img{border-radius:var(--n-radius)}',
        'body.netflix-hero .card.focus .card__view{transform:scale(var(--n-scale));box-shadow:var(--n-focus)}',
        'body.netflix-hero .card.focus .card__view::after{display:none}',
        'body.netflix-hero .card__title{color:var(--n-dim);font-size:1.05em}',
        'body.netflix-hero .card.focus .card__title{color:var(--n-text)}',
        'body.netflix-hero .card__vote{border-radius:8px;font-weight:700}',
        // Заголовки рядків
        'body.netflix-hero .items-line__title{font-size:1.4em;font-weight:900;color:var(--n-text)}',
        // Hero-блок над рядами
        'body.netflix-hero .n-host{position:relative}',
        'body.netflix-hero .n-host .activity__body{padding-top:var(--n-hero-pad);box-sizing:border-box}',
        '.n-hero{position:absolute;left:0;right:0;top:0;height:var(--n-hero-h);overflow:hidden;pointer-events:none;z-index:0;-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%);mask-image:linear-gradient(180deg,#000 55%,transparent 100%)}',
        '.n-hero__bg{position:absolute;inset:0;background-size:cover;background-position:center 20%;opacity:0;transition:opacity .5s ease}',
        '.n-hero__bg.show{opacity:1}',
        '.n-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.6) 35%,rgba(0,0,0,0) 70%)}',
        '.n-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:1}',
        '.n-hero__logo{max-width:100%;max-height:7em;display:none;margin-bottom:.6em;filter:brightness(0) invert(1) drop-shadow(0 4px 12px rgba(0,0,0,.6))}',
        '.n-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:var(--n-text);margin-bottom:.35em;text-shadow:0 3px 14px rgba(0,0,0,.7)}',
        '.n-hero__meta{font-size:1.15em;color:var(--n-text);margin-bottom:.6em;display:flex;gap:.8em;align-items:center;flex-wrap:wrap}',
        '.n-hero__rate{padding:.1em .5em;border-radius:6px;font-weight:800;background:#1db954;color:#fff}',
        '.n-hero__descr{font-size:1.1em;line-height:1.45;color:var(--n-text);opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'
    ].join('\n');

    function injectStyle() {
        if (document.getElementById('netflix-hero-style')) return;
        var style = document.createElement('style');
        style.id = 'netflix-hero-style';
        style.textContent = CSS;
        document.head.appendChild(style);
    }

    // ---------- Допоміжні функції ----------
    function mediaType(data) {
        if (data.media_type) return data.media_type;
        return data.name && !data.title ? 'tv' : 'movie';
    }

    function year(data) {
        return ((data.release_date || data.first_air_date || '') + '').slice(0, 4);
    }

    function genreNames(data) {
        try {
            var names = Lampa.Api.sources.tmdb.getGenresNameFromIds(mediaType(data), data.genre_ids || []);
            return names.slice(0, 3).join(' · ');
        } catch (e) {
            return '';
        }
    }

    // Завантаження логотипу (українська -> англійська -> будь-яка)
    function loadLogo(data, done) {
        if (!data.id || (data.source && data.source !== 'tmdb')) return done('');
        var key = mediaType(data) + '_' + data.id;
        if (logos.hasOwnProperty(key)) return done(logos[key]);

        var lang = (Lampa.Storage.get('language', 'ru') + '').slice(0, 2);
        var url = Lampa.TMDB.api(mediaType(data) + '/' + data.id + '/images?api_key=' + Lampa.TMDB.key() + '&include_image_language=' + lang + ',en,null');
        var network = new Lampa.Reguest();

        network.silent(url, function (json) {
            var list = (json && json.logos) || [];
            var pick = null;
            [lang, 'en', null].some(function (l) {
                pick = list.filter(function (x) { return x.iso_639_1 === l; })[0];
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

    // ---------- Логіка Hero-блоку ----------
    function heroFor(activity) {
        var hero = activity.querySelector('.n-hero');
        if (hero) return hero;
        hero = document.createElement('div');
        hero.className = 'n-hero';
        hero.innerHTML = '<div class="n-hero__bg"></div>' +
            '<div class="n-hero__info">' +
            '<img class="n-hero__logo">' +
            '<div class="n-hero__title"></div>' +
            '<div class="n-hero__meta"></div>' +
            '<div class="n-hero__descr"></div>' +
            '</div>';
        activity.insertBefore(hero, activity.firstChild);
        activity.classList.add('n-host');
        return hero;
    }

    function showHero(hero, data) {
        var title = data.title || data.name || '';
        var bg = hero.querySelector('.n-hero__bg');
        var logo = hero.querySelector('.n-hero__logo');
        var titleEl = hero.querySelector('.n-hero__title');
        hero.nId = data.id;
        titleEl.textContent = title;
        titleEl.style.display = '';
        logo.style.display = 'none';

        var meta = [];
        var vote = parseFloat(data.vote_average);
        if (vote) meta.push('<span class="n-hero__rate">' + vote.toFixed(1) + '</span>');
        if (year(data)) meta.push('<span>' + year(data) + '</span>');
        meta.push('<span>' + (mediaType(data) === 'tv' ? 'Серіал' : 'Фільм') + '</span>');
        
        var genres = genreNames(data);
        if (genres) meta.push('<span>' + genres + '</span>');

        hero.querySelector('.n-hero__meta').innerHTML = meta.join('');
        hero.querySelector('.n-hero__descr').textContent = data.overview || '';
        
        bg.classList.remove('show');
        clearTimeout(hero.nSharp);

        if (data.backdrop_path) {
            var img = new Image();
            img.onload = function () {
                if (hero.nId !== data.id) return;
                bg.style.backgroundImage = 'url(' + img.src + ')';
                bg.classList.add('show');
                
                hero.nSharp = setTimeout(function () {
                    var full = new Image();
                    full.onload = function () {
                        if (hero.nId === data.id) bg.style.backgroundImage = 'url(' + full.src + ')';
                    };
                    full.src = Lampa.Api.img(data.backdrop_path, 'original');
                }, SHARP_DELAY);
            };
            img.src = Lampa.Api.img(data.backdrop_path, 'w1280');
        }

        loadLogo(data, function (src) {
            if (!src || hero.nId !== data.id) return;
            logo.onload = function () {
                if (hero.nId !== data.id) return;
                logo.style.display = 'block';
                titleEl.style.display = 'none';
            };
            logo.src = src;
        });
    }

    function onCardFocus(e) {
        if (!document.body.classList.contains('netflix-hero')) return;
        var card = e.target;
        if (!card || !card.classList || !card.classList.contains('card') || !card.card_data) return;

        var activity = card.closest ? card.closest('.activity') : null;
        if (!activity || !activity.classList.contains('n-host')) return;

        clearTimeout(focusTimer);
        focusTimer = setTimeout(function () {
            showHero(heroFor(activity), card.card_data);
        }, 150);
    }

    function attach(object) {
        if (!enabled() || !object || HERO_COMPONENTS.indexOf(object.component) < 0) return;
        var render = object.activity && object.activity.render && object.activity.render(true);
        var el = render && render.jquery ? render[0] : render;
        if (el && el.classList) heroFor(el);
    }

    function onActivity(e) {
        if (e.type === 'start') attach(e.object);
    }

    // ---------- Налаштування та ініціалізація ----------
    function apply() {
        var on = enabled();
        document.body.classList.toggle('netflix-hero', on);
    }

    function addSetting() {
        if (!Lampa.SettingsApi) return;
        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: {
                name: SETTING,
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Netflix Hero & Theme',
                description: 'Темна тема Netflix та інформаційний банер над рядами на головному екрані.'
            },
            onChange: apply
        });
    }

    function init() {
        injectStyle();
        addSetting();
        apply();
        document.addEventListener('hover:focus', onCardFocus, true);
        Lampa.Listener.follow('activity', onActivity);
        
        if (Lampa.Activity && Lampa.Activity.active) attach(Lampa.Activity.active());
        
        Lampa.Storage.listener.follow('change', function (e) {
            if (e.name === SETTING) apply();
        });
    }

    if (window.appready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

    window.lampa_netflix_hero_api = { version: VERSION };
})();
