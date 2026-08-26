const CARD_VERSION = "1.0.0";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";
const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w500";

const TRANSLATIONS = {
  en: {
    director: "Directed by:",
    acting: "acting",
    directing: "directing",
    airs: "Airs",
    premieres: "Premieres",
    watched: "Watched",
    season: "Season",
    remove: "Remove",
    watchlist: "Watchlist",
    hide: "Hide",
    unmarkWatched: "Unmark watched",
    confirmSeason: "Mark all of season {season} of {title} as watched?",
    mood: "Mood",
    providers: "Providers",
    all: "All",
    mine: "Mine",
    feelgood: "Feel-good",
    exciting: "Exciting",
    dark: "Dark",
    family: "Family",
    romance: "Romance",
    scifiFantasy: "Sci-Fi/Fantasy",
    serious: "Serious",
    entityNotFound: "Entity {entity} was not found.",
    empty: "Nothing to show.",
    bestPicture: "Best Picture",
    bestDirector: "Best Director",
    oscarFor: "Oscar for {category}",
    oscarNomineeCategory: "Oscar nominee: {category}",
    oscarNominee: "Oscar nominee",
    guldbaggeWinner: "Guldbagge winner",
    guldbaggeNominee: "Guldbagge nominee",
    palmeDor: "Palme d'Or",
    cannesWinner: "Cannes winner",
    cannesNominee: "Cannes nominee",
    winner: "winner",
    nominee: "nominee",
  },
  sv: {
    director: "Regi:",
    acting: "skådespeleri",
    directing: "regi",
    airs: "Sänds",
    premieres: "Premiär",
    watched: "Sedd",
    season: "Säsong",
    remove: "Ta bort",
    watchlist: "Watchlist",
    hide: "Dölj",
    unmarkWatched: "Avmarkera sedd",
    confirmSeason: "Markera hela säsong {season} av {title} som sedd?",
    mood: "Humör",
    providers: "Tjänster",
    all: "Alla",
    mine: "Mina",
    feelgood: "Feel-good",
    exciting: "Spännande",
    dark: "Mörkt",
    family: "Familj",
    romance: "Romantik",
    scifiFantasy: "Sci-Fi/Fantasy",
    serious: "Seriöst",
    entityNotFound: "Entiteten {entity} hittades inte.",
    empty: "Inget att visa.",
    bestPicture: "bästa film",
    bestDirector: "bästa regi",
    oscarFor: "Oscar för {category}",
    oscarNomineeCategory: "Oscar-nominerad: {category}",
    oscarNominee: "Oscar-nominerad",
    guldbaggeWinner: "Guldbaggevinnare",
    guldbaggeNominee: "Guldbaggenominerad",
    palmeDor: "Guldpalmen",
    cannesWinner: "Cannesvinnare",
    cannesNominee: "Cannesnominerad",
    winner: "vinnare",
    nominee: "nominerad",
  },
};

class MediaTrackerCard extends HTMLElement {
  setConfig(config) {
    if (!config?.entity) {
      throw new Error("entity is required");
    }

    this._config = {
      title: "",
      max: 10,
      show_provider_name: false,
      provider_icon_size: 26,
      poster_width: 120,
      date_format: "short",
      hide_empty: false,
      provider_filter: "all",
      include_genres: [],
      exclude_genres: [],
      genre_match: "any",
      show_filters: false,
      mood_filter: "all",
      ...config,
    };

    this._optimisticHidden = this._optimisticHidden || new Set();

    // Config changes must force a render even if the entity did not change.
    this._lastEntityStamp = null;

    this._runtimeFilters = {
      provider_filter: this._config.provider_filter,
      mood_filter: this._config.mood_filter,
      include_genres: [...(this._config.include_genres || [])],
      exclude_genres: [...(this._config.exclude_genres || [])],
      genre_match: this._config.genre_match,
    };

    this._render();
  }

  set hass(hass) {
    this._hass = hass;

    const state = this._state();
    const entityStamp = state
      ? `${state.state}|${state.last_updated}|${state.last_changed}`
      : "missing";
    const stamp = `${this._language()}|${entityStamp}`;

    if (stamp === this._lastEntityStamp) {
      return;
    }

    this._lastEntityStamp = stamp;
    this._render();
  }

  getCardSize() {
    return Math.max(2, Number(this._config?.max || 10));
  }

  static getStubConfig() {
    return {
      entity: "sensor.media_watch_episodes",
      title: "Next to watch",
      max: 10,
    };
  }

  _language() {
    const language =
      this._hass?.locale?.language ||
      this._hass?.language ||
      navigator.language ||
      "en";
    const code = String(language).toLowerCase().split(/[-_]/)[0];
    return Object.prototype.hasOwnProperty.call(TRANSLATIONS, code)
      ? code
      : "en";
  }

  _t(key, replacements = {}) {
    const template =
      TRANSLATIONS[this._language()]?.[key] ||
      TRANSLATIONS.en[key] ||
      key;
    return template.replace(/\{(\w+)\}/g, (_, name) =>
      String(replacements[name] ?? `{${name}}`),
    );
  }

  _state() {
    return this._hass?.states?.[this._config?.entity] || null;
  }

