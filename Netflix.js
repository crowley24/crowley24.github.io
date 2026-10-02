(function () {
    'use strict';
    if (window.lampa_pure_hero) return;
    window.lampa_pure_hero = true;

    var VERSION = '1.1.0';
    var SETTING = 'pure_hero_enabled';
    var HERO_COMPONENTS = ['main', 'category'];
    var logos = {};
    var focusTimer = null;

    function enabled() {
        return Lampa.Storage.get(SETTING, true) === true || Lampa.Storage.get(SETTING, true) === 'true';
    }

    // ---------- Стилі з виправленням позиції до самого верху та оптимізацією ----------
    var CSS = [
        // Піднімаємо банер на самий верх екрана, під шапку
        '.pure-hero-host{position:relative}',
        '.pure-hero-host .activity__body{padding-top:42vh;box-sizing:border-box}',
        '.p-hero{position:absolute;left:0;right:0;top:0;height:50vh;overflow:hidden;pointer-events:none;z-index:0;-webkit-mask-image:linear-gradient(180deg,#000 65%,transparent 100%);mask-image:linear-gradient(180deg,#000 65%,transparent 100%)}',
        '.p-hero__bg{position:absolute;inset:0;background-size:cover;background-position:center 20%;opacity:0;transition:opacity .3s ease}', // Швидший плавний перехід без навантаження
        '.p-hero__bg.show{opacity:1}',
        '.p-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.6) 35%,rgba(0,0,0,0) 70%), linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 30%)}',
        '.p-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:1}',
        '.p-hero__logo{max-width:100%;max-height:7em;display:none;margin-bottom:.6em;filter:brightness(0) invert(1) drop-shadow(0 4px 12px rgba(0,0,0,.6))}',
        '.p-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:#f5f5f1;margin-bottom:.35em;text-shadow:0 3px 14px rgba(0,0,0,.7)}',
        '.p-hero__meta{font-size:1.15em;color:#f5f5f1;margin-bottom:.6em;display:flex;gap:.8em;align-items:center;flex-wrap:wrap}',
        '.p-hero__rate{padding:.1em .5em;border-radius:6px;font-weight:800;background:#1db954;color:#fff}',
        '.p-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'
    ].join('\n');

    function injectStyle() {
        if (document.getElementById('pure-hero-style')) return;
        var style = document.createElement('style');
        style.id = 'pure-hero-style';
        style.textContent = CSS;
        document.head.appendChild(style);
    }

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

    function heroFor(activity) {
        if (!enabled()) return null;
        var hero = activity.querySelector('.p-hero');
        if (hero) return hero;
        hero = document.createElement('div');
        hero.className = 'p-hero';
        hero.innerHTML = '<div class="p-hero__bg"></div>' +
            '<div class="p-hero__info">' +
            '<img class="p-hero__logo">' +
            '<div class="p-hero__title"></div>' +
            '<div class="p-hero__meta"></div>' +
            '<div class="p-hero__descr"></div>' +
            '</div>';
        activity.insertBefore(hero, activity.firstChild);
        activity.classList.add('pure-hero-host');
        return hero;
    }

    function showHero(hero, data) {
        var title = data.title || data.name || '';
        var bg = hero.querySelector('.p-hero__bg');
        var logo = hero.querySelector('.p-hero__logo');
        var titleEl = hero.querySelector('.p-hero__title');
        hero.pId = data.id;
        titleEl.textContent = title;
        titleEl.style.display = '';
        logo.style.display = 'none';

        var meta = [];
        var vote = parseFloat(data.vote_average);
        if (vote) meta.push('<span class="p-hero__rate">' + vote.toFixed(1) + '</span>');
        if (year(data)) meta.push('<span>' + year(data) + '</span>');
        meta.push('<span>' + (mediaType(data) === 'tv' ? 'Серіал' : 'Фільм') + '</span>');
        
        var genres = genreNames(data);
        if (genres) meta.push('<span>' + genres + '</span>');

        hero.querySelector('.p-hero__meta').innerHTML = meta.join('');
        hero.querySelector('.p-hero__descr').textContent = data.overview || '';
        
        bg.classList.remove('show');

        // Оптимізація: використовуємо лише w1280 без додаткового завантаження original, що усуває фрізи
        if (data.backdrop_path) {
            var img = new Image();
            img.onload = function () {
                if (hero.pId !== data.id) return;
                bg.style.backgroundImage = 'url(' + img.src + ')';
                bg.classList.add('show');
            };
            img.src = Lampa.Api.img(data.backdrop_path, 'w1280');
        }

        loadLogo(data, function (src) {
            if (!src || hero.pId !== data.id) return;
            logo.onload = function () {
                if (hero.pId !== data.id) return;
                logo.style.display = 'block';
                titleEl.style.display = 'none';
            };
            logo.src = src;
        });
    }

    function onCardFocus(e) {
        if (!enabled()) return;
        var card = e.target;
        if (!card || !card.classList || !card.classList.contains('card') || !card.card_data) return;

        var activity = card.closest ? card.closest('.activity') : null;
        if (!activity) return;

        var hero = heroFor(activity);
        if (!hero) return;

        // Збільшено затримку до 250мс, щоб при швидкому гортанні стрічки не вирубувати інтерфейс запитами
        clearTimeout(focusTimer);
        focusTimer = setTimeout(function () {
            showHero(hero, card.card_data);
        }, 250);
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
                name: 'Банер над рядами (Hero)',
                description: 'Показувати інформаційний банер з фоном та логотипом нагорі.'
            },
            onChange: function () {}
        });
    }

    function init() {
        injectStyle();
        addSetting();
        document.addEventListener('hover:focus', onCardFocus, true);
        Lampa.Listener.follow('activity', onActivity);
        
        if (Lampa.Activity && Lampa.Activity.active) attach(Lampa.Activity.active());
    }

    if (window.appready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

    window.lampa_pure_hero_api = { version: VERSION };
})();
