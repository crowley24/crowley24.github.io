(function () {  
  'use strict';  
    
  var LAMPAC_HOST = '{localhost}'; // Це буде замінено при завантаженні плагіна  
  
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
  
  var Player = /*#__PURE__*/function () {  
    function Player(object, video) {  
      var _this = this;  
  
      _classCallCheck(this, Player);  
  
      this.paused = false;  
      this.display = false;  
      this.ended = false;  
      this.isMuted = true; // Відстежує стан звуку  
      this.listener = Lampa.Subscribe();  
      this.youtube = false;  
      this.video = video;  
      this.html = $('<div class="cardify-trailer"><div class="cardify-trailer__youtube"></div><div class="cardify-trailer__controlls"><div class="cardify-trailer__remote selector"><div class="cardify-trailer__remote-icon"><svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 4L7 9H3V19H7L13 24V4Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M19 8C20.5 9.5 21 12 21 14C21 16 20.5 18.5 19 20" stroke="currentColor" stroke-width="2" fill="none"/><path d="M17 10C17.8 11.2 18 12.5 18 14C18 15.5 17.8 16.8 17 18" stroke="currentColor" stroke-width="2" fill="none"/></svg></div><div class="cardify-trailer__remote-text">' + Lampa.Lang.translate('cardify_enable_sound') + '</div></div></div></div>');  
      this.build();  
    }  
  
    _createClass(Player, [{  
      key: "getSoundOffIcon",  
      value: function getSoundOffIcon() {  
        return '<path d="M13 4L7 9H3V19H7L13 24V4Z" stroke="currentColor" stroke-width="2" fill="none"/>' +  
               '<path d="M19 8C20.5 9.5 21 12 21 14C21 16 20.5 18.5 19 20" stroke="currentColor" stroke-width="2" fill="none"/>' +  
               '<path d="M17 10C17.8 11.2 18 12.5 18 14C18 15.5 17.8 16.8 17 18" stroke="currentColor" stroke-width="2" fill="none"/>';  
      }  
    }, {  
      key: "getSoundOnIcon",  
      value: function getSoundOnIcon() {  
        return '<path d="M13 4L7 9H3V19H7L13 24V4Z" stroke="currentColor" stroke-width="2" fill="currentColor"/>' +  
               '<path d="M19 8C20.5 9.5 21 12 21 14C21 16 20.5 18.5 19 20" stroke="currentColor" stroke-width="2" fill="currentColor"/>' +  
               '<path d="M17 10C17.8 11.2 18 12.5 18 14C18 15.5 17.8 16.8 17 18" stroke="currentColor" stroke-width="2" fill="currentColor"/>';  
      }  
    }, {  
      key: "unmute",  
      value: function unmute() {  
        try {  
          if (this.isMuted) {  
            // Ввімкнути звук  
            this.youtube.unMute();  
            this.isMuted = false;  
            this.html.find('.cardify-trailer__remote-icon svg').html(this.getSoundOnIcon());  
            this.html.find('.cardify-trailer__remote-text').text(Lampa.Lang.translate('cardify_disable_sound'));  
          } else {  
            // Вимкнути звук  
            this.youtube.mute();  
            this.isMuted = true;  
            this.html.find('.cardify-trailer__remote-icon svg').html(this.getSoundOffIcon());  
            this.html.find('.cardify-trailer__remote-text').text(Lampa.Lang.translate('cardify_enable_sound'));  
          }  
          window.cardify_fist_unmute = true;  
        } catch (e) {}  
      }  
    }, {  
      key: "build",  
      value: function build() {  
        var _this2 = this;  
  
        this.html.find('.cardify-trailer__remote').on('hover:enter', function () {  
          _this2.unmute();  
        });  
      }  
    }, {  
      key: "create",  
      value: function create() {  
        var _this3 = this;  
  
        this.html.find('.cardify-trailer__youtube').append('<div id="youtube-trailer-' + this.video.id + '"></div>');  
        this.youtube = new YT.Player('youtube-trailer-' + this.video.id, {  
          height: '100%',  
          width: '100%',  
          videoId: this.video.id,  
          events: {  
            onReady: function onReady(e) {  
              _this3.trigger('ready');  
            },  
            onStateChange: function onStateChange(e) {  
              if (e.data === YT.PlayerState.PLAYING) {  
                _this3.trigger('play');  
              }  
  
              if (e.data === YT.PlayerState.ENDED) {  
                _this3.trigger('ended');  
              }  
            }  
          },  
          playerVars: {  
            controls: 0,  
            showinfo: 0,  
            modestbranding: 0,  
            rel: 0,  
            autoplay: 1,  
            mute: 1  
          }  
        });  
      }  
    }, {  
      key: "play",  
      value: function play() {  
        this.paused = false;  
        this.youtube.playVideo();  
      }  
    }, {  
      key: "pause",  
      value: function pause() {  
        this.paused = true;  
        this.youtube.pauseVideo();  
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
  
        try {  
          this.youtube.destroy();  
        } catch (e) {}  
  
        clearInterval(this.timer);  
        this.html.remove();  
      }  
    }]);  
  
    return Player;  
  }();  
  
  var Trailer = /*#__PURE__*/function () {  
    function Trailer(object, video, mute_button) {  
      var _this4 = this;  
  
      _classCallCheck(this, Trailer);  
  
      object.activity.trailer_ready = true;  
      this.object = object;  
      this.video = video;  
      this.mute_button = mute_button; // Зберегти кнопку  
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
            clearTimeout(_this4.timer_load);  
            if (_this4.player.display) state.dispath('play');else if (_this4.player.loaded) {  
              _this4.animate();  
  
              _this4.timer_load = setTimeout(function () {  
                state.dispath('load');  
              }, _this4.timelauch);  
            }  
          },  
          load: function load(state) {  
            if (_this4.player.loaded && Lampa.Controller.enabled().name == 'full_start' && _this4.same()) state.dispath('play');  
          },  
          play: function play() {  
            _this4.player.play();  
          },  
          toggle: function toggle(state) {  
            clearTimeout(_this4.timer_load);  
  
            if (Lampa.Controller.enabled().name == 'full_start' && _this4.same()) {  
              state.start();  
            }  
          },  
          hide: function hide() {  
            _this4.player.pause();  
            _this4.player.hide();  
            _this4.background.removeClass('nodisplay');  
            _this4.startblock.removeClass('nodisplay');  
            _this4.head.removeClass('nodisplay');  
            _this4.object.activity.render().find('.cardify-preview__loader').width(0);  
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
        var _this5 = this;  
  
        var loader = this.object.activity.render().find('.cardify-preview__loader').width(0);  
        var started = Date.now();  
        clearInterval(this.timer_anim);  
        this.timer_anim = setInterval(function () {  
          var left = Date.now() - started;  
          if (left > _this5.timelauch) clearInterval(_this5.timer_anim);  
          loader.width(Math.round(left / _this5.timelauch * 100) + '%');  
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
          invisible: true,  
          toggle: true,  
          controller: function controller() {  
            var controller = Lampa.Controller();  
  
            controller.bind('back', out);  
            controller.bind('escape', out);  
            controller.bind('menu', out);  
            controller.bind('up', out);  
            controller.bind('down', out);  
            controller.bind('left', out);  
            controller.bind('right', out);  
            return controller;  
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
  
        this.player = new Player(this.object, this.video);  
  
        // Підключити кнопку звуку  
        if (this.mute_button) {  
          this.mute_button.removeClass('hide').on('hover:enter', function () {  
            _this7.player.unmute();  
          });  
        }  
  
        this.player.listener.follow('loaded', function () {  
          _this7.preview();  
          _this7.state.start();  
        });  
        this.player.listener.follow('play', function () {  
          clearTimeout(_this7.timer_show);  
  
          if (!_this7.firstlauch) {  
            _this7.firstlauch = true;  
            _this7.timelauch = 5000;  
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
  
  var style = "\n        <style>\n        .cardify{-webkit-transition:all .3s;-o-transition:all .3s;-moz-transition:all .3s;transition:all .3s}.cardify .full-start-new__body{height:80vh}.cardify .full-start-new__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end}.cardify .full-start-new__title{text-shadow:0 0 .1em rgba(0,0,0,0.3)}.cardify__left{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1}.cardify__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;position:relative}.cardify__details{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.cardify .full-start-new__reactions{margin:0;margin-right:-2.8em}.cardify .full-start-new__reactions:not(.focus){margin:0}.cardify .full-start-new__reactions:not(.focus)>div:not(:first-child){display:none}.cardify .full-start-new__reactions:not(.focus) .reaction{position:relative}.cardify .full-start-new__reactions:not(.focus) .reaction__count{position:absolute;top:28%;left:95%;font-size:1.2em;font-weight:500}.cardify .full-start-new__rate-line{margin:0;margin-left:3.5em}.cardify .full-start-new__rate-line>*:last-child{margin-right:0 !important}.cardify__background{left:0}.cardify__background.loaded:not(.dim){opacity:1}.cardify__background.nodisplay{opacity:0 !important}.cardify.nodisplay{-webkit-transform:translate3d(0,50%,0);-moz-transform:translate3d(0,50%,0);transform:translate3d(0,50%,0);opacity:0}.cardify-trailer{opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s;z-index:1}.cardify-trailer__youtube{background-color:#000;position:fixed;top:-60%;left:0;width:100%;height:100%;-webkit-transition:top .3s;-o-transition:top .3s;-moz-transition:top .3s;transition:top .3s}.cardify-trailer.display{opacity:1}.cardify-trailer.display .cardify-trailer__youtube{top:0}.cardify-trailer__controlls{position:fixed;bottom:3em;left:0;width:100%;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-transform:translate3d(0,100px,0);-moz-transform:translate3d(0,100px,0);transform:translate3d(0,100px,0);opacity:0;-webkit-transition:all .3s;-o-transition:all .3s;-moz-transition:all .3s;transition:all .3s}.cardify-trailer.display .cardify-trailer__controlls{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}.cardify-trailer__remote{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;background-color:rgba(0,0,0,0.5);-webkit-border-radius:2em;-moz-border-radius:2em;border-radius:2em;padding:0.5em 1em}.cardify-trailer__remote-icon{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;width:2.5em;height:2.5em}.cardify-trailer__remote-text{margin-left:1em}.cardify-trailer.display{opacity:1}.cardify-trailer.display .cardify-trailer__controlls{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}.cardify-preview{position:absolute;bottom:100%;right:0;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;width:6em;height:4em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;background-color:#000;overflow:hidden}.cardify-preview>div{position:relative;width:100%;height:100%}.cardify-preview__img{opacity:0;position:absolute;left:0;top:0;width:100%;height:100%;-webkit-background-size:cover;-moz-background-size:cover;-o-background-size:cover;background-size:cover;-webkit-transition:opacity .2s;-o-transition:opacity .2s;-moz-transition:opacity .2s;transition:opacity .2s}.cardify-preview__img.loaded{opacity:1}.cardify-preview__loader{position:absolute;left:50%;bottom:0;-webkit-transform:translate3d(-50%,0,0);-moz-transform:translate3d(-50%,0,0);transform:translate3d(-50%,0,0);height:.2em;-webkit-border-radius:.2em;-moz-border-radius:.2em;border-radius:.2em;background-color:#fff;width:0;-webkit-transition:width .1s linear;-o-transition:width .1s linear;-moz-transition:width .1s linear;transition:width .1s linear}.cardify-preview__line{position:absolute;height:.8em;left:0;width:100%;background-color:#000}.cardify-preview__line.one{top:0}.cardify-preview__line.two{bottom:0}.head.nodisplay{-webkit-transform:translate3d(0,-100%,0);-moz-transform:translate3d(0,-100%,0);transform:translate3d(0,-100%,0)}body:not(.menu--open) .cardify__background{-webkit-mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));-webkit-mask-image:-webkit-linear-gradient(top,white 50%,rgba(255,255,255,0) 100%);mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));mask-image:linear-gradient(to bottom,white 50%,rgba(255,255,255,0) 100%)}\n        \n        /* PiP режим стилі */\n        .cardify-pip-mode .cardify-trailer {\n          position: fixed !important;\n          top: 20px !important;\n          right: 20px !important;\n          width: 300px !important;\n          height: 169px !important;\n          z-index: 1000 !important;\n          border-radius: 8px !important;\n          box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;\n        }\n        \n        .cardify-pip-mode .cardify-trailer__youtube {\n          top: 0 !important;\n          bottom: 0 !important;\n          width: 100% !important;\n          height: 100% !important;\n        }\n        </style>\n    ";  
  
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
        uk: 'Режим трейлера'  
      },  
      cardify_trailer_standard: {  
        ru: 'Стандартный',  
        en: 'Standard',  
        uk: 'Стандартний'  
      },  
      cardify_trailer_pip: {  
        ru: 'Картинка в картинке',  
        en: 'Picture-in-Picture',  
        uk: 'Картинка в картинці'  
      }  
    }); 
	Lampa.Template.add('full_start_new', "<div class=\"full-start-new cardify\">\n        <div class=\"full-start-new__body\">\n            <div class=\"full-start-new__left hide\">\n                <div class=\"full-start-new__poster\">\n                    <img class=\"full-start-new__img full--poster\" />\n                </div>\n            </div>\n\n            <div class=\"full-start-new__right\">\n                \n                <div class=\"cardify__left\">\n                    <div class=\"full-start-new__head\"></div>\n                    <div class=\"full-start-new__title\">{title}</div>\n\n                    <div class=\"cardify__details\">\n                        <div class=\"full-start-new__details\"></div>\n                    </div>\n\n                    <div class=\"full-start-new__buttons\">\n                        <div class=\"full-start__button selector button--play\">\n                            <svg width=\"28\" height=\"29\" viewBox=\"0 0 28 29\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <circle cx=\"14\" cy=\"14.5\" r=\"13\" stroke=\"currentColor\" stroke-width=\"2.7\"/>\n                                <path d=\"M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z\" fill=\"currentColor\"/>\n                            </svg>\n\n                            <span>#{title_watch}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--book\">\n                            <svg width=\"21\" height=\"32\" viewBox=\"0 0 21 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                            <path d=\"M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n                            </svg>\n\n                            <span>#{settings_input_links}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--reaction\">\n                            <svg width=\"28\" height=\"28\" viewBox=\"0 0 28 28\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <path d=\"M14 2C19.5228 2 24 6.47715 24 12C24 17.5228 19.5228 22 14 22C8.47715 22 4 17.5228 4 12C4 6.47715 8.47715 2 14 2Z\" stroke=\"currentColor\" stroke-width=\"2\"/>\n                                <path d=\"M10 10.5C10.8284 10.5 11.5 9.82843 11.5 9C11.5 8.17157 10.8284 7.5 10 7.5C9.17157 7.5 8.5 8.17157 8.5 9C8.5 9.82843 9.17157 10.5 10 10.5Z\" fill=\"currentColor\"/>\n                                <path d=\"M18 10.5C18.8284 10.5 19.5 9.82843 19.5 9C19.5 8.17157 18.8284 7.5 18 7.5C17.1716 7.5 16.5 8.17157 16.5 9C16.5 9.82843 17.1716 10.5 18 10.5Z\" fill=\"currentColor\"/>\n                                <path d=\"M9 15C9 16.1046 9.89543 17 11 17H17C18.1046 17 19 16.1046 19 15\" stroke=\"currentColor\" stroke-width=\"2\"/>\n                            </svg>\n\n                            <span>#{title_reactions}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--mute cardify-mute-button hide\">\n                            <svg width=\"28\" height=\"28\" viewBox=\"0 0 28 28\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <path d=\"M13 4L7 9H3V19H7L13 24V4Z\" stroke=\"currentColor\" stroke-width=\"2\" fill=\"none\"/>\n                                <path d=\"M19 8C20.5 9.5 21 12 21 14C21 16 20.5 18.5 19 20\" stroke=\"currentColor\" stroke-width=\"2\" fill=\"none\"/>\n                                <path d=\"M17 10C17.8 11.2 18 12.5 18 14C18 15.5 17.8 16.8 17 18\" stroke=\"currentColor\" stroke-width=\"2\" fill=\"none\"/>\n                            </svg>\n                            <span>\" + Lampa.Lang.translate('cardify_enable_sound') + \"</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--subscribe hide\">\n                            <svg width=\"25\" height=\"30\" viewBox=\"0 0 25 30\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <path d=\"M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z\" fill=\"currentColor\"/>\n                                <path d=\"M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n                            </svg>\n                            <span>#{title_subscribe}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--options\">\n                            <svg width=\"38\" height=\"10\" viewBox=\"0 0 38 10\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <circle cx=\"4.88968\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n                                <circle cx=\"18.9746\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n                                <circle cx=\"33.0596\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n                            </svg>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"cardify__right\">\n                    <div class=\"full-start-new__reactions selector\">\n                        <div>#{reactions_none}</div>\n                    </div>\n\n                    <div class=\"full-start-new__rate-line\">\n                        <div class=\"full-start__pg hide\"></div>\n                        <div class=\"full-start__status hide\"></div>\n                    </div>\n                </div>\n            </div>\n        </div>\n\n        <div class=\"hide buttons--container\">\n            <div class=\"full-start__button view--torrent hide\">\n                <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 50 50\" width=\"50px\" height=\"50px\">\n                    <path d=\"M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z\" fill=\"currentColor\"/>\n                </svg>\n\n                <span>#{full_torrents}</span>\n            </div>\n\n            <div class=\"full-start__button selector view--trailer\">\n                <svg height=\"70\" viewBox=\"0 0 80 70\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z\" fill=\"currentColor\"></path>\n                </svg>\n\n                <span>#{full_trailers}</span>\n            </div>\n        </div>\n    </div>\n</div>");

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
  
    Lampa.Listener.follow('full', function (e) {  
      if (e.type == 'complite' && e.data.movie) {  
        var $buttons = e.object.activity.render().find('.full-start-new__buttons');  
        var $mute_button = $buttons.find('.cardify-mute-button');  
  
        if (!Lampa.Storage.field('cardify_run_trailers')) {  
          // Трейлери вимкнено - змінюємо фон  
          var is_active = true;  
          var timer_poster;  
          var images = [];  
          var index = 0;  
  
          if (e.data.movie.backdrop_images) {  
            images = e.data.movie.backdrop_images;  
          } else if (e.data.movie.backdrops) {  
            e.data.movie.backdrops.forEach(function (elem) {  
              images.push(elem);  
            });  
          }  
  
          var change_backdrop = function change_backdrop() {  
            if (!is_active || !images.length) return;  
  
            var new_backdrop_url = images[index].url;  
  
            index++;  
            if (index >= images.length) index = 0;  
  
            var $background = e.object.activity.render().find('.full-start__background');  
  
            if ($background.length === 0) {  
              console.error('Background element not found!');  
              return;  
            }  
  
            // Видалити клас loaded перед зміною  
            $background.removeClass('loaded');  
  
            // Змінити src атрибут напряму  
            $background.attr('src', new_backdrop_url);  
  
            // Додати клас loaded після завантаження  
            $background.on('load', function () {  
              $(this).addClass('loaded');  
              $(this).off('load'); // Видалити обробник після виконання  
            });  
          };  
  
          change_backdrop();  
          timer_poster = setInterval(change_backdrop, 10000);  
  
          var stop_poster_timer = function (a) {  
            if (a.type == 'destroy' && a.object.activity === e.object.activity) {  
              clearInterval(timer_poster);  
              is_active = false;  
              Lampa.Listener.remove('activity', stop_poster_timer);  
            }  
          };  
  
          Lampa.Listener.follow('activity', stop_poster_timer);  
        } else {  
          // Отримати поточний режим  
          var trailer_mode = Lampa.Storage.field('cardify_trailer_mode');  
  
          if (trailer_mode === 'pip') {  
            // PiP режим - додати спеціальний клас  
            e.object.activity.render().addClass('cardify-pip-mode');  
          } else {  
            // Стандартний режим - видалити клас якщо є  
            e.object.activity.render().removeClass('cardify-pip-mode');  
          }  
  
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
