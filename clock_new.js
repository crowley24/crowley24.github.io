(function() {  
    'use strict';  
  
    // == Lampac Clock Style Plugin ==  
    // Годинник з різними стилями та налаштуваннями  
  
    // Додавання локалізації  
    Lampa.Lang.add({  
        clock_style_title: {  
            en: 'Clock style',  
            uk: 'Стиль годинника',  
            ru: 'Стиль часов'  
        },  
        clock_style_classic: {  
            en: 'Classic (White hours, Orange minutes)',  
            uk: 'Класичний (Білі години, Помаранчеві хвилини)',  
            ru: 'Классический (Белые часы, Оранжевые минуты)'  
        },  
        clock_style_gold: {  
            en: 'Gold Gradient',  
            uk: 'Золотий градієнт',  
            ru: 'Золотой градиент'  
        },  
        clock_style_neon: {  
            en: 'Neon Blue',  
            uk: 'Неоновий синій',  
            ru: 'Неоновый синий'  
        },  
        clock_style_rainbow: {  
            en: 'Rainbow',  
            uk: 'Веселка',  
            ru: 'Радуга'  
        },  
        clock_style_minimal: {  
            en: 'Minimal White',  
            uk: 'Мінімалістичний білий',  
            ru: 'Минималистичный белый'  
        },  
        clock_enable_title: {  
            en: 'Custom clock styles',  
            uk: 'Кастомні стилі годинника',  
            ru: 'Кастомные стили часов'  
        }  
    });  
  
    // Налаштування увімкнення плагіна  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'clock_custom_enable',  
            type: 'select',  
            values: {  
                '0': Lampa.Lang.translate('settings_param_no'),  
                '1': Lampa.Lang.translate('settings_param_yes')  
            },  
            default: '0'  
        },  
        field: {  
            name: Lampa.Lang.translate('clock_enable_title')  
        }  
    });  
  
    // Налаштування стилю годинника  
    Lampa.SettingsApi.addParam({  
        component: 'interface',  
        param: {  
            name: 'clock_style',  
            type: 'select',  
            values: {  
                'classic': Lampa.Lang.translate('clock_style_classic'),  
                'gold': Lampa.Lang.translate('clock_style_gold'),  
                'neon': Lampa.Lang.translate('clock_style_neon'),  
                'rainbow': Lampa.Lang.translate('clock_style_rainbow'),  
                'minimal': Lampa.Lang.translate('clock_style_minimal')  
            },  
            default: 'classic'  
        },  
        field: {  
            name: Lampa.Lang.translate('clock_style_title'),  
            show: function () {  
                return Lampa.Storage.get('clock_custom_enable') === '1';  
            }  
        }  
    });  
  
    function createClock() {  
        // Перевіряємо чи увімкнений плагін  
        if (Lampa.Storage.get('clock_custom_enable') !== '1') {  
            return;  
        }  
  
        // Знаходимо стандартний годинник  
        let oldClock = document.querySelector('.head__time');  
        if (!oldClock) {  
            console.warn('[ClockPlugin] .head__time не знайдено');  
            return;  
        }  
  
        // Якщо вже є наш годинник — не додаємо вдруге  
        if (document.querySelector('#custom-clock')) return;  
  
        // Створюємо контейнер для годинника  
        const clock = document.createElement('div');  
        clock.id = 'custom-clock';  
        clock.style.display = 'flex';  
        clock.style.alignItems = 'center';  
        clock.style.fontFamily = 'Segoe UI, Roboto, sans-serif';  
        clock.style.fontWeight = '700'; // Жирніший шрифт (було 600)  
        clock.style.fontSize = '1.8em';  
        clock.style.whiteSpace = 'nowrap';  
  
        // Створюємо елемент для часу  
        const timeDisplay = document.createElement('div');  
        timeDisplay.style.display = 'flex';  
        timeDisplay.style.alignItems = 'baseline';  
  
        // Додаємо тільки час до контейнера  
        clock.appendChild(timeDisplay);  
  
        // Вставляємо годинник замість стандартного  
        oldClock.parentNode.replaceChild(clock, oldClock);  
  
        // Функція застосування стилю  
        function applyStyle(hours, minutes) {  
            const style = Lampa.Storage.get('clock_style', 'classic');  
              
            switch(style) {  
                case 'classic':  
                    // Білі години, помаранчеві хвилини  
                    timeDisplay.innerHTML = `  
                        <span style="color:#ffffff; font-size:1em;">${hours}</span>  
                        <span style="color:#ff9100; font-size:1em;">:${minutes}</span>  
                    `;  
                    break;  
                      
                case 'gold':  
                    // Золотий градієнт  
                    timeDisplay.innerHTML = `  
                        <span style="background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);   
                                     -webkit-background-clip: text;   
                                     -webkit-text-fill-color: transparent;  
                                     background-clip: text;  
                                     font-size:1em;">${hours}:${minutes}</span>  
                    `;  
                    break;  
                      
                case 'neon':  
                    // Неоновий синій з ефектом світіння  
                    timeDisplay.innerHTML = `  
                        <span style="color:#00d9ff;   
                                     text-shadow: 0 0 10px #00d9ff, 0 0 20px #00d9ff, 0 0 30px #00d9ff;  
                                     font-size:1em;">${hours}:${minutes}</span>  
                    `;  
                    break;  
                      
                case 'rainbow':  
                    // Веселковий градієнт  
                    timeDisplay.innerHTML = `  
                        <span style="background: linear-gradient(90deg, #ff0000 0%, #ff7f00 16%, #ffff00 33%, #00ff00 50%, #0000ff 66%, #4b0082 83%, #9400d3 100%);   
                                     -webkit-background-clip: text;   
                                     -webkit-text-fill-color: transparent;  
                                     background-clip: text;  
                                     font-size:1em;  
                                     animation: rainbow-shift 3s linear infinite;">  
                            ${hours}:${minutes}  
                        </span>  
                    `;  
                    break;  
                      
                case 'minimal':  
                    // Мінімалістичний білий  
                    timeDisplay.innerHTML = `  
                        <span style="color:#ffffff;   
                                     font-size:1em;  
                                     opacity:0.9;">${hours}:${minutes}</span>  
                    `;  
                    break;  
                      
                default:  
                    timeDisplay.innerHTML = `  
                        <span style="color:#ffffff; font-size:1em;">${hours}</span>  
                        <span style="color:#ff9100; font-size:1em;">:${minutes}</span>  
                    `;  
            }  
        }  
  
        // Додаємо CSS анімацію для веселкового стилю  
        if (!document.getElementById('clock-rainbow-animation')) {  
            const style = document.createElement('style');  
            style.id = 'clock-rainbow-animation';  
            style.textContent = `  
                @keyframes rainbow-shift {  
                    0% { filter: hue-rotate(0deg); }  
                    100% { filter: hue-rotate(360deg); }  
                }  
            `;  
            document.head.appendChild(style);  
        }  
  
        // Оновлення часу  
        function updateClock() {  
            const now = new Date();  
            let h = now.getHours().toString().padStart(2, '0');  
            let m = now.getMinutes().toString().padStart(2, '0');  
            applyStyle(h, m);  
        }  
  
        updateClock();  
        setInterval(updateClock, 1000);  
    }  
  
    // Функція перезапуску годинника при зміні налаштувань  
    function restartClock() {  
        const existingClock = document.querySelector('#custom-clock');  
        if (existingClock) {  
            existingClock.remove();  
        }  
          
        // Відновлюємо стандартний годинник якщо плагін вимкнено  
        if (Lampa.Storage.get('clock_custom_enable') !== '1') {  
            const oldClock = document.querySelector('.head__time');  
            if (oldClock) {  
                oldClock.style.display = '';  
            }  
        } else {  
            setTimeout(createClock, 100);  
        }  
    }  
  
    // Запуск після завантаження Lampa  
    if (window.Lampa && window.Lampa.Listener) {  
        Lampa.Listener.follow('app', function(e) {  
            if (e.type === 'ready') {  
                setTimeout(createClock, 1000);  
            }  
        });  
          
        // Слухач зміни налаштувань  
        Lampa.Storage.listener.follow('change', function(e) {  
            if (e.name === 'clock_custom_enable' || e.name === 'clock_style') {  
                restartClock();  
            }  
        });  
    } else {  
        // Fallback для старих версій  
        document.addEventListener('DOMContentLoaded', function() {  
            setTimeout(createClock, 3000);  
        });  
    }  
})();
