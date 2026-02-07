(function () {
    'use strict';

    function Ukr4KPlugin() {
        this.init = function () {
            var self = this;
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    var render = e.object.activity.render();
                    var container = render.find('.full-start-new__buttons, .full-start__buttons');
                    
                    if (container.length && !container.find('.open-4k-ukr').length && !e.data.movie.number_of_seasons) {
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="background: #e67e22 !important; color: #fff !important; border-radius: 5px; margin-right: 5px; display: flex; align-items: center; padding: 0 15px; height: 3em;">' +
                            '<span>4K DV UA (AUTO)</span>' +
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
            // Напряму прописуємо JacRed, якщо в налаштуваннях порожньо
            var jackettUrl = Lampa.Storage.field('jackett_url') || 'https://jacred.xyz';
            var jackettKey = Lampa.Storage.field('jackett_key') || '';

            Lampa.Noty.show('З’єднання з JacRed...');

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            
            // Формуємо пошуковий запит: Назва + Рік + 2160p + ukr
            var query = encodeURIComponent(title + ' ' + year + ' 2160p ukr');
            var url = jackettUrl.replace(/\/$/, '') + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;

            // Використовуємо Lampa.Network.native з додатковими параметрами
            Lampa.Network.native(url, function (json) {
                if (json && (json.Results || Array.isArray(json))) {
                    var results = json.Results || (Array.isArray(json) ? json : []);
                    this.processResults(results, movie);
                } else {
                    Lampa.Noty.show('JacRed: Нічого не знайдено');
                }
            }.bind(this), function (err) {
                console.log('JacRed Error:', err);
                Lampa.Noty.show('Помилка з\'єднання. Спробуйте змінити HTTP на HTTPS.');
            }.bind(this), false, {
                dataType: 'json',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
                }
            });
        };

        this.processResults = function (results, movie) {
            // Фільтруємо: Тільки 4K та Тільки Українська
            var filtered = results.filter(function (item) {
                var t = (item.Title || item.title || '').toLowerCase();
                var is4K = t.indexOf('2160') >= 0 || t.indexOf('4k') >= 0;
                var isUA = t.indexOf('ukr') >= 0 || t.indexOf('укр') >= 0 || t.indexOf('ua') >= 0 || t.indexOf('hurtom') >= 0;
                return is4K && isUA;
            });

            // Сортуємо: Пріоритет Dolby Vision, потім за найбільшим розміром
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
                Lampa.Noty.show('Запускаю: ' + (best.Title || best.title).substring(0, 30));
                this.play(best, movie);
            } else {
                Lampa.Noty.show('4K DV UA не знайдено в базі');
            }
        };

        this.play = function (torrent, movie) {
            var link = torrent.MagnetUri || torrent.Link || torrent.magnet || torrent.link;
            var ts_url = Lampa.Storage.field('torrserver_url');

            if (!ts_url) {
                Lampa.Noty.show('Налаштуйте TorrServer!');
                return;
            }

            // Формуємо посилання для автозапуску найбільшого файлу
            var playUrl = ts_url.replace(/\/$/, '') + '/stream/?link=' + encodeURIComponent(link) + '&index=1&play=1';
            
            Lampa.Player.play({
                url: playUrl,
                title: movie.title + ' (4K DV UA)',
                movie: movie
            });
        };
    }

    if (window.Lampa) {
        new Ukr4KPlugin().init();
    }
})();
