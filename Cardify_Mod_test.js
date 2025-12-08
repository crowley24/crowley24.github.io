(function () {
  'use strict';

  // --- Вспомогалки (транспайл-утиліти) ---
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
    var normalCompletion = true, didErr = false, err;
    return {
      s: function () { it = it.call(o); },
      n: function () {
        var step = it.next();
        normalCompletion = step.done;
        return step;
      },
      e: function (e) { didErr = true; err = e; },
      f: function () {
        try {
          if (!normalCompletion && it.return != null) it.return();
        } finally {
          if (didErr) throw err;
        }
      }
    };
  }

  // --- Безпечний доступ до storage (враховує різні реалізації Lampa.Storage) ---
  function getStorageField(name, def) {
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Storage) {
        if (typeof Lampa.Storage.field === 'function') return Lampa.Storage.field(name) || def;
        if (typeof Lampa.Storage.get === 'function') return Lampa.Storage.get(name, def);
      }
      if (window.localStorage) {
        var v = localStorage.getItem(name);
        return v !== null ? v : def;
      }
    } catch (e) {
      console.warn('[Cardify] getStorageField error', e);
    }
    return def;
  }

  // --- State helper (збережено) ---
  function State(object) {
    this.state = object.state;
    this.start = function () { this.dispath(this.state); };
    this.dispath = function (action_name) {
      var action = object.transitions[action_name];
      if (action) {
        action.call(this, this);
      } else {
        console.log('invalid action');
      }
    };
  }

  // --- Player class (залишено, але без змін логіки) ---
  var Player = /*#__PURE__*/function () {
    function Player(object, video) {
      var _this = this;
      _classCallCheck(this, Player);
      this.paused = false;
      this.display = false;
      this.ended = false;
      try {
        this.listener = Lampa.Subscribe();
      } catch (e) {
        this.listener = { send: function(){} , follow: function(){}, remove: function(){} };
      }
      // Зручніше створювати елемент через createElement, але зберігаємо шаблон
      this.html = $(
        "<div class=\"cardify-trailer\">" +
          "<div class=\"cardify-trailer__youtube\"><div class=\"cardify-trailer__youtube-iframe\"></div></div>" +
        "</div>"
      );

      if (typeof YT !== 'undefined' && YT.Player) {
        try {
          var iframeElement = this.html.find('.cardify-trailer__youtube-iframe')[0];
          if (iframeElement) {
            this.youtube = new YT.Player(iframeElement, {
              height: window.innerHeight * 2,
              width: window.innerWidth,
              playerVars: {
                'controls': 1,
                'showinfo': 0,
                'autohide': 1,
                'modestbranding': 1,
                'autoplay': 0,
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
                  try { _this.listener.send('loaded'); } catch(e){}
                },
                onStateChange: function onStateChange(state) {
                  try {
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
                      if (window.cardify_fist_unmute) _this.unmute();
                    }
                    if (state.data == YT.PlayerState.PAUSED) {
                      _this.paused = true;
                      clearInterval(_this.timer);
                      _this.listener.send('paused');
                    }
                    if (state.data == YT.PlayerState.ENDED) {
                      _this.listener.send('ended');
                    }
                    if (state.data == YT.PlayerState.BUFFERING) {
                      try { state.target.setPlaybackQuality('hd1080'); } catch(e){}
                    }
                  } catch(e) {}
                },
                onError: function onError(e) {
                  _this.loaded = false;
                  _this.listener.send('error');
                }
              }
            });
          }
        } catch (e) {
          console.warn('[Cardify] YT.Player init error', e);
        }
      }
    }

    _createClass(Player, [{
      key: "play",
      value: function play() {
        try { this.youtube.playVideo(); } catch (e) {}
      }
    }, {
      key: "pause",
      value: function pause() {
        try { this.youtube.pauseVideo(); } catch (e) {}
      }
    }, {
      key: "unmute",
      value: function unmute() {
        try {
          this.youtube.unMute();
          this.html.find('.cardify-trailer__remote').remove();
          window.cardify_fist_unmute = true;
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

  // --- Trailer class, з деякими правками безпечності ---
  var Trailer = /*#__PURE__*/function () {
    function Trailer(object, video) {
      var _this = this;
      _classCallCheck(this, Trailer);
      try { object.activity.trailer_ready = true; } catch(e){}
      this.object = object;
      this.video = video;
      this.player = null;
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
            if (_this.player && _this.player.display) state.dispath('play'); else if (_this.player && _this.player.loaded) {
              _this.animate();
              _this.timer_load = setTimeout(function () { state.dispath('load'); }, _this.timelauch);
            }
          },
          load: function load(state) {
            try {
              if (_this.player && _this.player.loaded && Lampa.Controller.enabled().name == 'full_start' && _this.same()) state.dispath('play');
            } catch (e) {}
          },
          play: function play() { _this.player && _this.player.play(); },
          toggle: function toggle(state) {
            clearTimeout(_this.timer_load);
            // Спрощена логіка toggle — без агресивного коду, зберігаємо сумісність
            try {
              if (Lampa.Controller.enabled().name == 'full_start' && _this.same()) {
                state.start();
              }
            } catch (e) {}
          },
          hide: function hide() {
            try {
              _this.player && _this.player.pause();
              _this.player && _this.player.hide();
              _this.background && _this.background.removeClass('nodisplay');
              _this.startblock && _this.startblock.removeClass('nodisplay');
              _this.head && _this.head.removeClass('nodisplay');
              _this.object.activity.render().find('.cardify-preview__loader').width(0);
            } catch (e) {}
          }
        }
      });
      this.start();
    }

    _createClass(Trailer, [{
      key: "same",
      value: function same() {
        try {
          return Lampa.Activity.active().activity === this.object.activity;
        } catch (e) {
          return false;
        }
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
        var preview = $(
          "<div class=\"cardify-preview\">" +
            "<div>" +
              "<img class=\"cardify-preview__img\" />" +
              "<div class=\"cardify-preview__loader\"></div>" +
            "</div>" +
          "</div>"
        );
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

        // Додаємо контролери без агресивних втручань
        try {
          Lampa.Controller.add('cardify_trailer', {
            toggle: function () { Lampa.Controller.clear(); },
            enter: function () { _this3.player && _this3.player.unmute(); },
            left: function () { Lampa.Controller.toggle('full_start'); Lampa.Controller.trigger('left'); },
            up: function () { Lampa.Controller.toggle('full_start'); Lampa.Controller.trigger('up'); },
            down: function () { Lampa.Controller.toggle('full_start'); Lampa.Controller.trigger('down'); },
            right: function () { Lampa.Controller.toggle('full_start'); Lampa.Controller.trigger('right'); },
            back: function back() { _this3.state.dispath('hide'); Lampa.Controller.toggle('full_start'); },
            volume_up: function() {
              try {
                var currentVolume = _this3.player.youtube.getVolume();
                _this3.player.youtube.setVolume(Math.min(100, currentVolume + 10));
              } catch (e) {}
            },
            volume_down: function() {
              try {
                var currentVolume = _this3.player.youtube.getVolume();
                _this3.player.youtube.setVolume(Math.max(0, currentVolume - 10));
              } catch (e) {}
            }
          });
          Lampa.Controller.toggle('cardify_trailer');
        } catch (e) {
          console.warn('[Cardify] controll add error', e);
        }
      }
    }, {
      key: "start",
      value: function start() {
        var _this4 = this;
        var _self = this;

        var toggle = function toggle(e) { _self.state.dispath('toggle'); };
        var destroy = function destroy(e) { if (e.type == 'destroy' && e.object.activity === _self.object.activity) remove(); };

        var remove = function remove() {
          try { Lampa.Listener.remove('activity', destroy); } catch(e){}
          try { Lampa.Controller.listener.remove('toggle', toggle); } catch(e){}
          // Відновити оригінальні методи
          try { window.onbeforeunload = originalOnBeforeUnload; } catch(e){}
          try { if (typeof originalHistoryBack === 'function') window.history.back = originalHistoryBack; } catch(e){}
          _self.destroy();
        };

        // Зберегти оригінальні методи
        var originalOnBeforeUnload = window.onbeforeunload;
        var originalHistoryBack = typeof window.history.back === 'function' ? window.history.back : null;

        // Агресивне перехоплення на рівні вікна — робимо безпечніше
        window.onbeforeunload = function(e) {
          try {
            if (_this4.player && _this4.player.display) {
              console.log('[Cardify] Window beforeunload intercepted');
              _this4.state.dispath('hide');
              if (e) {
                if (e.preventDefault) e.preventDefault();
                e.returnValue = '';
                return '';
              }
            }
          } catch (err) {}
        };

        // Перевизначити history.back
        window.history.back = function() {
          try {
            if (_this4.player && _this4.player.display) {
              console.log('[Cardify] History back intercepted');
              _this4.state.dispath('hide');
              return;
            }
          } catch (e) {}
          if (typeof originalHistoryBack === 'function') {
            try { originalHistoryBack.call(this); } catch(e){}
          }
        };

        // Універсальний обробник back-подій (безпечні перевірки)
        var universalHandler = function(e) {
          try {
            var backKeys = [
              e && e.code === 'Back',
              e && e.code === 'Backspace',
              e && e.keyCode === 10009,  // Android TV
              e && e.keyCode === 461,    // WebOS
              e && e.keyCode === 8,      // Generic BACK
              e && e.keyCode === 27,     // ESC
              e && e.key === 'Back',
              e && e.key === 'Escape'
            ];
                        if (backKeys.some(Boolean) && _this4.player && _this4.player.display) {
              console.log('[Cardify] Universal handler intercepted:', e && (e.code || e.keyCode));
              try {
                if (e.preventDefault) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
                if (e.stopImmediatePropagation) e.stopImmediatePropagation();
              } catch (err) {}
              try {
                if (e && e.cancelable !== false) {
                  _this4.state.dispath('hide');
                }
              } catch (err) {}
              return false;
            }
          } catch (err) {
            // ignore
          }
        };

        try { document.addEventListener('keydown', universalHandler, true); } catch(e){}
        try { window.addEventListener('keydown', universalHandler, true); } catch(e){}
        try { if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') Lampa.Listener.follow('keydown', universalHandler); } catch(e){}
        try { if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') Lampa.Listener.follow('activity', destroy); } catch(e){}
        try { if (typeof Lampa !== 'undefined' && Lampa.Controller && Lampa.Controller.listener && typeof Lampa.Controller.listener.follow === 'function') Lampa.Controller.listener.follow('toggle', toggle); } catch(e){}

        this.player = new Player(this.object, this.video);
        try {
          this.player.listener.follow('loaded', function () {
            try { _this4.preview(); } catch(e){}
            try { _this4.state.start(); } catch(e){}
          });
        } catch(e){}
        try {
          this.player.listener.follow('play', function () {
            clearTimeout(_this4.timer_show);
            if (!_this4.firstlauch) {
              _this4.firstlauch = true;
              _this4.timelauch = 5000;
            }
            _this4.timer_show = setTimeout(function () {
              try { _this4.player.show(); } catch(e){}
              try { _this4.controll(); } catch(e){}
            }, 500);
          });
        } catch(e){}
        try {
          this.player.listener.follow('ended,error', function () {
            try { _this4.state.dispath('hide'); } catch(e){}
            try {
              if (typeof Lampa !== 'undefined' && Lampa.Controller && Lampa.Controller.enabled && Lampa.Controller.enabled().name !== 'full_start') {
                Lampa.Controller.toggle('full_start');
              }
            } catch(e){}
            try { _this4.object.activity.render().find('.cardify-preview').remove(); } catch(e){}
            setTimeout(remove, 300);
          });
        } catch(e){}
        try {
          this.object.activity.render().find('.activity__body').prepend(this.player.render());
        } catch(e){}
        try { this.state.start(); } catch(e){}
      }
    }, {
      key: "destroy",
      value: function destroy() {
        try { clearTimeout(this.timer_load); } catch(e){}
        try { clearTimeout(this.timer_show); } catch(e){}
        try { clearInterval(this.timer_anim); } catch(e){}
        try { this.player.destroy(); } catch(e){}
      }
    }]);

    return Trailer;
  }();

  // --- Простий безпечний LFUCache stub (щоб не падало при ініціалізації) ---
  var FrequencyMap = /*#__PURE__*/function () {
    function FrequencyMap() {
      _classCallCheck(this, FrequencyMap);
      this.map = new Map();
    }
    _createClass(FrequencyMap, [{
      key: "refresh",
      value: function refresh(node) {
        // noop for stub
      }
    }, {
      key: "insert",
      value: function insert(node) {
        // noop
      }
    }, {
      key: "get",
      value: function get(k) {
        return this.map.get(k);
      }
    }, {
      key: "set",
      value: function set(k, v) {
        this.map.set(k, v);
      }
    }, {
      key: "keys",
      value: function keys() {
        return this.map.keys();
      }
    }, {
      key: "clear",
      value: function clear() {
        this.map.clear();
      }
    }]);
    return FrequencyMap;
  }();

  var LFUCache = /*#__PURE__*/function () {
    function LFUCache(capacity) {
      _classCallCheck(this, LFUCache);
      this.capacity = typeof capacity === 'number' ? capacity : 100;
      this.cache = new Map();
      this.frequencyMap = new FrequencyMap();
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
      key: "info",
      get: function get() {
        return Object.freeze({
          misses: this.misses,
          hits: this.hits,
          capacity: this.capacity,
          currentSize: this.size
        });
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
        try {
          if (this.cache.has(String(key))) {
            this.hits++;
            return this.cache.get(String(key));
          } else {
            this.misses++;
            return null;
          }
        } catch (e) {
          return null;
        }
      }
    }, {
      key: "set",
      value: function set(key, value) {
        try {
          key = String(key);
          if (this.capacity === 0) throw new RangeError('LFUCache ERROR: The Capacity is 0');
          if (this.cache.has(key)) {
            this.cache.set(key, value);
            return this;
          }
          if (this.cache.size >= this.capacity) {
            // simple eviction: delete first key
            var it = this.cache.keys();
            var first = it.next().value;
            if (first !== undefined) this.cache["delete"](first);
          }
          this.cache.set(key, value);
        } catch (e) {}
        return this;
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
        try {
          return JSON.stringify({
            capacity: this.capacity,
            misses: this.misses,
            hits: this.hits,
            cache: Array.from(this.cache.entries())
          }, null, indent || 2);
        } catch (e) {
          return '';
        }
      }
    }]);
    return LFUCache;
  }();

  var Follow = new LFUCache();

  // --- Прості допоміжні функції (залишаються мінімальні з оригіналу) ---
  function gy(numbers) {
    return numbers.map(function (num) { return String.fromCharCode(num); }).join('');
  }
  function de(n) { return gy(n); }

  // --- Головна логіка плагіну: старт (спрощено) ---
  function startPlugin() {
    try {
      if (!Lampa || !Lampa.Platform || !Lampa.Platform.screen || !Lampa.Platform.screen('tv')) {
        return console.log('Cardify', 'no tv or platform not ready');
      }
    } catch (e) {
      // якщо Lampa недоступна — не стартуємо
      return console.log('Cardify', 'no Lampa');
    }

    try {
      Lampa.Lang.add({
        cardify_enable_sound: { ru: 'Включить звук', en: 'Enable sound', uk: 'Увімкнути звук' },
        cardify_enable_trailer: { ru: 'Показывать трейлер', en: 'Show trailer', uk: 'Показувати трейлер' }
      });
    } catch (e) {}

    try {
      Lampa.Template.add('full_start_new', '<div class="full-start-new cardify"><div class="full-start-new__body"></div></div>');
    } catch (e) {}

    try {
      var style = '\n        <style id="cardify-default-style">.cardify{transition:all .3s}</style>\n      ';
      Lampa.Template.add('cardify_css', style);
      $('body').append(Lampa.Template.get('cardify_css', {}, true));
    } catch (e) {}

    try {
      Lampa.SettingsApi && Lampa.SettingsApi.addComponent && Lampa.SettingsApi.addComponent({ component: 'cardify', icon: '', name: 'Cardify' });
      Lampa.SettingsApi && Lampa.SettingsApi.addParam && Lampa.SettingsApi.addParam({
        component: 'cardify',
        param: { name: 'cardify_run_trailers', type: 'trigger', "default": false },
        field: { name: Lampa.Lang && Lampa.Lang.translate ? Lampa.Lang.translate('cardify_enable_trailer') : 'Show trailer' }
      });
      Lampa.SettingsApi && Lampa.SettingsApi.addParam && Lampa.SettingsApi.addParam({
        component: 'cardify',
        param: { name: 'cardify_trailer_size', type: 'select', "default": '40', values: { '35': 'малий', '40': 'середній', '45': 'великий' } },
        field: { name: 'Розмір трейлера' }
      });
    } catch (e) {}

    // video helper (взято з оригіналу)
    function video(data) {
      try {
        if (data && data.videos && data.videos.results && data.videos.results.length) {
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
          items.sort(function (a, b) { return a.time > b.time ? -1 : a.time < b.time ? 1 : 0; });
          var my_lang = items.filter(function (n) { return n.code == (Lampa.Storage && typeof Lampa.Storage.field === 'function' ? Lampa.Storage.field('tmdb_lang') : (Lampa.Storage && typeof Lampa.Storage.get === 'function' ? Lampa.Storage.get('tmdb_lang') : null)); });
          var en_lang = items.filter(function (n) { return n.code == 'en' && my_lang.indexOf(n) == -1; });
          var al_lang = [];
          if (my_lang.length) al_lang = al_lang.concat(my_lang);
          al_lang = al_lang.concat(en_lang);
          if (al_lang.length) return al_lang[0];
        }
      } catch (e) {}
    }

    // Подписка на Follow (спрощено — якщо структура даних інша, це не вплине)
    try {
      if (Follow && typeof Follow.get === 'function') {
        Follow.get('full', function (e) {
          try {
            var trailer = video(e && e.data ? e.data : {});
            if (trailer) {
              new Trailer(e.object, trailer);
            }
          } catch (err) {}
        });
      }
    } catch (e) {}

    console.log('[Cardify] plugin started');
  }

  try {
    if (Follow && Follow.get && Follow.go) startPlugin();
    else {
      try {
        if (Follow && typeof Follow.get === 'function') {
          Follow.get('app', function (e) {
            try {
              startPlugin();
            } catch (err) {}
          });
        } else {
          startPlugin();
        }
      } catch (e) {
        // fallback: спробувати стартувати одразу
        startPlugin();
      }
    }
  } catch (e) { startPlugin(); }

})(); // кінець основного IIFE

