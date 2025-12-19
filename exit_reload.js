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
        uk: 'Перезавантаження', // Виправлено: Перезавантаження
        ru: 'Перезагрузка'    
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
      // Тут ми використовуємо Lampa.Select, тому нам не потрібно турбуватися про фокус пульта, 
      // оскільки Lampa сама обробляє фокус у вікні Select.
      Lampa.Select.show({  
        title: Lampa.Lang.translate('action_menu'),  
        items: [  
          {  
            title: Lampa.Lang.translate('reload_button'),  
            reload: true  
          },  
          {  
            title: Lampa.Lang.translate('logout_button'),  
            logout: true  
          }  
        ],  
        onSelect: function(item) {  
          if (item.reload) {  
            doReload();  
          } else if (item.logout) {  
            doLogout();  
          }  
        },  
        // Повертаємо фокус на 'head', щоб закрити меню Select і повернути фокус назад до шапки.
        onBack: function() {  
          Lampa.Controller.toggle('head');  
        }  
      });  
    }  
        
    // Створення основної кнопки меню з іконкою power/reload  
    function createActionButton() {    
      var button = document.createElement('div');    
      button.className = 'head__action action-menu-button selector';    
      
      // ЗМІНЕНО: Збільшено SVG до 32x32
      button.innerHTML = `    
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">    
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
          <line x1="12" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
        </svg>    
      `;    
          
      // ЗМІНЕНО: Збільшено розмір контейнера до 3.5em
      button.style.cssText = `    
        display: inline-flex;    
        align-items: center;    
        justify-content: center;  
        padding: 0.5em;    
        margin-left: 1em;    
        cursor: pointer;    
        border-radius: 8px;    
        transition: background 0.2s;  
        width: 3.5em;  
        height: 3.5em;  
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
        // Вставляємо кнопку на початок списку дій (препенд) для кращої видимості
        actions.prepend(button);  
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

