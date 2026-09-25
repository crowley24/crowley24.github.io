(function () {  
  'use strict';  
  
  console.log('[HIDE-PLUGIN] loaded'); // якщо цього немає в консолі — плагін не запустився  
  
  Lampa.Listener.follow('full', function (e) {  
    console.log('[HIDE-PLUGIN] full event:', e.type);  
    if (e.type == 'complite') {  
      var render = e.object.activity.render();  
      // показати ВСІ класи у картці — знайдіть блок над назвою  
      render.find('[class]').each(function () {  
        console.log('[HIDE-PLUGIN]', this.className, '->', $(this).text().substr(0, 60));  
      });  
    }  
  });  
})();
