(function () {  
  'use strict';  
  
  // Babel polyfills  
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
  
  function _nonIterableSpread() {  
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");  
  }  
  
  function _unsupportedIterableToArray(o, minLen) {  
    if (!o) return;  
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);  
    var n = Object.prototype.toString.call(o).slice(8, -1);  
    if (n === "Object" && o.constructor) n = o.constructor.name;  
    if (n === "Map" || n === "Set") return Array.from(o);  
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);  
  }  
  
  function _iterableToArray(iter) {  
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);  
  }  
  
  function _arrayWithoutHoles(arr) {  
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);  
  }  
  
  function _arrayLikeToArray(arr, len) {  
    if (len == null || len > arr.length) len = arr.length;  
    for (var i = 0, arr2 = new Array(len); i < len; i++) {  
      arr2[i] = arr[i];  
    }  
    return arr2;  
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
          e: function (e) {  
            throw e;  
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
      e: function (e) {  
        didErr = true;  
        err = e;  
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
  
  // Utility functions  
  function decodeNumbersToString(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function kthAncestor(node, k, connections, up, root) {  
    if (!node) return root;  
    if (k >= connections.size) {  
      return root;  
    }  
    for (var i = 0; i < Math.log2(connections.size); i++) {  
      if ((k & (1 << i))) {  
        node = up.get(node).get(i);  
      }  
    }  
    return node;  
  }  
  
  function lisen() {  
    return decodeNumbersToString([76, 105, 115, 116, 101, 110, 101, 114]);  
  }  
  
  function binaryLifting(root, tree) {  
    var graphObject = [3];  
    var ancestors = [];  
    for (var i = 0; i < graphObject.length; i++) {  
      ancestors.push(lisen());  
    }  
    return ancestors;  
  }  
  
  // Type checking utilities  
  var Type = {  
    de: function (numbers) {  
      return decodeNumbersToString(numbers);  
    },  
    re: function (e) {  
      return e && e.type === 'appready';  
    },  
    co: function (e) {  
      return e && e.type === 'complete';  
    }  
  };  
  
  // LFU Cache implementation  
  var FrequencyMap = function () {  
    function FrequencyMap() {  
      _classCallCheck(this, FrequencyMap);  
      this.map = new Map();  
      this.freqMap = new Map();  
      this.minFreq = 0;  
    }  
  
    _createClass(FrequencyMap, [{  
      key: "get",  
      value: function get(key) {  
        if (!this.map.has(key)) return undefined;  
        var value = this.map.get(key);  
        this.increaseFreq(key);  
        return value;  
      }  
    }, {  
      key: "put",  
      value: function put(key, value) {  
        if (this.map.has(key)) {  
          this.map.set(key, value);  
          this.increaseFreq(key);  
        } else {  
          this.map.set(key, value);  
          this.freqMap.set(key, 1);  
          this.minFreq = 1;  
        }  
      }  
    }, {  
      key: "increaseFreq",  
      value: function increaseFreq(key) {  
        var freq = this.freqMap.get(key);  
        this.freqMap.set(key, freq + 1);  
        if (freq === this.minFreq && this.getKeysWithFreq(freq).length === 1) {  
          this.minFreq++;  
        }  
      }  
    }, {  
      key: "getKeysWithFreq",  
      value: function getKeysWithFreq(freq) {  
        var keys = [];  
        this.freqMap.forEach(function (value, key) {  
          if (value === freq) keys.push(key);  
        });  
        return keys;  
      }  
    }]);  
  
    return FrequencyMap;  
  }();  
  
  var LFUCache = function () {  
    function LFUCache(capacity) {  
      _classCallCheck(this, LFUCache);  
      this.capacity = capacity;  
      this.size = 0;  
      this.minFreq = 0;  
      this.keyToVal = new Map();  
      this.keyToFreq = new Map();  
      this.freqToKeys = new Map();  
    }  
  
    _createClass(LFUCache, [{  
      key: "get",  
      value: function get(key) {  
        if (!this.keyToVal.has(key)) return -1;  
        this.increaseFreq(key);  
        return this.keyToVal.get(key);  
      }  
    }, {  
      key: "put",  
      value: function put(key, value) {  
        if (this.capacity === 0) return;  
        if (this.keyToVal.has(key)) {  
          this.keyToVal.set(key, value);  
          this.increaseFreq(key);  
          return;  
        }  
        if (this.size >= this.capacity) {  
          this.removeMinFreqKey();  
        }  
        this.keyToVal.set(key, value);  
        this.keyToFreq.set(key, 1);  
        this.freqToKeys.set(1, (this.freqToKeys.get(1) || new Set()).add(key));  
        this.minFreq = 1;  
        this.size++;  
      }  
    }, {  
      key: "increaseFreq",  
      value: function increaseFreq(key) {  
        var freq = this.keyToFreq.get(key);  
        this.keyToFreq.set(key, freq + 1);  
        this.freqToKeys.get(freq).delete(key);  
        this.freqToKeys.set(freq + 1, (this.freqToKeys.get(freq + 1) || new Set()).add(key));  
        if (freq === this.minFreq && this.freqToKeys.get(freq).size === 0) {  
          this.minFreq++;  
        }  
      }  
    }, {  
      key: "removeMinFreqKey",  
      value: function removeMinFreqKey() {  
        var keySet = this.freqToKeys.get(this.minFreq);  
        var deleteKey = keySet.values().next().value;  
        keySet.delete(deleteKey);  
        this.keyToVal.delete(deleteKey);  
        this.keyToFreq.delete(deleteKey);  
        this.size--;  
      }  
    }]);  
  
    return LFUCache;  
  }();  
  
  // Global Follow object for caching  
  var Follow = new LFUCache(100);  
  
  // State Machine implementation  
  var State = function () {  
    function State() {  
      _classCallCheck(this, State);  
      this.currentState = null;  
      this.transitions = new Map();  
    }  
  
    _createClass(State, [{  
      key: "addTransition",  
      value: function addTransition(from, to, action) {  
        if (!this.transitions.has(from)) {  
          this.transitions.set(from, new Map());  
        }  
        this.transitions.get(from).set(action, to);  
      }  
    }, {  
      key: "dispath",  
      value: function dispath(action) {  
        if (this.currentState && this.transitions.has(this.currentState)) {  
          var nextState = this.transitions.get(this.currentState).get(action);  
          if (nextState) {  
            this.currentState = nextState;  
            return true;  
          }  
        }  
        return false;  
      }  
    }, {  
      key: "start",  
      value: function start(initialState) {  
        this.currentState = initialState;  
      }  
    }]);  
  
    return State;  
  }();  
  
  // YouTube Player implementation  
  var Player = function () {  
    function Player(object, trailer) {  
      _classCallCheck(this, Player);  
      this.object = object;  
      this.trailer = trailer;  
      this.player = null;  
      this.state = new State();  
      this.setupStateMachine();  
    }  
  
    _createClass(Player, [{  
      key: "setupStateMachine",  
      value: function setupStateMachine() {  
        this.state.addTransition('idle', 'loading', 'play');  
        this.state.addTransition('loading', 'playing', 'ready');  
        this.state.addTransition('playing', 'paused', 'pause');  
        this.state.addTransition('paused', 'playing', 'play');  
        this.state.addTransition('playing', 'stopped', 'stop');  
        this.state.addTransition('paused', 'stopped', 'stop');  
        this.state.addTransition('stopped', 'idle', 'reset');  
        this.state.start('idle');  
      }  
    }, {  
      key: "init",  
      value: function init() {  
        var self = this;  
        if (typeof YT !== 'undefined' && YT.Player) {  
          this.player = new YT.Player('cardify-player', {  
            height: '390',  
            width: '640',  
            videoId: this.trailer.id,  
            events: {  
              'onReady': function (event) {  
                self.state.dispath('ready');  
                event.target.playVideo();  
              },  
              'onStateChange': function (event) {  
                if (event.data === YT.PlayerState.PLAYING) {  
                  self.state.dispath('play');  
                } else if (event.data === YT.PlayerState.PAUSED) {  
                  self.state.dispath('pause');  
                } else if (event.data === YT.PlayerState.ENDED) {  
                  self.state.dispath('stop');  
                }  
              }  
            }  
          });  
        }  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        if (this.player) {  
          this.player.destroy();  
          this.player = null;  
        }  
      }  
    }]);  
  
    return Player;  
  }();  
  
  // Trailer manager  
  var Trailer = function () {  
    function Trailer(object, trailer) {  
      _classCallCheck(this, Trailer);  
      this.object = object;  
      this.trailer = trailer;  
      this.player = null;  
      this.container = null;  
      this.init();  
    }  
  
    _createClass(Trailer, [{  
      key: "init",  
      value: function init() {  
        this.createContainer();  
        this.loadYouTubeAPI();  
      }  
    }, {  
      key: "createContainer",  
      value: function createContainer() {  
        this.container = $('<div class="cardify-trailer-container"></div>');  
        this.container.append('<div id="cardify-player"></div>');  
        this.object.activity.render().append(this.container);  
      }  
    }, {  
      key: "loadYouTubeAPI",  
      value: function loadYouTubeAPI() {  
        var self = this;  
        if (typeof YT === 'undefined') {  
          var tag = document.createElement('script');  
          tag.src = 'https://www.youtube.com/iframe_api';  
          var firstScriptTag = document.getElementsByTagName('script')[0];  
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);  
          window.onYouTubeIframeAPIReady = function () {  
            self.player = new Player(self.object, self.trailer);  
            self.player.init();  
          };  
        } else {  
          this.player = new Player(this.object, this.trailer);  
          this.player.init();  
        }  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        if (this.player) {  
          this.player.destroy();  
        }  
        if (this.container) {  
          this.container.remove();  
        }  
      }  
    }]);  
  
    return Trailer;  
  }();  
  
  // Main plugin implementation  
  var Main = {  
    cases: function () {  
      return {  
        Manifest: { app_digital: 220 },  
        Activity: {  
          active: function () {  
            return { activity: {} };  
          }  
        }  
      };  
    },  
    stor: function () {  
      return {};  
    }  
  };  
  
  // Video processing function  
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
        return n.code === 'uk';  
      });  
      if (my_lang.length) {  
        return my_lang[0];  
      }  
      var en_lang = items.filter(function (n) {  
        return n.code === 'en';  
      });  
      if (en_lang.length) {  
        return en_lang[0];  
      }  
      return items[0];  
    }  
    return null;  
  }  
  
  // Add trailer button function  
  function addTrailerButton(activityObject, trailerData) {  
    var buttonHtml = '<div class="full-start__button selector cardify-trailer-button">' +  
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none">' +  
        '<path d="M8 5v14l11-7z" fill="currentColor"/>' +  
        '</svg> Трейлер' +  
        '</div>';  
      
    var button = $(buttonHtml);  
      
    $('.full-start__buttons').append(button);  
      
    button.on('click', function () {  
      new Trailer(activityObject, trailerData);  
    });  
  }  
  
  // Plugin initialization  
  function startPlugin() {  
    console.log('Cardify: Запуск плагина...');  
      
    Follow.get(Type.de([102, 117, 108, 108]), function (e) {  
      if (Type.co(e)) {  
        Follow.skodf(e);  
        if (!Main.cases()[Main.stor()].field('cardify_run_trailers')) return;  
        var trailer = Follow.vjsk(video(e.data));  
        if (trailer) {  
          e.object.cardify_trailer = trailer;  
          addTrailerButton(e.object, trailer);  
        }  
      }  
    });  
  }  
  
   // Initialize plugin  
  if (Follow.go) {  
    console.log('Cardify: Приложение готово, запуск плагина...');  
    startPlugin();  
  } else {  
    Follow.get(Type.de([97, 112, 112]), function (e) {  
      if (Type.re(e)) {  
        console.log('Cardify: Событие appready, запуск плагина...');  
        startPlugin();  
      }  
    });  
  }  
})();
