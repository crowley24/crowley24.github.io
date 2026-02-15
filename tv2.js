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
  
// EPG utility object with time synchronization  
var EPGUtil = {  
    time_offset: 0,  
      
    init: function() {  
        var ts = new Date().getTime();  
        // Get accurate time from server  
        network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/api/time', (json) => {  
            var te = new Date().getTime();  
            this.time_offset = (json.time < ts || json.time > te) ? json.time - te : 0;  
        }, () => {  
            // If failed to get time, use local  
        });  
    },  
      
    time: function(channel, timeshift) {  
        timeshift = timeshift || 0;  
        var date = new Date();  
        var time = date.getTime() + this.time_offset;  
        var ofst = parseInt((localStorage.getItem('time_offset') || 'n0').replace('n', ''));  
          
        date = new Date(time + (ofst * 1000 * 60 * 60));  
          
        // Channel time offset  
        var offset = channel.Title.match(/([+|-]\d)$/);  
        if (offset) {  
            date.setHours(date.getHours() + parseInt(offset[1]));  
        }  
          
        return date.getTime() - timeshift;  
    },  
      
    position: function(list, timeshift) {  
        var tim = this.time(null, timeshift);  
        var now = list.find(p => tim > p[0] && tim < p[0] + p[1]);  
        return now ? list.indexOf(now) : list.length - 1;  
    },  
      
    timeline: function(program, timeshift) {  
        var time = this.time(null, timeshift);  
        var total = program[1];  
        var start = program[0];  
        var less = (start + total) - time;  
          
        return Math.min(100, Math.max(0, (1 - less / total) * 100));  
    }  
};  
  
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
var epgTemplate = $((  
    '<div id="' + plugin.component + '_epg" class="info layer--width">' +  
    '<div class="info__left">' +  
    '<div class="info__title js-epgChannel"></div>' +  
    '<div class="info__create js-epgNow"></div>' +  
    '</div>' +  
    '<div class="info__right">' +  
    '<div class="info__list js-epgList"></div>' +  
    '</div>' +  
    '</div>'  
));  
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
		stopRemoveChElement = true;  
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
		if (isChNum || parseInt(chNumber + '0') > cnt || chNumber.length >= 3) {  
			chTimeout = setTimeout(function () {  
				Lampa.Player.playlist.move(number - 1);  
				Lampa.Player.next();  
				chNumber = '';  
				chHelper.finish().hide().fadeOut(0);  
			}, 1000);  
		}  
	} else {  
		chNumber = prevChNumber;  
	}  
	return true;  
}  
function keydown(e) {  
	var key = e.keyCode || e.which;  
	var playlist = Lampa.PlayerPlaylist.get();  
	if (!isPluginPlaylist(playlist)) return;  
	switch (key) {  
		case 37:  
		case 61448:  
			Lampa.Player.playlist.move(Lampa.Player.playlist.position - 1);  
			Lampa.Player.next();  
			break;  
		case 39:  
		case 61449:  
			Lampa.Player.playlist.move(Lampa.Player.playlist.position + 1);  
			Lampa.Player.next();  
			break;  
		case 33:  
		case 61445:  
			Lampa.Player.playlist.move(Math.max(0, Lampa.Player.playlist.position - 9));  
			Lampa.Player.next();  
			break;  
		case 34:  
		case 61446:  
			Lampa.Player.playlist.move(Math.min(playlist.length - 1, Lampa.Player.playlist.position + 9));  
			Lampa.Player.next();  
			break;  
		case 48:  
		case 49:  
		case 50:  
		case 51:  
		case 52:  
		case 53:  
		case 54:  
		case 55:  
		case 56:  
		case 57:  
		case 61456:  
		case 61457:  
		case 61458:  
		case 61459:  
		case 61460:  
		case 61461:  
		case 61462:  
		case 61463:  
		case 61464:  
		case 61465:  
			var dig = key > 95 ? key - 96 : key - 48;  
			channelSwitch(dig, e.altKey);  
			break;  
	}  
}  
function unixtime() { return Math.floor(Date.now() / 1000); }  
function toLocaleTimeString(time) {  
	return new Date(time).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'});  
}  
function toLocaleDateString(time) {  
	return new Date(time).toLocaleDateString('ru-RU');  
}  
function prepareUrl(url, epg) {  
	if (!url) return '';  
	if (epg) {  
		url = url.replace('${start}', Math.floor(epg[0] / 60))  
			.replace('${end}', Math.floor((epg[0] + epg[1]) / 60))  
			.replace('${timestamp}', epg[0])  
			.replace('${duration}', epg[1])  
			.replace('${yesterday}', toLocaleDateString((epg[0] - 86400) * 1000))  
			.replace('${today}', toLocaleDateString(epg[0] * 1000))  
			.replace('${tomorrow}', toLocaleDateString((epg[0] + 86400) * 1000))  
			.replace('${date}', toLocaleDateString(epg[0] * 1000));  
	}  
	return url;  
}  
function catchupUrl(url, type, source) {  
	if (!url || !type) return url;  
	var offset = parseInt(source) || 0;  
	var time = unixtime() - offset * 3600;  
	var dayStart = Math.floor(time / 86400) * 86400;  
	var utc = new Date(time * 1000);  
	utc = utc.getUTCHours() * 3600 + utc.getUTCMinutes() * 60 + utc.getUTCSeconds();  
	switch (type.toLowerCase()) {  
		case 'default':  
		case 'shift':  
			return url.replace('${utc}', utc).replace('${start}', dayStart);  
		case 'xc':  
			return url.replace('${utc}', utc).replace('${start}', dayStart).replace('${offset}', offset);  
		case 'flussonic':  
			return url.replace('${start}', time).replace('${duration}', 86400).replace('${offset}', offset);  
		case 'niagara':  
			return url.replace('${start}', dayStart).replace('${utc}', utc);  
		case 'udp':  
			return url.replace('${start}', dayStart);  
		case 'hls':  
			return url.replace('${start}', time);  
		case 'fs':  
			return url.replace('${start}', time).replace('${end}', time + 3600);  
		case 'all':  
			return url.replace('${start}', dayStart).replace('${utc}', utc).replace('${offset}', offset).replace('${timestamp}', time);  
		default:  
			return url;  
	}  
}  
function parseList(text) {  
	var lines = text.split('\n');  
	var channels = [];  
	var currentGroup = defaultGroup;  
	var channel = {};  
	var reExtInf = /^#EXTINF:(-?\d+)(\s+(.*?))?,(.*?)$/i;  
	var reGroup = /^#EXTGRP:(.*)$/i;  
	var reUrl = /^(http|https|rtsp|rtmp|udp|file):\/\/.*$/i;  
	var reLogo = /tvg-logo="(.*?)"/i;  
	var reId = /tvg-id="(.*?)"/i;  
	var reName = /tvg-name="(.*?)"/i;  
	var reChNo = /tvg-chno="(.*?)"/i;  
	var reShift = /timeshift="(\d+)"/i;  
	var reCatchup = /catchup-days="(\d+)"/i;  
	var reCatchupType = /catchup-type="(.*?)"/i;  
	var reCatchupSource = /catchup-source="(.*?)"/i;  
	var reRadio = /radio="true"/i;  
	for (var i = 0; i < lines.length; i++) {  
		var line = lines[i].trim();  
		if (!line) continue;  
		if (line.match(reExtInf)) {  
			var matches = line.match(reExtInf);  
			channel = {  
				Title: matches[4],  
				Group: currentGroup,  
				Url: '',  
				'tvg-id': '',  
				'tvg-logo': '',  
				'tvg-name': '',  
				'catchup': '',  
				'catchup-type': '',  
				'catchup-source': '',  
				'timeshift': ''  
			};  
			  
			var logoMatch = line.match(reLogo);  
			if (logoMatch) channel['tvg-logo'] = logoMatch[1];  
			  
			var idMatch = line.match(reId);  
			if (idMatch) channel['tvg-id'] = idMatch[1];  
			  
			var nameMatch = line.match(reName);  
			if (nameMatch) channel['tvg-name'] = nameMatch[1];  
			  
			var catchupMatch = line.match(reCatchupType);  
			if (catchupMatch) channel['catchup-type'] = catchupMatch[1];  
			  
			var catchupSourceMatch = line.match(reCatchupSource);  
			if (catchupSourceMatch) channel['catchup-source'] = catchupSourceMatch[1];  
			  
			var shiftMatch = line.match(reShift);  
			if (shiftMatch) channel['timeshift'] = shiftMatch[1];  
		}  
		else if (line.match(reGroup)) {  
			var matches = line.match(reGroup);  
			currentGroup = matches[1] || defaultGroup;  
		}  
		else if (line.match(reUrl) && channel) {  
			channel.Url = line;  
			channels.push(channel);  
			channel = null;  
		}  
	}  
	  
	// Групуємо канали  
	var groups = {};  
	var groupList = [];  
	  
	channels.forEach(function(ch) {  
		var group = ch.Group || defaultGroup;  
		if (!groups[group]) {  
			groups[group] = {  
				title: group,  
				key: group.toLowerCase().replace(/\s+/g, '_'),  
				channels: []  
			};  
			groupList.push(groups[group]);  
		}  
		groups[group].channels.push(ch);  
	});  
	  
	return groupList;  
}  
  
