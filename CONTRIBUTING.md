# Contributing to Janat

Small, focused pull requests are welcome. Discuss larger features in an issue before implementation.

## Local setup

Use Node.js 22.14 or newer. Run `npm ci`, then `npm run dev`. In Codespaces, the dev container installs dependencies and forwards port 5173.

Before submitting:

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

## Conventions

- Keep the production app dependency-light and statically deployable.
- Keep religious dates and scheduling rules in `src/calendar.ts`, with regression tests.
- Add every user-facing message in all four languages in `src/i18n.ts`.
- Check mobile layouts and Arabic RTL. Respect reduced motion and keyboard navigation.
- Cite precise sources for Quran excerpts and hadith. Translations are short renderings of the meaning, not substitutes for the Arabic text. Have additions reviewed by a qualified person before release.
- Never commit personal fasting records, addresses, credentials, or analytics identifiers.
- Do not add tracking, remote storage, or an email provider without discussing the privacy impact.
- Records marked unlogged must not be counted as missed fasts. There can be valid personal reasons not to fast.

## Future activity types

Keep recitation/revision schedules separate from the fasting date rules. A future shared activity contract can include an activity ID, a local date, completion state, and reminder preferences; introduce it when a second activity actually exists.

## Licensing

The maintainer must select a project license before advertising this repository as open-source. Public visibility alone does not grant redistribution rights. See the image attribution file for third-party asset terms.