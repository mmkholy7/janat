# Calendar Integration

## Available without accounts or API credentials

- Individual fasting dates open a prefilled Google Calendar, Outlook.com, or Microsoft 365 event draft. Users save the event in their own calendar. These links cannot set reliable notification preferences; users must configure reminders in their calendar before saving.
- The Reminders dialog offers a read-only subscription for all fasting days matching the selected schedule. Quran has a separate daily subscription. No download/upload is required.
- A subscription URL is available for providers that do not accept the convenience links. Google documents setup from a desktop web browser under **Other calendars > From URL**. Outlook supports **Add calendar > Subscribe from web**. Apple supports `webcal` URLs. Mobile-app and managed-work-account support varies.
- File downloads remain a fallback and contain alarms 8 hours before each day begins. Some providers ignore imported alarms, particularly on subscribed calendars. These are not guaranteed notification delivery mechanisms.

## Public feed

`GET /api/calendar` and `HEAD /api/calendar` return `text/calendar`.

Parameters: `activity=fast|quran`, `lang=en|ar|ur|id|tr|bn|fa|ms|fr|es`, `weekly=true|false`, `white=true|false`, and `adjustment=-1|0|1`. Unknown/duplicate parameters are rejected. Fasting subscriptions need at least one schedule selected.

Example:

```text
https://janat.uably.com/api/calendar?activity=fast&lang=en&weekly=true&white=true&adjustment=0
```

The feed covers seven prior days and 400 days from the current UTC date. It reuses the fasting rules and stable activity/date UIDs, includes localized reminders and hadith references, and excludes prohibited fasting dates. Responses can be cached for one hour. Calendars fetch them at provider-controlled intervals, sometimes more than 24 hours apart. Adjustments to moon-sighting preferences create a different feed URL; replace the old subscription rather than subscribing twice.

The feed contains no logbook entries, session history, name, email, or token. It is deliberately public and can be guessed from its non-personal settings. The calendar provider receives the selected schedule and language. Cloudflare processes ordinary network request metadata. Do not add personal content to this endpoint without redesigning access controls.

## Cloudflare deployment

The `functions/api/calendar.ts` handler must deploy with the frontend. Use Git-integrated Cloudflare Pages or run Wrangler from the repository root after building:

```sh
npm ci
npm run build
npx wrangler pages deploy dist --project-name YOUR_EXISTING_PROJECT --branch main
```

Wrangler automatically bundles the root `functions/` directory. Do not create a new Pages project just to update the existing custom domain. Cloudflare dashboard drag-and-drop uploads do not support Functions. A separate static host needs an equivalent server endpoint. A Workers-hosted site needs an explicit Workers adapter; this release targets Pages Functions, not a standalone Worker.

After deployment verify:

```sh
curl -I 'https://janat.uably.com/api/calendar?activity=fast&lang=en'
```

Expect HTTP 200 and `Content-Type: text/calendar;charset=utf-8`, not the site's fallback HTML. The app checks this before enabling subscription links. Provider servers cannot fetch a localhost/private preview feed; use the public HTTPS production address.

The Vite development server includes a small adapter for this same handler. `vite preview` serves only the static build and does not emulate Pages Functions.

## Future full account integration

Writing a full schedule directly into a user's calendar with explicit reminder settings needs OAuth, a Google Cloud project or Microsoft Entra app registration, user consent, least-privilege calendar permissions, secure server-side credential handling, token expiry/revocation, and durable duplicate-write protection. Google may require verification for production use. Use maintained OAuth libraries/providers; never put a client secret in `VITE_` environment variables or request passwords.

That is not the same as Janat login. Keep local tracking and public calendar subscriptions account-free. Optional sign-in is appropriate for private cross-device records, not required simply to subscribe to a public fasting calendar.

## References

- https://support.google.com/calendar/answer/37100
- https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web-cff1429c-5af6-41ec-a5b4-74f2c278e98c
- https://developers.cloudflare.com/pages/functions/get-started/