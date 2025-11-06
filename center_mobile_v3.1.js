(function() {  
  'use strict';  
      
  Lampa.Platform.tv();  
      
  // Функція для центрування елементів інтерфейсу  
  function centerInterface() {  
    // Перевірка ширини екрану  
    var isMobile = window.innerWidth < 585;  
        
    // Отримати налаштування типу інтерфейсу картки  
    var cardInterfaceType = Lampa.Storage.get('card_interfice_type', 'new');  
        
    // CSS-стилі для центрування  
    var css = '';  
        
    if (isMobile) {  
      // Мобільні стилі  
      css += '.full-start-new__right, .full-start__left { display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; }';  
      css += '.full-start-new__buttons, .full-start-new__rate-line, .full-start__buttons, .full-start__details { justify-content: center !important; align-items: center !important; display: flex !important; flex-direction: row !important; gap: 0.5em !important; flex-wrap: wrap !important; }';  
      css += '.full-descr__text, .full-start-new__title, .full-start-new__tagline, .full-start-new__head { text-align: center !important; }';  
        
      // ЗМІНА: Дата релізу, бюджет, країна в один рядок ПО ЦЕНТРУ  
      css += '.full-descr__details { display: flex !important; flex-direction: row !important; justify-content: center !important; align-items: center !important; gap: 1em !important; flex-wrap: wrap !important; text-align: center !important; }';  
        
      // ЗМІНА: Жанри, виробництво, теги в один рядок ПО ЦЕНТРУ  
      css += '.full-descr__tags { display: flex !important; flex-direction: row !important; justify-content: center !important; align-items: center !important; gap: 0.5em !important; flex-wrap: wrap !important; text-align: center !important; }';  
        
      css += '.items-line__head { text-align: center !important; }';  
    } else {  
      // Десктопні стилі залежно від типу інтерфейсу  
      if (cardInterfaceType === 'new') {  
        css += '.full-start-new__right { display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; }';  
        css += '.full-start-new__buttons, .full-start-new__rate-line { justify-content: center !important; align-items: center !important; display: flex !important; flex-direction: row !important; gap: 0.5em !important; flex-wrap: wrap !important; }';  
        css += '.full-descr__text, .full-start-new__title, .full-start-new__tagline, .full-start-new__head { text-align: center !important; }';  
          
        // ЗМІНА: Дата релізу, бюджет, країна в один рядок ПО ЦЕНТРУ  
        css += '.full-descr__details { display: flex !important; flex-direction: row !important; justify-content: center !important; align-items: center !important; gap: 1em !important; flex-wrap: wrap !important; text-align: center !important; }';  
          
        // ЗМІНА: Жанри, виробництво, теги в один рядок ПО ЦЕНТРУ  
        css += '.full-descr__tags { display: flex !important; flex-direction: row !important; justify-content: center !important; align-items: center !important; gap: 0.5em !important; flex-wrap: wrap !important; text-align: center !important; }';  
          
        css += '.items-line__head { text-align: center !important; }';  
      } else {  
        css += '.full-start__left { display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; }';  
        css += '.full-start__buttons, .full-start__details { justify-content: center !important; align-items: center !important; display: flex !important; flex-direction: row !important; gap: 0.5em !important; flex-wrap: wrap !important; }';  
          
        // ЗМІНА: Дата релізу, бюджет, країна в один рядок ПО ЦЕНТРУ  
        css += '.full-descr__details { display: flex !important; flex-direction: row !important; justify-content: center !important; align-items: center !important; gap: 1em !important; flex-wrap: wrap !important; text-align: center !important; }';  
          
        // ЗМІНА: Жанри, виробництво, теги в один рядок ПО ЦЕНТРУ  
        css += '.full-descr__tags { display: flex !important; flex-direction: row !important; justify-content: center !important; align-items: center !important; gap: 0.5em !important; flex-wrap: wrap !important; text-align: center !important; }';  
          
        css += '.full-descr__text, .full-start__title, .full-start__title-original { text-align: center !important; }';  
      }  
    }  
        
    // Додати або оновити стилі  
    var styleId = 'center-interface-style';  
    var existingStyle = document.getElementById(styleId);  
        
    if (existingStyle) {  
      existingStyle.textContent = css;  
    } else {  
      var style = document.createElement('style');  
      style.id = styleId;  
      style.textContent = css;  
      document.head.appendChild(style);  
    }  
  }  
      
  // Функція ініціалізації  
  function init() {  
    // Застосувати стилі при завантаженні  
    centerInterface();  
        
    // Підписатися на подію 'full' для оновлення при відкритті картки  
    Lampa.Listener.follow('full', function(event) {  
      if (event.type === 'complite') {  
        centerInterface();  
      }  
    });  
        
    // Оновлювати при зміні розміру вікна  
    window.addEventListener('resize', function() {  
      centerInterface();  
    });  
  }  
      
  // Запуск плагіна  
  if (window.appready) {  
    init();  
  } else {  
    Lampa.Listener.follow('app', function(event) {  
      if (event.type === 'ready') {  
        init();  
      }  
    });  
  }  
})();
