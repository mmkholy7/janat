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

export type ShareImageTag = { kind: 'weekly' | 'white'; label: string };
export type ShareImageDay = { weekday: string; day: string; month: string; detail: string; tags: ShareImageTag[]; highlight?: boolean };
type Common = { dir: 'ltr' | 'rtl'; italic: boolean; body: string; display: string; site: string; invite: string };
export type ShareImageInput = Common & (
  | { kind: 'days'; heading: string; days: ShareImageDay[] }
  | { kind: 'hadith'; title: string; arabic: string; meaning?: string; reference: string }
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

function daysLayout(ctx: Ctx, input: Extract<ShareImageInput, { kind: 'days' }>) {
  const rtl = input.dir === 'rtl';
  const start = rtl ? W - PAD : PAD;
  ctx.direction = input.dir; ctx.textAlign = rtl ? 'right' : 'left'; ctx.textBaseline = 'alphabetic';
  let size = 76, lines: string[];
  for (;;) { ctx.font = `600 ${size}px ${input.display}`; lines = wrap(ctx, input.heading, W - PAD * 2 - 20); if (lines.length <= 2 || size <= 46) break; size -= 4; }
  const lineHeight = size * (rtl ? 1.45 : 1.16);
  let y = 300 + size * .2;
  ctx.fillStyle = INK; lines.forEach(line => { ctx.fillText(line, start, y); y += lineHeight; });
  y = y - lineHeight + 40;
  ctx.fillStyle = GOLD; ctx.fillRect(rtl ? start - 110 : start, y, 110, 4);

  const top = y + 52, bottom = H - 228, gap = 20, count = input.days.length;
  const rowHeight = Math.min(156, (bottom - top - gap * (count - 1)) / count);
  const cardX = PAD, cardWidth = W - PAD * 2;
  input.days.forEach((day, index) => {
    const rowTop = top + index * (rowHeight + gap);
    roundRect(ctx, cardX, rowTop, cardWidth, rowHeight, 30);
    ctx.fillStyle = day.highlight ? 'rgba(226,189,110,.12)' : 'rgba(255,255,255,.05)'; ctx.fill();
    ctx.strokeStyle = day.highlight ? 'rgba(226,189,110,.5)' : 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.stroke();

    const tile = rowHeight - 36, tileX = rtl ? cardX + cardWidth - 18 - tile : cardX + 18, tileY = rowTop + 18;
    const gold = ctx.createLinearGradient(tileX, tileY, tileX + tile, tileY + tile);
    gold.addColorStop(0, '#f3d995'); gold.addColorStop(1, '#c99a46');
    roundRect(ctx, tileX, tileY, tile, tile, 24); ctx.fillStyle = gold; ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = NIGHT;
    fit(ctx, day.day, value => `650 ${value}px ${input.display}`, Math.round(tile * .46), tile - 20);
    ctx.fillText(day.day, tileX + tile / 2, tileY + tile * .58);
    fit(ctx, day.month, value => `700 ${value}px ${input.body}`, Math.round(tile * .16), tile - 18);
    ctx.fillText(day.month, tileX + tile / 2, tileY + tile * .85);

    ctx.font = `600 22px ${input.body}`;
    const pills = day.tags.map(tag => ({ ...tag, width: Math.min(300, ctx.measureText(tag.label).width + 36) }));
    const pillsWidth = Math.max(0, ...pills.map(pill => pill.width));
    const pillHeight = 40, pillGap = 10;
    let pillY = rowTop + (rowHeight - (pills.length * pillHeight + (pills.length - 1) * pillGap)) / 2;
    pills.forEach(pill => {
      const pillX = rtl ? cardX + 24 : cardX + cardWidth - 24 - pill.width;
      roundRect(ctx, pillX, pillY, pill.width, pillHeight, pillHeight / 2);
      ctx.fillStyle = pill.kind === 'white' ? 'rgba(183,192,216,.16)' : 'rgba(226,189,110,.16)'; ctx.fill();
      ctx.fillStyle = pill.kind === 'white' ? '#dfe4f3' : GOLD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      fit(ctx, pill.label, value => `600 ${value}px ${input.body}`, 22, pill.width - 28);
      ctx.fillText(pill.label, pillX + pill.width / 2, pillY + pillHeight / 2 + 1);
      ctx.textBaseline = 'alphabetic'; pillY += pillHeight + pillGap;
    });

    const textX = rtl ? tileX - 28 : tileX + tile + 28;
    const textWidth = cardWidth - 18 - tile - 28 - (pillsWidth ? pillsWidth + 44 : 24);
    ctx.textAlign = rtl ? 'right' : 'left'; ctx.fillStyle = INK;
    fit(ctx, day.weekday, value => `600 ${value}px ${input.display}`, 40, textWidth);
    ctx.fillText(day.weekday, textX, rowTop + rowHeight * .46);
    ctx.fillStyle = MUTED;
    fit(ctx, day.detail, value => `500 ${value}px ${input.body}`, 26, textWidth);
    ctx.fillText(day.detail, textX, rowTop + rowHeight * .76);
  });
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

async function loadFonts(fonts: [string, string][]) {
  if (!document.fonts?.load) return;
  const timeout = new Promise(resolve => setTimeout(resolve, 2500));
  await Promise.race([Promise.allSettled(fonts.map(([font, sample]) => document.fonts.load(font, sample))), timeout]);
}

export async function renderShareImage(input: ShareImageInput): Promise<Blob> {
  const sample = input.kind === 'days'
    ? [input.heading, input.invite, ...input.days.flatMap(day => [day.weekday, day.day, day.month, day.detail, ...day.tags.map(tag => tag.label)])].join(' ')
    : [input.title, input.invite, input.meaning ?? '', input.reference].join(' ');
  await loadFonts([
    [`650 60px ${LATIN_DISPLAY}`, `janat.${input.site}`],
    [`500 42px ${ARABIC}`, `جنّات ${input.kind === 'hadith' ? input.arabic : ''}`],
    [`400 34px ${ARABIC}`, SALAWAT],
    [`600 40px ${input.display}`, sample],
    [`500 26px ${input.body}`, sample],
    ...(input.kind === 'hadith' && input.italic ? [[`italic 400 34px ${input.display}`, sample] as [string, string]] : []),
  ]);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  const rtl = input.dir === 'rtl';
  backdrop(ctx, rtl);
  brand(ctx, rtl);
  if (input.kind === 'days') daysLayout(ctx, input); else hadithLayout(ctx, input);
  footer(ctx, input);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed')), 'image/jpeg', .9));
}
