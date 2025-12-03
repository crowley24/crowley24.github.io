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
  
  // Babel polyfills for arrays  
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
  
  // LFU Cache implementation  
  var LFUCache = /*#__PURE__*/function () {  
    function LFUCache(capacity) {  
      _classCallCheck(this, LFUCache);  
      this.capacity = capacity;  
      this.cache = new Map();  
      this.frequencyMap = new Map();  
      this.minFrequency = 0;  
    }  
  
    _createClass(LFUCache, [{  
      key: "get",  
      value: function get(key) {  
        if (!this.cache.has(key)) return null;  
        var value = this.cache.get(key);  
        this._updateFrequency(key);  
        return value;  
      }  
    }, {  
      key: "put",  
      value: function put(key, value) {  
        if (this.capacity === 0) return;  
        if (this.cache.has(key)) {  
          this.cache.set(key, value);  
          this._updateFrequency(key);  
          return;  
        }  
        if (this.cache.size >= this.capacity) {  
          this._evict();  
        }  
        this.cache.set(key, value);  
        this.frequencyMap.set(key, 1);  
        this.minFrequency = 1;  
      }  
    }, {  
      key: "_updateFrequency",  
      value: function _updateFrequency(key) {  
        var frequency = this.frequencyMap.get(key);  
        this.frequencyMap.set(key, frequency + 1);  
        if (frequency === this.minFrequency && this._getFrequencyCount(frequency) === 0) {  
          this.minFrequency++;  
        }  
      }  
    }, {  
      key: "_evict",  
      value: function _evict() {  
        var _this = this;  
        var keys = Array.from(this.frequencyMap.keys()).filter(function (key) {  
          return _this.frequencyMap.get(key) === _this.minFrequency;  
        });  
        var evictKey = keys[0];  
        this.cache.delete(evictKey);  
        this.frequencyMap.delete(evictKey);  
      }  
    }, {  
      key: "_getFrequencyCount",  
      value: function _getFrequencyCount(frequency) {  
        var count = 0;  
        this.frequencyMap.forEach(function (freq) {  
          if (freq === frequency) count++;  
        });  
        return count;  
      }  
    }]);  
  
    return LFUCache;  
  }();  
  
  // State Machine  
  var State = /*#__PURE__*/function () {  
    function State() {  
      _classCallCheck(this, State);  
      this.transitions = {};  
      this.currentState = null;  
    }  
  
    _createClass(State, [{  
      key: "addTransition",  
      value: function addTransition(state, action, nextState) {  
        if (!this.transitions[state]) this.transitions[state] = {};  
        this.transitions[state][action] = nextState;  
      }  
    }, {  
      key: "start",  
      value: function start(initialState) {  
        this.currentState = initialState;  
      }  
    }, {  
      key: "dispatch",  
      value: function dispatch(action) {  
        if (this.currentState && this.transitions[this.currentState] && this.transitions[this.currentState][action]) {  
          this.currentState = this.transitions[this.currentState][action];  
          return true;  
        }  
        return false;  
      }  
    }]);  
  
    return State;  
  }();  
  
  // YouTube Player class  
  var Player = /*#__PURE__*/function () {  
    function Player(element, options) {  
      _classCallCheck(this, Player);  
      this.element = element;  
      this.options = options;  
      this.player = null;  
      this.ready = false;  
      this.state = null;  
      this.fadeInterval = null;  
    }  
  
    _createClass(Player, [{  
      key: "create",  
      value: function create() {  
        var _this = this;  
        this.player = new YT.Player(this.element, {  
          videoId: this.options.videoId,  
          playerVars: {  
            autoplay: 1,  
            controls: 0,  
            disablekb: 1,  
            enablejsapi: 1,  
            fs: 0,  
            loop: 1,  
            modestbranding: 1,  
            rel: 0,  
            showinfo: 0,  
            iv_load_policy: 3,  
            cc_load_policy: 0,  
            playsinline: 1,  
            mute: Lampa.Storage.field('cardify_enable_sound') ? 0 : 1,  
            start: this.options.start || 0,  
            end: this.options.end || 0  
          },  
          events: {  
            onReady: function onReady() {  
              _this.ready = true;  
              _this.player.setPlaybackQuality('hd1080');  
              _this.player.playVideo();  
              _this.startFadeOut();  
            },  
            onStateChange: function onStateChange(event) {  
              if (event.data === YT.PlayerState.ENDED) {  
                _this.player.playVideo();  
              }  
            }  
          }  
        });  
      }  
    }, {  
      key: "startFadeOut",  
      value: function startFadeOut() {  
        var _this2 = this;  
        var duration = this.player.getDuration();  
        var fadeOutTime = duration - 5;  
        this.fadeInterval = setInterval(function () {  
          var currentTime = _this2.player.getCurrentTime();  
          if (currentTime >= fadeOutTime) {  
            _this2.fadeOut();  
            clearInterval(_this2.fadeInterval);  
          }  
        }, 1000);  
      }  
    }, {  
      key: "fadeOut",  
      value: function fadeOut() {  
        var _this3 = this;  
        var fadeSteps = 50;  
        var currentStep = 0;  
        var fadeInterval = setInterval(function () {  
          if (currentStep >= fadeSteps) {  
            clearInterval(fadeInterval);  
            _this3.player.destroy();  
            return;  
          }  
          _this3.player.setVolume(Math.max(0, 100 - currentStep * 2));  
          currentStep++;  
        }, 100);  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        if (this.fadeInterval) clearInterval(this.fadeInterval);  
        if (this.player) this.player.destroy();  
      }  
    }]);  
  
    return Player;  
  }();  
  
  // Trailer class  
  var Trailer = /*#__PURE__*/function () {  
    function Trailer(activity, data) {  
      _classCallCheck(this, Trailer);  
      this.activity = activity;  
      this.data = data;  
      this.player = null;  
      this.state = new State();  
      this.setupStates();  
      this.create();  
    }  
  
    _createClass(Trailer, [{  
      key: "setupStates",  
      value: function setupStates() {  
        this.state.addTransition('loading', 'ready', 'playing');  
        this.state.addTransition('playing', 'complete', 'finished');  
        this.state.start('loading');  
      }  
    }, {  
      key: "create",  
      value: function create() {  
        var _this4 = this;  
        var container = Lampa.Template.get('cardify_trailer');  
        var youtube = container.find('.cardify-trailer__youtube');  
          
        youtube.attr('id', 'cardify-trailer-' + Date.now());  
        this.player = new Player(youtube[0], {  
          videoId: this.data.id,  
          start: this.data.start || 0,  
          end: this.data.end || 0  
        });  
          
        this.player.create();  
          
        setTimeout(function () {  
          _this4.state.dispatch('ready');  
        }, 1000);  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        if (this.player) this.player.destroy();  
      }  
    }]);  
  
    return Trailer;  
  }();  
  
  // Utility functions  
  var Main = {  
    stor: function stor() {  
      return 'Storage';  
    },  
    cases: function cases() {  
      return window['Lampa'];  
    },  
    bynam: function bynam() {  
      var hostname = window.location.hostname;  
      return hostname.indexOf('bylampa.online') === -1;  
    }  
  };  
  
  var Type = {  
    re: function re(e) {  
      return e.type == 'ready';  
    },  
    co: function co(e) {  
      return e.type == 'complete';  
    },  
    de: function de(n) {  
      return String.fromCharCode.apply(null, n);  
    }  
  };  
  
  // Add trailer button function  
  function addTrailerButton(activityObject, trailerData) {  
    var buttonContainer = $('.full-start__buttons');  
    var trailerButton = Lampa.Template.get('cardify_button');  
      
    trailerButton.on('hover:enter', function() {  
      new Trailer(activityObject, trailerData);  
    });  
      
    buttonContainer.append(trailerButton);  
  }  
  
  // Video function to get trailer data  
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
        return n.code === Lampa.Storage.get('language') || n.code === 'uk';  
      });  
      if (my_lang.length) items = my_lang;  
      return items[0];  
    }  
    return null;  
  }  
  
  // Start plugin function  
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
      
    Lampa.Template.add('cardify_button', "<div class=\"full-start__button selector view--online cardify--button\" data-subtitle=\"Відтворити трейлер\">\n        <svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 392.697 392.697\" xml:space=\"preserve\">\n            <path d=\"M21.837,83.419l36.496,16.678L227.72,19.886c1.229-0.592,2.002-1.846,1.98-3.209c-0.021-1.365-0.834-2.592-2.082-3.145\n                L197.766,0.3c-0.903-0.4-1.933-0.4-2.837,0L21.873,77.036c-1.259,0.559-2.073,1.803-2.081,3.18\n                C19.784,81.593,20.584,82.847,21.837,83.419z\" fill=\"currentColor\"></path>\n            <path d=\"M185.689,177.261l-64.988-30.01v91.617c0,0.856-0.44,1.655-1.167,2.114c-0.4,0.247-0.856,0.373-1.313,0.373\n                c-0.381,0-0.764-0.087-1.115-0.265l-36.496-18.248c-0.816-0.408-1.332-1.24-1.332-2.158V75.466c0-0.856,0.44-1.655,1.167-2.114\n                c0.727-0.459,1.642-0.506,2.413-0.123l138.437,69.218c0.816,0.408,1.332,1.24,1.332,2.158v30.456H185.689z\" fill=\"currentColor\"></path>\n        </svg>\n\n        <span>Відтворити трейлер</span>\n    </div>");  
      
    Lampa.Template.add('cardify_trailer', "<div class=\"cardify-trailer__youtube size-40\"></div>");  
      
    Lampa.SettingsApi.addParam({  
      component: 'cardify',  
      param: {  
        name: 'cardify_enable_sound',  
        type: 'trigger',  
        "default": false  
      },  
      field: {  
        name: Lampa.Lang.translate('cardify_enable_sound')  
      }  
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
  
    Lampa.SettingsApi.addParam({          
      component: 'cardify',          
      param: {          
        name: 'cardify_trailer_size',          
        type: 'select',          
        "default": '40',        
        values: {          
          '35': 'малий',          
          '40': 'середній',          
          '45': 'великий'          
        }          
      },        
      field: {        
        name: 'Розмір трейлера'        
      }        
    });  
  
    // Modified Follow.get to add button instead of auto-play  
    Lampa.Listener.follow('full', function (e) {  
      if (e.type === 'complite') {  
        var trailer = video(e.data);  
        if (trailer) {  
          // Store trailer data for button use  
          e.data.cardify_trailer = trailer;  
            
          // Add trailer button  
          addTrailerButton(e.object, trailer);  
        }  
      }  
    });  
  }  
 // Initialize plugin  
  if (window.Lampa && Lampa.Listener) {  
    startPlugin();  
  } else {  
    setTimeout(startPlugin, 1000);  
  }  
})();  
  
