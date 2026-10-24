import type { Language } from './languages';

/** The calculation methods offered for suhoor and iftar times, named as in adhan's `CalculationMethod`. */
export const methods = ['MuslimWorldLeague', 'Egyptian', 'Karachi', 'UmmAlQura', 'Dubai', 'MoonsightingCommittee', 'NorthAmerica', 'Kuwait', 'Qatar', 'Singapore', 'Tehran', 'Turkey'] as const;
export type MethodId = typeof methods[number];
export const isMethod = (value: unknown): value is MethodId => typeof value === 'string' && (methods as readonly string[]).includes(value);

export type City = { id: string; lat: number; lng: number; tz: string; method: MethodId; names: Partial<Record<Language, string>> & { en: string } };

const city = (id: string, lat: number, lng: number, tz: string, method: MethodId, names: City['names']): City => ({ id, lat, lng, tz, method, names });

// Names are only listed where a language differs from English. Each city uses the method most local mosques follow.
export const cities: City[] = [
  city('makkah', 21.4225, 39.8262, 'Asia/Riyadh', 'UmmAlQura', { en: 'Makkah', ar: 'مكة المكرمة', ur: 'مکہ مکرمہ', tr: 'Mekke', bn: 'মক্কা', fa: 'مکه', fr: 'La Mecque', es: 'La Meca' }),
  city('madinah', 24.4672, 39.6111, 'Asia/Riyadh', 'UmmAlQura', { en: 'Madinah', ar: 'المدينة المنورة', ur: 'مدینہ منورہ', tr: 'Medine', bn: 'মদিনা', fa: 'مدینه', fr: 'Médine', es: 'Medina' }),
  city('riyadh', 24.7136, 46.6753, 'Asia/Riyadh', 'UmmAlQura', { en: 'Riyadh', ar: 'الرياض', ur: 'ریاض', tr: 'Riyad', bn: 'রিয়াদ', fa: 'ریاض', fr: 'Riyad', es: 'Riad' }),
  city('jeddah', 21.4858, 39.1925, 'Asia/Riyadh', 'UmmAlQura', { en: 'Jeddah', ar: 'جدة', ur: 'جدہ', tr: 'Cidde', bn: 'জেদ্দা', fa: 'جده', fr: 'Djeddah', es: 'Yeda' }),
  city('dubai', 25.2048, 55.2708, 'Asia/Dubai', 'Dubai', { en: 'Dubai', ar: 'دبي', ur: 'دبئی', bn: 'দুবাই', fa: 'دبی', fr: 'Dubaï', es: 'Dubái' }),
  city('doha', 25.2854, 51.531, 'Asia/Qatar', 'Qatar', { en: 'Doha', ar: 'الدوحة', ur: 'دوحہ', bn: 'দোহা', fa: 'دوحه' }),
  city('kuwait', 29.3759, 47.9774, 'Asia/Kuwait', 'Kuwait', { en: 'Kuwait City', ar: 'مدينة الكويت', ur: 'کویت سٹی', id: 'Kota Kuwait', tr: 'Kuveyt', bn: 'কুয়েত সিটি', fa: 'کویت', ms: 'Bandar Kuwait', fr: 'Koweït', es: 'Kuwait' }),
  city('amman', 31.9539, 35.9106, 'Asia/Amman', 'MuslimWorldLeague', { en: 'Amman', ar: 'عمّان', ur: 'عمان', bn: 'আম্মান', fa: 'امان', es: 'Amán' }),
  city('baghdad', 33.3152, 44.3661, 'Asia/Baghdad', 'MuslimWorldLeague', { en: 'Baghdad', ar: 'بغداد', ur: 'بغداد', id: 'Bagdad', tr: 'Bağdat', bn: 'বাগদাদ', fa: 'بغداد', fr: 'Bagdad', es: 'Bagdad' }),
  city('cairo', 30.0444, 31.2357, 'Africa/Cairo', 'Egyptian', { en: 'Cairo', ar: 'القاهرة', ur: 'قاہرہ', id: 'Kairo', tr: 'Kahire', bn: 'কায়রো', fa: 'قاهره', ms: 'Kaherah', fr: 'Le Caire', es: 'El Cairo' }),
  city('istanbul', 41.0082, 28.9784, 'Europe/Istanbul', 'Turkey', { en: 'Istanbul', ar: 'إسطنبول', ur: 'استنبول', tr: 'İstanbul', bn: 'ইস্তাম্বুল', fa: 'استانبول', es: 'Estambul' }),
  city('ankara', 39.9334, 32.8597, 'Europe/Istanbul', 'Turkey', { en: 'Ankara', ar: 'أنقرة', ur: 'انقرہ', bn: 'আঙ্কারা', fa: 'آنکارا' }),
  city('tehran', 35.6892, 51.389, 'Asia/Tehran', 'Tehran', { en: 'Tehran', ar: 'طهران', ur: 'تہران', id: 'Teheran', tr: 'Tahran', bn: 'তেহরান', fa: 'تهران', fr: 'Téhéran', es: 'Teherán' }),
  city('kabul', 34.5553, 69.2075, 'Asia/Kabul', 'Karachi', { en: 'Kabul', ar: 'كابل', ur: 'کابل', tr: 'Kabil', bn: 'কাবুল', fa: 'کابل', fr: 'Kaboul' }),
  city('karachi', 24.8607, 67.0011, 'Asia/Karachi', 'Karachi', { en: 'Karachi', ar: 'كراتشي', ur: 'کراچی', tr: 'Karaçi', bn: 'করাচি', fa: 'کراچی' }),
  city('lahore', 31.5204, 74.3587, 'Asia/Karachi', 'Karachi', { en: 'Lahore', ar: 'لاهور', ur: 'لاہور', tr: 'Lahor', bn: 'লাহোর', fa: 'لاهور' }),
  city('islamabad', 33.6844, 73.0479, 'Asia/Karachi', 'Karachi', { en: 'Islamabad', ar: 'إسلام آباد', ur: 'اسلام آباد', tr: 'İslamabad', bn: 'ইসলামাবাদ', fa: 'اسلام‌آباد' }),
  city('dhaka', 23.8103, 90.4125, 'Asia/Dhaka', 'Karachi', { en: 'Dhaka', ar: 'دكا', ur: 'ڈھاکہ', tr: 'Dakka', bn: 'ঢাকা', fa: 'داکا', fr: 'Dacca', es: 'Daca' }),
  city('chattogram', 22.3569, 91.7832, 'Asia/Dhaka', 'Karachi', { en: 'Chattogram', ar: 'شيتاغونغ', ur: 'چٹاگانگ', tr: 'Çittagong', bn: 'চট্টগ্রাম', fa: 'چیتاگنگ' }),
  city('delhi', 28.6139, 77.209, 'Asia/Kolkata', 'Karachi', { en: 'Delhi', ar: 'دلهي', ur: 'دہلی', bn: 'দিল্লি', fa: 'دهلی' }),
  city('mumbai', 19.076, 72.8777, 'Asia/Kolkata', 'Karachi', { en: 'Mumbai', ar: 'مومباي', ur: 'ممبئی', bn: 'মুম্বই', fa: 'بمبئی', fr: 'Bombay', es: 'Bombay' }),
  city('hyderabad', 17.385, 78.4867, 'Asia/Kolkata', 'Karachi', { en: 'Hyderabad', ar: 'حيدر آباد', ur: 'حیدرآباد', tr: 'Haydarabad', bn: 'হায়দরাবাদ', fa: 'حیدرآباد' }),
  city('jakarta', -6.2088, 106.8456, 'Asia/Jakarta', 'Singapore', { en: 'Jakarta', ar: 'جاكرتا', ur: 'جکارتہ', tr: 'Cakarta', bn: 'জাকার্তা', fa: 'جاکارتا', es: 'Yakarta' }),
  city('surabaya', -7.2575, 112.7521, 'Asia/Jakarta', 'Singapore', { en: 'Surabaya', ar: 'سورابايا', ur: 'سورابایا', bn: 'সুরাবায়া', fa: 'سورابایا' }),
  city('kuala-lumpur', 3.139, 101.6869, 'Asia/Kuala_Lumpur', 'Singapore', { en: 'Kuala Lumpur', ar: 'كوالالمبور', ur: 'کوالالمپور', bn: 'কুয়ালালামপুর', fa: 'کوالالامپور' }),
  city('singapore', 1.3521, 103.8198, 'Asia/Singapore', 'Singapore', { en: 'Singapore', ar: 'سنغافورة', ur: 'سنگاپور', id: 'Singapura', tr: 'Singapur', bn: 'সিঙ্গাপুর', fa: 'سنگاپور', ms: 'Singapura', fr: 'Singapour', es: 'Singapur' }),
  city('casablanca', 33.5731, -7.5898, 'Africa/Casablanca', 'MuslimWorldLeague', { en: 'Casablanca', ar: 'الدار البيضاء', ur: 'کاسابلانکا', tr: 'Kazablanka', bn: 'কাসাব্লাঙ্কা', fa: 'کازابلانکا' }),
  city('algiers', 36.7538, 3.0588, 'Africa/Algiers', 'MuslimWorldLeague', { en: 'Algiers', ar: 'الجزائر العاصمة', ur: 'الجزائر', id: 'Aljir', tr: 'Cezayir', bn: 'আলজিয়ার্স', fa: 'الجزیره', fr: 'Alger', es: 'Argel' }),
  city('lagos', 6.5244, 3.3792, 'Africa/Lagos', 'MuslimWorldLeague', { en: 'Lagos', ar: 'لاغوس', ur: 'لاگوس', bn: 'লাগোস', fa: 'لاگوس' }),
  city('johannesburg', -26.2041, 28.0473, 'Africa/Johannesburg', 'MuslimWorldLeague', { en: 'Johannesburg', ar: 'جوهانسبرغ', ur: 'جوہانسبرگ', bn: 'জোহানেসবার্গ', fa: 'ژوهانسبورگ', es: 'Johannesburgo' }),
  city('london', 51.5072, -0.1276, 'Europe/London', 'MoonsightingCommittee', { en: 'London', ar: 'لندن', ur: 'لندن', tr: 'Londra', bn: 'লন্ডন', fa: 'لندن', fr: 'Londres', es: 'Londres' }),
  city('birmingham', 52.4862, -1.8904, 'Europe/London', 'MoonsightingCommittee', { en: 'Birmingham', ar: 'برمنغهام', ur: 'برمنگھم', bn: 'বার্মিংহাম', fa: 'بیرمنگام' }),
  city('paris', 48.8566, 2.3522, 'Europe/Paris', 'MuslimWorldLeague', { en: 'Paris', ar: 'باريس', ur: 'پیرس', bn: 'প্যারিস', fa: 'پاریس', es: 'París' }),
  city('berlin', 52.52, 13.405, 'Europe/Berlin', 'MuslimWorldLeague', { en: 'Berlin', ar: 'برلين', ur: 'برلن', bn: 'বার্লিন', fa: 'برلین', es: 'Berlín' }),
  city('madrid', 40.4168, -3.7038, 'Europe/Madrid', 'MuslimWorldLeague', { en: 'Madrid', ar: 'مدريد', ur: 'میڈرڈ', bn: 'মাদ্রিদ', fa: 'مادرید' }),
  city('toronto', 43.6532, -79.3832, 'America/Toronto', 'NorthAmerica', { en: 'Toronto', ar: 'تورونتو', ur: 'ٹورنٹو', bn: 'টরন্টো', fa: 'تورنتو' }),
  city('new-york', 40.7128, -74.006, 'America/New_York', 'NorthAmerica', { en: 'New York', ar: 'نيويورك', ur: 'نیویارک', bn: 'নিউ ইয়র্ক', fa: 'نیویورک', es: 'Nueva York' }),
  city('chicago', 41.8781, -87.6298, 'America/Chicago', 'NorthAmerica', { en: 'Chicago', ar: 'شيكاغو', ur: 'شکاگو', bn: 'শিকাগো', fa: 'شیکاگو' }),
  city('houston', 29.7604, -95.3698, 'America/Chicago', 'NorthAmerica', { en: 'Houston', ar: 'هيوستن', ur: 'ہیوسٹن', bn: 'হিউস্টন', fa: 'هیوستون' }),
  city('sydney', -33.8688, 151.2093, 'Australia/Sydney', 'MuslimWorldLeague', { en: 'Sydney', ar: 'سيدني', ur: 'سڈنی', tr: 'Sidney', bn: 'সিডনি', fa: 'سیدنی', es: 'Sídney' }),
];

