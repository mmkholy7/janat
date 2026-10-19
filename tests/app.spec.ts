import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T12:00:00') });
  await page.goto('/');
});

test('landscapes render and all four languages fit the viewport', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await expect(page.locator('h1')).toContainText('A little intention');
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
  await page.locator('nav [data-view="logbook"]').click();
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