(function () {
    'use strict';
    if (window.lampa_pure_hero) return;
    window.lampa_pure_hero = true;

    var VERSION = '1.2.0';
    var SETTING = 'pure_hero_enabled';
    var HERO_COMPONENTS = ['main', 'category'];
    var logos = {};
    var focusTimer = null;
    var currentHeroDataId = null;

    function enabled() {
        return Lampa.Storage.get(SETTING, true) === true || Lampa.Storage.get(SETTING, true) === 'true';
    }

    // ---------- Стилі: fixed позиція на самий верх екрана + пріоритет шапки ----------
    var CSS = [
        // Роббимо банер фіксованим на весь верх екрана, ігноруючи відступи активності
        '.p-hero{position:fixed;left:0;right:0;top:0;height:50vh;overflow:hidden;pointer-events:none;z-index:0;-webkit-mask-image:linear-gradient(180deg,#000 65%,transparent 100%);mask-image:linear-gradient(180deg,#000 65%,transparent 100%)}',
        '.p-hero__bg{position:absolute;inset:0;background-size:cover;background-position:center 20%;opacity:0;transition:opacity .3s ease}',
        '.p-hero__bg.show{opacity:1}',
        '.p-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.6) 35%,rgba(0,0,0,0) 70%), linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 35%)}',
        '.p-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:1}',
        '.p-hero__logo{max-width:100%;max-height:7em;display:none;margin-bottom:.6em;filter:brightness(0) invert(1) drop-shadow(0 4px 12px rgba(0,0,0,.6))}',
        '.p-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:#f5f5f1;margin-bottom:.35em;text-shadow:0 3px 14px rgba(0,0,0,.7)}',
        '.p-hero__meta{font-size:1.15em;color:#f5f5f1;margin-bottom:.6em;display:flex;gap:.8em;align-items:center;flex-wrap:wrap}',
        '.p-hero__rate{padding:.1em .5em;border-radius:6px;font-weight:800;background:#1db954;color:#fff}',
        '.p-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
        // Зсуваємо контент сторінки вниз, щоб він не ховався під фіксованим банером
        'body.pure-hero-active .activity__body{padding-top:42vh !important;box-sizing:border-box}',
        // Гарантуємо, що верхня панель Lampa завжди поверх банера і клікабельна
        '.head{z-index:100 !important}'
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

    // Створюємо єдиний глобальний банер у вікні
    function getGlobalHero() {
        var hero = document.getElementById('p-global-hero');
        if (!hero) {
            hero = document.createElement('div');
            hero.id = 'p-global-hero';
            hero.className = 'p-hero';
            hero.innerHTML = '<div class="p-hero__bg"></div>' +
                '<div class="p-hero__info">' +
                '<img class="p-hero__logo">' +
                '<div class="p-hero__title"></div>' +
                '<div class="p-hero__meta"></div>' +
                '<div class="p-hero__descr"></div>' +
                '</div>';
            document.body.appendChild(hero);
        }
        return hero;
    }

    function showHero(data) {
        if (!enabled()) return;
        var hero = getGlobalHero();
        var title = data.title || data.name || '';
        var bg = hero.querySelector('.p-hero__bg');
        var logo = hero.querySelector('.p-hero__logo');
        var titleEl = hero.querySelector('.p-hero__title');
        
        currentHeroDataId = data.id;
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

        if (data.backdrop_path) {
            var img = new Image();
            img.onload = function () {
                if (currentHeroDataId !== data.id) return;
                bg.style.backgroundImage = 'url(' + img.src + ')';
                bg.classList.add('show');
            };
            img.src = Lampa.Api.img(data.backdrop_path, 'w1280');
        }

        loadLogo(data, function (src) {
            if (!src || currentHeroDataId !== data.id) return;
            logo.onload = function () {
                if (currentHeroDataId !== data.id) return;
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

        // Перевіряємо, чи ми на головному екрані або в категорії
        var activeComp = Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active().component : '';
        if (HERO_COMPONENTS.indexOf(activeComp) < 0) return;

        // Збільшуємо debounce до 400мс: під час швидкого скролу код взагалі не виконується
        clearTimeout(focusTimer);
        focusTimer = setTimeout(function () {
            showHero(card.card_data);
        }, 400);
    }

    function checkActivity(object) {
        var on = enabled() && object && HERO_COMPONENTS.indexOf(object.component) >= 0;
        document.body.classList.toggle('pure-hero-active', on);
        var hero = document.getElementById('p-global-hero');
        if (hero) {
            hero.style.display = on ? 'block' : 'none';
        }
    }

    function onActivity(e) {
        if (e.type === 'start') checkActivity(e.object);
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
            onChange: function (value) {
                if (Lampa.Activity && Lampa.Activity.active) {
                    checkActivity(Lampa.Activity.active());
                }
            }
        });
    }

    function init() {
        injectStyle();
        addSetting();
        getGlobalHero();
        
        document.addEventListener('hover:focus', onCardFocus, true);
        Lampa.Listener.follow('activity', onActivity);
        
        if (Lampa.Activity && Lampa.Activity.active) {
            checkActivity(Lampa.Activity.active());
        }
    }

    if (window.appready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

    window.lampa_pure_hero_api = { version: VERSION };
})();
