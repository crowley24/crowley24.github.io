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
        uk: 'Перезавантаження', 
        ru: 'Перезагрузка'    
      },  
      exit_button: {    
          en: 'Exit App',    
          uk: 'Закрити застосунок',    
          ru: 'Выйти из приложения'    
      },
      exit_confirm_title: {    
          en: 'Exit Application',    
          uk: 'Вихід з застосунку',    
          ru: 'Выход из приложения'    
      },    
      exit_confirm_message: {    
          en: 'Are you sure you want to exit?',    
          uk: 'Ви впевнені, що хочете вийти?',    
          ru: 'Вы уверены, что хотите выйти?'    
      },    
      exit_confirm_yes: {    
          en: 'Yes',    
          uk: 'Так',    
          ru: 'Да'    
      },    
      exit_confirm_no: {    
          en: 'No',    
          uk: 'Ні',    
          ru: 'Нет'    
      },    
      exit_manual_instruction: {    
          en: 'Please close the app manually via Smart TV menu',    
          uk: 'Закрийте застосунок вручну через меню Smart TV',    
          ru: 'Закройте приложение вручную через меню Smart TV'    
      } 
    });    
        
    // Функції дій  
    function doReload() {  
      window.location.reload();  
    }  
      
    // НОВА ФУНКЦІЯ: ВИХІД ІЗ ЗАСТОСУНКУ З ПІДТВЕРДЖЕННЯМ
    function doExitApp() {
        if (Lampa.Select) {    
            Lampa.Select.show({    
                title: Lampa.Lang.translate('exit_confirm_title'),    
                items: [    
                    {    
                        title: Lampa.Lang.translate('exit_confirm_yes'),    
                        value: 'yes'    
                    },    
                    {    
                        title: Lampa.Lang.translate('exit_confirm_no'),    
                        value: 'no'    
                    }    
                ],    
                onSelect: function(item) {    
                    if (item.value === 'yes') {    
                        performPlatformExit();    
                    }    
                },    
                onBack: function() {
                    Lampa.Controller.toggle('head');
                }    
            });    
        } else {    
            performPlatformExit();    
        }
    }
    
    // ПЛАТФОРМОЗАЛЕЖНА ЛОГІКА ЗАКРИТТЯ (ВИПРАВЛЕНО: прибрано Activity.out та збільшено затримку)
    function performPlatformExit() {
        
        // Видалено Lampa.Activity.out() для уникнення конфліктів.
        
        setTimeout(function() {  
            // 1. Tizen
            if (window.tizen) {  
                try {  
                    tizen.application.getCurrentApplication().exit();  
                    return;  
                } catch(e) {}  
            }  
            // 2. webOS
            if (window.webOS) {  
                try {  
                    webOS.platformBack();  
                    return;  
                } catch(e) {}  
            }  
            // 3. Android
            if (window.Android) {  
                try {  
                    Android.exit();  
                    return;  
                } catch(e) {}  
            }  
            // 4. NetCast (LG Legacy)
            if (typeof NetCastBack === 'function') {  
                try {  
                    NetCastBack();  
                    return;  
                } catch(e) {}  
            }  
            // 5. Стандартне закриття вкладки
            try {  
                window.close();  
            } catch(e) {}  
              
            // 6. Якщо все інше не вдалося
            if (Lampa.Noty) {  
                Lampa.Noty.show(Lampa.Lang.translate('exit_manual_instruction'));  
            }  
        }, 300); // Збільшено затримку до 300ms для надійності
    }
      
    // Показати меню дій  
    function showActionMenu() {  
      Lampa.Select.show({  
        title: Lampa.Lang.translate('action_menu'),  
        items: [  
          {  
            title: Lampa.Lang.translate('reload_button'),  
            action: 'reload'  
          },  
          {  
            title: Lampa.Lang.translate('exit_button'),  
            action: 'exit'
          }  
        ],  
        onSelect: function(item) {  
          if (item.action === 'reload') {  
            doReload();  
          } else if (item.action === 'exit') {  
            doExitApp();
          }  
        },  
        onBack: function() {  
          Lampa.Controller.toggle('head');  
        }  
      });  
    }  
        
    // Створення основної кнопки меню з іконкою power/reload  
    function createActionButton() {    
      var button = document.createElement('div');    
      button.className = 'head__action action-menu-button selector';    
      
      button.innerHTML = `    
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">    
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
          <line x1="12" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
        </svg>    
      `;    
          
      button.style.cssText = `    
        display: inline-flex;    
        align-items: center;    
        justify-content: center;  
        padding: 0.5em;    
        margin-left: 1em;    
        cursor: pointer;    
        border-radius: 8px;    
        transition: background 0.2s;  
        width: 2.8em;  
        height: 2.8em;  
      `;    
          
      // Обробник для пульта  
      $(button).on('hover:enter', function() {    
        showActionMenu();  
      });    
          
      // Обробник для миші    
      button.addEventListener('click', function() {    
        showActionMenu();  
      });    
          
      // Hover ефекти (залишаємо без змін)
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

