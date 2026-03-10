(function () {  
    'use strict';  
      const PLUGIN_NAME = 'NewCard Premium Full';  
      const PLUGIN_ID = 'new_card_style';  
      const ASSETS_PATH = 'https://crowley38.github.io/Icons/';  
      const CACHE_LIFETIME = 1000 * 60 * 60 * 24; 
      const ICONS = {  
          tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',  
          cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'  
      };  
      const QUALITY_ICONS = {  
          '4K': ASSETS_PATH + '4K.svg',   
          '2K': ASSETS_PATH + '2K.svg',   
          'FULL HD': ASSETS_PATH + 'FULL HD.svg',  
          'HD': ASSETS_PATH + 'HD.svg',   
          'HDR': ASSETS_PATH + 'HDR.svg',   
          'Dolby Vision': ASSETS_PATH + 'Dolby Vision.svg',  
          'UKR': ASSETS_PATH + 'UKR.svg'  
      };  
      const SETTINGS_ICON = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/><rect x="25" y="66" width="30" height="6" rx="3" fill="white" opacity="0.6"/><rect x="60" y="66" width="15" height="6" rx="3" fill="white" opacity="0.6"/></svg>`;  
      
      function getRatingColor(val) {  
          const n = parseFloat(val);  
          return n >= 7.5 ? '#2ecc71' : n >= 6 ? '#feca57' : '#ff4d4d';  
      }  
      function formatTime(mins) {  
          if (!mins) return '';  
          const h = Math.floor(mins / 60);  
          const m = mins % 60;  
          return (h > 0 ? h + 'г ' : '') + m + 'хв';  
      }  

      function addStyles() {    
          const styles = `<style>    
  :root { 
      --cas-logo-scale: 1; 
      --cas-blocks-gap: 30px; 
      --cas-meta-size: 1.3em; 
      --cas-wave-speed: 0.9s;
      --cas-wave-curve: cubic-bezier(0.22, 1, 0.36, 1);
  }  
  
  .full-start__background { will-change: transform; transform: translate3d(0,0,0); backface-visibility: hidden; perspective: 1000px; }

  /* Хвильова анімація для кожного елемента */
  .cas-logo, .cas-studio-item, .cas-rate-item, .cas-meta-info, 
  .cas-quality-item, .cas-description, .full-start-new__buttons {   
      opacity: 0;
      transform: translateY(25px) scale(0.97);
      filter: blur(8px);
      transition: opacity var(--cas-wave-speed) var(--cas-wave-curve), 
                  transform var(--cas-wave-speed) var(--cas-wave-curve),
                  filter var(--cas-wave-speed) var(--cas-wave-curve);
      will-change: transform, opacity, filter;
  }  

  .cas-animated .cas-logo, .cas-animated .cas-studio-item, 
  .cas-animated .cas-rate-item, .cas-animated .cas-meta-info, 
  .cas-animated .cas-quality-item, .cas-animated .cas-description, 
  .cas-animated .full-start-new__buttons {
      opacity: 1; transform: translateY(0) scale(1); filter: blur(0);
  }

  /* Таймінги преміальної хвилі */
  .cas-animated .cas-logo { transition-delay: 0.1s; }
  .cas-animated .cas-studio-item:nth-child(1) { transition-delay: 0.3s; }
  .cas-animated .cas-studio-item:nth-child(2) { transition-delay: 0.4s; }
  .cas-animated .cas-studio-item:nth-child(3) { transition-delay: 0.5s; }
  .cas-animated .cas-rate-item:nth-child(1) { transition-delay: 0.65s; }
  .cas-animated .cas-rate-item:nth-child(2) { transition-delay: 0.75s; }
  .cas-animated .cas-meta-info { transition-delay: 0.85s; }
  .cas-animated .cas-quality-item:nth-child(1) { transition-delay: 0.95s; }
  .cas-animated .cas-quality-item:nth-child(2) { transition-delay: 1.05s; }
  .cas-animated .cas-description { transition-delay: 1.2s; }
  .cas-animated .full-start-new__buttons { transition-delay: 1.35s; }

  .cas-description {  
      max-width: 650px; font-size: var(--cas-meta-size); line-height: 1.4; color: rgba(255,255,255,0.7);  
      display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;  
  }  
  .cas-studio-item img { height: 16px; filter: invert(1) brightness(1.2); opacity: 0.9; }  
  .cas-quality-item img { height: 16px; margin-left: 5px; }  
  .left-title .full-start-new__buttons { margin-top: 1.5em; display: flex; gap: 20px; }    
  .cas-logo img { max-width: 450px; max-height: 180px; transform: scale(var(--cas-logo-scale)); transform-origin: left bottom; }  
  .cas-ratings-line { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; font-size: var(--cas-meta-size); font-weight: 600; }  
  .cas-rate-item { display: flex; align-items: center; gap: 6px; }
  .cas-rate-item img { height: 1.1em; }  
  .left-title .full-start-new__body { height: 85vh; }  
  .left-title .full-start-new__right { display: flex; align-items: flex-end; padding-bottom: 5vh; padding-left: 3%; }  

  /* Приховуємо системні блоки, але тримаємо їх у DOM */
  .left-title .full-start-new__head, 
  .left-title .full-start-new__details, 
  .left-title .full-start-new__reactions,
  .left-title .full-start-new__rate-line,
  .left-title .rating--modss,
  .left-title .buttons--container { 
      display: none !important; 
      visibility: hidden !important; 
  }
  
  @keyframes casKenBurns { 
      0% { transform: scale(1); } 
      50% { transform: scale(1.08); } 
      100% { transform: scale(1); } 
  }  
  body.cas--zoom-enabled .full-start__background.loaded { animation: casKenBurns 45s linear infinite !important; }  
  </style>`;    
          Lampa.Template.add('left_title_css', styles);    
          $('body').append(Lampa.Template.get('left_title_css', {}, true));    
      }  

      function addCustomTemplate() {    
          const template = `<div class="full-start-new left-title">    
          <div class="full-start-new__body">    
              <div class="full-start-new__right">    
                  <div class="left-title__content">    
                      <div class="cas-logo-container" style="margin-bottom: var(--cas-blocks-gap);">  
                          <div class="cas-logo"></div>  
                      </div>  
                      
                      <div class="cas-studios-row" style="margin-bottom: 15px; display: flex; gap: 18px; align-items: center;"></div>  
                      
                      <div class="cas-ratings-line">  
                          <div class="cas-rate-items" style="display: flex; align-items: center; gap: 12px;"></div>  
                          <div class="cas-meta-info" style="opacity: 0.7; font-weight: 400;"></div>  
                          <div class="cas-quality-row" style="display: flex; align-items: center;"></div>  
                      </div>  

                      <div class="cas-description" style="margin-bottom: var(--cas-blocks-gap);"></div>  
                      
                      <div class="full-start-new__head"></div><div class="full-start-new__details"></div>
                      <div class="full-start-new__reactions"></div><div class="full-start-new__rate-line"></div>
                      <div class="rating--modss"></div><div class="buttons--container"></div>

                      <div class="full-start-new__buttons">    
                          <div class="full-start__button selector button--play">    
                              <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/></svg>    
                              <span>#{title_watch}</span>    
                          </div>    
                          <div class="full-start__button selector button--book">    
                              <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/></svg>    
                              <span>#{settings_input_links}</span>    
                          </div>    
                      </div>    
                  </div>    
              </div>    
          </div>    
      </div>`;    
          Lampa.Template.add('full_start_new', template);    
      }    

      function initializePlugin() {  
          addCustomTemplate();  
          addStyles();  
          addSettings();  
          attachLoader();  
      }  

      function addSettings() {  
          const defaults = { 'cas_logo_scale': '100', 'cas_logo_quality': 'original', 'cas_bg_animation': true, 'cas_slideshow_enabled': true, 'cas_blocks_gap': '20', 'cas_meta_size': '1.3', 'cas_show_studios': true, 'cas_show_quality': true, 'cas_show_rating': true, 'cas_show_description': true };  
          Object.keys(defaults).forEach(key => { if (Lampa.Storage.get(key) === undefined) Lampa.Storage.set(key, defaults[key]); });  
          Lampa.SettingsApi.addComponent({ component: PLUGIN_ID, name: PLUGIN_NAME, icon: SETTINGS_ICON });  
          
          Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_logo_quality', type: 'select', values: { 'w300':'300px', 'w500':'500px', 'original':'Original' }, default: 'original' }, field: { name: 'Якість логотипу' }, onChange: applySettings });
          Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_logo_scale', type: 'select', values: { '70':'70%','80':'80%','90':'90%','100':'100%','110':'110%','120':'120%' }, default: '100' }, field: { name: 'Розмір логотипу' }, onChange: applySettings });
          Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_meta_size', type: 'select', values: { '1.2': 'Малий', '1.3': 'Стандартний', '1.4': 'Збільшений' }, default: '1.3' }, field: { name: 'Розмір шрифту' }, onChange: applySettings });
          Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_bg_animation', type: 'trigger', default: true }, field: { name: 'Анімація фону (Ken Burns)' }, onChange: applySettings });
          Lampa.SettingsApi.addParam({ component: PLUGIN_ID, param: { name: 'cas_slideshow_enabled', type: 'trigger', default: true }, field: { name: 'Слайд-шоу фону' }, onChange: applySettings });
          
          applySettings();  
      }  

      function applySettings() {  
          const root = document.documentElement;  
          const scale = parseInt(Lampa.Storage.get('cas_logo_scale') || 100) / 100;  
          const gap = Lampa.Storage.get('cas_blocks_gap') || '20';  
          const metaSize = Lampa.Storage.get('cas_meta_size') || '1.3';  
          root.style.setProperty('--cas-logo-scale', scale);  
          root.style.setProperty('--cas-blocks-gap', gap + 'px');  
          root.style.setProperty('--cas-meta-size', metaSize + 'em');  
          $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation'));  
      }  

      function getCachedData(id) {  
          const cache = Lampa.Storage.get('cas_images_cache') || {};  
          const item = cache[id];  
          if (item && (Date.now() - item.time < CACHE_LIFETIME)) return item.data;  
          return null;  
      }  

      function setCachedData(id, data) {  
          const cache = Lampa.Storage.get('cas_images_cache') || {};  
          cache[id] = { time: Date.now(), data: data };  
          Lampa.Storage.set('cas_images_cache', cache);  
      }  

      function stopSlideshow() { if (window.casBgInterval) { clearInterval(window.casBgInterval); window.casBgInterval = null; } }  

      function attachLoader() {    
          Lampa.Listener.follow('full', (event) => {    
              if (event.type === 'complite') {    
                  const data = event.data.movie;  
                  const render = event.object.activity.render();  
                  const content = render.find('.left-title__content');
                  content.removeClass('cas-animated');  
                  event.object.activity.onBeforeDestroy = () => { stopSlideshow(); };  

                  if (data && data.id) {  
                    const cacheId = 'tmdb_' + data.id;  
                    const cached = getCachedData(cacheId);  

                    const processImages = (res) => {  
                        const bestLogo = res.logos.find(l => l.iso_639_1 === 'uk') || res.logos.find(l => l.iso_639_1 === 'en') || res.logos[0];  
                        if (bestLogo) {  
                            const quality = Lampa.Storage.get('cas_logo_quality') || 'original';  
                            render.find('.cas-logo').html(`<img src="${Lampa.TMDB.image('/t/p/' + quality + bestLogo.file_path)}">`);  
                        } else {  
                            render.find('.cas-logo').html(`<div style="font-size: 3em; font-weight: 800;">${data.title || data.name}</div>`);  
                        }
                        
                        stopSlideshow();
                        if (Lampa.Storage.get('cas_slideshow_enabled') && res.backdrops?.length > 1) {  
                            let idx = 0;  
                            window.casBgInterval = setInterval(() => {  
                                const bg = render.find('.full-start__background img, img.full-start__background');  
                                if (!bg.length) return stopSlideshow();  
                                idx = (idx + 1) % Math.min(res.backdrops.length, 15);  
                                bg.attr('src', Lampa.TMDB.image('/t/p/original' + res.backdrops[idx].file_path));  
                            }, 15000);  
                        }
                    };  

                    if (cached) processImages(cached);  
                    else {  
                        const imagesUrl = Lampa.TMDB.api((data.name ? 'tv/' : 'movie/') + data.id + '/images?api_key=' + Lampa.TMDB.key());  
                        $.getJSON(imagesUrl, (res) => { setCachedData(cacheId, res); processImages(res); });  
                    }  

                    if (Lampa.Storage.get('cas_show_description')) render.find('.cas-description').text(data.overview || '');  
                    
                    if (Lampa.Storage.get('cas_show_studios')) {  
                        const studios = (data.networks || data.production_companies || []).filter(s => s.logo_path).slice(0, 3);  
                        render.find('.cas-studios-row').html(studios.map(s => `<div class="cas-studio-item"><img src="${Lampa.TMDB.image('/t/p/w200' + s.logo_path)}"></div>`).join(''));  
                    }  

                    let ratesHtml = '';  
                    if (Lampa.Storage.get('cas_show_rating')) {  
                        const tmdbV = parseFloat(data.vote_average || 0).toFixed(1);  
                        if (tmdbV > 0) ratesHtml += `<div class="cas-rate-item"><img src="${ICONS.tmdb}"> <span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span></div>`;
                        
                        if (event.data.reactions && event.data.reactions.result) {  
                            let sum = 0, cnt = 0;  
                            const coef = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };  
                            event.data.reactions.result.forEach(r => { if (r.counter) { sum += (r.counter * coef[r.type]); cnt += r.counter; } });  
                            if (cnt >= 5) {  
                                const cubV = (((data.name?7.4:6.5)*(data.name?50:150)+sum)/((data.name?50:150)+cnt)).toFixed(1);  
                                ratesHtml += `<div class="cas-rate-item"><img src="${ICONS.cub}"> <span style="color:${getRatingColor(cubV)}">${cubV}</span></div>`;  
                            }  
                        }
                    }  
                    render.find('.cas-rate-items').html(ratesHtml);  
                    
                    const time = formatTime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0));  
                    const genre = (data.genres || []).slice(0, 1).map(g => g.name).join('');  
                    render.find('.cas-meta-info').text((time ? time + (genre ? ' • ' : '') : '') + genre);  

                    if (Lampa.Storage.get('cas_show_quality') && Lampa.Parser.get) {  
                        Lampa.Parser.get({ search: data.title || data.name, movie: data, page: 1 }, (res) => {  
                            const items = res.Results || res;  
                            if (items && Array.isArray(items) && items.length > 0) {  
                                const b = { res: '', hdr: false, dv: false, ukr: false };  
                                items.slice(0, 15).forEach(i => {  
                                    const t = (i.Title || i.title || '').toLowerCase();  
                                    if (t.includes('4k') || t.includes('2160')) b.res = '4K';  
                                    else if (!b.res && (t.includes('1080') || t.includes('fhd'))) b.res = 'FULL HD';  
                                    if (t.includes('hdr')) b.hdr = true;  
                                    if (t.includes('dv') || t.includes('dovi') || t.includes('vision')) b.dv = true;  
                                    if (t.includes('ukr') || t.includes('укр')) b.ukr = true;  
                                });  
                                let qH = '';  
                                if (b.res) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS[b.res]}"></div>`;  
                                if (b.dv) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['Dolby Vision']}"></div>`;  
                                else if (b.hdr) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;  
                                if (b.ukr) qH += `<div class="cas-quality-item"><img src="${QUALITY_ICONS['UKR']}"></div>`;  
                                if (qH) render.find('.cas-quality-row').html('<span style="opacity: 0.5; margin: 0 10px;">•</span>' + qH);  
                            }  
                        });  
                    }  
                    
                    setTimeout(() => content.addClass('cas-animated'), 200);  
                }  
              }  
          });  
      }  

      function startPlugin() { initializePlugin(); }  
      if (window.appready) startPlugin();    
      else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') startPlugin(); });    
})();
    
