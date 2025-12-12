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
  
  var LAMPAC_HOST = '{localhost}';  
  
  function decodeNumbersToString(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
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
  
  var Player = /*#__PURE__*/function () {  
    function Player(object, video) {  
      _classCallCheck(this, Player);  
  
      this.paused = false;  
      this.display = false;  
      this.ended = false;  
      this.listener = Lampa.Subscribe();  
      this.video = video;  
      this.object = object;  
      this.html = Lampa.Template.get('cardify_trailer', {  
        title: object.title  
      });  
      this.player = this.html.find('.cardify-trailer__player');  
      this.wait = this.html.find('.cardify-trailer__wait');  
      this.timelauch = 1200;  
      this.firstlauch = false;  
      this.youtube = false;  
      this.volume = 0;  
      this.position = 0;  
      this.duration = 0;  
      this.timer_view = 0;  
      this.timer_load = 0;  
      this.timer_show = 0;  
      this.timer_anim = 0;  
      this.view = false;  
      this.start = false;  
      this.size = {  
        width: 640,  
        height: 360  
      };  
      this.params = {  
        fs: 0,  
        autoplay: 1,  
        mute: 1,  
        modestbranding: 1,  
        rel: 0,  
        showinfo: 0,  
        iv_load_policy: 3,  
        controls: 0,  
        disablekb: 1,  
        enablejsapi: 1,  
        cc_load_policy: 0,  
        cc_lang_pref: 'ru',  
        widget_referrer: 'https://lampa.mx'  
      };  
      this.build();  
    }  
  
    _createClass(Player, [{  
      key: "build",  
      value: function build() {  
        var _this = this;  
  
        this.wait.css({  
          'background-size': 'cover',  
          'background-position': 'center',  
          'background-image': 'url(' + (this.object.backdrop || this.object.poster) + ')'  
        });  
        this.player.css({  
          'width': '100%',  
          'height': '100%'  
        });  
        this.player.attr('src', 'https://youtube.com/embed/' + this.video.id + '?' + $.param(this.params));  
        this.player.on('load', function () {  
          _this.onReady();  
        });  
      }  
    }, {  
      key: "onReady",  
      value: function onReady() {  
        var _this2 = this;  
  
        this.youtube = new YT.Player(this.player.get(0), {  
          events: {  
            onReady: function onReady() {  
              _this2.trigger('ready');  
            },  
            onStateChange: function onStateChange(e) {  
              _this2.onStateChange(e);  
            },  
            onPlaybackQualityChange: function onPlaybackQualityChange() {  
              _this2.trigger('quality');  
            },  
            onPlaybackRateChange: function onPlaybackRateChange() {  
              _this2.trigger('speed');  
            },  
            onError: function onError(e) {  
              _this2.trigger('error', e);  
            }  
          }  
        });  
      }  
    }, {  
      key: "onStateChange",  
      value: function onStateChange(e) {  
        if (e.data == YT.PlayerState.PLAYING) {  
          this.paused = false;  
          this.trigger('play');  
        } else if (e.data == YT.PlayerState.PAUSED) {  
          this.paused = true;  
          this.trigger('pause');  
        } else if (e.data == YT.PlayerState.ENDED) {  
          this.ended = true;  
          this.trigger('ended');  
        }  
      }  
    }, {  
      key: "play",  
      value: function play() {  
        this.youtube.playVideo();  
      }  
    }, {  
      key: "pause",  
      value: function pause() {  
        this.youtube.pauseVideo();  
      }  
    }, {  
      key: "mute",  
      value: function mute() {  
        this.youtube.mute();  
      }  
    }, {  
      key: "unMute",  
      value: function unMute() {  
        this.youtube.unMute();  
      }  
    }, {  
      key: "setSize",  
      value: function setSize(width, height) {  
        this.size.width = width;  
        this.size.height = height;  
        this.youtube.setSize(width, height);  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        this.html.remove();  
        this.youtube.destroy();  
      }  
    }, {  
      key: "trigger",  
      value: function trigger(type, data) {  
        this.listener.send(type, data);  
      }  
    }, {  
      key: "on",  
      value: function on(type, func) {  
        this.listener.follow(type, func);  
      }  
    }, {  
      key: "show",  
      value: function show() {  
        this.display = true;  
        this.trigger('display');  
      }  
    }, {  
      key: "hide",  
      value: function hide() {  
        this.display = false;  
        this.trigger('hide');  
      }  
    }, {  
      key: "render",  
      value: function render() {  
        return this.html;  
      }  
    }]);  
  
    return Player;  
  }();  
  
  // ВИПРАВЛЕНО: Другий клас Player перейменовано на Trailer  
  var Trailer = /*#__PURE__*/function () {  
    function Trailer(object, video, mute_button) {  
      _classCallCheck(this, Trailer);  
  
      object.activity.trailer_ready = true;  
      this.object = object;  
      this.video = video;  
      this.mute_button = mute_button;  
      this.player = new Player(this.object, this.video);  
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
            if (_this.player.display) state.dispath('play');else if (_this.player.loaded) {  
              _this.animate();  
  
              _this.timer_load = setTimeout(function () {  
                state.dispath('load');  
              }, _this.timelauch);  
            }  
          },  
          load: function load(state) {  
            if (_this.player.loaded && Lampa.Controller.enabled().name == 'full_start' && _this.same()) state.dispath('play');  
          },  
          play: function play(state) {  
            clearTimeout(_this.timer_load);  
            clearTimeout(_this.timer_show);  
  
            if (Lampa.Controller.enabled().name == 'full_start' && _this.same()) {  
              _this.player.show();  
              _this.player.play();  
            }  
          },  
          toggle: function toggle(state) {  
            clearTimeout(_this.timer_load);  
  
            if (Lampa.Controller.enabled().name == 'full_start' && _this.same()) {  
              state.start();  
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
        return Lampa.Activity.active().activity == this.object.activity;  
      }  
    }, {  
      key: "start",  
      value: function start() {  
        var _this2 = this;  
  
        var toggle = function toggle(e) {  
          _this2.state.dispath('toggle');  
        };  
  
        var destroy = function destroy(e) {  
          if (e.type == 'destroy' && e.object.activity === _this2.object.activity) remove();  
        };  
  
        var remove = function remove() {  
          Lampa.Listener.remove('activity', destroy);  
          Lampa.Controller.listener.remove('toggle', toggle);  
          _this2.destroy();  
        };  
  
        Lampa.Listener.follow('activity', destroy);  
        Lampa.Controller.listener.follow('toggle', toggle);  
  
        // ВИПРАВЛЕНО: Підключення кнопки звуку  
        if (this.mute_button) {  
          this.mute_button.removeClass('hide').on('hover:enter', function () {  
            _this2.player.unMute();  
          });  
        }  
  
        this.player.on('ready', function () {  
          _this2.player.loaded = true;  
          _this2.state.start();  
        });  
        this.player.on('play', function () {  
          _this2.animate();  
        });  
        this.player.on('pause', function () {  
          _this2.state.dispath('hide');  
  
          if (Lampa.Controller.enabled().name !== 'full_start') Lampa.Controller.toggle('full_start');  
  
          _this2.object.activity.render().find('.cardify-preview').remove();  
          setTimeout(remove, 300);  
        });  
        this.player.on('ended', function () {  
          _this2.state.dispath('hide');  
  
          if (Lampa.Controller.enabled().name !== 'full_start') Lampa.Controller.toggle('full_start');  
  
          _this2.object.activity.render().find('.cardify-preview').remove();  
          setTimeout(remove, 300);  
        });  
        this.player.on('error', function () {  
          _this2.state.dispath('hide');  
  
          if (Lampa.Controller.enabled().name !== 'full_start') Lampa.Controller.toggle('full_start');  
  
          _this2.object.activity.render().find('.cardify-preview').remove();  
          setTimeout(remove, 300);  
        });  
        this.object.activity.render().find('.activity__body').prepend(this.player.render());  
        this.state.start();  
      }  
    }, {  
      key: "animate",  
      value: function animate() {  
        var _this3 = this;  
  
        this.background.addClass('nodisplay');  
        this.startblock.addClass('nodisplay');  
        this.head.addClass('nodisplay');  
        this.player.setSize(this.player.size.width, this.player.size.height);  
        this.player.html.addClass('animate');  
        this.player.html.css({  
          'opacity': '1',  
          'pointer-events': 'inherit'  
        });  
        this.timer_show = setTimeout(function () {  
          _this3.player.html.addClass('shadow');  
        }, 2000);  
        this.timer_anim = setTimeout(function () {  
          _this3.player.html.removeClass('animate');  
        }, 500);  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        clearTimeout(this.timer_load);  
        clearTimeout(this.timer_show);  
        clearInterval(this.timer_anim);  
        this.player.destroy();  
      }  
    }]);  
  
    return Trailer;  
  }();
