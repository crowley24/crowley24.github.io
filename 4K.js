(function(){  
  'use strict';  
  
  // ---------- constants & helpers ----------  
  var MIN_SEEDERS   = 1;                    // зменшено до 1 роздаючого    
  var MAX_MOVIE_SIZE = 100 * 1024 * 1024 * 1024; // збільшено до 100 GB    
  var MAX_BITRATE   = 150;                   // збільшено до 150 Mbps  
  var MOVIE_CATS    = '2000,2010,2020,2030,2040';  
  var SERIES_CATS   = '5000,5030,5040,5050,5060,5070';  
  var VIDEO_EXT     = /(\.(mkv|mp4|avi|ts|m2ts|mpg|mpeg|mov|wmv))$/i;  
  var MIN_EP_BYTES  = 500 * 1024 * 1024; // 500 MB  
  
  var PACK_COLORS = ['#60A5FA','#A78BFA','#34D399','#F59E0B','#F472B6','#4FC3F7','#F87171','#10B981','#EAB308','#C084FC'];  
  
  function noty(m,t){ try{ if (window.Lampa && Lampa.Noty && typeof Lampa.Noty.show==='function') Lampa.Noty.show(m,{time:t||2500}); }catch(e){} }  
  function ensureScheme(u){ return /^https?:\/\//i.test(u)?u:('http://'+u); }  
  function trimEnd(s){ return String(s||'').replace(/\/+$/,''); }  
  function safeName(s){  
    var v=(s||'video').replace(/[^\w\d]+/g,'.').replace(/\.+/g,'.').replace(/^\.+|\.+$/g,'');  
    return v || 'video';  
  }  
  function isSerial(m){  
    return !!(m && m.first_air_date && !m.release_date);  
  }  
  function looksLikeVideo(path){ return VIDEO_EXT.test(String(path||'')); }  
  
  function tmdbLang(){  
    try{ return String((Lampa.Storage.get('language')||'uk')).toLowerCase(); }catch(e){ return 'uk'; }  
  }  
  
  function tmdbImg(path, size){  
    if (!path) return '';  
    var p = String(path);  
    if (/^https?:\/\//i.test(p)) return p;  
    return 'https://image.tmdb.org/t/p/' + (size || 'w300') + p;  
  }  
  
  function tmdbUrl(path, params){  
    var qp = new URLSearchParams(params||{});  
    try{  
      if (typeof Lampa!=='undefined' && Lampa.TMDB && typeof Lampa.TMDB.api==='function'){  
        return Lampa.TMDB.api(path + (path.indexOf('?')>=0?'&':'?') + qp.toString());  
      }  
    }catch(e){}  
    var KEY = '4ef0d7355d9ffb5151e987764708ce96';  
    var base = 'https://api.themoviedb.org/3/';  
    if (!qp.has('api_key')) qp.set('api_key', KEY);  
    if (!qp.has('language')) qp.set('language', tmdbLang());  
    return base + path + (path.indexOf('?')>=0?'&':'?') + qp.toString();  
  }  
  
  // ---------- Jackett base ----------  
  function jackettBase(){  
    var raw='', key='';  
    try{ raw = Lampa.Storage.field('jackett_url')||''; key = Lampa.Storage.field('jackett_key')||''; }catch(e){}  
    if(!raw) throw new Error('Вкажи jackett_url у Налаштуваннях');  
    var base = ensureScheme(raw).replace(/\/jackett(\/.*)?$/,'');  
    return { base: trimEnd(base), key: key };  
  }  
  
  // ---------- TorrServer base + auth ----------  
  function tsBase(){  
    var raw='';  
    try{ raw = Lampa.Storage.field('torrserver_url')||''; }catch(e){}  
    if(!raw) throw new Error('Вкажи torrserver_url у Налаштуваннях');  
    return trimEnd(ensureScheme(raw));  
  }  
  function tsAuthHeaders(){  
    var token = '', user='', pass='';  
    try{  
      token = Lampa.Storage.field('torrserver_token') || '';  
      user  = Lampa.Storage.field('torrserver_user')  || '';  
      pass  = Lampa.Storage.field('torrserver_pass')  || '';  
    }catch(e){}  
    var headers = { 'Content-Type':'application/json' };  
    if (token) headers['Authorization'] = 'Bearer ' + token;  
    else if (user || pass){  
      var btoaSafe = function(s){  
        try{ return btoa(s); }catch(_){ try{ return (typeof Buffer!=='undefined'?Buffer.from(s,'utf-8').toString('base64'):''); }catch(_2){ return ''; } }  
      };  
      headers['Authorization'] = 'Basic ' + btoaSafe(user+':'+pass);  
    }  
    return headers;  
  }  
  function tsBaseForStream(){  
    var base = tsBase();  
    var user='', pass='';  
    try{ user = Lampa.Storage.field('torrserver_user')||''; pass = Lampa.Storage.field('torrserver_pass')||''; }catch(e){}  
    try{  
      var u = new URL(base);  
      if (user || pass){ u.username=user; u.password=pass; base=u.toString().replace(/\/$/,''); }  
    }catch(e){}  
    return base;  
  }  
  function tsStreamAuthQuery(){  
    var token=''; try{ token = Lampa.Storage.field('torrserver_token')||''; }catch(e){}  
    return token ? '&authorization=' + encodeURIComponent('Bearer '+token) : '';  
  }  
  
  // ---------- TMDB payload ----------  
 function getMoviePayload(data){    
  var m = data && data.movie; if(!m) throw new Error('Немає data.movie');    
  if(isSerial(m)) throw new Error('skip-serial');    
  var title = String(m.title||m.name||'').trim();    
  var orig  = String(m.original_title||m.original_name||title).trim();    
  var year  = String(m.release_date||'0000').slice(0,4);    
  if(!title) throw new Error('Не визначена назва фільму');    
  var poster = tmdbImg(m.poster_path, 'w342');    
  return { title:title, orig:orig, year:year, poster:poster, full:m };  
  }  
  function getShowPayload(data){  
    var m = data && data.movie; if(!m) throw new Error('Немає data.movie');  
    if(!isSerial(m)) throw new Error('skip-movie');  
    var title = String(m.name||m.title||'').trim();  
    var orig  = String(m.original_name||m.original_title||title).trim();  
    var tvId  = m.id;  
    var poster= tmdbImg(m.poster_path, 'w342');  
    return { title:title, orig:orig, tvId:tvId, poster:poster, full:m };  
  }  
  
  // ---------- Jackett search ----------  
  function parseTorznabXML(text){  
    var xml; try{ xml = new DOMParser().parseFromString(text,'application/xml'); }catch(e){ return []; }  
    var items = [].slice.call(xml.querySelectorAll('item')).map(function(it){  
      var xt=function(s){ var el=it.querySelector(s); return (el&&el.textContent||'').trim(); };  
      var xa=function(n){  
        var el=it.querySelector('torznab\\:attr[name="'+n+'"]');  
        return (el && el.getAttribute('value') || '').trim();  
      };  
      var enc = (it.querySelector('enclosure') && it.querySelector('enclosure').getAttribute('url')) || '';  
      var magnet = xa('magneturl') || xa('magnetUrl') || '';  
      var link = (magnet && magnet.indexOf('magnet:')===0) ? magnet : (xt('link') || enc || '');  
      var size = Number(xt('size') || xa('size') || 0);  
      var seed = Number(xa('seeders') || xa('peers') || 0);  
      var tracker = String(xa('jackettindexer')||xa('indexer')||'').toLowerCase();  
      var trackerId= String(xa('jackettindexerid')||'').toLowerCase();  
      return { title:xt('title'), link:link, magnet:magnet, dl:enc||'', size:size, seed:seed, tracker:tracker, trackerId:trackerId };  
    }).filter(function(x){ return x.link && x.size>0; }); // ВИДАЛЕНО фільтрацію по seeders  
    var tol = items.filter(function(x){ return x.tracker.indexOf('toloka')>=0 || x.trackerId.indexOf('toloka')>=0; });  
    if (tol.length) items = tol;  
    items.sort(function(a,b){ return b.size - a.size; });  
    return items;  
  }  
  function parseJackettJSON(json){  
    var arr = (json && (Array.isArray(json)?json:(json.Results||json.results||json.items))) || [];  
    var items = (arr||[]).map(function(x){  
      var magnet = x.MagnetUri||x.MagnetUrl||x.magnet||'';  
      var link   = (magnet && magnet.indexOf('magnet:')===0) ? magnet : (x.Link||x.link||'');  
      var size   = Number(x.Size||x.size||0);  
      var seed   = Number(x.Seeders||x.seeders||x.Peers||x.peers||0);  
      var tracker= String(x.Tracker||x.tracker||'').toLowerCase();  
      var trackerId=String(x.TrackerId||x.trackerId||'').toLowerCase();  
      return { title:x.Title||x.title||'', link:link, magnet:magnet, dl:'', size:size, seed:seed, tracker:tracker, trackerId:trackerId };  
    }).filter(function(x){ return x.link && x.size>0; }); // ВИДАЛЕНО фільтрацію по seeders  
    var tol = items.filter(function(x){ return x.tracker.indexOf('toloka')>=0 || x.trackerId.indexOf('toloka')>=0; });  
    if (tol.length) items = tol;  
    items.sort(function(a,b){ return b.size - a.size; });  
    return items;  
  }  
  function catsToParams(csv){  
    return csv.split(',').map(function(s){return s.trim();}).filter(Boolean);  
  }  
  async function jSearchTorznab(query, catsCSV){  
    var jb = jackettBase();  
    var qp = new URLSearchParams({ t:'search', q:query });  
    if (jb.key) qp.set('apikey', jb.key);  
    catsToParams(catsCSV).forEach(function(c){ qp.append('cat',c); });  
    var url = jb.base + '/api/v2.0/indexers/all/results/torznab/?' + qp.toString();  
    try{  
      var r = await fetch(url,{method:'GET',credentials:'omit',mode:'cors'});  
      if(!r.ok) return [];  
      var txt = await r.text();  
      return parseTorznabXML(txt);  
    }catch(e){ return []; }  
  }  
  async function jSearchJSON(query, catsCSV, meta){  
    var jb = jackettBase();  
    var qp = new URLSearchParams();  
    if (jb.key) qp.set('apikey', jb.key);  
    qp.set('Query', query);  
    if(meta && meta.title) qp.set('title', meta.title);  
    if(meta && meta.orig)  qp.set('title_original', meta.orig);  
    if(meta && meta.year)  qp.set('year', meta.year);  
    if(meta && typeof meta.is_serial!=='undefined') qp.set('is_serial', String(meta.is_serial?1:0));  
    catsToParams(catsCSV).forEach(function(c){ qp.append('Category[]',c); });  
    var url = jb.base + '/api/v2.0/indexers/all/results?' + qp.toString();  
      
    console.log('PlayUa Debug: Search URL:', url);  
    console.log('PlayUa Debug: Query:', query);  
      
    try{  
      var r = await fetch(url,{method:'GET',credentials:'omit',mode:'cors'});  
      console.log('PlayUa Debug: Response status:', r.status);  
      if(!r.ok) return [];  
      var json = await r.json();  
      var rawItems = json.Results || json.results || [];  
      console.log('PlayUa Debug: Raw results count:', rawItems.length);  
      var parsed = parseJackettJSON(json);  
      console.log('PlayUa Debug: Parsed results count:', parsed.length);  
      return parsed;  
    }catch(e){   
      console.error('PlayUa Debug: Search error:', e);  
      return [];   
    }  
  }  
  
  // ---------- TorrServer ----------  
  async function tsAdd(base, addLink, metaTitle, metaPoster, metaFull){  
    var url = base + '/torrents';  
    var body = { action:'add', link:addLink, title:('[LAMPA] '+(metaTitle||'')).trim(), poster: metaPoster||'', data: JSON.stringify({lampa:true,movie:metaFull||{}}), save_to_db:false };  
    var r = await fetch(url,{ method:'POST', headers: tsAuthHeaders(), body: JSON.stringify(body) });  
    var j={}; try{ j=await r.json(); }catch(e){}  
    var hash = j.hash || j.id || j.link || j.data || j.result || '';  
    return { hash:hash, id:hash, raw:j };  
  }  
  function pickFileStats(j){  
    if (!j) return [];  
    if (Array.isArray(j)) return j;  
    if (Array.isArray(j.file_stats)) return j.file_stats;  
    if (Array.isArray(j.FileStats)) return j.FileStats;  
    if (Array.isArray(j.files)) return j.files;  
    if (Array.isArray(j.Files)) return j.Files;  
    if (j.stats && Array.isArray(j.stats.file_stats)) return j.stats.file_stats;  
    return [];  
  }  
  async function tsFiles(base, linkOrHash){  
    var headers = tsAuthHeaders();  
    try{  
      var body = { action:'get' };  
      if (/^(magnet:|https?:)/i.test(linkOrHash)) body.link = linkOrHash; else body.hash = linkOrHash;  
      var r1 = await fetch(base+'/torrents', { method:'POST', headers: headers, body: JSON.stringify(body) });  
      if (r1.ok){  
        var j1 = await r1.json(); var fs1 = pickFileStats(j1);  
        if (fs1.length) return { files:fs1, raw:j1 };  
      }  
    }catch(e){}  
    try{  
      var r2 = await fetch(base+'/stream/files?link='+encodeURIComponent(linkOrHash), { method:'GET', headers: headers });  
      if (r2.ok){  
        var j2 = await r2.json(); var fs2 = pickFileStats(j2);  
        if (fs2.length) return { files:fs2, raw:j2 };  
      }  
    }catch(e){}  
    return { files: [], raw: null };  
  }  
  
  function closeAllPlayUaModals(){  
    try{ var els=document.querySelectorAll('.playua-modal'); for (var i=0;i<els.length;i++) els[i].remove(); }catch(e){}  
    try{ if (window.Lampa && Lampa.Modal && typeof Lampa.Modal.close==='function') Lampa.Modal.close(); }catch(e){}  
  }  
  function tsPlayById(hash, file, title){  
    closeAllPlayUaModals();  
    var baseForStream = tsBaseForStream();  
    var fname = safeName((String(file.path||'').split('/').pop()||title||'video')) + '.mkv';  
    var idx = 1;  
    if (file && typeof file.id!=='undefined'){  
      var n = Number(file.id);  
      idx = isNaN(n) ? 1 : (n + 1);  
    }  
    var url = baseForStream + '/stream/' + encodeURIComponent(fname) + '?link=' + encodeURIComponent(hash) + '&index=' + idx + '&play=1';  
    var qAuth = tsStreamAuthQuery(); if (qAuth) url += qAuth;  
    try{ if (window.Lampa && Lampa.Player && typeof Lampa.Player.play==='function'){ Lampa.Player.play({ url:url, title:title||fname, timeline:0 }); } else location.href = url; }catch(e){ location.href = url; }  
  }  
  
  // ---------- MOVIE flow ----------  
  async function runMovie(data){    
  var meta = getMoviePayload(data);    
  var combos={    
    df:meta.orig,    
    df_year: (meta.orig+' '+meta.year),    
    df_lg: (meta.orig+' '+meta.title),    
    df_lg_year: (meta.orig+' '+meta.title+' '+meta.year),    
    lg:meta.title,    
    lg_year:(meta.title+' '+meta.year),    
    lg_df:(meta.title+' '+meta.orig),    
    lg_df_year:(meta.title+' '+meta.orig+' '+meta.year)    
  };    
  var pref='df_year';    
  try{ pref=Lampa.Storage.field('parse_lang')||'df_year'; }catch(e){}    
  var query = String(combos[pref]|| (meta.orig+' '+meta.year)).trim();    
    
  noty('UaDV: шукаю — '+query);    
    
  var items = await jSearchTorznab(query, MOVIE_CATS);    
  if(!items.length) items = await jSearchJSON(query, MOVIE_CATS, { title:meta.title, orig:meta.orig, year:meta.year, is_serial:0 });    
  if(!items.length) throw new Error('Jackett: немає результатів');    
    
  // Фільтрація за розміром та бітрейтом (послаблена)  
  items = items.filter(function(x){       
    if (x.size > MAX_MOVIE_SIZE) return false;      
    if (meta.runtime > 0) {      
      var estimatedBitrate = (x.size / (meta.runtime * 60)) / 125000;      
      if (estimatedBitrate > MAX_BITRATE) return false;      
    }      
    return true;      
  });    
    
  if(!items.length) throw new Error('Jackett: немає результатів у межах обмежень');    
    
  // Пріоритет Dolby Vision  
  items.sort(function(a, b){    
var aDV = /dolby\s*vision|dovi|\bDV\b/i.test(a.title);    
  var bDV = /dolby\s*vision|dovi|\bDV\b/i.test(b.title);    
      
  if (aDV && !bDV) return -1;    
  if (!aDV && bDV) return 1;    
      
  return b.size - a.size;    
});    
    
  var best = items[0];    
  var addLink = best.dl || best.magnet || best.link;    
    
  var base = tsBase();    
  var linkParam = addLink;    
  try {    
    var added = await tsAdd(base, addLink, meta.title, meta.poster, meta.full);    
    if (added.hash) linkParam = added.hash;    
  } catch(e){ linkParam = addLink; }    
    
  noty('Запускаю відтворення…');    
  closeAllPlayUaModals();    
  var baseForStream = tsBaseForStream();    
  var fname = safeName(meta.title||'video') + '.mkv';    
  var url = baseForStream + '/stream/' + encodeURIComponent(fname) + '?link=' + encodeURIComponent(linkParam) + '&index=1&play=1';    
  var qAuth = tsStreamAuthQuery(); if (qAuth) url += qAuth;    
  try{    
    if (window.Lampa && Lampa.Player && typeof Lampa.Player.play==='function'){    
      Lampa.Player.play({ url:url, title: meta.title||fname, timeline:0 });    
    } else location.href = url;    
  }catch(e){ location.href = url; }    
}  
  
  // ---------- SERIES flow ----------  
  async function showSeasons(meta){  
    noty('UaDV: шукаю сезони…');  
    var items = await jSearchTorznab(meta.title, SERIES_CATS);  
    if(!items.length) items = await jSearchJSON(meta.title, SERIES_CATS, { title:meta.title, orig:meta.orig, year:meta.year, is_serial:1 });  
    if(!items.length) throw new Error('Jackett: немає результатів для серіалу');  
  
    // Групування за сезонами  
    var seasons = {};  
    items.forEach(function(item){  
      var seasonMatch = item.title.match(/S(\d+)/i);  
      var season = seasonMatch ? parseInt(seasonMatch[1]) : 1;  
      if(!seasons[season]) seasons[season] = [];  
      seasons[season].push(item);  
    });  
  
    var seasonKeys = Object.keys(seasons).sort(function(a,b){ return parseInt(a)-parseInt(b); });  
    if(!seasonKeys.length) throw new Error('Не знайдено сезонів');  
  
    // Створення модального вікна  
    var modal = $('<div class="playua-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;">'+  
      '<div style="background:#333;border-radius:8px;padding:20px;max-width:600px;max-height:80vh;overflow-y:auto;">'+  
        '<h3 style="color:white;margin-bottom:15px;">'+meta.title+' - Оберіть сезон</h3>'+  
        '<div class="season-list"></div>'+  
        '<button class="close-btn" style="background:#666;color:white;border:none;padding:10px 20px;border-radius:4px;margin-top:15px;cursor:pointer;">Закрити</button>'+  
      '</div>'+  
    '</div>');  
  
    var seasonList = modal.find('.season-list');  
    seasonKeys.forEach(function(season){  
      var btn = $('<button class="season-btn" data-season="'+season+'" style="background:#444;color:white;border:none;padding:10px 15px;margin:5px;border-radius:4px;cursor:pointer;">Сезон '+season+'</button>');  
      seasonList.append(btn);  
    });  
  
    modal.find('.close-btn').on('click', function(){ modal.remove(); });  
    modal.on('click', function(e){ if(e.target === modal[0]) modal.remove(); });  
  
    modal.find('.season-btn').on('click', function(){  
      var season = $(this).data('season');  
      modal.remove();  
      showEpisodes(meta, seasons[season], season);  
    });  
  
    $('body').append(modal);  
  }  
  
  async function showEpisodes(meta, seasonItems, season){  
    noty('UaDV: шукаю епізоди сезону '+season+'…');  
      
    // Сортування за якістю  
    seasonItems.sort(function(a,b){  
      var aDV = /dolby\s*vision|dovi|\bDV\b/i.test(a.title);  
      var bDV = /dolby\s*vision|dovi|\bDV\b/i.test(b.title);  
      if(aDV && !bDV) return -1;  
      if(!aDV && bDV) return 1;  
      return b.size - a.size;  
    });  
  
    var best = seasonItems[0];  
    var addLink = best.dl || best.magnet || best.link;  
  
    try {  
      var base = tsBase();  
      var added = await tsAdd(base, addLink, meta.title+' S'+season, meta.poster, meta.full);  
      var files = await tsFiles(base, added.hash || addLink);  
        
      if(!files.files.length) throw new Error('Файли не знайдено');  
  
      // Фільтрація відеофайлів  
      var videoFiles = files.files.filter(function(f){  
        return looksLikeVideo(f.path || f.name) && f.size >= MIN_EP_BYTES;  
      });  
  
      if(!videoFiles.length) throw new Error('Відеофайли не знайдено');  
  
      // Створення модального вікна для вибору епізоду  
      var modal = $('<div class="playua-modal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;">'+  
        '<div style="background:#333;border-radius:8px;padding:20px;max-width:600px;max-height:80vh;overflow-y:auto;">'+  
          '<h3 style="color:white;margin-bottom:15px;">'+meta.title+' S'+season+' - Оберіть епізод</h3>'+  
          '<div class="episode-list"></div>'+  
          '<button class="close-btn" style="background:#666;color:white;border:none;padding:10px 20px;border-radius:4px;margin-top:15px;cursor:pointer;">Закрити</button>'+  
        '</div>'+  
      '</div>');  
  
      var episodeList = modal.find('.episode-list');  
      videoFiles.forEach(function(file, idx){  
        var fileName = (file.path || file.name || '').split('/').pop();  
        var btn = $('<button class="episode-btn" data-index="'+file.id+'" style="background:#444;color:white;border:none;padding:8px 12px;margin:3px;border-radius:4px;cursor:pointer;font-size:12px;">'+fileName+'</button>');  
        episodeList.append(btn);  
      });  
  
      modal.find('.close-btn').on('click', function(){ modal.remove(); });  
      modal.on('click', function(e){ if(e.target === modal[0]) modal.remove(); });  
  
      modal.find('.episode-btn').on('click', function(){  
        var fileIndex = $(this).data('index');  
        modal.remove();  
        tsPlayById(added.hash || addLink, {id: fileIndex}, meta.title+' S'+season);  
      });  
  
      $('body').append(modal);  
  
    } catch(e){  
      noty('Помилка: ' + (e.message || e));  
    }  
  }  
  
  // ---------- Entry points ----------  
  async function runPlay(evData){  
    try{  
      var mv = evData && evData.movie;  
      if (!mv) return;  
      if (isSerial(mv)){  
        var meta = getShowPayload(evData);  
        await showSeasons(meta);  
      } else {  
        await runMovie(evData);  
      }  
    }catch(e){  
      if (String(e && e.message)==='skip-movie' || String(e && e.message)==='skip-serial') return;  
      noty('UaDV: '+(e && e.message || e), 4000);  
    }  
  }  
  
  // ---------- Button & mount ----------  
  function findButtonsBar(root){  
    var bar = root.find('.full-start-new__buttons').eq(0); if (bar && bar.length) return bar;  
    bar = root.find('.full-start__buttons').eq(0); if (bar && bar.length) return bar;  
    bar = root.find('.full-actions').eq(0); if (bar && bar.length) return bar;  
    return root.find('.full-start__right, .full-start').eq(0);  
  }  
  function makeButton() {    
  return $(`    
    <div class="full-start__button selector playua-btn" data-playua-icon="1">    
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-badge-4k-fill" viewBox="0 0 16 16">    
        <path d="M3.577 8.9v.03h1.828V5.898h-.062a47 47 0 0 0-1.766 3.001z"/>    
        <path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm2.372 3.715.435-.714h1.71v3.93h.733v.957h-.733V11H5.405V9.888H2.5v-.971c.574-1.077 1.225-2.142 1.872-3.202m7.73-.714h1.306l-2.14 2.584L13.5 11h-1.428l-1.679-2.624-.615.7V11H8.59V5.001h1.187v2.686h.057L12.102 5z"/>    
      </svg>    
      <span>UaDV</span>    
    </div>    
  `);      
}  
  function attachButtonOnce(root, ev){  
    var m = ev && ev.data && ev.data.movie; if (!m) return true;  
    var bar = findButtonsBar(root); if (!bar || !bar.length) return false;  
    if (bar.find('[data-playua-icon="1"]').length) return true;  
    var btn = makeButton();  
    var click = function(){ runPlay(ev.data); };  
    btn.on('hover:enter', click);  
    btn.on('click', click);  
    btn.on('keydown', function(e){ if(e.key==='Enter'||e.keyCode===13) click(); });  
    bar.prepend(btn);  
    try { Lampa.Controller.collectionSet(bar); } catch(e) {}  
    return true;  
  }  
  function mountTVNative(){  
function injectUAStyles(){    
  if (document.getElementById('playua-ua-style')) return;    
  var css = ""    
  + ".full-start__button.playua-btn{background:#333!important;color:#fff!important;border:0!important;outline:0!important;box-shadow:0 2px 8px rgba(0,0,0,.28)!important;order:-9999!important}"    
  + ".full-start__buttons,.full-start-new__buttons{display:flex!important}"    
  + ".full-start__button.playua-btn.selector.focus,.full-start__button.playua-btn:hover{filter:brightness(1.06) contrast(1.02);transform:translateY(-1px)}"    
  + ".full-start__button.playua-btn svg{color:currentColor}";    
  var s=document.createElement('style'); s.id='playua-ua-style'; s.textContent=css; document.head.appendChild(s);    
}  
    injectUAStyles();  
    try{  
      Lampa.Listener.follow('full', function(ev){  
        if (!ev || ev.type !== 'complite' || !ev.object) return;  
        var root = ev.object.activity.render();  
        if (attachButtonOnce(root, ev)) return;  
        try{  
          var target = root[0] || root;  
          var mo = new MutationObserver(function(){ if (attachButtonOnce(root, ev)) mo.disconnect(); });  
          mo.observe(target, {childList:true, subtree:true});  
          setTimeout(function(){ try{ mo.disconnect(); }catch(e){} }, 8000);  
        }catch(e){}  
      });  
    }catch(e){}  
  }  
  
  if(!window.plugin_playua_ready){ window.plugin_playua_ready = true; try{ mountTVNative(); }catch(e){} }  
})();
