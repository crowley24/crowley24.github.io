(function () {
    'use strict';

    function ButtonEditor() {
        let items = []; // Наш масив даних

        this.init = function() {
            // Додаємо стилі один раз при старті (Варіант Б)
            Lampa.Template.add('button_editor_style', `
                <style>
                    .menu-edit-list { padding: 10px; }
                    .menu-edit-list__item {
                        display: flex; align-items: center; justify-content: space-between;
                        background: rgba(255,255,255,0.05); margin-bottom: 10px;
                        padding: 12px; border-radius: 10px; transition: all 0.2s;
                    }
                    .menu-edit-list__item.focus { background: rgba(255,255,255,0.15); border: 2px solid #fff; }
                    .item__content { display: flex; align-items: center; pointer-events: none; }
                    .item__icon { width: 24px; height: 24px; margin-right: 15px; fill: #fff; }
                    .item__name { font-size: 1.2rem; color: #fff; }
                    .item__actions { display: flex; gap: 15px; }
                    .action--btn { cursor: pointer; padding: 5px; opacity: 0.6; font-size: 1.4rem; }
                    .action--btn.focus { opacity: 1; transform: scale(1.2); color: #ffeb3b; }
                </style>
            `);

            // Слухаємо подію відкриття картки фільму (Варіант 2)
            Lampa.Listener.follow('full', (e) => {
                if (e.type == 'complite') this.addButton();
            });
        };

        this.addButton = function() {
            let btn = $('<div class="full-start__button selector button--editor"><span>Button Editor</span></div>');
            btn.on('hover:enter', () => this.open());
            $('.full-start__buttons').append(btn);
        };

        this.collectData = function() {
            let saved = Lampa.Storage.get('custom_menu_settings', '{}');
            items = [];
            $('.full-start__buttons .full-start__button').each(function() {
                let btn = $(this);
                if (btn.hasClass('button--editor')) return;
                let id = btn.attr('class').split(/\s+/).find(c => c.includes('--'));
                let name = (saved.names && saved.names[id]) ? saved.names[id] : btn.find('span').text().trim();
                items.push({ id, name, icon: btn.find('svg').prop('outerHTML') });
            });
            if (saved.order) items.sort((a, b) => saved.order.indexOf(a.id) - saved.order.indexOf(b.id));
        };

        this.render = function() {
            const html = items.map(item => `
                <div class="menu-edit-list__item selector" data-id="${item.id}">
                    <div class="item__content">
                        <div class="item__icon">${item.icon}</div>
                        <div class="item__name">${item.name}</div>
                    </div>
                    <div class="item__actions">
                        <div class="action--btn action--up selector-item">⬆️</div>
                        <div class="action--btn action--down selector-item">⬇️</div>
                        <div class="action--btn action--edit selector-item">✎</div>
                    </div>
                </div>
            `).join(''); // items.map().join('') (найкращий варіант)
            
            $('.menu-edit-list').html(html);
            this.bindEvents();
        };

        this.bindEvents = function() {
            let container = $('.menu-edit-list');

            // Логіка переміщення Вгору (з фокусом та навігацією)
            container.find('.action--up').on('hover:enter', (e) => {
                let row = $(e.currentTarget).closest('.menu-edit-list__item');
                let prev = row.prev();
                if (prev.length > 0) {
                    row.insertBefore(prev);
                    this.syncArrayWithDOM();
                    Lampa.Controller.ready(); // Оновлюємо навігацію
                }
            });

            // Логіка редагування (через вікно введення Lampa)
            container.find('.action--edit').on('hover:enter', (e) => {
                let id = $(e.currentTarget).closest('.menu-edit-list__item').data('id');
                let item = items.find(i => i.id === id);
                Lampa.Input.edit({ title: 'Назва', value: item.name, free: true }, (new_name) => {
                    if (new_name) {
                        item.name = new_name;
                        this.render(); // Перемальовуємо (Варіант 2)
                    }
                });
            });
        };

        this.syncArrayWithDOM = function() {
            let newItems = [];
            $('.menu-edit-list__item').each(function() {
                let id = $(this).data('id');
                newItems.push(items.find(i => i.id === id));
            });
            items = newItems;
        };

        this.save = function() {
            let saveData = { names: {}, order: items.map(i => i.id) };
            items.forEach(i => saveData.names[i.id] = i.name);
            Lampa.Storage.set('custom_menu_settings', saveData);
        };
    }

    new ButtonEditor().init();
})();
