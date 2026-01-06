//Оригінальний плагін https://github.com/FoxStudio24/lampa/blob/main/Quality/Quality.js  
  
(function () {  
  'use strict';  
  
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
            if (stream.color_transfer && stream.color_transfer.indexOf('HDR') >= 0) best.hdr = true;  
          }  
          if (stream.codec_type === 'audio') {  
            var channels = parseInt(stream.channels || 0);  
            if (channels >= 8) best.audio = '7.1';  
            else if (channels >= 6) best.audio = '5.1';  
            else if (channels >= 4) best.audio = '4.0';  
            else if (channels >= 2) best.audio = '2.0';  
          }  
        });  
      }  
  
      if (item.Audio) {  
        if (item.Audio.indexOf('7.1') >= 0) best.audio = '7.1';  
        else if (item.Audio.indexOf('5.1') >= 0) best.audio = '5.1';  
        else if (item.Audio.indexOf('4.0') >= 0) best.audio = '4.0';  
        else if (item.Audio.indexOf('2.0') >= 0) best.audio = '2.0';  
      }  
  
      if (item.Audio && item.Audio.toLowerCase().indexOf('dub') >= 0) best.dub = true;  
      if (title.indexOf('dub') >= 0) best.dub = true;  
    }  
      
    return best;  
  }  
  
  function createBadgeImg(type, isSvg, index) {  
    if (isSvg) {  
      return '<img class="card-quality-badge" src="' + svgIcons[type] + '" alt="' + type + '" style="animation-delay: ' + (index * 0.1) + 's">';  
    } else {  
      var color = '#4CAF50';  
      if (type === 'NO DATA') color = '#FF9800';  
      else if (type === 'PARSER OFF') color = '#F44336';  
      else if (type === 'NO INFO') color = '#2196F3';  
        
      return '<div class="card-quality-badge" style="background: ' + color + '; color: white; padding: 2px 4px; font-size: 10px; font-weight: bold; animation-delay: ' + (index * 0.1) + 's">' + type + '</div>';  
    }  
  }  
  
  function addCardBadges(card, best) {  
    if (!card || !card.length) return;  
      
    var badges = [];  
    if (best.resolution) badges.push(createBadgeImg(best.resolution, true, badges.length));  
    if (best.hdr) badges.push(createBadgeImg('HDR', true, badges.length));  
    if (best.audio) badges.push(createBadgeImg(best.audio, true, badges.length));  
    if (best.dub) badges.push(createBadgeImg('DUB', true, badges.length));  
    if (best.dolbyVision) badges.push(createBadgeImg('Dolby Vision', true, badges.length));  
      
    if (badges.length === 0) {  
      badges.push(createBadgeImg('NO INFO', false, 0));  
    }  
      
    var container = card.find('.card-quality-badges');  
    if (!container.length) {  
      container = $('<div class="card-quality-badges"></div>');  
      card.find('.card__view').append(container);  
    }  
    container.html(badges.join(''));  
  }  
  
  function processCards() {  
    console.log('[QualityBadges] Processing cards...');  
      
    $('.card').each(function(index) {  
      var card = $(this);  
      if (card.hasClass('quality-processed')) return;  
        
      card.addClass('quality-processed');  
      var movie = card.data('item') || card.data('movie') || card.data();  
      var title = card.find('.card__title').text() || 'Unknown';  
        
      console.log('[QualityBadges] Processing card]', index);  
      console.log('[QualityBadges] Card data:]', {hasData: !!movie, title: title, dataKeys: movie ? Object.keys(movie) : []});  
        
      if (!movie || Object.keys(movie).length === 0) {  
        // Немає даних - показуємо fallback бейдж  
        addCardBadges(card, { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false });  
        return;  
      }  
        
      if (Lampa.Storage.field('parser_use')) {  
        console.log('[QualityBadges] Parser enabled: true');  
        Lampa.Parser.get({ search: title, movie: movie, page: 1 }, function(response) {  
          console.log('[QualityBadges] Parser response:]', response);  
          if (response && response.Results) {  
            var best = getBest(response.Results);  
            addCardBadges(card, best);  
          } else {  
            addCardBadges(card, { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false });  
          }  
        });  
      } else {  
        console.log('[QualityBadges] Parser disabled');  
        addCardBadges(card, { resolution: null, hdr: false, dolbyVision: false, audio: null, dub: false });  
      }  
    });  
  }  
  
  Lampa.Listener.follow('full', function(e) {  
    if (e.type !== 'complite') return;  
    var details = $('.full-start-new__details');  
    if (details.length) {  
      if (!$('.quality-badges-container').length) details.after('<div class="quality-badges-container"></div>');  
      Lampa.Parser.get({ search: e.data.movie.title || e.data.movie.name, movie: e.data.movie, page: 1 }, function(response) {  
        if (response && response.Results) {  
          var best = getBest(response.Results);  
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
  });  
  
  var observer = new MutationObserver(function(mutations) {  
    mutations.forEach(function(mutation) {  
      if (mutation.addedNodes.length) {  
        setTimeout(processCards, 500);  
      }  
    });  
  });  
  
  observer.observe(document.body, {  
    childList: true,  
    subtree: true  
  });  
  
  setTimeout(processCards, 2000);  
    
  $(window).on('scroll', function() {  
    setTimeout(processCards, 300);  
  });  
  
  var style = '<style>' +  
    '.quality-badges-container { display: flex; gap: 0.3em; margin: 0 0 0.4em 0; min-height: 1.2em; pointer-events: none; }' +  
    '.quality-badge { height: 1.2em; opacity: 0; transform: translateY(8px); animation: qb_in 0.4s ease forwards; }' +  
    '.card-quality-badges { position: absolute; top: 0.3em; right: 0.3em; display: flex; flex-direction: row; gap: 0.2em; pointer-events: none; z-index: 5; }' +  
    '.card-quality-badge { height: 0.9em; opacity: 0; transform: translateY(5px); animation: qb_in 0.3s ease forwards; }' +  
    '@keyframes qb_in { to { opacity: 1; transform: translateY(0); } }' +  
    '.quality-badge img, .card-quality-badge img { height: 100%; width: auto; display: block; }' +  
    '.card-quality-badge img { filter: drop-shadow(0 1px 2px #000); }' +  
    '@media (max-width: 768px) {' +  
      '.quality-badges-container { gap: 0.25em; margin: 0 0 0.35em 0; min-height: 1em; }' +  
      '.quality-badge { height: 1em; }' +  
      '.card-quality-badges { top: 0.25em; right: 0.25em; gap: 0.18em; }' +  
      '.card-quality-badge { height: 0.75em; }' +  
    '}' +  
  '</style>';  
  $('body').append(style);  
  
  console.log('[QualityBadges] Plugin loaded with fallback support');  
  
})();
