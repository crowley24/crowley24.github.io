;(function () {  
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
var chPanel = $((  
	"<div class=\"player-info info--visible js-ch-PLUGIN\" style=\"top: 9em;right: auto;z-index: 1000;\">\n" +  
	"	<div class=\"player-info__body\">\n" +  
	"		<div class=\"player-info__line\">\n" +  
	"			<div class=\"player-info__name\">&nbsp;</div>\n" +  
	"		</div>\n" +  
	"	</div>\n" +  
	"</div>").replace(/PLUGIN/g, plugin.component)  
).hide().fadeOut(0);  
var chHelper = $((  
	"<div class=\"player-info info--visible js-ch-PLUGIN\" style=\"top: 14em;right: auto;z-index: 1000;\">\n" +  
	"	<div class=\"player-info__body\">\n" +  
	"		<div class=\"tv-helper\"></div>\n" +  
	"	</div>\n" +  
	"</div>").replace(/PLUGIN/g, plugin.component)  
).hide().fadeOut(0);  
var epgTemplate = $(('<div id="PLUGIN_epg">\n' +  
	'<h2 class="js-epgChannel"></h2>\n' +  
	'<div class="PLUGIN-details__program-body js-epgNow">\n' +  
	'   <div class="PLUGIN-details__program-title">Сейчас</div>\n' +  
	'   <div class="PLUGIN-details__program-list">' +  
	'<div class="PLUGIN-program selector">\n' +  
	'   <div class="PLUGIN-program__time js-epgTime">XX:XX</div>\n' +  
	'   <div class="PLUGIN-program__body">\n' +  
	'	   <div class="PLUGIN-program__title js-epgTitle"> </div>\n' +  
	'	   <div class="PLUGIN-program__progressbar"><div class="PLUGIN-program__progress js-epgProgress" style="width: 50%"></div></div>\n' +  
	'   </div>\n' +  
	'</div>' +  
	'   </div>\n' +  
	'   <div class="PLUGIN-program__desc js-epgDesc"></div>'+  
	'</div>\n' +  
	'<div class="PLUGIN-details__program-body js-epgAfter">\n' +  
	'   <div class="PLUGIN-details__program-title">Потом</div>\n' +  
	'   <div class="PLUGIN-details__program-list js-epgList">' +  
	'   </div>\n' +  
	'</div>\n' +  
	'</div>').replace(/PLUGIN/g, plugin.component)  
);  
function epgListView(isView) {  
	var scroll = $('.' + plugin.component + '.category-full').parents('.scroll');  
	if (scroll.length) {  
		if (isView) {  
			scroll.css({float: "left", width: '70%'});  
			scroll.parent().append(epgTemplate);  
		} else {  
			scroll.css({float: "none", width: '100%'});  
			$('#' + plugin.component + '_epg').remove();  
		}  
	}  
}  
var epgItemTeplate = $((  
	'<div class="PLUGIN-program selector">\n' +  
	'   <div class="PLUGIN-program__time js-epgTime">XX:XX</div>\n' +  
	'   <div class="PLUGIN-program__body">\n' +  
	'	   <div class="PLUGIN-program__title js-epgTitle"> </div>\n' +  
	'   </div>\n' +  
	'</div>').replace(/PLUGIN/g, plugin.component)  
);  
var chHelpEl = chHelper.find('.tv-helper');  
var chNumEl = chPanel.find('.player-info__name');  
var encoder = $('<div/>');  
  
function isPluginPlaylist(playlist) {  
	return !(!playlist.length || !playlist[0].tv  
		|| !playlist[0].plugin || playlist[0].plugin !== plugin.component);  
}  
Lampa.PlayerPlaylist.listener.follow('select', function(e) {  
	if (e.item.plugin && e.item.plugin === plugin.component && Lampa.Player.runas)  
		Lampa.Player.runas(Lampa.Storage.field('player_iptv'));  
});  
function channelSwitch(dig, isChNum) {  
	if (!Lampa.Player.opened()) return false;  
	var playlist = Lampa.PlayerPlaylist.get();  
	if (!isPluginPlaylist(playlist)) return false;  
	if (!$('body>.js-ch-' + plugin.component).length) $('body').append(chPanel).append(chHelper);  
	var cnt = playlist.length;  
	var prevChNumber = chNumber;  
	chNumber += dig;  
	var number = parseInt(chNumber);  
	if (number && number <= cnt) {  
		if (!!chTimeout) clearTimeout(chTimeout);  
		stopRemoveChElement = true; // fix removing element in callback on animate.finish()  
		chNumEl.text(playlist[number - 1].title);  
		if (isChNum || parseInt(chNumber + '0') > cnt) {  
			chHelper.finish().hide().fadeOut(0);  
		} else {  
			var help = [];  
			var chHelpMax = 9;  
			var start = parseInt(chNumber + '0');  
			for (var i = start; i <= cnt && i <= (start + Math.min(chHelpMax, 9)); i++) {  
				help.push(encoder.text(playlist[i - 1].title).html());  
			}  
			chHelpEl.html(help.join('<br>'));  
			chHelper.finish().show().fadeIn(0);  
		}  
		if (number < 10 || isChNum) {  
			chPanel.finish().show().fadeIn(0);  
		}  
		stopRemoveChElement = false;  
		var chSwitch = function () {  
			var pos = number - 1;  
			if (Lampa.PlayerPlaylist.position() !== pos) {  
				Lampa.PlayerPlaylist.listener.send('select', {  
					playlist: playlist,  
					position: pos,  
					item: playlist[pos]  
				});  
				Lampa.Player.runas && Lampa.Player.runas(Lampa.Storage.field('player_iptv'));  
			}  
			chPanel.delay(1000).fadeOut(500,function(){stopRemoveChElement || chPanel.remove()});  
			chHelper.delay(1000).fadeOut(500,function(){stopRemoveChElement || chHelper.remove()});  
			chNumber = "";  
		}  
		if (isChNum === true) {  
			chTimeout = setTimeout(chSwitch, 1000);  
			chNumber = "";  
		} else if (parseInt(chNumber + '0') > cnt) {  
			// Ещё одна цифра невозможна - переключаем  
			chSwitch();  
		} else {  
			// Ждём следующую цифру или переключаем  
			chTimeout = setTimeout(chSwitch, 3000);  
		}  
	} else {  
		chNumber = prevChNumber;  
	}  
	return true;  
}  
  
var cacheVal = {};  
  
function cache(name, value, timeout) {  
	var time = (new Date()) * 1;  
	if (!!timeout && timeout > 0) {  
		cacheVal[name] = [(time + timeout), value];  
		return;  
	}  
	if (!!cacheVal[name] && cacheVal[name][0] > time) {  
		return cacheVal[name][1];  
	}  
	delete (cacheVal[name]);  
	return value;  
}  
  
var timeOffset = 0;  
var timeOffsetSet = false;  
  
function unixtime() {  
	return Math.floor((new Date().getTime() + timeOffset)/1000);  
}  
  
function toLocaleTimeString(time) {  
	var date = new Date(),  
		ofst = parseInt(Lampa.Storage.get('time_offset', 'n0').replace('n',''));  
	time = time || date.getTime();  
  
	date = new Date(time + (ofst * 1000 * 60 * 60));  
	return ('0' + date.getHours()).substr(-2) + ':' + ('0' + date.getMinutes()).substr(-2);  
}  
  
function toLocaleDateString(time) {  
	var date = new Date(),  
		ofst = parseInt(Lampa.Storage.get('time_offset', 'n0').replace('n',''));  
	time = time || date.getTime();  
  
	date = new Date(time + (ofst * 1000 * 60 * 60));  
	return date.toLocaleDateString();  
}  
  
var utils = {  
	uid: function() {return UID},  
	timestamp: unixtime,  
	token: function() {return generateSigForString(Lampa.Storage.field('account_email').toLowerCase())},  
	hash: Lampa.Utils.hash,  
	hash36: function(s) {return (this.hash(s) * 1).toString(36)}  
};  
  
function generateSigForString(string) {  
	var sigTime = unixtime();  
	return sigTime.toString(36) + ':' + utils.hash36((string || '') + sigTime + utils.uid());  
}  
  
function strReplace(str, key2val) {  
	for (var key in key2val) {  
		str = str.replace(  
			new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),  
			key2val[key]  
		);  
	}  
	return str;  
}  
  
function tf(t, format, u, tz) {  
	format = format || '';  
	tz = parseInt(tz || '0');  
	var thisOffset = 0;  
	thisOffset += tz * 60;  
	if (!u) thisOffset += parseInt(Lampa.Storage.get('time_offset', 'n0').replace('n','')) * 60 - new Date().getTimezoneOffset();  
	var d = new Date((t + thisOffset) * 6e4);  
	var r = {yyyy:d.getUTCFullYear(),MM:('0'+(d.getUTCMonth()+1)).substr(-2),dd:('0'+(d.getUTCDate())).substr(-2),HH:('0'+(d.getUTCHours())).substr(-2),mm:('0'+(d.getUTCMinutes())).substr(-2),ss:('0'+(d.getUTCSeconds())).substr(-2),UTF:t*6e4};  
	return strReplace(format, r);  
}  
  
function prepareUrl(url, epg) {  
	var m = [], val = '', r = {start:unixtime,offset:0};  
	if (epg && epg.length) {  
		r = {  
			start: epg[0] * 60,  
			utc: epg[0] * 60,  
			end: (epg[0] + epg[1]) * 60,  
			utcend: (epg[0] + epg[1]) * 60,  
			offset: unixtime() - epg[0] * 60,  
			duration: epg[1] * 60,  
			now: unixtime,  
			lutc: unixtime,  
			d: function(m){return strReplace(m[6]||'',{M:epg[1],S:epg[1]*60,h:Math.floor(epg[1]/60),m:('0'+(epg[1] % 60)).substr(-2),s:'00'})},  
			b: function(m){return tf(epg[0], m[6], m[4], m[5])},  
			e: function(m){return tf(epg[0] + epg[1], m[6], m[4], m[5])},  
			n: function(m){return tf(unixtime() / 60, m[6], m[4], m[5])},  
			c: function(m){return tf((epg[0] + epg[1]) / 60, m[6], m[4], m[5])}  
		};  
	}  
	while ((m = url.match(/\$\{([a-z]+)(\|([^}]+))?\}/i)) !== null) {  
		url = url.replace(m[0], typeof r[m[1]] === 'function' ? r[m[1]](m) : (r[m[1]] || m[3] || ''));  
	}  
	return url;  
}  
  
