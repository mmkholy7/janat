// Renders the 1080×1350 (4:5) image attached to shared posts, in the Midnight & gold style.
const W = 1080;
const H = 1350;
const PAD = 84;
const NIGHT = '#0b1430';
const GOLD = '#e2bd6e';
const INK = '#f6efdf';
const MUTED = '#b7c0d8';
const ARABIC = "'Noto Naskh Arabic', serif";
const LATIN_DISPLAY = "'Fraunces', Georgia, serif";

export type ShareImageFast = 'weekly' | 'white' | 'both';
export type ShareImageTag = { kind: 'weekly' | 'white'; label: string };
/** One date in the week strip or month grid. */
export type ShareImageCell = { day: string; hijri: string; weekday?: string; month?: string; fast?: ShareImageFast; past?: boolean; today?: boolean };
export type ShareImageLegend = { weekly: string; white: string };
type Common = { dir: 'ltr' | 'rtl'; italic: boolean; body: string; display: string; site: string; invite: string };
export type ShareImageQuote = { arabic: string; meaning?: string; reference: string };
export type ShareImageInput = Common & (
  | { kind: 'day'; heading: string; weekday: string; day: string; month: string; detail: string; tags: ShareImageTag[]; fast: ShareImageFast; hadith?: ShareImageQuote }
  | { kind: 'week'; heading: string; subheading: string; cells: ShareImageCell[]; legend: ShareImageLegend; hadith?: ShareImageQuote }
  | { kind: 'month'; heading: string; subheading: string; weekdays: string[]; cells: (ShareImageCell | null)[]; legend: ShareImageLegend; hadith?: ShareImageQuote }
  | ({ kind: 'hadith'; title: string } & ShareImageQuote)
);
type Ctx = CanvasRenderingContext2D;

