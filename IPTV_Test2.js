// ==Lampa==  
// name: IPTV PRO (EPG Built-in)  
// version: 12.11  
  
(function () {  
    'use strict';  
  
    function IPTVComponent() {  
        var _this = this;  
        var root, colG, colC, colE;  
        var groups_data = {};  
        var current_list = [];  
        var active_col = 'groups';  
        var index_g = 0, index_c = 0;  
  
        var epg_map = {};        // xmltv channel id (lowercase) -> [{title, desc, start, stop}]  (ms!)  
        var epg_channels = {};   // display-name (lowercase) -> xmltv channel id  
        var epg_loaded = false;  
        var epg_loading = false;  
        var epg_queue = [];  
  
        var storage_key = 'iptv_pro_v12';  
        var config = Lampa.Storage.get(storage_key, {  
            playlists: [{  
                name: 'TEST',  
                url: 'https://m3u.ch/pl/61b9ea4e90c4cf3165a4d19656e126a8_cf72fbb9e7ee647289c76620f1df15b4.m3u'  
            }],  
            epg_url: 'https://crowley24.github.io/epg.xml',  
            favorites: [],  
            current_pl_index: 0  
        });  
  
        // ---------- helpers ----------  
  
        function parseXMLTVTime(s) {  
            // 'YYYYMMDDHHmmss +0300' -> мс  
            if (!s) return 0;  
            var m = s.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);  
            if (!m) return 0;  
            var iso = m[1] + '-' + m[2] + '-' + m[3] + 'T' + m[4] + ':' + m[5] + ':' + m[6];  
            if (m[7]) iso += m[7].slice(0, 3) + ':' + m[7].slice(3);  
            var t = Date.parse(iso);  
            return isNaN(t) ? 0 : t;  
        }  
  
        function fmtTime(t) {  
            var d = new Date(t);  
            return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);  
        }  
  
        function decodeEntities(s) {  
            return (s || '').replace(/&quot;/g, '"').replace(/&#039;/g, "'")  
                .replace(/&amp;/g, '&').replace(/<!\[CDATA\[|\]\]>/g, '')  
                .replace(/&.+?;/g, '').trim();  
        }  
  
        function flushEPGQueue() {  
            epg_queue.forEach(function (cb) { try { cb(); } catch (e) {} });  
            epg_queue = [];  
        }  
  
        // ---------- EPG load + regex parse (як у CUB-плагіні) ----------  
  
        this.loadEPG = function (onDone) {  
            if (onDone) epg_queue.push(onDone);  
            if (epg_loaded) { flushEPGQueue(); return; }  
            if (epg_loading) return;  
            epg_loading = true;  
  
            function parse(str) {  
                try {  
                    // <channel id="..."><display-name>...</display-name></channel>  
                    var reCh = /<channel[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/g, mc;  
                    while ((mc = reCh.exec(str))) {  
                        var cid = mc[1];  
                        var reDn = /<display-name[^>]*>([\s\S]*?)<\/display-name>/g, md;  
                        while ((md = reDn.exec(mc[2]))) {  
                            epg_channels[decodeEntities(md[1]).toLowerCase()] = cid;  
                        }  
                    }  
  
                    // <programme channel="..." start="..." stop="...">...</programme>  
                    var rePr = /<programme[^>]*channel="([^"]+)"[^>]*start="([^"]+)"[^>]*stop="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g, mp;  
                    while ((mp = rePr.exec(str))) {  
                        var key = mp[1].toLowerCase();  
                        var body = mp[4];  
                        var title = /<title[^>]*>([\s\S]*?)<\/title>/.exec(body);  
                        var desc = /<desc[^>]*>([\s\S]*?)<\/desc>/.exec(body);  
                        (epg_map[key] = epg_map[key] || []).push({  
                            title: decodeEntities(title ? title[1] : ''),  
                            desc: decodeEntities(desc ? desc[1] : ''),  
                            start: parseXMLTVTime(mp[2]),  
                            stop: parseXMLTVTime(mp[3])  
                        });  
                    }  
  
                    epg_loaded = true;  
                    console.log('[IPTV] EPG loaded, channels:', Object.keys(epg_map).length);  
                } catch (e) {  
                    console.log('[IPTV] EPG parse error', e);  
                }  
                epg_loading = false;  
                flushEPGQueue();  
            }  
  
            function gunzip(bytes) {  
                if (window.pako) {  
                    parse(new TextDecoder().decode(pako.ungzip(bytes)));  
                } else if (window.DecompressionStream) {  
                    var ds = new DecompressionStream('gzip');  
                    var stream = new Blob([bytes]).stream().pipeThrough(ds);  
                    new Response(stream).text().then(parse);  
                } else {  
                    parse(new TextDecoder().decode(bytes));  
                }  
            }  
  
            console.log('[IPTV] EPG try:', config.epg_url);  
            fetch(config.epg_url)  
                .then(function (r) {  
                    if (!r.ok) throw new Error('HTTP ' + r.status);  
                    return r.arrayBuffer();  
                })  
                .then(function (buf) {  
                    var bytes = new Uint8Array(buf);  
                    var head = new TextDecoder().decode(bytes.slice(0, 100));  
                    if (head.indexOf('<?xml') !== -1 || head.indexOf('<tv') !== -1) {  
                        parse(new TextDecoder().decode(bytes));  
                    } else {  
                        gunzip(bytes);  
                    }  
                })  
                .catch(function (e) {  
                    console.log('[IPTV] EPG fail:', e);  
                    epg_loading = false;  
                    flushEPGQueue();  
                });  
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
                    '.epg-bar{height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;}' +  
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%;}' +  
                    '</style>');  
            }  
  
            this.loadPlaylist();  
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
            var cur = null;  
            groups_data = {};  
  
            for (var i = 0; i < lines.length; i++) {  
                var line = lines[i].trim();  
                if (line.indexOf('#EXTINF') === 0) {  
                    cur = {  
                        name: (line.split(',').pop() || '').trim(),  
                        tvg_id: (/tvg-id="([^"]*)"/.exec(line) || [])[1] || '',  
                        tvg_name: (/tvg-name="([^"]*)"/.exec(line) || [])[1] || '',  
                        logo: (/tvg-logo="([^"]*)"/.exec(line) || [])[1] || '',  
                        group: (/group-title="([^"]*)"/.exec(line) || [])[1] || 'Інше'  
                    };  
                } else if (line && line.indexOf('#') !== 0 && cur) {  
                    cur.url = line;  
                    (groups_data[cur.group] = groups_data[cur.group] || []).push(cur);  
                    cur = null;  
                }  
            }  
  
            this.renderG();  
        };  
  
        this.renderG = function () {  
            colG.empty();  
            Object.keys(groups_data).forEach(function (g, i) {  
                var item = $('<div class="iptv-item">' + g + ' <span style="opacity:.5">(' + groups_data[g].length + ')</span></div>');  
                if (i === index_g) item.addClass('active');  
                item.on('click', function () { _this.renderC(groups_data[g]); });  
                colG.append(item);  
            });  
            var first = Object.keys(groups_data)[0];  
            if (first) this.renderC(groups_data[first]);  
        };  
  
        this.renderC = function (list) {  
            active_col = 'channels';  
            index_c = 0;  
            current_list = list;  
            colC.empty();  
  
            list.forEach(function (c, i) {  
                var row = $('<div class="iptv-item channel-row">' +  
                    '<img class="channel-logo" src="' + c.logo + '" onerror="this.style.visibility=\'hidden\'">' +  
                    '<div class="channel-title">' + c.name + '</div></div>');  
                if (i === 0) row.addClass('active');  
                row.on('click', function () { Lampa.Player.play({ url: c.url, title: c.name }); });  
                row.on('hover:focus', function () { _this.showDetails(c); });  
                colC.append(row);  
            });  
  
            _this.updateFocus();  
            if (current_list[0]) this.showDetails(current_list[0]);  
        };  
  
        // ---------- EPG → channel matching ----------  
  
        this.showDetails = function (channel) {  
            colE.empty();  
            colE.append($('<div class="details-box">' +  
                '<img src="' + channel.logo + '" style="width:100%;max-height:150px;object-fit:contain;margin-bottom:1rem;background:#000;padding:5px;border-radius:5px;">' +  
                '<div class="epg-title-big">' + channel.name + '</div>' +  
                '<div class="epg-now">ЗАРАЗ В ЕФІРІ:</div>' +  
                '<div class="epg-prog-name" id="epg-title">Пошук програми...</div>' +  
                '<div id="epg-time" style="color:#777;font-size:1rem;"></div>' +  
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +  
                '<div id="epg-next" style="margin-top:1rem;color:#888;font-size:1rem;"></div>' +  
            '</div>'));  
  
            var resolveProgs = function () {  
                // 1) прямий матч по tvg-id = channel id  
                var key = (channel.tvg_id || '').toLowerCase();  
                if (epg_map[key]) return epg_map[key];  
                // 2) tvg-name / name через epg_channels (display-name → id)  
                var cid = epg_channels[(channel.tvg_name || channel.name || '').toLowerCase()] ||  
                          epg_channels[(channel.name || '').toLowerCase()];  
                if (cid && epg_map[cid.toLowerCase()]) return epg_map[cid.toLowerCase()];  
                // 3) прямий ключ по імені  
                return epg_map[(channel.name || '').toLowerCase()] || [];  
            };  
  
            var render = function () {  
                var progs = resolveProgs();  
                var now = Date.now();  
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
