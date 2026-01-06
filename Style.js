(function () {  
	"use strict";  
	Lampa.Platform.tv();  
  
	if (typeof Lampa === "undefined") return;  
  
	if (!Lampa.Maker || !Lampa.Maker.map || !Lampa.Utils) return;  
	if (window.plugin_interface_ready_v3) return;  
  
	window.plugin_interface_ready_v3 = true;  
  
	var globalInfoCache = {};  
  
	Lampa.Storage.set("interface_size", "small");  
	Lampa.Storage.set("background", "false");  
  
	addStyles();  
	initializeSettings();  
  
	siStyleSetupVoteColorsObserver();  
	siStyleSetupVoteColorsForDetailPage();  
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
  
		if (originalMethod) originalMethod.apply(this, args);  
	});  
  
	function shouldEnableInterface(object) {  
		if (!object) return false;  
		if (object.component !== "items") return false;  
		if (object.source && object.source !== "tmdb" && object.source !== "cub") return false;  
		return true;  
	}  
  
	function extendResultsWithStyle(data) {  
		if (!data.results) return;  
  
		for (var i = 0; i < data.results.length; i++) {  
			var item = data.results[i];  
			if (item) {  
				item.wide = false;  
			}  
		}  
	}  
  
	function handleLineAppend(component, element, data) {  
		if (!component.__newInterfaceEnabled) return;  
  
		var info = new InfoPanel();  
		info.update(data);  
  
		var container = element.find(".full-start");  
		if (container.length) {  
			container.append(info.render());  
		}  
	}  
  
	function getOrCreateState(component) {  
		if (!component.__newInterfaceState) {  
			component.__newInterfaceState = new InterfaceState(component);  
		}  
		return component.__newInterfaceState;  
	}  
  
	function wrapMethod(object, methodName, wrapper) {  
		if (!object || !object[methodName]) return;  
  
		var original = object[methodName];  
		object[methodName] = function () {  
			return wrapper.call(this, original, arguments);  
		};  
	}  
  
	function addStyles() {  
		var styles = getWideStyles() + getSmallStyles();  
		$("head").append(styles);  
	}  
  
	function getWideStyles() {  
		return `<style>  
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
					.new-interface-info__logo-block {  
						position: absolute;  
						top: 1.5em;  
						left: 1.5em;  
						z-index: 9999;  
						max-width: 30%;  
					}  
					.new-interface-info__content-block {  
						position: absolute;  
						top: 1.5em;  
						right: 1.5em;  
						z-index: 9999;  
						max-width: 60%;  
						background: linear-gradient(135deg,   
							rgba(0,0,0,0.7) 0%,   
							rgba(0,0,0,0.3) 100%);  
						border-radius: 1.5em;  
						backdrop-filter: blur(20px);  
						padding: 2em;  
						transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);  
					}  
					.new-interface-info__content-block:hover {  
						transform: translateY(-2px);  
						box-shadow: 0 8px 25px rgba(0,0,0,0.3);  
					}  
					.new-interface-info__head {  
						color: rgba(255, 255, 255, 0.6);  
						font-size: 1.3em;  
						min-height: 1em;  
					}  
					.new-interface-info__head span {  
						color: #fff;  
					}  
					.new-interface-info__title {  
						font-size: 5em;  
						font-weight: 700;  
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
						text-shadow: 2px 2px 4px rgba(0,0,0,0.8);  
						letter-spacing: -0.02em;  
						min-height: 6em !important;  
						overflow: visible !important;  
					}  
					.new-interface-info__title img {  
						max-width: 12em !important;  
						max-height: 6em !important;  
						width: auto !important;  
						height: auto !important;  
						object-fit: contain !important;  
						margin: 0 !important;  
						display: block !important;  
					}  
					.new-interface-info__details {  
						margin-top: 1.5em;  
						margin-bottom: 0;  
						display: flex;  
						align-items: center;  
						flex-wrap: wrap;  
						min-height: 1.9em;  
						font-size: 1.3em;  
						transition: all 0.3s ease;  
						transform: translateY(0);  
					}  
					.new-interface-info__details:hover {  
						transform: translateY(-2px);  
					}  
					.new-interface-info__details > * {  
						background: rgba(255,255,255,0.1);  
						padding: 0.3em 0.8em;  
						border-radius: 1.5em;  
						margin: 0.2em;  
						backdrop-filter: blur(10px);  
						border: 1px solid rgba(255,255,255,0.2);  
					}  
					.new-interface-info__split {  
						margin: 0 1em;  
						font-size: 0.7em;  
					}  
					.new-interface-info__description {  
						font-size: 1.6em;  
						font-weight: 310;  
						line-height: 1.6;  
						overflow: hidden;  
						-o-text-overflow: '.';  
						text-overflow: '.';  
						display: -webkit-box;  
						-webkit-line-clamp: 4;  
						line-clamp: 4;  
						-webkit-box-orient: vertical;  
						width: 100%;  
						text-shadow: 1px 1px 2px rgba(0,0,0,0.6);  
						color: rgba(255,255,255,0.95);  
						transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);  
					}  
					.new-interface .card-more__box {  
						padding-bottom: 95%;  
					}  
					.new-interface .full-start__background-wrapper {  
						position: absolute;  
						top: 0;  
						left: 0;  
						width: 100%;  
						height: 100%;  
						z-index: 1;  
						pointer-events: none;  
						overflow: hidden;  
					}  
					.new-interface .full-start__background {  
						position: absolute;  
						height: 100%;  
						width: 100%;  
						top: 0;  
						left: 0;  
						opacity: 0;  
						object-fit: cover;  
						transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);  
						filter: blur(2px);  
						transform: scale(1.05);  
					}  
					.new-interface .full-start__background.active {  
						opacity: 0.4;  
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
					.new-interface .items-line {  
						position: relative;  
						z-index: 2;  
					}  
					body.light--version .new-interface-info__body {  
						position: absolute;  
						z-index: 999;  
						width: 69%;  
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
					  
					/* Адаптивний дизайн */  
					@media (max-width: 1200px) {  
						.new-interface-info__content-block {  
							max-width: 50%;  
							padding: 1.5em;  
						}  
					}  
					  
					@media (max-width: 768px) {  
						.new-interface-info__logo-block,  
						.new-interface-info__content-block {  
							position: static;  
							max-width: 100%;  
							margin-bottom: 1em;  
						}  
					}  
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
					.items-line {  
						padding-bottom: 4em !important;  
					}  
					.new-interface-info {  
						position: relative;  
						padding: 1.5em;  
						height: 19.8em;  
					}  
					.new-interface-info__logo-block {  
						position: absolute;  
						top: 1.5em;  
						left: 1.5em;  
						z-index: 9999;  
						max-width: 30%;  
					}  
					.new-interface-info__content-block {  
						position: absolute;  
						top: 1.5em;  
						right: 1.5em;  
						z-index: 9999;  
						max-width: 60%;  
						background: linear-gradient(135deg,   
							rgba(0,0,0,0.7) 0%,   
							rgba(0,0,0,0.3) 100%);  
						border-radius: 1.5em;  
						backdrop-filter: blur(20px);  
						padding: 2em;  
						transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);  
					}  
					.new-interface-info__content-block:hover {  
						transform: translateY(-2px);  
						box-shadow: 0 8px 25px rgba(0,0,0,0.3);  
					}  
					.new-interface-info__head {  
						color: rgba(255, 255, 255, 0.6);  
						font-size: 1.3em;  
						min-height: 1em;  
					}  
					.new-interface-info__head span {  
						color: #fff;  
					}  
					.new-interface-info__title {  
						font-size: 5em;  
						font-weight: 700;  
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
						text-shadow: 2px 2px 4px rgba(0,0,0,0.8);  
						letter-spacing: -0.02em;  
						min-height: 6em !important;  
						overflow: visible !important;  
					}  
					.new-interface-info__title img {  
						max-width: 12em !important;  
						max-height: 6em !important;  
						width: auto !important;  
						height: auto !important;  
						object-fit: contain !important;  
						margin: 0 !important;  
						display: block !important;  
					}  
					.new-interface-info__details {  
						margin-top: 1.5em;  
						margin-bottom: 0;  
						display: flex;  
						align-items: center;  
						flex-wrap: wrap;  
						min-height: 1.9em;  
						font-size: 1.3em;  
						transition: all 0.3s ease;  
						transform: translateY(0);  
					}  
					.new-interface-info__details:hover {  
						transform: translateY(-2px);  
					}  
					.new-interface-info__details > * {  
						background: rgba(255,255,255,0.1);  
						padding: 0.3em 0.8em;  
						border-radius: 1.5em;  
						margin: 0.2em;  
						backdrop-filter: blur(10px);  
						border: 1px solid rgba(255,255,255,0.2);  
					}  
					.new-interface-info__split {  
						margin: 0 1em;  
						font-size: 0.7em;  
					}  
					.new-interface-info__description {  
						font-size: 1.6em;  
						font-weight: 310;  
						line-height: 1.6;  
						overflow: hidden;  
						-o-text-overflow: '.';  
						text-overflow: '.';  
						display: -webkit-box;  
						-webkit-line-clamp: 4;  
						line-clamp: 4;  
						-webkit-box-orient: vertical;  
						width: 100%;  
						text-shadow: 1px 1px 2px rgba(0,0,0,0.6);  
						color: rgba(255,255,255,0.95);  
						transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);  
					}  
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
						overflow: hidden;  
					}  
					.new-interface .full-start__background {  
						position: absolute;  
						height: 100%;  
						width: 100%;  
						top: 0;  
						left: 0;  
						opacity: 0;  
						object-fit: cover;  
						transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);  
						filter: blur(2px);  
						transform: scale(1.05);  
					}  
					.new-interface .full-start__background.active {  
						opacity: 0.4;  
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
						z-index: 999;  
						width: 69%;  
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
					.items-line {  
						padding-bottom: 4em !important;  
					}  
					.new-interface-info {  
						position: relative;  
						padding: 1.5em;  
						height: 19.8em;  
					}  
					.new-interface-info__logo-block {  
						position: absolute;  
						top: 1.5em;  
						left: 1.5em;  
						z-index: 9999;  
						max-width: 30%;  
					}  
					.new-interface-info__content-block {  
						position: absolute;  
						top: 1.5em;  
						right: 1.5em;  
						z-index: 9999;  
						max-width: 60%;  
						background: linear-gradient(135deg,   
							rgba(0,0,0,0.7) 0%,   
							rgba(0,0,0,0.3) 100%);  
						border-radius: 1.5em;  
						backdrop-filter: blur(20px);  
						padding: 2em;  
						transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);  
					}  
					.new-interface-info__content-block:hover {  
						transform: translateY(-2px);  
						box-shadow: 0 8px 25px rgba(0,0,0,0.3);  
					}  
					.new-interface-info__head {  
						color: rgba(255, 255, 255, 0.6);  
						font-size: 1.3em;  
						min-height: 1em;  
					}  
					.new-interface-info__head span {  
						color: #fff;  
					}  
					.new-interface-info__title {  
						font-size: 5em;  
						font-weight: 700;  
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
						text-shadow: 2px 2px 4px rgba(0,0,0,0.8);  
						letter-spacing: -0.02em;  
						min-height: 6em !important;  
						overflow: visible !important;  
					}  
					.new-interface-info__title img {  
						max-width: 12em !important;  
						max-height: 6em !important;  
						width: auto !important;  
						height: auto !important;  
						object-fit: contain !important;  
						margin: 0 !important;  
						display: block !important;  
					}  
					.new-interface-info__details {  
						margin-top: 1.5em;  
						margin-bottom: 0;  
						display: flex;  
						align-items: center;  
						flex-wrap: wrap;  
						min-height: 1.9em;  
						font-size: 1.3em;  
						transition: all 0.3s ease;  
						transform: translateY(0);  
					}  
					.new-interface-info__details:hover {  
						transform: translateY(-2px);  
					}  
					.new-interface-info__details > * {  
						background: rgba(255,255,255,0.1);  
						padding: 0.3em 0.8em;  
						border-radius: 1.5em;  
						margin: 0.2em;  
						backdrop-filter: blur(10px);  
						border: 1px solid rgba(255,255,255,0.2);  
					}  
					.new-interface-info__split {  
						margin: 0 1em;  
						font-size: 0.7em;  
					}  
					.new-interface-info__description {  
						font-size: 1.6em;  
						font-weight: 310;  
						line-height: 1.6;  
						overflow: hidden;  
						-o-text-overflow: '.';  
						text-overflow: '.';  
						display: -webkit-box;  
						-webkit-line-clamp: 4;  
						line-clamp: 4;  
						-webkit-box-orient: vertical;  
						width: 100%;  
						text-shadow: 1px 1px 2px rgba(0,0,0,0.6);  
						color: rgba(255,255,255,0.95);  
						transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);  
					}  
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
						overflow: hidden;  
					}  
					.new-interface .full-start__background {  
						position: absolute;  
						height: 100%;  
						width: 100%;  
						top: 0;  
						left: 0;  
						opacity: 0;  
						object-fit: cover;  
						transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);  
						filter: blur(2px);  
						transform: scale(1.05);  
					}  
					.new-interface .full-start__background.active {  
						opacity: 0.4;  
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
						z-index: 999;  
						width: 69%;  
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
  
	function addStyles() {  
		var styles = getWideStyles();  
		if (Lampa.Storage.get("interface_size") === "small") {  
			styles = getSmallStyles();  
		}  
		$("head").append(styles);  
	}  
  
	function wrapMethod(object, methodName, wrapper) {  
		if (!object || !object[methodName]) return;  
		var originalMethod = object[methodName];  
		object[methodName] = function () {  
			return wrapper.call(this, originalMethod, arguments);  
		};  
	}  
  
	function shouldEnableInterface(object) {  
		if (!object || !object.object) return false;  
		var data = object.object;  
		return data && (data.source === "tmdb" || data.source === "cub");  
	}  
  
	function extendResultsWithStyle(data) {  
		if (!data || !data.results) return;  
		data.results.forEach(function (item) {  
			if (item) {  
				item.new_interface_style = true;  
			}  
		});  
	}  
  
	function handleLineAppend(instance, element, data) {  
		if (!data || !data.results) return;  
		var cards = element.find(".card");  
		cards.each(function (i) {  
			var card = $(this);  
			var item = data.results[i];  
			if (item && item.new_interface_style) {  
				card.addClass("new-interface--card");  
			}  
		});  
	}  
  
	function getOrCreateState(instance) {  
		if (!instance.__newInterfaceState) {  
			instance.__newInterfaceState = new NewInterfaceState(instance);  
		}  
		return instance.__newInterfaceState;  
	}  
  
	function NewInterfaceState(mainInstance) {  
		var main = mainInstance;  
		var info = null;  
		var backgroundWrapper = null;  
		var backgroundOne = null;  
		var backgroundTwo = null;  
		var currentBackground = null;  
		var infoPanel = null;  
		var attached = false;  
  
		function createBackgroundElements() {  
			if (!backgroundWrapper) {  
				backgroundWrapper = $('<div class="full-start__background-wrapper"></div>');  
				backgroundOne = $('<div class="full-start__background background__one"></div>');  
				backgroundTwo = $('<div class="full-start__background background__two"></div>');  
				backgroundWrapper.append(backgroundOne).append(backgroundTwo);  
			}  
		}  
  
		function updateBackground(data) {  
			if (!Lampa.Storage.get("show_background", true)) return;  
			  
			createBackgroundElements();  
			  
			var path = data && data.backdrop_path ? Lampa.Api.img(data.backdrop_path, "w1280") : "";  
			  
			if (!path || path === currentBackground) return;  
			  
			var targetBackground = currentBackground === backgroundOne.attr("data-src") ? backgroundTwo : backgroundOne;  
			var activeBackground = targetBackground.is(backgroundOne) ? backgroundTwo : backgroundOne;  
			  
			targetBackground.attr("data-src", path);  
			targetBackground.css({  
				"background-image": "url(" + path + ")",  
				"opacity": "0"  
			});  
			  
			setTimeout(function() {  
				targetBackground.addClass("active");  
				activeBackground.removeClass("active");  
				currentBackground = path;  
			}, 50);  
		}  
  
		function createInfoPanel() {  
			if (!infoPanel) {  
				infoPanel = new InfoPanel();  
			}  
		}  
  
		function attach() {  
			if (attached) return;  
  
			var container = main.render(true);  
			if (!container) return;  
  
			container.classList.add("new-interface");  
  
			if (!backgroundWrapper.parentElement) {  
				container.appendChild(backgroundWrapper);  
			}  
  
			createInfoPanel();  
			var infoElement = infoPanel.render(true);  
			this.infoElement = infoElement;  
  
			if (infoElement && infoElement.parentNode !== container) {  
				container.appendChild(infoElement);  
			}  
  
			main.scroll.minus(infoElement);  
			attached = true;  
		}  
  
		function detach() {  
			if (!attached) return;  
  
			var container = main.render(true);  
			if (container && infoElement) {  
				container.removeChild(infoElement);  
			}  
  
			if (backgroundWrapper && backgroundWrapper.parentElement) {  
				backgroundWrapper.parentElement.removeChild(backgroundWrapper);  
			}  
  
			main.scroll.minus(infoElement);  
			attached = false;  
		}  
  
		function update(data) {  
			if (!data) return;  
  
			createInfoPanel();  
			updateBackground(data);  
			infoPanel.update(data);  
		}  
  
		this.attach = attach;  
		this.detach = detach;  
		this.update = update;  
	}  
  
	function InfoPanel() {  
		var html = null;  
		var fadeTimer = null;  
		var timer = null;  
		var network = new Lampa.Reguest();  
		var loaded = {};  
		var currentUrl = null;  
		var lastRenderId = null;  
  
		function create() {  
			html = $(`<div class="new-interface-info">  
						<div class="new-interface-info__logo-block">  
							<div class="new-interface-info__head"></div>  
							<div class="new-interface-info__title"></div>  
						</div>  
						<div class="new-interface-info__content-block">  
							<div class="new-interface-info__description"></div>  
							<div class="new-interface-info__details"></div>  
						</div>  
					</div>`);  
		}  
  
		function render(asElement) {  
			if (!html) create();  
			return asElement ? html[0] : html;  
		}  
  
		function update(data) {  
			if (!data || !html) return;  
  
			lastRenderId = Date.now();  
			var currentRenderId = lastRenderId;  
  
			this.html.find(".new-interface-info__head,.new-interface-info__details").removeClass("visible");  
  
			var title = this.html.find(".new-interface-info__title");  
			var desc = this.html.find(".new-interface-info__description");  
  
			desc.text(data.overview || Lampa.Lang.translate("full_notext"));  
  
			clearTimeout(this.fadeTimer);  
  
			Lampa.Background.change(Lampa.Api.img(data.backdrop_path, "original"));  
  
			this.load(data);  
  
			if (Lampa.Storage.get("logo_show", true)) {  
				title.text(data.title || data.name || "");  
				title.css({ opacity: 1 });  
				this.showLogo(data, currentRenderId);  
			} else {  
				title.text(data.title || data.name || "");  
				title.css({ opacity: 1 });  
			}  
		};  
  
		InfoPanel.prototype.showLogo = function (data, renderId) {  
			var _this = this;  
  
			var FADE_OUT_TEXT = 300;  
			var MORPH_HEIGHT = 400;  
			var FADE_IN_IMG = 400;  
			var TARGET_WIDTH = "12em";  
			var PADDING_TOP_EM = 0;  
			var PADDING_BOTTOM_EM = 0.2;  
  
			var title_elem = this.html.find(".new-interface-info__title");  
			var head_elem = this.html.find(".new-interface-info__head");  
			var details_elem = this.html.find(".new-interface-info__details");  
			var dom_title = title_elem[0];  
  
			function animateHeight(element, start, end, duration, callback) {  
				var startTime = null;  
				function step(timestamp) {  
					if (!startTime) startTime = timestamp;  
					var progress = timestamp - startTime;  
					var percent = Math.min(progress / duration, 1);  
					var ease = 1 - Math.pow(1 - percent, 3);  
					element.style.height = start + (end - start) * ease + "px";  
					if (progress < duration) {  
						requestAnimationFrame(step);  
					} else {  
						if (callback) callback();  
					}  
				}  
				requestAnimationFrame(step);  
			}  
  
			function animateOpacity(element, start, end, duration, callback) {  
				var startTime = null;  
				function step(timestamp) {  
					if (!startTime) startTime = timestamp;  
					var progress = timestamp - startTime;  
					var percent = Math.min(progress / duration, 1);  
					var ease = 1 - Math.pow(1 - percent, 3);  
					element.style.opacity = start + (end - start) * ease;  
					if (progress < duration) {  
						requestAnimationFrame(step);  
					} else {  
						if (callback) callback();  
					}  
				}  
				requestAnimationFrame(step);  
			}  
  
			function applyFinalStyles(img, text_height) {  
				img.style.marginTop = "0";  
				img.style.marginLeft = "0";  
				img.style.paddingTop = PADDING_TOP_EM + "em";  
				img.style.paddingBottom = PADDING_BOTTOM_EM + "em";  
				img.style.imageRendering = "-webkit-optimize-contrast";  
  
				img.style.width = "12em";  
				img.style.height = "auto";  
				img.style.maxWidth = "100%";  
				img.style.maxHeight = "none";  
				img.style.minHeight = "auto";  
  
				img.style.boxSizing = "border-box";  
				img.style.display = "block";  
				img.style.objectFit = "contain";  
				img.style.objectPosition = "center center";  
				img.style.transition = "none";  
			}  
  
			function moveHeadToDetails(animate) {  
				if (!head_elem.length || !details_elem.length) return;  
				if (details_elem.find(".logo-moved-head").length > 0) return;  
  
				var content = head_elem.html();  
				if (!content || content.trim() === "") return;  
  
				var new_item = $('<span class="logo-moved-head">' + content + "</span>");  
				var separator = $('<span class="new-interface-info__split logo-moved-separator">●</span>');  
  
				if (animate) {  
					new_item.css({ opacity: 0, transition: "none" });  
					separator.css({ opacity: 0, transition: "none" });  
				}  
  
				if (details_elem.children().length > 0) details_elem.append(separator);  
				details_elem.append(new_item);  
  
				if (animate) {  
					head_elem.css({  
						transition: "opacity " + FADE_OUT_TEXT / 1000 + "s ease",  
						opacity: "0",  
					});  
  
					setTimeout(function () {  
						new_item.css({ transition: "opacity " + FADE_IN_IMG / 1000 + "s ease", opacity: "1" });  
						separator.css({ transition: "opacity " + FADE_IN_IMG / 1000 + "s ease", opacity: "1" });  
					}, FADE_OUT_TEXT);  
				} else {  
					head_elem.css({ opacity: "0", transition: "none" });  
				}  
			}  
  
			function startLogoAnimation(img_url, fromCache) {  
				if (renderId && renderId !== _this.lastRenderId) return;  
  
				var img = new Image();  
				img.src = img_url;  
  
				var start_text_height = 0;  
				if (dom_title) start_text_height = dom_title.getBoundingClientRect().height;  
  
				if (fromCache) {  
					if (dom_title) start_text_height = dom_title.getBoundingClientRect().height;  
  
					moveHeadToDetails(false);  
					applyFinalStyles(img, start_text_height);  
  
					title_elem.empty().append(img);  
					title_elem.css({ opacity: "1", transition: "none" });  
  
					if (dom_title) {  
						dom_title.style.display = "block";  
						dom_title.style.height = "";  
						dom_title.style.transition = "none";  
					}  
					img.style.opacity = "1";  
					return;  
				}  
  
				applyFinalStyles(img, start_text_height);  
				img.style.opacity = "0";  
  
				img.onload = function () {  
					if (renderId && renderId !== _this.lastRenderId) return;  
  
					setTimeout(function () {  
						if (renderId && renderId !== _this.lastRenderId) return;  
  
						if (dom_title) start_text_height = dom_title.getBoundingClientRect().height;  
  
						moveHeadToDetails(true);  
  
						title_elem.css({  
							transition: "opacity " + FADE_OUT_TEXT / 1000 + "s ease",  
							opacity: "0",  
						});  
  
						setTimeout(function () {  
							if (renderId && renderId !== _this.lastRenderId) return;  
  
							title_elem.empty();  
							title_elem.append(img);  
							title_elem.css({ opacity: "1", transition: "none" });  
  
							var target_container_height = dom_title.getBoundingClientRect().height;  
  
							dom_title.style.height = start_text_height + "px";  
							dom_title.style.display = "block";  
							dom_title.style.overflow = "hidden";  
							dom_title.style.boxSizing = "border-box";  
  
							void dom_title.offsetHeight;  
  
							dom_title.style.transition = "height " + MORPH_HEIGHT / 1000 + "s cubic-bezier(0.4, 0, 0.2, 1)";  
  
							requestAnimationFrame(function () {  
								if (renderId && renderId !== _this.lastRenderId) return;  
								dom_title.style.height = target_container_height + "px";  
  
								setTimeout(  
									function () {  
										if (renderId && renderId !== _this.lastRenderId) return;  
										img.style.transition = "opacity " + FADE_IN_IMG / 1000 + "s ease";  
										img.style.opacity = "1";  
									},  
									Math.max(0, MORPH_HEIGHT - 100),  
								);  
  
								setTimeout(  
									function () {  
										if (renderId && renderId !== _this.lastRenderId) return;  
										applyFinalStyles(img, start_text_height);  
										dom_title.style.height = "";  
									},  
									MORPH_HEIGHT + FADE_IN_IMG + 50,  
								);  
							});  
						}, FADE_OUT_TEXT);  
					}, 200);  
				};  
  
				img.onerror = function () {  
					title_elem.css({ opacity: "1", transition: "none" });  
				};  
			}  
  
			if (data.id) {  
				var type = data.name ? "tv" : "movie";  
				var language = Lampa.Storage.get("language");  
				var cache_key = "logo_cache_v2_" + type + "_" + data.id + "_" + language;  
				var cached_url = Lampa.Storage.get(cache_key);  
  
				if (cached_url && cached_url !== "none") {  
					var img_cache = new Image();  
					img_cache.src = cached_url;  
  
					if (img_cache.complete) {  
						startLogoAnimation(cached_url, true);  
					} else {  
						startLogoAnimation(cached_url, false);  
					}  
				} else {  
					var url = Lampa.TMDB.api(type + "/" + data.id + "/images?api_key=" + Lampa.TMDB.key() + "&include_image_language=" + language + ",en,null");  
  
					$.get(url, function (data_api) {  
						if (renderId && renderId !== _this.lastRenderId) return;  
  
						var final_logo = null;  
						if (data_api.logos && data_api.logos.length > 0) {  
							for (var i = 0; i < data_api.logos.length; i++) {  
								if (data_api.logos[i].iso_639_1 == language) {  
									final_logo = data_api.logos[i].file_path;  
									break;  
								}  
							}  
							if (!final_logo) {  
								for (var j = 0; j < data_api.logos.length; j++) {  
									if (data_api.logos[j].iso_639_1 == "en") {  
										final_logo = data_api.logos[j].file_path;  
										break;  
									}  
								}  
							}  
							if (!final_logo) final_logo = data_api.logos[0].file_path;  
						}  
  
						if (final_logo) {  
							var img_url = Lampa.TMDB.image("/t/p/original" + final_logo.replace(".svg", ".png"));  
							Lampa.Storage.set(cache_key, img_url);  
							startLogoAnimation(img_url, false);  
						} else {  
							Lampa.Storage.set(cache_key, "none");  
						}  
					}).fail(function () {  
						Lampa.Storage.set(cache_key, "none");  
					});  
				}  
			}  
		};  
  
		InfoPanel.prototype.load = function (data) {  
			var _this = this;  
			var need = Lampa.Arrays.clone(data);  
			var where = { id: data.id };  
  
			if (this.loaded[where.id]) {  
				this.build(this.loaded[where.id]);  
				return;  
			}  
  
			this.network.silent(Lampa.TMDB.api((data.name ? "tv" : "movie") + "/" + data.id), function (json) {  
				_this.loaded[where.id] = json;  
				_this.build(json);  
			}, function (a, c) {  
				Lampa.Noty.show(Lampa.Lang.translate("title_error") + " - " + Lampa.Lang.translate("title_error_network"));  
			});  
		};  
  
		InfoPanel.prototype.build = function (data) {  
			var genres = [];  
			var countries = [];  
			var companies = [];  
  
			if (data.genres) {  
				data.genres.forEach(function (item) {  
					genres.push(Lampa.Utils.capitalizeFirstLetter(item.name));  
				});  
			}  
  
			if (data.production_countries) {  
				data.production_countries.forEach(function (item) {  
					countries.push(Lampa.Utils.capitalizeFirstLetter(item.name));  
				});  
			}  
  
			if (data.production_companies) {  
				data.production_companies.forEach(function (item) {  
					companies.push(Lampa.Utils.capitalizeFirstLetter(item.name));  
				});  
			}  
  
			var year = data.first_air_date || data.release_date;  
			year = year ? year.split("-")[0] : "";  
  
			var headInfo = [];  
			var detailsInfo = [];  
  
			if (Lampa.Storage.get("status", true) && data.status) {  
				headInfo.push(Lampa.Lang.translate("full_status") + ": " + Lampa.Lang.translate("full_status_" + data.status));  
			}  
  
			if (Lampa.Storage.get("seas", false) && data.number_of_seasons) {  
				detailsInfo.push(Lampa.Lang.translate("full_seasons") + ": " + data.number_of_seasons);  
			}  
  
			if (Lampa.Storage.get("eps", false) && data.number_of_episodes) {  
				detailsInfo.push(Lampa.Lang.translate("full_episodes") + ": " + data.number_of_episodes);  
			}  
  
			if (Lampa.Storage.get("year_ogr", true) && year) {  
				detailsInfo.push(year);  
			}  
  
			if (Lampa.Storage.get("vremya", true) && data.episode_run_time && data.episode_run_time.length) {  
				detailsInfo.push(Lampa.Utils.parseTime(data.episode_run_time[0] * 60));  
			}  
  
			if (Lampa.Storage.get("ganr", true) && genres.length) {  
				detailsInfo.push(genres.slice(0, 3).join(", "));  
			}  
  
			if (Lampa.Storage.get("rat", true) && data.vote_average && data.vote_average > 0) {  
				detailsInfo.push(Lampa.Stars.vote(data.vote_average));  
			}  
  
			this.html.find(".new-interface-info__head").empty().append(headInfo.join(", ")).toggleClass("visible", headInfo.length > 0);  
			this.html.find(".new-interface-info__details").html(detailsInfo.join('<span class="new-interface-info__split">●</span>')).addClass("visible");  
		};  
  
		InfoPanel.prototype.empty = function () {  
			if (!this.html) return;  
			this.html.find(".new-interface-info__head,.new-interface-info__details").text("").removeClass("visible");  
		};  
  
		InfoPanel.prototype.destroy = function () {  
			clearTimeout(this.fadeTimer);  
			clearTimeout(this.timer);  
			this.network.clear();  
			this.currentUrl = null;  
  
			if (this.html) {  
				this.html.remove();  
				this.html = null;  
			}  
		};  
  
		function siStyleGetColorByRating(vote) {  
			if (isNaN(vote)) return "";  
			if (vote >= 0 && vote <= 3) return "red";  
			if (vote > 3 && vote < 6) return "orange";  
			if (vote >= 6 && vote < 7) return "cornflowerblue";  
			if (vote >= 7 && vote < 8) return "darkmagenta";  
			if (vote >= 8 && vote <= 10) return "lawngreen";  
			return "";  
		}  
  
		function siStyleApplyColorByRating(element) {  
			var $el = $(element);  
			var voteText = $el.text().trim();  
  
			if (/^\d+(\.\d+)?K$/.test(voteText)) return;  
  
			var match = voteText.match(/(\d+(\.\d+)?)/);  
			if (!match) return;  
  
			var vote = parseFloat(match[0]);  
			var color = siStyleGetColorByRating(vote);  
  
			if (color && Lampa.Storage.get("si_colored_ratings", true)) {  
				$el.css("color", color);  
  
				if (Lampa.Storage.get("si_rating_border", false) && !$el.hasClass("card__vote")) {  
					if ($el.parent().hasClass("full-start__rate")) {  
						$el.parent().css("border", "1px solid " + color);  
						$el.css("border", "");  
					} else if ($el.hasClass("full-start__rate") || $el.hasClass("full-start-new__rate") || $el.hasClass("info__rate")) {  
						$el.css("border", "1px solid " + color);  
					} else {  
						$el.css("border", "");  
					}  
				} else {  
					$el.css("border", "");  
					if ($el.parent().hasClass("full-start__rate")) {  
						$el.parent().css("border", "");  
					}  
				}  
			} else {  
				$el.css("color", "");  
				$el.css("border", "");  
				if ($el.parent().hasClass("full-start__rate")) {  
					$el.parent().css("border", "");  
				}  
			}  
		}  
  
		function siStyleUpdateVoteColors() {  
			if (!Lampa.Storage.get("si_colored_ratings", true)) return;  
  
			$(".card__vote").each(function () {  
				siStyleApplyColorByRating(this);  
			});  
  
			$(".full-start__rate, .full-start-new__rate").each(function () {  
				siStyleApplyColorByRating(this);  
			});  
  
			$(".info__rate, .card__imdb-rate, .card__kinopoisk-rate").each(function () {  
				siStyleApplyColorByRating(this);  
			});  
  
			$(".rate--kp, .rate--imdb, .rate--cub").each(function () {  
				siStyleApplyColorByRating($(this).find("> div").eq(0));  
			});  
		}  
  
		function siStyleSetupVoteColorsObserver() {  
			siStyleUpdateVoteColors();  
  
			var pendingUpdate = null;  
			var observer = new MutationObserver(function (mutations) {  
				if (!Lampa.Storage.get("si_colored_ratings", true)) return;  
  
			for (var i = 0; i < mutations.length; i++) {  
				var added = mutations[i].addedNodes;  
				for (var j = 0; j < added.length; j++) {  
					var node = added[j];  
					if (node.nodeType === 1) {  
						var $node = $(node);  
						$node.find(".card__vote, .full-start__rate, .full-start-new__rate, .info__rate, .card__imdb-rate, .card__kinopoisk-rate").each(function () {  
							siStyleApplyColorByRating(this);  
						});  
						$node.find(".rate--kp, .rate--imdb, .rate--cub").each(function () {  
							siStyleApplyColorByRating($(this).find("> div").eq(0));  
						});  
						if ($node.hasClass("card__vote") || $node.hasClass("full-start__rate") || $node.hasClass("info__rate")) {  
							siStyleApplyColorByRating(node);  
						}  
						if ($node.hasClass("rate--kp") || $node.hasClass("rate--imdb") || $node.hasClass("rate--cub")) {  
							siStyleApplyColorByRating($node.find("> div").eq(0));  
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
  
	function siStyleSetupVoteColorsForDetailPage() {  
		if (!window.Lampa || !Lampa.Listener) return;  
  
		Lampa.Listener.follow("full", function (data) {  
			if (data.type === "complite") {  
				siStyleUpdateVoteColors();  
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
			field: { name: "Показывать жанр" },  
		});  
  
		Lampa.SettingsApi.addParam({  
			component: "style_interface",  
			param: { name: "rat", type: "trigger", default: true },  
			field: { name: "Показывать рейтинг" },  
		});  
  
		Lampa.SettingsApi.addParam({  
			component: "style_interface",  
			param: { name: "si_colored_ratings", type: "trigger", default: true },  
			field: { name: "Цветные рейтинги" },  
		});  
  
		Lampa.SettingsApi.addParam({  
			component: "style_interface",  
			param: { name: "async_load", type: "trigger", default: true },  
			field: { name: "Асинхронная загрузка логотипов" },  
		});  
  
		Lampa.SettingsApi.addParam({  
			component: "style_interface",  
			param: { name: "hide_captions", type: "trigger", default: true },  
			field: { name: "Скрыть подписи на карточках" },  
		});  
  
		Lampa.SettingsApi.addParam({  
			component: "style_interface",  
			param: { name: "si_rating_border", type: "trigger", default: false },  
			field: { name: "Обводка для рейтингов" },  
		});  
  
		Lampa.SettingsApi.addParam({  
			component: "style_interface",  
			param: { name: "clear_logo_cache", type: "button", default: false },  
			field: { name: "Очистить кеш логотипов" },  
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
			Lampa.Storage.set("si_colored_ratings", "true");  
			Lampa.Storage.set("async_load", "true");  
			Lampa.Storage.set("hide_captions", "true");  
			Lampa.Storage.set("si_rating_border", "false");  
			Lampa.Storage.set("interface_size", "small");  
		}  
	}  
})();

    
  
  
  
