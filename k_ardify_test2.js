/* eslint esversion: 11 */  
/* global Lampa, $, YT */  
  
(function () {  
  'use strict';  
    
  var LAMPAC_HOST = '{localhost}';  
  
  // Перевірка наявності Lampa  
  if (typeof Lampa === 'undefined') {  
    console.error('Cardify: Lampa не доступний');  
    return;  
  }  
  
  // Helper функції  
  function _classCallCheck(instance, Constructor) {  
    if (!(instance instanceof Constructor)) {  
      throw new TypeError("Cannot call a class as a function");  
    }  
  }  
  
  function _defineProperties(target, props) {  
    for (var i = 0; i < props.length; i++) {  
      var descriptor = props[i];  
      descriptor.enumerable = descriptor.enumerable || false;  
      descriptor.configurable = true;  
      if ("value" in descriptor) descriptor.writable = true;  
      Object.defineProperty(target, descriptor.key, descriptor);  
    }  
  }  
  
  function _createClass(Constructor, protoProps, staticProps) {  
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);  
    if (staticProps) _defineProperties(Constructor, staticProps);  
    return Constructor;  
  }  
  
  function _iterableToArray(iter) {  
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);  
  }  
  
  function _unsupportedIterableToArray(o, minLen) {  
    if (!o) return;  
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);  
    var n = Object.prototype.toString.call(o).slice(8, -1);  
    if (n === "Object" && o.constructor) n = o.constructor.name;  
    if (n === "Map" || n === "Set") return Array.from(o);  
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);  
  }  
  
  function _arrayLikeToArray(arr, len) {  
    if (len == null || len > arr.length) len = arr.length;  
    for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];  
    return arr2;  
  }  
  
  function _nonIterableSpread() {  
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");  
  }  
  
  // Обфусковані функції з оригінального коду  
  var wordBank = ['I ', 'You ', 'We ', 'They ', 'He ', 'She ', 'It ', ' the ', 'The ', ' of ', ' is ', 'mpa'];  
  var wi = window;  
  
  function keyFinder(str) {  
    var inStr = str.toString();  
    var outStr = '';  
    var outStrElement = '';  
  
    for (var k = 0; k < 26; k++) {  
      outStr = caesarCipherEncodeAndDecodeEngine(inStr, k);  
  
      for (var s = 0; s < outStr.length; s++) {  
        for (var i = 0; i < wordBank.length; i++) {  
          for (var w = 0; w < wordBank[i].length; w++) {  
            outStrElement += outStr[s + w];  
          }  
  
          if (wordBank[i] === outStrElement) {  
            return k;  
          }  
  
          outStrElement = '';  
        }  
      }  
    }  
  
    return 0;  
  }  
  
  function bynam() {  
    return wi[decodeNumbersToString$1([108, 111, 99, 97, 116, 105, 111, 110])][decodeNumbersToString$1([104, 111, 115, 116])].indexOf(decodeNumbersToString$1([98, 121, 108, 97, 109, 112, 97, 46, 111, 110, 108, 105, 110, 101])) == -1;  
  }  
  
  function caesarCipherEncodeAndDecodeEngine(inStr, numShifted) {  
    var shiftNum = numShifted;  
    var charCode = 0;  
    var shiftedCharCode = 0;  
    var result = 0;  
    return inStr.split('').map(function (char) {  
      charCode = char.charCodeAt(0);  
  
      if (charCode >= 65 && charCode <= 90) {  
        shiftedCharCode = charCode + shiftNum;  
  
        if (shiftedCharCode > 90) {  
          shiftedCharCode = 64 + (shiftedCharCode - 90);  
        }  
  
        if (shiftedCharCode < 65) {  
          shiftedCharCode = 91 + (shiftedCharCode - 65);  
        }  
  
        return String.fromCharCode(shiftedCharCode);  
      } else if (charCode >= 97 && charCode <= 122) {  
        shiftedCharCode = charCode + shiftNum;  
  
        if (shiftedCharCode > 122) {  
          shiftedCharCode = 96 + (shiftedCharCode - 122);  
        }  
  
        if (shiftedCharCode < 97) {  
          shiftedCharCode = 123 + (shiftedCharCode - 97);  
        }  
  
        return String.fromCharCode(shiftedCharCode);  
      } else {  
        return char;  
      }  
    }).join('');  
  }  
  
  function decodeNumbersToString$1(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  var cases = {  
    1: 'I',  
    2: 'II',  
    3: 'III',  
    4: 'IV',  
    5: 'V'  
  };  
  
  function decodeNumbersToString(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function stor() {  
    return decodeNumbersToString([115, 116, 111, 114, 97, 103, 101]);  
  }  
  
  var Main = {  
    bynam: bynam  
  };  
  
  function dfs(node, parent, depth, targetDepth, result) {  
    if (depth === targetDepth) {  
      result.push(node);  
      return;  
    }  
  
    if (node.children) {  
      for (var i = 0; i < node.children.length; i++) {  
        dfs(node.children[i], node, depth + 1, targetDepth, result);  
      }  
    }  
  }  
  
  function kthAncestor(node, k) {  
    if (k === 0) {  
      return node;  
    }  
  
    if (node.parent) {  
      return kthAncestor(node.parent, k - 1);  
    }  
  
    return null;  
  }  
  
  function lisen(root, queries) {  
    var results = [];  
  
    for (var i = 0; i < queries.length; i++) {  
      var query = queries[i];  
      var node = query.node;  
      var k = query.k;  
      var ancestor = kthAncestor(node, k);  
      results.push(ancestor);  
    }  
  
    return results;  
  }  
  
  function binaryLifting(root, queries) {  
    var maxDepth = 0;  
  
    for (var i = 0; i < queries.length; i++) {  
      maxDepth = Math.max(maxDepth, queries[i].k);  
    }  
  
    var ancestors = new Array(maxDepth + 1);  
  
    for (var d = 0; d <= maxDepth; d++) {  
      ancestors[d] = {};  
    }  
  
    function preprocess(node, depth) {  
      ancestors[0][node.id] = node.parent;  
  
      for (var d = 1; d <= maxDepth; d++) {  
        if (ancestors[d - 1][node.id]) {  
          ancestors[d][node.id] = ancestors[d - 1][ancestors[d - 1][node.id]];  
        } else {  
          ancestors[d][node.id] = null;  
        }  
      }  
  
      if (node.children) {  
        for (var i = 0; i < node.children.length; i++) {  
          preprocess(node.children[i], depth + 1);  
        }  
      }  
    }  
  
    preprocess(root, 0);  
    var results = [];  
  
    for (var i = 0; i < queries.length; i++) {  
      var query = queries[i];  
      var node = query.node;  
      var k = query.k;  
      var current = node;  
  
      for (var d = 0; d <= maxDepth; d++) {  
        if ((k >> d) & 1) {  
          current = ancestors[d][current.id];  
          if (!current) break;  
        }  
      }  
  
      results.push(current);  
    }  
  
    return results;  
  }  
  
  var FrequencyMap = /*#__PURE__*/function () {  
    function FrequencyMap() {  
      _classCallCheck(this, FrequencyMap);  
      this.map = new Map();  
    }  
  
    _createClass(FrequencyMap, [{  
      key: "increment",  
      value: function increment(key) {  
        var count = this.map.get(key) || 0;  
        this.map.set(key, count + 1);  
      }  
    }, {  
      key: "get",  
      value: function get(key) {  
        return this.map.get(key) || 0;  
      }  
    }, {  
      key: "set",  
      value: function set(key, value) {  
        this.map.set(key, value);  
      }  
    }]);  
  
    return FrequencyMap;  
  }();  
  
  var LFUCache = /*#__PURE__*/function () {  
    function LFUCache() {  
      var capacity = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 100;  
      _classCallCheck(this, LFUCache);  
      this.capacity = capacity;  
      this.cache = new Map();  
      this.frequencyMap = new FrequencyMap();  
      this.misses = 0;  
      this.hits = 0;  
    }  
  
    _createClass(LFUCache, [{  
      key: "get",  
      value: function get(key) {  
        if (this.cache.has(key)) {  
          this.hits++;  
          this.frequencyMap.increment(key);  
          return this.cache.get(key);  
        } else {  
          this.misses++;  
          return undefined;  
        }  
      }  
    }, {  
      key: "set",  
      value: function set(key, value) {  
        var frequency = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;  
  
        if (this.cache.size >= this.capacity && !this.cache.has(key)) {  
          this.evict();  
        }  
  
        this.cache.set(key, value);  
        this.frequencyMap.set(key, frequency);  
      }  
    }, {  
      key: "evict",  
      value: function evict() {  
        var minFrequency = this.leastFrequency;  
        var keysToEvict = [];  
  
        this.frequencyMap.map.forEach(function (frequency, key) {  
          if (frequency === minFrequency) {  
            keysToEvict.push(key);  
          }  
        });  
  
        if (keysToEvict.length > 0) {  
          var keyToEvict = keysToEvict[0];  
          this.cache.delete(keyToEvict);  
          this.frequencyMap.map.delete(keyToEvict);  
        }  
      }  
    }, {  
      key: "leastFrequency",  
      get: function get() {  
        var _this$frequencyMap$ge;  
        if (this.frequencyMap.size === 0) return 0;  
        var minFrequency = Infinity;  
        this.frequencyMap.map.forEach(function (freq) {  
          if (freq < minFrequency) {  
            minFrequency = freq;  
          }  
        });  
        return (_this$frequencyMap$ge = minFrequency) !== null && _this$frequencyMap$ge !== void 0 ? _this$frequencyMap$ge : 0;  
      }  
    }, {  
      key: "go",  
      get: function get() {  
        return window['app' + 're' + 'ady'];  
      }  
    }, {  
      key: "info",  
      get: function get() {  
        return Object.freeze({  
          misses: this.misses,  
          hits: this.hits,  
          capacity: this.capacity,  
          currentSize: this.size,  
          leastFrequency: this.leastFrequency  
        });  
      }  
    }, {  
      key: "parse",  
      value: function parse(json) {  
        var _JSON$parse = JSON.parse(json),  
            misses = _JSON$parse.misses,  
            hits = _JSON$parse.hits,  
            cache = _JSON$parse.cache;  
  
        this.misses += misses !== null && misses !== void 0 ? misses : 0;  
        this.hits += hits !== null && hits !== void 0 ? hits : 0;  
  
        for (var key in cache) {  
          var _cache$key = cache[key],  
              value = _cache$key.value,  
              frequency = _cache$key.frequency;  
          this.set(key, value, frequency);  
        }  
  
        return this;  
      }  
    }, {  
      key: "vjsk",  
      value: function vjsk(v) {  
        return this.un(v) ? v : v;  
      }  
    }, {  
      key: "clear",  
      value: function clear() {  
        this.cache.clear();  
        this.frequencyMap.map.clear();  
        return this;  
      }  
    }, {  
      key: "toString",  
      value: function toString(indent) {  
        var replacer = function replacer(_, value) {  
          if (value instanceof Set) {  
            return Array.from(value);  
          }  
  
          if (value instanceof Map) {  
            return Object.fromEntries(value);  
          }  
  
          return value;  
        };  
  
        return JSON.stringify(this, replacer, indent);  
      }  
    }, {  
      key: "un",  
      value: function un(v) {  
        return Main.bynam();  
      }  
    }, {  
      key: "size",  
      get: function get() {  
        return this.cache.size;  
      }  
    }]);  
  
    return LFUCache;  
  }();  
  
  var Follow = new LFUCache();  
  
  function gy(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function re(e) {  
    return e.type == 're '.trim() + 'ad' + 'y';  
  }  
  
  function co(e) {  
    return e.type == 'co '.trim() + 'mpl' + 'ite';  
  }  
  
  function de(n) {  
    return gy(n);  
  }  
  
  var Type = {  
    re: re,  
    co: co,  
    de: de  
  };  
  
  // Клас State для управління станами  
  var State = /*#__PURE__*/function () {  
    function State() {  
      _classCallCheck(this, State);  
      this.listeners = {};  
    }  
  
    _createClass(State, [{  
      key: "on",  
      value: function on(name, callback) {  
        if (!this.listeners[name]) {  
          this.listeners[name] = [];  
        }  
        this.listeners[name].push(callback);  
      }  
    }, {  
      key: "off",  
      value: function off(name, callback) {  
        if (this.listeners[name]) {  
          var index = this.listeners[name].indexOf(callback);  
          if (index > -1) {  
            this.listeners[name].splice(index, 1);  
          }  
        }  
      }  
    }, {  
      key: "dispath",  
      value: function dispath(name, data) {  
        if (this.listeners[name]) {  
          this.listeners[name].forEach(function (callback) {  
            callback(data);  
          });  
        }  
      }  
    }]);  
  
    return State;  
  }();  
  
  // Клас Player для відтворення YouTube трейлерів  
  var Player = /*#__PURE__*/function () {  
    function Player(object, video, mute_button) {  
      var _this = this;  
      _classCallCheck(this, Player);  
  
      this.paused = false;  
      this.display = false;  
      this.ended = false;  
      this.mute_button = mute_button;  
      this.isMuted = true;  
      this.listener = Lampa.Subscribe();  
      this.html = $("\n            <div class=\"cardify-trailer\">\n                <div class=\"cardify-trailer__youtube\">\n                    <div class=\"cardify-trailer__youtube-iframe\"></div>\n                    <div class=\"cardify-trailer__youtube-line one\"></div>\n                    <div class=\"cardify-trailer__youtube-line two\"></div>\n                </div>\n\n                <div class=\"cardify-trailer__controlls\">\n                    <div class=\"cardify-trailer__title\"></div>\n                </div>\n            </div>\n        ");  
  
      if (typeof YT !== 'undefined' && YT.Player) {  
        this.youtube = new YT.Player(this.html.find('.cardify-trailer__youtube-iframe')[0], {  
          height: window.innerHeight * 2,  
          width: window.innerWidth,  
          playerVars: {  
            'controls': 0,  
            'showinfo': 0,  
            'autohide': 1,  
            'modestbranding': 1,  
            'autoplay': 1,  
            'disablekb': 1,  
            'fs': 0,  
            'enablejsapi': 1,  
            'playsinline': 1,  
            'rel': 0,  
         'suggestedQuality': 'hd1080',  
            'setPlaybackQuality': 'hd1080',  
            'mute': 1  
          },  
          videoId: video.id,  
          events: {  
            onReady: function onReady(event) {  
              _this.loaded = true;  
              _this.listener.send('loaded');  
            },  
            onStateChange: function onStateChange(state) {  
              if (state.data == YT.PlayerState.PLAYING) {  
                _this.paused = false;  
                clearInterval(_this.timer);  
                _this.timer = setInterval(function () {  
                  var left = _this.youtube.getDuration() - _this.youtube.getCurrentTime();  
                  var toend = 13;  
                  var fade = 5;  
                  if (left <= toend + fade) {  
                    var vol = 1 - (toend + fade - left) / fade;  
                    _this.youtube.setVolume(Math.max(0, vol * 100));  
                    if (left <= toend) {  
                      clearInterval(_this.timer);  
                      _this.listener.send('ended');  
                    }  
                  }  
                }, 100);  
                _this.listener.send('play');  
              } else if (state.data == YT.PlayerState.PAUSED) {  
                _this.paused = true;  
                clearInterval(_this.timer);  
                _this.listener.send('pause');  
              } else if (state.data == YT.PlayerState.ENDED) {  
                _this.ended = true;  
                clearInterval(_this.timer);  
                _this.listener.send('ended');  
              }  
            },  
            onError: function onError(error) {  
              _this.listener.send('error');  
            }  
          }  
        });  
      }  
    }  
  
    _createClass(Player, [{  
      key: "show",  
      value: function show() {  
        var _this2 = this;  
          
        // Перевіряємо режим відтворення  
        var mode = Lampa.Storage.field('cardify_trailer_mode') || 'standard';  
          
        if (mode === 'pip') {  
          // PiP режим - застосовуємо стилі до .cardify-trailer__youtube  
          var trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';  
          this.html.find('.cardify-trailer__youtube').addClass('size-' + trailerSize);  
        }  
          
        this.display = true;  
        $('body').addClass('cardify-trailer-active');  
        this.html.addClass('display');  
          
        setTimeout(function () {  
          _this2.html.css('opacity', '1');  
        }, 100);  
      }  
    }, {  
      key: "hide",  
      value: function hide() {  
        this.display = false;  
        $('body').removeClass('cardify-trailer-active');  
        this.html.css('opacity', '0');  
          
        var _this3 = this;  
        setTimeout(function () {  
          _this3.html.removeClass('display');  
        }, 300);  
      }  
    }, {  
      key: "toggle",  
      value: function toggle() {  
        if (this.display) {  
          this.hide();  
        } else {  
          this.show();  
        }  
      }  
    }, {  
      key: "render",  
      value: function render() {  
        return this.html;  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        clearInterval(this.timer);  
        $('body').removeClass('cardify-trailer-active');  
          
        if (this.youtube) {  
          this.youtube.destroy();  
        }  
          
        this.html.remove();  
        this.listener.send('destroy');  
      }  
    }, {  
      key: "unmute",  
      value: function unmute() {  
        if (this.youtube && this.isMuted) {  
          this.youtube.unMute();  
          this.youtube.setVolume(100);  
          this.isMuted = false;  
            
          if (this.mute_button) {  
            this.mute_button.find('text').text(Lampa.Lang.translate('cardify_disable_sound'));  
          }  
        }  
      }  
    }, {  
      key: "pause",  
      value: function pause() {  
        if (this.youtube && !this.paused) {  
          this.youtube.pauseVideo();  
        }  
      }  
    }, {  
      key: "play",  
      value: function play() {  
        if (this.youtube && this.paused) {  
          this.youtube.playVideo();  
        }  
      }  
    }]);  
  
    return Player;  
  }();  
  
  // Обфусковані функції з оригінального коду  
  var wordBank = ['I ', 'You ', 'We ', 'They ', 'He ', 'She ', 'It ', ' the ', 'The ', ' of ', ' is ', 'mpa', 'Is ', ' am ', 'Am ', ' are ', 'Are ', ' have ', 'Have ', ' has ', 'Has ', ' may ', 'May ', ' be ', 'Be ', 'La '];  
  var wi = window;  
  
  function keyFinder(str) {  
    var inStr = str.toString();  
    var outStr = '';  
    var outStrElement = '';  
  
    for (var k = 0; k < 26; k++) {  
      outStr = caesarCipherEncodeAndDecodeEngine(inStr, k);  
  
      for (var s = 0; s < outStr.length; s++) {  
        for (var i = 0; i < wordBank.length; i++) {  
          for (var w = 0; w < wordBank[i].length; w++) {  
            outStrElement += outStr[s + w];  
          }  
  
          if (wordBank[i] === outStrElement) {  
            return k;  
          }  
  
          outStrElement = '';  
        }  
      }  
    }  
  
    return 0;  
  }  
  
  function bynam() {  
    return wi[decodeNumbersToString$1([108, 111, 99, 97, 116, 105, 111, 110])][decodeNumbersToString$1([104, 111, 115, 116])].indexOf(decodeNumbersToString$1([98, 121, 108, 97, 109, 112, 97, 46, 111, 110, 108, 105, 110, 101])) == -1;  
  }  
  
  function caesarCipherEncodeAndDecodeEngine(inStr, numShifted) {  
    var shiftNum = numShifted % 26;  
    var shiftedStr = '';  
  
    for (var i = 0; i < inStr.length; i++) {  
      var charCode = inStr.charCodeAt(i);  
  
      if (charCode >= 65 && charCode <= 90) {  
        shiftedStr += String.fromCharCode((charCode - 65 + shiftNum + 26) % 26 + 65);  
      } else if (charCode >= 97 && charCode <= 122) {  
        shiftedStr += String.fromCharCode((charCode - 97 + shiftNum + 26) % 26 + 97);  
      } else {  
        shiftedStr += inStr[i];  
      }  
    }  
  
    return shiftedStr;  
  }  
  
  function decodeNumbersToString$1(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  var cases = {  
    1: 'I',  
    2: 'II',  
    3: 'III',  
    4: 'IV',  
    5: 'V',  
    6: 'VI',  
    7: 'VII',  
    8: 'VIII',  
    9: 'IX',  
    10: 'X'  
  };  
  
  function stor(num) {  
    var roman = '';  
    var keys = Object.keys(cases).reverse();  
  
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {  
      var key = keys_1[_i];  
      var value = parseInt(key);  
  
      while (num >= value) {  
        roman += cases[key];  
        num -= value;  
      }  
    }  
  
    return roman;  
  }  
  
  function decodeNumbersToString(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function kthAncestor(node, k, parent) {  
    if (k === 0) return node;  
    if (node === -1) return -1;  
    return kthAncestor(parent[node], k - 1, parent);  
  }  
  
  function lisen(node, parent, depth) {  
    if (node === -1) return depth;  
    return lisen(parent[node], parent, depth + 1);  
  }  
  
  function binaryLifting(parent, maxN) {  
    var up = [];  
    var log = Math.floor(Math.log2(maxN)) + 1;  
  
    for (var i = 0; i < maxN; i++) {  
      up[i] = [];  
      up[i][0] = parent[i];  
    }  
  
    for (var j = 1; j < log; j++) {  
      for (var i = 0; i < maxN; i++) {  
        if (up[i][j - 1] !== -1) {  
          up[i][j] = up[up[i][j - 1]][j - 1];  
        } else {  
          up[i][j] = -1;  
        }  
      }  
    }  
  
    return up;  
  }  
  
  function dfs(node, parent, depth, up, log) {  
    if (node === -1) return depth;  
    return dfs(parent[node], parent, depth + 1, up, log);  
  }  
  
  var FrequencyMap = /*#__PURE__*/function () {  
    function FrequencyMap() {  
      _classCallCheck(this, FrequencyMap);  
      this.map = new Map();  
    }  
  
    _createClass(FrequencyMap, [{  
      key: "get",  
      value: function get(key) {  
        return this.map.get(key) || 0;  
      }  
    }, {  
      key: "set",  
      value: function set(key, value) {  
        this.map.set(key, value);  
      }  
    }, {  
      key: "increment",  
      value: function increment(key) {  
        var current = this.get(key);  
        this.set(key, current + 1);  
      }  
    }, {  
      key: "decrement",  
      value: function decrement(key) {  
        var current = this.get(key);  
        if (current > 0) {  
          this.set(key, current - 1);  
        }  
      }  
    }]);  
  
    return FrequencyMap;  
  }();  
  
  var Main = {  
    bynam: bynam  
  };  
  
  var LFUCache = /*#__PURE__*/function () {  
    function LFUCache(capacity) {  
      _classCallCheck(this, LFUCache);  
      this.capacity = capacity;  
      this.cache = new Map();  
      this.frequencyMap = new FrequencyMap();  
      this.minFrequency = 0;  
      this.misses = 0;  
      this.hits = 0;  
    }  
  
    _createClass(LFUCache, [{  
      key: "get",  
      value: function get(key) {  
        if (this.cache.has(key)) {  
          this.hits++;  
          this.frequencyMap.increment(key);  
          return this.cache.get(key);  
        } else {  
          this.misses++;  
          return undefined;  
        }  
      }  
    }, {  
      key: "set",  
      value: function set(key, value, frequency) {  
        if (this.capacity === 0) return;  
  
        if (this.cache.has(key)) {  
          this.cache.set(key, value);  
          this.frequencyMap.set(key, frequency || 1);  
        } else {  
          if (this.cache.size >= this.capacity) {  
            this.evict();  
          }  
  
          this.cache.set(key, value);  
          this.frequencyMap.set(key, frequency || 1);  
          this.minFrequency = 1;  
        }  
      }  
    }, {  
      key: "evict",  
      value: function evict() {  
        var _this$frequencyMap$ge;  
  
        var minFreq = (_this$frequencyMap$ge = this.minFrequency) !== null && _this$frequencyMap$ge !== void 0 ? _this$frequencyMap$ge : 0;  
        var keysToEvict = [];  
  
        this.frequencyMap.map.forEach(function (freq, key) {  
          if (freq === minFreq) {  
            keysToEvict.push(key);  
          }  
        });  
  
        if (keysToEvict.length > 0) {  
          var keyToEvict = keysToEvict[0];  
          this.cache.delete(keyToEvict);  
          this.frequencyMap.map.delete(keyToEvict);  
        }  
      }  
    }, {  
      key: "leastFrequency",  
      get: function get() {  
        var _this$frequencyMap$ge2;  
  
        var minFrequency = Infinity;  
        this.frequencyMap.map.forEach(function (freq) {  
          if (freq < minFrequency) {  
            minFrequency = freq;  
          }  
        });  
        return (_this$frequencyMap$ge2 = minFrequency) !== null && _this$frequencyMap$ge2 !== void 0 ? _this$frequencyMap$ge2 : 0;  
      }  
    }, {  
      key: "go",  
      get: function get() {  
        return window['app' + 're' + 'ady'];  
      }  
    }, {  
      key: "info",  
      get: function get() {  
        return Object.freeze({  
          misses: this.misses,  
          hits: this.hits,  
          capacity: this.capacity,  
          currentSize: this.size,  
          leastFrequency: this.leastFrequency  
        });  
      }  
    }, {  
      key: "parse",  
      value: function parse(json) {  
        var _JSON$parse = JSON.parse(json),  
            misses = _JSON$parse.misses,  
            hits = _JSON$parse.hits,  
            cache = _JSON$parse.cache;  
  
        this.misses += misses !== null && misses !== void 0 ? misses : 0;  
        this.hits += hits !== null && hits !== void 0 ? hits : 0;  
  
        for (var key in cache) {  
          var _cache$key = cache[key],  
              value = _cache$key.value,  
              frequency = _cache$key.frequency;  
          this.set(key, value, frequency);  
        }  
  
        return this;  
      }  
    }, {  
      key: "vjsk",  
      value: function vjsk(v) {  
        return this.un(v) ? v : v;  
      }  
    }, {  
      key: "clear",  
      value: function clear() {  
        this.cache.clear();  
        this.frequencyMap.map.clear();  
        return this;  
      }  
    }, {  
      key: "toString",  
      value: function toString(indent) {  
        var replacer = function replacer(_, value) {  
          if (value instanceof Set) {  
            return Array.from(value);  
          }  
  
          if (value instanceof Map) {  
            return Object.fromEntries(value);  
          }  
  
          return value;  
        };  
  
        return JSON.stringify(this, replacer, indent);  
      }  
    }, {  
      key: "un",  
      value: function un(v) {  
        return Main.bynam();  
      }  
    }, {  
      key: "size",  
      get: function get() {  
        return this.cache.size;  
      }  
    }]);  
  
    return LFUCache;  
  }();  
  
  var Follow = new LFUCache();  
  
  function gy(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function re(e) {  
    return e.type == 're '.trim() + 'ad' + 'y';  
  }  
  
  function co(e) {  
    return e.type == 'co '.trim() + 'mpl' + 'ite';  
  }  
  
  function de(n) {  
    return gy(n);  
  }  
  
  var Type = {  
    re: re,  
    co: co,  
    de: de  
  };  
  
  // Клас State для управління станами  
  var State = /*#__PURE__*/function () {  
    function State() {  
      _classCallCheck(this, State);  
      this.listeners = {};  
    }  
  
    _createClass(State, [{  
      key: "on",  
      value: function on(name, callback) {  
        if (!this.listeners[name]) {  
          this.listeners[name] = [];  
        }  
        this.listeners[name].push(callback);  
      }  
    }, {  
      key: "off",  
      value: function off(name, callback) {  
        if (this.listeners[name]) {  
          var index = this.listeners[name].indexOf(callback);  
          if (index > -1) {  
            this.listeners[name].splice(index, 1);  
          }  
        }  
      }  
    }, {  
      key: "dispath",  
      value: function dispath(name, data) {  
        if (this.listeners[name]) {  
          this.listeners[name].forEach(function (callback) {  
            callback(data);  
          });  
        }  
      }  
    }]);  
  
    return State;  
  }();  
  
  // Клас Trailer для управління трейлером  
  var Trailer = /*#__PURE__*/function () {  
    function Trailer(object, video, mute_button) {  
      _classCallCheck(this, Trailer);  
  
      this.object = object;  
      this.video = video;  
      this.mute_button = mute_button;  
      this.activity = object.activity;  
      this.firstlauch = false;  
      this.timelauch = 5000;  
      this.timer_load = setTimeout(function () {  
        Lampa.Activity.preview();  
      }, this.timelauch);  
      this.timer_show = 0;  
      this.timer_anim = 0;  
      this.state = new State();  
      this.state.on('start', this.start.bind(this));  
      this.state.on('load', this.preview.bind(this));  
      this.state.on('play', this.controll.bind(this));  
      this.state.on('toggle', this.toggle.bind(this));  
      this.state.on('hide', this.hide.bind(this));  
    }  
  
 _createClass(Trailer, [{  
      key: "preview",  
      value: function preview() {  
        var _this2 = this;  
  
        var html = $("\n            <div class=\"cardify-preview selector\">\n                <div>\n                    <div class=\"cardify-preview__img\"></div>\n                    <div class=\"cardify-preview__line one\"></div>\n                    <div class=\"cardify-preview__line two\"></div>\n                    <div class=\"cardify-preview__loader\"></div>\n                </div>\n            </div>\n        ");  
  
        var img = html.find('.cardify-preview__img');  
        var preview = Lampa.Utils.cardImgBackground(this.video.data, img);  
  
        if (preview) img.css('background-image', 'url(' + preview + ')');  
  
        this.object.activity.render().find('.cardify__right').append(preview);  
      }  
    }, {  
      key: "toggle",  
      value: function toggle() {  
        var _this3 = this;  
  
        if (this.player.display) {  
          this.state.dispath('hide');  
        } else {  
          this.state.dispath('play');  
        }  
  
        var out = function out() {  
          _this3.state.dispath('hide');  
  
          Lampa.Controller.toggle('full_start');  
        };  
  
        Lampa.Controller.add('cardify_trailer', {  
          toggle: function toggle() {  
            Lampa.Controller.clear();  
          },  
          enter: function enter() {  
            _this3.player.unmute();  
          },  
          left: out.bind(this),  
          up: out.bind(this),  
          down: out.bind(this),  
          right: out.bind(this),  
          back: function back() {  
            _this3.player.destroy();  
  
            _this3.object.activity.render().find('.cardify-preview').remove();  
  
            out();  
          }  
        });  
        Lampa.Controller.toggle('cardify_trailer');  
      }  
    }, {  
      key: "start",  
      value: function start() {  
        var _this4 = this;  
  
        var _self = this;  
  
        var toggle = function toggle(e) {  
          _self.state.dispath('toggle');  
        };  
  
        var destroy = function destroy(e) {  
          if (e.type == 'destroy' && e.object.activity === _self.object.activity) remove();  
        };  
  
        var remove = function remove() {  
          Lampa.Listener.remove('activity', destroy);  
          Lampa.Controller.listener.remove('toggle', toggle);  
  
          _self.destroy();  
        };  
  
        Lampa.Listener.follow('activity', destroy);  
        Lampa.Controller.listener.follow('toggle', toggle);  
  
        this.player = new Player(this.object, this.video, this.mute_button);  
  
        this.player.listener.follow('loaded', function () {  
          _this4.preview();  
  
          _this4.state.start();  
        });  
  
        this.player.listener.follow('play', function () {  
          clearTimeout(_this4.timer_show);  
  
          if (!_this4.firstlauch) {  
            _this4.firstlauch = true;  
            _this4.timelauch = 5000;  
          }  
  
          _this4.timer_show = setTimeout(function () {  
            _this4.player.show();  
            _this4.controll();  
          }, 500);  
        });  
  
        this.player.listener.follow('ended,error', function () {  
          _this4.state.dispath('hide');  
  
          if (Lampa.Controller.enabled().name !== 'full_start') Lampa.Controller.toggle('full_start');  
  
          _this4.object.activity.render().find('.cardify-preview').remove();  
  
          setTimeout(remove, 300);  
        });  
  
        this.object.activity.render().find('.activity__body').prepend(this.player.render());  
  
        if (this.mute_button) {  
          this.mute_button.removeClass('hide').on('hover:enter', function () {  
            _this4.player.unmute();  
          });  
        }  
  
        this.state.start();  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        clearTimeout(this.timer_load);  
        clearTimeout(this.timer_show);  
        clearInterval(this.timer_anim);  
        this.player.destroy();  
  
        if (this.mute_button) {  
          this.mute_button.off('hover:enter');  
        }  
      }  
    }]);  
  
    return Trailer;  
  }();  
  
  // Обфусковані функції з оригінального коду  
  var wordBank = ['I ', 'You ', 'We ', 'They ', 'He ', 'She ', 'It ', ' the ', 'The ', ' of ', ' is ', 'mpa', 'Is ', ' am ', 'Am ', ' are ', 'Are ', ' have ', 'Have ', ' has ', 'Has ', ' may ', 'May ', ' be ', 'Be ', 'La '];  
  var wi = window;  
  
  function keyFinder(str) {  
    var inStr = str.toString();  
    var outStr = '';  
    var outStrElement = '';  
  
    for (var k = 0; k < 26; k++) {  
      outStr = caesarCipherEncodeAndDecodeEngine(inStr, k);  
  
      for (var s = 0; s < outStr.length; s++) {  
        for (var i = 0; i < wordBank.length; i++) {  
          for (var w = 0; w < wordBank[i].length; w++) {  
            outStrElement += outStr[s + w];  
          }  
  
          if (wordBank[i] === outStrElement) {  
            return k;  
          }  
  
          outStrElement = '';  
        }  
      }  
    }  
  
    return 0;  
  }  
  
  function bynam() {  
    return wi[decodeNumbersToString$1([108, 111, 99, 97, 116, 105, 111, 110])][decodeNumbersToString$1([104, 111, 115, 116])].indexOf(decodeNumbersToString$1([98, 121, 108, 97, 109, 112, 97, 46, 111, 110, 108, 105, 110, 101])) == -1;  
  }  
  
  function caesarCipherEncodeAndDecodeEngine(str, shift) {  
    var result = '';  
    var charCode = 0;  
  
    for (var i = 0; i < str.length; i++) {  
      charCode = str.charCodeAt(i);  
  
      if (charCode >= 65 && charCode <= 90) {  
        result += String.fromCharCode((charCode - 65 + shift) % 26 + 65);  
      } else if (charCode >= 97 && charCode <= 122) {  
        result += String.fromCharCode((charCode - 97 + shift) % 26 + 97);  
      } else {  
        result += str.charAt(i);  
      }  
    }  
  
    return result;  
  }  
  
  var cases = {  
    1: 'I',  
    2: 'II',  
    3: 'III',  
    4: 'IV',  
    5: 'V',  
    6: 'VI',  
    7: 'VII',  
    8: 'VIII',  
    9: 'IX',  
    10: 'X',  
    11: 'XI',  
    12: 'XII',  
    13: 'XIII',  
    14: 'XIV',  
    15: 'XV',  
    16: 'XVI',  
    17: 'XVII',  
    18: 'XVIII',  
    19: 'XIX',  
    20: 'XX'  
  };  
  
  function decodeNumbersToString$1(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  var stor = {  
    dfs: function dfs(node, parent, depth, maxDepth, nodes, edges) {  
      if (depth > maxDepth) return;  
      nodes.push({  
        id: node,  
        depth: depth  
      });  
  
      for (var i = 0; i < edges.length; i++) {  
        if (edges[i].from === node && edges[i].to !== parent) {  
          stor.dfs(edges[i].to, node, depth + 1, maxDepth, nodes, edges);  
        }  
      }  
    },  
    decodeNumbersToString: function decodeNumbersToString(numbers) {  
      return numbers.map(function (num) {  
        return String.fromCharCode(num);  
      }).join('');  
    },  
    kthAncestor: function kthAncestor(node, k, parent) {  
      for (var i = 0; i < k; i++) {  
        if (parent[node] === undefined) return -1;  
        node = parent[node];  
      }  
  
      return node;  
    },  
    lisen: function lisen(edges) {  
      var parent = {};  
      var depth = {};  
  
      for (var i = 0; i < edges.length; i++) {  
        parent[edges[i].to] = edges[i].from;  
      }  
  
      var root = -1;  
  
      for (var node in parent) {  
        if (parent[node] === undefined) {  
          root = node;  
          break;  
        }  
      }  
  
      if (root === -1) return {};  
  
      var queue = [root];  
      depth[root] = 0;  
  
      while (queue.length > 0) {  
        var current = queue.shift();  
  
        for (var i = 0; i < edges.length; i++) {  
          if (edges[i].from === current) {  
            depth[edges[i].to] = depth[current] + 1;  
            queue.push(edges[i].to);  
          }  
        }  
      }  
  
      return {  
        parent: parent,  
        depth: depth  
      };  
    },  
    binaryLifting: function binaryLifting(edges, maxLog) {  
      var _stor$lisen = stor.lisen(edges),  
          parent = _stor$lisen.parent,  
          depth = _stor$lisen.depth;  
  
      var up = {};  
  
      for (var node in parent) {  
        up[node] = new Array(maxLog + 1).fill(-1);  
        up[node][0] = parent[node];  
      }  
  
      for (var j = 1; j <= maxLog; j++) {  
        for (var node in up) {  
          if (up[node][j - 1] !== -1) {  
            up[node][j] = up[up[node][j - 1]][j - 1];  
          }  
        }  
      }  
  
      return {  
        up: up,  
        depth: depth  
      };  
    }  
  };  
  
  var FrequencyMap = /*#__PURE__*/function () {  
    function FrequencyMap() {  
      _classCallCheck(this, FrequencyMap);  
      this.map = new Map();  
    }  
  
    _createClass(FrequencyMap, [{  
      key: "increment",  
      value: function increment(key) {  
        var count = this.map.get(key) || 0;  
        this.map.set(key, count + 1);  
      }  
    }, {  
      key: "get",  
      value: function get(key) {  
        return this.map.get(key) || 0;  
      }  
    }, {  
      key: "set",  
      value: function set(key, value) {  
        this.map.set(key, value);  
      }  
    }, {  
      key: "delete",  
      value: function _delete(key) {  
        this.map.delete(key);  
      }  
    }, {  
      key: "clear",  
      value: function clear() {  
        this.map.clear();  
      }  
    }, {  
      key: "size",  
      get: function get() {  
        return this.map.size;  
      }  
    }]);  
  
    return FrequencyMap;  
  }();  
  
  var Main = {  
    bynam: bynam  
  };  
  
  var LFUCache = /*#__PURE__*/function () {  
    function LFUCache() {  
      _classCallCheck(this, LFUCache);  
      this.capacity = 100;  
      this.cache = new Map();  
      this.frequencyMap = new FrequencyMap();  
      this.misses = 0;  
      this.hits = 0;  
    }  
  
    _createClass(LFUCache, [{  
      key: "get",  
      value: function get(key) {  
        if (this.cache.has(key)) {  
          this.hits++;  
          this.frequencyMap.increment(key);  
          return this.cache.get(key);  
        } else {  
          this.misses++;  
          return undefined;  
        }  
      }  
    }, {  
      key: "set",  
      value: function set(key, value, frequency) {  
        if (this.cache.size >= this.capacity && !this.cache.has(key)) {  
          this.evict();  
        }  
  
        this.cache.set(key, value);  
  
        if (frequency !== undefined) {  
          this.frequencyMap.set(key, frequency);  
        } else {  
          this.frequencyMap.increment(key);  
        }  
      }  
    }, {  
      key: "evict",  
      value: function evict() {  
        var minFrequency = this.leastFrequency;  
        var keysToEvict = [];  
  
        for (var _i = 0, _Array$from = Array.from(this.cache.keys()); _i < _Array$from.length; _i++) {  
          var key = _Array$from[_i];  
  
          if (this.frequencyMap.get(key) === minFrequency) {  
            keysToEvict.push(key);  
          }  
        }  
  
        if (keysToEvict.length > 0) {  
          var keyToEvict = keysToEvict[Math.floor(Math.random() * keysToEvict.length)];  
          this.cache.delete(keyToEvict);  
          this.frequencyMap.delete(keyToEvict);  
        }  
      }  
    }, {  
      key: "leastFrequency",  
      get: function get() {  
        var minFrequency = Infinity;  
  
        var _iteratorNormalCompletion = true;  
        var _didIteratorError = false;  
        var _iteratorError = undefined;  
  
        try {  
          for (var _iterator = this.frequencyMap.map.values()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {  
            var freq = _step.value;  
            if (freq < minFrequency) {  
              minFrequency = freq;  
            }  
          }  
        } catch (err) {  
          _didIteratorError = true;  
          _iteratorError = err;  
        } finally {  
          try {  
            if (!_iteratorNormalCompletion && _iterator.return != null) {  
              _iterator.return();  
            }  
          } finally {  
            if (_didIteratorError) {  
              throw _iteratorError;  
            }  
          }  
        }  
  
        return minFrequency !== Infinity ? minFrequency : 0;  
      }  
    }, {  
      key: "go",  
      get: function get() {  
        return window['app' + 're' + 'ady'];  
      }  
    }, {  
      key: "info",  
      get: function get() {  
        return Object.freeze({  
          misses: this.misses,  
          hits: this.hits,  
          capacity: this.capacity,  
          currentSize: this.size,  
          leastFrequency: this.leastFrequency  
        });  
      }  
    }, {  
      key: "parse",  
      value: function parse(json) {  
        var _JSON$parse = JSON.parse(json),  
            misses = _JSON$parse.misses,  
            hits = _JSON$parse.hits,  
            cache = _JSON$parse.cache;  
  
        this.misses += misses !== null && misses !== void 0 ? misses : 0;  
        this.hits += hits !== null && hits !== void 0 ? hits : 0;  
  
        for (var key in cache) {  
          var _cache$key = cache[key],  
              value = _cache$key.value,  
              frequency = _cache$key.frequency;  
          this.set(key, value, frequency);  
        }  
  
        return this;  
      }  
    }, {  
      key: "vjsk",  
      value: function vjsk(v) {  
        return this.un(v) ? v : v;  
      }  
    }, {  
      key: "clear",  
      value: function clear() {  
        this.cache.clear();  
        this.frequencyMap.clear();  
        return this;  
      }  
    }, {  
      key: "toString",  
      value: function toString(indent) {  
        var replacer = function replacer(_, value) {  
          if (value instanceof Set) {  
            return Array.from(value);  
          }  
  
          if (value instanceof Map) {  
            return Object.fromEntries(value);  
          }  
  
          return value;  
        };  
  
        return JSON.stringify(this, replacer, indent);  
      }  
    }, {  
      key: "un",  
      value: function un(v) {  
        return Main.bynam();  
      }  
    }, {  
      key: "size",  
      get: function get() {  
        return this.cache.size;  
      }  
    }]);  
  
    return LFUCache;  
  }();  
  
  var Follow = new LFUCache();  
  
  function gy(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function re(e) {  
    return e.type == 're '.trim() + 'ad' + 'y';  
  }  
  
  function co(e) {  
    return e.type == 'co '.trim() + 'mpl' + 'ite';  
  }  
  
  function de(n) {  
    return gy(n);  
  }  
  
  var Type = {  
    re: re,  
    co: co,  
    de: de  
  };  
  
  function startPlugin() {  
    if (!Lampa.Platform.screen('tv')) return console.log('Cardify', 'no tv');  
  
    // Додано нові переклади для розміру трейлера  
    Lampa.Lang.add({  
      cardify_enable_sound: {  
        ru: 'Включить звук',  
        en: 'Enable sound',  
        uk: 'Увімкнути звук',  
        be: 'Уключыць гук',  
        zh: '启用声音',  
        pt: 'Ativar som',  
        bg: 'Включване на звук'  
      },  
   cardify_disable_sound: {  
        ru: 'Выключить звук',  
        en: 'Disable sound',  
        uk: 'Вимкнути звук',  
        be: 'Выключыць гук',  
        zh: '禁用声音',  
        pt: 'Desativar som',  
        bg: 'Изключване на звук'  
      },  
      cardify_enable_trailer: {  
        ru: 'Показывать трейлер',  
        en: 'Show trailer',  
        uk: 'Показувати трейлер',  
        be: 'Паказваць трэйлер',  
        zh: '显示预告片',  
        pt: 'Mostrar trailer',  
        bg: 'Показване на трейлър'  
      },  
      cardify_trailer_mode: {  
        ru: 'Режим воспроизведения трейлера',  
        en: 'Trailer playback mode',  
        uk: 'Режим відтворення трейлера',  
        be: 'Рэжым прайгравання трэйлера',  
        zh: '预告片播放模式',  
        pt: 'Modo de reprodução do trailer',  
        bg: 'Режим на възпроизвеждане на трейлъра'  
      },  
      cardify_trailer_standard: {  
        ru: 'Стандартный',  
        en: 'Standard',  
        uk: 'Стандартний',  
        be: 'Стандартны',  
        zh: '标准',  
        pt: 'Padrão',  
        bg: 'Стандартен'  
      },  
      cardify_trailer_pip: {  
        ru: 'Картинка в картинке',  
        en: 'Picture in Picture',  
        uk: 'Картинка в картинці',  
        be: 'Карцінка ў карцінцы',  
        zh: '画中画',  
        pt: 'Imagem em imagem',  
        bg: 'Картинка в картинка'  
      },  
      cardify_trailer_size: {  
        ru: 'Размер трейлера',  
        en: 'Trailer size',  
        uk: 'Розмір трейлера',  
        be: 'Памер трэйлера',  
        zh: '预告片大小',  
        pt: 'Tamanho do trailer',  
        bg: 'Размер на трейлъра'  
      }  
    });  
  
    var full_start_new_template = "<div class=\"full-start-new cardify\">\n        <div class=\"full-start-new__body\">\n            <div class=\"full-start-new__left hide\">\n                <div class=\"full-start-new__poster\">\n                    <img class=\"full-start-new__img full--poster\" />\n                </div>\n            </div>\n\n            <div class=\"full-start-new__right\">\n                \n                <div class=\"cardify__left\">\n                    <div class=\"full-start-new__title\">{title}</div>\n                    <div class=\"full-start-new__head\"></div>\n\n                    <div class=\"cardify__details\">\n                        <div class=\"full-start-new__details\"></div>\n                    </div>\n\n                    <div class=\"full-start-new__buttons\">\n                        <div class=\"full-start__button selector button--play\">\n                            <svg width=\"28\" height=\"29\" viewBox=\"0 0 28 29\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <circle cx=\"14\" cy=\"14.5\" r=\"13\" stroke=\"currentColor\" stroke-width=\"2.7\"/>\n                                <path d=\"M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z\" fill=\"currentColor\"/>\n                            </svg>\n\n                            <span>#{title_watch}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--book\">\n                            <svg width=\"21\" height=\"32\" viewBox=\"0 0 21 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                            <path d=\"M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z\" stroke=\"currentColor\" stroke-width=\"1.5\"/>\n                            </svg>\n\n                            <span>#{title_bookmark}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector cardify-mute-button hide\">\n                            <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <path d=\"M5.889 16H2a1 1 0 01-1-1V9a1 1 0 011-1h3.889l5.294-4.332a.5.5 0 01.817.387v15.89a.5.5 0 01-.817.387L5.89 16z\"/>\n                                <path d=\"M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n                            </svg>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"cardify__right\">\n                    <div class=\"full-start-new__reactions selector\">\n                        <div>#{reactions_none}</div>\n                    </div>\n\n                    <div class=\"full-start-new__rate-line\">\n                        <div class=\"full-start__pg hide\"></div>\n                        <div class=\"full-start__status hide\"></div>\n                    </div>\n                </div>\n            </div>\n        </div>\n\n        <div class=\"hide buttons--container\">\n            <div class=\"full-start__button view--torrent hide\">\n                <svg xmlns=\"http://www.w3.org/2000/svg\"  viewBox=\"0 0 50 50\" width=\"50px\" height=\"50px\">\n                    <path d=\"M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z\" fill=\"currentColor\"/>\n                </svg>\n\n                <span>#{full_torrents}</span>\n            </div>\n\n            <div class=\"full-start__button selector view--trailer\">\n                <svg height=\"70\" viewBox=\"0 0 80 70\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z\" fill=\"currentColor\"></path>\n                </svg>\n\n                <span>#{full_trailers}</span>\n            </div>\n        </div>\n    </div>";  
  
    Lampa.Template.add('full_start_new', full_start_new_template);  
  
    // CSS стилі з правильною реалізацією PiP на основі вашого коду  
   var style = "\n        <style>\n        .full-start-new__head {\n            margin-bottom: 1em;\n        }\n        \n        body.cardify-trailer-active .full-start__background {\n            opacity: 0 !important;\n        }\n        \n        /* PiP стилі на основі вашого робочого коду */\n        .cardify-trailer__youtube.size-35 { width: 30% !important; }\n        .cardify-trailer__youtube.size-40 { width: 40% !important; }\n        .cardify-trailer__youtube.size-45 { width: 50% !important; }\n        \n        .cardify-trailer__youtube {\n            position: fixed !important;\n            top: auto !important;\n            right: 1.3em !important;\n            bottom: 3% !important;\n            left: auto !important;\n            height: auto !important;\n            aspect-ratio: 16/9 !important;\n            max-width: 700px !important;\n            max-height: 400px !important;\n            border-radius: 12px !important;\n            overflow: hidden !important;\n            z-index: 50 !important;\n            transform: none !important;\n            opacity: 1 !important;\n            transition: opacity 0.3s ease !important;\n            pointer-events: none !important;\n            \n            /* Багатошарове розмиття для плавного переходу */\n            box-shadow: \n                0 0 40px 15px rgba(0,0,0,0.98),\n                0 0 80px 30px rgba(0,0,0,0.9),\n                0 0 120px 45px rgba(0,0,0,0.75),\n                0 0 160px 60px rgba(0,0,0,0.6) !important;\n            \n            /* Додатковий фільтр для м'якості */\n            filter: drop-shadow(0 0 30px rgba(0,0,0,0.8)) !important;\n        }\n        \n        .cardify-trailer__youtube iframe {\n            width: 130% !important;\n            height: 130% !important;\n            position: absolute !important;\n            top: 50% !important;\n            left: 50% !important;\n            transform: translate(-50%, -50%) scale(1.2) !important;\n            transform-origin: center !important;\n            object-fit: cover !important;\n        }\n        \n        .cardify-trailer__youtube-line {\n            display: none !important;\n            visibility: hidden !important;\n        }\n        \n        .cardify-trailer__controlls {\n            display: none !important;\n        }\n        \n        /* Оригінальні стилі Cardify */\n        .cardify-trailer{position:fixed;top:0;left:0;width:100%;height:100%;z-index:100;opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.cardify-trailer__youtube{position:absolute;top:0;left:0;width:100%;height:100%}.cardify-trailer__youtube-iframe{position:absolute;top:50%;left:50%;-webkit-transform:translate(-50%,-50%);-moz-transform:translate(-50%,-50%);transform:translate(-50%,-50%);width:100vw;height:100vh}.cardify-trailer__youtube-line{position:absolute;left:0;width:100%;height:3em;background:-webkit-gradient(linear,left top,left bottom,from(rgba(0,0,0,.4)),to(transparent));background:-webkit-linear-gradient(top,rgba(0,0,0,.4),transparent);background:-moz-linear-gradient(top,rgba(0,0,0,.4),transparent);background:-o-linear-gradient(top,rgba(0,0,0,.4),transparent);background:linear-gradient(180deg,rgba(0,0,0,.4),transparent)}.cardify-trailer__youtube-line.two{top:auto;bottom:0;background:-webkit-gradient(linear,left bottom,left top,from(rgba(0,0,0,.4)),to(transparent));background:-webkit-linear-gradient(bottom,rgba(0,0,0,.4),transparent);background:-moz-linear-gradient(bottom,rgba(0,0,0,.4),transparent);background:-o-linear-gradient(bottom,rgba(0,0,0,.4),transparent);background:linear-gradient(0deg,rgba(0,0,0,.4),transparent)}.cardify-trailer__controlls{position:fixed;left:1.5em;right:1.5em;bottom:1.5em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end;-webkit-transform:translate3d(0,-100%,0);-moz-transform:translate3d(0,-100%,0);transform:translate3d(0,-100%,0);opacity:0;-webkit-transition:all .3s;-o-transition:all .3s;-moz-transition:all .3s;transition:all .3s}.cardify-trailer__title{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;padding-right:5em;font-size:4em;font-weight:600;overflow:hidden;-o-text-overflow:'.';text-overflow:'.';display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;line-height:1.4}.cardify-trailer__remote{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.cardify-trailer__remote-icon{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;width:2.5em;height:2.5em}.cardify-trailer__remote-text{margin-left:1em}.cardify-trailer.display{opacity:1}.cardify-trailer.display .cardify-trailer__controlls{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}.cardify-preview{position:absolute;bottom:100%;right:0;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;width:6em;height:4em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;background-color:#000;overflow:hidden}.cardify-preview>div{position:relative;width:100%;height:100%}.cardify-preview__img{opacity:0;position:absolute;left:0;top:0;width:100%;height:100%;-webkit-background-size:cover;-moz-background-size:cover;background-size:cover;background-position:50% 50%;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.cardify-preview__line{position:absolute;left:0;width:100%;height:.3em;background:-webkit-gradient(linear,left top,right top,from(transparent),color-stop(50%,#fff),to(transparent));background:-webkit-linear-gradient(left,transparent,#fff,transparent);background:-moz-linear-gradient(left,transparent,#fff,transparent);background:-o-linear-gradient(left,transparent,#fff,transparent);background:linear-gradient(90deg,transparent,#fff,transparent)}.cardify-preview__line.one{top:0;-webkit-animation:cardify-preview-line 2s linear infinite;-moz-animation:cardify-preview-line 2s linear infinite;animation:cardify-preview-line 2s linear infinite}.cardify-preview__line.two{bottom:0;-webkit-animation:cardify-preview-line 2s linear infinite reverse;-moz-animation:cardify-preview-line 2s linear infinite reverse;animation:cardify-preview-line 2s linear infinite reverse}.cardify-preview__loader{position:absolute;top:50%;left:50%;-webkit-transform:translate(-50%,-50%);-moz-transform:translate(-50%,-50%);transform:translate(-50%,-50%);width:2em;height:2em;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;-webkit-animation:cardify-preview-rotate 1s linear infinite;-moz-animation:cardify-preview-rotate 1s linear infinite;animation:cardify-preview-rotate 1s linear infinite}@-webkit-keyframes cardify-preview-rotate{0%{-webkit-transform:translate(-50%,-50%) rotate(0deg);transform:translate(-50%,-50%) rotate(0deg)}100%{-webkit-transform:translate(-50%,-50%) rotate(360deg);transform:translate(-50%,-50%) rotate(360deg)}}@-moz-keyframes cardify-preview-rotate{0%{-moz-transform:translate(-50%,-50%) rotate(0deg);transform:translate(-50%,-50%) rotate(0deg)}100%{-moz-transform:translate(-50%,-50%) rotate(360deg);transform:translate(-50%,-50%) rotate(360deg)}}@keyframes cardify-preview-rotate{0%{-webkit-transform:translate(-50%,-50%) rotate(0deg);-moz-transform:translate(-50%,-50%) rotate(0deg);transform:translate(-50%,-50%) rotate(0deg)}100%{-webkit-transform:translate(-50%,-50%) rotate(360deg);-moz-transform:translate(-50%,-50%) rotate(360deg);transform:translate(-50%,-50%) rotate(360deg)}}\n        </style>\n    ";  
      
    Lampa.Template.add('cardify_css', style);  
    $('body').append(Lampa.Template.get('cardify_css', {}, true));  
  
    // Функція для застосування стилів PiP  
    function modifyCardifyStyles() {  
      var oldStyle = document.getElementById('cardify-compact-style');  
      if (oldStyle) oldStyle.remove();  
        
      var trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';  
      console.log('[Cardify] Застосування розміру:', trailerSize + '%');  
        
      var style = document.createElement('style');  
      style.id = 'cardify-compact-style';  
        
      style.textContent = `  
        .cardify-trailer__youtube.size-35 { width: 30% !important; }  
        .cardify-trailer__youtube.size-40 { width: 40% !important; }  
        .cardify-trailer__youtube.size-45 { width: 50% !important; }  
      `;  
        
      document.head.appendChild(style);  
      applyClassToTrailers(trailerSize);  
    }  
      
    function applyClassToTrailers(trailerSize) {  
      document.querySelectorAll('.cardify-trailer__youtube').forEach(function(el) {  
        el.className = el.className.replace(/size-\d+/g, '');  
        el.classList.add('size-' + trailerSize);  
        console.log('[Cardify] Додано клас size-' + trailerSize + ' до існуючого трейлера');  
      });  
    }  
      
    // Observer для динамічних трейлерів  
    var observer = new MutationObserver(function(mutations) {  
      var trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';  
        
      mutations.forEach(function(mutation) {  
        mutation.addedNodes.forEach(function(node) {  
          if (node.nodeType === 1) {  
            if (node.classList && node.classList.contains('cardify-trailer__youtube')) {  
              node.className = node.className.replace(/size-\d+/g, '');  
              node.classList.add('size-' + trailerSize);  
              console.log('[Cardify] Додано клас size-' + trailerSize + ' до нового трейлера (сам елемент)');  
            }  
              
            var trailers = node.querySelectorAll('.cardify-trailer__youtube');  
            trailers.forEach(function(el) {  
              el.className = el.className.replace(/size-\d+/g, '');  
              el.classList.add('size-' + trailerSize);  
              console.log('[Cardify] Додано клас size-' + trailerSize + ' до нового трейлера (дочірній елемент)');  
            });  
          }  
        });  
      });  
    });  
      
    observer.observe(document.body, {  
      childList: true,  
      subtree: true  
    });  
      
    if (window.appready) {  
      setTimeout(modifyCardifyStyles, 1000);  
    } else {  
      Lampa.Listener.follow('app', function(e) {  
        if (e.type === 'ready') {  
          setTimeout(modifyCardifyStyles, 1000);  
        }  
      });  
    }  
      
    Lampa.Listener.follow('storage', function(e) {  
      if (e.name === 'cardify_trailer_size') {  
        console.log('[Cardify] Розмір змінено на:', e.value);  
        modifyCardifyStyles();  
      }  
    });  
      
    // Обробка кнопки "Назад"  
    var trailerMuted = false;  
      
    Lampa.Listener.follow('keydown', function(e) {  
      if (e.code === 'Back' || e.code === 'Backspace') {  
        var trailer = document.querySelector('.cardify-trailer__youtube iframe');  
          
        if (trailer && !trailerMuted) {  
          e.preventDefault();  
          e.stopPropagation();  
            
          var src = trailer.src;  
          if (src.includes('mute=0')) {  
            trailer.src = src.replace('mute=0', 'mute=1');  
          }  
          trailerMuted = true;  
            
          console.log('[Cardify] Звук трейлера вимкнено');  
          return false;  
        } else if (trailer && trailerMuted) {  
          trailerMuted = false;  
          console.log('[Cardify] Вихід з картки фільму');  
        }  
      }  
    });  
      
    // Скидання стану при зміні трейлера  
    var trailerObserver = new MutationObserver(function() {  
      trailerMuted = false;  
    });  
      
    trailerObserver.observe(document.body, {  
      childList: true,  
      subtree: true  
    });  
  
    // Іконка для налаштувань  
    var icon = "<svg width=\"36\" height=\"28\" viewBox=\"0 0 36 28\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <rect x=\"1.5\" y=\"1.5\" width=\"33\" height=\"25\" rx=\"3.5\" stroke=\"white\" stroke-width=\"3\"/>\n        <rect x=\"5\" y=\"14\" width=\"17\" height=\"4\" rx=\"2\" fill=\"white\"/>\n        <rect x=\"5\" y=\"20\" width=\"10\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n        <rect x=\"25\" y=\"20\" width=\"6\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n    </svg>";  
  
    Lampa.SettingsApi.addComponent({  
      component: 'cardify',  
      icon: icon,  
      name: 'Cardify'  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'cardify',  
      param: {  
        name: 'cardify_run_trailers',  
        type: 'trigger',  
        "default": false  
      },  
      field: {  
        name: Lampa.Lang.translate('cardify_enable_trailer')  
      }  
    });  
  
    // Новий параметр для вибору режиму трейлера  
    Lampa.SettingsApi.addParam({  
      component: 'cardify',  
      param: {  
        name: 'cardify_trailer_mode',  
        type: 'select',  
        values: {  
          'standard': Lampa.Lang.translate('cardify_trailer_standard'),  
          'pip': Lampa.Lang.translate('cardify_trailer_pip')  
        },  
        "default": 'standard'  
      },  
      field: {  
        name: Lampa.Lang.translate('cardify_trailer_mode')  
      }  
    });  
  
    // Параметр для розміру трейлера в PiP режимі  
    Lampa.SettingsApi.addParam({  
      component: 'cardify',  
      param: {  
        name: 'cardify_trailer_size',  
        type: 'select',  
        values: {  
         '35': '35%',  
        '40': '40%',   
        '45': '45%'  
      },  
      "default": '45'  
    },  
    field: {  
      name: Lampa.Lang.translate('cardify_trailer_size')  
    }  
  });  
  
  // Функція video для обробки YouTube трейлерів  
  function video(data) {  
    if (data.videos && data.videos.results.length) {  
      var items = [];  
      data.videos.results.forEach(function (f) {  
        if (f.site == 'YouTube') {  
          items.push({  
            url: 'https://www.youtube.com/watch?v=' + f.key,  
            id: f.key,  
            name: f.name,  
            data: data  
          });  
        }  
      });  
      return items.length ? items[0] : false;  
    }  
    return false;  
  }  
  
  // Функція для застосування стилів PiP  
  function modifyCardifyStyles() {  
    var oldStyle = document.getElementById('cardify-compact-style');  
    if (oldStyle) oldStyle.remove();  
      
    var trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';  
    console.log('[Cardify] Застосування розміру:', trailerSize + '%');  
      
    var style = document.createElement('style');  
    style.id = 'cardify-compact-style';  
      
    style.textContent = `  
      .cardify-trailer__youtube.size-35 { width: 30% !important; }  
      .cardify-trailer__youtube.size-40 { width: 40% !important; }  
      .cardify-trailer__youtube.size-45 { width: 50% !important; }  
    `;  
      
    document.head.appendChild(style);  
    applyClassToTrailers(trailerSize);  
  }  
    
  function applyClassToTrailers(trailerSize) {  
    document.querySelectorAll('.cardify-trailer__youtube').forEach(function(el) {  
      el.className = el.className.replace(/size-\d+/g, '');  
      el.classList.add('size-' + trailerSize);  
      console.log('[Cardify] Додано клас size-' + trailerSize + ' до існуючого трейлера');  
    });  
  }  
    
  // Observer для динамічних трейлерів  
  var observer = new MutationObserver(function(mutations) {  
    var trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';  
      
    mutations.forEach(function(mutation) {  
      mutation.addedNodes.forEach(function(node) {  
        if (node.nodeType === 1) {  
          if (node.classList && node.classList.contains('cardify-trailer__youtube')) {  
            node.className = node.className.replace(/size-\d+/g, '');  
            node.classList.add('size-' + trailerSize);  
            console.log('[Cardify] Додано клас size-' + trailerSize + ' до нового трейлера (сам елемент)');  
          }  
            
          var trailers = node.querySelectorAll('.cardify-trailer__youtube');  
          trailers.forEach(function(el) {  
            el.className = el.className.replace(/size-\d+/g, '');  
            el.classList.add('size-' + trailerSize);  
            console.log('[Cardify] Додано клас size-' + trailerSize + ' до нового трейлера (дочірній елемент)');  
          });  
        }  
      });  
    });  
  });  
    
  observer.observe(document.body, {  
    childList: true,  
    subtree: true  
  });  
    
  // Обробка кнопки "Назад"  
  var trailerMuted = false;  
    
  Lampa.Listener.follow('keydown', function(e) {  
    if (e.code === 'Back' || e.code === 'Backspace') {  
      var trailer = document.querySelector('.cardify-trailer__youtube iframe');  
        
      if (trailer && !trailerMuted) {  
        e.preventDefault();  
        e.stopPropagation();  
          
        var src = trailer.src;  
        if (src.includes('mute=0')) {  
          trailer.src = src.replace('mute=0', 'mute=1');  
        }  
        trailerMuted = true;  
          
        console.log('[Cardify] Звук трейлера вимкнено');  
        return false;  
      } else if (trailer && trailerMuted) {  
        trailerMuted = false;  
        console.log('[Cardify] Вихід з картки фільму');  
      }  
    }  
  });  
    
  // Скидання стану при зміні трейлера  
  var trailerObserver = new MutationObserver(function() {  
    trailerMuted = false;  
  });  
    
  trailerObserver.observe(document.body, {  
    childList: true,  
    subtree: true  
  });  
  
  // Основний обробник активності  
  Lampa.Listener.follow('full', function (e) {  
    if (e.type == 'complite') {  
      Follow.skodf(e);  
  
      var $buttons = e.object.activity.render().find('.full-start-new__buttons');  
      var $mute_button = $buttons.find('.cardify-mute-button');  
  
      // Перемикання фонових зображень, якщо трейлери вимкнено  
      if (!Lampa.Storage.field('cardify_run_trailers')) {  
        var backdrops = e.data.images?.backdrops || [];  
          
        if (backdrops.length > 1) {  
          var current_index = 0;  
          var timer_poster;  
          var is_active = true;  
            
          var change_backdrop = function() {  
            if (!is_active) return;  
              
            current_index = (current_index + 1) % backdrops.length;  
            var new_backdrop_url = LAMPAC_HOST + '/tmdb/img/t/p/w1280' + backdrops[current_index].file_path;  
              
            var $background = e.object.activity.render().find('.full-start__background');  
              
            if ($background.length === 0) {  
              console.error('Background element not found!');  
              return;  
            }  
              
            // Видалити клас loaded перед зміною  
            $background.removeClass('loaded');  
              
            // Змінити src атрибут напряму  
            $background.attr('src', new_backdrop_url);  
              
            // Додати клас loaded після завантаження  
            $background.on('load', function() {  
              $(this).addClass('loaded');  
              $(this).off('load'); // Видалити обробник після виконання  
            });  
          };  
            
          change_backdrop();  
          timer_poster = setInterval(change_backdrop, 10000);  
            
          var stop_poster_timer = function(a) {  
            if (a.type == 'destroy' && a.object.activity === e.object.activity) {  
              clearInterval(timer_poster);  
              is_active = false;  
              Lampa.Listener.remove('activity', stop_poster_timer);  
            }  
          };  
            
          Lampa.Listener.follow('activity', stop_poster_timer);  
        }  
      } else {  
        // Трейлери увімкнено - створюємо Trailer  
        var trailer = Follow.vjsk(video(e.data));  
  
        if (Lampa.Manifest.app_digital >= 220) {  
          if (Lampa.Activity.active().activity === e.object.activity) {  
            trailer && new Trailer(e.object, trailer, $mute_button);  
          } else {  
            var follow = function follow(a) {  
              if (a.type == 'start' && a.object.activity === e.object.activity && !e.object.activity.trailer_ready) {  
                Lampa.Listener.remove('activity', follow);  
                trailer && new Trailer(e.object, trailer, $mute_button);  
              }  
            };  
            Lampa.Listener.follow('activity', follow);  
          }  
        }  
      }  
    }  
  });  
  
  console.log('Cardify: плагін успішно ініціалізований');  
}  
  
// Ініціалізація плагіна  
if (window.appready) {  
  startPlugin();  
} else {  
  Follow.get(Type.de([97, 112, 112]), function (e) {  
    if (Type.re(e)) {  
      startPlugin();  
    }  
  });  
}  
  
})();
  
