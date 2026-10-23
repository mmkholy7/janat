import { describe, expect, it } from 'vitest';
import { collectionKeys, gradeKeys, hadithUrl, hadiths } from './hadith';
import { messages } from './locales';
import { composeDaysText, composeHadithText, shareLinks, shareNetworks, shorten } from './share';
import { wrap } from './share-image';

describe('hadith banner data', () => {
  it('has unique entries with translated meanings and sunnah.com sources', () => {
    expect(hadiths.length).toBeGreaterThanOrEqual(20);
    expect(new Set(hadiths.map(hadith => hadith.id)).size).toBe(hadiths.length);
    expect(new Set(hadiths.map(hadith => hadith.key)).size).toBe(hadiths.length);
    for (const hadith of hadiths) {
      expect(hadithUrl(hadith)).toMatch(/^https:\/\/sunnah\.com\/(bukhari|muslim|tirmidhi|abudawud):\d+[a-z]?$/);
      expect(hadith.arabic).toMatch(/[\u0600-\u06FF]/);
      expect(['sahih', 'hasan']).toContain(hadith.grade);
      for (const copy of Object.values(messages)) {
        expect(copy[hadith.key], `${hadith.id}`).toBeTruthy();
        expect(copy[collectionKeys[hadith.collection]]).toBeTruthy();
        expect(copy[gradeKeys[hadith.grade]]).toBeTruthy();
      }
    }
  });
});

describe('sharing', () => {
  const message = { title: 'Upcoming Sunnah fasts', text: 'Monday & Thursday — fast with us', url: 'https://janat.uably.com/ur/' };

  it('builds a link for every network with the text and address encoded', () => {
    const links = shareLinks(message);
    expect(Object.keys(links).sort()).toEqual([...shareNetworks].sort());
    expect(new URL(links.whatsapp).searchParams.get('text')).toBe(`${message.text}\n${message.url}`);
    expect(new URL(links.telegram).searchParams.get('url')).toBe(message.url);
    expect(new URL(links.telegram).searchParams.get('text')).toBe(message.text);
    expect(new URL(links.facebook).searchParams.get('u')).toBe(message.url);
    expect(new URL(links.x).searchParams.get('url')).toBe(message.url);
    expect(new URL(links.linkedin).searchParams.get('url')).toBe(message.url);
    expect(links.email).toMatch(/^mailto:\?subject=/);
    for (const link of Object.values(links)) expect(link).not.toContain(' ');
  });

  it('keeps posts within network limits without cutting words', () => {
    expect(shorten('short', 10)).toBe('short');
    const long = 'word '.repeat(100).trim();
    const cut = shorten(long, 50);
    expect(cut.length).toBeLessThanOrEqual(50);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.slice(0, -1).trim().split(' ').every(word => word === 'word')).toBe(true);
    const tweet = new URL(shareLinks({ ...message, text: long }).x).searchParams.get('text')!;
    expect(tweet.length).toBeLessThanOrEqual(240);
  });

  it('composes readable messages for days and hadith', () => {
    const days = composeDaysText({ heading: 'Upcoming', days: [{ label: 'Monday 19 October', detail: '7 Jumada I' }, { label: 'Thursday 22 October', detail: '10 Jumada I' }], invite: 'Join me' });
    expect(days).toContain('Upcoming');
    expect(days).toContain('Monday 19 October');
    expect(days).toContain('10 Jumada I');
    expect(days.trim().endsWith('Join me')).toBe(true);
    const hadith = composeHadithText({ arabic: 'صوم يوم عرفة', meaning: 'Fasting on the day of Arafah', reference: 'Sahih Muslim 1162b', invite: 'Join me' });
    expect(hadith.indexOf('صوم')).toBeLessThan(hadith.indexOf('Fasting'));
    expect(hadith).toContain('Sahih Muslim 1162b');
  });

  it('wraps image text by measured width', () => {
    const measure = { measureText: (text: string) => ({ width: text.length * 10 }) as TextMetrics };
    expect(wrap(measure, 'one two three four', 90)).toEqual(['one two', 'three', 'four']);
    expect(wrap(measure, 'first\nsecond', 1000)).toEqual(['first', 'second']);
  });
});
