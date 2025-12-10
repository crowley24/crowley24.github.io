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
  
  var Trailer = /*#__PURE__*/function () {  
    function Trailer(object, video) {  
      _classCallCheck(this, Trailer);  
        
      this.object = object;  
      this.video = video;  
      this.html = $('<div class="cardify-trailer"></div>');  
      this.layer = $('<div class="cardify-trailer__layer"></div>');  
      this.youtube = $('<div class="cardify-trailer__youtube"></div>');  
      this.timelaunch = 500;  
      this.timer_anim = false;  
      this.state = {  
        dispath: function dispath(event) {  
          if (event == 'hide') {  
            html.find('.cardify-trailer').remove();  
          }  
        }  
      };  
        
      this.create();  
    }  
  
    _createClass(Trailer, [{  
      key: "create",  
      value: function create() {  
        var _this = this;  
          
        this.html.append(this.youtube);  
        this.html.append(this.layer);  
          
        this.player = new Player(this.youtube, this.video);  
          
        this.player.on('ready', function () {  
          _this.build();  
        });  
          
        this.player.on('ended', function () {  
          _this.destroy();  
        });  
      }  
    }, {  
      key: "build",  
      value: function build() {  
        var _this2 = this;  
          
        this.object.activity.render().find('.cardify__right').append(this.html);  
          
        setTimeout(function () {  
          _this2.html.addClass('cardify-trailer--visible');  
        }, 100);  
          
        this.startTimer();  
      }  
    }, {  
      key: "startTimer",  
      value: function startTimer() {  
        var _this3 = this;  
          
        var started = Date.now();  
        var loader = this.layer.find('.cardify-trailer__loader');  
          
        this.timer_anim = setInterval(function () {  
          var left = Date.now() - started;  
          if (left > _this3.timelaunch) clearInterval(_this3.timer_anim);  
          loader.width(Math.round(left / _this3.timelaunch * 100) + '%');  
        }, 100);  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        clearInterval(this.timer_anim);  
        this.player.destroy();  
        this.html.remove();  
      }  
    }]);  
  
    return Trailer;  
  }();  
  
  var Player = /*#__PURE__*/function () {  
    function Player(element, video) {  
      _classCallCheck(this, Player);  
        
      this.element = element;  
      this.video = video;  
      this.youtube = null;  
      this.muted = true;  
      this.events = {};  
        
      this.create();  
    }  
  
    _createClass(Player, [{  
      key: "create",  
      value: function create() {  
        var _this = this;  
          
        var iframe = $('<iframe src="' + this.video + '" frameborder="0" allowfullscreen></iframe>');  
        this.element.append(iframe);  
          
        this.youtube = new YT.Player(iframe[0], {  
          events: {  
            onReady: function onReady() {  
              _this.trigger('ready');  
            },  
            onStateChange: function onStateChange(e) {  
              if (e.data == YT.PlayerState.ENDED) {  
                _this.trigger('ended');  
              }  
            }  
          }  
        });  
      }  
    }, {  
      key: "on",  
      value: function on(name, callback) {  
        if (!this.events[name]) this.events[name] = [];  
        this.events[name].push(callback);  
      }  
    }, {  
      key: "trigger",  
      value: function trigger(name) {  
        if (this.events[name]) {  
          this.events[name].forEach(function (callback) {  
            callback();  
          });  
        }  
      }  
    }, {  
      key: "mute",  
      value: function mute() {  
        this.muted = true;  
        this.youtube.mute();  
      }  
    }, {  
      key: "unmute",  
      value: function unmute() {  
        this.muted = false;  
        this.youtube.unMute();  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        this.youtube.destroy();  
      }  
    }]);  
  
    return Player;  
  }();  
  
  // Інші утиліти та класи...  
  // LFUCache, CacheNode, Type, Follow, Main  
  
})(); // Кінець першого IIFE
// Початок другого IIFE 

