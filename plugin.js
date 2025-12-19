(function () {
  'use strict';

  // Ідентифікатор кнопки
  const BUTTON_CLASS = 'source-switcher-btn';

  // Перевірка наявності ключового модуля Lampa.Sources
  if (typeof Lampa === 'undefined' || !Lampa.Sources || typeof Lampa.Sources.all !== 'function') {
    console.error('[Source Switcher] Модуль Lampa.Sources не знайдено або він не має необхідних методів. Плагін не працює.');
    return;
  }

  // ====== Функції роботи з джерелами через Lampa API ======

  /**
   * Отримує список доступних джерел.
   * @returns {Array} Список джерел [{id: 'tmdb', name: 'TMDB'}]
   */
  function getAvailableSources() {
    try {
      // Використовуємо офіційний метод для отримання всіх доступних джерел
      const allSources = Lampa.Sources.all(); 
      // Приводимо до зручного масиву
      return Object.keys(allSources).map(id => ({
        id: id,
        title: allSources[id].title || id.toUpperCase()
      }));
    } catch (e) {
      console.error('[Source Switcher] Помилка при отриманні джерел:', e);
      return [];
    }
  }

  /**
   * Змінює поточне джерело через офіційний API Lampa.
   * @param {string} id ID нового джерела.
   */
  function changeSource(id) {
    try {
      // Використовуємо офіційний метод для зміни джерела
      Lampa.Sources.change(id);

      const sourceName = (Lampa.Sources.all()[id].title || id).toUpperCase();
      
      // Показати нотифікацію
      if (Lampa.Noty && typeof Lampa.Noty.show === 'function') {
        Lampa.Noty.show('Джерело змінено на: ' + sourceName);
      } else {
        console.info('[Source Switcher] Джерело змінено на:', sourceName);
      }
      
      // ПРИМІТКА: Lampa.Sources.change() зазвичай сама викликає необхідне оновлення інтерфейсу. 
      // Якщо цього не відбувається, можна додати Lampa.Activity.restart() або Lampa.App.reload() тут.
      
      // Додаємо виклик перезапуску, як найнадійніший варіант
      setTimeout(() => {
           if (Lampa.Activity && typeof Lampa.Activity.restart === 'function') {
               Lampa.Activity.restart();
           } else if (Lampa.App && typeof Lampa.App.reload === 'function') {
               Lampa.App.reload();
           }
      }, 300);

    } catch (e) {
      console.error('[Source Switcher] Помилка при зміні джерела:', e);
      Lampa.Noty.show('Помилка при зміні джерела.');
    }
  }
  
  /**
   * Отримує ID активного джерела.
   * @returns {string} ID активного джерела.
   */
  function getActiveSourceId() {
      try {
          // Використовуємо офіційний метод
          return Lampa.Sources.active();
      } catch (e) {
          return 'tmdb';
      }
  }

  // ====== UI: меню і кнопка ======

  function showMenu(sources) {
    const selected = getActiveSourceId();
    const items = sources.map(src => ({
      title: (src.id === selected ? '✔ ' : '') + src.title,
      source_id: src.id
    }));

    if (Lampa.Select && typeof Lampa.Select.show === 'function') {
      Lampa.Select.show({
        title: 'Перемикач джерел',
        items,
        onSelect(item) {
          if (item.source_id === selected) return; 
          changeSource(item.source_id);
          // Оновлення кнопки відбувається після виклику changeSource
        }
      });
    } else {
      // Fallback, якщо Lampa.Select недоступний
      const names = items.map((it, i) => `${i + 1}. ${it.title}`).join('\n');
      const choice = prompt('Виберіть джерело:\n' + names);
      const idx = parseInt(choice, 10) - 1;
      if (!Number.isNaN(idx) && items[idx]) {
        changeSource(items[idx].source_id);
      }
    }
  }
  
  function updateButton(btn, sources) {
      const sel = getActiveSourceId();
      const found = sources.find(s => s.id === sel);
      const title = found ? `Джерело: ${found.title}` : 'Перемикач джерел';
      
      if (btn) {
          btn.title = title;
          btn.style.opacity = sel === 'tmdb' ? '1' : '0.8';
      }
      return title;
  }

  function createButton() {
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

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sources = getAvailableSources();
      showMenu(sources);
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const sources = getAvailableSources();
        showMenu(sources);
      }
    });

    return btn;
  }

  function addButton() {
    try {
      // Отримуємо джерела лише для перевірки, чи варто додавати кнопку
      const sources = getAvailableSources();
      if (sources.length < 2) {
          console.log('[Source Switcher] Знайдено менше двох джерел. Кнопку не додано.');
          return;
      }
      
      let existingBtn = document.querySelector(`.${BUTTON_CLASS}`);
      const header = document.querySelector('.head');
      if (!header) return;

      const actions = header.querySelector('.head__actions') || header.querySelector('.head__right') || header;
      if (!actions) return;
      
      if (existingBtn) {
          // Якщо кнопка вже є, просто оновлюємо її стан
          updateButton(existingBtn, sources);
          return;
      }

      const newBtn = createButton();
      actions.prepend(newBtn);
      updateButton(newBtn, sources);
      console.log('[Source Switcher] Кнопку додано');
    } catch (e) {
      console.error('[Source Switcher] addButton error', e);
    }
  }

  // ====== Ініціалізація та Прослуховування ======
  
  function init() {
    console.log('[Source Switcher] Ініціалізація плагіна (API Mode)...');

    // Прослуховуємо офіційну подію, коли джерело змінюється
    try {
        if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
            Lampa.Listener.follow('sources', function(event) {
                // Подія 'sources' спрацьовує, коли список джерел змінюється або коли активне джерело змінюється
                if (event.type === 'change' || event.type === 'all') {
                    // Оновлюємо кнопку
                    addButton(); 
                }
            });
            
            Lampa.Listener.follow('app', function (event) {
              if (event && event.type === 'ready') {
                // Додаємо кнопку при готовності App
                addButton();
              }
            });
        }
    } catch (e) {
        console.error('[Source Switcher] Помилка прослуховування подій Lampa:', e);
    }

    // Додаємо кнопку при завантаженні DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addButton);
    } else {
      setTimeout(addButton, 100);
    }
  }

  init();

})();

