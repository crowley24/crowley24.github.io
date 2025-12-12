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
    for (var i = 0, arr2 = new Array(len); i < len; i++) {  
      arr2[i] = arr[i];  
    }  
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
  
  var Player = /*#__PURE__*/function () {  
    function Player(object, video) {  
      _classCallCheck(this, Player);  
  
      this.paused = false;  
      this.display = false;  
      this.ended = false;  
      this.listener = Lampa.Subscribe();  
      this.html = Lampa.Template.get('player_youtube');  
      this.video = video;  
      this.object = object;  
      this.callback = false;  
      this.youtube = false;  
      this.size = {  
        width: 640,  
        height: 360  
      };  
      this.videos = [];  
      this.timers = {};  
      this.waitload = false;  
      this.waitseek = false;  
      this.wait = false;  
      this.first = true;  
      this.events = {};  
      this.volume = Lampa.Storage.get('player_volume') * 100;  
      this.position = 0;  
      this.duration = 0;  
      this.custom = false;  
      this.params = {  
        controls: 0,  
        modestbranding: 1,  
        rel: 0,  
        showinfo: 0,  
        ecver: 2,  
        iv_load_policy: 3  
      };  
      this.container = this.html.find('.player-youtube__iframe');  
      this.build();  
    }  
  
    _createClass(Player, [{  
      key: "build",  
      value: function build() {  
        var _this = this;  
  
        this.container.on('load', function () {  
          _this.onReady();  
        });  
        this.container.attr('src', this.url());  
      }  
    }, {  
      key: "url",  
      value: function url() {  
        var params = '';  
  
        for (var name in this.params) {  
          params += '&' + name + '=' + this.params[name];  
        }  
  
        return 'https://www.youtube.com/embed/' + this.video.id + '?autoplay=1&enablejsapi=1' + params;  
      }  
    }, {  
      key: "onReady",  
      value: function onReady() {  
        var _this2 = this;  
  
        this.youtube = this.container[0].contentWindow;  
        this.listener.send('player', {  
          type: 'onReady',  
          data: {}  
        });  
        this.listener.follow('player', function (e) {  
          _this2.onEvent(e);  
        });  
        this.listener.send('player', {  
          type: 'addEventListener',  
          data: {  
            event: 'onStateChange'  
          }  
        });  
        this.listener.send('player', {  
          type: 'addEventListener',  
          data: {  
            event: 'onPlaybackQualityChange'  
          }  
        });  
        this.listener.send('player', {  
          type: 'addEventListener',  
          data: {  
            event: 'onError'  
          }  
        });  
        this.waitload = false;  
        this.trigger('ready');  
      }  
    }, {  
      key: "onEvent",  
      value: function onEvent(event) {  
        if (event.type == 'onStateChange') {  
          if (event.data == YT.PlayerState.PLAYING) {  
            this.paused = false;  
            this.trigger('play');  
            this.updateTime();  
          } else if (event.data == YT.PlayerState.PAUSED) {  
            this.paused = true;  
            this.trigger('pause');  
          } else if (event.data == YT.PlayerState.ENDED) {  
            this.ended = true;  
            this.trigger('ended');  
          }  
        } else if (event.type == 'onError') {  
          this.trigger('error', {  
            error: event.data  
          });  
        }  
      }  
    }, {  
      key: "updateTime",  
      value: function updateTime() {  
        var _this3 = this;  
  
        if (!this.paused && !this.ended) {  
          this.listener.send('player', {  
            type: 'getCurrentTime'  
          });  
          this.listener.send('player', {  
            type: 'getDuration'  
          });  
          this.timers.update = setTimeout(function () {  
            _this3.updateTime();  
          }, 500);  
        }  
      }  
    }, {  
      key: "play",  
      value: function play() {  
        this.listener.send('player', {  
          type: 'playVideo'  
        });  
      }  
    }, {  
      key: "pause",  
      value: function pause() {  
        this.listener.send('player', {  
          type: 'pauseVideo'  
        });  
      }  
    }, {  
      key: "mute",  
      value: function mute() {  
        this.listener.send('player', {  
          type: 'mute'  
        });  
      }  
    }, {  
      key: "unMute",  
      value: function unMute() {  
        this.listener.send('player', {  
          type: 'unMute'  
        });  
      }  
    }, {  
      key: "setVolume",  
      value: function setVolume(vol) {  
        this.listener.send('player', {  
          type: 'setVolume',  
          data: {  
            volume: vol  
          }  
        });  
      }  
    }, {  
      key: "seekTo",  
      value: function seekTo(time) {  
        this.listener.send('player', {  
          type: 'seekTo',  
          data: {  
            seconds: time  
          }  
        });  
      }  
    }, {  
      key: "setSize",  
      value: function setSize(width, height) {  
        this.size = {  
          width: width,  
          height: height  
        };  
        this.container.css({  
          width: width,  
          height: height  
        });  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        clearTimeout(this.timers.update);  
        this.listener.destroy();  
        this.container.remove();  
      }  
    }, {  
      key: "render",  
      value: function render() {  
        return this.html;  
      }  
    }, {  
      key: "on",  
      value: function on(name, callback) {  
        this.events[name] = callback;  
      }  
    }, {  
      key: "trigger",  
      value: function trigger(name, data) {  
        if (this.events[name]) this.events[name](data);  
      }  
    }]);  
  
    return Player;  
  }();  
  
  var Trailer = /*#__PURE__*/function () {  
    function Trailer(object, video, mute_button) {  
      _classCallCheck(this, Trailer);  
  
      object.activity.trailer_ready = true;  
      this.object = object;  
      this.video = video;  
      this.mute_button = mute_button;  
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
            _this.player.play();  
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
  
        // Підключити кнопку звуку    
        if (this.mute_button) {  
          this.mute_button.removeClass('hide').on('hover:enter', function () {  
            _this4.player.unMute();  
          });  
        }  
  
        this.player.listener.follow('loaded', function () {  
          _this4.preview();  
          _this4.state.start();  
        });  
        this.player.listener.follow('play', function () {  
          _this4.show();  
        });  
        this.player.listener.follow('pause', function () {  
          _this4.hide();  
        });  
        this.player.listener.follow('ended,error', function () {  
          _this4.state.dispath('hide');  
  
          if (Lampa.Controller.enabled().name !== 'full_start') Lampa.Controller.toggle('full_start');  
  
          _this4.object.activity.render().find('.cardify-preview').remove();  
  
          setTimeout(remove, 300);  
        });  
        this.object.activity.render().find('.activity__body').prepend(this.player.render());  
  
        this.state.start();  
      }  
    }, {  
      key: "same",  
      value: function same() {  
        return Lampa.Activity.active().type == 'full' && Lampa.Activity.active().card == this.object.card;  
      }  
    }, {  
      key: "animate",  
      value: function animate() {  
        var _this5 = this;  
  
        this.player.html.addClass('animate');  
        this.timer_show = setTimeout(function () {  
          _this5.player.html.addClass('shadow');  
        }, 2000);  
        this.timer_anim = setTimeout(function () {  
          _this5.player.html.removeClass('animate');  
        }, 500);  
      }  
    }, {  
      key: "show",  
      value: function show() {  
        this.player.display = true;  
        this.player.html.addClass('active');  
        this.background.addClass('nodisplay');  
        this.startblock.addClass('nodisplay');  
        this.head.addClass('nodisplay');  
      }  
    }, {  
      key: "hide",  
      value: function hide() {  
        this.player.display = false;  
        this.player.html.removeClass('active');  
      }  
    }, {  
      key: "preview",    
value: function preview() {    
  var _this6 = this;    
    
  this.player.loaded = true;    
  var html = Lampa.Template.get('cardify_preview', {    
    title: this.object.title    
  });    
  var preview = this.object.activity.render().find('.cardify-preview');  
    
  if (preview.length) {  
    preview.replaceWith(html);  
  } else {  
    this.object.activity.render().find('.activity__body').append(html);  
  }  
    
  this.player.html.find('.player-youtube__iframe').on('load', function () {  
    _this6.player.listener.send('ready');  
  });  
    
  this.player.listener.follow('ready', function () {  
    _this6.state.dispath('play');  
  });  
    
  this.player.listener.follow('loaded', function () {  
    _this6.preview();  
    _this6.state.start();  
  });  
    
  this.player.listener.follow('timeupdate', function () {  
    if (_this6.player.video.currentTime > 0.5) {  
      _this6.player.html.addClass('animate');  
    }  
  });  
    
  this.player.listener.follow('ended,error', function () {  
    _this6.state.dispath('hide');  
      
    if (Lampa.Controller.enabled().name !== 'full_start') {  
      Lampa.Controller.toggle('full_start');  
    }  
      
    _this6.object.activity.render().find('.cardify-preview').remove();  
      
    setTimeout(function () {  
      _this6.destroy();  
    }, 300);  
  });  
    
  this.object.activity.render().find('.activity__body').prepend(this.player.render());  
    
  this.state.start();  
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
        img: 'https://img.youtube.com/vi/' + element.key + '/mqdefault.jpg'  
      });  
    });  
      
    items.sort(Lampa.Arrays.sortBy('time'));  
    items.reverse();  
      
    return items[0];  
  }  
    
  return false;  
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
      ru: 'Режим трейлера',  
      en: 'Trailer mode',  
      uk: 'Режим трейлера',  
      be: 'Рэжым трэйлера',  
      zh: '预告片模式',  
      pt: 'Modo do trailer',  
      bg: 'Режим на трейлър'  
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
      en: 'Picture-in-Picture',  
      uk: 'Картинка в картинці',  
      be: 'Карцінка ў карцінцы',  
      zh: '画中画',  
      pt: 'Picture-in-Picture',  
      bg: 'Картинка в картичка'  
    }  
  });  
    
  var style = "\n        <style>\n        .cardify{-webkit-transition:all .3s;-o-transition:all .3s;-moz-transition:all .3s;transition:all .3s}\n        .cardify .full-start-new__body{height:80vh}\n        .cardify .full-start-new__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end}\n        .cardify .full-start-new__title{text-shadow:0 0 .1em rgba(0,0,0,0.3)}\n        .cardify__left{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1}\n        .cardify__details{margin-top:1em}\n        .cardify__details>*{margin-bottom:.5em}\n        .cardify__details>*:last-child{margin-bottom:0}\n        .cardify__tag{display:inline-block;padding:.2em .5em;background:rgba(0,0,0,0.5);border-radius:.2em;font-size:.8em;margin-right:.5em}\n        .cardify__tag:last-child{margin-right:0}\n        .cardify__rate{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;margin-top:.5em}\n        .cardify__rate>*{margin-right:.5em}\n        .cardify__rate>*:last-child{margin-right:0}\n        .cardify__rate-text{font-size:1.2em;font-weight:bold}\n        .cardify__rate-count{font-size:.8em;color:#999}\n        .cardify__buttons{margin-top:1em}\n        .cardify__button{display:inline-block;padding:.5em 1em;background:rgba(0,0,0,0.5);border-radius:.2em;color:#fff;text-decoration:none;margin-right:.5em}\n        .cardify__button:last-child{margin-right:0}\n        .cardify__button:hover{background:rgba(0,0,0,0.7)}\n        .cardify__button.active{background:rgba(255,255,255,0.2)}\n        .cardify-preview{position:absolute;top:0;left:0;width:100%;height:100%;background:#000;z-index:100}\n        .cardify-preview__player{position:absolute;top:0;left:0;width:100%;height:100%}\n        .cardify-preview__close{position:absolute;top:1em;right:1em;width:2em;height:2em;background:rgba(0,0,0,0.5);border-radius:50%;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;color:#fff;text-decoration:none}\n        .cardify-preview__close:hover{background:rgba(0,0,0,0.7)}\n        .cardify-preview__info{position:absolute;bottom:0;left:0;width:100%;padding:1em;background:linear-gradient(transparent,rgba(0,0,0,0.8));color:#fff}\n        .cardify-preview__title{font-size:1.2em;font-weight:bold;margin-bottom:.5em}\n        .cardify-preview__description{font-size:.9em;line-height:1.4}\n        .cardify-preview__line{position:absolute;height:.8em;left:0;width:100%;background-color:#000}\n        .cardify-preview__line.one{top:0}\n        .cardify-preview__line.two{bottom:0}\n        .head.nodisplay{-webkit-transform:translate3d(0,-100%,0);-moz-transform:translate3d(0,-100%,0);transform:translate3d(0,-100%,0)}\n        body:not(.menu--open) .cardify__background{-webkit-mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));-webkit-mask-image:-webkit-linear-gradient(top,white 50%,rgba(255,255,255,0) 100%);mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));mask-image:linear-gradient(to bottom,white 50%,rgba(255,255,255,0) 100%)}\n        </style>\n    ";  
    
  Lampa.Template.add('cardify_css', style);  
  $('body').append(Lampa.Template.get('cardify_css', {}, true));  
    
  var icon = "<svg width=\"36\" height=\"28\" viewBox=\"0 0 36 28\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <rect x=\"1.5\" y=\"1.5\" width=\"33\" height=\"25\" rx=\"3.5\" stroke=\"white\" stroke-width=\"3\"/>\n        <rect x=\"5\" y=\"14\" width=\"17\" height=\"4\" rx=\"2\" fill=\"white\"/>\n        <rect x=\"5\" y=\"20\" width=\"10\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n        <rect x=\"25\" y=\"20\" width=\"6\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n    </svg>";  
    
  Lampa.SettingsApi.addComponent({  
    component: 'cardify',  
    icon: icon,  
    name: 'Cardify'  
  });  
    
  Lampa.SettingsApi.addParam({  
    component: 'cardify',  
    param: 'run_trailers',  
    default: true,  
    name: Lampa.Lang.translate('cardify_enable_trailer')  
  });  
    
  Lampa.SettingsApi.addParam({  
    component: 'cardify',  
    param: 'trailer_mode',  
    default: 'standard',  
    name: Lampa.Lang.translate('cardify_trailer_mode'),  
    values: {  
      standard: Lampa.Lang.translate('cardify_trailer_standard'),  
      pip: Lampa.Lang.translate('cardify_trailer_pip')  
    }  
  });  
    
  Lampa.Listener.follow('full', function (e) {  
    if (e.type == 'complite' && e.data.movie && Lampa.Storage.field('cardify_run_trailers')) {  
      var data = e.data.movie;  
      var trailer_data = video(data);  
        
      if (trailer_data) {  
        var trailer_mode = Lampa.Storage.field('cardify_trailer_mode');  
          
        if (trailer_mode === 'pip') {  
          e.object.activity.render().addClass('cardify-pip-mode');  
        } else {  
          e.object.activity.render().removeClass('cardify-pip-mode');  
        }  
          
        var trailer = Follow.vjsk(trailer_data);  
        var $mute_button = e.object.activity.render().find('.cardify-mute-button');  
          
        if (Lampa.Manifest.app_digital) {  
          new Trailer(e.object, trailer, $mute_button);  
        } else {  
          var follow = function follow(a) {  
            if (a.type == 'start' && a.object.activity === e.object.activity && !e.object.activity.trailer_ready) {  
              Lampa.Listener.remove('activity', follow);  
              new Trailer(e.object, trailer, $mute_button);  
            }  
          };  
          Lampa.Listener.follow('activity', follow);  
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
