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
      },    
      confirm_exit: {    
        en: 'Exit application?',    
        uk: 'Вийти з застосунку?',    
        ru: 'Выйти из приложения?'    
      },    
      confirm_yes: {    
        en: 'Yes',    
        uk: 'Так',    
        ru: 'Да'    
      },    
      confirm_no: {    
        en: 'No',    
        uk: 'Ні',    
        ru: 'Нет'    
      }    
    });        
            
    // Створення кнопки меню        
    function createActionButton() {        
      var button = document.createElement('div');        
      button.className = 'head__action selector';    
      button.setAttribute('tabindex', '0');    
      button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>';        
              
      var menu = createMenu();        
      document.body.appendChild(menu);        
              
      // Обробник кліку        
      button.addEventListener('click', function(e) {        
        e.stopPropagation();        
        toggleMenu(menu);        
      });    
          
      // Обробник клавіатури для Smart TV    
      button.addEventListener('keydown', function(e) {    
        if (e.keyCode === 13) { // Enter/OK    
          e.preventDefault();    
          e.stopPropagation();    
          toggleMenu(menu);    
        }    
      });    
              
      return button;        
    }        
            
    // Створення випадаючого меню        
    function createMenu() {        
      var menu = document.createElement('div');        
      menu.className = 'action-menu';        
      menu.style.cssText = 'display:none;position:absolute;top:3.5em;right:1em;background:rgba(0,0,0,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:0.5em;padding:0.5em;z-index:10000;min-width:150px;';        
              
      var items = [        
        { text: Lampa.Lang.translate('reload_button'), action: doReload },        
        { text: Lampa.Lang.translate('console_button'), action: doConsole },        
        { text: Lampa.Lang.translate('logout_button'), action: confirmExit }        
      ];        
              
      items.forEach(function(item, index) {        
        var menuItem = document.createElement('div');        
        menuItem.className = 'action-menu-item selector';    
        menuItem.setAttribute('tabindex', '0');    
        menuItem.textContent = item.text;        
        menuItem.style.cssText = 'padding:0.8em 1em;cursor:pointer;transition:background 0.2s;border-radius:0.3em;';        
                
        menuItem.addEventListener('mouseenter', function() {        
          this.style.background = 'rgba(255,255,255,0.1)';        
        });        
                
        menuItem.addEventListener('mouseleave', function() {        
          this.style.background = 'transparent';        
        });        
                
        menuItem.addEventListener('click', function(e) {        
          e.stopPropagation();        
          menu.style.display = 'none';        
          setTimeout(item.action, 100);        
        });    
            
        // Обробник клавіатури для Smart TV    
        menuItem.addEventListener('keydown', function(e) {    
          if (e.keyCode === 13) { // Enter/OK    
            e.preventDefault();    
            e.stopPropagation();    
            menu.style.display = 'none';    
            setTimeout(item.action, 100);    
          } else if (e.keyCode === 38) { // Up    
            e.preventDefault();    
            var prev = this.previousElementSibling;    
            if (prev && prev.classList.contains('action-menu-item')) {    
              prev.focus();    
            }    
          } else if (e.keyCode === 40) { // Down    
            e.preventDefault();    
            var next = this.nextElementSibling;    
            if (next && next.classList.contains('action-menu-item')) {    
              next.focus();    
            }    
          }    
        });    
                
        menu.appendChild(menuItem);        
      });        
              
      // Закриття меню при кліку поза ним        
      document.addEventListener('click', function(e) {        
        if (!menu.contains(e.target)) {        
          menu.style.display = 'none';        
        }        
      });        
              
      return menu;        
    }        
            
    // Перемикання видимості меню        
    function toggleMenu(menu) {        
      if (menu.style.display === 'none') {        
        menu.style.display = 'block';    
        // Фокус на першому пункті меню    
        setTimeout(function() {    
          var firstItem = menu.querySelector('.action-menu-item');    
          if (firstItem) firstItem.focus();    
        }, 50);    
      } else {        
        menu.style.display = 'none';        
      }        
    }        
            
    // Функція перезагрузки        
    function doReload() {        
      console.log('[ActionMenu] Перезагрузка');        
      window.location.reload();        
    }        
            
    // Функція відкриття консолі        
    function doConsole() {        
      console.log('[ActionMenu] Відкриття консолі');        
      if (Lampa.Controller && typeof Lampa.Controller.toggle === 'function') {        
        Lampa.Controller.toggle('console');        
      }        
    }        
            
    // Діалог підтвердження виходу    
    function confirmExit() {    
      console.log('[ActionMenu] Підтвердження виходу');    
          
      // Створення оверлею    
      var overlay = document.createElement('div');    
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:20000;display:flex;align-items:center;justify-content:center;';    
          
      // Створення діалогу    
      var dialog = document.createElement('div');    
      dialog.style.cssText = 'background:rgba(20,20,20,0.98);border:2px solid rgba(255,255,255,0.2);border-radius:1em;padding:2em;max-width:400px;text-align:center;';    
          
      // Текст питання    
      var question = document.createElement('div');    
      question.textContent = Lampa.Lang.translate('confirm_exit');    
      question.style.cssText = 'font-size:1.2em;margin-bottom:1.5em;color:#fff;';    
      dialog.appendChild(question);    
          
      // Контейнер кнопок    
      var buttons = document.createElement('div');    
      buttons.style.cssText = 'display:flex;gap:1em;justify-content:center;';    
          
      // Кнопка "Так"    
      var yesBtn = document.createElement('div');    
      yesBtn.className = 'selector';    
      yesBtn.setAttribute('tabindex', '0');    
      yesBtn.textContent = Lampa.Lang.translate('confirm_yes');    
      yesBtn.style.cssText = 'padding:0.8em 2em;background:rgba(230,50,50,0.9);border-radius:0.5em;cursor:pointer;transition:all 0.2s;';    
          
      yesBtn.addEventListener('mouseenter', function() {    
        this.style.background = 'rgba(255,70,70,1)';    
        this.style.transform = 'scale(1.05)';    
      });    
          
      yesBtn.addEventListener('mouseleave', function() {    
        this.style.background = 'rgba(230,50,50,0.9)';    
        this.style.transform = 'scale(1)';    
      });    
          
      yesBtn.addEventListener('click', function() {    
        document.body.removeChild(overlay);    
        setTimeout(doLogout, 100);    
      });    
          
      yesBtn.addEventListener('keydown', function(e) {    
        if (e.keyCode === 13) { // Enter/OK    
          e.preventDefault();    
          document.body.removeChild(overlay);    
          setTimeout(doLogout, 100);    
        } else if (e.keyCode === 39) { // Right    
          e.preventDefault();    
          noBtn.focus();    
        }    
      });    
          
      // Кнопка "Ні"    
      var noBtn = document.createElement('div');    
      noBtn.className = 'selector';    
      noBtn.setAttribute('tabindex', '0');    
      noBtn.textContent = Lampa.Lang.translate('confirm_no');    
      noBtn.style.cssText = 'padding:0.8em 2em;background:rgba(100,100,100,0.9);border-radius:0.5em;cursor:pointer;transition:all 0.2s;';    
          
      noBtn.addEventListener('mouseenter', function() {    
        this.style.background = 'rgba(130,130,130,1)';    
        this.style.transform = 'scale(1.05)';    
      });    
          
      noBtn.addEventListener('mouseleave', function() {    
        this.style.background = 'rgba(100,100,100,0.9)';    
        this.style.transform = 'scale(1)';    
      });    
          
      noBtn.addEventListener('click', function() {    
        document.body.removeChild(overlay);    
      });    
          
      noBtn.addEventListener('keydown', function(e) {    
        if (e.keyCode === 13) { // Enter/OK    
          e.preventDefault();    
          document.body.removeChild(overlay);    
        } else if (e.keyCode === 37) { // Left    
          e.preventDefault();    
          yesBtn.focus();    
        }    
      });    
          
      buttons.appendChild(yesBtn);    
      buttons.appendChild(noBtn);    
      dialog.appendChild(buttons);    
      overlay.appendChild(dialog);    
      document.body.appendChild(overlay);    
          
      // Фокус на кнопці "Ні" за замовчуванням    
      setTimeout(function() {    
        noBtn.focus();    
      }, 50);    
          
      // Закриття по Escape або Back    
      var closeHandler = function(e) {    
        if (e.keyCode === 27 || e.keyCode === 8 || e.keyCode === 461) { // Escape, Backspace, Back    
          e.preventDefault();    
          document.body.removeChild(overlay);    
          document.removeEventListener('keydown', closeHandler);    
        }    
      };    
      document.addEventListener('keydown', closeHandler);    
    }    
            
    // Функція виходу з застосунку        
    function doLogout() {        
      console.log('[ActionMenu] Вихід з застосунку');    
          
      // Спроба 1: Lampa.Activity.out()    
      try {    
        if (Lampa.Activity && typeof Lampa.Activity.out === 'function') {    
          Lampa.Activity.out();    
        }    
      } catch(e) {    
        console.error('[ActionMenu] Помилка Lampa.Activity.out:', e);    
      }    
          
      // Затримка перед платформо-специфічними методами    
      setTimeout(function() {    
        var platform = Lampa.Platform ? Lampa.Platform.get() : null;    
        console.log('[ActionMenu] Платформа:', platform);    
            
        // Спроба 2: Tizen    
        if (window.tizen) {    
          try {    
            console.log('[ActionMenu] Спроба виходу через Tizen API');  
            tizen.application.getCurrentApplication().exit();  
            return;  
          } catch(e) {  
            console.error('[ActionMenu] Помилка Tizen exit:', e);  
          }  
        }  
          
        // Спроба 3: WebOS  
        if (window.webOS) {  
          try {  
            console.log('[ActionMenu] Спроба виходу через WebOS API');  
            webOS.platformBack();  
            return;  
          } catch(e) {  
            console.error('[ActionMenu] Помилка WebOS exit:', e);  
          }  
        }  
          
        // Спроба 4: Android  
        if (window.Android) {  
          try {  
            console.log('[ActionMenu] Спроба виходу через Android API');  
            Android.exit();  
            return;  
          } catch(e) {  
            console.error('[ActionMenu] Помилка Android exit:', e);  
          }  
        }  
          
        // Спроба 5: Orsay (старі Samsung TV)  
        if (typeof NetCastBack !== 'undefined') {  
          try {  
            console.log('[ActionMenu] Спроба виходу через Orsay API');  
            NetCastBack();  
            return;  
          } catch(e) {  
            console.error('[ActionMenu] Помилка Orsay exit:', e);  
          }  
        }  
          
        // Спроба 6: window.close()  
        try {  
          console.log('[ActionMenu] Спроба виходу через window.close()');  
          window.close();  
        } catch(e) {  
          console.error('[ActionMenu] Помилка window.close:', e);  
        }  
          
        // Якщо нічого не спрацювало  
        console.warn('[ActionMenu] Не вдалося закрити застосунок автоматично');  
          
        // Показати повідомлення користувачу  
        if (Lampa.Noty) {  
          Lampa.Noty.show(Lampa.Lang.translate('exit_manual_instruction') || 'Закрийте застосунок вручну через меню Smart TV');  
        }  
      }  
        
      // Викликаємо вихід  
      performExit();  
    }  
      
    // Створення кнопки меню  
    function createActionButton() {  
      var button = document.createElement('div');  
      button.className = 'head__action selector';  
      button.innerHTML = icons.menu;  
      button.addEventListener('click', function() {  
        toggleMenu(menu);  
      });  
      return button;  
    }  
      
    // Вставка кнопки в header  
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
