/*
 * Card Fusion Lite v1.0
 * Мінімальний плагін для Lampa.
 * Функції: адаптивна картка, фонові трейлери YouTube, slideshow TMDB,
 * графічні логотипи TMDB з ручним вибором, портретне центрування.
 */
(function () {
    'use strict';

    if (window.CardFusionLiteLoaded || !window.Lampa) return;
    window.CardFusionLiteLoaded = true;

    var PREFIX = 'cfl_';
    var activeEvent = null;
    var activeRoot = null;
    var activeMovie = null;
    var activeType = 'movie';
    var slideshowTimer = null;
    var trailerPlayer = null;
    var trailerNode = null;
    var audioButton = null;
    var audioEnabled = false;
    var currentActivity = null;
    var logoRequestId = 0;
    var pickerOpen = false;
    var settingsReady = false;

    var DEFAULTS = {
        layout: true,
        trailers: false,
        volume: 35,
        blur: '0',
        zoom: '33',
        slideshow: true,
        slideshow_quality: 'w1280',
        slideshow_interval: '8000',
        portrait_center: true,
        logos: true,
        logo_language: 'uk',
        logo_quality: 'original',
        logo_picker: true,
        logo_halo: true
    };

    function get(key) {
        return Lampa.Storage.get(PREFIX + key, DEFAULTS[key]);
    }

    function set(key, value) {
        Lampa.Storage.set(PREFIX + key, value);
        applyLive(key);
    }

    function enabled(value) {
        return value === true || value === 'true' || value === 1 || value === '1';
    }

    function mediaFromEvent(e) {
        var data = e && e.data || {};
        var movie = data.movie || data.tv || (e && e.object && e.object.card) || {};
        var type = (data.tv && !data.movie) ||
            (e && e.object && e.object.method === 'tv') ||
            (movie.name && !movie.title) ? 'tv' : 'movie';
        return { movie: movie, type: type };
    }

    function getRender(e) {
        try {
            if (e && e.object && e.object.activity && e.object.activity.render) {
                return $(e.object.activity.render());
            }
        } catch (err) {}
        return $();
    }

    function imageUrl(path, quality) {
        if (!path) return '';
        if (Lampa.TMDB && Lampa.TMDB.image) {
            return Lampa.TMDB.image('/t/p/' + quality + path);
        }
        return 'https://image.tmdb.org/t/p/' + quality + path;
    }

    function injectStyle() {
        if (document.getElementById('card-fusion-lite-css')) return;
        var style = document.createElement('style');
        style.id = 'card-fusion-lite-css';
        style.textContent = `
        .cfl-active{position:relative!important;isolation:isolate!important;background:transparent!important}
        .cfl-active .full-start-new,.cfl-active .full-start{position:relative!important;z-index:1!important;background:transparent!important}
        .cfl-bg-layer{
            position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;
            object-fit:cover!important;object-position:center 35%!important;z-index:-3!important;
            pointer-events:none!important;opacity:0;transition:opacity 1.1s ease!important;
            transform:translateZ(0);
        }
        .cfl-bg-layer.cfl-visible{opacity:1}
        .cfl-bg-shade{
            position:fixed!important;inset:0!important;z-index:-1!important;pointer-events:none!important;
            background:linear-gradient(90deg,rgba(0,0,0,.76),rgba(0,0,0,.32) 60%,rgba(0,0,0,.12)),
                       linear-gradient(0deg,#000 0%,transparent 75%);
        }
        .cfl-trailer{
            position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;
            z-index:-1!important;overflow:hidden!important;pointer-events:none!important;
        }
        .cfl-trailer iframe{
            position:absolute!important;left:50%!important;top:50%!important;
            width: max(100vw, 177.78vh)!important;height:max(100vh,56.25vw)!important;
            transform:translate(-50%,-50%) scale(var(--cfl-zoom,1.33))!important;
            filter:blur(var(--cfl-blur,0px))!important;border:0!important;
        }
        .cfl-audio-button{
            position:absolute;right:1.4em;bottom:1.4em;z-index:20;pointer-events:auto;
            display:flex;align-items:center;gap:.5em;padding:.65em .9em;border-radius:2em;
            color:#fff;background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.25);
            font-size:1em;cursor:pointer
        }
        .cfl-audio-button svg{width:1.25em;height:1.25em;fill:none;stroke:currentColor;stroke-width:2}
        .cfl-logo-image{display:block;max-width:min(42vw,650px);max-height:25vh;width:auto;height:auto;
            object-fit:contain;margin:0;filter:drop-shadow(0 3px 8px rgba(0,0,0,.8))}
        .cfl-logo-dark{filter:invert(1) drop-shadow(0 2px 5px rgba(0,0,0,.85))!important}
        .cfl-logo-picker{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8em;max-height:65vh;overflow:auto;padding:.6em}
        .cfl-logo-choice{min-width:0;min-height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;
            gap:.4em;padding:.6em;border:1px solid rgba(255,255,255,.14);border-radius:.5em;background:rgba(255,255,255,.05)}
        .cfl-logo-choice img{max-width:100%;width:100%;height:75px;object-fit:contain}
        .cfl-logo-choice small{opacity:.75}
        @media(max-width:700px){.cfl-logo-picker{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media (min-width:900px) and (orientation:landscape){
            .full-start-new.cfl-layout .full-start-new__body,
            .full-start.cfl-layout .full-start__body{
                display:flex!important;flex-direction:row!important;align-items:flex-end!important;
                min-height:78vh!important;height:auto!important;gap:3vw!important;padding:3vh 4vw 5vh!important;
                box-sizing:border-box!important
            }
            .full-start-new.cfl-layout .full-start-new__left,
            .full-start.cfl-layout .full-start__left{flex:0 0 25vw!important;max-width:25vw!important}
            .full-start-new.cfl-layout .full-start-new__right,
            .full-start.cfl-layout .full-start__right{
                flex:1 1 auto!important;min-width:0!important;max-width:70vw!important;
                display:flex!important;flex-direction:column!important;justify-content:flex-end!important
            }
            .full-start-new.cfl-layout .full-start-new__buttons,
            .full-start.cfl-layout .full-start__buttons{display:flex!important;flex-wrap:wrap!important;gap:.65em!important}
            .full-start-new.cfl-layout .full-start-new__title,
            .full-start.cfl-layout .full-start__title{max-width:100%!important}
            .full-start-new.cfl-layout .full-start-new__background,
            .full-start.cfl-layout .full-start__background{position:fixed!important}
        }
        .full-start-new.cfl-layout .full-start__background,
        .full-start.cfl-layout .full-start__background{
            position:fixed!important;left:0!important;top:0!important;width:100vw!important;height:100vh!important;
            object-fit:cover!important;z-index:-3!important;pointer-events:none!important
        }
        @media (orientation:portrait) and (max-width:899px){
            body.cfl-portrait-center .full-start-new__head,
            body.cfl-portrait-center .full-start__head,
            body.cfl-portrait-center .full-start-new__title,
            body.cfl-portrait-center .full-start__title,
            body.cfl-portrait-center .full-start-new__details,
            body.cfl-portrait-center .full-start__details,
            body.cfl-portrait-center .full-start-new__buttons,
            body.cfl-portrait-center .full-start__buttons{
                text-align:center!important;justify-content:center!important;margin-left:auto!important;margin-right:auto!important
            }
            body.cfl-portrait-center .full-start-new__title img,
            body.cfl-portrait-center .full-start__title img,
            body.cfl-portrait-center .cfl-logo-image{display:block!important;margin-left:auto!important;margin-right:auto!important}
            body.cfl-portrait-center .full-start-new__right,
            body.cfl-portrait-center .full-start__right{width:100%!important;max-width:100%!important}
            body.cfl-portrait-center .full-start-new__buttons .full-start__button,
            body.cfl-portrait-center .full-start__buttons .full-start__button{margin:.25em!important}
            body.cfl-portrait-center .full-start-new__details,
            body.cfl-portrait-center .full-start__details{display:flex!important;justify-content:center!important;flex-wrap:wrap!important}
        }
        .cfl-logo-picker .selector.focus,.cfl-logo-choice.focus{outline:2px solid #fff}
        `;
        document.head.appendChild(style);
    }

    function ensureBackgroundHost(root) {
        var host = root.find('.full-start-new,.full-start').first();
        if (!host.length) return;
        host.addClass('cfl-layout');
        root.addClass('cfl-active');
        document.body.classList.toggle('cfl-portrait-center',
            enabled(get('portrait_center')) && window.innerHeight > window.innerWidth);
        var bg = root.find('.full-start__background').first();
        if (bg.length) bg.css({ position:'fixed', left:0, top:0, width:'100vw', height:'100vh', objectFit:'cover' });
    }

    function stopSlideshow() {
        if (slideshowTimer) clearInterval(slideshowTimer);
        slideshowTimer = null;
    }

    function stopTrailer() {
        if (trailerPlayer) {
            try { trailerPlayer.destroy(); } catch (e) {}
        }
        trailerPlayer = null;
        if (trailerNode) trailerNode.remove();
        trailerNode = null;
        audioButton = null;
        audioEnabled = false;
    }

    function cleanup() {
        stopSlideshow();
        stopTrailer();
        if (activeRoot && activeRoot.length) {
            activeRoot.find('.cfl-bg-layer,.cfl-bg-shade').remove();
            activeRoot.find('.full-start-new,.full-start').removeClass('cfl-layout');
            activeRoot.removeClass('cfl-active');
        }
        activeRoot = null;
        activeEvent = null;
        activeMovie = null;
        document.body.classList.remove('cfl-portrait-center');
    }

    function getVideos(e, callback) {
        var data = e && e.data || {};
        var videos = data.videos || (data.movie && data.movie.videos) || (data.tv && data.tv.videos);
        if (videos && videos.results) return callback(videos.results);
        if (!activeMovie || !activeMovie.id || !Lampa.Api || !Lampa.Api.sources || !Lampa.Api.sources.tmdb) {
            callback([]);
            return;
        }
        Lampa.Api.sources.tmdb.get(activeType + '/' + activeMovie.id + '/videos', {}, function (response) {
            callback(response && response.results || []);
        });
    }

    function chooseTrailer(videos) {
        var lang = Lampa.Storage.get('tmdb_lang', 'uk') || 'uk';
        var usable = (videos || []).filter(function (v) {
            return v && v.site === 'YouTube' && v.key && (v.type === 'Trailer' || /trailer|трейлер/i.test(v.name || ''));
        });
        usable.sort(function (a, b) {
            function rank(v) {
                var n = (v.name || '').toLowerCase();
                return (v.official ? 10 : 0) + (v.iso_639_1 === lang ? 6 : 0) +
                    (v.iso_639_1 === 'en' ? 3 : 0) + (/official trailer|офіційний трейлер/i.test(n) ? 2 : 0);
            }
            return rank(b) - rank(a) || String(b.published_at || '').localeCompare(String(a.published_at || ''));
        });
        return usable[0] || null;
    }

    function applyVideoEffects() {
        if (!trailerNode) return;
        var blur = parseInt(get('blur'), 10) || 0;
        var zoom = parseInt(get('zoom'), 10) || 0;
        trailerNode.style.setProperty('--cfl-blur', blur + 'px');
        trailerNode.style.setProperty('--cfl-zoom', String(1 + zoom / 100));
    }

    function addAudioButton() {
        if (!trailerNode || audioButton) return;
        audioButton = document.createElement('button');
        audioButton.className = 'cfl-audio-button';
        audioButton.type = 'button';
        audioButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 9a5 5 0 0 1 0 6"/></svg><span>Увімкнути звук</span>';
        audioButton.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            if (!trailerPlayer) return;
            audioEnabled = !audioEnabled;
            try {
                if (audioEnabled) {
                    trailerPlayer.unMute();
                    trailerPlayer.setVolume(parseInt(get('volume'), 10) || 35);
                    audioButton.querySelector('span').textContent = 'Вимкнути звук';
                } else {
                    trailerPlayer.mute();
                    audioButton.querySelector('span').textContent = 'Увімкнути звук';
                }
            } catch (e) {}
        });
        trailerNode.appendChild(audioButton);
    }

    function playTrailer(video) {
        if (!video || !video.key || !enabled(get('trailers'))) return;
        stopSlideshow();
        stopTrailer();
        var host = activeRoot && activeRoot[0];
        if (!host) return;
        trailerNode = document.createElement('div');
        trailerNode.className = 'cfl-trailer';
        var frame = document.createElement('div');
        frame.id = 'cfl-youtube-' + Date.now();
        frame.style.width = '100%';
        frame.style.height = '100%';
        trailerNode.appendChild(frame);
        host.appendChild(trailerNode);
        applyVideoEffects();

        function createPlayer() {
            if (!window.YT || !window.YT.Player || !trailerNode) return;
            trailerPlayer = new window.YT.Player(frame.id, {
                videoId: video.key,
                playerVars: {
                    autoplay:1,controls:0,disablekb:1,fs:0,playsinline:1,rel:0,
                    modestbranding:1,iv_load_policy:3,loop:1,playlist:video.key
                },
                events: {
                    onReady:function (event) {
                        try {
                            event.target.mute();
                            event.target.setVolume(parseInt(get('volume'), 10) || 35);
                            event.target.playVideo();
                        } catch (e) {}
                        addAudioButton();
                    },
                    onStateChange:function (event) {
                        if (window.YT && event.data === window.YT.PlayerState.ENDED) {
                            try { event.target.seekTo(0, true); event.target.playVideo(); } catch (e) {}
                        }
                    }
                }
            });
        }

        if (window.YT && window.YT.Player) createPlayer();
        else {
            var old = document.getElementById('cfl-yt-api');
            if (old) {
                var wait = setInterval(function () {
                    if (window.YT && window.YT.Player) { clearInterval(wait); createPlayer(); }
                    if (!trailerNode) clearInterval(wait);
                }, 150);
            } else {
                window.onYouTubeIframeAPIReady = function () {
                    createPlayer();
                };
                var script = document.createElement('script');
                script.id = 'cfl-yt-api';
                script.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(script);
            }
        }
    }

    function startSlideshow(e) {
        if (!enabled(get('slideshow')) || enabled(get('trailers')) || !activeMovie || !activeMovie.id) return;
        stopSlideshow();
        var lang = Lampa.Storage.get('tmdb_lang', 'uk') || 'uk';
        var query = activeType + '/' + activeMovie.id + '/images?include_image_language=' + lang + ',null,en';
        if (!Lampa.Api || !Lampa.Api.sources || !Lampa.Api.sources.tmdb) return;
        Lampa.Api.sources.tmdb.get(query, {}, function (data) {
            if (!activeRoot || !activeRoot.length || !data || !data.backdrops || data.backdrops.length < 2) return;
            var items = data.backdrops.slice().sort(function (a, b) {
                var rank = function (x) {
                    return (x.iso_639_1 == null ? 5 : x.iso_639_1 === lang ? 3 : x.iso_639_1 === 'en' ? 2 : 0) + (x.vote_average || 0) / 100;
                };
                return rank(b) - rank(a);
            }).slice(0, 20);
            var quality = get('slideshow_quality') || 'w1280';
            var index = 0;
            function next() {
                if (!activeRoot || !activeRoot.length || !document.body.contains(activeRoot[0])) {
                    stopSlideshow();
                    return;
                }
                index = (index + 1) % items.length;
                var url = imageUrl(items[index].file_path, quality);
                var img = new Image();
                img.onload = function () {
                    if (!activeRoot || !activeRoot.length) return;
                    var old = activeRoot.find('.cfl-bg-layer').last();
                    var fresh = $('<img class="cfl-bg-layer" alt="">').attr('src', url);
                    var shade = activeRoot.find('.cfl-bg-shade').first();
                    if (shade.length) shade.before(fresh); else activeRoot.append(fresh);
                    requestAnimationFrame(function () {
                        fresh.addClass('cfl-visible');
                        old.removeClass('cfl-visible');
                        setTimeout(function () { old.remove(); }, 1200);
                    });
                };
                img.src = url;
            }
            var firstPath = items[0].file_path;
            var existing = activeRoot.find('.full-start__background').first();
            if (existing.length && firstPath) {
                existing.attr('src', imageUrl(firstPath, quality));
            }
            slideshowTimer = setInterval(next, parseInt(get('slideshow_interval'), 10) || 8000);
        });
    }

    function validLogo(path) {
        return typeof path === 'string' && /^\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|svg)$/i.test(path);
    }

    function logoKey(movie, type) {
        return 'cfl_logo_' + type + '_' + movie.id;
    }

    function restoreTitle(title, original) {
        if (title && title.length) {
            title.empty().text(original || '');
            title.removeData('cfl-logo');
        }
    }

    function autoLogo(movie, type, callback) {
        var language = get('logo_language');
        if (!language) language = Lampa.Storage.get('tmdb_lang', 'uk') || 'uk';
        var key = logoKey(movie, type);
        var manual = Lampa.Storage.get(key, '');
        if (manual === 'none') return callback(null);
        if (validLogo(manual)) return callback(manual);
        var shared = Lampa.Storage.get('cfl_auto_logo_' + type + '_' + movie.id + '_' + language, '');
        if (validLogo(shared)) return callback(shared);
        if (!Lampa.Api || !Lampa.Api.sources || !Lampa.Api.sources.tmdb) return callback(null);
        Lampa.Api.sources.tmdb.get(type + '/' + movie.id + '/images?include_image_language=' + language + ',en,null', {}, function (data) {
            var logos = data && data.logos || [];
            logos.sort(function (a, b) {
                function score(x) {
                    return (x.iso_639_1 === language ? 10 : x.iso_639_1 === 'en' ? 6 : x.iso_639_1 == null ? 3 : 0) + (x.vote_average || 0) / 10;
                }
                return score(b) - score(a);
            });
            var found = logos.find(function (x) { return validLogo(x.file_path); });
            if (found) {
                Lampa.Storage.set('cfl_auto_logo_' + type + '_' + movie.id + '_' + language, found.file_path);
                callback(found.file_path);
            } else callback(null);
        });
    }

    function applyLogo(path, requestId) {
        if (requestId !== logoRequestId || !activeRoot || !activeRoot.length) return;
        var title = activeRoot.find('.full-start-new__title,.full-start__title').first();
        if (!title.length) return;
        var original = title.data('cfl-original-title') || title.text().trim();
        title.data('cfl-original-title', original);
        if (!path) {
            restoreTitle(title, original);
            return;
        }
        var quality = get('logo_quality') || 'original';
        var url = imageUrl(path.replace(/\.svg$/i, '.png'), quality);
        var img = new Image();
        img.className = 'cfl-logo-image';
        img.alt = original;
        img.onload = function () {
            if (requestId !== logoRequestId || !activeRoot || !activeRoot.length) return;
            try {
                var canvas = document.createElement('canvas');
                canvas.width = Math.min(img.naturalWidth, 64);
                canvas.height = Math.min(img.naturalHeight, 64);
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                var total = 0, count = 0;
                for (var i = 0; i < pixels.length; i += 4) {
                    if (pixels[i + 3] > 40) {
                        total += .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
                        count++;
                    }
                }
                if (enabled(get('logo_halo')) && count && total / count < 75) img.classList.add('cfl-logo-dark');
            } catch (e) {
                if (enabled(get('logo_halo'))) img.style.filter = 'drop-shadow(0 2px 7px #000) brightness(1.15)';
            }
            title.empty().append(img);
        };
        img.onerror = function () { restoreTitle(title, original); };
        img.src = url;
    }

    function loadLogo(movie, type) {
        if (!enabled(get('logos')) || !movie || !movie.id) return;
        var titleNode = activeRoot && activeRoot.find('.full-start-new__title,.full-start__title').first();
        if (titleNode && titleNode.length && !titleNode.data('cfl-original-title')) {
            titleNode.data('cfl-original-title', titleNode.text().trim());
        }
        var id = ++logoRequestId;
        autoLogo(movie, type, function (path) { applyLogo(path, id); });
    }

    function openLogoPicker(movie, type) {
        if (pickerOpen || !movie || !movie.id || !Lampa.Modal) return;
        pickerOpen = true;
        var panel = $('<div class="cfl-logo-picker"></div>');
        var loading = $('<div style="padding:1em">Завантаження логотипів TMDB…</div>');
        panel.append(loading);
        var key = logoKey(movie, type);
        var closed = false;
        function close(path, save) {
            if (closed) return;
            closed = true;
            pickerOpen = false;
            if (save) Lampa.Storage.set(key, path);
            Lampa.Modal.close();
            if (save) loadLogo(movie, type);
        }
        function addChoice(path, label) {
            var cell = $('<div class="cfl-logo-choice selector"></div>');
            if (path) {
                $('<img>').attr('src', imageUrl(path.replace(/\.svg$/i, '.png'), 'w500')).appendTo(cell);
            } else {
                $('<div style="font-size:2em">↺</div>').appendTo(cell);
            }
            $('<small></small>').text(label).appendTo(cell);
            cell.on('hover:enter click', function (ev) {
                if (ev) { ev.preventDefault(); ev.stopPropagation(); }
                close(path, true);
            });
            panel.append(cell);
        }
        Lampa.Modal.open({ title:'Вибір логотипа TMDB', html:panel, size:'large', onBack:function () { close('', false); } });
        var url = Lampa.TMDB.api(type + '/' + movie.id + '/images?api_key=' + Lampa.TMDB.key());
        $.getJSON(url, function (data) {
            if (closed) return;
            loading.remove();
            addChoice('', 'Автоматичний вибір');
            (data && data.logos || []).sort(function (a, b) {
                function p(x) { return x.iso_639_1 === 'uk' ? 0 : x.iso_639_1 === 'en' ? 1 : x.iso_639_1 == null ? 2 : 3; }
                return p(a) - p(b) || (b.vote_average || 0) - (a.vote_average || 0);
            }).forEach(function (item) {
                if (validLogo(item.file_path)) addChoice(item.file_path, (item.iso_639_1 || 'без мови').toUpperCase());
            });
            if (!data || !data.logos || !data.logos.length) panel.append('<div>На TMDB немає доступних логотипів.</div>');
        }).fail(function () {
            if (!closed) loading.text('Не вдалося отримати логотипи TMDB. Перевір мережу.');
        });
    }

    function addPickerButton() {
        if (!enabled(get('logo_picker')) || !activeRoot || !activeMovie) return;
        var bar = activeRoot.find('.full-start-new__buttons,.full-start__buttons').first();
        if (!bar.length || bar.find('.cfl-logo-picker-button').length) return;
        var button = $('<div class="full-start__button selector cfl-logo-picker-button"><span>Логотип</span></div>');
        button.on('hover:enter click', function (ev) {
            if (ev) { ev.preventDefault(); ev.stopPropagation(); }
            openLogoPicker(activeMovie, activeType);
        });
        bar.append(button);
    }

    function setupCard(e) {
        cleanup();
        activeEvent = e;
        var media = mediaFromEvent(e);
        activeMovie = media.movie;
        activeType = media.type;
        activeRoot = getRender(e);
        if (!activeRoot.length) return;
        currentActivity = e.object && e.object.activity;
        injectStyle();
        ensureBackgroundHost(activeRoot);
        if (enabled(get('logos'))) loadLogo(activeMovie, activeType);
        addPickerButton();

        if (enabled(get('trailers'))) {
            getVideos(e, function (videos) {
                if (!activeRoot || !activeRoot.length || !enabled(get('trailers'))) return;
                var chosen = chooseTrailer(videos);
                if (chosen) playTrailer(chosen);
                else if (enabled(get('slideshow'))) startSlideshow(e);
            });
        } else {
            startSlideshow(e);
        }
    }

    function applyLive(key) {
        if (!activeRoot || !activeRoot.length) return;
        if (key === 'layout' || key === 'portrait_center') {
            ensureBackgroundHost(activeRoot);
        }
        if (key === 'blur' || key === 'zoom') applyVideoEffects();
        if (key === 'volume' && trailerPlayer) {
            try { trailerPlayer.setVolume(parseInt(get('volume'), 10) || 35); } catch (e) {}
        }
        if (key === 'trailers') {
            if (enabled(get('trailers'))) {
                getVideos(activeEvent, function (videos) {
                    var chosen = chooseTrailer(videos);
                    if (chosen) playTrailer(chosen);
                });
            } else {
                stopTrailer();
                if (enabled(get('slideshow'))) startSlideshow(activeEvent);
            }
        }
        if (key === 'slideshow' || key === 'slideshow_quality' || key === 'slideshow_interval') {
            if (enabled(get('slideshow')) && !enabled(get('trailers'))) startSlideshow(activeEvent);
            else stopSlideshow();
        }
        if (key === 'logos' || key === 'logo_language' || key === 'logo_quality' || key === 'logo_halo') {
            if (enabled(get('logos'))) loadLogo(activeMovie, activeType);
            else {
                var title = activeRoot.find('.full-start-new__title,.full-start__title').first();
                restoreTitle(title, title.data('cfl-original-title'));
            }
        }
        if (key === 'logo_picker') {
            activeRoot.find('.cfl-logo-picker-button').remove();
            addPickerButton();
        }
    }

    function addSettings() {
        if (settingsReady || !Lampa.SettingsApi) return;
        settingsReady = true;
        Lampa.SettingsApi.addComponent({
            component:'card_fusion_lite',
            name:'Card Fusion Lite',
            icon:''
        });

        function param(key, name, type, values, def, description) {
            var p = { name:PREFIX + key, type:type, default:def };
            if (values) p.values = values;
            Lampa.SettingsApi.addParam({
                component:'card_fusion_lite',
                param:p,
                field:{ name:name, description:description || '' },
                onChange:function (value) { set(key, value); }
            });
        }

        param('layout','Альтернативне компонування','trigger',null,true,'Горизонтальний адаптивний макет на широких екранах');
        param('trailers','Фонові трейлери YouTube','trigger',null,false,'Автоматичне відтворення офіційного трейлера без звуку');
        param('volume','Гучність трейлера','select',{'10':'10%','20':'20%','30':'30%','35':'35%','40':'40%','50':'50%','60':'60%','70':'70%','80':'80%','90':'90%','100':'100%'},35);
        param('blur','Розмиття відео (Blur)','select',{'0':'Вимкнено','1':'1 px','2':'2 px','3':'3 px','4':'4 px','5':'5 px','8':'8 px','10':'10 px'},'0');
        param('zoom','Масштабування відео (Zoom)','select',{'0':'Вимкнено','20':'20%','25':'25%','33':'33%','40':'40%','45':'45%','50':'50%'},'33');
        param('slideshow','Слайдшоу TMDB','trigger',null,true,'Плавна зміна фонових зображень; не працює одночасно з відеофоном');
        param('slideshow_quality','Якість фонових зображень','select',{w780:'W780',w1280:'W1280',original:'Original'},'w1280');
        param('slideshow_interval','Інтервал слайдшоу','select',{'5000':'5 секунд','8000':'8 секунд','10000':'10 секунд','15000':'15 секунд'},'8000');
        param('portrait_center','Центрування портретного режиму','trigger',null,true,'Центрування назви, інформації та кнопок на вертикальних екранах');
        param('logos','Графічні логотипи TMDB','trigger',null,true,'Автоматична заміна текстової назви прозорим логотипом');
        param('logo_language','Мова логотипа','select',{'uk':'Українська','en':'English','':'Мова Lampa'},'uk');
        param('logo_quality','Якість логотипа','select',{w300:'W300',w500:'W500',w780:'W780',original:'Original'},'original');
        param('logo_picker','Кнопка ручного вибору логотипа','trigger',null,true,'Додає кнопку вибору логотипа TMDB у картку');
        param('logo_halo','Автоінвертування темних логотипів','trigger',null,true,'Аналізує яскравість логотипа та інвертує темні зображення для темного фону');
    }

    function init() {
        injectStyle();
        addSettings();
        Lampa.Listener.follow('full', function (e) {
            if (e && (e.type === 'complite' || e.type === 'complete')) setupCard(e);
        });
        Lampa.Listener.follow('activity', function (e) {
            if (!e) return;
            if (e.type === 'destroy' && currentActivity && e.object && e.object.activity === currentActivity) cleanup();
        });
        window.addEventListener('resize', function () {
            if (activeRoot && activeRoot.length) ensureBackgroundHost(activeRoot);
        });
        window.addEventListener('orientationchange', function () {
            setTimeout(function () {
                if (activeRoot && activeRoot.length) ensureBackgroundHost(activeRoot);
            }, 250);
        });
        if (Lampa.Storage && Lampa.Storage.listener) {
            Lampa.Storage.listener.follow('change', function (e) {
                if (!e || typeof e.name !== 'string' || e.name.indexOf(PREFIX) !== 0) return;
                var key = e.name.substring(PREFIX.length);
                applyLive(key);
            });
        }
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e && e.type === 'ready') init();
    });
})();
