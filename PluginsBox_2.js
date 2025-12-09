(function () {
    'use strict';

function addonStart() {

/* -------------------------------------------
   Іконки розділів плагіна (HTML/SVG)
   ------------------------------------------- */
var icon_add_plugin = '<svg ... fill="currentColor">...</svg>'; // залишив скорочено, можна вставити повний SVG як у тебе
var icon_add_interface_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">...</svg></div><div style="font-size:1.3em">Інтерфейс</div></div>';
var icon_add_management_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg ...>...</svg></div><div style="font-size:1.3em">Керування</div></div>';
var icon_add_online_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg viewBox="0 0 32 32" ...>...</svg></div><div style="font-size:1.3em">Онлайн</div></div>';
var icon_add_torrent_plugin = '<div class="settings-folder" style="padding:0!important">...<div style="font-size:1.3em">Торренти</div></div>';
var icon_add_tv_plugin = '<div class="settings-folder" style="padding:0!important">...<div style="font-size:1.3em">ТБ</div></div>';
var icon_add_music_plugin = '<div class="settings-folder" style="padding:0!important">...<div style="font-size:1.3em">Музика</div></div>';
var icon_add_radio_plugin = '<div class="settings-folder" style="padding:0!important">...<div style="font-size:1.3em">Радіо</div></div>';
var icon_add_sisi_plugin = '<div class="settings-folder" style="padding:0!important">...<div style="font-size:1.3em">18+</div></div>';

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
    var param = targetElement.closest ? targetElement.closest('.settings-param') : null;
    var parentElement = (param && param.parentElement) ? param.parentElement : (targetElement.parentElement || null);
    if (!parentElement) return null;

    var children = Array.from(parentElement.children);
    var index = children.indexOf(param || targetElement);
    return (index >= 0) ? (index + 1) : null;
}

/* ---------------------------
   Регістрація компонентів (без дублювання!)
   --------------------------- */
if (!document.querySelector('div[data-component="add_plugin"]')) {
    Lampa.SettingsApi.addComponent({
        component: 'add_plugin',
        name: 'Плагіни',
        icon: icon_add_plugin
    });
}

// Додаємо підкомпоненти один раз (перевірка на існування)
if (!document.querySelector('div[data-component="add_interface_plugin"]')) {
    Lampa.SettingsApi.addComponent({
        component: 'add_interface_plugin',
        name: 'Інтерфейс',
        icon: icon_add_interface_plugin
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
                    $('div > span:contains("Ще")').parent().remove();
                    $('div > span:contains("Редагувати")').parent().remove();
                    $('div > span:contains("Історія")').parent().remove();
                    $('div > span:contains("Статус")').parent().remove();
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
                    $('div > span:contains("Ще")').parent().remove();
                    $('div > span:contains("Редагувати")').parent().remove();
                    $('div > span:contains("Історія")').parent().remove();
                    $('div > span:contains("Статус")').parent().remove();
                }
            } catch(e){}
        }, 50);
    }
});

} // /* addonStart */

if (!!window.appready) addonStart();
else Lampa.Listener.follow('app', function(e){ if (e.type === 'ready') addonStart(); });

})();
