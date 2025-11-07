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
    if (window.action_menu_plugin) return;    
    window.action_menu_plugin = true;    
        
    console.log('[ActionMenu] Ініціалізація плагіна');    
        
    // Локалізація    
    Lampa.Lang.add({    
      action_menu: {    
        en: 'Actions',    
        uk: 'Дії',    
        ru: 'Действия'    
      },  
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
        
    // Функції дій  
    function doReload() {  
      window.location.reload();  
    }  
      
    function doConsole() {  
      if (window.Lampa && Lampa.Noty) {  
        Lampa.Noty.show('Натисніть F12 або Ctrl+Shift+I для відкриття консолі');  
      }  
        
      try {  
        if (typeof console !== 'undefined') {  
          console.log('%c[Console] Консоль активована', 'color: #00ff00; font-size: 16px; font-weight: bold;');  
          console.log('%cВикористовуйте F12 або Ctrl+Shift+I для відкриття DevTools', 'color: #ffaa00; font-size: 14px;');  
        }  
      } catch(e) {}  
    }  
      
    function doLogout() {  
      if (Lampa.Account && typeof Lampa.Account.logout === 'function') {    
        Lampa.Account.logout();    
      }    
          
      Lampa.Storage.set('account', {});    
      Lampa.Storage.set('account_user', null);    
      window.location.reload();  
    }  
      
    // Показати меню дій  
    function showActionMenu() {  
      Lampa.Select.show({  
        title: Lampa.Lang.translate('action_menu'),  
        items: [  
          {  
            title: Lampa.Lang.translate('reload_button'),  
            reload: true  
          },  
          {  
            title: Lampa.Lang.translate('console_button'),  
            console: true  
          },  
          {  
            title: Lampa.Lang.translate('logout_button'),  
            logout: true  
          }  
        ],  
        onSelect: function(item) {  
          if (item.reload) {  
            doReload();  
          } else if (item.console) {  
            doConsole();  
            Lampa.Controller.toggle('head');  
          } else if (item.logout) {  
            doLogout();  
          }  
        },  
        onBack: function() {  
          Lampa.Controller.toggle('head');  
        }  
      });  
    }  
        
    // Створення основної кнопки меню  
    function createActionButton() {    
      var button = document.createElement('div');    
      button.className = 'head__action action-menu-button selector';    
      button.innerHTML = `    
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">    
          <circle cx="12" cy="12" r="1" stroke="currentColor" stroke-width="2" fill="currentColor"/>  
          <circle cx="12" cy="5" r="1" stroke="currentColor" stroke-width="2" fill="currentColor"/>  
          <circle cx="12" cy="19" r="1" stroke="currentColor" stroke-width="2" fill="currentColor"/>  
        </svg>    
        <span style="margin-left: 0.5em;">${Lampa.Lang.translate('action_menu')}</span>    
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
        showActionMenu();  
      });    
          
      // Обробник для миші    
      button.addEventListener('click', function() {    
        showActionMenu();  
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
        
    // Додавання кнопки в header  
    function insertButton() {    
      var header = document.querySelector('.head');    
      if (!header) {    
        setTimeout(insertButton, 100);    
        return;    
      }    
          
      var actions = header.querySelector('.head__actions');    
      if (actions) {    
        var button = createActionButton();  
        actions.appendChild(button);  
        console.log('[ActionMenu] Кнопку меню додано в header');    
      }    
    }    
        
    // Ініціалізація    
    if (Lampa.Listener) {    
      Lampa.Listener.follow('app', function(e) {    
        if (e.type === 'ready') {    
          insertButton();    
        }    
      });    
    } else {    
      setTimeout(insertButton, 1000);    
    }    
  });    
})();
