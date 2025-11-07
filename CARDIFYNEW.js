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
    throw new TypeError("Invalid attempt to spread non-iterable instance");  
  }  
  
  // Клас Player - YouTube IFrame API wrapper  
  var Player = function () {  
    function Player(element, video) {  
      _classCallCheck(this, Player);  
      this.element = element;  
      this.video = video;  
      this.player = null;  
      this.timer = null;  
      this.muted = true;  
      this.create();  
    }  
  
    _createClass(Player, [{  
      key: "create",  
      value: function create() {  
        var _this = this;  
        this.player = new YT.Player(this.element, {  
          height: '100%',  
          width: '100%',  
          videoId: this.video.id,  
          playerVars: {  
            autoplay: 1,  
            controls: 0,  
            showinfo: 0,  
            rel: 0,  
            iv_load_policy: 3,  
            modestbranding: 1,  
            mute: 1,  
            vq: 'hd1080'  
          },  
          events: {  
            onReady: function onReady(event) {  
              _this.onReady(event);  
            },  
            onStateChange: function onStateChange(event) {  
              _this.onStateChange(event);  
            }  
          }  
        });  
      }  
    }, {  
      key: "onReady",  
      value: function onReady(event) {  
        event.target.playVideo();  
      }  
    }, {  
      key: "onStateChange",  
      value: function onStateChange(event) {  
        var _this2 = this;  
        if (event.data === YT.PlayerState.PLAYING) {  
          var duration = this.player.getDuration();  
          this.timer = setInterval(function () {  
            var currentTime = _this2.player.getCurrentTime();  
            if (duration - currentTime < 5 && _this2.muted === false) {  
              var volume = _this2.player.getVolume();  
              if (volume > 0) {  
                _this2.player.setVolume(volume - 2);  
              }  
            }  
          }, 100);  
        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.BUFFERING) {  
          if (this.timer) {  
            clearInterval(this.timer);  
            this.timer = null;  
          }  
        }  
      }  
    }, {  
      key: "play",  
      value: function play() {  
        if (this.player) this.player.playVideo();  
      }  
    }, {  
      key: "pause",  
      value: function pause() {  
        if (this.player) this.player.pauseVideo();  
      }  
    }, {  
      key: "unmute",  
      value: function unmute() {  
        if (this.player) {  
          this.player.unMute();  
          this.player.setVolume(100);  
          this.muted = false;  
        }  
      }  
    }, {  
      key: "show",  
      value: function show() {  
        $(this.element).parent().removeClass('hide');  
      }  
    }, {  
      key: "hide",  
      value: function hide() {  
        $(this.element).parent().addClass('hide');  
      }  
    }]);  
  
    return Player;  
  }();  
  
  // Клас Trailer - керування життєвим циклом трейлера  
  var Trailer = function () {  
    function Trailer(object, video) {  
      _classCallCheck(this, Trailer);  
      this.object = object;  
      this.video = video;  
      this.player = null;  
      this.background = null;  
      this.startblock = null;  
      this.head = null;  
      this.preview = null;  
      this.state = 'start';  
      this.timer = null;  
      this.init();  
    }  
  
    _createClass(Trailer, [{  
      key: "init",  
      value: function init() {  
        this.background = $('.full-start__background');  
        this.startblock = $('.full-start-new');  
        this.head = $('.head');  
        this.create();  
      }  
    }, {  
      key: "create",  
      value: function create() {  
        var _this3 = this;  
        var html = $('<div class="cardify-trailer"><div class="cardify-trailer__youtube" id="cardify-player"></div><div class="cardify-trailer__preview"><img src="' + this.video.img + '"/><div class="cardify-trailer__loader"><div></div></div></div></div>');  
        this.preview = html.find('.cardify-trailer__preview');  
        this.startblock.append(html);  
          
        this.controll();  
          
        setTimeout(function () {  
          _this3.load();  
        }, Lampa.Storage.get('cardify_trailer_loaded') ? 5000 : 1200);  
      }  
    }, {  
      key: "controll",  
      value: function controll() {  
        var _this4 = this;  
        Lampa.Controller.add('cardify_trailer', {  
          toggle: function toggle() {  
            Lampa.Controller.collectionSet(_this4.startblock.find('.selector'));  
            Lampa.Controller.collectionFocus(false, _this4.startblock.find('.selector').eq(0));  
          },  
          left: function left() {  
            Lampa.Controller.toggle('full_start');  
            Lampa.Controller.trigger('left');  
          },  
          up: function up() {  
            Lampa.Controller.toggle('full_start');  
            Lampa.Controller.trigger('up');  
          },  
          down: function down() {  
            Lampa.Controller.toggle('full_start');  
            Lampa.Controller.trigger('down');  
          },  
          right: function right() {  
            Lampa.Controller.toggle('full_start');  
            Lampa.Controller.trigger('right');  
          },  
          back: function back() {  
            Lampa.Controller.toggle('full_start');  
          }  
        });  
      }  
    }, {  
      key: "load",  
      value: function load() {  
        var _this5 = this;  
        if (this.state !== 'start') return;  
        this.state = 'load';  
          
        if (!window.YT) {  
          var tag = document.createElement('script');  
          tag.src = 'https://www.youtube.com/iframe_api';  
          var firstScriptTag = document.getElementsByTagName('script')[0];  
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);  
            
          window.onYouTubeIframeAPIReady = function () {  
            _this5.start();  
          };  
        } else {  
          this.start();  
        }  
      }  
    }, {  
      key: "start",  
      value: function start() {  
        var _this6 = this;  
        if (this.state !== 'load') return;  
        this.state = 'play';  
          
        Lampa.Storage.set('cardify_trailer_loaded', true);  
          
        this.player = new Player('cardify-player', this.video);  
          
        setTimeout(function () {  
          _this6.preview.remove();  
          _this6.player.show();  
        }, 1000);  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        if (this.timer) {  
          clearTimeout(this.timer);  
          this.timer = null;  
        }  
        if (this.player) {  
          this.player.pause();  
          this.player = null;  
        }  
        $('.cardify-trailer').remove();  
        Lampa.Controller.remove('cardify_trailer');  
      }  
    }]);  
  
    return Trailer;  
  }();  
  
  // LFU Cache implementation  
  var LFUCache = function () {  
    function LFUCache() {  
      var capacity = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;  
      _classCallCheck(this, LFUCache);  
      this.capacity = capacity;  
      this.cache = new Map();  
      this.frequencyMap = new Map();  
      this.minFrequency = 0;  
      this.misses = 0;  
      this.hits = 0;  
      this.go = false;  
    }  
  
    _createClass(LFUCache, [{  
      key: "get",  
      value: function get(key, callback) {  
        if (!this.cache.has(key)) {  
          this.misses++;  
          if (callback) callback({type: 'complete', data: null});  
          return null;  
        }  
        this.hits++;  
        var node = this.cache.get(key);  
        this.updateFrequency(node);  
        if (callback) callback({type: 'complete', data: node.value});  
        return node.value;  
      }  
    }, {  
      key: "set",  
      value: function set(key, value) {  
        if (this.capacity <= 0) return;  
          
        if (this.cache.has(key)) {  
          var node = this.cache.get(key);  
          node.value = value;  
          this.updateFrequency(node);  
        } else {  
          if (this.cache.size >= this.capacity) {  
            this.evict();  
          }  
          var newNode = {key: key, value: value, frequency: 1};  
          this.cache.set(key, newNode);  
          if (!this.frequencyMap.has(1)) {  
            this.frequencyMap.set(1, new Set());  
          }  
          this.frequencyMap.get(1).add(newNode);  
          this.minFrequency = 1;  
        }  
      }  
    }, {  
      key: "updateFrequency",  
      value: function updateFrequency(node) {  
        var freq = node.frequency;  
        this.frequencyMap.get(freq)["delete"](node);  
          
        if (this.frequencyMap.get(freq).size === 0) {  
          this.frequencyMap["delete"](freq);  
          if (this.minFrequency === freq) {  
            this.minFrequency++;  
          }  
        }  
          
        node.frequency++;  
        if (!this.frequencyMap.has(node.frequency)) {  
          this.frequencyMap.set(node.frequency, new Set());  
        }  
        this.frequencyMap.get(node.frequency).add(node);  
      }  
    }, {  
      key: "evict",  
      value: function evict() {  
        var minFreqSet = this.frequencyMap.get(this.minFrequency);  
        var nodeToDelete = minFreqSet.values().next().value;  
        minFreqSet["delete"](nodeToDelete);  
          
        if (minFreqSet.size === 0) {  
          this.frequencyMap["delete"](this.minFrequency);  
        }  
          
        this.cache["delete"](nodeToDelete.key);  
      }  
    }, {  
      key: "skodf",  
      value: function skodf(e) {  
        this.go = this.un(e);  
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
      key: "un",  
      value: function un(v) {  
        return Main.bynam();  
      }  
    }]);  
  
    return LFUCache;  
  }();  
  
  var Follow = new LFUCache();  
  
  // Helper functions  
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
  
  var Main = {  
    stor: function stor() {  
      return de([83, 116, 111, 114, 97, 103, 101]);  
    },  
    cases: function cases() {  
      return window[de([76, 97, 109, 112, 97])];  
    },  
    bynam: function bynam() {  
      var hostname = window.location.hostname;  
      return hostname.indexOf(de([98, 121, 108, 97, 109, 112, 97, 46, 111, 110, 108, 105, 110, 101])) === -1;  
    }  
  };  
  
  // Клас Player для YouTube IFrame API  
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
            fs: 0,  
            iv_load_policy: 3,  
            modestbranding: 1,  
            playsinline: 1,  
            rel: 0,  
            showinfo: 0,  
            mute: 1,  
            hd: 1,  
            vq: 'hd1080'  
          },  
          events: {  
            onReady: function onReady(event) {  
              _this.ready = true;  
              if (_this.options.onReady) _this.options.onReady(event);  
            },  
            onStateChange: function onStateChange(event) {  
              _this.state = event.data;  
                
              if (event.data === YT.PlayerState.PLAYING) {  
                var duration = _this.player.getDuration();  
                if (duration > 5) {  
                  _this.startFadeOut(duration);  
                }  
              }  
                
              if (_this.options.onStateChange) _this.options.onStateChange(event);  
            }  
          }  
        });  
      }  
    }, {  
      key: "startFadeOut",  
      value: function startFadeOut(duration) {  
        var _this2 = this;  
          
        if (this.fadeInterval) clearInterval(this.fadeInterval);  
          
        var fadeStart = (duration - 5) * 1000;  
          
        setTimeout(function () {  
          var volume = 100;  
          _this2.fadeInterval = setInterval(function () {  
            volume -= 2;  
            if (volume <= 0) {  
              clearInterval(_this2.fadeInterval);  
              _this2.player.mute();  
            } else {  
              _this2.player.setVolume(volume);  
            }  
          }, 100);  
        }, fadeStart);  
      }  
    }, {  
      key: "play",  
      value: function play() {  
        if (this.player && this.ready) this.player.playVideo();  
      }  
    }, {  
      key: "pause",  
      value: function pause() {  
        if (this.player && this.ready) this.player.pauseVideo();  
      }  
    }, {  
      key: "unmute",  
      value: function unmute() {  
        if (this.player && this.ready) {  
          this.player.unMute();  
          this.player.setVolume(100);  
        }  
      }  
    }, {  
      key: "show",  
      value: function show() {  
        $(this.element).parent().show();  
      }  
    }, {  
      key: "hide",  
      value: function hide() {  
        $(this.element).parent().hide();  
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
  
  // Клас Trailer для керування життєвим циклом трейлера  
  var Trailer = /*#__PURE__*/function () {  
    function Trailer(object, trailer) {  
      _classCallCheck(this, Trailer);  
        
      this.object = object;  
      this.trailer = trailer;  
      this.player = null;  
      this.html = null;  
      this.state = 'start';  
      this.timer = null;  
      this.firstTime = true;  
    }  
  
    _createClass(Trailer, [{  
      key: "create",  
      value: function create() {  
        var _this3 = this;  
          
        this.html = $('<div class="cardify-trailer">\  
          <div class="cardify-trailer__preview">\  
            <img src="' + this.trailer.img + '" />\  
            <div class="cardify-trailer__progress"></div>\  
          </div>\  
          <div class="cardify-trailer__youtube"></div>\  
        </div>');  
          
        this.html.appendTo('body');  
          
        this.start();  
      }  
    }, {  
      key: "start",  
      value: function start() {  
        var _this4 = this;  
          
        this.state = 'start';  
          
        var delay = this.firstTime ? 1200 : 5000;  
        this.firstTime = false;  
          
        this.timer = setTimeout(function () {  
          _this4.load();  
        }, delay);  
          
        this.controll();  
      }  
    }, {  
      key: "load",  
      value: function load() {  
        var _this5 = this;  
          
        this.state = 'load';  
          
        if (!window.YT) {  
          var tag = document.createElement('script');  
          tag.src = 'https://www.youtube.com/iframe_api';  
          document.head.appendChild(tag);  
            
          window.onYouTubeIframeAPIReady = function () {  
            _this5.play();  
          };  
        } else {  
          this.play();  
        }  
      }  
    }, {  
      key: "play",  
      value: function play() {  
        var _this6 = this;  
          
        this.state = 'play';  
          
        this.player = new Player(this.html.find('.cardify-trailer__youtube')[0], {  
          videoId: this.trailer.id,  
          onReady: function onReady() {  
            _this6.html.find('.cardify-trailer__preview').fadeOut(300);  
            _this6.player.play();  
          },  
          onStateChange: function onStateChange(event) {  
            if (event.data === YT.PlayerState.ENDED) {  
              _this6.hide();  
            }  
          }  
        });  
          
        this.player.create();  
      }  
    }, {  
      key: "hide",  
      value: function hide() {  
        this.state = 'hide';  
        if (this.html) this.html.fadeOut(300);  
        if (this.player) this.player.destroy();  
      }  
    }, {  
      key: "controll",  
      value: function controll() {  
        var _this7 = this;  
          
        Lampa.Controller.add('cardify_trailer', {  
          toggle: function toggle() {  
            Lampa.Controller.collectionSet(_this7.html);  
            Lampa.Controller.collectionFocus(false, _this7.html);  
          },  
          left: function left() {  
            Lampa.Controller.toggle('full_start');  
            Lampa.Controller.trigger('left');  
          },  
          right: function right() {  
            Lampa.Controller.toggle('full_start');  
            Lampa.Controller.trigger('right');  
          },  
          up: function up() {  
            Lampa.Controller.toggle('full_start');  
            Lampa.Controller.trigger('up');  
          },  
          down: function down() {  
            Lampa.Controller.toggle('full_start');  
            Lampa.Controller.trigger('down');  
          },  
          back: function back() {  
            Lampa.Controller.toggle('full_start');  
          }  
        });  
          
        Lampa.Controller.toggle('cardify_trailer');  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        if (this.timer) clearTimeout(this.timer);  
        if (this.player) this.player.destroy();  
        if (this.html) this.html.remove();  
        Lampa.Controller.remove('cardify_trailer');  
      }  
    }]);  
  
    return Trailer;  
  }();  
  
  // Функція для отримання відео з TMDB  
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
  
  // Ініціалізація плагіна  
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
      
    // Додавання CSS стилів  
    var style = "<style>\n        .cardify-trailer {\n            position: fixed;\n            top: 0;\n            left: 0;\n            right: 0;\n            bottom: 0;\n            z-index: 100;\n            display: none;\n        }\n        \n        .cardify-trailer__preview {\n            position: absolute;\n            top: 45%;\n            right: 0.5em;\n            width: 45%;\n            max-width: 700px;\n            border-radius: 12px;\n            overflow: hidden;\n            background: #000;\n        }\n        \n        .cardify-trailer__preview img {\n            width: 100%;\n            display: block;\n        }\n        \n        .cardify-trailer__progress {\n            position: absolute;\n            bottom: 0;\n            left: 0;\n            right: 0;\n            height: 4px;\n            background: rgba(255,255,255,0.3);\n            animation: progress 2s linear infinite;\n        }\n        \n        @keyframes progress {\n            0% { width: 0%; }\n            100% { width: 100%; }\n        }\n    </style>";  
      
    Lampa.Template.add('cardify_css', style);  
    $('body').append(Lampa.Template.get('cardify_css', {}, true));  
      
    // Додавання компонента налаштувань  
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
      
    Lampa.SettingsApi.addParam({  
      component: 'cardify',  
      param: {  
        name: 'cardify_trailer_size',  
        type: 'select',  
        "default": '45',  
        values: {  
          '35': '35% (малий)',  
          '45': '45% (середній)',  
          '55': '55% (великий)',  
          '65': '65% (дуже великий)'  
        }  
      },  
      field: {  
        name: 'Розмір трейлера'  
      }  
    });  
  }  
  
  // Логіка запуску трейлерів  
  Follow.get(Type.de([102, 117, 108, 108]), function (e) {  
    if (Type.co(e)) {  
      Follow.skodf(e);  
      if (!Main.cases()[Main.stor()].field('cardify_run_trailers')) return;  
      var trailer = Follow.vjsk(video(e.data));  
        
      if (Main.cases().Manifest.app_digital >= 220) {  
        if (Main.cases().Activity.active().activity === e.object.activity) {  
          trailer && new Trailer(e.object, trailer);  
        }  
      }  
    }  
  });  
  
  if (Follow.go) startPlugin();  
  else {  
    Follow.get(Type.de([97, 112, 112]), function (e) {  
      if (Type.re(e)) startPlugin();  
    });  
  }  
  
})();  
  
