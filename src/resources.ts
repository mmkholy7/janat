import type { Language } from './i18n';

export type ResourceCategory = 'quran' | 'hadith' | 'learning';
type Resource = {
  name: string;
  url: string;
  category: ResourceCategory;
  description: Record<Language, string>;
};

export const resources: Resource[] = [
  {
    name: 'Quran.com', url: 'https://quran.com/', category: 'quran',
    description: {
      en: 'Read and listen to the Quran, with translations and tafsir.',
      ar: 'قراءة القرآن والاستماع إليه مع ترجمات المعاني والتفسير.',
      fr: 'Lire et écouter le Coran, avec traductions et tafsir.',
      es: 'Lee y escucha el Corán, con traducciones y tafsir.',
    },
  },
  {
    name: 'Sunnah.com', url: 'https://sunnah.com/', category: 'hadith',
    description: {
      en: 'Search major hadith collections in Arabic and English, with references and grading where available.',
      ar: 'البحث في كتب الحديث بالعربية والإنجليزية مع المراجع والأحكام المتاحة.',
      fr: 'Rechercher dans les recueils de hadiths en arabe et en anglais, avec références et degrés disponibles.',
      es: 'Busca en colecciones de hadices en árabe e inglés, con referencias y grados cuando están disponibles.',
    },
  },
  {
    name: 'Dorar · الدرر السنية', url: 'https://dorar.net/hadith', category: 'hadith',
    description: {
      en: 'Arabic hadith research, scholarly grading, and reference encyclopedias.',
      ar: 'البحث في الأحاديث وأحكام المحدثين والموسوعات العلمية.',
      fr: 'Recherche de hadiths en arabe, jugements des spécialistes et encyclopédies.',
      es: 'Investigación de hadices en árabe, valoraciones de especialistas y enciclopedias.',
    },
  },
  {
    name: 'SeekersGuidance', url: 'https://seekersguidance.org/', category: 'learning',
    description: {
      en: 'Free structured courses, articles, and answers from Sunni teachers.',
      ar: 'دورات منظمة مجانية ومقالات وأجوبة يقدمها معلمون من أهل السنة.',
      fr: 'Cours structurés gratuits, articles et réponses de professeurs sunnites.',
      es: 'Cursos estructurados gratuitos, artículos y respuestas de profesores suníes.',
    },
  },
  {
    name: 'Islamweb · إسلام ويب', url: 'https://www.islamweb.net/', category: 'learning',
    description: {
      en: 'Articles, a fatwa archive, and educational material in several languages.',
      ar: 'مقالات ومكتبة فتاوى ومواد تعليمية بعدة لغات.',
      fr: 'Articles, archives de fatwas et ressources éducatives en plusieurs langues.',
      es: 'Artículos, archivo de fetuas y material educativo en varios idiomas.',
    },
  },
  {
    name: 'IslamHouse', url: 'https://islamhouse.com/', category: 'learning',
    description: {
      en: 'Introductory books, audio, and learning material in many languages.',
      ar: 'كتب تعريفية ومواد صوتية وتعليمية بلغات عديدة.',
      fr: 'Livres introductifs, contenus audio et ressources dans de nombreuses langues.',
      es: 'Libros introductorios, audio y material educativo en numerosos idiomas.',
    },
  },
];