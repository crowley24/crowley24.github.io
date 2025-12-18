(function () {
    'use strict';

    function addonStart() {

        /*
         * * * Иконки разделов плагина
         */
        var icon_add_plugin = '<svg version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="256px" height="256px" viewBox="0 0 512 512" xml:space="preserve" fill="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <style type="text/css">  .st0{fill:#ffffff;}  </style> <g> <path class="st0" d="M432.531,229.906c-9.906,0-19.125,2.594-27.313,6.375v-51.656c0-42.938-34.922-77.875-77.859-77.875h-51.641 c3.781-8.156,6.375-17.375,6.375-27.281C282.094,35.656,246.438,0,202.625,0c-43.828,0-79.484,35.656-79.484,79.469 c0,9.906,2.594,19.125,6.359,27.281H77.875C34.938,106.75,0,141.688,0,184.625l0.047,23.828H0l0.078,33.781 c0,23.031,8.578,36.828,12.641,42.063c12.219,15.797,27.094,18.172,34.891,18.172c11.953,0,23.141-4.953,33.203-14.703l0.906-0.422 l1.516-2.141c1.391-1.359,6.328-5.484,14.016-5.5c16.344,0,29.656,13.297,29.656,29.672c0,16.344-13.313,29.656-29.672,29.656 c-7.672,0-12.609-4.125-14-5.5l-1.516-2.141l-0.906-0.422c-10.063-9.75-21.25-14.703-33.203-14.703 c-7.797,0.016-22.672,2.375-34.891,18.172c-4.063,5.25-12.641,19.031-12.641,42.063L0,410.281h0.047L0,434.063 C0,477.063,34.938,512,77.875,512h54.563v-0.063l3.047-0.016c23.016,0,36.828-8.563,42.063-12.641 c15.797-12.219,18.172-27.094,18.172-34.891c0-11.953-4.953-23.141-14.688-33.203l-0.438-0.906l-2.125-1.516 c-1.375-1.391-5.516-6.328-5.516-14.016c0-16.344,13.313-29.656,29.672-29.656c16.344,0,29.656,13.313,29.656,29.656 c0,7.688-4.141,12.625-5.5,14.016l-2.125,1.516l-0.438,0.906c-9.75,10.063-14.703,21.25-14.703,33.203 c0,7.797,2.359,22.672,18.172,34.891c5.25,4.078,19.031,12.641,42.063,12.641l17,0.047V512h40.609 c42.938,0,77.859-34.938,77.859-77.875v-51.641c8.188,3.766,17.406,6.375,27.313,6.375c43.813,0,79.469-35.656,79.469-79.484 C512,265.563,476.344,229.906,432.531,229.906z M432.531,356.375c-19.031,0-37.469-22.063-37.469-22.063 c-3.344-3.203-6.391-4.813-9.25-4.813c-2.844,0-5.469,1.609-7.938,4.813c0,0-5.125,5.891-5.125,19.313v80.5 c0,25.063-20.313,45.391-45.391,45.391h-23.813l-33.797-0.078c-15.438,0-22.188-5.875-22.188-5.875 c-3.703-2.859-5.563-5.875-5.563-9.172c0-3.266,1.859-6.797,5.563-10.594c0,0,17.219-13.891,17.219-39.047 c0-34.313-27.844-62.156-62.156-62.156c-34.344,0-62.156,27.844-62.156,62.156c0,25.156,17.219,39.047,17.219,39.047 c3.688,3.797,5.531,7.328,5.531,10.594c0,3.297-1.844,6.313-5.531,9.172c0,0-6.766,5.875-22.203,5.875l-33.797,0.078H77.875 c-25.063,0-45.375-20.328-45.375-45.391l0.094-48.203h-0.047l0.016-9.422c0-15.422,5.875-22.203,5.875-22.203 c2.859-3.703,5.875-5.531,9.156-5.531s6.813,1.828,10.609,5.531c0,0,13.891,17.234,39.047,17.234 c34.313-0.016,62.156-27.844,62.156-62.156c-0.016-34.344-27.844-62.156-62.156-62.156c-25.156,0-39.047,17.219-39.047,17.219 c-3.797,3.688-7.328,5.531-10.609,5.531s-6.297-1.828-9.156-5.531c0,0-5.875-6.781-5.875-22.203v-1.156h0.031L32.5,184.625 c0-25.063,20.313-45.375,45.375-45.375h80.5c13.422,0,19.313-5.125,19.313-5.125c6.422-4.938,6.422-10.531,0-17.188 c0,0-22.063-18.438-22.063-37.469c0-25.953,21.047-46.984,47-46.984c25.938,0,46.984,21.031,46.984,46.984 c0,19.031-22.047,37.469-22.047,37.469c-6.438,6.656-6.438,12.25,0,17.188c0,0,5.875,5.125,19.281,5.125h80.516 c25.078,0,45.391,20.313,45.391,45.375v80.516c0,13.422,5.125,19.297,5.125,19.297c2.469,3.219,5.094,4.813,7.938,4.813 c2.859,0,5.906-1.594,9.25-4.813c0,0,18.438-22.047,37.469-22.047c25.938,0,46.969,21.047,46.969,46.984 C479.5,335.344,458.469,356.375,432.531,356.375z"></path> </g> </g></svg>';
        var icon_add_interface_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"><path fill="currentColor" d="M18 8a2 2 0 1 1-4 0a2 2 0 0 1 4 0"/><path fill="currentColor" fill-rule="evenodd" d="M11.943 1.25h.114c2.309 0 4.118 0 5.53.19c1.444.194 2.584.6 3.479 1.494c.895.895 1.3 2.035 1.494 3.48c.19 1.411.19 3.22.19 5.529v.088c0 1.909 0 3.471-.104 4.743c-.104 1.28-.317 2.347-.795 3.235q-.314.586-.785 1.057c-.895.895-2.035 1.3-3.48 1.494c-1.411.19-3.22.19-5.529.19h-.114c-2.309 0-4.118 0-5.53-.19c-1.444-.194-2.584-.6-3.479-1.494c-.793-.793-1.203-1.78-1.42-3.006c-.215-1.203-.254-2.7-.262-4.558Q1.25 12.792 1.25 12v-.058c0-2.309 0-4.118.19-5.53c.194-1.444.6-2.584 1.494-3.479c.895-.895 2.035-1.3 3.48-1.494c1.411-.19 3.22-.19 5.529-.19m-5.33 1.676c-1.278.172-2.049.5-2.618 1.069c-.57.57-.897 1.34-1.069 2.619c-.174 1.3-.176 3.008-.176 5.386v.844l1.001-.876a2.3 2.3 0 0 1 3.141.104l4.29 4.29a2 2 0 0 0 2.564.222l.298-.21a3 3 0 0 1 3.732.225l2.83 2.547c.286-.598.455-1.384.545-2.493c.098-1.205.099-2.707.099-4.653c0-2.378-.002-4.086-.176-5.386c-.172-1.279-.5-2.05-1.069-2.62c-.57-.569-1.34-.896-2.619-1.068c-1.3-.174-3.008-.176-5.386-.176s-4.086.002-5.386.176" clip-rule="evenodd"/></svg></div><div style="font-size:1.3em">Интерфейс</div></div>';
        var nthChildIndex = null; // Объявляем переменную для хранения индекса nth-child
        /* Регулярно вызываемые функции */
        Lampa.Storage.set('needReboot', false);
        Lampa.Storage.set('needRebootSettingExit', false);
        /* Запрос на перезагрузку в модальном окне */
        function showReload(reloadText) {
            if (document.querySelector('.modal') == null) {
                Lampa.Modal.open({
                    title: '',
                    align: 'center',
                    zIndex: 300,
                    html: $('<div class="about">' + reloadText + '</div>'),
                    buttons: [{
                        name: 'Нет',
                        onSelect: function onSelect() {
                            //Lampa.Modal.close();
                            $('.modal').remove();
                            Lampa.Controller.toggle('content')
                        }
                    }, {
                        name: 'Да',
                        onSelect: function onSelect() {
                            window.location.reload();
                        }
                    }]
                });
            }
        }
        /* Функция анимации установки плагина */
        function showLoadingBar() {
            // Создаем элемент для полосы загрузки
            var loadingBar = document.createElement('div');
            loadingBar.className = 'loading-bar';
            loadingBar.style.position = 'fixed';
            loadingBar.style.top = '50%';
            loadingBar.style.left = '50%';
            loadingBar.style.transform = 'translate(-50%, -50%)'; // Центрируем по центру
            loadingBar.style.zIndex = '9999';
            loadingBar.style.display = 'none';
            loadingBar.style.width = '30em';
            loadingBar.style.height = '2.5em';
            loadingBar.style.backgroundColor = '#595959';
            loadingBar.style.borderRadius = '4em';

            // Создаем элемент для индикатора загрузки
            var loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.style.position = 'absolute';
            loadingIndicator.style.left = '0';
            loadingIndicator.style.top = '0';
            loadingIndicator.style.bottom = '0';
            loadingIndicator.style.width = '0';
            loadingIndicator.style.backgroundColor = '#64e364';
            loadingIndicator.style.borderRadius = '4em';

            // Создаем элемент для отображения процента загрузки
            var loadingPercentage = document.createElement('div');
            loadingPercentage.className = 'loading-percentage';
            loadingPercentage.style.position = 'absolute';
            loadingPercentage.style.top = '50%';
            loadingPercentage.style.left = '50%';
            loadingPercentage.style.transform = 'translate(-50%, -50%)';
            loadingPercentage.style.color = '#fff';
            loadingPercentage.style.fontWeight = 'bold';
            loadingPercentage.style.fontSize = '1.7em';

            // Добавляем элементы на страницу
            loadingBar.appendChild(loadingIndicator);
            loadingBar.appendChild(loadingPercentage);
            document.body.appendChild(loadingBar);

            // Отображаем полосу загрузки
            loadingBar.style.display = 'block';

            // Анимация с использованием setTimeout
            var startTime = Date.now();
            var duration = 1000; // 1 секунда
            var interval = setInterval(function () {
                var elapsed = Date.now() - startTime;
                var progress = Math.min((elapsed / duration) * 100, 100);

                loadingIndicator.style.width = progress + '%';
                loadingPercentage.textContent = Math.round(progress) + '%';

                if (elapsed >= duration) {
                    clearInterval(interval);
                    setTimeout(function () {
                        loadingBar.style.display = 'none';
                        loadingBar.parentNode.removeChild(loadingBar);
                    }, 250);
                }
            }, 16);
        }

        /* Функция анимации удаления плагина */
        function showDeletedBar() {
            // Создаем элемент для полосы загрузки
            var loadingBar = document.createElement('div');
            loadingBar.className = 'loading-bar';
            loadingBar.style.position = 'fixed';
            loadingBar.style.top = '50%';
            loadingBar.style.left = '50%';
            loadingBar.style.transform = 'translate(-50%, -50%)'; // Центрируем по центру
            loadingBar.style.zIndex = '9999';
            loadingBar.style.display = 'none';
            loadingBar.style.width = '30em';
            loadingBar.style.height = '2.5em';
            loadingBar.style.backgroundColor = '#595959';
            loadingBar.style.borderRadius = '4em';

            // Создаем элемент для индикатора загрузки
            var loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.style.position = 'absolute';
            loadingIndicator.style.left = '0';
            loadingIndicator.style.top = '0';
            loadingIndicator.style.bottom = '0';
            loadingIndicator.style.width = '0';
            loadingIndicator.style.backgroundColor = '#ff2121';
            loadingIndicator.style.borderRadius = '4em';

            // Создаем элемент для отображения процента загрузки
            var loadingPercentage = document.createElement('div');
            loadingPercentage.className = 'loading-percentage';
            loadingPercentage.style.position = 'absolute';
            loadingPercentage.style.top = '50%';
            loadingPercentage.style.left = '50%';
            loadingPercentage.style.transform = 'translate(-50%, -50%)';
            loadingPercentage.style.color = '#fff';
            loadingPercentage.style.fontWeight = 'bold';
            loadingPercentage.style.fontSize = '1.7em';

            // Добавляем элементы на страницу
            loadingBar.appendChild(loadingIndicator);
            loadingBar.appendChild(loadingPercentage);
            document.body.appendChild(loadingBar);

            // Отображаем полосу загрузки
            loadingBar.style.display = 'block';

            // Анимация с использованием setTimeout
            var startTime = Date.now();
            var duration = 1000; // 1 секунда
            var interval = setInterval(function () {
                var elapsed = Date.now() - startTime;
                var progress = 100 - Math.min((elapsed / duration) * 100, 100);

                loadingIndicator.style.width = progress + '%';
                loadingPercentage.textContent = Math.round(progress) + '%';

                if (elapsed >= duration) {
                    clearInterval(interval);
                    setTimeout(function () {
                        loadingBar.style.display = 'none';
                        loadingBar.parentNode.removeChild(loadingBar);
                    }, 250);
                }
            }, 16);
        }

        /* Следим за настройками */
        function settingsWatch() {
            /* проверяем флаг перезагрузки и ждём выхода из настроек */
            if (Lampa.Storage.get('needRebootSettingExit')) {
                var intervalSettings = setInterval(function () {
                    var elementSettings = $('#app > div.settings > div.settings__content.layer--height > div.settings__body > div');
                    if (!elementSettings.length > 0) {
                        clearInterval(intervalSettings);
                        showReload('Для полного удаления плагина перезагрузите приложение!');
                    }
                }, 1000)
            }
        }
        /* Способ от Lampac */
        function itemON(sourceURL, sourceName, sourceAuthor, itemName) {
            if ($('DIV[data-name="' + itemName + '"]').find('.settings-param__status').hasClass('active')) {
                Lampa.Noty.show("Плагин уже установлен!");
            } else if ($('DIV[data-name="' + itemName + '"]').find('.settings-param__status').css('background-color') === 'rgb(255, 165, 0)') {
                Lampa.Noty.show("Плагин уже установлен, но отключен в расширениях!");
            } else {
                // Если перезагрузки не требуется - контроль после удаления плагинов
                if (!Lampa.Storage.get('needReboot')) {
                    // Получаем список плагинов
                    var pluginsArray = Lampa.Storage.get('plugins');
                    // Добавляем новый элемент к списку
                    pluginsArray.push({
                        "author": sourceAuthor,
                        "url": sourceURL,
                        "name": sourceName,
                        "status": 1
                    });
                    // Внедряем изменённый список в лампу
                    Lampa.Storage.set('plugins', pluginsArray);
                    // Делаем инъекцию скрипта для немедленной работы
                    var script = document.createElement('script');
                    script.src = sourceURL;
                    document.getElementsByTagName('head')[0].appendChild(script);
                    showLoadingBar();
                    setTimeout(function () {
                        Lampa.Settings.update();
                        Lampa.Noty.show("Плагин " + sourceName + " успешно установлен")
                    }, 1500);
                    setTimeout(function () {
                        if (nthChildIndex) {
                            var F = document.querySelector("#app > div.settings.animate > div.settings__content.layer--height > div.settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")");
                            Lampa.Controller.focus(F);
                            Lampa.Controller.toggle('settings_component');
                            // console.log("Установлен фокус на элемент:", F.outerHTML);
                        } else {
                            console.error("Ошибка: Элемент с индексом nth-child " + nthChildIndex + " не найден.");
                        }
                    }, 2000);
                    // Отправляем сигнал ожидания выхода из настроек для появления окна с предложением перезагрузки
                    // Lampa.Storage.set('needRebootSettingExit', true);
                    // settingsWatch();
                } //else {showReload('Для установки плагинов после удаления, нужно перезагрузить приложение');}
            }
        }

        function hideInstall() {
            $("#hideInstall").remove();
            $('body').append('<div id="hideInstall"><style>div.settings-param__value{opacity: 0%!important;display: none;}</style><div>')
        }

        function deletePlugin(pluginToRemoveUrl) {
            var plugins = Lampa.Storage.get('plugins');
            var updatedPlugins = plugins.filter(function (obj) { return obj.url !== pluginToRemoveUrl });
            Lampa.Storage.set('plugins', updatedPlugins);
            //Lampa.Storage.set('needReboot', true);
            setTimeout(function () {
                Lampa.Settings.update();
                Lampa.Noty.show("Плагин успешно удален");
            }, 1500);
            setTimeout(function () {
                if (nthChildIndex) {
                    var F = document.querySelector("#app > div.settings.animate > div.settings__content.layer--height > div.settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")");
                    Lampa.Controller.focus(F);
                    Lampa.Controller.toggle('settings_component');
                    // console.log("Установлен фокус на элемент:", F.outerHTML);
                } else {
                    console.error("Ошибка: Элемент с индексом nth-child " + nthChildIndex + " не найден.");
                }
            }, 2000);
            /*Lampa.Settings.update();
            Lampa.Noty.show("Плагин успешно удален");*/
            Lampa.Storage.set('needRebootSettingExit', true);
            settingsWatch();
            showDeletedBar();
        };

        function checkPlugin(pluginToCheck) {
            var plugins = Lampa.Storage.get('plugins');
            var checkResult = plugins.filter(function (obj) { return obj.url == pluginToCheck });
            console.log('search', 'checkResult: ' + JSON.stringify(checkResult));
            console.log('search', 'pluginToCheck: ' + pluginToCheck);
            if (JSON.stringify(checkResult) !== '[]') { return true } else { return false }
        };

        // Функция для получения индекса параметра
        function focus_back(event) {
            var targetElement = event.target; // Здесь мы берём объект события

            // Находим родительский элемент
            var parentElement = targetElement.parentElement;

            // Получаем список всех дочерних элементов
            var children = Array.from(parentElement.children);

            // Находим индекс (0-based) текущего элемента
            var index = children.indexOf(targetElement);

            // Учитываем, что nth-child принимает 1-based индекс
            var nthChildIndex = index + 1;

            // Выводим найденный индекс в консоль
            // console.log("Найденный индекс:", nthChildIndex);

            // Возвращаем найденный элемент
            return nthChildIndex;
        }

        /* Компонент */
        Lampa.SettingsApi.addComponent({
            component: 'add_plugin',
            name: 'Плагины',
            icon: icon_add_plugin
        });
        /* Интерфейс */
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name == 'main') {
                Lampa.SettingsApi.addComponent({
                    component: 'add_interface_plugin',
                    name: 'Interface'
                });
                setTimeout(function () {
                    $('div[data-component="add_interface_plugin"]').remove();
                }, 0);
                $("#hideInstall").remove();
                //$('body').append('<div id="hideInstall"><style>div.settings-param__value{opacity: 0%!important;display: none;}</style><div>')
                /* Сдвигаем раздел выше */
                setTimeout(function () {
                    $('div[data-component=plugins]').before($('div[data-component=add_plugin]'))
                }, 30)
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'add_plugin',
            param: {
                name: 'add_interface_plugin',
                type: 'static',
                default: true
            },
            field: {
                name: icon_add_interface_plugin
            },
            onRender: function (item) {
                item.on('hover:enter', function () {
                    Lampa.Settings.create('add_interface_plugin');
                    Lampa.Controller.enabled().controller.back = function () {
                        Lampa.Settings.create('add_plugin');
                    }
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'TMDB',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'TMDB Proxy',
                description: 'Проксирование постеров для сайта TMDB'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/torr_styles.js', 'TMDB Proxy', '@lampa', 'TMDB');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/torr_styles.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) {
                $('.settings-param__name', item).css('color', 'f3d900'); hideInstall();
                /*var myResult = checkPlugin('http://cub.red/plugin/tmdb-proxy')
                setTimeout(function() {	
                    $('div[data-name="TMDB"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="TMDB"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="TMDB"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/torr_styles.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="TMDB"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/torr_styles.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="TMDB"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="TMDB"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="TMDB"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'head_filter',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'head_filter',
                description: 'Настройка шапки'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/head_filter.js', 'head_filter', '@author', 'head_filter');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/head_filter.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900');  hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/head_filter.js')
                setTimeout(function() {	
                    $('div[data-name="head_filter"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="head_filter"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="head_filter"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/head_filter.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="head_filter"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/head_filter.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="head_filter"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="head_filter"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="head_filter"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });	   
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Interface MOD',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Interface MOD',
                description: 'улучшения UI'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/interface_mod_new.js', 'Interface MOD', '@author', 'Interface MOD');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/interface_mod_new.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/interface_mod_new.js')
                setTimeout(function() {	
                    $('div[data-name="Interface MOD"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Interface MOD"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Interface MOD"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/interface_mod_new.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Interface MOD"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/interface_mod_new.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Interface MOD"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Interface MOD"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Interface MOD"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });	     
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Interface MOD v2.2.0',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Interface MOD v2.2.0',
                description: 'улучшения UI'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/interface_mod.js',
                        'Interface MOD v2.2.0', '@author', 'Interface MOD v2.2.0');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/interface_mod.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/interface_mod.js')
                setTimeout(function() {	
                    $('div[data-name="Interface MOD v2.2.0"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Interface MOD v2.2.0"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Interface MOD v2.2.0"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/interface_mod.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Interface MOD v2.2.0"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/interface_mod.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Interface MOD v2.2.0"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Interface MOD v2.2.0"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Interface MOD v2.2.0"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });	   
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'InteractionMain',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'InteractionMain',
                description: 'заменяющий стандартный интерфейс просмотра (InteractionMain) на новый горизонтальный скролл с карточками (для источников TMDB/CUB), доступный только в премиум-версии и на больших экранах (≥767px)'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/interface.js', 'InteractionMain', '@author', 'InteractionMain');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/interface.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/interface.js')
                setTimeout(function() {	
                    $('div[data-name="InteractionMain"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="InteractionMain"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="InteractionMain"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/interface.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="InteractionMain"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/interface.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="InteractionMain"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="InteractionMain"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="InteractionMain"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Logo',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Logo',
                description: 'заменяет текст названий фильмов/сериалов на официальные логотипы из TMDB API'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/logo.js', 'Logo', '@author', 'Logo');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/logo.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/logo.js')
                setTimeout(function() {	
                    $('div[data-name="Logo"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Logo"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Logo"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/logo.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Logo"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/logo.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Logo"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Logo"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Logo"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Темы maxsm',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Темы maxsm',
                description: ''
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/maxsm_themes.js', 'Темы maxsm', '@author', 'Темы maxsm');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/maxsm_themes.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/maxsm_themes.js')
                setTimeout(function() {	
                    $('div[data-name="Темы maxsm"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Темы maxsm"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Темы maxsm"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/maxsm_themes.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Темы maxsm"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/maxsm_themes.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Темы maxsm"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Темы maxsm"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Темы maxsm"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Подборки',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Подборки',
                description: 'Этот плагин "Подборки" для Lampa добавляет кастомные пункты в главное меню (.menu__list:first) для быстрого поиска контента: "В качестве" (UHD фильмы из CUB)'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/p.js', 'Подборки', '@author', 'Подборки');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/p.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/p.js')
                setTimeout(function() {	
                    $('div[data-name="Подборки"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Подборки"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Подборки"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/p.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Подборки"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/p.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Подборки"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Подборки"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Подборки"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Quality',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Quality',
                description: 'лучшее доступное качество видео (4K/FHD/HD/SD) на карточках фильмов/сериалов'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/quality.js', 'Quality', '@author', 'Quality');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/quality.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/quality.js')
                setTimeout(function() {	
                    $('div[data-name="Quality"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Quality"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Quality"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/quality.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Quality"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/quality.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Quality"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Quality"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Quality"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Rating_omdb',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Rating_omdb',
                description: 'Цей плагін "Combined Ratings" для Lampa інтегрує рейтинги з OMDB API (Rotten Tomatoes, Metacritic, IMDB) на сторінку повного опису (full), розраховує зважену середню (IMDB/TMDB по 40%, MC/RT по 10%), додає кількість Оскарів, локалізовані вікові рейтинги (3+/6+ тощо), з анімацією завантаження та кешуванням на 3 дні'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/rating_omdb.js', 'Rating_omdb', '@author', 'Rating_omdb');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/rating_omdb.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/rating_omdb.js')
                setTimeout(function() {	
                    $('div[data-name="Rating_omdb"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Rating_omdb"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Rating_omdb"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/rating_omdb.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Rating_omdb"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/rating_omdb.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Rating_omdb"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Rating_omdb"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Rating_omdb"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Rating',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Rating',
                description: '"Rating KP IMDB" для Lampa додає рейтинги з Kinopoisk (KP) та IMDB на сторінку повного опису (full),'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/rating.js', 'Rating', '@author', 'Rating');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/rating.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/rating.js')
                setTimeout(function() {	
                    $('div[data-name="Rating"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Rating"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Rating"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/rating.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Rating"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/rating.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Rating"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Rating"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Rating"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'RatingUp v2.0',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'RatingUp v2.0',
                description: 'RatingUp v2.0'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/ratingup.js', 'RatingUp v2.0', '@author', 'RatingUp v2.0');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/ratingup.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/ratingup.js')
                setTimeout(function() {	
                    $('div[data-name="RatingUp v2.0"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="RatingUp v2.0"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="RatingUp v2.0"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/ratingup.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="RatingUp v2.0"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/ratingup.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="RatingUp v2.0"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="RatingUp v2.0"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="RatingUp v2.0"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Коментарі з HDRezka.ag',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Коментарі з HDRezka.ag',
                description: 'Коментарі з HDRezka.ag'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/rezkacomment.js', 'Коментарі з HDRezka.ag', '@author', 'Коментарі з HDRezka.ag');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/rezkacomment.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/rezkacomment.js')
                setTimeout(function() {	
                    $('div[data-name="Коментарі з HDRezka.ag"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Коментарі з HDRezka.ag"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Коментарі з HDRezka.ag"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/rezkacomment.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Коментарі з HDRezka.ag"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/rezkacomment.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Коментарі з HDRezka.ag"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Коментарі з HDRezka.ag"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Коментарі з HDRezka.ag"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Seasons',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Seasons',
                description: 'Цей плагін "SeasonBadgePlugin" для Lampa додає мітки статусу сезону на картки серіалів (зелена "S1 ✓" для завершених, жовта "S1 5/10" для незавершених з прогресом'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/seasons.js', 'Seasons', '@author', 'Seasons');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/seasons.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) {
                $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                var myResult = checkPlugin('https://zy5arc.github.io/seasons.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Seasons"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/seasons.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Seasons"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Seasons"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Seasons"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Style_torrs',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Style_torrs',
                description: 'Цей плагін для Lampa локалізує терміни озвучки/текстів (заміна російських на українські, e.g. \'Дублированный\'→\'Дубльований\', \'Ukr\'→\'Українською\'), додає кольорові стилі та обводки для торент-елементів (.torrent-item) залежно від сідів'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/style_torrs.js', 'Style_torrs', '@author', 'Style_torrs');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/style_torrs.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/style_torrs.js')
                setTimeout(function() {	
                    $('div[data-name="Style_torrs"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Style_torrs"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Style_torrs"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/style_torrs.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Style_torrs"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/style_torrs.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Style_torrs"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Style_torrs"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Style_torrs"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
       
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Style',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Style',
                description: 'кастомізує інтерфейс повного опису (full view) на \'complite\''
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/style.js', 'Style', '@author', 'Style');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/style.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/style.js')
                setTimeout(function() {	
                    $('div[data-name="Style"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Style"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Style"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/style.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Style"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/style.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Style"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Style"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Style"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Surs_quality',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Surs_quality',
                description: '"SURS_QUALITY" для Lampa додає мітку якості релізу (4K/FHD/HD/SD або \'Экранка\' для camrip) на картки фільмів у повному описі (full view)'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/surs_quality.js', 'Surs_quality', '@author', 'Surs_quality');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/surs_quality.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('')
                setTimeout(function() {	
                    $('div[data-name="Surs_quality"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Surs_quality"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Surs_quality"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/surs_quality.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Surs_quality"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/surs_quality.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Surs_quality"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Surs_quality"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Surs_quality"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });
        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Surs',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Surs',
                description: 'Cтворює унікальні підбірки фільмів та серіалів на головній сторінці, базуючись на жанрах, стримінгових сервісах, популярності'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/surs.js', 'Surs', '@author', 'Surs');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/surs.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('')
                setTimeout(function() {	
                    $('div[data-name="Surs"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Surs"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Surs"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/surs.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Surs"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/surs.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Surs"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Surs"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Surs"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'torr_styles',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'torr_styles',
                description: 'Локалізує терміни озвучки/текстів (заміна російських на українські, e.g. \'Дублированный\'→\'Дубльований\', \'Ukr\'→\'Українською\'), додає кольорові стилі для торент-елементів (.torrent-item) залежно від сідів'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/torr_styles.js', 'torr_styles', '@author', 'torr_styles');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/torr_styles.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/torr_styles.js')
                setTimeout(function() {	
                    $('div[data-name="torr_styles"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="torr_styles"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="torr_styles"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/torr_styles.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="torr_styles"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/torr_styles.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="torr_styles"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="torr_styles"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="torr_styles"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'Sisi',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'Sisi',
                description: ''
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('http://193.169.241.242:12127/sisi.js', 'Sisi');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "http://193.169.241.242:12127/sisi.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('http://193.169.241.242:12127/sisi.js')
                setTimeout(function() {
                    $('div[data-name="Sisi"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="Sisi"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="Sisi"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('http://193.169.241.242:12127/sisi.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Sisi"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'http://193.169.241.242:12127/sisi.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Sisi"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Sisi"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="Sisi"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'maxsm_series',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'maxsm_series',
                description: ''
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/maxsm_series.js', 'maxsm_series');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/maxsm_series.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/maxsm_series.js')
                setTimeout(function() {
                    $('div[data-name="maxsm_series"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="maxsm_series"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="maxsm_series"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/maxsm_series.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="maxsm_series"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/maxsm_series.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="maxsm_series"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="maxsm_series"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="maxsm_series"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'add_interface_plugin',
            param: {
                name: 'tricks',
                type: 'select',
                values: {
                    1: 'Установить',
                    2: 'Удалить',
                },
                //default: '1',
            },
            field: {
                name: 'tricks',
                description: 'Tweaks & Tricks'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/tricks.js', 'tricks', '@author', 'tricks');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/tricks.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                /*var myResult = checkPlugin('https://zy5arc.github.io/tricks.js')
                setTimeout(function() {	
                    $('div[data-name="tricks"]').append('<div class="settings-param__status one"></div>')
                    if (myResult) {
                        $('div[data-name="tricks"]').find('.settings-param__status').removeClass('active error wait').addClass('active')
                    } else {
                        $('div[data-name="tricks"]').find('.settings-param__status').removeClass('active error wait').addClass('error')
                    }
                }, 100);*/
                var myResult = checkPlugin('https://zy5arc.github.io/tricks.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="tricks"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/tricks.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="tricks"]').find('.settings-param__status').removeClass('active error').addClass('active');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="tricks"]').find('.settings-param__status').removeClass('active error').css('background-color', 'rgb(255, 165, 0)');
                    } else {
                        $('div[data-name="tricks"]').find('.settings-param__status').removeClass('active error').addClass('error');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Сохраняем элемент в переменной
                });
            }
        });

    } // /* addonStart */

    if (!!window.appready) addonStart();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') addonStart() });

})();
