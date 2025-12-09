(function () {  
    'use strict';  
  
function addonStart() {  
  
/* -------------------------------------------  
   Іконки розділів плагіна (HTML/SVG)  
   ------------------------------------------- */  
var icon_add_plugin = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg>';  
var icon_add_interface_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><div style="font-size:1.3em">Інтерфейс</div></div>';  
var icon_add_management_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div><div style="font-size:1.3em">Керування</div></div>';  
var icon_add_online_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg></div><div style="font-size:1.3em">Онлайн</div></div>';  
var icon_add_torrent_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><div style="font-size:1.3em">Торренти</div></div>';  
var icon_add_tv_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5l2 3 2-3h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg></div><div style="font-size:1.3em">ТВ</div></div>';  
var icon_add_music_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div><div style="font-size:1.3em">Музика</div></div>';  
var icon_add_radio_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V8c0-1.11-.89-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h16v4z"/></svg></div><div style="font-size:1.3em">Радіо</div></div>';  
var icon_add_sisi_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg></div><div style="font-size:1.3em">18+</div></div>';  
  
var nthChildIndex = null; // індекс елемента (1-based)  
  
/* Ініціалізація стану */  
Lampa.Storage.set('needReboot', false);  
Lampa.Storage.set('needRebootSettingExit', false);  
  
/* ---------------------------  
   Модальне вікно перезавантаження  
   --------------------------- */  
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
          Lampa.Controller.toggle('content');  
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
  
/* ---------------------------  
   Показ прогрес-бару (встановлення)  
   --------------------------- */  
function showLoadingBar(color) {  
  color = color || '#64e364';  
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
  loadingIndicator.style.backgroundColor = color;  
  loadingIndicator.style.borderRadius = '4em';  
  
  var loadingPercentage = document.createElement('div');  
  loadingPercentage.className = 'loading-percentage';  
  loadingPercentage.style.position = 'absolute';  
  loadingPercentage.style.top = '50%';  
  loadingPercentage.style.left = '50%';  
  loadingPercentage.style.transform = 'translate(-50%, -50%)';  
  loadingPercentage.style.color = '#fff';  
  loadingPercentage.style.fontWeight = 'bold';  
  loadingPercentage.style.fontSize = '1.2em';  
  
  loadingBar.appendChild(loadingIndicator);  
  loadingBar.appendChild(loadingPercentage);  
  document.body.appendChild(loadingBar);  
  
  loadingBar.style.display = 'block';  
  
  var startTime = Date.now();  
  var duration = 800;  
  var interval = setInterval(function() {  
    var elapsed = Date.now() - startTime;  
    var progress = Math.min((elapsed / duration) * 100, 100);  
    loadingIndicator.style.width = progress + '%';  
    loadingPercentage.textContent = Math.round(progress) + '%';  
  
    if (progress >= 100) {  
      clearInterval(interval);  
      setTimeout(function() {  
        try { document.body.removeChild(loadingBar); } catch (e) {}  
      }, 350);  
    }  
  }, 20);  
}  
  
/* Спрощені обгортки для успіху/видалення */  
function showInstallBar(){ showLoadingBar('#64e364'); }  
function showDeletedBar(){ showLoadingBar('#ff6464'); }  
  
/* ---------------------------  
   Слідкування за потребою перезавантаження  
   --------------------------- */  
function settingsWatch() {  
    var check = setInterval(function() {  
        var need = Lampa.Storage.get('needRebootSettingExit');  
        if (need) {  
            clearInterval(check);  
            showReload('Щоб застосувати зміни, потрібно перезавантажити додаток');  
        }  
    }, 1000);  
}  
  
/* ---------------------------  
   Додавання плагіна (встановлення)  
   --------------------------- */  
function itemON(sourceURL, sourceName, sourceAuthor, itemName) {  
    var plugins = Lampa.Storage.get('plugins') || [];  
    var newPlugin = {  
        url: sourceURL,  
        name: sourceName,  
        author: sourceAuthor,  
        item: itemName,  
        status: 1  
    };  
  
    // Перевіряємо, чи вже є плагін  
    var existingPlugin = plugins.find(function(plugin) {  
        return plugin && plugin.url === sourceURL;  
    });  
  
    if (existingPlugin) {  
        existingPlugin.status = 1;  
    } else {  
        plugins.push(newPlugin);  
    }  
  
    Lampa.Storage.set('plugins', plugins);  
  
    // Є ризик помилки, якщо хост недоступний. Додаємо обробку помилок завантаження скрипта.  
    try {  
        var script = document.createElement('script');  
        script.src = sourceURL;  
        script.onerror = function() {  
            Lampa.Noty.show("Не вдалося завантажити плагін: " + sourceName);  
            // прибираємо запис з storage (або відмічаємо статус 0)  
            var p = Lampa.Storage.get('plugins') || [];  
            for (var i=0;i<p.length;i++){  
                if (p[i] && p[i].url === sourceURL) { p[i].status = 0; break; }  
            }  
            Lampa.Storage.set('plugins', p);  
        };  
        document.getElementsByTagName('head')[0].appendChild(script);  
    } catch (e) {  
        console.error(e);  
        Lampa.Noty.show("Помилка при додаванні плагіна: " + sourceName);  
    }  
  
    showInstallBar();  
    setTimeout(function() {  
        try { Lampa.Settings.update(); } catch(e){console.warn(e);}  
        Lampa.Noty.show("Плагін «" + sourceName + "» успішно встановлено");  
    }, 1200);  
  
    setTimeout(function() {  
        if (nthChildIndex) {  
            try {  
                var F = document.querySelector("#app > div.settings.animate > div.settings__content.layer--height > div.settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")");  
                if (F) {  
                    Lampa.Controller.focus(F);  
                    Lampa.Controller.toggle('settings_component');  
                }  
            } catch(e){ console.warn(e); }  
        }  
    }, 1600);  
}  
  
/* ---------------------------  
   Приховати зайвий елемент (візуально)  
   --------------------------- */  
function hideInstall() {  
    $("#hideInstall").remove();  
    // Закритий div замість помилки з незакритим тегом  
    $('body').append('<div id="hideInstall"><style>div.settings-param__value{opacity: 0%!important;display: none;}</style></div>');  
}  
  
/* ---------------------------  
   Видалення плагіна  
   --------------------------- */  
function deletePlugin(pluginToRemoveUrl) {  
    var plugins = Lampa.Storage.get('plugins') || [];  
    var updatedPlugins = plugins.filter(function(obj) { return !(obj && obj.url === pluginToRemoveUrl); });  
    Lampa.Storage.set('plugins', updatedPlugins);  
  
    setTimeout(function() {  
        try { Lampa.Settings.update(); } catch(e){console.warn(e);}  
        Lampa.Noty.show("Плагін успішно видалено");  
    }, 1200);  
  
    setTimeout(function() {  
        if (nthChildIndex) {  
            try {  
                var F = document.querySelector("#app > div.settings.animate > div.settings__content.layer--height > div.settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")");  
                if (F) {  
                    Lampa.Controller.focus(F);  
                    Lampa.Controller.toggle('settings_component');  
                }  
            } catch(e) { console.warn(e); }  
        }  
    }, 1600);  
  
    Lampa.Storage.set('needRebootSettingExit', true);  
    settingsWatch();  
    showDeletedBar();  
}  
  
/* ---------------------------  
   Перевірка наявності плагіна  
   --------------------------- */  
function checkPlugin(pluginToCheck) {  
    var plugins = Lampa.Storage.get('plugins') || [];  
    var checkResult = plugins.filter(function(obj) { return obj && obj.url === pluginToCheck; });  
    return checkResult.length > 0;  
}  
  
/* ---------------------------  
   Отримання nth-child індексу  
   (більш стійка версія)  
   --------------------------- */  
function focus_back(event) {  
    var targetElement = event.target || event.srcElement;  
    if (!targetElement) return null;  
  
    // Підійдемо вгору до найближчого .settings-param (якщо є)  
    var settingsParam = targetElement.closest('.settings-param');  
    if (!settingsParam) return null;  
  
    var parent = settingsParam.parentElement;  
    if (!parent) return null;  
  
    var children = Array.from(parent.children);  
    var index = children.indexOf(settingsParam) + 1;  
    nthChildIndex = index;  
    return nthChildIndex;  
}  
  
/* ---------------------------  
   Реєстрація компонентів  
   --------------------------- */  
if (!document.querySelector('div[data-component="add_plugin"]')) {  
    Lampa.SettingsApi.addComponent({  
        component: 'add_plugin',  
        name: 'Плагіни',  
        icon: icon_add_plugin  
    });  
}  
  
/* При відкритті налаштувань — підготуємо порядок */  
Lampa.Settings.listener.follow('open', function (e) {  
    if (e.name == 'main') {  
        // лише якщо в DOM є 'plugins' — переставляємо наш розділ вище  
        setTimeout(function() {  
            var pluginsItem = $('div[data-component=plugins]');  
            var addPluginItem = $('div[data-component=add_plugin]');  
            if (pluginsItem.length && addPluginItem.length) {  
                pluginsItem.before(addPluginItem);  
            }  
            // прибираємо артефакти лише якщо присутні специфічні елементи  
            try {  
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
            } catch(e) { /* не критично */ }  
            $("#hideInstall").remove();  
        }, 50);  
    }  
});  
  
/* ---------------------------  
   Параметри: пункт-меню Інтерфейс (TMDB, Tricks)  
   --------------------------- */  
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
            // Перевірка чи існує компонент перед створенням    
            if (Lampa.SettingsApi.getComponent('add_interface_plugin')) {    
                Lampa.Settings.create('add_interface_plugin');    
            } else {    
                console.error('[PluginManager] Компонент add_interface_plugin не знайдено');    
                Lampa.Noty.show('Помилка: компонент не знайдено');    
            }    
                
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
  
} // /* addonStart */  
  
// Ініціалізація  
if (!!window.appready) addonStart();  
else Lampa.Listener.follow('app', function(e){ if (e.type === 'ready') addonStart(); });  
  
})();
