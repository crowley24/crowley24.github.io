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
  
  function _inherits(subClass, superClass) {  
    if (typeof superClass !== "function" && superClass !== null) {  
      throw new TypeError("Super expression must either be null or a function");  
    }  
    subClass.prototype = Object.create(superClass && superClass.prototype, {  
      constructor: { value: subClass, writable: true, configurable: true }  
    });  
    if (superClass) _setPrototypeOf(subClass, superClass);  
  }  
  
  function _setPrototypeOf(o, p) {  
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {  
      o.__proto__ = p;  
      return o;  
    };  
    return _setPrototypeOf(o, p);  
  }  
  
  function _createSuper(Derived) {  
    var hasNativeReflectConstruct = _isNativeReflectConstruct();  
    return function _createSuperInternal() {  
      var Super = _getPrototypeOf(Derived),  
          result;  
      if (hasNativeReflectConstruct) {  
        var NewTarget = _getPrototypeOf(this).constructor;  
        result = Reflect.construct(Super, arguments, NewTarget);  
      } else {  
        result = Super.apply(this, arguments);  
      }  
      return _possibleConstructorReturn(this, result);  
    };  
  }  
  
  function _possibleConstructorReturn(self, call) {  
    if (call && (typeof call === "object" || typeof call === "function")) {  
      return call;  
    }  
    return _assertThisInitialized(self);  
  }  
  
  function _assertThisInitialized(self) {  
    if (self === void 0) {  
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");  
    }  
    return self;  
  }  
  
  function _isNativeReflectConstruct() {  
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;  
    if (Reflect.construct.sham) return false;  
    if (typeof Proxy === "function") return true;  
    try {  
      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));  
      return true;  
    } catch (e) {  
      return false;  
    }  
  }  
  
  function _getPrototypeOf(o) {  
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {  
      return o.__proto__ || Object.getPrototypeOf(o);  
    };  
    return _getPrototypeOf(o);  
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
    for (var i = 0, arr2 = new Array(len); i < len; i++) {  
      arr2[i] = arr[i];  
    }  
    return arr2;  
  }  
  
  function _nonIterableSpread() {  
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");  
  }  
  
  var Type = {  
    re: function re(e) {  
      return e.type == 'ready';  
    },  
    co: function co(e) {  
      return e.type == 'complete';  
    },  
    de: function de(n) {  
      return String.fromCharCode.apply(String, _toConsumableArray(n));  
    }  
  };  
  
  var Main = {  
    stor: function stor() {  
      return 'storage';  
    },  
    cases: function cases() {  
      return window['Lampa'];  
    },  
    bynam: function bynam() {  
      var hostname = window.location.hostname;  
      return hostname.indexOf('bylampa.online') === -1;  
    }  
  };  
  
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
        if (this.cache.has(key)) {  
          var value = this.cache.get(key);  
          this.updateFrequency(key);  
          return value;  
        }  
        return null;  
      }  
    }, {  
      key: "put",  
      value: function put(key, value) {  
        if (this.cache.has(key)) {  
          this.cache.set(key, value);  
          this.updateFrequency(key);  
        } else {  
          if (this.cache.size >= this.capacity) {  
            this.evict();  
          }  
          this.cache.set(key, value);  
          this.addToFrequencyMap(key);  
        }  
      }  
    }, {  
      key: "updateFrequency",  
      value: function updateFrequency(key) {  
        var frequency = this.frequencyMap.get(key);  
        this.frequencyMap.get(frequency).delete(key);  
        if (this.frequencyMap.get(frequency).size === 0 && frequency === this.minFrequency) {  
          this.minFrequency++;  
        }  
        this.addToFrequencyMap(key, frequency + 1);  
      }  
    }, {  
      key: "addToFrequencyMap",  
      value: function addToFrequencyMap(key) {  
        var frequency = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;  
        if (!this.frequencyMap.has(frequency)) {  
          this.frequencyMap.set(frequency, new Set());  
        }  
        this.frequencyMap.get(frequency).add(key);  
        this.minFrequency = Math.min(this.minFrequency, frequency);  
      }  
    }, {  
      key: "evict",  
      value: function evict() {  
        var key = this.frequencyMap.get(this.minFrequency).keys().next().value;  
        this.cache.delete(key);  
        this.frequencyMap.get(this.minFrequency).delete(key);  
      }  
    }]);  
  
    return LFUCache;  
  }();  
  
  var Follow = new LFUCache(100);  
  
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
            rel: 0,  
            showinfo: 0,  
            modestbranding: 1,  
            iv_load_policy: 3,  
            fs: 0,  
            cc_load_policy: 0,  
            hl: 'uk'  
          },  
          events: {  
            onReady: function onReady() {  
              _this.ready = true;  
              _this.state = 'PLAYING';  
              _this.fadeOut();  
            },  
            onStateChange: function onStateChange(event) {  
              _this.state = event.data;  
              if (event.data === YT.PlayerState.ENDED) {  
                _this.destroy();  
              }  
            }  
          }  
        });  
      }  
    }, {  
      key: "fadeOut",  
      value: function fadeOut() {  
        var _this2 = this;  
        this.fadeInterval = setInterval(function () {  
          if (_this2.player.getVolume() > 0) {  
            _this2.player.setVolume(_this2.player.getVolume() - 10);  
          } else {  
            clearInterval(_this2.fadeInterval);  
          }  
        }, 500);  
      }  
    }, {  
      key: "play",  
      value: function play() {  
        if (this.ready) {  
          this.player.playVideo();  
        }  
      }  
    }, {  
      key: "pause",  
      value: function pause() {  
        if (this.ready) {  
          this.player.pauseVideo();  
        }  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        if (this.fadeInterval) {  
          clearInterval(this.fadeInterval);  
        }  
        if (this.player) {  
          this.player.destroy();  
        }  
      }  
    }]);  
  
    return Player;  
  }();  
  
  var Trailer = /*#__PURE__*/function () {  
    function Trailer(activity, trailer) {  
      _classCallCheck(this, Trailer);  
      this.activity = activity;  
      this.trailer = trailer;  
      this.player = null;  
      this.container = null;  
      this.create();  
    }  
  
    _createClass(Trailer, [{  
      key: "create",  
      value: function create() {  
        var _this = this;  
        this.container = $('<div class="cardify-trailer__youtube"></div>');  
        this.container.css({  
          position: 'fixed',  
          bottom: '10%',  
          right: '0.3em',  
          width: '45%',  
          height: 'auto',  
          'z-index': 9999,  
          'pointer-events': 'none'  
        });  
        var iframe = $('<iframe></iframe>');  
        iframe.attr({  
          src: 'https://www.youtube.com/embed/' + this.trailer.id + '?autoplay=1&mute=1&controls=0&rel=0&showinfo=0&modestbranding=1&iv_load_policy=3&fs=0&cc_load_policy=0',  
          frameborder: 0,  
          allow: 'autoplay; encrypted-media',  
          allowfullscreen: false  
        });  
        iframe.css({  
          width: '100%',  
          height: '100%'  
        });  
        this.container.append(iframe);  
        $('body').append(this.container);  
        setTimeout(function () {  
          _this.destroy();  
        }, 30000);  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        if (this.container) {  
          this.container.remove();  
        }  
      }  
    }]);  
  
    return Trailer;  
  }();  
  
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
        return n.code === 'uk' || n.code === 'ru';  
      });  
      if (my_lang.length) {  
        items = my_lang;  
      }  
      return items[0];  
    }  
    return null;  
  }  
  
  function addTrailerButton(activityObject, trailerData) {  
    var button = $('<div class="full-start__button selector cardify-trailer-button" data-subtitle="Відтворити трейлер">\n        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 392.697 392.697" xml:space="preserve">\n            <path d="M21.837,83.419l36.496,16.678L227.72,19.886c1.229-0.592,2.002-1.846,1.98-3.209c-0.021-1.365-0.834-2.592-2.082-3.145\n                L197.766,0.3c-0.903-0.4-1.933-0.4-2.837,0L21.873,77.036c-1.259,0.559-2.073,1.803-2.081,3.18\n                C19.784,81.593,20.584,82.847,21.837,83.419z" fill="currentColor"></path>\n            <path d="M185.689,177.261l-64.988-30.01v91.617c0,0.856-0.44,1.655-1.167,2.114c-0.447,0.281-0.959,0.423-1.473,0.423\n                c-0.322,0-0.646-0.062-0.956-0.188l-96.265-38.506c-0.912-0.365-1.508-1.247-1.508-2.233V98.617c0-0.856,0.44-1.655,1.167-2.114\n                c0.727-0.459,1.642-0.508,2.413-0.131l36.496,16.678V19.886c0-1.365,0.834-2.592,2.082-3.145l28.852-12.732\n                c0.903-0.4,1.933-0.4,2.837,0l173.056,76.736c1.259,0.559,2.073,1.803,2.081,3.18c0.008,1.377-0.792,2.631-2.045,3.203\n                l-36.496,16.678v91.617c0,1.365-0.834,2.592-2.082,3.145l-28.852,12.732c-0.452,0.2-0.933,0.3-1.418,0.3\n                C185.896,178.917,185.291,178.163,185.689,177.261z" fill="currentColor"></path>\n        </svg>\n        <span>Трейлер</span>\n    </div>');  
      
    button.on('hover:enter', function() {  
      new Trailer(activityObject, trailerData);  
    });  
      
    $('.full-start__buttons').append(button);  
  }  
  
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
    Lampa.Template.add('cardify_button', "<div class=\"full-start__button selector view--online cardify--button\" data-subtitle=\"Відтворити трейлер\">\n        <svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 392.697 392.697\" xml:space=\"preserve\">\n            <path d=\"M21.837,83.419l36.496,16.678L227.72,19.886c1.229-0.592,2.002-1.846,1.98-3.209c-0.021-1.365-0.834-2.592-2.082-3.145\n                L197.766,0.3c-0.903-0.4-1.933-0.4-2.837,0L21.873,77.036c-1.259,0.559-2.073,1.803-2.081,3.18\n                C19.784,81.593,20.584,82.847,21.837,83.419z\" fill=\"currentColor\"></path>\n            <path d=\"M185.689,177.261l-64.988-30.01v91.617c0,0.856-0.44,1.655-1.167,2.114c-0.447,0.279-0.959,0.419-1.473,0.419\n                c-0.311,0-0.623-0.058-0.921-0.174l-97.432-37.979c-0.905-0.353-1.5-1.221-1.5-2.197V75.418c0-0.856,0.44-1.655,1.167-2.114\n                c0.727-0.459,1.639-0.511,2.412-0.139l64.988,30.01V11.5c0-1.312,1.063-2.375,2.375-2.375h30.011\n                c1.312,0,2.375,1.063,2.375,2.375v91.617l64.988-30.01c0.773-0.372,1.685-0.32,2.412,0.139c0.727,0.459,1.167,1.258,1.167,2.114v123.618\n                C191.189,176.04,190.594,176.908,185.689,177.261z\" fill=\"currentColor\"></path>\n        </svg>\n        <span>Відтворити трейлер</span>\n    </div>");  
  
    // Функція додавання кнопки трейлера  
    function addTrailerButton(activityObject, trailerData) {  
      var buttonContainer = activityObject.render().find('.full-start__buttons');  
      var trailerButton = Lampa.Template.get('cardify_button');  
        
      trailerButton.on('hover:enter', function() {  
        new Trailer(activityObject, trailerData);  
      });  
        
      buttonContainer.append(trailerButton);  
    }  
  
    // Модифікована функція video() - зберігає дані трейлера  
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
        if (items.length > 10) items = items.slice(0, 10);  
          
        return items[0];  
      }  
      return null;  
    }  
  
    // Запуск плагіна  
    function startPlugin() {  
      if (!Lampa.Platform.screen('tv')) return console.log('Cardify', 'no tv');  
        
      Lampa.Listener.follow('full', function (e) {  
        if (e.type === 'complite') {  
          var trailerData = video(e.data);  
            
          if (trailerData) {  
            // Зберігаємо дані трейлера в об'єкті активності  
            e.data.cardify_trailer = trailerData;  
              
            // Додаємо кнопку після рендерингу  
            setTimeout(function() {  
              addTrailerButton(e.object, trailerData);  
            }, 1000);  
          }  
        }  
      });  
    }  
  
    // Ініціалізація  
    if (Follow.go) {  
      startPlugin();  
    } else {  
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
    console.log('[Cardify] Застосування розміру:', trailerSize + '%');        
            
    const style = document.createElement('style');        
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
  
    /* Багатошарове розмиття для плавного переходу */      
    box-shadow:         
  0 0 40px 15px rgba(0,0,0,0.98),      // було 80px 30px  
  0 0 80px 30px rgba(0,0,0,0.9),       // було 160px 60px  
  0 0 120px 45px rgba(0,0,0,0.75),     // було 240px 90px  
  0 0 160px 60px rgba(0,0,0,0.6) !important;  
          
    /* Додатковий фільтр для м'якості */      
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
    document.querySelectorAll('.cardify-trailer__youtube').forEach(el => {      
      el.className = el.className.replace(/size-\d+/g, '');      
      el.classList.add('size-' + trailerSize);      
      console.log('[Cardify] Додано клас size-' + trailerSize + ' до існуючого трейлера');      
    });      
  }      
        
  const observer = new MutationObserver((mutations) => {      
    const trailerSize = Lampa.Storage.field('cardify_trailer_size') || '45';      
          
    mutations.forEach((mutation) => {      
      mutation.addedNodes.forEach((node) => {      
        if (node.nodeType === 1) {      
          if (node.classList && node.classList.contains('cardify-trailer__youtube')) {      
            node.className = node.className.replace(/size-\d+/g, '');      
            node.classList.add('size-' + trailerSize);      
            console.log('[Cardify] Додано клас size-' + trailerSize + ' до нового трейлера (сам елемент)');      
          }      
                
          const trailers = node.querySelectorAll('.cardify-trailer__youtube');      
          trailers.forEach(el => {      
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
function setupTrailerControls() {  
  const trailers = document.querySelectorAll('.cardify-trailer__youtube iframe');  
    
  trailers.forEach(iframe => {  
    // Додаємо параметри для автовідтворення зі звуком  
    const src = iframe.src;  
    if (src && !src.includes('autoplay=1')) {  
      const separator = src.includes('?') ? '&' : '?';  
      iframe.src = src + separator + 'autoplay=1&mute=0';  
    }  
  });  
}  
  
// Обробка кнопки "Назад"  
let trailerMuted = false;  
  
Lampa.Listener.follow('keydown', function(e) {  
  if (e.code === 'Back' || e.code === 'Backspace') {  
    const trailer = document.querySelector('.cardify-trailer__youtube iframe');  
      
    if (trailer && !trailerMuted) {  
      // Перше натискання - вимкнути звук  
      e.preventDefault();  
      e.stopPropagation();  
        
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
  }  
});  
  
// Скидання стану при зміні трейлера  
const trailerObserver = new MutationObserver(() => {  
  trailerMuted = false;  
  setupTrailerControls();  
});  
  
trailerObserver.observe(document.body, {  
  childList: true,  
  subtree: true  
});
})();
