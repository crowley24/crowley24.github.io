Lampa.Platform.tv();

(function () {
  'use strict';

  /** SVG-иконки через спрайт */
  const HOME_SVG     = `<svg><use xlink:href="#sprite-home"></use></svg>`;      // Головна (заміна для movie)
  const FAVORITE_SVG = `<svg><use xlink:href="#sprite-favorite"></use></svg>`;   // Вибране
  const HISTORY_SVG  = `<svg><use xlink:href="#sprite-history"></use></svg>`;    // Історія
  const SEARCH_SVG   = `<svg><use xlink:href="#sprite-search"></use></svg>`;     // Пошук
  const SETTINGS_SVG = `<svg><use xlink:href="#sprite-settings"></use></svg>`;   // Налаштування

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
      box-shadow: 0 2px 30px rgba(0,0,0,0.8); /* Більш виражена тінь */
      border-top: 1px solid rgba(255,255,255,0.15);
      overflow: hidden !important;
  }

  /* Повертаємо видимість елементу пошуку */
  .navigation-bar__item[data-action="search"] {
      display: flex !important; 
  }
  
  /* Змінено: Прибираємо фіксовану ширину для Налаштувань та даємо однаковий стиль flex */
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
      box-shadow: inset 0 0 12px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.5);
      
      border-radius: 16px; /* Більші заокруглення */
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all .35s cubic-bezier(0.25, 0.46, 0.45, 0.94); /* Плавніша анімація */
      box-sizing: border-box;
      position: relative; 
  }

  /* Ефект наведення (скло та неонова тінь) */
  .navigation-bar__item:hover,
  .navigation-bar__item.active {
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.3) 100%);
      transform: scale(1.1); /* Більше збільшення при наведенні */
      box-shadow: inset 0 0 8px rgba(0,0,0,0.1), 0 10px 30px rgba(100,200,255,0.5); /* Більш яскрава неонова тінь */
  }
  
  /* Анімація іконки при наведенні */
  .navigation-bar__item:hover .navigation-bar__icon svg {
      transform: scale(1.15) rotate(5deg);
      transition: transform .35s;
      fill: #FFFFFF !important;
  }

  .navigation-bar__icon {
      width: 26px; /* Трохи більші іконки */
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
  
  // Функція керування елементами (оновлення/додавання)
  function manageItem(action, svg, bar){
    let item = bar.querySelector(`[data-action="${action}"]`);
    
    // Якщо елемент існує ("search", "settings" або старий "movie")
    if(item){
        // Якщо це старий "movie", ми його переназиваємо на "home"
        if(action === 'movie'){
            item.dataset.action = 'home';
            action = 'home';
            item.removeEventListener('click', item._click_handler); // Видаляємо старий обробник
        }
        
        // Оновлюємо іконку
        let iconContainer = item.querySelector('.navigation-bar__icon');
        if(!iconContainer){
            iconContainer = document.createElement('div');
            iconContainer.className = 'navigation-bar__icon';
            item.prepend(iconContainer);
        }
        iconContainer.innerHTML = svg;
    } 
    
    // Якщо елемент не існує і це не "movie"
    if(!item && action !== 'home'){
        const div = document.createElement('div');
        div.className = 'navigation-bar__item';
        div.dataset.action = action;
        div.innerHTML = `<div class="navigation-bar__icon">${svg}</div>`;
        bar.appendChild(div);
        item = div;
    }
    
    // Додаємо новий обробник кліку для всіх керуючих елементів
    if(item && !item._click_handler){
        const handler = () => emulateSidebarClick(action);
        item.addEventListener('click', handler);
        item._click_handler = handler; // Зберігаємо для уникнення дублювання
    }
    
    return item;
  }

  // Функція сортування елементів у потрібному порядку
  function sortItems(bar){
    // Бажаний порядок: favorite, history, search, settings. 
    // "home" (колишній "movie") буде додано на перше місце.
    const desiredOrder = ['home', 'favorite', 'history', 'search', 'settings'];
    
    // Збираємо всі елементи, які ми хочемо контролювати
    const controlledActions = desiredOrder.concat('back'); 
    const itemsMap = new Map();
    const currentItems = $$('.navigation-bar__item', bar);

    // Збираємо мапу та приховуємо елементи, які не потрібні, якщо вони з'явилися
    currentItems.forEach(item => {
        const action = item.dataset.action;
        if (controlledActions.includes(action)) {
            itemsMap.set(action, item);
        } else if(action !== 'back') {
             // Приховуємо все інше, окрім "back"
             item.style.display = 'none';
        }
    });

    // Створюємо новий порядок для основних кнопок
    desiredOrder.forEach(action => {
        const item = itemsMap.get(action);
        if(item) bar.appendChild(item); 
    });
    
    // Гарантуємо, що кнопка "Назад" (якщо вона є) залишається на початку
    const backItem = itemsMap.get('back');
    if (backItem) {
        bar.prepend(backItem);
    }
  }

  function adjustSpacing(){
    const bar=$('.navigation-bar__body');
    if(!bar) return;
    
    // Отримуємо ВСІ видимі елементи (тепер "search" видимий, "movie" прихований або перейменований)
    // Ми беремо всі елементи, які мають flex: 1 1 auto
    const items=$$('.navigation-bar__item:not([style*="display: none"])', bar); 
    if(!items.length) return;

    const width=bar.clientWidth;
    const count=items.length;
    const minGap=Math.max(4,Math.floor(width*0.006));
    const totalGap=minGap*(count-1);
    const available=width-totalGap;
    const itemWidth=Math.floor(available/count);

    // Присвоюємо однакову ширину всім видимим елементам
    items.forEach((it,i)=>{
      it.style.flex=`0 0 ${itemWidth}px`;
      it.style.marginRight=(i<count-1)?`${minGap}px`:'0';
      it.style.marginLeft='0';
    });
  }

  function init(){
    injectCSS();
    const bar = $('.navigation-bar__body');
    if(!bar) return;
    
    // 1. Керуємо елементами:
    // "movie" перейменовується на "home" і отримує нову іконку
    manageItem('movie', HOME_SVG, bar); 
    
    // Додаємо/оновлюємо інші кнопки
    manageItem('favorite', FAVORITE_SVG, bar); 
    manageItem('history', HISTORY_SVG, bar);
    manageItem('search', SEARCH_SVG, bar); 
    manageItem('settings', SETTINGS_SVG, bar);
    
    // Оновлюємо іконку для "Назад", якщо вона існує
    const backSVG = `<svg><use xlink:href="#sprite-arrow-left"></use></svg>`;
    manageItem('back', backSVG, bar);
    
    // 2. Встановлюємо правильний порядок
    sortItems(bar);
    
    // 3. Налаштовуємо рівномірний розподіл
    adjustSpacing();

    // 4. Спостерігачі для адаптивності
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

