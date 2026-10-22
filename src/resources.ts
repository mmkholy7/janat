import type { Messages } from './i18n';

export type ResourceCategory = 'quran' | 'hadith' | 'learning';
type Resource = {
  name: string;
  url: string;
  category: ResourceCategory;
  description: keyof Messages;
};

export const resources: Resource[] = [
  { name: 'Quran.com', url: 'https://quran.com/', category: 'quran', description: 'resQuran' },
  { name: 'Sunnah.com', url: 'https://sunnah.com/', category: 'hadith', description: 'resSunnah' },
  { name: 'Dorar · الدرر السنية', url: 'https://dorar.net/hadith', category: 'hadith', description: 'resDorar' },
  { name: 'SeekersGuidance', url: 'https://seekersguidance.org/', category: 'learning', description: 'resSeekers' },
  { name: 'Islamweb · إسلام ويب', url: 'https://www.islamweb.net/', category: 'learning', description: 'resIslamweb' },
  { name: 'IslamHouse', url: 'https://islamhouse.com/', category: 'learning', description: 'resIslamhouse' },
];
