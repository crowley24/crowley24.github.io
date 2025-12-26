Lampa.Platform.tv();

(function () {
  'use strict';

  /** SVG-иконки через спрайт */
  // ! ВИДАЛЕНО: const MOVIE_SVG = `<svg><use xlink:href="#sprite-movie"></use></svg>`;
  const FAVORITE_SVG = `<svg><use xlink:href="#sprite-favorite"></use></svg>`; 
  const HISTORY_SVG  = `<svg><use xlink:href="#sprite-history"></use></svg>`;
  const SEARCH_SVG   = `<svg><use xlink:href="#sprite-search"></use></svg>`;     // Іконка для Пошуку
  const SETTINGS_SVG = `<svg><use xlink:href="#sprite-settings"></use></svg>`;   // Іконка для Налаштувань

  /** CSS (З покращеними ефектами, видимим пошуком та прихованим movie) */
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

  /* **ПРИМУСОВО ХОВАЄМО СТАРИЙ ЕЛЕМЕНТ "ФІЛЬМИ"** (якщо він з'явиться від Lampa) */
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

  /* Загальний стиль елементів (ПОКРАЩЕНІ ЕФЕКТИ) */
  .navigation-bar__item {
      flex: 1 1 auto !important;
      display: flex !important;
      align-items: center;
      justify-content: center;
      height: 70px !important;
      margin: 0 4px !important;
      
      background: rgba(255,255,255,0.05); 
      box-shadow: inset 0 0 12px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.5); 
      
      border-radius: 16px; 
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all .35s cubic-bezier(0.25, 0.46, 0.45, 0.94); 
      box-sizing: border-box;
      position: relative; 
  }

  /* **ЕФЕКТ НАВЕДЕННЯ** */
  .navigation-bar__item:hover,
  .navigation-bar__item.active {
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.3) 100%);
      transform: scale(1.1); 
      box-shadow: inset 0 0 8px rgba(0,0,0,0.1), 0 10px 30px rgba(100,200,255,0.5); 
  }

  /* **АНІМАЦІЯ ІКОНКИ** */
  .navigation-bar__item:hover .navigation-bar__icon svg {
      transform: scale(1.15) rotate(5deg);
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

  function emulateSidebarClick(action){
    // Використовуємо Router.back для "Назад", якщо він не працює через sidebar
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
  
  // Функція додавання елемента, використовуємо вашу логіку вставки
  function addItem(action, svg){
    const bar = $('.navigation-bar__body');
    if(!bar || bar.querySelector(`[data-action="${action}"]`)) return;
    
    const div = document.createElement('div');
    div.className = 'navigation-bar__item';
    div.dataset.action = action;
    div.innerHTML = `<div class="navigation-bar__icon">${svg}</div>`;
    
    // Вставляємо перед Налаштуваннями (якщо вони є) 
    const settings = bar.querySelector('.navigation-bar__item[data-action="settings"]');
    
    // Вставляємо перед Пошуком, якщо ми додаємо його і він вже є від Lampa
    const search = bar.querySelector('.navigation-bar__item[data-action="search"]');

    let target = settings;
    if (action === 'search' && settings) {
        // Якщо ми додаємо search, і settings вже є, вставляємо перед settings
        target = settings; 
    } else if (action === 'search' && !settings) {
         // Якщо ми додаємо search, а settings ще немає, вставляємо перед існуючим search Lampa
         target = search;
    } else if (action === 'settings' && search) {
         // Якщо ми додаємо settings, а search вже є, вставляємо після search
         target = search.nextSibling;
    } else {
        // Загальний випадок: вставляємо перед settings
        target = settings;
    }

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
      // Створюємо контейнер, якщо його немає (це виправляє проблему з іконкою "Назад")
      iconContainer = document.createElement('div');
      iconContainer.className = 'navigation-bar__icon';
      item.prepend(iconContainer);
    }
    iconContainer.innerHTML = svg;
    
    // Гарантуємо, що у "Назад" правильний обробник
    if(action === 'back'){
        item.removeEventListener('click', item._click_handler);
        const handler = () => emulateSidebarClick('back');
        item.addEventListener('click', handler);
        item._click_handler = handler;
    }
  }


  function adjustSpacing(){
    const bar=$('.navigation-bar__body');
    if(!bar) return;
    
    // Отримуємо ВСІ видимі елементи, виключаючи "movie" та інші приховані
    const items=$$('.navigation-bar__item', bar);
    const visibleItems = items.filter(item => {
        const computedStyle = window.getComputedStyle(item);
        // Фільтруємо елементи, які явно приховані CSS або є старим 'movie'
        return computedStyle.display !== 'none' && item.dataset.action !== 'movie'; 
    });
    
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

    // 1. **КРОК ВИДАЛЕННЯ: Ми НЕ викликаємо addItem('movie', MOVIE_SVG);**
    // Lampa додасть movie автоматично, але ми приховаємо його через CSS.
    
    // 2. ДОДАВАННЯ КНОПОК
    
    // Створюємо нову кнопку "Головна" (home), яка буде поводитись як movie
    addItem('home', HOME_SVG); 
    
    // Додавання ваших кнопок
    addItem('favorite', FAVORITE_SVG); 
    addItem('history', HISTORY_SVG);
    
    // Додаємо Пошук (тепер він буде перед Налаштуваннями)
    addItem('search', SEARCH_SVG); 
    
    // Налаштування Lampa додає сама, ми лише оновлюємо іконки
    updateLampaItem('settings', SETTINGS_SVG); 
    updateLampaItem('search', SEARCH_SVG); // Оновлюємо іконку для існуючого search, якщо він був
    updateLampaItem('back', BACK_SVG);      // Оновлюємо іконку для "Назад"

    
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