const byId = new Map(cities.map(entry => [entry.id, entry]));
export const findCity = (id: unknown) => typeof id === 'string' ? byId.get(id) : undefined;
export const cityName = (entry: City, language: Language) => entry.names[language] ?? entry.names.en;

// Used when a visitor has not chosen a city: the first city in their time zone, else one for their language.
const languageCities: Record<Language, string> = { en: 'london', ar: 'makkah', ur: 'karachi', id: 'jakarta', tr: 'istanbul', bn: 'dhaka', fa: 'tehran', ms: 'kuala-lumpur', fr: 'paris', es: 'madrid' };
export function defaultCity(timeZone: string | undefined, language: Language): City {
  return cities.find(entry => entry.tz === timeZone) ?? byId.get(languageCities[language])!;
}

/** The great-circle distance in kilometres. */
export function distance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * rad / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin((lng2 - lng1) * rad / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
export const nearestCity = (lat: number, lng: number) => cities.reduce((best, entry) => distance(lat, lng, entry.lat, entry.lng) < distance(lat, lng, best.lat, best.lng) ? entry : best);

/** Device coordinates are kept to two decimals (about 1 km), which is enough for times to the minute. */
export const roundCoordinate = (value: number) => Math.round(value * 100) / 100;
export const validLatitude = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90 && roundCoordinate(value) === value;
export const validLongitude = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180 && roundCoordinate(value) === value;
