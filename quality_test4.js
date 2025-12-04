(function () {  
    'use strict';  
      
    var Q_LOGGING = true; // Логгинг качества  
    var Q_CACHE_TIME = 24 * 60 * 60 * 1000; // Время кеширования качества  
    var QUALITY_CACHE = 'maxsm_ratings_quality_cache';  
    var JACRED_PROTOCOL = 'http://'; // Протокол JacRed  
    var JACRED_URL = Lampa.Storage.get('jacred.xyz') || 'jacred.xyz'; // Адрес JacRed  
    var JACRED_API_KEY = Lampa.Storage.get(''); // api ключ JacRed  
    var PROXY_TIMEOUT = 5000; // Таймаут прокси  
    var PROXY_LIST = [  
        'http://api.allorigins.win/raw?url=',  
        'http://cors.bwa.workers.dev/'  
    ];  
  
    // Стили для отображения качества - ПОЛНЫЙ УЛУЧШЕННЫЙ ВИД  
    var style = "<style id=\"maxsm_ratings_quality_style\">  
/* Базовые стили для всех бейджей */  
.card__quality {  
    background: rgba(0, 0, 0, 0.85) !important;  
    color: white !important;  
    border: 2px solid rgba(255, 255, 255, 0.8) !important;  
    border-radius: 4px !important;  
    padding: 2px 6px !important;  
    font-weight: bold !important;  
    font-size: 12px !important;  
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.9) !important;  
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 4px rgba(0, 0, 0, 0.3) !important;  
    backdrop-filter: blur(2px) !important;  
    -webkit-backdrop-filter: blur(2px) !important;  
    letter-spacing: 0.5px !important;  
    transition: all 0.2s ease !important;  
}  
  
/* Dolby Vision - синий градиент */  
.card__quality.dolby-vision {  
    background: linear-gradient(135deg, #0066cc, #003d7a) !important;  
    border-color: #4da6ff !important;  
    box-shadow: 0 2px 8px rgba(0, 102, 204, 0.6), 0 0 12px rgba(77, 166, 255, 0.4) !important;  
}  
  
/* HDR - оранжевый градиент */  
.card__quality.hdr {  
    background: linear-gradient(135deg, #ff6b35, #cc4125) !important;  
    border-color: #ff9966 !important;  
    box-shadow: 0 2px 8px rgba(255, 107, 53, 0.6), 0 0 12px rgba(255, 153, 102, 0.4) !important;  
}  
  
/* 4K - зеленый градиент */  
.card__quality.quality-4k {  
    background: linear-gradient(135deg, #2ecc71, #27ae60) !important;  
    border-color: #58d68d !important;  
    box-shadow: 0 2px 8px rgba(46, 204, 113, 0.6), 0 0 12px rgba(88, 214, 141, 0.4) !important;  
}  
  
/* FHD/1080p - фиолетовый градиент */  
.card__quality.quality-fhd {  
    background: linear-gradient(135deg, #9b59b6, #8e44ad) !important;  
    border-color: #bb8fce !important;  
    box-shadow: 0 2px 8px rgba(155, 89, 182, 0.6), 0 0 12px rgba(187, 143, 206, 0.4) !important;  
}  
  
/* HD/720p - красный градиент */  
.card__quality.quality-hd {  
    background: linear-gradient(135deg, #e74c3c, #c0392b) !important;  
    border-color: #ec7063 !important;  
    box-shadow: 0 2px 8px rgba(231, 76, 60, 0.6), 0 0 12px rgba(236, 112, 99, 0.4) !important;  
}  
  
/* SD/480p - серый градиент */  
.card__quality.quality-sd {  
    background: linear-gradient(135deg, #7f8c8d, #566573) !important;  
    border-color: #aab7b8 !important;  
    box-shadow: 0 2px 8px rgba(127, 140, 141, 0.6), 0 0 12px rgba(170, 183, 184, 0.4) !important;  
}  
  
/* Эффект при наведении */  
.card__quality:hover {  
    transform: scale(1.05) !important;  
    z-index: 10 !important;  
}  
  
/* Дополнительный контраст для светлых постеров */  
.card--light .card__quality {  
    background: rgba(0, 0, 0, 0.95) !important;  
    border-width: 3px !important;  
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7), 0 0 8px rgba(0, 0, 0, 0.5) !important;  
}  
</style>";  
  
    if (!document.getElementById('maxsm_ratings_quality_style')) {  
        document.head.insertAdjacentHTML('beforeend', style);  
    }  
  
    // Функция определения качества с поддержкой всех типов  
    function translateQuality(quality, isCamrip, title) {  
        if (isCamrip) {  
            return 'Екранка';  
        }  
          
        var lowerTitle = (title || '').toLowerCase();  
        var qualityClass = '';  
        var qualityText = '';  
          
        // Определяем базовое качество  
        if (typeof quality === 'number' && quality >= 2160) {  
            qualityText = '4K';  
            qualityClass = 'quality-4k';  
        } else if (typeof quality === 'number' && quality >= 1080) {  
            qualityText = 'FHD';  
            qualityClass = 'quality-fhd';  
        } else if (typeof quality === 'number' && quality >= 720) {  
            qualityText = 'HD';  
            qualityClass = 'quality-hd';  
        } else if (typeof quality === 'number' && quality >= 480) {  
            qualityText = 'SD';  
            qualityClass = 'quality-sd';  
        } else {  
            return '';  
        }  
          
        // Проверяем на Dolby Vision  
        if (/\b(dolby\s*vision|dov|dv)\b/i.test(lowerTitle)) {  
            qualityText += ' DV';  
            qualityClass += ' dolby-vision';  
        }  
        // Проверяем на HDR  
        else if (/\bhdr\b/i.test(lowerTitle)) {  
            qualityText += ' HDR';  
            qualityClass += ' hdr';  
        }  
          
        return qualityText;  
    }  
  
    // Функция получения CSS класса для качества  
    function getQualityClass(quality, title) {  
        var lowerTitle = (title || '').toLowerCase();  
        var qualityClass = '';  
          
        if (typeof quality === 'number' && quality >= 2160) {  
            qualityClass = 'quality-4k';  
        } else if (typeof quality === 'number' && quality >= 1080) {  
            qualityClass = 'quality-fhd';  
        } else if (typeof quality === 'number' && quality >= 720) {  
            qualityClass = 'quality-hd';  
        } else if (typeof quality === 'number' && quality >= 480) {  
            qualityClass = 'quality-sd';  
        }  
          
        if (/\b(dolby\s*vision|dov|dv)\b/i.test(lowerTitle)) {  
            qualityClass += ' dolby-vision';  
        } else if (/\bhdr\b/i.test(lowerTitle)) {  
            qualityClass += ' hdr';  
        }  
          
        return qualityClass;  
    }  
  
    // Функция применения качества к карточке  
    function applyQualityToCard(card, quality, title) {  
        if (!card || !quality) return;  
          
        var qualityElement = card.querySelector('.card__quality') || document.createElement('div');  
        qualityElement.className = 'card__quality';  
          
        var qualityClass = getQualityClass(quality, title);  
        if (qualityClass) {  
            qualityElement.className += ' ' + qualityClass;  
        }  
          
        qualityElement.textContent = quality;  
          
        if (!card.querySelector('.card__quality')) {  
            card.appendChild(qualityElement);  
        }  
    }  
  
    // Основная функция получения лучшего релиза  
    async function getBestReleaseFromJacred(title, originalTitle, year) {  
        var searchTitle = title || originalTitle;  
        if (!searchTitle) return null;  
          
        var apiUrl = JACRED_PROTOCOL + JACRED_URL + '/api/v1.0/torrents?search=' + encodeURIComponent(searchTitle) + '&year=' + year;  
          
        try {  
            var response = await fetch(apiUrl);  
            if (!response.ok) return null;  
              
            var data = await response.json();  
            if (!data.Results || !data.Results.length) return null;  
              
            var bestTorrent = null;  
            var bestQuality = 0;  
              
            for (var i = 0; i < data.Results.length; i++) {  
                var torrent = data.Results[i];  
                var quality = torrent.quality || 0;  
                  
                if (quality > bestQuality) {  
                    bestQuality = quality;  
                    bestTorrent = torrent;  
                }  
            }  
              
            return bestTorrent;  
        } catch (error) {  
            if (Q_LOGGING) console.error('JacRed API error:', error);  
            return null;  
        }  
    }  
  
    // Функция обновления карточек  
    function updateCards(cards) {  
        if (!cards || !cards.length) return;  
          
        cards.forEach(function(card) {  
            var titleElement = card.querySelector('.card__title');  
            var title = titleElement ? titleElement.textContent.trim() : '';  
              
            if (!title) return;  
              
            // Проверяем кеш  
            var cacheKey = QUALITY_CACHE + ':' + title;  
            var cached = localStorage.getItem(cacheKey);  
              
            if (cached) {  
                try {  
                    var cachedData = JSON.parse(cached);  
                    var cacheTime = cachedData.time || 0;  
                      
                    if (Date.now() - cacheTime < Q_CACHE_TIME) {  
                        applyQualityToCard(card, cachedData.quality, cachedData.title);  
                        return;  
                    }  
                } catch (e) {  
                    localStorage.removeItem(cacheKey);  
                }  
            }  
              
            // Запрашиваем данные с JacRed  
            getBestReleaseFromJacred(title).then(function(torrent) {  
                if (torrent) {  
                    var quality = translateQuality(torrent.quality, false, torrent.title);  
                      
                    if (quality) {  
                        applyQualityToCard(card, quality, torrent.title);  
                          
                        // Сохраняем в кеш  
                        localStorage.setItem(cacheKey, JSON.stringify({  
                            quality: quality,  
                            title: torrent.title,  
                            time: Date.now()  
                        }));  
                    }  
                }  
            });  
        });  
    }  
  
    // Инициализация плагина  
    function startPlugin() {  
        if (Q_LOGGING) console.log('MAXSM-RATINGS: Plugin started');  
          
        // Настройки по умолчанию  
        if (localStorage.getItem('maxsm_ratings_quality_enabled') === null) {  
            localStorage.setItem('maxsm_ratings_quality_enabled', 'true');  
        }  
          
        if (localStorage.getItem('maxsm_ratings_quality_tv') === null) {  
            localStorage.setItem('maxsm_ratings_quality_tv', 'false');  
        }  
          
        if (localStorage.getItem('maxsm_ratings_quality_inlist') === null) {  
            localStorage.setItem('maxsm_ratings_quality_inlist', 'true');  
        }  
          
        // Наблюдатель за новыми карточками  
        var observer = new MutationObserver(function(mutations) {  
            var cardsToAdd = [];  
              
            mutations.forEach(function(mutation) {  
                if (mutation.type === 'childList') {  
                    for (var i = 0; i < mutation.addedNodes.length; i++) {  
                        var node = mutation.addedNodes[i];  
                          
                        if (node.nodeType === 1) {  
                            if (node.classList && node.classList.contains('card')) {  
                                cardsToAdd.push(node);  
                            } else if (node.querySelectorAll) {  
                                var cards = node.querySelectorAll ? node.querySelectorAll('.card') : [];  
                                for (var k = 0; k < cards.length; k++) {  
                                    cardsToAdd.push(cards[k]);  
                                }  
                            }  
                        }  
                    }  
                }  
            });  
              
            if (cardsToAdd.length > 0) {  
                setTimeout(function() {  
                    updateCards(cardsToAdd);  
                }, 500);  
            }  
        });  
  
        if (localStorage.getItem('maxsm_ratings_quality_inlist') === 'true') {  
            observer.observe(document.body, { childList: true, subtree: true });  
            if (Q_LOGGING) console.log('MAXSM-RATINGS: observer started');  
              
            // Обработка уже существующих карточек  
            var existingCards = document.querySelectorAll('.card');  
            if (existingCards.length) updateCards(existingCards);  
        }  
    }  
  
    if (!window.maxsmRatingsQualityPlugin) {  
        window.maxsmRatingsQualityPlugin = true;  
        startPlugin();  
    }  
})();
