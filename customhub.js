(function() {  
  'use strict';  
    
  // Перевірка доступності Lampa API  
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
      // Увімкнути/вимкнути  
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
        
      // Порядок відображення  
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
        
      // Перемішування  
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
      var url = Lampa.TMDB.api(endpoint);  
        
      Lampa.TMDB.get(endpoint, function(data) {  
        if (data && data.results) {  
          callback(data.results);  
        } else {  
          callback([]);  
        }  
      }, function() {  
        callback([]);  
      });  
    }  
      
    // Функція для завантаження даних з CUB  
    function loadCUB(endpoint, callback) {  
      // CUB використовує той же TMDB API через проксі  
      loadTMDB(endpoint, callback);  
    }  
      
    // Функція для створення карток  
    function createCards(items, displayMode) {  
      var cards = [];  
        
      items.forEach(function(item) {  
        var card = Lampa.Template.js('card');  
          
        card.find('.card__img').attr('src', Lampa.TMDB.image('w300' + (item.poster_path || item.backdrop_path)));  
        card.find('.card__title').text(item.title || item.name);  
          
        if (item.vote_average) {  
          card.find('.card__vote').text(item.vote_average.toFixed(1));  
        }  
          
        if (displayMode === 'line') {  
          card.addClass('card--line');  
        }  
          
        card.on('hover:enter', function() {  
          Lampa.Activity.push({  
            url: '',  
            title: item.title || item.name,  
            component: 'full',  
            id: item.id,  
            method: item.first_air_date ? 'tv' : 'movie',  
            card: item  
          });  
        });  
          
        cards.push(card);  
      });  
        
      return cards;  
    }  
      
    // Функція для рендерингу категорії  
    function renderCategory(cat, container) {  
      var enabled = Lampa.Storage.get('customhub_' + cat.id + '_enable', true);  
      if (!enabled) return;  
        
      var shuffle = Lampa.Storage.get('customhub_' + cat.id + '_shuffle', false);  
      var displayMode = Lampa.Storage.get('customhub_display_mode', 'poster');  
        
      var section = $('<div class="customhub-section"></div>');  
      var title = $('<div class="customhub-section__title">' + Lampa.Lang.translate(cat.name) + '</div>');  
      var content = $('<div class="customhub-section__content"></div>');  
        
      section.append(title);  
      section.append(content);  
      container.append(section);  
        
      loadTMDB(cat.endpoint, function(items) {  
        if (shuffle) {  
          items = shuffleArray(items);  
        }  
          
        var cards = createCards(items.slice(0, 20), displayMode);  
          
        cards.forEach(function(card) {  
          content.append(card);  
        });  
          
        Lampa.Controller.collectionSet(content);  
      });  
    }  
      
    // Інтеграція з головною сторінкою  
    function initHomePage() {  
      Lampa.Listener.follow('activity', function(e) {  
        if (e.component === 'main') {  
          var container = $('.main__content');  
          if (!container.length) return;  
            
          // Видалити попередні категорії  
          container.find('.customhub-section').remove();  
            
          // Отримати активні категорії та відсортувати  
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
      
    // Додати стилі  
    function injectStyles() {  
      if (document.getElementById('customhub-styles')) return;  
        
      var css = `  
        .customhub-section {  
          margin-bottom: 2em;  
        }  
          
        .customhub-section__title {  
          font-size: 1.5em;  
          font-weight: bold;  
          margin-bottom: 1em;  
          padding: 0 1em;  
        }  
          
        .customhub-section__content {  
          display: flex;  
          overflow-x: auto;  
          padding: 0 1em;  
          gap: 1em;  
        }  
          
        .customhub-section__content .card {  
          flex-shrink: 0;  
        }  
      `;  
        
      var style = document.createElement('style');  
      style.id = 'customhub-styles';  
      style.textContent = css;  
      document.head.appendChild(style);  
    }  
      
    // Ініціалізація  
    injectStyles();  
    initHomePage();  
      
    console.log('[CustomHub] Плагін успішно завантажено');  
  });  
})();
