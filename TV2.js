(function () {
    'use strict';

    function EPGPlugin(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true
        });
        var items = [];
        var html = $('<div></div>');
        var active = 0;

        // Створюємо інтерфейс сторінки
        this.create = function () {
            var _this = this;
            
            // Додаємо заголовок або індикатор завантаження
            html.append('<div class="epg-list" style="padding: 20px;">Завантаження телепрограми...</div>');
            
            // Логіка завантаження та парсингу epg.xml.gz
            // Примітка: Прямий парсинг великих XML у Lampa може гальмувати TV.
            // Краще використовувати проміжний сервер, але ось базовий запит:
            network.silent('https://iptvx.one/epg/epg.xml.gz', function (str) {
                _this.build(str);
            }, function () {
                Lampa.Noty.show('Помилка завантаження EPG');
            }, false, {
                dataType: 'text'
            });

            return scroll.render();
        };

        // Побудова списку каналів та передач
        this.build = function (data) {
            html.empty();
            html.append('<div style="padding: 20px;"><h3>Телепрограма</h3><p>Для повноцінного відображення потрібен парсер XMLTV.</p></div>');
            
            // Тут має бути логіка розпакування GZ та циклу по каналах
            // Оскільки Lampa працює на JS, рекомендується використовувати готові методи Lampa.Template
            
            scroll.append(html);
        };

        this.render = function () {
            return html;
        };

        this.pause = function () {};

        this.stop = function () {};
    }

    // Реєстрація плагіна в системі Lampa
    function startPlugin() {
        window.plugin_epg_ready = true;

        // Додаємо пункт у ліве меню
        Lampa.Component.add('epg_component', EPGPlugin);

        var menu_item = {
            title: 'Телепрограма',
            id: 'epg_section',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17 8H7v2h10V8zm0 4H7v2h10v-2zm-4 4H7v2h6v-2z" fill="white"/></svg>',
            onSelect: function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Телепрограма',
                    component: 'epg_component',
                    page: 1
                });
            }
        };

        // Вставляємо пункт після "ТБ" або "Фільми"
        Lampa.Menu.add(menu_item);
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') startPlugin();
        });
    }
})();
