(function () {  
    'use strict';  
  
    function noty(msg) {  
        if (window.Lampa && Lampa.Noty) Lampa.Noty.show(msg);  
    }  
  
    var UaDV = {  
        run: async function (object) {  
            console.log('UaDV Debug: Button clicked');  
              
            var movie = object.movie ||   
                       (object.data ? object.data.movie : null) ||   
                       object.item ||  
                       (object.card ? object.card.movie : null) ||  
                       (object.activity ? object.activity.movie : null) ||  
                       object;  
              
            console.log('UaDV Debug: Movie object found:', !!movie);  
              
            if (!movie) {  
                console.log('UaDV Debug: Available object keys:', Object.keys(object));  
                return noty('Помилка: дані фільму не знайдено');  
            }  
  
            var title = movie.title ||   
                       movie.name ||   
                       movie.original_title ||   
                       movie.original_name ||  
                       movie.movie_title ||  
                       movie.film_name ||  
                       (movie.card && movie.card.title) ||  
                       (movie.card && movie.card.name);  
              
            console.log('UaDV Debug: Final title:', title);  
              
            if (!title) {  
                return noty('Помилка: не вдалося отримати назву фільму');  
            }  
  
            var year = (movie.release_date || movie.first_air_date || movie.year || '').slice(0, 4);  
            var query = title + (year ? ' ' + year : '');  
              
            noty('Шукаю найкращий UA реліз: ' + query);  
  
            try {  
                var url = Lampa.Storage.field('jackett_url');  
                var key = Lampa.Storage.field('jackett_key');  
                  
                console.log('UaDV Debug: Jackett URL:', url);  
                console.log('UaDV Debug: Jackett Key exists:', !!key);  
                  
                if (!url) return noty('Вкажіть Jackett URL у налаштуваннях');  
                if (!key) return noty('Вкажіть Jackett API ключ у налаштуваннях');  
  
                // Спрощені категорії як у звичайному торренті  
                var cats = '2000,2010,2030,2040,5000,5030,5040';  
                var searchUrl = url.replace(/\/$/, '') + '/api/v2.0/indexers/all/results?apikey=' + key + '&Query=' + encodeURIComponent(query) + '&Category[]=' + cats.split(',').join('&Category[]=');  
  
                console.log('UaDV Debug: Full search URL:', searchUrl);  
                console.log('UaDV Debug: Search query:', query);  
  
                // Додаємо таймаут та детальну обробку помилок  
                var controller = new AbortController();  
                var timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд таймаут  
  
                var response = await fetch(searchUrl, {   
                    signal: controller.signal,  
                    headers: {  
                        'Accept': 'application/json',  
                        'Content-Type': 'application/json'  
                    }  
                });  
                  
                clearTimeout(timeoutId);  
                  
                console.log('UaDV Debug: Response status:', response.status);  
                console.log('UaDV Debug: Response headers:', response.headers);  
  
                if (!response.ok) {  
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);  
                }  
  
                var json = await response.json();  
                var results = json.Results || json.results || [];  
  
                console.log('UaDV Debug: Raw response:', json);  
                console.log('UaDV Debug: Found', results.length, 'results');  
  
                if (!results.length) return noty('Нічого не знайдено в Jackett');  
  
                var scored = results.map(function(item) {  
                    var score = 0;  
                    var t = (item.Title || '').toLowerCase();  
                      
                    var uaPatterns = ['ukr', 'ua', 'укр', 'ukrainian', 'ukraine', 'ua.', 'ukr.', 'український', 'україна'];  
                    var hasUaMark = uaPatterns.some(function(pattern) {  
                        return t.indexOf(pattern) >= 0;  
                    });  
                      
                    if (hasUaMark) {  
                        score += 1000;  
                        console.log('UaDV Debug: Found UA release:', item.Title);  
                    } else {  
                        return { item: item, score: -1 };  
                    }  
  
                    if (t.indexOf('dv') >= 0 || t.indexOf('dolby vision') >= 0 || t.indexOf('dovi') >= 0) score += 600;  
                    if (t.indexOf('2160p') >= 0 || t.indexOf('4k') >= 0) score += 400;  
                    if (t.indexOf('hdr') >= 0) score += 200;  
                    if (t.indexOf('1080p') >= 0) score += 100;  
                    if (t.indexOf('720p') >= 0) score += 50;  
                      
                    score += Math.floor((item.Size || 0) / (1024 * 1024 * 1024)) * 10;  
                      
                    return { item: item, score: score };  
                }).filter(function(res) { return res.score > 0; });  
  
                console.log('UaDV Debug: Filtered UA results:', scored.length);  
  
                scored.sort(function(a, b) { return b.score - a.score; });  
  
                if (scored.length > 0) {  
                    var best = scored[0].item;  
                    noty('Знайдено якісний реліз. Запускаю...');  
                    this.play(best, movie);  
                } else {  
                    noty('Українських релізів не знайдено');  
                }  
            } catch (e) {  
                console.error('UaDV Debug: Network error:', e);  
                console.error('UaDV Debug: Error details:', e.message);  
                console.error('UaDV Debug: Error stack:', e.stack);  
                  
                if (e.name === 'AbortError') {  
                    noty('Таймаут запиту до Jackett (30 секунд)');  
                } else if (e.message.includes('Failed to fetch')) {  
                    noty('Помилка підключення до Jackett. Перевірте URL та доступність сервера.');  
                } else {  
                    noty('Помилка мережі або Jackett: ' + e.message);  
                }  
            }  
        },  
  
        play: async function (item, movie) {  
            var ts_url = Lampa.Storage.field('torrserver_url').replace(/\/$/, '');  
            var link = item.MagnetUri || item.Link;  
  
            console.log('UaDV Debug: Playing:', item.Title);  
            console.log('UaDV Debug: TorrServer URL:', ts_url);  
  
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
  
                console.log('UaDV Debug: Torrent added, hash:', hash);  
  
                var filesRes = await fetch(ts_url + '/torrents', {  
                    method: 'POST',  
                    body: JSON.stringify({ action: 'get', hash: hash })  
                });  
                var filesData = await filesRes.json();  
                var files = filesData.file_stats || filesData.FileStats || [];  
  
                console.log('UaDV Debug: Files found:', files.length);  
  
                if (files.length) {  
                    var videoFiles = files.filter(function(file) {  
                        var name = (file.path || file.name || '').toLowerCase();  
                        return name.indexOf('.mp4') >= 0 || name.indexOf('.mkv') >= 0 || name.indexOf('.avi') >= 0 || name.indexOf('.mov') >= 0;  
                    });  
  
                    var targetFiles = videoFiles.length > 0 ? videoFiles : files;  
                    var mainFile = targetFiles.reduce(function(prev, cur) {  
                        return (prev.length > cur.length) ? prev : cur;  
                    });  
  
                    console.log('UaDV Debug: Selected file:', mainFile.path || mainFile.name);  
  
                    Lampa.Player.play({  
                        url: ts_url + '/stream/?link=' + hash + '&index=' + mainFile.id + '&play=1',  
                        title: movie.title || movie.name,  
                        timeline: { hash: hash }  
                    });  
                } else {  
                    noty('Файли не знайдено в торренті');  
                }  
            } catch (e) {  
                console.error('UaDV Debug: Play error:', e);  
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
                        console.log('UaDV Debug: Button clicked!');  
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
