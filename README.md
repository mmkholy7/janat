# Janat | جنّات

A lightweight, privacy-first space for fasting intentions: Mondays, Thursdays, and the Hijri white days (13, 14, 15). Available in English, العربية (Arabic), اردو (Urdu), Bahasa Indonesia, Türkçe, বাংলা (Bengali), فارسی (Persian), Bahasa Melayu, Français, and Español.

## Run

Requires Node.js 22.14 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173). In GitHub Codespaces, use the forwarded port. `npm run build` produces the frontend in `dist/`. The calendar subscription endpoint lives in `functions/` and is served by the Cloudflare Worker in `worker/` (see `wrangler.jsonc`). Other static hosts retain local tracking, event links, and downloads but not the subscription feed. No secrets or database are required. Use HTTPS in production.

## Available now

- Umm al-Qura Hijri dates, including 1448 AH, alongside Gregorian dates; local adjustment of -1, 0, or +1 day.
- Deduplicated weekly and white-day schedules. Eid al-Fitr, Eid al-Adha, and the days of Tashriq are excluded.
- A 90-day calendar invitation download with an 8-hour-ahead `VALARM`, plus individual event downloads. Choose weekly days, white days, or both.
- Private local fasting logbook: fasted, not fasted, or not logged. Month and lifetime totals. JSON export and local deletion.
- Rotating, locally hosted nature photography (WebP with JPEG fallback) with sourced Quran excerpts and a sourced hadith reminder.
- Responsive layouts with a mobile tab bar, RTL, script-appropriate fonts, a skip link, keyboard-accessible dialogs, and reduced-motion support.
- A sourced FAQ about Sunnah fasting on the home page.
- An installable web app manifest with home-screen icons (no offline mode yet).
- Dark backgrounds throughout the calendar, logbook, dialogs, and resource pages.
- A categorized, multilingual directory of Quran, hadith, and established Sunni learning sites at `/#resources`.
- Local Quran recitation/revision sessions, minutes and pages, daily minute goals, deletion, and JSON export at `/#quran`.
- A separate 30-day daily Quran calendar download with 8-hour-ahead alerts and distinct event identifiers.
- Google Calendar, Outlook.com, and Microsoft 365 event drafts without downloading or uploading files.
- Read-only rolling subscriptions for Google, Outlook, Microsoft 365, and Apple Calendar, backed by a public Cloudflare Worker endpoint. No account access or personal activity history is shared.
- An embeddable Sunnah fasting calendar for other websites (`/embed/`, month or upcoming-fasts view, light/dark/auto, all ten languages) and a builder with live preview and copyable code at `/fasting/widget/`. The widget sets no cookies; each fast opens Janat's add-to-calendar sheet.

## Languages and search

Each language has its own address: `/` for English and `/ar/`, `/ur/`, `/id/`, `/tr/`, `/bn/`, `/fa/`, `/ms/`, `/fr/`, and `/es/` for the others. Arabic, Urdu, and Persian render right-to-left. First-time visitors to `/` are taken to their browser language; a choice made in the language menu or footer is remembered, and `/` then opens that language. `/en/` always opens English. Only the active language is downloaded.

`npm run build` pre-renders a static page per language (`dist/<lang>/index.html`) with a translated title and description, canonical URL, reciprocal `hreflang` alternates, Open Graph and Twitter cards, JSON-LD (`WebSite`, `WebApplication`, `FAQPage`), and readable content for crawlers and visitors without JavaScript. It also writes `dist/sitemap.xml`, which `public/robots.txt` references. The canonical domain is `SITE_URL` in `src/seo.ts`; change it when deploying elsewhere. After each domain change, submit the sitemap in Google Search Console and Bing Webmaster Tools.

`public/_headers` sets security headers and long-lived caching for hashed assets on Cloudflare. Pages may only be framed by Janat itself, except `/embed/`, which any site may frame. The embed is `noindex`; the builder page and its visible credit link are what search engines see.

