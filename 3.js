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
                        
                        // Ваш SVG дизайн - оптимізований під розмір стандартної кнопки
                        var svgIcon = '<svg width="100%" height="100%" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
                            '<rect x="5" y="5" width="190" height="70" rx="14" fill="black" stroke-width="10" stroke="url(#ukr_grad_final)"/>' +
                            '<defs>' +
                                '<linearGradient id="ukr_grad_final" x1="0%" y1="0%" x2="100%" y2="0%">' +
                                    '<stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />' +
                                    '<stop offset="50%" style="stop-color:#FFD700;stop-opacity:1" />' +
                                    '<stop offset="50%" style="stop-color:#0057B7;stop-opacity:1" />' +
                                    '<stop offset="100%" style="stop-color:#0057B7;stop-opacity:1" />' +
                                '</linearGradient>' +
                            '</defs>' +
                            '<text x="20" y="55" font-family="Arial, sans-serif" font-weight="bold" font-size="48" fill="#FFD700">4K</text>' +
                            '<text x="88" y="40" font-family="Arial, sans-serif" font-weight="bold" font-size="22" fill="#0057B7">DOLBY</text>' +
                            '<text x="88" y="62" font-family="Arial, sans-serif" font-weight="bold" font-size="22" fill="#0057B7">VISION</text>' +
                        '</svg>';

                        // Створюємо кнопку з точними розмірами Lampa (зазвичай це ~150-170px ширина)
                        var btn = $('<div class="full-start__button selector open-4k-ukr" style="width: auto; min-width: 160px; height: 55px; background: none !important; border: none !important; padding: 0 !important; display: flex; align-items: center; justify-content: center; margin-right: 10px;">' +
                            '<div style="width: 100%; height: 100%;">' + svgIcon + '</div>' +
                            '</div>');

                        btn.on('click', function () {
                            self.searchAndPlay(e.data.movie);
                        });

                        // Додаємо ПЕРЕД кнопкою "Дивитись"
                        container.prepend(btn);
                        
                        // Оновлюємо контролер, щоб пульт бачив кнопку
                        Lampa.Controller.collectionSet(container);
                    }
                }
            });
        };

        this.searchAndPlay = function (movie) {
            var jackettUrl = Lampa.Storage.field('jackett_url') || 'https://jacred.xyz';
            var jackettKey = Lampa.Storage.field('jackett_key') || '';
            Lampa.Noty.show('Шукаю 4K DV UA...');

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