function random(seed: number) {
  return () => {
    seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Greedy word wrap; explicit newlines start new lines. */
export function wrap(ctx: Pick<Ctx, 'measureText'>, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

/** Shrinks a font size until the text fits on one line; leaves ctx.font set. */
function fit(ctx: Ctx, text: string, font: (size: number) => string, size: number, width: number) {
  const min = Math.round(size * .55);
  ctx.font = font(size);
  while (size > min && ctx.measureText(text).width > width) { size -= 1; ctx.font = font(size); }
  return size;
}

const SALAWAT = '\uFDFA';
/** Draws a centred line with ﷺ set in Naskh, because Nastaliq draws ﷺ about two lines tall. */
function fillCentered(ctx: Ctx, line: string, x: number, y: number, font: string, size: number) {
  ctx.font = font;
  if (!line.includes(SALAWAT)) { ctx.fillText(line, x, y); return; }
  const parts = line.split(SALAWAT).flatMap((text, index) => [...(index ? [{ text: SALAWAT, font: `400 ${size}px ${ARABIC}` }] : []), { text, font }]).filter(part => part.text);
  const widths = parts.map(part => { ctx.font = part.font; return ctx.measureText(part.text).width; });
  const total = widths.reduce((sum, width) => sum + width, 0), rtl = ctx.direction === 'rtl', align = ctx.textAlign;
  ctx.textAlign = rtl ? 'right' : 'left';
  let cursor = rtl ? x + total / 2 : x - total / 2;
  parts.forEach((part, index) => { ctx.font = part.font; ctx.fillText(part.text, cursor, y); cursor += rtl ? -widths[index] : widths[index]; });
  ctx.textAlign = align; ctx.font = font;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glow(ctx: Ctx, x: number, y: number, radius: number, color: string) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color); gradient.addColorStop(1, 'rgba(11,20,48,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
}

function sparkle(ctx: Ctx, x: number, y: number, size: number) {
  ctx.save(); ctx.fillStyle = '#f4dc9c'; ctx.shadowColor = 'rgba(226,189,110,.8)'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x, y, x + size, y); ctx.quadraticCurveTo(x, y, x, y + size);
  ctx.quadraticCurveTo(x, y, x - size, y); ctx.quadraticCurveTo(x, y, x, y - size);
  ctx.fill(); ctx.restore();
}

function crescent(ctx: Ctx, x: number, y: number, radius: number, mirrored: boolean) {
  const size = Math.ceil(radius * 2.4);
  const center = size / 2;
  const layer = document.createElement('canvas'); layer.width = layer.height = size;
  const paint = layer.getContext('2d')!;
  const gradient = paint.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#f6e2b0'); gradient.addColorStop(1, '#c99a46');
  paint.fillStyle = gradient; paint.beginPath(); paint.arc(center, center, radius, 0, Math.PI * 2); paint.fill();
  paint.globalCompositeOperation = 'destination-out';
  paint.beginPath(); paint.arc(center + radius * .45 * (mirrored ? -1 : 1), center - radius * .32, radius * .84, 0, Math.PI * 2); paint.fill();
  ctx.save(); ctx.shadowColor = 'rgba(226,189,110,.55)'; ctx.shadowBlur = 48; ctx.drawImage(layer, x - center, y - center); ctx.restore();
  sparkle(ctx, x + radius * 1.15 * (mirrored ? 1 : -1), y + radius * .9, 11);
}

function backdrop(ctx: Ctx, rtl: boolean) {
  const base = ctx.createLinearGradient(0, 0, W * .35, H);
  base.addColorStop(0, '#15244d'); base.addColorStop(.55, '#0b1531'); base.addColorStop(1, '#060b1c');
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  glow(ctx, rtl ? W * .16 : W * .84, 150, 560, 'rgba(226,189,110,.24)');
  glow(ctx, rtl ? W * .9 : W * .1, H * .95, 640, 'rgba(79,95,156,.34)');
  const next = random(1447);
  for (let index = 0; index < 160; index++) {
    const x = next() * W, y = next() * H, r = next() * 1.5 + .4;
    ctx.globalAlpha = .18 + next() * .6; ctx.fillStyle = next() > .86 ? GOLD : '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  crescent(ctx, rtl ? 156 : W - 156, 150, 58, rtl);
  ctx.strokeStyle = 'rgba(226,189,110,.3)'; ctx.lineWidth = 2;
  roundRect(ctx, 34, 34, W - 68, H - 68, 42); ctx.stroke();
}

function brand(ctx: Ctx, rtl: boolean) {
  const baseline = 168, gap = 22;
  const latin = `650 60px ${LATIN_DISPLAY}`, arabic = `500 42px ${ARABIC}`;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.direction = 'ltr';
  ctx.font = latin; const word = ctx.measureText('janat').width, dot = ctx.measureText('.').width;
  ctx.font = arabic; const arabicWidth = ctx.measureText('جنّات').width;
  const x = rtl ? W - PAD - word - dot : PAD;
  ctx.font = latin; ctx.fillStyle = INK; ctx.fillText('janat', x, baseline);
  ctx.fillStyle = GOLD; ctx.fillText('.', x + word, baseline);
  const rule = rtl ? x - gap : x + word + dot + gap;
  ctx.fillStyle = 'rgba(255,255,255,.24)'; ctx.fillRect(rule - 1, baseline - 46, 2, 54);
  ctx.font = arabic; ctx.fillStyle = GOLD; ctx.fillText('جنّات', rtl ? rule - gap - arabicWidth : rule + gap, baseline - 4);
}

function footer(ctx: Ctx, input: ShareImageInput) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.direction = input.dir; ctx.fillStyle = MUTED;
  fit(ctx, input.invite, size => `500 ${size}px ${input.body}`, 28, W - PAD * 2);
  ctx.fillText(input.invite, W / 2, H - 152);
  ctx.direction = 'ltr'; ctx.fillStyle = GOLD;
  fit(ctx, input.site, size => `600 ${size}px ${LATIN_DISPLAY}`, 36, W - PAD * 2);
  ctx.fillText(input.site, W / 2, H - 96);
}

function ornament(ctx: Ctx, x: number, y: number) {
  ctx.fillStyle = 'rgba(226,189,110,.55)';
  ctx.fillRect(x - 86, y - 1, 64, 2); ctx.fillRect(x + 22, y - 1, 64, 2);
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = GOLD; ctx.fillRect(-7, -7, 14, 14); ctx.restore();
}

const QUOTE = { arabic: 42, meaning: 30, reference: 26, ornament: 34, gap: 16 };
type QuoteLayout = ReturnType<typeof measureQuote>;

/** Wraps a hadith for the days image, shrinking it until it fits the height left under the days. */
function measureQuote(ctx: Ctx, input: Common, quote: ShareImageQuote, width: number, maxHeight: number) {
  // Nastaliq (Urdu) cascades well above and below its line, so it needs more room.
  const nastaliq = /nastaliq/i.test(input.display);
  const meaningLineHeight = nastaliq ? 2.2 : input.dir === 'rtl' ? 1.85 : 1.5, referenceGap = nastaliq ? 34 : QUOTE.gap;
  const measure = (scale: number) => {
    const arabicSize = Math.round(QUOTE.arabic * scale), meaningSize = Math.round(QUOTE.meaning * scale);
    ctx.direction = 'rtl'; ctx.font = `500 ${arabicSize}px ${ARABIC}`;
    const arabic = wrap(ctx, quote.arabic, width);
    ctx.direction = input.dir; const meaningFont = `${input.italic ? 'italic ' : ''}400 ${meaningSize}px ${input.display}`; ctx.font = meaningFont;
    const meaning = quote.meaning ? wrap(ctx, quote.meaning, width) : [];
    const height = QUOTE.ornament + arabic.length * arabicSize * 1.75 + (meaning.length ? QUOTE.gap + meaning.length * meaningSize * meaningLineHeight : 0) + referenceGap + QUOTE.reference;
    return { arabicSize, meaningSize, meaningFont, meaningLineHeight, referenceGap, arabic, meaning, height, scale };
  };
  let layout = measure(1);
  for (let scale = .94; layout.height > maxHeight && scale > .5; scale *= .94) layout = measure(scale);
  return layout;
}

function drawQuote(ctx: Ctx, input: Common, quote: ShareImageQuote, layout: QuoteLayout, top: number, width: number) {
  ornament(ctx, W / 2, top + 8);
  let y = top + QUOTE.ornament;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.direction = 'rtl'; ctx.font = `500 ${layout.arabicSize}px ${ARABIC}`; ctx.fillStyle = '#f4e2b6';
  layout.arabic.forEach(line => { ctx.fillText(line, W / 2, y + layout.arabicSize * .875); y += layout.arabicSize * 1.75; });
  if (layout.meaning.length) {
    y += QUOTE.gap; ctx.direction = input.dir; ctx.fillStyle = INK;
    const step = layout.meaningSize * layout.meaningLineHeight;
    layout.meaning.forEach(line => { fillCentered(ctx, line, W / 2, y + step / 2, layout.meaningFont, layout.meaningSize); y += step; });
  }
  y += layout.referenceGap; ctx.direction = input.dir; ctx.fillStyle = GOLD;
  fit(ctx, quote.reference, size => `600 ${size}px ${input.body}`, QUOTE.reference, width);
  ctx.fillText(quote.reference, W / 2, y + QUOTE.reference / 2);
  ctx.textBaseline = 'alphabetic';
}

const BOTTOM = H - 212;
type Glyph = 'weekly' | 'white';
const glyphOf = (fast: ShareImageFast): Glyph => fast === 'weekly' ? 'weekly' : 'white';

/** Gold for Monday & Thursday, moonlit silver for the white days (13–15). */
function fastFill(ctx: Ctx, x: number, y: number, w: number, h: number, fast: ShareImageFast | Glyph) {
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  if (fast === 'weekly') { gradient.addColorStop(0, '#f3d995'); gradient.addColorStop(1, '#c99a46'); }
  else { gradient.addColorStop(0, '#f8f9ff'); gradient.addColorStop(1, '#a7b2dc'); }
  return gradient;
}
const fastShadow = (fast: ShareImageFast) => fast === 'weekly' ? 'rgba(226,189,110,.45)' : 'rgba(196,207,248,.42)';

function moonGlyph(ctx: Ctx, x: number, y: number, r: number, color: string) {
  const size = Math.ceil(r * 2 + 4), center = size / 2;
  const layer = document.createElement('canvas'); layer.width = layer.height = size;
  const paint = layer.getContext('2d')!;
  paint.fillStyle = color; paint.beginPath(); paint.arc(center, center, r, 0, Math.PI * 2); paint.fill();
  paint.globalCompositeOperation = 'destination-out';
  paint.beginPath(); paint.arc(center + r * .5, center - r * .32, r * .8, 0, Math.PI * 2); paint.fill();
  ctx.drawImage(layer, x - center, y - center);
}

function sunGlyph(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, r * .22); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, r * .46, 0, Math.PI * 2); ctx.fill();
  for (let index = 0; index < 8; index++) {
    const angle = index * Math.PI / 4;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(angle) * r * .72, y + Math.sin(angle) * r * .72); ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r); ctx.stroke();
  }
  ctx.restore();
}
const glyph = (ctx: Ctx, kind: Glyph, x: number, y: number, r: number, color: string) => kind === 'weekly' ? sunGlyph(ctx, x, y, r, color) : moonGlyph(ctx, x, y, r, color);

