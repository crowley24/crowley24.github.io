
(function () {
    'use strict';

    /*
     * INTERFACE+ 1.8.3 — SAFE NATIVE NETFLIX CARD
     * TMDB ONLY
     *
     * Основні принципи:
     * - Не замінює нативний шаблон Lampa.
     * - Не приховує кнопки, назву, акторів, опис або метадані.
     * - Не переміщує елементи картки.
     * - Не створює повторно activity.
     * - Фон розміщується окремим нижнім шаром.
     * - Фон не змінюється під час переміщення фокуса.
     * - Якщо логотип відсутній, стандартна назва залишається видимою.
     * - Підтримує complete / complite.
     */

    var VERSION = '1.8.3';
    var READY_KEY = 'interface_plus_tmdb_only_183';

    if (window[READY_KEY]) return;
    window[READY_KEY] = true;

    var state = {
        active: false,
        movieKey: '',
        backdrop: '',
        logo: '',
        activity: null,
        timer: null,
        request: 0
    };

    var BACKGROUND_ID = 'interface-plus-183-background';
    var STYLE_ID = 'interface-plus-183-style';
    var LOGO_ID = 'interface-plus-183-logo';

    function log() {
        if (window.console && console.log) {
            console.log.apply(console, ['[INTERFACE+ ' + VERSION + ']'].concat(
                Array.prototype.slice.call(arguments)
            ));
        }
    }

    function imageUrl(path, size) {
        if (!path || typeof path !== 'string') return '';

        if (/^https?:\/\//i.test(path)) return path;

        if (path.charAt(0) !== '/') path = '/' + path;

        return 'https://image.tmdb.org/t/p/' + (size || 'original') + path;
    }

    function getMovie(data) {
        if (!data) return null;

        if (data.movie) return data.movie;
        if (data.card) return data.card;
        if (data.data && data.data.movie) return data.data.movie;

        return data;
    }

    function getMovieKey(movie) {
        if (!movie) return '';

        return [
            movie.id || movie.tmdb_id || '',
            movie.name || movie.title || '',
            movie.backdrop_path || ''
        ].join('_');
    }

    function getBackdrop(movie) {
        if (!movie) return '';

        return imageUrl(
            movie.backdrop_path ||
            movie.backdrop ||
            movie.background,
            'original'
        );
    }

    function getLogo(movie) {
        if (!movie) return '';

        return imageUrl(
            movie.logo_path ||
            movie.logo ||
            movie.images && movie.images.logo,
            'w500'
        );
    }

    function createBackground() {
        if (document.getElementById(BACKGROUND_ID)) return;

        var root = document.createElement('div');
        root.id = BACKGROUND_ID;

        var image = document.createElement('div');
        image.className = 'interface-plus-183-image';

        var shade = document.createElement('div');
        shade.className = 'interface-plus-183-shade';

        var bottom = document.createElement('div');
        bottom.className = 'interface-plus-183-bottom';

        root.appendChild(image);
        root.appendChild(shade);
        root.appendChild(bottom);

        document.body.appendChild(root);
    }

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var css = `
            #${BACKGROUND_ID} {
                position: fixed;
                inset: 0;
                width: 100%;
                height: 100%;
                z-index: 0;
                pointer-events: none;
                overflow: hidden;
                display: none;
                background: #080808;
            }

            body.interface-plus-183-card-open
            #${BACKGROUND_ID} {
                display: block;
            }

            #${BACKGROUND_ID} .interface-plus-183-image {
                position: absolute;
                inset: 0;
                background-position: center center;
                background-repeat: no-repeat;
                background-size: cover;
                opacity: 0;
                transform: scale(1.015);
                transition:
                    opacity 650ms ease,
                    transform 8s ease;
            }

            #${BACKGROUND_ID}.loaded
            .interface-plus-183-image {
                opacity: 1;
                transform: scale(1.04);
            }

            #${BACKGROUND_ID} .interface-plus-183-shade {
                position: absolute;
                inset: 0;
                background:
                    linear-gradient(
                        90deg,
                        rgba(0,0,0,.88) 0%,
                        rgba(0,0,0,.70) 28%,
                        rgba(0,0,0,.30) 65%,
                        rgba(0,0,0,.12) 100%
                    ),
                    linear-gradient(
                        0deg,
                        rgba(0,0,0,.88) 0%,
                        rgba(0,0,0,.20) 45%,
                        rgba(0,0,0,.25) 100%
                    );
            }

            #${BACKGROUND_ID} .interface-plus-183-bottom {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;
                height: 30%;
                background: linear-gradient(
                    0deg,
                    rgba(0,0,0,.62),
                    transparent
                );
            }

            /*
             * Важливо:
             * Не ховаємо нативні елементи картки.
             * Не встановлюємо display:none для колонок.
             * Не змінюємо структуру full-start.
             */

            body.interface-plus-183-card-open .activity {
                position: relative;
                z-index: 1;
            }

            body.interface-plus-183-card-open .activity__body {
                position: relative;
                z-index: 1;
            }

            body.interface-plus-183-card-open .full {
                position: relative;
                z-index: 1;
            }

            body.interface-plus-183-card-open .full-start,
            body.interface-plus-183-card-open .full-start-new {
                position: relative;
                z-index: 1;
            }

            body.interface-plus-183-card-open .full-start__body,
            body.interface-plus-183-card-open .full-start-new__body {
                position: relative;
                z-index: 2;
            }

            /*
             * Логотип додається лише тоді, коли він
             * реально присутній у переданих даних.
             * Стандартну назву не приховуємо.
             */

            .interface-plus-183-logo {
                display: block;
                max-width: min(420px, 75vw);
                max-height: 115px;
                width: auto;
                height: auto;
                object-fit: contain;
                object-position: left center;
                margin: 0 0 12px 0;
                pointer-events: none;
            }

            @media (max-width: 700px) {
                #${BACKGROUND_ID} .interface-plus-183-shade {
                    background:
                        linear-gradient(
                            0deg,
                            rgba(0,0,0,.92) 0%,
                            rgba(0,0,0,.58) 55%,
                            rgba(0,0,0,.28) 100%
                        );
                }

                .interface-plus-183-logo {
                    max-width: 75vw;
                    max-height: 85px;
                }
            }
        `;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;

        document.head.appendChild(style);
    }

    function setBackdrop(url) {
        var root = document.getElementById(BACKGROUND_ID);
        if (!root || !url) return;

        var image = root.querySelector('.interface-plus-183-image');
        if (!image) return;

        if (state.backdrop === url && root.classList.contains('loaded')) {
            return;
        }

        state.backdrop = url;
        root.classList.remove('loaded');

        var preload = new Image();

        preload.onload = function () {
            if (!state.active || state.backdrop !== url) return;

            image.style.backgroundImage = 'url("' + url + '")';

            requestAnimationFrame(function () {
                root.classList.add('loaded');
            });
        };

        preload.onerror = function () {
            log('Backdrop load failed:', url);
        };

        preload.src = url;
    }

    function findTitleContainer(activity) {
        if (!activity) return null;

        var selectors = [
            '.full-start__title',
            '.full-start-new__title',
            '.full-start__name',
            '.full-start-new__name',
            '.full-start__left',
            '.left-title__content'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var found = activity.querySelector(selectors[i]);

            if (found) return found;
        }

        return null;
    }

    function addLogo(activity, logoUrl) {
        if (!activity || !logoUrl) return;

        var old = activity.querySelector('#' + LOGO_ID);
        if (old) old.remove();

        var container = findTitleContainer(activity);
        if (!container) return;

        var logo = document.createElement('img');
        logo.id = LOGO_ID;
        logo.className = 'interface-plus-183-logo';
        logo.alt = '';
        logo.src = logoUrl;

        logo.onerror = function () {
            if (logo.parentNode) logo.parentNode.removeChild(logo);
        };

        /*
         * Логотип вставляється перед назвою.
         * Назва залишається в DOM і не приховується.
         */
        container.insertBefore(logo, container.firstChild);

        state.logo = logoUrl;
    }

    function getActivityElement(event) {
        if (!event || !event.object) return null;

        var activityObject = event.object.activity;

        if (activityObject && typeof activityObject.render === 'function') {
            try {
                var rendered = activityObject.render();

                if (rendered && rendered[0] instanceof HTMLElement) {
                    return rendered[0];
                }

                if (rendered instanceof HTMLElement) {
                    return rendered;
                }
            } catch (e) {
                log('Activity render access error:', e);
            }
        }

        if (event.object.render && typeof event.object.render === 'function') {
            try {
                var result = event.object.render();

                if (result && result[0] instanceof HTMLElement) {
                    return result[0];
                }

                if (result instanceof HTMLElement) {
                    return result;
                }
            } catch (e2) {
                log('Object render access error:', e2);
            }
        }

        return null;
    }

    function startCard(event) {
        if (!event || !event.data) return;

        var movie = getMovie(event.data);
        if (!movie) return;

        var key = getMovieKey(movie);
        if (!key) return;

        /*
         * Захист від повторної обробки тієї самої картки.
         */
        if (state.active && state.movieKey === key) return;

        state.request++;

        var request = state.request;

        state.active = true;
        state.movieKey = key;
        state.activity = getActivityElement(event);

        document.body.classList.add('interface-plus-183-card-open');

        var backdrop = getBackdrop(movie);
        var logo = getLogo(movie);

        if (backdrop) {
            setBackdrop(backdrop);
        }

        if (state.timer) {
            clearTimeout(state.timer);
        }

        /*
         * Чекаємо завершення нативного рендерингу.
         * Не викликаємо render повторно.
         */
        var attempts = 0;

        function attachLogo() {
            if (request !== state.request || !state.active) return;

            var activity = state.activity;

            if (!activity || !activity.isConnected) {
                activity = getActivityElement(event);
                state.activity = activity;
            }

            if (logo && activity) {
                addLogo(activity, logo);
                return;
            }

            attempts++;

            if (attempts < 12) {
                state.timer = setTimeout(attachLogo, 180);
            }
        }

        if (logo) {
            state.timer = setTimeout(attachLogo, 150);
        }

        log('Card opened:', movie.title || movie.name || key);
    }

    function stopCard() {
        state.request++;

        state.active = false;
        state.movieKey = '';
        state.backdrop = '';
        state.logo = '';
        state.activity = null;

        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }

        document.body.classList.remove('interface-plus-183-card-open');

        var root = document.getElementById(BACKGROUND_ID);

        if (root) {
            root.classList.remove('loaded');

            var image = root.querySelector('.interface-plus-183-image');

            if (image) {
                image.style.backgroundImage = '';
            }
        }

        var logos = document.querySelectorAll('.interface-plus-183-logo');

        for (var i = 0; i < logos.length; i++) {
            logos[i].remove();
        }
    }

    function installListeners() {
        if (!window.Lampa || !Lampa.Listener) {
            setTimeout(installListeners, 300);
            return;
        }

        Lampa.Listener.follow('activity', function (event) {
            if (!event) return;

            if (event.type === 'start') {
                var name = '';

                if (event.object && event.object.activity) {
                    name = event.object.activity.component || '';
                }

                if (name === 'full') {
                    /*
                     * Не скидаємо картку тут:
                     * full може повторно повідомити про старт
                     * під час внутрішнього оновлення.
                     */
                    return;
                }

                stopCard();
            }
        });

        Lampa.Listener.follow('full', function (event) {
            if (!event) return;

            if (event.type !== 'complite' && event.type !== 'complete') {
                return;
            }

            requestAnimationFrame(function () {
                startCard(event);
            });
        });

        log('Listeners installed');
    }

    function initialize() {
        if (!document.body || !document.head) {
            setTimeout(initialize, 100);
            return;
        }

        addStyles();
        createBackground();
        installListeners();

        log('Initialized');
    }

    initialize();

})();
