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
                          
                        // Градієнти для кнопки  
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
  
                        var button = $('<div class="open-4k-ukr selector" style="margin: 0 0 0 1.5em;">' +  
                            '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">' + defs +  
                                '<circle cx="18" cy="18" r="18" fill="url(#g_blue_final)"/>' +  
                                '<path d="M13.5 12L24 18L13.5 24V12Z" fill="url(#g_gold_final)"/>' +  
                                '<text x="18" y="23" font-family="Arial" font-size="8" font-weight="bold" text-anchor="middle" fill="url(#g_gold_final)">4K</text>' +  
                                '<text x="18" y="30" font-family="Arial" font-size="4" font-weight="bold" text-anchor="middle" fill="url(#g_blue_final)">DOLBY VISION</text>' +  
                            '</svg>' +  
                        '</div>');  
  
                        button.on('click', function () {  
                            self.search4KUkrainian(e.data.movie);  
                        });  
  
                        container.append(button);  
                    }  
                }  
            });  
        };  
  
        this.search4KUkrainian = function (movie) {  
            var JACRED_PROTOCOL = 'http://';  
            var JACRED_URL = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz';  
            var JACRED_API_KEY = Lampa.Storage.get('');  
              
            // Покращений пошуковий запит з різними варіантами  
            var searchQueries = [  
                movie.title + ' ' + (movie.release_date ? movie.release_date.slice(0, 4) : '') + ' 2160p ukr',  
                movie.title + ' ' + (movie.release_date ? movie.release_date.slice(0, 4) : '') + ' 4k ukrainian',  
                movie.title + ' 2160p ukr',  
                movie.title + ' 4k ukr'  
            ];  
  
            // Функція для спроби кожного запиту  
            function trySearch(queryIndex) {  
                if (queryIndex >= searchQueries.length) {  
                    Lampa.Noty.show('4K UA не знайдено');  
                    return;  
                }  
  
                var searchQuery = searchQueries[queryIndex];  
                console.log('[Ukr4K] Спроба запиту:', searchQuery);  
  
                Lampa.Network.native("get", JACRED_PROTOCOL + JACRED_URL + '/api/v2/search', {  
                    search: searchQuery  
                }, function (response) {  
                    console.log('[Ukr4K] Відповідь API для запиту "' + searchQuery + '":', response);  
                      
                    if (response && response.data && Array.isArray(response.data)) {  
                        // Покращена фільтрація результатів  
                        var filtered = response.data.filter(function(item) {  
                            var title = (item.title || '').toLowerCase();  
                            var hasUkr = title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0 || title.indexOf('ukrainian') >= 0;  
                            var has4K = title.indexOf('2160') >= 0 || title.indexOf('4k') >= 0 || title.indexOf('uhd') >= 0;  
                            var hasDV = title.indexOf('vision') >= 0 || title.indexOf('dv') >= 0 || title.indexOf('dolby') >= 0;  
                              
                            console.log('[Ukr4K] Перевірка результату:', title, 'UA:', hasUkr, '4K:', has4K, 'DV:', hasDV);  
                              
                            return hasUkr && has4K; // Спочатку шукаємо будь-які 4K UA  
                        });  
  
                        if (filtered.length > 0) {  
                            // Сортування: пріоритет для Dolby Vision, потім за розміром  
                            filtered.sort(function(a, b) {  
                                var tA = (a.title || '').toLowerCase();  
                                var tB = (b.title || '').toLowerCase();  
                                var aDV = tA.indexOf('vision') > -1 || tA.indexOf('dv') > -1;  
                                var bDV = tB.indexOf('vision') > -1 || tB.indexOf('dv') > -1;  
                                  
                                if (aDV && !bDV) return -1;  
                                if (!aDV && bDV) return 1;  
                                  
                                return (b.size || 0) - (a.size || 0);  
                            });  
  
                            console.log('[Ukr4K] Знайдено результатів:', filtered.length, 'Обраний:', filtered[0]);  
                            self.play(filtered[0], movie);  
                        } else {  
                            // Якщо не знайдено з поточним запитом, пробуємо наступний  
                            trySearch(queryIndex + 1);  
                        }  
                    } else {  
                        trySearch(queryIndex + 1);  
                    }  
                }, function () {  
                    console.log('[Ukr4K] Помилка запиту для:', searchQuery);  
                    trySearch(queryIndex + 1);  
                }, false, { dataType: 'json' });  
            }  
  
            // Починаємо з першого запиту  
            trySearch(0);  
        };  
  
        this.play = function (torrent, movie) {  
            var link = torrent.magnetUri || torrent.link || torrent.magnet;  
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
