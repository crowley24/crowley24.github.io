(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;
    if (Lampa.Manifest.app_digital < 300) return; // Тільки для v3.0.0+

    if (window.plugin_new_interface_logo_ready) return;
    window.plugin_new_interface_logo_ready = true;

    // ========== ПЕРЕКЛАДИ ==========
    Lampa.Lang.add({
        new_interface_name: { en:'New interface', uk:'Новий інтерфейс', ru:'Новый интерфейс' },
        new_interface_desc: { en:'Enhanced interface with background and details', uk:'Розширений інтерфейс з фоном та деталями', ru:'Расширенный интерфейс с фоном и деталями' },
        logo_name: { en:'Logos instead of titles', uk:'Логотипи замість назв', ru:'Логотипы вместо названий' },
        logo_desc: { en:'Show logos in fullscreen', uk:'Показує логотипи в повноекранному перегляді', ru:'Показывает логотипы в полноэкранном просмотре' }
    });

    // ========== НАЛАШТУВАННЯ ==========
    Lampa.SettingsApi.addParam({
        component:'interface',
        param:{ name:'new_interface', type:'trigger', default:true },
        field:{ name:Lampa.Lang.translate('new_interface_name'), description:Lampa.Lang.translate('new_interface_desc') }
    });

    Lampa.SettingsApi.addParam({
        component:'interface',
        param:{ name:'logo_glav', type:'select', values:{1:'Вимкнути',0:'Увімкнути'}, default:'0' },
        field:{ name:Lampa.Lang.translate('logo_name'), description:Lampa.Lang.translate('logo_desc') }
    });

    // ========== СТИЛІ ДЛЯ ВЕРТИКАЛЬНИХ КАРТОК ==========
    function addStyles() {
        if (addStyles.added) return;
        addStyles.added = true;

        Lampa.Template.add('new_interface_logo_styles', `<style>
            .new-interface { position: relative; }
            .new-interface .card { width: 13em; } /* класичні вертикальні */
            .new-interface .card .card__view { padding-bottom: 150%; }
            .new-interface-info { position: relative; padding: 1.5em; height: 24em; }
            .new-interface-info__body { width: 80%; padding-top: 1.1em; }
            .new-interface-info__head { color: rgba(255,255,255,0.6); margin-bottom: 1em; font-size:1.3em; min-height:1em; }
            .new-interface-info__head span { color:#fff; }
            .new-interface-info__title { font-size: 2.2em; font-weight:600; margin-bottom:0.3em; overflow:hidden; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; line-height:1.3; }
            .new-interface-info__title img { max-height:80px; margin-top:5px; display:block; }
            .new-interface-info__details { margin-bottom:1.6em; display:flex; align-items:center; flex-wrap:wrap; min-height:1.9em; font-size:1.1em; }
            .new-interface-info__split { margin:0 1em; font-size:0.7em; }
            .new-interface-info__description { font-size:1.1em; font-weight:300; line-height:1.4; overflow:hidden; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; width:70%; }
            .new-interface-card-title { margin-top:0.6em; font-size:1em; font-weight:500; color:#fff; display:block; text-align:left; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; pointer-events:none; }
            body.light--version .new-interface-card-title { color:#111; }
        </style>`);

        $('body').append(Lampa.Template.get('new_interface_logo_styles', {}, true));
    }

    // ========== ЛОГІКА НОВОГО ІНТЕРФЕЙСУ ==========
    function startNewInterface() {
        if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) return;
        addStyles();

        const mainMap = Lampa.Maker.map('Main');
        if (!mainMap || !mainMap.Items || !mainMap.Create) return;

        wrap(mainMap.Items,'onInit',function(orig,args){
            if(orig) orig.apply(this,args);
            this.__newInterfaceEnabled = shouldUseNewInterface(this && this.object);
        });

        wrap(mainMap.Create,'onCreate',function(orig,args){
            if(orig) orig.apply(this,args);
            if(!this.__newInterfaceEnabled) return;
            const state = ensureState(this);
            state.attach();
        });

        wrap(mainMap.Items,'onAppend',function(orig,args){
            if(orig) orig.apply(this,args);
            if(!this.__newInterfaceEnabled) return;
            attachLineHandlers(this,args[0],args[1]);
        });

        wrap(mainMap.Items,'onDestroy',function(orig,args){
            if(this.__newInterfaceState) { this.__newInterfaceState.destroy(); delete this.__newInterfaceState; }
            delete this.__newInterfaceEnabled;
            if(orig) orig.apply(this,args);
        });
    }

    function shouldUseNewInterface(object){
        if(!object) return false;
        if(!(object.source==='tmdb'||object.source==='cub')) return false;
        if(window.innerWidth<767) return false;
        return Lampa.Storage.field('new_interface');
    }

    function ensureState(main){
        if(main.__newInterfaceState) return main.__newInterfaceState;
        const state = createInterfaceState(main);
        main.__newInterfaceState = state;
        return state;
    }

    function createInterfaceState(main){
        const info = new InterfaceInfo();
        info.create();
        const background = document.createElement('img');
        background.className = 'full-start__background';

        return {
            main, info, background, infoElement:null, backgroundTimer:null, backgroundLast:'', attached:false,
            attach(){
                if(this.attached) return;
                const container = main.render(true);
                if(!container) return;
                container.classList.add('new-interface');
                if(!background.parentElement) container.insertBefore(background,container.firstChild||null);

                const infoNode = info.render(true);
                this.infoElement = infoNode;
                if(infoNode && infoNode.parentNode !== container){
                    container.insertBefore(infoNode, background.nextSibling||container.firstChild||null);
                }

                main.scroll.minus(infoNode);
                this.attached = true;
            },
            update(data){
                if(!data) return;
                info.update(data);
                this.updateBackground(data);
            },
            updateBackground(data){
                const path = data && data.backdrop_path ? Lampa.Api.img(data.backdrop_path,'w1280'):'';
                if(!path || path===this.backgroundLast) return;
                clearTimeout(this.backgroundTimer);
                this.backgroundTimer = setTimeout(()=>{
                    background.classList.remove('loaded');
                    background.onload = ()=>background.classList.add('loaded');
                    background.onerror = ()=>background.classList.remove('loaded');
                    this.backgroundLast = path;
                    setTimeout(()=>{ background.src=this.backgroundLast; },300);
                },1000);
            },
            reset(){ info.empty(); },
            destroy(){
                clearTimeout(this.backgroundTimer);
                info.destroy();
                const container = main.render(true);
                if(container) container.classList.remove('new-interface');
                if(this.infoElement && this.infoElement.parentNode) this.infoElement.parentNode.removeChild(this.infoElement);
                if(background && background.parentNode) background.parentNode.removeChild(background);
                this.attached=false;
            }
        };
    }

    // ========== КЛАС ДЛЯ ІНФОРМАЦІЇ ==========
    class InterfaceInfo{
        constructor(){ this.html=null; this.timer=null; this.network=new Lampa.Reguest(); this.loadedLogos={}; this.currentLogoUrl=null; this.logoData=null; }
        create(){
            if(this.html) return;
            this.html = $(`<div class="new-interface-info">
                <div class="new-interface-info__body">
                    <div class="new-interface-info__head"></div>
                    <div class="new-interface-info__title"></div>
                    <div class="new-interface-info__details"></div>
                    <div class="new-interface-info__description"></div>
                </div>
            </div>`);
        }
        render(js){ if(!this.html) this.create(); return js ? this.html[0] : this.html; }
        update(data){
            if(!data) return;
            if(!this.html) this.create();
            this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');
            this.updateTitle(data);
            this.html.find('.new-interface-info__description').text(data.overview||Lampa.Lang.translate('full_notext'));
            Lampa.Background.change(Lampa.Utils.cardImgBackground(data));
            this.loadDetails(data);
        }
        updateTitle(data){
            const titleElement = this.html.find('.new-interface-info__title');
            if(Lampa.Storage.get('logo_glav')!='1'){ titleElement.text(data.title||data.name||''); this.loadLogo(data); }
            else{ titleElement.text(data.title||data.name||''); titleElement.find('img').remove(); }
        }
        loadLogo(data){
            if(!data||!data.id) return;
            const source = data.source||'tmdb';
            if(source!=='tmdb'&&source!=='cub') return;
            if(!Lampa.TMDB||typeof Lampa.TMDB.api!=='function'||typeof Lampa.TMDB.key!=='function') return;

            const type = data.media_type==='tv'||data.name?'tv':'movie';
            const userLanguage = Lampa.Storage.get('language');
            const cacheKey = `${type}_${data.id}_${userLanguage}`;
            if(this.loadedLogos[cacheKey]&&this.loadedLogos[cacheKey]!=''){ this.displayLogo(data,this.loadedLogos[cacheKey]); return; }

            const currentLangUrl = Lampa.TMDB.api(`${type}/${data.id}/images?api_key=${Lampa.TMDB.key()}&language=${userLanguage}`);
            this.currentLogoUrl = currentLangUrl;

            $.get(currentLangUrl,(currentLangData)=>{
                if(this.currentLogoUrl!==currentLangUrl) return;
                let logoPath=null;
                if(currentLangData.logos && currentLangData.logos.length>0 && currentLangData.logos[0].file_path){ logoPath=currentLangData.logos[0].file_path; }
                if(logoPath){ this.loadedLogos[cacheKey]=logoPath; this.displayLogo(data,logoPath); }
            });
        }
        displayLogo(data,logoPath){
            if(!logoPath||!this.html) return;
            const titleElement=this.html.find('.new-interface-info__title');
            const logoUrl=Lampa.TMDB.image('/t/p/w300'+logoPath.replace('.svg','.png'));
            const logoImg=$('<img>').attr('src',logoUrl).attr('alt',data.title||data.name||'').css({'max-height':'80px','margin-top':'5px','display':'block'}).on('error',function(){ $(this).remove(); titleElement.text(data.title||data.name||''); });
            titleElement.empty().append(logoImg);
        }
        loadDetails(data){
            if(!data||!data.id) return;
            const source = data.source||'tmdb';
            if(source!=='tmdb'&&source!=='cub') return;
            if(!Lampa.TMDB||typeof Lampa.TMDB.api!=='function'||typeof Lampa.TMDB.key!=='function') return;
            const type = data.media_type==='tv'||data.name?'tv':'movie';
            const language=Lampa.Storage.get('language');
            const url=Lampa.TMDB.api(`${type}/${data.id}?api_key=${Lampa.TMDB.key()}&append_to_response=content_ratings,release_dates&language=${language}`);
            this.currentUrl=url;
            if(this.loadedLogos[url]){ this.drawDetails(this.loadedLogos[url]); return; }
            clearTimeout(this.timer);
            this.timer=setTimeout(()=>{
                this.network.clear();
                this.network.timeout(5000);
                this.network.silent(url,(movie)=>{
                    this.loadedLogos[url]=movie;
                    if(this.currentUrl===url) this.drawDetails(movie);
                });
            },300);
        }
        drawDetails(movie){
            if(!movie||!this.html) return;
            const create=((movie.release_date||movie.first_air_date||'0000')+'').slice(0,4);
            const vote=parseFloat((movie.vote_average||0)+'').toFixed(1);
            const head=[]; const details=[];
            const sources=Lampa.Api&&Lampa.Api.sources&&Lampa.Api.sources.tmdb?Lampa.Api.sources.tmdb:null;
            const countries=sources&&typeof sources.parseCountries==='function'?sources.parseCountries(movie):[];
            const pg=sources&&typeof sources.parsePG==='function'?sources.parsePG(movie):'';

            if(create!=='0000') head.push(`<span>${create}</span>`);
            if(countries&&countries.length) head.push(countries.join(','));
            if(vote>0) details.push(`<div class="full-start__rate"><div>${vote}</div><div>TMDB</div></div>`);
            if(Array.isArray(movie.genres)&&movie.genres.length) details.push(movie.genres.map((g)=>Lampa.Utils.capitalizeFirstLetter(g.name)).join(' | '));
            if(movie.runtime) details.push(Lampa.Utils.secondsToTime(movie.runtime*60,true));
            if(pg) details.push(`<span class="full-start__pg" style="font-size:0.9em;">${pg}</span>`);

            this.html.find('.new-interface-info__head').empty().append(head.join(','));
            this.html.find('.new-interface-info__details').html(details.join('<span class="new-interface-info__split">&#9679;</span>'));
        }
        empty(){
            if(!this.html) return;
            this.html.find('.new-interface-info__head,.new-interface-info__details').text('---');
            this.html.find('.new-interface-info__title').empty();
        }
        destroy(){ clearTimeout(this.timer); this.network.clear(); this.loadedLogos={}; this.currentUrl=null; this.currentLogoUrl=null; if(this.html){ this.html.remove(); this.html=null; } }
    }

    // ========== ЛОГІКА ЛОГОТИПІВ ПОВНОЕКРАННО ==========
    function startLogosPlugin(){
        Lampa.Listener.follow('full',function(e){
            if(e.type=='complite'&&Lampa.Storage.get('logo_glav')!='1'){
                const data=e.data.movie;
                const type=data.name?'tv':'movie';
                if(!data.id) return;
                const userLanguage=Lampa.Storage.get('language');
                const currentLangUrl=Lampa.TMDB.api(`${type}/${data.id}/images?api_key=${Lampa.TMDB.key()}&language=${userLanguage}`);
                $.get(currentLangUrl,function(currentLangData){
                    let logo=null;
                    if(currentLangData.logos&&currentLangData.logos.length>0&&currentLangData.logos[0].file_path) logo=currentLangData.logos[0].file_path;
                    if(logo) displayLogoInFullView(e,logo);
                });
            }
        });
    }

    function displayLogoInFullView(e,logoPath){
        if(!logoPath) return;
        e.object.activity.render().find('.full-start-new__title').html('<img style="margin-top:5px;max-height:80px;" src="'+Lampa.TMDB.image('/t/p/w300'+logoPath.replace('.svg','.png'))+'"/>');
    }

    // ========== ПРИВ'ЯЗКА КАРТОК ==========
    function attachLineHandlers(main,line,element){
        if(line.__newInterfaceLine) return;
        line.__newInterfaceLine=true;
        const state = ensureState(main);
        const applyToCard=(card)=>{
            if(!card||card.__newInterfaceCard||!card.use||!card.data) return;
            card.__newInterfaceCard=true;
            card.params=card.params||{};
            card.params.style=card.params.style||{};
            card.use({
                onFocus(){ state.update(card.data); },
                onHover(){ state.update(card.data); },
                onTouch(){ state.update(card.data); },
                onVisible(){ updateCardTitle(card); },
                onUpdate(){ updateCardTitle(card); },
                onDestroy(){ clearTimeout(card.__newInterfaceLabelTimer); if(card.__newInterfaceLabel&&card.__newInterfaceLabel.parentNode) card.__newInterfaceLabel.parentNode.removeChild(card.__newInterfaceLabel); card.__newInterfaceLabel=null; delete card.__newInterfaceCard; }
            });
            updateCardTitle(card);
        };
        if(Array.isArray(line.items)&&line.items.length) line.items.forEach(applyToCard);
        if(line.last){ const lastData=getDomCardData(line.last); if(lastData) state.update(lastData); }
    }

    function getDomCardData(node){ if(!node) return null; let current=node.jquery?node[0]:node; while(current&&!current.card_data) current=current.parentNode; return current&&current.card_data?current.card_data:null; }
    function getFocusedCardData(line){ const container=line&&typeof line.render==='function'?line.render(true):null; if(!container||!container.querySelector) return null; const focus=container.querySelector('.selector.focus')||container.querySelector('.focus'); return getDomCardData(focus); }
    function updateCardTitle(card){
        if(!card||typeof card.render!=='function') return;
        const element=card.render(true); if(!element) return;
        if(!element.isConnected){ clearTimeout(card.__newInterfaceLabelTimer); card.__newInterfaceLabelTimer=setTimeout(()=>updateCardTitle(card),50); return; }
        clearTimeout(card.__newInterfaceLabelTimer);
        const text=(card.data&&(card.data.title||card.data.name||card.data.original_title||card.data.original_name))?(card.data.title||card.data.name||card.data.original_title||card.data.original_name).trim():'';
