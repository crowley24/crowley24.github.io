(function () {  
    'use strict';  
      var PLUGIN_NAME = 'NewCard';  
      var PLUGIN_ID = 'new_card_style';  
      var ASSETS_PATH = 'https://crowley38.github.io/Icons/';  
      var CACHE_LIFETIME = 1000 * 60 * 60 * 24;  
      var ICONS = {  
          tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',  
          cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'  
      };  
      var QUALITY_ICONS = {  
          '4K': ASSETS_PATH + '4K.svg',   
          '2K': ASSETS_PATH + '2K.svg',   
          'FULL HD': ASSETS_PATH + 'FULL HD.svg',  
          'HD': ASSETS_PATH + 'HD.svg',   
          'HDR': ASSETS_PATH + 'HDR.svg',   
          'Dolby Vision': ASSETS_PATH + 'Dolby Vision.svg',  
          'UKR': ASSETS_PATH + 'UKR.svg'  
      };  
      var SETTINGS_ICON = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/><rect x="25" y="66" width="30" height="6" rx="3" fill="white" opacity="0.6"/><rect x="60" y="66" width="15" height="6" rx="3" fill="white" opacity="0.6"/></svg>';  
      
      function getRatingColor(val) {  
          var n = parseFloat(val);  
          return n >= 7.5 ? '#2ecc71' : n >= 6 ? '#feca57' : '#ff4d4d';  
      }  
      function formatTime(mins) {  
          if (!mins) return '';  
          var h = Math.floor(mins / 60);  
          var m = mins % 60;  
          return (h > 0 ? h + 'г ' : '') + m + 'хв';  
      }  

      function initializePlugin() {  
          addCustomTemplate();  
          addStyles();  
          addSettings();  
          attachLoader();  
      }  

      function addSettings() {  
          var defaults = {  
              'cas_logo_scale': '100',  
              'cas_logo_quality': 'original',  
              'cas_bg_animation': true,  
              'cas_slideshow_enabled': true,  
              'cas_blocks_gap': '20',  
              'cas_meta_size': '1.3',  
              'cas_show_studios': true,  
              'cas_show_quality': true,  
              'cas_show_rating': true,  
              'cas_show_description': true  
          };  
          Object.keys(defaults).forEach(function(key) {  
              if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]);  
          });  
          Lampa.SettingsApi.addComponent({ component: PLUGIN_ID, name: PLUGIN_NAME, icon: SETTINGS_ICON });  
          Lampa.SettingsApi.addParam({  
              component: PLUGIN_ID,  
              param: { name: 'cas_logo_quality', type: 'select', values: { 'w300':'300px', 'w500':'500px', 'original':'Original' }, default: 'original' },  
              field: { name: 'Якість логотипу' }, onChange: applySettings  
          });  
          Lampa.SettingsApi.addParam({  
              component: PLUGIN_ID,  
              param: { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' }, default: '100' },  
              field: { name: 'Розмір логотипу' }, onChange: applySettings  
          });  
          Lampa.SettingsApi.addParam({  
              component: PLUGIN_ID,  
              param: { name: 'cas_meta_size', type: 'select', values: { '1.2': 'Малий', '1.3': 'Стандартний', '1.4': 'Збільшений', '1.5': 'Великий' }, default: '1.3' },  
              field: { name: 'Розмір шрифту' }, onChange: applySettings  
          });  
          Lampa.SettingsApi.addParam({  
              component: PLUGIN_ID,  
              param: { name: 'cas_blocks_gap', type: 'select', values: { '15':'Тісно','20':'Стандарт','25':'Просторе' }, default: '20' },  
              field: { name: 'Відступи між блоками' }, onChange: applySettings  
          });  
          Lampa.SettingsApi.addParam({  
              component: PLUGIN_ID,  
              param: { name: 'cas_bg_animation', type: 'trigger', default: true },  
              field: { name: 'Анімація фону (Ken Burns)' }, onChange: applySettings  
          });  
          Lampa.SettingsApi.addParam({   
              component: PLUGIN_ID,   
              param: { name: 'cas_slideshow_enabled', type: 'trigger', default: true },   
              field: { name: 'Слайд-шоу фону' }, onChange: applySettings  
          });  
          applySettings();  
      }  

      function applySettings() {  
          var root = document.documentElement;  
          var scale = parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100;  
          var gap = Lampa.Storage.get('cas_blocks_gap') || '20';  
          var metaSize = Lampa.Storage.get('cas_meta_size') || '1.3';  
          root.style.setProperty('--cas-logo-scale', scale);  
          root.style.setProperty('--cas-blocks-gap', gap + 'px');  
          root.style.setProperty('--cas-meta-size', metaSize + 'em');  
          $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));  
      }  

      function addCustomTemplate() {    
          var template = '<div class="full-start-new left-title">' +
          '<div class="full-start-new__body">' +
              '<div class="full-start-new__right">' +
                  '<div class="left-title__content">' +
                      '<div class="cas-logo-container" style="margin-bottom: var(--cas-blocks-gap);">' +
                          '<div class="cas-logo"></div>' +
                      '</div>' +
                      '<div class="cas-studios-row" style="display: flex; gap: 15px; align-items: center; margin-bottom: 12px;"></div>' +
                      '<div class="cas-ratings-line">' +
                          '<div class="cas-rate-items" style="display: flex; align-items: center; gap: 12px;"></div>' +
                          '<div class="cas-meta-info"></div>' +
                          '<div class="cas-quality-row" style="display: flex; gap: 8px; align-items: center;"></div>' +
                      '</div>' +
                      '<div class="cas-description" style="margin-top: var(--cas-blocks-gap);"></div>' +
                      '<div class="full-start-new__buttons" style="margin-top: 1.2em; display: flex !important; gap: 20px;">' +
                          '<div class="full-start__button selector button--play">' +
                              '<svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>' +
                              '<span>#{title_watch}</span>' +
                          '</div>' +
                          '<div class="full-start__button selector button--book">' +
                              '<svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg>' +
                              '<span>#{settings_input_links}</span>' +
                          '</div>' +
                          '<div class="full-start__button selector button--options">' +
                              '<svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/><circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/></svg>' +
                          '</div>' +
                      '</div>' +
                  '</div>' +
              '</div>' +
          '</div>' +
      '</div>';    
          Lampa.Template.add('full_start_new', template);    
      }

      function addStyles() {    
          var styles = '<style>' +    
  ':root { --cas-logo-scale: 1; --cas-blocks-gap: 30px; --cas-meta-size: 1.3em; --cas-anim-curve: cubic-bezier(0.2, 0.8, 0.2, 1); }' +  
  '.cas-logo, .cas-description, .cas-meta-info, .cas-studios-row, .cas-rate-items, .cas-quality-row, .full-start-new__buttons { opacity: 0; transform: translateY(10px); transition: opacity 0.5s var(--cas-anim-curve), transform 0.5s var(--cas-anim-curve); }' +
  '.cas-animated .cas-logo, .cas-animated .cas-description, .cas-animated .cas-meta-info, .cas-animated .cas-studios-row, .cas-animated .cas-rate-items, .cas-animated .cas-quality-row, .cas-animated .full-start-new__buttons { opacity: 1; transform: translateY(0); }' +
  '.cas-animated .cas-logo { transition-delay: 0.1s; }' +
  '.cas-animated .cas-studios-row { transition-delay: 0.2s; }' +
  '.cas-animated .cas-rate-items { transition-delay: 0.3s; }' +
  '.cas-animated .cas-description { transition-delay: 0.4s; opacity: 0.7; }' +
  '.cas-animated .full-start-new__buttons { transition-delay: 0.5s; }' +
  '.cas-description { max-width: 650px; font-size: var(--cas-meta-size); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }' +  
  '.cas-studio-item img { height: 18px; filter: invert(1) brightness(1.2); opacity: 0.9; }' +  
  '.cas-quality-item img { height: 15px; }' +  
  '.full-start__button { background: transparent !important; color: rgba(255,255,255,0.6) !important; display: flex; align-items: center; gap: 10px; }' +  
  '.full-start__button.focus { color: #fff !important; transform: scale(1.1); }' +  
  '.cas-logo img { max-width: 450px; max-height: 180px; transform: scale(var(--cas-logo-scale)); transform-origin: left bottom; }' +  
  '.cas-ratings-line { display: flex; align-items: center; gap: 15px; height: 35px; }' +  
  '.left-title .full-start-new__right { display: flex; align-items: flex-end; padding-bottom: 5vh; padding-left: 3%; }' +  
  '@keyframes casKenBurns { 0% { transform: scale(1); } 50% { transform: scale(1.07); } 100% { transform: scale(1); } }' +  
  'body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 40s linear infinite !important; }' +  
  '</style>';    
          $('body').append(styles);    
      }  

      function getCachedData(id) {  
          try {
              var cache = Lampa.Storage.get('cas_images_cache') || {};  
              var item = cache[id];  
              if (item && (Date.now() - item.time < CACHE_LIFETIME)) return item.data;  
          } catch(e) {}
          return null;  
      }  

      function setCachedData(id, data) {  
          try {
              var cache = Lampa.Storage.get('cas_images_cache') || {};  
              cache[id] = { time: Date.now(), data: data };  
              Lampa.Storage.set('cas_images_cache', cache);  
          } catch(e) {}
      }  

      function stopSlideshow() {  
          if (window.casBgInterval) { clearInterval(window.casBgInterval); window.casBgInterval = null; }
      }  

      function attachLoader() {    
          Lampa.Listener.follow('full', function(event) {    
              if (event.type === 'complite') {    
                  var data = event.data.movie;  
                  var render = event.object.activity.render();  
                  var card = $(render).find('.full-start-new');
                  if (!card.length) return;

                  card.find('.left-title__content').removeClass('cas-animated');
                  stopSlideshow();

                  if (data && data.id) {  
                      // Логотип
                      var cacheId = 'tmdb_' + data.id;  
                      var cached = getCachedData(cacheId);  
                      var drawImages = function(res) {  
                          var logo = res.logos.find(function(l){return l.iso_639_1==='uk'}) || res.logos.find(function(l){return l.iso_639_1==='en'}) || res.logos[0];  
                          if (logo) card.find('.cas-logo').html('<img src="' + Lampa.TMDB.image('/t/p/original' + logo.file_path) + '">');  
                          else card.find('.cas-logo').html('<div style="font-size: 3em; font-weight: 800;">' + (data.title || data.name) + '</div>');  
                          
                          if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops && res.backdrops.length > 1) {  
                              var idx = 0;  
                              window.casBgInterval = setInterval(function() {  
                                  var bg = $('.full-start__background img, img.full-start__background');  
                                  if (!bg.length) return stopSlideshow();  
                                  idx = (idx + 1) % Math.min(res.backdrops.length, 12);  
                                  bg.attr('src', Lampa.TMDB.image('/t/p/original' + res.backdrops[idx].file_path));  
                              }, 15000);  
                          }  
                      };  

                      if (cached) drawImages(cached);  
                      else $.getJSON(Lampa.TMDB.api((data.name?'tv/':'movie/')+data.id+'/images?api_key='+Lampa.TMDB.key()), function(res){
                          setCachedData(cacheId, res);
                          drawImages(res);
                      });

                      // Рейтинги та мета
                      var rHtml = '';  
                      if (data.vote_average > 0) rHtml += '<div class="cas-rate-item"><img src="'+ICONS.tmdb+'"> <span style="color:'+getRatingColor(data.vote_average)+'">'+parseFloat(data.vote_average).toFixed(1)+'</span></div>';  
                      card.find('.cas-rate-items').html(rHtml);  
                      card.find('.cas-description').text(data.overview || '');
                      var time = formatTime(data.runtime || (data.episode_run_time && data.episode_run_time[0] ? data.episode_run_time[0] : 0));
                      card.find('.cas-meta-info').text(time + (data.genres && data.genres.length ? ' • ' + data.genres[0].name : ''));

                      // Студії
                      var st = (data.networks || data.production_companies || []).filter(function(s){return s.logo_path}).slice(0,3);
                      card.find('.cas-studios-row').html(st.map(function(s){return '<div class="cas-studio-item"><img src="'+Lampa.TMDB.image('/t/p/w200'+s.logo_path)+'"></div>'}).join(''));

                      // Якість
                      if (Lampa.Parser && Lampa.Parser.get) {
                          Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, function(res) {
                              var items = res.Results || res;
                              if (items && Array.isArray(items) && items.length > 0) {
                                  var b = { res: '', hdr: false, ukr: false };
                                  items.slice(0, 10).forEach(function(i) {
                                      var t = (i.Title || i.title || '').toLowerCase();
                                      if (t.indexOf('4k') !== -1) b.res = '4K';
                                      if (t.indexOf('hdr') !== -1) b.hdr = true;
                                      if (t.indexOf('ukr') !== -1 || t.indexOf('укр') !== -1) b.ukr = true;
                                  });
                                  var qH = '';
                                  if (b.res) qH += '<div class="cas-quality-item"><img src="'+QUALITY_ICONS[b.res]+'"></div>';
                                  if (b.hdr) qH += '<div class="cas-quality-item"><img src="'+QUALITY_ICONS.HDR+'"></div>';
                                  if (b.ukr) qH += '<div class="cas-quality-item"><img src="'+QUALITY_ICONS.UKR+'"></div>';
                                  if (qH) card.find('.cas-quality-row').html('<span style="opacity:0.5">•</span>' + qH);
                              }
                          });
                      }
                  }  
                  
                  // Плавний запуск анімації
                  setTimeout(function() { 
                      card.find('.left-title__content').addClass('cas-animated'); 
                  }, 250);  
              }  
          });  
      }  

      function startPlugin() { initializePlugin(); }  
      if (window.appready) startPlugin();    
      else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') startPlugin(); });    
})();
                  
