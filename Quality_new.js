(function() {  
    'use strict';  
      
    function initBadges() {  
        console.log('[Badges] Initializing badge system...');  
          
        // Спочатку перевіримо доступність jQuery  
        if (typeof $ === 'undefined') {  
            console.error('[Badges] jQuery not available');  
            return;  
        }  
          
        // Додамо стилі  
        let style = `  
<style>  
.card__quality .badge-dv,  
.card__quality .badge-hdr,  
.card__quality .badge-hdr10plus,  
.card__quality .badge-atmos{  
    display:inline-block !important;  
    padding:2px 6px !important;  
    font-size:10px !important;  
    font-weight:700 !important;  
    border-radius:4px !important;  
    margin-left:4px !important;  
    background:linear-gradient(145deg,#000,#1a1a1a) !important;  
    color:#fff !important;  
    border:1px solid rgba(255,255,255,0.25) !important;  
    box-shadow:0 0 4px rgba(0,0,0,0.5) !important;  
}  
  
.badge-dv::after{ content:"DV"; color:#8c4bff; font-weight:800; }  
.badge-hdr::after{ content:"HDR"; color:#ffd644; }  
.badge-hdr10plus::after{ content:"HDR10+"; color:#ff7f2a; }  
.badge-atmos::after{ content:"ATMOS"; color:#4ba3ff; }  
</style>  
`;  
        $('head').append(style);  
        console.log('[Badges] Styles added');  
          
        // Обробник події  
        Lampa.Listener.follow('card_build', function(event) {  
            try {  
                console.log('[Badges] Card build event received');  
                console.log('[Badges] Event data:', event);  
                  
                let card = event.card;  
                let data = event.data;  
                  
                if (!card) {  
                    console.log('[Badges] No card element');  
                    return;  
                }  
                  
                console.log('[Badges] Card data:', data);  
                  
                let text = JSON.stringify(data).toLowerCase();  
                console.log('[Badges] Analyzed text:', text);  
                  
                let tags = [];  
                  
                if (text.includes("dolby vision") || text.includes("dovi") || text.includes("dv"))  
                    tags.push('dv');  
                if (text.includes("hdr10+"))  
                    tags.push('hdr10plus');  
                if (text.includes("hdr"))  
                    tags.push('hdr');  
                if (text.includes("atmos"))  
                    tags.push('atmos');  
                  
                console.log('[Badges] Found tags:', tags);  
                  
                if (tags.length) {  
                    let container = $(card).find('.card__quality');  
                    console.log('[Badges] Container found:', container.length > 0);  
                      
                    if (container.length > 0) {  
                        tags.forEach(tag => {  
                            let badge = $('<div class="badge-' + tag + '"></div>');  
                            container.append(badge);  
                            console.log('[Badges] Added badge:', tag);  
                        });  
                    } else {  
                        console.log('[Badges] .card__quality container not found');  
                        // Спробуємо альтернативні контейнери  
                        let altContainer = $(card).find('.card__vote, .card__icons').first();  
                        if (altContainer.length > 0) {  
                            console.log('[Badges] Using alternative container');  
                            tags.forEach(tag => {  
                                altContainer.append('<div class="badge-' + tag + '" style="margin-left:4px;"></div>');  
                            });  
                        }  
                    }  
                }  
            } catch (e) {  
                console.error('[Badges] Error:', e);  
            }  
        });  
          
        console.log('[Badges] Badge system initialized');  
    }  
      
    // Перевірка готовності Lampa  
    if (window.appready) {  
        initBadges();  
    } else {  
        Lampa.Listener.follow('app', function(e) {  
            if (e.type === 'ready') {  
                setTimeout(initBadges, 2000);  
            }  
        });  
    }  
})();
