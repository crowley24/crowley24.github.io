(function () {
    'use strict';

    function Ukr4KPlugin() {
        this.init = function () {
            var self = this;
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    var render = e.object.activity.render();
                    var container = render.find('.full-start-new__buttons, .full-start__buttons');
                    
                    // Тільки для фільмів (не серіалів)
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
            var jackettUrl = Lampa.Storage.field('jackett_url');
            var jackettKey = Lampa.Storage.field('jackett_key');

            if (!jackettUrl) {
                Lampa.Noty.show('Налаштуйте Jackett в Lampa!');
                return;
            }

            Lampa.Noty.show('Шукаю 4K DV UA...');

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            
            // Формуємо URL. Додаємо 2160p та ukr для точності
            var query = encodeURIComponent(title + ' ' + year + ' 2160p ukr');
            var url = jackettUrl + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;

            // Використовуємо Lampa.Network для обходу проблем з CORS
            Lampa.Network.native(url, function (json) {
                if (json && json.Results && json.Results.length > 0) {
                    var results = json.Results;

                    // Фільтрація: обов'язково 4K/2160p + Українська мова
                    var filtered = results.filter(function (item) {
                        var t = item.Title.toLowerCase();
                        var is4K = t.includes('2160') || t.includes('4k') || t.includes('uhd');
                        var isUA = t.includes('ukr') || t.includes('укр') || t.includes('ua') || t.includes('hurtom') || t.includes('toloka');
                        return is4K && isUA;
                    });

                    // Пріоритет для Dolby Vision
                    filtered.sort(function(a, b) {
                        var aDV = /dv|vision|dovi/i.test(a.Title);
                        var bDV = /dv|vision|dovi/i.test(b.Title);
                        if (aDV && !bDV) return -1;
                        if (!aDV && bDV) return 1;
                        return b.Size - a.Size; 
                    });

                    if (filtered.length > 0) {
                        var best = filtered[0];
                        Lampa.Noty.show('Знайдено: ' + best.Title.substring(0, 35) + '...');
                        this.play(best, movie);
                    } else {
                        Lampa.Noty.show('4K UA реліз не знайдено');
                    }
                } else {
                    Lampa.Noty.show('Нічого не знайдено в Jackett');
                }
            }.bind(this), function () {
                Lampa.Noty.show('Помилка з\'єднання з Jackett');
            }, false, {dataType: 'json'});
        };

        this.play = function (torrent, movie) {
            var link = torrent.MagnetUri || torrent.Link;
            var title = movie.title + ' (4K DV UA)';

            if (window.Lampa.Torrserver) {
                // Якщо є модуль TorrServer, використовуємо його
                Lampa.Torrserver.stream(link, {
                    title: title,
                    movie: movie
                });
            } else {
                // Якщо немає, намагаємося запустити через стандартний механізм
                var torrserver_url = Lampa.Storage.field('torrserver_url');
                if (torrserver_url) {
                    var play_url = torrserver_url + '/stream/?link=' + encodeURIComponent(link) + '&index=1&play=1';
                    Lampa.Player.play({
                        url: play_url,
                        title: title,
                        movie: movie
                    });
                } else {
                    Lampa.Noty.show('TorrServer не налаштовано!');
                }
            }
        };
    }

    if (window.Lampa) {
        new Ukr4KPlugin().init();
    }
})();
