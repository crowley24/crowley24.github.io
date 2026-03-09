/* jshint esversion: 6 */
/* global Lampa, $ */

(function () {
    'use strict';

    function ButtonEditor() {
        let items = [];

        this.init = function() {
            // Додаємо стилі в систему
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

            // Слухаємо подію відкриття картки
            Lampa.Listener.follow('full', (e) => {
                // Перевіряємо обидва варіанти написання події для надійності
                if (e.type == 'complete' || e.type == 'complite') {
                    // Невелика затримка, щоб DOM встиг сформуватися
                    setTimeout(() => {
                        this.addButton();
                    }, 100);
                }
            });
        };

        this.addButton = function() {
            if ($('.button--editor').length > 0) return; // Запобігаємо дублюванню

            let btn = $('<div class="full-start__button selector button--editor"><span>Button Editor</span></div>');
            
            btn.on('hover:enter', () => {
                this.open();
            });

            $('.full-start__buttons').append(btn);
            
            // Оновлюємо навігацію, щоб Lampa "побачила" нову кнопку
            Lampa.Controller.ready();
        };

        this.open = function() {
            this.collectData();
            Lampa.Modal.open({
                title: 'Редактор кнопок',
                html: '<div class="menu-edit-list"></div>',
                onBack: () => {
                    this.save();
                    Lampa.Modal.close();
                    window.location.reload();
                }
            });
            this.render();
        };

        this.collectData = function() {
            let saved = Lampa.Storage.get('custom_menu_settings', '{}');
            items = [];
            
            $('.full-start__buttons .full-start__button').each(function() {
                let btn = $(this);
                if (btn.hasClass('button--editor')) return;

                let id = btn.attr('class').split(/\s+/).find(c => c.includes('--')) || 'custom-' + Math.random();
                let name = (saved.names && saved.names[id]) ? saved.names[id] : btn.find('span').text().trim();
                let icon = btn.find('svg').length ? btn.find('svg').prop('outerHTML') : '';

                items.push({ id, name, icon });
            });

            if (saved.order) {
                items.sort((a, b) => saved.order.indexOf(a.id) - saved.order.indexOf(b.id));
            }
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
            `).join('');
            
            $('.menu-edit-list').html(html);
            this.bindEvents();
            Lampa.Controller.ready();
        };

        this.bindEvents = function() {
            let container = $('.menu-edit-list');

            container.find('.action--up').on('hover:enter', (e) => {
                let row = $(e.currentTarget).closest('.menu-edit-list__item');
                let prev = row.prev();
                if (prev.length > 0) {
                    row.insertBefore(prev);
                    this.syncArrayWithDOM();
                    Lampa.Controller.ready();
                }
            });

            container.find('.action--down').on('hover:enter', (e) => {
                let row = $(e.currentTarget).closest('.menu-edit-list__item');
                let next = row.next();
                if (next.length > 0) {
                    row.insertAfter(next);
                    this.syncArrayWithDOM();
                    Lampa.Controller.ready();
                }
            });

            container.find('.action--edit').on('hover:enter', (e) => {
                let id = $(e.currentTarget).closest('.menu-edit-list__item').data('id');
                let item = items.find(i => i.id === id);
                Lampa.Input.edit({ title: 'Назва', value: item.name, free: true }, (new_name) => {
                    if (new_name) {
                        item.name = new_name;
                        this.render();
                    }
                });
            });
        };

        this.syncArrayWithDOM = function() {
            let newItems = [];
            $('.menu-edit-list__item').each(function() {
                let id = $(this).data('id');
                let found = items.find(i => i.id === id);
                if (found) newItems.push(found);
            });
            items = newItems;
        };

        this.save = function() {
            let saveData = {
                names: {},
                order: items.map(i => i.id)
            };
            items.forEach(i => {
                saveData.names[i.id] = i.name;
            });
            Lampa.Storage.set('custom_menu_settings', saveData);
        };
    }

    // Запуск плагіна
    if (!window.button_editor_initialized) {
        window.button_editor_initialized = true;
        new ButtonEditor().init();
    }
})();
