Lampa.Platform.tv();

(function () {
  'use strict';

  /** SVG-иконки через спрайт */
  const HOME_SVG     = `<svg><use xlink:href="#sprite-home"></use></svg>`;      // Головна
  const FAVORITE_SVG = `<svg><use xlink:href="#sprite-favorite"></use></svg>`;   // Вибране
  const HISTORY_SVG  = `<svg><use xlink:href="#sprite-history"></use></svg>`;    // Історія
  const SEARCH_SVG   = `<svg><use xlink:href="#sprite-search"></use></svg>`;     // Пошук
  const SETTINGS_SVG = `<svg><use xlink:href="#sprite-settings"></use></svg>`;   // Налаштування
  const BACK_SVG     = `<svg><use xlink:href="#sprite-arrow-left"></use></svg>`; // Назад (для оновлення іконки)

  /** CSS */
  const css = `
  .navigation-bar__body {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: 100% !important;
      padding: 6px 10px !important;
      background: rgba(20,20,25,0.6);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: 0 2px 30px rgba(0,0,0,0.8); /* Покращена тінь */
      border-top: 1px solid rgba(255,255,255,0.15);
      overflow: hidden !important;
  }

  /* **ПОВЕРТАЄМО ПОШУК:** Робимо його видимим */
  .navigation-bar__item[data-action="search"] {
      display: flex !important;
  }
  
  /* Змінено: Налаштування тепер рівне з іншими */
  .navigation-bar__item[data-action="settings"] {
      margin-left: 0 !important; 
      margin-right: 0 !important; 
      flex: 1 1 auto !important; 
      width: auto; 
  }

  /* Загальний стиль елементів */
  .navigation-bar__item {
      flex: 1 1 auto !important;
      display: flex !important;
      align-items: center;
      justify-content: center;
      height: 70px !important;
      margin: 0 4px !important;
      
      /* Візуальні покращення */
      background: rgba(255,255,255,0.05); 
      box-shadow: inset 0 0 12px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.5); /* Виразніші тіні */
      
      border-radius: 16px; /* Більші заокруглення */
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all .35s cubic-bezier(0.25, 0.46, 0.45, 0.94); /* Плавніша анімація */
      box-sizing: border-box;
      position: relative; 
  }

  /* **ПОКРАЩЕНИЙ ЕФЕКТ НАВЕДЕННЯ** */
  .navigation-bar__item:hover,
  .navigation-bar__item.active {
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.3) 100%);
      transform: scale(1.1); /* Більше збільшення */
      box-shadow: inset 0 0 8px rgba(0,0,0,0.1), 0 10px 30px rgba(100,200,255,0.5); /* Неонова тінь */
  }

  /* **АНІМАЦІЯ ІКОНКИ** */
  .navigation-bar__item:hover .navigation-bar__icon svg {
      transform: scale(1.15) rotate(5deg);
      transition: transform .35s;
      fill: #FFFFFF !important;
  }
  
  /* Іконка Головної завжди має бути білою, але тут ми її не задаємо, залишаючи загальний стиль */

  .navigation-bar__icon {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
  }

  .navigation-bar__icon svg {
      width: 24px !important;
      height: 24px !important;
      fill: #E0E0E0 !important;
      transition: fill .35s, transform .35s;
  }

  /* Полностью скрываем подписи */
  .navigation-bar__label {
      display: none !important;
  }

  @media (max-width: 900px) {
      .navigation-bar__item { height: 66px !important; border-radius: 14px; }
  }
  @media (max-width: 600px) {
      .navigation-bar__item { height: 60px !important; border-radius: 12px; }
      .navigation-bar__icon svg { width: 20px !important; height: 20px !important; }
  }`;

  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  function injectCSS(){
    if(!$('#menu-glass-auto-style')){
      const st=document.createElement('style');
      st.id='menu-glass-auto-style';
      st.textContent=css;
      document.head.appendChild(st);
    }
  }

  function emulateSidebarClick(action){
    for(const el of $$('.menu__item, .selector')){
      if(el.dataset && el.dataset.action && el.dataset.action === action){
        el.click();
        return;
      }
    }
  }
  
  // Функція додавання елемента, використовується лише для нових кнопок (favorite, history)
  function createNewItem(action, svg, bar){
    if(!bar || bar.querySelector(`[data-action="${action}"]`)) return;
    
    const div = document.createElement('div');
    div.className = 'navigation-bar__item';
    div.dataset.action = action;
    div.innerHTML = `<div class="navigation-bar__icon">${svg}</div>`;
    
    bar.appendChild(div); // Додаємо наприкінці, щоб потім відсортувати
    div.addEventListener('click', () => emulateSidebarClick(action));
    return div;
  }

  // Функція оновлення існуючих елементів (іконки та action)
  function updateExistingItem(action, newAction, svg, bar){
    const item = bar.querySelector(`.navigation-bar__item[data-action="${action}"]`);
    if(!item) return;

    // 1. Оновлюємо data-action, якщо потрібно (наприклад, 'movie' -> 'home')
    item.dataset.action = newAction;
    
    // 2. Оновлюємо іконку
    let iconContainer = item.querySelector('.navigation-bar__icon');
    if(!iconContainer){
      iconContainer = document.createElement('div');
      iconContainer.className = 'navigation-bar__icon';
      item.prepend(iconContainer);
    }
    iconContainer.innerHTML = svg;
    
    // 3. Додаємо/оновлюємо обробник кліку
    item.removeEventListener('click', item._click_handler);
    const handler = () => emulateSidebarClick(newAction);
    item.addEventListener('click', handler);
    item._click_handler = handler;
  }

  // Функція сортування елементів у потрібному порядку
  function sortItems(bar){
    // Ваш бажаний порядок: [back], home, favorite, history, search, settings
    const desiredOrder = ['home', 'favorite', 'history', 'search', 'settings'];
    const itemsMap = new Map();
    const currentItems = $$('.navigation-bar__item', bar);

    currentItems.forEach(item => {
        const action = item.dataset.action;
        itemsMap.set(action, item);
    });

    // Спочатку переміщуємо кнопку "Назад" на початок (якщо вона існує)
    const backItem = itemsMap.get('back');
    if (backItem) {
        bar.prepend(backItem);
    }

    // Далі додаємо елементи у контейнер у бажаному порядку
    for (const action of desiredOrder) {
        const item = itemsMap.get(action);
        if (item) {
            bar.appendChild(item);
        }
    }
  }


  function adjustSpacing(){
    const bar=$('.navigation-bar__body');
    if(!bar) return;
    
    // Отримуємо всі видимі елементи (у Lampa "back" часто прихований, тому він не матиме flex: 1 1 auto)
    // Просто беремо всі елементи, оскільки вони мають однаковий стиль flex
    const items=$$('.navigation-bar__item', bar);
    // Фільтруємо ті, що явно приховані, щоб вони не брали участь у розрахунках
    const visibleItems = items.filter(item => item.style.display !== 'none' && item.dataset.action !== 'movie');
    
    if(!visibleItems.length) return;

    const width=bar.clientWidth;
    const count=visibleItems.length;
    const minGap=Math.max(4,Math.floor(width*0.006));
    const totalGap=minGap*(count-1);
    const available=width-totalGap;
    const itemWidth=Math.floor(available/count);

    // Присвоюємо однакову ширину всім видимим елементам
    visibleItems.forEach((it,i)=>{
      it.style.flex=`0 0 ${itemWidth}px`;
      it.style.marginRight=(i<count-1)?`${minGap}px`:'0';
      it.style.marginLeft='0';
    });
  }

  function init(){
    injectCSS();
    const bar = $('.navigation-bar__body');
    if(!bar) return;
    
    // 1. ОНОВЛЮЄМО ІСНУЮЧІ ЕЛЕМЕНТИ (НЕ СТВОРЮЄМО НОВІ)
    
    // A. Замінюємо "movie" на "home" (фікс проблеми з дублюванням)
    updateExistingItem('movie', 'home', HOME_SVG, bar); 
    
    // B. Оновлюємо іконки та обробники для стандартних кнопок Lampa
    updateExistingItem('search', 'search', SEARCH_SVG, bar); 
    updateExistingItem('settings', 'settings', SETTINGS_SVG, bar); 
    updateExistingItem('back', 'back', BACK_SVG, bar); // Оновлюємо іконку для "Назад"
    
    // 2. СТВОРЮЄМО НОВІ ЕЛЕМЕНТИ (ЯКИХ НЕ БУЛО)
    createNewItem('favorite', FAVORITE_SVG, bar); 
    createNewItem('history', HISTORY_SVG, bar);
    
    // 3. Встановлюємо правильний порядок
    sortItems(bar);
    
    // 4. Налаштовуємо рівномірний розподіл
    adjustSpacing();

    const ro=new ResizeObserver(adjustSpacing);
    ro.observe(bar);
    window.addEventListener('resize',adjustSpacing);
    window.addEventListener('orientationchange',adjustSpacing);
  }

  const mo=new MutationObserver(()=>{
    const bar=$('.navigation-bar__body');
    if(bar){mo.disconnect();init();}
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
  if($('.navigation-bar__body')){mo.disconnect();init();}
})();

