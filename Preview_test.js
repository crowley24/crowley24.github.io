
(function () {
'use strict';

if (!window.Lampa || !window.$ || window.iptv_preview_test_ready) return;
window.iptv_preview_test_ready = true;

var CFG = {
    delay: 700,
    volume: 0.35
};

var timer = null;
var video = null;
var hls = null;
var panel = null;
var lastRow = null;
var token = 0;
var channels = [];
var currentListId = '';
var ticker = null;

var css =
'.iptv-preview-test{' +
'position:absolute;right:1.5%;bottom:3%;width:32%;max-width:480px;' +
'aspect-ratio:16/9;background:#080b10;border:2px solid rgba(255,255,255,.28);' +
'border-radius:12px;overflow:hidden;z-index:40;' +
'box-shadow:0 10px 40px rgba(0,0,0,.7);pointer-events:none}' +
'.iptv-preview-test video{' +
'width:100%;height:100%;object-fit:contain;background:#080b10}' +
'.iptv-preview-test__label{' +
'position:absolute;left:0;right:0;bottom:0;padding:10px 12px;' +
'background:linear-gradient(transparent,rgba(0,0,0,.9));' +
'color:white;font-size:15px}' +
'.iptv-preview-test__status{' +
'position:absolute;top:9px;left:9px;padding:4px 8px;' +
'border-radius:4px;background:rgba(0,0,0,.7);font-size:12px;color:white}';

var style = document.createElement('style');
style.id = 'iptv-preview-test-css';
style.textContent = css;
document.head.appendChild(style);

function log() {
    try {
        console.log.apply(
            console,
            ['[IPTV Preview Test]'].concat([].slice.call(arguments))
        );
    } catch (e) {}
}

function norm(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9а-яёіїєґ]+/g, '');
}

function storage(k, d) {
    try {
        var v = Lampa.Storage.get(k, d);
        return v == null ? d : v;
    } catch (e) {
        return d;
    }
}

function activeList() {
    var ls = storage('iptv_lists', []);
    if (!Array.isArray(ls)) return null;

    var id = storage('iptv_active', '');

    return ls.filter(function (x) {
        return x.id === id;
    })[0] || ls[0] || null;
}

function parseM3U(s) {
    var result = [];
    var current = null;
    var group = 'Без групи';

    String(s || '').split(/\r?\n/).forEach(function (line) {
        line = line.trim();

        if (line.indexOf('#EXTINF') === 0) {
            var m = /group-title="([^"]*)"/i.exec(line);

            group = m && m[1] || 'Без групи';

            current = {
                name: line.slice(line.lastIndexOf(',') + 1).trim(),
                group: group
            };
        } else if (line.indexOf('#EXTGRP:') === 0 && current) {
            current.group = line.slice(8).trim() || current.group;
        } else if (line && line[0] !== '#' && current) {
            current.url = line;
            result.push(current);
            current = null;
        }
    });

    return result;
}

function refreshPlaylist() {
    var list = activeList();

    if (!list) {
        channels = [];
        return;
    }

    if (currentListId === list.id && channels.length) return;

    currentListId = list.id;
    channels = parseM3U(storage('iptv_cache_' + list.id, ''));

    log('Каналів у кеші:', channels.length);
}

function channelFor(row) {
    refreshPlaylist();

    var title = row.querySelector('.iptv-v33__ch-name');
    if (!title) return null;

    var name = title.textContent.replace(/\s*★\s*$/, '').trim();
    var renamed = storage('iptv_names', {});
    var hidden = storage('iptv_hidden', []);
    var hiddenGroups = storage('iptv_hidden_groups', []);

    var candidates = channels.filter(function (ch) {
        return hidden.indexOf(ch.url) < 0 &&
            hiddenGroups.indexOf(ch.group) < 0 &&
            (renamed[ch.url] || ch.name) === name;
    });

    if (candidates.length === 1) return candidates[0];

    if (candidates.length > 1) {
        log('Неоднозначна назва:', name);
        return null;
    }

    var key = norm(name);

    candidates = channels.filter(function (ch) {
        return norm(renamed[ch.url] || ch.name) === key;
    });

    return candidates.length === 1 ? candidates[0] : null;
}

function stopPlayback() {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }

    token++;

    if (hls) {
        try {
            hls.destroy();
        } catch (e) {}

        hls = null;
    }

    if (video) {
        try {
            video.pause();
            video.removeAttribute('src');
            video.load();
        } catch (e) {}
    }
}

function removePanel() {
    stopPlayback();

    if (panel) {
        panel.remove();
        panel = null;
    }

    lastRow = null;
}

