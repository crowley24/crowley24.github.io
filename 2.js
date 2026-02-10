(function () {
    'use strict';

    var EPG = {};
    var epgInterval = false;
    var chIDs = { id2epg: {}, epgPath: '' };
    var plugin_name = 'IPTV PRO';

    // --- Допоміжні функції ---
    function unixtime() { return Math.floor(Date.now() / 1000); }

    function strReplace(str, key2val) {
        for (var key in key2val) {
            if (Object.prototype.hasOwnProperty.call(key2val, key)) {
                str = str.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), key2val[key]);
            }
        }
        return str;
    }

    function tf(t, format, u, tz) {
        format = format || '';
        tz = parseInt(tz || '0');
        var thisOffset = tz * 60;
        if (!u && window.Lampa) {
            thisOffset += parseInt(window.Lampa.Storage.get('time_offset', 'n0').replace('n', '')) * 60 - new Date().getTimezoneOffset();
        }
        var d = new Date((t + thisOffset) * 6e4);
        var r = { 
            yyyy: d.getUTCFullYear(), 
            MM: ('0' + (d.getUTCMonth() + 1)).substr(-2), 
            dd: ('0' + d.getUTCDate()).substr(-2), 
            HH: ('0' + d.getUTCHours()).substr(-2), 
            mm: ('0' + d.getUTCMinutes()).substr(-2), 
            ss: ('0' + d.getUTCSeconds()).substr(-2) 
        };
        return strReplace(format, r);
    }

    function catchupUrl(url, type, source) {
        type = (type || '').toLowerCase();
        source = source || '';
        if (!type) {
            if (source && source.search(/^https?:\/\/|^\/|^\?/i) === 0) type = 'default';
            else if (url.indexOf('${') < 0) type = 'shift';
            else type = 'default';
        }
        var newUrl = source || url;
        if (type === 'shift' || type === 'timeshift') {
            newUrl += (newUrl.indexOf('?') >= 0 ? '&' : '?') + 'utc=${start}&lutc=${timestamp}';
        } else if (type === 'xc') {
            newUrl = newUrl.replace(/^(https?:\/\/[^/]+)(\/live)?(\/[^/]+\/[^/]+\/)([^/.]+)(\.m3u8?|\.ts|)$/i, '$1/timeshift$3${(d)M}/${(b)yyyy-MM-dd:HH-mm}/$4$5');
        }
        return newUrl;
    }

    function prepareUrl(url, epg) {
        var m = [], val = '', r = { start: unixtime(), offset: 0 };
        if (epg && epg.length) {
            r = {
                start: epg[0] * 60,
                utc: epg[0] * 60,
                end: (epg[0] + epg[1]) * 60,
                duration: epg[1] * 60,
                offset: unixtime() - epg[0] * 60,
                b: function (m) { return tf(epg[0], m[6], m[4], m[5]); },
                d: function (m) { return strReplace(m[6] || '', { M: epg[1], S: epg[1] * 60, h: Math.floor(epg[1] / 60) }); }
            };
        }
        var regex = /\${(\((([a-zA-Z\d]+?)(u)?)([+-]\d+)?\))?([^${}]+)}/;
        while (m = url.match(regex)) {
            val = (m[6] in r) ? (typeof r[m[6]] === "function" ? r[m[6]]() : r[m[6]]) : m[1];
            if (m[2] && typeof r[m[2]] === "function") val = r[m[2]](m);
            url = url.replace(m[0], encodeURIComponent(val));
        }
        return url;
    }

    // --- Компонент IPTV ---
    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var active_col = 'groups';
        var index_g = 0, index_c = 0;
        var current_list = [];

        this.create = function () {
            root = $('<div class="iptv-root"><div class="iptv-flex-wrapper"></div></div>');
            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');
            root.find('.iptv-flex-wrapper').append(colG, colC, colE);
            
            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            // Тут має бути URL твого плейлиста
            var pl_url = 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u';
            $.ajax({
                url: pl_url,
                method: 'GET',
                success: function (str) { _this.parse(str); },
                error: function () { window.Lampa.Noty.show('Помилка завантаження'); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = { 'Усі': [] };
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf('#EXTINF') === 0) {
                    var name = (lines[i].match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (lines[i].match(/group-title="([^"]+)"/i) || ['', 'Інші'])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';
                    if (url.indexOf('http') === 0) {
                        var item = { name: name, url: url, group: group };
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push(item);
                        groups_data['Усі'].push(item);
                    }
                }
            }
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            Object.keys(groups_data).forEach(function (g, i) {
                var item = $('<div class="iptv-item' + (i === index_g ? ' active' : '') + '">' + g + '</div>');
                colG.append(item);
            });
        };

        this.render = function () { return root; };
        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () { if (epgInterval) clearInterval(epgInterval); };
    }

    // --- Ініціалізація ---
    function init() {
        if (!window.Lampa) return;
        window.Lampa.Component.add('iptv_pro', IPTVComponent);
        
        var menu_item = $('<li class="menu__item selector"><div class="menu__text">' + plugin_name + '</div></li>');
        menu_item.on('hover:enter', function () {
            window.Lampa.Activity.push({ title: plugin_name, component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(menu_item);
    }

    if (window.app_ready) init();
    else {
        document.addEventListener('app_ready', init); // Для надійності
        if (window.Lampa) window.Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
    }
})();