  _moodPreset(name, mediaType = "movie") {
    // Use TMDB genre IDs rather than localized genre names.
    // Movie and TV genre taxonomies are similar but not identical.
    const movie = {
      all: { include: [], exclude: [], min_rating: null },
      feelgood: {
        include: ["35", "10751", "10749"],
        exclude: ["27"],
        min_rating: 6.0,
      },
      exciting: {
        include: ["28", "12", "53"],
        exclude: [],
        min_rating: 6.0,
      },
      dark: {
        include: ["80", "53", "9648", "27"],
        exclude: ["10751"],
        min_rating: 6.2,
      },
      family: {
        include: ["10751", "16", "12", "35"],
        exclude: ["27"],
        min_rating: 5.8,
      },
      romance: {
        include: ["10749", "35", "18"],
        exclude: ["27"],
        min_rating: 6.0,
      },
      scifi_fantasy: {
        include: ["878", "14", "12"],
        exclude: [],
        min_rating: 6.2,
      },
      serious: {
        include: ["18", "36", "10752"],
        exclude: ["35"],
        min_rating: 6.5,
      },
    };

    const tv = {
      all: { include: [], exclude: [], min_rating: null },
      feelgood: {
        include: ["35", "10751"],
        exclude: ["9648"],
        min_rating: 6.0,
      },
      exciting: {
        include: ["10759", "9648"],
        exclude: [],
        min_rating: 6.0,
      },
      dark: {
        include: ["80", "9648", "18"],
        exclude: ["10751"],
        min_rating: 6.2,
      },
      family: {
        include: ["10751", "16", "35"],
        exclude: [],
        min_rating: 5.8,
      },
      romance: {
        // TMDB TV has no dedicated Romance genre; Drama/Comedy is the
        // closest general-purpose approximation for a mood preset.
        include: ["18", "35"],
        exclude: [],
        min_rating: 6.0,
      },
      scifi_fantasy: {
        include: ["10765", "10759"],
        exclude: [],
        min_rating: 6.2,
      },
      serious: {
        include: ["18", "10768"],
        exclude: ["35"],
        min_rating: 6.5,
      },
    };

    const presets = mediaType === "tv" ? tv : movie;
    return presets[name] || presets.all;
  }

  _followingTvItem(show) {
    const nextEpisode =
      show?.next_episode_to_watch ||
      show?.next_episode_to_air ||
      show?.next_episode ||
      {};
    const providers = show?.my_providers || show?.providers || [];

    return {
      media_type: "tv",
      source: "tv_watchlist",
      tmdb_id: show?.id ?? show?.tmdb_id,
      title: show?.name || show?.title,
      original_title: show?.original_name || show?.original_title,
      poster: show?.poster || (
        show?.poster_path
          ? `${TMDB_POSTER_BASE}${show.poster_path}`
          : null
      ),
      number: nextEpisode.code || "",
      episode: nextEpisode.name || "",
      airdate: nextEpisode.air_date || "",
      providers,
      provider: providers.join(", "),
      provider_details:
        show?.my_provider_details || show?.provider_details || [],
      available_on_my_services:
        show?.available_on_my_services === true,
      watched: show?.watched === true,
      deep_link:
        show?.deep_link ||
        `https://www.themoviedb.org/tv/${show?.id ?? show?.tmdb_id}`,
    };
  }