function catchupUrl(url, type, source) {  
	if (!type) return url;  
	var m = [], val = '', r = {start:unixtime,offset:0};  
	while ((m = type.match(/\$\{([a-z]+)(\|([^}]+))?\}/i)) !== null) {  
		if (typeof r[m[1]] === 'undefined') {  
			r[m[1]] = m[3] || '';  
		}  
	}  
	if (source) {  
		r['source'] = source;  
	}  
	while ((m = url.match(/\$\{([a-z]+)(\|([^}]+))?\}/i)) !== null) {  
		url = url.replace(m[0], typeof r[m[1]] === 'function' ? r[m[1]](m) : (r[m[1]] || m[3] || ''));  
	}  
	return url;  
}  
  
function networkSilentSessCache(url, success, error, json, headers) {  
	var cacheKey = 'network_cache_' + Lampa.Utils.hash(url);  
	var cached = sessionStorage.getItem(cacheKey);  
	if (cached) {  
		try {  
			var data = JSON.parse(cached);  
			if (data.time > Date.now() - 300000) { // 5 хвилин  
				success(data.data);  
				return;  
			}  
		} catch (e) {  
			sessionStorage.removeItem(cacheKey);  
		}  
	}  
	  
	network.silent(url, function(data) {  
		try {  
			sessionStorage.setItem(cacheKey, JSON.stringify({  
				time: Date.now(),  
				data: data  
			}));  
		} catch (e) {}  
		success(data);  
	}, error, json, headers);  
}  
  
function getEpgSessCache(key, time) {  
	var cacheKey = 'epg_cache_' + key;  
	var cached = sessionStorage.getItem(cacheKey);  
	if (cached) {  
		try {  
			var data = JSON.parse(cached);  
			if (data.time > Date.now() - 300000) { // 5 хвилин  
				return data.data;  
			}  
		} catch (e) {  
			sessionStorage.removeItem(cacheKey);  
		}  
	}  
	return false;  
}  
  
