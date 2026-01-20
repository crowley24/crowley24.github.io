/* Title: lampa_random
 * Version: 1.1.0
 * Description: Random movies and TV shows with rating, genres and years filter
 * Author: wapmax + patched
 */
(function () {
  'use strict';

  if (window.plugin_lampa_random_ready) return;
  window.plugin_lampa_random_ready = true;

  var MENU_ID = 'lampa_random_menu';

  var STORAGE_VOTE_FROM = 'lampa_random_vote_from';
  var STORAGE_VOTE_TO   = 'lampa_random_vote_to';
  var STORAGE_GENRES    = 'lampa_random_genres';
  var STORAGE_YEAR_FROM = 'lampa_random_year_from';
  var STORAGE_YEAR_TO   = 'lampa_random_year_to';

  /* ===== GENRES ===== */
  var TMDB_GENRES = {
    28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',
    99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',
    27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',
    878:'Science Fiction',53:'Thriller',10752:'War',37:'Western'
  };

  function tr(key, def) {
    try { return Lampa.Lang.translate(key); } catch (e) {}
    return def || key;
  }

  function nowYear() {
    return new Date().getFullYear();
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function getLang() {
    var l = 'ru';
    try { l = Lampa.Storage.get('language', 'ru'); } catch (e) {}
    if (l === 'ua') l = 'uk';
    return l + '-' + l.toUpperCase();
  }

  /* ===== DEFAULTS ===== */
  function ensureDefaultRange() {
    if (Lampa.Storage.get(STORAGE_VOTE_FROM) == null)
      Lampa.Storage.set(STORAGE_VOTE_FROM, 5.5);

    if (Lampa.Storage.get(STORAGE_VOTE_TO) == null)
      Lampa.Storage.set(STORAGE_VOTE_TO, 9.5);

    if (Lampa.Storage.get(STORAGE_GENRES) == null)
      Lampa.Storage.set(STORAGE_GENRES, []);

    if (Lampa.Storage.get(STORAGE_YEAR_FROM) == null)
      Lampa.Storage.set(STORAGE_YEAR_FROM, 1980);

    if (Lampa.Storage.get(STORAGE_YEAR_TO) == null)
      Lampa.Storage.set(STORAGE_YEAR_TO, nowYear());
  }

  /* ===== GET / SET ===== */
  function getVoteFrom(){return Lampa.Storage.get(STORAGE_VOTE_FROM,5.5);}
  function getVoteTo(){return Lampa.Storage.get(STORAGE_VOTE_TO,9.5);}
  function setVoteRange(f,t){
    if(f>t)t=f;
    Lampa.Storage.set(STORAGE_VOTE_FROM,f);
    Lampa.Storage.set(STORAGE_VOTE_TO,t);
  }

  function getGenres(){
    try{return Lampa.Storage.get(STORAGE_GENRES,[]);}catch(e){return[];}
  }
  function setGenres(a){Lampa.Storage.set(STORAGE_GENRES,a);}

  function getYearFrom(){return Lampa.Storage.get(STORAGE_YEAR_FROM,1980);}
  function getYearTo(){return Lampa.Storage.get(STORAGE_YEAR_TO,nowYear());}
  function setYears(f,t){
    if(f>t)t=f;
    Lampa.Storage.set(STORAGE_YEAR_FROM,f);
    Lampa.Storage.set(STORAGE_YEAR_TO,t);
  }

  function buildYearItems(cur){
    var out=[];
    for(var y=nowYear();y>=1960;y--){
      out.push({title:String(y),value:y,selected:y===cur});
    }
    return out;
  }

  /* ===== TMDB PARAMS ===== */
  function makeDiscoverParams(type,page,vf,vt,base){
    var y=nowYear();
    var y1=randInt(1960,y);
    var y2=Math.min(y,y1+randInt(0,12));

    var params={
      page:page,
      language:base.language||getLang(),
      sort_by:'popularity.desc',
      'vote_average.gte':vf,
      'vote_average.lte':vt,
      'vote_count.gte':150
    };

    if(type==='movie'){
      params['primary_release_date.gte']=y1+'-01-01';
      params['primary_release_date.lte']=y2+'-12-31';
    } else {
      params['first_air_date.gte']=y1+'-01-01';
      params['first_air_date.lte']=y2+'-12-31';
    }

    /* ===== OVERRIDE BY USER ===== */
    var g=getGenres();
    if(g.length) params.with_genres=g.join(',');

    var yf=getYearFrom(), yt=getYearTo();
    if(type==='movie'){
      params['primary_release_date.gte']=yf+'-01-01';
      params['primary_release_date.lte']=yt+'-12-31';
    } else {
      params['first_air_date.gte']=yf+'-01-01';
      params['first_air_date.lte']=yt+'-12-31';
    }

    return params;
  }

  /* ===== TMDB REQUEST ===== */
  function tmdbGet(req,params,ok,bad){
    Lampa.Api.sources.tmdb.get(req,params,ok,bad);
  }

  function buildMixedResponse(page,vf,vt,base,done){
    var tasks=[
      {type:'movie',page:randInt(1,500)},
      {type:'movie',page:randInt(1,500)},
      {type:'tv',page:randInt(1,500)},
      {type:'tv',page:randInt(1,500)}
    ];

    var res=[], left=tasks.length;

    function next(){
      if(--left>0)return;
      shuffle(res);
      done({
        page:page,
        total_pages:500,
        total_results:999999,
        results:res
      });
    }

    tasks.forEach(function(t){
      tmdbGet(
        t.type==='movie'?'discover/movie':'discover/tv',
        makeDiscoverParams(t.type,t.page,vf,vt,base),
        function(j){
          (j.results||[]).forEach(function(i){
            i.media_type=t.type;
            i.source='tmdb';
            res.push(i);
          });
          next();
        },
        next
      );
    });
  }

  /* ===== AJAX PATCH (CRITICAL) ===== */
  function patchAjaxForVirtualEndpoint(){
    if($.ajax.__lrpatched)return;
    $.ajax.__lrpatched=true;

    var orig=$.ajax;
    $.ajax=function(o){
      if(o.url&&/\/3\/lampa_random/.test(o.url)){
        var d=o.data||{};
        var p=parseInt(d.page)||1;
        var df=$.Deferred();
        buildMixedResponse(
          p,getVoteFrom(),getVoteTo(),
          {language:d.language||getLang(),region:d.region||''},
          function(r){
            o.success&&o.success(r);
            df.resolve(r);
          }
        );
        return df.promise();
      }
      return orig.apply(this,arguments);
    };
  }

  /* ===== UI ===== */
  function injectControls(){
    var a=Lampa.Activity.active();
    if(!a||a.params.lampa_random_ui!==1)return;

    var b=a.activity.render().find('.scroll__body');
    if(b.find('[data-lr]').length)return;

    var bar=$('<div class="buttons" data-lr></div>');

    var gbtn=$('<div class="selector button">Жанри</div>');
    var yfbtn=$('<div class="selector button">Рік від</div>');
    var ytbtn=$('<div class="selector button">Рік до</div>');
    var abtn=$('<div class="selector button">Застосувати</div>');

    gbtn.on('hover:enter',function(){
      Lampa.Select.show({
        title:'Жанри',
        multiselect:true,
        items:Object.keys(TMDB_GENRES).map(function(id){
          return {
            title:TMDB_GENRES[id],
            value:id,
            selected:getGenres().indexOf(id)!==-1
          };
        }),
        onSelect:function(it){
          setGenres(it.map(function(i){return i.value;}));
          Lampa.Controller.toggle('content');
        }
      });
    });

    yfbtn.on('hover:enter',function(){
      Lampa.Select.show({
        title:'Рік від',
        items:buildYearItems(getYearFrom()),
        onSelect:function(a){
          setYears(a.value,getYearTo());
          Lampa.Controller.toggle('content');
        }
      });
    });

    ytbtn.on('hover:enter',function(){
      Lampa.Select.show({
        title:'Рік до',
        items:buildYearItems(getYearTo()),
        onSelect:function(a){
          setYears(getYearFrom(),a.value);
          Lampa.Controller.toggle('content');
        }
      });
    });

    abtn.on('hover:enter',function(){
      Lampa.Activity.replace({
        url:'lampa_random?'+Date.now(),
        component:'category_full',
        source:'tmdb',
        page:1,
        lampa_random_ui:1
      });
    });

    bar.append(gbtn,yfbtn,ytbtn,abtn);
    b.prepend(bar);
  }

  /* ===== START ===== */
  function openScreen(){
    patchAjaxForVirtualEndpoint();
    ensureDefaultRange();
    Lampa.Activity.push({
      url:'lampa_random?'+Date.now(),
      title:'🎲 Мне повезёт',
      component:'category_full',
      source:'tmdb',
      page:1,
      lampa_random_ui:1
    });
    setInterval(injectControls,300);
  }

  function init(){
    ensureDefaultRange();
    patchAjaxForVirtualEndpoint();
    $('.menu .menu__list').append(
      $('<li class="menu__item selector"><div class="menu__text">🎲 Мне повезёт</div></li>')
        .on('hover:enter',openScreen)
    );
  }

  init();
})();
