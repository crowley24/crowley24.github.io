/**
 * IPTV for Lampa 3.3.2 — Compact & Optimized Edition
 */
(function () {
    'use strict';
    if (!window.Lampa || !window.$ || window.plugin_iptv_player_332_ready) return;
    window.plugin_iptv_player_332_ready = true;

    var ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M8 2l4 4 4-4"/></svg>';
    var EPG_URL = 'https://iptv-epg-proxy.unclezhenya24.workers.dev/epg.xml';
    var EPG_KEY = 'iptv_33_epg_cache';
    var LIMITS = [30, 20, 12, 8, 5, 3, 1];

    var STATE = {
        channels: [], groupOrder: [], loaded: false, loadedId: null,
        epg: null, epgLoading: false, epgWaiters: [], epgForcePending: false, epgStats: null,
        current: null, playlist: [], playlistIndex: -1, activeGroup: null, panelFocus: 'channels'
    };
    var groupPositions = Object.create(null);

    /* --- HELPERS --- */
    var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); };
    var noty = function (t) { try { Lampa.Noty.show(t); } catch (e) {} };
    var sget = function (k, d) { try { var v = Lampa.Storage.get(k, d); return v == null ? d : v; } catch (e) { return d; } };
    var sset = function (k, v) { try { Lampa.Storage.set(k, v); } catch (e) {} };
    var toSet = function (arr) { var o = Object.create(null); (Array.isArray(arr) ? arr : []).forEach(function (x) { o[x] = true; }); return o; };
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var fmtTime = function (t) { var d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
    var norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9а-яёіїєґ]+/g, ''); };
    var selectShow = function (o) { Lampa.Select.show(o); };
    var formatBytes = function (b) { b = Number(b) || 0; return b < 1024 ? b + ' Б' : (b < 1024 * 1024 ? (b / 1024).toFixed(1) + ' КБ' : (b / (1024 * 1024)).toFixed(2) + ' МБ'); };

    /* --- PROGRESS & ARCHIVE --- */
    function programProgress(p, at) {
        if (!p || !p.start || !p.stop || p.stop <= p.start) return 0;
        at = at || Date.now();
        return Math.max(0, Math.min(100, Math.round((at - p.start) / (p.stop - p.start) * 100)));
    }

    function normalizeCatchup(tpl) {
        var aliases = { utc: 'start', lutc: 'timestamp', current_utc: 'timestamp', utcend: 'end', durationfs: 'duration' };
        return String(tpl || '').replace(/(^|[^$])\{([a-z_][a-z0-9_-]*)\}/gi, function (full, p, n) {
            return p + '${' + (aliases[n.toLowerCase()] || n.toLowerCase()) + '}';
        });
    }

    function buildArchiveUrl(ch, prog) {
        var tpl = normalizeCatchup(ch && ch.catchup && ch.catchup.source ? ch.catchup.source : ch.url);
        if (!tpl || !prog || prog.stop <= prog.start) return false;
        var start = Math.floor(prog.start / 1000), end = Math.floor(prog.stop / 1000), now = Math.floor(Date.now() / 1000);
        var vals = { start: start, utc: start, end: end, utcend: end, timestamp: now, lutc: now, duration: end - start, durationfs: end - start };
        return tpl.replace(/\$\{([^}]+)\}/g, function (f, e) { return Object.prototype.hasOwnProperty.call(vals, e) ? encodeURIComponent(vals[e]) : f; });
    }

    function canArchive(ch, prog) {
        if (!ch || !prog || prog.stop <= prog.start || prog.start > Date.now()) return false;
        var days = Number(ch.catchup && ch.catchup.days ? ch.catchup.days : 0) || 3;
        return prog.start >= Date.now() - days * 86400000;
    }

    /* --- PLAYLIST & PARSER --- */
    function getLists() {
        var lists = sget('iptv_lists', []);
        if (!Array.isArray(lists)) lists = [];
        if (!lists.length && sget('iptv_url', '')) {
            lists = [{ id: 'l1', name: 'Основний', url: sget('iptv_url', '') }];
            sset('iptv_lists', lists); sset('iptv_active', 'l1');
        }
        return lists;
    }

    function activeList() {
        var lists = getLists(), id = sget('iptv_active', '');
        for (var i = 0; i < lists.length; i++) if (lists[i].id === id) return lists[i];
        return lists[0] || null;
    }

    function parseM3U(text) {
        text = String(text || '').replace(/^\uFEFF/, '');
        var lines = text.split(/\r?\n/), channels = [], order = [], groups = Object.create(null), cur = null;
        var headCatchup = { type: /catchup="([^"]*)"/i.exec(lines[0] || '')?.[1] || '', source: /catchup-source="([^"]*)"/i.exec(lines[0] || '')?.[1] || '', days: /catchup-days="([^"]*)"/i.exec(lines[0] || '')?.[1] || '' };

        lines.forEach(function (line) {
            line = line.trim();
            if (!line) return;
            if (line.indexOf('#EXTINF') === 0) {
                var group = /group-title="([^"]*)"/i.exec(line)?.[1] || 'Без групи';
                var logo = /tvg-logo="([^"]*)"/i.exec(line)?.[1] || '';
                var id = /tvg-id="([^"]*)"/i.exec(line)?.[1] || '';
                var days = parseFloat(/catchup-days="([^"]*)"/i.exec(line)?.[1] || headCatchup.days) || 0;
                cur = { name: line.substring(line.lastIndexOf(',') + 1).trim() || 'Без назви', group: group, logo: logo, id: id, catchup: { type: headCatchup.type, source: headCatchup.source, days: days } };
            } else if (cur && line.indexOf('#EXTGRP:') === 0) {
                cur.group = line.substring(8).trim() || cur.group;
            } else if (cur) {
                cur.url = line;
                channels.push(cur);
                if (!groups[cur.group]) { groups[cur.group] = true; order.push(cur.group); }
                cur = null;
            }
        });
        return { channels: channels, order: order };
    }

    function loadPlaylist(force, done, skipEpg) {
        var list = activeList();
        if (!list) return done();
        if (!force && STATE.loaded && STATE.loadedId === list.id) { if (!skipEpg) loadEpg(false); return done(); }

        var cacheKey = 'iptv_cache_' + list.id, cached = sget(cacheKey, '');
        if (!force && cached && applyParsed(cached)) {
            STATE.loadedId = list.id;
            if (!skipEpg) loadEpg(false);
            return done();
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', sget('iptv_proxy', '') ? sget('iptv_proxy') + encodeURIComponent(list.url) : list.url, true);
        xhr.timeout = 30000;
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300 && applyParsed(xhr.responseText)) {
                STATE.loadedId = list.id;
                if (xhr.responseText.length < 2000000) sset(cacheKey, xhr.responseText);
                if (!skipEpg) loadEpg(force);
            }
            done();
        };
        xhr.onerror = xhr.ontimeout = function () {
            if (cached && applyParsed(cached)) { STATE.loadedId = list.id; if (!skipEpg) loadEpg(false); }
            done();
        };
        xhr.send();
    }

    function applyParsed(text) {
        var p = parseM3U(text);
        STATE.channels = p.channels; STATE.groupOrder = p.order; STATE.loaded = p.channels.length > 0;
        return STATE.loaded;
    }

    /* --- EPG LOGIC --- */
    function findEpgId(ch) {
        if (!STATE.epg || !ch) return null;
        var progs = STATE.epg.progs || {}, names = STATE.epg.names || {};
        var id = String(ch.id || '').trim();
        if (id && progs[id]) return id;
        var key = norm(ch.name);
        if (key && names[key] && progs[names[key]]) return names[key];
        return id && progs[id] ? id : null;
    }

    function loadEpg(force) {
        if (STATE.epgLoading) return;
        var ids = [];
        STATE.channels.forEach(function (c) { if (c.id && !ids.includes(c.id)) ids.push(c.id); });
        if (!ids.length) return;

        var sig = ids.slice().sort().join('\n');
        var cache = sget(EPG_KEY, null);
        if (!force && cache && cache.signature === sig && Date.now() - cache.t < EPG_TTL) {
            STATE.epg = cache.data; return;
        }

        STATE.epgLoading = true;
        var xhr = new XMLHttpRequest();
        xhr.open('POST', EPG_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function () {
            STATE.epgLoading = false;
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var doc = new DOMParser().parseFromString(xhr.responseText, 'application/xml');
                    var names = {}, progs = {};
                    var now = Date.now(), from = now - EPG_HISTORY, to = now + EPG_FUTURE;

                    doc.querySelectorAll('channel').forEach(function (el) {
                        var cid = el.getAttribute('id');
                        el.querySelectorAll('display-name').forEach(function (n) {
                            var k = norm(n.textContent);
                            if (k && !names[k]) names[k] = cid;
                        });
                    });

                    doc.querySelectorAll('programme').forEach(function (p) {
                        var cid = p.getAttribute('channel');
                        var start = Date.parse(p.getAttribute('start')), stop = Date.parse(p.getAttribute('stop'));
                        if (!cid || !start || !stop || stop <= start || stop < from || start > to) return;
                        var title = p.querySelector('title')?.textContent?.trim();
                        if (!title) return;
                        if (!progs[cid]) progs[cid] = [];
                        progs[cid].push({ start: start, stop: stop, title: title });
                    });

                    STATE.epg = { names: names, progs: progs };
                    sset(EPG_KEY, { signature: sig, t: Date.now(), data: STATE.epg });
                    STATE.epgWaiters.splice(0).forEach(function (fn) { fn(); });
                } catch (e) {}
            }
        };
        xhr.onerror = function () { STATE.epgLoading = false; };
        xhr.send(JSON.stringify({ ids: ids }));
    }

    function getCurrentProgram(ch) {
        var id = findEpgId(ch), list = STATE.epg && STATE.epg.progs ? STATE.epg.progs[id] : null;
        if (!list) return null;
        var now = Date.now();
        for (var i = 0; i < list.length; i++) if (list[i].start <= now && now < list[i].stop) return list[i];
        return null;
    }

    /* --- STYLES --- */
    function injectStyle() {
        var s = document.getElementById('iptv-v33-style') || document.createElement('style');
        s.id = 'iptv-v33-style';
        var logoSz = sget('iptv_ui_logo_size', 'normal'), textSz = sget('iptv_ui_text_size', 'normal'), showPrg = sget('iptv_ui_progress', true);
        var lW = logoSz === 'small' ? '3.2em' : (logoSz === 'large' ? '5.2em' : '4.2em');
        var lH = logoSz === 'small' ? '2.2em' : (logoSz === 'large' ? '3.8em' : '3em');
        var fSz = textSz === 'small' ? '0.92em' : (textSz === 'large' ? '1.2em' : '1.06em');

        s.textContent = [
            '.iptv-v33{display:flex;height:100%;width:100%;overflow:hidden;background:var(--color-background,#0f0f0f)}',
            '.iptv-v33__side{width:260px;max-width:30%;display:flex;flex-direction:column;background:rgba(0,0,0,.28);border-right:1px solid rgba(255,255,255,.07)}',
            '.iptv-v33__side-head{padding:1.1em 1em .55em;font-size:1.08em;font-weight:600;opacity:.8}',
            '.iptv-v33__side-list,.iptv-v33__list{flex:1;overflow:auto;padding:.25em .9em 1.4em}',
            '.iptv-v33__grp,.iptv-v33__ch{display:flex;align-items:center;border-radius:.4em;margin:.12em 0;cursor:pointer}',
            '.iptv-v33__grp{padding:.62em .8em;justify-content:space-between}',
            '.iptv-v33__grp.focus,.iptv-v33__grp:hover,.iptv-v33__ch.focus,.iptv-v33__ch:hover{background:rgba(255,255,255,.09)}',
            '.iptv-v33__grp.active{background:rgba(33,150,243,.25);color:#90caf9}',
            '.iptv-v33__ch{padding:.5em .85em;gap:.85em}',
            '.iptv-v33__ch-num{width:2.1em;text-align:right;opacity:.4;font-size:.88em}',
            '.iptv-v33__ch-logo{width:' + lW + ';height:' + lH + ';background:rgba(255,255,255,.06);border-radius:.35em;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}',
            '.iptv-v33__ch-logo img{max-width:90%;max-height:85%;object-fit:contain}',
            '.iptv-v33__ch-body{flex:1;min-width:0}',
            '.iptv-v33__ch-name{font-size:' + fSz + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
            '.iptv-v33__ch-epg{font-size:.8em;opacity:.65;margin-top:.12em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
            '.iptv-v33__progress{height:3px;margin-top:6px;background:rgba(255,255,255,.15);border-radius:2px;' + (showPrg ? '' : 'display:none;') + '}',
            '.iptv-v33__progress-bar{height:100%;background:#4cc986;border-radius:2px}',
            '.iptv-v33__ch.focus .iptv-v33__progress-bar{background:#10141d}',
            '.iptv-v33__main{flex:1;display:flex;flex-direction:column;min-width:0}',
            '.iptv-v33__head{padding:1.05em 1.3em .65em;display:flex;align-items:center;justify-content:space-between}',
            '.iptv-v33__title{font-size:1.4em;font-weight:700}.iptv-v33__meta{opacity:.5;font-size:.9em}'
        ].join('');
        if (!s.parentNode) document.head.appendChild(s);
    }

    /* --- MAIN PANEL UI --- */
    function MainPanel() {
        var html = $('<div class="iptv-v33"></div>');
        var side = $('<div class="iptv-v33__side"><div class="iptv-v33__side-head">Групи</div><div class="iptv-v33__side-list"></div></div>');
        var main = $('<div class="iptv-v33__main"><div class="iptv-v33__head"><div class="iptv-v33__title"></div><div class="iptv-v33__meta"></div></div><div class="iptv-v33__list"></div></div>');
        html.append(side).append(main);

        var chList = main.find('.iptv-v33__list'), grpList = side.find('.iptv-v33__side-list');
        var titleEl = main.find('.iptv-v33__title'), metaEl = main.find('.iptv-v33__meta');
        var view = { all: [], groups: {}, order: [] }, channelItems = [], groupItems = [];
        var focusIndex = 0, groupFocus = 0;

        function buildView() {
            var all = [], groups = {}, order = [], favs = toSet(sget('iptv_fav', [])), hidden = toSet(sget('iptv_hidden', [])), hGrps = toSet(sget('iptv_hidden_groups', []));
            STATE.channels.forEach(function (c) {
                if (hidden[c.url] || hGrps[c.group]) return;
                var ch = { name: (sget('iptv_names', {})[c.url] || c.name), url: c.url, group: c.group, logo: c.logo, id: c.id, catchup: c.catchup, original: c };
                all.push(ch);
                if (!groups[ch.group]) { groups[ch.group] = []; order.push(ch.group); }
                groups[ch.group].push(ch);
            });
            return { all: all, groups: groups, order: order };
        }

        function currentChannels() {
            if (STATE.activeGroup === '__fav__') return view.all.filter(function (c) { return !!toSet(sget('iptv_fav', []))[c.url]; });
            if (STATE.activeGroup === '__all__' || !STATE.activeGroup) return view.all;
            return view.groups[STATE.activeGroup] || [];
        }

        function renderChannels() {
            chList.empty(); channelItems = [];
            var list = currentChannels();
            titleEl.text(STATE.activeGroup === '__fav__' ? '★ Обране' : STATE.activeGroup === '__all__' ? 'Усі канали' : (STATE.activeGroup || 'Канали'));
            metaEl.text(list.length + ' каналів · затисніть ОК для архіву');

            list.forEach(function (ch, i) {
                var prog = getCurrentProgram(ch), prgW = programProgress(prog);
                var row = $('<div class="iptv-v33__ch selector" data-index="' + i + '"><div class="iptv-v33__ch-num">' + (i + 1) + '</div><div class="iptv-v33__ch-logo">' + (ch.logo ? '<img src="' + ch.logo + '" onerror="this.parentNode.innerHTML=\'<span>📺</span>\'">' : '<span>📺</span>') + '</div><div class="iptv-v33__ch-body"><div class="iptv-v33__ch-name">' + esc(ch.name + (toSet(sget('iptv_fav', []))[ch.url] ? ' ★' : '')) + '</div><div class="iptv-v33__ch-epg">' + esc(prog ? fmtTime(prog.start) + '–' + fmtTime(prog.stop) + '  ' + prog.title : ch.group) + '</div>' + (prog ? '<div class="iptv-v33__progress"><div class="iptv-v33__progress-bar" style="width:' + prgW + '%"></div></div>' : '') + '</div></div>');
                
                row.on('hover:enter click', function () { groupPositions[STATE.activeGroup] = focusIndex; playChannel(ch, list); });
                row.on('hover:long', function () { showArchivePrograms(ch); });
                chList.append(row); channelItems.push(row);
            });
            focusIndex = Math.min(groupPositions[STATE.activeGroup] || 0, Math.max(0, channelItems.length - 1));
        }

        function renderGroups() {
            grpList.empty(); groupItems = [];
            var gItems = [{ id: '__fav__', title: '★ Обране', count: view.all.filter(function (c) { return !!toSet(sget('iptv_fav', []))[c.url]; }).length }, { id: '__all__', title: 'Усі канали', count: view.all.length }];
            view.order.forEach(function (g) { gItems.push({ id: g, title: g, count: view.groups[g].length }); });

            gItems.forEach(function (g, i) {
                var row = $('<div class="iptv-v33__grp selector' + (STATE.activeGroup === g.id ? ' active' : '') + '"><span>' + esc(g.title) + '</span><span class="iptv-v33__grp-count">' + g.count + '</span></div>');
                row.on('hover:enter click', function () {
                    groupPositions[STATE.activeGroup] = focusIndex;
                    STATE.activeGroup = g.id; sset('iptv_last_group', g.id);
                    renderGroups(); renderChannels(); STATE.panelFocus = 'channels'; applyFocus();
                });
                grpList.append(row); groupItems.push(row);
            });
        }

        function applyFocus() {
            channelItems.forEach(function (el) { el.removeClass('focus'); });
            groupItems.forEach(function (el) { el.removeClass('focus'); });
            var isG = STATE.panelFocus === 'groups', el = isG ? groupItems[groupFocus] : channelItems[focusIndex];
            if (el && el[0]) {
                el.addClass('focus');
                var c = isG ? grpList[0] : chList[0], n = el[0];
                if (c && n) {
                    if (n.offsetTop < c.scrollTop) c.scrollTop = n.offsetTop;
                    else if (n.offsetTop + n.offsetHeight > c.scrollTop + c.clientHeight) c.scrollTop = n.offsetTop + n.offsetHeight - c.clientHeight;
                }
            }
        }

        function playChannel(ch, list) {
            STATE.playlist = list || []; STATE.playlistIndex = STATE.playlist.findIndex(function (c) { return c.url === ch.url; });
            var hist = sget('iptv_hist', []).filter(function (u) { return u !== ch.url; });
            hist.unshift(ch.url); sset('iptv_hist', hist.slice(0, 30));
            sset('iptv_last_group', STATE.activeGroup || ch.group || '');
            Lampa.Player.play({ url: ch.url, title: ch.name + (getCurrentProgram(ch) ? ' · ' + fmtTime(getCurrentProgram(ch).start) + '–' + fmtTime(getCurrentProgram(ch).stop) + '  ' + getCurrentProgram(ch).title : ''), address: ch.url });
        }

        function showArchivePrograms(ch) {
            var progs = STATE.epg && STATE.epg.progs ? STATE.epg.progs[findEpgId(ch)] : null;
            if (!progs || !progs.length) return noty('Немає телепрограми');
            var recent = progs.filter(function (p) { return p.start <= Date.now(); }).slice().reverse();
            selectShow({
                title: ch.name + ' — Архів',
                items: recent.map(function (p) { return { title: fmtTime(p.start) + ' – ' + fmtTime(p.stop) + '  ' + p.title, subtitle: canArchive(ch.original || ch, p) ? 'Доступно' : 'Недоступно', program: p, available: canArchive(ch.original || ch, p) }; }),
                onSelect: function (item) {
                    if (!item.available) return noty('Архів недоступний');
                    var u = buildArchiveUrl(ch.original || ch, item.program);
                    if (u) Lampa.Player.play({ url: u, title: ch.name + ' — ' + item.program.title, address: u });
                },
                onBack: function () { Lampa.Controller.toggle('content'); }
            });
        }

        this.create = function () {
            injectStyle();
            view = buildView();
            var mode = sget('iptv_start', 'last'), last = sget('iptv_last_group', '');
            STATE.activeGroup = mode === 'fav' ? '__fav__' : (mode === 'all' ? '__all__' : (view.groups[last] ? last : (view.order[0] || '__all__')));
            renderGroups(); renderChannels(); applyFocus();
            return html;
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () { Lampa.Controller.collectionSet(html); applyFocus(); },
                left: function () { if (STATE.panelFocus === 'channels') { groupPositions[STATE.activeGroup] = focusIndex; STATE.panelFocus = 'groups'; applyFocus(); } else Lampa.Controller.toggle('menu'); },
                right: function () { if (STATE.panelFocus === 'groups') { STATE.panelFocus = 'channels'; applyFocus(); } },
                up: function () {
                    if (STATE.panelFocus === 'channels') { if (focusIndex > 0) { focusIndex--; groupPositions[STATE.activeGroup] = focusIndex; } else return Lampa.Controller.toggle('head'); }
                    else { if (groupFocus > 0) groupFocus--; else return Lampa.Controller.toggle('head'); }
                    applyFocus();
                },
                down: function () {
                    if (STATE.panelFocus === 'channels') { if (focusIndex < channelItems.length - 1) { focusIndex++; groupPositions[STATE.activeGroup] = focusIndex; } }
                    else if (groupFocus < groupItems.length - 1) groupFocus++;
                    applyFocus();
                },
                enter: function () { (STATE.panelFocus === 'groups' ? groupItems[groupFocus] : channelItems[focusIndex])?.trigger('hover:enter'); },
                long: function () { if (STATE.panelFocus === 'channels') showArchivePrograms(currentChannels()[focusIndex]); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };
        this.render = function () { return html; };
        this.destroy = function () { html.remove(); };
    }

    /* --- SETTINGS & REGISTRATION --- */
    function addSettings() {
        if (!Lampa.SettingsApi || !Lampa.SettingsApi.addComponent) return;
        Lampa.SettingsApi.addComponent({ component: 'iptv_player_33', name: 'IPTV', icon: ICON });

        Lampa.SettingsApi.addParam({
            component: 'iptv_player_33',
            param: { name: 'iptv_start', type: 'select', values: { last: 'Остання група', fav: 'Обране', all: 'Усі канали' }, default: 'last' },
            field: { name: 'Відкривати при вході', description: 'Початкова група' }
        });
        Lampa.SettingsApi.addParam({
            component: 'iptv_player_33',
            param: { name: 'iptv_ui_logo_size', type: 'select', values: { small: 'Компактні', normal: 'Стандартні', large: 'Великі' }, default: 'normal' },
            field: { name: 'Розмір логотипів', description: 'Іконки каналів' },
            onChange: injectStyle
        });
        Lampa.SettingsApi.addParam({
            component: 'iptv_player_33',
            param: { name: 'iptv_ui_text_size', type: 'select', values: { small: 'Малий', normal: 'Звичайний', large: 'Великий' }, default: 'normal' },
            field: { name: 'Розмір шрифту назв', description: 'Шрифт каналу' },
            onChange: injectStyle
        });
        Lampa.SettingsApi.addParam({
            component: 'iptv_player_33',
            param: { name: 'iptv_ui_progress', type: 'trigger', default: true },
            field: { name: 'Шкала прогресу передачі', description: 'Показувати смужку виконання' },
            onChange: injectStyle
        });
    }

    function start() {
        if (!$('.menu .menu__list').length) { setTimeout(start, 500); return; }
        Lampa.Component.add('iptv_main_33', MainPanel);
        addSettings();
        var menu = $('.menu .menu__list').eq(0);
        menu.find('[data-action="iptv_player_33"]').remove();
        $('<li class="menu__item selector" data-action="iptv_player_33"><div class="menu__ico">' + ICON + '</div><div class="menu__text">IPTV</div></li>')
            .on('hover:enter click', function () {
                loadPlaylist(false, function () {
                    if (!STATE.loaded) return noty('Додайте плейлист у Налаштування → IPTV');
                    Lampa.Activity.push({ url: '', title: 'IPTV', component: 'iptv_main_33', page: 1 });
                });
            }).appendTo(menu);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