function setEpgSessCache(key, data) {  
	var cacheKey = 'epg_cache_' + key;  
	try {  
		sessionStorage.setItem(cacheKey, JSON.stringify({  
			time: Date.now(),  
			data: data  
		}));  
	} catch (e) {}  
}  
  
var network = new Lampa.Reguest();  
var scroll = new Lampa.Scroll({  
	mask: true,  
	over: true  
});  
var html = $('<div></div>');  
var body = $('<div class="' + plugin.component + ' category-full"></div>');  
var info;  
var last;  
var favorite = getStorage('favorite', '[]');  
var epgIdCurrent = '';  
var layerCards = null;  
var layerFocusI = 0;  
var layerCnt = 300;  
var groupSwitchTimeout;  
  
// Додаємо CSS стилі  
Lampa.Template.add(plugin.component + '_style', '<style>.' + plugin.component + '__container{display:flex;height:100%}.' + plugin.component + '__groups{width:20%;flex-shrink:0;background:rgba(0,0,0,0.3);padding:1em;overflow-y:auto}.' + plugin.component + '__group-item{padding:1em;margin-bottom:.5em;border-radius:.5em;cursor:pointer;transition:background .2s}.' + plugin.component + '__group-item:hover,.' + plugin.component + '__group-item.focus{background:rgba(255,255,255,0.1)}.' + plugin.component + '__group-item.active{background:rgba(255,255,255,0.2)}.' + plugin.component + '__channels{flex:1;padding-left:1em}#PLUGIN_epg{margin-right:1em}.PLUGIN-program__desc{font-size:0.9em;margin:0.5em;text-align:justify;max-height:15em;overflow:hidden;}.PLUGIN.category-full{padding-bottom:10em}.PLUGIN div.card__view{position:relative;background-color:#353535;background-color:#353535a6;border-radius:1em;cursor:pointer;padding-bottom:60%}.PLUGIN.square_icons div.card__view{padding-bottom:100%}.PLUGIN img.card__img,.PLUGIN div.card__img{background-color:unset;border-radius:unset;max-height:100%;max-width:100%;height:auto;width:auto;position:absolute;top:50%;left:50%;-moz-transform:translate(-50%,-50%);-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);font-size:2em}.PLUGIN.contain_icons img.card__img{height:95%;width:95%;object-fit:contain}.PLUGIN .card__title{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.PLUGIN .js-layer--hidden{visibility: hidden}.PLUGIN .js-layer--visible{visibility: visible}.PLUGIN .card__age{padding:0;border:1px #3e3e3e solid;margin-top:0.3em;border-radius:0.3em;position:relative;display: none}.PLUGIN .card__age .card__epg-progress{position:absolute;background-color:#3a3a3a;top:0;left:0;width:0%;max-width:100%;height:100%}.PLUGIN .card__age .card__epg-title{position:relative;padding:0.4em 0.2em;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;}.PLUGIN.category-full .card__icons {top:0.3em;right:0.3em;justify-content:right;}#PLUGIN{float:right;padding: 1.2em 0;width: 30%;}.PLUGIN-details__group{font-size:1.3em;margin-bottom:.9em;opacity:.5}.PLUGIN-details__title{font-size:4em;font-weight:700}.PLUGIN-details__program{padding-top:4em}.PLUGIN-details__program-title{font-size:1.2em;padding-left:4.9em;margin-top:1em;margin-bottom:1em;opacity:.5}.PLUGIN-details__program-list>div+div{margin-top:1em}.PLUGIN-details__program>div+div{margin-top:2em}.PLUGIN-program{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;font-size:1.2em;font-weight:300}.PLUGIN-program__time{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;width:5em;position:relative}.PLUGIN-program.focus .PLUGIN-program__time::after{content:\'\';position:absolute;top:.5em;right:.9em;width:.4em;background-color:#fff;height:.4em;-webkit-border-radius:100%;-moz-border-radius:100%;border-radius:100%;margin-top:-0.1em;font-size:1.2em}.PLUGIN-program__progressbar{width:10em;height:0.3em;border:0.05em solid #fff;border-radius:0.05em;margin:0.5em 0.5em 0 0}.PLUGIN-program__progress{height:0.25em;border:0.05em solid #fff;background-color:#fff;max-width: 100%}.PLUGIN .card__icon.icon--timeshift{background-image:url(https://epg.rootu.top/img/icon/timeshift.svg);}</style>'.replace(/PLUGIN/g, plugin.component));  
$('body').append(Lampa.Template.get(plugin.component + '_style', {}, true));  
  
function clearEpgData() {  
    epgIdCurrent = '';  
    if (epgInterval) {  
        clearInterval(epgInterval);  
        epgInterval = null;  
    }  
    $('#' + plugin.component + '_epg').remove();  
}  
  
function bulkWrapper(fn) {  
	var calls = 0;  
	var max = 99;  
	var timer = null;  
	var data = [];  
	var call = function () {  
		if (calls < max) {  
			calls++;  
			fn.apply(this, arguments);  
		} else {  
			data.push(arguments);  
		}  
	};  
	call.flush = function () {  
		while (data.length) {  
			fn.apply(this, data.shift());  
			calls--;  
		}  
	};  
	call.done = function () {  
		if (!timer) {  
			timer = setTimeout(function () {  
				timer = null;  
				calls = 0;  
				call.flush();  
			}, 10);  
		}  
	};  
	return call;  
}  
  
function setEpgId(channelGroup) {  
	if (!channelGroup.channels.length) return;  
	var epgIds = [];  
	channelGroup.channels.forEach(function (channel) {  
		if (channel['epgId'] && epgIds.indexOf(channel['epgId']) === -1) {  
			epgIds.push(channel['epgId']);  
		}  
	});  
	if (epgIds.length) {  
		epgInterval = setInterval(function () {  
			cardsEpgRender(body.find('.card'));  
		}, 30000);  
	}  
}  
  
