(function () {
  'use strict';

  const STORAGE_KEY = 'source_switcher_selected';
  const BUTTON_CLASS = 'source-switcher-btn';

  // Список відомих id джерел, які варто перевірити (додайте свої, якщо є)
  const KNOWN_CANDIDATES = [
    'tmdb', 'cub', 'trakt', 'kinopoisk', 'imdb', 'dnet', 'hdgo', 'kinopoiskhd'
  ];

  // SAFE storage (Lampa.Storage або localStorage)
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

    // Повідомляємо інших скриптів про зміну (універсальна подія)
    try {
      window.dispatchEvent(new CustomEvent('source_switcher_changed', { detail: { id } }));
    } catch (e) {}

    // Спробуємо коректно "застосувати" нове джерело через можливі Lampa API,
    // якщо їх немає — зробимо повне перезавантаження сторінки
    tryApplyAndReload(id);
  }

  // Спроби застосувати зміну через Lampa, потім reload fallback
  function tryApplyAndReload(id) {
    try {
      // Можливі корисні виклики (якщо в Lampa є подібні функції)
      if (typeof Lampa !== 'undefined') {
        if (Lampa.Noty && typeof Lampa.Noty.show === 'function') {
          Lampa.Noty.show('Джерело: ' + id);
        }

        // Надсилаємо подію через Listener, якщо є
        if (Lampa.Listener && typeof Lampa.Listener.send === 'function') {
          Lampa.Listener.send('source_switcher.changed', { id });
        } else if (Lampa.Listener && typeof Lampa.Listener.trigger === 'function') {
          Lampa.Listener.trigger('source_switcher.changed', { id });
        }

        // Деякі збірки можуть мати app.reload / activity.restart — пробуємо
        if (Lampa.App && typeof Lampa.App.reload === 'function') {
          return Lampa.App.reload();
        }
        if (Lampa.Activity && typeof Lampa.Activity.restart === 'function') {
          return Lampa.Activity.restart();
        }
      }
    } catch (e) {
      // якщо щось пішло не так — просто перезавантажимо сторінку нижче
      console.warn('[Source Switcher] tryApplyAndReload Lampa calls failed', e);
    }

    // Якщо нічого не викликалось — робимо повне reload через невелику затримку
    setTimeout(() => {
      try {
        // Спроба більш "чистого" перезавантаження
        window.location.reload(true);
      } catch (e) {
        window.location.reload();
      }
    }, 250);
  }

  // Спроби знайти джерела автоматично
  function detectSources() {
    const found = new Map();

    // 1) Перевіримо global/window на наявність відомих кандидатів
    KNOWN_CANDIDATES.forEach(id => {
      try {
        if (window[id] !== undefined) found.set(id, id.toUpperCase());
        if (window['plugin_' + id] !== undefined) found.set(id, id.toUpperCase());
        if (window['source_' + id] !== undefined) found.set(id, id.toUpperCase());
      } catch (e) {}
    });

    // 2) Перевіримо глобальний об'єкт Lampa на імена модулів
    try {
      if (typeof Lampa !== 'undefined') {
        Object.keys(Lampa).forEach(k => {
          const low = String(k).toLowerCase();
          KNOWN_CANDIDATES.forEach(id => {
            if (low.includes(id) || (k === id) || (low === id + 'source')) {
              found.set(id, id.toUpperCase());
            }
          });
        });
      }
    } catch (e) {}

    // 3) Перевіримо DOM на data-атрибути (якщо модулі рендерять блоки з data-source)
    try {
      KNOWN_CANDIDATES.forEach(id => {
        if (document.querySelector(`[data-source="${id}"], [data-provider="${id}"]`)) {
          found.set(id, id.toUpperCase());
        }
      });
    } catch (e) {}

    // 4) Перевірка localStorage ключів на згадки id (іноді плагіни зберігають налаштування)
    try {
      if (window.localStorage) {
        Object.keys(localStorage).forEach(k => {
          KNOWN_CANDIDATES.forEach(id => {
            if (k.toLowerCase().includes(id) || (localStorage.getItem(k) || '').toLowerCase().includes(id)) {
              found.set(id, id.toUpperCase());
            }
          });
        });
      }
    } catch (e) {}

    // 5) Якщо нічого не знайдено — базовий fallback
    if (found.size === 0) {
      // Якщо ви впевнені в своїх джерелах — змініть тут
      [['tmdb','TMDB'], ['cub','CUB']].forEach(a => found.set(a[0], a[1]));
    }

    // Повертаємо масив об'єктів {id, title}
    return Array.from(found.entries()).map(([id, title]) => ({ id, title }));
  }

  // Показ меню (Lampa.Select або fallback)
  function showMenu(sources) {
    const selected = getSelected();

    const items = sources.map(src => ({
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
      // fallback prompt
      const names = items.map((it, i) => `${i + 1}. ${it.title}`).join('\n');
      const choice = prompt('Виберіть джерело:\n' + names);
      const idx = parseInt(choice, 10) - 1;
      if (!Number.isNaN(idx) && items[idx]) {
        setSelected(items[idx].source_id);
        updateButton();
      }
    }
  }

  // UI: створення кнопки
  function createButton(getSourcesFn) {
    const btn = document.createElement('div');
    btn.className = `head__action ${BUTTON_CLASS}`;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', 'Перемикач джерел');

    // Проста і валідна SVG-ікона
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" opacity="0.12"></circle>
        <path d="M7 12h10M12 7v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;

    const refreshTitle = () => {
      const sel = getSelected();
      const found = getSourcesFn().find(s => s.id === sel);
      btn.title = found ? `Джерело: ${found.title}` : 'Перемикач джерел';
      btn.style.opacity = sel === 'tmdb' ? '1' : '0.9';
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sources = getSourcesFn();
      showMenu(sources);
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const sources = getSourcesFn();
        showMenu(sources);
      }
    });

    // Повертаємо елемент і функцію оновлення title
    return { btn, refreshTitle };
  }

  function updateButton() {
    const el = document.querySelector(`.${BUTTON_CLASS}`);
    if (!el) return;
    const sel = getSelected();
    const found = detectedSourcesCache.find(s => s.id === sel);
    el.title = found ? `Джерело: ${found.title}` : 'Перемикач джерел';
    el.style.opacity = sel === 'tmdb' ? '1' : '0.9';
  }

  // Додавання кнопки біля пошуку/аккаунта
  function addButton(getSourcesFn) {
    try {
      if (document.querySelector(`.${BUTTON_CLASS}`)) return;

      const header = document.querySelector('.head');
      if (!header) return;

      const actions = header.querySelector('.head__actions') || header.querySelector('.head__right') || header;
      if (!actions) return;

      const created = createButton(getSourcesFn);
      actions.prepend(created.btn);
      created.refreshTitle();
      console.log('[Source Switcher] Кнопку додано');
    } catch (e) {
      console.error('[Source Switcher] addButton error', e);
    }
  }

  // Кеш виявлених джерел та функція-провайдер
  let detectedSourcesCache = detectSources();
  function getDetectedSources() {
    // можемо повторно сканувати при потребі
    if (!detectedSourcesCache || detectedSourcesCache.length === 0) {
      detectedSourcesCache = detectSources();
    }
    return detectedSourcesCache;
  }

  // Періодичні (і реактивні) спроби вставки кнопки і оновлення списку джерел
  function tryAddButton() {
    // повторні часові вставки
    [0, 200, 800, 1500].forEach(delay => setTimeout(() => addButton(getDetectedSources), delay));

    // MutationObserver для динамічних перерендерів UI
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        // при зміні DOM — оновимо список джерел і спробуємо додати кнопку
        detectedSourcesCache = detectSources();
        addButton(getDetectedSources);
      });
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }
  }

  // Ініціалізація
  function init() {
    console.log('[Source Switcher] Ініціалізація плагіна...');

    // Якщо Lampa має listener-и — теж слухаємо події рендера/готовності
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
        Lampa.Listener.follow('full', function (event) {
          if (event && event.type === 'render') {
            detectedSourcesCache = detectSources();
            setTimeout(() => addButton(getDetectedSources), 100);
          }
        });
        Lampa.Listener.follow('app', function (event) {
          if (event && event.type === 'ready') {
            detectedSourcesCache = detectSources();
            setTimeout(() => addButton(getDetectedSources), 200);
          }
        });
      }
    } catch (e) {}

    tryAddButton();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryAddButton);
    } else {
      tryAddButton();
    }

    // Додаємо слухач для зовнішніх модулів (для відладки)
    window.addEventListener('source_switcher_changed', e => {
      console.log('[Source Switcher] external event received:', e && e.detail);
    });
  }

  init();

})();