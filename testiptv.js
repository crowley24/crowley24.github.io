(function () {
    'use strict';

    if (window.plugin_m3u_installed) return;
    window.plugin_m3u_installed = true;

    // Реєструємо компонент сторінки IPTV
    Lampa.Component.add('iptv_m3u', function (object) {
        let browser = new Lampa.Explorer(object);

        browser.create = function () {
            this.activity.loader(true);

            let url = Lampa.Storage.get('iptv_m3u_url', '');

            if (!url) {
                this.activity.loader(false);
                Lampa.Noty.show('Будь ласка, вкажіть посилання на M3U в налаштуваннях');
                
                // Відкриваємо модальне вікно для введення посилання
                Lampa.Input.edit({
                    title: 'Посилання на M3U плейлист',
                    value: '',
                    free: true,
                    nosave: true
                }, (new_val) => {
                    if (new_val) {
                        Lampa.Storage.set('iptv_m3u_url', new_val);
                        // Перезапускаємо активність коректно через Lampa.Activity.replace
                        Lampa.Activity.replace({
                            url: '',
                            component: 'iptv_m3u',
                            title: 'IPTV M3U',
                            page: 1
                        });
                    }
                });
                return;
            }

            // Завантажуємо плейлист
            $.get(url, (data) => {
                let items = parseM3U(data);
                
                if (items.length === 0) {
                    Lampa.Noty.show('Плейлист порожній або має невірний формат');
                    this.activity.loader(false);
                    return;
                }

                let cards = items.map(elem => {
                    let card = Lampa.Template.get('card', {
                        title: elem.title,
                        release_year: 'IPTV'
                    });

                    if (elem.img) {
                        card.find('.card__img').attr('src', elem.img);
                    }

                    card.on('hover:enter', () => {
                        Lampa.Player.play({
                            url: elem.url,
                            title: elem.title,
                            poster: elem.img
                        });
                    });

                    return card;
                });

                browser.append(cards);
                this.activity.loader(false);
            }).fail(() => {
                Lampa.Noty.show('Помилка завантаження плейлиста');
                this.activity.loader(false);
            });
        };

        return browser;
    });

    // Простий парсер M3U
    function parseM3U(data) {
        let lines = data.split('\n');
        let items = [];
        let currentItem = {};

        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('#EXTINF:')) {
                currentItem = {};
                let info = line.substring(8);
                let commaIdx = info.lastIndexOf(',');
                if (commaIdx !== -1) {
                    currentItem.title = info.substring(commaIdx + 1).trim();
                }
                let logoMatch = info.match(/tvg-logo="([^"]*)"/);
                if (logoMatch) {
                    currentItem.img = logoMatch[1];
                }
            } else if (line && !line.startsWith('#')) {
                currentItem.url = line;
                if (currentItem.title && currentItem.url) {
                    items.push({
                        title: currentItem.title,
                        url: currentItem.url,
                        img: currentItem.img || ''
                    });
                }
                currentItem = {};
            }
        });

        return items;
    }

    // Додаємо кнопку в головне меню Лампи, коли інтерфейс готовий
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            let menu_item = $(`
                <li class="menu__item selector" data-action="iptv">
                    <div class="menu__ico">
                        <svg height="24" viewBox="0 0 24 24" width="24" fill="currentColor">
                            <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/>
                        </svg>
                    </div>
                    <div class="menu__text">IPTV</div>
                </li>
            `);

            menu_item.on('hover:enter', () => {
                Lampa.Activity.push({
                    url: '',
                    component: 'iptv_m3u',
                    title: 'IPTV M3U',
                    page: 1
                });
            });

            let target_menu = $('.menu .menu__list');
            if (target_menu.length) {
                target_menu.append(menu_item);
            }
        }
    });

})(window, jQuery);
