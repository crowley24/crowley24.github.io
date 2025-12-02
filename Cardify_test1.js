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

  function State(object) {
    this.state = object.state;

    this.start = function () {
      this.dispath(this.state);
    };

    this.dispath = function (action_name) {
      var action = object.transitions[action_name];

      if (action) {
        action.call(this, this);
      } else {
        console.log('invalid action');
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
      this.listener = Lampa.Subscribe();
      this.html = $("\n            <div class=\"cardify-trailer\">\n                <div class=\"cardify-trailer__youtube\">\n                    <div class=\"cardify-trailer__youtube-iframe\"></div>\n                    <div class=\"cardify-trailer__youtube-line one\"></div>\n                    <div class=\"cardify-trailer__youtube-line two\"></div>\n                </div>\n\n                <div class=\"cardify-trailer__controlls\">\n                    <div class=\"cardify-trailer__title\"></div>\n                    <div class=\"cardify-trailer__remote\">\n                        <div class=\"cardify-trailer__remote-icon\">\n                            <svg width=\"37\" height=\"37\" viewBox=\"0 0 37 37\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <path d=\"M32.5196 7.22042L26.7992 12.9408C27.8463 14.5217 28.4561 16.4175 28.4561 18.4557C28.4561 20.857 27.6098 23.0605 26.1991 24.7844L31.8718 30.457C34.7226 27.2724 36.4561 23.0667 36.4561 18.4561C36.4561 14.2059 34.983 10.2998 32.5196 7.22042Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                                <path d=\"M31.262 31.1054L31.1054 31.262C31.158 31.2102 31.2102 31.158 31.262 31.1054Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                                <path d=\"M29.6917 32.5196L23.971 26.7989C22.3901 27.846 20.4943 28.4557 18.4561 28.4557C16.4179 28.4557 14.5221 27.846 12.9412 26.7989L7.22042 32.5196C10.2998 34.983 14.2059 36.4561 18.4561 36.4561C22.7062 36.4561 26.6123 34.983 29.6917 32.5196Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                                <path d=\"M5.81349 31.2688L5.64334 31.0986C5.69968 31.1557 5.7564 31.2124 5.81349 31.2688Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                                <path d=\"M5.04033 30.4571L10.7131 24.7844C9.30243 23.0605 8.4561 20.857 8.4561 18.4557C8.4561 16.4175 9.06588 14.5217 10.113 12.9408L4.39251 7.22037C1.9291 10.2998 0.456055 14.2059 0.456055 18.4561C0.456054 23.0667 2.18955 27.2724 5.04033 30.4571Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                                <path d=\"M6.45507 5.04029C9.63973 2.18953 13.8455 0.456055 18.4561 0.456055C23.0667 0.456054 27.2724 2.18955 30.4571 5.04034L24.7847 10.7127C23.0609 9.30207 20.8573 8.45575 18.4561 8.45575C16.0549 8.45575 13.8513 9.30207 12.1275 10.7127L6.45507 5.04029Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                                <circle cx=\"18.4565\" cy=\"18.4561\" r=\"7\" fill=\"white\"/>\n                            </svg>\n                        </div>\n                        <div class=\"cardify-trailer__remote-text\">".concat(Lampa.Lang.translate('cardify_enable_sound'), "</div>\n                    </div>\n                </div>\n            </div>\n        "));

      if (typeof YT !== 'undefined' && YT.Player) {
        this.youtube = new YT.Player(this.html.find('.cardify-trailer__youtube-iframe')[0], {
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
          //'zSpYWxX4JdY',//'jk7jjaFs09U',
          //videoId: 'jk7jjaFs09U',
          events: {
            onReady: function onReady(event) {
              _this.loaded = true;

              _this.listener.send('loaded');
            },
            onStateChange: function onStateChange(state) {
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
                state.target.setPlaybackQuality('hd1080');
              }
            },
            onError: function onError(e) {
              _this.loaded = false;

              _this.listener.send('error');
            }
          }
        });
      }
    }

    _createClass(Player, [{
      key: "play",
      value: function play() {
        try {
          this.youtube.playVideo();
        } catch (e) {}
      }
    }, {
      key: "pause",
      value: function pause() {
        try {
          this.youtube.pauseVideo();
        } catch (e) {}
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
    function Trailer(object, video) {
      var _this = this;

      _classCallCheck(this, Trailer);

      object.activity.trailer_ready = true;
      this.object = object;
      this.video = video;
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
          play: function play() {
            _this.player.play();
          },
          // !!! ВИПРАВЛЕНО: Відновлена логіка для приховування трейлера
          toggle: function toggle(state) {  
            clearTimeout(_this.timer_load);  
              
            if (_this.player.display) {  
              // Якщо трейлер показується, приховати його
              state.dispath('hide');  
            } else if (Lampa.Controller.enabled().name == 'full_start' && _this.same()) {  
              // Якщо активна повна картка і трейлер прихований, спробувати його запустити
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
        return Lampa.Activity.active().activity === this.object.activity;
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
        var preview = $("\n            <div class=\"cardify-preview\">\n                <div>\n                    <img class=\"cardify-preview__img\" />\n                    <div class=\"cardify-preview__line one\"></div>\n                    <div class=\"cardify-preview__line two\"></div>\n                    <div class=\"cardify-preview__loader\"></div>\n                </div>\n            </div>\n        ");
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

        Lampa.Controller.add('cardify_trailer', {  
          toggle: function toggle() {  
            // Якщо контролер трейлера активний, і викликано toggle, прибираємо трейлер
            _this3.state.dispath('hide'); 
            Lampa.Controller.toggle('full_start');
          },  
          enter: function enter() {  
            _this3.player.unmute();  
          },  
          // !!! ВИПРАВЛЕНО: Спрощено навігацію
          left: function() {  
            Lampa.Controller.toggle('full_start');  
          },  
          up: function() {  
            Lampa.Controller.toggle('full_start');  
          },  
          down: function() {  
            Lampa.Controller.toggle('full_start');  
          },  
          right: function() {  
            Lampa.Controller.toggle('full_start');  
          },  
          back: function back() {  
            // Припиняємо трейлер і повертаємо фокус на основну картку
            _this3.object.trailerInstance = null; // Очищуємо посилання
            _this3.player.destroy();  
            _this3.object.activity.render().find('.cardify-preview').remove();  
            out();  
          }  
        });
        Lampa.Controller.toggle('cardify_trailer');
      }
    }, {
      key: "start",
      value: function start() {
        var _this4 = this;

        var _self = this; // Events //


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
        Lampa.Controller.listener.follow('toggle', toggle); // Player //

        this.player = new Player(this.object, this.video);
        this.player.listener.follow('loaded', function () {
          _this4.preview();

          _this4.state.start();
        });
        this.player.listener.follow('play', function () {
          clearTimeout(_this4.timer_show);

          if (!_this4.firstlauch) {
            _this4.firstlauch = true;
            _this4.timelauch = 5000;
          }

          _this4.timer_show = setTimeout(function () {
            _this4.player.show();

           // _this4.background.addClass('nodisplay'); // Ці рядки закоментовані в оригіналі, залишаємо так
           // _this4.startblock.addClass('nodisplay');
           // _this4.head.addClass('nodisplay');

            _this4.controll();
          }, 500);
        });
        this.player.listener.follow('ended,error', function () {
          _this4.state.dispath('hide');

          if (Lampa.Controller.enabled().name !== 'full_start') Lampa.Controller.toggle('full_start');

          _this4.object.activity.render().find('.cardify-preview').remove();
          
          _this4.object.trailerInstance = null; // <-- Очищуємо посилання на екземпляр трейлера при його завершенні

          setTimeout(remove, 300);
        });
        this.object.activity.render().find('.activity__body').prepend(this.player.render()); // Start //

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

  /**
   * Find and retrieve the encryption key automatically.
   * @param {string} str - The input encrypted string.
   * @returns {number} - The encryption key found, or 0 if not found.
   */
  // str is used to get the input of encrypted string

// ... (ОБФУСКОВАНІ/ЛІЦЕНЗІЙНІ БЛОКИ ЗАЛИШЕНО БЕЗ ЗМІН) ...

  var wordBank = ['I ', 'You ', 'We ', 'They ', 'He ', 'She ', 'It ', ' the ', 'The ', ' of ', ' is ', 'mpa', 'Is ', ' am ', 'Am ', ' are ', 'Are ', ' have ', 'Have ', ' has ', 'Has ', ' may ', 'May ', ' be ', 'Be ', 'La '];
  var wi = window;

  function keyFinder(str) {
    var inStr = str.toString(); // convert the input to String

    var outStr = ''; // store the output value

    var outStrElement = ''; // temporary store the word inside the outStr, it is used for comparison

    for (var k = 0; k < 26; k++) {
      // try the number of key shifted, the sum of character from a-z or A-Z is 26
      outStr = caesarCipherEncodeAndDecodeEngine(inStr, k); // use the encryption engine to decrypt the input string
      // loop through the whole input string

      for (var s = 0; s < outStr.length; s++) {
        for (var i = 0; i < wordBank.length; i++) {
          // initialize the outStrElement which is a temp output string for comparison,
          // use a loop to find the next digit of wordBank element and compare with outStr's digit
          for (var w = 0; w < wordBank[i].length; w++) {
            outStrElement += outStr[s + w];
          } // this part need to be optimize with the calculation of the number of occurrence of word's probabilities
          // linked list will be used in the next stage of development to calculate the number of occurrence of the key


          if (wordBank[i] === outStrElement) {
            return k; // return the key number if founded
          }

          outStrElement = ''; // reset the temp word
        } // end for ( let i=0; i < wordBank.length; i++)

      }
    }

    return 0; // return 0 if found nothing
  }

  function bynam() {
    retur