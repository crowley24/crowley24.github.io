Lampa.Platform.tv();

(function () {
  'use strict';

  /** SVG-иконки через спрайт */
  const MOVIE_SVG = `<svg><use xlink:href="#sprite-movie"></use></svg>`;
  const FAVORITE_SVG = `<svg><use xlink:href="#sprite-favorite"></use></svg>`; 
  const HISTORY_SVG = `<svg><use xlink:href="#sprite-history"></use></svg>`;

  /** CSS */
  const css = `
  .navigation-bar__body {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: 100% !important;
      padding: 6px 10px !important;
      background: rgba(20,20,25,0.6); /* Трохи темніше */
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow: 0 2px 25px rgba(0,0,0,0.6); /* Більш глибока тінь панелі */
      border-top: 1px solid rgba(255,255,255,0.15);
      overflow: hidden !important;
  }

  /* Повне приховування елемента пошуку */
  .navigation-bar__item[data-action="search"] {
      display: none !important;
  }
  
  /* Стиль для самої кнопки Налаштувань */
  .navigation-bar__item[data-action="settings"] {
      margin-left: auto !important; /* Виштовхує Налаштування вправо */
      margin-right: 0 !important; /* Прибирає відступ праворуч */
      flex: 0 0 auto !important; /* Налаштування не розтягується */
      width: 80px; /* Фіксована ширина для налаштувань */
  }

  /* Загальний стиль елементів */
  .navigation-bar__item {
      flex: 1 1 auto !important;
      display: flex !important;
      align-items: center;
      justify-content: center;
      height: 70px !important;
      margin: 0 4px !important;
      
      /* Візуальне покращення: легка внутрішня тінь, більш прозорий фон */
      background: rgba(255,255,255,0.05); 
      box-shadow: inset 0 0 10px rgba(0,0,0,0.3), 0 4px 15px rgba(0,0,0,0.4);
      
      border-radius: 14px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all .25s cubic-bezier(0.17, 0.84, 0.44, 1); /* Плавніша і швидша анімація */
      box-sizing: border-box;
  }

  /* Візуальне покращення: Ефект наведення (градієнт та 3D-відчуття) */
  .navigation-bar__item:hover,
  .navigation-bar__item.active {
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%); /* Градієнт */
      transform: scale(1.08); /* Сильніше збільшення */
      box-shadow: inset 0 0 10px rgba(0,0,0,0.1), 0 8px 25px rgba(100,200,255,0.3); /* Тінь з легким кольоровим акцентом */
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
      fill: #F0F0F0 !important; /* Світліший білий для іконок */
  }

  /* Полностью скрываем подписи */
  .navigation-bar__label {
      display: none !important;
  }

  @media (max-width: 900px) {
      .navigation-bar__item { height: 66px !important; border-radius: 13px; }
      .navigation-bar__item[data-action="settings"] { width: 70px; }
  }
  @media (max-width: 600px) {
      .navigation-bar__item { height: 60px !important; border-radius: 12px; }
      .navigation-bar__icon svg { width: 20px !important; height: 20px !important; }
      .navigation-bar__item[data-action="settings"] { width: 60px; }
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
  
  // Функція додавання елемента, змінена для правильного розташування
  function addItem(action, svg, isSettings = false){
    const bar = $('.navigation-bar__body');
    if(!bar || bar.querySelector(`[data-action="${action}"]`)) return;
    
    const div = document.createElement('div');
    div.className = 'navigation-bar__item';
    div.dataset.action = action;
    div.innerHTML = `<div class="navigation-bar__icon">${svg}</div>`;
    
    if (isSettings) {
        // Якщо це Налаштування, додаємо в кінець
        bar.appendChild(div);
    } else {
        // Інакше додаємо перед Налаштуваннями, якщо вони існують
        const settings = bar.querySelector('.navigation-bar__item[data-action="settings"]');
        if (settings) {
            bar.insertBefore(div, settings);
        } else {
            // Або просто в кінець, якщо налаштувань ще немає
            bar.appendChild(div);
        }
    }

    div.addEventListener('click', () => emulateSidebarClick(action));
  }

  function adjustSpacing(){
    const bar=$('.navigation-bar__body');
    if(!bar) return;
    // Отримуємо тільки видимі елементи, виключаючи прихований пошук та Налаштування
    const items=$$('.navigation-bar__item:not([data-action="search"]):not([data-action="settings"])', bar); 
    if(!items.length) return;

    const width=bar.clientWidth;
    const count=items.length;
    const minGap=Math.max(2,Math.floor(width*0.005));
    
    // Обчислюємо доступний простір
    let totalItemsWidth = 0;
    
    // Враховуємо ширину Налаштувань, якщо вони є
    const settings = bar.querySelector('.navigation-bar__item[data-action="settings"]');
    if (settings) {
        totalItemsWidth += settings.offsetWidth;
    }
    
    const totalGap = minGap * (count - 1); // Простір між основними кнопками
    
    // Віднімаємо загальну ширину налаштувань та відступів від загальної ширини
    const available = width - totalItemsWidth - totalGap - (settings ? minGap * 2 : 0); 
    
    const itemWidth=Math.floor(available/count);

    items.forEach((it,i)=>{
      it.style.flex=`0 0 ${itemWidth}px`;
      it.style.marginRight=(i<count-1)?`${minGap}px`:'';
    });
  }

  function init(){
    injectCSS();
    // Додавання нових кнопок в бажаному порядку
    addItem('movie', MOVIE_SVG); 
    addItem('favorite', FAVORITE_SVG); 
    addItem('history', HISTORY_SVG);
    
    // Налаштування додається в кінці з прапором 'isSettings = true'
    addItem('settings', `<svg><use xlink:href="#sprite-settings"></use></svg>`, true); 
    
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

