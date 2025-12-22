(function () {
  'use strict';

  if (!window.Lampa) return;

  /* ======================================================
     TEMPLATE (на базі Applecation)
     ====================================================== */

  var template = `
    <div class="nf-wrap">
      <div class="nf-content">
        <div class="nf-studio"></div>
        <div class="nf-logo"></div>
        <div class="nf-meta"></div>
        <div class="nf-overview"></div>
        <div class="buttons"></div>
      </div>
    </div>
  `;

  Lampa.Template.add('full_start_new', template);

  /* ======================================================
     STYLES (Netflix / Apple TV)
     ====================================================== */

  var css = `
    .nf-wrap {
      position: absolute;
      inset: 0;
      padding: 6vh 6vw;
      display: flex;
      align-items: flex-end;
      background: linear-gradient(
        to right,
        rgba(0,0,0,.9) 40%,
        rgba(0,0,0,.4) 65%,
        transparent 100%
      );
    }

    .nf-content {
      max-width: 45vw;
    }

    .nf-studio img {
      max-height: 42px;
      margin-bottom: 1.2em;
      opacity: .85;
      filter: invert(1);
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
     DATA FILL (як у твоєму коді)
     ====================================================== */

  function fillCard(e) {
    var data = e.data && e.data.movie;
    var activity = e.object && e.object.activity;
    if (!data || !activity) return;

    var render = activity.render();

    /* ---------- META ---------- */

    var year = (data.release_date || data.first_air_date || '').slice(0, 4);
    var genres = (data.genres || []).slice(0, 2).map(function (g) {
      return g.name;
    }).join(' · ');

    var runtime = '';
    if (data.runtime) {
      runtime =
        Math.floor(data.runtime / 60) +
        'h ' +
        (data.runtime % 60) +
        'm';
    }

    render.find('.nf-meta').text(
      [year, genres, runtime].filter(Boolean).join(' · ')
    );

    render.find('.nf-overview').text(data.overview || '');

    /* ---------- STUDIO LOGO ---------- */

    var studio =
      (data.networks && data.networks[0]) ||
      (data.production_companies && data.production_companies[0]);

    if (studio && studio.logo_path) {
      var studio_img = Lampa.Api.img(studio.logo_path, 'w300');
      render.find('.nf-studio').html('<img src="' + studio_img + '">');
    }

    /* ---------- MOVIE / SERIES LOGO ---------- */

    var type = data.name ? 'tv' : 'movie';
    var lang = Lampa.Storage.get('language', 'en');

    $.get(
      Lampa.TMDB.api(type + '/' + data.id + '/images'),
      function (res) {
        if (!res || !res.logos || !res.logos.length) return;

        var logo =
          res.logos.find(function (l) {
            return l.iso_639_1 === lang;
          }) ||
          res.logos.find(function (l) {
            return l.iso_639_1 === 'en';
          }) ||
          res.logos[0];

        if (!logo) return;

        var img =
          Lampa.TMDB.image('/t/p/original' + logo.file_path);

        render.find('.nf-logo').html('<img src="' + img + '">');
      }
    );
  }

  /* ======================================================
     LISTENER
     ====================================================== */

  Lampa.Listener.follow('full', function (e) {
    if (e.type === 'complite') fillCard(e);
  });

})();
