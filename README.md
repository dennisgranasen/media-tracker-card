# Media Tracker Card

A generic Lovelace card for
[`home-assistant-media-tracker`](https://github.com/dennisgranasen/home-assistant-media-tracker).

Requires backend **v0.11.0+**.

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

Show the complete TMDB movie watchlist:

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_watchlist
title: Watchlist
provider_filter: all
```

Show only watchlist movies currently available on one of your selected
streaming services:

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_watchlist
title: Watchlist på mina tjänster
provider_filter: my
```

The **Sedd** action marks the movie watched and removes it from the TMDB
watchlist.

Use **Ta bort** to remove a movie from the TMDB watchlist without marking it
as watched.

## Discovery

All discovery results available on streaming services in your configured
region:

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_discovery
title: Filmtips
provider_filter: all
max: 20
```

Only discoveries available on your selected services:

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_discovery
title: Filmtips på mina tjänster
provider_filter: my
max: 20
```

Discovery provides:

- **Watchlist** — adds the movie to the TMDB watchlist. After refresh it
  disappears from Discovery and appears in Watchlist.
- **Sedd**
- **Dölj**

## Provider filter

`provider_filter` supports:

- `all` — do not filter the feed by your subscriptions.
- `my` — require `available_on_my_services: true`.

The filter only changes what the card displays. It does not alter the TMDB
watchlist or your selected provider settings.

## Shared options

```yaml
show_provider_name: false
provider_icon_size: 28
poster_width: 120
date_format: short
hide_empty: false
```

Provider logos come from TMDB watch-provider metadata.

This product uses the TMDB API but is not endorsed or certified by TMDB.
Watch-provider metadata is powered by JustWatch.


## Oscars

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_oscars
title: Oscars
provider_filter: all
max: 10
```

Or only Oscar films currently available on one of your services:

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_oscars
title: Oscars på mina tjänster
provider_filter: my
max: 10
```

The latest Best Picture winner is shown with a **Vinnare** badge; the remaining
Best Picture films show **Nominerad**.

Oscar feed actions:

- **Watchlist** (unless already on your TMDB watchlist)
- **Sedd**
- **Dölj**


## Genre filtering

Genre filters work on discovery and personalized feeds for both movies and TV.

Include one or more genres by localized TMDB name:

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_discovery
title: Sci-fi och fantasy
include_genres:
  - Science Fiction
  - Fantasy
genre_match: any
```

Or by TMDB genre IDs:

```yaml
include_genres:
  - 878
  - 14
genre_match: any
```

Exclude genres:

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_discovery
title: Filmtips utan skräck
exclude_genres:
  - Horror
```

`genre_match: all` requires every included genre; `any` (default) requires at
least one. Exclusion always wins.

## Personalized movies

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_personalized_movies
title: För dig
provider_filter: my
max: 20
```

This feed aggregates TMDB recommendations from both your current movie
watchlist and movies marked watched in Media Watch.

## TV discovery

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_discovery_tv
title: Serietips
provider_filter: my
max: 20
```

The same rating/provider model used for general movie discovery is applied to
TV shows.

## Personalized TV

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_personalized_tv
title: Serier för dig
provider_filter: my
max: 20
```

Seeds are followed/watchlisted TV shows plus shows marked watched locally.


## Interactive mood filters

Set:

```yaml
show_filters: true
```

to expose interactive filters directly in the card:

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_discovery
title: Vad ska vi se?
show_filters: true
provider_filter: my
max: 20
```

The user can then change:

- **Humör**: Alla, Feel-good, Spännande, Mörkt, Familj, Romantik,
  Sci-Fi/Fantasy, Seriöst
- **Tjänster**: Alla or Mina

Mood presets combine genre inclusion/exclusion with a small rating floor.
They are applied on top of any static YAML `include_genres` /
`exclude_genres`.

The filter state is local to the rendered card and is not persisted to Home
Assistant. Reloading the dashboard resets it to the YAML defaults.


### v0.7.1 mood filter fix

Mood presets now use TMDB genre IDs instead of localized genre names. This
makes interactive mood filtering independent of the TMDB profile language.

Movie and TV feeds use their respective TMDB genre taxonomies.


### v0.7.2 optimistic actions

Actions that normally remove an item from the current feed update the card
immediately:

- episode watched
- season watched
- movie/TV watched
- add discovery/personalized item to watchlist
- dismiss

The Home Assistant service call then runs normally. If it fails, the item is
restored in the card. This avoids making the UI wait for a full Media Watch
coordinator refresh.


### v0.7.3 episode queue and flicker fix

- Episode and season watched actions no longer optimistically hide the series.
  The row stays visible while the action runs and advances to the next unwatched
  episode when the backend feed updates.
- Optimistic hiding remains enabled for movie/discovery actions that genuinely
  remove the item from the current feed.
- The card no longer rebuilds its DOM for unrelated Home Assistant state
  updates; it only re-renders when its configured entity changes or when a
  local card filter/configuration changes.


### v0.7.4 discovery profiles

Dynamic discovery-profile sensors from Media Watch v0.13.0 use the same card:

```yaml
type: custom:media-tracker-card
entity: sensor.media_watch_<your_profile_entity>
title: My queue
show_filters: true
```

Profile items support Watchlist, Watched and Dismiss actions.

Profiles whose **Exclude watched titles** option is disabled also include
watched films. Their checked **Avmarkera sedd** action calls
`media_watch.mark_unwatched`, so the local watched marker can be removed again.


### v0.7.5 historical award metadata

Award-profile items can show aggregate Oscar metadata, for example
`2 Oscars · 7 nom.`. The same generic Media Tracker Card is used for dynamic
award discovery profiles.


### v0.7.6 award ordering and winner details

- Award-profile items are ordered from the newest award year to the oldest.
- Oscar winners are detected from both current and legacy Media Watch metadata.
  When a single winning category is available, the badge names it, for example
  `Oscar för bästa film`.
- Watched profile items can be unmarked directly in the card when the profile
  is configured to include watched titles.
- Movie rows show the release year, director and up to three leading cast
  members when supplied by the Media Watch sensor.


### v0.7.7 split credits and person awards

- Leading cast is shown on its own line, followed by `Regi:` on a separate
  line.
- A trophy is shown directly after an actor or director when Oscar metadata
  identifies that person as the winner for the film.


### v0.7.8 larger configurable posters

Movie posters are 120 pixels wide by default. Set `poster_width` between 78
and 220 to choose another size; the card preserves the poster's 2:3 ratio and
limits its width responsively on narrow screens.


### v0.7.9 remove from watchlist

Watchlist rows have a separate **Ta bort** action that calls
`media_watch.unfollow` without changing the movie's local watched state.


### v0.7.10 award-specific symbols

- Oscars use a stylized statuette, Cannes uses a golden palm and Guldbaggen
  uses a golden beetle instead of sharing one generic trophy.
- Profiles containing several award organizations render one badge per source,
  so an Oscar nomination cannot be confused with a Guldbagge win.
