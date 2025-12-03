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

    // Функція додавання нового розділу в налаштування
    function addFoxStudioSection() {
        if (Lampa.Settings.main && !Lampa.Settings.main().render().find('[data-component="foxstudio"]').length) {
            // HTML-код для іконки та назви розділу "FoxStudio"
            var field = "<div class=\"settings-folder selector\" data-component=\"foxstudio\" data-static=\"true\">\n\t\t\t<div class=\"settings-folder__icon\">\n\t\t\t\t<svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" width=\"512\" height=\"512\" viewBox=\"0 0 490 490\" xml:space=\"preserve\"><path d=\"M153.125 317.435h183.75v30.625h-183.75z\" fill=\"white\"></path><circle cx=\"339.672\" cy=\"175.293\" r=\"42.642\" fill=\"white\"></circle><path d=\"M420.914 0H69.086C30.999 0 0 30.999 0 69.086v351.829C0 459.001 30.999 490 69.086 490h351.829C459.001 490 490 459.001 490 420.914V69.086C490 30.999 459.001 0 420.914 0zM69.086 30.625h237.883c-17.146 20.912-42.277 47.893-75.177 74.575-9.514-12.906-26.35-19.331-42.586-14.613l-69.644 20.242c-20.778 6.039-32.837 27.98-26.798 48.758l6.475 22.278c-21.375 8-44.353 14.456-68.614 19.267V69.086c0-21.204 17.257-38.461 38.461-38.461zm390.289 390.289c0 21.204-17.257 38.461-38.461 38.461H69.086c-21.204 0-38.461-17.257-38.461-38.461V232.459c27.504-4.993 53.269-12.075 77.268-20.816l3.811 13.111c6.038 20.778 27.98 32.837 48.758 26.799l69.643-20.242c20.778-6.039 32.837-27.98 26.799-48.758l-13.481-46.382c50.532-39.47 84.67-80.759 102.687-105.546h74.805c21.204 0 38.461 17.257 38.461 38.461v351.828z\" fill=\"white\"></path></svg>\n\t\t\t</div>\n\t\t\t<div class=\"settings-folder__name\">"+Lampa.Lang.translate('foxstudio_title')+"</div>\n\t\t</div>";

            var moreElement = Lampa.Settings.main().render().find('[data-component="more"]');
            
            if (moreElement.length) {
                moreElement.after(field);
            } else {
                Lampa.Settings.main().render().append(field);
            }
            Lampa.Settings.main().update();
        }
    }

    // Функція показу налаштувань FoxStudio (Виправлено для запобігання помилці скрипта)
    function showFoxStudioSettings() {
        // Створюємо контейнер для контенту
        var settingsContent = $('<div class="settings-list settings-list--widescreen"></div>'); 

        // Налаштування Necardify
        var necardify_setting = $('<div class="settings-param selector" data-type="toggle" data-name="necardify_enabled">');
        necardify_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_necardify_title') + '</div>');
        necardify_setting.append('<div class="settings-param__value">' + (Lampa.Storage.get('necardify_enabled', false) ? 'Вкл' : 'Выкл') + '</div>');

        // Налаштування Logo
        var logo_setting = $('<div class="settings-param selector" data-type="toggle" data-name="logo_enabled">');
        logo_setting.append('<div class="settings-param__name">' + Lampa.Lang.translate('foxstudio_logo_title') + '</div>');
        logo_setting.append('<div class="settings-param__value">' + (Lampa.Storage.get('logo_enabled', false) ? 'Вкл' : 'Выкл') + '</div>');

        // Додаємо елементи в контейнер
        settingsContent.append(necardify_setting);
        settingsContent.append(logo_setting);

        // Обробник зміни налаштувань Necardify
        necardify_setting.on('hover:enter', function() {
            var current = Lampa.Storage.get('necardify_enabled', false);
            var new_value = !current;
            Lampa.Storage.set('necardify_enabled', new_value);
            $(this).find('.settings-param__value').text(new_value ? 'Вкл' : 'Выкл');

            if (new_value) {
                loadScript('https://foxstudio24.github.io/lampa/necardify.js');
            }
        });

        // Обробник зміни налаштувань Logo
        logo_setting.on('hover:enter', function() {
            var current = Lampa.Storage.get('logo_enabled', false);
            var new_value = !current;
            Lampa.Storage.set('logo_enabled', new_value);
            $(this).find('.settings-param__value').text(new_value ? 'Вкл' : 'Выкл');

            if (new_value) {
                loadScript('https://foxstudio24.github.io/lampa/logo.js');
            }
        });

        // Створюємо екран налаштувань
        Lampa.Activity.push({
            url: '',
            title: Lampa.Lang.translate('foxstudio_title'),
            component: 'settings',
            page: 1,
            nocache: true,
            template: 'settings',
            // Передаємо сам jQuery-об'єкт, а не тільки його HTML
            content: settingsContent 
        });
    }

    // Функція ініціалізації плагіна
    function init() {
        // Додаємо переклади
        Lampa.Lang.add({
            foxstudio_title: {
                ru: 'FoxStudio',
                en: 'FoxStudio',
                uk: 'FoxStudio'
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

        // Додаємо обробник для головного екрана налаштувань
        Lampa.Settings.listener.follow('open', function(e) {
            if (e.name === 'main') {
                e.body.find('[data-component="foxstudio"]').on('hover:enter', function() {
                    showFoxStudioSettings();
                });
            }
        });

        // Ініціалізація налаштувань за замовчуванням
        Object.keys(default_settings).forEach(function(key) {
            if (Lampa.Storage.get(key) === null) {
                Lampa.Storage.set(key, default_settings[key]);
            }
        });

        // Додаємо розділ в меню
        if (window.appready) {
            addFoxStudioSection();
        } else {
            Lampa.Listener.follow('app', function(e) {
                if (e.type === 'ready') {
                    addFoxStudioSection();
                }
            });
        }
        console.log('FoxStudio Interface Plugin завантажено (Тільки Logo та Necardify)');
    }

    // Запуск плагіна
    if (window.Lampa) {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
