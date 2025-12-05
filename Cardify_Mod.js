(function () {  
  'use strict';  
  
  // Перевірка наявності необхідних залежностей  
  if (typeof Lampa === 'undefined') {  
    console.error('Cardify: Lampa API не доступний');  
    return;  
  }  
  
  if (typeof $ === 'undefined') {  
    console.error('Cardify: jQuery не доступний');  
    return;  
  }  
  
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
        console.log('Cardify: invalid action:', action_name);  
      }  
    };  
  }  
  
  var Player = /*#__PURE__*/function () {  
    function Player(object, video) {  
      var _this = this;  
  
      _classCallCheck(this, Player);  
        
      // Улучшенная детекция Apple TV  
      var ua = (navigator && navigator.userAgent) ? String(navigator.userAgent).toLowerCase() : '';  
      var np = (navigator && navigator.platform) ? String(navigator.platform).toLowerCase() : '';  
      this.isAppleTV = (typeof Lampa !== 'undefined' && Lampa.Platform && Lampa.Platform.is && Lampa.Platform.is('apple_tv')) ||  
                       ua.indexOf('appletv') !== -1 ||  
                       np.indexOf('appletv') !== -1;  
        
      // Для Apple TV будем использовать изолированный iframe вместо YT API  
      // (без раннего выхода, чтобы сохранить общую разметку плеера)  
        
      // Добавляем обработчик изменения размера окна  
      this.resizeHandler = function() {  
        if (_this.display) {  
          var containerWidth = window.innerWidth;  
          var containerHeight = window.innerHeight;  
          var videoRatio = 16/9;  
          var containerRatio = containerWidth/containerHeight;  
            
          var width, height, left, top;  
            
          if (containerRatio > videoRatio) {  
              width = containerWidth;  
              height = containerWidth / videoRatio;  
              top = -(height - containerHeight) / 2;  
              left = 0;  
          } else {  
              height = containerHeight;  
              width = containerHeight * videoRatio;  
              top = 0;  
              left = -(width - containerWidth) / 2;  
          }  
            
          _this.html.find('.cardify-trailer__youtube-iframe').css({  
              width: width + 'px',  
              height: height + 'px',  
              top: top + 'px',  
              left: left + 'px'  
          });  
        }  
      };  
        
      window.addEventListener('resize', this.resizeHandler);  
  
      this.paused = false;  
      this.display = false;  
      this.ended = false;  
      this.listener = Lampa.Subscribe();  
      this.videoId = video.id; // Сохраняем ID видео  
        
      // Функция для форматирования времени в формат "1м·2с"  
      this.formatTime = function(seconds) {  
        var minutes = Math.floor(seconds / 60);  
        var secs = Math.floor(seconds % 60);  
        return minutes + 'м·' + secs + 'с';  
      };  
        
      this.html = $("\n            <div class=\"cardify-trailer\">\n                <div class=\"cardify-trailer__timeline\">\n                    <div class=\"cardify-trailer__timeline-bar\">\n                        <div class=\"cardify-trailer__timeline-progress\"></div>\n                    </div>\n                    <div class=\"cardify-trailer__timeline-time\">\n                        <span class=\"cardify-trailer__current-time\">0м·0с</span>/<span class=\"cardify-trailer__total-time\">0м·0с</span>\n                    </div>\n                </div>\n                <div class=\"cardify-trailer__youtube-overlay\"></div>\n                <div class=\"cardify-trailer__youtube-overlay-bottom\"></div>\n                <div class=\"cardify-trailer__remote\">\n                    <div class=\"cardify-trailer__remote-icon\">\n                        <svg width=\"37\" height=\"37\" viewBox=\"0 0 37 37\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                            <path d=\"M32.5196 7.22042L26.7992 12.9408C27.8463 14.5217 28.4561 16.4175 28.4561 18.4557C28.4561 20.857 27.6098 23.0605 26.1991 24.7844L31.8718 30.457C34.7226 27.2724 36.4561 23.0667 36.4561 18.4561C36.4561 14.2059 34.983 10.2998 32.5196 7.22042Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                            <path d=\"M31.262 31.1054L31.1054 31.262C31.158 31.2102 31.2102 31.158 31.262 31.1054Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                            <path d=\"M29.6917 32.5196L23.971 26.7989C22.3901 27.846 20.4943 28.4557 18.4561 28.4557C16.4179 28.4557 14.5221 27.846 12.9412 26.7989L7.22042 32.5196C10.2998 34.983 14.2059 36.4561 18.4561 36.4561C22.7062 36.4561 26.6123 34.983 29.6917 32.5196Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                            <path d=\"M5.81349 31.2688L5.64334 31.0986C5.69968 31.1557 5.7564 31.2124 5.81349 31.2688Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                            <path d=\"M5.04033 30.4571L10.7131 24.7844C9.30243 23.0605 8.4561 20.857 8.4561 18.4557C8.4561 16.4175 9.06588 14.5217 10.113 12.9408L4.39251 7.22037C1.9291 10.2998 0.456055 14.2059 0.456055 18.4561C0.456054 23.0667 2.18955 27.2724 5.04033 30.4571Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                            <path d=\"M6.45507 5.04029C9.63973 2.18953 13.8455 0.456055 18.4561 0.456055C23.0667 0.456054 27.2724 2.18955 30.4571 5.04034L24.7847 10.7127C23.0609 9.30207 20.8573 8.45575 18.4561 8.45575C16.0549 8.45575 13.8513 9.30207 12.1275 10.7127L6.45507 5.04029Z\" fill=\"white\" fill-opacity=\"0.28\"/>\n                            <circle cx=\"18.4565\" cy=\"18.4561\" r=\"7\" fill=\"white\"/>\n                        </svg>\n                    </div>\n                    <div class=\"cardify-trailer__remote-text\">" + Lampa.Lang.translate('cardify_enable_sound') + "</div>\n                </div>\n                <div class=\"cardify-trailer__youtube\">\n                    <div class=\"cardify-trailer__youtube-iframe\"></div>\n                    <div class=\"cardify-trailer__youtube-line one\"></div>\n                    <div class=\"cardify-trailer__youtube-line two\"></div>\n                </div>\n                <div class=\"cardify-trailer__controlls\">\n                    <div class=\"cardify-trailer__title\"></div>\n                </div>\n            </div>\n        ");  
  
      if (!this.isAppleTV && typeof YT !== 'undefined' && YT.Player) {  
        console.log('Cardify: YouTube API доступен, инициализация плеера...');  
        try {  
          this.youtube = new YT.Player(this.html.find('.cardify-trailer__youtube-iframe')[0], {  
            height: window.innerHeight,  
            width: window.innerWidth * (16/9), // Используем стандартное соотношение сторон 16:9  
            playerVars: {  
              'controls': 0,  
              'showinfo': 0,  
              'autohide': 1,  
              'modestbranding': 1,  
              'autoplay': 0,  
              'disablekb': 1,  
              'fs': 0,  
              'enablejsapi': 1,  
              'playsinline': 1,  
              'rel': 0,  
              'origin': window.location.origin,  
              'suggestedQuality': 'hd1080',  
              'setPlaybackQuality': 'hd1080',  
              'mute': 1,  
              'wmode': 'transparent',  
              'iv_load_policy': 3,  
              'allowsInlineMediaPlayback': true,  
              'webkit-playsinline': 1,  
              'playsInline': 1,  
              'widget_referrer': window.location.origin,  
              'cc_load_policy': 0,  
              'theme': 'dark'  
            },  
            videoId: video.id,  
            events: {  
              onReady: function onReady(event) {  
                console.log('Cardify: YouTube плеер загружен');  
                _this.loaded = true;  
                  
                // Инициализируем общее время видео  
                setTimeout(function() {  
                  var duration = _this.youtube.getDuration();  
                  if (duration > 0) {  
                    _this.html.find('.cardify-trailer__total-time').text(_this.formatTime(duration));  
                  }  
                }, 1000);  
                  
                _this.listener.send('loaded');  
              },  
              onStateChange: function onStateChange(state) {  
                if (state.data == YT.PlayerState.PLAYING) {  
                  _this.paused = false;  
                  clearInterval(_this.timer);  
                  _this.timer = setInterval(function () {  
                    var currentTime = _this.youtube.getCurrentTime();  
                    var duration = _this.youtube.getDuration();  
                    var left = duration - currentTime;  
                    var toend = 13;  
                    var fade = 5;  
  
                    // Обновляем таймлайн  
                    if (duration > 0) {  
                      var progressPercent = (currentTime / duration) * 100;  
                      _this.html.find('.cardify-trailer__timeline-progress').css('width', progressPercent + '%');  
                      _this.html.find('.cardify-trailer__current-time').text(_this.formatTime(currentTime));  
                      _this.html.find('.cardify-trailer__total-time').text(_this.formatTime(duration));  
                    }  
  
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
  
                  if (window.cardify_fist_unmute) {  
                    _this.unmute();  
                  }  
                }  
  
                if (state.data == YT.PlayerState.PAUSED) {  
                  _this.paused = true;  
                  clearInterval(_this.timer);  
                  _this.listener.send('paused');  
                  // При паузе возвращаем фоновое изображение  
                  $('.full-start__background').show();  
                  _this.html.removeClass('cardify__background');  
                }  
  
                if (state.data == YT.PlayerState.ENDED) {  
                  _this.listener.send('ended');  
                }  
  
                if (state.data == YT.PlayerState.BUFFERING) {  
                  state.target.setPlaybackQuality('hd1080');  
                }  
              },  
              onError: function onError(e) {  
                console.error('Cardify: Ошибка YouTube плеера:', e);  
                _this.loaded = false;  
                _this.listener.send('error');  
              }  
            }  
          });  
        } catch (e) {  
          console.error('Cardify: Ошибка инициализации YouTube плеера:', e);  
          _this.loaded = false;  
          _this.listener.send('error');  
        }  
      } else if (!this.isAppleTV) {  
        console.error('Cardify: YouTube API не доступен');  
        _this.loaded = false;  
        _this.listener.send('error');  
      } else {  
        // Apple TV: создаём изолированный iframe без API  
        try {  
          var iframeContainer = this.html.find('.cardify-trailer__youtube-iframe');  
          var iframe = document.createElement('iframe');  
          iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope');  
          // Без sandbox, чтобы не блокировать воспроизведение на tvOS  
          iframe.setAttribute('frameborder', '0');  
          iframe.setAttribute('allowfullscreen', '');  
          iframe.style.width = '100%';  
          iframe.style.height = '100%';  
          // Загружаем nocookie-домен и отключаем всё, что может вызвать переход  
          // На Apple TV используем www.youtube.com вместо nocookie для улучшения совместимости  
          // Загружаем nocookie-домен и отключаем всё, что может вызвать переход  
          // На Apple TV используем www.youtube.com вместо nocookie для улучшения совместимости  
          iframe.src = 'https://www.youtube.com/embed/' + this.videoId +  
                       '?playsinline=1&rel=0&modestbranding=1&autoplay=0&controls=0&fs=0&enablejsapi=0&mute=1&showinfo=0&cc_load_policy=0&iv_load_policy=3&theme=dark&disablekb=1';  
          iframeContainer.empty();  
          iframeContainer.append(iframe);  
          this.appleIframe = iframe;  
          this.loaded = true;  
          this.listener.send('loaded');  
        } catch (e) {  
          console.error('Cardify: Ошибка подготовки iframe для Apple TV:', e);  
          this.loaded = false;  
          this.listener.send('error');  
        }  
      }  
    }  
  
    _createClass(Player, [{  
      key: "play",  
      value: function play() {  
        // Ветка для Apple TV: запускаем воспроизведение в изолированном iframe  
        if (this.isAppleTV) {  
          try {  
            if (this.appleIframe) {  
              // Перезадаём src с autoplay=1, чтобы не триггерить нативное приложение  
              var base = 'https://www.youtube.com/embed/' + this.videoId;  
              var params = '?playsinline=1&rel=0&modestbranding=1&autoplay=1&controls=0&fs=0&enablejsapi=0&mute=1&showinfo=0&cc_load_policy=0&iv_load_policy=3&theme=dark&disablekb=1';  
              if (!this._applePlayedOnce) {  
                this.appleIframe.src = base + params;  
                this._applePlayedOnce = true;  
              }  
            }  
          } catch (e) {  
            console.error('Cardify: Ошибка inline-воспроизведения на Apple TV:', e);  
          }  
          return;  
        }  
          
        // Обычное воспроизведение через IFrame API  
        try {  
          if (this.youtube && typeof this.youtube.playVideo === 'function') {  
            this.youtube.playVideo();  
          }  
        } catch (e) {  
          console.error('Cardify: Ошибка воспроизведения видео:', e);  
        }  
      }  
    }, {  
      key: "pause",  
      value: function pause() {  
        try {  
          if (this.youtube && typeof this.youtube.pauseVideo === 'function') {  
            this.youtube.pauseVideo();  
          }  
        } catch (e) {  
          console.error('Cardify: Ошибка остановки видео:', e);  
        }  
      }  
    }, {  
      key: "unmute",  
      value: function unmute() {  
        try {  
          if (this.youtube && typeof this.youtube.unMute === 'function') {  
            this.youtube.unMute();  
            this.html.find('.cardify-trailer__remote').remove();  
            window.cardify_fist_unmute = true;  
          }  
        } catch (e) {  
          console.error('Cardify: Ошибка включения звука:', e);  
        }  
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
        // Сбрасываем все стили  
        this.html.css({  
          position: '',  
          top: '',  
          left: '',  
          width: '',  
          height: '',  
          zIndex: ''  
        });  
          
        this.html.find('.cardify-trailer__youtube').css({  
          position: '',  
          top: '',  
          left: '',  
          width: '',  
          height: '',  
          overflow: ''  
        });  
          
        this.html.find('.cardify-trailer__youtube-iframe').css({  
          position: '',  
          top: '',  
          left: '',  
          width: '',  
          height: ''  
        });  
          
        // Возвращаем все элементы интерфейса в исходное состояние  
        $('.full-start__background').show();  
        $('.cardify').css('z-index', '');  
        $('.head').css('z-index', '');  
          
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
          if (this.youtube && typeof this.youtube.destroy === 'function') {  
            this.youtube.destroy();  
          }  
        } catch (e) {  
          console.error('Cardify: Ошибка уничтожения плеера:', e);  
        }  
  
        clearInterval(this.timer);  
        window.removeEventListener('resize', this.resizeHandler);  
        this.html.remove();  
      }  
    }]);  
  
    return Player;  
  }();  
  
  var Trailer = /*#__PURE__*/function () {  
    function Trailer(object, video, rating) {  
      var _this = this;  
  
      _classCallCheck(this, Trailer);  
  
      console.log('Cardify: Инициализация трейлера...');  
      object.activity.trailer_ready = true;  
      this.object = object;  
      this.video = video;  
      this.rating = rating; // Сохраняем рейтинг  
      this.player;  
      this.background = this.object.activity.render().find('.full-start__background');  
      this.startblock = this.object.activity.render().find('.cardify');  
      this.head = $('.head');  
      this.timelauch = 1200;  
      this.firstlauch = false;  
      this.savedBackground = null; // Сохраняем исходный фон  
        
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
          toggle: function toggle(state) {  
            clearTimeout(_this.timer_load);  
  
            if (Lampa.Controller.enabled().name == 'cardify_trailer') ; else if (Lampa.Controller.enabled().name == 'full_start' && _this.same()) {  
              state.start();  
            } else if (_this.player.display) {  
              state.dispath('hide');  
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
      key: "renderRating",  
      value: function renderRating() {  
        console.log('Cardify: Рендеринг рейтинга...');  
        var rateLine = this.object.activity.render().find('.full-start-new__rate-line');  
        rateLine.empty(); // Очищаем контейнер  
  
        if (this.rating && typeof this.rating === 'number' && this.rating >= 0 && this.rating <= 10) {  
          var ratingText = this.rating.toFixed(1); // Округляем до 1 знака  
          var ratingHtml = '<div class="full-start__rating">' + ratingText + '/10</div>';  
  
          // Добавляем звезды  
          var stars = Math.round(this.rating / 2); // Преобразуем в 5-балльную шкалу  
          var starsHtml = '';  
          for (var i = 0; i < 5; i++) {  
            starsHtml += i < stars ?   
              '<svg class="rating-star" width="16" height="16" viewBox="0 0 16 16" fill="yellow" xmlns="http://www.w3.org/2000/svg"><path d="M8 0L10.472 5.648L16 6.128L12 10.352L13.416 16L8 13.648L2.584 16L4 10.352L0 6.128L5.528 5.648L8 0Z"/></svg>' :  
              '<svg class="rating-star" width="16" height="16" viewBox="0 0 16 16" fill="gray" xmlns="http://www.w3.org/2000/svg"><path d="M8 0L10.472 5.648L16 6.128L12 10.352L13.416 16L8 13.648L2.584 16L4 10.352L0 6.128L5.528 5.648L8 0Z"/></svg>';  
          }  
  
          rateLine.append(ratingHtml + '<div class="rating-stars">' + starsHtml + '</div>');  
          rateLine.removeClass('hide'); // Делаем видимым  
        } else {  
          console.log('Cardify: Рейтинг отсутствует или некорректен:', this.rating);  
          rateLine.append('<div class="full-start__rating">Нет рейтинга</div>');  
        }  
      }  
    }, {  
      key: "controll",  
      value: function controll() {  
        var _this3 = this;  
  
        var out = function out() {  
          if (_this3.player) {  
            _this3.player.pause();  
              
            // Восстанавливаем фон только при полном выходе  
            if (_this3.savedBackground) {  
              _this3.background.css({  
                'opacity': '1'  
              });  
            }  
  
            _this3.state.dispath('hide');  
          }  
            
          Lampa.Controller.toggle('full_start');  
        };  
  
        Lampa.Controller.add('cardify_trailer', {  
          toggle: function toggle() {  
            Lampa.Controller.clear();  
          },  
          enter: function enter() {  
            _this3.player.unmute();  
          },  
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
            // Восстанавливаем фон перед уничтожением плеера  
            if (_this3.savedBackground) {  
              _this3.background.css({  
                'opacity': '1'  
              });  
            }  
  
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
          console.log('Cardify: Плеер загружен, рендеринг превью и рейтинга...');  
          _this4.preview();  
          _this4.renderRating();  
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
              
            // Сохраняем исходный фон  
            _this4.savedBackground = _this4.background.css('background-image');  
              
            // Полностью скрываем фон  
            _this4.background.hide();  
              
            // Настраиваем контейнер для трейлера  
            _this4.player.html.css({  
              position: 'fixed',  
              top: '0',  
              left: '0',  
              width: '100%',  
              height: '100%',  
              zIndex: '0'  
            });  
              
            // Позиционируем YouTube плеер  
            _this4.player.html.find('.cardify-trailer__youtube').css({  
              position: 'absolute',  
              top: '0',  
              left: '0',  
              width: '100%',  
              height: '100%',  
              overflow: 'hidden'  
            });  
              
            // Настраиваем iframe для сохранения пропорций  
            var containerWidth = window.innerWidth;  
            var containerHeight = window.innerHeight;  
            var videoRatio = 16/9;  
            var containerRatio = containerWidth/containerHeight;  
              
            var width, height, left, top;  
              
            if (containerRatio > videoRatio) {  
                width = containerWidth;  
                height = containerWidth / videoRatio;  
                top = -(height - containerHeight) / 2;  
                left = 0;  
            } else {  
                height = containerHeight;  
                width = containerHeight * videoRatio;  
                top = 0;  
                left = -(width - containerWidth) / 2;  
            }  
              
            _this4.player.html.find('.cardify-trailer__youtube-iframe').css({  
              position: 'absolute',  
              width: width + 'px',  
              height: height + 'px',  
              top: top + 'px',  
              left: left + 'px'  
            });  
              
            // Делаем интерфейс поверх видео  
            _this4.startblock.css('z-index', '1');  
            _this4.head.css('z-index', '1');  
              
            _this4.controll();  
          }, 500);  
        });  
        this.player.listener.follow('ended,error', function () {  
          _this4.state.dispath('hide');  
  
          // Возвращаем исходный фон  
          if (_this4.savedBackground) {  
            _this4.background.css({  
              'background-image': _this4.savedBackground,  
              'opacity': '1'  
            });  
          }  
            
          // Убираем плеер  
          _this4.player.html.css({  
            position: '',  
            top: '',  
            left: '',  
            width: '',  
            height: '',  
            zIndex: ''  
          });  
            
          if (Lampa.Controller.enabled().name !== 'full_start') Lampa.Controller.toggle('full_start');  
  
          _this4.object.activity.render().find('.cardify-preview').remove();  
  
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
        if (this.player) {  
          this.player.destroy();  
        }  
      }  
    }]);  
  
    return Trailer;  
  }();  
  
  /**  
   * Find and retrieve the encryption key automatically.  
   * @param {string} str - The input encrypted string.  
   * @returns {number} - The encryption key found, or 0 if not found.  
   */  
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
    return wi[decodeNumbersToString([108, 111, 99, 97, 116, 105, 111, 110])][decodeNumbersToString([104, 111, 115, 116])].indexOf(decodeNumbersToString([98, 121, 108, 97, 109, 112, 97, 46, 111, 110, 108, 105, 110, 101])) == -1;  
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
          if (document.getElementById('diffID')) {  
            document.getElementById('diffID').innerHTML = diff;  
          }  
          shiftedCharCode = 57 - diff;  
          result = shiftedCharCode;  
        } else if (shiftedCharCode >= 48 && shiftedCharCode <= 57) {  
          result = shiftedCharCode;  
        } else if (shiftedCharCode > 57) {  
          var _diff = Math.abs(57 + 1 - shiftedCharCode) % 10;  
          while (_diff >= 10) {  
            _diff = _diff % 10;  
          }  
          if (document.getElementById('diffID')) {  
            document.getElementById('diffID').innerHTML = _diff;  
          }  
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
  
  function decodeNumbersToString(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function kthAncestor(node, k, context) {  
    if (!node) return context && context.dfs ? context.dfs() : null;  
    if (context && k >= context.connections.size) {  
      return context.root;  
    }  
    for (var i = 0; i < (context ? context.log : 0); i++) {  
        if (k & (1 << i)) {  
        node = context.up.get(node).get(i);  
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
      this.map = new Map();  
    }  
  
    _createClass(FrequencyMap, [{  
      key: "refresh",  
      value: function refresh(node) {  
        var frequency = node.frequency;  
        var freqSet = this.get(frequency);  
        if (freqSet) {  
          freqSet["delete"](node);  
        }  
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
    }, {  
      key: "has",  
      value: function has(key) {  
        return this.map.has(key);  
      }  
    }, {  
      key: "get",  
      value: function get(key) {  
        return this.map.get(key);  
      }  
    }, {  
      key: "set",  
      value: function set(key, value) {  
        this.map.set(key, value);  
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
      this.capacity = typeof Main !== 'undefined' && Main.cases ? Main.cases() : 100;  
      this.frequencyMap = binaryLifting();  
      this.free = new FrequencyMap();  
      this.cache = new Map();  
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
      key: "info",  
      get: function get() {  
        return Object.freeze({  
          misses: this.misses,  
          hits: this.hits,  
          capacity: this.capacity,  
          currentSize: this.size,  
          leastFrequency: this.leastFrequency  
        });  
      }  
    }, {  
      key: "leastFrequency",  
      get: function get() {  
        var freqCacheIterator = this.frequencyMap.keys();  
        var leastFrequency = freqCacheIterator.next().value || null;  
        var freqSet;  
        while ((freqSet = this.frequencyMap.get(leastFrequency)) && freqSet.size === 0) {  
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
          this.capacity[this.frequencyMap].follow(key + (typeof Main !== 'undefined' && Main.bynam && Main.bynam() ? '' : '_'), call);  
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
        var newNode = typeof CacheNode !== 'undefined' ? new CacheNode(key, value, frequency) : {  
          key: key,  
          value: value,  
          frequency: frequency  
        };  
        this.cache.set(key, newNode);  
        this.frequencyMap.insert(newNode);  
        return this;  
      }  
    }, {  
      key: "skodf",  
      value: function skodf(e) {  
        if (e && e.object && e.object.activity && e.object.activity.render) {  
          e.object.activity.render().find('.full-start__background').addClass('cardify__background');  
        }  
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
          if (Object.prototype.hasOwnProperty.call(cache, key)) {  
            var _cache$key = cache[key],  
                value = _cache$key.value,  
                frequency = _cache$key.frequency;  
            this.set(key, value, frequency);  
          }  
        }  
        return this;  
      }  
    }, {  
      key: "vjsk",  
      value: function vjsk(v) {  
        return this.un(v) ? v : v;  
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
        var replacer = function replacer(_, value) {  
          if (value instanceof Set) {  
            return _toConsumableArray(value);  
          }  
          if (value instanceof Map) {  
            return Object.fromEntries(value);  
          }  
          return value;  
        };  
        return JSON.stringify(this, replacer, indent);  
      }  
    }, {  
      key: "un",  
      value: function un(v) {  
        return typeof Main !== 'undefined' && Main.bynam && Main.bynam();  
      }  
    }]);  
  
    return LFUCache;  
  }();  
  
  var Follow = new LFUCache();  
  
  function gy(numbers) {  
    return numbers.map(function (num) {  
      return String.fromCharCode(num);  
    }).join('');  
  }  
  
  function re(e) {  
    return e.type == 're '.trim() + 'ad' + 'y';  
  }  
  
  function co(e) {  
    return e.type == 'co '.trim() + 'mpl' + 'ete';  
  }  
  
  function de(n) {  
    return gy(n);  
  }  
  
  var Type = {  
    re: re,  
    co: co,  
    de: de  
  };  
  
  function startPlugin() {  
    console.log('Cardify: Запуск плагина...');  
  
    if (typeof Lampa !== 'undefined' && Lampa.Platform && !Lampa.Platform.screen('tv')) {  
      console.log('Cardify: Платформа не TV, выход');  
      return;  
    }  
  
    try {  
      if (typeof Lampa !== 'undefined' && Lampa.Lang) {  
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
        console.log('Cardify: Языковые настройки добавлены');  
      }  
    } catch (e) {  
      console.error('Cardify: Ошибка добавления языковых настроек:', e);  
      return;  
    }  
  
    if (typeof Lampa !== 'undefined' && Lampa.Template) {  
      Lampa.Template.add('full_start_new', "<div class=\"full-start-new cardify\">\n        <div class=\"full-start-new__body\">\n            <div class=\"full-start-new__left hide\">\n                <div class=\"full-start-new__poster\">\n                    <img class=\"full-start-new__img full--poster\" />\n                </div>\n            </div>\n\n            <div class=\"full-start-new__right\">\n                \n                <div class=\"cardify__left\">\n                    <div class=\"full-start-new__head\"></div>\n                    <div class=\"full-start-new__title\">{title}</div>\n\n                    <div class=\"cardify__details\">\n                        <div class=\"full-start-new__details\"></div>\n                    </div>\n\n                    <div class=\"full-start-new__buttons\">\n                        <div class=\"full-start__button selector button--play\">\n                            <svg width=\"28\" height=\"29\" viewBox=\"0 0 28 29\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <circle cx=\"14\" cy=\"14.5\" r=\"13\" stroke=\"currentColor\" stroke-width=\"2.7\"/>\n                                <path d=\"M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z\" fill=\"currentColor\"/>\n                            </svg>\n\n                            <span>#{title_watch}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--book\">\n                            <svg width=\"21\" height=\"32\" viewBox=\"0 0 21 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                            <path d=\"M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n                            </svg>\n\n                            <span>#{settings_input_links}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--reaction\">\n                            <svg width=\"38\" height=\"34\" viewBox=\"0 0 38 34\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <path d=\"M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3164 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z\" fill=\"currentColor\"></path>\n                </svg>\n\n                <span>#{full_trailers}</span>\n            </div>\n        </div>\n    </div>");  
  
    var style = "\n        <style>\n        .cardify{-webkit-transition:all .3s;-o-transition:all .3s;-moz-transition:all .3s;transition:all .3s;position:relative;z-index:1}.cardify .full-start-new__body{height:80vh}.cardify .full-start-new__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end}.cardify .full-start-new__title{text-shadow:0 0 .1em rgba(0,0,0,0.3)}.cardify__left{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1}.cardify__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;position:relative}.cardify__details{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.cardify .full-start-new__reactions{margin:0;margin-right:-2.8em}.cardify .full-start-new__reactions:not(.focus){margin:0}.cardify .full-start-new__reactions:not(.focus)>div:not(:first-child){display:none}.cardify .full-start-new__reactions:not(.focus) .reaction{position:relative}.cardify .full-start-new__reactions:not(.focus) .reaction__count{position:absolute;top:28%;left:95%;font-size:1.2em;font-weight:500}.cardify .full-start-new__rate-line{margin:0;margin-left:3.5em;display:flex;align-items:center;gap:0.5em}.cardify .full-start-new__rate-line>*:last-child{margin-right:0 !important}.cardify__background{left:0}.cardify__background.loaded:not(.dim){opacity:1}.cardify__background.nodisplay{opacity:0 !important}.cardify.nodisplay{-webkit-transform:translate3d(0,50%,0);-moz-transform:translate3d(0,50%,0);transform:translate3d(0,50%,0);opacity:0}.cardify-trailer{opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s;position:fixed;top:0;left:0;width:100%;height:100%;background:#000}.cardify-trailer__timeline{position:fixed;top:0;left:0;right:0;z-index:10000;padding:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-flex-direction:column;-moz-box-orient:vertical;-moz-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end;gap:0.3em}.cardify-trailer__timeline-bar{position:relative;width:100%;height:1em;background-color:transparent;overflow:hidden}.cardify-trailer__timeline-progress{position:absolute;top:0;left:0;height:100%;background-color:#fff;width:0%;-webkit-transition:width .1s linear;-o-transition:width .1s linear;-moz-transition:width .1s linear;transition:width .1s linear;border-top-right-radius:0.2em;border-bottom-right-radius:0.2em}.cardify-trailer__timeline-time{color:#fff;font-size:0.9em;font-weight:500;text-shadow:1px 1px 2px rgba(0,0,0,0.8);-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;background-color:rgba(0,0,0,0.3);padding:0.3em 0.6em;-webkit-border-radius:1em;-moz-border-radius:1em;border-radius:1em;margin-right:1em}.cardify-trailer__youtube{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;background:#000;clip-path:inset(0 0 0 0)}.cardify-trailer__youtube iframe{border:0;width:100%;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.cardify-trailer__youtube-line{position:fixed;height:6.2em;background-color:#000;width:100%;left:0;display:none}.cardify-trailer__youtube-line.one{top:0}.cardify-trailer__youtube-line.two{bottom:0}.cardify-trailer__controlls{position:fixed;left:1.5em;right:1.5em;bottom:1.5em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end;-webkit-transform:translate3d(0,-100%,0);-moz-transform:translate3d(0,-100%,0);transform:translate3d(0,-100%,0);opacity:0;-webkit-transition:all .3s;-o-transition:all .3s;-moz-transition:all .3s;transition:all .3s}.cardify-trailer__title{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;padding-right:5em;font-size:4em;font-weight:600;overflow:hidden;-o-text-overflow:'.';text-overflow:'.';display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;line-height:1.4}.cardify-trailer__remote{position:absolute;top:20px;left:20px;z-index:9999;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;background-color:rgba(0, 0, 0, 0);padding:10px;border-radius:5px}.cardify-trailer__remote-icon{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;width:2.5em;height:2.5em}.cardify-trailer__remote-text{margin-left:1em;color:white;text-shadow:1px 1px 2px rgba(0,0,0,0.8)}.cardify-trailer.display{opacity:1}.cardify-trailer.display .cardify-trailer__controlls{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}.cardify-preview{position:absolute;bottom:100%;right:0;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;width:6em;height:4em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;background-color:#000;overflow:hidden}.cardify-preview>div{position:relative;width:100%;height:100%}.cardify-preview__img{opacity:0;position:absolute;left:0;top:0;width:100%;height:100%;-webkit-background-size:cover;-moz-background-size:cover;-o-background-size:cover;background-size:cover;-webkit-transition:opacity .2s;-o-transition:opacity .2s;-moz-transition:opacity .2s;transition:opacity .2s}.cardify-preview__img.loaded{opacity:1}.cardify-preview__loader{position:absolute;left:50%;bottom:0;-webkit-transform:translate3d(-50%,0,0);-moz-transform:translate3d(-50%,0,0);transform:translate3d(-50%,0,0);width:2em;height:2em;margin-left:-1em;background-color:rgba(0,0,0,0.5);-webkit-border-radius:0.3em;-moz-border-radius:0.3em;border-radius:0.3em}.cardify-preview__loader>div{position:absolute;top:50%;left:50%;margin-top:-0.7em;margin-left:-0.7em;width:1.4em;height:1.4em;border:0.15em solid rgba(255,255,255,0.2);border-top-color:#fff;-webkit-border-radius:100%;-moz-border-radius:100%;border-radius:100%;-webkit-animation:cardify-spin 1s linear infinite;-moz-animation:cardify-spin 1s linear infinite;animation:cardify-spin 1s linear infinite}@-webkit-keyframes cardify-spin{0%{-webkit-transform:rotate(0deg);transform:rotate(0deg)}100%{-webkit-transform:rotate(360deg);transform:rotate(360deg)}}@-moz-keyframes cardify-spin{0%{-moz-transform:rotate(0deg);transform:rotate(0deg)}100%{-moz-transform:rotate(360deg);transform:rotate(360deg)}}@keyframes cardify-spin{0%{-webkit-transform:rotate(0deg);-moz-transform:rotate(0deg);transform:rotate(0deg)}100%{-webkit-transform:rotate(360deg);-moz-transform:rotate(360deg);transform:rotate(360deg)}}.cardify__background{position:absolute;top:0;left:0;width:100%;height:100%;background-size:cover;background-position:center;background-repeat:no-repeat;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.cardify__background.dim{opacity:0.3}.cardify__background.loaded{opacity:1}.cardify__background.nodisplay{opacity:0 !important}.cardify.nodisplay{-webkit-transform:translate3d(0,50%,0);-moz-transform:translate3d(0,50%,0);transform:translate3d(0,50%,0);opacity:0}.cardify-trailer__remote{position:absolute;top:20px;left:20px;z-index:9999;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;background-color:rgba(0, 0, 0, 0);padding:10px;border-radius:5px}.cardify-trailer__remote-icon{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;width:2.5em;height:2.5em}.cardify-trailer__remote-text{margin-left:1em;color:white;text-shadow:1px 1px 2px rgba(0,0,0,0.8)}.cardify-trailer.display{opacity:1}.cardify-trailer.display .cardify-trailer__controlls{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}.cardify-preview{position:absolute;bottom:100%;right:0;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;width:6em;height:4em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;background-color:#000;overflow:hidden}.cardify-preview>div{position:relative;width:100%;height:100%}.cardify-preview__img{opacity:0;position:absolute;left:0;top:0;width:100%;height:100%;-webkit-background-size:cover;-moz-background-size:cover;-o-background-size:cover;background-size:cover;-webkit-transition:opacity .2s;-o-transition:opacity .2s;-moz-transition:opacity .2s;transition:opacity .2s}.cardify-preview__img.loaded{opacity:1}.cardify-preview__loader{position:absolute;left:50%;bottom:0;-webkit-transform:translate3d(-50%,0,0);-moz-transform:translate3d(-50%,0,0);transform:translate3d(-50%,0,0);height:.2em;-webkit-border-radius:.2em;-moz-border-radius:.2em;border-radius:.2em;background-color:#fff;width:0;-webkit-transition:width .1s linear;-o-transition:width .1s linear;-moz-transition:width .1s linear;transition:width .1s linear}.cardify-preview__line{position:absolute;height:.8em;left:0;width:100%;background-color:#000}.cardify-preview__line.one{top:0}.cardify-preview__line.two{bottom:0}.head.nodisplay{-webkit-transform:translate3d(0,-100%,0);-moz-transform:translate3d(0,-100%,0);transform:translate3d(0,-100%,0)}body:not(.menu--open) .cardify__background{-webkit-mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));-webkit-mask-image:-webkit-linear-gradient(top,white 50%,rgba(255,255,255,0) 100%);mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));mask-image:linear-gradient(to bottom,white 50%,rgba(255,255,255,0) 100%)}@-webkit-keyframes animation-full-background{0%{-webkit-transform:translate3d(0,-10%,0);transform:translate3d(0,-10%,0)}100%{-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}}@-moz-keyframes animation-full-background{0%{-moz-transform:translate3d(0,-10%,0);transform:translate3d(0,-10%,0)}100%{-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}}@-o-keyframes animation-full-background{0%{transform:translate3d(0,-10%,0)}100%{transform:translate3d(0,0,0)}}@keyframes animation-full-background{0%{-webkit-transform:translate3d(0,-10%,0);-moz-transform:translate3d(0,-10%,0);transform:translate3d(0,-10%,0)}100%{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}}@-webkit-keyframes animation-full-start-hide{0%{-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}100%{-webkit-transform:translate3d(0,50%,0);transform:translate3d(0,50%,0);opacity:0}}@-moz-keyframes animation-full-start-hide{0%{-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}100%{-moz-transform:translate3d(0,50%,0);transform:translate3d(0,50%,0);opacity:0}}@-o-keyframes animation-full-start-hide{0%{transform:translate3d(0,0,0);opacity:1}100%{transform:translate3d(0,50%,0);opacity:0}}@keyframes animation-full-start-hide{0%{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}100%{-webkit-transform:translate3d(0,50%,0);-moz-transform:translate3d(0,50%,0);transform:translate3d(0,50%,0);opacity:0}}.full-start__rating{font-size:1.2em;color:#fff;font-weight:500}.rating-stars{display:flex;gap:0.2em}.rating-star{width:1em;height:1em}.cardify-trailer__youtube-overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient(to bottom,rgba(0,0,0,1) 0%,rgba(0,0,0,0.9) 60px,rgba(0,0,0,0.7) 90px,rgba(0,0,0,0.4) 130px,rgba(0,0,0,0.1) 160px,rgba(0,0,0,0) 200px);z-index:1001;pointer-events:none}.cardify-trailer__youtube-overlay-bottom{position:absolute;bottom:0;left:0;width:100%;height:100%;background:linear-gradient(to top,rgba(0,0,0,1) 0%,rgba(0,0,0,0.9) 60px,rgba(0,0,0,0.7) 90px,rgba(0,0,0,0.4) 130px,rgba(0,0,0,0.1) 160px,rgba(0,0,0,0) 200px);z-index:1001;pointer-events:none}\n        </style>\n    ";  
  
    try {  
      if (typeof Lampa !== 'undefined' && Lampa.Template) {  
        Lampa.Template.add('cardify_css', style);  
        $('body').append(Lampa.Template.get('cardify_css', {}, true));  
        console.log('Cardify: Стили добавлены');  
      }  
    } catch (e) {  
      console.error('Cardify: Ошибка добавления стилей:', e);  
      return;  
    }  
  
    var icon = "<svg width=\"36\" height=\"28\" viewBox=\"0 0 36 28\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <rect x=\"1.5\" y=\"1.5\" width=\"33\" height=\"25\" rx=\"3.5\" stroke=\"white\" stroke-width=\"3\"/>\n        <rect x=\"5\" y=\"14\" width=\"17\" height=\"4\" rx=\"2\" fill=\"white\"/>\n        <rect x=\"5\" y=\"20\" width=\"10\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n        <rect x=\"25\" y=\"20\" width=\"6\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n    </svg>";  
  
    try {  
      if (typeof Lampa !== 'undefined' && Lampa.SettingsApi) {  
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
            name: typeof Lampa !== 'undefined' && Lampa.Lang ? Lampa.Lang.translate('cardify_enable_trailer') : 'Show trailer'  
          }  
        });  
        console.log('Cardify: Настройки добавлены');  
      }  
    } catch (e) {  
      console.error('Cardify: Ошибка добавления настроек:', e);  
      return;  
    }  
  
    function video(data) {  
      console.log('Cardify: Обработка данных для трейлера...');  
      if (data && data.videos && data.videos.results && data.videos.results.length) {  
        var items = [];  
        data.videos.results.forEach(function (element) {  
          items.push({  
            title: typeof Lampa !== 'undefined' && Lampa.Utils ? Lampa.Utils.shortText(element.name, 50) : element.name,  
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
          return n.code == (typeof Lampa !== 'undefined' && Lampa.Storage ? Lampa.Storage.field('tmdb_lang') : 'en');  
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
      console.log('Cardify: Трейлеры не найдены');  
      return null;  
    }  
  
    // Функція для створення кнопки трейлера  
    function addTrailerButton(activityObject, trailerData) {  
        var buttonHtml = '<div class="full-start__button selector cardify-trailer-button">' +  
            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none">' +  
            '<path d="M8 5v14l11-7z" fill="currentColor"/>' +  
            '</svg> Трейлер' +  
            '</div>';  
  
        var button = $(buttonHtml);  
  
        // Додаємо кнопку до контейнера з іншими кнопками  
        $('.full-start__buttons').append(button);  
  
        // Обробник кліку  
        button.on('click', function() {  
            new Trailer(activityObject, trailerData);  
        });  
    }  
  
    // Змінюємо Follow.get для ручного відтворення  
    if (typeof Follow !== 'undefined' && Follow.get) {  
      Follow.get(Type.de([102, 117, 108, 108]), function (e) {  
          if (Type.co(e)) {  
              if (Follow.skodf) Follow.skodf(e);  
              if (typeof Main !== 'undefined' && Main.cases && Main.stor && !Main.cases()[Main.stor()].field('cardify_run_trailers')) return;  
              var trailer = Follow.vjsk ? Follow.vjsk(video(e.data)) : video(e.data);  
              if (trailer) {  
                  // Зберігаємо дані та створюємо кнопку  
                  e.object.cardify_trailer = trailer;  
                  addTrailerButton(e.object, trailer);  
              }  
          }  
      });  
    }  
  }  
  
  // Bootstrap  
  if (typeof Follow !== 'undefined' && Follow.go) {  
    console.log('Cardify: Приложение готово, запуск плагина...');  
    startPlugin();  
  } else if (typeof Follow !== 'undefined' && Follow.get) {  
    Follow.get(Type.de([97, 112, 112]), function (e) {  
      if (Type.re(e)) {  
        console.log('Cardify: Событие appready, запуск плагина...');  
        startPlugin();  
      }  
    });  
  }  
  
})();
