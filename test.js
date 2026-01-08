(function () {  
  'use strict'  
    
  var sourceSettings = Lampa.Storage.get('source_settings', {});  
    
  function start() {  
    if (window.lampac_src_filter_plugin) {  
      return;  
    }  
    window.lampac_src_filter_plugin = true;  
      
    Lampa.Controller.listener.follow('toggle', function (event) {  
      if (event.name !== 'select') {  
        return;  
      }  
  
      var active = Lampa.Activity.active();  
      var componentName = active.component.toLowerCase();  
      if (componentName !== 'online' && componentName !== 'lampac' && componentName.indexOf('bwa') !== 0) {  
        return;  
      }  
  
      var $filterTitle = $('.selectbox__title');  
      if ($filterTitle.length !== 1 || $filterTitle.text() !== Lampa.Lang.translate('title_filter')) {  
        return;  
      }  
  
      // Знаходимо всі кнопки джерел  
      var $sourceButtons = $('.simple-button--filter.filter--sort');  
      if ($sourceButtons.length === 0) {  
        return;  
      }  
  
      // Створюємо пункти меню для кожного джерела  
      $sourceButtons.each(function(index) {  
        var $sourceBtn = $(this);  
        var sourceText = $('div', $sourceBtn).text();  
        var sourceKey = sourceText.toLowerCase().replace(/\s+/g, '_');  
          
        // Пропускаємо приховані джерела  
        if (sourceSettings[sourceKey] && sourceSettings[sourceKey].hidden) {  
          return;  
        }  
          
        var displayName = sourceSettings[sourceKey] && sourceSettings[sourceKey].name   
          ? sourceSettings[sourceKey].name   
          : sourceText;  
  
        var $selectBoxItem = Lampa.Template.get('selectbox_item', {  
          title: Lampa.Lang.translate('settings_rest_source') + ' ' + (index + 1),  
          subtitle: displayName  
        });  
  
        var longPressTimer;  
        var isLongPress = false;  
  
        // Коротке натискання - вибір джерела  
        $selectBoxItem.on('hover:enter', function () {  
          if (!isLongPress) {  
            $sourceBtn.trigger('hover:enter');  
          }  
          isLongPress = false;  
        });  
  
        // Довге натискання - меню налаштувань  
        $selectBoxItem.on('hover:long', function () {  
          isLongPress = true;  
          showSourceMenu(sourceKey, sourceText, $selectBoxItem);  
        });  
  
        // Реалізація довгого натискання  
        $selectBoxItem.on('mouseenter', function () {  
          longPressTimer = setTimeout(function () {  
            $selectBoxItem.trigger('hover:long');  
          }, 800);  
        });  
  
        $selectBoxItem.on('mouseleave', function () {  
          clearTimeout(longPressTimer);  
        });  
  
        // Додаємо пункт до меню  
        var $selectOptions = $('.selectbox-item');  
        if ($selectOptions.length > 0) {  
          $selectOptions.first().after($selectBoxItem);  
        } else {  
          $('body > .selectbox').find('.scroll__body').prepend($selectBoxItem);  
        }  
      });  
  
      Lampa.Controller.collectionSet($('body > .selectbox').find('.scroll__body'));  
      Lampa.Controller.collectionFocus($('.selectbox-item').first());  
    });  
  }  
  
  function showSourceMenu(sourceKey, originalName, $sourceItem) {  
    var menuItems = [  
      {  
        title: Lampa.Lang.translate('settings_rest_source_rename') || 'Перейменувати',  
        subtitle: sourceSettings[sourceKey] && sourceSettings[sourceKey].name   
          ? sourceSettings[sourceKey].name   
          : originalName  
      },  
      {  
        title: Lampa.Lang.translate('settings_rest_source_hide') || 'Приховати',  
        subtitle: sourceSettings[sourceKey] && sourceSettings[sourceKey].hidden   
          ? 'Відновити'   
          : 'Приховати джерело'  
      },  
      {  
        title: Lampa.Lang.translate('settings_rest_source_reset') || 'Скинути все',  
        subtitle: 'Відновити всі джерела'  
      }  
    ];  
  
    Lampa.Select.show({  
      title: 'Налаштування джерела',  
      items: menuItems,  
      onSelect: function (item) {  
        if (item.title === (Lampa.Lang.translate('settings_rest_source_rename') || 'Перейменувати')) {  
          showRenameDialog(sourceKey, originalName, $sourceItem);  
        } else if (item.title === (Lampa.Lang.translate('settings_rest_source_hide') || 'Приховати')) {  
          toggleSourceVisibility(sourceKey, $sourceItem);  
        } else if (item.title === (Lampa.Lang.translate('settings_rest_source_reset') || 'Скинути все')) {  
          resetAllSources();  
        }  
      }  
    });  
  }  
  
  function showRenameDialog(sourceKey, originalName, $sourceItem) {  
    var currentName = sourceSettings[sourceKey] && sourceSettings[sourceKey].name   
      ? sourceSettings[sourceKey].name   
      : originalName;  
  
    Lampa.Input.edit({  
      value: currentName,  
      title: 'Введіть нову назву джерела'  
    }, function (newName) {  
      if (newName && newName.trim()) {  
        if (!sourceSettings[sourceKey]) {  
          sourceSettings[sourceKey] = {};  
        }  
        sourceSettings[sourceKey].name = newName.trim();  
        Lampa.Storage.set('source_settings', sourceSettings);  
          
        $sourceItem.find('.selectbox-item__subtitle').text(newName.trim());  
        Lampa.Noty.show('Джерело перейменовано');  
      }  
    });  
  }  
  
  function toggleSourceVisibility(sourceKey, $sourceItem) {  
    if (!sourceSettings[sourceKey]) {  
      sourceSettings[sourceKey] = {};  
    }  
      
    sourceSettings[sourceKey].hidden = !sourceSettings[sourceKey].hidden;  
    Lampa.Storage.set('source_settings', sourceSettings);  
      
    if (sourceSettings[sourceKey].hidden) {  
      $sourceItem.hide();  
      Lampa.Noty.show('Джерело приховано');  
    } else {  
      $sourceItem.show();  
      Lampa.Noty.show('Джерело відновлено');  
    }  
  }  
  
  function resetAllSources() {  
    Lampa.Storage.set('source_settings', {});  
    sourceSettings = {};  
    Lampa.Noty.show('Усі налаштування джерел скинуто');  
    var active = Lampa.Activity.active();  
    if (active) {  
      Lampa.Activity.replace(active);  
    }  
  }  
  
  if (window.appready) {  
    start();  
  } else {  
    Lampa.Listener.follow('app', function (event) {  
      if (event.type === 'ready') {  
        start();  
      }  
    });  
  }  
})();
