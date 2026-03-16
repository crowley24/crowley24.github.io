(function () {
'use strict';

const PLUGIN_NAME = 'NewCard';
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

const SETTINGS_ICON = `<svg viewBox="0 0 100 100"><rect x="15" y="20" width="70" height="60" rx="8" stroke="white" stroke-width="6" fill="none" opacity="0.4"/><rect x="25" y="32" width="50" height="28" rx="4" fill="white"/><rect x="25" y="66" width="30" height="6" rx="3" fill="white" opacity="0.6"/><rect x="60" y="66" width="15" height="6" rx="3" fill="white" opacity="0.6"/></svg>`;

let debounceTimer;

function debounce(func, delay){
return function(){
const context=this;
const args=arguments;
clearTimeout(debounceTimer);
debounceTimer=setTimeout(()=>func.apply(context,args),delay);
}
}

function preloadImage(src){
return new Promise((resolve,reject)=>{
const img=new Image();
img.onload=()=>resolve(img);
img.onerror=reject;
img.src=src;
});
}

function getRatingColor(val){
const n=parseFloat(val);
return n>=7.5?'#2ecc71':n>=6?'#feca57':'#ff4d4d';
}

function formatTime(mins){
if(!mins)return'';
const h=Math.floor(mins/60);
const m=mins%60;
return(h>0?h+'г ':'')+m+'хв';
}
    function addStyles(){

const styles=`
<style>

:root{
--cas-logo-scale:1;
--cas-blocks-gap:30px;
--cas-meta-size:1.3em;
}

.cas-rate-item{
opacity:0;
transform:scale(.9);
animation:popIn .2s ease forwards;
}

@keyframes popIn{
from{opacity:0;transform:scale(.9);}
to{opacity:1;transform:scale(1);}
}

.cas-animated .cas-description{
opacity:0.7!important;
transform:translateY(0);
transition-delay:0.15s;
}

.left-title .full-start-new__buttons .full-start__button{
background:transparent!important;
color:rgba(255,255,255,0.6)!important;
display:flex;
align-items:center;
gap:10px;
transition:all .25s ease;
border:2px solid transparent!important;
border-radius:8px!important;
padding:8px 16px!important;
}

.left-title .full-start-new__buttons .full-start__button.focus{
color:#fff!important;
transform:scale(1.04);
background:rgba(255,255,255,0.12)!important;
border-color:rgba(255,255,255,0.25)!important;
}

.cas-description{
font-size:var(--cas-meta-size)!important;
line-height:1.4;
color:rgba(255,255,255,0.7);
max-width:650px;
}

</style>
`;

Lampa.Template.add('left_title_css',styles);
$('body').append(Lampa.Template.get('left_title_css',{},true));

}
    async function loadMovieDataOptimized(render,data){

if(data.overview){

render.find('.cas-description')
.html(data.overview||'')
.css('opacity','1')
.show();

}

const tmdbV=parseFloat(data.vote_average||0).toFixed(1);

if(tmdbV>0){

render.find('.cas-rate-items').html(
`<div class="cas-rate-item">
<img src="${ICONS.tmdb}">
<span style="color:${getRatingColor(tmdbV)}">${tmdbV}</span>
</div>`
);

}

const time=formatTime(data.runtime||(data.episode_run_time?data.episode_run_time[0]:0));

const genre=(data.genres||[])
.slice(0,1)
.map(g=>g.name)
.join('');

render.find('.cas-meta-info').text(
(time?time+(genre?' • ':''):'')+genre
);

}
    function parseQuality(render,data){

if(!Lampa.Parser.get)return;

Lampa.Parser.get(
{search:data.title||data.name,movie:data,page:1},
(res)=>{

try{

const items=res.Results||res;

if(items && Array.isArray(items)){

const b={res:'',hdr:false,dv:false,ukr:false};

items.slice(0,8).forEach(i=>{

const t=(i.Title||i.title||'').toLowerCase();

if(t.includes('4k')||t.includes('2160'))b.res='4K';
else if(!b.res && (t.includes('1080')||t.includes('fhd')))b.res='FULL HD';

if(t.includes('hdr'))b.hdr=true;

if(t.includes('dv')||t.includes('dovi')||t.includes('vision'))b.dv=true;

if(t.includes('ukr')||t.includes('укр'))b.ukr=true;

});

let qH='';

if(b.res)qH+=`<div class="cas-quality-item"><img src="${QUALITY_ICONS[b.res]}"></div>`;

if(b.dv)qH+=`<div class="cas-quality-item"><img src="${QUALITY_ICONS['Dolby Vision']}"></div>`;
else if(b.hdr)qH+=`<div class="cas-quality-item"><img src="${QUALITY_ICONS['HDR']}"></div>`;

if(b.ukr)qH+=`<div class="cas-quality-item"><img src="${QUALITY_ICONS['UKR']}"></div>`;

render.find('.cas-quality-row').html(qH);

}

}catch(e){}

});

}
    const debouncedLoadMovieData=debounce((render,data)=>{

try{
loadMovieDataOptimized(render,data);
parseQuality(render,data);
}
catch(e){}

},80);
    function attachLoader(){

Lampa.Listener.follow('full',(event)=>{

if(event.type==='complite'){

const data=event.data.movie;

const render=event.object.activity.render();

if(data && data.id){

debouncedLoadMovieData(render,data);

}

}

});

}
    function startPlugin(){

try{

addStyles();
attachLoader();

console.log('NewCard optimized loaded');

}catch(e){

console.error('Plugin error',e);

}

}

if(window.appready)startPlugin();
else{

Lampa.Listener.follow('app',(e)=>{

if(e.type==='ready')startPlugin();

});

}

})();
