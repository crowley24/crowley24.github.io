(function () {  
    'use strict';  
  
    // Додавання локалізації  
    Lampa.Lang.add({  
        poster_view_title: {  
            en: 'Poster view mode',  
            uk: 'Режим відображення постерів',  
            ru: 'Режим отображения постеров'  
        },  
        poster_view_vertical: {  
            en: 'Vertical',  
            uk: 'Вертикальні',  
            ru: 'Вертикальные'  
        },  
        poster_view_horizontal: {  
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
        poster_plugin_enable: {  
            en: 'Custom poster display',  
            uk: 'Кастомне відображення постерів',  
            ru: 'Кастомное отображение постеров'  
        }  
    });  
  
    // Налаштування увімкнення плагіна  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'poster_custom_enable',  
            type: 'select',  
            values: {  
                '0': Lampa.Lang.translate('settings_param_no'),  
                '1': Lampa.Lang.translate('settings_param_yes')  
            },  
            default: '0'  
        },  
        field: {  
            name: Lampa.Lang.translate('poster_plugin_enable')  
        }  
    });  
  
    // Налаштування режиму відображення  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'poster_view_mode',  
            type: 'select',  
            values: {  
                'vertical': Lampa.Lang.translate('poster_view_vertical'),  
                'horizontal': Lampa.Lang.translate('poster_view_horizontal')  
            },  
            default: 'vertical'  
        },  
        field: {  
            name: Lampa.Lang.translate('poster_view_title'),  
            show: function () {  
                return Lampa.Storage.get('poster_custom_enable') === '1';  
            }  
        }  
    });  
  
    // Налаштування розміру  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'poster_size',  
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
            show: function () {  
                return Lampa.Storage.get('poster_custom_enable') === '1';  
            }  
        }  
    });  
  
    // Функція застосування стилів  
    function applyPosterStyles() {  
        if (Lampa.Storage.get('poster_custom_enable') !== '1') {  
            removePosterStyles();  
            return;  
        }  
  
        var viewMode = Lampa.Storage.get('poster_view_mode', 'vertical');  
        var size = Lampa.Storage.get('poster_size', 'medium');  
          
        var styleId = 'custom-poster-styles';  
        var existingStyle = document.getElementById(styleId);  
          
        if (existingStyle) {  
            existingStyle.remove();  
        }  
  
        var style = document.createElement('style');  
        style.id = styleId;  
          
        var css = '';  
  
        if (viewMode === 'horizontal') {  
            // Горизонтальні постери  
            if (size === 'small') {  
                css = `  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) {  
                        width: 24em !important;  
                    }  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__view {  
                        padding-bottom: 56% !important;  
                    }  
                `;  
            } else if (size === 'medium') {  
                css = `  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) {  
                        width: 34.3em !important;  
                    }  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__view {  
                        padding-bottom: 56% !important;  
                    }  
                `;  
            } else if (size === 'large') {  
                css = `  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) {  
                        width: 44em !important;  
                    }  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__view {  
                        padding-bottom: 56% !important;  
                    }  
                `;  
            }  
        } else {  
            // Вертикальні постери  
            if (size === 'small') {  
                css = `  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) {  
                        width: 10.8em !important;  
                    }  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__view {  
                        padding-bottom: 150% !important;  
                    }  
                `;  
            } else if (size === 'medium') {  
                css = `  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) {  
                        width: 12.75em !important;  
                    }  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__view {  
                        padding-bottom: 150% !important;  
                    }  
                `;  
            } else if (size === 'large') {  
                css = `  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) {  
                        width: 16em !important;  
                    }  
                    .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__view {  
                        padding-bottom: 150% !important;  
                    }  
                `;  
            }  
        }  
  
        style.textContent = css;  
        document.head.appendChild(style);  
          
        console.log('[PosterPlugin] Стилі застосовано:', viewMode, size);  
    }  
  
    // Функція видалення стилів  
    function removePosterStyles() {  
        var styleId = 'custom-poster-styles';  
        var existingStyle = document.getElementById(styleId);  
          
        if (existingStyle) {  
            existingStyle.remove();  
            console.log('[PosterPlugin] Стилі видалено');  
        }  
    }  
  
    // Застосування стилів при завантаженні  
    Lampa.Listener.follow('app', function (e) {  
        if (e.type === 'ready') {  
            setTimeout(function() {  
                applyPosterStyles();  
            }, 1000);  
        }  
    });  
  
    // Застосування стилів при зміні налаштувань  
    Lampa.Storage.listener.follow('change', function (e) {  
        if (e.name === 'poster_custom_enable' ||   
            e.name === 'poster_view_mode' ||   
            e.name === 'poster_size') {  
            applyPosterStyles();  
        }  
    });  
  
})();
