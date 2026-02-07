(function () {
    'use strict';

    // Допоміжна функція для безпечного використання Lampa та jQuery
    function Ukr4KPlugin() {
        this.init = function () {
            var self = this;
            
            // Очікуємо повного завантаження Lampa
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    var render = e.object.activity.render();
                    var container = render.find('.full-start-new__buttons, .full-start__buttons');
                    
                    if (container.length && !container.find('.open-4k-ukr').length && !e.data.movie.number_of_seasons) {
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="background: #e67e22 !important; color: #fff !important; border-radius: 5px; margin-right: 5px; display: flex; align-items: center; padding: 0 15px; height: 3em; cursor: pointer;">' +
                            '<span>4K DV UA</span>' +
                            '</div>');

                        btn.on('click', function () {
                            self.searchAndPlay(e.data.movie);
                        });

                        container.prepend(btn);
                        Lampa.Controller.collectionSet(container);
                    }
                }
            });
        };

        this.searchAndPlay = function (movie) {
            var jackettUrl = Lampa.Storage.field('jackett_url') || 'https://jacred.xyz';
            var jackettKey = Lampa.Storage.field('jackett_key') || '';

            Lampa.Noty.show('Шукаю 4K релізи...');

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            var query = encodeURIComponent(title + ' ' + year + ' 2160p ukr');
            
            // Стандартний шлях для JacRed/Jackett
            var url = jackettUrl.replace(/\/$/, '') + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;

            // Використовуємо нативний метод Lampa для мережевих запитів
            Lampa.Network.native(url, function (json) {
                var results = [];
                if (json && json.Results) results = json.Results;
                else if (Array.isArray(json)) results = json;

                if (results.length > 0) {
                    var filtered = results.filter(function (item) {
                        var t = (item.Title || item.title || '').toLowerCase();
                        var is4K = t.indexOf('2160') >= 0 || t.indexOf('4k') >= 0;
                        var isUA = t.indexOf('ukr') >= 0 || t.indexOf('укр') >= 0 || t.indexOf('ua') >= 0;
                        return is4K && isUA;
                    });

                    // Сортування: DV попереду, потім за розміром
                    filtered.sort(function(a, b) {
                        var tA = (a.Title || a.title || '').toLowerCase();
                        var tB = (b.Title || b.title || '').toLowerCase();
                        var aDV = /dv|vision|dovi/i.test(tA);
                        var bDV = /dv|vision|dovi/i.test(tB);
                        if (aDV && !bDV) return -1;
                        if (!aDV && bDV) return 1;
                        return (b.Size || b.size || 0) - (a.Size || a.size || 0);
                    });

                    if (filtered.length > 0) {
                        var best = filtered[0];
                        Lampa.Noty.show('Знайдено: ' + (best.Title || best.title).substring(0, 30));
                        this.play(best, movie);
                    } else {
                        Lampa.Noty.show('4K реліз з UA не знайдено');
                    }
                } else {
                    Lampa.Noty.show('JacRed: немає результатів');
                }
            }.bind(this), function () {
                Lampa.Noty.show('Помилка з\'єднання з JacRed');
            }, false, { 
                dataType: 'json',
                timeout: 10000 // 10 секунд на очікування
            });
        };

        this.play = function (torrent, movie) {
            var link = torrent.MagnetUri || torrent.Link || torrent.magnet || torrent.link;
            var title = movie.title + ' (4K DV UA)';

            if (window.Lampa.Torrserver) {
                Lampa.Torrserver.stream(link, { title: title, movie: movie });
            } else {
                var ts_url = Lampa.Storage.field('torrserver_url');
                if (ts_url) {
                    Lampa.Player.play({
                        url: ts_url + '/stream/?link=' + encodeURIComponent(link) + '&index=1&play=1',
                        title: title,
                        movie: movie
                    });
                } else {
                    Lampa.Noty.show('Налаштуйте TorrServer!');
                }
            }
        };
    }

    // Запуск плагіна
    if (window.Lampa) {
        var plugin = new Ukr4KPlugin();
        plugin.init();
    }
})();
