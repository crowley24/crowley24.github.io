/* Title: lampa_random_pro
 * Version: 1.1.2
 * Description: Random movies/TV shows with Genre and Year filters (Fixed UI).
 * Author: wapmax & AI
 */
(function () {
  'use strict';

  // Захист від подвійного запуску
  if (window.lampa_random_pro_inited) return;
  window.lampa_random_pro_inited = true;

  var STORAGE_VOTE_FROM = 'lampa_random_vote_from';
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

  function getLang() {
    var l = Lampa.Storage.get('language', 'uk');
    if (l === 'ua') l = 'uk';
    return l + '-' + String(l).toUpperCase();
  }

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

  function makeDiscoverParams(type, voteFrom, genre, yearPreset) {
    var years = getYearParams(yearPreset);
    return {
      page: Math.floor(Math.random() * 20) + 1, 
      language: getLang(),
      include_adult: false,
      sort_by: 'popularity.desc',
      'vote_count.gte': 150,
      'vote_average.gte': voteFrom,
      'with_genres': genre,
      'primary_release_date.gte': years.min + '-01-01',
      'primary_release_date.lte': years.max + '-12-31',
      'first_air_date.gte': years.min + '-01-01',
      'first_air_date.lte': years.max + '-12-31'
    };
  }

  // --- AJAX ПЕРЕХОПЛЕННЯ ---
  function patchAjax() {
    if ($.ajax.__lampa_random_patched) return;
    $.ajax.__lampa_random_patched = true;
    var originalAjax = $.ajax;

    $.ajax = function (options) {
      if (options.url && options.url.indexOf('lampa_random_virtual') > -1) {
        var voteFrom = Lampa.Storage.get(STORAGE_VOTE_FROM, 5.5);
        var genre = Lampa.Storage.get(STORAGE_GENRE, '');
        var yearPreset = Lampa.Storage.get(STORAGE_YEARS, 'all');

        var dfd = $.Deferred();
        var results = [];
        var left = 2;

        ['movie', 'tv'].forEach(function(type) {
          var p = makeDiscoverParams(type, voteFrom, genre, yearPreset);
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
              results.sort(function() { return 0.5 - Math.random(); });
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

  // --- ІНТЕРФЕЙС ---
  function injectUI() {
    var active = Lampa.Activity.active();
    if (!active || !active.params || !active.params.lampa_random) return;

    var $render = active.activity.render();
    if ($render.find('.lr-controls').length) return;

    var $controls = $('<div class="lr-controls" style="display:flex; gap:10px; padding:15px; overflow-x:auto; width:100%;"></div>');

    function createBtn(label, storageKey, items, currentVal) {
      var activeItem = items.find(function(i) { return (i.id || i.value) == currentVal }) || items[0];
      var $btn = $('<div class="selector button" style="white-space:nowrap; background: rgba(255,255,255,0.1); border-radius: 5px; padding: 10px 15px;">' + label + ': ' + activeItem.title + '</div>');
      
      $btn.on('hover:enter', function() {
        Lampa.Select.show({
          title: label,
          items: items.map(function(i) { return { title: i.title, value: i.id || i.value, selected: (i.id || i.value) == currentVal }; }),
          onSelect: function(selected) {
            Lampa.Storage.set(storageKey, selected.value);
            Lampa.Activity.replace(active.params); 
          },
          onBack: function() { Lampa.Controller.toggle('content'); }
        });
      });
      return $btn;
    }

    var genreBtn = createBtn('Жанр', STORAGE_GENRE, GENRES, Lampa.Storage.get(STORAGE_GENRE, ''));
    var yearBtn = createBtn('Роки', STORAGE_YEARS, YEAR_PRESETS, Lampa.Storage.get(STORAGE_YEARS, 'all'));
    var refreshBtn = $('<div class="selector button" style="background: rgba(255,255,255,0.1); border-radius: 5px; padding: 10px 15px;">🎲 Перемішати</div>').on('hover:enter', function() {
      Lampa.Activity.replace(active.params);
    });

    $controls.append(genreBtn).append(yearBtn).append(refreshBtn);
    
    var scroll = $render.find('.scroll__body');
    if (scroll.length) scroll.prepend($controls);
    
    Lampa.Controller.add('content', {
      toggle: function() {
        Lampa.Controller.collectionSet($render);
        Lampa.Controller.render().find('.selector').first().focus();
      }
    });
  }

  function addMenuItem() {
    // Видаляємо старі копії, якщо вони є
    $('.menu__list [data-id="lampa_random_pro"]').remove();

    var $btn = $('<li class="menu__item selector" data-id="lampa_random_pro">' +
        '<div class="menu__ico"><svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="30" width="140" height="140" rx="24" stroke="currentColor" stroke-width="16"/><circle cx="70" cy="70" r="10" fill="currentColor"/><circle cx="130" cy="70" r="10" fill="currentColor"/><circle cx="100" cy="100" r="10" fill="currentColor"/><circle cx="70" cy="130" r="10" fill="currentColor"/><circle cx="130" cy="130" r="10" fill="currentColor"/></svg></div>' +
        '<div class="menu__text">Мені пощастить</div>' +
      '</li>');

    $btn.on('hover:enter', function () {
      Lampa.Activity.push({
        url: 'lampa_random_virtual',
        title: 'Мені пощастить',
        component: 'category_full',
        source: 'tmdb',
        card_type: true,
        lampa_random: true,
        page: 1
      });
    });

    $('.menu .menu__list').first().append($btn);
  }

  // Запуск
  patchAjax();
  
  if (window.appready) addMenuItem();
  else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') addMenuItem(); });
  
  // Обробник для стабільної появи кнопок
  Lampa.Listener.follow('activity', function (e) {
    if (e.type === 'opened' && e.object.params && e.object.params.lampa_random) {
      setTimeout(injectUI, 300);
    }
  });

})();
