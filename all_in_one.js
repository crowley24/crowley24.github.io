(function () {  
    'use strict';  
  
    // Перевірка на повторний запуск  
    if (window.plugin_customization_ready) return;  
    window.plugin_customization_ready = true;  
  
    // Реєстр підплагінів  
    var subPlugins = {  
        tmdb_mod: {  
            name: 'TMDB Підбірки',  
            enabled: true,  
            init: null, // Функція ініціалізації  
            destroy: null // Функція очищення  
        },  
        new_interface: {  
            name: 'Новий інтерфейс',  
            enabled: true,  
            init: null,  
            destroy: null  
        }  
        // Додайте інші плагіни тут  
    };  
  
    // Збереження налаштувань  
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
  
    // Додавання розділу налаштувань  
    function addSettings() {  
        if (!Lampa.SettingsApi) return;  
  
        // Створюємо головний розділ  
        Lampa.SettingsApi.addComponent({  
            component: 'customization',  
            name: 'Кастомізація',  
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m-5-7H1m6 0h6m6 0h6"/></svg>'  
        });  
  
        // Додаємо перемикачі для кожного плагіна  
        Object.keys(subPlugins).forEach(function(key) {  
            var plugin = subPlugins[key];  
              
            Lampa.SettingsApi.addParam({  
                component: 'customization',  
                param: {   
                    name: 'customization_' + key,   
                    type: 'trigger',   
                    default: true   
                },  
                field: {   
                    name: plugin.name,  
                    description: 'Увімкнути/вимкнути ' + plugin.name  
                },  
                onChange: function (value) {  
                    plugin.enabled = value;  
                    saveSettings();  
                      
                    // Динамічне увімкнення/вимкнення  
                    if (value && plugin.init) {  
                        plugin.init();  
                    } else if (!value && plugin.destroy) {  
                        plugin.destroy();  
                    }  
                      
                    Lampa.Noty.show('Зміни набудуть чинності після перезавантаження');  
                }  
            });  
        });  
  
        // Синхронізація чекбоксів при відкритті  
        if (Lampa.Settings && Lampa.Settings.listener) {  
            Lampa.Settings.listener.follow('open', function (e) {  
                if (e.name === 'customization') {  
                    requestAnimationFrame(function() {  
                        Object.keys(subPlugins).forEach(function(key) {  
                            var elements = document.querySelectorAll('[data-name="customization_' + key + '"]');  
                            elements.forEach(function(el) {  
                                if (el.type === 'checkbox') {  
                                    el.checked = subPlugins[key].enabled;  
                                }  
                            });  
                        });  
                    });  
                }  
            });  
        }  
    }  
  
    // Реєстрація підплагінів  
    function registerSubPlugin(key, initFn, destroyFn) {  
        if (subPlugins[key]) {  
            subPlugins[key].init = initFn;  
            subPlugins[key].destroy = destroyFn;  
              
            // Автоматичний запуск якщо увімкнено  
            if (subPlugins[key].enabled) {  
                initFn();  
            }  
        }  
    }  
  
    // Ініціалізація  
    function init() {  
        loadSettings();  
        addSettings();  
          
        // Експортуємо API для підплагінів  
        window.LampaCustomization = {  
            register: registerSubPlugin  
        };  
    }  
  
    // Очікування завантаження Lampa  
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
                if (e.type === 'ready') {  
                    init();  
                }  
            });  
        } else {  
            setTimeout(function() {   
                waitForApp(retries + 1);   
            }, 1000);  
        }  
    }  
  
    waitForApp();  
  
})();
Інтеграція з існуючими плагінами
Для кожного вашого плагіна (TMDB_MOD, NEW_INTERFACE) додайте реєстрацію:

// В кінці коду TMDB_MOD плагіна  
if (window.LampaCustomization) {  
    window.LampaCustomization.register('tmdb_mod',   
        function() {   
            // Ініціалізація TMDB_MOD  
            initPlugin();  
            addSettings();  
        },  
        function() {  
            // Очищення  
            if (Lampa.Api.sources.tmdb_mod) {  
                delete Lampa.Api.sources.tmdb_mod;  
            }  
        }  
    );  
}  
  
// В кінці коду NEW_INTERFACE плагіна  
if (window.LampaCustomization) {  
    window.LampaCustomization.register('new_interface',  
        function() {  
            startPluginV3();  
        },  
        function() {  
            // Очищення інтерфейсу  
            var containers = document.querySelectorAll('.new-interface');  
            containers.forEach(function(el) {  
                el.classList.remove('new-interface');  
            });  
        }  
    );  
}
