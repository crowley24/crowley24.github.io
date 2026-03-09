(function () {
    'use strict';

    function ButtonEditor() {
        let items = [];

        // 1. Ініціалізація: додаємо стилі та кнопку в інтерфейс
        this.init = function() {
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
                    .item__actions { display: flex; gap: 15px; }
                    .action--btn { cursor: pointer; padding: 5px; opacity: 0.6; }
                    .action--btn.focus { opacity: 1; transform: scale(1.2); }
                </style>
            `);

            Lampa.Listener.follow('full', (e) => {
                if (e.type == 'complite') this.addButton();
            });
        };

        this.addButton = function() {
            let btn = $('<div class="full-start__button selector button--editor"><span>Button Editor</span></div>');
            btn.on('hover:enter', () => this.open());
            $('.full-start__buttons').append(btn);
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

        // ... тут будуть методи collectData, render та bindEvents ...
    }

    new ButtonEditor().init();
})();
