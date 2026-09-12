export interface Language {
  code: string;
  label: string;
}

/** Languages with a catalogue in ./locales. Add a new entry with its JSON file. */
export const SUPPORTED_LANGUAGES: Language[] = [{ code: 'en', label: 'English' }];

export const FALLBACK_LANGUAGE = 'en';

/** Pick the best supported language for a BCP 47 tag like "ka-GE". */
export function resolveLanguage(tag: string | undefined): string {
  if (!tag) return FALLBACK_LANGUAGE;
  const base = tag.toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.some((l) => l.code === base) ? base : FALLBACK_LANGUAGE;
}
