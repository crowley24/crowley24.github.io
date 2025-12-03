(function() {  
    'use strict';  
  
    // Інформація про плагін  
    var plugin_info = {  
        name: 'FoxStudio Interface',  
        version: '1.0.0',  
        author: 'FoxStudio24'  
    };  
  
    // Налаштування за замовчуванням  
    var default_settings = {  
        foxstudio_interface_enabled: true,  
        necardify_enabled: false,  
        logo_enabled: false  
    };  
  
    // Функція завантаження зовнішнього скрипта  
    function loadScript(url, callback) {  
        var script = document.createElement('script');  
        script.type = 'text/javascript';  
        script.src = url;  
        script.onload = callback;  
        script.onerror = function() {  
            console.error('Помилка завантаження скрипта:', url);  
        };  
        document.head.appendChild(script);  
    }  
  
    // Функція реєстрації нового розділу з безпекою  
    function registerSection() {  
        try {  
            // Перевіряємо чи існує Lampa.Lang  
            if (!Lampa || !Lampa.Lang) {  
                console.error('Lampa.Lang не доступний');  
                return false;  
            }  
  
            // Додаємо переклади  
            Lampa.Lang.add({  
                settings_main_foxstudio: {  
                    ru: 'FoxStudio',  
                    en: 'FoxStudio',  
                    uk: 'FoxStudio'  
                },  
                foxstudio_interface_title: {  
                    ru: 'Новый интерфейс для тв и пк',  
                    en: 'New interface for TV and PC',  
                    uk: 'Новий інтерфейс для тв та пк'  
                },  
                foxstudio_necardify_title: {  
                    ru: 'Necardify плагин',  
                    en: 'Necardify plugin',  
                    uk: 'Necardify плагін'  
                },  
                foxstudio_logo_title: {  
                    ru: 'Logo плагин',  
                    en: 'Logo plugin',  
                    uk: 'Logo плагін'  
                }  
            });  
  
            // Перевіряємо доступні методи для реєстрації  
            console.log('Lampa.Settings доступний:', !!Lampa.Settings);  
            console.log('Lampa.Settings.main:', Lampa.Settings ? Lampa.Settings.main : 'undefined');  
            console.log('Lampa.Settings.add тип:', typeof (Lampa.Settings ? Lampa.Settings.add : 'undefined'));  
  
            // Спосіб 1: Перевіряємо існування main масиву  
            if (Lampa.Settings && Lampa.Settings.main && Array.isArray(Lampa.Settings.main)) {  
                console.log('Спроба додати до Lampa.Settings.main');  
                Lampa.Settings.main.push({  
                    name: 'foxstudio',  
                    title: Lampa.Lang.translate('settings_main_foxstudio')  
                });  
                return true;  
            }  
  
            // Спосіб 2: Перевіряємо існування методу add  
            if (Lampa.Settings && typeof Lampa.Settings.add === 'function') {  
                console.log('Спроба використати Lampa.Settings.add');  
                Lampa.Settings.add('foxstudio', {  
                    title: Lampa.Lang.translate('settings_main_foxstudio')  
                });  
                return true;  
            }  
  
            console.warn('Не вдалося знайти метод для реєстрації розділу');  
            return false;  
  
        } catch (error) {  
            console.error('Помилка при реєстрації розділу:', error);  
            return false;  
        }  
    }  
  
    // Функція ініціалізації плагіна  
    function init() {  
        try {  
            console.log('Початок ініціалізації FoxStudio плагіна');  
  
            // Реєструємо новий розділ  
            var registered = registerSection();  
            console.log('Розділ зареєстровано:', registered);  
  
            // Перевіряємо доступність Settings listener  
            if (!Lampa.Settings || !Lampa.Settings.listener) {  
                console.error('Lampa.Settings.listener не доступний');  
                return;  
            }  
  
            // Додаємо обробник для відкриття розділу  
            Lampa.Settings.listener.follow('open', function(e) {  
                console.log('Settings open event:', e.name);  
                if (e.name === 'foxstudio') {  
                    console.log('Відкрито розділ foxstudio');  
                      
                    // Основна настройка інтерфейсу  
                    var foxstudio_interface = $('<div class="settings-param selector" data-type="toggle" data-name="foxstudio_interface_enabled">');  
                    foxstudio_interface.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_interface_title') + '</div>');  
                    foxstudio_interface.append('<div class="settings-param__value"></div>');  
  
                    // Налаштування Necardify  
                    var necardify_setting = $('<div class="settings-param selector" data-type="toggle" data-name="necardify_enabled">');  
                    necardify_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_necardify_title') + '</div>');  
                    necardify_setting.append('<div class="settings-param__value"></div>');  
  
                    // Налаштування Logo  
                    var logo_setting = $('<div class="settings-param selector" data-type="toggle" data-name="logo_enabled">');  
                    logo_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_logo_title') + '</div>');  
                    logo_setting.append('<div class="settings-param__value"></div>');  
  
                    // Додаємо елементи в розділ  
                    e.body.append(foxstudio_interface);  
                    e.body.append(necardify_setting);  
                    e.body.append(logo_setting);  
  
                    // Обробники зміни налаштувань  
                    foxstudio_interface.on('hover:enter', function() {  
                        var current = Lampa.Storage.get('foxstudio_interface_enabled', true);  
                        Lampa.Storage.set('foxstudio_interface_enabled', !current);  
                        updateSettingsDisplay();  
                    });  
  
                    necardify_setting.on('hover:enter', function() {  
                        var current = Lampa.Storage.get('necardify_enabled', false);  
                        var new_value = !current;  
                        Lampa.Storage.set('necardify_enabled', new_value);  
  
                        if (new_value) {  
                            loadScript('https://foxstudio24.github.io/lampa/necardify.js');  
                        }  
                        updateSettingsDisplay();  
                    });  
  
                    logo_setting.on('hover:enter', function() {  
                        var current = Lampa.Storage.get('logo_enabled', false);  
                        var new_value = !current;  
                        Lampa.Storage.set('logo_enabled', new_value);  
  
                        if (new_value) {  
                            loadScript('https://foxstudio24.github.io/lampa/logo.js');  
                        }  
                        updateSettingsDisplay();  
                    });  
  
                    updateSettingsDisplay();  
                }  
            });  
  
            // Функція оновлення відображення налаштувань  
            function updateSettingsDisplay() {  
                $('[data-name="foxstudio_interface_enabled"] .settings-param__value').text(  
                    Lampa.Storage.get('foxstudio_interface_enabled', true) ? 'Вкл' : 'Выкл'  
                );  
                $('[data-name="necardify_enabled"] .settings-param__value').text(  
                    Lampa.Storage.get('necardify_enabled', false) ? 'Вкл' : 'Выкл'  
                );  
                $('[data-name="logo_enabled"] .settings-param__value').text(  
                    Lampa.Storage.get('logo_enabled', false) ? 'Вкл' : 'Выкл'  
                );  
            }  
  
            // Ініціалізація налаштувань за замовчуванням  
            Object.keys(default_settings).forEach(function(key) {  
                if (Lampa.Storage.get(key) === null) {  
                    Lampa.Storage.set(key, default_settings[key]);  
                }  
            });  
  
            console.log('FoxStudio Interface Plugin успішно завантажено');  
  
        } catch (error) {  
            console.error('Помилка ініціалізації плагіна:', error);  
        }  
    }  
  
    // Запуск плагіна з перевіркою  
    if (window.Lampa) {  
        console.log('Lampa знайдено, запуск плагіна');  
        init();  
    } else {  
        console.log('Lampa не знайдено, очікування DOMContentLoaded');  
        document.addEventListener('DOMContentLoaded', function() {  
            console.log('DOMContentLoaded спрацював');  
            if (window.Lampa) {  
                init();  
            } else {  
                console.error('Lampa все ще не доступний після завантаження DOM');  
            }  
        });  
    }  
  
})();
