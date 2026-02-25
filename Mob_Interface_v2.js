(function () {
    'use strict';

    // =============================
    // 1. Налаштування за замовчуванням
    // =============================

    var settings_list = [
        { id: 'mobile_interface_animation', default: true },
        { id: 'mobile_interface_studios', default: true },
        { id: 'mobile_interface_quality', default: true },
        { id: 'mobile_interface_slideshow', default: true },
        { id: 'mobile_interface_slideshow_time', default: '10000' },
        { id: 'mobile_interface_slideshow_quality', default: 'w780' }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var slideshowTimer;

    var pluginPath = 'https://crowley24.github.io/Icons/';
    var svgIcons = {
        '4K': pluginPath + '4K.svg',
        '2K': pluginPath + '2K.svg',
        'FULL HD': pluginPath + 'FULL HD.svg',
        'HD': pluginPath + 'HD.svg',
        'HDR': pluginPath + 'HDR.svg',
        'Dolby Vision': pluginPath + 'Dolby Vision.svg',
        '7.1': pluginPath + '7.1.svg',
        '5.1': pluginPath + '5.1.svg',
        '4.0': pluginPath + '4.0.svg',
        '2.0': pluginPath + '2.0.svg',
        'DUB': pluginPath + 'DUB.svg',
        'UKR': pluginPath + 'UKR.svg'
    };

    // =============================
    // 2. Стилі (оновлено)
    // =============================

    function applyStyles() {
        var oldStyle = document.getElementById('mobile-interface-styles');
        if (oldStyle) oldStyle.remove();

        var isAnimationEnabled = Lampa.Storage.get('mobile_interface_animation');

        var style = document.createElement('style');
        style.id = 'mobile-interface-styles';

        var css = '';

        css += '@keyframes kenBurnsEffect { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } } ';
        css += '@keyframes qb_in { from { opacity:0; transform: translateY(8px);} to { opacity:1; transform: translateY(0);} } ';

        css += '@media screen and (max-width: 480px) { ';
        css += '.background { background:#000 !important;} ';

        css += '.full-start-new__poster { position:relative !important; overflow:hidden !important; background:#000; z-index:1; height:60vh !important; pointer-events:none !important;} ';

        css += '.full-start-new__poster img { ';
        if (isAnimationEnabled) css += 'animation: kenBurnsEffect 25s ease-in-out infinite !important;';
        css += 'transform-origin:center center !important; transition: opacity 1.5s ease-in-out !important; position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;';
        css += 'mask-image: linear-gradient(to bottom,#000 0%,#000 55%,transparent 100%) !important;';
        css += '-webkit-mask-image: linear-gradient(to bottom,#000 0%,#000 55%,transparent 100%) !important;} ';

        css += '.full-start-new__right { background:none !important; margin-top:-110px !important; z-index:2 !important; display:flex !important; flex-direction:column !important; align-items:center !important;} ';

        css += '.full-start-new__title { width:100%; display:flex; justify-content:center; min-height:80px; margin-bottom:5px;} ';
        css += '.full-start-new__title img { max-height:100px; object-fit:contain; filter:drop-shadow(0 0 8px rgba(0,0,0,0.6));} ';

        css += '.full-start-new__tagline { font-style:italic !important; opacity:0.9 !important; font-size:1.05em !important; margin:5px 0 15px !important; color:#fff !important; text-align:center !important; text-shadow:0 2px 4px rgba(0,0,0,0.8);} ';

        css += '.plugin-info-block { display:flex; flex-direction:column; align-items:center; gap:12px; margin:15px 0; width:100%;} ';
        css += '.studio-row, .quality-row { display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:10px; width:100%;} ';

        /* GLASS ПІДКЛАДКА */
        css += '.studio-item { height:2.2em; padding:6px 10px; background:rgba(255,255,255,0.06); border-radius:10px; backdrop-filter:blur(4px); opacity:0; animation:qb_in 0.4s ease forwards; transition: transform .2s ease;} ';
        css += '.studio-item:hover { transform: scale(1.05);} ';

        css += '.studio-item img { height:100%; width:auto; object-fit:contain; filter: drop-shadow(0 0 4px rgba(255,255,255,0.35)); } ';

        css += '.quality-item { height:1.25em; opacity:0; animation:qb_in 0.4s ease forwards;} ';
        css += '.quality-item img { height:100%; width:auto; object-fit:contain;} ';

        css += '}';

        style.textContent = css;
        document.head.appendChild(style);
    }

    // =============================
    // 3. Аналіз якості
    // =============================

    function getBest(results) {
        var best = { resolution:null, hdr:false, dolbyVision:false, dub:false, ukr:false };
        var resOrder = ['HD','FULL HD','2K','4K'];

        results.slice(0,30).forEach(function(item){
            var title = (item.Title || '').toLowerCase();

            if(title.match(/ukr|укр|ua/)) best.ukr = true;
            if(title.match(/dub|дубл/)) best.dub = true;

            if(title.match(/4k|2160/)) best.resolution='4K';
            else if(title.match(/2k|1440/)) best.resolution='2K';
            else if(title.match(/1080|fhd/)) best.resolution='FULL HD';
            else if(title.match(/720|hd/)) best.resolution='HD';

            if(title.includes('vision') || title.includes('dovi')) best.dolbyVision=true;
            if(title.includes('hdr')) best.hdr=true;
        });

        if(best.dolbyVision) best.hdr=true;
        return best;
    }

    // =============================
    // 4. Слайд-шоу
    // =============================

    function startSlideshow($poster, backdrops) {
        if (!Lampa.Storage.get('mobile_interface_slideshow') || backdrops.length < 2) return;

        var index = 0;
        var interval = parseInt(Lampa.Storage.get('mobile_interface_slideshow_time', '10000'));
        var quality = Lampa.Storage.get('mobile_interface_slideshow_quality', 'w780');

        clearInterval(slideshowTimer);

        slideshowTimer = setInterval(function(){
            index = (index+1)%backdrops.length;
            var imgUrl = Lampa.TMDB.image('/t/p/'+quality+backdrops[index].file_path);

            var $currentImg = $poster.find('img').first();
            var $newImg = $('<img src="'+imgUrl+'" style="opacity:0;z-index:-1;">');

            $poster.append($newImg);

            setTimeout(function(){
                $newImg.css('opacity','1');
                $currentImg.css('opacity','0');
                setTimeout(function(){ $currentImg.remove(); },1500);
            },100);

        }, interval);
    }

    // =============================
    // 5. Основна логіка
    // =============================

    function initPlugin() {
        Lampa.Listener.follow('full', function (e) {

            if(e.type==='destroy') clearInterval(slideshowTimer);

            if(window.innerWidth<=480 && (e.type==='complite'||e.type==='complete')){

                var movie = e.data.movie;
                var $render = e.object.activity.render();
                var $details = $render.find('.full-start-new__details');

                $.ajax({
                    url:'https://api.themoviedb.org/3/'+(movie.name?'tv':'movie')+'/'+movie.id+'/images?api_key='+Lampa.TMDB.key(),
                    success:function(res){

                        var lang = Lampa.Storage.get('language') || 'uk';
                        var logo = res.logos.find(l=>l.iso_639_1===lang) || res.logos.find(l=>l.iso_639_1==='en') || res.logos[0];

                        if(logo){
                            var imgUrl=Lampa.TMDB.image('/t/p/w300'+logo.file_path.replace('.svg','.png'));
                            $render.find('.full-start-new__title').html('<img src="'+imgUrl+'">');
                        }

                        if(res.backdrops && res.backdrops.length>1){
                            startSlideshow($render.find('.full-start-new__poster'),res.backdrops.slice(0,15));
                        }
                    }
                });

                if($details.length){

                    $('.plugin-info-block').remove();

                    var $info=$('<div class="plugin-info-block"><div class="studio-row"></div><div class="quality-row"></div></div>');
                    $details.after($info);

                    if(Lampa.Storage.get('mobile_interface_studios')){
                        var studios=(movie.networks||[]).concat(movie.production_companies||[]);
                        var used=[];

                        studios.forEach(function(s){
                            if(s.logo_path && used.indexOf(s.logo_path)===-1){
                                used.push(s.logo_path);
                                var logoUrl=Lampa.Api.img(s.logo_path,'w200');
                                $info.find('.studio-row').append('<div class="studio-item"><img src="'+logoUrl+'"></div>');
                            }
                        });
                    }

                    if(Lampa.Storage.get('mobile_interface_quality') && Lampa.Parser.get){
                        Lampa.Parser.get({ search: movie.title||movie.name, movie: movie }, function(res){
                            if(res && res.Results){
                                var best=getBest(res.Results);
                                var list=[];

                                if(best.resolution) list.push(best.resolution);
                                if(best.dolbyVision) list.push('Dolby Vision');
                                else if(best.hdr) list.push('HDR');
                                if(best.dub) list.push('DUB');
                                if(best.ukr) list.push('UKR');

                                list.forEach(function(type,i){
                                    if(svgIcons[type]){
                                        $info.find('.quality-row').append('<div class="quality-item" style="animation-delay:'+(i*0.1)+'s"><img src="'+svgIcons[type]+'"></div>');
                                    }
                                });
                            }
                        });
                    }
                }
            }
        });
    }

    function start(){
        applyStyles();
        initPlugin();
    }

    if(window.appready) start();
    else Lampa.Listener.follow('app',function(e){ if(e.type==='ready') start(); });

})();
