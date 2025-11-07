(function() {    
  'use strict';    
      
  function modifyCardifyStyles() {    
    const oldStyle = document.getElementById('cardify-compact-style');    
    if (oldStyle) oldStyle.remove();    
        
    const trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';    
    console.log('[Cardify] Застосування розміру:', trailerSize + '%');    
        
    const style = document.createElement('style');    
    style.id = 'cardify-compact-style';    
        
    style.textContent = `    
      .cardify-trailer__youtube.size-35 { width: 35% !important; }    
      .cardify-trailer__youtube.size-45 { width: 45% !important; }    
      .cardify-trailer__youtube.size-55 { width: 55% !important; }    
      .cardify-trailer__youtube.size-65 { width: 65% !important; }    
          
      .cardify-trailer__youtube {    
        position: fixed !important;    
        top: 45% !important;    
        right: 0.5em !important;    
        bottom: auto !important;    
        left: auto !important;    
        height: auto !important;    
        aspect-ratio: 16/9 !important;    
        max-width: 700px !important;    
        max-height: 400px !important;    
        border-radius: 12px !important;    
        overflow: hidden !important;    
          
        /* Розмитий контур замість чіткої рамки */  
        box-shadow:   
          0 0 60px 30px rgba(0,0,0,0.8),  
          0 0 120px 60px rgba(0,0,0,0.6),  
          0 0 180px 90px rgba(0,0,0,0.4) !important;  
          
        /* Градієнтна маска для плавного переходу по краях */  
        -webkit-mask-image: radial-gradient(ellipse 100% 100% at center,   
          black 40%,   
          rgba(0,0,0,0.8) 60%,   
          rgba(0,0,0,0.4) 80%,   
          transparent 100%) !important;  
        mask-image: radial-gradient(ellipse 100% 100% at center,   
          black 40%,   
          rgba(0,0,0,0.8) 60%,   
          rgba(0,0,0,0.4) 80%,   
          transparent 100%) !important;  
          
        z-index: 50 !important;    
        transform: none !important;    
        opacity: 0.9 !important;    
        transition: opacity 0.3s ease !important;    
        pointer-events: none !important;    
      }    
          
      .cardify-trailer__youtube iframe {    
        width: 130% !important;    
        height: 130% !important;    
        position: absolute !important;    
        top: 50% !important;    
        left: 50% !important;    
        transform: translate(-50%, -50%) scale(1.2) !important;    
        transform-origin: center !important;    
        object-fit: cover !important;    
      }    
          
      .cardify-trailer__youtube-line {    
        display: none !important;    
        visibility: hidden !important;    
      }    
          
      .cardify-trailer__controlls {    
        display: none !important;    
      }    
    `;    
          
    document.head.appendChild(style);    
    applyClassToTrailers(trailerSize);    
  }    
        
  function applyClassToTrailers(trailerSize) {    
    document.querySelectorAll('.cardify-trailer__youtube').forEach(el => {    
      el.className = el.className.replace(/size-\d+/g, '');    
      el.classList.add('size-' + trailerSize);    
      console.log('[Cardify] Додано клас size-' + trailerSize + ' до існуючого трейлера');    
    });    
  }    
        
  // Спостереження за DOM для нових трейлерів    
  const observer = new MutationObserver((mutations) => {    
    const trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';    
          
    mutations.forEach((mutation) => {    
      mutation.addedNodes.forEach((node) => {    
        if (node.nodeType === 1) {    
          if (node.classList && node.classList.contains('cardify-trailer__youtube')) {    
            node.className = node.className.replace(/size-\d+/g, '');    
            node.classList.add('size-' + trailerSize);    
            console.log('[Cardify] Додано клас size-' + trailerSize + ' до нового трейлера');    
          }    
                
          const trailers = node.querySelectorAll('.cardify-trailer__youtube');    
          trailers.forEach(el => {    
            el.className = el.className.replace(/size-\d+/g, '');    
            el.classList.add('size-' + trailerSize);    
          });    
        }    
      });    
    });    
  });    
        
  observer.observe(document.body, {    
    childList: true,    
    subtree: true    
  });    
        
  // Застосувати стилі при завантаженні    
  if (window.appready) {    
    setTimeout(modifyCardifyStyles, 1000);    
  } else {    
    Lampa.Listener.follow('app', function(e) {    
      if (e.type === 'ready') {    
        setTimeout(modifyCardifyStyles, 1000);    
      }    
    });    
  }    
        
  // Слухач події storage для динамічного оновлення розміру    
  Lampa.Listener.follow('storage', function(e) {    
    if (e.name === 'cardify_trailer_size') {    
      console.log('[Cardify] Розмір змінено на:', e.value);    
      modifyCardifyStyles();    
    }    
  });    
})();
