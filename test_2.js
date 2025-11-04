(function () {  
  'use strict';  
  
  // ===== UTILITY ФУНКЦІЇ ТА КЛАСИ (ваш існуючий код) =====  
  function _classCallCheck(instance, Constructor) {  
    if (!(instance instanceof Constructor)) {  
      throw new TypeError("Cannot call a class as a function");  
    }  
  }  
  
  function _defineProperties(target, props) {  
    for (var i = 0; i < props.length; i++) {  
      var descriptor = props[i];  
      descriptor.enumerable = descriptor.enumerable || false;  
      descriptor.configurable = true;  
      if ("value" in descriptor) descriptor.writable = true;  
      Object.defineProperty(target, descriptor.key, descriptor);  
    }  
  }  
  
  function _createClass(Constructor, protoProps, staticProps) {  
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);  
    if (staticProps) _defineProperties(Constructor, staticProps);  
    return Constructor;  
  }  
  
  // ... весь ваш існуючий код класів Player, Trailer, State ...  
  // ... весь ваш існуючий код обфускації та кешування ...  
  // ... весь ваш існуючий код HTML шаблонів та CSS ...  
  
  // ===== ФУНКЦІЯ ЗАПУСКУ ПЛАГІНА =====  
  function startPlugin() {  
    if (!Lampa.Platform.screen('tv')) return console.log('Cardify', 'no tv');  
      
    Lampa.Lang.add({  
      cardify_enable_sound: {  
        ru: 'Включить звук',  
        en: 'Enable sound',  
        uk: 'Увімкнути звук',  
        be: 'Уключыць гук',  
        zh: '启用声音',  
        pt: 'Ativar som',  
        bg: 'Включване на звук'  
      },  
      cardify_enable_trailer: {  
        ru: 'Показывать трейлер',  
        en: 'Show trailer',  
        uk: 'Показувати трейлер',  
        be: 'Паказваць трэйлер',  
        zh: '显示预告片',  
        pt: 'Mostrar trailer',  
        bg: 'Показване на трейлър'  
      }  
    });  
  
    // Додавання HTML шаблонів  
    Lampa.Template.add('full_start_new', "...");  
      
    // Додавання CSS стилів  
    var style = "\n<style>\n.cardify{...}\n</style>\n";  
    Lampa.Template.add('cardify_css', style);  
    $('body').append(Lampa.Template.get('cardify_css', {}, true));  
  
    // Додавання налаштувань  
    Lampa.SettingsApi.addComponent({  
      component: 'cardify',  
      icon: icon,  
      name: 'Cardify'  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'cardify',  
      param: {  
        name: 'cardify_run_trailers',  
        type: 'trigger',  
        "default": false  
      },  
      field: {  
        name: Lampa.Lang.translate('cardify_enable_trailer')  
      }  
    });  
  
    // Підписка на події  
    Follow.get(Type.de([102, 117, 108, 108]), function (e) {  
      if (Type.co(e)) {  
        Follow.skodf(e);  
        if (!Main.cases()[Main.stor()].field('cardify_run_trailers')) return;  
        var trailer = Follow.vjsk(video(e.data));  
  
        if (Main.cases().Manifest.app_digital >= 220) {  
          if (Main.cases().Activity.active().activity === e.object.activity) {  
            trailer && new Trailer(e.object, trailer);  
          } else {  
            var follow = function follow(a) {  
              if (a.type == Type.de([115, 116, 97, 114, 116]) && a.object.activity === e.object.activity && !e.object.activity.trailer_ready) {  
                Main.cases()[Type.de([76, 105, 115, 116, 101, 110, 101, 114])].remove('activity', follow);  
                trailer && new Trailer(e.object, trailer);  
              }  
            };  
            Follow.get('activity', follow);  
          }  
        }  
      }  
    });  
  }  
  
  // ===== ВИКЛИК ФУНКЦІЇ ЗАПУСКУ =====  
  if (Follow.go) startPlugin();  
  else {  
    Follow.get(Type.de([97, 112, 112]), function (e) {  
      if (Type.re(e)) startPlugin();  
    });  
  }  
  
 // ===== МОДИФІКАЦІЯ СТИЛІВ =====  
  function modifyCardifyStyles() {  
    const oldStyle = document.getElementById('cardify-compact-style');  
    if (oldStyle) oldStyle.remove();  
  
    const style = document.createElement('style');  
    style.id = 'cardify-compact-style';  
    style.textContent = `  
      /* Компактний оверлей замість повноекранного */  
      .cardify-trailer__youtube {  
        position: fixed !important;  
        top: 50% !important;  
        left: 50% !important;  
        transform: translate(-50%, -50%) !important;  
        width: 70% !important;  
        height: 60% !important;  
        max-width: 1200px !important;  
        max-height: 700px !important;  
        border-radius: 12px !important;  
        overflow: hidden !important;  
        box-shadow: 0 20px 60px rgba(0,0,0,0.8) !important;  
        z-index: 9999 !important;  
      }  
  
      /* Затемнення фону */  
      .cardify-trailer__youtube::before {  
        content: '' !important;  
        position: fixed !important;  
        top: 0 !important;  
        left: 0 !important;  
        right: 0 !important;  
        bottom: 0 !important;  
        background: rgba(0,0,0,0.85) !important;  
        z-index: -1 !important;  
      }  
  
      /* YouTube iframe */  
      .cardify-trailer__youtube iframe {  
        width: 100% !important;  
        height: 100% !important;  
        border: none !important;  
      }  
  
      /* Анімація появи */  
      @keyframes cardify-fadein {  
        from {  
          opacity: 0;  
          transform: translate(-50%, -50%) scale(0.95);  
        }  
        to {  
          opacity: 1;  
          transform: translate(-50%, -50%) scale(1);  
        }  
      }  
  
      .cardify-trailer__youtube {  
        animation: cardify-fadein 0.3s ease-out !important;  
      }  
    `;  
  
    document.head.appendChild(style);  
    console.log('[Cardify Compact] Стилі застосовано');  
  }  
  
  // Виклик модифікації після готовності Lampa  
  if (window.appready) {  
    setTimeout(modifyCardifyStyles, 1000);  
  } else {  
    Lampa.Listener.follow('app', function(e) {  
      if (e.type === 'ready') {  
        setTimeout(modifyCardifyStyles, 1000);  
      }  
    });  
  }  
  // ===== КІНЕЦЬ МОДИФІКАЦІЇ =====  
  
})(); // <-- ЗАКРИВАЮЧА ДУЖКА IIFE В САМОМУ КІНЦІ
