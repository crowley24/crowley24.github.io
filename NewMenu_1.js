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
      background: rgba(20,20,25,0.55); /* Трохи менш прозорий фон */
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 2px 20px rgba(0,0,0,0.5); /* Більш виразний тінь */
      border-top: 1px solid rgba(255,255,255,0.1);
      overflow: hidden !important;
  }

  /* Повне приховування елемента пошуку */
  .navigation-bar__item[data-action="search"] {
      display: none !important;
  }

  .navigation-bar__item {
      flex: 1 1 auto !important;
      display: flex !important;
      align-items: center;
      justify-content: center;
      height: 70px !important;
      margin: 0 4px !important;
      background: rgba(255,255,255,0.08); /* Трохи виразніший фон елементів */
      border-radius: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.35);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: background .2s ease, transform .2s ease, box-shadow .2s ease; /* Додано тінь для плавного переходу */
      box-sizing: border-box;
  }

  .navigation-bar__item:hover,
  .navigation-bar__item.active {
      background: rgba(255,255,255,0.18); /* Яскравіший ховер */
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(0,0,0,0.4); /* Кращий ефект "підняття" */
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
      fill: #FFFFFF !important; /* Гарантуємо, що іконки білі */
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

  function addItem(action, svg){
    const bar = $('.navigation-bar__body');
    // Не додаємо, якщо кнопка вже є
    if(!bar || bar.querySelector(`[data-action="${action}"]`)) return;
    
    const div = document.createElement('div');
    div.className = 'navigation-bar__item';
    div.dataset.action = action;
    div.innerHTML = `<div class="navigation-bar__icon">${svg}</div>`;
    
    // Новий елемент додаємо в кінець панелі, оскільки пошук ми приховуємо
    bar.appendChild(div); 
    div.addEventListener('click', () => emulateSidebarClick(action));
  }

  function adjustSpacing(){
    const bar=$('.navigation-bar__body');
    if(!bar) return;
    // Отримуємо тільки видимі елементи, виключаючи прихований пошук
    const items=$$('.navigation-bar__item:not([data-action="search"])', bar); 
    if(!items.length) return;

    const width=bar.clientWidth;
    const count=items.length;
    const minGap=Math.max(2,Math.floor(width*0.005));
    const totalGap=minGap*(count-1);
    const available=width-totalGap;
    const itemWidth=Math.floor(available/count);

    items.forEach((it,i)=>{
      it.style.flex=`0 0 ${itemWidth}px`;
      it.style.marginRight=(i<count-1)?`${minGap}px`:'0';
    });
  }

  function init(){
    injectCSS();
    // Порядок додавання визначає порядок на панелі: Фільми, Вибране, Історія
    addItem('movie', MOVIE_SVG); 
    addItem('favorite', FAVORITE_SVG); // Зберігаємо 'favorite'
    addItem('history', HISTORY_SVG);
    
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
