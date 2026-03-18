(function () {
  'use strict';

  if (window.plugin_lampa_random_ready) return;
  window.plugin_lampa_random_ready = true;

  var MENU_ID = 'lampa_random_menu';

  // Storage Keys
  var STORAGE = {
    VOTE_FROM: 'lampa_random_vote_from',
    VOTE_TO: 'lampa_random_vote_to',
    GENRES: 'lampa_random_genres',
    YEAR_FROM: 'lampa_random_year_from',
    YEAR_TO: 'lampa_random_year_to',
    TYPE: 'lampa_random_type', // movie, tv, mixed
    REGION: 'lampa_random_region'
  };

  var TMDB_GENRES = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    53: 'Thriller', 10752: 'War', 37: 'Western'
  };

  var REGIONS = {
    'all': { ru: 'Все страны', uk: 'Всі країни' },
    'US': { ru: 'США', uk: 'США' },
    'EU': { ru: 'Европа', uk: 'Європа' },
    'KR': { ru: 'Корея', uk: 'Корея' },
    'JP': { ru: 'Япония', uk: 'Японія' }
  };

  function tr(key, def) {
    try { return Lampa.Lang.translate(key); } catch(e) {}
    return def || key;
  }

  function addTranslations() {
    Lampa.Lang.add({
      lampa_random_name: { ru: 'Мне повезёт', uk: 'Випадкова добірка' },
      lampa_random_type: { ru: 'Тип контента', uk: 'Тип контенту' },
      lampa_random_region: { ru: 'Регион', uk: 'Регіон' },
      lampa_random_movie: { ru: 'Фильмы', uk: 'Фільми' },
      lampa_random_tv: { ru: 'Сериалы', uk: 'Серіали' },
      lampa_random_mixed: { ru: 'Микс', uk: 'Мікс' },
      lampa_random_apply: { ru: 'Найти новое', uk: 'Знайти нове' }
    });
  }

  // Helpers
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) { return arr.sort(function() { return 0.5 - Math.random(); }); }
  function getLang() { 
    var l = Lampa.Storage.get('language', 'uk');
    return (l === 'ua' ? 'uk' : l) + '-' + (l === 'ua' ? 'UK' : l.toUpperCase());
  }

  function ensureSettings() {
    if (!Lampa.Storage.get(STORAGE.VOTE_FROM)) Lampa.Storage.set(STORAGE.VOTE_FROM, 6.5);
    if (!Lampa.Storage.get(STORAGE.TYPE)) Lampa.Storage.set(STORAGE.TYPE, 'movie');
    if (!Lampa.Storage.get(STORAGE.REGION)) Lampa.Storage.set(STORAGE.REGION, 'all');
  }

  // TMDB Engine
  function makeParams(type, page) {
    var params = {
      page: page,
      language: getLang(),
      'vote_average.gte': Lampa.Storage.get(STORAGE.VOTE_FROM, 6.5),
      'vote_average.lte': Lampa.Storage.get(STORAGE.VOTE_TO, 10),
      'vote_count.gte': 300, // Premium filter: only quality content
      with_genres: (Lampa.Storage.get(STORAGE.GENRES) || []).join(','),
      include_adult: false,
      sort_by: Math.random() > 0.5 ? 'popularity.desc' : 'vote_average.desc'
    };

    var yf = Lampa.Storage.get(STORAGE.YEAR_FROM, 1990);
    var yt = Lampa.Storage.get(STORAGE.YEAR_TO, new Date().getFullYear());
    var reg = Lampa.Storage.get(STORAGE.REGION, 'all');

    if (type === 'movie') {
      params['primary_release_date.gte'] = yf + '-01-01';
      params['primary_release_date.lte'] = yt + '-12-31';
      if (reg !== 'all') params.with_origin_country = reg;
    } else {
      params['first_air_date.gte'] = yf + '-01-01';
      params['first_air_date.lte'] = yt + '-12-31';
      if (reg !== 'all') params.with_origin_country = reg;
    }
    return params;
  }

  function buildMixedResponse(done) {
    var type = Lampa.Storage.get(STORAGE.TYPE, 'movie');
    var tasks = [];
    
    if (type === 'mixed') {
        tasks = [{t:'movie', p:randInt(1, 20)}, {t:'tv', p:randInt(1, 20)}, {t:'movie', p:randInt(21, 40)}];
    } else {
        tasks = [{t:type, p:randInt(1, 15)}, {t:type, p:randInt(16, 30)}, {t:type, p:randInt(31, 50)}];
    }

    var results = [];
    var count = 0;

    tasks.forEach(function(task) {
      var req = task.t === 'movie' ? 'discover/movie' : 'discover/tv';
      Lampa.Api.sources.tmdb.get(req, makeParams(task.t, task.p), function(json) {
        if (json && json.results) {
          json.results.forEach(function(i) {
            i.type = task.t;
            results.push(i);
          });
        }
        count++;
        if (count === tasks.length) {
          var final = { results: shuffle(results).slice(0, 40) };
          Lampa.Utils.addSource(final, 'tmdb');
          done(final);
        }
      }, function() { count++; if(count === tasks.length) done({results:[]}); });
    });
  }

  // UI Injection
  function injectControls() {
    var active = Lampa.Activity.active();
    if (!active || !active.params || !active.params.lampa_random_ui) return;

    var $render = active.activity.render();
    var $scroll = $render.find('.scroll__body');
    if (!$scroll.length || $scroll.find('.lr-controls').length) return;

    var $controls = $('<div class="lr-controls buttons"></div>').css({padding: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap'});
    
    var btnStyle = { background: 'rgba(255,255,255,0.1)', borderRadius: '8px' };

    var typeBtn = $('<div class="selector button"></div>').text(tr('lampa_random_type') + ': ' + tr('lampa_random_' + Lampa.Storage.get(STORAGE.TYPE)));
    var regBtn = $('<div class="selector button"></div>').text(tr('lampa_random_region') + ': ' + (REGIONS[Lampa.Storage.get(STORAGE.REGION)] ? REGIONS[Lampa.Storage.get(STORAGE.REGION)][Lampa.Storage.get('language','uk') === 'uk' ? 'uk' : 'ru'] : 'All'));
    var refreshBtn = $('<div class="selector button"></div>').css({background: '#35b54c'}).text(tr('lampa_random_apply'));

    typeBtn.on('hover:enter', function() {
      Lampa.Select.show({
        title: tr('lampa_random_type'),
        items: [
            {title: tr('lampa_random_movie'), value: 'movie'},
            {title: tr('lampa_random_tv'), value: 'tv'},
            {title: tr('lampa_random_mixed'), value: 'mixed'}
        ],
        onSelect: function(a) { Lampa.Storage.set(STORAGE.TYPE, a.value); Lampa.Activity.replace(active.params); },
        onBack: function() { Lampa.Controller.toggle('content'); }
      });
    });

    regBtn.on('hover:enter', function() {
        Lampa.Select.show({
          title: tr('lampa_random_region'),
          items: Object.keys(REGIONS).map(function(k) { return { title: REGIONS[k][Lampa.Storage.get('language','uk') === 'uk' ? 'uk' : 'ru'], value: k }; }),
          onSelect: function(a) { Lampa.Storage.set(STORAGE.REGION, a.value); Lampa.Activity.replace(active.params); },
          onBack: function() { Lampa.Controller.toggle('content'); }
        });
      });

    refreshBtn.on('hover:enter', function() { Lampa.Activity.replace(active.params); });

    $controls.append(typeBtn, regBtn, refreshBtn);
    $scroll.prepend($controls);
  }

  // Patching
  function patchAjax() {
    if ($.ajax.__lampa_random_patched) return;
    $.ajax.__lampa_random_patched = true;
    var original = $.ajax;
    $.ajax = function(opt) {
      if (opt.url && opt.url.indexOf('lampa_random') > -1) {
        var dfd = $.Deferred();
        buildMixedResponse(function(json) {
          if (opt.success) opt.success(json);
          dfd.resolve(json);
        });
        return dfd.promise();
      }
      return original.apply(this, arguments);
    };
  }

  function addMenuItem() {
    var $btn = $('<li class="menu__item selector" data-id="'+MENU_ID+'"><div class="menu__ico"><svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" style="transition: transform 0.3s ease;"><path d="M7,15L11,19L15,15M17,9L13,5L9,9" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="menu__text">'+tr('lampa_random_name')+'</div></li>');
    $btn.on('hover:enter', function() {
      patchAjax();
      Lampa.Activity.push({ url: 'lampa_random', title: tr('lampa_random_name'), component: 'category_full', source: 'tmdb', card_type: true, lampa_random_ui: true });
      setTimeout(injectControls, 400);
    });
    $('.menu .menu__list').append($btn);
  }

  // Init
  addTranslations();
  ensureSettings();
  if (window.appready) addMenuItem();
  else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') addMenuItem(); });
  
  // Регулярна перевірка для UI (при поверненні назад)
  setInterval(injectControls, 1000);
})();
