import { describe, expect, it } from 'vitest';
import { clampHeight, defaultWidget, readWidgetQuery, WIDGET_HEIGHT, widgetSnippet, widgetSrc } from './widget-snippet';

describe('widget snippet', () => {
  it('leaves default options out of the address', () => {
    expect(widgetSrc(defaultWidget())).toBe('https://janat.uably.com/embed/');
    expect(widgetSrc({ lang: 'ur', view: 'list', theme: 'dark' })).toBe('https://janat.uably.com/embed/?lang=ur&view=list&theme=dark');
    expect(widgetSrc({ lang: 'auto', view: 'month', theme: 'light' }, '')).toBe('/embed/?theme=light');
  });

  it('reads the address back and ignores anything unknown', () => {
    expect(readWidgetQuery('?lang=ar&view=list&theme=dark')).toEqual({ lang: 'ar', view: 'list', theme: 'dark' });
    expect(readWidgetQuery('?lang=xx&view=grid&theme=pink')).toEqual({ lang: 'auto', view: 'month', theme: 'auto' });
    expect(readWidgetQuery('')).toEqual({ lang: 'auto', view: 'month', theme: 'auto' });
  });

  it('keeps the height within limits', () => {
    expect(clampHeight(10)).toBe(WIDGET_HEIGHT.min);
    expect(clampHeight(5000)).toBe(WIDGET_HEIGHT.max);
    expect(clampHeight(612.4)).toBe(612);
    expect(clampHeight(Number.NaN)).toBe(560);
  });

  it('builds an iframe with a visible link back to the fasting dates', () => {
    const code = widgetSnippet({ ...defaultWidget('ur'), size: 'sidebar', height: 2000 }, { language: 'ur', title: 'سنت "روزوں" کا کیلنڈر' });
    const [iframe, credit] = code.split('\n');
    expect(iframe).toMatch(/^<iframe src="https:\/\/janat\.uably\.com\/embed\/\?lang=ur" /);
    expect(iframe).toContain('title="سنت &quot;روزوں&quot; کا کیلنڈر · Janat"');
    expect(iframe).toContain('loading="lazy"');
    expect(iframe).toContain(`max-width:320px;height:${WIDGET_HEIGHT.max}px`);
    expect(credit).toContain('<a href="https://janat.uably.com/ur/fasting/">');
    expect(credit).toContain('max-width:320px');
  });

  it('lets a full-width widget fill its container', () => {
    const code = widgetSnippet({ ...defaultWidget(), size: 'full' }, { language: 'en', title: 'Sunnah fasting calendar' });
    expect(code).not.toContain('max-width');
    expect(code).toContain('href="https://janat.uably.com/fasting/"');
  });
});
