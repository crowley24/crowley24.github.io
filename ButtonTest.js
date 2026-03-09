(function () {
    'use strict';

    function ButtonEditor(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div></div>');
        var _this = this;

        this.create = function() {
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

            var list = $('<div class="menu-edit-list"></div>');
            items.forEach(function(item) {
                var row = $('<div class="menu-edit-list__item selector" data-id="' + item.id + '">' +
                                '<div class="item__content">' +
                                    '<div class="item__icon">' + item.icon + '</div>' +
                                    '<div class="item__name">' + item.name + '</div>' +
                                '</div>' +
                                '<div class="item__actions">' +
                                    '<div class="action--btn action--up selector-item">⬆️</div>' +
                                    '<div class="action--btn action--down selector-item">⬇️</div>' +
                                    '<div class="action--btn action--edit selector-item">✎</div>' +
                                '</div>' +
                            '</div>');
                
                row.find('.action--up').on('hover:enter', function() {
                    var current = $(this).closest('.menu-edit-list__item');
                    var prev = current.prev();
                    if (prev.length) {
                        current.insertBefore(prev);
                        _this.save();
                    }
                });

                row.find('.action--edit').on('hover:enter', function() {
                    Lampa.Input.edit({ title: 'Назва', value: item.name, free: true }, function(new_name) {
                        if (new_name) {
                            item.name = new_name;
                            Lampa.Modal.close();
                            _this.save();
                            Lampa.Component.add('button_editor'); // Перемальовуємо
                        }
                    });
                });

                list.append(row);
            });

            html.append(list);
        };

        this.save = function() {
            var rows = html.find('.menu-edit-list__item');
            var saveData = { names: {}, order: [] };
            rows.each(function() {
                var id = $(this).data('id');
                var name = $(this).find('.item__name').text();
                saveData.order.push(id);
                saveData.names[id] = name;
            });
            Lampa.Storage.set('custom_menu_settings', JSON.stringify(saveData));
        };

        this.render = function() {
            return html;
        };
    }

    // Додаємо стилі один раз
    if (!$('#button_editor_style').length) {
        $('body').append('<style id="button_editor_style">' +
            '.menu-edit-list__item { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); margin-bottom: 10px; padding: 12px; border-radius: 10px; }' +
            '.menu-edit-list__item.focus { background: rgba(255,255,255,0.15); border: 2px solid #fff; }' +
            '.item__icon { width: 24px; height: 24px; margin-right: 15px; fill: #fff; }' +
            '.action--btn { cursor: pointer; padding: 5px; opacity: 0.6; }' +
            '.action--btn.focus { opacity: 1; color: #ffeb3b; }' +
        '</style>');
    }

    // Реєстрація плагіна в Lampa
    Lampa.Component.add('button_editor', ButtonEditor);

    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'complete') {
            var btn = $('<div class="full-start__button selector button--editor"><span>Button Editor</span></div>');
            btn.on('hover:enter', function () {
                Lampa.Component.add('button_editor');
                Lampa.Modal.open({
                    title: 'Редактор кнопок',
                    html: Lampa.Component.get('button_editor').render(),
                    onBack: function() {
                        Lampa.Modal.close();
                        window.location.reload();
                    }
                });
            });
            $('.full-start__buttons').append(btn);
        }
    });
})();
