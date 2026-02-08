// ==Lampa==
// name: IPTV Ultra PRO (Fixed)
// version: 8.1
// author: Gemini & Artrax90
// ==/Lampa==

(function () {
    'use strict';

    const plugin_info = {
        component: 'iptv_ultra_pro',
        version: '8.1',
        name: 'IPTV Ultra PRO'
    };

    function IPTVUltra(object) {
        var root, colG, colC;
        var groups_data = {};
        var current_list = [];

        this.create = function () {
            root = $('<div class="iptv-ultra-root"></div>');
            
            if (!$('#iptv-ultra-style').length) {
                $('head').append(`<style id="iptv-ultra-style">
                    .iptv-ultra-root { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0b0d10; z-index: 1000; display: flex; padding-top: 3.5rem; color: #fff; font-family: sans-serif; }
                    .col-groups { width: 30%; background: #0d1013; border-right: 1px solid rgba(255,255,255,0.05); overflow-y: auto; }
                    .col-channels { flex: 1; background: #0b0d10; overflow-y: auto; padding: 10px; }
                    .iptv-row { padding: 12px 15px; margin: 5px; border-radius: 8px; background: rgba(255,255,255,0.03); cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
                    .iptv-row.active { background: #2962ff !important; border-color: #fff; }
                    .ch-header { display: flex; align-items: center; gap: 12px; }
                    .ch-logo { width: 45px; height: 45px; object-fit: contain; background: #000; border-radius: 6px; flex-shrink: 0; }
                    .ch-info { flex: 1; overflow: hidden; }
                    .ch-name { font-weight: bold; font-size: 1.1rem; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .epg-text { font-size: 0.85rem; color: #30ffaa; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .epg-bar-container { width: 100%; height: 4px; background: rgba(255,255,255,0.15); margin-top: 8px; border-radius: 2px; overflow: hidden; }
                    .epg-bar-fill { height: 100%; background: #30ffaa; width: 0%; transition: width 0.4s ease; }
                </style>`);
            }

            colG = $('<div class="col-groups"></div>');
            colC = $('<div class="col-channels"></div>');
            root.append(colG, colC);
            
            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            colG.html('<div style="padding:20px; opacity:0.6;">Завантаження списку...</div>');
            const url = 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u';
            
            // Використання Lampa.Reguest для уникнення проблем з CORS
            var network = new Lampa.Reguest();
            network.silent(url, (data) => {
                if (data) this.parse(data);
                else colG.html('<div style="padding:20px;">Помилка: Плейлист порожній</div>');
            }, () => {
                colG.html('<div style="padding:20px;">Помилка мережі</div>');
            }, false, { dataType: 'text' });
        };

        this.parse = function (data) {
            try {
                groups_data = {"УСІ": []};
                let lines = data.split('\n');
                let ch = null;

                lines.forEach(line => {
                    line = line.trim();
                    if (line.startsWith('#EXTINF')) {
                        let name = line.split(',').pop();
                        let grp = (line.match(/group-title="([^"]+)"/i) || [,'ІНШЕ'])[1];
                        let logo = (line.match(/tvg-logo="([^"]+)"/i) || [,''])[1];
                        let tid = (line.match(/tvg-id="([^"]+)"/i) || [,''])[1];
                        ch = { name, grp, logo, tid };
                    } else if (line.startsWith('http') && ch) {
                        ch.url = line;
                        if (!groups_data[ch.grp]) groups_data[ch.grp] = [];
                        groups_data[ch.grp].push(ch);
                        groups_data["УСІ"].push(ch);
                        ch = null;
                    }
                });
                this.renderGroups();
            } catch (e) {
                console.log('IPTV Error:', e);
            }
        };

        this.renderGroups = function () {
            colG.empty();
            Object.keys(groups_data).forEach((name, i) => {
                let count = groups_data[name].length;
                let div = $(`<div class="iptv-row group-item" data-idx="${i}">${name} (${count})</div>`);
                div.on('click', function() {
                    $('.group-item').removeClass('active');
                    $(this).addClass('active');
                    IPTVUltra.instance.renderChannels(name);
                });
                colG.append(div);
            });
            colG.find('.group-item').first().click();
        };

        this.renderChannels = function (groupName) {
            colC.empty().scrollTop(0);
            current_list = groups_data[groupName] || [];
            current_list.forEach((ch, i) => {
                let card = $(`
                    <div class="iptv-row chan-item">
                        <div class="ch-header">
                            <img src="${ch.logo}" class="ch-logo" onerror="this.src='https://placehold.co/100x100?text=TV'">
                            <div class="ch-info">
                                <div class="ch-name">${ch.name}</div>
                                <div class="epg-text" id="epg-t-${i}">Програма завантажується...</div>
                                <div class="epg-bar-container"><div class="epg-bar-fill" id="epg-b-${i}"></div></div>
                            </div>
                        </div>
                    </div>
                `);
                card.on('click', () => {
                    Lampa.Player.play({ url: ch.url, title: ch.name });
                });
                colC.append(card);
                this.loadEPG(ch, i);
            });
        };

        this.loadEPG = function (ch, idx) {
            if (!Lampa.Tvg) return;
            
            try {
                Lampa.Tvg.get({name: ch.name, id: ch.tid}, (data) => {
                    if (data && data.list && data.list.length) {
                        let now = Date.now();
                        let cur = data.list.find(p => p.start <= now && p.stop >= now);
                        if (cur) {
                            let total = cur.stop - cur.start;
                            let elapsed = now - cur.start;
                            let per = Math.min(100, Math.max(0, (elapsed / total) * 100));
                            $(`#epg-t-${idx}`).text(cur.title);
                            $(`#epg-b-${idx}`).css('width', per + '%');
                        } else {
                            $(`#epg-t-${idx}`).text('Немає інформації про ефір');
                        }
                    } else {
                        $(`#epg-t-${idx}`).text('Програма відсутня');
                    }
                });
            } catch(e) {
                $(`#epg-t-${idx}`).text('Помилка EPG');
            }
        };

        this.start = function () {
            IPTVUltra.instance = this;
            Lampa.Controller.add('iptv_ultra', {
                toggle: () => {},
                back: () => { Lampa.Activity.back(); }
            });
            Lampa.Controller.toggle('iptv_ultra');
        };

        this.pause = this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { root.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_ultra', IPTVUltra);
        let menu_item = $(`<li class="menu__item selector">
            <div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg></div>
            <div class="menu__text">IPTV PRO</div>
        </li>`);

        menu_item.on('hover:enter', () => {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_ultra' });
        });

        $('.menu .menu__list').append(menu_item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
