(function () {
    'use strict';

    function waitForLampa(callback) {
        if (window.Lampa && Lampa.Listener && Lampa.Storage && Lampa.TMDB && Lampa.Lang && Lampa.SettingsApi) {
            callback();
        } else {
            setTimeout(function() { waitForLampa(callback); }, 100);
        }
    }

    waitForLampa(function() {

        if (window.logoplugin) return;
        window.logoplugin = true;

        var logoCache = {};

        function getCachedLogo(type, id, lang, size) {
            var key = type + '_' + id + '_' + lang + '_' + size;
            if (logoCache[key]) return logoCache[key];
            try {
                var stored = localStorage.getItem('logo_cache_' + key);
                if (stored) {
                    var parsed = JSON.parse(stored);
                    if (Date.now() - parsed.timestamp < 7*24*60*60*1000) {
                        logoCache[key] = parsed.data;
                        return parsed.data;
                    }
                }
            } catch(e){}
            return null;
        }

        function setCachedLogo(type, id, lang, size, path) {
            var key = type + '_' + id + '_' + lang + '_' + size;
            logoCache[key] = path;
            try {
                localStorage.setItem('logo_cache_' + key, JSON.stringify({data: path, timestamp: Date.now()}));
            } catch(e){}
        }

        // Локалізація
        Lampa.Lang.add({
            logo_main_title: {en:'Logos instead of titles', uk:'Логотипи замість назв', ru:'Логотипы вместо названий'},
            logo_main_description: {en:'Displays movie logos instead of text', uk:'Відображає логотипи фільмів замість тексту', ru:'Отображает логотипы фильмов вместо текста'},
            logo_main_show: {en:'Show', uk:'Показати', ru:'Отображать'},
            logo_main_hide: {en:'Hide', uk:'Приховати', ru:'Скрыть'},
            logo_display_mode_title: {en:'Display mode', uk:'Режим відображення', ru:'Режим отображения'},
            logo_display_mode_logo_only: {en:'Logo only', uk:'Тільки логотип', ru:'Только логотип'},
            logo_display_mode_logo_and_text: {en:'Logo and text', uk:'Логотип і текст', ru:'Логотип и текст'},
            logo_size_title: {en:'Logo size', uk:'Розмір логотипа', ru:'Размер логотипа'},
            logo_size_description: {en:'Maximum logo height', uk:'Максимальна висота логотипа', ru:'Максимальная высота логотипа'}
        });

        // Параметри плагіна
        Lampa.SettingsApi.addParam({
            component:'interface',
            param:{name:'logo_main', type:'select', values:{'1':Lampa.Lang.translate('logo_main_hide'),'0':Lampa.Lang.translate('logo_main_show')}, default:'0'},
            field:{name:Lampa.Lang.translate('logo_main_title'), description:Lampa.Lang.translate('logo_main_description')}
        });

        Lampa.SettingsApi.addParam({
            component:'interface',
            param:{name:'logo_display_mode', type:'select', values:{'logo_only':Lampa.Lang.translate('logo_display_mode_logo_only'),'logo_and_text':Lampa.Lang.translate('logo_display_mode_logo_and_text')}, default:'logo_only'},
            field:{name:Lampa.Lang.translate('logo_display_mode_title'), description:Lampa.Lang.translate('logo_main_description'), show:()=>Lampa.Storage.get('logo_main')==='0'}
        });

        Lampa.SettingsApi.addParam({
            component:'interface',
            param:{name:'logo_size', type:'select', values:{'50':'50px','60':'60px','75':'75px','80':'80px','100':'100px','125':'125px','150':'150px'}, default:'80'},
            field:{name:Lampa.Lang.translate('logo_size_title'), description:Lampa.Lang.translate('logo_size_description'), show:()=>Lampa.Storage.get('logo_main')==='0'}
        });

        // Основна функція завантаження логотипу
        function loadAndRenderLogo(item, card) {
            var $ = window.$ || window.jQuery;
            if(!$) return;

            var apiKey = Lampa.TMDB.key();
            if(!apiKey) return;

            var mediaType = item.first_air_date && !item.release_date ? 'tv' : 'movie';
            var lang = Lampa.Storage.get('language') || 'en';
            var size = 'w500';

            var cached = getCachedLogo(mediaType, item.id, lang, size);
            if(cached) return renderLogo(cached, card, item);

            var url = Lampa.TMDB.api(mediaType+'/'+item.id+'/images?api_key='+apiKey+'&language='+lang);

            $.get(url,function(resp){
                var logoPath=null;
                if(resp && resp.logos && resp.logos.length){
                    var png=resp.logos.find(l=>l.file_path&&!l.file_path.endsWith('.svg'));
                    logoPath = png ? png.file_path : resp.logos[0].file_path;
                }

                if(!logoPath && lang!=='en'){
                    var enUrl = Lampa.TMDB.api(mediaType+'/'+item.id+'/images?api_key='+apiKey+'&language=en');
                    $.get(enUrl,function(resp2){
                        if(resp2 && resp2.logos && resp2.logos.length){
                            var png2 = resp2.logos.find(l=>l.file_path&&!l.file_path.endsWith('.svg'));
                            logoPath = png2 ? png2.file_path : resp2.logos[0].file_path;
                            setCachedLogo(mediaType,item.id,'en',size,logoPath);
                            renderLogo(logoPath,card,item);
                        }
                    });
                    return;
                }

                if(logoPath){
                    setCachedLogo(mediaType,item.id,lang,size,logoPath);
                    renderLogo(logoPath,card,item);
                }
            }).fail(function(){console.log('[LogoPlugin] Не вдалося завантажити логотипи', item.title||item.name)});
        }

        function renderLogo(logoPath, card, item){
            if(!logoPath) return;

            var titleEl = card.find('.full-start-new__title, .full-start__title');
            if(!titleEl.length) return;

            var logoUrl = Lampa.TMDB.image('/t/p/w500'+logoPath.replace('.svg','.png'));
            var html='<div style="display:inline-block;height:80px;width:auto;max-width:100%;">'+
                '<img src="'+logoUrl+'" style="height:100%;width:auto;object-fit:contain;display:block;margin-bottom:0.2em;" '+
                'alt="'+(item.title||item.name)+'" onerror="this.parentElement.innerHTML=\''+(item.title||item.name)+'\'" />'+
                '</div>';

            var displayMode = Lampa.Storage.get('logo_display_mode','logo_only');
            if(displayMode==='logo_and_text') html+='<span style="display:block;">'+(item.title||item.name)+'</span>';

            titleEl.html(html);
        }

        // Відстеження картки
        Lampa.Listener.follow('full', function(event){
            if((event.type==='complite'||event.type==='movie') && Lampa.Storage.get('logo_main')!=='1'){
                var item=event.data.movie;
                if(!item||!item.id) return;

                setTimeout(function(){
                    var card=event.object.activity.render();
                    var titleEl=card.find('.full-start-new__title, .full-start__title');
                    if(titleEl.length){
                        loadAndRenderLogo(item, card);
                    } else {
                        var observer=new MutationObserver(function(){
                            var t=card.find('.full-start-new__title, .full-start__title');
                            if(t.length){observer.disconnect(); loadAndRenderLogo(item,card);}
                        });
                        observer.observe(card[0]||card,{childList:true,subtree:true});
                        setTimeout(()=>observer.disconnect(),5000);
                    }
                },150);
            }
        });

        console.log('[LogoPlugin] Плагін успішно ініціалізовано');
    });
})();
