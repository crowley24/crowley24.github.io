(function () {

    let storage_key = 'badge_size_option';

    // значення за замовчуванням (як у твого попереднього плагіна)
    let default_size = 'normal';

    // отримати збережене значення
    let size = Lampa.Storage.get(storage_key, default_size);

    // CSS для різних розмірів
    const css = `
        .badge-custom {
            position: absolute;
            left: 6px;
            bottom: 6px;
            padding: 2px 6px;
            border-radius: 6px;
            background: rgba(0,0,0,0.7);
            color: #fff;
            font-weight: 600;
            z-index: 5;
            pointer-events: none;
        }

        .badge-size-small {
            transform: scale(0.75);
        }

        .badge-size-normal {
            transform: scale(1);
        }

        .badge-size-large {
            transform: scale(1.25);
        }
    `;

    // вставити CSS
    Lampa.Utils.appendStyle(css);

    /**
     * Функція додавання бейджу до постера
     */
    function add_badge(item, html) {
        let card = html.querySelector('.card-item, .card, .full-episode, .full-card');

        if (!card) return;

        // твій текст / умова
        let badge_text = item.dolby ? 'Dolby Vision' : '';

        if (!badge_text) return;

        let badge = document.createElement('div');
        badge.classList.add('badge-custom');

        // застосовуємо обраний розмір
        badge.classList.add(`badge-size-${size}`);

        badge.innerText = badge_text;

        card.append(badge);
    }

    // хук на побудову карток
    Lampa.Listener.follow('card_build', function (event) {
        add_badge(event.data, event.html);
    });

    /**
     * Налаштування в меню Лампи
     */
    function settings_component() {
        let component = new Lampa.SettingsApi('badge-plugin', 'Налаштування бейджів', null, {
            toggle: true
        });

        component.on('toggle', function (is_enabled) {
            Lampa.Storage.set('badge_plugin_enabled', is_enabled ? '1' : '0');
        });

        component.add({
            type: 'select',
            name: 'Розмір бейджу',
            key: storage_key,
            value: size,
            values: {
                small: 'Менший',
                normal: 'Стандартний (дефолт)',
                large: 'Більший'
            },
            onChange: function (value) {
                size = value;
                Lampa.Storage.set(storage_key, value);
                Lampa.Notify.success('Розмір застосовано');
            }
        });

        return component;
    }

    Lampa.SettingsApi.addComponent(settings_component());

})();
