(function () {
    'use strict';

    var STYLE_ID = 'lampa-custom-cards-style';

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
            /* Базовий стан картки */
            .card__view {
                /* Примусове використання GPU */
                transform: translate3d(0,0,0);
                backface-visibility: hidden;
                
                /* Використовуємо outline замість border, щоб не лагав layout */
                outline: 0px solid transparent;
                transition: transform 0.15s ease-out !important;
                will-change: transform;
                
                border-radius: ${r} !important;
                overflow: hidden !important;
                background-color: #141414 !important;
            }

            .card__img { 
                border-radius: ${r} !important;
                /* Запобігаємо мерехтінню при масштабуванні */
                transform: translate3d(0,0,0);
            }

            /* Стан ФОКУСУ */
            .card.focus .card__view { 
                /* Тільки трансформація */
                transform: scale(${sc}) translate3d(0,0,0) !important; 
                
                /* Рамка через box-shadow (працює швидше за border) */
                box-shadow: inset 0 0 0 ${bW} ${bC}, 0 10px 20px rgba(0,0,0,0.5) !important;
                z-index: 10;
            }

            /* Повністю вимикаємо стандартні ефекти Lampa */
            .card.focus .card__view::after {
                display: none !important;
            }

            /* Модалки: максимально легкі для рендеру */
            .settings__content, .selectbox__content, .modal__content {
                border-radius: ${r} !important;
                background: #1a1a1a !important;
                border: 1px solid rgba(255,255,255,0.1) !important;
                box-shadow: 0 15px 30px rgba(0,0,0,0.7) !important;
                /* Жодних блюрів та анімацій тут */
                backdrop-filter: none !important;
            }
        `;

        var styleSheet = document.createElement("style");
        styleSheet.id = STYLE_ID;
        styleSheet.innerText = css;
        document.head.appendChild(styleSheet);
    }

    function init() {
        Lampa.SettingsApi.addComponent({
            component: 'card_design',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/></svg>',
            name: 'Дизайн карточок'
        });

        Lampa.SettingsApi.addParam({
            component: 'card_design',
            param: { 
                name: 'custom_card_radius', 
                type: 'select', 
                values: { '0': 'Квадратні', '0.8': 'Легке', '1.5': 'Середнє', '2.2': 'Полное' }, 
                default: '1.5' 
            },
            field: { name: 'Скруглення (Radius)', description: 'Наскільки круглыми будуть углы постеров' },
            onChange: applyStyles
        });

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

        Lampa.SettingsApi.addParam({
            component: 'card_design',
            param: { 
                name: 'custom_card_border_width', 
                type: 'select', 
                values: { '1': 'Дуже тонка', '2': 'Тонка', '3': 'Середня' }, 
                default: '2' 
            },
            field: { name: 'Товщина рамки', description: 'Товщина кольорової лінії фокусу' },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'card_design',
            param: { 
                name: 'custom_card_scale', 
                type: 'select', 
                values: { '1.0': 'Без збільшення', '1.04': 'Мінімальне', '1.06': 'Легке', '1.08': 'Стандарт' }, 
                default: '1.08' 
            },
            field: { name: 'Масштаб при фокусі', description: 'Наскільки збільшується картка' },
            onChange: applyStyles
        });

        applyStyles();
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });

})();
