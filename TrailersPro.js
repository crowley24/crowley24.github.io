
(function () {
    'use strict';

    /*
     * КіноТрейлери Premium 2.0
     * Hybrid Edition — Android TV + Mobile
     *
     * Mobile:
     * - Постери зверху
     * - Відео по центру, 16:9
     * - Назва, логотип і метадані під відео
     * - Короткий опис до 2 рядків
     * - Розмитий фон
     * - Запас місця для нижнього меню Lampa
     *
     * Android TV:
     * - Повноекранний плеєр
     * - Інформація внизу ліворуч
     * - Постери праворуч
     * - Навігація пультом
     *
     * yt.html не змінюється.
     */

    if (!window.Lampa || !window.$ || window.trailers_feed_plugin) return;
    window.trailers_feed_plugin = true;

    var tmdb = Lampa.Api.sources.tmdb;

    var TYPES = {
        movie: 'Фільми',
        tv: 'Серіали'
    };

    var AHEAD = 3;
    var META_AHEAD = 10;
    var LIVE_AHEAD = 3;
    var PREP_DELAY = 1500;
    var LOAD_TIMEOUT = 15000;

    var BASE = (
        (document.currentScript && document.currentScript.src) ||
        'https://smokingairlinestg.github.io/lampa-trailers/feed.js'
    ).split('?')[0].replace(/[^/]*$/, '');

    var bridgeMode = false;

    /*
     * Не вважаємо кожен Android-пристрій телефоном.
     * Android TV часто має в userAgent слово Android без Mobile.
     */
    var isMobile = !!(
        (Lampa.Platform && Lampa.Platform.is('mobile')) ||
        /Android.*Mobile|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );

    var css = '' +

        /* Загальна оболонка */
        '.tfeed{' +
            'position:fixed;' +
            'inset:0;' +
            'width:100%;' +
            'height:100%;' +
            'background:#000;' +
            'overflow:hidden;' +
            'z-index:9999;' +
            'color:#fff;' +
            'font-family:inherit;' +
            'isolation:isolate;' +
        '}' +

        'body.tfeed--on .head{' +
            'display:none!important;' +
        '}' +

        /* Фонове зображення */
        '.tfeed__bg{' +
            'position:absolute;' +
            'inset:-4%;' +
            'width:108%;' +
            'height:108%;' +
            'background-color:#090909;' +
            'background-size:cover;' +
            'background-position:center;' +
            'filter:blur(24px) brightness(.34);' +
            'transform:scale(1.04);' +
            'transition:background-image .35s ease,opacity .35s ease;' +
            'z-index:0;' +
        '}' +

        '.tfeed:after{' +
            'content:"";' +
            'position:absolute;' +
            'inset:0;' +
            'pointer-events:none;' +
            'background:linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.28));' +
            'z-index:1;' +
        '}' +

        /* Відео */
        '.tfeed__video{' +
            'position:absolute;' +
            'inset:0;' +
            'width:100%;' +
            'height:100%;' +
            'overflow:hidden;' +
            'z-index:2;' +
        '}' +

        '.tfeed__yt{' +
            'position:absolute;' +
            'inset:0;' +
            'width:100%;' +
            'height:100%;' +
            'overflow:hidden;' +
            'opacity:0;' +
            'transition:opacity .35s ease;' +
            'background:#000;' +
        '}' +

        '.tfeed__yt--on{' +
            'opacity:1;' +
        '}' +

        /*
         * На телевізорі залишаємо збільшений iframe,
         * як у вихідному плагіні.
         */
        '.tfeed__yt iframe{' +
            'position:absolute;' +
            'left:0;' +
            'top:-300px;' +
            'width:100%;' +
            'height:calc(100% + 600px);' +
            'border:0;' +
            'pointer-events:none;' +
        '}' +

        '.tfeed__frame{' +
            'position:absolute;' +
            'left:0;' +
            'top:0;' +
            'width:100%;' +
            'height:100%;' +
            'border:0;' +
            'pointer-events:none;' +
        '}' +

        /* Верхня кнопка фільтрів */
        '.tfeed__chip{' +
            'position:absolute;' +
            'left:3em;' +
            'top:2em;' +
            'z-index:20;' +
            'padding:.55em 1em;' +
            'border:1px solid rgba(255,255,255,.24);' +
            'border-radius:2em;' +
            'background:rgba(10,10,10,.7);' +
            'color:#fff;' +
            'font-size:1.05em;' +
            'cursor:pointer;' +
            'backdrop-filter:blur(12px);' +
            '-webkit-backdrop-filter:blur(12px);' +
        '}' +

        /* Постери — телевізійний режим */
        '.tfeed__side{' +
            'position:absolute;' +
            'right:2.5em;' +
            'top:50%;' +
            'transform:translateY(-50%);' +
            'z-index:10;' +
            'display:flex;' +
            'flex-direction:column;' +
            'align-items:center;' +
            'gap:.5em;' +
            'max-height:80%;' +
            'overflow:hidden;' +
        '}' +

        '.tfeed__poster{' +
            'flex-shrink:0;' +
            'width:5.5em;' +
            'height:8.2em;' +
            'border-radius:.55em;' +
            'background-color:#222;' +
            'background-size:cover;' +
            'background-position:center;' +
            'opacity:.58;' +
            'border:1px solid rgba(255,255,255,.1);' +
            'transition:opacity .25s,transform .25s,border-color .25s;' +
        '}' +

        '.tfeed__poster--now{' +
            'opacity:1;' +
            'transform:scale(1.04);' +
            'border:2px solid #fff;' +
            'box-shadow:0 0 .8em rgba(0,0,0,.6);' +
        '}' +

        /* Інформаційна панель — телевізійний режим */
        '.tfeed__info{' +
            'position:absolute;' +
            'left:0;' +
            'right:0;' +
            'bottom:0;' +
            'z-index:8;' +
            'padding:6em 12em 2em 3em;' +
            'background:linear-gradient(to top,rgba(0,0,0,.94),rgba(0,0,0,.68) 48%,transparent);' +
            'box-sizing:border-box;' +
            'pointer-events:none;' +
        '}' +

        '.tfeed__logo{' +
            'display:none;' +
            'width:auto;' +
            'max-width:min(30em,70vw);' +
            'max-height:8em;' +
            'margin:0 0 .5em;' +
            'object-fit:contain;' +
            'object-position:left bottom;' +
        '}' +

        '.tfeed__title{' +
            'display:none;' +
            'font-size:2.6em;' +
            'font-weight:700;' +
            'line-height:1.12;' +
            'margin:0 0 .25em;' +
            'text-shadow:0 2px 8px rgba(0,0,0,.8);' +
        '}' +

        '.tfeed__meta{' +
            'font-size:1.2em;' +
            'line-height:1.35;' +
            'opacity:.9;' +
            'margin-top:.3em;' +
            'text-shadow:0 1px 5px #000;' +
        '}' +

        '.tfeed__descr{' +
            'font-size:1.1em;' +
            'line-height:1.4;' +
            'opacity:.78;' +
            'margin-top:.55em;' +
            'max-width:70%;' +
            'display:-webkit-box;' +
            '-webkit-line-clamp:3;' +
            '-webkit-box-orient:vertical;' +
            'overflow:hidden;' +
            'text-shadow:0 1px 5px #000;' +
        '}' +

        '.tfeed__hint{' +
            'font-size:.95em;' +
            'opacity:.55;' +
            'margin-top:1em;' +
        '}' +

        /* Статус завантаження */
        '.tfeed__status{' +
            'position:absolute;' +
            'left:50%;' +
            'top:45%;' +
            'transform:translate(-50%,-50%);' +
            'z-index:30;' +
            'font-size:1.1em;' +
            'line-height:1.4;' +
            'padding:.7em 1em;' +
            'max-width:85%;' +
            'text-align:center;' +
            'border-radius:1em;' +
            'background:rgba(0,0,0,.78);' +
            'backdrop-filter:blur(10px);' +
            '-webkit-backdrop-filter:blur(10px);' +
        '}' +

        '.tfeed__status:empty{' +
            'display:none;' +
        '}' +

        /*
         * МОБІЛЬНИЙ ІНТЕРФЕЙС
         *
         * Постери зверху.
         * Відео по центру, без примусового обрізання.
         * Метадані розміщені під відео.
         * Нижня частина зарезервована для меню Lampa.
         */
        '@media screen and (max-width:768px){' +

            '.tfeed{' +
                'overflow:hidden;' +
                'background:#000;' +
            '}' +

            '.tfeed__bg{' +
                'inset:-7%;' +
                'width:114%;' +
                'height:114%;' +
                'filter:blur(27px) brightness(.32);' +
                'transform:scale(1.08);' +
            '}' +

            '.tfeed__chip{' +
                'left:14px;' +
                'top:12px;' +
                'padding:7px 12px;' +
                'font-size:13px;' +
                'max-width:70%;' +
                'white-space:nowrap;' +
                'overflow:hidden;' +
                'text-overflow:ellipsis;' +
            '}' +

            /*
             * Горизонтальний ряд постерів зверху.
             * Він більше не знаходиться за нижнім меню.
             */
            '.tfeed__side{' +
                'left:12px;' +
                'right:12px;' +
                'top:56px;' +
                'bottom:auto;' +
                'width:auto;' +
                'height:clamp(68px,20vw,112px);' +
                'max-height:none;' +
                'transform:none;' +
                'display:flex;' +
                'flex-direction:row;' +
                'justify-content:center;' +
                'align-items:center;' +
                'gap:8px;' +
                'overflow:hidden;' +
            '}' +

            '.tfeed__poster{' +
                'width:clamp(43px,13vw,72px);' +
                'height:clamp(64px,19vw,104px);' +
                'margin:0;' +
                'border-radius:6px;' +
                'opacity:.58;' +
                'transform:none;' +
                'box-sizing:border-box;' +
            '}' +

            '.tfeed__poster--now{' +
                'opacity:1;' +
                'transform:scale(1.04);' +
                'border:2px solid #fff;' +
                'box-shadow:0 0 0 1px rgba(0,0,0,.5);' +
            '}' +

            /*
             * Область відео.
             * Співвідношення сторін — 16:9.
             * Прибираємо збільшення на 600px, яке обрізало кадр.
             */
            '.tfeed__video{' +
                'left:0;' +
                'right:0;' +
                'top:calc(56px + clamp(68px,20vw,112px) + 10px);' +
                'bottom:auto;' +
                'width:100%;' +
                'height:auto;' +
                'aspect-ratio:16 / 9;' +
                'overflow:hidden;' +
                'background:#000;' +
                'z-index:3;' +
            '}' +

            '.tfeed__yt{' +
                'position:absolute;' +
                'left:0;' +
                'top:0;' +
                'width:100%;' +
                'height:100%;' +
                'inset:0;' +
                'overflow:hidden;' +
                'background:#000;' +
            '}' +

            '.tfeed__yt iframe{' +
                'position:absolute;' +
                'left:0;' +
                'top:0;' +
                'width:100%!important;' +
                'height:100%!important;' +
                'border:0;' +
                'pointer-events:none;' +
            '}' +

            '.tfeed__frame{' +
                'left:0;' +
                'top:0;' +
                'width:100%;' +
                'height:100%;' +
            '}' +

            /*
             * Інформація під відео.
             * Висота й відступи залишають місце для нижньої панелі Lampa.
             */
            '.tfeed__info{' +
                'left:0;' +
                'right:0;' +
                'top:calc(56px + clamp(68px,20vw,112px) + 10px + 56.25vw + 12px);' +
                'bottom:100px;' +
                'height:auto;' +
                'overflow:hidden;' +
                'padding:0 17px 8px;' +
                'background:linear-gradient(to bottom,rgba(0,0,0,.12),rgba(0,0,0,.18));' +
                'pointer-events:auto;' +
            '}' +

            '.tfeed__logo{' +
                'max-width:75%;' +
                'max-height:clamp(38px,12vw,68px);' +
                'margin:0 0 7px;' +
                'object-position:left center;' +
            '}' +

            '.tfeed__title{' +
                'font-size:clamp(19px,5.2vw,27px);' +
                'line-height:1.18;' +
                'margin:0 0 5px;' +
                'display:none;' +
                'display:-webkit-box;' +
                '-webkit-line-clamp:2;' +
                '-webkit-box-orient:vertical;' +
                'overflow:hidden;' +
            '}' +

            '.tfeed__meta{' +
                'font-size:13px;' +
                'line-height:1.35;' +
                'margin-top:4px;' +
                'opacity:.88;' +
            '}' +

            '.tfeed__descr{' +
                'font-size:13px;' +
                'line-height:1.4;' +
                'margin-top:6px;' +
                'max-width:100%;' +
                'opacity:.78;' +
                '-webkit-line-clamp:2;' +
            '}' +

            '.tfeed__hint{' +
                'display:none!important;' +
            '}' +

            '.tfeed__status{' +
                'top:45%;' +
                'font-size:13px;' +
                'max-width:82%;' +
            '}' +
        '}' +

        /* Невеликі телефони */
        '@media screen and (max-width:380px){' +
            '.tfeed__side{' +
                'left:8px;' +
                'right:8px;' +
                'gap:6px;' +
            '}' +

            '.tfeed__poster{' +
                'width:12.5vw;' +
                'height:18vw;' +
            '}' +

            '.tfeed__info{' +
                'padding-left:13px;' +
                'padding-right:13px;' +
            '}' +

            '.tfeed__meta,' +
            '.tfeed__descr{' +
                'font-size:12px;' +
            '}' +
        '}';

    function pickTrailer(results) {
        var lang = Lampa.Storage.field('tmdb_lang');

        var rank = function (v) {
            return (
                (v.type === 'Trailer' ? 0 : v.type === 'Teaser' ? 2 : 4) +
                (v.iso_639_1 === lang ? 0 : 1)
            );
        };

        var yt = results.filter(function (v) {
            return v.site === 'YouTube' && v.key;
        });

        yt.sort(function (a, b) {
            return rank(a) - rank(b);
        });

        return yt[0];
    }

    function pickLogo(logos) {
        var lang = Lampa.Storage.field('tmdb_lang');
        var order = [lang, 'en', null];

        for (var i = 0; i < order.length; i++) {
            var found = logos.filter(function (l) {
                return l.iso_639_1 === order[i];
            })[0];

            if (found) return found;
        }

        return logos[0];
    }

    function genreTitle(type, id) {
        if (!id) return 'Популярне';

        var genres = tmdb.genres[type] || [];
        var genre = genres.filter(function (x) {
            return x.id === id;
        })[0];

        return genre
            ? Lampa.Utils.capitalizeFirstLetter(Lampa.Lang.translate(genre.title))
            : '';
    }

    function loadYT(cb) {
        if (window.YT && window.YT.Player) {
            cb(true);
            return;
        }

        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            var script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(script);
        }

        var waited = 0;

        var timer = setInterval(function () {
            waited += 100;

            if (window.YT && window.YT.Player) {
                clearInterval(timer);
                cb(true);
            } else if (waited >= LOAD_TIMEOUT) {
                clearInterval(timer);
                cb(false);
            }
        }, 100);
    }

    function shuffleArray(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }

        return array;
    }

    function Feed(object) {
        var hintText = isMobile
            ? 'Свайп угору/вниз — гортати · Тап — відкрити'
            : '▲▼ гортати · OK — відкрити · → жанри · Назад — вихід';

        var html = $(
            '<div class="tfeed">' +
                '<div class="tfeed__bg"></div>' +
                '<div class="tfeed__video"></div>' +
                '<div class="tfeed__status"></div>' +
                '<div class="tfeed__chip"></div>' +
                '<div class="tfeed__side"></div>' +
                '<div class="tfeed__info">' +
                    '<img class="tfeed__logo" alt="">' +
                    '<div class="tfeed__title"></div>' +
                    '<div class="tfeed__meta"></div>' +
                    '<div class="tfeed__descr"></div>' +
                    '<div class="tfeed__hint">' + hintText + '</div>' +
                '</div>' +
            '</div>'
        );

        var type;
        var genre;
        var items = [];
        var index = -1;
        var dir = 1;
        var page = 0;
        var totalPages = 1;
        var loading = false;
        var waiters = [];

        var feedGen = 0;
        var seq = 0;
        var players = [];
        var cur = null;
        var frameId = '';

        var nextTimer;
        var watchdog;
        var prepTimer;

        var self = this;

        var touchStartY = 0;
        var touchStartX = 0;
        var touchStartTime = 0;

        function status(text) {
            html.find('.tfeed__status').text(text || '');
        }

        function reset(newType, newGenre) {
            type = newType;
            genre = newGenre;

            Lampa.Storage.set('tfeed_type', type);
            Lampa.Storage.set('tfeed_genre', genre);

            items = [];
            index = -1;
            dir = 1;
            page = 0;
            totalPages = 1;
            loading = false;
            waiters = [];

            feedGen++;
            seq++;

            stopAll();

            html.find('.tfeed__side').empty();

            html.find('.tfeed__chip').text(
                TYPES[type] + ' · ' + genreTitle(type, genre)
            );
        }

        function flush(ok) {
            var callbacks = waiters;
            waiters = [];

            callbacks.forEach(function (callback) {
                callback(ok);
            });
        }

        function loadPage(done) {
            if (done) waiters.push(done);
            if (loading) return;

            if (page >= totalPages) {
                flush(false);
                return;
            }

            loading = true;

            var gen = feedGen;

            if (page === 0 && totalPages === 1) {
                page = Math.floor(Math.random() * 15) + 1;
            } else {
                page++;
            }

            var params = {
                page: page,
                sort_by: 'popularity.desc',
                filter: {
                    'vote_count.gte': 50
                }
            };

            if (genre) params.genres = genre;

            if (type === 'tv' && !genre) {
                params.filter.without_genres = '10763,10767';
            }

            tmdb.get('discover/' + type, params, function (json) {
                if (gen !== feedGen) return;

                loading = false;
                totalPages = json.total_pages || page;

                var newItems = (json.results || []).filter(function (item) {
                    return !item.adult;
                });

                shuffleArray(newItems);

                items = items.concat(newItems);

                flush(true);
            }, function () {
                if (gen !== feedGen) return;

                loading = false;
                flush(false);
            });
        }

        function cached(item, key, request, cb) {
            if (item[key] !== undefined) {
                cb(item[key]);
                return;
            }

            if (item[key + '_wait']) {
                item[key + '_wait'].push(cb);
                return;
            }

            item[key + '_wait'] = [cb];

            request(function (value) {
                item[key] = value || null;

                var callbacks = item[key + '_wait'] || [];
                item[key + '_wait'] = null;

                callbacks.forEach(function (callback) {
                    callback(item[key]);
                });
            });
        }

        function ensureVideo(item, cb) {
            var currentType = type;

            cached(item, 'tfeed_video', function (done) {
                tmdb.videos({
                    method: currentType,
                    id: item.id
                }, function (json) {
                    done(pickTrailer(json.results || []));
                }, function () {
                    done(null);
                });
            }, cb);
        }

        function ensureLogo(item, cb) {
            var currentType = type;

            cached(item, 'tfeed_logo', function (done) {
                var language = Lampa.Storage.field('tmdb_lang') || 'uk';
                var langs = language + ',en,null';

                tmdb.get(
                    currentType + '/' + item.id + '/images',
                    {
                        filter: {
                            include_image_language: langs
                        }
                    },
                    function (json) {
                        var logos = json.logos || [];
                        var logo = logos.length ? pickLogo(logos) : null;

                        done(
                            logo
                                ? Lampa.Api.img(logo.file_path, 'w500')
                                : null
                        );
                    },
                    function () {
                        done(null);
                    }
                );
            }, cb);
        }

        function fullscreen(on) {
            $('body').toggleClass('tfeed--on', on);
        }

        function findPlayer(item) {
            return players.filter(function (player) {
                return player.item === item;
            })[0];
        }

        function makePlayer(item, play) {
            var player = {
                item: item,
                ready: false,
                wantPlay: play
            };

            player.el = $('<div class="tfeed__yt"><div></div></div>');

            html.find('.tfeed__video').append(player.el);

            var vars = {
                autoplay: play ? 1 : 0,
                controls: 0,
                rel: 0,
                modestbranding: 1,
                playsinline: 1,
                iv_load_policy: 3,
                disablekb: 1,
                fs: 0,
                enablejsapi: 1,
                mute: isMobile ? 1 : 0
            };

            if (/^https?:/.test(location.origin)) {
                vars.origin = location.origin;
            }

            player.yt = new window.YT.Player(player.el.children()[0], {
                videoId: item.tfeed_video.key,
                width: '100%',
                height: '100%',
                playerVars: vars,

                events: {
                    onReady: function () {
                        player.ready = true;

                        var frame = player.yt.getIframe && player.yt.getIframe();

                        if (frame) {
                            frame.setAttribute('tabindex', '-1');
                        }

                        if (player.wantPlay && !play) {
                            player.yt.playVideo();
                        }
                    },

                    onStateChange: function (event) {
                        onPlayer(player, 'state', event.data);
                    },

                    onError: function (event) {
                        onPlayer(player, 'error', event.data);
                    }
                }
            });

            players.push(player);

            return player;
        }

        function killPlayer(player) {
            if (player === cur) {
                cur = null;
                clearTimeout(nextTimer);
                clearTimeout(watchdog);
            }

            try {
                if (player.yt) player.yt.destroy();
            } catch (e) {}

            if (player.el) player.el.remove();

            var position = players.indexOf(player);

            if (position >= 0) {
                players.splice(position, 1);
            }
        }

        function stopAll() {
            players.slice().forEach(killPlayer);

            clearTimeout(nextTimer);
            clearTimeout(watchdog);
            clearTimeout(prepTimer);

            frameId = '';

            html.find('.tfeed__frame').remove();
        }

        function prepare() {
            clearTimeout(prepTimer);

            if (bridgeMode || !cur || index < 0 || !items[index]) return;

            var keep = [items[index]];

            for (
                var i = index + 1;
                i < items.length && keep.length <= LIVE_AHEAD;
                i++
            ) {
                var video = items[i].tfeed_video;

                if (video === undefined) {
                    ensureVideo(items[i], function () {
                        schedulePrepare();
                    });

                    break;
                }

                if (video) keep.push(items[i]);
            }

            players.slice().forEach(function (player) {
                if (keep.indexOf(player.item) < 0) {
                    killPlayer(player);
                }
            });

            var missing = keep.slice(1).filter(function (item) {
                return !findPlayer(item);
            })[0];

            if (missing) {
                makePlayer(missing, false);
                schedulePrepare();
            }
        }

        function schedulePrepare() {
            clearTimeout(prepTimer);
            prepTimer = setTimeout(prepare, PREP_DELAY);
        }

        function watch(my) {
            clearTimeout(watchdog);

            watchdog = setTimeout(function () {
                if (my === seq) {
                    status('YouTube не відповідає · прогорніть далі');
                }
            }, LOAD_TIMEOUT);
        }

        function playItem(item) {
            var my = seq;

            if (bridgeMode) {
                playFrame(item);
                return;
            }

            loadYT(function (ok) {
                if (my !== seq) return;

                if (!ok) {
                    bridgeMode = true;
                    playFrame(item);
                    return;
                }

                var player = findPlayer(item);

                if (player) {
                    player.wantPlay = true;

                    if (player.ready) {
                        player.yt.playVideo();
                    }
                } else {
                    player = makePlayer(item, true);
                }

                cur = player;

                watch(my);
            });
        }

        function onPlayer(player, kind, value) {
            if (kind === 'error') {
                if (value === 153) {
                    bridgeMode = true;

                    var item = cur === player ? player.item : null;

                    players.slice().forEach(killPlayer);

                    if (item && items[index] === item) {
                        playFrame(item);
                    }

                    return;
                }

                player.item.tfeed_video = null;
                renderSide();
            }

            if (player !== cur) {
                if (kind === 'error') {
                    killPlayer(player);
                    schedulePrepare();
                }

                return;
            }

            if (
                kind === 'state' &&
                value === window.YT.PlayerState.PLAYING
            ) {
                clearTimeout(watchdog);

                status('');

                if (
                    isMobile &&
                    player.yt &&
                    player.yt.isMuted &&
                    player.yt.isMuted()
                ) {
                    player.yt.unMute();
                    player.yt.setVolume(100);
                }

                /*
                 * Показуємо відео тільки після PLAYING,
                 * щоб не відкривати чорний кадр під час завантаження.
                 */
                player.el.addClass('tfeed__yt--on');

                schedulePrepare();
            }

            if (
                (kind === 'state' &&
                    value === window.YT.PlayerState.ENDED) ||
                kind === 'error'
            ) {
                if (kind === 'error') {
                    status('Трейлер недоступний, гортаю далі…');
                }

                /*
                 * Автоматично запускаємо наступний трейлер.
                 */
                nextTimer = setTimeout(function () {
                    show(index + 1, 1);
                }, kind === 'error' ? 1500 : 300);
            }
        }

        function playFrame(item) {
            frameId = 'tfeed_' + Math.random().toString(36).slice(2);

            var frame = $('<iframe class="tfeed__frame" tabindex="-1" allow="autoplay; encrypted-media"></iframe>');

            frame.attr(
                'src',
                BASE + 'yt.html?id=' +
                frameId +
                '&v=' +
                encodeURIComponent(item.tfeed_video.key) +
                '&preload=0'
            );

            html.find('.tfeed__video').append(frame);

            watch(seq);
        }

        function onMessage(event) {
            var data = event.data;

            if (!data || !frameId || data.bridgeId !== frameId) return;

            if (data.type === 'ready') {
                clearTimeout(watchdog);
            }

            if (
                (data.type === 'stateChange' &&
                    data.data &&
                    data.data.state === 0) ||
                data.type === 'error'
            ) {
                if (data.type === 'error') {
                    status('Трейлер недоступний, гортаю далі…');
                }

                nextTimer = setTimeout(function () {
                    show(index + 1, 1);
                }, data.type === 'error' ? 1500 : 300);
            }
        }

        function renderSide() {
            var side = html.find('.tfeed__side').empty();

            for (
                var i = index, shown = 0;
                i < items.length && shown <= AHEAD;
                i++
            ) {
                if (i > index && items[i].tfeed_video === null) {
                    continue;
                }

                var poster = items[i].poster_path
                    ? 'url(' + Lampa.Api.img(items[i].poster_path, 'w200') + ')'
                    : 'none';

                var element = $('<div class="tfeed__poster"></div>');

                element
                    .toggleClass('tfeed__poster--now', i === index)
                    .css('background-image', poster);

                side.append(element);
                shown++;
            }
        }

        function prefetch() {
            for (
                var i = index + 1;
                i < Math.min(items.length, index + 1 + META_AHEAD);
                i++
            ) {
                var item = items[i];

                ensureVideo(item, renderSide);

                ensureLogo(item, function (url) {
                    if (url) {
                        var image = new Image();
                        image.src = url;
                    }
                });

                if (!item.tfeed_warm) {
                    item.tfeed_warm = true;

                    if (item.poster_path) {
                        var poster = new Image();
                        poster.src = Lampa.Api.img(item.poster_path, 'w200');
                    }

                    if (item.backdrop_path) {
                        var backdrop = new Image();
                        backdrop.src = Lampa.Api.img(item.backdrop_path, 'w1280');
                    }
                }
            }
        }

        function info(item) {
            var date = item.release_date || item.first_air_date || '';

            var genres = tmdb.getGenresNameFromIds(
                type,
                item.genre_ids || []
            ).slice(0, 3).join(', ');

            var meta = [
                date.slice(0, 4),
                item.vote_average
                    ? '★ ' + item.vote_average.toFixed(1)
                    : '',
                genres
            ].filter(Boolean).join(' · ');

            var titleEl = html.find('.tfeed__title');
            var logoEl = html.find('.tfeed__logo');

            var movieTitle =
                item.title ||
                item.name ||
                item.original_title ||
                item.original_name ||
                '';

            html.find('.tfeed__meta').text(meta);
            html.find('.tfeed__descr').text(item.overview || '');

            html.find('.tfeed__bg').css(
                'background-image',
                item.backdrop_path
                    ? 'url(' + Lampa.Api.img(item.backdrop_path, 'w1280') + ')'
                    : 'none'
            );

            /*
             * Очищуємо старі дані, щоб логотип попереднього фільму
             * не залишався під час завантаження нового.
             */
            logoEl.hide().removeAttr('src');
            titleEl.text('').hide();

            ensureLogo(item, function (url) {
                if (items[index] !== item) return;

                if (url) {
                    logoEl.attr('src', url).show();
                    titleEl.hide();
                } else {
                    logoEl.hide();
                    titleEl.text(movieTitle).show();
                }
            });
        }

        function show(i, direction) {
            dir = direction || dir;

            if (i < 0) {
                show(0, 1);
                return;
            }

            if (i >= items.length) {
                loadPage(function (ok) {
                    if (ok && i < items.length) {
                        show(i, dir);
                    } else {
                        status(TYPES[type] + ' у цьому жанрі закінчилися');
                    }
                });

                return;
            }

            if (i >= items.length - META_AHEAD) {
                loadPage();
            }

            index = i;

            var item = items[i];
            var my = ++seq;

            if (cur && cur.item !== item) {
                killPlayer(cur);
            }

            clearTimeout(prepTimer);

            frameId = '';
            html.find('.tfeed__frame').remove();

            status('');
            info(item);
            renderSide();

            ensureVideo(item, function (trailer) {
                if (my !== seq) return;

                if (trailer) {
                    playItem(item);
                } else {
                    show(index + dir, dir);
                }
            });

            prefetch();
        }

        function begin(done) {
            self.activity.loader(true);

            loadPage(function (ok) {
                self.activity.loader(false);

                if (ok && items.length) {
                    show(0, 1);
                } else {
                    status('Не вдалося завантажити список');
                }

                if (done) done();
            });
        }

        function openPanel() {
            var list = ['movie', 'tv'].map(function (t) {
                return {
                    title: TYPES[t] + (t === type ? '  ✓' : ''),
                    tfeed_type: t
                };
            });

            list.push({
                title: 'Жанр',
                separator: true
            });

            [{ id: 0 }].concat(tmdb.genres[type]).forEach(function (g) {
                list.push({
                    title: genreTitle(type, g.id),
                    tfeed_genre: g.id,
                    selected: g.id === genre
                });
            });

            Lampa.Select.show({
                title: 'КіноТрейлери',
                items: list,

                onSelect: function (item) {
                    Lampa.Controller.toggle('content');

                    if (item.tfeed_type) {
                        if (item.tfeed_type === type) return;

                        var keep = tmdb.genres[item.tfeed_type].some(function (g) {
                            return g.id === genre;
                        });

                        reset(item.tfeed_type, keep ? genre : 0);
                    } else {
                        if (item.tfeed_genre === genre) return;

                        reset(type, item.tfeed_genre);
                    }

                    begin();
                },

                onBack: function () {
                    Lampa.Controller.toggle('content');
                }
            });
        }

        function openCurrentCard() {
            var item = items[index];

            if (!item) return;

            Lampa.Activity.push({
                url: '',
                component: 'full',
                id: item.id,
                method: type,
                card: item,
                source: 'tmdb'
            });
        }

        this.create = function () {
            window.addEventListener('message', onMessage);

            html.find('.tfeed__chip').on('click', function (event) {
                event.stopPropagation();
                openPanel();
            });

            html.on('click', function (event) {
                if ($(event.target).closest('.tfeed__info').length) {
                    openCurrentCard();
                } else if ($(event.target).closest('.tfeed__chip').length) {
                    openPanel();
                }
            });

            /*
             * Вертикальний свайп на мобільному.
             */
            html[0].addEventListener('touchstart', function (event) {
                if (event.touches && event.touches.length === 1) {
                    touchStartY = event.touches[0].clientY;
                    touchStartX = event.touches[0].clientX;
                    touchStartTime = Date.now();
                }
            }, {
                passive: true
            });

            html[0].addEventListener('touchend', function (event) {
                if (!event.changedTouches || !event.changedTouches.length) {
                    return;
                }

                var deltaY = event.changedTouches[0].clientY - touchStartY;
                var deltaX = event.changedTouches[0].clientX - touchStartX;
                var deltaTime = Date.now() - touchStartTime;

                if (
                    Math.abs(deltaY) > 30 &&
                    Math.abs(deltaY) > Math.abs(deltaX) &&
                    deltaTime < 500
                ) {
                    if (deltaY < 0) {
                        show(index + 1, 1);
                    } else if (index > 0) {
                        show(index - 1, -1);
                    }
                }
            }, {
                passive: true
            });

            reset(
                TYPES[object.type] ? object.type : 'movie',
                object.genre || 0
            );

            begin(function () {
                self.activity.toggle();
            });

            return this.render();
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.clear();
                },

                up: function () {
                    if (index > 0) {
                        show(index - 1, -1);
                    }
                },

                down: function () {
                    show(index + 1, 1);
                },

                left: function () {
                    Lampa.Controller.toggle('menu');
                },

                right: openPanel,

                enter: openCurrentCard,

                back: function () {
                    Lampa.Activity.backward();
                }
            });

            Lampa.Controller.toggle('content');
            fullscreen(true);

            if (
                index >= 0 &&
                !cur &&
                !frameId &&
                items[index] &&
                items[index].tfeed_video
            ) {
                playItem(items[index]);
            }
        };

        this.pause = function () {
            seq++;
            stopAll();
            fullscreen(false);
        };

        this.stop = function () {
            seq++;
            stopAll();
            fullscreen(false);
        };

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            seq++;
            feedGen++;

            stopAll();
            fullscreen(false);

            window.removeEventListener('message', onMessage);

            html.remove();
        };
    }

    function openFeed() {
        Lampa.Activity.push({
            url: '',
            title: 'КіноТрейлери',
            component: 'trailers_feed',
            page: 1,
            type: Lampa.Storage.get('tfeed_type', 'movie'),
            genre: parseInt(Lampa.Storage.get('tfeed_genre', 0), 10) || 0
        });
    }

    function start() {
        if (!$('head style[data-tfeed-premium]').length) {
            $('<style data-tfeed-premium="1"></style>')
                .text(css)
                .appendTo('head');
        }

        Lampa.Component.add('trailers_feed', Feed);

        var icon =
            '<svg viewBox="0 0 24 24" fill="currentColor">' +
            '<path d="M8 5v14l11-7z"/>' +
            '</svg>';

        if (Lampa.Menu.addButton) {
            Lampa.Menu.addButton(icon, 'КіноТрейлери', openFeed);
        } else {
            var item = $(
                '<li class="menu__item selector">' +
                    '<div class="menu__ico">' + icon + '</div>' +
                    '<div class="menu__text">КіноТрейлери</div>' +
                '</li>'
            );

            item.on('hover:enter', openFeed);

            $('.menu .menu__list').eq(0).append(item);
        }
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                start();
            }
        });
    }
})();
