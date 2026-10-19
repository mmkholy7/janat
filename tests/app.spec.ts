import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T12:00:00') });
  await page.goto('/');
});

test('landscapes render and all four languages fit the viewport', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('h1')).toContainText('A little intention');
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).colorScheme)).toBe('dark');
  for (const language of ['en', 'ar', 'fr', 'es']) {
    await page.locator('#language').selectOption(language);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflowing).toBe(false);
    await expect(page.locator('h1')).toBeVisible();
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
  expect(calendar).toContain('TRIGGER:-P1D');
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
  for (const language of ['ar', 'fr', 'es', 'en']) {
    await page.locator('#language').selectOption(language);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
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
  for (const language of ['ar', 'fr', 'es', 'en']) {
    await page.locator('#language').selectOption(language);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
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
  const feed = new URL(subscribe.searchParams.get('cid')!);
  expect(feed.searchParams.get('white')).toBe('true');
  expect(feed.searchParams.has('email')).toBe(false);
  const response = await request.get(feed.href);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/calendar');
  expect(await response.text()).toContain('BEGIN:VCALENDAR');
  await expect(page.locator('dialog [data-provider="apple"]')).toHaveAttribute('href', /^webcal:/);
  for (const language of ['ar', 'fr', 'es', 'en']) {
    await page.keyboard.press('Escape');
    await page.locator('#language').selectOption(language);
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