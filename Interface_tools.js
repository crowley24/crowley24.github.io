(function () {
    // --- Параметри Плагіна ---
    const PLUGIN_NAME = 'interface_manager';
    const COMPONENT_PAGE_NAME = 'interface_manager_page';
    const LABEL_TEXT = '🛠️ Менеджер інтерфейсу';
    const TITLE_TEXT = 'Менеджер інтерфейсу Lampa';

    /**
     * Крок 1: Реєстрація компонента сторінки.
     * Цей компонент буде завантажуватися при натисканні на пункт у налаштуваннях.
     */
    Lampa.Component.add(COMPONENT_PAGE_NAME, function (object, data) {
        let component = new Lampa.Component(object, data);
        let html = document.createElement('div');
        
        // Встановлюємо клас для коректного відображення в інтерфейсі Lampa
        html.classList.add('settings-page', 'layer--wheight'); 
        
        component.start = function () {
            // Заголовок сторінки
            Lampa.Noty.title(TITLE_TEXT); 
            
            // Вміст сторінки
            html.innerHTML = `
                <div class="settings-item selector" data-type="title">
                    <div class="settings-item__name">Вітаємо у Менеджері Інтерфейсу!</div>
                    <div class="settings-item__descr">Це ваша нова сторінка плагіна.</div>
                </div>
                
                <div class="settings-item selector">
                    <div class="settings-item__name">Налаштування 1</div>
                    <div class="settings-item__value">Увімкнено</div>
                    <div class="settings-item__descr">Тут можна розмістити логіку вашого плагіна.</div>
                </div>

                <div class="settings-item selector">
                    <div class="settings-item__name">Налаштування 2</div>
                    <div class="settings-item__value">Вимкнено</div>
                    <div class="settings-item__descr">Використовуйте Lampa.Arrays.getSettings() для створення елементів.</div>
                </div>
            `;
            
            object.append(html); // Додаємо HTML до об'єкта компонента
            
            // Забезпечуємо фокусування на першому елементі
            Lampa.Controller.add('content', {
                toggle: () => {
                    Lampa.Controller.collection = html.querySelectorAll('.selector');
                    Lampa.Controller.index = 0;
                },
                right: () => Lampa.Controller.down(), // Приклад навігації
                left: () => Lampa.Controller.up(),
                enter: (target) => {
                    // Логіка при натисканні на елемент
                    Lampa.Console.log('Натиснуто на елемент:', target);
                },
                back: () => Lampa.Api.exit() // Повернутися назад
            });
            Lampa.Controller.toggle('content');
        };

        component.destroy = function () {
            html.remove();
            Lampa.Controller.remove('content');
        };

        return component;
    });

    /**
     * Крок 2: Додавання пункту в меню Налаштувань.
     * Запускається при ініціалізації налаштувань.
     */
    Lampa.Settings.listener.follow(function (e) {
        // Перевіряємо, чи ми працюємо з головним меню налаштувань
        if (e.type === 'settings' && e.component === 'main') {
            
            Lampa.Settings.add({
                component: 'main', // Додати на головну сторінку налаштувань
                name: PLUGIN_NAME,
                label: LABEL_TEXT, // Текст, який побачить користувач
                type: 'button',
                onChange: function () {
                    // Дія при натисканні: відкрити наш зареєстрований компонент
                    Lampa.Navigate.push({
                        component: COMPONENT_PAGE_NAME,
                        title: TITLE_TEXT
                    });
                }
            });
        }
    });

    // Фінальне повідомлення про завантаження плагіна
    Lampa.Console.log(`Плагін "${LABEL_TEXT}" успішно завантажено.`);
})();
