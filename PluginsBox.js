(function () {  
    'use strict';  
  
function addonStart() {  
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
      
    console.log('[PluginManager] Всі залежності доступні');  
      
    // Іконка для меню "Плагіни"  
    var icon_add_plugin = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/></svg>';  
      
    var nthChildIndex = null;  
      
    // Ініціалізація стану  
    Lampa.Storage.set('needReboot', false);  
    Lampa.Storage.set('needRebootSettingExit', false);  
      
    // Модальне вікно перезавантаження  
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
      
    // Показ прогрес-бару  
    function showLoadingBar(color) {  
        color = color || '#64e364';  
        var loadingBar = document.createElement('div');  
        loadingBar.className = 'loading-bar';  
        loadingBar.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;width:30em;height:2.5em;background:#595959;border-radius:4em';  
          
        var loadingIndicator = document.createElement('div');  
        loadingIndicator.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0;background:' + color + ';border-radius:4em;transition:width 0.3s ease';  
          
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
                    try { document.body.removeChild(loadingBar); } catch (e) {}  
                }, 350);  
            }  
        }, 20);  
    }  
      
    function showInstallBar(){ showLoadingBar('#64e364'); }  
    function showDeletedBar(){ showLoadingBar('#ff6464'); }  
      
    // Слідкування за потребою перезавантаження  
    function settingsWatch() {  
        var check = setInterval(function() {  
            var need = Lampa.Storage.get('needRebootSettingExit');  
            if (need) {  
                clearInterval(check);  
                showReload('Щоб застосувати зміни, потрібно перезавантажити додаток');  
            }  
        }, 1000);  
    }  
      
    // Додавання плагіна  
    function itemON(sourceURL, sourceName, sourceAuthor, itemName) {  
        var plugins = Lampa.Storage.get('plugins') || [];  
        var newPlugin = {  
            url: sourceURL,  
            name: sourceName,  
            author: sourceAuthor,  
            item: itemName,  
            status: 1  
        };  
  
        var existingPlugin = plugins.find(function(plugin) {  
            return plugin && plugin.url === sourceURL;  
        });  
  
        if (existingPlugin) {  
            existingPlugin.status = 1;  
        } else {  
            plugins.push(newPlugin);  
        }  
  
        Lampa.Storage.set('plugins', plugins);  
  
        try {  
            var script = document.createElement('script');  
            script.src = sourceURL;  
            script.onerror = function() {  
                Lampa.Noty.show("Не вдалося завантажити плагін: " + sourceName);  
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
      
    // Приховати зайвий елемент  
    function hideInstall() {  
        $("#hideInstall").remove();  
        $('body').append('<div id="hideInstall"><style>div.settings-param__value{opacity: 0%!important;display: none;}</style></div>');  
    }  
      
    // Видалення плагіна  
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
      
    // Перевірка наявності плагіна  
    function checkPlugin(pluginToCheck) {  
        var plugins = Lampa.Storage.get('plugins') || [];  
        var checkResult = plugins.filter(function(obj) { return obj && obj.url === pluginToCheck; });  
        return checkResult.length > 0;  
    }  
      
    // Отримання nth-child індексу  
    function focus_back(event) {  
        var targetElement = event.target || event.srcElement;  
        if (!targetElement) return null;  
  
        var settingsParam = targetElement.closest('.settings-param');  
        if (!settingsParam) return null;  
  
        var parent = settingsParam.parentElement;  
        if (!parent) return null;  
  
        var children = Array.from(parent.children);  
        var index = children.indexOf(settingsParam) + 1;  
        nthChildIndex = index;  
        return nthChildIndex;  
    }  
      
    // Реєстрація компонентів  
    if (!document.querySelector('div[data-component="add_plugin"]')) {  
        Lampa.SettingsApi.addComponent({  
            component: 'add_plugin',  
            name: 'Плагіни',  
            icon: icon_add_plugin  
        });  
    }  
    
      // Clock - Додано напряму в add_plugin  
    Lampa.SettingsApi.addParam({  
        component: 'add_plugin',  
        param: {  
            name: 'CLOCK',  
            type: 'select',  
            values: {  
                1: 'Встановити',  
                2: 'Видалити'  
            },  
        },  
        field: {  
            name: 'Clock',  
            description: 'Годинник для інтерфейсу'  
        },  
        onChange: function(value) {  
            if (value == '1') {  
                itemON('https://crowley24.github.io/clock.js', 'Clock', '@lampa', 'CLOCK');  
            }  
            if (value == '2') {  
                deletePlugin("https://crowley24.github.io/clock.js");  
            }  
        },  
        onRender: function(item) {  
            $('.settings-param__name', item).css('color', '#f3d900');  
            hideInstall();  
              
            var myResult = checkPlugin('https://crowley24.github.io/clock.js');  
            var pluginsArray = Lampa.Storage.get('plugins') || [];  
              
            setTimeout(function() {  
                var container = $('div[data-name="CLOCK"]');  
                if (container && container.length && container.find('.settings-param__status').length === 0) {  
                    container.append('<div class="settings-param__status one"></div>');  
                }  
                var pluginStatus = null;  
                for (var i = 0; i < pluginsArray.length; i++) {  
                    if (pluginsArray[i] && pluginsArray[i].url === 'https://crowley24.github.io/clock.js') {  
                        pluginStatus = pluginsArray[i].status;  
                        break;  
                    }  
                }  
                var statusEl = $('div[data-name="CLOCK"]').find('.settings-param__status');  
                if (statusEl && statusEl.length) {  
                    statusEl.removeClass('active error').css('background-color', '');  
                    if (myResult && pluginStatus !== 0) {  
                        statusEl.addClass('active');  
                    } else if (pluginStatus === 0) {  
                        statusEl.css('background-color', 'rgb(255, 165, 0)');  
                    } else {  
                        statusEl.addClass('error');  
                    }  
                }  
            }, 100);  
              
            item.on("hover:enter", function(event) {  
                nthChildIndex = focus_back(event);  
            });  
        }  
    });  
    // Якість на картках - Додано напряму в add_plugin  
    Lampa.SettingsApi.addParam({  
        component: 'add_plugin',  
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
        onRender: function(item) {  
            $('.settings-param__name', item).css('color', '#f3d900');  
            hideInstall();  
              
            var myResult = checkPlugin('https://crowley24.github.io/quality_v7.js');  
            var pluginsArray = Lampa.Storage.get('plugins') || [];  
              
            setTimeout(function() {  
                var container = $('div[data-name="QUALITY"]');  
                if (container && container.length && container.find('.settings-param__status').length === 0) {  
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
                if (statusEl && statusEl.length) {  
                    statusEl.removeClass('active error').css('background-color', '');  
                    if (myResult && pluginStatus !== 0) {  
                        statusEl.addClass('active');  
                    } else if (pluginStatus === 0) {  
                        statusEl.css('background-color', 'rgb(255, 165, 0)');  
                    } else {  
                        statusEl.addClass('error');  
                    }  
                }  
            }, 100);  
              
            item.on("hover:enter", function(event) {  
                nthChildIndex = focus_back(event);  
            });  
        }  
    });  

    // LogoStyle - Додано напряму в add_plugin  
    Lampa.SettingsApi.addParam({  
        component: 'add_plugin',  
        param: {  
            name: 'LOGOSTYLE',  
            type: 'select',  
            values: {  
                1: 'Встановити',  
                2: 'Видалити'  
            },  
        },  
        field: {  
            name: 'LogoStyle',  
            description: 'Логотипи замість назви фвльму'  
        },  
        onChange: function(value) {  
            if (value == '1') {  
                itemON('https://crowley24.github.io/LogoStyle.js', 'LogoStyle', '@lampa', 'LOGOSTYLE');  
            }  
            if (value == '2') {  
                deletePlugin("https://crowley24.github.io/LogoStyle.js");  
            }  
        },  
        onRender: function(item) {  
            $('.settings-param__name', item).css('color', '#f3d900');  
            hideInstall();  
              
            var myResult = checkPlugin('https://crowley24.github.io/LogoStyle.js');  
            var pluginsArray = Lampa.Storage.get('plugins') || [];  
              
            setTimeout(function() {  
                var container = $('div[data-name="LOGOSTYLE"]');  
                if (container && container.length && container.find('.settings-param__status').length === 0) {  
                    container.append('<div class="settings-param__status one"></div>');  
                }  
                var pluginStatus = null;  
                for (var i = 0; i < pluginsArray.length; i++) {  
                    if (pluginsArray[i] && pluginsArray[i].url === 'https://crowley24.github.io/LogoStyle.js') {  
                        pluginStatus = pluginsArray[i].status;  
                        break;  
                    }  
                }  
                var statusEl = $('div[data-name="LOGOSTYLE"]').find('.settings-param__status');  
                if (statusEl && statusEl.length) {  
                    statusEl.removeClass('active error').css('background-color', '');  
                    if (myResult && pluginStatus !== 0) {  
                        statusEl.addClass('active');  
                    } else if (pluginStatus === 0) {  
                        statusEl.css('background-color', 'rgb(255, 165, 0)');  
                    } else {  
                        statusEl.addClass('error');  
                    }  
                }  
            }, 100);  
              
            item.on("hover:enter", function(event) {  
                nthChildIndex = focus_back(event);  
            });  
        }  
    });  

    // Colored_ratings - Додано напряму в add_plugin  
    Lampa.SettingsApi.addParam({  
        component: 'add_plugin',  
        param: {  
            name: 'COLORED_RATINGS',  
            type: 'select',  
            values: {  
                1: 'Встановити',  
                2: 'Видалити'  
            },  
        },  
        field: {  
            name: 'Кольровий рейтинг',  
            description: 'Кольоровий рейтинг на картках фільмів'  
        },  
        onChange: function(value) {  
            if (value == '1') {  
                itemON('https://crowley24.github.io/colored_ratings.js', 'Colored_ratings', '@lampa', 'COLORED_RATINGS');  
            }  
            if (value == '2') {  
                deletePlugin("https://crowley24.github.io/colored_ratings.js");  
            }  
        },  
        onRender: function(item) {  
            $('.settings-param__name', item).css('color', '#f3d900');  
            hideInstall();  
              
            var myResult = checkPlugin('https://crowley24.github.io/colored_ratings.js');  
            var pluginsArray = Lampa.Storage.get('plugins') || [];  
              
            setTimeout(function() {  
                var container = $('div[data-name="COLORED_RATINGS"]');  
                if (container && container.length && container.find('.settings-param__status').length === 0) {  
                    container.append('<div class="settings-param__status one"></div>');  
                }  
                var pluginStatus = null;  
                for (var i = 0; i < pluginsArray.length; i++) {  
                    if (pluginsArray[i] && pluginsArray[i].url === 'https://crowley24.github.io/colored_ratings.js') {  
                        pluginStatus = pluginsArray[i].status;  
                        break;  
                    }  
                }  
                var statusEl = $('div[data-name="COLORED_RATINGS"]').find('.settings-param__status');  
                if (statusEl && statusEl.length) {  
                    statusEl.removeClass('active error').css('background-color', '');  
                    if (myResult && pluginStatus !== 0) {  
                        statusEl.addClass('active');  
                    } else if (pluginStatus === 0) {  
                        statusEl.css('background-color', 'rgb(255, 165, 0)');  
                    } else {  
                        statusEl.addClass('error');  
                    }  
                }  
            }, 100);  
              
            item.on("hover:enter", function(event) {  
                nthChildIndex = focus_back(event);  
            });  
        }  
    });  

    // Interface_hide - Додано напряму в add_plugin  
    Lampa.SettingsApi.addParam({  
        component: 'add_plugin',  
        param: {  
            name: 'INTERFACE_HIDE',  
            type: 'select',  
            values: {  
                1: 'Встановити',  
                2: 'Видалити'  
            },  
        },  
        field: {  
            name: 'Hide interface elements',  
            description: 'Приховати елементи меню інтерфейсу'  
        },  
        onChange: function(value) {  
            if (value == '1') {  
                itemON('https://crowley24.github.io/interface_hide.js', 'Interface_hide', '@lampa', 'INTERFACE_HIDE');  
            }  
            if (value == '2') {  
                deletePlugin("https://crowley24.github.io/interface_hide.js");  
            }  
        },  
        onRender: function(item) {  
            $('.settings-param__name', item).css('color', '#f3d900');  
            hideInstall();  
              
            var myResult = checkPlugin('https://crowley24.github.io/interface_hide.js');  
            var pluginsArray = Lampa.Storage.get('plugins') || [];  
              
            setTimeout(function() {  
                var container = $('div[data-name="INTERFACE_HIDE"]');  
                if (container && container.length && container.find('.settings-param__status').length === 0) {  
                    container.append('<div class="settings-param__status one"></div>');  
                }  
                var pluginStatus = null;  
                for (var i = 0; i < pluginsArray.length; i++) {  
                    if (pluginsArray[i] && pluginsArray[i].url === 'https://crowley24.github.io/interface_hide.js') {  
                        pluginStatus = pluginsArray[i].status;  
                        break;  
                    }  
                }  
                var statusEl = $('div[data-name="INTERFACE_HIDE"]').find('.settings-param__status');  
                if (statusEl && statusEl.length) {  
                    statusEl.removeClass('active error').css('background-color', '');  
                    if (myResult && pluginStatus !== 0) {  
                        statusEl.addClass('active');  
                    } else if (pluginStatus === 0) {  
                        statusEl.css('background-color', 'rgb(255, 165, 0)');  
                    } else {  
                        statusEl.addClass('error');  
                    }  
                }  
            }, 100);  
              
            item.on("hover:enter", function(event) {  
                nthChildIndex = focus_back(event);  
            });  
        }  
    });  

    // Fonts - Додано напряму в add_plugin  
    Lampa.SettingsApi.addParam({  
        component: 'add_plugin',  
        param: {  
            name: 'FONTS',  
            type: 'select',  
            values: {  
                1: 'Встановити',  
                2: 'Видалити'  
            },  
        },  
        field: {  
            name: 'Шрифти',  
            description: 'Новий шрифт для інтерфейсу'  
        },  
        onChange: function(value) {  
            if (value == '1') {  
                itemON('https://crowley24.github.io/fonts.js', 'Fonts', '@lampa', 'FONTS');  
            }  
            if (value == '2') {  
                deletePlugin("https://crowley24.github.io/fonts.js");  
            }  
        },  
        onRender: function(item) {  
            $('.settings-param__name', item).css('color', '#f3d900');  
            hideInstall();  
              
            var myResult = checkPlugin('https://crowley24.github.io/fonts.js');  
            var pluginsArray = Lampa.Storage.get('plugins') || [];  
              
            setTimeout(function() {  
                var container = $('div[data-name="FONTS"]');  
                if (container && container.length && container.find('.settings-param__status').length === 0) {  
                    container.append('<div class="settings-param__status one"></div>');  
                }  
                var pluginStatus = null;  
                for (var i = 0; i < pluginsArray.length; i++) {  
                    if (pluginsArray[i] && pluginsArray[i].url === 'https://crowley24.github.io/fonts.js') {  
                        pluginStatus = pluginsArray[i].status;  
                        break;  
                    }  
                }  
                var statusEl = $('div[data-name="FONTS"]').find('.settings-param__status');  
                if (statusEl && statusEl.length) {  
                    statusEl.removeClass('active error').css('background-color', '');  
                    if (myResult && pluginStatus !== 0) {  
                        statusEl.addClass('active');  
                    } else if (pluginStatus === 0) {  
                        statusEl.css('background-color', 'rgb(255, 165, 0)');  
                    } else {  
                        statusEl.addClass('error');  
                    }  
                }  
            }, 100);  
              
            item.on("hover:enter", function(event) {  
                nthChildIndex = focus_back(event);  
            });  
        }  
    });  

    // UA-Finder - Додано напряму в add_plugin  
    Lampa.SettingsApi.addParam({  
        component: 'add_plugin',  
        param: {  
            name: 'UA-FINDER',  
            type: 'select',  
            values: {  
                1: 'Встановити',  
                2: 'Видалити'  
            },  
        },  
        field: {  
            name: 'Ua-Finder',  
            description: 'Плашка на картках фільмів з українським дубляжем'  
        },  
        onChange: function(value) {  
            if (value == '1') {  
                itemON('https://crowley24.github.io/UA-Finder+Mod.js', 'Ua-Finder', '@lampa', 'UA-FINDER');  
            }  
            if (value == '2') {  
                deletePlugin("https://crowley24.github.io/UA-Finder+Mod.js");  
            }  
        },  
        onRender: function(item) {  
            $('.settings-param__name', item).css('color', '#f3d900');  
            hideInstall();  
              
            var myResult = checkPlugin('https://crowley24.github.io/UA-Finder+Mod.js');  
            var pluginsArray = Lampa.Storage.get('plugins') || [];  
              
            setTimeout(function() {  
                var container = $('div[data-name="UA-FINDER"]');  
                if (container && container.length && container.find('.settings-param__status').length === 0) {  
                    container.append('<div class="settings-param__status one"></div>');  
                }  
                var pluginStatus = null;  
                for (var i = 0; i < pluginsArray.length; i++) {  
                    if (pluginsArray[i] && pluginsArray[i].url === 'https://crowley24.github.io/UA-Finder+Mod.js') {  
                        pluginStatus = pluginsArray[i].status;  
                        break;  
                    }  
                }  
                var statusEl = $('div[data-name="UA-FINDER"]').find('.settings-param__status');  
                if (statusEl && statusEl.length) {  
                    statusEl.removeClass('active error').css('background-color', '');  
                    if (myResult && pluginStatus !== 0) {  
                        statusEl.addClass('active');  
                    } else if (pluginStatus === 0) {  
                        statusEl.css('background-color', 'rgb(255, 165, 0)');  
                    } else {  
                        statusEl.addClass('error');  
                    }  
                }  
            }, 100);  
              
            item.on("hover:enter", function(event) {  
                nthChildIndex = focus_back(event);  
            });  
        }  
    });  

    // Bookmarks - Додано напряму в add_plugin  
    Lampa.SettingsApi.addParam({  
        component: 'add_plugin',  
        param: {  
            name: 'BOOKMARKS',  
            type: 'select',  
            values: {  
                1: 'Встановити',  
                2: 'Видалити'  
            },  
        },  
        field: {  
            name: 'My Bookmarks',  
            description: 'Кастомні закладки обраних фільмів'  
        },  
        onChange: function(value) {  
            if (value == '1') {  
                itemON('https://crowley24.github.io/bookmarks.js', 'Bookmarks', '@lampa', 'BOOKMARKS');  
            }  
            if (value == '2') {  
                deletePlugin("https://crowley24.github.io/bookmarks.js");  
            }  
        },  
        onRender: function(item) {  
            $('.settings-param__name', item).css('color', '#f3d900');  
            hideInstall();  
              
            var myResult = checkPlugin('https://crowley24.github.io/bookmarks.js');  
            var pluginsArray = Lampa.Storage.get('plugins') || [];  
              
            setTimeout(function() {  
                var container = $('div[data-name="BOOKMARKS"]');  
                if (container && container.length && container.find('.settings-param__status').length === 0) {  
                    container.append('<div class="settings-param__status one"></div>');  
                }  
                var pluginStatus = null;  
                for (var i = 0; i < pluginsArray.length; i++) {  
                    if (pluginsArray[i] && pluginsArray[i].url === 'https://crowley24.github.io/bookmarks.js') {  
                        pluginStatus = pluginsArray[i].status;  
                        break;  
                    }  
                }  
                var statusEl = $('div[data-name="BOOKMARKS"]').find('.settings-param__status');  
                if (statusEl && statusEl.length) {  
                    statusEl.removeClass('active error').css('background-color', '');  
                    if (myResult && pluginStatus !== 0) {  
                        statusEl.addClass('active');  
                    } else if (pluginStatus === 0) {  
                        statusEl.css('background-color', 'rgb(255, 165, 0)');  
                    } else {  
                        statusEl.addClass('error');  
                    }  
                }  
            }, 100);  
              
            item.on("hover:enter", function(event) {  
                nthChildIndex = focus_back(event);  
            });  
        }  
    });  
    
    // MobileLogo - Додано напряму в add_plugin  
    Lampa.SettingsApi.addParam({  
        component: 'add_plugin',  
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
            description: 'Логотипи замість назви фільмів (мобільна версія)'  
        },  
        onChange: function(value) {  
            if (value == '1') {  
                itemON('https://crowley24.github.io/logo+mob.js', 'MobileLogo', '@lampa', 'MOBILELOGO');  
            }  
            if (value == '2') {  
                deletePlugin("https://crowley24.github.io/logo+mob.js");  
            }  
        },  
        onRender: function(item) {  
            $('.settings-param__name', item).css('color', '#f3d900');  
            hideInstall();  
              
            var myResult = checkPlugin('https://crowley24.github.io/logo+mob.js');  
            var pluginsArray = Lampa.Storage.get('plugins') || [];  
              
            setTimeout(function() {  
                var container = $('div[data-name="MOBILELOGO"]');  
                if (container && container.length && container.find('.settings-param__status').length === 0) {  
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
                if (statusEl && statusEl.length) {  
                    statusEl.removeClass('active error').css('background-color', '');  
                    if (myResult && pluginStatus !== 0) {  
                        statusEl.addClass('active');  
                    } else if (pluginStatus === 0) {  
                        statusEl.css('background-color', 'rgb(255, 165, 0)');  
                    } else {  
                        statusEl.addClass('error');  
                    }  
                }  
            }, 100);  
              
            item.on("hover:enter", function(event) {  
                nthChildIndex = focus_back(event);  
            });  
        }  
    });  
      
    // Очищення артефактів  
    Lampa.Settings.listener.follow('open', function(e) {  
        if (e.name == 'add_plugin') {  
            setTimeout(function() {  
                try {  
                    var label = document.querySelector("div > span > div > span");  
                    if (label && label.innerText == '@lampa_plugins_uncensored') {  
                        $('div > span').each(function() {  
                            if ($(this).text() === 'Ще' ||   
                                $(this).text() === 'Редагувати' ||   
                                $(this).text() === 'Історія' ||   
                                $(this).text() === 'Статус') {  
                                $(this).parent().remove();  
                            }  
                        });  
                    }  
                } catch(e) {}  
            }, 50);  
        }  
    });  
      
} // /* addonStart */  
  
// Ініціалізація  
if (!!window.appready) addonStart();  
else Lampa.Listener.follow('app', function(e){ if (e.type === 'ready') addonStart(); });  
  
})();
