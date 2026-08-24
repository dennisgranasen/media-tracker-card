const CARD_VERSION = "0.1.0";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";

class MediaTrackerCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("entity is required");
    }

    this._config = {
      title: "Kommande avsnitt",
      max: 5,
      show_provider_name: false,
      provider_icon_size: 26,
      show_watched_button: true,
      show_season_button: true,
      date_format: "short",
      hide_empty: false,
      ...config,
    };

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    const max = Number(this._config?.max || 5);
    return Math.max(2, max + 1);
  }

  static getStubConfig() {
    return {
      entity: "sensor.media_watch_upcoming_media_card",
      title: "Kommande avsnitt",
      max: 5,
    };
  }

  _state() {
    if (!this._hass || !this._config?.entity) return null;
    return this._hass.states[this._config.entity] || null;
  }

  _items() {
    const state = this._state();
    const data = state?.attributes?.data;
    if (!Array.isArray(data)) return [];

    // Media Watch follows Upcoming Media Card's convention where
    // data[0] is a template/metadata record.
    return data
      .slice(1)
      .filter((item) => item && item.title)
      .sort((a, b) => {
        const ad = a.airdate || "9999-12-31";
        const bd = b.airdate || "9999-12-31";
        return ad.localeCompare(bd);
      })
      .slice(0, Math.max(1, Number(this._config.max || 5)));
  }

  _formatDate(value) {
    if (!value) return "";

    if (this._config.date_format === "iso") {
      return value;
    }

    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    const locale =
      this._hass?.locale?.language ||
      navigator.language ||
      "sv-SE";

    const options =
      this._config.date_format === "long"
        ? { weekday: "long", day: "numeric", month: "long" }
        : { weekday: "short", day: "numeric", month: "short" };

    return new Intl.DateTimeFormat(locale, options).format(date);
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

  _providerLogo(provider) {
    if (!provider?.logo_path) return "";
    return `${TMDB_IMAGE_BASE}${provider.logo_path}`;
  }

  async _markEpisodeWatched(event, item) {
    event.stopPropagation();

    if (
      !this._hass ||
      item.tmdb_id == null ||
      item.season == null ||
      item.episode_number == null
    ) {
      return;
    }

    await this._hass.callService(
      "media_watch",
      "mark_episode_watched",
      {
        tmdb_id: Number(item.tmdb_id),
        season: Number(item.season),
        episode: Number(item.episode_number),
      },
    );
  }

  async _markSeasonWatched(event, item) {
    event.stopPropagation();

    if (
      !this._hass ||
      item.tmdb_id == null ||
      item.season == null
    ) {
      return;
    }

    const ok = window.confirm(
      `Markera hela säsong ${item.season} av ${item.title} som sedd?`,
    );
    if (!ok) return;

    await this._hass.callService(
      "media_watch",
      "mark_seasons_watched",
      {
        tmdb_id: Number(item.tmdb_id),
        seasons: [Number(item.season)],
      },
    );
  }

  _openTmdb(event, item) {
    if (event.target.closest("button")) return;

    const url =
      item.deep_link ||
      (item.tmdb_id != null
        ? `https://www.themoviedb.org/tv/${item.tmdb_id}`
        : null);

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _renderProvider(provider) {
    const logo = this._providerLogo(provider);
    const name = this._escape(provider.name || "");

    if (!logo) {
      return this._config.show_provider_name
        ? `<span class="provider-text">${name}</span>`
        : "";
    }

    return `
      <span class="provider" title="${name}">
        <img
          src="${this._escape(logo)}"
          alt="${name}"
          loading="lazy"
          style="height:${Number(this._config.provider_icon_size || 26)}px"
        />
        ${
          this._config.show_provider_name
            ? `<span class="provider-text">${name}</span>`
            : ""
        }
      </span>
    `;
  }

  _renderItem(item, index) {
    const poster = item.poster
      ? `<img class="poster" src="${this._escape(item.poster)}" alt="" loading="lazy" />`
      : `<div class="poster placeholder"><ha-icon icon="mdi:television-classic"></ha-icon></div>`;

    const providers = this._providerDetails(item)
      .map((provider) => this._renderProvider(provider))
      .join("");

    const providerFallback =
      !providers && item.provider
        ? `<span class="provider-fallback">${this._escape(item.provider)}</span>`
        : "";

    const watchedButton =
      this._config.show_watched_button &&
      item.season != null &&
      item.episode_number != null
        ? `
          <button
            class="action primary"
            data-action="watched"
            data-index="${index}"
            title="Markera avsnittet som sett"
          >
            <ha-icon icon="mdi:check"></ha-icon>
            <span>Sedd</span>
          </button>
        `
        : "";

    const seasonButton =
      this._config.show_season_button &&
      item.season != null
        ? `
          <button
            class="action"
            data-action="season"
            data-index="${index}"
            title="Markera hela säsongen som sedd"
          >
            <ha-icon icon="mdi:check-all"></ha-icon>
            <span>Säsong</span>
          </button>
        `
        : "";

    return `
      <article class="media-item" data-open-index="${index}">
        ${poster}
        <div class="content">
          <div class="topline">
            <div class="title">${this._escape(item.title)}</div>
            <div class="date">${this._escape(this._formatDate(item.airdate))}</div>
          </div>

          <div class="episode">
            ${this._escape(item.number || "")}
            ${
              item.episode
                ? `<span class="episode-name">${this._escape(
                    String(item.episode).replace(
                      String(item.number || ""),
                      "",
                    ).replace(/^[ ·\-–—]+/, ""),
                  )}</span>`
                : ""
            }
          </div>

          <div class="providers">
            ${providers}
            ${providerFallback}
          </div>

          <div class="actions">
            ${watchedButton}
            ${seasonButton}
            <button
              class="action icon-only"
              data-action="tmdb"
              data-index="${index}"
              title="Öppna på TMDB"
            >
              <ha-icon icon="mdi:open-in-new"></ha-icon>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  _wireEvents(items) {
    this.querySelectorAll("[data-action]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const index = Number(button.dataset.index);
        const item = items[index];
        if (!item) return;

        switch (button.dataset.action) {
          case "watched":
            await this._markEpisodeWatched(event, item);
            break;
          case "season":
            await this._markSeasonWatched(event, item);
            break;
          case "tmdb":
            event.stopPropagation();
            this._openTmdb(event, item);
            break;
        }
      });
    });

    this.querySelectorAll("[data-open-index]").forEach((row) => {
      row.addEventListener("click", (event) => {
        const index = Number(row.dataset.openIndex);
        const item = items[index];
        if (item) this._openTmdb(event, item);
      });
    });
  }

  _render() {
    if (!this._config) return;

    const state = this._state();
    const items = this._items();

    if (this._config.hide_empty && state && items.length === 0) {
      this.innerHTML = "";
      return;
    }

    const unavailable = this._hass && !state;

    this.innerHTML = `
      <ha-card>
        <style>
          :host {
            display: block;
          }

          ha-card {
            overflow: hidden;
          }

          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 16px 16px 12px;
          }

          .header-title {
            font-size: 1.2rem;
            font-weight: 600;
            line-height: 1.25;
          }

          .count {
            color: var(--secondary-text-color);
            font-size: 0.9rem;
          }

          .list {
            display: flex;
            flex-direction: column;
          }

          .media-item {
            display: grid;
            grid-template-columns: 92px minmax(0, 1fr);
            min-height: 138px;
            cursor: pointer;
            border-top: 1px solid var(--divider-color);
            transition: background 120ms ease;
          }

          .media-item:hover {
            background: color-mix(
              in srgb,
              var(--primary-text-color) 5%,
              transparent
            );
          }

          .poster {
            width: 92px;
            height: 138px;
            object-fit: cover;
            display: block;
            background: var(--secondary-background-color);
          }

          .poster.placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--secondary-text-color);
          }

          .content {
            min-width: 0;
            padding: 12px 14px 10px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .topline {
            display: flex;
            align-items: flex-start;
            gap: 10px;
          }

          .title {
            min-width: 0;
            flex: 1;
            font-size: 1rem;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .date {
            color: var(--secondary-text-color);
            font-size: 0.83rem;
            white-space: nowrap;
          }

          .episode {
            color: var(--primary-text-color);
            font-size: 0.92rem;
          }

          .episode-name {
            color: var(--secondary-text-color);
            margin-left: 5px;
          }

          .providers {
            min-height: 30px;
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 7px;
          }

          .provider {
            display: inline-flex;
            align-items: center;
            gap: 5px;
          }

          .provider img {
            width: auto;
            max-width: 56px;
            object-fit: contain;
            border-radius: 6px;
            display: block;
          }

          .provider-text,
          .provider-fallback {
            font-size: 0.78rem;
            color: var(--secondary-text-color);
          }

          .actions {
            display: flex;
            gap: 7px;
            align-items: center;
            margin-top: auto;
          }

          button.action {
            appearance: none;
            border: 0;
            border-radius: 999px;
            padding: 6px 10px;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            color: var(--primary-text-color);
            background: var(--secondary-background-color);
            font: inherit;
            font-size: 0.78rem;
          }

          button.action.primary {
            background: var(--primary-color);
            color: var(--text-primary-color, white);
          }

          button.action.icon-only {
            padding: 6px;
            margin-left: auto;
          }

          button.action ha-icon {
            --mdc-icon-size: 17px;
          }

          .empty,
          .error {
            padding: 18px 16px;
            color: var(--secondary-text-color);
          }

          @media (max-width: 500px) {
            .media-item {
              grid-template-columns: 78px minmax(0, 1fr);
              min-height: 117px;
            }

            .poster {
              width: 78px;
              height: 117px;
            }

            .content {
              padding: 9px 10px 8px;
              gap: 4px;
            }

            .date {
              font-size: 0.75rem;
            }

            button.action span {
              display: none;
            }

            button.action {
              padding: 6px;
            }
          }
        </style>

        <div class="header">
          <div class="header-title">${this._escape(this._config.title)}</div>
          <div class="count">${items.length}</div>
        </div>

        ${
          unavailable
            ? `<div class="error">Entity ${this._escape(
                this._config.entity,
              )} hittades inte.</div>`
            : items.length === 0
              ? `<div class="empty">Inga kommande avsnitt.</div>`
              : `<div class="list">${items
                  .map((item, index) => this._renderItem(item, index))
                  .join("")}</div>`
        }
      </ha-card>
    `;

    if (!unavailable && items.length > 0) {
      this._wireEvents(items);
    }
  }
}

customElements.define("media-tracker-card", MediaTrackerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "media-tracker-card",
  name: "Media Tracker Card",
  description: "Upcoming media with provider logos and Media Watch actions",
  preview: true,
});

console.info(
  `%c MEDIA-TRACKER-CARD %c ${CARD_VERSION} `,
  "color: white; background: #4b5563; font-weight: 700;",
  "color: #4b5563; background: white; font-weight: 700;",
);
