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
        en: 'Bubble',    
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
      clockchanger_retro: {    
        en: 'Retro',    
        uk: 'Ретро',    
        ru: 'Ретро'    
      }    
    });    
        
    // Конфігурація стилів годинника    
    var clockStyles = {    
      default: {    
        name: 'clockchanger_default',    
        css: ''    
      },    
      bubble: {    
        name: 'clockchanger_bubble',    
        css: `    
          .time {    
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;    
            border-radius: 50px !important;    
            padding: 8px 20px !important;    
            box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4) !important;    
            font-weight: 600 !important;    
            letter-spacing: 1px !important;    
            animation: bubble-pulse 2s ease-in-out infinite !important;    
          }    
          @keyframes bubble-pulse {    
            0%, 100% { transform: scale(1); }    
            50% { transform: scale(1.05); }    
          }    
        `    
      },    
      netflix: {    
        name: 'clockchanger_netflix',    
        css: `    
          .time {    
            background: #E50914 !important;    
            border-radius: 4px !important;    
            padding: 6px 16px !important;    
            font-family: 'Netflix Sans', Arial, sans-serif !important;    
            font-weight: 700 !important;    
            font-size: 1.1em !important;    
            letter-spacing: 0.5px !important;    
            box-shadow: 0 4px 8px rgba(229, 9, 20, 0.3) !important;    
            text-transform: uppercase !important;    
          }    
        `    
      },    
      minimal: {    
        name: 'clockchanger_minimal',    
        css: `    
          .time {    
            background: transparent !important;    
            border: 2px solid rgba(255, 255, 255, 0.3) !important;    
            border-radius: 8px !important;    
            padding: 6px 14px !important;    
            font-weight: 300 !important;    
            font-size: 0.95em !important;    
            letter-spacing: 2px !important;    
            backdrop-filter: blur(10px) !important;    
          }    
        `    
      },    
      digital: {    
        name: 'clockchanger_digital',    
        css: `    
          .time {    
            background: #000 !important;    
            border: 3px solid #0f0 !important;    
            border-radius: 6px !important;    
            padding: 8px 18px !important;    
            color: #0f0 !important;    
            font-family: 'Courier New', monospace !important;    
            font-weight: 700 !important;    
            font-size: 1.2em !important;    
            letter-spacing: 3px !important;    
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.5), inset 0 0 10px rgba(0, 255, 0, 0.2) !important;    
            text-shadow: 0 0 10px #0f0 !important;    
          }    
        `    
      },    
      retro: {    
        name: 'clockchanger_retro',    
        css: `    
          .time {    
            background: linear-gradient(180deg, #ff6b6b 0%, #ee5a6f 100%) !important;    
            border-radius: 12px !important;    
            padding: 10px 20px !important;    
            font-family: 'Comic Sans MS', cursive !important;    
            font-weight: 700 !important;    
            font-size: 1.15em !important;    
            color: #fff !important;    
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3) !important;    
            box-shadow: 0 6px 12px rgba(255, 107, 107, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2) !important;    
            border: 3px solid #fff !important;    
          }    
        `    
      }    
    };    
        
    // Додавання компонента налаштувань    
    Lampa.SettingsApi.addComponent({    
      component: 'clockchanger',    
      name: Lampa.Lang.translate('clockchanger_title'),    
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'    
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
        default: 'default'    
      },    
      field: {    
        name: Lampa.Lang.translate('clockchanger_style')    
      },    
      onChange: function(value) {    
        applyClockStyle(value);    
      }    
    });    
        
    // Функція для застосування стилю годинника    
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
        
    // Застосувати збережений стиль при завантаженні    
    var savedStyle = Lampa.Storage.get('clockchanger_selected', 'default');    
    applyClockStyle(savedStyle);    
        
  });  // Закриває waitForLampa callback  
})();
