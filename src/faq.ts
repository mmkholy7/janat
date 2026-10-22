import type { Messages } from './locales/en';

const faqNumbers = [1, 2, 3, 4, 5, 6] as const;

export const faqEntries = (copy: Messages) => faqNumbers.map(number => ({
  question: copy[`faq${number}q` as const],
  answer: copy[`faq${number}a` as const],
}));

export const faqSection = (copy: Messages) => `<section class="faq-section" id="faq" aria-labelledby="faq-title"><div class="section-heading"><div><svg class="faq-star" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14"/><rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)"/></svg><h2 id="faq-title">${copy.faqTitle}</h2><p>${copy.faqIntro}</p></div></div>
  <div class="faq-list">${faqEntries(copy).map(({ question, answer }) => `<details class="faq-item"><summary>${question}</summary><p>${answer}</p></details>`).join('')}</div></section>`;
