/* Title: lampa_random
 * Version: 1.1.0
 * Description: Random movies & TV shows with filters (rating, genres, years)
 * Author: wapmax + modifications
 */
(function () {
  'use strict';

  if (window.plugin_lampa_random_ready) return;
  window.plugin_lampa_random_ready = true;

  var MENU_ID = 'lampa_random_menu';

  var STORAGE_VOTE_FROM = 'lampa_random_vote_from';
  var STORAGE_VOTE_TO   = 'lampa_random_vote_to';
  var STORAGE_GENRES    = 'lampa_random_genres';
  var STORAGE_YEAR_FROM = 'lampa_random_year_from';
  var STORAGE_YEAR_TO   = 'lampa_random_year_to';

  /* ===== GENRES ===== */
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

  function tr(key, def) {
    try { return Lampa.Lang.translate(key); } catch (e) {}
    return def || key;
  }

  function nowYear() {
    return new Date().getFullYear();
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function roundHalf(v) {
    return Math.round(v * 2) / 2;
  }

  /* ===== STORAGE ===== */

  function ensureDefaults() {
    if (Lampa.Storage.get(STORAGE_VOTE_FROM) == null) Lampa.Storage.set(STORAGE_VOTE_FROM, 5.5);
    if (Lampa.Storage.get(STORAGE_VOTE_TO)   == null) Lampa.Storage.set(STORAGE_VOTE_TO, 9.5);
    if (Lampa.Storage.get(STORAGE_GENRES)    == null) Lampa.Storage.set(STORAGE_GENRES, []);
    if (Lampa.Storage.get(STORAGE_YEAR_FROM) == null) Lampa.Storage.set(STORAGE_YEAR_FROM, 1980);
    if (Lampa.Storage.get(STORAGE_YEAR_TO)   == null) Lampa.Storage.set(STORAGE_YEAR_TO, nowYear());
  }

  function getVoteFrom() {
    return roundHalf(clamp(+Lampa.Storage.get(STORAGE_VOTE_FROM, 5.5), 1, 10));
  }

  function getVoteTo() {
    return roundHalf(clamp(+Lampa.Storage.get(STORAGE_VOTE_TO, 9.5), 1, 10));
  }

  function setVoteRange(f, t) {
    if (f > t) t = f;
    Lampa.Storage.set(STORAGE_VOTE_FROM, f);
    Lampa.Storage.set(STORAGE_VOTE_TO, t);
  }

  function getGenres() {
    return Lampa.Storage.get(STORAGE_GENRES, []);
  }

  function setGenres(arr) {
    Lampa.Storage.set(STORAGE_GENRES, arr);
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

  /* ===== UI BUILDERS ===== */

  function formatVote(v) {
    return v.toFixed(1).replace('.', ',');
  }

  function buildVoteItems(current) {
    var out = [];
    for (var i = 10; i <= 100; i += 5) {
      var v = i / 10;
      out.push({ title: formatVote(v), value: v, selected: v === current });
    }
    return out;
  }

  function buildGenreItems() {
    var sel = getGenres();
    return Object.keys(TMDB_GENRES).map(function (id) {
      return {
        title: TMDB_GENRES[id],
        value: id,
        selected: sel.indexOf(id) !== -1
      };
    });
  }

  function buildYearItems(current) {
    var out = [];
    for (var y = nowYear(); y >= 1950; y--) {
      out.push({ title: String(y), value: y, selected: y === current });
    }
    return out;
  }

  /* ===== TMDB ===== */

  function makeDiscoverParams(type, page) {
    var params = {
      page: page,
      sort_by: 'popularity.desc',
      include_adult: false,
      'vote_average.gte': getVoteFrom(),
      'vote_average.lte': getVoteTo(),
      'vote_count.gte': 100
    };

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

  /* ===== AJAX PATCH ===== */

  function patchAjax() {
    if ($.ajax.__lrpatched) return;
    $.ajax.__lrpatched = true;

    var orig = $.ajax;
    $.ajax = function (opt) {
      if (/lampa_random/.test(opt.url)) {
        var dfd = $.Deferred();
        var page = opt.data.page || 1;

        var tasks = ['movie', 'tv'];
        var res = [];
        var left = tasks.length;

        tasks.forEach(function (type) {
          Lampa.Api.sources.tmdb.get(
            'discover/' + type,
            makeDiscoverParams(type, Math.floor(Math.random() * 400) + 1),
            function (json) {
              if (json && json.results) {
                json.results.forEach(function (i) {
                  i.media_type = type;
                  res.push(i);
                });
              }
              if (--left === 0) {
                opt.success({
                  page: page,
                  total_pages: 500,
                  results: res.sort(() => Math.random() - 0.5)
                });
                dfd.resolve();
              }
            }
          );
        });

        return dfd.promise();
      }
      return orig.apply(this, arguments);
    };
  }

  /* ===== UI ===== */

  function openScreen() {
    patchAjax();
    Lampa.Activity.push({
      url: 'lampa_random',
      title: '🎲 Мені пощастить',
      component: 'category_full',
      source: 'tmdb',
      lampa_random_ui: 1
    });
  }

  function injectUI() {
    var a = Lampa.Activity.active();
    if (!a || !a.params || !a.params.lampa_random_ui) return;

    var body = a.activity.render().find('.scroll__body');
    if (body.find('[data-lr-ui]').length) return;

    var bar = $('<div class="buttons" data-lr-ui></div>').css({
      display: 'flex',
      gap: '0.6em',
      padding: '1em',
      flexWrap: 'wrap'
    });

    function btn(text, cb) {
      return $('<div class="selector button">' + text + '</div>').on('hover:enter', cb);
    }

    bar.append(
      btn('Рейтинг від', () => Lampa.Select.show({
        title: 'Рейтинг від',
        items: buildVoteItems(getVoteFrom()),
        onSelect: a => setVoteRange(a.value, getVoteTo())
      })),
      btn('Рейтинг до', () => Lampa.Select.show({
        title: 'Рейтинг до',
        items: buildVoteItems(getVoteTo()),
        onSelect: a => setVoteRange(getVoteFrom(), a.value)
      })),
      btn('Жанри', () => Lampa.Select.show({
        title: 'Жанри',
        multiselect: true,
        items: buildGenreItems(),
        onSelect: a => setGenres(a.map(i => i.value))
      })),
      btn('Рік від', () => Lampa.Select.show({
        title: 'Рік від',
        items: buildYearItems(getYearFrom()),
        onSelect: a => setYears(a.value, getYearTo())
      })),
      btn('Рік до', () => Lampa.Select.show({
        title: 'Рік до',
        items: buildYearItems(getYearTo()),
        onSelect: a => setYears(getYearFrom(), a.value)
      })),
      btn('Застосувати', () => openScreen())
    );

    body.prepend(bar);
  }

  /* ===== INIT ===== */

  function init() {
    ensureDefaults();
    patchAjax();

    if (window.appready) openMenu();
    else Lampa.Listener.follow('app', e => e.type === 'ready' && openMenu());

    setInterval(injectUI, 300);
  }

  function openMenu() {
    $('.menu__list').append(
      $('<li class="menu__item selector">' +
        '<div class="menu__text">🎲 Мені пощастить</div>' +
      '</li>').on('hover:enter', openScreen)
    );
  }

  init();
})();
