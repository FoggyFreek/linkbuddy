# GigBuddy Link Page

A small, standalone app that gives every GigBuddy band a public **link page** —
a Linktree-style stack of widgets (music links, upcoming gigs, merch, social
links) at `link.<your-domain>/<band-slug>` — plus **release landing pages**
(smart-link style, one per song/album launch at `/<band-slug>/<release>`,
with one button per streaming platform), an editor for arranging the widgets,
and privacy-first visit + conversion statistics.

**Slug namespaces.** A band's main page lives at `/<mainSlug>` and its release
pages one segment deeper at `/<mainSlug>/<tail>`. Because a main slug can never
contain `/`, the stored slugs `foo` (main) and `foo/bar` (release) occupy
separate namespaces and can never collide — a release page can't shadow, or be
mistaken for, another band's main page. `pages.slug` stays globally unique
(one public URL → one page); release creation is restricted to the caller's own
`<mainSlug>/` prefix.

This directory is deliberately **decoupled from the main repo**: it has its own
`package.json`, its own Postgres database, its own migrations, and imports
nothing from the parent project. To split it out, move the `linkpage/` folder
into its own repository — nothing else needs to change.

## How it works

```
┌──────────────┐   handoff token (URL fragment)   ┌───────────────┐
│   GigBuddy   │ ───────────────────────────────► │  linkpage app │
│              │                                   │               │
│  /api/public/linkpage/export/:slug  ◄─────────── │  content sync │
│  /api/public/linkpage/image?t=…     ◄─────────── │  <img> tags   │
└──────────────┘   per-purpose bearers / signatures └───────────────┘
```

- **Content** (band profile, socials, profile links, songs + streaming links,
  merch products, announced upcoming gigs) is pulled from GigBuddy's export
  endpoint and stored as a denormalized snapshot in this app's database. The
  snapshot refreshes on editor entry, on publish, and lazily (background) when
  a public view finds it older than `LINKPAGE_CONTENT_TTL_MINUTES` — so gig
  listings stay current without coupling page loads to GigBuddy uptime.
- **Layout** (sections and widgets, their order and settings) is owned by this
  app: a draft the editor works on, and a published copy visitors see.
- **Editing**: in GigBuddy, a **tenant admin** clicks "Edit link page"
  (Profile page). GigBuddy mints a 10-minute, single-use, Ed25519-signed
  handoff token and opens `/edit#gbtoken=…` here; the app exchanges it for a
  12-hour editor session.
  There are no accounts in this app — GigBuddy is the identity provider and
  gates the handoff on role (tenant admin) and plan.
- **Plan gating** (GigBuddy tiers are the source of truth; each export ships
  an `entitlements` block this app enforces): the link-page feature is
  **silver and gold** only. Silver allows up to **3** release pages with a
  **30-day** statistics window; gold allows **30** release pages and a
  **90-day** window. A lapsed plan takes the public pages offline (404) on
  the next content sync. Ownerless legacy bands skip enforcement.
- **Preview**: the editor's preview tab renders the draft through the exact
  same resolution + React components as the public page.
- **Release pages**: from the editor's "New release page" button a member
  picks a song or an album (from GigBuddy, with its streaming links) and gets a
  landing page with big artwork, title/artist, and one platform button per link —
  extendable with any other widget. An album's tracklist appears over its
  artwork on hover (or focus/tap). Slugs are always prefixed with the band's
  own slug, so bands cannot squat each other's names.
- **Statistics** land in this app's own database (`page_views` +
  `page_clicks`) — views by device class, traffic source, country and day,
  plus outbound clicks per platform/target and a conversion-by-source table
  (views → clicks → CTR) for campaign attribution (use `?utm_source=…` in
  campaign links). Statistics live in a **rolling window** — 30 days, or 90
  on the gold plan. See [PRIVACY.md](./PRIVACY.md) for the hard privacy rules
  (no cookies, no IPs, no fingerprints, retention).

### Meta ads on smart links

Open a release smart link in the editor, select **Tracking**, enter the band's
Meta Pixel ID, and choose which streaming platforms count as conversions.
Save the settings and **Publish**. No database migration or API token is needed.

