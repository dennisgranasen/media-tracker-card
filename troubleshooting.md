# Troubleshooting

## The card is not available

If Home Assistant reports that `custom:media-tracker-card` does not exist:

1. Confirm that HACS installed `media-tracker-card.js`, or that the manual file
   exists at `/config/www/media-tracker-card.js`.
2. Under **Settings → Dashboards → Resources**, confirm that
   `/hacsfiles/media-tracker-card/media-tracker-card.js` (HACS) or
   `/local/media-tracker-card.js` (manual installation) is loaded as a
   JavaScript module.
3. Reload the dashboard without using the browser cache. Restart the Home
   Assistant companion app if it still has the old resource cached.

The browser console should contain a `MEDIA-TRACKER-CARD` line with the loaded
version.

## The entity is missing or the card is empty

Open **Developer tools → States** and inspect the entity configured in the
card. It must exist and expose an `items` attribute containing a list.

Core card feeds normally include:

- `sensor.media_watch_episodes`
- `sensor.media_watch_watchlist`
- A sensor generated for each Media Watch discovery profile

Home Assistant may append a suffix when an entity ID already exists. Use the
actual ID shown in Developer tools. Dynamic profile sensors are created under
**Settings → Devices & services → Media Watch → Configure → Discovery
profiles**.

An empty feed can also be correct. Check the profile's provider, watched,
genre, rating and release filters in the Media Watch integration. Card-level
`provider_filter`, `include_genres`, `exclude_genres` and `mood_filter` can
further reduce what is displayed. Temporarily remove those options or set
`provider_filter: all` and `mood_filter: all` when diagnosing the result.

## Posters or provider logos are missing

The images are loaded from TMDB. Check that the browser, DNS filter and ad
blocker allow `image.tmdb.org`. Provider information also depends on the
region and provider metadata returned by Media Watch.

## A button fails

Card buttons call `media_watch` actions. Check **Settings → System → Logs** for
the underlying error and make sure Media Watch is up to date. The TV discovery
**Watched** action requires Media Watch 0.17.10 or later because it uses
`media_watch.mark_released_episodes_watched`.

You can verify that an action is registered under **Developer tools →
Actions**. Confirm that the TMDB authentication used by Media Watch is still
valid if watchlist actions fail.

## Information to include in a bug report

- Media Tracker Card, Media Watch and Home Assistant versions.
- The complete card YAML.
- One relevant item from the sensor's `items` attribute, with private data
  removed.
- Browser-console and Home Assistant log errors.
- A screenshot when the problem is visual.