function cache(key, data, expire) {  
	if (Utils.canUseDB()) {  
		return DB.rewriteData('cache', key, {  
			data: data,  
			expire: Date.now() + (expire || 3600000)  
		});  
	} else {  
		return new Promise(function(resolve) {  
			Lampa.Storage.set('iptv_cache_' + key, {  
				data: data,  
				expire: Date.now() + (expire || 3600000)  
			});  
			resolve();  
		});  
	}  
}  
  
function getCache(key) {  
	if (Utils.canUseDB()) {  
		return DB.getDataAnyCase('cache', key).then(function(result) {  
			if (result && result.expire > Date.now()) {  
				return result.data;  
			}  
			return null;  
		});  
	} else {  
		return new Promise(function(resolve) {  
			var cached = Lampa.Storage.get('iptv_cache_' + key, null);  
			if (cached && cached.expire > Date.now()) {  
				resolve(cached.data);  
			} else {  
				resolve(null);  
			}  
		});  
	}  
}  
  
function networkSilentSessCache(url, success, error) {  
	var cacheKey = 'sess_' + Lampa.Utils.hash(url);  
	  
	getCache(cacheKey).then(function(cached) {  
		if (cached) {  
			success(cached);  
		} else {  
			network.silent(url, function(data) {  
				cache(cacheKey, data, 300000).then(function() {  
					success(data);  
				});  
			}, error || function() {  
				success([]);  
			});  
		}  
	});  
}  
  
