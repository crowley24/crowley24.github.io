// Об'єднаний плагін якості з JacRed API та SVG іконками  
(function () {  
  'use strict';  
  
  // Перевірка залежностей  
  if (typeof $ === 'undefined' || typeof Lampa === 'undefined') {  
    console.error('[QualityBadges] jQuery або Lampa не доступні');  
    return;  
  }  
  
  // SVG іконки з першого плагіна  
  var pluginPath = 'https://raw.githubusercontent.com/FoxStudio24/lampa/main/Quality/';  
  var svgIcons = {  
    '4K': pluginPath + 'Quality_ico/4K.svg',  
    '2K': pluginPath + 'Quality_ico/2K.svg',  
    'FULL HD': pluginPath + 'Quality_ico/FULL HD.svg',  
    'HD': pluginPath + 'Quality_ico/HD.svg',  
    'HDR': pluginPath + 'Quality_ico/HDR.svg',  
    'Dolby Vision': pluginPath + 'Quality_ico/Dolby Vision.svg',  
    '7.1': pluginPath + 'Quality_ico/7.1.svg',  
    '5.1': pluginPath + 'Quality_ico/5.1.svg',  
    '4.0': pluginPath + 'Quality_ico/4.0.svg',  
    '2.0': pluginPath + 'Quality_ico/2.0.svg',  
    'DUB': pluginPath + 'Quality_ico/DUB.svg'  
  };  
  
  // Конфігурація з другого плагіна  
  var Config = {  
    Q_LOGGING: true,  
    QUALITY_CACHE: 'maxsm_ratings_quality_cache',  
    JACRED_PROTOCOL: 'http://',  
    JACRED_URL: Lampa.Storage.get('jacred.xyz') || 'jacred.xyz',  
    PROXY_TIMEOUT: 5000,  
    PROXY_LIST: [  
      'http://api.allorigins.win/raw?url=',  
      'http://cors.bwa.workers.dev/'  
    ],  
    MAX_CONCURRENT_REQUESTS: 3,  
    RETRY_ATTEMPTS: 3,  
    RETRY_DELAY: 1000,  
    BATCH_SIZE: 5,  
    TTL: {  
      quality: 24 * 60 * 60 * 1000,  
      error: 5 * 60 * 1000,  
      no_quality: 60 * 60 * 1000  
    }  
  };  
  
  // Утиліти з другого плагіна  
  var Utils = {  
    debounce: function(func, wait) {  
      var timeout;  
      return function executedFunction() {  
        var context = this;  
        var args = arguments;  
        var later = function() {  
          clearTimeout(timeout);  
          func.apply(context, args);  
        };  
        clearTimeout(timeout);  
        timeout = setTimeout(later, wait);  
      };  
    },  
  
    logWithContext: function(level, message, context) {  
      if (!Config.Q_LOGGING) return;  
      console[level]('[QualityBadges] ' + message, context || {});  
    }  
  };  
  
  // API модуль з другого плагіна  
  var API = {  
    activeRequests: 0,  
    requestQueue: [],  
  
    processQueue: function() {  
      if (this.activeRequests >= Config.MAX_CONCURRENT_REQUESTS || this.requestQueue.length === 0) {  
        return;  
      }  
      this.activeRequests++;  
      var request = this.requestQueue.shift();  
      this.fetchWithProxyRetry(request.url, request.cardId, function(error, responseText) {  
        API.activeRequests--;  
        request.callback(error, responseText);  
        API.processQueue();  
      });  
    },  
  
    queueRequest: function(url, cardId, callback) {  
      this.requestQueue.push({ url: url, cardId: cardId, callback: callback });  
      this.processQueue();  
    },  
  
    fetchWithProxyRetry: function(url, cardId, callback, retries, attempt) {  
      attempt = attempt || 1;  
      retries = retries || Config.RETRY_ATTEMPTS;  
      this.fetchWithProxy(url, cardId, function(error, responseText) {  
        if (error && retries > 0) {  
          var delay = Config.RETRY_DELAY * Math.pow(2, attempt - 1);  
          setTimeout(function() {  
            API.fetchWithProxyRetry(url, cardId, callback, retries - 1, attempt + 1);  
          }, delay);  
        } else {  
          callback(error, responseText);  
        }  
      });  
    },  
  
    fetchWithProxy: function(url, cardId, callback) {  
      var currentProxyIndex = 0;  
      var callbackCalled = false;  
  
      function tryNextProxy() {  
        if (currentProxyIndex >= Config.PROXY_LIST.length) {  
          if (!callbackCalled) {  
            callbackCalled = true;  
            callback(new Error('All proxies failed for ' + url));  
          }  
          return;  
        }  
  
        var proxyUrl = Config.PROXY_LIST[currentProxyIndex] + encodeURIComponent(url);  
        var timeoutId = setTimeout(function() {  
          if (!callbackCalled) {  
            currentProxyIndex++;  
            tryNextProxy();  
          }  
        }, Config.PROXY_TIMEOUT);  
  
        fetch(proxyUrl)  
          .then(function(response) {  
            clearTimeout(timeoutId);  
            if (!response.ok) throw new Error('Proxy error: ' + response.status);  
            return response.text();  
          })  
          .then(function(data) {  
            if (!callbackCalled) {  
              callbackCalled = true;  
              clearTimeout(timeoutId);  
              callback(null, data);  
            }  
          })  
          .catch(function(error) {  
            clearTimeout(timeoutId);  
            if (!callbackCalled) {  
              currentProxyIndex++;  
              tryNextProxy();  
            }  
          });  
      }  
      tryNextProxy();  
    }  
  };  
  
  // Кешування з другого плагіна  
  var Cache = {  
    get: function(key) {  
      try {  
        var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};  
        var item = cache[key];  
        if (!item) return null;  
        var now = Date.now();  
        var ttl = Config.TTL[item.type] || Config.TTL.quality;  
        if (now - item.timestamp < ttl) {  
          return item;  
        } else {  
          delete cache[key];  
          Lampa.Storage.set(Config.QUALITY_CACHE, cache);  
        }  
      } catch (error) {  
        Utils.logWithContext('error', 'Cache read error', { key: key, error: error });  
      }  
      return null;  
    },  
  
    set: function(key, data, type) {  
      type = type || 'quality';  
      try {  
        var cache = Lampa.Storage.get(Config.QUALITY_CACHE) || {};  
        cache[key] = {  
          quality: data.quality || null,  
          timestamp: Date.now(),  
          type: type  
        };  
        Lampa.Storage.set(Config.QUALITY_CACHE, cache);  
      } catch (error) {  
        Utils.logWithContext('error', 'Cache write error', { key: key, error: error });  
      }  
    }  
  };  
  
  // Функція getBest з першого плагіна  
  function getBest(results) {  
    var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false };  
    var resOrder = ['HD', 'FULL HD', '2K', '4K'];  
    var audioOrder = ['2.0', '4.0', '5.1', '7.1'];  
      
    var limit = Math.min(results.length, 20);  
    for (var i = 0; i < limit; i++) {  
      var item = results[i];  
      var title = (item.Title || '').toLowerCase();  
  
      var foundRes = null;  
      if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0 || title.indexOf('uhd') >= 0) foundRes = '4K';  
      else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';  
      else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';  
      else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';  
  
      if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) {  
        best.resolution = foundRes;  
      }  
  
      if (item.ffprobe && Array.isArray(item.ffprobe)) {  
        item.ffprobe.forEach(function(stream) {  
          if (stream.codec_type === 'video') {  
            var h = parseInt(stream.height || 0);  
            var w = parseInt(stream.width || 0);  
            var res = null;  
            if (h >= 2160 || w >= 3840) res = '4K';  
            else if (h >= 1440 || w >= 2560) res = '2K';  
            else if (h >= 1080 || w >= 1920) res = 'FULL HD';  
            else if (h >= 720 || w >= 1280) res = 'HD';  
              
            if (res && (!best.resolution || resOrder.indexOf(res) > resOrder.indexOf(best.resolution))) {  
              best.resolution = res;  
            }  
            if (stream.side_data_list && JSON.stringify(stream.side_data_list).indexOf('Vision') >= 0) best.dolbyVision = true;  
            if (stream.color_transfer === 'smpte2084' || stream.color_transfer === 'arib-std-b67') best.hdr = true;  
          }  
          if (stream.codec_type === 'audio' && stream.channels) {  
            var ch = parseInt(stream.channels);  
            var aud = (ch >= 8) ? '7.1' : (ch >= 6) ? '5.1' : (ch >= 4) ? '4.0' : '2.0';  
            if (!best.audio || audioOrder.indexOf(aud) > audioOrder.indexOf(best.audio)) best.audio = aud;  
          }  
        });  
      }  
        
      if (title.indexOf('vision') >= 0 || title.indexOf('dovi') >= 0) best.dolbyVision = true;  
      if (title.indexOf('hdr') >= 0) best.hdr = true;  
      if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;  
    }  
    if (best.dolbyVision) best.hdr = true;  
    return best;  
  }  
  
  // Функція створення бейджів з першого плагіна  
  function createBadgeImg(type, isCard, index) {  
    var iconPath = svgIcons[type];  
    if (!iconPath) return '';  
    var className = isCard ? 'card-quality-badge' : 'quality-badge';  
    var delay = (index * 0.08) + 's';  
    return '<div class="' + className + '" style="animation-delay: ' + delay + '"><img src="' + iconPath + '" draggable="false" oncontextmenu="return false;" onerror="this.style.display=\'none\'"></div>';  
  }  
  
  // Функція додавання бейджів до карток  
  function addCardBadges(card, best) {  
    if (card.find('.card-quality-badges').length) return;  
    var badges = [];  
    if (best.resolution) badges.push(createBadgeImg(best.resolution, true, badges.length));  
    if (best.hdr) badges.push(createBadgeImg('HDR', true, badges.length));  
    if (best.audio) badges.push(createBadgeImg(best.audio, true, badges.length));  
    if (best.dub) badges.push(createBadgeImg('DUB', true, badges.length));  
    if (best.dolbyVision) badges.push(createBadgeImg('Dolby Vision', true, badges.length));  
    if (badges.length) card.find('.card__view').append('<div class="card-quality-badges">' + badges.join('') + '</div>');  
  }  
  
  // Функція отримання якості з JacRed  
  function getQualityFromJacred(title, year, callback) {  
    var userId = Lampa.Storage.get('lampac_unic_id', '');  
    var apiUrl = Config.JACRED_PROTOCOL + Config.JACRED_URL + '/api/v1.0/torrents?search=' +  
      encodeURIComponent(title) + '&year=' + year + '&uid=' + userId;  
  
    API.queueRequest(apiUrl, title, function(error, responseText) {  
      if (error) {  
        callback(null);  
        return;  
      }  
      if (!responseText) {  
        callback(null);  
        return;  
      }  
  
      try {  
        var torrents = JSON.parse(responseText);  
        if (!Array.isArray(torrents) || torrents.length === 0) {  
          callback(null);  
          return;  
        }  
  
        // Конвертуємо результати JacRed у формат, який розуміє getBest  
        var convertedResults = torrents.map(function(torrent) {  
          return {  
            Title: torrent.title || '',  
            quality: torrent.quality || 0,  
            ffprobe: torrent.ffprobe || []  
          };  
        });  
  
        var best = getBest(convertedResults);  
        callback(best);  
      } catch (e) {  
        callback(null);  
      }  
    });  
  }  
  
  // Обробка карток на головному екрані  
  function processCards() {  
    $('.card:not(.qb-processed)').addClass('qb-processed').each(function() {  
      var card = $(this);  
      var movie = card.data('item') || card.data('movie');  
        
      if (movie) {  
        var title = movie.title || movie.name || '';  
        var year = movie.year || movie.release_date || '';  
          
        if (title) {  
          // Спробуємо отримати з кешу  
          var cacheKey = 'movie_' + movie.id + '_' + title;  
          var cached = Cache.get(cacheKey);  
            
          if (cached && cached.quality) {  
            // Конвертуємо кешовану якість у формат best  
            var best = { resolution: cached.quality };  
            addCardBadges(card, best);  
          } else {  
            // Запитуємо з JacRed  
            getQualityFromJacred(title, year, function(best) {  
              if (best) {  
                addCardBadges(card, best);  
                // Зберігаємо в кеш  
                Cache.set(cacheKey, { quality: best.resolution });  
              }  
            });  
          }  
        }  
      }  
    });  
  }  
  
  // Обробка повної картки фільму  
  Lampa.Listener.follow('full', function(e) {  
    if (e.type !== 'complite') return;  
    var details = $('.full-start-new__details');  
    if (details.length) {  
      if (!$('.quality-badges-container').length) {  
        details.after('<div class="quality-badges-container"></div>');  
      }  
        
      var movie = e.data.movie;  
      var title = movie.title || movie.name || '';  
      var year = movie.year || movie.release_date || '';  
        
      if (title) {  
        getQualityFromJacred(title, year, function(best) {  
          if (best) {  
            var badges = [];  
            if (best.resolution) badges.push(createBadgeImg(best.resolution, false, badges.length));  
            if (best.hdr) badges.push(createBadgeImg('HDR', false, badges.length));  
            if (best.audio) badges.push(createBadgeImg(best.audio, false, badges.length));  
            if (best.dub) badges.push(createBadgeImg('DUB', false, badges.length));  
            if (best.dolbyVision) badges.push(createBadgeImg('Dolby Vision', false, badges.length));  
            $('.quality-badges-container').html(badges.join(''));  
          }  
        });  
      }  
    }  
  });  
  
// Стилі з першого плагіна    
  var style = '<style>\  
    .quality-badges-container { display: flex; gap: 0.3em; margin: 0 0 0.4em 0; min-height: 1.2em; pointer-events: none; }\  
    .quality-badge { height: 1.2em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; }\  
    .card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; pointer-events: none; z-index: 5; }\  
    .card-quality-badge { height: 0.9em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }\  
    @keyframes qb_in { to { opacity: 1; transform: translateY(0); } }\  
    .quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; }\  
    .card-quality-badge img { filter: drop-shadow(0 1px 2px #000); }\  
    @media (max-width: 768px) {\  
      .quality-badges-container { gap: 0.25em; margin: 0 0 0.35em 0; min-height: 1em; }\  
      .quality-badge { height: 1em; }\  
      .card-quality-badges { top: 0.25em; right: 0.25em; gap: 0.18em; }\  
      .card-quality-badge { height: 0.75em; }\  
    }\  
  </style>';  
  $('body').append(style);  
  
  console.log('[QualityBadges] Об\'єднаний плагін завантажено');  
})();
