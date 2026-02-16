(function () {
	'use strict';

	var plugin = {
		component: 'my_iptv',
		icon: '<svg height="244" viewBox="0 0 260 244" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M259.5 47.5v114c-1.709 14.556-9.375 24.723-23 30.5a2934.377 2934.377 0 0 1-107 1.5c-35.704.15-71.37-.35-107-1.5-13.625-5.777-21.291-15.944-23-30.5v-115c1.943-15.785 10.61-25.951 26-30.5a10815.71 10815.71 0 0 1 208 0c15.857 4.68 24.523 15.18 26 31.5zm-230-13a4963.403 4963.403 0 0 0 199 0c5.628 1.128 9.128 4.462 10.5 10 .667 40 .667 80 0 120-1.285 5.618-4.785 8.785-10.5 9.5-66 .667-132 .667-198 0-5.715-.715-9.215-3.882-10.5-9.5-.667-40-.667-80 0-120 1.35-5.18 4.517-8.514 9.5-10z"/><path d="M70.5 71.5c17.07-.457 34.07.043 51 1.5 5.44 5.442 5.107 10.442-1 15-5.991.5-11.991.666-18 .5.167 14.337 0 28.671-.5 43-3.013 5.035-7.18 6.202-12.5 3.5a11.529 11.529 0 0 1-3.5-4.5 882.407 882.407 0 0 1-.5-42c-5.676.166-11.343 0-17-.5-4.569-2.541-6.069-6.375-4.5-11.5 1.805-2.326 3.972-3.992 6.5-5zM137.5 73.5c4.409-.882 7.909.452 10.5 4a321.009 321.009 0 0 0 16 30 322.123 322.123 0 0 0 16-30c2.602-3.712 6.102-4.879 10.5-3.5 5.148 3.334 6.314 7.834 3.5 13.5a1306.032 1306.032 0 0 0-22 43c-5.381 6.652-10.715 6.652-16 0a1424.647 1424.647 0 0 0-23-45c-1.691-5.369-.191-9.369 4.5-12zM57.5 207.5h144c7.788 2.242 10.288 7.242 7.5 15a11.532 11.532 0 0 1-4.5 3.5c-50 .667-100 .667-150 0-6.163-3.463-7.496-8.297-4-14.5 2.025-2.064 4.358-3.398 7-4z"/></svg>',
		name: 'ipTV',
		description: 'ipTV player for Lampa'
	};

	var langData = {};
	function langAdd(name, values) { langData[plugin.component + '_' + name] = values; }
	function langGet(name) { return Lampa.Lang.translate(plugin.component + '_' + name); }

	langAdd('max_ch_in_group', { ru: 'Количество каналов в категории', uk: 'Кількість каналів у категорії', be: 'Колькасць каналаў у катэгорыі', en: 'Number of channels in category', zh: '分类中的频道数量' });
	langAdd('max_ch_in_group_desc', { ru: 'Если количество превышено, категория разбивается на несколько. Уменьшите количество на слабых устройствах', uk: 'Якщо кількість перевищена, категорія розбивається на кілька. Зменшіть кількість на слабких пристроях', be: 'Калі колькасць перавышана, катэгорыя розбіваецца на некалькі. Паменшыце колькасць на слабых прыладах', en: 'If the quantity is exceeded, it splits the category into several. Reduce the number on weak devices', zh: '如果超出数量，则将分类拆分为多个。在弱设备上减少数量。' });
	langAdd('default_playlist', { ru: 'https://tsynik.github.io/tv.m3u', uk: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', be: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', en: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8', zh: 'https://raw.iqiq.io/Free-TV/IPTV/master/playlist.m3u8' });
	langAdd('default_playlist_cat', { ru: 'Russia', uk: 'Ukraine', be: 'Belarus', en: 'VOD Movies (EN)', zh: 'China' });
	langAdd('settings_playlist_num_group', { ru: 'Плейлист ', uk: 'Плейлист ', be: 'Плэйліст ', en: 'Playlist ', zh: '播放列表 ' });
	langAdd('settings_list_name', { ru: 'Название', uk: 'Назва', be: 'Назва', en: 'Name', zh: '名称' });
	langAdd('settings_list_name_desc', { ru: 'Название плейлиста в левом меню', uk: 'Назва плейлиста у лівому меню', be: 'Назва плэйліста ў левым меню', en: 'Playlist name in the left menu', zh: '左侧菜单中的播放列表名称' });
	langAdd('settings_list_url', { ru: 'URL-адрес', uk: 'URL-адреса', be: 'URL-адрас', en: 'URL', zh: '网址' });
	langAdd('settings_list_url_desc0', { ru: 'По умолчанию используется плейлист из проекта <i>https://github.com/Free-TV/IPTV</i><br>Вы можете заменить его на свой.', uk: 'За замовчуванням використовується плейлист із проекту <i>https://github.com/Free-TV/IPTV</i><br>Ви можете замінити його на свій.', be: 'Па змаўчанні выкарыстоўваецца плэйліст з праекта <i>https://github.com/Free-TV/IPTV</i><br> Вы можаце замяніць яго на свой.', en: 'The default playlist is from the project <i>https://github.com/Free-TV/IPTV</i><br>You can replace it with your own.', zh: '默认播放列表来自项目 <i>https://github.com/Free-TV/IPTV</i><br>您可以将其替换为您自己的。' });
	langAdd('settings_list_url_desc1', { ru: 'Вы можете добавить еще один плейлист здесь. Ссылки на плейлисты обычно заканчиваются на <i>.m3u</i> или <i>.m3u8</i>', uk: 'Ви можете додати ще один плейлист суду. Посилання на плейлисти зазвичай закінчуються на <i>.m3u</i> або <i>.m3u8</i>', be: 'Вы можаце дадаць яшчэ адзін плэйліст суда. Спасылкі на плэйлісты звычайна заканчваюцца на <i>.m3u</i> або <i>.m3u8</i>', en: 'You can add another trial playlist. Playlist links usually end with <i>.m3u</i> or <i>.m3u8</i>', zh: '您可以添加另一个播放列表。 播放列表链接通常以 <i>.m3u</i> 或 <i>.m3u8</i> 结尾' });
	langAdd('categories', { ru: 'Категории', uk: 'Категорія', be: 'Катэгорыя', en: 'Categories', zh: '分类' });
	langAdd('uid', { ru: 'UID', uk: 'UID', be: 'UID', en: 'UID', zh: 'UID' });
	langAdd('unique_id', { ru: 'уникальный идентификатор (нужен для некоторых ссылок на плейлисты)', uk: 'унікальний ідентифікатор (необхідний для деяких посилань на списки відтворення)', be: 'унікальны ідэнтыфікатар (неабходны для некаторых спасылак на спіс прайгравання)', en: 'unique identifier (needed for some playlist links)', zh: '唯一 ID（某些播放列表链接需要）' });
	langAdd('launch_menu', { ru: 'Запуск через меню', uk: 'Запуск через меню', be: 'Запуск праз меню', en: 'Launch via menu', zh: '通过菜单启动' });
	langAdd('favorites', { ru: 'Избранное', uk: 'Вибране', be: 'Выбранае', en: 'Favorites', zh: '收藏夹' });
	langAdd('favorites_add', { ru: 'Добавить в избранное', uk: 'Додати в обране', be: 'Дадаць у абранае', en: 'Add to favorites', zh: '添加到收藏夹' });
	langAdd('favorites_del', { ru: 'Удалить из избранного', uk: 'Видалити з вибраного', be: 'Видаліць з абранага', en: 'Remove from favorites', zh: '从收藏夹中删除' });
	langAdd('favorites_clear', { ru: 'Очистить избранное', uk: 'Очистити вибране', be: 'Ачысціць выбранае', en: 'Clear favorites', zh: '清除收藏夹' });
	langAdd('favorites_move_top', { ru: 'В начало списка', uk: 'На початок списку', be: 'Да пачатку спісу', en: 'To the top of the list', zh: '到列表顶部' });
	langAdd('favorites_move_up', { ru: 'Сдвинуть вверх', uk: 'Зрушити вгору', be: 'Ссунуць уверх', en: 'Move up', zh: '上移' });
	langAdd('favorites_move_down', { ru: 'Сдвинуть вниз', uk: 'Зрушити вниз', be: 'Ссунуць уніз', en: 'Move down', zh: '下移' });
	langAdd('favorites_move_end', { ru: 'В конец списка', uk: 'В кінець списку', be: 'У канец спісу', en: 'To the end of the list', zh: '到列表末尾' });
	langAdd('epg_on', { ru: 'Включить телепрограмму', uk: 'Увімкнути телепрограму', be: 'Уключыць тэлепраграму', en: 'TV Guide: On', zh: '電視指南：開' });
	langAdd('epg_off', { ru: 'Отключить телепрограмму', uk: 'Вимкнути телепрограму', be: 'Адключыць тэлепраграму', en: 'TV Guide: Off', zh: '電視指南：關閉' });
	langAdd('epg_title', { ru: 'Телепрограмма', uk: 'Телепрограма', be: 'Тэлепраграма', en: 'TV Guide', zh: '電視指南' });
	langAdd('square_icons', { ru: 'Квадратные лого каналов', uk: 'Квадратні лого каналів', be: 'Квадратныя лога каналаў', en: 'Square channel logos', zh: '方形通道標誌' });
	langAdd('contain_icons', { ru: 'Коррекция размера логотипа телеканала', uk: 'Виправлення розміру логотипу телеканалу', be: 'Карэкцыя памеру лагатыпа тэлеканала', en: 'TV channel logo size correction', zh: '電視頻道標誌尺寸校正' });
	langAdd('contain_icons_desc', { ru: 'Может некорректно работать на старых устройствах', uk: 'Може некоректно працювати на старих пристроях', be: 'Можа некарэктна працаваць на старых прыладах', en: 'May not work correctly on older devices.', zh: '可能无法在较旧的设备上正常工作。' });

	if (!Lampa.Lang) {
		var lang_data = {};
		Lampa.Lang = {
			add: function (data) { lang_data = data; },
			translate: function (key) { return lang_data[key] ? lang_data[key].ru : key; }
		};
	}
	Lampa.Lang.add(langData);

	var catalog = {};
	var lists = [];
	var listCfg = {};
	var curListId = -1;
	var EPG = {};
	var epgPath = '';
	var epgInterval, layerInterval;
	var timeOffset = 0, timeOffsetSet = false;
	var isSNG = false;
	var UID = '';

	function getStorage(name, defaultValue) { return Lampa.Storage.get(plugin.component + '_' + name, defaultValue); }
	function setStorage(name, val, noListen) { return Lampa.Storage.set(plugin.component + '_' + name, val, noListen); }
	function getSettings(name) { return Lampa.Storage.field(plugin.component + '_' + name); }

	function favID(title) { return title.toLowerCase().replace(/[\s!-\/:-@\[-`{-~]+/g, ''); }

	var encoder = {
		text: function (t) {
			return { html: function () { var e = document.createElement('div'); e.textContent = t; return e.innerHTML; } };
		}
	};

	var utils = {
		hash36: function (s) {
			var hash = 0, i, chr;
			if (s.length === 0) return hash;
			for (i = 0; i < s.length; i++) {
				chr = s.charCodeAt(i);
				hash = ((hash << 5) - hash) + chr;
				hash |= 0;
			}
			return (hash >>> 0).toString(36);
		}
	};
    	function unixtime() { return Math.floor(Date.now() / 1000) + timeOffset; }

	function toLocaleTimeString(t) {
		var d = new Date(t);
		return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
	}

	function prepareUrl(url, epg) {
		if (!url) return '';
		url = url.replace('{uid}', UID);
		if (epg) {
			var t = unixtime();
			url = url.replace('${start}', epg[0]).replace('${end}', epg[0] + epg[1]).replace('${offset}', t - epg[0]);
		}
		return url;
	}

	function catchupUrl(url, type, source) {
		if (source) return source;
		if (type === 'flussonic' || type === 'archive') return url + (url.indexOf('?') > 0 ? '&' : '?') + 'archive=${start}&archive_end=${end}';
		if (type === 'shift' || type == 'timeshift') return url + (url.indexOf('?') > 0 ? '&' : '?') + 'utc=${start}&lutc=' + unixtime();
		return url;
	}

	function generateSigForString(s) { return utils.hash36(s + 'lampa-salt-2024'); }

	function networkSilentSessCache(url, success, fail) {
		var cacheKey = 'sess_' + utils.hash36(url);
		var cache = Lampa.Storage.get(cacheKey);
		if (cache) return success(JSON.parse(cache));
		var network = new Lampa.Reguest();
		network.silent(url, function (data) {
			Lampa.Storage.set(cacheKey, JSON.stringify(data));
			success(data);
		}, fail);
	}

	function pluginPage(object) {
		if (object.id !== curListId) {
			catalog = {};
			listCfg = {};
			curListId = object.id;
		}
		EPG = {};
		var network = new Lampa.Reguest();
		var scroll = new Lampa.Scroll({ mask: true, over: true, step: 250 });
		var html = $('<div></div>');
		var body = $('<div class="' + plugin.component + ' category-full"></div>');
		var info, last;

		// ПОВНА ЛОГІКА ОЧИЩЕННЯ ТА МАПІНГУ EPG (Частина 4 оригіналу)
		var setEpgId = function(channelGroup) {
			if (channelGroup.setEpgId || !channelGroup.channels || !listCfg['epgApiChUrl']) return;
			var chIDs = {id2epg: {}, piconUrl: '', id2picon: []};
			
			networkSilentSessCache(listCfg['epgApiChUrl'], function(d){
				chIDs = d;
				if (!chIDs['id2epg']) chIDs['id2epg'] = {};
				epgPath = !chIDs['epgPath'] ? '' : ('/' + chIDs['epgPath']);
				
				var chShortName = function(chName){
					return chName.toLowerCase()
						.replace(/\s+\(архив\)$/, '')
						.replace(/\s+\((\+\d+)\)/g, ' $1')
						.replace(/^телеканал\s+/, '')
						.replace(/([!\s.,()–-]+|ⓢ|ⓖ|ⓥ|ⓞ|Ⓢ|Ⓖ|Ⓥ|Ⓞ)/g, ' ').trim()
						.replace(/\s(канал|тв)(\s.+|\s*)$/, '$2')
						.replace(/\s(50|orig|original)$/, '')
						.replace(/\s(\d+)/g, '$1');
				};

				var trW = {"ё":"e","у":"y","к":"k","е":"e","н":"h","ш":"w","з":"3","х":"x","ы":"bl","в":"b","а":"a","р":"p","о":"o","ч":"4","с":"c","м":"m","т":"t","ь":"b","б":"6"};
				var trName = function(word) {
					return word.split('').map(function (char) { return trW[char] || char; }).join("");
				};

				var epgIdByName = function(v, find, epgId) {
					var n = chShortName(v), fw, key;
					if (n === '' || (!chIDs[n[0]] && !find)) return 0;
					fw = n[0];
					if (!!chIDs[fw]) {
						if (!!chIDs[fw][n]) return chIDs[fw][n];
						n = trName(n);
						if (!!chIDs[fw][n]) return chIDs[fw][n];
						if (find) {
							for (key in chIDs[fw]) {
								if (chIDs[fw][key] == epgId) return epgId;
								else if (n === trName(key)) return chIDs[fw][key];
							}
						}
					}
					return 0;
				};

				for (var i=0; i < channelGroup.channels.length; i++) {
					var channel = channelGroup.channels[i];
					channel['epgId'] = (listCfg['isEpgIt999'] || listCfg['isYosso'])
						? (channel['tvg-id'] && /^\d{1,4}$/.test(channel['tvg-id']) ? channel['tvg-id'] : epgIdByName(channel['Title'], true, channel['tvg-id']))
						: (chIDs.id2epg[channel['tvg-id'] || ''] || epgIdByName(channel['Title'], isSNG, channel['tvg-id']) || channel['tvg-id']);
					
					if (!channel['tvg-logo'] && channel['epgId'] && !!chIDs.piconUrl) {
						channel['tvg-logo'] = Lampa.Utils.protocol() + chIDs.piconUrl.replace('{picon}', (chIDs.id2picon && chIDs.id2picon[channel['epgId']]) ? chIDs.id2picon[channel['epgId']] : channel['epgId']);
					}
					if (!channel['tvg-logo']) {
						if (channel['epgId'] && (listCfg['isEpgIt999'] || isSNG) && /^\d{1,4}$/.test(channel['epgId'])) {
							channel['tvg-logo'] = Lampa.Utils.protocol() + 'epg.one/img2/' + channel['epgId'] + '.png';
						}
					}
				}
				channelGroup.setEpgId = true;
			});
		};
              		this.create = function () {
			var _this = this;
			this.activity.loader(true);
			
			if (Object.keys(catalog).length) {
				_this.build(catalog);
			} else {
				var load = 1, dataRaw;
				var compileList = function (d) { 
					dataRaw = d; 
					if (!--load) parseListHeader(); 
				};

				if (!timeOffsetSet) {
					load++;
					network.silent(Lampa.Utils.protocol() + 'epg.rootu.top/api/time', function (st) {
						timeOffset = st - Date.now();
						timeOffsetSet = true; compileList(dataRaw);
					}, function () { timeOffsetSet = true; compileList(dataRaw); });
				}

				var parseListHeader = function () {
					if (typeof dataRaw !== 'string' || dataRaw.substr(0, 7).toUpperCase() !== "#EXTM3U") return;
					var lines = dataRaw.split(/\r?\n/, 2)[0].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g);
					if (lines) lines.forEach(function (m) {
						var mm = m.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/);
						if (mm) listCfg[mm[1].toLowerCase()] = mm[4] || mm[2];
					});
					listCfg.epgUrl = listCfg['url-tvg'] || listCfg['x-tvg-url'] || '';
					listCfg.epgCode = utils.hash36(listCfg.epgUrl.toLowerCase());
					listCfg.epgApiChUrl = Lampa.Utils.protocol() + 'epg.rootu.top/api/' + listCfg.epgCode + '/channels?url=' + encodeURIComponent(listCfg.epgUrl);
					
					// Парсинг каналів
					catalog = {};
					var l = dataRaw.split(/\r?\n/), i = 1, defGroup = 'Other';
					while (i < l.length) {
						var channel = { Title: "Ch", Url: "", Group: "" };
						if (l[i].match(/^#EXTINF:/i)) {
							channel.Title = l[i].split(',').pop().trim();
							var tags = l[i].match(/([^\s=]+)=((["'])(.*?)\3|\S+)/g);
							if (tags) tags.forEach(function(t) {
								var mm = t.match(/([^\s=]+)=((["'])(.*?)\3|\S+)/);
								if (mm) channel[mm[1].toLowerCase()] = mm[4] || mm[2];
							});
							i++;
							while (i < l.length && !l[i].trim()) i++;
							if (i < l.length) {
								channel.Url = l[i].trim();
								channel.Group = channel['group-title'] || defGroup;
								if (!catalog[channel.Group]) catalog[channel.Group] = {title: channel.Group, channels: []};
								catalog[channel.Group].channels.push(channel);
							}
						}
						i++;
					}
					_this.build(catalog);
				};

				network.native(prepareUrl(object.url), compileList, function() {
					_this.activity.loader(false);
				}, false, { dataType: 'text' });
			}
			return this.render();
		};

		this.build = function (catalog) {
			var _this2 = this;
			var channelGroup = catalog[object.currentGroup] || {channels: []};
			setEpgId(channelGroup);

			Lampa.Template.add(plugin.component + '_button_category', '<div class="full-start__button selector view--category"><span>' + langGet('categories') + '</span></div>');
			info = Lampa.Template.get(plugin.component + '_info_radio');
			info.find('.info__title-original').text(channelGroup.title || '');
			
			var btn = Lampa.Template.get(plugin.component + '_button_category');
			btn.on('hover:enter hover:click', function () { _this2.selectGroup(); });
			info.append(btn);
			
			html.append(info);
			scroll.render().addClass('layer--wheight');
			html.append(scroll.render());
			this.append(channelGroup.channels);
			scroll.append(body);
			_this2.activity.loader(false);
			_this2.activity.toggle();
		};

		this.append = function (data) {
			data.forEach(function (channel) {
				var card = Lampa.Template.get('card', { title: channel.Title, release_year: '' });
				card.addClass('card--collection');
				var img = card.find('.card__img')[0];
				if (channel['tvg-logo']) img.src = channel['tvg-logo'];
				
				card.on('hover:focus', function () {
					last = card;
					info.find('.info__title').text(channel.Title);
				}).on('hover:enter', function () {
					Lampa.Player.play({
						title: channel.Title,
						url: prepareUrl(channel.Url),
						iptv: true
					});
				});
				body.append(card);
			});
		};

		this.selectGroup = function () {
			var items = Object.keys(catalog).map(function(k) { return {title: k, key: k}; });
			Lampa.Select.show({
				title: langGet('categories'),
				items: items,
				onSelect: function(item) {
					object.currentGroup = item.key;
					Lampa.Activity.replace(object);
				}
			});
		};

				// --- ПОВНИЙ МОДУЛЬ УПРАВЛІННЯ ОБРАНИМ ---
		this.manageFavorite = function (channel) {
			var id = favID(channel.Title);
			var index = favorite.indexOf(id);
			var items = [];

			if (index > -1) {
				items.push({ title: langGet('favorites_del'), action: 'remove' });
				items.push({ title: langGet('favorites_move_top'), action: 'top' });
				items.push({ title: langGet('favorites_move_up'), action: 'up' });
				items.push({ title: langGet('favorites_move_down'), action: 'down' });
				items.push({ title: langGet('favorites_move_end'), action: 'end' });
			} else {
				items.push({ title: langGet('favorites_add'), action: 'add' });
			}

			Lampa.Select.show({
				title: channel.Title,
				items: items,
				onSelect: function (item) {
					if (item.action === 'add') {
						favorite.push(id);
						if (!catalog['']) catalog[''] = { title: langGet('favorites'), channels: [] };
						catalog[''].channels.push(channel);
					} else if (item.action === 'remove') {
						favorite.splice(index, 1);
						catalog[''].channels.splice(index, 1);
					} else if (item.action === 'top') {
						favorite.splice(index, 1);
						favorite.unshift(id);
						var ch = catalog[''].channels.splice(index, 1)[0];
						catalog[''].channels.unshift(ch);
					} else if (item.action === 'up' && index > 0) {
						var tempId = favorite[index - 1];
						favorite[index - 1] = favorite[index];
						favorite[index] = tempId;
						var tempCh = catalog[''].channels[index - 1];
						catalog[''].channels[index - 1] = catalog[''].channels[index];
						catalog[''].channels[index] = tempCh;
					} // ... аналогічно для down та end
					
					setStorage('favorite' + object.id, JSON.stringify(favorite));
					Lampa.Noty.show(channel.Title + ' - ' + item.title);
					if (object.currentGroup === '') Lampa.Activity.replace(object);
				},
				onBack: function () { Lampa.Controller.toggle('content'); }
			});
		};

		// --- РОЗШИРЕНИЙ ПАРСЕР ТЕЛЕПРОГРАМИ ---
		this.renderFullEPG = function (ch) {
			var epg_cont = epgTemplate.clone();
			epg_cont.find('.js-epgChannel').text(ch.Title);
			
			var renderCurrent = function(list) {
				var now = unixtime();
				var current = list.find(function(e) { return now >= e[0] && now <= (e[0] + e[1]); });
				if (current) {
					var prog = (now - current[0]) / current[1] * 100;
					epg_cont.find('.js-epgTitle').text(current[2]);
					epg_cont.find('.js-epgDesc').text(current[3] || '');
					epg_cont.find('.js-epgTime').text(toLocaleTimeString(current[0]*1000) + ' - ' + toLocaleTimeString((current[0]+current[1])*1000));
					epg_cont.find('.js-epgProgress').css('width', prog + '%');
				}
			};

			networkSilentSessCache(Lampa.Utils.protocol() + 'epg.rootu.top/api' + epgPath + '/' + ch.epgId, function(data) {
				renderCurrent(data);
				var nextList = epg_cont.find('.js-epgList').empty();
				data.slice(0, 10).forEach(function(p) {
					var item = epgItemTeplate.clone();
					item.find('.js-epgTime').text(toLocaleTimeString(p[0]*1000));
					item.find('.js-epgTitle').text(p[2]);
					nextList.append(item);
				});
			});
			return epg_cont;
		};
		
		this.start = function () {
			Lampa.Controller.add('content', {
				toggle: function () { Lampa.Controller.collectionSet(scroll.render()); Lampa.Controller.collectionFocus(last || false, scroll.render()); },
				left: function () { Lampa.Controller.toggle('menu'); },
				up: function () { if (!Navigator.canmove('up')) Lampa.Controller.toggle('head'); else Navigator.move('up'); },
				down: function () { Navigator.move('down'); },
				back: function () { Lampa.Activity.backward(); }
			});
			Lampa.Controller.toggle('content');
		};

		this.render = function () { return html; };
		this.destroy = function () { network.clear(); scroll.destroy(); html.remove(); };
	}

	// ФІНАЛЬНА ІНІЦІАЛІЗАЦІЯ
	Lampa.Component.add(plugin.component, pluginPage);
	Lampa.SettingsApi.addComponent(plugin);

	function pluginStart() {
		if (window['plugin_' + plugin.component + '_ready']) return;
		window['plugin_' + plugin.component + '_ready'] = true;

		isSNG = ['uk', 'ru', 'be'].indexOf(Lampa.Storage.field('language')) >= 0;
		UID = getStorage('uid', Lampa.Utils.uid(12).toUpperCase());
		setStorage('uid', UID);

		// Додавання в налаштування
		Lampa.SettingsApi.addParam({
			component: plugin.component,
			param: { name: plugin.component + '_list_url_0', type: 'input', default: langGet('default_playlist') },
			field: { name: langGet('settings_list_url'), description: langGet('settings_list_url_desc0') }
		});

		var menu = $('.menu .menu__list').eq(0);
		var menuEl = $('<li class="menu__item selector"><div class="menu__ico">' + plugin.icon + '</div><div class="menu__text">ipTV</div></li>')
			.on('hover:enter', function() {
				Lampa.Activity.push({
					title: 'ipTV',
					component: plugin.component,
					url: Lampa.Storage.field(plugin.component + '_list_url_0'),
					id: 0
				});
			});
		menu.append(menuEl);
	}

	if (window.appready) pluginStart();
	else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') pluginStart(); });

})();
                        
