(function () {
  'use strict';

  // === Налаштуйте тут свої реальні джерела ===
  // Змініть масив на ті id, які реально є у вас в Лампі
  const SOURCES = [
    { id: 'tmdb', title: 'TMDB' },
    { id: 'cub', title: 'CUB' }
    // { id: 'trakt', title: 'TRAKT' } // видаліть, якщо у вас його немає
  ];

  const STORAGE_KEY = 'source_switcher_selected';
  const BUTTON_CLASS = 'source-switcher-btn';

  // Безпечна робота зі сховищем
  function getSelected() {
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Storage && typeof Lampa.Storage.get === 'function') {
        return Lampa.Storage.get(STORAGE_KEY, 'tmdb') || 'tmdb';
      } else if (window.localStorage) {
        return localStorage.getItem(STORAGE_KEY) || 'tmdb';
      }
    } catch (e) {}
    return 'tmdb';
  }

  function setSelected(id) {
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Storage && typeof Lampa.Storage.set === 'function') {
        Lampa.Storage.set(STORAGE_KEY, id);
      } else if (window.localStorage) {
        localStorage.setItem(STORAGE_KEY, id);
      }
    } catch (e) {}

    // Повідомляємо інших про зміну — кількома шляхами (безпечно)
    try {
      // 1) Локальна подія (універсальна) — інші скрипти можуть слухати
      window.dispatchEvent(new CustomEvent('source_switcher_changed', { detail: { id } }));
    } catch (e) {}

    try {
      // 2) Якщо у Lampa є механізм повідомлень — пробуємо викликати (якщо існує)
      if (typeof Lampa !== 'undefined') {
        if (Lampa.Noty && typeof Lampa.Noty.show === 'function') {
          Lampa.Noty.show('Джерело: ' + id);
        }
        // Якщо у Lampa.Listener є send/trigger — пробуємо
        if (Lampa.Listener) {
          if (typeof Lampa.Listener.send === 'function') {
            Lampa.Listener.send('source_switcher.changed', { id });
          } else if (typeof Lampa.Listener.trigger === 'function') {
            Lampa.Listener.trigger('source_switcher.changed', { id });
          }
        }
      }
    } catch (e) {}
  }

  // Відкриває меню вибору (Lampa.Select або fallback)
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
        }
      });
    } else {
      // простий fallback (prompt)
      const names = items.map((it, i) => `${i + 1}. ${it.title}`).join('\n');
      const choice = prompt('Виберіть джерело:\n' + names);
      const idx = parseInt(choice, 10) - 1;
      if (!Number.isNaN(idx) && items[idx]) {
        setSelected(items[idx].source_id);
        updateButton();
      }
    }
  }

  // Створення кнопки
  function createButton() {
    const btn = document.createElement('div');
    btn.className = `head__action ${BUTTON_CLASS}`;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', 'Перемикач джерел');

    // Простий, валідний SVG
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9"></circle>
        <text x="12" y="16" font-size="8" text-anchor="middle" fill="#fff">SRC</text>
      </svg>
    `;

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

    return btn;
  }

  // Оновлення кнопки (підказка)
  function updateButton() {
    const el = document.querySelector(`.${BUTTON_CLASS}`);
    if (!el) return;
    const sel = getSelected();
    const found = SOURCES.find(s => s.id === sel);
    el.title = found ? `Джерело: ${found.title}` : 'Перемикач джерел';
    el.style.opacity = sel === 'tmdb' ? '1' : '0.9';
  }

  // Додає кнопку у header біля пошуку/аккаунта
  function addButton() {
    try {
      if (document.querySelector(`.${BUTTON_CLASS}`)) return;

      const header = document.querySelector('.head');
      if (!header) return;

      // шукаємо контейнер з діями (в залежності від шаблону)
      const actions = header.querySelector('.head__actions') || header.querySelector('.head__right') || header;
      if (!actions) return;

      const btn = createButton();
      actions.prepend(btn);
      updateButton();
      console.log('[Source Switcher] Кнопку додано');
    } catch (e) {
      console.error('[Source Switcher] addButton error', e);
    }
  }

  // Запуски/наблюдатель
  function tryAddButton() {
    [0, 200, 800, 1500].forEach(delay => setTimeout(addButton, delay));

    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => addButton());
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
      // Залишаємо observer — корисно, якщо інтерфейс перерендерюється
    }
  }

  function init() {
    console.log('[Source Switcher] Ініціалізація...');
    if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
      Lampa.Listener.follow('full', function (event) {
        if (event && event.type === 'render') setTimeout(addButton, 100);
      });
      Lampa.Listener.follow('app', function (event) {
        if (event && event.type === 'ready') setTimeout(addButton, 200);
      });
    }

    tryAddButton();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryAddButton);
    } else {
      tryAddButton();
    }
  }

  init();

})();