/* Title: lampa_random
 * Version: 1.1.1
 * Description: Random movies & TV with rating, genres and years
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

  var TMDB_GENRES = {
    28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',
    99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',
    27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',
    878:'Sci-Fi',53:'Thriller',10752:'War',37:'Western'
  };

  function nowYear(){return new Date().getFullYear();}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function roundHalf(v){return Math.round(v*2)/2;}

  function ensureDefaults(){
    if(Lampa.Storage.get(STORAGE_VOTE_FROM)==null) Lampa.Storage.set(STORAGE_VOTE_FROM,5.5);
    if(Lampa.Storage.get(STORAGE_VOTE_TO)==null)   Lampa.Storage.set(STORAGE_VOTE_TO,9.5);
    if(Lampa.Storage.get(STORAGE_GENRES)==null)    Lampa.Storage.set(STORAGE_GENRES,[]);
    if(Lampa.Storage.get(STORAGE_YEAR_FROM)==null) Lampa.Storage.set(STORAGE_YEAR_FROM,1980);
    if(Lampa.Storage.get(STORAGE_YEAR_TO)==null)   Lampa.Storage.set(STORAGE_YEAR_TO,nowYear());
  }

  function getVoteFrom(){return roundHalf(clamp(+Lampa.Storage.get(STORAGE_VOTE_FROM),1,10));}
  function getVoteTo(){return roundHalf(clamp(+Lampa.Storage.get(STORAGE_VOTE_TO),1,10));}
  function setVoteRange(f,t){if(f>t)t=f;Lampa.Storage.set(STORAGE_VOTE_FROM,f);Lampa.Storage.set(STORAGE_VOTE_TO,t);}
  function getGenres(){return Lampa.Storage.get(STORAGE_GENRES,[]);}
  function setGenres(a){Lampa.Storage.set(STORAGE_GENRES,a);}
  function getYearFrom(){return Lampa.Storage.get(STORAGE_YEAR_FROM);}
  function getYearTo(){return Lampa.Storage.get(STORAGE_YEAR_TO);}
  function setYears(f,t){if(f>t)t=f;Lampa.Storage.set(STORAGE_YEAR_FROM,f);Lampa.Storage.set(STORAGE_YEAR_TO,t);}

  function makeDiscoverParams(type,page){
    var p={
      page:page,
      sort_by:'popularity.desc',
      include_adult:false,
      'vote_average.gte':getVoteFrom(),
      'vote_average.lte':getVoteTo(),
      'vote_count.gte':100
    };

    var g=getGenres();
    if(g.length) p.with_genres=g.join(',');

    var yf=getYearFrom(), yt=getYearTo();
    if(type==='movie'){
      p['primary_release_date.gte']=yf+'-01-01';
      p['primary_release_date.lte']=yt+'-12-31';
    } else {
      p['first_air_date.gte']=yf+'-01-01';
      p['first_air_date.lte']=yt+'-12-31';
    }
    return p;
  }

  function patchAjax(){
    if($.ajax.__lrpatched) return;
    $.ajax.__lrpatched=true;
    var orig=$.ajax;

    $.ajax=function(opt){
      if(/\/3\/lampa_random/.test(opt.url)){
        var page=opt.data.page||1;
        var res=[];
        var left=2;

        ['movie','tv'].forEach(function(type){
          Lampa.Api.sources.tmdb.get(
            'discover/'+type,
            makeDiscoverParams(type,Math.floor(Math.random()*400)+1),
            function(json){
              (json.results||[]).forEach(function(i){
                i.media_type=type;
                res.push(i);
              });
              if(--left===0){
                var out={
                  page:page,
                  total_pages:500,
                  total_results:999999,
                  results:res
                };
                Lampa.Utils.addSource(out,'tmdb');
                opt.success(out);
              }
            }
          );
        });
        return $.Deferred().promise();
      }
      return orig.apply(this,arguments);
    };
  }

  function openScreen(){
    patchAjax();
    ensureDefaults();
    Lampa.Activity.replace({
      url:'lampa_random',
      title:'🎲 Мені пощастить',
      component:'category_full',
      source:'tmdb',
      lampa_random_ui:1,
      page:1
    });
  }

  function addMenuItem(){
    if($('#'+MENU_ID).length) return;
    $('.menu__list').append(
      $('<li class="menu__item selector" id="'+MENU_ID+'">' +
        '<div class="menu__text">🎲 Мені пощастить</div>' +
      '</li>').on('hover:enter',openScreen)
    );
  }

  function init(){
    ensureDefaults();
    if(window.appready) addMenuItem();
    else Lampa.Listener.follow('app',e=>e.type==='ready'&&addMenuItem());
  }

  init();
})();