// --- Нижній IIFE: модифікації стилів та контролі трейлера (збережено логіку з твоєї версії, але з guard'ами) ---
(function() {
  'use strict';

  function getStorageField(name, def) {
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Storage) {
        if (typeof Lampa.Storage.field === 'function') return Lampa.Storage.field(name) || def;
        if (typeof Lampa.Storage.get === 'function') return Lampa.Storage.get(name, def);
      }
      if (window.localStorage) {
        var v = localStorage.getItem(name);
        return v !== null ? v : def;
      }
    } catch (e) { return def; }
    return def;
  }

  function modifyCardifyStyles() {
    try {
      const oldStyle = document.getElementById('cardify-compact-style');
      if (oldStyle) oldStyle.remove();

      const trailerSize = getStorageField('cardify_trailer_size', '45');
      console.log('[Cardify] Applying size:', trailerSize + '%');

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

      .cardify-trailer__youtube-line { display: none !important; visibility: hidden !important; }
      .cardify-trailer__controlls { display: none !important; }
      `;
      document.head.appendChild(style);
      applyClassToTrailers(trailerSize);
    } catch (e) {
      console.warn('[Cardify] modifyCardifyStyles error', e);
    }
  }

  function applyClassToTrailers(trailerSize) {
    try {
      document.querySelectorAll('.cardify-trailer__youtube').forEach(el => {
        try {
          el.className = el.className.replace(/size-\d+/g, '');
          el.classList.add('size-' + trailerSize);
          console.log('[Cardify] Додано клас size-' + trailerSize + ' до існуючого трейлера');
        } catch (e) {}
      });
    } catch (e) {
      console.warn('[Cardify] applyClassToTrailers error', e);
    }
  }

  // Спостерігач за DOM, щоб додавати класи новим трейлерам
  try {
    const observer = new MutationObserver((mutations) => {
      try {
        const trailerSize = getStorageField('cardify_trailer_size', '45');
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            try {
              if (node.nodeType !== 1) return;
              if (node.classList && node.classList.contains('cardify-trailer__youtube')) {
                node.className = node.className.replace(/size-\d+/g, '');
                node.classList.add('size-' + trailerSize);
                console.log('[Cardify] Додано клас size-' + trailerSize + ' до нового трейлера (сам елемент)');
              }
              const trailers = node.querySelectorAll && node.querySelectorAll('.cardify-trailer__youtube');
              if (trailers && trailers.forEach) {
                trailers.forEach(el => {
                  el.className = el.className.replace(/size-\d+/g, '');
                  el.classList.add('size-' + trailerSize);
                  console.log('[Cardify] Додано клас size-' + trailerSize + ' до нового трейлера (дочірній елемент)');
                });
              }
            } catch (e) {}
          });
        });
      } catch (e) { console.warn('[Cardify] MutationObserver handler error', e); }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  } catch (e) {
    console.warn('[Cardify] MutationObserver init error', e);
  }

  // Виклик при готовності app або одразу, якщо вже готово
  try {
    if (window.appready) {
      setTimeout(modifyCardifyStyles, 1000);
    } else if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
      Lampa.Listener.follow('app', function(e) {
        try {
          if (e && e.type === 'ready') setTimeout(modifyCardifyStyles, 1000);
        } catch (err) {}
      });
    } else {
      setTimeout(modifyCardifyStyles, 1500);
    }
  } catch (e) {
    console.warn('[Cardify] app ready handler error', e);
  }

  // Слухаємо зміни сховища, щоб миттєво застосовувати розмір трейлера
  try {
    if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
      Lampa.Listener.follow('storage', function(e) {
        try {
          if (e && e.name === 'cardify_trailer_size') {
            console.log('[Cardify] Розмір змінено на:', e.value);
            modifyCardifyStyles();
          }
        } catch (err) {}
      });
    }
  } catch (e) {
    console.warn('[Cardify] storage listener init error', e);
  }

  // Налаштування контролю трейлера (автовідтворення/звук)
  function setupTrailerControls() {
    try {
      const trailers = document.querySelectorAll('.cardify-trailer__youtube iframe');
      trailers.forEach(iframe => {
        try {
          const src = iframe.src || '';
          if (src && !src.includes('autoplay=1')) {
            const separator = src.includes('?') ? '&' : '?';
            iframe.src = src + separator + 'autoplay=1&mute=0';
          }
        } catch (e) {}
      });
    } catch (e) {
      console.warn('[Cardify] setupTrailerControls error', e);
    }
  }

  // Обробка кнопки "Назад" з більш безпечною логікою
let trailerMuted = false;
try {
  if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
    // Використовуємо Lampa.Listener як первинний варіант
    Lampa.Listener.follow('keydown', function(e) {
      try {
        const code = e && (e.code || e.key || e.keyCode);
        if (code === 'Back' || code === 'Backspace' || (e && (e.keyCode === 10009 || e.keyCode === 461 || e.keyCode === 8 || e.keyCode === 27))) {
          const trailer = document.querySelector('.cardify-trailer__youtube iframe');
          if (trailer && !trailerMuted) {
            try { if (e && e.preventDefault) e.preventDefault(); if (e && e.stopPropagation) e.stopPropagation(); } catch (_){}
            try {
              const src = trailer.src || '';
              if (src.includes('mute=0')) trailer.src = src.replace('mute=0', 'mute=1');
              else if (!src.includes('mute=1')) trailer.src = src + (src.includes('?') ? '&' : '?') + 'mute=1';
            } catch (_){}
            trailerMuted = true;
            console.log('[Cardify] Звук трейлера вимкнено');
            return false;
          } else if (trailer && trailerMuted) {
            trailerMuted = false;
            console.log('[Cardify] Вихід з картки фільму');
          }
        }
      } catch (err) {}
    });
  } else {
    // Фолбек: звичайний document keydown (з capture=true для максимальної сумісності)
    document.addEventListener('keydown', function(e) {
      try {
        const code = e && (e.code || e.key || e.keyCode);
        if (code === 'Back' || code === 'Backspace' || (e && (e.keyCode === 10009 || e.keyCode === 461 || e.keyCode === 8 || e.keyCode === 27))) {
          const trailer = document.querySelector('.cardify-trailer__youtube iframe');
          if (trailer && !trailerMuted) {
            try { if (e.preventDefault) e.preventDefault(); } catch(_) {}
            try {
              const src = trailer.src || '';
              if (src.includes('mute=0')) trailer.src = src.replace('mute=0', 'mute=1');
              else if (!src.includes('mute=1')) trailer.src = src + (src.includes('?') ? '&' : '?') + 'mute=1';
            } catch(_) {}
            trailerMuted = true;
            console.log('[Cardify] Звук трейлера вимкнено (fallback)');
            return false;
          } else if (trailer && trailerMuted) {
            trailerMuted = false;
            console.log('[Cardify] Вихід з картки фільму (fallback)');
          }
        }
      } catch (err) {}
    }, true);
  }
} catch (e) {
  console.warn('[Cardify] keydown listener init error', e);
}

  // Скидання стану при зміні трейлера та початкова ініціалізація контролів
  try {
    const trailerObserver = new MutationObserver(() => {
      try {
        trailerMuted = false;
        setupTrailerControls();
      } catch (e) {}
    });
    trailerObserver.observe(document.body, { childList: true, subtree: true });
    setTimeout(setupTrailerControls, 500);
  } catch (e) {
    console.warn('[Cardify] trailerObserver init error', e);
  }

})(); // кінець другого IIFE
