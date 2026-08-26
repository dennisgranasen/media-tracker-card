# Media Tracker Card

A Lovelace card for the
[Media Watch](https://github.com/dennisgranasen/home-assistant-media-tracker)
Home Assistant integration. It renders episode queues, movie watchlists and
dynamic movie or TV discovery profiles from an entity's `items` attribute.

Media Watch **0.17.10 or later** is recommended so every card action, including
marking only released TV episodes as watched, is available.

## Installation

### HACS

1. Open HACS and add
   `https://github.com/dennisgranasen/media-tracker-card` as a custom repository
   of type **Dashboard**.
2. Install **Media Tracker Card**.
3. Reload the browser after HACS has added or updated the resource.

### Manual installation

1. Copy `media-tracker-card.js` to `/config/www/media-tracker-card.js`.
2. Add `/local/media-tracker-card.js` as a JavaScript module under
   **Settings → Dashboards → Resources**.
3. Reload the browser.

## Basic configuration

Add the card as a manual card. The only required option is `entity`:

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_episodes
title: Next to watch
max: 10
```

Every Media Watch entry provides these card feeds:

- `sensor.media_watch_episodes` — the next unwatched episode of each followed
  TV series.
- `sensor.media_watch_watchlist` — movies on the TMDB watchlist.
- `sensor.media_watch_following_tv` — TV series on the TMDB watchlist.
- One sensor per discovery profile, with an entity ID based on the profile ID,
  for example `sensor.media_watch_modern_horror`.

The actual entity ID can differ if Home Assistant resolves a naming conflict.
Check **Developer tools → States** if in doubt. Current Media Watch versions do
not create fixed global Discovery, Personalized or Oscars sensors; those feeds
are configured as discovery profiles in the integration.

### Watchlist example

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_watchlist
title: Watchlist
provider_filter: my
poster_width: 140
```

### Discovery profile example

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_modern_horror
title: Modern horror
provider_filter: my
show_filters: true
max: 20
```

### TV watchlist example

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_following_tv
title: TV watchlist
provider_filter: all
max: 20
```

## Options

| Option | Default | Description |
|---|---:|---|
| `entity` | required | Sensor whose `items` attribute the card renders. |
| `title` | empty | Heading shown above the list. |
| `max` | `10` | Maximum number of visible rows. |
| `hide_empty` | `false` | Hide the complete card when the feed is empty. |
| `poster_width` | `120` | Poster width in pixels, clamped to 78–220 and reduced responsively on narrow cards. |
| `date_format` | `short` | Date format: `short`, `long` or `iso`. |
| `show_provider_name` | `false` | Show provider names next to provider logos. |
| `provider_icon_size` | `26` | Provider logo size in pixels. |
| `provider_filter` | `all` | `all` shows every item; `my` requires `available_on_my_services: true`. |
| `include_genres` | `[]` | Only show items matching these TMDB genre names or IDs. |
| `exclude_genres` | `[]` | Hide items matching these TMDB genre names or IDs. Exclusion always wins. |
| `genre_match` | `any` | `any` or `all` for matching `include_genres`. |
| `show_filters` | `false` | Show interactive mood and provider selectors in the card. |
| `mood_filter` | `all` | Initial mood: `all`, `feelgood`, `exciting`, `dark`, `family`, `romance`, `scifi_fantasy` or `serious`. |

All filters in the card are presentation filters. They do not change the
discovery profile or TMDB watchlist. Interactive selections are local to the
rendered card and reset to the YAML values when the dashboard reloads.

Genre filters can use localized names:

```yaml
include_genres:
  - Science Fiction
  - Fantasy
exclude_genres:
  - Horror
genre_match: any
```

or TMDB IDs, which do not depend on the profile language:

```yaml
include_genres:
  - 878
  - 14
genre_match: all
```

## Information shown on the card

When the sensor provides the corresponding metadata, movie rows show:

- Poster, title, release year and TMDB rating.
- Up to three leading actors, followed by the director on a separate
  `Directed by:` line.
- Streaming-provider logos and optionally their names.
- Award badges, nominations and wins.

Award-profile items are ordered by award year, newest first. Oscar, Cannes and
Guldbaggen wins use distinct statuette, palm and beetle symbols. Other award
organizations use a generic trophy. An actor or director also gets an award
symbol after their name when the sensor identifies that person as a winner.

Award details come from Media Watch's award sources, not TMDB. TMDB supplies
the movie/TV metadata, credits, ratings and watch-provider information.

## Actions and watched state

The available buttons depend on the feed and item:

| Feed | Actions |
|---|---|
| Episode queue | **Watched** marks the episode watched. **Season** marks the displayed season watched after confirmation. **Remove** unfollows the TV series without changing watched progress. |
| Movie watchlist | **Watched** marks the movie watched and removes it from the TMDB watchlist. **Remove** removes it without changing watched state. |
| TV watchlist | **Remove** unfollows the series without changing watched progress. |
| Discovery profile | **Watchlist**, **Watched** or **Hide**. A watched item instead offers **Unmark watched**. |

To keep watched titles in a discovery profile and make **Unmark watched**
available, disable **Exclude watched titles** in that profile under
**Settings → Devices & services → Media Watch → Configure → Discovery
profiles**.

For a TV series in a discovery profile, **Watched**:

1. Marks only regular episodes with an air date of today or earlier as watched.
2. Adds the show to the TV watchlist so it remains followed.

Progress is stored per episode. Future episodes in the same season and newly
added seasons therefore remain unwatched and can later appear in the episode
queue. Season 0 specials are not included.

Unreleased episodes do not show watched actions; the air date and **Remove**
action are shown instead.
Unreleased watchlist movies show the premiere date and retain only the
**Remove** action until release day.

Actions update the card immediately when appropriate. If the Home Assistant
service call fails, the item is restored and an error is shown.

## Localization

The card uses the language selected in Home Assistant for action labels,
filters, release information, status messages and generated award text.
English and Swedish are currently included; every other language falls back to
English. User-configured titles and metadata supplied by Media Watch are shown
as provided.

## Troubleshooting

See [troubleshooting.md](troubleshooting.md) for cache, resource, sensor and
service-call checks to perform before opening an issue.

## AI-assisted development

This project was developed with assistance from
[OpenAI Codex](https://developers.openai.com/). Codex was used to help design,
implement, review, test and document the code. The original artwork for
[`brand/icon.png`](brand/icon.png) was generated using image-generation tooling
through Codex and prepared for HACS in this repository.

All AI-assisted output was directed and reviewed by the maintainer, who remains
responsible for the final code and published assets. This is an independent
project and is not sponsored, endorsed or certified by OpenAI.

## Data attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

TMDB's [watch-provider endpoint](https://developer.themoviedb.org/reference/movie-watch-providers)
is powered by [JustWatch](https://support.justwatch.com/article/what-is-just-watch),
a streaming guide that tracks where movies and TV shows are legally available.
The endpoint reports providers per country and groups availability as
subscription streaming, free/ad-supported viewing, rental or purchase.

Media Watch receives that data through TMDB. The card uses provider names and
logos from the streaming, free and ad-supported groups, plus whether a title is
available on the services selected in Media Watch. It does not contact
JustWatch directly and does not receive prices, complete provider catalogues or
JustWatch recommendations.
