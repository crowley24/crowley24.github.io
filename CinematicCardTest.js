(function () {
    'use strict';

    /*
     * TMDB MOVIE LOGOS 1.4.3 — CINEMATIC MODE (OPTIMIZED)
     */

    if (!window.Lampa || !window.$) return;
    if (window.tmdb_movie_logos_v143_ready) return;
    window.tmdb_movie_logos_v143_ready = true;

    var tmdb = Lampa.Api.sources.tmdb;
    if (!tmdb) return;

    var currentCard = null, currentToken = 0;
    var CACHE_TIMEOUT = 20000;
    var CSS_ID = 'tmdb_movie_logos_v143_css';

    var COUNTRIES = {
        US: 'США', GB: 'Велика Британія', UK: 'Велика Британія', FR: 'Франція',
        DE: 'Німеччина', IT: 'Італія', ES: 'Іспанія', PL: 'Польща', UA: 'Україна',
        CA: 'Канада', AU: 'Австралія', NZ: 'Нова Зеландія', JP: 'Японія',
        KR: 'Південна Корея', CN: 'Китай', HK: 'Гонконг', IN: 'Індія',
        RU: 'Росія', TR: 'Туреччина', BR: 'Бразилія', MX: 'Мексика', AR: 'Аргентина',
        SE: 'Швеція', NO: 'Норвегія', DK: 'Данія', FI: 'Фінляндія', NL: 'Нідерланди',
        BE: 'Бельгія', CH: 'Швейцарія', AT: 'Австрія', IE: 'Ірландія',
        CZ: 'Чехія', SK: 'Словаччина', HU: 'Угорщина', RO: 'Румунія',
        BG: 'Болгарія', GR: 'Греція', PT: 'Португалія', IL: 'Ізраїль',
        ZA: 'ПАР', EG: 'Єгипет', TH: 'Таїланд', ID: 'Індонезія', SG: 'Сінгапур',
        MY: 'Малайзія', PH: 'Філіппіни', PK: 'Пакистан', IR: 'Іран',
        AE: 'ОАЕ', SA: 'Саудівська Аравія', CL: 'Чилі', CO: 'Колумбія',
        PE: 'Перу', IS: 'Ісландія', HR: 'Хорватія', RS: 'Сербія',
        SI: 'Словенія', LT: 'Литва', LV: 'Латвія', EE: 'Естонія',
        GE: 'Грузія', AM: 'Вірменія', KZ: 'Казахстан'
    };

    function pickLogo(logos) {
        var order = [Lampa.Storage.field('tmdb_lang'), 'en', null];
        for (var i = 0; i < order.length; i++) {
            var found = logos.filter(l => l.iso_639_1 === order[i])[0];
            if (found) return found;
        }
        return logos[0] || null;
    }

    function cached(item, key, request, cb) {
        if (item[key] !== undefined) return cb(item[key]);
        if (item[key + '_wait']) return item[key + '_wait'].push(cb);

        item[key + '_wait'] = [cb];
        var completed = false;
        var timer = setTimeout(() => finish(null), CACHE_TIMEOUT);

        function finish(val) {
            if (completed) return;
            completed = true;
            clearTimeout(timer);
            item[key] = val || null;
            var list = item[key + '_wait'] || [];
            item[key + '_wait'] = null;
            list.forEach(fn => { try { fn(item[key]); } catch (e) {} });
        }

        try { request(finish); } catch (e) { finish(null); }
    }

    function ensureLogo(item, type, cb) {
        cached(item, 'tml_logo', done => {
            var lang = Lampa.Storage.field('tmdb_lang') || 'en';
            tmdb.get(type + '/' + item.id + '/images', { filter: { include_image_language: lang + ',en,null' } },
                json => {
                    var logo = json?.logos?.length ? pickLogo(json.logos) : null;
                    done(logo ? Lampa.Api.img(logo.file_path, 'w500') : null);
                },
                () => done(null)
            );
        }, cb);
    }

    function findStudioLogo(companies) {
        var studio = (companies || []).filter(c => c?.logo_path?.length)[0];
        return studio ? { url: Lampa.Api.img(studio.logo_path, 'w300'), name: studio.name || '' } : null;
    }

    function ensureStudioLogo(item, type, cb) {
        cached(item, 'tml_studio_logo', done => {
            var existing = findStudioLogo(item.production_companies);
            if (existing) return done(existing);

            tmdb.get(type + '/' + item.id, {},
                json => done(findStudioLogo(json?.production_companies)),
                () => done(null)
            );
        }, cb);
    }

    function getCountryName(code) {
        if (!code) return '';
        code = String(code).toUpperCase();
        if (COUNTRIES[code]) return COUNTRIES[code];
        try {
            if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
                var name = new Intl.DisplayNames(['uk'], { type: 'region' }).of(code);
                if (name && name !== code) return name;
            }
        } catch (e) {}
        return code;
    }

    function getCountries(card) {
        var countries = card.production_countries?.length ? card.production_countries.map(c => c.name || '') :
                        card.origin_country?.length ? card.origin_country.map(getCountryName) : [];
        return countries.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2);
    }

    function buildMetadata(card) {
        var parts = [];
        var year = (card.release_date || card.first_air_date || '').slice(0, 4);
        if (year) parts.push(year);

        var countries = getCountries(card);
        if (countries.length) parts.push(countries.join(', '));

        var rating = Math.min(parseFloat(card.vote_average || 0), 10);
        if (rating > 0) parts.push('★ ' + rating.toFixed(1));

        var genres = (card.genres || []).slice(0, 3).map(g => g.name || '').filter(Boolean);
        if (genres.length) parts.push(genres.join(', '));

        return parts;
    }

    function addCSS() {
        if (document.getElementById(CSS_ID)) return;
        var css = document.createElement('style');
        css.id = CSS_ID;
        css.textContent = `
            .full-start-new{position:relative;}
            .full-start-new__body{position:relative;display:block;min-height:calc(100vh - 7rem);height:auto;}
            .full-start-new__left{display:none !important;}
            .full-start-new__right{position:absolute !important;left:0 !important;bottom:1.5rem !important;width:58% !important;max-width:58% !important;margin:0 !important;padding:0 !important;display:flex;flex-direction:column;align-items:flex-start;box-sizing:border-box;z-index:2;}
            .full-start-new__head{display:none !important;}
            .tml-studio-logo{display:flex;align-items:center;justify-content:flex-start;width:100%;height:1.5em;margin:0 0 .4em 0;opacity:0;transform:translateY(3px);transition:opacity .4s ease,transform .4s ease;}
            .tml-studio-logo.tml-studio-visible{opacity:.92;transform:translateY(0);}
            .tml-studio-logo img{display:block;max-width:8em;max-height:1.3em;object-fit:contain;object-position:left center;border:0;box-shadow:none;filter:none;}
            .full-start-new__title{display:flex;align-items:flex-start;justify-content:flex-start;width:100%;min-height:0;margin:0 0 .45em 0;padding:0;font-size:2.2em;line-height:1.1;}
            .full-start-new__title .tml-logo-image{display:none;max-width:100%;max-height:4.2em;object-fit:contain;object-position:left center;border:0;box-shadow:none;filter:none;}
            .full-start-new__tagline{display:block;width:100%;margin:0 0 .8em 0;font-size:.75em !important;font-weight:400 !important;font-style:italic !important;line-height:1.45 !important;color:rgba(255,255,255,.78) !important;opacity:.9;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;}
            .full-start-new__tagline:empty{display:none !important;}
            .tml-cinematic-meta{display:flex;align-items:center;flex-wrap:nowrap;gap:.55em;width:100%;margin:0 0 .8em 0;white-space:nowrap;font-family:Inter,system-ui,sans-serif;font-size:1.05em;color:rgba(255,255,255,.88);box-sizing:border-box;}
            .tml-cinematic-meta-item{flex:0 0 auto;white-space:nowrap;}
            .tml-cinematic-meta-separator{flex:0 0 auto;opacity:.65;font-size:.9em;}
            .tml-cinematic-meta-item:last-child{overflow:hidden;text-overflow:ellipsis;}
            .full-start-new__rate-line,.full-start-new__details{display:none !important;}
            .tml-cinematic-description{display:-webkit-box;width:100%;margin:0 0 1.1em 0;font-size:1em;line-height:1.45;opacity:.9;-webkit-box-orient:vertical;-webkit-line-clamp:3;}
            .full-start-new__buttons{display:flex;align-items:center;flex-wrap:wrap;gap:.45em;width:100%;margin:0;}
            .full-start-new__reactions{display:none !important;}
            .full-descr,.full-start__description,.full-start__descr,.full-description{display:none !important;}
        `;
        document.head.appendChild(css);
    }

    function getElement(ev, selector) {
        try {
            return ev?.object?.activity?.render()?.find(selector).first() || $();
        } catch (e) {
            return $();
        }
    }

    function processCard(ev) {
        if (!ev || ev.type !== 'complite') return;
        var card = ev.data?.movie;
        if (!card?.id) return;

        var titleBlock = getElement(ev, '.full-start-new__title');
        var root = getElement(ev, '.full-start-new');
        if (!titleBlock.length || !root.length) return;

        var token = ++currentToken;
        var type = card.name ? 'tv' : 'movie';
        currentCard = card;

        // Position elements
        var tagline = root.find('.full-start-new__tagline').first();
        if (tagline.length) tagline.insertAfter(titleBlock);

        // Build Metadata & Description
        var parts = buildMetadata(card);
        var metaRow = root.find('.tml-cinematic-meta').first();
        if (!metaRow.length) {
            metaRow = $('<div class="tml-cinematic-meta"></div>');
            tagline.length ? metaRow.insertAfter(tagline) : metaRow.insertAfter(titleBlock);
        }
        metaRow.empty().toggle(parts.length > 0);
        parts.forEach((part, i) => {
            if (i > 0) metaRow.append('<span class="tml-cinematic-meta-separator">·</span>');
            metaRow.append($('<span class="tml-cinematic-meta-item"></span>').text(part));
        });

        var desc = root.find('.tml-cinematic-description');
        if (!card.overview) desc.remove();
        else {
            if (!desc.length) desc = $('<div class="tml-cinematic-description"></div>').insertAfter(metaRow);
            desc.text(card.overview);
        }

        // Studio Logo
        root.find('.tml-studio-logo').remove();
        ensureStudioLogo(card, type, studio => {
            if (token !== currentToken || currentCard !== card || !studio?.url) return;
            var container = $('<div class="tml-studio-logo"></div>');
            var img = $('<img alt="">').attr('alt', studio.name || '');
            img.on('error', () => container.remove());
            img.on('load', () => {
                if (token === currentToken && currentCard === card) container.addClass('tml-studio-visible');
            });
            container.append(img);
            titleBlock.before(container);
            img.attr('src', studio.url);
        });

        // Movie Logo
        var original = titleBlock.contents().clone(true, true);
        var logo = $('<img class="tml-logo-image" alt="">');
        titleBlock.empty().append(logo);

        ensureLogo(card, type, url => {
            if (token !== currentToken || currentCard !== card) return;
            if (!url) {
                titleBlock.empty().append(original);
                return;
            }
            logo.off('error').on('error', () => {
                if (token === currentToken) titleBlock.empty().append(original);
            }).attr('src', url).show();
        });
    }

    Lampa.Listener.follow('full', ev => {
        if (!ev) return;
        if (ev.type === 'complite') {
            addCSS();
            processCard(ev);
        }
        if (ev.type === 'destroy') {
            currentCard = null;
            currentToken++;
        }
    });

    addCSS();
})();
