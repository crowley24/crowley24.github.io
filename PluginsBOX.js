(function () {
    'use strict';

    function addonStart() {

        /*
         * * * Іконки розділів плагіна
         */
        var icon_add_plugin = '<svg version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="256px" height="256px" viewBox="0 0 512 512" xml:space="preserve" fill="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <style type="text/css">  .st0{fill:#ffffff;}  </style> <g> <path class="st0" d="M432.531,229.906c-9.906,0-19.125,2.594-27.313,6.375v-51.656c0-42.938-34.922-77.875-77.859-77.875h-51.641 c3.781-8.156,6.375-17.375,6.375-27.281C282.094,35.656,246.438,0,202.625,0c-43.828,0-79.484,35.656-79.484,79.469 c0,9.906,2.594,19.125,6.359,27.281H77.875C34.938,106.75,0,141.688,0,184.625l0.047,23.828H0l0.078,33.781 c0,23.031,8.578,36.828,12.641,42.063c12.219,15.797,27.094,18.172,34.891,18.172c11.953,0,23.141-4.953,33.203-14.703l0.906-0.422 l1.516-2.141c1.391-1.359,6.328-5.484,14.016-5.5c16.344,0,29.656,13.297,29.656,29.672c0,16.344-13.313,29.656-29.672,29.656 c-7.672,0-12.609-4.125-14-5.5l-1.516-2.141l-0.906-0.422c-10.063-9.75-21.25-14.703-33.203-14.703 c-7.797,0.016-22.672,2.375-34.891,18.172c-4.063,5.25-12.641,19.031-12.641,42.063L0,410.281h0.047L0,434.063 C0,477.063,34.938,512,77.875,512h54.563v-0.063l3.047-0.016c23.016,0,36.828-8.563,42.063-12.641 c15.797-12.219,18.172-27.094,18.172-34.891c0-11.953-4.953-23.141-14.688-33.203l-0.438-0.906l-2.125-1.516 c-1.375-1.391-5.516-6.328-5.516-14.016c0-16.344,13.313-29.656,29.672-29.656c16.344,0,29.656,13.313,29.656,29.656 c0,7.688-4.141,12.625-5.5,14.016l-2.125,1.516l-0.438,0.906c-9.75,10.063-14.703,21.25-14.703,33.203 c0,7.797,2.359,22.672,18.172,34.891c5.25,4.078,19.031,12.641,42.063,12.641l17,0.047V512h40.609 c42.938,0,77.859-34.938,77.859-77.875v-51.641c8.188,3.766,17.406,6.375,27.313,6.375c43.813,0,79.469-35.656,79.469-79.484 C512,265.563,476.344,229.906,432.531,229.906z M432.531,356.375c-19.031,0-37.469-22.063-37.469-22.063 c-3.344-3.203-6.391-4.813-9.25-4.813c-2.844,0-5.469,1.609-7.938,4.813c0,0-5.125,5.891-5.125,19.313v80.5 c0,25.063-20.313,45.391-45.391,45.391h-23.813l-33.797-0.078c-15.438,0-22.188-5.875-22.188-5.875 c-3.703-2.859-5.563-5.875-5.563-9.172c0-3.266,1.859-6.797,5.563-10.594c0,0,17.219-13.891,17.219-39.047 c0-34.313-27.844-62.156-62.156-62.156c-34.344,0-62.156,27.844-62.156,62.156c0,25.156,17.219,39.047,17.219,39.047 c3.688,3.797,5.531,7.328,5.531,10.594c0,3.297-1.844,6.313-5.531,9.172c0,0-6.766,5.875-22.203,5.875l-33.797,0.078H77.875 c-25.063,0-45.375-20.328-45.375-45.391l0.094-48.203h-0.047l0.016-9.422c0-15.422,5.875-22.203,5.875-22.203 c2.859-3.703,5.875-5.531,9.156-5.531s6.813,1.828,10.609,5.531c0,0,13.891,17.234,39.047,17.234 c34.313-0.016,62.156-27.844,62.156-62.156c-0.016-34.344-27.844-62.156-62.156-62.156c-25.156,0-39.047,17.219-39.047,17.219 c-3.797,3.688-7.328,5.531-10.609,5.531s-6.297-1.828-9.156-5.531c0,0-5.875-6.781-5.875-22.203v-1.156h0.031L32.5,184.625 c0-25.063,20.313-45.375,45.375-45.375h80.5c13.422,0,19.313-5.125,19.313-5.125c6.422-4.938,6.422-10.531,0-17.188 c0,0-22.063-18.438-22.063-37.469c0-25.953,21.047-46.984,47-46.984c25.938,0,46.984,21.031,46.984,46.984 c0,19.031-22.047,37.469-22.047,37.469c-6.438,6.656-6.438,12.25,0,17.188c0,0,5.875,5.125,19.281,5.125h80.516 c25.078,0,45.391,20.313,45.391,45.375v80.516c0,13.422,5.125,19.297,5.125,19.297c2.469,3.219,5.094,4.813,7.938,4.813 c2.859,0,5.906-1.594,9.25-4.813c0,0,18.438-22.047,37.469-22.047c25.938,0,46.969,21.047,46.969,46.984 C479.5,335.344,458.469,356.375,432.531,356.375z"></path> </g> </g></svg>';
        // var icon_add_interface_plugin = '<div class="settings-folder" style="padding:0!important"><div style="width:1.8em;height:1.3em;padding-right:.5em"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24"><path fill="currentColor" d="M18 8a2 2 0 1 1-4 0a2 2 0 0 1 4 0"/><path fill="currentColor" fill-rule="evenodd" d="M11.943 1.25h.114c2.309 0 4.118 0 5.53.19c1.444.194 2.584.6 3.479 1.494c.895.895 1.3 2.035 1.494 3.48c.19 1.411.19 3.22.19 5.529v.088c0 1.909 0 3.471-.104 4.743c-.104 1.28-.317 2.347-.795 3.235q-.314.586-.785 1.057c-.895.895-2.035 1.3-3.48 1.494c-1.411.19-3.22.19-5.529.19h-.114c-2.309 0-4.118 0-5.53-.19c-1.444-.194-2.584-.6-3.479-1.494c-.793-.793-1.203-1.78-1.42-3.006c-.215-1.203-.254-2.7-.262-4.558Q1.25 12.792 1.25 12v-.058c0-2.309 0-4.118.19-5.53c.194-1.444.6-2.584 1.494-3.479c.895-.895 2.035-1.3 3.48-1.494c1.411-.19 3.22-.19 5.529-.19m-5.33 1.676c-1.278.172-2.049.5-2.618 1.069c-.57.57-.897 1.34-1.069 2.619c-.174 1.3-.176 3.008-.176 5.386v.844l1.001-.876a2.3 2.3 0 0 1 3.141.104l4.29 4.29a2 2 0 0 0 2.564.222l.298-.21a3 3 0 0 1 3.732.225l2.83 2.547c.286-.598.455-1.384.545-2.493c.098-1.205.099-2.707.099-4.653c0-2.378-.002-4.086-.176-5.386c-.172-1.279-.5-2.05-1.069-2.62c-.57-.569-1.34-.896-2.619-1.068c-1.3-.174-3.008-.176-5.386-.176s-4.086.002-5.386.176" clip-rule="evenodd"/></svg></div><div style="font-size:1.3em">Интерфейс</div></div>';
        var nthChildIndex = null; // Оголошуємо змінну для зберігання індексу nth-child
        /* Регулярно викликані функції */
        Lampa.Storage.set('needReboot', false);
        Lampa.Storage.set('needRebootSettingExit', false);
        /* Запит на перезавантаження в модальному вікні */
        function showReload(reloadText) {
            if (document.querySelector('.modal') == null) {
                Lampa.Modal.open({
                    title: '',
                    align: 'center',
                    zIndex: 300,
                    html: $('<div class="about">' + reloadText + '</div>'),
                    buttons: [{
                        name: 'Ні', // Локалізація
                        onSelect: function onSelect() {
                            //Lampa.Modal.close();
                            $('.modal').remove();
                            Lampa.Controller.toggle('content')
                        }
                    }, {
                        name: 'Так', // Локалізація
                        onSelect: function onSelect() {
                            window.location.reload();
                        }
                    }]
                });
            }
        }
        /* Функція анімації встановлення плагіна */
        function showLoadingBar() {
            // Створюємо елемент для смуги завантаження
            var loadingBar = document.createElement('div');
            loadingBar.className = 'loading-bar';
            loadingBar.style.position = 'fixed';
            loadingBar.style.top = '50%';
            loadingBar.style.left = '50%';
            loadingBar.style.transform = 'translate(-50%, -50%)'; // Центруємо по центру
            loadingBar.style.zIndex = '9999';
            loadingBar.style.display = 'none';
            loadingBar.style.width = '30em';
            loadingBar.style.height = '2.5em';
            loadingBar.style.backgroundColor = '#595959';
            loadingBar.style.borderRadius = '4em';

            // Створюємо елемент для індикатора завантаження
            var loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.style.position = 'absolute';
            loadingIndicator.style.left = '0';
            loadingIndicator.style.top = '0';
            loadingIndicator.style.bottom = '0';
            loadingIndicator.style.width = '0';
            // === ЗМІНА: Градієнт для встановлення (Зелений) ===
            loadingIndicator.style.background = 'linear-gradient(90deg, #18a531, #64e364)';
            loadingIndicator.style.borderRadius = '4em';

            // Створюємо елемент для відображення відсотка завантаження
            var loadingPercentage = document.createElement('div');
            loadingPercentage.className = 'loading-percentage';
            loadingPercentage.style.position = 'absolute';
            loadingPercentage.style.top = '50%';
            loadingPercentage.style.left = '50%';
            loadingPercentage.style.transform = 'translate(-50%, -50%)';
            loadingPercentage.style.color = '#fff';
            loadingPercentage.style.fontWeight = 'bold';
            loadingPercentage.style.fontSize = '1.7em';

            // Додаємо елементи на сторінку
            loadingBar.appendChild(loadingIndicator);
            loadingBar.appendChild(loadingPercentage);
            document.body.appendChild(loadingBar);

            // Відображаємо смугу завантаження
            loadingBar.style.display = 'block';

            // Анімація з використанням setTimeout
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

        /* Функція анімації видалення плагіна */
        function showDeletedBar() {
            // Створюємо елемент для смуги завантаження
            var loadingBar = document.createElement('div');
            loadingBar.className = 'loading-bar';
            loadingBar.style.position = 'fixed';
            loadingBar.style.top = '50%';
            loadingBar.style.left = '50%';
            loadingBar.style.transform = 'translate(-50%, -50%)'; // Центруємо по центру
            loadingBar.style.zIndex = '9999';
            loadingBar.style.display = 'none';
            loadingBar.style.width = '30em';
            loadingBar.style.height = '2.5em';
            loadingBar.style.backgroundColor = '#595959';
            loadingBar.style.borderRadius = '4em';

            // Створюємо елемент для індикатора завантаження
            var loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.style.position = 'absolute';
            loadingIndicator.style.left = '0';
            loadingIndicator.style.top = '0';
            loadingIndicator.style.bottom = '0';
            loadingIndicator.style.width = '0';
            // === ЗМІНА: Градієнт для видалення (Червоний) ===
            loadingIndicator.style.background = 'linear-gradient(90deg, #ff2121, #c40000)';
            loadingIndicator.style.borderRadius = '4em';

            // Створюємо елемент для відображення відсотка завантаження
            var loadingPercentage = document.createElement('div');
            loadingPercentage.className = 'loading-percentage';
            loadingPercentage.style.position = 'absolute';
            loadingPercentage.style.top = '50%';
            loadingPercentage.style.left = '50%';
            loadingPercentage.style.transform = 'translate(-50%, -50%)';
            loadingPercentage.style.color = '#fff';
            loadingPercentage.style.fontWeight = 'bold';
            loadingPercentage.style.fontSize = '1.7em';

            // Додаємо елементи на сторінку
            loadingBar.appendChild(loadingIndicator);
            loadingBar.appendChild(loadingPercentage);
            document.body.appendChild(loadingBar);

            // Відображаємо смугу завантаження
            loadingBar.style.display = 'block';

            // Анімація з використанням setTimeout
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

        /* Стежимо за налаштуваннями */
        function settingsWatch() {
            /* перевіряємо прапор перезавантаження і чекаємо виходу з налаштувань */
            if (Lampa.Storage.get('needRebootSettingExit')) {
                var intervalSettings = setInterval(function () {
                    var elementSettings = $('#app > div.settings > div.settings__content.layer--height > div.settings__body > div');
                    if (!elementSettings.length > 0) {
                        clearInterval(intervalSettings);
                        showReload('Для повного видалення плагіна перезавантажте застосунок!'); // Локалізація
                    }
                }, 1000)
            }
        }
        /* Спосіб від Lampac */
        function itemON(sourceURL, sourceName, sourceAuthor, itemName) {
            if ($('DIV[data-name="' + itemName + '"]').find('.settings-param__status').hasClass('active')) {
                Lampa.Noty.show("Плагін вже встановлено!"); // Локалізація
            } else if ($('DIV[data-name="' + itemName + '"]').find('.settings-param__status').css('background-color') === 'rgb(255, 165, 0)') {
                Lampa.Noty.show("Плагін вже встановлено, але вимкнено у розширеннях!"); // Локалізація
            } else {
                // Якщо перезавантаження не вимагається - контроль після видалення плагінів
                if (!Lampa.Storage.get('needReboot')) {
                    // Отримуємо список плагінів
                    var pluginsArray = Lampa.Storage.get('plugins');
                    // Додаємо новий елемент до списку
                    pluginsArray.push({
                        "author": sourceAuthor,
                        "url": sourceURL,
                        "name": sourceName,
                        "status": 1
                    });
                    // Впроваджуємо змінений список у Лампу
                    Lampa.Storage.set('plugins', pluginsArray);
                    // Робимо ін'єкцію скрипту для негайної роботи
                    var script = document.createElement('script');
                    script.src = sourceURL;
                    document.getElementsByTagName('head')[0].appendChild(script);
                    showLoadingBar();
                    setTimeout(function () {
                        Lampa.Settings.update();
                        Lampa.Noty.show("Плагін " + sourceName + " успішно встановлено") // Локалізація
                    }, 1500);
                    setTimeout(function () {
                        if (nthChildIndex) {
                            var F = document.querySelector("#app > div.settings.animate > div.settings__content.layer--height > div.settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")");
                            Lampa.Controller.focus(F);
                            Lampa.Controller.toggle('settings_component');
                            // console.log("Установлен фокус на элемент:", F.outerHTML);
                        } else {
                            console.error("Помилка: Елемент з індексом nth-child " + nthChildIndex + " не знайдено."); // Локалізація
                        }
                    }, 2000);
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
                Lampa.Noty.show("Плагін успішно видалено"); // Локалізація
            }, 1500);
            setTimeout(function () {
                if (nthChildIndex) {
                    var F = document.querySelector("#app > div.settings.animate > div.settings__content.layer--height > div.settings__body > div > div > div > div > div:nth-child(" + nthChildIndex + ")");
                    Lampa.Controller.focus(F);
                    Lampa.Controller.toggle('settings_component');
                    // console.log("Установлен фокус на элемент:", F.outerHTML);
                } else {
                    console.error("Помилка: Елемент з індексом nth-child " + nthChildIndex + " не знайдено."); // Локалізація
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

        // Функція для отримання індексу параметра
        function focus_back(event) {
            var targetElement = event.target; // Тут ми беремо об'єкт події

            // Знаходимо батьківський елемент
            var parentElement = targetElement.parentElement;

            // Отримуємо список усіх дочірніх елементів
            var children = Array.from(parentElement.children);

            // Знаходимо індекс (0-based) поточного елемента
            var index = children.indexOf(targetElement);

            // Враховуємо, що nth-child приймає 1-based індекс
            var nthChildIndex = index + 1;

            // Виводимо знайдений індекс у консоль
            // console.log("Найденный индекс:", nthChildIndex);

            // Повертаємо знайдений елемент
            return nthChildIndex;
        }

        /* Компонент */
        Lampa.SettingsApi.addComponent({
            component: 'add_plugin',
            name: 'PluginsBox', // Локалізація
            icon: icon_add_plugin
        });
        
        /* * Блок Lampa.SettingsApi.addParam для 'add_interface_plugin' (Інтерфейс) було видалено.
         */
        Lampa.SettingsApi.addParam({
    component: 'add_plugin',
    param: {
        name: 'NewLogo 🌟', 
        type: 'select',
        values: {
            1: 'Встановити', 
            2: 'Видалити', 
        },
        //default: '1',
    },
    field: {
        name: 'NewLogo 🌟', 
        description: 'Заміна назви фільма на логотип'
    },
    onChange: function (value) {
        if (value == '1') {
            itemON('https://crowley24.github.io/NewLogo.js', 'NewLogo', '@author', 'NewLogo'); // Локалізація
            // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
        }
        if (value == '2') {
            var pluginToRemoveUrl = "https://crowley24.github.io/NewLogo.js";
            deletePlugin(pluginToRemoveUrl);
            // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
        }
    },
    onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
        var myResult = checkPlugin('https://crowley24.github.io/NewLogo.js');
        var pluginsArray = Lampa.Storage.get('plugins');
        setTimeout(function () {
            // >>> ВИПРАВЛЕНО: Додаємо індикатор до NewLogo
            $('div[data-name="NewLogo"]').append('<div class="settings-param__status one"></div>');
            var pluginStatus = null;
            for (var i = 0; i < pluginsArray.length; i++) {
                if (pluginsArray[i].url === 'https://crowley24.github.io/NewLogo.js') {
                    pluginStatus = pluginsArray[i].status;
                    break;
                }
            }
            if (myResult && pluginStatus !== 0) {
                // Встановлено та Активно (Зелений градієнт)
                $('div[data-name="NewLogo"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
            } else if (pluginStatus === 0) {
                // Відключено (Помаранчевий градієнт)
                $('div[data-name="NewLogo"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
            } else {
                // Не встановлено (Червоний градієнт)
                $('div[data-name="NewLogo"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
            }
        }, 100);
        item.on("hover:enter", function (event) {
            nthChildIndex = focus_back(event); // Зберігаємо елемент у змінній
        });
       }
      });

        Lampa.SettingsApi.addParam({
            component: 'add_plugin',
            param: {
                name: 'Якість на картках',
                type: 'select',
                values: {
                    1: 'Встановити',
                    2: 'Видалити',
                },
            },
            field: {
                name: 'Якість на картках',
                description: 'Відображення якості на постерах фільмів'
            },
            onChange: function (value, item) { 
                var pluginUrl = 'https://crowley24.github.io/quality.js';
                var pluginName = 'Якість на картках';
                var index = $(item).data('nthChildIndex'); 

                if (value == '1') {
                    itemON(pluginUrl, pluginName, '@author', pluginName, index); 
                }
                
                if (value == '2') {
                    deletePlugin(pluginUrl, index);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                var pluginUrl = 'https://crowley24.github.io/quality.js';
                var pluginName = 'Якість на картках';
                var myResult = checkPlugin(pluginUrl);
                var pluginsArray = Lampa.Storage.get('plugins');
                
                setTimeout(function () {
                    $('div[data-name="' + pluginName + '"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === pluginUrl) {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
                    } else {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
                    }
                }, 100);

                // Зберігаємо індекс локально в елементі для коректного фокусування
                item.on("hover:enter", function (event) {
                    var localNthChildIndex = focus_back(event);
                    $(this).data('nthChildIndex', localNthChildIndex);
                });
               }
              });

        Lampa.SettingsApi.addParam({
    component: 'add_plugin',
    param: {
        name: 'Годинник', // Нова назва
        type: 'select',
        values: {
            1: 'Встановити', // Локалізація
            2: 'Видалити', // Локалізація
        },
        //default: '1',
    },
    field: {
        name: 'Годинник', // Нова назва
        description: 'Стильний годинник для інтерфейсу' // Новий опис
    },
    onChange: function (value) {
        // Посилання на плагін (припускаю, що це https://crowley24.github.io/clock.js або подібне, оскільки URL не був наданий явно, але використовуємо логічну назву)
        // ВИПРАВЛЕНО: Я використав crowley24.github.io/clock.js, оскільки всі попередні були від crowley24.github.io
        if (value == '1') {
            itemON('https://crowley24.github.io/clock.js', 'Годинник', '@author', 'Годинник'); 
            // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
        }
        
        if (value == '2') {
            var pluginToRemoveUrl = "https://crowley24.github.io/clock.js";
            deletePlugin(pluginToRemoveUrl);
            // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
        }
    },
    onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
        var myResult = checkPlugin('https://crowley24.github.io/clock.js');
        var pluginsArray = Lampa.Storage.get('plugins');
        setTimeout(function () {
            // Додаємо індикатор для 'Годинник'
            $('div[data-name="Годинник"]').append('<div class="settings-param__status one"></div>');
            var pluginStatus = null;
            for (var i = 0; i < pluginsArray.length; i++) {
                // Перевіряємо за URL
                if (pluginsArray[i].url === 'https://crowley24.github.io/clock.js') {
                    pluginStatus = pluginsArray[i].status;
                    break;
                }
            }
            if (myResult && pluginStatus !== 0) {
                // Встановлено та Активно (Зелений градієнт)
                $('div[data-name="Годинник"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
            } else if (pluginStatus === 0) {
                // Відключено (Помаранчевий градієнт)
                $('div[data-name="Годинник"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
            } else {
                // Не встановлено (Червоний градієнт)
                $('div[data-name="Годинник"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
            }
        }, 100);
        item.on("hover:enter", function (event) {
            nthChildIndex = focus_back(event); // Зберігаємо елемент у змінній
        });
       }
      });

                 /* Блок 2: Кольоровий рейтинг */
        Lampa.SettingsApi.addParam({
            component: 'add_plugin',
            param: {
                name: 'Кольоровий рейтинг', // Нова назва
                type: 'select',
                values: {
                    1: 'Встановити', // Локалізація
                    2: 'Видалити', // Локалізація
                },
            },
            field: {
                name: 'Кольоровий рейтинг', // Нова назва
                description: 'Кольоровий рейтинг на картках фільмів' // Новий опис
            },
            // !!! ВИПРАВЛЕННЯ 1: Приймаємо item як другий аргумент
            onChange: function (value, item) { 
                var pluginUrl = 'https://crowley24.github.io/colored_ratings.js';
                
                // !!! ВИПРАВЛЕННЯ 2: Отримуємо індекс локально з елемента item
                var index = $(item).data('nthChildIndex'); 

                if (value == '1') {
                    // !!! ВИПРАВЛЕННЯ 3: Передаємо index у функцію
                    itemON(pluginUrl, 'Кольоровий рейтинг', '@author', 'Кольоровий рейтинг', index); 
                }
                
                if (value == '2') {
                    var pluginToRemoveUrl = pluginUrl;
                    // !!! ВИПРАВЛЕННЯ 4: Передаємо index у функцію
                    deletePlugin(pluginToRemoveUrl, index);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                var pluginUrl = 'https://crowley24.github.io/colored_ratings.js';
                var myResult = checkPlugin(pluginUrl);
                var pluginsArray = Lampa.Storage.get('plugins');
                
                setTimeout(function () {
                    $('div[data-name="Кольоровий рейтинг"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === pluginUrl) {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="Кольоровий рейтинг"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="Кольоровий рейтинг"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
                    } else {
                        $('div[data-name="Кольоровий рейтинг"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
                    }
                }, 100);

                // !!! ВИПРАВЛЕННЯ 5: Зберігаємо індекс ЛОКАЛЬНО в елементі, а не в глобальній змінній.
                item.on("hover:enter", function (event) {
                    var localNthChildIndex = focus_back(event); 
                    $(this).data('nthChildIndex', localNthChildIndex); // Зберігаємо в data-атрибуті елемента
                });
               }
              });
        
    Lampa.SettingsApi.addParam({
    component: 'add_plugin',
    param: {
        name: 'Шрифти', // Нова назва
        type: 'select',
        values: {
            1: 'Встановити', // Локалізація
            2: 'Видалити', // Локалізація
        },
        //default: '1',
    },
    field: {
        name: 'Шрифти', // Нова назва
        description: 'Новий шрифт для інтерфейсу' // Новий опис
    },
    onChange: function (value) {
        // Посилання на плагін
        var pluginUrl = 'https://crowley24.github.io/Fonts.js';
        
        if (value == '1') {
            itemON(pluginUrl, 'Шрифти', '@author', 'Шрифти'); 
            // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
        }
        
        if (value == '2') {
            var pluginToRemoveUrl = pluginUrl;
            deletePlugin(pluginToRemoveUrl);
            // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
        }
    },
    onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
        var pluginUrl = 'https://crowley24.github.io/Fonts.js';
        var myResult = checkPlugin(pluginUrl);
        var pluginsArray = Lampa.Storage.get('plugins');
        setTimeout(function () {
            // Додаємо індикатор для 'Шрифти'
            $('div[data-name="Шрифти"]').append('<div class="settings-param__status one"></div>');
            var pluginStatus = null;
            for (var i = 0; i < pluginsArray.length; i++) {
                // Перевіряємо за URL
                if (pluginsArray[i].url === pluginUrl) {
                    pluginStatus = pluginsArray[i].status;
                    break;
                }
            }
            if (myResult && pluginStatus !== 0) {
                // Встановлено та Активно (Зелений градієнт)
                $('div[data-name="Шрифти"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
            } else if (pluginStatus === 0) {
                // Відключено (Помаранчевий градієнт)
                $('div[data-name="Шрифти"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
            } else {
                // Не встановлено (Червоний градієнт)
                $('div[data-name="Шрифти"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
            }
        }, 100);
        item.on("hover:enter", function (event) {
            nthChildIndex = focus_back(event); // Зберігаємо елемент у змінній
        });
       }
      });

        Lampa.SettingsApi.addParam({
    component: 'add_plugin',
    param: {
        name: 'Приховання інтерфейсу', // Нова назва
        type: 'select',
        values: {
            1: 'Встановити', // Локалізація
            2: 'Видалити', // Локалізація
        },
        //default: '1',
    },
    field: {
        name: 'Приховання інтерфейсу', // Нова назва
        description: 'Приховати елементи інтерфейсу' // Новий опис
    },
    onChange: function (value) {
        // Посилання на плагін
        var pluginUrl = 'https://crowley24.github.io/Interface_hide.js';
        
        if (value == '1') {
            itemON(pluginUrl, 'Приховання інтерфейсу', '@author', 'Приховання інтерфейсу'); 
            // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
        }
        
        if (value == '2') {
            var pluginToRemoveUrl = pluginUrl;
            deletePlugin(pluginToRemoveUrl);
            // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
        }
    },
    onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
        var pluginUrl = 'https://crowley24.github.io/Interface_hide.js';
        var myResult = checkPlugin(pluginUrl);
        var pluginsArray = Lampa.Storage.get('plugins');
        setTimeout(function () {
            // Додаємо індикатор для 'Приховання інтерфейсу'
            $('div[data-name="Приховання інтерфейсу"]').append('<div class="settings-param__status one"></div>');
            var pluginStatus = null;
            for (var i = 0; i < pluginsArray.length; i++) {
                // Перевіряємо за URL
                if (pluginsArray[i].url === pluginUrl) {
                    pluginStatus = pluginsArray[i].status;
                    break;
                }
            }
            if (myResult && pluginStatus !== 0) {
                // Встановлено та Активно (Зелений градієнт)
                $('div[data-name="Приховання інтерфейсу"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
            } else if (pluginStatus === 0) {
                // Відключено (Помаранчевий градієнт)
                $('div[data-name="Приховання інтерфейсу"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
            } else {
                // Не встановлено (Червоний градієнт)
                $('div[data-name="Приховання інтерфейсу"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
            }
        }, 100);
        item.on("hover:enter", function (event) {
            nthChildIndex = focus_back(event); // Зберігаємо елемент у змінній
        });
       }
      });
         
        Lampa.SettingsApi.addParam({
    component: 'add_plugin',
    param: {
        name: 'My Bookmarks', // Нова назва
        type: 'select',
        values: {
            1: 'Встановити', // Локалізація
            2: 'Видалити', // Локалізація
        },
        //default: '1',
    },
    field: {
        name: 'My Bookmarks', // Нова назва
        description: 'Кастомні закладки з обраними фільмами' // Новий опис
    },
    onChange: function (value) {
        // Нове посилання на плагін
        if (value == '1') {
            itemON('https://crowley24.github.io/bookmarks.js', 'My Bookmarks', '@author', 'My Bookmarks'); 
            // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
        }
        // Нове посилання на плагін для видалення
        if (value == '2') {
            var pluginToRemoveUrl = "https://crowley24.github.io/bookmarks.js";
            deletePlugin(pluginToRemoveUrl);
            // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
        }
    },
    onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
        var myResult = checkPlugin('https://crowley24.github.io/bookmarks.js');
        var pluginsArray = Lampa.Storage.get('plugins');
        setTimeout(function () {
            // Додаємо індикатор для 'My Bookmarks'
            $('div[data-name="My Bookmarks"]').append('<div class="settings-param__status one"></div>');
            var pluginStatus = null;
            for (var i = 0; i < pluginsArray.length; i++) {
                // Перевіряємо за новим URL
                if (pluginsArray[i].url === 'https://crowley24.github.io/bookmarks.js') {
                    pluginStatus = pluginsArray[i].status;
                    break;
                }
            }
            if (myResult && pluginStatus !== 0) {
                // Встановлено та Активно (Зелений градієнт)
                $('div[data-name="My Bookmarks"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
            } else if (pluginStatus === 0) {
                // Відключено (Помаранчевий градієнт)
                $('div[data-name="My Bookmarks"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
            } else {
                // Не встановлено (Червоний градієнт)
                $('div[data-name="My Bookmarks"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
            }
        }, 100);
        item.on("hover:enter", function (event) {
            nthChildIndex = focus_back(event); // Зберігаємо елемент у змінній
        });
       }
      });

Lampa.SettingsApi.addParam({
    component: 'add_plugin',
    param: {
        name: 'UA_Finder', // Нова назва
        type: 'select',
        values: {
            1: 'Встановити', // Локалізація
            2: 'Видалити', // Локалізація
        },
        //default: '1',
    },
    field: {
        name: 'UA_Finder', // Нова назва
        description: 'Плашка на постерах з українським дубляжем' // Новий опис
    },
    onChange: function (value) {
        // Нове посилання на плагін
        if (value == '1') {
            itemON('https://crowley24.github.io/UA-Finder+Mod.js', 'UA_Finder', '@author', 'UA_Finder'); 
            // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
        }
        // Нове посилання на плагін для видалення
        if (value == '2') {
            var pluginToRemoveUrl = "https://crowley24.github.io/UA-Finder+Mod.js";
            deletePlugin(pluginToRemoveUrl);
            // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
        }
    },
    onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
        var myResult = checkPlugin('https://crowley24.github.io/UA-Finder+Mod.js');
        var pluginsArray = Lampa.Storage.get('plugins');
        setTimeout(function () {
            // Додаємо індикатор для 'UA_Finder'
            $('div[data-name="UA_Finder"]').append('<div class="settings-param__status one"></div>');
            var pluginStatus = null;
            for (var i = 0; i < pluginsArray.length; i++) {
                // Перевіряємо за новим URL
                if (pluginsArray[i].url === 'https://crowley24.github.io/UA-Finder+Mod.js') {
                    pluginStatus = pluginsArray[i].status;
                    break;
                }
            }
            if (myResult && pluginStatus !== 0) {
                // Встановлено та Активно (Зелений градієнт)
                $('div[data-name="UA_Finder"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
            } else if (pluginStatus === 0) {
                // Відключено (Помаранчевий градієнт)
                $('div[data-name="UA_Finder"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
            } else {
                // Не встановлено (Червоний градієнт)
                $('div[data-name="UA_Finder"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
            }
        }, 100);
        item.on("hover:enter", function (event) {
            nthChildIndex = focus_back(event); // Зберігаємо елемент у змінній
        });
       }
      });
        
          Lampa.SettingsApi.addParam({
            component: 'add_plugin',
            param: {
                name: 'Rating_omdb', 
                type: 'select',
                values: {
                    1: 'Встановити', // Локалізація
                    2: 'Видалити', // Локалізація
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
                        // Встановлено та Активно (Зелений градієнт)
                        $('div[data-name="Rating_omdb"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
                    } else if (pluginStatus === 0) {
                        // Відключено (Помаранчевий градієнт)
                        $('div[data-name="Rating_omdb"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
                    } else {
                        // Не встановлено (Червоний градієнт)
                        $('div[data-name="Rating_omdb"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Зберігаємо елемент у змінній
                });
               }
              });

        Lampa.SettingsApi.addParam({
            component: 'add_plugin',
            param: {
                name: 'TMDB_Mod',
                type: 'select',
                values: {
                    1: 'Встановити',
                    2: 'Видалити',
                },
            },
            field: {
                name: 'TMDB_Mod',
                description: 'Додає додаткове джерело TMDB з елементами персоналізації'
            },
            onChange: function (value, item) { 
                var pluginUrl = 'https://crowley24.github.io/TMDB_Mod.js';
                var pluginName = 'TMDB_Mod';
                var index = $(item).data('nthChildIndex'); 

                if (value == '1') {
                    itemON(pluginUrl, pluginName, '@author', pluginName, index); 
                }
                
                if (value == '2') {
                    deletePlugin(pluginUrl, index);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                var pluginUrl = 'https://crowley24.github.io/TMDB_Mod.js';
                var pluginName = 'TMDB_Mod';
                var myResult = checkPlugin(pluginUrl);
                var pluginsArray = Lampa.Storage.get('plugins');
                
                setTimeout(function () {
                    $('div[data-name="' + pluginName + '"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === pluginUrl) {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
                    } else {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
                    }
                }, 100);

                // Зберігаємо індекс локально в елементі для коректного фокусування
                item.on("hover:enter", function (event) {
                    var localNthChildIndex = focus_back(event);
                    $(this).data('nthChildIndex', localNthChildIndex);
                });
               }
              });
        
        Lampa.SettingsApi.addParam({
            component: 'add_plugin',
            param: {
                name: 'Коментарі з HDRezka.ag',
                type: 'select',
                values: {
                    1: 'Встановити', // Локалізація
                    2: 'Видалити', // Локалізація
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
                        // Встановлено та Активно (Зелений градієнт)
                        $('div[data-name="Коментарі з HDRezka.ag"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
                    } else if (pluginStatus === 0) {
                        // Відключено (Помаранчевий градієнт)
                        $('div[data-name="Коментарі з HDRezka.ag"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
                    } else {
                        // Не встановлено (Червоний градієнт)
                        $('div[data-name="Коментарі з HDRezka.ag"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Зберігаємо елемент у змінній
                });
               }
              });

        Lampa.SettingsApi.addParam({
            component: 'add_plugin',
            param: {
                name: 'Стильний інтерфейс',
                type: 'select',
                values: {
                    1: 'Встановити',
                    2: 'Видалити',
                },
            },
            field: {
                name: 'Стильний інтерфейс',
                description: 'Змінює звичний інтерфейс головної сторінки на новий інтерфейс у стилі Netflix'
            },
            onChange: function (value, item) { 
                var pluginUrl = 'https://crowley24.github.io/Style_Interface.js';
                var pluginName = 'Стильний інтерфейс';
                var index = $(item).data('nthChildIndex'); 

                if (value == '1') {
                    itemON(pluginUrl, pluginName, '@author', pluginName, index); 
                }
                
                if (value == '2') {
                    deletePlugin(pluginUrl, index);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                var pluginUrl = 'https://crowley24.github.io/Style_Interface.js';
                var pluginName = 'Стильний інтерфейс';
                var myResult = checkPlugin(pluginUrl);
                var pluginsArray = Lampa.Storage.get('plugins');
                
                setTimeout(function () {
                    $('div[data-name="' + pluginName + '"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === pluginUrl) {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
                    } else {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
                    }
                }, 100);

                // Зберігаємо індекс локально в елементі для коректного фокусування
                item.on("hover:enter", function (event) {
                    var localNthChildIndex = focus_back(event);
                    $(this).data('nthChildIndex', localNthChildIndex);
                });
               }
              });

        Lampa.SettingsApi.addParam({
            component: 'add_plugin',
            param: {
                name: 'Стильний інтерфейс ( моб. версія)',
                type: 'select',
                values: {
                    1: 'Встановити',
                    2: 'Видалити',
                },
            },
            field: {
                name: 'Стильний інтерфейс ( моб. версія)',
                description: 'Стильний інтерфейс + логотипи замість назви в картці фільму на мобільних пристроях'
            },
            onChange: function (value, item) { 
                var pluginUrl = 'https://crowley24.github.io/logo+mob.js';
                var pluginName = 'Стильний інтерфейс ( моб. версія)';
                var index = $(item).data('nthChildIndex'); 

                if (value == '1') {
                    itemON(pluginUrl, pluginName, '@author', pluginName, index); 
                }
                
                if (value == '2') {
                    deletePlugin(pluginUrl, index);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                var pluginUrl = 'https://crowley24.github.io/logo+mob.js';
                var pluginName = 'Стильний інтерфейс ( моб. версія)';
                var myResult = checkPlugin(pluginUrl);
                var pluginsArray = Lampa.Storage.get('plugins');
                
                setTimeout(function () {
                    $('div[data-name="' + pluginName + '"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === pluginUrl) {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
                    } else if (pluginStatus === 0) {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
                    } else {
                        $('div[data-name="' + pluginName + '"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
                    }
                }, 100);

                // Зберігаємо індекс локально в елементі для коректного фокусування
                item.on("hover:enter", function (event) {
                    var localNthChildIndex = focus_back(event);
                    $(this).data('nthChildIndex', localNthChildIndex);
                });
               }
              });
        
        Lampa.SettingsApi.addParam({
            component: 'add_plugin',
            param: {
                name: 'Tweaks & Tricks', // Залишаю оригінальну назву англійською для плагіна
                type: 'select',
                values: {
                    1: 'Встановити', // Локалізація
                    2: 'Видалити', // Локалізація
                },
                //default: '1',
            },
            field: {
                name: 'Tweaks & Tricks', // Залишаю оригінальну назву англійською для плагіна
                description: 'Tweaks & Tricks'
            },
            onChange: function (value) {
                if (value == '1') {
                    itemON('https://zy5arc.github.io/tricks.js', 'Tweaks & Tricks', '@author', 'Tweaks & Tricks');
                    // console.log("nthChildIndex, переданный в itemON:", nthChildIndex);
                }
                if (value == '2') {
                    var pluginToRemoveUrl = "https://zy5arc.github.io/tricks.js";
                    deletePlugin(pluginToRemoveUrl);
                    // console.log("nthChildIndex, переданный в deletePlugin:", nthChildIndex);
                }
            },
            onRender: function (item) { $('.settings-param__name', item).css('color', 'f3d900'); hideInstall()
                var myResult = checkPlugin('https://zy5arc.github.io/tricks.js');
                var pluginsArray = Lampa.Storage.get('plugins');
                setTimeout(function () {
                    $('div[data-name="Tweaks & Tricks"]').append('<div class="settings-param__status one"></div>');
                    var pluginStatus = null;
                    for (var i = 0; i < pluginsArray.length; i++) {
                        if (pluginsArray[i].url === 'https://zy5arc.github.io/tricks.js') {
                            pluginStatus = pluginsArray[i].status;
                            break;
                        }
                    }
                    if (myResult && pluginStatus !== 0) {
                        // Встановлено та Активно (Зелений градієнт)
                        $('div[data-name="Tweaks & Tricks"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #11e400, #36a700)');
                    } else if (pluginStatus === 0) {
                        // Відключено (Помаранчевий градієнт)
                        $('div[data-name="Tweaks & Tricks"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff8c00, #d96e00)');
                    } else {
                        // Не встановлено (Червоний градієнт)
                        $('div[data-name="Tweaks & Tricks"]').find('.settings-param__status').removeClass('active error').css('background', 'linear-gradient(45deg, #ff0000, #c40000)');
                    }
                }, 100);
                item.on("hover:enter", function (event) {
                    nthChildIndex = focus_back(event); // Зберігаємо елемент у змінній
                });
            }
        });

    } // /* addonStart */

    if (!!window.appready) addonStart();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') addonStart() });

})();

