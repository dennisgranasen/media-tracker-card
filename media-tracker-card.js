const CARD_VERSION = "0.3.0";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";

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
    return Math.max(2, Number(this._config?.max || 10));
  }

  static getStubConfig() {
    return {
      entity: "sensor.media_watch_episodes",
      title: "Nästa att se",
      max: 10,
    };
  }

  _state() {
    return this._hass?.states?.[this._config?.entity] || null;
  }

  _items() {
    const items = this._state()?.attributes?.items;
    return Array.isArray(items)
      ? items.slice(0, Math.max(1, Number(this._config.max || 10)))
      : [];
  }

  _formatDate(value) {
    if (!value) return "";
    if (this._config.date_format === "iso") return value;

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
        `Markera hela säsong ${item.season} av ${item.title} som sedd?`,
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
        media_type: "movie",
        tmdb_id: Number(item.tmdb_id),
      });
      return;
    }

    if (action === "watchlist") {
      await this._call("follow", {
        media_type: "movie",
        tmdb_id: Number(item.tmdb_id),
      });
      return;
    }

    if (action === "dismiss") {
      await this._call("dismiss", {
        media_type: "movie",
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
    if (item.release_date) parts.push(this._formatDate(item.release_date));
    const rating = Number(item.vote_average);
    if (!Number.isNaN(rating) && rating > 0) {
      parts.push(`★ ${rating.toFixed(1)}`);
    }
    return parts.join(" · ");
  }

  _actions(item, index) {
    if (item.source === "episodes" || item.media_type === "tv") {
      return `
        <button class="action primary" data-action="episode-watched" data-index="${index}">
          <ha-icon icon="mdi:check"></ha-icon><span>Sedd</span>
        </button>
        <button class="action" data-action="season-watched" data-index="${index}">
          <ha-icon icon="mdi:check-all"></ha-icon><span>Säsong</span>
        </button>
      `;
    }

    if (item.source === "discovery") {
      return `
        <button class="action primary" data-action="watchlist" data-index="${index}">
          <ha-icon icon="mdi:bookmark-plus-outline"></ha-icon><span>Watchlist</span>
        </button>
        <button class="action" data-action="movie-watched" data-index="${index}">
          <ha-icon icon="mdi:check"></ha-icon><span>Sedd</span>
        </button>
        <button class="action" data-action="dismiss" data-index="${index}">
          <ha-icon icon="mdi:close"></ha-icon><span>Dölj</span>
        </button>
      `;
    }

    return `
      <button class="action primary" data-action="movie-watched" data-index="${index}">
        <ha-icon icon="mdi:check"></ha-icon><span>Sedd</span>
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
          await this._action(event, item, button.dataset.action);
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

  _render() {
    if (!this._config) return;

    const state = this._state();
    const items = this._items();

    if (this._config.hide_empty && state && items.length === 0) {
      this.innerHTML = "";
      return;
    }

    this.innerHTML = `
      <ha-card>
        <style>
          :host { display:block; }
          ha-card { overflow:hidden; }
          .header {
            display:flex;
            align-items:center;
            justify-content:space-between;
            padding:16px 16px 12px;
          }
          .header-title { font-size:1.15rem; font-weight:600; }
          .count { color:var(--secondary-text-color); font-size:.85rem; }
          .media-item {
            display:grid;
            grid-template-columns:92px minmax(0,1fr);
            min-height:138px;
            cursor:pointer;
            border-top:1px solid var(--divider-color);
          }
          .poster {
            width:92px;height:138px;object-fit:cover;display:block;
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
          .empty,.error { padding:18px 16px;color:var(--secondary-text-color); }
          @media (max-width:500px) {
            .media-item {
              grid-template-columns:78px minmax(0,1fr);
              min-height:117px;
            }
            .poster { width:78px;height:117px; }
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

        ${
          !state
            ? `<div class="error">Entity ${this._escape(this._config.entity)} hittades inte.</div>`
            : items.length === 0
              ? `<div class="empty">Inget att visa.</div>`
              : items.map((item, i) => this._renderItem(item, i)).join("")
        }
      </ha-card>
    `;

    if (state && items.length) this._wire(items);
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
