
(function(){
'use strict';

/*
 * INTERFACE+ 1.5.0 — Cinematic Edition
 * Author: Crowley24
 * Platform: Lampa / Android TV
 */

if(window.banner_hero_plugin)return;
window.banner_hero_plugin=true;

var VERSION='1.5.0';
var SETTING='banner_hero_enabled';
var SIZE='interface_size';
var FONT='fontchanger_selected';
var CARD='interface_plus_card_logo';
var CINE='interface_plus_cinematic';
var POSTER='interface_plus_show_poster';
var SYNOPSIS='interface_plus_synopsis';

var logos=Object.create(null);
var pending=Object.create(null);
var backs=Object.create(null);
var backPending=Object.create(null);

var focusTimer=null;
var lastFocus='';
var current=null;
var initialized=false;

var cardTimer=null;
var cardObserver=null;
var cardToken=0;
var cardSrc='';
var cardData=null;
var cardRoot=null;
var cardKey='';
var cardImageReady=false;

/* =========================
   LOCALIZATION
========================= */

var langs={
    banner_settings_name:'Інтерфейс +',
    banner_enable_name:'Динамічні банери',
    banner_enable_descr:'Великий банер над рядами карток',
    card_logo_name:'Логотип у картці фільму',
    card_logo_descr:'Замінювати назву оригінальним логотипом TMDB',
    cine_name:'Cinematic-картка',
    cine_descr:'Кінематографічне оформлення картки фільму або серіалу',
    poster_name:'Показувати постер',
    poster_descr:'Залишити постер зліва у Cinematic-картці',
    synopsis_name:'Опис під кнопками',
    synopsis_descr:'Дублювати короткий опис під кнопками перегляду',
    font_name:'Шрифт інтерфейсу',
    font_descr:'Стиль шрифту для інтерфейсу'
};

/* =========================
   FONTS
========================= */

var fonts={
    default:{
        family:'Roboto,Arial,sans-serif'
    },
    netflix:{
        family:'"Netflix Sans",Arial,sans-serif',
        url:'https://assets.nflxext.com/ffe/siteui/fonts/netflix-sans/v3/NetflixSans_W_Rg.woff2'
    },
    montserrat:{
        family:'Montserrat,sans-serif',
        url:'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap'
    },
    inter:{
        family:'Inter,sans-serif',
        url:'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    },
    nunito:{
        family:'Nunito,sans-serif',
        url:'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap'
    }
};

/* =========================
   CSS
========================= */

var css=[
'.banner-host{position:relative}',

'.banner-enabled .banner-host .activity__body{padding-top:42vh;box-sizing:border-box}',

'.banner-hero{position:absolute;left:0;right:0;top:0;height:50vh;overflow:hidden;pointer-events:none;z-index:0;-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%);mask-image:linear-gradient(180deg,#000 55%,transparent 100%)}',

'.banner-hero__bg{position:absolute;inset:0;background-size:cover;background-position:center 20%;opacity:0;transition:opacity .35s ease}',

'.banner-hero__bg.show{opacity:1}',

'.banner-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.85),rgba(0,0,0,.6) 35%,transparent 70%);pointer-events:none}',

'.banner-hero__info{position:absolute;left:3em;bottom:5.5em;width:46%;z-index:1}',

'.banner-hero__logo{max-width:100%;max-height:7em;display:none;margin-bottom:.6em;object-fit:contain;object-position:left center;filter:drop-shadow(0 4px 12px rgba(0,0,0,.6))}',

'.banner-hero__title{font-size:2.8em;font-weight:900;line-height:1.05;color:#f5f5f1;margin-bottom:.35em;text-shadow:0 3px 14px #000}',

'.banner-hero__meta{font-size:1.15em;color:#f5f5f1;margin-bottom:.6em;display:flex;gap:.8em;align-items:center;flex-wrap:wrap}',

'.banner-hero__rate{padding:.1em .5em;border-radius:6px;font-weight:800;background:#1db954;color:#fff}',

'.banner-hero__descr{font-size:1.1em;line-height:1.45;color:#f5f5f1;opacity:.85;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',

'.interface-plus-logo-title{position:relative}',

'.interface-plus-card-logo{display:block;width:auto;max-width:100%;max-height:105px;height:auto;object-fit:contain;object-position:left center;opacity:0;transition:opacity .25s ease;filter:drop-shadow(0 3px 10px rgba(0,0,0,.45));pointer-events:none}',

'.interface-plus-card-logo.ready{opacity:1}',

'.interface-plus-logo-title.interface-plus-logo-active{font-size:0!important;line-height:0!important}',

'.interface-plus-logo-title.interface-plus-logo-active>.interface-plus-original-title{display:none!important}',

'.ip-cinematic .interface-plus-card-logo{max-height:130px;max-width:min(70vw,750px)}',

'.ip-cinematic .full-start{position:relative;isolation:isolate;min-height:48vh}',

'.ip-cinematic .full-start:before{content:"";position:absolute;inset:-2em -2em -2em -2em;background:linear-gradient(90deg,rgba(0,0,0,.91) 0%,rgba(0,0,0,.73) 34%,rgba(0,0,0,.15) 78%),linear-gradient(0deg,#000 0%,transparent 65%);pointer-events:none;z-index:0}',

'.ip-cinematic .full-start>*{position:relative;z-index:1}',

'.ip-cinematic:not(.ip-poster) .full-start__poster,.ip-cinematic:not(.ip-poster) .full-start__img,.ip-cinematic:not(.ip-poster) .full-start__cover{display:none!important}',

'.ip-cinematic:not(.ip-poster) .full-start__body,.ip-cinematic:not(.ip-poster) .full-start__info,.ip-cinematic:not(.ip-poster) .full-start__content{margin-left:0!important;max-width:850px;width:auto}',

'.ip-cinematic .full-start__buttons{display:flex;flex-wrap:wrap;align-items:center;gap:.7em}',

'.ip-cinematic .full-start__buttons .full-start__button,.ip-cinematic .full-start__buttons .button{border-radius:12px;transition:background-color .18s ease,box-shadow .18s ease,transform .18s ease}',

'.ip-cinematic .full-start__buttons .focus,.ip-cinematic .full-start__buttons .focused{box-shadow:0 0 0 2px rgba(255,255,255,.6);transform:translateY(-1px)}',

'.ip-cinematic .ip-synopsis{font-size:1.25em;line-height:1.5;max-width:800px;margin:1.2em 0 .6em;color:#eee;text-shadow:0 2px 8px #000;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',

'@media(max-width:480px){.interface-plus-card-logo{max-height:75px}.ip-cinematic .interface-plus-card-logo{max-height:90px}.banner-hero__info{left:1.5em;width:75%}.banner-hero__logo{max-height:5em}.ip-cinematic .ip-synopsis{font-size:1.05em}}'
].join('\n');

/* =========================
   STYLE
========================= */

function style(){
    var el=document.getElementById('banner-hero-style');

    if(!el){
        el=document.createElement('style');
        el.id='banner-hero-style';
        document.head.appendChild(el);
    }

    el.textContent=css;
}

/* =========================
   HELPERS
========================= */

function get(k,d){
    try{
        return Lampa.Storage.get(k,d);
    }catch(e){
        return d;
    }
}

function on(k,d){
    var v=get(k,d);
    return v===true||v==='true'||v===1;
}

function el(v){
    return v&&v.nodeType===1
        ?v
        :v&&v[0]&&v[0].nodeType===1
            ?v[0]
            :null;
}

function type(d){
    return d&&(
        d.media_type==='tv'||
        d.type==='tv'||
        (d.name&&!d.title)
    )?'tv':'movie';
}

function key(d){
    return type(d)+'_'+d.id;
}

/* =========================
   FONT APPLY
========================= */

function fontApply(k){
    var f=fonts[k]||fonts.default;

    var old=document.getElementById(
        'interface-plus-font-style'
    );

    var face=document.getElementById(
        'interface-plus-fontface'
    );

    if(old)old.remove();
    if(face)face.remove();

    if(f.url){
        face=document.createElement('style');
        face.id='interface-plus-fontface';

        face.textContent=
            f.url.indexOf('googleapis.com')>=0
                ?'@import url("'+f.url+'");'
                :'@font-face{font-family:"Netflix Sans";src:url("'+f.url+'") format("woff2");font-weight:400}';

        document.head.appendChild(face);
    }

    old=document.createElement('style');
    old.id='interface-plus-font-style';

    old.textContent=
        'body,.body,*{font-family:'+f.family+'!important}';

    document.head.appendChild(old);
}

/* =========================
   INTERFACE SIZE
========================= */

function sizeApply(){
    var mobile=false;

    try{
        mobile=!!(
            Lampa.Platform&&
            Lampa.Platform.screen&&
            Lampa.Platform.screen('mobile')
        );
    }catch(e){}

    var val=get(SIZE,'10.6');

    try{
        if(Lampa.Storage.field){
            val=Lampa.Storage.field(SIZE)||val;
        }
    }catch(e){}

    var n=mobile?10.1:parseFloat(val)||10.6;

    if(
        document.body.getAttribute(
            'data-banner-interface-size'
        )===String(n)
    )return;

    document.body.setAttribute(
        'data-banner-interface-size',
        String(n)
    );

    document.body.style.fontSize=n+'px';

    patchMaker(
        n<=9.6?8:n<=11.1?7:6
    );
}

function patchMaker(count){
    if(!Lampa.Maker||!Lampa.Maker.map)return;

    ['Line','Category'].forEach(function(t){
        var m=Lampa.Maker.map(t);

        if(!m||!m.Items||!m.Items.onInit)return;

        if(m.Items.__bannerHeroPatched){
            m.Items.__bannerHeroCardCount=count;
            return;
        }

        var orig=m.Items.onInit;

        m.Items.onInit=function(){
            orig.apply(this,arguments);

            var n=m.Items.__bannerHeroCardCount||count;

            if(t==='Line'){
                this.view=n;
            }else{
                this.limit_view=n;
            }
        };

        m.Items.__bannerHeroPatched=true;
        m.Items.__bannerHeroCardCount=count;
    });
}

/* =========================
   TMDB LOGOS
========================= */

function loadLogo(d,cb){
    if(!d||!d.id||(d.source&&d.source!=='tmdb')){
        return cb('');
    }

    var k=key(d);

    if(
        Object.prototype.hasOwnProperty.call(logos,k)
    ){
        return cb(logos[k]);
    }

    if(pending[k]){
        pending[k].push(cb);
        return;
    }

    if(
        !Lampa.TMDB||
        !Lampa.TMDB.api||
        !Lampa.TMDB.key
    ){
        return cb('');
    }

    pending[k]=[cb];

    function finish(s){
        logos[k]=s||'';

        var list=pending[k]||[];
        delete pending[k];

        list.forEach(function(fn){
            try{
                fn(logos[k]);
            }catch(e){}
        });
    }

    try{
        var url=Lampa.TMDB.api(
            type(d)+'/'+d.id+
            '/images?api_key='+
            Lampa.TMDB.key()+
            '&include_image_language=uk,en,null'
        );

        new Lampa.Reguest().silent(
            url,
            function(json){
                var list=json&&Array.isArray(json.logos)
                    ?json.logos
                    :[];

                var pick=null;

                ['uk','en',null].some(function(lang){
                    for(var i=0;i<list.length;i++){
                        if(
                            list[i].iso_639_1===lang&&
                            list[i].file_path
                        ){
                            pick=list[i];
                            return true;
                        }
                    }
                    return false;
                });

                if(!pick)return finish('');

                var p=pick.file_path.replace(
                    /\.svg$/i,'.png'
                );

                try{
                    finish(
                        Lampa.TMDB.image('t/p/w500'+p)
                    );
                }catch(e){
                    finish('');
                }
            },
            function(){
                finish('');
            }
        );
    }catch(e){
        finish('');
    }
}

/* =========================
   BACKDROP
========================= */

function loadBackdrop(d,cb){
    if(!d||!d.id||!d.backdrop_path){
        return cb('');
    }

    var k=key(d);

    if(
        Object.prototype.hasOwnProperty.call(backs,k)
    ){
        return cb(backs[k]);
    }

    if(backPending[k]){
        backPending[k].push(cb);
        return;
    }

    backPending[k]=[cb];

    var src='';

    try{
        src=Lampa.Api.img(
            d.backdrop_path,
            'w1280'
        );
    }catch(e){}

    var image=new Image();

    function finish(s){
        backs[k]=s;

        var list=backPending[k]||[];
        delete backPending[k];

        list.forEach(function(fn){
            try{
                fn(s);
            }catch(e){}
        });
    }

    image.onload=function(){
        finish(src);
    };

    image.onerror=function(){
        finish('');
    };

    image.src=src;
}

/* =========================
   HERO
========================= */

function heroFor(root){
    if(!root)return null;

    var h=root.querySelector('.banner-hero');

    if(!h){
        h=document.createElement('div');
        h.className='banner-hero';

        h.innerHTML=
            '<div class="banner-hero__bg"></div>'+
            '<div class="banner-hero__info">'+
                '<img class="banner-hero__logo">'+
                '<div class="banner-hero__title"></div>'+
                '<div class="banner-hero__meta"></div>'+
                '<div class="banner-hero__descr"></div>'+
            '</div>';

        root.insertBefore(h,root.firstChild);
    }

    root.classList.add('banner-host');

    return h;
}

function showHero(h,d){
    if(!h||!d)return;

    var k=key(d);

    if(h.bannerId===k)return;

    h.bannerId=k;

    var bg=h.querySelector('.banner-hero__bg');
    var logo=h.querySelector('.banner-hero__logo');
    var title=h.querySelector('.banner-hero__title');
    var meta=h.querySelector('.banner-hero__meta');

    title.textContent=d.title||d.name||'';
    title.style.display='';

    logo.style.display='none';
    logo.onload=null;

    var vote=parseFloat(d.vote_average);

    var year=String(
        d.release_date||
        d.first_air_date||
        ''
    ).slice(0,4);

    meta.innerHTML=
        (vote
            ?'<span class="banner-hero__rate">'+
                vote.toFixed(1)+
             '</span>'
            :''
        )+
        (year
            ?'<span>'+year+'</span>'
            :''
        )+
        '<span>'+
        (type(d)==='tv'?'Серіал':'Фільм')+
        '</span>';

    h.querySelector(
        '.banner-hero__descr'
    ).textContent=d.overview||'';

    bg.classList.remove('show');

    loadBackdrop(d,function(src){
        if(h.bannerId!==k||!src)return;

        bg.style.backgroundImage=
            'url("'+src+'")';

        requestAnimationFrame(function(){
            if(h.bannerId===k){
                bg.classList.add('show');
            }
        });
    });

    loadLogo(d,function(src){
        if(h.bannerId!==k||!src)return;

        logo.onload=function(){
            if(h.bannerId!==k)return;

            logo.style.display='block';
            title.style.display='none';
        };

        logo.onerror=function(){
            title.style.display='';
            logo.style.display='none';
        };

        logo.src=src;

        if(logo.complete&&logo.naturalWidth){
            logo.onload();
        }
    });
}

/* =========================
   FOCUS
========================= */

function onFocus(e){
    if(!on(SETTING,true))return;

    var c=e.target&&
        e.target.closest&&
        e.target.closest('.card');

    if(!c||!c.card_data||!c.card_data.id)return;

    var root=c.closest('.activity');

    if(
        !root||
        !root.classList.contains('banner-host')
    )return;

    var k=key(c.card_data);

    if(lastFocus===k&&current===root)return;

    clearTimeout(focusTimer);

    focusTimer=setTimeout(function(){
        lastFocus=k;
        current=root;

        showHero(
            heroFor(root),
            c.card_data
        );
    },220);
}

/* =========================
   ACTIVITY HELPERS
========================= */

function activityRoot(o){
    if(!o)return null;

    var v=null;

    try{
        if(o.activity&&o.activity.render){
            v=o.activity.render(true);
        }
    }catch(e){}

    if(!v){
        try{
            if(o.render){
                v=o.render(true);
            }
        }catch(e){}
    }

    return el(v);
}

function cardObject(o){
    if(!o)return null;

    var a=[
        o.movie,
        o.data,
        o.card,
        o.card_data,
        o.params&&o.params.movie,
        o.params&&o.params.data,
        o.activity&&o.activity.movie,
        o.activity&&o.activity.data
    ];

    for(var i=0;i<a.length;i++){
        if(
            a[i]&&
            a[i].id&&
            (a[i].title||a[i].name)
        ){
            return a[i];
        }
    }

    return null;
}

function full(o){
    return o&&[
        'full',
        'full_start',
        'fullstart'
    ].indexOf(
        String(o.component||'').toLowerCase()
    )>=0;
}

function attach(o){
    if(
        !on(SETTING,true)||
        !o||
        ['main','category'].indexOf(o.component)<0
    )return;

    heroFor(activityRoot(o));
}

function bannerApply(){
    var yes=on(SETTING,true);

    document.body.classList.toggle(
        'banner-enabled',
        yes
    );

    if(!yes){
        clearTimeout(focusTimer);
        lastFocus='';
        current=null;
    }else{
        try{
            attach(Lampa.Activity.active());
        }catch(e){}
    }
}

/* =========================
   CARD TITLE
========================= */

function titleIn(root){
    return root&&root.querySelector(
        '.full-start__title,'+
        '.full-start-new__title,'+
        '.full__title,'+
        '.full-card__title'
    );
}

function restoreTitle(root){
    if(!root)return;

    var titles=root.querySelectorAll(
        '.interface-plus-logo-title'
    );

    for(var i=0;i<titles.length;i++){
        var t=titles[i];

        var original=t.querySelector(
            '.interface-plus-original-title'
        );

        var logo=t.querySelector(
            '.interface-plus-card-logo'
        );

        if(logo)logo.remove();

        if(original){
            while(original.firstChild){
                t.insertBefore(
                    original.firstChild,
                    original
                );
            }

            original.remove();
        }

        t.classList.remove(
            'interface-plus-logo-title',
            'interface-plus-logo-active'
        );

        t.removeAttribute(
            'data-interface-plus-logo-id'
        );
    }
}

function prepareTitle(t,k){
    if(!t)return null;

    if(
        t.getAttribute(
            'data-interface-plus-logo-id'
        )!==k&&
        t.classList.contains(
            'interface-plus-logo-title'
        )
    ){
        restoreTitle(t.parentNode||t);
    }

    var img=t.querySelector(
        '.interface-plus-card-logo'
    );

    if(img)return img;

    var span=document.createElement('span');
    span.className='interface-plus-original-title';

    while(t.firstChild){
        span.appendChild(t.firstChild);
    }

    t.appendChild(span);

    img=document.createElement('img');
    img.className='interface-plus-card-logo';
    img.alt='';
    img.draggable=false;

    t.appendChild(img);

    t.classList.add(
        'interface-plus-logo-title'
    );

    t.setAttribute(
        'data-interface-plus-logo-id',
        k
    );

    return img;
}

/* =========================
   CARD CLEANUP
========================= */

function cleanupCard(restore){
    cardToken++;

    clearTimeout(cardTimer);
    cardTimer=null;

    if(cardObserver){
        cardObserver.disconnect();
        cardObserver=null;
    }

    if(restore&&cardRoot){
        restoreTitle(cardRoot);

        var extra=cardRoot.querySelectorAll(
            '.ip-synopsis'
        );

        for(var i=0;i<extra.length;i++){
            extra[i].remove();
        }

        cardRoot.classList.remove(
            'ip-cinematic',
            'ip-poster'
        );
    }

    cardRoot=null;
    cardData=null;
    cardKey='';
    cardSrc='';
    cardImageReady=false;
}

function active(token,k){
    return token===cardToken&&
        k===cardKey&&
        cardRoot&&
        cardRoot.isConnected;
}

/* =========================
   CINEMATIC DESCRIPTION
========================= */

function synopsis(root,d){
    var old=root.querySelector('.ip-synopsis');

    if(
        !on(CINE,true)||
        !on(SYNOPSIS,true)||
        !d.overview
    ){
        if(old)old.remove();
        return;
    }

    var buttons=root.querySelector(
        '.full-start__buttons'
    );

    if(!buttons)return;

    if(!old){
        old=document.createElement('div');
        old.className='ip-synopsis';

        buttons.insertAdjacentElement(
            'afterend',
            old
        );
    }

    old.textContent=d.overview;
}

/* =========================
   CINEMATIC DECORATION
========================= */

function decorate(root,d){
    if(!root)return;

    var cine=on(CINE,true);

    root.classList.toggle(
        'ip-cinematic',
        cine
    );

    root.classList.toggle(
        'ip-poster',
        cine&&on(POSTER,false)
    );

    synopsis(root,d);
}

/* =========================
   CARD LOGO
========================= */

function renderLogo(token,k){
    if(!active(token,k))return;

    var root=cardRoot;
    var t=titleIn(root);

    if(!t)return;

    if(!on(CARD,true)){
        restoreTitle(root);
        return;
    }

    if(!cardSrc||!cardImageReady)return;

    var img=prepareTitle(t,k);

    if(!img)return;

    if(
        img.getAttribute('src')===cardSrc&&
        img.classList.contains('ready')
    )return;

    img.onload=function(){
        if(
            !active(token,k)||
            !img.isConnected
        )return;

        t.classList.add(
            'interface-plus-logo-active'
        );

        requestAnimationFrame(function(){
            if(active(token,k)){
                img.classList.add('ready');
            }
        });
    };

    img.onerror=function(){
        t.classList.remove(
            'interface-plus-logo-active'
        );

        img.classList.remove('ready');
    };

    img.src=cardSrc;

    if(img.complete&&img.naturalWidth){
        img.onload();
    }
}

/* =========================
   CARD CHECK
========================= */

function cardCheck(token,k){
    if(!active(token,k))return;

    decorate(cardRoot,cardData);
    renderLogo(token,k);
}

function scheduleCheck(token,k){
    if(!active(token,k))return;

    clearTimeout(cardTimer);

    cardTimer=setTimeout(function(){
        cardTimer=null;
        cardCheck(token,k);
    },55);
}

/* =========================
   MUTATION OBSERVER
========================= */

function observeCard(root,token,k){
    if(!window.MutationObserver)return;

    cardObserver=new MutationObserver(
        function(mutations){
            if(!active(token,k))return;

            for(var i=0;i<mutations.length;i++){
                var m=mutations[i];

                if(m.type!=='childList')continue;

                var target=m.target;

                if(
                    target.nodeType===1&&
                    target.closest&&
                    target.closest(
                        '.interface-plus-logo-title,.ip-synopsis'
                    )
                )continue;

                var relevant=false;

                for(
                    var j=0;
                    j<m.addedNodes.length;
                    j++
                ){
                    var n=m.addedNodes[j];

                    if(n.nodeType!==1)continue;

                    if(
                        n.classList&&(
                            n.classList.contains(
                                'interface-plus-card-logo'
                            )||
                            n.classList.contains(
                                'interface-plus-original-title'
                            )||
                            n.classList.contains(
                                'ip-synopsis'
                            )
                        )
                    )continue;

                    relevant=true;
                    break;
                }

                if(relevant){
                    scheduleCheck(token,k);
                    break;
                }
            }
        }
    );

    cardObserver.observe(root,{
        childList:true,
        subtree:true
    });
}

/* =========================
   START CARD
========================= */

function startCard(o){
    if(!full(o))return;

    var d=cardObject(o);
    var root=activityRoot(o);

    if(!d||!root)return;

    var k=key(d);

    if(cardRoot===root&&cardKey===k){
        cardData=d;
        cardCheck(cardToken,k);
        return;
    }

    cleanupCard(true);

    cardRoot=root;
    cardData=d;
    cardKey=k;

    var token=cardToken;

    observeCard(root,token,k);
    cardCheck(token,k);

    loadLogo(d,function(src){
        if(!active(token,k)||!src)return;

        cardSrc=src;

        var img=new Image();

        img.onload=function(){
            if(!active(token,k))return;

            cardImageReady=true;
            renderLogo(token,k);
        };

        img.onerror=function(){
            cardImageReady=false;
        };

        img.src=src;

        if(img.complete&&img.naturalWidth){
            img.onload();
        }
    });
}

/* =========================
   REFRESH CARD
========================= */

function refreshCard(){
    if(!on(CARD,true)&&cardRoot){
        restoreTitle(cardRoot);
    }

    if(cardRoot&&cardData){
        decorate(cardRoot,cardData);

        if(on(CARD,true)){
            renderLogo(cardToken,cardKey);
        }
    }else{
        try{
            var a=Lampa.Activity.active();

            if(full(a)){
                startCard(a);
            }
        }catch(e){}
    }
}

/* =========================
   SETTINGS
========================= */

function register(){
    if(!Lampa.SettingsApi)return;

    var api=Lampa.SettingsApi;

    api.addComponent({
        component:'interface_plus_settings',
        name:langs.banner_settings_name,
        icon:
            '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">'+
            '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 5h2v5h-2z"/>'+
            '</svg>'
    });

    function toggle(k,name,descr,def,fn){
        api.addParam({
            component:'interface_plus_settings',
            param:{
                name:k,
                type:'trigger',
                default:def
            },
            field:{
                name:name,
                description:descr
            },
            onChange:fn
        });
    }

    toggle(
        SETTING,
        langs.banner_enable_name,
        langs.banner_enable_descr,
        true,
        bannerApply
    );

    toggle(
        CARD,
        langs.card_logo_name,
        langs.card_logo_descr,
        true,
        refreshCard
    );

    toggle(
        CINE,
        langs.cine_name,
        langs.cine_descr,
        true,
        refreshCard
    );

    toggle(
        POSTER,
        langs.poster_name,
        langs.poster_descr,
        false,
        refreshCard
    );

    toggle(
        SYNOPSIS,
        langs.synopsis_name,
        langs.synopsis_descr,
        true,
        refreshCard
    );

    api.addParam({
        component:'interface_plus_settings',
        param:{
            name:SIZE,
            type:'select',
            values:Lampa.Params.values[SIZE],
            default:'10.6'
        },
        field:{
            name:'Розмір інтерфейсу',
            description:'Масштаб елементів інтерфейсу'
        },
        onChange:sizeApply
    });

    api.addParam({
        component:'interface_plus_settings',
        param:{
            name:FONT,
            type:'select',
            values:{
                default:'За замовчуванням (Roboto)',
                netflix:'Netflix Sans',
                montserrat:'Montserrat',
                inter:'Inter (Сучасний UI)',
                nunito:'Nunito (М’який стиль)'
            },
            default:'default'
        },
        field:{
            name:langs.font_name,
            description:langs.font_descr
        },
        onChange:fontApply
    });
}

/* =========================
   INITIALIZATION
========================= */

function init(){
    if(
        initialized||
        !window.Lampa||
        !Lampa.Storage
    )return;

    initialized=true;

    if(Lampa.Lang){
        Lampa.Lang.add(langs);
    }

    if(Lampa.Params){
        if(!Lampa.Params.values){
            Lampa.Params.values={};
        }

        Lampa.Params.values[SIZE]={
            '09.1':'Міні інтерфейс',
            '09.6':'Дуже малий інтерфейс',
            '10.1':'Малий інтерфейс',
            '10.6':'Середній інтерфейс'
        };

        if(Lampa.Params.select){
            Lampa.Params.select(
                SIZE,
                Lampa.Params.values[SIZE],
                '10.6'
            );
        }
    }

    style();
    bannerApply();
    sizeApply();

    fontApply(get(FONT,'default'));

    document.addEventListener(
        'hover:focus',
        onFocus,
        true
    );

    if(Lampa.Listener){
        Lampa.Listener.follow(
            'activity',
            function(e){
                if(!e)return;

                if(e.type==='start'){
                    requestAnimationFrame(function(){
                        attach(e.object);

                        if(full(e.object)){
                            startCard(e.object);
                        }else{
                            cleanupCard(false);
                        }
                    });
                }

                if(
                    e.type==='destroy'&&
                    full(e.object)
                ){
                    cleanupCard(false);
                }
            }
        );
    }

    if(
        Lampa.Activity&&
        Lampa.Activity.active
    ){
        requestAnimationFrame(function(){
            var a=Lampa.Activity.active();

            attach(a);

            if(full(a)){
                startCard(a);
            }
        });
    }

    register();

    if(
        Lampa.Storage.listener&&
        Lampa.Storage.listener.follow
    ){
        Lampa.Storage.listener.follow(
            'change',
            function(e){
                if(!e)return;

                if(e.name===SIZE){
                    sizeApply();
                }

                if(e.name===SETTING){
                    bannerApply();
                }

                if(e.name===FONT){
                    fontApply(e.value);
                }

                if(
                    [CARD,CINE,POSTER,SYNOPSIS]
                        .indexOf(e.name)>=0
                ){
                    refreshCard();
                }
            }
        );
    }

    console.log(
        '[INTERFACE+] '+VERSION+' ready'
    );
}

/* =========================
   START
========================= */

if(window.appready){
    setTimeout(init,500);
}else if(
    window.Lampa&&
    Lampa.Listener
){
    Lampa.Listener.follow(
        'app',
        function(e){
            if(e.type==='ready'){
                setTimeout(init,500);
            }
        }
    );
}

})();
