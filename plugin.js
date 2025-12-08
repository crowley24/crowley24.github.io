(function () {
  'use strict';

  // Конфігурація джерел
  const SOURCES = [
    { id: 'tmdb', title: 'TMDB' },
    { id: 'cub', title: 'CUB' },
    { id: 'trakt', title: 'TRAKT' }
  ];

  const STORAGE_KEY = 'source_switcher_selected';
  const BUTTON_CLASS = 'source-switcher-btn';

  // Безпечна робота зі сховищем (Lampa.Storage або localStorage)
  function getSelected() {
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Storage && typeof Lampa.Storage.get === 'function') {
        return Lampa.Storage.get(STORAGE_KEY, 'tmdb') || 'tmdb';
      } else if (window.localStorage) {
        return localStorage.getItem(STORAGE_KEY) || 'tmdb';
      }
    } catch (e) {
      // ignore
    }
    return 'tmdb';
  }

  function setSelected(id) {
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Storage && typeof Lampa.Storage.set === 'function') {
        Lampa.Storage.set(STORAGE_KEY, id);
      } else if (window.localStorage) {
        localStorage.setItem(STORAGE_KEY, id);
      }
    } catch (e) {
      // ignore
    }
  }

  // Показ меню вибору джерела (через Lampa.Select, якщо доступний)
  function showMenu() {
    const selected = getSelected();

    const items = SOURCES.map(src => ({
      title: (src.id === selected ? '✔ ' : '') + src.title,
      source_id: src.id,
      rawTitle: src.title
    }));

    if (typeof Lampa !== 'undefined' && Lampa.Select && typeof Lampa.Select.show === 'function') {
      Lampa.Select.show({
        title: 'Перемикач джерел',
        items,
        onSelect(item) {
          setSelected(item.source_id);
          updateButton();
          if (typeof Lampa !== 'undefined' && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
            Lampa.Noty.show('Джерело: ' + item.rawTitle);
          } else {
            // невелика fallback підказка у консоль
            console.log('[Source Switcher] Джерело: ' + item.rawTitle);
          }
        }
      });
    } else {
      // fallback — простий prompt (якщо Lampa.Select немає)
      const names = items.map((it, i) => `${i + 1}. ${it.title}`).join('\n');
      const choice = prompt('Виберіть джерело:\n' + names);
      const idx = parseInt(choice, 10) - 1;
      if (!Number.isNaN(idx) && items[idx]) {
        setSelected(items[idx].source_id);
        updateButton();
      }
    }
  }

  // Створює кнопку; використовує простий SVG, щоб уникнути проблем з innerHTML
  function createButton() {
    const btn = document.createElement('div');
    btn.className = `head__action ${BUTTON_CLASS}`;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', 'Перемикач джерел');

    // Валідний простий SVG (круг — замініть на свій за потреби)
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9"></circle>
        <text x="12" y="16" font-size="8" text-anchor="middle" fill="#fff">SRC</text>
      </svg>
    `;

    // Показ підказки з обраним джерелом
    const setTitle = () => {
      const sel = getSelected();
      const found = SOURCES.find(s => s.id === sel);
      btn.title = found ? `Джерело: ${found.title}` : 'Перемикач джерел';
      btn.style.opacity = sel === 'tmdb' ? '1' : '0.9';
    };

    setTitle();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showMenu();
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showMenu();
      }
    });

    // При зміні вибору (якщо Lampa має events) можна оновлювати підказку
    // Але ми оновлюємо кнопку при кожному відкритті меню / встановленні.
    return { btn, setTitle };
  }

  // Оновлення кнопки: підказка, стиль
  function updateButton() {
    const el = document.querySelector(`.${BUTTON_CLASS}`);
    if (!el) return;
    const sel = getSelected();
    const found = SOURCES.find(s => s.id === sel);
    el.title = found ? `Джерело: ${found.title}` : 'Перемикач джерел';
    el.style.opacity = sel === 'tmdb' ? '1' : '0.9';
  }

  // Додавання кнопки до інтерфейсу
  function addButton() {
    try {
      // вже є кнопка
      if (document.querySelector(`.${BUTTON_CLASS}`)) return;

      const header = document.querySelector('.head');
      if (!header) return;

      const actions = header.querySelector('.head__actions') || header.querySelector('.head__right') || header;
      if (!actions) return;

      const created = createButton();
      // вставляємо перед першою дією (біля пошуку/аккаунту)
      actions.prepend(created.btn);
      // оновлюємо підказку/зовнішній вигляд після додавання
      created.setTitle();
      console.log('[Source Switcher] Кнопку додано');
    } catch (e) {
      console.error('[Source Switcher] addButton error', e);
    }
  }

  // Спроби додати кнопку декілька разів + слідкування за DOM змін
  function tryAddButton() {
    // Кілька таймаутів на початку (коли інтерфейс ще завантажується)
    [0, 200, 800, 1500].forEach(delay => setTimeout(addButton, delay));

    // MutationObserver: реагує на динамічне оновлення DOM (якщо Lampa рендерить заново)
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        addButton();
      });
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
      });

      // Якщо Lampa доступна та має подію 'render' — також слухаємо її, але observer лишаємо
      setTimeout(() => {
        // після стабільності сторінки можна відключити observer, але краще лишити, бо інтерфейс може перерендеритись
      }, 5000);
    }
  }

  // Ініціалізація плагіна
  function init() {
    console.log('[Source Switcher] Ініціалізація плагіна...');

    // Слухаємо події Lampa, якщо вони є
    if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
      Lampa.Listener.follow('full', function (event) {
        if (event && event.type === 'render') {
          setTimeout(addButton, 100);
        }
      });

      Lampa.Listener.follow('app', function (event) {
        if (event && event.type === 'ready') {
          setTimeout(addButton, 200);
        }
      });
    }

    // Початкові спроби та observer
    tryAddButton();

    // Також при повному завантаженні DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryAddButton);
    } else {
      tryAddButton();
    }
  }

  // Запуск
  init();

})();