var pluginPage = {  
	activity: null,  
	last: null,  
	plugin: plugin,  
	init: function (activity) {  
		this.activity = activity;  
		this.activity.component = plugin.component;  
		this.activity.title = this.activity.title || plugin.name;  
	},  
	create: function () {  
		var _this = this;  
		this.build();  
		return this.render();  
	},  
	build: function (catalog) {  
		var channelGroup = !catalog[object.currentGroup]  
				? (lists[object.id].groups.length > 1 && !!catalog[lists[object.id].groups[1].key]  
						? catalog[lists[object.id].groups[1].key]  
						: {'channels': []})  
				: catalog[object.currentGroup];  
		var _this2 = this;  
		Lampa.Background.change();  
		  
		// Створюємо двоколонковий контейнер  
		var mainContainer = $('<div class="' + plugin.component + '__container"></div>');  
		var groupsPanel = $('<div class="' + plugin.component + '__groups"></div>');  
		var channelsPanel = $('<div class="' + plugin.component + '__channels"></div>');  
		  
		// Додаємо групи в ліву панель  
		lists[object.id].groups.forEach(function(group) {  
			var groupItem = $('<div class="' + plugin.component + '__group-item selector' +   
				(object.currentGroup === group.key ? ' active' : '') + '">' +  
				'<div class="group__title">' + group.title + '</div>' +  
				'</div>');  
			  
			groupItem.on('hover:enter', function() {  
				clearTimeout(groupSwitchTimeout);  
				groupSwitchTimeout = setTimeout(function() {  
					if (object.currentGroup !== group.key) {  
						clearEpgData();  
						object.currentGroup = group.key;  
						  
						// Оновлюємо активний клас для груп  
						groupsPanel.find('.active').removeClass('active');  
						groupItem.addClass('active');  
						  
						// Оновлюємо інформаційну панель  
						info.find('.info__title-original').text(group.title);  
						  
						// Очищуємо та оновлюємо канали  
						channelsPanel.empty();  
						var newChannelGroup = catalog[group.key] || {'channels': []};  
						  
						if (newChannelGroup.channels.length) {  
							setEpgId(newChannelGroup);  
							scroll.render().addClass('layer--wheight').data('mheight', info);  
							channelsPanel.append(scroll.render());  
							_this2.append(newChannelGroup.channels);  
							  
							if (getStorage('epg', false)) {  
								scroll.render().css({float: "left", width: '70%'});  
								scroll.render().parent().append(epgTemplate);  
							}  
							  
							scroll.append(body);  
							setStorage('last_catalog' + object.id, group.key);  
							lists[object.id].activity.currentGroup = group.key;  
							  
							// Встановлюємо фокус на перший канал  
							setTimeout(function() {  
								Lampa.Controller.collectionSet(scroll.render());  
								Lampa.Controller.collectionFocus(scroll.render().find('.selector').first(), scroll.render());  
							}, 100);  
						} else {  
							var empty = new Lampa.Empty();  
							channelsPanel.append(empty.render());  
						}  
					}  
				}, 100);  
			});  
			  
			groupsPanel.append(groupItem);  
		});  
		  
		// Інформаційна панель  
		Lampa.Template.add(plugin.component + '_info_radio', '<div class="info layer--width"><div class="info__left"><div class="info__title"></div><div class="info__title-original"></div><div class="info__create"></div></div><div class="info__right" style="display: flex !important;"></div></div>');  
		info = Lampa.Template.get(plugin.component + '_info_radio');  
		info.find('.info__title-original').text(!catalog[object.currentGroup] ? '' : catalog[object.currentGroup].title);  
		info.find('.info__title').text('');  
		  
		if (channelGroup.channels.length) {  
			setEpgId(channelGroup);  
			scroll.render().addClass('layer--wheight').data('mheight', info);  
			channelsPanel.append(scroll.render());  
			this.append(channelGroup.channels);  
			  
			if (getStorage('epg', false)) {  
				scroll.render().css({float: "left", width: '70%'});  
				scroll.render().parent().append(epgTemplate);  
			}  
			  
			scroll.append(body);  
			setStorage('last_catalog' + object.id, object.currentGroup ? object.currentGroup : '!!');  
			lists[object.id].activity.currentGroup = object.currentGroup;  
		} else {  
			var empty = new Lampa.Empty();  
			channelsPanel.append(empty.render());  
			this.activity.loader(false);  
			Lampa.Controller.collectionSet(info);  
			Navigator.move('right');  
		}  
		  
		mainContainer.append(groupsPanel);  
		mainContainer.append(channelsPanel);  
		html.append(info.append());  
		html.append(mainContainer);  
	},  
	start: function () {  
		if (Lampa.Activity.active().activity !== this.activity) return;  
		  
		var _this = this;  
		var groupsPanel = $('.' + plugin.component + '__groups');  
		  
		Lampa.Controller.add('content', {  
			toggle: function toggle() {  
				if (scroll && scroll.render()) {  
					Lampa.Controller.collectionSet(scroll.render());  
					Lampa.Controller.collectionFocus(last || false, scroll.render());  
				}  
			},  
			left: function left() {  
				var focused = $(Navigator.focused());  
				if (focused.hasClass(plugin.component + '__group-item')) {  
					Lampa.Controller.toggle('menu');  
				} else {  
					Lampa.Controller.collectionSet(groupsPanel);  
					Lampa.Controller.collectionFocus(groupsPanel.find('.selector').first(), groupsPanel);  
				}  
			},  
			right: function right() {  
				var focused = $(Navigator.focused());  
				if (focused.hasClass(plugin.component + '__group-item')) {  
					if (scroll && scroll.render()) {  
						Lampa.Controller.collectionSet(scroll.render());  
						Lampa.Controller.collectionFocus(last || scroll.render().find('.selector').first(), scroll.render());  
					}  
				} else if (Navigator.canmove('right')) {  
					Navigator.move('right');  
				}  
			},  
			up: function up() {  
				if (Navigator.canmove('up')) {  
					Navigator.move('up');  
				} else {  
					Lampa.Controller.toggle('head');  
				}  
			},  
			down: function down() {  
				if (Navigator.canmove('down')) {  
					Navigator.move('down');  
				}  
			},  
			back: function back() {  
				Lampa.Activity.backward();  
			}  
		});  
		Lampa.Controller.toggle('content');  
	},  
	pause: function () {  
		Lampa.Player.runas && Lampa.Player.runas('');  
	},  
	stop: function () {  
		Lampa.Player.runas && Lampa.Player.runas('');  
	},  
	render: function () {  
		return html;  
	},  
	destroy: function () {  
		if (groupSwitchTimeout) clearTimeout(groupSwitchTimeout);  
		if (epgInterval) clearInterval(epgInterval);  
		Lampa.Player.runas && Lampa.Player.runas('');  
		network.clear();  
		scroll.destroy();  
		if (info) info.remove();  
		layerCards = null;  
		if (layerInterval) clearInterval(layerInterval);  
		html.remove();  
		body.remove();  
		favorite = null;  
		network = null;  
		html = null;  
		body = null;  
		info = null;  
	}  
};  
while ((m = url.match(/\$\{([a-z]+)(\|([^}]+))?\}/i)) !== null) {  
		url = url.replace(m[0], typeof r[m[1]] === 'function' ? r[m[1]](m) : (r[m[1]] || m[3] || ''));  
	}  
	return url;  
}  
  
