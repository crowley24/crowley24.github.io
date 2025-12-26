Lampa.Platform.tv();

(function () {
  'use strict';

  /** SVG-иконки через спрайт */
  const FAVORITE_SVG = `<svg><use xlink:href="#sprite-favorite"></use></svg>`; 
  const HISTORY_SVG  = `<svg><use xlink:href="#sprite-history"></use></svg>`;
  const SEARCH_SVG   = `<svg><use xlink:href="#sprite-search"></use></svg>`; 
  const SETTINGS_SVG = `<svg><use xlink:href="#sprite-settings"></use></svg>`; 
  const HOME_SVG     = `<svg><use xlink:href="#sprite-home"></use></svg>`;      // Іконка для "Головної"
  const BACK_SVG     = `<svg><use xlink:href="#sprite-arrow-left"></use></svg>`; // Іконка для "Назад"

  /** CSS (З покращеннями світіння та порядку) */
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
      box-shadow: 0 2px 30px rgba(0,0,0,0.8);
      border-top: 1px solid rgba(255,255,255,0.15);
      overflow: hidden !important;
  }

  /* **ПРИМУСОВО ХОВАЄМО СТАРИЙ ЕЛЕМЕНТ "ФІЛЬМИ"** (який створює дублікат) */
  .navigation-bar__item[data-action="movie"] {
      display: none !important;
  }

  /* **ПОВЕРТАЄМО ПОШУК** */
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
      
      background: rgba(255,255,255,0.05); 
      box-shadow: inset 0 0 12px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.5); /* Покращена тінь */
      
      border-radius: 16px; 
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all .35s cubic-bezier(0.25, 0.46, 0.45, 0.94); 
      box-sizing: border-box;
      position: relative; 
  }

  /* **ПОКРАЩЕНИЙ ЕФЕКТ НАВЕДЕННЯ** (СВІТІННЯ + ЗБІЛЬШЕННЯ) */
  .navigation-bar__item:hover,
  .navigation-bar__item.active {
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.3) 100%);
      transform: scale(1.1); 
      box-shadow: inset 0 0 8px rgba(0,0,0,0.1), 0 10px 30px rgba(100,200,255,0.5); /* Неонове світіння */
  }

  /* **АНІМАЦІЯ ІКОНКИ** (без обертання) */
  .navigation-bar__item:hover .navigation-bar__icon svg {
      transform: scale(1.15); 
      transition: transform .35s;
      fill: #FFFFFF !important;
  }

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

  // >>> ПОВЕРНУТА ОРИГІНАЛЬНА ЛОГІКА КЛІКІВ (без прямого виклику Router)
  function emulateSidebarClick(action){
    // Спеціальний обробник для кнопки "Назад" (якщо він спрацював без помилок у попередній версії)
    if(action === 'back') {
        Lampa.Router.back();
        return;
    }
    
    for(const el of $$('.menu__item, .selector')){
      if(el.dataset && el.dataset.action && el.dataset.action === action){
        el.click();
        return;
      }
    }
  }
  
  // Функція додавання елемента
  function addItem(action, svg){
    const bar = $('.navigation-bar__body');
    // Ми дозволимо додати "search", навіть якщо він існує, щоб правильно його позиціонувати
    if(!bar || (action !== 'search' && bar.querySelector(`[data-action="${action}"]`))) return;
    
    // Якщо елемент вже існує, ми не додаємо його, а оновлюємо (для пошуку, якщо Lampa його вже створила)
    if(bar.querySelector(`.navigation-bar__item[data-action="${action}"]`)) {
        updateLampaItem(action, svg);
        return;
    }
    
    const div = document.createElement('div');
    div.className = 'navigation-bar__item';
    div.dataset.action = action;
    div.innerHTML = `<div class="navigation-bar__icon">${svg}</div>`;
    
    // Вставляємо перед Налаштуваннями (settings)
    const settings = bar.querySelector('.navigation-bar__item[data-action="settings"]');
    
    // Вставляємо перед іншим елементом
    let target = settings;
    
    if (target) {
        bar.insertBefore(div, target);
    } else {
        bar.appendChild(div);
    }

    div.addEventListener('click', () => emulateSidebarClick(action));
  }

  // Функція для оновлення іконок існуючих елементів Lampa (search, settings, back)
  function updateLampaItem(action, svg){
    const item = $('.navigation-bar__item[data-action="' + action + '"]');
    if(!item) return;

    let iconContainer = item.querySelector('.navigation-bar__icon');
    if(!iconContainer){
      iconContainer = document.createElement('div');
      iconContainer.className = 'navigation-bar__icon';
      item.prepend(iconContainer);
    }
    iconContainer.innerHTML = svg;
    
    // Оновлення обробника кліку для "Назад"
    if(action === 'back'){
        item.removeEventListener('click', item._click_handler);
        const handler = () => emulateSidebarClick('back');
        item.addEventListener('click', handler);
        item._click_handler = handler;
    }
  }

  // Функція сортування (для гарантії правильного порядку)
  function sortItems(bar){
    // Бажаний порядок: [back], home, favorite, history, search, settings
    const desiredOrder = ['home', 'favorite', 'history', 'search', 'settings'];
    const itemsMap = new Map();
    const currentItems = $$('.navigation-bar__item', bar);

    currentItems.forEach(item => {
        const action = item.dataset.action;
        itemsMap.set(action, item);
    });

    const backItem = itemsMap.get('back');
    const fragment = document.createDocumentFragment();

    // Видаляємо всі елементи, крім back
    currentItems.forEach(item => {
        if (item.dataset.action !== 'back') {
            item.remove();
        }
    });

    // Додаємо елементи у фрагмент у бажаному порядку
    for (const action of desiredOrder) {
        const item = itemsMap.get(action);
        if (item) {
            fragment.appendChild(item);
        }
    }
    
    // Додаємо все назад
    if (backItem) {
        bar.prepend(backItem); // back завжди перший
    }
    bar.appendChild(fragment); 
  }


  function adjustSpacing(){
    const bar=$('.navigation-bar__body');
    if(!bar) return;
    
    const items=$$('.navigation-bar__item', bar);
    const visibleItems = items.filter(item => {
        const computedStyle = window.getComputedStyle(item);
        // Виключаємо приховані та 'movie'
        return computedStyle.display !== 'none' && item.dataset.action !== 'movie'; 
    });
    
    if(!visibleItems.length) return;

    const width=bar.clientWidth;
    const count=visibleItems.length;
    const minGap=Math.max(4,Math.floor(width*0.006));
    const totalGap=minGap*(count-1);
    const available=width-totalGap;
    const itemWidth=Math.floor(available/count);

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
    
    // 1. ДОДАВАННЯ "HOME" (яка замінить movie)
    // Ми додаємо Home. Елемент movie буде приховано CSS.
    addItem('home', HOME_SVG); 

    // 2. ДОДАВАННЯ КНОПОК
    addItem('favorite', FAVORITE_SVG); 
    addItem('history', HISTORY_SVG);
    // Додаємо search, який буде вставлено перед settings
    addItem('search', SEARCH_SVG); 
    
    // 3. ОНОВЛЮЄМО ІКОНКИ Lampa:
    updateLampaItem('settings', SETTINGS_SVG); 
    updateLampaItem('search', SEARCH_SVG); 
    updateLampaItem('back', BACK_SVG); 

    
    // 4. Встановлюємо правильний порядок
    sortItems(bar);

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

