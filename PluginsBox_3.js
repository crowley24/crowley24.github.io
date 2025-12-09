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
                try {    
                    if (document.querySelector('.modal') == null) {    
                        Lampa.Modal.open({    
                            title: '',    
                            align: 'center',    
                            zIndex: 300,    
                            html: $('<div class="about">' + reloadText + '</div>'),    
                            buttons: [{    
                                name: 'Ні',    
                                onSelect: function onSelect() {    
                                    try {    
                                        $('.modal').remove();    
                                        Lampa.Controller.toggle('content')    
                                    } catch (e) {    
                                        console.error('[PluginManager] Помилка при закритті модального вікна:', e);    
                                    }    
                                }    
                            }, {    
                                name: 'Так',    
                                onSelect: function onSelect() {    
                                    window.location.reload();    
                                }    
                            }]    
                        });    
                    }    
                } catch (e) {    
                    console.error('[PluginManager] Помилка при показі модального вікна:', e);    
                }    
            }    
                
            /* Функция анимации установки плагина */	    
            function showLoadingBar() {    
                return new Promise(function(resolve, reject) {    
                    try {    
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
                                            resolve();    
                                        } catch (e) {    
                                            console.error('[PluginManager] Помилка при видаленні loading bar:', e);    
                                            reject(e);    
                                        }    
                                    }, 500);    
                                }    
                            } catch (e) {    
                                console.error('[PluginManager] Помилка при анімації завантаження:', e);    
                                clearInterval(interval);    
                                reject(e);    
                            }    
                        }, 200);    
                    } catch (e) {    
                        console.error('[PluginManager] Помилка при створенні loading bar:', e);    
                        reject(e);    
                    }    
                });    
            }    
                
            /* Функция анимации удаления плагина */    
            function showDeletedBar() {    
                return new Promise(function(resolve, reject) {    
                    try {    
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
                                                    resolve();    
                                                } catch (e) {    
                                                    console.error('[PluginManager] Помилка при видаленні deleted bar:', e);    
                                                    reject(e);    
                                                }    
                                            }, 500);    
                                        }    
                                    } catch (e) {    
                                        console.error('[PluginManager] Помилка при анімації видалення:', e);    
                                        clearInterval(interval);    
                                        reject(e);    
                                    }    
                                }, 200);    
                            } catch (e) {    
                                console.error('[PluginManager] Помилка при запуску анімації видалення:', e);    
                                reject(e);    
                            }    
                        }, 500);    
                    } catch (e) {    
                        console.error('[PluginManager] Помилка при створенні deleted bar:', e);    
                        reject(e);    
                    }    
                });    
            }    
                
            /* Функция скрытия установки */    
            function hideInstall(){    
                try {    
                    setTimeout(function() {    
                        try {    
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
                                    console.error('[PluginManager] Помилка при видаленні елемента [' + selector + ']:', e);    
                                }    
                            });    
                        } catch (e) {    
                            console.error('[PluginManager] Помилка при hideInstall:', e);    
                        }    
                    }, 0);    
                } catch (e) {    
                    console.error('[PluginManager] Помилка при налаштуванні hideInstall:', e);    
                 }    
            }    
            }    
                
            /* Функция сохранения фокуса с улучшенной обработкой ошибок */    
            function focus_back(event){    
                try {    
                    if (!event || !event.target) {    
                        console.warn('[PluginManager] Подія або target відсутні');    
                        return null;    
                    }    
                        
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
                } catch (e) {    
                    console.error('[PluginManager] Помилка у focus_back:', e);    
                    return null;    
                }    
            }    
                
            /* Функция добавления плагина с использованием промисов */    
            function itemON(url, name, author, plugin, nthChildIndex) {    
                return new Promise(function(resolve, reject) {    
                    try {    
                        var plugins = Lampa.Storage.get('plugins') || [];    
                        var existingPlugin = plugins.find(function(p) { return p.url === url; });    
                            
                        if (existingPlugin) {    
                            Lampa.Noty.show('Плагін вже встановлено');    
                            resolve(false);    
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
                            
                        showLoadingBar()    
                            .then(function() {    
                                return new Promise(function(res) {    
                                    setTimeout(function() {    
                                        try {    
                                            Lampa.Settings.update();    
                                            Lampa.Noty.show("Плагін успішно встановлено");    
                                                
                                            if (nthChildIndex) {    
                                                // Более гибкий селектор с fallback    
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
                                                } else {    
                                                    console.warn('[PluginManager] Не вдалося знайти елемент для фокусу');    
                                                }    
                                            }    
                                            res();    
                                        } catch (e) {    
                                            console.error('[PluginManager] Помилка при оновленні налаштувань:', e);    
                                            res();    
                                        }    
                                    }, 2000);    
                                });    
                            })    
                            .then(function() {    
                                Lampa.Storage.set('needRebootSettingExit', true);    
                                settingsWatch();    
                                resolve(true);    
                            })    
                            .catch(function(error) {    
                                console.error('[PluginManager] Помилка при встановленні плагіна:', error);    
                                reject(error);    
                            });    
                    } catch (e) {    
                        console.error('[PluginManager] Помилка в itemON:', e);    
                        reject(e);    
                    }    
                });    
            }    
                
            /* Функция удаления плагина с использованием промисов */    
            function deletePlugin(pluginToRemoveUrl, nthChildIndex) {    
                return new Promise(function(resolve, reject) {    
                    try {    
                        var plugins = Lampa.Storage.get('plugins');    
                        if (!plugins) {    
                            console.warn('[PluginManager] Список плагінів порожній');    
                            resolve(false);    
                            return;    
                        }    
                            
                        var updatedPlugins = plugins.filter(function(obj) {return obj.url !== pluginToRemoveUrl});    
                        Lampa.Storage.set('plugins', updatedPlugins);    
                            
                        showDeletedBar()    
                            .then(function() {    
                                return new Promise(function(res) {    
                                    setTimeout(function() {    
                                        try {    
                                            Lampa.Settings.update();    
                                            Lampa.Noty.show("Плагін успішно видалено");    
                                            res();    
                                        } catch (e) {    
                                            console.error('[PluginManager] Помилка при оновленні налаштувань після видалення:', e);    
                                            res();    
                                        }    
                                    }, 1500);    
                                });    
                            })    
                            .then(function() {    
                                return new Promise(function(res) {    
                                    setTimeout(function() {    
                                        try {    
                                            if (nthChildIndex) {    
                                                // Более гибкие селекторы    
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
                                                } else {    
                                                    console.warn('[PluginManager] Не вдалося знайти елемент для фокусу після видалення');    
                                                }    
                                            }    
                                            res();    
                                        } catch (e) {    
                                            console.error('[PluginManager] Помилка при встановленні фокусу:', e);    
                                            res();    
                                        }    
                                    }, 2000);    
                                });    
                            })    
                            .then(function() {    
                                Lampa.Storage.set('needRebootSettingExit', true);    
                                settingsWatch();    
                                resolve(true);    
                            })    
                            .catch(function(error) {    
                                console.error('[PluginManager] Помилка при видаленні плагіна:', error);    
                                reject(error);    
                            });    
                    } catch (e) {    
                        console.error('[PluginManager] Помилка в deletePlugin:', e);    
                        reject(e);    
                    }    
                });    
            }    
                
            /* Функция проверки плагина (уже имеет хорошую обработку) */    
            function checkPlugin(url) {    
                try {    
                    var plugins = Lampa.Storage.get('plugins') || [];    
                    return plugins.some(function(plugin) { return plugin.url === url; });    
                } catch (e) {    
                    console.error('[PluginManager] Помилка при перевірці плагіна:', e);    
                    return false;    
                }    
            }    
                
            /* Функция слежения за настройками с улучшенной обработкой */    
            function settingsWatch(){    
                try {    
                    Lampa.Settings.listener.follow('open', function(e){    
                        try {    
                            if(e && e.name === 'main' && Lampa.Storage.get('needRebootSettingExit')){    
                                Lampa.Storage.set('needRebootSettingExit', false);    
                                showReload('Потрібно перезавантажити програму для застосування змін.<br>Натисніть "Так" для перезавантаження.');    
                            }    
                        } catch (e) {    
                            console.error('[PluginManager] Помилка в settingsWatch listener:', e);    
                        }    
                    });    
                } catch (e) {    
                    console.error('[PluginManager] Помилка при налаштуванні settingsWatch:', e);    
                }    
            }    
                
            /* ---------------------------    
               Регістрація компонентів з покращеною обробкою    
               --------------------------- */    
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
                                try {    
                                    Lampa.Settings.create('add_interface_plugin');    
                                    if (Lampa.Controller.enabled() && Lampa.Controller.enabled().controller) {    
                                        Lampa.Controller.enabled().controller.back = function(){    
                                            Lampa.Settings.create('add_plugin');    
                                        }    
                                    }    
                                } catch (e) {    
                                    console.error('[PluginManager] Помилка при переході до інтерфейсу плагінів:', e);    
                                }    
                            });    
                        } catch (e) {    
                            console.error('[PluginManager] Помилка в onRender для add_interface_plugin:', e);    
                        }    
                    }    
                });    
                    
                /* Якість на картках з покращеннями */    
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
                        try {    
                            if (value == '1') {    
                                itemON('https://crowley24.github.io/quality_v7.js', 'Якість на картках', '@lampa', 'QUALITY')    
                                    .catch(function(e) {    
                                        console.error('[PluginManager] Помилка при встановленні QUALITY:', e);    
                                    });    
                            }    
                            if (value == '2') {    
                                deletePlugin("https://crowley24.github.io/quality_v7.js")    
                                    .catch(function(e) {    
                                        console.error('[PluginManager] Помилка при видаленні QUALITY:', e);    
                                    });    
                            }    
                        } catch (e) {    
                            console.error('[PluginManager] Помилка в onChange для QUALITY:', e);    
                        }    
                    },    
                    onRender: function (item) {    
                        try {    
                            $('.settings-param__name', item).css('color','#f3d900');    
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
                                    console.error('[PluginManager] Помилка при оновленні статусу QUALITY:', e);    
                                }    
                            }, 100);    
                                
                            item.on("hover:enter", function (event) {    
                                try {    
                                    nthChildIndex = focus_back(event);    
                                } catch (e) {    
                                    console.error('[PluginManager] Помилка при обробці hover:enter для QUALITY:', e);    
                                }    
                            });    
                        } catch (e) {    
                            console.error('[PluginManager] Помилка в onRender для QUALITY:', e);    
                        }    
                    }    
                });    
                    
            /* MobileLogo з покращеннями */    
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
                        try {    
                            if (value == '1') {    
                                itemON('https://crowley24.github.io/logo+mob.js', 'MobileLogo', '@lampa', 'MOBILELOGO')    
                                    .catch(function(e) {    
                                        console.error('[PluginManager] Помилка при встановленні MOBILELOGO:', e);    
                                    });    
                            }    
                            if (value == '2') {    
                                deletePlugin("https://crowley24.github.io/logo+mob.js")    
                                    .catch(function(e) {    
                                        console.error('[PluginManager] Помилка при видаленні MOBILELOGO:', e);    
                                    });    
                            }    
                        } catch (e) {    
                            console.error('[PluginManager] Помилка в onChange для MOBILELOGO:', e);    
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
                                    console.error('[PluginManager] Помилка при оновленні статусу MOBILELOGO:', e);    
                                }    
                            }, 100);    
                                
                            item.on("hover:enter", function (event) {    
                                try {    
                                    nthChildIndex = focus_back(event);    
                                } catch (e) {    
                                    console.error('[PluginManager] Помилка при обробці hover:enter для MOBILELOGO:', e);    
                                }    
                            });    
                        } catch (e) {    
                            console.error('[PluginManager] Помилка в onRender для MOBILELOGO:', e);    
                        }    
                    }    
                });    
				/* Прослуховування при відкритті сторінки "add_plugin" для очищення артефактів */  
                Lampa.Settings.listener.follow('open', function(e) {  
                    try {  
                        if (e && e.name === 'add_plugin') {  
                            setTimeout(function() {  
                                try {  
                                    // якщо на сторінці є знайомий артефакт - видаляємо  
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
                                                console.error('[PluginManager] Помилка при видаленні артефакту [' + selector + ']:', err);  
                                            }  
                                        });  
                                    }  
                                } catch (err) {  
                                    console.error('[PluginManager] Помилка при очищенні артефактів:', err);  
                                }  
                            }, 50);  
                        }  
                    } catch (err) {  
                        console.error('[PluginManager] Помилка в listener для add_plugin:', err);  
                    }  
                });  
                  
            } catch (err) {  
                console.error('[PluginManager] Помилка при реєстрації компонентів:', err);  
            }  
        } // /* addonStart */  
          
        // Ініціалізація з обробкою помилок  
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
                        console.error('[PluginManager] Помилка при ініціалізації через app listener:', err);  
                    }  
                });  
            }  
        } catch (err) {  
            console.error('[PluginManager] Помилка при налаштуванні ініціалізації:', err);  
        }  
          
    } catch (err) {  
        console.error('[PluginManager] Критична помилка при запуску:', err);  
    }  
})();
 
