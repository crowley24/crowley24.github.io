;(function () {
    'use strict';

    var plugin = {
        component: 'my_iptv',
        icon: "<svg height=\"244\" viewBox=\"0 0 260 244\" xmlns=\"http://www.w3.org/2000/svg\" style=\"fill-rule:evenodd;\" fill=\"currentColor\"><path d=\"M259.5 47.5v114c-1.709 14.556-9.375 24.723-23 30.5a2934.377 2934.377 0 0 1-107 1.5c-35.704.15-71.37-.35-107-1.5-13.625-5.777-21.291-15.944-23-30.5v-115c1.943-15.785 10.61-25.951 26-30.5a10815.71 10815.71 0 0 1 208 0c15.857 4.68 24.523 15.18 26 31.5zm-230-13a4963.403 4963.403 0 0 0 199 0c5.628 1.128 9.128 4.462 10.5 10 .667 40 .667 80 0 120-1.285 5.618-4.785 8.785-10.5 9.5-66 .667-132 .667-198 0-5.715-.715-9.215-3.882-10.5-9.5-.667-40-.667-80 0-120 1.35-5.18 4.517-8.514 9.5-10z\"/><path d=\"M70.5 71.5c17.07-.457 34.07.043 51 1.5 5.44 5.442 5.107 10.442-1 15-5.991.5-11.991.666-18 .5.167 14.337 0 28.671-.5 43-3.013 5.035-7.18 6.202-12.5 3.5a11.529 11.529 0 0 1-3.5-4.5 882.407 882.407 0 0 1-.5-42c-5.676.166-11.343 0-17-.5-4.569-2.541-6.069-6.375-4.5-11.5 1.805-2.326 3.972-3.992 6.5-5zM137.5 73.5c4.409-.882 7.909.452 10.5 4a321.009 321.009 0 0 0 16 30 322.123 322.123 0 0 0 16-30c2.602-3.712 6.102-4.879 10.5-3.5 5.148 3.334 6.314 7.834 3.5 13.5a1306.032 1306.032 0 0 0-22 43c-5.381 6.652-10.715 6.652-16 0a1424.647 1424.647 0 0 0-23-45c-1.691-5.369-.191-9.369 4.5-12zM57.5 207.5h144c7.788 2.242 10.288 7.242 7.5 15a11.532 11.532 0 0 1-4.5 3.5c-50 .667-100 .667-150 0-6.163-3.463-7.496-8.297-4-14.5 2.025-2.064 4.358-3.398 7-4z\"/></svg>",
        name: 'ipTV'
    };

    // --- СЕКЦІЯ ЗМІННИХ ТА УТИЛІТ ---
    var isSNG = false;
    var lists = [];
    var curListId = -1;
    var defaultGroup = 'Other';
    var catalog = {};
    var listCfg = {};
    var EPG = {};
    var UID = '';
    var timeOffset = 0;
    var timeOffsetSet = false;
    var epgPath = '';

    var utils = {
        uid: function() { return UID },
        timestamp: function() { return Math.floor((new Date().getTime() + timeOffset) / 1000) },
        hash: Lampa.Utils.hash,
        hash36: function(s) { return (this.hash(s) * 1).toString(36) }
    };

    function unixtime() { return utils.timestamp(); }

    function generateSigForString(string) {
        var sigTime = unixtime();
        return sigTime.toString(36) + ':' + utils.hash36((string || '') + sigTime + utils.uid());
    }

    function favID(title) {
        return title.toLowerCase().replace(/[\s!-\/:-@\[-`{-~]+/g, '');
    }

    // --- МЕРЕЖЕВІ ФУНКЦІЇ ТА КЕШ ---
    function networkSilentSessCache(url, success, fail, param) {
        var context = this;
        var key = ['cache', url.replace(/([&?])sig=[^&]+&?/, '$1'), param ? utils.hash36(JSON.stringify(param)) : ''].join('\t');
        var data = sessionStorage.getItem(key);
        if (data) {
            data = JSON.parse(data);
            if (data[0]) success && success.call(context, data[1]);
            else fail && fail.call(context, data[1]);
        } else {
            var network = new Lampa.Reguest();
            network.silent(url, function (res) {
                sessionStorage.setItem(key, JSON.stringify([true, res]));
                success && success.call(context, res);
            }, function (err) {
                sessionStorage.setItem(key, JSON.stringify([false, err]));
                fail && fail.call(context, err);
            }, param);
        }
    }

    // --- ШАБЛОНИ ТА СТИЛІ ---
    var encoder = $('<div/>');
    Lampa.Template.add(plugin.component + '_style', '<style>#PLUGIN_epg{margin-right:1em}.PLUGIN-program__desc{font-size:0.9em;margin:0.5em;text-align:justify;max-height:15em;overflow:hidden;} ... (стилі з вашого коду) ... </style>'.replace(/PLUGIN/g, plugin.component));
    $('body').append(Lampa.Template.get(plugin.component + '_style', {}, true));

    // --- ГОЛОВНА ЛОГІКА ПЛАГІНА (pluginPage) ---
    function pluginPage(object) {
        if (object.id !== curListId) {
            catalog = {};
            listCfg = {};
            curListId = object.id;
        }
        EPG = {};
        var favorite = Lampa.Storage.get(plugin.component + '_favorite' + object.id, '[]');
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true, step: 250});
        var html = $('<div></div>');
        var body = $('<div class="' + plugin.component + ' category-full"></div>');

        this.create = function () {
            var _this = this;
            this.activity.loader(true);

            // 1. Синхронізація часу (якщо ще не зроблено)
            if (!timeOffsetSet) {
                network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/api/time', function (serverTime) {
                    var te = new Date().getTime();
                    timeOffset = (serverTime < (te - 5000) || serverTime > (te + 5000)) ? serverTime - te : 0;
                    timeOffsetSet = true;
                    _this.loadList();
                }, function () {
                    timeOffsetSet = true;
                    _this.loadList();
                });
            } else {
                this.loadList();
            }
            return this.render();
        };

        this.loadList = function() {
            var _this = this;
            var listUrl = object.url;
            
            var onData = function(data) {
                // Парсинг M3U та побудова каталогу (логіка з частини 2-3)
                // ... (тут ваш розгорнутий код parseListHeader та parseList) ...
                _this.build(catalog);
            };

            network.native(listUrl, onData, function() {
                // CORS Fallback через проксі
                var proxied = Lampa.Utils.protocol() + 'epg.rootu.top/cors.php?url=' + encodeURIComponent(listUrl)
                            + '&uid=' + UID + '&sig=' + generateSigForString(listUrl);
                network.silent(proxied, onData, function(){ _this.activity.loader(false); }, false, {dataType: 'text'});
            }, false, {dataType: 'text'});
        };

        // ... (Решта логіки: append, build, epgRender, setEpgId) ...
        // Всі ці функції вставляються сюди без змін з ваших частин 3 та 4.
    }

    // --- РЕЄСТРАЦІЯ ТА НАЛАШТУВАННЯ ---
    Lampa.Component.add(plugin.component, pluginPage);
    
    // Функція додавання налаштувань
    function addSettings(type, param) {
        Lampa.SettingsApi.addParam({
            component: plugin.component,
            param: {
                name: plugin.component + '_' + param.name,
                type: type,
                values: param.values || '',
                default: param.default || ''
            },
            field: {
                name: param.title,
                description: param.description || ''
            },
            onChange: param.onChange
        });
    }

    function initUID() {
        UID = Lampa.Storage.get(plugin.component + '_uid', '');
        if (!UID) {
            UID = Lampa.Utils.uid(10).toUpperCase().replace(/(.{4})/g, '$1-');
            Lampa.Storage.set(plugin.component + '_uid', UID);
        }
    }

    function pluginStart() {
        initUID();
        // Додавання плейлистів у меню
        for (var i = 0; i < 5; i++) { // Конфігуруємо до 5 слотів під плейлисти
            var url = Lampa.Storage.field(plugin.component + '_list_url_' + i);
            if (url) {
                // Створення пунктів меню (логіка з частини 5)
            }
        }
    }

    if (window.appready) pluginStart();
    else Lampa.Listener.follow('app', function(e){ if (e.type === 'ready') pluginStart(); });

})();
