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
      },  
      clockchanger_retro: {  
        en: 'Retro',  
        uk: 'Ретро',  
        ru: 'Ретро'  
      },  
      clockchanger_glass: {  
        en: 'Glass',  
        uk: 'Скло',  
        ru: 'Стекло'  
      },  
      clockchanger_fire: {  
        en: 'Fire',  
        uk: 'Вогонь',  
        ru: 'Огонь'  
      },  
      clockchanger_ice: {  
        en: 'Ice',  
        uk: 'Лід',  
        ru: 'Лёд'  
      }  
    });      
          
    // Конфігурація стилів годинника (10 стилів)  
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
            color: #fff !important;      
            box-shadow: 0 4px 12px rgba(229, 9, 20, 0.4) !important;      
            text-transform: uppercase !important;      
            letter-spacing: 1px !important;      
            margin-left: 10px !important;  
          }      
        `      
      },      
      minimal: {      
        name: 'clockchanger_minimal',      
        css: `      
          .custom-clock {      
            background: rgba(255, 255, 255, 0.1) !important;      
            backdrop-filter: blur(20px) !important;      
            border-radius: 12px !important;      
            padding: 8px 18px !important;      
            font-size: 1em !important;      
            color: #fff !important;      
            border: 1px solid rgba(255, 255, 255, 0.2) !important;      
            margin-left: 10px !important;  
          }      
        `      
      },      
      digital: {      
        name: 'clockchanger_digital',      
        css: `      
          .custom-clock {      
            background: #000 !important;      
            border: 2px solid #0f0 !important;      
            border-radius: 6px !important;      
            padding: 10px 20px !important;      
            font-family: 'Courier New', monospace !important;      
            font-size: 1.2em !important;      
            color: #0f0 !important;      
            text-shadow: 0 0 10px #0f0, 0 0 20px #0f0 !important;      
            letter-spacing: 3px !important;      
            margin-left: 10px !important;  
          }      
        `      
      },      
      neon: {      
        name: 'clockchanger_neon',      
        css: `      
          .custom-clock {      
            background: rgba(0, 0, 0, 0.8) !important;      
            border-radius: 10px !important;      
            padding: 12px 24px !important;      
            font-weight: 700 !important;      
            font-size: 1.2em !important;      
            color: #ff006e !important;      
            text-shadow: 0 0 10px #ff006e, 0 0 20px #ff006e, 0 0 30px #ff006e !important;      
            animation: neon-flicker 2s infinite alternate !important;      
            border: 2px solid #ff006e !important;      
            box-shadow: 0 0 20px #ff006e !important;      
            margin-left: 10px !important;  
          }      
          @keyframes neon-flicker {      
            0%, 100% { opacity: 1; }      
            50% { opacity: 0.8; }      
          }      
        `      
      },  
      retro: {  
        name: 'clockchanger_retro',  
        css: `  
          .custom-clock {  
            background: linear-gradient(180deg, #ff6b6b 0%, #ee5a6f 100%) !important;  
            border-radius: 20px !important;  
            padding: 12px 28px !important;  
            font-family: 'Comic Sans MS', cursive !important;  
            font-weight: 900 !important;  
            font-size: 1.3em !important;  
            color: #fff !important;  
            text-shadow: 3px 3px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000 !important;  
            border: 4px solid #000 !important;  
            box-shadow: 5px 5px 0px #000 !important;  
            transform: rotate(-2deg) !important;  
            margin-left: 10px !important;  
          }  
        `  
      },  
      glass: {  
        name: 'clockchanger_glass',  
        css: `  
          .custom-clock {  
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)) !important;  
            backdrop-filter: blur(30px) saturate(180%) !important;  
            border-radius: 16px !important;  
            padding: 10px 22px !important;  
            font-size: 1.1em !important;  
            color: #fff !important;  
            border: 1px solid rgba(255, 255, 255, 0.3) !important;  
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;  
            margin-left: 10px !important;  
          }  
        `  
      },  
      fire: {  
        name: 'clockchanger_fire',  
        css: `  
          .custom-clock {  
            background: linear-gradient(45deg, #ff0000, #ff7f00, #ffff00) !important;  
            background-size: 200% 200% !important;  
            animation: fire-gradient 3s ease infinite !important;  
            border-radius: 12px !important;  
            padding: 12px 24px !important;  
            font-weight: 800 !important;  
            font-size: 1.2em !important;  
            color: #fff !important;  
            text-shadow: 0 0 10px rgba(255, 0, 0, 0.8), 0 0 20px rgba(255, 127, 0, 0.6) !important;  
            border: 2px solid rgba(255, 255, 0, 0.5) !important;  
            box-shadow: 0 0 20px rgba(255, 127, 0, 0.6), inset 0 0 20px rgba(255, 0, 0, 0.3) !important;  
            margin-left: 10px !important;  
          }  
          @keyframes fire-gradient {  
            0% { background-position: 0% 50%; }  
            50% { background-position: 100% 50%; }  
            100% { background-position: 0% 50%; }  
          }  
        `  
      },  
      ice: {  
        name: 'clockchanger_ice',  
        css: `  
          .custom-clock {  
            background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%) !important;  
            border-radius: 10px !important;  
            padding: 10px 22px !important;  
            font-weight: 700 !important;  
            font-size: 1.1em !important;  
            color: #fff !important;  
            text-shadow: 0 0 10px rgba(0, 212, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.3) !important;  
            border: 2px solid rgba(255, 255, 255, 0.4) !important;  
            box-shadow: 0 8px 32px rgba(0, 212, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5) !important;  
            animation: ice-shimmer 4s ease-in-out infinite !important;  
            margin-left: 10px !important;  
          }  
          @keyframes ice-shimmer {  
            0%, 100% { filter: brightness(1); }  
            50% { filter: brightness(1.2); }  
          }  
        `  
      }  
    };      
          
    var clockElement = null;      
    var clockInterval = null;      
          
    function createClock() {      
      function insertClock() {  
        // ВИПРАВЛЕННЯ: Шукаємо кнопку меню (три крапки) за різними селекторами  
        var menuButton = document.querySelector('[class*="menu"]') ||  
                        document.querySelector('[class*="settings"]') ||  
                        document.querySelector('[class*="dots"]') ||  
                        document.querySelector('.head__action') ||  
                        document.querySelector('.header__action');  
          
        if (menuButton) {  
          // Вставляємо годинник ПІСЛЯ кнопки меню  
          if (menuButton.parentNode) {  
            menuButton.parentNode.insertBefore(clockElement, menuButton.nextSibling);  
            console.log('[ClockChanger] Годинник додано після кнопки меню');  
            return true;  
          }  
        }  
          
        // Fallback: шукаємо контейнер кнопок  
        var header = document.querySelector('.head') ||   
                     document.querySelector('.header') ||   
                     document.querySelector('[class*="head"]');  
          
        if (header) {  
          var buttonsContainer = header.querySelector('[class*="buttons"]') ||   
                                header.querySelector('[class*="right"]') ||   
                                header.querySelector('[class*="action"]');  
            
          if (buttonsContainer) {  
            buttonsContainer.appendChild(clockElement);  
            console.log('[ClockChanger] Годинник додано до контейнера кнопок');  
            return true;  
          }  
        }  
          
        // Останній fallback: fixed позиція  
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
      
    // Додавання компонента налаштувань  
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
