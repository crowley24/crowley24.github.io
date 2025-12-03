(function () {  
    'use strict';  
  
    // Polyfill for AbortController and AbortSignal  
    if (typeof AbortController === 'undefined') {  
        window.AbortController = function () {  
            this.signal = {  
                aborted: false,  
                addEventListener: function (event, callback) {  
                    if (event === 'abort') {  
                        this._onabort = callback;  
                    }  
                }  
            };  
            this.abort = function () {  
                this.signal.aborted = true;  
                if (typeof this.signal._onabort === 'function') {  
                    this.signal._onabort();  
                }  
            };  
        };  
    }  
  
    // Polyfill for performance.now  
    if (typeof performance === 'undefined' || !performance.now) {  
        window.performance = {  
            now: function () {  
                return Date.now();  
            }  
        };  
    }  
  
    // Головний об'єкт плагіна  
    var SURS_QUALITY = {  
        log: function (message) {  
            console.log('[SursQuality]', message);  
        },  
          
        // Функція перекладу якості з підтримкою Dolby Vision та HDR  
        translateQuality: function (quality, isCamrip, title) {  
            if (isCamrip) {  
                return 'Екранка';  
            }  
              
            var lowerTitle = (title || '').toLowerCase();  
              
            // Перевірка на Dolby Vision  
            if (/\b(dolby\s*vision|dov|dv)\b/i.test(lowerTitle)) {  
                if (typeof quality === 'number' && quality >= 2160) {  
                    return '4K DV';  
                } else if (typeof quality === 'number' && quality >= 1080) {  
                    return 'FHD DV';  
                } else {  
                    return 'DV';  
                }  
            }  
              
            // Перевірка на HDR  
            if (/\b(hdr|hdr10|hdr10\+)\b/i.test(lowerTitle)) {  
                if (typeof quality === 'number' && quality >= 2160) {  
                    return '4K HDR';  
                } else if (typeof quality === 'number' && quality >= 1080) {  
                    return 'FHD HDR';  
                } else {  
                    return 'HDR';  
                }  
            }  
              
            // Стандартна якість  
            if (typeof quality === 'number') {  
                if (quality >= 2160) return '4K';  
                if (quality >= 1080) return 'FHD';  
                if (quality >= 720) return 'HD';  
                if (quality >= 480) return 'SD';  
            }  
              
            return '';  
        },  
          
        // Аналіз торрентів  
        analyzeTorrents: function (movieData, renderElement) {  
            var startTime = performance.now();  
            SURS_QUALITY.log('Початок аналізу торрентів');  
              
            // Симуляція API запиту до JacRed  
            setTimeout(function () {  
                var torrents = [  
                    {  
                        title: 'Movie.2024.2160p.Dolby.Vision.HDR10+.BluRay.x264',  
                        quality: 2160,  
                        size: '15.3 GB',  
                        tracker: 'tracker1'  
                    },  
                    {  
                        title: 'Movie.2024.1080p.HDR10.BluRay.x264',  
                        quality: 1080,  
                        size: '8.7 GB',  
                        tracker: 'tracker2'  
                    },  
                    {  
                        title: 'Movie.2024.1080p.BluRay.x264',  
                        quality: 1080,  
                        size: '7.2 GB',  
                        tracker: 'tracker3'  
                    }  
                ];  
                  
                // Відображення результатів  
                var qualityHtml = '<div class="surs-quality-info">';  
                torrents.forEach(function (torrent) {  
                    var quality = SURS_QUALITY.translateQuality(torrent.quality, false, torrent.title);  
                    qualityHtml += '<div class="torrent-item">';  
                    qualityHtml += '<span class="torrent-title">' + torrent.title + '</span>';  
                    qualityHtml += '<span class="torrent-quality">' + quality + '</span>';  
                    qualityHtml += '<span class="torrent-size">' + torrent.size + '</span>';  
                    qualityHtml += '</div>';  
                });  
                qualityHtml += '</div>';  
                  
                if (renderElement) {  
                    renderElement.insertAdjacentHTML('beforeend', qualityHtml);  
                }  
                  
                SURS_QUALITY.log('Аналіз завершено за ' + (performance.now() - startTime).toFixed(2) + 'ms');  
            }, 500);  
        }  
    };  
  
    // Функція для отримання якості для картки  
    function fetchQualityForCard(movie, render) {  
        if (!movie || !render) return;  
          
        SURS_QUALITY.log('Отримання якості для: ' + (movie.title || 'Unknown'));  
          
        // Перевірка чи вже є контейнер якості  
        var existingContainer = render.querySelector('.surs-quality-container');  
        if (existingContainer) {  
            existingContainer.remove();  
        }  
          
        // Створення контейнера  
        var qualityContainer = document.createElement('div');  
        qualityContainer.className = 'surs-quality-container';  
        qualityContainer.style.cssText = `  
            margin-top: 10px;  
            padding: 8px;  
            background: rgba(0,0,0,0.8);  
            border-radius: 4px;  
            color: white;  
            font-size: 12px;  
        `;  
          
        // Додавання до рендер елемента  
        render.appendChild(qualityContainer);  
          
        // Запуск аналізу  
        SURS_QUALITY.analyzeTorrents(movie, qualityContainer);  
    }  
  
    // Функція для логування виконання  
    function logExecution(functionName, startTime, message) {  
        var duration = performance.now() - startTime;  
        SURS_QUALITY.log(message + ' (' + duration.toFixed(2) + 'ms)');  
    }  
  
    // Ініціалізація плагіна  
    function startPlugin() {  
        var startTime = performance.now();  
        SURS_QUALITY.log('Запуск плагіна якості!');  
        window.sursQualityPlugin = true;  
  
        Lampa.Listener.follow('full', function (e) {  
            if (e.type === 'complite') {  
                var render = e.object.activity.render();  
                fetchQualityForCard(e.data.movie, render);  
            }  
        });  
        logExecution('startPlugin', startTime, 'Плагін запущено');  
    }  
  
    if (!window.sursQualityPlugin) {  
        startPlugin();  
    }  
})();
