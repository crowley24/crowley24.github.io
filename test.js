(function () {  
  'use strict';  
  
  // ===== UTILITY ФУНКЦІЇ ТА КЛАСИ =====  
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
  
  // ===== STATE MACHINE =====  
  var State = function () {  
    function State(states) {  
      _classCallCheck(this, State);  
      this.states = states;  
      this.current = null;  
    }  
  
    _createClass(State, [{  
      key: "start",  
      value: function start(name) {  
        this.current = name;  
        if (this.states[name]) this.states[name].call(this);  
      }  
    }, {  
      key: "dispath",  
      value: function dispath(name) {  
        if (this.current !== name) this.start(name);  
      }  
    }]);  
  
    return State;  
  }();  
  
  // ===== YOUTUBE PLAYER CLASS =====  
  var Player = function () {  
    function Player(object) {  
      _classCallCheck(this, Player);  
      this.object = object;  
      this.create();  
    }  
  
    _createClass(Player, [{  
      key: "create",  
      value: function create() {  
        var _this = this;  
        this.html = $('<div class="cardify-trailer"><div class="cardify-trailer__youtube"></div></div>');  
        this.player_html = this.html.find('.cardify-trailer__youtube');  
          
        this.player = new YT.Player(this.player_html[0], {  
          height: '100%',  
          width: '100%',  
          videoId: this.object.trailer.id,  
          playerVars: {  
            autoplay: 1,  
            controls: 0,  
            showinfo: 0,  
            rel: 0,  
            modestbranding: 1,  
            iv_load_policy: 3,  
            mute: 1  
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
        this.object.ready(this);  
      }  
    }, {  
      key: "onStateChange",  
      value: function onStateChange(event) {  
        if (event.data === YT.PlayerState.PLAYING) {  
          this.object.playing();  
        } else if (event.data === YT.PlayerState.ENDED) {  
          this.object.ended();  
        }  
      }  
    }, {  
      key: "mute",  
      value: function mute() {  
        if (this.player) this.player.mute();  
      }  
    }, {  
      key: "unmute",  
      value: function unmute() {  
        if (this.player) this.player.unMute();  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        if (this.player) this.player.destroy();  
        this.html.remove();  
      }  
    }]);  
  
    return Player;  
  }();  
  
  // ===== TRAILER CLASS =====  
  var Trailer = function () {  
    function Trailer(object, trailer) {  
      _classCallCheck(this, Trailer);  
      this.object = object;  
      this.trailer = trailer;  
      this.player = null;  
      this.create();  
    }  
  
    _createClass(Trailer, [{  
      key: "create",  
      value: function create() {  
        var _this = this;  
          
        this.state = new State({  
          loading: function loading() {  
            _this.loadYouTubeAPI();  
          },  
          ready: function ready() {  
            _this.player = new Player(_this);  
            $('body').append(_this.player.html);  
          },  
          playing: function playing() {  
            if (!Lampa.Storage.field('cardify_enable_sound')) {  
              _this.player.mute();  
            }  
          },  
          ended: function ended() {  
            _this.destroy();  
          }  
        });  
  
        this.state.start('loading');  
      }  
    }, {  
      key: "loadYouTubeAPI",  
      value: function loadYouTubeAPI() {  
        var _this = this;  
          
        if (typeof YT !== 'undefined' && YT.Player) {  
          this.state.dispath('ready');  
        } else {  
          var tag = document.createElement('script');  
          tag.src = "https://www.youtube.com/iframe_api";  
          var firstScriptTag = document.getElementsByTagName('script')[0];  
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);  
            
          window.onYouTubeIframeAPIReady = function() {  
            _this.state.dispath('ready');  
          };  
        }  
      }  
    }, {  
      key: "ready",  
      value: function ready(player) {  
        this.player = player;  
      }  
    }, {  
      key: "playing",  
      value: function playing() {  
        this.state.dispath('playing');  
      }  
    }, {  
      key: "ended",  
      value: function ended() {  
        this.state.dispath('ended');  
      }  
    }, {  
      key: "destroy",  
      value: function destroy() {  
        if (this.player) this.player.destroy();  
        this.state = null;  
      }  
    }]);  
  
    return Trailer;  
  }();  
  
  // ===== ОБФУСКОВАНІ ФУНКЦІЇ =====  
  function decodeNumbersToString$1(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function stor() {  
    return decodeNumbersToString$1([83, 116, 111, 114, 97, 103, 101]);  
  }  
  
  var Main = {  
    cases: function() { return window.Lampa; },  
    stor: stor  
  };  
  
  var Type = {  
    de: function(arr) { return decodeNumbersToString$1(arr); },  
    co: function(e) { return e.type === 'complite'; },  
    re: function(e) { return e.type === 'ready'; }  
  };  
  
  var Follow = {  
    go: window.appready,  
    get: function(event, callback) {  
      Lampa.Listener.follow(event, callback);  
    },  
    skodf: function() {},  
    vjsk: function(data) { return data; }  
  };  
  
  // ===== ФУНКЦІЯ ВИБОРУ ТРЕЙЛЕРА =====  
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
        return n.code === Lampa.Storage.get('language', 'ru');  
      });  
        
      return my_lang.length ? my_lang[0] : items[0];  
    }  
    return false;  
  }  
  
  // ===== ФУНКЦІЯ ЗАПУСКУ ПЛАГІНА =====  
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
      
    // HTML шаблон  
    Lampa.Template.add('full_start_new', "<div class=\"full-start-new cardify\">\n        <div class=\"full-start-new__body\">\n            <div class=\"full-start-new__left hide\">\n                <div class=\"full-start-new__poster\">\n                    <img class=\"full-start-new__img full--poster\" />\n                </div>\n            </div>\n            <div class=\"full-start-new__right\">\n                <div class=\"cardify__left\">\n                    <div class=\"full-start-new__head\"></div>\n                    <div class=\"full-start-new__title\">{title}</div>\n                    <div class=\"cardify__details\">\n                        <div class=\"full-start-new__details\"></div>\n                    </div>\n                    <div class=\"full-start-new__description\">{text}</div>\n                </div>\n            </div>\n        </div>\n    </div>");  
  
    // CSS стилі  
    var style = "\n        <style>\n        .cardify{-webkit-transition:all .3s;-moz-transition:all .3s;-o-transition:all .3s;transition:all .3s}\n        .cardify-trailer__youtube{position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:#000}\n        </style>\n    ";  
    Lampa.Template.add('cardify_css', style);  
    $('body').append(Lampa.Template.get('cardify_css', {}, true));  
  
    var icon = "<svg width=\"36\" height=\"28\" viewBox=\"0 0 36 28\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <rect x=\"1.5\" y=\"1.5\" width=\"33\" height=\"25\" rx=\"3.5\" stroke=\"white\" stroke-width=\"3\"/>\n        <rect x=\"5\" y=\"14\" width=\"17\" height=\"4\" rx=\"2\" fill=\"white\"/>\n        <rect x=\"5\" y=\"20\" width=\"10\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n        <rect x=\"25\" y=\"20\" width=\"6\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n    </svg>";  
  
    // Налаштування  
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
        name: 'cardify_enable_sound',  
        type: 'trigger',  
        "default": false  
      },  
      field: {  
        name: Lampa.Lang.translate('cardify_enable_sound')  
      }  
    });  
  
    // Підписка на подію 'full'  
    Follow.get(Type.de([102, 117, 108, 108]), function (e) {  
      if (Type.co(e)) {  
        Follow.skodf(e);  
        if (!Main.cases()[Main.stor()].field('cardify_run_trailers')) return;  
        var trailer = Follow.vjsk(video(e.data));  
  
        if (Main.cases().Manifest.app_digital >= 220) {  
          if (Main.cases().Activity.active().activity === e.object.activity) {  
            trailer && new Trailer(e.object, trailer);  
          } else {  
            var follow = function follow(a) {  
              if (a.type == Type.de([115, 116, 97, 114, 116]) && a.object.activity === e.object.activity && !e.object.activity.trailer_ready) {  
                Main.cases()[Type.de([76, 105, 115, 116, 101, 110, 101, 114])].remove('activity', follow);  
                trailer && new Trailer(e.object, trailer);  
              }  
            };  
            Follow.get('activity', follow);  
          }  
        }  
      }  
    });  
  }  
  
  // Запуск плагіна  
  if (Follow.go) startPlugin();  
  else {  
    Follow.get(Type.de([97, 112, 112]), function (e) {  
      if (Type.re(e)) startPlugin();  
    });  
  }
  function modifyCardifyStyles() {       
  const oldStyle = document.getElementById('cardify-compact-style');      
  if (oldStyle) oldStyle.remove();      
      
  const style = document.createElement('style');      
  style.id = 'cardify-compact-style';      
  style.textContent = `      
    /* Компактний оверлей замість повноекранного */      
    .cardify-trailer__youtube {      
      position: fixed !important;      
      top: 50% !important;      
      left: 50% !important;      
      transform: translate(-50%, -50%) !important;      
      width: 70% !important;      
      height: 60% !important;      
      max-width: 1200px !important;      
      max-height: 700px !important;      
      border-radius: 12px !important;      
      overflow: hidden !important;      
      box-shadow: 0 20px 60px rgba(0,0,0,0.8) !important;      
      z-index: 9999 !important;      
    }      
      
    /* Затемнення фону */      
    .cardify-trailer__youtube::before {      
      content: '' !important;      
      position: fixed !important;      
      top: 0 !important;      
      left: 0 !important;      
      right: 0 !important;      
      bottom: 0 !important;      
      background: rgba(0,0,0,0.7) !important;      
      z-index: -1 !important;      
    }      
      
    /* Анімація появи */      
    @keyframes cardify-fadein {      
      from {      
        opacity: 0;      
        transform: translate(-50%, -50%) scale(0.95);      
      }      
      to {      
        opacity: 1;      
        transform: translate(-50%, -50%) scale(1);      
      }      
    }      
      
    .cardify-trailer__youtube {      
      animation: cardify-fadein 0.3s ease-out !important;      
    }      
  `;      
      
  document.head.appendChild(style);      
  console.log('[Cardify Compact] Стилі застосовано');      
}      
      
if (window.appready) {      
  setTimeout(modifyCardifyStyles, 1000);      
} else {      
  Lampa.Listener.follow('app', function(e) {      
    if (e.type === 'ready') {      
      setTimeout(modifyCardifyStyles, 1000);      
    }      
  });      
}      
// ===== КІНЕЦЬ МОДИФІКАЦІЇ =====
