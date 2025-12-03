(function(){
    'use strict';

    var PLUGIN_NAME = 'plugins_tab_manager';
    var STORAGE_KEY = 'plugins_tab_manager_settings';

    var defaults = {
        plugin1_enabled: true,
        plugin2_enabled: true,
        plugin1_url: 'https://crowley24.github.io/NewLogo.js',
        plugin2_url: 'https://tvigl.info/plugins/quality.js'
    };

    function readStorage(){
        try{
            var s = Lampa.Storage.get(STORAGE_KEY);
            if(!s) return Object.assign({}, defaults);
            return Object.assign({}, defaults, s);
        }catch(e){
            console.error(PLUGIN_NAME + ' readStorage error', e);
            return Object.assign({}, defaults);
        }
    }

    function saveStorage(payload){
        try{
            Lampa.Storage.set(STORAGE_KEY, payload);
        }catch(e){
            console.error(PLUGIN_NAME + ' saveStorage error', e);
        }
    }

    function loadScript(url){
        return new Promise(function(resolve, reject){
            if(!url) return reject(new Error('Empty URL'));

            var scripts = document.querySelectorAll('script[data-plugins-tab-src]');
            for(var i=0;i<scripts.length;i++){
                if(scripts[i].getAttribute('data-plugins-tab-src') === url){
                    return resolve();
                }
            }

            var s = document.createElement('script');
            s.setAttribute('data-plugins-tab-src', url);
            s.src = url;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load script: ' + url));
            document.head.appendChild(s);
        });
    }

    function unloadScript(url){
        var scripts = document.querySelectorAll('script[data-plugins-tab-src]');
        scripts.forEach(s => {
            if(!url || s.getAttribute('data-plugins-tab-src') === url){
                s.parentNode.removeChild(s);
            }
        });
    }

    function initPluginsOnStart(){
        var s = readStorage();
        if(s.plugin1_enabled) loadScript(s.plugin1_url);
        if(s.plugin2_enabled) loadScript(s.plugin2_url);
    }

    function createSettingsTab(e){
        if(e.name !== 'interface') return;

        var settings = readStorage();

        var wrap = $('<div class="settings-param" style="padding:8px 12px;">');
        wrap.append('<div class="settings-param__name" style="font-weight:700;margin-bottom:6px;">Plugins (FoxStudio)</div>');

        var p1url = $('<div class="settings-param selector"><div class="settings-param__name">Plugin 1 — URL</div></div>');
        var input1 = $('<input type="text" style="width:100%;padding:6px;margin:6px 0;">');
        input1.val(settings.plugin1_url);

        var p1toggle = $('<div class="settings-param selector" data-name="plugin1_enabled"><div class="settings-param__name">Включити Plugin 1</div><div class="settings-param__value"></div></div>');

        var p2url = $('<div class="settings-param selector"><div class="settings-param__name">Plugin 2 — URL</div></div>');
        var input2 = $('<input type="text" style="width:100%;padding:6px;margin:6px 0;">');
        input2.val(settings.plugin2_url);

        var p2toggle = $('<div class="settings-param selector" data-name="plugin2_enabled"><div class="settings-param__name">Включити Plugin 2</div><div class="settings-param__value"></div></div>');

        var buttons = $('<div style="margin-top:10px;display:flex;gap:8px;">');
        var btnSave = $('<div class="button">Зберегти URL</div>');
        var btnReload = $('<div class="button">Перезавантажити плагіни</div>');
        var btnUnload = $('<div class="button">Вимкнути всі</div>');

        buttons.append(btnSave, btnReload, btnUnload);

        wrap.append(p1url, input1, p1toggle, '<hr>', p2url, input2, p2toggle, buttons);

        e.body.append(wrap);

        function update(){
            $('[data-name="plugin1_enabled"] .settings-param__value').text(settings.plugin1_enabled ? 'Вкл' : 'Викл');
            $('[data-name="plugin2_enabled"] .settings-param__value').text(settings.plugin2_enabled ? 'Вкл' : 'Викл');
        }
        update();

        p1toggle.on('hover:enter', function(){
            settings.plugin1_enabled = !settings.plugin1_enabled;
            saveStorage(settings);
            update();

            if(settings.plugin1_enabled) loadScript(settings.plugin1_url);
            else unloadScript(settings.plugin1_url);
        });

        p2toggle.on('hover:enter', function(){
            settings.plugin2_enabled = !settings.plugin2_enabled;
            saveStorage(settings);
            update();

            if(settings.plugin2_enabled) loadScript(settings.plugin2_url);
            else unloadScript(settings.plugin2_url);
        });

        btnSave.on('hover:enter', function(){
            settings.plugin1_url = input1.val().trim();
            settings.plugin2_url = input2.val().trim();
            saveStorage(settings);
            Lampa.Noty.show('URL збережено');
        });

        btnReload.on('hover:enter', function(){
            unloadScript();
            if(settings.plugin1_enabled) loadScript(settings.plugin1_url);
            if(settings.plugin2_enabled) loadScript(settings.plugin2_url);
            Lampa.Noty.show('Перезавантажено');
        });

        btnUnload.on('hover:enter', function(){
            unloadScript();
            Lampa.Noty.show('Усі скрипти вимкнено');
        });
    }

    function init(){
        Lampa.Settings.listener.follow('open', createSettingsTab);
        initPluginsOnStart();
        console.log('Plugins Tab Manager Loaded');
    }

    if(window.Lampa) init();
    else document.addEventListener('DOMContentLoaded', init);

})();
