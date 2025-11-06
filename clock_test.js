(function() {      
  'use strict';      
        
  function waitForLampa(callback) {      
    if (window.Lampa && Lampa.Storage && Lampa.Lang && Lampa.SettingsApi) {      
      callback();      
    } else {      
      setTimeout(function() { waitForLampa(callback); }, 100);      
    }      
  }      
        
  waitForLampa(function() {      
    if (window.clockchanger_plugin) return;      
    window.clockchanger_plugin = true;      
          
    console.log('[ClockChanger] Ініціалізація плагіна');      
          
    // Локалізація      
    Lampa.Lang.add({      
      clockchanger_title: {      
        en: 'Clock Style',      
        uk: 'Стиль годинника',      
        ru: 'Стиль часов'      
      },      
      clockchanger_style: {      
        en: 'Clock style',      
        uk: 'Стиль годинника',      
        ru: 'Стиль часов'      
      },      
      clockchanger_default: {      
        en: 'Default',      
        uk: 'За замовчуванням',      
        ru: 'По умолчанию'      
      },      
      clockchanger_bubble: {      
        en: 'Bubble Clock',      
        uk: 'Бульбашка',      
        ru: 'Пузырь'      
      },      
      clockchanger_netflix: {      
        en: 'Netflix Style',      
        uk: 'Стиль Netflix',      
        ru: 'Стиль Netflix'      
      },      
      clockchanger_minimal: {      
        en: 'Minimal',      
        uk: 'Мінімальний',      
        ru: 'Минимальный'      
      },      
      clockchanger_digital: {      
        en: 'Digital',      
        uk: 'Цифровий',      
        ru: 'Цифровой'      
      },      
      clockchanger_neon: {      
        en: 'Neon',      
        uk: 'Неон',      
        ru: 'Неон'      
      }      
    });      
          
    // Конфігурація стилів годинника      
    var clockStyles = {      
      default: {      
        name: 'clockchanger_default',      
        css: `      
          .custom-clock {      
            background: rgba(0, 0, 0, 0.3) !important;      
            border-radius: 8px !important;      
            padding: 8px 16px !important;      
            font-size: 1em !important;      
            color: #fff !important;      
            margin-left: 10px !important;  
          }      
        `      
      },      
      bubble: {      
        name: 'clockchanger_bubble',      
        css: `      
          .custom-clock {      
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;      
            border-radius: 50px !important;      
            padding: 10px 24px !important;      
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.5) !important;      
            font-weight: 700 !important;      
            letter-spacing: 2px !important;      
            font-size: 1.1em !important;      
            animation: bubble-pulse 3s ease-in-out infinite !important;      
            border: 2px solid rgba(255, 255, 255, 0.3) !important;      
            backdrop-filter: blur(10px) !important;      
            color: #fff !important;      
            margin-left: 10px !important;  
          }      
          @keyframes bubble-pulse {      
            0%, 100% {      
              transform: scale(1);      
              box-shadow: 0 10px 25px rgba(102, 126, 234, 0.5);      
            }      
            50% {      
              transform: scale(1.05);      
              box-shadow: 0 15px 35px rgba(102, 126, 234, 0.7);      
            }      
          }      
        `      
      },      
      netflix: {      
        name: 'clockchanger_netflix',      
        css: `      
          .custom-clock {      
            background: #E50914 !important;      
            border-radius: 4px !important;      
            padding: 10px 20px !important;      
            font-weight: 700 !important;      
            font-size: 1.1em !important;      
            box-shadow: 0 4px 12px rgba(229, 9, 20, 0.4) !important;      
            color: #fff !important;      
            margin-left: 10px !important;  
          }      
        `      
      },      
      minimal: {      
        name: 'clockchanger_minimal',      
        css: `      
          .custom-clock {      
            background: rgba(255, 255, 255, 0.1) !important;      
            border-radius: 12px !important;      
            padding: 8px 18px !important;      
            backdrop-filter: blur(20px) !important;      
            border: 1px solid rgba(255, 255, 255, 0.2) !important;      
            font-size: 1em !important;      
            color: #fff !important;      
            margin-left: 10px !important;  
          }      
        `      
      },      
      digital: {      
        name: 'clockchanger_digital',      
        css: `      
          .custom-clock {      
            background: #000 !important;      
            border-radius: 6px !important;      
            padding: 10px 20px !important;      
            font-family: 'Courier New', monospace !important;      
            font-size: 1.2em !important;      
            color: #0f0 !important;      
            text-shadow: 0 0 10px #0f0 !important;      
            border: 2px solid #0f0 !important;      
            margin-left: 10px !important;  
          }      
        `      
      },      
      neon: {      
        name: 'clockchanger_neon',      
        css: `      
          .custom-clock {      
            background: rgba(0, 0, 0, 0.8) !important;      
            border-radius: 8px !important;      
            padding: 10px 20px !important;      
            font-size: 1.1em !important;      
            color: #ff006e !important;      
            text-shadow: 0 0 10px #ff006e, 0 0 20px #ff006e, 0 0 30px #ff006e !important;      
            border: 2px solid #ff006e !important;      
            animation: neon-flicker 1.5s infinite alternate !important;      
            margin-left: 10px !important;  
          }      
          @keyframes neon-flicker {      
            0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {      
              text-shadow: 0 0 10px #ff006e, 0 0 20px #ff006e, 0 0 30px #ff006e;      
            }      
            20%, 24%, 55% {      
              text-shadow: none;      
            }      
          }      
        `      
      }      
    };      
          
    var clockElement = null;      
    var clockInterval = null;      
          
    // Функція для створення годинника      
    function createClock() {  
      function insertClock() {  
        var header = document.querySelector('.head') ||   
                     document.querySelector('.header') ||   
                     document.querySelector('[class*="head"]');  
          
        if (header) {  
          var buttonsContainer = header.querySelector('[class*="buttons"]') ||   
                                header.querySelector('[class*="right"]') ||   
                                header.querySelector('[class*="action"]');  
            
          if (buttonsContainer) {  
            // ВИПРАВЛЕННЯ: просто додати в кінець контейнера (після трьох крапок)  
            buttonsContainer.appendChild(clockElement);  
              
            console.log('[ClockChanger] Годинник додано до header');  
            return true;  
          }  
        }  
          
        // Fallback  
        console.warn('[ClockChanger] Header не знайдено, використовую fallback позицію');  
        document.body.appendChild(clockElement);  
        clockElement.style.cssText += `  
          position: fixed;  
          top: 20px;  
          right: 20px;  
          z-index: 99999;  
        `;  
        return false;  
      }  
        
      // Створити елемент годинника  
      if (clockInterval) {  
        clearInterval(clockInterval);  
      }  
        
      if (clockElement) {  
        clockElement.remove();  
      }  
        
      clockElement = document.createElement('div');  
      clockElement.className = 'custom-clock';  
      clockElement.style.cssText = `  
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;  
        user-select: none;  
        pointer-events: none;  
        display: inline-flex;  
        align-items: center;  
      `;  
        
      function updateTime() {  
        var now = new Date();  
        var hours = String(now.getHours()).padStart(2, '0');  
        var minutes = String(now.getMinutes()).padStart(2, '0');  
        clockElement.textContent = hours + ':' + minutes;  
      }  
        
      updateTime();  
      clockInterval = setInterval(updateTime, 1000);  
        
      // Спробувати вставити з затримкою  
      var retries = 0;  
      var maxRetries = 20;  
        
      function tryInsert() {  
        if (insertClock() || retries >= maxRetries) {  
          return;  
        }  
        retries++;  
        setTimeout(tryInsert, 500);  
      }  
        
      tryInsert();  
    }  
          
    // Додавання компонента налаштувань (БЕЗ type: 'select')  
    Lampa.SettingsApi.addComponent({      
      component: 'clockchanger',      
      name: Lampa.Lang.translate('clockchanger_title'),      
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'      
    });      
          
    // Налаштування вибору стилю (ВИКОРИСТОВУЄМО TRIGGER ЗАМІСТЬ SELECT)  
    Object.keys(clockStyles).forEach(function(styleKey) {  
      var style = clockStyles[styleKey];  
      Lampa.SettingsApi.addParam({  
        component: 'clockchanger',  
        param: {  
          name: 'clockchanger_style_' + styleKey,  
          type: 'trigger',  
          default: styleKey === 'bubble'  
        },  
        field: {  
          name: Lampa.Lang.translate(style.name)  
        },  
        onChange: function(value) {  
          if (value) {  
            // Вимкнути всі інші стилі  
            Object.keys(clockStyles).forEach(function(key) {  
              if (key !== styleKey) {  
                Lampa.Storage.set('clockchanger_style_' + key, false);  
              }  
            });  
            Lampa.Storage.set('clockchanger_selected', styleKey);  
            applyClockStyle(styleKey);  
          }  
        }  
      });  
    });  
          
    // Функція для застосування стилю      
    function applyClockStyle(styleKey) {      
      var style = clockStyles[styleKey];      
      if (!style) return;      
            
      // Видалити попередні стилі      
      var oldStyle = document.getElementById('clockchanger-style');      
      if (oldStyle) oldStyle.remove();      
            
      // Застосувати новий стиль      
      if (style.css) {      
        var styleElement = document.createElement('style');      
        styleElement.id = 'clockchanger-style';      
        styleElement.textContent = style.css;      
        document.head.appendChild(styleElement);      
      }      
            
      console.log('[ClockChanger] Застосовано стиль:', styleKey);      
    }      
          
    // Ініціалізація при завантаженні Lampa      
    function init() {      
      // Створити годинник      
      createClock();      
            
      // Застосувати збережений стиль      
      var savedStyle = Lampa.Storage.get('clockchanger_selected', 'bubble');      
      applyClockStyle(savedStyle);      
    }      
          
    // Чекати поки Lampa повністю завантажиться      
    if (Lampa.Listener) {      
      Lampa.Listener.follow('app', function(e) {      
        if (e.type === 'ready') {      
          init();      
        }      
      });      
    } else {      
      // Якщо Listener недоступний, ініціалізувати через таймаут      
      setTimeout(init, 1000);      
    }      
          
  });  // Закриває waitForLampa callback    
})();
