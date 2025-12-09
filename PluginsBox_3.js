(function () {    
    'use strict';    
    
    function addonStart() {    
        try {    
            // Перевірка залежностей    
            if (typeof $ === 'undefined') {    
                console.error('[PluginManager] jQuery не завантажено');    
                return;    
            }    
                
            if (typeof Lampa === 'undefined') {    
                console.error('[PluginManager] Lampa не доступне');    
                return;    
            }    
                
            if (typeof Lampa.SettingsApi === 'undefined') {    
                console.error('[PluginManager] Lampa.SettingsApi не доступне');    
                return;    
            }    
                
            console.log('[PluginManager] Всі залежності доступні, запускаємо ініціалізацію');    
                
/* -------------------------------------------    
   Іконки розділів плагіна (HTML/SVG)    
   ------------------------------------------- */    
var icon_add_plugin = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>';    
var icon_add_interface_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><div style="font-size:1.3em">Інтерфейс</div></div>';    
var icon_add_management_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div><div style="font-size:1.3em">Керування</div></div>';    
var icon_add_online_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg></div><div style="font-size:1.3em">Онлайн</div></div>';    
var icon_add_torrent_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><div style="font-size:1.3em">Торренти</div></div>';    
var icon_add_tv_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5l2 3 2-3h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg></div><div style="font-size:1.3em">ТВ</div></div>';    
var icon_add_music_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div><div style="font-size:1.3em">Музика</div></div>';    
var icon_add_radio_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V8c0-1.11-.89-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h16v4z"/></svg></div><div style="font-size:1.3em">Радіо</div></div>';    
var icon_add_sisi_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg></div><div style="font-size:1.3em">18+</div></div>';    
    
var nthChildIndex = null; // Объявляем переменную для хранения индекса nth-child    
    
/* Регулярно вызываемые функции */    
Lampa.Storage.set('needReboot', false);    
Lampa.Storage.set('needRebootSettingExit', false);    
    
/* Запрос на перезагрузку в модальном окне */    
function showReload(reloadText){    
  if (document.querySelector('.modal') == null) {    
   Lampa.Modal.open({    
      title: '',    
      align: 'center',    
      zIndex: 300,    
      html: $('<div class="about">' + reloadText + '</div>'),    
      buttons: [{    
        name: 'Ні',    
        onSelect: function onSelect() {    
          $('.modal').remove();    
	  Lampa.Controller.toggle('content')    
        }    
      }, {    
        name: 'Так',    
        onSelect: function onSelect() {    
          window.location.reload();    
        }    
      }]    
   });    
  }    
}    
    
/* Функция анимации установки плагина */	    
function showLoadingBar() {    
  var loadingBar = document.createElement('div');    
  loadingBar.className = 'loading-bar';    
  loadingBar.style.position = 'fixed';    
  loadingBar.style.top = '50%';    
  loadingBar.style.left = '50%';    
  loadingBar.style.transform = 'translate(-50%, -50%)';    
  loadingBar.style.zIndex = '9999';    
  loadingBar.style.display = 'none';    
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
  loadingIndicator.style.backgroundColor = '#f3d900';    
  loadingIndicator.style.borderRadius = '4em';    
  loadingIndicator.style.transition = 'width 0.3s ease';    
    
  loadingBar.appendChild(loadingIndicator);    
  document.body.appendChild(loadingBar);    
    
  loadingBar.style.display = 'block';    
  var width = 0;    
  var interval = setInterval(function() {    
    width += 10;    
    loadingIndicator.style.width = width + '%';    
    if (width >= 100) {    
      clearInterval(interval);    
      setTimeout(function() {    
        document.body.removeChild(loadingBar);    
      }, 500);    
    }    
  }, 200);    
}    
    
/* Функция анимации удаления плагина */    
function showDeletedBar() {    
  var loadingBar = document.createElement('div');    
  loadingBar.className = 'loading-bar';    
  loadingBar.style.position = 'fixed';    
  loadingBar.style.top = '50%';    
  loadingBar.style.left = '50%';    
  loadingBar.style.transform = 'translate(-50%, -50%)';    
  loadingBar.style.zIndex = '9999';    
  loadingBar.style.display = 'none';    
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
  loadingIndicator.style.width = '100%';    
  loadingIndicator.style.backgroundColor = '#f3d900';    
  loadingIndicator.style.borderRadius = '4em';    
  loadingIndicator.style.transition = 'width 0.3s ease';    
    
  loadingBar.appendChild(loadingIndicator);    
  document.body.appendChild(loadingBar);    
    
  loadingBar.style.display = 'block';    
      
  setTimeout(function() {    
    var width = 100;    
    var interval = setInterval(function() {    
      width -= 10;    
      loadingIndicator.style.width = width + '%';    
      if (width <= 0) {    
        clearInterval(interval);    
        setTimeout(function() {    
          document.body.removeChild(loadingBar);    
        }, 500);    
      }    
    }, 200);    
  }, 500);    
}    
    
/* Функция скрытия установки - ВИПРАВЛЕНО */    
function hideInstall(){    
    setTimeout(function() {    
        // Заміна :contains() на перевірку текстового вмісту    
        $('div.settings-param__value').remove();    
          
        $('div > span').each(function() {    
            if ($(this).text() === 'Редагувати' ||   
                $(this).text() === 'Ще' ||   
                $(this).text() === 'Історія' ||   
                $(this).text() === 'Статус') {    
                $(this).parent().remove();    
            }    
        });    
    }, 0);    
}    
    
/* Функция сохранения фокуса */    
function focus_back(event){    
    var element = event.target;    
    var parent = element.closest('.settings-param');    
    if (parent) {    
        var parentElement = parent.parentElement;    
        if (parentElement) {    
            var children = Array.from(parentElement.children);    
            var index = children.indexOf(parent) + 1;    
            nthChildIndex = index;    
            return nthChildIndex;    
        }    
    }    
    return null;    
}    
    
/* Функция добавления плагина */    
function itemON(url, name, author, plugin, nthChildIndex) {    
    var plugins = Lampa.Storage.get('plugins') || [];    
    var existingPlugin = plugins.find(function(p) { return p.url === url; });    
        
    if (existingPlugin) {    
        Lampa.Noty.show('Плагін вже встановлено');    
        return;    
    }    
        
    var newPlugin = {    
        url: url,    
        name: name,    
        author: author,    
        plugin: plugin,    
        status: 1    
    };    
        
    plugins.push(newPlugin);    
    Lampa.Storage.set('plugins', plugins);    
        
    showLoadingBar();    
        
    setTimeout(function() {    
        Lampa.Settings.update();    
        Lampa.Noty.show("Плагін успішно встановлено");    
        if (nthChildIndex) {    
            var F = document.querySelector("#app > div.settings.animate > div.settings__content.layer--height > div.settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")")    
            if (F) {    
                Lampa.Controller.focus(F);    
                Lampa.Controller.toggle('settings_component');    
            }    
        }    
    }, 2000);    
        
    Lampa.Storage.set('needRebootSettingExit', true);    
    settingsWatch();    
}    
    
/* Функция удаления плагина */    
function deletePlugin(pluginToRemoveUrl, nthChildIndex) {    
    var plugins = Lampa.Storage.get('plugins');    
    var updatedPlugins = plugins.filter(function(obj) {return obj.url !== pluginToRemoveUrl});    
    Lampa.Storage.set('plugins', updatedPlugins);    
        
    setTimeout(function() {    
        Lampa.Settings.update();    
        Lampa.Noty.show("Плагін успішно видалено");    
    }, 1500);    
        
    setTimeout(function() {    
        if (nthChildIndex) {    
            var F = document.querySelector("#app > div.settings.animate > div.settings__content.layer--height > div.settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")")    
            if (F) {    
                Lampa.Controller.focus(F);    
                Lampa.Controller.toggle('settings_component');    
            }    
        }    
    }, 2000);    
        
    Lampa.Storage.set('needRebootSettingExit', true);    
    settingsWatch();    
    showDeletedBar();    
}    
    
/* Функция проверки плагина */    
function checkPlugin(url) {    
    var plugins = Lampa.Storage.get('plugins') || [];    
    return plugins.some(function(plugin) { return plugin.url === url; });    
}    
    
/* Функция слежения за настройками */  
function settingsWatch(){  
    Lampa.Settings.listener.follow('open', function(e){  
        if(e && e.name == 'main' && Lampa.Storage.get('needRebootSettingExit')){  
            Lampa.Storage.set('needRebootSettingExit', false);  
            showReload('Потрібно перезавантажити програму для застосування змін.<br>Натисніть "Так" для перезавантаження.');  
        }  
    });  
}  
  
/* ---------------------------  
   Регістрація компонентів  
   --------------------------- */  
if (!document.querySelector('div[data-component="add_plugin"]')) {  
    Lampa.SettingsApi.addComponent({  
        component: 'add_plugin',  
        name: 'Плагіни',  
        icon: icon_add_plugin  
    });  
}  
  
Lampa.SettingsApi.addParam({  
    component: 'add_plugin',  
    param: {  
        name: 'add_interface_plugin',  
        type: 'static',  
        default: true  
    },  
    field: {  
        name: icon_add_interface_plugin  
    },  
    onRender: function(item) {  
        item.on('hover:enter', function () {  
            Lampa.Settings.create('add_interface_plugin');  
            Lampa.Controller.enabled().controller.back = function(){  
                Lampa.Settings.create('add_plugin');  
            }  
        });  
    }  
});  
  
/* Якість на картках */  
Lampa.SettingsApi.addParam({  
    component: 'add_interface_plugin',  
    param: {  
        name: 'QUALITY',  
        type: 'select',  
        values: {  
            1: 'Встановити',  
            2: 'Видалити'  
        },  
    },  
    field: {  
        name: 'Якість на картках',  
        description: 'Відображення якості на постерах фільмів'  
    },  
    onChange: function(value) {  
        if (value == '1') {  
            itemON('https://crowley24.github.io/quality_v7.js', 'Якість на картках', '@lampa', 'QUALITY');  
        }  
        if (value == '2') {  
            deletePlugin("https://crowley24.github.io/quality_v7.js");  
        }  
    },  
    onRender: function (item) {  
        $('.settings-param__name', item).css('color','#f3d900');  
        hideInstall();  
  
        var myResult = checkPlugin('https://crowley24.github.io/quality_v7.js');  
        var pluginsArray = Lampa.Storage.get('plugins') || [];  
  
        setTimeout(function() {  
            var container = $('div[data-name="QUALITY"]');  
            if (container.length && container.find('.settings-param__status').length === 0) {  
                container.append('<div class="settings-param__status one"></div>');  
            }  
            var pluginStatus = null;  
            for (var i = 0; i < pluginsArray.length; i++) {  
                if (pluginsArray[i] && pluginsArray[i].url === 'https://crowley24.github.io/quality_v7.js') {  
                    pluginStatus = pluginsArray[i].status;  
                    break;  
                }  
            }  
            var statusEl = $('div[data-name="QUALITY"]').find('.settings-param__status');  
            statusEl.removeClass('active error').css('background-color','');  
            if (myResult && pluginStatus !== 0) {  
                statusEl.addClass('active');  
            } else if (pluginStatus === 0) {  
                statusEl.css('background-color', 'rgb(255, 165, 0)');  
            } else {  
                statusEl.addClass('error');  
            }  
        }, 100);  
  
        item.on("hover:enter", function (event) {  
            nthChildIndex = focus_back(event);  
        });  
    }  
});  
  
/* MobileLogo */  
Lampa.SettingsApi.addParam({  
    component: 'add_interface_plugin',  
    param: {  
        name: 'MOBILELOGO',  
        type: 'select',  
        values: {  
            1: 'Встановити',  
            2: 'Видалити'  
        },  
    },  
    field: {  
        name: 'MobileLogo',  
        description: 'Мобільні логотипи для інтерфейсу'  
    },  
    onChange: function(value) {  
        if (value == '1') {  
            itemON('https://crowley24.github.io/logo+mob.js', 'MobileLogo', '@lampa', 'MOBILELOGO');  
        }  
        if (value == '2') {  
            deletePlugin("https://crowley24.github.io/logo+mob.js");  
        }  
    },  
    onRender: function (item) {  
        $('.settings-param__name', item).css('color','#f3d900');  
        hideInstall();  
  
        var myResult = checkPlugin('https://crowley24.github.io/logo+mob.js');  
        var pluginsArray = Lampa.Storage.get('plugins') || [];  
  
        setTimeout(function() {  
            var container = $('div[data-name="MOBILELOGO"]');  
            if (container.length && container.find('.settings-param__status').length === 0) {  
                container.append('<div class="settings-param__status one"></div>');  
            }  
            var pluginStatus = null;  
            for (var i = 0; i < pluginsArray.length; i++) {  
                if (pluginsArray[i] && pluginsArray[i].url === 'https://crowley24.github.io/logo+mob.js') {  
                    pluginStatus = pluginsArray[i].status;  
                    break;  
                }  
            }  
            var statusEl = $('div[data-name="MOBILELOGO"]').find('.settings-param__status');  
            statusEl.removeClass('active error').css('background-color','');  
            if (myResult && pluginStatus !== 0) {  
                statusEl.addClass('active');  
            } else if (pluginStatus === 0) {  
                statusEl.css('background-color', 'rgb(255, 165, 0)');  
            } else {  
                statusEl.addClass('error');  
            }  
        }, 100);  
  
        item.on("hover:enter", function (event) {  
            nthChildIndex = focus_back(event);  
        });  
    }  
});  
  
/* Прослуховування при відкритті сторінки "add_plugin" для очищення артефактів */  
Lampa.Settings.listener.follow('open', function(e) {  
    if (e.name == 'add_plugin') {  
        setTimeout(function() {  
            try {  
                // якщо на сторінці є знайомий артефакт - видаляємо  
                var label = document.querySelector("div > span > div > span");  
                if (label && label.innerText == '@lampa_plugins_uncensored') {  
                    // ВИПРАВЛЕНО: замінено :contains() на each() з перевіркою тексту  
                    $('div > span').each(function() {  
                        if ($(this).text() === 'Ще' ||   
                            $(this).text() === 'Редагувати' ||   
                            $(this).text() === 'Історія' ||   
                            $(this).text() === 'Статус') {  
                            $(this).parent().remove();  
                        }  
                    });  
                }  
            } catch(e){}  
        }, 50);  
    }  
});  
  
} // /* addonStart */  
  
if (!!window.appready) addonStart();  
else Lampa.Listener.follow('app', function(e){ if (e.type === 'ready') addonStart(); });  
  
})();
