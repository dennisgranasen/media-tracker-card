# Media Tracker Card

A generic Lovelace card for
[`home-assistant-media-tracker`](https://github.com/dennisgranasen/home-assistant-media-tracker).

Requires backend **v0.7.0+**.

Each card reads one entity with one `items` attribute. Use as many or as few
cards as you want.

## Episodes

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_episodes
title: Nästa att se
max: 10
```

This is a watch queue. It shows the first locally unwatched episode from each
followed show. A show with no progress starts at S01E01 even if a future
season is already scheduled.

## Watchlist

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_watchlist
title: Watchlist
max: 10
```

The **Sedd** action marks the movie watched and removes it from the TMDB
watchlist.

## Discovery

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_discovery
title: Filmtips
max: 10
```

Discovery provides:

- **Watchlist** — adds the movie to the TMDB watchlist. After refresh it
  disappears from Discovery and appears in Watchlist.
- **Sedd**
- **Dölj**

## Shared options

```yaml
show_provider_name: false
provider_icon_size: 28
date_format: short
hide_empty: false
```

Provider logos come from TMDB watch-provider metadata.

This product uses the TMDB API but is not endorsed or certified by TMDB.
Watch-provider metadata is powered by JustWatch.
