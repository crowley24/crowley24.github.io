(function () {
	"use strict";
	Lampa.Platform.tv();

	if (typeof Lampa === "undefined") return;

	if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) return;
	if (window.plugin_interface_ready_v3) return;

	window.plugin_interface_ready_v3 = true;

	var globalInfoCache = {};

	Lampa.Storage.set("interface_size", "small");

	addStyles();
	initializeSettings();

	setupVoteColorsObserver();
	setupVoteColorsForDetailPage();
	setupPreloadObserver();

	var mainMaker = Lampa.Maker.map("Main");
	if (!mainMaker || !mainMaker.Items || !mainMaker.Create) return;

	wrapMethod(mainMaker.Items, "onInit", function (originalMethod, args) {
		this.__newInterfaceEnabled = shouldEnableInterface(this && this.object);

		if (this.__newInterfaceEnabled) {
			if (this.object) this.object.wide = false;
			this.wide = false;
		}

		if (originalMethod) originalMethod.apply(this, args);
	});

	wrapMethod(mainMaker.Create, "onCreate", function (originalMethod, args) {
		if (originalMethod) originalMethod.apply(this, args);
		if (!this.__newInterfaceEnabled) return;

		var state = getOrCreateState(this);
		state.attach();
	});

	wrapMethod(mainMaker.Create, "onCreateAndAppend", function (originalMethod, args) {
		var data = args && args[0];
		if (this.__newInterfaceEnabled && data) {
			data.wide = false;

			if (!data.params) data.params = {};
			if (!data.params.items) data.params.items = {};
			data.params.items.view = 12;
			data.params.items_per_row = 12;
			data.items_per_row = 12;

			extendResultsWithStyle(data);
		}
		return originalMethod ? originalMethod.apply(this, args) : undefined;
	});

	wrapMethod(mainMaker.Items, "onAppend", function (originalMethod, args) {
		if (originalMethod) originalMethod.apply(this, args);
		if (!this.__newInterfaceEnabled) return;

		var element = args && args[0];
		var data = args && args[1];

		if (element && data) {
			handleLineAppend(this, element, data);
		}
	});

	wrapMethod(mainMaker.Items, "onDestroy", function (originalMethod, args) {
		if (this.__newInterfaceState) {
			this.__newInterfaceState.destroy();
			delete this.__newInterfaceState;
		}
		delete this.__newInterfaceEnabled;
		if (originalMethod) originalMethod.apply(this, args);
	});

	function shouldEnableInterface(object) {
		if (!object) return false;
		if (window.innerWidth < 767) return false;
		if (Lampa.Platform.screen("mobile")) return false;
		if (object.title === "Избранное") return false;
		return true;
	}

	function getOrCreateState(createInstance) {
		if (createInstance.__newInterfaceState) {
			return createInstance.__newInterfaceState;
		}
		var state = createState(createInstance);
		createInstance.__newInterfaceState = state;
		return state;
	}

	function createState(mainInstance) {
		var infoPanel = new InfoPanel();
		infoPanel.create();

		var backgroundWrapper = document.createElement("div");
		backgroundWrapper.className = "full-start__background-wrapper";

		var bg1 = document.createElement("img");
		bg1.className = "full-start__background";
		var bg2 = document.createElement("img");
		bg2.className = "full-start__background";

		backgroundWrapper.appendChild(bg1);
		backgroundWrapper.appendChild(bg2);

		var state = {
			main: mainInstance,
			info: infoPanel,
			background: backgroundWrapper,
			infoElement: null,
			backgroundTimer: null,
			backgroundLast: "",
			attached: false,

			attach: function () {
				if (this.attached) return;

				var container = mainInstance.render(true);
				if (!container) return;

				container.classList.add("new-interface");

				if (!backgroundWrapper.parentElement) {
					container.insertBefore(backgroundWrapper, container.firstChild || null);
				}

				var infoElement = infoPanel.render(true);
				this.infoElement = infoElement;

				if (infoElement && infoElement.parentNode !== container) {
					if (backgroundWrapper.parentElement === container) {
						container.insertBefore(infoElement, backgroundWrapper.nextSibling);
					} else {
						container.insertBefore(infoElement, container.firstChild || null);
					}
				}

				mainInstance.scroll.minus(infoElement);
				this.attached = true;
			},

			update: function (data) {
				if (!data) return;
				infoPanel.update(data);
				this.updateBackground(data);
			},

			updateBackground: function (data) {
				var BACKGROUND_DEBOUNCE_DELAY = 300;
				var self = this;

				clearTimeout(this.backgroundTimer);

				if (this._pendingImg) {
					this._pendingImg.onload = null;
					this._pendingImg.onerror = null;
					this._pendingImg = null;
				}

				var show_bg = Lampa.Storage.get("show_background", true);
				var bg_resolution = Lampa.Storage.get("background_resolution", "original");
				var backdropUrl = data && data.backdrop_path && show_bg ? Lampa.Api.img(data.backdrop_path, bg_resolution) : "";

				if (backdropUrl === this.backgroundLast) return;

				this.backgroundTimer = setTimeout(function () {
					if (!backdropUrl) {
						bg1.classList.remove("active");
						bg2.classList.remove("active");
						self.backgroundLast = "";
						return;
					}

					var nextLayer = bg1.classList.contains("active") ? bg2 : bg1;
					var prevLayer = bg1.classList.contains("active") ? bg1 : bg2;

					var img = new Image();
					self._pendingImg = img;

					img.onload = function () {
						if (self._pendingImg !== img) return;
						if (backdropUrl !== self.backgroundLast) return;

						self._pendingImg = null;
						nextLayer.src = backdropUrl;
						nextLayer.classList.add("active");

						setTimeout(function () {
							if (backdropUrl !== self.backgroundLast) return;
							prevLayer.classList.remove("active");
						}, 100);
					};

					self.backgroundLast = backdropUrl;
					img.src = backdropUrl;
				}, BACKGROUND_DEBOUNCE_DELAY);
			},

			reset: function () {
				infoPanel.empty();
			},

			destroy: function () {
				clearTimeout(this.backgroundTimer);
				infoPanel.destroy();

				var container = mainInstance.render(true);
				if (container) {
					container.classList.remove("new-interface");
				}

				if (this.infoElement && this.infoElement.parentNode) {
					this.infoElement.parentNode.removeChild(this.infoElement);
				}

				if (backgroundWrapper && backgroundWrapper.parentNode) {
					backgroundWrapper.parentNode.removeChild(backgroundWrapper);
				}

				this.attached = false;
			},
		};

		return state;
	}

	function extendResultsWithStyle(data) {
		if (!data) return;

		if (Array.isArray(data.results)) {
			data.results.forEach(function (card) {
				if (card.wide !== false) {
					card.wide = false;
				}
			});

			Lampa.Utils.extendItemsParams(data.results, {
				style: {
					name: Lampa.Storage.get("wide_post") !== false ? "wide" : "small",
				},
			});
		}
	}

	function handleCard(state, card) {
		if (!card || card.__newInterfaceCard) return;
		if (typeof card.use !== "function" || !card.data) return;

		card.__newInterfaceCard = true;
		card.params = card.params || {};
		card.params.style = card.params.style || {};

		var targetStyle = Lampa.Storage.get("wide_post") !== false ? "wide" : "small";
		card.params.style.name = targetStyle;

		if (card.render && typeof card.render === "function") {
			var element = card.render(true);
			if (element) {
				var node = element.jquery ? element[0] : element;
				if (node && node.classList) {
					if (targetStyle === "wide") {
						node.classList.add("card--wide");
						node.classList.remove("card--small");
					} else {
						node.classList.add("card--small");
						node.classList.remove("card--wide");
					}
				}
			}
		}

		card.use({
			onFocus: function () {
				state.update(card.data);
			},
			onHover: function () {
				state.update(card.data);
			},
			onTouch: function () {
				state.update(card.data);
			},
			onDestroy: function () {
				delete card.__newInterfaceCard;
			},
		});
	}

	function getCardData(card, results, index) {
		index = index || 0;

		if (card && card.data) return card.data;
		if (results && Array.isArray(results.results)) {
			return results.results[index] || results.results[0];
		}

		return null;
	}

	function findCardData(element) {
		if (!element) return null;

		var node = element && element.jquery ? element[0] : element;

		while (node && !node.card_data) {
			node = node.parentNode;
		}

		return node && node.card_data ? node.card_data : null;
	}

	function getFocusedCard(items) {
		var container = items && typeof items.render === "function" ? items.render(true) : null;
		if (!container || !container.querySelector) return null;

		var focusedElement = container.querySelector(".selector.focus") || container.querySelector(".focus");
		return findCardData(focusedElement);
	}

	function handleLineAppend(items, line, data) {
		if (line.__newInterfaceLine) return;
		line.__newInterfaceLine = true;

		var state = getOrCreateState(items);

		line.items_per_row = 12;
		line.view = 12;
		if (line.params) {
			line.params.items_per_row = 12;
			if (line.params.items) line.params.items.view = 12;
		}

		var processCard = function (card) {
			handleCard(state, card);
		};

		line.use({
			onInstance: function (instance) {
				processCard(instance);
			},
			onActive: function (card, results) {
				var cardData = getCardData(card, results);
				if (cardData) state.update(cardData);
			},
			onToggle: function () {
				setTimeout(function () {
					var focusedCard = getFocusedCard(line);
					if (focusedCard) state.update(focusedCard);
				}, 32);
			},
			onMore: function () {
				state.reset();
			},
			onDestroy: function () {
				state.reset();
				delete line.__newInterfaceLine;
			},
		});

		if (Array.isArray(line.items) && line.items.length) {
			line.items.forEach(processCard);
		}

		if (line.last) {
			var lastCardData = findCardData(line.last);
			if (lastCardData) state.update(lastCardData);
		}
	}

	function wrapMethod(object, methodName, wrapper) {
		if (!object) return;

		var originalMethod = typeof object[methodName] === "function" ? object[methodName] : null;

		object[methodName] = function () {
			var args = Array.prototype.slice.call(arguments);
			return wrapper.call(this, originalMethod, args);
		};
	}

	function addStyles() {
		if (addStyles.added) return;
		addStyles.added = true;

		var styles = Lampa.Storage.get("wide_post") !== false ? getWideStyles() : getSmallStyles();

		Lampa.Template.add("new_interface_style_v3", styles);
		$("body").append(Lampa.Template.get("new_interface_style_v3", {}, true));
	}

    // --- ПОЧАТОК ЗМІН ---

	function getWideStyles() {
		return `<style>
					.items-line__title .full-person__photo {
						width: 1.8em !important;
						height: 1.8em !important;
					}
					.items-line__title .full-person--svg .full-person__photo {
						padding: 0.5em !important;
						margin-right: 0.5em !important;
					}
					.items-line__title .full-person__photo {
						margin-right: 0.5em !important;
					}
					.items-line {
						padding-bottom: 4em !important;
					}
					.new-interface-info__head, .new-interface-info__details{ opacity: 0; transition: opacity 0.5s ease; min-height: 2.2em !important;}
					.new-interface-info__head.visible, .new-interface-info__details.visible{ opacity: 1; }
					.new-interface .card.card--wide {
						width: 18.3em;
					}
					.new-interface .card.card--small {
						width: 18.3em;
					}
					.new-interface-info {
						position: relative;
						padding: 1.5em;
						height: 27.5em;
					}
					/* ЗМІНИ ДЛЯ РОЗМІЩЕННЯ ОПИСУ ПРАВОРУЧ */
					.new-interface-info__body {
						position: absolute;
						z-index: 9999999;
						width: 95%; /* Збільшено для розміщення елементів */
						padding-top: 1.1em;
						display: flex; /* Включення Flexbox */
						flex-wrap: wrap; /* Дозволити обгортання */
					}
					
					/* Ліва колонка: Назва, Деталі, Рейтинг */
					.new-interface-info__left {
						width: 60%;
					}
					.new-interface-info__head {
						color: rgba(255, 255, 255, 0.6);
						font-size: 1.3em;
						min-height: 1em;
						width: 100%;
						order: 1; /* Порядок елементів */
					}
					.new-interface-info__head span {
						color: #fff;
					}
					.new-interface-info__title {
						font-size: 4em;
						font-weight: 600;
						margin-bottom: 0.3em;
						overflow: hidden;
						-o-text-overflow: '.';
						text-overflow: '.';
						display: -webkit-box;
						-webkit-line-clamp: 1;
						line-clamp: 1;
						-webkit-box-orient: vertical;
						margin-left: -0.03em;
						line-height: 1.3;
						width: 100%;
						order: 2;
					}
					.new-interface-info__details {
						margin-top: 1.2em;
						margin-bottom: 1.6em;
						display: flex;
						align-items: center;
						flex-wrap: wrap;
						min-height: 1.9em;
						font-size: 1.3em;
						width: 100%;
						order: 3;
					}
					.new-interface-info__split {
						margin: 0 1em;
						font-size: 0.7em;
					}

					/* Права колонка: Опис */
					.new-interface-info__description {
						font-size: 1.4em;
						font-weight: 310;
						line-height: 1.3;
						overflow: hidden;
						-o-text-overflow: '.';
						text-overflow: '.';
						display: -webkit-box;
						-webkit-line-clamp: 5; /* Збільшено кількість рядків */
						line-clamp: 5;
						-webkit-box-orient: vertical;
						width: 35%; /* Змінено для правої колонки */
						margin-left: 5%; /* Відступ від лівої колонки */
						order: 4;
					}
					/* КІНЕЦЬ ЗМІН */

					.new-interface .card-more__box {
						padding-bottom: 95%;
					}
					.new-interface .full-start__background-wrapper {
						position: absolute;
						top: 0;
						left: 0;
						width: 100%;
						height: 100%;
						z-index: -1;
						pointer-events: none;
					}
					.new-interface .full-start__background {
						position: absolute;
						height: 108%;
						width: 100%;
						top: -5em;
						left: 0;
						opacity: 0;
						object-fit: cover;
						transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
					}
					.new-interface .full-start__background.active {
						opacity: 0.5;
					}
					.new-interface .full-start__rate {
						font-size: 1.3em;
						margin-right: 0;
					}
					.new-interface .card__promo {
						display: none;
					}
					.new-interface .card.card--wide + .card-more .card-more__box {
						padding-bottom: 95%;
					}
					.new-interface .card.card--wide .card-watched {
						display: none !important;
					}
					body.light--version .new-interface-info__body {
						position: absolute;
						z-index: 9999999;
						width: 95%; /* Оновлено */
						padding-top: 1.5em;
					}
					body.light--version .new-interface-info {
						height: 25.3em;
					}
					body.advanced--animation:not(.no--animation) .new-interface .card.card--wide.focus .card__view {
						animation: animation-card-focus 0.2s;
					}
					body.advanced--animation:not(.no--animation) .new-interface .card.card--wide.animate-trigger-enter .card__view {
						animation: animation-trigger-enter 0.2s forwards;
					}
					body.advanced--animation:not(.no--animation) .new-interface .card.card--small.focus .card__view {
						animation: animation-card-focus 0.2s;
					}
					body.advanced--animation:not(.no--animation) .new-interface .card.card--small.animate-trigger-enter .card__view {
						animation: animation-trigger-enter 0.2s forwards;
					}
					.logo-moved-head { transition: opacity 0.4s ease; }
					.logo-moved-separator { transition: opacity 0.4s ease; }
					${Lampa.Storage.get("hide_captions", true) ? ".card:not(.card--collection) .card__age, .card:not(.card--collection) .card__title { display: none !important; }" : ""}
				</style>`;
	}

	function getSmallStyles() {
		return `<style>
					.new-interface-info__head, .new-interface-info__details{ opacity: 0; transition: opacity 0.5s ease; min-height: 2.2em !important;}
					.new-interface-info__head.visible, .new-interface-info__details.visible{ opacity: 1; }
					.new-interface .card.card--wide{
						width: 18.3em;
					}
					.items-line__title .full-person__photo {
						width: 1.8em !important;
						height: 1.8em !important;
					}
					.items-line__title .full-person--svg .full-person__photo {
						padding: 0.5em !important;
						margin-right: 0.5em !important;
					}
					.items-line__title .full-person__photo {
						margin-right: 0.5em !important;
					}
					.new-interface-info {
						position: relative;
						padding: 1.5em;
						height: 19.8em;
					}
					/* ЗМІНИ ДЛЯ РОЗМІЩЕННЯ ОПИСУ ПРАВОРУЧ */
					.new-interface-info__body {
						position: absolute;
						z-index: 9999999;
						width: 95%; /* Збільшено для розміщення елементів */
						padding-top: 0.2em;
						display: flex; /* Включення Flexbox */
						flex-wrap: wrap; /* Дозволити обгортання */
					}
					.new-interface-info__head {
						color: rgba(255, 255, 255, 0.6);
						margin-bottom: 0.3em;
						font-size: 1.2em;
						min-height: 1em;
						width: 100%;
						order: 1;
					}
					.new-interface-info__head span {
						color: #fff;
					}
					.new-interface-info__title {
						font-size: 3em;
						font-weight: 600;
						margin-bottom: 0.2em;
						overflow: hidden;
						-o-text-overflow: '.';
						text-overflow: '.';
						display: -webkit-box;
						-webkit-line-clamp: 1;
						line-clamp: 1;
						-webkit-box-orient: vertical;
						margin-left: -0.03em;
						line-height: 1.3;
						width: 60%; /* Ліва колонка */
						order: 2;
					}
					.new-interface-info__details {
						margin-top: 1.2em;
						margin-bottom: 1.6em;
						display: flex;
						align-items: center;
						flex-wrap: wrap;
						min-height: 1.9em;
						font-size: 1.2em;
						width: 60%; /* Ліва колонка */
						order: 3;
					}
					.new-interface-info__split {
						margin: 0 1em;
						font-size: 0.7em;
					}
					.new-interface-info__description {
						font-size: 1.3em;
						font-weight: 310;
						line-height: 1.3;
						overflow: hidden;
						-o-text-overflow: '.';
						text-overflow: '.';
						display: -webkit-box;
						-webkit-line-clamp: 3; /* Збільшено кількість рядків */
						line-clamp: 3;
						-webkit-box-orient: vertical;
						width: 35%; /* Права колонка */
						margin-left: 5%; /* Відступ від лівої колонки */
						order: 4;
					}
				// --- КІНЕЦЬ ЗМІН ---

	function preloadData(data, silent) {
		if (!data || !data.id) return;
		var source = data.source || "tmdb";
		if (source !== "tmdb" && source !== "cub") return;

		var mediaType = data.media_type === "tv" || data.name ? "tv" : "movie";
		var language = Lampa.Storage.get("language") || "ru";
		var apiUrl = Lampa.TMDB.api(mediaType + "/" + data.id + "?api_key=" + Lampa.TMDB.key() + "&append_to_response=content_ratings,release_dates&language=" + language);

		if (!globalInfoCache[apiUrl]) {
			var network = new Lampa.Reguest();
			network.silent(apiUrl, function (response) {
				globalInfoCache[apiUrl] = response;
			});
		}
	}

	var preloadTimer = null;
	function preloadAllVisibleCards() {
		if (!Lampa.Storage.get("async_load", true)) return;

		clearTimeout(preloadTimer);
		preloadTimer = setTimeout(function () {
			var layer = $(".layer--visible");
			if (!layer.length) return;

			var cards = layer.find(".card");
			var count = 0;

			cards.each(function () {
				var data = findCardData(this);
				if (data) {
					preloadData(data, true);
					count++;
				}
			});
		}, 800);
	}

	function setupPreloadObserver() {
		var observer = new MutationObserver(function (mutations) {
			if (!Lampa.Storage.get("async_load", true)) return;

			var hasNewCards = false;
			for (var i = 0; i < mutations.length; i++) {
				var added = mutations[i].addedNodes;
				for (var j = 0; j < added.length; j++) {
					var node = added[j];
					if (node.nodeType === 1) {
						var $node = $(node);
						$node.find(".card__vote, .full-start__rate, .full-start-new__rate, .info__rate, .card__imdb-rate, .card__kinopoisk-rate").each(function () {
							applyColorByRating(this);
						});
						$node.find(".rate--kp, .rate--imdb, .rate--cub").each(function () {
							applyColorByRating($(this).find("> div").eq(0));
						});
						if ($node.hasClass("card__vote") || $node.hasClass("full-start__rate") || $node.hasClass("info__rate")) {
							applyColorByRating(node);
						}
						if ($node.hasClass("rate--kp") || $node.hasClass("rate--imdb") || $node.hasClass("rate--cub")) {
							applyColorByRating($node.find("> div").eq(0));
						}
					}
				}
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	function setupVoteColorsForDetailPage() {
		if (!window.Lampa || !Lampa.Listener) return;

		Lampa.Listener.follow("full", function (data) {
			if (data.type === "complite") {
				updateVoteColors();
			}
		});

		Lampa.Listener.follow("activity", function (e) {
			if (e.type === "active" || e.type === "start") {
				setTimeout(preloadAllVisibleCards, 1000);
			}
		});

		Lampa.Listener.follow("target", function (e) {
			if (e.target && $(e.target).hasClass("card")) {
				preloadAllVisibleCards();
			}
		});
	}

	function initializeSettings() {
		Lampa.Settings.listener.follow("open", function (event) {
			if (event.name == "main") {
				if (Lampa.Settings.main().render().find('[data-component="style_interface"]').length == 0) {
					Lampa.SettingsApi.addComponent({
						component: "style_interface",
						name: "Стильный интерфейс",
					});
				}

				Lampa.Settings.main().update();
				Lampa.Settings.main().render().find('[data-component="style_interface"]').addClass("hide");
			}
		});

		Lampa.SettingsApi.addParam({
			component: "interface",
			param: {
				name: "style_interface",
				type: "static",
				default: true,
			},
			field: {
				name: "Стильный интерфейс",
				description: "Настройки элементов",
			},
			onRender: function (item) {
				item.css("opacity", "0");
				requestAnimationFrame(function () {
					item.insertAfter($('div[data-name="interface_size"]'));
					item.css("opacity", "");
				});

				item.on("hover:enter", function () {
					Lampa.Settings.create("style_interface");
					Lampa.Controller.enabled().controller.back = function () {
						Lampa.Settings.create("interface");
					};
				});
			},
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "logo_show", type: "trigger", default: true },
			field: { name: "Показывать логотип вместо названия" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "show_background", type: "trigger", default: true },
			field: { name: "Отображать постеры на фоне" },
			onChange: function (value) {
				if (!value) {
					$(".full-start__background").removeClass("active");
				}
			},
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "status", type: "trigger", default: true },
			field: { name: "Показывать статус фильма/сериала" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "seas", type: "trigger", default: false },
			field: { name: "Показывать количество сезонов" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "eps", type: "trigger", default: false },
			field: { name: "Показывать количество эпизодов" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "year_ogr", type: "trigger", default: true },
			field: { name: "Показывать возрастное ограничение" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "vremya", type: "trigger", default: true },
			field: { name: "Показывать время фильма" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "ganr", type: "trigger", default: true },
			field: { name: "Показывать жанр фильма" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "rat", type: "trigger", default: true },
			field: { name: "Показывать рейтинг фильма" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "colored_ratings", type: "trigger", default: true },
			field: { name: "Цветные рейтинги" },
			onChange: function (value) {
				if (value) {
					updateVoteColors();
				} else {
					$(".card__vote, .full-start__rate, .full-start-new__rate, .info__rate, .card__imdb-rate, .card__kinopoisk-rate").css("color", "").css("border", "");
					$(".full-start__rate").css("border", "");
				}
			},
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "rating_border", type: "trigger", default: false },
			field: { name: "Обводка рейтингов" },
			onChange: function (value) {
				updateVoteColors();
			},
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "async_load", type: "trigger", default: true },
			field: { name: "Включить асинхронную загрузку данных" },
			onChange: function (value) {
				if (value) preloadAllVisibleCards();
			},
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "background_resolution", type: "select", default: "original", values: { w300: "w300", w780: "w780", w1280: "w1280", original: "original" } },
			field: { name: "Разрешение фона", description: "Качество загружаемых фоновых изображений" },
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "hide_captions", type: "trigger", default: true },
			field: { name: "Скрывать названия и год", description: "Лампа будет перезагружена" },
			onChange: function () {
				window.location.reload();
			},
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "wide_post", type: "trigger", default: true },
			field: { name: "Широкие постеры", description: "Лампа будет перезагружена" },
			onChange: function () {
				window.location.reload();
			},
		});

		Lampa.SettingsApi.addParam({
			component: "style_interface",
			param: { name: "int_clear_logo_cache", type: "static" },
			field: { name: "Очистить кеш логотипов", description: "Лампа будет перезагружена" },
			onRender: function (item) {
				item.on("hover:enter", function () {
					Lampa.Select.show({
						title: "Очистить кеш логотипов?",
						items: [{ title: "Да", confirm: true }, { title: "Нет" }],
						onSelect: function (a) {
							if (a.confirm) {
								var keys = [];
								for (var i = 0; i < localStorage.length; i++) {
									var key = localStorage.key(i);
									if (key.indexOf("logo_cache_v2_") !== -1) {
										keys.push(key);
									}
								}
								keys.forEach(function (key) {
									localStorage.removeItem(key);
								});
								window.location.reload();
							} else {
								Lampa.Controller.toggle("settings_component");
							}
						},
						onBack: function () {
							Lampa.Controller.toggle("settings_component");
						},
					});
				});
			},
		});

		var initInterval = setInterval(function () {
			if (typeof Lampa !== "undefined") {
				clearInterval(initInterval);
				if (!Lampa.Storage.get("int_plug", false)) {
					setDefaultSettings();
				}
			}
		}, 200);

		function setDefaultSettings() {
			Lampa.Storage.set("int_plug", "true");
			Lampa.Storage.set("wide_post", "true");
			Lampa.Storage.set("logo_show", "true");
			Lampa.Storage.set("show_background", "true");
			Lampa.Storage.set("background_resolution", "original");
			Lampa.Storage.set("status", "true");
			Lampa.Storage.set("seas", "false");
			Lampa.Storage.set("eps", "false");
			Lampa.Storage.set("year_ogr", "true");
			Lampa.Storage.set("vremya", "true");
			Lampa.Storage.set("ganr", "true");
			Lampa.Storage.set("rat", "true");
			Lampa.Storage.set("colored_ratings", "true");
			Lampa.Storage.set("async_load", "true");
			Lampa.Storage.set("hide_captions", "true");
			Lampa.Storage.set("rating_border", "false");
			Lampa.Storage.set("interface_size", "small");
		}
	}
})();
