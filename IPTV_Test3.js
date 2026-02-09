(function () {
    'use strict';

    // === ГЛОБАЛЬНІ ЗМІННІ EPG З ФРАГМЕНТУ ===
    var EPG = {};
    var epgInterval = false;
    var epgPath = ''; // Визначається динамічно через id2epg

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;

        var storage_key = 'iptv_pro_v12';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'TEST',
                url: 'https://m3u.ch/pl/cbf67b9b46359837429e6deb5b384f9e_e2c018841bc8b4dd2110ddc53d611e72.m3u'
            }],
            epgApiChUrl: 'https://epg.rootu.top/api/config', // Умовний URL для id2epg
            favorites: []
        });

        // === ЛОГІКА ТРАНСЛІТЕРАЦІЇ ТА НОРМАЛІЗАЦІЇ ===
        var trW = {"ё":"e","у":"y","к":"k","е":"e","н":"h","ш":"w","з":"3","х":"x","ы":"bl","в":"b","а":"a","р":"p","о":"o","ч":"4","с":"c","м":"m","т":"t","ь":"b","б":"6"};
        
        var trName = function (word) {
            return word.split('').map(function (char) { return trW[char] || char; }).join("");
        };

        var chShortName = function (chName) {
            return chName.toLowerCase()
                .replace(/\s+\(архив\)$/, '')
                .replace(/\s+\((\+\d+)\)/g, ' $1')
                .replace(/^телеканал\s+/, '')
                .replace(/([!\s.,()–-]+|ⓢ|ⓖ|ⓥ|ⓞ|Ⓢ|Ⓖ|Ⓥ|Ⓞ)/g, ' ')
                .trim()
                .replace(/\s(канал|тв)(\s.+|\s*)$/, '$2')
                .replace(/\s(50|orig|original)$/, '')
                .replace(/\s(\d+)/g, '$1');
        };

        // === ПРИВ'ЯЗКА EPG ID ===
        this.setEpgId = function (channels) {
            Lampa.Network.silent(config.epgApiChUrl, function (chIDs) {
                if (!chIDs['id2epg']) chIDs['id2epg'] = {};
                epgPath = !chIDs['epgPath'] ? '' : ('/' + chIDs['epgPath']);

                var epgIdByName = function (v, find) {
                    var find2 = trName(find);
                    for (var k in v) {
                        var kk = chShortName(k);
                        if (kk === find || kk === find2 || kk.indexOf(find) === 0 || kk.indexOf(find2) === 0) return k;
                    }
                    return false;
                };

                channels.forEach(function (channel) {
                    var chName = chShortName(channel.name);
                    channel.epgId = chIDs.id2epg[channel.tvg_id || ''] || 
                                    epgIdByName(chIDs.id2epg, chName) || 
                                    epgIdByName(chIDs.id2epg, trName(chName)) || 
                                    channel.tvg_id;
                });
            });
        };

        // === ЗАВАНТАЖЕННЯ ДАНИХ ПО ГОДИНАХ ===
        this.epgUpdateData = function (epgId) {
            if (!epgId) return;
            var t = Math.floor(Date.now() / 1000 / 3600) * 3600;
            if (!!EPG[epgId] && t >= EPG[epgId][0] && t <= EPG[epgId][1]) return;
            if (!EPG[epgId]) EPG[epgId] = [t, t, []];

            var url = 'https://epg.rootu.top/api' + epgPath + '/epg/' + epgId + '/hour/' + t;
            $.ajax({
                url: url,
                method: 'GET',
                success: function (r) {
                    if (!r || !r.list) return;
                    var lt = Date.now() / 1000 / 60;
                    for (var i = 0; i < r.list.length; i++) {
                        if (lt < (r.list[i][0] + r.list[i][1])) {
                            EPG[epgId][2] = r.list.slice(i);
                            break;
                        }
                    }
                    EPG[epgId][0] = Math.min(EPG[epgId][0], t);
                    EPG[epgId][1] = Math.max(EPG[epgId][1], t + 3600);
                    _this.epgRender(epgId);
                }
            });
        };

        // === ВІДОБРАЖЕННЯ (RENDER) ===
        this.epgRender = function (epgId) {
            $('[data-epg-id="' + epgId + '"]').each(function () {
                var container = $(this);
                if (EPG[epgId] && EPG[epgId][2] && EPG[epgId][2][0]) {
                    var epg = EPG[epgId][2][0]; // [start_min, duration_min, title, desc]
                    var now_sec = Date.now() / 1000;
                    var start_sec = epg[0] * 60;
                    var duration_sec = epg[1] * 60;
                    var progress = ((now_sec - start_sec) / duration_sec) * 100;

                    container.find('#epg-title').text(epg[2]);
                    container.find('#epg-progress').css('width', Math.min(100, Math.max(0, progress)) + '%');
                }
            });
        };

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
                    '.col-groups{width:20%; min-width:180px;}' +
                    '.col-channels{width:45%; flex-grow:1;}' +
                    '.col-details{width:35%; background:#080a0d; padding:1.5rem;}' +
                    '.iptv-item{padding:1rem;margin:.3rem;border-radius:.5rem;background:rgba(255,255,255,.03);}' +
                    '.iptv-item.active{background:#2962ff;}' +
                    '.epg-bar{height:4px; background:rgba(255,255,255,0.1); margin-top:10px;}' +
                    '.epg-bar-inner{height:100%; background:#2962ff; width:0%; transition: width 0.5s;}' +
                    '</style>');
            }

            this.loadPlaylist();
            this.startEpgTimer();
            return root;
        };

        this.startEpgTimer = function () {
            if (epgInterval) clearInterval(epgInterval);
            epgInterval = setInterval(function () {
                for (var epgId in EPG) {
                    _this.epgRender(epgId);
                }
            }, 10000);
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[0];
            $.ajax({
                url: pl.url,
                success: function (str) { _this.parse(str); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            var all_channels = [];
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (l.match(/group-title="([^"]+)"/i) || ['', 'ЗАГАЛЬНІ'])[1];
                    var tvg_id = (l.match(/tvg-id="([^"]+)"/i) || ['', ''])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';
                    if (url.indexOf('http') === 0) {
                        var item = { name: name, url: url, group: group, tvg_id: tvg_id };
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push(item);
                        all_channels.push(item);
                    }
                }
            }
            this.setEpgId(all_channels);
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
                var row = $('<div class="iptv-item"><div>' + c.name + '</div></div>');
                row.on('click', function () { 
                    // Використання Catchup таймлайну при старті
                    var video = { url: c.url, title: c.name };
                    if (c.epgId && EPG[c.epgId] && EPG[c.epgId][2][0]) {
                        var epg = EPG[c.epgId][2][0];
                        video['timeline'] = {
                            time: 0, 
                            percent: 0,
                            duration: (epg[1] * 60)
                        };
                    }
                    Lampa.Player.play(video); 
                });
                row.on('hover:focus', function () { index_c = idx; _this.showDetails(c); });
                colC.append(row);
            });
            active_col = 'channels';
            this.updateFocus();
        };

        this.showDetails = function (channel) {
            colE.empty();
            // Додаємо data-epg-id для автоматичного оновлення
            var content = $('<div class="details-box" data-epg-id="' + channel.epgId + '">' +
                '<div style="font-size:1.6rem; font-weight:700;">' + channel.name + '</div>' +
                '<div style="color:#2962ff; margin-top:1.5rem;">ЗАРАЗ:</div>' +
                '<div id="epg-title" style="font-size:1.4rem;">Завантаження...</div>' +
                '<div class="epg-bar"><div class="epg-bar-inner" id="epg-progress"></div></div>' +
            '</div>');
            colE.append(content);
            
            if (channel.epgId) {
                this.epgUpdateData(channel.epgId);
            }
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var target = active_col === 'groups' ? colG : colC;
            var item = target.find('.iptv-item').eq(active_col === 'groups' ? index_g : index_c);
            item.addClass('active');
            if (item.length) item[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        };

        this.start = function () {
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
                    else if (current_list[index_c]) $('.iptv-item.active').click();
                },
                back: function () {
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }
                    else Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = function () { return root; };
        this.destroy = function () { 
            if (epgInterval) clearInterval(epgInterval);
            Lampa.Controller.remove('iptv_pro'); 
            root.remove(); 
        };
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