/** A glyph next to a label, centred on x; the glyph leads in either direction. */
function glyphLabel(ctx: Ctx, input: Common, kind: Glyph, label: string, x: number, y: number, r: number, color: string) {
  const rtl = input.dir === 'rtl', width = ctx.measureText(label).width, total = r * 2 + 8 + width, start = x - total / 2;
  glyph(ctx, kind, rtl ? start + total - r : start + r, y, r, color);
  ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label, rtl ? start : start + r * 2 + 8, y + 1);
  ctx.textBaseline = 'alphabetic';
}

/** Centred heading with an optional gold line under it; returns where the content starts. */
function header(ctx: Ctx, input: Common, heading: string, subheading?: string) {
  const rtl = input.dir === 'rtl', nastaliq = /nastaliq/i.test(input.display);
  ctx.direction = input.dir; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  let size = 64, lines: string[];
  for (;;) { ctx.font = `600 ${size}px ${input.display}`; lines = wrap(ctx, heading, W - PAD * 2 - 40); if (lines.length === 1 || size <= 48) break; size -= 4; }
  const lineHeight = size * (nastaliq ? 1.75 : rtl ? 1.45 : 1.16);
  let y = 296;
  ctx.fillStyle = INK; lines.forEach((line, index) => { if (index) y += lineHeight; ctx.fillText(line, W / 2, y); });
  if (subheading) {
    y += nastaliq ? 66 : 56; ctx.fillStyle = GOLD;
    fit(ctx, subheading, value => `600 ${value}px ${input.body}`, 30, W - PAD * 2 - 40);
    ctx.fillText(subheading, W / 2, y);
  }
  return y + (nastaliq ? 58 : 48);
}

