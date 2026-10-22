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
- Add every user-facing message to `src/locales/en.ts` and to every other file in `src/locales/`. `npm test` fails if a locale is missing a key, leaves one empty, or drops a placeholder such as `{n}`.
- Check mobile layouts and right-to-left languages (Arabic, Urdu, Persian). Respect reduced motion and keyboard navigation.
- Cite precise sources for Quran excerpts and hadith. Translations are short renderings of the meaning, not substitutes for the Arabic text. Have additions reviewed by a qualified person before release.
- Never commit personal fasting records, addresses, credentials, or analytics identifiers.
- Do not add tracking, remote storage, or an email provider without discussing the privacy impact.
- Records marked unlogged must not be counted as missed fasts. There can be valid personal reasons not to fast.

## Adding a language

1. Add the code to `languages` and `languageInfo` in `src/languages.ts`: native name, locale, direction, Open Graph locale, and a Google Fonts family if the script needs one.
2. Copy `src/locales/en.ts` to `src/locales/<code>.ts`, type it as `Messages`, and translate every value. Keep `{n}` placeholders and source references.
3. Register it in `src/locales/index.ts` and in the lazy `loaders` map in `src/i18n.ts`.
4. Add the code to the `languages` list in `tests/app.spec.ts`, then run all tests.
5. Run `npm run build` and confirm that `dist/<code>/index.html` and `dist/sitemap.xml` include it.
6. Have a native speaker review the wording, especially religious terms, before release.

## Future activity types

Keep recitation/revision schedules separate from the fasting date rules. A future shared activity contract can include an activity ID, a local date, completion state, and reminder preferences; introduce it when a second activity actually exists.

## Licensing

The maintainer must select a project license before advertising this repository as open-source. Public visibility alone does not grant redistribution rights. See the image attribution file for third-party asset terms.