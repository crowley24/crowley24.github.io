(function () {  
  'use strict';  
  
  function startPlugin() {  
    // Варіант через Lampa.Template (як у Lampac)  
    Lampa.Template.add('hide_details_css', [  
      '<style>',  
      /* Приховати лише рік і країну, якщо мають окремі класи */  
      '.full-start-new__details .tag--year,',  
      '.full-start-new__details .tag--country { display: none; }',  
      '',  
      /* АБО: приховати весь блок деталей над назвою — розкоментуйте */  
      // '.full-start-new__details,',  
      // '.full-start__tags { display: none; }',  
      '</style>'  
    ].join('\n'));  
  
    $('body').append(Lampa.Template.get('hide_details_css', {}, true));  
  
    // Або простіше — напряму, без Template:  
    // $('body').append('<style>.full-start-new__details { display:none; }</style>');  
  }  
  
  if (window.app_ready) {  
    startPlugin();  
  } else {  
    Lampa.Listener.follow('app', function (e) {  
      if (e.type == 'ready') startPlugin();  
    });  
  }  
})();
