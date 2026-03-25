(function () {
    'use strict';

    function noty(msg) {
        if (window.Lampa && Lampa.Noty) Lampa.Noty.show(msg);
    }

    var UaDV = {
        run: async function (object) {
            // ШУКАЄМО ДАНІ: пробуємо всі можливі місця, де Lampa ховає інформацію про фільм
            var movie = object.movie || (object.data ? object.data.movie : null) || object.item;
            
            if (!movie) {
                console.log('UaDV Debug: Full object:', object);
                return noty('Помилка: дані фільму не знайдено');
            }

            // Назва для пошуку
            var title = movie.title || movie.name || movie.original_title || movie.original_name;
            var year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
            var query = title + (year ? ' ' + year : '');
            
            noty('Шукаю найкращий UA реліз: ' + query);

            try {
                var url = Lampa.Storage.field('jackett_url');
                var key = Lampa.Storage.field('jackett_key');
                
                if (!url) return noty('Вкажіть Jackett URL у налаштуваннях');

                var cats = '2000,2010,2030,2040,5000,5030,5040';
                var searchUrl = url.replace(/\/$/, '') + '/api/v2.0/indexers/all/results?apikey=' + key + '&Query=' + encodeURIComponent(query) + '&Category[]=' + cats.split(',').join('&Category[]=');

                var response = await fetch(searchUrl);
                var json = await response.json();
                var results = json.Results || json.results || [];

                if (!results.length) return noty('Нічого не знайдено в Jackett');

                var scored = results.map(function(item) {
                    var score = 0;
                    var t = (item.Title || '').toLowerCase();
                    // Обов'язкова перевірка на UA
                    if (t.indexOf('ukr') >= 0 || t.indexOf('ua') >= 0 || t.indexOf('укр') >= 0) score += 1000;
                    else return { item: item, score: -1 };

                    if (t.indexOf('dv') >= 0 || t.indexOf('dolby vision') >= 0 || t.indexOf('dovi') >= 0) score += 600;
                    if (t.indexOf('2160p') >= 0 || t.indexOf('4k') >= 0) score += 400;
                    if (t.indexOf('hdr') >= 0) score += 200;
                    
                    score += Math.floor((item.Size || 0) / (1024 * 1024 * 1024)) * 10;
                    return { item: item, score: score };
                }).filter(function(res) { return res.score > 0; });

                scored.sort(function(a, b) { return b.score - a.score; });

                if (scored.length > 0) {
                    var best = scored[0].item;
                    noty('Знайдено якісний реліз. Запускаю...');
                    this.play(best, movie);
                } else {
                    noty('Українських релізів не знайдено');
                }
            } catch (e) {
                noty('Помилка мережі або Jackett');
            }
        },

        play: async function (item, movie) {
            var ts_url = Lampa.Storage.field('torrserver_url').replace(/\/$/, '');
            var link = item.MagnetUri || item.Link;

            try {
                var res = await fetch(ts_url + '/torrents', {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'add',
                        link: link,
                        title: '[UaDV] ' + (movie.title || movie.name),
                        save_to_db: false
                    })
                });
                var data = await res.json();
                var hash = data.hash || data.id;

                var filesRes = await fetch(ts_url + '/torrents', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'get', hash: hash })
                });
                var filesData = await filesRes.json();
                var files = filesData.file_stats || filesData.FileStats || [];

                if (files.length) {
                    var mainFile = files.reduce(function(prev, cur) {
                        return (prev.length > cur.length) ? prev : cur;
                    });

                    Lampa.Player.play({
                        url: ts_url + '/stream/?link=' + hash + '&index=' + mainFile.id + '&play=1',
                        title: movie.title || movie.name,
                        timeline: { hash: hash }
                    });
                }
            } catch (e) {
                noty('TorrServer не відповідає');
            }
        }
    };

    function addBtn() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var render = e.object.activity.render();
                var container = render.find('.full-start__buttons, .full-start-new__buttons, .full-actions');
                
                if (container.length && !container.find('.playua-prime-btn').length) {
                    var btn = $(`
                        <div class="full-start__button selector playua-prime-btn" style="background: #0055a4 !important; color: #fff !important; margin-right: 10px;">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="white" style="margin-bottom: -3px; margin-right: 5px;">
                                <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3zm7.039 3.399c0-.552-.446-1-1-1H5.433c-.552 0-1 .448-1 1v3.202c0 .552.448 1 1 1h1.606c.554 0 1-.448 1-1V6.399zM11.5 5.5h-1.306l-2.14 2.584L13.5 11h-1.428l-1.679-2.624-.615.7V11H8.59V5.001h1.187v2.686h.057L12.102 5z"/>
                            </svg>
                            <span>UA Prime</span>
                        </div>
                    `);

                    btn.on('click', function() {
                        UaDV.run(e.object);
                    });

                    container.prepend(btn);
                    
                    if (window.Lampa && Lampa.Controller) {
                        Lampa.Controller.collectionSet(render);
                    }
                }
            }
        });
    }

    if (!window.uadv_prime_loaded) {
        window.uadv_prime_loaded = true;
        addBtn();
    }
})();
