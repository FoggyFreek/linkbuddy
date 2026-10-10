# Privacy requirements — link page statistics

The visitor-facing privacy notice lives at `/privacy` (`src/app/routes/Privacy.tsx`);
keep the two in sync. This document states the **hard rules** the
implementation must uphold, and what an operator (data controller) needs to
know. The design goal: visit and conversion statistics that are useful to
bands while never processing more personal data than a plain web-server
request already does — and storing none of it.

Two event kinds are collected, both under the same rules: **page views** and
**outbound clicks** (which platform button / widget was clicked — the
conversion metric for release campaigns). A click event stores only the
sanitized target label (e.g. `platform:spotify`, `social:instagram`), never
the destination URL and nothing visitor-derived beyond the shared dimensions
below.

## Hard rules (enforced in code — do not weaken)

1. **No cookies, no device storage** for LinkBuddy statistics. Main pages and
   smart links without a configured Meta Pixel keep this rule. This
   keeps the page out of consent-banner territory (ePrivacy): nothing is read
   from or written to the visitor's device. (The editor uses `sessionStorage`
   for its own session token — an authenticated band-member tool, not the
   public surface.)
   **Optional advertising exception:** a release smart link with a published
   Meta Pixel configuration remembers acceptance or rejection in local storage,
   scoped to its slug and Pixel ID, with a version and timestamp (180-day expiry).
   It loads Meta's script only after explicit acceptance and sends PageView and
   selected platform-click SmartLinkClick events. No pre-consent or rejected
   marketing events are sent. Cookie settings reopens the choice; withdrawal
   revokes Meta consent, stops future events, and clears accessible first-party
   _fbp/_fbc cookies. Already shared data cannot be recalled. Changing the Pixel
   or smart-link slug requires a new choice. Storage failures keep consent in
   memory for the current visit. Editor previews never load Meta.
2. **No IP addresses stored.** The IP is used in-memory for a single request
   to compute the daily visitor hash, then discarded. It never reaches the
   database or logs.
3. **No raw user agents stored** — only the derived class:
   `mobile | tablet | desktop | unknown` (bot traffic is dropped entirely).
4. **No referrer paths or query strings** — only the referrer *hostname* (or a
   sanitized `utm_source`), because URLs can carry personal data.
5. **Country only from the configured edge header** (`STATS_COUNTRY_HEADER`,
   e.g. `cf-ipcountry`). The app performs no IP geolocation of its own; without
   that header the country is `unknown`.
6. **Unique-visitor estimation without identifiers**: a keyed hash of
   (day, IP, user agent), truncated to 16 chars, rotating every 24 h. It
   cannot be linked across days and cannot be reversed; it exists only to
   deduplicate same-day repeat views.
7. **Aggregate-only reads**: the editor API exposes counts per dimension,
   never individual view/click rows.
8. **Retention — rolling window**: raw view and click rows live in a rolling
   window of 30 days by default, or 90 days for bands on the gold plan (the
   window is synced from GigBuddy per page; `STATS_RETENTION_DAYS` is the
   fallback, and 90 days is a hard cap regardless of configuration). Enforced
   by a daily in-process purge and `npm run stats:purge`.
9. **Kill switch**: `STATS_DISABLED=1` stops LinkBuddy statistics collection without affecting
   the page.
   Optional Meta advertising is controlled separately by each release page's
   published Tracking settings and the visitor's consent.
10. **Embeds are click-to-play, always.** Third-party players (Spotify,
    YouTube, SoundCloud) never load on page view — the page renders a local
    facade and the platform's iframe only mounts after the visitor clicks
    play. YouTube uses the privacy-enhanced `youtube-nocookie.com` host. Once
    a visitor starts playback, the platform's own privacy policy applies (and
    it may set cookies) — the notice says so. Metadata fetching (oEmbed/Open
    Graph) happens server-side on the editor's request only; visitors never
    trigger third-party fetches. Note that band-configured artwork (Open
    Graph images, merch images) may be served from external hosts like any
    linked image on the web.

## Operator notes (GDPR)

- The anonymous-statistics rules below apply to LinkBuddy's own event database,
  **not to optional Meta advertising**. With consent, Meta receives connection
  information, page URLs/campaign parameters, cookie identifiers, views and
  selected platform clicks and can associate them with a Meta account. These
  data go directly from the browser to Meta, never into LinkBuddy statistics.
- Advertising is off by default and available only on release smart links. The
  artist configures their own Pixel in Tracking and publishes it. The consent
  overlay offers equally prominent accept/reject buttons and a privacy link.
  The configured smart link's footer and `/privacy?smartlink=<slug>` describe
  advertising; the privacy route checks that page's published configuration and
  never loads the Pixel or sends view beacons. Other pages keep the cookieless
  wording. The band operates its advertising Pixel and must account for Meta's
  processing in its privacy records; Meta's own privacy policy governs its
  processing/retention. Advertising consent is separate from click-to-play embeds.

- With the rules above, stored statistics contain no personal data. The
  transient in-memory handling of IP/user agent during a request is processing
  under GDPR; **legitimate interest** (audience measurement, Art. 6(1)(f)) is
  the intended lawful basis — document it in your records of processing.
- The public page must always link to the privacy notice (the footer does).
- If you add ANY new dimension, keep it coarse and non-identifying, update
  `/privacy` and this file, and re-check that no consent requirement is
  triggered.
- Data subject requests: there is nothing to look up per person — no stored
  identifier maps to an individual. State this in your privacy notice.
- The bands' content (names, bios, gig listings) is published deliberately by
  the band via the editor; the band remains responsible for what it publishes.
