(function () {  
'use strict';  
var plugin = {  
	component: 'my_iptv',  
	icon: "<svg height=\"244\" viewBox=\"0 0 260 244\" xmlns=\"http://www.w3.org/2000/svg\" style=\"fill-rule:evenodd;\" fill=\"currentColor\"><path d=\"M259.5 47.5v114c-1.709 14.556-9.375 24.723-23 30.5a2934.377 2934.377 0 0 1-107 1.5c-35.704.15-71.37-.35-107-1.5-13.625-5.777-21.291-15.944-23-30.5v-115c1.943-15.785 10.61-25.951 26-30.5a10815.71 10815.71 0 0 1 208 0c15.857 4.68 24.523 15.18 26 31.5zm-230-13a4963.403 4963.403 0 0 0 199 0c5.628 1.128 9.128 4.462 10.5 10 .667 40 .667 80 0 120-1.285 5.618-4.785 8.785-10.5 9.5-66 .667-132 .667-198 0-5.715-.715-9.215-3.882-10.5-9.5-.667-40-.667-80 0-120 1.35-5.18 4.517-8.514 9.5-10z\"/><path d=\"M70.5 71.5c17.07-.457 34.07.043 51 1.5 5.44 5.442 5.107 10.442-1 15-5.991.5-11.991.666-18 .5.167 14.337 0 28.671-.5 43-3.013 5.035-7.18 6.202-12.5 3.5a11.529 11.529 0 0 1-3.5-4.5 882.407 882.407 0 0 1-.5-42c-5.676.166-11.343 0-17-.5-4.569-2.541-6.069-6.375-4.5-11.5 1.805-2.326 3.972-3.992 6.5-5zM137.5 73.5c4.409-.882 7.909.452 10.5 4a321.009 321.009 0 0 0 16 30 322.123 322.123 0 0 0 16-30c2.602-3.712 6.102-4.879 10.5-3.5 5.148 3.334 6.314 7.834 3.5 13.5a1306.032 1306.032 0 0 0-22 43c-5.381 6.652-10.715 6.652-16 0a1424.647 1424.647 0 0 0-23-45c-1.691-5.369-.191-9.369 4.5-12zM57.5 207.5h144c7.788 2.242 10.288 7.242 7.5 15a11.532 11.532 0 0 1-4.5 3.5c-50 .667-100 .667-150 0-6.163-3.463-7.496-8.297-4-14.5 2.025-2.064 4.358-3.398 7-4z\"/></svg>",  
	name: 'ipTV'  
};  
  
// Основні змінні  
var catalog = {};  
var EPG = {};  
var epgInterval;  
var curListId = -1;  
var defaultGroup = 'Інші';  
var currentGroup = '';  
  
// Шаблон EPG з оригінального коду  
var epgTemplate = $(('<div id="PLUGIN_epg">\n' +  
	'<h2 class="js-epgChannel"></h2>\n' +  
	'<div class="PLUGIN-details__program-body js-epgNow">\n' +  
	'   <div class="PLUGIN-details__program-title">Зараз</div>\n' +  
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
	'</div>' +  
	'<div class="PLUGIN-details__program-body js-epgAfter">\n' +  
	'   <div class="PLUGIN-details__program-title">Далі</div>\n' +  
	'   <div class="PLUGIN-details__program-list js-epgList">' +  
	'   </div>\n' +  
	'</div>' +  
	'</div>').replace(/PLUGIN/g, plugin.component)  
);  
  
var epgItemTeplate = $((  
	'<div class="PLUGIN-program selector">\n' +  
	'   <div class="PLUGIN-program__time js-epgTime">XX:XX</div>\n' +  
	'   <div class="PLUGIN-program__body">\n' +  
	'	   <div class="PLUGIN-program__title js-epgTitle"> </div>\n' +  
	'   </div>\n' +  
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
  
var encoder = $('<div/>');  
  
function unixtime() {  
	return Math.floor((new Date().getTime())/1000);  
}  
  
function toLocaleTimeString(time) {  
	var date = new Date();  
	time = time || date.getTime();  
	date = new Date(time);  
	return ('0' + date.getHours()).substr(-2) + ':' + ('0' + date.getMinutes()).substr(-2);  
}  
  
function prepareUrl(url, epg) {  
	return url;  
}  
  
function pluginPage(object) {  
	if (object.id !== curListId) {  
		catalog = {};  
		curListId = object.id;  
	}  
	  
	EPG = {};  
	var epgIdCurrent = '';  
	var network = new Lampa.Reguest();  
	var scroll = new Lampa.Scroll({  
		mask: true,  
		over: true,  
		step: 250  
	});  
	  
	var html = $('<div></div>');  
	var body = $('<div class="' + plugin.component + ' category-full"></div>');  
	var info;  
	var last;  
	  
	// Створюємо триколонковий layout  
	var layout = $('<div class="iptv-layout" style="display: flex; height: 100%;"></div>');  
	var groupsPanel = $('<div class="groups-panel" style="width: 25%; background: rgba(0,0,0,0.3); padding: 1em; overflow-y: auto;"></div>');  
	var channelsPanel = $('<div class="channels-panel" style="width: 45%; padding: 1em; overflow-y: auto;"></div>');  
	var epgPanel = $('<div class="epg-panel" style="width: 30%; background: rgba(0,0,0,0.2); padding: 1em; overflow-y: auto;"></div>');  
	  
	layout.append(groupsPanel).append(channelsPanel).append(epgPanel);  
	  
	if (epgInterval) clearInterval(epgInterval);  
	epgInterval = setInterval(function() {  
		for (var epgId in EPG) {  
			epgRender(epgId);  
		}  
	}, 10000);  
  
	this.create = function () {  
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
		} else if(!object.url) {  
			emptyResult();  
			return;  
		} else {  
			var listUrl = prepareUrl(object.url);  
			console.log('Loading playlist from:', listUrl);  
			  
			network.native(  
				listUrl,  
				function (data) {  
					console.log('Direct load successful, data length:', data ? data.length : 0);  
					parseList.call(_this, data);  
				},  
				function () {  
					console.log('Direct load failed, trying CORS proxy...');  
					var proxyUrl = 'https://cors-anywhere.herokuapp.com/' + listUrl;  
					network.silent(  
						proxyUrl,  
						function (data) {  
							console.log('CORS proxy load successful, data length:', data ? data.length : 0);  
							parseList.call(_this, data);  
						},  
						function () {  
							console.log('CORS proxy also failed');  
							emptyResult();  
						},  
						false,  
						{dataType: 'text'}  
					);  
				},  
				false,  
				{dataType: 'text'}  
			)  
		}  
		return this.render();  
	};  
	  
	function parseList(data) {  
    console.log('=== M3U Parse Debug ===');  
    console.log('Raw data type:', typeof data);  
    console.log('Raw data length:', data ? data.length : 'null');  
      
    if (!data || typeof data != 'string') {  
        console.log('ERROR: No valid data received');  
        var empty = new Lampa.Empty();  
        html.append(empty.render());  
        return;  
    }  
      
    if (data.substr(0, 7).toUpperCase() !== "#EXTM3U") {  
        console.log('ERROR: Not a valid M3U file');  
        var empty = new Lampa.Empty();  
        html.append(empty.render());  
        return;  
    }  
      
    console.log('M3U header found, parsing...');  
      
    catalog = {};  
    var l = data.split(/\r?\n/);  
    var cnt = 0, i = 1, chNum = 0, m, defGroup = defaultGroup;  
      
    while (i < l.length) {  
        chNum = cnt + 1;  
        var channel = {  
            ChNum: chNum,  
            Title: "Канал " + chNum,  
            Url: '',  
            Group: ''  
        };  
          
        for (; cnt < chNum && i < l.length; i++) {  
            if (!!(m = l[i].match(/^#EXTGRP:\s*(.+?)\s*$/i)) && m[1].trim() !== '') {  
                defGroup = m[1].trim();  
            } else if (!!(m = l[i].match(/^#EXTINF:\s*-?\d+(\s+\S.*?\s*)?,(.+)$/i))) {  
                channel.Title = m[2].trim();  
            } else if (!!(m = l[i].match(/^(https?):\/\/(.+)$/i))) {  
                channel.Url = m[0].trim();  
                channel.Group = defGroup + "";  
                cnt++;  
            }  
        }  
          
        if (!!channel.Url) {  
            if (!catalog[channel.Group]) {  
                catalog[channel.Group] = {  
                    title: channel.Group,  
                    channels: []  
                };  
            }  
            catalog[channel.Group].channels.push(channel);  
        }  
    }  
      
    console.log('Parsed', Object.keys(catalog).length, 'groups');  
      
    // Викликаємо build з правильним контекстом  
    if (this && typeof this.build === 'function') {  
        this.build(catalog);  
    } else {  
        console.error('build function not available in context');  
    }  
}  
	  
	function epgRender(epgId) {  
		var epg = (EPG[epgId] || [0, 0, []])[2];  
		var card = body.find('[data-epg-id="' + epgId + '"]');  
		  
		if (!card.length) return;  
		  
		var epgEl = card.find('.card__age');  
		if (!epgEl.length) return;  
		  
		if (epg && epg.length) {  
			var e = epg[0];  
			var t = Math.floor(unixtime() / 60);  
			  
			if (t >= e[0] && t < (e[0] + e[1])) {  
				var p = Math.round((unixtime() - e[0] * 60) * 100 / (e[1] * 60 || 60));  
				epgEl.find('.js-epgTitle').text(e[2]);  
				epgEl.find('.js-epgProgress').css('width', p + '%');  
				epgEl.show();  
			}  
		}  
	}  
	  
	this.append = function (data) {  
		var _this2 = this;  
		  
		// Очищуємо панелі  
		groupsPanel.empty();  
		channelsPanel.empty();  
		epgPanel.empty();  
		  
		// Відображаємо групи  
		var groupIndex = 0;  
		for (var groupName in catalog) {  
			var groupItem = $('<div class="group-item selector" style="padding: 0.8em; margin: 0.3em 0; background: rgba(255,255,255,0.1); border-radius: 0.3em; cursor: pointer;' +   
				(groupName === currentGroup ? 'background: rgba(255,255,255,0.3);' : '') + '">' +  
				'<div style="font-weight: bold;">' + catalog[groupName].title + '</div>' +  
				'<div style="font-size: 0.9em; opacity: 0.7;">' + catalog[groupName].channels.length + ' каналів</div>' +  
				'</div>');  
			  
			groupItem.on('hover:enter', function(group) {  
				return function() {  
					currentGroup = group;  
					_this2.build(catalog);  
				};  
			}(groupName));  
			  
			groupsPanel.append(groupItem);  
		}  
		  
		// Вибираємо поточну групу або першу  
		if (!currentGroup || !catalog[currentGroup]) {  
			currentGroup = Object.keys(catalog)[0];  
		}  
		  
		var currentChannels = catalog[currentGroup].channels;  
		  
		// Відображаємо канали як список  
		currentChannels.forEach(function (channel, index) {  
			var channelItem = $('<div class="channel-item selector" style="display: flex; align-items: center; padding: 0.8em; margin: 0.3em 0; background: rgba(255,255,255,0.1); border-radius: 0.3em; cursor: pointer;" data-channel-index="' + index + '">' +  
				'<div style="width: 3em; text-align: center; font-weight: bold; opacity: 0.7;">' + channel.ChNum + '</div>' +  
				'<div style="flex: 1; margin-left: 1em;">' + channel.Title + '</div>' +  
				'<div class="card__age" style="margin-left: 1em; display: none;">' +  
				'<div class="card__epg-progress js-epgProgress" style="height: 3px; background: #4682B4; border-radius: 2px; margin-bottom: 2px;"></div>' +  
				'<div class="card__epg-title js-epgTitle" style="font-size: 0.8em; color: #ccc;"></div>' +  
				'</div>' +  
				'</div>');  
			  
			// Додаємо EPG дані до каналу  
			if (channel['epgId']) {  
				channelItem.attr('data-epg-id', channel['epgId']);  
			}  
			  
			channelItem.on('hover:focus', function() {  
				last = channelItem[0];  
				scroll.update(channelItem, true);  
				  
				// Оновлюємо EPG панель  
				epgPanel.empty();  
				epgPanel.append('<h3 style="margin: 0 0 1em 0;">' + channel.Title + '</h3>');  
				  
				if (channel['epgId'] && EPG[channel['epgId']]) {  
					var epg = EPG[channel['epgId']][2];  
					if (epg && epg.length) {  
						var nowDiv = $('<div style="margin-bottom: 1.5em;"><h4 style="color: #4682B4; margin-bottom: 0.5em;">Зараз</h4></div>');  
						var afterDiv = $('<div><h4 style="color: #666; margin-bottom: 0.5em;">Далі</h4></div>');  
						  
						epg.forEach(function(program, index) {  
							var programDiv = $('<div style="padding: 0.5em; margin: 0.3em 0; background: rgba(255,255,255,0.05); border-radius: 0.3em;">' +  
								'<div style="font-weight: bold; margin-bottom: 0.3em;">' + toLocaleTimeString(program[0] * 60) + '</div>' +  
								'<div>' + program[2] + '</div>' +  
								'</div>');  
							  
							if (index === 0) {  
								nowDiv.append(programDiv);  
							} else if (index < 4) {  
								afterDiv.append(programDiv);  
							}  
						});  
						  
						epgPanel.append(nowDiv).append(afterDiv);  
					}  
				} else {  
					epgPanel.append('<div style="opacity: 0.6;">Телепрограма недоступна</div>');  
				}  
			}).on('hover:enter', function(){  
				var video = {  
					title: channel.Title,  
					url: prepareUrl(channel.Url),  
					plugin: plugin.component,  
					iptv: true,  
					tv: true  
				};  
				  
				var playlist = [];  
				currentChannels.forEach(function (elem, index) {  
					playlist.push({  
						title: (index + 1) + '. ' + elem.Title,  
						url: prepareUrl(elem.Url),  
						plugin: plugin.component,  
						iptv: true,  
						tv: true  
					});  
				});  
				  
				Lampa.Player.play(video);  
				Lampa.Player.playlist(playlist);  
			});  
			  
			channelsPanel.append(channelItem);  
		});  
		  
		// Додаємо layout до body  
		body.empty().append(layout);  
		  
		// Оновлюємо EPG для видимих каналів  
		channelsPanel.find('[data-epg-id]').each(function() {  
			var epgId = $(this).attr('data-epg-id');  
			if (epgId) epgRender(epgId);  
		});  
		  
		_this2.activity.loader(false);  
		_this2.activity.toggle();  
	};  
	  
	this.start = function () {  
		if (Lampa.Activity.active().activity !== this.activity) return;  
		var _this = this;  
		Lampa.Controller.add('content', {  
			toggle: function toggle() {  
				Lampa.Controller.collectionSet(layout);  
				Lampa.Controller.collectionFocus(last || false, layout);  
			},  
			left: function left() {  
				if (Navigator.canmove('left')) {  
					Navigator.move('left');  
				} else {  
					Lampa.Controller.toggle('menu');  
				}  
			},  
			right: function right() {  
				if (Navigator.canmove('right')) {  
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
	};  
	  
	this.pause = function () {};  
	this.stop = function () {};  
	  
	this.render = function () {  
		return html;  
	};  
	  
	this.destroy = function () {  
		network.clear();  
		scroll.destroy();  
		if (info) info.remove();  
		if (epgInterval) clearInterval(epgInterval);  
		html.remove();  
		body.remove();  
		network = null;  
		html = null;  
		body = null;  
		info = null;  
	};  
}  
  
// Спрощена система мов  
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
	return Lampa.Lang.translate(plugin.component + '_' + name);  
}  
  
// Базові переклади  
langAdd('playlist_url', {  
	ru: 'URL плейлиста',  
	uk: 'URL плейлиста',  
	en: 'Playlist URL'  
});  
  
langAdd('playlist_url_desc', {  
	ru: 'Введите URL M3U плейлиста',  
	uk: 'Введіть URL M3U плейлиста',  
	en: 'Enter M3U playlist URL'  
});  
  
langAdd('epg_toggle', {  
	ru: 'Телепрограмма',  
	uk: 'Телепрограма',  
	en: 'TV Guide'  
});  
  
Lampa.Lang.add(langData);  
  
// Функції роботи зі сховищем  
function getStorage(name, defaultValue) {  
	return Lampa.Storage.get(plugin.component + '_' + name, defaultValue);  
}  
function setStorage(name, val, noListen) {  
	return Lampa.Storage.set(plugin.component + '_' + name, val, noListen);  
}  
function getSettings(name) {  
	return Lampa.Storage.field(plugin.component + '_' + name);  
}  
  
// Додавання налаштувань  
function addSettings(type, param) {  
	var data = {  
		component: plugin.component,  
		param: {  
			name: plugin.component + '_' + param.name,  
			type: type,  
			values: !param.values ? '' : param.values,  
			placeholder: !param.placeholder ? '' : param.placeholder,  
			default: (typeof param.default === 'undefined') ? '' : param.default  
		},  
		field: {  
			name: !param.title ? (!param.name ? '' : param.name) : param.title  
		}  
	};  
	if (!!param.name) data.param.name = plugin.component + '_' + param.name;  
	if (!!param.description) data.field.description = param.description;  
	if (!!param.onChange) data.onChange = param.onChange;  
	Lampa.SettingsApi.addParam(data);  
}  
  
// Реєстрація компонента  
Lampa.Component.add(plugin.component, pluginPage);  
  
// Додавання налаштувань плагіна  
Lampa.SettingsApi.addComponent(plugin);  
  
// Налаштування URL плейлиста  
addSettings('input', {  
	title: langGet('playlist_url'),  
	name: 'playlist_url',  
	default: 'https://iptv-org.github.io/iptv/countries/ua.m3u8',  
	placeholder: 'http://example.com/playlist.m3u8',  
	description: langGet('playlist_url_desc')  
});  
  
// Налаштування EPG  
addSettings('trigger', {  
	title: langGet('epg_toggle'),  
	name: 'epg',  
	default: true,  
	onChange: function(v){  
		// EPG завжди увімкнено в цій версії  
	}  
});  
  
// Створення активності для плагіна  
var activity = {  
	id: 0,  
	url: getSettings('playlist_url') || 'https://iptv-org.github.io/iptv/countries/ua.m3u8',  
	title: plugin.name,  
	groups: [],  
	currentGroup: '',  
	component: plugin.component,  
	page: 1  
};  
  
// Створення меню  
var menuEl = $('<li class="menu__item selector js-' + plugin.component + '-menu">'  
	+ '<div class="menu__ico">' + plugin.icon + '</div>'  
	+ '<div class="menu__text">' + plugin.name + '</div>'  
	+ '</li>')  
	.on('hover:enter', function(){  
		if (Lampa.Activity.active().component === plugin.component) {  
			Lampa.Activity.replace(Lampa.Arrays.clone(activity));  
		} else {  
			Lampa.Activity.push(Lampa.Arrays.clone(activity));  
		}  
	});  
  
// Функція запуску плагіна  
function pluginStart() {  
	if (!!window['plugin_' + plugin.component + '_ready']) {  
		console.log(plugin.name, 'plugin already start');  
		return;  
	}  
	window['plugin_' + plugin.component + '_ready'] = true;  
	var menu = $('.menu .menu__list').eq(0);  
	if (menu.length) {  
		menu.append(menuEl);  
	}  
	console.log(plugin.name, 'plugin start');  
}  
  
// Запуск плагіна  
console.log(plugin.name, 'plugin ready start', !!window.appready ? 'now' : 'waiting event ready');  
if (!!window.appready) {  
	pluginStart();  
} else {  
	Lampa.Listener.follow('app', function(e){  
		if (e.type === 'ready') {  
			pluginStart();  
		}  
	});  
}  
  
// Оновлення URL при зміні налаштувань  
Lampa.Storage.listener.follow('change', function(e){  
	if (e.name === plugin.component + '_playlist_url') {  
		activity.url = e.value;  
		if (Lampa.Activity.active().component === plugin.component) {  
			Lampa.Activity.replace(Lampa.Arrays.clone(activity));  
		}  
	}  
});  
  
})();
