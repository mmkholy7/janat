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

The site runs as the `janat` Cloudflare Worker defined in `wrangler.jsonc`, which owns the `janat.uably.com` custom domain. `worker/index.ts` serves `/api/calendar` through the `functions/api/calendar.ts` handler and everything else from the built `dist/` assets.

Every push to `main` deploys automatically through `.github/workflows/deploy.yml`, which runs the tests, builds, and runs `wrangler deploy`. To redeploy without a code change, open **Actions > Deploy to Cloudflare > Run workflow** on GitHub. The `CLOUDFLARE_API_TOKEN` repository secret needs the **Workers Scripts: Edit** permission, and `CLOUDFLARE_ACCOUNT_ID` must be set.

To deploy by hand from the repository root:

```sh
npm ci
npm run build
npx wrangler deploy
```

Do not use `wrangler pages deploy`; a Pages project does not own the custom domain, so its deployments are not visible on janat.uably.com. A separate static host needs an equivalent server endpoint.

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