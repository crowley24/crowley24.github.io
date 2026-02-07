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
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="background: #e67e22 !important; color: #fff !important; border-radius: 5px; margin-right: 5px; display: flex; align-items: center; padding: 0 15px; height: 3em; font-weight: bold;">' +
                            '<span>4K UHD UA</span>' +
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

            Lampa.Noty.show('Зчитую базу торрентів...');

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            
            // Запит робимо максимально широким, щоб JacRed не обрізав результати сам
            var query = encodeURIComponent(title + ' ' + year + ' 2160p');
            var url = jackettUrl.replace(/\/$/, '') + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;

            Lampa.Network.native(url, function (json) {
                var results = json.Results || (Array.isArray(json) ? json : []);
                
                // Регулярні вирази для пошуку
                var regUKR = /ukr|укр|ua|hurtom|toloka/i;
                var reg4K = /2160|4k|uhd/i;
                var regDV = /dv|vision|dovi/i;

                var filtered = results.filter(function (item) {
                    var t = (item.Title || item.title || '').toLowerCase();
                    if (!t) return false;
                    
                    // Перевіряємо наявність UA та 4K одночасно
                    return regUKR.test(t) && reg4K.test(t);
                });

                if (filtered.length > 0) {
                    // Сортуємо: спочатку Dolby Vision, потім за розміром
                    filtered.sort(function(a, b) {
                        var tA = (a.Title || a.title || '').toLowerCase();
                        var tB = (b.Title || b.title || '').toLowerCase();
                        
                        var aDV = regDV.test(tA);
                        var bDV = regDV.test(tB);

                        if (aDV && !bDV) return -1;
                        if (!aDV && bDV) return 1;
                        return (b.Size || b.size || 0) - (a.Size || a.size || 0);
                    });

                    var best = filtered[0];
                    Lampa.Noty.show('Знайдено UA реліз. Запускаю...');
                    this.play(best, movie);
                } else {
                    Lampa.Noty.show('В 4K знайдено лише іноземні релізи');
                }
            }.bind(this), function () {
                Lampa.Noty.show('Помилка JacRed. Перевірте з\'єднання.');
            }, false, { dataType: 'json' });
        };

        this.play = function (torrent, movie) {
            var link = torrent.MagnetUri || torrent.Link || torrent.magnet || torrent.link;
            var ts_url = Lampa.Storage.field('torrserver_url');

            if (!ts_url) {
                Lampa.Noty.show('Налаштуйте TorrServer!');
                return;
            }

            // Прямий запуск першого відеофайлу
            var playUrl = ts_url.replace(/\/$/, '') + '/stream/?link=' + encodeURIComponent(link) + '&index=1&play=1';
            
            Lampa.Player.play({
                url: playUrl,
                title: movie.title + ' (4K UA)',
                movie: movie
            });
        };
    }

    if (window.Lampa) {
        new Ukr4KPlugin().init();
    }
})();
