(function() {  
    'use strict';  
  
    const PLUGIN_ID = 'poster_customizer';  
    const STORAGE_KEY = 'poster_customizer_settings';  
  
    // Додавання локалізації  
    Lampa.Lang.add({  
        poster_customizer_title: {  
            en: 'Poster Customization',  
            uk: 'Налаштування постерів',  
            ru: 'Настройка постеров'  
        },  
        poster_type_title: {  
            en: 'Poster type',  
            uk: 'Тип постерів',  
            ru: 'Тип постеров'  
        },  
        poster_type_vertical: {  
            en: 'Vertical',  
            uk: 'Вертикальні',  
            ru: 'Вертикальные'  
        },  
        poster_type_horizontal: {  
            en: 'Horizontal',  
            uk: 'Горизонтальні',  
            ru: 'Горизонтальные'  
        },  
        poster_size_title: {  
            en: 'Poster size',  
            uk: 'Розмір постерів',  
            ru: 'Размер постеров'  
        },  
        poster_size_small: {  
            en: 'Small',  
            uk: 'Маленькі',  
            ru: 'Маленькие'  
        },  
        poster_size_medium: {  
            en: 'Medium',  
            uk: 'Середні',  
            ru: 'Средние'  
        },  
        poster_size_large: {  
            en: 'Large',  
            uk: 'Великі',  
            ru: 'Большие'  
        },  
        poster_row_position_title: {  
            en: 'Row position (1-20)',  
            uk: 'Позиція рядка (1-20)',  
            ru: 'Позиция строки (1-20)'  
        },  
        poster_row_position_descr: {  
            en: 'Set the position of the row on the main screen',  
            uk: 'Встановіть позицію рядка на головному екрані',  
            ru: 'Установите позицию строки на главном экране'  
        }  
    });  
  
    // Налаштування увімкнення плагіна  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'poster_customizer_enable',  
            type: 'select',  
            values: {  
                '0': Lampa.Lang.translate('settings_param_no'),  
                '1': Lampa.Lang.translate('settings_param_yes')  
            },  
            default: '0'  
        },  
        field: {  
            name: Lampa.Lang.translate('poster_customizer_title')  
        }  
    });  
  
    // Налаштування типу постерів  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'poster_customizer_type',  
            type: 'select',  
            values: {  
                'vertical': Lampa.Lang.translate('poster_type_vertical'),  
                'horizontal': Lampa.Lang.translate('poster_type_horizontal')  
            },  
            default: 'vertical'  
        },  
        field: {  
            name: Lampa.Lang.translate('poster_type_title'),  
            show: function() {  
                return Lampa.Storage.get('poster_customizer_enable') === '1';  
            }  
        }  
    });  
  
    // Налаштування розміру постерів  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'poster_customizer_size',  
            type: 'select',  
            values: {  
                'small': Lampa.Lang.translate('poster_size_small'),  
                'medium': Lampa.Lang.translate('poster_size_medium'),  
                'large': Lampa.Lang.translate('poster_size_large')  
            },  
            default: 'medium'  
        },  
        field: {  
            name: Lampa.Lang.translate('poster_size_title'),  
            show: function() {  
                return Lampa.Storage.get('poster_customizer_enable') === '1';  
            }  
        }  
    });  
  
    // Налаштування позиції рядка (приклад для першої стрічки)  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'poster_row_position_1',  
            type: 'input',  
            default: '1'  
        },  
        field: {  
            name: Lampa.Lang.translate('poster_row_position_title') + ' #1',  
            description: Lampa.Lang.translate('poster_row_position_descr'),  
            show: function() {  
                return Lampa.Storage.get('poster_customizer_enable') === '1';  
            }  
        },  
        onRender: function(item) {  
            // Валідація введення - тільки цифри від 1 до 20  
            item.on('change', function() {  
                var value = parseInt(item.val());  
                if (isNaN(value) || value < 1 || value > 20) {  
                    item.val('1');  
                }  
            });  
        }  
    });  
  
    // Функція застосування стилів постерів  
    function applyPosterStyles() {  
        if (Lampa.Storage.get('poster_customizer_enable') !== '1') {  
            removePosterStyles();  
            return;  
        }  
  
        var posterType = Lampa.Storage.get('poster_customizer_type', 'vertical');  
        var posterSize = Lampa.Storage.get('poster_customizer_size', 'medium');  
  
        console.log('[PosterCustomizer] Застосування стилів:', posterType, posterSize);  
  
        // Видаляємо старі стилі  
        removePosterStyles();  
  
        var styleId = 'custom-poster-styles';  
        var style = document.createElement('style');  
        style.id = styleId;  
  
        var css = '';  
  
        // Розміри для вертикальних постерів (співвідношення 2:3)  
        var verticalSizes = {  
            small: { width: '10.8em', paddingBottom: '150%' },  
            medium: { width: '12.75em', paddingBottom: '150%' },  
            large: { width: '16em', paddingBottom: '150%' }  
        };  
  
        // Розміри для горизонтальних постерів (співвідношення 16:9)  
        var horizontalSizes = {  
            small: { width: '24em', paddingBottom: '56.25%' },  
            medium: { width: '34.3em', paddingBottom: '56.25%' },  
            large: { width: '44em', paddingBottom: '56.25%' }  
        };  
  
        var sizes = posterType === 'horizontal' ? horizontalSizes : verticalSizes;  
        var currentSize = sizes[posterSize];  
  
        // Базові стилі для всіх карток  
        css += '.items-line .card:not(.card--collection):not(.card--category):not(.card--explorer) {';  
        css += '  width: ' + currentSize.width + ' !important;';  
        css += '  min-width: ' + currentSize.width + ' !important;';  
        css += '  max-width: ' + currentSize.width + ' !important;';  
        css += '}';  
  
        // Стилі для card__view (контейнер зображення)  
        css += '.items-line .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__view {';  
        css += '  padding-bottom: ' + currentSize.paddingBottom + ' !important;';  
        css += '  position: relative !important;';  
        css += '}';  
  
        // Стилі для card__img  
        css += '.items-line .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__img {';  
        css += '  position: absolute !important;';  
        css += '  top: 0 !important;';  
        css += '  left: 0 !important;';  
        css += '  width: 100% !important;';  
        css += '  height: 100% !important;';  
        css += '  object-fit: cover !important;';  
        css += '}';  
  
        style.textContent = css;  
        document.head.appendChild(style);  
  
        console.log('[PosterCustomizer] Стилі застосовано');  
    }  
  
    // Функція видалення стилів  
    function removePosterStyles() {  
        var styleId = 'custom-poster-styles';  
        var existingStyle = document.getElementById(styleId);  
          
        if (existingStyle) {  
            existingStyle.remove();  
            console.log('[PosterCustomizer] Стилі видалено');  
        }  
    }  
  
    // Застосування стилів при завантаженні  
    Lampa.Listener.follow('app', function(e) {  
        if (e.type === 'ready') {  
            setTimeout(function() {  
                applyPosterStyles();  
            }, 2000);  
        }  
    });  
  
    // Застосування стилів при зміні налаштувань  
    Lampa.Storage.listener.follow('change', function(e) {  
        if (e.name === 'poster_customizer_enable' ||   
            e.name === 'poster_customizer_type' ||   
            e.name === 'poster_customizer_size') {  
            applyPosterStyles();  
        }  
    });  
  
})();
