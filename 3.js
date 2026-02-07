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
                        
                        // Насичені градієнти: глибоке золото та королівський синій
                        var defs = '<defs>' +
                            '<linearGradient id="g_gold_final" x1="0%" y1="0%" x2="0%" y2="100%">' +
                                '<stop offset="0%" style="stop-color:#FFFAD6;stop-opacity:1" />' +
                                '<stop offset="45%" style="stop-color:#FFD700;stop-opacity:1" />' +
                                '<stop offset="100%" style="stop-color:#8C6700;stop-opacity:1" />' +
                            '</linearGradient>' +
                            '<linearGradient id="g_blue_final" x1="0%" y1="0%" x2="0%" y2="100%">' +
                                '<stop offset="0%" style="stop-color:#60C5FF;stop-opacity:1" />' +
                                '<stop offset="100%" style="stop-color:#0047AB;stop-opacity:1" />' +
                            '</linearGradient>' +
                        '</defs>';

                        // Збільшений Play (viewBox 0 0 200 60)
                        // x=12 для Play, x=60 для 4K (відступ 48 одиниць)
                        var body = '<path d="M12 14 L46 30 L12 46 Z" fill="url(#g_gold_final)" stroke="#5E4600" stroke-width="1"/>' +
                            '<text x="60" y="44" font-family="Arial,sans-serif" font-weight="bold" font-size="34" fill="url(#g_gold_final)">4K</text>' +
                            '<text x="116" y="28" font-family="Arial,sans-serif" font-weight="bold" font-size="15" fill="url(#g_blue_final)">DOLBY</text>' +
                            '<text x="116" y="48" font-family="Arial,sans-serif" font-weight="bold" font-size="15" fill="url(#g_blue_final)">VISION</text>';

                        var svgIcon = '<svg width="100%" height="100%" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' + defs + body + '</svg>';

                        // background: none прибирає сірий фон. Розмір 135x36 для кращого балансу.
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="width: 135px; height: 36px; background: none !important; border: none !important; padding: 0 !important; margin: 3px 6px 3px 0; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; overflow: visible;">' +
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
            Lampa.Noty.show('Шукаю 4K UA...');

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
