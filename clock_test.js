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
          
    console.log('[ClockChanger] Ініціалізація плагіна для основного годинника');      
          
    // Локалізація (залишається без змін)  
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
      clockchanger_gradient: {  
        en: 'Gradient',  
        uk: 'Градієнт',  
        ru: 'Градиент'  
      },  
      clockchanger_outline: {  
        en: 'Outline',  
        uk: 'Контур',  
        ru: 'Контур'  
      },  
      clockchanger_shadow: {  
        en: 'Shadow',  
        uk: 'Тінь',  
        ru: 'Тень'  
      },  
      clockchanger_matrix: {  
        en: 'Matrix',  
        uk: 'Матриця',  
        ru: 'Матрица'  
      },  
      clockchanger_fire: {  
        en: 'Fire',  
        uk: 'Вогонь',  
        ru: 'Огонь'  
      },  
      clockchanger_ice: {  
        en: 'Ice',  
        uk: 'Лід',  
        ru: 'Лед'  
      }  
    });      
          
    // Конфігурація стилів для ОСНОВНОГО годинника Lampa  
    var clockStyles = {      
      default: {      
        name: 'clockchanger_default',      
        css: `      
          .head__time.clock-styled {      
            background: transparent !important;      
            border: none !important;  
            padding: 0 !important;  
            box-shadow: none !important;  
            animation: none !important;  
          }      
        `      
      },      
      bubble: {      
        name: 'clockchanger_bubble',      
        css: `      
          .head__time.clock-styled {      
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;      
            border-radius: 50px !important;      
            padding: 8px 18px !important;      
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4) !important;      
            font-weight: 700 !important;      
            letter-spacing: 1.5px !important;      
            animation: bubble-pulse 3s ease-in-out infinite !important;      
            border: 2px solid rgba(255, 255, 255, 0.3) !important;      
            backdrop-filter: blur(10px) !important;      
          }      
          @keyframes bubble-pulse {      
            0%, 100% {      
              transform: scale(1);      
              box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);      
            }      
            50% {      
              transform: scale(1.05);      
              box-shadow: 0 12px 30px rgba(102, 126, 234, 0.6);      
            }      
          }      
        `      
      },      
      netflix: {      
        name: 'clockchanger_netflix',      
        css: `      
          .head__time.clock-styled {      
            background: #E50914 !important;      
            border-radius: 4px !important;      
            padding: 8px 16px !important;      
            font-weight: 700 !important;      
            box-shadow: 0 4px 12px rgba(229, 9, 20, 0.4) !important;      
          }      
        `      
      },      
      minimal: {      
        name: 'clockchanger_minimal',      
        css: `      
          .head__time.clock-styled {      
            background: rgba(255, 255, 255, 0.1) !important;      
            border: 1px solid rgba(255, 255, 255, 0.2) !important;      
            border-radius: 12px !important;      
            padding: 6px 12px !important;      
            backdrop-filter: blur(10px) !important;      
          }      
        `      
      },      
      digital: {      
        name: 'clockchanger_digital',      
        css: `      
          .head__time.clock-styled {      
            background: #000 !important;      
            border: 2px solid #0f0 !important;      
            border-radius: 8px !important;      
            padding: 8px 16px !important;      
            font-family: 'Courier New', monospace !important;      
            color: #0f0 !important;      
            text-shadow: 0 0 10px #0f0 !important;      
          }      
        `      
      },      
      neon: {      
        name: 'clockchanger_neon',      
        css: `      
          .head__time.clock-styled {      
            background: rgba(0, 0, 0, 0.8) !important;      
            border: 2px solid #ff00ff !important;      
            border-radius: 20px !important;      
            padding: 8px 16px !important;      
            color: #ff00ff !important;      
            text-shadow: 0 0 10px #ff00ff, 0 0 20px #ff00ff !important;      
            box-shadow: 0 0 20px rgba(255, 0, 255, 0.5), inset 0 0 20px rgba(255, 0, 255, 0.2) !important;      
            animation: neon-flicker 2s infinite alternate !important;      
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
          .head__time.clock-styled {  
            background: linear-gradient(180deg, #ff6b6b 0%, #ee5a6f 100%) !important;  
            border: 3px solid #fff !important;  
            border-radius: 6px !important;  
            padding: 8px 16px !important;  
            font-family: 'Arial Black', sans-serif !important;  
            text-shadow: 2px 2px 0px #000 !important;  
            box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.3) !important;  
          }  
        `  
      },  
      glass: {  
        name: 'clockchanger_glass',  
        css: `  
          .head__time.clock-styled {  
            background: rgba(255, 255, 255, 0.15) !important;  
            border: 1px solid rgba(255, 255, 255, 0.3) !important;  
            border-radius: 16px !important;  
            padding: 8px 16px !important;  
            backdrop-filter: blur(20px) saturate(180%) !important;  
            -webkit-backdrop-filter: blur(20px) saturate(180%) !important;  
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;  
          }  
        `  
      },  
      gradient: {  
        name: 'clockchanger_gradient',  
        css: `  
          .head__time.clock-styled {  
            background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%) !important;  
            border-radius: 25px !important;  
            padding: 8px 18px !important;  
            font-weight: 600 !important;  
            box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4) !important;  
            animation: gradient-shift 3s ease infinite !important;  
          }  
          @keyframes gradient-shift {  
            0%, 100% { filter: hue-rotate(0deg); }  
            50% { filter: hue-rotate(20deg); }  
          }  
        `  
      },  
      outline: {  
        name: 'clockchanger_outline',  
        css: `  
          .head__time.clock-styled {  
            background: transparent !important;  
            border: 2px solid #fff !important;  
            border-radius: 10px !important;  
            padding: 6px 14px !important;  
            font-weight: 600 !important;  
            text-shadow: 0 0 5px rgba(0, 0, 0, 0.5) !important;  
          }  
        `  
      },  
      shadow: {  
        name: 'clockchanger_shadow',  
        css: `  
          .head__time.clock-styled {  
            background: #fff !important;  
            border-radius: 12px !important;  
            padding: 8px 16px !important;  
            font-weight: 700 !important;  
            color: #333 !important;  
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2) !important;  
          }  
        `  
      },  
      matrix: {  
        name: 'clockchanger_matrix',  
        css: `  
          .head__time.clock-styled {  
            background: #000 !important;  
            border: 1px solid #0f0 !important;  
            border-radius: 4px !important;  
            padding: 8px 16px !important;  
            font-family: 'Courier New', monospace !important;  
            color: #0f0 !important;  
            text-shadow: 0 0 5px #0f0, 0 0 10px #0f0 !important;  
            animation: matrix-glitch 0.5s infinite !important;  
          }  
          @keyframes matrix-glitch {  
            0%, 100% { opacity: 1; }  
            50% { opacity: 0.9; transform: translateX(1px); }  
          }  
        `  
      },  
      fire: {  
        name: 'clockchanger_fire',  
        css: `  
          .head__time.clock-styled {  
            background: linear-gradient(180deg, #ff4500 0%, #ff8c00 50%, #ffd700 100%) !important;  
            border-radius: 15px !important;  
            padding: 8px 16px !important;  
            font-weight: 700 !important;  
            text-shadow: 0 0 10px rgba(255, 69, 0, 0.8) !important;  
            box-shadow: 0 0 20px rgba(255, 69, 0, 0.6), inset 0 0 20px rgba(255, 140, 0, 0.3) !important;  
            animation: fire-flicker 1.5s ease-in-out infinite !important;  
          }  
          @keyframes fire-flicker {  
            0%, 100% { filter: brightness(1); }  
            50% { filter: brightness(1.2); }  
          }  
        `  
      },  
      ice: {  
        name: 'clockchanger_ice',  
        css: `  
          .head__time.clock-styled {  
            background: linear-gradient(135deg, #e0f7ff 0%, #b3e5fc 100%) !important;  
            border: 2px solid rgba(255, 255, 255, 0.8) !important;  
            border-radius: 12px !important;  
            padding: 8px 16px !important;  
            font-weight: 600 !important;  
            color: #006db3 !important;  
            text-shadow: 0 0 8px rgba(0, 109, 179, 0.6) !important;  
            box-shadow: 0 4px 15px rgba(176, 224, 230, 0.5) !important;  
          }  
        `  
      }  
    };      
          
    // Функція для знаходження основного годинника  
    function findLampaClock() {  
      // Можливі селектори для годинника Lampa  
      var selectors = [  
        '.head__time',  
        '.time',  
        '.head .time',  
        '.header__time'  
      ];  
        
      for (var i = 0; i < selectors.length; i++) {  
        var clock = document.querySelector(selectors[i]);  
        if (clock) {  
          console.log('[ClockChanger] Знайдено годинник:', selectors[i]);  
          return clock;  
        }  
      }  
        
      console.log('[ClockChanger] Годинник не знайдено');  
      return null;  
    }  
          
    // Застосування стилю до основного годинника  
    function applyClockStyle(styleKey) {  
      var style = clockStyles[styleKey];  
      if (!style) return;  
        
      // Знайти годинник  
      var clock = findLampaClock();  
      if (!clock) {  
        console.log('[ClockChanger] Не вдалося знайти годинник для стилізації');  
        return;  
      }  
        
      // Додати клас для стилізації  
      clock.classList.add('clock-styled');  
        
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
      
    // Додавання компонента налаштувань  
    Lampa.SettingsApi.addComponent({  
      component: 'clockchanger',  
      name: Lampa.Lang.translate('clockchanger_title'),  
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'  
    });  
      
    // Налаштування вибору стилю  
    var styleValues = {};  
    Object.keys(clockStyles).forEach(function(key) {  
      styleValues[key] = Lampa.Lang.translate(clockStyles[key].name);  
    });  
      
    Lampa.SettingsApi.addParam({  
      component: 'clockchanger',  
      param: {  
        name: 'clockchanger_selected',  
        type: 'select',  
        values: styleValues,  
        default: 'bubble'  
      },  
      field: {  
        name: Lampa.Lang.translate('clockchanger_style')  
      },  
      onChange: function(value) {  
        applyClockStyle(value);  
      }  
    });  
      
    // Ініціалізація  
    function init() {  
      // Чекати поки годинник з'явиться в DOM  
      function waitForClock() {  
        var clock = findLampaClock();  
        if (!clock) {  
          setTimeout(waitForClock, 100);  
          return;  
        }  
          
        // Застосувати збережений стиль  
        var savedStyle = Lampa.Storage.get('clockchanger_selected', 'bubble');  
        applyClockStyle(savedStyle);  
      }  
        
      waitForClock();  
    }  
      
    // Запуск при готовності Lampa  
    if (Lampa.Listener) {  
      Lampa.Listener.follow('app', function(e) {  
        if (e.type === 'ready') {  
          init();  
        }  
      });  
    } else {  
      setTimeout(init, 1000);  
    }  
      
  });  // Закриває waitForLampa callback  
})();
