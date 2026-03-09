(function () {
    'use strict';

    function LampaSortingPlugin() {
        // Ключ для збереження налаштувань у пам'яті Lampa
        const STORAGE_KEY = 'lampa_custom_button_sorting';
        
        // 1. Ініціалізація налаштувань
        this.init = function () {
            Lampa.Settings.add({
                title: 'Сортування кнопок',
                type: 'button',
                icon: '<svg height="24" viewBox="0 0 24 24" width="24"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" fill="white"/></svg>',
                onRender: (item) => {
                    item.find('.settings-item__name').text('Налаштувати порядок та назви');
                },
                onClick: () => {
                    this.openMenu();
                }
            });

            // Слухаємо відкриття картки фільму
            Lampa.Events.on('full:open', (event) => {
                this.applySorting(event.object.render());
            });
        };

        // 2. Логіка застосування сортування в картці
        this.applySorting = function (container) {
            const buttonContainer = container.find('.full-start-new__buttons');
            if (!buttonContainer.length) return;

            const savedData = Lampa.Storage.get(STORAGE_KEY, '{}');
            
            // "Вартовий" для динамічних кнопок
            let debounce;
            const observer = new MutationObserver(() => {
                clearTimeout(debounce);
                debounce = setTimeout(() => {
                    let buttons = buttonContainer.find('.button').toArray();
                    
                    // Сортуємо згідно зі збереженим порядком
                    buttons.sort((a, b) => {
                        let orderA = savedData[a.innerText.trim()]?.order || 999;
                        let orderB = savedData[b.innerText.trim()]?.order || 999;
                        return orderA - orderB;
                    });

                    buttons.forEach(btn => {
                        let originalName = btn.innerText.trim();
                        if (savedData[originalName]?.newName) {
                            btn.innerText = savedData[originalName].newName;
                        }
                        buttonContainer.append(btn);
                    });
                }, 300);
            });

            observer.observe(buttonContainer[0], { childList: true });
        };

        // 3. Вікно керування кнопками (Спрощена версія меню)
        this.openMenu = function () {
            Lampa.Select.show({
                title: 'Керування кнопками',
                items: [
                    { title: 'Очистити налаштування', action: 'reset' }
                ],
                onSelect: (item) => {
                    if (item.action === 'reset') {
                        Lampa.Storage.set(STORAGE_KEY, {});
                        Lampa.Noty.show('Налаштування скинуто');
                    }
                }
            });
        };
    }

    const plugin = new LampaSortingPlugin();
    if (window.appready) plugin.init();
    else Lampa.Listener.follow('app', e => { if (e.type == 'ready') plugin.init(); });
})();
