/* Title: lampa_random
 * Version: 1.1.0
 * Description: Random movies/TV shows with Genre and Year filters.
 * Author: wapmax & AI
 */
(function () {
  'use strict';

  if (window.plugin_lampa_random_ready) return;
  window.plugin_lampa_random_ready = true;

  var STORAGE_VOTE_FROM = 'lampa_random_vote_from';
  var STORAGE_VOTE_TO = 'lampa_random_vote_to';
  var STORAGE_GENRE = 'lampa_random_genre';
  var STORAGE_YEARS = 'lampa_random_years';

  var GENRES = [
    { title: 'Всі жанри', id: '' },
    { title: 'Бойовики', id: '28' },
    { title: 'Пригоди', id: '12' },
    { title: 'Мультфільми', id: '16' },
    { title: 'Комедії', id: '35' },
    { title: 'Кримінал', id: '80' },
    { title: 'Документальні', id: '99' },
    { title: 'Драми', id: '18' },
    { title: 'Сімейні', id: '10751' },
    { title: 'Фентезі', id: '14' },
    { title: 'Жахи', id: '27' },
    { title: 'Фантастика', id: '878' },
    { title: 'Трилери', id: '53' }
  ];

  var YEAR_PRESETS = [
    { title: 'Всі роки', value: 'all' },
    { title: 'Новинки (2024-2025)', value: 'new' },
    { title: 'Сучасні (після 2010)', value: 'modern' },
    { title: '2000-ні', value: '2000s' },
    { title: '90-ті', value: '90s' },
    { title: 'Ретро (до 1990)', value: 'retro' }
  ];

  function tr(key, def) {
    try { return Lampa.Lang.translate(key); } catch (e) {}
    return def || key;
  }

  function addTranslations() {
    Lampa.Lang.add({
      lampa_random_name: { ru: 'Мне повезёт', uk: 'Мені пощастить' },
      lampa_random_genre: { ru: 'Жанр', uk: 'Жанр' },
      lampa_random_year_label: { ru: 'Года', uk: 'Роки' },
      lampa_random_apply: { ru: 'Применить', uk: 'Застосувати' }
    });
  }

  function getLang() {
    var l = Lampa.Storage.get('language', 'uk');
    return (l === 'ua' ? 'uk' : l) + '-' + String(l).toUpperCase();
  }

  // --- Логіка параметрів років ---
  function getYearParams(preset) {
    var currentYear = new Date().getFullYear();
    switch(preset) {
      case 'new': return { min: currentYear - 1, max: currentYear };
      case 'modern': return { min: 2010, max: currentYear };
      case '2000s': return { min: 2000, max: 2009 };
      case '90s': return { min: 1990, max: 1999 };
      case 'retro': return { min: 1950, max: 1989 };
      default: return { min: 1960, max: currentYear };
    }
  }

  function makeDiscoverParams(type, page, voteFrom, voteTo, genre, yearPreset) {
    var years = getYearParams(yearPreset);
    var params = {
      page: Math.floor(Math.random() * 10) + 1, // беремо випадкову сторінку з перших 10 для кращої якості
      language: getLang(),
      include_adult: false,
      sort_by: 'popularity.desc',
      'vote_count.gte': 100,
      'vote_average.gte': voteFrom,
      'vote_average.lte': voteTo,
      'with_genres': genre
    };

    var dateKey = (type === 'movie' ? 'primary_release_date' : 'first_air_date');
    params[dateKey + '.gte'] = years.min + '-01-01';
    params[dateKey + '.lte'] = years.max + '-12-31';

    return params;
  }

  // --- Робота з AJAX ---
  function patchAjax() {
    if ($.ajax.__lampa_random_patched) return;
    $.ajax.__lampa_random_patched = true;
    var originalAjax = $.ajax;

    $.ajax = function (options) {
      if (options.url && options.url.indexOf('lampa_random') > -1) {
        var voteFrom = Lampa.Storage.get(STORAGE_VOTE_FROM, 5.5);
        var voteTo = Lampa.Storage.get(STORAGE_VOTE_TO, 10);
        var genre = Lampa.Storage.get(STORAGE_GENRE, '');
        var yearPreset = Lampa.Storage.get(STORAGE_YEARS, 'all');

        var dfd = $.Deferred();
        var results = [];
        var types = ['movie', 'tv'];
        var left = 2;

        types.forEach(function(type) {
          var p = makeDiscoverParams(type, 1, voteFrom, voteTo, genre, yearPreset);
          Lampa.Api.sources.tmdb.get('discover/' + type, p, function(json) {
            if (json && json.results) {
              json.results.forEach(function(it) {
                it.type = type;
                it.media_type = type;
                results.push(it);
              });
            }
            left--;
            if (left === 0) {
              results = results.sort(function() { return 0.5 - Math.random(); });
              dfd.resolve({ results: results.slice(0, 40), page: 1, total_pages: 1 });
            }
          }, function() {
            left--;
            if (left === 0) dfd.resolve({ results: results });
          });
        });

        var jq = dfd.promise();
        jq.abort = function(){};
        if (options.success) jq.done(options.success);
        return jq;
      }
      return originalAjax.apply(this, arguments);
    };
  }

  function injectUI() {
    var active = Lampa.Activity.active();
    if (!active || active.activity.name !== 'category_full' || active.params.lampa_random !== true) return;

    var $render = active.activity.render();
    if ($render.find('.lr-controls').length) return;

    var $controls = $('<div class="lr-controls" style="display:flex; gap:10px; padding:15px; overflow-x:auto;"></div>');

    function createBtn(label, storageKey, items, currentVal) {
      var activeItem = items.find(function(i) { return (i.id || i.value) == currentVal }) || items[0];
      var $btn = $('<div class="selector button" style="white-space:nowrap;">' + label + ': ' + activeItem.title + '</div>');
      
      $btn.on('hover:enter', function() {
        Lampa.Select.show({
          title: label,
          items: items.map(function(i) { return { title: i.title, value: i.id || i.value, selected: (i.id || i.value) == currentVal }; }),
          onSelect: function(selected) {
            Lampa.Storage.set(storageKey, selected.value);
            Lampa.Activity.replace(active.params); // Перезавантаження
          },
          onBack: function() { Lampa.Controller.toggle('content'); }
        });
      });
      return $btn;
    }

    var genreBtn = createBtn('Жанр', STORAGE_GENRE, GENRES, Lampa.Storage.get(STORAGE_GENRE, ''));
    var yearBtn = createBtn('Роки', STORAGE_YEARS, YEAR_PRESETS, Lampa.Storage.get(STORAGE_YEARS, 'all'));
    var applyBtn = $('<div class="selector button">🎲 Перемішати</div>').on('hover:enter', function() {
      Lampa.Activity.replace(active.params);
    });

    $controls.append(genreBtn).append(yearBtn).append(applyBtn);
    $render.find('.scroll__body').prepend($controls);
  }

  function addMenuItem() {
    var $btn = $('<li class="menu__item selector" data-id="lampa_random">' +
        '<div class="menu__ico"><svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="30" width="140" height="140" rx="24" stroke="currentColor" stroke-width="16"/><circle cx="70" cy="70" r="10" fill="currentColor"/><circle cx="130" cy="70" r="10" fill="currentColor"/><circle cx="100" cy="100" r="10" fill="currentColor"/><circle cx="70" cy="130" r="10" fill="currentColor"/><circle cx="130" cy="130" r="10" fill="currentColor"/></svg></div>' +
        '<div class="menu__text">' + tr('lampa_random_name', 'Мені пощастить') + '</div>' +
      '</li>');

    $btn.on('hover:enter', function () {
      Lampa.Activity.push({
        url: 'lampa_random',
        title: tr('lampa_random_name', 'Мені пощастить'),
        component: 'category_full',
        source: 'tmdb',
        card_type: true,
        lampa_random: true,
        page: 1
      });
      setTimeout(injectUI, 500);
    });

    $('.menu .menu__list').append($btn);
  }

  // Ініціалізація
  addTranslations();
  patchAjax();
  
  if (window.appready) addMenuItem();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') addMenuItem(); });
  
  // Відстеження зміни активності для ін'єкції UI
  Lampa.Listener.follow('activity', function (e) {
    if (e.type === 'opened' || e.type === 'back') setTimeout(injectUI, 200);
  });

})();
