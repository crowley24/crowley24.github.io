(function () {  
    'use strict';  
  
    // Перевірка наявності Lampa  
    if (typeof Lampa === 'undefined' || !Lampa.Utils) {  
        setTimeout(arguments.callee, 100);  
        return;  
    }  
  
    console.log('[TEST Plugin] Starting...');  
  
    // Функція створення інтерфейсу налаштувань  
    function createTestSettings() {  
        const html = $('<div class="settings-test"></div>');  
          
        // Додаємо заголовок  
        html.append('<div class="settings__title">ТЕСТ РОЗДІЛ</div>');  
          
        // Додаємо тестовий контент  
        html.append('<div style="padding: 2em;">Це тестовий розділ налаштувань</div>');  
        html.append('<div style="padding: 1em;">Плагін працює коректно!</div>');  
  
        return {  
            render: function(container) {  
                container.empty().append(html);  
            },  
            destroy: function() {  
                html.remove();  
            }  
        };  
    }  
  
    // Ініціалізація налаштувань  
    function initSettings() {  
        try {  
            // Спочатку додаємо параметр  
            Lampa.SettingsApi.addParam({  
                component: 'test',  
                param: {  
                    name: 'test_section',  
                    type: 'trigger',  
                    default: true  
                },  
                field: {  
                    name: 'ТЕСТ',  
                    description: 'Тестовий розділ налаштувань'  
                }  
            });  
  
            console.log('[TEST Plugin] Settings parameter added');  
  
            // Потім реєструємо обробник  
            Lampa.Listener.follow('settings', function(e){  
                if(e.type === 'open' && e.name === 'test') {  
                    console.log('[TEST Plugin] Opening test settings');  
                    createTestSettings().render(Lampa.Utils.html('.settings-body'));  
                }  
            });  
  
            console.log('[TEST Plugin] Settings initialized');  
        } catch (e) {  
            console.error('[TEST Plugin] Error initializing settings:', e);  
        }  
    }  
  
    // Запуск з затримкою для гарантованої ініціалізації  
    setTimeout(() => {  
        initSettings();  
        console.log('[TEST Plugin] Plugin loaded successfully');  
    }, 500);  
  
})();
