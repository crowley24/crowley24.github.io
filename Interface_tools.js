(function() {
    'use strict';

    // === КОНФІГУРАЦІЯ ===

    // Унікальні ключі для збереження стану в сховищі Lampa
    const STORAGE_KEY_LOGO = 'plugin_manager_logo_enabled';
    const STORAGE_KEY_QUALITY = 'plugin_manager_quality_enabled';

    // URL плагінів
    const PLUGIN_URLS = {
        logo: 'https://crowley24.github.io/NewLogo.js',
        quality: 'https://tvigl.info/plugins/quality.js'
    };

    // === ФУНКЦІЇ ДЛЯ КЕРУВАННЯ СТАНОМ ===

    /**
     * Отримує стан (увімкнено/вимкнено) з локального сховища.
     * @param {string} key Ключ сховища.
     * @returns {boolean} True, якщо плагін увімкнено.
     */
    function getState(key) {
        // Початково увімкнено, якщо стан ще не встановлено
        return Lampa.Storage.get(key, true); 
    }

    /**
     * Зберігає новий стан плагіна.
     * @param {string} key Ключ сховища.
     * @param {boolean} state Новий стан.
     */
    function setState(key, state) {
        Lampa.Storage.set(key, state);
    }

    // === ФУНКЦІЯ ДЛЯ ДИНАМІЧНОГО ЗАВАНТАЖЕННЯ ===

    /**
     * Динамічно завантажує зовнішній JavaScript-файл.
     * @param {string} url URL файлу.
     */
    function loadScript(url) {
        if (!url) return;
        
        // Перевіряємо, чи вже не завантажений цей скрипт
        if (document.querySelector(`script[src="${url}"]`)) {
            console.log(`[Plugin Manager] Script already loaded: ${url}`);
            return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.onload = () => console.log(`[Plugin Manager] Loaded successfully: ${url}`);
        script.onerror = () => console.error(`[Plugin Manager] Failed to load: ${url}`);
        document.head.appendChild(script);
    }

    // === ДИНАМІЧНЕ ЗАВАНТАЖЕННЯ ПЛАГІНІВ ПРИ СТАРТІ ===

    // Завантажуємо NewLogo.js, якщо він увімкнений
    if (getState(STORAGE_KEY_LOGO)) {
        loadScript(PLUGIN_URLS.logo);
    }

    // Завантажуємо Quality.js, якщо він увімкнений
    if (getState(STORAGE_KEY_QUALITY)) {
        loadScript(PLUGIN_URLS.quality);
    }

    // === ІНТЕРФЕЙС НАЛАШТУВАНЬ "МЕНЕДЖЕР ПЛАГІНІВ" ===

    const component = Lampa.Settings.component;

    // 1. Додаємо пункт "Менеджер Плагінів" до розділу "Розширення"
    component.listener.follow('open', function(e) {
        if (e.name !== 'extensions') return; // Додаємо лише в розділ "Розширення"

        e.body.push({
            title: '🔌 Менеджер Плагінів',
            subtitle: 'Увімкнення/вимкнення NewLogo та Quality',
            component: 'plugin_manager_settings',
            onSelect: (item) => {
                component.open(item)
            },
            name: 'plugin_manager_settings',
        });
    });

    // 2. Реєструємо сам компонент налаштувань
    Lampa.Component.add('plugin_manager_settings', function() {
        const self = this;
        this.element = Lampa.Template.js('settings_main'); // Створюємо основний елемент

        /**
         * Функція, яка запускає відображення налаштувань.
         */
        this.start = function() {
            Lampa.Background.set(Lampa.Utils.img('img/background.jpg')); // Встановлення фону
            Lampa.Controller.add('plugin_manager_settings', {
                toggle: true,
                shift: true,
                select: self.select,
                up: Lampa.Navigator.move('up'),
                down: Lampa.Navigator.move('down'),
                back: self.back
            });
            Lampa.Controller.toggle('plugin_manager_settings');

            // Створення списку налаштувань
            const list = [];

            // --- Налаштування для NewLogo.js ---
            list.push({
                title: 'NewLogo.js',
                subtitle: getState(STORAGE_KEY_LOGO) ? 'Увімкнено' : 'Вимкнено',
                value: getState(STORAGE_KEY_LOGO),
                // Використовуємо render: 'toggle' для відображення перемикача
                render: 'toggle',
                onSelect: function() {
                    const newState = !getState(STORAGE_KEY_LOGO);
                    setState(STORAGE_KEY_LOGO, newState);
                    
                    // Повідомлення та оновлення інтерфейсу
                    Lampa.Noty.show('Зміни NewLogo набудуть чинності після перезавантаження Lampa.');
                    
                    // Оновлюємо, щоб відобразити новий стан у підзаголовку
                    Lampa.Controller.clear(); 
                    Lampa.Navigator.follow('plugin_manager_settings', this.element);
                    self.start(); 
                }
            });

            // --- Налаштування для Quality.js ---
            list.push({
                title: 'Quality.js',
                subtitle: getState(STORAGE_KEY_QUALITY) ? 'Увімкнено' : 'Вимкнено',
                value: getState(STORAGE_KEY_QUALITY),
                // Використовуємо render: 'toggle' для відображення перемикача
                render: 'toggle',
                onSelect: function() {
                    const newState = !getState(STORAGE_KEY_QUALITY);
                    setState(STORAGE_KEY_QUALITY, newState);
                    
                    // Повідомлення та оновлення інтерфейсу
                    Lampa.Noty.show('Зміни Quality набудуть чинності після перезавантаження Lampa.');
                    
                    // Оновлюємо, щоб відобразити новий стан у підзаголовку
                    Lampa.Controller.clear();
                    Lampa.Navigator.follow('plugin_manager_settings', this.element);
                    self.start(); 
                }
            });
            
            // --- Інструкція ---
            list.push({
                title: '⚠️ Перезавантаження Lampa',
                subtitle: 'Для застосування змін плагінів необхідно повністю перезапустити додаток Lampa.',
                noRefresh: true // Щоб не фокусуватись
            });


            // Рендеринг списку налаштувань
            Lampa.Settings.render(list, {
                title: 'Менеджер Плагінів',
                parent: self.element
            });
        };

        // Методи контролера Lampa
        this.select = function() {
            Lampa.Navigator.focus();
        };

        this.back = function() {
            Lampa.Settings.back();
        };

        this.pause = function() {};
        this.stop = function() {};
        this.render = function() {
            return this.element;
        };
    });

})();
