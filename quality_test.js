(function () {  
    'use strict';  
      
    console.log("BRANDED DV/HDR PLUGIN: Starting");  
      
    // Оригінальні стилі Lampa з брендованими лейблами  
    var style = document.createElement('style');  
    style.id = 'branded_dv_hdr_style';  
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
          
        /* Dolby Vision - оригінальний брендинг */  
        .card__quality.dv::before {  
            content: "DOLBY VISION";  
            background: linear-gradient(45deg, #6B46C1, #553C9A) !important;  
            color: #FFFFFF !important;  
            padding: 0.3em 0.5em !important;  
            border-radius: 0.2em !important;  
            font-size: 0.65em !important;  
            letter-spacing: 0.5px !important;  
        }  
          
        /* HDR - оригінальний брендинг */  
        .card__quality.hdr::before {  
            content: "HDR";  
            background: linear-gradient(45deg, #FFD700, #FFA500) !important;  
            color: #000000 !important;  
            padding: 0.3em 0.5em !important;  
            border-radius: 0.2em !important;  
            font-weight: 900 !important;  
        }  
          
        /* HDR10+ - розширений брендинг */  
        .card__quality.hdr10plus::before {  
            content: "HDR10+";  
            background: linear-gradient(45deg, #FF8C00, #FF6347) !important;  
            color: #FFFFFF !important;  
            padding: 0.3em 0.5em !important;  
            border-radius: 0.2em !important;  
            font-size: 0.7em !important;  
        }  
          
        /* Приховуємо оригінальний текст */  
        .card__quality.dv,  
        .card__quality.hdr,  
        .card__quality.hdr10plus {  
            background: transparent !important;  
            color: transparent !important;  
        }  
    `;  
    document.head.appendChild(style);  
      
    // Функція додавання брендованих бейджів  
    function addBrandedBadges() {  
        var cards = document.querySelectorAll('.card:not([data-branded-processed])');  
        console.log("Processing", cards.length, "cards");  
          
        for (var i = 0; i < cards.length; i++) {  
            var card = cards[i];  
            card.setAttribute('data-branded-processed', 'true');  
              
            // Симуляція для тестування - чергуємо брендовані бейджі  
            var badge = document.createElement('div');  
            badge.className = 'card__quality ' + (i % 3 === 0 ? 'dv' : (i % 3 === 1 ? 'hdr' : 'hdr10plus'));  
            badge.textContent = ''; // Порожній текст, використовуємо ::before  
            card.appendChild(badge);  
              
            console.log("Added branded badge to card", i);  
        }  
    }  
      
    // Запуск  
    addBrandedBadges();  
      
    // Спостерігач для нових карток  
    var observer = new MutationObserver(function() {  
        setTimeout(addBrandedBadges, 1000);  
    });  
      
    observer.observe(document.body, {  
        childList: true,  
        subtree: true  
    });  
      
    console.log("BRANDED DV/HDR PLUGIN: Started successfully");  
})();
