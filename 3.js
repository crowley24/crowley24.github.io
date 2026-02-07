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
            var jackettUrl = Lampa.Storage.field('jackett_url') || 'https://jacred.xyz';
            var jackettKey = Lampa.Storage.field('jackett_key') || '';

            Lampa.Noty.show('Шукаю найкращий 4K реліз...');

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            var query = encodeURIComponent(title + ' ' + year + ' 2160p ukr');
            
            var url = jackettUrl.replace(/\/$/, '') + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;

            // Використовуємо Lampa.Network для отримання списку
            Lampa.Network.native(url, function (json) {
                var results = json.Results || (Array.isArray(json) ? json : []);
                
                // Фільтруємо за якістю та мовою
                var filtered = results.filter(function (item) {
                    var t = (item.Title || item.title || '').toLowerCase();
                    return (t.indexOf('2160') >= 0 || t.indexOf('4k') >= 0) && 
                           (t.indexOf('ukr') >= 0 || t.indexOf('укр') >= 0 || t.indexOf('ua') >= 0);
                });

                // Сортуємо: DV + найбільший розмір
                filtered.sort(function(a, b) {
                    var aDV = /dv|vision|dovi/i.test((a.Title || a.title || '').toLowerCase());
                    var bDV = /dv|vision|dovi/i.test((b.Title || b.title || '').toLowerCase());
                    if (aDV && !bDV) return -1;
                    if (!aDV && bDV) return 1;
                    return (b.Size || b.size || 0) - (a.Size || a.size || 0);
                });

                if (filtered.length > 0) {
                    var best = filtered[0];
                    Lampa.Noty.show('Запускаю: ' + (best.Title || best.title).substring(0, 30));
                    this.sendToTorrServer(best, movie);
                } else {
                    Lampa.Noty.show('4K реліз не знайдено');
                }
            }.bind(this), function () {
                Lampa.Noty.show('Помилка пошуку через JacRed');
            }, false, { dataType: 'json' });
        };

        this.sendToTorrServer = function (torrent, movie) {
            var link = torrent.MagnetUri || torrent.Link || torrent.magnet || torrent.link;
            var torrserver_url = Lampa.Storage.field('torrserver_url');

            if (!torrserver_url) {
                Lampa.Noty.show('Налаштуйте TorrServer!');
                return;
            }

            // Формуємо прямий запит на TorrServer для автовибору першого відеофайлу
            // index=1 зазвичай є основним фільмом
            var playUrl = torrserver_url.replace(/\/$/, '') + '/stream/?link=' + encodeURIComponent(link) + '&index=1&play=1';
            
            // Якщо є авторизація на TorrServer, додаємо її
            var token = Lampa.Storage.field('torrserver_token');
            if (token) playUrl += '&authorization=' + encodeURIComponent('Bearer ' + token);

            // Викликаємо плеєр Lampa напряму
            Lampa.Player.play({
                url: playUrl,
                title: movie.title + ' (4K DV UA)',
                movie: movie,
                timeline: { hash: Lampa.Utils.hash(link) }
            });

            // Закриваємо всі модальні вікна, якщо вони були відкриті
            Lampa.Modal.close();
        };
    }

    if (window.Lampa) {
        new Ukr4KPlugin().init();
    }
})();