/** Draws the period block, then centres the hadith in the space left above the footer. */
function withQuote(ctx: Ctx, input: Common, top: number, height: number, draw: (y: number) => void, hadith?: ShareImageQuote) {
  draw(top);
  if (!hadith) return;
  const width = W - PAD * 2 - 40, start = top + height + 44;
  const quote = measureQuote(ctx, input, hadith, width, BOTTOM - start);
  drawQuote(ctx, input, hadith, quote, start + Math.max(0, (BOTTOM - start - quote.height) / 2), width);
}

function legend(ctx: Ctx, input: Common, labels: ShareImageLegend, y: number) {
  const rtl = input.dir === 'rtl', swatch = 26, gap = 12, between = 44;
  let size = 24, items: { kind: Glyph; label: string; width: number }[], total: number;
  for (;;) {
    ctx.font = `600 ${size}px ${input.body}`;
    items = (['weekly', 'white'] as const).map(kind => ({ kind, label: labels[kind], width: ctx.measureText(labels[kind]).width }));
    total = items.reduce((sum, item) => sum + swatch + gap + item.width, between);
    if (total <= W - PAD * 2 || size <= 16) break; size -= 1;
  }
  let x = rtl ? W / 2 + total / 2 : W / 2 - total / 2;
  ctx.direction = input.dir; ctx.textBaseline = 'middle';
  items.forEach(item => {
    const swatchX = rtl ? x - swatch : x;
    roundRect(ctx, swatchX, y - swatch / 2, swatch, swatch, 8); ctx.fillStyle = fastFill(ctx, swatchX, y - swatch / 2, swatch, swatch, item.kind); ctx.fill();
    ctx.fillStyle = INK; ctx.textAlign = rtl ? 'right' : 'left';
    ctx.fillText(item.label, rtl ? swatchX - gap : swatchX + swatch + gap, y + 1);
    x += (rtl ? -1 : 1) * (swatch + gap + item.width + between);
  });
  ctx.textBaseline = 'alphabetic';
}

