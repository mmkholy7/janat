export const GTM_ID = 'GTM-KNCXQJPL';
export type Consent = 'granted' | 'denied';
const KEY = 'janat.consent';
type DataLayerWindow = Window & { dataLayer?: unknown[] };
let tagManagerLoaded = false;

export function storedConsent(): Consent | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch { return null; }
}

// Consent Mode commands must be pushed as an `arguments` object, exactly like Google's gtag() snippet.
function gtag(..._: unknown[]) {
  const target = window as DataLayerWindow;
  (target.dataLayer ??= []).push(arguments);
}

// Google Tag Manager is only requested after the visitor accepts analytics cookies.
export function applyConsent(consent: Consent | null) {
  if (consent === 'granted' && !tagManagerLoaded) {
    tagManagerLoaded = true;
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    (window as DataLayerWindow).dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    document.head.append(script);
  } else if (tagManagerLoaded) {
    gtag('consent', 'update', { analytics_storage: consent === 'granted' ? 'granted' : 'denied' });
  }
}

// Withdrawing consent also removes Google Analytics cookies, which may be set on the parent domain.
function clearAnalyticsCookies() {
  const parts = location.hostname.split('.');
  const domains = ['', ...parts.slice(0, -1).map((_, index) => `; domain=.${parts.slice(index).join('.')}`)];
  for (const name of document.cookie.split(';').map(cookie => cookie.split('=')[0].trim()).filter(name => /^_g(a|id|at)(_|$)/.test(name))) {
    for (const domain of domains) document.cookie = `${name}=; max-age=0; path=/${domain}`;
  }
}

export function saveConsent(consent: Consent) {
  try { localStorage.setItem(KEY, consent); } catch { /* the choice still applies to this visit */ }
  applyConsent(consent);
  if (consent === 'denied') clearAnalyticsCookies();
}
