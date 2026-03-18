// ==Lampa==
// name: Random Pro (Top UI)
// version: 2.0

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
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    53: 'Thriller', 10752: 'War', 37: 'Western'
  };

  var DEFAULT_GENRES = [27, 53, 9648, 28];

  function randInt(min, max) { return Math.floor(Math.random()*(max-min+1))+min; }
  function shuffle(arr) { return arr.sort(()=>Math.random()-0.5); }
  function nowYear() { return new Date().getFullYear(); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function roundHalf(v){ return Math.round(v*2)/2; }
  function formatVote(v){ return v.toFixed(1).replace('.',','); }

  function ensureDefaultRange(){
    if(Lampa.Storage.get(STORAGE_VOTE_FROM)==null) Lampa.Storage.set(STORAGE_VOTE_FROM,6);
    if(Lampa.Storage.get(STORAGE_VOTE_TO)==null) Lampa.Storage.set(STORAGE_VOTE_TO,10);
    if(Lampa.Storage.get(STORAGE_GENRES)==null) Lampa.Storage.set(STORAGE_GENRES,DEFAULT_GENRES);
    if(Lampa.Storage.get(STORAGE_YEAR_FROM)==null) Lampa.Storage.set(STORAGE_YEAR_FROM,1980);
    if(Lampa.Storage.get(STORAGE_YEAR_TO)==null) Lampa.Storage.set(STORAGE_YEAR_TO,nowYear());
  }

  function getVoteFrom(){ return roundHalf(clamp(parseFloat(Lampa.Storage.get(STORAGE_VOTE_FROM,6)),1,10)); }
  function getVoteTo(){ return roundHalf(clamp(parseFloat(Lampa.Storage.get(STORAGE_VOTE_TO,10)),1,10)); }
  function setVoteRange(f,t){ if(f>t)t=f; Lampa.Storage.set(STORAGE_VOTE_FROM,f); Lampa.Storage.set(STORAGE_VOTE_TO,t); }

  function getGenres(){ return Lampa.Storage.get(STORAGE_GENRES,DEFAULT_GENRES); }
  function setGenres(g){ Lampa.Storage.set(STORAGE_GENRES,g); }

  function getYearFrom(){ return Lampa.Storage.get(STORAGE_YEAR_FROM,1980); }
  function getYearTo(){ return Lampa.Storage.get(STORAGE_YEAR_TO,nowYear()); }
  function setYears(f,t){ if(f>t)t=f; Lampa.Storage.set(STORAGE_YEAR_FROM,f); Lampa.Storage.set(STORAGE_YEAR_TO,t); }

  function normalizeItem(it){
    it = it || {};
    it.type = 'movie';
    it.source = 'tmdb';
    it.title = it.title || it.name || '';
    return it;
  }

  function makeParams(page){
    return {
      page: page,
      sort_by: Math.random()<0.6 ? 'popularity.desc' : 'vote_average.desc',
      'vote_average.gte': getVoteFrom(),
      'vote_average.lte': getVoteTo(),
      with_genres: getGenres().join(','),
      'primary_release_date.gte': getYearFrom()+'-01-01',
      'primary_release_date.lte': getYearTo()+'-12-31'
    };
  }

  function tmdbGet(params, ok){
    Lampa.Api.sources.tmdb.get('discover/movie', params, ok, ()=>ok({results:[]}));
  }

  function buildResponse(page, done){
    var results = [];
    var left = 2;

    for(let i=0;i<2;i++){
      tmdbGet(makeParams(randInt(1,150)), function(json){
        (json.results||[]).forEach(i=>results.push(normalizeItem(i)));
        if(--left===0){
          shuffle(results);
          done({results:results,page:page});
        }
      });
    }
  }

  function patchAjax(){
    if($.ajax.__lr) return;
    $.ajax.__lr = true;

    var orig = $.ajax;

    $.ajax = function(opt){
      if(opt.url.includes('lampa_random')){
        var d = $.Deferred();
        buildResponse(1, function(json){
          opt.success && opt.success(json);
          d.resolve(json);
        });
        return d.promise();
      }
      return orig.apply(this,arguments);
    };
  }

  function openScreen(){
    patchAjax();
    Lampa.Activity.push({
      url:'lampa_random',
      component:'category_full',
      source:'tmdb',
      lampa_random_ui:1
    });
    setTimeout(injectControls,300);
  }

  function refreshScreen(){
    Lampa.Activity.replace({
      url:'lampa_random?'+Date.now(),
      component:'category_full',
      source:'tmdb',
      lampa_random_ui:1
    });
    setTimeout(injectControls,300);
  }

  function buildVoteItems(val){
    var a=[];
    for(var i=60;i<=100;i+=5){
      var v=i/10;
      a.push({title:v.toFixed(1),value:v,selected:v===val});
    }
    return a;
  }

  function buildYearItems(val){
    var a=[];
    for(var i=nowYear();i>=1960;i--){
      a.push({title:i,value:i,selected:i===val});
    }
    return a;
  }

  // 🔥 TOP UI
  function injectControls(){
    var a=Lampa.Activity.active();
    if(!a || !a.params || !a.params.lampa_random_ui) return;

    var body=a.activity.render().find('.scroll__body');
    if(body.find('.lr-chips').length) return;

    if(!$('#lr-style').length){
      $('head').append(`
        <style id="lr-style">
        .lr-chips{display:flex;gap:.6em;padding:.6em 1em;margin:.5em 1em;background:rgba(0,0,0,.25);backdrop-filter:blur(10px);border-radius:1em;flex-wrap:wrap}
        .lr-chip{padding:.4em .8em;border-radius:.7em;background:rgba(255,255,255,.08);transition:.2s}
        .lr-chip.focus{background:rgba(255,255,255,.2);transform:scale(1.05)}
        </style>
      `);
    }

    function chip(txt,fn){
      var c=$('<div class="selector lr-chip">'+txt+'</div>');
      c.on('hover:enter',fn);
      return c;
    }

    var wrap=$('<div class="lr-chips"></div>');

    wrap.append(
      chip('⭐ '+formatVote(getVoteFrom())+'–'+formatVote(getVoteTo()),()=>{
        Lampa.Select.show({
          title:'Рейтинг',
          items:buildVoteItems(getVoteFrom()),
          onSelect:(a)=>{ setVoteRange(a.value,getVoteTo()); refreshScreen(); }
        });
      }),
      chip('🎭 '+getGenres().length,()=>{
        Lampa.Select.show({
          title:'Жанри',
          multiselect:true,
          items:Object.keys(TMDB_GENRES).map(id=>({
            title:TMDB_GENRES[id],
            value:id,
            selected:getGenres().includes(id)
          })),
          onSelect:(items)=>{ setGenres(items.map(i=>i.value)); refreshScreen(); }
        });
      }),
      chip('📅 '+getYearFrom()+'–'+getYearTo(),()=>{
        Lampa.Select.show({
          title:'Рік',
          items:buildYearItems(getYearFrom()),
          onSelect:(a)=>{ setYears(a.value,getYearTo()); refreshScreen(); }
        });
      }),
      chip('🎲 Сюрприз',()=>{
        setVoteRange(1,10);
        setGenres([]);
        setYears(1960,nowYear());
        refreshScreen();
      })
    );

    body.prepend(wrap);
  }

  function addMenu(){
    var btn=$('<li class="menu__item selector"><div class="menu__text">Випадкова добірка</div></li>');
    btn.on('hover:enter',openScreen);

    var int=setInterval(()=>{
      var m=$('.menu .menu__list');
      if(m.length){
        m.append(btn);
        clearInterval(int);
      }
    },200);
  }

  function init(){
    ensureDefaultRange();
    if(window.appready) addMenu();
    else Lampa.Listener.follow('app',e=>e.type==='ready' && addMenu());
  }

  init();
})();
