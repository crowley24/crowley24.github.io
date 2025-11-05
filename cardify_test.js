(function () {  
  'use strict';  
  
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
  
  function _toConsumableArray(arr) {  
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();  
  }  
  
  function _arrayWithoutHoles(arr) {  
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);  
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
  
  function _createForOfIteratorHelper(o, allowArrayLike) {  
    var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];  
    if (!it) {  
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {  
        if (it) o = it;  
        var i = 0;  
        var F = function () {};  
        return {  
          s: F,  
          n: function () {  
            if (i >= o.length) return { done: true };  
            return { done: false, value: o[i++] };  
          },  
          e: function (_e) {  
            throw _e;  
          },  
          f: F  
        };  
      }  
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");  
    }  
    var normalCompletion = true, didErr = false, err;  
    return {  
      s: function () {  
        it = it.call(o);  
      },  
      n: function () {  
        var step = it.next();  
        normalCompletion = step.done;  
        return step;  
      },  
      e: function (_e2) {  
        didErr = true;  
        err = _e2;  
      },  
      f: function () {  
        try {  
          if (!normalCompletion && it.return != null) it.return();  
        } finally {  
          if (didErr) throw err;  
        }  
      }  
    };  
  }  
  
  var State = /*#__PURE__*/function () {  
    function State(params) {  
      _classCallCheck(this, State);  
      this.params = params;  
      this.state = params.state;  
    }  
    _createClass(State, [{  
      key: "dispath",  
      value: function dispath(name) {  
        if (this.params.transitions[name]) {  
          this.state = name;  
          this.params.transitions[name](this);  
        }  
      }  
    }, {  
      key: "start",  
      value: function start() {  
        this.dispath(this.state);  
      }  
    }]);  
    return State;  
  }();  
  
  var Subscribe = /*#__PURE__*/function () {  
    function Subscribe() {  
      _classCallCheck(this, Subscribe);  
      this.listener = {};  
    }  
    _createClass(Subscribe, [{  
      key: "follow",  
      value: function follow(name, call) {  
        if (!this.listener[name]) this.listener[name] = [];  
        this.listener[name].push(call);  
      }  
    }, {  
      key: "send",  
      value: function send(name, data) {  
        if (this.listener[name]) {  
          this.listener[name].forEach(function (call) {  
            call(data);  
          });  
        }  
      }  
    }, {  
      key: "remove",  
      value: function remove(name, call) {  
        if (this.listener[name]) {  
          this.listener[name] = this.listener[name].filter(function (c) {  
            return c !== call;  
          });  
        }  
      }  
    }]);  
    return Subscribe;  
  }();  
  
  var Player = /*#__PURE__*/function () {  
    function Player(object, video) {  
      var _this = this;  
      _classCallCheck(this, Player);  
      this.object = object;  
      this.video = video;  
      this.loaded = false;  
      this.display = false;  
      this.listener = new Subscribe();  
      this.html = $('<div class="cardify-trailer"><div class="cardify-trailer__youtube"><div class="cardify-trailer__youtube-player"></div><div class="cardify-trailer__youtube-line one"></div><div class="cardify-trailer__youtube-line two"></div></div><div class="cardify-trailer__controlls"><div class="cardify-trailer__controll selector cardify-trailer__controll--play"><svg width="21" height="26" viewBox="0 0 21 26" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L19 13L2 24V2Z" stroke="white" stroke-width="3" stroke-linejoin="round"/></svg></div><div class="cardify-trailer__controll selector cardify-trailer__controll--pause"><svg width="21" height="26" viewBox="0 0 21 26" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="5" y1="2" x2="5" y2="24" stroke="white" stroke-width="3" stroke-linecap="round"/><line x1="16" y1="2" x2="16" y2="24" stroke="white" stroke-width="3" stroke-linecap="round"/></svg></div><div class="cardify-trailer__controll selector cardify-trailer__controll--mute"><svg width="26" height="20" viewBox="0 0 26 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 7H6L12 2V18L6 13H2V7Z" stroke="white" stroke-width="2" stroke-linejoin="round"/><path d="M17 5C18.5 6.5 19 8 19 10C19 12 18.5 13.5 17 15" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="M21 2C23.5 4.5 24 7 24 10C24 13 23.5 15.5 21 18" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></div><div class="cardify-trailer__controll selector cardify-trailer__controll--unmute"><svg width="26" height="20" viewBox="0 0 26 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 7H6L12 2V18L6 13H2V7Z" stroke="white" stroke-width="2" stroke-linejoin="round"/><line x1="17" y1="4.70711" x2="23.2929" y2="10.9999" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="23.2929" y1="9.00011" x2="17" y2="15.2929" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></div></div></div>');  
      this.youtube;  
      this.timer;  
      this.muted = true;  
      this.html.find('.cardify-trailer__controll--play').on('hover:enter', function () {  
        _this.play();  
      });  
      this.html.find('.cardify-trailer__controll--pause').on('hover:enter', function () {  
        _this.pause();  
      });  
      this.html.find('.cardify-trailer__controll--mute').on('hover:enter', function () {  
        _this.mute();  
      });  
      this.html.find('.cardify-trailer__controll--unmute').on('hover:enter', function () {  
        _this.unmute();  
      });  
      this.create();  
    }  
    _createClass(Player, [{  
      key: "create",  
      value: function create() {  
        var _this2 = this;  
        this.youtube = new YT.Player(this.html.find('.cardify-trailer__youtube-player')[0], {  
          height: '100%',  
          width: '100%',  
          videoId: this.video.id,  
          playerVars: {  
            'autoplay': 0,  
            'controls': 0,  
            'showinfo': 0,  
            'rel': 0,  
            'modestbranding': 1,  
            'iv_load_policy': 3,  
            'disablekb': 1,  
            'fs': 0  
          },  
          events: {  
            'onReady': function onReady(event) {  
              _this2.loaded = true;  
              _this2.listener.send('loaded');  
              if (_this2.muted) event.target.mute();  
            },  
            'onStateChange': function onStateChange(event) {  
              if (event.data == YT.PlayerState.PLAYING) {  
                _this2.listener.send('play');  
                _this2.startTimer();  
              } else if (event.data == YT.PlayerState.PAUSED) {  
                _this2.listener.send('paused');  
                clearInterval(_this2.timer);  
              } else if (event.data == YT.PlayerState.ENDED) {  
                _this2.listener.send('ended');  
                clearInterval(_this2.timer);  
              }  
            },  
            'onError': function onError(event) {  
              _this2.listener.send('error', event);  
            }  
          }  
        });  
      }  
    }, {  
      key: "startTimer",  
      value: function startTimer() {  
        var _this3 = this;  
        clearInterval(this.timer);  
        this.timer = setInterval(function () {  
          try {  
            var duration = _this3.youtube.getDuration();  
            var current = _this3.youtube.getCurrentTime();  
            if (duration - current < 13 && !_this3.muted) {  
              _this3.fadeOut();  
            }  
          } catch (e) {}  
        }, 1000);  
      }  
    }, {  
      key: "fadeOut",  
      value: function fadeOut() {  
        var _this4 = this;  
        var volume = 100;  
        var fade = setInterval(function () {  
          if (volume > 0) {  
            volume -= 5;  
            try {  
              _this4.youtube.setVolume(volume);  
            } catch (e) {}  
          } else {  
            clearInterval(fade);  
            _this4.mute();  
          }  
        }, 100);  
      }  
    }, {  
      key: "play",  
      value: function play() {  
        try {  
          this.youtube.playVideo();  
        } catch (e) {}  
      }  
    }, {  
      key: "pause",  
      value: function pause() {  
        try {  
          this.youtube.pauseVideo();  
        } catch (e) {}  
      }  
    }, {  
      key: "mute",  
      value: function mute() {  
        this.muted = true;  
        this.html.find('.cardify-trailer__controll--mute').hide();  
        this.html.find('.cardify-trailer__controll--unmute').show();  
        try {  
          this.youtube.mute();  
        } catch (e) {}  
      }  
    }, {  
      key: "unmute",  
      value: function unmute() {  
        this.muted = false;  
        this.html.find('.cardify-trailer__controll--mute').show();  
        this.html.find('.cardify-trailer__controll--unmute').hide();  
        try {  
          this.youtube.unMute();  
          this.youtube.setVolume(100);  
        } catch (e) {}  
      }  
    }, {  
      key: "show",  
      value: function show() {  
        this.html.addClass('display');  
        this.display = true;  
      }  
    }, {  
      key: "hide",  
      value: function hide() {  
        this.html.removeClass('display');  
        this.display = false;  
      }  
    }, {  
      key: "render",  
      value: function render() {  
        return this.html;  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        this.loaded = false;  
        this.display = false;  
        try { this.youtube.destroy(); } catch (e) {}  
        clearInterval(this.timer);  
        this.html.remove();  
      }  
    }]);  
    return Player;  
  }();
  var Trailer = /*#__PURE__*/function () {  
    function Trailer(object, video) {  
      var _this = this;  
      _classCallCheck(this, Trailer);  
  
      object.activity.trailer_ready = true;  
      this.object = object;  
      this.video = video;  
      this.player;  
      this.background = this.object.activity.render().find('.full-start__background');  
      this.startblock = this.object.activity.render().find('.cardify');  
      this.head = $('.head');  
      this.timelauch = 1200;  
      this.firstlauch = false;  
      this.state = new State({  
        state: 'start',  
        transitions: {  
          start: function start(state) {  
            clearTimeout(_this.timer_load);  
            if (_this.player.display) state.dispath('play');  
            else if (_this.player.loaded) {  
              _this.animate();  
              _this.timer_load = setTimeout(function () {  
                state.dispath('load');  
              }, _this.timelauch);  
            }  
          },  
          load: function load(state) {  
            if (_this.player.loaded && Lampa.Controller.enabled().name == 'full_start' && _this.same()) state.dispath('play');  
          },  
          play: function play() {  
            _this.player.play();  
          },  
          toggle: function toggle(state) {  
            clearTimeout(_this.timer_load);  
            if (Lampa.Controller.enabled().name == 'cardify_trailer') ;  
            else if (Lampa.Controller.enabled().name == 'full_start' && _this.same()) {  
              state.start();  
            } else if (_this.player.display) {  
              state.dispath('hide');  
            }  
          },  
          hide: function hide() {  
            _this.player.pause();  
            _this.player.hide();  
            _this.background.removeClass('nodisplay');  
            _this.startblock.removeClass('nodisplay');  
            _this.head.removeClass('nodisplay');  
            _this.object.activity.render().find('.cardify-preview__loader').width(0);  
          }  
        }  
      });  
      this.start();  
    }  
  
    _createClass(Trailer, [{  
      key: "same",  
      value: function same() {  
        return Lampa.Activity.active().activity === this.object.activity;  
      }  
    }, {  
      key: "animate",  
      value: function animate() {  
        var _this2 = this;  
        var loader = this.object.activity.render().find('.cardify-preview__loader').width(0);  
        var started = Date.now();  
        clearInterval(this.timer_anim);  
        this.timer_anim = setInterval(function () {  
          var left = Date.now() - started;  
          if (left > _this2.timelauch) clearInterval(_this2.timer_anim);  
          loader.width(Math.round(left / _this2.timelauch * 100) + '%');  
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
        var _this3 = this;  
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
  
        this.player = new Player(this.object, this.video);  
        this.player.listener.follow('loaded', function (e) {  
          _this4.state.start();  
        });  
        this.player.listener.follow('play', function (e) {  
          _this4.background.addClass('nodisplay');  
          _this4.startblock.addClass('nodisplay');  
          _this4.head.addClass('nodisplay');  
          _this4.controll();  
        });  
        this.preview();  
        this.object.activity.render().find('.cardify').append(this.player.render());  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        this.player.destroy();  
        this.object.activity.render().find('.cardify-preview').remove();  
        clearTimeout(this.timer_load);  
        clearInterval(this.timer_anim);  
      }  
    }]);  
  
    return Trailer;  
  }();
  var CacheNode = /*#__PURE__*/function () {  
    function CacheNode(key, value) {  
      var frequency = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;  
      _classCallCheck(this, CacheNode);  
      this.key = key;  
      this.value = value;  
      this.frequency = frequency;  
    }  
    return CacheNode;  
  }();  
  
  var State = /*#__PURE__*/function () {  
    function State(params) {  
      _classCallCheck(this, State);  
      this.state = params.state;  
      this.transitions = params.transitions;  
    }  
    _createClass(State, [{  
      key: "start",  
      value: function start() {  
        if (this.transitions[this.state]) this.transitions[this.state](this);  
      }  
    }, {  
      key: "dispath",  
      value: function dispath(state) {  
        this.state = state;  
        this.start();  
      }  
    }]);  
    return State;  
  }();  
  
  function caesarCipherEncodeAndDecodeEngine(str, shift) {  
    var result = '';  
    for (var i = 0; i < str.length; i++) {  
      var charCode = str.charCodeAt(i);  
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
  
  function decodeNumbersToString$1(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function bynam() {  
    var encoded = caesarCipherEncodeAndDecodeEngine('czncorb.bayvnr', 13);  
    return window.location.hostname !== encoded;  
  }  
  
  var Main = {  
    cases: function cases() {  
      return window.Lampa;  
    },  
    stor: function stor() {  
      return decodeNumbersToString$1([83, 116, 111, 114, 97, 103, 101]);  
    },  
    bynam: bynam  
  };  
  
  function dfs() {  
    var graphObject = [3];  
    var ancestors = [];  
    for (var i = 0; i < graphObject.length; i++) {  
      ancestors.push(lisen());  
    }  
    return ancestors.slice(0, 1)[0];  
  }  
  
  function decodeNumbersToString(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function kthAncestor(node, k) {  
    if (!node) return dfs();  
    if (k >= this.connections.size) {  
      return this.root;  
    }  
    for (var i = 0; i < this.log; i++) {  
      if (k & 1 << i) {  
        node = this.up.get(node).get(i);  
      }  
    }  
    return node;  
  }  
  
  function lisen(i) {  
    kthAncestor();  
    return decodeNumbersToString([76, 105, 115, 116, 101, 110, 101, 114]);  
  }  
  
  function binaryLifting(root, tree) {  
    var graphObject = [3];  
    var ancestors = [];  
    for (var i = 0; i < graphObject.length; i++) {  
      ancestors.push(lisen());  
    }  
    return ancestors.slice(0, 1)[0];  
  }  
  
  var FrequencyMap = /*#__PURE__*/function () {  
    function FrequencyMap() {  
      _classCallCheck(this, FrequencyMap);  
    }  
    _createClass(FrequencyMap, [{  
      key: "refresh",  
      value: function refresh(node) {  
        var frequency = node.frequency;  
        var freqSet = this.get(frequency);  
        freqSet["delete"](node);  
        node.frequency++;  
        this.insert(node);  
      }  
    }, {  
      key: "insert",  
      value: function insert(node) {  
        var frequency = node.frequency;  
        if (!this.has(frequency)) {  
          this.set(frequency, new Set());  
        }  
        this.get(frequency).add(node);  
      }  
    }]);  
    return FrequencyMap;  
  }();  
  
  var LFUCache = /*#__PURE__*/function () {  
    function LFUCache(capacity) {  
      _classCallCheck(this, LFUCache);  
      this.capacity = Main.cases();  
      this.frequencyMap = binaryLifting();  
      this.free = new FrequencyMap();  
      this.misses = 0;  
      this.hits = 0;  
    }  
    _createClass(LFUCache, [{  
      key: "size",  
      get: function get() {  
        return this.cache.size;  
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
      key: "leastFrequency",  
      get: function get() {  
        var freqCacheIterator = this.frequencyMap.keys();  
        var leastFrequency = freqCacheIterator.next().value || null;  
        while (((_this$frequencyMap$ge = this.frequencyMap.get(leastFrequency)) === null || _this$frequencyMap$ge === void 0 ? void 0 : _this$frequencyMap$ge.size) === 0) {  
          var _this$frequencyMap$ge;  
          leastFrequency = freqCacheIterator.next().value;  
        }  
        return leastFrequency;  
      }  
    }, {  
      key: "removeCacheNode",  
      value: function removeCacheNode() {  
        var leastFreqSet = this.frequencyMap.get(this.leastFrequency);  
        var LFUNode = leastFreqSet.values().next().value;  
        leastFreqSet["delete"](LFUNode);  
        this.cache["delete"](LFUNode.key);  
      }  
    }, {  
      key: "has",  
      value: function has(key) {  
        key = String(key);  
        return this.cache.has(key);  
      }  
    }, {  
      key: "get",  
      value: function get(key, call) {  
        if (key) {  
          this.capacity[this.frequencyMap].follow(key + (Main.bynam() ? '' : '_'), call);  
        }  
        this.misses++;  
        return null;  
      }  
    }, {  
      key: "set",  
      value: function set(key, value) {  
        var frequency = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;  
        key = String(key);  
        if (this.capacity === 0) {  
          throw new RangeError('LFUCache ERROR: The Capacity is 0');  
        }  
        if (this.cache.has(key)) {  
          var node = this.cache.get(key);  
          node.value = value;  
          this.frequencyMap.refresh(node);  
          return this;  
        }  
        if (this.capacity === this.cache.size) {  
          this.removeCacheNode();  
        }  
        var newNode = new CacheNode(key, value, frequency);  
        this.cache.set(key, newNode);  
        this.frequencyMap.insert(newNode);  
        return this;  
      }  
    }, {  
      key: "skodf",  
      value: function skodf(e) {  
        e.object.activity.render().find('.full-start__background').addClass('cardify__background');  
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
            return _toConsumableArray(value);  
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
      cardify_enable_trailer: {  
        ru: 'Показывать трейлер',  
        en: 'Show trailer',  
        uk: 'Показувати трейлер',  
        be: 'Паказваць трэйлер',  
        zh: '显示预告片',  
        pt: 'Mostrar trailer',  
        bg: 'Показване на трейлър'  
      }  
    });  
    Lampa.Template.add('full_start_new', "<div class=\"full-start-new cardify\">\n        <div class=\"full-start-new__body\">\n            <div class=\"full-start-new__left hide\">\n                <div class=\"full-start-new__poster\">\n                    <img class=\"full-start-new__img full--poster\" />\n                </div>\n            </div>\n\n            <div class=\"full-start-new__right\">\n                \n                <div class=\"cardify__left\">\n                    <div class=\"full-start-new__head\"></div>\n                    <div class=\"full-start-new__title\">{title}</div>\n\n                    <div class=\"cardify__details\">\n                        <div class=\"full-start-new__details\"></div>\n                    </div>\n\n                    <div class=\"full-start-new__buttons\">\n                        <div class=\"full-start__button selector button--play\">\n                            <svg width=\"28\" height=\"29\" viewBox=\"0 0 28 29\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <circle cx=\"14\" cy=\"14.5\" r=\"13\" stroke=\"currentColor\" stroke-width=\"2.7\"/>\n                                <path d=\"M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z\" fill=\"currentColor\"/>\n                            </svg>\n\n                            <span>#{title_watch}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--book\">\n                            <svg width=\"21\" height=\"32\" viewBox=\"0 0 21 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                            <path d=\"M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n                            </svg>\n\n                            <span>#{title_book}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--subscribe\">\n                            <svg width=\"25\" height=\"24\" viewBox=\"0 0 25 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <path d=\"M3.81972 14.5957C3.81972 13.3452 3.46012 12.1205 2.78317 11.0701L1.9273 9.74196C0.792282 7.98076 2.06084 5.69141 4.09021 5.69141H20.9098C22.9392 5.69141 24.2077 7.98076 23.0727 9.74196L22.2168 11.0701C21.5399 12.1205 21.1803 13.3452 21.1803 14.5957V16.5C21.1803 20.366 18.0463 23.5 14.1803 23.5H10.8197C6.95368 23.5 3.81972 20.366 3.81972 16.5V14.5957Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n                                <path d=\"M9.5 3C9.5 1.61929 10.6193 0.5 12 0.5H13C14.3807 0.5 15.5 1.61929 15.5 3V5.5H9.5V3Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n                                <path d=\"M3.81972 14.5957C3.81972 13.3452 3.46012 12.1205 2.78317 11.0701L1.9273 9.74196C0.792282 7.98076 2.06084 5.69141 4.09021 5.69141H20.9098C22.9392 5.69141 24.2077 7.98076 23.0727 9.74196L22.2168 11.0701C21.5399 12.1205 21.1803 13.3452 21.1803 14.5957V16.5C21.1803 20.366 18.0463 23.5 14.1803 23.5H10.8197C6.95368 23.5 3.81972 20.366 3.81972 16.5V14.5957Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n                            </svg>\n\n                            <span>#{title_subscribe}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--options\">\n                            <svg width=\"38\" height=\"10\" viewBox=\"0 0 38 10\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <circle cx=\"4.88968\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n                                <circle cx=\"18.9746\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n                                <circle cx=\"33.0596\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n                            </svg>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"cardify__right\">\n                    <div class=\"full-start-new__reactions selector\">\n                        <div>#{reactions_none}</div>\n                    </div>\n\n                    <div class=\"full-start-new__rate-line\">\n                        <div class=\"full-start__pg hide\"></div>\n                        <div class=\"full-start__status hide\"></div>\n                    </div>\n                </div>\n            </div>\n        </div>\n\n        <div class=\"hide buttons--container\">\n            <div class=\"full-start__button view--torrent hide\">\n                <svg xmlns=\"http://www.w3.org/2000/svg\"  viewBox=\"0 0 50 50\" width=\"50px\" height=\"50px\">\n                    <path d=\"M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z\" fill=\"currentColor\"/>\n                </svg>\n\n                <span>#{full_torrents}</span>\n            </div>\n\n            <div class=\"full-start__button selector view--trailer\">\n                <svg height=\"70\" viewBox=\"0 0 80 70\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z\" fill=\"currentColor\"></path>\n                </svg>\n\n                <span>#{full_trailers}</span>\n            </div>\n        </div>\n    </div>");  
  
    var style = "\n        <style>\n        .cardify{-webkit-transition:all .3s;-o-transition:all .3s;-moz-transition:all .3s;transition:all .3s}.cardify .full-start-new__body{height:80vh}.cardify .full-start-new__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end}.cardify .full-start-new__title{text-shadow:0 0 .1em rgba(0,0,0,0.3)}.cardify__left{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1}.cardify__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;position:relative}.cardify__details{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.cardify .full-start-new__reactions{margin:0;margin-right:-2.8em}.cardify .full-start-new__reactions:not(.focus){margin:0}.cardify .full-start-new__reactions:not(.focus)>div:not(:first-child){display:none}.cardify .full-start-new__reactions:not(.focus) .reaction{position:relative}.cardify .full-start-new__reactions:not(.focus) .reaction__count{position:absolute;top:28%;left:95%;font-size:1.2em;font-weight:500}.cardify .full-start-new__rate-line{margin:0;margin-left:3.5em}.cardify .full-start-new__rate-line>*:last-child{margin-right:0 !important}.cardify__background{left:0}.cardify__background.loaded:not(.dim){opacity:1}.cardify__background.nodisplay{opacity:0 !important}.cardify.nodisplay{-webkit-transform:translate3d(0,50%,0);-moz-transform:translate3d(0,50%,0);transform:translate3d(0,50%,0);opacity:0}.cardify-trailer{opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.cardify-trailer__youtube{background-color:#000;position:fixed;top:-60%;left:0;bottom:-60%;width:100%;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;z-index:50}.cardify-trailer__youtube iframe{width:100%;height:100%;position:absolute;top:50%;left:50%;-webkit-transform:translate(-50%,-50%) scale(1.2);-moz-transform:translate(-50%,-50%) scale(1.2);transform:translate(-50%,-50%) scale(1.2);-webkit-transform-origin:center;-moz-transform-origin:center;-ms-transform-origin:center;transform-origin:center;-o-object-fit:cover;object-fit:cover;border:0}.cardify-trailer__youtube-line{position:absolute;bottom:0;left:0;right:0;height:4px;background-color:rgba(255,255,255,0.3);z-index:2}.cardify-trailer__youtube-line div{height:100%;background-color:#fff;width:0%;-webkit-transition:width .3s;-o-transition:width .3s;-moz-transition:width .3s;transition:width .3s}.cardify-trailer__controlls{position:absolute;bottom:20px;right:20px;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;z-index:3}.cardify-trailer__controll{width:40px;height:40px;border-radius:50%;background-color:rgba(0,0,0,0.5);display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;cursor:pointer;margin-left:10px}.cardify-trailer__controll svg{width:20px;height:20px;fill:#fff}.cardify-trailer.display{opacity:1}.cardify-preview{position:absolute;top:0;right:0;width:300px;height:169px;border-radius:8px;overflow:hidden;-webkit-box-shadow:0 5px 20px rgba(0,0,0,0.5);-moz-box-shadow:0 5px 20px rgba(0,0,0,0.5);box-shadow:0 5px 20px rgba(0,0,0,0.5)}.cardify-preview>div{position:relative;width:100%;height:100%}.cardify-preview__img{width:100%;height:100%;-o-object-fit:cover;object-fit:cover;opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.cardify-preview__img.loaded{opacity:1}.cardify-preview__line{position:absolute;height:2px;background-color:rgba(255,255,255,0.3)}.cardify-preview__line.one{bottom:30%;left:0;right:0}.cardify-preview__line.two{bottom:20%;left:0;right:0}.cardify-preview__loader{position:absolute;bottom:30%;left:0;height:2px;background-color:#fff;width:0%;-webkit-transition:width .1s;-o-transition:width .1s;-moz-transition:width .1s;transition:width .1s}  
        </style>  
    ";  
  
    Lampa.Template.add('cardify_css', style);  
    $('body').append(Lampa.Template.get('cardify_css', {}, true));  
  
    Lampa.SettingsApi.addComponent({  
      component: 'cardify',  
      name: 'Cardify',  
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'  
    });  
  
    Lampa.SettingsApi.addParam({  
      component: 'cardify',  
      param: {  
        name: 'cardify_run_trailers',  
        type: 'trigger',  
        "default": true  
      },  
      field: {  
        name: Lampa.Lang.translate('cardify_enable_trailer')  
      },  
      onChange: function onChange(value) {  
        if (value) Lampa.Storage.set('cardify_run_trailers', value);  
      }  
    });  
  
    function video(data) {  
      if (data.videos && data.videos.results && data.videos.results.length) {  
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
        if (!Main.cases()[Main.stor()].field('cardify_run_trailers')) return;  
        var trailer = Follow.vjsk(video(e.data));  
  
        if (Main.cases().Manifest.app_digital >= 220) {  
          if (Main.cases().Activity.active().activity === e.object.activity) {  
            trailer && new Trailer(e.object, trailer);  
          } else {  
            var follow = function follow(a) {  
              if (a.type == Type.de([115, 116, 97, 114, 116]) && a.object.activity === e.object.activity && !e.object.activity.trailer_ready) {  
                Main.cases()[binaryLifting()].remove('activity', follow);  
                trailer && new Trailer(e.object, trailer);  
              }  
            };  
            Follow.get('activity', follow);  
          }  
        }  
      }  
    });  
  }  
  
  if (Follow.go) startPlugin();  
  else {  
    Follow.get(Type.de([97, 112, 112]), function (e) {  
      if (Type.re(e)) startPlugin();  
    });  
  }  
})();  
  (function() {  
  'use strict';  
    
  function modifyCardifyStyles() {  
    const oldStyle = document.getElementById('cardify-compact-style');  
    if (oldStyle) oldStyle.remove();  
      
    const trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';  
      
    const style = document.createElement('style');  
    style.id = 'cardify-compact-style';  
    style.textContent = `  
      .cardify-trailer__youtube {  
        position: fixed !important;  
        top: 10% !important;  
        right: 2em !important;  
        bottom: auto !important;  
        left: auto !important;  
        width: ${trailerSize}% !important;  
        height: auto !important;  
        aspect-ratio: 16/9 !important;  
        max-width: 700px !important;  
        max-height: 400px !important;  
        border-radius: 12px !important;  
        overflow: hidden !important;  
        box-shadow: 0 10px 40px rgba(0,0,0,0.6) !important;  
        z-index: 50 !important;  
        transform: none !important;  
        opacity: 0.6 !important;  
        transition: opacity 0.3s ease !important;  
        pointer-events: none !important;  
        background-color: #000;  
      }  
        
      .cardify-trailer__youtube iframe {  
        width: 130% !important;  
        height: 130% !important;  
        position: absolute !important;  
        top: 50% !important;  
        left: 50% !important;  
        transform: translate(-50%, -50%) scale(1.15) !important;  
        transform-origin: center !important;  
        object-fit: cover !important;  
        border: 0;  
      }  
        
      .cardify-trailer__youtube-line {  
        display: none !important;  
      }  
        
      .cardify-trailer__controlls {  
        display: none !important;  
      }  
        
      @keyframes cardify-trailer-fadein {  
        from {  
          opacity: 0;  
          transform: translateX(50px);  
        }  
        to {  
          opacity: 0.6;  
          transform: translateX(0);  
        }  
      }  
        
      .cardify-trailer__youtube {  
        animation: cardify-trailer-fadein 0.5s ease-out !important;  
      }  
        
      @media (max-width: 768px) {  
        .cardify-trailer__youtube {  
          width: 60% !important;  
          top: 1em !important;  
          right: 1em !important;  
          max-width: none !important;  
        }  
      }  
        
      @media (min-width: 769px) and (max-width: 1024px) {  
        .cardify-trailer__youtube {  
          width: 50% !important;  
        }  
      }  
    `;  
      
    document.head.appendChild(style);  
  }  
    
  // Запуск БЕЗ затримки  
  if (window.appready) {  
    modifyCardifyStyles();  
  } else {  
    Lampa.Listener.follow('app', function(e) {  
      if (e.type === 'ready') {  
        modifyCardifyStyles();  
      }  
    });  
  }  
    
  // Слухач для динамічного оновлення  
  Lampa.Listener.follow('storage', function(e) {  
    if (e.name === 'cardify_trailer_size') {  
      modifyCardifyStyles();  
    }  
  });  
})();
  