// Функції кешування  
function networkSilentSessCache(url, success, error, json, headers) {  
	var cacheKey = 'network_cache_' + Lampa.Utils.hash(url);  
	var cached = sessionStorage.getItem(cacheKey);  
	if (cached) {  
		try {  
			var data = JSON.parse(cached);  
			if (data.time > Date.now() - 300000) {  
				success(data.data);  
				return;  
			}  
		} catch (e) {  
			sessionStorage.removeItem(cacheKey);  
		}  
	}  
	  
	network.silent(url, function(data) {  
		try {  
			sessionStorage.setItem(cacheKey, JSON.stringify({  
				time: Date.now(),  
				data: data  
			}));  
		} catch (e) {}  
		success(data);  
	}, error, json, headers);  
}  
  
function getEpgSessCache(key, time) {  
	var cacheKey = 'epg_cache_' + key;  
	var cached = sessionStorage.getItem(cacheKey);  
	if (cached) {  
		try {  
			var data = JSON.parse(cached);  
			if (data.time > Date.now() - 300000) {  
				return data.data;  
			}  
		} catch (e) {  
			sessionStorage.removeItem(cacheKey);  
		}  
	}  
	return false;  
}  
  
function setEpgSessCache(key, data) {  
	var cacheKey = 'epg_cache_' + key;  
	try {  
		sessionStorage.setItem(cacheKey, JSON.stringify({  
			time: Date.now(),  
			data: data  
		}));  
	} catch (e) {}  
}  
  
// Ініціалізація змінних  
var network = new Lampa.Reguest();  
var scroll = new Lampa.Scroll({  
	mask: true,  
	over: true  
});  
var html = $('<div></div>');  
var body = $('<div class="' + plugin.component + ' category-full"></div>');  
var info;  
var last;  
var favorite = getStorage('favorite', '[]');  
var epgIdCurrent = '';  
var layerCards = null;  
var layerFocusI = 0;  
var layerCnt = 300;  
var groupSwitchTimeout;  
  
// Додаємо CSS стилі для двоколонкового інтерфейсу  
Lampa.Template.add(plugin.component + '_style', '<style>.' + plugin.component + '__container{display:flex;height:100%}.' + plugin.component + '__groups{width:20%;flex-shrink:0;background:rgba(0,0,0,0.3);padding:1em;overflow-y:auto}.' + plugin.component + '__group-item{padding:1em;margin-bottom:.5em;border-radius:.5em;cursor:pointer;transition:background .2s}.' + plugin.component + '__group-item:hover,.' + plugin.component + '__group-item.focus{background:rgba(255,255,255,0.1)}.' + plugin.component + '__group-item.active{background:rgba(255,255,255,0.2)}.' + plugin.component + '__channels{flex:1;padding-left:1em}#PLUGIN_epg{margin-right:1em}.PLUGIN-program__desc{font-size:0.9em;margin:0.5em;text-align:justify;max-height:15em;overflow:hidden;}.PLUGIN.category-full{padding-bottom:10em}.PLUGIN div.card__view{position:relative;background-color:#353535;background-color:#353535a6;border-radius:1em;cursor:pointer;padding-bottom:60%}.PLUGIN.square_icons div.card__view{padding-bottom:100%}.PLUGIN img.card__img,.PLUGIN div.card__img{background-color:unset;border-radius:unset;max-height:100%;max-width:100%;height:auto;width:auto;position:absolute;top:50%;left:50%;-moz-transform:translate(-50%,-50%);-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);font-size:2em}.PLUGIN.contain_icons img.card__img{height:95%;width:95%;object-fit:contain}.PLUGIN .card__title{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.PLUGIN .js-layer--hidden{visibility: hidden}.PLUGIN .js-layer--visible{visibility: visible}.PLUGIN .card__age{padding:0;border:1px #3e3e3e solid;margin-top:0.3em;border-radius:0.3em;position:relative;display: none}.PLUGIN .card__age .card__epg-progress{position:absolute;background-color:#3a3a3a;top:0;left:0;width:0%;max-width:100%;height:100%}.PLUGIN .card__age .card__epg-title{position:relative;padding:0.4em 0.2em;text-overflow:ellipsis;white-space:nowrap;overflow:hidden;}.PLUGIN.category-full .card__icons {top:0.3em;right:0.3em;justify-content:right;}#PLUGIN{float:right;padding: 1.2em 0;width: 30%;}.PLUGIN-details__group{font-size:1.3em;margin-bottom:.9em;opacity:.5}.PLUGIN-details__title{font-size:4em;font-weight:700}.PLUGIN-details__program{padding-top:4em}.PLUGIN-details__program-title{font-size:1.2em;padding-left:4.9em;margin-top:1em;margin-bottom:1em;opacity:.5}.PLUGIN-details__program-list>div+div{margin-top:1em}.PLUGIN-details__program>div+div{margin-top:2em}.PLUGIN-program{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;font-size:1.2em;font-weight:300}.PLUGIN-program__time{-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;width:5em;position:relative}.PLUGIN-program.focus .PLUGIN-program__time::after{content:\'\';position:absolute;top:.5em;right:.9em;width:.4em;background-color:#fff;height:.4em;-webkit-border-radius:100%;-moz-border-radius:100%;border-radius:100%;margin-top:-0.1em;font-size:1.2em}.PLUGIN-program__progressbar{width:10em;height:0.3em;border:0.05em solid #fff;border-radius:0.05em;margin:0.5em 0.5em 0 0}.PLUGIN-program__progress{height:0.25em;border:0.05em solid #fff;background-color:#fff;max-width: 100%}.PLUGIN .card__icon.icon--timeshift{background-image:url(https://epg.rootu.top/img/icon/timeshift.svg);}</style>'.replace(/PLUGIN/g, plugin.component));  
$('body').append(Lampa.Template.get(plugin.component + '_style', {}, true));  
  
