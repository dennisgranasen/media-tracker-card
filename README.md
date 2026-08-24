# Media Tracker Card

A Home Assistant Lovelace card for
[`home-assistant-media-tracker`](https://github.com/dennisgranasen/home-assistant-media-tracker).

The visual layout is inspired by the general poster-list concept used by
Upcoming Media Card, but this is an independent implementation built around
Media Watch data and actions.

## Features

- Poster-based upcoming episode list
- Release date and episode code
- Streaming provider logos using TMDB `logo_path`
- "Watched" button for individual episodes
- "Season watched" action
- TMDB link per show
- Supports Home Assistant themes
- Compact responsive mobile layout
- Optional provider text in addition to logos
- Swedish-friendly date formatting through the browser locale

## Requirements

- `home-assistant-media-tracker` v0.5.1 or later
- The entity `sensor.media_watch_upcoming_media_card`

## HACS

Add this repository as a custom HACS repository of type **Dashboard**:

`https://github.com/dennisgranasen/media-tracker-card`

Then install **Media Tracker Card** and reload the browser.

## Basic configuration

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_upcoming_media_card
title: Kommande avsnitt
max: 5
```

## Full example

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_upcoming_media_card
title: Kommande avsnitt
max: 8
show_provider_name: false
provider_icon_size: 28
show_watched_button: true
show_season_button: true
date_format: short
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `entity` | required | Media Watch compatibility sensor |
| `title` | `Kommande avsnitt` | Card title |
| `max` | `5` | Maximum items |
| `show_provider_name` | `false` | Show provider text after logos |
| `provider_icon_size` | `26` | Provider logo height in px |
| `show_watched_button` | `true` | Show episode watched button |
| `show_season_button` | `true` | Show mark-season-watched button |
| `date_format` | `short` | `short`, `long`, or `iso` |
| `hide_empty` | `false` | Hide card when empty |

## Actions

The card calls:

- `media_watch.mark_episode_watched`
- `media_watch.mark_seasons_watched`

The entire media text area links to the title's TMDB TV page.

## Attribution

Streaming availability metadata comes from TMDB watch-provider data powered by
JustWatch. Provider logos are loaded from TMDB's image CDN.

This product uses the TMDB API but is not endorsed or certified by TMDB.