// МОДИФІКАЦІЯ СТИЛІВ З РАДІАЛЬНОЮ МАСКОЮ  
(function() {    
  'use strict';    
      
  function modifyCardifyStyles() {    
    const oldStyle = document.getElementById('cardify-compact-style');    
if (oldStyle) oldStyle.remove();    
        
    const trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';    
    console.log('[Cardify] Застосування розміру:', trailerSize + '%');    
        
    const style = document.createElement('style');    
    style.id = 'cardify-compact-style';    
        
    style.textContent = `    
      .cardify-trailer__youtube.size-35 { width: 35% !important; }    
      .cardify-trailer__youtube.size-45 { width: 45% !important; }    
      .cardify-trailer__youtube.size-55 { width: 55% !important; }    
      .cardify-trailer__youtube.size-65 { width: 65% !important; }    
          
      .cardify-trailer__youtube {    
        position: fixed !important;    
        top: 45% !important;    
        right: 0.5em !important;    
        bottom: auto !important;    
        left: auto !important;    
        height: auto !important;    
        aspect-ratio: 16/9 !important;    
        max-width: 700px !important;    
        max-height: 400px !important;    
        border-radius: 12px !important;    
        overflow: hidden !important;    
          
        /* Розмитий контур замість чіткої рамки */  
        box-shadow:   
          0 0 60px 30px rgba(0,0,0,0.8),  
          0 0 120px 60px rgba(0,0,0,0.6),  
          0 0 180px 90px rgba(0,0,0,0.4) !important;  
          
        /* Градієнтна маска для плавного переходу по краях */  
        -webkit-mask-image: radial-gradient(ellipse 100% 100% at center,   
          black 40%,   
          rgba(0,0,0,0.8) 60%,   
          rgba(0,0,0,0.4) 80%,   
          transparent 100%) !important;  
        mask-image: radial-gradient(ellipse 100% 100% at center,   
          black 40%,   
          rgba(0,0,0,0.8) 60%,   
          rgba(0,0,0,0.4) 80%,   
          transparent 100%) !important;  
      }  
    `;    
        
    document.head.appendChild(style);    
        
    // Застосувати клас розміру до існуючих трейлерів    
    const existingTrailers = document.querySelectorAll('.cardify-trailer__youtube');    
    existingTrailers.forEach(el => {    
      el.className = el.className.replace(/size-\d+/g, '');    
      el.classList.add('size-' + trailerSize);    
    });    
  }    
      
  // MutationObserver для відстеження нових трейлерів    
  const observer = new MutationObserver((mutations) => {    
    const trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';    
        
    mutations.forEach((mutation) => {    
      mutation.addedNodes.forEach((node) => {    
        if (node.nodeType === 1) {    
          if (node.classList && node.classList.contains('cardify-trailer__youtube')) {    
            node.className = node.className.replace(/size-\d+/g, '');    
            node.classList.add('size-' + trailerSize);    
            console.log('[Cardify] Додано клас size-' + trailerSize + ' до нового трейлера');    
          }    
              
          const trailers = node.querySelectorAll('.cardify-trailer__youtube');    
          trailers.forEach(el => {    
            el.className = el.className.replace(/size-\d+/g, '');    
            el.classList.add('size-' + trailerSize);    
          });    
        }    
      });    
    });    
  });    
      
  observer.observe(document.body, {    
    childList: true,    
    subtree: true    
  });    
      
  // Застосувати стилі при завантаженні    
  if (window.appready) {    
    setTimeout(modifyCardifyStyles, 1000);    
  } else {    
    Lampa.Listener.follow('app', function(e) {    
      if (e.type === 'ready') {    
        setTimeout(modifyCardifyStyles, 1000);    
      }    
    });    
  }    
      
  // Слухач події storage для динамічного оновлення розміру    
  Lampa.Listener.follow('storage', function(e) {    
    if (e.name === 'cardify_trailer_size') {    
      console.log('[Cardify] Розмір змінено на:', e.value);    
      modifyCardifyStyles();    
    }    
  });    
})();
