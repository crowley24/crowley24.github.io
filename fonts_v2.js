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
    if (window.fontchanger_plugin) return;    
    window.fontchanger_plugin = true;    
        
    console.log('[FontChanger] Ініціалізація плагіна');    
        
    // Локалізація (без змін)  
    Lampa.Lang.add({    
      fontchanger_title: {    
        en: 'Font Changer',    
        uk: 'Зміна шрифтів',    
        ru: 'Смена шрифтов'    
      },    
      fontchanger_font: {    
        en: 'Font family',    
        uk: 'Сімейство шрифтів',    
        ru: 'Семейство шрифтов'    
      },    
      fontchanger_default: {    
        en: 'Default (Roboto)',    
        uk: 'За замовчуванням (Roboto)',    
        ru: 'По умолчанию (Roboto)'    
      },    
      fontchanger_netflix: {    
        en: 'Netflix Sans',    
        uk: 'Netflix Sans',    
        ru: 'Netflix Sans'    
      },    
      fontchanger_sfpro: {    
        en: 'SF Pro Display',    
        uk: 'SF Pro Display',    
        ru: 'SF Pro Display'    
      },    
      fontchanger_inter: {    
        en: 'Inter',    
        uk: 'Inter',    
        ru: 'Inter'    
      },    
      fontchanger_poppins: {    
        en: 'Poppins',    
        uk: 'Poppins',    
        ru: 'Poppins'    
      }    
    });    
        
    // Конфігурація шрифтів (ВИПРАВЛЕНО)  
    var fonts = {    
      default: {    
        name: 'fontchanger_default',    
        family: 'Roboto, Arial, sans-serif',    
        url: null    
      },    
      netflix: {    
        name: 'fontchanger_netflix',    
        family: '"Netflix Sans", Arial, sans-serif',    
        url: 'https://assets.nflxext.com/ffe/siteui/fonts/netflix-sans/v3/NetflixSans_W_Rg.woff2'    
      },    
      sfpro: {    
        name: 'fontchanger_sfpro',    
        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',    
        url: null  // Використовуємо системний шрифт  
      },    
      inter: {    
        name: 'fontchanger_inter',    
        family: '"Inter", sans-serif',    
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'    
      },    
      poppins: {    
        name: 'fontchanger_poppins',    
        family: '"Poppins", sans-serif',    
        url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap'    
      }    
    };    
        
    // Додавання компонента налаштувань (без змін)  
    Lampa.SettingsApi.addComponent({    
      component: 'fontchanger',    
      name: Lampa.Lang.translate('fontchanger_title'),    
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 4v3m6-3v3M9 20h6M4 7h16M6 10h12v7a3 3 0 01-3 3H9a3 3 0 01-3-3v-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'    
    });    
        
    // Налаштування вибору шрифту (без змін)  
    var fontValues = {};    
    Object.keys(fonts).forEach(function(key) {    
      fontValues[key] = Lampa.Lang.translate(fonts[key].name);    
    });    
        
    Lampa.SettingsApi.addParam({    
      component: 'fontchanger',    
      param: {    
        name: 'fontchanger_selected',    
        type: 'select',    
        values: fontValues,    
        default: 'default'    
      },    
      field: {    
        name: Lampa.Lang.translate('fontchanger_font')    
      },    
      onChange: function(value) {    
        applyFont(value);    
      }    
    });    
        
    // Функція для застосування шрифту (без змін)  
    function applyFont(fontKey) {    
      var font = fonts[fontKey];    
      if (!font) return;    
          
      var oldStyle = document.getElementById('fontchanger-style');    
      if (oldStyle) oldStyle.remove();    
          
      var oldFontFace = document.getElementById('fontchanger-fontface');    
      if (oldFontFace) oldFontFace.remove();    
          
      if (font.url) {    
        var fontFaceStyle = document.createElement('style');    
        fontFaceStyle.id = 'fontchanger-fontface';    
            
        if (font.url.includes('googleapis.com')) {    
          fontFaceStyle.textContent = '@import url("' + font.url + '");';    
        } else {    
          var fontName = font.family.split(',')[0].replace(/"/g, '');    
          fontFaceStyle.textContent = '@font-face { font-family: ' + fontName + '; src: url("' + font.url + '") format("woff2"); font-weight: 400; font-style: normal; }';    
        }    
            
        document.head.appendChild(fontFaceStyle);    
      }    
          
      var style = document.createElement('style');    
      style.id = 'fontchanger-style';    
      style.textContent = `    
        body, .body, * {    
          font-family: ${font.family} !important;    
        }    
            
        .full-start__title,    
        .full-start__tagline,    
        .card__title,    
        .card__view,    
        .menu__item,    
        .settings__title,    
        .settings__label,    
        .button,    
        .selector,    
        .filter__item,    
        .scroll__title {    
          font-family: ${font.family} !important;    
        }    
      `;    
          
      document.head.appendChild(style);    
          
      console.log('[FontChanger] Застосовано шрифт:', fontKey);    
    }    
        
    var savedFont = Lampa.Storage.get('fontchanger_selected', 'default');    
    applyFont(savedFont);    
        
  });  // ДОДАНО: закриває waitForLampa callback  
})();
