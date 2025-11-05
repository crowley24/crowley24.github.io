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
      }  
    });    
        
    // Конфігурація шрифтів (ТІЛЬКИ РОБОЧІ)  
    var fonts = {    
      default: {    
        name: 'fontchanger_default',    
        family: 'Roboto, Arial, sans-serif',    
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
        fontFaceStyle.textContent = '@import url("' + font.url + '");';    
        document.head.appendChild(fontFaceStyle);    
      }    
          
      // Застосувати шрифт до ВСЬОГО інтерфейсу (включно з меню, підменю, налаштуваннями)  
      var style = document.createElement('style');    
      style.id = 'fontchanger-style';    
      style.textContent = `    
        body, .body, * {    
          font-family: ${font.family} !important;    
        }    
            
        /* Головне меню */  
        .menu,  
        .menu__item,  
        .menu__item-name,  
        .menu__item-title,  
          
        /* Підменю та фільтри */  
        .filter,  
        .filter__item,  
        .filter__item-label,  
        .filter__title,  
          
        /* Налаштування */  
        .settings,  
        .settings__title,  
        .settings__label,  
        .settings-param,  
        .settings-param__name,  
        .settings-param__value,  
          
        /* Картки контенту */  
        .card,  
        .card__title,  
        .card__view,  
        .card__description,  
          
        /* Сторінка фільму */  
        .full-start__title,  
        .full-start__tagline,  
        .full-start__details,  
        .full-start__description,  
          
        /* Кнопки та селектори */  
        .button,  
        .selector,  
        .selector__item,  
          
        /* Скролл та заголовки */  
        .scroll,  
        .scroll__title,  
          
        /* Модальні вікна */  
        .modal,  
        .modal__title,  
        .modal__content,  
          
        /* Пошук */  
        .search,  
        .search__input,  
          
        /* Інші елементи */  
        .notice,  
        .info,  
        .player {    
          font-family: ${font.family} !important;    
        }    
      `;    
          
      document.head.appendChild(style);    
          
      console.log('[FontChanger] Застосовано шрифт:', fontKey);    
    }    
        
    // Застосувати збережений шрифт при завантаженні    
    var savedFont = Lampa.Storage.get('fontchanger_selected', 'default');    
    applyFont(savedFont);    
        
  });  // Закриває waitForLampa callback  
})();
