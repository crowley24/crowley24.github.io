(function () {
    'use strict';

    function LampaAdvancedSorting() {
        const STORAGE_KEY = 'lampa_btn_config';
        let config = Lampa.Storage.get(STORAGE_KEY, {});

        this.init = function () {
            // Додаємо в налаштування
            Lampa.Settings.add({
                title: 'Конструктор кнопок',
                type: 'button',
                icon: '<svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
                onRender: (item) => { item.find('.settings-item__name').text('Редагувати назви та порядок'); },
                onClick: () => { this.openEditor(); }
            });

            // Стежимо за карткою фільму
            Lampa.Events.on('full:open', (event) => {
                this.bindObserver(event.object.render());
            });
        };

        this.openEditor = function () {
            let items = [];
            Object.keys(config).forEach(id => {
                items.push({
                    title: config[id].newName || id,
                    subtitle: 'Оригінал: ' + id + ' | Порядок: ' + (config[id].order || 'не вказано'),
                    id: id
                });
            });

            if (items.length === 0) {
                Lampa.Noty.show('Спочатку відкрийте будь-який фільм, щоб плагін "побачив" кнопки');
                return;
            }

            Lampa.Select.show({
                title: 'Оберіть кнопку для редагування',
                items: items,
                onSelect: (item) => {
                    this.editButton(item.id);
                }
            });
        };

        this.editButton = function (id) {
            Lampa.Input.edit({
                title: 'Нова назва для ' + id,
                value: config[id].newName || id,
                free: true
            }, (new_name) => {
                Lampa.Input.edit({
                    title: 'Порядок (число)',
                    value: config[id].order || '10',
                    free: true
                }, (new_order) => {
                    config[id] = {
                        newName: new_name,
                        order: parseInt(new_order) || 10
                    };
                    Lampa.Storage.set(STORAGE_KEY, config);
                    Lampa.Noty.show('Збережено!');
                });
            });
        };

        this.bindObserver = function (container) {
            const btnBox = container.find('.full-start-new__buttons');
            if (!btnBox.length) return;

            const observer = new MutationObserver(() => {
                let btns = btnBox.find('.button').toArray();
                
                // Реєструємо нові кнопки, якщо їх ще немає в базі
                btns.forEach(b => {
                    let name = b.innerText.trim();
                    if (name && !config[name]) {
                        config[name] = { newName: name, order: 100 };
                        Lampa.Storage.set(STORAGE_KEY, config);
                    }
                });

                // Сортуємо та перейменовуємо
                btns.sort((a, b) => (config[a.innerText.trim()]?.order || 100) - (config[b.innerText.trim()]?.order || 100));
                btns.forEach(b => {
                    let cfg = config[b.innerText.trim()];
                    if (cfg && cfg.newName) b.innerText = cfg.newName;
                    btnBox.append(b);
                });
            });

            observer.observe(btnBox[0], { childList: true });
        };
    }

    const sortPlugin = new LampaAdvancedSorting();
    if (window.appready) sortPlugin.init();
    else Lampa.Listener.follow('app', e => { if (e.type == 'ready') sortPlugin.init(); });
})();
