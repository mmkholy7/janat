import type { Messages } from './locales/en';

// Authentic (Sahih / Hasan) hadith on fasting, checked against sunnah.com.
// `arabic` is the original wording (a leading conjunction is sometimes dropped);
// the meaning in each language lives in the locale files under `key`.
export type HadithCollection = 'bukhari' | 'muslim' | 'tirmidhi' | 'abudawud';
export type HadithGrade = 'sahih' | 'hasan';
export type Hadith = { id: string; key: keyof Messages; arabic: string; collection: HadithCollection; number: string; grade: HadithGrade };

export const hadiths: Hadith[] = [
  { id: 'three-days', key: 'hadithThreeDays', collection: 'muslim', number: '1159a', grade: 'sahih', arabic: 'صُمْ مِنَ الشَّهْرِ ثَلاَثَةَ أَيَّامٍ فَإِنَّ الْحَسَنَةَ بِعَشْرِ أَمْثَالِهَا وَذَلِكَ مِثْلُ صِيَامِ الدَّهْرِ' },
  { id: 'deeds-presented', key: 'hadithDeedsPresented', collection: 'tirmidhi', number: '747', grade: 'hasan', arabic: 'تُعْرَضُ الأَعْمَالُ يَوْمَ الاِثْنَيْنِ وَالْخَمِيسِ فَأُحِبُّ أَنْ يُعْرَضَ عَمَلِي وَأَنَا صَائِمٌ' },
  { id: 'monday-born', key: 'hadithMondayBorn', collection: 'muslim', number: '1162b', grade: 'sahih', arabic: 'سُئِلَ عَنْ صَوْمِ يَوْمِ الاِثْنَيْنِ قَالَ: ذَاكَ يَوْمٌ وُلِدْتُ فِيهِ وَيَوْمٌ بُعِثْتُ أَوْ أُنْزِلَ عَلَىَّ فِيهِ' },
  { id: 'white-days', key: 'hadithWhiteDays', collection: 'tirmidhi', number: '761', grade: 'hasan', arabic: 'يَا أَبَا ذَرٍّ إِذَا صُمْتَ مِنَ الشَّهْرِ ثَلاَثَةَ أَيَّامٍ فَصُمْ ثَلاَثَ عَشْرَةَ وَأَرْبَعَ عَشْرَةَ وَخَمْسَ عَشْرَةَ' },
  { id: 'three-advice', key: 'hadithThreeAdvice', collection: 'bukhari', number: '1981', grade: 'sahih', arabic: 'أَوْصَانِي خَلِيلِي صلى الله عليه وسلم بِثَلاَثٍ: صِيَامِ ثَلاَثَةِ أَيَّامٍ مِنْ كُلِّ شَهْرٍ، وَرَكْعَتَىِ الضُّحَى، وَأَنْ أُوتِرَ قَبْلَ أَنْ أَنَامَ' },
  { id: 'for-me', key: 'hadithForMe', collection: 'bukhari', number: '1904', grade: 'sahih', arabic: 'قَالَ اللَّهُ: كُلُّ عَمَلِ ابْنِ آدَمَ لَهُ إِلاَّ الصِّيَامَ، فَإِنَّهُ لِي، وَأَنَا أَجْزِي بِهِ' },
  { id: 'rayyan', key: 'hadithRayyan', collection: 'bukhari', number: '1896', grade: 'sahih', arabic: 'إِنَّ فِي الْجَنَّةِ بَابًا يُقَالُ لَهُ الرَّيَّانُ، يَدْخُلُ مِنْهُ الصَّائِمُونَ يَوْمَ الْقِيَامَةِ، لاَ يَدْخُلُ مِنْهُ أَحَدٌ غَيْرُهُمْ' },
  { id: 'shield', key: 'hadithShield', collection: 'bukhari', number: '1894', grade: 'sahih', arabic: 'الصِّيَامُ جُنَّةٌ، فَلاَ يَرْفُثْ وَلاَ يَجْهَلْ، وَإِنِ امْرُؤٌ قَاتَلَهُ أَوْ شَاتَمَهُ فَلْيَقُلْ: إِنِّي صَائِمٌ' },
  { id: 'seventy-years', key: 'hadithSeventyYears', collection: 'bukhari', number: '2840', grade: 'sahih', arabic: 'مَنْ صَامَ يَوْمًا فِي سَبِيلِ اللَّهِ بَعَّدَ اللَّهُ وَجْهَهُ عَنِ النَّارِ سَبْعِينَ خَرِيفًا' },
  { id: 'ramadan-faith', key: 'hadithRamadanFaith', collection: 'bukhari', number: '38', grade: 'sahih', arabic: 'مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ' },
  { id: 'shawwal', key: 'hadithShawwal', collection: 'muslim', number: '1164a', grade: 'sahih', arabic: 'مَنْ صَامَ رَمَضَانَ ثُمَّ أَتْبَعَهُ سِتًّا مِنْ شَوَّالٍ كَانَ كَصِيَامِ الدَّهْرِ' },
  { id: 'arafah', key: 'hadithArafah', collection: 'muslim', number: '1162b', grade: 'sahih', arabic: 'سُئِلَ عَنْ صَوْمِ يَوْمِ عَرَفَةَ فَقَالَ: يُكَفِّرُ السَّنَةَ الْمَاضِيَةَ وَالْبَاقِيَةَ' },
  { id: 'ashura', key: 'hadithAshura', collection: 'muslim', number: '1162b', grade: 'sahih', arabic: 'سُئِلَ عَنْ صَوْمِ يَوْمِ عَاشُورَاءَ فَقَالَ: يُكَفِّرُ السَّنَةَ الْمَاضِيَةَ' },
  { id: 'ninth-muharram', key: 'hadithNinthMuharram', collection: 'muslim', number: '1134a', grade: 'sahih', arabic: 'فَإِذَا كَانَ الْعَامُ الْمُقْبِلُ - إِنْ شَاءَ اللَّهُ - صُمْنَا الْيَوْمَ التَّاسِعَ' },
  { id: 'muharram', key: 'hadithMuharram', collection: 'muslim', number: '1163b', grade: 'sahih', arabic: 'أَفْضَلُ الصِّيَامِ بَعْدَ شَهْرِ رَمَضَانَ صِيَامُ شَهْرِ اللَّهِ الْمُحَرَّمِ' },
  { id: 'shaban', key: 'hadithShaban', collection: 'bukhari', number: '1969', grade: 'sahih', arabic: 'مَا رَأَيْتُ رَسُولَ اللَّهِ صلى الله عليه وسلم اسْتَكْمَلَ صِيَامَ شَهْرٍ إِلاَّ رَمَضَانَ، وَمَا رَأَيْتُهُ أَكْثَرَ صِيَامًا مِنْهُ فِي شَعْبَانَ' },
  { id: 'dawud', key: 'hadithDawud', collection: 'bukhari', number: '1131', grade: 'sahih', arabic: 'أَحَبُّ الصِّيَامِ إِلَى اللَّهِ صِيَامُ دَاوُدَ … وَيَصُومُ يَوْمًا وَيُفْطِرُ يَوْمًا' },
  { id: 'suhoor', key: 'hadithSuhoor', collection: 'bukhari', number: '1923', grade: 'sahih', arabic: 'تَسَحَّرُوا فَإِنَّ فِي السَّحُورِ بَرَكَةً' },
  { id: 'hasten-iftar', key: 'hadithHastenIftar', collection: 'bukhari', number: '1957', grade: 'sahih', arabic: 'لاَ يَزَالُ النَّاسُ بِخَيْرٍ مَا عَجَّلُوا الْفِطْرَ' },
  { id: 'iftar-dua', key: 'hadithIftarDua', collection: 'abudawud', number: '2357', grade: 'hasan', arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ' },
  { id: 'feed-fasting', key: 'hadithFeedFasting', collection: 'tirmidhi', number: '807', grade: 'sahih', arabic: 'مَنْ فَطَّرَ صَائِمًا كَانَ لَهُ مِثْلُ أَجْرِهِ غَيْرَ أَنَّهُ لاَ يَنْقُصُ مِنْ أَجْرِ الصَّائِمِ شَيْئًا' },
  { id: 'false-speech', key: 'hadithFalseSpeech', collection: 'bukhari', number: '1903', grade: 'sahih', arabic: 'مَنْ لَمْ يَدَعْ قَوْلَ الزُّورِ وَالْعَمَلَ بِهِ فَلَيْسَ لِلَّهِ حَاجَةٌ فِي أَنْ يَدَعَ طَعَامَهُ وَشَرَابَهُ' },
  { id: 'friday', key: 'hadithFriday', collection: 'bukhari', number: '1985', grade: 'sahih', arabic: 'لاَ يَصُومَنَّ أَحَدُكُمْ يَوْمَ الْجُمُعَةِ، إِلاَّ يَوْمًا قَبْلَهُ أَوْ بَعْدَهُ' },
];

export const collectionKeys: Record<HadithCollection, keyof Messages> = {
  bukhari: 'collectionBukhari', muslim: 'collectionMuslim', tirmidhi: 'collectionTirmidhi', abudawud: 'collectionAbudawud',
};
export const gradeKeys: Record<HadithGrade, keyof Messages> = { sahih: 'gradeSahih', hasan: 'gradeHasan' };
export const hadithUrl = (hadith: Hadith) => `https://sunnah.com/${hadith.collection}:${hadith.number}`;
