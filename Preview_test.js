
(function () {
    'use strict';

    if (!window.Lampa || !window.$ || window.iptv_preview_test_ready) return;
    window.iptv_preview_test_ready = true;

    /*
     * IPTV PREVIEW TEST 2.0
     * Lampa / Android TV / WebView
     *
     * Features:
     * - Preview after 850 ms
     * - Muted autoplay fallback
     * - Attempts to enable sound at 35%
     * - HLS support via hls.js
     * - Right-side preview panel
     * - Automatic stream cleanup
     * - Does not intercept OK / Enter
     */

    var CFG = {
        delay: 850,
        volume: 0.35,
        pollInterval: 180,
        hlsMaxBuffer: 8,
        hlsBackBuffer: 0
    };

    var timer = null;
    var video = null;
    var hls = null;
    var panel = null;
    var lastRow = null;
    var ticker = null;
    var token = 0;
    var channels = [];
    var currentListId = '';
    var currentUrl = '';
    var destroyed = false;

    var css =
        '.iptv-preview-test{' +
            'position:absolute;' +
            'right:1.5%;' +
            'top:10%;' +
            'width:32%;' +
            'max-width:420px;' +
            'min-width:180px;' +
            'aspect-ratio:16/9;' +
            'background:#080b10;' +
            'border:1px solid rgba(255,255,255,.35);' +
            'border-radius:8px;' +
            'overflow:hidden;' +
            'z-index:9999;' +
            'box-shadow:0 5px 22px rgba(0,0,0,.65);' +
            'pointer-events:none;' +
        '}' +
        '.iptv-preview-test video{' +
            'display:block;' +
            'width:100%;' +
            'height:100%;' +
            'object-fit:contain;' +
            'background:#080b10;' +
        '}' +
        '.iptv-preview-test__label{' +
            'position:absolute;' +
            'left:0;right:0;bottom:0;' +
            'padding:18px 8px 6px;' +
            'background:linear-gradient(transparent,rgba(0,0,0,.9));' +
            'color:white;font-size:12px;' +
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
        '}' +
        '.iptv-preview-test__status{' +
            'position:absolute;top:5px;left:5px;' +
            'max-width:90%;padding:3px 5px;' +
            'border-radius:4px;' +
            'background:rgba(0,0,0,.75);' +
            'font-size:10px;color:white;' +
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
        '}' +
        '@media (max-width:699px){' +
            '.iptv-preview-test{' +
                'width:42%;min-width:130px;right:1%;top:5%;' +
            '}' +
            '.iptv-preview-test__label{font-size:10px;}' +
            '.iptv-preview-test__status{font-size:9px;}' +
        '}';

    function log() {
        try {
            console.log.apply(
                console,
                ['[IPTV Preview Test 2.0]'].concat(
                    [].slice.call(arguments)
                )
            );
        } catch (e) {}
    }

    function norm(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/[^a-z0-9а-яёіїєґ]+/g, '');
    }

    function storage(key, fallback) {
        try {
            var value = Lampa.Storage.get(key, fallback);
            return value == null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function activeList() {
        var lists = storage('iptv_lists', []);

        if (!Array.isArray(lists)) return null;

        var id = storage('iptv_active', '');

        return lists.filter(function (item) {
            return item && item.id === id;
        })[0] || lists[0] || null;
    }

    function parseM3U(source) {
        var result = [];
        var current = null;
        var group = 'Без групи';

        String(source || '').split(/\r?\n/).forEach(function (line) {
            line = line.trim();

            if (line.indexOf('#EXTINF') === 0) {
                var match = /group-title="([^"]*)"/i.exec(line);

                group = match && match[1] ?
                    match[1] : 'Без групи';

                var comma = line.lastIndexOf(',');

                current = {
                    name: comma >= 0 ?
                        line.slice(comma + 1).trim() : '',
                    group: group
                };
            } else if (line.indexOf('#EXTGRP:') === 0 && current) {
                current.group =
                    line.slice(8).trim() || current.group;
            } else if (
                line &&
                line.charAt(0) !== '#' &&
                current
            ) {
                current.url = line;

                if (current.url) {
                    result.push(current);
                }

                current = null;
            }
        });

        return result;
    }

    function refreshPlaylist() {
        var list = activeList();

        if (!list) {
            channels = [];
            currentListId = '';
            return;
        }

        var source = storage('iptv_cache_' + list.id, '');

        if (
            currentListId === list.id &&
            channels.length &&
            refreshPlaylist.lastSource === source
        ) {
            return;
        }

        currentListId = list.id;
        refreshPlaylist.lastSource = source;
        channels = parseM3U(source);

        log('Каналів у кеші:', channels.length);
    }

    function getTitle(row) {
        if (!row) return null;

        return row.querySelector(
            '.iptv-v33__ch-name, ' +
            '.iptv-v3__ch-name, ' +
            '.iptv-channel__name, ' +
            '.iptv__ch-name, ' +
            '[class*="ch-name"], ' +
            '[class*="channel-name"]'
        );
    }

    function channelFor(row) {
        refreshPlaylist();

        var title = getTitle(row);

        if (!title) return null;

        var name = title.textContent
            .replace(/\s*★\s*$/, '')
            .trim();

        var renamed = storage('iptv_names', {});
        var hidden = storage('iptv_hidden', []);
        var hiddenGroups = storage('iptv_hidden_groups', []);

        if (!renamed || typeof renamed !== 'object') {
            renamed = {};
        }

        if (!Array.isArray(hidden)) hidden = [];
        if (!Array.isArray(hiddenGroups)) hiddenGroups = [];

        function isVisible(ch) {
            return hidden.indexOf(ch.url) < 0 &&
                hiddenGroups.indexOf(ch.group) < 0;
        }

        function displayName(ch) {
            return renamed[ch.url] || ch.name;
        }

        var candidates = channels.filter(function (ch) {
            return isVisible(ch) && displayName(ch) === name;
        });

        if (candidates.length === 1) return candidates[0];

        if (candidates.length > 1) {
            log('Неоднозначна назва:', name);
            return null;
        }

        var key = norm(name);

        candidates = channels.filter(function (ch) {
            return isVisible(ch) && norm(displayName(ch)) === key;
        });

        if (candidates.length === 1) return candidates[0];

        if (candidates.length > 1) {
            log('Неоднозначна нормалізована назва:', name);
        }

        return null;
    }

    function setStatus(message) {
        if (!panel) return;

        var el = panel.querySelector(
            '.iptv-preview-test__status'
        );

        if (el) el.textContent = message;
    }

    function setLabel(message) {
        if (!panel) return;

        var el = panel.querySelector(
            '.iptv-preview-test__label'
        );

        if (el) el.textContent = message || '';
    }

    function stopPlayback() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }

        token++;
        currentUrl = '';

        if (hls) {
            try {
                hls.destroy();
            } catch (e) {
                log('HLS cleanup:', e);
            }

            hls = null;
        }

        if (video) {
            try {
                video.pause();
                video.removeAttribute('src');
                video.load();
            } catch (e) {
                log('Video cleanup:', e);
            }
        }
    }

    function removePanel() {
        stopPlayback();

        if (panel) {
            try {
                panel.remove();
            } catch (e) {}

            panel = null;
        }

        lastRow = null;
        video = null;
    }

    function loadHls(done) {
        if (window.Hls) {
            done(true);
            return;
        }

        var existing = document.getElementById(
            'iptv-preview-hls-script'
        );

        if (existing) {
            var count = 0;

            var wait = setInterval(function () {
                count++;

                if (window.Hls || count >= 40) {
                    clearInterval(wait);
                    done(!!window.Hls);
                }
            }, 200);

            return;
        }

        var script = document.createElement('script');

        script.id = 'iptv-preview-hls-script';
        script.src =
            'https://cdn.jsdelivr.net/npm/hls.js@1.6.15/dist/hls.min.js';

        script.onload = function () {
            done(!!window.Hls);
        };

        script.onerror = function () {
            done(false);
        };

        document.head.appendChild(script);
    }

    function findRoot() {
        var selectors = [
            '.iptv-v33',
            '.iptv-v3',
            '.iptv-list',
            '.iptv'
        ];

        for (var i = 0; i < selectors.length; i++) {
            var elements = document.querySelectorAll(selectors[i]);

            for (var j = 0; j < elements.length; j++) {
                var el = elements[j];

                if (
                    el &&
                    el.isConnected &&
                    el.getClientRects().length
                ) {
                    return el;
                }
            }
        }

        return null;
    }

    function findFocusedRow(root) {
        if (!root) return null;

        return root.querySelector(
            '.iptv-v33__ch.focus, ' +
            '.iptv-v3__ch.focus, ' +
            '.iptv-channel.focus, ' +
            '.iptv__channel.focus, ' +
            '.iptv-v33__ch.focused, ' +
            '.iptv-v3__ch.focused, ' +
            '.iptv-channel.focused, ' +
            '.iptv__channel.focused'
        );
    }

    function ensurePanel() {
        var root = findRoot();

        if (!root) return false;

        if (panel && panel.parentNode === root) {
            return true;
        }

        if (panel) {
            panel.remove();
            panel = null;
        }

        var position = window.getComputedStyle(root).position;

        if (position === 'static') {
            root.style.position = 'relative';
        }

        panel = document.createElement('div');
        panel.className = 'iptv-preview-test';

        panel.innerHTML =
            '<video playsinline webkit-playsinline></video>' +
            '<div class="iptv-preview-test__status">' +
                'Оберіть канал' +
            '</div>' +
            '<div class="iptv-preview-test__label"></div>';

        root.appendChild(panel);

        video = panel.querySelector('video');

        video.autoplay = false;
        video.muted = true;
        video.defaultMuted = true;
        video.volume = CFG.volume;
        video.controls = false;
        video.playsInline = true;

        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('muted', '');

        video.addEventListener('error', function () {
            if (video && video.error) {
                setStatus(
                    'Помилка відео: ' + video.error.code
                );
            } else {
                setStatus('Помилка відтворення');
            }
        });

        video.addEventListener('playing', function () {
            if (video && !video.paused) {
                log('Відео почало відтворення');
            }
        });

        return true;
    }

    function enableSound(request) {
        if (
            request !== token ||
            !video ||
            video.paused
        ) {
            return;
        }

        try {
            video.volume = CFG.volume;
            video.muted = false;

            video.removeAttribute('muted');

            if (video.muted) {
                setStatus('LIVE · без звуку');
                return;
            }

            setStatus('LIVE · звук 35%');
        } catch (e) {
            log('Не вдалося ввімкнути звук:', e);
            setStatus('LIVE · без звуку');
        }
    }

    function playVideo(request) {
        if (request !== token || !video) return;

        var playPromise;

        /*
         * First attempt: muted playback.
         * Muted autoplay is generally more permissive
         * than autoplay with sound.
         */

        try {
            video.muted = true;
            video.setAttribute('muted', '');
            video.volume = CFG.volume;

            playPromise = video.play();
        } catch (e) {
            log('Muted play failed:', e);
            setStatus('Не вдалося запустити відео');
            return;
        }

        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(function () {
                if (request !== token) return;

                /*
                 * Video has started.
                 * Now try to enable audio.
                 */

                enableSound(request);

            }).catch(function (err) {
                if (request !== token) return;

                log('Muted play rejected:', err);

                if (err && err.name === 'NotAllowedError') {
                    setStatus(
                        'Автозапуск заблоковано навіть без звуку'
                    );
                } else if (err && err.name === 'NotSupportedError') {
                    setStatus('Формат потоку не підтримується');
                } else {
                    setStatus('Не вдалося запустити відео');
                }
            });
        } else {
            /*
             * Older WebViews may not return a Promise.
             * Playback cannot be confirmed reliably here.
             */

            setTimeout(function () {
                if (request !== token || !video) return;

                if (!video.paused && video.readyState > 0) {
                    enableSound(request);
                } else {
                    setStatus('Перевірка запуску відео');
                }
            }, 500);
        }
    }

    function begin(row) {
        if (
            destroyed ||
            !row ||
            !document.body.contains(row) ||
            !row.matches('.focus, .focused') ||
            !ensurePanel()
        ) {
            return;
        }

        var ch = channelFor(row);

        if (!ch || !ch.url) {
            setLabel('');
            setStatus('Канал не знайдено у кеші M3U');
            return;
        }

        if (currentUrl === ch.url && video && !video.paused) {
            return;
        }

        stopPlayback();

        var request = ++token;
        var url = ch.url;

        currentUrl = url;

        setLabel(ch.name);
        setStatus('Підключення…');

        video.muted = true;
        video.setAttribute('muted', '');
        video.volume = CFG.volume;

        var isHls =
            /\.m3u8(?:[?#]|$)/i.test(url) ||
            /\/hls\//i.test(url);

        /*
         * Native HLS support.
         */

        if (
            isHls &&
            video.canPlayType('application/vnd.apple.mpegurl')
        ) {
            video.src = url;

            try {
                video.load();
            } catch (e) {}

            playVideo(request);
            return;
        }

        /*
         * HLS.js fallback for browsers without native HLS.
         */

        if (isHls) {
            loadHls(function (ok) {
                if (request !== token || !video) return;

                if (!ok || !window.Hls) {
                    setStatus('Не вдалося завантажити HLS');
                    return;
                }

                if (!window.Hls.isSupported()) {
                    setStatus('HLS не підтримується');
                    return;
                }

                try {
                    hls = new window.Hls({
                        enableWorker: true,
                        maxBufferLength: CFG.hlsMaxBuffer,
                        backBufferLength: CFG.hlsBackBuffer
                    });

                    hls.on(
                        window.Hls.Events.MANIFEST_PARSED,
                        function () {
                            if (request !== token) return;

                            playVideo(request);
                        }
                    );

                    hls.on(
                        window.Hls.Events.ERROR,
                        function (event, data) {
                            if (request !== token || !data) return;

                            if (data.fatal) {
                                log('Fatal HLS error:', data);

                                if (
                                    data.type ===
                                    window.Hls.ErrorTypes.NETWORK_ERROR
                                ) {
                                    setStatus('Помилка мережі HLS');
                                } else if (
                                    data.type ===
                                    window.Hls.ErrorTypes.MEDIA_ERROR
                                ) {
                                    setStatus('Помилка декодування HLS');
                                } else {
                                    setStatus('Критична помилка HLS');
                                }

                                /*
                                 * Do not endlessly retry fatal errors.
                                 * Cleanup occurs on channel change or exit.
                                 */
                            }
                        }
                    );

                    hls.loadSource(url);
                    hls.attachMedia(video);

                } catch (e) {
                    log('HLS initialization error:', e);
                    setStatus('Помилка запуску HLS');
                }
            });

            return;
        }

        /*
         * Direct video stream.
         */

        video.src = url;

        try {
            video.load();
        } catch (e) {}

        playVideo(request);
    }

    function inspect() {
        if (destroyed) return;

        var root = findRoot();

        if (!root) {
            if (panel) removePanel();
            lastRow = null;
            return;
        }

        if (!ensurePanel()) return;

        var row = findFocusedRow(root);

        if (row === lastRow) return;

        lastRow = row;

        stopPlayback();

        if (!row) {
            setLabel('');
            setStatus('Оберіть канал');
            return;
        }

        setStatus('Очікування ' + CFG.delay + ' мс…');

        timer = setTimeout(function () {
            timer = null;

            if (
                destroyed ||
                row !== lastRow ||
                !document.body.contains(row) ||
                !row.matches('.focus, .focused')
            ) {
                return;
            }

            begin(row);

        }, CFG.delay);
    }

    function init() {
        if (ticker || destroyed) return;

        var oldStyle = document.getElementById(
            'iptv-preview-test-css'
        );

        if (!oldStyle) {
            var style = document.createElement('style');
            style.id = 'iptv-preview-test-css';
            style.textContent = css;
            document.head.appendChild(style);
        }

        ticker = setInterval(inspect, CFG.pollInterval);

        log('Модуль готовий');
    }

    function destroy() {
        destroyed = true;

        if (ticker) {
            clearInterval(ticker);
            ticker = null;
        }

        removePanel();

        log('Модуль зупинено');
    }

    /*
     * Optional public controls for debugging.
     */

    window.iptv_preview_test_stop = function () {
        stopPlayback();

        if (panel) {
            setLabel('');
            setStatus('Зупинено');
        }
    };

    window.iptv_preview_test_destroy = destroy;

    /*
     * Initialize after Lampa is ready.
     */

    if (window.appready) {
        init();
    } else if (Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') init();
        });
    } else {
        init();
    }

})();
