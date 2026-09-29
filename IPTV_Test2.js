// ==Lampa==  
// name: IPTV PRO (EPG Built-in)  
// version: 12.9  
  
(function () {  
    'use strict';  
  
    function IPTVComponent() {  
        var _this = this;  
        var root, colG, colC, colE;  
        var groups_data = {};  
        var current_list = [];  
        var active_col = 'groups';  
        var index_g = 0, index_c = 0;  
  
        var epg_map = {};       // tvg-id (lowercase) -> [{title, desc, start, stop}]  
        var epg_loaded = false;  
        var epg_loading = false;  
        var epg_queue = [];  
  
        var storage_key = 'iptv_pro_v12';  
        var config = Lampa.Storage.get(storage_key, {  
            playlists: [{  
                name: 'TEST',  
                url: 'https://m3u.ch/pl/61b9ea4e90c4cf3165a4d19656e126a8_cf72fbb9e7ee647289c76620f1df15b4.m3u'  
            }],  
            epg_url: 'https://iptvx.one/epg/epg.xml.gz',  
            favorites: [],  
            current_pl_index: 0  
        });  
  
        // ---------- helpers ----------  
  
        function parseXMLTVTime(s) {  
            if (!s) return 0;  
            var m = s.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);  
            if (!m) return 0;  
            var iso = m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + m[6];  
            if (m[7]) iso += m[7].slice(0, 3) + ':' + m[7].slice(3);  
            var t = Date.parse(iso);  
            return isNaN(t) ? 0 : t / 1000;  
        }  
  
        function fmtTime(t) {  
            var d = new Date(t * 1000);  
            return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);  
        }  
  
        function flushEPGQueue() {  
            epg_queue.forEach(function (cb) { try { cb(); } catch (e) {} });  
            epg_queue = [];  
        }  
  
        function parseEPG(str) {  
            try {  
                var doc = $($.parseXML(str));  
                doc.find('programme').each(function () {  
                    var el = $(this);  
                    var chan = (el.attr('channel') || '').toLowerCase();  
                    if (!chan) return;  
                    var item = {  
                        title: el.find('title').first().text(),  
                        desc: el.find('desc').first().text(),  
                        start: parseXMLTVTime(el.attr('start')),  
                        stop: parseXMLTVTime(el.attr('stop'))  
                    };  
                    (epg_map[chan] = epg_map[chan] || []).push(item);  
                });  
                epg_loaded = true;  
                console.log('[IPTV] EPG loaded, channels:', Object.keys(epg_map).length);  
            } catch (e) {  
                console.log('[IPTV] EPG parse error', e);  
            }  
            epg_loading = false;  
            flushEPGQueue();  
        }  
  
        function gunzipAndParse(buf) {  
            try {  
                var bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);  
                if (window.pako) {  
                    parseEPG(new TextDecoder().decode(pako.ungzip(bytes)));  
                } else if (window.DecompressionStream) {  
                    var ds = new DecompressionStream('gzip');  
                    var stream = new Blob([bytes]).stream().pipeThrough(ds);  
                    new Response(stream).text().then(parseEPG);  
                } else {  
                    parseEPG(new TextDecoder().decode(bytes));  
                }  
            } catch (e) {  
                console.log('[IPTV] gunzip fail', e);  
                epg_loading = false;  
                flushEPGQueue();  
            }  
        }  
  
        // ---------- EPG через проксі-ланцюжок ----------  
  
        var EPG_PROXIES = [  
            '',                                              // прямий запит  
            'https://api.allorigins.win/raw?url=',  
            'https://corsproxy.io/?url=',  
            'https://api.codetabs.com/v1/proxy?quest='  
        ];  
  
        this.loadEPG = function (onDone) {  
            if (onDone) epg_queue.push(onDone);  
            if (epg_loaded) { flushEPGQueue(); return; }  
            if (epg_loading) return;  
            epg_loading = true;  
  
            var i = 0;  
            var tryNext = function () {  
                if (i >= EPG_PROXIES.length) {  
                    console.log('[IPTV] EPG: усі джерела недоступні');  
                    epg_loading = false;  
                    flushEPGQueue();  
                    return;  
                }  
                var prefix = EPG_PROXIES[i++];  
                var url = prefix === '' ? config.epg_url : prefix + encodeURIComponent(config.epg_url);  
  
                console.log('[IPTV] EPG try:', url);  
                fetch(url)  
                    .then(function (r) {  
                        if (!r.ok) throw new Error('HTTP ' + r.status);  
                        return r.arrayBuffer();  
                    })  
                    .then(function (buf) {  
                        var bytes = new Uint8Array(buf);  
                        var head = new TextDecoder().decode(bytes.slice(0, 100));  
                        if (head.indexOf('<?xml') !== -1 || head.indexOf('<tv') !== -1) {  
                            parseEPG(new TextDecoder().decode(bytes));  
                        } else {  
                            gunzipAndParse(bytes);  
                        }  
                    })  
                    .catch(function (e) {  
                        console.log('[IPTV] EPG fail:', url, e);  
                        tryNext();  
                    });  
            };  
            tryNext();  
        };  
  
        // ---------- UI ----------  
  
        this.create = function () {  
            root = $('<div class="iptv-root"></div>');  
            var container = $('<div class="iptv-flex-wrapper"></div>');  
  
            colG = $('<div class="iptv-col col-groups"></div>');  
            colC = $('<div class="iptv-col col-channels"></div>');  
            colE = $('<div class="iptv-col col-details"></div>');  
  
            container.append(colG, colC, colE);  
            root.append(container);  
  
            if (!$('#iptv-style-v12').length) {  
                $('head').append('<style id="iptv-style-v12">' +  
                    '.iptv-root{position:fixed;inset:0;background:#0b0d10;z-index:1000;padding-top:4rem;}' +  
                    '.iptv-flex-wrapper{display:flex;width:100%;height:100%;overflow:hidden;}' +  
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.05);}' +  
                    '.col-groups{width:20%; min-width:180px; flex-shrink:0;}' +  
                    '.col-channels{width:45%; flex-grow:1; min-width:250px; background:rgba(255,255,255,0.01);}' +  
                    '.col-details{width:35%; min-width:300px; flex-shrink:0; background:#080a0d; padding:1.5rem;}' +  
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);cursor:pointer;}' +  
                    '.iptv-item.active{background:#2962ff;color:#fff;}' +  
                    '.channel-row{display:flex;align-items:center;gap:1rem;}' +  
                    '.channel-logo{width:40px;height:40px;object-fit:contain;background:#000;border-radius:.3rem;}' +  
                    '.channel-title{font-size:1.3rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +  
                    '.epg-title-big{font-size:1.6rem; color:#fff; font-weight:700; margin-bottom:1rem;}' +  
                    '.epg-now{color:#2962ff; font-size:1.1rem; font-weight:bold; margin-top:1.5rem;}' +  
                    '.epg-prog-name{font-size:1.4rem; color:#ccc; margin:.5rem 0;}' +  
                    '.epg-time{color:#777; font-size:1rem;}' +  
                    '.epg-next{margin-top:1rem; color:#888; font-size:1rem;}' +  
                    '.epg-bar{height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;}' +  
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%;}' +  
                    '</style>');  
            }  
  
            this.loadPlaylist();  
            this.loadEPG();  
            return root;  
        };  
  
        this.loadPlaylist = function () {  
            var pl = config.playlists[config.current_pl_index];  
            $.ajax({  
                url: pl.url,  
                success: function (str) { _this.parse(str); },  
                error: function () { Lampa.Noty.show('Помилка завантаження плейлиста'); }  
            });  
        };  
  
        this.parse = function (str) {  
            var lines = str.split('\n');  
            groups_data = { '⭐ Обране': config.favorites };  
            for (var i = 0; i < lines.length; i++) {  
                var l = lines[i].trim();  
                if (l.indexOf('#EXTINF') === 0) {  
                    var name = (l.match(/,(.*)$/) || ['', ''])[1].trim();  
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', 'ЗАГАЛЬНІ'])[1];  
                    var logo = (l.match(/tvg-logo="([^"]+)"/i) || ['', ''])[1];  
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];  
                    var tvg_name = (l.match(/tvg-name="([^"]+)"/i) || ['', ''])[1];  
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';  
                    if (url.indexOf('http') === 0) {  
                        var item = { name: name, url: url, group: group, logo: logo, tvg_id: tvg_id, tvg_name: tvg_name };  
                        if (!groups_data[group]) groups_data[group] = [];  
                        groups_data[group].push(item);  
                    }  
                }  
            }  
            this.renderG();  
        };  
  
        this.renderG = function () {  
            colG.empty();  
            Object.keys(groups_data).forEach(function (g, i) {  
                var item = $('<div class="iptv-item">' + g + '</div>');  
                item.on('click', function () { index_g = i; active_col = 'groups'; _this.renderC(groups_data[g]); });  
                colG.append(item);  
            });  
            this.updateFocus();  
        };  
  
        this.renderC = function (list) {  
            colC.empty();  
            current_list = list || [];  
            current_list.forEach(function (c, idx) {  
                var row = $('<div class="iptv-item">' +  
                                '<div class="channel-row">' +  
                                    '<img class="channel-logo" src="' + c.logo + '" onerror="this.src=\'https://via.placeholder.com/40?text=TV\'">' +  
                                    '<div class="channel-title">' + c.name + '</div>' +  
                                '</div>' +  
                            '</div>');  
                row.on('click', function () { Lampa.Player.play({ url: c.url, title: c.name }); });  
                row.on('hover:focus', function () { index_c = idx; _this.showDetails(c); });  
                colC.append(row);  
            });  
            active_col = 'channels';  
            index_c = 0;  
            if (current_list.length) this.showDetails(current_list[0]);  
            this.updateFocus();  
        };  
  
        this.showDetails = function (channel) {  
            colE.empty();  
            colE.append($('<div class="details-box">' +  
                '<img src="' + channel.logo + '" style="width:100%; max-height:150px; object-fit:contain; margin-bottom:1rem; background:#000; padding:5px; border-radius:5px;">' +  
                '<div class="epg-title-big">' + channel.name + '</div>' +  
                '<div class="epg-now">ЗАРАЗ В ЕФІРІ:</div>' +  
                '<div class="epg-prog-name" id="epg-title">Пошук програми...</div>' +  
                '<div class="epg-time" id="epg-time"></div>' +  
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +  
                '<div class="epg-next" id="epg-next"></div>' +  
                '<div style="margin-top:1rem; font-size:1.1rem; color:#555;">ID: ' + (channel.tvg_id || '---') + '</div>' +  
            '</div>'));  
  
            var render = function () {  
                var keys = [channel.tvg_id, channel.tvg_name, channel.name]  
                    .filter(function (k) { return k; })  
                    .map(function (k) { return ('' + k).toLowerCase(); });  
                var progs = [];  
                keys.forEach(function (k) { if (epg_map[k]) progs = progs.concat(epg_map[k]); });  
  
                var now = Date.now() / 1000;  
                var cur = null, next = null;  
                for (var i = 0; i < progs.length; i++) {  
                    var p = progs[i];  
                    if (p.start <= now && now < p.stop) cur = p;  
                    if (p.start > now && !next) next = p;  
                }  
  
                if (cur) {  
                    $('#epg-title').text(cur.title || '—');  
                    $('#epg-time').text(fmtTime(cur.start) + ' – ' + fmtTime(cur.stop));  
                    var perc = (now - cur.start) / (cur.stop - cur.start) * 100;  
                    $('#epg-progress').css('width', Math.min(100, Math.max(0, perc)) + '%');  
                    if (next) $('#epg-next').text('Далі: ' + fmtTime(next.start) + ' ' + next.title);  
                } else {  
                    $('#epg-title').text(epg_loaded ? 'Програма недоступна' : 'EPG завантажується...');  
                }  
            };  
  
            if (epg_loaded) render();  
            else this.loadEPG(render);  
        };  
  
        this.updateFocus = function () {  
            $('.iptv-item').removeClass('active');  
            var target = active_col === 'groups' ? colG : colC;  
            var item = target.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);  
            item.addClass('active');  
            if (item.length) item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });  
        };  
  
        this.start = function () {  
            this.loadEPG();  
  
            Lampa.Controller.add('iptv_pro', {  
                up: function () {  
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);  
                    else index_c = Math.max(0, index_c - 1);  
                    _this.updateFocus();  
                    if (active_col === 'channels') _this.showDetails(current_list[index_c]);  
                },  
                down: function () {  
                    if (active_col === 'groups') index_g = Math.min(colG.find('.iptv-item').length - 1, index_g + 1);  
                    else index_c = Math.min(current_list.length - 1, index_c + 1);  
                    _this.updateFocus();  
                    if (active_col === 'channels') _this.showDetails(current_list[index_c]);  
                },  
                right: function () {  
                    if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);  
                },  
                left: function () {  
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }  
                },  
                enter: function () {  
                    if (active_col === 'groups') _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);  
                    else if (current_list[index_c]) Lampa.Player.play({ url: current_list[index_c].url, title: current_list[index_c].name });  
                },  
                back: function () {  
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }  
                    else Lampa.Activity.backward();  
                }  
            });  
            Lampa.Controller.toggle('iptv_pro');  
        };  
  
        this.render = function () { return root; };  
        this.destroy = function () { Lampa.Controller.remove('iptv_pro'); root.remove(); };  
    }  
  
    function init() {  
        Lampa.Component.add('iptv_pro', IPTVComponent);  
  
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');  
        item.on('hover:enter', function () {  
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_pro' });  
        });  
        $('.menu .menu__list').append(item);  
    }  
  
    if (window.app_ready) init();  
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });  
})();
