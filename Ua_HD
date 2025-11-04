(function(){  
  'use strict';  
  
  // ===============================================  
  //  PlayUa Mobile v1.1 — Full HD + Toloka only  
  //  • Максимальна якість: 1080p  
  //  • Тільки трекер Toloka  
  //  • Максимальний розмір: 30 ГБ  
  //  • Максимальний бітрейт: 30 Mbps  
  // ===============================================  
  
  // ---------- Mobile-optimized constants ----------  
  var MIN_SEEDERS   = 3;                    // Знижено для мобільних  
  var MAX_MOVIE_SIZE = 30 * 1024 * 1024 * 1024; // 30 GB для Full HD  
  var MAX_BITRATE   = 30;                   // 30 Mbps для Full HD  
  var MOVIE_CATS    = '2000,2010,2020,2030,2040';  
  var SERIES_CATS   = '5000,5030,5040,5050,5060,5070';  
  var VIDEO_EXT     = /(\.(mkv|mp4|avi|ts|m2ts|mpg|mpeg|mov|wmv))$/i;  
  var MIN_EP_BYTES  = 500 * 1024 * 1024; // 300 MB для мобільних  
  
  var PACK_COLORS = ['#60A5FA','#A78BFA','#34D399','#F59E0B','#F472B6'];  
  
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
  
  // ---------- Jackett base (Toloka only) ----------  
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
    var runtime = m.runtime || 0;  
    if(!title) throw new Error('Не визначена назва фільму');  
    var poster = tmdbImg(m.poster_path, 'w342');  
    return { title:title, orig:orig, year:year, poster:poster, full:m, runtime:runtime };  
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
  
  // ---------- Jackett search (TOLOKA ONLY + 1080p max) ----------  
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
      var title = xt('title');  
        
      // ФІЛЬТР: тільки Toloka  
      if (tracker.indexOf('toloka')<0 && trackerId.indexOf('toloka')<0) return null;  
        
      // ФІЛЬТР: тільки 1080p або нижче (виключити 4K/2160p)  
      if (title.indexOf('2160p')>=0 || title.indexOf('4K')>=0 || /\b4k\b/i.test(title)) return null;  
        
      return { title:title, link:link, magnet:magnet, dl:enc||'', size:size, seed:seed, tracker:tracker, trackerId:trackerId };  
    }).filter(function(x){ return x && x.link && x.size>0 && x.seed>=MIN_SEEDERS; });  
      
    items.sort(function(a,b){   
      // Пріоритет 1080p  
      var a1080 = a.title.indexOf('1080p')>=0 ? 1 : 0;  
      var b1080 = b.title.indexOf('1080p')>=0 ? 1 : 0;  
      if (a1080 !== b1080) return b1080 - a1080;  
      return b.size - a.size;   
    });  
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
    var url = jb.base + '/api/v2.0/indexers/toloka/results/torznab/?' + qp.toString();  
    try{  
      var r = await fetch(url,{method:'GET',credentials:'omit',mode:'cors'});  
      if(!r.ok) return [];  
      var txt = await r.text();  
      return parseTorznabXML(txt);  
    }catch(e){ return []; }  
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
    var qAuth = tsStreamAuthQuery();         
    if (qAuth) url += qAuth;        
            
    try{        
      if (window.Lampa && Lampa.Player && typeof Lampa.Player.play==='function'){        
        Lampa.Player.play({ url:url, title: title||fname, timeline:0 });        
      } else {        
        location.href = url;        
      }        
    }catch(e){         
      location.href = url;         
    }        
  }  // <-- Закриваюча дужка для tsPlayById()  
  
  // Тут має бути решта коду плагіна (runMovie, showSeasons, makeButton, mountTVNative тощо)  
  // Якщо це кінець плагіна, додайте:  
  
})(); 
