import { applyConsent, saveConsent, storedConsent, type Consent } from './consent';

// The only script on the pre-rendered fasting-date pages: analytics consent, copy buttons and the native share sheet.

const consent = document.querySelector<HTMLElement>('.consent');
const stored = storedConsent();
applyConsent(stored);
if (consent && !stored) consent.hidden = false;

function choose(choice: Consent) {
  saveConsent(choice);
  if (consent) consent.hidden = true;
}

function announce(button: HTMLElement, message: string) {
  const row = button.parentElement;
  let status = row?.nextElementSibling;
  if (!status?.classList.contains('copy-status')) {
    status = document.createElement('p');
    status.className = 'copy-status fine-print';
    status.setAttribute('role', 'status');
    row?.after(status);
  }
  status.textContent = message;
}

function legacyCopy(value: string) {
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.append(area);
  area.select();
  const copied = document.execCommand('copy');
  area.remove();
  return copied;
}

async function copy(button: HTMLElement) {
  const input = button.parentElement?.querySelector<HTMLInputElement>('input');
  const value = button.dataset.value ?? input?.value ?? '';
  let copied = false;
  try {
    await navigator.clipboard.writeText(value);
    copied = true;
  } catch {
    copied = legacyCopy(value);
  }
  if (copied) announce(button, button.dataset.copied ?? '');
  else {
    input?.select();
    if (button.dataset.error) announce(button, button.dataset.error);
  }
}

const native = document.querySelector<HTMLButtonElement>('[data-action=native-share]');
if (native && 'share' in navigator) native.hidden = false;

document.addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLElement>('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'consent-accept') choose('granted');
  else if (action === 'consent-decline') choose('denied');
  else if (action === 'consent-settings' && consent) { consent.hidden = false; consent.querySelector<HTMLButtonElement>('[data-action=consent-accept]')?.focus(); }
  else if (action === 'copy') void copy(button);
  else if (action === 'native-share') {
    const { title = '', text = '', url = '' } = button.dataset;
    navigator.share({ title, text, url }).catch(() => undefined);
  }
});
