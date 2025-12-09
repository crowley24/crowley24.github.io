(function() {
'use strict';

var nthChildIndex = null;

// ==================== Функції ====================

function showReload(reloadText){  
  if (document.querySelector('.modal') == null) {  
    Lampa.Modal.open({  
      title: '',  
      align: 'center',  
      zIndex: 300,  
      html: $('<div class="about">' + reloadText + '</div>'),  
      buttons: [{  
        name: 'Нет',  
        onSelect: function() {  
          $('.modal').remove();  
          Lampa.Controller.toggle('content');  
        }  
      }, {  
        name: 'Да',  
        onSelect: function() {  
          window.location.reload();  
        }  
      }]  
    });  
  }  
}

function showLoadingBar() {
  try {
    var loadingBar = document.createElement('div');
    loadingBar.className = 'loading-bar';
    loadingBar.style.position = 'fixed';
    loadingBar.style.top = '50%';
    loadingBar.style.left = '50%';
    loadingBar.style.transform = 'translate(-50%, -50%)';
    loadingBar.style.zIndex = '9999';
    loadingBar.style.display = 'block';
    loadingBar.style.width = '30em';
    loadingBar.style.height = '2.5em';
    loadingBar.style.backgroundColor = '#595959';
    loadingBar.style.borderRadius = '4em';

    var loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.style.position = 'absolute';
    loadingIndicator.style.left = '0';
    loadingIndicator.style.top = '0';
    loadingIndicator.style.bottom = '0';
    loadingIndicator.style.width = '0';
    loadingIndicator.style.backgroundColor = '#64e364';
    loadingIndicator.style.borderRadius = '4em';

    var loadingPercentage = document.createElement('div');
    loadingPercentage.className = 'loading-percentage';
    loadingPercentage.style.position = 'absolute';
    loadingPercentage.style.top = '50%';
    loadingPercentage.style.left = '50%';
    loadingPercentage.style.transform = 'translate(-50%, -50%)';
    loadingPercentage.style.color = '#fff';
    loadingPercentage.style.fontWeight = 'bold';
    loadingPercentage.style.fontSize = '1.7em';

    loadingBar.appendChild(loadingIndicator);
    loadingBar.appendChild(loadingPercentage);
    document.body.appendChild(loadingBar);

    var startTime = Date.now();
    var duration = 1000;
    var interval = setInterval(function() {
      var elapsed = Date.now() - startTime;
      var progress = Math.min((elapsed / duration) * 100, 100);

      loadingIndicator.style.width = progress + '%';
      loadingPercentage.textContent = Math.round(progress) + '%';

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(function() {
          try { document.body.removeChild(loadingBar); } catch(e){}
        }, 500);
      }
    }, 20);
  } catch (e) {
    console.error('showLoadingBar error', e);
  }
}

function showDeletedBar() {
  try {
    var loadingBar = document.createElement('div');
    loadingBar.className = 'loading-bar';
    loadingBar.style.position = 'fixed';
    loadingBar.style.top = '50%';
    loadingBar.style.left = '50%';
    loadingBar.style.transform = 'translate(-50%, -50%)';
    loadingBar.style.zIndex = '9999';
    loadingBar.style.display = 'block';
    loadingBar.style.width = '30em';
    loadingBar.style.height = '2.5em';
    loadingBar.style.backgroundColor = '#595959';
    loadingBar.style.borderRadius = '4em';

    var loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.style.position = 'absolute';
    loadingIndicator.style.left = '0';
    loadingIndicator.style.top = '0';
    loadingIndicator.style.bottom = '0';
    loadingIndicator.style.width = '0';
    loadingIndicator.style.backgroundColor = '#ff6464';
    loadingIndicator.style.borderRadius = '4em';

    var loadingPercentage = document.createElement('div');
    loadingPercentage.className = 'loading-percentage';
    loadingPercentage.style.position = 'absolute';
    loadingPercentage.style.top = '50%';
    loadingPercentage.style.left = '50%';
    loadingPercentage.style.transform = 'translate(-50%, -50%)';
    loadingPercentage.style.color = '#fff';
    loadingPercentage.style.fontWeight = 'bold';
    loadingPercentage.style.fontSize = '1.7em';

    loadingBar.appendChild(loadingIndicator);
    loadingBar.appendChild(loadingPercentage);
    document.body.appendChild(loadingBar);

    var startTime = Date.now();
    var duration = 1000;
    var interval = setInterval(function() {
      var elapsed = Date.now() - startTime;
      var progress = Math.min((elapsed / duration) * 100, 100);

      loadingIndicator.style.width = progress + '%';
      loadingPercentage.textContent = Math.round(progress) + '%';

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(function() {
          try { document.body.removeChild(loadingBar); } catch(e){}
        }, 500);
      }
    }, 20);
  } catch (e) {
    console.error('showDeletedBar error', e);
  }
}

