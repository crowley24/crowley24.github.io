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
                        
                        // Ваш SVG дизайн - ВИПРАВЛЕНО синтаксис градієнта
                        var svgIcon = '<svg width="100%" height="100%" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" style="display: block; overflow: visible;">' +
                            '<rect x="2" y="2" width="196" height="76" rx="10" fill="black" stroke-width="8" stroke="url(#ukraine_grad)"/>' +
                            '<defs>' +
                                '<linearGradient id="ukraine_grad" x1="0%" y1="0%" x2="100%" y2="0%">' +
                                    '<stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />' +
                                    '<stop offset="50%" style="stop-color:#FFD700;stop-opacity:1" />' +
                                    '<stop offset="50%" style="stop-color:#0057B7;stop-opacity:1" />' +
                                    '<stop offset="100%" style="stop-color:#0057B7;stop-opacity:1" />' +
                                '</linearGradient>' +
                            '</defs>' +
                            '<text x="22" y="56" font-family="Arial, sans-serif" font-weight="bold" font-size="44" fill="#FFD700">4K</text>' +
                            '<text x="88" y="40" font-family="Arial, sans-serif" font-weight="bold" font-size="20" fill="#0057B7">DOLBY</text>' +
                            '<text x="88" y="62" font-family="Arial, sans-serif" font-weight="bold" font-size="20" fill="#0057B7">VISION</text>' +
                        '</svg>';

                        // Розміри збільшено для кращої видимості на ТБ
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="width: 240px; height: 95px; padding: 0; background: none !important; border: none !important; margin-right: 15px; margin-bottom: 15px; cursor: pointer; display: inline-block; vertical-align: top;">' +
                            svgIcon +
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

            Lampa.Noty.show('Шукаю найкращий 4K DV (UA)...');

            var title = movie.original_title || movie.title;
            var year = (movie.release_date || '').slice(0, 4);
            var query = encodeURIComponent(title + ' ' + year + ' 2160p');
            var url = jackettUrl.replace(/\/$/, '') + '/api/v2.0/indexers/all/results?apikey=' + jackettKey + '&Query=' + query;

            Lampa.Network.native(url, function (json) {
                var results = json.Results || (Array.isArray(json) ? json : []);
                var regUKR = /ukr|укр|ua|hurtom|toloka/i;
                var reg4K = /2160|4k|uhd/i;
                var regDV = /dv|vision|dovi/i;

                var filtered = results.filter(function (item) {
                    var t = (item.Title || item.title || '').toLowerCase();
                    return regUKR.test(t) && reg4K.test(t);
                });

                if (filtered.length > 0) {
                    filtered.sort(function(a, b) {
                        var tA = (a.Title || a.title || '').toLowerCase();
                        var tB = (b.Title || b.title || '').toLowerCase();
                        var aDV = regDV.test(tA);
                        var bDV = regDV.test(tB);
                        if (aDV && !bDV) return -1;
                        if (!aDV && bDV) return 1;
                        return (b.Size || b.size || 0) - (a.Size || a.size || 0);
                    });

                    Lampa.Noty.show('Знайдено! Запускаю...');
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

            if (!ts_url) {
                Lampa.Noty.show('Налаштуйте TorrServer');
                return;
            }

            var playUrl = ts_url.replace(/\/$/, '') + '/stream/?link=' + encodeURIComponent(link) + '&index=1&play=1';
            
            Lampa.Player.play({
                url: playUrl,
                title: movie.title + ' (4K DV UA)',
                movie: movie
            });
        };
    }

    if (window.Lampa) {
        new Ukr4KPlugin().init();
    }
})();
