/* Title: lampa_random_ultra
 * Version: 1.2.0
 * Description: Повне виправлення: Жанри, Роки, Оновлення при кожному вході.
 * Author: wapmax & AI
 */
(function () {
  'use strict';

  if (window.lampa_random_ultra_inited) return;
  window.lampa_random_ultra_inited = true;

  var STORAGE_GENRE = 'lr_genre_id';
  var STORAGE_YEARS = 'lr_years_preset';

  var GENRES = [
    { title: 'Всі жанри', id: '' },
    { title: 'Бойовики', id: '28' }, { title: 'Пригоди', id: '12' },
    { title: 'Мультфільми', id: '16' }, { title: 'Комедії', id: '35' },
    { title: 'Кримінал', id: '80' }, { title: 'Драми', id: '18' },
    { title: 'Жахи', id: '27' }, { title: 'Фантастика', id: '878' }
  ];

  var YEAR_PRESETS = [
    { title: 'Всі роки', value: 'all', min: 1960, max: 2026 },
    { title: 'Новинки', value: 'new', min: 2024, max: 2026 },
    { title: 'Сучасні', value: 'modern', min: 2015, max: 2026 },
    { title: '2000-ні', value: '2000s', min: 2000, max: 2010 },
    { title: '90-ті', value: '90s', min: 1990, max: 1999 }
  ];

  // 1. ПЕРЕХОПЛЕННЯ AJAX (З ПРИМУСОВИМ РАНДОМОМ)
  var originalAjax = $.ajax;
  $.ajax = function (opt) {
    if (opt.url && opt.url.indexOf('lampa_random_search') > -1) {
      var dfd = $.Deferred();
      var results = [];
      var count = 0;
      
      var genre = Lampa.Storage.get(STORAGE_GENRE, '');
      var yPreset = Lampa.Storage.get(STORAGE_YEARS, 'all');
      var years = YEAR_PRESETS.find(function(p){ return p.value == yPreset }) || YEAR_PRESETS[0];

      ['movie', 'tv'].forEach(function(type) {
        var p = {
          page: Math.floor(Math.random() * 20) + 1, // Кожен запит - нова сторінка
          language: 'uk-UA',
          sort_by: 'popularity.desc',
          'vote_count.gte': 100,
          'with_genres': genre,
          'primary_release_date.gte': years.min + '-01-01',
          'primary_release_date.lte': years.max + '-12-31',
          'first_air_date.gte': years.min + '-01-01',
          'first_air_date.lte': years.max + '-12-31'
        };

        Lampa.Api.sources.tmdb.get('discover/' + type, p, function(json) {
          if (json && json.results) {
            json.results.forEach(function(it) { 
              it.type = type; 
              it.media_type = type; 
              results.push(it); 
            });
          }
          if (++count === 2) {
            results.sort(function() { return 0.5 - Math.random(); });
            dfd.resolve({ results: results.slice(0, 40), page: 1, total_pages: 1 });
          }
        }, function() { if (++count === 2) dfd.resolve({ results: results }); });
      });

      var jq = dfd.promise();
      if (opt.success) jq.done(opt.success);
      return jq;
    }
    return originalAjax.apply(this, arguments);
  };

  // 2. ФУНКЦІЯ МАЛЮВАННЯ КНОПОК
  function injectUI(activity) {
    var render = activity.render();
    if (render.find('.lr-bar').length) return;

    var bar = $('<div class="lr-bar" style="display:flex; flex-wrap:wrap; gap:10px; padding:15px; width:100%;"></div>');

    function createBtn(name, storage, list) {
      var cur = Lampa.Storage.get(storage, '');
      var item = list.find(function(i){ return (i.id || i.value || '') == cur }) || list[0];
      var btn = $('<div class="selector button" style="padding:10px 15px; background:rgba(255,255,255,0.1); border-radius:8px;">' + name + ': ' + item.title + '</div>');
      
      btn.on('hover:enter', function() {
        Lampa.Select.show({
          title: name,
          items: list.map(function(i){ return {title: i.title, value: (i.id || i.value || ''), selected: (i.id || i.value || '') == cur} }),
          onSelect: function(sel) {
            Lampa.Storage.set(storage, sel.value);
            Lampa.Activity.replace(activity.params);
          },
          onBack: function(){ Lampa.Controller.toggle('content'); }
        });
      });
      return btn;
    }

    bar.append(createBtn('Жанр', STORAGE_GENRE, GENRES));
    bar.append(createBtn('Роки', STORAGE_YEARS, YEAR_PRESETS));
    
    var refresh = $('<div class="selector button" style="padding:10px 15px; background:rgba(50,100,255,0.5); border-radius:8px;">🎲 Ще</div>');
    refresh.on('hover:enter', function(){ Lampa.Activity.replace(activity.params); });
    bar.append(refresh);

    render.find('.scroll__body').prepend(bar);
    
    // Перепідключаємо контролер, щоб кнопки стали доступні для пульта
    Lampa.Controller.add('content', {
      toggle: function() {
        Lampa.Controller.collectionSet(render);
        Lampa.Controller.render().find('.selector').first().focus();
      }
    });
  }

  // 3. ДОДАВАННЯ В МЕНЮ (З ОЧИЩЕННЯМ ДУБЛІВ)
  function addMenu() {
    $('[data-id="lr_ultra"]').remove();
    var item = $('<li class="menu__item selector" data-id="lr_ultra">' +
      '<div class="menu__ico"><svg viewBox="0 0 200 200"><rect x="30" y="30" width="140" height="140" rx="24" stroke="currentColor" stroke-width="14" fill="none"/><circle cx="70" cy="70" r="12" fill="currentColor"/><circle cx="130" cy="130" r="12" fill="currentColor"/><circle cx="100" cy="100" r="12" fill="currentColor"/><circle cx="70" cy="130" r="12" fill="currentColor"/><circle cx="130" cy="70" r="12" fill="currentColor"/></svg></div>' +
      '<div class="menu__text">Мені пощастить</div>' +
    '</li>');

    item.on('hover:enter', function () {
      // Додаємо випадковий rnd, щоб Lampa не брала результати з кешу
      Lampa.Activity.push({
        url: 'lampa_random_search?rnd=' + Math.random(),
        title: 'Мені пощастить',
        component: 'category_full',
        source: 'tmdb',
        card_type: true,
        lr_ultra: true
      });
    });

    $('.menu .menu__list').first().append(item);
  }

  // 4. СЛУХАЧІ ПОДІЙ
  if (window.appready) addMenu();
  else Lampa.Listener.follow('app', function(e){ if(e.type === 'ready') addMenu(); });
  
  Lampa.Listener.follow('activity', function(e){
    if (e.type === 'opened' && e.object.params.lr_ultra) {
      // Використовуємо інтервал, поки scroll__body не з'явиться в DOM
      var wait = setInterval(function(){
        if (e.object.activity.render().find('.scroll__body').length) {
          clearInterval(wait);
          injectUI(e.object);
        }
      }, 50);
      // Страховка на випадок довгих завантажень
      setTimeout(function(){ clearInterval(wait); }, 3000);
    }
  });

})();
