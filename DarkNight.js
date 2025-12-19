(function () {
    'use strict';

    // Додаємо переклади
    Lampa.Lang.add({
        color_plugin: { ru: 'Настройка цветов', en: 'Color settings', uk: 'Налаштування кольорів' },
        color_plugin_enabled: { ru: 'Включить плагин', en: 'Enable plugin', uk: 'Увімкнути плагін' },
        color_plugin_enabled_description: { ru: 'Изменяет вид интерфейса, добавляя градиент и свечение', en: 'Changes interface appearance with gradient and glow effects', uk: 'Змінює вигляд інтерфейсу, додаючи градієнт та світіння' },
        main_color: { ru: 'Цвет выделения', en: 'Highlight color', uk: 'Колір виділення' },
        main_color_description: { ru: 'Выберите основной цвет для градиента и свечения', en: 'Select the main color for gradient and glow', uk: 'Виберіть основний колір для градієнта та світіння' },
        default_color: { ru: 'По умолчанию', en: 'Default', uk: 'За замовчуванням' },
        custom_hex_input: { ru: 'Введи HEX-код цвета', en: 'Enter HEX color code', uk: 'Введи HEX-код кольору' },
        hex_input_hint: { ru: 'Используйте формат #FFFFFF', en: 'Use the format #FFFFFF', uk: 'Використовуйте формат #FFFFFF' },
        red: { ru: 'Красный', en: 'Red', uk: 'Червоний' },
        blue: { ru: 'Синий', en: 'Blue', uk: 'Синій' },
        green: { ru: 'Зеленый', en: 'Green', uk: 'Зелений' },
        purple: { ru: 'Пурпурный', en: 'Purple', uk: 'Пурпуровий' },
        orange: { ru: 'Оранжевый', en: 'Orange', uk: 'Помаранчевий' }
    });

    // Об'єкт для зберігання налаштувань і спрощеної палітри
    var ColorPlugin = {
        // Залишаємо лише основні налаштування
        settings: {
            main_color: Lampa.Storage.get('color_plugin_main_color', '#155dfc'), // Blue 2 як дефолт
            enabled: Lampa.Storage.get('color_plugin_enabled', 'true') === 'true',
        },
        // Спрощена палітра
        colors: {
            main: {
                'default': Lampa.Lang.translate('default_color'), // #353535 (стандартний Lampa)
                '#e7000b': Lampa.Lang.translate('red'),      // Яскраво-червоний (Red 2)
                '#155dfc': Lampa.Lang.translate('blue'),     // Яскраво-синій (Blue 2)
                '#00a63e': Lampa.Lang.translate('green'),    // Яскраво-зелений (Green 2)
                '#9810fa': Lampa.Lang.translate('purple'),   // Яскраво-пурпурний (Purple 2)
                '#f54900': Lampa.Lang.translate('orange'),   // Яскраво-оранжевий (Orange 2)
            }
        }
    };

    // Змінна для запобігання рекурсії
    var isSaving = false;

    // --- УТИЛІТИ ДЛЯ РОБОТИ З КОЛЬОРОМ ---

    // Функція для конвертації HEX у RGB
    function hexToRgb(hex) {
        var cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
             cleanHex = cleanHex.split('').map(function(hex) { return hex + hex; }).join('');
        }
        var bigint = parseInt(cleanHex, 16);
        var r = (bigint >> 16) & 255;
        var g = (bigint >> 8) & 255;
        var b = bigint & 255;
        return r + ', ' + g + ', ' + b;
    }

    // Функція для затемнення/освітлення кольору (використовуємо для градієнта)
    function adjustColor(hex, lum) {
        // Validate HEX
        hex = String(hex).replace(/[^0-9a-f]/gi, '');
        if (hex.length < 6) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        lum = lum || 0;

        var rgb = "#", c, i;
        for (i = 0; i < 3; i++) {
            c = parseInt(hex.substr(i * 2, 2), 16);
            c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
            rgb += ("00" + c).substr(c.length);
        }
        return rgb;
    }

    // Функція для валідації HEX-коду
    function isValidHex(color) {
        return /^#[0-9A-Fa-f]{6}$/.test(color) || /^#[0-9A-Fa-f]{3}$/.test(color);
    }
    
    // --- ОНОВЛЕННЯ ІНТЕРФЕЙСУ ТА ЗБЕРЕЖЕННЯ ---

    function updatePluginIcon() { /* ... (без змін) ... */ }
    
    function saveSettings() {
        if (isSaving) return;
        isSaving = true;
        // Залишаємо лише main_color та enabled
        Lampa.Storage.set('color_plugin_main_color', ColorPlugin.settings.main_color);
        Lampa.Storage.set('color_plugin_enabled', ColorPlugin.settings.enabled.toString());
        // Резервне збереження
        localStorage.setItem('color_plugin_main_color', ColorPlugin.settings.main_color);
        localStorage.setItem('color_plugin_enabled', ColorPlugin.settings.enabled.toString());
        isSaving = false;
    }
    
    // Функція-заглушка (в оригінальному коді була частково вкраплена в стилі)
    function updateCanvasFillStyle(context) {
        if (context && context.fillStyle) {
            var rgbColor = hexToRgb(ColorPlugin.settings.main_color);
            context.fillStyle = 'rgba(' + rgbColor + ', 1)';
        }
    }
    
    function updateSvgIcons() { /* ... (без змін) ... */ }
    
    function forceBlackFilterBackground() { /* ... (без змін) ... */ }
    
    function updateParamsVisibility() {
        // У спрощеному варіанті всі параметри завжди видимі, якщо плагін увімкнено
    }


    // --- КЛЮЧОВА ФУНКЦІЯ: ЗАСТОСУВАННЯ СТИЛІВ З ГРАДІЄНТОМ І СВІТІННЯМ ---

    function applyStyles() {
        if (!ColorPlugin.settings.enabled) {
            var oldStyle = document.getElementById('color-plugin-styles');
            if (oldStyle) oldStyle.remove();
            return;
        }

        if (ColorPlugin.settings.main_color === 'default') {
            ColorPlugin.settings.main_color = '#353535';
        }
        
        if (!isValidHex(ColorPlugin.settings.main_color)) {
            ColorPlugin.settings.main_color = '#353535';
        }

        var style = document.getElementById('color-plugin-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'color-plugin-styles';
            document.head.appendChild(style);
        }

        var mainColor = ColorPlugin.settings.main_color;
        var rgbColor = hexToRgb(mainColor);
        
        // 1. Градієнт: Від основного кольору до світлішого відтінку
        var gradientStart = adjustColor(mainColor, -0.2); // Темніший
        var gradientEnd = adjustColor(mainColor, 0.2);   // Світліший
        
        var accentBackground = 'linear-gradient(90deg, ' + gradientStart + ' 0%, ' + gradientEnd + ' 100%)';
        var accentBackgroundProperty = 'background: ' + accentBackground + ' !important;';

        // 2. Світіння: Використовуємо основний колір для тіні
        var glowColorRgb = hexToRgb(mainColor);
        var glowShadow = '0 0 10px rgba(' + glowColorRgb + ', 0.8) !important;';
        
        // 3. Стилі рамки (тепер це частина світіння)
        var highlightStyles = 'border: 3px solid #fff !important;'; // Біла рамка, як у старому highlight
        
        // 4. Стилі Затемнення (беремо з оригінального коду, використовуючи лише main-color-rgb)
        var dimmingStyles = 
            '.full-start__rate, .full-start__rate > div:first-child {' +
                'background: rgba(var(--main-color-rgb), 0.15) !important;' +
            '}' +
            '.reaction, .full-start__button, .items-line__more, .simple-button--filter > div {' +
                'background-color: rgba(var(--main-color-rgb), 0.3) !important;' +
            '}' +
            '.card__vote, .card__icons-inner {' +
                'background: rgba(var(--main-color-rgb), 0.5) !important;' +
            '}';


        style.innerHTML = [
            ':root {' +
                '--main-color: ' + mainColor + ' !important;' +
                '--main-color-rgb: ' + rgbColor + ' !important;' +
                '--accent-color: ' + mainColor + ' !important;' +
                '--gradient-background: ' + accentBackground + ' !important;' +
            '}',
            
            // --- СТИЛІ ТЕКСТУ ТА ІКОНОК (без змін) ---
            '.menu__ico, .menu__ico:hover, .menu__ico.traverse, ' +
            '.head__action, .head__action.focus, .head__action:hover, .settings-param__ico {' +
                'color: #ffffff !important;' +
                'fill: #ffffff !important;' +
            '}',
            // ... (інші стилі для тексту та іконок)
            
            // --- ОСНОВНЕ ВИДІЛЕННЯ: ГРАДІЄНТ ТА СВІТІННЯ ---
            '.menu__item.focus, .menu__item.traverse, .menu__item:hover, ' +
            '.console__tab, .console__tab.focus, ' +
            '.settings-param.focus, .selectbox-item.focus, .selectbox-item:hover, ' +
            '.full-person.focus, .full-start__button.focus, .full-descr__tag.focus, ' +
            '.simple-button.focus, .head__action.focus, .head__action:hover, ' +
            '.player-panel .button.focus, .search-source.active, ' +
            '.radio-item.focus, .lang__selector-item.focus, .modal__button.focus, ' +
            '.search-history-key.focus, .simple-keyboard-mic.focus, .full-review-add.focus, ' +
            '.full-review.focus, .tag-count.focus, .settings-folder.focus, .radio-player.focus {' +
                accentBackgroundProperty +
                // Ефект світіння
                'box-shadow: ' + glowShadow + ' !important;' +
                '-webkit-box-shadow: ' + glowShadow + ' !important;' +
                'transition: box-shadow 0.3s ease, background 0.3s ease !important;' +
                highlightStyles + // Додаємо білу рамку
            '}',
            
            // Застосовуємо градієнт до console__tab, але лише background-color для звичайного стану
            '.console__tab {' +
                'background-color: ' + mainColor + ' !important;' +
            '}',
            
            // --- СТИЛІ ЗАТЕМНЕННЯ (Dimming) ---
            dimmingStyles
            
        ].join('\n');
    }

    // --- ЛОГІКА ІНІЦІАЛІЗАЦІЇ ТА ОБРОБКИ ПОДІЙ (УПРОЩЕНА) ---

    function initPlugin() {
        if (window.ColorPlugin) return;
        window.ColorPlugin = ColorPlugin;

        // Ініціалізація налаштувань
        ColorPlugin.settings.enabled = Lampa.Storage.get('color_plugin_enabled', 'true') === 'true' || localStorage.getItem('color_plugin_enabled') === 'true';
        ColorPlugin.settings.main_color = Lampa.Storage.get('color_plugin_main_color', '#155dfc') || localStorage.getItem('color_plugin_main_color') || '#155dfc';

        Lampa.SettingsApi.add({
            component: 'color_plugin',
            title: Lampa.Lang.translate('color_plugin'),
            icon: '<svg width="24px" height="24px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="#ffffff"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 1.003a7 7 0 0 0-7 7v.43c.09 1.51 1.91 1.79 3 .7a1.87 1.87 0 0 1 2.64 2.64c-1.1 1.16-.79 3.07.8 3.2h.6a7 7 0 1 0 0-14l-.04.03zm0 13h-.52a.58.58 0 0 1-.36-.14.56.56 0 0 1-.15-.3 1.24 1.24 0 0 1 .35-1.08 2.87 2.87 0 0 0 0-4 2.87 2.87 0 0 0-4.06 0 1 1 0 0 1-.90.34.41.41 0 0 1-.22-.12.42.42 0 0 1-.1-.29v-.37a6 6 0 1 1 6 6l-.04-.04zM9 3.997a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 7.007a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-7-5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm7-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM13 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>',
            sort: 100,
            onLoad: function (view) {
                var items = [];
                items.push({
                    title: Lampa.Lang.translate('color_plugin_enabled'),
                    descr: Lampa.Lang.translate('color_plugin_enabled_description'),
                    value: ColorPlugin.settings.enabled,
                    onChange: function (value) {
                        ColorPlugin.settings.enabled = value;
                        saveSettings();
                        applyStyles();
                        view.render(); // Перерендеримо для оновлення видимості
                    },
                    name: 'enabled',
                    type: 'toggle'
                });
                
                // Якщо плагін увімкнено, показуємо вибір кольору
                if (ColorPlugin.settings.enabled) {
                    items.push({
                        title: Lampa.Lang.translate('main_color'),
                        descr: Lampa.Lang.translate('main_color_description'),
                        value: ColorPlugin.settings.main_color,
                        onChange: function (value) {
                            ColorPlugin.settings.main_color = value;
                            saveSettings();
                            applyStyles();
                        },
                        select: function (onselect) {
                            var component = new Lampa.Component(Lampa.Arrays.clone(ColorPlugin.colors));
                            var customColorHex = ColorPlugin.settings.main_color;
                            
                            component.onSelect = function(name, hex) {
                                customColorHex = hex;
                                onselect(hex);
                            };

                            var customInput = Lampa.Template.get('settings_input');
                            customInput.querySelector('input').value = customColorHex;
                            customInput.querySelector('input').addEventListener('input', function(e) {
                                if (isValidHex(e.target.value)) {
                                    customColorHex = e.target.value;
                                    component.draw();
                                }
                            });
                            
                            component.onRender = function(item) {
                                item.appendChild(customInput);
                            };

                            component.render(function(hex) {
                                onselect(hex);
                            });
                        },
                        name: 'main_color',
                        type: 'select'
                    });
                }
                
                view.add(items);
            },
            onBack: function() {
                saveSettings();
                applyStyles();
                updateCanvasFillStyle(window.draw_context);
            }
        });

        // Застосовуємо стилі при ініціалізації
        applyStyles(); 
        forceBlackFilterBackground(); 
        updateCanvasFillStyle(window.draw_context); 
        updatePluginIcon(); 
        updateSvgIcons();
        
        // Спостереження за змінами в сховищі
        Lampa.Storage.listener.follow('change', function (e) {
            if (e.name === 'color_plugin_enabled' || e.name === 'color_plugin_main_color') {
                ColorPlugin.settings.enabled = Lampa.Storage.get('color_plugin_enabled', 'true') === 'true' || localStorage.getItem('color_plugin_enabled') === 'true';
                ColorPlugin.settings.main_color = Lampa.Storage.get('color_plugin_main_color', '#155dfc') || localStorage.getItem('color_plugin_main_color') || '#155dfc';
                applyStyles();
                forceBlackFilterBackground();
                updateCanvasFillStyle(window.draw_context);
                updateSvgIcons();
            }
        });
    }

    // Запускаємо плагін після готовності програми
    if (window.appready && Lampa.SettingsApi && Lampa.Storage) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready' && Lampa.SettingsApi && Lampa.Storage) {
                initPlugin();
            }
        });
    }

})();

