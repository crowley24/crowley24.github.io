// ==Lampa==
// name: Apple Style Movie Card
// version: 1.0
// author: Zhenya UI Mod
// ==/Lampa==

(function () {
    'use strict';

    function applyAppleStyle() {
        var card = $('.full-start__content');
        if (!card.length) return;

        if ($('#apple-style-card').length) return;

        $('head').append(`
            <style id="apple-style-card">
                .full-start {
                    background-size: cover !important;
                    background-position: center !important;
                }

                .full-start__content {
                    display: flex !important;
                    flex-direction: row !important;
                    gap: 4rem;
                    padding: 4rem 6rem !important;
                }

                .apple-left {
                    width: 35%;
                    min-width: 350px;
                }

                .apple-right {
                    width: 65%;
                }

                .apple-title {
                    font-size: 3.5rem;
                    font-weight: 700;
                    margin-bottom: 1.5rem;
                }

                .apple-meta {
                    font-size: 1.2rem;
                    opacity: 0.8;
                    margin-bottom: 2rem;
                    line-height: 1.8rem;
                }

                .apple-description {
                    font-size: 1.3rem;
                    line-height: 2rem;
                    opacity: 0.9;
                }

                .full-start__buttons {
                    margin-top: 2rem;
                }
            </style>
        `);

        var title = $('.full-start__title').text();
        var meta = $('.full-start__rate-line').html();
        var desc = $('.full-start__text').html();

        var left = $('<div class="apple-left"></div>');
        var right = $('<div class="apple-right"></div>');

        left.append('<div class="apple-title">' + title + '</div>');
        left.append('<div class="apple-meta">' + meta + '</div>');
        left.append($('.full-start__buttons'));

        right.append('<div class="apple-description">' + desc + '</div>');

        card.empty().append(left).append(right);
    }

    function init() {
        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start') {
                setTimeout(applyAppleStyle, 300);
            }
        });
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });

})();