function status(s) {
    if (panel) {
        var el = panel.querySelector('.iptv-preview-test__status');
        if (el) el.textContent = s;
    }
}

function loadHls(done) {
    if (window.Hls) return done(true);

    var existing = document.getElementById('iptv-preview-hls-script');

    if (existing) {
        var count = 0;

        var wait = setInterval(function () {
            count++;

            if (window.Hls || count > 35) {
                clearInterval(wait);
                done(!!window.Hls);
            }
        }, 200);

        return;
    }

    var script = document.createElement('script');
    script.id = 'iptv-preview-hls-script';
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.15/dist/hls.min.js';

    script.onload = function () {
        done(!!window.Hls);
    };

    script.onerror = function () {
        done(false);
    };

    document.head.appendChild(script);
}

function ensurePanel() {
    var root = document.querySelector('.iptv-v33');

    if (!root) return false;

    if (panel && panel.parentNode === root) return true;

    if (panel) panel.remove();

    if (getComputedStyle(root).position === 'static') {
        root.style.position = 'relative';
    }

    panel = document.createElement('div');
    panel.className = 'iptv-preview-test';

    panel.innerHTML =
        '<video playsinline webkit-playsinline></video>' +
        '<div class="iptv-preview-test__status">Очікування</div>' +
        '<div class="iptv-preview-test__label"></div>';

    root.appendChild(panel);

    video = panel.querySelector('video');
    video.autoplay = true;
    video.muted = false;
    video.volume = CFG.volume;
    video.controls = false;

    video.setAttribute('playsinline', '');

    video.addEventListener('error', function () {
        status('Помилка відтворення');
    });

    return true;
}

function begin(row) {
    if (!document.body.contains(row) ||
        !row.classList.contains('focus') ||
        !ensurePanel()) {
        return;
    }

    var ch = channelFor(row);

    if (!ch) {
        status('Канал не знайдено у кеші M3U');
        return;
    }

    var label = panel.querySelector('.iptv-preview-test__label');
    label.textContent = ch.name;

    var request = ++token;
    var url = ch.url;

    status('Підключення…');

    video.volume = CFG.volume;
    video.muted = false;

    function start() {
        if (request !== token || !video) return;

        var p;

        try {
            p = video.play();
        } catch (e) {
            status('Помилка запуску');
            return;
        }

        if (p && p.then) {
            p.then(function () {
                if (request === token) {
                    status('LIVE · звук 35%');
                }
            }).catch(function (err) {
                if (request === token) {
                    status('Автозапуск заблоковано');
                    log('play():', err);
                }
            });
        }
    }

    var isHls = /\.m3u8(?:[?#]|$)/i.test(url) ||
        /\/hls\//i.test(url);

    if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        start();
        return;
    }

    if (isHls) {
        loadHls(function (ok) {
            if (request !== token) return;

            if (!ok || !window.Hls || !Hls.isSupported()) {
                status('HLS не підтримується');
                return;
            }

            try {
                hls = new Hls({
                    enableWorker: true,
                    maxBufferLength: 8,
                    backBufferLength: 0
                });

                hls.on(Hls.Events.MANIFEST_PARSED, function () {
                    if (request === token) start();
                });

                hls.on(Hls.Events.ERROR, function (event, data) {
                    if (request === token && data.fatal) {
                        status('Помилка HLS: ' + data.type);
                        log(data);
                    }
                });

                hls.loadSource(url);
                hls.attachMedia(video);
            } catch (e) {
                status('Помилка HLS');
                log(e);
            }
        });

        return;
    }

    video.src = url;
    start();
}

function inspect() {
    var root = document.querySelector('.iptv-v33');

    if (!root) {
        if (panel) removePanel();
        return;
    }

    if (!ensurePanel()) return;

    var row = root.querySelector('.iptv-v33__ch.focus');

    if (row === lastRow) return;

    lastRow = row;

    stopPlayback();

    if (!row) {
        status('Оберіть канал');
        return;
    }

    status('Очікування 700 мс…');

    timer = setTimeout(function () {
        timer = null;
        begin(row);
    }, CFG.delay);
}

function init() {
    if (ticker) return;

    ticker = setInterval(inspect, 180);

    document.addEventListener('keydown', function (e) {
        if (panel &&
            (e.key === 'Enter' ||
             e.key === 'OK' ||
             e.key === 'Backspace' ||
             e.key === 'Escape')) {
            stopPlayback();
        }
    }, true);

    log('Модуль готовий');
}

if (window.appready) {
    init();
} else if (Lampa.Listener && Lampa.Listener.follow) {
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
} else {
    init();
}

})();
