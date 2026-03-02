(function () {
    'use strict';

    // Ключі для сховища
    var KEY_SIZE = 'bubble_clock_size';
    var KEY_WIDTH = 'bubble_clock_scale';
    var KEY_RADIUS = 'bubble_clock_radius';

    function applyStyles() {
        var clock = $('#custom-bubble-clock');
        if (clock.length) {
            var size = Lampa.Storage.get(KEY_SIZE, '1.5');
            var scale = Lampa.Storage.get(KEY_WIDTH, '1.0');
            var radius = Lampa.Storage.get(KEY_RADIUS, '20');
            
            clock.css({
                'font-size': size + 'em',
                'transform': 'scaleX(' + scale + ')',
                'transform-origin': 'right center',
                'display': 'flex',
                'align-items': 'center'
            });
            clock.find('.clock-unit').css('border-radius', radius + 'px');
        }
    }

    function createClock() {
        if ($('#custom-bubble-clock').length) return;
        
        var head = $('.head__time');
        if (!head.length) return;

        var clock = $('<div id="custom-bubble-clock" style="font-weight:bold; margin-left:10px; z-index:100; pointer-events: none;">' +
            '<div class="clock-unit" style="color:#fff; background:rgba(255,255,255,0.25); padding:2px 10px; margin:0 2px;">00</div>' +
            '<div style="color:#ff9100; margin:0 2px;">:</div>' +
            '<div class="clock-unit" style="color:#ff9100; background:rgba(255,255,255,0.25); padding:2px 10px; margin:0 2px;">00</div>' +
        '</div>');

        head.replaceWith(clock);

        setInterval(function () {
            var now = new Date();
            clock.find('.clock-unit').eq(0).text(now.getHours().toString().padStart(2, '0'));
            clock.find('.clock-unit').eq(1).text(now.getMinutes().toString().padStart(2, '0'));
        }, 5000);

        applyStyles();
    }

    function init() {
        // Додаємо розділ у налаштування через офіційне API
        Lampa.Settings.add({
            title: 'Часи Bubble',
            component: 'bubble_clock_settings',
            icon: '<svg height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.1.8-1.2-4.5-2.7V7z"/></svg>',
            onRender: function (body) {
                var items = [
                    { title: 'Розмір шрифту', name: KEY_SIZE, default: '1.5' },
                    { title: 'Ширина (Scale)', name: KEY_WIDTH, default: '1.0' },
                    { title: 'Скругление (Bubble)', name: KEY_RADIUS, default: '20' }
                ];

                items.forEach(function (item) {
                    var value = Lampa.Storage.get(item.name, item.default);
                    var row = $('<div class="settings-param selector" style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid rgba(255,255,255,0.05);">' +
                        '<div class="settings-param__name">' + item.title + '</div>' +
                        '<div class="settings-param__value">' + value + '</div>' +
                    '</div>');

                    row.on('click', function () {
                        Lampa.Input.box(item.title, value, function (new_val) {
                            if (new_val) {
                                Lampa.Storage.set(item.name, new_val);
                                row.find('.settings-param__value').text(new_val);
                                applyStyles();
                            }
                        }, false, { type: 'number' });
                    });

                    body.append(row);
                });
            }
        });

        createClock();
    }

    // Очікування готовності Lampa
    var interval = setInterval(function () {
        if (window.Lampa && window.$) {
            clearInterval(interval);
            init();
        }
    }, 200);

})();