(function () {  
    'use strict';  
  
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
            },  
            cardify_trailer_mode: {  
                ru: 'Режим воспроизведения трейлера',  
                en: 'Trailer playback mode',  
                uk: 'Режим відтворення трейлера',  
                be: 'Рэжым прайгравання трэйлера',  
                zh: '预告片播放模式',  
                pt: 'Modo de reprodução do trailer',  
                bg: 'Режим на възпроизвеждане на трейлъра'  
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
                en: 'Picture in Picture',  
                uk: 'Картинка в картинці',  
                be: 'Карцінка ў карцінцы',  
                zh: '画中画',  
                pt: 'Imagem em imagem',  
                bg: 'Картинка в картинка'  
            }  
        });  
  
        // Стилі для плагіна  
        var style = `  
        <style>  
        .full-start-new__head {  
            margin-bottom: 1em;  
        }  
  
        body.cardify-trailer-active .full-start__background {  
            opacity: 0 !important;  
        }  
  
        /* PiP стилі */  
        .cardify-trailer.pip-mode {  
            position: fixed !important;  
            bottom: 20px !important;  
            right: 20px !important;  
            width: 300px !important;  
            height: 200px !important;  
            z-index: 9999 !important;  
            border-radius: 8px !important;  
            box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;  
            overflow: hidden !important;  
        }  
  
        .cardify-trailer.pip-mode .cardify-trailer__youtube {  
            top: 0 !important;  
            bottom: 0 !important;  
        }  
  
        .cardify-trailer.pip-mode .cardify-trailer__controlls {  
            position: absolute !important;  
            bottom: 0 !important;  
            left: 0 !important;  
            right: 0 !important;  
            background: linear-gradient(transparent, rgba(0,0,0,0.8)) !important;  
            padding: 10px !important;  
            transform: none !important;  
            opacity: 1 !important;  
        }  
  
        /* Стилі для кнопки mute */  
        .button--trailer-mute.muted .mute-icon {  
            display: none !important;  
        }  
        .button--trailer-mute.muted .unmute-icon {  
            display: block !important;  
        }  
  
        .cardify__background {  
            background-size: cover !important;  
            background-position: center !important;  
            transition: opacity 0.3s !important;  
        }  
  
        body:not(.menu--open) .cardify__background {  
            -webkit-mask-image: -webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));  
            -webkit-mask-image: -webkit-linear-gradient(top,white 50%,rgba(255,255,255,0) 100%);  
            mask-image: -webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));  
            mask-image: linear-gradient(to bottom,white 50%,rgba(255,255,255,0) 100%);  
        }  
        </style>  
        `;  
	 Lampa.Template.add('full_start_new', `  
<div class="full-start-new cardify">  
    <div class="full-start-new__body">  
        <div class="full-start-new__left hide">  
            <div class="full-start-new__poster">  
                <img class="full-start-new__img full--poster" />  
            </div>  
        </div>  
  
        <div class="full-start-new__right">  
            <div class="cardify__left">  
                <div class="full-start-new__title">{title}</div>  
                <div class="full-start-new__head"></div>  
  
                <div class="cardify__details">  
                    <div class="full-start-new__details"></div>  
                </div>  
  
                <div class="full-start-new__buttons">  
                    <div class="full-start__button selector button--play">  
                        <svg width="28" height="29" viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg">  
                            <circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"/>  
                            <path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"/>  
                        </svg>  
                        <span>#{title_watch}</span>  
                    </div>  
  
                    <div class="full-start__button selector button--book">  
                        <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">  
                            <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>  
                        </svg>  
                        <span>#{title_book}</span>  
                    </div>  
  
                    <div class="full-start__button selector button--trailer-mute" data-trailer-mute="true">  
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">  
                            <path class="mute-icon" d="M15 8L19 12L15 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
                            <path class="mute-icon" d="M11 16H7C6.44772 16 6 15.5523 6 15V9C6 8.44772 6.44772 8 7 8H11L15 4V20L11 16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
                            <path class="unmute-icon" style="display:none" d="M5.889 16H2a1 1 0 01-1-1V9a1 1 0 011-1h3.889l5.294-4.332a.5.5 0 01.817.387v15.89a.5.5 0 01-.817.387L5.89 16z" stroke="currentColor" stroke-width="2"/>  
                            <path class="unmute-icon" style="display:none" d="M23 7L17 13M17 7l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
                        </svg>  
                        <span>#{cardify_trailer_mute}</span>  
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
  
            <div class="cardify__right">  
                <div class="full-start-new__rate">  
                    <div class="full-start-new__rate-img">  
                        <img class="full-start__img" />  
                    </div>  
                    <div class="full-start-new__rate-body">  
                        <div class="full-start-new__rate-vote"></div>  
                        <div class="full-start-new__rate-count"></div>  
                    </div>  
                </div>  
  
                <div class="full-start-new__info">  
                    <div class="full-start-new__genres"></div>  
                    <div class="full-start-new__dir-time"></div>  
                </div>  
            </div>  
        </div>  
    </div>  
  
    <div class="full-start-new__footer">  
        <div class="full-start-new__h1"></div>  
        <div class="full-start-new__descr"></div>  
        <div class="full-start-new__tags"></div>  
    </div>  
</div>`);  
  
        // Обробник кліку для кнопки mute  
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
  
        // Додаємо CSS стилі для кнопки mute  
        const muteStyle = document.createElement('style');  
        muteStyle.textContent = `  
            .button--trailer-mute.muted .mute-icon {  
                display: none !important;  
            }  
            .button--trailer-mute.muted .unmute-icon {  
                display: block !important;  
            }  
        `;  
        document.head.appendChild(muteStyle);  
  
        // Інші налаштування та ініціалізація  
        var icon = "<svg width=\"36\" height=\"28\" viewBox=\"0 0 36 28\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">  
            <rect x=\"1.5\" y=\"1.5\" width=\"33\" height=\"25\" rx=\"3.5\" stroke=\"white\" stroke-width=\"3\"/>  
            <rect x=\"5\" y=\"14\" width=\"17\" height=\"4\" rx=\"2\" fill=\"white\"/>  
            <rect x=\"5\" y=\"20\" width=\"10\" height=\"3\" rx=\"1.5\" fill=\"white\"/>  
            <rect x=\"25\" y=\"20\" width=\"6\" height=\"3\" rx=\"1.5\" fill=\"white\"/>  
        </svg>";  
  
        Lampa.SettingsApi.addComponent({  
            component: 'cardify',  
            icon: icon,  
            name: 'Cardify'  
        });  
  
        // Інші параметри налаштувань...  
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
    }  
  
    // Запуск плагіна  
    startPlugin();  
})();
