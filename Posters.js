(function(){  
  'use strict';  
    
  // Налаштування  
  var STORAGE_KEY = 'poster_orientation';  
    
  function injectStyles(){  
    if (document.getElementById('poster-orientation-style')) return;  
    var css = ""  
    // Горизонтальний режим  
    + ".poster-horizontal .card{width:100%!important;max-width:none!important}"  
    + ".poster-horizontal .card__img{width:200px!important;height:112px!important;float:left;margin-right:15px}"  
    + ".poster-horizontal .card__view{display:flex;align-items:center}"  
    + ".poster-horizontal .card__title{font-size:16px}"  
    // Вертикальний режим (стандартний)  
    + ".poster-vertical .card{width:auto!important}"  
    + ".poster-vertical .card__img{width:100%!important;height:auto!important;float:none;margin-right:0}"  
    + ".poster-vertical .card__view{display:block}";  
    var s=document.createElement('style'); s.id='poster-orientation-style'; s.textContent=css; document.head.appendChild(s);  
  }  
    
  function toggleOrientation(){  
    var current = Lampa.Storage.get(STORAGE_KEY, 'vertical');  
    var newMode = current === 'vertical' ? 'horizontal' : 'vertical';  
      
    // Зберегти налаштування  
    Lampa.Storage.set(STORAGE_KEY, newMode);  
      
    // Застосувати клас до body  
    document.body.classList.remove('poster-vertical', 'poster-horizontal');  
    document.body.classList.add('poster-' + newMode);  
      
    Lampa.Noty.show('Постери: ' + (newMode === 'vertical' ? 'вертикальні' : 'горизонтальні'));  
  }  
    
  function applyOrientation(){  
    var mode = Lampa.Storage.get(STORAGE_KEY, 'vertical');  
    document.body.classList.add('poster-' + mode);  
  }  
    
  function addSettingsOption(){  
    if (!Lampa.SettingsApi) return;  
      
    Lampa.SettingsApi.addParam({  
      component: 'interface',  
      param: {  
        name: 'poster_orientation',  
        type: 'select',  
        values: {  
          'vertical': 'Вертикальні',  
          'horizontal': 'Горизонтальні'  
        },  
        'default': 'vertical'  
      },  
      field: {  
        name: 'Орієнтація постерів',  
        description: 'Змінити вигляд карток на головній сторінці'  
      },  
      onChange: function(value){  
        Lampa.Storage.set(STORAGE_KEY, value);  
        document.body.classList.remove('poster-vertical', 'poster-horizontal');  
        document.body.classList.add('poster-' + value);  
      }  
    });  
  }  
    
  function addToggleButton(){  
    // Додати кнопку в меню  
    var btn = $('<li class="menu__item selector" data-action="toggle-poster"><div class="menu__ico"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg></div><div class="menu__text">Постери</div></li>');  
      
    btn.on('hover:enter', function(){  
      toggleOrientation();  
    });  
      
    $('.menu .menu__list').eq(0).append(btn);  
  }  
    
  function init(){  
    injectStyles();  
    applyOrientation();  
    addSettingsOption();  
    addToggleButton();  
  }  
    
  if (window.appready) {  
    init();  
  } else {  
    Lampa.Listener.follow('app', function(e){  
      if (e.type === 'ready') init();  
    });  
  }  
})();