function tile(ctx: Ctx, cell: ShareImageCell, x: number, y: number, w: number, h: number, radius: number) {
  roundRect(ctx, x, y, w, h, radius);
  if (cell.fast) {
    ctx.save(); ctx.shadowColor = fastShadow(cell.fast); ctx.shadowBlur = 24;
    ctx.fillStyle = fastFill(ctx, x, y, w, h, cell.fast); ctx.fill(); ctx.restore();
    if (cell.fast === 'both') { roundRect(ctx, x + 2.5, y + 2.5, w - 5, h - 5, radius - 2.5); ctx.strokeStyle = '#c99a46'; ctx.lineWidth = 5; ctx.stroke(); }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 2; ctx.stroke();
  }
}

function todayRing(ctx: Ctx, x: number, y: number, w: number, h: number, radius: number) {
  roundRect(ctx, x - 6, y - 6, w + 12, h + 12, radius + 6); ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();
}

function pill(ctx: Ctx, input: Common, tag: ShareImageTag, x: number, y: number, width: number, height: number) {
  const color = tag.kind === 'white' ? '#e3e8f8' : GOLD;
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = tag.kind === 'white' ? 'rgba(196,207,248,.16)' : 'rgba(226,189,110,.16)'; ctx.fill();
  ctx.direction = input.dir;
  fit(ctx, tag.label, value => `600 ${value}px ${input.body}`, Math.round(height * .52), width - 36 - height * .4 - 8);
  glyphLabel(ctx, input, tag.kind, tag.label, x + width / 2, y + height / 2, height * .2, color);
}

function dayLayout(ctx: Ctx, input: Extract<ShareImageInput, { kind: 'day' }>) {
  const rtl = input.dir === 'rtl', height = 300;
  withQuote(ctx, input, header(ctx, input, input.heading), height, y => {
    const cardX = PAD, cardWidth = W - PAD * 2;
    roundRect(ctx, cardX, y, cardWidth, height, 38);
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fill();
    ctx.strokeStyle = input.fast === 'weekly' ? 'rgba(226,189,110,.55)' : 'rgba(214,221,248,.5)'; ctx.lineWidth = 2; ctx.stroke();

    const size = height - 52, tileX = rtl ? cardX + cardWidth - 26 - size : cardX + 26, tileY = y + 26;
    tile(ctx, { day: input.day, hijri: '', fast: input.fast }, tileX, tileY, size, size, 32);
    ctx.direction = input.dir; ctx.textAlign = 'center'; ctx.fillStyle = NIGHT;
    glyph(ctx, glyphOf(input.fast), tileX + size / 2, tileY + 40, 15, 'rgba(11,20,48,.62)');
    fit(ctx, input.day, value => `650 ${value}px ${input.display}`, Math.round(size * .44), size - 30);
    ctx.fillText(input.day, tileX + size / 2, tileY + size * .63);
    fit(ctx, input.month, value => `700 ${value}px ${input.body}`, Math.round(size * .12), size - 36);
    ctx.fillText(input.month, tileX + size / 2, tileY + size * .86);

    const textX = rtl ? tileX - 40 : tileX + size + 40, textWidth = cardWidth - 26 - size - 40 - 36;
    ctx.textAlign = rtl ? 'right' : 'left'; ctx.fillStyle = INK;
    fit(ctx, input.weekday, value => `600 ${value}px ${input.display}`, 66, textWidth);
    const weekdayDrop = ctx.measureText(input.weekday).actualBoundingBoxDescent, weekdayY = y + 110 - Math.max(0, weekdayDrop - 14) / 2;
    ctx.fillText(input.weekday, textX, weekdayY);
    ctx.fillStyle = MUTED;
    fit(ctx, input.detail, value => `500 ${value}px ${input.body}`, 32, textWidth);
    // Nastaliq weekdays descend far below the baseline, so keep the Hijri line clear of them.
    ctx.fillText(input.detail, textX, Math.max(y + 164, weekdayY + weekdayDrop + 12 + ctx.measureText(input.detail).actualBoundingBoxAscent));

    const pillHeight = 50, pillGap = 12, limit = (textWidth - pillGap * (input.tags.length - 1)) / input.tags.length;
    ctx.font = `600 26px ${input.body}`;
    let pillX = textX;
    input.tags.forEach(tag => {
      const width = Math.min(limit, ctx.measureText(tag.label).width + pillHeight * .4 + 8 + 40);
      pill(ctx, input, tag, rtl ? pillX - width : pillX, y + 204, width, pillHeight);
      pillX += (rtl ? -1 : 1) * (width + pillGap);
      ctx.font = `600 26px ${input.body}`;
    });
  }, input.hadith);
}