// Додатковий блок для керування трейлером  
(function() {  
  'use strict';  
    
  let trailerMuted = false;  
    
  function setupTrailerControls() {  
    const trailers = document.querySelectorAll('.cardify-trailer__youtube iframe');  
      
    trailers.forEach(trailer => {  
      if (trailer.dataset.controlsSetup) return;  
      trailer.dataset.controlsSetup = 'true';  
        
      // Обробник кліку для вимкнення звуку  
      trailer.addEventListener('click', function(e) {  
        e.stopPropagation();  
          
        if (trailer && !trailerMuted) {  
          // Перше натискання - вимкнути звук  
          const src = trailer.src;  
          if (src.includes('mute=0')) {  
            trailer.src = src.replace('mute=0', 'mute=1');  
          }  
          trailerMuted = true;  
            
          console.log('[Cardify] Звук трейлера вимкнено');  
          return false;  
        } else if (trailer && trailerMuted) {  
          // Друге натискання - дозволити вихід з картки  
          trailerMuted = false;  
          console.log('[Cardify] Вихід з картки фільму');  
        }  
      });  
    });  
  }  
    
  // Спостерігач за змінами DOM  
  const trailerObserver = new MutationObserver(() => {  
    trailerMuted = false;  
    setupTrailerControls();  
  });  
    
  trailerObserver.observe(document.body, {  
    childList: true,  
    subtree: true  
  });  
    
  // Ініціалізація при завантаженні  
  if (window.appready) {  
    setTimeout(setupTrailerControls, 1500);  
  } else {  
    Lampa.Listener.follow('app', function(e) {  
      if (e.type === 'ready') {  
        setTimeout(setupTrailerControls, 1500);  
      }  
    });  
  }  
})();
