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
        
    // Локалізація    
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
      },  
      fontchanger_montserrat: {  
        en: 'Montserrat',  
        uk: 'Montserrat',  
        ru: 'Montserrat'  
      },  
      fontchanger_raleway: {  
        en: 'Raleway',  
        uk: 'Raleway',  
        ru: 'Raleway'  
      },  
      fontchanger_opensans: {  
        en: 'Open Sans',  
        uk: 'Open Sans',  
        ru: 'Open Sans'  
      },  
      fontchanger_lato: {  
        en: 'Lato',  
        uk: 'Lato',  
        ru: 'Lato'  
      },  
      fontchanger_nunito: {  
        en: 'Nunito',  
        uk: 'Nunito',  
        ru: 'Nunito'  
      },  
      fontchanger_ubuntu: {  
        en: 'Ubuntu',  
        uk: 'Ubuntu',  
        ru: 'Ubuntu'  
      },  
      fontchanger_playfair: {  
        en: 'Playfair Display',  
        uk: 'Playfair Display',  
        ru: 'Playfair Display'  
      },  
      fontchanger_josefin: {  
        en: 'Josefin Sans',  
        uk: 'Josefin Sans',  
        ru: 'Josefin Sans'  
      },  
      fontchanger_quicksand: {  
        en: 'Quicksand',  
        uk: 'Quicksand',  
        ru: 'Quicksand'  
      },  
      fontchanger_worksans: {  
        en: 'Work Sans',  
        uk: 'Work Sans',  
        ru: 'Work Sans'  
      }  
    });    
        
    // Конфігурація шрифтів    
    var fonts = {    
      default: {    
        name: 'fontchanger_default',    
        family: 'Roboto, Arial, sans-serif',    
        url: null    
      },  
      sfpro: {    
        name: 'fontchanger_sfpro',    
        family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',    
        url: null  
      },    
      inter: {    
        name: 'fontchanger_inter',    
        family: '"Inter", sans-serif',    
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'    
      },    
      poppins: {    
        name: 'fontchanger_poppins',    
        family: '"Poppins", sans-serif',    
        url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'    
      },  
      montserrat: {  
        name: 'fontchanger_montserrat',  
        family: '"Montserrat", sans-serif',  
        url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap'  
      },  
      raleway: {  
        name: 'fontchanger_raleway',  
        family: '"Raleway", sans-serif',  
        url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap'  
      },  
      opensans: {  
        name: 'fontchanger_opensans',  
        family: '"Open Sans", sans-serif',  
        url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap'  
      },  
      lato: {  
        name: 'fontchanger_lato',  
        family: '"Lato", sans-serif',  
        url: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap'  
      },  
      nunito: {  
        name: 'fontchanger_nunito',  
        family: '"Nunito", sans-serif',  
        url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap'  
      },  
      ubuntu: {  
        name: 'fontchanger_ubuntu',  
        family: '"Ubuntu", sans-serif',  
        url: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap'  
      },  
      playfair: {  
        name: 'fontchanger_playfair',  
        family: '"Playfair Display", serif',  
        url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap'  
      },  
      josefin: {  
        name: 'fontchanger_josefin',  
        family: '"Josefin Sans", sans-serif',  
        url: 'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;500;600;700&display=swap'  
      },  
      quicksand: {  
        name: 'fontchanger_quicksand',  
        family: '"Quicksand", sans-serif',  
        url: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap'  
      },  
      worksans: {  
        name: 'fontchanger_worksans',  
        family: '"Work Sans", sans-serif',  
        url: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap'  
      }  
    };    
        
    // Додавання компонента налаштувань    
    Lampa.SettingsApi.addComponent({    
      component: 'fontchanger',    
      name: Lampa.Lang.translate('fontchanger_title'),    
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 4v3m6-3v3M9 20h6M4 7h16M6 10h12v7a3 3 0 01-3 3H9a3 3 0 01-3-3v-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'    
    });    
        
    // Налаштування вибору шрифту    
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
        
    // Функція для застосування шрифту    
    function applyFont(fontKey) {    
      var font = fonts[fontKey];    
      if (!font) return;    
          
      // Видалити попередні стилі    
      var oldStyle = document.getElementById('fontchanger-style');    
      if (oldStyle) oldStyle.remove();    
          
      var oldFontFace = document.getElementById('fontchanger-fontface');    
      if (oldFontFace) oldFontFace.remove();    
          
      // Додати @font-face якщо потрібно    
      if (font.url) {    
        var fontFaceStyle = document.createElement('style');    
        fontFaceStyle.id = 'fontchanger-fontface';    
            
        if (font.url.includes('googleapis.com')) {    
          // Google Fonts - імпортувати через @import    
          fontFaceStyle.textContent = '@import url("' + font.url + '");';    
        } else {    
          // Кастомний шрифт - використати @font-face    
          var fontName = font.family.split(',')[0].replace(/"/g, '');  
          var format = font.url.endsWith('.woff2') ? 'woff2' : 'opentype';  
          fontFaceStyle.textContent = '@font-face { font-family: ' + fontName + '; src: url("' + font.url + '") format("' + format + '"); font-weight: 400; font-style: normal; }';    
        }    
            
        document.head.appendChild(fontFaceStyle);    
      }    
          
      // Застосувати шрифт до всього інтерфейсу    
      var style = document.createElement('style');    
      style.id = 'fontchanger-style';    
      style.textContent = `    
        body, .body, * {    
          font-family: ${font.family} !important;    
        }    
            
        /* Перевизначити специфічні класи Lampa */    
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
        
    // Застосувати збережений шрифт при завантаженні    
    var savedFont = Lampa.Storage.get('fontchanger_selected', 'default');    
    applyFont(savedFont);    
  });    
})();
