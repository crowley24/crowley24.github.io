/*jshint esversion: 6 */  
/* global $, Lampa, Navigator */  
(function () {  
'use strict';  
var plugin = {  
	component: 'my_iptv',  
	icon: "<svg height=\"244\" viewBox=\"0 0 260 244\" xmlns=\"http://www.w3.org/2000/svg\" style=\"fill-rule:evenodd;\" fill=\"currentColor\"><path d=\"M259.5 47.5v114c-1.709 14.556-9.375 24.723-23 30.5a2934.377 2934.377 0 0 1-107 1.5c-35.704.15-71.37-.35-107-1.5-13.625-5.777-21.291-15.944-23-30.5v-115c1.943-15.785 10.61-25.951 26-30.5a10815.71 10815.71 0 0 1 208 0c15.857 4.68 24.523 15.18 26 31.5zm-230-13a4963.403 4963.403 0 0 0 199 0c5.628 1.128 9.128 4.462 10.5 10 .667 40 .667 80 0 120-1.285 5.618-4.785 8.785-10.5 9.5-66 .667-132 .667-198 0-5.715-.715-9.215-3.882-10.5-9.5-.667-40-.667-80 0-120 1.35-5.18 4.517-8.514 9.5-10z\"/><path d=\"M70.5 71.5c17.07-.457 34.07.043 51 1.5 5.44 5.442 5.107 10.442-1 15-5.991.5-11.991.666-18 .5.167 14.337 0 28.671-.5 43-3.013 5.035-7.18 6.202-12.5 3.5a11.529 11.529 0 0 1-3.5-4.5 882.407 882.407 0 0 1-.5-42c-5.676.166-11.343 0-17-.5-4.569-2.541-6.069-6.375-4.5-11.5 1.805-2.326 3.972-3.992 6.5-5zM137.5 73.5c4.409-.882 7.909.452 10.5 4a321.009 321.009 0 0 0 16 30 322.123 322.123 0 0 0 16-30c2.602-3.712 6.102-4.879 10.5-3.5 5.148 3.334 6.314 7.834 3.5 13.5a1306.032 1306.032 0 0 0-22 43c-5.381 6.652-10.715 6.652-16 0a1424.647 1424.647 0 0 0-23-45c-1.691-5.369-.191-9.369 4.5-12zM57.5 207.5h144c7.788 2.242 10.288 7.242 7.5 15a11.532 11.532 0 0 1-4.5 3.5c-50 .667-100 .667-150 0-6.163-3.463-7.496-8.297-4-14.5 2.025-2.064 4.358-3.398 7-4z\"/></svg>",  
	name: 'ipTV'  
};  
var isSNG = false;  
var lists = [];  
var curListId = -1;  
var defaultGroup = 'Other';  
var catalog = {};  
var listCfg = {};  
var EPG = {};  
var layerInterval;  
var epgInterval;  
var UID = '';  
  
var chNumber = '';  
var chTimeout = null;  
var stopRemoveChElement = false;  
var chPanel = $(  
	"<div class=\"player-info info--visible js-ch-PLUGIN\" style=\"top: 9em;right: auto;z-index: 1000;\">" +  
	"	<div class=\"player-info__body\">" +  
	"		<div class=\"player-info__line\">" +  
	"			<div class=\"player-info__name\">&nbsp;</div>" +  
	"		</div>" +  
	"	</div>" +  
	"</div>".replace(/PLUGIN/g, plugin.component)  
).hide().fadeOut(0);  
var chHelper = $(  
	"<div class=\"player-info info--visible js-ch-PLUGIN\" style=\"top: 14em;right: auto;z-index: 1000;\">" +  
	"	<div class=\"player-info__body\">" +  
	"		<div class=\"tv-helper\"></div>" +  
	"	</div>" +  
	"</div>".replace(/PLUGIN/g, plugin.component)  
).hide().fadeOut(0);  
var epgTemplate = $(  
	'<div id="PLUGIN_epg">' +  
	'<h2 class="js-epgChannel"></h2>' +  
	'<div class="PLUGIN-details__program-body js-epgNow">' +  
	'   <div class="PLUGIN-details__program-title">Сейчас</div>' +  
	'   <div class="PLUGIN-details__program-list">' +  
	'<div class="PLUGIN-program selector">' +  
	'   <div class="PLUGIN-program__time js-epgTime">XX:XX</div>' +  
	'   <div class="PLUGIN-program__body">' +  
	'	   <div class="PLUGIN-program__title js-epgTitle"> </div>' +  
	'	   <div class="PLUGIN-program__progressbar"><div class="PLUGIN-program__progress js-epgProgress" style="width: 50%"></div></div>' +  
	'   </div>' +  
	'</div>' +  
	'   </div>' +  
	'   <div class="PLUGIN-program__desc js-epgDesc"></div>' +  
	'</div>' +  
	'<div class="PLUGIN-details__program-body js-epgAfter">' +  
	'   <div class="PLUGIN-details__program-title">Потом</div>' +  
	'   <div class="PLUGIN-details__program-list js-epgList">' +  
	'   </div>' +  
	'</div>' +  
	'</div>'.replace(/PLUGIN/g, plugin.component)  
);  
function epgListView(isView) {  
	// EPG тепер у правій колонці, не змінюємо float  
}  
var epgItemTeplate = $(  
	'<div class="PLUGIN-program selector">' +  
	'   <div class="PLUGIN-program__time js-epgTime">XX:XX</div>' +  
	'   <div class="PLUGIN-program__body">' +  
	'	   <div class="PLUGIN-program__title js-epgTitle"> </div>' +  
	'   </div>' +  
	'</div>'.replace(/PLUGIN/g, plugin.component)  
);  
  
// Реєстрація шаблону трьохколонкового інтерфейсу  
Lampa.Template.add('cub_iptv_content', `  
	<div class="iptv-content">  
		<div class="iptv-content__menu"></div>  
		<div class="iptv-content__channels"></div>  
		<div class="iptv-content__details"></div>  
	</div>  
`);  
  
function epgRender(epgId) {  
	if (!epgId || !EPG[epgId]) return;  
	var epg = EPG[epgId][2];  
	var i = epg.length ? epg.findIndex(function (e) {  
		var t = unixtime();  
		return e[0] * 60 < t && (e[0] + e[1]) * 60 > t;  
	}) : 0;  
	if (i < 0) i = 0;  
	var p = 0;  
	if (i < epg.length) {  
		var t = unixtime();  
		p = Math.min(100, Math.max(0, (t - epg[i][0] * 60) / (epg[i][1] * 60) * 100));  
	}  
	var enableCardEpg = getStorage('epg', 'false') !== 'false';  
	$('.' + plugin.component + ' .js-epgNoRender[data-epg-id="' + epgId + '"]').each(function () {  
		var epgEl = $(this).find('.js-epgProgress');  
		if (epgEl.length) {  
			var cId = epgId + '_' + epg.length + (epg.length ? '_' + epg[0][0] : '');  
			var cIdEl = epgEl.data('cId') || '';  
			if (cIdEl !== cId) {  
				epgEl.data('cId', cId);  
				epgEl.data('progress', p);  
				epgEl.find('.js-epgTitle').text(epg[i][2]);  
				epgEl.find('.js-epgProgress').css('width', p + '%');  
				epgEl.show();  
			} else if (epgEl.data('progress') !== p) {  
				epgEl.data('progress', p);  
				epgEl.find('.js-epgProgress').css('width', p + '%');  
			}  
		}  
	});  
	var ec = $('#' + plugin.component + '_epg');  
	if (ec.length) {  
		var epgNow = ec.find('.js-epgNow');  
		var cId = epgId + '_' + epg.length + (epg.length ? '_' + epg[0][0] : '');  
		var cIdEl = ec.data('cId') || '';  
		if (cIdEl !== cId) {  
			ec.data('cId', cId);  
			var epgAfter = ec.find('.js-epgAfter');  
			if (i < epg.length) {  
				var slt = toLocaleTimeString(epg[i][0] * 60000);  
				var elt = toLocaleTimeString((epg[i][0] + epg[i][1]) * 60000);  
				epgNow.data('progress', p);  
				epgNow.find('.js-epgProgress').css('width', p + '%');  
				epgNow.find('.js-epgTime').text(slt);  
				epgNow.find('.js-epgTitle').text(epg[i][2]);  
				var desc = epg[i][3] ? ('<p>' + encoder.text(epg[i][3]).html() + '</p>') : '';  
				epgNow.find('.js-epgDesc').html(desc.replace(/\n/g, '</p><p>'));  
				epgNow.show();  
			} else {  
				epgNow.hide();  
			}  
			if (epg.length > i) {  
				var list = epgAfter.find('.js-epgList');  
				list.empty();  
				var iEnd = Math.min(epg.length, i + 8);  
				for (; i < iEnd; i++) {  
					var e = epg[i];  
					var item = epgItemTeplate.clone();  
					item.find('.js-epgTime').text(toLocaleTimeString(e[0] * 60000));  
					item.find('.js-epgTitle').text(e[2]);  
					list.append(item);  
				}  
				epgAfter.show();  
			} else {  
				epgAfter.hide();  
			}  
		} else if (i < epg.length && epgNow.data('progress') !== p) {  
			epgNow.data('progress', p);  
			epgNow.find('.js-epgProgress').css('width', p + '%');  
		}  
	}  
	if (!enableCardEpg) $('.' + plugin.component + ' .js-epgNoRender').hide();  
	if (epg.length < 3) epgUpdateData(epgId);  
}  
  
function epgUpdateData(epgId) {  
	if (!epgId || !listCfg.epgApiChUrl) return;  
	networkSilentSessCache(listCfg.epgApiChUrl.replace('/channels', '/epg/' + epgId), function (d) {  
		if (d && d.length) {  
			EPG[epgId][2] = d;  
			epgRender(epgId);  
		}  
	});  
}  
  
function cardsEpgRender(cards) {  
	cards.each(function () {  
		var epgId = $(this).data('epg-id');  
		if (epgId) epgRender(epgId);  
	});  
}  
  
function isPluginPlaylist(playlist) {  
	return playlist && playlist.length && playlist[0].plugin === plugin.component;  
}  
  
function channelSwitch(num, isZap) {  
	var playlist = Lampa.PlayerPlaylist.get();  
	if (!isPluginPlaylist(playlist)) return false;  
	var pos = (num - 1) || 0;  
	if (pos >= 0 && pos < playlist.length) {  
		if (isZap) {  
			Lampa.PlayerPlaylist.move(pos);  
		} else {  
			Lampa.PlayerPlaylist.select(pos);  
		}  
		var video = playlist[pos];  
		Lampa.Player.runas && Lampa.Player.runas(Lampa.Storage.field('player_iptv'));  
		Lampa.Player.play(video);  
		Lampa.Player.runas && Lampa.Player.runas(Lampa.Storage.field('player_iptv'));  
		return true;  
	}  
	return false;  
}  
  
function keydown(e) {  
	var code = e.code;  
	if (Lampa.Activity.active().component === plugin.component && Lampa.Player.opened() && !$('body.selectbox--open').length) {  
		var playlist = Lampa.PlayerPlaylist.get();  
		if (!isPluginPlaylist(playlist)) return;  
		var isStopEvent = false;  
		var curCh = cache('curCh') || (Lampa.PlayerPlaylist.position() + 1);  
		if (code === 428 || code === 34 || ((code === 37 || code === 4) && !$('.player.tv .panel--visible .focus').length && !$('.player.tv .player-footer.open .focus').length)) {  
			curCh = curCh === 1 ? playlist.length : curCh - 1;  
			cache('curCh', curCh, 1000);  
			isStopEvent = channelSwitch(curCh, true);  
		} else if (code === 427 || code === 33 || ((code === 39 || code === 5) && !$('.player.tv .panel--visible .focus').length && !$('.player.tv .player-footer.open .focus').length)) {  
			curCh = curCh === playlist.length ? 1 : curCh + 1;  
			cache('curCh', curCh, 1000);  
			isStopEvent = channelSwitch(curCh, true);  
		} else if (code >= 48 && code <= 57) {  
			isStopEvent = channelSwitch(code - 48);  
		} else if (code >= 96 && code <= 105) {  
			isStopEvent = channelSwitch(code - 96);  
		}  
		if (isStopEvent) {  
			e.event.preventDefault();  
			e.event.stopPropagation();  
		}  
	}  
}  
  
function bulkWrapper(func, bulk) {  
	var bulkCnt = 1, timeout = 1, queueEndCallback, queueStepCallback, emptyFn = function () {};  
	if (typeof bulk === 'object') {  
		timeout = bulk.timeout || timeout;  
		queueStepCallback = bulk.onBulk || emptyFn;  
		queueEndCallback = bulk.onEnd || emptyFn;  
		bulkCnt = bulk.bulk || bulkCnt;  
	} else if (typeof bulk === 'number') {  
		bulkCnt = bulk;  
		if (typeof arguments[2] === 'number') timeout = arguments[2];  
	} else if (typeof bulk === 'function') {  
		queueStepCallback = bulk;  
		if (typeof arguments[2] === 'number') bulkCnt = arguments[2];  
	}  
	var queue = [];  
	var timer = null;  
	var process = function () {  
		var i = Math.min(bulkCnt, queue.length);  
		if (i) {  
			var items = queue.splice(0, i);  
			items.forEach(function (item) {  
				func.apply(null, item);  
			});  
			queueStepCallback(items, queue.length);  
			if (queue.length) {  
				timer = setTimeout(process, timeout);  
			} else {  
				queueEndCallback();  
			}  
		}  
	};  
	return function () {  
		queue.push(Array.prototype.slice.call(arguments));  
		if (!timer) timer = setTimeout(process, 0);  
	};  
}  
  
function networkSilentSessCache(url, success, fail, param) {  
	var key = 'sess_' + Lampa.Utils.hash(url);  
	var data = sessionStorage.getItem(key);  
	if (data) {  
		try {  
			data = JSON.parse(data);  
			if (data[0]) {  
				typeof success === 'function' && success.apply(null, data[1]);  
				return;  
			}  
		} catch (e) {}  
	}  
	var network = new Lampa.Reguest();  
	network.timeout(20000);  
	network.silent(url, function (str) {  
		sessionStorage.setItem(key, JSON.stringify([true, str]));  
		typeof success === 'function' && success.apply(null, [str]);  
	}, function (a, b) {  
		sessionStorage.setItem(key, JSON.stringify([false, b]));  
		typeof fail === 'function' && fail.apply(null, [a, b]);  
	}, param);  
}  
  
// Стилі  
Lampa.Template.add(plugin.component + '_style', '<style>#PLUGIN_epg{margin-right:1em}.PLUGIN-program__desc{font-size:0.9em;margin:0.5em;text-align:justify;max-height:15em;overflow:hidden;}.PLUGIN.category-full{padding-bottom:10em}.PLUGIN div.card__view{position:relative;background-color:#353535;background-color:#353535a6;border-radius:1em;cursor:pointer;padding-bottom:60%}.PLUGIN.square_icons div.card__view{padding-bottom:100%}.PLUGIN img.card__img,.PLUGIN div.card__img{background-color:unset;border-radius:unset;max-height:100%;max-width:100%;height:auto;width:auto;position:absolute;top:50%;left:50%;-moz-transform:translate(-50%,-50%);-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);font-size:2em}.PLUGIN.contain_icons img.card__img{height:95%;width:95%;object-fit:contain}.PLUGIN .card__title{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.PLUGIN .js-layer--hidden{visibility: hidden}.PLUGIN .js-layer--visible{visibility: visible}.PLUGIN .card__age{padding:0;border:1px #3e3e3e solid;margin-top:0.3em;border-radius:0.3em;position:relative;display: none}.PLUGIN .card__age .card__epg-progress{position:absolute;background-color:#3a3a3a;top:0;left:0;width:0%;max-width:100%;height:100%}.PLUGIN .card__age .card__epg-title{position:relative;padding:0.4em 0.2em;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;}.PLUGIN.category-full .card__icons {top:0.3em;right:0.3em;justify-content:right;}#PLUGIN{float:right;padding: 1.2em 0;width: 30%;}.PLUGIN-details__group{font-size:1.3em;margin-bottom:.9em;opacity:.5}.PLUGIN-details__title{font-size:4em;font-weight:700}.PLUGIN-details__program{padding-top:4em}.PLUGIN-details__program-title{font-size:1.2em;padding-left:4.9em;margin-top:1em;margin-bottom:1em;opacity:.5}.PLUGIN-details__program-list>div+div{margin-top:1em}.PLUGIN-details__program>div+div{margin-top:2em}.PLUGIN-program{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;font-size:1.2em;font-weight:300}.PLUGIN-program__time{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;width:5em;position:relative}.PLUGIN-program.focus .PLUGIN-program__time::after{content:\'\';position:absolute;top:.5em;right:.9em;width:.4em;background-color:#fff;height:.4em;-webkit-border-radius:100%;-moz-border-radius:100%;border-radius:100%;margin-top:-0.1em;font-size:1.2em}.PLUGIN-program__progressbar{width:10em;height:0.3em;border:0.05em solid #fff;border-radius:0.05em;margin:0.5em 0.5em 0 0}.PLUGIN-program__progress{height:0.25em;border:0.05em solid #fff;background-color:#fff;max-width: 100%}.PLUGIN .card__icon.icon--timeshift{background-image:url(https://epg.rootu.top/img/icon/timeshift.svg);}</style>'.replace(/PLUGIN/g, plugin.component));  
$('body').append(Lampa.Template.get(plugin.component + '_style', {}, true));  
  
// Додати шаблон трьохколонкового інтерфейсу  
Lampa.Template.add('cub_iptv_content', `  
    <div class="iptv-content">  
        <div class="iptv-content__menu"></div>  
        <div class="iptv-content__channels"></div>  
        <div class="iptv-content__details"></div>  
    </div>  
`);  
  
function pluginPage(object) {  
	if (object.id !== curListId) {  
		catalog = {};  
		listCfg = {};  
		curListId = object.id;  
	}  
	EPG = {};  
	var epgIdCurrent = '';  
	var epgPath = '';  
	var favorite = getStorage('favorite' + object.id, '[]');  
	var network = new Lampa.Reguest();  
	var scroll = new Lampa.Scroll({  
		mask: true,  
		over: true,  
		step: 250  
	});  
  
	// Використовуємо трьохколонковий шаблон  
	var html = Lampa.Template.get('cub_iptv_content');  
	var menuEl = html.find('.iptv-content__menu');  
	var channelsEl = html.find('.iptv-content__channels');  
	var detailsEl = html.find('.iptv-content__details');  
  
	var body = $('<div class="' + plugin.component + ' category-full"></div>');  
	body.toggleClass('square_icons', getSettings('square_icons'));  
	body.toggleClass('contain_icons', getSettings('contain_icons'));  
  
	var info;  
	var last;  
  
	if (epgInterval) clearInterval(epgInterval);  
	epgInterval = setInterval(function () {  
		for (var epgId in EPG) {  
			epgRender(epgId);  
		}  
	}, 10000);  
  
	var layerCards, layerMinPrev = 0, layerMaxPrev = 0, layerFocusI = 0, layerCnt = 24;  
	if (layerInterval) clearInterval(layerInterval);  
	layerInterval = setInterval(function () {  
		if (!layerCards) return;  
		var minI = Math.max(layerFocusI - layerCnt, 0);  
		var maxI = Math.min(layerFocusI + layerCnt, layerCards.length - 1);  
		if (layerMinPrev > maxI || layerMaxPrev < minI) {  
			layerCards.slice(layerMinPrev, layerMaxPrev + 1).removeClass('js-layer--visible');  
			cardsEpgRender(layerCards.slice(minI, maxI + 1).addClass('js-layer--visible'));  
		} else {  
			if (layerMinPrev < minI) layerCards.slice(layerMinPrev, minI + 1).removeClass('js-layer--visible');  
			if (layerMaxPrev > maxI) layerCards.slice(maxI, layerMaxPrev + 1).removeClass('js-layer--visible');  
			if (layerMinPrev > minI) cardsEpgRender(layerCards.slice(minI, layerMinPrev + 1).addClass('js-layer--visible'));  
			if (layerMaxPrev < maxI) cardsEpgRender(layerCards.slice(layerMaxPrev, maxI + 1).addClass('js-layer--visible'));  
		}  
		layerMinPrev = minI;  
		layerMaxPrev = maxI;  
	}, 50);  
  
	// Функція рендеру груп у лівій колонці  
	function renderGroups() {  
		menuEl.empty();  
		lists[object.id].groups.forEach(function (group) {  
			var item = $('<div class="selector">' + group.title + '</div>');  
			item.on('hover:enter', function () {  
				if (object.currentGroup !== group.key) {  
					object.currentGroup = group.key;  
					Lampa.Activity.replace(Lampa.Arrays.clone(lists[object.id].activity));  
				}  
			});  
			if (object.currentGroup === group.key) {  
				item.addClass('focus');  
			}  
			menuEl.append(item);  
		});  
	}  
  
	this.create = function () {  
		console.log('my_iptv create called');  
		var _this = this;  
		this.activity.loader(true);  
		var emptyResult = function () {  
			var empty = new Lampa.Empty();  
			html.append(empty.render());  
			_this.start = empty.start;  
			_this.activity.loader(false);  
			_this.activity.toggle();  
		};  
		if (Object.keys(catalog).length) {  
			_this.build(catalog);  
		} else if (!lists[object.id] || !object.url) {  
			emptyResult();  
			return;  
		} else {  
			var load = 1, data;  
			var compileList = function (dataList) {  
				data = dataList;  
				if (!--load) parseListHeader();  
			};  
			if (!timeOffsetSet) {  
				load++;  
				(function () {  
					var ts = new Date().getTime();  
					network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/api/time',  
						function (serverTime) {  
							var te = new Date().getTime();  
							timeOffset = (serverTime < ts || serverTime > te) ? serverTime - te : 0;  
							timeOffsetSet = true;  
							compileList(data);  
						},  
						function () {  
							timeOffsetSet = true;  
							compileList(data);  
						}  
					);  
				})();  
			}  
			var parseListHeader = function () {  
				if (typeof data !== 'string' || data.substr(0, 7).toUpperCase() !== '#EXTM3U') {  
					emptyResult();  
					return;  
				}  
				var m, mm, channelsUri = 'channels';  
				var l = data.split(/\r?\n/, 2)[0];  
				if (!!(m = l.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g))) {  
					for (var jj = 0; jj < m.length; jj++) {  
						if (!!(mm = m[jj].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/))) {  
							listCfg[mm[1].toLowerCase()] = mm[4] || (mm[3] ? '' : mm[2]);  
						}  
					}  
				}  
				listCfg.epgUrl = listCfg['url-tvg'] || listCfg['x-tvg-url'] || '';  
				listCfg.epgCode = utils.hash36(listCfg.epgUrl.toLowerCase().replace(/https:\/\//g, 'http://'));  
				console.log(plugin.name, 'epgCode', listCfg.epgCode);  
				listCfg.isEpgIt999 = ['0', '4v7a2u', 'skza0s', 'oj8j5z', 'sab9bx', 'rv7awh', '2blr83'].indexOf(listCfg.epgCode) >= 0;  
				listCfg.isYosso = ['godxcd'].indexOf(listCfg.epgCode) >= 0;  
				if (/^https?:\/\/.+/i.test(listCfg.epgUrl) && listCfg.epgUrl.length < 8000) {  
					channelsUri = listCfg.epgCode + '/' + channelsUri + '?url=' + encodeURIComponent(listCfg.epgUrl)  
						+ '&uid=' + utils.uid() + '&sig=' + generateSigForString(listCfg.epgUrl);  
				}  
				listCfg.epgApiChUrl = Lampa.Utils.protocol() + 'epg.rootu.top/api/' + channelsUri;  
				networkSilentSessCache(listCfg.epgApiChUrl, parseList, parseList);  
			};  
			var parseList = function () {  
				if (typeof data !== 'string' || data.substr(0, 7).toUpperCase() !== '#EXTM3U') {  
					emptyResult();  
					return;  
				}  
				catalog = {  
					'': {  
						title: langGet('favorites'),  
						setEpgId: false,  
						channels: []  
					}  
				};  
				lists[object.id].groups = [{  
					title: langGet('favorites'),  
					key: ''  
				}];  
				var l = data.split(/\r?\n/);  
				var cnt = 0, i = 1, chNum = 0, m, mm, defGroup = defaultGroup, chInGroupCnt = {}, maxChInGroup = getSettings('max_ch_in_group');  
				while (i < l.length) {  
					chNum = cnt + 1;  
					var channel = {  
						ChNum: chNum,  
						Title: 'Ch ' + chNum,  
						isYouTube: false,  
						Url: '',  
						Group: '',  
						Options: {}  
					};  
					for (; cnt < chNum && i < l.length; i++) {  
						if (!!(m = l[i].match(/^#EXTGRP:\s*(.+?)\s*$/i)) && m[1].trim() !== '') {  
							defGroup = m[1].trim();  
						} else if (!!(m = l[i].match(/^#EXTINF:\s*-?\d+(\s+\S.*?\s*)?,(.+)$/i))) {  
							channel.Title = m[2].trim();  
							if (!!m[1] && !!(m = m[1].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g))) {  
								for (var j = 0; j < m.length; j++) {  
									if (!!(mm = m[j].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/))) {  
										channel[mm[1].toLowerCase()] = mm[4] || (mm[3] ? '' : mm[2]);  
									}  
								}  
							}  
						} else if (!!(m = l[i].match(/^#EXTVLCOPT:\s*([^\s=]+)=(.+)$/i))) {  
							channel.Options[m[1].trim().toLowerCase()] = m[2].trim();  
						} else if (!!(m = l[i].match(/^(https?):\/\/(.+)$/i))) {  
							channel.Url = m[0].trim();  
							channel.isYouTube = !!(m[2].match(/^(www\.)?youtube\.com/));  
							channel.Group = (channel['group-title'] || defGroup) + '';  
							cnt++;  
						}  
					}  
					if (!!channel.Url && !channel.isYouTube) {  
						chInGroupCnt[channel.Group] = (chInGroupCnt[channel.Group] || 0) + 1;  
						var groupPage = maxChInGroup ? Math.floor((chInGroupCnt[channel.Group] - 1) / maxChInGroup) : 0;  
						if (groupPage) channel.Group += ' #' + (groupPage + 1);  
						if (!catalog[channel.Group]) {  
							catalog[channel.Group] = {  
								title: channel.Group,  
								setEpgId: false,  
								channels: []  
							};  
							lists[object.id].groups.push({  
								title: channel.Group,  
								key: channel.Group  
							});  
						}  
						channel.Title = channel.Title.replace(/\s+\(([+-]?\d+)\)/g, ' $1').replace(/\s+(\s|ⓢ|ⓖ|ⓥ|ⓞ|Ⓢ|Ⓖ|Ⓥ|Ⓞ)/g, ' ').trim();  
						catalog[channel.Group].channels.push(channel);  
					}  
				}  
				setEpgId(catalog['']);  
				for (var grp in catalog) {  
					if (catalog.hasOwnProperty(grp) && grp !== '') {  
						setEpgId(catalog[grp]);  
					}  
				}  
				_this.build(catalog);  
			};  
			network.silent(object.url, compileList, compileList);  
		}  
	};  
  
	this.build = function (catalog) {  
		var channelGroup = !catalog[object.currentGroup]  
			? (lists[object.id].groups.length > 1 && !!catalog[lists[object.id].groups[1].key]  
				? catalog[lists[object.id].groups[1].key]  
				: { 'channels': [] })  
			: catalog[object.currentGroup];  
		var _this2 = this;  
		Lampa.Background.change();  
		Lampa.Template.add(plugin.component + '_style', '<style>#PLUGIN_epg{margin-right:1em}.PLUGIN-program__desc{font-size:0.9em;margin:0.5em;text-align:justify;max-height:15em;overflow:hidden;}.PLUGIN.category-full{padding-bottom:10em}.PLUGIN div.card__view{position:relative;background-color:#353535;background-color:#353535a6;border-radius:1em;cursor:pointer;padding-bottom:60%}.PLUGIN.square_icons div.card__view{padding-bottom:100%}.PLUGIN img.card__img,.PLUGIN div.card__img{background-color:unset;border-radius:unset;max-height:100%;max-width:100%;height:auto;width:auto;position:absolute;top:50%;left:50%;-moz-transform:translate(-50%,-50%);-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);font-size:2em}.PLUGIN.contain_icons img.card__img{height:95%;width:95%;object-fit:contain}.PLUGIN .card__title{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.PLUGIN .js-layer--hidden{visibility: hidden}.PLUGIN .js-layer--visible{visibility: visible}.PLUGIN .card__age{padding:0;border:1px #3e3e3e solid;margin-top:0.3em;border-radius:0.3em;position:relative;display: none}.PLUGIN .card__age .card__epg-progress{position:absolute;background-color:#3a3a3a;top:0;left:0;width:0%;max-width:100%;height:100%}.PLUGIN .card__age .card__epg-title{position:relative;padding:0.4em 0.2em;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;}.PLUGIN.category-full .card__icons {top:0.3em;right:0.3em;justify-content:right;}#PLUGIN{float:right;padding: 1.2em 0;width: 30%;}.PLUGIN-details__group{font-size:1.3em;margin-bottom:.9em;opacity:.5}.PLUGIN-details__title{font-size:4em;font-weight:700}.PLUGIN-details__program{padding-top:4em}.PLUGIN-details__program-title{font-size:1.2em;padding-left:4.9em;margin-top:1em;margin-bottom:1em;opacity:.5}.PLUGIN-details__program-list>div+div{margin-top:1em}.PLUGIN-details__program>div+div{margin-top:2em}.PLUGIN-program{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;font-size:1.2em;font-weight:300}.PLUGIN-program__time{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;width:5em;position:relative}.PLUGIN-program.focus .PLUGIN-program__time::after{content:\'\';position:absolute;top:.5em;right:.9em;width:.4em;background-color:#fff;height:.4em;-webkit-border-radius:100%;-moz-border-radius:100%;border-radius:100%;margin-top:-0.1em;font-size:1.2em}.PLUGIN-program__progressbar{width:10em;height:0.3em;border:0.05em solid #fff;border-radius:0.05em;margin:0.5em 0.5em 0 0}.PLUGIN-program__progress{height:0.25em;border:0.05em solid #fff;background-color:#fff;max-width: 100%}.PLUGIN .card__icon.icon--timeshift{background-image:url(https://epg.rootu.top/img/icon/timeshift.svg);}</style>'.replace(/PLUGIN/g, plugin.component));  
		  
		// Використовуємо трьохколонковий шаблон  
		var html = Lampa.Template.get('cub_iptv_content');  
		var menuEl = html.find('.iptv-content__menu');  
		var channelsEl = html.find('.iptv-content__channels');  
		var detailsEl = html.find('.iptv-content__details');  
		  
		var body = $('<div class="' + plugin.component + ' category-full"></div>');  
		body.toggleClass('square_icons', getSettings('square_icons'));  
		body.toggleClass('contain_icons', getSettings('contain_icons'));  
		  
		var info;  
		var last;  
		  
		if (epgInterval) clearInterval(epgInterval);  
		epgInterval = setInterval(function() {  
			for (var epgId in EPG) {  
				epgRender(epgId);  
			}  
		}, 10000);  
  
		var layerCards, layerMinPrev = 0, layerMaxPrev = 0, layerFocusI = 0, layerCnt = 24;  
		if (layerInterval) clearInterval(layerInterval);  
		layerInterval = setInterval(function() {  
			if (!layerCards) return;  
			var minI = Math.max(layerFocusI - layerCnt, 0);  
			var maxI = Math.min(layerFocusI + layerCnt, layerCards.length - 1);  
			if (layerMinPrev > maxI || layerMaxPrev < minI) {  
				layerCards.slice(layerMinPrev, layerMaxPrev + 1).removeClass('js-layer--visible');  
				cardsEpgRender(layerCards.slice(minI, maxI + 1).addClass('js-layer--visible'));  
			} else {  
				if (layerMinPrev < minI) layerCards.slice(layerMinPrev, minI + 1).removeClass('js-layer--visible');  
				if (layerMaxPrev > maxI) layerCards.slice(maxI, layerMaxPrev + 1).removeClass('js-layer--visible');  
				if (layerMinPrev > minI) cardsEpgRender(layerCards.slice(minI, layerMinPrev + 1).addClass('js-layer--visible'));  
				if (layerMaxPrev < maxI) cardsEpgRender(layerCards.slice(layerMaxPrev, maxI + 1).addClass('js-layer--visible'));  
			}  
			layerMinPrev = minI;  
			layerMaxPrev = maxI;  
		}, 50);  
  
		// Функція рендеру груп у лівій колонці  
		function renderGroups() {  
			menuEl.empty();  
			lists[object.id].groups.forEach(function(group) {  
				var item = $('<div class="selector">' + group.title + '</div>');  
				item.on('hover:enter', function() {  
					if (object.currentGroup !== group.key) {  
						object.currentGroup = group.key;  
						Lampa.Activity.replace(Lampa.Arrays.clone(lists[object.id].activity));  
					}  
				});  
				if (object.currentGroup === group.key) {  
					item.addClass('focus');  
				}  
				menuEl.append(item);  
			});  
		}  
  
		this.create = function () {  
			console.log('my_iptv create called');  
			var _this = this;  
			this.activity.loader(true);  
			var emptyResult = function () {  
				var empty = new Lampa.Empty();  
				html.append(empty.render());  
				_this.start = empty.start;  
				_this.activity.loader(false);  
				_this.activity.toggle();  
			};  
			if (Object.keys(catalog).length) {  
				_this.build(catalog);  
			} else if(!lists[object.id] || !object.url) {  
				emptyResult();  
				return;  
			} else {  
				var load = 1, data;  
				var compileList = function (dataList) {  
					data = dataList;  
					if (!--load) parseListHeader();  
				};  
				if (!timeOffsetSet) {  
					load++;  
					(function () {  
						var ts = new Date().getTime();  
						network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/api/time',  
							function (serverTime) {  
								var te = new Date().getTime();  
								timeOffset = (serverTime < ts || serverTime > te) ? serverTime - te : 0;  
								timeOffsetSet = true;  
								compileList(data);  
							},  
							function () {  
								timeOffsetSet = true;  
								compileList(data);  
							}  
						);  
					})();  
				}  
				var parseListHeader = function () {  
					if (typeof data != 'string' || data.substr(0, 7).toUpperCase() !== "#EXTM3U") {  
						emptyResult();  
						return;  
					}  
					var m, mm, channelsUri = 'channels';  
					var l = data.split(/\r?\n/, 2)[0];  
					if (!!(m = l.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g))) {  
						for (var jj = 0; jj < m.length; jj++) {  
							if (!!(mm = m[jj].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/))) {  
								listCfg[mm[1].toLowerCase()] = mm[4] || (mm[3] ? '' : mm[2]);  
							}  
						}  
					}  
					listCfg.epgUrl = listCfg['url-tvg'] || listCfg['x-tvg-url'] || '';  
					listCfg.epgCode = utils.hash36(listCfg.epgUrl.toLowerCase().replace(/https:\/\//g, 'http://'));  
					console.log(plugin.name, 'epgCode', listCfg.epgCode);  
					listCfg.isEpgIt999 = ["0", "4v7a2u", "skza0s", "oj8j5z", "sab9bx", "rv7awh", "2blr83"].indexOf(listCfg.epgCode) >= 0;  
					listCfg.isYosso = ["godxcd"].indexOf(listCfg.epgCode) >= 0;  
					if (/^https?:\/\/.+/i.test(listCfg.epgUrl) && listCfg.epgUrl.length < 8000) {  
						channelsUri = listCfg.epgCode + '/' + channelsUri + '?url=' + encodeURIComponent(listCfg.epgUrl)  
							+ '&uid=' + utils.uid() + '&sig=' + generateSigForString(listCfg.epgUrl);  
					}  
					listCfg.epgApiChUrl = Lampa.Utils.protocol() + 'epg.rootu.top/api/' + channelsUri;  
					networkSilentSessCache(listCfg.epgApiChUrl, parseList, parseList);  
				};  
				var parseList = function () {  
					if (typeof data != 'string' || data.substr(0, 7).toUpperCase() !== '#EXTM3U') {  
						emptyResult();  
						return;  
					}  
					catalog = {  
						'': {  
							title: langGet('favorites'),  
							setEpgId: false,  
							channels: []  
						}  
					};  
					lists[object.id].groups = [{  
						title: langGet('favorites'),  
						key: ''  
					}];  
					var l = data.split(/\r?\n/);  
					var cnt = 0, i = 1, chNum = 0, m, mm, defGroup = defaultGroup, chInGroupCnt = {}, maxChInGroup = getSettings('max_ch_in_group');  
					while (i < l.length) {  
						chNum = cnt + 1;  
						var channel = {  
							ChNum: chNum,  
							Title: 'Ch ' + chNum,  
							isYouTube: false,  
							Url: '',  
							Group: '',  
							Options: {}  
						};  
						for (; cnt < chNum && i < l.length; i++) {  
							if (!!(m = l[i].match(/^#EXTGRP:\s*(.+?)\s*$/i)) && m[1].trim() !== '') {  
								defGroup = m[1].trim();  
							} else if (!!(m = l[i].match(/^#EXTINF:\s*-?\d+(\s+\S.*?\s*)?,(.+)$/i))) {  
								channel.Title = m[2].trim();  
								if (!!m[1] && !!(m = m[1].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g))) {  
									for (var j = 0; j < m.length; j++) {  
										if (!!(mm = m[j].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/))) {  
											channel[mm[1].toLowerCase()] = mm[4] || (mm[3] ? '' : mm[2]);  
										}  
									}  
								}  
							} else if (!!(m = l[i].match(/^#EXTVLCOPT:\s*([^\s=]+)=(.+)$/i))) {  
								channel.Options[m[1].trim().toLowerCase()] = m[2].trim();  
							} else if (!!(m = l[i].match(/^(https?):\/\/(.+)$/i))) {  
								channel.Url = m[0].trim();  
								channel.isYouTube = !!(m[2].match(/^(www\.)?youtube\.com/));  
								channel.Group = (channel['group-title'] || defGroup) + '';  
								cnt++;  
							}  
						}  
						if (!!channel.Url && !channel.isYouTube) {  
							chInGroupCnt[channel.Group] = (chInGroupCnt[channel.Group] || 0) + 1;  
							var groupPage = maxChInGroup ? Math.floor((chInGroupCnt[channel.Group] - 1) / maxChInGroup) : 0;  
							if (groupPage) channel.Group += ' #' + (groupPage + 1);  
							if (!catalog[channel.Group]) {  
								catalog[channel.Group] = {  
									title: channel.Group,  
									setEpgId: false,  
									channels: []  
								};  
								lists[object.id].groups.push({  
									title: channel.Group,  
									key: channel.Group  
								});  
							}  
							channel.Title = channel.Title.replace(/\s+\(([+-]?\d+)\)/g, ' $1').replace(/\s+(\s|ⓢ|ⓖ|ⓥ|ⓞ|Ⓢ|Ⓖ|Ⓥ|Ⓞ)/g, ' ').trim();  
							catalog[channel.Group].channels.push(channel);  
						}  
					}  
					setEpgId(catalog['']);  
					for (var grp in catalog) {  
						if (catalog.hasOwnProperty(grp) && grp !== '') {  
							setEpgId(catalog[grp]);  
						}  
					}  
					_this.build(catalog);  
				};  
				network.silent(object.url, compileList, compileList);  
			}  
		};  
  
		this.build = function (catalog) {  
			var channelGroup = !catalog[object.currentGroup]  
				? (lists[object.id].groups.length > 1 && !!catalog[lists[object.id].groups[1].key]  
					? catalog[lists[object.id].groups[1].key]  
					: { 'channels': [] })  
				: catalog[object.currentGroup];  
			var _this2 = this;  
			Lampa.Background.change();  
			  
			// Рендеримо групи в лівій колонці  
			renderGroups();  
			  
			// Додаємо EPG шаблон в праву колонку  
			detailsEl.append(epgTemplate);  
			  
			// Очищуємо центральну колонку  
			channelsEl.empty();  
			channelsEl.append(body);  
			  
			info = $('<div class="info"></div>');  
			body.append(info);  
			  
			scroll.render().find('.scroll__body').append(body);  
			html.append(scroll.render());  
			  
			this.append = function (data) {  
				var catEpg = [];  
				var chIndex = 0;  
				var _this2 = this;  
				var lazyLoadImg = ('loading' in HTMLImageElement.prototype);  
				layerCards = null;  
				var bulkFn = bulkWrapper(function (channel) {  
						var chI = chIndex++;  
						var card = Lampa.Template.get('card', {  
							title: channel.Title,  
							release_year: ''  
						});  
						card.addClass('card--collection')  
							.removeClass('layer--visible')  
							.removeClass('layer--render')  
							.addClass('js-layer--hidden');  
						if (chI < layerCnt) card.addClass('js-layer--visible');  
						var img = card.find('.card__img')[0];  
						if (lazyLoadImg) img.loading = (chI < 18 ? 'eager' : 'lazy');  
						img.onload = function () {  
							card.addClass('card--loaded');  
						};  
						img.onerror = function (e) {  
							var name = channel.Title  
								.replace(/\s+\(([+-]?\d+)\)/, ' $1').replace(/[-.()\s]+/g, ' ').replace(/(^|\s+)(TV|ТВ)(\s+|$)/i, '$3');  
							var fl = name.replace(/\s+/g, '').length > 5  
								? name.split(/\s+/).map(function(v) {return v.match(/^(\+?\d+|[UF]?HD|4K)$/i) ? v : v.substring(0,1).toUpperCase()}).join('').substring(0,6)  
								: name.replace(/\s+/g, '');  
							fl = fl.replace(/([UF]?HD|4k|\+\d+)$/i, '<sup>$1</sup>');  
							var hex = (Lampa.Utils.hash(channel.Title) * 1).toString(16);  
							while (hex.length < 6) hex += hex;  
							hex = hex.substring(0, 6);  
							var r = parseInt(hex.slice(0, 2), 16),  
								g = parseInt(hex.slice(2, 4), 16),  
								b = parseInt(hex.slice(4, 6), 16);  
							var hexText = (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#000000' : '#FFFFFF';  
							card.find('.card__img').replaceWith('<div class="card__img">' + fl + '</div>');  
							card.find('.card__view').css({'background-color': '#' + hex, 'color': hexText});  
							channel['tvg-logo'] = '';  
							card.addClass('card--loaded');  
						};  
						if (channel['tvg-logo']) img.src = channel['tvg-logo']; else img.onerror();  
						var favIcon = $('<div class="card__icon icon--book hide"></div>');  
						card.find('.card__icons-inner').append(favIcon);  
						var tvgDay = parseInt(  
							channel['catchup-days'] || channel['tvg-rec'] || channel['timeshift']  
							|| listCfg['catchup-days'] || listCfg['tvg-rec'] || listCfg['timeshift']  
							|| '0'  
						);  
						if (parseInt('catchup-enable' in channel ? channel['catchup-enable'] : tvgDay) > 0) {  
							card.find('.card__icons-inner').append('<div class="card__icon icon--timeshift"></div>');  
							if (tvgDay === 0) tvgDay = 1;  
						} else {  
							tvgDay = 0;  
						}  
						card.find('.card__age').html('<div class="card__epg-progress js-epgProgress"></div><div class="card__epg-title js-epgTitle"></div>');  
						if (object.currentGroup !== '' && favorite.indexOf(favID(channel.Title)) !== -1) {  
							favIcon.toggleClass('hide', false);  
						}  
						card.playThis = function () {  
							layerFocusI = chI;  
							var video = {  
								title: channel.Title,  
								url: prepareUrl(channel.Url),  
								plugin: plugin.component,  
								iptv: true,  
								tv: true  
							};  
							var playlist = [];  
							var playlistForExtrnalPlayer = [];  
							var i = 0;  
							data.forEach(function (elem) {  
								var j = i < chI ? data.length - chI + i : i - chI;  
								var videoUrl = i === chI ? video.url : prepareUrl(elem.Url);  
								playlistForExtrnalPlayer[j] = {  
									title: elem.Title,  
									url: videoUrl,  
									iptv: true,  
									tv: true  
								};  
								playlist.push({  
									title: ++i + '. ' + elem.Title,  
									url: videoUrl,  
									plugin: plugin.component,  
									iptv: true,  
									tv: true  
								});  
							});  
							video['playlist'] = playlistForExtrnalPlayer;  
							Lampa.Keypad.listener.destroy();  
							Lampa.Keypad.listener.follow('keydown', keydown.bind(_this2));  
							Lampa.Player.runas && Lampa.Player.runas(Lampa.Storage.field('player_iptv'));  
							Lampa.Player.play(video);  
							Lampa.Player.runas && Lampa.Player.runas(Lampa.Storage.field('player_iptv'));  
							Lampa.Player.playlist(playlist);  
						};  
						card.on('hover:focus hover:hover touchstart', function (event) {  
							layerFocusI = chI;  
							if (event.type && event.type !== 'touchstart' && event.type !== 'hover:hover') scroll.update(card, true);  
							last = card[0];  
							info.find('.info__title').text(channel.Title);  
							var ec = detailsEl.find('#' + plugin.component + '_epg');  
							ec.find('.js-epgChannel').text(channel.Title);  
							if (!channel['epgId']) {  
								info.find('.info__create').empty();  
								epgIdCurrent = '';  
								ec.find('.js-epgNow').hide();  
								ec.find('.js-epgAfter').hide();  
							} else {  
								epgIdCurrent = channel['epgId'];  
								epgRender(channel['epgId']);  
							}  
						}).on('hover:enter', function () {  
							getStorage('launch_menu', 'false') ? card.trigger('hover:long') : card.playThis();  
						}).on('hover:long', function () {  
							layerFocusI = chI;  
							var favI = favorite.indexOf(favID(channel.Title));  
							var isFavoriteGroup = object.currentGroup === '';  
							var menu = [];  
							menu.push({  
								title: langGet('start_play'),  
								startPlay: true  
							});  
							if (tvgDay > 0) {  
								menu.push({  
									title: langGet('archive'),  
									archive: true  
								});  
							}  
							if (isFavoriteGroup) {  
								if (favI > 0) {  
									menu.push({  
										title: langGet('favorites_move_top'),  
										favMove: true,  
										i: 0  
									});  
									menu.push({  
										title: langGet('favorites_move_up'),  
										favMove: true,  
										i: favI - 1  
									});  
								}  
								if ((favI + 1) !== favorite.length) {  
									menu.push({  
										title: langGet('favorites_move_down'),  
										favMove: true,  
										i: favI + 1  
									});  
									menu.push({  
										title: langGet('favorites_move_end'),  
										favMove: true,  
										i: favorite.length - 1  
									});  
								}  
								menu.push({  
									title: langGet('favorites_clear'),  
									favClear: true  
								});  
							} else {  
								menu.push({  
									title: langGet(favI === -1 ? 'favorites_add' : 'favorites_del'),  
									favToggle: true  
								});  
							}  
							if (channel['epgId'] && EPG[channel['epgId']] && EPG[channel['epgId']][2] && EPG[channel['epgId']][2][0]) {  
								menu.push({  
									title: langGet('restart_program'),  
									restartProgram: true  
								});  
							}  
							if (channel.Title) {  
								menu.push({  
									title: langGet('search'),  
									search: channel.Title  
								});  
							}  
							if (isFavoriteGroup) {  
								if (favI > 0) {  
									menu.push({  
										title: langGet('favorites_move_top'),  
										favMove: true,  
										i: 0  
									});  
									menu.push({  
										title: langGet('favorites_move_up'),  
										favMove: true,  
										i: favI - 1  
									});  
								}  
								if ((favI + 1) !== favorite.length) {  
									menu.push({  
										title: langGet('favorites_move_down'),  
										favMove: true,  
										i: favI + 1  
									});  
									menu.push({  
										title: langGet('favorites_move_end'),  
										favMove: true,  
										i: favorite.length - 1  
									});  
								}  
								menu.push({  
									title: langGet('favorites_clear'),  
									favClear: true  
								});  
							}  
							menu.push({  
								title: getStorage('epg', 'false') ? langGet('epg_off') : langGet('epg_on'),  
								epgToggle: true  
							});  
							Lampa.Select.show({  
								title: Lampa.Lang.translate('title_action'),  
								items: menu,  
								onSelect: function (sel) {  
									if (!!sel.startPlay) {  
										card.playThis();  
									} else if (!!sel.archive) {  
										var t = unixtime();  
										var m = Math.floor(t / 60);  
										var d = Math.floor(t / 86400);  
										var di = (tvgDay + 1), load = di;  
										var ms = m - tvgDay * 1440;  
										var tvgData = [];  
										var playlist = [];  
										var playlistMenu = [];  
										var archiveMenu = [];  
										var ps = 0;  
										var prevDate = '';  
										var d0 = toLocaleDateString(unixtime() * 1e3);  
										var d1 = toLocaleDateString((unixtime() - 86400) * 1e3);  
										var d2 = toLocaleDateString((unixtime() - 2 * 86400) * 1e3);  
										var txtD = {};  
										txtD[d0] = 'Сегодня - ' + d0;  
										txtD[d1] = 'Вчера - ' + d1;  
										txtD[d2] = 'Позавчера - ' + d2;  
										var onEpgLoad = function () {  
											if (--load) return;  
											for (var i = tvgData.length - 1; i >= 0; i--) {  
												if (tvgData[i].length === 0) {  
													var dt = (d - i) * 1440;  
													for (var dm = 0; dm < 1440; dm += 30)  
														tvgData[i].push([dt + dm, 30, toLocaleDateString((dt + dm) * 6e4), '']);  
												}  
												for (var j = 0; j < tvgData[i].length; j++) {  
													var epg = tvgData[i][j];  
													if (epg[0] === ps || epg[0] > m || epg[0] + epg[1] < ms) continue;  
													ps = epg[0];  
													var url = catchupUrl(  
														channel.Url,  
														(channel['catchup'] || channel['catchup-type'] || listCfg['catchup'] || listCfg['catchup-type']),  
														(channel['catchup-source'] || listCfg['catchup-source'])  
													);  
													var item = {  
														title: toLocaleTimeString(epg[0] * 6e4) + ' - ' + epg[2],  
														url: prepareUrl(url, epg),  
														catchupUrl: url,  
														plugin: plugin.component,  
														epg: epg  
													};  
													var newDate = toLocaleDateString(epg[0] * 6e4);  
													newDate = txtD[newDate] || newDate;  
													if (newDate !== prevDate) {  
														if (prevDate) {  
															archiveMenu.unshift({  
																title: prevDate,  
																separator: true  
															});  
														}  
														playlistMenu.push({  
															title: newDate,  
															separator: true,  
															plugin: plugin.component,  
															url: item.url  
														});  
														prevDate = newDate;  
													}  
													archiveMenu.unshift(item);  
													playlistMenu.push(item);  
													playlist.push(item);  
												}  
											}  
											if (prevDate) {  
												archiveMenu.unshift({  
													title: prevDate,  
													separator: true  
												});  
											}  
											tvgData = [];  
											Lampa.Select.show({  
												title: 'Архив',  
												items: archiveMenu,  
												onSelect: function (sel) {  
													console.log(plugin.name, 'catchupUrl: ' + sel.catchupUrl, epg.slice(0, 2));  
													var video = {  
														title: sel.title,  
														url: sel.url,  
														iptv: true,  
														playlist: playlist  
													};  
													Lampa.Controller.toggle('content');  
													Lampa.Player.runas && Lampa.Player.runas(Lampa.Storage.field('player_iptv'));  
													Lampa.Player.play(video);  
													Lampa.Player.runas && Lampa.Player.runas(Lampa.Storage.field('player_iptv'));  
													Lampa.Player.playlist(playlistMenu);  
												},  
												onBack: function () {  
													Lampa.Controller.toggle('content');  
												}  
											});  
										};  
										while (di--) {  
											tvgData[di] = [];  
											(function () {  
												var dd = di;  
												networkSilentSessCache(Lampa.Utils.protocol() + 'epg.rootu.top/api' + epgPath + '/epg/' + channel['epgId'] + '/day/' + (d - dd),  
													function (data) {  
														tvgData[dd] = data;  
														onEpgLoad();  
													},  
													onEpgLoad  
												);  
											})();  
										}  
									} else if (!!sel.search) {  
										var search = sel.search  
											.replace(/^«([^»]+)».*$/, '$1')  
											.replace(/^"([^"]+)".*$/, '$1')  
											.replace(/\s*\((19\d\d|20[01]\d|202[0-4])\)\s*(\*\s.+)?$/, '')  
											.replace(/[.,]\s*(\d+(-й)?\s+(с-н|сезон)|(с-н|сезон)\s+\d+|[s][-.\s]*\d+(-й)?)?[-.,\s]*(\d+(-\d+|-я)?\s*(сери.|эпизоды?|episode|[cс]|ep?)\.?|(сери.|эпизоды?|episode|[cс]|ep?)[-.]?\s*\d+).*$/i, '')  
											.replace(/\s*(\d+(-й)?\s+(с-н|сезон)|(с-н|сезон)\s+\d+|[s][-.\s]*\d+(-й)?)?[-.,\s]*(\d+(-\d+|-я)?\s*(сери.|эпизоды?|episode|[cс]|ep?)\.?|(сери.|эпизоды?|episode|[cс]|ep?)[-.]?\s*\d+)\.?/i, '')  
											.replace(/\.\s+Дайджест\s*$/i, '')  
											.replace(/\.?\s*\(([cCсСeE](ерия|pisode)?[-.]?\s*\d+|\d+(-[^)\s]+)?\s+[Сс]ерия)\)/, '')  
											.replace(/\.[^.:]+:\s*[Чч](асть|\.)\s+\d+\S*$/, '')  
											.replace(/\.\s*Сборник\s+\d+\S*\s*$/i, '')  
											.replace(/\s*[\[(]?(\d|1\d|2[0-5])\+[\])]?[.\s]*$/, '')  
											.replace(/\s*(\(\)|\[])/, '');  
										Lampa.Search.open({input: search});  
									} else if (!!sel.restartProgram) {  
										var epg = EPG[channel['epgId']][2][0];  
										var type = (channel['catchup'] || channel['catchup-type'] || listCfg['catchup'] || listCfg['catchup-type'] || '');  
										var url = catchupUrl(  
											channel.Url,  
											type,  
											(channel['catchup-source'] || listCfg['catchup-source'])  
										);  
										var flussonic = type.search(/^flussonic/i) === 0;  
										if (flussonic) {  
											url = url.replace('${(d)S}', 'now');  
										}  
										console.log(plugin.name, 'catchupUrl: ' + url, epg.slice(0, 2));  
										var video = {  
											title: channel.Title,  
											url: prepareUrl(url, epg),  
											plugin: plugin.component,  
											catchupUrl: url,  
											iptv: true,  
											epg: epg  
										};  
										if (flussonic) video['timeline'] = {  
											time: 11,  
											percent: 0,  
											handler: function () {},  
											duration: (epg[1] * 60)  
										};  
										Lampa.Controller.toggle('content');  
										Lampa.Player.runas && Lampa.Player.runas(Lampa.Storage.field('player_iptv'));  
										Lampa.Player.play(video);  
										Lampa.Player.runas && Lampa.Player.runas(Lampa.Storage.field('player_iptv'));  
									} else if (!!sel.epgToggle) {  
										var isView = !getStorage('epg', false);  
										setStorage('epg', isView);  
										epgListView(isView);  
										Lampa.Controller.toggle('content');  
									} else {  
										var favGroup = lists[object.id].groups[0];  
										if (!!sel.favToggle) {  
											if (favI === -1) {  
												favI = favorite.length;  
												favorite[favI] = favID(channel.Title);  
												catalog[favGroup.key].channels[favI] = channel;  
											} else {  
												favorite.splice(favI, 1);  
												catalog[favGroup.key].channels.splice(favI, 1);  
											}  
										} else if (!!sel.favClear) {  
											favorite = [];  
											catalog[favGroup.key].channels = [];  
										} else if (!!sel.favMove) {  
											favorite.splice(favI, 1);  
											favorite.splice(sel.i, 0, favID(channel.Title));  
											catalog[favGroup.key].channels.splice(favI, 1);  
											catalog[favGroup.key].channels.splice(sel.i, 0, channel);  
										}  
										setStorage('favorite' + object.id, favorite);  
										favGroup.title = catalog[favGroup.key].title  
											+ ' [' + catalog[favGroup.key].channels.length + ']';  
										if (isFavoriteGroup) {  
											Lampa.Activity.replace(Lampa.Arrays.clone(lists[object.id].activity));  
										} else {  
											favIcon.toggleClass('hide', favorite.indexOf(favID(channel.Title)) === -1);  
											Lampa.Controller.toggle('content');  
										}  
									}  
								},  
								onBack: function () {  
									Lampa.Controller.toggle('content');  
								}  
							});  
						});  
					  
					body.append(card);  
					if (!!channel['epgId']) {  
						card.attr('data-epg-id', channel['epgId']).addClass('js-epgNoRender');  
						epgRender(channel['epgId']);  
					}  
				},  
				{  
					bulk: 18,  
					onEnd: function (last, total, left) {  
						_this2.activity.loader(false);  
						_this2.activity.toggle();  
						if (chIndex > layerCnt) {  
							layerFocusI = 0;  
							layerCards = body.find('.js-layer--hidden');  
						}  
					}  
				});  
			data.forEach(function (channel) {  
				bulkFn(channel);  
				if (!!channel['epgId'] && catEpg.indexOf(channel['epgId']) === -1) catEpg.push(channel['epgId']);  
			});  
		};  
  
		function setEpgId(channelGroup) {  
			if (channelGroup.setEpgId || !channelGroup.channels || !listCfg.epgApiChUrl) return;  
			var chIDs = {id2epg: {}, piconUrl: '', id2picon: []}, i = 0, channel;  
			networkSilentSessCache(listCfg.epgApiChUrl, function (d) {  
				chIDs = d;  
				if (!chIDs.id2epg) chIDs.id2epg = {};  
				epgPath = !chIDs.epgPath ? '' : ('/' + chIDs.epgPath);  
			});  
			var chShortName = function (chName) {  
				return chName  
					.toLowerCase()  
					.replace(/\s+\(архив\)$/, '')  
					.replace(/\s+\((\+\d+)\)/g, ' $1')  
					.replace(/^телеканал\s+/, '')  
					.replace(/([!\s.,()–-]+|ⓢ|ⓖ|ⓥ|ⓞ|Ⓢ|Ⓖ|Ⓥ|Ⓞ)/g, ' ').trim()  
					.replace(/\s(канал|тв)(\s.+|\s*)$/, '$2')  
					.replace(/\s(50|orig|original)$/, '')  
					.replace(/\s(\d+)/g, '$1');  
			};  
			var trW = {"ё": "e", "у": "y", "к": "k", "е": "e", "н": "h", "ш": "w", "з": "3", "х": "x", "ы": "bl", "в": "b", "а": "a", "р": "p", "о": "o", "ч": "4", "с": "c", "м": "m", "т": "t", "ь": "b"};  
			var trName = function (word) {  
				return word.split('').map(function (char) {  
					return trW[char] || char;  
				}).join("");  
			};  
			var epgIdByName = function (v, find, epgId) {  
				var n = chShortName(v), fw, key;  
				if (n === '' || (!chIDs[n[0]] && !find)) return 0;  
				fw = n[0];  
				if (!!chIDs[fw]) {  
					if (!!chIDs[fw][n]) return chIDs[fw][n];  
					n = trName(n);  
					if (!!chIDs[fw][n]) return chIDs[fw][n];  
					if (find) {  
						for (key in chIDs[fw]) {  
							if (chIDs[fw][key] == epgId) {  
								return epgId;  
							} else if (n === trName(key)) {  
								return chIDs[fw][key];  
							}  
						}  
					}  
				}  
				if (n[0] !== fw && !!chIDs[n[0]]) {  
					fw = n[0];  
					if (!!chIDs[fw][n]) return chIDs[fw][n];  
					if (find) {  
						for (key in chIDs[fw]) {  
							if (chIDs[fw][key] == epgId) {  
								return epgId;  
							} else if (n === trName(key)) {  
								return chIDs[fw][key];  
							}  
						}  
					}  
				} else if (find) {  
					for (var keyW in trW) {  
						if (trW[keyW] === fw && !!chIDs[keyW]) {  
							for (key in chIDs[keyW]) {  
								if (chIDs[keyW][key] == epgId) {  
									return epgId;  
								} else if (n === trName(key)) {  
									return chIDs[keyW][key];  
								}  
							}  
						}  
					}  
				}  
				return 0;  
			};  
			for (; i < channelGroup.channels.length; i++) {  
				channel = channelGroup.channels[i];  
				channel.epgId = (listCfg.isEpgIt999 || listCfg.isYosso)  
					? (channel['tvg-id'] && /^\d{1,4}$/.test(channel['tvg-id']) ? channel['tvg-id'] : epgIdByName(channel.Title, true, channel['tvg-id']))  
					: (chIDs.id2epg[channel['tvg-id'] || ''] || epgIdByName(channel.Title, isSNG, channel['tvg-id']) || channel['tvg-id']);  
				if (!channel['tvg-logo'] && channel.epgId && !!chIDs.piconUrl) {  
					channel['tvg-logo'] = Lampa.Utils.protocol() + chIDs.piconUrl.replace('{picon}', (chIDs.id2picon && chIDs.id2picon[channel.epgId]) ? chIDs.id2picon[channel.epgId] : channel.epgId);  
				}  
				if (!channel['tvg-logo']) {  
					if (channel.epgId && (listCfg.isEpgIt999 || isSNG) && /^\d{1,4}$/.test(channel.epgId)) {  
						channel['tvg-logo'] = Lampa.Utils.protocol() + 'epg.one/img2/' + channel.epgId + '.png';  
					} else if (isSNG && !/^Ch \d+$/.test(channel.Title)) {  
						channel['tvg-logo'] = Lampa.Utils.protocol() + 'epg.rootu.top/img2/' + Lampa.Utils.hash(channel.Title.toLowerCase().replace(/\s+\(.*\)/, '').replace(/\s+/g, ' ').trim()) + '.png';  
					}  
				}  
			}  
			channelGroup.setEpgId = true;  
		}  
  
		this.start = function () {  
			Lampa.Controller.add('content', {  
				invisible: true,  
				toggle: function () {  
					Lampa.Controller.collectionSet(scroll.render());  
					Lampa.Controller.collectionFocus(scroll.render(), body.find('.selector'));  
				},  
				left: function () {  
					if (Navigator.canmove('left')) {  
						Navigator.move('left');  
					} else {  
						Lampa.Controller.toggle('menu');  
					}  
				},  
				right: function () {  
					if (Navigator.canmove('right')) {  
						Navigator.move('right');  
					} else if (Lampa.Controller.enabled() === 'content') {  
						Lampa.Controller.collectionSet(detailsEl);  
						Navigator.move('right');  
					} else {  
						_this.selectGroup();  
					}  
				},  
				up: this.selectGroup,  
				down: function () {  
					Navigator.move('down');  
				},  
				back: this.back  
			});  
			Lampa.Controller.toggle('content');  
		};  
  
		this.pause = function () {};  
  
		this.stop = function () {};  
  
		this.render = function () {  
			return html;  
		};  
  
		this.destroy = function () {  
			if (epgInterval) clearInterval(epgInterval);  
			if (layerInterval) clearInterval(layerInterval);  
			network.clear();  
			scroll.destroy();  
			html.remove();  
			Lampa.Controller.remove('content');  
			Lampa.Keyboard.listener.remove('keydown', keydown);  
			Lampa.Keypad.listener.destroy();  
			Lampa.Listener.follow('app', function (e) {  
				if (e.type === 'scroll' && e.object === scroll) {  
					Lampa.Storage.set('last_scroll', {  
						component: plugin.component,  
						position: e.position  
					});  
				}  
			});  
		};  
	}  
  
	Lampa.Component.add(plugin.component, pluginPage);  
  
	// Готовим настройки  
	Lampa.SettingsApi.addComponent(plugin);  
	addSettings(  
		'trigger',  
		{  
			title: langGet('square_icons'),  
			name: 'square_icons',  
			default: false,  
			onChange: function (v) {  
				$('.' + plugin.component + '.category-full').toggleClass('square_icons', v === 'true');  
			}  
		}  
	);  
	addSettings(  
		'trigger',  
		{  
			title: langGet('contain_icons'),  
			description: langGet('contain_icons_desc'),  
			name: 'contain_icons',  
			default: true,  
			onChange: function (v) {  
				$('.' + plugin.component + '.category-full').toggleClass('contain_icons', v === 'true');  
			}  
		}  
	);  
	addSettings(  
		'trigger',  
		{  
			title: langGet('epg_on'),  
			name: 'epg',  
			default: false,  
			onChange: function (v) {  
				epgListView(v === 'true');  
			}  
		}  
	);  
	addSettings(  
		'trigger',  
		{  
			title: langGet('launch_menu'),  
			name: 'launch_menu',  
			default: false  
		}  
	);  
	addSettings(  
		'select',  
		{  
			title: langGet('max_ch_in_group'),  
			description: langGet('max_ch_in_group_desc'),  
			name: 'max_ch_in_group',  
			values: {  
				0: '#{settings_param_card_view_all}',  
				60: '60',  
				120: '120',  
				180: '180',  
				240: '240',  
				300: '300'  
			},  
			default: 300  
		}  
	);  
	for (var i = 0; i <= lists.length; i++) i = configurePlaylist(i);  
	UID = getStorage('uid', '');  
	if (!UID) {  
		UID = Lampa.Utils.uid(10).toUpperCase().replace(/(.{4})/g, '$1-');  
		setStorage('uid', UID);  
	} else if (UID.length > 12) {  
		UID = UID.substring(0, 12);  
		setStorage('uid', UID);  
	}  
	addSettings('title', {title: langGet('uid')});  
	addSettings('static', {title: UID, description: langGet('unique_id')});  
  
	function pluginStart() {  
		if (!!window['plugin_' + plugin.component + '_ready']) {  
			console.log(plugin.name, 'plugin already start');  
			return;  
		}  
		window['plugin_' + plugin.component + '_ready'] = true;  
		var menu = $('.menu .menu__list').eq(0);  
		for (var i = 0; i < lists.length; i++) menu.append(lists[i].menuEl);  
		isSNG = ['uk', 'ru', 'be'].indexOf(Lampa.Storage.field('language')) >= 0;  
		console.log(plugin.name, 'plugin start', menu.length, lists.length, isSNG);  
	}  
  
	console.log(plugin.name, 'plugin ready start', !!window.appready ? 'now' : 'waiting event ready');  
	if (!!window.appready) pluginStart();  
	else Lampa.Listener.follow('app', function (e) {if (e.type === 'ready') pluginStart()});  
})();
