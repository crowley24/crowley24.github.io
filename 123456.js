// https://github.com/amikdn  
(function() {  
    'use strict';  
  
    var PLUGIN_VERSION = '1.3';  
  
    // Polyfills для совместимости со старыми устройствами  
    if (!Array.prototype.forEach) {  
        Array.prototype.forEach = function(callback, thisArg) {  
            var T, k;  
            if (this == null) throw new TypeError('this is null or not defined');  
            var O = Object(this);  
            var len = O.length >>> 0;  
            if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');  
            if (arguments.length > 1) T = thisArg;  
            k = 0;  
            while (k < len) {  
                var kValue;  
                if (k in O) {  
                    kValue = O[k];  
                    callback.call(T, kValue, k, O);  
                }  
                k++;  
            }  
        };  
    }  
  
    if (!Array.prototype.filter) {  
        Array.prototype.filter = function(callback, thisArg) {  
            if (this == null) throw new TypeError('this is null or not defined');  
            var O = Object(this);  
            var len = O.length >>> 0;  
            if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');  
            var res = [];  
            var T = thisArg;  
            var k = 0;  
            while (k < len) {  
                if (k in O) {  
                    var kValue = O[k];  
                    if (callback.call(T, kValue, k, O)) res.push(kValue);  
                }  
                k++;  
            }  
            return res;  
        };  
    }  
  
    if (!Array.prototype.find) {  
        Array.prototype.find = function(callback, thisArg) {  
            if (this == null) throw new TypeError('this is null or not defined');  
            var O = Object(this);  
            var len = O.length >>> 0;  
            if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');  
            var T = thisArg;  
            var k = 0;  
            while (k < len) {  
                var kValue = O[k];  
                if (callback.call(T, kValue, k, O)) return kValue;  
                k++;  
            }  
            return undefined;  
        };  
    }  
  
    if (!Array.prototype.some) {  
        Array.prototype.some = function(callback, thisArg) {  
            if (this == null) throw new TypeError('this is null or not defined');  
            var O = Object(this);  
            var len = O.length >>> 0;  
            if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');  
            var T = thisArg;  
            var k = 0;  
            while (k < len) {  
                if (k in O && callback.call(T, O[k], k, O)) return true;  
                k++;  
            }  
            return false;  
        };  
    }  
  
    if (!Array.prototype.indexOf) {  
        Array.prototype.indexOf = function(searchElement, fromIndex) {  
            if (this == null) throw new TypeError('this is null or not defined');  
            var O = Object(this);  
            var len = O.length >>> 0;  
            if (len === 0) return -1;  
            var n = fromIndex | 0;  
            if (n >= len) return -1;  
            var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);  
            while (k < len) {  
                if (k in O && O[k] === searchElement) return k;  
                k++;  
            }  
            return -1;  
        };  
    }  
  
    var LAMPAC_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M20.331 14.644l-13.794-13.831 17.55 10.075zM2.938 0c-0.813 0.425-1.356 1.2-1.356 2.206v27.581c0 1.006 0.544 1.781 1.356 2.206l16.038-16zM29.512 14.1l-3.681-2.131-4.106 4.031 4.106 4.031 3.756-2.131c1.125-0.893 1.125-2.906-0.075-3.8zM6.538 31.188l17.55-10.075-3.756-3.756z" fill="currentColor"></path></svg>';  
    var EXCLUDED_CLASSES = ['button--play', 'button--edit-order'];  
    var DEFAULT_GROUPS = [  
        { name: 'online', patterns: ['online', 'lampac', 'modss', 'showy'], label: 'Онлайн' },  
        { name: 'torrent', patterns: ['torrent'], label: 'Торренты' },  
        { name: 'trailer', patterns: ['trailer', 'rutube'], label: 'Трейлеры' },  
        { name: 'favorite', patterns: ['favorite'], label: 'Избранное' },  
        { name: 'subscribe', patterns: ['subscribe'], label: 'Подписка' },  
        { name: 'book', patterns: ['book'], label: 'Закладки' },  
        { name: 'reaction', patterns: ['reaction'], label: 'Реакции' }  
    ];  
    var currentButtons = [];  
    var allButtonsCache = [];  
    var allButtonsOriginal = [];  
    var currentContainer = null;  
  
    function findButton(btnId) {  
        var btn = allButtonsOriginal.find(function(b) { return getButtonId(b) === btnId; });  
        if (!btn) {  
            btn = allButtonsCache.find(function(b) { return getButtonId(b) === btnId; });  
        }  
        return btn;  
    }  
  
    function getCustomOrder() {  
        return Lampa.Storage.get('button_custom_order', []);  
    }  
  
    function setCustomOrder(order) {  
        Lampa.Storage.set('button_custom_order', order);  
    }  
  
    function getHiddenButtons() {  
        return Lampa.Storage.get('button_hidden', []);  
    }  
  
    function setHiddenButtons(hidden) {  
        Lampa.Storage.set('button_hidden', hidden);  
    }  
  
    function getCustomIcons() {  
        return Lampa.Storage.get('button_custom_icons', {});  
    }  
  
    function setCustomIcons(icons) {  
        Lampa.Storage.set('button_custom_icons', icons);  
    }  
  
    function getCustomLabels() {  
        return Lampa.Storage.get('button_custom_labels', {});  
    }  
  
    function setCustomLabels(labels) {  
        Lampa.Storage.set('button_custom_labels', labels);  
    }  
  
    function normalizeSvgString(str) {  
        if (!str || typeof str !== 'string') return '';  
        return str.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();  
    }  
  
    function svgFingerprint(html) {  
        var s = normalizeSvgString(html);  
        var useMatch = s.match(/xlink:href\s*=\s*["']?#([^"'\s>]+)/);  
        if (useMatch) return 'use:' + useMatch[1];  
        var vb = s.match(/viewBox\s*=\s*["']([^"']+)["']/);  
        var viewBox = vb ? vb[1].replace(/\s+/g, ' ').trim() : '';  
        var pathMatch = s.match(/<path[^>]*\bd\s*=\s*["']([^"']+)["']/g);  
        var pathParts = pathMatch ? pathMatch.map(function(p) {  
            var d = p.match(/\bd\s*=\s*["']([^"']+)["']/);  
            return d ? d[1].replace(/\s+/g, ' ').trim() : '';  
        }) : [];  
        pathParts.sort();  
        return 'inline:' + viewBox + '|' + pathParts.join('|');  
    }  
  
    function collectAllIcons() {  
        var seen = {};  
        var result = [];  
        function addIcon(html, id) {  
            if (!html) return;  
            var key = svgFingerprint(html);  
            if (seen[key]) return;  
            seen[key] = true;  
            result.push({ id: id || key.substring(0, 80), html: html });  
        }  
        addIcon(LAMPAC_ICON, 'lampac-online');  
        var symbols = document.querySelectorAll('symbol[id]');  
        for (var i = 0; i < symbols.length; i++) {  
            var sym = symbols[i];  
            var sid = sym.getAttribute('id') || '';  
            var viewBox = sym.getAttribute('viewBox') || '0 0 24 24';  
            var svgHtml = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '" fill="currentColor"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#' + sid + '"></use></svg>';  
            addIcon(svgHtml, 'sprite-' + sid);  
        }  
        var buttonArrays = [currentButtons, allButtonsCache, allButtonsOriginal];  
        for (var a = 0; a < buttonArrays.length; a++) {  
            var arr = buttonArrays[a];  
            if (!arr || !arr.length) continue;  
            for (var j = 0; j < arr.length; j++) {  
                var b = arr[j];  
                var $b = b && (b.jquery ? b : $(b));  
                if (!$b || !$b.length) continue;  
                var svgEl = $b.find('svg').first();  
                if (svgEl.length) {  
                    try {  
                        var raw = svgEl.get(0).outerHTML;  
                        addIcon(raw, 'list-' + a + '-' + j);  
                    } catch (err) {}  
                }  
            }  
        }  
        var allButtonEls = document.querySelectorAll('.full-start__button');  
        for (var k = 0; k < allButtonEls.length; k++) {  
            var el = allButtonEls[k];  
            if (el.classList && (el.classList.contains('button--edit-order') || el.classList.contains('button--play'))) continue;  
            var svg = el.querySelector && el.querySelector('svg');  
            if (svg) {  
                try {  
                    var raw = svg.outerHTML;  
                    addIcon(raw, 'dom-' + k);  
                } catch (err) {}  
            }  
        }  
        var buttonsContainers = document.querySelectorAll('.full-start-new__buttons');  
        for (var c = 0; c < buttonsContainers.length; c++) {  
            var container = buttonsContainers[c];  
            var children = container.children || container.childNodes;  
            for (var n = 0; n < children.length; n++) {  
                var child = children[n];  
                if (!child || child.nodeType !== 1) continue;  
                if (child.classList && (child.classList.contains('button--edit-order') || child.classList.contains('button--play'))) continue;  
                var childSvg = child.querySelector && child.querySelector('svg');  
                if (childSvg) {  
                    try {  
                        var rawChild = childSvg.outerHTML;  
                        addIcon(rawChild, 'plugin-' + c + '-' + n);  
                    } catch (err) {}  
                }  
            }  
        }  
        var menuIcos = document.querySelectorAll('.menu .menu__ico svg');  
        for (var m = 0; m < menuIcos.length; m++) {  
            try {  
                var menuSvg = menuIcos[m];  
                var menuRaw = menuSvg.outerHTML;  
                addIcon(menuRaw, 'menu-' + m);  
            } catch (err) {}  
        }  
        return result;  
    }  
  
    function getDefaultIconForButton(btnId) {  
        var orig = allButtonsOriginal.find(function(b) { return getButtonId(b) === btnId; });  
        if (!orig || !orig.length) return '';  
        var svg = orig.find('svg').first();  
        return svg.length ? svg.get(0).outerHTML : '';  
    }  
  
    function loadIconsFromUrl(url, seen, callback) {  
        if (!url || typeof url !== 'string') {  
            callback(null, 'Введите ссылку на файл');  
            return;  
        }  
        var xhr = new XMLHttpRequest();  
        xhr.onreadystatechange = function() {  
            if (xhr.readyState !== 4) return;  
            if (xhr.status !== 200) {  
                callback(null, 'Ошибка загрузки: ' + (xhr.status || 'сеть'));  
                return;  
            }  
            var text = (xhr.responseText || '').replace(/^\uFEFF/, '').trim();  
            if (!text) {  
                callback(null, 'Пустой ответ');  
                return;  
            }  
            if (text.indexOf('<!') === 0 || text.indexOf('<html') !== -1) {  
                callback(null, 'По ссылке отдаётся не JSON (проверьте файл на сайте)');  
                return;  
            }  
            text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');  
            text = text.replace(/,(\s*)\]/, '$1]').replace(/,(\s*)\}/, '$1}');  
            var arr;  
            try {  
                arr = JSON.parse(text);  
            } catch (e) {  
                try {  
                    arr = JSON.parse(text.replace(/[\u0000-\u001F]+/g, ' '));  
                } catch (e2) {  
                    try {  
                        arr = JSON.parse(text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());  
                    } catch (e3) {  
                        var svgList = text.match(/<svg[\s\S]*?<\/svg>/gi);  
                        if (svgList && svgList.length) {  
                            arr = svgList;  
                        } else {  
                            callback(null, 'Неверный формат JSON');  
                            return;  
                        }  
                    }  
                }  
            }  
            if (!Array.isArray(arr)) {  
                callback(null, 'Файл должен содержать массив');  
                return;  
            }  
            var result = [];  
            var urlsToFetch = [];  
            var i, item, html, key;  
            for (i = 0; i < arr.length; i++) {  
                item = arr[i];  
                if (typeof item === 'string') {  
                    html = item.trim();  
                    if (html.indexOf('<svg') !== -1) {  
                        key = svgFingerprint(html);  
                        if (!seen[key]) {  
                            seen[key] = true;  
                            result.push({ id: 'icon-' + i, html: html });  
                        }  
                    } else if (html.indexOf('http://') === 0 || html.indexOf('https://') === 0) {  
                        urlsToFetch.push({ url: html, index: i });  
                    }  
                } else if (item && item.html != null) {  
                    html = String(item.html).trim();  
                    if (html && html.indexOf('<svg') !== -1) {  
                        key = svgFingerprint(html);  
                        if (!seen[key]) {  
                            seen[key] = true;  
                            result.push({ id: (item.id && String(item.id)) || key.substring(0, 80), html: html });  
                        }  
                    }  
                }  
            }  
            if (urlsToFetch.length === 0) {  
                callback(result, null);  
                return;  
            }  
            var fetched = 0;  
            urlsToFetch.forEach(function(entry) {  
                var req = new XMLHttpRequest();  
                req.open('GET', entry.url, true);  
                req.onload = function() {  
                    if (req.status === 200 && req.responseText) {  
                        html = req.responseText.trim();  
                        if (html.indexOf('<svg') !== -1) {  
                            key = svgFingerprint(html);  
                            if (!seen[key]) {  
                                seen[key] = true;  
                                result.push({ id: 'icon-' + entry.index, html: html });  
                            }  
                        }  
                    }  
                    fetched++;  
                    if (fetched === urlsToFetch.length) {  
                        callback(result, null);  
                    }  
                };  
                req.onerror = function() {  
                    fetched++;  
                    if (fetched === urlsToFetch.length) {  
                        callback(result, null);  
                    }  
                };  
                req.send();  
            });  
        };  
        xhr.onerror = function() {  
            callback(null, 'Ошибка сети');  
        };  
        try {  
            xhr.open('GET', url, true);  
            xhr.responseType = 'text';  
            xhr.send();  
        } catch (e) {  
            callback(null, 'Ошибка запроса');  
        }  
    }  
  
    function openIconPicker(btn, btnId, defaultIconHtml, listItem) {  
        var icons = collectAllIcons();  
        var seen = {};  
        for (var s = 0; s < icons.length; s++) {  
            seen[svgFingerprint(icons[s].html)] = true;  
        }  
        var wrap = $('<div class="icon-picker-wrap"></div>');  
        var defaultBlock = $('<div class="selector icon-picker-default" tabindex="0">' +  
            '<div class="icon-picker-default__preview"></div>' +  
            '<span>По умолчанию</span></div>');  
        if (defaultIconHtml) {  
            defaultBlock.find('.icon-picker-default__preview').append($(defaultIconHtml).clone());  
        }  
        function applyChoice(isDefault, chosenHtml) {  
            var stored = getCustomIcons();  
            var custom = {};  
            for (var key in stored) {  
                if (stored.hasOwnProperty(key)) custom[key] = stored[key];  
            }  
            if (isDefault) {  
                delete custom[btnId];  
            } else {  
                custom[btnId] = chosenHtml;  
            }  
            setCustomIcons(custom);  
            if (typeof Lampa.Modal !== 'undefined' && Lampa.Modal.close) {  
                Lampa.Modal.close();  
            }  
            setTimeout(function() {  
                applyChanges();  
            }, 100);  
        }  
        defaultBlock.on('hover:enter', function() {  
            applyChoice(true, null);  
        });  
        wrap.append(defaultBlock);  
        var defaultIconsUrl = 'https://amikdn.github.io/lampa-button-icons.json';  
        var loadStatus = $('<div class="icon-picker-load-status">Загрузка...</div>');  
        wrap.append(loadStatus);  
        loadIconsFromUrl(defaultIconsUrl, seen, function(icons, error) {  
            loadStatus.remove();  
            if (error) {  
                wrap.append('<div style="color: #ff6b6b; padding: 0.5em;">' + error + '</div>');  
            }  
            if (icons && icons.length) {  
                icons.forEach(function(icon) {  
                    var cell = $('<div class="icon-picker-grid__cell selector" tabindex="0">' + icon.html + '</div>');  
                    cell.on('hover:enter', function() {  
                        applyChoice(false, icon.html);  
                    });  
                    wrap.append(cell);  
                });  
            }  
        });  
        Lampa.Modal.open({  
            title: 'Выбор иконки',  
            html: wrap,  
            size: 'small',  
            scroll_to_center: true,  
            onBack: function() {  
                if (typeof Lampa.Modal !== 'undefined' && Lampa.Modal.close) {  
                    Lampa.Modal.close();  
                }  
                setTimeout(function() {  
                    refreshController();  
                }, 100);  
            }  
        });  
    }  
  
    function getButtonId(btn) {  
        var $btn = $(btn);  
        var classes = $btn.attr('class') || '';  
        var viewClass = classes.split(' ').find(function(c) {  
            return c.indexOf('view--') === 0 || c.indexOf('button--') === 0;  
        });  
        if (viewClass) {  
            return viewClass.replace('view--', '').replace('button--', '');  
        }  
        var text = $btn.find('span').text().trim();  
        if (text) {  
            return text.toLowerCase().replace(/[^a-zа-яё0-9]/g, '_');  
        }  
        return 'unknown_' + Math.random().toString(36).substr(2, 9);  
    }  
  
    function isExcluded(btn) {  
        var $btn = $(btn);  
        return EXCLUDED_CLASSES.some(function(cls) {  
            return $btn.hasClass(cls);  
        });  
    }  
  
    function getButtonType(btn) {  
        var $btn = $(btn);  
        var classes = $btn.attr('class') || '';  
        for (var i = 0; i < DEFAULT_GROUPS.length; i++) {  
            var group = DEFAULT_GROUPS[i];  
            for (var j = 0; j < group.patterns.length; j++) {  
                var pattern = group.patterns[j];  
                if (classes.indexOf(pattern) !== -1) {  
                    return group.name;  
                }  
            }  
        }  
        return 'other';  
    }  
  
    function categorizeButtons(container) {  
        var categories = {  
            online: [],  
            torrent: [],  
            trailer: [],  
            favorite: [],  
            subscribe: [],  
            book: [],  
            reaction: [],  
            other: []  
        };  
        var buttons = container.find('.full-start__button').not('.button--edit-order, .button--play');  
        buttons.each(function() {  
            var $btn = $(this);  
            if (isExcluded($btn)) return;  
            var type = getButtonType($btn);  
            if (categories[type]) {  
                categories[type].push($btn);  
            } else {  
                categories.other.push($btn);  
            }  
        });  
        return categories;  
    }  
  
    function sortByCustomOrder(buttons) {  
        var order = getCustomOrder();  
        var sorted = [];  
        var remaining = buttons.slice();  
        order.forEach(function(btnId) {  
            var index = remaining.findIndex(function(btn) {  
                return getButtonId(btn) === btnId;  
            });  
            if (index !== -1) {  
                sorted.push(remaining[index]);  
                remaining.splice(index, 1);  
            }  
        });  
        return sorted.concat(remaining);  
    }  
  
    function applyHiddenButtons(buttons) {  
        var hidden = getHiddenButtons();  
        buttons.forEach(function(btn) {  
            var btnId = getButtonId(btn);  
            var isHidden = hidden.indexOf(btnId) !== -1;  
            btn.toggleClass('hidden', isHidden);  
        });  
    }  
  
    function applyCustomIcons(buttons) {  
        var customIcons = getCustomIcons();  
        buttons.forEach(function(btn) {  
            var btnId = getButtonId(btn);  
            if (customIcons[btnId]) {  
                var svg = $(customIcons[btnId]);  
                btn.find('svg').first().replaceWith(svg.clone());  
            }  
        });  
    }  
  
    function applyCustomLabels(buttons) {  
        var customLabels = getCustomLabels();  
        buttons.forEach(function(btn) {  
            var btnId = getButtonId(btn);  
            if (customLabels[btnId]) {  
                var span = btn.find('span').first();  
                if (!span.attr('data-original-text')) {  
                    span.attr('data-original-text', span.text());  
                }  
                span.text(customLabels[btnId]);  
            }  
        });  
    }  
  
    function applyButtonAnimation(buttons) {  
        buttons.forEach(function(btn, index) {  
            setTimeout(function() {  
                btn.css({  
                    'opacity': '1',  
                    'transform': 'translateY(0)',  
                    'transition': 'opacity 0.3s ease, transform 0.3s ease'  
                });  
            }, index * 50);  
        });  
    }  
  
    function createEditButton() {  
        var editBtn = $('<div class="full-start__button selector button--edit-order">' +  
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +  
            '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="currentColor" stroke-width="1.5"/>' +  
            '</svg>' +  
            '</div>');  
        editBtn.on('hover:enter', function() {  
            openEditDialog();  
        });  
        return editBtn;  
    }  
  
    function applyChanges() {  
        if (currentContainer) {  
            applyHiddenButtons(currentButtons);  
            applyCustomIcons(currentButtons);  
            applyCustomLabels(currentButtons);  
        }  
    }  
  
    function getDefaultLabelForButton(btnId) {  
        var orig = allButtonsOriginal.find(function(b) { return getButtonId(b) === btnId; });  
        if (!orig || !orig.length) return '';  
        return orig.find('span').first().text().trim();  
    }  
  
    function capitalize(str) {  
        if (!str) return str;  
        return str.charAt(0).toUpperCase() + str.slice(1);  
    }  
  
    function getButtonDisplayName(btn, allButtons) {  
        var customLabels = getCustomLabels();  
        var btnId = getButtonId(btn);  
        if (customLabels[btnId]) {  
            return customLabels[btnId];  
        }  
        var text = btn.find('span').text().trim();  
        var classes = btn.attr('class') || '';  
        var subtitle = btn.attr('data-subtitle') || '';  
        if (!text) {  
            var viewClass = classes.split(' ').find(function(c) { return c.indexOf('view--') === 0 || c.indexOf('button--') === 0; });  
            if (viewClass) {  
                text = viewClass.replace('view--', '').replace('button--', '').replace(/_/g, ' ');  
                text = capitalize(text);  
            } else {  
                text = 'Кнопка';  
            }  
            return text;  
        }  
        var sameTextCount = 0;  
        allButtons.forEach(function(otherBtn) {  
            if (otherBtn.find('span').text().trim() === text) {  
                sameTextCount++;  
            }  
        });  
        if (sameTextCount > 1) {  
            if (subtitle) {  
                return text + ' (' + (subtitle.substring(0, 30).replace(/</g, '').replace(/>/g, '')) + ')';  
            }  
            var viewClass = classes.split(' ').find(function(c) { return c.indexOf('view--') === 0; });  
            if (viewClass) {  
                var identifier = viewClass.replace('view--', '').replace(/_/g, ' ');  
                identifier = capitalize(identifier);  
                return text + ' (' + identifier + ')';  
            }  
        }  
        return text;  
    }  
  
    function syncModalFont() {  
        var el = document.querySelector('.menu-edit-list__title');  
        if (el) {  
            var s = window.getComputedStyle(el);  
            document.body.style.setProperty('--buttons-plugin-modal-font', s.fontFamily);  
            document.body.style.setProperty('--buttons-plugin-modal-font-size', s.fontSize);  
        }  
    }  
  
    // МОДИФІКОВАНА init() функція для сумісності  
    function init() {  
        var storedVersion = Lampa.Storage.get('buttons_plugin_version', '');  
        if (storedVersion !== PLUGIN_VERSION) {  
            Lampa.Storage.set('buttons_plugin_version', PLUGIN_VERSION);  
        }  
          
        // Перевірка наявності конфліктуючих плагінів  
        var template = Lampa.Template.get('full_start_new', '');  
        var hasLeftTitle = template.includes('left-title');  
        var hasApplecation = template.includes('applecation');  
          
        // Сумісні CSS стилі  
        var bodyStyle = hasLeftTitle || hasApplecation ?   
            'align-items: flex-end !important;' :   
            'align-items: stretch !important;';  
          
        var rightStyle = hasLeftTitle || hasApplecation ?   
            'display: flex !important; flex-direction: row !important; align-items: flex-end !important;' :   
            'display: flex !important; flex-direction: column !important; align-self: stretch !important; min-height: 0;';  
          
        var titleStyle = hasLeftTitle || hasApplecation ?   
            'margin-top: 0 !important; margin-bottom: 1em !important;' :   
            'margin-top: auto !important;';  
          
        var style = $('<style>' +  
            '@keyframes button-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }' +  
            '.full-start-new__body { ' + bodyStyle + ' }' +  
            '.full-start-new__right { ' + rightStyle + ' }' +  
            '.full-start-new__title { ' + titleStyle + ' }' +  
            '.full-start-new__buttons { display: flex !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 0.5em !important; }' +  
            '.full-start-new__buttons .full-start__button { opacity: 0; }' +  
            '.full-start__button.hidden { display: none !important; }' +  
            '.full-start-new__buttons.buttons-loading .full-start__button { visibility: hidden !important; }' +  
            '.menu-edit-list { max-width: 100%; overflow: hidden; box-sizing: border-box; }' +  
            '.menu-edit-list__item { display: grid; grid-template-columns: 2.5em minmax(0, 1fr) 2.4em 2.4em 2.4em 2.4em 2.4em; align-items: center; gap: 0.35em; padding: 0.2em 0; box-sizing: border-box; }' +  
            '.menu-edit-list__item .menu-edit-list__icon { width: 2.5em; min-width: 2.5em; height: 2.5em; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }' +  
            '.menu-edit-list__item .menu-edit-list__icon svg { width: 1.4em; height: 1.4em; }' +  
            '.menu-edit-list__item .menu-edit-list__title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--buttons-plugin-modal-font, inherit); font-size: var(--buttons-plugin-modal-font-size, inherit); }' +  
            '.menu-edit-list__item .menu-edit-list__move, .menu-edit-list__item .menu-edit-list__change-name, .menu-edit-list__item .menu-edit-list__change-icon, .menu-edit-list__item .menu-edit-list__toggle { width: 2.4em; min-width: 2.4em; height: 2.4em; display: flex; align-items: center; justify-content: center; box-sizing: border-box; border: 2px solid transparent; border-radius: 0.3em; }' +  
            '.menu-edit-list__item .menu-edit-list__move svg { width: 1.2em; height: 0.75em; }' +  
            '.menu-edit-list__item .menu-edit-list__toggle svg { width: 1.2em; height: 1.2em; }' +  
            '.menu-edit-list__item .menu-edit-list__change-name svg, .menu-edit-list__item .menu-edit-list__change-icon svg { width: 1.2em; height: 1.2em; }' +  
            '.viewmode-switch, .folder-reset-button { max-width: 100%; box-sizing: border-box; white-space: normal; word-break: break-word; font-family: var(--buttons-plugin-modal-font, inherit); font-size: var(--buttons-plugin-modal-font-size, inherit); }' +  
            '.folder-reset-button { background: rgba(200,100,100,0.3); margin-top: 1em; border-radius: 0.3em; border: 3px solid transparent; }' +  
            '.folder-reset-button.focus { border-color: rgba(255,255,255,0.8); }' +  
            '.menu-edit-list__move.focus, .menu-edit-list__change-name.focus, .menu-edit-list__change-icon.focus, .menu-edit-list__toggle.focus { border-color: rgba(255,255,255,0.8); }' +  
            '.full-start-new__buttons.icons-only .full-start__button span { display: none; }' +  
            '.full-start-new__buttons.always-text .full-start__button span { display: block !important; }' +  
            '.viewmode-switch { background: rgba(66, 133, 244, 0.5); color: #fff; margin: 0.5em 0 1em 0; border-radius: 0.3em; border: 3px solid transparent; }' +  
            '.viewmode-switch.focus { border-color: rgba(255,255,255,0.8); }' +  
            '.menu-edit-list__item-hidden { opacity: 0.5; }' +  
            '.icon-picker-default { display: flex; align-items: center; gap: 0.5em; padding: 0.35em 0.5em; min-height: 2.5em; margin-bottom: 0.5em; border-radius: 0.3em; background: rgba(255,255,255,0.08); border: 3px solid transparent; box-sizing: border-box; font-family: var(--buttons-plugin-modal-font, inherit); font-size: var(--buttons-plugin-modal-font-size, inherit); }' +  
            '.icon-picker-default.focus { border-color: rgba(255,255,255,0.8); }' +  
            '.icon-picker-default__preview { width: 2.5em; height: 2.5em; min-width: 2.5em; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }' +  
            '.icon-picker-default__preview svg { width: 1.5em; height: 1.5em; }' +  
            '.icon-picker-wrap { width: 100%; display: grid; grid-template-columns: repeat(auto-fill, minmax(2.5em, 1fr)); gap: 0.35em; align-content: start; }' +  
            '.icon-picker-wrap .icon-picker-default, .icon-picker-wrap .icon-picker-switch-wrap, .icon-picker-wrap .icon-picker-load-status { grid-column: 1 / -1; }' +  
            '.icon-picker-view-lampa .icon-picker-cell-alt { display: none !important; }' +  
            '.icon-picker-view-alt .icon-picker-cell-lampa { display: none !important; }' +  
            '.icon-picker-switch-wrap { display: flex; width: 100%; align-items: stretch; gap: 0.35em; margin-bottom: 0; }' +  
            '.icon-picker-tab { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0.75em; border-radius: 0.3em; background: rgba(255,255,255,0.08); text-align: center; min-width: 0; border: 3px solid transparent; box-sizing: border-box; font-family: var(--buttons-plugin-modal-font, inherit); font-size: var(--buttons-plugin-modal-font-size, inherit); }' +  
            '.icon-picker-tab--active { background: rgba(66, 133, 244, 0.6); }' +  
            '.icon-picker-tab.focus { border-color: rgba(255,255,255,0.8); }' +  
            '.icon-picker-load-status { font-size: 0.9em; color: rgba(255,255,255,0.7); margin-top: 0.25em; font-family: var(--buttons-plugin-modal-font, inherit); }' +  
            '.icon-picker-grid__cell { display: flex; align-items: center; justify-content: center; padding: 0.35em; min-height: 2.5em; border: 2px solid transparent; border-radius: 0.3em; box-sizing: border-box; }' +  
            '.icon-picker-grid__cell.focus { border-color: rgba(255,255,255,0.8); }' +  
            '.icon-picker-grid__cell svg { width: 1.5em; height: 1.5em; }' +  
            '.name-picker-ok { font-family: var(--buttons-plugin-modal-font, inherit); font-size: var(--buttons-plugin-modal-font-size, inherit); }' +  
            '</style>');  
        $('body').append(style);  
  
        Lampa.Listener.follow('full', function(e) {  
            if (e.type !== 'complite') return;  
            var container = e.object.activity.render();  
            var targetContainer = container.find('.full-start-new__buttons');  
            if (targetContainer.length) {  
                targetContainer.addClass('buttons-loading');  
            }  
            setTimeout(function() {  
                try {  
                    if (!container.data('buttons-processed')) {  
                        container.data('buttons-processed', true);  
                        if (reorderButtons(container)) {  
                            if (targetContainer.length) {  
                                targetContainer.removeClass('buttons-loading');  
                            }  
                            refreshController();  
                        }  
                    } else {  
                        setTimeout(function() {  
                            if (container.data('buttons-processed')) {  
                                var newButtons = targetContainer.find('.full-start__button').not('.button--edit-order, .button--play');  
                                var hasNewButtons = false;  
                                newButtons.each(function() {  
                                    var $btn = $(this);  
                                    if (isExcluded($btn)) return;  
                                    var found = false;  
                                    for (var i = 0; i < currentButtons.length; i++) {  
                                        if (getButtonId(currentButtons[i]) === getButtonId($btn)) {  
                                            found = true;  
                                            break;  
                                        }  
                                    }  
                                    if (!found) {  
                                        hasNewButtons = true;  
                                    }  
                                });  
                                if (hasNewButtons) {  
                                    reorderButtons(container);  
                                }  
                            }  
                        }, 600);  
                    }  
                } catch(err) {  
                    if (targetContainer.length) {  
                        targetContainer.removeClass('buttons-loading');  
                    }  
                }  
            }, 400);  
        });  
    }  
  
    if (Lampa.SettingsApi) {  
        Lampa.SettingsApi.addParam({  
            component: 'interface',  
            param: { name: 'buttons_editor_enabled', type: 'trigger', default: true },  
            field: { name: 'Редактор кнопок' },  
            onChange: function(value) {  
                setTimeout(function() {  
                    var currentValue = Lampa.Storage.get('buttons_editor_enabled', true);  
                    if (currentValue) {  
                        $('.button--edit-order').show();  
                    } else {  
                        $('.button--edit-order').hide();  
                    }  
                }, 100);  
            },  
            onRender: function(element) {  
                setTimeout(function() {  
                    $('div[data-name="interface_size"]').after(element);  
                }, 0);  
            }  
        });  
    }  
  
    init();  
  
    if (typeof module !== 'undefined' && module.exports) {  
        module.exports = {};  
    }  
})(); 
    
  
