        var epg_programs = {}; // Об'єкт для зберігання програм у пам'яті: { channel_id: [ {start, stop, title}, ... ] }

        this.loadEPG = function () {
            if (!config.epg_url) return;
            
            $.ajax({
                url: config.epg_url,
                dataType: 'text',
                success: function (xml_str) {
                    try {
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(xml_str, "text/xml");
                        var programmes = xmlDoc.getElementsByTagName('programme');
                        
                        epg_programs = {};
                        
                        for (var i = 0; i < programmes.length; i++) {
                            var p = programmes[i];
                            var channel_id = p.getAttribute('channel');
                            var start = parseXMLDate(p.getAttribute('start'));
                            var stop = parseXMLDate(p.getAttribute('stop'));
                            var title_elem = p.getElementsByTagName('title')[0];
                            var title = title_elem ? title_elem.textContent : '';
                            
                            if (!epg_programs[channel_id]) {
                                epg_programs[channel_id] = [];
                            }
                            
                            epg_programs[channel_id].push({
                                start: start,
                                stop: stop,
                                title: title
                            });
                        }
                        console.log('IPTV PRO: EPG успішно завантажено та розпарсено');
                    } catch (e) {
                        console.log('IPTV PRO: Помилка парсингу EPG', e);
                    }
                },
                error: function () {
                    console.log('IPTV PRO: Не вдалося завантажити файл EPG');
                }
            });
        };

        // Допоміжна функція для конвертації формату дати XMLTV (YYYYMMDDHHMMSS ZZZZ) у мілісекунди (Unix timestamp)
        function parseXMLDate(str) {
            if (!str) return 0;
            var year = parseInt(str.substr(0, 4), 10);
            var month = parseInt(str.substr(4, 2), 10) - 1;
            var day = parseInt(str.substr(6, 2), 10);
            var hour = parseInt(str.substr(8, 2), 10);
            var minute = parseInt(str.substr(10, 2), 10);
            var second = parseInt(str.substr(12, 2), 10);
            
            return new Date(year, month, day, hour, minute, second).getTime() / 1000;
        }
