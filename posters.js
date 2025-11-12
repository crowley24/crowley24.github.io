(function() {  
    'use strict';  
  
    const PLUGIN_ID = 'poster_customizer';  
    const STORAGE_KEY = 'poster_customizer_settings';  
  
    const defaults = {  
        posterType: 'vertical', // 'vertical' або 'horizontal'  
        posterSize: 'medium'    // 'small', 'medium', 'large'  
    };  
  
    // Завантаження налаштувань  
    let settings = Object.assign({}, defaults, Lampa.Storage.get(STORAGE_KEY, {}));  
  
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
            name: Lampa.Lang.translate('poster_type_title')  
        },  
        onChange: function(value) {  
            settings.posterType = value;  
            Lampa.Storage.set(STORAGE_KEY, settings);  
            applyPosterStyles();  
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
            name: Lampa.Lang.translate('poster_size_title')  
        },  
        onChange: function(value) {  
            settings.posterSize = value;  
            Lampa.Storage.set(STORAGE_KEY, settings);  
            applyPosterStyles();  
        }  
    });  
  
    // Функція застосування стилів постерів  
    function applyPosterStyles() {  
        var posterType = Lampa.Storage.get('poster_customizer_type', 'vertical');  
        var posterSize = Lampa.Storage.get('poster_customizer_size', 'medium');  
  
        console.log('[PosterCustomizer] Застосування стилів:', posterType, posterSize);  
  
        // Видаляємо старі стилі  
        var existingStyle = document.getElementById('poster-customizer-styles');  
        if (existingStyle) {  
            existingStyle.remove();  
        }  
  
        // Створюємо новий style елемент  
        var style = document.createElement('style');  
        style.id = 'poster-customizer-styles';  
  
        var css = '';  
  
        // Розміри для вертикальних постерів (співвідношення 2:3)  
        var verticalSizes = {  
            small: '10.8em',  
            medium: '12.75em',  
            large: '16em'  
        };  
  
        // Розміри для горизонтальних постерів (співвідношення 16:9)  
        var horizontalSizes = {  
            small: '24em',  
            medium: '34.3em',  
            large: '44em'  
        };  
  
        if (posterType === 'horizontal') {  
            var width = horizontalSizes[posterSize];  
            css = `  
                .card:not(.card--collection):not(.card--category):not(.card--explorer) {  
                    width: ${width} !important;  
                    min-width: ${width} !important;  
                    max-width: ${width} !important;  
                }  
                .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__view {  
                    padding-bottom: 56% !important;  
                }  
                .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__img {  
                    position: absolute !important;  
                    top: 0 !important;  
                    left: 0 !important;  
                    width: 100% !important;  
                    height: 100% !important;  
                }  
            `;  
        } else {  
            var width = verticalSizes[posterSize];  
            css = `  
                .card:not(.card--collection):not(.card--category):not(.card--explorer) {  
                    width: ${width} !important;  
                    min-width: ${width} !important;  
                    max-width: ${width} !important;  
                }  
                .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__view {  
                    padding-bottom: 150% !important;  
                }  
                .card:not(.card--collection):not(.card--category):not(.card--explorer) .card__img {  
                    position: absolute !important;  
                    top: 0 !important;  
                    left: 0 !important;  
                    width: 100% !important;  
                    height: 100% !important;  
                }  
            `;  
        }  
  
        style.textContent = css;  
        document.head.appendChild(style);  
  
        console.log('[PosterCustomizer] Стилі застосовано');  
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
        if (e.name === 'poster_customizer_type' || e.name === 'poster_customizer_size') {  
            applyPosterStyles();  
        }  
    });  
  
})();