// Функція очищення EPG даних  
function clearEpgData() {  
    epgIdCurrent = '';  
    if (epgInterval) {  
        clearInterval(epgInterval);  
        epgInterval = null;  
    }  
    $('#' + plugin.component + '_epg').remove();  
}  
  
// Функція для пакетної обробки  
function bulkWrapper(fn) {  
	var calls = 0;  
	var max = 99;  
	var timer = null;  
	var data = [];  
	var call = function () {  
		if (calls < max) {  
			calls++;  
			fn.apply(this, arguments);  
		} else {  
			data.push(arguments);  
		}  
	};  
	call.flush = function () {  
		while (data.length) {  
			fn.apply(this, data.shift());  
			calls--;  
		}  
	};  
	call.done = function () {  
		if (!timer) {  
			timer = setTimeout(function () {  
				timer = null;  
				calls = 0;  
				call.flush();  
			}, 10);  
		}  
	};  
	return call;  
}  
  
// Встановлення EPG ID для групи каналів  
function setEpgId(channelGroup) {  
	if (!channelGroup.channels.length) return;  
	var epgIds = [];  
	channelGroup.channels.forEach(function (channel) {  
		if (channel['epgId'] && epgIds.indexOf(channel['epgId']) === -1) {  
			epgIds.push(channel['epgId']);  
		}  
	});  
	if (epgIds.length) {  
		epgInterval = setInterval(function () {  
			cardsEpgRender(body.find('.card'));  
		}, 30000);  
	}  
}  
  
