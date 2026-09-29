(function () {
    'use strict';

    // Перевірка, чи Лампа завантажена
    if (window.plugin_m3u_iptv) return;
    window.plugin_m3u_iptv = true;

    function M3UPlugin() {
        let playlists = [];

        // Ініціалізація плагіна в інтерфейсі Лампи
        this.init = function () {
            // Додаємо пункт в головне меню (розділ "Головна" або налаштування)
            Lampa.Listener.follow('full', (e) => {
                if (e.type == 'complite') {
                    // Можна додати кнопку або інтегрувати в розділ джерел
                }
            });

            // Реєструємо нову вкладку в меню налаштувань або як окремий розділ
            console.log('IPTV M3U Plugin завантажено успішно');
        };

        // Парсер M3U формату
        this.parseM3U = function (data) {
            let lines = data.split('\n');
            let items = [];
            let currentItem = {};

            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('#EXTINF:')) {
                    currentItem = {};
                    let info = line.substring(8);
                    
                    // Витягуємо назву каналу (після останньої коми)
                    let commaIdx = info.lastIndexOf(',');
                    if (commaIdx !== -1) {
                        currentItem.title = info.substring(commaIdx + 1).trim();
                    }
                    
                    // Витягуємо логотип (tvg-logo) якщо є
                    let logoMatch = info.match(/tvg-logo="([^"]*)"/);
                    if (logoMatch) {
                        currentItem.img = logoMatch[1];
                    }
                } else if (line && !line.startsWith('#')) {
                    // Це посилання на стрім
                    currentItem.url = line;
                    if (currentItem.title && currentItem.url) {
                        items.push({
                            title: currentItem.title,
                            url: currentItem.url,
                            img: currentItem.img || '',
                            source: 'm3u_iptv'
                        });
                    }
                    currentItem = {};
                }
            });

            return items;
        };

        // Відтворення потоку
        this.play = function (item) {
            let player_url = item.url;
            
            Lampa.Player.play({
                url: player_url,
                title: item.title,
                poster: item.img
            });
        };
    }

    let iptv = new M3UPlugin();
    iptv.init();

    // Додаємо іконку або розділ у головне меню Лампи
    Lampa.Component.add('iptv_m3u', function (object) {
        let browser = new Lampa.Explorer(object);
        
        browser.create = function () {
            this.activity.loader(true);
            
            // Приклад завантаження плейлиста за прямим посиланням
            let playlist_url = Lampa.Storage.get('iptv_m3u_link', '');
            
            if (!playlist_url) {
                let html = $('<div><div class="settings-param">Введіть посилання на M3U плейлист у налаштуваннях плагіна</div></div>');
                this.timeHtml(html);
                this.activity.loader(false);
                return;
            }

            $.get(playlist_url, (data) => {
                let items = iptv.parseM3U(data);
                
                let cards = items.map(elem => {
                    let card = Lampa.Template.get('card', {
                        title: elem.title,
                        release_year: ''
                    });
                    
                    if (elem.img) {
                        card.find('.card__img').attr('src', elem.img);
                    }

                    card.on('hover:enter', () => {
                        iptv.play(elem);
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

    // Додаємо кнопку в інтерфейс (наприклад, у меню плагінів або розширені параметри)
    // Користувач зможе відкрити його через виклик компонента 'iptv_m3u'

})(window, jQuery);
