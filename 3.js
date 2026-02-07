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
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="background: #e67e22 !important; color: #fff !important; border-radius: 5px; margin-right: 5px; display: flex; align-items: center; padding: 0 15px;">' +
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
            var jackettKey = Lampa.Storage.field('jackett_key');

            Lampa.Noty.show('Шукаю через JacRed (Proxy)...');

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            var query = encodeURIComponent(title + ' ' + year + ' 2160p ukr');
            
            // Формуємо URL
            var url = jackettUrl.replace(/\/$/, '') + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;

            // ВИКОРИСТОВУЄМО LAMPA.INVOCATION (це змушує запит йти через системні методи Lampa)
            Lampa.Invocation.native({
                method: 'GET',
                url: url
            }, function (json) {
                // Перевіряємо різні варіанти відповіді JacRed
                var results = json.Results || json;
                
                if (results && results.length > 0) {
                    var filtered = results.filter(function (item) {
                        var t = (item.Title || item.title || '').toLowerCase();
                        var is4K = t.includes('2160') || t.includes('4k') || t.includes('uhd');
                        var isUA = t.includes('ukr') || t.includes('укр') || t.includes('ua') || t.includes('hurtom') || t.includes('toloka');
                        return is4K && isUA;
                    });

                    // Пріоритет Dolby Vision
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
                        Lampa.Noty.show('Знайдено 4K UA!');
                        this.play(best, movie);
                    } else {
                        Lampa.Noty.show('4K UA не знайдено');
                    }
                } else {
                    Lampa.Noty.show('JacRed не повернув даних');
                }
            }.bind(this), function () {
                // Якщо Invocation не спрацював, пробуємо останній шанс - звичайний AJAX через проксі
                $.ajax({
                    url: 'https://cors-anywhere.herokuapp.com/' + url, // Це публічний проксі для тесту
                    method: 'GET',
                    success: function(res) {
                        Lampa.Noty.show('Знайдено через резервний шлях');
                        // Логіка обробки тут така ж...
                    },
                    error: function() {
                        Lampa.Noty.show('Помилка: JacRed блокує зовнішні запити');
                    }
                });
            }.bind(this));
        };

        this.play = function (torrent, movie) {
            var link = torrent.MagnetUri || torrent.Link || torrent.magnet || torrent.link;
            var title = movie.title + ' (4K DV UA)';

            if (window.Lampa.Torrserver) {
                Lampa.Torrserver.stream(link, { title: title, movie: movie });
            } else {
                var ts_url = Lampa.Storage.field('torrserver_url');
                Lampa.Player.play({
                    url: ts_url + '/stream/?link=' + encodeURIComponent(link) + '&index=1&play=1',
                    title: title,
                    movie: movie
                });
            }
        };
    }

    if (window.Lampa) {
        new Ukr4KPlugin().init();
    }
})();
