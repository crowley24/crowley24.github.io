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
    if (!window.performance || !window.performance.now) {  
        window.performance = {  
            now: function () {  
                return Date.now();  
            }  
        };  
    }  
  
    // Головний об'єкт плагіна  
    const SURS_QUALITY = {  
        name: 'sursQuality',  
        version: '1.0.0',  
        log: function (message) {  
            console.log('[SURS Quality]', message);  
        }  
    };  
  
    // Функція для логування виконання  
    function logExecution(functionName, startTime, message) {  
        const endTime = performance.now();  
        const duration = (endTime - startTime).toFixed(2);  
        SURS_QUALITY.log(`${message} - ${functionName} виконано за ${duration}ms`);  
    }  
  
    // Функція перекладу якості з підтримкою Dolby Vision та HDR  
    function translateQuality(quality, isCamrip, title) {  
        if (isCamrip) {  
            return 'Екранка';  
        }  
          
        const lowerTitle = (title || '').toLowerCase();  
          
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
        if (/\b(hdr|hdr10|hdr10\+|hlg)\b/i.test(lowerTitle)) {  
            if (typeof quality === 'number' && quality >= 2160) {  
                return '4K HDR';  
            } else if (typeof quality === 'number' && quality >= 1080) {  
                return 'FHD HDR';  
            } else {  
                return 'HDR';  
            }  
        }  
          
        // Стандартна логіка якості  
        if (typeof quality === 'number') {  
            if (quality >= 2160) return '4K';  
            if (quality >= 1080) return 'FHD';  
            if (quality >= 720) return 'HD';  
            if (quality >= 480) return 'SD';  
        }  
          
        return quality || 'Невідомо';  
    }  
  
    // Функція отримання якості з назви  
    function extractQualityFromTitle(title) {  
        const lowerTitle = title.toLowerCase();  
          
        // Dolby Vision пріоритет  
        if (/\b(dolby\s*vision|dov|dv)\b/i.test(lowerTitle)) {  
            if (lowerTitle.includes('2160p') || lowerTitle.includes('4k')) return 2160;  
            if (lowerTitle.includes('1080p')) return 1080;  
            return 1080;  
        }  
          
        // HDR другий пріоритет  
        if (/\b(hdr|hdr10|hdr10\+|hlg)\b/i.test(lowerTitle)) {  
            if (lowerTitle.includes('2160p') || lowerTitle.includes('4k')) return 2160;  
            if (lowerTitle.includes('1080p')) return 1080;  
            return 1080;  
        }  
          
        // Стандартна якість  
        if (lowerTitle.includes('2160p') || lowerTitle.includes('4k')) return 2160;  
        if (lowerTitle.includes('1080p')) return 1080;  
        if (lowerTitle.includes('720p')) return 720;  
        if (lowerTitle.includes('480p')) return 480;  
          
        return 0;  
    }  
  
    // Функція для отримання якості торрента  
    async function fetchQualityForCard(movieData, renderElement) {  
        const startTime = performance.now();  
        SURS_QUALITY.log('Аналіз якості для:', movieData.title);  
          
        try {  
            // Симуляція аналізу торрентів (замініть на реальний API виклик)  
            const torrents = await analyzeTorrents(movieData);  
              
            if (torrents.length > 0) {  
                const bestTorrent = torrents[0];  
                const quality = translateQuality(  
                    bestTorrent.quality,  
                    bestTorrent.isCamrip,  
                    bestTorrent.title  
                );  
                  
                // Оновлення інтерфейсу  
                updateQualityDisplay(renderElement, quality, bestTorrent);  
                  
                SURS_QUALITY.log(`Знайдено якість: ${quality}`);  
            } else {  
                SURS_QUALITY.log('Торренти не знайдені');  
            }  
        } catch (error) {  
            SURS_QUALITY.log('Помилка аналізу:', error.message);  
        }  
          
        logExecution('fetchQualityForCard', startTime, 'Аналіз якості завершено');  
    }  
  
    // Функція аналізу торрентів (заглушка)  
    async function analyzeTorrents(movieData) {  
        // Тут має бути реальний API виклик до JacRed або іншого джерела  
        // Повертаємо тестові дані для демонстрації  
        return [  
            {  
                title: movieData.title + ' 2160p DV BluRay',  
                quality: 2160,  
                isCamrip: false,  
                size: '50 GB',  
                seeders: 15  
            },  
            {  
                title: movieData.title + ' 1080p HDR10+ WEB-DL',  
                quality: 1080,  
                isCamrip: false,  
                size: '15 GB',  
                seeders: 25  
            },  
            {  
                title: movieData.title + ' 1080p BluRay',  
                quality: 1080,  
                isCamrip: false,  
                size: '12 GB',  
                seeders: 30  
            }  
        ];  
    }  
  
    // Функція оновлення відображення якості  
    function updateQualityDisplay(renderElement, quality, torrent) {  
        if (!renderElement) return;  
          
        // Створення елемента якості  
        const qualityElement = document.createElement('div');  
        qualityElement.className = 'surs-quality-badge';  
        qualityElement.innerHTML = `  
            <span class="quality-text">${quality}</span>  
            <span class="quality-info">${torrent.size} / ${torrent.seeders} роздач</span>  
        `;  
          
        // Стилі для значка якості  
        const style = document.createElement('style');  
        style.textContent = `  
            .surs-quality-badge {  
                position: absolute;  
                top: 10px;  
                right: 10px;  
                background: linear-gradient(135deg, #ff6b6b, #4ecdc4);  
                color: white;  
                padding: 4px 8px;  
                border-radius: 4px;  
                font-size: 12px;  
                font-weight: bold;  
                z-index: 10;  
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);  
            }  
            .quality-text {  
                display: block;  
                font-size: 14px;  
            }  
            .quality-info {  
                display: block;  
                font-size: 10px;  
                opacity: 0.8;  
            }  
        `;  
          
        if (!document.getElementById('surs-quality-styles')) {  
            style.id = 'surs-quality-styles';  
            document.head.appendChild(style);  
        }  
          
        // Додавання значка до елемента  
        renderElement.style.position = 'relative';  
        renderElement.appendChild(qualityElement);  
    }  
  
    // Ініціалізація плагіна  
    function startPlugin() {  
        const startTime = performance.now();  
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