  _items() {
    const attributes = this._state()?.attributes || {};
    const items = Array.isArray(attributes.items)
      ? attributes.items
      : Array.isArray(attributes.shows)
        ? attributes.shows.map((show) => this._followingTvItem(show))
        : [];

    // Once Home Assistant confirms that an item is gone from this feed,
    // the optimistic suppression entry is no longer needed.
    if (this._optimisticHidden?.size) {
      const present = new Set(
        items.map(
          (item) =>
            `${item?.media_type || "movie"}:${item?.tmdb_id}`,
        ),
      );
      for (const key of [...this._optimisticHidden]) {
        if (!present.has(key)) {
          this._optimisticHidden.delete(key);
        }
      }
    }

    const runtime = this._runtimeFilters || this._config;

    const providerFilter = String(
      runtime.provider_filter || "all",
    ).toLowerCase();

    const normalize = (values) =>
      (Array.isArray(values) ? values : [values])
        .filter((value) => value !== null && value !== undefined && value !== "")
        .map((value) => String(value).trim().toLowerCase());

    const configuredInclude = normalize(runtime.include_genres || []);
    const configuredExclude = normalize(runtime.exclude_genres || []);
    const genreMatch = String(runtime.genre_match || "any").toLowerCase();

    const mediaType =
      items.find((item) => item?.media_type)?.media_type || "movie";

    const mood = this._moodPreset(
      String(runtime.mood_filter || "all").toLowerCase(),
      mediaType,
    );
    const moodInclude = normalize(mood.include || []);
    const moodExclude = normalize(mood.exclude || []);

    const includeGenres = [...new Set([...configuredInclude, ...moodInclude])];
    const excludeGenres = [...new Set([...configuredExclude, ...moodExclude])];

    const matchesGenreToken = (item, token) => {
      const ids = Array.isArray(item.genre_ids)
        ? item.genre_ids.map((id) => String(id).toLowerCase())
        : [];
      const names = Array.isArray(item.genres)
        ? item.genres
            .map((genre) => String(genre?.name || "").trim().toLowerCase())
            .filter(Boolean)
        : [];
      return ids.includes(token) || names.includes(token);
    };

    const filtered = items.filter((item) => {
      const optimisticKey = `${item?.media_type || "movie"}:${item?.tmdb_id}`;
      if (this._optimisticHidden?.has(optimisticKey)) {
        return false;
      }

      if (
        providerFilter === "my" &&
        item?.available_on_my_services !== true
      ) {
        return false;
      }

      if (
        mood.min_rating != null &&
        Number(item?.vote_average || 0) < Number(mood.min_rating)
      ) {
        return false;
      }

      if (
        excludeGenres.some((token) => matchesGenreToken(item, token))
      ) {
        return false;
      }

      if (includeGenres.length) {
        const checks = includeGenres.map((token) =>
          matchesGenreToken(item, token),
        );
        const included =
          genreMatch === "all"
            ? checks.every(Boolean)
            : checks.some(Boolean);
        if (!included) return false;
      }

      return true;
    });

    const awardYear = (item) => {
      const awards = [item?.award, ...(item?.awards || [])].filter(Boolean);
      const years = awards.flatMap((award) => [
        award.ceremony_year,
        ...(Array.isArray(award.award_years) ? award.award_years : []),
      ]);

      return years.reduce((latest, year) => {
        const numericYear = Number(year);
        return Number.isFinite(numericYear)
          ? Math.max(latest, numericYear)
          : latest;
      }, 0);
    };

    // Award candidates can finish TMDB enrichment in a different order than
    // the source data. Restore the user-facing chronology without mutating
    // the entity attribute array. Modern JS sorting is stable, so films from
    // the same award year retain the backend's relevance order.
    const sorted = filtered.some((item) => item?.award || item?.awards)
      ? [...filtered].sort((a, b) => awardYear(b) - awardYear(a))
      : filtered;

    return sorted.slice(
      0,
      Math.max(1, Number(this._config.max || 10)),
    );
  }

