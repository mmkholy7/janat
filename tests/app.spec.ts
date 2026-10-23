import { test, expect, type Page } from '@playwright/test';

const languages = ['en', 'ar', 'ur', 'id', 'tr', 'bn', 'fa', 'ms', 'fr', 'es'];
const rtl = new Set(['ar', 'ur', 'fa']);
const fitsViewport = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
async function chooseLanguage(page: Page, language: string) {
  await page.locator('#language').selectOption(language);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}

test.beforeEach(async ({ page }, testInfo) => {
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  if (!testInfo.title.includes('analytics')) await page.addInitScript(() => localStorage.setItem('janat.consent', 'denied'));
  await page.clock.install({ time: new Date('2026-10-19T12:00:00') });
  await page.goto('/');
});

test('landscapes render and every language fits the viewport', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('h1')).toContainText('A little intention');
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).colorScheme)).toBe('light');
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).colorScheme)).toBe('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  for (const language of languages) {
    await chooseLanguage(page, language);
    await expect(page.locator('html')).toHaveAttribute('dir', rtl.has(language) ? 'rtl' : 'ltr');
    expect(await fitsViewport(page), language).toBe(true);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath(`${language}.png`), fullPage: true });
  }
  for (const file of ['mountains', 'forest', 'lake']) {
    expect(await page.evaluate(async name => {
      const image = new Image(); image.src = `/images/${name}.jpg`; await image.decode(); return image.naturalWidth;
    }, file)).toBeGreaterThan(1000);
  }
  await page.locator('#language').selectOption('en');
  await page.locator('[data-scene="1"]').first().click();
  await expect(page.locator('.verse')).toContainText('remember');
  expect(errors).toEqual([]);
});

test('records, edits, and clears fasting entries across reloads', async ({ page }) => {
  await page.locator('nav [data-view="logbook"]').click();
  await expect(page.locator('.empty-state')).toBeVisible();
  await page.locator('.recent-row').first().click();
  await page.locator('[data-status="fasted"]').click();
  await expect(page.locator('.log-row')).toHaveCount(1);
  await expect(page.locator('.log-status')).toHaveText('Fasted');
  await page.reload();
  await expect(page.locator('.log-status')).toHaveText('Fasted');
  await page.locator('.log-row').click();
  await page.locator('[data-status="missed"]').click();
  await expect(page.locator('.log-status')).toHaveText('Not fasted');
  await expect(page.locator('.log-total.missed strong')).toHaveText('1');
  await expect(page.locator('.log-total.fasted strong')).toHaveText('0');
  await page.locator('.log-row').click();
  await page.locator('[data-status="clear"]').click();
  await expect(page.locator('.empty-state')).toBeVisible();
});