function weekLayout(ctx: Ctx, input: Extract<ShareImageInput, { kind: 'week' }>) {
  const rtl = input.dir === 'rtl', gap = 12, width = (W - PAD * 2 - gap * 6) / 7, height = 222;
  withQuote(ctx, input, header(ctx, input, input.heading, input.subheading), height + 70, y => {
    input.cells.forEach((cell, index) => {
      const x = rtl ? W - PAD - (index + 1) * width - index * gap : PAD + index * (width + gap), center = x + width / 2;
      ctx.save(); if (cell.past) ctx.globalAlpha = .4;
      tile(ctx, cell, x, y, width, height, 24);
      const ink = cell.fast ? NIGHT : INK, soft = cell.fast ? 'rgba(11,20,48,.66)' : MUTED;
      ctx.direction = input.dir; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = soft; fit(ctx, cell.weekday ?? '', value => `700 ${value}px ${input.body}`, 22, width - 16);
      ctx.fillText(cell.weekday ?? '', center, y + 42);
      ctx.fillStyle = ink; fit(ctx, cell.day, value => `650 ${value}px ${input.display}`, 56, width - 16);
      ctx.fillText(cell.day, center, y + 112);
      ctx.fillStyle = soft; fit(ctx, cell.month ?? '', value => `600 ${value}px ${input.body}`, 21, width - 16);
      ctx.fillText(cell.month ?? '', center, y + 144);
      ctx.fillStyle = cell.fast ? 'rgba(11,20,48,.16)' : 'rgba(255,255,255,.12)'; ctx.fillRect(x + 18, y + 166, width - 36, 2);
      ctx.font = `700 22px ${input.body}`;
      if (cell.fast) glyphLabel(ctx, input, glyphOf(cell.fast), cell.hijri, center, y + 194, 9, soft);
      else { ctx.fillStyle = MUTED; ctx.textBaseline = 'middle'; ctx.fillText(cell.hijri, center, y + 195); ctx.textBaseline = 'alphabetic'; }
      ctx.restore();
      if (cell.today) todayRing(ctx, x, y, width, height, 24);
    });
    legend(ctx, input, input.legend, y + height + 46);
  }, input.hadith);
}

function monthLayout(ctx: Ctx, input: Extract<ShareImageInput, { kind: 'month' }>) {
  const rtl = input.dir === 'rtl', rows = Math.ceil(input.cells.length / 7), gap = 8, head = 34;
  const width = (W - PAD * 2 - gap * 6) / 7, height = rows > 5 ? 54 : 60, grid = head + rows * height + (rows - 1) * gap;
  const column = (index: number) => rtl ? W - PAD - (index + 1) * width - index * gap : PAD + index * (width + gap);
  withQuote(ctx, input, header(ctx, input, input.heading, input.subheading), grid + 62, y => {
    ctx.direction = input.dir; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = MUTED;
    input.weekdays.forEach((label, index) => {
      fit(ctx, label, value => `700 ${value}px ${input.body}`, 20, width - 8);
      ctx.fillText(label, column(index) + width / 2, y + 20);
    });
    input.cells.forEach((cell, index) => {
      if (!cell) return;
      const x = column(index % 7), top = y + head + Math.floor(index / 7) * (height + gap);
      ctx.save(); if (cell.past) ctx.globalAlpha = .38;
      tile(ctx, cell, x, top, width, height, 14);
      ctx.direction = input.dir; ctx.textBaseline = 'alphabetic';
      ctx.textAlign = rtl ? 'right' : 'left'; ctx.fillStyle = cell.fast ? NIGHT : INK; ctx.font = `650 26px ${input.display}`;
      ctx.fillText(cell.day, rtl ? x + width - 12 : x + 12, top + 31);
      ctx.textAlign = rtl ? 'left' : 'right'; ctx.fillStyle = cell.fast ? 'rgba(11,20,48,.62)' : MUTED; ctx.font = `600 17px ${input.body}`;
      ctx.fillText(cell.hijri, rtl ? x + 10 : x + width - 10, top + height - 10);
      if (cell.fast) glyph(ctx, glyphOf(cell.fast), rtl ? x + width - 19 : x + 19, top + height - 15, 7, 'rgba(11,20,48,.6)');
      ctx.restore();
      if (cell.today) todayRing(ctx, x, top, width, height, 14);
    });
    legend(ctx, input, input.legend, y + grid + 40);
  }, input.hadith);
}

