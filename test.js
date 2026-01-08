(function() {  
  'use strict';  
    
  var plugin = {  
    name: 'Source Manager',  
    version: '1.0.0',  
    description: 'Плагін для управління джерелами Lampac'  
  };  
    
  // Ініціалізація плагіна  
  function initPlugin() {  
    // Додаємо переклади  
    Lampa.Lang.add({  
      source_manager_title: {  
        ru: 'Управление источниками',  
        uk: 'Управління джерелами',  
        en: 'Source Manager'  
      },  
      source_manager_descr: {  
        ru: 'Скрыть и переименовать источники',  
        uk: 'Приховати та перейменувати джерела',  
        en: 'Hide and rename sources'  
      },  
      source_hidden: {  
        ru: 'Скрытые источники',  
        uk: 'Приховані джерела',  
        en: 'Hidden sources'  
      },  
      source_renamed: {  
        ru: 'Переименованные источники',  
        uk: 'Перейменовані джерела',  
        en: 'Renamed sources'  
      },  
      hide_source: {  
        ru: 'Скрыть источник',  
        uk: 'Приховати джерело',  
        en: 'Hide source'  
      },  
      rename_source: {  
        ru: 'Переименовать источник',  
        uk: 'Перейменувати джерело',  
        en: 'Rename source'  
      },  
      enter_new_name: {  
        ru: 'Введите новое название',  
        uk: 'Введіть нову назву',  
        en: 'Enter new name'  
      }  
    });  
      
    // Перехоплюємо функцію startSource з Lampac  
    if (Lampa.Component.get('lampac')) {  
      var originalComponent = Lampa.Component.get('lampac');  
      var originalStartSource = originalComponent.prototype.startSource;  
        
      originalComponent.prototype.startSource = function(json) {  
        var self = this;  
        var hiddenSources = Lampa.Storage.get('hidden_sources', []);  
        var renamedSources = Lampa.Storage.get('renamed_sources', {});  
          
        // Фільтруємо та перейменовуємо джерела  
        var filteredJson = json.filter(function(j) {  
          var name = self.balanserName(j);  
          return !hiddenSources.includes(name);  
        }).map(function(j) {  
          var name = self.balanserName(j);  
          if (renamedSources[name]) {  
            j.name = renamedSources[name];  
          }  
          return j;  
        });  
          
        return originalStartSource.call(this, filteredJson);  
      };  
    }  
      
    // Додаємо пункт в налаштування  
    Lampa.Settings.add('source_manager', {  
      component: 'source-manager',  
      name: Lampa.Lang.translate('source_manager_title'),  
      description: Lampa.Lang.translate('source_manager_descr')  
    });  
      
    // Створюємо компонент для управління  
    Lampa.Component.add('source-manager', {  
      init: function() {  
        this.createManager();  
      },  
        
      createManager: function() {  
        var self = this;  
        var hiddenSources = Lampa.Storage.get('hidden_sources', []);  
        var renamedSources = Lampa.Storage.get('renamed_sources', {});  
          
        // Створюємо інтерфейс  
        var html = $('<div class="settings-page"></div>');  
          
        // Секція прихованих джерел  
        var hiddenSection = $('<div class="settings-section"></div>');  
        hiddenSection.append('<h3>' + Lampa.Lang.translate('source_hidden') + '</h3>');  
          
        var hiddenList = $('<div class="settings-list"></div>');  
        hiddenSources.forEach(function(source) {  
          var item = $('<div class="settings-item">' + source + '</div>');  
          var showBtn = $('<button class="settings-button">' + Lampa.Lang.translate('show') + '</button>');  
            
          showBtn.on('click', function() {  
            self.showSource(source);  
            hiddenList.empty();  
            self.refreshHiddenList();  
          });  
            
          item.append(showBtn);  
          hiddenList.append(item);  
        });  
          
        hiddenSection.append(hiddenList);  
        html.append(hiddenSection);  
          
        // Секція перейменованих джерел  
        var renamedSection = $('<div class="settings-section"></div>');  
        renamedSection.append('<h3>' + Lampa.Lang.translate('source_renamed') + '</h3>');  
          
        var renamedList = $('<div class="settings-list"></div>');  
        for (var original in renamedSources) {  
          var item = $('<div class="settings-item">' + original + ' → ' + renamedSources[original] + '</div>');  
          var resetBtn = $('<button class="settings-button">' + Lampa.Lang.translate('reset') + '</button>');  
            
          resetBtn.on('click', function() {  
            self.resetSourceName(original);  
            renamedList.empty();  
            self.refreshRenamedList();  
          });  
            
          item.append(resetBtn);  
          renamedList.append(item);  
        }  
          
        renamedSection.append(renamedList);  
        html.append(renamedSection);  
          
        // Додаємо CSS стилі  
        $('<style>').text(`  
          .settings-section { margin-bottom: 2em; }  
          .settings-item {   
            display: flex;   
            justify-content: space-between;   
            align-items: center;  
            padding: 0.5em;  
            border-bottom: 1px solid rgba(255,255,255,0.1);  
          }  
          .settings-button {  
            background: rgba(255,255,255,0.1);  
            border: none;  
            padding: 0.3em 0.8em;  
            border-radius: 0.2em;  
            color: white;  
            cursor: pointer;  
          }  
          .settings-button:hover {  
            background: rgba(255,255,255,0.2);  
          }  
        `).appendTo('head');  
          
        return html;  
      },  
        
      hideSource: function(sourceName) {  
        var hidden = Lampa.Storage.get('hidden_sources', []);  
        if (!hidden.includes(sourceName)) {  
          hidden.push(sourceName);  
          Lampa.Storage.set('hidden_sources', hidden);  
        }  
      },  
        
      showSource: function(sourceName) {  
        var hidden = Lampa.Storage.get('hidden_sources', []);  
        var index = hidden.indexOf(sourceName);  
        if (index > -1) {  
          hidden.splice(index, 1);  
          Lampa.Storage.set('hidden_sources', hidden);  
        }  
      },  
        
      renameSource: function(originalName, newName) {  
        var renamed = Lampa.Storage.get('renamed_sources', {});  
        renamed[originalName] = newName;  
        Lampa.Storage.set('renamed_sources', renamed);  
      },  
        
      resetSourceName: function(originalName) {  
        var renamed = Lampa.Storage.get('renamed_sources', {});  
        delete renamed[originalName];  
        Lampa.Storage.set('renamed_sources', renamed);  
      },  
        
      refreshHiddenList: function() {  
        // Оновлення списку прихованих джерел  
        var hiddenSources = Lampa.Storage.get('hidden_sources', []);  
        var hiddenList = $('.settings-list').first();  
          
        hiddenSources.forEach(function(source) {  
          var item = $('<div class="settings-item">' + source + '</div>');  
          var showBtn = $('<button class="settings-button">' + Lampa.Lang.translate('show') + '</button>');  
            
          showBtn.on('click', function() {  
            self.showSource(source);  
            hiddenList.empty();  
            self.refreshHiddenList();  
          });  
            
          item.append(showBtn);  
          hiddenList.append(item);  
        });  
      },  
        
      refreshRenamedList: function() {  
        // Оновлення списку перейменованих джерел  
        var renamedSources = Lampa.Storage.get('renamed_sources', {});  
        var renamedList = $('.settings-list').last();  
          
        for (var original in renamedSources) {  
          var item = $('<div class="settings-item">' + original + ' → ' + renamedSources[original] + '</div>');  
          var resetBtn = $('<button class="settings-button">' + Lampa.Lang.translate('reset') + '</button>');  
            
          resetBtn.on('click', function() {  
            self.resetSourceName(original);  
            renamedList.empty();  
            self.refreshRenamedList();  
          });  
            
          item.append(resetBtn);  
          renamedList.append(item);  
        }  
      }  
    });  
      
    // Додаємо контекстне меню для джерел  
    if (window.lampac_online_context_menu) {  
      window.lampac_online_context_menu.push = function(menu, extra, params) {  
        var sourceName = params.element && params.element.balanser;  
        if (sourceName) {  
          menu.push({  
            title: Lampa.Lang.translate('hide_source'),  
            hide: true  
          });  
          menu.push({  
            title: Lampa.Lang.translate('rename_source'),  
            rename: true  
          });  
        }  
      };  
        
      window.lampac_online_context_menu.onSelect = function(action, params) {  
        if (action.hide) {  
          var sourceName = params.element && params.element.balanser;  
          if (sourceName) {  
            var hidden = Lampa.Storage.get('hidden_sources', []);  
            if (!hidden.includes(sourceName)) {  
              hidden.push(sourceName);  
              Lampa.Storage.set('hidden_sources', hidden);  
              Lampa.Noty.show(Lampa.Lang.translate('source_hidden'));  
            }  
          }  
        }  
        if (action.rename) {  
          var sourceName = params.element && params.element.balanser;  
          if (sourceName) {  
            Lampa.Input.edit({  
              value: sourceName,  
              title: Lampa.Lang.translate('enter_new_name')  
            }, function(newName) {  
              if (newName && newName !== sourceName) {  
                var renamed = Lampa.Storage.get('renamed_sources', {});  
                renamed[sourceName] = newName;  
                Lampa.Storage.set('renamed_sources', renamed);  
                Lampa.Noty.show(Lampa.Lang.translate('source_renamed'));  
              }  
            });  
          }  
        }  
      };  
    }  
  }  
    
  // Реєстрація плагіна  
  Lampa.Manifest.plugins = plugin;  
    
  // Запуск плагіна  
  if (window.lampac_plugin) {  
    initPlugin();  
  } else {  
    // Чекаємо на завантаження Lampac  
    var checkInterval = setInterval(function() {  
      if (window.lampac_plugin) {  
        clearInterval(checkInterval);  
        initPlugin();  
      }  
    }, 100);  
  }  
})();
