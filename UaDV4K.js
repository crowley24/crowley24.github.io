(function(){
  'use strict';

  // ===============================================
  //  PlayUa v61.2 — Movies + Series for Lampa (robust modal + HTTPS TMDB)
  //  • ЄДИНИЙ контролер попапа: фокус, стрілки, enter, back/esc
  //  • Lampa.Modal.open першочергово; легкий фолбек-оверлей
  //  • ONE popup per season (всі релізи/папки разом)
  //  • TMDB: HTTPS для API та картинок (без mixed-content)
  //  • Показує тільки відео ≥ 500 MB; TorrServer index 1-based
  // ===============================================

  // ---------- constants & helpers ----------
  var MIN_SEEDERS   = 5;                    // мінімум 7 роздаючих  
  var MAX_MOVIE_SIZE = 70 * 1024 * 1024 * 1024; // 70 GB для фільмів  
  var MAX_BITRATE   = 70;                   // максимум 70 Mbps
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

  // Unified HTTPS image builder for TMDB
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
    var base = 'https://api.themoviedb.org/3/';           // HTTPS
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
    }).filter(function(x){ return x.link && x.size>0 && x.seed>=MIN_SEEDERS; });
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
    }).filter(function(x){ return x.link && x.size>0 && x.seed>=MIN_SEEDERS; });
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
    var url = jb.base + '/api/v2.0/indexers/toloka/results/torznab/?' + qp.toString();
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
    try{
      var r = await fetch(url,{method:'GET',credentials:'omit',mode:'cors'});
      if(!r.ok) return [];
      var json = await r.json();
      return parseJackettJSON(json);
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
    // TorrServer index is 1-based for /stream endpoint
    var idx = 1;
    if (file && typeof file.id!=='undefined'){
      var n = Number(file.id);
      idx = isNaN(n) ? 1 : (n + 1);
    }
    var url = baseForStream + '/stream/' + encodeURIComponent(fname) + '?link=' + encodeURIComponent(hash) + '&index=' + idx + '&play=1';
    var qAuth = tsStreamAuthQuery(); if (qAuth) url += qAuth;
    try{
      if (window.Lampa && Lampa.Player && typeof Lampa.Player.play==='function'){
        Lampa.Player.play({ url:url, title: title||fname, timeline:0 });
      } else {
        location.href = url;
      }
    }catch(e){ location.href = url; }
  }

  // ---------- Styles ----------
  function injectStyles(){
    if (document.getElementById('playua-style')) return;
    var css = ""
    + ".playua-body{padding:4px 8px 12px 8px;overflow:auto;max-height:calc(88vh - 72px)}"
    + ".playua-row{display:flex;align-items:center;gap:18px;padding:16px;border-radius:12px}"
    + ".playua-row.selector{cursor:pointer}"
    + ".playua-row.selector.focus{outline:none;background:rgba(255,255,255,.06)}"
    + ".playua-thumb{width:200px;height:112px;border-radius:10px;background:#222 center/cover no-repeat;flex:0 0 auto}"
    + ".playua-title{font-size:30px;font-weight:800}"
    + ".playua-sub{opacity:.8;margin-top:6px}"
    + ".playua-size{margin-left:auto;opacity:.9;font-weight:700}"
    + "@media (max-width:860px){ .playua-thumb{width:160px;height:90px} .playua-title{font-size:24px} }"
    + ".playua-pack{--pack:#60A5FA; margin:6px 0 10px}"
    + ".playua-pack-title{display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:22px;font-weight:900;border-left:6px solid var(--pack);border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));color:#fff}"
    + ".playua-folder{padding:3px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);}"
    + ".playua-pack .playua-row{border-left:4px solid var(--pack)}"
    + ".playua-pack .playua-row.selector.focus{box-shadow:inset 0 0 0 2px var(--pack)}"
    + ".playua-loader{display:flex;align-items:center;gap:14px;padding:22px;font-size:22px}"
    + ".playua-fallback{position:fixed;left:0;right:0;top:0;bottom:0;background:rgba(0,0,0,.72);z-index:99999;display:flex;align-items:center;justify-content:center}"
    + ".playua-card{width:min(1450px,94vw);max-height:88vh;overflow:hidden;border-radius:16px;background:#111;border:1px solid rgba(255,255,255,.06);box-shadow:0 10px 40px rgba(0,0,0,.5)}"
    + ".playua-head{padding:20px 28px;font-size:28px;font-weight:800;letter-spacing:.3px;background:rgba(255,255,255,.04)}";
    var s=document.createElement('style'); s.id='playua-style'; s.textContent=css; document.head.appendChild(s);
  }
  function injectUAStyles(){
    if (document.getElementById('playua-ua-style')) return;
    var css = ""
    + ".full-start__button.playua-btn{background:#333!important;color:#fff!important;border:0!important;outline:0!important;box-shadow:0 2px 8px rgba(0,0,0,.28)!important}"
    + ".full-start__button.playua-btn.selector.focus,.full-start__button.playua-btn:hover{filter:brightness(1.06) contrast(1.02);transform:translateY(-1px)}"
    + ".full-start__button.playua-btn svg{color:currentColor}";
    var s=document.createElement('style'); s.id='playua-ua-style'; s.textContent=css; document.head.appendChild(s);
  }

  // ---------- Focus utilities (no hacks) ----------
  function setFocus(container, el){
    if(!container) return;
    var $ = window.$ || window.jQuery;
    var nodes = container.querySelectorAll('.selector');
    for (var i=0;i<nodes.length;i++) nodes[i].classList.remove('focus');
    if (el){
      try{ el.classList.add('focus'); el.setAttribute('tabindex','0'); el.focus({preventScroll:true}); }catch(e){}
      try{ el.scrollIntoView({block:'nearest', inline:'nearest'}); }catch(e){}
      if ($) $(el).trigger('hover:focus');
    }
  }
  function focusFirst(container){
    if(!container) return;
    var el = container.querySelector('.selector');
    if (el) setFocus(container, el);
  }
  function moveFocus(container, dir){
    if(!container) return;
    var nodes = Array.prototype.slice.call(container.querySelectorAll('.selector'));
    if(!nodes.length) return;
    var idx = Math.max(0, nodes.findIndex(function(n){ return n.classList.contains('focus'); }));
    if (idx<0) idx=0;
    var next = idx;
    if (dir==='down' || dir==='right') next = Math.min(nodes.length-1, idx+1);
    else if (dir==='up' || dir==='left') next = Math.max(0, idx-1);
    if (next !== idx) setFocus(container, nodes[next]);
  }

  // ---------- Modal (Lampa-first, fallback-second) ----------
  function openModal(title){
    injectStyles();
    // гарантуємо один попап
    closeAllPlayUaModals();

    var $ = window.$ || window.jQuery; // Lampa зазвичай надає $
    var $body = $ ? $('<div class="playua-body"></div>') : null;

    var usingLampa = false;
    try{
      if (window.Lampa && Lampa.Modal && typeof Lampa.Modal.open==='function' && $){
        Lampa.Modal.open({
          title: String(title||''),
          html: $body,
          size: 'large',
          onBack: function(){
            try{ Lampa.Modal.close(); }catch(e){}
            try{ Lampa.Controller.toggle('content'); }catch(e){}
          }
        });
        usingLampa = true;
      }
    }catch(e){ usingLampa = false; }

    // Fallback-overlay
    var fallback = null, fallbackBody = null, fallbackClose = function(){};
    var fallbackKeydown = null;
    if (!usingLampa){
      var root = document.createElement('div'); root.className='playua-fallback playua-modal';
      var card = document.createElement('div'); card.className='playua-card';
      var head = document.createElement('div'); head.className='playua-head'; head.textContent=String(title||'');
      var body = document.createElement('div'); body.className='playua-body';
      card.appendChild(head); card.appendChild(body); root.appendChild(card);
      document.body.appendChild(root);
      fallback = root; fallbackBody = body;

      fallbackKeydown = function(e){
        var code = e.key || e.keyCode;
        // back/esc
        if (code==='Escape' || code==='Backspace' || code==='BrowserBack' || code==='GoBack' || code===8 || code===27 || code===10009 || code===461){
          e.preventDefault(); fallbackClose(); return;
        }
        // arrows
        if (code==='ArrowDown' || code===40){ e.preventDefault(); moveFocus(fallbackBody,'down'); return; }
        if (code==='ArrowUp'   || code===38){ e.preventDefault(); moveFocus(fallbackBody,'up');   return; }
        if (code==='ArrowLeft' || code===37){ e.preventDefault(); moveFocus(fallbackBody,'left'); return; }
        if (code==='ArrowRight'|| code===39){ e.preventDefault(); moveFocus(fallbackBody,'right');return; }
        // enter
        if (code==='Enter' || code===13){
          e.preventDefault();
          var cur = fallbackBody.querySelector('.selector.focus');
          if (cur){
            var $ = window.$ || window.jQuery;
            if ($) $(cur).trigger('hover:enter');
            else cur.click();
          }
        }
      };
      document.addEventListener('keydown', fallbackKeydown, true);
      fallbackClose = function(){
        try{ document.removeEventListener('keydown', fallbackKeydown, true); }catch(e){}
        try{ fallback.parentNode && fallback.parentNode.removeChild(fallback); }catch(e){}
        try{ if (window.Lampa && Lampa.Controller) Lampa.Controller.toggle('content'); }catch(e){}
      };
    }

    // Контролер Lampa для попапа (up/down/enter/back) — чисто та ізольовано
    try{
      if (usingLampa && window.Lampa && Lampa.Controller && typeof Lampa.Controller.add==='function'){
        Lampa.Controller.add('playua_modal',{
          toggle: function(){
            try{
              if ($body) Lampa.Controller.collectionSet($body);
              // гарантуємо фокус усередині
              focusFirst($body && $body[0]);
            }catch(e){}
          },
          up:    function(){ try{ moveFocus($body && $body[0],'up'); }catch(e){} },
          down:  function(){ try{ moveFocus($body && $body[0],'down'); }catch(e){} },
          left:  function(){ try{ moveFocus($body && $body[0],'left'); }catch(e){} },
          right: function(){ try{ moveFocus($body && $body[0],'right'); }catch(e){} },
          enter: function(){
            try{
              var el = $body && $body.find('.selector.focus').get(0);
              if (!el) el = $body && $body.find('.selector').get(0);
              if (el){
                var $ = window.$ || window.jQuery;
                if ($) $(el).trigger('hover:enter');
                else el.click();
              }
            }catch(e){}
          },
          back:  function(){
            try{
              if (usingLampa){ Lampa.Modal.close(); Lampa.Controller.toggle('content'); }
            }catch(e){}
          }
        });
        setTimeout(function(){ try{ Lampa.Controller.toggle('playua_modal'); }catch(e){} }, 0);
      }
    }catch(e){}

    function setItems(itemsFragment){
      if (usingLampa){
        try{
          $body.empty().append(itemsFragment);
          Lampa.Controller.collectionSet($body);
          Lampa.Controller.toggle('playua_modal');
          focusFirst($body[0]);
        }catch(e){}
      } else {
        try{
          fallbackBody.innerHTML='';
          fallbackBody.appendChild(itemsFragment);
          // перший елемент відразу у фокусі
          focusFirst(fallbackBody);
        }catch(e){}
      }
    }
    function setLoading(text){
      if (usingLampa){
        var row = $('<div class="playua-loader"><div class="loader" style="width:26px;height:26px;border:3px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:plr .8s linear infinite"></div><div>'+(text||'Завантаження...')+'</div></div>');
        $body.empty().append(row);
        try{ Lampa.Controller.collectionSet($body); Lampa.Controller.toggle('playua_modal'); focusFirst($body[0]); }catch(e){}
      } else {
        var d = document.createElement('div'); d.className='playua-loader'; d.textContent = String(text||'Завантаження...');
        fallbackBody.innerHTML=''; fallbackBody.appendChild(d);
      }
    }
    function closeAll(){
      if (usingLampa){ try{ Lampa.Modal.close(); }catch(e){} }
      else { fallbackClose(); }
    }

    return { setItems:setItems, setLoading:setLoading, close:closeAll, bodyNode: usingLampa ? ($body && $body[0]) : fallbackBody };
  }

  // ---------- UI builders ----------
  function makePackHeader(text){
    var $ = window.$ || window.jQuery;
    if ($) return $('<div class="playua-pack-title"><span class="playua-folder">'+(text||'Реліз')+'</span></div>');
    var div = document.createElement('div'); div.className='playua-pack-title';
    var badge=document.createElement('span'); badge.className='playua-folder'; badge.textContent=String(text||'Реліз');
    div.appendChild(badge); return div;
  }
  function makeEpisodeRow(epNum, name, stillUrl, sizeText, tail){
    var $ = window.$ || window.jQuery;
    var title = 'S'+String(epNum.season||1)+'E'+String(epNum.ep||0).padStart(2,'0')+' — '+(name||('Серія '+(epNum.ep||'')));
    if ($){
      return $('<div class="playua-row selector" tabindex="0">'
        +'<div class="playua-thumb" style="background-image:url(\''+(stillUrl||'')+'\')"></div>'
        +'<div>'
          +'<div class="playua-title">'+title+'</div>'
          +'<div class="playua-sub">'+(tail||'')+'</div>'
        +'</div>'
        +'<div class="playua-size">'+(sizeText||'')+'</div>'
      +'</div>');
    } else {
      var row=document.createElement('div'); row.className='playua-row selector'; row.tabIndex=0;
      var th=document.createElement('div'); th.className='playua-thumb'; th.style.backgroundImage="url('"+(stillUrl||"")+"')";
      var mid=document.createElement('div');
      var t=document.createElement('div'); t.className='playua-title'; t.textContent=title;
      var sub=document.createElement('div'); sub.className='playua-sub'; sub.textContent=String(tail||'');
      var size=document.createElement('div'); size.className='playua-size'; size.textContent=String(sizeText||'');
      mid.appendChild(t); mid.appendChild(sub); row.appendChild(th); row.appendChild(mid); row.appendChild(size);
      return row;
    }
  }

  // ---------- Parsing helpers ----------
  function humanSize(bytes){
    if (bytes===null || typeof bytes==='undefined') return '';
    var u=['B','KB','MB','GB','TB']; var i=0; var n=Number(bytes);
    while(n>=1024 && i<u.length-1){ n/=1024; i++; }
    return (i>=2? n.toFixed(1):Math.round(n))+' '+u[i];
  }
  function extractSeasonsFromTitle(s){
    var str = String(s||'');
    var out = {};
    var rng = str.match(/s(?:eason)?\s*(\d{1,2})\s*[-–…]\s*(\d{1,2})/i);
    if (rng){ var a=Number(rng[1]), b=Number(rng[2]); for(var i=a;i<=b;i++) out[i]=1; }
    var re = /(?:s(?:eason)?\s*(\d{1,2})|\bS(\d{1,2})\b|(?:[^\d]|^)(\d{1,2})\s*сез)/gi, m;
    while((m=re.exec(str))!==null){ var n = Number(m[1]||m[2]||m[3]); if(n) out[n]=1; }
    var keys = Object.keys(out).map(function(x){return Number(x);});
    if (!keys.length) keys=[1];
    return keys;
  }
  function parseEpisodeNum(path, seasonHint){
    var name = String(path||'').split('/').pop();
    var m = name.match(/s(\d{1,2})e(\d{1,3})/i); if (m) return { season:Number(m[1]), ep:Number(m[2]) };
    m = name.match(/(\d{1,2})x(\d{1,3})/i);      if (m) return { season:Number(m[1]), ep:Number(m[2]) };
    m = name.match(/e[pP]?(\d{1,3})/i);          if (m) return { season:seasonHint||0, ep:Number(m[1]) };
    m = name.match(/сер(ія|iя)?\s*(\d{1,3})/i);  if (m) return { season:seasonHint||0, ep:Number(m[2]) };
    return { season:seasonHint||0, ep:0 };
  }
  function topFolderFromFiles(files){
    for(var i=0;i<(files||[]).length;i++){
      var f = files[i];
      var p = String(f.path||'').replace(/^\/+/, '');
      if (p.indexOf('/')>=0){ var seg = p.split('/')[0].trim(); if (seg) return seg; }
    }
    return '';
  }

  // ---------- SERIES flow ----------
  async function showSeasons(meta){
    var combos={ df:meta.orig, df_year:String(meta.orig), lg:meta.title, lg_df:(meta.title+' '+meta.orig) };
    var pref='df';
    try{ pref = Lampa.Storage.field('parse_lang')||'df'; }catch(e){}
    var query = String(combos[pref] || meta.orig).trim();

    noty('UaDV: шукаю сезони — '+query);  

    var items = await jSearchTorznab(query, SERIES_CATS);
    if(!items.length) items = await jSearchJSON(query, SERIES_CATS, { title:meta.title, orig:meta.orig, is_serial:1 });
    if(!items.length) throw new Error('Jackett: немає результатів');

    var bySeason = {};
    for(var i=0;i<items.length;i++){
      var it = items[i];
      var seasons = extractSeasonsFromTitle(it.title);
      for(var k=0;k<seasons.length;k++){
        var s = seasons[k];
        if(!bySeason[s]) bySeason[s]=[];
        bySeason[s].push(it);
      }
    }

    var seasonNums = Object.keys(bySeason).map(function(x){return Number(x);}).sort(function(a,b){return a-b;});
    if(!seasonNums.length) throw new Error('Не знайдено релізів сезонів');

    // Prefetch TMDB season posters (fallback to series poster)
    var posters = {};
    await Promise.all(seasonNums.map(async function(sn){
      try{
        var r = await fetch(tmdbUrl('tv/'+meta.tvId+'/season/'+sn, { language: tmdbLang() }));
        if (r.ok){
          var j = await r.json();
          posters[sn] = (j && j.poster_path) ? tmdbImg(j.poster_path, 'w300') : (meta.poster||'');
        } else posters[sn] = meta.poster||'';
      }catch(e){ posters[sn] = meta.poster||''; }
    }));

    var dlg = openModal('ОБЕРИ СЕЗОН');

    var $ = window.$ || window.jQuery;
    var frag = document.createDocumentFragment();

    for(var si=0; si<seasonNums.length; si++){
      var sn = seasonNums[si];
      var rels = bySeason[sn] || [];
      var bestSize = '';
      if (rels.length){
        var maxSize = 0;
        for (var ri=0;ri<rels.length;ri++){ var sz = Number(rels[ri].size||0); if (sz>maxSize) maxSize=sz; }
        bestSize = humanSize(maxSize);
      }
      var thumb = posters[sn] ? "background-image:url('"+posters[sn]+"')" : 'background:#222';
      if ($){
        var row = $('<div class="playua-row selector" tabindex="0"><div class="playua-thumb" style="'+thumb+'"></div><div><div class="playua-title">СЕЗОН №'+sn+'</div><div class="playua-sub">Варіантів: '+rels.length+'</div></div><div class="playua-size">'+(bestSize||'')+'</div></div>');
        (function(snCopy, relsCopy){
          row.on('hover:enter click keydown', function(e){
            if (e.type==='keydown' && e.key!=='Enter' && e.keyCode!==13) return;
            fetchEpisodesAggregated(meta, snCopy, relsCopy);
          });
        })(sn, rels);
        frag.appendChild(row[0]);
      } else {
        var row2 = document.createElement('div'); row2.className='playua-row selector'; row2.tabIndex=0;
        var th=document.createElement('div'); th.className='playua-thumb'; th.style=thumb;
        var mid=document.createElement('div');
        var t=document.createElement('div'); t.className='playua-title'; t.textContent='СЕЗОН №'+sn;
        var sub=document.createElement('div'); sub.className='playua-sub'; sub.textContent='Варіантів: '+rels.length;
        var size=document.createElement('div'); size.className='playua-size'; size.textContent=bestSize||'';
        mid.appendChild(t); mid.appendChild(sub); row2.appendChild(th); row2.appendChild(mid); row2.appendChild(size);
        (function(snCopy, relsCopy, el){
          el.addEventListener('click', function(){ fetchEpisodesAggregated(meta, snCopy, relsCopy); });
          el.addEventListener('keydown', function(e){ if (e.key==='Enter' || e.keyCode===13) fetchEpisodesAggregated(meta, snCopy, relsCopy); });
        })(sn, rels, row2);
        frag.appendChild(row2);
      }
    }

    dlg.setItems(frag);
  }

  async function fetchEpisodesAggregated(meta, sn, releases){
    var dlg = openModal('СЕЗОН '+sn+' — релізи та серії');
    dlg.setLoading('Готую релізи…');

    // TMDB names & stills
    var tmdbSeason=null, names={}, stills={};
    try{
      var r=await fetch(tmdbUrl('tv/'+meta.tvId+'/season/'+sn,{language:tmdbLang()}));
      if(r.ok) tmdbSeason=await r.json();
    }catch(e){}
    if (tmdbSeason && Array.isArray(tmdbSeason.episodes)){
      for (var i=0;i<tmdbSeason.episodes.length;i++){
        var e = tmdbSeason.episodes[i];
        names[e.episode_number]= e.name||'';
        stills[e.episode_number]= tmdbImg(e.still_path, 'w300');
      }
    }

    var base = tsBase();
    var groups = {}; // folder -> [{ep,file,hash,size,folder}]
    var order  = [];

    for(var ri=0;ri<releases.length;ri++){
      var rel = releases[ri];
      var link = rel.dl || rel.magnet || rel.link; var hash = link;
      try{
        var added = await tsAdd(base, link, meta.title+' (S'+sn+')', '', meta.full);
        if (added.hash) hash = added.hash;
      }catch(e){}

      try{
        var resp = await tsFiles(base, hash);
        var files = resp.files || [];
        if(!files.length) continue;
        var vids = files.filter(function(x){ return looksLikeVideo(x.path) && Number(x.length||0) >= MIN_EP_BYTES; });
        if(!vids.length) continue;

        var folder = topFolderFromFiles(vids) || rel.title || 'Реліз';
        if (!groups[folder]){ groups[folder]=[]; order.push(folder); }

        for(var fi=0;fi<vids.length;fi++){
          var f = vids[fi];
          var parsed = parseEpisodeNum(f.path, sn);
          var ep = parsed.ep||0; if(!ep) continue;
          var size = Number(f.length||0);
          var existedIndex = -1;
          for (var j=0;j<groups[folder].length;j++){ if (groups[folder][j].ep===ep){ existedIndex = j; break; } }
          if (existedIndex===-1){
            groups[folder].push({ ep:ep, file:f, hash:hash, size:size, folder:folder });
          } else {
            if (size > groups[folder][existedIndex].size){
              groups[folder][existedIndex] = { ep:ep, file:f, hash:hash, size:size, folder:folder };
            }
          }
        }
      }catch(e){}
    }

    var $ = window.$ || window.jQuery;
    var frag = document.createDocumentFragment();

    for (var oi=0; oi<order.length; oi++){
      var folder = order[oi];
      var items = groups[folder]||[];
      if (!items.length) continue;
      items.sort(function(a,b){ return a.ep - b.ep; });

      var color = PACK_COLORS[oi % PACK_COLORS.length];
      var wrap = document.createElement('div'); wrap.className='playua-pack'; wrap.style.setProperty('--pack', color);

      var header = makePackHeader(folder);
      wrap.appendChild(header instanceof Element ? header : header[0]);

      for (var ii=0; ii<items.length; ii++){
        var it = items[ii];
        var row = makeEpisodeRow({season:sn, ep:it.ep}, names[it.ep]||('Серія '+it.ep), stills[it.ep]||'', humanSize(it.size), folder);
        (function(h, f, t, el){
          if ($){
            $(row).on('hover:enter click keydown', function(e){
              if (e.type==='keydown' && e.key!=='Enter' && e.keyCode!==13) return;
              tsPlayById(h, f, t);
            });
            wrap.appendChild(row[0]);
          } else {
            el.addEventListener('click', function(){ tsPlayById(h, f, t); });
            el.addEventListener('keydown', function(e){ if (e.key==='Enter'||e.keyCode===13) tsPlayById(h, f, t); });
            wrap.appendChild(el);
          }
        })(it.hash, it.file, (meta.title+' S'+sn+'E'+String(it.ep).padStart(2,'0')), (row instanceof Element?row:row[0]));
      }

      frag.appendChild(wrap);
    }

    if (!frag.children.length){
      dlg.setLoading('Не знайдено серій ≥500MB для цього сезону');
      return;
    }
    dlg.setItems(frag);
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
  
  // Фільтрація за розміром та бітрейтом  
  items = items.filter(function(x){     
    if (x.size > MAX_MOVIE_SIZE) return false;    
    if (meta.runtime > 0) {    
      var estimatedBitrate = (x.size / (meta.runtime * 60)) / 125000;    
      if (estimatedBitrate > MAX_BITRATE) return false;    
    }    
    return true;    
  });  
  
  if(!items.length) throw new Error('Jackett: немає результатів у межах обмежень (60GB, 70Mbps)');  
  
  // ДОДАНО: Пріоритет Dolby Vision  
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
