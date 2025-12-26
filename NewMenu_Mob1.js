Lampa.Platform.tv();

(function () {
  'use strict';

  /** SVG-иконки через спрайт */
  // MOVIE_SVG - не потрібен, оскільки Lampa додає його автоматично
  const FAVORITE_SVG = `<svg><use xlink:href="#sprite-favorite"></use></svg>`; 
  const HISTORY_SVG = `<svg><use xlink:href="#sprite-history"></use></svg>`;
  const SEARCH_SVG = `<svg><use xlink:href="#sprite-search"></use></svg>`; 
  const SETTINGS_SVG = `<svg><use xlink:href="#sprite-settings"></use></svg>`; 
  const MOVIE_SVG = `<svg><use xlink:href="#sprite-movie"></use></svg>`; 
  
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
      box-shadow: 0 2px 25px rgba(0,0,0,0.6);
      border-top: 1px solid rgba(255,255,255,0.15);
      overflow: hidden !important;
  }

  /* **ПРИМУСОВО ХОВАЄМО ВСІ ДУБЛІКАТИ** (якщо вони з'являться) */
  /* Lampa іноді додає movie, іноді home. Приховуємо обидва. */
  .navigation-bar__item[data-action="movie"],
  .navigation-bar__item[data-action="home"] {
      display: none !important;
  }
  
  /* **ПОВЕРТАЄМО ПОШУК** */
  .navigation-bar__item[data-action="search"] {
      display: flex !important; 
  }
  
  /* Забезпечуємо, що Налаштування (які Lampa додає) мають однаковий стиль */
  .navigation-bar__item[data-action="settings"] {
      display: flex !important;
      margin-left: 0 !important; 
      margin-right: 0 !important; 
      flex: 1 1 auto !important; 
      width: auto; 
  }
  
  /* ... (Решта вашого CSS для дизайну) */
  .navigation-bar__item {
      flex: 1 1 auto !important;
      display: flex !important;
      align-items: center;
      justify-content: center;
      height: 70px !important;
      margin: 0 4px !important;
      
      /* Візуальні покращення */
      background: rgba(255,255,255,0.05); 
      box-shadow: inset 0 0 10px rgba(0,0,0,0.3), 0 4px 15px rgba(0,0,0,0.4);
      
      border-radius: 14px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all .25s cubic-bezier(0.17, 0.84, 0.44, 1);
      box-sizing: border-box;
  }

  /* Ефект наведення (градієнт та 3D-відчуття) */
  .navigation-bar__item:hover,
  .navigation-bar__item.active {
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%);
      transform: scale(1.08);
      box-shadow: inset 0 0 10px rgba(0,0,0,0.1), 0 8px 25px rgba(100,200,255,0.3);
  }

  .navigation-bar__icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
  }

  .navigation-bar__icon svg {
      width: 22px !important;
      height: 22px !important;
      fill: #F0F0F0 !important;
      /* Додано: Плавність іконки */
      transition: fill .25s, transform .25s;
  }
  
  /* Анімація іконки при наведенні (додано для завершення дизайну) */
  .navigation-bar__item:hover .navigation-bar__icon svg {
      transform: scale(1.15); 
      fill: #FFFFFF !important;
  }

  /* Полностью скрываем подписи */
  .navigation-bar__label {
      display: none !important;
  }

  @media (max-width: 900px) {
      .navigation-bar__item { height: 66px !important; border-radius: 13px; }
  }
  @media (max-width: 600px) {
      .navigation-bar__item { height: 60px !important; border-radius: 12px; }
      .navigation-bar__icon svg { width: 20px !important; height: 20px !important; }
  }
  `;

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
    if(!bar || bar.querySelector(`[data-action="${action}"]`)) return; // Не додаємо, якщо вже є
    
    const div = document.createElement('div');
    div.className = 'navigation-bar__item';
    div.dataset.action = action;
    div.innerHTML = `<div class="navigation-bar__icon">${svg}</div>`;
    
    // Вставляємо перед Налаштуваннями (settings)
    const settings = bar.querySelector('.navigation-bar__item[data-action="settings"]');
    
    // Вставляємо перед елементом "Фільми", якщо він існує і ми додаємо щось інше
    const movie = bar.querySelector('.navigation-bar__item[data-action="movie"]');

    let target = settings;
    
    if (target) {
        bar.insertBefore(div, target);
    } else if (movie) {
        bar.insertBefore(div, movie); // Вставити перед Фільмами
    } else {
        bar.appendChild(div);
    }

    div.addEventListener('click', () => emulateSidebarClick(action));
  }
  
  // Функція для оновлення іконок існуючих елементів Lampa (movie, search, settings, back)
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
    
    if(action === 'back'){
        item.removeEventListener('click', item._click_handler);
        const handler = () => emulateSidebarClick('back');
        item.addEventListener('click', handler);
        item._click_handler = handler;
    }
    // ДОДАТКОВИЙ ФІКС: Забезпечуємо, що елемент visible
    if(action === 'search' || action === 'settings' || action === 'movie') {
        item.style.display = 'flex';
    }
  }


  function adjustSpacing(){
    const bar=$('.navigation-bar__body');
    if(!bar) return;
    
    const items=$$('.navigation-bar__item', bar); 
    // Виключаємо лише елементи, які приховуються CSS (movie/home)
    const visibleItems = items.filter(item => {
        const computedStyle = window.getComputedStyle(item);
        return computedStyle.display !== 'none';
    });
    
    if(!visibleItems.length) return;

    const width=bar.clientWidth;
    const count=visibleItems.length;
    const minGap=Math.max(2,Math.floor(width*0.005));
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
    
    // ПОРЯДОК: settings, search, history, favorite, movie

    // 1. Оновлюємо Налаштування (Lampa додає)
    updateLampaItem('settings', SETTINGS_SVG); 

    // 2. Додаємо Пошук (стане перед Налаштуваннями)
    addItem('search', SEARCH_SVG); 
    
    // 3. Додаємо Історію (стане перед Пошуком)
    addItem('history', HISTORY_SVG);
    
    // 4. Додаємо Вибране (стане перед Історією)
    addItem('favorite', FAVORITE_SVG); 
    
    // 5. Оновлюємо Фільми (Lampa додає)
    updateLampaItem('movie', MOVIE_SVG); 

    // 6. Оновлюємо Назад
    updateLampaItem('back', `<svg><use xlink:href="#sprite-arrow-left"></use></svg>`);
    
    adjustSpacing();

    const bar=$('.navigation-bar__body');
    if(!bar) return;
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

