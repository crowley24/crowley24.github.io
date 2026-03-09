(function () {
    'use strict';

    var STYLE_ID = 'lampa-custom-cards-style';

    // 1. Ініціалізація параметрів
    var Settings = {
        radius: function() { return Lampa.Storage.get('custom_card_radius', '1.5'); },
        borderWidth: function() { return Lampa.Storage.get('custom_card_border_width', '2'); },
        borderColor: function() { return Lampa.Storage.get('custom_card_border_color', '#00e5ff'); },
        focusScale: function() { return Lampa.Storage.get('custom_card_scale', '1.08'); }
    };

    function applyStyles() {
        var existing = document.getElementById(STYLE_ID);
        if (existing) existing.remove();

        var r = Settings.radius() + 'em';
        var bW = Settings.borderWidth() + 'px';
        var bC = Settings.borderColor();
        var sc = Settings.focusScale();

        var css = `
            /* Оптимізація карток */
            .card__view {
                border: ${bW} solid transparent;
                /* Анімуємо лише transform для плавності на ТБ */
                transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1) !important;
                will-change: transform;
                border-radius: ${r} !important;
                overflow: hidden !important;
            }

            .card__img { 
                border-radius: ${r} !important; 
            }

            /* Ефект при фокусі */
            .card.focus .card__view { 
                transform: scale(${sc}) !important; 
                border-color: ${bC} !important;
                /* Спрощена тінь без важких кольорових ореолів */
                box-shadow: 0 10px 30px rgba(0,0,0,0.6) !important;
                z-index: 10;
            }

            /* Вимикаємо стандартну рамку Lampa */
            .card.focus .card__view::after {
                display: none !important;
            }

            /* Оптимізація модальних вікон (без backdrop-filter для швидкості) */
            .settings__content, .selectbox__content, .modal__content {
                border-radius: ${r} !important;
                border: 1px solid rgba(255,255,255,0.1) !important;
                background-color: #1a1a1a !important; /* Насичений темний фон замість блюру */
                box-shadow: 0 20px 40px rgba(0,0,0,0.8) !important;
            }

            /* Виправлення скруглення для внутрішніх елементів списків */
            .selectbox__item, .settings-param {
                border-radius: 0 !important;
            }
        `;

        var styleSheet = document.createElement("style");
        styleSheet.id = STYLE_ID;
        styleSheet.innerText = css;
        document.head.appendChild(styleSheet);
    }

    function init() {
        // Додаємо розділ в налаштування
        Lampa.SettingsApi.addComponent({
            component: 'card_design',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/></svg>',
            name: 'Дизайн карточок'
        });

        // Скруглення
        Lampa.SettingsApi.addParam({
            component: 'card_design',
            param: { 
                name: 'custom_card_radius', 
                type: 'select', 
                values: { '0': 'Квадратні', '0.8': 'Легке', '1.5': 'Середнє', '2.2': 'Повне' }, 
                default: '1.5' 
            },
            field: { name: 'Скруглення (Radius)', description: 'Наскільки круглими будуть углы постеров' },
            onChange: applyStyles
        });

        // Колір рамки
        Lampa.SettingsApi.addParam({
            component: 'card_design',
            param: { 
                name: 'custom_card_border_color', 
                type: 'select', 
                values: { 
                    '#00e5ff': 'Циан', 
                    '#ff3d00': 'Червоний', 
                    '#7c4dff': 'Фіолетовий', 
                    '#ffea00': 'Жовтий',
                    '#ffffff': 'Білий' 
                }, 
                default: '#00e5ff' 
            },
            field: { name: 'Колір рамки фокусу', description: 'Колір обводки при наведенні' },
            onChange: applyStyles
        });

        // Товщина рамки
        Lampa.SettingsApi.addParam({
            component: 'card_design',
            param: { 
                name: 'custom_card_border_width', 
                type: 'select', 
                values: { '0': 'Без рамки', '2': 'Тонка', '4': 'Жирна' }, 
                default: '2' 
            },
            field: { name: 'Товщина рамки', description: 'Товщина кольорової лінії фокусу' },
            onChange: applyStyles
        });

        // Масштаб при фокусі (додав як параметр, щоб ви могли зменшити, якщо ТБ все одно важко)
        Lampa.SettingsApi.addParam({
            component: 'card_design',
            param: { 
                name: 'custom_card_scale', 
                type: 'select', 
                values: { '1.0': 'Без збільшення', '1.04': 'Мінімальне', '1.08': 'Стандарт', '1.12': 'Максимальне' }, 
                default: '1.08' 
            },
            field: { name: 'Масштаб при фокусі', description: 'Наскільки збільшується картка' },
            onChange: applyStyles
        });

        applyStyles();
    }

    // Запуск плагіна
    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });

})();
