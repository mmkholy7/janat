# Janat | جنّات

A lightweight, privacy-first space for fasting intentions: Mondays, Thursdays, and the Hijri white days (13, 14, 15). English, Arabic (RTL), French, and Spanish.

## Run

Requires Node.js 22.14 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173). In GitHub Codespaces, use the forwarded port. `npm run build` produces a static `dist/` directory. Deploy it to any static host at the domain root; no backend or secret is required. Use HTTPS in production.

## Available now

- Umm al-Qura Hijri dates, including 1448 AH, alongside Gregorian dates; local adjustment of -1, 0, or +1 day.
- Deduplicated weekly and white-day schedules. Eid al-Fitr, Eid al-Adha, and the days of Tashriq are excluded.
- A 90-day calendar invitation download with a day-before `VALARM`, plus individual event downloads. Choose weekly days, white days, or both.
- Private local fasting logbook: fasted, not fasted, or not logged. Month and lifetime totals. JSON export and local deletion.
- Rotating, locally hosted nature photography with sourced Quran excerpts and a sourced hadith reminder.
- Responsive layouts, RTL, keyboard-accessible dialogs, and reduced-motion support.
- Dark backgrounds throughout the calendar, logbook, dialogs, and resource pages.
- A categorized, multilingual directory of Quran, hadith, and established Sunni learning sites at `/#resources`.
- Local Quran recitation/revision sessions, minutes and pages, daily minute goals, deletion, and JSON export at `/#quran`.
- A separate 30-day daily Quran calendar download with day-before alerts and distinct event identifiers.

## Important boundaries

**Email sending is not connected.** This version does not collect email addresses or send messages. Downloading a calendar is not an email subscription or a live calendar feed. Calendar applications control whether, when, and how imported alarms are delivered. Some discard imported alarms: verify notification settings in the chosen calendar. Re-importing the same dates uses stable event UIDs, but deduplication varies by provider. Changing the Hijri adjustment requires importing an updated calendar.

The logbook is stored in this browser's `localStorage`, without encryption or cross-device sync. Clearing browser data deletes it. Export before changing browsers. Exports currently serve as backups for manual recovery; there is no import interface yet. Private browsing may not retain records. Calendar exports contain the activity name and will be visible to the chosen calendar provider. The page loads fonts from Google Fonts, which receives normal network metadata; landscape photos are served locally. There are no analytics, cookies, or advertising integrations.

Hijri dates use the browser's built-in `Intl` Umm al-Qura calendar and the device's local date. Local moon sightings may differ; confirm dates with your community. The calendar is a planning aid, not a religious ruling or assessment of health, obligations, or exemptions. Ramadan obligations are outside this version's scope. Source references are available in the app. A qualified religious review is recommended before public release.

## Tests

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Unit tests cover Hijri dates, scheduling overlaps, excluded dates, adjustments, and iCalendar alarms. Browser tests cover languages, RTL, responsive overflow, images, logbook persistence, invitation downloads, and calendar navigation. GitHub Actions runs both suites.

If browser downloads are blocked, tests can use an installed Chrome or Edge: set `PLAYWRIGHT_CHANNEL=chrome` or `PLAYWRIGHT_CHANNEL=msedge` in your shell before running the browser suite.

## Next steps

1. **Opt-in email reminders:** add a provider-neutral backend, scheduled delivery, explicit consent, verified addresses, one-click unsubscribe, rate limits, deletion/export, and timezone-aware scheduling. Accept standard relay addresses (Apple Hide My Email, Firefox Relay, SimpleLogin) without requiring a real-name identity. Never place provider keys in the client.
2. **Live calendar subscriptions:** publish private, revocable feed URLs with clear warnings about calendar-provider refresh delays.
3. **Quran recitation and revision:** extend the local tracker with passage bookmarks, flexible reminder schedules, and optional cross-device sync.
4. Offline support, optional encrypted backup/sync, community religious review, and verified translation review.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development conventions. The repository has Codespaces configuration and CI. A project license still needs to be selected by the maintainer; no license is implied by public hosting.

## Production and Email Setup

The current deployment is https://janat.uably.com. See [the Resend setup guide](docs/RESEND-SETUP.md) for sending-domain verification, Cloudflare DNS, restricted API keys, the backend launch checklist, and why login should remain optional. Email sending is not implemented in this release. Quran records, like fasting records, are stored locally without encryption or cross-device sync and are included in the JSON export. Pages are counted as entered; no particular mushaf pagination is assumed.