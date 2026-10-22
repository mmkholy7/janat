import type { Language } from '../languages';
import type { Messages } from './en';
import en from './en';
import ar from './ar';
import ur from './ur';
import id from './id';
import tr from './tr';
import bn from './bn';
import fa from './fa';
import ms from './ms';
import fr from './fr';
import es from './es';

export const messages: Record<Language, Messages> = { en, ar, ur, id, tr, bn, fa, ms, fr, es };
