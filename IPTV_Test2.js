(function ($, Lampa) {
    'use strict';

    // Глобальне сховище EPG (як у твоєму прикладі)
    var EPG = {};
    var epgInterval = false;

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;
        var epgPath = ''; // Шлях до API

        // Налаштування API (rootu.top часто використовується в таких плагінах)
        var listCfg = {
            epgApiChUrl: 'http://epg.rootu.top/api/channels', // Приклад бази каналів
            isEpgIt999: false
        };

        /* ==========================================================
           1. ТРАНСЛІТЕРАЦІЯ ТА ОЧИЩЕННЯ ІМЕН (Твій метод)
        ========================================================== */
        var trW = {"ё":"e","у":"y","к":"k","е":"e","н":"h","ш":"w","з":"3","х":"x","ы":"bl","в":"b","а":"a","р":"p","о":"o","ч":"4","с":"c","м":"m","т":"t","ь":"b","б":"6"};
        var trName = function(w){ return w.split('').map(function(c){return trW[c]||c;}).join(""); };
        var chShortName = function(n){
            return n.toLowerCase().replace(/\s+\(архив\)$/, '').replace(/^телеканал\s+/, '').replace(/([!\s.,()–-]+)/g, ' ').trim();
        };

        /* ==========================================================
           2. ПРИВ'ЯЗКА EPG ID ДО КАНАЛІВ
        ========================================================== */
        this.setEpgIds = function(channels) {
            channels.forEach(function(channel) {
                if (channel.epgId) return;
                // Логіка: якщо немає tvg-id, намагаємось знайти за назвою
                channel.epgId = channel.tvg_id || trName(chShortName(channel.name));
            });
        };

        /* ==========================================================
           3. ЗАВАНТАЖЕННЯ ДАНИХ (Погодинно)
        ========================================================== */
        this.epgUpdateData = function(epgId) {
            if (!epgId) return;
            var t = Math.floor(Date.now() / 1000 / 3600) * 3600;
            
            // Якщо дані вже свіжі — виходимо
            if (EPG[epgId] && t >= EPG[epgId][0] && t <= EPG[epgId][1]) return;

            $.ajax({
                url: 'http://epg.rootu.top/api/epg/' + epgId + '/hour/' + t,
                method: 'GET',
                success: function(r) {
                    if (r && r.list) {
                        EPG[epgId] = [t, t + 3600, r.list];
                        _this.renderEpgStatic(epgId);
                    }
                }
            });
        };

        this.renderEpgStatic = function(epgId) {
            // Оновлюємо тільки якщо цей канал зараз виділений
            if (current_list[index_c] && (current_list[index_c].tvg_id === epgId || trName(chShortName(current_list[index_c].name)) === epgId)) {
                _this.showDetails(current_list[index_c]);
            }
        };

        // ... ( create, loadPlaylist, parse залишаються схожими )

        this.showDetails = function (channel) {
            colE.empty();
            var epgId = channel.tvg_id || trName(chShortName(channel.name));
            
            var content = $('<div class="details-box">' +
                '<img src="' + channel.logo + '" class="details-img" style="width:100%; max-height:120px; object-fit:contain;">' +
                '<div class="epg-title-big">' + channel.name + '</div>' +
                '<div id="epg-content-v13"></div>' +
            '</div>');
            colE.append(content);

            var data = EPG[epgId];
            if (data) {
                var now = Date.now() / 1000;
                var current = data[2].find(function(e) { return now >= e[0] && now <= (e[0] + e[1]*60); });
                
                if (current) {
                    var perc = ((now - current[0]) / (current[1] * 60)) * 100;
                    $('#epg-content-v13').html(
                        '<div class="epg-now">Зараз:</div>' +
                        '<div class="epg-prog-name">' + current[2] + '</div>' +
                        '<div class="epg-bar"><div class="epg-bar-inner" style="width:'+perc+'%"></div></div>'
                    );
                }
            } else {
                this.epgUpdateData(epgId);
                $('#epg-content-v13').html('<div class="epg-prog-name">Завантаження програми...</div>');
            }
        };

        this.start = function () {
            // Запускаємо таймер оновлення (Твій метод)
            if (epgInterval) clearInterval(epgInterval);
            epgInterval = setInterval(function () {
                if (active_col === 'channels' && current_list[index_c]) {
                    _this.showDetails(current_list[index_c]);
                }
            }, 30000); // Раз на 30 сек достатньо

            // ... Реєстрація контролера ...
            Lampa.Controller.add('iptv_pro', {
                // (Тут логіка кнопок як раніше)
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        // ... решта методів (render, destroy)
    }

    // Реєстрація плагіна...
})(window.jQuery, window.Lampa);
