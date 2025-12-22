(function () {
  'use strict';

  // ❗ КРИТИЧНО: ДО appready
  const tpl = `
    <div style="
      position:fixed;
      inset:0;
      background:black;
      color:white;
      z-index:999999;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:4vh;
    ">
      NETFLIX / APPLE TV TEST
    </div>
  `;

  // ❗ ПЕРЕЗАПИС, А НЕ ADD
  Lampa.Template.set('full_start_new', tpl);

})();
