
(function () {
    'use strict';

    /*
     * INTERFACE+ Cinematic Fix 1.5.1
     * Crowley24
     *
     * Companion for INTERFACE+ 1.5.0
     */

    if (window.interfacePlusCinematic151) return;
    window.interfacePlusCinematic151 = true;

    var VERSION = '1.5.1';

    var CINE = 'interface_plus_cinematic';
    var POSTER = 'interface_plus_show_poster';
    var SYNOPSIS = 'interface_plus_synopsis';

    var STYLE_ID = 'interface-plus-cinematic-151';

    var activeRoot = null;
    var activeData = null;
    var observer = null;
    var timer = null;
    var generation = 0;

    var saved = [];

    function setting(name, fallback) {
        try {
            var value = Lampa.Storage.get(name, fallback);

            return value === true ||
                value === 'true' ||
                value === 1;
        } catch (e) {
            return fallback;
        }
    }

    function element(value) {
        if (!value) return null;

        if (value.nodeType === 1) return value;

        if (value[0] && value[0].nodeType === 1) {
            return value[0];
        }

        return null;
    }

    function find(root, selectors) {
        if (!root) return null;

        for (var i = 0; i < selectors.length; i++) {
            var found = root.querySelector(selectors[i]);

            if (found) return found;
        }

        return null;
    }

    function getRoot(activity) {
        if (!activity) return null;

        var result = null;

        try {
            if (
                activity.activity &&
                typeof activity.activity.render === 'function'
            ) {
                result = activity.activity.render(true);
            }
        } catch (e) {}

        if (!result) {
            try {
                if (typeof activity.render === 'function') {
                    result = activity.render(true);
                }
            } catch (e) {}
        }

        return element(result);
    }

    function getData(activity) {
        if (!activity) return null;

        var candidates = [
            activity.movie,
            activity.data,
            activity.card,
            activity.card_data,
            activity.params && activity.params.movie,
            activity.params && activity.params.data,
            activity.activity && activity.activity.movie,
            activity.activity && activity.activity.data
        ];

        for (var i = 0; i < candidates.length; i++) {
            var item = candidates[i];

            if (
                item &&
                item.id &&
                (item.title || item.name)
            ) {
                return item;
            }
        }

        return null;
    }

    function isFull(activity) {
        if (!activity) return false;

        var name = String(
            activity.component || ''
        ).toLowerCase();

        return (
            name === 'full' ||
            name === 'full_start' ||
            name === 'fullstart'
        );
    }

    function remember(node, property, value) {
        if (!node || !node.style) return;

        var exists = saved.some(function (entry) {
            return entry.node === node &&
                entry.property === property;
        });

        if (!exists) {
            saved.push({
                node: node,
                property: property,
                previous: node.style.getPropertyValue(property),
                priority: node.style.getPropertyPriority(property)
            });
        }

        node.style.setProperty(
            property,
            value,
            'important'
        );
    }

    function restore() {
        saved.forEach(function (entry) {
            if (!entry.node || !entry.node.style) return;

            if (entry.previous) {
                entry.node.style.setProperty(
                    entry.property,
                    entry.previous,
                    entry.priority
                );
            } else {
                entry.node.style.removeProperty(
                    entry.property
                );
            }
        });

        saved = [];

        if (activeRoot) {
            activeRoot.classList.remove(
                'ip151-cinematic',
                'ip151-hide-poster'
            );

            var descriptions = activeRoot.querySelectorAll(
                '.ip151-description'
            );

            for (var i = 0; i < descriptions.length; i++) {
                descriptions[i].remove();
            }
        }
    }

    function installStyle() {
        var old = document.getElementById(STYLE_ID);

        if (old) old.remove();

        var style = document.createElement('style');
        style.id = STYLE_ID;

        style.textContent = [
            '.ip151-cinematic{position:relative!important;}',

            '.ip151-cinematic .ip151-content{' +
                'position:relative!important;' +
                'z-index:2!important;' +
                'max-width:900px!important;' +
                'box-sizing:border-box!important;' +
            '}',

            '.ip151-cinematic .ip151-title{' +
                'max-width:800px!important;' +
                'margin-bottom:18px!important;' +
            '}',

            '.ip151-cinematic .interface-plus-card-logo{' +
                'max-width:min(68vw,750px)!important;' +
                'max-height:130px!important;' +
                'object-fit:contain!important;' +
                'object-position:left center!important;' +
            '}',

            '.ip151-cinematic .ip151-buttons{' +
                'display:flex!important;' +
                'flex-wrap:wrap!important;' +
                'align-items:center!important;' +
                'gap:10px!important;' +
                'max-width:850px!important;' +
                'margin-top:18px!important;' +
                'margin-bottom:14px!important;' +
            '}',

            '.ip151-cinematic .ip151-buttons .focus,' +
            '.ip151-cinematic .ip151-buttons .focused{' +
                'box-shadow:0 0 0 2px rgba(255,255,255,.7)!important;' +
            '}',

            '.ip151-cinematic .ip151-description{' +
                'font-size:1.2em;' +
                'line-height:1.5;' +
                'color:#eee;' +
                'max-width:800px;' +
                'margin:15px 0 22px;' +
                'text-shadow:0 2px 8px rgba(0,0,0,.8);' +
                'display:-webkit-box;' +
                '-webkit-line-clamp:3;' +
                '-webkit-box-orient:vertical;' +
                'overflow:hidden;' +
            '}',

            '.ip151-cinematic.ip151-hide-poster .ip151-poster{' +
                'display:none!important;' +
            '}',

            '.ip151-cinematic.ip151-hide-poster .ip151-content{' +
                'margin-left:0!important;' +
                'padding-left:0!important;' +
                'transform:none!important;' +
            '}',

            '.ip151-cinematic .ip151-backdrop{' +
                'position:relative;' +
            '}',

            '@media(max-width:480px){' +
                '.ip151-cinematic .interface-plus-card-logo{' +
                    'max-width:85vw!important;' +
                    'max-height:90px!important;' +
                '}' +
                '.ip151-cinematic .ip151-description{' +
                    'font-size:1.05em;' +
                '}' +
            '}'
        ].join('\n');

        document.head.appendChild(style);
    }

    function identify(root) {
        var title = find(root, [
            '.full-start__title',
            '.full-start-new__title',
            '.full__title',
            '.full-card__title',
            '.full-start__name',
            '.full-start-new__name',
            '.interface-plus-logo-title'
        ]);

        var poster = find(root, [
            '.full-start__poster',
            '.full-start__img',
            '.full-start__cover',
            '.full-start-new__poster',
            '.full__poster',
            '.full-card__poster',
            '.full-start__left .full-start__img'
        ]);

        var buttons = find(root, [
            '.full-start__buttons',
            '.full-start-new__buttons',
            '.full__buttons',
            '.full-card__buttons',
            '.full-start__actions',
            '.full-start-new__actions',
            '.full__actions',
            '.full-start__buttons-container'
        ]);

        var content = find(root, [
            '.full-start__body',
            '.full-start__info',
            '.full-start__content',
            '.full-start-new__body',
            '.full-start-new__info',
            '.full-start-new__content',
            '.full__body',
            '.full__info',
            '.full-card__content'
        ]);

        var backdrop = find(root, [
            '.full-start__background',
            '.full-start__bg',
            '.full-start-new__background',
            '.full__background',
            '.full-card__background'
        ]);

        // Fallback: use the nearest reasonable content wrapper.
        if (!content && title) {
            var parent = title.parentElement;

            for (var i = 0; i < 4 && parent; i++) {
                if (
                    buttons &&
                    parent.contains(buttons) &&
                    parent !== root
                ) {
                    content = parent;
                    break;
                }

                parent = parent.parentElement;
            }
        }

        // Find an action group only inside the title's content area.
        if (!buttons && content) {
            buttons = find(content, [
                '[class*="buttons"]',
                '[class*="actions"]'
            ]);
        }

        return {
            title: title,
            poster: poster,
            buttons: buttons,
            content: content,
            backdrop: backdrop
        };
    }

    function addDescription(root, buttons, data) {
        var old = root.querySelector(
            '.ip151-description'
        );

        if (
            !setting(SYNOPSIS, true) ||
            !buttons ||
            !data ||
            !data.overview
        ) {
            if (old) old.remove();
            return;
        }

        if (!old) {
            old = document.createElement('div');
            old.className = 'ip151-description';

            buttons.insertAdjacentElement(
                'afterend',
                old
            );
        }

        old.textContent = data.overview;
    }

    function apply() {
        if (!activeRoot || !activeRoot.isConnected) return;

        var root = activeRoot;
        var enabled = setting(CINE, true);

        restore();

        if (!enabled) return;

        var parts = identify(root);

        root.classList.add('ip151-cinematic');

        if (parts.title) {
            parts.title.classList.add('ip151-title');
        }

        if (parts.content) {
            parts.content.classList.add('ip151-content');
        }

        if (parts.buttons) {
            parts.buttons.classList.add('ip151-buttons');
        }

        if (parts.backdrop) {
            parts.backdrop.classList.add('ip151-backdrop');
        }

        if (parts.poster) {
            parts.poster.classList.add('ip151-poster');
        }

        if (!setting(POSTER, false)) {
            root.classList.add('ip151-hide-poster');

            if (parts.poster) {
                remember(
                    parts.poster,
                    'display',
                    'none'
                );
            }

            if (parts.content) {
                remember(
                    parts.content,
                    'margin-left',
                    '0px'
                );

                remember(
                    parts.content,
                    'padding-left',
                    '0px'
                );
            }
        }

        if (parts.content) {
            remember(
                parts.content,
                'max-width',
                '900px'
            );
        }

        addDescription(
            root,
            parts.buttons,
            activeData
        );

        console.log('[INTERFACE+ 1.5.1] Cinematic:', {
            title: !!parts.title,
            poster: !!parts.poster,
            buttons: !!parts.buttons,
            content: !!parts.content,
            backdrop: !!parts.backdrop
        });
    }

    function schedule() {
        clearTimeout(timer);

        var token = generation;

        timer = setTimeout(function () {
            if (token !== generation) return;
            apply();
        }, 120);
    }

    function start(activity) {
        if (!isFull(activity)) return;

        var root = getRoot(activity);
        var data = getData(activity);

        if (!root || !data) return;

        if (root === activeRoot) {
            activeData = data;
            schedule();
            return;
        }

        stop();

        activeRoot = root;
        activeData = data;

        generation++;

        var token = generation;

        if (window.MutationObserver) {
            observer = new MutationObserver(function (mutations) {
                if (token !== generation) return;

                for (var i = 0; i < mutations.length; i++) {
                    var mutation = mutations[i];

                    if (mutation.type !== 'childList') continue;

                    var relevant = false;

                    for (
                        var j = 0;
                        j < mutation.addedNodes.length;
                        j++
                    ) {
                        var node = mutation.addedNodes[j];

                        if (node.nodeType !== 1) continue;

                        if (
                            node.classList &&
                            (
                                node.classList.contains(
                                    'ip151-description'
                                ) ||
                                node.classList.contains(
                                    'interface-plus-card-logo'
                                ) ||
                                node.classList.contains(
                                    'interface-plus-original-title'
                                )
                            )
                        ) {
                            continue;
                        }

                        relevant = true;
                        break;
                    }

                    if (relevant) {
                        schedule();
                        break;
                    }
                }
            });

            observer.observe(root, {
                childList: true,
                subtree: true
            });
        }

        // Retry during initial card rendering.
        [100, 350, 750, 1400].forEach(function (delay) {
            setTimeout(function () {
                if (token === generation) {
                    apply();
                }
            }, delay);
        });
    }

    function stop() {
        generation++;

        clearTimeout(timer);

        if (observer) {
            observer.disconnect();
            observer = null;
        }

        restore();

        if (activeRoot) {
            var classes = [
                'ip151-title',
                'ip151-poster',
                'ip151-buttons',
                'ip151-content',
                'ip151-backdrop'
            ];

            classes.forEach(function (name) {
                var elements = activeRoot.querySelectorAll(
                    '.' + name
                );

                for (var i = 0; i < elements.length; i++) {
                    elements[i].classList.remove(name);
                }
            });
        }

        activeRoot = null;
        activeData = null;
    }

    function init() {
        if (
            !window.Lampa ||
            !Lampa.Listener ||
            !Lampa.Activity
        ) return;

        installStyle();

        Lampa.Listener.follow('activity', function (event) {
            if (!event) return;

            if (event.type === 'start') {
                setTimeout(function () {
                    if (isFull(event.object)) {
                        start(event.object);
                    } else {
                        stop();
                    }
                }, 50);
            }

            if (
                event.type === 'destroy' &&
                isFull(event.object)
            ) {
                stop();
            }
        });

        if (
            Lampa.Storage.listener &&
            Lampa.Storage.listener.follow
        ) {
            Lampa.Storage.listener.follow(
                'change',
                function (event) {
                    if (!event) return;

                    if (
                        [
                            CINE,
                            POSTER,
                            SYNOPSIS
                        ].indexOf(event.name) !== -1
                    ) {
                        schedule();
                    }
                }
            );
        }

        try {
            var current = Lampa.Activity.active();

            if (isFull(current)) {
                start(current);
            }
        } catch (e) {}

        console.log(
            '[INTERFACE+] Cinematic Fix ' +
            VERSION +
            ' ready'
        );
    }

    if (window.appready) {
        setTimeout(init, 500);
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                setTimeout(init, 500);
            }
        });
    }

})();