test('exports actual calendar events and persists calendar adjustment', async ({ page }) => {
  await page.locator('.header-reminder').click();
  await expect(page.locator('dialog')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#reminder-form button[type="submit"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('janat-fasting-90-days.ics');
  const stream = await download.createReadStream();
  const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const calendar = Buffer.concat(chunks).toString('utf8');
  expect(calendar).toContain('BEGIN:VCALENDAR');
  expect(calendar).toContain('TRIGGER:-PT8H');
  expect(calendar.match(/BEGIN:VEVENT/g)!.length).toBeGreaterThan(20);
  await page.locator('dialog [data-action="settings"]').click();
  await page.locator('#adjustment').selectOption('1');
  await page.locator('#settings-form button[type="submit"]').click();
  await page.reload();
  await page.locator('nav [data-view="calendar"]').click();
  await page.locator('[data-action="settings"]').click();
  await expect(page.locator('#adjustment')).toHaveValue('1');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  await page.locator('[data-action="next-month"]').click();
  await expect(page.locator('.month-bar')).toContainText('November');
  await page.locator('[data-action="prev-month"]').click();
  await expect(page.locator('.month-bar')).toContainText('October');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('resources are categorized, translated, and directly addressable', async ({ page }, testInfo) => {
  await page.locator('nav [data-view="resources"]').click();
  await expect(page).toHaveURL(/#resources$/);
  await expect(page.locator('.resource-card')).toHaveCount(6);
  await page.locator('#resource-category').selectOption('hadith');
  await expect(page.locator('.resource-card')).toHaveCount(2);
  await expect(page.locator('.resource-card').first()).toContainText('Sunnah.com');
  for (const link of await page.locator('.resource-link').all()) {
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('href', /^https:\/\//);
  }
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Resources');
  for (const language of [...languages.slice(1), 'en']) {
    await chooseLanguage(page, language);
    await expect(page).toHaveURL(/#resources$/);
    expect(await fitsViewport(page), language).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath('resources.png'), fullPage: true });
});

test('Quran sessions, goals, and reminders stay separate from fasting', async ({ page }, testInfo) => {
  await page.locator('nav [data-view="quran"]').click();
  await expect(page.locator('[data-total="sessions"]')).toHaveText('0');
  await page.locator('#session-kind').selectOption('revision');
  await page.locator('[name="minutes"]').fill('20');
  await page.locator('[name="pages"]').fill('3');
  await page.locator('#quran-session button[type="submit"]').click();
  await expect(page.locator('.quran-row')).toHaveCount(1);
  await expect(page.locator('[data-total="minutes"]')).toHaveText('20');
  await expect(page.locator('[data-total="pages"]')).toHaveText('3');
  await page.locator('#daily-goal').fill('30');
  await page.locator('#quran-goal button').click();
  await page.reload();
  await expect(page.locator('.quran-row')).toContainText('Revision');
  await expect(page.locator('#daily-goal')).toHaveValue('30');
  await expect(page.locator('.quran-progress strong')).toHaveText('20 / 30');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-action="quran-invite"]').click();
  await page.locator('[data-action="download-quran"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('janat-quran-30-days.ics');
  const stream = await download.createReadStream();
  const chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const calendar = Buffer.concat(chunks).toString('utf8');
  expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(30);
  expect(calendar).toContain('UID:quran-2026-10-20@janat.local');
  expect(calendar).not.toContain('UID:fast-');
  await page.keyboard.press('Escape');
  await page.locator('#quran-session [name="minutes"]').fill('0');
  await page.locator('#quran-session button[type="submit"]').click();
  await expect(page.locator('.quran-row')).toHaveCount(1);
  for (const language of [...languages.slice(1), 'en']) {
    await chooseLanguage(page, language);
    expect(await fitsViewport(page), language).toBe(true);
    await expect(page.locator('.quran-row')).toHaveCount(1);
  }
  await page.screenshot({ path: testInfo.outputPath('quran.png'), fullPage: true });
  await page.locator('[data-action="delete-session"]').click();
  await expect(page.locator('[data-total="sessions"]')).toHaveText('0');
  await page.reload();
  await expect(page.locator('.quran-row')).toHaveCount(0);
  await page.locator('nav [data-view="logbook"]').click();
  await expect(page.locator('.log-total.fasted strong')).toHaveText('0');
});

test('calendar providers open drafts and subscribe without file imports', async ({ page, request }, testInfo) => {
  await page.locator('.hero-link[data-action="invite"]').click();
  const google = page.locator('dialog [data-provider="google"]');
  await expect(google).toHaveAttribute('href', /calendar.google.com/);
  const event = new URL((await google.getAttribute('href'))!);
  expect(event.searchParams.get('dates')).toBe('20261019/20261020');
  await expect(page.locator('dialog [data-provider="office365"]')).toHaveAttribute('href', /outlook.office.com/);
  await page.keyboard.press('Escape');
  await page.locator('.header-reminder').click();
  await expect(page.locator('.feed-status')).toBeEmpty({ timeout: 15000 });
  await expect(page.locator('dialog [data-provider="google"]')).toHaveAttribute('aria-disabled', 'false');
  await page.locator('#reminder-form [name="weekly"]').uncheck();
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('.feed-status')).toBeEmpty({ timeout: 15000 });
  await expect(page.locator('dialog [data-provider="google"]')).toHaveAttribute('href', /weekly%3Dfalse/);
  const subscribe = new URL((await page.locator('dialog [data-provider="google"]').getAttribute('href'))!);
  const feed = new URL(subscribe.searchParams.get('cid')!.replace(/^webcal:/, 'http:'));
  expect(feed.searchParams.get('white')).toBe('true');
  expect(feed.searchParams.has('email')).toBe(false);
  const response = await request.get(feed.href);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/calendar');
  expect(await response.text()).toContain('BEGIN:VCALENDAR');
  await expect(page.locator('dialog [data-provider="apple"]')).toHaveAttribute('href', /^webcal:/);
  for (const language of [...languages.slice(1), 'en']) {
    await page.keyboard.press('Escape');
    await chooseLanguage(page, language);
    await page.locator('.header-reminder').click();
    await expect(page.locator('.feed-status')).toBeEmpty({ timeout: 15000 });
    await expect(page.locator('dialog [data-provider="google"]')).toHaveAttribute('aria-disabled', 'false');
    expect(await page.locator('dialog').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false);
  }
  await page.screenshot({ path: testInfo.outputPath('calendar-providers.png'), fullPage: true });
});

test('missing calendar feeds keep downloads usable without broken subscription links', async ({ page }) => {
  await page.route('**/api/calendar?**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Not deployed</html>' }));
  await page.locator('.header-reminder').click();
  await expect(page.locator('.feed-status')).toHaveText('Calendar subscriptions are unavailable on this deployment.');
  await expect(page.locator('dialog [data-provider="google"]')).not.toHaveAttribute('href');
  const download = page.waitForEvent('download');
  await page.locator('#reminder-form button[type="submit"]').click();
  expect((await download).suggestedFilename()).toBe('janat-fasting-90-days.ics');
});
test('each language has its own crawlable address', async ({ page }) => {
  await page.goto('/ur/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page).toHaveTitle(/سنت/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://janat.uably.com/ur/');
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(languages.length + 1);
  await expect(page.locator('#language')).toHaveValue('ur');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.locator('.footer-languages a[hreflang="tr"]').click();
  await expect(page).toHaveURL(/\/tr\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://janat.uably.com/tr/');
  await expect(page.locator('.footer-languages [aria-current]')).toHaveAttribute('hreflang', 'tr');
  await page.goto('/');
  await expect(page).toHaveURL(/\/tr\/$/);
  await page.goto('/en/');
  await expect(page).toHaveURL(/:4173\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.footer-languages a[hreflang="en"]')).toHaveAttribute('href', '/en/');
  await page.goto('/');
  await expect(page.locator('#language')).toHaveValue('en');
  await expect(page).toHaveURL(/:4173\/$/);
  await page.goto('/tr/');
  await page.locator('nav [data-view="calendar"]').click();
  await expect(page).toHaveURL(/\/tr\/#calendar$/);
  await chooseLanguage(page, 'en');
  await expect(page).toHaveURL(/:4173\/#calendar$/);
  await expect(page).toHaveTitle('Calendar · Janat');
  await page.locator('nav [data-view="home"]').click();
  await expect(page).toHaveTitle(/Sunnah Fasting Calendar/);
});

test('going back keeps the language the visitor chose', async ({ page }) => {
  await page.goto('/ur/');
  await page.locator('nav [data-view="calendar"]').click();
  await expect(page).toHaveURL(/\/ur\/#calendar$/);
  await chooseLanguage(page, 'en');
  await expect(page).toHaveURL(/:4173\/#calendar$/);
  await page.goBack();
  await expect(page).toHaveURL(/:4173\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('janat.preferences') ?? '{}').language)).toBe('en');
});

test('answers common questions on the home page', async ({ page }) => {
  const items = page.locator('.faq-item');
  await expect(items).toHaveCount(6);
  await items.first().locator('summary').click();
  await expect(items.first()).toHaveAttribute('open', '');
  await expect(items.first()).toContainText('Sahih Muslim 1159');
  const data = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent() ?? '{}');
  expect(data['@graph'].map((node: { '@type': string }) => node['@type'])).toContain('FAQPage');
});

test('shares upcoming fasts and rotates authentic hadith', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const banner = page.locator('.hadith-banner');
  const source = () => banner.locator('.hadith-slide.active .hadith-source');
  await expect(banner.locator('.hadith-slide')).toHaveCount(23);
  await expect(banner.locator('.hadith-slide.active')).toHaveCount(1);
  const first = await source().getAttribute('href');
  expect(first).toMatch(/^https:\/\/sunnah\.com\/(bukhari|muslim|tirmidhi|abudawud):\d+[a-z]?$/);
  await banner.scrollIntoViewIfNeeded();
  await expect(banner).toHaveClass(/playing/);
  await expect(banner).not.toHaveClass(/held/);
  await page.clock.runFor(9500);
  await expect(source()).not.toHaveAttribute('href', first!);
  await banner.locator('[data-action="hadith-prev"]').click();
  await expect(source()).toHaveAttribute('href', first!);
  await expect(banner.locator('.hadith-count')).toContainText('of 23');
  await expect(banner.locator('.hadith-slide:not(.active)').first()).toHaveAttribute('aria-hidden', 'true');
  await banner.locator('[data-action="hadith-toggle"]').click();
  await expect(banner.locator('[data-action="hadith-toggle"]')).toHaveAttribute('aria-label', 'Play');
  await banner.locator('[data-action="hadith-next"]').click();
  const hadithReference = (await source().textContent())!.trim();

  await banner.locator('[data-action="share-hadith"]').click();
  const dialog = page.locator('#modal');
  await expect(dialog).toHaveAttribute('data-kind', 'share');
  await expect(dialog.locator('#modal-title')).toHaveText('Share this hadith');
  expect(new URL((await dialog.locator('[data-network="telegram"]').getAttribute('href'))!).searchParams.get('text')).toContain(hadithReference);
  await page.keyboard.press('Escape');

  await page.locator('.upcoming-section [data-action="share-days"]').click();
  await expect(dialog.locator('#modal-title')).toHaveText('Share these days');
  await expect(dialog.locator('.share-link')).toHaveCount(7);
  // Image rendering waits at most 2.5s for web fonts; the fake clock has to pass that wait.
  await page.clock.runFor(3000);
  await expect(dialog.locator('.share-preview img')).toBeVisible();
  await expect.poll(() => dialog.locator('.share-preview img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1080);
  const whatsapp = new URL((await dialog.locator('[data-network="whatsapp"]').getAttribute('href'))!);
  expect(whatsapp.hostname).toBe('wa.me');
  expect(whatsapp.searchParams.get('text')).toContain('Monday 19 October');
  expect(whatsapp.searchParams.get('text')).toContain('https://janat.uably.com/');
  const sharedText = () => dialog.locator('[data-network="whatsapp"]').evaluate(link => new URL((link as HTMLAnchorElement).href).searchParams.get('text'));
  const reference = /— (Sahih al-Bukhari|Sahih Muslim|Jami at-Tirmidhi|Sunan Abi Dawud) \d+[a-z]? \((Sahih|Hasan)\)/;
  const withHadith = (await sharedText())!;
  expect(withHadith).toMatch(reference);
  await dialog.locator('[data-action="shuffle-hadith"]').click();
  await expect.poll(sharedText).not.toBe(withHadith);
  expect(await sharedText()).toMatch(reference);
  expect(await sharedText()).toContain('Monday 19 October');
  await page.clock.runFor(3000);
  await expect(dialog.locator('[data-action="download-share-image"]')).toBeEnabled();
  expect(await fitsViewport(page)).toBe(true);
  const download = page.waitForEvent('download');
  await dialog.locator('[data-action="download-share-image"]').click();
  expect((await download).suggestedFilename()).toBe('janat-fasting-days-2026-10-19.jpg');
  await page.keyboard.press('Escape');

  await chooseLanguage(page, 'ur');
  await page.locator('.hero [data-action="share-days"]').click();
  await page.clock.runFor(3000);
  await expect(dialog.locator('.share-preview img')).toBeVisible();
  expect(new URL((await dialog.locator('[data-network="whatsapp"]').getAttribute('href'))!).searchParams.get('text')).toContain('https://janat.uably.com/ur/');
  expect(await fitsViewport(page)).toBe(true);
  expect(errors).toEqual([]);
});

test('analytics load only after consent and the choice can be changed', async ({ page }) => {
  const tagRequests: string[] = [];
  page.on('request', request => { if (request.url().startsWith('https://www.googletagmanager.com/')) tagRequests.push(request.url()); });
  const banner = page.locator('.consent');
  await expect(banner).toContainText('Google analytics cookies');
  await expect(page.locator('.faq-section')).toContainText('only if you accept them');
  for (const language of languages) {
    await chooseLanguage(page, language);
    await expect(banner).toHaveAttribute('data-lang', language);
    expect(await fitsViewport(page), language).toBe(true);
    expect(await banner.evaluate(element => { const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight; }), language).toBe(true);
  }
  await chooseLanguage(page, 'en');
  expect(tagRequests).toEqual([]);
  await banner.getByRole('button', { name: 'Accept' }).click();
  await expect(banner).toHaveCount(0);
  await expect.poll(() => tagRequests).toEqual(['https://www.googletagmanager.com/gtm.js?id=GTM-KNCXQJPL']);
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  await expect(banner).toHaveCount(0);
  await expect.poll(() => tagRequests.length).toBe(2);
  await page.locator('[data-action="consent-settings"]').click();
  await banner.getByRole('button', { name: 'Decline' }).click();
  expect(await page.evaluate(() => localStorage.getItem('janat.consent'))).toBe('denied');
  expect(await page.evaluate(() => Array.from((window as unknown as { dataLayer: IArguments[] }).dataLayer.at(-1)!))).toEqual(['consent', 'update', { analytics_storage: 'denied' }]);
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  await expect(banner).toHaveCount(0);
  expect(tagRequests).toHaveLength(2);
});

test.describe('browser language', () => {
  test.use({ locale: 'ur-PK' });
  test('opens in the visitor’s language on first visit', async ({ page }) => {
    await expect(page).toHaveURL(/\/ur\/$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('#language')).toHaveValue('ur');
  });
});
