(function () {
    'use strict';

    function Ukr4KPlugin() {
        this.init = function () {
            var self = this;
            Lampa.Listener.follow('full', function (e) {
                if (e.type === 'complite') {
                    var render = e.object.activity.render();
                    // Шукаємо контейнер з кнопками
                    var container = render.find('.full-start-new__buttons, .full-start__buttons');
                    
                    if (container.length && !container.find('.open-4k-ukr').length && !e.data.movie.number_of_seasons) {
                        
                        // Створюємо окремий стиль для нашої кнопки
                        var style = '<style>' +
                            '.open-4k-ukr-container { width: 100%; margin-bottom: 20px; padding: 0 5px; }' +
                            '.open-4k-ukr-btn { width: 100%; height: 70px; cursor: pointer; border-radius: 12px; transition: transform 0.2s; position: relative; overflow: hidden; }' +
                            '.open-4k-ukr-btn:hover, .open-4k-ukr-btn.focus { transform: scale(1.02); }' +
                            '</style>';
                        $('body').append(style);

                        var svgIcon = '<svg width="100%" height="100%" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' +
                            '<rect x="0" y="0" width="200" height="80" rx="10" fill="black" stroke-width="6" stroke="url(#ukr_grad)"/>' +
                            '<defs>' +
                                '<linearGradient id="ukr_grad" x1="0%" y1="0%" x2="100%" y2="0%">' +
                                    '<stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />' +
                                    '<stop offset="49%" style="stop-color:#FFD700;stop-opacity:1" />' +
                                    '<stop offset="51%" style="stop-color:#0057B7;stop-opacity:1" />' +
                                    '<stop offset="100%" style="stop-color:#0057B7;stop-opacity:1" />' +
                                '</linearGradient>' +
                            '</defs>' +
                            '<text x="15" y="55" font-family="Arial, sans-serif" font-weight="bold" font-size="42" fill="#FFD700">4K</text>' +
                            '<text x="80" y="38" font-family="Arial, sans-serif" font-weight="bold" font-size="19" fill="#0057B7">DOLBY</text>' +
                            '<text x="80" y="60" font-family="Arial, sans-serif" font-weight="bold" font-size="19" fill="#0057B7">VISION</text>' +
                        '</svg>';

                        var btn = $('<div class="open-4k-ukr-container">' +
                            '<div class="open-4k-ukr-btn selector">' + svgIcon + '</div>' +
                            '</div>');

                        btn.on('click', function () {
                            self.searchAndPlay(e.data.movie);
                        });

                        // Додаємо кнопку НАД усіма іншими, щоб вона була головною
                        container.before(btn);
                        Lampa.Controller.collectionSet(container.parent());
                    }
                }
            });
        };

        this.searchAndPlay = function (movie) {
            var jackettUrl = Lampa.Storage.field('jackett_url') || 'https://jacred.xyz';
            var jackettKey = Lampa.Storage.field('jackett_key') || '';
            Lampa.Noty.show('Пошук найкращого 4K UA...');

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            var query = encodeURIComponent(title + ' ' + year + ' 2160p');
            var url = jackettUrl.replace(/\/$/, '') + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;

            Lampa.Network.native(url, function (json) {
                var results = json.Results || (Array.isArray(json) ? json : []);
                var filtered = results.filter(function (item) {
                    var t = (item.Title || item.title || '').toLowerCase();
                    return (t.includes('ukr') || t.includes('укр') || t.includes('ua') || t.includes('hurtom')) && (t.includes('2160') || t.includes('4k'));
                });

                if (filtered.length > 0) {
                    filtered.sort(function(a, b) {
                        var aDV = /dv|vision|dovi/i.test((a.Title || a.title).toLowerCase());
                        var bDV = /dv|vision|dovi/i.test((b.Title || b.title).toLowerCase());
                        if (aDV && !bDV) return -1;
                        if (!aDV && bDV) return 1;
                        return (b.Size || b.size || 0) - (a.Size || a.size || 0);
                    });
                    this.play(filtered[0], movie);
                } else {
                    Lampa.Noty.show('4K UA не знайдено');
                }
            }.bind(this), function () {
                Lampa.Noty.show('Помилка JacRed');
            }, false, { dataType: 'json' });
        };

        this.play = function (torrent, movie) {
            var link = torrent.MagnetUri || torrent.Link || torrent.magnet || torrent.link;
            var ts_url = Lampa.Storage.field('torrserver_url');
            if (!ts_url) return Lampa.Noty.show('Налаштуйте TorrServer');

            var playUrl = ts_url.replace(/\/$/, '') + '/stream/?link=' + encodeURIComponent(link) + '&index=1&play=1';
            Lampa.Player.play({ url: playUrl, title: movie.title + ' (4K UA)', movie: movie });
        };
    }

    if (window.Lampa) {
        new Ukr4KPlugin().init();
    }
})();
