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
  
  // Storage function (видалено дублікат)  
  function storageSet(key, value) {  
    try {  
      localStorage.setItem(key, JSON.stringify(value));  
    } catch (e) {  
      console.warn('Failed to save to localStorage:', e);  
    }  
  }
  var Player = /*#__PURE__*/function () {  
    function Player(object, video, mute_button) {  
      _classCallCheck(this, Player);  
        
      this.object = object;  
      this.video = video;  
      this.mute_button = mute_button;  
      this.isMuted = true; // Трейлер починається в беззвучному режимі  
      this.listener = Lampa.Subscribe();  
      this.paused = false;  
      this.display = false;  
      this.ended = false;  
      this.loaded = false;  
      this.youtube = null;  
      this.html = null;  
      this.timer = null;  
      this.timelauch = 1200;  
      this.firstlauch = false;  
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
        return '<path d="M13 4L7 9H3V19H7L13 24V4Z" stroke="currentColor" stroke-width="2" fill="none"/>' +  
               '<path d="M23 7L19 11L23 15" stroke="currentColor" stroke-width="2" fill="none"/>' +  
               '<path d="M17 7L21 11L17 15" stroke="currentColor" stroke-width="2" fill="none"/>';  
      }  
    }, {  
      key: "updateMuteButton",  
      value: function updateMuteButton() {  
        if (!this.mute_button) return;  
          
        try {  
          if (this.isMuted) {  
            this.mute_button.find('svg').html(this.getSoundOffIcon());  
            this.mute_button.find('span').text(Lampa.Lang.translate('cardify_enable_sound'));  
          } else {  
            this.mute_button.find('svg').html(this.getSoundOnIcon());  
            this.mute_button.find('span').text(Lampa.Lang.translate('cardify_disable_sound'));  
          }  
        } catch (e) {  
          console.error('Error updating mute button:', e);  
        }  
      }  
    }, {  
      key: "unmute",  
      value: function unmute() {  
        try {  
          if (this.youtube && typeof this.youtube.unMute === 'function') {  
            if (this.isMuted) {  
              this.youtube.unMute();  
              this.isMuted = false;  
              this.updateMuteButton();  
            } else {  
              this.youtube.mute();  
              this.isMuted = true;  
              this.updateMuteButton();  
            }  
          }  
        } catch (e) {  
          console.error('Error toggling mute:', e);  
        }  
      }  
    }, {  
      key: "create",  
      value: function create() {  
        var _this = this;  
          
        this.html = $('<div class="cardify-trailer"><div class="cardify-trailer__youtube"></div></div>');  
          
        this.youtube = new YT.Player(this.html.find('.cardify-trailer__youtube')[0], {  
          height: '100%',  
          width: '100%',  
          videoId: this.video.id,  
          playerVars: {  
            'playsinline': 1,  
            'rel': 0,  
            'showinfo': 0,  
            'ecver': 2,  
            'mute': 1  
          },  
          events: {  
            'onReady': function onReady(event) {  
              _this.loaded = true;  
              _this.listener.send('loaded');  
            },  
            'onStateChange': function onStateChange(event) {  
              if (event.data === YT.PlayerState.ENDED) {  
                _this.ended = true;  
                _this.listener.send('ended');  
              }  
            }  
          }  
        });  
          
        return this.html;  
      }  
    }, {  
      key: "play",  
      value: function play() {  
        if (this.youtube && typeof this.youtube.playVideo === 'function') {  
          this.youtube.playVideo();  
          this.paused = false;  
        }  
      }  
    }, {  
      key: "pause",  
      value: function pause() {  
        if (this.youtube && typeof this.youtube.pauseVideo === 'function') {  
          this.youtube.pauseVideo();  
          this.paused = true;  
        }  
      }  
    }, {  
      key: "show",  
      value: function show() {  
        this.display = true;  
        this.html.show();  
      }  
    }, {  
      key: "hide",  
      value: function hide() {  
        this.display = false;  
        this.html.hide();  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        if (this.youtube) {  
          this.youtube.destroy();  
        }  
        this.listener.destroy();  
        this.html.remove();  
      }  
    }]);  
  
    return Player;  
  }();
  var Trailer = /*#__PURE__*/function () {  
    function Trailer(object, video, mute_button) {  
      _classCallCheck(this, Trailer);  
        
      this.object = object;  
      this.video = video;  
      this.mute_button = mute_button;  
      this.player = null;  
      this.background = this.object.activity.render().find('.full-start__background');  
      this.startblock = this.object.activity.render().find('.cardify');  
      this.head = $('.head');  
      this.timelauch = 1200;  
      this.firstlauch = false;  
      this.timer_load = null;  
      this.timer_show = null;  
      this.timer_anim = null;  
        
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
    }  
  
    _createClass(Trailer, [{  
      key: "same",  
      value: function same() {  
        return Lampa.Activity.active().activity === this.object.activity;  
      }  
    }, {  
      key: "animate",  
      value: function animate() {  
        var _this = this;  
          
        this.background.addClass('nodisplay');  
        this.startblock.addClass('nodisplay');  
        this.head.addClass('nodisplay');  
          
        this.timer_anim = setInterval(function () {  
          var proc = _this.object.activity.render().find('.cardify-preview__loader').width();  
          proc = proc + 1;  
          _this.object.activity.render().find('.cardify-preview__loader').width(proc);  
            
          if (proc >= 100) {  
            clearInterval(_this.timer_anim);  
            _this.state.dispath('play');  
          }  
        }, 30);  
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
  
        this.player = new Player(this.object, this.video, this.mute_button);  
          
        // Підключити кнопку звуку    
        if (this.mute_button) {    
          this.mute_button.removeClass('hide').on('hover:enter', function () {    
            _this4.player.unmute();    
          });    
        }  
  
        this.player.listener.follow('loaded', function () {  
          _this4.preview();  
          _this4.state.start();  
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
  
  // Допоміжні функції для LFUCache  
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
  function startPlugin() {  
  if (!Lampa.Platform.screen('tv')) return console.log('Cardify', 'no tv');  
    
  // Додати переклади    
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
      uk: 'Показувати трейлер'  
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
  
  // Додати шаблони  
  Lampa.Template.add('full_start_new', `<div class="full-start-new cardify">  
    <div class="full-start-new__body">  
      <div class="full-start-new__left hide">  
        <div class="full-start-new__poster">  
          <img class="full-start-new__img full--poster" />  
        </div>  
      </div>  
      <div class="full-start-new__right">  
        <div class="cardify__left">  
          <div class="full-start-new__head"></div>  
          <div class="full-start-new__title">{title}</div>  
          <div class="cardify__details">  
            <div class="full-start-new__details"></div>  
          </div>  
          <div class="full-start-new__buttons">  
            <div class="full-start__button selector button--play">  
              <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg">  
                <path d="M35.5 14C35.5 21.4558 29.4558 27.5 22 27.5C14.5442 27.5 8.5 21.4558 8.5 14C8.5 6.54416 14.5442 0.5 22 0.5C29.4558 0.5 35.5 6.54416 35.5 14Z" stroke="currentColor" stroke-width="2"/>  
                <path d="M17 9L27 14L17 19V9Z" fill="currentColor"/>  
              </svg>  
              <span>#{title_watch}</span>  
            </div>  
            <div class="full-start__button selector button--book">  
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">  
                <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>  
              </svg>  
              <span>#{settings_input_links}</span>  
            </div>  
            <div class="full-start__button selector button--reaction">  
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">  
                <path d="M14 2C19.5228 2 24 6.47715 24 12C24 17.5228 19.5228 22 14 22C8.47715 22 4 17.5228 4 12C4 6.47715 8.47715 2 14 2Z" stroke="currentColor" stroke-width="2"/>  
                <circle cx="10" cy="10" r="1.5" fill="currentColor"/>  
                <circle cx="18" cy="10" r="1.5" fill="currentColor"/>  
                <path d="M9 16C9 16 11 18 14 18C17 18 19 16 19 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>  
              </svg>  
              <span>#{title_reactions}</span>  
            </div>  
            <div class="full-start__button selector button--mute cardify-mute-button hide">  
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">  
                <path d="M13 4L7 9H3V19H7L13 24V4Z" stroke="currentColor" stroke-width="2" fill="none"/>  
                <path d="M19 8C20.5 9.5 21 12 21 14C21 16 20.5 18.5 19 20" stroke="currentColor" stroke-width="2" fill="none"/>  
                <path d="M17 10C17.8 11.2 18 12.5 18 14C18 15.5 17.8 16.8 17 18" stroke="currentColor" stroke-width="2" fill="none"/>  
              </svg>  
              <span>${Lampa.Lang.translate('cardify_enable_sound')}</span>  
            </div>  
            <div class="full-start__button selector button--subscribe hide">  
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">  
                <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5"/>  
              </svg>  
              <span>#{title_subscribe}</span>  
            </div>  
            <div class="full-start__button selector button--options">  
              <svg width="38" height="10" viewBox="0 0 38 10" fill="none" xmlns="http://www.w3.org/2000/svg">  
                <circle cx="4.88968" cy="4.98563" r="4.75394" fill="currentColor"/>  
                <circle cx="18.9746" cy="4.98563" r="4.75394" fill="currentColor"/>  
                <circle cx="33.0596" cy="4.98563" r="4.75394" fill="currentColor"/>  
              </svg>  
            </div>  
          </div>  
        </div>  
      </div>  
    </div>  
  </div>`);  
  
  // Додати CSS стилі  
  var style = `  
    <style>  
    .cardify{-webkit-transition:all .3s;-o-transition:all .3s;-moz-transition:all .3s;transition:all .3s}  
    .cardify .full-start-new__body{height:80vh}  
    .cardify .full-start-new__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end}  
    .cardify .full-start-new__title{text-shadow:0 0 .1em rgba(0,0,0,0.3)}  
    .cardify__left{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1}  
    .cardify__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}  
    .cardify__details{margin-bottom:1.5em}  
    .cardify-preview{position:absolute;top:0;left:0;width:100%;height:100%;z-index:1}  
    .cardify-preview__iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}  
    .cardify-preview__loader{position:absolute;top:0;left:0;width:0;height:3px;background:#fff;z-index:2;-webkit-transition:width .3s;-o-transition:width .3s;-moz-transition:width .3s;transition:width .3s}  
    .cardify-preview__line{position:absolute;height:.8em;left:0;width:100%;background-color:#000}  
    .cardify-preview__line.one{top:0}  
    .cardify-preview__line.two{bottom:0}  
    .head.nodisplay{-webkit-transform:translate3d(0,-100%,0);-moz-transform:translate3d(0,-100%,0);transform:translate3d(0,-100%,0)}  
    body:not(.menu--open) .cardify__background{-webkit-mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));-webkit-mask-image:-webkit-linear-gradient(top,white 50%,rgba(255,255,255,0) 100%);mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));mask-image:linear-gradient(to bottom,white 50%,rgba(255,255,255,0) 100%)}  
    .cardify-pip-mode .cardify-trailer__youtube {  
      position: fixed !important;  
      top: 20px !important;  
      right: 20px !important;  
      width: 400px !important;  
      height: 225px !important;  
      z-index: 9999 !important;  
      border-radius: 8px !important;  
      box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;  
    }  
    .cardify-pip-mode .cardify-trailer__youtube iframe {  
      border-radius: 8px !important;  
    }  
    </style>  
  `;  
    
  Lampa.Template.add('cardify_css', style);  
  $('body').append(Lampa.Template.get('cardify_css', {}, true));  
  
  // Додати іконку та компонент налаштувань  
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
      name: 'cardify_trailer_mode',  
      type: 'select',  
      values: {  
        standard: Lampa.Lang.translate('cardify_trailer_standard'),  
        pip: Lampa.Lang.translate('cardify_trailer_pip')  
      },  
      "default": 'standard'  
    },  
    field: {  
      name: Lampa.Lang.translate('cardify_trailer_mode')  
    }  
  });  
  
  // Створити кнопку звуку  
  var $mute_button = $(Lampa.Template.get('full_start_new', {}, true)).find('.cardify-mute-button');  
  
  // Слухачі подій для створення трейлерів  
  Lampa.Listener.follow('full', function (e) {  
    if (e.type == 'complite' && e.data.movie && Lampa.Storage.field('cardify_run_trailers')) {  
      var trailer = Follow.vjsk(video(e.data));  
        
      // Отримати поточний режим  
      var trailer_mode = Lampa.Storage.field('cardify_trailer_mode');  
  
      if (trailer_mode === 'pip') {  
        // PiP режим - додати спеціальний клас  
        e.object.activity.render().addClass('cardify-pip-mode');  
      } else {  
        // Стандартний режим - видалити клас якщо є  
        e.object.activity.render().removeClass('cardify-pip-mode');  
      }  
  
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
  });  
}  
  
if (window.appready) startPlugin();  
else {  
  Follow.get(Type.de([97, 112, 112]), function (e) {  
    if (Type.re(e)) startPlugin();  
  });  
}
  })(); 
