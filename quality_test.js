(function () {  
    'use strict';  
      
    console.log("ORIGINAL DV/HDR PLUGIN: Starting");  
      
    // Використовуємо оригінальні стилі Lampa з кольоровими варіаціями  
    var style = document.createElement('style');  
    style.id = 'original_dv_hdr_style';  
    style.textContent = `  
        .card__quality {  
            position: absolute !important;  
            left: -0.8em !important;  
            bottom: 3em !important;  
            padding: 0.4em 0.4em !important;  
            font-size: 0.8em !important;  
            -webkit-border-radius: 0.3em !important;  
            -moz-border-radius: 0.3em !important;  
            border-radius: 0.3em !important;  
            text-transform: uppercase !important;  
            font-weight: bold !important;  
            z-index: 10 !important;  
        }  
          
        /* Dolby Vision - фіолетовий */  
        .card__quality.dv {  
            background: #6B46C1 !important;  
            color: #FFFFFF !important;  
        }  
          
        /* HDR - золотий */  
        .card__quality.hdr {  
            background: #FFD700 !important;  
            color: #000000 !important;  
        }  
          
        /* Оригінальний жовтий для інших якостей */  
        .card__quality.default {  
            background: #ffe216 !important;  
            color: #000 !important;  
        }  
    `;  
    document.head.appendChild(style);  
      
    // Функція додавання оригінальних бейджів  
    function addOriginalBadges() {  
        var cards = document.querySelectorAll('.card:not([data-original-dv-hdr])');  
        console.log("Processing", cards.length, "cards");  
          
        for (var i = 0; i < cards.length; i++) {  
            var card = cards[i];  
            card.setAttribute('data-original-dv-hdr', 'true');  
              
            // Симуляція для тестування - чергуємо DV, HDR та default  
            var badge = document.createElement('div');  
            var badgeType = i % 3;  
              
            if (badgeType === 0) {  
                badge.className = 'card__quality dv';  
                badge.textContent = 'DV';  
            } else if (badgeType === 1) {  
                badge.className = 'card__quality hdr';  
                badge.textContent = 'HDR';  
            } else {  
                badge.className = 'card__quality default';  
                badge.textContent = '4K';  
            }  
              
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
      
    console.log("ORIGINAL DV/HDR PLUGIN: Started successfully");  
})();
