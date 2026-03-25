(function () {  
    'use strict';  
  
    function noty(msg) {  
        if (window.Lampa && Lampa.Noty) Lampa.Noty.show(msg);  
    }  
  
    var UaDV = {  
        run: async function (object) {  
            var movie = object.movie || object.item || object;  
              
            if (!movie) return noty('Помилка: дані фільму не знайдено');  
  
            var title = movie.title || movie.name || movie.original_title;  
            if (!title) return noty('Помилка: не вдалося отримати назву фільму');  
  
            var year = (movie.release_date || movie.first_air_date || '').slice(0, 4);  
            var query = title + (year ? ' ' + year : '');  
              
            noty('Шукаю найкращий UA реліз: ' + query);  
  
            try {  
                var url = Lampa.Storage.field('jackett_url');  
                var key = Lampa.Storage.field('jackett_key') || Lampa.Storage.field('parser_jackett_key');  
                  
                console.log('UaDV Debug: URL:', url);  
                console.log('UaDV Debug: Key:', key);  
                  
                if (!url || !key) return noty('Перевірте налаштування Jackett');  
  
                // Спеціальний формат для публічних серверів  
                var searchUrl = url + '/api/v2.0/indexers/all/results?apikey=' + key + '&Query=' + encodeURIComponent(query) + '&Category%5B%5D=2000&Category%5B%5D=2010&Category%5B%5D=2030&Category%5B%5D=2040&Category%5B%5D=5000&Category%5B%5D=5030&Category%5B%5D=5040';  
                  
                console.log('UaDV Debug: Full URL:', searchUrl);  
  
                var response = await fetch(searchUrl, {  
                    method: 'GET',  
                    headers: {  
                        'Accept': 'application/json',  
                        'User-Agent': 'Mozilla/5.0'  
                    }  
                });  
  
                console.log('UaDV Debug: Status:', response.status);  
  
                if (!response.ok) {  
                    var errorText = await response.text();  
                    console.error('UaDV Debug: Error:', errorText);  
                    return noty('Помилка сервера: ' + response.status);  
                }  
  
                var json = await response.json();  
                var results = json.Results || [];  
  
                console.log('UaDV Debug: Found:', results.length);  
  
                if (!results.length) return noty('Нічого не знайдено');  
  
                // Розширена фільтрація українських релізів  
                var uaResults = results.filter(function(item) {  
                    var t = (item.Title || '').toLowerCase();  
                    return t.indexOf('ukr') >= 0 || t.indexOf('ua') >= 0 || t.indexOf('укр') >= 0 ||  
                           t.indexOf('ukrainian') >= 0 || t.indexOf('ukraine') >= 0;  
                });  
  
                console.log('UaDV Debug: UA results:', uaResults.length);  
  
                if (uaResults.length > 0) {  
                    noty('Знайдено український реліз. Запускаю...');  
                    this.play(uaResults[0], movie);  
                } else {  
                    noty('Українських релізів не знайдено');  
                }  
            } catch (e) {  
                console.error('UaDV Debug: Error:', e);  
                noty('Помилка: ' + e.message);  
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
                var files = filesData.file_stats || [];  
  
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
