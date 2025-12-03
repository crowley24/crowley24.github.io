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
        font-size: 1.3em;    
        font-weight: bold;    
        margin-bottom: 1em;    
        color: #fff;    
      }    
      .customhub-cards {    
        display: grid;    
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));    
        gap: 1em;    
      }    
      .customhub-card {    
        position: relative;    
        background-size: cover;    
        background-position: center;    
        border-radius: 0.5em;    
        overflow: hidden;    
      }    
      .customhub-card__overlay {    
        position: absolute;    
        bottom: 0;    
        left: 0;    
        right: 0;    
        background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);    
        padding: 1em;    
      }    
      .customhub-card__title {    
        color: #fff;    
        font-size: 0.9em;    
        font-weight: bold;    
        margin: 0;    
      }    
      .customhub-card__year {    
        color: #ccc;    
        font-size: 0.8em;    
        margin-top: 0.2em;    
      }    
      // ✅ Додати стилі для відображення якості    
      .full-start__status.surs_quality {    
        color: #ff6b6b !important;    
        font-size: 0.8em;    
        font-weight: bold;    
        padding: 0.2em 0.5em;    
        background: rgba(0,0,0,0.7);    
        border-radius: 0.3em;    
        margin-left: 0.5em;    
      }    
    `;    
    document.head.appendChild(style);    
          
    // Локалізація    
    Lampa.Lang.add({    
      customhub: {    
        en: 'Custom Hub',    
        uk: 'Custom Hub',    
        ru: 'Custom Hub'    
      }    
    });    
          
    // Налаштування    
    var categories = [    
      { id: 'trending', name: 'Trending', endpoint: 'trending/movie/day', defaultOrder: 1 },    
      { id: 'popular', name: 'Popular', endpoint: 'movie/popular', defaultOrder: 2 },    
      { id: 'top_rated', name: 'Top Rated', endpoint: 'movie/top_rated', defaultOrder: 3 },    
      { id: 'upcoming', name: 'Upcoming', endpoint: 'movie/upcoming', defaultOrder: 4 }    
    ];    
          
    // Функція завантаження даних з TMDB    
    function loadTMDB(endpoint, callback) {    
      Lampa.TMDB.get(endpoint, function(data) {    
        if (data && data.results) {    
          callback(data.results);    
        } else {    
          callback([]);    
        }    
      });    
    }    
          
    // Функція створення карток    
    function createCards(movies, container) {    
      var cardsContainer = document.createElement('div');    
      cardsContainer.className = 'customhub-cards';    
          
      movies.forEach(function(movie) {    
        var card = Lampa.Template.js('card');    
        card.create({    
          title: movie.title,    
          poster: movie.poster_path ? 'https://image.tmdb.org/t/p/w500' + movie.poster_path : null,    
          year: movie.release_date ? movie.release_date.split('-')[0] : null    
        });    
          
        var cardElement = card.render();    
          
        // ✅ Додати відображення якості    
        var qualityElement = document.createElement('div');    
        qualityElement.className = 'full-start__status surs_quality';    
        qualityElement.textContent = 'HD'; // Можна динамічно визначати якість    
          
        // Знайти область рейтингу та додати якість    
        var rateLine = cardElement.querySelector('.full-start-new__rate-line');    
        if (rateLine) {    
          rateLine.appendChild(qualityElement);    
        }    
          
        cardsContainer.appendChild(cardElement);    
      });    
          
      container.appendChild(cardsContainer);    
    }    
          
    // Функція рендерингу категорії    
    function renderCategory(category, container) {    
      var section = document.createElement('div');    
      section.className = 'customhub-section';    
          
      var title = document.createElement('div');    
      title.className = 'customhub-section__title';    
      title.textContent = category.name;    
      section.appendChild(title);    
          
      loadTMDB(category.endpoint, function(movies) {    
        createCards(movies.slice(0, 10), section); // Обмежити до 10 фільмів    
      });    
          
      container.appendChild(section);    
    }    
          
    // Ініціалізація головної сторінки    
    function initHomePage() {    
      Lampa.Listener.follow('app', function(e) {    
        if (e.type === 'ready') {    
          var mainContainer = document.querySelector('.full-start-new');    
          if (mainContainer) {    
            var customContainer = document.createElement('div');    
            customContainer.className = 'customhub-container';    
              
            // Сортування категорій    
            var activeCategories = categories.filter(function(cat) {    
              return Lampa.Storage.get('customhub_' + cat.id + '_enabled', true);    
            }).sort(function(a, b) {    
              var orderA = parseInt(Lampa.Storage.get('customhub_' + a.id + '_order', a.defaultOrder));    
              var orderB = parseInt(Lampa.Storage.get('customhub_' + b.id + '_order', b.defaultOrder));    
              return orderA - orderB;    
            });    
                    
            // Рендерити категорії    
            activeCategories.forEach(function(cat) {    
              renderCategory(cat, customContainer);    
            });    
              
            mainContainer.appendChild(customContainer);    
          }    
        }    
      });    
    }    
        
    // ВАЖЛИВО: Викликати функцію в кінці      
    initHomePage();    
    
  });  // Закриває waitForLampa callback      
})(
