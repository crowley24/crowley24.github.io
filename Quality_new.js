(function() {  
    'use strict';  
      
    function initBadges() {  
        Lampa.Listener.follow('card_build',(event)=>{  
            try {  
                let card = event.card;  
                let data = event.data;  
  
                if(!card) return;  
  
                console.log('Processing card:', data);  
                  
                let text = JSON.stringify(data).toLowerCase();  
                let tags = [];  
  
                if(text.includes("dolby vision") || text.includes("dovi") || text.includes("dv"))  
                    tags.push('dv');  
  
                if(text.includes("hdr10+"))  
                    tags.push('hdr10plus');  
  
                if(text.includes("hdr"))  
                    tags.push('hdr');  
  
                if(text.includes("atmos"))  
                    tags.push('atmos');  
  
                console.log('Found tags:', tags);  
  
                if(tags.length){  
                    let container = $(card).find('.card__quality');  
                      
                    if (container.length === 0) {  
                        console.log('Quality container not found, searching...');  
                        container = $(card).find('[class*="quality"], [class*="vote"], [class*="icons"]');  
                    }  
                      
                    if (container.length > 0) {  
                        tags.forEach(t=>{  
                            container.append(`<div class="badge-${t}"></div>`);  
                        });  
                        console.log('Badges added successfully:', tags);  
                    } else {  
                        console.log('No container found for badges');  
                    }  
                }  
            } catch(e) {  
                console.error('Badge processing error:', e);  
            }  
        });  
    }  
      
    // Додавання стилів  
    let style = `  
<style>  
.card__quality .badge-dv,  
.card__quality .badge-hdr,  
.card__quality .badge-hdr10plus,  
.card__quality .badge-atmos{  
    display:inline-flex !important;  
    align-items:center !important;  
    justify-content:center !important;  
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
      
    // Запуск після готовності додатку  
    if (window.appready) {  
        initBadges();  
    } else {  
        Lampa.Listener.follow('app', function(e) {  
            if (e.type === 'ready') {  
                setTimeout(initBadges, 1000);  
            }  
        });  
    }  
})();