// Основний об'єкт сторінки плагіна  
var pluginPage = {  
	activity: null,  
	last: null,  
	plugin: plugin,  
	init: function (activity) {  
		this.activity = activity;  
		this.activity.component = plugin.component;  
		this.activity.title = this.activity.title || plugin.name;  
	},  
	create: function () {  
		var _this = this;  
		var activity = this.activity;  
		object = activity;  
		curListId = activity.id;  
		  
		if (!lists[curListId]) {  
			curListId = 0;  
			activity.id = 0;  
		}  
		  
		if (!lists[curListId].activity.url) {  
			Lampa.Activity.replace({  
				title: langGet('settings_playlist_num_group') + (curListId + 1),  
				url: '',  
				component: 'settings',  
				page: 'main',  
				plugin: plugin.component  
			});  
			return;  
		}  
		  
		if (!catalog[curListId]) {  
			this.load();  
		} else {  
			this.build(catalog[curListId]);  
		}  
	},  
	load: function () {  
		var _this = this;  
		var activity = this.activity;  
		var url = lists[curListId].activity.url;  
		  
		network.clear();  
		network.timeout = 20000;  
		network.silent(url, function (str) {  
			try {  
				var data = Lampa.Utils.parseM3U(str);  
				catalog[curListId] = data;  
				listCfg[curListId] = data.cfg || {};  
				lists[curListId].groups = data.groups || [];  
				_this.build(data);  
			} catch (e) {  
				Lampa.Noty.show(langGet('error_load_playlist'));  
				console.error(plugin.name, 'Error parsing playlist:', e);  
			}  
		}, function (a, c) {  
			Lampa.Noty.show(langGet('error_load_playlist'));  
			console.error(plugin.name, 'Error loading playlist:', a, c);  
		}, false, {  
			dataType: 'text'  
		});  
	},  
	build: function (catalog) {  
		var channelGroup = !catalog[object.currentGroup]  
			? (lists[object.id].groups.length > 1 && !!catalog[lists[object.id].groups[1].key]  
				? catalog[lists[object.id].groups[1].key]  
				: {'channels': []})  
			: catalog[object.currentGroup];  
		var _this2 = this;  
		Lampa.Background.change();  
		  
		// Створюємо двоколонковий контейнер  
		var mainContainer = $('<div class="' + plugin.component + '__container"></div>');  
		var groupsPanel = $('<div class="' + plugin.component + '__groups"></div>');  
		var channelsPanel = $('<div class="' + plugin.component + '__channels"></div>');  
		  
		// Додаємо групи в ліву панель  
		lists[object.id].groups.forEach(function(group) {  
			var groupItem = $('<div class="' + plugin.component + '__group-item selector' +   
				(object.currentGroup === group.key ? ' active' : '') + '">' +  
				'<div class="group__title">' + group.title + '</div>' +  
				'</div>');  
			  
			groupItem.on('hover:enter', function() {  
				clearTimeout(groupSwitchTimeout);  
				groupSwitchTimeout = setTimeout(function() {  
					if (object.currentGroup !== group.key) {  
						clearEpgData();  
						object.currentGroup = group.key;  
						  
						// Оновлюємо активний клас для груп  
						groupsPanel.find('.active').removeClass('active');  
						groupItem.addClass('active');  
						  
						// Оновлюємо інформаційну панель  
						info.find('.info__title-original').text(group.title);  
						  
						// Очищуємо та оновлюємо канали  
						channelsPanel.empty();  
						var newChannelGroup = catalog[group.key] || {'channels': []};  
						  
						if (newChannelGroup.channels.length) {  
							setEpgId(newChannelGroup);  
							scroll.render().addClass('layer--wheight').data('mheight', info);  
							channelsPanel.append(scroll.render());  
							_this2.append(newChannelGroup.channels);  
							  
							if (getStorage('epg', false)) {  
								scroll.render().css({float: "left", width: '70%'});  
								scroll.render().parent().append(epgTemplate);  
							}  
							  
							scroll.append(body);  
							setStorage('last_catalog' + object.id, group.key);  
							lists[object.id].activity.currentGroup = group.key;  
							  
							// Встановлюємо фокус на перший канал  
							setTimeout(function() {  
								Lampa.Controller.collectionSet(scroll.render());  
								Lampa.Controller.collectionFocus(scroll.render().find('.selector').first(), scroll.render());  
							}, 100);  
						} else {  
							var empty = new Lampa.Empty();  
							channelsPanel.append(empty.render());  
						}  
					}  
				}, 100);  
			});  
			  
			groupsPanel.append(groupItem);  
		});  
		  
		// Інформаційна панель  
		Lampa.Template.add(plugin.component + '_info_radio', '<div class="info layer--width"><div class="info__left"><div class="info__title"></div><div class="info__title-original"></div><div class="info__create"></div></div><div class="info__right" style="display: flex !important;"></div></div>');  
		info = Lampa.Template.get(plugin.component + '_info_radio');  
		info.find('.info__title-original').text(!catalog[object.currentGroup] ? '' : catalog[object.currentGroup].title);  
		info.find('.info__title').text('');  
		  
		if (channelGroup.channels.length) {  
			setEpgId(channelGroup);  
			scroll.render().addClass('layer--wheight').data('mheight', info);  
			channelsPanel.append(scroll.render());  
			this.append(channelGroup.channels);  
			  
			if (getStorage('epg', false)) {  
				scroll.render().css({float: "left", width: '70%'});  
				scroll.render().parent().append(epgTemplate);  
			}  
			  
			scroll.append(body);  
			setStorage('last_catalog' + object.id, object.currentGroup ? object.currentGroup : '!!');  
			lists[object.id].activity.currentGroup = object.currentGroup;  
		} else {  
			var empty = new Lampa.Empty();  
			channelsPanel.append(empty.render());  
			this.activity.loader(false);  
			Lampa.Controller.collectionSet(info);  
			Navigator.move('right');  
		}  
		  
		mainContainer.append(groupsPanel);  
		mainContainer.append(channelsPanel);  
		html.append(info.append());  
		html.append(mainContainer);  
	},  
	start: function () {  
		if (Lampa.Activity.active().activity !== this.activity) return;  
		  
		var _this = this;  
		var groupsPanel = $('.' + plugin.component + '__groups');  
		  
		Lampa.Controller.add('content', {  
			toggle: function toggle() {  
				if (scroll && scroll.render()) {  
					Lampa.Controller.collectionSet(scroll.render());  
					Lampa.Controller.collectionFocus(last || false, scroll.render());  
				}  
			},  
			left: function left() {  
				var focused = $(Navigator.focused());  
				if (focused.hasClass(plugin.component + '__group-item')) {  
					Lampa.Controller.toggle('menu');  
				} else {  
					Lampa.Controller.collectionSet(groupsPanel);  
					Lampa.Controller.collectionFocus(groupsPanel.find('.selector').first(), groupsPanel);  
				}  
			},  
			right: function right() {  
				var focused = $(Navigator.focused());  
				if (focused.hasClass(plugin.component + '__group-item')) {  
					if (scroll && scroll.render()) {  
						Lampa.Controller.collectionSet(scroll.render());  
						Lampa.Controller.collectionFocus(last || scroll.render().find('.selector').first(), scroll.render());  
					}  
				} else if (Navigator.canmove('right')) {  
					Navigator.move('right');  
				}  
			},  
			up: function up() {  
				if (Navigator.canmove('up')) {  
					Navigator.move('up');  
				} else {  
					Lampa.Controller.toggle('head');  
				}  
			},  
			down: function down() {  
				if (Navigator.canmove('down')) {  
					Navigator.move('down');  
				}  
			},  
			back: function back() {  
				Lampa.Activity.backward();  
			}  
		});  
		Lampa.Controller.toggle('content');  
	},  
	pause: function () {  
		Lampa.Player.runas && Lampa.Player.runas('');  
	},  
	stop: function () {  
		Lampa.Player.runas && Lampa.Player.runas('');  
	},  
	render: function () {  
		return html;  
	},  
	destroy: function () {  
		if (groupSwitchTimeout) clearTimeout(groupSwitchTimeout);  
		if (epgInterval) clearInterval(epgInterval);  
		Lampa.Player.runas && Lampa.Player.runas('');  
		network.clear();  
		scroll.destroy();  
		if (info) info.remove();  
		layerCards = null;  
		if (layerInterval) clearInterval(layerInterval);  
		html.remove();  
		body.remove();  
		favorite = null;  
		network = null;  
		html = null;  
		body = null;  
		info = null;  
	}  
};  
  
// Обробка мов  
if (!Lampa.Lang) {  
	var lang_data = {};  
	Lampa.Lang = {  
		add: function add(data) {  
			lang_data = data;  
		},  
		translate: function translate(key) {  
			return lang_data[key] ? lang_data[key].ru : key;  
		}  
	};  
}  
var langData = {};  
function langAdd(name, values) {  
	langData[plugin.component + '_' + name] = values;  
}  
function langGet(name) {  
	var lang = Lampa.Storage.field('language');  
	if (!langData[plugin.component + '_' + name]) return name;  
	return langData[plugin.component + '_' + name][lang] || langData[plugin.component + '_' + name]['ru'] || name;  
}  
  
// Додаємо мовні рядки  
langAdd('settings_playlist_num_group', 'Налаштування плейлиста #');  
langAdd('settings_list_name', 'Назва плейлиста');  
langAdd('settings_list_name_desc', 'Введіть назву для плейлиста');  
langAdd('settings_list_url', 'URL плейлиста');  
langAdd('settings_list_url_desc0', 'Введіть URL M3U плейлиста');  
langAdd('settings_list_url_desc1', 'Введіть URL M3U плейлиста');  
langAdd('default_playlist', 'http://example.com/playlist.m3u8');  
langAdd('default_playlist_cat', 'Всі канали');  
langAdd('square_icons', 'Квадратні іконки');  
langAdd('contain_icons', 'Масштабувати іконки');  
langAdd('contain_icons_desc', 'Зберігати пропорції іконок');  
langAdd('epg_on', 'EPG');  
langAdd('epg_off', 'EPG');  
langAdd('launch_menu', 'Меню запуску');  
langAdd('max_ch_in_group', 'Каналів в групі');  
langAdd('max_ch_in_group_desc', 'Максимальна кількість каналів для відображення');  
langAdd('uid', 'UID');  
langAdd('unique_id', 'Унікальний ідентифікатор плагіна');  
langAdd('categories', 'Категорії');  
langAdd('favorites_add', 'Додати в улюблені');  
langAdd('favorites_del', 'Видалити з улюблених');  
langAdd('favorites_move_top', 'Перемістити на початок');  
langAdd('favorites_move_up', 'Перемістити вище');  
langAdd('favorites_move_down', 'Перемістити нижче');  
langAdd('favorites_move_end', 'Перемістити в кінець');  
langAdd('favorites_clear', 'Очистити улюблені');  
  
