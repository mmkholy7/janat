export const shareNetworks = ['whatsapp', 'telegram', 'facebook', 'x', 'threads', 'linkedin', 'email'] as const;
export type ShareNetwork = typeof shareNetworks[number];

export type ShareMessage = { title: string; text: string; url: string };

/** Shortens text to a character budget (counting code points), breaking at a line or word boundary. */
export function shorten(text: string, limit: number) {
  const characters = Array.from(text);
  if (characters.length <= limit) return text;
  const cut = characters.slice(0, limit - 1).join('');
  const boundary = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf(' '));
  return `${(boundary > limit * .6 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

export type SharedHadith = { arabic: string; meaning?: string; reference: string };

const hadithLines = ({ arabic, meaning, reference }: SharedHadith) => [arabic, ...(meaning ? ['', meaning] : []), `— ${reference}`];

export function composeDaysText({ heading, days, hadith, invite }: { heading: string; days: { label: string; detail: string }[]; hadith?: SharedHadith; invite: string }) {
  return [`🌙 ${heading}`, ...days.map(day => `• ${day.label} — ${day.detail}`), ...(hadith ? ['', ...hadithLines(hadith)] : []), '', invite].join('\n');
}

export function composeHadithText({ invite, ...hadith }: SharedHadith & { invite: string }) {
  return [...hadithLines(hadith), '', invite].join('\n');
}

export function shareLinks({ title, text, url }: ShareMessage): Record<ShareNetwork, string> {
  const encode = encodeURIComponent;
  const withUrl = `${text}\n${url}`;
  return {
    whatsapp: `https://wa.me/?text=${encode(withUrl)}`,
    telegram: `https://t.me/share/url?url=${encode(url)}&text=${encode(text)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`,
    // X counts any link as 23 characters, leaving room for the text within 280.
    x: `https://twitter.com/intent/tweet?text=${encode(shorten(text, 240))}&url=${encode(url)}`,
    threads: `https://www.threads.net/intent/post?text=${encode(`${shorten(text, 440)}\n${url}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encode(url)}`,
    email: `mailto:?subject=${encode(title)}&body=${encode(withUrl)}`,
  };
}
