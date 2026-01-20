/* Title: lampa_random
 * Version: 1.1.0
 * Description: Random movies and tv shows with rating, genres and year filter
 * Author: wapmax (extended)
 */
(function () {
  'use strict';

  if (window.plugin_lampa_random_ready) return;
  window.plugin_lampa_random_ready = true;

  var MENU_ID = 'lampa_random_menu';

  /* ================= STORAGE ================= */

  var STORAGE_VOTE_FROM = 'lampa_random_vote_from';
  var STORAGE_VOTE_TO   = 'lampa_random_vote_to';

  var STORAGE_GENRES    = 'lampa_random_genres';
  var STORAGE_YEAR_FROM = 'lampa_random_year_from';
  var STORAGE_YEAR_TO   = 'lampa_random_year_to';

  /* ================= GENRES ================= */

  var TMDB_GENRES = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
  };

  /* ================= HELPERS ================= */

  function tr(key, def) {
    try { return Lampa.Lang.translate(key); } catch (e) {}
    return def || key;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function nowYear() {
    return new Date().getFullYear();
  }

  function clamp(v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
  }

  function roundHalf(v) {
    return Math.round(v * 2) / 2;
  }

  /* ================= DEFAULTS ================= */

  function ensureDefaultRange() {
    try {
      if (Lampa.Storage.get(STORAGE_VOTE_FROM) == null)
        Lampa.Storage.set(STORAGE_VOTE_FROM, 5.5);

      if (Lampa.Storage.get(STORAGE_VOTE_TO) == null)
        Lampa.Storage.set(STORAGE_VOTE_TO, 9.5);

      if (Lampa.Storage.get(STORAGE_GENRES) == null)
        Lampa.Storage.set(STORAGE_GENRES, []);

      if (Lampa.Storage.get(STORAGE_YEAR_FROM) == null)
        Lampa.Storage.set(STORAGE_YEAR_FROM, 1980);

      if (Lampa.Storage.get(STORAGE_YEAR_TO) == null)
        Lampa.Storage.set(STORAGE_YEAR_TO, nowYear());
    } catch (e) {}
  }

  /* ================= GET / SET ================= */

  function getVoteFrom() {
    return roundHalf(clamp(parseFloat(Lampa.Storage.get(STORAGE_VOTE_FROM, 5.5)), 1, 10));
  }

  function getVoteTo() {
    return roundHalf(clamp(parseFloat(Lampa.Storage.get(STORAGE_VOTE_TO, 9.5)), 1, 10));
  }

  function setVoteRange(f, t) {
    if (f > t) t = f;
    Lampa.Storage.set(STORAGE_VOTE_FROM, f);
    Lampa.Storage.set(STORAGE_VOTE_TO, t);
  }

  function getGenres() {
    try { return Lampa.Storage.get(STORAGE_GENRES, []); }
    catch (e) { return []; }
  }

  function setGenres(arr) {
    try { Lampa.Storage.set(STORAGE_GENRES, arr); }
    catch (e) {}
  }

  function getYearFrom() {
    return Lampa.Storage.get(STORAGE_YEAR_FROM, 1980);
  }

  function getYearTo() {
    return Lampa.Storage.get(STORAGE_YEAR_TO, nowYear());
  }

  function setYears(f, t) {
    if (f > t) t = f;
    Lampa.Storage.set(STORAGE_YEAR_FROM, f);
    Lampa.Storage.set(STORAGE_YEAR_TO, t);
  }

  /* ================= TMDB PARAMS ================= */

  function makeDiscoverParams(type, page, voteFrom, voteTo, baseParams) {
    var y = nowYear();
    var y1 = randInt(1960, y);
    var y2 = Math.min(y, y1 + randInt(0, 12));

    var params = {
      page: page,
      language: baseParams.language,
      sort_by: 'popularity.desc',
      include_adult: false,
      'vote_count.gte': randInt(100, 2000),
      'vote_average.gte': voteFrom,
      'vote_average.lte': voteTo
    };

    /* 👇 ПЕРЕВИЗНАЧЕННЯ (DIFF) */

    var genres = getGenres();
    if (genres.length) params.with_genres = genres.join(',');

    var yf = getYearFrom();
    var yt = getYearTo();

    if (type === 'movie') {
      params['primary_release_date.gte'] = yf + '-01-01';
      params['primary_release_date.lte'] = yt + '-12-31';
    } else {
      params['first_air_date.gte'] = yf + '-01-01';
      params['first_air_date.lte'] = yt + '-12-31';
    }

    return params;
  }

  /* ================= UI ================= */

  function buildYearItems(current) {
    var items = [];
    for (var y = nowYear(); y >= 1950; y--) {
      items.push({ title: String(y), value: y, selected: y === current });
    }
    return items;
  }

  function injectControls() {
    var active = Lampa.Activity.active();
    if (!active || !active.activity || !active.params.lampa_random_ui) return;

    var $body = active.activity.render().find('.scroll__body');
    if ($body.find('[data-lr-top]').length) return;

    var $bar = $('<div class="buttons" data-lr-top="1"></div>');

    var $fromBtn = $('<div class="selector button">Рейтинг від</div>');
    var $toBtn   = $('<div class="selector button">До</div>');
    var $genresBtn   = $('<div class="selector button">Жанри</div>');
    var $yearFromBtn = $('<div class="selector button">Рік від</div>');
    var $yearToBtn   = $('<div class="selector button">До</div>');
    var $applyBtn    = $('<div class="selector button">Застосувати</div>');

    $genresBtn.on('hover:enter', function () {
      Lampa.Select.show({
        title: 'Жанри',
        multiselect: true,
        items: Object.keys(TMDB_GENRES).map(function (id) {
          return {
            title: TMDB_GENRES[id],
            value: id,
            selected: getGenres().indexOf(id) !== -1
          };
        }),
        onSelect: function (items) {
          setGenres(items.map(function (i) { return i.value; }));
          Lampa.Controller.toggle('content');
        }
      });
    });

    $yearFromBtn.on('hover:enter', function () {
      Lampa.Select.show({
        title: 'Рік від',
        items: buildYearItems(getYearFrom()),
        onSelect: function (a) {
          setYears(a.value, getYearTo());
          Lampa.Controller.toggle('content');
        }
      });
    });

    $yearToBtn.on('hover:enter', function () {
      Lampa.Select.show({
        title: 'Рік до',
        items: buildYearItems(getYearTo()),
        onSelect: function (a) {
          setYears(getYearFrom(), a.value);
          Lampa.Controller.toggle('content');
        }
      });
    });

    $applyBtn.on('hover:enter', function () {
      Lampa.Activity.replace(active.params);
    });

    $bar
      .append($fromBtn)
      .append($toBtn)
      .append($genresBtn)
      .append($yearFromBtn)
      .append($yearToBtn)
      .append($applyBtn);

    $body.prepend($bar);
  }

  /* ================= INIT ================= */

  function addMenuItem() {
    if (document.querySelector('[data-id="' + MENU_ID + '"]')) return;

    var $btn = $('<li class="menu__item selector" data-id="' + MENU_ID + '"><div class="menu__text">🎲 Мне повезёт</div></li>');
    $btn.on('hover:enter', function () {
      ensureDefaultRange();
      Lampa.Activity.push({
        url: '/3/lampa_random',
        title: 'Мне повезёт',
        component: 'category_full',
        source: 'tmdb',
        page: 1,
        lampa_random_ui: 1
      });
      Lampa.Controller.toggle('content');
      setTimeout(injectControls, 300);
    });

    $('.menu .menu__list').append($btn);
  }

  function init() {
    ensureDefaultRange();
    if (window.appready) addMenuItem();
    else Lampa.Listener.follow('app', function (e) {
      if (e.type === 'ready') addMenuItem();
    });
  }

  init();
})();
