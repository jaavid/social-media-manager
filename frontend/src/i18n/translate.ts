import { createTranslator } from 'next-intl';
import { messages } from './messages';
import type { MessageKey, Language } from './messages';
type Nested = { [key: string]: string | Nested };
function nest(catalog: Record<MessageKey, string>): Nested {
  const root: Nested = {};
  for (const [key, value] of Object.entries(catalog)) {
    const parts = key.split('.');
    let target = root;
    for (const part of parts.slice(0, -1)) {
      target[part] ??= {};
      target = target[part] as Nested;
    }
    target[parts[parts.length - 1]] = value;
  }
  return root;
}
type Catalog = Record<string, Record<string, string | Record<string, string>>>;
export const nestedMessages = { en: nest(messages.en) as Catalog, fa: nest(messages.fa) as Catalog };
type Translator = (key: string, values?: Record<string, string | number>) => string;
const translators = {
  en: createTranslator({ locale: 'en', messages: nestedMessages.en }) as Translator,
  fa: createTranslator({ locale: 'fa', messages: nestedMessages.fa }) as Translator,
};
export function message(key: MessageKey, language: Language, values?: Record<string, string | number>): string {
  return translators[language](key, values);
}
