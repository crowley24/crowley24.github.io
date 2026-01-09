(function () {
    'use strict';

    function YouTube() {
        this.instance = 'invidious.snopyta.org'; // Можна змінити на інший Invidious

        this.search = function (query, page, callback) {
            var url = 'https://' + this.instance + '/api/v1/search?q=' + encodeURIComponent(query);
            Lampa.Utils.get(url, function (data) {
                var items = [];
                data.forEach(function (video) {
                    items.push({
                        title: video.title,
                        quality: video.lengthSeconds ? Math.floor(video.lengthSeconds / 60) + ' хв' : '',
                        img: video.videoThumbnails[0].url,
                        url: 'https://www.youtube.com/watch?v=' + video.videoId,
                        card: true
                    });
                });
                callback(items);
            });
        };

        this.menu = function () {
            Lampa.Menu.add({
                title: 'YouTube',
                icon: 'youtube',
                component: 'youtube'
            });

            Lampa.Component.add('youtube', this.component.bind(this));
        };

        this.component = function () {
            var html = '<div class="full__search"><input placeholder="Пошук на YouTube"/></div><div class="full__items"></div>';
            Lampa.Template.add('youtube', html);

            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'search') {
                    this.search(e.query, 1, function (items) {
                        // Відобразити items
                        Lampa.Activity.push({
                            component: 'youtube',
                            items: items
                        });
                    }.bind(this));
                }
            }.bind(this));
        };

        this.start = function () {
            this.menu();
        };
    }

    var yt = new YouTube();
    yt.start();

    Lampa.Plugin.add({
        name: 'YouTube',
        manifest: function () {
            return {name: 'YouTube', icon: 'youtube'};
        }
    });
})();
