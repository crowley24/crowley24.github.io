(function () {  
    'use strict';  
      
    console.log("ORIGINAL BADGE PLUGIN: Starting");  
      
    // Використовуємо оригінальні стилі Lampa для .card__quality  
    var style = document.createElement('style');  
    style.id = 'original_badge_style';  
    style.textContent = `  
        .card__quality {  
            position: absolute !important;  
            left: -0.8em !important;  
            bottom: 3em !important;  
            padding: 0.4em 0.4em !important;  
            background: #ffe216 !important;  
            color: #000 !important;  
            font-size: 0.8em !important;  
            border-radius: 0.3em !important;  
            text-transform: uppercase !important;  
            font-weight: bold !important;  
            z-index: 10 !important;  
        }  
          
        /* Dolby Vision - фіолетовий */  
        .card__quality.dv {  
            background: #6B46C1 !important;  
            color: #fff !important;  
        }  
          
        /* HDR - золотий */  
        .card__quality.hdr {  
            background: #FFD700 !important;  
            color: #000 !important;  
        }  
    `;  
    document.head.appendChild(style);  
      
    // Проста функція для додавання бейджів  
    function addOriginalBadges() {  
        var cards = document.querySelectorAll('.card:not([data-original-processed])');  
        console.log("Processing", cards.length, "cards");  
          
        for (var i = 0; i < cards.length; i++) {  
            var card = cards[i];  
            card.setAttribute('data-original-processed', 'true');  
              
            // Симуляція для тестування - чергуємо DV та HDR  
            var badge = document.createElement('div');  
            badge.className = 'card__quality ' + (i % 2 === 0 ? 'dv' : 'hdr');  
            badge.textContent = i % 2 === 0 ? 'DV' : 'HDR';  
            card.appendChild(badge);  
              
            console.log("Added", badge.textContent, "badge to card", i);  
        }  
    }  
      
    // Запуск  
    addOriginalBadges();  
      
    // Спостерігач для нових карток  
    var observer = new MutationObserver(function() {  
        setTimeout(addOriginalBadges, 1000);  
    });  
      
    observer.observe(document.body, {  
        childList: true,  
        subtree: true  
    });  
      
    console.log("ORIGINAL BADGE PLUGIN: Started successfully");  
})();
