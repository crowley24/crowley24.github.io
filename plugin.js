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
        return Lampa.Storage.get(STORAGE_KEY, 'tmdb') || 'tmdb';
      } else if (window.localStorage) {
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

  // ====== Спроби застосувати джерело у різних місцях (щоб інші модулі підхопили зміни) ======
  function applyToLocalStorageKeys(id) {
    try {
      if (!window.localStorage) return;
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        const lk = k.toLowerCase();
        const v = (localStorage.getItem(k) || '').toLowerCase();

        // Якщо ключ або значення явно містять 'source', 'provider' або відоме ім'я джерела — замінити
        if (/source|provider|current|def/i.test(lk) || KNOWN_CANDIDATES.some(c => lk.includes(c))) {
          try { localStorage.setItem(k, id); } catch (e) {}
        } else {
          // якщо значення точно дорівнює одному із кандидатів
          KNOWN_CANDIDATES.forEach(c => {
            if (v === c) {
              try { localStorage.setItem(k, id); } catch (e) {}
            }
          });
        }
      });
    } catch (e) {
      console.warn('[Source Switcher] applyToLocalStorageKeys error', e);
    }
  }

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
            if (typeof Lampa[k] === 'function') {
              // якщо функція — не викликаємо без впевненості
            } else if (typeof Lampa[k] === 'object' && Lampa[k] !== null) {
              if ('current' in Lampa[k]) Lampa[k].current = id;
              if ('value' in Lampa[k]) Lampa[k].value = id;
              if ('source' in Lampa[k]) Lampa[k].source = id;
            } else {
              try { Lampa[k] = id; } catch (e) {}
            }
          }
        } catch (e) {}
      });

      // Конкретні відомі варіанти API (якщо є) — пробуємо викликати
      try { if (Lampa.Sources && typeof Lampa.Sources.setCurrent === 'function') Lampa.Sources.setCurrent(id); } catch (e) {}
      try { if (Lampa.Sources && typeof Lampa.Sources.select === 'function') Lampa.Sources.select(id); } catch (e) {}
      try { if (Lampa.Core && typeof Lampa.Core.setProvider === 'function') Lampa.Core.setProvider(id); } catch (e) {}
      try { if (Lampa.App && typeof Lampa.App.setSource === 'function') Lampa.App.setSource(id); } catch (e) {}
      try { if (Lampa.Provider && typeof Lampa.Provider.set === 'function') Lampa.Provider.set(id); } catch (e) {}
      try { if (typeof Lampa.setSource === 'function') Lampa.setSource(id); } catch (e) {}
    } catch (e) {
      console.warn('[Source Switcher] applyToLampaObject error', e);
    }
  }

  // Повідомлення через Lampa.Listener (якщо є)
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

    // Спроби записати куди ще можуть читати інші модулі
    applyToLocalStorageKeys(id);
    applyToWindowProps(id);
    applyToLampaObject(id);
    notifyLampaListener(id);

    // Глобальна подія, щоб інші плагіни/модулі могли слухати
    try {
      window.dispatchEvent(new CustomEvent('source_switcher_changed', { detail: { id } }));
    } catch (e) {}

    // Показати нотифікацію, якщо є Lampa.Noty
    try {
      if (typeof Lampa !== 'undefined' && Lampa.Noty && typeof Lampa.Noty.show === 'function') {
        Lampa.Noty.show('Джерело: ' + id);
      } else {
        console.info('[Source Switcher] Джерело:', id);
      }
    } catch (e) {}

    // Спробувати застосувати через API або перезавантажити
    tryApplyAndReload(id);
  }

  // ====== Спроба застосувати через API, і якщо не вдалось — reload ======
  function tryApplyAndReload(id) {
    let applied = false;

    try {
      if (typeof Lampa !== 'undefined') {
        // Якщо є метод reload/refresh в App/Activity
        if (Lampa.App && typeof Lampa.App.reload === 'function') {
          Lampa.App.reload();
          applied = true;
        } else if (Lampa.Activity && typeof Lampa.Activity.restart === 'function') {
          Lampa.Activity.restart();
          applied = true;
        } else {
          // Якщо є більш "м'які" методи оновлення джерел — викликаємо їх
          if (Lampa.Sources && typeof Lampa.Sources.setCurrent === 'function') {
            try { Lampa.Sources.setCurrent(id); applied = true; } catch (e) {}
          }
          if (!applied && Lampa.Sources && typeof Lampa.Sources.select === 'function') {
            try { Lampa.Sources.select(id); applied = true; } catch (e) {}
          }
          if (!applied && typeof Lampa.setSource === 'function') {
            try { Lampa.setSource(id); applied = true; } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.warn('[Source Switcher] tryApplyAndReload Lampa calls failed', e);
    }

    if (applied) return;

    // Fallback: повний reload сторінки через невелику затримку
    setTimeout(() => {
      try {
        // сучасні браузери ігнорують параметр, але спробуємо
        window.location.reload(true);
      } catch (e) {
        window.location.reload();
      }
    }, 250);
  }

  // ====== Автоматичне виявлення джерел ======
  function detectSources() {
    const found = new Map();

    // 1) Скануємо глобальні змінні window
    KNOWN_CANDIDATES.forEach(id => {
      try {
        if (window[id] !== undefined) found.set(id, id.toUpperCase());
        if (window['plugin_' + id] !== undefined) found.set(id, id.toUpperCase());
        if (window['source_' + id] !== undefined) found.set(id, id.toUpperCase());
      } catch (e) {}
    });

    // 2) Скануємо об'єкт Lampa на наявність модулів/ключів
    try {
      if (typeof Lampa !== 'undefined') {
        Object.keys(Lampa).forEach(k => {
          const low = String(k).toLowerCase();
          KNOWN_CANDIDATES.forEach(id => {
            if (low.includes(id) || low === id || low === id + 'source' || low.includes('source')) {
              found.set(id, id.toUpperCase());
            }
          });
        });
      }
    } catch (e) {}

    // 3) Скануємо DOM на data-атрибути
    try {
      KNOWN_CANDIDATES.forEach(id => {
        if (document.querySelector(`[data-source="${id}"], [data-provider="${id}"], [data-id="${id}"]`)) {
          found.set(id, id.toUpperCase());
        }
      });
    } catch (e) {}

    // 4) Скануємо localStorage значення на згадки
    try {
      if (window.localStorage) {
        Object.keys(localStorage).forEach(k => {
          const v = (localStorage.getItem(k) || '').toLowerCase();
          KNOWN_CANDIDATES.forEach(id => {
            if (k.toLowerCase().includes(id) || v.includes(id) || k.toLowerCase().includes('source') || v.includes('source')) {
              found.set(id, id.toUpperCase());
            }
          });
        });
      }
    } catch (e) {}

    // 5) Якщо нічого не знайдено — fallback базовий список
    if (found.size === 0) {
      [['tmdb','TMDB'], ['cub','CUB']].forEach(a => found.set(a[0], a[1]));
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
          setSelected(item.source_id);
          updateButton();
        }
      });
    } else {
      const names = items.map((it, i) => `${i + 1}. ${it.title}`).join('\n');
      const choice = prompt('Виберіть джерело:\n' + names);
      const idx = parseInt(choice, 10) - 1;
      if (!Number.isNaN(idx) && items[idx]) {
        setSelected(items[idx].source_id);
        updateButton();
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
      // Якщо Lampa надає стилі, кнопка повинна виглядати як інші дії
      console.log('[Source Switcher] Кнопку додано');
    } catch (e) {
      console.error('[Source Switcher] addButton error', e);
    }
  }

  // ====== Кеш та провайдер для джерел ======
  let detectedSourcesCache = detectSources();
  function getDetectedSources() {
    if (!detectedSourcesCache || detectedSourcesCache.length === 0) {
      detectedSourcesCache = detectSources();
    }
    return detectedSourcesCache;
  }

  // ====== Спроби вставити кнопку та відслідковування DOM ======
  function tryAddButton() {
    [0, 200, 800, 1500].forEach(delay => setTimeout(() => addButton(getDetectedSources), delay));

    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        detectedSourcesCache = detectSources();
        addButton(getDetectedSources);
      });
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    }
  }

  // ====== Ініціалізація ======
  function init() {
    console.log('[Source Switcher] Ініціалізація плагіна...');

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
    } catch (e) { /* ignore */ }

    tryAddButton();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryAddButton);
    } else {
      tryAddButton();
    }

    // Для налагодження: лог коли інші модулі шлють подію
    window.addEventListener('source_switcher_changed', e => {
      console.log('[Source Switcher] external event received:', e && e.detail);
    });
  }

  init();

})();