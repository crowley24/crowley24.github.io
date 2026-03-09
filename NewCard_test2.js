(function () {
    'use strict';

    function NewCard(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask:true,over:true,no_status:true});
        var items = [];
        var active = 0;
        var html = Lampa.Template.get('full_start_new', {});
        var info = html.find('.left-title__content');
        var images_cache = Lampa.Storage.get('cas_images_cache') || {};
        var cache_lifetime = 1000 * 60 * 60 * 24;
        var _this = this;
        this.create = function () {
            this.buildButtons();
            this.loadImages();
            this.loadMetadata();
            this.loadQuality();
            this.applySettings();
            
            // Анімація появи
            setTimeout(function(){
                info.addClass('cas-animated');
            }, 10);
            return html;
        };

        this.applySettings = function() {
            var root = document.documentElement;
            root.style.setProperty('--cas-logo-scale', parseInt(Lampa.Storage.get('cas_logo_scale', '100')) / 100);
            root.style.setProperty('--cas-blocks-gap', Lampa.Storage.get('cas_blocks_gap', '20') + 'px');
            root.style.setProperty('--cas-meta-size', Lampa.Storage.get('cas_meta_size', '1.3') + 'em');
            $('body').toggleClass('cas--zoom-enabled', !!Lampa.Storage.get('cas_bg_animation', true));
        };

        this.buildButtons = function() {
            var btns = html.find('.full-start__button');
            
            btns.on('hover:focus', function() {
                active = btns.index(this);
                // Ефект світіння та збільшення при фокусі
                $(this).addClass('focus').css({
                    'transform': 'scale(1.08)',
                    'box-shadow': '0 0 15px rgba(255,255,255,0.4)'
                });
            }).on('hover:hover', function() {
                $(this).removeClass('focus').css({
                    'transform': 'scale(1)',
                    'box-shadow': 'none'
                });
            });

            // Обробка натискання (Play, Trailer, etc)
            html.find('.button--play').on('hover:enter', function() {
                Lampa.Player.run(object.movie);
            });
            
            html.find('.button--book').on('hover:enter', function() {
                Lampa.Favorite.toggle(object.movie);
            });
        };

        this.loadImages = function() {
            var movie = object.movie;
            var id = 'tmdb_' + movie.id;
            var type = movie.name ? 'tv' : 'movie';

            var process = function(data) {
                // Вибір логотипу (UA -> EN -> FIRST)
                var logo = data.logos.find(function(l) { return l.iso_639_1 == 'uk'; }) || 
                           data.logos.find(function(l) { return l.iso_639_1 == 'en'; }) || 
                           data.logos[0];
                
                if (logo) {
                    var quality = Lampa.Storage.get('cas_logo_quality', 'original');
                    var url = Lampa.TMDB.image('/t/p/' + quality + logo.file_path);
                    html.find('.cas-logo').html('<img src="' + url + '">');
                } else {
                    html.find('.cas-logo').html('<div class="cas-title-text">' + (movie.title || movie.name) + '</div>');
                }

                // Слайдшоу фонів (Backdrops)
                if (Lampa.Storage.get('cas_slideshow_enabled', true) && data.backdrops && data.backdrops.length > 1) {
                    var idx = 0;
                    var max_bg = Math.min(data.backdrops.length, 12);
                    _this.bgInterval = setInterval(function() {
                        idx = (idx + 1) % max_bg;
                        var bgUrl = Lampa.TMDB.image('/t/p/original' + data.backdrops[idx].file_path);
                        var bgImg = $('.full-start__background img');
                        
                        // М'яка зміна через клонування або заміну src
                        bgImg.fadeOut(800, function() {
                            $(this).attr('src', bgUrl).fadeIn(800);
                        });
                    }, 12000);
                }
            };

            if (images_cache[id] && (Date.now() - images_cache[id].time < cache_lifetime)) {
                process(images_cache[id].data);
            } else {
                network.silent(Lampa.TMDB.api(type + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key()), function(res) {
                    images_cache[id] = { time: Date.now(), data: res };
                    Lampa.Storage.set('cas_images_cache', images_cache);
                    process(res);
                });
            }
        };

        this.loadMetadata = function() {
            var movie = object.movie;
            
            // Опис
            if (Lampa.Storage.get('cas_show_description', true)) {
                html.find('.cas-description').text(movie.overview || '');
            }

            // Рейтинги (TMDB + CUB)
            var rates_html = '';
            var tmdb_v = parseFloat(movie.vote_average || 0).toFixed(1);
            if (tmdb_v > 0) {
                var color = tmdb_v >= 7.5 ? '#2ecc71' : (tmdb_v >= 6 ? '#feca57' : '#ff4d4d');
                rates_html += '<div class="cas-rate-item"><img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg"> <span style="color:'+color+'">'+tmdb_v+'</span></div>';
            }

            // Розрахунок рейтингу CUB на основі реакцій
            if (object.reactions && object.reactions.result) {
                var score = 0, count = 0;
                var weights = { fire: 10, nice: 7.5, think: 5, bore: 2.5, shit: 0 };
                object.reactions.result.forEach(function(r) {
                    if (r.counter) {
                        score += r.counter * weights[r.type];
                        count += r.counter;
                    }
                });
                if (count >= 5) {
                    var base = movie.name ? 7.4 : 6.5;
                    var cub_v = (((base * 150) + score) / (150 + count)).toFixed(1);
                    var cub_color = cub_v >= 7.5 ? '#2ecc71' : (cub_v >= 6 ? '#feca57' : '#ff4d4d');
                    rates_html += '<div class="cas-rate-item"><img src="https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg"> <span style="color:'+cub_color+'">'+cub_v+'</span></div>';
                }
            }
            html.find('.cas-rate-items').html(rates_html);

            // Час та жанр
            var runtime = movie.runtime || (movie.episode_run_time ? movie.episode_run_time[0] : 0);
            var hours = Math.floor(runtime / 60);
            var mins = runtime % 60;
            var time_str = (hours > 0 ? hours + 'г ' : '') + (mins > 0 ? mins + 'хв' : '');
            var genre = movie.genres && movie.genres.length ? movie.genres[0].name : '';
            html.find('.cas-meta-info').text(time_str + (time_str && genre ? ' • ' : '') + genre);

            // Студії (Networks / Companies)
            if (Lampa.Storage.get('cas_show_studios', true)) {
                var entities = (movie.networks || movie.production_companies || []).filter(function(i) { return i.logo_path; }).slice(0, 3);
                var studios_html = entities.map(function(i) {
                    return '<div class="cas-studio-item"><img src="'+Lampa.TMDB.image('/t/p/w200' + i.logo_path)+'"></div>';
                }).join('');
                html.find('.cas-studios-row').html(studios_html);
            }
        };

        this.loadQuality = function() {
            if (!Lampa.Storage.get('cas_show_quality', true) || !Lampa.Parser) return;

            Lampa.Parser.get({
                search: object.movie.title || object.movie.name,
                movie: object.movie,
                page: 1
            }, function(res) {
                var results = res.Results || res;
                if (results && results.length) {
                    var flags = { res: '', hdr: false, dv: false, ukr: false };
                    results.slice(0, 15).forEach(function(i) {
                        var t = (i.Title || i.title || '').toLowerCase();
                        if (t.includes('4k') || t.includes('2160')) flags.res = '4K';
                        else if (!flags.res && (t.includes('1080') || t.includes('fhd'))) flags.res = 'FULL HD';
                        if (t.includes('hdr')) flags.hdr = true;
                        if (t.includes('dv') || t.includes('vision')) flags.dv = true;
                        if (t.includes('ukr') || t.includes('укр')) flags.ukr = true;
                    });

                    var q_html = '';
                    var path = 'https://crowley38.github.io/Icons/';
                    if (flags.res) q_html += '<img src="'+path+flags.res+'.svg">';
                    if (flags.dv) q_html += '<img src="'+path+'Dolby Vision.svg">';
                    else if (flags.hdr) q_html += '<img src="'+path+'HDR.svg">';
                    if (flags.ukr) q_html += '<img src="'+path+'UKR.svg">';
                    
                    if (q_html) html.find('.cas-quality-row').html('<span class="cas-sep">•</span>' + q_html);
                }
            });
        };

        this.destroy = function() {
            if (this.bgInterval) clearInterval(this.bgInterval);
            network.clear();
            scroll.destroy();
            html.remove();
        };
    }

    // Реєстрація шаблону
    Lampa.Template.add('full_start_new', `
        <div class="full-start-new left-title">
            <div class="full-start-new__body">
                <div class="full-start-new__right">
                    <div class="left-title__content">
                        <div class="cas-logo-container"><div class="cas-logo"></div></div>
                        <div class="cas-ratings-line">
                            <div class="cas-rate-items"></div>
                            <div class="cas-meta-info"></div>
                            <div class="cas-quality-row"></div>
                        </div>
                        <div class="cas-studios-row"></div>
                        <div class="cas-description"></div>
                        <div class="full-start-new__buttons">
                            <div class="full-start__button selector button--play">
                                <svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" stroke="currentColor" fill="none" stroke-width="2"/><path d="M11 9l8 5-8 5V9z" fill="currentColor"/></svg>
                                <span>#{title_watch}</span>
                            </div>
                            <div class="full-start__button selector button--book">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                                <span>#{title_add_to_favorite}</span>
                            </div>
                            <div class="full-start__button selector button--trailer">
                                <span>#{title_trailer}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);

    // Стилі (Повна версія)
    var styles = `
        <style>
            :root { --cas-logo-scale: 1; --cas-blocks-gap: 20px; --cas-meta-size: 1.3em; }
            .full-start-new.left-title { position: absolute; top:0; left:0; width:100%; height:100%; z-index:10; background: transparent; }
            .left-title__content { padding: 0 4%; opacity: 0; transform: translateY(20px); transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1); }
            .left-title__content.cas-animated { opacity: 1; transform: translateY(0); }
            .full-start-new__body { height: 100%; display: flex; align-items: flex-end; padding-bottom: 6%; }
            .cas-logo img { max-width: 450px; max-height: 180px; transform: scale(var(--cas-logo-scale)); transform-origin: left bottom; }
            .cas-ratings-line { display: flex; align-items: center; gap: 15px; margin-top: var(--cas-blocks-gap); font-size: var(--cas-meta-size); font-weight: 600; }
            .cas-rate-item { display: flex; align-items: center; gap: 6px; }
            .cas-rate-item img { height: 0.9em; }
            .cas-meta-info { opacity: 0.7; }
            .cas-quality-row { display: flex; align-items: center; gap: 8px; }
            .cas-quality-row img { height: 16px; }
            .cas-sep { opacity: 0.4; margin: 0 5px; }
            .cas-studios-row { display: flex; gap: 20px; margin-top: var(--cas-blocks-gap); }
            .cas-studio-item img { height: 18px; filter: brightness(0) invert(1); opacity: 0.8; }
            .cas-description { margin-top: var(--cas-blocks-gap); max-width: 700px; font-size: 1.1em; line-height: 1.5; color: rgba(255,255,255,0.8); display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
            .full-start-new__buttons { display: flex; gap: 18px; margin-top: 25px; }
            .full-start__button { display: flex; align-items: center; gap: 10px; padding: 10px 22px; border-radius: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s; }
            .full-start__button span { font-weight: 600; font-size: 1.1em; }
            .full-start__button.focus { background: #fff !important; color: #000 !important; border-color: #fff; }
            
            /* Анімація фону */
            @keyframes casKenBurns { 
                0% { transform: scale(1); } 
                50% { transform: scale(1.1); } 
                100% { transform: scale(1); } 
            }
            body.cas--zoom-enabled .full-start__background img { animation: casKenBurns 40s linear infinite; }
        </style>
    `;

    function startPlugin() {
        if (window.cas_plugin_loaded) return;
        window.cas_plugin_loaded = true;
        
        $('body').append(styles);
        
        // Налаштування
        Lampa.SettingsApi.addComponent({ component: 'cas_style', name: 'New Card Style', icon: '<svg>...</svg>' });
        Lampa.SettingsApi.addParam({
            component: 'cas_style',
            param: { name: 'cas_logo_quality', type: 'select', values: {'w300':'300px','w500':'500px','original':'Original'}, default: 'original' },
            field: { name: 'Якість логотипу' }
        });
        // (Тут були б інші addParam для слайдшоу, розмірів тощо)

        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var new_card = new NewCard(e.object);
                var render = e.object.activity.render();
                
                // Ховаємо стандартні елементи та вставляємо свій блок
                render.find('.full-start').empty().append(new_card.create());
                
                e.object.activity.onBeforeDestroy = function() {
                    new_card.destroy();
                };
            }
        });
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });

})();
