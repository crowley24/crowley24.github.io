// ==Lampa==
// name: IPTV Ultra Engine PRO
// version: 8.0
// author: Gemini & Artrax90
// ==/Lampa==

(function () {
    'use strict';

    const plugin_info = {
        component: 'iptv_ultra_pro',
        version: '8.0',
        name: 'IPTV Ultra PRO'
    };

    // --- Допоміжні функції очищення та пошуку (з твого коду) ---
    const chShortName = (chName) => {
        return chName.toLowerCase()
            .replace(/\s+\(архив\)$/, '').replace(/\s+\((\+\d+)\)/g, ' $1')
            .replace(/^телеканал\s+/, '').replace(/([!\s.,()–-]+|ⓢ|ⓖ|ⓥ|ⓞ|Ⓢ|Ⓖ|Ⓥ|Ⓞ)/g, ' ').trim()
            .replace(/\s(канал|тв)(\s.+|\s*)$/, '$2').replace(/\s(50|orig|original)$/, '').replace(/\s(\d+)/g, '$1');
    };

    const trW = {"ё":"e","у":"y","к":"k","е":"e","н":"h","ш":"w","з":"3","х":"x","ы":"bl","в":"b","а":"a","р":"p","о":"o","ч":"4","с":"c","м":"m","т":"t","ь":"b","б":"6"};
    const trName = (word) => word.split('').map(char => trW[char] || char).join("");

    // --- Основний компонент ---
    function IPTVUltra(object) {
        var root, colG, colC, info;
        var groups_data = {};
        var current_list = [];
        var active_idx_g = 0;
        var epg_data = {};

        this.create = function () {
            root = $('<div class="iptv-ultra-root"></div>');
            // Додаємо стилі динамічно
            if (!$('#iptv-ultra-style').length) {
                $('head').append(`<style id="iptv-ultra-style">
                    .iptv-ultra-root { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0b0d10; z-index: 1000; display: flex; padding-top: 3.5rem; }
                    .col-groups { width: 25%; background: #0d1013; border-right: 1px solid rgba(255,255,255,0.05); overflow-y: auto; }
                    .col-channels { flex: 1; background: #0b0d10; overflow-y: auto; }
                    .iptv-row { padding: 1rem; margin: 0.4rem; border-radius: 0.6rem; background: rgba(255,255,255,0.03); cursor: pointer; border: 2px solid transparent; }
                    .iptv-row.active { background: #2962ff; border-color: #fff; }
                    .ch-header { display: flex; align-items: center; gap: 1rem; }
                    .ch-logo { width: 3.2rem; height: 3.2rem; object-fit: contain; background: #000; border-radius: 0.4rem; }
                    .epg-bar-container { width: 100%; height: 4px; background: rgba(255,255,255,0.1); margin-top: 8px; border-radius: 2px; }
                    .epg-bar-fill { height: 100%; background: #30ffaa; width: 0%; transition: width 0.3s; }
                    .epg-text { font-size: 0.85rem; color: #30ffaa; margin-top: 4px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                </style>`);
            }

            colG = $('<div class="col-groups"></div>');
            colC = $('<div class="col-channels"></div>');
            root.append(colG, colC);
            
            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            colG.html('<div style="padding:2rem">Завантаження...</div>');
            // Використовуємо лінк на твій плейлист або дефолтний
            const url = Lampa.Storage.get(plugin_info.component + '_list_url_0') || 'https://m3u.ch/pl/86727211832faa261da1f840b1a63f84_c12804a6605dcff3dbef1d0b77084e84.m3u';
            
            $.get(url, (data) => {
                this.parse(data);
            });
        };

        this.parse = function (data) {
            groups_data = {"УСІ": []};
            let lines = data.split('\n');
            let current_chan = null;

            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('#EXTINF')) {
                    let name = line.split(',').pop();
                    let grp = (line.match(/group-title="([^"]+)"/i) || [,'ІНШЕ'])[1];
                    let logo = (line.match(/tvg-logo="([^"]+)"/i) || [,''])[1];
                    let tid = (line.match(/tvg-id="([^"]+)"/i) || [,''])[1];
                    current_chan = { name, grp, logo, tid };
                } else if (line.startsWith('http') && current_chan) {
                    current_chan.url = line;
                    if (!groups_data[current_chan.grp]) groups_data[current_chan.grp] = [];
                    groups_data[current_chan.grp].push(current_chan);
                    groups_data["УСІ"].push(current_chan);
                    current_chan = null;
                }
            });
            this.renderGroups();
        };

        this.renderGroups = function () {
            colG.empty();
            Object.keys(groups_data).forEach((name, i) => {
                let div = $(`<div class="iptv-row group-item" data-idx="${i}">${name} (${groups_data[name].length})</div>`);
                div.on('click', () => {
                    active_idx_g = i;
                    $('.group-item').removeClass('active');
                    div.addClass('active');
                    this.renderChannels(name);
                });
                colG.append(div);
            });
            colG.find('.group-item').first().click();
        };

        this.renderChannels = function (groupName) {
            colC.empty();
            current_list = groups_data[groupName];
            current_list.forEach((ch, i) => {
                let card = $(`
                    <div class="iptv-row chan-item">
                        <div class="ch-header">
                            <img src="${ch.logo}" class="ch-logo" onerror="this.src='https://placehold.co/100x100?text=TV'">
                            <div style="flex:1; overflow:hidden">
                                <div style="font-weight:bold">${ch.name}</div>
                                <div class="epg-text" id="epg-txt-${i}">Завантаження програми...</div>
                                <div class="epg-bar-container"><div class="epg-bar-fill" id="epg-bar-${i}"></div></div>
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
            // Використання стандартного сервісу Lampa для отримання програми
            Lampa.Tvg.get({name: ch.name, id: ch.tid}, (data) => {
                if (data && data.list && data.list.length) {
                    let now = Date.now();
                    let cur = data.list.find(p => p.start <= now && p.stop >= now);
                    if (cur) {
                        let total = cur.stop - cur.start;
                        let elapsed = now - cur.start;
                        let per = Math.round((elapsed / total) * 100);
                        $(`#epg-txt-${idx}`).text(cur.title);
                        $(`#epg-bar-${idx}`).css('width', per + '%');
                    }
                } else {
                    $(`#epg-txt-${idx}`).text('Програма відсутня');
                }
            });
        };

        this.start = function () {
            Lampa.Controller.add('iptv_ultra', {
                toggle: () => {},
                left: () => { Lampa.Controller.toggle('menu'); },
                back: () => { Lampa.Activity.back(); }
            });
            Lampa.Controller.toggle('iptv_ultra');
        };

        this.pause = this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { root.remove(); };
    }

    // --- Реєстрація в Lampa ---
    function init() {
        Lampa.Component.add('iptv_ultra', IPTVUltra);
        
        // Додаємо в меню
        let menu_item = $(`<li class="menu__item selector">
            <div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg></div>
            <div class="menu__text">IPTV PRO</div>
        </li>`);

        menu_item.on('hover:enter', () => {
            Lampa.Activity.push({
                title: 'IPTV PRO',
                component: 'iptv_ultra',
                page: 1
            });
        });

        $('.menu .menu__list').append(menu_item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });

})();