function getStorage(key, def) {  
	if (Utils.canUseDB()) {  
		return DB.getDataAnyCase('storage', key).then(function(value) {  
			return value !== undefined ? value : def;  
		});  
	} else {  
		return Promise.resolve(Lampa.Storage.get('iptv_' + key, def));  
	}  
}  
  
function setStorage(key, value) {  
	if (Utils.canUseDB()) {  
		return DB.rewriteData('storage', key, value);  
	} else {  
		return Promise.resolve(Lampa.Storage.set('iptv_' + key, value));  
	}  
}  
  
function getSettings(key) {  
	return Lampa.Storage.field('iptv_' + key);  
}  
  
function addSettings(type, params) {  
	Lampa.SettingsApi.addParam({  
		component: plugin.component,  
		param: Object.assign({  
			type: type  
		}, params),  
		field: {  
			name: params.title  
		}  
	});  
}  
  
function langGet(key) {  
	var langKey = plugin.component + '_' + key;  
	var lang = Lampa.Lang.translate(langKey);  
	return lang !== langKey ? lang : key;  
}  
  
function favID(title) {  
	return title.toLowerCase().replace(/[^a-zа-яё0-9]/g, '');  
}  
  
function bulkWrapper(func, bulk) {  
	var bulkCnt = 1, timeout = 1, queueEndCallback, queueStepCallback, emptyFn = function(){};  
	if (typeof bulk === 'object') {  
		timeout = bulk.timeout || timeout;  
		queueStepCallback = bulk.onBulk || emptyFn;  
		queueEndCallback = bulk.onEnd || emptyFn;  
		bulkCnt = bulk.bulk || bulkCnt;  
	} else if (typeof bulk === 'number') {  
		bulkCnt = bulk;  
		if (typeof arguments[2] === "number") timeout = arguments[2];  
	} else if (typeof bulk === 'function') {  
		queueStepCallback = bulk;  
		if (typeof arguments[2] === "number") bulkCnt = arguments[2];  
		if (typeof arguments[3] === "number") timeout = arguments[3];  
	}  
	if (!bulkCnt || bulkCnt < 1) bulkCnt = 1;  
	if (typeof queueEndCallback !== 'function') queueEndCallback = emptyFn;  
	if (typeof queueStepCallback !== 'function') queueStepCallback = emptyFn;  
	var context = this;  
	var queue = [];  
	var interval;  
	var cnt = 0;  
	var runner = function() {  
		if (!!queue.length && !interval) {  
			interval = setInterval(  
				function() {  
					var i = 0;  
					while (queue.length && ++i <= bulkCnt) func.apply(context, queue.shift());  
					i = queue.length ? i : i-1;  
					cnt += i;  
					queueStepCallback.apply(context, [i, cnt, queue.length])  
					if (!queue.length) {  
						clearInterval(interval);  
						interval = null;  
						queueEndCallback.apply(context, [i, cnt, queue.length]);  
					}  
				},  
				timeout || 0  
			);  
		}  
	}  
	return function() {  
		queue.push(arguments);  
		runner();  
	}  
}  
  