function hadithLayout(ctx: Ctx, input: Extract<ShareImageInput, { kind: 'hadith' }>) {
  const width = W - PAD * 2 - 40;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.direction = input.dir; ctx.fillStyle = GOLD;
  fit(ctx, input.title, size => `600 ${size}px ${input.body}`, 32, width);
  ctx.fillText(input.title, W / 2, 300);
  ornament(ctx, W / 2, 344);

  const top = 392, bottom = H - 236, meaningLineHeight = input.dir === 'rtl' ? 1.85 : 1.5;
  const measure = (scale: number) => {
    const arabicSize = (input.meaning ? 52 : 64) * scale, meaningSize = 34 * scale, gap = 44 * scale;
    ctx.direction = 'rtl'; ctx.font = `500 ${arabicSize}px ${ARABIC}`;
    const arabic = wrap(ctx, input.arabic, width);
    ctx.direction = input.dir; const meaningFont = `${input.italic ? 'italic ' : ''}400 ${meaningSize}px ${input.display}`; ctx.font = meaningFont;
    const meaning = input.meaning ? wrap(ctx, input.meaning, width) : [];
    const height = arabic.length * arabicSize * 1.9 + (meaning.length ? gap * 2 + meaning.length * meaningSize * meaningLineHeight : 0) + 46 + 30;
    return { arabicSize, meaningSize, meaningFont, gap, arabic, meaning, height };
  };
  let layout = measure(1);
  for (let scale = .92; layout.height > bottom - top && scale > .35; scale *= .92) layout = measure(scale);

  ctx.textBaseline = 'middle';
  let y = top + Math.max(0, (bottom - top - layout.height) / 2);
  ctx.direction = 'rtl'; ctx.font = `500 ${layout.arabicSize}px ${ARABIC}`; ctx.fillStyle = '#f4e2b6';
  layout.arabic.forEach(line => { ctx.fillText(line, W / 2, y + layout.arabicSize * .95); y += layout.arabicSize * 1.9; });
  if (layout.meaning.length) {
    y += layout.gap; ctx.fillStyle = 'rgba(226,189,110,.6)'; ctx.fillRect(W / 2 - 30, y - 1, 60, 2); y += layout.gap;
    ctx.direction = input.dir; ctx.font = layout.meaningFont; ctx.fillStyle = INK;
    const step = layout.meaningSize * meaningLineHeight;
    layout.meaning.forEach(line => { fillCentered(ctx, line, W / 2, y + step / 2, layout.meaningFont, layout.meaningSize); y += step; });
  }
  y += 46; ctx.direction = input.dir; ctx.fillStyle = GOLD;
  fit(ctx, input.reference, size => `600 ${size}px ${input.body}`, 28, width);
  ctx.fillText(input.reference, W / 2, y + 15);
  ctx.textBaseline = 'alphabetic';
}

const strings = (value: unknown): string[] => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

async function loadFonts(fonts: [string, string][]) {
  if (!document.fonts?.load) return;
  const timeout = new Promise(resolve => setTimeout(resolve, 2500));
  await Promise.race([Promise.allSettled(fonts.map(([font, sample]) => document.fonts.load(font, sample))), timeout]);
}

export async function renderShareImage(input: ShareImageInput): Promise<Blob> {
  const sample = strings(input).join(' ');
  const quote = input.kind === 'hadith' ? input : input.hadith;
  await loadFonts([
    [`650 60px ${LATIN_DISPLAY}`, `janat.${input.site}`],
    [`500 42px ${ARABIC}`, `جنّات ${quote?.arabic ?? ''}`],
    [`400 34px ${ARABIC}`, SALAWAT],
    [`600 40px ${input.display}`, sample],
    [`500 26px ${input.body}`, sample],
    [`700 22px ${input.body}`, sample],
    ...(quote?.meaning && input.italic ? [[`italic 400 34px ${input.display}`, sample] as [string, string]] : []),
  ]);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  const rtl = input.dir === 'rtl';
  backdrop(ctx, rtl);
  brand(ctx, rtl);
  if (input.kind === 'day') dayLayout(ctx, input);
  else if (input.kind === 'week') weekLayout(ctx, input);
  else if (input.kind === 'month') monthLayout(ctx, input);
  else hadithLayout(ctx, input);
  footer(ctx, input);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed')), 'image/jpeg', .9));
}
