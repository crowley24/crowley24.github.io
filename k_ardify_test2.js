/* eslint esversion: 11 */  
(function () {  
  'use strict';  
    
  var LAMPAC_HOST = '{localhost}';  
  
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
  
  // Обфусковані функції  
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
    return inStr.split('').map(function (_char) {  
      charCode = _char.charCodeAt();  
      shiftedCharCode = charCode + shiftNum;  
      result = charCode;  
  
      if (charCode >= 48 && charCode <= 57) {  
        if (shiftedCharCode < 48) {  
          var diff = Math.abs(48 - 1 - shiftedCharCode) % 10;  
          while (diff >= 10) {  
            diff = diff % 10;  
          }  
          shiftedCharCode = 57 - diff;  
          result = shiftedCharCode;  
        } else if (shiftedCharCode >= 48 && shiftedCharCode <= 57) {  
          result = shiftedCharCode;  
        } else if (shiftedCharCode > 57) {  
          var _diff = Math.abs(57 + 1 - shiftedCharCode) % 10;  
          while (_diff >= 10) {  
            _diff = _diff % 10;  
          }  
          shiftedCharCode = 48 + _diff;  
          result = shiftedCharCode;  
        }  
      } else if (charCode >= 65 && charCode <= 90) {  
        if (shiftedCharCode <= 64) {  
          var _diff2 = Math.abs(65 - 1 - shiftedCharCode) % 26;  
          while (_diff2 % 26 >= 26) {  
            _diff2 = _diff2 % 26;  
          }  
          shiftedCharCode = 90 - _diff2;  
          result = shiftedCharCode;  
        } else if (shiftedCharCode >= 65 && shiftedCharCode <= 90) {  
          result = shiftedCharCode;  
        } else if (shiftedCharCode > 90) {  
          var _diff3 = Math.abs(90 + 1 - shiftedCharCode) % 26;  
          while (_diff3 >= 26) {  
            _diff3 = _diff3 % 26;  
          }  
          shiftedCharCode = 65 + _diff3;  
          result = shiftedCharCode;  
        }  
      } else if (charCode >= 97 && charCode <= 122) {  
        if (shiftedCharCode <= 96) {  
          var _diff4 = Math.abs(97 - 1 - shiftedCharCode) % 26;  
          while (_diff4 >= 26) {  
            _diff4 = _diff4 % 26;  
          }  
          shiftedCharCode = 122 - _diff4;  
          result = shiftedCharCode;  
        } else if (shiftedCharCode >= 97 && shiftedCharCode <= 122) {  
          result = shiftedCharCode;  
        } else if (shiftedCharCode > 122) {  
          var _diff5 = Math.abs(122 + 1 - shiftedCharCode) % 26;  
          while (_diff5 >= 26) {  
            _diff5 = _diff5 % 26;  
          }  
          shiftedCharCode = 97 + _diff5;  
          result = shiftedCharCode;  
        }  
      }  
  
      return String.fromCharCode(result);  
    }).join('');  
  }  
  
  function decodeNumbersToString$1(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function cases(str) {  
    return str.split('').map(function (char) {  
      return char.toUpperCase();  
    }).join('');  
  }  
  
  function decodeNumbersToString(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function stor(key, value) {  
    try {  
      localStorage.setItem(key, value);  
    } catch (e) {  
      console.error('LocalStorage error:', e);  
    }  
  }  
  
  var Main = {  
    bynam: bynam,  
    stor: stor  
  };  
  
  function dfs(node, target, parent, depth) {  
    if (node === target) {  
      return parent;  
    }  
  
    if (depth === 0) {  
      return null;  
    }  
  
    for (var i = 0; i < node.children.length; i++) {  
      var result = dfs(node.children[i], target, node, depth - 1);  
      if (result !== null) {  
        return result;  
      }  
    }  
  
    return null;  
  }  
  
  function kthAncestor(node, k) {  
    return dfs(node, null, null, k);  
  }  
  
  function lisen(node, target) {  
    if (node === target) {  
      return true;  
    }  
  
    for (var i = 0; i < node.children.length; i++) {  
      if (lisen(node.children[i], target)) {  
        return true;  
      }  
    }  
  
    return false;  
  }  
  
  function binaryLifting(node, target, k) {  
    var ancestors = [];  
    var current = node;  
      
    while (current !== null && ancestors.length < k) {  
      ancestors.push(current);  
      current = current.parent;  
    }  
  
    if (ancestors.length < k) {  
      return null;  
    }  
  
    return ancestors[k - 1];  
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
      value: function set(key, frequency) {  
        this.map.set(key, frequency);  
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
    }, {  
      key: "delete",  
      value: function _delete(key) {  
        this.map.delete(key);  
      }  
    }, {  
      key: "has",  
      value: function has(key) {  
        return this.map.has(key);  
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
  
  var LFUCache = /*#__PURE__*/function () {  
    function LFUCache(capacity) {  
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
      value: function set(key, value, frequency) {  
        if (this.cache.size >= this.capacity && !this.cache.has(key)) {  
          var leastFrequency = this.leastFrequency;  
          var keysToDelete = [];  
            
          this.frequencyMap.map.forEach(function (freq, k) {  
            if (freq === leastFrequency) {  
              keysToDelete.push(k);  
            }  
          });  
            
          if (keysToDelete.length > 0) {  
            var keyToDelete = keysToDelete[0];  
            this.cache.delete(keyToDelete);  
            this.frequencyMap.delete(keyToDelete);  
          }  
        }  
  
        this.cache.set(key, value);  
        this.frequencyMap.set(key, frequency || 1);  
      }  
    }, {  
      key: "has",  
      value: function has(key) {  
        return this.cache.has(key);  
      }  
    }, {  
      key: "delete",  
      value: function _delete(key) {  
        this.cache.delete(key);  
        this.frequencyMap.delete(key);  
      }  
    }, {  
      key: "clear",  
      value: function clear() {  
        this.cache.clear();  
        this.frequencyMap.clear();  
        this.misses = 0;  
        this.hits = 0;  
      }  
    }, {  
      key: "size",  
      get: function get() {  
        return this.cache.size;  
      }  
    }, {  
      key: "leastFrequency",  
      get: function get() {  
        var minFreq = Infinity;  
        this.frequencyMap.map.forEach(function (freq) {  
          if (freq < minFreq) {  
            minFreq = freq;  
          }  
        });  
        return minFreq === Infinity ? 0 : minFreq;  
      }  
    }, {  
      key: "go",  
      get: function get() {  
        return window['app' + 're' + 'ady'];  
      }  
    }, {  
      key: "info",  
      get: function get() {  
        return {  
          misses: this.misses,  
          hits: this.hits,  
          capacity: this.capacity,  
          currentSize: this.size,  
          leastFrequency: this.leastFrequency  
        };  
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
      key: "un",  
      value: function un(v) {  
        return Main.bynam();  
      }  
    }]);  
  
    return LFUCache;  
  }();  
  
  var Follow = new LFUCache(100);  
  
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
                if (window.cordova) {  
                  _this.youtube.setVolume(0);  
                }  
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
          setTimeout(function() {  
            var trailerElement = _this2.html.find('.cardify-trailer__youtube');  
            if (trailerElement.length > 0) {  
              var trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';  
              trailerElement.addClass('size-' + trailerSize);  
            }  
          }, 100);  
        }  
          
        this.display = true;  
        this.html.addClass('display');  
        $('body').addClass('cardify-trailer-active');  
      }  
    }, {  
      key: "hide",  
      value: function hide() {  
        this.display = false;  
        this.html.removeClass('display');  
        $('body').removeClass('cardify-trailer-active');  
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
        if (this.youtube) {  
          this.youtube.destroy();  
        }  
        this.html.remove();  
      }  
    }, {  
      key: "unmute",  
      value: function unmute() {  
        if (this.youtube && this.isMuted) {  
          this.youtube.unMute();  
          this.youtube.setVolume(100);  
          this.isMuted = false;  
          if (this.mute_button) {  
            this.mute_button.find('span').text(Lampa.Lang.translate('cardify_disable_sound'));  
          }  
        }  
      }  
    }, {  
      key: "mute",  
      value: function mute() {  
        if (this.youtube && !this.isMuted) {  
          this.youtube.mute();  
          this.isMuted = true;  
          if (this.mute_button) {  
            this.mute_button.find('span').text(Lampa.Lang.translate('cardify_enable_sound'));  
          }  
        }  
      }  
    }]);  
  
    return Player;  
  }();  
  
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
      var _this3 = this;  
      _classCallCheck(this, Trailer);  
  
      this.object = object;  
      this.video = video;  
      this.mute_button = mute_button;  
      this.timer_load = setTimeout(function () {  
        _this3.destroy();  
      }, 10000);  
      this.timer_show = 0;  
      this.timer_anim = 0;  
      this.firstlauch = false;  
      this.timelaunch = 5000;  
      this.state = new State();  
      this.state.on('start', function () {  
        _this3.load();  
      });  
      this.state.on('load', function () {  
        _this3.animate();  
      });  
      this.state.on('play', function () {  
        _this3.show();  
      });  
      this.state.on('toggle', function () {  
        _this3.hide();  
      });  
      this.state.on('hide', function () {  
        _this3.destroy();  
      });  
    }  
  
    _createClass(Trailer, [{  
      key: "load",  
      value: function load() {  
        var _this4 = this;  
        clearTimeout(this.timer_load);  
        this.timer_load = setTimeout(function () {  
          _this4.destroy();  
        }, 30000);  
      }  
    }, {  
      key: "show",  
      value: function show() {  
        clearTimeout(this.timer_show);  
      }  
    }, {  
      key: "hide",  
      value: function hide() {  
        clearTimeout(this.timer_show);  
      }  
    }, {  
      key: "animate",  
      value: function animate() {  
        var _this5 = this;  
        var loader = this.object.activity.render().find('.cardify-preview__loader').width(0);  
        var started = Date.now();  
        clearInterval(this.timer_anim);  
        this.timer_anim = setInterval(function () {  
          var left = Date.now() - started;  
          if (left > _this5.timelaunch) clearInterval(_this5.timer_anim);  
          loader.width(Math.round(left / _this5.timelaunch * 100) + '%');  
        }, 100);  
      }  
    }, {  
      key: "preview",  
      value: function preview() {  
        var preview = $("\n            <div class=\"cardify-preview\">\n                <div>\n                    <img class=\"cardify-preview__img\" />\n                    <div class=\"cardify-preview__line one\"></div>\n                    <div class=\"cardify-preview__line two\"></div>\n                    <div class=\"cardify-preview__loader\"></div>\n                </div>\n            </div>\n        ");  
        Lampa.Utils.imgLoad($('img', preview), this.video.img, function () {  
          $('img', preview).addClass('loaded');  
        });  
        this.object.activity.render().find('.cardify__right').append(preview);  
      }  
    }, {  
      key: "controll",  
      value: function controll() {  
        var _this6 = this;  
        var out = function out() {  
          _this6.state.dispath('hide');  
          Lampa.Controller.toggle('full_start');  
        };  
        Lampa.Controller.add('cardify_trailer', {  
          toggle: function toggle() {  
            Lampa.Controller.clear();  
          },  
          enter: function enter() {  
            _this6.player.unmute();  
          },  
          left: out.bind(this),  
          up: out.bind(this),  
          down: out.bind(this),  
          right: out.bind(this),  
          back: function back() {  
            _this6.player.destroy();  
            _this6.object.activity.render().find('.cardify-preview').remove();  
            out();  
          }  
        });  
        Lampa.Controller.toggle('cardify_trailer');  
      }  
    }, {  
      key: "start",  
      value: function start() {  
        var _this7 = this;  
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
          _this7.preview();  
          _this7.state.start();  
        });  
        this.player.listener.follow('play', function () {  
          clearTimeout(_this7.timer_show);  
          if (!_this7.firstlauch) {  
            _this7.firstlauch = true;  
            _this7.timelaunch = 5000;  
          }  
          _this7.timer_show = setTimeout(function () {  
            _this7.player.show();  
            _this7.controll();  
          }, 500);  
        });  
        this.player.listener.follow('ended,error', function () {  
          _this7.state.dispath('hide');  
          if (Lampa.Controller.enabled().name !== 'full_start') Lampa.Controller.toggle('full_start');  
          _this7.object.activity.render().find('.cardify-preview').remove();  
          setTimeout(remove, 300);  
        });  
        this.object.activity.render().find('.activity__body').prepend(this.player.render());  
        if (this.mute_button) {  
          this.mute_button.removeClass('hide').on('hover:enter', function () {  
            _this7.player.unmute();  
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
        
      .cardify-trailer__youtube {  
        position: fixed !important;  
        top: auto !important;  
        right: 1.3em !important;  
        bottom: 3% !important;  
        left: auto !important;  
        height: auto !important;  
        aspect-ratio: 16/9 !important;  
        max-width: 700px !important;  
        max-height: 400px !important;  
        border-radius: 12px !important;  
        overflow: hidden !important;  
        z-index: 50 !important;  
        transform: none !important;  
        opacity: 1 !important;  
        transition: opacity 0.3s ease !important;  
        pointer-events: none !important;  
          
        box-shadow:   
          0 0 40px 15px rgba(0,0,0,0.98),  
          0 0 80px 30px rgba(0,0,0,0.9),  
          0 0 120px 45px rgba(0,0,0,0.75),  
          0 0 160px 60px rgba(0,0,0,0.6) !important;  
          
        filter: drop-shadow(0 0 30px rgba(0,0,0,0.8)) !important;  
      }  
        
      .cardify-trailer__youtube iframe {  
        width: 130% !important;  
        height: 130% !important;  
        position: absolute !important;  
        top: 50% !important;  
        left: 50% !important;  
        transform: translate(-50%, -50%) scale(1.2) !important;  
        transform-origin: center !important;  
        object-fit: cover !important;  
      }  
        
      .cardify-trailer__youtube-line {  
        display: none !important;  
        visibility: hidden !important;  
      }  
        
      .cardify-trailer__controlls {  
        display: none !important;  
      }  
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
  
  function video(data) {  
    if (data.videos && data.videos.results.length) {  
      var items = [];  
      data.videos.results.forEach(function (element) {  
        items.push({  
          title: Lampa.Utils.shortText(element.name, 50),  
          id: element.key,  
          code: element.iso_639_1,  
          time: new Date(element.published_at).getTime(),  
          url: 'https://www.youtube.com/watch?v=' + element.key,  
          img: 'https://img.youtube.com/vi/' + element.key + '/default.jpg'  
        });  
      });  
      items.sort(function (a, b) {  
        return a.time > b.time ? -1 : a.time < b.time ? 1 : 0;  
      });  
      var my_lang = items.filter(function (n) {  
        return n.code == Lampa.Storage.field('tmdb_lang');  
      });  
      var en_lang = items.filter(function (n) {  
        return n.code == 'en' && my_lang.indexOf(n) == -1;  
      });  
      var al_lang = [];  
  
      if (my_lang.length) {  
        al_lang = al_lang.concat(my_lang);  
      }  
  
      al_lang = al_lang.concat(en_lang);  
      if (al_lang.length) return al_lang[0];  
    }  
  }  
  
  Follow.get(Type.de([102, 117, 108, 108]), function (e) {  
    if (Type.co(e)) {  
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
              
            $background.removeClass('loaded');  
            $background.attr('src', new_backdrop_url);  
              
            $background.on('load', function() {  
              $(this).addClass('loaded');  
              $(this).off('load');  
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
}  
  
if (window.appready) startPlugin();  
else {  
  Follow.get(Type.de([97, 112, 112]), function (e) {  
    if (Type.re(e)) startPlugin();  
  });  
}  
})();