// Функції налаштувань  
function getSettings(name) {  
	return Lampa.Storage.get(plugin.component + '_' + name);  
}  
function setStorage(name, value) {  
	Lampa.Storage.set(name, value);  
}  
function getStorage(name, default_value) {  
	return Lampa.Storage.get(name, default_value);  
}  
function favID(title) {  
	return title.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');  
}  
  
function addSettings(type, param) {  
	var data = {  
		component: plugin.component,  
		type: type,  
		param: {  
			name: !param.name ? '' : param.name,  
			type: !param.values ? '' : 'select',  
			values: !param.values ? '' : param.values,  
			placeholder: !param.placeholder ? '' : param.placeholder,  
			default: (typeof param.default === 'undefined') ? '' : param.default  
		},  
		field: {  
			name: !param.title ? (!param.name ? '' : param.name) : param.title  
		}  
	}  
	if (!!param.name) data.param.name = plugin.component + '_' + param.name;  
	if (!!param.description) data.field.description = param.description;  
	if (!!param.onChange) data.onChange = param.onChange;  
	if (!!param.onRender) data.onRender = param.onRender;  
	Lampa.SettingsApi.addParam(data);  
}  
  
function configurePlaylist(i) {  
	addSettings('title', {title: langGet('settings_playlist_num_group') + (i+1)});  
	var defName = 'list ' + (i+1);  
	var activity = {  
		id: i,  
		url: '',  
		title: plugin.name,  
		groups: [],  
		currentGroup: getStorage('last_catalog' + i, langGet('default_playlist_cat')),  
		component: plugin.component,  
		page: 1  
	};  
	if (activity.currentGroup === '!!') activity.currentGroup = '';  
	  
	addSettings('input', {  
		title: langGet('settings_list_name'),  
		name: 'list_name_' + i,  
		default: i ? '' : plugin.name,  
		placeholder: i ? defName : '',  
		description: langGet('settings_list_name_desc'),  
		onChange: function (newVal) {  
			var title = !newVal ? (i ? defName : plugin.name) : newVal;  
			$('.js-' + plugin.component + '-menu' + i + '-title').text(title);  
			activity.title = title + (title === plugin.name ? '' : ' - ' + plugin.name);  
		}  
	});  
	  
	addSettings('input', {  
		title: langGet('settings_list_url'),  
		name: 'list_url_' + i,  
		default: i ? '' : langGet('default_playlist'),  
		placeholder: i ? 'http://example.com/list.m3u8' : '',  
		description: i ? (!getStorage('list_url_' + i) ? langGet('settings_list_url_desc1') : '') : langGet('settings_list_url_desc0'),  
		onChange: function (url) {  
			if (url === activity.url) return;  
			if (activity.id === curListId) {  
				catalog = {};  
				curListId = -1;  
			}  
			if (/^https?:\/\/./i.test(url)) {  
				activity.url = url;  
				$('.js-' + plugin.component + '-menu' + i).show();  
			} else {  
				activity.url = '';  
				$('.js-' + plugin.component + '-menu' + i).hide();  
			}  
		}  
	});  
  
	var name = getSettings('list_name_' + i);  
	var url = getSettings('list_url_' + i);  
	var title = (name || defName);  
	activity.title = title + (title === plugin.name ? '' : ' - ' + plugin.name);  
	  
	var menuEl = $('<li class="menu__item selector js-' + plugin.component + '-menu' + i + '">'  
		+ '<div class="menu__ico">' + plugin.icon + '</div>'  
		+ '<div class="menu__text js-' + plugin.component + '-menu' + i + '-title">'  
		+ encoder.text(title).html()  
		+ '</div>'  
		+ '</li>')  
		.hide()  
		.on('hover:enter', function(){  
			if (Lampa.Activity.active().component === plugin.component) {  
				Lampa.Activity.replace(Lampa.Arrays.clone(activity));  
			} else {  
				Lampa.Activity.push(Lampa.Arrays.clone(activity));  
			}  
		});  
		  
	if (/^https?:\/\/./i.test(url)) {  
		activity.url = url;  
		menuEl.show();  
	}  
	  
	lists.push({activity: activity, menuEl: menuEl, groups: []});  
	return !activity.url ? i + 1 : i;  
}  
  
// Реєстрація компонента та налаштувань  
Lampa.Component.add(plugin.component, pluginPage);  
Lampa.SettingsApi.addComponent(plugin);  
  
// Налаштування плагіна  
addSettings(  
	'trigger',  
	{  
		title: langGet('square_icons'),  
		name: 'square_icons',  
		default: false,  
		onChange: function(v){  
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
		onChange: function(v){  
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
		onChange: function(v){  
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
  
// Налаштування плейлистів  
for (var i=0; i <= lists.length; i++) i = configurePlaylist(i);  
  
// UID  
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
  
// Ініціалізація плагіна  
function pluginStart() {  
	if (!!window['plugin_' + plugin.component + '_ready']) {  
		console.log(plugin.name, 'plugin already start');  
		return;  
	}  
	window['plugin_' + plugin.component + '_ready'] = true;  
	var menu = $('.menu .menu__list').eq(0);  
	for (var i=0; i < lists.length; i++) menu.append(lists[i].menuEl);  
	isSNG = ['uk', 'ru', 'be'].indexOf(Lampa.Storage.field('language')) >= 0;  
	console.log(plugin.name, 'plugin start', menu.length, lists.length, isSNG);  
}  
  
console.log(plugin.name, 'plugin ready start', !!window.appready ? 'now' : 'waiting event ready');  
if (!!window.appready) pluginStart();  
else Lampa.Listener.follow('app', function(e){if (e.type === 'ready') pluginStart()})();  
  
})();  
  	
  