// Локалізація  
langAdd('settings_list_name', {  
	ru: 'Название списка',  
	uk: 'Назва списку',  
	be: 'Назва спісу',  
	en: 'List name'  
});  
  
langAdd('settings_list_url', {  
	ru: 'URL плейлиста',  
	uk: 'URL плейлиста',  
	be: 'URL плейліста',  
	en: 'Playlist URL'  
});  
  
langAdd('settings_list_name_desc', {  
	ru: 'Введите название для плейлиста',  
	uk: 'Введіть назву для плейлиста',  
	be: 'Увядзіце назву для плейліста',  
	en: 'Enter playlist name'  
});  
  
langAdd('settings_list_url_desc0', {  
	ru: 'Введите URL M3U плейлиста',  
	uk: 'Введіть URL M3U плейлиста',  
	be: 'Увядзіце URL M3U плейліста',  
	en: 'Enter M3U playlist URL'  
});  
  
langAdd('settings_list_url_desc1', {  
	ru: 'Оставьте пустым для использования списка по умолчанию',  
	uk: 'Залиште порожнім для використання списку за замовчуванням',  
	be: 'Пакіньце пустым для выкарыстання спісу па змаўчанні',  
	en: 'Leave empty to use default list'  
});  
  
langAdd('default_playlist', {  
	ru: 'http://example.com/playlist.m3u',  
	uk: 'http://example.com/playlist.m3u',  
	be: 'http://example.com/playlist.m3u',  
	en: 'http://example.com/playlist.m3u'  
});  
  
langAdd('square_icons', {  
	ru: 'Квадратные иконки',  
	uk: 'Квадратні іконки',  
	be: 'Квадратныя іконкі',  
	en: 'Square icons'  
});  
  
langAdd('contain_icons', {  
	ru: 'Вписывать иконки',  
	uk: 'Вписувати іконки',  
	be: 'Упісваць іконкі',  
	en: 'Contain icons'  
});  
  
