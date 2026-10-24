import { isLanguage, type Language } from './languages';
import { widgetCopy } from './widget-copy';
import { clampHeight, widgetHeights, widgetSizes, widgetSnippet, widgetSrc, type WidgetOptions, type WidgetSize, type WidgetTheme, type WidgetView } from './widget-snippet';

// The widget page (/fasting/widget/): keeps the live preview and the code in step with the form.

const builder = document.querySelector<HTMLElement>('[data-widget-builder]');
const form = builder?.querySelector<HTMLFormElement>('form');
const frame = builder?.querySelector<HTMLIFrameElement>('iframe');
const code = builder?.querySelector<HTMLTextAreaElement>('textarea');

if (builder && form && frame && code) {
  const pageLanguage: Language = isLanguage(builder.dataset.lang) ? builder.dataset.lang : 'en';
  const number = new Intl.NumberFormat(document.documentElement.lang || pageLanguage);
  const height = form.elements.namedItem('height') as HTMLInputElement;
  const heightValue = form.elements.namedItem('height-value') as HTMLOutputElement;
  // Choices made before this script loaded count too.
  let heightTouched = height.value !== height.defaultValue;

  const read = (): WidgetOptions => {
    const data = new FormData(form);
    const lang = String(data.get('lang'));
    return {
      lang: isLanguage(lang) ? lang : 'auto',
      view: data.get('view') as WidgetView,
      theme: data.get('theme') as WidgetTheme,
      size: data.get('size') as WidgetSize,
      height: clampHeight(Number(height.value)),
    };
  };

  const update = () => {
    const options = read();
    const language = options.lang === 'auto' ? pageLanguage : options.lang;
    const width = widgetSizes[options.size];
    const src = widgetSrc(options, '');
    if (frame.getAttribute('src') !== src) frame.src = src;
    frame.title = `${widgetCopy[language].title} · Janat`;
    frame.style.maxWidth = width ? `${width}px` : '';
    frame.style.height = `${options.height}px`;
    heightValue.value = `${number.format(options.height)} px`;
    code.value = widgetSnippet(options, { language, title: widgetCopy[language].title });
  };

  form.addEventListener('input', event => {
    const target = event.target as HTMLInputElement;
    if (target === height) heightTouched = true;
    // Each view has its own natural height until someone picks one themselves.
    else if (target.name === 'view' && !heightTouched) height.value = String(widgetHeights[target.value as WidgetView]);
    update();
    builder.querySelector('.copy-status')?.replaceChildren();
  });
  form.addEventListener('submit', event => event.preventDefault());
  code.addEventListener('focus', () => code.select());
  if (!heightTouched) height.value = String(widgetHeights[read().view]);
  update();
}
