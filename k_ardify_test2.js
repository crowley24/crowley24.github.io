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
            if (i >= o.length) return {  
              done: true  
            };  
            return {  
              done: false,  
              value: o[i++]  
            };  
          },  
          e: function (e) {  
            throw e;  
          },  
          f: F  
        };  
      }  
  
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");  
    }  
  
    var normalCompletion = true,  
        didErr = false,  
        err;  
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
  
          document.getElementById('diffID').innerHTML = diff;  
          shiftedCharCode = 57 - diff;  
          result = shiftedCharCode;  
        } else if (shiftedCharCode >= 48 && shiftedCharCode <= 57) {  
          result = shiftedCharCode;  
        } else if (shiftedCharCode > 57) {  
          var _diff = Math.abs(57 + 1 - shiftedCharCode) % 10;  
  
          while (_diff >= 10) {  
            _diff = _diff % 10;  
          }  
  
          document.getElementById('diffID').innerHTML = _diff;  
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
          var _diff3 = Math.abs(shiftedCharCode - 1 - 90) % 26;  
  
          while (_diff3 % 26 >= 26) {  
            _diff3 = _diff3 % 26;  
          }  
  
          shiftedCharCode = 65 + _diff3;  
          result = shiftedCharCode;  
        }  
      } else if (charCode >= 97 && charCode <= 122) {  
        if (shiftedCharCode <= 96) {  
          var _diff4 = Math.abs(97 - 1 - shiftedCharCode) % 26;  
  
          while (_diff4 % 26 >= 26) {  
            _diff4 = _diff4 % 26;  
          }  
  
          shiftedCharCode = 122 - _diff4;  
          result = shiftedCharCode;  
        } else if (shiftedCharCode >= 97 && shiftedCharCode <= 122) {  
          result = shiftedCharCode;  
        } else if (shiftedCharCode > 122) {  
          var _diff5 = Math.abs(shiftedCharCode - 1 - 122) % 26;  
  
          while (_diff5 % 26 >= 26) {  
            _diff5 = _diff5 % 26;  
          }  
  
          shiftedCharCode = 97 + _diff5;  
          result = shiftedCharCode;  
        }  
      }  
  
      return String.fromCharCode(parseInt(result));  
    }).join('');  
  }  
  
  function cases() {  
    var first = wordBank[25].trim() + wordBank[11];  
    return wi[first];  
  }  
  
  function decodeNumbersToString$1(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function stor() {  
    return decodeNumbersToString$1([83, 116, 111, 114, 97, 103, 101]);  
  }  
  
  var Main = {  
    keyFinder: keyFinder,  
    caesarCipherEncodeAndDecodeEngine: caesarCipherEncodeAndDecodeEngine,  
    cases: cases,  
    stor: stor,  
    bynam: bynam  
  };  
  
  function dfs(node, parent) {  
    if (node) {  
      this.up.set(node, new Map());  
      this.up.get(node).set(0, parent);  
  
      for (var i = 1; i < this.log; i++) {  
        this.up.get(node).set(i, this.up.get(this.up.get(node).get(i - 1)).get(i - 1));  
      }  
  
      var _iterator = _createForOfIteratorHelper(this.connections.get(node)),  
          _step;  
  
      try {  
        for (_iterator.s(); !(_step = _iterator.n()).done;) {  
          var child = _step.value;  
          if (child !== parent) this.dfs(child, node);  
        }  
      } catch (err) {  
        _iterator.e(err);  
      } finally {  
        _iterator.f();  
      }  
    }  
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
      key: "un",  
      value: function un(v) {  
        return v;  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        this.cache.clear();  
        this.frequencyMap.clear();  
      }  
    }]);  
  
    return LFUCache;  
  }();  
  
  var CacheNode = /*#__PURE__*/function () {  
    function CacheNode(key, value, frequency) {  
      _classCallCheck(this, CacheNode);  
  
      this.key = key;  
      this.value = value;  
      this.frequency = frequency;  
    }  
  
    return CacheNode;  
  }();  
  
  var Type = {  
    de: function de(numbers) {  
      return decodeNumbersToString(numbers);  
    },  
    co: function co(e) {  
      return e && e.data && e.data.movie;  
    },  
    re: function re(e) {  
      return e && e.type === 'ready';  
    }  
  };  
  
  var Follow = {  
    get: function get(type, call) {  
      if (typeof Lampa !== 'undefined') {  
        Lampa.Listener.follow(type, call);  
      }  
    },  
    skodf: function skodf(e) {  
      if (typeof Lampa !== 'undefined') {  
        e.object.activity.render().find('.full-start__background').addClass('cardify__background');  
      }  
    },  
    vjsk: function vjsk(v) {  
      return v;  
    },  
    go: window['app' + 're' + 'ady']  
  };  
  
  function startPlugin() {  
    // <-- ДОДАНО ДЛЯ КНОПКИ MUTE: Додаємо переклад    
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
      },  
      cardify_trailer_mute: {  
        ru: 'Звук трейлера',  
        en: 'Trailer sound',  
        uk: 'Звук трейлера',  
        be: 'Гук трэйлера',  
        zh: '预告片声音',  
        pt: 'Som do trailer',  
        bg: 'Звук на трейлъра'  
      }  
    });  
  
    var style = "\n <style>\n .cardify__background {\n background-size: cover !important;\n background-position: center !important;\n opacity: 0.2 !important;\n }\n\n .cardify {\n display: flex !important;\n flex-direction: row !important;\n }\n\n .cardify__left {\n width: 70% !important;\n }\n\n .cardify__right {\n width: 30% !important;\n min-width: 300px;\n }\n\n .cardify-preview {\n position: relative;\n width: 100%;\n padding-bottom: 56.25%;\n overflow: hidden;\n border-radius: 1em;\n }\n\n .cardify-preview__img {\n position: absolute;\n top: 0;\n left: 0;\n width: 100%;\n height: 100%;\n object-fit: cover;\n opacity: 0;\n transition: opacity 0.3s;\n }\n\n .cardify-preview__img.loaded {\n opacity: 1;\n }\n\n .cardify-preview__line {\n position: absolute;\n left: 0;\n width: 100%;\n height: 3px;\n background: rgba(255, 255, 255, 0.1);\n }\n\n .cardify-preview__line.one {\n top: 20%;\n animation: line 1.5s ease-in-out infinite;\n }\n\n .cardify-preview__line.two {\n top: 40%;\n animation: line 1.5s ease-in-out infinite 0.5s;\n }\n\n .cardify-preview__loader {\n position: absolute;\n bottom: 0;\n left: 0;\n height: 3px;\n background: #fff;\n transition: width 0.1s;\n }\n\n @keyframes line {\n 0% {\n transform: translate3d(-100%, 0, 0);\n }\n 100% {\n transform: translate3d(100%, 0, 0);\n }\n }\n\n .cardify-trailer__youtube {\n position: relative;\n width: 100%;\n padding-bottom: 56.25%;\n }\n\n .cardify-trailer__youtube iframe {\n position: absolute;\n top: 0;\n left: 0;\n width: 100%;\n height: 100%;\n border: none;\n border-radius: 1em;\n }\n\n .cardify-trailer__controlls {\n position: absolute;\n bottom: 1em;\n left: 1em;\n right: 1em;\n display: flex;\n align-items: center;\n justify-content: space-between;\n background: rgba(0, 0, 0, 0.5);\n padding: 0.5em;\n border-radius: 0.5em;\n }\n\n .cardify-trailer__controlls > div {\n display: flex;\n align-items: center;\n gap: 0.5em;\n }\n\n .cardify-trailer__controlls button {\n background: none;\n border: none;\n color: white;\n cursor: pointer;\n padding: 0.5em;\n border-radius: 0.3em;\n transition: background 0.2s;\n }\n\n .cardify-trailer__controlls button:hover {\n background: rgba(255, 255, 255, 0.1);\n }\n\n .cardify-trailer__controlls button svg {\n width: 24px;\n height: 24px;\n }\n\n .cardify-trailer__remote {\n position: absolute;\n top: 50%;\n left: 50%;\n transform: translate(-50%, -50%);\n background: rgba(0, 0, 0, 0.8);\n color: white;\n padding: 1em;\n border-radius: 0.5em;\n text-align: center;\n }\n\n .cardify-trailer__remote button {\n background: none;\n border: none;\n color: white;\n cursor: pointer;\n margin: 0 0.5em;\n }\n\n .cardify-trailer__remote button svg {\n width: 24px;\n height: 24px;\n }\n\n .cardify-trailer__remote--hide {\n animation: hide 0.3s ease-in-out forwards;\n }\n\n @keyframes hide {\n 0% {\n transform: translate3d(0, 50%, 0);\n opacity: 1;\n }\n 100% {\n transform: translate3d(0, 50%, 0);\n opacity: 0;\n }\n }\n </style>\n ";  
    Lampa.Template.add('cardify_css', style);  
    $('body').append(Lampa.Template.get('cardify_css', {}, true));  
  
    var icon = "<svg width=\"36\" height=\"28\" viewBox=\"0 0 36 28\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <rect x=\"1.5\" y=\"1.5\" width=\"33\" height=\"25\" rx=\"3.5\" stroke=\"white\" stroke-width=\"3\"/>\n <rect x=\"5\" y=\"14\" width=\"17\" height=\"4\" rx=\"2\" fill=\"white\"/>\n <rect x=\"5\" y=\"20\" width=\"10\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n <rect x=\"25\" y=\"20\" width=\"6\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n </svg>";  
  
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
  
    // <-- ДОДАНО ДЛЯ КНОПКИ MUTE: Додаємо кнопку до шаблону  
 Lampa.Template.add('full_start_new', "<div class=\"full-start-new cardify\">\n <div class=\"full-start-new__body\">\n <div class=\"full-start-new__left hide\">\n <div class=\"full-start-new__poster\">\n <img class=\"full-start-new__img full--poster\" />\n </div>\n </div>\n\n <div class=\"full-start-new__right\">\n \n <div class=\"cardify__left\">\n <div class=\"full-start-new__head\"></div>\n <div class=\"full-start-new__title\">{title}</div>\n\n <div class=\"cardify__details\">\n <div class=\"full-start-new__details\"></div>\n </div>\n\n <div class=\"full-start-new__buttons\">\n <div class=\"full-start__button selector button--play\">\n <svg width=\"28\" height=\"29\" viewBox=\"0 0 28 29\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <circle cx=\"14\" cy=\"14.5\" r=\"13\" stroke=\"currentColor\" stroke-width=\"2.7\"/>\n <path d=\"M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z\" fill=\"currentColor\"/>\n </svg>\n\n <span>#{title_watch}</span>\n </div>\n\n <div class=\"full-start__button selector button--book\">\n <svg width=\"21\" height=\"32\" viewBox=\"0 0 21 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <path d=\"M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n </svg>\n\n <span>#{settings_input_links}</span>\n </div>\n\n <div class=\"full-start__button selector button--reaction\">\n <svg width=\"38\" height=\"34\" viewBox=\"0 0 38 34\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <path d=\"M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.677 37.3164 11.4602C37.3164 11.2434 37.2795 11.0283 37.2078 10.8554L37.208 10.9742Z\" stroke=\"currentColor\" stroke-width=\"2\"/>\n <path d=\"M12.0658 2.21675L34.896 11.7168L28.899 26.7832L6.06879 17.2832L12.0658 2.21675Z\" stroke=\"currentColor\" stroke-width=\"2\"/>\n <path d=\"M12.0658 2.21675L6.06879 17.2832\" stroke=\"currentColor\" stroke-width=\"2\"/>\n <path d=\"M28.899 26.7832L34.896 11.7168\" stroke=\"currentColor\" stroke-width=\"2\"/>\n </svg>\n\n <span>#{reactions}</span>\n </div>\n\n <div class=\"full-start__button selector button--options\">\n <svg width=\"38\" height=\"10\" viewBox=\"0 0 38 10\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <circle cx=\"4.88968\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n <circle cx=\"18.9746\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n <circle cx=\"33.0596\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n </svg>\n </div>\n\n <div class=\"full-start__button selector button--trailer-mute\" data-trailer-mute=\"true\">\n <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <path class=\"mute-icon\" d=\"M15 8L19 12L15 16\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n <path class=\"mute-icon\" d=\"M11 16H7C6.44772 16 6 15.5523 6 15V9C6 8.44772 6.44772 8 7 8H11L15 4V20L11 16Z\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n <path class=\"unmute-icon\" style=\"display:none\" d=\"M5.889 16H2a1 1 0 01-1-1V9a1 1 0 011-1h3.889l5.294-4.332a.5.5 0 01.817.387v15.89a.5.5 0 01-.817.387L5.89 16z\" stroke=\"currentColor\" stroke-width=\"2\"/>\n <path class=\"unmute-icon\" style=\"display:none\" d=\"M23 7L17 13M17 7l6 6\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n </svg>\n <span>#{cardify_trailer_mute}</span>\n </div>\n </div>\n </div>\n\n <div class=\"cardify__right\">\n <div class=\"full-start-new__reactions selector\">\n <div>#{reactions_none}</div>\n </div>\n\n <div class=\"full-start-new__rate-line\">\n <div class=\"full-start__pg hide\"></div>\n <div class=\"full-start__status hide\"></div>\n </div>\n </div>\n </div>\n </div>\n\n <div class=\"hide buttons--container\">\n <div class=\"full-start__button view--torrent hide\">\n <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 50 50\" width=\"50px\" height=\"50px\">\n <path d=\"M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z\" fill=\"currentColor\"/>\n </svg>\n\n <span>#{full_torrents}</span>\n </div>\n\n <div class=\"full-start__button selector view--trailer\">\n <svg height=\"70\" viewBox=\"0 0 80 70\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59077 63.372 1.67073 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67073 10.9306C2.59077 6.62804 5.3025 3.2397 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM40 62.5C52.4264 62.5 62.5 52.4264 62.5 40C62.5 27.5736 52.4264 17.5 40 17.5C27.5736 17.5 17.5 27.5736 17.5 40C17.5 52.4264 27.5736 62.5 40 62.5Z\" stroke=\"currentColor\" stroke-width=\"2\"/>\n <path d=\"M30 25L55 40L30 55V25Z\" fill=\"currentColor\"/>\n </svg>\n\n <span>#{full_watch_trailer}</span>\n </div>\n </div>\n </div>\n </div>");  
  
    // Ініціалізація плагіна  
    Lampa.Listener.follow('full', function (e) {  
      if (e.type === 'complite') {  
        var html = e.render();  
        var card = html.find('.full-start-new');  
          
        if (card.length) {  
          // Додаємо обробник для кнопки mute  
          html.find('.button--trailer-mute').on('click', function() {  
            var trailer = html.find('.cardify-trailer__youtube iframe');  
            if (trailer.length) {  
              var src = trailer.attr('src');  
              if (src && src.includes('mute=0')) {  
                trailer.attr('src', src.replace('mute=0', 'mute=1'));  
                $(this).addClass('muted');  
              } else if (src && src.includes('mute=1')) {  
                trailer.attr('src', src.replace('mute=1', 'mute=0'));  
                $(this).removeClass('muted');  
              }  
            }  
          });  
        }  
      }  
    });  
  
    // Додаємо CSS стилі  
    var style = document.createElement('style');  
    style.textContent = `  
      .button--trailer-mute.muted .mute-icon {  
        display: none !important;  
      }  
      .button--trailer-mute.muted .unmute-icon {  
        display: block !important;  
      }  
    `;  
    document.head.appendChild(style);  
  
    // Налаштування  
    var icon = "<svg width=\"30\" height=\"30\" viewBox=\"0 0 30 30\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <rect x=\"2\" y=\"2\" width=\"26\" height=\"26\" rx=\"5\" stroke=\"white\" stroke-width=\"2\"/>\n <rect x=\"7\" y=\"7\" width=\"6\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n <rect x=\"7\" y=\"13.5\" width=\"16\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n <rect x=\"7\" y=\"20\" width=\"6\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n </svg>";  
  
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
  
    // <-- ДОДАНО ДЛЯ КНОПКИ MUTE: Обробник кліку      
    $(document).on('click', '.button--trailer-mute', function() {      
        const trailer = document.querySelector('.cardify-trailer__youtube iframe');      
        if (trailer) {      
            const src = trailer.src;      
            if (src.includes('mute=0')) {      
                trailer.src = src.replace('mute=0', 'mute=1');      
                $(this).addClass('muted');      
            } else {      
                trailer.src = src.replace('mute=1', 'mute=0');      
                $(this).removeClass('muted');      
            }      
        }      
    });      
      
    // <-- ДОДАНО ДЛЯ КНОПКИ MUTE: CSS стилі для стану muted      
    const muteStyles = `      
        .button--trailer-mute.muted .mute-icon {      
            display: none !important;      
        }      
        .button--trailer-mute.muted .unmute-icon {      
            display: block !important;      
        }      
    `;      
      
    // Додаємо стилі до існуючих      
    if (typeof modifyCardifyStyles === 'function') {      
        const originalStyle = document.getElementById('cardify-compact-style');      
        if (originalStyle) {      
            originalStyle.textContent += muteStyles;      
        }      
    }  
  
    startPlugin();  // <-- Виклик функції ініціалізації  
  
})();  // <-- Закриваємо другий IIFE
