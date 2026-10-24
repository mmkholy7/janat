import type { Language } from './languages';

// Strings for the embeddable widget (/embed/). Kept separate from the app's locales so the widget stays a few kilobytes.
// Wording matches the app (src/locales) and the fasting-date pages (src/dates-copy.ts).
const en = {
  title: 'Sunnah fasting calendar',
  heading: 'Upcoming Sunnah fasts',
  nextFast: 'Next fast',
  today: 'Today',
  white: 'White days',
  weekly: 'Monday & Thursday',
  special: 'Special days',
  ramadan: 'Ramadan',
  noFast: 'No fasting',
  previous: 'Previous month',
  next: 'Next month',
  add: 'Add to calendar',
  arafah: 'Day of Arafah',
  tasua: 'Tasu‘a',
  ashura: 'Ashura',
  eidFitr: 'Eid al-Fitr',
  eidAdha: 'Eid al-Adha',
  tashriq: 'Days of Tashriq',
  openApp: 'Open Janat',
};

export type WidgetCopy = typeof en;

export const widgetCopy: Record<Language, WidgetCopy> = {
  en,
  ar: {
    title: 'تقويم صيام السنة', heading: 'أيام صيام التطوع القادمة', nextFast: 'الصيام القادم', today: 'اليوم',
    white: 'الأيام البيض', weekly: 'الاثنين والخميس', special: 'أيام فاضلة', ramadan: 'رمضان', noFast: 'لا يُصام',
    previous: 'الشهر السابق', next: 'الشهر التالي', add: 'إضافة إلى التقويم',
    arafah: 'يوم عرفة', tasua: 'تاسوعاء', ashura: 'عاشوراء', eidFitr: 'عيد الفطر', eidAdha: 'عيد الأضحى', tashriq: 'أيام التشريق', openApp: 'افتح جنات',
  },
  ur: {
    title: 'سنت روزوں کا کیلنڈر', heading: 'آنے والے سنت روزے', nextFast: 'اگلا روزہ', today: 'آج',
    white: 'ایامِ بیض', weekly: 'پیر اور جمعرات', special: 'خاص دن', ramadan: 'رمضان', noFast: 'روزہ نہیں',
    previous: 'پچھلا مہینہ', next: 'اگلا مہینہ', add: 'کیلنڈر میں شامل کریں',
    arafah: 'یومِ عرفہ', tasua: 'تاسوعا', ashura: 'عاشورہ', eidFitr: 'عید الفطر', eidAdha: 'عید الاضحیٰ', tashriq: 'ایامِ تشریق', openApp: 'Janat کھولیں',
  },
  id: {
    title: 'Kalender puasa sunnah', heading: 'Puasa sunnah mendatang', nextFast: 'Puasa berikutnya', today: 'Hari ini',
    white: 'Ayyamul Bidh', weekly: 'Senin & Kamis', special: 'Hari istimewa', ramadan: 'Ramadhan', noFast: 'Tidak berpuasa',
    previous: 'Bulan sebelumnya', next: 'Bulan berikutnya', add: 'Tambah ke kalender',
    arafah: 'Hari Arafah', tasua: 'Tasua', ashura: 'Asyura', eidFitr: 'Idul Fitri', eidAdha: 'Idul Adha', tashriq: 'Hari Tasyrik', openApp: 'Buka Janat',
  },
  tr: {
    title: 'Sünnet oruç takvimi', heading: 'Yaklaşan sünnet oruçlar', nextFast: 'Sıradaki oruç', today: 'Bugün',
    white: 'Eyyam-ı biyz', weekly: 'Pazartesi ve perşembe', special: 'Özel günler', ramadan: 'Ramazan', noFast: 'Oruç tutulmaz',
    previous: 'Önceki ay', next: 'Sonraki ay', add: 'Takvime ekle',
    arafah: 'Arefe günü', tasua: 'Tâsûâ', ashura: 'Âşûrâ', eidFitr: 'Ramazan Bayramı', eidAdha: 'Kurban Bayramı', tashriq: 'Teşrik günleri', openApp: 'Janat’ı aç',
  },
  bn: {
    title: 'সুন্নত রোজার ক্যালেন্ডার', heading: 'সামনের সুন্নত রোজা', nextFast: 'পরবর্তী রোজা', today: 'আজ',
    white: 'আইয়ামে বীজ', weekly: 'সোমবার ও বৃহস্পতিবার', special: 'বিশেষ দিন', ramadan: 'রমজান', noFast: 'রোজা নেই',
    previous: 'আগের মাস', next: 'পরের মাস', add: 'ক্যালেন্ডারে যোগ করুন',
    arafah: 'আরাফার দিন', tasua: 'তাসুআ', ashura: 'আশুরা', eidFitr: 'ঈদুল ফিতর', eidAdha: 'ঈদুল আজহা', tashriq: 'আইয়ামে তাশরিক', openApp: 'Janat খুলুন',
  },
  fa: {
    title: 'تقویم روزه‌های سنت', heading: 'روزه‌های سنت پیش رو', nextFast: 'روزهٔ بعدی', today: 'امروز',
    white: 'ایام البیض', weekly: 'دوشنبه و پنجشنبه', special: 'روزهای ویژه', ramadan: 'رمضان', noFast: 'روزه گرفته نمی‌شود',
    previous: 'ماه قبل', next: 'ماه بعد', add: 'افزودن به تقویم',
    arafah: 'روز عرفه', tasua: 'تاسوعا', ashura: 'عاشورا', eidFitr: 'عید فطر', eidAdha: 'عید قربان', tashriq: 'ایام تشریق', openApp: 'باز کردن جنات',
  },
  ms: {
    title: 'Kalendar puasa sunat', heading: 'Puasa sunat akan datang', nextFast: 'Puasa seterusnya', today: 'Hari ini',
    white: 'Hari putih', weekly: 'Isnin & Khamis', special: 'Hari istimewa', ramadan: 'Ramadan', noFast: 'Tidak berpuasa',
    previous: 'Bulan sebelumnya', next: 'Bulan seterusnya', add: 'Tambah ke kalendar',
    arafah: 'Hari Arafah', tasua: 'Tasua', ashura: 'Asyura', eidFitr: 'Hari Raya Aidilfitri', eidAdha: 'Hari Raya Aidiladha', tashriq: 'Hari Tasyrik', openApp: 'Buka Janat',
  },
  fr: {
    title: 'Calendrier des jeûnes sunna', heading: 'Prochains jeûnes sunna', nextFast: 'Prochain jeûne', today: 'Aujourd’hui',
    white: 'Jours blancs', weekly: 'Lundi et jeudi', special: 'Jours particuliers', ramadan: 'Ramadan', noFast: 'Pas de jeûne',
    previous: 'Mois précédent', next: 'Mois suivant', add: 'Ajouter au calendrier',
    arafah: 'Jour d’Arafa', tasua: 'Tassou‘a', ashura: 'Achoura', eidFitr: 'Aïd al-Fitr', eidAdha: 'Aïd al-Adha', tashriq: 'Jours de Tachriq', openApp: 'Ouvrir Janat',
  },
  es: {
    title: 'Calendario de ayunos sunnah', heading: 'Próximos ayunos sunnah', nextFast: 'Próximo ayuno', today: 'Hoy',
    white: 'Días blancos', weekly: 'Lunes y jueves', special: 'Días especiales', ramadan: 'Ramadán', noFast: 'No se ayuna',
    previous: 'Mes anterior', next: 'Mes siguiente', add: 'Añadir al calendario',
    arafah: 'Día de Arafa', tasua: 'Tasu‘a', ashura: 'Ashura', eidFitr: 'Eid al-Fitr', eidAdha: 'Eid al-Adha', tashriq: 'Días de Tashriq', openApp: 'Abrir Janat',
  },
};
