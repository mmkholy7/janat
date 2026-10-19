# Resend Setup for Janat

Website: https://janat.uably.com

## Current status

The website supports calendar downloads, not email subscriptions. Configuring Resend does not enable sending by itself. There is no email endpoint, database, or scheduled email Worker in this release. Never put a Resend key in the frontend, a `VITE_` variable, GitHub, or chat.

## 1. Create and verify a sending domain

1. Create an account at https://resend.com and open **Domains > Add domain**.
2. Use `notify.uably.com` as a dedicated sending subdomain, assuming you control DNS for `uably.com`. It is separate from the website hostname; no website move is needed.
3. Pick a sending region close to your audience. Leave receiving disabled unless you intentionally want Resend to receive mail for this subdomain.
4. Use Resend's **Sign in to Cloudflare** option to authorize the DNS changes, or manually copy the exact records shown by Resend into **Cloudflare > uably.com > DNS > Records**.
5. For manual setup, add the provided DKIM TXT record and the SPF TXT and return-path MX records at their specified hostnames. Do not invent values or replace existing root-domain MX/SPF records. DNS records that support proxying must be **DNS only**, not proxied.
6. With the example subdomain, a host might be `resend._domainkey.notify` or `send.notify` within the `uably.com` zone. Copy the actual names and values from Resend; its current screen is authoritative.
7. Click **Verify DNS records** in Resend and wait for **Verified**.
8. Review DMARC for the sending subdomain and the root-domain policy before adding records. Start with a monitoring policy if appropriate; do not overwrite an existing policy blindly.

Sender: `Janat <reminders@notify.uably.com>`. This address does not require a paid mailbox to send, but receiving replies requires a real mailbox/forwarder or a working Reply-To address. Disable open/click tracking for these private reminders.

## 2. Create a restricted API key

In **Resend > API Keys > Create API Key**, use a name such as `Janat production`, **Sending access**, and restrict it to the verified sending domain. Keep the key in a password manager. The initial Resend test sender is restricted; use your verified domain for real recipients.

## 3. Store configuration in the future backend

Once a dedicated Cloudflare reminder Worker is implemented, add these under **Workers & Pages > reminder Worker > Settings > Variables and Secrets**:

| Name | Type | Example |
| --- | --- | --- |
| `RESEND_API_KEY` | Secret | Your restricted key, entered directly into Cloudflare |
| `EMAIL_FROM` | Variable | `Janat <reminders@notify.uably.com>` |
| `APP_URL` | Variable | `https://janat.uably.com` |

Adding these to the current static Pages build will not connect email delivery. Do not use client-visible environment variables for secrets.

## 4. Implement subscriptions before public sending

- Double opt-in verification, explicit consent, and acceptance of privacy-relay addresses.
- Timezone, language, fasting choices, Hijri adjustment, and preferred reminder hour.
- Unpredictable verification/manage tokens stored hashed, with expiry and revocation. Never use an email address as an authorization token.
- D1 subscription storage and minimal retention; no fasting or Quran logs unless the user separately requests sync.
- Rate limits and server-verified Turnstile on public subscription requests. Do not expose an arbitrary-recipient send endpoint.
- One-click unsubscribe and signed webhook handling for hard bounces/complaints. Stop sending to suppressed recipients.
- A Cron-triggered Worker that computes tomorrow in each subscriber's timezone, reuses the tested fasting schedule, and sends a localized message with an `.ics` attachment.
- A database uniqueness constraint for each subscriber/activity/date plus a retryable delivery state and Resend idempotency keys. Provider idempotency expires after 24 hours and does not replace durable deduplication.
- Test confirmation, scheduled delivery, overlapping fasting dates, timezone boundaries, unsubscribe, failure recovery, and provider quota handling before launch.

## Should Janat require login?

No: keep the local tracker and calendar downloads available without an account. Email reminders only require verified subscriptions and secure management links. Introduce optional passwordless sign-in when implementing cross-device backup/sync. Use a maintained authentication provider or library rather than building password or session security from scratch. An email subscription does not grant access to personal activity records.

## References

- https://resend.com/docs/knowledge-base/cloudflare
- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/dashboard/api-keys/introduction
- https://resend.com/docs/api-reference/emails/send-email