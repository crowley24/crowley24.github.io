/* Оригінальний плагін https://github.com/wapmax/lampa_plugins/blob/main/lampa_random.js
 */ 

(function () {  
  'use strict';  
  
  if (window.plugin_lampa_random_ready) return;  
  window.plugin_lampa_random_ready = true;  
  
  var MENU_ID = 'lampa_random_menu';  
  
  var STORAGE_VOTE_FROM = 'lampa_random_vote_from';  
  var STORAGE_VOTE_TO = 'lampa_random_vote_to';  
  var STORAGE_GENRES = 'lampa_random_genres';  
  var STORAGE_YEAR_FROM = 'lampa_random_year_from';  
  var STORAGE_YEAR_TO = 'lampa_random_year_to';  
  
  var TMDB_GENRES = {  
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',  
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',  
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',  
    53: 'Thriller', 10752: 'War', 37: 'Western'  
  };  
  
  // Тільки жанри: жахи, триллер, містика, бойовик  
  var DEFAULT_GENRES = [27, 53, 9648, 28];  
  
  function tr(key, def) {  
    try { return Lampa.Lang.translate(key); } catch(e) {}  
    return def || key;  
  }  
  
  function addTranslations() {  
    if (!window.Lampa || !Lampa.Lang) return;  
    Lampa.Lang.add({  
      lampa_random_name: { ru: 'Мне повезёт', uk: 'Випадкова добірка' },  
      lampa_random_title: { ru: 'Мне повезёт', uk: 'Випадкова добірка' },  
      lampa_random_vote_from: { ru: 'Рейтинг: От', uk: 'Рейтинг: Від' },  
      lampa_random_vote_to: { ru: 'До', uk: 'До' },  
      lampa_random_apply: { ru: 'Применить', uk: 'Застосувати' },  
      lampa_random_genres: { ru: 'Жанры', uk: 'Жанри' },  
      lampa_random_year_from: { ru: 'Год от', uk: 'Рік від' },  
      lampa_random_year_to: { ru: 'До', uk: 'До' }  
    });  
  }  
  
  function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }  
  function shuffle(arr) { for(var i=arr.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)); var t=arr[i]; arr[i]=arr[j]; arr[j]=t;} return arr; }  
  function nowYear() { return new Date().getFullYear(); }  
  function clamp(v,a,b){if(v<a)return a;if(v>b)return b;return v;}  
  function roundHalf(v){return Math.round(v*2)/2;}  
  function formatVote(v){return (v.toFixed(1)+'').replace('.',',');}  
  
  // STORAGE helpers  
  function ensureDefaultRange() {  
    try {  
      var f = Lampa.Storage.get(STORAGE_VOTE_FROM,null);  
      var t = Lampa.Storage.get(STORAGE_VOTE_TO,null);  
      if(f===null||f===undefined||f==='') Lampa.Storage.set(STORAGE_VOTE_FROM,6.0);  
      if(t===null||t===undefined||t==='') Lampa.Storage.set(STORAGE_VOTE_TO,10.0);  
  
      if(Lampa.Storage.get(STORAGE_GENRES)==null) Lampa.Storage.set(STORAGE_GENRES,DEFAULT_GENRES);  
      if(Lampa.Storage.get(STORAGE_YEAR_FROM)==null) Lampa.Storage.set(STORAGE_YEAR_FROM,1980);  
      if(Lampa.Storage.get(STORAGE_YEAR_TO)==null) Lampa.Storage.set(STORAGE_YEAR_TO, nowYear());  
    } catch(e){}  
  }  
  
  function getVoteFrom(){var v=6.0; try{v=parseFloat(Lampa.Storage.get(STORAGE_VOTE_FROM,6.0)); if(isNaN(v))v=6.0;}catch(e){v=6.0;} return roundHalf(clamp(v,1,10));}  
  function getVoteTo(){var v=10.0; try{v=parseFloat(Lampa.Storage.get(STORAGE_VOTE_TO,10.0)); if(isNaN(v))v=10.0;}catch(e){v=10.0;} return roundHalf(clamp(v,1,10));}  
  function setVoteRange(f,t){f=roundHalf(clamp(f,1,10)); t=roundHalf(clamp(t,1,10)); if(f>t)t=f; try{Lampa.Storage.set(STORAGE_VOTE_FROM,f);}catch(e){} try{Lampa.Storage.set(STORAGE_VOTE_TO,t);}catch(e){}}  
  
  function getGenres(){try{return Lampa.Storage.get(STORAGE_GENRES,DEFAULT_GENRES);}catch(e){return DEFAULT_GENRES;}}  
  function setGenres(arr){try{Lampa.Storage.set(STORAGE_GENRES,arr);}catch(e){}}  
  
  function getYearFrom(){return Lampa.Storage.get(STORAGE_YEAR_FROM,1980);}  
  function getYearTo(){return Lampa.Storage.get(STORAGE_YEAR_TO, nowYear());}  
  function setYears(f,t){if(f>t)t=f; Lampa.Storage.set(STORAGE_YEAR_FROM,f); Lampa.Storage.set(STORAGE_YEAR_TO,t);}  
  
  function getLang(){var l='uk'; try{l=Lampa.Storage.get('language','uk')||'uk';}catch(e){} if(l==='ua')l='uk'; return l+'-'+String(l).toUpperCase();}  
  
  function normalizeItem(it,type){it=it||{}; it.type=type; it.media_type=type; it.source='tmdb'; it.title=it.title||it.name||it.original_title||it.original_name||''; it.name=it.name||it.title||''; return it;}  
  
  function makeDiscoverParams(type,page,voteFrom,voteTo,baseParams){  
    var y = nowYear();  
    var y1 = randInt(1960,y);  
    var y2 = Math.min(y, y1+randInt(0,12));  
    var params = {  
      page: page,  
      language: (baseParams && baseParams.language) ? baseParams.language : getLang(),  
      include_adult:false,  
      sort_by: (Math.random()<0.85?'popularity.desc':'vote_average.desc'),  
      'vote_count.gte': randInt(150,1500),  
      'vote_average.gte': voteFrom,  
      'vote_average.lte': voteTo  
    };  
      
    // Always use user-defined year range  
    var yf=getYearFrom(); var yt=getYearTo();  
    if(type==='movie'){   
      params['primary_release_date.gte']=yf+'-01-01';   
      params['primary_release_date.lte']=yt+'-12-31';   
    } else {   
      params['first_air_date.gte']=yf+'-01-01';   
      params['first_air_date.lte']=yt+'-12-31';   
    }  
  
    // Always apply genre filter  
    var genres = getGenres();   
    if(genres && genres.length) params.with_genres=genres.join(',');  
  
    try{ var region=(baseParams&&baseParams.region)?baseParams.region:Lampa.Storage.get('region',''); if(region) params.region=region;}catch(e){}  
  
    return params;  
  }  
  
  function tmdbGet(req,params,ok,bad){try{var tmdb=Lampa.Api&&Lampa.Api.sources&&Lampa.Api.sources.tmdb; if(!tmdb||typeof tmdb.get!=='function') return bad&&bad('NO_TMDB_GET'); tmdb.get(req,params,ok,bad);}catch(e){bad&&bad(e);}}  
  
  function filterByVote(items,voteFrom,voteTo){var out=[]; for(var i=0;i<items.length;i++){var v=parseFloat(items[i].vote_average); if(isNaN(v))continue; if(v>=voteFrom&&v<=voteTo) out.push(items[i]);} return out;}  
  
  function buildMixedResponse(page,voteFrom,voteTo,baseParams,done,attempt){  
    attempt=attempt||0;  
    // Only fetch movies  
    var tasks=[{type:'movie',page:randInt(1,500)},{type:'movie',page:randInt(1,500)},{type:'movie',page:randInt(1,500)},{type:'movie',page:randInt(1,500)}];  
    var res=[]; var left=tasks.length;  
    function oneDone(){left--; if(left>0)return;  
      var filtered=filterByVote(res,voteFrom,voteTo);  
      shuffle(filtered);  
      if(filtered.length<24&&attempt<2){ buildMixedResponse(page,voteFrom,voteTo,baseParams,done,attempt+1); return; }  
      var result={ page:page, total_pages:500, total_results:999999, results:filtered};  
      try{ if(Lampa.Utils&&typeof Lampa.Utils.addSource==='function') Lampa.Utils.addSource(result,'tmdb'); }catch(e){}  
      done(result);  
    }  
    for(var i=0;i<tasks.length;i++){  
      (function(task){  
        var req=task.type==='movie'?'discover/movie':'discover/tv';  
        var p=makeDiscoverParams(task.type,task.page,voteFrom,voteTo,baseParams);  
        tmdbGet(req,p,function(json){ var list=(json&&json.results)?json.results:[]; for(var k=0;k<list.length;k++) res.push(normalizeItem(list[k],task.type)); oneDone();},function(){oneDone();});  
      })(tasks[i]);  
    }  
  }  
  
  function patchAjaxForVirtualEndpoint(){  
    if(!window.$||!$.ajax)return;  
    if($.ajax.__lampa_random_patched) return;  
    $.ajax.__lampa_random_patched=true;  
    var originalAjax=$.ajax;  
    $.ajax=function(options){  
      try{  
        var url=options&&options.url?String(options.url):'';  
        if(/\/3\/lampa_random(\?|$)/.test(url)){  
          var data=options.data||{};  
          var page=parseInt(data.page||1,10)||1;  
          var voteFrom=getVoteFrom();  
          var voteTo=getVoteTo();  
          if(voteFrom>voteTo){ voteTo=voteFrom; setVoteRange(voteFrom,voteTo);}  
          var baseParams={ language:data.language||getLang(), region:data.region||''};  
          var dfd=$.Deferred(); var jq=dfd.promise(); jq.abort=function(){};  
          buildMixedResponse(page,voteFrom,voteTo,baseParams,function(json){  
            setTimeout(function(){  
              try{if(options.success) options.success(json,'success',jq);}catch(e1){}  
              try{if(options.complete) options.complete(jq,'success');}catch(e2){}  
              dfd.resolve(json,'success',jq);  
            },0);  
          });  
          return jq;  
        }  
      }catch(e){}  
      return originalAjax.apply(this,arguments);  
    };  
  }  
  
  function activityParams(url){ return { url:url, title:tr('lampa_random_name','Випадкова добірка'), component:'category_full', source:'tmdb', sort:'now', card_type:true, page:1, lampa_random_ui:1}; }  
  
  function scheduleInject(){  
    var tries=0;  
    var id=setInterval(function(){tries++; injectControls(); if(tries>=120) clearInterval(id);},250);  
  }  
  
  function openScreen(){ patchAjaxForVirtualEndpoint(); ensureDefaultRange(); var url='lampa_random?rnd='+Date.now(); Lampa.Activity.push(activityParams(url)); Lampa.Controller.toggle('content'); scheduleInject();}  
  function refreshScreen(){ patchAjaxForVirtualEndpoint(); var url='lampa_random?rnd='+Date.now(); Lampa.Activity.replace(activityParams(url)); scheduleInject();}  
  
  function buildVoteItems(current){var items=[];for(var x=60;x<=100;x+=5){var v=x/10; items.push({title:formatVote(v), value:v, selected:v===current});} return items;}  
  function buildYearItems(current){var items=[]; var y=nowYear(); for(var i=y;i>=1960;i--){items.push({title:i+'', value:i, selected:i===current});} return items;}  
  
  function injectControls(){  
    try{  
      var active=Lampa.Activity.active();  
      if(!active||!active.activity) return false;  
      var p=active.params||{};  
      if(p.component!=='category_full'||!p.lampa_random_ui) return false;  
      var $render=active.activity.render();  
      if(!$render||!$render.length) return false;  
      var $scrollBody=$render.find('.scroll__body').eq(0);  
      if(!$scrollBody.length) return false;  
  
      var $existing=$scrollBody.find('[data-lr-top="1"]').eq(0);  
      if($existing.length){  
        var f0=getVoteFrom(),t0=getVoteTo();  
        if(f0>t0){t0=f0; setVoteRange(f0,t0);}  
        $existing.find('[data-lr-role="from"]').text(tr('lampa_random_vote_from','Рейтинг: Від')+' '+formatVote(f0));  
        $existing.find('[data-lr-role="to"]').text(tr('lampa_random_vote_to','До')+' '+formatVote(t0));  
        $existing.find('[data-lr-role="apply"]').text(tr('lampa_random_apply','Застосувати'));  
        return true;  
      }  
  
      var voteFrom=getVoteFrom(), voteTo=getVoteTo();  
      if(voteFrom>voteTo){voteTo=voteFrom; setVoteRange(voteFrom,voteTo);}  
      var $bar=$('<div class="buttons" data-lr-top="1"></div>').css({display:'flex',gap:'0.6em',padding:'0.8em 1em',alignItems:'center',flexWrap:'wrap'});  
  
      var $fromBtn=$('<div class="selector button" data-lr-role="from"></div>');  
      var $toBtn=$('<div class="selector button" data-lr-role="to"></div>');  
      var $genresBtn=$('<div class="selector button">'+tr('lampa_random_genres','Жанри')+'</div>');  
      var $yearFromBtn=$('<div class="selector button">'+tr('lampa_random_year_from','Рік від')+'</div>');  
      var $yearToBtn=$('<div class="selector button">'+tr('lampa_random_year_to','До')+'</div>');  
      var $applyBtn=$('<div class="selector button" data-lr-role="apply"></div>');  
  
      function updateTexts(){ var f=getVoteFrom(); var t=getVoteTo(); if(f>t){t=f; setVoteRange(f,t);} $fromBtn.text(tr('lampa_random_vote_from','Рейтинг: Від')+' '+formatVote(f)); $toBtn.text(tr('lampa_random_vote_to','До')+' '+formatVote(t)); $applyBtn.text(tr('lampa_random_apply','Застосувати')); }  
  
      $fromBtn.on('hover:enter', function(){ Lampa.Select.show({ title:tr('lampa_random_vote_from','Рейтинг: Від'), items:buildVoteItems(getVoteFrom()), onSelect:function(a){var from=a.value; var to=getVoteTo(); if(from>to) to=from; setVoteRange(from,to); updateTexts(); Lampa.Controller.toggle('content');}, onBack:function(){Lampa.Controller.toggle('content');} });});  
      $toBtn.on('hover:enter', function(){ Lampa.Select.show({ title:tr('lampa_random_vote_to','До'), items:buildVoteItems(getVoteTo()), onSelect:function(a){var to=a.value; var from=getVoteFrom(); if(from>to) from=to; setVoteRange(from,to); updateTexts(); Lampa.Controller.toggle('content');}, onBack:function(){Lampa.Controller.toggle('content');} });});  
  
      $genresBtn.on('hover:enter', function(){  
        Lampa.Select.show({ title:tr('lampa_random_genres','Жанри'), multiselect:true, items:Object.keys(TMDB_GENRES).map(function(id){return {title:TMDB_GENRES[id],value:id,selected:getGenres().indexOf(id)!==-1};}), onSelect:function(items){ setGenres(items.map(function(i){return i.value;})); Lampa.Controller.toggle('content'); } });  
      });  
  
      $yearFromBtn.on('hover:enter', function(){ Lampa.Select.show({ title:tr('lampa_random_year_from','Рік від'), items:buildYearItems(getYearFrom()), onSelect:function(a){ setYears(a.value,getYearTo()); Lampa.Controller.toggle('content');} }); });  
      $yearToBtn.on('hover:enter', function(){ Lampa.Select.show({ title:tr('lampa_random_year_to','До'), items:buildYearItems(getYearTo()), onSelect:function(a){ setYears(getYearFrom(),a.value); Lampa.Controller.toggle('content');} }); });  
  
      $applyBtn.on('hover:enter', refreshScreen);  
  
      updateTexts();  
  
      $bar.append($fromBtn).append($toBtn).append($genresBtn).append($yearFromBtn).append($yearToBtn).append($applyBtn);  
      $scrollBody.prepend($bar);  
      return true;  
    }catch(e){return false;}  
  }  
  
 function addMenuItem(){  
  var title=tr('lampa_random_name','Випадкова добірка');  
  var $btn=$('<li class="menu__item selector" data-id="'+MENU_ID+'"><div class="menu__ico"><svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" style="width: 2em; height: 2em;"><defs><linearGradient id="cubeTop" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1"/><stop offset="100%" style="stop-color:#ee5a52;stop-opacity:1"/></linearGradient><linearGradient id="cubeLeft" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ee5a52;stop-opacity:1"/><stop offset="100%" style="stop-color:#c44569;stop-opacity:1"/></linearGradient><linearGradient id="cubeRight" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#f8b500;stop-opacity:1"/><stop offset="100%" style="stop-color:#fceabb;stop-opacity:1"/></linearGradient><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/><feOffset dx="1" dy="2" result="offsetblur"/><feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#shadow)"><path d="M12 4 L20 8 L20 16 L12 20 L4 16 L4 8 Z" fill="url(#cubeTop)" stroke="#c44569" stroke-width="0.8"/><path d="M4 8 L12 12 L12 20 L4 16 Z" fill="url(#cubeLeft)" stroke="#c44569" stroke-width="0.8"/><path d="M12 12 L20 8 L20 16 L12 20 Z" fill="url(#cubeRight)" stroke="#f8b500" stroke-width="0.8"/><circle cx="12" cy="10" r="1.2" fill="#fff"/><circle cx="8" cy="14" r="1.2" fill="#fff"/><circle cx="16" cy="14" r="1.2" fill="#fff"/></g></svg></div><div class="menu__text">'+title+'</div></li>');  
  $btn.on('hover:enter',openScreen);  
  
  // чекатиме меню, поки не з'явиться  
  var tries=0;  
  var id=setInterval(function(){  
    var $menu=$('.menu .menu__list').eq(0);  
    if($menu.length){   
      // Додаємо після пункту "Каталог" для кращого розташування  
      var $catalogItem = $menu.find('[data-id="main"]').eq(0);  
      if($catalogItem.length){  
        $catalogItem.after($btn);  
      } else {  
        $menu.append($btn);  
      }  
      clearInterval(id);   
    }  
    if(++tries>100) clearInterval(id);  
  },100);  
}
  
  function init(){  
    if(!window.Lampa||!Lampa.Activity||!Lampa.Api) return;  
    addTranslations(); ensureDefaultRange(); patchAjaxForVirtualEndpoint();  
    if(window.appready) addMenuItem();  
    else if(Lampa.Listener&&typeof Lampa.Listener.follow==='function'){  
      Lampa.Listener.follow('app',function(e){ if(e.type==='ready') addMenuItem(); });  
    }  
  }  
  
  init();  
})();
