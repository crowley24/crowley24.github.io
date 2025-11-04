(function() {    
  'use strict';    
      
  function waitForLampa(callback) {    
    if (window.Lampa && Lampa.Storage && Lampa.TMDB && Lampa.Lang && Lampa.SettingsApi && Lampa.Template) {    
      callback();    
    } else {    
      setTimeout(function() { waitForLampa(callback); }, 100);    
    }    
  }    
      
  waitForLampa(function() {    
    if (window.customhub_plugin) return;    
    window.customhub_plugin = true;    
        
    console.log('[CustomHub] Ініціалізація плагіна');    
        
    // Додавання CSS стилів  
    var style = document.createElement('style');  
    style.textContent = `  
      .customhub-section {  
        margin: 2em 0;  
        padding: 0 2em;  
      }  
      .customhub-section__title {  
        font-size: 1.8em;  
        font-weight: bold;  
        margin-bottom: 1em;  
        color: #fff;  
      }  
      .customhub-section__content {  
        display: grid;  
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));  
        gap: 1.5em;  
      }  
      .customhub-section__content.line-mode {  
        display: flex;  
        flex-direction: column;  
        gap: 0.5em;  
      }  
      @media (max-width: 768px) {  
        .customhub-section {  
          padding: 0 1em;  
        }  
        .customhub-section__content {  
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));  
          gap: 1em;  
        }  
      }  
    `;  
    document.head.appendChild(style);  
        
    // Локалізація    
    Lampa.Lang.add({    
      customhub_title: {    
        en: 'Custom Hub',    
        uk: 'Власний Hub',    
        ru: 'Свой Hub'    
      },    
      customhub_display_mode: {    
        en: 'Display mode',    
        uk: 'Режим відображення',    
        ru: 'Режим отображения'    
      },    
      customhub_display_poster: {    
        en: 'Posters',    
        uk: 'Постери',    
        ru: 'Постеры'    
      },    
      customhub_display_line: {    
        en: 'Line',    
        uk: 'Рядок',    
        ru: 'Строка'    
      },    
      customhub_order: {    
        en: 'Display order',    
        uk: 'Порядок відображення',    
        ru: 'Порядок отображения'    
      },    
      customhub_shuffle: {    
        en: 'Shuffle cards',    
        uk: 'Перемішати картки',    
        ru: 'Перемешать карточки'    
      },    
      customhub_enable: {    
        en: 'Enable category',    
        uk: 'Увімкнути категорію',    
        ru: 'Включить категорию'    
      },    
      customhub_trending_day: {    
        en: 'Trending Today',    
        uk: 'Сьогодні в тренді',    
        ru: 'Сегодня в тренде'    
      },    
      customhub_trending_week: {    
        en: 'Trending This Week',    
        uk: 'Тренди тижня',    
        ru: 'Тренды недели'    
      },    
      customhub_popular_movies: {    
        en: 'Popular Movies',    
        uk: 'Популярні фільми',    
        ru: 'Популярные фильмы'    
      },    
      customhub_popular_tv: {    
        en: 'Popular TV Shows',    
        uk: 'Популярні серіали',    
        ru: 'Популярные сериалы'    
      },    
      customhub_top_rated: {    
        en: 'Top Rated',    
        uk: 'Найкращі',    
        ru: 'Лучшие'    
      },    
      customhub_upcoming: {    
        en: 'Upcoming',    
        uk: 'Скоро',    
        ru: 'Скоро'    
      }    
    });    
        
    // Конфігурація категорій    
    var categories = [    
      {    
        id: 'trending_day',    
        name: 'customhub_trending_day',    
        endpoint: 'trending/all/day',    
        defaultOrder: 1    
      },    
      {    
        id: 'trending_week',    
        name: 'customhub_trending_week',    
        endpoint: 'trending/all/week',    
        defaultOrder: 2    
      },    
      {    
        id: 'popular_movies',    
        name: 'customhub_popular_movies',    
        endpoint: 'movie/popular',    
        defaultOrder: 3    
      },    
      {    
        id: 'popular_tv',    
        name: 'customhub_popular_tv',    
        endpoint: 'tv/popular',    
        defaultOrder: 4    
      },    
      {    
        id: 'top_rated',    
        name: 'customhub_top_rated',    
        endpoint: 'movie/top_rated',    
        defaultOrder: 5    
      },    
      {    
        id: 'upcoming',    
        name: 'customhub_upcoming',    
        endpoint: 'movie/upcoming',    
        defaultOrder: 6    
      }    
    ];    
        
    // Додавання компонента налаштувань    
    Lampa.SettingsApi.addComponent({    
      component: 'customhub',    
      name: Lampa.Lang.translate('customhub_title'),    
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'    
    });    
        
    // Глобальні налаштування    
    Lampa.SettingsApi.addParam({    
      component: 'customhub',    
      param: {    
        name: 'customhub_display_mode',    
        type: 'select',    
        values: {    
          poster: Lampa.Lang.translate('customhub_display_poster'),    
          line: Lampa.Lang.translate('customhub_display_line')    
        },    
        default: 'poster'    
      },    
      field: {    
        name: Lampa.Lang.translate('customhub_display_mode')    
      }    
    });    
        
    // Налаштування для кожної категорії    
    categories.forEach(function(cat) {    
      Lampa.SettingsApi.addParam({    
        component: 'customhub',    
        param: {    
          name: 'customhub_' + cat.id + '_enable',    
          type: 'trigger',    
          default: true    
        },    
        field: {    
          name: Lampa.Lang.translate(cat.name) + ' - ' + Lampa.Lang.translate('customhub_enable')    
        }    
      });    
          
      Lampa.SettingsApi.addParam({    
        component: 'customhub',    
        param: {    
          name: 'customhub_' + cat.id + '_order',    
          type: 'input',    
          default: cat.defaultOrder.toString()    
        },    
        field: {    
          name: Lampa.Lang.translate(cat.name) + ' - ' + Lampa.Lang.translate('customhub_order')    
        }    
      });    
          
      Lampa.SettingsApi.addParam({    
        component: 'customhub',    
        param: {    
          name: 'customhub_' + cat.id + '_shuffle',    
          type: 'trigger',    
          default: false    
        },    
        field: {    
          name: Lampa.Lang.translate(cat.name) + ' - ' + Lampa.Lang.translate('customhub_shuffle')    
        }    
      });    
    });    
        
    // Функція для перемішування масиву    
    function shuffleArray(array) {    
      var shuffled = array.slice();    
      for (var i = shuffled.length - 1; i > 0; i--) {    
        var j = Math.floor(Math.random() * (i + 1));    
        var temp = shuffled[i];    
        shuffled[i] = shuffled[j];    
        shuffled[j] = temp;    
      }    
      return shuffled;    
    }    
        
    // Функція для завантаження даних з TMDB  
    function loadTMDB(endpoint, callback) {    
      console.log('[CustomHub] Завантаження:', endpoint);    
          
      Lampa.TMDB.get(endpoint, function(data) {    
        if (!data) {    
          console.error('[CustomHub] TMDB повернув null для:', endpoint);    
          callback([]);    
          return;    
        }    
            
        var items = data.results || [];    
            
        if (!Array.isArray(items)) {    
          console.error('[CustomHub] TMDB повернув некоректний формат:', data);    
          callback([]);    
          return;    
        }    
            
        console.log('[CustomHub] Отримано елементів:', items.length);    
        callback(items);    
      }, function(error) {    
        console.error('[CustomHub] Помилка TMDB API:', error);    
        callback([]);    
      });    
    }    
        
    // Функція для створення карток з підтримкою режиму відображення  
    function createCards(items, category, displayMode) {      
  if (!items || !Array.isArray(items) || items.length === 0) {      
    console.warn('[CustomHub] Немає даних для категорії:', category.id);      
    return [];      
  }      
        
  var cards = [];      
  var imageBase = 'https://image.tmdb.org/t/p/';  
        
  items.forEach(function(item) {      
    if (!item || !item.id) {      
      console.warn('[CustomHub] Пропущено елемент без ID:', item);      
      return;      
    }      
          
    try {      
      if (!Lampa.Template || typeof Lampa.Template.js !== 'function') {      
        console.error('[CustomHub] Lampa.Template.js недоступний');      
        return;      
      }      
            
      var card = Lampa.Template.js(displayMode === 'line' ? 'line' : 'card');      
            
      if (!card || typeof card.create !== 'function') {      
        console.error('[CustomHub] Template.js повернув некоректний об\'єкт');      
        return;      
      }      
            
      var cardData = {      
        id: item.id,      
        title: item.title || item.name || 'Unknown',      
        original_title: item.original_title || item.original_name,      
        img: item.poster_path ? imageBase + 'w300' + item.poster_path : '',  
        poster: item.poster_path ? imageBase + 'w500' + item.poster_path : '',  
        background_image: item.backdrop_path ? imageBase + 'original' + item.backdrop_path : '',  
        release_date: item.release_date || item.first_air_date || '',  
        vote_average: item.vote_average || 0,  
        number_of_seasons: item.number_of_seasons,  
        first_air_date: item.first_air_date,  
        media_type: category.id.indexOf('tv') >= 0 ? 'tv' : 'movie'      
      };      
            
      card.create(cardData);      
            
      card.onEnter = function() {      
        Lampa.Activity.push({      
          url: '',      
          title: cardData.title,      
          component: 'full',      
          id: cardData.id,      
          method: cardData.media_type === 'tv' ? 'tv' : 'movie',      
          card: cardData      
        });      
      };      
            
      cards.push(card.render());      
            
    } catch(e) {      
      console.error('[CustomHub] Помилка створення картки:', e, item);      
    }      
  });      
        
  return cards;      
    }
        
    
  // Функція для ініціалізації головної сторінки  
    function initHomePage() {        
      Lampa.Listener.follow('activity', function(e) {        
        if (e.component === 'main') {        
          var container = $('.main__content');        
          if (!container.length) return;        
                  
          container.find('.customhub-section').remove();        
                  
          var activeCategories = categories.filter(function(cat) {        
            return Lampa.Storage.get('customhub_' + cat.id + '_enable', true);        
          }).sort(function(a, b) {        
            var orderA = parseInt(Lampa.Storage.get('customhub_' + a.id + '_order', a.defaultOrder));        
            var orderB = parseInt(Lampa.Storage.get('customhub_' + b.id + '_order', b.defaultOrder));        
            return orderA - orderB;        
          });        
                  
          // Рендерити категорії        
          activeCategories.forEach(function(cat) {        
            renderCategory(cat, container);        
          });        
        }        
      });        
    }  
      
    // ВАЖЛИВО: Викликати функцію в кінці    
    initHomePage();  
  
  });  // Закриває waitForLampa callback    
})();  // Закриває головну IIFE
