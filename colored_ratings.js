(function () {
	"use strict";

	var InterFaceMod = {
		name: "interface_mod_ratings_only", 
		debug: false,
		settings: {
			colored_ratings: true, 
		},
	};

	// Функція для зміни кольору рейтингу фільмів і серіалів
	function updateVoteColors() {
		if (!InterFaceMod.settings.colored_ratings) return;

		// Функція для зміни кольору елемента залежно від рейтингу
		function applyColorByRating(element) {
			var $el = $(element);
			var voteText = $el.text().trim();

			// Якщо значення закінчується на одиночну 'K' (наприклад, 3.6K), ігноруємо підсвічування
			if (/^\d+(\.\d+)?K$/.test(voteText)) {
				return;
			}
			var match = voteText.match(/(\d+(\.\d+)?)/);
			if (!match) return;

			var vote = parseFloat(match[0]);
			if (isNaN(vote)) return;

			var color = "";

			// Логіка визначення кольору
			if (vote >= 0 && vote <= 3) {
				color = "red"; // Погано
			} else if (vote > 3 && vote < 6) {
				color = "orange"; // Середньо
			} else if (vote >= 6 && vote < 7) {
				color = "cornflowerblue"; // Непогано
			} else if (vote >= 7 && vote < 8) {
				color = "darkmagenta"; // Добре
			} else if (vote >= 8 && vote <= 10) {
				color = "lawngreen"; // Відмінно
			}

			if (color) {
				$el.css("color", color);
			}
		}

		// Обробляємо рейтинги на картках, у списках і на детальних сторінках
		$(".card__vote").each(function () {
			applyColorByRating(this);
		});

		$(".full-start__rate, .full-start-new__rate").each(function () {
			applyColorByRating(this);
		});

		$(".info__rate, .card__imdb-rate, .card__kinopoisk-rate").each(function () {
			applyColorByRating(this);
		});
	}
  
	function setupVoteColorsObserver() {
		if (!InterFaceMod.settings.colored_ratings) return;

		setTimeout(updateVoteColors, 300);

		var observer = new MutationObserver(function () {
			setTimeout(updateVoteColors, 100);
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	function setupVoteColorsForDetailPage() {
		if (!InterFaceMod.settings.colored_ratings) return;

		if (!window.Lampa || !Lampa.Listener) return;

		Lampa.Listener.follow("full", function (data) {
			if (data.type === "complite") {
				setTimeout(updateVoteColors, 100);
			}
		});
	}

	// Ініціалізація плагіна
	function startPlugin() {
		if (window.Lampa && Lampa.Storage) {
			var stored = Lampa.Storage.get("colored_ratings");
			if (typeof stored === "boolean") {
				InterFaceMod.settings.colored_ratings = stored;
			}
		}

		if (InterFaceMod.settings.colored_ratings) {
			setupVoteColorsObserver();
			setupVoteColorsForDetailPage();
		}
	}

	if (window.Lampa) {
		if (window.appready) {
			startPlugin();
		} else {
			Lampa.Listener.follow("app", function (event) {
				if (event.type === "ready") {
					startPlugin();
				}
			});
		}
	} else {
		if (document.readyState === "complete" || document.readyState === "interactive") {
			startPlugin();
		} else {
			document.addEventListener("DOMContentLoaded", startPlugin);
		}
	}

	if (window.Lampa) {
		Lampa.Manifest = Lampa.Manifest || {};
		Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};
		Lampa.Manifest.plugins.interface_mod_ratings_only = {
			name: "Кольорові рейтинги", // Назва для користувача
			version: InterFaceMod.version,
			description: "Підсвічування рейтингів залежно від оцінки", // Опис для користувача
		};
	}

	window.interface_mod_ratings_only = InterFaceMod;
})();
