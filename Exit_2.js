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
    if (window.logout_button_plugin) return;  
    window.logout_button_plugin = true;  
      
    console.log('[LogoutButton] Ініціалізація плагіна');  
      
    // Локалізація  
    Lampa.Lang.add({  
      logout_button: {  
        en: 'Exit',  
        uk: 'Вихід',  
        ru: 'Выход'  
      },  
      logout_confirm: {  
        en: 'Are you sure you want to exit?',  
        uk: 'Ви впевнені, що хочете вийти?',  
        ru: 'Вы уверены, что хотите выйти?'  
      },  
      cancel: {  
        en: 'Cancel',  
        uk: 'Скасувати',  
        ru: 'Отмена'  
      }  
    });  
      
    // Функція діалогу виходу  
    function showLogoutDialog() {  
      Lampa.Select.show({  
        title: Lampa.Lang.translate('logout_button'),  
        items: [  
          {  
            title: Lampa.Lang.translate('logout_confirm'),  
            yes: true  
          },  
          {  
            title: Lampa.Lang.translate('cancel'),  
            cancel: true  
          }  
        ],  
        onSelect: function(item) {  
          if (item.yes) {  
            // Очистити дані користувача  
            if (Lampa.Account && typeof Lampa.Account.logout === 'function') {  
              Lampa.Account.logout();  
            }  
              
            Lampa.Storage.set('account', {});  
            Lampa.Storage.set('account_user', null);  
              
            // Перезавантажити сторінку  
            window.location.reload();  
          }  
            
          Lampa.Controller.toggle('head');  
        },  
        onBack: function() {  
          Lampa.Controller.toggle('head');  
        }  
      });  
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
        
      // Обробник для пульта (jQuery події)  
      $(button).on('hover:enter', function() {  
        showLogoutDialog();  
      });  
        
      // Обробник для миші  
      button.addEventListener('click', function() {  
        showLogoutDialog();  
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
        var button = createLogoutButton();  
        actions.appendChild(button);  
        console.log('[LogoutButton] Кнопку додано в header');  
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
