(function () {  
    'use strict';  
  
    // ===== МЕТА-ПЛАГІН "КАСТОМІЗАЦІЯ" =====  
    if (window.plugin_customization_ready) return;  
    window.plugin_customization_ready = true;  
  
    var subPlugins = {  
        tmdb_mod: {  
            name: 'TMDB Підбірки',  
            enabled: true,  
            init: null,  
            destroy: null,  
            settingsProvider: null  
        },  
        new_interface: {  
            name: 'Новий інтерфейс',  
            enabled: true,  
            init: null,  
            destroy: null,  
            settingsProvider: null  
        }  
    };  
  
    function loadSettings() {  
        if (!Lampa.Storage) return;  
        Object.keys(subPlugins).forEach(function(key) {  
            var saved = Lampa.Storage.get('customization_' + key + '_enabled');  
            if (saved !== undefined) {  
                subPlugins[key].enabled = saved;  
            }  
        });  
    }  
  
    function saveSettings() {  
        if (!Lampa.Storage) return;  
        Object.keys(subPlugins).forEach(function(key) {  
            Lampa.Storage.set('customization_' + key + '_enabled', subPlugins[key].enabled);  
        });  
    }  
  
    function addSettings() {  
        if (!Lampa.SettingsApi) return;  
  
        Lampa.SettingsApi.addComponent({  
            component: 'customization',  
            name: 'Кастомізація',  
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m-5-7H1m6 0h6m6 0h6"/></svg>'  
        });  
  
        Object.keys(subPlugins).forEach(function(key) {  
            var plugin = subPlugins[key];  
              
            Lampa.SettingsApi.addParam({  
                component: 'customization',  
                param: { name: 'customization_' + key, type: 'trigger', default: true },  
                field: { name: plugin.name, description: 'Увімкнути/вимкнути ' + plugin.name },  
                onChange: function (value) {  
                    plugin.enabled = value;  
                    saveSettings();  
                      
                    if (value && plugin.init) {  
                        plugin.init();  
                    } else if (!value && plugin.destroy) {  
                        plugin.destroy();  
                    }  
                      
                    Lampa.Noty.show('Перезавантажте Lampa для застосування змін');  
                }  
            });  
  
            if (plugin.enabled && plugin.settingsProvider) {  
                var settings = plugin.settingsProvider();  
                if (settings && settings.params) {  
                    settings.params.forEach(function(paramConfig) {  
                        Lampa.SettingsApi.addParam({  
                            component: 'customization',  
                            param: paramConfig.param,  
                            field: paramConfig.field,  
                            onChange: paramConfig.onChange  
                        });  
                    });  
                }  
            }  
        });  
    }  
  
    function registerSubPlugin(key, initFn, destroyFn) {  
        if (subPlugins[key]) {  
            subPlugins[key].init = initFn;  
            subPlugins[key].destroy = destroyFn;  
              
            if (window[key.toUpperCase() + '_Plugin'] && window[key.toUpperCase() + '_Plugin'].getSettings) {  
                subPlugins[key].settingsProvider = window[key.toUpperCase() + '_Plugin'].getSettings.bind(window[key.toUpperCase() + '_Plugin']);  
            }  
              
            if (subPlugins[key].enabled) {  
                initFn();  
            }  
        }  
    }  
  
    function init() {  
        loadSettings();  
        window.LampaCustomization = { register: registerSubPlugin };  
        setTimeout(function() { addSettings(); }, 500);  
    }  
  
    function waitForApp(retries) {  
        retries = retries || 0;  
        if (retries > 30) {  
            console.error('[CUSTOMIZATION] Не вдалося завантажити Lampa');  
            return;  
        }  
  
        if (window.appready) {  
            init();  
        } else if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {  
            Lampa.Listener.follow('app', function (e) {  
                if (e.type === 'ready') init();  
            });  
        } else {  
            setTimeout(function() { waitForApp(retries + 1); }, 1000);  
        }  
    }  
  
    waitForApp();  
  
    // ===== ПІДПЛАГІН: TMDB_MOD =====  
    // (Вставте сюди весь модифікований код TMDB_MOD з попереднього повідомлення)  
  
    // ===== ПІДПЛАГІН: NEW_INTERFACE =====  
    // (Вставте сюди код NEW_INTERFACE, якщо потрібно)  
  
})();
