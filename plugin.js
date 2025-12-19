(function () {
  'use strict';

  // ====== Налаштування ======
  const STORAGE_KEY = 'source_switcher_selected';
  const BUTTON_CLASS = 'source-switcher-btn';

  // Відомі кандидати джерел (додай/видали під свої потреби)
  const KNOWN_CANDIDATES = [
    'tmdb', 'cub', 'trakt', 'kinopoisk', 'imdb', 'dnet', 'hdgo', 'kinopoiskhd', 'megogo', 'moretv'
  ];

  // ====== Робота зі сховищем (Lampa.Storage або localStorage) ======
  function getSelected() {
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Storage && typeof Lampa.Storage.get === 'function') {
        // Отримуємо з Lampa.Storage
        return Lampa.Storage.get(STORAGE_KEY, 'tmdb') || 'tmdb';
      } else if (window.localStorage) {
        // Fallback: localStorage
        return localStorage.getItem(STORAGE_KEY) || 'tmdb';
      }
    } catch (e) {
      console.warn('[Source Switcher] getSelected error', e);
    }
    return 'tmdb';
  }

  function savePrimaryStorage(id) {
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Storage && typeof Lampa.Storage.set === 'function') {
        Lampa.Storage.set(STORAGE_KEY, id);
      } else if (window.localStorage) {
        localStorage.setItem(STORAGE_KEY, id);
      }
    } catch (e) {
      console.warn('[Source Switcher] savePrimaryStorage error', e);
    }
  }

  // ====== Спроби застосувати джерело (Обмежено, тільки для Lampa і Window) ======

  // Видалено функцію applyToLocalStorageKeys, щоб уникнути конфліктів.

  function applyToWindowProps(id) {
    try {
      // Поширені імена
      try { window.currentSource = id; } catch (e) {}
      try { window.source = id; } catch (e) {}
      try { window.provider = id; } catch (e) {}
      try { window.current_provider = id; } catch (e) {}
      try { window.default_source = id; } catch (e) {}
    } catch (e) {
      console.warn('[Source Switcher] applyToWindowProps error', e);
    }
  }

  function applyToLampaObject(id) {
    try {
      if (typeof Lampa === 'undefined') return;

      // Спроба встановити загальні ключі в Lampa
      Object.keys(Lampa).forEach(k => {
        try {
          const lk = String(k).toLowerCase();
          if (/source|provider|current|def|selected/i.test(lk)) {
            if (typeof Lampa[k] === 'object' && Lampa[k] !== null) {
              if ('current' in Lampa[k]) Lampa[k].current = id;
              if ('value' in Lampa[k]) Lampa[k].value = id;
              if ('source' in Lampa[k]) Lampa[k].source = id;
            } else if (typeof Lampa[k] !== 'function') {
              try { Lampa[k] = id; } catch (e) {}
            }
          }
        } catch (e) {}
      });

      // Конкретні відомі варіанти API
      try { if (Lampa.Sources && typeof Lampa.Sources.setCurrent === 'function') Lampa.Sources.setCurrent(id); } catch (e) {}
      try { if (typeof Lampa.setSource === 'function') Lampa.setSource(id); } catch (e) {}
    } catch (e) {
      console.warn('[Source Switcher] applyToLampaObject error', e);
    }
  }

  // Повідомлення через Lampa.Listener
  function notifyLampaListener(id) {
    try {
      if (typeof Lampa === 'undefined') return;
      if (Lampa.Listener && typeof Lampa.Listener.send === 'function') {
        Lampa.Listener.send('source_switcher.changed', { id });
      } else if (Lampa.Listener && typeof Lampa.Listener.trigger === 'function') {
        Lampa.Listener.trigger('source_switcher.changed', { id });
      }
    } catch (e) {
      // ignore
    }
  }

  // ====== Головна функція: зберегти і застосувати обране джерело ======
  function setSelected(id) {
    if (!id) return;
    savePrimaryStorage(id);

    // Спроби записати, куди ще можуть читати інші модулі
    // applyToLocalStorageKeys(id); // ВИДАЛЕНО, щоб уникнути конфліктів
    applyToWindowProps(id);
    applyToLampaObject(id);
    notifyLampaListener(id);

    // Глобальна подія, щоб інші плагіни/модулі могли слухати
    try {
      window.dispatchEvent(new CustomEvent('source_switcher_changed', { detail: { id } }));
    } catch (e) {}

    // Показати нотифікацію
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
        Lampa.Noty.show('Джерело змінено на: ' + id.toUpperCase());
      } else {
        console.info('[Source Switcher] Джерело:', id);
      }
    } catch (e) {}

    // Спроба застосувати через API або перезавантажити
    tryApplyAndReload();
  }

  // ====== ЗМІНЕНА ФУНКЦІЯ: ТІЛЬКИ ПЕРЕЗАВАНТАЖЕННЯ ======
  function tryApplyAndReload() {
    // Гарантуємо, що зміна буде застосована, примусовим перезавантаженням.
    setTimeout(() => {
      try {
        // сучасні браузери ігнорують параметр, але спробуємо
        window.location.reload(true);
      } catch (e) {
        window.location.reload();
      }
    }, 400); // Затримка 400мс, щоб нотифікація встигла відобразитися
  }

  // ====== Автоматичне виявлення джерел ======
  function detectSources() {
    const found = new Map();

    // 1) Скануємо глобальні змінні window та Lampa
    KNOWN_CANDIDATES.forEach(id => {
      try {
        // Якщо є плагін-провайдер чи модуль
        if (window[id] !== undefined || window['plugin_' + id] !== undefined || (typeof Lampa !== 'undefined' && Lampa[id] !== undefined)) {
          found.set(id, id.toUpperCase());
        }
      } catch (e) {}
    });

    // 2) Скануємо localStorage значення на згадки (якщо не знайдено)
    try {
      if (window.localStorage && found.size < 2) {
        Object.keys(localStorage).forEach(k => {
          const v = (localStorage.getItem(k) || '').toLowerCase();
          KNOWN_CANDIDATES.forEach(id => {
            if (v.includes(id) || k.toLowerCase().includes('source')) {
              found.set(id, id.toUpperCase());
            }
          });
        });
      }
    } catch (e) {}

    // 3) Якщо нічого не знайдено — fallback базовий список
    if (found.size === 0) {
      [['tmdb','TMDB (Default)'], ['cub','CUB (Fallback)']].forEach(a => found.set(a[0], a[1]));
    }

    return Array.from(found.entries()).map(([id, title]) => ({ id, title }));
  }

  // ====== UI: меню і кнопка ======
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
          if (item.source_id === selected) return; // Не робимо нічого, якщо вибрано те саме
          setSelected(item.source_id);
          // updateButton() викликається після перезавантаження
        }
      });
    } else {
      const names = items.map((it, i) => `${i + 1}. ${it.title}`).join('\n');
      const choice = prompt('Виберіть джерело:\n' + names);
      const idx = parseInt(choice, 10) - 1;
      if (!Number.isNaN(idx) && items[idx]) {
        setSelected(items[idx].source_id);
      }
    }
  }

  function createButton(getSourcesFn) {
    const btn = document.createElement('div');
    btn.className = `head__action ${BUTTON_CLASS}`;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', 'Перемикач джерел');

    // Простий SVG
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" opacity="0.12"></circle>
        <path d="M7 12h10M12 7v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;

    const refreshTitle = () => {
      const sel = getSelected();
      const sources = getSourcesFn();
      const found = sources.find(s => s.id === sel);
      btn.title = found ? `Джерело: ${found.title}` : 'Перемикач джерел';
      btn.style.opacity = sel === 'tmdb' ? '1' : '0.8'; // Змінюємо прозорість, якщо не TMDB
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

    return { btn, refreshTitle };
  }

  function addButton(getSourcesFn) {
    try {
      // Якщо кнопка вже є, оновлюємо її
      let existingBtn = document.querySelector(`.${BUTTON_CLASS}`);
      if (existingBtn) {
        const sel = getSelected();
        const found = getSourcesFn().find(s => s.id === sel);
        existingBtn.title = found ? `Джерело: ${found.title}` : 'Перемикач джерел';
        existingBtn.style.opacity = sel === 'tmdb' ? '1' : '0.8';
        return;
      }

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

  // ====== Кеш та провайдер для джерел ======
  let detectedSourcesCache = detectSources();
  function getDetectedSources() {
    // Оновлюємо кеш при кожному запиті, щоб врахувати динамічні плагіни
    detectedSourcesCache = detectSources();
    return detectedSourcesCache;
  }

  // ====== Спроби вставити кнопку та відслідковування DOM ======
  function tryAddButton() {
    [0, 200, 800].forEach(delay => setTimeout(() => addButton(getDetectedSources), delay));

    // Додаємо постійний спостерігач за DOM, щоб кнопка з'явилася при рендерингу
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        addButton(getDetectedSources);
      });
      // Спостерігаємо за тілом документа
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  // ====== Ініціалізація ======
  function init() {
    console.log('[Source Switcher] Ініціалізація плагіна...');

    // Прослуховуємо події Lampa
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
        Lampa.Listener.follow('app', function (event) {
          if (event && event.type === 'ready') {
            tryAddButton();
          }
        });
      }
    } catch (e) { /* ignore */ }

    // Додаємо кнопку при повному завантаженні сторінки
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryAddButton);
    } else {
      tryAddButton();
    }
  }

  init();

})();

