// ==Lampa==
// name: IPTV PRO (XMLTV Edition)
// version: 12.8

(function () {
    'use strict';

    if (!window.Lampa || !window.$) return;

    var KEY = 'iptv_pro_v12';

    var defaults = {
        playlists: [{
            name: 'TEST',
            url: 'https://m3u.ch/pl/61b9ea4e90c4cf3165a4d19656e126a8_cf72fbb9e7ee647289c76620f1df15b4.m3u'
        }],
        epg_url: 'http://only4.tv/epg/epg.xml',
        favorites: [],
        current_pl_index: 0
    };

    var cfg = Lampa.Storage.get(KEY, defaults) || defaults;

    if (!Array.isArray(cfg.playlists) || !cfg.playlists.length) {
        cfg.playlists = defaults.playlists;
    }

    if (!Array.isArray(cfg.favorites)) {
        cfg.favorites = [];
    }

    cfg.epg_url = 'http://only4.tv/epg/epg.xml';

    Lampa.Storage.set(KEY, cfg);

    var EPG = {
        status: 'Очікування',
        channels: {},
        aliases: {},
        loaded: 0,
        request: null,
        error: ''
    };

    function norm(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/&amp;/g, '&')
            .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function stamp(s) {
        var m = String(s || '').match(
            /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?\s*([+-])(\d\d)(\d\d)/
        );

        if (!m) return NaN;

        var t = Date.UTC(
            +m[1],
            +m[2] - 1,
            +m[3],
            +m[4],
            +m[5],
            +(m[6] || 0)
        );

        var off = (+m[8] * 60 + +m[9]) * 60000;

        return t + (m[7] === '+' ? -off : off);
    }

    function txt(node, tag) {
        var el = node.getElementsByTagName(tag)[0];

        return el ? (el.textContent || '').trim() : '';
    }

    function epgLoad(done, force) {
        if (
            !force &&
            EPG.loaded &&
            Date.now() - EPG.loaded < 3 * 3600000
        ) {
            if (done) done();
            return;
        }

        if (EPG.request) {
            if (done) done();
            return;
        }

        EPG.status = 'Завантаження EPG...';
        EPG.error = '';

        EPG.request = $.ajax({
            url: cfg.epg_url,
            method: 'GET',
            dataType: 'text',
            timeout: 45000,

            success: function (body) {
                try {
                    var xml = $.parseXML(body);
                    var ch = xml.getElementsByTagName('channel');
                    var pr = xml.getElementsByTagName('programme');

                    var map = {};
                    var aliases = {};

                    for (var i = 0; i < ch.length; i++) {
                        var id = ch[i].getAttribute('id');

                        if (!id) continue;

                        map[id] = [];
                        aliases[norm(id)] = id;

                        var names = ch[i].getElementsByTagName('display-name');

                        for (var j = 0; j < names.length; j++) {
                            aliases[norm(names[j].textContent)] = id;
                        }
                    }

                    for (var k = 0; k < pr.length; k++) {
                        var p = pr[k];
                        var cid = p.getAttribute('channel');

                        if (!cid) continue;

                        if (!map[cid]) map[cid] = [];

                        var start = stamp(p.getAttribute('start'));
                        var stop = stamp(p.getAttribute('stop'));

                        if (
                            !isFinite(start) ||
                            !isFinite(stop) ||
                            stop <= start
                        ) {
                            continue;
                        }

                        map[cid].push({
                            start: start,
                            stop: stop,
                            title: txt(p, 'title'),
                            desc: txt(p, 'desc')
                        });
                    }

                    Object.keys(map).forEach(function (id) {
                        map[id].sort(function (a, b) {
                            return a.start - b.start;
                        });
                    });

                    EPG.channels = map;
                    EPG.aliases = aliases;
                    EPG.loaded = Date.now();
                    EPG.status = 'EPG: ' + Object.keys(map).length + ' каналів';

                } catch (e) {
                    EPG.status = 'Помилка XMLTV';
                    EPG.error = String(e.message || e);
                }
            },

            error: function (xhr, status, err) {
                EPG.status = 'EPG недоступний';

                EPG.error =
                    status +
                    (err ? ' / ' + err : '') +
                    ' (HTTP ' +
                    (xhr.status || 0) +
                    ')';
            },

            complete: function () {
                EPG.request = null;

                if (done) done();
            }
        });
    }

    function findPrograms(c) {
        var id = EPG.channels[c.tvg_id]
            ? c.tvg_id
            : (
                EPG.aliases[norm(c.tvg_id)] ||
                EPG.aliases[norm(c.name)]
            );

        var arr = EPG.channels[id] || [];
        var now = Date.now();
        var current = null;
        var next = null;

        for (var i = 0; i < arr.length; i++) {
            if (arr[i].start <= now && arr[i].stop > now) {
                current = arr[i];
            } else if (arr[i].start > now) {
                next = arr[i];
                break;
            }
        }

        return {
            current: current,
            next: next,
            id: id
        };
    }

    function clock(t) {
        var d = new Date(t);

        return (
            ('0' + d.getHours()).slice(-2) +
            ':' +
            ('0' + d.getMinutes()).slice(-2)
        );
    }

    function IPTVComponent() {
        var self = this;

        var root;
        var colG;
        var colC;
        var colE;

        var groups = {};
        var names = [];
        var list = [];

        var active = 'groups';
        var gi = 0;
        var ci = 0;

        var chosen = null;
        var timer = null;
        var plRequest = null;
        var alive = true;

        function item(text, cls) {
            return $('<div></div>')
                .addClass(cls || 'iptv-item')
                .text(text);
        }

        function focus() {
            if (!root) return;

            root.find('.iptv-item').removeClass('active');

            var target = (
                active === 'groups' ? colG : colC
            ).find('.iptv-item').eq(
                active === 'groups' ? gi : ci
            );

            target.addClass('active');

            if (
                target.length &&
                target[0].scrollIntoView
            ) {
                target[0].scrollIntoView({
                    block: 'nearest'
                });
            }
        }

        function details(c) {
            if (!c || !colE) return;

            chosen = c;
            colE.empty();

            var box = $('<div class="iptv-details"></div>');

            if (c.logo) {
                box.append(
                    $('<img class="iptv-large-logo">')
                        .attr('src', c.logo)
                );
            }

            box.append(item(c.name, 'iptv-heading'));

            var epg = item('', 'iptv-muted');

            box.append(epg);

            var data = findPrograms(c);
            var p = data.current;
            var n = data.next;

            if (!EPG.loaded) {
                epg.text(
                    EPG.status +
                    (EPG.error ? ' — ' + EPG.error : '')
                );
            } else if (!p && !n) {
                epg.text('Програма для цього каналу не знайдена');
            }

            if (p) {
                box.append(item('ЗАРАЗ В ЕФІРІ', 'iptv-blue'));

                box.append(
                    item(p.title || 'Без назви', 'iptv-program')
                );

                box.append(
                    item(
                        clock(p.start) + ' – ' + clock(p.stop),
                        'iptv-muted'
                    )
                );

                var progress = $(
                    '<div class="iptv-progress"><div></div></div>'
                );

                progress.children().css(
                    'width',
                    Math.min(
                        100,
                        Math.max(
                            0,
                            (Date.now() - p.start) /
                            (p.stop - p.start) * 100
                        )
                    ) + '%'
                );

                box.append(progress);

                if (p.desc) {
                    box.append(item(p.desc, 'iptv-description'));
                }
            }

            if (n) {
                box.append(item('ДАЛІ В ЕФІРІ', 'iptv-blue'));

                box.append(
                    item(n.title || 'Без назви', 'iptv-program')
                );

                box.append(
                    item(
                        clock(n.start) + ' – ' + clock(n.stop),
                        'iptv-muted'
                    )
                );
            }

            box.append(
                item(
                    'TVG-ID: ' + (c.tvg_id || 'не задано'),
                    'iptv-id'
                )
            );

            colE.append(box);
        }

        function renderGroups() {
            colG.empty();

            names = Object.keys(groups);

            names.forEach(function (name, i) {
                var el = item(name);

                el.on('click hover:enter', function () {
                    gi = i;
                    renderChannels(groups[name]);
                });

                colG.append(el);
            });

            focus();
        }

        function renderChannels(channels) {
            list = channels || [];
            ci = 0;
            active = 'channels';

            colC.empty();

            list.forEach(function (c, i) {
                var el = $('<div class="iptv-item iptv-channel"></div>');

                if (c.logo) {
                    el.append(
                        $('<img class="iptv-logo">')
                            .attr('src', c.logo)
                    );
                }

                el.append(item(c.name, 'iptv-channel-name'));

                el.on('hover:focus mouseenter', function () {
                    ci = i;
                    details(c);
                    focus();
                });

                el.on('click hover:enter', function () {
                    ci = i;
                    details(c);
                    play(c);
                });

                colC.append(el);
            });

            if (list.length) {
                details(list[0]);
            } else {
                colE.empty().append(
                    item('У цій групі немає каналів', 'iptv-muted')
                );
            }

            focus();
        }

        function play(c) {
            if (c && c.url) {
                Lampa.Player.play({
                    url: c.url,
                    title: c.name
                });
            }
        }

        function parse(body) {
            groups = {
                '⭐ Обране': []
            };

            var lines = String(body || '').split(/\r?\n/);
            var pending = null;

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();

                if (line.indexOf('#EXTINF') === 0) {
                    var comma = line.indexOf(',');

                    pending = {
                        name: comma >= 0
                            ? line.slice(comma + 1).trim()
                            : 'Без назви',

                        group: (
                            line.match(/group-title="([^"]*)"/i) || []
                        )[1] || 'ЗАГАЛЬНІ',

                        logo: (
                            line.match(/tvg-logo="([^"]*)"/i) || []
                        )[1] || '',

                        tvg_id: (
                            line.match(/tvg-id="([^"]*)"/i) || []
                        )[1] || ''
                    };

                } else if (
                    pending &&
                    /^https?:\/\//i.test(line)
                ) {
                    pending.url = line;

                    if (!groups[pending.group]) {
                        groups[pending.group] = [];
                    }

                    groups[pending.group].push(pending);

                    pending = null;
                }
            }

            var fav = {};

            cfg.favorites.forEach(function (f) {
                if (f && f.url) fav[f.url] = true;
            });

            Object.keys(groups).forEach(function (g) {
                groups[g].forEach(function (c) {
                    if (fav[c.url]) {
                        groups['⭐ Обране'].push(c);
                    }
                });
            });

            renderGroups();

            if (names.length) {
                gi = names.length > 1 ? 1 : 0;
                renderChannels(groups[names[gi]]);
            }
        }

        function load() {
            var pl = cfg.playlists[cfg.current_pl_index] ||
                cfg.playlists[0];

            colG.empty().append(
                item('Завантаження плейлиста...', 'iptv-muted')
            );

            plRequest = $.ajax({
                url: pl.url,
                dataType: 'text',
                timeout: 30000,

                success: function (data) {
                    if (alive) parse(data);
                },

                error: function () {
                    if (alive) {
                        colG.empty().append(
                            item(
                                'Помилка завантаження плейлиста',
                                'iptv-muted'
                            )
                        );

                        Lampa.Noty.show(
                            'Не вдалося завантажити IPTV плейлист'
                        );
                    }
                }
            });
        }

        this.create = function () {
            alive = true;

            root = $('<div class="iptv-root"></div>');

            var flex = $('<div class="iptv-flex"></div>');

            colG = $('<div class="iptv-col iptv-groups"></div>');
            colC = $('<div class="iptv-col iptv-channels"></div>');
            colE = $('<div class="iptv-col iptv-info"></div>');

            flex.append(colG, colC, colE);
            root.append(flex);

            if (!$('#iptv-pro-128-css').length) {
                $('head').append(
                    '<style id="iptv-pro-128-css">' +

                    '.iptv-root{' +
                    'position:fixed;inset:0;z-index:1000;' +
                    'background:#0b0d10;color:#fff;' +
                    'padding-top:4rem;box-sizing:border-box' +
                    '}' +

                    '.iptv-flex{' +
                    'display:flex;width:100%;height:100%;overflow:hidden' +
                    '}' +

                    '.iptv-col{' +
                    'height:100%;box-sizing:border-box;' +
                    'overflow-y:auto;min-width:0' +
                    '}' +

                    '.iptv-groups{' +
                    'width:22%;border-right:1px solid #30343b' +
                    '}' +

                    '.iptv-channels{' +
                    'width:43%;border-right:1px solid #30343b' +
                    '}' +

                    '.iptv-info{' +
                    'width:35%;padding:1.4rem;background:#080a0d' +
                    '}' +

                    '.iptv-item{' +
                    'padding:1rem;margin:.3rem;border-radius:.5rem;' +
                    'background:rgba(255,255,255,.04);cursor:pointer' +
                    '}' +

                    '.iptv-item.active{' +
                    'background:#2962ff' +
                    '}' +

                    '.iptv-channel{' +
                    'display:flex;align-items:center;gap:1rem' +
                    '}' +

                    '.iptv-logo{' +
                    'width:42px;height:42px;object-fit:contain;flex-shrink:0' +
                    '}' +

                    '.iptv-channel-name{' +
                    'overflow:hidden;text-overflow:ellipsis;' +
                    'white-space:nowrap;font-size:1.2rem' +
                    '}' +

                    '.iptv-large-logo{' +
                    'max-width:100%;width:100%;height:110px;object-fit:contain' +
                    '}' +

                    '.iptv-heading{' +
                    'font-size:1.6rem;font-weight:700;margin:1rem 0' +
                    '}' +

                    '.iptv-blue{' +
                    'color:#6691ff;font-weight:700;margin:1.2rem 0 .5rem' +
                    '}' +

                    '.iptv-program{' +
                    'font-size:1.3rem;margin:.4rem 0' +
                    '}' +

                    '.iptv-muted{' +
                    'color:#9da5b2;font-size:1rem' +
                    '}' +

                    '.iptv-description{' +
                    'color:#b9bec8;font-size:.95rem;margin-top:1rem' +
                    '}' +

                    '.iptv-id{' +
                    'font-size:.8rem;color:#747d8a;' +
                    'margin-top:2rem;word-break:break-word' +
                    '}' +

                    '.iptv-progress{' +
                    'height:5px;background:#30343b;border-radius:4px;' +
                    'margin-top:.8rem;overflow:hidden' +
                    '}' +

                    '.iptv-progress>div{' +
                    'height:100%;background:#2962ff' +
                    '}' +

                    '</style>'
                );
            }

            load();

            epgLoad(function () {
                if (alive && chosen) details(chosen);
            });

            timer = setInterval(function () {
                if (alive && chosen) details(chosen);
            }, 60000);

            return root;
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active === 'groups') {
                        gi = Math.max(0, gi - 1);
                    } else {
                        ci = Math.max(0, ci - 1);
                    }

                    focus();

                    if (active === 'channels' && list[ci]) {
                        details(list[ci]);
                    }
                },

                down: function () {
                    if (active === 'groups') {
                        gi = Math.min(names.length - 1, gi + 1);
                    } else {
                        ci = Math.min(list.length - 1, ci + 1);
                    }

                    focus();

                    if (active === 'channels' && list[ci]) {
                        details(list[ci]);
                    }
                },

                right: function () {
                    if (active === 'groups' && names[gi]) {
                        renderChannels(groups[names[gi]]);
                    }
                },

                left: function () {
                    if (active === 'channels') {
                        active = 'groups';
                        focus();
                    }
                },

                enter: function () {
                    if (active === 'groups' && names[gi]) {
                        renderChannels(groups[names[gi]]);
                    } else if (list[ci]) {
                        play(list[ci]);
                    }
                },

                back: function () {
                    if (active === 'channels') {
                        active = 'groups';
                        focus();
                    } else {
                        Lampa.Activity.backward();
                    }
                }
            });

            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = function () {
            return root;
        };

        this.destroy = function () {
            alive = false;

            if (timer) clearInterval(timer);

            if (plRequest && plRequest.readyState !== 4) {
                plRequest.abort();
            }

            Lampa.Controller.remove('iptv_pro');

            if (root) root.remove();
        };
    }

    function init() {
        if (window.__iptv_pro_128_initialized) return;

        window.__iptv_pro_128_initialized = true;

        Lampa.Component.add('iptv_pro', IPTVComponent);

        var menu = $('.menu .menu__list');

        if (!menu.length) return;

        var entry = $(
            '<li class="menu__item selector iptv-pro-menu">' +
                '<div class="menu__text">IPTV PRO</div>' +
            '</li>'
        );

        entry.on('hover:enter click', function () {
            Lampa.Activity.push({
                title: 'IPTV PRO',
                component: 'iptv_pro'
            });
        });

        menu.append(entry);
    }

    if (window.app_ready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