  _formatDate(value) {
    if (!value) return "";
    if (this._config.date_format === "iso") return value;

    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    const locale =
      this._hass?.locale?.language ||
      this._hass?.language ||
      navigator.language ||
      "en";

    const options =
      this._config.date_format === "long"
        ? { weekday: "long", day: "numeric", month: "long" }
        : { weekday: "short", day: "numeric", month: "short" };

    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _providerDetails(item) {
    if (!Array.isArray(item.provider_details)) return [];
    const seen = new Set();
    return item.provider_details.filter((provider) => {
      if (!provider || provider.id == null) return false;
      if (seen.has(provider.id)) return false;
      seen.add(provider.id);
      return true;
    });
  }

  _providers(item) {
    const logos = this._providerDetails(item)
      .map((provider) => {
        if (!provider.logo_path) return "";
        const name = this._escape(provider.name || "");
        return `
          <span class="provider" title="${name}">
            <img
              src="${TMDB_IMAGE_BASE}${this._escape(provider.logo_path)}"
              alt="${name}"
              loading="lazy"
              style="height:${Number(this._config.provider_icon_size || 26)}px"
            />
            ${
              this._config.show_provider_name
                ? `<span>${name}</span>`
                : ""
            }
          </span>
        `;
      })
      .join("");

    if (logos) return logos;

    const fallback =
      item.provider ||
      (Array.isArray(item.providers)
        ? item.providers.join(", ")
        : "");

    return fallback
      ? `<span class="provider-fallback">${this._escape(fallback)}</span>`
      : "";
  }

  async _call(service, data) {
    if (!this._hass) return;
    await this._hass.callService("media_watch", service, data);
  }

  _optimisticKey(item) {
    return `${item?.media_type || "movie"}:${item?.tmdb_id}`;
  }

  _shouldOptimisticallyHide(action, item) {
    // Movie/discovery actions remove the current item from this feed.
    // Episode/season actions should keep the show visible and advance
    // to the next unwatched episode when the backend feed updates.
    if (
      action === "movie-watched" &&
      item?.source === "profile" &&
      this._state()?.attributes?.exclude_watched === false
    ) {
      return false;
    }

    return [
      "movie-watched",
      "tv-watched",
      "watchlist",
      "unfollow",
      "dismiss",
    ].includes(action);
  }

  async _action(event, item, action) {
    event.stopPropagation();

    if (action === "episode-watched") {
      await this._call("mark_episode_watched", {
        tmdb_id: Number(item.tmdb_id),
        season: Number(item.season),
        episode: Number(item.episode_number),
      });
      return;
    }

    if (action === "season-watched") {
      const ok = window.confirm(
        this._t("confirmSeason", {
          season: item.season,
          title: item.title,
        }),
      );
      if (!ok) return;

      await this._call("mark_seasons_watched", {
        tmdb_id: Number(item.tmdb_id),
        seasons: [Number(item.season)],
      });
      return;
    }

    if (action === "movie-watched") {
      await this._call("mark_watched", {
        media_type: item.media_type || "movie",
        tmdb_id: Number(item.tmdb_id),
      });
      return;
    }

    if (action === "tv-watched") {
      const tmdbId = Number(item.tmdb_id);
      await this._call("mark_released_episodes_watched", {
        tmdb_id: tmdbId,
      });
      await this._call("follow", {
        media_type: "tv",
        tmdb_id: tmdbId,
      });
      return;
    }

    if (action === "movie-unwatched") {
      await this._call("mark_unwatched", {
        media_type: item.media_type || "movie",
        tmdb_id: Number(item.tmdb_id),
      });
      return;
    }

    if (action === "watchlist") {
      await this._call("follow", {
        media_type: item.media_type || "movie",
        tmdb_id: Number(item.tmdb_id),
      });
      return;
    }

    if (action === "unfollow") {
      await this._call("unfollow", {
        media_type: item.media_type || "movie",
        tmdb_id: Number(item.tmdb_id),
      });
      return;
    }

    if (action === "dismiss") {
      await this._call("dismiss", {
        media_type: item.media_type || "movie",
        tmdb_id: Number(item.tmdb_id),
      });
    }
  }

  _open(event, item) {
    if (event.target.closest("button")) return;
    if (item.deep_link) {
      window.open(item.deep_link, "_blank", "noopener,noreferrer");
    }
  }

  _poster(item) {
    return item.poster
      ? `<img class="poster" src="${this._escape(item.poster)}" alt="" loading="lazy" />`
      : `<div class="poster placeholder"><ha-icon icon="mdi:movie-open"></ha-icon></div>`;
  }

  _episodeMeta(item) {
    const code = item.number || "";
    const name = item.episode || "";
    return [code, name].filter(Boolean).join(" · ");
  }

  _movieMeta(item) {
    const parts = [];
    const releaseYear = String(item.release_date || "").slice(0, 4);
    if (/^\d{4}$/.test(releaseYear)) parts.push(releaseYear);
    const rating = Number(item.vote_average);
    if (!Number.isNaN(rating) && rating > 0) {
      parts.push(`★ ${rating.toFixed(1)}`);
    }
    return parts.join(" · ");
  }

  _personKey(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  _personWins(item, role) {
    const awards = [item?.award, ...(item?.awards || [])].filter(Boolean);
    const wins = new Map();
    for (const award of awards) {
      for (const win of award.person_wins || []) {
        if (win?.role !== role || !win?.name) continue;
        wins.set(this._personKey(win.name), {
          ...win,
          organization: award.organization || award.source || "Award",
          source: award.source,
        });
      }
    }
    return wins;
  }

  _creditNames(names, wins) {
    return names.map((name) => {
      const escapedName = this._escape(name);
      const win = wins.get(this._personKey(name));
      if (!win) return escapedName;

      const organization = String(win.organization || "Award");
      const awardName = /oscar|academy awards/i.test(organization)
        ? "Oscar"
        : /emmy/i.test(organization)
          ? "Emmy"
          : organization;
      const title = `${awardName}: ${
        win.category || this._t(win.role === "directing" ? "directing" : "acting")
      }`;
      return `<span class="award-person">${escapedName}${this._awardSymbol(win, true, title, "credit-award")}</span>`;
    }).join(", ");
  }

  _movieCredits(item) {
    const directors = Array.isArray(item.directors)
      ? item.directors.filter(Boolean)
      : [];
    const cast = Array.isArray(item.cast)
      ? item.cast.filter(Boolean).slice(0, 3)
      : [];

    const lines = [];
    if (cast.length) {
      lines.push(`
        <div class="credit-line cast-line">
          ${this._creditNames(cast, this._personWins(item, "acting"))}
        </div>
      `);
    }
    if (directors.length) {
      lines.push(`
        <div class="credit-line director-line">
          <span class="credit-label">${this._t("director")}</span>
          ${this._creditNames(directors, this._personWins(item, "directing"))}
        </div>
      `);
    }
    return lines.join("");
  }

  _releaseDate(item) {
    return item?.media_type === "tv"
      ? item.airdate || item.release_date || ""
      : item?.release_date || "";
  }

  _isUnreleased(item) {
    const releaseDate = String(this._releaseDate(item)).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) return false;

    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    return releaseDate > today;
  }

  _releaseInfo(item) {
    const releaseDate = this._releaseDate(item);
    if (!releaseDate) return "";
    const label = this._t(item.media_type === "tv" ? "airs" : "premieres");
    return `
      <span class="release-info">
        <ha-icon icon="mdi:calendar-clock"></ha-icon>
        ${label} ${this._escape(this._formatDate(releaseDate))}
      </span>
    `;
  }

  _awardKind(award, item = {}) {
    const organization = String(award.organization || "").toLowerCase();
    const source = String(award.source || "").toLowerCase();
    if (
      item.source === "oscars" ||
      source === "oscars" ||
      organization.includes("academy awards") ||
      organization.includes("oscar")
    ) return "oscar";
    if (source === "guldbaggen" || organization.includes("guldbagge")) {
      return "guldbagge";
    }
    if (source === "cannes" || organization.includes("cannes")) {
      return "palme";
    }
    return "generic";
  }

  _awardSymbol(award, winner, title = "", extraClass = "", item = {}) {
    const kind = this._awardKind(award, item);
    const classes = `award-symbol ${kind} ${extraClass}`.trim();
    const titleAttr = title ? ` title="${this._escape(title)}"` : "";

    if (kind === "oscar") {
      return `<span class="${classes}"${titleAttr} aria-label="Oscar">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="4" r="2.25"></circle>
          <path d="M9.8 7h4.4l1.5 7.7-2.2 3.1h-3l-2.2-3.1L9.8 7Z"></path>
          <path d="M8.5 19h7v2h-7zM7.5 21h9v2h-9z"></path>
        </svg>
      </span>`;
    }

    if (kind === "palme") {
      return `<span class="${classes}"${titleAttr} aria-label="${this._t("palmeDor")}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 22c3.2-5.2 5.6-10.8 7.2-17.2"></path>
          <path d="M12.7 6.4C9.4 5.5 7 6.2 5 8.4c3.1.8 5.5.1 7.7-2Z"></path>
          <path d="M13.8 3.5c2.8.1 4.8 1.4 6.2 3.8-3 .1-5-1.2-6.2-3.8Z"></path>
          <path d="M11.5 10c-3.5-.2-6 1-7.5 3.5 3.4.3 6-1 7.5-3.5Z"></path>
          <path d="M12.8 8.5c3.1.7 5 2.4 5.8 5-3.1-.5-5-2.2-5.8-5Z"></path>
          <path d="M9.8 14c-3.1.4-5.1 1.9-6 4.5 3.1-.3 5.1-1.8 6-4.5Z"></path>
        </svg>
      </span>`;
    }

    if (kind === "guldbagge") {
      return `<span class="${classes}"${titleAttr} aria-label="Guldbaggen">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="13.5" rx="5" ry="6.5"></ellipse>
          <circle cx="12" cy="6" r="2.7"></circle>
          <path d="M12 8v12M7 11 3.5 8.5M7 15H3M8 18.5l-3 2M17 11l3.5-2.5M17 15h4M16 18.5l3 2"></path>
        </svg>
      </span>`;
    }

    return `<ha-icon class="award-symbol generic ${extraClass}" icon="${winner ? "mdi:trophy-award" : "mdi:medal-outline"}"${titleAttr}></ha-icon>`;
  }

  _awardBadgeFor(award, item) {
    const kind = this._awardKind(award, item);

    const wins = Number(award.wins || 0);
    const isWinner = award.winner === true || wins > 0;

    if (kind === "oscar") {
      const nominations = Number(award.nominations || 0);
      const winningCategories = Array.isArray(award.winning_categories)
        ? award.winning_categories.filter(Boolean)
        : [];
      const category = winningCategories.length === 1
        ? winningCategories[0]
        : award.category;

      const categoryNames = {
        "BEST PICTURE": this._t("bestPicture"),
        "Best Picture": this._t("bestPicture"),
        DIRECTING: this._t("bestDirector"),
        Directing: this._t("bestDirector"),
      };
      const categoryLabel = categoryNames[category] || category || "";

      let label;
      if (isWinner && categoryLabel && (wins <= 1 || award.winner === true)) {
        label = this._t("oscarFor", { category: categoryLabel });
      } else if (isWinner) {
        const winCount = Math.max(1, wins);
        label = `${winCount} Oscar${winCount === 1 ? "" : "s"}`;
        if (nominations > 0) label += ` · ${nominations} nom.`;
      } else {
        label = nominations > 0
          ? `${nominations} Oscar-nom.`
          : categoryLabel
            ? this._t("oscarNomineeCategory", { category: categoryLabel })
            : this._t("oscarNominee");
      }

      return `
        <span class="award-badge ${isWinner ? "winner" : ""}">
          ${this._awardSymbol(award, isWinner, "", "", item)}
          ${this._escape(label)}
        </span>
      `;
    }

    const winningCategories = Array.isArray(award.winning_categories)
      ? award.winning_categories.filter(Boolean)
      : [];
    const category = winningCategories.length === 1
      ? winningCategories[0]
      : "";

    let label;
    if (kind === "guldbagge") {
      label = isWinner
        ? category ? `Guldbagge: ${category}` : this._t("guldbaggeWinner")
        : this._t("guldbaggeNominee");
    } else if (kind === "palme") {
      label = isWinner
        ? String(category).toLowerCase() === "palme d'or"
          ? this._t("palmeDor")
          : category ? `Cannes: ${category}` : this._t("cannesWinner")
        : this._t("cannesNominee");
    } else {
      const organization = award.organization || award.source || "Award";
      label = isWinner
        ? category ? `${organization}: ${category}` : `${organization}: ${this._t("winner")}`
        : `${organization}: ${this._t("nominee")}`;
    }

    return `
      <span class="award-badge ${isWinner ? "winner" : ""}">
        ${this._awardSymbol(award, isWinner, "", "", item)}
        ${this._escape(label)}
      </span>
    `;
  }

  _awardBadge(item) {
    const awards = Array.isArray(item?.awards) && item.awards.length
      ? item.awards
      : item?.award ? [item.award] : [];
    return awards.map((award) => this._awardBadgeFor(award, item)).join(" ");
  }

  _actions(item, index) {
    if (item.source === "episodes") {
      const progressActions = this._isUnreleased(item)
        ? this._releaseInfo(item)
        : `
          <button class="action primary" data-action="episode-watched" data-index="${index}">
            <ha-icon icon="mdi:check"></ha-icon><span>${this._t("watched")}</span>
          </button>
          <button class="action" data-action="season-watched" data-index="${index}">
            <ha-icon icon="mdi:check-all"></ha-icon><span>${this._t("season")}</span>
          </button>
        `;

      return `
        ${progressActions}
        <button class="action" data-action="unfollow" data-index="${index}">
          <ha-icon icon="mdi:bookmark-remove-outline"></ha-icon><span>${this._t("remove")}</span>
        </button>
      `;
    }

    if (item.source === "tv_watchlist") {
      return `
        <button class="action primary" data-action="unfollow" data-index="${index}">
          <ha-icon icon="mdi:bookmark-remove-outline"></ha-icon><span>${this._t("remove")}</span>
        </button>
      `;
    }

    if (item.source === "watchlist") {
      const watchedAction = this._isUnreleased(item)
        ? this._releaseInfo(item)
        : `
          <button class="action primary" data-action="movie-watched" data-index="${index}">
            <ha-icon icon="mdi:check"></ha-icon><span>${this._t("watched")}</span>
          </button>
        `;

      return `
        ${watchedAction}
        <button class="action" data-action="unfollow" data-index="${index}">
          <ha-icon icon="mdi:bookmark-remove-outline"></ha-icon><span>${this._t("remove")}</span>
        </button>
      `;
    }

    if (item.source === "oscars") {
      const watchlistAction = item.on_watchlist
        ? ""
        : `
          <button class="action primary" data-action="watchlist" data-index="${index}">
            <ha-icon icon="mdi:bookmark-plus-outline"></ha-icon><span>${this._t("watchlist")}</span>
          </button>
        `;

      return `
        ${watchlistAction}
        <button class="action ${item.on_watchlist ? "primary" : ""}" data-action="movie-watched" data-index="${index}">
          <ha-icon icon="mdi:check"></ha-icon><span>${this._t("watched")}</span>
        </button>
        <button class="action" data-action="dismiss" data-index="${index}">
          <ha-icon icon="mdi:close"></ha-icon><span>${this._t("hide")}</span>
        </button>
      `;
    }

    if (item.source === "personalized") {
      const watchedAction = item.media_type === "tv"
        ? "tv-watched"
        : "movie-watched";
      return `
        <button class="action primary" data-action="watchlist" data-index="${index}">
          <ha-icon icon="mdi:bookmark-plus-outline"></ha-icon><span>${this._t("watchlist")}</span>
        </button>
        <button class="action" data-action="${watchedAction}" data-index="${index}">
          <ha-icon icon="${item.media_type === "tv" ? "mdi:check-all" : "mdi:check"}"></ha-icon><span>${this._t("watched")}</span>
        </button>
        <button class="action" data-action="dismiss" data-index="${index}">
          <ha-icon icon="mdi:close"></ha-icon><span>${this._t("hide")}</span>
        </button>
      `;
    }

    if (item.source === "profile") {
      const watchedActionName = item.media_type === "tv"
        ? "tv-watched"
        : "movie-watched";
      const watchedAction = item.watched
        ? `
          <button class="action primary" data-action="movie-unwatched" data-index="${index}">
            <ha-icon icon="mdi:check-circle"></ha-icon><span>${this._t("unmarkWatched")}</span>
          </button>
        `
        : `
          <button class="action" data-action="${watchedActionName}" data-index="${index}">
            <ha-icon icon="${item.media_type === "tv" ? "mdi:check-all" : "mdi:check"}"></ha-icon><span>${this._t("watched")}</span>
          </button>
        `;

      return `
        ${item.watched ? "" : `
          <button class="action primary" data-action="watchlist" data-index="${index}">
            <ha-icon icon="mdi:bookmark-plus-outline"></ha-icon><span>${this._t("watchlist")}</span>
          </button>
        `}
        ${watchedAction}
        <button class="action" data-action="dismiss" data-index="${index}">
          <ha-icon icon="mdi:close"></ha-icon><span>${this._t("hide")}</span>
        </button>
      `;
    }

    if (item.source === "discovery") {
      const watchedAction = item.media_type === "tv"
        ? "tv-watched"
        : "movie-watched";
      return `
        <button class="action primary" data-action="watchlist" data-index="${index}">
          <ha-icon icon="mdi:bookmark-plus-outline"></ha-icon><span>${this._t("watchlist")}</span>
        </button>
        <button class="action" data-action="${watchedAction}" data-index="${index}">
          <ha-icon icon="${item.media_type === "tv" ? "mdi:check-all" : "mdi:check"}"></ha-icon><span>${this._t("watched")}</span>
        </button>
        <button class="action" data-action="dismiss" data-index="${index}">
          <ha-icon icon="mdi:close"></ha-icon><span>${this._t("hide")}</span>
        </button>
      `;
    }

    return `
      <button class="action primary" data-action="movie-watched" data-index="${index}">
        <ha-icon icon="mdi:check"></ha-icon><span>${this._t("watched")}</span>
      </button>
    `;
  }

  _renderItem(item, index) {
    const isTv = item.media_type === "tv";
    const rightMeta = isTv
      ? this._formatDate(item.airdate)
      : this._movieMeta(item);

    const subtitle = isTv
      ? this._episodeMeta(item)
      : (
          item.original_title &&
          item.original_title !== item.title
            ? item.original_title
            : ""
        );

    return `
      <article class="media-item" data-open-index="${index}">
        ${this._poster(item)}
        <div class="content">
          <div class="topline">
            <div class="title">${this._escape(item.title)}</div>
            <div class="date">${this._escape(rightMeta)}</div>
          </div>
          <div class="subtitle">${this._escape(subtitle)}</div>
          ${isTv ? "" : `<div class="credits">${this._movieCredits(item)}</div>`}
          ${this._awardBadge(item)}
          <div class="providers">${this._providers(item)}</div>
          <div class="actions">
            ${this._actions(item, index)}
            <button class="action icon-only" data-action="open" data-index="${index}">
              <ha-icon icon="mdi:open-in-new"></ha-icon>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  _wire(items) {
    this.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const item = items[Number(button.dataset.index)];
        if (!item) return;

        if (button.dataset.action === "open") {
          event.stopPropagation();
          this._open(event, item);
        } else {
          const action = button.dataset.action;
          const optimistic = this._shouldOptimisticallyHide(action, item);
          const key = this._optimisticKey(item);

          if (optimistic) {
            this._optimisticHidden.add(key);
            this._render();
          }

          const originalDisabled = button.disabled;

          if (!optimistic) {
            button.disabled = true;
            button.classList.add("busy");
          }

          try {
            await this._action(event, item, action);
          } catch (error) {
            if (optimistic) {
              this._optimisticHidden.delete(key);
              this._render();
            }
            console.error(
              "Media Tracker action failed",
              action,
              item,
              error,
            );
          } finally {
            if (!optimistic && button.isConnected) {
              button.disabled = originalDisabled;
              button.classList.remove("busy");
            }
          }
        }
      });
    });

    this.querySelectorAll("[data-open-index]").forEach((row) => {
      row.addEventListener("click", (event) => {
        const item = items[Number(row.dataset.openIndex)];
        if (item) this._open(event, item);
      });
    });
  }

  _filterBar() {
    if (!this._config.show_filters) return "";

    const runtime = this._runtimeFilters || this._config;
    const mood = runtime.mood_filter || "all";
    const provider = runtime.provider_filter || "all";

    const moods = [
      ["all", this._t("all")],
      ["feelgood", this._t("feelgood")],
      ["exciting", this._t("exciting")],
      ["dark", this._t("dark")],
      ["family", this._t("family")],
      ["romance", this._t("romance")],
      ["scifi_fantasy", this._t("scifiFantasy")],
      ["serious", this._t("serious")],
    ];

    return `
      <div class="filters">
        <label class="filter-field">
          <span>${this._t("mood")}</span>
          <select data-filter="mood_filter">
            ${moods
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${value === mood ? "selected" : ""}>${label}</option>`,
              )
              .join("")}
          </select>
        </label>

        <label class="filter-field">
          <span>${this._t("providers")}</span>
          <select data-filter="provider_filter">
            <option value="all" ${provider === "all" ? "selected" : ""}>${this._t("all")}</option>
            <option value="my" ${provider === "my" ? "selected" : ""}>${this._t("mine")}</option>
          </select>
        </label>
      </div>
    `;
  }

  _wireFilters() {
    if (!this._config.show_filters) return;

    this.querySelectorAll("[data-filter]").forEach((control) => {
      control.addEventListener("change", () => {
        const key = control.dataset.filter;
        this._runtimeFilters = {
          ...(this._runtimeFilters || {}),
          [key]: control.value,
        };
        this._render();
      });
    });
  }

  _render() {
    if (!this._config) return;

    const state = this._state();
    const items = this._items();
    const posterWidth = Math.max(
      78,
      Math.min(220, Number(this._config.poster_width || 120)),
    );

    if (this._config.hide_empty && state && items.length === 0) {
      this.innerHTML = "";
      return;
    }

    this.innerHTML = `
      <ha-card>
        <style>
          :host { display:block; }
          ha-card {
            overflow:hidden;
            --media-tracker-poster-width:clamp(
              78px,
              ${posterWidth}px,
              38vw
            );
          }
          .header {
            display:flex;
            align-items:center;
            justify-content:space-between;
            padding:16px 16px 12px;
          }
          .header-title { font-size:1.15rem; font-weight:600; }
          .count { color:var(--secondary-text-color); font-size:.85rem; }
          .filters {
            display:flex;
            gap:10px;
            flex-wrap:wrap;
            padding:0 16px 12px;
          }
          .filter-field {
            display:flex;
            align-items:center;
            gap:6px;
            color:var(--secondary-text-color);
            font-size:.8rem;
          }
          .filter-field select {
            min-height:36px;
            border:1px solid var(--divider-color);
            border-radius:8px;
            padding:0 9px;
            background:var(--card-background-color);
            color:var(--primary-text-color);
            font:inherit;
          }
          .media-item {
            display:grid;
            grid-template-columns:var(--media-tracker-poster-width) minmax(0,1fr);
            cursor:pointer;
            border-top:1px solid var(--divider-color);
          }
          .poster {
            width:var(--media-tracker-poster-width);
            height:auto;aspect-ratio:2 / 3;
            object-fit:cover;display:block;
            background:var(--secondary-background-color);
          }
          .poster.placeholder {
            display:flex;align-items:center;justify-content:center;
            color:var(--secondary-text-color);
          }
          .content {
            min-width:0;padding:12px 14px 10px;
            display:flex;flex-direction:column;gap:6px;
          }
          .topline { display:flex;gap:10px;align-items:flex-start; }
          .title {
            min-width:0;flex:1;font-size:1rem;font-weight:600;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          }
          .date {
            color:var(--secondary-text-color);
            font-size:.8rem;white-space:nowrap;
          }
          .subtitle {
            min-height:1.1em;color:var(--secondary-text-color);
            font-size:.9rem;white-space:nowrap;overflow:hidden;
            text-overflow:ellipsis;
          }
          .credits {
            display:flex;flex-direction:column;gap:2px;
            color:var(--secondary-text-color);font-size:.78rem;
          }
          .credit-line {
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          }
          .credit-label { font-weight:600; }
          .award-person { display:inline-flex;align-items:center;gap:2px; }
          .credit-award {
            --mdc-icon-size:14px;
            color:var(--warning-color,#f5a623);
            flex:0 0 auto;
          }
          .award-badge {
            width:max-content;
            display:inline-flex;
            align-items:center;
            gap:5px;
            padding:3px 7px;
            border-radius:999px;
            background:var(--secondary-background-color);
            color:var(--secondary-text-color);
            font-size:.75rem;
          }
          .award-badge.winner {
            color:var(--primary-text-color);
            font-weight:600;
          }
          .award-badge ha-icon { --mdc-icon-size:15px; }
          .award-symbol {
            width:16px;height:16px;display:inline-flex;
            align-items:center;justify-content:center;flex:0 0 auto;
          }
          .award-symbol svg {
            width:100%;height:100%;overflow:visible;
            fill:currentColor;stroke:currentColor;stroke-width:1.35;
            stroke-linecap:round;stroke-linejoin:round;
          }
          .award-symbol.palme svg { fill:none;stroke-width:1.7; }
          .award-symbol.guldbagge svg ellipse,
          .award-symbol.guldbagge svg circle { stroke:none; }
          .award-symbol.guldbagge svg path { fill:none; }
          .award-badge.winner .award-symbol {
            color:var(--warning-color,#d4a017);
          }
          .providers {
            min-height:30px;display:flex;align-items:center;
            flex-wrap:wrap;gap:7px;
          }
          .provider { display:inline-flex;align-items:center;gap:5px; }
          .provider img {
            width:auto;max-width:56px;object-fit:contain;
            border-radius:6px;display:block;
          }
          .provider span,.provider-fallback {
            font-size:.78rem;color:var(--secondary-text-color);
          }
          .actions {
            display:flex;gap:7px;align-items:center;margin-top:auto;
          }
          .release-info {
            display:inline-flex;align-items:center;gap:5px;
            color:var(--secondary-text-color);font-size:.78rem;
          }
          .release-info ha-icon { --mdc-icon-size:17px; }
          button.action {
            appearance:none;border:0;border-radius:999px;padding:6px 10px;
            display:inline-flex;align-items:center;gap:5px;cursor:pointer;
            color:var(--primary-text-color);
            background:var(--secondary-background-color);
            font:inherit;font-size:.78rem;
          }
          button.action.primary {
            background:var(--primary-color);
            color:var(--text-primary-color,white);
          }
          button.action.icon-only { padding:6px;margin-left:auto; }
          button.action ha-icon { --mdc-icon-size:17px; }
          button.action:disabled {
            opacity:.65;
            cursor:default;
          }
          button.action.busy ha-icon {
            animation:media-tracker-spin .8s linear infinite;
          }
          @keyframes media-tracker-spin {
            to { transform:rotate(360deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            button.action.busy ha-icon { animation:none; }
          }
          .empty,.error { padding:18px 16px;color:var(--secondary-text-color); }
          @media (max-width:500px) {
            .content { padding:9px 10px 8px;gap:4px; }
            .date { font-size:.72rem; }
            button.action span { display:none; }
            button.action { padding:6px; }
          }
        </style>

        ${
          this._config.title
            ? `<div class="header">
                <div class="header-title">${this._escape(this._config.title)}</div>
                <div class="count">${items.length}</div>
              </div>`
            : ""
        }

        ${this._filterBar()}

        ${
          !state
            ? `<div class="error">${this._escape(this._t("entityNotFound", { entity: this._config.entity }))}</div>`
            : items.length === 0
              ? `<div class="empty">${this._t("empty")}</div>`
              : items.map((item, i) => this._renderItem(item, i)).join("")
        }
      </ha-card>
    `;

    if (state && items.length) this._wire(items);
    this._wireFilters();
  }
}

customElements.define("media-tracker-card", MediaTrackerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "media-tracker-card",
  name: "Media Tracker Card",
  description: "Generic Media Watch feed card",
  preview: true,
});

console.info(
  `%c MEDIA-TRACKER-CARD %c ${CARD_VERSION} `,
  "color:white;background:#4b5563;font-weight:700;",
  "color:#4b5563;background:white;font-weight:700;",
);
