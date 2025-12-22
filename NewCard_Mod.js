(function () {
  'use strict';

  if (!window.Lampa) return;

  /* ======================================================
     TEMPLATE — 100% СУМІСНИЙ З ЯДРОМ
     ====================================================== */

  var template = `
    <div class="full-start">

      <div class="full-start__poster"></div>

      <div class="full-start__body">

        <div class="full-start__title"></div>
        <div class="full-start__info"></div>

        <!-- NETFLIX / APPLE TV UI -->
        <div class="nf-wrap">
          <div class="nf-studio"></div>
          <div class="nf-logo"></div>
          <div class="nf-meta"></div>
          <div class="nf-overview"></div>
        </div>

        <div class="full-start__buttons"></div>

      </div>
    </div>
  `;

  Lampa.Template.add('full_start_new', template);

  /* ======================================================
     STYLES
     ====================================================== */

  var css = `
    .nf-wrap {
      margin-top: 2em;
      max-width: 45vw;
    }

    .full-start__title,
    .full-start__info {
      display: none;
    }

    .nf-studio img {
      max-height: 42px;
      margin-bottom: 1.2em;
      filter: invert(1);
      opacity: .85;
    }

    .nf-logo img {
      max-height: 220px;
      max-width: 100%;
      margin-bottom: 1em;
    }

    .nf-meta {
      font-size: 1.15em;
      opacity: .85;
      margin-bottom: .8em;
    }

    .nf-overview {
      font-size: 1.05em;
      line-height: 1.55;
      opacity: .8;
      margin-bottom: 1.4em;
    }
  `;

  $('head').append('<style>' + css + '</style>');

  /* ======================================================
     DATA (SAFE, ЯК В APPLECATION)
     ====================================================== */

  function fillCard(e) {
    var data = e?.data?.movie;
    var activity = e?.object?.activity;
    if (!data || !activity) return;

    var render = activity.render();

    var year = (data.release_date || data.first_air_date || '').slice(0, 4);
    var genres = (data.genres || []).slice(0, 2).map(g => g.name).join(' · ');
    var runtime = data.runtime
      ? Math.floor(data.runtime / 60) + 'h ' + (data.runtime % 60) + 'm'
      : '';

    render.find('.nf-meta').text(
      [year, genres, runtime].filter(Boolean).join(' · ')
    );

    render.find('.nf-overview').text(data.overview || '');

    var studio =
      data.networks?.[0] || data.production_companies?.[0];

    if (studio?.logo_path) {
      render.find('.nf-studio').html(
        `<img src="${Lampa.Api.img(studio.logo_path, 'w300')}">`
      );
    }

    var type = data.name ? 'tv' : 'movie';
    var lang = Lampa.Storage.get('language', 'en');

    $.get(Lampa.TMDB.api(`${type}/${data.id}/images`), res => {
      var logos = res?.logos || [];
      var logo =
        logos.find(l => l.iso_639_1 === lang) ||
        logos.find(l => l.iso_639_1 === 'en') ||
        logos[0];

      if (logo) {
        render.find('.nf-logo').html(
          `<img src="${Lampa.TMDB.image('/t/p/original' + logo.file_path)}">`
        );
      }
    });
  }

  /* ======================================================
     LISTENER
     ====================================================== */

  Lampa.Listener.follow('full', e => {
    if (e.type === 'complite') fillCard(e);
  });

})();
