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
        return Main.bynam();
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

  function startPlugin() {
    console.log('Cardify: Ð—Ð°Ð¿ÑƒÑÐº Ð¿Ð»Ð°Ð³Ð¸Ð½Ð°...');

    if (!Lampa.Platform.screen('tv')) {
      console.log('Cardify: ÐŸÐ»Ð°Ñ‚Ñ„Ð¾Ñ€Ð¼Ð° Ð½Ðµ TV, Ð²Ñ‹Ñ…Ð¾Ð´');
      return;
    }

    try {
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
      console.log('Cardify: Ð¯Ð·Ñ‹ÐºÐ¾Ð²Ñ‹Ðµ Ð½Ð°ÑÑ‚Ñ€Ð¾Ð¹ÐºÐ¸ Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ñ‹');
    } catch (e) {
      console.error('Cardify: ÐžÑˆÐ¸Ð±ÐºÐ° Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¸Ñ ÑÐ·Ñ‹ÐºÐ¾Ð²Ñ‹Ñ… Ð½Ð°ÑÑ‚Ñ€Ð¾ÐµÐº:', e);
      return;
    }

    Lampa.Template.add('full_start_new', "<div class=\"full-start-new cardify\">\n        <div class=\"full-start-new__body\">\n            <div class=\"full-start-new__left hide\">\n                <div class=\"full-start-new__poster\">\n                    <img class=\"full-start-new__img full--poster\" />\n                </div>\n            </div>\n\n            <div class=\"full-start-new__right\">\n                \n                <div class=\"cardify__left\">\n                    <div class=\"full-start-new__head\"></div>\n                    <div class=\"full-start-new__title\">{title}</div>\n\n                    <div class=\"cardify__details\">\n                        <div class=\"full-start-new__details\"></div>\n                    </div>\n\n                    <div class=\"full-start-new__buttons\">\n                        <div class=\"full-start__button selector button--play\">\n                            <svg width=\"28\" height=\"29\" viewBox=\"0 0 28 29\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <circle cx=\"14\" cy=\"14.5\" r=\"13\" stroke=\"currentColor\" stroke-width=\"2.7\"/>\n                                <path d=\"M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z\" fill=\"currentColor\"/>\n                            </svg>\n\n                            <span>#{title_watch}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--book\">\n                            <svg width=\"21\" height=\"32\" viewBox=\"0 0 21 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                            <path d=\"M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n                            </svg>\n\n                            <span>#{settings_input_links}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--reaction\">\n                            <svg width=\"38\" height=\"34\" viewBox=\"0 0 38 34\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <path d=\"M37.208 10.9742C37.1364 10.8013 37.0314 10.6441 36.899 10.5117C36.7666 10.3794 36.6095 10.2744 36.4365 10.2028L12.0658 0.108375C11.7166 -0.0361828 11.3242 -0.0361227 10.9749 0.108542C10.6257 0.253206 10.3482 0.530634 10.2034 0.879836L0.108666 25.2507C0.0369593 25.4236 3.37953e-05 25.609 2.3187e-08 25.7962C-3.37489e-05 25.9834 0.0368249 26.1688 0.108469 26.3418C0.180114 26.5147 0.28514 26.6719 0.417545 26.8042C0.54995 26.9366 0.707139 27.0416 0.880127 27.1131L17.2452 33.8917C17.5945 34.0361 17.9869 34.0361 18.3362 33.8917L29.6574 29.2017C29.8304 29.1301 29.9875 29.0251 30.1199 28.8928C30.2523 28.7604 30.3573 28.6032 30.4289 28.4303L37.2078 12.065C37.2795 11.8921 37.3164 11.7068 37.3164 11.5196C37.3165 11.3325 37.2796 11.1471 37.208 10.9742ZM20.425 29.9407L21.8784 26.4316L25.3873 27.885L20.425 29.9407ZM28.3407 26.0222L21.6524 23.252C21.3031 23.1075 20.9107 23.1076 20.5615 23.2523C20.2123 23.3969 19.9348 23.6743 19.79 24.0235L17.0194 30.7123L3.28783 25.0247L12.2918 3.28773L34.0286 12.2912L28.3407 26.0222Z\" fill=\"currentColor\"/>\n                                <path d=\"M25.3493 16.976L24.258 14.3423L16.959 17.3666L15.7196 14.375L13.0859 15.4659L15.4161 21.0916L25.3493 16.976Z\" fill=\"currentColor\"/>\n                            </svg>                \n\n                            <span>#{title_reactions}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--subscribe hide\">\n                            <svg width=\"25\" height=\"30\" viewBox=\"0 0 25 30\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                            <path d=\"M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z\" fill=\"currentColor\"/>\n                            <path d=\"M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z\" stroke=\"currentColor\" stroke-width=\"2.5\"/>\n                            </svg>\n\n                            <span>#{title_subscribe}</span>\n                        </div>\n\n                        <div class=\"full-start__button selector button--options\">\n                            <svg width=\"38\" height=\"10\" viewBox=\"0 0 38 10\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                                <circle cx=\"4.88968\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n                                <circle cx=\"18.9746\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n                                <circle cx=\"33.0596\" cy=\"4.98563\" r=\"4.75394\" fill=\"currentColor\"/>\n                            </svg>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"cardify__right\">\n                    <div class=\"full-start-new__reactions selector\">\n                        <div>#{reactions_none}</div>\n                    </div>\n\n                    <div class=\"full-start-new__rate-line\">\n                        <div class=\"full-start__pg hide\"></div>\n                        <div class=\"full-start__status hide\"></div>\n                    </div>\n                </div>\n            </div>\n        </div>\n\n        <div class=\"hide buttons--container\">\n            <div class=\"full-start__button view--torrent hide\">\n                <svg xmlns=\"http://www.w3.org/2000/svg\"  viewBox=\"0 0 50 50\" width=\"50px\" height=\"50px\">\n                    <path d=\"M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M40.5,30.963c-3.1,0-4.9-2.4-4.9-2.4 S34.1,35,27,35c-1.4,0-3.6-0.837-3.6-0.837l4.17,9.643C26.727,43.92,25.874,44,25,44c-2.157,0-4.222-0.377-6.155-1.039L9.237,16.851 c0,0-0.7-1.2,0.4-1.5c1.1-0.3,5.4-1.2,5.4-1.2s1.475-0.494,1.8,0.5c0.5,1.3,4.063,11.112,4.063,11.112S22.6,29,27.4,29 c4.7,0,5.9-3.437,5.7-3.937c-1.2-3-4.993-11.862-4.993-11.862s-0.6-1.1,0.8-1.4c1.4-0.3,3.8-0.7,3.8-0.7s1.105-0.163,1.6,0.8 c0.738,1.437,5.193,11.262,5.193,11.262s1.1,2.9,3.3,2.9c0.464,0,0.834-0.046,1.152-0.104c-0.082,1.635-0.348,3.221-0.817,4.722 C42.541,30.867,41.756,30.963,40.5,30.963z\" fill=\"currentColor\"/>\n                </svg>\n\n                <span>#{full_torrents}</span>\n            </div>\n\n            <div class=\"full-start__button selector view--trailer\">\n                <svg height=\"70\" viewBox=\"0 0 80 70\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M71.2555 2.08955C74.6975 3.2397 77.4083 6.62804 78.3283 10.9306C80 18.7291 80 35 80 35C80 35 80 51.2709 78.3283 59.0694C77.4083 63.372 74.6975 66.7603 71.2555 67.9104C65.0167 70 40 70 40 70C40 70 14.9833 70 8.74453 67.9104C5.3025 66.7603 2.59172 63.372 1.67172 59.0694C0 51.2709 0 35 0 35C0 35 0 18.7291 1.67172 10.9306C2.59172 6.62804 5.3025 3.2395 8.74453 2.08955C14.9833 0 40 0 40 0C40 0 65.0167 0 71.2555 2.08955ZM55.5909 35.0004L29.9773 49.5714V20.4286L55.5909 35.0004Z\" fill=\"currentColor\"></path>\n                </svg>\n\n                <span>#{full_trailers}</span>\n            </div>\n        </div>\n    </div>");

    var style = "\n        <style>\n        .cardify{-webkit-transition:all .3s;-o-transition:all .3s;-moz-transition:all .3s;transition:all .3s;position:relative;z-index:1}.cardify .full-start-new__body{height:80vh}.cardify .full-start-new__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end}.cardify .full-start-new__title{text-shadow:0 0 .1em rgba(0,0,0,0.3)}.cardify__left{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1}.cardify__right{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;position:relative}.cardify__details{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.cardify .full-start-new__reactions{margin:0;margin-right:-2.8em}.cardify .full-start-new__reactions:not(.focus){margin:0}.cardify .full-start-new__reactions:not(.focus)>div:not(:first-child){display:none}.cardify .full-start-new__reactions:not(.focus) .reaction{position:relative}.cardify .full-start-new__reactions:not(.focus) .reaction__count{position:absolute;top:28%;left:95%;font-size:1.2em;font-weight:500}.cardify .full-start-new__rate-line{margin:0;margin-left:3.5em;display:flex;align-items:center;gap:0.5em}.cardify .full-start-new__rate-line>*:last-child{margin-right:0 !important}.cardify__background{left:0}.cardify__background.loaded:not(.dim){opacity:1}.cardify__background.nodisplay{opacity:0 !important}.cardify.nodisplay{-webkit-transform:translate3d(0,50%,0);-moz-transform:translate3d(0,50%,0);transform:translate3d(0,50%,0);opacity:0}.cardify-trailer{opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s;position:fixed;top:0;left:0;width:100%;height:100%;background:#000}.cardify-trailer__timeline{position:fixed;top:0;left:0;right:0;z-index:10000;padding:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-flex-direction:column;-moz-box-orient:vertical;-moz-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end;gap:0.3em}.cardify-trailer__timeline-bar{position:relative;width:100%;height:1em;background-color:transparent;overflow:hidden}.cardify-trailer__timeline-progress{position:absolute;top:0;left:0;height:100%;background-color:#fff;width:0%;-webkit-transition:width .1s linear;-o-transition:width .1s linear;-moz-transition:width .1s linear;transition:width .1s linear;border-top-right-radius:0.2em;border-bottom-right-radius:0.2em}.cardify-trailer__timeline-time{color:#fff;font-size:0.9em;font-weight:500;text-shadow:1px 1px 2px rgba(0,0,0,0.8);-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;background-color:rgba(0,0,0,0.3);padding:0.3em 0.6em;-webkit-border-radius:1em;-moz-border-radius:1em;border-radius:1em;margin-right:1em}.cardify-trailer__youtube{position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;background:#000;clip-path:inset(0 0 0 0)}.cardify-trailer__youtube iframe{border:0;width:100%;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.cardify-trailer__youtube-line{position:fixed;height:6.2em;background-color:#000;width:100%;left:0;display:none}.cardify-trailer__youtube-line.one{top:0}.cardify-trailer__youtube-line.two{bottom:0}.cardify-trailer__controlls{position:fixed;left:1.5em;right:1.5em;bottom:1.5em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:end;-webkit-align-items:flex-end;-moz-box-align:end;-ms-flex-align:end;align-items:flex-end;-webkit-transform:translate3d(0,-100%,0);-moz-transform:translate3d(0,-100%,0);transform:translate3d(0,-100%,0);opacity:0;-webkit-transition:all .3s;-o-transition:all .3s;-moz-transition:all .3s;transition:all .3s}.cardify-trailer__title{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;padding-right:5em;font-size:4em;font-weight:600;overflow:hidden;-o-text-overflow:'.';text-overflow:'.';display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;line-height:1.4}.cardify-trailer__remote{position:absolute;top:20px;left:20px;z-index:9999;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;background-color:rgba(0, 0, 0, 0);padding:10px;border-radius:5px}.cardify-trailer__remote-icon{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;width:2.5em;height:2.5em}.cardify-trailer__remote-text{margin-left:1em;color:white;text-shadow:1px 1px 2px rgba(0,0,0,0.8)}.cardify-trailer.display{opacity:1}.cardify-trailer.display .cardify-trailer__controlls{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}.cardify-preview{position:absolute;bottom:100%;right:0;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;width:6em;height:4em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;background-color:#000;overflow:hidden}.cardify-preview>div{position:relative;width:100%;height:100%}.cardify-preview__img{opacity:0;position:absolute;left:0;top:0;width:100%;height:100%;-webkit-background-size:cover;-moz-background-size:cover;-o-background-size:cover;background-size:cover;-webkit-transition:opacity .2s;-o-transition:opacity .2s;-moz-transition:opacity .2s;transition:opacity .2s}.cardify-preview__img.loaded{opacity:1}.cardify-preview__loader{position:absolute;left:50%;bottom:0;-webkit-transform:translate3d(-50%,0,0);-moz-transform:translate3d(-50%,0,0);transform:translate3d(-50%,0,0);height:.2em;-webkit-border-radius:.2em;-moz-border-radius:.2em;border-radius:.2em;background-color:#fff;width:0;-webkit-transition:width .1s linear;-o-transition:width .1s linear;-moz-transition:width .1s linear;transition:width .1s linear}.cardify-preview__line{position:absolute;height:.8em;left:0;width:100%;background-color:#000}.cardify-preview__line.one{top:0}.cardify-preview__line.two{bottom:0}.head.nodisplay{-webkit-transform:translate3d(0,-100%,0);-moz-transform:translate3d(0,-100%,0);transform:translate3d(0,-100%,0)}body:not(.menu--open) .cardify__background{-webkit-mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));-webkit-mask-image:-webkit-linear-gradient(top,white 50%,rgba(255,255,255,0) 100%);mask-image:-webkit-gradient(linear,left top,left bottom,color-stop(50%,white),to(rgba(255,255,255,0)));mask-image:linear-gradient(to bottom,white 50%,rgba(255,255,255,0) 100%)}@-webkit-keyframes animation-full-background{0%{-webkit-transform:translate3d(0,-10%,0);transform:translate3d(0,-10%,0)}100%{-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}}@-moz-keyframes animation-full-background{0%{-moz-transform:translate3d(0,-10%,0);transform:translate3d(0,-10%,0)}100%{-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}}@-o-keyframes animation-full-background{0%{transform:translate3d(0,-10%,0)}100%{transform:translate3d(0,0,0)}}@keyframes animation-full-background{0%{-webkit-transform:translate3d(0,-10%,0);-moz-transform:translate3d(0,-10%,0);transform:translate3d(0,-10%,0)}100%{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0)}}@-webkit-keyframes animation-full-start-hide{0%{-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}100%{-webkit-transform:translate3d(0,50%,0);transform:translate3d(0,50%,0);opacity:0}}@-moz-keyframes animation-full-start-hide{0%{-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}100%{-moz-transform:translate3d(0,50%,0);transform:translate3d(0,50%,0);opacity:0}}@-o-keyframes animation-full-start-hide{0%{transform:translate3d(0,0,0);opacity:1}100%{transform:translate3d(0,50%,0);opacity:0}}@keyframes animation-full-start-hide{0%{-webkit-transform:translate3d(0,0,0);-moz-transform:translate3d(0,0,0);transform:translate3d(0,0,0);opacity:1}100%{-webkit-transform:translate3d(0,50%,0);-moz-transform:translate3d(0,50%,0);transform:translate3d(0,50%,0);opacity:0}}.full-start__rating{font-size:1.2em;color:#fff;font-weight:500}.rating-stars{display:flex;gap:0.2em}.rating-star{width:1em;height:1em}.cardify-trailer__youtube-overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient(to bottom,rgba(0,0,0,1) 0%,rgba(0,0,0,0.9) 60px,rgba(0,0,0,0.7) 90px,rgba(0,0,0,0.4) 130px,rgba(0,0,0,0.1) 160px,rgba(0,0,0,0) 200px);z-index:1001;pointer-events:none}.cardify-trailer__youtube-overlay-bottom{position:absolute;bottom:0;left:0;width:100%;height:100%;background:linear-gradient(to top,rgba(0,0,0,1) 0%,rgba(0,0,0,0.9) 60px,rgba(0,0,0,0.7) 90px,rgba(0,0,0,0.4) 130px,rgba(0,0,0,0.1) 160px,rgba(0,0,0,0) 200px);z-index:1001;pointer-events:none}\n        </style>\n    ";

    try {
      Lampa.Template.add('cardify_css', style);
      $('body').append(Lampa.Template.get('cardify_css', {}, true));
      console.log('Cardify: Ð¡Ñ‚Ð¸Ð»Ð¸ Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ñ‹');
    } catch (e) {
      console.error('Cardify: ÐžÑˆÐ¸Ð±ÐºÐ° Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¸Ñ ÑÑ‚Ð¸Ð»ÐµÐ¹:', e);
      return;
    }

    var icon = "<svg width=\"36\" height=\"28\" viewBox=\"0 0 36 28\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n        <rect x=\"1.5\" y=\"1.5\" width=\"33\" height=\"25\" rx=\"3.5\" stroke=\"white\" stroke-width=\"3\"/>\n        <rect x=\"5\" y=\"14\" width=\"17\" height=\"4\" rx=\"2\" fill=\"white\"/>\n        <rect x=\"5\" y=\"20\" width=\"10\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n        <rect x=\"25\" y=\"20\" width=\"6\" height=\"3\" rx=\"1.5\" fill=\"white\"/>\n    </svg>";

    try {
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
      console.log('Cardify: ÐÐ°ÑÑ‚Ñ€Ð¾Ð¹ÐºÐ¸ Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ñ‹');
    } catch (e) {
      console.error('Cardify: ÐžÑˆÐ¸Ð±ÐºÐ° Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¸Ñ Ð½Ð°ÑÑ‚Ñ€Ð¾ÐµÐº:', e);
      return;
    }

    function video(data) {
      console.log('Cardify: ÐžÐ±Ñ€Ð°Ð±Ð¾Ñ‚ÐºÐ° Ð´Ð°Ð½Ð½Ñ‹Ñ… Ð´Ð»Ñ Ñ‚Ñ€ÐµÐ¹Ð»ÐµÑ€Ð°...');
      if (data.videos && data.videos.results && data.videos.results.length) {
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
      console.log('Cardify: Ð¢Ñ€ÐµÐ¹Ð»ÐµÑ€Ñ‹ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½Ñ‹');
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
Follow.get(Type.de([102, 117, 108, 108]), function (e) {    
    if (Type.co(e)) {    
        Follow.skodf(e);    
        if (!Main.cases()[Main.stor()].field('cardify_run_trailers')) return;    
        var trailer = Follow.vjsk(video(e.data));    
        if (trailer) {    
            // Зберігаємо дані та створюємо кнопку    
            e.object.cardify_trailer = trailer;    
            addTrailerButton(e.object, trailer);    
        }    
    }    
});

  }

  if (Follow.go) {
    console.log('Cardify: Приложение готово, запуск плагина...');
    startPlugin();
  } else {
    Follow.get(Type.de([97, 112, 112]), function (e) {
      if (Type.re(e)) {
        console.log('Cardify: Событие appready, запуск плагина...');
        startPlugin();
      }
    });
  }

})();
