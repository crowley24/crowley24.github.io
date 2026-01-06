//Оригінальний плагін https://github.com/FoxStudio24/lampa/blob/main/Quality/Quality.js  
  
(function () {  
  'use strict';  
  
  console.log('[QualityBadges] Plugin started');  
  
  // Перевірка доступності залежностей  
  if (typeof $ === 'undefined') {  
    console.error('[QualityBadges] jQuery not available');  
    return;  
  }  
  
  if (typeof Lampa === 'undefined') {  
    console.error('[QualityBadges] Lampa not available');  
    return;  
  }  
  
  console.log('[QualityBadges] Dependencies OK');  
  
  // Функція для тестування карток  
  function testCardProcessing() {  
    console.log('[QualityBadges] === Testing card processing ===');  
      
    // Тестуємо різні селектори  
    var selectors = [  
      '.card',  
      '.items-cards .card',  
      '.scroll__content .card',  
      '[class*="card"]',  
      '.card--item',  
      '.movie-card',  
      '.poster'  
    ];  
      
    selectors.forEach(function(selector) {  
      var elements = $(selector);  
      console.log('[QualityBadges] Selector "' + selector + '":', elements.length, 'elements');  
        
      if (elements.length > 0) {  
        elements.each(function(index) {  
          var element = $(this);  
          var hasData = !!element.data('item');  
          var title = element.find('.card__title, .title, [class*="title"]').text();  
          console.log('[QualityBadges] Element', index, '- has data:', hasData, '- title:', title);  
        });  
      }  
    });  
      
    // Перевіряємо структуру DOM  
    console.log('[QualityBadges] Body classes:', document.body.className);  
    console.log('[QualityBadges] Main containers:', $('.scroll__content, .items-cards, .content, main').length);  
  }  
  
  // Запускаємо тести з різними затримками  
  console.log('[QualityBadges] Setting up test timers...');  
    
  setTimeout(function() {  
    console.log('[QualityBadges] Running test after 2 seconds...');  
    testCardProcessing();  
  }, 2000);  
    
  setTimeout(function() {  
    console.log('[QualityBadges] Running test after 5 seconds...');  
    testCardProcessing();  
  }, 5000);  
    
  setTimeout(function() {  
    console.log('[QualityBadges] Running test after 10 seconds...');  
    testCardProcessing();  
  }, 10000);  
  
  // Додаємо кнопку для тестування  
  setTimeout(function() {  
    $('body').append('<button id="quality-test-btn" style="position: fixed; top: 10px; right: 10px; z-index: 9999; background: red; color: white; padding: 10px;">Test Quality</button>');  
    $('#quality-test-btn').on('click', function() {  
      console.log('[QualityBadges] Manual test triggered');  
      testCardProcessing();  
    });  
  }, 3000);  
  
  console.log('[QualityBadges] Plugin initialized with test mode');  
  
})();