Only configured release smart links show the consent overlay, Cookie settings,
and advertising privacy wording. Visitors can accept or reject with equal
prominence; Meta is loaded only after acceptance. Choices are remembered for
180 days separately for each smart link and Pixel. Main pages, unconfigured
smart links, and editor previews never load Meta.

The Pixel sends `PageView` and `SmartLinkClick` (selected platform clicks), with
`release_id` (for example `song:12` or `album:5`) and `platform` parameters.
In Meta Events Manager, accept consent on the published page and test a click.
Create a custom conversion for `SmartLinkClick`, optionally filter by release
or platform, and select it in an eligible website-conversion ad set. The event
measures an outgoing click, not a confirmed stream. This integration uses the
browser Pixel; Conversions API is not enabled.

Selecting **Disable Meta tracking** and publishing removes tracking and its
consent UI from that smart link. Anonymous LinkBuddy statistics remain separate.
See [PRIVACY.md](./PRIVACY.md) for the optional advertising exception.

### Widget types

| Type | Content | Notes |
|---|---|---|
| `song` | a song + its streaming links | first link is the card target, extra links render as pills |
| `platforms` | one button per streaming link of a song or album | platform (Spotify, Apple Music, YouTube (Music), Deezer, TIDAL, Amazon, SoundCloud, Bandcamp) detected from the URL; the core of a release page. Embeddable platforms get a ▶ preview button (Spotify inline player, YouTube overlay) |
| `embed` | any pasted URL | metadata (title/artwork/description) pulled via oEmbed (Spotify, YouTube, SoundCloud, Vimeo, TikTok) or Open Graph tags; renders as a click-to-play card that opens the player in a closable modal overlay — an audio player (Spotify/SoundCloud) or a 16:9 video lightbox (YouTube, privacy-enhanced `youtube-nocookie.com`) — or as a rich link card |
| `gigs` | announced upcoming gigs | expandable card; only gigs with status `announced` are ever exported |
| `accolades` | awards and quotes from GigBuddy | touch-friendly horizontal carousel with description, date, optional link and signed image |
| `discography` | albums marked as discography in GigBuddy | photo carousel with title and release year over the album art |
| `merch` | selected products | horizontal card carousel; optional per-item image URL + badge, optional shop URL (e.g. your Shopify store) the cards link to |
| `link` | free-form link | label, optional sublabel/thumbnail, icon |

## Running locally

```
cd linkpage
npm install
cp .env.example .env       # fill in the credentials from `npm run credentials:generate`
createdb gigbuddy_linkpage # its own database — never gigbuddy's
npm run migrate
npm run dev                # API on :3010 + Vite on :5175
```

On the GigBuddy side set in its environment:

```
LINKPAGE_URL=http://localhost:5175
# ...plus the GigBuddy half printed by `npm run credentials:generate`
```

Then open GigBuddy → Profile → "Edit link page".

## Production

`npm run build` produces `dist/`; `npm run server` serves API + SPA on one
port (`LINKPAGE_PORT`). Host it on its own subdomain (e.g. `link.example.com`)
behind a reverse proxy that appends the visitor address to
`X-Forwarded-For` (`TRUST_PROXY_HOPS` counts the proxies in front, default 1).
For the country dimension, name the one geo header your edge sets and
overwrites in `STATS_COUNTRY_HEADER` (e.g. `cf-ipcountry`); any other geo header
could come from the visitor and is ignored. Unset, the country is `unknown`
(no IP geolocation is done here, by design). Beacons are limited per visitor
address.

Run `npm run migrate` on deploy. Statistics retention is enforced daily
in-process; deployments that prefer an external scheduler can run
`npm run stats:purge` instead.

### Deploy on a VPS with Docker

This app is fully decoupled (its own database, no imports from GigBuddy), so it
runs on its own host. The included `docker-compose.yml` brings up the API/SPA
server, its **own** Postgres, and a one-shot migration step:

```
cp .env.example .env      # set POSTGRES_PASSWORD, GIGBUDDY_URL,
                          #   GIGBUDDY_WEB_URL, LINKPAGE_PUBLIC_URL and
                          #   the integration credentials
docker compose up -d --build
```

