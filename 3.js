(function () {
    'use strict';

    var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96'; // Ваш ключ TMDB

    function Ukr4KPlugin() {
        this.init = function () {
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    var render = e.object.activity.render();
                    var container = render.find('.full-start-new__buttons, .full-start__buttons');
                    
                    if (container.length && !container.find('.open-4k-ukr').length) {
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="background: #e67e22 !important; color: #fff !important;">' +
                            '<span>4K UHD UA</span>' +
                            '</div>');

                        btn.on('hover:enter', function () {
                            searchAndPlay(e.data.movie);
                        });

                        container.prepend(btn);
                        Lampa.Controller.collectionSet(container);
                    }
                }
            });
        };

        async function searchAndPlay(movie) {
            Lampa.Noty.show('Шукаю 4K Dolby Vision (UA)...');

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            // Формуємо жорсткий запит для Jackett
            var query = encodeURIComponent(title + ' ' + year + ' 2160p ukr');
            
            var jackettUrl = Lampa.Storage.field('jackett_url');
            var jackettKey = Lampa.Storage.field('jackett_key');

            if (!jackettUrl) {
                Lampa.Noty.show('Налаштуйте Jackett у параметрах!');
                return;
            }

            try {
                var response = await fetch(jackettUrl + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query);
                var json = await response.json();
                var results = json.Results || [];

                // 1. Фільтруємо результати (шукаємо Dolby Vision та 4K)
                var filtered = results.filter(function (item) {
                    var t = item.Title.toLowerCase();
                    return (t.includes('dv') || t.includes('vision') || t.includes('dovi')) && 
                           (t.includes('2160p') || t.includes('4k') || t.includes('uhd'));
                });

                // 2. Сортуємо за розміром (найкраща якість зазвичай найбільша)
                filtered.sort((a, b) => b.Size - a.Size);

                if (filtered.length > 0) {
                    var bestMatch = filtered[0];
                    Lampa.Noty.show('Знайдено: ' + bestMatch.Title.slice(0, 30) + '...');
                    startStreaming(bestMatch, movie);
                } else {
                    Lampa.Noty.show('4K DV з UA дубляжем не знайдено');
                }
            } catch (e) {
                Lampa.Noty.show('Помилка пошуку');
            }
        }

        function startStreaming(torrent, movie) {
            var torrserver = Lampa.Storage.field('torrserver_url');
            if (!torrserver) {
                Lampa.Noty.show('Налаштуйте TorrServer!');
                return;
            }

            var link = torrent.MagnetUri || torrent.Link;
            // Логіка додавання в TorrServer та запуск плеєра Lampa
            // (Використовуйте стандартний метод Lampa.Player.play)
            Lampa.Player.play({
                url: torrserver + '/stream/?link=' + encodeURIComponent(link) + '&index=1&play=1',
                title: movie.title + ' (4K DV UA)',
                movie: movie
            });
        }
    }

    if (window.Lampa) {
        new Ukr4KPlugin().init();
    }
})();