function settingsWatch() {  
  var check = setInterval(function() {  
      var need = Lampa.Storage.get('needRebootSettingExit');  
      if (need) {  
          clearInterval(check);  
          showReload('Для применения изменений нужно перезагрузить приложение');  
      }  
  }, 1000);  
}

function itemON(sourceURL, sourceName, sourceAuthor, itemName) {  
  var plugins = Lampa.Storage.get('plugins') || [];  
  var newPlugin = {  
      url: sourceURL,  
      name: sourceName,  
      author: sourceAuthor,  
      item: itemName,  
      status: 1  
  };

  var existingPlugin = plugins.find(function(plugin) { return plugin.url === sourceURL; });  
  if (existingPlugin) {  
      existingPlugin.status = 1;  
  } else {  
      plugins.push(newPlugin);  
  }  

  Lampa.Storage.set('plugins', plugins);  

  var script = document.createElement('script');  
  script.src = sourceURL;  
  document.getElementsByTagName('head')[0].appendChild(script);  

  showLoadingBar();  
  setTimeout(function() {  
      Lampa.Settings.update();  
      Lampa.Noty.show("Плагин " + sourceName + " успешно установлен");  
  }, 1500);  
}

function deletePlugin(pluginToRemoveUrl) {  
  var plugins = Lampa.Storage.get('plugins');  
  var updatedPlugins = plugins.filter(function(obj) { return obj.url !== pluginToRemoveUrl; });  
  Lampa.Storage.set('plugins', updatedPlugins);  

  setTimeout(function() {  
      Lampa.Settings.update();  
      Lampa.Noty.show("Плагин успешно удален");  
  }, 1500);  

  Lampa.Storage.set('needRebootSettingExit', true);  
  settingsWatch();  
  showDeletedBar();  
}

function checkPlugin(pluginToCheck) {  
  var plugins = Lampa.Storage.get('plugins') || [];  
  return plugins.some(function(obj) { return obj.url === pluginToCheck; });  
}

function focus_back(event) {  
  var targetElement = event.target;  
  var parentElement = targetElement.parentElement;  
  var children = Array.from(parentElement.children);  
  var index = children.indexOf(targetElement);  
  nthChildIndex = index + 1;  
  return nthChildIndex;  
}

// ==================== Компонент Плагіни ====================

Lampa.SettingsApi.addComponent({  
  component: 'add_plugin',  
  name: 'Плагины',  
  icon: icon_add_plugin  
});

// ==================== Підменю Інтерфейс ====================

Lampa.SettingsApi.addParam({  
  component: 'add_plugin',  // вкладка "Плагіни"
  param: {
      name: 'add_interface_plugin',
      type: 'static',
      default: true
  },
  field: {
      name: icon_add_interface_plugin
  },
  onRender: function(item) {
      item.on('hover:enter', function() {
          Lampa.Settings.create('add_interface_plugin'); // відкриваємо підменю
          Lampa.Controller.enabled().controller.back = function() {
              Lampa.Settings.create('add_plugin'); // повернення в "Плагіни"
          }
      });
  }
});

// ==================== Плагіни TMDB ====================

Lampa.SettingsApi.addParam({  
  component: 'add_interface_plugin',  
  param: {  
      name: 'TMDB',  
      type: 'select',  
      values: {1:'Установить',2:'Удалить'}  
  },  
  field: {  
      name: 'TMDB Proxy',  
      description: 'Проксирование постеров для сайта TMDB'  
  },  
  onChange: function(value) {  
      if (value=='1') itemON('https://bylampa.github.io/tmdb-proxy.js','TMDB Proxy','@lampa','TMDB');  
      if (value=='2') deletePlugin('https://bylampa.github.io/tmdb-proxy.js');  
  },  
  onRender: function(item) {
      $('.settings-param__name', item).css('color','f3d900');
  }
});

// ==================== Плагіни Tricks ====================

Lampa.SettingsApi.addParam({  
  component: 'add_interface_plugin',  
  param: {  
      name: 'Tricks',  
      type: 'select',  
      values: {1:'Установить',2:'Удалить'}  
  },  
  field: {  
      name: 'Приятные мелочи',  
      description: 'Дополнения: скринсейверы, стили кнопок, часы в плеере и т.п.'  
  },  
  onChange: function(value) {  
      if (value=='1') itemON('https://andreyurl54.github.io/diesel5/tricks.js','Приятные Мелочи','@AndreyURL54','Tricks');  
      if (value=='2') deletePlugin('https://andreyurl54.github.io/diesel5/tricks.js');  
  },  
  onRender: function(item) {
      $('.settings-param__name', item).css('color','f3d900');
  }
});

// ==================== Старт ====================

function addonStart() {
    // Тут можна додати додаткову ініціалізацію
}

if (!!window.appready) addonStart();  
else Lampa.Listener.follow('app', function(e){if(e.type==='ready') addonStart();})();

})();
