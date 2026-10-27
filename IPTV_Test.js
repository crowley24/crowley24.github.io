// ==Lampa==
// name: IPTV PRO (XMLTV Edition)
// version: 13.0

(function () {
    'use strict';

    if (!window.Lampa || !window.$) return;

    /*
     * IPTV PRO 13.0 PREMIUM
     *
     * Збережено:
     * - Сумісність зі сховищем iptv_pro_v12
     * - Формат плейлистів M3U
     * - Cloudflare XMLTV Worker
     * - Поточну систему груп і каналів
     * - Lampa.Player.play()
     *
     * Нове:
     * - Преміальний інтерфейс
     * - Ручне оновлення EPG
     * - Панель налаштувань
     * - Панель діагностики
     * - Захист від паралельних оновлень
     * - Збереження останнього успішного EPG у пам'яті
     * - Статистика каналів і передач
     * - Контроль життєвого циклу компонента
     */

    var KEY = 'iptv_pro_v12';

    var EPG_URL =
        'https://iptv-epg-proxy.unclezhenya24.workers.dev/epg.xml';

    var CACHE_TTL = 3 * 60 * 60 * 1000;

    var defaults = {
        playlists: [{
            name: 'TEST',
            url: 'https://m3u.ch/pl/61b9ea4e90c4cf3165a4d19656e126a8_cf72fbb9e7ee647289c76620f1df15b4.m3u'
        }],
        epg_url: EPG_URL,
        favorites: [],
        current_pl_index: 0
    };

    var cfg = Lampa.Storage.get(KEY, defaults) || {};

    if (!Array.isArray(cfg.playlists) || !cfg.playlists.length) {
        cfg.playlists = defaults.playlists.slice();
    }

    if (!Array.isArray(cfg.favorites)) {
        cfg.favorites = [];
    }

    if (
        typeof cfg.current_pl_index !== 'number' ||
        cfg.current_pl_index < 0 ||
        cfg.current_pl_index >= cfg.playlists.length
    ) {
        cfg.current_pl_index = 0;
    }

    // Не змінюємо джерело EPG на старий HTTP-адрес.
    cfg.epg_url = EPG_URL;

    Lampa.Storage.set(KEY, cfg);

    /*
     * EPG MANAGER
     *
     * channels і aliases зберігають останні успішні дані.
     * Помилка нового запиту не очищає робочий розклад.
     */

    var EPG = {
        status: 'Очікування',
        channels: {},
        aliases: {},
        loaded: 0,
        request: null,
        error: '',
        httpStatus: 0,
        channelCount: 0,
        programmeCount: 0,
        matchedChannels: 0,
        unmatchedChannels: 0,
        lastAttempt: 0,
        lastSuccess: 0,
        lastDuration: 0,
        lastResult: 'Ще не завантажувалось',
        loading: false,
        refreshQueued: false,
        callbacks: []
    };

    var globalAlive = true;

    function now() {
        return Date.now();
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'Немає даних';

        try {
            var d = new Date(timestamp);

            return (
                ('0' + d.getDate()).slice(-2) + '.' +
                ('0' + (d.getMonth() + 1)).slice(-2) + '.' +
                d.getFullYear() + ' ' +
                ('0' + d.getHours()).slice(-2) + ':' +
                ('0' + d.getMinutes()).slice(-2) + ':' +
                ('0' + d.getSeconds()).slice(-2)
            );
        } catch (e) {
            return 'Невідомо';
        }
    }

    function durationText(ms) {
        if (!isFinite(ms) || ms < 0) return 'Невідомо';

        if (ms < 1000) return ms + ' мс';

        return (ms / 1000).toFixed(1) + ' с';
    }

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

    function safeCall(fn) {
        if (typeof fn !== 'function') return;

        try {
            fn();
        } catch (e) {
            console.error('[IPTV PRO 13.0] Callback error:', e);
        }
    }

    function finishCallbacks() {
        var list = EPG.callbacks.slice();

        EPG.callbacks = [];

        list.forEach(function (fn) {
            safeCall(fn);
        });
    }

    function parseEPG(body) {
        if (!body || !String(body).trim()) {
            throw new Error('Отримано порожню відповідь');
        }

        var xml = $.parseXML(body);

        if (!xml) {
            throw new Error('Не вдалося розібрати XML');
        }

        var parserErrors = xml.getElementsByTagName('parsererror');

        if (parserErrors.length) {
            throw new Error(
                'Некоректний XML: ' +
                (parserErrors[0].textContent || '').slice(0, 250)
            );
        }

        var ch = xml.getElementsByTagName('channel');
        var pr = xml.getElementsByTagName('programme');

        if (!ch.length && !pr.length) {
            throw new Error(
                'XML не містить channel або programme'
            );
        }

        var map = {};
        var aliases = {};
        var validProgrammes = 0;

        for (var i = 0; i < ch.length; i++) {
            var id = ch[i].getAttribute('id');

            if (!id) continue;

            map[id] = map[id] || [];

            aliases[norm(id)] = id;

            var names = ch[i].getElementsByTagName('display-name');

            for (var j = 0; j < names.length; j++) {
                var displayName = (
                    names[j].textContent || ''
                ).trim();

                if (displayName) {
                    aliases[norm(displayName)] = id;
                }
            }
        }

        for (var k = 0; k < pr.length; k++) {
            var p = pr[k];
            var cid = p.getAttribute('channel');

            if (!cid) continue;

            var start = stamp(p.getAttribute('start'));
            var stop = stamp(p.getAttribute('stop'));

            if (
                !isFinite(start) ||
                !isFinite(stop) ||
                stop <= start
            ) {
                continue;
            }

            if (!map[cid]) map[cid] = [];

            map[cid].push({
                start: start,
                stop: stop,
                title: txt(p, 'title'),
                desc: txt(p, 'desc')
            });

            validProgrammes++;
        }

        Object.keys(map).forEach(function (id) {
            map[id].sort(function (a, b) {
                return a.start - b.start;
            });
        });

        var channelIds = Object.keys(map);

        if (!channelIds.length) {
            throw new Error('Не знайдено каналів у XMLTV');
        }

        /*
         * Нуль валідних передач не вважаємо успішним
         * оновленням. Старі дані залишаються доступними.
         */

        if (!validProgrammes) {
            throw new Error(
                'XML завантажено, але валідних передач не знайдено. ' +
                'Перевірте формат часу start/stop'
            );
        }

        return {
            channels: map,
            aliases: aliases,
            channelCount: ch.length,
            programmeCount: validProgrammes
        };
    }

    function epgLoad(done, force) {
        if (done) EPG.callbacks.push(done);

        if (
            !force &&
            EPG.loaded &&
            now() - EPG.loaded < CACHE_TTL
        ) {
            if (!EPG.request) {
                finishCallbacks();
            }

            return;
        }

        /*
         * Якщо запит уже виконується, не запускаємо другий
         * одночасно. Для примусового оновлення ставимо
         * новий запит у чергу після поточного.
         */

        if (EPG.request) {
            if (force) EPG.refreshQueued = true;

            EPG.status = force
                ? 'Очікування повторного оновлення'
                : 'Завантаження EPG...';

            return;
        }

        EPG.loading = true;
        EPG.status = force
            ? 'Примусове оновлення EPG...'
            : 'Завантаження EPG...';

        EPG.error = '';
        EPG.lastAttempt = now();
        EPG.lastDuration = 0;

        var startedAt = now();

        var request = $.ajax({
            url: EPG_URL,
            method: 'GET',
            dataType: 'text',
            timeout: 120000,
            cache: true,

            success: function (body, textStatus, xhr) {
                EPG.httpStatus = xhr ? xhr.status : 200;

                try {
                    var result = parseEPG(body);

                    /*
                     * Замінюємо дані тільки після повного
                     * успішного розбору XMLTV.
                     */

                    EPG.channels = result.channels;
                    EPG.aliases = result.aliases;
                    EPG.channelCount = result.channelCount;
                    EPG.programmeCount = result.programmeCount;
                    EPG.loaded = now();
                    EPG.lastSuccess = EPG.loaded;
                    EPG.error = '';
                    EPG.status = 'EPG успішно оновлено';
                    EPG.lastResult = 'Успішно';

                    console.log(
                        '[IPTV PRO 13.0] EPG оновлено:',
                        EPG.channelCount,
                        'каналів;',
                        EPG.programmeCount,
                        'передач'
                    );

                } catch (e) {
                    EPG.status = 'Помилка XMLTV';
                    EPG.error = String(e.message || e);
                    EPG.lastResult = 'Помилка обробки XMLTV';

                    console.error(
                        '[IPTV PRO 13.0] Помилка XMLTV:',
                        e
                    );
                }
            },

            error: function (xhr, status, err) {
                EPG.httpStatus = xhr ? (xhr.status || 0) : 0;
                EPG.status = 'EPG недоступний';

                EPG.error =
                    'Запит: ' + status +
                    (err ? ' / ' + err : '') +
                    ' (HTTP ' + EPG.httpStatus + ')';

                if (EPG.httpStatus === 0) {
                    EPG.error +=
                        '. Можлива проблема CORS, мережі або Worker';
                }

                EPG.lastResult = 'Помилка запиту';

                console.error(
                    '[IPTV PRO 13.0] Помилка EPG:',
                    EPG.error
                );
            },

            complete: function () {
                EPG.lastDuration = now() - startedAt;
                EPG.loading = false;
                EPG.request = null;

                /*
                 * Примусове оновлення, поставлене в чергу,
                 * виконується після завершення активного.
                 * Callback-и залишаються в черзі до його кінця.
                 */

                if (EPG.refreshQueued) {
                    EPG.refreshQueued = false;

                    epgLoad(null, true);

                    return;
                }

                finishCallbacks();
            }
        });

        EPG.request = request;
    }

    function findPrograms(c) {
        var id = EPG.channels[c.tvg_id]
            ? c.tvg_id
            : (
                EPG.aliases[norm(c.tvg_id)] ||
                EPG.aliases[norm(c.name)]
            );

        var arr = EPG.channels[id] || [];
        var currentTime = now();
        var current = null;
        var next = null;

        for (var i = 0; i < arr.length; i++) {
            if (
                arr[i].start <= currentTime &&
                arr[i].stop > currentTime
            ) {
                current = arr[i];
            } else if (arr[i].start > currentTime) {
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

    /*
     * COMPONENT
     */

    function IPTVComponent() {
        var root;
        var toolbar;
        var colG;
        var colC;
        var colE;

        var groups = {};
        var names = [];
        var list = [];

        var active = 'groups';
        var gi = 0;
        var ci = 0;
        var ti = 0;

        var chosen = null;
        var timer = null;
        var plRequest = null;
        var alive = true;
        var panelMode = '';
        var loadError = '';

        var toolbarActions = [
            {
                id: 'refresh',
                title: 'Оновити EPG'
            },
            {
                id: 'settings',
                title: 'Налаштування'
            },
            {
                id: 'diagnostics',
                title: 'Діагностика'
            }
        ];

        function item(text, cls) {
            return $('<div></div>')
                .addClass(cls || 'iptv-item')
                .text(text);
        }

        function button(text, action, cls) {
            var el = $('<div></div>')
                .addClass('iptv-action selector')
                .addClass(cls || '')
                .text(text);

            el.on('click hover:enter', function () {
                if (!alive) return;

                action();
            });

            el.on('hover:focus mouseenter', function () {
                toolbar.find('.iptv-action').removeClass('active');

                if (el.closest('.iptv-toolbar').length) {
                    el.addClass('active');
                }
            });

            return el;
        }

        function notify(message) {
            if (Lampa.Noty && Lampa.Noty.show) {
                Lampa.Noty.show(message);
            }
        }

        function focus() {
            if (!root) return;

            root.find('.iptv-item, .iptv-action')
                .removeClass('active');

            var target;

            if (active === 'toolbar') {
                target = toolbar.find('.iptv-action').eq(ti);
            } else if (active === 'groups') {
                target = colG.find('.iptv-item').eq(gi);
            } else {
                target = colC.find('.iptv-item').eq(ci);
            }

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

        function refreshDetails() {
            if (!alive || panelMode) return;

            if (chosen) details(chosen);
        }

        function refreshEPG() {
            if (EPG.loading) {
                notify('EPG уже завантажується. Очікуємо завершення.');

                return;
            }

            EPG.status = 'Запуск ручного оновлення...';
            EPG.error = '';

            renderPanel();

            epgLoad(function () {
                if (!alive) return;

                if (EPG.error) {
                    notify('EPG: ' + EPG.error);
                } else {
                    notify(
                        'EPG оновлено: ' +
                        EPG.programmeCount +
                        ' передач'
                    );
                }

                if (panelMode) {
                    renderPanel();
                } else {
                    refreshDetails();
                }
            }, true);
        }

        function showPanel(mode) {
            panelMode = mode;
            active = 'toolbar';

            renderPanel();
            focus();
        }

        function closePanel() {
            panelMode = '';
            refreshDetails();
            focus();
        }

        function renderPanel() {
            if (!colE) return;

            colE.empty();

            var box = $('<div class="iptv-panel"></div>');

            if (panelMode === 'settings') {
                box.append(
                    item('НАЛАШТУВАННЯ', 'iptv-panel-title')
                );

                box.append(
                    item(
                        'IPTV PRO 13.0 Premium',
                        'iptv-panel-subtitle'
                    )
                );

                box.append(
                    item('Джерело телепрограми', 'iptv-label')
                );

                box.append(
                    item(EPG_URL, 'iptv-url')
                );

                var pl = cfg.playlists[cfg.current_pl_index] ||
                    cfg.playlists[0];

                box.append(
                    item('Поточний плейлист', 'iptv-label')
                );

                box.append(
                    item(
                        pl && pl.name ? pl.name : 'Без назви',
                        'iptv-value'
                    )
                );

                box.append(
                    item(
                        pl && pl.url ? pl.url : 'URL не задано',
                        'iptv-url'
                    )
                );

                box.append(
                    item(
                        'Автоматичне кешування: 3 години',
                        'iptv-muted'
                    )
                );

                box.append(
                    item(
                        'Останнє успішне оновлення: ' +
                        formatDate(EPG.lastSuccess),
                        'iptv-muted'
                    )
                );

                box.append(
                    button(
                        EPG.loading
                            ? 'Оновлення виконується...'
                            : '↻ Оновити телепрограму',
                        refreshEPG,
                        'iptv-action-primary'
                    )
                );

                box.append(
                    button(
                        'Відкрити діагностику',
                        function () {
                            showPanel('diagnostics');
                        }
                    )
                );

                box.append(
                    button('Назад до каналів', closePanel)
                );

            } else if (panelMode === 'diagnostics') {
                box.append(
                    item('ДІАГНОСТИКА', 'iptv-panel-title')
                );

                box.append(
                    item(
                        'Стан системи та останній результат',
                        'iptv-panel-subtitle'
                    )
                );

                box.append(
                    item('EPG: ' + EPG.status, 'iptv-status')
                );

                box.append(
                    item(
                        'HTTP-статус: ' +
                        (EPG.httpStatus || 'Немає відповіді'),
                        'iptv-value'
                    )
                );

                box.append(
                    item(
                        'Остання спроба: ' +
                        formatDate(EPG.lastAttempt),
                        'iptv-value'
                    )
                );

                box.append(
                    item(
                        'Останній успіх: ' +
                        formatDate(EPG.lastSuccess),
                        'iptv-value'
                    )
                );

                box.append(
                    item(
                        'Тривалість запиту: ' +
                        durationText(EPG.lastDuration),
                        'iptv-value'
                    )
                );

                box.append(
                    item(
                        'Результат: ' + EPG.lastResult,
                        'iptv-value'
                    )
                );

                box.append(
                    item(
                        'Каналів XMLTV: ' + EPG.channelCount,
                        'iptv-value'
                    )
                );

                box.append(
                    item(
                        'Передач у розкладі: ' +
                        EPG.programmeCount,
                        'iptv-value'
                    )
                );

                box.append(
                    item(
                        'Каналів без відповідності: ' +
                        EPG.unmatchedChannels,
                        'iptv-value'
                    )
                );

                box.append(
                    item(
                        'Поточний кеш: ' +
                        (
                            EPG.loaded
                                ? durationText(now() - EPG.loaded) + ' тому'
                                : 'Відсутній'
                        ),
                        'iptv-value'
                    )
                );

                if (EPG.error) {
                    box.append(
                        item('ПОДРОБИЦІ ПОМИЛКИ', 'iptv-error-title')
                    );

                    box.append(
                        item(EPG.error, 'iptv-error')
                    );
                }

                if (loadError) {
                    box.append(
                        item('ПОМИЛКА ПЛЕЙЛИСТА', 'iptv-error-title')
                    );

                    box.append(
                        item(loadError, 'iptv-error')
                    );
                }

                box.append(
                    button(
                        EPG.loading
                            ? 'Оновлення виконується...'
                            : '↻ Повторити перевірку EPG',
                        refreshEPG,
                        'iptv-action-primary'
                    )
                );

                box.append(
                    button(
                        'Оновити дані панелі',
                        renderPanel
                    )
                );

                box.append(
                    button('Назад до каналів', closePanel)
                );
            }

            colE.append(box);
        }

        function details(c) {
            if (!c || !colE || panelMode) return;

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

            var data = findPrograms(c);
            var p = data.current;
            var n = data.next;

            if (EPG.loading && !EPG.loaded) {
                box.append(
                    item(
                        'Завантаження телепрограми...',
                        'iptv-muted'
                    )
                );
            } else if (!EPG.loaded) {
                box.append(
                    item(
                        EPG.status +
                        (EPG.error ? ' — ' + EPG.error : ''),
                        'iptv-muted'
                    )
                );
            } else if (!p && !n) {
                box.append(
                    item(
                        'Програму не знайдено' +
                        (
                            data.id
                                ? ''
                                : ' — канал не зіставлений з EPG'
                        ),
                        'iptv-muted'
                    )
                );
            }

            if (p) {
                box.append(
                    item('ЗАРАЗ В ЕФІРІ', 'iptv-blue')
                );

                box.append(
                    item(
                        p.title || 'Без назви',
                        'iptv-program'
                    )
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
                            (now() - p.start) /
                            (p.stop - p.start) * 100
                        )
                    ) + '%'
                );

                box.append(progress);

                if (p.desc) {
                    box.append(
                        item(p.desc, 'iptv-description')
                    );
                }
            }

            if (n) {
                box.append(
                    item('ДАЛІ В ЕФІРІ', 'iptv-blue')
                );

                box.append(
                    item(
                        n.title || 'Без назви',
                        'iptv-program'
                    )
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

            box.append(
                button(
                    '↻ Оновити EPG',
                    refreshEPG
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

                el.on('hover:focus mouseenter', function () {
                    gi = i;

                    if (active === 'groups') focus();
                });

                colG.append(el);
            });

            focus();
        }

        function renderChannels(channels) {
            list = channels || [];
            ci = 0;
            active = 'channels';
            panelMode = '';

            colC.empty();

            list.forEach(function (c, i) {
                var el = $(
                    '<div class="iptv-item iptv-channel"></div>'
                );

                if (c.logo) {
                    el.append(
                        $('<img class="iptv-logo">')
                            .attr('src', c.logo)
                    );
                }

                el.append(
                    item(c.name, 'iptv-channel-name')
                );

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
                    item(
                        'У цій групі немає каналів',
                        'iptv-muted'
                    )
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

            /*
             * Статистика зіставлення: рахуємо канали плейлиста,
             * для яких існує хоча б один відповідний EPG-ID.
             */

            var matched = 0;
            var unmatched = 0;

            Object.keys(groups).forEach(function (g) {
                groups[g].forEach(function (c) {
                    if (g === '⭐ Обране') return;

                    var id = EPG.channels[c.tvg_id]
                        ? c.tvg_id
                        : (
                            EPG.aliases[norm(c.tvg_id)] ||
                            EPG.aliases[norm(c.name)]
                        );

                    if (id) matched++;
                    else unmatched++;
                });
            });

            EPG.matchedChannels = matched;
            EPG.unmatchedChannels = unmatched;

            renderGroups();

            if (names.length) {
                gi = names.length > 1 ? 1 : 0;
                renderChannels(groups[names[gi]]);
            }
        }

        function load() {
            var pl = cfg.playlists[cfg.current_pl_index] ||
                cfg.playlists[0];

            if (!pl || !pl.url) {
                loadError = 'URL плейлиста не задано';

                colG.empty().append(
                    item(loadError, 'iptv-error')
                );

                return;
            }

            colG.empty().append(
                item('Завантаження плейлиста...', 'iptv-muted')
            );

            plRequest = $.ajax({
                url: pl.url,
                dataType: 'text',
                timeout: 30000,

                success: function (data) {
                    if (!alive) return;

                    loadError = '';
                    parse(data);
                },

                error: function (xhr, status, err) {
                    if (!alive || status === 'abort') return;

                    loadError =
                        'Запит: ' + status +
                        (err ? ' / ' + err : '') +
                        ' (HTTP ' + (xhr.status || 0) + ')';

                    colG.empty().append(
                        item(
                            'Помилка завантаження плейлиста',
                            'iptv-error'
                        )
                    );

                    notify('Не вдалося завантажити IPTV плейлист');

                    console.error(
                        '[IPTV PRO 13.0] Playlist error:',
                        loadError
                    );
                }
            });
        }

        function buildStyles() {
            if ($('#iptv-pro-130-css').length) return;

            $('head').append(
                '<style id="iptv-pro-130-css">' +

                '.iptv-root{' +
                    'position:fixed;inset:0;z-index:1000;' +
                    'display:flex;flex-direction:column;' +
                    'background:#0a0d13;color:#edf2fa;' +
                    'padding-top:4rem;box-sizing:border-box;' +
                    'font-family:inherit' +
                '}' +

                '.iptv-toolbar{' +
                    'display:flex;align-items:center;gap:.65rem;' +
                    'padding:.85rem 1.15rem;' +
                    'background:linear-gradient(110deg,#141c2b,#10141d);' +
                    'border-bottom:1px solid #293345;' +
                    'flex-shrink:0' +
                '}' +

                '.iptv-brand{' +
                    'font-size:1.25rem;font-weight:800;' +
                    'letter-spacing:.05em;margin-right:auto;' +
                    'white-space:nowrap' +
                '}' +

                '.iptv-brand small{' +
                    'display:block;font-size:.62rem;color:#8fa7d7;' +
                    'letter-spacing:.15em;margin-top:.15rem' +
                '}' +

                '.iptv-action{' +
                    'padding:.72rem .9rem;margin:.15rem;' +
                    'border:1px solid #303b50;border-radius:.65rem;' +
                    'background:#171f2d;color:#dbe5f6;' +
                    'font-size:.88rem;cursor:pointer;' +
                    'overflow-wrap:anywhere' +
                '}' +

                '.iptv-action.active{' +
                    'background:#244a89;border-color:#72a3ff;' +
                    'color:#fff' +
                '}' +

                '.iptv-action-primary{' +
                    'background:#2857a5;border-color:#3f73c8;' +
                    'color:#fff;font-weight:700' +
                '}' +

                '.iptv-flex{' +
                    'display:flex;flex:1;min-height:0;width:100%;' +
                    'overflow:hidden' +
                '}' +

                '.iptv-col{' +
                    'height:100%;box-sizing:border-box;' +
                    'overflow-y:auto;min-width:0;' +
                    'overscroll-behavior:contain' +
                '}' +

                '.iptv-groups{' +
                    'width:22%;border-right:1px solid #242d3a;' +
                    'background:#0d1118' +
                '}' +

                '.iptv-channels{' +
                    'width:43%;border-right:1px solid #242d3a;' +
                    'background:#10151e' +
                '}' +

                '.iptv-info{' +
                    'width:35%;padding:1.25rem;' +
                    'background:linear-gradient(160deg,#111824,#0b0f16)' +
                '}' +

                '.iptv-item{' +
                    'padding:.9rem .95rem;margin:.32rem .4rem;' +
                    'border:1px solid transparent;border-radius:.65rem;' +
                    'background:rgba(255,255,255,.035);' +
                    'color:#dce4f0;cursor:pointer;' +
                    'overflow-wrap:anywhere;transition:background .12s' +
                '}' +

                '.iptv-item.active{' +
                    'background:linear-gradient(100deg,#234b86,#1a355d);' +
                    'border-color:#527fc3;color:#fff' +
                '}' +

                '.iptv-channel{' +
                    'display:flex;align-items:center;gap:.8rem;' +
                    'min-height:3.5rem' +
                '}' +

                '.iptv-logo{' +
                    'width:40px;height:40px;object-fit:contain;' +
                    'flex-shrink:0' +
                '}' +

                '.iptv-channel-name{' +
                    'overflow:hidden;text-overflow:ellipsis;' +
                    'white-space:nowrap;font-size:1.04rem;' +
                    'padding:0;margin:0;background:none;border:0;' +
                    'min-width:0' +
                '}' +

                '.iptv-large-logo{' +
                    'max-width:100%;width:100%;height:105px;' +
                    'object-fit:contain;margin-bottom:.7rem' +
                '}' +

                '.iptv-heading{' +
                    'font-size:1.45rem;font-weight:800;' +
                    'margin:.65rem 0 1rem;color:#fff;' +
                    'background:none;border:0;padding:.25rem 0' +
                '}' +

                '.iptv-blue{' +
                    'color:#8bb4ff;font-weight:800;' +
                    'font-size:.82rem;letter-spacing:.09em;' +
                    'margin:1.2rem 0 .5rem;background:none;' +
                    'border:0;padding:.2rem 0' +
                '}' +

                '.iptv-program{' +
                    'font-size:1.18rem;font-weight:650;' +
                    'margin:.3rem 0;color:#f1f5fb;' +
                    'background:none;border:0;padding:.2rem 0' +
                '}' +

                '.iptv-muted{' +
                    'color:#9aa9bd;font-size:.9rem;' +
                    'overflow-wrap:anywhere;background:none;' +
                    'border:0;padding:.25rem 0' +
                '}' +

                '.iptv-description{' +
                    'color:#aebbd0;font-size:.9rem;' +
                    'line-height:1.5;margin-top:.9rem;' +
                    'background:none;border:0;padding:.25rem 0' +
                '}' +

                '.iptv-id{' +
                    'font-size:.76rem;color:#78879b;' +
                    'margin-top:1.5rem;word-break:break-word;' +
                    'background:none;border:0;padding:.25rem 0' +
                '}' +

                '.iptv-progress{' +
                    'height:5px;background:#283344;' +
                    'border-radius:10px;margin-top:.7rem;overflow:hidden' +
                '}' +

                '.iptv-progress>div{' +
                    'height:100%;background:linear-gradient(90deg,#3975d7,#83b6ff);' +
                    'border-radius:10px' +
                '}' +

                '.iptv-panel{' +
                    'display:flex;flex-direction:column;gap:.25rem;' +
                    'padding-bottom:1rem' +
                '}' +

                '.iptv-panel-title{' +
                    'font-size:1.45rem;font-weight:850;' +
                    'letter-spacing:.04em;color:#fff;' +
                    'background:none;border:0;padding:.25rem 0;' +
                    'margin:.2rem 0' +
                '}' +

                '.iptv-panel-subtitle{' +
                    'color:#9caec7;font-size:.9rem;' +
                    'background:none;border:0;padding:.2rem 0;' +
                    'margin-bottom:.75rem' +
                '}' +

                '.iptv-label{' +
                    'font-size:.78rem;text-transform:uppercase;' +
                    'letter-spacing:.08em;color:#8da8d2;' +
                    'background:none;border:0;padding:.35rem 0 .15rem' +
                '}' +

                '.iptv-value{' +
                    'font-size:.94rem;color:#e1e9f6;' +
                    'background:#151d29;border:1px solid #222e40;' +
                    'border-radius:.5rem;padding:.65rem .75rem;' +
                    'margin:.2rem 0;overflow-wrap:anywhere' +
                '}' +

                '.iptv-url{' +
                    'font-size:.8rem;color:#a8b8d0;' +
                    'background:#0c1119;border:1px solid #222c3b;' +
                    'border-radius:.5rem;padding:.65rem .75rem;' +
                    'margin:.2rem 0 .55rem;overflow-wrap:anywhere;' +
                    'word-break:break-all' +
                '}' +

                '.iptv-status{' +
                    'color:#9bc1ff;background:#172842;' +
                    'border:1px solid #294a77;border-radius:.55rem;' +
                    'padding:.75rem;margin:.35rem 0' +
                '}' +

                '.iptv-error-title{' +
                    'color:#ffb0a9;font-size:.8rem;font-weight:800;' +
                    'letter-spacing:.06em;margin-top:.7rem;' +
                    'background:none;border:0;padding:.25rem 0' +
                '}' +

                '.iptv-error{' +
                    'color:#ffd0cb;background:#341e23;' +
                    'border:1px solid #643039;border-radius:.5rem;' +
                    'padding:.7rem;margin:.25rem 0;overflow-wrap:anywhere' +
                '}' +

                '@media(max-width:900px){' +
                    '.iptv-toolbar{flex-wrap:wrap;padding:.6rem}' +
                    '.iptv-brand{width:100%}' +
                    '.iptv-action{font-size:.8rem;padding:.55rem}' +
                    '.iptv-groups{width:27%}' +
                    '.iptv-channels{width:43%}' +
                    '.iptv-info{width:30%;padding:.7rem}' +
                    '.iptv-item{padding:.65rem;margin:.25rem;font-size:.85rem}' +
                    '.iptv-logo{width:30px;height:30px}' +
                '}' +

                '</style>'
            );
        }

        function buildToolbar() {
            toolbar = $('<div class="iptv-toolbar"></div>');

            toolbar.append(
                '<div class="iptv-brand">' +
                    'IPTV PRO' +
                    '<small>PREMIUM · XMLTV</small>' +
                '</div>'
            );

            toolbarActions.forEach(function (action, i) {
                var el = $('<div></div>')
                    .addClass('iptv-action selector')
                    .attr('data-action', action.id)
                    .text(action.title);

                el.on('hover:focus mouseenter', function () {
                    ti = i;

                    if (active === 'toolbar') focus();
                });

                el.on('click hover:enter', function () {
                    ti = i;
                    runToolbarAction(action.id);
                });

                toolbar.append(el);
            });
        }

        function runToolbarAction(id) {
            if (id === 'refresh') {
                refreshEPG();
            } else if (id === 'settings') {
                showPanel('settings');
            } else if (id === 'diagnostics') {
                showPanel('diagnostics');
            }
        }

        this.create = function () {
            alive = true;
            panelMode = '';

            root = $('<div class="iptv-root"></div>');

            buildStyles();
            buildToolbar();

            var flex = $('<div class="iptv-flex"></div>');

            colG = $('<div class="iptv-col iptv-groups"></div>');
            colC = $('<div class="iptv-col iptv-channels"></div>');
            colE = $('<div class="iptv-col iptv-info"></div>');

            flex.append(colG, colC, colE);

            root.append(toolbar, flex);

            load();

            epgLoad(function () {
                if (!alive) return;

                if (panelMode) {
                    renderPanel();
                } else if (chosen) {
                    details(chosen);
                }

                if (EPG.error) {
                    console.warn(
                        '[IPTV PRO 13.0] EPG:',
                        EPG.status,
                        EPG.error
                    );
                }
            });

            timer = setInterval(function () {
                if (!alive) return;

                if (panelMode) {
                    return;
                }

                if (chosen) details(chosen);
            }, 60000);

            return root;
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (panelMode) {
                        active = 'toolbar';
                        focus();
                        return;
                    }

                    if (active === 'toolbar') {
                        focus();
                        return;
                    }

                    if (active === 'groups') {
                        if (gi <= 0) {
                            active = 'toolbar';
                            ti = 0;
                        } else {
                            gi = Math.max(0, gi - 1);
                        }
                    } else {
                        if (ci <= 0) {
                            active = 'toolbar';
                            ti = 0;
                        } else {
                            ci = Math.max(0, ci - 1);
                        }
                    }

                    focus();

                    if (active === 'channels' && list[ci]) {
                        details(list[ci]);
                    }
                },

                down: function () {
                    if (active === 'toolbar') {
                        active = 'groups';
                        focus();
                        return;
                    }

                    if (active === 'groups') {
                        gi = Math.min(
                            Math.max(0, names.length - 1),
                            gi + 1
                        );
                    } else {
                        ci = Math.min(
                            Math.max(0, list.length - 1),
                            ci + 1
                        );
                    }

                    focus();

                    if (active === 'channels' && list[ci]) {
                        details(list[ci]);
                    }
                },

                right: function () {
                    if (active === 'toolbar') {
                        ti = Math.min(
                            toolbarActions.length - 1,
                            ti + 1
                        );

                        focus();
                        return;
                    }

                    if (
                        active === 'groups' &&
                        names[gi] &&
                        !panelMode
                    ) {
                        renderChannels(groups[names[gi]]);
                    }
                },

                left: function () {
                    if (active === 'toolbar') {
                        ti = Math.max(0, ti - 1);
                        focus();
                        return;
                    }

                    if (active === 'channels') {
                        active = 'groups';
                        focus();
                    }
                },

                enter: function () {
                    if (active === 'toolbar') {
                        var action = toolbarActions[ti];

                        if (action) runToolbarAction(action.id);

                        return;
                    }

                    if (panelMode) return;

                    if (active === 'groups' && names[gi]) {
                        renderChannels(groups[names[gi]]);
                    } else if (list[ci]) {
                        play(list[ci]);
                    }
                },

                back: function () {
                    if (panelMode) {
                        closePanel();
                    } else if (active === 'channels') {
                        active = 'groups';
                        focus();
                    } else if (active === 'toolbar') {
                        active = 'groups';
                        focus();
                    } else {
                        Lampa.Activity.backward();
                    }
                }
            });

            Lampa.Controller.toggle('iptv_pro');

            focus();
        };

        this.render = function () {
            return root;
        };

        this.destroy = function () {
            alive = false;

            if (timer) {
                clearInterval(timer);
                timer = null;
            }

            if (plRequest && plRequest.readyState !== 4) {
                plRequest.abort();
            }

            Lampa.Controller.remove('iptv_pro');

            if (root) {
                root.remove();
                root = null;
            }

            colG = null;
            colC = null;
            colE = null;
            toolbar = null;
        };
    }

    /*
     * INIT
     */

    function init() {
        if (window.__iptv_pro_130_initialized) return;

        window.__iptv_pro_130_initialized = true;

        Lampa.Component.add('iptv_pro', IPTVComponent);

        var menu = $('.menu .menu__list');

        if (!menu.length) {
            console.warn(
                '[IPTV PRO 13.0] Меню Lampa не знайдено під час init'
            );

            return;
        }

        /*
         * Прибираємо тільки дублікати власного пункту меню.
         */

        menu.find('.iptv-pro-menu').remove();

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

        console.log('[IPTV PRO 13.0] Ініціалізовано');
    }

    if (window.app_ready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

})();
