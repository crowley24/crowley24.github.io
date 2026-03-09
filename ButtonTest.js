(function () {
    'use strict';

    function ButtonEditor() {
        var items = [];
        var _this = this;

        this.init = function() {
            // Додаємо стилі (ES5 style)
            Lampa.Template.add('button_editor_style', 
                '<style>' +
                    '.menu-edit-list { padding: 10px; }' +
                    '.menu-edit-list__item {' +
                        'display: flex; align-items: center; justify-content: space-between;' +
                        'background: rgba(255,255,255,0.05); margin-bottom: 10px;' +
                        'padding: 12px; border-radius: 10px; transition: all 0.2s;' +
                    '}' +
                    '.menu-edit-list__item.focus { background: rgba(255,255,255,0.15); border: 2px solid #fff; }' +
                    '.item__content { display: flex; align-items: center; pointer-events: none; }' +
                    '.item__icon { width: 24px; height: 24px; margin-right: 15px; fill: #fff; }' +
                    '.item__name { font-size: 1.2rem; color: #fff; }' +
                    '.item__actions { display: flex; gap: 15px; }' +
                    '.action--btn { cursor: pointer; padding: 5px; opacity: 0.6; font-size: 1.4rem; }' +
                    '.action--btn.focus { opacity: 1; transform: scale(1.2); color: #ffeb3b; }' +
                '</style>'
            );

            Lampa.Listener.follow('full', function(e) {
                if (e.type === 'complete' || e.type === 'complite') {
                    setTimeout(function() {
                        _this.addButton();
                    }, 200);
                }
            });
        };

        this.addButton = function() {
            if ($('.button--editor').length > 0) return;

            var btn = $('<div class="full-start__button selector button--editor"><span>Button Editor</span></div>');
            
            btn.on('hover:enter', function() {
                _this.open();
            });

            $('.full-start__buttons').append(btn);
            Lampa.Controller.ready();
        };

        this.open = function() {
            this.collectData();
            Lampa.Modal.open({
                title: 'Редактор кнопок',
                html: '<div class="menu-edit-list"></div>',
                onBack: function() {
                    _this.save();
                    Lampa.Modal.close();
                    window.location.reload();
                }
            });
            this.render();
        };

        this.collectData = function() {
            var saved = Lampa.Storage.get('custom_menu_settings', '{}');
            if (typeof saved === 'string') saved = JSON.parse(saved);
            items = [];
            
            $('.full-start__buttons .full-start__button').each(function() {
                var btn = $(this);
                if (btn.hasClass('button--editor')) return;

                var id = btn.attr('class').split(/\s+/).filter(function(c) {
                    return c.indexOf('--') !== -1;
                })[0] || 'custom-' + Math.random();
                
                var name = (saved.names && saved.names[id]) ? saved.names[id] : btn.find('span').text().trim();
                var icon = btn.find('svg').length ? btn.find('svg').prop('outerHTML') : '';

                items.push({ id: id, name: name, icon: icon });
            });

            if (saved.order) {
                items.sort(function(a, b) {
                    return saved.order.indexOf(a.id) - saved.order.indexOf(b.id);
                });
            }
        };

        this.render = function() {
            var html = '';
            items.forEach(function(item) {
                html += '<div class="menu-edit-list__item selector" data-id="' + item.id + '">' +
                            '<div class="item__content">' +
                                '<div class="item__icon">' + item.icon + '</div>' +
                                '<div class="item__name">' + item.name + '</div>' +
                            '</div>' +
                            '<div class="item__actions">' +
                                '<div class="action--btn action--up selector-item">⬆️</div>' +
                                '<div class="action--btn action--down selector-item">⬇️</div>' +
                                '<div class="action--btn action--edit selector-item">✎</div>' +
                            '</div>' +
                        '</div>';
            });
            
            $('.menu-edit-list').html(html);
            this.bindEvents();
            Lampa.Controller.ready();
        };

        this.bindEvents = function() {
            var container = $('.menu-edit-list');

            container.find('.action--up').on('hover:enter', function(e) {
                var row = $(e.currentTarget).closest('.menu-edit-list__item');
                var prev = row.prev();
                if (prev.length > 0) {
                    row.insertBefore(prev);
                    _this.syncArrayWithDOM();
                    Lampa.Controller.ready();
                }
            });

            container.find('.action--down').on('hover:enter', function(e) {
                var row = $(e.currentTarget).closest('.menu-edit-list__item');
                var next = row.next();
                if (next.length > 0) {
                    row.insertAfter(next);
                    _this.syncArrayWithDOM();
                    Lampa.Controller.ready();
                }
            });

            container.find('.action--edit').on('hover:enter', function(e) {
                var id = $(e.currentTarget).closest('.menu-edit-list__item').data('id');
                var item = items.filter(function(i) { return i.id === id; })[0];
                Lampa.Input.edit({ title: 'Назва', value: item.name, free: true }, function(new_name) {
                    if (new_name) {
                        item.name = new_name;
                        _this.render();
                    }
                });
            });
        };

        this.syncArrayWithDOM = function() {
            var newItems = [];
            $('.menu-edit-list__item').each(function() {
                var id = $(this).data('id');
                var found = items.filter(function(i) { return i.id === id; })[0];
                if (found) newItems.push(found);
            });
            items = newItems;
        };

        this.save = function() {
            var saveData = { names: {}, order: [] };
            items.forEach(function(i) {
                saveData.names[i.id] = i.name;
                saveData.order.push(i.id);
            });
            Lampa.Storage.set('custom_menu_settings', JSON.stringify(saveData));
        };
    }

    function checkLampa() {
        if (typeof Lampa !== 'undefined' && typeof $ !== 'undefined') {
            if (!window.button_editor_initialized) {
                window.button_editor_initialized = true;
                new ButtonEditor().init();
            }
        } else {
            setTimeout(checkLampa, 500);
        }
    }

    checkLampa();
})();
