(function () {  
    'use strict';  
      
    // Додавання локалізації  
    Lampa.Lang.add({  
        clock_style_title: {  
            en: 'Clock style',  
            uk: 'Стиль годинника',  
            ru: 'Стиль часов'  
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
        clock_style_default: {  
            en: 'Default',  
            uk: 'Стандартний',  
            ru: 'Стандартный'  
        },  
        clock_enable_title: {  
            en: 'Custom clock styles',  
            uk: 'Кастомні стилі годинника',  
            ru: 'Кастомные стили часов'  
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
            name: Lampa.Lang.translate('clock_enable_title')  
        }  
    });  
  
    // Налаштування стилю годинника  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'clock_style',  
            type: 'select',  
            values: {  
                'gold_minutes': Lampa.Lang.translate('clock_style_gold_minutes'),  
                'gradient': Lampa.Lang.translate('clock_style_gradient'),  
                'neon': Lampa.Lang.translate('clock_style_neon'),  
                'default': Lampa.Lang.translate('clock_style_default')  
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
  
    function ClockInterface() {  
        var html;  
        var updateInterval;  
  
        this.create = function () {  
            html = $('<div class="clock-widget" style="display: flex; align-items: center; white-space: nowrap;">' +  
                    '<div class="clock-time" id="clock-time"></div>' +  
                    '</div>');  
        };  
  
        this.updateClock = function () {  
            if (Lampa.Storage.get('clock_custom_enable') !== '1') {  
                $('#clock-time').text('');  
                return;  
            }  
  
            var now = new Date();  
            var hours = String(now.getHours()).padStart(2, '0');  
            var minutes = String(now.getMinutes()).padStart(2, '0');  
            var style = Lampa.Storage.get('clock_style', 'gold_minutes');  
  
            var clockHtml = '';  
  
            switch (style) {  
                case 'gold_minutes':  
                    clockHtml = '<span style="color: #fff; font-weight: 600; font-size: 2em;">' + hours + '</span>' +  
                               '<span style="color: #fff; font-weight: 600; font-size: 2em;">:</span>' +  
                               '<span style="color: #FFD700; font-weight: 600; font-size: 2em;">' + minutes + '</span>';  
                    break;  
  
                case 'gradient':  
                    clockHtml = '<span style="background: linear-gradient(90deg, #fff 0%, #FFD700 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 600; font-size: 2em;">' +  
                               hours + ':' + minutes +  
                               '</span>';  
                    break;  
  
                case 'neon':  
                    clockHtml = '<span style="color: #0ff; text-shadow: 0 0 10px #0ff, 0 0 20px #0ff, 0 0 30px #0ff; font-weight: 600; font-size: 2em;">' +  
                               hours + ':' + minutes +  
                               '</span>';  
                    break;  
  
                case 'default':  
                default:  
                    clockHtml = '<span style="color: #fff; font-weight: 600; font-size: 2em;">' + hours + ':' + minutes + '</span>';  
                    break;  
            }  
  
            $('#clock-time').html(clockHtml);  
        };  
  
        this.start = function () {  
            this.updateClock();  
            updateInterval = setInterval(this.updateClock.bind(this), 1000);  
        };  
  
        this.render = function () {  
            return html;  
        };  
  
        this.destroy = function () {  
            if (updateInterval) {  
                clearInterval(updateInterval);  
            }  
            if (html) {  
                html.remove();  
                html = null;  
            }  
        };  
    }  
  
    var clockInterface = new ClockInterface();  
  
    $(document).ready(function () {  
        setTimeout(function(){  
            // Створюємо інтерфейс годинника  
            clockInterface.create();  
            var clockWidget = clockInterface.render();  
            $('.head__time').after(clockWidget);  
  
            // Запускаємо оновлення годинника  
            clockInterface.start();  
  
            // Встановлюємо ширину віджета  
            var width_element = document.querySelector('.head__time');  
            if (width_element) {  
                console.log('[ClockPlugin] Width:', width_element.offsetWidth);  
                $('.clock-widget').css('width', width_element.offsetWidth + 'px');  
            }  
        }, 5000);  
    });  
  
    // Оновлення при зміні налаштувань  
    Lampa.Storage.listener.follow('change', function (e) {  
        if (e.name === 'clock_custom_enable' || e.name === 'clock_style') {  
            if (clockInterface.updateClock) {  
                clockInterface.updateClock();  
            }  
        }  
    });  
  
})();
