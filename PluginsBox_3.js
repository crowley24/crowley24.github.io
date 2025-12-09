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
                
            console.log('[PluginManager] Всі залежності доступні');    
                
            // Іконки    
            var icon_add_plugin = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>';    
            var icon_add_interface_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><div style="font-size:1.3em">Інтерфейс</div></div>';    
                
            var nthChildIndex = null;    
            Lampa.Storage.set('needReboot', false);    
            Lampa.Storage.set('needRebootSettingExit', false);    
                
            // Показ модального вікна перезавантаження    
            function showReload(reloadText) {    
                try {    
                    if (!document.querySelector('.modal')) {    
                        Lampa.Modal.open({    
                            title: '',    
                            align: 'center',    
                            zIndex: 300,    
                            html: $('<div class="about">' + reloadText + '</div>'),    
                            buttons: [{    
                                name: 'Ні',    
                                onSelect: function () {    
                                    try {    
                                        $('.modal').remove();    
                                        Lampa.Controller.toggle('content');    
                                    } catch (e) {    
                                        console.error('[PluginManager] Помилка закриття модального:', e);    
                                    }    
                                }    
                            }, {    
                                name: 'Так',    
                                onSelect: function () {    
                                    window.location.reload();    
                                }    
                            }]    
                        });    
                    }    
                } catch (e) {    
                    console.error('[PluginManager] Помилка показу модального:', e);    
                }    
            }    
                
            // Анімація завантаження    
            function showLoadingBar(callback) {    
                try {    
                    var loadingBar = document.createElement('div');    
                    loadingBar.className = 'loading-bar';    
                    loadingBar.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;width:30em;height:2.5em;background:#595959;border-radius:4em';    
                        
                    var loadingIndicator = document.createElement('div');    
                    loadingIndicator.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:0;background:#f3d900;border-radius:4em;transition:width 0.3s ease';    
                        
                    loadingBar.appendChild(loadingIndicator);    
                    document.body.appendChild(loadingBar);    
                    loadingBar.style.display = 'block';    
                        
                    var width = 0;    
                    var interval = setInterval(function() {    
                        try {    
                            width += 10;    
                            loadingIndicator.style.width = width + '%';    
                            if (width >= 100) {    
                                clearInterval(interval);    
                                setTimeout(function() {    
                                    try {    
                                        if (document.body.contains(loadingBar)) {    
                                            document.body.removeChild(loadingBar);    
                                        }    
                                        if (callback) callback();    
                                    } catch (e) {    
                                        console.error('[PluginManager] Помилка видалення бару:', e);    
                                    }    
                                }, 500);    
                            }    
                        } catch (e) {    
                            clearInterval(interval);    
                            console.error('[PluginManager] Помилка анімації:', e);    
                        }    
                    }, 200);    
                } catch (e) {    
                    console.error('[PluginManager] Помилка створення бару:', e);    
                }    
            }    
                
            // Анімація видалення    
            function showDeletedBar(callback) {    
                try {    
                    var loadingBar = document.createElement('div');    
                    loadingBar.className = 'loading-bar';    
                    loadingBar.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;width:30em;height:2.5em;background:#595959;border-radius:4em';    
                        
                    var loadingIndicator = document.createElement('div');    
                    loadingIndicator.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:100%;background:#f3d900;border-radius:4em;transition:width 0.3s ease';    
                        
                    loadingBar.appendChild(loadingIndicator);    
                    document.body.appendChild(loadingBar);    
                    loadingBar.style.display = 'block';    
                        
                    setTimeout(function() {    
                        try {    
                            var width = 100;    
                            var interval = setInterval(function() {    
                                try {    
                                    width -= 10;    
                                    loadingIndicator.style.width = width + '%';    
                                    if (width <= 0) {    
                                        clearInterval(interval);    
                                        setTimeout(function() {    
                                            try {    
                                                if (document.body.contains(loadingBar)) {    
                                                    document.body.removeChild(loadingBar);    
                                                }    
                                                if (callback) callback();    
                                            } catch (e) {    
                                                console.error('[PluginManager] Помилка видалення:', e);    
                                            }    
                                        }, 500);    
                                    }    
                                } catch (e) {    
                                    clearInterval(interval);    
                                    console.error('[PluginManager] Помилка анімації видалення:', e);    
                                }    
                            }, 200);    
                        } catch (e) {    
                            console.error('[PluginManager] Помилка запуску анімації:', e);    
                        }    
                    }, 500);    
                } catch (e) {    
                    console.error('[PluginManager] Помилка створення:', e);    
                }    
            }    
                
            // Приховування елементів    
            function hideInstall() {    
                try {    
                    setTimeout(function() {    
                        var elements = [    
                            'div.settings-param__value',    
                            'div > span:contains("Редагувати")',    
                            'div > span:contains("Ще")',    
                            'div > span:contains("Історія")',    
                            'div > span:contains("Статус")'    
                        ];    
                            
                        elements.forEach(function(selector) {    
                            try {    
                                $(selector).each(function() {    
                                    if (this && this.parentNode) {    
                                        this.parentNode.removeChild(this);    
                                    }    
                                });    
                            } catch (e) {    
                                console.error('[PluginManager] Помилка видалення [' + selector + ']:', e);    
                            }    
                        });    
                    }, 0);    
                } catch (e) {    
                    console.error('[PluginManager] Помилка hideInstall:', e);    
                }    
            }    
                
            // Збереження фокусу    
            function focus_back(event) {    
                try {    
                    if (!event || !event.target) {    
                        return null;    
                    }    
                        
                    var element = event.target;    
                    var parent = element.closest('.settings-param');    
                    if (parent && parent.parentElement) {    
                        var children = Array.from(parent.parentElement.children);    
                        var index = children.indexOf(parent) + 1;    
                        nthChildIndex = index;    
                        return nthChildIndex;    
                    }    
                    return null;    
                } catch (e) {    
                    console.error('[PluginManager] Помилка focus_back:', e);    
                    return null;    
                }    
            }    
                
            // Додавання плагіна    
            function itemON(url, name, author, plugin, nthChildIndex) {    
                try {    
                    var plugins = Lampa.Storage.get('plugins') || [];    
                    if (plugins.some(function(p) { return p.url === url; })) {    
                        Lampa.Noty.show('Плагін вже встановлено');    
                        return;    
                    }    
                        
                    plugins.push({    
                        url: url,    
                        name: name,    
                        author: author,    
                        plugin: plugin,    
                        status: 1    
                    });    
                        
                    Lampa.Storage.set('plugins', plugins);    
                        
                    showLoadingBar(function() {    
                        setTimeout(function() {    
                            try {    
                                Lampa.Settings.update();    
                                Lampa.Noty.show("Плагін успішно встановлено");    
                                    
                                if (nthChildIndex) {    
                                    var selectors = [    
                                        "#app > div.settings.animate > div.settings__content.layer--height > div.settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")",    
                                        ".settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")",    
                                        ".settings-param:nth-child(" + nthChildIndex + ")"    
                                    ];    
                                        
                                    var targetElement = null;    
                                    for (var i = 0; i < selectors.length; i++) {    
                                        targetElement = document.querySelector(selectors[i]);    
                                        if (targetElement) break;    
                                    }    
                                        
                                    if (targetElement) {    
                                        Lampa.Controller.focus(targetElement);    
                                        Lampa.Controller.toggle('settings_component');    
                                    }    
                                }    
                                    
                                Lampa.Storage.set('needRebootSettingExit', true);    
                                settingsWatch();    
                            } catch (e) {    
                                console.error('[PluginManager] Помилка встановлення:', e);    
                            }    
                        }, 2000);    
                    });    
                } catch (e) {    
                    console.error('[PluginManager] Помилка itemON:', e);    
                }    
            }    
                
            // Видалення плагіна    
            function deletePlugin(pluginToRemoveUrl, nthChildIndex) {    
                try {    
                    var plugins = Lampa.Storage.get('plugins');    
                    if (!plugins) return;    
                        
                    var updatedPlugins = plugins.filter(function(obj) {    
                        return obj.url !== pluginToRemoveUrl;    
                    });    
                    Lampa.Storage.set('plugins', updatedPlugins);    
                        
                    showDeletedBar(function() {    
                        setTimeout(function() {    
                            try {    
                                Lampa.Settings.update();    
                                Lampa.Noty.show("Плагін успішно видалено");    
                            } catch (e) {    
                                console.error('[PluginManager] Помилка оновлення:', e);    
                            }    
                        }, 1500);    
                            
                        setTimeout(function() {    
                            try {    
                                if (nthChildIndex) {    
                                    var selectors = [    
                                        "#app > div.settings.animate > div.settings__content.layer--height > div.settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")",    
                                        ".settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")",    
                                        ".settings-param:nth-child(" + nthChildIndex + ")"    
                                    ];    
                                        
                                    var targetElement = null;    
                                    for (var i = 0; i < selectors.length; i++) {    
                                        targetElement = document.querySelector(selectors[i]);    
                                        if (targetElement) break;    
                                    }    
                                        
                                    if (targetElement) {    
                                        Lampa.Controller.focus(targetElement);    
                                        Lampa.Controller.toggle('settings_component');    
                                    }    
                                }    
                                    
                                Lampa.Storage.set('needRebootSettingExit', true);    
                                settingsWatch();    
                            } catch (e) {    
                                console.error('[PluginManager] Помилка фокусу:', e);    
                            }    
                        }, 2000);    
                    });    
                } catch (e) {    
                    console.error('[PluginManager] Помилка deletePlugin:', e);    
                }    
            }    
                
            // Перевірка плагіна    
            function checkPlugin(url) {    
                try {    
                    var plugins = Lampa.Storage.get('plugins') || [];    
                    return plugins.some(function(plugin) {    
                        return plugin.url === url;    
                    });    
                } catch (e) {    
                    console.error('[PluginManager] Помилка перевірки:', e);    
                    return false;    
                }    
            }    
                
            // Слідкування за налаштуваннями    
            function settingsWatch() {    
                try {    
                    Lampa.Settings.listener.follow('open', function(e) {    
                        try {    
                            if (e && e.name === 'main' && Lampa.Storage.get('needRebootSettingExit')) {    
                                Lampa.Storage.set('needRebootSettingExit', false);    
                                showReload('Потрібно перезавантажити програму для застосування змін.<br>Натисніть "Так" для перезавантаження.');    
                            }    
                        } catch (err) {    
                            console.error('[PluginManager] Помилка listener:', err);    
                        }    
                    });    
                } catch (e) {    
                    console.error('[PluginManager] Помилка settingsWatch:', e);    
                }    
            }    
                
            // Реєстрація компонентів    
            try {    
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
                        try {    
                            item.on('hover:enter', function () {    
                                Lampa.Settings.create('add_interface_plugin');    
                                if (Lampa.Controller.enabled() && Lampa.Controller.enabled().controller) {    
                                    Lampa.Controller.enabled().controller.back = function() {    
                                        Lampa.Settings.create('add_plugin');    
                                    };    
                                }    
                            });    
                        } catch (e) {    
                            console.error('[PluginManager] Помилка onRender:', e);    
                        }    
                    }    
                });    
                    
                // Якість на картках    
                Lampa.SettingsApi.addParam({    
                    component: 'add_interface_plugin',    
                    param: {    
                        name: 'QUALITY',    
                        type: 'select',    
                        values: {    
                            1: 'Встановити',    
                            2: 'Видалити'    
                        }    
                    },    
                    field: {    
                        name: 'Якість на картках',    
                        description: 'Відображення якості на постерах фільмів'    
                    },    
                    onChange: function(value) {    
                        try {    
                            if (value == '1') {    
                                itemON('https://crowley24.github.io/quality_v7.js', 'Якість на картках', '@lampa', 'QUALITY');    
                            }    
                            if (value == '2') {    
                                deletePlugin("https://crowley24.github.io/quality_v7.js");    
                            }    
                        } catch (e) {    
                            console.error('[PluginManager] Помилка onChange QUALITY:', e);    
                        }    
                    },    
                    onRender: function(item) {    
                        try {    
                            $('.settings-param__name', item).css('color', '#f3d900');    
                            hideInstall();    
                                
                            var myResult = checkPlugin('https://crowley24.github.io/quality_v7.js');    
                            var pluginsArray = Lampa.Storage.get('plugins') || [];    
                                
                            setTimeout(function() {    
                                try {    
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
                                        statusEl.removeClass('active error').css('background-color','');  
                                        if (myResult && pluginStatus !== 0) {  
                                            statusEl.addClass('active');  
                                        } else if (pluginStatus === 0) {  
                                            statusEl.css('background-color', 'rgb(255, 165, 0)');  
                                        } else {  
                                            statusEl.addClass('error');  
                                        }  
                                    }  
                                } catch (e) {  
                                    console.error('[PluginManager] Помилка оновлення статусу QUALITY:', e);  
                                }  
                            }, 100);  
                              
                            item.on("hover:enter", function (event) {  
                                try {  
                                    nthChildIndex = focus_back(event);  
                                } catch (e) {  
                                    console.error('[PluginManager] Помилка hover:enter QUALITY:', e);  
                                }  
                            });  
                        } catch (e) {  
                            console.error('[PluginManager] Помилка onRender QUALITY:', e);  
                        }  
                    }  
                });  
                  
                // MobileLogo  
                Lampa.SettingsApi.addParam({  
                    component: 'add_interface_plugin',  
                    param: {  
                        name: 'MOBILELOGO',  
                        type: 'select',  
                        values: {  
                            1: 'Встановити',  
                            2: 'Видалити'  
                        }  
                    },  
                    field: {  
                        name: 'MobileLogo',  
                        description: 'Мобільні логотипи для інтерфейсу'  
                    },  
                    onChange: function(value) {  
                        try {  
                            if (value == '1') {  
                                itemON('https://crowley24.github.io/logo+mob.js', 'MobileLogo', '@lampa', 'MOBILELOGO');  
                            }  
                            if (value == '2') {  
                                deletePlugin("https://crowley24.github.io/logo+mob.js");  
                            }  
                        } catch (e) {  
                            console.error('[PluginManager] Помилка onChange MOBILELOGO:', e);  
                        }  
                    },  
                    onRender: function (item) {  
                        try {  
                            $('.settings-param__name', item).css('color','#f3d900');  
                            hideInstall();  
                              
                            var myResult = checkPlugin('https://crowley24.github.io/logo+mob.js');  
                            var pluginsArray = Lampa.Storage.get('plugins') || [];  
                              
                            setTimeout(function() {  
                                try {  
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
                                        statusEl.removeClass('active error').css('background-color','');  
                                        if (myResult && pluginStatus !== 0) {  
                                            statusEl.addClass('active');  
                                        } else if (pluginStatus === 0) {  
                                            statusEl.css('background-color', 'rgb(255, 165, 0)');  
                                        } else {  
                                            statusEl.addClass('error');  
                                        }  
                                    }  
                                } catch (e) {  
                                    console.error('[PluginManager] Помилка оновлення статусу MOBILELOGO:', e);  
                                }  
                            }, 100);  
                              
                            item.on("hover:enter", function (event) {  
                                try {  
                                    nthChildIndex = focus_back(event);  
                                } catch (e) {  
                                    console.error('[PluginManager] Помилка hover:enter MOBILELOGO:', e);  
                                }  
                            });  
                        } catch (e) {  
                            console.error('[PluginManager] Помилка onRender MOBILELOGO:', e);  
                        }  
                    }  
                });  
                  
                // Очищення артефактів при відкритті  
                Lampa.Settings.listener.follow('open', function(e) {  
                    try {  
                        if (e && e.name === 'add_plugin') {  
                            setTimeout(function() {  
                                try {  
                                    var label = document.querySelector("div > span > div > span");  
                                    if (label && label.innerText === '@lampa_plugins_uncensored') {  
                                        var elements = [  
                                            'div > span:contains("Ще")',  
                                            'div > span:contains("Редагувати")',  
                                            'div > span:contains("Історія")',  
                                            'div > span:contains("Статус")'  
                                        ];  
                                          
                                        elements.forEach(function(selector) {  
                                            try {  
                                                $(selector).each(function() {  
                                                    if (this && this.parentNode) {  
                                                        this.parentNode.removeChild(this);  
                                                    }  
                                                });  
                                            } catch (err) {  
                                                console.error('[PluginManager] Помилка видалення артефакту [' + selector + ']:', err);  
                                            }  
                                        });  
                                    }  
                                } catch (err) {  
                                    console.error('[PluginManager] Помилка очищення артефактів:', err);  
                                }  
                            }, 50);  
                        }  
                    } catch (err) {  
                        console.error('[PluginManager] Помилка listener add_plugin:', err);  
                    }  
                });  
                  
            } catch (err) {  
                console.error('[PluginManager] Помилка реєстрації компонентів:', err);  
            }  
        } // /* addonStart */  
          
        // Ініціалізація  
        try {  
            if (!!window.appready) {  
                addonStart();  
            } else {  
                Lampa.Listener.follow('app', function(e) {  
                    try {  
                        if (e && e.type === 'ready') {  
                            addonStart();  
                        }  
                    } catch (err) {  
                        console.error('[PluginManager] Помилка ініціалізації app listener:', err);  
                    }  
                });  
            }  
        } catch (err) {  
            console.error('[PluginManager] Помилка налаштування ініціалізації:', err);  
        }  
          
    } catch (err) {  
        console.error('[PluginManager] Критична помилка запуску:', err);  
    }  
})();
  
            