langAdd('contain_icons_desc', {  
	ru: 'Иконки будут полностью видны в карточке',  
	uk: 'Іконки будуть повністю видимі в картці',  
	be: 'Іконкі будуць поўнасцю бачныя ў картцы',  
	en: 'Icons will be fully visible in the card'  
});  
  
langAdd('epg_on', {  
	ru: 'Показать EPG',  
	uk: 'Показати EPG',  
	be: 'Паказаць EPG',  
	en: 'Show EPG'  
});  
  
langAdd('epg_off', {  
	ru: 'Скрыть EPG',  
	uk: 'Сховати EPG',  
	be: 'Схаваць EPG',  
	en: 'Hide EPG'  
});  
  
langAdd('launch_menu', {  
	ru: 'Меню запуска',  
	uk: 'Меню запуску',  
	be: 'Меню запуску',  
	en: 'Launch menu'  
});  
  
langAdd('max_ch_in_group', {  
	ru: 'Каналов в группе',  
	uk: 'Каналів в групі',  
	be: 'Каналаў у групе',  
	en: 'Channels in group'  
});  
  
langAdd('max_ch_in_group_desc', {  
	ru: 'Разбивать большие группы на страницы',  
	uk: 'Розбивати великі групи на сторінки',  
	be: 'Разбіваць вялікія групы на старонкі',  
	en: 'Split large groups into pages'  
});  
  
langAdd('favorites_add', {  
	ru: 'Добавить в избранное',  
	uk: 'Додати в обране',  
	be: 'Дадаць у абранае',  
	en: 'Add to favorites'  
});  
  
langAdd('favorites_del', {  
	ru: 'Удалить из избранного',  
	uk: 'Видалити з обраного',  
	be: 'Выдаліць з абранага',  
	en: 'Remove from favorites'  
});  
  
langAdd('favorites_move_top', {  
	ru: 'Переместить в начало',  
	uk: 'Перемістити на початок',  
	be: 'Перамясціць у пачатак',  
	en: 'Move to top'  
});  
  
langAdd('favorites_move_up', {  
	ru: 'Переместить выше',  
	uk: 'Перемістити вище',  
	be: 'Перамясціць вышэй',  
	en: 'Move up'  
});  
  
langAdd('favorites_move_down', {  
	ru: 'Переместить ниже',  
	uk: 'Перемістити нижче',  
	be: 'Перамясціць ніжэй',  
	en: 'Move down'  
});  
  
langAdd('favorites_move_end', {  
	ru: 'Переместить в конец',  
	uk: 'Перемістити в кінець',  
	be: 'Перамясціць у канец',  
	en: 'Move to end'  
});  
  
langAdd('favorites_clear', {  
	ru: 'Очистить избранное',  
	uk: 'Очистити обране',  
	be: 'Ачысціць абранае',  
	en: 'Clear favorites'  
});  
  
langAdd('uid', {  
	ru: 'Уникальный ID',  
	uk: 'Унікальний ID',  
	be: 'Унікальны ID',  
	en: 'Unique ID'  
});  
  
langAdd('unique_id', {  
	ru: 'Используется для идентификации устройства',  
	uk: 'Використовується для ідентифікації пристрою',  
	be: 'Выкарыстоўваецца для ідэнтыфікацыі прылады',  
	en: 'Used for device identification'  
});  
  
// Ініціалізація мовних даних  
if (Lampa.Lang) {  
	var langData = {};  
	for (var key in langData) {  
		Lampa.Lang.add(key, langData[key]);  
	}  
}  
  
// Реєстрація компонента  
Lampa.Component.add(plugin.component, pluginPage);  
  
// Додавання налаштувань  
Lampa.SettingsApi.addComponent(plugin);  
  
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
		default: false,  
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
  
// Конфігурація плейлистів  
for (var i=0; i <= lists.length; i++) i = configurePlaylist(i);  
  
// Генерація UID  
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
  
// Запуск плагіна  
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
else Lampa.Listener.follow('app', function(e){if (e.type === 'ready') pluginStart()});  
  
})();
