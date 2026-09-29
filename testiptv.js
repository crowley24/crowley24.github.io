(function () {
    'use strict';

    if (window.plugin_m3u_installed) return;
    window.plugin_m3u_installed = true;

    Lampa.Component.add('iptv_m3u', function (object) {
        let scroll = new Lampa.Scroll({ items: { offset: 5 } });
        let files  = $('<div class="iptv-list"></div>');
        
        scroll.append(files);

        this.create = function () {
            let url = Lampa.Storage.get('iptv_m3u_url', '');

            if (!url) {
                Lampa.Noty.show('Вкажіть посилання на M3U в налаштуваннях');
                Lampa.Input.edit({
                    title: 'Посилання на M3U плейлист',
                    value: '',
                    free: true,
                    nosave: true
                }, (new_val) => {
                    if (new_val) {
                        Lampa.Storage.set('iptv_m3u_url', new_val);
                        Lampa.Activity.replace({
                            url: '',
                            component: 'iptv_m3u',
                            title: 'IPTV M3U'
                        });
                    }
                });
                return;
            }

            this.activity.loader(true);

            $.get(url, (data) => {
                let items = parseM3U(data);
                this.activity.loader(false);

                if (items.length === 0) {
                    Lampa.Noty.show('Плейлист порожній або має невірний формат');
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

                files.append(cards);
                scroll.update();
            }).fail(() => {
                this.activity.loader(false);
                Lampa.Noty.show('Помилка завантаження плейлиста');
            });
        };

        this.render = function () {
            return scroll.render();
        };

        this.destroy = function () {
            scroll.destroy();
            files.remove();
        };
    });

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
                    currentItem.title = info.substring(commaIdx + 1).trv();
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
                    title: 'IPTV M3U'
                });
            });

            let target_menu = $('.menu .menu__list');
            if (target_menu.length) {
                target_menu.append(menu_item);
            }
        }
    });

})(window, jQuery);
