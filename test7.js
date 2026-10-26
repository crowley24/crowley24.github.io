(function () {
    'use strict';

    /*
     * TV INTERFACE — PREMIUM STREAMING
     *
     * Lampa / Android TV
     *
     * Збережено:
     * - Логотипи TMDB та студій
     * - Рейтинги TMDB і CUB
     * - Метадані картки
     * - Анімації інтерфейсу
     * - Фоновий трейлер YouTube
     * - Слайдшоу TMDB
     * - Налаштування Lampa
     *
     * PREMIUM TRAILER:
     * - Відео у правому верхньому куті
     * - Компактний кінематографічний формат
     * - Плавне розчинення країв відео
     * - Збереження фонового зображення TMDB
     * - Логотип і назва залишаються видимими
     * - Плавна поява трейлера
     * - Контрольоване масштабування
     * - Резервне слайдшоу
     *
     * Стабільність:
     * - Ізоляція CSS
     * - Резервна текстова назва
     * - Очищення таймерів
     * - Очищення YouTube-плеєра
     * - Захист від застарілих відповідей
     */

    var detailsCache = {};
    var currentActiveId = null;
    var sessionCounter = 0;
    var activeSession = null;
    var started = false;

    var settings_list = [
        { id: 'tv_interface_trailer_bg', default: false },
        { id: 'tv_interface_ui_anim', default: true },
        { id: 'tv_interface_ui_anim_effect', default: 'smooth_zoom' },
        { id: 'tv_interface_badge_anim', default: 'pulse' },
        { id: 'tv_interface_logo_quality', default: 'original' },
        { id: 'tv_interface_show_tagline', default: true },
        { id: 'tv_interface_blocks_gap', default: '8px' },
        { id: 'tv_interface_ratings_size', default: '0.45em' },
        { id: 'tv_interface_studios', default: true },
        { id: 'tv_interface_slideshow', default: true },
        { id: 'tv_interface_slideshow_duration', default: 8000 },
        { id: 'tv_interface_slideshow_quality', default: 'w1280' },
        { id: 'tv_interface_trailer_zoom', default: '0' }
    ];

    settings_list.forEach(function (opt) {
        if (Lampa.Storage.get(opt.id, 'unset') === 'unset') {
            Lampa.Storage.set(opt.id, opt.default);
        }
    });

    var ratingIcons = {
        tmdb: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Tmdb.new.logo.svg',
        cub: 'https://raw.githubusercontent.com/yumata/lampa/9381985ad4371d2a7d5eb5ca8e3daf0f32669eb7/img/logo-icon.svg'
    };

    /*
     * СЕСІЇ КАРТКИ
     */

    function isCurrentSession(session) {
        return !!(
            session &&
            activeSession === session &&
            !session.destroyed &&
            currentActiveId === session.movieId
        );
    }

    function clearSessionTimeout(session, key) {
        if (!session || session[key] === null || session[key] === undefined) {
            return;
        }

        clearTimeout(session[key]);
        session[key] = null;
    }

    function clearSessionInterval(session, key) {
        if (!session || session[key] === null || session[key] === undefined) {
            return;
        }

        clearInterval(session[key]);
        session[key] = null;
    }

    function clearSessionTimers(session) {
        if (!session) return;

        clearSessionTimeout(session, 'slideshowTimeout');
        clearSessionTimeout(session, 'fallbackTimeout');

        clearSessionInterval(session, 'slideshowInterval');
        clearSessionInterval(session, 'youtubePoll');
    }

    function stopTrailer(session) {
        if (!session) return;

        clearSessionInterval(session, 'youtubePoll');

        if (session.trailerListener) {
            try {
                Lampa.Listener.remove('activity', session.trailerListener);
            } catch (e) {}

            session.trailerListener = null;
        }

        var player = session.player;
        session.player = null;

        if (player) {
            try {
                player.stopVideo();
            } catch (e) {}

            try {
                player.destroy();
            } catch (e) {}
        }

        if (session.trailerWrap) {
            session.trailerWrap.remove();
            session.trailerWrap = null;
        }

        $('body').removeClass('has-active-trailer');

        if (session.$render) {
            session.$render
                .find('.full-start__background')
                .css({
                    opacity: '',
                    visibility: ''
                });
        }
    }

    function cleanupSession(session) {
        if (!session || session.destroyed) return;

        session.destroyed = true;

        clearSessionTimers(session);
        stopTrailer(session);

        if (session.activityListener) {
            try {
                Lampa.Listener.remove(
                    'activity',
                    session.activityListener
                );
            } catch (e) {}

            session.activityListener = null;
        }

        if (activeSession === session) {
            activeSession = null;
        }

        if (currentActiveId === session.movieId) {
            currentActiveId = null;
        }

        $('body').removeClass('has-active-trailer');
    }

    function createSession(movie, $render, activity) {
        if (activeSession) {
            cleanupSession(activeSession);
        }

        var session = {
            id: ++sessionCounter,
            movieId: movie.id,
            movieKey: getMediaType(movie) + ':' + movie.id,
            $render: $render,
            activity: activity,
            destroyed: false,
            player: null,
            trailerWrap: null,
            trailerListener: null,
            activityListener: null,
            slideshowInterval: null,
            slideshowTimeout: null,
            fallbackTimeout: null,
            youtubePoll: null,
            trailerFallbackStarted: false,
            slideshowStarted: false
        };

        activeSession = session;
        currentActiveId = movie.id;

        return session;
    }

    function getMediaType(movie) {
        if (
            movie &&
            (
                movie.name ||
                movie.first_air_date ||
                movie.media_type === 'tv'
            )
        ) {
            return 'tv';
        }

        return 'movie';
    }

    /*
     * ВИЗНАЧЕННЯ ТЕМНОГО ЛОГОТИПА
     */

    function isImageDark(imgSrc, callback) {
        var img = new Image();

        img.crossOrigin = 'Anonymous';

        img.onload = function () {
            try {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');

                canvas.width = 40;
                canvas.height = 40;

                ctx.drawImage(img, 0, 0, 40, 40);

                var data = ctx.getImageData(0, 0, 40, 40).data;

                var totalBrightness = 0;
                var hasColor = false;
                var count = 0;

                for (var i = 0; i < data.length; i += 4) {
                    var alpha = data[i + 3];

                    if (alpha > 50) {
                        var r = data[i];
                        var g = data[i + 1];
                        var b = data[i + 2];

                        var brightness =
                            (r * 299 + g * 587 + b * 114) / 1000;

                        totalBrightness += brightness;
                        count++;

                        if (
                            Math.max(r, g, b) -
                            Math.min(r, g, b) > 30
                        ) {
                            hasColor = true;
                        }
                    }
                }

                var avgBrightness = count
                    ? totalBrightness / count
                    : 255;

                callback(avgBrightness < 110 && !hasColor);
            } catch (e) {
                callback(false);
            }
        };

        img.onerror = function () {
            callback(false);
        };

        img.src = imgSrc;
    }

    /*
     * CSS — PREMIUM STREAMING
     */

    function applyStyles() {
        var style = document.getElementById('tv-interface-styles');

        if (!style) {
            style = document.createElement('style');
            style.id = 'tv-interface-styles';
            document.head.appendChild(style);
        }

        var isUIAnim = Lampa.Storage.get('tv_interface_ui_anim');

        var animEffect = Lampa.Storage.get(
            'tv_interface_ui_anim_effect',
            'smooth_zoom'
        );

        var badgeAnim = Lampa.Storage.get(
            'tv_interface_badge_anim',
            'pulse'
        );

        var rSize = Lampa.Storage.get(
            'tv_interface_ratings_size',
            '0.45em'
        );

        var showTagline = Lampa.Storage.get(
            'tv_interface_show_tagline'
        );

        var blocksGap = Lampa.Storage.get(
            'tv_interface_blocks_gap',
            '8px'
        );

        var allowedAnimations = [
            'smooth_zoom',
            'cine_slide',
            'luxury_fade',
            'modern_shift'
        ];

        if (allowedAnimations.indexOf(animEffect) === -1) {
            animEffect = 'smooth_zoom';
        }

        var allowedBadgeAnimations = [
            'none',
            'pulse',
            'breathe',
            'spin_slow',
            'float'
        ];

        if (allowedBadgeAnimations.indexOf(badgeAnim) === -1) {
            badgeAnim = 'pulse';
        }

        var css = '';

        /*
         * АНІМАЦІЇ ІНТЕРФЕЙСУ
         */

        css += '@keyframes anim_smooth_zoom {';
        css += '0% { opacity:0; transform:translate3d(0,10px,0) scale(.94); }';
        css += '100% { opacity:1; transform:translate3d(0,0,0) scale(1); }';
        css += '} ';

        css += '@keyframes anim_cine_slide {';
        css += '0% { opacity:0; transform:translate3d(0,25px,0); }';
        css += '100% { opacity:1; transform:translate3d(0,0,0); }';
        css += '} ';

        css += '@keyframes anim_luxury_fade {';
        css += '0% { opacity:0; transform:translate3d(0,12px,0) scale(1.03); }';
        css += '100% { opacity:1; transform:translate3d(0,0,0) scale(1); }';
        css += '} ';

        css += '@keyframes anim_modern_shift {';
        css += '0% { opacity:0; transform:translate3d(-18px,0,0); }';
        css += '100% { opacity:1; transform:translate3d(0,0,0); }';
        css += '} ';

        css += '@keyframes wave_cascade {';
        css += '0% { opacity:0; transform:translate3d(0,10px,0) scale(.9); }';
        css += '100% { opacity:1; transform:translate3d(0,0,0) scale(1); }';
        css += '} ';

        css += '@keyframes badge_anim_pulse {';
        css += '0%,100% { transform:scale(1); }';
        css += '50% { transform:scale(1.08); }';
        css += '} ';

        css += '@keyframes badge_anim_breathe {';
        css += '0%,100% { transform:scale(1); opacity:.85; }';
        css += '50% { transform:scale(1.04); opacity:1; }';
        css += '} ';

        css += '@keyframes badge_anim_spin_slow {';
        css += '0%,100% { transform:rotate(0deg); }';
        css += '25% { transform:rotate(2deg); }';
        css += '75% { transform:rotate(-2deg); }';
        css += '} ';

        css += '@keyframes badge_anim_float {';
        css += '0%,100% { transform:translateY(0); }';
        css += '50% { transform:translateY(-3px); }';
        css += '} ';

        /*
         * ПРИХОВУВАННЯ ЕЛЕМЕНТІВ КАРТКИ
         */

        css += '.full-start-new .full-start__reactions,';
        css += '.full-start-new [class*="reactions"] {';
        css += 'display:none !important; } ';

        css += '.full-start-new .full-start-new__details,';
        css += '.full-start-new .full-start__info,';
        css += '.full-start-new .full-start__age,';
        css += '.full-start-new .full-start-new__age,';
        css += '.full-start-new .full-start__status,';
        css += '.full-start-new .full-start-new__status,';
        css += '.full-start-new [class*="rating-count"] {';
        css += 'display:none !important; } ';

        css += '.full-start-new .rate--tmdb,';
        css += '.full-start-new .rate--imdb,';
        css += '.full-start-new .rate--kp,';
        css += '.full-start-new .full-start__rates {';
        css += 'display:none !important; } ';

        css += '.background { background:#000 !important; } ';

        /*
         * ОСНОВА КАРТКИ
         */

        css += '.full-start-new {';
        css += 'position:relative !important;';
        css += 'isolation:isolate;';
        css += 'will-change:auto;';
        css += '} ';

        css += '.full-start-new__poster {';
        css += 'position:relative !important;';
        css += 'background:#000;';
        css += 'z-index:1;';
        css += '} ';

        css += '.full-start-new__poster img {';
        css += 'filter:none !important;';
        css += 'width:100% !important;';
        css += 'height:auto !important;';
        css += 'object-fit:contain !important;';
        css += 'mask-image:linear-gradient(to bottom,#000 0%,#000 75%,transparent 100%) !important;';
        css += '-webkit-mask-image:linear-gradient(to bottom,#000 0%,#000 75%,transparent 100%) !important;';
        css += '} ';

        css += '.full-start-new__right {';
        css += 'background:none !important;';
        css += 'z-index:3 !important;';
        css += 'display:flex !important;';
        css += 'flex-direction:column !important;';
        css += 'align-items:flex-start !important;';
        css += 'padding:20px !important;';
        css += 'gap:' + blocksGap + ' !important;';
        css += 'position:relative !important;';
        css += '} ';

        /*
         * АНІМАЦІЯ БЛОКІВ
         */

        var chosenAnimName = 'anim_' + animEffect;
        var animTiming = 'cubic-bezier(0.16,1,0.3,1)';

        function getAnimRule(delay) {
            if (!isUIAnim) {
                return 'opacity:1 !important;';
            }

            return (
                'animation:' + chosenAnimName +
                ' .45s ' + animTiming + ' ' +
                delay + ' both;' +
                'will-change:transform,opacity;'
            );
        }

        /*
         * ЛОГОТИП СТУДІЇ
         */

        css += '.studio-header-brand {';
        css += getAnimRule('0s');
        css += 'order:1;';
        css += 'width:100%;';
        css += 'display:flex;';
        css += 'justify-content:flex-start;';
        css += 'align-items:center;';
        css += 'margin-bottom:-2px !important;';
        css += 'position:relative;';
        css += 'z-index:4;';
        css += '} ';

        css += '.studio-header-brand img {';
        css += 'height:22px !important;';
        css += 'width:auto;';
        css += 'max-width:130px;';
        css += 'object-fit:contain;';
        css += 'filter:drop-shadow(0 2px 8px rgba(0,0,0,.9));';
        css += 'opacity:.95;';
        css += 'transition:opacity .3s ease;';
        css += '} ';

        css += '.studio-header-brand img.is-dark-logo {';
        css += 'filter:brightness(0) invert(1) drop-shadow(0 2px 8px rgba(0,0,0,.9)) !important;';
        css += '} ';

        /*
         * НАЗВА ФІЛЬМУ
         */

        css += '.full-start-new__title {';
        css += 'min-height:60px;';
        css += 'position:relative;';
        css += 'font-size:0 !important;';
        css += 'color:transparent !important;';
        css += getAnimRule('.08s');
        css += 'width:100% !important;';
        css += 'display:flex !important;';
        css += 'justify-content:flex-start !important;';
        css += 'align-items:center !important;';
        css += 'margin:0 !important;';
        css += 'order:2;';
        css += 'overflow:visible !important;';
        css += 'z-index:4;';
        css += '} ';

        css += '.full-start-new__title img {';
        css += 'height:auto !important;';
        css += 'max-height:100px !important;';
        css += 'width:auto !important;';
        css += 'max-width:45vw !important;';
        css += 'object-fit:contain !important;';
        css += 'filter:drop-shadow(0 4px 16px rgba(0,0,0,.85));';
        css += 'margin:0 !important;';
        css += 'opacity:0;';
        css += 'transition:opacity .45s ease-in-out;';
        css += '} ';

        css += '.full-start-new__title img.loaded {';
        css += 'opacity:1;';
        css += '} ';

        css += '.full-start-new__title.tvi-title-text {';
        css += 'font-size:2em !important;';
        css += 'color:#fff !important;';
        css += 'font-weight:700 !important;';
        css += 'min-height:0 !important;';
        css += 'height:auto !important;';
        css += 'overflow-wrap:anywhere !important;';
        css += 'line-height:1.15;';
        css += 'text-shadow:0 3px 18px rgba(0,0,0,.9);';
        css += '} ';

        css += '.full-start-new__title.tvi-title-text img {';
        css += 'display:none !important;';
        css += '} ';

        /*
         * РЕЙТИНГИ
         */

        css += '.quality-row-inline {';
        css += 'position:absolute;';
        css += 'top:30px;';
        css += 'right:24px;';
        css += 'z-index:5;';
        css += 'display:flex;';
        css += 'flex-direction:column;';
        css += 'align-items:flex-end;';
        css += 'gap:4px;';
        css += 'pointer-events:none;';
        css += '} ';

        css += '.quality-row-inline .plugin-rating-item {';
        css += 'display:flex;';
        css += 'align-items:center;';
        css += 'gap:6px;';
        css += 'font-weight:700;';
        css += 'color:#fff;';
        css += 'font-size:1.05em;';
        css += 'padding:2px 0;';
        css += 'text-shadow:0 2px 8px rgba(0,0,0,.9);';
        css += '} ';

        css += '.quality-row-inline .plugin-rating-item img {';
        css += 'height:1.1em;';
        css += 'width:auto;';
        css += 'filter:drop-shadow(0 1px 3px rgba(0,0,0,.6));';
        css += '} ';

        /*
         * СЛОГАН
         */

        css += '.full-start-new__tagline {';
        css += getAnimRule('.15s');
        css += 'display:' + (showTagline ? 'block' : 'none') + ' !important;';
        css += 'font-style:italic !important;';
        css += 'font-size:1em !important;';
        css += 'margin:0 !important;';
        css += 'color:rgba(255,255,255,.82) !important;';
        css += 'text-shadow:0 2px 12px rgba(0,0,0,.95);';
        css += 'text-align:left !important;';
        css += 'order:3;';
        css += 'position:relative;';
        css += 'z-index:4;';
        css += '} ';

        /*
         * МЕТАДАНІ
         */

        css += '.plugin-meta-row {';
        css += getAnimRule('.22s');
        css += 'display:flex;';
        css += 'justify-content:flex-start;';
        css += 'align-items:center;';
        css += 'flex-wrap:wrap;';
        css += 'gap:10px;';
        css += 'margin:0 !important;';
        css += 'font-size:calc(' + rSize + ' * 2.8);';
        css += 'width:100%;';
        css += 'order:4;';
        css += 'color:rgba(255,255,255,.88);';
        css += 'font-family:"Inter",-apple-system,system-ui,sans-serif;';
        css += 'text-shadow:0 2px 10px rgba(0,0,0,.95);';
        css += 'position:relative;';
        css += 'z-index:4;';
        css += '} ';

        css += '.info-text-item {';
        css += 'opacity:.95;';
        css += 'font-weight:500;';
        css += 'font-size:.9em;';
        css += 'white-space:nowrap;';
        css += '} ';

        css += '.info-separator {';
        css += 'opacity:.45;';
        css += 'font-size:.85em;';
        css += 'margin:0 -2px;';
        css += '} ';

        /*
         * АНІМАЦІЯ БЕЙДЖІВ
         */

        var loopAnimName = badgeAnim !== 'none'
            ? 'badge_anim_' + badgeAnim
            : '';

        var loopDuration = badgeAnim === 'spin_slow'
            ? '4s'
            : badgeAnim === 'breathe'
                ? '3s'
                : '2.5s';

        css += '.wave-item {';
        css += 'transform-origin:center center;';
        css += 'filter:drop-shadow(0 2px 4px rgba(0,0,0,.3));';

        if (badgeAnim !== 'none') {
            css += 'animation:' + loopAnimName + ' ' +
                loopDuration + ' ease-in-out infinite;';
        } else {
            css += 'opacity:1 !important;';
        }

        css += '} ';

        /*
         * КНОПКИ
         */

        css += '.card-tweaks__buttons {';
        css += getAnimRule('.3s');
        css += 'width:100% !important;';
        css += 'display:flex !important;';
        css += 'justify-content:flex-start !important;';
        css += 'align-items:center !important;';
        css += 'gap:15px !important;';
        css += 'margin-top:15px !important;';
        css += 'order:5;';
        css += 'position:relative;';
        css += 'z-index:4;';
        css += '} ';

        /*
         * ФОНОВЕ ЗОБРАЖЕННЯ TMDB
         *
         * ВАЖЛИВО:
         * Під час запуску трейлера фон не ховається.
         * Він залишається під відео, а через прозорі
         * краї маски видно оригінальне зображення.
         */

        css += '.full-start__background {';
        css += 'will-change:opacity;';
        css += 'opacity:1;';
        css += 'visibility:visible;';
        css += 'transition:opacity .85s ease-in-out,visibility .85s ease-in-out;';
        css += '} ';

        css += 'body.has-active-trailer .full-start__background {';
        css += 'opacity:1 !important;';
        css += 'visibility:visible !important;';
        css += '} ';

        /*
         * TRAILER — ПРАВИЙ ВЕРХНІЙ КУТ
         *
         * Компактне вікно 42vw × 42vh.
         * Не повинно перекривати ліву область
         * з логотипом і назвою фільму.
         *
         * Краї розчиняються CSS-маскою:
         * - зліва;
         * - справа;
         * - зверху;
         * - знизу.
         *
         * Фон TMDB просвічує крізь краї відео.
         */

        css += '.tvi-trailer {';
        css += 'position:fixed;';
        css += 'top:4vh;';
        css += 'right:3vw;';
        css += 'left:auto;';
        css += 'bottom:auto;';
        css += 'width:42vw;';
        css += 'height:42vh;';
        css += 'z-index:2;';
        css += 'overflow:hidden;';
        css += 'background:transparent;';
        css += 'opacity:0;';
        css += 'visibility:hidden;';
        css += 'pointer-events:none;';
        css += 'contain:paint;';
        css += 'border-radius:14px;';
        css += 'border:0;';
        css += 'box-shadow:0 12px 36px rgba(0,0,0,.12);';
        css += 'transition:opacity .85s cubic-bezier(.22,1,.36,1),visibility .85s ease;';
        css += 'isolation:isolate;';
        css += '-webkit-mask-image:radial-gradient(ellipse 78% 78% at 55% 46%,#000 52%,rgba(0,0,0,.96) 63%,rgba(0,0,0,.72) 74%,rgba(0,0,0,.28) 88%,transparent 100%);';
        css += 'mask-image:radial-gradient(ellipse 78% 78% at 55% 46%,#000 52%,rgba(0,0,0,.96) 63%,rgba(0,0,0,.72) 74%,rgba(0,0,0,.28) 88%,transparent 100%);';
        css += '} ';

        css += '.tvi-trailer.display {';
        css += 'opacity:1;';
        css += 'visibility:visible;';
        css += '} ';

        /*
         * ОБЛАСТЬ YOUTUBE
         *
         * Невеликий запас по краях потрібен
         * для приховування чорних смуг.
         */

        css += '.tvi-trailer__yt {';
        css += 'position:absolute;';
        css += 'top:-3%;';
        css += 'left:-3%;';
        css += 'width:106%;';
        css += 'height:106%;';
        css += 'overflow:hidden;';
        css += 'background:transparent;';
        css += 'z-index:0;';
        css += 'display:block;';
        css += 'border:0;';
        css += 'pointer-events:none;';
        css += '} ';

        css += '.tvi-trailer__iframe {';
        css += 'position:absolute;';
        css += 'inset:0;';
        css += 'width:100%;';
        css += 'height:100%;';
        css += 'overflow:hidden;';
        css += 'background:transparent;';
        css += 'pointer-events:none;';
        css += '} ';

        css += '.tvi-trailer__yt iframe {';
        css += 'position:absolute !important;';
        css += 'top:0 !important;';
        css += 'left:0 !important;';
        css += 'width:100% !important;';
        css += 'height:100% !important;';
        css += 'min-width:100% !important;';
        css += 'min-height:100% !important;';
        css += 'border:0 !important;';
        css += 'pointer-events:none !important;';
        css += 'will-change:transform,opacity;';
        css += 'transform:scale(1.04) translateZ(0);';
        css += 'transform-origin:center center;';
        css += 'filter:contrast(1.04) saturate(1.04) brightness(.96);';
        css += 'opacity:1;';
        css += '} ';

        /*
         * М'ЯКИЙ ГРАДІЄНТ ЗЛІВА
         *
         * Додатково розчиняє ліву межу відео,
         * щоб вона не виглядала як пряма лінія
         * поруч із назвою та фоном картки.
         */

        css += '.tvi-trailer::before {';
        css += 'content:"";';
        css += 'position:absolute;';
        css += 'inset:0;';
        css += 'z-index:2;';
        css += 'pointer-events:none;';
        css += 'background:linear-gradient(';
        css += '90deg,';
        css += 'rgba(0,0,0,.46) 0%,';
        css += 'rgba(0,0,0,.28) 10%,';
        css += 'rgba(0,0,0,.12) 23%,';
        css += 'rgba(0,0,0,.035) 38%,';
        css += 'rgba(0,0,0,0) 55%';
        css += ');';
        css += '} ';

        /*
         * М'ЯКЕ ЗАТЕМНЕННЯ ЗНИЗУ ТА ЗВЕРХУ
         *
         * Не створює суцільної чорної рамки.
         * Градієнти накладаються лише поверх
         * відео, а маска розчиняє зовнішні краї.
         */

        css += '.tvi-trailer::after {';
        css += 'content:"";';
        css += 'position:absolute;';
        css += 'inset:0;';
        css += 'z-index:3;';
        css += 'pointer-events:none;';
        css += 'background:';
        css += 'linear-gradient(';
        css += '0deg,';
        css += 'rgba(0,0,0,.32) 0%,';
        css += 'rgba(0,0,0,.16) 12%,';
        css += 'rgba(0,0,0,.045) 27%,';
        css += 'rgba(0,0,0,0) 43%';
        css += '),';
        css += 'linear-gradient(';
        css += '180deg,';
        css += 'rgba(0,0,0,.16) 0%,';
        css += 'rgba(0,0,0,.06) 12%,';
        css += 'rgba(0,0,0,0) 26%';
        css += ');';
        css += '} ';

        /*
         * АДАПТАЦІЯ ДЛЯ МЕНШИХ ЕКРАНІВ
         */

        css += '@media (max-width:900px) {';
        css += '.tvi-trailer {';
        css += 'top:4vh;';
        css += 'right:2vw;';
        css += 'width:44vw;';
        css += 'height:38vh;';
        css += '}';
        css += '} ';

        /*
         * ДОДАТКОВА СУМІСНІСТЬ
         */

        css += '.tvi-trailer__overlay {';
        css += 'display:none !important;';
        css += '} ';

        /*
         * ЗМЕНШЕННЯ РУХУ
         */

        css += '@media (prefers-reduced-motion: reduce) {';
        css += '.tvi-trailer,';
        css += '.tvi-trailer__yt iframe,';
        css += '.full-start__background {';
        css += 'transition-duration:.2s !important;';
        css += '}';
        css += '} ';

        style.textContent = css;
    }

    /*
     * РЕЙТИНГИ
     */

    function getRatingColor(val) {
        var n = parseFloat(val);

        if (n >= 7.5) return '#2ecc71';
        if (n >= 6) return '#feca57';
        if (n > 0) return '#ff4d4d';

        return '#fff';
    }

    function formatTime(mins) {
        if (!mins) return '';

        var h = Math.floor(mins / 60);
        var m = mins % 60;

        return (h > 0 ? h + 'г ' : '') + m + 'хв';
    }

    function getCubRating(e) {
        if (
            !e.data ||
            !e.data.reactions ||
            !e.data.reactions.result
        ) {
            return null;
        }

        var reactionCoef = {
            fire: 10,
            nice: 7.5,
            think: 5,
            bore: 2.5,
            shit: 0
        };

        var sum = 0;
        var cnt = 0;

        e.data.reactions.result.forEach(function (r) {
            if (r.counter) {
                sum += r.counter * (
                    reactionCoef[r.type] !== undefined
                        ? reactionCoef[r.type]
                        : 0
                );

                cnt += r.counter;
            }
        });

        if (cnt >= 5) {
            var isTv = e.object && e.object.method === 'tv';
            var avg = isTv ? 7.4 : 6.5;
            var m = isTv ? 50 : 150;

            return ((avg * m + sum) / (m + cnt)).toFixed(1);
        }

        return null;
    }

    /*
     * МЕТАДАНІ КАРТКИ
     */

    function renderMeta(container, e) {
        if (!container || !container.length) return;

        container.find('.plugin-meta-row').remove();

        var sep = '<span class="info-separator">•</span>';
        var $metaRow = $('<div class="plugin-meta-row"></div>');

        var movie = e.data.movie || {};

        var year = (
            movie.release_date ||
            movie.first_air_date ||
            ''
        ).substring(0, 4);

        if (year) {
            $metaRow.append(
                $('<div class="info-text-item"></div>').text(year)
            );
        }

        var country = '';

        if (
            movie.production_countries &&
            movie.production_countries.length
        ) {
            country =
                movie.production_countries[0].name ||
                movie.production_countries[0].iso_3166_1 ||
                '';
        } else if (
            movie.origin_country &&
            movie.origin_country.length
        ) {
            country = movie.origin_country[0];
        }

        if (country) {
            if ($metaRow.children().length) {
                $metaRow.append(sep);
            }

            $metaRow.append(
                $('<div class="info-text-item"></div>').text(country)
            );
        }

        var runtime = movie.runtime || (
            movie.episode_run_time &&
            movie.episode_run_time.length
                ? movie.episode_run_time[0]
                : 0
        );

        if (runtime) {
            if ($metaRow.children().length) {
                $metaRow.append(sep);
            }

            $metaRow.append(
                $('<div class="info-text-item"></div>').text(
                    formatTime(runtime)
                )
            );
        }

        if (movie.genres && movie.genres.length) {
            if ($metaRow.children().length) {
                $metaRow.append(sep);
            }

            var genres = movie.genres
                .slice(0, 2)
                .map(function (g) {
                    return g.name;
                })
                .join(', ');

            $metaRow.append(
                $('<div class="info-text-item"></div>').text(genres)
            );
        }

        container.append($metaRow);
    }

    /*
     * ЛОГОТИПИ ТА ДЕТАЛІ TMDB
     */

    function applyMovieDetailsData(data, movie, $render, session) {
        if (session && !isCurrentSession(session)) {
            return;
        }

        var $titleContainer = $render.find(
            '.full-start-new__title'
        );

        var fallbackTitle =
            movie.title ||
            movie.name ||
            movie.original_title ||
            movie.original_name ||
            '';

        if (
            !data.images ||
            !data.images.logos ||
            !data.images.logos.length
        ) {
            $titleContainer
                .empty()
                .addClass('tvi-title-text')
                .text(fallbackTitle);
        } else {
            var lang = Lampa.Storage.get('language') || 'uk';

            var logo =
                data.images.logos.filter(function (l) {
                    return l.iso_639_1 === lang;
                })[0] ||
                data.images.logos.filter(function (l) {
                    return l.iso_639_1 === 'en';
                })[0] ||
                data.images.logos[0];

            if (logo && logo.file_path) {
                var logoUrl = Lampa.TMDB.image(
                    '/t/p/original' +
                    logo.file_path.replace(/\.svg$/i, '.png')
                );

                var tempImg = new Image();

                tempImg.onload = function () {
                    if (session && !isCurrentSession(session)) {
                        return;
                    }

                    $titleContainer
                        .removeClass('tvi-title-text')
                        .empty();

                    var $img = $('<img alt="">');

                    $img.on('error', function () {
                        if (session && !isCurrentSession(session)) {
                            return;
                        }

                        $titleContainer
                            .empty()
                            .addClass('tvi-title-text')
                            .text(fallbackTitle);
                    });

                    $img.attr('src', logoUrl);
                    $titleContainer.append($img);

                    setTimeout(function () {
                        if (session && !isCurrentSession(session)) {
                            return;
                        }

                        $titleContainer.find('img').addClass('loaded');
                    }, 20);
                };

                tempImg.onerror = function () {
                    if (session && !isCurrentSession(session)) {
                        return;
                    }

                    $titleContainer
                        .empty()
                        .addClass('tvi-title-text')
                        .text(fallbackTitle);
                };

                tempImg.src = logoUrl;
            } else {
                $titleContainer
                    .empty()
                    .addClass('tvi-title-text')
                    .text(fallbackTitle);
            }
        }

        /*
         * ЛОГОТИП СТУДІЇ
         */

        $render.find('.studio-header-brand').remove();

        if (Lampa.Storage.get('tv_interface_studios')) {
            var studio = null;

            if (data.networks && data.networks.length) {
                studio = data.networks.find(function (n) {
                    return n.logo_path;
                });
            }

            if (
                !studio &&
                data.production_companies &&
                data.production_companies.length
            ) {
                studio = data.production_companies.find(function (c) {
                    return c.logo_path;
                });
            }

            if (studio && studio.logo_path) {
                var studioLogoUrl = Lampa.TMDB.image(
                    '/t/p/w200' + studio.logo_path
                );

                var $brand = $('<div class="studio-header-brand"></div>');
                var $img = $('<img alt="">');

                $img.attr('alt', studio.name || '');
                $img.attr('src', studioLogoUrl);

                $img.on('error', function () {
                    $brand.remove();
                });

                $brand.append($img);

                var $title = $render.find(
                    '.full-start-new__title'
                );

                $title.before($brand);

                isImageDark(studioLogoUrl, function (isDark) {
                    if (session && !isCurrentSession(session)) {
                        return;
                    }

                    if (isDark) {
                        $img.addClass('is-dark-logo');
                    }
                });
            }
        }
    }

    function loadMovieDetails(movie, $render, session) {
        if (!movie || !movie.id) return;

        var movieId = movie.id;
        var mediaType = getMediaType(movie);
        var cacheKey = mediaType + ':' + movieId;

        if (detailsCache[cacheKey]) {
            applyMovieDetailsData(
                detailsCache[cacheKey],
                movie,
                $render,
                session
            );

            return;
        }

        var url =
            'https://api.themoviedb.org/3/' +
            mediaType + '/' + movieId +
            '?api_key=' + Lampa.TMDB.key() +
            '&append_to_response=images' +
            '&include_image_language=uk,en,null';

        $.ajax({
            url: url,
            type: 'GET',
            dataType: 'json',

            success: function (data) {
                if (session && !isCurrentSession(session)) {
                    return;
                }

                detailsCache[cacheKey] = data;

                applyMovieDetailsData(
                    data,
                    movie,
                    $render,
                    session
                );
            },

            error: function () {
                if (session && !isCurrentSession(session)) {
                    return;
                }

                var $title = $render.find(
                    '.full-start-new__title'
                );

                if (!$title.find('img').length) {
                    $title
                        .addClass('tvi-title-text')
                        .text(
                            movie.title ||
                            movie.name ||
                            movie.original_title ||
                            movie.original_name ||
                            ''
                        );
                }
            }
        });
    }

    /*
     * ПОШУК ТРЕЙЛЕРА
     */

    function pickTrailer(data) {
        var vids = data.videos ||
            (data.movie && data.movie.videos) ||
            (data.tv && data.tv.videos);

        if (!vids || !vids.results || !vids.results.length) {
            return null;
        }

        var items = vids.results
            .filter(function (v) {
                return !!(
                    v.key &&
                    (
                        !v.site ||
                        v.site.toLowerCase() === 'youtube'
                    )
                );
            })
            .map(function (v) {
                return {
                    id: v.key,
                    code: v.iso_639_1,
                    type: v.type || '',
                    official: !!v.official,
                    time: new Date(v.published_at || 0).getTime(),
                    name_orig: (v.name || '').toLowerCase()
                };
            })
            .sort(function (a, b) {
                return b.time - a.time;
            });

        var lang = Lampa.Storage.field('tmdb_lang') || 'uk';

        var myLang = items.filter(function (n) {
            return n.code === lang;
        });

        var enLang = items.filter(function (n) {
            return n.code === 'en';
        });

        var all = myLang.concat(
            enLang.filter(function (n) {
                return myLang.indexOf(n) === -1;
            })
        );

        if (!all.length) {
            all = items;
        }

        if (!all.length) return null;

        function isTrailer(v) {
            return (
                v.type.toLowerCase() === 'trailer' ||
                v.name_orig.indexOf('trailer') !== -1 ||
                v.name_orig.indexOf('трейлер') !== -1
            );
        }

        var official = all.find(function (v) {
            return v.official &&
                isTrailer(v) &&
                (
                    v.name_orig.indexOf('official trailer') !== -1 ||
                    v.name_orig.indexOf('офіційний трейлер') !== -1 ||
                    v.name_orig.indexOf('официальный трейлер') !== -1
                );
        });

        if (official) return official;

        var trailer = all.find(function (v) {
            return v.official && isTrailer(v);
        });

        if (trailer) return trailer;

        trailer = all.find(isTrailer);

        return trailer || all[0];
    }

    /*
     * ЗАВАНТАЖЕННЯ YOUTUBE IFRAME API
     */

    function loadYouTubeAPI(callback) {
        if (window.YT && window.YT.Player) {
            callback();
            return;
        }

        if (!window.tvi_yt_callbacks) {
            window.tvi_yt_callbacks = [];
        }

        window.tvi_yt_callbacks.push(callback);

        if (window.tvi_yt_loading) return;

        window.tvi_yt_loading = true;

        var previousReady = window.onYouTubeIframeAPIReady;

        window.onYouTubeIframeAPIReady = function () {
            if (typeof previousReady === 'function') {
                try {
                    previousReady();
                } catch (e) {}
            }

            window.tvi_yt_loading = false;

            var callbacks = window.tvi_yt_callbacks || [];
            window.tvi_yt_callbacks = [];

            callbacks.forEach(function (fn) {
                try {
                    fn();
                } catch (e) {}
            });
        };

        Lampa.Utils.putScript(
            ['https://www.youtube.com/iframe_api'],
            function () {}
        );
    }

    /*
     * ФОНОВИЙ ТРЕЙЛЕР — ПРАВИЙ ВЕРХНІЙ КУТ
     */

    function startTrailer(session, trailer) {
        if (
            !isCurrentSession(session) ||
            !trailer ||
            !trailer.id
        ) {
            return;
        }

        var $render = session.$render;

        var $wrap = $(
            '<div class="tvi-trailer">' +
                '<div class="tvi-trailer__yt">' +
                    '<div class="tvi-trailer__iframe"></div>' +
                '</div>' +
            '</div>'
        );

        session.trailerWrap = $wrap;

        $render.find('.activity__body').prepend($wrap);

        function fallbackToSlideshow() {
            if (!isCurrentSession(session)) return;
            if (session.trailerFallbackStarted) return;

            session.trailerFallbackStarted = true;

            stopTrailer(session);

            if (Lampa.Storage.get('tv_interface_slideshow')) {
                startSlideshow(session);
            }
        }

        function initYT() {
            if (!isCurrentSession(session)) return;

            if (!window.YT || !window.YT.Player) {
                fallbackToSlideshow();
                return;
            }

            try {
                session.player = new window.YT.Player(
                    $wrap.find('.tvi-trailer__iframe')[0],
                    {
                        height: Math.round(window.innerHeight * 0.42),
                        width: Math.round(window.innerWidth * 0.42),
                        videoId: trailer.id,

                        playerVars: {
                            controls: 0,
                            autoplay: 1,
                            mute: 1,
                            disablekb: 1,
                            fs: 0,
                            playsinline: 1,
                            rel: 0,
                            modestbranding: 1,
                            iv_load_policy: 3,
                            origin: window.location.origin
                        },

                        events: {
                            onReady: function (ev) {
                                if (!isCurrentSession(session)) {
                                    try {
                                        ev.target.destroy();
                                    } catch (e) {}

                                    return;
                                }

                                var iframe = $(ev.target.getIframe());

                                var zoom = Lampa.Storage.get(
                                    'tv_interface_trailer_zoom'
                                ) || '0';

                                var zoomValue = parseInt(zoom, 10);

                                if (isNaN(zoomValue)) {
                                    zoomValue = 0;
                                }

                                zoomValue = Math.max(
                                    0,
                                    Math.min(50, zoomValue)
                                );

                                /*
                                 * Масштабування iframe.
                                 * Відео залишається в межах
                                 * правого верхнього вікна.
                                 */

                                iframe.css({
                                    transform:
                                        'scale(' +
                                        (1.04 + zoomValue / 100) +
                                        ') translateZ(0)',
                                    transformOrigin: 'center center'
                                });

                                try {
                                    ev.target.mute();
                                    ev.target.playVideo();
                                } catch (e) {}
                            },

                            onStateChange: function (st) {
                                if (!isCurrentSession(session)) return;

                                if (
                                    st.data ===
                                    window.YT.PlayerState.PLAYING
                                ) {
                                    $('body').addClass(
                                        'has-active-trailer'
                                    );

                                    $wrap.addClass('display');
                                }

                                if (
                                    st.data ===
                                    window.YT.PlayerState.ENDED
                                ) {
                                    try {
                                        st.target.seekTo(0, true);
                                        st.target.playVideo();
                                    } catch (e) {}
                                }

                                if (
                                    st.data ===
                                    window.YT.PlayerState.BUFFERING
                                ) {
                                    try {
                                        st.target.setPlaybackQuality(
                                            'hd1080'
                                        );
                                    } catch (e) {}
                                }
                            },

                            onError: function () {
                                fallbackToSlideshow();
                            }
                        }
                    }
                );
            } catch (e) {
                fallbackToSlideshow();
            }
        }

        /*
         * Якщо API не завантажився, не залишаємо
         * картку з порожнім фоном.
         */

        session.fallbackTimeout = setTimeout(function () {
            if (!isCurrentSession(session)) return;

            if (
                !session.player ||
                !window.YT ||
                !window.YT.Player
            ) {
                fallbackToSlideshow();
            }
        }, 12000);

        loadYouTubeAPI(function () {
            if (!isCurrentSession(session)) return;

            clearSessionTimeout(session, 'fallbackTimeout');
            initYT();
        });
    }

    /*
     * СЛАЙДШОУ TMDB
     */

    function startSlideshow(session) {
        if (!isCurrentSession(session)) return;

        if (!Lampa.Storage.get('tv_interface_slideshow')) {
            return;
        }

        if (session.slideshowStarted) return;

        session.slideshowStarted = true;

        var movieId = session.movieId;
        var mediaType = session.movieKey.indexOf('tv:') === 0
            ? 'tv'
            : 'movie';

        var currentLang =
            Lampa.Storage.field('tmdb_lang') || 'uk';

        var quality =
            Lampa.Storage.get('tv_interface_slideshow_quality') ||
            'w1280';

        var duration = parseInt(
            Lampa.Storage.get('tv_interface_slideshow_duration'),
            10
        ) || 8000;

        if (
            ['w780', 'w1280', 'original'].indexOf(quality) === -1
        ) {
            quality = 'w1280';
        }

        Lampa.Api.sources.tmdb.get(
            mediaType + '/' + movieId +
            '/images?include_image_language=' +
            currentLang + ',xx,null,en',
            {},

            function (imagesData) {
                if (!isCurrentSession(session)) return;

                if (
                    !imagesData ||
                    !imagesData.backdrops ||
                    !imagesData.backdrops.length
                ) {
                    return;
                }

                var langB = [];
                var cleanB = [];
                var otherB = [];

                imagesData.backdrops.forEach(function (b) {
                    var lang = b.iso_639_1;

                    if (lang === currentLang) {
                        langB.push(b);
                    } else if (
                        !lang ||
                        lang === 'xx' ||
                        lang === 'null'
                    ) {
                        cleanB.push(b);
                    } else {
                        otherB.push(b);
                    }
                });

                var finalB = cleanB.slice();

                if (finalB.length < 3) {
                    finalB = finalB.concat(langB);
                }

                if (finalB.length < 3) {
                    otherB.sort(function (a, b) {
                        return (b.vote_average || 0) -
                            (a.vote_average || 0);
                    });

                    finalB = finalB.concat(otherB);
                }

                var seen = {};

                finalB = finalB.filter(function (b) {
                    if (!b.file_path || seen[b.file_path]) {
                        return false;
                    }

                    seen[b.file_path] = true;
                    return true;
                }).slice(0, 15);

                if (!finalB.length) return;

                var idx = 0;

                function changeBackdrop() {
                    if (!isCurrentSession(session)) {
                        clearSessionInterval(
                            session,
                            'slideshowInterval'
                        );

                        return;
                    }

                    if (
                        !Lampa.Storage.get(
                            'tv_interface_slideshow'
                        )
                    ) {
                        clearSessionInterval(
                            session,
                            'slideshowInterval'
                        );

                        return;
                    }

                    if (finalB.length < 2) return;

                    idx = (idx + 1) % finalB.length;

                    var url = Lampa.TMDB.image(
                        't/p/' + quality + finalB[idx].file_path
                    );

                    var $bg = session.$render
                        .find('.full-start__background')
                        .first();

                    if (!$bg.length) return;

                    var img = new Image();

                    img.onload = function () {
                        if (!isCurrentSession(session)) return;

                        clearSessionTimeout(
                            session,
                            'slideshowTimeout'
                        );

                        $bg.css('opacity', '0');

                        session.slideshowTimeout = setTimeout(
                            function () {
                                session.slideshowTimeout = null;

                                if (!isCurrentSession(session)) return;

                                $bg.attr('src', url);
                                $bg.css('opacity', '1');
                            },
                            400
                        );
                    };

                    img.onerror = function () {};
                    img.src = url;
                }

                if (finalB.length > 1) {
                    session.slideshowInterval = setInterval(
                        changeBackdrop,
                        duration
                    );
                }
            }
        );
    }

    /*
     * РЕАКЦІЯ НА ЗАКРИТТЯ АКТИВНОСТІ
     */

    function watchActivity(session) {
        session.activityListener = function (a) {
            if (!a || a.type !== 'destroy') return;

            if (
                session.activity &&
                a.object &&
                a.object.activity === session.activity
            ) {
                cleanupSession(session);
            }
        };

        Lampa.Listener.follow(
            'activity',
            session.activityListener
        );
    }

    /*
     * ОСНОВНИЙ ОБРОБНИК КАРТКИ
     */

    function init() {
        Lampa.Listener.follow('full', function (e) {
            if (
                e.type === 'destroy' ||
                e.type === 'onBeforeDestroy'
            ) {
                if (activeSession) {
                    cleanupSession(activeSession);
                } else {
                    currentActiveId = null;

                    $('body').removeClass(
                        'has-active-trailer'
                    );
                }

                return;
            }

            if (
                e.type !== 'complite' &&
                e.type !== 'complete'
            ) {
                return;
            }

            if (!e.data || !e.data.movie || !e.object) {
                return;
            }

            applyStyles();

            var movie = e.data.movie;
            var $render = e.object.activity.render();

            if (!movie || movie.id === undefined) return;

            var session = createSession(
                movie,
                $render,
                e.object.activity
            );

            watchActivity(session);

            /*
             * РЕЗЕРВНА ТЕКСТОВА НАЗВА
             */

            var $title = $render.find(
                '.full-start-new__title'
            );

            $title
                .empty()
                .addClass('tvi-title-text')
                .text(
                    movie.title ||
                    movie.name ||
                    movie.original_title ||
                    movie.original_name ||
                    ''
                );

            if (window.lampa_settings) {
                window.lampa_settings.blur_poster = false;
            }

            renderMeta(
                $render.find('.full-start-new__right'),
                e
            );

            loadMovieDetails(movie, $render, session);

            /*
             * ТРЕЙЛЕР АБО СЛАЙДШОУ
             */

            var isTrailerBg = Lampa.Storage.get(
                'tv_interface_trailer_bg'
            );

            var trailer = isTrailerBg
                ? pickTrailer(e.data)
                : null;

            if (
                trailer &&
                Lampa.Manifest &&
                Lampa.Manifest.app_digital >= 220
            ) {
                startTrailer(session, trailer);
            } else {
                startSlideshow(session);
            }

            /*
             * ПЕРЕМІЩЕННЯ КНОПОК
             */

            var $body = $render.find(
                '.full-start-new__body'
            );

            var $buttons = $render.find(
                '.full-start-new__buttons'
            );

            if (
                $body.length &&
                $buttons.length &&
                !$render.find('.card-tweaks__buttons').length
            ) {
                var $tweaksButtons = $(
                    '<div class="card-tweaks__buttons"></div>'
                );

                $buttons.detach().appendTo($tweaksButtons);
                $tweaksButtons.insertAfter($body);
            }

            /*
             * РЯДОК РЕЙТИНГІВ
             */

            var $mainContainer = $render.find(
                '.full-start-new'
            );

            if (!$mainContainer.length) {
                $mainContainer = $render;
            }

            $mainContainer.find(
                '.quality-row-inline'
            ).remove();

            var $qRow = $(
                '<div class="quality-row-inline"></div>'
            );

            $mainContainer.append($qRow);

            var tmdb = parseFloat(
                movie.vote_average || 0
            );

            if (tmdb > 0) {
                var $tmdbItem = $(
                    '<div class="plugin-rating-item wave-item">' +
                        '<img alt="TMDB"> ' +
                        '<span></span>' +
                    '</div>'
                );

                $tmdbItem.find('img').attr(
                    'src',
                    ratingIcons.tmdb
                );

                $tmdbItem.find('span')
                    .text(tmdb.toFixed(1))
                    .css('color', getRatingColor(tmdb));

                $qRow.append($tmdbItem);
            }

            var cub = getCubRating(e);

            if (cub) {
                var $cubItem = $(
                    '<div class="plugin-rating-item wave-item">' +
                        '<img alt="CUB"> ' +
                        '<span></span>' +
                    '</div>'
                );

                $cubItem.find('img').attr(
                    'src',
                    ratingIcons.cub
                );

                $cubItem.find('span')
                    .text(cub)
                    .css('color', getRatingColor(cub));

                $qRow.append($cubItem);
            }
        });
    }

    /*
     * НАЛАШТУВАННЯ
     */

    function setupSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'tv_interface',
            name: 'Інтерфейс картки (TV)',

            icon:
                '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" fill="white"/>' +
                '</svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_trailer_bg',
                type: 'trigger',
                default: false
            },
            field: {
                name: 'Фоновий відеоряд (Трейлер)',
                description: 'Увімкнути трейлер YouTube на фоні замість слайдшоу'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_ui_anim',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Плавна анімація появи елементів'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_ui_anim_effect',
                type: 'select',
                values: {
                    smooth_zoom: 'Apple Smooth Zoom (Рекомендовано)',
                    cine_slide: 'Cinematic Slide Up',
                    luxury_fade: 'Luxury Depth Fade',
                    modern_shift: 'Modern Clean Shift'
                },
                default: 'smooth_zoom'
            },
            field: {
                name: 'Стиль анімації появи'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_badge_anim',
                type: 'select',
                values: {
                    none: 'Без анімації',
                    pulse: 'Пульсація',
                    breathe: 'Дихання',
                    spin_slow: 'Гойдання',
                    float: 'Підстрибування'
                },
                default: 'pulse'
            },
            field: {
                name: 'Анімація бейджів'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_show_tagline',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Відображати слоган'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_blocks_gap',
                type: 'select',
                values: {
                    '8px': 'Компактний',
                    '12px': 'Стандартний',
                    '18px': 'Просторий',
                    '24px': 'Панорамний'
                },
                default: '8px'
            },
            field: {
                name: 'Відступи між блоками'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_ratings_size',
                type: 'select',
                values: {
                    '0.4em': 'Дрібний',
                    '0.45em': 'Звичайний',
                    '0.5em': 'Великий',
                    '0.55em': 'Дуже великий'
                },
                default: '0.45em'
            },
            field: {
                name: 'Розмір шрифту інфо-блоків'
            },
            onChange: applyStyles
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_studios',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Показувати логотип студії'
            },
            onChange: function () {
                applyStyles();

                if (activeSession && !activeSession.destroyed) {
                    loadMovieDetails(
                        activeSession.activity &&
                        activeSession.activity.data &&
                        activeSession.activity.data.movie
                            ? activeSession.activity.data.movie
                            : null,
                        activeSession.$render,
                        activeSession
                    );
                }
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_slideshow',
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Слайдшоу фонових зображень',
                description: 'Плавна зміна backdrops з TMDB на фоні картки'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_slideshow_duration',
                type: 'select',
                values: {
                    5000: '5 секунд',
                    8000: '8 секунд',
                    10000: '10 секунд',
                    15000: '15 секунд'
                },
                default: 8000
            },
            field: {
                name: 'Інтервал зміни зображень'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_slideshow_quality',
                type: 'select',
                values: {
                    w780: 'Стандартна (W780)',
                    w1280: 'Висока (W1280)',
                    original: 'Оригінал'
                },
                default: 'w1280'
            },
            field: {
                name: 'Якість зображень слайдшоу'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'tv_interface',
            param: {
                name: 'tv_interface_trailer_zoom',
                type: 'select',
                values: {
                    '0': 'Вимкнено (0%)',
                    '25': '25%',
                    '33': '33%',
                    '40': '40%',
                    '45': '45%',
                    '50': '50%'
                },
                default: '0'
            },
            field: {
                name: 'Масштабування відео',
                description: 'Збільшення відео для приховування чорних смуг'
            }
        });
    }

    /*
     * ЗАПУСК
     */

    function startPlugin() {
        if (started) return;

        started = true;

        applyStyles();
        setupSettings();
        init();
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }
})();
