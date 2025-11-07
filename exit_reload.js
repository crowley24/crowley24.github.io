(function() {    
  'use strict';    
      
  function waitForLampa(callback) {    
    if (window.Lampa && Lampa.Storage && Lampa.Lang && Lampa.Activity) {    
      callback();    
    } else {    
      setTimeout(function() { waitForLampa(callback); }, 100);    
    }    
  }    
      
  waitForLampa(function() {    
    if (window.action_buttons_plugin) return;    
    window.action_buttons_plugin = true;    
        
    console.log('[ActionButtons] Ініціалізація плагіна');    
        
    // Локалізація    
    Lampa.Lang.add({    
      reload_button: {    
        en: 'Reload',    
        uk: 'Перезагрузка',    
        ru: 'Перезагрузка'    
      },  
      console_button: {    
        en: 'Console',    
        uk: 'Консоль',    
        ru: 'Консоль'    
      },  
      logout_button: {    
        en: 'Exit',    
        uk: 'Вихід',    
        ru: 'Выход'    
      }  
    });    
        
    // Створення кнопки перезагрузки  
    function createReloadButton() {    
      var button = document.createElement('div');    
      button.className = 'head__action reload-button selector';    
      button.innerHTML = `    
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">    
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
        </svg>    
        <span style="margin-left: 0.5em;">${Lampa.Lang.translate('reload_button')}</span>    
      `;    
          
      button.style.cssText = `    
        display: inline-flex;    
        align-items: center;    
        padding: 0.5em 1em;    
        margin-left: 1em;    
        cursor: pointer;    
        border-radius: 8px;    
        transition: background 0.2s;    
      `;    
          
      // Обробник для пульта  
      $(button).on('hover:enter', function() {    
        window.location.reload();    
      });    
          
      // Обробник для миші    
      button.addEventListener('click', function() {    
        window.location.reload();    
      });    
          
      // Hover ефекти    
      $(button).on('hover:focus', function() {    
        button.style.background = 'rgba(255, 255, 255, 0.1)';    
      });    
          
      $(button).on('hover:hover', function() {    
        button.style.background = 'rgba(255, 255, 255, 0.1)';    
      });    
          
      $(button).on('hover:blur', function() {    
        button.style.background = 'transparent';    
      });    
          
      button.addEventListener('mouseenter', function() {    
        button.style.background = 'rgba(255, 255, 255, 0.1)';    
      });    
          
      button.addEventListener('mouseleave', function() {    
        button.style.background = 'transparent';    
      });    
          
      return button;    
    }  
  
    // Створення кнопки консолі  
    function createConsoleButton() {    
      var button = document.createElement('div');    
      button.className = 'head__action console-button selector';    
      button.innerHTML = `    
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">    
          <polyline points="4 17 10 11 4 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
          <line x1="12" y1="19" x2="20" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
        </svg>    
        <span style="margin-left: 0.5em;">${Lampa.Lang.translate('console_button')}</span>    
      `;    
          
      button.style.cssText = `    
        display: inline-flex;    
        align-items: center;    
        padding: 0.5em 1em;    
        margin-left: 1em;    
        cursor: pointer;    
        border-radius: 8px;    
        transition: background 0.2s;    
      `;    
          
      function openConsole() {  
        // Спроба відкрити консоль через різні методи  
        if (window.Lampa && Lampa.Noty) {  
          Lampa.Noty.show('Натисніть F12 або Ctrl+Shift+I для відкриття консолі');  
        }  
          
        // Для деяких платформ можна спробувати  
        try {  
          if (typeof console !== 'undefined') {  
            console.log('%c[Console] Консоль активована', 'color: #00ff00; font-size: 16px; font-weight: bold;');  
            console.log('%cВикористовуйте F12 або Ctrl+Shift+I для відкриття DevTools', 'color: #ffaa00; font-size: 14px;');  
          }  
        } catch(e) {}  
      }  
          
      // Обробник для пульта  
      $(button).on('hover:enter', function() {    
        openConsole();  
      });    
          
      // Обробник для миші    
      button.addEventListener('click', function() {    
        openConsole();  
      });    
          
      // Hover ефекти    
      $(button).on('hover:focus', function() {    
        button.style.background = 'rgba(255, 255, 255, 0.1)';    
      });    
          
      $(button).on('hover:hover', function() {    
        button.style.background = 'rgba(255, 255, 255, 0.1)';    
      });    
          
      $(button).on('hover:blur', function() {    
        button.style.background = 'transparent';    
      });    
          
      button.addEventListener('mouseenter', function() {    
        button.style.background = 'rgba(255, 255, 255, 0.1)';    
      });    
          
      button.addEventListener('mouseleave', function() {    
        button.style.background = 'transparent';    
      });    
          
      return button;    
    }  
        
    // Створення кнопки виходу    
    function createLogoutButton() {    
      var button = document.createElement('div');    
      button.className = 'head__action logout-button selector';    
      button.innerHTML = `    
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">    
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>    
          <polyline points="16 17 21 12 16 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>    
          <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>    
        </svg>    
        <span style="margin-left: 0.5em;">${Lampa.Lang.translate('logout_button')}</span>    
      `;    
          
      button.style.cssText = `    
        display: inline-flex;    
        align-items: center;    
        padding: 0.5em 1em;    
        margin-left: 1em;    
        cursor: pointer;    
        border-radius: 8px;    
        transition: background 0.2s;    
      `;    
          
      function doLogout() {  
        // Очистити дані користувача    
        if (Lampa.Account && typeof Lampa.Account.logout === 'function') {    
          Lampa.Account.logout();    
        }    
            
        Lampa.Storage.set('account', {});    
        Lampa.Storage.set('account_user', null);    
            
        // Перезавантажити сторінку    
        window.location.reload();  
      }  
  
      // Обробник для пульта (jQuery події)    
      $(button).on('hover:enter', function() {    
        doLogout();  
      });    
          
      // Обробник для миші    
      button.addEventListener('click', function() {    
        doLogout();  
      });    
          
      // Hover ефекти для пульта    
      $(button).on('hover:focus', function() {    
        button.style.background = 'rgba(255, 255, 255, 0.1)';    
      });    
          
      $(button).on('hover:hover', function() {    
        button.style.background = 'rgba(255, 255, 255, 0.1)';    
      });    
          
      $(button).on('hover:blur', function() {    
        button.style.background = 'transparent';    
      });    
          
      // Hover ефекти для миші    
      button.addEventListener('mouseenter', function() {    
        button.style.background = 'rgba(255, 255, 255, 0.1)';    
      });    
          
      button.addEventListener('mouseleave', function() {    
        button.style.background = 'transparent';    
      });    
          
      return button;    
    }    
        
    // Додавання кнопок в header (в порядку: Перезагрузка, Консоль, Вихід)  
    function insertButtons() {    
      var header = document.querySelector('.head');    
      if (!header) {    
        setTimeout(insertButtons, 100);    
        return;    
      }    
          
      var actions = header.querySelector('.head__actions');    
      if (actions) {    
        // Додаємо в правильному порядку  
        var reloadBtn = createReloadButton();  
        var consoleBtn = createConsoleButton();  
        var logoutBtn = createLogoutButton();  
          
        actions.appendChild(reloadBtn);  
        actions.appendChild(consoleBtn);  
        actions.appendChild(logoutBtn);  
          
        console.log('[ActionButtons] Кнопки додано в header: Перезагрузка, Консоль, Вихід');    
      }    
    }    
        
    // Ініціалізація    
    if (Lampa.Listener) {    
      Lampa.Listener.follow('app', function(e) {    
        if (e.type === 'ready') {    
          insertButtons();    
        }    
      });    
    } else {    
      setTimeout(insertButtons, 1000);    
    }    
  });    
})();