`migrate` runs `server/migrate.js` and exits; `app` starts only after it
succeeds, and exposes `127.0.0.1:3010` with a `/api/health` liveness probe.
Front it with a TLS-terminating reverse proxy (Caddy/nginx/Traefik) for your
`link.<domain>`, and set `STATS_COUNTRY_HEADER` to the geo header it sets if you
want the country stat.

For a three-subdomain setup — GigBuddy at `app.<domain>`, this app at
`link.<domain>`, a marketing site at `www.<domain>` — set:

| Where | Variable | Value |
|---|---|---|
| this app (`link`) | `GIGBUDDY_URL` | `https://app.<domain>` (server-to-server export pull) |
| this app (`link`) | `GIGBUDDY_WEB_URL` | `https://www.<domain>` (browser-facing: the attribution badge's href) |
| this app (`link`) | `LINKPAGE_PUBLIC_URL` | `https://link.<domain>` |
| GigBuddy (`app`) | `LINKPAGE_URL` | `https://link.<domain>` |
| GigBuddy (`app`) | `APP_URL` | `https://app.<domain>` (the image-proxy URLs in exports are built from this) |

Integration credentials — generate a matching set with
`npm run credentials:generate`. Each one has a single purpose, and only the two
bearers exist on both sides:

| This app (`link`) | GigBuddy (`app`) | Purpose |
|---|---|---|
| `LINKBUDDY_SECRET` | — | signs editor sessions, keys the visitor hash |
| `GIGBUDDY_HANDOFF_PUBLIC_KEY` | `LINKPAGE_HANDOFF_PRIVATE_KEY` | Ed25519 pair: GigBuddy signs handoffs, this app only verifies |
| — | `LINKPAGE_IMAGE_SECRET` | signs the public image tokens |
| `GIGBUDDY_EXPORT_TOKEN` | `LINKPAGE_EXPORT_TOKEN` | bearer this app presents on the export |
| `GIGBUDDY_INTEGRATION_TOKEN` | `LINKPAGE_INTEGRATION_TOKEN` | bearer GigBuddy presents on the integration routes |

**Cross-origin image note:** public pages on `link.<domain>` embed band
artwork served by GigBuddy at `app.<domain>/api/public/linkpage/image`. GigBuddy's
Helmet default sends `Cross-Origin-Resource-Policy: same-origin`, which blocks
that cross-origin `<img>`. Since `app.` and `link.` are the same site, GigBuddy's
image route must send `Cross-Origin-Resource-Policy: same-site` for logos and
covers to render. (There is no browser CORS between the two: the export pull is
server-to-server, the editor handoff is a top-level navigation, and the editor
API is same-origin.)

### Link enrichment (oEmbed / Open Graph)

`POST /api/editor/unfurl` (editor session required) fetches a URL's metadata
server-side: oEmbed for the known platforms, Open Graph scraping otherwise
(5s timeout, 600KB cap). The editor uses it to fill titles, descriptions, and
artwork ("Fetch image & info from link") — visitors never trigger third-party
fetches, and embed players are strictly click-to-play (see PRIVACY.md).

Because this is the one place the server fetches a user-supplied URL, it is
SSRF-hardened (`server/features/unfurl/safeFetch.js`): only http(s) on standard ports, no
embedded credentials, redirects followed manually and re-validated per hop,
and — the load-bearing control — a connection-time DNS lookup that validates
every resolved address (rejecting private, loopback, link-local, unique-local,
multicast, reserved, carrier-grade-NAT, 6to4/teredo and IPv4-mapped-IPv6
ranges via `ipaddr.js`) and pins the socket to the validated IP, so a hostname
that resolves to a private address — or a DNS-rebinding race — can never
connect. Operators may additionally route egress through a public-internet-only
proxy; these controls hold regardless.

Resource limits: each fetch has a 5s timeout and a 600 KiB body cap enforced
*before* buffering — a declared `Content-Length` over the cap is rejected up
front, and the body is read incrementally with the socket destroyed the instant
the running total exceeds the cap (so an undeclared/lying length or an
indefinitely-streamed response can neither exhaust memory nor hang). The
endpoint is also concurrency-limited (a few in flight globally, a couple per
tenant → 429 when saturated) so it can't fan out into memory/socket pressure.

## Integration contract (GigBuddy side)

- `GET /api/public/linkpage/export/:slug` — full content snapshot;
  `Authorization: Bearer <export token>`; 404 for unknown slugs; budgeted per band. The `band`
  object may carry an optional `theme: 'light' | 'dark'` (band-selectable in
  GigBuddy) that skins every one of the band's public pages, including the
  smart-link release pages. Either explicit value is honoured; when it's absent
  or unrecognized the fallback depends on the page — release pages render dark
  (their artwork-led layout is dark-first), main pages light.
- The export includes `accolades: [{ id, description, date, url, imageUrl }]`, newest first (up to 50). Dates use `YYYY-MM-DD`; `url` and `imageUrl` are nullable. Older snapshots without accolades are supported. Add an Accolades widget in the editor, refresh content, then publish; empty carousels are hidden.
- The export includes `discography: [{ id, title, artist, releaseDate, releaseYear, coverUrl, coverHighResolutionUrl }]` for albums marked as discography, newest first. `releaseDate` uses `YYYY-MM-DD`; dates and art can be null. Add a Discography widget in the editor, refresh content, then publish; empty carousels are hidden.
- The export includes `albums: [{ id, title, artist, coverUrl, coverHighResolutionUrl, links, tracks: [{ number, title }] }]` for albums with at least one streaming link; `tracks` is in album order, `number` nullable. Album release pages and album platform widgets resolve against it.
- The `band` object carries `booking: { feeLowCents, feeHighCents, currency, repertoire, contactEnabled, email, phone }` from GigBuddy's profile.
  `contactEnabled` is the band's opt-in: when it is false GigBuddy nulls every
  booking value (fees, currency, repertoire, contacts), and this app publishes no
  booking block at all. An opted-in band with a usable email and/or phone gets a
  "Book now" button on its main page; the dialog shows the fee range (or
  "Contact for more information"), the repertoire, and the contacts to act on.
  Clicks report as `book:open` / `book:email` / `book:phone` in the statistics;
  `book:open` is engagement, so it is excluded from the click-through rate the
  way shares and embed plays are. Contacts, fees and the currency are validated
  whole — an over-long or malformed value is dropped, never truncated into a
  usable-looking wrong one. Older snapshots without `booking` are supported.
- `GET /api/public/linkpage/image?t=<token>` — streams band logo / song cover;
  the token is HMAC-signed by GigBuddy with a key only GigBuddy holds, embedded
  in the export payload's image URLs, and only ever resolves to an image folder.
- Handoff token (GigBuddy → here, in the `/edit` URL fragment): payload
  `{ t: 'handoff', iss: 'gigbuddy', aud: 'linkbuddy', slug, slugRevision, tenantId, n, exp }`,
  Ed25519-signed, 10 min TTL, single-use (the nonce `n` is consumed on exchange). Legacy tokens without `slugRevision` remain valid only while their slug
  matches LinkBuddy's recorded tenant namespace; they can never rename it.
- `PUT /api/integrations/gigbuddy/tenants/:tenantId/slug` atomically moves the
  tenant's main page and every `/<main>/<release>` path without replacing page
  rows. Send `{ oldSlug, newSlug, revision }` with the integration bearer.
  Stable success codes are `applied`, `already_applied`, `no_pages`, and
  `stale_ignored`; conflicts use `slug_conflict` or `revision_gap`. Tenant ID
  and revision are authoritative; `oldSlug` is diagnostic only.

Tokens are compact `base64url(json) + '.' + base64url(signature)` — see
`server/features/editor/tokens.js` and gigbuddy's `server/promotion/linkpage/linkpageTokens.js`.

## Tests

```
npm test               # Node and pure-logic tests
npm run test:browser   # browser component tests
npm run test:coverage  # both suites plus Sonar LCOV reports
```

Tests are co-located with their owning feature or shared layer in `__tests__/`.
