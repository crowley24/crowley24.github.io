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
                        
                        // Оптимізований SVG без зайвих символів, що викликають Script Error
                        var svgIcon = '<svg width="100%" height="100%" viewBox="0 0 200 65" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
                            '<defs>' +
                                '<linearGradient id="ukr_grad_final_v5" x1="0%" y1="0%" x2="100%" y2="0%">' +
                                    '<stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />' +
                                    '<stop offset="49%" style="stop-color:#FFD700;stop-opacity:1" />' +
                                    '<stop offset="51%" style="stop-color:#0057B7;stop-opacity:1" />' +
                                    '<stop offset="100%" style="stop-color:#0057B7;stop-opacity:1" />' +
                                '</linearGradient>' +
                            '</defs>' +
                            '<rect x="4" y="4" width="192" height="57" rx="10" fill="black" stroke-width="8" stroke="url(#ukr_grad_final_v5)"/>' +
                            '<text x="18" y="46" font-family="Arial, sans-serif" font-weight="bold" font-size="42" fill="#FFD700">4K</text>' +
                            '<text x="82" y="32" font-family="Arial, sans-serif" font-weight="bold" font-size="18" fill="#0057B7">DOLBY</text>' +
                            '<text x="82" y="52" font-family="Arial, sans-serif" font-weight="bold" font-size="18" fill="#0057B7">VISION</text>' +
                        '</svg>';

                        // Компактна кнопка для мобільного та ТВ інтерфейсу
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="width: 140px; height: 48px; background: none !important; border: none !important; padding: 0 !important; margin: 5px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;">' +
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
                    var hasUkr = /ukr|укр|ua|hurtom|toloka/.test(t);
                    var has4K = /2160|4k|uhd/.test(t);
                    return hasUkr && has4K;
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
