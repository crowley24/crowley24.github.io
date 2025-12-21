(function () {
  'use strict';

  /* ======================================================
     INIT
  ====================================================== */
  function init() {
    if (!Lampa.Platform.screen('tv')) return;

    addTemplate();
    addStyles();
    addListener();
  }

  /* ======================================================
     TEMPLATE
     (мінімальний, бо UI вставляємо вручну)
  ====================================================== */
  function addTemplate() {
    Lampa.Template.add('full_start_new', `<div class="nf-wrap"></div>`);
  }

  /* ======================================================
     STYLES
  ====================================================== */
  function addStyles() {
    const css = `
      .nf-left {
        max-width: 55vw;
        padding-top: 2vh;
      }

      .nf-logo img {
        max-height: 160px;
        max-width: 40vw;
        margin-bottom: 1em;
      }

      .nf-title {
        font-size: 3em;
        font-weight: 700;
        margin-bottom: .3em;
      }

      .nf-meta {
        font-size: 1.1em;
        opacity: .9;
        margin-bottom: 1.2em;
      }

      .nf-buttons {
        display: flex;
        gap: 1em;
        margin-bottom: 1.2em;
      }

      .nf-btn {
        padding: .8em 1.4em;
        border-radius: .3em;
        background: rgba(255,255,255,.15);
        font-size: 1.1em;
      }

      .nf-btn--play {
        background: #fff;
        color: #000;
        font-weight: 600;
      }

      .nf-desc {
        font-size: .95em;
        max-width: 45vw;
        color: rgba(255,255,255,.75);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `;

    $('body').append(`<style id="nf-ui-style">${css}</style>`);
  }

  /* ======================================================
     LISTENER
  ====================================================== */
  function addListener() {
    Lampa.Listener.follow('full', e => {
      if (e.type !== 'complite') return;
      buildUI(e.object.activity, e.data.movie);
    });
  }

  /* ======================================================
     BUILD UI
  ====================================================== */
  function buildUI(activity, data) {
    const render = activity.render();
    const left = render.find('.full-start__left');
    const reactions = render.find('.full-start__reactions');

    if (!left.length) return;

    left.empty();

    const ui = $(`
      <div class="nf-left">
        <div class="nf-logo"></div>
        <div class="nf-meta"></div>

        <div class="nf-buttons">
          <div class="nf-btn nf-btn--play selector button--play">
            ▶ <span>Play</span>
          </div>
          <div class="nf-btn selector">+ My List</div>
          <div class="nf-btn selector">⋯</div>
        </div>

        <div class="nf-desc"></div>
      </div>
    `);

    left.append(ui);

    // reactions залишаємо справа
    if (reactions.length) {
      render.find('.full-start__right').append(reactions);
    }

    fillData(render, data);
  }

  /* ======================================================
     FILL DATA
  ====================================================== */
  function fillData(render, data) {
    const meta = [];

    if (data.release_date || data.first_air_date) {
      meta.push((data.release_date || data.first_air_date).slice(0, 4));
    }

    if (data.genres && data.genres.length) {
      meta.push(data.genres.slice(0, 2).map(g => g.name).join(', '));
    }

    if (data.runtime) {
      meta.push(
        Math.floor(data.runtime / 60) + 'h ' +
        (data.runtime % 60) + 'm'
      );
    }

    render.find('.nf-meta').text(meta.join(' · '));
    render.find('.nf-desc').text(data.overview || '');

    loadLogo(render, data);
  }

  /* ======================================================
     LOGO (TMDB)
  ====================================================== */
  function loadLogo(render, data) {
    const type = data.name ? 'tv' : 'movie';
    const lang = Lampa.Storage.get('language', 'en');

    const url = Lampa.TMDB.api(`${type}/${data.id}/images`);

    $.get(url, res => {
      const logos = res && res.logos ? res.logos : [];
      const logo =
        logos.find(l => l.iso_639_1 === lang) ||
        logos.find(l => l.iso_639_1 === 'en') ||
        logos[0];

      const container = render.find('.nf-logo');

      if (logo) {
        const img = new Image();
        img.src = Lampa.TMDB.image('/t/p/w500' + logo.file_path);
        container.html(img);
      } else {
        container.html(
          `<div class="nf-title">${data.title || data.name}</div>`
        );
      }
    });
  }

  /* ======================================================
     START
  ====================================================== */
  if (window.appready) init();
  else {
    Lampa.Listener.follow('app', e => {
      if (e.type === 'ready') init();
    });
  }

})();
