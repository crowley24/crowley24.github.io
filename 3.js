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
                        
                        // Градієнти: Золото для Play та 4K, Синій для Vision
                        var defs = '<defs>' +
                            '<linearGradient id="g_gold" x1="0%" y1="0%" x2="0%" y2="100%">' +
                                '<stop offset="0%" style="stop-color:#FFF3A6;stop-opacity:1" />' +
                                '<stop offset="50%" style="stop-color:#FFD700;stop-opacity:1" />' +
                                '<stop offset="100%" style="stop-color:#B8860B;stop-opacity:1" />' +
                            '</linearGradient>' +
                            '<linearGradient id="g_blue" x1="0%" y1="0%" x2="0%" y2="100%">' +
                                '<stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" />' +
                                '<stop offset="100%" style="stop-color:#0057B7;stop-opacity:1" />' +
                            '</linearGradient>' +
                        '</defs>';

                        var body = '<path d="M15 15 L45 30 L15 45 Z" fill="url(#g_gold)" stroke="#8B6508" stroke-width="1"/>' +
                            '<text x="55" y="45" font-family="Arial,sans-serif" font-weight="bold" font-size="44" fill="url(#g_gold)">4K</text>' +
                            '<text x="115" y="28" font-family="Arial,sans-serif" font-weight="bold" font-size="18" fill="url(#g_blue)">DOLBY</text>' +
                            '<text x="115" y="50" font-family="Arial,sans-serif" font-weight="bold" font-size="18" fill="url(#g_blue)">VISION</text>';

                        var svgIcon = '<svg width="100%" height="100%" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' + defs + body + '</svg>';

                        // Розмір 135x36 - ідеально вписується в ряд без перекосів
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="width: 135px; height: 36px; background: rgba(255,255,255,0.05) !important; border-radius: 8px; padding: 0 !important; margin: 4px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; overflow: hidden;">' +
                            '<div style="width: 100%; height: 100%; pointer-events: none;">' + svgIcon + '</div>' +
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
            Lampa.Noty.show('Пошук 4K UA...');

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            var query = encodeURIComponent(title + ' ' + year + ' 2160p');
            var url = jackettUrl.replace(/\/$/, '') + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;

            Lampa.Network.native(url, function (json) {
                var results = json.Results || (Array.isArray(json) ? json : []);
                var filtered = results.filter(function (item) {
                    var t = (item.Title || item.title || '').toLowerCase();
                    return (t.indexOf('ukr') > -1 || t.indexOf('укр') > -1 || t.indexOf('ua') > -1) && (t.indexOf('2160') > -1 || t.indexOf('4k') > -1);
                });

                if (filtered.length > 0) {
                    filtered.sort(function(a, b) {
                        var tA = (a.Title || a.title).toLowerCase();
                        var tB = (b.Title || b.title).toLowerCase();
                        var aDV = (tA.indexOf('vision') > -1 || tA.indexOf('dv') > -1);
                        var bDV = (tB.indexOf('vision') > -1 || tB.indexOf('dv') > -1);
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
