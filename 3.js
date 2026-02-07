(function () {
    'use strict';

    function Ukr4KPlugin() {
        this.init = function () {
            var self = this;
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    var render = e.object.activity.render();
                    var container = render.find('.full-start-new__buttons, .full-start__buttons');
                    
                    // Не додаємо кнопку, якщо це серіал (для серіалів потрібна інша логіка папок)
                    if (container.length && !container.find('.open-4k-ukr').length && !e.data.movie.number_of_seasons) {
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="background: #e67e22 !important; color: #fff !important;">' +
                            '<svg width="16" height="16" viewBox="0 0 16 16" fill="white" style="margin-right:8px;vertical-align:middle;"><path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm2.372 3.715.435-.714h1.71v3.93h.733v.957h-.733V11H5.405V9.888H2.5v-.971c.574-1.077 1.225-2.142 1.872-3.202m7.73-.714h1.306l-2.14 2.584L13.5 11h-1.428l-1.679-2.624-.615.7V11H8.59V5.001h1.187v2.686h.057L12.102 5z"/></svg>' +
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
            Lampa.Noty.show('Шукаю найкращий 4K DV (UA)...');

            var jackettUrl = Lampa.Storage.field('jackett_url');
            var jackettKey = Lampa.Storage.field('jackett_key');

            if (!jackettUrl) {
                Lampa.Noty.show('Вкажіть Jackett URL у налаштуваннях');
                return;
            }

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            
            // Спеціальний фільтр: назва + рік + якість + мова
            var query = encodeURIComponent(title + ' ' + year + ' 2160p ukr');
            var url = jackettUrl + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;

            var network = new Lampa.Reguest();
            network.silent(url, function (json) {
                var results = json.Results || [];

                // Глибока фільтрація: обов'язково 4K + Dolby Vision (або хоча б HDR) + UKR
                var filtered = results.filter(function (item) {
                    var t = item.Title.toLowerCase();
                    var is4K = t.includes('2160p') || t.includes('4k') || t.includes('uhd');
                    var isDV = t.includes('dv') || t.includes('vision') || t.includes('dovi');
                    var isUA = t.includes('ukr') || t.includes('укр') || t.includes('ua') || t.includes('hurtom') || t.includes('toloka');
                    return is4K && isUA;
                });

                // Пріоритет: спочатку ті, де є Dolby Vision
                filtered.sort(function(a, b) {
                    var aDV = /dv|vision|dovi/i.test(a.Title);
                    var bDV = /dv|vision|dovi/i.test(b.Title);
                    if (aDV && !bDV) return -1;
                    if (!aDV && bDV) return 1;
                    return b.Size - a.Size; // Якщо обидва DV, беремо більший за розміром
                });

                if (filtered.length > 0) {
                    var best = filtered[0];
                    Lampa.Noty.show('Знайдено: ' + (best.Title.substring(0, 40) + '...'));
                    this.sendToTorrServer(best, movie);
                } else {
                    Lampa.Noty.show('4K UA реліз не знайдено');
                }
            }.bind(this), function () {
                Lampa.Noty.show('Помилка запиту до Jackett');
            });
        };

        this.sendToTorrServer = function (torrent, movie) {
            var torrserver = Lampa.Storage.field('torrserver_url');
            if (!torrserver) {
                Lampa.Noty.show('TorrServer не налаштовано');
                return;
            }

            var link = torrent.MagnetUri || torrent.Link;
            var title = movie.title + ' (4K DV UA)';

            Lampa.Noty.show('Додаю до TorrServer...');

            // Використовуємо стандартний запуск через TorrServer у Lampa
            var player_data = {
                url: link,
                title: title,
                movie: movie,
                intent: 'play'
            };

            // Перевіряємо, чи є TorrServer плагін для обробки
            if (Lampa.Torrserver) {
                Lampa.Torrserver.stream(link, {
                    title: title,
                    movie: movie
                });
            } else {
                // Прямий запуск через плеєр, якщо немає спец. модуля
                Lampa.Player.play({
                    url: torrserver + '/stream/?link=' + encodeURIComponent(link) + '&index=1&play=1',
                    title: title
                });
            }
        };
    }

    if (window.Lampa) {
        new Ukr4KPlugin().init();
    }
})();
