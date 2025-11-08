(function () {  
    'use strict';  
  
    // Додавання локалізації  
    Lampa.Lang.add({  
        clock_style_title: {  
            en: 'Clock style',  
            uk: 'Стиль годинника',  
            ru: 'Стиль часов'  
        },  
        clock_style_default: {  
            en: 'Default',  
            uk: 'Стандартний',  
            ru: 'Стандартный'  
        },  
        clock_style_gold_minutes: {  
            en: 'White hours, gold minutes',  
            uk: 'Білі години, золоті хвилини',  
            ru: 'Белые часы, золотые минуты'  
        },  
        clock_style_gradient: {  
            en: 'Gradient',  
            uk: 'Градієнт',  
            ru: 'Градиент'  
        },  
        clock_style_neon: {  
            en: 'Neon',  
            uk: 'Неон',  
            ru: 'Неон'  
        },  
        clock_enable_title: {  
            en: 'Custom clock styles',  
            uk: 'Кастомні стилі годинника',  
            ru: 'Кастомные стили часов'  
        },  
        clock_enable_descr: {  
            en: 'Enable custom clock styles',  
            uk: 'Увімкнути кастомні стилі годинника',  
            ru: 'Включить кастомные стили часов'  
        },  
        clock_show_mobile_title: {  
            en: 'Show clock on mobile',  
            uk: 'Показувати годинник на телефоні',  
            ru: 'Показывать часы на телефоне'  
        },  
        clock_show_mobile_descr: {  
            en: 'Display clock on mobile devices',  
            uk: 'Відображати годинник на мобільних пристроях',  
            ru: 'Отображать часы на мобильных устройствах'  
        }  
    });  
  
    // Налаштування увімкнення/вимкнення  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'clock_custom_enable',  
            type: 'select',  
            values: {  
                '0': Lampa.Lang.translate('settings_param_no'),  
                '1': Lampa.Lang.translate('settings_param_yes')  
            },  
            default: '0'  
        },  
        field: {  
            name: Lampa.Lang.translate('clock_enable_title'),  
            description: Lampa.Lang.translate('clock_enable_descr')  
        }  
    });  
  
    // Налаштування відображення на мобільних  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'clock_show_mobile',  
            type: 'select',  
            values: {  
                '0': Lampa.Lang.translate('settings_param_no'),  
                '1': Lampa.Lang.translate('settings_param_yes')  
            },  
            default: '1'  
        },  
        field: {  
            name: Lampa.Lang.translate('clock_show_mobile_title'),  
            description: Lampa.Lang.translate('clock_show_mobile_descr'),  
            show: function () {  
                return Lampa.Storage.get('clock_custom_enable') === '1';  
            }  
        }  
    });  
  
    // Налаштування стилю годинника  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'clock_style',  
            type: 'select',  
            values: {  
                'default': Lampa.Lang.translate('clock_style_default'),  
                'gold_minutes': Lampa.Lang.translate('clock_style_gold_minutes'),  
                'gradient': Lampa.Lang.translate('clock_style_gradient'),  
                'neon': Lampa.Lang.translate('clock_style_neon')  
            },  
            default: 'gold_minutes'  
        },  
        field: {  
            name: Lampa.Lang.translate('clock_style_title'),  
            show: function () {  
                return Lampa.Storage.get('clock_custom_enable') === '1';  
            }  
        }  
    });  
  
    // Додавання CSS для відображення годинника на мобільних  
    function injectMobileClockCSS() {  
        if (Lampa.Storage.get('clock_show_mobile') === '1') {  
            var styleId = 'custom-clock-mobile-style';  
            if (!document.getElementById(styleId)) {  
                var style = document.createElement('style');  
                style.id = styleId;  
                style.textContent = '@media screen and (max-width: 767px) { .head__time { display: flex !important; } }';  
                document.head.appendChild(style);  
            }  
        } else {  
            var existingStyle = document.getElementById('custom-clock-mobile-style');  
            if (existingStyle) {  
                existingStyle.remove();  
            }  
        }  
    }  
  
    // Функція застосування стилів  
    function applyClockStyle() {  
        if (Lampa.Storage.get('clock_custom_enable') !== '1') return;  
  
        var style = Lampa.Storage.get('clock_style', 'gold_minutes');  
        var timeElement = $('.head__time-now');  
          
        if (!timeElement.length) return;  
  
        // Очищення попередніх стилів  
        timeElement.removeAttr('style');  
        timeElement.find('span').remove();  
  
        var timeText = timeElement.text().trim();  
        var parts = timeText.split(':');  
          
        if (parts.length !== 2) return;  
  
        var hours = parts[0];  
        var minutes = parts[1];  
  
        switch (style) {  
            case 'gold_minutes':  
                timeElement.html(  
                    '<span style="color: #fff;">' + hours + '</span>' +  
                    '<span style="color: #fff;">:</span>' +  
                    '<span style="color: #FFD700;">' + minutes + '</span>'  
                );  
                break;  
  
            case 'gradient':  
                timeElement.html(  
                    '<span style="background: linear-gradient(90deg, #fff 0%, #FFD700 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">' +  
                    hours + ':' + minutes +  
                    '</span>'  
                );  
                break;  
  
            case 'neon':  
                timeElement.html(  
                    '<span style="color: #0ff; text-shadow: 0 0 10px #0ff, 0 0 20px #0ff, 0 0 30px #0ff;">' +  
                    hours + ':' + minutes +  
                    '</span>'  
                );  
                break;  
  
            case 'default':  
            default:  
                // Залишити стандартний стиль  
                break;  
        }  
    }  
  
    // Застосування стилів при завантаженні  
    Lampa.Listener.follow('app', function (e) {  
        if (e.type === 'ready') {  
            // Додати CSS для мобільних  
            injectMobileClockCSS();  
              
            // Застосувати стилі при запуску  
            setTimeout(applyClockStyle, 500);  
  
            // Оновлювати стилі кожну секунду  
            setInterval(applyClockStyle, 1000);  
        }  
    });  
  
    // Застосувати стилі при зміні налаштувань  
    Lampa.Storage.listener.follow('change', function (e) {  
        if (e.name === 'clock_custom_enable' || e.name === 'clock_style') {  
            applyClockStyle();  
        }  
        if (e.name === 'clock_show_mobile') {  
            injectMobileClockCSS();  
        }  
    });  
  
})();
