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
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="background: #e67e22 !important; color: #fff !important; border-radius: 5px; margin-right: 5px;">' +
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
            // Отримуємо адресу з налаштувань. Якщо там jacred.xyz, ми її використаємо.
            var jackettUrl = Lampa.Storage.field('jackett_url') || 'https://jacred.xyz';
            var jackettKey = Lampa.Storage.field('jackett_key');

            Lampa.Noty.show('Шукаю 4K DV UA через JacRed...');

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            
            // JacRed зазвичай краще працює з простим пошуком
            var query = encodeURIComponent(title + ' ' + year + ' 2160p ukr');
            
            // Спрощений шлях для JacRed
            var url = jackettUrl + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;
            
            // Якщо адреса містить jacred.xyz, спробуємо також альтернативний метод пошуку
            if(jackettUrl.indexOf('jacred.xyz') >= 0) {
                // Використовуємо універсальний шлях пошуку
                url = jackettUrl.replace(/\/$/, '') + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;
            }

            Lampa.Network.native(url, function (json) {
                var results = json.Results || json; // JacRed може повернути масив відразу
                
                if (results && results.length > 0) {
                    // Фільтрація: 4K + UA
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
                        var sA = a.Size || a.size || 0;
                        var sB = b.Size || b.size || 0;
                        return sB - sA; 
                    });

                    if (filtered.length > 0) {
                        var best = filtered[0];
                        Lampa.Noty.show('Знайдено: ' + (best.Title || best.title).substring(0, 35) + '...');
                        this.play(best, movie);
                    } else {
                        Lampa.Noty.show('4K UA реліз не знайдено');
                    }
                } else {
                    Lampa.Noty.show('JacRed не повернув результатів');
                }
            }.bind(this), function () {
                Lampa.Noty.show('Помилка з\'єднання з JacRed');
            }, false, {dataType: 'json'});
        };

        this.play = function (torrent, movie) {
            var link = torrent.MagnetUri || torrent.Link || torrent.magnet || torrent.link;
            var title = movie.title + ' (4K DV UA)';

            if (window.Lampa.Torrserver) {
                Lampa.Torrserver.stream(link, {
                    title: title,
                    movie: movie
                });
            } else {
                var torrserver_url = Lampa.Storage.field('torrserver_url');
                if (torrserver_url) {
                    Lampa.Player.play({
                        url: torrserver_url + '/stream/?link=' + encodeURIComponent(link) + '&index=1&play=1',
                        title: title,
                        movie: movie
                    });
                } else {
                    Lampa.Noty.show('Налаштуйте TorrServer!');
                }
            }
        };
    }

    if (window.Lampa) {
        new Ukr4KPlugin().init();
    }
})();
