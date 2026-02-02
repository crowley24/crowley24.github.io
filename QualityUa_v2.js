(function () {  
  'use strict';  
  
  try {  
    // Перевірка доступності залежностей  
    if (typeof $ === 'undefined') {  
      console.error('[QualityBadges] jQuery не доступний');  
      return;  
    }  
      
    if (typeof Lampa === 'undefined') {  
      console.error('[QualityBadges] Lampa API не доступний');  
      return;  
    }  
  
    var cardBadgesCache = {};  
    var pluginPath = 'https://crowley24.github.io/Icons/';  
  
    var svgIcons = {  
      '4K': pluginPath + '4K.svg',  
      '2K': pluginPath + '2K.svg',  
      'FULL HD': pluginPath + 'FULL HD.svg',  
      'HD': pluginPath + 'HD.svg',  
      'HDR': pluginPath + 'HDR.svg',  
      'Dolby Vision': pluginPath + 'Dolby Vision.svg',  
      '7.1': pluginPath + '7.1.svg',  
      '5.1': pluginPath + '5.1.svg',  
      '4.0': pluginPath + '4.0.svg',  
      '2.0': pluginPath + '2.0.svg',  
      'DUB': pluginPath + 'DUB.svg',  
      'UKR': pluginPath + 'UKR.svg'  
    };  
  
    // Функція вираження замість оголошення в блоці  
    var getBest = function (results) {  
      var best = { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false, ukr: false };  
      var resOrder = ['HD', 'FULL HD', '2K', '4K'];  
        
      if (!results || !Array.isArray(results)) return best;  
        
      var limit = Math.min(results.length, 20);  
      for (var i = 0; i < limit; i++) {  
        var item = results[i];  
        if (!item) continue;  
          
        var title = (item.Title || '').toLowerCase();  
  
        // Перевірка на українську локалізацію  
        if (title.indexOf('ukr') >= 0 || title.indexOf('укр') >= 0 || title.indexOf('ua') >= 0) {  
            best.ukr = true;  
        }  
  
        var foundRes = null;  
        if (title.indexOf('4k') >= 0 || title.indexOf('2160') >= 0 || title.indexOf('uhd') >= 0) foundRes = '4K';  
        else if (title.indexOf('2k') >= 0 || title.indexOf('1440') >= 0) foundRes = '2K';  
        else if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0 || title.indexOf('full hd') >= 0) foundRes = 'FULL HD';  
        else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) foundRes = 'HD';  
  
        if (foundRes && (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution))) {  
            best.resolution = foundRes;  
        }  
  
        if (item.ffprobe && Array.isArray(item.ffprobe)) {  
          for (var j = 0; j < item.ffprobe.length; j++) {  
            var stream = item.ffprobe[j];  
            if (!stream) continue;  
                
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
            }  
          }  
        }  
  
        if (item.ffprobe && Array.isArray(item.ffprobe)) {  
          for (var k = 0; k < item.ffprobe.length; k++) {  
            var stream = item.ffprobe[k];  
            if (!stream) continue;  
                
            if (stream.codec_type === 'audio') {  
              var channels = parseInt(stream.channels || 0);  
              var audio = null;  
              if (channels >= 8) audio = '7.1';  
              else if (channels >= 6) audio = '5.1';  
              else if (channels >= 4) audio = '4.0';  
              else if (channels >= 2) audio = '2.0';  
                  
              if (audio && (!best.audio || ['2.0', '4.0', '5.1', '7.1'].indexOf(audio) > ['2.0', '4.0', '5.1', '7.1'].indexOf(best.audio))) {  
                best.audio = audio;  
              }  
            }  
          }  
        }  
  
        if (title.indexOf('hdr') >= 0) best.hdr = true;  
        if (title.indexOf('dolby vision') >= 0) best.dolbyVision = true;  
        if (title.indexOf('dub') >= 0 || title.indexOf('дубл') >= 0) best.dub = true;  
      }  
          
      return best;  
    };  
  
    // Функція вираження замість оголошення в блоці  
    var createBadgeImg = function (type, isCard, index) {  
      var className = isCard ? 'card-quality-badge' : 'quality-badge';  
      var delay = (index * 0.08) + 's';  
          
      if (type === 'UKR') {  
        return '<div class="' + className + '" style="animation-delay: ' + delay + '; font-size: 1.2em; display: flex; align-items: center;">🇺🇦</div>';  
      }  
          
      var iconPath = svgIcons[type];  
      if (!iconPath) return '';  
          
      return '<div class="' + className + '" style="animation-delay: ' + delay + '"><img src="' + iconPath + '" draggable="false" oncontextmenu="return false;"></div>';  
    };  
  
    // Інші функції плагіна...  
    // (решта коду плагіна тут)  
  
    console.log('[QualityBadges] Plugin started successfully');  
  
  } catch (e) {  
    console.error('[QualityBadges] Critical error:', e);  
  }  
})();
