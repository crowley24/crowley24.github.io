/* Title: lampa_random
 * Version: 1.0.3
 * Description: For output random movies and tv shows with rating sort. Added Ukrainian support.
 * Author: wapmax https://github.com/wapmax
 */
(function () {
  'use strict';

  if (window.plugin_lampa_random_ready) return;
  window.plugin_lampa_random_ready = true;

  var MENU_ID = 'lampa_random_menu';

  var STORAGE_VOTE_FROM = 'lampa_random_vote_from';
  var STORAGE_VOTE_TO = 'lampa_random_vote_to';

  function tr(key, def) {
    try { return Lampa.Lang.translate(key); } catch (e) {}
    return def || key;
  }

  function addTranslations() {
    if (!window.Lampa || !Lampa.Lang) return;

    Lampa.Lang.add({
      lampa_random_name: { 
        ru: 'Мне повезёт',
        uk: 'Мені пощастить' 
      },
      lampa_random_title: { 
        ru: '🎲 Мне повезёт',
        uk: '🎲 Мені пощастить' 
      },
      lampa_random_vote_from: { 
        ru: 'Рейтинг: От',
        uk: 'Рейтинг: Від' 
      },
      lampa_random_vote_to: { 
        ru: 'До',
        uk: 'До' 
      },
      lampa_random_apply: { 
        ru: 'Применить',
        uk: 'Застосувати' 
      }
    });
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

  function getLang() {
    var l = 'uk'; // Змінено дефолт на uk
    try { l = (Lampa.Storage.get('language', 'uk') || 'uk'); } catch (e) {}
    if (l === 'ua') l = 'uk';
    return l + '-' + String(l).toUpperCase();
  }

  function clamp(v, a, b) {
    if (v < a) return a;
    if (v > b) return b;
    return v;
  }

  function roundHalf(v) {
    return Math.round(v * 2) / 2;
  }

  function ensureDefaultRange() {
    try {
      var f = Lampa.Storage.get(STORAGE_VOTE_FROM, null);
      var t = Lampa.Storage.get(STORAGE_VOTE_TO, null);

      if (f === null || f === undefined || f === '') Lampa.Storage.set(STORAGE_VOTE_FROM, 5.5);
      if (t === null || t === undefined || t === '') Lampa.Storage.set(STORAGE_VOTE_TO, 9.5);
    } catch (e) {}
  }

  function getVoteFrom() {
    var v = 5.5;
    try {
      var raw = Lampa.Storage.get(STORAGE_VOTE_FROM, 5.5);
      v = parseFloat(raw);
      if (isNaN(v)) v = 5.5;
    } catch (e) { v = 5.5; }
    return roundHalf(clamp(v, 1, 10));
  }

  function getVoteTo() {
    var v = 9.5;
    try {
      var raw = Lampa.Storage.get(STORAGE_VOTE_TO, 9.5);
      v = parseFloat(raw);
      if (isNaN(v)) v = 9.5;
    } catch (e) { v = 9.5; }
    return roundHalf(clamp(v, 1, 10));
  }

  function setVoteRange(vFrom, vTo) {
    vFrom = roundHalf(clamp(vFrom, 1, 10));
    vTo = roundHalf(clamp(vTo, 1, 10));
    if (vFrom > vTo) vTo = vFrom;

    try { Lampa.Storage.set(STORAGE_VOTE_FROM, vFrom); } catch (e) {}
    try { Lampa.Storage.set(STORAGE_VOTE_TO, vTo); } catch (e) {}
  }

  function formatVote(v) {
    return (v.toFixed(1) + '').replace('.', ',');
  }

  function buildVoteItems(current) {
    var items = [];
    for (var x = 10; x <= 100; x += 5) {
      var v = x / 10;
      items.push({ title: formatVote(v), value: v, selected: v === current });
    }
    return items;
  }

  function normalizeItem(it, type) {
    it = it || {};
    it.type = type;
    it.media_type = type;
    it.source = 'tmdb';
    it.title = it.title || it.name || it.original_title || it.original_name || '';
    it.name  = it.name  || it.title || '';
    return it;
  }

  function makeDiscoverParams(type, page, voteFrom, voteTo, baseParams) {
    var y = nowYear();
    var y1 = randInt(1960, y);
    var y2 = Math.min(y, y1 + randInt(0, 12));

    var params = {
      page: page,
      language: (baseParams && baseParams.language) ? baseParams.language : getLang(),
      include_adult: false,
      sort_by: (Math.random() < 0.85 ? 'popularity.desc' : 'vote_average.desc'),
      'vote_count.gte': randInt(150, 1500),
      'vote_average.gte': voteFrom,
      'vote_average.lte': voteTo
    };

    if (type === 'movie') {
      params['primary_release_date.gte'] = y1 + '-01-01';
      params['primary_release_date.lte'] = y2 + '-12-31';
    } else {
      params['first_air_date.gte'] = y1 + '-01-01';
      params['first_air_date.lte'] = y2 + '-12-31';
    }

    if (Math.random() < 0.4) params['without_genres'] = '99';

    try {
      var region = (baseParams && baseParams.region) ? baseParams.region : Lampa.Storage.get('region', '');
      if (region) params.region = region;
    } catch (e) {}

    return params;
  }

  function tmdbGet(request, params, ok, bad) {
    try {
      var tmdb = Lampa.Api && Lampa.Api.sources && Lampa.Api.sources.tmdb;
      if (!tmdb || typeof tmdb.get !== 'function') return bad && bad('NO_TMDB_GET');
      tmdb.get(request, params, ok, bad);
    } catch (e) {
      bad && bad(e);
    }
  }

  function filterByVote(items, voteFrom, voteTo) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var v = parseFloat(items[i].vote_average);
      if (isNaN(v)) continue;
      if (v >= voteFrom && v <= voteTo) out.push(items[i]);
    }
    return out;
  }

  function buildMixedResponse(page, voteFrom, voteTo, baseParams, done, attempt) {
    attempt = attempt || 0;

    var tasks = [
      { type: 'movie', page: randInt(1, 500) },
      { type: 'movie', page: randInt(1, 500) },
      { type: 'tv',    page: randInt(1, 500) },
      { type: 'tv',    page: randInt(1, 500) }
    ];

    var res = [];
    var left = tasks.length;

    function oneDone() {
      left--;
      if (left > 0) return;

      var filtered = filterByVote(res, voteFrom, voteTo);
      shuffle(filtered);

      if (filtered.length < 24 && attempt < 1) {
        buildMixedResponse(page, voteFrom, voteTo, baseParams, done, attempt + 1);
        return;
      }

      var result = {
        page: page,
        total_pages: 500,
        total_results: 999999,
        results: filtered
      };

      try {
        if (Lampa.Utils && typeof Lampa.Utils.addSource === 'function') {
          Lampa.Utils.addSource(result, 'tmdb');
        }
      } catch (e) {}

      done(result);
    }

    for (var i = 0; i < tasks.length; i++) {
      (function (task) {
        var req = task.type === 'movie' ? 'discover/movie' : 'discover/tv';
        var p = makeDiscoverParams(task.type, task.page, voteFrom, voteTo, baseParams);

        tmdbGet(req, p, function (json) {
          var list = (json && json.results) ? json.results : [];
          for (var k = 0; k < list.length; k++) res.push(normalizeItem(list[k], task.type));
          oneDone();
        }, function () {
          oneDone();
        });
      })(tasks[i]);
    }
  }

  function patchAjaxForVirtualEndpoint() {
    if (!window.$ || !$.ajax) return;
    if ($.ajax.__lampa_random_patched) return;
    $.ajax.__lampa_random_patched = true;

    var originalAjax = $.ajax;

    $.ajax = function (options) {
      try {
        var url = options && options.url ? String(options.url) : '';
        if (/\/3\/lampa_random(\?|$)/.test(url)) {
          var data = options.data || {};
          var page = parseInt(data.page || 1, 10) || 1;

          var voteFrom = getVoteFrom();
          var voteTo = getVoteTo();
          if (voteFrom > voteTo) { voteTo = voteFrom; setVoteRange(voteFrom, voteTo); }

          var baseParams = {
            language: data.language || getLang(),
            region: data.region || ''
          };

          var dfd = $.Deferred();
          var jq = dfd.promise();
          jq.abort = function () {};

          buildMixedResponse(page, voteFrom, voteTo, baseParams, function (json) {
            setTimeout(function () {
              try { if (options.success) options.success(json, 'success', jq); } catch (e1) {}
              try { if (options.complete) options.complete(jq, 'success'); } catch (e2) {}
              dfd.resolve(json, 'success', jq);
            }, 0);
          });

          return jq;
        }
      } catch (e) {}

      return originalAjax.apply(this, arguments);
    };
  }

  function activityParams(url) {
    return {
      url: url,
      title: tr('lampa_random_name', 'Мені пощастить'),
      component: 'category_full',
      source: 'tmdb',
      sort: 'now',
      card_type: true,
      page: 1,
      lampa_random_ui: 1
    };
  }

  function scheduleInject() {
    var tries = 0;
    var id = setInterval(function () {
      tries++;
      injectControls();
      if (tries >= 120) clearInterval(id);
    }, 250);
  }

  function openScreen() {
    patchAjaxForVirtualEndpoint();
    ensureDefaultRange();

    var url = 'lampa_random?rnd=' + Date.now();
    Lampa.Activity.push(activityParams(url));
    Lampa.Controller.toggle('content');

    scheduleInject();
  }

  function refreshScreen() {
    patchAjaxForVirtualEndpoint();

    var url = 'lampa_random?rnd=' + Date.now();
    Lampa.Activity.replace(activityParams(url));

    scheduleInject();
  }

  function injectControls() {
    try {
      var active = Lampa.Activity.active();
      if (!active || !active.activity) return false;

      var p = active.params || {};
      if (p.component !== 'category_full' || p.lampa_random_ui !== 1) return false;

      var $render = active.activity.render();
      if (!$render || !$render.length) return false;

      var $scrollBody = $render.find('.scroll__body').eq(0);
      if (!$scrollBody.length) return false;

      var $existing = $scrollBody.find('[data-lr-top="1"]').eq(0);
      if ($existing.length) {
        var f0 = getVoteFrom();
        var t0 = getVoteTo();
        if (f0 > t0) { t0 = f0; setVoteRange(f0, t0); }

        $existing.find('[data-lr-role="from"]').text(tr('lampa_random_vote_from', 'Рейтинг: Від') + ' ' + formatVote(f0));
        $existing.find('[data-lr-role="to"]').text(tr('lampa_random_vote_to', 'До') + ' ' + formatVote(t0));
        $existing.find('[data-lr-role="apply"]').text(tr('lampa_random_apply', 'Застосувати'));
        return true;
      }

      var voteFrom = getVoteFrom();
      var voteTo = getVoteTo();
      if (voteFrom > voteTo) { voteTo = voteFrom; setVoteRange(voteFrom, voteTo); }

      var $bar = $('<div class="buttons" data-lr-top="1"></div>');
      $bar.css({
        display: 'flex',
        gap: '0.6em',
        padding: '0.8em 1em',
        alignItems: 'center',
        flexWrap: 'wrap'
      });

      var $fromBtn = $('<div class="selector button" data-lr-role="from"></div>');
      var $toBtn = $('<div class="selector button" data-lr-role="to"></div>');
      var $applyBtn = $('<div class="selector button" data-lr-role="apply"></div>');

      function updateTexts() {
        var f = getVoteFrom();
        var t = getVoteTo();
        if (f > t) { t = f; setVoteRange(f, t); }
        $fromBtn.text(tr('lampa_random_vote_from', 'Рейтинг: Від') + ' ' + formatVote(f));
        $toBtn.text(tr('lampa_random_vote_to', 'До') + ' ' + formatVote(t));
        $applyBtn.text(tr('lampa_random_apply', 'Застосувати'));
      }

      $fromBtn.on('hover:enter', function () {
        if (!Lampa.Select || typeof Lampa.Select.show !== 'function') return;

        Lampa.Select.show({
          title: tr('lampa_random_vote_from', 'Рейтинг: Від'),
          items: buildVoteItems(getVoteFrom()),
          onSelect: function (a) {
            var from = a.value;
            var to = getVoteTo();
            if (from > to) to = from;
            setVoteRange(from, to);
            updateTexts();
            Lampa.Controller.toggle('content');
          },
          onBack: function () { Lampa.Controller.toggle('content'); }
        });
      });

      $toBtn.on('hover:enter', function () {
        if (!Lampa.Select || typeof Lampa.Select.show !== 'function') return;

        Lampa.Select.show({
          title: tr('lampa_random_vote_to', 'До'),
          items: buildVoteItems(getVoteTo()),
          onSelect: function (a) {
            var to = a.value;
            var from = getVoteFrom();
            if (from > to) from = to;
            setVoteRange(from, to);
            updateTexts();
            Lampa.Controller.toggle('content');
          },
          onBack: function () { Lampa.Controller.toggle('content'); }
        });
      });

      $applyBtn.on('hover:enter', function () {
        refreshScreen();
      });

      updateTexts();

      $bar.append($fromBtn).append($toBtn).append($applyBtn);

      $scrollBody.prepend($bar);

      return true;
    } catch (e) {
      return false;
    }
  }

  function addMenuItem() {
    var title = tr('lampa_random_name', 'Мені пощастить');

    var icon =
      '<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="30" y="30" width="140" height="140" rx="24" stroke="currentColor" stroke-width="16"/>' +
      '<circle cx="70" cy="70" r="10" fill="currentColor"/>' +
      '<circle cx="130" cy="70" r="10" fill="currentColor"/>' +
      '<circle cx="100" cy="100" r="10" fill="currentColor"/>' +
      '<circle cx="70" cy="130" r="10" fill="currentColor"/>' +
      '<circle cx="130" cy="130" r="10" fill="currentColor"/>' +
      '</svg>';

    var $btn = $(
      '<li class="menu__item selector" data-id="' + MENU_ID + '">' +
        '<div class="menu__ico">' + icon + '</div>' +
        '<div class="menu__text">' + title + '</div>' +
      '</li>'
    );

    $btn.on('hover:enter', function () {
      ensureDefaultRange();
      openScreen();
    });

    $('.menu .menu__list').eq(0).append($btn);
  }

  function init() {
    if (!window.Lampa || !Lampa.Activity || !Lampa.Api) return;

    addTranslations();
    ensureDefaultRange();
    patchAjaxForVirtualEndpoint();

    if (window.appready) addMenuItem();
    else if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
      Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') addMenuItem();
      });
    }
  }

  init();
})();

