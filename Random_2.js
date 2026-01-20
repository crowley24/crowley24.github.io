/* Title: lampa_random
 * Version: 1.0.3
 * Description: Random movies and TV shows with rating, genres, years sort
 * Author: wapmax + modified by Eugene
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

  function tr(key, def) {
    try { return Lampa.Lang.translate(key); } catch(e) {}
    return def || key;
  }

  function addTranslations() {
    if (!window.Lampa || !Lampa.Lang) return;
    Lampa.Lang.add({
      lampa_random_name: { ru: 'Мне повезёт' },
      lampa_random_title: { ru: '🎲 Мне повезёт' },
      lampa_random_vote_from: { ru: 'Рейтинг: От' },
      lampa_random_vote_to: { ru: 'До' },
      lampa_random_apply: { ru: 'Применить' }
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
      if(f===null||f===undefined||f==='') Lampa.Storage.set(STORAGE_VOTE_FROM,5.5);
      if(t===null||t===undefined||t==='') Lampa.Storage.set(STORAGE_VOTE_TO,9.5);

      if(Lampa.Storage.get(STORAGE_GENRES)==null) Lampa.Storage.set(STORAGE_GENRES,[]);
      if(Lampa.Storage.get(STORAGE_YEAR_FROM)==null) Lampa.Storage.set(STORAGE_YEAR_FROM,1980);
      if(Lampa.Storage.get(STORAGE_YEAR_TO)==null) Lampa.Storage.set(STORAGE_YEAR_TO, nowYear());
    } catch(e){}
  }

  function getVoteFrom(){var v=5.5; try{v=parseFloat(Lampa.Storage.get(STORAGE_VOTE_FROM,5.5)); if(isNaN(v))v=5.5;}catch(e){v=5.5;} return roundHalf(clamp(v,1,10));}
  function getVoteTo(){var v=9.5; try{v=parseFloat(Lampa.Storage.get(STORAGE_VOTE_TO,9.5)); if(isNaN(v))v=9.5;}catch(e){v=9.5;} return roundHalf(clamp(v,1,10));}
  function setVoteRange(f,t){f=roundHalf(clamp(f,1,10)); t=roundHalf(clamp(t,1,10)); if(f>t)t=f; try{Lampa.Storage.set(STORAGE_VOTE_FROM,f);}catch(e){} try{Lampa.Storage.set(STORAGE_VOTE_TO,t);}catch(e){}}

  function getGenres(){try{return Lampa.Storage.get(STORAGE_GENRES,[]);}catch(e){return [];}}
  function setGenres(arr){try{Lampa.Storage.set(STORAGE_GENRES,arr);}catch(e){}}

  function getYearFrom(){return Lampa.Storage.get(STORAGE_YEAR_FROM,1980);}
  function getYearTo(){return Lampa.Storage.get(STORAGE_YEAR_TO, nowYear());}
  function setYears(f,t){if(f>t)t=f; Lampa.Storage.set(STORAGE_YEAR_FROM,f); Lampa.Storage.set(STORAGE_YEAR_TO,t);}

  function getLang(){var l='ru'; try{l=Lampa.Storage.get('language','ru')||'ru';}catch(e){} if(l==='ua')l='uk'; return l+'-'+String(l).toUpperCase();}

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
    if(type==='movie'){ params['primary_release_date.gte']=y1+'-01-01'; params['primary_release_date.lte']=y2+'-12-31'; }
    else { params['first_air_date.gte']=y1+'-01-01'; params['first_air_date.lte']=y2+'-12-31'; }

    try{ var region=(baseParams&&baseParams.region)?baseParams.region:Lampa.Storage.get('region',''); if(region) params.region=region;}catch(e){}

    // genres & years override
    var genres = getGenres(); if(genres.length) params.with_genres=genres.join(',');
    var yf=getYearFrom(); var yt=getYearTo();
    if(type==='movie'){ params['primary_release_date.gte']=yf+'-01-01'; params['primary_release_date.lte']=yt+'-12-31'; }
    else { params['first_air_date.gte']=yf+'-01-01'; params['first_air_date.lte']=yt+'-12-31'; }

    return params;
  }

  function tmdbGet(req,params,ok,bad){try{var tmdb=Lampa.Api&&Lampa.Api.sources&&Lampa.Api.sources.tmdb; if(!tmdb||typeof tmdb.get!=='function') return bad&&bad('NO_TMDB_GET'); tmdb.get(req,params,ok,bad);}catch(e){bad&&bad(e);}}

  function filterByVote(items,voteFrom,voteTo){var out=[]; for(var i=0;i<items.length;i++){var v=parseFloat(items[i].vote_average); if(isNaN(v))continue; if(v>=voteFrom&&v<=voteTo) out.push(items[i]);} return out;}

  function buildMixedResponse(page,voteFrom,voteTo,baseParams,done,attempt){
    attempt=attempt||0;
    var tasks=[{type:'movie',page:randInt(1,500)},{type:'movie',page:randInt(1,500)},{type:'tv',page:randInt(1,500)},{type:'tv',page:randInt(1,500)}];
    var res=[]; var left=tasks.length;
    function oneDone(){left--; if(left>0)return;
      var filtered=filterByVote(res,voteFrom,voteTo);
      shuffle(filtered);
      if(filtered.length<24&&attempt<1){ buildMixedResponse(page,voteFrom,voteTo,baseParams,done,attempt+1); return; }
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

  function activityParams(url){ return { url:url, title:tr('lampa_random_name','Мне повезёт'), component:'category_full', source:'tmdb', sort:'now', card_type:true, page:1, lampa_random_ui:1}; }

function scheduleInject(){  
    var tries=0;  
    var id=setInterval(function(){tries++; addControlsToScreen(); if(tries>=120) clearInterval(id);},250);  
}  
  
function openScreen(){   
    patchAjaxForVirtualEndpoint();   
    ensureDefaultRange();   
    var url='lampa_random?rnd='+Date.now();   
    Lampa.Activity.push(activityParams(url));   
    Lampa.Controller.toggle('content');   
    scheduleInject();  
}  
  
function refreshScreen(){   
    patchAjaxForVirtualEndpoint();   
    var url='lampa_random?rnd='+Date.now();   
    Lampa.Activity.replace(activityParams(url));   
    scheduleInject();  
}  
  
function addControlsToScreen() {    
    try {    
        // Шукаємо різні можливі контейнери    
        var $scrollBody = $('.scroll-body').eq(0);    
        if (!$scrollBody.length) $scrollBody = $('.content').eq(0);    
        if (!$scrollBody.length) $scrollBody = $('.full-start-new__body').eq(0);    
            
        if (!$scrollBody.length) {    
            console.log('lampa_random: контейнер для контролів не знайдено');    
            return false;    
        }    
    
        var $bar = $('<div class="controls-bar" style="padding: 1em; background: rgba(0,0,0,0.3); margin-bottom: 1em;"></div>');    
            
        // Кнопки рейтингу    
        var $fromBtn = $('<div class="selector" style="display: inline-block; margin-right: 1em;"><div class="selector__name">Рейтинг від: ' + getVoteFrom() + '</div></div>');    
        var $toBtn = $('<div class="selector" style="display: inline-block; margin-right: 1em;"><div class="selector__name">Рейтинг до: ' + getVoteTo() + '</div></div>');    
            
        // Кнопка жанрів    
        var $genresBtn = $('<div class="selector" style="display: inline-block; margin-right: 1em;"><div class="selector__name">Жанри: ' + getGenres().length + '</div></div>');    
            
        // Кнопки років    
        var $yearFromBtn = $('<div class="selector" style="display: inline-block; margin-right: 1em;"><div class="selector__name">Рік від: ' + getYearFrom() + '</div></div>');    
        var $yearToBtn = $('<div class="selector" style="display: inline-block; margin-right: 1em;"><div class="selector__name">Рік до: ' + getYearTo() + '</div></div>');    
            
        // Кнопка застосування    
        var $applyBtn = $('<div class="selector" style="display: inline-block;"><div class="selector__name">Застосувати</div></div>');    
    
        // Обробники подій    
        $fromBtn.on('hover:enter', function(){    
            Lampa.Select.show({    
                title: 'Рейтинг від',    
                items: buildVoteItems(getVoteFrom()),    
                onSelect: function(a){    
                    var from = a.value;    
                    var to = getVoteTo();    
                    if(from > to) to = from;    
                    setVoteRange(from, to);    
                    updateTexts();    
                    Lampa.Controller.toggle('content');    
                },    
                onBack: function(){Lampa.Controller.toggle('content');}    
            });    
        });    
    
        $toBtn.on('hover:enter', function(){    
            Lampa.Select.show({    
                title: 'Рейтинг до',    
                items: buildVoteItems(getVoteTo()),    
                onSelect: function(a){    
                    var to = a.value;    
                    var from = getVoteFrom();    
                    if(from > to) from = to;    
                    setVoteRange(from, to);    
                    updateTexts();    
                    Lampa.Controller.toggle('content');    
                },    
                onBack: function(){Lampa.Controller.toggle('content');}    
            });    
        });    
    
        $genresBtn.on('hover:enter', function(){    
            Lampa.Select.show({    
                title: 'Жанри',    
                multiselect: true,    
                items: Object.keys(TMDB_GENRES).map(function(id){    
                    return {    
                        title: TMDB_GENRES[id],    
                        value: id,    
                        selected: getGenres().indexOf(id) !== -1    
                    };    
                }),    
                onSelect: function(items){    
                    setGenres(items.map(function(i){return i.value;}));    
                    Lampa.Controller.toggle('content');    
                }    
            });    
        });    
    
        $yearFromBtn.on('hover:enter', function(){    
            Lampa.Select.show({    
                title: 'Рік від',    
                items: buildYearItems(getYearFrom()),    
                onSelect: function(a){    
                    setYears(a.value, getYearTo());    
                    Lampa.Controller.toggle('content');    
                }    
            });    
        });    
    
        $yearToBtn.on('hover:enter', function(){    
            Lampa.Select.show({    
                title: 'Рік до',    
                items: buildYearItems(getYearTo()),    
                onSelect: function(a){    
                    setYears(getYearFrom(), a.value);    
                    Lampa.Controller.toggle('content');    
                }    
            });    
        });    
    
        $applyBtn.on('hover:enter', refreshScreen);    
    
        updateTexts();    
    
        $bar.append($fromBtn).append($toBtn).append($genresBtn).append($yearFromBtn).append($yearToBtn).append($applyBtn);    
        $scrollBody.prepend($bar);    
            
        console.log('lampa_random: елементи керування додані');    
        return true;    
    } catch(e) {    
        console.error('lampa_random помилка:', e);    
        return false;    
    }    
}

  function addMenuItem(){
    var title='🎲 Мне повезёт';
    var $btn=$('<li class="menu__item selector" data-id="'+MENU_ID+'"><div class="menu__text">'+title+'</div></li>');
    $btn.on('hover:enter',openScreen);

    // чекатиме меню, поки не з’явиться
    var tries=0;
    var id=setInterval(function(){
      var $menu=$('.menu .menu__list').eq(0);
      if($menu.length){ $menu.append($btn); clearInterval(id); }
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
