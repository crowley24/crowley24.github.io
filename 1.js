//Оригінальний плагін https://github.com/FoxStudio24/lampa/blob/main/Quality/Quality.js  
  
(function () {  
  'use strict';  
  
  console.log('[QualityBadges] Starting with Lampa events approach');  
  
  // Використовуємо вбудовані події Lampa  
  Lampa.Listener.follow('scroll', function(e) {  
    if (e.type === 'end') {  
      console.log('[QualityBadges] Scroll ended, checking for new cards');  
      // Затримка для рендерингу  
      setTimeout(addBadgesToVisibleCards, 500);  
    }  
  });  
  
  Lampa.Listener.follow('content', function(e) {  
    if (e.type === 'loaded') {  
      console.log('[QualityBadges] Content loaded');  
      setTimeout(addBadgesToVisibleCards, 1000);  
    }  
  });  
  
  function addBadgesToVisibleCards() {  
    // Шукаємо картки в видимій області  
    var visibleCards = $('.card').filter(function() {  
      var card = $(this);  
      var rect = this.getBoundingClientRect();  
      return rect.top < window.innerHeight && rect.bottom > 0;  
    });  
  
    console.log('[QualityBadges] Found visible cards:', visibleCards.length);  
  
    visibleCards.each(function() {  
      var card = $(this);  
      if (!card.hasClass('quality-processed')) {  
        card.addClass('quality-processed');  
        var movie = card.data('movie') || card.data('item');  
          
        if (movie) {  
          console.log('[QualityBadges] Processing:', movie.title || movie.name);  
          // Тут логіка додавання бейджів  
        }  
      }  
    });  
  }  
  
  // Початкова перевірка  
  setTimeout(addBadgesToVisibleCards, 2000);  
  
})();