Translations other than English were drafted with machine assistance. Have native speakers, ideally familiar with Islamic terminology, review them before promoting a language.

## Important boundaries

**Email sending is not connected.** This version does not collect email addresses or send messages. Calendar subscription links are not email subscriptions or OAuth account connections. Providers control refresh timing and notifications; updates can take over 24 hours and imported alarms may be discarded. Event drafts require the user to save the event and configure its reminder. File downloads are snapshots with stable event UIDs; deduplication varies by provider. Changing the Hijri adjustment requires replacing the subscription or importing an updated file.

The logbook is stored in this browser's `localStorage`, without encryption or cross-device sync. Clearing browser data deletes it. Export before changing browsers. Exports currently serve as backups for manual recovery; there is no import interface yet. Private browsing may not retain records. Calendar exports contain the activity name and will be visible to the chosen calendar provider. The page loads fonts from Google Fonts (plus a script-specific font for Urdu, Bengali, or Persian), which receives normal network metadata; landscape photos are served locally. Google Tag Manager (`GTM-KNCXQJPL`, see `src/consent.ts`) loads only after a visitor accepts analytics cookies in the consent banner; the choice is stored in `localStorage` (`janat.consent`) and can be changed anytime under "Privacy choices" in the footer, which also removes Google Analytics cookies. Google Consent Mode defaults to denied (set inline in `index.html`), so any Google tag on the page waits for the visitor's choice; advertising signals always stay denied, and there are no advertising integrations.

Hijri dates use the browser's built-in `Intl` Umm al-Qura calendar and the device's local date. Local moon sightings may differ; confirm dates with your community. The calendar is a planning aid, not a religious ruling or assessment of health, obligations, or exemptions. Ramadan obligations are outside this version's scope. Source references are available in the app. A qualified religious review is recommended before public release.

## Tests

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Unit tests cover Hijri dates, scheduling overlaps, excluded dates, adjustments, iCalendar alarms, translation completeness, language routing, pre-rendered metadata, and the sitemap. Browser tests cover all ten languages, RTL, responsive overflow, language URLs and detection, the FAQ, images, logbook persistence, invitation downloads, and calendar navigation. GitHub Actions runs both suites.

If browser downloads are blocked, tests can use an installed Chrome or Edge: set `PLAYWRIGHT_CHANNEL=chrome` or `PLAYWRIGHT_CHANNEL=msedge` in your shell before running the browser suite.

## Next steps

1. **Opt-in email reminders:** add a provider-neutral backend, scheduled delivery, explicit consent, verified addresses, one-click unsubscribe, rate limits, deletion/export, and timezone-aware scheduling. Accept standard relay addresses (Apple Hide My Email, Firefox Relay, SimpleLogin) without requiring a real-name identity. Never place provider keys in the client.
2. **Calendar integrations:** extend the existing public, non-personal subscription feeds with optional OAuth-based Google Calendar / Microsoft Graph connections for per-user event writes and explicit reminder settings. Private feeds and revocation are necessary only if adding personal records.
3. **Quran recitation and revision:** extend the local tracker with passage bookmarks, flexible reminder schedules, and optional cross-device sync.
4. Offline support, optional encrypted backup/sync, community religious review, and native-speaker review of every translation.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development conventions. The repository has Codespaces configuration and CI. A project license still needs to be selected by the maintainer; no license is implied by public hosting.

## Production and Email Setup

The current deployment is https://janat.uably.com. See [the Resend setup guide](docs/RESEND-SETUP.md) for sending-domain verification, Cloudflare DNS, restricted API keys, the backend launch checklist, and why login should remain optional. Email sending is not implemented in this release. Quran records, like fasting records, are stored locally without encryption or cross-device sync and are included in the JSON export. Pages are counted as entered; no particular mushaf pagination is assumed.

See [calendar integration and deployment](docs/CALENDAR-INTEGRATION.md) for the subscription feed, supported providers, deployment verification, and OAuth boundaries.